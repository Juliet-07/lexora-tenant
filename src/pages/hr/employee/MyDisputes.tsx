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
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle2,
  Plus,
  Loader2,
  Scale,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchMyDisputeCases,
  fetchTeamDisputeCases,
  fetchDepartmentDisputeCases,
  openDisputeCaseAsEmployee,
  type DisputeCase,
  type DisputeType,
} from "@/lib/hr-dispute-api";
import { fetchMyDirectReports, type DirectReport } from "@/lib/hr-api";

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

function DisputeCard({
  dispute,
  onClick,
  showComplainant = false,
}: {
  dispute: DisputeCase;
  onClick: () => void;
  showComplainant?: boolean;
}) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-mono">
              {dispute.caseNumber}
            </p>
            <p className="text-sm font-semibold capitalize">{dispute.type}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={dispute.status} />
            <StageBadge stage={dispute.stage} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {dispute.description}
        </p>
        {showComplainant && dispute.complainant && (
          <p className="text-xs text-muted-foreground">
            Filed by:{" "}
            <span className="font-medium">
              {dispute.complainant.firstName} {dispute.complainant.lastName}
            </span>{" "}
            · {dispute.complainant.jobTitle}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground">
          Filed {new Date(dispute.filedAt).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}

// ── Log Dispute Dialog ────────────────────────────────────────────

interface LogDisputeDialogProps {
  open: boolean;
  onClose: () => void;
  hierarchyRole: string | null;
  onSubmit: (dto: {
    type: DisputeType;
    description: string;
    respondentId?: string;
    witnesses?: string[];
  }) => void;
  isSubmitting: boolean;
}

function LogDisputeDialog({
  open,
  onClose,
  hierarchyRole,
  onSubmit,
  isSubmitting,
}: LogDisputeDialogProps) {
  const [type, setType] = useState<DisputeType>("grievance");
  const [description, setDescription] = useState("");
  const [respondentId, setRespondentId] = useState("none");
  const [witnessInput, setWitnessInput] = useState("");
  const [witnesses, setWitnesses] = useState<string[]>([]);

  // Fetch direct reports for respondent selector (managers/HoD)
  const { data: directReports = [] } = useQuery({
    queryKey: ["my-direct-reports"],
    queryFn: fetchMyDirectReports,
    enabled:
      open &&
      (hierarchyRole === "manager" || hierarchyRole === "head_of_department"),
  });

  const canChooseType =
    hierarchyRole === "manager" || hierarchyRole === "head_of_department";

  const handleAddWitness = () => {
    const trimmed = witnessInput.trim();
    if (trimmed && !witnesses.includes(trimmed)) {
      setWitnesses((prev) => [...prev, trimmed]);
      setWitnessInput("");
    }
  };

  const handleRemoveWitness = (w: string) => {
    setWitnesses((prev) => prev.filter((x) => x !== w));
  };

  const handleSubmit = () => {
    if (!description.trim()) return;
    onSubmit({
      type,
      description: description.trim(),
      respondentId:
        respondentId && respondentId !== "none" ? respondentId : undefined,
      witnesses: witnesses.length > 0 ? witnesses : undefined,
    });
  };

  const handleClose = () => {
    setType("grievance");
    setDescription("");
    setRespondentId("");
    setWitnessInput("");
    setWitnesses([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log a Dispute</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Type selector — all roles for manager/HoD, grievance-only for regular */}
          <div className="space-y-1.5">
            <Label className="text-xs">Dispute Type</Label>
            {canChooseType ? (
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
                  <SelectItem value="disciplinary">Disciplinary</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground bg-muted/40">
                Grievance
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs">Description *</Label>
            <Textarea
              rows={4}
              placeholder="Describe the dispute in detail…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Respondent — only for manager/HoD with direct reports */}
          {canChooseType && directReports.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Respondent (optional)</Label>
              <Select value={respondentId} onValueChange={setRespondentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team member…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {directReports.map((r: DirectReport) => (
                    <SelectItem key={r._id} value={r._id}>
                      {r.firstName} {r.lastName} — {r.jobTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Witnesses */}
          <div className="space-y-1.5">
            <Label className="text-xs">Witnesses (optional)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Witness name…"
                value={witnessInput}
                onChange={(e) => setWitnessInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddWitness()}
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
                    onClick={() => handleRemoveWitness(w)}
                  >
                    {w} ×
                  </Badge>
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
            onClick={handleSubmit}
            disabled={!description.trim() || isSubmitting}
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
  const queryClient = useQueryClient();
  const [logOpen, setLogOpen] = useState(false);

  // Role-aware query
  const queryKey =
    hierarchyRole === "head_of_department"
      ? ["department-disputes"]
      : hierarchyRole === "manager"
        ? ["team-disputes"]
        : ["my-disputes"];

  const queryFn =
    hierarchyRole === "head_of_department"
      ? fetchDepartmentDisputeCases
      : hierarchyRole === "manager"
        ? fetchTeamDisputeCases
        : fetchMyDisputeCases;

  const { data: disputes = [], isLoading } = useQuery({
    queryKey,
    queryFn,
  });

  const openMutation = useMutation({
    mutationFn: openDisputeCaseAsEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setLogOpen(false);
      toast.success("Dispute case logged successfully.");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to log dispute"),
  });

  // Stats
  const total = disputes.length;
  const open = disputes.filter((d) => d.status === "open").length;
  const investigating = disputes.filter(
    (d) => d.status === "under_investigation",
  ).length;
  const resolved = disputes.filter((d) => d.status === "closed").length;

  const pageTitle =
    hierarchyRole === "head_of_department"
      ? "Department Disputes"
      : hierarchyRole === "manager"
        ? "Team Disputes"
        : "My Disputes";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="h-6 w-6" />
            {pageTitle}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {hierarchyRole === "regular"
              ? "Log and track your workplace disputes."
              : "Read-only view of disputes involving your team."}
          </p>
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
              {hierarchyRole === "regular"
                ? "You have no dispute cases on file."
                : "No dispute cases involving your team."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => (
            <DisputeCard
              key={d._id}
              dispute={d}
              onClick={() => {
                // Detail sheet can be added in a future pass
              }}
              showComplainant={
                hierarchyRole === "manager" ||
                hierarchyRole === "head_of_department"
              }
            />
          ))}
        </div>
      )}

      {/* Log Dispute Dialog */}
      <LogDisputeDialog
        open={logOpen}
        onClose={() => setLogOpen(false)}
        hierarchyRole={hierarchyRole}
        onSubmit={(dto) => openMutation.mutate(dto)}
        isSubmitting={openMutation.isPending}
      />
    </div>
  );
}
