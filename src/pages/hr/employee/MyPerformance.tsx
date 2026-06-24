import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Award,
  Star,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  Calendar,
  Send,
  Plus,
  Trash2,
  FileSignature,
  GraduationCap,
  ClipboardList,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchMyReviews,
  fetchMyReviewById,
  updateMyReviewSection,
  submitMyReview,
  type PerformanceReview,
  type ScoredReviewResponse,
} from "@/lib/hr-performance-api";

const STATUS_TONE: Record<string, string> = {
  employee_in_progress: "bg-info/10 text-info border-info/20",
  manager_in_progress: "bg-warning/10 text-warning border-warning/20",
  completed: "bg-success/10 text-success border-success/20",
};

const STATUS_LABEL: Record<string, string> = {
  employee_in_progress: "Your turn — self-assessment",
  manager_in_progress: "Submitted — awaiting manager",
  completed: "Completed",
};

const RATING_BAND_TONE: Record<string, string> = {
  Outstanding: "bg-success/10 text-success border-success/20",
  "Exceeds Expectations": "bg-success/10 text-success border-success/20",
  Good: "bg-info/10 text-info border-info/20",
  Satisfactory: "bg-warning/10 text-warning border-warning/20",
  "Needs Improvement": "bg-orange-500/10 text-orange-600 border-orange-500/20",
  Unsatisfactory: "bg-destructive/10 text-destructive border-destructive/20",
  "—": "bg-muted text-muted-foreground",
};

export default function MyPerformance() {
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["my-performance-reviews"],
    queryFn: fetchMyReviews,
  });

  const active = reviews.find((r) => r.status !== "completed");
  const completed = reviews.filter((r) => r.status === "completed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Performance</h1>
        <p className="text-sm text-muted-foreground">
          Complete your self-assessment honestly — your manager's scores and
          notes appear once they review it.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Stat
          label="Status"
          value={active ? STATUS_LABEL[active.status] : "—"}
          icon={Calendar}
          tone="from-primary to-secondary"
        />
        <Stat
          label="Past Reviews"
          value={completed.length}
          icon={CheckCircle2}
          tone="from-emerald-500 to-teal-500"
        />
        <Stat
          label="Open Items"
          value={reviews.filter((r) => r.status !== "completed").length}
          icon={TrendingUp}
          tone="from-amber-500 to-orange-500"
        />
      </div>

      <Tabs defaultValue="current" className="space-y-4">
        <TabsList>
          <TabsTrigger value="current">Current Review</TabsTrigger>
          <TabsTrigger value="history">Past Reviews</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-3">
          {isLoading ? (
            <LoadingBlock />
          ) : !active ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                No review cycle assigned to you right now.
              </CardContent>
            </Card>
          ) : (
            <CurrentReview reviewId={active._id} />
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {completed.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                No completed reviews yet.
              </CardContent>
            </Card>
          ) : (
            completed.map((r) => (
              <PastReviewCard key={r._id} reviewId={r._id} summary={r} />
            ))
          )}
        </TabsContent>

        <TabsContent value="policies" className="space-y-3">
          <PerformancePoliciesPanel readOnly />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Past review summary card — fetches its own scored view so the
// rating band/total shown matches the live-computed engine, same
// source of truth the manager sees, not a separately-stored value.
// ─────────────────────────────────────────────────────────────

function PastReviewCard({
  reviewId,
  summary,
}: {
  reviewId: string;
  summary: PerformanceReview;
}) {
  const { data } = useQuery({
    queryKey: ["my-performance-review", reviewId],
    queryFn: () => fetchMyReviewById(reviewId),
  });
  const scores = data?.scores;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div>
            <h3 className="font-semibold">{summary.jobTitle}</h3>
            <p className="text-xs text-muted-foreground">
              Signed off{" "}
              {summary.managerSignedAt
                ? new Date(summary.managerSignedAt).toLocaleDateString()
                : "—"}
            </p>
          </div>
          {scores?.kpiSection.totalWeightedScore != null && (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={RATING_BAND_TONE[scores.kpiSection.ratingBand] ?? ""}
              >
                {scores.kpiSection.ratingBand}
              </Badge>
              <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1.5 rounded-lg">
                <Star className="h-4 w-4 fill-white" />
                <span className="font-bold">
                  {scores.kpiSection.totalWeightedScore}
                </span>
                <span className="text-xs opacity-80">/100</span>
              </div>
            </div>
          )}
        </div>
        {summary.managerAssessmentThisPeriod && (
          <div className="text-sm mt-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              Manager assessment
            </p>
            <p className="whitespace-pre-wrap">
              {summary.managerAssessmentThisPeriod}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Current review — the actual self-assessment form
// ─────────────────────────────────────────────────────────────

function CurrentReview({ reviewId }: { reviewId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-performance-review", reviewId],
    queryFn: () => fetchMyReviewById(reviewId),
  });

  const live = data?.review;
  const scores = data?.scores;

  // ── Local editable employee-side state ──
  const [kpiScores, setKpiScores] = useState<
    Record<string, number | undefined>
  >({});
  const [competencyState, setCompetencyState] = useState<
    Record<string, { score?: number; comment?: string }>
  >({});
  const [valuesState, setValuesState] = useState<
    Record<string, { score?: number; comment?: string }>
  >({});
  const [achievements, setAchievements] = useState("");
  const [challenges, setChallenges] = useState("");
  const [previousGoals, setPreviousGoals] = useState<
    { description: string; status?: string; employeeComment?: string }[]
  >([]);
  const [trainingAreas, setTrainingAreas] = useState<string[]>([]);
  const [shortTermCareerGoals, setShortTermCareerGoals] = useState("");
  const [longTermCareerGoals, setLongTermCareerGoals] = useState("");
  const [employeeFeedbackComments, setEmployeeFeedbackComments] = useState("");
  const [openSubmitConfirm, setOpenSubmitConfirm] = useState(false);

  useEffect(() => {
    if (!live) return;
    setKpiScores(
      Object.fromEntries(
        live.kpis.map((k) => [k.key, k.employeeScore ?? undefined]),
      ),
    );
    setCompetencyState(
      Object.fromEntries(
        live.competencies.map((c) => [
          c.key,
          {
            score: c.employeeScore ?? undefined,
            comment: c.employeeComment ?? "",
          },
        ]),
      ),
    );
    setValuesState(
      Object.fromEntries(
        live.values.map((v) => [
          v.key,
          {
            score: v.employeeScore ?? undefined,
            comment: v.employeeComment ?? "",
          },
        ]),
      ),
    );
    setAchievements(live.achievements ?? "");
    setChallenges(live.challenges ?? "");
    setPreviousGoals(
      live.previousGoalsReview.map((g) => ({
        description: g.description,
        status: g.status ?? undefined,
        employeeComment: g.employeeComment ?? "",
      })),
    );
    setTrainingAreas(live.trainingNeeds.map((t) => t.area));
    setShortTermCareerGoals(live.shortTermCareerGoals ?? "");
    setLongTermCareerGoals(live.longTermCareerGoals ?? "");
    setEmployeeFeedbackComments(live.employeeFeedbackComments ?? "");
  }, [live?._id]);

  const saveMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateMyReviewSection>[1]) =>
      updateMyReviewSection(reviewId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["my-performance-review", reviewId],
      });
      toast.success("Draft saved.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to save"),
  });

  const submitMutation = useMutation({
    mutationFn: () => submitMyReview(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["my-performance-review", reviewId],
      });
      queryClient.invalidateQueries({ queryKey: ["my-performance-reviews"] });
      setOpenSubmitConfirm(false);
      toast.success("Self-review submitted — your manager has been notified.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to submit"),
  });

  if (isLoading || !live || !scores) {
    return <LoadingBlock />;
  }

  const locked = live.status !== "employee_in_progress";

  const buildPayload = () => ({
    kpiScores: Object.entries(kpiScores).map(([key, score]) => ({
      key,
      score,
    })),
    competencyScores: Object.entries(competencyState).map(([key, v]) => ({
      key,
      score: v.score,
      comment: v.comment,
    })),
    valuesScores: Object.entries(valuesState).map(([key, v]) => ({
      key,
      score: v.score,
      comment: v.comment,
    })),
    achievements,
    challenges,
    previousGoalsReview: previousGoals.map((g) => ({
      description: g.description,
      status: g.status as any,
      employeeComment: g.employeeComment,
    })),
    shortTermCareerGoals,
    longTermCareerGoals,
    trainingNeedAreas: trainingAreas.filter((a) => a.trim().length > 0),
    employeeFeedbackComments,
  });

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-semibold">{live.jobTitle}</h3>
            <p className="text-xs text-muted-foreground">
              Self-score honestly from 1 (below) to 5 (exceeds).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={STATUS_TONE[live.status]}>
              {STATUS_LABEL[live.status]}
            </Badge>
            {scores.kpiSection.totalWeightedScore != null && (
              <Badge
                variant="outline"
                className={RATING_BAND_TONE[scores.kpiSection.ratingBand] ?? ""}
              >
                {scores.kpiSection.totalWeightedScore}/100 ·{" "}
                {scores.kpiSection.ratingBand}
              </Badge>
            )}
          </div>
        </div>

        <Tabs defaultValue="info">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="kpis">KPIs</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="values">Values</TabsTrigger>
            <TabsTrigger value="self">Self-Assessment</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="dev">Development</TabsTrigger>
            <TabsTrigger value="signoff">Sign-off</TabsTrigger>
          </TabsList>

          {/* INFO — read-only */}
          <TabsContent value="info" className="space-y-3 pt-3">
            <Card>
              <CardContent className="p-4 grid sm:grid-cols-2 gap-3 text-sm">
                <Read label="Job Title" value={live.jobTitle} />
                <Read label="Department" value={live.department} />
                <Read label="Manager" value={live.managerName} />
              </CardContent>
            </Card>
            {live.complianceChecks.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" /> Compliance checks
                    (read-only)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {live.complianceChecks.map((c) => (
                    <div
                      key={c.key}
                      className="flex justify-between gap-3 border-b last:border-0 py-1"
                    >
                      <span>{c.label}</span>
                      <span className="text-muted-foreground capitalize">
                        {c.answer ?? "—"}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* KPIs */}
          <TabsContent value="kpis" className="space-y-3 pt-3">
            {scores.kpiSection.lines.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No KPIs configured for your role yet.
              </p>
            )}
            {scores.kpiSection.lines.map((line) => {
              const detail = live.kpis.find((k) => k.key === line.key);
              return (
                <Card key={line.key}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{line.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {detail?.performanceStandard}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] shrink-0 self-start"
                      >
                        Weight {(line.weight * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 items-end">
                      <div>
                        <Label className="text-xs">My self-score (1–5)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          step={0.5}
                          disabled={locked}
                          value={kpiScores[line.key] ?? ""}
                          onChange={(e) =>
                            setKpiScores((prev) => ({
                              ...prev,
                              [line.key]:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Manager score</Label>
                        <Input disabled value={line.managerScore ?? "—"} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {scores.kpiSection.lines.length > 0 && (
              <Card>
                <CardContent className="p-3 flex justify-between bg-muted/30">
                  <span className="text-sm">My total so far</span>
                  <span className="font-semibold">
                    {scores.kpiSection.employeeAverage ?? "—"} avg
                  </span>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* SKILLS / Competencies */}
          <TabsContent value="skills" className="space-y-2 pt-3">
            {scores.competencySection.lines.map((line) => {
              const detail = live.competencies.find((c) => c.key === line.key);
              return (
                <Card key={line.key}>
                  <CardContent className="p-3 space-y-2">
                    <div>
                      <p className="font-medium text-sm">{line.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {detail?.description}
                      </p>
                    </div>
                    <div className="grid sm:grid-cols-[120px_1fr] gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        step={0.5}
                        placeholder="Self /5"
                        disabled={locked}
                        value={competencyState[line.key]?.score ?? ""}
                        onChange={(e) =>
                          setCompetencyState((prev) => ({
                            ...prev,
                            [line.key]: {
                              ...prev[line.key],
                              score:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value),
                            },
                          }))
                        }
                      />
                      <Textarea
                        rows={2}
                        placeholder="My comment"
                        disabled={locked}
                        value={competencyState[line.key]?.comment ?? ""}
                        onChange={(e) =>
                          setCompetencyState((prev) => ({
                            ...prev,
                            [line.key]: {
                              ...prev[line.key],
                              comment: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    {detail?.managerObservation && (
                      <div className="rounded-md bg-muted/40 p-2 text-xs">
                        <span className="font-medium">
                          Manager ({line.managerScore ?? "—"}/5):{" "}
                        </span>
                        {detail.managerObservation}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            <Card>
              <CardContent className="p-3 flex justify-between bg-muted/30">
                <span className="text-sm">Overall competency (avg)</span>
                <span className="font-semibold">
                  {scores.competencySection.overallScore ?? "—"} / 5
                </span>
              </CardContent>
            </Card>
          </TabsContent>

          {/* VALUES */}
          <TabsContent value="values" className="space-y-2 pt-3">
            {scores.valuesSection.lines.map((line) => {
              const detail = live.values.find((v) => v.key === line.key);
              return (
                <Card key={line.key}>
                  <CardContent className="p-3 space-y-2">
                    <div>
                      <p className="font-medium text-sm">{line.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {detail?.description}
                      </p>
                    </div>
                    <div className="grid sm:grid-cols-[120px_1fr] gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        step={0.5}
                        placeholder="Self /5"
                        disabled={locked}
                        value={valuesState[line.key]?.score ?? ""}
                        onChange={(e) =>
                          setValuesState((prev) => ({
                            ...prev,
                            [line.key]: {
                              ...prev[line.key],
                              score:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value),
                            },
                          }))
                        }
                      />
                      <Textarea
                        rows={2}
                        placeholder="My comment"
                        disabled={locked}
                        value={valuesState[line.key]?.comment ?? ""}
                        onChange={(e) =>
                          setValuesState((prev) => ({
                            ...prev,
                            [line.key]: {
                              ...prev[line.key],
                              comment: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    {detail?.managerObservation && (
                      <div className="rounded-md bg-muted/40 p-2 text-xs">
                        <span className="font-medium">
                          Manager ({line.managerScore ?? "—"}/5):{" "}
                        </span>
                        {detail.managerObservation}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            <Card>
              <CardContent className="p-3 flex justify-between bg-muted/30">
                <span className="text-sm">Overall values (avg)</span>
                <span className="font-semibold">
                  {scores.valuesSection.overallScore ?? "—"} / 5
                </span>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SELF-ASSESSMENT NARRATIVE */}
          <TabsContent value="self" className="space-y-3 pt-3">
            <div>
              <Label>Key achievements & accomplishments</Label>
              <Textarea
                className="mt-1.5"
                rows={4}
                disabled={locked}
                value={achievements}
                onChange={(e) => setAchievements(e.target.value)}
                placeholder="List your key achievements and accomplishments during this review period…"
              />
            </div>
            <div>
              <Label>Challenges faced (and how you addressed them)</Label>
              <Textarea
                className="mt-1.5"
                rows={4}
                disabled={locked}
                value={challenges}
                onChange={(e) => setChallenges(e.target.value)}
                placeholder="Describe the main challenges and the steps you took…"
              />
            </div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Previous goals review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {previousGoals.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No previous goals on record.
                  </p>
                )}
                {previousGoals.map((g, i) => (
                  <div
                    key={i}
                    className="grid sm:grid-cols-[1fr_160px_1fr] gap-2 items-start"
                  >
                    <p className="text-sm pt-2">{g.description}</p>
                    <Select
                      value={g.status ?? ""}
                      onValueChange={(v) => {
                        const next = [...previousGoals];
                        next[i] = { ...g, status: v };
                        setPreviousGoals(next);
                      }}
                      disabled={locked}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="achieved">Achieved</SelectItem>
                        <SelectItem value="partially_achieved">
                          Partially Achieved
                        </SelectItem>
                        <SelectItem value="not_achieved">
                          Not Achieved
                        </SelectItem>
                        <SelectItem value="carried_forward">
                          Carried Forward
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea
                      rows={2}
                      disabled={locked}
                      value={g.employeeComment ?? ""}
                      onChange={(e) => {
                        const next = [...previousGoals];
                        next[i] = { ...g, employeeComment: e.target.value };
                        setPreviousGoals(next);
                      }}
                      placeholder="My comments"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* NEXT GOALS — read-only, set by manager */}
          <TabsContent value="goals" className="space-y-2 pt-3">
            <p className="text-xs text-muted-foreground">
              Goals for the next period are agreed with your manager and shown
              here once set.
            </p>
            {live.nextPeriodGoals.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No goals set yet.
              </p>
            ) : (
              live.nextPeriodGoals.map((g, i) => (
                <Card key={i}>
                  <CardContent className="p-3 space-y-1">
                    <div className="flex justify-between gap-2">
                      <p className="text-sm font-medium">
                        #{i + 1} · {g.description}
                      </p>
                      <Badge variant="outline" className="capitalize">
                        {g.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Timeline: {g.timeline ?? "—"}
                    </p>
                    {g.managerComments && (
                      <p className="text-xs">{g.managerComments}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* DEVELOPMENT */}
          <TabsContent value="dev" className="space-y-3 pt-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" /> Training & development
                  needs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {trainingAreas.map((area, i) => {
                  const detail = live.trainingNeeds.find(
                    (t) => t.area === area,
                  );
                  return (
                    <div
                      key={i}
                      className="grid sm:grid-cols-[1fr_auto] gap-2 items-start"
                    >
                      <Input
                        disabled={locked}
                        value={area}
                        onChange={(e) => {
                          const next = [...trainingAreas];
                          next[i] = e.target.value;
                          setTrainingAreas(next);
                        }}
                        placeholder="Training / development area"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={locked}
                        onClick={() =>
                          setTrainingAreas(
                            trainingAreas.filter((_, idx) => idx !== i),
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {detail?.managerRecommendation && (
                        <p className="sm:col-span-2 text-xs rounded-md bg-muted/40 p-2">
                          <span className="font-medium">Management: </span>
                          {detail.managerRecommendation}
                        </p>
                      )}
                    </div>
                  );
                })}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={locked}
                  onClick={() => setTrainingAreas([...trainingAreas, ""])}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add training need
                </Button>
              </CardContent>
            </Card>
            <div>
              <Label>Short-term career goals (6–12 months)</Label>
              <Textarea
                className="mt-1.5"
                rows={3}
                disabled={locked}
                value={shortTermCareerGoals}
                onChange={(e) => setShortTermCareerGoals(e.target.value)}
                placeholder="Describe the skills, experience or roles you're working towards…"
              />
            </div>
            <div>
              <Label>Long-term career goals (3–5 years)</Label>
              <Textarea
                className="mt-1.5"
                rows={3}
                disabled={locked}
                value={longTermCareerGoals}
                onChange={(e) => setLongTermCareerGoals(e.target.value)}
                placeholder="Where do you aim to be in your career?"
              />
            </div>
          </TabsContent>

          {/* SIGN-OFF */}
          <TabsContent value="signoff" className="space-y-3 pt-3">
            <div>
              <Label>My comments / feedback to management (optional)</Label>
              <Textarea
                className="mt-1.5"
                rows={4}
                disabled={locked}
                value={employeeFeedbackComments}
                onChange={(e) => setEmployeeFeedbackComments(e.target.value)}
                placeholder="Anything you'd like leadership to know…"
              />
            </div>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="text-sm">
                  <p className="font-medium flex items-center gap-2">
                    <FileSignature className="h-4 w-4" /> Submission
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Submitting locks your section — your manager is notified and
                    can begin their review.
                  </p>
                </div>
                {live.employeeSubmittedAt ? (
                  <Badge
                    variant="outline"
                    className="bg-success/10 text-success border-success/20"
                  >
                    Submitted{" "}
                    {new Date(live.employeeSubmittedAt).toLocaleDateString()}
                  </Badge>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        {!locked && (
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate(buildPayload())}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save draft"
              )}
            </Button>
            <Dialog
              open={openSubmitConfirm}
              onOpenChange={setOpenSubmitConfirm}
            >
              <DialogTrigger asChild>
                <Button
                  className="bg-gradient-to-r from-primary to-secondary"
                  onClick={() => saveMutation.mutate(buildPayload())}
                >
                  <Send className="h-4 w-4 mr-2" /> Submit self-review
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submit self-review?</DialogTitle>
                  <DialogDescription>
                    Your scores and narrative will be sent to your manager. You
                    won't be able to edit afterwards.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setOpenSubmitConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={submitMutation.isPending}
                    onClick={() => submitMutation.mutate()}
                    className="bg-gradient-to-r from-primary to-secondary"
                  >
                    {submitMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Submit"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {locked && live.status !== "completed" && (
          <p className="text-xs text-muted-foreground flex items-center gap-2 border-t pt-3">
            <Sparkles className="h-3.5 w-3.5" /> Self-review submitted — your
            manager is reviewing.
          </p>
        )}

        {live.status === "completed" && (
          <div className="rounded-lg border p-4 bg-success/5 space-y-2 mt-2">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-success" />
              <p className="font-semibold text-sm">Review finalised</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <Mini
                label="Employee avg"
                value={scores.kpiSection.employeeAverage}
              />
              <Mini
                label="Manager avg"
                value={scores.kpiSection.managerAverage}
              />
              <Mini
                label="Final"
                value={scores.kpiSection.totalWeightedScore}
                emphasis
              />
            </div>
            {live.managerConclusions && (
              <p className="text-sm whitespace-pre-wrap">
                <span className="font-medium">Conclusions: </span>
                {live.managerConclusions}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── shared bits ──

function Read({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-muted-foreground tracking-wide">
        {label}
      </p>
      <p className="mt-0.5">{value || "—"}</p>
    </div>
  );
}

function Mini({
  label,
  value,
  emphasis,
}: {
  label: string;
  value?: number | null;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-md border p-2 text-center bg-background">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-0.5 ${emphasis ? "font-bold text-base" : "text-sm"}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: any;
  icon: any;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div
          className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingBlock() {
  return (
    <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">Loading…</span>
    </div>
  );
}
