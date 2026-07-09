// =================================================================
// ManagerProbationSheet — CORRECTED
// -----------------------------------------------------------------
// Side-sheet for a line manager running a direct report's 90-day
// probation. Stages stay strictly sequential, server-guarded.
//
//   1. Onboarding (Day 1)         → objectives + success measures
//   2. Month 1 check-in (D25–30)  → manager-only informal note
//                                    (confirmed: no employee input,
//                                    per Probation_Workflow.docx)
//   3. Month 2 review (D55–60)    → manager-only formal progress
//                                    note (same confirmation)
//   4. Month 3 evaluation (D80–85)→ generates a REAL performance
//                                    review cycle; employee
//                                    self-assesses, manager scores
//                                    via the SAME ManagerReviewSheet
//                                    used everywhere else; the
//                                    recommendation is AUTO-COMPUTED
//                                    on completion — the manager
//                                    never hand-types an outcome.
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
import {
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  Target,
  CalendarDays,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchProbationForMyReport,
  setProbationOnboarding,
  completeProbationMonth1,
  completeProbationMonth2,
  startProbationMonth3,
  type ProbationStage,
} from "@/lib/hr-probation-api";
import {
  fetchReviewForReviewer,
  updateReviewManagerSection,
  completeReviewAsManager,
  type PerformanceReview,
} from "@/lib/hr-performance-api";
import { ManagerReviewSheet } from "./ManagerReviewSheet";

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
        {employee && <ProbationRunnerPanel employee={employee} />}
      </SheetContent>
    </Sheet>
  );
}

/**
 * The interactive probation runner body — used by:
 *   - line managers running probation for direct reports
 *   - HODs running probation for managers on their department
 *   - tenants (HR) running probation for HODs
 * All three drive the SAME manager-side stages against the same
 * endpoints; the backend authorises based on the caller's role.
 */
export function ProbationRunnerPanel({
  employee,
}: {
  employee: NonNullable<Props["employee"]>;
}) {
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
        <OnboardingCard
          stage={onboarding}
          employeeId={employee._id}
          onSaved={invalidate}
        />
        <MonthlyCard
          stage={m1}
          prevDone={onboarding.status === "completed"}
          employeeId={employee._id}
          onSaved={invalidate}
          field="note"
          placeholder="Informal review of settling-in, early performance, any concerns."
          mutate={completeProbationMonth1}
        />
        <MonthlyCard
          stage={m2}
          prevDone={m1.status === "completed"}
          employeeId={employee._id}
          onSaved={invalidate}
          field="progressNote"
          placeholder="Formal mid-point assessment against objectives + corrective actions if any."
          mutate={completeProbationMonth2}
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
              {finalDecision.status === "completed" &&
              finalDecision.decision ? (
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
  const [objectives, setObjectives] = useState(
    stage.objectives?.objectives ?? "",
  );
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

// Month 1 & Month 2 — manager-only notes, confirmed against
// Probation_Workflow.docx (no employee input described for either
// stage). employeeSelfAssessment reference REMOVED — that field
// never existed on the real schema.
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
      mutate(
        employeeId,
        field === "note" ? { note: text } : { progressNote: text },
      ),
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

// Month 3 — REBUILT. Status/trigger card, not a data-entry form.
// Generates a real review cycle; the recommendation is AUTO-COMPUTED
// when that review completes (PerformanceReviewService.completeReview()
// -> ProbationService.recordMonth3Recommendation()) — never typed by
// hand here.
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
  const [reviewing, setReviewing] = useState<PerformanceReview | null>(null);

  const startMutation = useMutation({
    mutationFn: () => startProbationMonth3(employeeId),
    onSuccess: () => {
      toast.success(
        "Month 3 evaluation started — the employee can now self-assess.",
      );
      onSaved();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to start evaluation"),
  });

  const done = stage.status === "completed";
  const hasStarted = !!stage.linkedReviewId;

  return (
    <Card className={!prevDone ? "opacity-60" : ""}>
      <CardHeader className="pb-2">
        <StageHeader stage={stage} />
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!prevDone && <LockedNote />}

        {prevDone && !hasStarted && (
          <>
            <p className="text-xs text-muted-foreground">
              Starting this generates a real performance review — the employee
              completes a self-assessment, then you score it through the normal
              review screen, exactly like any other review. The recommendation
              for HR is prepared automatically once you complete it.
            </p>
            <Button
              size="sm"
              disabled={startMutation.isPending}
              onClick={() => startMutation.mutate()}
            >
              {startMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Start Month 3 Evaluation"
              )}
            </Button>
          </>
        )}

        {hasStarted && !done && (
          <>
            <p className="text-xs text-muted-foreground">
              The evaluation is in progress. Open it to check status or add your
              scores once the employee has submitted.
            </p>
            <Button
              size="sm"
              onClick={() => setReviewing({ _id: stage.linkedReviewId } as any)}
            >
              Open Review
            </Button>
          </>
        )}

        {done && stage.recommendation && (
          <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1">
            <p>
              <span className="font-medium">Recommendation: </span>
              <span className="capitalize">
                {stage.recommendation.suggestedOutcome}
              </span>{" "}
              (rated {stage.recommendation.basedOnRatingBand})
            </p>
            <p className="text-muted-foreground">
              {stage.recommendation.managerReasoning}
            </p>
            <p className="text-muted-foreground">
              Sent to HR {fmtDate(stage.completedAt)}
            </p>
          </div>
        )}
      </CardContent>

      <ManagerReviewSheet
        review={reviewing}
        onClose={() => setReviewing(null)}
        onCompleted={() => {
          setReviewing(null);
          onSaved();
        }}
        fetchFn={fetchReviewForReviewer}
        saveFn={updateReviewManagerSection}
        completeFn={completeReviewAsManager}
      />
    </Card>
  );
}
