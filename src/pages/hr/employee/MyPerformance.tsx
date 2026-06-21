// HR > Employee > My Performance — employee-side of the Jameela M1 review.
// Sections completed by employee: 1 (read-only), 2 self-scores, 3 self, 4 self,
// 5 narrative, 7.1 training needs + short/long-term career goals, sign-off.

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Award, Target, Star, TrendingUp, CheckCircle2, Sparkles, Calendar, Send,
  Plus, Trash2, FileSignature, GraduationCap, ClipboardList,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  perfStore, usePerfStore, newId,
  computeKpiTotal, kpiRatingBand, competencyAverage, valuesAverage,
  type Scorecard, type ReviewStatus, type PreviousGoal, type TrainingItem,
} from "@/lib/performanceStore";
import { employees } from "@/data/hrMockData";

const statusTone: Record<ReviewStatus, string> = {
  "Not Started": "bg-muted text-muted-foreground",
  "Self Review": "bg-info/10 text-info border-info/20",
  "Manager Review": "bg-warning/10 text-warning border-warning/20",
  "Calibration": "bg-violet-500/10 text-violet-600 border-violet-500/20",
  "Completed": "bg-success/10 text-success border-success/20",
};

export default function MyPerformance() {
  const { user } = useAuth();
  const employeeId = useMemo(() => {
    const match = employees.find((e) => e.email.toLowerCase() === (user?.email ?? "").toLowerCase());
    return match?.id ?? employees[0]?.id;
  }, [user?.email]);

  const scorecards = usePerfStore((s) => s.scorecards.filter((sc) => sc.employeeId === employeeId));
  const feedback = usePerfStore((s) => s.feedback.filter((f) => f.employeeId === employeeId));

  const active = scorecards.find((s) => !["Completed"].includes(s.status)) ?? scorecards[0];
  const completed = scorecards.filter((s) => s.status === "Completed");

  const selfProgress = useMemo(() => {
    if (!active) return 0;
    const total = active.kpas.length + (active.competencies?.length ?? 0) + (active.values?.length ?? 0);
    if (!total) return 0;
    const filled = active.kpas.filter((k) => typeof k.selfScore === "number").length
      + (active.competencies?.filter((c) => typeof c.selfScore === "number").length ?? 0)
      + (active.values?.filter((c) => typeof c.selfScore === "number").length ?? 0);
    return Math.round((filled / total) * 100);
  }, [active]);

  const latestFinal = completed[0]?.finalRating ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Performance</h1>
        <p className="text-sm text-muted-foreground">
          Complete each section of your review. Blue inputs are yours; manager scores and notes appear once submitted.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Status" value={active ? active.status : "—"} icon={Calendar} tone="from-primary to-secondary" />
        <Stat label="Self-Review Progress" value={`${selfProgress}%`} icon={TrendingUp} tone="from-blue-500 to-cyan-500" />
        <Stat label="Latest Score" value={latestFinal ? `${latestFinal}/100` : "—"} icon={Star} tone="from-amber-500 to-orange-500" />
        <Stat label="Past Reviews" value={completed.length} icon={CheckCircle2} tone="from-emerald-500 to-teal-500" />
      </div>

      <Tabs defaultValue="current" className="space-y-4">
        <TabsList>
          <TabsTrigger value="current">Current Review</TabsTrigger>
          <TabsTrigger value="history">Past Reviews</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-3">
          {!active && (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">
              No review cycle assigned to you yet.
            </CardContent></Card>
          )}
          {active && <CurrentReview sc={active} />}
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {completed.length === 0 && (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">No completed reviews yet.</CardContent></Card>
          )}
          {completed.map((sc) => {
            const band = kpiRatingBand(sc.finalRating ?? 0);
            return (
              <Card key={sc.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-semibold">Review · {sc.cycleId}</h3>
                      <p className="text-xs text-muted-foreground">Finalised {sc.finalisedAt?.slice(0, 10)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={band.tone}>{band.label}</Badge>
                      <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1.5 rounded-lg">
                        <Star className="h-4 w-4 fill-white" />
                        <span className="font-bold">{sc.finalRating}</span>
                        <span className="text-xs opacity-80">/100</span>
                      </div>
                    </div>
                  </div>
                  {sc.managerEvaluation?.thisPeriodAssessment && (
                    <div className="text-sm mt-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Manager assessment</p>
                      <p className="whitespace-pre-wrap">{sc.managerEvaluation.thisPeriodAssessment}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="feedback" className="space-y-3">
          {feedback.length === 0 && (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">No feedback shared with you yet.</CardContent></Card>
          )}
          {feedback.map((f) => (
            <Card key={f.id}>
              <CardContent className="p-4 flex gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs font-semibold">
                    {f.from.split(" ").slice(0, 2).map((p) => p[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{f.from}</p>
                    <Badge variant="outline" className={
                      f.type === "Praise" ? "bg-success/10 text-success border-success/20" :
                      f.type === "Constructive" ? "bg-warning/10 text-warning border-warning/20" :
                      "bg-info/10 text-info border-info/20"
                    }>{f.type}</Badge>
                    <span className="text-xs text-muted-foreground">{f.date}</span>
                  </div>
                  <p className="text-sm mt-1">{f.message}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

function CurrentReview({ sc }: { sc: Scorecard }) {
  const { toast } = useToast();

  // ── local editable copy
  const [kpas, setKpas] = useState(sc.kpas.map((k) => ({ id: k.id, selfScore: k.selfScore })));
  const [comps, setComps] = useState((sc.competencies ?? []).map((c) => ({ id: c.id, selfScore: c.selfScore, employeeComment: c.employeeComment })));
  const [vals, setVals] = useState((sc.values ?? []).map((c) => ({ id: c.id, selfScore: c.selfScore, employeeComment: c.employeeComment })));
  const [achievements, setAchievements] = useState(sc.achievements ?? "");
  const [challenges, setChallenges] = useState(sc.challenges ?? "");
  const [prevGoals, setPrevGoals] = useState<PreviousGoal[]>(JSON.parse(JSON.stringify(sc.previousGoals ?? [])));
  const [training, setTraining] = useState<TrainingItem[]>(JSON.parse(JSON.stringify(sc.training ?? [])));
  const [shortTerm, setShortTerm] = useState(sc.shortTermCareer ?? "");
  const [longTerm, setLongTerm] = useState(sc.longTermCareer ?? "");
  const [employeeFeedback, setEmployeeFeedback] = useState(sc.employeeFeedback ?? "");
  const [openSubmit, setOpenSubmit] = useState(false);

  useEffect(() => {
    setKpas(sc.kpas.map((k) => ({ id: k.id, selfScore: k.selfScore })));
    setComps((sc.competencies ?? []).map((c) => ({ id: c.id, selfScore: c.selfScore, employeeComment: c.employeeComment })));
    setVals((sc.values ?? []).map((c) => ({ id: c.id, selfScore: c.selfScore, employeeComment: c.employeeComment })));
    setAchievements(sc.achievements ?? "");
    setChallenges(sc.challenges ?? "");
    setPrevGoals(JSON.parse(JSON.stringify(sc.previousGoals ?? [])));
    setTraining(JSON.parse(JSON.stringify(sc.training ?? [])));
    setShortTerm(sc.shortTermCareer ?? "");
    setLongTerm(sc.longTermCareer ?? "");
    setEmployeeFeedback(sc.employeeFeedback ?? "");
  }, [sc.id]);

  const locked = !["Self Review", "Not Started"].includes(sc.status);

  // ── derived
  const liveSc: Scorecard = {
    ...sc,
    kpas: sc.kpas.map((k) => ({ ...k, selfScore: kpas.find((x) => x.id === k.id)?.selfScore })),
    competencies: (sc.competencies ?? []).map((c) => ({ ...c, selfScore: comps.find((x) => x.id === c.id)?.selfScore })),
    values: (sc.values ?? []).map((c) => ({ ...c, selfScore: vals.find((x) => x.id === c.id)?.selfScore })),
  };
  const selfTotal = computeKpiTotal(liveSc, "self");
  const combined = computeKpiTotal(liveSc, "combined");
  const compAvg = competencyAverage(liveSc);
  const valAvg = valuesAverage(liveSc);

  const submit = () => {
    perfStore.submitSelfReview(sc.id, {
      kpas,
      competencies: comps,
      values: vals,
      achievements,
      challenges,
      previousGoals: prevGoals,
      training,
      shortTermCareer: shortTerm,
      longTermCareer: longTerm,
    });
    setOpenSubmit(false);
    toast({ title: "Self-review submitted", description: "Your manager has been notified." });
  };

  const saveDraft = () => {
    // Save without changing status
    const next: Partial<Scorecard> = {
      kpas: sc.kpas.map((k) => ({ ...k, selfScore: kpas.find((x) => x.id === k.id)?.selfScore })),
      competencies: (sc.competencies ?? []).map((c) => ({ ...c, selfScore: comps.find((x) => x.id === c.id)?.selfScore, employeeComment: comps.find((x) => x.id === c.id)?.employeeComment })),
      values: (sc.values ?? []).map((c) => ({ ...c, selfScore: vals.find((x) => x.id === c.id)?.selfScore, employeeComment: vals.find((x) => x.id === c.id)?.employeeComment })),
      achievements,
      challenges,
      previousGoals: prevGoals,
      training,
      shortTermCareer: shortTerm,
      longTermCareer: longTerm,
    };
    perfStore.patchScorecard(sc.id, next);
    toast({ title: "Draft saved" });
  };

  const signAndAcknowledge = () => {
    perfStore.patchScorecard(sc.id, { employeeFeedback });
    perfStore.signEmployee(sc.id);
    toast({ title: "Review acknowledged", description: "Thank you for signing." });
  };

  const band = kpiRatingBand(combined);

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-semibold">My review · {sc.cycleId}</h3>
            <p className="text-xs text-muted-foreground">Self-score honestly from 1 (below) to 5 (exceeds).</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={statusTone[sc.status]}>{sc.status}</Badge>
            {combined > 0 && <Badge variant="outline" className={band.tone}>{combined}/100 · {band.label}</Badge>}
          </div>
        </div>

        <Tabs defaultValue="info">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="info">1 · Info</TabsTrigger>
            <TabsTrigger value="kpis">2 · KPIs</TabsTrigger>
            <TabsTrigger value="skills">3 · Skills</TabsTrigger>
            <TabsTrigger value="values">4 · Values</TabsTrigger>
            <TabsTrigger value="self">5 · Self-Assessment</TabsTrigger>
            <TabsTrigger value="goals">6 · Goals</TabsTrigger>
            <TabsTrigger value="dev">7 · Development</TabsTrigger>
            <TabsTrigger value="signoff">Sign-off</TabsTrigger>
          </TabsList>

          {/* INFO */}
          <TabsContent value="info" className="space-y-3 pt-3">
            <Card><CardContent className="p-4 grid sm:grid-cols-2 gap-3 text-sm">
              <Read label="Job Title" value={sc.info?.jobTitle} />
              <Read label="Department" value={sc.info?.department} />
              <Read label="Manager / Supervisor" value={sc.info?.manager} />
              <Read label="Review Period" value={sc.info?.reviewPeriod} />
              <Read label="Date of Review" value={sc.info?.reviewDate} />
              <Read label="Review Type" value={sc.info?.reviewType} />
            </CardContent></Card>
            {sc.compliance && sc.compliance.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Compliance checks (read-only)</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {sc.compliance.map((c) => (
                    <div key={c.id} className="flex justify-between gap-3 border-b last:border-0 py-1">
                      <span>{c.question}</span>
                      <span className="text-muted-foreground">{c.answer ?? "—"}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* KPIs */}
          <TabsContent value="kpis" className="space-y-3 pt-3">
            {sc.kpas.length === 0 && <p className="text-sm text-muted-foreground">Your manager hasn't finalised your KPAs yet.</p>}
            {sc.kpas.map((kpa, idx) => {
              const my = kpas.find((x) => x.id === kpa.id);
              return (
                <Card key={kpa.id}><CardContent className="p-4 space-y-2">
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">#{idx + 1} · {kpa.title}</p>
                      <p className="text-xs text-muted-foreground">{kpa.description}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0 self-start">Weight {kpa.weight}%</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 items-end">
                    <div>
                      <Label className="text-xs">My self-score (1–5)</Label>
                      <Input type="number" min={1} max={5} step={0.1} disabled={locked} value={my?.selfScore ?? ""} onChange={(e) => {
                        const next = kpas.map((k) => k.id === kpa.id ? { ...k, selfScore: e.target.value === "" ? undefined : +e.target.value } : k);
                        setKpas(next);
                      }} />
                    </div>
                    <div>
                      <Label className="text-xs">Manager score</Label>
                      <Input disabled value={kpa.managerScore ?? "—"} />
                    </div>
                  </div>
                </CardContent></Card>
              );
            })}
            {sc.kpas.length > 0 && (
              <Card><CardContent className="p-3 flex justify-between bg-muted/30">
                <span className="text-sm">My total so far</span>
                <span className="font-semibold">{selfTotal} / 100</span>
              </CardContent></Card>
            )}
          </TabsContent>

          {/* SKILLS */}
          <TabsContent value="skills" className="space-y-2 pt-3">
            {(sc.competencies ?? []).map((c) => {
              const my = comps.find((x) => x.id === c.id);
              return (
                <Card key={c.id}><CardContent className="p-3 space-y-2">
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.description}</p>
                  </div>
                  <div className="grid sm:grid-cols-[120px_1fr] gap-2">
                    <Input type="number" min={1} max={5} step={0.1} placeholder="Self /5" disabled={locked} value={my?.selfScore ?? ""} onChange={(e) => {
                      setComps(comps.map((x) => x.id === c.id ? { ...x, selfScore: e.target.value === "" ? undefined : +e.target.value } : x));
                    }} />
                    <Textarea rows={2} placeholder="My comment" disabled={locked} value={my?.employeeComment ?? ""} onChange={(e) => {
                      setComps(comps.map((x) => x.id === c.id ? { ...x, employeeComment: e.target.value } : x));
                    }} />
                  </div>
                  {c.managerObservation && (
                    <div className="rounded-md bg-muted/40 p-2 text-xs">
                      <span className="font-medium">Manager ({c.managerScore ?? "—"}/5): </span>{c.managerObservation}
                    </div>
                  )}
                </CardContent></Card>
              );
            })}
            <Card><CardContent className="p-3 flex justify-between bg-muted/30">
              <span className="text-sm">Overall competency (avg)</span><span className="font-semibold">{compAvg || "—"} / 5</span>
            </CardContent></Card>
          </TabsContent>

          {/* VALUES */}
          <TabsContent value="values" className="space-y-2 pt-3">
            {(sc.values ?? []).map((c) => {
              const my = vals.find((x) => x.id === c.id);
              return (
                <Card key={c.id}><CardContent className="p-3 space-y-2">
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.description}</p>
                  </div>
                  <div className="grid sm:grid-cols-[120px_1fr] gap-2">
                    <Input type="number" min={1} max={5} step={0.1} placeholder="Self /5" disabled={locked} value={my?.selfScore ?? ""} onChange={(e) => {
                      setVals(vals.map((x) => x.id === c.id ? { ...x, selfScore: e.target.value === "" ? undefined : +e.target.value } : x));
                    }} />
                    <Textarea rows={2} placeholder="My comment" disabled={locked} value={my?.employeeComment ?? ""} onChange={(e) => {
                      setVals(vals.map((x) => x.id === c.id ? { ...x, employeeComment: e.target.value } : x));
                    }} />
                  </div>
                  {c.managerObservation && (
                    <div className="rounded-md bg-muted/40 p-2 text-xs">
                      <span className="font-medium">Manager ({c.managerScore ?? "—"}/5): </span>{c.managerObservation}
                    </div>
                  )}
                </CardContent></Card>
              );
            })}
            <Card><CardContent className="p-3 flex justify-between bg-muted/30">
              <span className="text-sm">Overall values (avg)</span><span className="font-semibold">{valAvg || "—"} / 5</span>
            </CardContent></Card>
          </TabsContent>

          {/* SELF-ASSESSMENT */}
          <TabsContent value="self" className="space-y-3 pt-3">
            <div>
              <Label>5.1 Key achievements & accomplishments</Label>
              <Textarea className="mt-1.5" rows={4} disabled={locked} value={achievements} onChange={(e) => setAchievements(e.target.value)} placeholder="List your key achievements and accomplishments during this review period…" />
            </div>
            <div>
              <Label>5.2 Challenges faced (and how you addressed them)</Label>
              <Textarea className="mt-1.5" rows={4} disabled={locked} value={challenges} onChange={(e) => setChallenges(e.target.value)} placeholder="Describe the main challenges and the steps you took…" />
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">5.3 Previous goals review</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {prevGoals.map((g, i) => (
                  <div key={g.id} className="grid sm:grid-cols-[1fr_140px_1fr_auto] gap-2 items-start">
                    <Textarea rows={2} disabled={locked} value={g.goal} onChange={(e) => { const n = [...prevGoals]; n[i] = { ...g, goal: e.target.value }; setPrevGoals(n); }} placeholder="Goal set in previous period" />
                    <Select value={g.status ?? ""} onValueChange={(v) => { const n = [...prevGoals]; n[i] = { ...g, status: v as any }; setPrevGoals(n); }} disabled={locked}>
                      <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        {["Achieved", "Partially Achieved", "Not Achieved", "Carried Over"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Textarea rows={2} disabled={locked} value={g.employeeComments ?? ""} onChange={(e) => { const n = [...prevGoals]; n[i] = { ...g, employeeComments: e.target.value }; setPrevGoals(n); }} placeholder="My comments" />
                    <Button size="icon" variant="ghost" disabled={locked} onClick={() => setPrevGoals(prevGoals.filter((x) => x.id !== g.id))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" disabled={locked} onClick={() => setPrevGoals([...prevGoals, { id: newId("pg"), goal: "" }])}>
                  <Plus className="h-3 w-3 mr-1" /> Add goal
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* NEXT GOALS (read-only — set by manager) */}
          <TabsContent value="goals" className="space-y-2 pt-3">
            <p className="text-xs text-muted-foreground">Goals for the next period are agreed with your manager and shown here once set.</p>
            {(sc.nextGoals ?? []).length === 0 && <p className="text-sm text-muted-foreground italic">No goals set yet.</p>}
            {(sc.nextGoals ?? []).map((g, i) => (
              <Card key={g.id}><CardContent className="p-3 space-y-1">
                <div className="flex justify-between gap-2">
                  <p className="text-sm font-medium">#{i + 1} · {g.description}</p>
                  <Badge variant="outline">{g.priority ?? "—"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Timeline: {g.timeline ?? "—"}</p>
                {g.managerComments && <p className="text-xs">{g.managerComments}</p>}
              </CardContent></Card>
            ))}
          </TabsContent>

          {/* DEVELOPMENT */}
          <TabsContent value="dev" className="space-y-3 pt-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="h-4 w-4" /> 7.1 Training & development needs</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {training.map((t, i) => (
                  <div key={t.id} className="grid sm:grid-cols-[1fr_140px_auto] gap-2 items-start">
                    <Input disabled={locked} value={t.area} onChange={(e) => { const n = [...training]; n[i] = { ...t, area: e.target.value }; setTraining(n); }} placeholder="Training / development area" />
                    <Select value={t.priority ?? ""} onValueChange={(v) => { const n = [...training]; n[i] = { ...t, priority: v as any }; setTraining(n); }} disabled={locked}>
                      <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                      <SelectContent>
                        {["High", "Medium", "Low"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" disabled={locked} onClick={() => setTraining(training.filter((x) => x.id !== t.id))}><Trash2 className="h-4 w-4" /></Button>
                    {t.managementRecommendation && (
                      <p className="sm:col-span-3 text-xs rounded-md bg-muted/40 p-2"><span className="font-medium">Management: </span>{t.managementRecommendation}</p>
                    )}
                  </div>
                ))}
                <Button size="sm" variant="outline" disabled={locked} onClick={() => setTraining([...training, { id: newId("t"), area: "" }])}><Plus className="h-3 w-3 mr-1" /> Add training need</Button>
              </CardContent>
            </Card>
            <div>
              <Label>7.2 Short-term career goals (6–12 months)</Label>
              <Textarea className="mt-1.5" rows={3} disabled={locked} value={shortTerm} onChange={(e) => setShortTerm(e.target.value)} placeholder="Describe the skills, experience or roles you're working towards…" />
            </div>
            <div>
              <Label>7.3 Long-term career goals (3–5 years)</Label>
              <Textarea className="mt-1.5" rows={3} disabled={locked} value={longTerm} onChange={(e) => setLongTerm(e.target.value)} placeholder="Where do you aim to be in your career?" />
            </div>
          </TabsContent>

          {/* SIGN-OFF */}
          <TabsContent value="signoff" className="space-y-3 pt-3">
            <div>
              <Label>My comments / feedback to management (optional)</Label>
              <Textarea className="mt-1.5" rows={4} value={employeeFeedback} onChange={(e) => setEmployeeFeedback(e.target.value)} placeholder="Anything you'd like leadership to know…" />
            </div>
            <Card><CardContent className="p-4 flex items-center justify-between">
              <div className="text-sm">
                <p className="font-medium flex items-center gap-2"><FileSignature className="h-4 w-4" /> Acknowledge & sign</p>
                <p className="text-xs text-muted-foreground">By signing, you confirm the review has been discussed and you understand its contents.</p>
              </div>
              {sc.employeeSignedAt
                ? <Badge variant="outline" className="bg-success/10 text-success border-success/20">Signed {new Date(sc.employeeSignedAt).toLocaleDateString()}</Badge>
                : <Button onClick={signAndAcknowledge} className="bg-gradient-to-r from-primary to-secondary"><FileSignature className="h-4 w-4 mr-2" /> Sign now</Button>}
            </CardContent></Card>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        {!locked && sc.kpas.length > 0 && (
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={saveDraft}>Save draft</Button>
            <Dialog open={openSubmit} onOpenChange={setOpenSubmit}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-primary to-secondary"><Send className="h-4 w-4 mr-2" /> Submit self-review</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Submit self-review?</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">Your scores and narrative will be sent to your manager. You won't be able to edit afterwards.</p>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenSubmit(false)}>Cancel</Button>
                  <Button onClick={submit} className="bg-gradient-to-r from-primary to-secondary">Submit</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {locked && sc.status !== "Completed" && (
          <p className="text-xs text-muted-foreground flex items-center gap-2 border-t pt-3">
            <Sparkles className="h-3.5 w-3.5" /> Self-review submitted — your manager is reviewing.
          </p>
        )}

        {sc.status === "Completed" && (
          <div className="rounded-lg border p-4 bg-success/5 space-y-2 mt-2">
            <div className="flex items-center gap-2"><Award className="h-4 w-4 text-success" /><p className="font-semibold text-sm">Review finalised</p></div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <Mini label="Self" value={sc.overallSelfRating} />
              <Mini label="Manager" value={sc.overallManagerRating} />
              <Mini label="Final" value={sc.finalRating} emphasis />
            </div>
            {sc.managerEvaluation?.conclusions && <p className="text-sm whitespace-pre-wrap"><span className="font-medium">Conclusions: </span>{sc.managerEvaluation.conclusions}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Read({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</p>
      <p className="mt-0.5">{value || "—"}</p>
    </div>
  );
}

function Mini({ label, value, emphasis }: { label: string; value?: number; emphasis?: boolean }) {
  return (
    <div className="rounded-md border p-2 text-center bg-background">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 ${emphasis ? "font-bold text-base" : "text-sm"}`}>{value ?? "—"}</p>
    </div>
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
