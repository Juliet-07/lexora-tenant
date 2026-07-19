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
import { Plus, Users2, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useGov, mutateGov, gid, Committee, CommitteeMember, CommitteeTask } from "@/lib/grcGovernanceStore";

export default function GrcCommittees() {
  const s = useGov();
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<Committee | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Committees</h1>
          <p className="text-sm text-muted-foreground">Compose committees, assign members, track responsibilities and tasks.</p>
        </div>
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" />New committee</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {s.committees.map((c) => (
          <Card key={c.id} className="cursor-pointer hover:shadow-md transition" onClick={() => setSelected(c)}>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div className="font-semibold">{c.name}</div>
                <Badge variant="outline"><Users2 className="h-3 w-3 mr-1" />{c.members.length}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">Chair: {c.chair}</div>
              <p className="text-sm text-muted-foreground line-clamp-2">{c.purpose}</p>
              <div className="text-xs flex gap-2">
                <Badge variant="secondary">{c.tasks.filter((t) => t.status !== "Done").length} open tasks</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <NewCommitteeDialog open={newOpen} onOpenChange={setNewOpen} />
      <CommitteeSheet committee={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function NewCommitteeDialog({ open, onOpenChange }: any) {
  const [f, setF] = useState({ name: "", purpose: "", chair: "" });
  const submit = () => {
    if (!f.name) return toast({ title: "Name required", variant: "destructive" });
    mutateGov((s) => ({ ...s, committees: [{ id: gid("cm"), members: [], tasks: [], createdAt: new Date().toISOString(), ...f }, ...s.committees] }));
    toast({ title: "Committee created" }); onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New committee</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><Label>Chair</Label><Input value={f.chair} onChange={(e) => setF({ ...f, chair: e.target.value })} /></div>
          <div><Label>Purpose</Label><Textarea rows={3} value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={submit}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CommitteeSheet({ committee, onClose }: { committee: Committee | null; onClose: () => void }) {
  const [mem, setMem] = useState<CommitteeMember>({ name: "", email: "", role: "Member" });
  const [tk, setTk] = useState<Omit<CommitteeTask, "id" | "status">>({ title: "", owner: "", dueDate: new Date().toISOString().slice(0, 10) });

  if (!committee) return null;
  const patch = (p: Partial<Committee>) =>
    mutateGov((s) => ({ ...s, committees: s.committees.map((c) => c.id === committee.id ? { ...c, ...p } : c) }));

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader><SheetTitle>{committee.name}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-5">
          <div className="text-sm text-muted-foreground">{committee.purpose}</div>

          <section className="border-t pt-4 space-y-2">
            <div className="font-medium text-sm">Members</div>
            <div className="space-y-1">
              {committee.members.map((m, i) => (
                <div key={i} className="flex justify-between text-xs border rounded px-2 py-1 items-center">
                  <span>{m.name} <span className="text-muted-foreground">{m.email}</span></span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{m.role}</Badge>
                    <button onClick={() => patch({ members: committee.members.filter((_, x) => x !== i) })}><Trash2 className="h-3 w-3 text-muted-foreground" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Input placeholder="Name" value={mem.name} onChange={(e) => setMem({ ...mem, name: e.target.value })} />
              <Input placeholder="Email" value={mem.email} onChange={(e) => setMem({ ...mem, email: e.target.value })} />
              <Select value={mem.role} onValueChange={(v) => setMem({ ...mem, role: v as any })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Chair", "Secretary", "Member"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => { if (!mem.name) return; patch({ members: [...committee.members, mem] }); setMem({ name: "", email: "", role: "Member" }); }}>Add</Button>
            </div>
          </section>

          <section className="border-t pt-4 space-y-2">
            <div className="font-medium text-sm">Tasks & responsibilities</div>
            <div className="space-y-1">
              {committee.tasks.map((t) => (
                <div key={t.id} className="flex justify-between text-xs border rounded px-2 py-1 items-center">
                  <div>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-muted-foreground">{t.owner} · due {t.dueDate}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={t.status} onValueChange={(v) => patch({ tasks: committee.tasks.map((x) => x.id === t.id ? { ...x, status: v as any } : x) })}>
                      <SelectTrigger className="h-7 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>{["Open", "In Progress", "Done"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    {t.status === "Done" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Input className="col-span-2" placeholder="Task title" value={tk.title} onChange={(e) => setTk({ ...tk, title: e.target.value })} />
              <Input placeholder="Owner" value={tk.owner} onChange={(e) => setTk({ ...tk, owner: e.target.value })} />
              <div className="flex gap-1">
                <Input type="date" value={tk.dueDate} onChange={(e) => setTk({ ...tk, dueDate: e.target.value })} />
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => { if (!tk.title) return; patch({ tasks: [...committee.tasks, { id: gid("tk"), status: "Open", ...tk }] }); setTk({ title: "", owner: "", dueDate: new Date().toISOString().slice(0, 10) }); }}>Add task</Button>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
