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
  resumeMeeting,
  deleteMeeting,
} from "@/lib/grc/governance-api";
import {
  shareMinutesSnapshot,
  encodeMinutesToken,
  useMinutesReviews,
} from "@/lib/grcGovernanceLocal";


export function AttendanceSection({ meeting }: { meeting: Meeting }) {
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
