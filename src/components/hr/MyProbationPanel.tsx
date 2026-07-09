// =================================================================
// MyProbationPanel — REBUILT
// -----------------------------------------------------------------
// What an on-probation employee sees in place of the normal
// performance review tabs. Confirmed against Probation_Workflow.docx
// and the manager-side correction:
//
//   - Month 1 & Month 2: MANAGER-ONLY, no employee input. The
//     employee just sees status (pending/due/overdue/completed) and,
//     once signed off, can see the manager's note was recorded
//     (NOT its contents, by design — same boundary already used
//     elsewhere: managers see the FULL record, employees see THEIR
//     OWN side and outcomes, not the manager's private notes).
//   - Month 3: a REAL performance review. The employee's actual
//     self-assessment happens through the NORMAL review interface
//     (CurrentReview / MyPerformance.tsx's existing self-assessment
//     flow) once their manager starts it — NOT a separate text
//     field here. This panel shows STATUS and links into that real
//     flow.
//   - Final decision: read-only, same as before.
// =================================================================

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  Target,
  CalendarDays,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import { fetchMyProbation, type ProbationStage } from "@/lib/hr-probation-api";

const STAGE_LABELS: Record<string, string> = {
  month_1: "Month 1 check-in",
  month_2: "Month 2 review",
  month_3: "Month 3 evaluation",
};

const STAGE_WINDOWS: Record<string, string> = {
  month_1: "Day 25–30",
  month_2: "Day 55–60",
  month_3: "Day 80–85",
};

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString() : "—";

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
      Upcoming
    </Badge>
  );
}

export function MyProbationPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-probation"],
    queryFn: fetchMyProbation,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading your probation plan…</span>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No probation record on file.
        </CardContent>
      </Card>
    );
  }

  const { record, stages } = data;
  const onboarding = stages.find((s) => s.type === "onboarding");
  const monthly = stages.filter((s) =>
    ["month_1", "month_2", "month_3"].includes(s.type),
  );
  const finalDecision = stages.find((s) => s.type === "final_decision");
  const planIssued = onboarding?.status === "completed";

  const completed = stages.filter((s) => s.status === "completed").length;
  const pct = Math.round((completed / stages.length) * 100);

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-info/30 bg-info/10 text-info text-xs p-3">
        You're on probation — your performance is tracked through this 90-day
        plan instead of the normal review cycle. Your manager runs Month 1 and
        Month 2 check-ins directly with you; Month 3 includes a self-assessment
        you'll complete here once your manager starts it.
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Your 90-day probation
              </CardTitle>
              <CardDescription className="text-xs flex items-center gap-1.5 mt-1">
                <CalendarDays className="h-3 w-3" />
                Ends {fmtDate(record.originalProbationEndDate)}
              </CardDescription>
            </div>
            <Badge variant="outline" className="capitalize">
              {record.status.replace("_", " ")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {completed} of {stages.length} stages complete
            </span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" /> Your 90-day plan
          </CardTitle>
          <CardDescription className="text-xs">
            Set by your line manager on Day 1.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!planIssued ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> Your manager hasn't issued the plan
              yet.
            </p>
          ) : (
            <>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  Objectives
                </p>
                <p className="whitespace-pre-wrap">
                  {onboarding?.objectives?.objectives}
                </p>
              </div>
              {onboarding?.objectives?.successMeasures && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                    Success measures
                  </p>
                  <p className="whitespace-pre-wrap">
                    {onboarding.objectives.successMeasures}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {monthly
        .filter((s) => s.type !== "month_3")
        .map((s) => {
          const responseText = s.type === "month_1" ? s.note : s.progressNote;
          return (
            <Card key={s.type}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle className="text-sm">
                      {STAGE_LABELS[s.type]}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {STAGE_WINDOWS[s.type]}
                    </CardDescription>
                  </div>
                  {stageBadge(s)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {s.status === "completed" ? (
                  <>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <ClipboardList className="h-3 w-3" />
                      Your manager completed this check-in on{" "}
                      {fmtDate(s.completedAt)}.
                    </p>
                    {responseText ? (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                          {s.type === "month_1"
                            ? "Manager's note"
                            : "Manager's progress note"}
                        </p>
                        <p className="whitespace-pre-wrap">{responseText}</p>
                      </div>
                    ) : (
                      s.type === "month_1" && (
                        <p className="text-xs text-muted-foreground italic">
                          No additional note was left for this check-in.
                        </p>
                      )
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <ClipboardList className="h-3 w-3" />
                    Your manager will check in with you directly during this
                    window — no action needed from you here.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}

      {(() => {
        const m3 = monthly.find((s) => s.type === "month_3");
        if (!m3) return null;
        const started = !!m3.linkedReviewId;
        return (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="text-sm">
                    {STAGE_LABELS.month_3}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {STAGE_WINDOWS.month_3}
                  </CardDescription>
                </div>
                {stageBadge(m3)}
              </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {!started ? (
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3 w-3" /> Your manager hasn't started this
                  evaluation yet.
                </span>
              ) : m3.status === "completed" ? (
                <span>
                  Your manager has completed this evaluation — sent to HR for a
                  final decision.
                </span>
              ) : (
                <span>
                  Your manager has started this evaluation — find it under
                  "Current Review" to complete your self-assessment.
                </span>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {finalDecision && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Final decision</CardTitle>
            <CardDescription className="text-xs">
              Recorded by HR after your Month 3 evaluation.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {finalDecision.status === "completed" && finalDecision.decision ? (
              <p>
                Outcome:{" "}
                <span className="capitalize font-medium">
                  {finalDecision.decision.outcome}
                </span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Lock className="h-3 w-3" /> Awaiting HR sign-off.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
