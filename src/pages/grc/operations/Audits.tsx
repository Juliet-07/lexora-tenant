import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useGrc, mutateGrc, id, AuditEngagement, AuditFinding, AuditRequest,
} from "@/lib/grcStore";

export default function GrcAudits() {
  const s = useGrc();
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<AuditEngagement | null>(null);

  const allFindings = s.audits.flatMap((a) => a.findings.map((f) => ({ ...f, audit: a.name })));
  const openBySev = ["Critical","High","Medium","Low"].map((sev) => ({
    sev, count: allFindings.filter((f) => f.severity === sev && f.status !== "Closed").length,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Audit Management</h1>
          <p className="text-sm text-muted-foreground">Internal & external audit engagements, findings, and remediation.</p>
        </div>
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" />New engagement</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {openBySev.map((b) => (
          <Card key={b.sev}><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Open findings · {b.sev}</div>
            <div className="text-2xl font-bold">{b.count}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow>
          <TableHead>Engagement</TableHead><TableHead>Type</TableHead><TableHead>Timeline</TableHead><TableHead>Findings</TableHead><TableHead>Requests</TableHead><TableHead>Status</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {s.audits.map((a) => (
            <TableRow key={a.id} className="cursor-pointer" onClick={() => setSelected(a)}>
              <TableCell className="font-medium">{a.name}</TableCell>
              <TableCell>{a.type}</TableCell>
              <TableCell className="text-xs">{a.startDate} → {a.endDate}</TableCell>
              <TableCell>{a.findings.length}</TableCell>
              <TableCell>{a.requests.length}</TableCell>
              <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></CardContent></Card>

      <NewAuditDialog open={newOpen} onOpenChange={setNewOpen} />
      <AuditSheet audit={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function NewAuditDialog({ open, onOpenChange }: any) {
  const [f, setF] = useState({ name: "", type: "Internal" as "Internal" | "External", scope: "", startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10) });
  const submit = () => {
    if (!f.name) return toast({ title: "Name required", variant: "destructive" });
    mutateGrc((s) => ({ ...s, audits: [{ id: id("aud"), ...f, status: "Planned", requests: [], findings: [] }, ...s.audits] }));
    toast({ title: "Engagement created" }); onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New audit engagement</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Type</Label>
              <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v as any })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Internal">Internal</SelectItem><SelectItem value="External">External</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Start</Label><Input type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></div>
            <div><Label>End</Label><Input type="date" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></div>
          </div>
          <div><Label>Scope</Label><Textarea rows={3} value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={submit}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AuditSheet({ audit, onClose }: { audit: AuditEngagement | null; onClose: () => void }) {
  if (!audit) return null;
  const patch = (p: Partial<AuditEngagement>) => mutateGrc((s) => ({ ...s, audits: s.audits.map((a) => a.id === audit.id ? { ...a, ...p } : a) }));

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader><SheetTitle>{audit.name}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex gap-2 flex-wrap"><Badge variant="outline">{audit.type}</Badge><Badge variant="outline">{audit.status}</Badge></div>
          <div className="text-sm text-muted-foreground">{audit.scope}</div>
          <div className="flex gap-2 text-xs">
            <span>Start: {audit.startDate}</span><span>End: {audit.endDate}</span>
          </div>

          <div className="flex gap-2">
            {audit.status === "Planned" && <Button variant="outline" onClick={() => patch({ status: "In Progress" })}>Start</Button>}
            {audit.status === "In Progress" && <Button variant="outline" onClick={() => patch({ status: "Reporting" })}>Move to reporting</Button>}
            {audit.status === "Reporting" && <Button onClick={() => patch({ status: "Closed" })}>Close</Button>}
          </div>

          <RequestsSection audit={audit} />
          <FindingsSection audit={audit} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function RequestsSection({ audit }: { audit: AuditEngagement }) {
  const [f, setF] = useState({ description: "", assignedTo: "", dueDate: new Date().toISOString().slice(0, 10) });
  const add = () => {
    if (!f.description) return;
    const r: AuditRequest = { id: id("req"), status: "Requested", ...f };
    mutateGrc((s) => ({ ...s, audits: s.audits.map((a) => a.id === audit.id ? { ...a, requests: [...a.requests, r] } : a) }));
    setF({ description: "", assignedTo: "", dueDate: new Date().toISOString().slice(0, 10) });
  };
  const setStatus = (rid: string, status: AuditRequest["status"]) => {
    mutateGrc((s) => ({ ...s, audits: s.audits.map((a) => a.id === audit.id ? { ...a, requests: a.requests.map((r) => r.id === rid ? { ...r, status } : r) } : a) }));
  };
  return (
    <div className="border-t pt-3">
      <div className="font-medium text-sm mb-2">Document requests</div>
      <div className="space-y-1 mb-2">
        {audit.requests.map((r) => (
          <div key={r.id} className="border rounded p-2 text-sm flex justify-between items-center">
            <div>
              <div>{r.description}</div>
              <div className="text-xs text-muted-foreground">{r.assignedTo} · due {r.dueDate}</div>
            </div>
            <Select value={r.status} onValueChange={(v) => setStatus(r.id, v as any)}>
              <SelectTrigger className="w-[140px] h-8"><SelectValue /></SelectTrigger>
              <SelectContent>{["Requested","Received","Overdue"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Input placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <Input placeholder="Assigned to" value={f.assignedTo} onChange={(e) => setF({ ...f, assignedTo: e.target.value })} />
        <div className="flex gap-1"><Input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /><Button size="sm" onClick={add}>Add</Button></div>
      </div>
    </div>
  );
}

function FindingsSection({ audit }: { audit: AuditEngagement }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Omit<AuditFinding, "id" | "createdAt" | "status">>({
    observation: "", condition: "", criteria: "", cause: "", consequence: "", recommendation: "",
    severity: "Medium",
  });
  const add = () => {
    if (!f.observation) return toast({ title: "Observation required", variant: "destructive" });
    const nf: AuditFinding = { id: id("fnd"), createdAt: new Date().toISOString(), status: "Open", ...f };
    mutateGrc((s) => ({ ...s, audits: s.audits.map((a) => a.id === audit.id ? { ...a, findings: [...a.findings, nf] } : a) }));
    setOpen(false);
    toast({ title: "Finding added" });
  };
  const patchFinding = (fid: string, p: Partial<AuditFinding>) => {
    mutateGrc((s) => ({ ...s, audits: s.audits.map((a) => a.id === audit.id ? { ...a, findings: a.findings.map((x) => x.id === fid ? { ...x, ...p } : x) } : a) }));
  };
  return (
    <div className="border-t pt-3">
      <div className="flex justify-between items-center mb-2">
        <div className="font-medium text-sm">Findings</div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Add finding</Button>
      </div>
      <div className="space-y-2">
        {audit.findings.map((fd) => (
          <div key={fd.id} className="border rounded p-2 text-sm space-y-1">
            <div className="flex justify-between">
              <div className="font-medium">{fd.observation}</div>
              <div className="flex gap-1"><Badge variant="outline">{fd.severity}</Badge><Badge variant="outline">{fd.status}</Badge></div>
            </div>
            <div className="text-xs text-muted-foreground"><b>Condition:</b> {fd.condition}</div>
            <div className="text-xs text-muted-foreground"><b>Criteria:</b> {fd.criteria}</div>
            <div className="text-xs text-muted-foreground"><b>Cause:</b> {fd.cause}</div>
            <div className="text-xs text-muted-foreground"><b>Consequence:</b> {fd.consequence}</div>
            <div className="text-xs text-muted-foreground"><b>Recommendation:</b> {fd.recommendation}</div>
            <div className="pt-2"><Label className="text-xs">Management response</Label><Textarea rows={2} defaultValue={fd.managementResponse ?? ""} onBlur={(e) => patchFinding(fd.id, { managementResponse: e.target.value })} /></div>
            <div className="flex gap-2 items-end">
              <div className="flex-1"><Label className="text-xs">Remediation due</Label><Input type="date" defaultValue={fd.remediationDueDate ?? ""} onBlur={(e) => patchFinding(fd.id, { remediationDueDate: e.target.value })} /></div>
              <Select value={fd.status} onValueChange={(v) => patchFinding(fd.id, { status: v as any })}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>{["Open","In Progress","Remediated","Closed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        ))}
        {audit.findings.length === 0 && <div className="text-xs text-muted-foreground">No findings yet.</div>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New finding</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {(["observation","condition","criteria","cause","consequence","recommendation"] as const).map((k) => (
              <div key={k}><Label className="capitalize">{k}</Label><Textarea rows={2} value={(f as any)[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
            ))}
            <div><Label>Severity</Label>
              <Select value={f.severity} onValueChange={(v) => setF({ ...f, severity: v as any })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Critical","High","Medium","Low"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={add}>Add finding</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
