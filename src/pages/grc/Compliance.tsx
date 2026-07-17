import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Plus, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useGrc, mutateGrc, id, Obligation, RegulatoryChange } from "@/lib/grcStore";

const REG_TYPES = ["BNR","Data Protection","Labour Law","Tax Law","Company Law","AML","Other"] as const;

export default function GrcCompliance() {
  const s = useGrc();
  const [newOpen, setNewOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [selected, setSelected] = useState<Obligation | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Compliance Obligation Management</h1>
          <p className="text-sm text-muted-foreground">
            Regulatory obligations across BNR, Data Protection, Labour, Tax, Company Law, AML.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setChangeOpen(true)}>Log regulatory change</Button>
          <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" />New obligation</Button>
        </div>
      </div>

      <Tabs defaultValue="register">
        <TabsList>
          <TabsTrigger value="register">Register</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="changes">Regulatory changes</TabsTrigger>
        </TabsList>

        <TabsContent value="register">
          <Card><CardContent className="p-0"><Table>
            <TableHeader><TableRow>
              <TableHead>Obligation</TableHead><TableHead>Type</TableHead><TableHead>Owner</TableHead><TableHead>Deadline</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {s.obligations.map((o) => {
                const overdue = o.status !== "Completed" && o.deadline < today;
                return (
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => setSelected(o)}>
                    <TableCell className="font-medium">{o.title}</TableCell>
                    <TableCell><Badge variant="outline">{o.regulationType}</Badge></TableCell>
                    <TableCell>{o.owner}</TableCell>
                    <TableCell className={overdue ? "text-rose-600 font-medium" : ""}>{o.deadline}</TableCell>
                    <TableCell><Badge variant="outline">{overdue ? "Overdue" : o.status}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table></CardContent></Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card><CardContent className="p-4 space-y-2">
            {s.obligations.slice().sort((a, b) => a.deadline.localeCompare(b.deadline)).map((o) => (
              <div key={o.id} className="flex justify-between border rounded p-2 text-sm">
                <div>
                  <div className="font-medium">{o.title}</div>
                  <div className="text-xs text-muted-foreground">{o.regulationType} · {o.owner}</div>
                </div>
                <div className="text-right">
                  <div className={o.deadline < today && o.status !== "Completed" ? "text-rose-600 font-medium" : ""}>{o.deadline}</div>
                  <Badge variant="outline" className="text-xs">{o.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="changes">
          <Card><CardContent className="p-0"><Table>
            <TableHeader><TableRow>
              <TableHead>Title</TableHead><TableHead>Regulation</TableHead><TableHead>Impact</TableHead><TableHead>Affected</TableHead><TableHead>Logged</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {s.regulatoryChanges.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.title}</TableCell>
                  <TableCell>{c.regulationType}</TableCell>
                  <TableCell><Badge variant="outline" className={c.impact === "High" ? "text-rose-600 border-rose-500/30" : ""}>{c.impact}</Badge></TableCell>
                  <TableCell>{c.affectedObligationIds.length}</TableCell>
                  <TableCell className="text-xs">{new Date(c.loggedAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></CardContent></Card>
        </TabsContent>
      </Tabs>

      <NewObligationDialog open={newOpen} onOpenChange={setNewOpen} />
      <NewChangeDialog open={changeOpen} onOpenChange={setChangeOpen} />
      <ObligationSheet obligation={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function NewObligationDialog({ open, onOpenChange }: any) {
  const [f, setF] = useState<Omit<Obligation, "id" | "evidence" | "status">>({
    title: "", regulationType: "BNR", source: "", description: "", owner: "",
    deadline: new Date().toISOString().slice(0, 10), frequency: "Annual",
  });
  const submit = () => {
    if (!f.title) return toast({ title: "Title required", variant: "destructive" });
    mutateGrc((s) => ({ ...s, obligations: [{ id: id("obl"), ...f, evidence: [], status: "Pending" }, ...s.obligations] }));
    toast({ title: "Obligation added" }); onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New obligation</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Type</Label>
              <Select value={f.regulationType} onValueChange={(v) => setF({ ...f, regulationType: v as any })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REG_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Source</Label><Input value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} placeholder="Authority / regulation ref" /></div>
          </div>
          <div><Label>Description</Label><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Owner</Label><Input value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} /></div>
            <div><Label>Deadline</Label><Input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></div>
            <div><Label>Frequency</Label>
              <Select value={f.frequency} onValueChange={(v) => setF({ ...f, frequency: v as any })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["One-off","Monthly","Quarterly","Annual"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter><Button onClick={submit}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewChangeDialog({ open, onOpenChange }: any) {
  const [f, setF] = useState<Omit<RegulatoryChange, "id" | "loggedAt" | "affectedObligationIds">>({
    title: "", regulationType: "BNR", summary: "", impact: "Medium",
  });
  const submit = () => {
    if (!f.title) return toast({ title: "Title required", variant: "destructive" });
    mutateGrc((s) => ({ ...s, regulatoryChanges: [{ id: id("reg"), loggedAt: new Date().toISOString(), affectedObligationIds: [], ...f }, ...s.regulatoryChanges] }));
    toast({ title: "Regulatory change logged" }); onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Log regulatory change</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Regulation</Label>
              <Select value={f.regulationType} onValueChange={(v) => setF({ ...f, regulationType: v as any })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REG_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Impact</Label>
              <Select value={f.impact} onValueChange={(v) => setF({ ...f, impact: v as any })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["High","Medium","Low"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Summary</Label><Textarea rows={3} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={submit}>Log</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ObligationSheet({ obligation, onClose }: { obligation: Obligation | null; onClose: () => void }) {
  const [evName, setEvName] = useState("");
  const [signer, setSigner] = useState("");
  if (!obligation) return null;
  const patch = (p: Partial<Obligation>) => mutateGrc((s) => ({ ...s, obligations: s.obligations.map((o) => o.id === obligation.id ? { ...o, ...p } : o) }));

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader><SheetTitle>{obligation.title}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{obligation.regulationType}</Badge>
            <Badge variant="outline">{obligation.frequency}</Badge>
            <Badge variant="outline">{obligation.status}</Badge>
          </div>
          <div><div className="text-xs text-muted-foreground">Description</div><div className="text-sm">{obligation.description}</div></div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><div className="text-xs text-muted-foreground">Owner</div>{obligation.owner}</div>
            <div><div className="text-xs text-muted-foreground">Deadline</div>{obligation.deadline}</div>
          </div>

          <div className="border-t pt-3">
            <div className="font-medium text-sm mb-2">Evidence</div>
            <div className="space-y-1 mb-2">
              {obligation.evidence.map((e, i) => (
                <div key={i} className="text-xs flex justify-between border rounded px-2 py-1"><span>{e.name}</span><span className="text-muted-foreground">{new Date(e.uploadedAt).toLocaleDateString()}</span></div>
              ))}
              {obligation.evidence.length === 0 && <div className="text-xs text-muted-foreground">No evidence attached.</div>}
            </div>
            <div className="flex gap-2">
              <Input value={evName} onChange={(e) => setEvName(e.target.value)} placeholder="Evidence name" />
              <Button size="sm" variant="outline" onClick={() => {
                if (!evName) return;
                patch({ evidence: [...obligation.evidence, { name: evName, uploadedAt: new Date().toISOString() }] });
                setEvName("");
              }}><Upload className="h-4 w-4 mr-1" />Add</Button>
            </div>
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="font-medium text-sm">Sign-off</div>
            <Input value={signer} onChange={(e) => setSigner(e.target.value)} placeholder="Management signer name" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => patch({ status: "In Progress" })}>Mark in progress</Button>
              <Button onClick={() => {
                if (!signer) return toast({ title: "Signer required", variant: "destructive" });
                patch({ status: "Completed", signedOffBy: signer, completedAt: new Date().toISOString() });
                toast({ title: "Certified complete" });
              }}>Certify complete</Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
