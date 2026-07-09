import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle2,
  Plus,
  Loader2,
  Scale,
  Lock,
  Paperclip,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchMyDisputeCases,
  fetchDepartmentDisputeCases,
  openDisputeCaseAsEmployee,
  attachEmployeeDisputeDocument,
  type DisputeCase,
  type DisputeType,
} from "@/lib/hr-dispute-api";

// UI type extends backend DisputeType with a "report" sub-flow
// which is submitted as `grievance` with a `[REPORT]` tag in the description.
type UiDisputeType = "grievance" | "report" | "incident";

const GRIEVANCE_NATURES = [
  "Harassment or bullying",
  "Discrimination",
  "Unfair treatment",
  "Violation of policy",
  "Pay or benefits dispute",
  "Working conditions",
  "Health and safety",
  "Other",
] as const;

const INJURY_LEVELS = [
  { value: "none", label: "No injury" },
  { value: "minor", label: "Minor injury (first aid only)" },
  { value: "serious", label: "Serious injury (hospitalisation)" },
  { value: "fatality", label: "Fatality" },
] as const;

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
    <Badge
      variant="outline"
      className="text-[10px] text-muted-foreground capitalize"
    >
      {label}
    </Badge>
  );
}

function lastAction(d: DisputeCase): string {
  const history = d.stageHistory ?? [];
  const done = history.filter((h) => h.completedAt);
  const latest = done[done.length - 1] ?? history[history.length - 1];
  if (!latest) return "—";
  const when = latest.completedAt ?? latest.enteredAt;
  const label = latest.stage
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return `${label} · ${new Date(when).toLocaleDateString()}`;
}

// ── Log Dispute Dialog ────────────────────────────────────────────

export interface LogDisputeSubmission {
  type: DisputeType;
  description: string;
  witnesses?: string[];
  attachments: { name: string; url: string }[];
}

interface LogDisputeDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (dto: LogDisputeSubmission) => void;
  isSubmitting: boolean;
}

function LogDisputeDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: LogDisputeDialogProps) {
  const [uiType, setUiType] = useState<UiDisputeType>("grievance");

  // Common
  const [description, setDescription] = useState("");
  const [involvedInput, setInvolvedInput] = useState("");
  const [involved, setInvolved] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);

  // Grievance-specific
  const [nature, setNature] = useState<string>("");
  const [adverseEffect, setAdverseEffect] = useState("");
  const [informalSteps, setInformalSteps] = useState("");
  const [remedy, setRemedy] = useState("");

  // Incident-specific
  const [cause, setCause] = useState("");
  const [injuryLevel, setInjuryLevel] = useState<string>("none");
  const [injuryNature, setInjuryNature] = useState("");
  const [medicalTreatment, setMedicalTreatment] = useState("");

  const reset = () => {
    setUiType("grievance");
    setDescription("");
    setInvolvedInput("");
    setInvolved([]);
    setAttachments([]);
    setNature("");
    setAdverseEffect("");
    setInformalSteps("");
    setRemedy("");
    setCause("");
    setInjuryLevel("none");
    setInjuryNature("");
    setMedicalTreatment("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleAddInvolved = () => {
    const trimmed = involvedInput.trim();
    if (trimmed && !involved.includes(trimmed)) {
      setInvolved((prev) => [...prev, trimmed]);
      setInvolvedInput("");
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    setAttachments((prev) => [...prev, ...arr]);
  };

  const canSubmit = () => {
    if (isSubmitting) return false;
    if (!description.trim()) return false;
    if (uiType === "grievance") {
      return !!nature && !!adverseEffect.trim();
    }
    if (uiType === "incident") {
      return !!cause.trim() && !!injuryLevel;
    }
    // report
    return !!adverseEffect.trim();
  };

  const buildDescription = (): string => {
    const parts: string[] = [];
    const tag =
      uiType === "report"
        ? "[REPORT]"
        : uiType === "grievance"
          ? "[GRIEVANCE]"
          : "[INCIDENT]";
    parts.push(`${tag} ${description.trim()}`);

    if (involved.length > 0) {
      parts.push(`\nEmployees involved: ${involved.join(", ")}`);
    }

    if (uiType === "grievance") {
      parts.push(`\nNature of grievance: ${nature}`);
      parts.push(`\nHow this has adversely affected me:\n${adverseEffect.trim()}`);
      if (informalSteps.trim())
        parts.push(
          `\nSteps taken for informal resolution & outcome:\n${informalSteps.trim()}`,
        );
      if (remedy.trim())
        parts.push(`\nRemedy or outcome sought:\n${remedy.trim()}`);
    } else if (uiType === "incident") {
      parts.push(`\nCause of incident:\n${cause.trim()}`);
      const injuryLabel =
        INJURY_LEVELS.find((i) => i.value === injuryLevel)?.label ?? injuryLevel;
      parts.push(`\nInjury / medical treatment: ${injuryLabel}`);
      if (injuryNature.trim())
        parts.push(
          `\nNature of injury / body part affected: ${injuryNature.trim()}`,
        );
      if (medicalTreatment.trim())
        parts.push(
          `\nMedical treatment provided / referral:\n${medicalTreatment.trim()}`,
        );
    } else {
      parts.push(`\nHow this has adversely affected me:\n${adverseEffect.trim()}`);
    }

    if (attachments.length > 0) {
      parts.push(
        `\nAttachments: ${attachments.map((f) => f.name).join(", ")}`,
      );
    }

    return parts.join("\n");
  };

  const backendType: DisputeType =
    uiType === "incident" ? "incident" : "grievance";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log a Dispute</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-xs">Dispute Type *</Label>
            <Select
              value={uiType}
              onValueChange={(v) => setUiType(v as UiDisputeType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grievance">Grievance</SelectItem>
                <SelectItem value="report">Report</SelectItem>
                <SelectItem value="incident">Incident</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Employees involved */}
          <div className="space-y-1.5">
            <Label className="text-xs">Employees involved (optional)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Type a name and press Enter…"
                value={involvedInput}
                onChange={(e) => setInvolvedInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddInvolved();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddInvolved}
              >
                Add
              </Button>
            </div>
            {involved.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {involved.map((w) => (
                  <Badge
                    key={w}
                    variant="outline"
                    className="text-xs cursor-pointer hover:bg-destructive/10"
                    onClick={() =>
                      setInvolved((prev) => prev.filter((x) => x !== w))
                    }
                  >
                    {w} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Short description */}
          <div className="space-y-1.5">
            <Label className="text-xs">Brief description *</Label>
            <Textarea
              rows={3}
              placeholder="Summarise what happened…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Grievance-specific */}
          {uiType === "grievance" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Nature of grievance *</Label>
                <Select value={nature} onValueChange={setNature}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select nature…" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRIEVANCE_NATURES.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  How has this adversely affected you? *
                </Label>
                <Textarea
                  rows={3}
                  value={adverseEffect}
                  onChange={(e) => setAdverseEffect(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Steps taken for informal resolution and outcome (if any)
                </Label>
                <Textarea
                  rows={3}
                  value={informalSteps}
                  onChange={(e) => setInformalSteps(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  What specific outcome or remedy are you seeking?
                </Label>
                <Textarea
                  rows={2}
                  value={remedy}
                  onChange={(e) => setRemedy(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Report-specific */}
          {uiType === "report" && (
            <div className="space-y-1.5">
              <Label className="text-xs">
                How has this adversely affected you? *
              </Label>
              <Textarea
                rows={3}
                value={adverseEffect}
                onChange={(e) => setAdverseEffect(e.target.value)}
              />
            </div>
          )}

          {/* Incident-specific */}
          {uiType === "incident" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Cause of incident — what do you believe caused this? *
                </Label>
                <Textarea
                  rows={3}
                  value={cause}
                  onChange={(e) => setCause(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Injury / medical treatment *</Label>
                <Select value={injuryLevel} onValueChange={setInjuryLevel}>
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
              {injuryLevel !== "none" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Nature of injury and body part affected
                    </Label>
                    <Input
                      value={injuryNature}
                      onChange={(e) => setInjuryNature(e.target.value)}
                      placeholder="e.g. Sprained left ankle"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Medical treatment provided / referral made
                    </Label>
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

          {/* Attachments */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              Attach documents, screenshots or images (optional)
            </Label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs cursor-pointer hover:bg-muted">
                <Paperclip className="h-3.5 w-3.5" />
                Choose files
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              <span className="text-[11px] text-muted-foreground">
                {attachments.length} file
                {attachments.length === 1 ? "" : "s"} selected
              </span>
            </div>
            {attachments.length > 0 && (
              <div className="flex flex-col gap-1 pt-1">
                {attachments.map((f, idx) => (
                  <div
                    key={`${f.name}-${idx}`}
                    className="flex items-center justify-between text-xs bg-muted/40 rounded px-2 py-1"
                  >
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        setAttachments((prev) =>
                          prev.filter((_, i) => i !== idx),
                        )
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!canSubmit()) return;
              onSubmit({
                type: backendType,
                description: buildDescription(),
                witnesses: involved.length > 0 ? involved : undefined,
                attachments: attachments.map((f) => ({
                  name: f.name,
                  url: `attachment://${encodeURIComponent(f.name)}`,
                })),
              });
            }}
            disabled={!canSubmit()}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Submit"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



// ── Main page ─────────────────────────────────────────────────────

export default function MyDisputes() {
  const { user } = useAuth();
  const hierarchyRole = user?.hierarchyRole ?? "regular";
  const isHoD = hierarchyRole === "head_of_department";
  const queryClient = useQueryClient();
  const [logOpen, setLogOpen] = useState(false);

  // HoD → department-wide read-only view. Manager & regular → their own filings.
  const queryKey = isHoD ? ["department-disputes"] : ["my-disputes"];
  const queryFn = isHoD ? fetchDepartmentDisputeCases : fetchMyDisputeCases;

  const { data: disputes = [], isLoading } = useQuery({
    queryKey,
    queryFn,
  });

  const openMutation = useMutation({
    mutationFn: async (dto: LogDisputeSubmission) => {
      const created = await openDisputeCaseAsEmployee({
        type: dto.type,
        description: dto.description,
        witnesses: dto.witnesses,
      });
      // Best-effort attach documents; ignore individual failures.
      for (const doc of dto.attachments) {
        try {
          await attachEmployeeDisputeDocument(created._id, doc);
        } catch {
          /* keep going */
        }
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setLogOpen(false);
      toast.success("Dispute case logged successfully.");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to log dispute"),
  });

  const total = disputes.length;
  const open = disputes.filter((d) => d.status === "open").length;
  const investigating = disputes.filter(
    (d) => d.status === "under_investigation",
  ).length;
  const resolved = disputes.filter((d) => d.status === "closed").length;

  const pageTitle = isHoD ? "Department Disputes" : "My Disputes";
  const subtitle = isHoD
    ? "Read-only view of every dispute logged across your department, including who raised it and the latest action taken."
    : "Log and track your workplace disputes.";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="h-6 w-6" />
            {pageTitle}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
        {isHoD ? (
          <Button disabled variant="outline" title="HoDs cannot log disputes">
            <Lock className="h-4 w-4 mr-2" />
            Log a Dispute
          </Button>
        ) : (
          <Button onClick={() => setLogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Log a Dispute
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-info" />
            <div>
              <p className="text-2xl font-bold">{open}</p>
              <p className="text-xs text-muted-foreground">Open</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-warning" />
            <div>
              <p className="text-2xl font-bold">{investigating}</p>
              <p className="text-xs text-muted-foreground">Investigating</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <div>
              <p className="text-2xl font-bold">{resolved}</p>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading disputes…</span>
        </div>
      ) : disputes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Scale className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {isHoD
                ? "No dispute cases have been logged in your department."
                : "You have no dispute cases on file."}
            </p>
          </CardContent>
        </Card>
      ) : isHoD ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Logged by</TableHead>
                  <TableHead>Filed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Latest action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.map((d) => (
                  <TableRow key={d._id}>
                    <TableCell className="font-mono text-xs">
                      {d.caseNumber}
                    </TableCell>
                    <TableCell className="capitalize text-sm">
                      {d.type}
                    </TableCell>
                    <TableCell className="text-sm">
                      {d.complainant
                        ? `${d.complainant.firstName} ${d.complainant.lastName}`
                        : "—"}
                      {d.complainant?.jobTitle && (
                        <p className="text-[11px] text-muted-foreground">
                          {d.complainant.jobTitle}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(d.filedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={d.status} />
                        <StageBadge stage={d.stage} />
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {lastAction(d)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => (
            <Card key={d._id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-mono">
                      {d.caseNumber}
                    </p>
                    <p className="text-sm font-semibold capitalize">
                      {d.type}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={d.status} />
                    <StageBadge stage={d.stage} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {d.description}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Filed {new Date(d.filedAt).toLocaleDateString()} · Latest:{" "}
                  {lastAction(d)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <LogDisputeDialog
        open={logOpen}
        onClose={() => setLogOpen(false)}
        onSubmit={(dto) => openMutation.mutate(dto)}
        isSubmitting={openMutation.isPending}
      />
    </div>
  );
}
