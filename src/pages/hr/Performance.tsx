import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Target, Star, TrendingUp, Award, MessageSquare, CheckCircle2 } from "lucide-react";
import { performanceReviews as initial, type PerformanceReview } from "@/data/hrMockData";

const statusTone: Record<PerformanceReview["status"], string> = {
  "Not Started": "bg-muted text-muted-foreground",
  "Self Review": "bg-info/10 text-info border-info/20",
  "Manager Review": "bg-warning/10 text-warning border-warning/20",
  "Calibration": "bg-violet-500/10 text-violet-600 border-violet-500/20",
  "Completed": "bg-success/10 text-success border-success/20",
};

export default function HRPerformance() {
  const [reviews] = useState<PerformanceReview[]>(initial);
  const [selected, setSelected] = useState<PerformanceReview | null>(null);

  const completed = reviews.filter(r => r.status === "Completed");
  const avgRating = completed.length ? (completed.reduce((s, r) => s + (r.overallRating ?? 0), 0) / completed.length).toFixed(1) : "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Performance</h1>
        <p className="text-sm text-muted-foreground">Reviews, goals and continuous feedback.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Active Cycle" value="H1 2026" icon={Target} tone="from-primary to-secondary" />
        <Stat label="Reviews In Progress" value={reviews.filter(r => !["Not Started","Completed"].includes(r.status)).length} icon={TrendingUp} tone="from-amber-500 to-orange-500" />
        <Stat label="Completed" value={completed.length} icon={CheckCircle2} tone="from-emerald-500 to-teal-500" />
        <Stat label="Avg Rating" value={avgRating} icon={Star} tone="from-violet-500 to-purple-600" />
      </div>

      <Tabs defaultValue="reviews" className="space-y-4">
        <TabsList><TabsTrigger value="reviews">Reviews</TabsTrigger><TabsTrigger value="goals">Goals & OKRs</TabsTrigger><TabsTrigger value="feedback">1-on-1s & Feedback</TabsTrigger></TabsList>

        <TabsContent value="reviews" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {reviews.map(r => (
            <Card key={r.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelected(r)}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10"><AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs font-semibold">{r.employeeName.split(" ").map(n => n[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
                    <div><p className="font-semibold">{r.employeeName}</p><p className="text-xs text-muted-foreground">{r.cycle} · Reviewer: {r.reviewer}</p></div>
                  </div>
                  <Badge variant="outline" className={statusTone[r.status]}>{r.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">Due {r.dueDate}</div>
                <div className="space-y-1.5">
                  {r.goals.slice(0, 2).map((g, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs"><span className="truncate">{g.title}</span><span className="font-medium">{g.progress}%</span></div>
                      <Progress value={g.progress} className="h-1.5" />
                    </div>
                  ))}
                </div>
                {r.overallRating && <div className="flex items-center gap-2"><Star className="h-4 w-4 fill-warning text-warning" /><span className="font-semibold">{r.overallRating}</span><span className="text-xs text-muted-foreground">/ 5.0</span></div>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="goals" className="space-y-2">
          {reviews.flatMap(r => r.goals.map((g, i) => (
            <Card key={`${r.id}-${i}`}><CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{g.title}</p>
                <p className="text-xs text-muted-foreground">{r.employeeName}</p>
              </div>
              <div className="flex items-center gap-3 min-w-[220px]">
                <Progress value={g.progress} className="h-2 flex-1" />
                <span className="text-xs font-medium w-10 text-right">{g.progress}%</span>
                <Badge variant="outline" className={g.status === "Completed" ? "bg-success/10 text-success border-success/20" : g.status === "At Risk" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-info/10 text-info border-info/20"}>{g.status}</Badge>
              </div>
            </CardContent></Card>
          )))}
        </TabsContent>

        <TabsContent value="feedback" className="space-y-3">
          {[
            { from: "Amelia Okonkwo", to: "Marco Bianchi", type: "Recognition", message: "Outstanding work shipping the billing migration ahead of schedule. Big impact on the platform team.", date: "2 days ago" },
            { from: "Chloe Sullivan", to: "Diego Hernandez", type: "1-on-1", message: "Strong quarter — exceeded ARR targets. Next focus: enablement playbook for new AEs.", date: "5 days ago" },
            { from: "Priya Iyer", to: "Hana Tanaka", type: "Recognition", message: "Brand refresh is landing beautifully across product surfaces. Thanks for the craft.", date: "1 week ago" },
            { from: "Zara Mensah", to: "Liam Walsh", type: "Probation Check-in", message: "Onboarding plan tracking well at 40%. Let's pair on Postgres deep-dive next week.", date: "1 week ago" },
          ].map((f, i) => (
            <Card key={i}><CardContent className="p-4 flex gap-3">
              <Award className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between"><p className="text-sm"><span className="font-medium">{f.from}</span> → <span className="font-medium">{f.to}</span> <Badge variant="outline" className="ml-1 text-[10px]">{f.type}</Badge></p><span className="text-xs text-muted-foreground">{f.date}</span></div>
                <p className="text-sm text-muted-foreground mt-1">{f.message}</p>
              </div>
            </CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (<>
            <SheetHeader>
              <SheetTitle>{selected.employeeName} · {selected.cycle}</SheetTitle>
              <SheetDescription>Reviewer · {selected.reviewer} · Due {selected.dueDate}</SheetDescription>
            </SheetHeader>
            <div className="mt-5 space-y-4">
              <Badge variant="outline" className={statusTone[selected.status]}>{selected.status}</Badge>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Goals</p>
                <div className="space-y-3">
                  {selected.goals.map((g, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm"><span>{g.title}</span><Badge variant="outline" className="text-[10px]">{g.status}</Badge></div>
                      <Progress value={g.progress} className="h-2" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-gradient-to-r from-primary to-secondary"><MessageSquare className="h-4 w-4 mr-2" /> Add Feedback</Button>
                <Button variant="outline">Submit Review</Button>
              </div>
            </div>
          </>)}
        </SheetContent>
      </Sheet>
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
