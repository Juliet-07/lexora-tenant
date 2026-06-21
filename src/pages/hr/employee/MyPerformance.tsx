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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Award, Target, Star, TrendingUp, CheckCircle2, Sparkles, Calendar, Send,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { perfStore, usePerfStore, type Scorecard, type ReviewStatus } from "@/lib/performanceStore";
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
  // In the absence of a real user→employee mapping, fall back to the first seeded employee.
  const employeeId = useMemo(() => {
    const match = employees.find((e) => e.email.toLowerCase() === (user?.email ?? "").toLowerCase());
    return match?.id ?? employees[0]?.id;
  }, [user?.email]);

  const scorecards = usePerfStore((s) => s.scorecards.filter((sc) => sc.employeeId === employeeId));
  const feedback = usePerfStore((s) => s.feedback.filter((f) => f.employeeId === employeeId));

  const active = scorecards.find((s) => !["Completed", "Not Started"].includes(s.status))
    ?? scorecards[0];
  const completed = scorecards.filter((s) => s.status === "Completed");

  const overallProgress = useMemo(() => {
    if (!active) return 0;
    const all = active.kpas.flatMap((k) => k.kpis);
    const scored = all.filter((k) => typeof k.selfScore === "number");
    if (!scored.length) return 0;
    return Math.round((scored.reduce((s, k) => s + (k.selfScore! / 5), 0) / scored.length) * 100);
  }, [active]);

  const latestRating = completed[0]?.finalRating ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Performance</h1>
        <p className="text-sm text-muted-foreground">
          Your KPAs &amp; KPIs are set by your manager. Track progress, complete your self-review and engage with feedback.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Active Cycle" value={active ? active.status : "—"} icon={Calendar} tone="from-primary to-secondary" />
        <Stat label="Self-Review Progress" value={`${overallProgress}%`} icon={TrendingUp} tone="from-blue-500 to-cyan-500" />
        <Stat label="Latest Rating" value={latestRating ? `${latestRating}/5` : "—"} icon={Star} tone="from-amber-500 to-orange-500" />
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
              No active review cycle assigned to you yet. Your manager will set up your KPAs &amp; KPIs shortly.
            </CardContent></Card>
          )}
          {active && <CurrentReviewCard sc={active} />}
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {completed.length === 0 && (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">No completed reviews yet.</CardContent></Card>
          )}
          {completed.map((sc) => (
            <Card key={sc.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold">Review · {sc.cycleId}</h3>
                    <p className="text-xs text-muted-foreground">Finalised {sc.finalisedAt?.slice(0, 10)}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1.5 rounded-lg">
                    <Star className="h-4 w-4 fill-white" />
                    <span className="font-bold">{sc.finalRating}</span>
                    <span className="text-xs opacity-80">/5</span>
                  </div>
                </div>
                {sc.managerComments && (
                  <div className="text-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Manager comments</p>
                    <p className="whitespace-pre-wrap">{sc.managerComments}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
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

function CurrentReviewCard({ sc }: { sc: Scorecard }) {
  const { toast } = useToast();
  const [reflection, setReflection] = useState(sc.selfReflection ?? "");
  const [draftKpis, setDraftKpis] = useState(
    sc.kpas.flatMap((k) => k.kpis.map((x) => ({ id: x.id, actual: x.actual ?? "", selfScore: x.selfScore })))
  );
  const [openSubmit, setOpenSubmit] = useState(false);

  useEffect(() => {
    setReflection(sc.selfReflection ?? "");
    setDraftKpis(sc.kpas.flatMap((k) => k.kpis.map((x) => ({ id: x.id, actual: x.actual ?? "", selfScore: x.selfScore }))));
  }, [sc.id]);

  const locked = sc.status !== "Self Review" && sc.status !== "Not Started";

  const updateKpi = (id: string, patch: Partial<{ actual: string; selfScore: number }>) =>
    setDraftKpis(draftKpis.map((d) => d.id === id ? { ...d, ...patch } : d));

  const submit = () => {
    perfStore.submitSelfReview(sc.id, { reflection, kpis: draftKpis });
    setOpenSubmit(false);
    toast({ title: "Self-review submitted", description: "Your manager has been notified." });
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">My scorecard · {sc.cycleId}</h3>
            <p className="text-xs text-muted-foreground">Defined by your manager. Score yourself honestly from 1 (below) to 5 (exceeds).</p>
          </div>
          <Badge variant="outline" className={statusTone[sc.status]}>{sc.status}</Badge>
        </div>

        {sc.kpas.length === 0 && (
          <p className="text-sm text-muted-foreground">Your manager hasn’t finalised your KPAs yet.</p>
        )}

        {sc.kpas.map((kpa) => (
          <div key={kpa.id} className="rounded-lg border p-4 space-y-3">
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">{kpa.title}</p>
                <p className="text-xs text-muted-foreground">{kpa.description}</p>
              </div>
              <Badge variant="outline" className="text-[10px]">Weight {kpa.weight}%</Badge>
            </div>
            <div className="space-y-2">
              {kpa.kpis.map((kpi) => {
                const d = draftKpis.find((x) => x.id === kpi.id);
                return (
                  <div key={kpi.id} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_110px] gap-2 items-center">
                    <div className="text-sm">
                      <p>{kpi.name}</p>
                      <p className="text-xs text-muted-foreground">Target {kpi.target} {kpi.metric && `· ${kpi.metric}`} · Weight {kpi.weight}%</p>
                    </div>
                    <Input
                      placeholder="Actual"
                      disabled={locked}
                      value={d?.actual ?? ""}
                      onChange={(e) => updateKpi(kpi.id, { actual: e.target.value })}
                    />
                    <Input
                      type="number" min={1} max={5} step={0.1}
                      placeholder="Self / 5"
                      disabled={locked}
                      value={d?.selfScore ?? ""}
                      onChange={(e) => updateKpi(kpi.id, { selfScore: +e.target.value })}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <Label>Self-reflection</Label>
          <Textarea
            className="mt-1.5"
            rows={4}
            disabled={locked}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="What went well? What got in your way? What do you need from your manager?"
          />
        </div>

        {!locked && sc.kpas.length > 0 && (
          <div className="flex justify-end">
            <Dialog open={openSubmit} onOpenChange={setOpenSubmit}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-primary to-secondary">
                  <Send className="h-4 w-4 mr-2" /> Submit self-review
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Submit self-review?</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">Your scores and reflection will be sent to your manager for review. You won't be able to edit after submitting.</p>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenSubmit(false)}>Cancel</Button>
                  <Button onClick={submit} className="bg-gradient-to-r from-primary to-secondary">Submit</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {locked && sc.status !== "Completed" && (
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" /> Self-review submitted — waiting on your manager.
          </p>
        )}

        {sc.status === "Completed" && (
          <div className="rounded-lg border p-4 bg-success/5 space-y-2">
            <div className="flex items-center gap-2"><Award className="h-4 w-4 text-success" /><p className="font-semibold text-sm">Review finalised</p></div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <Metric label="Self" value={sc.overallSelfRating} />
              <Metric label="Manager" value={sc.overallManagerRating} />
              <Metric label="Final" value={sc.finalRating} emphasis />
            </div>
            {sc.managerComments && <p className="text-sm whitespace-pre-wrap"><span className="font-medium">Manager: </span>{sc.managerComments}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, emphasis }: { label: string; value?: number; emphasis?: boolean }) {
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
