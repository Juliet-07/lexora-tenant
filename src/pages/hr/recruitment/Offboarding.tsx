import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DocumentEditorDialog } from "@/components/DocumentEditorDialog";
import {
  Plus,
  CheckCircle,
  XCircle,
  Loader2,
  Mail,
  Award,
  Paperclip,
  FileText,
  FileSignature,
  Gavel,
  ClipboardList,
  Wallet,
  ShieldCheck,
  RotateCcw,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchEmployees,
  fetchDirectReportsOf,
  fetchEmployeesByHierarchyRole,
  terminateEmployee,
  type TerminateEmployeeDto,
} from "@/lib/hr/hr-api";
import {
  updateOffboarding,
  uploadOffboardingCertificate,
  sendOffboardingCertificate,
  generateOffboardingCertificate,
  saveOffboardingCertificateDraft,
  sendOffboardingCertificateContent,
  resolveOffboardingFileUrl,
  updateOffboardingFairnessChecklist,
  saveOffboardingNoticeDraft,
  sendOffboardingNotice,
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
  type OffboardingRecord,
  type TerminationCategory,
  type NoticeHandling,
} from "@/lib/hr/hr-recruitment-api";
import { useModule } from "@/contexts/ModuleContext";
import {
  OFFBOARDING_STATUS_TONE,
  TERMINATION_CATEGORIES,
  NOTICE_HANDLING_OPTIONS,
  fmtDate,
  fmtMoney,
  todayISO,
  LoadingRow,
  EmptyCard,
} from "./shared";

// ─── Offboarding tab content ───────────────────────────────────

export function OffboardingTab({
  offboarding,
  offboardingLoading,
  onOpenRecord,
  onNewOffboarding,
}: {
  offboarding: OffboardingRecord[];
  offboardingLoading: boolean;
  onOpenRecord: (record: OffboardingRecord) => void;
  onNewOffboarding: () => void;
}) {
  return (
    <TabsContent value="offboarding" className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground max-w-2xl">
          Every exit — resignation or termination — follows the full compliance
          workflow here: fairness checklist, notice, appeal window, exit
          interview, clearance, final pay and certificate of service.
          Terminating someone from their employee record sends them here
          automatically.
        </p>
        <Button
          size="sm"
          className="bg-gradient-to-r from-primary to-secondary"
          onClick={onNewOffboarding}
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
                onClick={() => onOpenRecord(o)}
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
  );
}

// ─── Small label/value row (used inside the Final Pay breakdown) ──

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

// ─── New Offboarding dialog ───────────────────────────────────
// Starts the real exit: calls the same terminateEmployee endpoint the
// employee record uses, which creates the OffboardingRecord server
// side. The full step workflow is then carried out in
// OffboardingDetailPanel below.

export function NewOffboardingDialog({
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

export function OffboardingDetailPanel({
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

  const [noticeDialogOpen, setNoticeDialogOpen] = useState(false);
  const saveNoticeDraftMutation = useMutation({
    mutationFn: (content: string) =>
      saveOffboardingNoticeDraft(o!._id, content),
    onSuccess: () => {
      invalidate();
      setNoticeDialogOpen(false);
      toast.success("Notice saved as a draft.");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to save draft"),
  });
  const sendNoticeMutation = useMutation({
    mutationFn: (content: string) =>
      sendOffboardingNotice(o!._id, content, noticeForm.noticeType),
    onSuccess: () => {
      invalidate();
      setNoticeDialogOpen(false);
      toast.success(
        `Notice emailed to ${o!.employeeName} — appeal window has opened.`,
      );
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to send notice"),
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
  const [includeThirteenthMonth, setIncludeThirteenthMonth] = useState(true);
  useEffect(() => {
    if (o?.finalPay) {
      setIncludeThirteenthMonth(o.finalPay.includeThirteenthMonth ?? true);
    }
  }, [o?._id]);
  const computeFinalPayMutation = useMutation({
    mutationFn: () =>
      computeOffboardingFinalPay(o!._id, includeThirteenthMonth),
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

  const [certificateDialogOpen, setCertificateDialogOpen] = useState(false);
  const saveCertificateDraftMutation = useMutation({
    mutationFn: (content: string) =>
      saveOffboardingCertificateDraft(o!._id, content),
    onSuccess: () => {
      invalidate();
      setCertificateDialogOpen(false);
      toast.success("Certificate saved as a draft.");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to save draft"),
  });
  const sendCertificateContentMutation = useMutation({
    mutationFn: (content: string) =>
      sendOffboardingCertificateContent(o!._id, content),
    onSuccess: () => {
      invalidate();
      setCertificateDialogOpen(false);
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
                  {o.noticeServed ? (
                    <div className="space-y-2">
                      <div className="rounded-md bg-success/10 border border-success/20 text-success text-sm p-2.5">
                        Served via {o.noticeMethod} on{" "}
                        {o.noticeServedAt ? fmtDate(o.noticeServedAt) : "—"}
                        {o.noticeType
                          ? ` — ${NOTICE_HANDLING_LABEL[o.noticeType]}`
                          : ""}
                      </div>
                      {o.noticeContent && (
                        <div
                          className="prose prose-sm max-w-none rounded-md border bg-muted/20 p-3 text-xs leading-relaxed max-h-56 overflow-y-auto"
                          dangerouslySetInnerHTML={{ __html: o.noticeContent }}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 border rounded-md p-3">
                      {!fairnessAllPass && (
                        <p className="text-xs text-warning">
                          Complete the fairness checklist above before sending
                          the notice.
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
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={!fairnessAllPass}
                        onClick={() => setNoticeDialogOpen(true)}
                      >
                        <FileSignature className="h-3.5 w-3.5 mr-1.5" />
                        {o.noticeContent
                          ? "Edit & send notice"
                          : "Compose notice"}
                      </Button>
                    </div>
                  )}

                  <DocumentEditorDialog
                    open={noticeDialogOpen}
                    title="Termination notice"
                    subtitle={`To ${o.employeeName}`}
                    value={o.noticeContent ?? ""}
                    onClose={() => setNoticeDialogOpen(false)}
                    onSave={(html) => saveNoticeDraftMutation.mutate(html)}
                    saving={saveNoticeDraftMutation.isPending}
                    onSend={(html) => sendNoticeMutation.mutate(html)}
                    sending={sendNoticeMutation.isPending}
                    sendLabel="Send notice"
                  />

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
                    period
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
                <>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="include-13th-month"
                      checked={includeThirteenthMonth}
                      onCheckedChange={(v) =>
                        setIncludeThirteenthMonth(v === true)
                      }
                    />
                    <Label
                      htmlFor="include-13th-month"
                      className="text-xs font-normal cursor-pointer"
                    >
                      Include 13th month / bonus payout (doesn't always apply)
                    </Label>
                  </div>
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
                </>
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
                  {o.finalPay.includeThirteenthMonth && (
                    <Row
                      label="13th month (pro-rata)"
                      value={fmtMoney(
                        o.finalPay.thirteenthMonthAmount,
                        o.finalPay.currency,
                      )}
                    />
                  )}
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
                  {!o.finalPay.approved && (
                    <div className="flex items-center gap-2 pb-1">
                      <Checkbox
                        id="include-13th-month-recompute"
                        checked={includeThirteenthMonth}
                        onCheckedChange={(v) =>
                          setIncludeThirteenthMonth(v === true)
                        }
                      />
                      <Label
                        htmlFor="include-13th-month-recompute"
                        className="text-xs font-normal cursor-pointer"
                      >
                        Include 13th month / bonus payout on recompute
                      </Label>
                    </div>
                  )}
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
                Write the certificate yourself and send it directly, or generate
                a draft / upload your own signed document to send as a file
                instead.
              </p>

              {o.certificateContent && (
                <div
                  className="prose prose-sm max-w-none rounded-md border bg-muted/20 p-3 text-xs leading-relaxed max-h-56 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: o.certificateContent }}
                />
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => setCertificateDialogOpen(true)}
                >
                  <FileSignature className="h-3.5 w-3.5 mr-1.5" />
                  {o.certificateContent
                    ? "Edit certificate"
                    : "Write certificate"}
                </Button>
                {o.certificateContent && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={sendCertificateContentMutation.isPending}
                    onClick={() =>
                      sendCertificateContentMutation.mutate(
                        o.certificateContent!,
                      )
                    }
                  >
                    {sendCertificateContentMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Mail className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {o.certificateOfServiceSentAt ? "Re-send" : "Send"}
                  </Button>
                )}
              </div>

              <DocumentEditorDialog
                open={certificateDialogOpen}
                title="Certificate of service"
                subtitle={`To ${o.employeeName}`}
                value={o.certificateContent ?? ""}
                onClose={() => setCertificateDialogOpen(false)}
                onSave={(html) => saveCertificateDraftMutation.mutate(html)}
                saving={saveCertificateDraftMutation.isPending}
                onSend={(html) => sendCertificateContentMutation.mutate(html)}
                sending={sendCertificateContentMutation.isPending}
                sendLabel="Send certificate"
              />

              <p className="text-xs text-muted-foreground font-medium pt-1">
                Or send a generated / uploaded file instead:
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
