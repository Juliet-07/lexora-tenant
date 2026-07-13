import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle2,
  Scale,
  Loader2,
  ChevronRight,
  Paperclip,
  Upload,
  Plus,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog as LogDialog,
  DialogContent as LogDialogContent,
  DialogHeader as LogDialogHeader,
  DialogTitle as LogDialogTitle,
  DialogFooter as LogDialogFooter,
} from "@/components/ui/dialog";
import {
  fetchAllDisputeCases,
  acknowledgeDisputeCase,
  investigateDisputeCase,
  scheduleDisputeHearing,
  recordDisputeOutcome,
  resolveDisputeAppeal,
  escalateDisputeExternal,
  closeDisputeCase,
  attachDisputeDocument,
  openDisputeCase,
  resolveDisputeFileUrl,
  isImageFile,
  type DisputeCase,
  type DisputeStatus,
  type DisputeType,
  type DisputeOutcomeDecision,
  type GrievanceNature,
  type InjurySeverity,
  type OpenDisputePayload,
} from "@/lib/hr-dispute-api";
import { fetchEmployees } from "@/lib/hr-api";

// ── helpers ──────────────────────────────────────────────────────
const fmtDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const GRIEVANCE_NATURES: { value: GrievanceNature; label: string }[] = [
  { value: "harassment_or_bullying", label: "Harassment or bullying" },
  { value: "discrimination", label: "Discrimination" },
  { value: "unfair_treatment", label: "Unfair treatment" },
  { value: "violation_of_policy", label: "Violation of policy" },
  { value: "pay_or_benefits_dispute", label: "Pay or benefits dispute" },
  { value: "working_conditions", label: "Working conditions" },
  { value: "health_and_safety", label: "Health and safety" },
  { value: "others", label: "Other" },
];

const INJURY_LEVELS: { value: InjurySeverity; label: string }[] = [
  { value: "no_injury", label: "No injury" },
  { value: "minor_injury", label: "Minor injury (first aid only)" },
  { value: "serious_injury", label: "Serious injury (hospitalisation)" },
  { value: "fatality", label: "Fatality" },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    open: { label: "Open", className: "bg-info/10 text-info border-info/20" },
    under_investigation: {
      label: "Investigating",
      className: "bg-warning/10 text-warning border-warning/20",
    },
    hearing_scheduled: {
      label: "Hearing",
      className: "bg-secondary/10 text-secondary border-secondary/20",
    },
    outcome_recorded: {
      label: "Outcome",
      className: "bg-primary/10 text-primary border-primary/20",
    },
    appealed: {
      label: "Appealed",
      className: "bg-destructive/10 text-destructive border-destructive/20",
    },
    closed: {
      label: "Closed",
      className: "bg-success/10 text-success border-success/20",
    },
    escalated_external: {
      label: "Escalated",
      className: "bg-destructive/10 text-destructive border-destructive/20",
    },
  };
  const { label, className } = map[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={`text-[10px] ${className}`}>
      {label}
    </Badge>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const label = stage
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <Badge variant="outline" className="text-[10px] text-muted-foreground">
      {label}
    </Badge>
  );
}

function InvolvedEmployeesPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: directoryPage, isLoading } = useQuery({
    queryKey: ["hr-employees-for-dispute-picker"],
    queryFn: () => fetchEmployees({ limit: 500 }),
  });
  const directory = directoryPage?.items ?? [];
  const selectedEmployees = directory.filter((e) => selected.includes(e._id));

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );
  };

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {selected.length > 0
              ? `${selected.length} employee${selected.length === 1 ? "" : "s"} selected`
              : "Select employees…"}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder="Search employees…" />
            <CommandList>
              {isLoading ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Loading…
                </div>
              ) : (
                <>
                  <CommandEmpty>No employees found.</CommandEmpty>
                  <CommandGroup>
                    {directory.map((emp) => {
                      const isSelected = selected.includes(emp._id);
                      return (
                        <CommandItem
                          key={emp._id}
                          value={`${emp.firstName} ${emp.lastName}`}
                          onSelect={() => toggle(emp._id)}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${isSelected ? "opacity-100" : "opacity-0"}`}
                          />
                          <div className="flex flex-col">
                            <span>
                              {emp.firstName} {emp.lastName}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {emp.jobTitle}
                            </span>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedEmployees.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selectedEmployees.map((emp) => (
            <Badge
              key={emp._id}
              variant="outline"
              className="text-xs cursor-pointer hover:bg-destructive/10"
              onClick={() => toggle(emp._id)}
            >
              {emp.firstName} {emp.lastName} ×
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function LogDisputeAsTenantDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (dto: OpenDisputePayload, files: File[]) => void;
  isSubmitting: boolean;
}) {
  const [type, setType] = useState<DisputeType>("grievance");
  const [respondentIds, setRespondentIds] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [nature, setNature] = useState<GrievanceNature | "">("");
  const [adverseEffect, setAdverseEffect] = useState("");
  const [remedy, setRemedy] = useState("");
  const [cause, setCause] = useState("");
  const [injuryLevel, setInjuryLevel] = useState<InjurySeverity>("no_injury");
  const [injuryNature, setInjuryNature] = useState("");
  const [medicalTreatment, setMedicalTreatment] = useState("");

  const reset = () => {
    setType("grievance");
    setRespondentIds([]);
    setDescription("");
    setAttachments([]);
    setNature("");
    setAdverseEffect("");
    setRemedy("");
    setCause("");
    setInjuryLevel("no_injury");
    setInjuryNature("");
    setMedicalTreatment("");
  };

  const canSubmit = () => {
    if (isSubmitting) return false;
    if (respondentIds.length === 0) return false;
    if (description.trim().length < 10) return false;
    if (type === "grievance")
      return !!nature && !!adverseEffect.trim() && !!remedy.trim();
    if (type === "incident") {
      const injuryOk =
        injuryLevel === "no_injury" ||
        (!!injuryNature.trim() && !!medicalTreatment.trim());
      return !!cause.trim() && injuryOk;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!canSubmit()) return;
    const payload: OpenDisputePayload = {
      type,
      description: description.trim(),
      respondentIds,
    };
    if (type === "grievance") {
      payload.natureOfGrievance = nature as GrievanceNature;
      payload.adverseEffect = adverseEffect.trim();
      payload.desiredOutcome = remedy.trim();
    } else if (type === "incident") {
      payload.causeOfIncident = cause.trim();
      payload.injurySeverity = injuryLevel;
      if (injuryLevel !== "no_injury") {
        payload.natureOfInjury = injuryNature.trim();
        payload.medicalTreatmentProvided = medicalTreatment.trim();
      }
    }
    onSubmit(payload, attachments);
    reset();
  };

  return (
    <LogDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <LogDialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <LogDialogHeader>
          <LogDialogTitle>Log a Dispute</LogDialogTitle>
        </LogDialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Dispute Type *</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as DisputeType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grievance">Grievance</SelectItem>
                <SelectItem value="incident">Incident</SelectItem>
                <SelectItem value="report">Report</SelectItem>
                <SelectItem value="disciplinary">Disciplinary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Employees involved *</Label>
            <InvolvedEmployeesPicker
              selected={respondentIds}
              onChange={setRespondentIds}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description *</Label>
            <Textarea
              rows={3}
              placeholder="Summarise what happened… (min. 10 characters)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {type === "grievance" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Nature of grievance *</Label>
                <Select
                  value={nature}
                  onValueChange={(v) => setNature(v as GrievanceNature)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select nature…" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRIEVANCE_NATURES.map((n) => (
                      <SelectItem key={n.value} value={n.value}>
                        {n.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Adverse effect *</Label>
                <Textarea
                  rows={2}
                  value={adverseEffect}
                  onChange={(e) => setAdverseEffect(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Outcome or remedy sought *</Label>
                <Textarea
                  rows={2}
                  value={remedy}
                  onChange={(e) => setRemedy(e.target.value)}
                />
              </div>
            </>
          )}

          {type === "incident" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Cause of incident *</Label>
                <Textarea
                  rows={2}
                  value={cause}
                  onChange={(e) => setCause(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Injury / medical treatment *</Label>
                <Select
                  value={injuryLevel}
                  onValueChange={(v) => setInjuryLevel(v as InjurySeverity)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INJURY_LEVELS.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {injuryLevel !== "no_injury" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Nature of injury / body part *
                    </Label>
                    <Input
                      value={injuryNature}
                      onChange={(e) => setInjuryNature(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Medical treatment *</Label>
                    <Textarea
                      rows={2}
                      value={medicalTreatment}
                      onChange={(e) => setMedicalTreatment(e.target.value)}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* <div className="space-y-1.5">
            <Label className="text-xs">Attachments (optional)</Label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs cursor-pointer hover:bg-muted">
                <Paperclip className="h-3.5 w-3.5" />
                Choose files
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(e) => {
                    if (e.target.files)
                      setAttachments((prev) => [
                        ...prev,
                        ...Array.from(e.target.files!),
                      ]);
                    e.target.value = "";
                  }}
                />
              </label>
              <span className="text-[11px] text-muted-foreground">
                {attachments.length} file{attachments.length === 1 ? "" : "s"}
              </span>
            </div>
          </div> */}

          <div className="rounded-md bg-info/10 border border-info/20 text-info text-xs p-2">
            All employees involved will be emailed and can respond through their
            own dashboard as the case progresses.
          </div>
        </div>
        <LogDialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit()}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Submit"
            )}
          </Button>
        </LogDialogFooter>
      </LogDialogContent>
    </LogDialog>
  );
}
// ── DisputeDetailSheet ────────────────────────────────────────────

function DisputeDetailSheet({
  dispute,
  onClose,
  onUpdated,
}: {
  dispute: DisputeCase | null;
  onClose: () => void;
  onUpdated: (updated: DisputeCase) => void;
}) {
  // Action form state
  const [ackText, setAckText] = useState("");
  const [ackNotes, setAckNotes] = useState("");
  const [findings, setFindings] = useState("");
  const [findingsNotes, setFindingsNotes] = useState("");
  const [hearingDate, setHearingDate] = useState("");
  const [hearingMode, setHearingMode] = useState<"physical" | "online">("physical");
  const [hearingVenue, setHearingVenue] = useState("");
  const [hearingPlatform, setHearingPlatform] = useState<"google_meet" | "microsoft_teams" | "zoom">("zoom");
  const [hearingLink, setHearingLink] = useState("");
  const [hearingNotes, setHearingNotes] = useState("");
  const [outcomeDecision, setOutcomeDecision] =
    useState<DisputeOutcomeDecision>("no_action");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [appealDecision, setAppealDecision] = useState("");
  const [appealNotes, setAppealNotes] = useState("");
  const [escalateBody, setEscalateBody] = useState<
    "labour_local" | "labour_national" | "court"
  >("labour_local");
  const [escalateCaseRef, setEscalateCaseRef] = useState("");
  const [escalateNotes, setEscalateNotes] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);

  const handleSuccess = (updated: DisputeCase, msg: string) => {
    onUpdated(updated);
    toast.success(msg);
  };
  const handleError = (e: any) =>
    toast.error(e?.response?.data?.message ?? "Action failed");

  const ackMutation = useMutation({
    mutationFn: () =>
      acknowledgeDisputeCase(dispute!._id, {
        acknowledgmentText: ackText,
        notes: ackNotes || undefined,
      }),
    onSuccess: (u) => {
      handleSuccess(u, "Case acknowledged.");
      setAckText("");
      setAckNotes("");
    },
    onError: handleError,
  });

  const investigateMutation = useMutation({
    mutationFn: () =>
      investigateDisputeCase(dispute!._id, {
        findings,
        notes: findingsNotes || undefined,
      }),
    onSuccess: (u) => {
      handleSuccess(u, "Investigation recorded.");
      setFindings("");
      setFindingsNotes("");
    },
    onError: handleError,
  });

  const hearingMutation = useMutation({
    mutationFn: () =>
      scheduleDisputeHearing(dispute!._id, {
        scheduledAt: hearingDate,
        mode: hearingMode,
        venue: hearingMode === "physical" ? hearingVenue : undefined,
        meetingPlatform: hearingMode === "online" ? hearingPlatform : undefined,
        meetingLink: hearingMode === "online" ? hearingLink : undefined,
        notes: hearingNotes || undefined,
      }),
    onSuccess: (u) => {
      handleSuccess(u, "Hearing scheduled.");
      setHearingDate("");
      setHearingMode("physical");
      setHearingVenue("");
      setHearingPlatform("google_meet");
      setHearingLink("");
      setHearingNotes("");
    },
    onError: handleError,
  });

  const outcomeMutation = useMutation({
    mutationFn: () =>
      recordDisputeOutcome(dispute!._id, {
        decision: outcomeDecision,
        notes: outcomeNotes || undefined,
      }),
    onSuccess: (u) => {
      handleSuccess(u, "Outcome recorded.");
      setOutcomeNotes("");
    },
    onError: handleError,
  });

  const appealMutation = useMutation({
    mutationFn: () =>
      resolveDisputeAppeal(dispute!._id, {
        decision: appealDecision,
        notes: appealNotes || undefined,
      }),
    onSuccess: (u) => {
      handleSuccess(u, "Appeal resolved.");
      setAppealDecision("");
      setAppealNotes("");
    },
    onError: handleError,
  });

  const escalateMutation = useMutation({
    mutationFn: () =>
      escalateDisputeExternal(dispute!._id, {
        body: escalateBody,
        caseRef: escalateCaseRef || undefined,
        notes: escalateNotes || undefined,
      }),
    onSuccess: (u) => {
      handleSuccess(u, "Case escalated externally.");
      setEscalateCaseRef("");
      setEscalateNotes("");
    },
    onError: handleError,
  });

  const closeMutation = useMutation({
    mutationFn: () =>
      closeDisputeCase(dispute!._id, { notes: closeNotes || undefined }),
    onSuccess: (u) => {
      handleSuccess(u, "Case closed.");
      setCloseNotes("");
    },
    onError: handleError,
  });

  const attachDocMutation = useMutation({
    mutationFn: () => attachDisputeDocument(dispute!._id, docFile!),
    onSuccess: (u) => {
      handleSuccess(u, "Document attached.");
      setDocFile(null);
    },
    onError: handleError,
  });

  if (!dispute) return null;

  const stage = dispute.stage;
  const status = dispute.status;
  const canClose = status !== "closed";
  const canEscalate =
    ["outcome_recorded"].includes(status) && status !== "escalated_external";
  const locked = dispute.resolverLevel != "tenant";

  return (
    <Sheet open={!!dispute} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-muted-foreground">
              {dispute.caseNumber}
            </span>
            <span className="capitalize font-bold">{dispute.type}</span>
            <StatusBadge status={dispute.status} />
            <StageBadge stage={dispute.stage} />
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            Filed {fmtDate(dispute.filedAt)}
          </p>
        </SheetHeader>
        {/* Complainant details */}
        {dispute.complainant && (
          <div className="rounded-md bg-muted/40 p-3 space-y-1 text-xs">
            <p className="font-semibold uppercase tracking-wide text-muted-foreground text-[10px]">
              Filed By
            </p>
            <p className="font-medium text-sm">
              {dispute.complainant.firstName} {dispute.complainant.lastName}
            </p>
            <p className="text-muted-foreground">
              {dispute.complainant.jobTitle}
            </p>
            {dispute.complainant.department && (
              <p className="text-muted-foreground">
                Department: {dispute.complainant.department}
              </p>
            )}
            {dispute.complainant.managerName && (
              <p className="text-muted-foreground">
                Manager: {dispute.complainant.managerName}
              </p>
            )}
          </div>
        )}
        {locked && (
          <div className="rounded-md border border-warning/30 bg-warning/10 text-warning text-xs p-3 mb-4">
            This case is currently being handled by the employee's manager. You
            can follow its progress here, but you can't take action on it until
            the manager escalates it to HR.
          </div>
        )}
        <div className="space-y-6">
          {/* Description */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Description
            </p>
            <p className="text-sm">{dispute.description}</p>
            {dispute.witnesses?.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground">
                  Witnesses: {dispute.witnesses.join(", ")}
                </p>
              </div>
            )}
          </div>

          {/* Stage history */}
          {dispute.stageHistory?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Stage History
              </p>
              <div className="space-y-2">
                {dispute.stageHistory.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <ChevronRight className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <span className="font-medium capitalize">
                        {h.stage.replace(/_/g, " ")}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {fmtDate(h.enteredAt)}
                      </span>
                      {h.notes && (
                        <p className="text-muted-foreground mt-0.5">
                          {h.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hearing */}
          {dispute.hearing && (
            <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1">
              <p className="font-semibold uppercase tracking-wide text-muted-foreground">
                Hearing
              </p>
              <p>
                <span className="text-muted-foreground">When: </span>
                {new Date(dispute.hearing.scheduledAt).toLocaleString()}
              </p>
              {dispute.hearing.mode === "online" ? (
                <p>
                  <span className="text-muted-foreground">Format: </span>
                  Online —{" "}
                  {dispute.hearing.meetingPlatform === "google_meet"
                    ? "Google Meet"
                    : dispute.hearing.meetingPlatform === "microsoft_teams"
                      ? "Microsoft Teams"
                      : "Zoom"}
                </p>
              ) : (
                <p>
                  <span className="text-muted-foreground">Format: </span>
                  In person — {dispute.hearing.venue}
                </p>
              )}
              {dispute.hearing.notes && (
                <p className="text-muted-foreground">{dispute.hearing.notes}</p>
              )}
            </div>
          )}

          {/* Respondent response */}
          {dispute.respondentResponses &&
            dispute.respondentResponses.length > 0 && (
              <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1">
                <p className="font-semibold uppercase tracking-wide text-muted-foreground">
                  Response from respondent
                </p>
                {dispute.respondentResponses.map((r, i) => (
                  <div key={i} className="pt-1">
                    {r.respondent && (
                      <p className="text-muted-foreground">
                        {r.respondent.firstName} {r.respondent.lastName} ·{" "}
                        {new Date(r.respondedAt).toLocaleString()}
                      </p>
                    )}
                    <p>{r.text}</p>
                  </div>
                ))}
              </div>
            )}

          {/* Outcome */}
          {dispute.outcome && (
            <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1">
              <p className="font-semibold uppercase tracking-wide text-muted-foreground">
                Outcome
              </p>
              <p className="capitalize font-medium">
                {dispute.outcome.decision.replace(/_/g, " ")}
              </p>
              {dispute.outcome.notes && (
                <p className="text-muted-foreground">{dispute.outcome.notes}</p>
              )}
              <p className="text-muted-foreground">
                Recorded {fmtDate(dispute.outcome.recordedAt)}
              </p>
            </div>
          )}

          {/* Appeal */}
          {dispute.appeal && (
            <div className="rounded-md bg-warning/10 border border-warning/20 p-3 text-xs space-y-1">
              <p className="font-semibold uppercase tracking-wide text-warning">
                Appeal Filed
              </p>
              <p>{dispute.appeal.grounds}</p>
              <p className="text-muted-foreground">
                Filed {fmtDate(dispute.appeal.filedAt)}
              </p>
              {dispute.appeal.decision && (
                <p className="font-medium">
                  Decision: {dispute.appeal.decision}
                </p>
              )}
            </div>
          )}

          {/* External escalation */}
          {dispute.externalEscalation && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs space-y-1">
              <p className="font-semibold uppercase tracking-wide text-destructive">
                External Escalation
              </p>
              <p className="capitalize">
                {dispute.externalEscalation.body.replace(/_/g, " ")}
              </p>
              {dispute.externalEscalation.caseRef && (
                <p>Ref: {dispute.externalEscalation.caseRef}</p>
              )}
              <p className="text-muted-foreground">
                Referred {fmtDate(dispute.externalEscalation.referredAt)}
              </p>
            </div>
          )}

          {/* ── ACTION SECTIONS ── */}

          {/* Acknowledge */}
          {stage === "case_reported" && dispute.complainant && (
            <fieldset
              disabled={locked}
              className={`rounded-md border p-4 space-y-3 ${locked ? "opacity-60" : ""}`}
            >
              <div className="rounded-md border p-4 space-y-3">
                <p className="text-sm font-semibold">Acknowledge Case</p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Acknowledgment text *</Label>
                  <Textarea
                    rows={3}
                    placeholder="Written acknowledgment to complainant…"
                    value={ackText}
                    onChange={(e) => setAckText(e.target.value)}
                  />
                </div>
                {/* <div className="space-y-1.5">
                  <Label className="text-xs">Internal notes (optional)</Label>
                  <Textarea
                    rows={2}
                    value={ackNotes}
                    onChange={(e) => setAckNotes(e.target.value)}
                  />
                </div> */}
                <Button
                  size="sm"
                  disabled={!ackText.trim() || ackMutation.isPending}
                  onClick={() => ackMutation.mutate()}
                >
                  {ackMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Acknowledge"
                  )}
                </Button>
              </div>
            </fieldset>
          )}

          {/* Investigate */}
          {(stage === "acknowledge" ||
            (stage === "case_reported" && !dispute.complainant)) && (
            <fieldset
              disabled={locked}
              className={`rounded-md border p-4 space-y-3 ${locked ? "opacity-60" : ""}`}
            >
              <div className="rounded-md border p-4 space-y-3">
                <p className="text-sm font-semibold">
                  Record Investigation Findings
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Findings *</Label>
                  <Textarea
                    rows={4}
                    placeholder="Summary of investigation findings…"
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                  />
                </div>
                {/* <div className="space-y-1.5">
                  <Label className="text-xs">Notes (optional)</Label>
                  <Textarea
                    rows={2}
                    value={findingsNotes}
                    onChange={(e) => setFindingsNotes(e.target.value)}
                  />
                </div> */}
                <Button
                  size="sm"
                  disabled={!findings.trim() || investigateMutation.isPending}
                  onClick={() => investigateMutation.mutate()}
                >
                  {investigateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Submit Findings"
                  )}
                </Button>
              </div>
            </fieldset>
          )}

          {/* Schedule Hearing */}
          {(stage === "hearing" ||
            (dispute.type === "incident" && stage === "investigate")) && (
            <fieldset
              disabled={locked}
              className={`rounded-md border p-4 space-y-3 ${locked ? "opacity-60" : ""}`}
            >
              <div className="rounded-md border p-4 space-y-3">
                <p className="text-sm font-semibold">Schedule Hearing</p>
                <p className="text-xs text-muted-foreground">
                  Both the employee who filed and everyone named will be emailed
                  automatically.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Date & Time *</Label>
                    <Input
                      type="datetime-local"
                      value={hearingDate}
                      onChange={(e) => setHearingDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Format *</Label>
                    <Select
                      value={hearingMode}
                      onValueChange={(v) =>
                        setHearingMode(v as "physical" | "online")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="physical">In person</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {hearingMode === "physical" ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Venue *</Label>
                    <Input
                      placeholder="Room / location…"
                      value={hearingVenue}
                      onChange={(e) => setHearingVenue(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Platform *</Label>
                      <Select
                        value={hearingPlatform}
                        onValueChange={(v) =>
                          setHearingPlatform(
                            v as "google_meet" | "microsoft_teams" | "zoom",
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="google_meet">
                            Google Meet
                          </SelectItem>
                          <SelectItem value="microsoft_teams">
                            Microsoft Teams
                          </SelectItem>
                          <SelectItem value="zoom">Zoom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Meeting link *</Label>
                      <Input
                        placeholder="https://…"
                        value={hearingLink}
                        onChange={(e) => setHearingLink(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs">Notes (optional)</Label>
                  <Textarea
                    rows={2}
                    value={hearingNotes}
                    onChange={(e) => setHearingNotes(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  disabled={
                    !hearingDate ||
                    (hearingMode === "physical"
                      ? !hearingVenue.trim()
                      : !hearingLink.trim()) ||
                    hearingMutation.isPending
                  }
                  onClick={() => hearingMutation.mutate()}
                >
                  {hearingMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Schedule Hearing"
                  )}
                </Button>
              </div>
            </fieldset>
          )}

          {/* Record Outcome */}
          {/* Record Outcome */}
          {(stage === "hearing" ||
            (dispute.type === "incident" && stage === "investigate")) && (
            <fieldset
              disabled={locked}
              className={`rounded-md border p-4 space-y-3 ${locked ? "opacity-60" : ""}`}
            >
              <div className="rounded-md border p-4 space-y-3">
                <p className="text-sm font-semibold">Record Outcome</p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Decision *</Label>
                  <Select
                    value={outcomeDecision}
                    onValueChange={(v) =>
                      setOutcomeDecision(v as DisputeOutcomeDecision)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first_warning">
                        First Warning
                      </SelectItem>
                      <SelectItem value="second_warning">
                        Second Warning
                      </SelectItem>
                      <SelectItem value="final_warning">
                        Final Warning
                      </SelectItem>
                      <SelectItem value="suspension">Suspension</SelectItem>
                      <SelectItem value="termination">Termination</SelectItem>
                      <SelectItem value="grievance_resolved">
                        Grievance Resolved
                      </SelectItem>
                      <SelectItem value="no_action">No Action</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Notes (optional)</Label>
                  <Textarea
                    rows={3}
                    value={outcomeNotes}
                    onChange={(e) => setOutcomeNotes(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  disabled={outcomeMutation.isPending}
                  onClick={() => outcomeMutation.mutate()}
                >
                  {outcomeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Record Outcome"
                  )}
                </Button>
              </div>
            </fieldset>
          )}

          {/* Resolve Appeal */}
          {stage === "appeal" && dispute.appeal && !dispute.appeal.decision && (
            <fieldset
              disabled={locked}
              className={`rounded-md border p-4 space-y-3 ${locked ? "opacity-60" : ""}`}
            >
              <div className="rounded-md border p-4 space-y-3">
                <p className="text-sm font-semibold">Resolve Appeal</p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Decision *</Label>
                  <Input
                    placeholder="e.g. Appeal upheld, Warning reduced…"
                    value={appealDecision}
                    onChange={(e) => setAppealDecision(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Notes (optional)</Label>
                  <Textarea
                    rows={2}
                    value={appealNotes}
                    onChange={(e) => setAppealNotes(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  disabled={!appealDecision.trim() || appealMutation.isPending}
                  onClick={() => appealMutation.mutate()}
                >
                  {appealMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Resolve Appeal"
                  )}
                </Button>
              </div>
            </fieldset>
          )}

          {/* Escalate Externally */}
          {canEscalate && (
            <fieldset
              disabled={locked}
              className={`rounded-md border p-4 space-y-3 ${locked ? "opacity-60" : ""}`}
            >
              <div className="rounded-md border border-destructive/20 p-4 space-y-3">
                <p className="text-sm font-semibold text-destructive">
                  Escalate to External Body
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Body *</Label>
                  <Select
                    value={escalateBody}
                    onValueChange={(v) =>
                      setEscalateBody(v as typeof escalateBody)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="labour_local">
                        Local Labour Inspectorate
                      </SelectItem>
                      <SelectItem value="labour_national">
                        National Labour Inspectorate
                      </SelectItem>
                      <SelectItem value="court">Court</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    External case reference (optional)
                  </Label>
                  <Input
                    placeholder="REF-2026-001…"
                    value={escalateCaseRef}
                    onChange={(e) => setEscalateCaseRef(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Notes (optional)</Label>
                  <Textarea
                    rows={2}
                    value={escalateNotes}
                    onChange={(e) => setEscalateNotes(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={escalateMutation.isPending}
                  onClick={() => escalateMutation.mutate()}
                >
                  {escalateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Escalate Externally"
                  )}
                </Button>
              </div>
            </fieldset>
          )}

          {/* Close Case */}
          {canClose && (
            <fieldset
              disabled={locked}
              className={`rounded-md border p-4 space-y-3 ${locked ? "opacity-60" : ""}`}
            >
              <div className="rounded-md border p-4 space-y-3">
                <p className="text-sm font-semibold">Close Case</p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Closing notes (optional)</Label>
                  <Textarea
                    rows={2}
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={closeMutation.isPending}
                  onClick={() => closeMutation.mutate()}
                >
                  {closeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Close Case"
                  )}
                </Button>
              </div>
            </fieldset>
          )}

          {/* Supporting Documents */}
          <div className="rounded-md border p-4 space-y-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Upload className="h-4 w-4" /> Supporting Documents
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Choose file *</Label>
              <Input
                type="file"
                onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
              />
              {docFile && (
                <p className="text-[11px] text-muted-foreground">
                  {docFile.name}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={!docFile || attachDocMutation.isPending}
              onClick={() => attachDocMutation.mutate()}
            >
              {attachDocMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Attach Document"
              )}
            </Button>
            {dispute.supportingDocs?.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {dispute.supportingDocs.map((doc, i) =>
                  isImageFile(doc.name) ? (
                    <a
                      key={i}
                      href={resolveDisputeFileUrl(doc.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="block"
                    >
                      <img
                        src={resolveDisputeFileUrl(doc.url)}
                        alt={doc.name}
                        className="h-20 w-20 object-cover rounded-md border"
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
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main page ─────────────────────────────────────────────────────

const TAB_STATUS_MAP: Record<string, DisputeStatus | undefined> = {
  all: undefined,
  open: "open",
  investigating: "under_investigation",
  hearing: "hearing_scheduled",
  closed: "closed",
};

export default function HRDisputes() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [typeFilter, setTypeFilter] = useState<DisputeType | "all">("all");
  const [selected, setSelected] = useState<DisputeCase | null>(null);
  const [logOpen, setLogOpen] = useState(false);

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ["hr-disputes", activeTab],
    queryFn: () =>
      fetchAllDisputeCases(
        TAB_STATUS_MAP[activeTab]
          ? { status: TAB_STATUS_MAP[activeTab] }
          : undefined,
      ),
  });

  const filtered = useMemo(
    () =>
      typeFilter === "all"
        ? disputes
        : disputes.filter((d) => d.type === typeFilter),
    [disputes, typeFilter],
  );

  const total = disputes.length;
  const open = disputes.filter((d) => d.status === "open").length;
  const investigating = disputes.filter(
    (d) => d.status === "under_investigation",
  ).length;
  const resolved = disputes.filter((d) => d.status === "closed").length;

  const handleUpdated = (updated: DisputeCase) => {
    setSelected(updated);
    queryClient.invalidateQueries({ queryKey: ["hr-disputes"] });
  };

  const logMutation = useMutation({
    mutationFn: async ({
      dto,
      files,
    }: {
      dto: OpenDisputePayload;
      files: File[];
    }) => {
      const created = await openDisputeCase(dto as any);

      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-disputes"] });
      setLogOpen(false);
      toast.success("Dispute logged — everyone involved has been notified.");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to log dispute"),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="h-6 w-6" /> Dispute Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage internal grievances, disciplinary cases, and external
            escalations.
          </p>
        </div>
        <Button onClick={() => setLogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Log a Dispute
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <DisputeStat
          label="Total"
          value={total}
          icon={FileText}
          tone="from-primary to-secondary"
        />
        <DisputeStat
          label="Open"
          value={open}
          icon={AlertTriangle}
          tone="from-blue-500 to-cyan-500"
        />
        <DisputeStat
          label="Investigating"
          value={investigating}
          icon={Clock}
          tone="from-amber-500 to-orange-500"
        />
        <DisputeStat
          label="Resolved"
          value={resolved}
          icon={CheckCircle2}
          tone="from-emerald-500 to-teal-500"
        />
      </div>

      {/* Filters + Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="w-full flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="investigating">Investigating</TabsTrigger>
            <TabsTrigger value="hearing">Hearing</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-3 flex-wrap">
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="grievance">Grievance</SelectItem>
                <SelectItem value="disciplinary">Disciplinary</SelectItem>
                <SelectItem value="incident">Incident</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {["all", "open", "investigating", "hearing", "closed"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading cases…</span>
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Scale className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No dispute cases found.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filtered.map((d) => (
                  <Card
                    key={d._id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelected(d)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground font-mono">
                            {d.caseNumber}
                          </p>
                          <p className="text-sm font-semibold capitalize">
                            {d.type}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {d.description}
                          </p>
                          {d.complainant && (
                            <p className="text-xs text-muted-foreground">
                              Filed by:{" "}
                              <span className="font-medium text-foreground">
                                {d.complainant.firstName}{" "}
                                {d.complainant.lastName}
                              </span>
                              {d.complainant.department &&
                                ` · ${d.complainant.department}`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                          <StatusBadge status={d.status} />
                          <StageBadge stage={d.stage} />
                          <span className="text-xs text-muted-foreground">
                            {fmtDate(d.filedAt)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Detail sheet */}
      <DisputeDetailSheet
        dispute={selected}
        onClose={() => setSelected(null)}
        onUpdated={handleUpdated}
      />

      <LogDisputeAsTenantDialog
        open={logOpen}
        onClose={() => setLogOpen(false)}
        onSubmit={(dto, files) => logMutation.mutate({ dto, files })}
        isSubmitting={logMutation.isPending}
      />
    </div>
  );
}

function DisputeStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
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
          className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center shadow-md`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
      </CardContent>
    </Card>
  );
}
