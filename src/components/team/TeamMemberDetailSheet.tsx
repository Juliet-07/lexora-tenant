import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
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
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────

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

interface LeaveBalance {
  type: string;
  label: string;
  entitled: number;
  used: number;
  remaining: number;
}

interface LeaveRequest {
  _id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  reviewNote: string | null;
  createdAt: string;
}

interface Props {
  member: TeamMember | null;
  onClose: () => void;
}

// ─── Mock data (non-leave tabs stay static for now) ───────────

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
  },
  documents: [
    { name: "Employment Contract", date: "2024-03-12" },
    { name: "NDA — Confidentiality", date: "2024-03-12" },
    { name: "ID Verification", date: "2024-03-10" },
    { name: "Right to Work", date: "2024-03-10" },
  ],
  activity: [
    { t: "2h ago", text: "Clocked in at 08:55" },
    {
      t: "Yesterday",
      text: "Completed task: Source of funds review — Acme Holdings",
    },
    { t: "Yesterday", text: "Submitted timesheet for week 24" },
    { t: "2 days ago", text: "Logged 6.5h billable on Q2 KYC Refresh" },
    { t: "3 days ago", text: "Closed 2 KYC cases" },
    { t: "Last week", text: "Submitted leave request: 15–19 Aug (Annual)" },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: "Annual",
  sick: "Sick",
  maternity: "Maternity",
  paternity: "Paternity",
  compassionate: "Compassionate",
  study: "Study",
  unpaid: "Unpaid",
};

const LEAVE_STATUS_STYLE: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground",
};

const ATTENDANCE_STYLE: Record<string, string> = {
  Late: "bg-warning/10 text-warning border-warning/20",
  Remote: "bg-info/10 text-info border-info/20",
  Present: "bg-success/10 text-success border-success/20",
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const fmtShort = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

const currency = (n: number) => `£${n.toLocaleString("en-GB")}`;

// ─── Component ────────────────────────────────────────────────

export function TeamMemberDetailSheet({ member, onClose }: Props) {
  const queryClient = useQueryClient();

  // Review dialog state
  const [reviewTarget, setReviewTarget] = useState<{
    request: LeaveRequest;
    action: "approved" | "rejected";
  } | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  // ── Fetch leave requests for this member ──────────────────
  const { data: leaveRequests = [], isLoading: leaveLoading } = useQuery<
    LeaveRequest[]
  >({
    queryKey: ["member-leave", member?._id],
    queryFn: async () => {
      const res = await api.get("/tenant/team/leave", {
        params: { memberId: member!._id },
      });
      const d = res.data?.data ?? res.data;
      return Array.isArray(d) ? d : [];
    },
    enabled: !!member,
    staleTime: 30_000,
  });

  // ── Fetch leave balance for this member ───────────────────
  // We call the tenant/me/leave/balance endpoint on behalf of the member
  // by using the admin's view of their leave via the leave requests aggregate
  // Since there's no admin-scoped balance endpoint yet, we compute it from
  // the requests + the team policy the tenant has set
  const { data: teamPolicy } = useQuery({
    queryKey: ["team-policy"],
    queryFn: async () => {
      const res = await api.get("/tenant/team/policy");
      return res.data?.data ?? res.data;
    },
    staleTime: 5 * 60_000,
  });

  // Compute balances from policy + approved leave requests this year
  const leaveBalances: LeaveBalance[] = (() => {
    const policy = teamPolicy?.leavePolicy ?? [];
    const yearStart = new Date(new Date().getFullYear(), 0, 1);

    const usedMap: Record<string, number> = {};
    leaveRequests
      .filter(
        (r) => r.status === "approved" && new Date(r.startDate) >= yearStart,
      )
      .forEach((r) => {
        usedMap[r.type] = (usedMap[r.type] ?? 0) + r.days;
      });

    return policy.map((p: any) => ({
      type: p.type,
      label: LEAVE_TYPE_LABELS[p.type] ?? p.type,
      entitled: p.days,
      used: usedMap[p.type] ?? 0,
      remaining: p.days - (usedMap[p.type] ?? 0),
    }));
  })();

  const annualBalance = leaveBalances.find((b) => b.type === "annual");
  const sickBalance = leaveBalances.find((b) => b.type === "sick");

  const pendingRequests = leaveRequests.filter((r) => r.status === "pending");
  const approvedRequests = leaveRequests.filter(
    (r) => r.status === "approved" && new Date(r.startDate) >= new Date(),
  );

  // ── Review mutation ───────────────────────────────────────
  const reviewMutation = useMutation({
    mutationFn: () =>
      api.patch(`/tenant/team/leave/${reviewTarget!.request._id}/review`, {
        status: reviewTarget!.action,
        reviewNote: reviewNote || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["member-leave", member?._id],
      });
      queryClient.invalidateQueries({ queryKey: ["team-leave-pending-count"] });
      queryClient.invalidateQueries({ queryKey: ["team-leave-requests"] });
      const action = reviewTarget!.action;
      setReviewTarget(null);
      setReviewNote("");
      toast.success(
        action === "approved"
          ? "Leave approved. Member will be notified."
          : "Leave rejected. Member will be notified.",
      );
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to review request"),
  });

  if (!member) return null;
  const initials =
    `${member.firstName[0] ?? ""}${member.lastName[0] ?? ""}`.toUpperCase();
  const a = ACTIVITY;

  // ─────────────────────────────────────────────────────────
  return (
    <>
      <Sheet open={!!member} onOpenChange={(v) => !v && onClose()}>
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
                    {member.firstName} {member.lastName}
                  </SheetTitle>
                  <SheetDescription className="text-white/80">
                    {a.jobTitle} · {a.department}
                  </SheetDescription>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge
                      variant="outline"
                      className="bg-white/10 text-white border-white/30 capitalize"
                    >
                      {member.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-white/10 text-white border-white/30"
                    >
                      {a.employeeNumber}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-white/10 text-white border-white/30"
                    >
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
          </div>

          <div className="p-6">
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="work">Work</TabsTrigger>
                <TabsTrigger value="time">
                  Time & Leave
                  {pendingRequests.length > 0 && (
                    <span className="ml-1.5 h-4 w-4 rounded-full bg-warning text-white text-[9px] flex items-center justify-center">
                      {pendingRequests.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="payroll">Payroll</TabsTrigger>
                <TabsTrigger value="documents">Docs</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              {/* ── Overview tab ── */}
              <TabsContent value="overview" className="space-y-3">
                <Card>
                  <CardContent className="p-4 space-y-2 text-sm">
                    <Row icon={Mail} label="Email" value={member.email} />
                    {member.phone && (
                      <Row icon={Phone} label="Phone" value={member.phone} />
                    )}
                    <Row icon={MapPin} label="Location" value={a.location} />
                    <Row icon={Briefcase} label="Manager" value={a.manager} />
                    <Row
                      icon={CalendarDays}
                      label="Joined"
                      value={new Date(member.createdAt).toLocaleDateString(
                        "en-GB",
                        { day: "numeric", month: "long", year: "numeric" },
                      )}
                    />
                    <Row
                      icon={Shield}
                      label="Role(s)"
                      value={member.roles.join(", ")}
                    />
                  </CardContent>
                </Card>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat
                    label="Clients"
                    value={a.assignedClients.length}
                    icon={Users}
                  />
                  <MiniStat
                    label="Projects"
                    value={a.projects.length}
                    icon={FolderKanban}
                  />
                  <MiniStat
                    label="This month"
                    value={`${a.attendance.monthHours}h`}
                    icon={Clock}
                  />
                  <MiniStat
                    label="Overtime"
                    value={`${a.attendance.overtime}h`}
                    icon={Clock}
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

              {/* ── Work tab ── */}
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
                    {a.projects.map((p) => (
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

              {/* ── Time & Leave tab — WIRED ── */}
              <TabsContent value="time" className="space-y-3">
                {/* Attendance — still static */}
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
                        <Badge
                          variant="outline"
                          className={ATTENDANCE_STYLE[r.s] ?? ""}
                        >
                          {r.s}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Leave balances — derived from real policy + real requests */}
                {leaveLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading leave
                    data…
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <MiniStat
                        label="Annual left"
                        value={
                          annualBalance ? `${annualBalance.remaining}d` : "—"
                        }
                        icon={CalendarDays}
                      />
                      <MiniStat
                        label="Sick left"
                        value={sickBalance ? `${sickBalance.remaining}d` : "—"}
                        icon={CalendarDays}
                      />
                    </div>

                    {/* Pending — awaiting tenant approval */}
                    {pendingRequests.length > 0 && (
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-warning mb-3">
                            Awaiting your approval
                          </p>
                          <div className="space-y-3">
                            {pendingRequests.map((r) => (
                              <div
                                key={r._id}
                                className="flex items-center justify-between text-sm py-2 border-b last:border-b-0"
                              >
                                <div>
                                  <p className="font-medium">
                                    {LEAVE_TYPE_LABELS[r.type] ?? r.type} —{" "}
                                    {r.days} day{r.days !== 1 ? "s" : ""}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {fmtShort(r.startDate)} → {fmt(r.endDate)}
                                  </p>
                                  {r.reason && (
                                    <p className="text-xs text-muted-foreground italic mt-0.5">
                                      "{r.reason}"
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                    onClick={() => {
                                      setReviewTarget({
                                        request: r,
                                        action: "rejected",
                                      });
                                      setReviewNote("");
                                    }}
                                  >
                                    <XCircle className="h-3.5 w-3.5 mr-1" />{" "}
                                    Reject
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="bg-gradient-to-r from-primary to-secondary"
                                    onClick={() => {
                                      setReviewTarget({
                                        request: r,
                                        action: "approved",
                                      });
                                      setReviewNote("");
                                    }}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />{" "}
                                    Approve
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Upcoming approved leave */}
                    {approvedRequests.length > 0 && (
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                            Upcoming approved leave
                          </p>
                          <div className="space-y-2">
                            {approvedRequests.map((r) => (
                              <div
                                key={r._id}
                                className="flex items-center justify-between text-sm py-1.5"
                              >
                                <div>
                                  <p className="font-medium">
                                    {LEAVE_TYPE_LABELS[r.type] ?? r.type}
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

                    {/* All leave history */}
                    {leaveRequests.length > 0 && (
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                            Leave history
                          </p>
                          <div className="space-y-2">
                            {leaveRequests.map((r) => (
                              <div
                                key={r._id}
                                className="flex items-center justify-between text-sm py-1.5 border-b last:border-b-0"
                              >
                                <div>
                                  <p className="font-medium">
                                    {LEAVE_TYPE_LABELS[r.type] ?? r.type} ·{" "}
                                    {r.days}d
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
                        </CardContent>
                      </Card>
                    )}

                    {leaveRequests.length === 0 && !leaveLoading && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No leave requests from this team member yet.
                      </p>
                    )}
                  </>
                )}
              </TabsContent>

              {/* ── Performance tab ── */}
              <TabsContent value="performance" className="space-y-3">
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Latest Review Rating
                      </p>
                      <p className="text-2xl font-bold">
                        {a.performance.rating}/5
                      </p>
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
                          <p className="text-sm font-medium flex-1">
                            {g.title}
                          </p>
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

              {/* ── Payroll tab ── */}
              <TabsContent value="payroll" className="space-y-3">
                <Card>
                  <CardContent className="p-4 space-y-2 text-sm">
                    <Row
                      icon={Wallet}
                      label="Base salary"
                      value={`${currency(a.payroll.salary)} / month`}
                    />
                    <Row
                      icon={Wallet}
                      label="YTD gross"
                      value={currency(a.payroll.ytdGross)}
                    />
                    <Row
                      icon={CalendarDays}
                      label="Next pay date"
                      value={new Date(a.payroll.nextPayDate).toLocaleDateString(
                        "en-GB",
                        { day: "numeric", month: "long" },
                      )}
                    />
                    <Row
                      icon={Wallet}
                      label="Pension pot"
                      value={currency(a.payroll.pensionPot)}
                    />
                  </CardContent>
                </Card>
                {a.payroll.loans.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                        Active loans
                      </p>
                      {a.payroll.loans.map((l, i) => (
                        <div
                          key={i}
                          className="flex justify-between text-sm py-1"
                        >
                          <span>{l.type}</span>
                          <span className="font-mono">
                            {currency(l.balance)}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ── Documents tab ── */}
              <TabsContent value="documents" className="space-y-2">
                {a.documents.map((d) => (
                  <Card key={d.name}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{d.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(d.date).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
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

              {/* ── Activity tab ── */}
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
        </SheetContent>
      </Sheet>

      {/* ── Review Dialog ── */}
      <Dialog
        open={!!reviewTarget}
        onOpenChange={(v) => {
          if (!v) {
            setReviewTarget(null);
            setReviewNote("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewTarget?.action === "approved"
                ? "Approve Leave"
                : "Reject Leave"}
            </DialogTitle>
            <DialogDescription>
              {reviewTarget && (
                <>
                  {LEAVE_TYPE_LABELS[reviewTarget.request.type] ??
                    reviewTarget.request.type}{" "}
                  · {reviewTarget.request.days} day
                  {reviewTarget.request.days !== 1 ? "s" : ""} ·{" "}
                  {fmtShort(reviewTarget.request.startDate)} →{" "}
                  {fmt(reviewTarget.request.endDate)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            {reviewTarget?.request.reason && (
              <div className="rounded-lg bg-muted/30 border px-3 py-2 text-sm">
                <span className="text-muted-foreground">Reason: </span>
                {reviewTarget.request.reason}
              </div>
            )}
            <div>
              <Label>
                Note{" "}
                {reviewTarget?.action === "rejected" ? (
                  <span className="text-destructive">*</span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    (optional)
                  </span>
                )}
              </Label>
              <Textarea
                className="mt-1.5"
                rows={2}
                placeholder={
                  reviewTarget?.action === "rejected"
                    ? "Reason for rejection…"
                    : "Optional message to the team member…"
                }
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setReviewTarget(null);
                setReviewNote("");
              }}
            >
              Cancel
            </Button>
            {reviewTarget?.action === "rejected" ? (
              <Button
                variant="destructive"
                disabled={!reviewNote.trim() || reviewMutation.isPending}
                onClick={() => reviewMutation.mutate()}
              >
                {reviewMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Rejecting…
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" /> Reject
                  </>
                )}
              </Button>
            ) : (
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={reviewMutation.isPending}
                onClick={() => reviewMutation.mutate()}
              >
                {reviewMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Approving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
