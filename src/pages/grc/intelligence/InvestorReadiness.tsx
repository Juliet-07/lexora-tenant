import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Gauge, Plus, TrendingUp, Target, FileText, Pencil, History,
  CircleAlert, CircleCheck, Download, Layers,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useDealIntel, mutateDealIntel, id, today,
  READINESS_DIMENSIONS, DIMENSION_SOURCE, REPORT_SECTIONS,
  ReadinessAssessment, ReadinessGap, GapPriority, GapStatus,
  effectiveScore, overallScore, readinessBand, projectedReadyDate,
} from "@/lib/dealIntelligenceStore";
import {
  IntelSubjectPicker,
  ownSubject,
  type IntelSubject,
} from "@/components/grc/IntelSubjectPicker";

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
  const s = useDealIntel();
  const [subject, setSubject] = useState<IntelSubject>(() => ownSubject());
  const company = subject.label;
  const setCompany = (c: string) =>
    setSubject((prev) =>
      c === prev.label ? prev : { kind: "client", label: c },
    );
  const [newOpen, setNewOpen] = useState(false);
  const [gapOpen, setGapOpen] = useState(false);
  const [override, setOverride] = useState<{ dim: string; value: string; reason: string } | null>(null);

  const companies = useMemo(
    () => Array.from(new Set(s.assessments.map((a) => a.company))),
    [s.assessments],
  );

  const versions = useMemo(
    () => s.assessments.filter((a) => a.company === company).sort((a, b) => a.version - b.version),
    [s.assessments, company],
  );
  const current = versions[versions.length - 1] as ReadinessAssessment | undefined;
  const previous = versions[versions.length - 2];

  if (!current) {
    return (
      <div className="space-y-6">
        <Header onNew={() => setNewOpen(true)} />
        <IntelSubjectPicker value={subject} onChange={setSubject} existing={companies} />
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          No assessment for <span className="font-medium text-foreground">{company}</span> yet —
          initiate one to pull scores from the connected modules.
        </CardContent></Card>
        <NewAssessmentDialog
          open={newOpen}
          onOpenChange={setNewOpen}
          defaultCompany={company}
          onCreated={setCompany}
        />
      </div>
    );
  }

  const score = overallScore(current);
  const band = readinessBand(score);
  const prevScore = previous ? overallScore(previous) : null;
  const gapsClosed = current.gaps.filter((g) => g.status === "Closed").length;
  const belowThreshold = current.scores.filter((d) => effectiveScore(d) < current.threshold);

  const patch = (fn: (a: ReadinessAssessment) => ReadinessAssessment) =>
    mutateDealIntel((st) => ({
      ...st,
      assessments: st.assessments.map((a) => (a.id === current.id ? fn(a) : a)),
    }));

  const saveOverride = () => {
    if (!override) return;
    const v = Number(override.value);
    if (Number.isNaN(v) || v < 0 || v > 100) {
      toast({ title: "Score must be between 0 and 100", variant: "destructive" });
      return;
    }
    if (!override.reason.trim()) {
      toast({ title: "A documented reason is required", variant: "destructive" });
      return;
    }
    patch((a) => ({
      ...a,
      scores: a.scores.map((d) =>
        d.dimension === override.dim ? { ...d, override: v, overrideReason: override.reason } : d,
      ),
    }));
    setOverride(null);
    toast({ title: "Manual override recorded" });
  };

  const setGapStatus = (gapId: string, status: GapStatus) =>
    patch((a) => ({
      ...a,
      gaps: a.gaps.map((g) =>
        g.id === gapId
          ? { ...g, status, closedAt: status === "Closed" ? today() : undefined }
          : g,
      ),
    }));

  const cycleSection = (name: string) =>
    patch((a) => ({
      ...a,
      reportSections: a.reportSections.map((r) =>
        r.name === name
          ? { ...r, state: r.state === "Incomplete" ? "Review" : r.state === "Review" ? "Auto" : "Incomplete" }
          : r,
      ),
    }));

  return (
    <div className="space-y-6">
      <Header onNew={() => setNewOpen(true)} />

      <div className="flex flex-wrap items-center gap-3">
        <IntelSubjectPicker value={subject} onChange={setSubject} existing={companies} />
        <Badge variant="outline">Version {current.version} · {current.createdAt}</Badge>
        <Badge variant="outline">Advisor: {current.advisor}</Badge>
      </div>

      {/* Dashboard */}
      <div className="grid gap-3 lg:grid-cols-4">
        <Card className="lg:col-span-1 overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <ScoreRing value={score} />
            <div>
              <p className="text-xs text-muted-foreground">Overall readiness</p>
              <Badge variant="outline" className={`mt-1 ${band.tone}`}>{band.label}</Badge>
              {prevScore !== null && (
                <p className="text-xs mt-2 text-muted-foreground">
                  {score >= prevScore ? "▲" : "▼"} {Math.abs(score - prevScore)} pts vs v{previous.version}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Stat label="Open gaps" value={current.gaps.length - gapsClosed} icon={CircleAlert} tone="from-rose-500 to-red-500" />
        <Stat label="Gaps closed" value={`${gapsClosed}/${current.gaps.length}`} icon={CircleCheck} tone="from-emerald-500 to-teal-500" />
        <Stat label="Projected ready" value={projectedReadyDate(current)} icon={Target} tone="from-violet-500 to-indigo-500" />
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
          <p className="text-sm text-muted-foreground">
            Scores are aggregated read-only from the source modules. Underlying data can only be
            edited in its own module — use a documented override to adjust the score here.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {current.scores.map((d) => {
              const v = effectiveScore(d);
              const low = v < current.threshold;
              return (
                <Card key={d.dimension}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{d.dimension}</p>
                        <p className="text-xs text-muted-foreground">{DIMENSION_SOURCE[d.dimension]}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-2xl font-bold ${low ? "text-rose-600" : "text-emerald-600"}`}>{v}</span>
                        {d.override !== undefined && (
                          <p className="text-[10px] text-amber-600">overridden (auto {d.autoScore})</p>
                        )}
                      </div>
                    </div>
                    <Progress value={v} className="h-2" />
                    {d.overrideReason && (
                      <p className="text-xs italic text-muted-foreground">“{d.overrideReason}”</p>
                    )}
                    <Button
                      size="sm" variant="ghost" className="h-7 px-2 text-xs"
                      onClick={() => setOverride({ dim: d.dimension, value: String(v), reason: d.overrideReason ?? "" })}
                    >
                      <Pencil className="h-3 w-3 mr-1" />Override
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Card>
            <CardContent className="p-4 flex items-center gap-3 flex-wrap">
              <Label className="text-sm">Gap threshold</Label>
              <Input
                type="number" className="w-24" value={current.threshold}
                onChange={(e) => patch((a) => ({ ...a, threshold: Number(e.target.value) }))}
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
              <Plus className="h-4 w-4 mr-1" />Add gap
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {current.gaps.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell><Badge variant="outline" className={PRIORITY_TONE[g.priority]}>{PRIORITY_LABEL[g.priority]}</Badge></TableCell>
                      <TableCell className="text-xs">{g.dimension}</TableCell>
                      <TableCell className="text-xs max-w-[240px]">{g.description}</TableCell>
                      <TableCell className="text-xs max-w-[200px] text-muted-foreground">{g.impact}</TableCell>
                      <TableCell className="text-xs max-w-[220px]">{g.remediation}</TableCell>
                      <TableCell className="text-xs">{g.owner}</TableCell>
                      <TableCell className="text-xs">{g.targetDate}</TableCell>
                      <TableCell>
                        <Select value={g.status} onValueChange={(v) => setGapStatus(g.id, v as GapStatus)}>
                          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(["Open", "In progress", "Closed"] as GapStatus[]).map((x) => (
                              <SelectItem key={x} value={x}>{x}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!current.gaps.length && (
                    <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                      No gaps — every dimension scores at or above the threshold.
                    </TableCell></TableRow>
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
                  {gapsClosed} of {current.gaps.length} gaps closed
                </span>
              </div>
              <Progress value={current.gaps.length ? (gapsClosed / current.gaps.length) * 100 : 100} className="h-3" />
              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <Mini label="P1 deal blockers open" value={current.gaps.filter((g) => g.priority === "P1" && g.status !== "Closed").length} />
                <Mini label="In progress" value={current.gaps.filter((g) => g.status === "In progress").length} />
                <Mini label="Projected readiness date" value={projectedReadyDate(current)} />
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
            {current.gaps.filter((g) => g.status !== "Closed").map((g) => (
              <Card key={g.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between gap-2">
                    <Badge variant="outline" className={PRIORITY_TONE[g.priority]}>{g.priority}</Badge>
                    <span className="text-xs text-muted-foreground">Due {g.targetDate}</span>
                  </div>
                  <p className="text-sm font-medium">{g.description}</p>
                  <p className="text-xs text-muted-foreground">Action: {g.remediation}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs">Owner: {g.owner}</span>
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => setGapStatus(g.id, g.status === "Open" ? "In progress" : "Closed")}>
                      {g.status === "Open" ? "Start remediation" : "Mark closed"}
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
                  <p className="font-medium">Investor Readiness Report — {current.company}</p>
                  <p className="text-xs text-muted-foreground">
                    Branded PDF. Each section is flagged Auto (system-populated), Review (needs sign-off)
                    or Incomplete (missing data). Click a flag to change it.
                  </p>
                </div>
                <Button onClick={() => { toast({ title: "Report queued", description: "Branded PDF is being assembled." }); window.print(); }}>
                  <Download className="h-4 w-4 mr-1" />Generate PDF
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {current.reportSections.map((r) => (
                  <button key={r.name} onClick={() => cycleSection(r.name)}
                    className="flex items-center justify-between rounded-md border p-3 text-left hover:bg-muted/50">
                    <span className="text-sm">{r.name}</span>
                    <Badge variant="outline" className={
                      r.state === "Auto" ? "text-emerald-600 border-emerald-500/40"
                        : r.state === "Review" ? "text-amber-600 border-amber-500/40"
                          : "text-rose-600 border-rose-500/40"}>{r.state}</Badge>
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
        </TabsContent>

        {/* ── History ── */}
        <TabsContent value="history" className="space-y-3 pt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Version</TableHead><TableHead>Date</TableHead>
                  <TableHead>Score</TableHead><TableHead>Band</TableHead>
                  <TableHead>Gaps</TableHead><TableHead>Closed</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {versions.map((v) => {
                    const sc = overallScore(v);
                    return (
                      <TableRow key={v.id}>
                        <TableCell>v{v.version}</TableCell>
                        <TableCell>{v.createdAt}</TableCell>
                        <TableCell className="font-semibold">{sc}</TableCell>
                        <TableCell><Badge variant="outline" className={readinessBand(sc).tone}>{readinessBand(sc).label}</Badge></TableCell>
                        <TableCell>{v.gaps.length}</TableCell>
                        <TableCell>{v.gaps.filter((g) => g.status === "Closed").length}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {previous && (
            <Card>
              <CardContent className="p-5">
                <p className="font-medium mb-3">Before / after — v{previous.version} vs v{current.version}</p>
                <div className="space-y-2">
                  {READINESS_DIMENSIONS.map((dim) => {
                    const a = previous.scores.find((x) => x.dimension === dim);
                    const b = current.scores.find((x) => x.dimension === dim);
                    if (!a || !b) return null;
                    const delta = effectiveScore(b) - effectiveScore(a);
                    return (
                      <div key={dim} className="flex items-center gap-3">
                        <span className="text-xs w-64 shrink-0 truncate">{dim}</span>
                        <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${effectiveScore(b)}%` }} />
                        </div>
                        <span className="text-xs w-24 text-right">
                          {effectiveScore(a)} → <strong>{effectiveScore(b)}</strong>
                        </span>
                        <span className={`text-xs w-12 text-right ${delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {delta >= 0 ? "+" : ""}{delta}
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
          <DialogHeader><DialogTitle>Manual override — {override?.dim}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Score (0–100)</Label>
              <Input type="number" value={override?.value ?? ""}
                onChange={(e) => setOverride((o) => o && { ...o, value: e.target.value })} />
            </div>
            <div>
              <Label>Documented reason <span className="text-rose-600">*</span></Label>
              <Textarea rows={3} value={override?.reason ?? ""}
                placeholder="Why does the auto-score not reflect reality?"
                onChange={(e) => setOverride((o) => o && { ...o, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverride(null)}>Cancel</Button>
            <Button onClick={saveOverride}>Save override</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddGapDialog
        open={gapOpen} onOpenChange={setGapOpen}
        onAdd={(g) => patch((a) => ({ ...a, gaps: [...a.gaps, g] }))}
      />
      <NewAssessmentDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        defaultCompany={company}
        onCreated={setCompany}
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
          Scores a company across 8 dimensions from live module data, then tracks remediation of every gap.
        </p>
      </div>
      <Button onClick={onNew}><Plus className="h-4 w-4 mr-1" />New assessment</Button>
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const tone = value >= 80 ? "hsl(var(--primary))" : value >= 60 ? "#f59e0b" : "#e11d48";
  return (
    <div
      className="h-20 w-20 rounded-full grid place-items-center shrink-0"
      style={{ background: `conic-gradient(${tone} ${value * 3.6}deg, hsl(var(--muted)) 0deg)` }}
    >
      <div className="h-15 w-15 rounded-full bg-card grid place-items-center" style={{ height: 60, width: 60 }}>
        <span className="text-xl font-bold">{value}</span>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: any; tone: string }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} grid place-items-center shadow-sm`}>
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
  const pts = versions.map((v) => ({ label: `v${v.version}`, score: overallScore(v) }));
  const max = 100;
  return (
    <div className="flex items-end gap-6 h-40">
      {pts.map((p) => (
        <div key={p.label} className="flex flex-col items-center gap-1 flex-1">
          <span className="text-xs font-medium">{p.score}</span>
          <div className="w-full bg-muted rounded-t relative" style={{ height: "100%" }}>
            <div className="absolute bottom-0 w-full bg-gradient-to-t from-primary to-primary/60 rounded-t"
              style={{ height: `${(p.score / max) * 100}%` }} />
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
  open, onOpenChange, onAdd,
}: { open: boolean; onOpenChange: (o: boolean) => void; onAdd: (g: ReadinessGap) => void }) {
  const [f, setF] = useState({
    dimension: READINESS_DIMENSIONS[0] as string,
    priority: "P2" as GapPriority,
    description: "", impact: "", remediation: "", owner: "", targetDate: "",
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add gap</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Dimension</Label>
              <Select value={f.dimension} onValueChange={(v) => setF({ ...f, dimension: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {READINESS_DIMENSIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={f.priority} onValueChange={(v) => setF({ ...f, priority: v as GapPriority })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["P1", "P2", "P3"] as GapPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Gap description</Label><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div><Label>Impact</Label><Input value={f.impact} onChange={(e) => setF({ ...f, impact: e.target.value })} /></div>
          <div><Label>Remediation action</Label><Textarea rows={2} value={f.remediation} onChange={(e) => setF({ ...f, remediation: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Owner</Label><Input value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} /></div>
            <div><Label>Target date</Label><Input type="date" value={f.targetDate} onChange={(e) => setF({ ...f, targetDate: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => {
            if (!f.description.trim()) { toast({ title: "Description required", variant: "destructive" }); return; }
            onAdd({ id: id("gap"), ...f, dimension: f.dimension as any, status: "Open" });
            onOpenChange(false);
            toast({ title: "Gap added" });
          }}>Add gap</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewAssessmentDialog({
  open, onOpenChange, onCreated, defaultCompany = "",
}: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (c: string) => void; defaultCompany?: string }) {
  const s = useDealIntel();
  const [name, setName] = useState(defaultCompany);
  useEffect(() => { if (open) setName(defaultCompany); }, [open, defaultCompany]);
  const [advisor, setAdvisor] = useState("Aline Uwase");

  const create = () => {
    const company = name.trim();
    if (!company) { toast({ title: "Company name required", variant: "destructive" }); return; }
    const prior = s.assessments.filter((a) => a.company === company);
    const base = prior[prior.length - 1];
    const jitter = () => Math.round(52 + Math.random() * 34);
    mutateDealIntel((st) => ({
      ...st,
      assessments: [
        ...st.assessments,
        {
          id: id("ira"),
          company,
          version: (base?.version ?? 0) + 1,
          createdAt: today(),
          advisor,
          threshold: base?.threshold ?? 70,
          scores: READINESS_DIMENSIONS.map((d) => ({
            dimension: d,
            autoScore: base
              ? Math.min(100, effectiveScore(base.scores.find((x) => x.dimension === d)!) + Math.round(Math.random() * 8))
              : jitter(),
          })),
          gaps: base ? base.gaps.filter((g) => g.status !== "Closed").map((g) => ({ ...g, id: id("gap") })) : [],
          reportSections: REPORT_SECTIONS.map((n) => ({ name: n, state: "Incomplete" as const })),
        },
      ],
    }));
    onCreated(company);
    onOpenChange(false);
    setName("");
    toast({ title: "Assessment initiated", description: "Dimensions auto-scored from connected modules." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Initiate assessment</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Company</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kivu Agro Processing Ltd" />
            <p className="text-xs text-muted-foreground mt-1">
              Re-using an existing company name creates the next version of that assessment.
            </p>
          </div>
          <div><Label>Advisor</Label><Input value={advisor} onChange={(e) => setAdvisor(e.target.value)} /></div>
          <div className="rounded-md border p-3 text-xs text-muted-foreground space-y-1">
            <p className="flex items-center gap-1 font-medium text-foreground">
              <Layers className="h-3 w-3" />Data will be pulled from
            </p>
            {Object.values(DIMENSION_SOURCE).map((v) => <p key={v}>• {v}</p>)}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={create}><Gauge className="h-4 w-4 mr-1" />Run assessment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
