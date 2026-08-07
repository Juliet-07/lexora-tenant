import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Grid3x3,
  Plus,
  Users,
  ShieldAlert,
  CheckCircle2,
  Download,
  RefreshCw,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchCycle,
  fetchTopics,
  fetchStakeholders,
  updateThreshold,
  approveCycle,
  openNextCycle,
  addStakeholder,
  recordEngagement,
  addTopic,
  updateTopicScore,
  escalateTopic,
  STAKEHOLDER_GROUPS,
  EsgPillar,
  MaterialTopic,
  StakeholderPriority,
} from "@/lib/grc/esg-api";
import { exportReportExcel, exportReportPdf } from "@/lib/grc/reportExport";

export default function EsgMateriality() {
  const queryClient = useQueryClient();
  const { data: cycle } = useQuery({
    queryKey: ["esgCycle"],
    queryFn: fetchCycle,
  });
  const { data: topics = [] } = useQuery({
    queryKey: ["esgTopics"],
    queryFn: fetchTopics,
  });
  const { data: stakeholders = [] } = useQuery({
    queryKey: ["esgStakeholders"],
    queryFn: fetchStakeholders,
  });
  const [selected, setSelected] = useState<MaterialTopic | null>(null);

  const invalidateTopics = () =>
    queryClient.invalidateQueries({ queryKey: ["esgTopics"] });
  const invalidateCycle = () =>
    queryClient.invalidateQueries({ queryKey: ["esgCycle"] });
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const thresholdMut = useMutation({
    mutationFn: (t: number) => updateThreshold(t),
    onSuccess: invalidateCycle,
  });
  const approveMut = useMutation({
    mutationFn: () => approveCycle("Board Chair"),
    onSuccess: () => {
      invalidateCycle();
      toast({
        title: "Materiality assessment approved",
        description: "Material topics are now locked for reporting.",
      });
    },
  });
  const nextCycleMut = useMutation({
    mutationFn: () => openNextCycle(),
    onSuccess: () => {
      invalidateCycle();
      invalidateTopics();
      toast({ title: "New assessment cycle opened" });
    },
  });
  const stakeholderMut = useMutation({
    mutationFn: (dto: {
      group: string;
      priority?: StakeholderPriority;
      engagementMethod?: string;
      input?: string;
    }) => addStakeholder(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["esgStakeholders"] });
      toast({ title: "Stakeholder group added" });
    },
    onError: onErr("Failed to add stakeholder"),
  });
  const engagementMut = useMutation({
    mutationFn: (id: string) => recordEngagement(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["esgStakeholders"] }),
  });
  const topicMut = useMutation({
    mutationFn: (dto: {
      topic: string;
      pillar: EsgPillar;
      financial: number;
      impact: number;
      rationale?: string;
    }) => addTopic(dto),
    onSuccess: () => {
      invalidateTopics();
      toast({ title: "Topic added to the assessment" });
    },
    onError: onErr("Failed to add topic"),
  });
  const scoreMut = useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto: { financial?: number; impact?: number };
    }) => updateTopicScore(id, dto),
    onSuccess: (t) => {
      invalidateTopics();
      setSelected(t);
    },
  });
  const escalateMut = useMutation({
    mutationFn: (id: string) => escalateTopic(id),
    onSuccess: (t) => {
      invalidateTopics();
      setSelected(t);
      toast({ title: "Escalated to Risk Register", description: t.topic });
    },
    onError: onErr("Failed to escalate"),
  });

  if (!cycle) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading materiality assessment…
      </div>
    );
  }

  const material = topics.filter((t) => t.status === "Material");

  const definition = {
    id: "esg-materiality",
    title: `Double Materiality Assessment ${cycle.year}`,
    subtitle: `Threshold ${cycle.threshold} · ${cycle.status}`,
    summary: [
      { label: "Topics assessed", value: topics.length },
      { label: "Material topics", value: material.length },
      { label: "Stakeholder groups", value: stakeholders.length },
      { label: "Next reassessment", value: cycle.nextReviewDate?.slice(0, 10) },
    ],
    sections: [
      {
        heading: "Topic assessment",
        columns: [
          "Topic",
          "Pillar",
          "Financial",
          "Impact",
          "Status",
          "Prior peak",
          "Shift",
          "Escalated to risk",
          "Rationale",
        ],
        rows: topics.map((t) => [
          t.topic,
          t.pillar,
          t.financial,
          t.impact,
          t.status,
          t.priorFinancial != null
            ? Math.max(t.priorFinancial, t.priorImpact ?? 0)
            : "—",
          t.shift,
          t.escalatedToRisk ? "Yes" : "No",
          t.rationale,
        ]),
      },
      {
        heading: "Stakeholder map",
        columns: [
          "Group",
          "Priority",
          "Engagement method",
          "Last engaged",
          "Input received",
        ],
        rows: stakeholders.map((s) => [
          s.group,
          s.priority,
          s.engagementMethod,
          s.lastEngaged?.slice(0, 10) ?? "Not yet engaged",
          s.input || "—",
        ]),
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Grid3x3 className="h-6 w-6 text-amber-600" />
            Double Materiality
          </h1>
          <p className="text-sm text-muted-foreground">
            Financial materiality vs impact materiality, stakeholder input and
            annual reassessment.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportReportPdf(definition)}>
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => exportReportExcel(definition)}
          >
            <Download className="h-4 w-4 mr-1" />
            Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Topics assessed" value={topics.length} />
        <Stat label="Material topics" value={material.length} />
        <Stat label="Threshold" value={cycle.threshold} />
        <Stat label="Cycle status" value={cycle.status} />
      </div>

      <Tabs defaultValue="matrix">
        <TabsList>
          <TabsTrigger value="matrix">Matrix</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="stakeholders">Stakeholders</TabsTrigger>
          <TabsTrigger value="cycle">Reassessment</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">
                  Interactive materiality matrix
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Threshold
                  </span>
                  <Select
                    value={String(cycle.threshold)}
                    onValueChange={(v) => thresholdMut.mutate(Number(v))}
                  >
                    <SelectTrigger className="h-8 w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-square max-w-[540px] mx-auto border rounded bg-gradient-to-tr from-emerald-500/10 via-amber-500/10 to-rose-500/20">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={"v" + n}
                      className="absolute top-0 bottom-0 border-l border-border/60"
                      style={{ left: `${n * 20}%` }}
                    />
                  ))}
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={"h" + n}
                      className="absolute left-0 right-0 border-t border-border/60"
                      style={{ top: `${n * 20}%` }}
                    />
                  ))}
                  {topics.map((t) => (
                    <button
                      key={t._id}
                      onClick={() => setSelected(t)}
                      title={t.topic}
                      className={`absolute -translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-full border-2 border-background hover:scale-150 transition-transform ${
                        t.status === "Material"
                          ? "bg-rose-500"
                          : t.status === "Monitor"
                            ? "bg-amber-500"
                            : "bg-sky-500"
                      }`}
                      style={{
                        left: `${(t.financial / 5) * 100}%`,
                        bottom: `${(t.impact / 5) * 100}%`,
                      }}
                    />
                  ))}
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
                    Financial materiality (enterprise value) →
                  </span>
                  <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-xs text-muted-foreground [writing-mode:vertical-rl] rotate-180">
                    Impact materiality (society / environment) →
                  </span>
                </div>
                <div className="flex gap-4 mt-8 text-xs text-muted-foreground justify-center">
                  <Dot tone="bg-rose-500" label="Material" />
                  <Dot tone="bg-amber-500" label="Monitor" />
                  <Dot tone="bg-sky-500" label="Not material" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Topic detail</CardTitle>
              </CardHeader>
              <CardContent>
                {!selected && (
                  <p className="text-sm text-muted-foreground">
                    Select a point on the matrix to score it and see stakeholder
                    rationale.
                  </p>
                )}
                {selected && (
                  <div className="space-y-4">
                    <div>
                      <div className="font-medium">{selected.topic}</div>
                      <div className="text-xs text-muted-foreground">
                        {selected.pillar}
                      </div>
                    </div>
                    <ScoreSlider
                      label="Financial materiality"
                      value={selected.financial}
                      onChange={(v) => {
                        setSelected({ ...selected, financial: v });
                        scoreMut.mutate({
                          id: selected._id,
                          dto: { financial: v },
                        });
                      }}
                    />
                    <ScoreSlider
                      label="Impact materiality"
                      value={selected.impact}
                      onChange={(v) => {
                        setSelected({ ...selected, impact: v });
                        scoreMut.mutate({
                          id: selected._id,
                          dto: { impact: v },
                        });
                      }}
                    />
                    <div className="text-sm">{selected.rationale}</div>
                    <Badge variant="outline">{selected.status}</Badge>
                    {!selected.escalatedToRisk &&
                      selected.status === "Material" && (
                        <Button
                          size="sm"
                          className="w-full"
                          disabled={escalateMut.isPending}
                          onClick={() => escalateMut.mutate(selected._id)}
                        >
                          <ShieldAlert className="h-4 w-4 mr-1" />
                          Escalate to Risk Register
                        </Button>
                      )}
                    {selected.escalatedToRisk && (
                      <div className="text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Linked to the Risk Register
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="topics" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Topic register</CardTitle>
              <TopicDialog
                pending={topicMut.isPending}
                onSave={(dto, onDone) =>
                  topicMut.mutate(dto, { onSuccess: onDone })
                }
              />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Topic</TableHead>
                    <TableHead>Pillar</TableHead>
                    <TableHead>Financial</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vs prior year</TableHead>
                    <TableHead>Risk link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topics.map((t) => (
                    <TableRow
                      key={t._id}
                      className="cursor-pointer"
                      onClick={() => setSelected(t)}
                    >
                      <TableCell className="font-medium text-sm">
                        {t.topic}
                      </TableCell>
                      <TableCell className="text-sm">{t.pillar}</TableCell>
                      <TableCell>{t.financial}</TableCell>
                      <TableCell>{t.impact}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            t.status === "Material"
                              ? "text-rose-600 border-rose-500/30"
                              : t.status === "Monitor"
                                ? "text-amber-600 border-amber-500/30"
                                : ""
                          }
                        >
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {t.shift > 0 ? (
                          <span className="text-rose-600">▲ +{t.shift}</span>
                        ) : t.shift < 0 ? (
                          <span className="text-emerald-600">▼ {t.shift}</span>
                        ) : (
                          <span className="text-muted-foreground">
                            no change
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {t.escalatedToRisk ? (
                          <span className="text-emerald-600">Escalated</span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!topics.length && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-xs text-muted-foreground py-8"
                      >
                        No topics assessed yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stakeholders" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Stakeholder mapping &amp; engagement
              </CardTitle>
              <StakeholderDialog
                pending={stakeholderMut.isPending}
                onSave={(dto, onDone) =>
                  stakeholderMut.mutate(dto, { onSuccess: onDone })
                }
              />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Engagement method</TableHead>
                    <TableHead>Last engaged</TableHead>
                    <TableHead>Input captured</TableHead>
                    <TableHead className="w-32" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stakeholders.map((sh) => (
                    <TableRow key={sh._id}>
                      <TableCell className="font-medium text-sm">
                        {sh.group}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            sh.priority === "High"
                              ? "text-rose-600 border-rose-500/30"
                              : ""
                          }
                        >
                          {sh.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {sh.engagementMethod}
                      </TableCell>
                      <TableCell className="text-xs">
                        {sh.lastEngaged ? (
                          sh.lastEngaged.slice(0, 10)
                        ) : (
                          <span className="text-amber-600">Not engaged</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[280px]">
                        {sh.input || "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={engagementMut.isPending}
                          onClick={() => engagementMut.mutate(sh._id)}
                        >
                          Record engagement
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!stakeholders.length && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-xs text-muted-foreground py-8"
                      >
                        No stakeholder groups mapped yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cycle" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Annual reassessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Cycle year" value={cycle.year} />
                <Stat label="Status" value={cycle.status} />
                <Stat
                  label="Next review"
                  value={cycle.nextReviewDate?.slice(0, 10)}
                />
                <Stat label="Approved by" value={cycle.approvedBy ?? "—"} />
              </div>

              <div>
                <div className="font-medium text-sm mb-2">
                  Changes versus prior year
                </div>
                <div className="space-y-1">
                  {topics
                    .filter((t) => t.shift !== 0)
                    .map((t) => (
                      <div
                        key={t._id}
                        className="flex justify-between border rounded px-3 py-2 text-sm"
                      >
                        <span>{t.topic}</span>
                        <span
                          className={
                            t.shift > 0
                              ? "text-rose-600 text-xs"
                              : "text-emerald-600 text-xs"
                          }
                        >
                          peak score {t.shift > 0 ? "increased" : "decreased"}{" "}
                          by {Math.abs(t.shift)} — {t.rationale}
                        </span>
                      </div>
                    ))}
                  {topics.every((t) => t.shift === 0) && (
                    <div className="text-sm text-muted-foreground">
                      No movement recorded against the prior cycle.
                    </div>
                  )}
                </div>
              </div>

              {cycle.status === "In progress" ? (
                <Button
                  disabled={approveMut.isPending}
                  onClick={() => approveMut.mutate()}
                >
                  {approveMut.isPending ? "Approving…" : "Approve assessment"}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  disabled={nextCycleMut.isPending}
                  onClick={() => nextCycleMut.mutate()}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  {nextCycleMut.isPending ? "Opening…" : "Open next cycle"}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function Dot({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`w-2.5 h-2.5 rounded-full ${tone}`} />
      {label}
    </span>
  );
}

function ScoreSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span className="font-medium">{value}/5</span>
      </div>
      <Slider
        min={1}
        max={5}
        step={1}
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
      />
    </div>
  );
}

function TopicDialog({
  onSave,
  pending,
}: {
  onSave: (
    dto: {
      topic: string;
      pillar: EsgPillar;
      financial: number;
      impact: number;
      rationale?: string;
    },
    onDone: () => void,
  ) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    topic: "",
    pillar: "Environmental" as EsgPillar,
    financial: 3,
    impact: 3,
    rationale: "",
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          New topic
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add ESG topic</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Topic</Label>
            <Input
              value={f.topic}
              onChange={(e) => setF({ ...f, topic: e.target.value })}
            />
          </div>
          <div>
            <Label>Pillar</Label>
            <Select
              value={f.pillar}
              onValueChange={(v) => setF({ ...f, pillar: v as EsgPillar })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["Environmental", "Social", "Governance"] as EsgPillar[]).map(
                  (p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <ScoreSlider
            label="Financial materiality"
            value={f.financial}
            onChange={(v) => setF({ ...f, financial: v })}
          />
          <ScoreSlider
            label="Impact materiality"
            value={f.impact}
            onChange={(v) => setF({ ...f, impact: v })}
          />
          <div>
            <Label>Rationale</Label>
            <Textarea
              rows={2}
              value={f.rationale}
              onChange={(e) => setF({ ...f, rationale: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={pending}
            onClick={() => {
              if (!f.topic)
                return toast({
                  title: "Topic name required",
                  variant: "destructive",
                });
              onSave(f, () => {
                setOpen(false);
                setF({
                  topic: "",
                  pillar: "Environmental",
                  financial: 3,
                  impact: 3,
                  rationale: "",
                });
              });
            }}
          >
            {pending ? "Adding…" : "Add topic"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StakeholderDialog({
  onSave,
  pending,
}: {
  onSave: (
    dto: {
      group: string;
      priority: StakeholderPriority;
      engagementMethod?: string;
      input?: string;
    },
    onDone: () => void,
  ) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    group: "Employees" as string,
    priority: "Medium" as StakeholderPriority,
    engagementMethod: "",
    input: "",
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Add group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Map stakeholder group</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Group</Label>
            <Select
              value={f.group}
              onValueChange={(v) => setF({ ...f, group: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAKEHOLDER_GROUPS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
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
                setF({ ...f, priority: v as StakeholderPriority })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["High", "Medium", "Low"] as StakeholderPriority[]).map(
                  (p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Engagement method</Label>
            <Input
              value={f.engagementMethod}
              onChange={(e) => setF({ ...f, engagementMethod: e.target.value })}
            />
          </div>
          <div>
            <Label>Input captured</Label>
            <Textarea
              rows={2}
              value={f.input}
              onChange={(e) => setF({ ...f, input: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={pending}
            onClick={() => {
              onSave(f, () => {
                setOpen(false);
                setF({
                  group: "Employees",
                  priority: "Medium",
                  engagementMethod: "",
                  input: "",
                });
              });
            }}
          >
            {pending ? "Adding…" : "Add group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
