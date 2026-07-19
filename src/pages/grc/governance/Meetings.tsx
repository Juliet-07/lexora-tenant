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
import { Plus, Send, Paperclip, Trash2, CalendarClock, Users2, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useGov, mutateGov, gid, Meeting, AgendaItem, MeetingAttendee, BoardPackDoc } from "@/lib/grcGovernanceStore";

export default function GrcMeetings() {
  const s = useGov();
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<Meeting | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Meetings</h1>
          <p className="text-sm text-muted-foreground">
            Create board & committee meetings, assemble the board pack, and dispatch invites.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" />New meeting</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {s.meetings.map((m) => (
          <Card key={m.id} className="cursor-pointer hover:shadow-md transition" onClick={() => setSelected(m)}>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">{m.title}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1"><CalendarClock className="h-3 w-3" />{new Date(m.date).toLocaleString()}</div>
                </div>
                <Badge variant="outline">{m.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">{m.location}</div>
              <div className="flex gap-2 text-xs flex-wrap">
                <Badge variant="secondary">{m.type}</Badge>
                <Badge variant="outline"><Users2 className="h-3 w-3 mr-1" />{m.attendees.length}</Badge>
                <Badge variant="outline"><Paperclip className="h-3 w-3 mr-1" />{m.boardPack.length}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {s.meetings.length === 0 && (
          <div className="text-sm text-muted-foreground col-span-full text-center py-12">No meetings yet.</div>
        )}
      </div>

      <NewMeetingDialog open={newOpen} onOpenChange={setNewOpen} />
      <MeetingSheet meeting={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function NewMeetingDialog({ open, onOpenChange }: any) {
  const [f, setF] = useState<Omit<Meeting, "id" | "status" | "attendees" | "agenda" | "boardPack">>({
    title: "", type: "Board", date: new Date().toISOString().slice(0, 16),
    location: "", chair: "", notes: "",
  });
  const submit = () => {
    if (!f.title) return toast({ title: "Title required", variant: "destructive" });
    mutateGov((s) => ({ ...s, meetings: [{ id: gid("mt"), status: "Draft", attendees: [], agenda: [], boardPack: [], ...f }, ...s.meetings] }));
    toast({ title: "Meeting created" }); onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New meeting</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Type</Label>
              <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v as any })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Board", "Committee", "Executive", "Ad-hoc"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date & time</Label><Input type="datetime-local" value={f.date.slice(0, 16)} onChange={(e) => setF({ ...f, date: new Date(e.target.value).toISOString() })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Location</Label><Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></div>
            <div><Label>Chair</Label><Input value={f.chair} onChange={(e) => setF({ ...f, chair: e.target.value })} /></div>
          </div>
          <div><Label>Notes to attendees</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={submit}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MeetingSheet({ meeting, onClose }: { meeting: Meeting | null; onClose: () => void }) {
  const [att, setAtt] = useState<MeetingAttendee>({ name: "", email: "", role: "" });
  const [ag, setAg] = useState<AgendaItem>({ title: "", presenter: "", minutes: 10 });
  const [doc, setDoc] = useState<BoardPackDoc>({ name: "", uploadedAt: "" });

  if (!meeting) return null;
  const patch = (p: Partial<Meeting>) =>
    mutateGov((s) => ({ ...s, meetings: s.meetings.map((m) => m.id === meeting.id ? { ...m, ...p } : m) }));

  const send = () => {
    if (meeting.attendees.length === 0) return toast({ title: "Add attendees first", variant: "destructive" });
    patch({ status: "Sent", sentAt: new Date().toISOString() });
    toast({ title: "Meeting pack dispatched", description: `Sent to ${meeting.attendees.length} recipient(s).` });
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader><SheetTitle>{meeting.title}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{meeting.type}</Badge>
            <Badge variant="outline">{meeting.status}</Badge>
            <Badge variant="outline">{new Date(meeting.date).toLocaleString()}</Badge>
          </div>
          <div className="text-sm"><span className="text-muted-foreground">Chair:</span> {meeting.chair} · <span className="text-muted-foreground">Location:</span> {meeting.location}</div>

          <section className="border-t pt-4 space-y-2">
            <div className="font-medium text-sm flex items-center gap-2"><Users2 className="h-4 w-4" />Attendees ({meeting.attendees.length})</div>
            <div className="space-y-1">
              {meeting.attendees.map((a, i) => (
                <div key={i} className="flex justify-between text-xs border rounded px-2 py-1">
                  <span>{a.name} <span className="text-muted-foreground">{a.email}</span></span>
                  <button onClick={() => patch({ attendees: meeting.attendees.filter((_, x) => x !== i) })}><Trash2 className="h-3 w-3 text-muted-foreground" /></button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Name" value={att.name} onChange={(e) => setAtt({ ...att, name: e.target.value })} />
              <Input placeholder="Email" value={att.email} onChange={(e) => setAtt({ ...att, email: e.target.value })} />
              <div className="flex gap-1">
                <Input placeholder="Role" value={att.role} onChange={(e) => setAtt({ ...att, role: e.target.value })} />
                <Button size="sm" variant="outline" onClick={() => { if (!att.name || !att.email) return; patch({ attendees: [...meeting.attendees, att] }); setAtt({ name: "", email: "", role: "" }); }}>Add</Button>
              </div>
            </div>
          </section>

          <section className="border-t pt-4 space-y-2">
            <div className="font-medium text-sm">Agenda</div>
            <div className="space-y-1">
              {meeting.agenda.map((a, i) => (
                <div key={i} className="flex justify-between text-xs border rounded px-2 py-1">
                  <span>{i + 1}. {a.title} <span className="text-muted-foreground">{a.presenter && `— ${a.presenter}`}</span></span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{a.minutes}m</span>
                    <button onClick={() => patch({ agenda: meeting.agenda.filter((_, x) => x !== i) })}><Trash2 className="h-3 w-3 text-muted-foreground" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-6 gap-2">
              <Input className="col-span-3" placeholder="Item title" value={ag.title} onChange={(e) => setAg({ ...ag, title: e.target.value })} />
              <Input className="col-span-2" placeholder="Presenter" value={ag.presenter} onChange={(e) => setAg({ ...ag, presenter: e.target.value })} />
              <div className="flex gap-1">
                <Input type="number" placeholder="min" value={ag.minutes} onChange={(e) => setAg({ ...ag, minutes: Number(e.target.value) })} />
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => { if (!ag.title) return; patch({ agenda: [...meeting.agenda, ag] }); setAg({ title: "", presenter: "", minutes: 10 }); }}>Add agenda item</Button>
          </section>

          <section className="border-t pt-4 space-y-2">
            <div className="font-medium text-sm flex items-center gap-2"><Paperclip className="h-4 w-4" />Board pack</div>
            <div className="space-y-1">
              {meeting.boardPack.map((d, i) => (
                <div key={i} className="flex justify-between text-xs border rounded px-2 py-1">
                  <span>{d.name}</span>
                  <button onClick={() => patch({ boardPack: meeting.boardPack.filter((_, x) => x !== i) })}><Trash2 className="h-3 w-3 text-muted-foreground" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Document name (e.g. CEO_Report.pdf)" value={doc.name} onChange={(e) => setDoc({ ...doc, name: e.target.value })} />
              <Button size="sm" variant="outline" onClick={() => { if (!doc.name) return; patch({ boardPack: [...meeting.boardPack, { name: doc.name, uploadedAt: new Date().toISOString() }] }); setDoc({ name: "", uploadedAt: "" }); }}>Attach</Button>
            </div>
          </section>

          <section className="border-t pt-4 space-y-2">
            <div className="font-medium text-sm">Notes / cover message</div>
            <Textarea rows={3} value={meeting.notes} onChange={(e) => patch({ notes: e.target.value })} />
          </section>

          <section className="border-t pt-4 space-y-2">
            <div className="font-medium text-sm">Minutes</div>
            <Textarea rows={4} value={meeting.minutes ?? ""} placeholder="Add minutes after the meeting…" onChange={(e) => patch({ minutes: e.target.value })} />
            <div className="flex justify-end gap-2">
              {meeting.status !== "Held" && <Button variant="outline" onClick={() => patch({ status: "Held" })}>Mark held</Button>}
              <Button onClick={send} disabled={meeting.status === "Sent" || meeting.status === "Held"}>
                <Send className="h-4 w-4 mr-1" />{meeting.status === "Sent" ? "Dispatched" : "Send meeting pack"}
              </Button>
            </div>
            {meeting.sentAt && <div className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />Dispatched {new Date(meeting.sentAt).toLocaleString()}</div>}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
