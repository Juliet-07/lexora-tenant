import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useGrc, mutateGrc, id, Policy } from "@/lib/grcStore";

export default function GrcPolicies() {
  const s = useGrc();
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<Policy | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Policy & Procedure Management</h1>
          <p className="text-sm text-muted-foreground">
            Draft, review, publish, and track employee acknowledgment.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" />New policy</Button>
      </div>

      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow>
          <TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Version</TableHead><TableHead>Status</TableHead><TableHead>Acknowledged</TableHead><TableHead>Next review</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {s.policies.map((p) => {
            const acked = p.acknowledgments.filter((a) => a.ackAt).length;
            const total = p.acknowledgments.length;
            return (
              <TableRow key={p.id} className="cursor-pointer" onClick={() => setSelected(p)}>
                <TableCell className="font-medium">{p.title}</TableCell>
                <TableCell>{p.category}</TableCell>
                <TableCell>v{p.currentVersion}</TableCell>
                <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                <TableCell>{acked}/{total}</TableCell>
                <TableCell className="text-xs">{p.nextReviewDate}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table></CardContent></Card>

      <NewPolicyDialog open={newOpen} onOpenChange={setNewOpen} />
      <PolicySheet policy={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function NewPolicyDialog({ open, onOpenChange }: any) {
  const [f, setF] = useState({ title: "", category: "", content: "", trainingRequired: false });
  const submit = () => {
    if (!f.title) return toast({ title: "Title required", variant: "destructive" });
    const now = new Date().toISOString();
    mutateGrc((s) => ({ ...s, policies: [{
      id: id("pol"), title: f.title, category: f.category, status: "Draft",
      currentVersion: 1,
      versions: [{ version: 1, content: f.content, updatedAt: now, note: "Initial draft" }],
      requiredAudience: "All Employees", audienceNote: "",
      acknowledgments: [
        { employeeId: "e1", employeeName: "Aline U." },
        { employeeId: "e2", employeeName: "Jean B." },
        { employeeId: "e3", employeeName: "Sophie N." },
      ],
      nextReviewDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      trainingRequired: f.trainingRequired,
    }, ...s.policies] }));
    toast({ title: "Policy drafted" }); onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New policy</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
            <div><Label>Category</Label><Input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></div>
          </div>
          <div><Label>Content</Label><Textarea rows={6} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} /></div>
          <div className="flex items-center gap-2"><Checkbox checked={f.trainingRequired} onCheckedChange={(v) => setF({ ...f, trainingRequired: Boolean(v) })} /><Label>Training required</Label></div>
        </div>
        <DialogFooter><Button onClick={submit}>Save draft</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PolicySheet({ policy, onClose }: { policy: Policy | null; onClose: () => void }) {
  const [note, setNote] = useState("");
  const [content, setContent] = useState(policy?.versions.find((v) => v.version === policy.currentVersion)?.content ?? "");
  if (!policy) return null;

  const patch = (p: Partial<Policy>) => mutateGrc((s) => ({ ...s, policies: s.policies.map((x) => x.id === policy.id ? { ...x, ...p } : x) }));
  const publishNext = (status: Policy["status"]) => {
    patch({ status, publishedAt: status === "Published" ? new Date().toISOString() : policy.publishedAt });
    toast({ title: `Status: ${status}` });
  };
  const saveNewVersion = () => {
    if (!note) return toast({ title: "Change note required", variant: "destructive" });
    const nextVer = policy.currentVersion + 1;
    patch({
      currentVersion: nextVer,
      versions: [...policy.versions, { version: nextVer, content, updatedAt: new Date().toISOString(), note }],
    });
    setNote("");
    toast({ title: `Version v${nextVer} saved` });
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader><SheetTitle>{policy.title}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{policy.category}</Badge>
            <Badge variant="outline">v{policy.currentVersion}</Badge>
            <Badge variant="outline">{policy.status}</Badge>
          </div>

          <div><Label>Content</Label><Textarea rows={8} value={content} onChange={(e) => setContent(e.target.value)} /></div>
          <div className="flex gap-2 items-end">
            <div className="flex-1"><Label>Change note (for new version)</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
            <Button variant="outline" onClick={saveNewVersion}>Save new version</Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {policy.status === "Draft" && <Button variant="outline" onClick={() => publishNext("In Review")}>Send to review</Button>}
            {policy.status === "In Review" && <Button variant="outline" onClick={() => publishNext("Approved")}>Approve</Button>}
            {policy.status === "Approved" && <Button onClick={() => publishNext("Published")}>Publish</Button>}
            {policy.status === "Published" && <Button variant="outline" onClick={() => publishNext("Archived")}>Archive</Button>}
          </div>

          <div className="border-t pt-3">
            <div className="font-medium text-sm mb-2">Acknowledgments</div>
            <div className="space-y-1">
              {policy.acknowledgments.map((a) => (
                <div key={a.employeeId} className="flex justify-between text-sm border rounded px-2 py-1">
                  <span>{a.employeeName}</span>
                  <span className={a.ackAt ? "text-emerald-600 text-xs" : "text-muted-foreground text-xs"}>{a.ackAt ? `Acknowledged ${new Date(a.ackAt).toLocaleDateString()}` : "Pending"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="font-medium text-sm mb-2">Version history</div>
            <ul className="text-xs text-muted-foreground space-y-1">
              {policy.versions.slice().reverse().map((v) => (
                <li key={v.version}>v{v.version} · {new Date(v.updatedAt).toLocaleDateString()} — {v.note}</li>
              ))}
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
