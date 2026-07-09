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

interface LogDisputeDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (dto: {
    type: DisputeType;
    description: string;
    witnesses?: string[];
  }) => void;
  isSubmitting: boolean;
}

function LogDisputeDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: LogDisputeDialogProps) {
  const [type, setType] = useState<DisputeType>("grievance");
  const [description, setDescription] = useState("");
  const [witnessInput, setWitnessInput] = useState("");
  const [witnesses, setWitnesses] = useState<string[]>([]);

  const handleAddWitness = () => {
    const trimmed = witnessInput.trim();
    if (trimmed && !witnesses.includes(trimmed)) {
      setWitnesses((prev) => [...prev, trimmed]);
      setWitnessInput("");
    }
  };

  const handleClose = () => {
    setType("grievance");
    setDescription("");
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
          <div className="space-y-1.5">
            <Label className="text-xs">Dispute Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as DisputeType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grievance">Grievance</SelectItem>
                <SelectItem value="incident">Incident</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description *</Label>
            <Textarea
              rows={4}
              placeholder="Describe the dispute in detail…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!description.trim()) return;
              onSubmit({
                type,
                description: description.trim(),
                witnesses: witnesses.length > 0 ? witnesses : undefined,
              });
            }}
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
    mutationFn: openDisputeCaseAsEmployee,
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
