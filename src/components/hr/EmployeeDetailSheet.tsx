import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  HeartPulse,
  GraduationCap,
  UserSquare2,
  Circle,
  UserX,
  Stamp,
} from "lucide-react";
import { toast } from "sonner";
import {
  Employee,
  HrTeam,
  HrLocation,
  EmployeeRecordType,
  fetchDirectReportsOf,
  fetchEmployeeDetail,
  fetchEmployeeOnboardingRecord,
  fetchEmployeePayrollSnapshot,
  fetchEmployeesByHierarchyRole,
  resendWelcomeEmail,
  terminateEmployee,
  addEmployeeRecord,
  fetchEmployeeRecords,
  suspendEmployee,
  reinstateEmployee,
} from "@/lib/hr/hr-api";
import { downloadEmployeeReport } from "@/lib/hr/employeeReport";
import { EmployeeDocumentsPanel } from "./EmployeeDocumentsPanel";
import { fetchEmployeeReviewHistory } from "@/lib/hr/hr-performance-api";
import {
  fetchDisputesForEmployee,
  openDisputeCase,
  resolveDisputeFileUrl,
  isImageFile,
} from "@/lib/hr/hr-dispute-api";
import {
  fetchContractTemplates,
  generateContractForEmployee,
  issueLetter,
} from "@/lib/hr/hr-contracts-api";
import { DialogDescription } from "@radix-ui/react-dialog";
import { SignaturePad } from "./SignaturePad";

interface Props {
  employee: Employee | null;
  onClose: () => void;
}

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

const ONBOARDING_STEP_LABELS = [
  "Not started",
  "Personal & Emergency",
  "Medical Information",
  "Certificates & References",
  "Fully onboarded",
];

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

function DisputeStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-info/10 text-info border-info/20",
    under_investigation: "bg-warning/10 text-warning border-warning/20",
    hearing_scheduled: "bg-secondary/10 text-secondary border-secondary/20",
    outcome_recorded: "bg-primary/10 text-primary border-primary/20",
    appealed: "bg-destructive/10 text-destructive border-destructive/20",
    closed: "bg-success/10 text-success border-success/20",
    escalated_external:
      "bg-destructive/10 text-destructive border-destructive/20",
  };
  return (
    <Badge
      variant="outline"
      className={`text-[10px] capitalize ${map[status] ?? ""}`}
    >
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

const RECORD_TYPE_LABELS: Record<string, string> = {
  note: "Note",
  first_warning: "First Warning",
  second_warning: "Second Warning",
  final_warning: "Final Warning",
  suspension: "Suspension",
  termination: "Termination",
};

function RecordTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    note: "bg-info/10 text-info border-info/20",
    first_warning: "bg-warning/10 text-warning border-warning/20",
    second_warning: "bg-warning/10 text-warning border-warning/20",
    final_warning: "bg-destructive/10 text-destructive border-destructive/20",
    suspension: "bg-destructive/10 text-destructive border-destructive/20",
    termination: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return (
    <Badge variant="outline" className={`text-[10px] ${map[type] ?? ""}`}>
      {RECORD_TYPE_LABELS[type] ?? type}
    </Badge>
  );
}

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
const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
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
    return `${currencyCode ?? ""} ${amount.toLocaleString()}`.trim();
  }
};

const fmtAddress = (a: Employee["address"]) => {
  if (!a) return "—";
  const parts = [a.street, a.city, a.state, a.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
};

const teamName = (e: Employee) =>
  typeof e.teamId === "object" && e.teamId !== null
    ? (e.teamId as HrTeam).name
    : "—";
const locName = (e: Employee) =>
  typeof e.locationId === "object" && e.locationId !== null
    ? (e.locationId as HrLocation).name
    : "—";
// const teamLead = (e: Employee) =>
//   typeof e.teamId === "object" && e.teamId !== null
//     ? (e.teamId as HrTeam).lead || "Unassigned"
//     : "—";
const managerName = (e: Employee) =>
  typeof e.reportsToManagerId === "object" && e.reportsToManagerId !== null
    ? `${e.reportsToManagerId.firstName} ${e.reportsToManagerId.lastName}`
    : e.hierarchyRole === "head_of_department"
      ? "Tenant (top of chain)"
      : "Unassigned";

export function EmployeeDetailSheet({ employee, onClose }: Props) {
  const queryClient = useQueryClient();
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [terminateForm, setTerminateForm] = useState({
    endDate: new Date().toISOString().slice(0, 10),
    status: "resigned" as "terminated" | "resigned",
    reason: "",
  });
  const [reassignChoice, setReassignChoice] = useState<string>("");
  const [addRecordOpen, setAddRecordOpen] = useState(false);
  const [recordType, setRecordType] = useState<EmployeeRecordType>("note");
  const [recordDescription, setRecordDescription] = useState("");

  // QUERIES ─────────────────────────────────────────

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["employee-detail", employee?._id],
    queryFn: () => fetchEmployeeDetail(employee!._id),
    enabled: !!employee,
    staleTime: 30_000,
  });

  const { data: onboardingTab, isLoading: onboardingLoading } = useQuery({
    queryKey: ["employee-onboarding-record", employee?._id],
    queryFn: () => fetchEmployeeOnboardingRecord(employee!._id),
    enabled: !!employee,
    staleTime: 30_000,
  });

  const { data: payroll, isLoading: payrollLoading } = useQuery({
    queryKey: ["employee-payroll-snapshot", employee?._id],
    queryFn: () => fetchEmployeePayrollSnapshot(employee!._id),
    enabled: !!employee,
    staleTime: 30_000,
  });

  const { data: directReports = [], isLoading: directReportsLoading } =
    useQuery({
      queryKey: ["employee-direct-reports", employee?._id],
      queryFn: () => fetchDirectReportsOf(employee!._id),
      enabled: terminateOpen && !!employee,
      staleTime: 10_000,
    });

  const { data: replacementCandidates = [] } = useQuery({
    queryKey: ["hr-employees-by-role", "manager"],
    queryFn: () => fetchEmployeesByHierarchyRole("manager"),
    enabled:
      terminateOpen &&
      directReports.length > 0 &&
      employee?.hierarchyRole === "manager",
    staleTime: 30_000,
  });

  const { data: reviewHistory = [], isLoading: reviewHistoryLoading } =
    useQuery({
      queryKey: ["employee-review-history", employee?._id],
      queryFn: () => fetchEmployeeReviewHistory(employee!._id),
      enabled: !!employee,
      staleTime: 30_000,
    });

  const { data: disputes = [], isLoading: disputesLoading } = useQuery({
    queryKey: ["employee-disputes", employee?._id],
    queryFn: () => fetchDisputesForEmployee(employee!._id),
    enabled: !!employee,
    staleTime: 10_000,
  });

  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ["employee-records", employee?._id],
    queryFn: () => fetchEmployeeRecords(employee!._id),
    enabled: !!employee,
    staleTime: 10_000,
  });

  const replacementCandidatesForSameTeam = useMemo(() => {
    if (!employee) return [];

    const empTeamId =
      typeof employee.teamId === "object" && employee.teamId !== null
        ? employee.teamId._id
        : employee.teamId;

    return replacementCandidates.filter((c) => {
      const cTeamId =
        typeof c.teamId === "object" && c.teamId !== null
          ? c.teamId._id
          : c.teamId;
      return cTeamId === empTeamId && c._id !== employee._id;
    });
  }, [replacementCandidates, employee]);

  // MUTATIONS ─────────────────────────────────────────

  const terminateMutation = useMutation({
    mutationFn: () =>
      terminateEmployee(employee!._id, {
        ...terminateForm,
        reassignDirectReportsTo: reassignChoice || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["employee-detail", employee!._id],
      });
      queryClient.invalidateQueries({ queryKey: ["hr-employees"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-offboarding"] });
      setTerminateOpen(false);
      toast.success(
        `${employee!.firstName} ${employee!.lastName} marked as ${terminateForm.status}. An offboarding record was created.`,
      );
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ?? "Failed to terminate employee",
      ),
  });

  const resendMutation = useMutation({
    mutationFn: () => resendWelcomeEmail(employee._id),
    onSuccess: () => toast.success("Welcome email resent successfully."),
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to resend email"),
  });

  const addRecordMutation = useMutation({
    mutationFn: () =>
      addEmployeeRecord(employee!._id, {
        type: recordType,
        description: recordDescription.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["employee-records", employee!._id],
      });
      setAddRecordOpen(false);
      setRecordType("note");
      setRecordDescription("");
      toast.success("Record added — the employee has been notified by email.");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to add record"),
  });

  const suspendMutation = useMutation({
    mutationFn: async (form: {
      reason: string;
      endDate: string;
      templateId: string;
      signerName: string;
      signatureImageData: string | null;
      stampImageData: string | null;
    }) => {
      const contract = await generateContractForEmployee({
        employeeId: employee!._id,
        templateId: form.templateId,
        reason: form.reason,
        effectiveDate: new Date().toISOString().slice(0, 10),
        endDate: form.endDate,
      });
      await issueLetter(contract._id, {
        signerName: form.signerName,
        signatureImageData: form.signatureImageData ?? undefined,
        stampImageData: form.stampImageData ?? undefined,
      });
      return suspendEmployee(employee!._id, {
        reason: form.reason,
        endDate: form.endDate,
        contractId: contract._id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["employee-detail", employee!._id],
      });
      queryClient.invalidateQueries({ queryKey: ["hr-employees"] });
      setSuspendOpen(false);
      toast.success(
        `${employee!.firstName} ${employee!.lastName} has been suspended. Their login is deactivated until the end date, and the letter has been emailed.`,
      );
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to suspend employee"),
  });

  const reinstateMutation = useMutation({
    mutationFn: () => reinstateEmployee(employee!._id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["employee-detail", employee!._id],
      });
      queryClient.invalidateQueries({ queryKey: ["hr-employees"] });
      toast.success(
        `${employee!.firstName} ${employee!.lastName} has been reinstated.`,
      );
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ?? "Failed to reinstate employee",
      ),
  });

  if (!employee) return null;

  const emp = detail?.employee ?? employee;
  // console.log(emp,"employee data")

  const initials =
    `${emp.firstName[0] ?? ""}${emp.lastName[0] ?? ""}`.toUpperCase();
  const d = DUMMY;
  const openCount = disputes.filter((x) => x.status !== "closed").length;

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

  const onboardingStep = emp.onboardingStep ?? 0;
  const onboardingCompleted = emp.onboardingCompleted ?? false;
  const signatureRecord = onboardingTab?.record ?? null;

  return (
    <Sheet open={!!employee} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
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
                    Reports to {managerName(emp)}
                  </Badge>
                </div>
              </div>
            </div>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3 mt-5 text-sm">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs opacity-80">Perf</p>
              <p className="font-bold text-lg">
                {reviewHistoryLoading
                  ? "—"
                  : reviewHistory[0]?.scores.kpiSection.totalWeightedScore !=
                      null
                    ? `${reviewHistory[0].scores.kpiSection.totalWeightedScore}%`
                    : "—"}
              </p>
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
          <div className="mt-4 flex flex-wrap items-center gap-2">
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
            <Button
              variant="secondary"
              size="sm"
              disabled={resendMutation.isPending}
              onClick={() => resendMutation.mutate()}
            >
              {resendMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Mail className="h-3.5 w-3.5 mr-1.5" />
              )}
              Resend Welcome Email
            </Button>
            {emp.employmentStatus !== "terminated" &&
              emp.employmentStatus !== "resigned" && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-red-500 hover:bg-destructive/30 text-white border-destructive/30"
                  onClick={() => setTerminateOpen(true)}
                >
                  <UserX className="h-4 w-4 mr-2" /> Terminate
                </Button>
              )}
            {emp.employmentStatus === "suspended" ? (
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/15 hover:bg-white/25 text-white border-white/20"
                disabled={reinstateMutation.isPending}
                onClick={() => reinstateMutation.mutate()}
              >
                {reinstateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UserX className="h-4 w-4 mr-2" />
                )}
                Reinstate
              </Button>
            ) : (
              emp.employmentStatus !== "terminated" &&
              emp.employmentStatus !== "resigned" && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-slate-500 hover:bg-gray-300 text-white border-warning/30 items-center"
                  onClick={() => setSuspendOpen(true)}
                >
                  <UserX className="h-4 w-4 mr-2" /> Suspend
                </Button>
              )
            )}
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
                  {!onboardingCompleted && (
                    <span className="ml-1.5 h-2 w-2 rounded-full bg-warning" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="activity" className="text-xs">
                  Activity
                </TabsTrigger>
              </TabsList>
            </div>

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
                    value={managerName(emp)}
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

              {emp.employmentStatus === "suspended" && (
                <Card className="border-warning/30">
                  <CardContent className="p-4 space-y-2 text-sm">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-warning mb-1">
                      Currently Suspended
                    </h3>
                    {emp.suspensionReason && (
                      <p className="text-xs">{emp.suspensionReason}</p>
                    )}
                    {emp.suspensionEndDate && (
                      <p className="text-xs text-muted-foreground">
                        Reactivates automatically on{" "}
                        {fmt(emp.suspensionEndDate)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-4 space-y-2 text-sm">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                    Personal details (self-reported)
                  </h3>
                  <Row
                    icon={CalendarDays}
                    label="Date of birth"
                    value={emp.dateOfBirth ? fmt(emp.dateOfBirth) : "—"}
                  />
                  <Row
                    icon={Shield}
                    label="Nationality"
                    value={emp.nationality ?? "—"}
                  />
                  <Row
                    icon={MapPin}
                    label="Address"
                    value={fmtAddress(emp.address)}
                  />
                  <Row
                    icon={Phone}
                    label="Emergency contact"
                    value={emp.emergencyContactName ?? "—"}
                  />
                  <Row
                    icon={Phone}
                    label="Emergency phone"
                    value={emp.emergencyContactPhone ?? "—"}
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

            <TabsContent value="performance" className="space-y-3">
              {reviewHistoryLoading ? (
                <LoadingBlock />
              ) : reviewHistory.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-sm text-muted-foreground">
                    No completed performance reviews yet.
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Latest Review Rating
                        </p>
                        <p className="text-2xl font-bold">
                          {reviewHistory[0].scores.kpiSection
                            .totalWeightedScore ?? "—"}
                          /100
                        </p>
                      </div>
                      <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-2 rounded-lg">
                        <Star className="h-4 w-4 fill-white" />
                        <span className="font-bold">
                          {reviewHistory[0].scores.kpiSection.ratingBand}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="space-y-2">
                    {reviewHistory.map((r) => (
                      <Card key={r._id}>
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start mb-1.5">
                            <div>
                              <p className="text-sm font-medium">
                                {r.jobTitle}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Signed off{" "}
                                {r.managerSignedAt
                                  ? fmt(r.managerSignedAt)
                                  : "—"}
                              </p>
                            </div>
                            <Badge variant="outline">
                              {r.scores.kpiSection.totalWeightedScore ?? "—"}
                              /100 · {r.scores.kpiSection.ratingBand}
                            </Badge>
                          </div>
                          {r.managerConclusions && (
                            <p className="text-xs mt-1 line-clamp-2">
                              {r.managerConclusions}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="payroll" className="space-y-3">
              {payrollLoading ? (
                <LoadingBlock />
              ) : (
                <>
                  <Card>
                    <CardContent className="p-4 space-y-2 text-sm">
                      <Row
                        icon={Wallet}
                        label="Base salary"
                        value={fmtSalary(emp.salary, emp.salaryCurrency)}
                      />
                      <Row
                        icon={Wallet}
                        label="YTD gross"
                        value={
                          payroll
                            ? fmtSalary(
                                payroll.ytdGross,
                                payroll.latestPayslip?.payCurrency ??
                                  emp.salaryCurrency,
                              )
                            : "—"
                        }
                      />
                      <Row
                        icon={Wallet}
                        label="YTD net"
                        value={
                          payroll
                            ? fmtSalary(
                                payroll.ytdNet,
                                payroll.latestPayslip?.payCurrency ??
                                  emp.salaryCurrency,
                              )
                            : "—"
                        }
                      />
                      {payroll?.latestPayslip && (
                        <Row
                          icon={CalendarDays}
                          label="Last pay period"
                          value={payroll.latestPayslip.periodLabel}
                        />
                      )}
                    </CardContent>
                  </Card>

                  {payroll &&
                    payroll.loans.filter((l) => l.status === "active").length >
                      0 && (
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                            Active loans
                          </p>
                          {payroll.loans
                            .filter((l) => l.status === "active")
                            .map((l) => (
                              <div
                                key={l._id}
                                className="flex justify-between text-sm py-1"
                              >
                                <span>{l.label}</span>
                                <span className="font-mono">
                                  {fmtSalary(l.outstandingBalance, l.currency)}
                                </span>
                              </div>
                            ))}
                        </CardContent>
                      </Card>
                    )}

                  {payroll &&
                    payroll.loans.some((l) => l.status === "pending") && (
                      <Card className="border-warning/30">
                        <CardContent className="p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-warning mb-2">
                            Pending loan request
                          </p>
                          {payroll.loans
                            .filter((l) => l.status === "pending")
                            .map((l) => (
                              <div
                                key={l._id}
                                className="flex justify-between text-sm py-1"
                              >
                                <span>{l.label}</span>
                                <span className="font-mono">
                                  {fmtSalary(l.principalAmount, l.currency)}
                                </span>
                              </div>
                            ))}
                        </CardContent>
                      </Card>
                    )}

                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                        Most recent payslip
                      </p>
                      {!payroll?.latestPayslip ? (
                        <p className="text-sm text-muted-foreground py-2">
                          No payslips yet.
                        </p>
                      ) : (
                        <div className="flex items-center justify-between text-sm py-2">
                          <div>
                            <p className="font-medium">
                              {payroll.latestPayslip.periodLabel}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Net{" "}
                              {fmtSalary(
                                payroll.latestPayslip.netSalary,
                                payroll.latestPayslip.payCurrency,
                              )}{" "}
                              · {fmt(payroll.latestPayslip.periodEnd)}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="disputes" className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    HR Records
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setAddRecordOpen(true)}
                    className="bg-gradient-to-r from-primary to-secondary"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add record
                  </Button>
                </div>
                {recordsLoading ? (
                  <LoadingBlock />
                ) : records.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-sm text-muted-foreground">
                      No records on file.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {records.map((r) => (
                      <Card key={r._id}>
                        <CardContent className="p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <RecordTypeBadge type={r.type} />
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(r.recordedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm">{r.description}</p>
                          {r.terminationTriggerError && (
                            <p className="text-[11px] text-destructive">
                              Termination could not be auto-completed:{" "}
                              {r.terminationTriggerError} — finish it manually.
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  Dispute Cases
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  Every case involving {emp.firstName} — filed by them or
                  against them. Managed from the Disputes page.
                </p>
                {disputesLoading ? (
                  <LoadingBlock />
                ) : disputes.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-sm text-muted-foreground">
                      No disputes on record.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {disputes.map((item) => {
                      const label = !item.complainantId
                        ? "Opened by HR"
                        : item.complainantId === emp._id
                          ? "Filed by this employee"
                          : "Filed against this employee";
                      return (
                        <Card key={item._id}>
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <Gavel className="h-4 w-4 text-muted-foreground" />
                                  <p className="text-sm font-medium font-mono">
                                    {item.caseNumber}
                                  </p>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 capitalize">
                                  {item.type} · {label} ·{" "}
                                  {new Date(item.filedAt).toLocaleDateString()}
                                </p>
                                <p className="text-xs mt-2 line-clamp-2">
                                  {item.description}
                                </p>
                              </div>
                              <DisputeStatusBadge status={item.status} />
                            </div>
                            {item.supportingDocs?.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {item.supportingDocs.map((doc, i) =>
                                  isImageFile(doc.name) ? (
                                    <a
                                      key={i}
                                      href={resolveDisputeFileUrl(doc.url)}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <img
                                        src={resolveDisputeFileUrl(doc.url)}
                                        alt={doc.name}
                                        className="h-14 w-14 object-cover rounded-md border"
                                      />
                                    </a>
                                  ) : (
                                    <a
                                      key={i}
                                      href={resolveDisputeFileUrl(doc.url)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-1.5 text-xs border rounded-md px-2 py-1 hover:bg-muted"
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                      {doc.name}
                                    </a>
                                  ),
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="documents" className="space-y-2">
              <EmployeeDocumentsPanel employeeId={emp._id} />
            </TabsContent>

            <TabsContent value="onboarding" className="space-y-3">
              {detailLoading || onboardingLoading ? (
                <LoadingBlock />
              ) : (
                <>
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Onboarding progress
                        </p>
                        <Badge
                          variant="outline"
                          className={
                            onboardingCompleted
                              ? "bg-success/10 text-success border-success/20"
                              : "bg-warning/10 text-warning border-warning/20"
                          }
                        >
                          {ONBOARDING_STEP_LABELS[onboardingStep]}
                        </Badge>
                      </div>
                      <Progress
                        value={(onboardingStep / 4) * 100}
                        className="h-2"
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 space-y-2 text-sm">
                      <SectionHeader
                        icon={UserSquare2}
                        title="Personal & emergency"
                        done={onboardingStep >= 1}
                      />
                      {onboardingStep < 1 ? (
                        <EmptyStepNote />
                      ) : (
                        <>
                          <Row
                            icon={CalendarDays}
                            label="Date of birth"
                            value={emp.dateOfBirth ? fmt(emp.dateOfBirth) : "—"}
                          />
                          <Row
                            icon={Shield}
                            label="Nationality"
                            value={emp.nationality ?? "—"}
                          />
                          <Row
                            icon={MapPin}
                            label="Address"
                            value={fmtAddress(emp.address)}
                          />
                          <div className="pt-2 border-t mt-2">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Next of kin
                            </p>
                            <Row
                              icon={Phone}
                              label="Name"
                              value={emp.nextOfKin?.name ?? "—"}
                            />
                            <Row
                              icon={Phone}
                              label="Relationship"
                              value={emp.nextOfKin?.relationship ?? "—"}
                            />
                            <Row
                              icon={Phone}
                              label="Phone"
                              value={emp.nextOfKin?.phone ?? "—"}
                            />
                          </div>
                          <div className="pt-2 border-t mt-2">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Emergency contact
                            </p>
                            <Row
                              icon={Phone}
                              label="Name"
                              value={emp.emergencyContactName ?? "—"}
                            />
                            <Row
                              icon={Phone}
                              label="Phone"
                              value={emp.emergencyContactPhone ?? "—"}
                            />
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 space-y-2 text-sm">
                      <SectionHeader
                        icon={HeartPulse}
                        title="Medical information"
                        done={onboardingStep >= 2}
                      />
                      {onboardingStep < 2 ? (
                        <EmptyStepNote />
                      ) : (
                        <>
                          <Row
                            icon={HeartPulse}
                            label="Blood group"
                            value={emp.medicalInfo?.bloodGroup ?? "—"}
                          />
                          <Row
                            icon={HeartPulse}
                            label="Allergies"
                            value={emp.medicalInfo?.allergies ?? "—"}
                          />
                          <Row
                            icon={HeartPulse}
                            label="Conditions"
                            value={emp.medicalInfo?.conditions ?? "—"}
                          />
                          <Row
                            icon={HeartPulse}
                            label="Medications"
                            value={emp.medicalInfo?.medications ?? "—"}
                          />
                          <Row
                            icon={Phone}
                            label="Doctor"
                            value={emp.medicalInfo?.doctorName ?? "—"}
                          />
                          <Row
                            icon={Phone}
                            label="Doctor phone"
                            value={emp.medicalInfo?.doctorPhone ?? "—"}
                          />
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 space-y-3 text-sm">
                      <SectionHeader
                        icon={GraduationCap}
                        title="Certificates & references"
                        done={onboardingStep >= 3}
                      />
                      {onboardingStep < 3 ? (
                        <EmptyStepNote />
                      ) : (
                        <>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">
                              Certificates ({emp.certificates?.length ?? 0})
                            </p>
                            {(emp.certificates?.length ?? 0) === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                None uploaded.
                              </p>
                            ) : (
                              <div className="space-y-1.5">
                                {emp.certificates.map((c) => (
                                  <a
                                    key={c.fileUrl}
                                    href={c.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/40 transition"
                                  >
                                    <span className="flex items-center gap-2 truncate">
                                      <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                                      <span className="truncate">{c.name}</span>
                                    </span>
                                    <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="pt-2 border-t">
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">
                              References ({emp.references?.length ?? 0})
                            </p>
                            {(emp.references?.length ?? 0) === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                None added.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {emp.references.map((r, i) => (
                                  <div
                                    key={i}
                                    className="p-2 border rounded-md"
                                  >
                                    <p className="font-medium">{r.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {r.relationship ?? "—"} · {r.email ?? "—"}{" "}
                                      · {r.phone ?? "—"}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 space-y-2 text-sm">
                      <SectionHeader
                        icon={Shield}
                        title="Policies & signature"
                        done={onboardingCompleted}
                      />
                      {!signatureRecord ? (
                        <EmptyStepNote />
                      ) : (
                        <>
                          <Row
                            icon={FileText}
                            label="Signature"
                            value={signatureRecord.signatureName}
                          />
                          <Row
                            icon={CalendarDays}
                            label="Signed"
                            value={fmtDateTime(signatureRecord.signedAt)}
                          />
                          {signatureRecord.ipAddress && (
                            <Row
                              icon={Shield}
                              label="IP address"
                              value={signatureRecord.ipAddress}
                            />
                          )}
                          <div className="pt-2 border-t mt-2">
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">
                              Documents acknowledged (
                              {signatureRecord.acknowledgements.length})
                            </p>
                            <div className="space-y-1.5">
                              {signatureRecord.acknowledgements.map((a, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between p-2 border rounded-md"
                                >
                                  <span className="truncate">
                                    {a.documentTitle}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="bg-success/10 text-success border-success/20"
                                  >
                                    Agreed
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

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

        <Dialog open={addRecordOpen} onOpenChange={setAddRecordOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Add a record for {emp.firstName} {emp.lastName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select
                  value={recordType}
                  onValueChange={(v) => setRecordType(v as EmployeeRecordType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="first_warning">First Warning</SelectItem>
                    <SelectItem value="second_warning">
                      Second Warning
                    </SelectItem>
                    <SelectItem value="final_warning">Final Warning</SelectItem>
                    <SelectItem value="suspension">Suspension</SelectItem>
                    <SelectItem value="termination">Termination</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea
                  rows={4}
                  placeholder="What happened, and the outcome being recorded… (min. 10 characters)"
                  value={recordDescription}
                  onChange={(e) => setRecordDescription(e.target.value)}
                />
              </div>
              <div className="rounded-md bg-warning/10 border border-warning/20 text-warning text-xs p-2 flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {recordType === "suspension"
                  ? `${emp.firstName} will receive a suspension letter by email.`
                  : recordType === "termination"
                    ? `${emp.firstName}'s employment will be terminated and they will be notified by email.`
                    : `${emp.firstName} will be notified by email. This does not create a dispute case — it's added directly to their record.`}
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => addRecordMutation.mutate()}
                disabled={
                  recordDescription.trim().length < 10 ||
                  addRecordMutation.isPending
                }
                className="bg-gradient-to-r from-primary to-secondary"
              >
                {addRecordMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Add record"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <SuspendEmployeeDialog
          open={suspendOpen}
          employee={emp}
          onClose={() => setSuspendOpen(false)}
          onSubmit={(form) => suspendMutation.mutate(form)}
          isSubmitting={suspendMutation.isPending}
        />

        {/* Termination Dialog */}
        <Dialog open={terminateOpen} onOpenChange={setTerminateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Terminate {emp.firstName} {emp.lastName}?
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This sets their employment status and automatically creates an
                offboarding record (clearance checklist, exit interview
                tracking). This cannot be undone from here.
              </p>

              {directReportsLoading ? (
                <p className="text-xs text-muted-foreground">
                  Checking direct reports…
                </p>
              ) : emp.hierarchyRole === "head_of_department" &&
                directReports.length > 0 ? (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3">
                  {emp.firstName} is the Head of Department with{" "}
                  {directReports.length} Manager(s) reporting to them. Use{" "}
                  <strong>Replace Head of Department</strong> on the Teams tab
                  first, then terminate them afterward.
                </div>
              ) : (
                <>
                  {directReports.length > 0 && (
                    <div className="space-y-1">
                      <Label>
                        {directReports.length} employee(s) report to{" "}
                        {emp.firstName}. Reassign them to{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={reassignChoice}
                        onValueChange={setReassignChoice}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a replacement…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="clear">
                            Leave unassigned for now
                          </SelectItem>
                          {replacementCandidatesForSameTeam.map((c) => (
                            <SelectItem key={c._id} value={c._id}>
                              {c.firstName} {c.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {directReports
                          .map((r) => `${r.firstName} ${r.lastName}`)
                          .join(", ")}
                      </p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label>Reason</Label>
                    <Select
                      value={terminateForm.status}
                      onValueChange={(v: any) =>
                        setTerminateForm((f) => ({ ...f, status: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="resigned">Resigned</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Last working day</Label>
                    <Input
                      type="date"
                      value={terminateForm.endDate}
                      onChange={(e) =>
                        setTerminateForm((f) => ({
                          ...f,
                          endDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      rows={3}
                      value={terminateForm.reason}
                      onChange={(e) =>
                        setTerminateForm((f) => ({
                          ...f,
                          reason: e.target.value,
                        }))
                      }
                    />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTerminateOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={
                  !terminateForm.endDate ||
                  (emp.hierarchyRole === "head_of_department" &&
                    directReports.length > 0) ||
                  (directReports.length > 0 && !reassignChoice) ||
                  terminateMutation.isPending
                }
                onClick={() => terminateMutation.mutate()}
              >
                {terminateMutation.isPending
                  ? "Processing…"
                  : "Confirm Termination"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
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

function SuspendEmployeeDialog({
  open,
  employee,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  employee: Employee;
  onClose: () => void;
  onSubmit: (form: {
    reason: string;
    endDate: string;
    templateId: string;
    signerName: string;
    signatureImageData: string | null;
    stampImageData: string | null;
  }) => void;
  isSubmitting: boolean;
}) {
  const [reason, setReason] = useState("");
  const [endDate, setEndDate] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signatureImageData, setSignatureImageData] = useState<string | null>(
    null,
  );
  const [stampImageData, setStampImageData] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { data: templates = [] } = useQuery({
    queryKey: ["contract-templates", "employee", "letter"],
    queryFn: () => fetchContractTemplates("employee"),
    enabled: open,
  });
  const letterTemplates = templates.filter(
    (t) => t.requiresSignature === false && t.isActive,
  );

  const reset = () => {
    setReason("");
    setEndDate("");
    setTemplateId("");
    setSignerName("");
    setSignatureImageData(null);
    setStampImageData(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleStampUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setStampImageData(reader.result as string);
    reader.readAsDataURL(file);
  };

  const canSubmit =
    reason.trim().length >= 10 &&
    !!endDate &&
    !!templateId &&
    !!signerName.trim() &&
    !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Suspend {employee.firstName} {employee.lastName}
          </DialogTitle>
          <DialogDescription>
            Their login is deactivated immediately and reactivates automatically
            on the end date. A suspension letter is generated, signed by you,
            and emailed to them right away.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Reason for suspension</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Grounds for this suspension… (min. 10 characters)"
            />
          </div>

          <div className="space-y-1">
            <Label>Suspension ends on</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
            />
          </div>

          <div className="space-y-1">
            <Label>Suspension letter template</Label>
            {letterTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No letter-type templates exist yet. Create one in Contracts →
                Templates first (category: Letter, no signature required).
              </p>
            ) : (
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template…" />
                </SelectTrigger>
                <SelectContent>
                  {letterTemplates.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1">
            <Label>Your full name</Label>
            <Input
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Type your name"
            />
          </div>

          <div className="space-y-1">
            <Label>Signature</Label>
            <SignaturePad
              canvasRef={canvasRef}
              onChange={setSignatureImageData}
            />
            <p className="text-xs text-muted-foreground">
              Draw your signature, or leave blank to use your typed name.
            </p>
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-1.5">
              <Stamp className="h-3.5 w-3.5" /> Company stamp (optional)
            </Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => handleStampUpload(e.target.files?.[0])}
            />
            {stampImageData && (
              <img
                src={stampImageData}
                alt="Stamp preview"
                className="h-16 object-contain mt-2 border rounded"
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!canSubmit}
            onClick={() =>
              onSubmit({
                reason: reason.trim(),
                endDate,
                templateId,
                signerName: signerName.trim(),
                signatureImageData,
                stampImageData,
              })
            }
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Suspend & Send Letter"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  done,
}: {
  icon: any;
  title: string;
  done: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-1">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" /> {title}
      </h3>
      {done ? (
        <Badge
          variant="outline"
          className="bg-success/10 text-success border-success/20 text-[10px]"
        >
          <CheckCircle2 className="h-3 w-3 mr-1" /> Done
        </Badge>
      ) : (
        <Badge variant="outline" className="text-[10px]">
          <Circle className="h-3 w-3 mr-1" /> Pending
        </Badge>
      )}
    </div>
  );
}

function EmptyStepNote() {
  return (
    <p className="text-xs text-muted-foreground italic py-1">
      Employee hasn't reached this step yet.
    </p>
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
