import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, ArrowUpRight, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  mandates, utilisation, portfolioRisks, teamDirectory, ragClass, money,
} from "@/data/crmPmMockData";

const dayMs = 86400000;
const parseDate = (s: string) => new Date(s).getTime();

export default function Pmo() {
  const { toast } = useToast();
  const [clientFilter, setClientFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [memberFilter, setMemberFilter] = useState("all");

  const clients = Array.from(new Set(mandates.map((m) => m.clientName)));
  const types = Array.from(new Set(mandates.map((m) => m.type)));

  const filtered = mandates.filter(
    (m) =>
      (clientFilter === "all" || m.clientName === clientFilter) &&
      (typeFilter === "all" || m.type === typeFilter) &&
      (stageFilter === "all" || m.stage === stageFilter) &&
      (memberFilter === "all" || m.team.includes(memberFilter) || m.manager === memberFilter),
  );

  const totalBudget = mandates.reduce((s, m) => s + m.budget, 0);
  const totalCost = mandates.reduce((s, m) => s + m.actualCost, 0);
  const budgetPct = Math.round((totalCost / totalBudget) * 100);
  const atRisk = mandates.filter((m) => m.rag !== "Green").length;
  const avgUtil = Math.round(utilisation.reduce((s, u) => s + u.billable / u.available, 0) / utilisation.length * 100);

  // Gantt axis: Feb 2026 – Feb 2027
  const axisStart = parseDate("2026-02-01");
  const axisEnd = parseDate("2027-02-28");
  const axisSpan = axisEnd - axisStart;
  const today = parseDate("2026-08-01");
  const months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];

  const barStyle = (start: string, end: string) => {
    const s = Math.max(parseDate(start), axisStart);
    const e = Math.min(parseDate(end), axisEnd);
    const left = ((s - axisStart) / axisSpan) * 100;
    const width = Math.max(((e - s) / axisSpan) * 100, 1);
    return { left: `${left}%`, width: `${width}%` };
  };

  // Risk register
  const [risks, setRisks] = useState(portfolioRisks);
  const [noteRisk, setNoteRisk] = useState<typeof portfolioRisks[number] | null>(null);
  const [noteText, setNoteText] = useState("");

  const severityClass: Record<string, string> = {
    Critical: "bg-destructive/10 text-destructive",
    High: "bg-warning/10 text-warning",
    Medium: "bg-primary/10 text-primary",
    Low: "bg-success/10 text-success",
  };

  const escalate = (id: string) => {
    setRisks((rs) => rs.map((r) => (r.id === id ? { ...r, status: "Escalated" } : r)));
    toast({ title: "Escalated to portfolio", description: id });
  };

  const saveNote = () => {
    toast({ title: "Mitigation note saved", description: noteRisk?.title });
    setNoteRisk(null);
    setNoteText("");
  };

  // Resource scenario planner
  const [scenarioHrs, setScenarioHrs] = useState(40);

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
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All clients</SelectItem>{clients.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All types</SelectItem>{types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All stages</SelectItem>{Array.from(new Set(mandates.map((m) => m.stage))).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={memberFilter} onValueChange={setMemberFilter}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All team</SelectItem>{teamDirectory.filter((t) => t.mandates > 0).map((t) => <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mandate</TableHead><TableHead>RAG</TableHead><TableHead className="w-32">Progress</TableHead>
                    <TableHead>Budget consumed</TableHead><TableHead>Team</TableHead><TableHead>Deadline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.clientName}</p>
                      </TableCell>
                      <TableCell><Badge className={ragClass[m.rag]}>{m.rag}</Badge></TableCell>
                      <TableCell><Progress value={m.progress} className="h-2" /></TableCell>
                      <TableCell className="text-sm">
                        {money(m.actualCost, m.currency)} / {money(m.budget, m.currency)}
                        {m.actualCost > m.budget && <Badge className="ml-2 bg-destructive/10 text-destructive">Over</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{[m.manager, ...m.team].join(", ")}</TableCell>
                      <TableCell className="text-sm">{m.targetDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gantt" className="pt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Active mandates — Feb 2026 to Feb 2027</CardTitle></CardHeader>
            <CardContent>
              <div className="relative">
                <div className="grid text-[10px] text-muted-foreground" style={{ gridTemplateColumns: `repeat(${months.length}, 1fr)` }}>
                  {months.map((m, i) => <div key={i} className="border-l pl-1">{m}</div>)}
                </div>
                <div className="relative mt-2 space-y-3">
                  {mandates.map((m) => {
                    const style = barStyle(m.startDate, m.targetDate);
                    const notStarted = m.progress === 0;
                    return (
                      <div key={m.id} className="relative h-8">
                        <p className="absolute -top-4 left-0 text-[10px] text-muted-foreground">{m.name}</p>
                        <div className="relative h-4 w-full rounded bg-muted/40">
                          <div
                            className={`absolute top-0 h-4 rounded ${notStarted ? "border-2 border-dashed border-muted-foreground bg-transparent" : ragClass[m.rag]}`}
                            style={style}
                          >
                            {!notStarted && <span className="px-1 text-[9px] text-current">{m.progress}%</span>}
                          </div>
                          {m.stage === "Review" && (
                            <div className="absolute -top-1 h-6 w-1.5 rotate-45 bg-warning" style={{ left: style.left }} title="Milestone" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div
                    className="pointer-events-none absolute top-0 h-full w-px bg-destructive"
                    style={{ left: `${((today - axisStart) / axisSpan) * 100}%` }}
                  />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Dashed outline = not started. Diamond = milestone. Red line = today (1 Aug 2026).</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget" className="pt-4">
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mandate</TableHead><TableHead className="text-right">Budget</TableHead><TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead><TableHead className="text-right">Forecast at completion</TableHead><TableHead>Alert</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mandates.map((m) => {
                    const variance = m.budget - m.actualCost;
                    const forecast = m.progress > 0 ? Math.round(m.actualCost / (m.progress / 100)) : m.budget;
                    const over = forecast > m.budget;
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm font-medium">{m.name}</TableCell>
                        <TableCell className="text-right text-sm">{money(m.budget, m.currency)}</TableCell>
                        <TableCell className="text-right text-sm">{money(m.actualCost, m.currency)}</TableCell>
                        <TableCell className={`text-right text-sm ${variance < 0 ? "text-destructive" : "text-success"}`}>{money(variance, m.currency)}</TableCell>
                        <TableCell className="text-right text-sm">{money(forecast, m.currency)}</TableCell>
                        <TableCell>
                          {over ? (
                            <Badge className="bg-destructive/10 text-destructive"><AlertTriangle className="mr-1 h-3 w-3" /> Over budget</Badge>
                          ) : (
                            <Badge className="bg-success/10 text-success">On track</Badge>
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
              <CardHeader className="pb-2"><CardTitle className="text-sm">Capacity vs allocation</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {utilisation.map((u) => {
                  const pct = Math.round((u.billable / u.available) * 100);
                  const over = pct > 100;
                  return (
                    <div key={u.member}>
                      <div className="flex items-center justify-between text-sm">
                        <span>{u.member}</span>
                        <span className={over ? "text-destructive" : "text-muted-foreground"}>{u.billable}h / {u.available}h ({pct}%){over && " — over-allocated"}</span>
                      </div>
                      <Progress value={Math.min(pct, 100)} className="h-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Scenario planner</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Label className="text-xs">New mandate hours needed</Label>
                <Input type="number" value={scenarioHrs} onChange={(e) => setScenarioHrs(Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">Members with spare capacity for {scenarioHrs}h:</p>
                <div className="space-y-1">
                  {utilisation.filter((u) => u.available - u.billable >= scenarioHrs).map((u) => (
                    <Badge key={u.member} className="mr-1 bg-success/10 text-success">{u.member} ({u.available - u.billable}h free)</Badge>
                  ))}
                  {utilisation.every((u) => u.available - u.billable < scenarioHrs) && (
                    <p className="text-sm text-destructive">No one has enough spare capacity.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risks" className="pt-4">
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="flex items-center gap-2 rounded bg-muted p-2 text-xs text-muted-foreground">
                <ShieldAlert className="h-3.5 w-3.5" /> GRC portfolio-company risk ratings feed into this register as contextual factors.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead><TableHead>Mandate</TableHead><TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead><TableHead>Owner</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {risks.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm font-medium">{r.title}</TableCell>
                      <TableCell className="text-sm">{r.mandate}</TableCell>
                      <TableCell><Badge variant="outline">{r.type}</Badge></TableCell>
                      <TableCell><Badge className={severityClass[r.severity]}>{r.severity}</Badge></TableCell>
                      <TableCell className="text-sm">{r.owner}</TableCell>
                      <TableCell className="text-sm">{r.status}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setNoteRisk(r)}>Mitigation notes</Button>
                          {r.status !== "Escalated" && (
                            <Button size="sm" variant="outline" onClick={() => escalate(r.id)}><ArrowUpRight className="mr-1 h-3.5 w-3.5" /> Escalate</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!noteRisk} onOpenChange={(o) => !o && setNoteRisk(null)}>
        <DialogContent>
          {noteRisk && (
            <>
              <DialogHeader><DialogTitle>Mitigation notes — {noteRisk.title}</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">Impact: {noteRisk.impact}</p>
              <Textarea placeholder="Add mitigation note…" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
              <DialogFooter><Button onClick={saveNote}>Save note</Button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
