import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  Mail,
  Send,
  Trash2,
  Upload,
  Users2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  addAttendee,
  removeAttendee,
  addAgendaItem,
  removeAgendaItem,
  addBoardPackDoc,
  addBoardPackRequirement,
  fulfillBoardPackDoc,
  removeBoardPackDoc,
  markMeetingHeld,
  sendMeetingMinutes,
  postponeMeeting,
  deleteMeeting,
  AGENDA_ITEM_TYPES,
  type Meeting,
  type AgendaItemType,
} from "@/lib/grc/governance-api";
import { fetchEmployees, type Employee } from "@/lib/hr/hr-api";
import { MinutesReviewsSection } from "./MeetingSections";

function useActions(meeting: Meeting) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["grc-meetings"] });
  const onError = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });
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
  const [newDate, setNewDate] = useState("");
  const heldMut = useMutation({
    mutationFn: () => markMeetingHeld(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Meeting marked as held" });
    },
    onError: onError("Failed to mark meeting as done"),
  });
  const postponeMut = useMutation({
    mutationFn: () =>
      postponeMeeting(
        id,
        reason,
        newDate ? new Date(newDate).toISOString() : undefined,
      ),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setReason("");
      setNewDate("");
      toast({ title: "Meeting postponed" });
    },
    onError: onError("Failed to postpone meeting"),
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
  // Postponed is not a dead end: postponing already moves the meeting to
  // its new date (reappearing under Upcoming on its own), so the only
  // real end state is Held — a postponed meeting can still be postponed
  // again or marked as held once it happens, with no separate "resume"
  // step in between.
  const active = meeting.status !== "Held";

  return (
    <>
      {active && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Postpone</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Postpone this meeting</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Textarea
                rows={3}
                placeholder="Reason for postponement…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div>
                <label className="text-xs text-muted-foreground">
                  New date &amp; time (optional — timezone: {meeting.timezone})
                </label>
                <Input
                  type="datetime-local"
                  className="mt-1"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  If set, this is included in the postponement email and
                  reflected on the board calendar. Leave blank to postpone
                  indefinitely and confirm a date later.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="destructive"
                disabled={!reason.trim() || postponeMut.isPending}
                onClick={() => postponeMut.mutate()}
              >
                {postponeMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Confirm postponement"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {active && (
        <Button
          variant="outline"
          onClick={() => heldMut.mutate()}
          disabled={heldMut.isPending}
        >
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
          <Button
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
              This permanently removes "{meeting.title}", its agenda, attendees,
              board pack, minutes and acknowledgements. This cannot be undone.
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
  const lastHistory =
    meeting.postponementHistory?.[meeting.postponementHistory.length - 1];
  return (
    <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
      <span className="font-medium">Postponed</span>
      {meeting.postponedAt &&
        ` on ${new Date(meeting.postponedAt).toLocaleDateString()}`}
      {meeting.postponementReason && `: ${meeting.postponementReason}`}
      {lastHistory?.toDate && (
        <div className="mt-1 text-xs text-muted-foreground">
          Rescheduled to {new Date(lastHistory.toDate).toLocaleString()} (
          {meeting.timezone})
        </div>
      )}
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
  const [ag, setAg] = useState<{
    title: string;
    presenter: string;
    durationMinutes: number;
    type: AgendaItemType;
  }>({ title: "", presenter: "", durationMinutes: 10, type: "Noting" });
  const mut = useMutation({
    mutationFn: () => addAgendaItem(id, ag),
    onSuccess: () => {
      invalidate();
      setAg({ title: "", presenter: "", durationMinutes: 10, type: "Noting" });
    },
    onError: onError("Failed to add agenda item"),
  });
  return (
    <div className="grid grid-cols-12 gap-2 mt-4">
      <Input
        className="col-span-4"
        placeholder="New agenda item"
        value={ag.title}
        onChange={(e) => setAg({ ...ag, title: e.target.value })}
      />
      <Select
        value={ag.presenter || undefined}
        onValueChange={(v) => setAg({ ...ag, presenter: v })}
      >
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
      <Select
        value={ag.type}
        onValueChange={(v) => setAg({ ...ag, type: v as AgendaItemType })}
      >
        <SelectTrigger className="col-span-2">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          {AGENDA_ITEM_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        className="col-span-1"
        type="number"
        value={ag.durationMinutes}
        onChange={(e) =>
          setAg({ ...ag, durationMinutes: Number(e.target.value) })
        }
      />
      <Button
        className="col-span-2"
        variant="outline"
        disabled={!ag.title || mut.isPending}
        onClick={() => mut.mutate()}
      >
        Add item
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
        <div
          key={i}
          className="flex justify-between items-center text-xs border rounded px-2 py-1"
        >
          <span>
            {a.name} <span className="text-muted-foreground">{a.email}</span>
          </span>
          <button onClick={() => rmMut.mutate(i)} aria-label="Remove attendee">
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      ))}
      <div className="grid grid-cols-4 gap-2">
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
        <Input
          placeholder="Role"
          value={att.role}
          onChange={(e) => setAtt({ ...att, role: e.target.value })}
        />
        <Button
          variant="outline"
          disabled={!att.name || !att.email || addMut.isPending}
          onClick={() => addMut.mutate()}
        >
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
      reviews.some(
        (r) =>
          r.attendeeEmail.toLowerCase() === a.email.toLowerCase() &&
          r.decision === "approved",
      ),
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
            <Button
              onClick={() => mut.mutate()}
              disabled={mut.isPending || !meeting.minutes?.trim()}
            >
              <Send className="h-4 w-4 mr-1" />
              {meeting.minutesSentAt
                ? "Resend minutes"
                : "Send minutes to attendees"}
            </Button>
            {meeting.minutesSentAt && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" /> Sent{" "}
                {new Date(meeting.minutesSentAt).toLocaleString()}
              </span>
            )}
          </div>
        )
      )}
      {meeting.minutesSentAt && <MinutesReviewsSection meeting={meeting} />}
    </div>
  );
}

/** Agenda-item picker shared by the upload and request dialogs below —
 * blank/"__none__" means the general "Procedural documents" bucket. */
function AgendaItemPicker({
  meeting,
  value,
  onChange,
}: {
  meeting: Meeting;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select
      value={value || "__none__"}
      onValueChange={(v) => onChange(v === "__none__" ? "" : v)}
    >
      <SelectTrigger className="mt-1">
        <SelectValue placeholder="Procedural documents" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">
          Procedural documents (no agenda item)
        </SelectItem>
        {meeting.agenda.map((a, i) => (
          <SelectItem key={i} value={a.title}>
            {a.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** "+ Upload document" — a direct file upload, optionally tagged to an
 * agenda item so it shows up grouped under that item on the Board Pack
 * tab (see MeetingWorkspace.tsx's BoardPackSection). */
export function UploadBoardPackDialog({ meeting }: { meeting: Meeting }) {
  const { invalidate, onError, id } = useActions(meeting);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [agendaItemTitle, setAgendaItemTitle] = useState("");
  const mut = useMutation({
    mutationFn: () =>
      addBoardPackDoc(id, file as File, agendaItemTitle || undefined),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setFile(null);
      setAgendaItemTitle("");
      toast({ title: "Document uploaded" });
    },
    onError: onError("Failed to upload document"),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="h-4 w-4 mr-1" />
          Upload document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload a board pack document</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">File</label>
            <Input
              type="file"
              className="mt-1"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              Link to agenda item (optional)
            </label>
            <AgendaItemPicker
              meeting={meeting}
              value={agendaItemTitle}
              onChange={setAgendaItemTitle}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!file || mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Upload"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** "+ Request document" — creates an "Outstanding" placeholder (no file
 * yet) that someone can be chased for, matching the reference mockup's
 * amber "Awaiting upload from X · Expected by …" rows. */
export function RequestBoardPackDocDialog({ meeting }: { meeting: Meeting }) {
  const { invalidate, onError, id } = useActions(meeting);
  const [open, setOpen] = useState(false);
  const [req, setReq] = useState({
    name: "",
    agendaItemTitle: "",
    assignedToEmployeeId: "",
    dueDate: "",
  });
  // Assignee is a real employee picked from a dropdown — same
  // fetchEmployees/Select pattern as AuditDetail's document-request
  // form — rather than free-text name/email: once assigned, the
  // employee sees this request on their own portal and uploads it
  // themselves (see MyBoardPackRequests).
  const { data: employeesPage } = useQuery({
    queryKey: ["hr-employees-for-board-pack-picker"],
    queryFn: () => fetchEmployees({ limit: 500 }),
    enabled: open,
  });
  const employees = employeesPage?.items ?? [];
  const mut = useMutation({
    mutationFn: () =>
      addBoardPackRequirement(id, {
        name: req.name,
        agendaItemTitle: req.agendaItemTitle || undefined,
        assignedToEmployeeId: req.assignedToEmployeeId || undefined,
        dueDate: req.dueDate || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setReq({
        name: "",
        agendaItemTitle: "",
        assignedToEmployeeId: "",
        dueDate: "",
      });
      toast({ title: "Document requested" });
    },
    onError: onError("Failed to request document"),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <ClipboardList className="h-4 w-4 mr-1" />
          Request document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a board pack document</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">
              Document name
            </label>
            <Input
              className="mt-1"
              placeholder="e.g. Q3 Finance Report"
              value={req.name}
              onChange={(e) => setReq({ ...req, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              Link to agenda item (optional)
            </label>
            <AgendaItemPicker
              meeting={meeting}
              value={req.agendaItemTitle}
              onChange={(v) => setReq({ ...req, agendaItemTitle: v })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              Assign to employee (optional)
            </label>
            <Select
              value={req.assignedToEmployeeId || "__unassigned__"}
              onValueChange={(v) =>
                setReq({
                  ...req,
                  assignedToEmployeeId: v === "__unassigned__" ? "" : v,
                })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unassigned__">Unassigned</SelectItem>
                {employees.map((emp: Employee) => (
                  <SelectItem key={emp._id} value={emp._id}>
                    {emp.firstName} {emp.lastName}
                    {emp.jobTitle ? ` — ${emp.jobTitle}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              They'll see this on their employee portal and can upload it
              themselves.
            </p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Due date</label>
            <Input
              className="mt-1"
              type="date"
              value={req.dueDate}
              onChange={(e) => setReq({ ...req, dueDate: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!req.name.trim() || mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Request"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Small inline "Upload" action on an Outstanding row — attaches a file
 * to that existing placeholder row rather than creating a new one. */
export function FulfillBoardPackDocButton({
  meeting,
  index,
}: {
  meeting: Meeting;
  index: number;
}) {
  const { invalidate, onError, id } = useActions(meeting);
  const inputRef = useRef<HTMLInputElement>(null);
  const mut = useMutation({
    mutationFn: (file: File) => fulfillBoardPackDoc(id, index, file),
    onSuccess: () => {
      invalidate();
      toast({ title: "Document uploaded" });
    },
    onError: onError("Failed to upload document"),
  });
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) mut.mutate(f);
          e.target.value = "";
        }}
      />
      <Button
        size="sm"
        variant="outline"
        disabled={mut.isPending}
        onClick={() => inputRef.current?.click()}
      >
        {mut.isPending ? (
          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5 mr-1" />
        )}
        Upload
      </Button>
    </>
  );
}

// BoardPackDueDateBanner removed (2026-10, PO feedback): the "board
// pack due" computation (7 days before meeting, tenant-overridable)
// wasn't landing with users and is pulled from the Board Pack tab for
// now. The backend field/endpoint (Meeting.boardPackDueDate,
// updateBoardPackDueDate) is left in place for a possible return to
// this later — only the UI is gone.
