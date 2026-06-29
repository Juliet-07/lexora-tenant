// =================================================================
// MyProbationPanel
// -----------------------------------------------------------------
// What an on-probation employee sees in place of the normal
// performance review. They cannot self-score the cycle KPIs — the
// only things they do during probation are:
//
//   1. READ their 90-day objectives + success measures.
//   2. Submit a self-assessment at Month 1, Month 2, Month 3.
//      Each monthly self-assessment is gated until the manager
//      has issued the plan (Onboarding completed) and unlocks at
//      the relevant due window.
//
// The final decision sits with HR; the employee just sees the
// outcome once recorded.
// =================================================================

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchMyProbation,
  submitMyProbationSelfAssessment,
  type ProbationStage,
} from "@/lib/hr-probation-api";

const STAGE_LABELS: Record<string, string> = {
  month_1: "Month 1 self-assessment",
  month_2: "Month 2 self-assessment",
  month_3: "Month 3 final self-assessment",
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
        <CheckCircle2 className="h-3 w-3 mr-1" /> Manager signed off
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
      {/* Banner: regular performance review is paused while on probation */}
      <div className="rounded-md border border-info/30 bg-info/10 text-info text-xs p-3">
        You're on probation — the regular performance review is paused. Focus
        on your 90-day plan below and submit a self-assessment at each
        check-in.
      </div>

      {/* Header card */}
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

      {/* Onboarding plan — read-only, set by manager */}
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

      {/* Monthly self-assessments */}
      {monthly.map((s, idx) => {
        const prevDone =
          idx === 0 ? planIssued : monthly[idx - 1].isDue || monthly[idx - 1].status === "completed" || !!monthly[idx - 1].employeeSelfAssessment;
        const unlocked = planIssued && (s.isDue || s.isOverdue || s.status === "completed");
        return (
          <MonthlySelfAssessmentCard
            key={s.type}
            stage={s}
            unlocked={unlocked && prevDone}
          />
        );
      })}

      {/* Final decision visibility */}
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

function MonthlySelfAssessmentCard({
  stage,
  unlocked,
}: {
  stage: ProbationStage;
  unlocked: boolean;
}) {
  const queryClient = useQueryClient();
  const initial = stage.employeeSelfAssessment ?? "";
  const [text, setText] = useState(initial);
  useEffect(() => setText(initial), [initial]);

  const mut = useMutation({
    mutationFn: () =>
      submitMyProbationSelfAssessment(
        stage.type as "month_1" | "month_2" | "month_3",
        { text },
      ),
    onSuccess: () => {
      toast.success("Self-assessment submitted.");
      queryClient.invalidateQueries({ queryKey: ["my-probation"] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to submit"),
  });

  const submitted = !!stage.employeeSelfAssessment;
  const managerDone = stage.status === "completed";

  return (
    <Card className={!unlocked ? "opacity-60" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-sm">{STAGE_LABELS[stage.type]}</CardTitle>
            <CardDescription className="text-xs">
              {STAGE_WINDOWS[stage.type]}
            </CardDescription>
          </div>
          {stageBadge(stage)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!unlocked && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Lock className="h-3 w-3" /> Opens when this check-in is due.
          </p>
        )}
        <div className="space-y-1">
          <Label className="text-xs">Your self-assessment</Label>
          <Textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="How you've progressed against the objectives this month."
            disabled={!unlocked || managerDone}
          />
        </div>
        {unlocked && !managerDone && (
          <Button
            size="sm"
            disabled={!text.trim() || mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : submitted ? (
              "Update self-assessment"
            ) : (
              "Submit self-assessment"
            )}
          </Button>
        )}
        {managerDone && stage.completedAt && (
          <p className="text-xs text-muted-foreground">
            Manager signed off {fmtDate(stage.completedAt)}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
