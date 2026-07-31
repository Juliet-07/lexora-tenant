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
  fetchAudits,
  createAudit,
  setAuditStatus,
  addAuditRequest,
  setRequestStatus,
  addFinding,
  updateFinding,
  type AuditEngagement,
  type AuditType,
  type AuditFinding,
  type FindingSeverity,
  type RequestStatus,
} from "@/lib/grc/compliance-api";

const NEXT_LABEL: Record<string, string> = {
  Planned: "Start",
  "In Progress": "Move to reporting",
  Reporting: "Close",
};
const NEXT_STATUS: Record<string, string> = {
  Planned: "In Progress",
  "In Progress": "Reporting",
  Reporting: "Closed",
};

export default function GrcAudits() {
  const { data: audits = [], isLoading } = useQuery({
    queryKey: ["compliance-audits"],
    queryFn: fetchAudits,
  });
  const [newOpen, setNewOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = audits.find((a) => a._id === selectedId) ?? null;

  const allFindings = audits.flatMap((a) =>
    a.findings.map((f) => ({ ...f, audit: a.name })),
  );
  const openBySev = (
    ["Critical", "High", "Medium", "Low"] as FindingSeverity[]
  ).map((sev) => ({
    sev,
    count: allFindings.filter(
      (f) => f.severity === sev && f.status !== "Closed",
    ).length,
  }));

  if (isLoading)
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading audit engagements…
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Audit Management</h1>
          <p className="text-sm text-muted-foreground">
            Internal &amp; external audit engagements, findings, and
            remediation.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New engagement
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {openBySev.map((b) => (
          <Card key={b.sev}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">
                Open findings · {b.sev}
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
                <TableHead>Engagement</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Timeline</TableHead>
                <TableHead>Findings</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audits.map((a) => (
                <TableRow
                  key={a._id}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(a._id)}
                >
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>{a.type}</TableCell>
                  <TableCell className="text-xs">
                    {a.startDate.slice(0, 10)} → {a.endDate.slice(0, 10)}
                  </TableCell>
                  <TableCell>{a.findings.length}</TableCell>
                  <TableCell>{a.requests.length}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{a.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {audits.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-sm text-muted-foreground py-10"
                  >
                    No audit engagements yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NewAuditDialog open={newOpen} onOpenChange={setNewOpen} />
      {selected && (
        <AuditSheet audit={selected} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

function NewAuditDialog({ open, onOpenChange }: any) {
  const queryClient = useQueryClient();
  const [f, setF] = useState({
    name: "",
    type: "Internal" as AuditType,
    scope: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
  });

  const mutation = useMutation({
    mutationFn: () => createAudit(f),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-audits"] });
      toast({ title: "Engagement created" });
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast({
        title: "Failed to create engagement",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const submit = () => {
    if (!f.name)
      return toast({ title: "Name required", variant: "destructive" });
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New audit engagement</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select
              value={f.type}
              onValueChange={(v) => setF({ ...f, type: v as AuditType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Internal">Internal</SelectItem>
                <SelectItem value="External">External</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Start</Label>
              <Input
                type="date"
                value={f.startDate}
                onChange={(e) => setF({ ...f, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label>End</Label>
              <Input
                type="date"
                value={f.endDate}
                onChange={(e) => setF({ ...f, endDate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Scope</Label>
            <Textarea
              rows={3}
              value={f.scope}
              onChange={(e) => setF({ ...f, scope: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AuditSheet({
  audit,
  onClose,
}: {
  audit: AuditEngagement;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["compliance-audits"] });
  const statusMut = useMutation({
    mutationFn: (status: string) => setAuditStatus(audit._id, status as any),
    onSuccess: invalidate,
    onError: (err: any) =>
      toast({
        title: "Failed to update status",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{audit.name}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">{audit.type}</Badge>
            <Badge variant="outline">{audit.status}</Badge>
          </div>
          <div className="text-sm text-muted-foreground">{audit.scope}</div>
          <div className="flex gap-2 text-xs">
            <span>Start: {audit.startDate.slice(0, 10)}</span>
            <span>End: {audit.endDate.slice(0, 10)}</span>
          </div>

          {NEXT_STATUS[audit.status] && (
            <div className="flex gap-2">
              <Button
                variant={audit.status === "Reporting" ? "default" : "outline"}
                disabled={statusMut.isPending}
                onClick={() => statusMut.mutate(NEXT_STATUS[audit.status])}
              >
                {NEXT_LABEL[audit.status]}
              </Button>
            </div>
          )}

          <RequestsSection audit={audit} />
          <FindingsSection audit={audit} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function RequestsSection({ audit }: { audit: AuditEngagement }) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["compliance-audits"] });
  const [f, setF] = useState({
    description: "",
    assignedTo: "",
    dueDate: new Date().toISOString().slice(0, 10),
  });

  const addMut = useMutation({
    mutationFn: () => addAuditRequest(audit._id, f),
    onSuccess: () => {
      invalidate();
      setF({
        description: "",
        assignedTo: "",
        dueDate: new Date().toISOString().slice(0, 10),
      });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to add request",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });
  const statusMut = useMutation({
    mutationFn: ({ index, status }: { index: number; status: RequestStatus }) =>
      setRequestStatus(audit._id, index, status),
    onSuccess: invalidate,
  });

  return (
    <div className="border-t pt-3">
      <div className="font-medium text-sm mb-2">Document requests</div>
      <div className="space-y-1 mb-2">
        {audit.requests.map((r, i) => (
          <div
            key={i}
            className="border rounded p-2 text-sm flex justify-between items-center"
          >
            <div>
              <div>{r.description}</div>
              <div className="text-xs text-muted-foreground">
                {r.assignedTo} · due {r.dueDate.slice(0, 10)}
              </div>
            </div>
            <Select
              value={r.status}
              onValueChange={(v) =>
                statusMut.mutate({ index: i, status: v as RequestStatus })
              }
            >
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Requested", "Received", "Overdue"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Input
          placeholder="Description"
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
        />
        <Input
          placeholder="Assigned to"
          value={f.assignedTo}
          onChange={(e) => setF({ ...f, assignedTo: e.target.value })}
        />
        <div className="flex gap-1">
          <Input
            type="date"
            value={f.dueDate}
            onChange={(e) => setF({ ...f, dueDate: e.target.value })}
          />
          <Button
            size="sm"
            disabled={!f.description || addMut.isPending}
            onClick={() => addMut.mutate()}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}

function FindingsSection({ audit }: { audit: AuditEngagement }) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["compliance-audits"] });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<{
    observation: string;
    condition: string;
    criteria: string;
    cause: string;
    consequence: string;
    recommendation: string;
    severity: FindingSeverity;
  }>({
    observation: "",
    condition: "",
    criteria: "",
    cause: "",
    consequence: "",
    recommendation: "",
    severity: "Medium",
  });

  const addMut = useMutation({
    mutationFn: () => addFinding(audit._id, f),
    onSuccess: () => {
      invalidate();
      setF({
        observation: "",
        condition: "",
        criteria: "",
        cause: "",
        consequence: "",
        recommendation: "",
        severity: "Medium",
      });
      setOpen(false);
      toast({ title: "Finding added" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to add finding",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });
  const patchMut = useMutation({
    mutationFn: ({ index, patch }: { index: number; patch: any }) =>
      updateFinding(audit._id, index, patch),
    onSuccess: invalidate,
  });

  const submit = () => {
    if (!f.observation)
      return toast({ title: "Observation required", variant: "destructive" });
    addMut.mutate();
  };

  return (
    <div className="border-t pt-3">
      <div className="flex justify-between items-center mb-2">
        <div className="font-medium text-sm">Findings</div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Add finding
        </Button>
      </div>
      <div className="space-y-2">
        {audit.findings.map((fd, i) => (
          <div key={i} className="border rounded p-2 text-sm space-y-1">
            <div className="flex justify-between">
              <div className="font-medium">{fd.observation}</div>
              <div className="flex gap-1">
                <Badge variant="outline">{fd.severity}</Badge>
                <Badge variant="outline">{fd.status}</Badge>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              <b>Condition:</b> {fd.condition}
            </div>
            <div className="text-xs text-muted-foreground">
              <b>Criteria:</b> {fd.criteria}
            </div>
            <div className="text-xs text-muted-foreground">
              <b>Cause:</b> {fd.cause}
            </div>
            <div className="text-xs text-muted-foreground">
              <b>Consequence:</b> {fd.consequence}
            </div>
            <div className="text-xs text-muted-foreground">
              <b>Recommendation:</b> {fd.recommendation}
            </div>
            <div className="pt-2">
              <Label className="text-xs">Management response</Label>
              <Textarea
                rows={2}
                defaultValue={fd.managementResponse}
                onBlur={(e) =>
                  patchMut.mutate({
                    index: i,
                    patch: { managementResponse: e.target.value },
                  })
                }
              />
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label className="text-xs">Remediation due</Label>
                <Input
                  type="date"
                  defaultValue={fd.remediationDueDate?.slice(0, 10) ?? ""}
                  onBlur={(e) =>
                    e.target.value &&
                    patchMut.mutate({
                      index: i,
                      patch: { remediationDueDate: e.target.value },
                    })
                  }
                />
              </div>
              <Select
                value={fd.status}
                onValueChange={(v) =>
                  patchMut.mutate({ index: i, patch: { status: v } })
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Open", "In Progress", "Remediated", "Closed"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
        {audit.findings.length === 0 && (
          <div className="text-xs text-muted-foreground">No findings yet.</div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New finding</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {(
              [
                "observation",
                "condition",
                "criteria",
                "cause",
                "consequence",
                "recommendation",
              ] as const
            ).map((k) => (
              <div key={k}>
                <Label className="capitalize">{k}</Label>
                <Textarea
                  rows={2}
                  value={(f as any)[k]}
                  onChange={(e) => setF({ ...f, [k]: e.target.value })}
                />
              </div>
            ))}
            <div>
              <Label>Severity</Label>
              <Select
                value={f.severity}
                onValueChange={(v) =>
                  setF({ ...f, severity: v as FindingSeverity })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Critical", "High", "Medium", "Low"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={addMut.isPending}>
              {addMut.isPending ? "Adding…" : "Add finding"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
