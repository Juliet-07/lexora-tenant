import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Grid3x3, Plus, Users, ShieldAlert, CheckCircle2, Download, RefreshCw,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useEsg,
  uid,
  nowStamp,
  STAKEHOLDER_GROUPS,
  MaterialTopic,
  topicStatus,
  topicShift,
} from "@/lib/grc/esgStore";
import { mutateGrc, id as grcId } from "@/lib/grcStore";
import { exportReportExcel, exportReportPdf } from "@/lib/grc/reportExport";

export default function EsgMateriality() {
  const { state, mutate } = useEsg();
  const { topics, stakeholders, cycle } = state;
  const [selected, setSelected] = useState<MaterialTopic | null>(null);

  const material = topics.filter((t) => topicStatus(t, cycle.threshold) === "Material");

  const definition = {
    id: "esg-materiality",
    title: `Double Materiality Assessment ${cycle.year}`,
    subtitle: `Threshold ${cycle.threshold} · ${cycle.status}`,
    summary: [
      { label: "Topics assessed", value: topics.length },
      { label: "Material topics", value: material.length },
      { label: "Stakeholder groups", value: stakeholders.length },
      { label: "Next reassessment", value: cycle.nextReviewDate },
    ],
    sections: [
      {
        heading: "Topic assessment",
        columns: ["Topic", "Pillar", "Financial", "Impact", "Status", "Prior peak", "Shift", "Escalated to risk", "Rationale"],
        rows: topics.map((t) => [
          t.topic, t.pillar, t.financial, t.impact,
          topicStatus(t, cycle.threshold),
          t.priorFinancial != null ? Math.max(t.priorFinancial, t.priorImpact ?? 0) : "—",
          topicShift(t), t.escalatedToRisk ? "Yes" : "No", t.rationale,
        ]),
      },
      {
        heading: "Stakeholder map",
        columns: ["Group", "Priority", "Engagement method", "Last engaged", "Input received"],
        rows: stakeholders.map((s) => [
          s.group, s.priority, s.engagementMethod, s.lastEngaged ?? "Not yet engaged", s.input || "—",
        ]),
      },
    ],
  };

  const escalate = (t: MaterialTopic) => {
    const now = nowStamp();
    mutateGrc((s) => ({
      ...s,
      risks: [
        {
          id: grcId("risk"),
          title: `ESG — ${t.topic}`,
          category: t.pillar === "Environmental" ? "Operational" : t.pillar === "Social" ? "Reputational" : "Compliance",
          description: `Escalated from the ${cycle.year} double materiality assessment. ${t.rationale}`,
          rootCauses: "Identified through stakeholder engagement and materiality scoring.",
          affectedProcesses: "Sustainability reporting, operations",
          owner: "Sustainability Lead",
          likelihood: t.impact,
          impact: t.financial,
          financialExposure: 0,
          controls: [],
          relatedRiskIds: [],
          status: "Open",
          nextReviewDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
          createdAt: now,
          updatedAt: now,
          changes: [{ at: now, note: "Created from ESG materiality assessment" }],
        } as any,
        ...s.risks,
      ],
    }));
    mutate((s) => ({
      ...s,
      topics: s.topics.map((x) => (x.id === t.id ? { ...x, escalatedToRisk: true } : x)),
    }));
    toast({ title: "Escalated to Risk Register", description: t.topic });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Grid3x3 className="h-6 w-6 text-amber-600" />Double Materiality
          </h1>
          <p className="text-sm text-muted-foreground">
            Financial materiality vs impact materiality, stakeholder input and annual reassessment.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportReportPdf(definition)}>
            <Download className="h-4 w-4 mr-1" />PDF
          </Button>
          <Button variant="outline" onClick={() => exportReportExcel(definition)}>
            <Download className="h-4 w-4 mr-1" />Excel
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
                <CardTitle className="text-base">Interactive materiality matrix</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Threshold</span>
                  <Select
                    value={String(cycle.threshold)}
                    onValueChange={(v) =>
                      mutate((s) => ({ ...s, cycle: { ...s.cycle, threshold: Number(v) } }))
                    }
                  >
                    <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-square max-w-[540px] mx-auto border rounded bg-gradient-to-tr from-emerald-500/10 via-amber-500/10 to-rose-500/20">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={"v" + n} className="absolute top-0 bottom-0 border-l border-border/60" style={{ left: `${n * 20}%` }} />
                  ))}
                  {[1, 2, 3, 4].map((n) => (
                    <div key={"h" + n} className="absolute left-0 right-0 border-t border-border/60" style={{ top: `${n * 20}%` }} />
                  ))}
                  {topics.map((t) => {
                    const st = topicStatus(t, cycle.threshold);
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelected(t)}
                        title={t.topic}
                        className={`absolute -translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-full border-2 border-background hover:scale-150 transition-transform ${
                          st === "Material" ? "bg-rose-500" : st === "Monitor" ? "bg-amber-500" : "bg-sky-500"
                        }`}
                        style={{ left: `${(t.financial / 5) * 100}%`, bottom: `${(t.impact / 5) * 100}%` }}
                      />
                    );
                  })}
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
              <CardHeader><CardTitle className="text-base">Topic detail</CardTitle></CardHeader>
              <CardContent>
                {!selected && (
                  <p className="text-sm text-muted-foreground">
                    Select a point on the matrix to score it and see stakeholder rationale.
                  </p>
                )}
                {selected && (
                  <div className="space-y-4">
                    <div>
                      <div className="font-medium">{selected.topic}</div>
                      <div className="text-xs text-muted-foreground">{selected.pillar}</div>
                    </div>
                    <ScoreSlider
                      label="Financial materiality"
                      value={selected.financial}
                      onChange={(v) => {
                        setSelected({ ...selected, financial: v });
                        mutate((s) => ({
                          ...s,
                          topics: s.topics.map((x) => (x.id === selected.id ? { ...x, financial: v, updatedAt: nowStamp() } : x)),
                        }));
                      }}
                    />
                    <ScoreSlider
                      label="Impact materiality"
                      value={selected.impact}
                      onChange={(v) => {
                        setSelected({ ...selected, impact: v });
                        mutate((s) => ({
                          ...s,
                          topics: s.topics.map((x) => (x.id === selected.id ? { ...x, impact: v, updatedAt: nowStamp() } : x)),
                        }));
                      }}
                    />
                    <div className="text-sm">{selected.rationale}</div>
                    <Badge variant="outline">{topicStatus(selected, cycle.threshold)}</Badge>
                    {!selected.escalatedToRisk && topicStatus(selected, cycle.threshold) === "Material" && (
                      <Button size="sm" className="w-full" onClick={() => { escalate(selected); setSelected({ ...selected, escalatedToRisk: true }); }}>
                        <ShieldAlert className="h-4 w-4 mr-1" />Escalate to Risk Register
                      </Button>
                    )}
                    {selected.escalatedToRisk && (
                      <div className="text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />Linked to the Risk Register
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
                onSave={(t) => {
                  mutate((s) => ({ ...s, topics: [t, ...s.topics] }));
                  toast({ title: "Topic added to the assessment" });
                }}
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
                  {topics.map((t) => {
                    const st = topicStatus(t, cycle.threshold);
                    const shift = topicShift(t);
                    return (
                      <TableRow key={t.id} className="cursor-pointer" onClick={() => setSelected(t)}>
                        <TableCell className="font-medium text-sm">{t.topic}</TableCell>
                        <TableCell className="text-sm">{t.pillar}</TableCell>
                        <TableCell>{t.financial}</TableCell>
                        <TableCell>{t.impact}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={st === "Material" ? "text-rose-600 border-rose-500/30" : st === "Monitor" ? "text-amber-600 border-amber-500/30" : ""}
                          >
                            {st}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {shift > 0 ? <span className="text-rose-600">▲ +{shift}</span> : shift < 0 ? <span className="text-emerald-600">▼ {shift}</span> : <span className="text-muted-foreground">no change</span>}
                        </TableCell>
                        <TableCell className="text-xs">
                          {t.escalatedToRisk ? <span className="text-emerald-600">Escalated</span> : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stakeholders" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />Stakeholder mapping &amp; engagement
              </CardTitle>
              <StakeholderDialog
                onSave={(sh) => {
                  mutate((s) => ({ ...s, stakeholders: [...s.stakeholders, sh] }));
                  toast({ title: "Stakeholder group added" });
                }}
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
                    <TableRow key={sh.id}>
                      <TableCell className="font-medium text-sm">{sh.group}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={sh.priority === "High" ? "text-rose-600 border-rose-500/30" : ""}>
                          {sh.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{sh.engagementMethod}</TableCell>
                      <TableCell className="text-xs">{sh.lastEngaged ?? <span className="text-amber-600">Not engaged</span>}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[280px]">{sh.input || "—"}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            mutate((s) => ({
                              ...s,
                              stakeholders: s.stakeholders.map((x) =>
                                x.id === sh.id
                                  ? { ...x, lastEngaged: new Date().toISOString().slice(0, 10) }
                                  : x,
                              ),
                            }))
                          }
                        >
                          Record engagement
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cycle" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><RefreshCw className="h-4 w-4" />Annual reassessment</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Cycle year" value={cycle.year} />
                <Stat label="Status" value={cycle.status} />
                <Stat label="Next review" value={cycle.nextReviewDate} />
                <Stat label="Approved by" value={cycle.approvedBy ?? "—"} />
              </div>

              <div>
                <div className="font-medium text-sm mb-2">Changes versus prior year</div>
                <div className="space-y-1">
                  {topics
                    .filter((t) => topicShift(t) !== 0)
                    .map((t) => (
                      <div key={t.id} className="flex justify-between border rounded px-3 py-2 text-sm">
                        <span>{t.topic}</span>
                        <span className={topicShift(t) > 0 ? "text-rose-600 text-xs" : "text-emerald-600 text-xs"}>
                          peak score {topicShift(t) > 0 ? "increased" : "decreased"} by {Math.abs(topicShift(t))} — {t.rationale}
                        </span>
                      </div>
                    ))}
                  {topics.every((t) => topicShift(t) === 0) && (
                    <div className="text-sm text-muted-foreground">No movement recorded against the prior cycle.</div>
                  )}
                </div>
              </div>

              {cycle.status === "In progress" ? (
                <Button
                  onClick={() => {
                    mutate((s) => ({
                      ...s,
                      cycle: {
                        ...s.cycle,
                        status: "Approved",
                        approvedBy: "Board Chair",
                        approvedAt: nowStamp(),
                      },
                    }));
                    toast({ title: "Materiality assessment approved", description: "Material topics are now locked for reporting." });
                  }}
                >
                  Approve assessment
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    mutate((s) => ({
                      ...s,
                      cycle: {
                        ...s.cycle,
                        year: String(Number(s.cycle.year) + 1),
                        status: "In progress",
                        approvedBy: null,
                        approvedAt: null,
                        nextReviewDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
                      },
                      topics: s.topics.map((t) => ({
                        ...t,
                        priorFinancial: t.financial,
                        priorImpact: t.impact,
                      })),
                    }));
                    toast({ title: "New assessment cycle opened" });
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />Open next cycle
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
      <span className={`w-2.5 h-2.5 rounded-full ${tone}`} />{label}
    </span>
  );
}

function ScoreSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span className="font-medium">{value}/5</span>
      </div>
      <Slider min={1} max={5} step={1} value={[value]} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

function TopicDialog({ onSave }: { onSave: (t: MaterialTopic) => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ topic: "", pillar: "Environmental", financial: 3, impact: 3, rationale: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />New topic</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add ESG topic</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Topic</Label><Input value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} /></div>
          <div>
            <Label>Pillar</Label>
            <Select value={f.pillar} onValueChange={(v) => setF({ ...f, pillar: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Environmental", "Social", "Governance"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <ScoreSlider label="Financial materiality" value={f.financial} onChange={(v) => setF({ ...f, financial: v })} />
          <ScoreSlider label="Impact materiality" value={f.impact} onChange={(v) => setF({ ...f, impact: v })} />
          <div><Label>Rationale</Label><Textarea rows={2} value={f.rationale} onChange={(e) => setF({ ...f, rationale: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (!f.topic) return toast({ title: "Topic name required", variant: "destructive" });
              onSave({
                id: uid("tp"),
                topic: f.topic,
                pillar: f.pillar as any,
                financial: f.financial,
                impact: f.impact,
                priorFinancial: null,
                priorImpact: null,
                rationale: f.rationale,
                escalatedToRisk: false,
                updatedAt: nowStamp(),
              });
              setOpen(false);
              setF({ topic: "", pillar: "Environmental", financial: 3, impact: 3, rationale: "" });
            }}
          >
            Add topic
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StakeholderDialog({ onSave }: { onSave: (s: any) => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ group: "Employees", priority: "Medium", engagementMethod: "", input: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />Add group</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Map stakeholder group</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Group</Label>
            <Select value={f.group} onValueChange={(v) => setF({ ...f, group: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAKEHOLDER_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={f.priority} onValueChange={(v) => setF({ ...f, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["High", "Medium", "Low"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Engagement method</Label><Input value={f.engagementMethod} onChange={(e) => setF({ ...f, engagementMethod: e.target.value })} /></div>
          <div><Label>Input captured</Label><Textarea rows={2} value={f.input} onChange={(e) => setF({ ...f, input: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              onSave({ ...f, id: uid("sh"), lastEngaged: null });
              setOpen(false);
              setF({ group: "Employees", priority: "Medium", engagementMethod: "", input: "" });
            }}
          >
            Add group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
