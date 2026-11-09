import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
import { Plus, Sparkles, Trash2, CircleCheck } from "lucide-react";
import {
  READINESS_DIMENSIONS,
  addReadinessGap,
  deleteGap,
  generateGaps,
  setGapStatus,
  updateGap,
  type GapPriority,
  type GapStatus,
  type ReadinessAssessment,
  type ReadinessDimension,
  type ReadinessGap,
} from "@/lib/grc/readiness-api";
import {
  NeedsAssessment,
  PRIORITY_LABEL,
  PRIORITY_TONE,
  fail,
  fmtDate,
  type TabProps,
} from "./shared";

const STATUSES: GapStatus[] = [
  "Open",
  "In progress",
  "Closed",
  "Risk accepted",
];

export function GapsTab({ current, onAssessment, onNew }: TabProps) {
  const [addOpen, setAddOpen] = useState(false);

  const gen = useMutation({
    mutationFn: () => generateGaps(current!._id),
    onSuccess: (a) => {
      onAssessment(a);
      toast({
        title: a.created
          ? `${a.created} gap${a.created === 1 ? "" : "s"} raised`
          : "No new gaps to raise",
        description: a.created
          ? "One for each dimension under the threshold that had none open."
          : "Every dimension under the threshold already has an open gap.",
      });
    },
    onError: (e) => fail("Could not generate gaps", e),
  });

  if (!current) return <NeedsAssessment onNew={onNew} />;

  const below = current.scores.filter((s) => s.effective < current.threshold);
  const gaps = [...current.gaps].sort(
    (a, b) =>
      a.priority.localeCompare(b.priority) ||
      +new Date(a.targetDate) - +new Date(b.targetDate),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {below.length} dimension{below.length === 1 ? "" : "s"} below the{" "}
            {current.threshold} threshold
          </p>
          {below.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {below.map((s) => (
                <Badge key={s.dimension} variant="outline" className="text-xs">
                  {s.dimension} · {s.effective}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => gen.mutate()}
            disabled={gen.isPending}
          >
            <Sparkles className="mr-2 h-4 w-4" /> Generate from scores
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add gap
          </Button>
        </div>
      </div>

      {gaps.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          <CircleCheck className="mx-auto mb-2 h-6 w-6 text-emerald-600" />
          No gaps recorded.
        </div>
      ) : (
        <div className="space-y-3">
          {gaps.map((g) => (
            <GapCard
              key={g._id}
              gap={g}
              assessment={current}
              onAssessment={onAssessment}
            />
          ))}
        </div>
      )}

      <AddGapDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        assessment={current}
        onAssessment={onAssessment}
      />
    </div>
  );
}

function GapCard({
  gap,
  assessment,
  onAssessment,
}: {
  gap: ReadinessGap;
  assessment: ReadinessAssessment;
  onAssessment: (a: ReadinessAssessment) => void;
}) {
  const [remediation, setRemediation] = useState(gap.remediation);
  const [owner, setOwner] = useState(gap.owner);
  const [target, setTarget] = useState(fmtDate(gap.targetDate));
  useEffect(() => {
    setRemediation(gap.remediation);
    setOwner(gap.owner);
    setTarget(fmtDate(gap.targetDate));
  }, [gap.remediation, gap.owner, gap.targetDate]);

  const patch = useMutation({
    mutationFn: (dto: Parameters<typeof updateGap>[2]) =>
      updateGap(assessment._id, gap._id, dto),
    onSuccess: onAssessment,
    onError: (e) => fail("Could not save the gap", e),
  });
  const status = useMutation({
    mutationFn: (s: GapStatus) => setGapStatus(assessment._id, gap._id, s),
    onSuccess: onAssessment,
    onError: (e) => fail("Could not change the status", e),
  });
  const del = useMutation({
    mutationFn: () => deleteGap(assessment._id, gap._id),
    onSuccess: onAssessment,
    onError: (e) => fail("Could not delete the gap", e),
  });

  const dim = assessment.scores.find((s) => s.dimension === gap.dimension);
  const resolved = gap.status === "Closed" || gap.status === "Risk accepted";

  return (
    <div
      className={`rounded-lg border bg-card p-4 ${resolved ? "opacity-70" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={PRIORITY_TONE[gap.priority]}>
              {PRIORITY_LABEL[gap.priority]}
            </Badge>
            <span className="text-sm font-semibold">{gap.dimension}</span>
            {dim ? (
              <span className="text-xs text-muted-foreground">
                scores {dim.effective}
              </span>
            ) : null}
            {gap.source === "score" ? (
              <Badge variant="outline" className="text-[10px]">
                From scores
              </Badge>
            ) : null}
          </div>
          <p className="text-sm">{gap.description}</p>
          {gap.impact ? (
            <p className="text-xs text-muted-foreground">
              Impact: {gap.impact}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={gap.status}
            onValueChange={(v) => status.mutate(v as GapStatus)}
          >
            <SelectTrigger
              className="h-8 w-[140px] text-xs"
              aria-label="Gap status"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Delete gap"
            onClick={() => del.mutate()}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[2fr_1fr_150px]">
        <div className="space-y-1">
          <Label className="text-xs">Remediation</Label>
          <Textarea
            className="min-h-[56px] text-sm"
            value={remediation}
            placeholder="What will be done to close this"
            onChange={(e) => setRemediation(e.target.value)}
            onBlur={() =>
              remediation !== gap.remediation && patch.mutate({ remediation })
            }
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Owner</Label>
          <Input
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            onBlur={() => owner !== gap.owner && patch.mutate({ owner })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Target date</Label>
          <Input
            type="date"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onBlur={() =>
              target &&
              target !== fmtDate(gap.targetDate) &&
              patch.mutate({ targetDate: target })
            }
          />
        </div>
      </div>
    </div>
  );
}

function AddGapDialog({
  open,
  onOpenChange,
  assessment,
  onAssessment,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  assessment: ReadinessAssessment;
  onAssessment: (a: ReadinessAssessment) => void;
}) {
  const blank = {
    dimension: READINESS_DIMENSIONS[0] as ReadinessDimension,
    priority: "P2" as GapPriority,
    description: "",
    impact: "",
    remediation: "",
    owner: "",
    targetDate: "",
  };
  const [f, setF] = useState(blank);
  useEffect(() => {
    if (open) setF(blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const add = useMutation({
    mutationFn: () => addReadinessGap(assessment._id, f),
    onSuccess: (a) => {
      onAssessment(a);
      onOpenChange(false);
      toast({ title: "Gap added" });
    },
    onError: (e) => fail("Could not add the gap", e),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add gap</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Dimension</Label>
            <Select
              value={f.dimension}
              onValueChange={(v) =>
                setF({ ...f, dimension: v as ReadinessDimension })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {READINESS_DIMENSIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select
              value={f.priority}
              onValueChange={(v) => setF({ ...f, priority: v as GapPriority })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["P1", "P2", "P3"] as GapPriority[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="gap-desc">What is the gap?</Label>
            <Textarea
              id="gap-desc"
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
              className="min-h-[70px]"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="gap-impact">Impact</Label>
            <Input
              id="gap-impact"
              value={f.impact}
              onChange={(e) => setF({ ...f, impact: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="gap-rem">Remediation</Label>
            <Input
              id="gap-rem"
              value={f.remediation}
              onChange={(e) => setF({ ...f, remediation: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gap-owner">Owner</Label>
            <Input
              id="gap-owner"
              value={f.owner}
              onChange={(e) => setF({ ...f, owner: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gap-target">Target date</Label>
            <Input
              id="gap-target"
              type="date"
              value={f.targetDate}
              onChange={(e) => setF({ ...f, targetDate: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => add.mutate()}
            disabled={!f.description.trim() || !f.targetDate || add.isPending}
          >
            Add gap
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
