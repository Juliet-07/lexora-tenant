import { useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OnboardingDocumentsTab from "./OnboardingDocuments";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Briefcase,
  Plus,
  Users,
  Clock,
  CheckCircle2,
  Star,
  MapPin,
  ArrowRight,
  LogOut,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  Mail,
  Award,
  Paperclip,
  FileText,
  Download,
  FileSignature,
  Gavel,
  ClipboardList,
  Wallet,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  LayoutGrid,
  ShieldAlert,
  CalendarClock,
  Target,
  UserPlus,
  GraduationCap,
  TrendingUp,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  fetchEmployees,
  fetchTeams,
  fetchLocations,
  fetchDirectReportsOf,
  fetchEmployeesByHierarchyRole,
  terminateEmployee,
  type Employee,
  type DirectReport,
  type TerminateEmployeeDto,
} from "@/lib/hr/hr-api";
import {
  fetchAllCandidates,
  fetchCandidateStageCounts,
  createCandidate,
  moveCandidateStage,
  deleteCandidate,
  fetchAllOffboarding,
  updateOffboarding,
  uploadOffboardingCertificate,
  sendOffboardingCertificate,
  generateOffboardingCertificate,
  resolveOffboardingFileUrl,
  updateOffboardingFairnessChecklist,
  downloadOffboardingNoticePdf,
  downloadOffboardingNoticeDocx,
  serveOffboardingNotice,
  uploadOffboardingNoticeFile,
  fileOffboardingAppeal,
  recordOffboardingAppealOutcome,
  withdrawOffboardingAppeal,
  uploadOffboardingAppealFile,
  updateOffboardingExitInterview,
  computeOffboardingFinalPay,
  approveOffboardingFinalPay,
  fetchOffboardingById,
  TERMINATION_CATEGORY_LABEL,
  NOTICE_HANDLING_LABEL,
  fetchAllSuccessionPlans,
  fetchSuccessionRiskAlerts,
  fetchSuccessionBenchStrength,
  fetchSuccessionNineBox,
  createSuccessionPlan,
  updateSuccessionPlan,
  addSuccessor,
  removeSuccessor,
  recordSuccessorAssessment,
  createDevelopmentPlan,
  addDevelopmentMilestone,
  updateDevelopmentMilestoneStatus,
  setDevelopmentPlanNextReview,
  setSuccessionEmergencyCover,
  setSuccessionNextReview,
  type RiskAlert,
  type BenchStrengthReport,
  type NineBoxPerson,
  type Successor,
  type DevelopmentMilestoneStatus,
  type RiskOfLoss,
  type BenchReadiness,
  type SuccessorPotential,
  getNextStage,
  getStageOrderFor,
  fetchJobOpenings,
  createJobOpening,
  updateJobOpening as updateJobOpeningApi,
  deleteJobOpening as deleteJobOpeningApi,
  type JobOpening,
  type JobOpeningType,
  type JobOpeningStatus,
  type Candidate,
  type CandidateStage,
  type WorkerCategory,
  type OffboardingRecord,
  type TerminationCategory,
  type NoticeHandling,
  type SuccessionPlan,
} from "@/lib/hr/hr-recruitment-api";
import {
  fetchContractTemplates,
  generateContractFromCandidate,
} from "@/lib/hr/hr-contracts-api";
import { useModule } from "@/contexts/ModuleContext";

// ─── Helpers ──────────────────────────────────────────────────

const STAGES: { key: CandidateStage; label: string }[] = [
  { key: "sourced", label: "Sourced" },
  { key: "screening", label: "Screening" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
  { key: "hired", label: "Hired" },
  { key: "rejected", label: "Rejected" },
];

const stageColor = (s: CandidateStage) =>
  s === "hired"
    ? "bg-success/10 text-success border-success/20"
    : s === "rejected"
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : s === "offer"
        ? "bg-warning/10 text-warning border-warning/20"
        : s === "interview"
          ? "bg-info/10 text-info border-info/20"
          : "bg-muted text-muted-foreground border-border";

const OFFBOARDING_STATUS_TONE: Record<string, string> = {
  not_started: "bg-muted text-muted-foreground border-border",
  in_progress: "bg-warning/10 text-warning border-warning/20",
  completed: "bg-success/10 text-success border-success/20",
  reversed: "bg-info/10 text-info border-info/20",
};

const TERMINATION_CATEGORIES: TerminationCategory[] = [
  "misconduct",
  "performance",
  "redundancy",
  "mutual",
  "fixed_term",
  "retirement",
  "probation",
];

const NOTICE_HANDLING_OPTIONS: NoticeHandling[] = [
  "serve",
  "pil",
  "garden",
  "summary",
];

const RISK_TONE: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-success/10 text-success border-success/20",
};

const READINESS_TONE: Record<string, string> = {
  ready_now: "bg-success/10 text-success border-success/20",
  ready_1_2_years: "bg-info/10 text-info border-info/20",
  ready_3_plus_years: "bg-info/10 text-info border-info/20",
  gap: "bg-destructive/10 text-destructive border-destructive/20",
};

const READINESS_LABEL: Record<string, string> = {
  ready_now: "Ready now",
  ready_1_2_years: "Ready 1–2 yrs",
  ready_3_plus_years: "Ready 3+ yrs",
  gap: "Gap",
};

const POTENTIAL_TONE: Record<string, string> = {
  high: "bg-success/10 text-success border-success/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-muted text-muted-foreground border-border",
};

const ALERT_SEVERITY_TONE: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
};

const PERFORMANCE_TONE: Record<string, string> = {
  high: "bg-success/10 text-success border-success/20",
  moderate: "bg-warning/10 text-warning border-warning/20",
  low: "bg-destructive/10 text-destructive border-destructive/20",
};

const MILESTONE_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  in_progress: "In progress",
  done: "Done",
};

const fmtDateShort = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const fmtMoney = (n: number, currency: string) =>
  `${currency} ${Math.round(n).toLocaleString("en-US")}`;

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function HRRecruitment() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const validTabs = useMemo(
    () =>
      new Set([
        "pipeline",
        "onboarding",
        "offboarding",
        "succession",
        "openings",
      ]),
    [],
  );
  const requestedTab = searchParams.get("tab") ?? "pipeline";
  const activeTab = validTabs.has(requestedTab) ? requestedTab : "pipeline";
  const setActiveTab = (v: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", v);
    setSearchParams(next, { replace: true });
  };

  // ── Job Openings — real, backend-persisted ──
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["job-openings"],
    queryFn: fetchJobOpenings,
  });

  // ── Real data ──
  const { data: candidates = [], isLoading: candidatesLoading } = useQuery({
    queryKey: ["recruitment-candidates"],
    queryFn: () => fetchAllCandidates(),
  });

  const { data: offboarding = [], isLoading: offboardingLoading } = useQuery({
    queryKey: ["recruitment-offboarding"],
    queryFn: () => fetchAllOffboarding(),
  });

  const summary = useMemo(
    () => ({
      openings: jobs.filter((j) => j.status === "Open").length,
      applicants: candidates.length,
      interviews: candidates.filter((c) => c.stage === "interview").length,
      offers: candidates.filter((c) => c.stage === "offer").length,
    }),
    [jobs, candidates],
  );

  const offboardingActive = offboarding.filter(
    (o) => o.status !== "completed",
  ).length;
  const offboardingCompleted = offboarding.filter(
    (o) => o.status === "completed",
  ).length;

  const [newCandidateOpen, setNewCandidateOpen] = useState(false);
  const [openOffboarding, setOpenOffboarding] =
    useState<OffboardingRecord | null>(null);

  // ── New Offboarding — opened from "+ New Offboarding" on this tab,
  // or by navigating here from the employee data sheet's Terminate
  // button (?tab=offboarding&newOffboarding=<employeeId>).
  const [newOffboardingOpen, setNewOffboardingOpen] = useState(false);
  const [newOffboardingEmployeeId, setNewOffboardingEmployeeId] = useState<
    string | null
  >(null);
  const navEmployeeId = searchParams.get("newOffboarding");

  useEffect(() => {
    if (navEmployeeId) {
      setNewOffboardingEmployeeId(navEmployeeId);
      setNewOffboardingOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("newOffboarding");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navEmployeeId]);

  // ── Hired → contract generation hook ──
  // Set by PipelineColumn's onHired callback the moment a candidate
  // is successfully moved to "hired". Opens GenerateContractDialog,
  // which lets the tenant pick a template (filtered to the
  // candidate's own workerCategory) or skip entirely. The candidate
  // is ALREADY correctly marked "hired" by the time this fires —
  // skipping the dialog never leaves the pipeline in a bad state,
  // it just means no contract gets drafted right now.
  const [hiredCandidate, setHiredCandidate] = useState<Candidate | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Recruitment</h1>
          <p className="text-sm text-muted-foreground">
            Manage roles, pipelines and candidate decisions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Open Roles"
          value={summary.openings}
          icon={Briefcase}
          tone="from-primary to-secondary"
        />
        <Stat
          label="Candidates"
          value={summary.applicants}
          icon={Users}
          tone="from-blue-500 to-cyan-500"
        />
        <Stat
          label="Interviews"
          value={summary.interviews}
          icon={Clock}
          tone="from-amber-500 to-orange-500"
        />
        <Stat
          label="Offers Out"
          value={summary.offers}
          icon={Star}
          tone="from-violet-500 to-purple-600"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Stat
          label="Offboarding Active"
          value={offboardingActive}
          icon={LogOut}
          tone="from-rose-500 to-red-600"
        />
        <Stat
          label="Offboarding Completed"
          value={offboardingCompleted}
          icon={CheckCircle}
          tone="from-slate-500 to-zinc-600"
        />
        <Stat
          label="Total Candidates"
          value={candidates.length}
          icon={Users}
          tone="from-emerald-500 to-teal-500"
        />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="pipeline">Candidate Pipeline</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="offboarding">Offboarding</TabsTrigger>
          <TabsTrigger value="succession">Succession Planning</TabsTrigger>
          <TabsTrigger value="openings">Job Openings</TabsTrigger>
        </TabsList>

        {/* ── Candidate Pipeline — REAL ── */}
        <TabsContent value="pipeline" className="space-y-3">
          <div className="flex justify-end">
            <Button
              className="bg-gradient-to-r from-primary to-secondary"
              onClick={() => setNewCandidateOpen(true)}
            >
              <Plus className="h-4 w-4" /> Add Candidate
            </Button>
          </div>
          {candidatesLoading ? (
            <LoadingRow label="Loading candidates…" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {STAGES.map((stage) => (
                <PipelineColumn
                  key={stage.key}
                  stageKey={stage.key}
                  label={stage.label}
                  candidates={candidates}
                  onHired={setHiredCandidate}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="onboarding" className="space-y-4">
          <OnboardingDocumentsTab />
        </TabsContent>

        {/* ── Offboarding — REAL ── */}
        <TabsContent value="offboarding" className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground max-w-2xl">
              Every exit — resignation or termination — follows the full
              compliance workflow here: fairness checklist, notice, appeal
              window, exit interview, clearance, final pay and certificate of
              service. Terminating someone from their employee record sends them
              here automatically.
            </p>
            <Button
              size="sm"
              className="bg-gradient-to-r from-primary to-secondary"
              onClick={() => {
                setNewOffboardingEmployeeId(null);
                setNewOffboardingOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> New Offboarding
            </Button>
          </div>
          {offboardingLoading ? (
            <LoadingRow label="Loading offboarding records…" />
          ) : offboarding.length === 0 ? (
            <EmptyCard text="No offboarding records yet." />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {offboarding.map((o) => {
                const clearedCount = o.clearanceChecklist.filter(
                  (c) => c.cleared,
                ).length;
                const appealFiled = !!o.appeal?.filed;
                return (
                  <Card
                    key={o._id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setOpenOffboarding(o)}
                  >
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-gradient-to-br from-rose-500 to-red-600 text-white text-xs">
                              {o.employeeName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold">{o.employeeName}</h3>
                            <p className="text-xs text-muted-foreground">
                              {o.jobTitle}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={OFFBOARDING_STATUS_TONE[o.status]}
                        >
                          {o.status.replace("_", " ")}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="capitalize">
                          {o.type}
                        </Badge>
                        {o.category && (
                          <Badge variant="outline">
                            {TERMINATION_CATEGORY_LABEL[o.category]}
                          </Badge>
                        )}
                        {appealFiled && (
                          <Badge
                            variant="outline"
                            className="bg-destructive/10 text-destructive border-destructive/20"
                          >
                            <Gavel className="h-3 w-3 mr-1" /> Appeal{" "}
                            {o.appeal!.status.replace("_", " ")}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-md bg-muted/50 p-2 space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase">
                            End Date
                          </p>
                          <p className="font-medium">{fmtDate(o.endDate)}</p>
                        </div>
                        <div className="rounded-md bg-muted/50 p-2 space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase">
                            Notice
                          </p>
                          <p className="font-medium flex items-center gap-1">
                            {o.type === "resignation" ? (
                              <span className="text-muted-foreground">N/A</span>
                            ) : o.noticeServed ? (
                              <>
                                <CheckCircle className="h-3.5 w-3.5 text-success" />
                                Served
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                Pending
                              </>
                            )}
                          </p>
                        </div>
                        <div className="rounded-md bg-muted/50 p-2 space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase">
                            Exit Interview
                          </p>
                          <p className="font-medium flex items-center gap-1">
                            {o.exitInterviewDone ? (
                              <CheckCircle className="h-3.5 w-3.5 text-success" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            {o.exitInterviewDone ? "Done" : "Pending"}
                          </p>
                        </div>
                        <div className="rounded-md bg-muted/50 p-2 space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase">
                            Clearance
                          </p>
                          <p className="font-medium">
                            {clearedCount} / {o.clearanceChecklist.length}
                          </p>
                        </div>
                        <div className="rounded-md bg-muted/50 p-2 space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase">
                            Final Pay
                          </p>
                          <p className="font-medium flex items-center gap-1">
                            {o.finalPay?.approved ? (
                              <>
                                <CheckCircle className="h-3.5 w-3.5 text-success" />
                                Approved
                              </>
                            ) : o.finalPay ? (
                              <>
                                <Wallet className="h-3.5 w-3.5 text-warning" />
                                Computed
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                Pending
                              </>
                            )}
                          </p>
                        </div>
                        <div className="rounded-md bg-muted/50 p-2 space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase">
                            Certificate
                          </p>
                          <p className="font-medium flex items-center gap-1">
                            {o.certificateOfServiceSentAt ? (
                              <>
                                <CheckCircle className="h-3.5 w-3.5 text-success" />
                                Sent
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                Pending
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Succession Planning — REAL ── */}
        <TabsContent value="succession" className="space-y-3">
          <SuccessionPlanning />
        </TabsContent>

        {/* ── Job Openings — record of roles within the org ── */}
        <TabsContent value="openings" className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground">
              Keep a record of all open, on-hold, draft and closed roles across
              your organization. All employees are emailed when a new opening is
              posted, and again once it's filled.
            </p>
            <JobOpeningDialog
              trigger={
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-gradient-to-r from-primary to-secondary text-white"
                >
                  <Plus className="h-4 w-4" /> New Opening
                </Button>
              }
            />
          </div>
          {jobsLoading ? (
            <LoadingRow label="Loading job openings…" />
          ) : jobs.length === 0 ? (
            <EmptyCard text="No job openings yet. Create one to get started." />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {jobs.map((j) => (
                <JobOpeningCard key={j._id} job={j} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AddCandidateDialog
        open={newCandidateOpen}
        onClose={() => setNewCandidateOpen(false)}
      />
      <NewOffboardingDialog
        open={newOffboardingOpen}
        preselectedEmployeeId={newOffboardingEmployeeId}
        onClose={() => {
          setNewOffboardingOpen(false);
          setNewOffboardingEmployeeId(null);
        }}
      />
      <OffboardingDetailPanel
        record={openOffboarding}
        onClose={() => setOpenOffboarding(null)}
      />
      <GenerateContractDialog
        candidate={hiredCandidate}
        onClose={() => setHiredCandidate(null)}
      />
    </div>
  );
}

// ─── Pipeline column ──────────────────────────────────────────

function PipelineColumn({
  stageKey,
  label,
  candidates,
  onHired,
}: {
  stageKey: CandidateStage;
  label: string;
  candidates: Candidate[];
  onHired: (candidate: Candidate) => void;
}) {
  const queryClient = useQueryClient();
  const inStage = candidates.filter(
    (c) =>
      c.stage === stageKey &&
      getStageOrderFor(c.workerCategory).includes(stageKey),
  );

  const moveMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: CandidateStage }) =>
      moveCandidateStage(id, { stage }),
    onSuccess: (updatedCandidate, vars) => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-candidates"] });
      toast.success(
        `Moved to ${STAGES.find((s) => s.key === vars.stage)?.label}.`,
      );
      if (vars.stage === "hired") {
        onHired(updatedCandidate);
      }
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to move candidate"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCandidate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-candidates"] });
      toast.success("Candidate removed.");
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          {label} <Badge variant="outline">{inStage.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {inStage.map((c) => {
          const next = getNextStage(c.stage, c.workerCategory);
          return (
            <div
              key={c._id}
              className="border rounded-lg p-3 space-y-2 bg-card"
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs">
                    {c.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {c.roleAppliedFor}
                  </p>
                </div>
              </div>
              {c.rating > 0 && (
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${i < Math.round(c.rating) ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                    />
                  ))}
                </div>
              )}
              <Badge
                variant="outline"
                className={`${stageColor(c.stage)} text-[10px] capitalize`}
              >
                {c.source.replace("_", " ")}
              </Badge>
              <Badge variant="outline" className="text-[10px] capitalize">
                {c.workerCategory}
              </Badge>
              {c.stage === "rejected" && c.rejectionReason && (
                <p className="text-[11px] text-muted-foreground italic">
                  {c.rejectionReason}
                </p>
              )}
              <div className="flex gap-1">
                {next && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs flex-1"
                    disabled={moveMutation.isPending}
                    onClick={() =>
                      moveMutation.mutate({ id: c._id, stage: next })
                    }
                  >
                    Advance <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
                {c.stage !== "rejected" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-destructive"
                    disabled={moveMutation.isPending}
                    onClick={() =>
                      moveMutation.mutate({ id: c._id, stage: "rejected" })
                    }
                  >
                    Reject
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(c._id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>
          );
        })}
        {inStage.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No candidates
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Generate Contract dialog (Hired → contract hook) ──────────

function GenerateContractDialog({
  candidate,
  onClose,
}: {
  candidate: Candidate | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [templateId, setTemplateId] = useState("");
  const [scopeOfWork, setScopeOfWork] = useState("");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["contract-templates", candidate?.workerCategory],
    queryFn: () => fetchContractTemplates(candidate!.workerCategory),
    enabled: !!candidate,
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      generateContractFromCandidate({
        candidateId: candidate!._id,
        templateId,
        scopeOfWork: scopeOfWork.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      onClose();
      setTemplateId("");
      setScopeOfWork("");
      toast.success(
        "Contract draft created. Review it in the Contracts module before sending.",
      );
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ?? "Failed to generate contract",
      ),
  });

  const handleClose = () => {
    setTemplateId("");
    setScopeOfWork("");
    onClose();
  };

  if (!candidate) return null;

  return (
    <Dialog open={!!candidate} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate a contract for {candidate.name}?</DialogTitle>
          <DialogDescription>
            Pick a {candidate.workerCategory} template. You can review and edit
            before sending it for signature.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
          <p className="font-medium text-muted-foreground uppercase tracking-wide text-[11px]">
            Filled in automatically from this candidate
          </p>
          <p>
            Name: <span className="font-medium">{candidate.name}</span>
          </p>
          <p>
            Role:{" "}
            <span className="font-medium">{candidate.roleAppliedFor}</span>
          </p>
          <p>
            Worker category:{" "}
            <span className="font-medium capitalize">
              {candidate.workerCategory}
            </span>
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No {candidate.workerCategory} templates have been published yet. Ask
            your platform admin to publish one.
          </p>
        ) : (
          <>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t._id} value={t._id}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {templateId && (
              <div className="space-y-1">
                <Label>Scope of work (optional)</Label>
                <Textarea
                  rows={3}
                  value={scopeOfWork}
                  onChange={(e) => setScopeOfWork(e.target.value)}
                  placeholder={
                    "One deliverable per line, e.g.\nWeekly progress report\nMonthly stakeholder review"
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Only relevant if the template references a scope-of-work
                  clause. Each line becomes one numbered item.
                </p>
              </div>
            )}
          </>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Skip for now
          </Button>
          <Button
            disabled={!templateId || generateMutation.isPending}
            onClick={() => generateMutation.mutate()}
            className="bg-gradient-to-r from-primary to-secondary"
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Generate Contract"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Candidate dialog ─────────────────────────────────────

function AddCandidateDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    roleAppliedFor: "",
    source: "other" as const,
    workerCategory: "employee" as WorkerCategory,
    notes: "",
  });

  const createMutation = useMutation({
    mutationFn: createCandidate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-candidates"] });
      onClose();
      setForm({
        name: "",
        email: "",
        phone: "",
        roleAppliedFor: "",
        source: "other",
        workerCategory: "employee",
        notes: "",
      });
      toast.success("Candidate added to pipeline.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to add candidate"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Candidate</DialogTitle>
          <DialogDescription>Starts in the "Sourced" stage.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Role applied for</Label>
            <Input
              placeholder="e.g. Senior Backend Engineer"
              value={form.roleAppliedFor}
              onChange={(e) =>
                setForm({ ...form, roleAppliedFor: e.target.value })
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Source</Label>
            <Select
              value={form.source}
              onValueChange={(v: any) => setForm({ ...form, source: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="job_board">Job Board</SelectItem>
                <SelectItem value="agency">Agency</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Select
              value={form.workerCategory}
              onValueChange={(v: WorkerCategory) =>
                setForm({ ...form, workerCategory: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="consultant">Consultant</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {form.workerCategory === "consultant"
                ? "Consultant pipeline: Sourced → Screening → Hired/Rejected (no interview/offer stages)."
                : "Employee pipeline: Sourced → Screening → Interview → Offer → Hired/Rejected."}
            </p>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={
              !form.name ||
              !form.email ||
              !form.roleAppliedFor ||
              createMutation.isPending
            }
            onClick={() => createMutation.mutate(form)}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Add Candidate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── New Offboarding dialog ───────────────────────────────────
// Starts the real exit: calls the same terminateEmployee endpoint the
// employee record uses, which creates the OffboardingRecord server
// side. The full step workflow is then carried out in
// OffboardingDetailPanel below.

function NewOffboardingDialog({
  open,
  preselectedEmployeeId,
  onClose,
}: {
  open: boolean;
  preselectedEmployeeId: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { refetchDashboard } = useModule();

  const [employeeId, setEmployeeId] = useState("");
  const [status, setStatus] = useState<"resigned" | "terminated">("resigned");
  const [category, setCategory] = useState<TerminationCategory | "">("");
  const [endDate, setEndDate] = useState(todayISO());
  const [reason, setReason] = useState("");
  const [reassignChoice, setReassignChoice] = useState("");

  useEffect(() => {
    if (open) {
      setEmployeeId(preselectedEmployeeId ?? "");
      setStatus("resigned");
      setCategory("");
      setEndDate(todayISO());
      setReason("");
      setReassignChoice("");
    }
  }, [open, preselectedEmployeeId]);

  const { data: empData } = useQuery({
    queryKey: ["hr-employees-for-offboarding"],
    queryFn: () => fetchEmployees({ limit: 500 }),
    enabled: open,
  });
  const allEmployees = empData?.items ?? [];
  const activeEmployees = allEmployees.filter(
    (e) =>
      e.employmentStatus !== "terminated" && e.employmentStatus !== "resigned",
  );
  const selectedEmployee = allEmployees.find((e) => e._id === employeeId);

  const { data: directReports = [], isLoading: directReportsLoading } =
    useQuery({
      queryKey: ["employee-direct-reports", employeeId],
      queryFn: () => fetchDirectReportsOf(employeeId),
      enabled: open && !!employeeId,
      staleTime: 10_000,
    });

  const { data: replacementCandidates = [] } = useQuery({
    queryKey: ["hr-employees-by-role", "manager"],
    queryFn: () => fetchEmployeesByHierarchyRole("manager"),
    enabled:
      open &&
      directReports.length > 0 &&
      selectedEmployee?.hierarchyRole === "manager",
    staleTime: 30_000,
  });

  const replacementCandidatesForSameTeam = useMemo(() => {
    if (!selectedEmployee) return [];
    const empTeamId =
      typeof selectedEmployee.teamId === "object" &&
      selectedEmployee.teamId !== null
        ? selectedEmployee.teamId._id
        : selectedEmployee.teamId;
    return replacementCandidates.filter((c) => {
      const cTeamId =
        typeof c.teamId === "object" && c.teamId !== null
          ? c.teamId._id
          : c.teamId;
      return cTeamId === empTeamId && c._id !== selectedEmployee._id;
    });
  }, [replacementCandidates, selectedEmployee]);

  const isHodBlocked =
    selectedEmployee?.hierarchyRole === "head_of_department" &&
    directReports.length > 0;

  const mutation = useMutation({
    mutationFn: () =>
      terminateEmployee(employeeId, {
        endDate,
        reason,
        status,
        reassignDirectReportsTo: reassignChoice || undefined,
        category: status === "terminated" && category ? category : undefined,
      } as TerminateEmployeeDto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-employees"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-offboarding"] });
      refetchDashboard(); // termination frees a seat — reflect it right away
      toast.success(
        `${selectedEmployee?.firstName ?? "The employee"} marked as ${status}. The offboarding workflow has started — open their card below to continue.`,
      );
      onClose();
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ?? "Failed to start offboarding",
      ),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Offboarding</DialogTitle>
          <DialogDescription>
            Starts the full exit workflow — fairness checklist, notice, appeal
            window, exit interview, clearance, final pay and certificate of
            service.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Employee</Label>
            {preselectedEmployeeId ? (
              <div className="text-sm font-medium border rounded-md px-3 py-2 bg-muted/40">
                {selectedEmployee
                  ? `${selectedEmployee.firstName} ${selectedEmployee.lastName} — ${selectedEmployee.jobTitle}`
                  : "Loading…"}
              </div>
            ) : (
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an employee…" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((e) => (
                    <SelectItem key={e._id} value={e._id}>
                      {e.firstName} {e.lastName} — {e.jobTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1">
            <Label>Type</Label>
            <Select
              value={status}
              onValueChange={(v: any) => {
                setStatus(v);
                if (v !== "terminated") setCategory("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resigned">Resignation</SelectItem>
                <SelectItem value="terminated">Termination</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {status === "terminated" && (
            <div className="space-y-1">
              <Label>Termination category</Label>
              <Select
                value={category}
                onValueChange={(v: any) => setCategory(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a category…" />
                </SelectTrigger>
                <SelectContent>
                  {TERMINATION_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {TERMINATION_CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Drives the pre-termination fairness checklist and statutory
                guidance for this exit.
              </p>
            </div>
          )}

          {!employeeId ? null : directReportsLoading ? (
            <p className="text-xs text-muted-foreground">
              Checking direct reports…
            </p>
          ) : isHodBlocked ? (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3">
              {selectedEmployee?.firstName} is the Head of Department with{" "}
              {directReports.length} Manager(s) reporting to them. Use{" "}
              <strong>Replace Head of Department</strong> on the Teams tab
              first, then offboard them afterward.
            </div>
          ) : directReports.length > 0 ? (
            <div className="space-y-1">
              <Label>
                {directReports.length} employee(s) report to{" "}
                {selectedEmployee?.firstName}. Reassign them to{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Select value={reassignChoice} onValueChange={setReassignChoice}>
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
          ) : null}

          <div className="space-y-1">
            <Label>Last working day</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={
              !employeeId ||
              !endDate ||
              (status === "terminated" && !category) ||
              !!isHodBlocked ||
              (directReports.length > 0 && !reassignChoice) ||
              mutation.isPending
            }
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Processing…" : "Start Offboarding"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Offboarding detail panel — full 7-step workflow ──────────

function Row({
  label,
  value,
  sub,
  bold,
  muted,
}: {
  label: string;
  value: string;
  sub?: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={muted ? "text-muted-foreground" : ""}>
        {label}
        {sub && (
          <span className="text-xs text-muted-foreground ml-1">({sub})</span>
        )}
      </span>
      <span
        className={
          bold ? "font-semibold" : muted ? "text-muted-foreground" : ""
        }
      >
        {value}
      </span>
    </div>
  );
}

function OffboardingDetailPanel({
  record,
  onClose,
}: {
  record: OffboardingRecord | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const { data: live } = useQuery({
    queryKey: ["offboarding-detail", record?._id],
    queryFn: () => fetchOffboardingById(record!._id),
    enabled: !!record,
    initialData: () => record ?? undefined,
  });

  const o = live ?? record;

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: ["offboarding-detail", record?._id],
    });
    queryClient.invalidateQueries({ queryKey: ["recruitment-offboarding"] });
  };

  // ── Step 1: fairness checklist ──
  const fairnessMutation = useMutation({
    mutationFn: (items: { index: number; status: "pass" | "pending" }[]) =>
      updateOffboardingFairnessChecklist(o!._id, items),
    onSuccess: invalidate,
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to update checklist"),
  });

  // ── Step 2: notice ──
  const [noticeForm, setNoticeForm] = useState({
    noticeType: "serve" as NoticeHandling,
    method: "",
    servedAt: todayISO(),
  });
  useEffect(() => {
    if (o?.noticeType)
      setNoticeForm((f) => ({ ...f, noticeType: o.noticeType! }));
  }, [o?._id]);

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);

  const serveNoticeMutation = useMutation({
    mutationFn: () => serveOffboardingNotice(o!._id, noticeForm),
    onSuccess: () => {
      invalidate();
      toast.success("Notice marked as served — appeal window has opened.");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to serve notice"),
  });

  const noticeFileInputRef = useRef<HTMLInputElement>(null);
  const uploadNoticeMutation = useMutation({
    mutationFn: (file: File) => uploadOffboardingNoticeFile(o!._id, file),
    onSuccess: () => {
      invalidate();
      toast.success("Signed notice uploaded.");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to upload"),
  });

  // ── Step 3: appeal ──
  const [appealForm, setAppealForm] = useState({
    filedAt: todayISO(),
    grounds: "",
    hearingDate: "",
  });
  const fileAppealMutation = useMutation({
    mutationFn: () =>
      fileOffboardingAppeal(o!._id, {
        filedAt: appealForm.filedAt,
        grounds: appealForm.grounds,
        hearingDate: appealForm.hearingDate || undefined,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Appeal filed — notice period suspended.");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to file appeal"),
  });

  const [outcomeForm, setOutcomeForm] = useState<{
    decision: "upheld" | "overturned" | "modified" | "adjourned";
    panelMembers: string;
    notes: string;
  }>({ decision: "upheld", panelMembers: "", notes: "" });
  const outcomeMutation = useMutation({
    mutationFn: () => recordOffboardingAppealOutcome(o!._id, outcomeForm),
    onSuccess: () => {
      invalidate();
      toast.success("Appeal outcome recorded.");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to record outcome"),
  });

  const [withdrawReason, setWithdrawReason] = useState("");
  const withdrawMutation = useMutation({
    mutationFn: () => withdrawOffboardingAppeal(o!._id, withdrawReason),
    onSuccess: () => {
      invalidate();
      setWithdrawReason("");
      toast.success("Appeal withdrawn.");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to withdraw appeal"),
  });

  const appealFileInputRef = useRef<HTMLInputElement>(null);
  const [appealUploadKind, setAppealUploadKind] = useState<
    "hearing_minutes" | "withdrawal_letter"
  >("hearing_minutes");
  const uploadAppealFileMutation = useMutation({
    mutationFn: (file: File) =>
      uploadOffboardingAppealFile(o!._id, appealUploadKind, file),
    onSuccess: () => {
      invalidate();
      toast.success("File uploaded.");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to upload"),
  });

  // ── Step 4: exit interview ──
  const [exitForm, setExitForm] = useState({
    formDeadline: "",
    scheduledAt: "",
    interviewer: "",
    location: "",
    reasonCategory: "",
    rating: "",
    whatWentWell: "",
    whatToImprove: "",
    fairnessAssessment: "",
    notes: "",
    done: false,
  });
  useEffect(() => {
    if (o) {
      setExitForm({
        formDeadline: o.exitFormDeadline?.slice(0, 10) ?? "",
        scheduledAt: o.exitScheduledAt?.slice(0, 16) ?? "",
        interviewer: o.exitInterviewer ?? "",
        location: o.exitLocation ?? "",
        reasonCategory: o.exitReasonCategory ?? "",
        rating: o.exitRating != null ? String(o.exitRating) : "",
        whatWentWell: o.exitWhatWentWell ?? "",
        whatToImprove: o.exitWhatToImprove ?? "",
        fairnessAssessment: o.exitFairnessAssessment ?? "",
        notes: o.exitInterviewNotes ?? "",
        done: o.exitInterviewDone,
      });
    }
  }, [o?._id]);

  const exitMutation = useMutation({
    mutationFn: () =>
      updateOffboardingExitInterview(o!._id, {
        formSent: true,
        formDeadline: exitForm.formDeadline || undefined,
        scheduled: !!exitForm.scheduledAt,
        scheduledAt: exitForm.scheduledAt || undefined,
        interviewer: exitForm.interviewer || undefined,
        location: exitForm.location || undefined,
        reasonCategory: exitForm.reasonCategory || undefined,
        rating: exitForm.rating !== "" ? Number(exitForm.rating) : undefined,
        whatWentWell: exitForm.whatWentWell || undefined,
        whatToImprove: exitForm.whatToImprove || undefined,
        fairnessAssessment: exitForm.fairnessAssessment || undefined,
        notes: exitForm.notes || undefined,
        done: exitForm.done,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Saved.");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to save"),
  });

  // ── Step 5: clearance & handover ──
  const [checklist, setChecklist] = useState<
    { key: string; cleared: boolean }[]
  >([]);
  const [handoverNotes, setHandoverNotes] = useState("");
  const [handoverAssigneeName, setHandoverAssigneeName] = useState("");
  useEffect(() => {
    if (o) {
      setChecklist(
        o.clearanceChecklist.map((c) => ({ key: c.key, cleared: c.cleared })),
      );
      setHandoverNotes(o.handoverNotes ?? "");
      setHandoverAssigneeName(o.handoverAssigneeName ?? "");
    }
  }, [o?._id]);

  const clearanceMutation = useMutation({
    mutationFn: () =>
      updateOffboarding(o!._id, {
        clearanceChecklist: checklist,
        handoverNotes,
        handoverAssigneeName,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Saved.");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to save"),
  });

  // ── Step 6: final pay ──
  const computeFinalPayMutation = useMutation({
    mutationFn: () => computeOffboardingFinalPay(o!._id),
    onSuccess: () => {
      invalidate();
      toast.success("Final pay computed from real salary and leave data.");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to compute final pay"),
  });
  const approveFinalPayMutation = useMutation({
    mutationFn: () => approveOffboardingFinalPay(o!._id),
    onSuccess: () => {
      invalidate();
      toast.success("Final pay approved and sent to payroll.");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to approve"),
  });

  // ── Step 7: certificate of service ──
  const certificateFileInputRef = useRef<HTMLInputElement>(null);
  const generateCertificateMutation = useMutation({
    mutationFn: () => generateOffboardingCertificate(o!._id),
    onSuccess: () => {
      invalidate();
      toast.success("Draft certificate generated.");
    },
    onError: (e: any) =>
      toast.error(
        e?.response?.data?.message ?? "Failed to generate certificate",
      ),
  });
  const uploadCertificateMutation = useMutation({
    mutationFn: (file: File) => uploadOffboardingCertificate(o!._id, file),
    onSuccess: () => {
      invalidate();
      toast.success("Certificate of Service document uploaded.");
    },
    onError: (e: any) =>
      toast.error(
        e?.response?.data?.message ?? "Failed to upload the document",
      ),
  });
  const sendCertificateMutation = useMutation({
    mutationFn: () => sendOffboardingCertificate(o!._id),
    onSuccess: () => {
      invalidate();
      toast.success(`Certificate of Service emailed to ${o!.employeeName}.`);
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to send certificate"),
  });

  if (!record || !o) return null;

  const isTermination = o.type === "termination";
  const fairnessAllPass =
    o.fairnessChecklist.length === 0 ||
    o.fairnessChecklist.every((f) => f.status === "pass");
  const isReversed = o.status === "reversed";

  return (
    <Sheet open={!!record} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{o.employeeName}</SheetTitle>
          <p className="text-xs text-muted-foreground">{o.jobTitle}</p>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          {isReversed && (
            <div className="rounded-md bg-info/10 border border-info/20 text-info text-sm p-3 flex items-start gap-2">
              <RotateCcw className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                The appeal was {o.appeal?.status}. {o.employeeName} has been
                reinstated and this offboarding process has stopped.
              </span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="border rounded-md p-3">
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="font-medium capitalize">{o.type}</p>
            </div>
            <div className="border rounded-md p-3">
              <p className="text-xs text-muted-foreground">Category</p>
              <p className="font-medium">
                {o.category ? TERMINATION_CATEGORY_LABEL[o.category] : "—"}
              </p>
            </div>
            <div className="border rounded-md p-3">
              <p className="text-xs text-muted-foreground">End Date</p>
              <p className="font-medium">{fmtDate(o.endDate)}</p>
            </div>
          </div>
          {o.reason && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Notes
              </p>
              <p className="text-sm mt-1">{o.reason}</p>
            </div>
          )}

          {isTermination && (
            <>
              {/* Step 1 — Fairness checklist */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <ClipboardList className="h-4 w-4 text-primary" /> Step 1 —
                    Pre-termination fairness checklist
                  </p>
                  {o.fairnessChecklist.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      No checklist for this category.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {o.fairnessChecklist.map((item, i) => (
                        <label
                          key={i}
                          className="flex items-start gap-2 text-sm border rounded-md p-2"
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={item.status === "pass"}
                            disabled={fairnessMutation.isPending}
                            onChange={(e) =>
                              fairnessMutation.mutate([
                                {
                                  index: i,
                                  status: e.target.checked ? "pass" : "pending",
                                },
                              ])
                            }
                          />
                          <span>
                            <span className="font-medium">{item.item}</span>{" "}
                            <Badge
                              variant="outline"
                              className="text-[10px] ml-1"
                            >
                              {item.cat}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.detail}
                            </p>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Step 2 — Draft & serve notice */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <FileSignature className="h-4 w-4 text-primary" /> Step 2 —
                    Draft & serve notice
                  </p>
                  {o.noticePeriodLabel && (
                    <p className="text-xs text-muted-foreground">
                      Statutory notice period: {o.noticePeriodLabel}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={downloadingPdf}
                      onClick={async () => {
                        setDownloadingPdf(true);
                        try {
                          await downloadOffboardingNoticePdf(
                            o._id,
                            o.employeeName,
                          );
                        } catch {
                          toast.error("Failed to download PDF");
                        } finally {
                          setDownloadingPdf(false);
                        }
                      }}
                    >
                      {downloadingPdf ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={downloadingDocx}
                      onClick={async () => {
                        setDownloadingDocx(true);
                        try {
                          await downloadOffboardingNoticeDocx(
                            o._id,
                            o.employeeName,
                          );
                        } catch {
                          toast.error("Failed to download Word document");
                        } finally {
                          setDownloadingDocx(false);
                        }
                      }}
                    >
                      {downloadingDocx ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Word
                    </Button>
                  </div>

                  {o.noticeServed ? (
                    <div className="rounded-md bg-success/10 border border-success/20 text-success text-sm p-2.5">
                      Served via {o.noticeMethod} on{" "}
                      {o.noticeServedAt ? fmtDate(o.noticeServedAt) : "—"}
                      {o.noticeType
                        ? ` — ${NOTICE_HANDLING_LABEL[o.noticeType]}`
                        : ""}
                    </div>
                  ) : (
                    <div className="space-y-2 border rounded-md p-3">
                      {!fairnessAllPass && (
                        <p className="text-xs text-warning">
                          Complete the fairness checklist above before serving
                          notice.
                        </p>
                      )}
                      <div className="space-y-1">
                        <Label className="text-xs">
                          How is the notice being handled?
                        </Label>
                        <Select
                          value={noticeForm.noticeType}
                          onValueChange={(v: any) =>
                            setNoticeForm((f) => ({ ...f, noticeType: v }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {NOTICE_HANDLING_OPTIONS.map((n) => (
                              <SelectItem key={n} value={n}>
                                {NOTICE_HANDLING_LABEL[n]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Method of service</Label>
                        <Input
                          placeholder="e.g. Email, hand-delivered, registered post"
                          value={noticeForm.method}
                          onChange={(e) =>
                            setNoticeForm((f) => ({
                              ...f,
                              method: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Served on</Label>
                        <Input
                          type="date"
                          value={noticeForm.servedAt}
                          onChange={(e) =>
                            setNoticeForm((f) => ({
                              ...f,
                              servedAt: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={
                          !fairnessAllPass ||
                          !noticeForm.method ||
                          serveNoticeMutation.isPending
                        }
                        onClick={() => serveNoticeMutation.mutate()}
                      >
                        {serveNoticeMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Mark notice as served"
                        )}
                      </Button>
                    </div>
                  )}

                  <input
                    ref={noticeFileInputRef}
                    type="file"
                    className="hidden"
                    accept="application/pdf,image/jpeg,image/jpg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadNoticeMutation.mutate(file);
                      if (noticeFileInputRef.current)
                        noticeFileInputRef.current.value = "";
                    }}
                  />
                  {o.noticeFile ? (
                    <a
                      href={resolveOffboardingFileUrl(o.noticeFile.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs border rounded-md px-2.5 py-1.5 bg-muted/40 hover:bg-muted transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5" /> {o.noticeFile.name}
                    </a>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={uploadNoticeMutation.isPending}
                      onClick={() => noticeFileInputRef.current?.click()}
                    >
                      {uploadNoticeMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Paperclip className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Upload signed notice
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Step 3 — Appeal period (Art. 29) */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Gavel className="h-4 w-4 text-primary" /> Step 3 — Appeal
                    period (Art. 29)
                  </p>
                  {!o.noticeServed ? (
                    <p className="text-xs text-muted-foreground italic">
                      Opens once notice has been served.
                    </p>
                  ) : !o.appeal?.filed ? (
                    <div className="space-y-2 border rounded-md p-3">
                      <p className="text-xs text-muted-foreground">
                        Appeal window: {o.appeal?.window ?? "5 working days"}
                        {o.appeal?.deadline
                          ? ` — deadline ${fmtDate(o.appeal.deadline)}`
                          : ""}
                      </p>
                      <div className="space-y-1">
                        <Label className="text-xs">Filed on</Label>
                        <Input
                          type="date"
                          value={appealForm.filedAt}
                          onChange={(e) =>
                            setAppealForm((f) => ({
                              ...f,
                              filedAt: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Grounds</Label>
                        <Textarea
                          rows={2}
                          value={appealForm.grounds}
                          onChange={(e) =>
                            setAppealForm((f) => ({
                              ...f,
                              grounds: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          Hearing date (optional)
                        </Label>
                        <Input
                          type="date"
                          value={appealForm.hearingDate}
                          onChange={(e) =>
                            setAppealForm((f) => ({
                              ...f,
                              hearingDate: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={
                          !appealForm.grounds || fileAppealMutation.isPending
                        }
                        onClick={() => fileAppealMutation.mutate()}
                      >
                        {fileAppealMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "File appeal"
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {o.appeal.status.replace("_", " ")}
                        </Badge>
                        {o.appeal.hearingDate && (
                          <span className="text-xs text-muted-foreground">
                            Hearing: {fmtDate(o.appeal.hearingDate)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{o.appeal.grounds}</p>

                      {["pending", "hearing_scheduled", "adjourned"].includes(
                        o.appeal.status,
                      ) && (
                        <div className="space-y-2 border rounded-md p-3">
                          <Label className="text-xs">Record outcome</Label>
                          <Select
                            value={outcomeForm.decision}
                            onValueChange={(v: any) =>
                              setOutcomeForm((f) => ({ ...f, decision: v }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="upheld">
                                Upheld (termination stands)
                              </SelectItem>
                              <SelectItem value="overturned">
                                Overturned (reinstate employee)
                              </SelectItem>
                              <SelectItem value="modified">
                                Modified (reinstate employee)
                              </SelectItem>
                              <SelectItem value="adjourned">
                                Adjourned
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Panel members"
                            value={outcomeForm.panelMembers}
                            onChange={(e) =>
                              setOutcomeForm((f) => ({
                                ...f,
                                panelMembers: e.target.value,
                              }))
                            }
                          />
                          <Textarea
                            rows={2}
                            placeholder="Hearing notes"
                            value={outcomeForm.notes}
                            onChange={(e) =>
                              setOutcomeForm((f) => ({
                                ...f,
                                notes: e.target.value,
                              }))
                            }
                          />
                          <Button
                            size="sm"
                            className="w-full"
                            disabled={outcomeMutation.isPending}
                            onClick={() => outcomeMutation.mutate()}
                          >
                            {outcomeMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Save outcome"
                            )}
                          </Button>
                          <div className="flex gap-2 pt-1">
                            <Input
                              placeholder="Withdrawal reason"
                              value={withdrawReason}
                              onChange={(e) =>
                                setWithdrawReason(e.target.value)
                              }
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                !withdrawReason || withdrawMutation.isPending
                              }
                              onClick={() => withdrawMutation.mutate()}
                            >
                              Withdraw
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Select
                          value={appealUploadKind}
                          onValueChange={(v: any) => setAppealUploadKind(v)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hearing_minutes">
                              Hearing minutes
                            </SelectItem>
                            <SelectItem value="withdrawal_letter">
                              Withdrawal letter
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <input
                          ref={appealFileInputRef}
                          type="file"
                          className="hidden"
                          accept="application/pdf,image/jpeg,image/jpg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadAppealFileMutation.mutate(file);
                            if (appealFileInputRef.current)
                              appealFileInputRef.current.value = "";
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={uploadAppealFileMutation.isPending}
                          onClick={() => appealFileInputRef.current?.click()}
                        >
                          <Paperclip className="h-3.5 w-3.5 mr-1.5" /> Upload
                        </Button>
                      </div>
                      {o.appeal.hearingMinutesFile && (
                        <a
                          href={resolveOffboardingFileUrl(
                            o.appeal.hearingMinutesFile.url,
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs border rounded-md px-2.5 py-1.5 bg-muted/40 hover:bg-muted transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5" />{" "}
                          {o.appeal.hearingMinutesFile.name}
                        </a>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Step 4 — Exit interview */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" /> Step 4 — Exit
                interview
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Interviewer</Label>
                  <Input
                    value={exitForm.interviewer}
                    onChange={(e) =>
                      setExitForm((f) => ({
                        ...f,
                        interviewer: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Location</Label>
                  <Input
                    value={exitForm.location}
                    onChange={(e) =>
                      setExitForm((f) => ({ ...f, location: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Scheduled for</Label>
                  <Input
                    type="datetime-local"
                    value={exitForm.scheduledAt}
                    onChange={(e) =>
                      setExitForm((f) => ({
                        ...f,
                        scheduledAt: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Reason category</Label>
                  <Input
                    value={exitForm.reasonCategory}
                    onChange={(e) =>
                      setExitForm((f) => ({
                        ...f,
                        reasonCategory: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Rating (1–5)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={exitForm.rating}
                    onChange={(e) =>
                      setExitForm((f) => ({ ...f, rating: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">What went well</Label>
                <Textarea
                  rows={2}
                  value={exitForm.whatWentWell}
                  onChange={(e) =>
                    setExitForm((f) => ({
                      ...f,
                      whatWentWell: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">What to improve</Label>
                <Textarea
                  rows={2}
                  value={exitForm.whatToImprove}
                  onChange={(e) =>
                    setExitForm((f) => ({
                      ...f,
                      whatToImprove: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fairness assessment</Label>
                <Textarea
                  rows={2}
                  value={exitForm.fairnessAssessment}
                  onChange={(e) =>
                    setExitForm((f) => ({
                      ...f,
                      fairnessAssessment: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  rows={2}
                  value={exitForm.notes}
                  onChange={(e) =>
                    setExitForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={exitForm.done}
                  onChange={(e) =>
                    setExitForm((f) => ({ ...f, done: e.target.checked }))
                  }
                />
                Exit interview completed
              </label>
              <Button
                size="sm"
                className="w-full"
                disabled={exitMutation.isPending}
                onClick={() => exitMutation.mutate()}
              >
                {exitMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Save exit interview"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Step 5 — Clearance & handover */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" /> Step 5 —
                Clearance & handover
              </p>
              {o.clearanceChecklist.map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={
                      checklist.find((c) => c.key === item.key)?.cleared ??
                      item.cleared
                    }
                    onChange={(e) =>
                      setChecklist((prev) =>
                        prev.map((c) =>
                          c.key === item.key
                            ? { ...c, cleared: e.target.checked }
                            : c,
                        ),
                      )
                    }
                  />
                  {item.label}
                </label>
              ))}
              <div className="space-y-1">
                <Label className="text-xs">Handover receiving colleague</Label>
                <Input
                  value={handoverAssigneeName}
                  onChange={(e) => setHandoverAssigneeName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Handover notes</Label>
                <Textarea
                  rows={2}
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                className="w-full"
                disabled={clearanceMutation.isPending}
                onClick={() => clearanceMutation.mutate()}
              >
                {clearanceMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Save clearance"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Step 6 — Final pay */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-primary" /> Step 6 — Final pay
              </p>
              {!o.finalPay ? (
                <Button
                  size="sm"
                  className="w-full"
                  disabled={computeFinalPayMutation.isPending}
                  onClick={() => computeFinalPayMutation.mutate()}
                >
                  {computeFinalPayMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Compute final pay"
                  )}
                </Button>
              ) : (
                <div className="space-y-2">
                  <Row
                    label="Pro-rata salary"
                    value={fmtMoney(
                      o.finalPay.proRataAmount,
                      o.finalPay.currency,
                    )}
                    sub={`${o.finalPay.proRataDays} day(s)`}
                  />
                  <Row
                    label="Accrued leave payout"
                    value={fmtMoney(
                      o.finalPay.leaveBalanceAmount,
                      o.finalPay.currency,
                    )}
                    sub={`${o.finalPay.leaveBalanceDays} day(s)`}
                  />
                  <Row
                    label="13th month (pro-rata)"
                    value={fmtMoney(
                      o.finalPay.thirteenthMonthAmount,
                      o.finalPay.currency,
                    )}
                  />
                  {o.finalPay.transportAllowanceProrated > 0 && (
                    <Row
                      label="Transport allowance (pro-rata)"
                      value={fmtMoney(
                        o.finalPay.transportAllowanceProrated,
                        o.finalPay.currency,
                      )}
                    />
                  )}
                  {o.finalPay.severanceDue && (
                    <Row
                      label="Severance"
                      value={fmtMoney(
                        o.finalPay.severanceAmount,
                        o.finalPay.currency,
                      )}
                    />
                  )}
                  <div className="border-t pt-2">
                    <Row
                      label="Gross final pay"
                      value={fmtMoney(
                        o.finalPay.grossFinalPay,
                        o.finalPay.currency,
                      )}
                      bold
                    />
                  </div>
                  {o.finalPay.deductions
                    .filter((d) => d.visibleToEmployee)
                    .map((d) => (
                      <Row
                        key={d.key}
                        label={`− ${d.label}`}
                        value={fmtMoney(d.employeeAmount, o.finalPay!.currency)}
                        muted
                      />
                    ))}
                  {o.finalPay.outstandingAdvances > 0 && (
                    <Row
                      label="− Outstanding advances / loans"
                      value={fmtMoney(
                        o.finalPay.outstandingAdvances,
                        o.finalPay.currency,
                      )}
                      muted
                    />
                  )}
                  <div className="border-t pt-2">
                    <Row
                      label="Net final pay"
                      value={fmtMoney(
                        o.finalPay.netFinalPay - o.finalPay.outstandingAdvances,
                        o.finalPay.currency,
                      )}
                      bold
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={computeFinalPayMutation.isPending}
                      onClick={() => computeFinalPayMutation.mutate()}
                    >
                      Recompute
                    </Button>
                    {o.finalPay.approved ? (
                      <Badge
                        variant="outline"
                        className="bg-success/10 text-success border-success/20"
                      >
                        Approved{" "}
                        {o.finalPay.approvedAt
                          ? fmtDate(o.finalPay.approvedAt)
                          : ""}
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        disabled={approveFinalPayMutation.isPending}
                        onClick={() => approveFinalPayMutation.mutate()}
                      >
                        {approveFinalPayMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Approve & send to payroll"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 7 — Certificate of service */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Award className="h-4 w-4 text-primary" /> Step 7 — Certificate
                of service
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Generate a draft, or upload your own signed document, then send
                it to {o.employeeName} by email.
              </p>

              <input
                ref={certificateFileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/jpg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadCertificateMutation.mutate(file);
                  if (certificateFileInputRef.current)
                    certificateFileInputRef.current.value = "";
                }}
              />

              {o.certificateOfServiceFile ? (
                <a
                  href={resolveOffboardingFileUrl(
                    o.certificateOfServiceFile.url,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs border rounded-md px-2.5 py-1.5 bg-muted/40 hover:bg-muted transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {o.certificateOfServiceFile.name}
                </a>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No document generated or uploaded yet.
                </p>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={generateCertificateMutation.isPending}
                  onClick={() => generateCertificateMutation.mutate()}
                >
                  {generateCertificateMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <FileSignature className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Generate draft
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={uploadCertificateMutation.isPending}
                  onClick={() => certificateFileInputRef.current?.click()}
                >
                  {uploadCertificateMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Paperclip className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {o.certificateOfServiceFile ? "Replace file" : "Upload file"}
                </Button>
                <Button
                  size="sm"
                  disabled={
                    !o.certificateOfServiceFile ||
                    sendCertificateMutation.isPending
                  }
                  onClick={() => sendCertificateMutation.mutate()}
                >
                  {sendCertificateMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Mail className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {o.certificateOfServiceSentAt ? "Re-send" : "Send"}
                </Button>
              </div>
              {o.certificateOfServiceSentAt && (
                <p className="text-xs text-muted-foreground">
                  Last emailed {fmtDate(o.certificateOfServiceSentAt)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Succession Planning ──────────────────────────────────────

function SuccessionPlanning() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [nominateTarget, setNominateTarget] = useState<SuccessionPlan | null>(
    null,
  );
  const [successorDetail, setSuccessorDetail] = useState<{
    plan: SuccessionPlan;
    successor: Successor;
  } | null>(null);
  const [riskAlertsOpen, setRiskAlertsOpen] = useState(false);
  const [benchStrengthOpen, setBenchStrengthOpen] = useState(false);
  const [nineBoxOpen, setNineBoxOpen] = useState(false);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["succession-plans"],
    queryFn: fetchAllSuccessionPlans,
  });

  const { data: riskAlerts = [] } = useQuery({
    queryKey: ["succession-risk-alerts"],
    queryFn: fetchSuccessionRiskAlerts,
  });

  const { data: benchStrength } = useQuery({
    queryKey: ["succession-bench-strength"],
    queryFn: fetchSuccessionBenchStrength,
  });

  const { data: empData } = useQuery({
    queryKey: ["hr-employees-for-succession"],
    queryFn: () => fetchEmployees({ limit: 500 }),
  });
  const employees = empData?.items ?? [];

  const selectedPlan = plans.find((p) => p._id === selectedPlanId) ?? null;

  // Keep the detail sheet's data fresh as mutations invalidate ["succession-plans"].
  useEffect(() => {
    if (successorDetail && selectedPlan) {
      const fresh = selectedPlan.successors.find(
        (s) => s.employeeId === successorDetail.successor.employeeId,
      );
      if (fresh) setSuccessorDetail({ plan: selectedPlan, successor: fresh });
    }
  }, [selectedPlan]);

  const [form, setForm] = useState({
    criticalRole: "",
    department: "",
    incumbentId: "",
    businessImpact: "",
    riskOfLoss: "medium" as RiskOfLoss,
    overallReadiness: "gap" as BenchReadiness,
  });

  const createMutation = useMutation({
    mutationFn: createSuccessionPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["succession-plans"] });
      queryClient.invalidateQueries({
        queryKey: ["succession-bench-strength"],
      });
      queryClient.invalidateQueries({ queryKey: ["succession-risk-alerts"] });
      setCreateOpen(false);
      setForm({
        criticalRole: "",
        department: "",
        incumbentId: "",
        businessImpact: "",
        riskOfLoss: "medium",
        overallReadiness: "gap",
      });
      toast.success("Critical role added.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to create plan"),
  });

  const invalidatePlan = () => {
    queryClient.invalidateQueries({ queryKey: ["succession-plans"] });
    queryClient.invalidateQueries({ queryKey: ["succession-bench-strength"] });
    queryClient.invalidateQueries({ queryKey: ["succession-risk-alerts"] });
    queryClient.invalidateQueries({ queryKey: ["succession-nine-box"] });
  };

  const removeSuccessorMutation = useMutation({
    mutationFn: ({
      planId,
      employeeId,
    }: {
      planId: string;
      employeeId: string;
    }) => removeSuccessor(planId, employeeId),
    onSuccess: () => {
      invalidatePlan();
      toast.success("Successor removed.");
    },
  });

  const emergencyCoverMutation = useMutation({
    mutationFn: ({
      planId,
      dto,
    }: {
      planId: string;
      dto: { interimCoverId?: string | null; externalBackupNotes?: string };
    }) => setSuccessionEmergencyCover(planId, dto),
    onSuccess: () => {
      invalidatePlan();
      toast.success("Emergency cover plan updated.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to update"),
  });

  const nextReviewMutation = useMutation({
    mutationFn: ({ planId, date }: { planId: string; date: string }) =>
      setSuccessionNextReview(planId, date),
    onSuccess: () => {
      invalidatePlan();
      toast.success("Next review date set.");
    },
  });

  const alertsByPlan = useMemo(() => {
    const map = new Map<string, RiskAlert[]>();
    for (const a of riskAlerts) {
      map.set(a.planId, [...(map.get(a.planId) ?? []), a]);
    }
    return map;
  }, [riskAlerts]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          Identify critical roles, name successors, and track bench readiness.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRiskAlertsOpen(true)}
          >
            <ShieldAlert className="h-4 w-4 mr-1.5" /> Risk Alerts
            {riskAlerts.length > 0 && (
              <Badge className="ml-1.5 h-5 px-1.5 bg-destructive text-destructive-foreground">
                {riskAlerts.length}
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBenchStrengthOpen(true)}
          >
            <TrendingUp className="h-4 w-4 mr-1.5" /> Bench Strength
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNineBoxOpen(true)}
          >
            <LayoutGrid className="h-4 w-4 mr-1.5" /> 9-Box Grid
          </Button>
          <Button
            className="bg-gradient-to-r from-primary to-secondary"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" /> New Critical Role
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile
          icon={<Briefcase className="h-4 w-4" />}
          label="Critical roles"
          value={plans.length}
        />
        <StatTile
          icon={<CheckCircle2 className="h-4 w-4 text-success" />}
          label="Ready now"
          value={benchStrength?.readyNowCount ?? 0}
        />
        <StatTile
          icon={<XCircle className="h-4 w-4 text-destructive" />}
          label="No successor"
          value={benchStrength?.noSuccessorCount ?? 0}
        />
        <StatTile
          icon={<ShieldAlert className="h-4 w-4 text-warning" />}
          label="Open risk alerts"
          value={riskAlerts.length}
        />
      </div>

      {isLoading ? (
        <LoadingRow label="Loading succession plans…" />
      ) : plans.length === 0 ? (
        <EmptyCard text="No critical roles identified yet." />
      ) : (
        <div className="space-y-2">
          {plans.map((p) => {
            const planAlerts = alertsByPlan.get(p._id) ?? [];
            const readyNowCount = p.successors.filter(
              (s) => s.readiness === "ready_now",
            ).length;
            return (
              <Card key={p._id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{p.criticalRole}</h3>
                        {p.department && (
                          <Badge variant="outline" className="text-[10px]">
                            {p.department}
                          </Badge>
                        )}
                        {p.holderExiting && (
                          <Badge className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
                            Holder exiting
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Incumbent · {p.incumbentName}
                      </p>
                      {planAlerts.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3 text-warning" />
                          <span className="text-[11px] text-muted-foreground">
                            {planAlerts.length} alert
                            {planAlerts.length > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={RISK_TONE[p.riskOfLoss]}
                      >
                        Risk: {p.riskOfLoss}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={READINESS_TONE[p.overallReadiness]}
                      >
                        {READINESS_LABEL[p.overallReadiness]}
                      </Badge>
                      <Badge variant="outline" className="text-[11px]">
                        <Users className="h-3 w-3 mr-1" />
                        {p.successors.length} successor
                        {p.successors.length === 1 ? "" : "s"}
                        {readyNowCount > 0 ? ` (${readyNowCount} ready)` : ""}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedPlanId(p._id)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" /> View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── New critical role ───────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Critical Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Critical role</Label>
              <Input
                placeholder="e.g. Head of Compliance"
                value={form.criticalRole}
                onChange={(e) =>
                  setForm({ ...form, criticalRole: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <Input
                placeholder="e.g. Compliance"
                value={form.department}
                onChange={(e) =>
                  setForm({ ...form, department: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Incumbent</Label>
              <Select
                value={form.incumbentId}
                onValueChange={(v) => setForm({ ...form, incumbentId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e: Employee) => (
                    <SelectItem key={e._id} value={e._id}>
                      {e.firstName} {e.lastName} — {e.jobTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Business impact if vacated</Label>
              <Textarea
                placeholder="What breaks if this role sits empty?"
                value={form.businessImpact}
                onChange={(e) =>
                  setForm({ ...form, businessImpact: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Risk of loss</Label>
                <Select
                  value={form.riskOfLoss}
                  onValueChange={(v: any) =>
                    setForm({ ...form, riskOfLoss: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Bench readiness</Label>
                <Select
                  value={form.overallReadiness}
                  onValueChange={(v: any) =>
                    setForm({ ...form, overallReadiness: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ready_now">Ready now</SelectItem>
                    <SelectItem value="ready_1_2_years">
                      Ready 1–2 yrs
                    </SelectItem>
                    <SelectItem value="ready_3_plus_years">
                      Ready 3+ yrs
                    </SelectItem>
                    <SelectItem value="gap">Gap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !form.criticalRole ||
                !form.incumbentId ||
                createMutation.isPending
              }
              onClick={() =>
                createMutation.mutate({
                  criticalRole: form.criticalRole,
                  department: form.department || undefined,
                  incumbentId: form.incumbentId,
                  businessImpact: form.businessImpact || undefined,
                  riskOfLoss: form.riskOfLoss,
                  overallReadiness: form.overallReadiness,
                })
              }
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Role detail sheet ───────────────────────────────── */}
      <Sheet
        open={!!selectedPlan}
        onOpenChange={(o) => !o && setSelectedPlanId(null)}
      >
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {selectedPlan && (
            <RoleDetailPanel
              plan={selectedPlan}
              employees={employees}
              onNominate={() => setNominateTarget(selectedPlan)}
              onOpenSuccessor={(s) =>
                setSuccessorDetail({ plan: selectedPlan, successor: s })
              }
              onRemoveSuccessor={(employeeId) =>
                removeSuccessorMutation.mutate({
                  planId: selectedPlan._id,
                  employeeId,
                })
              }
              onSaveEmergencyCover={(dto) =>
                emergencyCoverMutation.mutate({
                  planId: selectedPlan._id,
                  dto,
                })
              }
              onSaveNextReview={(date) =>
                nextReviewMutation.mutate({ planId: selectedPlan._id, date })
              }
            />
          )}
        </SheetContent>
      </Sheet>

      {nominateTarget && (
        <NominateSuccessorDialog
          plan={nominateTarget}
          employees={employees}
          onClose={() => setNominateTarget(null)}
        />
      )}

      {successorDetail && (
        <SuccessorDetailDialog
          plan={successorDetail.plan}
          successor={successorDetail.successor}
          onClose={() => setSuccessorDetail(null)}
        />
      )}

      <RiskAlertsDialog
        open={riskAlertsOpen}
        onClose={() => setRiskAlertsOpen(false)}
        alerts={riskAlerts}
        onViewPlan={(planId) => {
          setRiskAlertsOpen(false);
          setSelectedPlanId(planId);
        }}
      />

      <BenchStrengthDialog
        open={benchStrengthOpen}
        onClose={() => setBenchStrengthOpen(false)}
        report={benchStrength ?? null}
      />

      <NineBoxDialog open={nineBoxOpen} onClose={() => setNineBoxOpen(false)} />
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="p-3.5 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-lg font-semibold leading-none">{value}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Role detail panel (inside the Sheet) ──────────────────────

function RoleDetailPanel({
  plan,
  employees,
  onNominate,
  onOpenSuccessor,
  onRemoveSuccessor,
  onSaveEmergencyCover,
  onSaveNextReview,
}: {
  plan: SuccessionPlan;
  employees: Employee[];
  onNominate: () => void;
  onOpenSuccessor: (s: Successor) => void;
  onRemoveSuccessor: (employeeId: string) => void;
  onSaveEmergencyCover: (dto: {
    interimCoverId?: string | null;
    externalBackupNotes?: string;
  }) => void;
  onSaveNextReview: (date: string) => void;
}) {
  const [interimCoverId, setInterimCoverId] = useState(
    plan.interimCoverId ?? "none",
  );
  const [externalBackupNotes, setExternalBackupNotes] = useState(
    plan.externalBackupNotes ?? "",
  );
  const [nextReview, setNextReview] = useState(
    plan.nextReviewDate ? plan.nextReviewDate.slice(0, 10) : "",
  );

  useEffect(() => {
    setInterimCoverId(plan.interimCoverId ?? "none");
    setExternalBackupNotes(plan.externalBackupNotes ?? "");
    setNextReview(plan.nextReviewDate ? plan.nextReviewDate.slice(0, 10) : "");
  }, [
    plan._id,
    plan.interimCoverId,
    plan.externalBackupNotes,
    plan.nextReviewDate,
  ]);

  return (
    <div className="space-y-5 pb-8">
      <SheetHeader>
        <SheetTitle>{plan.criticalRole}</SheetTitle>
      </SheetHeader>

      <div className="flex items-center gap-2 flex-wrap">
        {plan.department && <Badge variant="outline">{plan.department}</Badge>}
        <Badge variant="outline" className={RISK_TONE[plan.riskOfLoss]}>
          Risk: {plan.riskOfLoss}
        </Badge>
        <Badge
          variant="outline"
          className={READINESS_TONE[plan.overallReadiness]}
        >
          {READINESS_LABEL[plan.overallReadiness]}
        </Badge>
        {plan.holderExiting && (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            Holder exiting
          </Badge>
        )}
      </div>

      <div className="text-sm">
        <p className="text-muted-foreground">
          Incumbent ·{" "}
          <span className="text-foreground">{plan.incumbentName}</span>
        </p>
      </div>

      {plan.businessImpact && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
            Business impact if vacated
          </p>
          <p className="text-sm">{plan.businessImpact}</p>
        </div>
      )}

      {/* Successors */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Successors
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs"
            onClick={onNominate}
          >
            <UserPlus className="h-3 w-3 mr-1" /> Nominate
          </Button>
        </div>
        {plan.successors.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No successors identified — critical gap.
          </p>
        ) : (
          <div className="space-y-2">
            {plan.successors.map((s) => (
              <Card key={s.employeeId}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {s.employeeName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="text-[10px]">
                          {READINESS_LABEL[s.readiness]}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize ${POTENTIAL_TONE[s.potential]}`}
                        >
                          {s.potential} potential
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => onOpenSuccessor(s)}
                      >
                        <GraduationCap className="h-3.5 w-3.5 mr-1" /> Assess /
                        Develop
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => onRemoveSuccessor(s.employeeId)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                      <span>Readiness</span>
                      <span>{s.readinessPct}%</span>
                    </div>
                    <Progress value={s.readinessPct} className="h-1.5" />
                  </div>
                  {(s.strengths || s.gaps) && (
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {s.strengths && (
                        <div>
                          <p className="text-muted-foreground">Strengths</p>
                          <p>{s.strengths}</p>
                        </div>
                      )}
                      {s.gaps && (
                        <div>
                          <p className="text-muted-foreground">Gaps</p>
                          <p>{s.gaps}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {s.devPlan && (
                    <p className="text-[11px] text-muted-foreground">
                      <Target className="h-3 w-3 inline mr-1" />
                      Developing toward {s.devPlan.targetRole} ·{" "}
                      {
                        s.devPlan.milestones.filter((m) => m.status === "done")
                          .length
                      }
                      /{s.devPlan.milestones.length} milestones done
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Emergency cover */}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
          Emergency cover plan (0–30 days)
        </p>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Interim cover</Label>
            <Select value={interimCoverId} onValueChange={setInterimCoverId}>
              <SelectTrigger>
                <SelectValue placeholder="None selected" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {employees
                  .filter((e) => e._id !== plan.incumbentId)
                  .map((e) => (
                    <SelectItem key={e._id} value={e._id}>
                      {e.firstName} {e.lastName} — {e.jobTitle}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">External backup notes</Label>
            <Textarea
              placeholder="e.g. Retained consultant on standby"
              value={externalBackupNotes}
              onChange={(e) => setExternalBackupNotes(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onSaveEmergencyCover({
                interimCoverId:
                  interimCoverId === "none" ? null : interimCoverId,
                externalBackupNotes,
              })
            }
          >
            <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Save Cover Plan
          </Button>
        </div>
      </div>

      {/* Next review */}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
          Next succession review
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={nextReview}
            onChange={(e) => setNextReview(e.target.value)}
            className="w-auto"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!nextReview}
            onClick={() => onSaveNextReview(nextReview)}
          >
            <CalendarClock className="h-3.5 w-3.5 mr-1.5" /> Set
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Nominate successor ─────────────────────────────────────────

function NominateSuccessorDialog({
  plan,
  employees,
  onClose,
}: {
  plan: SuccessionPlan;
  employees: Employee[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [employeeId, setEmployeeId] = useState("");
  const [readiness, setReadiness] = useState<BenchReadiness>("gap");
  const [potential, setPotential] = useState<SuccessorPotential>("medium");
  const [strengths, setStrengths] = useState("");
  const [gaps, setGaps] = useState("");

  const existingIds = new Set(plan.successors.map((s) => s.employeeId));
  const available = employees.filter(
    (e) => !existingIds.has(e._id) && e._id !== plan.incumbentId,
  );

  const mutation = useMutation({
    mutationFn: () =>
      addSuccessor(plan._id, {
        employeeId,
        readiness,
        potential,
        strengths: strengths || undefined,
        gaps: gaps || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["succession-plans"] });
      queryClient.invalidateQueries({
        queryKey: ["succession-bench-strength"],
      });
      queryClient.invalidateQueries({ queryKey: ["succession-risk-alerts"] });
      onClose();
      toast.success("Successor nominated.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to add successor"),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nominate Successor — {plan.criticalRole}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {available.map((e) => (
                  <SelectItem key={e._id} value={e._id}>
                    {e.firstName} {e.lastName} — {e.jobTitle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Readiness</Label>
              <Select
                value={readiness}
                onValueChange={(v: any) => setReadiness(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ready_now">Ready now</SelectItem>
                  <SelectItem value="ready_1_2_years">Ready 1–2 yrs</SelectItem>
                  <SelectItem value="ready_3_plus_years">
                    Ready 3+ yrs
                  </SelectItem>
                  <SelectItem value="gap">Gap</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Potential</Label>
              <Select
                value={potential}
                onValueChange={(v: any) => setPotential(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Strengths</Label>
            <Textarea
              placeholder="What makes them a strong candidate?"
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Development gaps</Label>
            <Textarea
              placeholder="What do they still need to grow into the role?"
              value={gaps}
              onChange={(e) => setGaps(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!employeeId || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Nominate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Star rating input ──────────────────────────────────────────

function StarRating({
  value,
  onChange,
  label,
}: {
  value: number | null;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground flex-1">{label}</span>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="p-0.5"
          >
            <Star
              className={`h-4 w-4 ${
                value !== null && n <= value
                  ? "fill-warning text-warning"
                  : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Successor detail — assessment + development plan ──────────

function SuccessorDetailDialog({
  plan,
  successor,
  onClose,
}: {
  plan: SuccessionPlan;
  successor: Successor;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const a = successor.assessment;
  const [scores, setScores] = useState({
    technicalKnowledge: a?.technicalKnowledge ?? null,
    leadershipAbility: a?.leadershipAbility ?? null,
    strategicThinking: a?.strategicThinking ?? null,
    stakeholderManagement: a?.stakeholderManagement ?? null,
    industryKnowledge: a?.industryKnowledge ?? null,
    culturalFit: a?.culturalFit ?? null,
  });
  const [comments, setComments] = useState(a?.comments ?? "");

  const [devForm, setDevForm] = useState({
    targetRole: "",
    timelineMonths: "12",
    startDate: new Date().toISOString().slice(0, 10),
    objectives: "",
  });
  const [milestoneForm, setMilestoneForm] = useState({
    item: "",
    dueDate: "",
  });
  const [devReviewDate, setDevReviewDate] = useState(
    successor.devPlan?.nextReviewDate
      ? successor.devPlan.nextReviewDate.slice(0, 10)
      : "",
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["succession-plans"] });
    queryClient.invalidateQueries({ queryKey: ["succession-risk-alerts"] });
    queryClient.invalidateQueries({ queryKey: ["succession-nine-box"] });
  };

  const assessMutation = useMutation({
    mutationFn: () =>
      recordSuccessorAssessment(plan._id, successor.employeeId, {
        ...(scores as any),
        comments: comments || undefined,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Assessment saved.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to save assessment"),
  });

  const createDevPlanMutation = useMutation({
    mutationFn: () =>
      createDevelopmentPlan(plan._id, successor.employeeId, {
        targetRole: devForm.targetRole,
        timelineMonths: Number(devForm.timelineMonths) || 12,
        startDate: devForm.startDate,
        objectives: devForm.objectives || undefined,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Development plan created.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to create plan"),
  });

  const addMilestoneMutation = useMutation({
    mutationFn: () =>
      addDevelopmentMilestone(plan._id, successor.employeeId, milestoneForm),
    onSuccess: () => {
      invalidate();
      setMilestoneForm({ item: "", dueDate: "" });
      toast.success("Milestone added.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to add milestone"),
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: ({
      milestoneId,
      status,
    }: {
      milestoneId: string;
      status: DevelopmentMilestoneStatus;
    }) =>
      updateDevelopmentMilestoneStatus(
        plan._id,
        successor.employeeId,
        milestoneId,
        status,
      ),
    onSuccess: () => invalidate(),
  });

  const devReviewMutation = useMutation({
    mutationFn: () =>
      setDevelopmentPlanNextReview(
        plan._id,
        successor.employeeId,
        devReviewDate,
      ),
    onSuccess: () => {
      invalidate();
      toast.success("Next review date set.");
    },
  });

  const nextMilestoneStatus = (
    s: DevelopmentMilestoneStatus,
  ): DevelopmentMilestoneStatus =>
    s === "pending" ? "in_progress" : s === "in_progress" ? "done" : "pending";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {successor.employeeName} — {plan.criticalRole}
          </DialogTitle>
          <DialogDescription>
            Readiness assessment and development plan for this successor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Assessment */}
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
              Readiness assessment
            </p>
            <div className="space-y-2 border rounded-md p-3">
              <StarRating
                label="Technical knowledge"
                value={scores.technicalKnowledge}
                onChange={(v) =>
                  setScores({ ...scores, technicalKnowledge: v })
                }
              />
              <StarRating
                label="Leadership ability"
                value={scores.leadershipAbility}
                onChange={(v) => setScores({ ...scores, leadershipAbility: v })}
              />
              <StarRating
                label="Strategic thinking"
                value={scores.strategicThinking}
                onChange={(v) => setScores({ ...scores, strategicThinking: v })}
              />
              <StarRating
                label="Stakeholder management"
                value={scores.stakeholderManagement}
                onChange={(v) =>
                  setScores({ ...scores, stakeholderManagement: v })
                }
              />
              <StarRating
                label="Industry knowledge"
                value={scores.industryKnowledge}
                onChange={(v) => setScores({ ...scores, industryKnowledge: v })}
              />
              <StarRating
                label="Cultural fit"
                value={scores.culturalFit}
                onChange={(v) => setScores({ ...scores, culturalFit: v })}
              />
              <Textarea
                placeholder="Assessment comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
              <Button
                size="sm"
                disabled={assessMutation.isPending}
                onClick={() => assessMutation.mutate()}
              >
                {assessMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Assessment"
                )}
              </Button>
              {a?.assessedAt && (
                <p className="text-[11px] text-muted-foreground">
                  Last assessed {fmtDateShort(a.assessedAt)}
                </p>
              )}
            </div>
          </div>

          {/* Development plan */}
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
              Development plan
            </p>
            {!successor.devPlan ? (
              <div className="space-y-2 border rounded-md p-3">
                <div className="space-y-1">
                  <Label className="text-xs">Target role</Label>
                  <Input
                    value={devForm.targetRole}
                    onChange={(e) =>
                      setDevForm({ ...devForm, targetRole: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Timeline (months)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={devForm.timelineMonths}
                      onChange={(e) =>
                        setDevForm({
                          ...devForm,
                          timelineMonths: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Start date</Label>
                    <Input
                      type="date"
                      value={devForm.startDate}
                      onChange={(e) =>
                        setDevForm({ ...devForm, startDate: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Objectives</Label>
                  <Textarea
                    value={devForm.objectives}
                    onChange={(e) =>
                      setDevForm({ ...devForm, objectives: e.target.value })
                    }
                  />
                </div>
                <Button
                  size="sm"
                  disabled={
                    !devForm.targetRole || createDevPlanMutation.isPending
                  }
                  onClick={() => createDevPlanMutation.mutate()}
                >
                  {createDevPlanMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Create Development Plan"
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3 border rounded-md p-3">
                <div className="text-sm">
                  <p className="font-medium">{successor.devPlan.targetRole}</p>
                  <p className="text-xs text-muted-foreground">
                    {successor.devPlan.timelineMonths} months ·{" "}
                    {fmtDateShort(successor.devPlan.startDate)} →{" "}
                    {fmtDateShort(successor.devPlan.targetDate)}
                  </p>
                  {successor.devPlan.objectives && (
                    <p className="text-xs mt-1">
                      {successor.devPlan.objectives}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                    Milestones
                  </p>
                  {successor.devPlan.milestones.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      No milestones yet.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {successor.devPlan.milestones.map((m) => (
                        <div
                          key={m._id}
                          className="flex items-center justify-between text-xs border rounded-md px-2 py-1.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate">{m.item}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Due {fmtDateShort(m.dueDate)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[11px] shrink-0"
                            onClick={() =>
                              updateMilestoneMutation.mutate({
                                milestoneId: m._id,
                                status: nextMilestoneStatus(m.status),
                              })
                            }
                          >
                            {m.status === "done" && (
                              <CheckCircle2 className="h-3 w-3 mr-1 text-success" />
                            )}
                            {MILESTONE_STATUS_LABEL[m.status]}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      placeholder="New milestone"
                      className="h-8 text-xs"
                      value={milestoneForm.item}
                      onChange={(e) =>
                        setMilestoneForm({
                          ...milestoneForm,
                          item: e.target.value,
                        })
                      }
                    />
                    <Input
                      type="date"
                      className="h-8 text-xs w-36"
                      value={milestoneForm.dueDate}
                      onChange={(e) =>
                        setMilestoneForm({
                          ...milestoneForm,
                          dueDate: e.target.value,
                        })
                      }
                    />
                    <Button
                      size="sm"
                      className="h-8"
                      disabled={
                        !milestoneForm.item ||
                        !milestoneForm.dueDate ||
                        addMilestoneMutation.isPending
                      }
                      onClick={() => addMilestoneMutation.mutate()}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs shrink-0">Next review</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs w-auto"
                    value={devReviewDate}
                    onChange={(e) => setDevReviewDate(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={!devReviewDate || devReviewMutation.isPending}
                    onClick={() => devReviewMutation.mutate()}
                  >
                    Set
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Risk alerts ─────────────────────────────────────────────────

function RiskAlertsDialog({
  open,
  onClose,
  alerts,
  onViewPlan,
}: {
  open: boolean;
  onClose: () => void;
  alerts: RiskAlert[];
  onViewPlan: (planId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Succession Risk Alerts</DialogTitle>
          <DialogDescription>
            Roles with no successor, successors behind schedule, or an incumbent
            currently in offboarding.
          </DialogDescription>
        </DialogHeader>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No open risk alerts.
          </p>
        ) : (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div
                key={i}
                className="border rounded-md p-3 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={ALERT_SEVERITY_TONE[a.severity]}
                    >
                      {a.severity}
                    </Badge>
                    <p className="text-sm font-medium">{a.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {a.detail}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => onViewPlan(a.planId)}
                >
                  View
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Bench strength ──────────────────────────────────────────────

function BenchStrengthDialog({
  open,
  onClose,
  report,
}: {
  open: boolean;
  onClose: () => void;
  report: BenchStrengthReport | null;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bench Strength Report</DialogTitle>
        </DialogHeader>
        {!report ? (
          <LoadingRow label="Loading…" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <StatTile
                icon={<CheckCircle2 className="h-4 w-4 text-success" />}
                label="Ready now"
                value={report.readyNowCount}
              />
              <StatTile
                icon={<Clock className="h-4 w-4 text-info" />}
                label="1–2 years out"
                value={report.oneToTwoYearsCount}
              />
              <StatTile
                icon={<XCircle className="h-4 w-4 text-destructive" />}
                label="No successor"
                value={report.noSuccessorCount}
              />
            </div>
            <div className="space-y-1.5">
              {report.rows.map((r) => (
                <div
                  key={r.planId}
                  className="flex items-center justify-between text-xs border rounded-md px-2.5 py-1.5"
                >
                  <span className="font-medium">{r.role}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      Bench depth: {r.benchDepth}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${r.nearestReady ? READINESS_TONE[r.nearestReady] : "bg-destructive/10 text-destructive border-destructive/20"}`}
                    >
                      {r.nearestReady
                        ? READINESS_LABEL[r.nearestReady]
                        : "No successor"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── 9-box grid ───────────────────────────────────────────────────

const NINE_BOX_PERFORMANCE: ("low" | "moderate" | "high")[] = [
  "high",
  "moderate",
  "low",
];
const NINE_BOX_POTENTIAL: SuccessorPotential[] = ["low", "medium", "high"];

function NineBoxDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: people = [], isLoading } = useQuery({
    queryKey: ["succession-nine-box"],
    queryFn: fetchSuccessionNineBox,
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>9-Box Talent Grid</DialogTitle>
          <DialogDescription>
            Every nominated successor plotted by performance (from their latest
            performance review) against potential.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <LoadingRow label="Loading…" />
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {NINE_BOX_PERFORMANCE.map((perf) =>
                NINE_BOX_POTENTIAL.map((pot) => {
                  const cellPeople = people.filter(
                    (p) => p.performance === perf && p.potential === pot,
                  );
                  return (
                    <div
                      key={`${perf}-${pot}`}
                      className="border rounded-md p-2 min-h-[90px]"
                    >
                      <p className="text-[9px] uppercase tracking-wide text-muted-foreground mb-1">
                        {pot} potential / {perf} performance
                      </p>
                      <div className="space-y-1">
                        {cellPeople.map((p) => (
                          <Badge
                            key={p.employeeId}
                            variant="outline"
                            className="text-[10px] block w-fit"
                          >
                            {p.employeeName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                }),
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
              <span>← Lower performance</span>
              <span>Higher performance →</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
// ─── Job Openings — record of roles within the organization ──

const JOB_TYPES: JobOpeningType[] = ["Full-time", "Part-time", "Contract"];
const JOB_STATUSES: JobOpeningStatus[] = ["Open", "Interviewing", "Filled"];

const jobStatusTone = (s: JobOpeningStatus) =>
  s === "Open"
    ? "bg-success/10 text-success border-success/20"
    : s === "Interviewing"
      ? "bg-info/10 text-info border-info/20"
      : "bg-muted text-muted-foreground border-border";

const teamDisplayName = (j: JobOpening) =>
  typeof j.teamId === "object" && j.teamId !== null ? j.teamId.name : "—";
const locationDisplayName = (j: JobOpening) =>
  typeof j.locationId === "object" && j.locationId !== null
    ? j.locationId.name
    : "—";
const teamIdOf = (j: JobOpening) =>
  typeof j.teamId === "object" && j.teamId !== null
    ? j.teamId._id
    : ((j.teamId as string | null) ?? "");
const locationIdOf = (j: JobOpening) =>
  typeof j.locationId === "object" && j.locationId !== null
    ? j.locationId._id
    : ((j.locationId as string | null) ?? "");

function JobOpeningCard({ job }: { job: JobOpening }) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const statusMutation = useMutation({
    mutationFn: (status: JobOpeningStatus) =>
      updateJobOpeningApi(job._id, { status }),
    onSuccess: (_updated, status) => {
      queryClient.invalidateQueries({ queryKey: ["job-openings"] });
      toast.success(
        status === "Filled"
          ? "Marked as filled — all employees have been notified."
          : `Status set to ${status}.`,
      );
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteJobOpeningApi(job._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-openings"] });
      toast.success("Opening deleted.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to delete opening"),
  });

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{job.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {locationDisplayName(job)} · {job.type} · {teamDisplayName(job)}
            </p>
          </div>
          <Select
            value={job.status}
            onValueChange={(v) => statusMutation.mutate(v as JobOpeningStatus)}
          >
            <SelectTrigger
              className={`h-7 w-[130px] text-xs px-2 ${jobStatusTone(job.status)}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JOB_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground line-clamp-2">
          {job.description}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {job.status === "Filled" && job.filledAt
              ? `Filled ${fmtDate(job.filledAt)}`
              : ""}
          </span>
          <span>Posted {fmtDate(job.postedDate)}</span>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1 border-t">
          <JobOpeningDialog
            job={job}
            trigger={
              <Button variant="ghost" size="sm">
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
        </div>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this opening?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove "{job.title}" from your job
                openings record.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMutation.mutate()}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function JobOpeningDialog({
  job,
  trigger,
}: {
  job?: JobOpening;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: teams = [] } = useQuery({
    queryKey: ["hr-teams"],
    queryFn: fetchTeams,
    enabled: open,
  });
  const { data: locations = [] } = useQuery({
    queryKey: ["hr-locations"],
    queryFn: fetchLocations,
    enabled: open,
  });

  const [form, setForm] = useState(() => ({
    title: job?.title ?? "",
    teamId: job ? teamIdOf(job) : "",
    locationId: job ? locationIdOf(job) : "",
    type: (job?.type ?? "Full-time") as JobOpeningType,
    description: job?.description ?? "",
  }));

  useEffect(() => {
    if (open && job) {
      setForm({
        title: job.title,
        teamId: teamIdOf(job),
        locationId: locationIdOf(job),
        type: job.type,
        description: job.description ?? "",
      });
    } else if (open && !job) {
      setForm({
        title: "",
        teamId: "",
        locationId: "",
        type: "Full-time",
        description: "",
      });
    }
  }, [open, job]);

  const isEdit = Boolean(job);
  const canSave = form.title.trim().length > 0;

  const createMutation = useMutation({
    mutationFn: () =>
      createJobOpening({
        title: form.title.trim(),
        teamId: form.teamId || undefined,
        locationId: form.locationId || undefined,
        type: form.type,
        description: form.description.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-openings"] });
      setOpen(false);
      toast.success("Opening created — all employees have been notified.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to create opening"),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateJobOpeningApi(job!._id, {
        title: form.title.trim(),
        teamId: form.teamId || undefined,
        locationId: form.locationId || undefined,
        type: form.type,
        description: form.description.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-openings"] });
      setOpen(false);
      toast.success("Opening updated.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to update opening"),
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSave = () => {
    if (!canSave) return;
    if (isEdit) updateMutation.mutate();
    else createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Opening" : "New Job Opening"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the role details."
              : "New openings start as Open. All employees are emailed as soon as this is created."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Job Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Senior Frontend Engineer"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Department (Team)</Label>
              <Select
                value={form.teamId}
                onValueChange={(v) => setForm({ ...form, teamId: v })}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      teams.length === 0 ? "No teams yet" : "Select team"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Location</Label>
              <Select
                value={form.locationId}
                onValueChange={(v) => setForm({ ...form, locationId: v })}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      locations.length === 0
                        ? "No locations yet"
                        : "Select location"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l._id} value={l._id}>
                      {l.name}
                      {l.city ? ` · ${l.city}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <Select
              value={form.type}
              onValueChange={(v) =>
                setForm({ ...form, type: v as JobOpeningType })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Short summary of the role…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!canSave || isSubmitting} onClick={handleSave}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {isEdit ? "Save Changes" : "Create Opening"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: any;
  icon: any;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div
          className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="p-10 text-center text-sm text-muted-foreground">
        {text}
      </CardContent>
    </Card>
  );
}
