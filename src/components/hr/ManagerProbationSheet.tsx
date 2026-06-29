// =================================================================
// ManagerProbationSheet
// -----------------------------------------------------------------
// Side-sheet that lets a line manager run the 4 manager-owned
// stages of a direct report's 90-day probation. Stages are strictly
// sequential — a later stage is locked until the previous one is
// completed (mirrors the server-side guard).
//
//   1. Onboarding (Day 1)         → set objectives + success measures
//   2. Month 1 check-in (D25–30)  → informal note
//   3. Month 2 review (D55–60)    → formal progress note
//   4. Month 3 evaluation (D80–85)→ recommendation (Confirm / Extend
//                                   / Terminate) + reasoning → goes
//                                   to HR for the Final Decision.
// =================================================================

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  Target,
  CalendarDays,
  FileText,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchProbationForMyReport,
  setProbationOnboarding,
  completeProbationMonth1,
  completeProbationMonth2,
  submitProbationMonth3,
  type ProbationStage,
  type ProbationOutcome,
} from "@/lib/hr-probation-api";

const STAGE_LABELS: Record<string, string> = {
  onboarding: "Onboarding — 90-day plan",
  month_1: "Month 1 check-in",
  month_2: "Month 2 review",
  month_3: "Month 3 evaluation",
};

const STAGE_WINDOWS: Record<string, string> = {
  onboarding: "Day 1",
  month_1: "Day 25–30",
  month_2: "Day 55–60",
  month_3: "Day 80–85",
};

function stageBadge(s: ProbationStage) {
  if (s.status === "completed")
    return (
      <Badge
        variant="outline"
        className="bg-success/10 text-success border-success/20"
      >
        <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
      </Badge>
    );
  if (s.isOverdue)
    return (
      <Badge
        variant="outline"
        className="bg-destructive/10 text-destructive border-destructive/20"
      >
        <AlertTriangle className="h-3 w-3 mr-1" /> Overdue
      </Badge>
    );
  if (s.isDue)
    return (
      <Badge
        variant="outline"
        className="bg-warning/10 text-warning border-warning/20"
      >
        <Clock className="h-3 w-3 mr-1" /> Due now
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Pending
    </Badge>
  );
}

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString() : "—";

interface Props {
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
  } | null;
  onClose: () => void;
}

export function ManagerProbationSheet({ employee, onClose }: Props) {
  return (
    <Sheet open={!!employee} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {employee && <Inner employee={employee} />}
      </SheetContent>
    </Sheet>
  );
}

function Inner({ employee }: { employee: NonNullable<Props["employee"]> }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-team-probation", employee._id],
    queryFn: () => fetchProbationForMyReport(employee._id),
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading probation plan…</span>
      </div>
    );
  }

  const stages = data.stages.filter((s) => s.type !== "final_decision");
  const onboarding = stages.find((s) => s.type === "onboarding")!;
  const m1 = stages.find((s) => s.type === "month_1")!;
  const m2 = stages.find((s) => s.type === "month_2")!;
  const m3 = stages.find((s) => s.type === "month_3")!;
  const finalDecision = data.stages.find((s) => s.type === "final_decision");

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: ["my-team-probation", employee._id],
    });
    queryClient.invalidateQueries({ queryKey: ["my-team-probations"] });
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>
          {employee.firstName} {employee.lastName}
        </SheetTitle>
        <SheetDescription className="flex items-center gap-2 text-xs">
          {employee.jobTitle}
          <Badge
            variant="outline"
            className="bg-warning/10 text-warning border-warning/20"
          >
            On probation · ends {fmtDate(data.record.originalProbationEndDate)}
          </Badge>
        </SheetDescription>
      </SheetHeader>

      <div className="mt-6 space-y-4">
        <OnboardingCard stage={onboarding} employeeId={employee._id} onSaved={invalidate} />
        <Month1Card
          stage={m1}
          prevDone={onboarding.status === "completed"}
          employeeId={employee._id}
          onSaved={invalidate}
        />
        <Month2Card
          stage={m2}
          prevDone={m1.status === "completed"}
          employeeId={employee._id}
          onSaved={invalidate}
        />
        <Month3Card
          stage={m3}
          prevDone={m2.status === "completed"}
          employeeId={employee._id}
          onSaved={invalidate}
        />

        {finalDecision && (
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" /> Final decision (HR)
              </CardTitle>
              <CardDescription className="text-xs">
                Day 85–90 · HR records the outcome once your Month 3
                recommendation is in.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {finalDecision.status === "completed" && finalDecision.decision ? (
                <span className="text-success capitalize">
                  Decision recorded: {finalDecision.decision.outcome}
                </span>
              ) : m3.status === "completed" ? (
                <span>Awaiting HR sign-off.</span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3 w-3" /> Locked until your Month 3
                  recommendation is submitted.
                </span>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Stage cards
// ─────────────────────────────────────────────────────────────

function StageHeader({ stage }: { stage: ProbationStage }) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div>
        <CardTitle className="text-sm">{STAGE_LABELS[stage.type]}</CardTitle>
        <CardDescription className="text-xs">
          {STAGE_WINDOWS[stage.type]}
        </CardDescription>
      </div>
      {stageBadge(stage)}
    </div>
  );
}

function LockedNote() {
  return (
    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
      <Lock className="h-3 w-3" /> Complete the previous stage first.
    </p>
  );
}

function OnboardingCard({
  stage,
  employeeId,
  onSaved,
}: {
  stage: ProbationStage;
  employeeId: string;
  onSaved: () => void;
}) {
  const [objectives, setObjectives] = useState(stage.objectives?.objectives ?? "");
  const [successMeasures, setSuccessMeasures] = useState(
    stage.objectives?.successMeasures ?? "",
  );

  useEffect(() => {
    setObjectives(stage.objectives?.objectives ?? "");
    setSuccessMeasures(stage.objectives?.successMeasures ?? "");
  }, [stage]);

  const mut = useMutation({
    mutationFn: () =>
      setProbationOnboarding(employeeId, {
        objectives,
        successMeasures: successMeasures || undefined,
      }),
    onSuccess: () => {
      toast.success("90-day plan saved.");
      onSaved();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to save"),
  });

  const done = stage.status === "completed";

  return (
    <Card>
      <CardHeader className="pb-2">
        <StageHeader stage={stage} />
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1">
            <Target className="h-3 w-3" /> 90-day objectives
          </Label>
          <Textarea
            rows={4}
            value={objectives}
            onChange={(e) => setObjectives(e.target.value)}
            placeholder="What must this person achieve in the next 90 days?"
            disabled={done && !!stage.objectives}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Success measures</Label>
          <Textarea
            rows={3}
            value={successMeasures}
            onChange={(e) => setSuccessMeasures(e.target.value)}
            placeholder="How will success be measured?"
            disabled={done && !!stage.objectives}
          />
        </div>
        {!done && (
          <Button
            size="sm"
            disabled={!objectives.trim() || mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save & issue plan"
            )}
          </Button>
        )}
        {done && (
          <p className="text-xs text-muted-foreground">
            Issued {fmtDate(stage.completedAt)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MonthlyCard({
  stage,
  prevDone,
  employeeId,
  onSaved,
  field,
  placeholder,
  mutate,
}: {
  stage: ProbationStage;
  prevDone: boolean;
  employeeId: string;
  onSaved: () => void;
  field: "note" | "progressNote";
  placeholder: string;
  mutate: (employeeId: string, dto: any) => Promise<any>;
}) {
  const initial = (stage[field] as string | null) ?? "";
  const [text, setText] = useState(initial);
  useEffect(() => setText(initial), [initial]);

  const mut = useMutation({
    mutationFn: () =>
      mutate(employeeId, field === "note" ? { note: text } : { progressNote: text }),
    onSuccess: () => {
      toast.success("Check-in recorded.");
      onSaved();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to save"),
  });

  const done = stage.status === "completed";

  return (
    <Card className={!prevDone ? "opacity-60" : ""}>
      <CardHeader className="pb-2">
        <StageHeader stage={stage} />
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!prevDone && <LockedNote />}
        {stage.employeeSelfAssessment && (
          <div className="rounded-md bg-muted/40 p-3 text-xs">
            <p className="font-medium mb-1">Employee self-assessment</p>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {stage.employeeSelfAssessment}
            </p>
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-xs">Your assessment</Label>
          <Textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            disabled={!prevDone || done}
          />
        </div>
        {prevDone && !done && (
          <Button
            size="sm"
            disabled={!text.trim() || mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Mark complete"
            )}
          </Button>
        )}
        {done && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CalendarDays className="h-3 w-3" />
            Completed {fmtDate(stage.completedAt)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Month1Card(props: {
  stage: ProbationStage;
  prevDone: boolean;
  employeeId: string;
  onSaved: () => void;
}) {
  return (
    <MonthlyCard
      {...props}
      field="note"
      placeholder="Informal review of settling-in, early performance, any concerns."
      mutate={completeProbationMonth1}
    />
  );
}

function Month2Card(props: {
  stage: ProbationStage;
  prevDone: boolean;
  employeeId: string;
  onSaved: () => void;
}) {
  return (
    <MonthlyCard
      {...props}
      field="progressNote"
      placeholder="Formal mid-point assessment against objectives + corrective actions if any."
      mutate={completeProbationMonth2}
    />
  );
}

function Month3Card({
  stage,
  prevDone,
  employeeId,
  onSaved,
}: {
  stage: ProbationStage;
  prevDone: boolean;
  employeeId: string;
  onSaved: () => void;
}) {
  const [reasoning, setReasoning] = useState(
    stage.recommendation?.managerReasoning ?? "",
  );
  const [outcome, setOutcome] = useState<ProbationOutcome | "">(
    stage.recommendation?.suggestedOutcome ?? "",
  );
  const [band, setBand] = useState(stage.recommendation?.basedOnRatingBand ?? "");

  useEffect(() => {
    setReasoning(stage.recommendation?.managerReasoning ?? "");
    setOutcome(stage.recommendation?.suggestedOutcome ?? "");
    setBand(stage.recommendation?.basedOnRatingBand ?? "");
  }, [stage]);

  const mut = useMutation({
    mutationFn: () =>
      submitProbationMonth3(employeeId, {
        managerReasoning: reasoning,
        suggestedOutcome: outcome as ProbationOutcome,
        basedOnRatingBand: band || undefined,
      }),
    onSuccess: () => {
      toast.success("Recommendation sent to HR.");
      onSaved();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to submit"),
  });

  const done = stage.status === "completed";

  return (
    <Card className={!prevDone ? "opacity-60" : ""}>
      <CardHeader className="pb-2">
        <StageHeader stage={stage} />
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!prevDone && <LockedNote />}
        {stage.employeeSelfAssessment && (
          <div className="rounded-md bg-muted/40 p-3 text-xs">
            <p className="font-medium mb-1">Employee final self-assessment</p>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {stage.employeeSelfAssessment}
            </p>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Recommended outcome</Label>
            <Select
              value={outcome}
              onValueChange={(v) => setOutcome(v as ProbationOutcome)}
              disabled={!prevDone || done}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirm">Confirm</SelectItem>
                <SelectItem value="extend">Extend</SelectItem>
                <SelectItem value="terminate">Terminate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Overall rating band (optional)</Label>
            <Input
              value={band}
              onChange={(e) => setBand(e.target.value)}
              placeholder="e.g. Good"
              disabled={!prevDone || done}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Reasoning for HR</Label>
          <Textarea
            rows={4}
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            placeholder="Final performance assessment against probation criteria — what HR needs to sign off."
            disabled={!prevDone || done}
          />
        </div>
        {prevDone && !done && (
          <Button
            size="sm"
            disabled={!outcome || !reasoning.trim() || mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" /> Send to HR
              </>
            )}
          </Button>
        )}
        {done && (
          <p className="text-xs text-muted-foreground">
            Recommendation sent {fmtDate(stage.completedAt)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
