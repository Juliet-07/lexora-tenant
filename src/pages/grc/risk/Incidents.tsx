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
import { useGrc, mutateGrc, id, Incident } from "@/lib/grcStore";

const CATEGORIES = ["Security","Operational","Compliance","Fraud","Error","System Outage"] as const;
const SEVERITIES = ["Critical","High","Medium","Low"] as const;

export default function GrcIncidents() {
  const s = useGrc();
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<Incident | null>(null);

  const bySeverity = SEVERITIES.map((sev) => ({
    sev,
    count: s.incidents.filter((i) => i.severity === sev && i.status !== "Closed").length,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Incident Management</h1>
          <p className="text-sm text-muted-foreground">
            Security breaches, outages, compliance violations. HR personnel matters live in Disputes.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" />Log an incident</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {bySeverity.map((b) => (
          <Card key={b.sev}><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Open · {b.sev}</div>
            <div className="text-2xl font-bold">{b.count}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow>
          <TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Severity</TableHead><TableHead>Investigator</TableHead><TableHead>Reported</TableHead><TableHead>Status</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {s.incidents.map((i) => (
            <TableRow key={i.id} className="cursor-pointer" onClick={() => setSelected(i)}>
              <TableCell className="font-medium">{i.title}</TableCell>
              <TableCell>{i.category}</TableCell>
              <TableCell>
                <Badge variant="outline" className={i.severity === "Critical" ? "text-rose-600 border-rose-500/30" : i.severity === "High" ? "text-orange-600 border-orange-500/30" : ""}>{i.severity}</Badge>
              </TableCell>
              <TableCell>{i.investigator ?? "—"}</TableCell>
              <TableCell className="text-xs">{new Date(i.reportedAt).toLocaleDateString()}</TableCell>
              <TableCell><Badge variant="outline">{i.status}</Badge></TableCell>
            </TableRow>
          ))}
          {s.incidents.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No incidents.</TableCell></TableRow>}
        </TableBody>
      </Table></CardContent></Card>

      <NewIncidentDialog open={newOpen} onOpenChange={setNewOpen} />
      <IncidentSheet incident={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function NewIncidentDialog({ open, onOpenChange }: any) {
  const [f, setF] = useState({ title: "", description: "", category: "Operational" as any, severity: "Medium" as any, reportedBy: "" });
  const submit = () => {
    if (!f.title.trim()) return toast({ title: "Title required", variant: "destructive" });
    mutateGrc((s) => ({ ...s, incidents: [{ id: id("inc"), ...f, reportedAt: new Date().toISOString(), status: "Reported" }, ...s.incidents] }));
    toast({ title: "Incident reported" });
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Report an incident</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {/* <div><Label>Your name</Label><Input value={f.reportedBy} onChange={(e) => setF({ ...f, reportedBy: e.target.value })} /></div> */}
          <div><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Category</Label>
              <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v as any })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Severity</Label>
              <Select value={f.severity} onValueChange={(v) => setF({ ...f, severity: v as any })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEVERITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter><Button onClick={submit}>Submit</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IncidentSheet({ incident, onClose }: { incident: Incident | null; onClose: () => void }) {
  if (!incident) return null;
  const patch = (p: Partial<Incident>) => {
    mutateGrc((s) => ({ ...s, incidents: s.incidents.map((i) => i.id === incident.id ? { ...i, ...p } : i) }));
  };
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader><SheetTitle>{incident.title}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{incident.category}</Badge>
            <Badge variant="outline">{incident.severity}</Badge>
            <Badge variant="outline">{incident.status}</Badge>
          </div>
          <div><Label>Description</Label><div className="text-sm">{incident.description}</div></div>

          <div className="grid grid-cols-2 gap-2">
            <div><Label>Investigator</Label><Input defaultValue={incident.investigator ?? ""} onBlur={(e) => patch({ investigator: e.target.value })} /></div>
            <div><Label>Due date</Label><Input type="date" defaultValue={incident.dueDate ?? ""} onBlur={(e) => patch({ dueDate: e.target.value })} /></div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="font-medium text-sm">Root cause analysis</div>
            <div>
              <Label>Method</Label>
              <Select value={incident.rcaMethod ?? "5 Whys"} onValueChange={(v) => patch({ rcaMethod: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["5 Whys","Fishbone"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>RCA notes</Label><Textarea rows={3} defaultValue={incident.rcaNotes ?? ""} onBlur={(e) => patch({ rcaNotes: e.target.value })} /></div>
            <div><Label>Corrective actions (fix this instance)</Label><Textarea rows={2} defaultValue={incident.correctiveActions ?? ""} onBlur={(e) => patch({ correctiveActions: e.target.value })} /></div>
            <div><Label>Preventive actions (stop recurrence)</Label><Textarea rows={2} defaultValue={incident.preventiveActions ?? ""} onBlur={(e) => patch({ preventiveActions: e.target.value })} /></div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="font-medium text-sm">Closure</div>
            <div><Label>Lessons learned</Label><Textarea rows={2} defaultValue={incident.lessonsLearned ?? ""} onBlur={(e) => patch({ lessonsLearned: e.target.value })} /></div>
            <div><Label>Sign-off by</Label><Input defaultValue={incident.signOffBy ?? ""} onBlur={(e) => patch({ signOffBy: e.target.value })} /></div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { patch({ status: "Investigating" }); toast({ title: "Marked investigating" }); }}>Set investigating</Button>
              <Button variant="outline" onClick={() => { patch({ status: "Awaiting Sign-off" }); toast({ title: "Awaiting sign-off" }); }}>Ready for sign-off</Button>
              <Button onClick={() => {
                if (!incident.signOffBy) return toast({ title: "Sign-off name required before closing", variant: "destructive" });
                patch({ status: "Closed", closedAt: new Date().toISOString() });
                toast({ title: "Incident closed" });
              }}>Close incident</Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
