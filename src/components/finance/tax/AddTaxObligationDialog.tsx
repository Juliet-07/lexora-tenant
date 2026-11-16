import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FolderTree } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  createTaxObligation,
  fetchTaxResponsibleOptions,
  type CreateTaxObligationInput,
  type TaxObligationType,
  type TaxPeriodType,
  type TaxPriority,
  type TaxRecurringFrequency,
} from "@/lib/crm/finance-api";
import {
  JURISDICTIONS,
  MONTHS,
  PERIOD_TYPES,
  RECURRING_FREQUENCIES,
  TAX_CURRENCIES,
  TAX_TYPES,
  frequencyForPeriod,
  ordinal,
  taxTypeLabel,
} from "./taxConstants";

const STEPS = ["Details", "Recurring", "Document routing"] as const;

const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => thisYear + 2 - i);

const blank = (type?: TaxObligationType, currency = "RWF") => ({
  type: (type ?? "VAT return") as TaxObligationType,
  name: "",
  jurisdiction: "rw",
  currency,
  periodType: "monthly" as TaxPeriodType,
  year: thisYear,
  month: new Date().getMonth() + 1,
  quarter: Math.floor(new Date().getMonth() / 3) + 1,
  period: "",
  dueOn: "",
  amount: "",
  responsibleId: "",
  priority: "normal" as TaxPriority,
  notes: "",
  requireDocuments: true,
  recurring: false,
  frequency: "Monthly" as TaxRecurringFrequency,
  dueDay: 15,
});

export function AddTaxObligationDialog({
  open,
  onOpenChange,
  presetType,
  defaultCurrency,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  presetType?: TaxObligationType;
  defaultCurrency?: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [d, setD] = useState(() => blank(presetType, defaultCurrency));
  const set = <K extends keyof ReturnType<typeof blank>>(
    k: K,
    v: ReturnType<typeof blank>[K],
  ) => setD((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (open) {
      setStep(0);
      setD(blank(presetType, defaultCurrency || "RWF"));
    }
  }, [open, presetType, defaultCurrency]);

  const { data: people = [] } = useQuery({
    queryKey: ["taxResponsibleOptions"],
    queryFn: fetchTaxResponsibleOptions,
    enabled: open,
  });

  const onceOff = d.periodType === "once-off";

  // Whichever period the user is describing, as the label the calendar
  // and archive will show — a live preview of what they are creating.
  const periodLabel = useMemo(() => {
    if (d.periodType === "monthly") return `${MONTHS[d.month - 1]} ${d.year}`;
    if (d.periodType === "quarterly") return `Q${d.quarter} ${d.year}`;
    if (d.periodType === "annual") return `Year of Income ${d.year}`;
    return d.period.trim() || "—";
  }, [d.periodType, d.month, d.quarter, d.year, d.period]);

  const recurringIssue =
    d.recurring && onceOff
      ? "A once-off obligation cannot repeat. Pick a monthly, quarterly or annual period."
      : null;

  const valid =
    !!d.dueOn &&
    (!onceOff || d.period.trim().length > 0) &&
    !recurringIssue &&
    (!d.recurring || (!!d.frequency && d.dueDay >= 1 && d.dueDay <= 31));

  const mut = useMutation({
    mutationFn: () => {
      const dto: CreateTaxObligationInput = {
        type: d.type,
        periodType: d.periodType,
        dueOn: d.dueOn,
        currency: d.currency,
        jurisdiction: d.jurisdiction,
        priority: d.priority,
        requireDocuments: d.requireDocuments,
        recurring: d.recurring,
      };
      if (d.name.trim()) dto.name = d.name.trim();
      if (d.amount !== "") dto.amount = Number(d.amount);
      if (d.responsibleId) dto.responsibleId = d.responsibleId;
      if (d.notes.trim()) dto.notes = d.notes.trim();
      if (d.periodType === "monthly") {
        dto.periodYear = d.year;
        dto.periodMonth = d.month;
      } else if (d.periodType === "quarterly") {
        dto.periodYear = d.year;
        dto.periodQuarter = d.quarter;
      } else if (d.periodType === "annual") {
        dto.periodYear = d.year;
      } else {
        dto.period = d.period.trim();
      }
      if (d.recurring) {
        dto.frequency = d.frequency;
        dto.dueDay = d.dueDay;
      }
      return createTaxObligation(dto);
    },
    onSuccess: (o) => {
      queryClient.invalidateQueries({ queryKey: ["taxObligations"] });
      onOpenChange(false);
      toast({
        title: "Added to tax calendar",
        description: o.recurring
          ? "Future periods and reminders are created automatically."
          : undefined,
      });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to add obligation",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const turnRecurring = (on: boolean) =>
    setD((p) => {
      if (!on) return { ...p, recurring: false };
      const due = p.dueOn ? Number(p.dueOn.slice(8, 10)) : p.dueDay;
      return {
        ...p,
        recurring: true,
        frequency: frequencyForPeriod(p.periodType) ?? p.frequency,
        dueDay: due >= 1 && due <= 31 ? due : p.dueDay,
      };
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add tax obligation</DialogTitle>
          <DialogDescription>
            {taxTypeLabel(d.type)} · {periodLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 rounded-md bg-muted p-1 text-sm">
          {STEPS.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(i)}
              className={`flex-1 rounded px-3 py-1.5 font-medium transition ${
                step === i
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {i + 1}. {s}
            </button>
          ))}
        </div>

        {step === 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tax type</Label>
              <Select
                value={d.type}
                onValueChange={(v) => set("type", v as TaxObligationType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAX_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Obligation name</Label>
              <Input
                value={d.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder={`${d.type} — ${periodLabel}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Jurisdiction</Label>
              <Select
                value={d.jurisdiction}
                onValueChange={(v) => set("jurisdiction", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JURISDICTIONS.map((j) => (
                    <SelectItem key={j.value} value={j.value}>
                      {j.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select
                value={d.currency}
                onValueChange={(v) => set("currency", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAX_CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Period type</Label>
              <Select
                value={d.periodType}
                onValueChange={(v) => {
                  const next = v as TaxPeriodType;
                  setD((p) => ({
                    ...p,
                    periodType: next,
                    recurring: next === "once-off" ? false : p.recurring,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_TYPES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {onceOff ? (
              <div className="space-y-1.5">
                <Label>Period reference</Label>
                <Input
                  value={d.period}
                  onChange={(e) => set("period", e.target.value)}
                  placeholder="e.g. FY26 true-up"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>
                  {d.periodType === "annual" ? "Year of income" : "Period"}
                </Label>
                <div className="flex gap-2">
                  {d.periodType === "monthly" && (
                    <Select
                      value={String(d.month)}
                      onValueChange={(v) => set("month", Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m, i) => (
                          <SelectItem key={m} value={String(i + 1)}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {d.periodType === "quarterly" && (
                    <Select
                      value={String(d.quarter)}
                      onValueChange={(v) => set("quarter", Number(v))}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4].map((q) => (
                          <SelectItem key={q} value={String(q)}>
                            Q{q}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Select
                    value={String(d.year)}
                    onValueChange={(v) => set("year", Number(v))}
                  >
                    <SelectTrigger className={onceOff ? "" : "w-28"}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Input
                type="date"
                value={d.dueOn}
                onChange={(e) => set("dueOn", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Expected amount ({d.currency})</Label>
              <Input
                type="number"
                min={0}
                value={d.amount}
                onChange={(e) => set("amount", e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Responsible person</Label>
              <Select
                value={d.responsibleId || "none"}
                onValueChange={(v) =>
                  set("responsibleId", v === "none" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not assigned</SelectItem>
                  {people.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name}
                      {p.isOwner ? " — Account owner" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={d.priority}
                onValueChange={(v) => set("priority", v as TaxPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={d.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md border p-4">
              <div>
                <p className="text-sm font-medium">Recurring obligation</p>
                <p className="text-xs text-muted-foreground">
                  Each new period is added to the calendar and its filing
                  reminders are sent automatically.
                </p>
              </div>
              <Switch
                checked={d.recurring}
                disabled={onceOff}
                onCheckedChange={turnRecurring}
              />
            </div>
            {onceOff && (
              <p className="text-xs text-muted-foreground">
                A once-off obligation cannot repeat. Choose a monthly, quarterly
                or annual period to enable this.
              </p>
            )}
            {d.recurring && !onceOff && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Frequency</Label>
                  <Select
                    value={d.frequency}
                    onValueChange={(v) =>
                      set("frequency", v as TaxRecurringFrequency)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECURRING_FREQUENCIES.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Day of month due</Label>
                  <Select
                    value={String(d.dueDay)}
                    onValueChange={(v) => set("dueDay", Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {ordinal(n)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md border p-4">
              <div>
                <p className="text-sm font-medium">
                  Require return and proof of payment
                </p>
                <p className="text-xs text-muted-foreground">
                  A filing can only be recorded with both documents attached.
                </p>
              </div>
              <Switch
                checked={d.requireDocuments}
                onCheckedChange={(v) => set("requireDocuments", v)}
              />
            </div>
            <div className="flex items-start gap-3 rounded-md bg-muted/50 p-4 text-sm">
              <FolderTree className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  Filing Archive / {d.periodType === "once-off" ? "—" : d.year}{" "}
                  / {periodLabel} / {taxTypeLabel(d.type)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Filed returns and proofs of payment are stored here
                  automatically. Every filing is approved by the account owner.
                </p>
              </div>
            </div>
          </div>
        )}

        {recurringIssue && (
          <p className="text-xs text-destructive">{recurringIssue}</p>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {step < STEPS.length - 1 && (
              <Button variant="outline" onClick={() => setStep(step + 1)}>
                Next
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={!valid || mut.isPending}
              onClick={() => mut.mutate()}
            >
              {mut.isPending ? "Saving…" : "Save obligation"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
