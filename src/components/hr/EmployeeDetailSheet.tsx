import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Gavel,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import type { Employee, HrTeam, HrLocation } from "@/lib/hr-api";
import { downloadEmployeeReport } from "@/lib/employeeReport";

// ─── Types ────────────────────────────────────────────────────

interface Dispute {
  id: string;
  type: "Grievance" | "Disciplinary" | "Harassment" | "Performance" | "Other";
  title: string;
  filedOn: string;
  status: "Open" | "Investigating" | "Mediation" | "Resolved" | "Escalated";
  note?: string;
}

interface Props {
  employee: Employee | null;
  onClose: () => void;
}

// ─── Mock data (dummy until APIs are wired) ───────────────────

const ACTIVITY = {
  manager: "Sarah Lee",
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
    annualLeft: 14,
    sickLeft: 8,
    upcoming: [
      { type: "Annual", from: "2026-08-15", to: "2026-08-19", days: 5 },
    ],
    history: [
      { type: "Annual", from: "2026-04-10", to: "2026-04-12", days: 3, status: "approved" },
      { type: "Sick", from: "2026-02-05", to: "2026-02-05", days: 1, status: "approved" },
    ],
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
    payslips: [
      { period: "May 2026", net: 4180, date: "2026-05-30" },
      { period: "Apr 2026", net: 4180, date: "2026-04-30" },
      { period: "Mar 2026", net: 4180, date: "2026-03-30" },
    ],
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

// ─── Helpers ──────────────────────────────────────────────────

const ATTENDANCE_STYLE: Record<string, string> = {
  Late: "bg-warning/10 text-warning border-warning/20",
  Remote: "bg-info/10 text-info border-info/20",
  Present: "bg-success/10 text-success border-success/20",
};

const LEAVE_STATUS_STYLE: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

const DISPUTE_TONE: Record<Dispute["status"], string> = {
  Open: "bg-warning/10 text-warning border-warning/20",
  Investigating: "bg-info/10 text-info border-info/20",
  Mediation: "bg-primary/10 text-primary border-primary/20",
  Resolved: "bg-success/10 text-success border-success/20",
  Escalated: "bg-destructive/10 text-destructive border-destructive/20",
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const fmtShort = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const currency = (n: number) => `£${n.toLocaleString("en-GB")}`;

const teamName = (e: Employee) =>
  typeof e.teamId === "object" && e.teamId !== null ? (e.teamId as HrTeam).name : "—";
const locName = (e: Employee) =>
  typeof e.locationId === "object" && e.locationId !== null ? (e.locationId as HrLocation).name : "—";

// ─── Component ────────────────────────────────────────────────

export function EmployeeDetailSheet({ employee, onClose }: Props) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [openDispute, setOpenDispute] = useState(false);
  const [dForm, setDForm] = useState<Omit<Dispute, "id" | "filedOn" | "status">>({
    type: "Grievance",
    title: "",
    note: "",
  });

  if (!employee) return null;

  const initials = `${employee.firstName[0] ?? ""}${employee.lastName[0] ?? ""}`.toUpperCase();
  const a = ACTIVITY;
  const openCount = disputes.filter((d) => d.status !== "Resolved").length;

  const addDispute = () => {
    if (!dForm.title) return toast.error("Add a short title.");
    setDisputes([
      {
        id: `DSP-${disputes.length + 1}`,
        ...dForm,
        filedOn: new Date().toISOString().slice(0, 10),
        status: "Open",
      },
      ...disputes,
    ]);
    setDForm({ type: "Grievance", title: "", note: "" });
    setOpenDispute(false);
    toast.success("Dispute logged.");
  };

  const cycle = (d: Dispute) => {
    const order: Dispute["status"][] = ["Open", "Investigating", "Mediation", "Resolved"];
    const next = order[(order.indexOf(d.status) + 1) % order.length];
    setDisputes(disputes.map((x) => (x.id === d.id ? { ...x, status: next } : x)));
  };

  return (
    <Sheet open={!!employee} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-secondary text-white p-6">
          <SheetHeader>
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 ring-4 ring-white/20">
                <AvatarFallback className="bg-white/10 text-white text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <SheetTitle className="text-white text-xl">
                  {employee.firstName} {employee.lastName}
                </SheetTitle>
                <SheetDescription className="text-white/80">
                  {employee.jobTitle} · {teamName(employee)}
                </SheetDescription>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline" className="bg-white/10 text-white border-white/30 capitalize">
                    {employee.employmentStatus?.replace("_", " ")}
                  </Badge>
                  <Badge variant="outline" className="bg-white/10 text-white border-white/30">
                    {a.employeeNumber}
                  </Badge>
                  <Badge variant="outline" className="bg-white/10 text-white border-white/30">
                    Reports to {a.manager}
                  </Badge>
                </div>
              </div>
            </div>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3 mt-5 text-sm">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs opacity-80">Perf</p>
              <p className="font-bold text-lg">{a.performance.overall}%</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs opacity-80">Attendance</p>
              <p className="font-bold text-lg">{a.attendance.punctuality}%</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs opacity-80">Open Tasks</p>
              <p className="font-bold text-lg">
                {a.projects.reduce((s, p) => s + p.openTasks, 0)}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/15 hover:bg-white/25 text-white border-white/20"
              onClick={() => {
                downloadEmployeeReport(employee);
                toast.success("Employee report downloaded.");
              }}
            >
              <Download className="h-4 w-4 mr-2" /> Download Report
            </Button>
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
              <TabsTrigger value="disputes">
                Disputes
                {openCount > 0 && (
                  <span className="ml-1.5 h-4 w-4 rounded-full bg-warning text-white text-[9px] flex items-center justify-center">
                    {openCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="documents">Docs</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            {/* ── Overview ── */}
            <TabsContent value="overview" className="space-y-3">
              <Card>
                <CardContent className="p-4 space-y-2 text-sm">
                  <Row icon={Mail} label="Email" value={employee.email} />
                  {employee.phone && <Row icon={Phone} label="Phone" value={employee.phone} />}
                  <Row icon={MapPin} label="Location" value={locName(employee)} />
                  <Row icon={Briefcase} label="Manager" value={a.manager} />
                  <Row
                    icon={CalendarDays}
                    label="Joined"
                    value={new Date(employee.createdAt ?? Date.now()).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  />
                  <Row
                    icon={Shield}
                    label="Type"
                    value={(employee.employmentType ?? "").replace("_", " ")}
                  />
                </CardContent>
              </Card>
              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="Clients" value={a.assignedClients.length} icon={Users} />
                <MiniStat label="Projects" value={a.projects.length} icon={FolderKanban} />
                <MiniStat label="This month" value={`${a.attendance.monthHours}h`} icon={Clock} />
                <MiniStat label="Overtime" value={`${a.attendance.overtime}h`} icon={Clock} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  <MessageSquare className="h-4 w-4 mr-2" /> Message
                </Button>
                <Button variant="outline" className="flex-1">
                  <Target className="h-4 w-4 mr-2" /> Set Goal
                </Button>
              </div>
            </TabsContent>

            {/* ── Work ── */}
            <TabsContent value="work" className="space-y-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  Assigned Clients
                </p>
                <div className="space-y-2">
                  {a.assignedClients.map((c) => (
                    <Card key={c.name}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">Risk: {c.risk}</p>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {c.status.replace("_", " ")}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2 mt-4">
                  Projects
                </p>
                <div className="space-y-2">
                  {a.projects.map((p) => (
                    <Card key={p.name}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div>
                            <p className="text-sm font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.role} · {p.openTasks} open task{p.openTasks !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <span className="text-xs font-medium">{p.progress}%</span>
                        </div>
                        <Progress value={p.progress} className="h-1.5" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ── Time & Leave ── */}
            <TabsContent value="time" className="space-y-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                    Last 5 days
                  </p>
                  {a.attendance.last7.map((r) => (
                    <div
                      key={r.d}
                      className="flex items-center justify-between py-2 border-b last:border-b-0 text-sm"
                    >
                      <span className="font-medium w-12">{r.d}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {r.in} → {r.out}
                      </span>
                      <span className="font-mono text-xs">{r.h}h</span>
                      <Badge variant="outline" className={ATTENDANCE_STYLE[r.s] ?? ""}>
                        {r.s}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="Annual left" value={`${a.leave.annualLeft}d`} icon={CalendarDays} />
                <MiniStat label="Sick left" value={`${a.leave.sickLeft}d`} icon={CalendarDays} />
              </div>

              {a.leave.upcoming.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                      Upcoming approved leave
                    </p>
                    <div className="space-y-2">
                      {a.leave.upcoming.map((r, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1.5">
                          <div>
                            <p className="font-medium">{r.type}</p>
                            <p className="text-xs text-muted-foreground">
                              {fmtShort(r.from)} → {fmt(r.to)} · {r.days}d
                            </p>
                          </div>
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                            Approved
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                    Leave history
                  </p>
                  <div className="space-y-2">
                    {a.leave.history.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-sm py-1.5 border-b last:border-b-0"
                      >
                        <div>
                          <p className="font-medium">{r.type} · {r.days}d</p>
                          <p className="text-xs text-muted-foreground">
                            {fmtShort(r.from)} → {fmt(r.to)}
                          </p>
                        </div>
                        <Badge variant="outline" className={LEAVE_STATUS_STYLE[r.status] ?? ""}>
                          <span className="capitalize">{r.status}</span>
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Performance ── */}
            <TabsContent value="performance" className="space-y-3">
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Latest Review Rating</p>
                    <p className="text-2xl font-bold">{a.performance.rating}/5</p>
                  </div>
                  <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-2 rounded-lg">
                    <Star className="h-4 w-4 fill-white" />
                    <span className="font-bold">H2 2025</span>
                  </div>
                </CardContent>
              </Card>
              <div className="space-y-2">
                {a.performance.goals.map((g) => (
                  <Card key={g.title}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-1.5">
                        <p className="text-sm font-medium flex-1">{g.title}</p>
                        <Badge
                          variant="outline"
                          className={
                            g.status === "At Risk"
                              ? "bg-warning/10 text-warning border-warning/20"
                              : "bg-info/10 text-info border-info/20"
                          }
                        >
                          {g.status}
                        </Badge>
                      </div>
                      <Progress value={g.progress} className="h-1.5" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button variant="outline" className="w-full">
                <MessageSquare className="h-4 w-4 mr-2" /> Give Feedback
              </Button>
            </TabsContent>

            {/* ── Payroll ── */}
            <TabsContent value="payroll" className="space-y-3">
              <Card>
                <CardContent className="p-4 space-y-2 text-sm">
                  <Row icon={Wallet} label="Base salary" value={`${currency(a.payroll.salary)} / month`} />
                  <Row icon={Wallet} label="YTD gross" value={currency(a.payroll.ytdGross)} />
                  <Row
                    icon={CalendarDays}
                    label="Next pay date"
                    value={new Date(a.payroll.nextPayDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                    })}
                  />
                  <Row icon={Wallet} label="Pension pot" value={currency(a.payroll.pensionPot)} />
                </CardContent>
              </Card>
              {a.payroll.loans.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                      Active loans
                    </p>
                    {a.payroll.loans.map((l, i) => (
                      <div key={i} className="flex justify-between text-sm py-1">
                        <span>{l.type}</span>
                        <span className="font-mono">{currency(l.balance)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                    Recent payslips
                  </p>
                  {a.payroll.payslips.map((p) => (
                    <div
                      key={p.period}
                      className="flex items-center justify-between text-sm py-2 border-b last:border-b-0"
                    >
                      <div>
                        <p className="font-medium">{p.period}</p>
                        <p className="text-xs text-muted-foreground">Net {currency(p.net)} · {fmt(p.date)}</p>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Disputes ── */}
            <TabsContent value="disputes" className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Grievances, disciplinary cases and mediation outcomes.
                </p>
                <Button
                  size="sm"
                  onClick={() => setOpenDispute(true)}
                  className="bg-gradient-to-r from-primary to-secondary"
                >
                  <Plus className="h-4 w-4 mr-1" /> Log
                </Button>
              </div>
              {disputes.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-sm text-muted-foreground">
                    No disputes on record.
                  </CardContent>
                </Card>
              ) : (
                disputes.map((d) => (
                  <Card key={d.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Gavel className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-medium truncate">{d.title}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {d.type} · filed {d.filedOn}
                          </p>
                          {d.note && <p className="text-xs mt-2">{d.note}</p>}
                        </div>
                        <Badge
                          variant="outline"
                          className={`${DISPUTE_TONE[d.status]} cursor-pointer`}
                          onClick={() => cycle(d)}
                        >
                          {d.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* ── Documents ── */}
            <TabsContent value="documents" className="space-y-2">
              {a.documents.map((d) => (
                <Card key={d.name}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{fmt(d.date)}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* ── Activity ── */}
            <TabsContent value="activity" className="space-y-2">
              {a.activity.map((act, i) => (
                <div key={i} className="flex gap-3 p-3 border rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm">{act.text}</p>
                    <p className="text-xs text-muted-foreground">{act.t}</p>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        {/* Dispute dialog */}
        <Dialog open={openDispute} onOpenChange={setOpenDispute}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Dispute</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={dForm.type} onValueChange={(v: any) => setDForm({ ...dForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Grievance", "Disciplinary", "Harassment", "Performance", "Other"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={dForm.title} onChange={(e) => setDForm({ ...dForm, title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={dForm.note}
                  onChange={(e) => setDForm({ ...dForm, note: e.target.value })}
                />
              </div>
              <div className="rounded-md bg-warning/10 border border-warning/20 text-warning text-xs p-2 flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Visible to HR admins only.
              </div>
            </div>
            <DialogFooter>
              <Button onClick={addDispute} className="bg-gradient-to-r from-primary to-secondary">
                Log Dispute
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

// ─── Sub-components ───────────────────────────────────────────

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-muted-foreground flex items-center gap-2 text-xs">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: any; icon: any }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-bold">{value}</p>
        </div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}
