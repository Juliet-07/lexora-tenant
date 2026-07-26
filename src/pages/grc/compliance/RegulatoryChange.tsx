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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Newspaper, CalendarClock, FileText, ScrollText, Send, CheckCircle2, CircleDashed, Minus,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useCompliance, mutateCompliance, id, REGULATORS, RegChange, LoopAction, todayStr,
} from "@/lib/complianceStore";

const URGENCIES = ["Action Required", "Review", "Informational", "Noted"] as const;

const urgencyTone: Record<string, string> = {
  "Action Required": "text-rose-600 border-rose-500/30 bg-rose-500/10",
  Review: "text-amber-600 border-amber-500/30 bg-amber-500/10",
  Informational: "text-sky-600 border-sky-500/30 bg-sky-500/10",
  Noted: "text-muted-foreground",
};

const LOOP_KEYS: { key: keyof RegChange["loop"]; label: string; icon: any }[] = [
  { key: "obligation", label: "Obligation updated", icon: CalendarClock },
  { key: "policy", label: "Policy review triggered", icon: FileText },
  { key: "clause", label: "Clause flagged", icon: ScrollText },
  { key: "advisory", label: "Client advisory sent", icon: Send },
];

export default function ComplianceRegulatoryChange() {
  const s = useCompliance();
  const [newOpen, setNewOpen] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const items = s.changes
    .filter((c) => filter === "all" || c.urgency === filter)
    .slice()
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  const current = s.changes.find((c) => c.id === sel) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Regulatory Change</h1>
          <p className="text-sm text-muted-foreground">
            The cross-cutting closed loop: log a change, assess impact, then track the four downstream actions to completion.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All urgencies</SelectItem>
              {URGENCIES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" />Log change</Button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Newspaper className="h-4 w-4" />
        Change feed — sourced from regulator publications and the platform monitoring service.
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((c) => (
          <Card key={c.id} className="cursor-pointer hover:shadow-md transition" onClick={() => setSel(c.id)}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{c.regulator}</Badge>
                <Badge variant="outline" className={urgencyTone[c.urgency]}>{c.urgency}</Badge>
              </div>
              <div className="font-semibold text-sm">{c.title}</div>
              <p className="text-xs text-muted-foreground line-clamp-3">{c.summary}</p>
              <div className="flex flex-wrap gap-1 pt-1">
                {c.practiceAreas.map((p) => (
                  <span key={p} className="text-[10px] rounded bg-muted px-1.5 py-0.5">{p}</span>
                ))}
              </div>
              <div className="border-t pt-2 flex items-center justify-between">
                <LoopStrip change={c} />
                <span className="text-[11px] text-muted-foreground">{c.publishedAt}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && (
          <div className="col-span-full text-center text-sm text-muted-foreground py-8">No changes logged.</div>
        )}
      </div>

      <NewChangeDialog open={newOpen} onOpenChange={setNewOpen} />
      <ChangeSheet change={current} onClose={() => setSel(null)} />
    </div>
  );
}

function LoopStrip({ change }: { change: RegChange }) {
  return (
    <div className="flex items-center gap-1.5">
      {LOOP_KEYS.map(({ key, icon: Icon, label }) => {
        const st = change.loop[key].status;
        const tone =
          st === "Done" ? "text-emerald-600" :
          st === "In Progress" ? "text-amber-600" :
          st === "Not Applicable" ? "text-muted-foreground/50" : "text-muted-foreground";
        return <Icon key={key} className={`h-3.5 w-3.5 ${tone}`} aria-label={`${label}: ${st}`} />;
      })}
    </div>
  );
}

function NewChangeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const s = useCompliance();
  const [f, setF] = useState({
    title: "", regulator: "BNR", publishedAt: todayStr(), summary: "", fullTextRef: "",
    urgency: "Review", practiceAreas: "", assessmentOwner: "", assessmentDeadline: todayStr(),
  });
  const [obls, setObls] = useState<string[]>([]);

  const submit = () => {
    if (!f.title) return toast({ title: "Title required", variant: "destructive" });
    mutateCompliance((st) => ({
      ...st,
      changes: [
        {
          id: id("chg"),
          title: f.title,
          regulator: f.regulator as any,
          publishedAt: f.publishedAt,
          summary: f.summary,
          fullTextRef: f.fullTextRef,
          urgency: f.urgency as any,
          practiceAreas: f.practiceAreas.split(",").map((x) => x.trim()).filter(Boolean),
          affectedObligationIds: obls,
          affectedPolicyTitles: [],
          assessmentOwner: f.assessmentOwner,
          assessmentDeadline: f.assessmentDeadline,
          assessmentNotes: "",
          assessmentStatus: f.assessmentOwner ? "In Progress" : "Unassigned",
          loop: {
            obligation: { status: "Pending", note: "" },
            policy: { status: "Pending", note: "" },
            clause: { status: "Pending", note: "" },
            advisory: { status: f.urgency === "Action Required" ? "Pending" : "Not Applicable", note: "" },
          },
          loggedAt: new Date().toISOString(),
        },
        ...st.changes,
      ],
    }));
    toast({ title: "Change logged", description: "Downstream actions opened in the closed loop." });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Log regulatory change</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          <div><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Regulator</Label>
              <Select value={f.regulator} onValueChange={(v) => setF({ ...f, regulator: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REGULATORS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date published</Label><Input type="date" value={f.publishedAt} onChange={(e) => setF({ ...f, publishedAt: e.target.value })} /></div>
            <div><Label>Urgency</Label>
              <Select value={f.urgency} onValueChange={(v) => setF({ ...f, urgency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{URGENCIES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Summary</Label><Textarea rows={3} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} /></div>
          <div><Label>Full text reference (Legal Library)</Label><Input value={f.fullTextRef} onChange={(e) => setF({ ...f, fullTextRef: e.target.value })} /></div>
          <div><Label>Affected practice areas (comma separated)</Label><Input value={f.practiceAreas} onChange={(e) => setF({ ...f, practiceAreas: e.target.value })} /></div>
          <div>
            <Label>Affected obligations</Label>
            <div className="space-y-1 mt-1 border rounded p-2 max-h-40 overflow-y-auto">
              {s.obligations.map((o) => (
                <label key={o.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={obls.includes(o.id)} onCheckedChange={(v) =>
                    setObls((prev) => (v ? [...prev, o.id] : prev.filter((x) => x !== o.id)))} />
                  <span>{o.reference} — {o.title}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Impact assessment owner</Label><Input value={f.assessmentOwner} onChange={(e) => setF({ ...f, assessmentOwner: e.target.value })} /></div>
            <div><Label>Assessment deadline</Label><Input type="date" value={f.assessmentDeadline} onChange={(e) => setF({ ...f, assessmentDeadline: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter><Button onClick={submit}>Log change</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangeSheet({ change, onClose }: { change: RegChange | null; onClose: () => void }) {
  const s = useCompliance();
  if (!change) return null;

  const patch = (p: Partial<RegChange>) =>
    mutateCompliance((st) => ({ ...st, changes: st.changes.map((c) => (c.id === change.id ? { ...c, ...p } : c)) }));

  const patchLoop = (key: keyof RegChange["loop"], p: Partial<LoopAction>) =>
    patch({ loop: { ...change.loop, [key]: { ...change.loop[key], ...p } } });

  const affected = s.obligations.filter((o) => change.affectedObligationIds.includes(o.id));

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader><SheetTitle>{change.title}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{change.regulator}</Badge>
            <Badge variant="outline" className={urgencyTone[change.urgency]}>{change.urgency}</Badge>
            <Badge variant="outline">Published {change.publishedAt}</Badge>
          </div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">{change.summary}</div>
          <div className="text-xs text-muted-foreground">Full text: {change.fullTextRef || "—"}</div>

          <div className="border rounded-lg p-3 space-y-3">
            <div className="font-medium text-sm">Impact assessment</div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">Owner</Label>
                <Input value={change.assessmentOwner} onChange={(e) => patch({ assessmentOwner: e.target.value })} /></div>
              <div><Label className="text-xs">Deadline</Label>
                <Input type="date" value={change.assessmentDeadline} onChange={(e) => patch({ assessmentDeadline: e.target.value })} /></div>
              <div><Label className="text-xs">Status</Label>
                <Select value={change.assessmentStatus} onValueChange={(v) => patch({ assessmentStatus: v as RegChange["assessmentStatus"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Unassigned", "In Progress", "Complete"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Assessment notes</Label>
              <Textarea rows={3} value={change.assessmentNotes} onChange={(e) => patch({ assessmentNotes: e.target.value })} /></div>
            <div className="text-xs">
              <div className="text-muted-foreground mb-1">Affected obligations</div>
              {affected.length === 0 && <span className="text-muted-foreground">None linked.</span>}
              <div className="flex flex-wrap gap-1">
                {affected.map((o) => <Badge key={o.id} variant="outline">{o.reference} · {o.regulator}</Badge>)}
              </div>
            </div>
            <div className="text-xs">
              <div className="text-muted-foreground mb-1">Affected policies</div>
              <div className="flex flex-wrap gap-1">
                {change.affectedPolicyTitles.length === 0
                  ? <span className="text-muted-foreground">None linked.</span>
                  : change.affectedPolicyTitles.map((p) => <Badge key={p} variant="outline">{p}</Badge>)}
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-3 space-y-3">
            <div className="font-medium text-sm">Closed loop — downstream actions</div>
            {LOOP_KEYS.map(({ key, label, icon: Icon }) => {
              const a = change.loop[key];
              const StatusIcon = a.status === "Done" ? CheckCircle2 : a.status === "Not Applicable" ? Minus : CircleDashed;
              return (
                <div key={key} className="border rounded p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="h-4 w-4 text-muted-foreground" />{label}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`h-4 w-4 ${a.status === "Done" ? "text-emerald-600" : "text-muted-foreground"}`} />
                      <Select value={a.status} onValueChange={(v) => patchLoop(key, { status: v as LoopAction["status"], completedAt: v === "Done" ? new Date().toISOString() : undefined })}>
                        <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["Pending", "In Progress", "Done", "Not Applicable"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Input className="h-8 text-sm" value={a.note} placeholder="Action note"
                    onChange={(e) => patchLoop(key, { note: e.target.value })} />
                  {a.completedAt && (
                    <div className="text-[11px] text-muted-foreground">Completed {new Date(a.completedAt).toLocaleString()}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
