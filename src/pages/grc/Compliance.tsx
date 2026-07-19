import { useState, useMemo } from "react";
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
import { Plus, Upload, Newspaper, CalendarClock, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useGrc, mutateGrc, id, Obligation, RegulatoryChange } from "@/lib/grcStore";

const REG_TYPES = ["BNR", "Data Protection", "Labour Law", "Tax Law", "Company Law", "AML", "Other"] as const;

export default function GrcCompliance() {
  const s = useGrc();
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<Obligation | null>(null);
  const [reading, setReading] = useState<RegulatoryChange | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Compliance</h1>
          <p className="text-sm text-muted-foreground">
            Regulatory calendar, obligations register, and inbound regulatory updates.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" />New obligation</Button>
      </div>

      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="obligations">Obligations</TabsTrigger>
          <TabsTrigger value="updates">Regulatory updates</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-4">
          <Card><CardContent className="p-4 space-y-2">
            {s.obligations.slice().sort((a, b) => a.deadline.localeCompare(b.deadline)).map((o) => (
              <div key={o.id} className="flex justify-between border rounded p-3 text-sm cursor-pointer hover:bg-muted/40" onClick={() => setSelected(o)}>
                <div className="flex items-center gap-3">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{o.title}</div>
                    <div className="text-xs text-muted-foreground">{o.regulationType} · {o.owner}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={o.deadline < today && o.status !== "Completed" ? "text-rose-600 font-medium" : ""}>{o.deadline}</div>
                  <Badge variant="outline" className="text-xs mt-1">{o.status}</Badge>
                </div>
              </div>
            ))}
            {s.obligations.length === 0 && <div className="text-center text-sm text-muted-foreground py-6">No obligations yet.</div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="obligations" className="mt-4">
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

        <TabsContent value="updates" className="mt-4">
          <RegulatoryFeed onOpen={setReading} items={s.regulatoryChanges} />
        </TabsContent>
      </Tabs>

      <NewObligationDialog open={newOpen} onOpenChange={setNewOpen} />
      <ObligationSheet obligation={selected} onClose={() => setSelected(null)} />
      <UpdateReader item={reading} onClose={() => setReading(null)} />
    </div>
  );
}

function RegulatoryFeed({ items, onOpen }: { items: RegulatoryChange[]; onOpen: (r: RegulatoryChange) => void }) {
  const sorted = useMemo(() => items.slice().sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)), [items]);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Newspaper className="h-4 w-4" />
        Curated regulatory updates from the platform's monitoring service — click any update to read the full brief.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sorted.map((c) => (
          <Card key={c.id} className="cursor-pointer hover:shadow-md transition" onClick={() => onOpen(c)}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{c.regulationType}</Badge>
                <Badge variant="outline" className={c.impact === "High" ? "text-rose-600 border-rose-500/30" : c.impact === "Medium" ? "text-amber-600 border-amber-500/30" : ""}>{c.impact} impact</Badge>
              </div>
              <div className="font-semibold text-sm">{c.title}</div>
              <p className="text-xs text-muted-foreground line-clamp-3">{c.summary}</p>
              <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1"><ExternalLink className="h-3 w-3" />Published {new Date(c.loggedAt).toLocaleDateString()}</div>
            </CardContent>
          </Card>
        ))}
        {sorted.length === 0 && <div className="col-span-full text-center text-sm text-muted-foreground py-6">No updates yet.</div>}
      </div>
    </div>
  );
}

function UpdateReader({ item, onClose }: { item: RegulatoryChange | null; onClose: () => void }) {
  if (!item) return null;
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader><SheetTitle>{item.title}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            <Badge variant="outline">{item.regulationType}</Badge>
            <Badge variant="outline" className={item.impact === "High" ? "text-rose-600 border-rose-500/30" : ""}>{item.impact} impact</Badge>
            <Badge variant="outline">{new Date(item.loggedAt).toLocaleDateString()}</Badge>
          </div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">{item.summary}</div>
          {item.affectedObligationIds.length > 0 && (
            <div className="text-xs text-muted-foreground border-t pt-3">
              Linked to {item.affectedObligationIds.length} obligation(s) in your register.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
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
                <SelectContent>{["One-off", "Monthly", "Quarterly", "Annual"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter><Button onClick={submit}>Save</Button></DialogFooter>
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
