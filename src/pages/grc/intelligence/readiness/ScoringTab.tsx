import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Eye, X } from "lucide-react";
import {
  DIMENSION_SOURCE,
  fmtIndicator,
  scoreBar,
  scoreColor,
  setIndicator,
  setDimensionOverride,
  clearDimensionOverride,
  recomputeAutoScores,
  updateReadinessThreshold,
  type DimensionScore,
  type ReadinessAssessment,
  type ReadinessDimension,
  type ReadinessIndicator,
} from "@/lib/grc/readiness-api";
import {
  NeedsAssessment,
  ScoreRing,
  Tile,
  bandPill,
  fail,
  type TabProps,
} from "./shared";

export function ScoringTab({ current, ws, onAssessment, onNew }: TabProps) {
  const [open, setOpen] = useState<ReadinessDimension | null>(null);
  const [threshold, setThreshold] = useState(current?.threshold ?? 70);
  useEffect(() => {
    if (current) setThreshold(current.threshold);
  }, [current?.threshold, current?._id]);

  const recompute = useMutation({
    mutationFn: () => recomputeAutoScores(current!._id),
    onSuccess: (a) => {
      onAssessment(a);
      toast({
        title: "Auto-scores refreshed",
        description: "Live values re-read from your modules and data room.",
      });
    },
    onError: (e) => fail("Could not refresh", e),
  });
  const saveThreshold = useMutation({
    mutationFn: (n: number) => updateReadinessThreshold(current!._id, n),
    onSuccess: onAssessment,
    onError: (e) => fail("Could not save the threshold", e),
  });

  if (!current) return <NeedsAssessment onNew={onNew} />;

  const held = ws.room.filter(
    (r) => r.status === "uploaded" || r.status === "review",
  ).length;
  const expected = ws.room.filter((r) => r.status !== "not_applicable").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center justify-center gap-4 rounded-lg border bg-card p-4">
          <ScoreRing value={current.overallScore} />
          <div>
            <div className="text-xs text-muted-foreground">
              Overall readiness
            </div>
            <Badge variant="outline" className={bandPill(current.band.label)}>
              {current.band.label}
            </Badge>
          </div>
        </div>
        <Tile
          label="Open gaps"
          value={current.gapsOpen}
          tone={current.gapsOpen ? "text-rose-600" : "text-emerald-600"}
          hint={`${current.dimensionsBelowThreshold} dimension(s) below ${current.threshold}`}
        />
        <Tile label="Data room documents" value={`${held}/${expected}`} />
        <Tile
          label="Projected ready"
          value={
            current.projectedReadyDate === "Ready now"
              ? "Ready"
              : current.projectedReadyDate
          }
          tone={
            current.projectedReadyDate === "Ready now"
              ? "text-emerald-600"
              : "text-amber-600"
          }
        />
      </div>

      {current.mode === "legacy" ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">
          Version {current.version} was scored before indicators existed, so its
          dimensions can't be drilled into. Create a new assessment to score by
          indicator and weight.
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="gap-threshold" className="text-xs">
              Gap threshold
            </Label>
            <Input
              id="gap-threshold"
              type="number"
              min={0}
              max={100}
              className="h-9 w-24"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              onBlur={() => {
                const n = Math.max(0, Math.min(100, Math.round(threshold)));
                setThreshold(n);
                if (n !== current.threshold) saveThreshold.mutate(n);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
            />
          </div>
          <p className="pb-2 text-xs text-muted-foreground">
            Dimensions scoring under this are flagged as gaps.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => recompute.mutate()}
          disabled={recompute.isPending}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${recompute.isPending ? "animate-spin" : ""}`}
          />
          Refresh auto-scores
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {current.scores.map((s) => {
          const eff = s.effective;
          const inds = current.indicators.filter(
            (i) => i.dimension === s.dimension,
          );
          return (
            <button
              type="button"
              key={s.dimension}
              onClick={() => setOpen(s.dimension)}
              className="rounded-lg border bg-card p-4 text-left transition hover:border-primary/50 hover:shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[15px] font-semibold">
                    {s.dimension}
                    {s.override !== null ? (
                      <Badge variant="outline" className="text-[10px]">
                        Override
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {DIMENSION_SOURCE[s.dimension]}
                    {inds.length ? ` · ${inds.length} indicators` : ""}
                    {s.weight !== null ? ` · Weight ${s.weight}%` : ""}
                  </div>
                </div>
                <div className={`text-3xl font-bold ${scoreColor(eff)}`}>
                  {eff}
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${scoreBar(eff)}`}
                  style={{ width: `${eff}%` }}
                />
              </div>
              <div className="mt-2 flex items-center gap-1 text-[11px] text-primary">
                <Eye className="h-3 w-3" /> View indicators and override
              </div>
            </button>
          );
        })}
      </div>

      {open ? (
        <DimensionDialog
          assessment={current}
          dimension={open}
          onClose={() => setOpen(null)}
          onAssessment={onAssessment}
        />
      ) : null}
    </div>
  );
}

const BASIS: Record<string, { label: string; cls: string }> = {
  auto: { label: "Live data", cls: "text-emerald-600 border-emerald-500/40" },
  manual: { label: "Entered", cls: "text-sky-600 border-sky-500/40" },
  none: { label: "No data", cls: "text-muted-foreground" },
};

function IndicatorRow({
  ind,
  onSave,
  busy,
}: {
  ind: ReadinessIndicator;
  onSave: (dto: { value?: number | null; note?: string }) => void;
  busy: boolean;
}) {
  const [value, setValue] = useState(
    ind.value !== null && ind.value !== undefined ? String(ind.value) : "",
  );
  const [note, setNote] = useState(ind.note ?? "");
  useEffect(() => {
    setValue(
      ind.value !== null && ind.value !== undefined ? String(ind.value) : "",
    );
    setNote(ind.note ?? "");
  }, [ind.value, ind.note]);

  const commit = () => {
    const patch: { value?: number | null; note?: string } = {};
    const parsed = value.trim() === "" ? null : Number(value);
    if (parsed !== null && !Number.isFinite(parsed)) return;
    if (parsed !== ind.value) patch.value = parsed;
    if (note !== (ind.note ?? "")) patch.note = note;
    if (Object.keys(patch).length) onSave(patch);
  };
  const basis = BASIS[ind.source];

  return (
    <div className="grid grid-cols-1 gap-2 border-b px-3 py-3 last:border-0 md:grid-cols-[1.6fr_96px_110px_56px_1.2fr] md:items-center">
      <div>
        <div className="text-sm font-medium">{ind.label}</div>
        <div className="text-[11px] text-muted-foreground">
          Weight {ind.weight}% · floor {fmtIndicator(ind.floor, ind.unit)} →
          target {fmtIndicator(ind.target, ind.unit)}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Input
          className="h-8"
          type="number"
          step={ind.unit === "x" ? 0.1 : 1}
          value={value}
          placeholder={
            ind.autoValue !== null && ind.autoValue !== undefined
              ? String(ind.autoValue)
              : "—"
          }
          aria-label={`${ind.label} value`}
          disabled={busy}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
        <span className="text-xs text-muted-foreground">{ind.unit}</span>
      </div>
      <div className="flex items-center gap-1">
        <Badge variant="outline" className={`text-[10px] ${basis.cls}`}>
          {basis.label}
        </Badge>
        {ind.source === "manual" ? (
          <button
            type="button"
            title={
              ind.autoValue !== null && ind.autoValue !== undefined
                ? "Go back to the live value"
                : "Clear the entered value"
            }
            className="text-muted-foreground hover:text-foreground"
            onClick={() => onSave({ value: null })}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      <div className={`text-sm font-semibold ${scoreColor(ind.score)}`}>
        {ind.score}
      </div>
      <Input
        className="h-8"
        placeholder="Note / evidence"
        value={note}
        aria-label={`${ind.label} note`}
        disabled={busy}
        onChange={(e) => setNote(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
    </div>
  );
}

function DimensionDialog({
  assessment,
  dimension,
  onClose,
  onAssessment,
}: {
  assessment: ReadinessAssessment;
  dimension: ReadinessDimension;
  onClose: () => void;
  onAssessment: (a: ReadinessAssessment) => void;
}) {
  const score = assessment.scores.find(
    (s) => s.dimension === dimension,
  ) as DimensionScore;
  const inds = assessment.indicators.filter((i) => i.dimension === dimension);
  const [ovValue, setOvValue] = useState(String(score.override ?? ""));
  const [ovReason, setOvReason] = useState(score.overrideReason ?? "");

  const indMut = useMutation({
    mutationFn: (v: { key: string; value?: number | null; note?: string }) =>
      setIndicator(assessment._id, v),
    onSuccess: onAssessment,
    onError: (e) => fail("Could not save the indicator", e),
  });
  const setOv = useMutation({
    mutationFn: () =>
      setDimensionOverride(
        assessment._id,
        dimension,
        Number(ovValue),
        ovReason.trim(),
      ),
    onSuccess: (a) => {
      onAssessment(a);
      toast({ title: "Override saved" });
    },
    onError: (e) => fail("Could not save the override", e),
  });
  const clearOv = useMutation({
    mutationFn: () => clearDimensionOverride(assessment._id, dimension),
    onSuccess: (a) => {
      onAssessment(a);
      setOvValue("");
      setOvReason("");
      toast({ title: "Override cleared" });
    },
    onError: (e) => fail("Could not clear the override", e),
  });

  const ovNum = Number(ovValue);
  const ovValid =
    ovValue.trim() !== "" &&
    Number.isFinite(ovNum) &&
    ovNum >= 0 &&
    ovNum <= 100 &&
    ovReason.trim().length > 0;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {dimension}
            <span
              className={`text-2xl font-bold ${scoreColor(score.effective)}`}
            >
              {score.effective}
            </span>
          </DialogTitle>
          <DialogDescription>
            {DIMENSION_SOURCE[dimension]}. Type a value to override what the
            modules report; clear it to go back to live data.
          </DialogDescription>
        </DialogHeader>

        {inds.length ? (
          <div className="rounded-md border">
            <div className="hidden grid-cols-[1.6fr_96px_110px_56px_1.2fr] gap-2 border-b bg-muted/40 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:grid">
              <span>Indicator</span>
              <span>Value</span>
              <span>Basis</span>
              <span>Score</span>
              <span>Note</span>
            </div>
            {inds.map((i) => (
              <IndicatorRow
                key={i.key}
                ind={i}
                busy={indMut.isPending}
                onSave={(dto) => indMut.mutate({ key: i.key, ...dto })}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-md border p-4 text-sm text-muted-foreground">
            This version has no indicators. Use the override below, or create a
            new assessment.
          </p>
        )}

        <div className="space-y-3 rounded-md border p-4">
          <div>
            <h4 className="text-sm font-semibold">
              Dimension override
              {score.override !== null ? (
                <Badge variant="outline" className="ml-2 text-[10px]">
                  Active: {score.override}
                </Badge>
              ) : null}
            </h4>
            <p className="text-xs text-muted-foreground">
              Replaces the computed score ({score.autoScore}) for this
              dimension. A reason is required so the report can explain it.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[110px_1fr_auto]">
            <div className="space-y-1">
              <Label htmlFor="ov-value" className="text-xs">
                Score (0–100)
              </Label>
              <Input
                id="ov-value"
                type="number"
                min={0}
                max={100}
                value={ovValue}
                onChange={(e) => setOvValue(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ov-reason" className="text-xs">
                Reason
              </Label>
              <Input
                id="ov-reason"
                value={ovReason}
                onChange={(e) => setOvReason(e.target.value)}
                placeholder="Why this differs from the computed score"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                size="sm"
                onClick={() => setOv.mutate()}
                disabled={!ovValid || setOv.isPending}
              >
                Apply
              </Button>
              {score.override !== null ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => clearOv.mutate()}
                  disabled={clearOv.isPending}
                >
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
