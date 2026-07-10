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
} from "lucide-react";
import { toast } from "sonner";
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
  type DisputeCase,
  type DisputeStatus,
  type DisputeType,
  type DisputeOutcomeDecision,
} from "@/lib/hr-dispute-api";

// ── helpers ──────────────────────────────────────────────────────

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

const fmtDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

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
  const [hearingVenue, setHearingVenue] = useState("");
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
        venue: hearingVenue,
        notes: hearingNotes || undefined,
      }),
    onSuccess: (u) => {
      handleSuccess(u, "Hearing scheduled.");
      setHearingDate("");
      setHearingVenue("");
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
    ["outcome_recorded", "appealed", "closed"].includes(status) &&
    status !== "escalated_external";

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
          {stage === "case_reported" && (
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
              <div className="space-y-1.5">
                <Label className="text-xs">Internal notes (optional)</Label>
                <Textarea
                  rows={2}
                  value={ackNotes}
                  onChange={(e) => setAckNotes(e.target.value)}
                />
              </div>
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
          )}

          {/* Investigate */}
          {stage === "acknowledge" && (
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
              <div className="space-y-1.5">
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea
                  rows={2}
                  value={findingsNotes}
                  onChange={(e) => setFindingsNotes(e.target.value)}
                />
              </div>
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
          )}

          {/* Schedule Hearing */}
          {stage === "investigate" && (
            <div className="rounded-md border p-4 space-y-3">
              <p className="text-sm font-semibold">Schedule Hearing</p>
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
                  <Label className="text-xs">Venue *</Label>
                  <Input
                    placeholder="Room / location…"
                    value={hearingVenue}
                    onChange={(e) => setHearingVenue(e.target.value)}
                  />
                </div>
              </div>
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
                  !hearingVenue.trim() ||
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
          )}

          {/* Record Outcome */}
          {stage === "hearing" && (
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
                    <SelectItem value="first_warning">First Warning</SelectItem>
                    <SelectItem value="second_warning">
                      Second Warning
                    </SelectItem>
                    <SelectItem value="final_warning">Final Warning</SelectItem>
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
          )}

          {/* Resolve Appeal */}
          {stage === "appeal" && dispute.appeal && !dispute.appeal.decision && (
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
          )}

          {/* Escalate Externally */}
          {canEscalate && (
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
          )}

          {/* Close Case */}
          {canClose && (
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
          )}

          {/* Attach Form */}
          {/* <div className="rounded-md border p-4 space-y-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Paperclip className="h-4 w-4" /> Attach Form
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Form Type</Label>
                <Select
                  value={formType}
                  onValueChange={(v) => setFormType(v as DisputeFormType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="D1">D1 — Formal Grievance</SelectItem>
                    <SelectItem value="D2">D2 — Warning Letter</SelectItem>
                    <SelectItem value="D3">D3 — Appeal Form</SelectItem>
                    <SelectItem value="D4">D4 — Hearing Notice</SelectItem>
                    <SelectItem value="E1">E1 — Incident Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Document URL (optional)</Label>
                <Input
                  placeholder="https://…"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                />
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={attachFormMutation.isPending}
              onClick={() => attachFormMutation.mutate()}
            >
              {attachFormMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Attach Form"
              )}
            </Button>
            {dispute.forms?.length > 0 && (
              <div className="space-y-1 pt-1">
                {dispute.forms.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <FileText className="h-3 w-3" />
                    <span className="font-medium">{f.formType}</span>
                    {f.attachmentUrl && (
                      <a
                        href={f.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        View
                      </a>
                    )}
                    <span>{fmtDate(f.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div> */}

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
              <div className="space-y-1 pt-1">
                {dispute.supportingDocs.map((doc, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <FileText className="h-3 w-3" />
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      {doc.name}
                    </a>
                    <span>{fmtDate(doc.uploadedAt)}</span>
                  </div>
                ))}
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
