import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Loader2, Mail, Send, Trash2, Users2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  addAttendee,
  removeAttendee,
  addAgendaItem,
  removeAgendaItem,
  addBoardPackDoc,
  removeBoardPackDoc,
  markMeetingHeld,
  sendMeetingMinutes,
  postponeMeeting,
  resumeMeeting,
  deleteMeeting,
  type Meeting,
} from "@/lib/grc/governance-api";
import { MinutesReviewsSection } from "./MeetingSections";

function useActions(meeting: Meeting) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["grc-meetings"] });
  const onError = (title: string) => (err: any) =>
    toast({ title, description: err?.response?.data?.message, variant: "destructive" });
  return { invalidate, onError, id: meeting._id };
}

/** Header actions: postpone/resume, mark as done, delete. */
export function MeetingHeaderControls({
  meeting,
  onDeleted,
}: {
  meeting: Meeting;
  onDeleted: () => void;
}) {
  const { invalidate, onError, id } = useActions(meeting);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const heldMut = useMutation({
    mutationFn: () => markMeetingHeld(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Meeting marked as held" });
    },
    onError: onError("Failed to mark meeting as done"),
  });
  const postponeMut = useMutation({
    mutationFn: () => postponeMeeting(id, reason),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setReason("");
      toast({ title: "Meeting postponed" });
    },
    onError: onError("Failed to postpone meeting"),
  });
  const resumeMut = useMutation({
    mutationFn: () => resumeMeeting(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Meeting resumed" });
    },
    onError: onError("Failed to resume meeting"),
  });
  const deleteMut = useMutation({
    mutationFn: () => deleteMeeting(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Meeting deleted" });
      onDeleted();
    },
    onError: onError("Failed to delete meeting"),
  });
  const active = meeting.status !== "Held" && meeting.status !== "Postponed";

  return (
    <>
      {meeting.status === "Postponed" && (
        <Button variant="outline" onClick={() => resumeMut.mutate()} disabled={resumeMut.isPending}>
          {resumeMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Resume meeting
        </Button>
      )}
      {active && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Postpone</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Postpone this meeting</DialogTitle>
            </DialogHeader>
            <Textarea
              rows={3}
              placeholder="Reason for postponement…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <DialogFooter>
              <Button
                variant="destructive"
                disabled={!reason.trim() || postponeMut.isPending}
                onClick={() => postponeMut.mutate()}
              >
                Confirm postponement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {active && (
        <Button variant="outline" onClick={() => heldMut.mutate()} disabled={heldMut.isPending}>
          {heldMut.isPending ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-1" />
          )}
          Mark as held
        </Button>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes "{meeting.title}", its agenda, attendees, board pack, minutes
              and acknowledgements. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMut.mutate()}
            >
              Delete meeting
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function PostponedBanner({ meeting }: { meeting: Meeting }) {
  if (meeting.status !== "Postponed") return null;
  return (
    <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
      <span className="font-medium">Postponed</span>
      {meeting.postponedAt && ` on ${new Date(meeting.postponedAt).toLocaleDateString()}`}
      {meeting.postponementReason && `: ${meeting.postponementReason}`}
    </div>
  );
}

export function useRemoveAgenda(meeting: Meeting) {
  const { invalidate, onError, id } = useActions(meeting);
  return useMutation({
    mutationFn: (i: number) => removeAgendaItem(id, i),
    onSuccess: invalidate,
    onError: onError("Failed to remove agenda item"),
  });
}

export function useRemovePackDoc(meeting: Meeting) {
  const { invalidate, onError, id } = useActions(meeting);
  return useMutation({
    mutationFn: (i: number) => removeBoardPackDoc(id, i),
    onSuccess: invalidate,
    onError: onError("Failed to remove document"),
  });
}

export function AgendaAddRow({ meeting }: { meeting: Meeting }) {
  const { invalidate, onError, id } = useActions(meeting);
  const [ag, setAg] = useState({ title: "", presenter: "", durationMinutes: 10 });
  const mut = useMutation({
    mutationFn: () => addAgendaItem(id, ag),
    onSuccess: () => {
      invalidate();
      setAg({ title: "", presenter: "", durationMinutes: 10 });
    },
    onError: onError("Failed to add agenda item"),
  });
  return (
    <div className="grid grid-cols-12 gap-2 mt-4">
      <Input
        className="col-span-6"
        placeholder="New agenda item"
        value={ag.title}
        onChange={(e) => setAg({ ...ag, title: e.target.value })}
      />
      <Select value={ag.presenter || undefined} onValueChange={(v) => setAg({ ...ag, presenter: v })}>
        <SelectTrigger className="col-span-3">
          <SelectValue placeholder="Presenter" />
        </SelectTrigger>
        <SelectContent>
          {meeting.attendees.map((a) => (
            <SelectItem key={a.email} value={a.name}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        className="col-span-1"
        type="number"
        value={ag.durationMinutes}
        onChange={(e) => setAg({ ...ag, durationMinutes: Number(e.target.value) })}
      />
      <Button className="col-span-2" variant="outline" disabled={!ag.title || mut.isPending} onClick={() => mut.mutate()}>
        Add item
      </Button>
    </div>
  );
}

export function PackUploadRow({ meeting }: { meeting: Meeting }) {
  const { invalidate, onError, id } = useActions(meeting);
  const [file, setFile] = useState<File | null>(null);
  const [key, setKey] = useState(0);
  const mut = useMutation({
    mutationFn: () => addBoardPackDoc(id, file!),
    onSuccess: () => {
      invalidate();
      setFile(null);
      setKey((k) => k + 1);
    },
    onError: onError("Failed to upload document"),
  });
  return (
    <div className="flex gap-2 pt-2">
      <Input key={key} type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <Button variant="outline" disabled={!file || mut.isPending} onClick={() => mut.mutate()}>
        {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
      </Button>
    </div>
  );
}

/** Manual attendee list editor — only Executive / Ad-hoc meetings. */
export function AttendeesEditor({ meeting }: { meeting: Meeting }) {
  const { invalidate, onError, id } = useActions(meeting);
  const [att, setAtt] = useState({ name: "", email: "", role: "" });
  const addMut = useMutation({
    mutationFn: () => addAttendee(id, att),
    onSuccess: () => {
      invalidate();
      setAtt({ name: "", email: "", role: "" });
    },
    onError: onError("Failed to add attendee"),
  });
  const rmMut = useMutation({
    mutationFn: (i: number) => removeAttendee(id, i),
    onSuccess: invalidate,
    onError: onError("Failed to remove attendee"),
  });
  if (meeting.type !== "Executive" && meeting.type !== "Ad-hoc") return null;
  return (
    <div className="space-y-2 border rounded-lg p-4">
      <div className="text-sm font-medium flex items-center gap-2">
        <Users2 className="h-4 w-4" /> Manage attendees
      </div>
      {meeting.attendees.map((a, i) => (
        <div key={i} className="flex justify-between items-center text-xs border rounded px-2 py-1">
          <span>
            {a.name} <span className="text-muted-foreground">{a.email}</span>
          </span>
          <button onClick={() => rmMut.mutate(i)} aria-label="Remove attendee">
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      ))}
      <div className="grid grid-cols-4 gap-2">
        <Input placeholder="Name" value={att.name} onChange={(e) => setAtt({ ...att, name: e.target.value })} />
        <Input placeholder="Email" value={att.email} onChange={(e) => setAtt({ ...att, email: e.target.value })} />
        <Input placeholder="Role" value={att.role} onChange={(e) => setAtt({ ...att, role: e.target.value })} />
        <Button variant="outline" disabled={!att.name || !att.email || addMut.isPending} onClick={() => addMut.mutate()}>
          Add
        </Button>
      </div>
    </div>
  );
}

/** Distribute the approved minutes and track attendee reviews. */
export function MinutesDistribution({ meeting }: { meeting: Meeting }) {
  const { invalidate, onError, id } = useActions(meeting);
  const mut = useMutation({
    mutationFn: () => sendMeetingMinutes(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Minutes sent to all attendees" });
    },
    onError: onError("Failed to send minutes"),
  });
  const reviews = meeting.minutesReviews ?? [];
  const allApproved =
    meeting.attendees.length > 0 &&
    meeting.attendees.every((a) =>
      reviews.some((r) => r.attendeeEmail.toLowerCase() === a.email.toLowerCase() && r.decision === "approved"),
    );
  return (
    <div className="space-y-2">
      {allApproved ? (
        <div className="rounded-md border border-success/40 bg-success/10 p-3 text-sm flex gap-2">
          <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
          All {meeting.attendees.length} attendees have approved these minutes.
        </div>
      ) : (
        meeting.status === "Held" && (
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={() => mut.mutate()} disabled={mut.isPending || !meeting.minutes?.trim()}>
              <Send className="h-4 w-4 mr-1" />
              {meeting.minutesSentAt ? "Resend minutes" : "Send minutes to attendees"}
            </Button>
            {meeting.minutesSentAt && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" /> Sent {new Date(meeting.minutesSentAt).toLocaleString()}
              </span>
            )}
          </div>
        )
      )}
      {meeting.minutesSentAt && <MinutesReviewsSection meeting={meeting} />}
    </div>
  );
}
