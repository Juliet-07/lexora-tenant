import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Target, Star, TrendingUp, Award, CheckCircle2, Plus, Trash2, Save, Send, Gauge, Users, Calendar,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { employees } from "@/data/hrMockData";
import {
  perfStore, usePerfStore, type KPA, type KPI, type Scorecard, type ReviewStatus, type Cycle,
} from "@/lib/performanceStore";

const statusTone: Record<ReviewStatus, string> = {
  "Not Started": "bg-muted text-muted-foreground",
  "Self Review": "bg-info/10 text-info border-info/20",
  "Manager Review": "bg-warning/10 text-warning border-warning/20",
  "Calibration": "bg-violet-500/10 text-violet-600 border-violet-500/20",
  "Completed": "bg-success/10 text-success border-success/20",
};

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

export default function HRPerformance() {
  const cycles = usePerfStore((s) => s.cycles);
  const scorecards = usePerfStore((s) => s.scorecards);
  const feedback = usePerfStore((s) => s.feedback);

  const [activeCycleId, setActiveCycleId] = useState<string>(cycles[0]?.id ?? "");
  const activeCycle = cycles.find((c) => c.id === activeCycleId) ?? cycles[0];

  const cards = useMemo(
    () => scorecards.filter((s) => s.cycleId === activeCycle?.id),
    [scorecards, activeCycle],
  );
  const completed = cards.filter((c) => c.status === "Completed");
  const inProgress = cards.filter((c) => !["Not Started", "Completed"].includes(c.status));
  const avgRating = completed.length
    ? (completed.reduce((s, c) => s + (c.finalRating ?? 0), 0) / completed.length).toFixed(2)
    : "—";

  const [selected, setSelected] = useState<Scorecard | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Performance</h1>
          <p className="text-sm text-muted-foreground">
            Set KPAs &amp; KPIs per employee, run review cycles end-to-end, and calibrate ratings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={activeCycleId} onValueChange={setActiveCycleId}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Cycle" /></SelectTrigger>
            <SelectContent>
              {cycles.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} · {c.status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <NewCycleDialog />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Active Cycle" value={activeCycle?.name ?? "—"} icon={Calendar} tone="from-primary to-secondary" />
        <Stat label="Reviews In Progress" value={inProgress.length} icon={TrendingUp} tone="from-amber-500 to-orange-500" />
        <Stat label="Completed" value={completed.length} icon={CheckCircle2} tone="from-emerald-500 to-teal-500" />
        <Stat label="Avg Final Rating" value={avgRating} icon={Star} tone="from-violet-500 to-purple-600" />
      </div>

      <Tabs defaultValue="scorecards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scorecards"><Gauge className="h-4 w-4 mr-2" /> KPAs &amp; Scorecards</TabsTrigger>
          <TabsTrigger value="reviews"><Users className="h-4 w-4 mr-2" /> Review Workflow</TabsTrigger>
          <TabsTrigger value="calibration"><Target className="h-4 w-4 mr-2" /> Calibration</TabsTrigger>
          <TabsTrigger value="feedback"><Award className="h-4 w-4 mr-2" /> Continuous Feedback</TabsTrigger>
        </TabsList>

        {/* KPA / Scorecards */}
        <TabsContent value="scorecards" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Define what each employee will be measured on for this cycle.
            </p>
            <AssignEmployeeDialog cycleId={activeCycle?.id ?? ""} existing={cards.map((c) => c.employeeId)} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {cards.map((sc) => (
              <ScorecardCard key={sc.id} sc={sc} onOpen={() => setSelected(sc)} mode="setup" />
            ))}
            {cards.length === 0 && (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">
                No employees assigned to this cycle yet. Click "Assign employee" to begin.
              </CardContent></Card>
            )}
          </div>
        </TabsContent>

        {/* Review workflow */}
        <TabsContent value="reviews" className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {cards.map((sc) => (
            <ScorecardCard key={sc.id} sc={sc} onOpen={() => setSelected(sc)} mode="review" />
          ))}
        </TabsContent>

        {/* Calibration */}
        <TabsContent value="calibration" className="space-y-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Calibration table</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="text-left py-2">Employee</th>
                      <th className="text-left">Status</th>
                      <th className="text-right">Self</th>
                      <th className="text-right">Manager</th>
                      <th className="text-right">Final</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cards.map((sc) => (
                      <tr key={sc.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{sc.employeeName}</td>
                        <td><Badge variant="outline" className={statusTone[sc.status]}>{sc.status}</Badge></td>
                        <td className="text-right">{sc.overallSelfRating ?? "—"}</td>
                        <td className="text-right">{sc.overallManagerRating ?? "—"}</td>
                        <td className="text-right font-semibold">{sc.finalRating ?? "—"}</td>
                        <td className="text-right">
                          <Button size="sm" variant="outline" onClick={() => setSelected(sc)}>Open</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback */}
        <TabsContent value="feedback" className="space-y-3">
          <AddFeedbackForm />
          {feedback.map((f) => {
            const emp = employees.find((e) => e.id === f.employeeId);
            return (
              <Card key={f.id}><CardContent className="p-4 flex gap-3">
                <Award className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm">
                      <span className="font-medium">{f.from}</span> → <span className="font-medium">{emp ? `${emp.firstName} ${emp.lastName}` : f.employeeId}</span>
                      <Badge variant="outline" className="ml-2 text-[10px]">{f.type}</Badge>
                    </p>
                    <span className="text-xs text-muted-foreground">{f.date}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{f.message}</p>
                </div>
              </CardContent></Card>
            );
          })}
        </TabsContent>
      </Tabs>

      <ScorecardSheet sc={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────

function ScorecardCard({ sc, onOpen, mode }: { sc: Scorecard; onOpen: () => void; mode: "setup" | "review" }) {
  const totalWeight = sc.kpas.reduce((s, k) => s + k.weight, 0);
  const kpiCount = sc.kpas.reduce((s, k) => s + k.kpis.length, 0);
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onOpen}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs font-semibold">
                {sc.employeeName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold truncate">{sc.employeeName}</p>
              <p className="text-xs text-muted-foreground">{sc.kpas.length} KPAs · {kpiCount} KPIs · weight {totalWeight}%</p>
            </div>
          </div>
          <Badge variant="outline" className={statusTone[sc.status]}>{sc.status}</Badge>
        </div>
        {mode === "review" && (
          <div className="grid grid-cols-3 gap-3 pt-1">
            <Metric label="Self" value={sc.overallSelfRating} />
            <Metric label="Manager" value={sc.overallManagerRating} />
            <Metric label="Final" value={sc.finalRating} emphasis />
          </div>
        )}
        {mode === "setup" && (
          <div className="space-y-1.5">
            {sc.kpas.slice(0, 3).map((k) => (
              <div key={k.id} className="text-xs flex justify-between">
                <span className="truncate">{k.title}</span>
                <span className="text-muted-foreground">{k.weight}%</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, emphasis }: { label: string; value?: number; emphasis?: boolean }) {
  return (
    <div className="rounded-md border p-2 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 ${emphasis ? "font-bold text-base" : "text-sm"}`}>{value ?? "—"}</p>
    </div>
  );
}

// ── New cycle ──
function NewCycleDialog() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Cycle>>({ name: "", startDate: "", endDate: "", selfReviewDue: "", managerReviewDue: "", status: "Active" });
  const submit = () => {
    if (!draft.name) return;
    perfStore.upsertCycle({
      id: uid("CYC"),
      name: draft.name!,
      startDate: draft.startDate ?? "",
      endDate: draft.endDate ?? "",
      selfReviewDue: draft.selfReviewDue ?? "",
      managerReviewDue: draft.managerReviewDue ?? "",
      status: (draft.status as Cycle["status"]) ?? "Active",
    });
    setOpen(false);
    toast({ title: "Cycle created", description: `${draft.name} is now ${draft.status}.` });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Plus className="h-4 w-4 mr-2" /> New cycle</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New review cycle</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input className="mt-1.5" placeholder="H2 2026" value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start</Label><Input type="date" className="mt-1.5" value={draft.startDate ?? ""} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} /></div>
            <div><Label>End</Label><Input type="date" className="mt-1.5" value={draft.endDate ?? ""} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} /></div>
            <div><Label>Self-review due</Label><Input type="date" className="mt-1.5" value={draft.selfReviewDue ?? ""} onChange={(e) => setDraft({ ...draft, selfReviewDue: e.target.value })} /></div>
            <div><Label>Manager review due</Label><Input type="date" className="mt-1.5" value={draft.managerReviewDue ?? ""} onChange={(e) => setDraft({ ...draft, managerReviewDue: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} className="bg-gradient-to-r from-primary to-secondary">Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Assign employee to cycle ──
function AssignEmployeeDialog({ cycleId, existing }: { cycleId: string; existing: string[] }) {
  const [open, setOpen] = useState(false);
  const [empId, setEmpId] = useState<string>("");
  const available = employees.filter((e) => !existing.includes(e.id));
  const submit = () => {
    const e = employees.find((x) => x.id === empId);
    if (!e || !cycleId) return;
    perfStore.upsertScorecard({
      id: `SC-${e.id}-${cycleId}-${Date.now()}`,
      employeeId: e.id,
      employeeName: `${e.firstName} ${e.lastName}`,
      cycleId,
      status: "Not Started",
      kpas: [],
    });
    setOpen(false);
    setEmpId("");
    toast({ title: "Employee assigned", description: `${e.firstName} ${e.lastName} added to this cycle.` });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-primary to-secondary"><Plus className="h-4 w-4 mr-2" /> Assign employee</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Assign employee to cycle</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Label>Employee</Label>
          <Select value={empId} onValueChange={setEmpId}>
            <SelectTrigger><SelectValue placeholder="Select an employee" /></SelectTrigger>
            <SelectContent>
              {available.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.jobTitle}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!empId} className="bg-gradient-to-r from-primary to-secondary">Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add feedback ──
function AddFeedbackForm() {
  const [empId, setEmpId] = useState("");
  const [type, setType] = useState<"Praise" | "Constructive" | "1-on-1">("Praise");
  const [msg, setMsg] = useState("");
  const submit = () => {
    if (!empId || !msg.trim()) return;
    perfStore.addFeedback({
      id: uid("F"),
      employeeId: empId,
      from: "You",
      type,
      message: msg.trim(),
      date: new Date().toISOString().slice(0, 10),
    });
    setMsg("");
    toast({ title: "Feedback shared" });
  };
  return (
    <Card>
      <CardContent className="p-4 grid md:grid-cols-[200px_160px_1fr_auto] gap-2 items-end">
        <div><Label className="text-xs">Employee</Label>
          <Select value={empId} onValueChange={setEmpId}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as any)}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Praise">Praise</SelectItem>
              <SelectItem value="Constructive">Constructive</SelectItem>
              <SelectItem value="1-on-1">1-on-1</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Message</Label>
          <Input className="mt-1.5" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Share specific, actionable feedback…" />
        </div>
        <Button onClick={submit} className="bg-gradient-to-r from-primary to-secondary">Share</Button>
      </CardContent>
    </Card>
  );
}

// ── Scorecard sheet (KPAs editor + manager review + calibration) ──
function ScorecardSheet({ sc, onClose }: { sc: Scorecard | null; onClose: () => void }) {
  const open = !!sc;
  const [kpas, setKpas] = useState<KPA[]>([]);
  const [managerComments, setManagerComments] = useState("");
  const [final, setFinal] = useState<number | undefined>();
  const [calibrationNotes, setCalibrationNotes] = useState("");

  // re-init when sheet opens
  useMemo(() => {
    if (sc) {
      setKpas(JSON.parse(JSON.stringify(sc.kpas)));
      setManagerComments(sc.managerComments ?? "");
      setFinal(sc.finalRating);
      setCalibrationNotes(sc.calibrationNotes ?? "");
    }
  }, [sc?.id]);

  if (!sc) return null;

  const totalWeight = kpas.reduce((s, k) => s + k.weight, 0);

  const addKpa = () => setKpas([...kpas, {
    id: uid("kpa"), title: "New KPA", description: "", weight: 0, kpis: [],
  }]);
  const removeKpa = (id: string) => setKpas(kpas.filter((k) => k.id !== id));
  const updateKpa = (id: string, patch: Partial<KPA>) => setKpas(kpas.map((k) => k.id === id ? { ...k, ...patch } : k));
  const addKpi = (kpaId: string) => setKpas(kpas.map((k) => k.id === kpaId
    ? { ...k, kpis: [...k.kpis, { id: uid("kpi"), name: "New KPI", target: "", metric: "", weight: 0 }] }
    : k));
  const removeKpi = (kpaId: string, kpiId: string) => setKpas(kpas.map((k) => k.id === kpaId
    ? { ...k, kpis: k.kpis.filter((x) => x.id !== kpiId) } : k));
  const updateKpi = (kpaId: string, kpiId: string, patch: Partial<KPI>) => setKpas(kpas.map((k) => k.id === kpaId
    ? { ...k, kpis: k.kpis.map((x) => x.id === kpiId ? { ...x, ...patch } : x) } : k));

  const saveKpas = () => {
    perfStore.setKpas(sc.id, kpas);
    toast({ title: "Scorecard saved", description: "Employee will see updated KPAs immediately." });
  };
  const sendToEmployee = () => {
    perfStore.setKpas(sc.id, kpas);
    perfStore.setStatus(sc.id, "Self Review");
    toast({ title: "Sent for self-review", description: `${sc.employeeName} can now complete their self-assessment.` });
    onClose();
  };
  const submitManager = () => {
    perfStore.submitManagerReview(sc.id, {
      comments: managerComments,
      kpis: kpas.flatMap((k) => k.kpis.map((x) => ({ id: x.id, managerScore: x.managerScore }))),
      final,
    });
    toast({ title: "Manager review submitted", description: "Moved to calibration." });
    onClose();
  };
  const finalise = () => {
    if (typeof final !== "number") return;
    perfStore.finalise(sc.id, final, calibrationNotes);
    toast({ title: "Review finalised", description: `${sc.employeeName} — final rating ${final}/5.` });
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{sc.employeeName}</SheetTitle>
          <SheetDescription>
            <Badge variant="outline" className={statusTone[sc.status]}>{sc.status}</Badge>
            <span className="ml-2 text-xs">Total weight {totalWeight}% (target 100%)</span>
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="kpas" className="mt-5">
          <TabsList>
            <TabsTrigger value="kpas">KPAs &amp; KPIs</TabsTrigger>
            <TabsTrigger value="manager">Manager review</TabsTrigger>
            <TabsTrigger value="calibration">Calibration</TabsTrigger>
            <TabsTrigger value="employee">Employee view</TabsTrigger>
          </TabsList>

          <TabsContent value="kpas" className="space-y-4">
            {kpas.map((kpa) => (
              <Card key={kpa.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 grid grid-cols-[1fr_90px] gap-2">
                      <Input value={kpa.title} onChange={(e) => updateKpa(kpa.id, { title: e.target.value })} placeholder="KPA title" />
                      <Input type="number" value={kpa.weight} onChange={(e) => updateKpa(kpa.id, { weight: +e.target.value })} placeholder="Weight %" />
                      <Textarea className="col-span-2" rows={2} value={kpa.description} onChange={(e) => updateKpa(kpa.id, { description: e.target.value })} placeholder="Why this matters…" />
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeKpa(kpa.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">KPIs</div>
                    {kpa.kpis.map((kpi) => (
                      <div key={kpi.id} className="grid grid-cols-[1fr_110px_110px_70px_auto] gap-2 items-center">
                        <Input value={kpi.name} onChange={(e) => updateKpi(kpa.id, kpi.id, { name: e.target.value })} placeholder="KPI name" />
                        <Input value={kpi.target} onChange={(e) => updateKpi(kpa.id, kpi.id, { target: e.target.value })} placeholder="Target" />
                        <Input value={kpi.metric} onChange={(e) => updateKpi(kpa.id, kpi.id, { metric: e.target.value })} placeholder="Metric" />
                        <Input type="number" value={kpi.weight} onChange={(e) => updateKpi(kpa.id, kpi.id, { weight: +e.target.value })} placeholder="Wt %" />
                        <Button size="icon" variant="ghost" onClick={() => removeKpi(kpa.id, kpi.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => addKpi(kpa.id)}><Plus className="h-3 w-3 mr-1" /> Add KPI</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" onClick={addKpa}><Plus className="h-4 w-4 mr-2" /> Add KPA</Button>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={saveKpas}><Save className="h-4 w-4 mr-2" /> Save draft</Button>
              <Button onClick={sendToEmployee} className="bg-gradient-to-r from-primary to-secondary"><Send className="h-4 w-4 mr-2" /> Send for self-review</Button>
            </div>
          </TabsContent>

          <TabsContent value="manager" className="space-y-4">
            {sc.selfReflection && (
              <Card><CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Employee self-reflection</p>
                <p className="text-sm whitespace-pre-wrap">{sc.selfReflection}</p>
              </CardContent></Card>
            )}
            <div className="space-y-3">
              {kpas.map((kpa) => (
                <Card key={kpa.id}><CardContent className="p-4 space-y-2">
                  <div className="flex justify-between"><p className="font-semibold text-sm">{kpa.title}</p><Badge variant="outline">{kpa.weight}%</Badge></div>
                  {kpa.kpis.map((kpi) => (
                    <div key={kpi.id} className="grid grid-cols-[1fr_120px_90px] gap-2 items-center">
                      <div className="text-sm">
                        <p>{kpi.name}</p>
                        <p className="text-xs text-muted-foreground">Target {kpi.target} · Self: {kpi.selfScore ?? "—"} · Actual: {kpi.actual ?? "—"}</p>
                      </div>
                      <Input value={kpi.actual ?? ""} onChange={(e) => updateKpi(kpa.id, kpi.id, { actual: e.target.value })} placeholder="Actual" />
                      <Input type="number" min={1} max={5} step={0.1} value={kpi.managerScore ?? ""} onChange={(e) => updateKpi(kpa.id, kpi.id, { managerScore: +e.target.value })} placeholder="Score /5" />
                    </div>
                  ))}
                </CardContent></Card>
              ))}
            </div>
            <div>
              <Label>Manager comments</Label>
              <Textarea rows={4} className="mt-1.5" value={managerComments} onChange={(e) => setManagerComments(e.target.value)} placeholder="Strengths, areas to improve, development plan…" />
            </div>
            <div className="flex items-end justify-between gap-3">
              <div className="flex-1">
                <Label>Proposed final rating (1–5)</Label>
                <Input type="number" min={1} max={5} step={0.1} className="mt-1.5 max-w-[120px]" value={final ?? ""} onChange={(e) => setFinal(+e.target.value)} />
              </div>
              <Button onClick={submitManager} className="bg-gradient-to-r from-primary to-secondary"><Send className="h-4 w-4 mr-2" /> Submit & calibrate</Button>
            </div>
          </TabsContent>

          <TabsContent value="calibration" className="space-y-3">
            <Card><CardContent className="p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span>Self overall</span><span className="font-semibold">{sc.overallSelfRating ?? "—"}</span></div>
              <div className="flex justify-between"><span>Manager overall</span><span className="font-semibold">{sc.overallManagerRating ?? "—"}</span></div>
              <div className="flex justify-between"><span>Proposed final</span><span className="font-semibold">{sc.finalRating ?? "—"}</span></div>
            </CardContent></Card>
            <div>
              <Label>Override final rating</Label>
              <Input type="number" min={1} max={5} step={0.1} className="mt-1.5 max-w-[120px]" value={final ?? ""} onChange={(e) => setFinal(+e.target.value)} />
            </div>
            <div>
              <Label>Calibration notes</Label>
              <Textarea rows={3} className="mt-1.5" value={calibrationNotes} onChange={(e) => setCalibrationNotes(e.target.value)} placeholder="Notes from the calibration committee…" />
            </div>
            <div className="flex justify-end">
              <Button onClick={finalise} disabled={typeof final !== "number"} className="bg-gradient-to-r from-primary to-secondary"><CheckCircle2 className="h-4 w-4 mr-2" /> Finalise review</Button>
            </div>
          </TabsContent>

          <TabsContent value="employee" className="space-y-3">
            <p className="text-xs text-muted-foreground">Preview of what the employee sees in <strong>My Performance</strong>.</p>
            {kpas.map((kpa) => {
              const kpiAvg = kpa.kpis.reduce((s, k) => s + (k.managerScore ?? k.selfScore ?? 0), 0) / Math.max(1, kpa.kpis.length);
              const pct = Math.min(100, Math.round((kpiAvg / 5) * 100));
              return (
                <Card key={kpa.id}><CardContent className="p-4">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{kpa.title}</span>
                    <span className="text-muted-foreground">{kpa.weight}% · {pct}%</span>
                  </div>
                  <Progress value={pct} className="h-2 mt-2" />
                </CardContent></Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: any; icon: any; tone: string }) {
  return (
    <Card><CardContent className="p-5 flex items-center justify-between">
      <div><p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p><p className="text-2xl font-bold mt-1">{value}</p></div>
      <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center`}><Icon className="h-5 w-5 text-white" /></div>
    </CardContent></Card>
  );
}
