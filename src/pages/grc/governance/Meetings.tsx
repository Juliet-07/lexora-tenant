import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Send,
  Paperclip,
  Trash2,
  CalendarClock,
  Users2,
  Mail,
  Loader2,
  FileCheck,
  ClipboardCheck,
  Link2,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  fetchMeetings,
  createMeeting,
  addAttendee,
  removeAttendee,
  addAgendaItem,
  removeAgendaItem,
  addBoardPackDoc,
  removeBoardPackDoc,
  updateMeetingNotes,
  updateMeetingMinutes,
  markMeetingHeld,
  dispatchMeeting,
  sendMeetingMinutes,
  fetchBoardMembers,
  fetchCommittees,
  resolveGrcFileUrl,
  recordAttendance,
  type Meeting,
  type MeetingAudienceType,
  type MeetingMode,
  type MeetingPlatform,
  postponeMeeting,
  resumeMeeting,
  deleteMeeting,
} from "@/lib/grc/governance-api";
import {
  shareMinutesSnapshot,
  encodeMinutesToken,
  useMinutesReviews,
} from "@/lib/grcGovernanceLocal";
import { MeetingWorkspace } from "@/components/grc/meetings/MeetingWorkspace";

const demoMeeting = (id: string, title: string, type: any, daysOff: number, status: any, agenda: string[]): Meeting => ({
  _id: id, title, type, date: new Date(Date.now() + daysOff * 864e5).toISOString(), mode: "Physical",
  venue: "Boardroom 1", meetingLink: null, platform: null, location: "Lexora Kigali, Boardroom 1 / Zoom hybrid",
  chair: "Upendo Mbeki", committeeId: null, notes: "", status,
  attendees: [
    { name: "Upendo Mbeki", email: "u.mbeki@lexora.rw", role: "Chair" },
    { name: "Naledi Mokoena", email: "n.mokoena@lexora.rw", role: "Director" },
    { name: "James Karenzi", email: "j.karenzi@lexora.rw", role: "Director" },
    { name: "Eric Nsabimana", email: "e.nsabimana@lexora.rw", role: "Director" },
    { name: "Grace Kamau", email: "g.kamau@lexora.rw", role: "Director" },
    { name: "Mkhululi Ndlovu", email: "m.ndlovu@lexora.rw", role: "Director" },
  ] as any,
  agenda: agenda.map((t) => ({ title: t, minutes: 20 })) as any,
  boardPack: [{ name: "Meeting notice & agenda", uploadedAt: new Date().toISOString() }] as any,
  sentAt: status !== "Draft" ? new Date(Date.now() + (daysOff - 19) * 864e5).toISOString() : null,
  minutes: null, minutesSentAt: null, postponementReason: null, postponedAt: null,
  attendanceAllPresent: status === "Held" ? true : null, attendancePresentIndices: [], attendanceRecordedAt: status === "Held" ? new Date().toISOString() : null,
  acknowledgments: [], ackTokens: [], minutesPdfUrl: null, minutesReviews: [],
});

const DEMO_MEETINGS: Meeting[] = [
  demoMeeting("demo_q3", "Q3 Board meeting", "Board", 9, "Sent", ["Opening, quorum, and adoption of agenda", "Confirmation of previous minutes & matters arising", "CEO quarterly update & Q3 financial review", "Audit Committee report — interim results", "Approval of Q3 interim dividend declaration", "Anti-Bribery & Corruption Policy — ratification", "Any other business & close"]),
  demoMeeting("demo_audit", "Audit Committee meeting", "Committee", 17, "Draft", ["Opening", "Interim results review", "External audit plan"]),
  demoMeeting("demo_nom", "Nomination Committee — succession planning", "Committee", 22, "Draft", ["Director term expiry planning"]),
  demoMeeting("demo_q2", "Q2 Board meeting", "Board", -90, "Held", ["Opening, quorum, and adoption of agenda", "CEO update", "Approval of Delegation of Authority update"]),
];

const DEMO_ACTIONS = [
  { action: "Circulate revised CoI Policy to Board", source: "Q2 Board, 10 Jun", owner: "Rudo Sibanda", due: "21 Aug (overdue)", status: "Overdue" },
  { action: "Obtain Nsabimana signature on RES-2026-020", source: "Board, 15 Jul", owner: "Rudo Sibanda", due: "30 Jul (overdue)", status: "Overdue" },
  { action: "Prepare succession briefing pack for Nomination", source: "Q2 Board, 10 Jun", owner: "Rudo Sibanda", due: "10 Sep 2026", status: "In progress" },
  { action: "Update internal controls matrix post-audit", source: "Audit Comm., 18 Jun", owner: "James Karenzi", due: "30 Sep 2026", status: "In progress" },
  { action: "Present ESG reporting framework options", source: "Q2 Board, 10 Jun", owner: "Grace Kamau", due: "2 Sep 2026", status: "Not started" },
];

export default function GrcMeetings() {
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<Meeting | null>(null);
  const [workspace, setWorkspace] = useState<Meeting | null>(null);
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");

  const { data: apiMeetings = [], isLoading } = useQuery({
    queryKey: ["grc-meetings"],
    queryFn: fetchMeetings,
    retry: 1,
  });
  const isDemo = apiMeetings.length === 0;
  const meetings = isDemo ? DEMO_MEETINGS : apiMeetings;
  const selectedLive = selected
    ? (meetings.find((m) => m._id === selected._id) ?? selected)
    : null;
  const workspaceLive = workspace
    ? (meetings.find((m) => m._id === workspace._id) ?? workspace)
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading meetings…</span>
      </div>
    );
  }

  if (workspaceLive) {
    const demo = workspaceLive._id.startsWith("demo_");
    return (
      <>
        <MeetingWorkspace
          meeting={workspaceLive}
          isDemo={demo}
          onBack={() => setWorkspace(null)}
          onManage={demo ? undefined : () => setSelected(workspaceLive)}
        />
        <MeetingSheet meeting={selectedLive} onClose={() => setSelected(null)} />
      </>
    );
  }

  const now = Date.now();
  const upcoming = meetings.filter((m) => new Date(m.date).getTime() >= now).sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const past = meetings.filter((m) => new Date(m.date).getTime() < now).sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const list = filter === "upcoming" ? upcoming : filter === "past" ? past : [...upcoming, ...past];
  const minutesOutstanding = past.filter((m) => !m.minutesSentAt).length;
  const packsPending = upcoming.filter((m) => m.status === "Draft").length;
  const attRate = (() => {
    const rec = past.filter((m) => m.attendanceRecordedAt);
    if (!rec.length) return isDemo ? 92 : null;
    const pct = rec.map((m) => (m.attendanceAllPresent ? 100 : (m.attendancePresentIndices.length / Math.max(1, m.attendees.length)) * 100));
    return Math.round(pct.reduce((a, b) => a + b, 0) / pct.length);
  })();

  const kpis = [
    { label: "Meetings YTD", value: meetings.length, sub: `${past.length} held, ${upcoming.length} upcoming` },
    { label: "Avg attendance", value: attRate === null ? "—" : `${attRate}%`, sub: "Recorded meetings" },
    { label: "Minutes outstanding", value: minutesOutstanding, sub: "Past meetings" },
    { label: "Action items open", value: DEMO_ACTIONS.length, sub: `${DEMO_ACTIONS.filter((a) => a.status === "Overdue").length} overdue` },
    { label: "Board packs pending", value: packsPending, sub: "Upcoming meetings" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Meetings</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Board and committee meetings — full Company Secretary workflow from scheduling through minutes approval, with board pack assembly, checklist, and post-meeting actions.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Schedule meeting
        </Button>
      </div>

      {isDemo && (
        <div className="text-xs rounded-md border bg-muted/40 px-3 py-2 text-muted-foreground">
          Showing sample meetings. Schedule your first meeting to replace them.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{k.label}</div>
            <div className="text-2xl font-bold mt-1">{k.value}</div>
            <div className="text-[11px] text-muted-foreground">{k.sub}</div>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex gap-1 border-b">
        {([["upcoming", `Upcoming (${upcoming.length})`], ["past", `Past (${past.length})`], ["all", "All meetings"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`px-3 py-2 text-sm border-b-2 -mb-px ${filter === k ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground"}`}>{l}</button>
        ))}
      </div>

      <div className="space-y-2">
        {list.map((m) => {
          const d = new Date(m.date);
          const isPast = d.getTime() < now;
          const label = isPast ? (m.minutesSentAt ? "Complete" : "Minutes outstanding") : m.status === "Draft" ? "Agenda draft" : m.status === "Postponed" ? "Postponed" : "Preparing";
          return (
            <Card key={m._id} className="cursor-pointer hover:shadow-md transition" onClick={() => setWorkspace(m)}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-14 text-center rounded-lg bg-primary/10 py-1.5 shrink-0">
                  <div className="text-xl font-bold text-primary leading-none">{d.getDate()}</div>
                  <div className="text-[10px] font-semibold text-primary">{d.toLocaleString("en", { month: "short" }).toUpperCase()}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{m.title}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                    <span>{m.type}</span>
                    <span>{m.agenda.length} agenda items</span>
                    <span className="flex items-center gap-1"><Users2 className="h-3 w-3" />{m.attendees.length}</span>
                    <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" />{m.boardPack.length} docs</span>
                    <span>{m.location}</span>
                  </div>
                </div>
                <Badge variant={label === "Complete" ? "default" : label === "Minutes outstanding" ? "destructive" : "secondary"}>{label}</Badge>
              </CardContent>
            </Card>
          );
        })}
        {list.length === 0 && <div className="text-sm text-muted-foreground text-center py-12">No meetings here.</div>}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="font-semibold mb-3 flex items-center gap-2"><ClipboardCheck className="h-4 w-4" />Open action items across all meetings</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted-foreground border-b"><th className="py-2">Action</th><th>Meeting source</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead>
              <tbody>{DEMO_ACTIONS.map((a) => (
                <tr key={a.action} className="border-b last:border-0"><td className="py-2 font-medium">{a.action}</td><td>{a.source}</td><td>{a.owner}</td><td>{a.due}</td>
                  <td><Badge variant={a.status === "Overdue" ? "destructive" : a.status === "In progress" ? "secondary" : "outline"}>{a.status}</Badge></td></tr>
              ))}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <NewMeetingDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}

function NewMeetingDialog({ open, onOpenChange }: any) {
  const queryClient = useQueryClient();
  const { data: boardMembers = [] } = useQuery({
    queryKey: ["grc-board-members"],
    queryFn: fetchBoardMembers,
    enabled: open,
  });
  const { data: committees = [] } = useQuery({
    queryKey: ["grc-committees"],
    queryFn: fetchCommittees,
    enabled: open,
  });
  const boardChair = boardMembers.find((b) => b.role === "Chair")?.name ?? "";

  const [f, setF] = useState({
    title: "",
    type: "Board" as MeetingAudienceType,
    date: new Date().toISOString().slice(0, 16),
    mode: "Physical" as MeetingMode,
    venue: "",
    meetingLink: "",
    platform: undefined as MeetingPlatform | undefined,
    chair: "",
    notes: "",
    committeeId: undefined as string | undefined,
  });

  const setType = (v: MeetingAudienceType) => {
    let chair = "";
    if (v === "Board") chair = boardChair;
    setF((prev) => ({ ...prev, type: v, chair, committeeId: undefined }));
  };
  const setCommittee = (id: string) => {
    const c = committees.find((x) => x._id === id);
    setF((prev) => ({ ...prev, committeeId: id, chair: c?.chair ?? "" }));
  };

  const mutation = useMutation({
    mutationFn: () => createMeeting(f),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-meetings"] });
      toast({ title: "Meeting created" });
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast({
        title: "Failed to create meeting",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const submit = () => {
    if (!f.title)
      return toast({ title: "Title required", variant: "destructive" });
    if (f.mode === "Physical" && !f.venue)
      return toast({ title: "Venue required", variant: "destructive" });
    if (f.mode === "Online" && (!f.meetingLink || !f.platform))
      return toast({
        title: "Platform & meeting link required",
        variant: "destructive",
      });
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New meeting</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Type</Label>
              <Select
                value={f.type}
                onValueChange={(v) => setType(v as MeetingAudienceType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Board", "Committee", "Executive", "Ad-hoc"].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date & time</Label>
              <Input
                type="datetime-local"
                value={f.date}
                onChange={(e) => setF({ ...f, date: e.target.value })}
              />
            </div>
          </div>
          {f.type === "Committee" && (
            <div>
              <Label>Committee</Label>
              <Select value={f.committeeId ?? ""} onValueChange={setCommittee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select committee" />
                </SelectTrigger>
                <SelectContent>
                  {committees.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Meeting mode</Label>
            <Select
              value={f.mode}
              onValueChange={(v) => setF({ ...f, mode: v as MeetingMode })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Physical">Physical</SelectItem>
                <SelectItem value="Online">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {f.mode === "Physical" ? (
            <div>
              <Label>Venue</Label>
              <Input
                placeholder="e.g. Head Office Boardroom"
                value={f.venue}
                onChange={(e) => setF({ ...f, venue: e.target.value })}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Platform</Label>
                <Select
                  value={f.platform ?? ""}
                  onValueChange={(v) =>
                    setF({ ...f, platform: v as MeetingPlatform })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Zoom">Zoom</SelectItem>
                    <SelectItem value="Google Meet">Google Meet</SelectItem>
                    <SelectItem value="Microsoft Teams">
                      Microsoft Teams
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Meeting link</Label>
                <Input
                  placeholder="https://…"
                  value={f.meetingLink}
                  onChange={(e) => setF({ ...f, meetingLink: e.target.value })}
                />
              </div>
            </div>
          )}
          <div>
            <Label>
              Chair{" "}
              {(f.type === "Board" || f.type === "Committee") && (
                <span className="text-xs text-muted-foreground">
                  (auto-filled)
                </span>
              )}
            </Label>
            <Input
              value={f.chair}
              onChange={(e) => setF({ ...f, chair: e.target.value })}
            />
          </div>
          <div>
            <Label>Notes to attendees</Label>
            <Textarea
              rows={2}
              value={f.notes}
              onChange={(e) => setF({ ...f, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MeetingSheet({
  meeting,
  onClose,
}: {
  meeting: Meeting | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [att, setAtt] = useState({ name: "", email: "", role: "" });
  const [ag, setAg] = useState({
    title: "",
    presenter: "",
    durationMinutes: 10,
  });
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [notes, setNotes] = useState(meeting?.notes ?? "");
  const [minutes, setMinutes] = useState(meeting?.minutes ?? "");
  const [postponeOpen, setPostponeOpen] = useState(false);
  const [postponeReason, setPostponeReason] = useState("");

  useEffect(() => {
    setMinutes(meeting?.minutes ?? "");
    setNotes(meeting?.notes ?? "");
  }, [meeting?._id]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["grc-meetings"] });
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const addAttMut = useMutation({
    mutationFn: () => addAttendee(meeting!._id, att),
    onSuccess: () => {
      invalidate();
      setAtt({ name: "", email: "", role: "" });
    },
    onError: onErr("Failed to add attendee"),
  });
  const rmAttMut = useMutation({
    mutationFn: (i: number) => removeAttendee(meeting!._id, i),
    onSuccess: invalidate,
    onError: onErr("Failed to remove attendee"),
  });
  const addAgMut = useMutation({
    mutationFn: () => addAgendaItem(meeting!._id, ag),
    onSuccess: () => {
      invalidate();
      setAg({ title: "", presenter: "", durationMinutes: 10 });
    },
    onError: onErr("Failed to add agenda item"),
  });
  const rmAgMut = useMutation({
    mutationFn: (i: number) => removeAgendaItem(meeting!._id, i),
    onSuccess: invalidate,
    onError: onErr("Failed to remove agenda item"),
  });
  const addDocMut = useMutation({
    mutationFn: () => addBoardPackDoc(meeting!._id, pendingFile!),
    onSuccess: () => {
      invalidate();
      setPendingFile(null);
    },
    onError: onErr("Failed to upload document"),
  });
  const rmDocMut = useMutation({
    mutationFn: (i: number) => removeBoardPackDoc(meeting!._id, i),
    onSuccess: invalidate,
    onError: onErr("Failed to remove document"),
  });
  const notesMut = useMutation({
    mutationFn: () => updateMeetingNotes(meeting!._id, notes),
    onSuccess: () => {
      invalidate();
      toast({ title: "Notes saved" });
    },
    onError: onErr("Failed to save notes"),
  });
  const dispatchMut = useMutation({
    mutationFn: () => dispatchMeeting(meeting!._id),
    onSuccess: () => {
      invalidate();
      toast({
        title: "Meeting pack dispatched",
        description: `Sent to ${meeting!.attendees.length} recipient(s).`,
      });
    },
    onError: onErr("Failed to dispatch"),
  });
  const heldMut = useMutation({
    mutationFn: () => markMeetingHeld(meeting!._id),
    onSuccess: invalidate,
    onError: onErr("Failed to mark meeting as done"),
  });
  const postponeMut = useMutation({
    mutationFn: (reason: string) => postponeMeeting(meeting!._id, reason),
    onSuccess: () => {
      invalidate();
      setPostponeOpen(false);
      setPostponeReason("");
      toast({ title: "Meeting postponed" });
    },
    onError: onErr("Failed to postpone meeting"),
  });
  const resumeMut = useMutation({
    mutationFn: () => resumeMeeting(meeting!._id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Meeting resumed" });
    },
    onError: onErr("Failed to resume meeting"),
  });
  const minutesMut = useMutation({
    mutationFn: () => updateMeetingMinutes(meeting!._id, minutes),
    onSuccess: () => {
      invalidate();
      toast({ title: "Minutes saved" });
    },
    onError: onErr("Failed to save minutes"),
  });
  const sendMinutesMut = useMutation({
    mutationFn: () => sendMeetingMinutes(meeting!._id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Minutes sent to all attendees" });
    },
    onError: onErr("Failed to send minutes"),
  });
  const deleteMut = useMutation({
    mutationFn: () => deleteMeeting(meeting!._id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Meeting deleted" });
      onClose();
    },
    onError: onErr("Failed to delete meeting"),
  });

  if (!meeting) return null;

  const minutesReviews = meeting.minutesReviews ?? [];
  const allAttendeesApproved =
    meeting.attendees.length > 0 &&
    meeting.attendees.every((a) =>
      minutesReviews.some(
        (r) =>
          r.attendeeEmail.toLowerCase() === a.email.toLowerCase() &&
          r.decision === "approved",
      ),
    );

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="flex-row items-start justify-between gap-2 space-y-0">
          <SheetTitle className="flex-1">{meeting.title}</SheetTitle>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this meeting?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes "{meeting.title}", its agenda,
                  attendees, board pack, minutes, and any acknowledgements. This
                  action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => deleteMut.mutate()}
                  disabled={deleteMut.isPending}
                >
                  {deleteMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Delete meeting
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SheetHeader>
        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="outline">{meeting.type}</Badge>
            <Badge
              variant="outline"
              className={
                meeting.status === "Postponed"
                  ? "bg-amber-50 text-amber-700 border-amber-300"
                  : ""
              }
            >
              {meeting.status}
            </Badge>
            <Badge variant="outline">
              {new Date(meeting.date).toLocaleString()}
            </Badge>
            {meeting.status !== "Postponed" && meeting.status !== "Held" && (
              <Dialog open={postponeOpen} onOpenChange={setPostponeOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs ml-auto"
                  >
                    Postpone
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Postpone this meeting</DialogTitle>
                  </DialogHeader>
                  <Textarea
                    rows={3}
                    placeholder="Reason for postponement…"
                    value={postponeReason}
                    onChange={(e) => setPostponeReason(e.target.value)}
                  />
                  <DialogFooter>
                    <Button
                      variant="destructive"
                      disabled={!postponeReason.trim() || postponeMut.isPending}
                      onClick={() => postponeMut.mutate(postponeReason)}
                    >
                      {postponeMut.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Confirm postponement
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {meeting.status === "Postponed" && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2">
              <p className="text-sm text-amber-800">
                <span className="font-medium">Postponed</span>
                {meeting.postponedAt &&
                  ` on ${new Date(meeting.postponedAt).toLocaleDateString()}`}
                {meeting.postponementReason &&
                  `: ${meeting.postponementReason}`}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => resumeMut.mutate()}
                disabled={resumeMut.isPending}
              >
                {resumeMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Resume meeting
              </Button>
            </div>
          )}
          <div className="text-sm">
            <span className="text-muted-foreground">Chair:</span>{" "}
            {meeting.chair} ·{" "}
            <span className="text-muted-foreground">
              {meeting.mode === "Online" ? "Online" : "Venue"}:
            </span>{" "}
            {meeting.mode === "Online" ? (
              <a
                href={meeting.meetingLink ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                {meeting.platform} link
              </a>
            ) : (
              meeting.venue || meeting.location
            )}
          </div>

          {/* Attendees */}
          <section className="border-t pt-4 space-y-2">
            <div className="font-medium text-sm flex items-center gap-2">
              <Users2 className="h-4 w-4" />
              Attendees ({meeting.attendees.length})
            </div>
            <div className="space-y-1">
              {meeting.attendees.map((a, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center text-xs border rounded px-2 py-1 gap-2"
                >
                  <span className="truncate">
                    {a.name}{" "}
                    <span className="text-muted-foreground">{a.email}</span>
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => rmAttMut.mutate(i)}>
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="Name"
                value={att.name}
                onChange={(e) => setAtt({ ...att, name: e.target.value })}
              />
              <Input
                placeholder="Email"
                value={att.email}
                onChange={(e) => setAtt({ ...att, email: e.target.value })}
              />
              <div className="flex gap-1">
                <Input
                  placeholder="Role"
                  value={att.role}
                  onChange={(e) => setAtt({ ...att, role: e.target.value })}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!att.name || !att.email || addAttMut.isPending}
                  onClick={() => addAttMut.mutate()}
                >
                  {addAttMut.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Add"
                  )}
                </Button>
              </div>
            </div>
          </section>

          {/* Agenda */}
          <section className="border-t pt-4 space-y-2">
            <div className="font-medium text-sm">Agenda</div>
            <div className="space-y-1">
              {meeting.agenda.map((a, i) => (
                <div
                  key={i}
                  className="flex justify-between text-xs border rounded px-2 py-1"
                >
                  <span>
                    {i + 1}. {a.title}{" "}
                    <span className="text-muted-foreground">
                      {a.presenter && `— ${a.presenter}`}
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {a.durationMinutes}m
                    </span>
                    <button onClick={() => rmAgMut.mutate(i)}>
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-6 gap-2">
              <Input
                className="col-span-3"
                placeholder="Item title"
                value={ag.title}
                onChange={(e) => setAg({ ...ag, title: e.target.value })}
              />
              <Input
                className="col-span-2"
                placeholder="Presenter"
                value={ag.presenter}
                onChange={(e) => setAg({ ...ag, presenter: e.target.value })}
              />
              <Input
                type="number"
                placeholder="min"
                value={ag.durationMinutes}
                onChange={(e) =>
                  setAg({ ...ag, durationMinutes: Number(e.target.value) })
                }
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={!ag.title || addAgMut.isPending}
              onClick={() => addAgMut.mutate()}
            >
              Add agenda item
            </Button>
          </section>

          {/* Board pack — real file upload */}
          <section className="border-t pt-4 space-y-2">
            <div className="font-medium text-sm flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Board pack
            </div>
            <div className="space-y-1">
              {meeting.boardPack.map((d, i) => (
                <div
                  key={i}
                  className="flex justify-between text-xs border rounded px-2 py-1 items-center"
                >
                  {d.fileUrl ? (
                    <a
                      href={resolveGrcFileUrl(d.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      {d.name}
                    </a>
                  ) : (
                    <span>{d.name}</span>
                  )}
                  <button onClick={() => rmDocMut.mutate(i)}>
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              ))}
              {meeting.boardPack.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  No documents yet.
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                type="file"
                onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!pendingFile || addDocMut.isPending}
                onClick={() => addDocMut.mutate()}
              >
                {addDocMut.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Upload"
                )}
              </Button>
            </div>
          </section>

          {/* Notes / cover message */}
          <section className="border-t pt-4 space-y-2">
            <div className="font-medium text-sm">Notes / cover message</div>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => notesMut.mutate()}
                disabled={notesMut.isPending}
              >
                Save notes
              </Button>
            </div>
          </section>

          {/* Step 1: dispatch the pre-meeting pack */}
          {meeting.status !== "Postponed" && (
            <section className="border-t pt-4 space-y-2">
              <div className="font-medium text-sm">Send meeting pack</div>
              <p className="text-xs text-muted-foreground">
                Sends the notes, agenda, and board pack to all attendees ahead
                of the meeting.
              </p>
              <Button
                onClick={() => dispatchMut.mutate()}
                disabled={
                  meeting.status === "Sent" ||
                  meeting.status === "Held" ||
                  dispatchMut.isPending
                }
              >
                <Send className="h-4 w-4 mr-1" />
                {meeting.status === "Sent" || meeting.status === "Held"
                  ? "Dispatched"
                  : "Send meeting pack"}
              </Button>
              {meeting.sentAt && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Dispatched {new Date(meeting.sentAt).toLocaleString()}
                </div>
              )}
            </section>
          )}

          {/* Acknowledgements from external attendees */}
          <section className="border-t pt-4 space-y-2">
            <div className="font-medium text-sm flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Board pack acknowledgements (
              {(meeting.acknowledgments ?? []).length})
            </div>
            {(meeting.acknowledgments ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No acknowledgements yet — attendees receive their personal
                acknowledgement link automatically when you send the meeting
                pack.
              </p>
            ) : (
              <div className="space-y-1">
                {(meeting.acknowledgments ?? []).map((a) => (
                  <div
                    key={a.attendeeEmail}
                    className="flex justify-between items-center text-xs border rounded px-2 py-1"
                  >
                    <span>
                      <span className="font-medium">{a.attendeeName}</span>{" "}
                      <span className="text-muted-foreground">
                        {a.attendeeEmail}
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      {a.documents.length} doc
                      {a.documents.length !== 1 ? "s" : ""} ·{" "}
                      {new Date(a.confirmedAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Step 2: mark the meeting as done, separate from step 1 */}
          {meeting.status !== "Held" && meeting.status !== "Postponed" && (
            <section className="border-t pt-4 space-y-2">
              <div className="font-medium text-sm">Mark meeting as done</div>
              <p className="text-xs text-muted-foreground">
                Once the meeting has taken place, mark it done to unlock minutes
                distribution.
              </p>
              <Button
                variant="outline"
                onClick={() => heldMut.mutate()}
                disabled={heldMut.isPending}
              >
                {heldMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Mark as done
              </Button>
            </section>
          )}

          {/* Attendance registration — only meaningful once the meeting is held */}
          <AttendanceSection meeting={meeting} />

          {allAttendeesApproved ? (
            /* Fully approved — nothing left to edit or send, so the
               editor is replaced entirely rather than shown empty/
               disabled, which would just invite confusion. */
            <section className="border-t pt-4 space-y-3">
              <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">
                    Minutes fully approved
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    All {meeting.attendees.length} attendee
                    {meeting.attendees.length === 1 ? "" : "s"} have approved
                    these minutes. No further changes are needed.
                  </p>
                </div>
              </div>
              <MinutesReviewsSection meeting={meeting} />
            </section>
          ) : (
            <>
              {/* Minutes — always writable */}
              <section className="border-t pt-4 space-y-2">
                <div className="font-medium text-sm">Minutes</div>
                <RichTextEditor
                  value={minutes}
                  onChange={setMinutes}
                  placeholder="Write the minutes here…"
                  minHeight={180}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => minutesMut.mutate()}
                    disabled={minutesMut.isPending}
                  >
                    Save minutes
                  </Button>
                </div>
              </section>

              {/* Step 3: a genuinely separate flow, only once the meeting is done */}
              {meeting.status === "Held" && (
                <section className="border-t pt-4 space-y-2">
                  <div className="font-medium text-sm flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    Distribute minutes
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Send the finalized minutes to every attendee.
                  </p>
                  <Button
                    onClick={() => sendMinutesMut.mutate()}
                    disabled={sendMinutesMut.isPending || !minutes.trim()}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    {meeting.minutesSentAt ? "Resend minutes" : "Send minutes"}
                  </Button>
                  {meeting.minutesSentAt && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Sent {new Date(meeting.minutesSentAt).toLocaleString()}
                    </div>
                  )}
                  {meeting.minutesSentAt && (
                    <MinutesReviewsSection meeting={meeting} />
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AttendanceSection({ meeting }: { meeting: Meeting }) {
  const queryClient = useQueryClient();
  const attendance = meeting.attendanceRecordedAt
    ? {
        allAttended: meeting.attendanceAllPresent!,
        presentIndices: meeting.attendancePresentIndices,
        recordedAt: meeting.attendanceRecordedAt,
      }
    : null;
  const attendanceMut = useMutation({
    mutationFn: (v: {
      allAttended: boolean;
      presentIndices: number[];
      absenceNotes?: { index: number; note: string }[];
    }) =>
      recordAttendance(
        meeting._id,
        v.allAttended,
        v.presentIndices,
        v.absenceNotes,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-meetings"] });
      setEditing(false);
      toast({ title: "Attendance recorded" });
    },
    onError: () =>
      toast({ title: "Failed to record attendance", variant: "destructive" }),
  });
  const [editing, setEditing] = useState(false);
  const [allAttended, setAllAttended] = useState<"yes" | "no" | "">(
    attendance?.allAttended == null
      ? ""
      : attendance.allAttended
        ? "yes"
        : "no",
  );
  const [present, setPresent] = useState<number[]>(
    attendance?.presentIndices ?? [],
  );
  const [absenceNotes, setAbsenceNotes] = useState<Record<number, string>>({});

  const startEditing = () => {
    setAllAttended(
      attendance?.allAttended == null
        ? ""
        : attendance.allAttended
          ? "yes"
          : "no",
    );
    setPresent(attendance?.presentIndices ?? []);
    setEditing(true);
  };

  const toggle = (i: number) =>
    setPresent((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  const save = () => {
    if (!allAttended) {
      toast({
        title: "Select whether all parties attended",
        variant: "destructive",
      });
      return;
    }
    if (allAttended === "no" && present.length === 0) {
      toast({ title: "Select who attended", variant: "destructive" });
      return;
    }
    const notes = Object.entries(absenceNotes)
      .map(([index, note]) => ({ index: Number(index), note: note.trim() }))
      .filter((n) => n.note);
    attendanceMut.mutate({
      allAttended: allAttended === "yes",
      presentIndices: present,
      absenceNotes: allAttended === "no" ? notes : undefined,
    });
  };

  const recorded = attendance?.recordedAt != null;
  const presentNames =
    attendance?.allAttended === false
      ? attendance.presentIndices
          .map((i) => meeting.attendees[i]?.name)
          .filter(Boolean)
      : [];
  const absentees =
    attendance?.allAttended === false
      ? meeting.attendees
          .map((a, i) => ({ a, i }))
          .filter(({ i }) => !attendance.presentIndices.includes(i))
          .map(({ a }) => a.name)
      : [];

  return (
    <section className="border-t pt-4 space-y-2">
      <div className="font-medium text-sm flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4" />
        Attendance register
        {recorded && !editing && (
          <Badge variant="outline" className="ml-auto text-[10px]">
            Recorded {new Date(attendance!.recordedAt!).toLocaleDateString()}
          </Badge>
        )}
      </div>

      {!editing && recorded && (
        <div className="text-xs space-y-1 border rounded p-2 bg-muted/30">
          {attendance!.allAttended ? (
            <div className="text-emerald-700">
              All {meeting.attendees.length} attendees were present.
            </div>
          ) : (
            <>
              <div>
                <span className="text-muted-foreground">
                  Present ({presentNames.length}):
                </span>{" "}
                {presentNames.join(", ") || "—"}
              </div>
              <div>
                <span className="text-muted-foreground">
                  Absent ({absentees.length}):
                </span>{" "}
                {absentees.join(", ") || "—"}
              </div>
            </>
          )}
          <div className="pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={startEditing}
              disabled={meeting.status !== "Held"}
            >
              Update
            </Button>
          </div>
        </div>
      )}

      {!editing && !recorded && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Did all invited attendees attend the meeting?
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={startEditing}
            disabled={
              meeting.attendees.length === 0 || meeting.status !== "Held"
            }
          >
            Register attendance
          </Button>
          {meeting.attendees.length === 0 && (
            <p className="text-[11px] text-muted-foreground">
              Add attendees above before registering attendance.
            </p>
          )}
          {meeting.attendees.length > 0 && meeting.status !== "Held" && (
            <p className="text-[11px] text-muted-foreground">
              Mark the meeting as done before registering attendance.
            </p>
          )}
        </div>
      )}

      {editing && (
        <div className="space-y-3 border rounded p-3 bg-muted/30">
          <div>
            <Label className="text-xs">Did all parties attend?</Label>
            <Select
              value={allAttended}
              onValueChange={(v) => setAllAttended(v as "yes" | "no")}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes — all attended</SelectItem>
                <SelectItem value="no">No — partial attendance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {allAttended === "no" && (
            <div>
              <Label className="text-xs">Select who attended</Label>
              <div className="mt-1 space-y-1 max-h-56 overflow-y-auto">
                {meeting.attendees.map((a, i) => (
                  <div key={i} className="border rounded px-2 py-1">
                    <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-background">
                      <input
                        type="checkbox"
                        checked={present.includes(i)}
                        onChange={() => toggle(i)}
                      />
                      <span className="flex-1 truncate">
                        {a.name}{" "}
                        <span className="text-muted-foreground">{a.email}</span>
                      </span>
                      {a.role && (
                        <Badge variant="outline" className="text-[10px]">
                          {a.role}
                        </Badge>
                      )}
                    </label>
                    {!present.includes(i) && (
                      <Input
                        className="h-6 text-[11px] mt-1"
                        placeholder="Reason (optional) — e.g. Apologies submitted"
                        value={absenceNotes[i] ?? ""}
                        onChange={(e) =>
                          setAbsenceNotes((prev) => ({
                            ...prev,
                            [i]: e.target.value,
                          }))
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {present.length} of {meeting.attendees.length} selected
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={save}>
              Save attendance
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function MinutesReviewsSection({ meeting }: { meeting: Meeting }) {
  const minutesReviews = meeting.minutesReviews ?? [];
  const byEmail = new Map(
    minutesReviews.map((r) => [r.attendeeEmail.toLowerCase(), r]),
  );
  const approved = minutesReviews.filter(
    (r) => r.decision === "approved",
  ).length;
  const changes = minutesReviews.filter(
    (r) => r.decision === "changes-requested",
  ).length;

  return (
    <div className="mt-4 border-t pt-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          Minutes review status
        </div>
        <div className="flex gap-2 text-xs">
          <Badge
            variant="outline"
            className="gap-1 text-emerald-700 border-emerald-300 bg-emerald-50"
          >
            <CheckCircle2 className="h-3 w-3" /> {approved} approved
          </Badge>
          <Badge
            variant="outline"
            className="gap-1 text-amber-700 border-amber-300 bg-amber-50"
          >
            <MessageSquare className="h-3 w-3" /> {changes} changes
          </Badge>
        </div>
      </div>
      <div className="space-y-2">
        {meeting.attendees.map((a) => {
          const r = byEmail.get(a.email.toLowerCase());
          return (
            <div
              key={a.email}
              className="border rounded-md p-2.5 bg-muted/20 space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium flex-1 truncate">
                  {a.name}
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({a.email})
                  </span>
                </div>
                {r ? (
                  r.decision === "approved" ? (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Approved
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 gap-1">
                      <MessageSquare className="h-3 w-3" /> Changes requested
                    </Badge>
                  )
                ) : (
                  <Badge variant="outline">Awaiting</Badge>
                )}
              </div>
              {r?.comment && (
                <p className="text-xs text-muted-foreground border-l-2 pl-2 whitespace-pre-wrap">
                  {r.comment}
                </p>
              )}
              {r && (
                <div className="text-[11px] text-muted-foreground">
                  {new Date(r.submittedAt).toLocaleString()}
                </div>
              )}
            </div>
          );
        })}
        {meeting.attendees.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No attendees to send review links to.
          </p>
        )}
      </div>
    </div>
  );
}
