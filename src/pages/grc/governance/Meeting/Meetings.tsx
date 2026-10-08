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
  updateMeetingMinutes,
  markMeetingHeld,
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
  deleteMeeting,
} from "@/lib/grc/governance-api";
import {
  shareMinutesSnapshot,
  encodeMinutesToken,
  useMinutesReviews,
} from "@/lib/grcGovernanceLocal";
import { MeetingWorkspace } from "@/components/grc/meetings/MeetingWorkspace";

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
  const meetings = apiMeetings;
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
    return (
      <>
        <MeetingWorkspace
          meeting={workspaceLive}
          onBack={() => setWorkspace(null)}
        />
      </>
    );
  }

  const now = Date.now();
  const upcoming = meetings
    .filter((m) => new Date(m.date).getTime() >= now)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const past = meetings
    .filter((m) => new Date(m.date).getTime() < now)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const list =
    filter === "upcoming"
      ? upcoming
      : filter === "past"
        ? past
        : [...upcoming, ...past];
  const minutesOutstanding = past.filter((m) => !m.minutesSentAt).length;
  const packsPending = upcoming.filter((m) => m.status === "Draft").length;
  const attRate = (() => {
    const rec = past.filter((m) => m.attendanceRecordedAt);
    if (!rec.length) return null;
    const pct = rec.map((m) =>
      m.attendanceAllPresent
        ? 100
        : (m.attendancePresentIndices.length /
            Math.max(1, m.attendees.length)) *
          100,
    );
    return Math.round(pct.reduce((a, b) => a + b, 0) / pct.length);
  })();

  const allActionItems = meetings.flatMap((m) =>
    (m.actionItems ?? []).map((a) => ({
      ...a,
      meetingTitle: m.title,
      meetingDate: m.date,
    })),
  );
  const now2 = Date.now();
  const openActionItems = allActionItems.filter((a) => a.status !== "Done");
  const overdueActionItems = openActionItems.filter(
    (a) => a.dueDate && new Date(a.dueDate).getTime() < now2,
  );

  const kpis = [
    {
      label: "Meetings YTD",
      value: meetings.length,
      sub: `${past.length} held, ${upcoming.length} upcoming`,
    },
    {
      label: "Avg attendance",
      value: attRate === null ? "—" : `${attRate}%`,
      sub: "Recorded meetings",
    },
    {
      label: "Minutes outstanding",
      value: minutesOutstanding,
      sub: "Past meetings",
    },
    {
      label: "Action items open",
      value: openActionItems.length,
      sub: `${overdueActionItems.length} overdue`,
    },
    {
      label: "Meeting packs pending",
      value: packsPending,
      sub: "Upcoming meetings",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Meetings</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Board and committee meetings — full Company Secretary workflow from
            scheduling through minutes approval, with board pack assembly,
            checklist, and post-meeting actions.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Schedule meeting
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{k.label}</div>
              <div className="text-2xl font-bold mt-1">{k.value}</div>
              <div className="text-[11px] text-muted-foreground">{k.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-1 border-b">
        {(
          [
            ["upcoming", `Upcoming (${upcoming.length})`],
            ["past", `Past (${past.length})`],
            ["all", "All meetings"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px ${filter === k ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground"}`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {list.map((m) => {
          const d = new Date(m.date);
          const isPast = d.getTime() < now;
          const label = isPast
            ? m.minutesSentAt
              ? "Complete"
              : "Minutes outstanding"
            : m.status === "Draft"
              ? "Agenda draft"
              : m.status === "Postponed"
                ? "Postponed"
                : "Preparing";
          return (
            <Card
              key={m._id}
              className="cursor-pointer hover:shadow-md transition"
              onClick={() => setWorkspace(m)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-14 text-center rounded-lg bg-primary/10 py-1.5 shrink-0">
                  <div className="text-xl font-bold text-primary leading-none">
                    {d.getDate()}
                  </div>
                  <div className="text-[10px] font-semibold text-primary">
                    {d.toLocaleString("en", { month: "short" }).toUpperCase()}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{m.title}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                    <span>{m.type}</span>
                    <span>{m.agenda.length} agenda items</span>
                    <span className="flex items-center gap-1">
                      <Users2 className="h-3 w-3" />
                      {m.attendees.length}
                    </span>
                    <span className="flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      {m.boardPack.length} docs
                    </span>
                    <span>{m.location}</span>
                  </div>
                </div>
                <Badge
                  variant={
                    label === "Complete"
                      ? "default"
                      : label === "Minutes outstanding"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {label}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
        {list.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-12">
            No meetings here.
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="font-semibold mb-3 flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Open action items across all meetings
          </div>
          {openActionItems.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">
              No open action items.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-2">Action</th>
                    <th>Meeting source</th>
                    <th>Owner</th>
                    <th>Due</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {openActionItems.map((a) => {
                    const overdue =
                      a.dueDate && new Date(a.dueDate).getTime() < now2;
                    const statusLabel = overdue
                      ? "Overdue"
                      : a.status === "Done"
                        ? "Done"
                        : "Open";
                    return (
                      <tr key={a._id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{a.title}</td>
                        <td>
                          {a.meetingTitle},{" "}
                          {new Date(a.meetingDate).toLocaleDateString()}
                        </td>
                        <td>{a.assigneeName}</td>
                        <td>
                          {a.dueDate
                            ? new Date(a.dueDate).toLocaleDateString()
                            : "—"}
                          {overdue ? " (overdue)" : ""}
                        </td>
                        <td>
                          <Badge
                            variant={
                              overdue
                                ? "destructive"
                                : a.status === "Done"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {statusLabel}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <NewMeetingDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}

// Common IANA timezones for meeting scheduling — the detected browser
// timezone is always included (and defaulted to) even if not in this list.
const COMMON_TIMEZONES = [
  "UTC",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Africa/Nairobi",
  "Africa/Cairo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
];

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
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
    timezone: detectTimezone(),
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
                  {[
                    "Board",
                    "Committee",
                    "Executive",
                    "Ad-hoc",
                    "AGM",
                    "EGM",
                  ].map((c) => (
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
          <div>
            <Label>Timezone</Label>
            <Select
              value={f.timezone}
              onValueChange={(v) => setF({ ...f, timezone: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {Array.from(new Set([f.timezone, ...COMMON_TIMEZONES])).map(
                  (tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace(/_/g, " ")}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
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
              <p className="text-xs text-muted-foreground mt-1">
                Attendees are automatically every member of this committee.
              </p>
            </div>
          )}
          {f.type === "Board" && (
            <p className="text-xs text-muted-foreground">
              Attendees are automatically every active board member.
            </p>
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
