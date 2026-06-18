import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
  Building2,
  PiggyBank,
  CreditCard,
  Banknote,
  TrendingUp,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Dummy Employee Profile Data ──────────────────────────────

const EMPLOYEE = {
  firstName: "Alex",
  lastName: "Morgan",
  email: "alex.morgan@lexora.co",
  phone: "+44 7700 900123",
  jobTitle: "Senior AML Analyst",
  employeeNumber: "EMP-2024-0042",
  employmentStatus: "active" as const,
  employmentType: "full_time" as const,
  startDate: "2024-03-12",
  team: "Compliance & Risk",
  location: "London, UK",
  reportsTo: "Sarah Lee",
  salary: 6200,
  salaryCurrency: "GBP",
  taxId: "TX-99887766",
  dateOfBirth: "1992-07-15",
  nationality: "British",
  emergencyContactName: "Jordan Morgan",
  emergencyContactPhone: "+44 7700 900456",
  address: {
    street: "42 Baker Street",
    city: "London",
    state: "England",
    country: "United Kingdom",
  },
  bankName: "Barclays",
  bankAccountNumber: "****4421",
  pensionPot: 14200,
  annualLeaveBalance: 18,
  annualLeaveUsed: 7,
  sickLeaveBalance: 10,
  sickLeaveUsed: 2,
};

const DUMMY = {
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
  performance: {
    overall: 78,
    rating: 4.3,
    goals: [
      { title: "Reduce KYC turnaround to <48h", progress: 75, status: "On Track" as const },
      { title: "Complete CAMS certification", progress: 60, status: "On Track" as const },
      { title: "Zero SLA breaches", progress: 40, status: "At Risk" as const },
    ],
  },
  payroll: {
    ytdGross: 22905,
    nextPayDate: "2026-06-30",
    loans: [{ type: "Salary Advance", balance: 750, installment: 63 }],
    payslips: [
      { period: "May 2026", net: 4585, date: "2026-05-30", gross: 6200 },
      { period: "Apr 2026", net: 4225, date: "2026-04-30", gross: 5705 },
      { period: "Mar 2026", net: 4072, date: "2026-03-30", gross: 5500 },
    ],
  },
  documents: [
    { name: "Employment Contract", date: "2024-03-12" },
    { name: "NDA — Confidentiality", date: "2024-03-12" },
    { name: "ID Verification", date: "2024-03-10" },
    { name: "Right to Work", date: "2024-03-10" },
    { name: "P60 Annual Statement 2025", date: "2026-01-15" },
  ],
  activity: [
    { t: "2h ago", text: "Clocked in" },
    { t: "Yesterday", text: "Completed task: Source of funds review — Acme Holdings" },
    { t: "Yesterday", text: "Submitted timesheet for week 24" },
    { t: "2 days ago", text: "Logged 6.5h billable on Q2 KYC Refresh" },
    { t: "3 days ago", text: "Requested 3 days annual leave (Jun 28–30)" },
    { t: "Last week", text: "Performance review submitted by Sarah Lee" },
  ],
  attendance: [
    { date: "2026-06-17", status: "present", checkIn: "08:52", checkOut: "17:45", hours: 8.5 },
    { date: "2026-06-16", status: "present", checkIn: "08:47", checkOut: "17:30", hours: 8.3 },
    { date: "2026-06-15", status: "remote", checkIn: "09:00", checkOut: "17:50", hours: 8.5 },
    { date: "2026-06-14", status: "present", checkIn: "08:55", checkOut: "17:40", hours: 8.4 },
    { date: "2026-06-13", status: "late", checkIn: "09:25", checkOut: "17:30", hours: 7.8 },
  ],
  benefits: [
    { name: "Pension Plan (Employer 8% + You 6%)", value: "Active", note: "Vested: £14,200" },
    { name: "Health Insurance — Family Cover", value: "Active", note: "Bupa, Tier 2" },
    { name: "Life Insurance — 4× Salary", value: "Active", note: "" },
    { name: "Wellness Stipend", value: "£600 / year", note: "£250 used" },
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

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const fmtShort = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

const currency = (n: number) =>
  `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtSalary = (amount: number | null, currencyCode?: string) => {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode || "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currencyCode ?? ""} ${amount.toLocaleString()}`.trim();
  }
};

const initials = `${EMPLOYEE.firstName[0]}${EMPLOYEE.lastName[0]}`.toUpperCase();

export default function MyProfile() {
  const { toast } = useToast();
  const [activePayslip, setActivePayslip] = useState<(typeof DUMMY.payroll.payslips)[0] | null>(null);
  const d = DUMMY;

  const [emergency, setEmergency] = useState({
    name: EMPLOYEE.emergencyContactName,
    phone: EMPLOYEE.emergencyContactPhone,
  });
  const [editingEmergency, setEditingEmergency] = useState(false);
  const [emergencyDraft, setEmergencyDraft] = useState(emergency);

  const startEdit = () => {
    setEmergencyDraft(emergency);
    setEditingEmergency(true);
  };
  const saveEmergency = () => {
    setEmergency(emergencyDraft);
    setEditingEmergency(false);
    toast({ title: "Emergency contact updated" });
  };
  const cancelEdit = () => setEditingEmergency(false);

  const download = (label: string) =>
    toast({ title: "Download started", description: label });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-secondary text-white rounded-xl p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20 ring-4 ring-white/20">
            <AvatarFallback className="bg-white/10 text-white text-2xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white">
              {EMPLOYEE.firstName} {EMPLOYEE.lastName}
            </h1>
            <p className="text-white/80">
              {EMPLOYEE.jobTitle} · {EMPLOYEE.team}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="outline" className="bg-white/10 text-white border-white/30 capitalize">
                {EMPLOYEE.employmentStatus.replace("_", " ")}
              </Badge>
              <Badge variant="outline" className="bg-white/10 text-white border-white/30">
                {EMPLOYEE.employeeNumber}
              </Badge>
              <Badge variant="outline" className="bg-white/10 text-white border-white/30">
                Reports to {EMPLOYEE.reportsTo}
              </Badge>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 text-sm">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-xs opacity-80">Performance</p>
            <p className="font-bold text-lg">{d.performance.overall}%</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-xs opacity-80">Punctuality</p>
            <p className="font-bold text-lg">96%</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-xs opacity-80">Open Tasks</p>
            <p className="font-bold text-lg">
              {d.projects.reduce((s, p) => s + p.openTasks, 0)}
            </p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-xs opacity-80">YTD Gross</p>
            <p className="font-bold text-lg">{currency(d.payroll.ytdGross)}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="work" className="text-xs">Work</TabsTrigger>
          <TabsTrigger value="time" className="text-xs">Time & Leave</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs">Performance</TabsTrigger>
          <TabsTrigger value="payroll" className="text-xs">Payroll</TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <h3 className="font-semibold text-base mb-2">Contact Details</h3>
                <Row icon={Mail} label="Email" value={EMPLOYEE.email} />
                <Row icon={Phone} label="Phone" value={EMPLOYEE.phone} />
                <Row icon={MapPin} label="Location" value={EMPLOYEE.location} />
                <Row icon={Building2} label="Address" value={`${EMPLOYEE.address.street}, ${EMPLOYEE.address.city}`} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <h3 className="font-semibold text-base mb-2">Employment</h3>
                <Row icon={Briefcase} label="Reports to" value={EMPLOYEE.reportsTo} />
                <Row icon={CalendarDays} label="Joined" value={fmt(EMPLOYEE.startDate)} />
                <Row icon={Shield} label="Type" value={EMPLOYEE.employmentType.replace("_", " ")} />
                <Row icon={Wallet} label="Salary" value={fmtSalary(EMPLOYEE.salary, EMPLOYEE.salaryCurrency)} />
                <Row icon={FileText} label="Tax ID" value={EMPLOYEE.taxId} />
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="Clients" value={d.assignedClients.length} icon={Users} />
            <MiniStat label="Projects" value={d.projects.length} icon={FolderKanban} />
            <MiniStat label="This month" value="142h" icon={Clock} />
            <MiniStat label="Annual left" value={`${EMPLOYEE.annualLeaveBalance}d`} icon={CalendarDays} />
          </div>
          <Card>
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-base">Emergency Contact</h3>
                {!editingEmergency ? (
                  <Button size="sm" variant="outline" onClick={startEdit}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={cancelEdit}>
                      <X className="h-3.5 w-3.5 mr-1.5" /> Cancel
                    </Button>
                    <Button size="sm" onClick={saveEmergency}>
                      <Save className="h-3.5 w-3.5 mr-1.5" /> Save
                    </Button>
                  </div>
                )}
              </div>
              {!editingEmergency ? (
                <>
                  <Row icon={Phone} label="Name" value={emergency.name || "—"} />
                  <Row icon={Phone} label="Phone" value={emergency.phone || "—"} />
                </>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="ec-name">Contact name</Label>
                    <Input
                      id="ec-name"
                      value={emergencyDraft.name}
                      onChange={(e) => setEmergencyDraft({ ...emergencyDraft, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ec-phone">Contact phone</Label>
                    <Input
                      id="ec-phone"
                      value={emergencyDraft.phone}
                      onChange={(e) => setEmergencyDraft({ ...emergencyDraft, phone: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Work ── */}
        <TabsContent value="work" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                Assigned Clients
              </p>
              <div className="space-y-2">
                {d.assignedClients.map((c) => (
                  <div key={c.name} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">Risk: {c.risk}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">{c.status.replace("_", " ")}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                Active Projects
              </p>
              <div className="space-y-3">
                {d.projects.map((p) => (
                  <div key={p.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.role} · {p.openTasks} open tasks</p>
                      </div>
                      <span className="text-xs font-medium">{p.progress}%</span>
                    </div>
                    <Progress value={p.progress} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Time & Leave ── */}
        <TabsContent value="time" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="Annual Left" value={`${EMPLOYEE.annualLeaveBalance}d`} icon={CalendarDays} />
            <MiniStat label="Annual Used" value={`${EMPLOYEE.annualLeaveUsed}d`} icon={CalendarDays} />
            <MiniStat label="Sick Left" value={`${EMPLOYEE.sickLeaveBalance}d`} icon={CalendarDays} />
            <MiniStat label="Sick Used" value={`${EMPLOYEE.sickLeaveUsed}d`} icon={CalendarDays} />
          </div>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                Recent Attendance (Last 5 Days)
              </p>
              <div className="space-y-2">
                {d.attendance.map((a) => (
                  <div key={a.date} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={ATTENDANCE_STYLE[a.status] + " capitalize"}>
                        {a.status.replace("_", " ")}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">{fmtShort(a.date)}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.checkIn} – {a.checkOut}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-medium">{a.hours}h</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                Upcoming Leave
              </p>
              <div className="p-4 border rounded-lg text-center">
                <p className="text-sm text-muted-foreground">No approved upcoming leave.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Performance ── */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="Overall" value={`${d.performance.overall}%`} icon={TrendingUp} />
            <MiniStat label="Latest Rating" value={`${d.performance.rating}/5`} icon={Star} />
            <MiniStat label="Goals On Track" value={`${d.performance.goals.filter((g) => g.status === "On Track").length}`} icon={CheckCircle2} />
            <MiniStat label="At Risk" value={`${d.performance.goals.filter((g) => g.status === "At Risk").length}`} icon={Target} />
          </div>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                Current Goals
              </p>
              <div className="space-y-4">
                {d.performance.goals.map((g) => (
                  <div key={g.title} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{g.title}</p>
                      <Badge
                        variant="outline"
                        className={
                          g.status === "On Track"
                            ? "bg-info/10 text-info border-info/20"
                            : "bg-warning/10 text-warning border-warning/20"
                        }
                      >
                        {g.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{g.progress}%</span>
                    </div>
                    <Progress value={g.progress} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1">
              <MessageSquare className="h-4 w-4 mr-2" /> Request Feedback
            </Button>
            <Button variant="outline" className="flex-1">
              <Target className="h-4 w-4 mr-2" /> Set Goal
            </Button>
          </div>
        </TabsContent>

        {/* ── Payroll ── */}
        <TabsContent value="payroll" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="YTD Gross" value={currency(d.payroll.ytdGross)} icon={Banknote} />
            <MiniStat label="Next Pay" value={fmtShort(d.payroll.nextPayDate)} icon={CalendarDays} />
            <MiniStat label="Pension Pot" value={currency(EMPLOYEE.pensionPot)} icon={PiggyBank} />
            <MiniStat label="Loan Bal" value={currency(d.payroll.loans[0].balance)} icon={CreditCard} />
          </div>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                Recent Payslips
              </p>
              <div className="space-y-2">
                {d.payroll.payslips.map((p) => (
                  <div
                    key={p.period}
                    className="flex items-center justify-between py-3 border-b last:border-b-0 hover:bg-muted/30 px-2 rounded transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{p.period}</p>
                      <p className="text-xs text-muted-foreground">Paid {fmt(p.date)}</p>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-xs">
                      <div className="text-right">
                        <p className="text-muted-foreground">Gross</p>
                        <p className="font-mono text-sm text-foreground">{currency(p.gross)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">Net</p>
                        <p className="font-mono text-sm font-semibold text-foreground">{currency(p.net)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">Paid</Badge>
                      <Button size="sm" variant="ghost" onClick={() => setActivePayslip(p)}>
                        View
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => download(`Payslip ${p.period}`)}>
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                Active Benefits
              </p>
              <div className="space-y-2">
                {d.benefits.map((b) => (
                  <div key={b.name} className="flex items-center justify-between py-3 border-b last:border-b-0">
                    <div>
                      <p className="text-sm font-medium">{b.name}</p>
                      {b.note && <p className="text-xs text-muted-foreground">{b.note}</p>}
                    </div>
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                      {b.value}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Payslip Detail Sheet */}
      <Sheet open={!!activePayslip} onOpenChange={(v) => !v && setActivePayslip(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {activePayslip && (
            <>
              <SheetHeader>
                <SheetTitle>{activePayslip.period}</SheetTitle>
                <SheetDescription>Paid {fmt(activePayslip.date)}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                <div className="bg-gradient-to-br from-primary to-secondary text-white p-5 rounded-xl">
                  <p className="text-xs opacity-80 uppercase tracking-wide">Net Pay</p>
                  <p className="text-3xl font-bold mt-1">{currency(activePayslip.net)}</p>
                  <div className="flex justify-between text-xs opacity-90 mt-3 pt-3 border-t border-white/20">
                    <span>Gross: {currency(activePayslip.gross)}</span>
                    <span>Deductions: {currency(activePayslip.gross - activePayslip.net)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-success uppercase tracking-wide mb-2 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Earnings
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm py-1.5 border-b last:border-b-0">
                      <span>Base salary</span>
                      <span className="font-mono">{currency(activePayslip.gross)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold pt-2">
                      <span>Total Gross</span>
                      <span className="font-mono">{currency(activePayslip.gross)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-destructive uppercase tracking-wide mb-2">
                    Deductions
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm py-1.5 border-b last:border-b-0">
                      <span>Total Deductions</span>
                      <span className="font-mono">-{currency(activePayslip.gross - activePayslip.net)}</span>
                    </div>
                  </div>
                </div>
                <Button className="w-full bg-gradient-to-r from-primary to-secondary" onClick={() => download(`Payslip ${activePayslip.period}`)}>
                  <Download className="h-4 w-4 mr-2" /> Download PDF
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
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
    <div className="flex items-center gap-3 py-1.5">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: any;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-xl font-bold mt-1">{value}</p>
        </div>
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardContent>
    </Card>
  );
}
