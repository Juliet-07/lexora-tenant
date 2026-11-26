import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  createCapitalCall,
  issueCapitalCall,
  updateCapitalCallDraft,
  type CallUseOfProceeds,
  type CapitalCall,
  type CapitalCommitment,
  type Fund,
  type PortfolioHolding,
} from "@/lib/crm/finance-api";
import { SectionTitle, errMessage, money, today } from "./fundShared";

export const CALL_PURPOSES = [
  "Investment — new deal",
  "Investment — follow-on",
  "Management fees",
  "Fund expenses",
  "Organisational costs",
  "Working capital",
];

interface Row extends CallUseOfProceeds {
  key: number;
}

const blank = () => ({
  purposeCategory: "",
  dealName: "",
  purpose: "",
  narrative: "",
  totalAmount: 0,
  issuedOn: today(),
  dueOn: today(),
});

let rowKey = 1;

// A capital call is drafted (purpose, deal, amount, how it will be used)
// and then issued — issuing freezes each LP's pro-rata share. The preview
// below shows those shares before anything is committed, with management
// fee lines following each LP's own rate (a side letter can lower it).
export function CapitalCallDialog({
  open,
  onOpenChange,
  fund,
  commitments,
  holdings,
  draft,
  invalidate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  fund: Fund;
  commitments: CapitalCommitment[];
  holdings: PortfolioHolding[];
  /** Editing a saved draft */
  draft?: CapitalCall | null;
  invalidate: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState(blank());
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!open) return;
    if (draft) {
      setForm({
        purposeCategory: draft.purposeCategory ?? "",
        dealName: draft.dealName ?? "",
        purpose: draft.purpose,
        narrative: draft.narrative ?? "",
        totalAmount: draft.totalAmount,
        issuedOn: (draft.issuedOn ?? today()).slice(0, 10),
        dueOn: (draft.dueOn ?? today()).slice(0, 10),
      });
      setRows(
        (draft.useOfProceeds ?? []).map((u) => ({ ...u, key: rowKey++ })),
      );
    } else {
      setForm(blank());
      setRows([]);
    }
  }, [open, draft]);

  const cur = fund.currency;
  const set = (patch: Partial<ReturnType<typeof blank>>) =>
    setForm((f) => ({ ...f, ...patch }));

  const total = commitments.reduce((s, c) => s + c.commitment, 0);
  const listed = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const balance = Math.round((form.totalAmount - listed) * 100) / 100;

  // The pro-rata preview, worked out the same way the engine does it.
  const preview = useMemo(
    () =>
      commitments.map((c) => {
        const pct = total ? c.commitment / total : 0;
        const rate = c.mgmtFeePctOverride ?? fund.mgmtFeePct;
        const scale = (kind?: string) =>
          kind === "fee" && fund.mgmtFeePct > 0 ? rate / fund.mgmtFeePct : 1;
        const lines = rows.reduce(
          (s, r) => s + (Number(r.amount) || 0) * pct * scale(r.kind),
          0,
        );
        // Anything not itemised is shared pro-rata; a fee discount falls
        // into that balance so the LP is still called their full share.
        const lpTotal = form.totalAmount * pct;
        return {
          id: c._id,
          name: c.lpName,
          pct: pct * 100,
          amount: lpTotal,
          itemised: lines,
          discounted: rate !== fund.mgmtFeePct,
        };
      }),
    [commitments, rows, total, form.totalAmount, fund.mgmtFeePct],
  );

  const uses: CallUseOfProceeds[] = rows
    .filter((r) => r.label.trim() && Number(r.amount) > 0)
    .map(({ label, amount, kind }) => ({
      label: label.trim(),
      amount: Number(amount),
      kind: kind ?? "other",
    }));

  const payload = (saveAsDraft: boolean) => ({
    purpose: form.purpose,
    totalAmount: form.totalAmount,
    issuedOn: form.issuedOn,
    dueOn: form.dueOn,
    purposeCategory: form.purposeCategory || undefined,
    dealName: form.dealName || undefined,
    narrative: form.narrative || undefined,
    useOfProceeds: uses,
    saveAsDraft,
  });

  const save = useMutation({
    mutationFn: async (asDraft: boolean) => {
      if (draft) {
        const updated = await updateCapitalCallDraft(
          fund._id,
          draft._id,
          payload(true),
        );
        if (!asDraft) return issueCapitalCall(fund._id, draft._id);
        return updated;
      }
      return createCapitalCall(fund._id, payload(asDraft));
    },
    onSuccess: (_r, asDraft) => {
      invalidate();
      onOpenChange(false);
      toast({
        title: asDraft ? "Draft saved" : "Capital call issued",
        description: asDraft
          ? "Issue it when you are ready — shares are frozen at issue."
          : "Pro-rata shares are frozen. Review and send the notices next.",
      });
    },
    onError: (e) =>
      toast({
        title: "Could not save the call",
        description: errMessage(e),
        variant: "destructive",
      }),
  });

  const lateDue = form.dueOn < form.issuedOn;
  const overItemised = listed - form.totalAmount > 0.005;
  const valid =
    !!form.purpose.trim() &&
    form.totalAmount > 0 &&
    !!form.dueOn &&
    !lateDue &&
    !overItemised &&
    commitments.length > 0;
  const needsDeal = /Investment/.test(form.purposeCategory);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {draft ? `Edit draft ${draft.ref}` : "New capital call"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Draft the call with its purpose and amounts. Each LP's pro-rata
            share is calculated for you and frozen when the call is issued.
          </p>
        </DialogHeader>

        <div className="grid gap-4">
          <SectionTitle>Call details</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Purpose of call *</Label>
              <Select
                value={form.purposeCategory}
                onValueChange={(v) =>
                  set({
                    purposeCategory: v,
                    purpose: form.purpose || v,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select purpose…" />
                </SelectTrigger>
                <SelectContent>
                  {CALL_PURPOSES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                Deal / investment {needsDeal ? "" : "(if applicable)"}
              </Label>
              <Select
                value={form.dealName || "__none"}
                onValueChange={(v) =>
                  set({ dealName: v === "__none" ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No specific deal</SelectItem>
                  {holdings.map((h) => (
                    <SelectItem key={h._id} value={h.companyName}>
                      {h.companyName}
                    </SelectItem>
                  ))}
                  {form.dealName &&
                    !holdings.some((h) => h.companyName === form.dealName) && (
                      <SelectItem value={form.dealName}>
                        {form.dealName}
                      </SelectItem>
                    )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Description (shown on the notice) *</Label>
            <Input
              value={form.purpose}
              onChange={(e) => set({ purpose: e.target.value })}
              placeholder="e.g. Series B equity investment in EcoMine Processing"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>Call amount ({cur}) *</Label>
              <Input
                type="number"
                value={form.totalAmount || ""}
                onChange={(e) => set({ totalAmount: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Notice date</Label>
              <Input
                type="date"
                value={form.issuedOn}
                onChange={(e) => set({ issuedOn: e.target.value })}
              />
            </div>
            <div>
              <Label>Due date *</Label>
              <Input
                type="date"
                value={form.dueOn}
                onChange={(e) => set({ dueOn: e.target.value })}
              />
              {lateDue && (
                <p className="mt-1 text-xs text-destructive">
                  Due date is before the notice date
                </p>
              )}
            </div>
          </div>
          <div>
            <Label>Call narrative</Label>
            <Textarea
              rows={3}
              value={form.narrative}
              onChange={(e) => set({ narrative: e.target.value })}
              placeholder="Context for investors: what the money is for and why now."
            />
          </div>

          <SectionTitle>Use of proceeds</SectionTitle>
          <div className="space-y-2">
            {rows.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Optional. Itemise how the call will be spent; it appears on each
                LP's notice. Tick “follows LP fee rate” on a management fee line
                so a side-letter discount lowers that LP's share of it.
              </p>
            )}
            {rows.map((r) => (
              <div key={r.key} className="grid grid-cols-12 items-center gap-2">
                <Input
                  className="col-span-5"
                  placeholder="Line item"
                  value={r.label}
                  onChange={(e) =>
                    setRows((rs) =>
                      rs.map((x) =>
                        x.key === r.key ? { ...x, label: e.target.value } : x,
                      ),
                    )
                  }
                />
                <Input
                  className="col-span-3"
                  type="number"
                  placeholder="Amount"
                  value={r.amount || ""}
                  onChange={(e) =>
                    setRows((rs) =>
                      rs.map((x) =>
                        x.key === r.key
                          ? { ...x, amount: Number(e.target.value) }
                          : x,
                      ),
                    )
                  }
                />
                <label className="col-span-3 flex items-center gap-1.5 text-xs">
                  <Checkbox
                    checked={r.kind === "fee"}
                    onCheckedChange={(v) =>
                      setRows((rs) =>
                        rs.map((x) =>
                          x.key === r.key
                            ? { ...x, kind: v ? "fee" : "other" }
                            : x,
                        ),
                      )
                    }
                  />
                  follows LP fee rate
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="col-span-1"
                  onClick={() =>
                    setRows((rs) => rs.filter((x) => x.key !== r.key))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setRows((rs) => [
                    ...rs,
                    { key: rowKey++, label: "", amount: 0, kind: "other" },
                  ])
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add line
              </Button>
              {rows.length > 0 && (
                <span
                  className={`text-xs ${overItemised ? "text-destructive" : "text-muted-foreground"}`}
                >
                  Itemised {money(listed, cur)} of{" "}
                  {money(form.totalAmount, cur)}
                  {balance > 0.005 &&
                    ` · ${money(balance, cur)} to working capital`}
                  {overItemised && " · exceeds the call"}
                </span>
              )}
            </div>
          </div>

          <SectionTitle>Pro-rata preview</SectionTitle>
          {commitments.length === 0 ? (
            <p className="text-xs text-destructive">
              Add LP commitments first — a call is shared across them.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>LP</TableHead>
                    <TableHead className="text-right">Share</TableHead>
                    <TableHead className="text-right">Called</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {p.name}
                        {p.discounted && (
                          <span className="ml-2 text-[11px] text-muted-foreground">
                            side-letter fee rate applied
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.pct.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {money(p.amount, cur)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell className="text-right">100.00%</TableCell>
                    <TableCell className="text-right font-semibold">
                      {money(form.totalAmount, cur)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            disabled={!valid || save.isPending}
            onClick={() => save.mutate(true)}
          >
            Save as draft
          </Button>
          <Button
            disabled={!valid || save.isPending}
            onClick={() => save.mutate(false)}
          >
            Issue capital call
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
