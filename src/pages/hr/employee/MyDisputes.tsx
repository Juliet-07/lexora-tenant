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
  Paperclip,
  X,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchMyDisputeCases,
  fetchDisputesAgainstMe,
  fetchDepartmentDisputeCases,
  openDisputeCaseAsEmployee,
  attachEmployeeDisputeDocument,
  fetchEmployeeDirectory,
  type DisputeCase,
  type DisputeType,
  type GrievanceNature,
  type InjurySeverity,
  type OpenDisputePayload,
} from "@/lib/hr-dispute-api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// UI-only type — "report" and "disciplinary" both narrow to real
// backend DisputeType values the employee is actually allowed to
// file (disciplinary cases are opened by HR/managers against
// someone, never self-filed, so it's excluded from this picker).
type UiDisputeType = "grievance" | "report" | "incident";

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

// ── Employees-involved multi-select ───────────────────────────────

function InvolvedEmployeesPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: directory = [], isLoading } = useQuery({
    queryKey: ["employee-directory"],
    queryFn: fetchEmployeeDirectory,
  });

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

// ── Log Dispute Dialog ────────────────────────────────────────────

interface LogDisputeDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (dto: OpenDisputePayload) => void;
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
  const [respondentIds, setRespondentIds] = useState<string[]>([]);
  const [witnessInput, setWitnessInput] = useState("");
  const [witnesses, setWitnesses] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);

  // Grievance-specific
  const [nature, setNature] = useState<GrievanceNature | "">("");
  const [adverseEffect, setAdverseEffect] = useState("");
  const [informalSteps, setInformalSteps] = useState("");
  const [remedy, setRemedy] = useState("");

  // Incident-specific
  const [cause, setCause] = useState("");
  const [injuryLevel, setInjuryLevel] = useState<InjurySeverity>("no_injury");
  const [injuryNature, setInjuryNature] = useState("");
  const [medicalTreatment, setMedicalTreatment] = useState("");

  const reset = () => {
    setUiType("grievance");
    setDescription("");
    setRespondentIds([]);
    setWitnessInput("");
    setWitnesses([]);
    setAttachments([]);
    setNature("");
    setAdverseEffect("");
    setInformalSteps("");
    setRemedy("");
    setCause("");
    setInjuryLevel("no_injury");
    setInjuryNature("");
    setMedicalTreatment("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleAddWitness = () => {
    const trimmed = witnessInput.trim();
    if (trimmed && !witnesses.includes(trimmed)) {
      setWitnesses((prev) => [...prev, trimmed]);
      setWitnessInput("");
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setAttachments((prev) => [...prev, ...Array.from(files)]);
  };

  // Mirrors exactly what the backend DTO enforces, so we don't
  // submit something that's guaranteed to 400.
  const canSubmit = () => {
    if (isSubmitting) return false;
    if (!description.trim() || description.trim().length < 10) return false;

    if (uiType === "grievance") {
      return !!nature && !!adverseEffect.trim() && !!remedy.trim();
    }
    if (uiType === "incident") {
      const injuryDetailsOk =
        injuryLevel === "no_injury" ||
        (!!injuryNature.trim() && !!medicalTreatment.trim());
      return !!cause.trim() && injuryDetailsOk;
    }
    // report — only the base description is required
    return true;
  };

  const backendType: DisputeType = uiType; // "grievance" | "report" | "incident" all map 1:1 now

  const handleSubmit = () => {
    if (!canSubmit()) return;

    const payload: OpenDisputePayload = {
      type: backendType,
      description: description.trim(),
      respondentIds: respondentIds.length > 0 ? respondentIds : undefined,
      witnesses: witnesses.length > 0 ? witnesses : undefined,
      attachments: attachments.map((f) => ({
        name: f.name,
        url: `attachment://${encodeURIComponent(f.name)}`,
      })),
    };

    if (uiType === "grievance") {
      payload.natureOfGrievance = nature as GrievanceNature;
      payload.adverseEffect = adverseEffect.trim();
      payload.desiredOutcome = remedy.trim();
      if (informalSteps.trim())
        payload.informalResolutionSteps = informalSteps.trim();
    } else if (uiType === "incident") {
      payload.causeOfIncident = cause.trim();
      payload.injurySeverity = injuryLevel;
      if (injuryLevel !== "no_injury") {
        payload.natureOfInjury = injuryNature.trim();
        payload.medicalTreatmentProvided = medicalTreatment.trim();
      }
    } else if (uiType === "report" && adverseEffect.trim()) {
      payload.adverseEffect = adverseEffect.trim();
    }

    onSubmit(payload);
  };

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

          {/* Employees involved — real multi-select from the org directory */}
          <div className="space-y-1.5">
            <Label className="text-xs">Employees involved (optional)</Label>
            <InvolvedEmployeesPicker
              selected={respondentIds}
              onChange={setRespondentIds}
            />
          </div>

          {/* Short description */}
          <div className="space-y-1.5">
            <Label className="text-xs">Brief description *</Label>
            <Textarea
              rows={3}
              placeholder="Summarise what happened… (min. 10 characters)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Grievance-specific */}
          {uiType === "grievance" && (
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
                  What specific outcome or remedy are you seeking? *
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
                How has this adversely affected you? (optional)
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
                      Nature of injury and body part affected *
                    </Label>
                    <Input
                      value={injuryNature}
                      onChange={(e) => setInjuryNature(e.target.value)}
                      placeholder="e.g. Sprained left ankle"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Medical treatment provided / referral made *
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

          {/* Witnesses (free text — not org employees, e.g. external parties) */}
          <div className="space-y-1.5">
            <Label className="text-xs">Witnesses (optional)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Type a name and press Enter…"
                value={witnessInput}
                onChange={(e) => setWitnessInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddWitness();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddWitness}
              >
                Add
              </Button>
            </div>
            {witnesses.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {witnesses.map((w) => (
                  <Badge
                    key={w}
                    variant="outline"
                    className="text-xs cursor-pointer hover:bg-destructive/10"
                    onClick={() =>
                      setWitnesses((prev) => prev.filter((x) => x !== w))
                    }
                  >
                    {w} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

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
          <Button onClick={handleSubmit} disabled={!canSubmit()}>
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
    mutationFn: async (dto: OpenDisputePayload) => {
      const { attachments, ...rest } = dto;
      const created = await openDisputeCaseAsEmployee(rest);
      // Best-effort attach documents; ignore individual failures.
      for (const doc of attachments ?? []) {
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
    ? "Read-only view of every dispute logged across your department, including who raised it and the latest action taken. You can still log your own dispute using the button above."
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
        <Button onClick={() => setLogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Log a Dispute
        </Button>
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
                    <p className="text-sm font-semibold capitalize">{d.type}</p>
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
