import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Award,
  Target,
  Star,
  TrendingUp,
  MessageSquare,
  Plus,
  CheckCircle2,
  Sparkles,
  Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Goal {
  id: string;
  title: string;
  category: string;
  progress: number;
  due: string;
  status: "On Track" | "At Risk" | "Completed" | "Behind";
  weight: number;
  keyResults: { text: string; done: boolean }[];
}

interface Review {
  id: string;
  period: string;
  rating: number;
  reviewer: string;
  date: string;
  highlights: string[];
  improvements: string[];
}

interface Feedback {
  id: string;
  from: string;
  type: "Praise" | "Constructive" | "1-on-1";
  message: string;
  date: string;
}

const initialGoals: Goal[] = [
  {
    id: "g1", title: "Reduce client KYC turnaround to <48h", category: "Operational", progress: 75, due: "2026-09-30", status: "On Track", weight: 30,
    keyResults: [
      { text: "Automate document collection emails", done: true },
      { text: "Build screening dashboard", done: true },
      { text: "Hit <48h on 90% of cases", done: false },
    ],
  },
  {
    id: "g2", title: "Complete CAMS certification", category: "Development", progress: 60, due: "2026-12-15", status: "On Track", weight: 20,
    keyResults: [
      { text: "Finish online modules", done: true },
      { text: "Pass practice exam (80%+)", done: false },
      { text: "Sit final exam", done: false },
    ],
  },
  {
    id: "g3", title: "Mentor 2 junior analysts", category: "Leadership", progress: 50, due: "2026-12-31", status: "On Track", weight: 15,
    keyResults: [
      { text: "Weekly 1-on-1s established", done: true },
      { text: "Co-author training playbook", done: false },
    ],
  },
  {
    id: "g4", title: "Zero SLA breaches on assigned clients", category: "Quality", progress: 40, due: "2026-12-31", status: "At Risk", weight: 35,
    keyResults: [
      { text: "Implement weekly SLA review", done: true },
      { text: "Reduce breach rate to 0%", done: false },
    ],
  },
];

const reviews: Review[] = [
  {
    id: "r1", period: "H2 2025", rating: 4.3, reviewer: "Sarah Lee", date: "2026-01-15",
    highlights: ["Exceeded KYC throughput targets", "Strong stakeholder communication", "Mentored 2 new hires"],
    improvements: ["Time management on multi-client workloads", "More proactive risk escalation"],
  },
  {
    id: "r2", period: "H1 2025", rating: 4.0, reviewer: "Sarah Lee", date: "2025-07-20",
    highlights: ["Solid technical execution", "Reliable team player"],
    improvements: ["Take ownership of larger projects", "Improve documentation"],
  },
];

const initialFeedback: Feedback[] = [
  { id: "f1", from: "Sarah Lee (Manager)", type: "Praise", message: "Great handling of the Acme Holdings escalation — your stakeholder management was excellent.", date: "2026-06-08" },
  { id: "f2", from: "Marco Bianchi (Peer)", type: "Praise", message: "Thanks for the assist on case #4421 — your STR template saved us hours.", date: "2026-06-05" },
  { id: "f3", from: "Sarah Lee (Manager)", type: "Constructive", message: "Consider scheduling deep work blocks earlier in the week to avoid Friday crunches.", date: "2026-05-22" },
];

export default function MyPerformance() {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [feedback] = useState<Feedback[]>(initialFeedback);
  const [open, setOpen] = useState(false);
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const [draft, setDraft] = useState({ title: "", category: "Operational", due: "", weight: 10 });
  const [reflection, setReflection] = useState("");
  const { toast } = useToast();

  const overall = Math.round(goals.reduce((s, g) => s + (g.progress * g.weight) / 100, 0));
  const completed = goals.filter((g) => g.status === "Completed").length;
  const atRisk = goals.filter((g) => g.status === "At Risk" || g.status === "Behind").length;
  const latestRating = reviews[0]?.rating ?? 0;

  const addGoal = () => {
    if (!draft.title.trim() || !draft.due) return;
    setGoals([{ id: `g-${Date.now()}`, ...draft, progress: 0, status: "On Track", keyResults: [] }, ...goals]);
    setOpen(false);
    setDraft({ title: "", category: "Operational", due: "", weight: 10 });
    toast({ title: "Goal added" });
  };

  const toggleKR = (gid: string, idx: number) => {
    setGoals(goals.map((g) => {
      if (g.id !== gid) return g;
      const krs = g.keyResults.map((k, i) => i === idx ? { ...k, done: !k.done } : k);
      const progress = krs.length ? Math.round((krs.filter((k) => k.done).length / krs.length) * 100) : g.progress;
      return { ...g, keyResults: krs, progress };
    }));
  };

  const submitReflection = () => {
    if (!reflection.trim()) return;
    setReflectionOpen(false);
    toast({ title: "Reflection submitted", description: "Sent to your manager for review." });
    setReflection("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Performance</h1>
          <p className="text-sm text-muted-foreground">Track goals, view reviews, and engage with feedback.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setReflectionOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" /> Self-Reflection
          </Button>
          <Button onClick={() => setOpen(true)} className="bg-gradient-to-r from-primary to-secondary">
            <Plus className="h-4 w-4 mr-2" /> Add Goal
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Overall Progress" value={`${overall}%`} icon={TrendingUp} tone="from-blue-500 to-cyan-500" />
        <Stat label="Latest Rating" value={`${latestRating}/5`} icon={Star} tone="from-amber-500 to-orange-500" />
        <Stat label="Goals Completed" value={completed} icon={CheckCircle2} tone="from-emerald-500 to-teal-500" />
        <Stat label="At Risk" value={atRisk} icon={Target} tone="from-rose-500 to-red-500" />
      </div>

      <Tabs defaultValue="goals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="goals">Goals & OKRs</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="growth">Growth</TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="space-y-3">
          {goals.map((g) => (
            <Card key={g.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{g.title}</h3>
                      <Badge variant="outline" className="text-[10px]">{g.category}</Badge>
                      <Badge variant="outline" className="text-[10px]">Weight {g.weight}%</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Due {new Date(g.due).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <Badge variant="outline" className={
                    g.status === "Completed" ? "bg-success/10 text-success border-success/20" :
                    g.status === "On Track" ? "bg-info/10 text-info border-info/20" :
                    g.status === "At Risk" ? "bg-warning/10 text-warning border-warning/20" :
                    "bg-destructive/10 text-destructive border-destructive/20"
                  }>{g.status}</Badge>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Progress</span><span className="font-medium">{g.progress}%</span></div>
                  <Progress value={g.progress} className="h-2" />
                </div>
                {g.keyResults.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {g.keyResults.map((k, i) => (
                      <label key={i} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/30 p-1.5 rounded">
                        <input type="checkbox" checked={k.done} onChange={() => toggleKR(g.id, i)} />
                        <span className={k.done ? "line-through text-muted-foreground" : ""}>{k.text}</span>
                      </label>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold">{r.period} Performance Review</h3>
                    <p className="text-xs text-muted-foreground">By {r.reviewer} · {new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1.5 rounded-lg">
                    <Star className="h-4 w-4 fill-white" />
                    <span className="font-bold">{r.rating}</span>
                    <span className="text-xs opacity-80">/5</span>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <p className="text-xs font-medium text-success uppercase tracking-wide mb-1.5">Highlights</p>
                    <ul className="space-y-1 text-sm">{r.highlights.map((h, i) => <li key={i} className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />{h}</li>)}</ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-warning uppercase tracking-wide mb-1.5">Areas to Improve</p>
                    <ul className="space-y-1 text-sm">{r.improvements.map((h, i) => <li key={i} className="flex gap-2"><Target className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />{h}</li>)}</ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="feedback" className="space-y-3">
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
                    <span className="text-xs text-muted-foreground">{new Date(f.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                  </div>
                  <p className="text-sm mt-1">{f.message}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="growth">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> Skills & Development</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { skill: "AML / KYC Analysis", level: 90 },
                { skill: "Risk Assessment", level: 80 },
                { skill: "Client Communication", level: 85 },
                { skill: "Regulatory Reporting", level: 70 },
                { skill: "Project Management", level: 60 },
              ].map((s) => (
                <div key={s.skill}>
                  <div className="flex justify-between text-sm mb-1"><span>{s.skill}</span><span className="font-medium">{s.level}%</span></div>
                  <Progress value={s.level} className="h-2" />
                </div>
              ))}
              <div className="border-t pt-4 mt-2">
                <p className="text-sm font-medium mb-2">Recommended next steps</p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Enroll in "Advanced Sanctions Screening" course (4h)</li>
                  <li>• Shadow Compliance Officer on quarterly board reporting</li>
                  <li>• Co-lead the next internal audit dry-run</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add goal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Goal</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Title</Label><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="mt-1.5" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label><Input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Weight (%)</Label><Input type="number" value={draft.weight} onChange={(e) => setDraft({ ...draft, weight: +e.target.value })} className="mt-1.5" /></div>
            </div>
            <div><Label>Due Date</Label><Input type="date" value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })} className="mt-1.5" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={addGoal} className="bg-gradient-to-r from-primary to-secondary">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Self reflection */}
      <Dialog open={reflectionOpen} onOpenChange={setReflectionOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Self-Reflection</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Reflect on this period: wins, challenges, support needed.</p>
            <Textarea rows={6} value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="What went well? What got in your way? What do you need from your manager?" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReflectionOpen(false)}>Cancel</Button>
            <Button onClick={submitReflection} className="bg-gradient-to-r from-primary to-secondary">Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
