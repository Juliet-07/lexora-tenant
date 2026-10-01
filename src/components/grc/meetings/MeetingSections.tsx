import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  ShieldAlert,
  Eye,
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
  recordMeetingConflict,
  MEETING_CONFLICT_ACTIONS,
  MEETING_CONFLICT_STATUSES,
  type Meeting,
  type MeetingAudienceType,
  type MeetingMode,
  type MeetingPlatform,
  type MeetingAttendanceStatus,
  type MeetingConflictAction,
  type MeetingConflictStatus,
  type MeetingConflictDeclaration,
  postponeMeeting,
  resumeMeeting,
  deleteMeeting,
} from "@/lib/grc/governance-api";
import {
  shareMinutesSnapshot,
  encodeMinutesToken,
  useMinutesReviews,
} from "@/lib/grcGovernanceLocal";

type DraftEntry = {
  status: MeetingAttendanceStatus;
  proxyHolderName: string;
  note: string;
};

const STATUS_BADGE_CLASS: Record<MeetingAttendanceStatus, string> = {
  Present: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  Proxy: "bg-sky-100 text-sky-800 hover:bg-sky-100",
  Apology: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  Absent: "bg-red-100 text-red-800 hover:bg-red-100",
};

function buildDraftFromMeeting(meeting: Meeting): Record<number, DraftEntry> {
  const draft: Record<number, DraftEntry> = {};
  meeting.attendees.forEach((_, i) => {
    const existing = meeting.attendanceEntries?.find((e) => e.index === i);
    if (existing) {
      draft[i] = {
        status: existing.status,
        proxyHolderName: existing.proxyHolderName ?? "",
        note: existing.note ?? "",
      };
      return;
    }
    // Fall back to legacy present/absent fields for meetings recorded
    // before per-attendee status tracking existed.
    if (meeting.attendanceRecordedAt) {
      const wasPresent =
        meeting.attendanceAllPresent === true ||
        meeting.attendancePresentIndices?.includes(i);
      draft[i] = {
        status: wasPresent ? "Present" : "Absent",
        proxyHolderName: "",
        note: "",
      };
      return;
    }
    draft[i] = { status: "Present", proxyHolderName: "", note: "" };
  });
  return draft;
}

function ConflictDialog({
  meeting,
  attendeeIndex,
  open,
  onOpenChange,
}: {
  meeting: Meeting;
  attendeeIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const attendee = meeting.attendees[attendeeIndex];
  const [status, setStatus] = useState<MeetingConflictStatus>(
    "Conflict declared — recusal required",
  );
  const [agendaItems, setAgendaItems] = useState<string[]>([]);
  const [natureOfConflict, setNatureOfConflict] = useState("");
  const [actionTaken, setActionTaken] = useState<MeetingConflictAction | "">(
    "",
  );

  useEffect(() => {
    if (open) {
      setStatus("Conflict declared — recusal required");
      setAgendaItems([]);
      setNatureOfConflict("");
      setActionTaken("");
    }
  }, [open]);

  const mut = useMutation({
    mutationFn: () =>
      recordMeetingConflict(meeting._id, {
        declaredByEmail: attendee.email,
        status,
        agendaItems,
        natureOfConflict: natureOfConflict.trim(),
        actionTaken: actionTaken || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-meetings"] });
      toast({ title: "Conflict of interest recorded" });
      onOpenChange(false);
    },
    onError: () =>
      toast({
        title: "Failed to record conflict of interest",
        variant: "destructive",
      }),
  });

  const toggleAgendaItem = (title: string) =>
    setAgendaItems((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            Record conflict of interest — {attendee?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Conflict status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as MeetingConflictStatus)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEETING_CONFLICT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Agenda items affected</Label>
            <div className="mt-1 space-y-1 max-h-32 overflow-y-auto border rounded p-2">
              {meeting.agenda.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  No agenda items on this meeting.
                </p>
              )}
              {meeting.agenda.map((item, i) => (
                <label
                  key={i}
                  className="flex items-center gap-2 text-xs cursor-pointer"
                >
                  <Checkbox
                    checked={agendaItems.includes(item.title)}
                    onCheckedChange={() => toggleAgendaItem(item.title)}
                  />
                  <span className="truncate">{item.title}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Nature of conflict</Label>
            <Textarea
              rows={3}
              className="mt-1"
              value={natureOfConflict}
              onChange={(e) => setNatureOfConflict(e.target.value)}
              placeholder="Describe the interest and how it relates to the agenda…"
            />
          </div>

          <div>
            <Label className="text-xs">Action to be taken</Label>
            <Select
              value={actionTaken}
              onValueChange={(v) => setActionTaken(v as MeetingConflictAction)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {MEETING_CONFLICT_ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div>
              <Label className="text-xs">Recorded by</Label>
              <p className="mt-1">You (recorded on save)</p>
            </div>
            <div>
              <Label className="text-xs">Date recorded</Label>
              <p className="mt-1">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-md border p-2">
            This note will be recorded in the meeting minutes under the
            declarations of interest section
            {status === "Standing declaration — ongoing"
              ? " and linked to the director's standing conflict register."
              : "."}
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!natureOfConflict.trim()) {
                toast({
                  title: "Describe the nature of the conflict",
                  variant: "destructive",
                });
                return;
              }
              mut.mutate();
            }}
            disabled={mut.isPending}
          >
            {mut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save conflict"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Read-only — there is no edit-in-place endpoint for a conflict
// declaration once saved (the record is meant to stand as recorded);
// a new note can always be added via ConflictDialog instead. Shows
// every declaration for this attendee, most recent first.
function ConflictViewDialog({
  attendeeName,
  declarations,
  open,
  onOpenChange,
}: {
  attendeeName: string;
  declarations: MeetingConflictDeclaration[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const sorted = [...declarations].sort(
    (a, b) =>
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            Conflict of interest — {attendeeName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {sorted.map((c) => (
            <div
              key={c._id}
              className="border rounded-md p-3 space-y-1.5 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="text-[11px]">
                  {c.status}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(c.recordedAt).toLocaleDateString()}
                </span>
              </div>
              {c.agendaItems.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Agenda items affected: {c.agendaItems.join(", ")}
                </p>
              )}
              <p>{c.natureOfConflict}</p>
              {c.actionTaken && (
                <p className="text-xs text-muted-foreground">
                  Action to be taken: {c.actionTaken}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Recorded by {c.recordedBy}
                {c.source === "board-member" ? " (self-declared)" : ""}
              </p>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AttendanceSection({ meeting }: { meeting: Meeting }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<number, DraftEntry>>(() =>
    buildDraftFromMeeting(meeting),
  );
  const [conflictDialogIndex, setConflictDialogIndex] = useState<number | null>(
    null,
  );
  const [viewConflictIndex, setViewConflictIndex] = useState<number | null>(
    null,
  );

  const recorded = meeting.attendanceRecordedAt != null;

  const attendanceMut = useMutation({
    mutationFn: (
      entries: {
        index: number;
        status: MeetingAttendanceStatus;
        proxyHolderName?: string;
        note?: string;
      }[],
    ) => recordAttendance(meeting._id, entries),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-meetings"] });
      setEditing(false);
      toast({ title: "Attendance recorded" });
    },
    onError: () =>
      toast({ title: "Failed to record attendance", variant: "destructive" }),
  });

  const startEditing = () => {
    setDraft(buildDraftFromMeeting(meeting));
    setEditing(true);
  };

  const updateDraft = (i: number, patch: Partial<DraftEntry>) =>
    setDraft((prev) => ({ ...prev, [i]: { ...prev[i], ...patch } }));

  const save = () => {
    const entries = meeting.attendees.map((_, i) => {
      const d = draft[i] ?? {
        status: "Present" as const,
        proxyHolderName: "",
        note: "",
      };
      return {
        index: i,
        status: d.status,
        proxyHolderName:
          d.status === "Proxy" ? d.proxyHolderName.trim() : undefined,
        note:
          d.status === "Apology" || d.status === "Absent"
            ? d.note.trim() || undefined
            : undefined,
      };
    });
    const missingProxyName = entries.find(
      (e) => e.status === "Proxy" && !e.proxyHolderName,
    );
    if (missingProxyName) {
      toast({
        title: "Enter the proxy holder's name for every proxy attendee",
        variant: "destructive",
      });
      return;
    }
    attendanceMut.mutate(entries);
  };

  const summary = meeting.attendees.reduce(
    (acc, _, i) => {
      const entry = meeting.attendanceEntries?.find((e) => e.index === i);
      const status: MeetingAttendanceStatus =
        entry?.status ??
        (meeting.attendancePresentIndices?.includes(i) ? "Present" : "Absent");
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    },
    {} as Record<MeetingAttendanceStatus, number>,
  );

  const conflictsByEmail = new Map<
    string,
    typeof meeting.conflictDeclarations
  >();
  meeting.conflictDeclarations?.forEach((c) => {
    const key = c.declaredByEmail.toLowerCase();
    conflictsByEmail.set(key, [...(conflictsByEmail.get(key) ?? []), c]);
  });

  const rsvpByEmail = new Map(
    (meeting.notice?.recipients ?? []).map((r) => [r.email.toLowerCase(), r]),
  );

  return (
    <section className="border-t pt-4 space-y-2">
      <div className="font-medium text-sm flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4" />
        Attendance register
        {recorded && !editing && (
          <Badge variant="outline" className="ml-auto text-[10px]">
            Recorded{" "}
            {new Date(meeting.attendanceRecordedAt!).toLocaleDateString()}
          </Badge>
        )}
      </div>

      {!editing && recorded && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {(["Present", "Proxy", "Apology", "Absent"] as const).map((s) =>
              summary[s] ? (
                <Badge key={s} className={STATUS_BADGE_CLASS[s]}>
                  {s}: {summary[s]}
                </Badge>
              ) : null,
            )}
          </div>
          <div className="border rounded overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>RSVP</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Proxy / apology</TableHead>
                  <TableHead>Conflict declared</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meeting.attendees.map((a, i) => {
                  const entry = meeting.attendanceEntries?.find(
                    (e) => e.index === i,
                  );
                  const status: MeetingAttendanceStatus =
                    entry?.status ??
                    (meeting.attendancePresentIndices?.includes(i)
                      ? "Present"
                      : "Absent");
                  const conflicts = conflictsByEmail.get(a.email.toLowerCase());
                  const rsvp = rsvpByEmail.get(a.email.toLowerCase());
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {a.name}
                        <div className="text-[11px] font-normal text-muted-foreground">
                          {a.email}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.role || "—"}
                      </TableCell>
                      <TableCell>
                        {rsvp ? (
                          <Badge
                            variant={
                              rsvp.rsvp === "Confirmed"
                                ? "default"
                                : rsvp.rsvp === "Apologies"
                                  ? "secondary"
                                  : "outline"
                            }
                            className="text-[10px]"
                          >
                            {rsvp.rsvp}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_BADGE_CLASS[status]}>
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[180px]">
                        {status === "Proxy" && entry?.proxyHolderName
                          ? entry.proxyHolderName
                          : (status === "Apology" || status === "Absent") &&
                              entry?.note
                            ? entry.note
                            : rsvp?.rsvp === "Pending" &&
                                rsvp.lastReminderSentAt
                              ? `Reminder sent ${new Date(
                                  rsvp.lastReminderSentAt,
                                ).toLocaleDateString()}`
                              : "—"}
                      </TableCell>
                      <TableCell>
                        {!conflicts || conflicts.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            None
                          </span>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-amber-400 text-amber-700"
                          >
                            Declared
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!conflicts || conflicts.length === 0 ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[11px] px-2"
                            onClick={() => setConflictDialogIndex(i)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Note
                          </Button>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[11px] px-2"
                              onClick={() => setViewConflictIndex(i)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[11px] px-2"
                              onClick={() => setConflictDialogIndex(i)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Note
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={startEditing}
            disabled={meeting.status !== "Held"}
          >
            Update attendance
          </Button>
        </div>
      )}

      {!editing && !recorded && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Record whether each attendee was present in person, attended by
            proxy, sent apologies, or was absent.
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
              This meeting has no attendees yet.
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
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {meeting.attendees.map((a, i) => {
              const d =
                draft[i] ??
                ({
                  status: "Present",
                  proxyHolderName: "",
                  note: "",
                } as DraftEntry);
              return (
                <div
                  key={i}
                  className="border rounded p-2 space-y-1.5 bg-background"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex-1 truncate text-xs">
                      {a.name}{" "}
                      <span className="text-muted-foreground">{a.email}</span>
                    </span>
                    {a.role && (
                      <Badge variant="outline" className="text-[10px]">
                        {a.role}
                      </Badge>
                    )}
                  </div>
                  <Select
                    value={d.status}
                    onValueChange={(v) =>
                      updateDraft(i, { status: v as MeetingAttendanceStatus })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Present">
                        Present (in person)
                      </SelectItem>
                      <SelectItem value="Proxy">Present by proxy</SelectItem>
                      <SelectItem value="Apology">Apology sent</SelectItem>
                      <SelectItem value="Absent">Absent</SelectItem>
                    </SelectContent>
                  </Select>
                  {d.status === "Proxy" && (
                    <Input
                      className="h-7 text-[11px]"
                      placeholder="Proxy holder's name"
                      value={d.proxyHolderName}
                      onChange={(e) =>
                        updateDraft(i, { proxyHolderName: e.target.value })
                      }
                    />
                  )}
                  {(d.status === "Apology" || d.status === "Absent") && (
                    <Input
                      className="h-7 text-[11px]"
                      placeholder="Note (optional)"
                      value={d.note}
                      onChange={(e) => updateDraft(i, { note: e.target.value })}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={attendanceMut.isPending}>
              {attendanceMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save attendance"
              )}
            </Button>
          </div>
        </div>
      )}

      {conflictDialogIndex != null && (
        <ConflictDialog
          meeting={meeting}
          attendeeIndex={conflictDialogIndex}
          open={conflictDialogIndex != null}
          onOpenChange={(open) => !open && setConflictDialogIndex(null)}
        />
      )}

      {viewConflictIndex != null && (
        <ConflictViewDialog
          attendeeName={meeting.attendees[viewConflictIndex]?.name ?? ""}
          declarations={
            conflictsByEmail.get(
              meeting.attendees[viewConflictIndex]?.email.toLowerCase() ?? "",
            ) ?? []
          }
          open={viewConflictIndex != null}
          onOpenChange={(open) => !open && setViewConflictIndex(null)}
        />
      )}
    </section>
  );
}

export function MinutesReviewsSection({ meeting }: { meeting: Meeting }) {
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
