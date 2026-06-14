import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail,
  Phone,
  MapPin,
  Briefcase,
  CalendarDays,
  Clock,
  CheckCircle2,
  Users,
  FolderKanban,
  Star,
  Target,
  Wallet,
  Shield,
  FileText,
  Download,
  MessageSquare,
} from "lucide-react";

interface TeamMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  roles: string[];
  status: string;
  createdAt: string;
}

interface Props {
  member: TeamMember | null;
  onClose: () => void;
}

// Mock derived activity scoped to the member.
const ACTIVITY = {
  manager: "Sarah Lee",
  department: "Compliance",
  location: "London — HQ",
  jobTitle: "Senior KYC Analyst",
  employeeNumber: "EMP-0142",
  assignedClients: [
    { name: "Acme Holdings Ltd", status: "in_review", risk: "medium" },
    { name: "Jane Smith", status: "pending", risk: "low" },
    { name: "Bright Futures NGO", status: "active", risk: "low" },
  ],
  projects: [
    { name: "Q2 KYC Refresh", role: "Lead", progress: 72, openTasks: 4 },
    { name: "AML Investigations", role: "Contributor", progress: 45, openTasks: 2 },
    { name: "Onboarding — Bright Futures", role: "Contributor", progress: 90, openTasks: 1 },
  ],
  attendance: {
    last7: [
      { d: "Mon", in: "08:55", out: "17:32", h: 7.8, s: "Present" },
      { d: "Tue", in: "09:18", out: "18:05", h: 7.8, s: "Late" },
      { d: "Wed", in: "08:48", out: "17:11", h: 7.9, s: "Remote" },
      { d: "Thu", in: "09:01", out: "17:48", h: 8.0, s: "Present" },
      { d: "Fri", in: "08:50", out: "17:33", h: 8.0, s: "Present" },
    ],
    monthHours: 162.4,
    overtime: 12.5,
    punctuality: 94,
  },
  leave: {
    annualRemaining: 13,
    sickRemaining: 8,
    upcoming: [{ type: "Annual", from: "2026-07-06", to: "2026-07-10", status: "Approved" }],
    pending: [{ type: "Annual", from: "2026-08-15", to: "2026-08-19", days: 5 }],
  },
  performance: {
    overall: 78,
    rating: 4.3,
    goals: [
      { title: "Reduce KYC turnaround to <48h", progress: 75, status: "On Track" },
      { title: "Complete CAMS certification", progress: 60, status: "On Track" },
      { title: "Zero SLA breaches", progress: 40, status: "At Risk" },
    ],
  },
  payroll: {
    salary: 5500,
    ytdGross: 22905,
    nextPayDate: "2026-06-30",
    pensionPot: 14200,
    loans: [{ type: "Salary Advance", balance: 750 }],
  },
  documents: [
    { name: "Employment Contract", date: "2024-03-12" },
    { name: "NDA — Confidentiality", date: "2024-03-12" },
    { name: "ID Verification", date: "2024-03-10" },
    { name: "Right to Work", date: "2024-03-10" },
  ],
  activity: [
    { t: "2h ago", text: "Clocked in at 08:55" },
    { t: "Yesterday", text: "Completed task: Source of funds review — Acme Holdings" },
    { t: "Yesterday", text: "Submitted timesheet for week 24" },
    { t: "2 days ago", text: "Logged 6.5h billable on Q2 KYC Refresh" },
    { t: "3 days ago", text: "Closed 2 KYC cases" },
    { t: "Last week", text: "Submitted leave request: 15–19 Aug (Annual)" },
  ],
};

const currency = (n: number) => `£${n.toLocaleString("en-GB")}`;

export function TeamMemberDetailSheet({ member, onClose }: Props) {
  if (!member) return null;
  const initials = `${member.firstName[0] ?? ""}${member.lastName[0] ?? ""}`.toUpperCase();
  const a = ACTIVITY;

  return (
    <Sheet open={!!member} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-secondary text-white p-6">
          <SheetHeader>
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 ring-4 ring-white/20">
                <AvatarFallback className="bg-white/10 text-white text-lg font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <SheetTitle className="text-white text-xl">{member.firstName} {member.lastName}</SheetTitle>
                <SheetDescription className="text-white/80">{a.jobTitle} · {a.department}</SheetDescription>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline" className="bg-white/10 text-white border-white/30 capitalize">{member.status}</Badge>
                  <Badge variant="outline" className="bg-white/10 text-white border-white/30">{a.employeeNumber}</Badge>
                  <Badge variant="outline" className="bg-white/10 text-white border-white/30">Reports to {a.manager}</Badge>
                </div>
              </div>
            </div>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3 mt-5 text-sm">
            <div className="bg-white/10 rounded-lg p-3"><p className="text-xs opacity-80">Perf</p><p className="font-bold text-lg">{a.performance.overall}%</p></div>
            <div className="bg-white/10 rounded-lg p-3"><p className="text-xs opacity-80">Attendance</p><p className="font-bold text-lg">{a.attendance.punctuality}%</p></div>
            <div className="bg-white/10 rounded-lg p-3"><p className="text-xs opacity-80">Open Tasks</p><p className="font-bold text-lg">{a.projects.reduce((s, p) => s + p.openTasks, 0)}</p></div>
          </div>
        </div>

        <div className="p-6">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="work">Work</TabsTrigger>
              <TabsTrigger value="time">Time & Leave</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="payroll">Payroll</TabsTrigger>
              <TabsTrigger value="documents">Docs</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-3">
              <Card><CardContent className="p-4 space-y-2 text-sm">
                <Row icon={Mail} label="Email" value={member.email} />
                {member.phone && <Row icon={Phone} label="Phone" value={member.phone} />}
                <Row icon={MapPin} label="Location" value={a.location} />
                <Row icon={Briefcase} label="Manager" value={a.manager} />
                <Row icon={CalendarDays} label="Joined" value={new Date(member.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} />
                <Row icon={Shield} label="Role(s)" value={member.roles.join(", ")} />
              </CardContent></Card>

              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="Clients" value={a.assignedClients.length} icon={Users} />
                <MiniStat label="Projects" value={a.projects.length} icon={FolderKanban} />
                <MiniStat label="This month" value={`${a.attendance.monthHours}h`} icon={Clock} />
                <MiniStat label="Overtime" value={`${a.attendance.overtime}h`} icon={Clock} />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1"><MessageSquare className="h-4 w-4 mr-2" /> Message</Button>
                <Button variant="outline" className="flex-1"><Target className="h-4 w-4 mr-2" /> Set Goal</Button>
              </div>
            </TabsContent>

            <TabsContent value="work" className="space-y-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Assigned Clients</p>
                <div className="space-y-2">
                  {a.assignedClients.map((c) => (
                    <Card key={c.name}><CardContent className="p-3 flex items-center justify-between">
                      <div><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-muted-foreground capitalize">Risk: {c.risk}</p></div>
                      <Badge variant="outline" className="capitalize">{c.status.replace("_", " ")}</Badge>
                    </CardContent></Card>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2 mt-4">Projects</p>
                <div className="space-y-2">
                  {a.projects.map((p) => (
                    <Card key={p.name}><CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div><p className="text-sm font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.role} · {p.openTasks} open task{p.openTasks !== 1 ? "s" : ""}</p></div>
                        <span className="text-xs font-medium">{p.progress}%</span>
                      </div>
                      <Progress value={p.progress} className="h-1.5" />
                    </CardContent></Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="time" className="space-y-3">
              <Card><CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Last 5 days</p>
                {a.attendance.last7.map((r) => (
                  <div key={r.d} className="flex items-center justify-between py-2 border-b last:border-b-0 text-sm">
                    <span className="font-medium w-12">{r.d}</span>
                    <span className="font-mono text-xs text-muted-foreground">{r.in} → {r.out}</span>
                    <span className="font-mono text-xs">{r.h}h</span>
                    <Badge variant="outline" className={r.s === "Late" ? "bg-warning/10 text-warning border-warning/20" : r.s === "Remote" ? "bg-info/10 text-info border-info/20" : "bg-success/10 text-success border-success/20"}>{r.s}</Badge>
                  </div>
                ))}
              </CardContent></Card>

              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="Annual left" value={`${a.leave.annualRemaining}d`} icon={CalendarDays} />
                <MiniStat label="Sick left" value={`${a.leave.sickRemaining}d`} icon={CalendarDays} />
              </div>

              {a.leave.pending.length > 0 && (
                <Card><CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-warning mb-2">Awaiting your approval</p>
                  {a.leave.pending.map((l, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-2 border-b last:border-b-0">
                      <div><p className="font-medium">{l.type} — {l.days} days</p><p className="text-xs text-muted-foreground">{l.from} → {l.to}</p></div>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline">Reject</Button>
                        <Button size="sm" className="bg-gradient-to-r from-primary to-secondary">Approve</Button>
                      </div>
                    </div>
                  ))}
                </CardContent></Card>
              )}
            </TabsContent>

            <TabsContent value="performance" className="space-y-3">
              <Card><CardContent className="p-4 flex items-center justify-between">
                <div><p className="text-xs text-muted-foreground">Latest Review Rating</p><p className="text-2xl font-bold">{a.performance.rating}/5</p></div>
                <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-2 rounded-lg">
                  <Star className="h-4 w-4 fill-white" /><span className="font-bold">H2 2025</span>
                </div>
              </CardContent></Card>
              <div className="space-y-2">
                {a.performance.goals.map((g) => (
                  <Card key={g.title}><CardContent className="p-3">
                    <div className="flex justify-between items-start mb-1.5">
                      <p className="text-sm font-medium flex-1">{g.title}</p>
                      <Badge variant="outline" className={g.status === "At Risk" ? "bg-warning/10 text-warning border-warning/20" : "bg-info/10 text-info border-info/20"}>{g.status}</Badge>
                    </div>
                    <Progress value={g.progress} className="h-1.5" />
                  </CardContent></Card>
                ))}
              </div>
              <Button variant="outline" className="w-full"><MessageSquare className="h-4 w-4 mr-2" /> Give Feedback</Button>
            </TabsContent>

            <TabsContent value="payroll" className="space-y-3">
              <Card><CardContent className="p-4 space-y-2 text-sm">
                <Row icon={Wallet} label="Base salary" value={`${currency(a.payroll.salary)} / month`} />
                <Row icon={Wallet} label="YTD gross" value={currency(a.payroll.ytdGross)} />
                <Row icon={CalendarDays} label="Next pay date" value={new Date(a.payroll.nextPayDate).toLocaleDateString("en-GB", { day: "numeric", month: "long" })} />
                <Row icon={Wallet} label="Pension pot" value={currency(a.payroll.pensionPot)} />
              </CardContent></Card>
              {a.payroll.loans.length > 0 && (
                <Card><CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Active loans</p>
                  {a.payroll.loans.map((l, i) => (
                    <div key={i} className="flex justify-between text-sm py-1">
                      <span>{l.type}</span><span className="font-mono">{currency(l.balance)}</span>
                    </div>
                  ))}
                </CardContent></Card>
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-2">
              {a.documents.map((d) => (
                <Card key={d.name}><CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-primary" />
                    <div><p className="text-sm font-medium">{d.name}</p><p className="text-xs text-muted-foreground">{new Date(d.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p></div>
                  </div>
                  <Button size="sm" variant="ghost"><Download className="h-3.5 w-3.5" /></Button>
                </CardContent></Card>
              ))}
            </TabsContent>

            <TabsContent value="activity" className="space-y-2">
              {a.activity.map((act, i) => (
                <div key={i} className="flex gap-3 p-3 border rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1"><p className="text-sm">{act.text}</p><p className="text-xs text-muted-foreground">{act.t}</p></div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-muted-foreground flex items-center gap-2 text-xs"><Icon className="h-3.5 w-3.5" /> {label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: any; icon: any }) {
  return (
    <Card><CardContent className="p-3 flex items-center justify-between">
      <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-bold">{value}</p></div>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardContent></Card>
  );
}
