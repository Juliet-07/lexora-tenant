import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchIncidents,
  createIncident,
  updateIncident,
  setIncidentStatus,
  closeIncident,
  INCIDENT_CATEGORIES,
  INCIDENT_SEVERITIES,
  type Incident,
  type IncidentCategory,
  type IncidentSeverity,
} from "@/lib/grc/risk-api";

export default function GrcIncidents() {
  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["grc-incidents"],
    queryFn: fetchIncidents,
  });
  const [newOpen, setNewOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedLive = selectedId
    ? (incidents.find((i) => i._id === selectedId) ?? null)
    : null;

  const bySeverity = INCIDENT_SEVERITIES.map((sev) => ({
    sev,
    count: incidents.filter((i) => i.severity === sev && i.status !== "Closed")
      .length,
  }));

  if (isLoading)
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading incidents…
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Incident Management</h1>
          <p className="text-sm text-muted-foreground">
            Security breaches, outages, compliance violations. HR personnel
            matters live in Disputes.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Log an incident
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {bySeverity.map((b) => (
          <Card key={b.sev}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">
                Open · {b.sev}
              </div>
              <div className="text-2xl font-bold">{b.count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Investigator</TableHead>
                <TableHead>Reported</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map((i) => (
                <TableRow
                  key={i._id}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(i._id)}
                >
                  <TableCell className="font-medium">{i.title}</TableCell>
                  <TableCell>{i.category}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        i.severity === "Critical"
                          ? "text-rose-600 border-rose-500/30"
                          : i.severity === "High"
                            ? "text-orange-600 border-orange-500/30"
                            : ""
                      }
                    >
                      {i.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>{i.investigator || "—"}</TableCell>
                  <TableCell className="text-xs">
                    {new Date(i.reportedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{i.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {incidents.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No incidents.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NewIncidentDialog open={newOpen} onOpenChange={setNewOpen} />
      {selectedLive && (
        <IncidentSheet
          incident={selectedLive}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function NewIncidentDialog({ open, onOpenChange }: any) {
  const queryClient = useQueryClient();
  const [f, setF] = useState({
    title: "",
    description: "",
    category: "Operational" as IncidentCategory,
    severity: "Medium" as IncidentSeverity,
  });

  const mutation = useMutation({
    mutationFn: () => createIncident(f),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-incidents"] });
      toast({ title: "Incident reported" });
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast({
        title: "Failed to report incident",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const submit = () => {
    if (!f.title.trim())
      return toast({ title: "Title required", variant: "destructive" });
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report an incident</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Category</Label>
              <Select
                value={f.category}
                onValueChange={(v) =>
                  setF({ ...f, category: v as IncidentCategory })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INCIDENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severity</Label>
              <Select
                value={f.severity}
                onValueChange={(v) =>
                  setF({ ...f, severity: v as IncidentSeverity })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INCIDENT_SEVERITIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "Submitting…" : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IncidentSheet({
  incident,
  onClose,
}: {
  incident: Incident;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["grc-incidents"] });

  const updateMut = useMutation({
    mutationFn: (patch: Parameters<typeof updateIncident>[1]) =>
      updateIncident(incident._id, patch),
    onSuccess: invalidate,
    onError: (err: any) =>
      toast({
        title: "Failed to save",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });
  const statusMut = useMutation({
    mutationFn: (status: "Investigating" | "Awaiting Sign-off") =>
      setIncidentStatus(incident._id, status),
    onSuccess: () => {
      invalidate();
      toast({ title: "Status updated" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to update status",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });
  const closeMut = useMutation({
    mutationFn: () => closeIncident(incident._id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Incident closed" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to close",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{incident.title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{incident.category}</Badge>
            <Badge variant="outline">{incident.severity}</Badge>
            <Badge variant="outline">{incident.status}</Badge>
          </div>
          <div>
            <Label>Description</Label>
            <div className="text-sm">{incident.description || "—"}</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Investigator</Label>
              <Input
                defaultValue={incident.investigator}
                onBlur={(e) =>
                  updateMut.mutate({ investigator: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Due date</Label>
              <Input
                type="date"
                defaultValue={incident.dueDate?.slice(0, 10) ?? ""}
                onBlur={(e) =>
                  e.target.value &&
                  updateMut.mutate({ dueDate: e.target.value })
                }
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="font-medium text-sm">Root cause analysis</div>
            <div>
              <Label>Method</Label>
              <Select
                value={incident.rcaMethod ?? "5 Whys"}
                onValueChange={(v) => updateMut.mutate({ rcaMethod: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["5 Whys", "Fishbone"].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>RCA notes</Label>
              <Textarea
                rows={3}
                defaultValue={incident.rcaNotes}
                onBlur={(e) => updateMut.mutate({ rcaNotes: e.target.value })}
              />
            </div>
            <div>
              <Label>Corrective actions (fix this instance)</Label>
              <Textarea
                rows={2}
                defaultValue={incident.correctiveActions}
                onBlur={(e) =>
                  updateMut.mutate({ correctiveActions: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Preventive actions (stop recurrence)</Label>
              <Textarea
                rows={2}
                defaultValue={incident.preventiveActions}
                onBlur={(e) =>
                  updateMut.mutate({ preventiveActions: e.target.value })
                }
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="font-medium text-sm">Closure</div>
            <div>
              <Label>Lessons learned</Label>
              <Textarea
                rows={2}
                defaultValue={incident.lessonsLearned}
                onBlur={(e) =>
                  updateMut.mutate({ lessonsLearned: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Sign-off by</Label>
              <Input
                defaultValue={incident.signOffBy}
                onBlur={(e) => updateMut.mutate({ signOffBy: e.target.value })}
              />
            </div>
            {incident.status !== "Closed" && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={statusMut.isPending}
                  onClick={() => statusMut.mutate("Investigating")}
                >
                  Set investigating
                </Button>
                <Button
                  variant="outline"
                  disabled={statusMut.isPending}
                  onClick={() => statusMut.mutate("Awaiting Sign-off")}
                >
                  Ready for sign-off
                </Button>
                <Button
                  disabled={closeMut.isPending}
                  onClick={() => {
                    if (!incident.signOffBy) {
                      toast({
                        title: "Sign-off name required before closing",
                        variant: "destructive",
                      });
                      return;
                    }
                    closeMut.mutate();
                  }}
                >
                  Close incident
                </Button>
              </div>
            )}
            {incident.status === "Closed" && (
              <p className="text-xs text-muted-foreground">
                Closed{" "}
                {incident.closedAt &&
                  new Date(incident.closedAt).toLocaleString()}{" "}
                by {incident.signOffBy}.
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
