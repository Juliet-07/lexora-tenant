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
import { Plus, ShieldAlert, GraduationCap, ArrowRightLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useGov, mutateGov, gid, BoardMember } from "@/lib/grcGovernanceStore";

const ROLES: BoardMember["role"][] = ["Chair", "Vice-Chair", "Executive Director", "Non-Executive Director", "Independent Director"];

export default function GrcBoardMgt() {
  const s = useGov();
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<BoardMember | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const soon = s.boardMembers.filter((b) => b.termEnds < new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Board Management</h1>
          <p className="text-sm text-muted-foreground">Directors, succession planning, conflict-of-interest register, and training.</p>
        </div>
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" />New director</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="Board members" value={s.boardMembers.length} icon={<ArrowRightLeft className="h-5 w-5" />} tone="from-primary/15 to-primary/5" />
        <StatCard label="Terms ending in 6 months" value={soon.length} icon={<GraduationCap className="h-5 w-5" />} tone="from-amber-500/15 to-amber-500/5" />
        <StatCard label="Open conflicts" value={s.boardMembers.reduce((a, b) => a + b.conflicts.length, 0)} icon={<ShieldAlert className="h-5 w-5" />} tone="from-rose-500/15 to-rose-500/5" />
      </div>

      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow>
          <TableHead>Director</TableHead><TableHead>Role</TableHead><TableHead>Appointed</TableHead><TableHead>Term ends</TableHead><TableHead>Conflicts</TableHead><TableHead>Training</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {s.boardMembers.map((b) => (
            <TableRow key={b.id} className="cursor-pointer" onClick={() => setSelected(b)}>
              <TableCell className="font-medium">{b.name}</TableCell>
              <TableCell><Badge variant="outline">{b.role}</Badge></TableCell>
              <TableCell className="text-xs">{b.appointedAt}</TableCell>
              <TableCell className={b.termEnds < today ? "text-rose-600 text-xs" : "text-xs"}>{b.termEnds}</TableCell>
              <TableCell>{b.conflicts.length}</TableCell>
              <TableCell>{b.training.length}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></CardContent></Card>

      <NewDirectorDialog open={newOpen} onOpenChange={setNewOpen} />
      <DirectorSheet member={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function StatCard({ label, value, icon, tone }: any) {
  return (
    <Card><CardContent className="p-4 flex items-center gap-3">
      <div className={`h-11 w-11 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center text-primary`}>{icon}</div>
      <div><div className="text-2xl font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>
    </CardContent></Card>
  );
}

function NewDirectorDialog({ open, onOpenChange }: any) {
  const [f, setF] = useState<Omit<BoardMember, "id" | "conflicts" | "training">>({
    name: "", role: "Non-Executive Director", email: "", appointedAt: new Date().toISOString().slice(0, 10),
    termEnds: new Date(Date.now() + 730 * 86400000).toISOString().slice(0, 10), bio: "", successorNote: "",
  });
  const submit = () => {
    if (!f.name) return toast({ title: "Name required", variant: "destructive" });
    mutateGov((s) => ({ ...s, boardMembers: [{ id: gid("bm"), conflicts: [], training: [], ...f }, ...s.boardMembers] }));
    toast({ title: "Director added" }); onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New director</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          </div>
          <div><Label>Role</Label>
            <Select value={f.role} onValueChange={(v) => setF({ ...f, role: v as any })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Appointed</Label><Input type="date" value={f.appointedAt} onChange={(e) => setF({ ...f, appointedAt: e.target.value })} /></div>
            <div><Label>Term ends</Label><Input type="date" value={f.termEnds} onChange={(e) => setF({ ...f, termEnds: e.target.value })} /></div>
          </div>
          <div><Label>Bio</Label><Textarea rows={2} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={submit}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DirectorSheet({ member, onClose }: { member: BoardMember | null; onClose: () => void }) {
  const s = useGov();
  const [conflict, setConflict] = useState("");
  const [training, setTraining] = useState("");
  if (!member) return null;
  const patch = (p: Partial<BoardMember>) =>
    mutateGov((st) => ({ ...st, boardMembers: st.boardMembers.map((m) => m.id === member.id ? { ...m, ...p } : m) }));

  const otherDirectors = s.boardMembers.filter((m) => m.id !== member.id);
  const currentSuccessor = otherDirectors.find((d) => d.name === member.successorNote);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader><SheetTitle>{member.name}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{member.role}</Badge>
            <Badge variant="outline">Appointed {member.appointedAt}</Badge>
            <Badge variant="outline">Term ends {member.termEnds}</Badge>
          </div>
          <div><div className="text-xs text-muted-foreground">Bio</div><div className="text-sm">{member.bio || "—"}</div></div>

          <section className="border-t pt-3">
            <div className="font-medium text-sm mb-2 flex items-center gap-2"><ArrowRightLeft className="h-4 w-4" />Succession plan</div>
            <Select
              value={member.successorNote ?? "__none__"}
              onValueChange={(v) => patch({ successorNote: v === "__none__" ? "" : v })}
            >
              <SelectTrigger><SelectValue placeholder="Select a successor from the board" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— No successor identified —</SelectItem>
                {otherDirectors.map((d) => (
                  <SelectItem key={d.id} value={d.name}>{d.name} · {d.role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentSuccessor && (
              <div className="text-xs text-muted-foreground mt-2">Successor: <span className="text-foreground font-medium">{currentSuccessor.name}</span> ({currentSuccessor.role}) — term ends {currentSuccessor.termEnds}.</div>
            )}
            {!currentSuccessor && member.successorNote && (
              <div className="text-xs text-muted-foreground mt-2">{member.successorNote}</div>
            )}
          </section>

          <section className="border-t pt-3">
            <div className="font-medium text-sm mb-2 flex items-center gap-2"><ShieldAlert className="h-4 w-4" />Conflict-of-interest disclosures</div>
            <div className="space-y-1 mb-2">
              {member.conflicts.map((c, i) => (
                <div key={i} className="text-xs border rounded px-2 py-1 flex justify-between"><span>{c.note}</span><span className="text-muted-foreground">{new Date(c.disclosedAt).toLocaleDateString()}</span></div>
              ))}
              {member.conflicts.length === 0 && <div className="text-xs text-muted-foreground">No disclosures on file.</div>}
            </div>
            <div className="flex gap-2">
              <Input value={conflict} onChange={(e) => setConflict(e.target.value)} placeholder="Disclose conflict…" />
              <Button size="sm" variant="outline" onClick={() => { if (!conflict) return; patch({ conflicts: [...member.conflicts, { note: conflict, disclosedAt: new Date().toISOString() }] }); setConflict(""); }}>Record</Button>
            </div>
          </section>

          <section className="border-t pt-3">
            <div className="font-medium text-sm mb-2 flex items-center gap-2"><GraduationCap className="h-4 w-4" />Training log</div>
            <div className="space-y-1 mb-2">
              {member.training.map((t, i) => (
                <div key={i} className="text-xs border rounded px-2 py-1 flex justify-between"><span>{t.title}</span><span className="text-muted-foreground">{t.completedAt}</span></div>
              ))}
              {member.training.length === 0 && <div className="text-xs text-muted-foreground">No training recorded.</div>}
            </div>
            <div className="flex gap-2">
              <Input value={training} onChange={(e) => setTraining(e.target.value)} placeholder="Training / certification…" />
              <Button size="sm" variant="outline" onClick={() => { if (!training) return; patch({ training: [...member.training, { title: training, completedAt: new Date().toISOString().slice(0, 10) }] }); setTraining(""); }}>Log</Button>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
