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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useGrc, mutateGrc, id } from "@/lib/grcStore";

export default function GrcBcp() {
  const s = useGrc();
  const [newPlan, setNewPlan] = useState(false);
  const [newTest, setNewTest] = useState(false);
  const [newRto, setNewRto] = useState(false);
  const [newContact, setNewContact] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Business Continuity & Disaster Recovery</h1>
        <p className="text-sm text-muted-foreground">Plans, tests, RTO/RPO targets, and crisis communication.</p>
      </div>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
          <TabsTrigger value="rto">RTO / RPO</TabsTrigger>
          <TabsTrigger value="crisis">Crisis contacts</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <div className="flex justify-end mb-2"><Button onClick={() => setNewPlan(true)}><Plus className="h-4 w-4 mr-1" />Add plan version</Button></div>
          <Card><CardContent className="p-4 space-y-2">
            {s.bcpPlans.map((p) => (
              <div key={p.id} className="border rounded p-3">
                <div className="flex justify-between"><div className="font-medium">{p.title}</div><Badge variant="outline">v{p.version}</Badge></div>
                <div className="text-xs text-muted-foreground">Updated {new Date(p.updatedAt).toLocaleDateString()}</div>
                <div className="text-sm mt-2 whitespace-pre-wrap">{p.content}</div>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="tests">
          <div className="flex justify-end mb-2"><Button onClick={() => setNewTest(true)}><Plus className="h-4 w-4 mr-1" />Log test</Button></div>
          <Card><CardContent className="p-0"><Table>
            <TableHeader><TableRow><TableHead>Plan</TableHead><TableHead>Tested</TableHead><TableHead>Outcome</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
            <TableBody>
              {s.bcpTests.map((t) => {
                const plan = s.bcpPlans.find((p) => p.id === t.planId);
                return (
                  <TableRow key={t.id}>
                    <TableCell>{plan?.title}</TableCell>
                    <TableCell>{new Date(t.testedAt).toLocaleDateString()}</TableCell>
                    <TableCell><Badge variant="outline" className={t.outcome === "Pass" ? "text-emerald-600 border-emerald-500/30" : t.outcome === "Fail" ? "text-rose-600 border-rose-500/30" : "text-amber-600 border-amber-500/30"}>{t.outcome}</Badge></TableCell>
                    <TableCell className="text-xs">{t.notes}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table></CardContent></Card>
        </TabsContent>

        <TabsContent value="rto">
          <div className="flex justify-end mb-2"><Button onClick={() => setNewRto(true)}><Plus className="h-4 w-4 mr-1" />Add system</Button></div>
          <Card><CardContent className="p-0"><Table>
            <TableHeader><TableRow><TableHead>System</TableHead><TableHead>Criticality</TableHead><TableHead>RTO (hrs)</TableHead><TableHead>RPO (hrs)</TableHead></TableRow></TableHeader>
            <TableBody>
              {s.rtoRpo.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.system}</TableCell>
                  <TableCell><Badge variant="outline">{r.criticality}</Badge></TableCell>
                  <TableCell>{r.rtoHours}</TableCell>
                  <TableCell>{r.rpoHours}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></CardContent></Card>
        </TabsContent>

        <TabsContent value="crisis">
          <div className="flex justify-end mb-2"><Button onClick={() => setNewContact(true)}><Plus className="h-4 w-4 mr-1" />Add contact</Button></div>
          <Card><CardContent className="p-0"><Table>
            <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Phone</TableHead></TableRow></TableHeader>
            <TableBody>
              {s.crisisContacts.slice().sort((a, b) => a.escalationOrder - b.escalationOrder).map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.escalationOrder}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.role}</TableCell>
                  <TableCell className="font-mono text-xs">{c.phone}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></CardContent></Card>
        </TabsContent>
      </Tabs>

      <PlanDialog open={newPlan} onClose={() => setNewPlan(false)} />
      <TestDialog open={newTest} onClose={() => setNewTest(false)} />
      <RtoDialog open={newRto} onClose={() => setNewRto(false)} />
      <ContactDialog open={newContact} onClose={() => setNewContact(false)} />
    </div>
  );
}

function PlanDialog({ open, onClose }: any) {
  const [f, setF] = useState({ title: "Enterprise BCP", version: 1, content: "" });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add plan version</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
            <div><Label>Version</Label><Input type="number" value={f.version} onChange={(e) => setF({ ...f, version: Number(e.target.value) })} /></div>
          </div>
          <div><Label>Content</Label><Textarea rows={6} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={() => {
          if (!f.content) return toast({ title: "Content required", variant: "destructive" });
          mutateGrc((s) => ({ ...s, bcpPlans: [{ id: id("bcp"), updatedAt: new Date().toISOString(), ...f }, ...s.bcpPlans] }));
          toast({ title: "Plan saved" }); onClose();
        }}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TestDialog({ open, onClose }: any) {
  const s = useGrc();
  const [f, setF] = useState({ planId: s.bcpPlans[0]?.id ?? "", outcome: "Pass" as "Pass" | "Partial" | "Fail", notes: "" });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Log BCP test</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Plan</Label>
            <Select value={f.planId} onValueChange={(v) => setF({ ...f, planId: v })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{s.bcpPlans.map((p) => <SelectItem key={p.id} value={p.id}>{p.title} v{p.version}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Outcome</Label>
            <Select value={f.outcome} onValueChange={(v) => setF({ ...f, outcome: v as any })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Pass","Partial","Fail"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Notes</Label><Textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={() => {
          mutateGrc((s) => ({ ...s, bcpTests: [{ id: id("bt"), testedAt: new Date().toISOString(), ...f }, ...s.bcpTests] }));
          toast({ title: "Test logged" }); onClose();
        }}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RtoDialog({ open, onClose }: any) {
  const [f, setF] = useState({ system: "", rtoHours: 4, rpoHours: 1, criticality: "Tier 2" as "Tier 1" | "Tier 2" | "Tier 3" });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add system</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>System</Label><Input value={f.system} onChange={(e) => setF({ ...f, system: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>RTO (hrs)</Label><Input type="number" value={f.rtoHours} onChange={(e) => setF({ ...f, rtoHours: Number(e.target.value) })} /></div>
            <div><Label>RPO (hrs)</Label><Input type="number" value={f.rpoHours} onChange={(e) => setF({ ...f, rpoHours: Number(e.target.value) })} /></div>
            <div><Label>Tier</Label>
              <Select value={f.criticality} onValueChange={(v) => setF({ ...f, criticality: v as any })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Tier 1","Tier 2","Tier 3"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter><Button onClick={() => {
          if (!f.system) return toast({ title: "System required", variant: "destructive" });
          mutateGrc((s) => ({ ...s, rtoRpo: [{ id: id("rt"), ...f }, ...s.rtoRpo] }));
          toast({ title: "System added" }); onClose();
        }}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContactDialog({ open, onClose }: any) {
  const [f, setF] = useState({ name: "", role: "", phone: "", escalationOrder: 1 });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add crisis contact</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div><Label>Role</Label><Input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
            <div><Label>Escalation order</Label><Input type="number" value={f.escalationOrder} onChange={(e) => setF({ ...f, escalationOrder: Number(e.target.value) })} /></div>
          </div>
        </div>
        <DialogFooter><Button onClick={() => {
          if (!f.name) return toast({ title: "Name required", variant: "destructive" });
          mutateGrc((s) => ({ ...s, crisisContacts: [{ id: id("cc"), ...f }, ...s.crisisContacts] }));
          toast({ title: "Contact added" }); onClose();
        }}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
