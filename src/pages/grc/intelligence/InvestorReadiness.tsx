import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Gauge,
  Plus,
  Target,
  Pencil,
  RefreshCw,
  CircleAlert,
  CircleCheck,
  Download,
  Layers,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchAssessments,
  createAssessment,
  updateReadinessThreshold,
  setDimensionOverride,
  clearDimensionOverride,
  recomputeAutoScores,
  addReadinessGap,
  setGapStatus,
  deleteGap,
  setReportSection,
  updateReadinessNotes,
  downloadReadinessReport,
  effectiveScore,
  READINESS_DIMENSIONS,
  DIMENSION_SOURCE,
  DIMENSION_COMPUTE_MODE,
  REPORT_SECTIONS,
  type ReadinessAssessment,
  type ReadinessDimension,
  type ReadinessGap,
  type GapPriority,
  type GapStatus,
  type ReportSectionState,
} from "@/lib/grc/intelligence-api";

const PRIORITY_TONE: Record<GapPriority, string> = {
  P1: "text-rose-600 border-rose-500/40 bg-rose-500/10",
  P2: "text-amber-600 border-amber-500/40 bg-amber-500/10",
  P3: "text-sky-600 border-sky-500/40 bg-sky-500/10",
};
const PRIORITY_LABEL: Record<GapPriority, string> = {
  P1: "P1 · Deal blocker",
  P2: "P2 · High",
  P3: "P3 · Medium",
};

export default function InvestorReadiness() {
  const queryClient = useQueryClient();
  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ["readiness"],
    queryFn: fetchAssessments,
  });
  const [selId, setSelId] = useState<string>("");
  const [newOpen, setNewOpen] = useState(false);

  const createMut = useMutation({
    mutationFn: (advisor?: string) => createAssessment(advisor),
    onSuccess: (a) => {
      queryClient.invalidateQueries({ queryKey: ["readiness"] });
      setSelId(a._id);
      toast({
        title: "Assessment initiated",
        description: "Auto-scored dimensions pulled from connected modules.",
      });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to create assessment",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  if (isLoading) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading assessments…
      </div>
    );
  }

  const current =
    assessments.find((a) => a._id === selId) ??
    assessments[assessments.length - 1];

  if (!current) {
    return (
      <div className="space-y-6">
        <Header onNew={() => setNewOpen(true)} />
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            No assessment yet — initiate one to pull scores from the connected
            modules.
          </CardContent>
        </Card>
        <NewAssessmentDialog
          open={newOpen}
          onOpenChange={setNewOpen}
          onCreate={(advisor) => createMut.mutate(advisor)}
          pending={createMut.isPending}
        />
      </div>
    );
  }

  return (
    <ReadinessWorkspace
      key={current._id}
      current={current}
      versions={assessments}
      onSwitch={setSelId}
      onNew={() => setNewOpen(true)}
      newOpen={newOpen}
      setNewOpen={setNewOpen}
      onCreate={(advisor) => createMut.mutate(advisor)}
      creating={createMut.isPending}
    />
  );
}

function ReadinessWorkspace({
  current,
  versions,
  onSwitch,
  onNew,
  newOpen,
  setNewOpen,
  onCreate,
  creating,
}: {
  current: ReadinessAssessment;
  versions: ReadinessAssessment[];
  onSwitch: (id: string) => void;
  onNew: () => void;
  newOpen: boolean;
  setNewOpen: (o: boolean) => void;
  onCreate: (advisor?: string) => void;
  creating: boolean;
}) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["readiness"] });
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const [gapOpen, setGapOpen] = useState(false);
  const [override, setOverride] = useState<{
    dim: ReadinessDimension;
    value: string;
    reason: string;
  } | null>(null);
  const [notes, setNotes] = useState(current.notes ?? "");

  const thresholdMut = useMutation({
    mutationFn: (t: number) => updateReadinessThreshold(current._id, t),
    onSuccess: invalidate,
  });
  const overrideMut = useMutation({
    mutationFn: () =>
      setDimensionOverride(
        current._id,
        override!.dim,
        Number(override!.value),
        override!.reason,
      ),
    onSuccess: () => {
      invalidate();
      setOverride(null);
      toast({ title: "Manual override recorded" });
    },
    onError: onErr("Failed to save override"),
  });
  const clearOverrideMut = useMutation({
    mutationFn: (dim: ReadinessDimension) =>
      clearDimensionOverride(current._id, dim),
    onSuccess: () => {
      invalidate();
      toast({ title: "Override cleared — back to auto-score" });
    },
    onError: onErr("Cannot clear override"),
  });
  const recomputeMut = useMutation({
    mutationFn: () => recomputeAutoScores(current._id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Auto-scores refreshed against live data" });
    },
  });
  const addGapMut = useMutation({
    mutationFn: (dto: any) => addReadinessGap(current._id, dto),
    onSuccess: () => {
      invalidate();
      toast({ title: "Gap added" });
    },
    onError: onErr("Failed to add gap"),
  });
  const gapStatusMut = useMutation({
    mutationFn: ({ gapId, status }: { gapId: string; status: GapStatus }) =>
      setGapStatus(current._id, gapId, status),
    onSuccess: invalidate,
  });
  const deleteGapMut = useMutation({
    mutationFn: (gapId: string) => deleteGap(current._id, gapId),
    onSuccess: invalidate,
  });
  const sectionMut = useMutation({
    mutationFn: ({
      name,
      state,
    }: {
      name: string;
      state: ReportSectionState;
    }) => setReportSection(current._id, name, state),
    onSuccess: invalidate,
  });
  const notesMut = useMutation({
    mutationFn: (n: string) => updateReadinessNotes(current._id, n),
    onSuccess: () => toast({ title: "Notes saved" }),
  });

  const score = current.overallScore;
  const band = current.band;
  const previous =
    versions[versions.findIndex((v) => v._id === current._id) - 1];
  const prevScore = previous?.overallScore ?? null;
  const belowThreshold = current.scores.filter(
    (d) => effectiveScore(d) < current.threshold,
  );

  const saveOverride = () => {
    if (!override) return;
    const v = Number(override.value);
    if (Number.isNaN(v) || v < 0 || v > 100) {
      toast({
        title: "Score must be between 0 and 100",
        variant: "destructive",
      });
      return;
    }
    if (!override.reason.trim()) {
      toast({
        title: "A documented reason is required",
        variant: "destructive",
      });
      return;
    }
    overrideMut.mutate();
  };

  const cycleSection = (name: string, current_: ReportSectionState) => {
    const next: ReportSectionState =
      current_ === "Incomplete"
        ? "Review"
        : current_ === "Review"
          ? "Auto"
          : "Incomplete";
    sectionMut.mutate({ name, state: next });
  };

  return (
    <div className="space-y-6">
      <Header onNew={onNew} />

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-medium">{current.company}</p>
        {versions.length > 1 && (
          <Select value={current._id} onValueChange={onSwitch}>
            <SelectTrigger className="w-40 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v._id} value={v._id}>
                  v{v.version} · {v.createdAt.slice(0, 10)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Badge variant="outline">
          Version {current.version} · {current.createdAt.slice(0, 10)}
        </Badge>
        <Badge variant="outline">Advisor: {current.advisor || "—"}</Badge>
      </div>

      {/* Dashboard */}
      <div className="grid gap-3 lg:grid-cols-4">
        <Card className="lg:col-span-1 overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <ScoreRing value={score} />
            <div>
              <p className="text-xs text-muted-foreground">Overall readiness</p>
              <Badge variant="outline" className={`mt-1 ${band.tone}`}>
                {band.label}
              </Badge>
              {prevScore !== null && (
                <p className="text-xs mt-2 text-muted-foreground">
                  {score >= prevScore ? "▲" : "▼"} {Math.abs(score - prevScore)}{" "}
                  pts vs v{previous.version}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Stat
          label="Open gaps"
          value={current.gapsOpen}
          icon={CircleAlert}
          tone="from-rose-500 to-red-500"
        />
        <Stat
          label="Gaps closed"
          value={`${current.gapsClosed}/${current.gaps.length}`}
          icon={CircleCheck}
          tone="from-emerald-500 to-teal-500"
        />
        <Stat
          label="Projected ready"
          value={current.projectedReadyDate}
          icon={Target}
          tone="from-violet-500 to-indigo-500"
        />
      </div>

      <Tabs defaultValue="scoring">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="scoring">Dimension scoring</TabsTrigger>
          <TabsTrigger value="gaps">Gap analysis</TabsTrigger>
          <TabsTrigger value="remediation">Remediation tracker</TabsTrigger>
          <TabsTrigger value="report">Report generator</TabsTrigger>
          <TabsTrigger value="history">Historical assessments</TabsTrigger>
        </TabsList>

        {/* ── Scoring ── */}
        <TabsContent value="scoring" className="space-y-3 pt-4">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <p className="text-sm text-muted-foreground max-w-2xl">
              4 dimensions are auto-scored, for real, from live data in
              Governance, Compliance and HR. The other 4 have no connected
              module yet and use a manual baseline — set and documented by you —
              until one exists. Underlying source data can only be edited in its
              own module; use a documented override to adjust a score here.
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={recomputeMut.isPending}
              onClick={() => recomputeMut.mutate()}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1 ${recomputeMut.isPending ? "animate-spin" : ""}`}
              />
              Refresh auto-scores
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {current.scores.map((d) => {
              const v = effectiveScore(d);
              const low = v < current.threshold;
              const isManual = DIMENSION_COMPUTE_MODE[d.dimension] === "manual";
              return (
                <Card key={d.dimension}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-sm">{d.dimension}</p>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {isManual ? "Manual" : "Auto"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {DIMENSION_SOURCE[d.dimension]}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`text-2xl font-bold ${low ? "text-rose-600" : "text-emerald-600"}`}
                        >
                          {v}
                        </span>
                        {!isManual && d.override !== null && (
                          <p className="text-[10px] text-amber-600">
                            overridden (auto {d.autoScore})
                          </p>
                        )}
                      </div>
                    </div>
                    <Progress value={v} className="h-2" />
                    {d.overrideReason && (
                      <p className="text-xs italic text-muted-foreground">
                        "{d.overrideReason}"
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                          setOverride({
                            dim: d.dimension,
                            value: String(v),
                            reason: d.overrideReason ?? "",
                          })
                        }
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Override
                      </Button>
                      {!isManual && d.override !== null && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-muted-foreground"
                          onClick={() => clearOverrideMut.mutate(d.dimension)}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Clear
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Card>
            <CardContent className="p-4 flex items-center gap-3 flex-wrap">
              <Label className="text-sm">Gap threshold</Label>
              <Input
                type="number"
                className="w-24"
                defaultValue={current.threshold}
                onBlur={(e) => thresholdMut.mutate(Number(e.target.value))}
              />
              <span className="text-sm text-muted-foreground">
                {belowThreshold.length} dimension(s) currently below threshold.
              </span>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Gaps ── */}
        <TabsContent value="gaps" className="space-y-3 pt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setGapOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add gap
            </Button>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Priority</TableHead>
                    <TableHead>Dimension</TableHead>
                    <TableHead>Gap</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead>Remediation</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {current.gaps.map((g) => (
                    <TableRow key={g._id}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={PRIORITY_TONE[g.priority]}
                        >
                          {PRIORITY_LABEL[g.priority]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{g.dimension}</TableCell>
                      <TableCell className="text-xs max-w-[240px]">
                        {g.description}
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] text-muted-foreground">
                        {g.impact}
                      </TableCell>
                      <TableCell className="text-xs max-w-[220px]">
                        {g.remediation}
                      </TableCell>
                      <TableCell className="text-xs">{g.owner}</TableCell>
                      <TableCell className="text-xs">
                        {g.targetDate.slice(0, 10)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={g.status}
                          onValueChange={(v) =>
                            gapStatusMut.mutate({
                              gapId: g._id,
                              status: v as GapStatus,
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(
                              ["Open", "In progress", "Closed"] as GapStatus[]
                            ).map((x) => (
                              <SelectItem key={x} value={x}>
                                {x}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => deleteGapMut.mutate(g._id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!current.gaps.length && (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center text-sm text-muted-foreground py-8"
                      >
                        No gaps — every dimension scores at or above the
                        threshold.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Remediation ── */}
        <TabsContent value="remediation" className="space-y-3 pt-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-baseline justify-between">
                <p className="font-medium">Remediation progress</p>
                <span className="text-sm text-muted-foreground">
                  {current.gapsClosed} of {current.gaps.length} gaps closed
                </span>
              </div>
              <Progress
                value={
                  current.gaps.length
                    ? (current.gapsClosed / current.gaps.length) * 100
                    : 100
                }
                className="h-3"
              />
              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <Mini
                  label="P1 deal blockers open"
                  value={
                    current.gaps.filter(
                      (g) => g.priority === "P1" && g.status !== "Closed",
                    ).length
                  }
                />
                <Mini
                  label="In progress"
                  value={
                    current.gaps.filter((g) => g.status === "In progress")
                      .length
                  }
                />
                <Mini
                  label="Projected readiness date"
                  value={current.projectedReadyDate}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="font-medium mb-3">Score trajectory</p>
              <Trajectory versions={versions} />
            </CardContent>
          </Card>
          <div className="grid gap-3 md:grid-cols-2">
            {current.gaps
              .filter((g) => g.status !== "Closed")
              .map((g) => (
                <Card key={g._id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between gap-2">
                      <Badge
                        variant="outline"
                        className={PRIORITY_TONE[g.priority]}
                      >
                        {g.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Due {g.targetDate.slice(0, 10)}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{g.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Action: {g.remediation}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs">Owner: {g.owner}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() =>
                          gapStatusMut.mutate({
                            gapId: g._id,
                            status:
                              g.status === "Open" ? "In progress" : "Closed",
                          })
                        }
                      >
                        {g.status === "Open"
                          ? "Start remediation"
                          : "Mark closed"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* ── Report ── */}
        <TabsContent value="report" className="space-y-3 pt-4">
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-medium">
                    Investor Readiness Report — {current.company}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Real, server-generated PDF. Each section is flagged Auto
                    (system-populated), Review (needs sign-off) or Incomplete
                    (missing data). Click a flag to change it.
                  </p>
                </div>
                <Button onClick={() => downloadReadinessReport(current._id)}>
                  <Download className="h-4 w-4 mr-1" />
                  Generate PDF
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {current.reportSections.map((r) => (
                  <button
                    key={r.name}
                    onClick={() => cycleSection(r.name, r.state)}
                    className="flex items-center justify-between rounded-md border p-3 text-left hover:bg-muted/50"
                  >
                    <span className="text-sm">{r.name}</span>
                    <Badge
                      variant="outline"
                      className={
                        r.state === "Auto"
                          ? "text-emerald-600 border-emerald-500/40"
                          : r.state === "Review"
                            ? "text-amber-600 border-amber-500/40"
                            : "text-rose-600 border-rose-500/40"
                      }
                    >
                      {r.state}
                    </Badge>
                  </button>
                ))}
              </div>
              {current.reportSections.some((r) => r.state === "Incomplete") && (
                <p className="text-xs text-rose-600">
                  Sections marked Incomplete will print with a data-gap notice.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Notes for this version
                </Label>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={notesMut.isPending}
                  onClick={() => notesMut.mutate(notes)}
                >
                  {notesMut.isPending ? "Saving…" : "Save notes"}
                </Button>
              </div>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything worth flagging to whoever reads this report…"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── History ── */}
        <TabsContent value="history" className="space-y-3 pt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Band</TableHead>
                    <TableHead>Gaps</TableHead>
                    <TableHead>Closed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.map((v) => (
                    <TableRow
                      key={v._id}
                      className={v._id === current._id ? "bg-muted/40" : ""}
                    >
                      <TableCell>v{v.version}</TableCell>
                      <TableCell>{v.createdAt.slice(0, 10)}</TableCell>
                      <TableCell className="font-semibold">
                        {v.overallScore}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={v.band.tone}>
                          {v.band.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{v.gaps.length}</TableCell>
                      <TableCell>{v.gapsClosed}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {previous && (
            <Card>
              <CardContent className="p-5">
                <p className="font-medium mb-3">
                  Before / after — v{previous.version} vs v{current.version}
                </p>
                <div className="space-y-2">
                  {READINESS_DIMENSIONS.map((dim) => {
                    const a = previous.scores.find((x) => x.dimension === dim);
                    const b = current.scores.find((x) => x.dimension === dim);
                    if (!a || !b) return null;
                    const delta = effectiveScore(b) - effectiveScore(a);
                    return (
                      <div key={dim} className="flex items-center gap-3">
                        <span className="text-xs w-64 shrink-0 truncate">
                          {dim}
                        </span>
                        <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${effectiveScore(b)}%` }}
                          />
                        </div>
                        <span className="text-xs w-24 text-right">
                          {effectiveScore(a)} →{" "}
                          <strong>{effectiveScore(b)}</strong>
                        </span>
                        <span
                          className={`text-xs w-12 text-right ${delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                        >
                          {delta >= 0 ? "+" : ""}
                          {delta}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Override dialog */}
      <Dialog open={!!override} onOpenChange={(o) => !o && setOverride(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual override — {override?.dim}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Score (0–100)</Label>
              <Input
                type="number"
                value={override?.value ?? ""}
                onChange={(e) =>
                  setOverride((o) => o && { ...o, value: e.target.value })
                }
              />
            </div>
            <div>
              <Label>
                Documented reason <span className="text-rose-600">*</span>
              </Label>
              <Textarea
                rows={3}
                value={override?.reason ?? ""}
                placeholder="Why does the auto-score not reflect reality?"
                onChange={(e) =>
                  setOverride((o) => o && { ...o, reason: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverride(null)}>
              Cancel
            </Button>
            <Button disabled={overrideMut.isPending} onClick={saveOverride}>
              {overrideMut.isPending ? "Saving…" : "Save override"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddGapDialog
        open={gapOpen}
        onOpenChange={setGapOpen}
        pending={addGapMut.isPending}
        onAdd={(g) =>
          addGapMut.mutate(g, { onSuccess: () => setGapOpen(false) })
        }
      />
      <NewAssessmentDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreate={onCreate}
        pending={creating}
        defaultAdvisor={current.advisor}
      />
    </div>
  );
}

// ───────────────────────────── pieces ──

function Header({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex justify-between items-start flex-wrap gap-2">
      <div>
        <h1 className="text-2xl font-bold">Investor Readiness Assessment</h1>
        <p className="text-sm text-muted-foreground">
          Scores your business across 8 dimensions — 4 from live module data, 4
          manual — then tracks remediation of every gap.
        </p>
      </div>
      <Button onClick={onNew}>
        <Plus className="h-4 w-4 mr-1" />
        New assessment
      </Button>
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const tone =
    value >= 80 ? "hsl(var(--primary))" : value >= 60 ? "#f59e0b" : "#e11d48";
  return (
    <div
      className="h-20 w-20 rounded-full grid place-items-center shrink-0"
      style={{
        background: `conic-gradient(${tone} ${value * 3.6}deg, hsl(var(--muted)) 0deg)`,
      }}
    >
      <div
        className="rounded-full bg-card grid place-items-center"
        style={{ height: 60, width: 60 }}
      >
        <span className="text-xl font-bold">{value}</span>
      </div>
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
  value: string | number;
  icon: any;
  tone: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} grid place-items-center shadow-sm`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function Trajectory({ versions }: { versions: ReadinessAssessment[] }) {
  const pts = versions.map((v) => ({
    label: `v${v.version}`,
    score: v.overallScore,
  }));
  const max = 100;
  return (
    <div className="flex items-end gap-6 h-40">
      {pts.map((p) => (
        <div key={p.label} className="flex flex-col items-center gap-1 flex-1">
          <span className="text-xs font-medium">{p.score}</span>
          <div
            className="w-full bg-muted rounded-t relative"
            style={{ height: "100%" }}
          >
            <div
              className="absolute bottom-0 w-full bg-gradient-to-t from-primary to-primary/60 rounded-t"
              style={{ height: `${(p.score / max) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{p.label}</span>
        </div>
      ))}
      {pts.length < 2 && (
        <p className="text-sm text-muted-foreground self-center">
          Run a second assessment to see the trend.
        </p>
      )}
    </div>
  );
}

function AddGapDialog({
  open,
  onOpenChange,
  onAdd,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdd: (g: any) => void;
  pending: boolean;
}) {
  const [f, setF] = useState({
    dimension: READINESS_DIMENSIONS[0] as ReadinessDimension,
    priority: "P2" as GapPriority,
    description: "",
    impact: "",
    remediation: "",
    owner: "",
    targetDate: "",
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add gap</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
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
            <div>
              <Label>Priority</Label>
              <Select
                value={f.priority}
                onValueChange={(v) =>
                  setF({ ...f, priority: v as GapPriority })
                }
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
          </div>
          <div>
            <Label>Gap description</Label>
            <Textarea
              rows={2}
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          </div>
          <div>
            <Label>Impact</Label>
            <Input
              value={f.impact}
              onChange={(e) => setF({ ...f, impact: e.target.value })}
            />
          </div>
          <div>
            <Label>Remediation action</Label>
            <Textarea
              rows={2}
              value={f.remediation}
              onChange={(e) => setF({ ...f, remediation: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Owner</Label>
              <Input
                value={f.owner}
                onChange={(e) => setF({ ...f, owner: e.target.value })}
              />
            </div>
            <div>
              <Label>Target date</Label>
              <Input
                type="date"
                value={f.targetDate}
                onChange={(e) => setF({ ...f, targetDate: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={() => {
              if (!f.description.trim()) {
                toast({
                  title: "Description required",
                  variant: "destructive",
                });
                return;
              }
              if (!f.targetDate) {
                toast({
                  title: "Target date required",
                  variant: "destructive",
                });
                return;
              }
              onAdd(f);
            }}
          >
            {pending ? "Adding…" : "Add gap"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewAssessmentDialog({
  open,
  onOpenChange,
  onCreate,
  pending,
  defaultAdvisor = "",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (advisor?: string) => void;
  pending: boolean;
  defaultAdvisor?: string;
}) {
  const [advisor, setAdvisor] = useState(defaultAdvisor);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Initiate assessment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Advisor</Label>
            <Input
              value={advisor}
              onChange={(e) => setAdvisor(e.target.value)}
              placeholder="Advisor name"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Re-running this creates the next version for your own business —
            Investor Readiness doesn't currently assess client companies.
          </p>
          <div className="rounded-md border p-3 text-xs text-muted-foreground space-y-1">
            <p className="flex items-center gap-1 font-medium text-foreground">
              <Layers className="h-3 w-3" />
              Data pulled from
            </p>
            {READINESS_DIMENSIONS.map((d) => (
              <p key={d}>
                • {DIMENSION_SOURCE[d]}
                {DIMENSION_COMPUTE_MODE[d] === "manual" && (
                  <span className="text-amber-600"> (manual baseline)</span>
                )}
              </p>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={() => onCreate(advisor || undefined)}
          >
            <Gauge className="h-4 w-4 mr-1" />
            {pending ? "Running…" : "Run assessment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
