import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, ArrowUpRight, ShieldAlert, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchMandates,
  ragClass,
  money,
  type Mandate,
} from "@/lib/crm/mandates-api";
import { useResourceAllocation } from "@/hooks/use-resource-allocation";
import {
  fetchPortfolioRisks,
  createPortfolioRisk,
  setRiskStatus,
  escalateRisk,
  addRiskNote,
  type RiskType,
  type RiskSeverity,
  type RiskStatus,
  type PortfolioRisk,
} from "@/lib/crm/portfolio-risk-api";

const dayMs = 86400000;
const parseDate = (s: string) => new Date(s).getTime();

const severityClass: Record<string, string> = {
  Critical: "bg-destructive/10 text-destructive",
  High: "bg-warning/10 text-warning",
  Medium: "bg-primary/10 text-primary",
  Low: "bg-success/10 text-success",
};

export default function Pmo() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: mandates = [], isLoading } = useQuery({
    queryKey: ["mandates"],
    queryFn: fetchMandates,
  });

  const [clientFilter, setClientFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [memberFilter, setMemberFilter] = useState("all");

  const clients = Array.from(new Set(mandates.map((m) => m.clientName)));
  const types = Array.from(new Set(mandates.map((m) => m.type)));
  const stages = Array.from(new Set(mandates.map((m) => m.stage)));
  const members = Array.from(
    new Set(mandates.flatMap((m) => [...m.team, m.manager]).filter(Boolean)),
  );

  const filtered = mandates.filter(
    (m) =>
      (clientFilter === "all" || m.clientName === clientFilter) &&
      (typeFilter === "all" || m.type === typeFilter) &&
      (stageFilter === "all" || m.stage === stageFilter) &&
      (memberFilter === "all" ||
        m.team.includes(memberFilter) ||
        m.manager === memberFilter),
  );

  const totalBudget = mandates.reduce((s, m) => s + m.budget, 0);
  const totalCost = mandates.reduce((s, m) => s + m.actualCost, 0);
  const budgetPct = totalBudget
    ? Math.round((totalCost / totalBudget) * 100)
    : 0;
  const atRisk = mandates.filter((m) => m.rag !== "Green").length;

  const {
    allocation,
    isLoading: allocationLoading,
    ASSUMED_AVAILABLE_HRS,
  } = useResourceAllocation();
  const avgUtil = allocation.length
    ? Math.round(
        (allocation.reduce(
          (s, a) => s + a.allocated / ASSUMED_AVAILABLE_HRS,
          0,
        ) /
          allocation.length) *
          100,
      )
    : 0;

  // Portfolio Gantt — axis derived from real mandate dates, not a
  // fixed window, and "today" is the actual current date.
  const { axisStart, axisEnd, axisSpan, months } = useMemo(() => {
    if (!mandates.length) {
      const now = Date.now();
      return {
        axisStart: now,
        axisEnd: now + dayMs,
        axisSpan: dayMs,
        months: [] as string[],
      };
    }
    const starts = mandates.map((m) => parseDate(m.startDate));
    const ends = mandates.map((m) => parseDate(m.targetDate));
    const start = Math.min(...starts);
    const end = Math.max(...ends);
    const span = Math.max(end - start, dayMs);
    const out: string[] = [];
    const d = new Date(start);
    d.setDate(1);
    while (d.getTime() <= end) {
      out.push(
        d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      );
      d.setMonth(d.getMonth() + 1);
    }
    return { axisStart: start, axisEnd: end, axisSpan: span, months: out };
  }, [mandates]);
  const today = Date.now();

  const barStyle = (start: string, end: string) => {
    const s = Math.max(parseDate(start), axisStart);
    const e = Math.min(parseDate(end), axisEnd);
    const left = ((s - axisStart) / axisSpan) * 100;
    const width = Math.max(((e - s) / axisSpan) * 100, 1);
    return { left: `${left}%`, width: `${width}%` };
  };

  // ── Risks & issues ────────────────────────────────────────────
  const { data: risks = [] } = useQuery({
    queryKey: ["portfolioRisks"],
    queryFn: fetchPortfolioRisks,
  });
  const [noteRiskId, setNoteRiskId] = useState<string | null>(null);
  const noteRisk = risks.find((r) => r._id === noteRiskId) ?? null;
  const [noteText, setNoteText] = useState("");
  const [openNewRisk, setOpenNewRisk] = useState(false);
  const [riskDraft, setRiskDraft] = useState({
    title: "",
    mandateId: "",
    type: "Risk" as RiskType,
    severity: "Medium" as RiskSeverity,
    owner: "",
    impact: "",
  });

  const invalidateRisks = () =>
    queryClient.invalidateQueries({ queryKey: ["portfolioRisks"] });

  const createRiskMut = useMutation({
    mutationFn: () => {
      const m = mandates.find((x) => x._id === riskDraft.mandateId);
      return createPortfolioRisk({ ...riskDraft, mandateName: m?.name ?? "" });
    },
    onSuccess: () => {
      invalidateRisks();
      setOpenNewRisk(false);
      setRiskDraft({
        title: "",
        mandateId: "",
        type: "Risk",
        severity: "Medium",
        owner: "",
        impact: "",
      });
      toast({ title: "Logged" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to log",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });
  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RiskStatus }) =>
      setRiskStatus(id, status),
    onSuccess: invalidateRisks,
  });
  const escalateMut = useMutation({
    mutationFn: (id: string) => escalateRisk(id),
    onSuccess: (r) => {
      invalidateRisks();
      toast({ title: "Escalated to portfolio", description: r._id });
    },
  });
  const noteMut = useMutation({
    mutationFn: () => addRiskNote(noteRisk!._id, "You", noteText),
    onSuccess: () => {
      invalidateRisks();
      toast({ title: "Mitigation note saved" });
      setNoteRiskId(null);
      setNoteText("");
    },
  });

  // ── Resource scenario planner ────────────────────────────────
  const [scenarioHrs, setScenarioHrs] = useState(40);

  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Loading portfolio…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PMO Portfolio</h1>
        <p className="text-sm text-muted-foreground">
          Portfolio-wide oversight of mandates, budgets, resources and risk.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "Portfolio value", v: money(totalBudget) },
          { l: "Budget consumed", v: `${budgetPct}%` },
          { l: "Mandates at risk", v: String(atRisk) },
          { l: "Avg utilisation", v: `${avgUtil}%` },
        ].map((k) => (
          <Card key={k.l}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.l}</p>
              <p className="mt-1 text-xl font-bold">{k.v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="portfolio">
        <TabsList className="flex-wrap">
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="gantt">Portfolio Gantt</TabsTrigger>
          <TabsTrigger value="budget">Budget tracker</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="risks">Risks &amp; issues</TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="pt-4">
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-wrap gap-2">
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All clients</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {types.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All stages</SelectItem>
                    {stages.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={memberFilter} onValueChange={setMemberFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All team</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mandate</TableHead>
                    <TableHead>RAG</TableHead>
                    <TableHead className="w-32">Progress</TableHead>
                    <TableHead>Budget consumed</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Deadline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => (
                    <TableRow key={m._id}>
                      <TableCell>
                        <p className="text-sm font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.clientName} · {m.ref}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge className={ragClass[m.rag]}>{m.rag}</Badge>
                      </TableCell>
                      <TableCell>
                        <Progress value={m.progress} className="h-2" />
                      </TableCell>
                      <TableCell className="text-sm">
                        {m.budget
                          ? Math.round((m.actualCost / m.budget) * 100)
                          : 0}
                        %
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {m.team.join(", ") || m.manager || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {m.targetDate?.slice(0, 10)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filtered.length && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No mandates match your filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gantt" className="pt-4">
          <Card>
            <CardContent className="overflow-x-auto p-4">
              {!mandates.length ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No mandates yet.
                </p>
              ) : (
                <>
                  <div className="relative mb-2 h-6 min-w-[720px] border-b text-[10px] text-muted-foreground">
                    {months.map((m, i) => (
                      <span
                        key={i}
                        className="absolute"
                        style={{
                          left: `${(i / Math.max(months.length - 1, 1)) * 100}%`,
                        }}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                  <div className="relative min-w-[720px] space-y-6 pt-2">
                    {mandates.map((m) => {
                      const style = barStyle(m.startDate, m.targetDate);
                      const notStarted = m.progress === 0;
                      return (
                        <div key={m._id} className="relative h-8">
                          <p className="absolute -top-4 left-0 text-[10px] text-muted-foreground">
                            {m.name}
                          </p>
                          <div className="relative h-4 w-full rounded bg-muted/40">
                            <div
                              className={`absolute top-0 h-4 rounded ${notStarted ? "border-2 border-dashed border-muted-foreground bg-transparent" : ragClass[m.rag]}`}
                              style={style}
                            >
                              {!notStarted && (
                                <span className="px-1 text-[9px] text-current">
                                  {m.progress}%
                                </span>
                              )}
                            </div>
                            {m.stage === "Review" && (
                              <div
                                className="absolute -top-1 h-6 w-1.5 rotate-45 bg-warning"
                                style={{ left: style.left }}
                                title="Milestone"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div
                      className="pointer-events-none absolute top-0 h-full w-px bg-destructive"
                      style={{
                        left: `${((today - axisStart) / axisSpan) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Dashed outline = not started. Diamond = in Review. Red line
                    = today.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget" className="pt-4">
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mandate</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right">
                      Forecast at completion
                    </TableHead>
                    <TableHead>Alert</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mandates.map((m) => {
                    const variance = m.budget - m.actualCost;
                    const forecast =
                      m.progress > 0
                        ? Math.round(m.actualCost / (m.progress / 100))
                        : m.budget;
                    const over = forecast > m.budget;
                    return (
                      <TableRow key={m._id}>
                        <TableCell className="text-sm font-medium">
                          {m.name}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {money(m.budget, m.currency)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {money(m.actualCost, m.currency)}
                        </TableCell>
                        <TableCell
                          className={`text-right text-sm ${variance < 0 ? "text-destructive" : "text-success"}`}
                        >
                          {money(variance, m.currency)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {money(forecast, m.currency)}
                        </TableCell>
                        <TableCell>
                          {over ? (
                            <Badge className="bg-destructive/10 text-destructive">
                              <AlertTriangle className="mr-1 h-3 w-3" /> Over
                              budget
                            </Badge>
                          ) : (
                            <Badge className="bg-success/10 text-success">
                              On track
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="pt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Capacity vs allocation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {allocationLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : (
                  allocation.map((a) => {
                    const pct = Math.round(
                      (a.allocated / ASSUMED_AVAILABLE_HRS) * 100,
                    );
                    const over = pct > 100;
                    return (
                      <div key={a.member}>
                        <div className="flex items-center justify-between text-sm">
                          <span>{a.member}</span>
                          <span
                            className={
                              over
                                ? "text-destructive"
                                : "text-muted-foreground"
                            }
                          >
                            {a.allocated.toFixed(1)}h / {ASSUMED_AVAILABLE_HRS}h
                            ({pct}%){over && " — over-allocated"}
                          </span>
                        </div>
                        <Progress value={Math.min(pct, 100)} className="h-2" />
                      </div>
                    );
                  })
                )}
                {!allocationLoading && !allocation.length && (
                  <p className="text-sm text-muted-foreground">
                    No tasks or time entries yet.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Scenario planner</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label className="text-xs">New mandate hours needed</Label>
                <Input
                  type="number"
                  value={scenarioHrs}
                  onChange={(e) => setScenarioHrs(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Members with spare capacity for {scenarioHrs}h:
                </p>
                <div className="space-y-1">
                  {allocation
                    .filter(
                      (a) => ASSUMED_AVAILABLE_HRS - a.allocated >= scenarioHrs,
                    )
                    .map((a) => (
                      <Badge
                        key={a.member}
                        className="mr-1 bg-success/10 text-success"
                      >
                        {a.member} (
                        {(ASSUMED_AVAILABLE_HRS - a.allocated).toFixed(0)}h
                        free)
                      </Badge>
                    ))}
                  {allocation.length > 0 &&
                    allocation.every(
                      (a) => ASSUMED_AVAILABLE_HRS - a.allocated < scenarioHrs,
                    ) && (
                      <p className="text-sm text-destructive">
                        No one has enough spare capacity.
                      </p>
                    )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risks" className="pt-4">
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 rounded bg-muted p-2 text-xs text-muted-foreground">
                  <ShieldAlert className="h-3.5 w-3.5" /> GRC portfolio risk
                  ratings aren't wired in here yet — this register is
                  Projects-only for now.
                </p>
                <Button size="sm" onClick={() => setOpenNewRisk(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Log risk
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Mandate</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {risks.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell className="text-sm font-medium">
                        {r.title}
                      </TableCell>
                      <TableCell className="text-sm">{r.mandateName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={severityClass[r.severity]}>
                          {r.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.owner || "—"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={r.status}
                          onValueChange={(v) =>
                            statusMut.mutate({
                              id: r._id,
                              status: v as RiskStatus,
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              "Open",
                              "Mitigating",
                              "Monitoring",
                              "Escalated",
                              "Closed",
                            ].map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setNoteRiskId(r._id)}
                          >
                            Mitigation notes ({r.notes.length})
                          </Button>
                          {r.status !== "Escalated" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => escalateMut.mutate(r._id)}
                            >
                              <ArrowUpRight className="mr-1 h-3.5 w-3.5" />{" "}
                              Escalate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!risks.length && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No risks logged yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log risk */}
      <Dialog open={openNewRisk} onOpenChange={setOpenNewRisk}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log a risk or issue</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Title</Label>
              <Input
                value={riskDraft.title}
                onChange={(e) =>
                  setRiskDraft({ ...riskDraft, title: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Mandate</Label>
              <Select
                value={riskDraft.mandateId}
                onValueChange={(v) =>
                  setRiskDraft({ ...riskDraft, mandateId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mandate..." />
                </SelectTrigger>
                <SelectContent>
                  {mandates.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={riskDraft.type}
                  onValueChange={(v) =>
                    setRiskDraft({ ...riskDraft, type: v as RiskType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Risk">Risk</SelectItem>
                    <SelectItem value="Issue">Issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity</Label>
                <Select
                  value={riskDraft.severity}
                  onValueChange={(v) =>
                    setRiskDraft({ ...riskDraft, severity: v as RiskSeverity })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Critical", "High", "Medium", "Low"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Owner</Label>
              <Input
                placeholder="Person or team, e.g. Finance"
                value={riskDraft.owner}
                onChange={(e) =>
                  setRiskDraft({ ...riskDraft, owner: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Impact</Label>
              <Textarea
                value={riskDraft.impact}
                onChange={(e) =>
                  setRiskDraft({ ...riskDraft, impact: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !riskDraft.title ||
                !riskDraft.mandateId ||
                createRiskMut.isPending
              }
              onClick={() => createRiskMut.mutate()}
            >
              Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mitigation notes */}
      <Dialog open={!!noteRisk} onOpenChange={(o) => !o && setNoteRiskId(null)}>
        <DialogContent>
          {noteRisk && (
            <>
              <DialogHeader>
                <DialogTitle>Mitigation notes — {noteRisk.title}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Impact: {noteRisk.impact || "—"}
              </p>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {noteRisk.notes.map((n) => (
                  <div key={n._id} className="rounded border p-2 text-sm">
                    <p>{n.body}</p>
                    <p className="text-xs text-muted-foreground">
                      {n.author} · {new Date(n.at).toLocaleString()}
                    </p>
                  </div>
                ))}
                {!noteRisk.notes.length && (
                  <p className="text-sm text-muted-foreground">No notes yet.</p>
                )}
              </div>
              <Textarea
                placeholder="Add mitigation note…"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <DialogFooter>
                <Button
                  disabled={!noteText.trim() || noteMut.isPending}
                  onClick={() => noteMut.mutate()}
                >
                  Save note
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
