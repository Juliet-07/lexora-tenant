import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Loader2,
  Save,
  CheckCircle2,
  Plus,
  Trash2,
  FileSignature,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchReviewById,
  updateManagerReviewSection,
  completeReview,
  fetchReviewForReviewer,
  type PerformanceReview,
  ScoredReviewResponse,
} from "@/lib/hr/hr-performance-api";

const RATING_BAND_TONE: Record<string, string> = {
  Outstanding: "bg-success/10 text-success border-success/20",
  "Exceeds Expectations": "bg-success/10 text-success border-success/20",
  Good: "bg-info/10 text-info border-info/20",
  Satisfactory: "bg-warning/10 text-warning border-warning/20",
  "Needs Improvement": "bg-orange-500/10 text-orange-600 border-orange-500/20",
  Unsatisfactory: "bg-destructive/10 text-destructive border-destructive/20",
  "—": "bg-muted text-muted-foreground",
};

interface Props {
  review: PerformanceReview | null;
  onClose: () => void;
  onCompleted: () => void;
  fetchFn?: (reviewId: string) => Promise<ScoredReviewResponse>;
  saveFn?: (
    reviewId: string,
    dto: Parameters<typeof updateManagerReviewSection>[1],
  ) => Promise<PerformanceReview>;
  /** Override the complete endpoint. Receives optional probation reasoning. */
  completeFn?: (
    reviewId: string,
    probationRecommendationReasoning?: string,
  ) => Promise<PerformanceReview>;
}

export function ManagerReviewSheet({
  review,
  onClose,
  onCompleted,
  fetchFn,
  saveFn,
  completeFn,
}: Props) {
  const queryClient = useQueryClient();
  const reviewId = review?._id;

  const { data, isLoading } = useQuery({
    queryKey: ["performance-review", reviewId],
    queryFn: () => (fetchFn ?? fetchReviewById)(reviewId!),
    enabled: !!reviewId,
  });

  const live = data?.review;
  const scores = data?.scores;

  // ── Local editable manager-side state — synced from fetched data ──
  const [kpiManagerScores, setKpiManagerScores] = useState<
    Record<string, number | undefined>
  >({});
  const [competencyManager, setCompetencyManager] = useState<
    Record<string, { score?: number; observation?: string }>
  >({});
  const [valuesManager, setValuesManager] = useState<
    Record<string, { score?: number; observation?: string }>
  >({});
  const [complianceAnswers, setComplianceAnswers] = useState<
    Record<string, { answer?: "yes" | "no"; notes?: string }>
  >({});
  const [nextGoals, setNextGoals] = useState<
    {
      description: string;
      priority: "high" | "medium" | "low";
      timeline: string;
      managerComments: string;
    }[]
  >([]);
  const [trainingNeeds, setTrainingNeeds] = useState<
    {
      area: string;
      priority: "high" | "medium" | "low";
      managerRecommendation: string;
    }[]
  >([]);
  const [managerSummaryLastPeriod, setManagerSummaryLastPeriod] = useState("");
  const [managerAssessmentThisPeriod, setManagerAssessmentThisPeriod] =
    useState("");
  const [managerDevelopmentAreas, setManagerDevelopmentAreas] = useState("");
  const [managerConclusions, setManagerConclusions] = useState("");
  const [probationReasoning, setProbationReasoning] = useState("");

  useEffect(() => {
    if (!live) return;
    setKpiManagerScores(
      Object.fromEntries(
        live.kpis.map((k) => [k.key, k.managerScore ?? undefined]),
      ),
    );
    setCompetencyManager(
      Object.fromEntries(
        live.competencies.map((c) => [
          c.key,
          {
            score: c.managerScore ?? undefined,
            observation: c.managerObservation ?? "",
          },
        ]),
      ),
    );
    setValuesManager(
      Object.fromEntries(
        live.values.map((v) => [
          v.key,
          {
            score: v.managerScore ?? undefined,
            observation: v.managerObservation ?? "",
          },
        ]),
      ),
    );
    setComplianceAnswers(
      Object.fromEntries(
        live.complianceChecks.map((c) => [
          c.key,
          { answer: c.answer ?? undefined, notes: c.notes ?? "" },
        ]),
      ),
    );
    setNextGoals(
      live.nextPeriodGoals.length > 0
        ? live.nextPeriodGoals.map((g) => ({
            description: g.description,
            priority: g.priority,
            timeline: g.timeline ?? "",
            managerComments: g.managerComments ?? "",
          }))
        : [],
    );
    setTrainingNeeds(
      live.trainingNeeds.map((t) => ({
        area: t.area,
        priority: t.priority,
        managerRecommendation: t.managerRecommendation ?? "",
      })),
    );
    setManagerSummaryLastPeriod(live.managerSummaryLastPeriod ?? "");
    setManagerAssessmentThisPeriod(live.managerAssessmentThisPeriod ?? "");
    setManagerDevelopmentAreas(live.managerDevelopmentAreas ?? "");
    setManagerConclusions(live.managerConclusions ?? "");
  }, [live?._id]);

  const saveMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateManagerReviewSection>[1]) =>
      (saveFn ?? updateManagerReviewSection)(reviewId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["performance-review", reviewId],
      });
      toast.success("Saved.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to save"),
  });

  const isProbation = live?.employeeEmploymentStatus === "probation";

  const completeMutation = useMutation({
    mutationFn: () =>
      completeFn
        ? completeFn(reviewId!, isProbation ? probationReasoning : undefined)
        : completeReview(reviewId!),
    onSuccess: () => {
      toast.success("Review signed off and completed.");
      onCompleted();
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to complete review"),
  });

  if (!review) return null;

  const locked = live?.status !== "manager_in_progress";
  const notReady = live?.status === "employee_in_progress";

  const buildSavePayload = () => ({
    kpiScores: Object.entries(kpiManagerScores).map(([key, score]) => ({
      key,
      score,
    })),
    competencyScores: Object.entries(competencyManager).map(([key, v]) => ({
      key,
      score: v.score,
      comment: v.observation,
    })),
    valuesScores: Object.entries(valuesManager).map(([key, v]) => ({
      key,
      score: v.score,
      comment: v.observation,
    })),
    complianceChecks: Object.entries(complianceAnswers).map(([key, v]) => ({
      key,
      answer: v.answer,
      notes: v.notes,
    })),
    nextPeriodGoals: nextGoals,
    trainingNeeds,
    managerSummaryLastPeriod,
    managerAssessmentThisPeriod,
    managerDevelopmentAreas,
    managerConclusions,
  });

  return (
    <Sheet open={!!review} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        {isLoading || !live || !scores ? (
          <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading review…</span>
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{live.employeeName}</SheetTitle>
              <p className="text-xs text-muted-foreground">{live.jobTitle}</p>
              <div className="flex flex-wrap gap-2 mt-1">
                <Badge variant="outline">{statusLabel(live.status)}</Badge>
                {scores.kpiSection.totalWeightedScore != null && (
                  <Badge
                    variant="outline"
                    className={
                      RATING_BAND_TONE[scores.kpiSection.ratingBand] ?? ""
                    }
                  >
                    {scores.kpiSection.totalWeightedScore}/100 ·{" "}
                    {scores.kpiSection.ratingBand}
                  </Badge>
                )}
              </div>
            </SheetHeader>

            {notReady && (
              <div className="mt-4 text-xs bg-warning/10 border border-warning/20 text-warning rounded-md p-3 flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                The employee hasn't submitted their self-assessment yet. You can
                view this review but can't add manager input until they submit.
              </div>
            )}

            <Tabs defaultValue="kpis" className="mt-5">
              <TabsList className="flex flex-wrap h-auto">
                <TabsTrigger value="kpis">KPIs</TabsTrigger>
                <TabsTrigger value="competencies">Competencies</TabsTrigger>
                <TabsTrigger value="values">Values</TabsTrigger>
                <TabsTrigger value="narrative">Self-Assessment</TabsTrigger>
                <TabsTrigger value="goals">Goals & Training</TabsTrigger>
                <TabsTrigger value="evaluation">Manager Evaluation</TabsTrigger>
                <TabsTrigger value="signoff">Sign-off</TabsTrigger>
              </TabsList>

              {/* ── KPIs ── */}
              <TabsContent value="kpis" className="space-y-3 pt-3">
                {scores.kpiSection.lines.map((line) => {
                  const kpiDetail = live.kpis.find((k) => k.key === line.key);
                  return (
                    <Card key={line.key}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm">{line.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {kpiDetail?.performanceStandard}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[10px] shrink-0"
                          >
                            Weight {(line.weight * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-2 items-end">
                          <div>
                            <Label className="text-xs">Employee</Label>
                            <Input disabled value={line.employeeScore ?? "—"} />
                          </div>
                          <div>
                            <Label className="text-xs">Manager (1–5)</Label>
                            <Input
                              type="number"
                              min={1}
                              max={5}
                              step={0.5}
                              disabled={locked}
                              value={kpiManagerScores[line.key] ?? ""}
                              onChange={(e) =>
                                setKpiManagerScores((prev) => ({
                                  ...prev,
                                  [line.key]:
                                    e.target.value === ""
                                      ? undefined
                                      : Number(e.target.value),
                                }))
                              }
                            />
                          </div>
                          <div className="rounded-md bg-muted/40 p-2 text-center">
                            <p className="text-[10px] uppercase text-muted-foreground">
                              Combined
                            </p>
                            <p className="font-semibold text-sm">
                              {line.combinedAverage ?? "—"}
                            </p>
                          </div>
                          <div className="rounded-md bg-muted/40 p-2 text-center">
                            <p className="text-[10px] uppercase text-muted-foreground">
                              Weighted
                            </p>
                            <p className="font-semibold text-sm">
                              {line.weightedScore ?? "—"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                <Card>
                  <CardContent className="p-3 flex justify-between items-center bg-muted/30">
                    <span className="text-sm">
                      Total — Employee{" "}
                      {scores.kpiSection.employeeAverage ?? "—"} · Manager{" "}
                      {scores.kpiSection.managerAverage ?? "—"}
                    </span>
                    <span className="font-bold">
                      {scores.kpiSection.totalWeightedScore ?? "—"} / 100
                    </span>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Competencies ── */}
              <TabsContent value="competencies" className="space-y-3 pt-3">
                {scores.competencySection.lines.map((line) => {
                  const detail = live.competencies.find(
                    (c) => c.key === line.key,
                  );
                  return (
                    <Card
                      key={line.key}
                      className={
                        line.divergent ? "border-warning/50" : undefined
                      }
                    >
                      <CardContent className="p-3 space-y-2">
                        <div>
                          <p className="font-medium text-sm">{line.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {detail?.description}
                          </p>
                        </div>
                        {detail?.employeeComment && (
                          <p className="text-xs bg-muted/30 rounded p-2">
                            <span className="font-medium">Employee: </span>
                            {detail.employeeComment}
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            disabled
                            value={line.employeeScore ?? "—"}
                            placeholder="Employee score"
                          />
                          <Input
                            type="number"
                            min={1}
                            max={5}
                            step={0.5}
                            disabled={locked}
                            placeholder="Manager score"
                            value={competencyManager[line.key]?.score ?? ""}
                            onChange={(e) =>
                              setCompetencyManager((prev) => ({
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
                        </div>
                        <Textarea
                          rows={2}
                          disabled={locked}
                          placeholder="Manager observation"
                          value={competencyManager[line.key]?.observation ?? ""}
                          onChange={(e) =>
                            setCompetencyManager((prev) => ({
                              ...prev,
                              [line.key]: {
                                ...prev[line.key],
                                observation: e.target.value,
                              },
                            }))
                          }
                        />
                        {line.divergent && (
                          <p className="text-xs text-warning">
                            ⚠ Scores differ by 2+ points.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                <Card>
                  <CardContent className="p-3 flex justify-between bg-muted/30">
                    <span className="text-sm">Overall competency score</span>
                    <span className="font-semibold">
                      {scores.competencySection.overallScore ?? "—"} / 5 ·{" "}
                      {scores.competencySection.ratingBand}
                    </span>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Values ── */}
              <TabsContent value="values" className="space-y-3 pt-3">
                {scores.valuesSection.lines.map((line) => {
                  const detail = live.values.find((v) => v.key === line.key);
                  return (
                    <Card
                      key={line.key}
                      className={
                        line.divergent ? "border-warning/50" : undefined
                      }
                    >
                      <CardContent className="p-3 space-y-2">
                        <div>
                          <p className="font-medium text-sm">{line.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {detail?.description}
                          </p>
                        </div>
                        {detail?.employeeComment && (
                          <p className="text-xs bg-muted/30 rounded p-2">
                            <span className="font-medium">Employee: </span>
                            {detail.employeeComment}
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            disabled
                            value={line.employeeScore ?? "—"}
                            placeholder="Employee score"
                          />
                          <Input
                            type="number"
                            min={1}
                            max={5}
                            step={0.5}
                            disabled={locked}
                            placeholder="Manager score"
                            value={valuesManager[line.key]?.score ?? ""}
                            onChange={(e) =>
                              setValuesManager((prev) => ({
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
                        </div>
                        <Textarea
                          rows={2}
                          disabled={locked}
                          placeholder="Manager observation"
                          value={valuesManager[line.key]?.observation ?? ""}
                          onChange={(e) =>
                            setValuesManager((prev) => ({
                              ...prev,
                              [line.key]: {
                                ...prev[line.key],
                                observation: e.target.value,
                              },
                            }))
                          }
                        />
                        {line.divergent && (
                          <p className="text-xs text-warning">
                            ⚠ Scores differ by 2+ points.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                <Card>
                  <CardContent className="p-3 flex justify-between bg-muted/30">
                    <span className="text-sm">Overall values score</span>
                    <span className="font-semibold">
                      {scores.valuesSection.overallScore ?? "—"} / 5 ·{" "}
                      {scores.valuesSection.ratingBand}
                    </span>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Self-Assessment narrative (read-only, employee's words) ── */}
              <TabsContent value="narrative" className="space-y-3 pt-3">
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Key achievements
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {live.achievements || (
                        <span className="text-muted-foreground italic">
                          Not provided
                        </span>
                      )}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Challenges faced
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {live.challenges || (
                        <span className="text-muted-foreground italic">
                          Not provided
                        </span>
                      )}
                    </p>
                  </CardContent>
                </Card>
                {live.previousGoalsReview.length > 0 && (
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Previous goals review
                      </p>
                      {live.previousGoalsReview.map((g, i) => (
                        <div
                          key={i}
                          className="border rounded-md p-2 text-sm space-y-1"
                        >
                          <p className="font-medium">{g.description}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {g.status?.replace("_", " ") ?? "—"}
                          </p>
                          {g.employeeComment && (
                            <p className="text-xs">
                              Employee: {g.employeeComment}
                            </p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                <Card>
                  <CardContent className="p-4 space-y-2 text-sm">
                    <Row
                      label="Short-term career goals"
                      value={live.shortTermCareerGoals}
                    />
                    <Row
                      label="Long-term career goals"
                      value={live.longTermCareerGoals}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 px-4 pt-2">
                      <ClipboardList className="h-3.5 w-3.5" /> Compliance
                      checklist
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {live.complianceChecks.map((c) => (
                      <div
                        key={c.key}
                        className="grid grid-cols-[1fr_120px_1fr] gap-2 items-center"
                      >
                        <p className="text-sm">{c.label}</p>
                        <Select
                          value={complianceAnswers[c.key]?.answer ?? ""}
                          onValueChange={(v: "yes" | "no") =>
                            setComplianceAnswers((prev) => ({
                              ...prev,
                              [c.key]: { ...prev[c.key], answer: v },
                            }))
                          }
                          disabled={locked}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Notes"
                          disabled={locked}
                          value={complianceAnswers[c.key]?.notes ?? ""}
                          onChange={(e) =>
                            setComplianceAnswers((prev) => ({
                              ...prev,
                              [c.key]: {
                                ...prev[c.key],
                                notes: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Goals & Training ── */}
              <TabsContent value="goals" className="space-y-3 pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Goals for next period
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={locked}
                    onClick={() =>
                      setNextGoals((prev) => [
                        ...prev,
                        {
                          description: "",
                          priority: "medium",
                          timeline: "",
                          managerComments: "",
                        },
                      ])
                    }
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Goal
                  </Button>
                </div>
                {nextGoals.map((g, i) => (
                  <Card key={i}>
                    <CardContent className="p-3 grid sm:grid-cols-[1fr_120px_140px_1fr_auto] gap-2 items-start">
                      <Textarea
                        rows={2}
                        disabled={locked}
                        value={g.description}
                        onChange={(e) => {
                          const next = [...nextGoals];
                          next[i] = { ...g, description: e.target.value };
                          setNextGoals(next);
                        }}
                        placeholder="Goal description"
                      />
                      <Select
                        value={g.priority}
                        onValueChange={(v: any) => {
                          const next = [...nextGoals];
                          next[i] = { ...g, priority: v };
                          setNextGoals(next);
                        }}
                        disabled={locked}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        disabled={locked}
                        value={g.timeline}
                        onChange={(e) => {
                          const next = [...nextGoals];
                          next[i] = { ...g, timeline: e.target.value };
                          setNextGoals(next);
                        }}
                        placeholder="Timeline"
                      />
                      <Textarea
                        rows={2}
                        disabled={locked}
                        value={g.managerComments}
                        onChange={(e) => {
                          const next = [...nextGoals];
                          next[i] = { ...g, managerComments: e.target.value };
                          setNextGoals(next);
                        }}
                        placeholder="Manager comments"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={locked}
                        onClick={() =>
                          setNextGoals(nextGoals.filter((_, idx) => idx !== i))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}

                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground pt-2">
                  Training & development needs
                </p>
                {trainingNeeds.map((t, i) => (
                  <Card key={i}>
                    <CardContent className="p-3 grid sm:grid-cols-[1fr_120px_1fr] gap-2 items-start">
                      <p className="text-sm pt-2">{t.area}</p>
                      <Select
                        value={t.priority}
                        onValueChange={(v: any) => {
                          const next = [...trainingNeeds];
                          next[i] = { ...t, priority: v };
                          setTrainingNeeds(next);
                        }}
                        disabled={locked}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                      <Textarea
                        rows={2}
                        disabled={locked}
                        value={t.managerRecommendation}
                        onChange={(e) => {
                          const next = [...trainingNeeds];
                          next[i] = {
                            ...t,
                            managerRecommendation: e.target.value,
                          };
                          setTrainingNeeds(next);
                        }}
                        placeholder="Management recommendation"
                      />
                    </CardContent>
                  </Card>
                ))}
                {trainingNeeds.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No training needs proposed by employee.
                  </p>
                )}
              </TabsContent>

              {/* ── Manager Evaluation ── */}
              <TabsContent value="evaluation" className="space-y-3 pt-3">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <Block label="Performance summary — last period">
                      <Textarea
                        rows={3}
                        disabled={locked}
                        value={managerSummaryLastPeriod}
                        onChange={(e) =>
                          setManagerSummaryLastPeriod(e.target.value)
                        }
                      />
                    </Block>
                    <Block label="Performance assessment — this period">
                      <Textarea
                        rows={4}
                        disabled={locked}
                        value={managerAssessmentThisPeriod}
                        onChange={(e) =>
                          setManagerAssessmentThisPeriod(e.target.value)
                        }
                      />
                    </Block>
                    <Block label="Key development areas & observations">
                      <Textarea
                        rows={3}
                        disabled={locked}
                        value={managerDevelopmentAreas}
                        onChange={(e) =>
                          setManagerDevelopmentAreas(e.target.value)
                        }
                      />
                    </Block>
                    <Block label="Review conclusions & management recommendations">
                      <Textarea
                        rows={3}
                        disabled={locked}
                        value={managerConclusions}
                        onChange={(e) => setManagerConclusions(e.target.value)}
                      />
                    </Block>
                  </CardContent>
                </Card>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    disabled={locked || saveMutation.isPending}
                    onClick={() => saveMutation.mutate(buildSavePayload())}
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" /> Save All Sections
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              {/* ── Sign-off ── */}
              <TabsContent value="signoff" className="space-y-3 pt-3">
                <Card>
                  <CardContent className="p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Final KPI score</span>
                      <span className="font-bold">
                        {scores.kpiSection.totalWeightedScore ?? "—"} / 100
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rating</span>
                      <Badge
                        variant="outline"
                        className={
                          RATING_BAND_TONE[scores.kpiSection.ratingBand] ?? ""
                        }
                      >
                        {scores.kpiSection.ratingBand}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                {live.employeeFeedbackComments && (
                  <Card>
                    <CardContent className="p-4 space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Employee feedback to management
                      </p>
                      <p className="text-sm whitespace-pre-wrap">
                        {live.employeeFeedbackComments}
                      </p>
                    </CardContent>
                  </Card>
                )}
                <Card>
                  <CardContent className="p-4 space-y-2 text-sm">
                    <p className="font-medium flex items-center gap-2">
                      <FileSignature className="h-4 w-4" /> Sign-off
                    </p>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div className="border rounded-md p-3">
                        <p className="text-xs uppercase text-muted-foreground">
                          Employee
                        </p>
                        {live.employeeSubmittedAt ? (
                          <p className="text-sm mt-1">
                            Submitted{" "}
                            {new Date(
                              live.employeeSubmittedAt,
                            ).toLocaleString()}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-1">
                            Not yet submitted
                          </p>
                        )}
                      </div>
                      <div className="border rounded-md p-3">
                        <p className="text-xs uppercase text-muted-foreground">
                          Manager
                        </p>
                        {live.managerSignedAt ? (
                          <p className="text-sm mt-1">
                            Signed{" "}
                            {new Date(live.managerSignedAt).toLocaleString()}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-1">
                            Not yet signed
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {isProbation && (
                  <Card className="border-warning/40 bg-warning/5">
                    <CardContent className="p-4 space-y-2">
                      <p className="text-sm font-medium flex items-center gap-2 text-warning">
                        <AlertTriangle className="h-4 w-4" /> Probation
                        evaluation
                      </p>
                      <p className="text-xs text-muted-foreground">
                        This employee is currently on probation
                        {live.probationEndDate
                          ? ` (ends ${new Date(live.probationEndDate).toLocaleDateString()})`
                          : ""}
                        . A written recommendation with reasoning is required
                        before you can sign off — HR will use it to confirm,
                        extend, or end probation.
                      </p>
                      <Textarea
                        rows={4}
                        disabled={locked}
                        value={probationReasoning}
                        onChange={(e) => setProbationReasoning(e.target.value)}
                        placeholder="Your recommendation (confirm / extend / end) and reasoning…"
                      />
                    </CardContent>
                  </Card>
                )}
                {live.status === "manager_in_progress" && (
                  <div className="flex justify-end">
                    <Button
                      className="bg-gradient-to-r from-primary to-secondary"
                      disabled={
                        completeMutation.isPending ||
                        (isProbation && probationReasoning.trim().length === 0)
                      }
                      onClick={() => completeMutation.mutate()}
                    >
                      {completeMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Sign Off & Complete Review
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function statusLabel(status: string): string {
  if (status === "employee_in_progress") return "Awaiting employee";
  if (status === "manager_in_progress") return "Awaiting manager";
  return "Completed";
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm whitespace-pre-wrap mt-1">
        {value || (
          <span className="text-muted-foreground italic">Not provided</span>
        )}
      </p>
    </div>
  );
}

function Block({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
        {label}
      </p>
      {children}
    </div>
  );
}
