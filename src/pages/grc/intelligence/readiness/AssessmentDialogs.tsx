import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  READINESS_DIMENSIONS,
  DEAL_TYPE_LABEL,
  INVESTOR_TYPE_LABEL,
  INVESTOR_WEIGHT_PRESETS,
  DIMENSION_SHORT,
  createAssessment,
  updateAssessmentContext,
  updateAssessmentWeights,
  type DealContext,
  type DealType,
  type InvestorType,
  type ReadinessAssessment,
  type ReadinessDimension,
} from "@/lib/grc/readiness-api";
import { fail, fmtMoney } from "./shared";

interface ContextForm {
  title: string;
  advisor: string;
  dealType: DealType;
  investorType: InvestorType;
  raiseAmount: string;
  currency: string;
  targetClose: string;
  useOfFunds: string;
}

const EMPTY: ContextForm = {
  title: "",
  advisor: "",
  dealType: "equity",
  investorType: "mixed",
  raiseAmount: "",
  currency: "USD",
  targetClose: "",
  useOfFunds: "",
};

function fromAssessment(a?: ReadinessAssessment): ContextForm {
  if (!a) return EMPTY;
  const c = a.dealContext;
  return {
    title: a.title ?? "",
    advisor: a.advisor ?? "",
    dealType: c.dealType,
    investorType: c.investorType,
    raiseAmount: c.raiseAmount ? String(c.raiseAmount) : "",
    currency: c.currency || "USD",
    targetClose: c.targetClose ? c.targetClose.slice(0, 10) : "",
    useOfFunds: c.useOfFunds ?? "",
  };
}

function contextBody(f: ContextForm): Partial<DealContext> {
  return {
    dealType: f.dealType,
    investorType: f.investorType,
    raiseAmount: Number(f.raiseAmount.replace(/,/g, "")) || 0,
    currency: f.currency.trim().toUpperCase() || "USD",
    targetClose: f.targetClose || null,
    useOfFunds: f.useOfFunds,
  };
}

function ContextFields({
  form,
  set,
}: {
  form: ContextForm;
  set: (patch: Partial<ContextForm>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ctx-title">Assessment name</Label>
          <Input
            id="ctx-title"
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="e.g. Series A readiness, Q4 2026"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Deal type</Label>
          <Select
            value={form.dealType}
            onValueChange={(v) => set({ dealType: v as DealType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(DEAL_TYPE_LABEL) as DealType[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {DEAL_TYPE_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Target investor type</Label>
          <Select
            value={form.investorType}
            onValueChange={(v) => set({ investorType: v as InvestorType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(INVESTOR_TYPE_LABEL) as InvestorType[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {INVESTOR_TYPE_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ctx-raise">Target raise</Label>
          <div className="flex gap-2">
            <Input
              className="w-24"
              value={form.currency}
              onChange={(e) => set({ currency: e.target.value })}
              aria-label="Currency"
              maxLength={4}
            />
            <Input
              id="ctx-raise"
              inputMode="numeric"
              value={form.raiseAmount}
              onChange={(e) => set({ raiseAmount: e.target.value })}
              placeholder="2,000,000"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ctx-close">Target close</Label>
          <Input
            id="ctx-close"
            type="date"
            value={form.targetClose}
            onChange={(e) => set({ targetClose: e.target.value })}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ctx-advisor">Lead advisor</Label>
          <Input
            id="ctx-advisor"
            value={form.advisor}
            onChange={(e) => set({ advisor: e.target.value })}
            placeholder="Who is steering the preparation"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ctx-use">Use of funds</Label>
          <Textarea
            id="ctx-use"
            value={form.useOfFunds}
            onChange={(e) => set({ useOfFunds: e.target.value })}
            placeholder="What the money will be used for"
            className="min-h-[70px]"
          />
        </div>
      </div>
    </div>
  );
}

export function WeightsEditor({
  weights,
  onChange,
  investorType,
}: {
  weights: Record<ReadinessDimension, number>;
  onChange: (w: Record<ReadinessDimension, number>) => void;
  investorType: InvestorType;
}) {
  const total = READINESS_DIMENSIONS.reduce((s, d) => s + (weights[d] || 0), 0);
  const ok = Math.abs(total - 100) <= 0.5;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          How much each dimension counts towards the overall score. Weights must
          total 100%.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange({ ...INVESTOR_WEIGHT_PRESETS[investorType] })}
        >
          Use {INVESTOR_TYPE_LABEL[investorType].split(" /")[0]} preset
        </Button>
      </div>
      <div className="divide-y rounded-md border">
        {READINESS_DIMENSIONS.map((d) => (
          <div key={d} className="flex items-center gap-3 px-3 py-2">
            <span className="flex-1 text-sm">{d}</span>
            <Input
              type="number"
              min={0}
              max={100}
              className="h-8 w-20"
              aria-label={`${DIMENSION_SHORT[d]} weight`}
              value={weights[d]}
              onChange={(e) =>
                onChange({ ...weights, [d]: Number(e.target.value) || 0 })
              }
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        ))}
      </div>
      <p
        className={`text-sm font-medium ${ok ? "text-emerald-600" : "text-rose-600"}`}
      >
        Total: {Math.round(total * 10) / 10}%{ok ? "" : " (should be 100%)"}
      </p>
    </div>
  );
}

const STEPS = ["Deal context", "Dimension weights", "Review"] as const;

// Three steps: the deal being prepared for, how the dimensions are
// weighted for that kind of investor, and a last look. There is no
// "which entity" step — an organisation only ever assesses itself.
export function NewAssessmentWizard({
  open,
  onOpenChange,
  latest,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  latest?: ReadinessAssessment;
  onCreated: (a: ReadinessAssessment) => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ContextForm>(EMPTY);
  const [weights, setWeights] = useState<Record<ReadinessDimension, number>>(
    INVESTOR_WEIGHT_PRESETS.mixed,
  );
  // Until the user edits a weight by hand, changing the investor type
  // keeps the weights on that type's preset.
  const [customWeights, setCustomWeights] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setForm({ ...fromAssessment(latest), title: "" });
    const w = latest?.weights?.length
      ? (Object.fromEntries(
          latest.weights.map((x) => [x.dimension, x.weight]),
        ) as Record<ReadinessDimension, number>)
      : {
          ...INVESTOR_WEIGHT_PRESETS[
            latest?.dealContext.investorType ?? "mixed"
          ],
        };
    setWeights(w);
    setCustomWeights(!!latest?.weights?.length);
  }, [open, latest]);

  const set = (patch: Partial<ContextForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    if (patch.investorType && !customWeights) {
      setWeights({ ...INVESTOR_WEIGHT_PRESETS[patch.investorType] });
    }
  };

  const total = READINESS_DIMENSIONS.reduce((s, d) => s + (weights[d] || 0), 0);
  const weightsOk = Math.abs(total - 100) <= 0.5;

  const createMut = useMutation({
    mutationFn: () =>
      createAssessment({
        title: form.title.trim() || undefined,
        advisor: form.advisor.trim() || undefined,
        dealContext: contextBody(form) as any,
        weights: READINESS_DIMENSIONS.map((d) => ({
          dimension: d,
          weight: weights[d],
        })),
      }),
    onSuccess: (a) => {
      toast({
        title: "Assessment created",
        description: `Version ${a.version} scored from your connected modules and data room.`,
      });
      onCreated(a);
      onOpenChange(false);
    },
    onError: (e) => fail("Could not create the assessment", e),
  });

  const next = () => {
    if (step === 1 && !weightsOk) {
      toast({
        title: "Weights must total 100%",
        variant: "destructive",
      });
      return;
    }
    if (step < STEPS.length - 1) setStep(step + 1);
    else createMut.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New assessment</DialogTitle>
          <DialogDescription>
            Step {step + 1} of {STEPS.length} — {STEPS[step]}. Scores are pulled
            from your own organisation's modules.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>

        {step === 0 && <ContextFields form={form} set={set} />}
        {step === 1 && (
          <WeightsEditor
            weights={weights}
            investorType={form.investorType}
            onChange={(w) => {
              setCustomWeights(true);
              setWeights(w);
            }}
          />
        )}
        {step === 2 && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2 rounded-md border p-4">
              <span className="text-muted-foreground">Name</span>
              <span>{form.title || "—"}</span>
              <span className="text-muted-foreground">Deal type</span>
              <span>{DEAL_TYPE_LABEL[form.dealType]}</span>
              <span className="text-muted-foreground">Investor type</span>
              <span>{INVESTOR_TYPE_LABEL[form.investorType]}</span>
              <span className="text-muted-foreground">Target raise</span>
              <span>
                {Number(form.raiseAmount.replace(/,/g, ""))
                  ? fmtMoney(
                      Number(form.raiseAmount.replace(/,/g, "")),
                      form.currency.toUpperCase() || "USD",
                    )
                  : "—"}
              </span>
              <span className="text-muted-foreground">Target close</span>
              <span>{form.targetClose || "—"}</span>
              <span className="text-muted-foreground">Lead advisor</span>
              <span>{form.advisor || "—"}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-md border p-4">
              {READINESS_DIMENSIONS.map((d) => (
                <div key={d} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {DIMENSION_SHORT[d]}
                  </span>
                  <span className="font-medium">{weights[d]}%</span>
                </div>
              ))}
            </div>
            {latest ? (
              <p className="text-xs text-muted-foreground">
                Values you entered, open gaps and hand-written report sections
                carry over from version {latest.version}. Live values are read
                afresh.
              </p>
            ) : null}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            disabled={step === 0 || createMut.isPending}
            onClick={() => setStep(step - 1)}
          >
            Back
          </Button>
          <Button onClick={next} disabled={createMut.isPending}>
            {step === STEPS.length - 1
              ? createMut.isPending
                ? "Creating…"
                : "Create assessment"
              : "Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// "Edit deal context" — the same fields, plus the weights, applied to the
// version being looked at.
export function EditContextDialog({
  open,
  onOpenChange,
  assessment,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  assessment: ReadinessAssessment;
  onSaved: (a: ReadinessAssessment) => void;
}) {
  const [form, setForm] = useState<ContextForm>(fromAssessment(assessment));
  const initialWeights = useMemo(
    () =>
      Object.fromEntries(
        assessment.weights.map((w) => [w.dimension, w.weight]),
      ) as Record<ReadinessDimension, number>,
    [assessment],
  );
  const [weights, setWeights] =
    useState<Record<ReadinessDimension, number>>(initialWeights);
  const hasWeights = assessment.weights.length > 0;

  useEffect(() => {
    if (open) {
      setForm(fromAssessment(assessment));
      setWeights(initialWeights);
    }
  }, [open, assessment, initialWeights]);

  const total = READINESS_DIMENSIONS.reduce((s, d) => s + (weights[d] || 0), 0);

  const save = useMutation({
    mutationFn: async () => {
      let a = await updateAssessmentContext(assessment._id, {
        title: form.title,
        advisor: form.advisor,
        dealContext: contextBody(form) as any,
      });
      if (hasWeights) {
        const changed = READINESS_DIMENSIONS.some(
          (d) => weights[d] !== initialWeights[d],
        );
        if (changed) {
          a = await updateAssessmentWeights(
            assessment._id,
            READINESS_DIMENSIONS.map((d) => ({
              dimension: d,
              weight: weights[d],
            })),
          );
        }
      }
      return a;
    },
    onSuccess: (a) => {
      onSaved(a);
      onOpenChange(false);
      toast({ title: "Deal context updated" });
    },
    onError: (e) => fail("Could not save", e),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit deal context</DialogTitle>
          <DialogDescription>
            Changes apply to version {assessment.version}.
          </DialogDescription>
        </DialogHeader>
        <ContextFields
          form={form}
          set={(p) => setForm((f) => ({ ...f, ...p }))}
        />
        {hasWeights ? (
          <div className="space-y-2 border-t pt-4">
            <h4 className="text-sm font-semibold">Dimension weights</h4>
            <WeightsEditor
              weights={weights}
              onChange={setWeights}
              investorType={form.investorType}
            />
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={
              save.isPending || (hasWeights && Math.abs(total - 100) > 0.5)
            }
          >
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
