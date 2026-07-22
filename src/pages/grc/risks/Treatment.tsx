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
import {
  useGrc, mutateGrc, id, TreatmentPlan, residualScore, scoreToBand, bandTone,
} from "@/lib/grcStore";

const APPROVAL_THRESHOLD = 50000;

export default function GrcTreatment() {
  const s = useGrc();
  const [newOpen, setNewOpen] = useState(false);

  const eligible = s.risks.filter((r) => ["High", "Extreme"].includes(scoreToBand(residualScore(r))));
  const pending = s.treatmentPlans.filter((p) => p.approvalStatus === "Pending Approval");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Risk Treatment Plans</h1>
          <p className="text-sm text-muted-foreground">
            Formal treatment for High/Extreme risks. Plans over ${APPROVAL_THRESHOLD.toLocaleString()} route for approval.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" />New plan</Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All plans</TabsTrigger>
          <TabsTrigger value="approvals">Approval queue ({pending.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card><CardContent className="p-0"><Table>
            <TableHeader><TableRow>
              <TableHead>Risk</TableHead><TableHead>Strategy</TableHead><TableHead>Owner</TableHead><TableHead>Target</TableHead><TableHead>Investment</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {s.treatmentPlans.map((p) => {
                const r = s.risks.find((x) => x.id === p.riskId);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{r?.title ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline">{p.strategy}</Badge></TableCell>
                    <TableCell>{p.owner}</TableCell>
                    <TableCell><Badge variant="outline" className={bandTone(p.targetResidualLevel)}>{p.targetResidualLevel}</Badge></TableCell>
                    <TableCell>${p.investment.toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline">{p.approvalStatus}</Badge></TableCell>
                  </TableRow>
                );
              })}
              {s.treatmentPlans.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No treatment plans yet.</TableCell></TableRow>}
            </TableBody>
          </Table></CardContent></Card>
        </TabsContent>

        <TabsContent value="approvals">
          <Card><CardContent className="p-4 space-y-3">
            {pending.length === 0 && <div className="text-sm text-muted-foreground">No plans awaiting approval.</div>}
            {pending.map((p) => {
              const r = s.risks.find((x) => x.id === p.riskId);
              return (
                <div key={p.id} className="border rounded p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{r?.title}</div>
                      <div className="text-xs text-muted-foreground">Strategy: {p.strategy} · Investment: ${p.investment.toLocaleString()}</div>
                      <div className="text-sm mt-2">{p.actions}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => decide(p.id, "Rejected")}>Reject</Button>
                      <Button size="sm" onClick={() => decide(p.id, "Approved")}>Approve</Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <NewPlanDialog open={newOpen} onOpenChange={setNewOpen} risks={eligible} />
    </div>
  );

  function decide(planId: string, status: "Approved" | "Rejected") {
    mutateGrc((s) => ({ ...s, treatmentPlans: s.treatmentPlans.map((p) => p.id === planId ? { ...p, approvalStatus: status } : p) }));
    toast({ title: `Plan ${status.toLowerCase()}` });
  }
}

function NewPlanDialog({ open, onOpenChange, risks }: any) {
  const [f, setF] = useState<Omit<TreatmentPlan, "id" | "createdAt" | "approvalStatus">>({
    riskId: risks[0]?.id ?? "",
    strategy: "Reduce",
    justification: "",
    targetResidualLevel: "Medium",
    actions: "",
    resourceNeeds: "",
    owner: "",
    timeline: "",
    successCriteria: "",
    investment: 0,
  });
  const submit = () => {
    if (!f.riskId) return toast({ title: "Select a risk", variant: "destructive" });
    const approval = f.investment >= APPROVAL_THRESHOLD ? "Pending Approval" : "Draft";
    mutateGrc((s) => ({ ...s, treatmentPlans: [{ id: id("trt"), createdAt: new Date().toISOString(), approvalStatus: approval, ...f }, ...s.treatmentPlans] }));
    toast({ title: approval === "Pending Approval" ? "Sent for approval" : "Draft saved" });
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New treatment plan</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Risk (High or Extreme)</Label>
            <Select value={f.riskId} onValueChange={(v) => setF({ ...f, riskId: v })}><SelectTrigger><SelectValue placeholder="Select risk" /></SelectTrigger>
              <SelectContent>{risks.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Strategy</Label>
              <Select value={f.strategy} onValueChange={(v) => setF({ ...f, strategy: v as any })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Avoid","Reduce","Transfer","Accept"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Target residual level</Label>
              <Select value={f.targetResidualLevel} onValueChange={(v) => setF({ ...f, targetResidualLevel: v as any })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Low","Medium","High","Extreme"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Justification</Label><Textarea rows={2} value={f.justification} onChange={(e) => setF({ ...f, justification: e.target.value })} /></div>
          <div><Label>Actions</Label><Textarea rows={2} value={f.actions} onChange={(e) => setF({ ...f, actions: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Owner</Label><Input value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} /></div>
            <div><Label>Timeline</Label><Input value={f.timeline} onChange={(e) => setF({ ...f, timeline: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Resource needs</Label><Input value={f.resourceNeeds} onChange={(e) => setF({ ...f, resourceNeeds: e.target.value })} /></div>
            <div><Label>Investment ($)</Label><Input type="number" value={f.investment} onChange={(e) => setF({ ...f, investment: Number(e.target.value) })} /></div>
          </div>
          <div><Label>Success criteria</Label><Textarea rows={2} value={f.successCriteria} onChange={(e) => setF({ ...f, successCriteria: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={submit}>Save plan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
