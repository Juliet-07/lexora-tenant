import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  BCP_INCIDENT_TYPES,
  resolveBcpIncident,
  updateBcpIncident,
  type BcpIncident,
  type BcpIncidentSeverity,
} from "@/lib/grc/risk-api";
import { COMMS_KEY, errMessage } from "@/lib/grc/bcp-comms-api";
import { LEVELS, toLocalInput } from "./commsUi";
import { useEmployees } from "./dialogs";

const refresh = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["grc-bcp-incidents"] });
  qc.invalidateQueries({ queryKey: [COMMS_KEY] });
};

/** Raise or lower the level and update the facts that decide who must be told. */
export function EditIncidentDialog({
  incident,
  onClose,
}: {
  incident: BcpIncident | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const employees = useEmployees(!!incident);
  const [f, setF] = useState({
    title: "",
    description: "",
    severity: "L2" as BcpIncidentSeverity,
    type: "none",
    clientImpact: false,
    mediaInterest: false,
    spokesperson: "none",
    next: "",
  });
  useEffect(() => {
    if (!incident) return;
    setF({
      title: incident.title ?? "",
      description: incident.description,
      severity: incident.severity,
      type: incident.type || "none",
      clientImpact: !!incident.clientImpact,
      mediaInterest: !!incident.mediaInterest,
      spokesperson: incident.spokespersonEmployeeId || "none",
      next: incident.nextUpdateAt ? toLocalInput(incident.nextUpdateAt) : "",
    });
  }, [incident]);

  const save = useMutation({
    mutationFn: () =>
      updateBcpIncident(incident!._id, {
        title: f.title.trim(),
        description: f.description.trim(),
        severity: f.severity,
        type: f.type === "none" ? "" : f.type,
        clientImpact: f.clientImpact,
        mediaInterest: f.mediaInterest,
        spokespersonEmployeeId: f.spokesperson === "none" ? "" : f.spokesperson,
        nextUpdateAt: f.next ? new Date(f.next).toISOString() : "",
      }),
    onSuccess: () => {
      refresh(qc);
      toast({
        title: "Incident updated",
        description: "The notification plan has been recalculated.",
      });
      onClose();
    },
    onError: (e) => toast({ title: errMessage(e), variant: "destructive" }),
  });

  return (
    <Dialog open={!!incident} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Edit {incident?.code}</DialogTitle>
          <DialogDescription>
            Changing the level or type can bring more stakeholders into the
            plan. Approvers are alerted when that happens.
          </DialogDescription>
        </DialogHeader>
        <IncidentFields f={f} setF={setF} employees={employees} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!f.description.trim() || save.isPending}
            onClick={() => save.mutate()}
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type FieldState = {
  title: string;
  description: string;
  severity: BcpIncidentSeverity;
  type: string;
  clientImpact: boolean;
  mediaInterest: boolean;
  spokesperson: string;
  next: string;
};

function IncidentFields({
  f,
  setF,
  employees,
}: {
  f: FieldState;
  setF: React.Dispatch<React.SetStateAction<FieldState>>;
  employees: { _id: string; firstName: string; lastName: string }[];
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Title</Label>
        <Input
          value={f.title}
          onChange={(e) => setF((p) => ({ ...p, title: e.target.value }))}
          placeholder="Short name used in notices"
        />
      </div>
      <div>
        <Label>What happened?</Label>
        <Textarea
          rows={3}
          value={f.description}
          onChange={(e) => setF((p) => ({ ...p, description: e.target.value }))}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Level</Label>
          <Select
            value={f.severity}
            onValueChange={(v) =>
              setF((p) => ({ ...p, severity: v as BcpIncidentSeverity }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((l) => (
                <SelectItem key={l} value={`L${l}`}>
                  L{l}: {LEVELS[l].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Type</Label>
          <Select
            value={f.type}
            onValueChange={(v) => setF((p) => ({ ...p, type: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not classified</SelectItem>
              {BCP_INCIDENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={f.clientImpact}
            onCheckedChange={(v) => setF((p) => ({ ...p, clientImpact: !!v }))}
          />
          Clients are affected
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={f.mediaInterest}
            onCheckedChange={(v) => setF((p) => ({ ...p, mediaInterest: !!v }))}
          />
          Media or public interest
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Spokesperson</Label>
          <Select
            value={f.spokesperson}
            onValueChange={(v) => setF((p) => ({ ...p, spokesperson: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not assigned</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e._id} value={e._id}>
                  {e.firstName} {e.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Next update due</Label>
          <Input
            type="datetime-local"
            value={f.next}
            onChange={(e) => setF((p) => ({ ...p, next: e.target.value }))}
          />
        </div>
      </div>
    </div>
  );
}

/** Close an incident, with an optional note that goes into the record. */
export function ResolveIncidentDialog({
  incident,
  onClose,
}: {
  incident: BcpIncident | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  useEffect(() => {
    if (incident) setNote("");
  }, [incident]);
  const save = useMutation({
    mutationFn: () => resolveBcpIncident(incident!._id, note.trim()),
    onSuccess: () => {
      refresh(qc);
      toast({ title: `${incident?.code} resolved` });
      onClose();
    },
    onError: (e) => toast({ title: errMessage(e), variant: "destructive" }),
  });
  return (
    <Dialog open={!!incident} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark {incident?.code} resolved</DialogTitle>
          <DialogDescription>
            The incident and its stakeholder communications become read-only.
            You can then write the post-incident review.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label>Closure note (optional)</Label>
          <Textarea
            rows={3}
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="How was it resolved?"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            Mark resolved
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
