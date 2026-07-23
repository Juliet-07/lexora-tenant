import { useState } from "react";
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
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/RichTextEditor";
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
} from "@/lib/grc/governance-api";

export default function GrcMeetings() {
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<Meeting | null>(null);

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["grc-meetings"],
    queryFn: fetchMeetings,
  });
  const selectedLive = selected
    ? (meetings.find((m) => m._id === selected._id) ?? selected)
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading meetings…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Meetings</h1>
          <p className="text-sm text-muted-foreground">
            Create board & committee meetings, assemble the board pack, and
            dispatch invites.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New meeting
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {meetings.map((m) => (
          <Card
            key={m._id}
            className="cursor-pointer hover:shadow-md transition"
            onClick={() => setSelected(m)}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">{m.title}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    {new Date(m.date).toLocaleString()}
                  </div>
                </div>
                <Badge variant="outline">{m.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">{m.location}</div>
              <div className="flex gap-2 text-xs flex-wrap">
                <Badge variant="secondary">{m.type}</Badge>
                <Badge variant="outline">
                  <Users2 className="h-3 w-3 mr-1" />
                  {m.attendees.length}
                </Badge>
                <Badge variant="outline">
                  <Paperclip className="h-3 w-3 mr-1" />
                  {m.boardPack.length}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {meetings.length === 0 && (
          <div className="text-sm text-muted-foreground col-span-full text-center py-12">
            No meetings yet.
          </div>
        )}
      </div>

      <NewMeetingDialog open={newOpen} onOpenChange={setNewOpen} />
      <MeetingSheet meeting={selectedLive} onClose={() => setSelected(null)} />
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

  if (!meeting) return null;

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{meeting.title}</SheetTitle>
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
                disabled={
                  sendMinutesMut.isPending ||
                  !minutes.trim() ||
                  !!meeting.minutesSentAt
                }
              >
                <Send className="h-4 w-4 mr-1" />
                {meeting.minutesSentAt ? "Minutes sent" : "Send minutes"}
              </Button>
              {meeting.minutesSentAt && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Sent {new Date(meeting.minutesSentAt).toLocaleString()}
                </div>
              )}
            </section>
          )}

          {/* Attendance registration — only meaningful once the meeting is held */}
          <AttendanceSection meeting={meeting} />
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
            <Button size="sm" variant="outline" onClick={startEditing}>
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
            disabled={meeting.attendees.length === 0}
          >
            Register attendance
          </Button>
          {meeting.attendees.length === 0 && (
            <p className="text-[11px] text-muted-foreground">
              Add attendees above before registering attendance.
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
