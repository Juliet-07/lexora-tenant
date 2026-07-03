import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Loader2,
  Folder,
} from "lucide-react";
import { EmployeeDocumentsPanel } from "@/components/hr/EmployeeDocumentsPanel";
import { useToast } from "@/hooks/use-toast";
import {
  fetchMyProfile,
  updateMyProfile,
  fetchActiveShift,
  fetchAttendanceStats,
  fetchAttendanceHistory,
  fetchMyLeaveBalance,
  fetchMyLeaveRequests,
  type Employee,
  type HrTeam,
  type HrLocation,
  type UpdateMyProfileDto,
} from "@/lib/hr-api";

// ─── Dummy data — for modules with no backend yet ──────────────

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
    cycles: [
      {
        cycle: "H1 2026",
        period: "Jan – Jun 2026",
        completedOn: "2026-06-28",
        reviewer: "Amina Khan",
        kpiScore: 82.4,
        rating: 4.4,
        band: "Exceeds Expectations",
        status: "Completed" as const,
      },
      {
        cycle: "H2 2025",
        period: "Jul – Dec 2025",
        completedOn: "2025-12-20",
        reviewer: "Amina Khan",
        kpiScore: 76.1,
        rating: 4.1,
        band: "Meets Expectations",
        status: "Completed" as const,
      },
      {
        cycle: "H1 2025",
        period: "Jan – Jun 2025",
        completedOn: "2025-06-25",
        reviewer: "David Osei",
        kpiScore: 71.8,
        rating: 3.8,
        band: "Meets Expectations",
        status: "Completed" as const,
      },
      {
        cycle: "H2 2024",
        period: "Jul – Dec 2024",
        completedOn: "2024-12-18",
        reviewer: "David Osei",
        kpiScore: 68.5,
        rating: 3.6,
        band: "Meets Expectations",
        status: "Completed" as const,
      },
    ],
  },

  payroll: {
    ytdGross: 22905,
    nextPayDate: "2026-06-30",
    pensionPot: 14200,
    loans: [{ type: "Salary Advance", balance: 750, installment: 63 }],
    payslips: [
      { period: "May 2026", net: 4585, date: "2026-05-30", gross: 6200 },
      { period: "Apr 2026", net: 4225, date: "2026-04-30", gross: 5705 },
      { period: "Mar 2026", net: 4072, date: "2026-03-30", gross: 5500 },
    ],
  },
  benefits: [
    {
      name: "Pension Plan (Employer 8% + You 6%)",
      value: "Active",
      note: "Vested: £14,200",
    },
    {
      name: "Health Insurance — Family Cover",
      value: "Active",
      note: "Bupa, Tier 2",
    },
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

const LEAVE_STATUS_STYLE: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground border-border",
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

const currency = (n: number) =>
  `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
    return `${currencyCode ?? ""} ${amount.toLocaleString()}`.trim();
  }
};

const teamName = (e: Employee) =>
  typeof e.teamId === "object" && e.teamId !== null
    ? (e.teamId as HrTeam).name
    : "—";
const reportsTo = (e: Employee): string => {
  if (e.hierarchyRole === "head_of_department") {
    // reportsToTenantId — your API likely returns a tenant object or just an ID
    if (
      typeof e.reportsToTenantId === "object" &&
      e.reportsToTenantId !== null
    ) {
      return (e.reportsToTenantId as any).name ?? "Organisation";
    }
    return e.reportsToTenantId ? "Organisation" : "—";
  }

  // Everyone else reports to their manager via reportsToManagerId
  if (
    typeof e.reportsToManagerId === "object" &&
    e.reportsToManagerId !== null
  ) {
    const mgr = e.reportsToManagerId as any;
    return `${mgr.firstName ?? ""} ${mgr.lastName ?? ""}`.trim() || "—";
  }

  return "—";
};
const locName = (e: Employee) =>
  typeof e.locationId === "object" && e.locationId !== null
    ? (e.locationId as HrLocation).name
    : "—";

const fmtAddress = (a: Employee["address"]) => {
  if (!a) return "—";
  const parts = [a.street, a.city, a.state, a.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
};

// ─── Component ────────────────────────────────────────────────

export default function MyProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const d = DUMMY;

  const [activePayslip, setActivePayslip] = useState<
    (typeof DUMMY.payroll.payslips)[0] | null
  >(null);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: fetchMyProfile,
    staleTime: 30_000,
  });

  const { data: attStats } = useQuery({
    queryKey: ["attendance-stats"],
    queryFn: fetchAttendanceStats,
    staleTime: 60_000,
  });
  const { data: attHistory = [] } = useQuery({
    queryKey: ["attendance-history"],
    queryFn: () => fetchAttendanceHistory(5),
    staleTime: 60_000,
  });
  const { data: leaveBalanceResp } = useQuery({
    queryKey: ["my-leave-balance"],
    queryFn: fetchMyLeaveBalance,
    staleTime: 60_000,
  });
  const { data: leaveRequests = [] } = useQuery({
    queryKey: ["my-leave-requests"],
    queryFn: fetchMyLeaveRequests,
    staleTime: 60_000,
  });

  const leaveBalances = leaveBalanceResp?.balances ?? [];
  const annualBalance = leaveBalances.find((b) => b.type === "annual");
  const sickBalance = leaveBalances.find((b) => b.type === "sick");
  const upcomingLeave = leaveRequests.filter(
    (r) => r.status === "approved" && new Date(r.startDate) > new Date(),
  );

  const [editingPersonal, setEditingPersonal] = useState(false);
  const [draft, setDraft] = useState<UpdateMyProfileDto>({});

  useEffect(() => {
    if (profile && !editingPersonal) {
      setDraft({
        dateOfBirth: profile.dateOfBirth ?? undefined,
        nationality: profile.nationality ?? undefined,
        address: profile.address ?? {},
        emergencyContactName: profile.emergencyContactName ?? undefined,
        emergencyContactPhone: profile.emergencyContactPhone ?? undefined,
      });
    }
  }, [profile, editingPersonal]);

  const updateMutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      setEditingPersonal(false);
      toast({ title: "Profile updated" });
    },
    onError: (err: any) =>
      toast({
        title: "Update failed",
        description: err?.response?.data?.message ?? "Please try again.",
      }),
  });

  const startEdit = () => setEditingPersonal(true);
  const cancelEdit = () => setEditingPersonal(false);
  const saveEdit = () => updateMutation.mutate(draft);

  const download = (label: string) =>
    toast({ title: "Download started", description: label });

  if (profileLoading || !profile) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading profile…</span>
      </div>
    );
  }

  const initials =
    `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase();

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-primary to-secondary text-white rounded-xl p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20 ring-4 ring-white/20">
            <AvatarFallback className="bg-white/10 text-white text-2xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white">
              {profile.firstName} {profile.lastName}
            </h1>
            <p className="text-white/80">
              {profile.jobTitle} · {teamName(profile)}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge
                variant="outline"
                className="bg-white/10 text-white border-white/30 capitalize"
              >
                {profile.employmentStatus?.replace("_", " ")}
              </Badge>
              <Badge
                variant="outline"
                className="bg-white/10 text-white border-white/30"
              >
                {profile.employeeNumber}
              </Badge>
              <Badge
                variant="outline"
                className="bg-white/10 text-white border-white/30"
              >
                Reports to {reportsTo(profile)}
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
            <p className="text-xs opacity-80">This month</p>
            <p className="font-bold text-lg">{attStats?.monthHours ?? 0}h</p>
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
          <TabsTrigger value="documents" className="text-xs">
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <h3 className="font-semibold text-base mb-2">
                  Contact Details
                </h3>
                <Row icon={Mail} label="Email" value={profile.email} />
                {profile.phone && (
                  <Row icon={Phone} label="Phone" value={profile.phone} />
                )}
                <Row icon={MapPin} label="Location" value={locName(profile)} />
                <Row
                  icon={Building2}
                  label="Address"
                  value={fmtAddress(profile.address)}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <h3 className="font-semibold text-base mb-2">Employment</h3>
                <Row
                  icon={Briefcase}
                  label="Reports to"
                  value={reportsTo(profile)}
                />
                <Row
                  icon={CalendarDays}
                  label="Joined"
                  value={fmt(profile.startDate ?? profile.createdAt)}
                />
                <Row
                  icon={Shield}
                  label="Type"
                  value={(profile.employmentType ?? "").replace("_", " ")}
                />
                <Row
                  icon={Wallet}
                  label="Salary"
                  value={fmtSalary(profile.salary, profile.salaryCurrency)}
                />
                <Row
                  icon={FileText}
                  label="Tax ID"
                  value={profile.taxId ?? "—"}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
              value={`${attStats?.monthHours ?? 0}h`}
              icon={Clock}
            />
            <MiniStat
              label="Annual left"
              value={`${annualBalance?.daysLeft ?? 0}d`}
              icon={CalendarDays}
            />
          </div>

          <Card>
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-base">
                  Personal & Emergency Contact
                </h3>
                {!editingPersonal ? (
                  <Button size="sm" variant="outline" onClick={startEdit}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cancelEdit}
                      disabled={updateMutation.isPending}
                    >
                      <X className="h-3.5 w-3.5 mr-1.5" /> Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveEdit}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Save
                    </Button>
                  </div>
                )}
              </div>

              {!editingPersonal ? (
                <>
                  <Row
                    icon={CalendarDays}
                    label="Date of birth"
                    value={profile.dateOfBirth ? fmt(profile.dateOfBirth) : "—"}
                  />
                  <Row
                    icon={Shield}
                    label="Nationality"
                    value={profile.nationality ?? "—"}
                  />
                  <Row
                    icon={Building2}
                    label="Address"
                    value={fmtAddress(profile.address)}
                  />
                  <Row
                    icon={Phone}
                    label="Emergency contact name"
                    value={profile.emergencyContactName ?? "—"}
                  />
                  <Row
                    icon={Phone}
                    label="Emergency contact phone"
                    value={profile.emergencyContactPhone ?? "—"}
                  />
                </>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="dob">Date of birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={
                        draft.dateOfBirth ? draft.dateOfBirth.slice(0, 10) : ""
                      }
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, dateOfBirth: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nationality">Nationality</Label>
                    <Input
                      id="nationality"
                      value={draft.nationality ?? ""}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, nationality: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="addr-street">Street address</Label>
                    <Input
                      id="addr-street"
                      value={draft.address?.street ?? ""}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          address: { ...p.address, street: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="addr-city">City</Label>
                    <Input
                      id="addr-city"
                      value={draft.address?.city ?? ""}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          address: { ...p.address, city: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="addr-state">State / Region</Label>
                    <Input
                      id="addr-state"
                      value={draft.address?.state ?? ""}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          address: { ...p.address, state: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="addr-country">Country</Label>
                    <Input
                      id="addr-country"
                      value={draft.address?.country ?? ""}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          address: { ...p.address, country: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ec-name">Emergency contact name</Label>
                    <Input
                      id="ec-name"
                      value={draft.emergencyContactName ?? ""}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          emergencyContactName: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ec-phone">Emergency contact phone</Label>
                    <Input
                      id="ec-phone"
                      value={draft.emergencyContactPhone ?? ""}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          emergencyContactPhone: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="work" className="space-y-4">
          <DummyNotice />
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                Assigned Clients
              </p>
              <div className="space-y-2">
                {d.assignedClients.map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        Risk: {c.risk}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {c.status.replace("_", " ")}
                    </Badge>
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
                        <p className="text-xs text-muted-foreground">
                          {p.role} · {p.openTasks} open tasks
                        </p>
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

        <TabsContent value="time" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat
              label="Annual Left"
              value={`${annualBalance?.daysLeft ?? 0}d`}
              icon={CalendarDays}
            />
            <MiniStat
              label="Annual Used"
              value={`${annualBalance?.daysUsed ?? 0}d`}
              icon={CalendarDays}
            />
            <MiniStat
              label="Sick Left"
              value={`${sickBalance?.daysLeft ?? 0}d`}
              icon={CalendarDays}
            />
            <MiniStat
              label="Sick Used"
              value={`${sickBalance?.daysUsed ?? 0}d`}
              icon={CalendarDays}
            />
          </div>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                Recent Attendance (Last 5)
              </p>
              {attHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No attendance records yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {attHistory.map((a) => (
                    <div
                      key={a._id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={
                            (ATTENDANCE_STYLE[a.status] ?? "") + " capitalize"
                          }
                        >
                          {a.status.replace("_", " ")}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">
                            {fmtShort(a.date)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {fmtTime(a.clockIn)} –{" "}
                            {a.clockOut ? fmtTime(a.clockOut) : "—"}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-medium">
                        {a.hoursWorked?.toFixed(1) ?? "—"}h
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                Upcoming Leave
              </p>
              {upcomingLeave.length === 0 ? (
                <div className="p-4 border rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    No approved upcoming leave.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingLeave.map((r) => (
                    <div
                      key={r._id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {r.type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {fmtShort(r.startDate)} → {fmt(r.endDate)} · {r.days}d
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={LEAVE_STATUS_STYLE.approved}
                      >
                        Approved
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <DummyNotice />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat
              label="Overall"
              value={`${d.performance.overall}%`}
              icon={TrendingUp}
            />
            <MiniStat
              label="Latest Rating"
              value={`${d.performance.rating}/5`}
              icon={Star}
            />
            <MiniStat
              label="Goals On Track"
              value={`${d.performance.goals.filter((g) => g.status === "On Track").length}`}
              icon={CheckCircle2}
            />
            <MiniStat
              label="At Risk"
              value={`${d.performance.goals.filter((g) => g.status === "At Risk").length}`}
              icon={Target}
            />
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

        <TabsContent value="payroll" className="space-y-4">
          <DummyNotice />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat
              label="YTD Gross"
              value={currency(d.payroll.ytdGross)}
              icon={Banknote}
            />
            <MiniStat
              label="Next Pay"
              value={fmtShort(d.payroll.nextPayDate)}
              icon={CalendarDays}
            />
            <MiniStat
              label="Pension Pot"
              value={currency(d.payroll.pensionPot)}
              icon={PiggyBank}
            />
            <MiniStat
              label="Loan Bal"
              value={currency(d.payroll.loans[0].balance)}
              icon={CreditCard}
            />
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
                      <p className="text-xs text-muted-foreground">
                        Paid {fmt(p.date)}
                      </p>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-xs">
                      <div className="text-right">
                        <p className="text-muted-foreground">Gross</p>
                        <p className="font-mono text-sm text-foreground">
                          {currency(p.gross)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">Net</p>
                        <p className="font-mono text-sm font-semibold text-foreground">
                          {currency(p.net)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="bg-success/10 text-success border-success/20"
                      >
                        Paid
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setActivePayslip(p)}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => download(`Payslip ${p.period}`)}
                      >
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
                  <div
                    key={b.name}
                    className="flex items-center justify-between py-3 border-b last:border-b-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{b.name}</p>
                      {b.note && (
                        <p className="text-xs text-muted-foreground">
                          {b.note}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-success/10 text-success border-success/20"
                    >
                      {b.value}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <EmployeeDocumentsPanel
            uploadedBy="employee"
            uploadedByName={`${profile.firstName} ${profile.lastName}`}
          />
        </TabsContent>
      </Tabs>

      <Sheet
        open={!!activePayslip}
        onOpenChange={(v) => !v && setActivePayslip(null)}
      >
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {activePayslip && (
            <>
              <SheetHeader>
                <SheetTitle>{activePayslip.period}</SheetTitle>
                <SheetDescription>
                  Paid {fmt(activePayslip.date)}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                <DummyNotice />
                <div className="bg-gradient-to-br from-primary to-secondary text-white p-5 rounded-xl">
                  <p className="text-xs opacity-80 uppercase tracking-wide">
                    Net Pay
                  </p>
                  <p className="text-3xl font-bold mt-1">
                    {currency(activePayslip.net)}
                  </p>
                  <div className="flex justify-between text-xs opacity-90 mt-3 pt-3 border-t border-white/20">
                    <span>Gross: {currency(activePayslip.gross)}</span>
                    <span>
                      Deductions:{" "}
                      {currency(activePayslip.gross - activePayslip.net)}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-success uppercase tracking-wide mb-2 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Earnings
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm py-1.5 border-b last:border-b-0">
                      <span>Base salary</span>
                      <span className="font-mono">
                        {currency(activePayslip.gross)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold pt-2">
                      <span>Total Gross</span>
                      <span className="font-mono">
                        {currency(activePayslip.gross)}
                      </span>
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
                      <span className="font-mono">
                        -{currency(activePayslip.gross - activePayslip.net)}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-primary to-secondary"
                  onClick={() => download(`Payslip ${activePayslip.period}`)}
                >
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
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="text-xl font-bold mt-1">{value}</p>
        </div>
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <Icon className="h-4 w-4 text-white" />
        </div>
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
