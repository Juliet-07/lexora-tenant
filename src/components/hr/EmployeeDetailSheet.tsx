import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { Employee, HrTeam, HrLocation } from "@/lib/hr-api";
import { fetchEmployeeDetail } from "@/lib/hr-api";
import { downloadEmployeeReport } from "@/lib/employeeReport";
import { getSubmission } from "@/lib/onboardingStore";

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

// ─── Dummy data — for modules with no backend yet ──────────────
// (clients, projects, performance, payroll, documents, activity feed)

const DUMMY = {
  assignedClients: [
    { name: "Acme Holdings Ltd", status: "in_review", risk: "medium" },
    { name: "Jane Smith", status: "pending", risk: "low" },
    { name: "Bright Futures NGO", status: "active", risk: "low" },
  ],
  projects: [
    { name: "Q2 KYC Refresh", role: "Lead", progress: 72, openTasks: 4 },
    {
      name: "AML Investigations",
      role: "Contributor",
      progress: 45,
      openTasks: 2,
    },
    {
      name: "Onboarding — Bright Futures",
      role: "Contributor",
      progress: 90,
      openTasks: 1,
    },
  ],
  performance: {
    overall: 78,
    rating: 4.3,
    goals: [
      {
        title: "Reduce KYC turnaround to <48h",
        progress: 75,
        status: "On Track",
      },
      {
        title: "Complete CAMS certification",
        progress: 60,
        status: "On Track",
      },
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
    { t: "2h ago", text: "Clocked in" },
    {
      t: "Yesterday",
      text: "Completed task: Source of funds review — Acme Holdings",
    },
    { t: "Yesterday", text: "Submitted timesheet for week 24" },
    { t: "2 days ago", text: "Logged 6.5h billable on Q2 KYC Refresh" },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────

const ATTENDANCE_STYLE: Record<string, string> = {
  late: "bg-warning/10 text-warning border-warning/20",
  remote: "bg-info/10 text-info border-info/20",
  present: "bg-success/10 text-success border-success/20",
  absent: "bg-destructive/10 text-destructive border-destructive/20",
  on_leave: "bg-muted text-muted-foreground border-border",
};

const LEAVE_STATUS_STYLE: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const DISPUTE_TONE: Record<Dispute["status"], string> = {
  Open: "bg-warning/10 text-warning border-warning/20",
  Investigating: "bg-info/10 text-info border-info/20",
  Mediation: "bg-primary/10 text-primary border-primary/20",
  Resolved: "bg-success/10 text-success border-success/20",
  Escalated: "bg-destructive/10 text-destructive border-destructive/20",
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const fmtShort = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
const currency = (n: number) => `£${n.toLocaleString("en-GB")}`;

const fmtSalary = (
  amount: number | null | undefined,
  currencyCode?: string | null,
) => {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode || "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Fallback if currencyCode isn't a valid ISO code Intl recognizes
    return `${currencyCode ?? ""} ${amount.toLocaleString()}`.trim();
  }
};

const teamName = (e: Employee) =>
  typeof e.teamId === "object" && e.teamId !== null
    ? (e.teamId as HrTeam).name
    : "—";
const locName = (e: Employee) =>
  typeof e.locationId === "object" && e.locationId !== null
    ? (e.locationId as HrLocation).name
    : "—";
const teamLead = (e: Employee) =>
  typeof e.teamId === "object" && e.teamId !== null
    ? (e.teamId as HrTeam).lead || "Unassigned"
    : "—";

// ─── Component ────────────────────────────────────────────────

export function EmployeeDetailSheet({ employee, onClose }: Props) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [openDispute, setOpenDispute] = useState(false);
  const [dForm, setDForm] = useState<
    Omit<Dispute, "id" | "filedOn" | "status">
  >({
    type: "Grievance",
    title: "",
    note: "",
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["employee-detail", employee?._id],
    queryFn: () => fetchEmployeeDetail(employee!._id),
    enabled: !!employee,
    staleTime: 30_000,
  });

  if (!employee) return null;

  // Prefer the freshly-fetched detail.employee (fully populated, incl.
  // team lead, salary, taxId) over the prop, which may come from a list
  // endpoint with a thinner populate/select. Falls back to the prop
  // while detail is loading.
  const emp = detail?.employee ?? employee;

  const initials =
    `${emp.firstName[0] ?? ""}${emp.lastName[0] ?? ""}`.toUpperCase();
  const d = DUMMY;
  const openCount = disputes.filter((x) => x.status !== "Resolved").length;

  const leaveBalances = detail?.leave.balances ?? [];
  const leaveHistory = detail?.leave.history ?? [];
  const attRecent = detail?.attendance.recent ?? [];
  const attStats = detail?.attendance.stats;

  const annualLeft =
    leaveBalances.find((b) => b.type === "annual")?.daysLeft ?? 0;
  const sickLeft = leaveBalances.find((b) => b.type === "sick")?.daysLeft ?? 0;
  const upcoming = leaveHistory.filter(
    (r) => r.status === "approved" && new Date(r.startDate) > new Date(),
  );

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

  const cycle = (item: Dispute) => {
    const order: Dispute["status"][] = [
      "Open",
      "Investigating",
      "Mediation",
      "Resolved",
    ];
    const next = order[(order.indexOf(item.status) + 1) % order.length];
    setDisputes(
      disputes.map((x) => (x.id === item.id ? { ...x, status: next } : x)),
    );
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
                  {emp.firstName} {emp.lastName}
                </SheetTitle>
                <SheetDescription className="text-white/80">
                  {emp.jobTitle} · {teamName(emp)}
                </SheetDescription>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge
                    variant="outline"
                    className="bg-white/10 text-white border-white/30 capitalize"
                  >
                    {emp.employmentStatus?.replace("_", " ")}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-white/10 text-white border-white/30"
                  >
                    {emp.employeeNumber}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-white/10 text-white border-white/30"
                  >
                    Reports to {teamLead(emp)}
                  </Badge>
                </div>
              </div>
            </div>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3 mt-5 text-sm">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs opacity-80">Perf</p>
              <p className="font-bold text-lg">{d.performance.overall}%</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs opacity-80">Punctuality</p>
              <p className="font-bold text-lg">
                {detailLoading ? "—" : `${attStats?.punctuality ?? 100}%`}
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs opacity-80">Open Tasks</p>
              <p className="font-bold text-lg">
                {d.projects.reduce((s, p) => s + p.openTasks, 0)}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/15 hover:bg-white/25 text-white border-white/20"
              onClick={() => {
                downloadEmployeeReport(emp, detail);
                toast.success("Employee report downloaded.");
              }}
            >
              <Download className="h-4 w-4 mr-2" /> Download Report
            </Button>
          </div>
        </div>

        <div className="p-6">
          <Tabs defaultValue="overview" className="space-y-4">
            <div className="-mx-1 px-1">
              <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
                <TabsTrigger value="overview" className="text-xs">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="work" className="text-xs">
                  Work
                </TabsTrigger>
                <TabsTrigger value="time" className="text-xs">
                  Time & Leave
                </TabsTrigger>
                <TabsTrigger value="performance" className="text-xs">
                  Performance
                </TabsTrigger>
                <TabsTrigger value="payroll" className="text-xs">
                  Payroll
                </TabsTrigger>
                <TabsTrigger value="disputes" className="text-xs">
                  Disputes
                  {openCount > 0 && (
                    <span className="ml-1.5 h-4 w-4 rounded-full bg-warning text-white text-[9px] flex items-center justify-center">
                      {openCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="documents" className="text-xs">
                  Docs
                </TabsTrigger>
                <TabsTrigger value="onboarding" className="text-xs">
                  Onboarding
                </TabsTrigger>
                <TabsTrigger value="activity" className="text-xs">
                  Activity
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ── Overview ── */}
            <TabsContent value="overview" className="space-y-3">
              <Card>
                <CardContent className="p-4 space-y-2 text-sm">
                  <Row icon={Mail} label="Email" value={emp.email} />
                  {emp.phone && (
                    <Row icon={Phone} label="Phone" value={emp.phone} />
                  )}
                  <Row icon={MapPin} label="Location" value={locName(emp)} />
                  <Row
                    icon={Briefcase}
                    label="Reports to"
                    value={teamLead(emp)}
                  />
                  <Row
                    icon={CalendarDays}
                    label="Joined"
                    value={new Date(
                      emp.startDate ?? emp.createdAt ?? Date.now(),
                    ).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  />
                  <Row
                    icon={Shield}
                    label="Type"
                    value={(emp.employmentType ?? "").replace("_", " ")}
                  />
                  <Row
                    icon={Wallet}
                    label="Salary"
                    value={fmtSalary(emp.salary, emp.salaryCurrency)}
                  />
                  <Row
                    icon={FileText}
                    label="Tax ID"
                    value={emp.taxId ?? "—"}
                  />
                </CardContent>
              </Card>
              <div className="grid grid-cols-2 gap-3">
                <MiniStat
                  label="Clients"
                  value={d.assignedClients.length}
                  icon={Users}
                />
                <MiniStat
                  label="Projects"
                  value={d.projects.length}
                  icon={FolderKanban}
                />
                <MiniStat
                  label="This month"
                  value={detailLoading ? "…" : `${attStats?.monthHours ?? 0}h`}
                  icon={Clock}
                />
                <MiniStat
                  label="Annual left"
                  value={detailLoading ? "…" : `${annualLeft}d`}
                  icon={CalendarDays}
                />
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

            {/* ── Work (dummy — no CRM/Projects backend yet) ── */}
            <TabsContent value="work" className="space-y-3">
              <DummyNotice />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  Assigned Clients
                </p>
                <div className="space-y-2">
                  {d.assignedClients.map((c) => (
                    <Card key={c.name}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            Risk: {c.risk}
                          </p>
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
                  {d.projects.map((p) => (
                    <Card key={p.name}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div>
                            <p className="text-sm font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.role} · {p.openTasks} open task
                              {p.openTasks !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <span className="text-xs font-medium">
                            {p.progress}%
                          </span>
                        </div>
                        <Progress value={p.progress} className="h-1.5" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ── Time & Leave — REAL DATA ── */}
            <TabsContent value="time" className="space-y-3">
              {detailLoading ? (
                <LoadingBlock />
              ) : (
                <>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                        Recent shifts
                      </p>
                      {attRecent.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">
                          No attendance recorded yet.
                        </p>
                      ) : (
                        attRecent.map((r) => (
                          <div
                            key={r._id}
                            className="flex items-center justify-between py-2 border-b last:border-b-0 text-sm"
                          >
                            <span className="font-medium w-16 shrink-0">
                              {fmtShort(r.date)}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {fmtTime(r.clockIn)} →{" "}
                              {r.clockOut ? fmtTime(r.clockOut) : "—"}
                            </span>
                            <span className="font-mono text-xs">
                              {r.hoursWorked?.toFixed(1) ?? "—"}h
                            </span>
                            <Badge
                              variant="outline"
                              className={ATTENDANCE_STYLE[r.status] ?? ""}
                            >
                              <span className="capitalize">{r.status}</span>
                            </Badge>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-2 gap-3">
                    <MiniStat
                      label="Annual left"
                      value={`${annualLeft}d`}
                      icon={CalendarDays}
                    />
                    <MiniStat
                      label="Sick left"
                      value={`${sickLeft}d`}
                      icon={CalendarDays}
                    />
                  </div>

                  {upcoming.length > 0 && (
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                          Upcoming approved leave
                        </p>
                        <div className="space-y-2">
                          {upcoming.map((r) => (
                            <div
                              key={r._id}
                              className="flex items-center justify-between text-sm py-1.5"
                            >
                              <div>
                                <p className="font-medium capitalize">
                                  {r.type}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {fmtShort(r.startDate)} → {fmt(r.endDate)} ·{" "}
                                  {r.days}d
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className="bg-success/10 text-success border-success/20"
                              >
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
                      {leaveHistory.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">
                          No leave requests yet.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {leaveHistory.map((r) => (
                            <div
                              key={r._id}
                              className="flex items-center justify-between text-sm py-1.5 border-b last:border-b-0"
                            >
                              <div>
                                <p className="font-medium capitalize">
                                  {r.type} · {r.days}d
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {fmtShort(r.startDate)} → {fmt(r.endDate)}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className={LEAVE_STATUS_STYLE[r.status] ?? ""}
                              >
                                <span className="capitalize">{r.status}</span>
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* ── Performance (dummy — no Performance module yet) ── */}
            <TabsContent value="performance" className="space-y-3">
              <DummyNotice />
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Latest Review Rating
                    </p>
                    <p className="text-2xl font-bold">
                      {d.performance.rating}/5
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-2 rounded-lg">
                    <Star className="h-4 w-4 fill-white" />
                    <span className="font-bold">H2 2025</span>
                  </div>
                </CardContent>
              </Card>
              <div className="space-y-2">
                {d.performance.goals.map((g) => (
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

            {/* ── Payroll (dummy — no Payroll module yet) ── */}
            <TabsContent value="payroll" className="space-y-3">
              <DummyNotice />
              <Card>
                <CardContent className="p-4 space-y-2 text-sm">
                  <Row
                    icon={Wallet}
                    label="Base salary"
                    value={`${currency(d.payroll.salary)} / month`}
                  />
                  <Row
                    icon={Wallet}
                    label="YTD gross"
                    value={currency(d.payroll.ytdGross)}
                  />
                  <Row
                    icon={CalendarDays}
                    label="Next pay date"
                    value={new Date(d.payroll.nextPayDate).toLocaleDateString(
                      "en-GB",
                      { day: "numeric", month: "long" },
                    )}
                  />
                  <Row
                    icon={Wallet}
                    label="Pension pot"
                    value={currency(d.payroll.pensionPot)}
                  />
                </CardContent>
              </Card>
              {d.payroll.loans.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                      Active loans
                    </p>
                    {d.payroll.loans.map((l, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-sm py-1"
                      >
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
                  {d.payroll.payslips.map((p) => (
                    <div
                      key={p.period}
                      className="flex items-center justify-between text-sm py-2 border-b last:border-b-0"
                    >
                      <div>
                        <p className="font-medium">{p.period}</p>
                        <p className="text-xs text-muted-foreground">
                          Net {currency(p.net)} · {fmt(p.date)}
                        </p>
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
                disputes.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Gavel className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-medium truncate">
                              {item.title}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.type} · filed {item.filedOn}
                          </p>
                          {item.note && (
                            <p className="text-xs mt-2">{item.note}</p>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={`${DISPUTE_TONE[item.status]} cursor-pointer`}
                          onClick={() => cycle(item)}
                        >
                          {item.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* ── Documents (dummy) ── */}
            <TabsContent value="documents" className="space-y-2">
              <DummyNotice />
              {d.documents.map((doc) => (
                <Card key={doc.name}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmt(doc.date)}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* ── Onboarding ── */}
            <TabsContent value="onboarding" className="space-y-2">
              {(() => {
                const sub = getSubmission(emp.email);
                if (!sub) {
                  return (
                    <Card>
                      <CardContent className="p-8 text-center text-sm text-muted-foreground">
                        Employee has not completed onboarding yet.
                      </CardContent>
                    </Card>
                  );
                }
                return (
                  <>
                    <Card>
                      <CardContent className="p-4 space-y-1 text-sm">
                        <Row
                          icon={FileText}
                          label="Signature"
                          value={sub.signature}
                        />
                        <Row
                          icon={CalendarDays}
                          label="Submitted"
                          value={new Date(sub.submittedAt).toLocaleString(
                            "en-GB",
                          )}
                        />
                        <Row
                          icon={CheckCircle2}
                          label="Documents agreed"
                          value={`${sub.docs.filter((x) => x.checked).length} / ${sub.docs.length}`}
                        />
                      </CardContent>
                    </Card>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mt-3 mb-1">
                      Documents at time of signing
                    </p>
                    {sub.docs.map((doc) => (
                      <Card key={doc.id}>
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="h-4 w-4 text-primary shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {doc.title}
                              </p>
                              <p className="text-[10px] uppercase text-muted-foreground">
                                {doc.kind}
                              </p>
                            </div>
                          </div>
                          {doc.checked ? (
                            <Badge
                              variant="outline"
                              className="bg-success/10 text-success border-success/20"
                            >
                              Agreed
                            </Badge>
                          ) : (
                            <Badge variant="outline">Skipped</Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </>
                );
              })()}
            </TabsContent>

            {/* ── Activity (dummy) ── */}
            <TabsContent value="activity" className="space-y-2">
              <DummyNotice />
              {d.activity.map((act, i) => (
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
                <Select
                  value={dForm.type}
                  onValueChange={(v: any) => setDForm({ ...dForm, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Grievance",
                      "Disciplinary",
                      "Harassment",
                      "Performance",
                      "Other",
                    ].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Title</Label>
                <Input
                  value={dForm.title}
                  onChange={(e) =>
                    setDForm({ ...dForm, title: e.target.value })
                  }
                />
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
                <AlertTriangle className="h-4 w-4 shrink-0" /> Visible to HR
                admins only.
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={addDispute}
                className="bg-gradient-to-r from-primary to-secondary"
              >
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

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-muted-foreground flex items-center gap-2 text-xs">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: any;
  icon: any;
}) {
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

function DummyNotice() {
  return (
    <div className="text-xs text-muted-foreground bg-muted/40 border rounded-lg px-3 py-2">
      This section uses placeholder data — the underlying module isn't built
      yet.
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">Loading…</span>
    </div>
  );
}
