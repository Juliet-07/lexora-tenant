import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Briefcase, Plus, Users, Clock, CheckCircle2, Star, MapPin, ArrowRight } from "lucide-react";
import { jobOpenings as initialJobs, applicants as initialApplicants, type JobOpening, type Applicant } from "@/data/hrMockData";
import { useToast } from "@/hooks/use-toast";

const stageColor = (s: Applicant["stage"]) =>
  s === "Hired" ? "bg-success/10 text-success border-success/20"
  : s === "Rejected" ? "bg-destructive/10 text-destructive border-destructive/20"
  : s === "Offer" ? "bg-warning/10 text-warning border-warning/20"
  : s === "Interview" ? "bg-info/10 text-info border-info/20"
  : "bg-muted text-muted-foreground border-border";

const STAGES: Applicant["stage"][] = ["Sourced", "Screening", "Interview", "Offer", "Hired"];

export default function HRRecruitment() {
  const [jobs, setJobs] = useState<JobOpening[]>(initialJobs);
  const [apps, setApps] = useState<Applicant[]>(initialApplicants);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", department: "Engineering", location: "Remote", type: "Full-time" as JobOpening["type"], description: "", hiringManager: "" });
  const { toast } = useToast();

  const summary = useMemo(() => ({
    openings: jobs.filter(j => j.status === "Open").length,
    applicants: apps.length,
    interviews: apps.filter(a => a.stage === "Interview").length,
    offers: apps.filter(a => a.stage === "Offer").length,
    timeToHire: 28,
  }), [jobs, apps]);

  const create = () => {
    if (!form.title) return;
    const j: JobOpening = {
      id: `JOB-${String(jobs.length + 1).padStart(3, "0")}`,
      title: form.title, department: form.department, location: form.location,
      type: form.type, status: "Open", postedDate: new Date().toISOString().slice(0, 10),
      applicants: 0, hiringManager: form.hiringManager || "—",
      description: form.description,
      pipeline: { sourced: 0, screening: 0, interview: 0, offer: 0, hired: 0 },
    };
    setJobs([j, ...jobs]);
    setOpen(false);
    setForm({ title: "", department: "Engineering", location: "Remote", type: "Full-time", description: "", hiringManager: "" });
    toast({ title: "Job opened", description: `${j.title} is now open for applications.` });
  };

  const move = (a: Applicant, dir: 1 | -1) => {
    const idx = STAGES.indexOf(a.stage);
    const next = STAGES[Math.min(STAGES.length - 1, Math.max(0, idx + dir))];
    if (next === a.stage) return;
    setApps(apps.map(x => x.id === a.id ? { ...x, stage: next } : x));
    toast({ title: "Stage updated", description: `${a.name} moved to ${next}.` });
  };

  const reject = (a: Applicant) => {
    setApps(apps.map(x => x.id === a.id ? { ...x, stage: "Rejected" } : x));
    toast({ title: "Applicant rejected", description: `${a.name} has been rejected.` });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Recruitment</h1>
          <p className="text-sm text-muted-foreground">Manage roles, pipelines and candidate decisions.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-to-r from-primary to-secondary"><Plus className="h-4 w-4 mr-2" /> Post a Role</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Open a New Role</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Job title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Senior Backend Engineer" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Department</Label>
                  <Select value={form.department} onValueChange={v => setForm({ ...form, department: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Engineering","Product","Design","Sales","Marketing","Operations","Finance","People"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Type</Label>
                  <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Full-time","Part-time","Contract"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Location</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
                <div className="space-y-1"><Label>Hiring manager</Label><Input value={form.hiringManager} onChange={e => setForm({ ...form, hiringManager: e.target.value })} /></div>
              </div>
              <div className="space-y-1"><Label>Description</Label><Textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={create} className="bg-gradient-to-r from-primary to-secondary">Publish</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat label="Open Roles" value={summary.openings} icon={Briefcase} tone="from-primary to-secondary" />
        <Stat label="Applicants" value={summary.applicants} icon={Users} tone="from-blue-500 to-cyan-500" />
        <Stat label="Interviews" value={summary.interviews} icon={Clock} tone="from-amber-500 to-orange-500" />
        <Stat label="Offers Out" value={summary.offers} icon={Star} tone="from-violet-500 to-purple-600" />
        <Stat label="Avg time-to-hire" value={`${summary.timeToHire}d`} icon={CheckCircle2} tone="from-emerald-500 to-teal-500" />
      </div>

      <Tabs defaultValue="openings" className="space-y-4">
        <TabsList><TabsTrigger value="openings">Job Openings</TabsTrigger><TabsTrigger value="pipeline">Candidate Pipeline</TabsTrigger></TabsList>

        <TabsContent value="openings" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {jobs.map(j => (
            <Card key={j.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{j.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><MapPin className="h-3 w-3" />{j.location} · {j.type}</p>
                  </div>
                  <Badge variant="outline" className={j.status === "Open" ? "bg-success/10 text-success border-success/20" : j.status === "On Hold" ? "bg-warning/10 text-warning border-warning/20" : "bg-muted"}>{j.status}</Badge>
                </div>
                <div className="text-sm text-muted-foreground line-clamp-2">{j.description}</div>
                <div className="grid grid-cols-5 gap-1 text-center text-xs">
                  {STAGES.map((s) => (
                    <div key={s} className="rounded-md bg-muted/50 p-2">
                      <p className="text-muted-foreground">{s}</p>
                      <p className="font-semibold">{(j.pipeline as any)[s.toLowerCase()] ?? 0}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Hiring Manager · {j.hiringManager}</span>
                  <span>{j.applicants} applicants</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="pipeline">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            {STAGES.map(stage => (
              <Card key={stage}>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center justify-between">{stage} <Badge variant="outline">{apps.filter(a => a.stage === stage).length}</Badge></CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {apps.filter(a => a.stage === stage).map(a => {
                    const job = jobs.find(j => j.id === a.jobId);
                    return (
                      <div key={a.id} className="border rounded-lg p-3 space-y-2 bg-card">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8"><AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs">{a.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
                          <div className="min-w-0"><p className="text-sm font-medium truncate">{a.name}</p><p className="text-[10px] text-muted-foreground truncate">{job?.title}</p></div>
                        </div>
                        {a.rating > 0 && <div className="flex items-center gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3 w-3 ${i < Math.round(a.rating) ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />)}</div>}
                        <Badge variant="outline" className={stageColor(a.stage) + " text-[10px]"}>{a.source}</Badge>
                        <div className="flex gap-1">
                          {stage !== "Hired" && <Button size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={() => move(a, 1)}>Advance <ArrowRight className="h-3 w-3 ml-1" /></Button>}
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => reject(a)}>Reject</Button>
                        </div>
                      </div>
                    );
                  })}
                  {apps.filter(a => a.stage === stage).length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No candidates</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
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
