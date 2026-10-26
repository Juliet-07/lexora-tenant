import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  CalendarCheck,
  Check,
  Download,
  Info,
  Loader2,
  Send,
  Star,
  UserCheck,
  UserX,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  cancelEvent,
  markEventAttendance,
  recordEventOutcome,
  sendEventAutomationStep,
  updateEventAutomation,
  type CrmEvent,
  type EventAutomationPatch,
  type EventInvite,
  type PipelineState,
  type ScheduleStatus,
} from "@/lib/crm/events-api";

// ─────────────────────────────────────────────────────────────
// Event lifecycle UI — pre-event, during, post-event. Everything
// here reads the `lifecycle` block the engine computes (phase, stats,
// pipeline, automation schedule), so the numbers on screen are the
// same numbers the automation runs on. Registration and invitations
// are untouched and live in Events.tsx.
// ─────────────────────────────────────────────────────────────

const hasResponded = (status: string) =>
  status === "Registered" || status === "Acknowledged";

export const fmtInZone = (iso: string | null | undefined, tz?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: tz || undefined,
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
};

const downloadCsv = (filename: string, rows: string[][]) => {
  const csv = rows
    .map((r) =>
      r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

function useEventMutations() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["crm-events"] });
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: Array.isArray(err?.response?.data?.message)
        ? err.response.data.message.join(", ")
        : err?.response?.data?.message,
      variant: "destructive",
    });
  return { toast, refresh, onErr };
}

// ── Header: phase + KPI row + pipeline strip ─────────────────────

const PHASE_STYLE: Record<string, string> = {
  "Pre-event": "bg-primary/10 text-primary",
  During: "bg-success/15 text-success",
  "Post-event": "bg-muted text-foreground",
  Cancelled: "bg-destructive/10 text-destructive",
};

const PIPE_STYLE: Record<PipelineState, string> = {
  done: "border-success/30 bg-success/10 text-success",
  active: "border-primary/40 bg-primary/10 text-primary",
  pending: "border-border bg-muted/40 text-muted-foreground",
  skipped: "border-dashed border-border bg-transparent text-muted-foreground",
};

export function EventKpis({ event }: { event: CrmEvent }) {
  const s = event.lifecycle?.stats;
  if (!s) return null;
  const external = event.mode !== "InHouse";
  const mixed = event.mode === "Both";
  const items = [
    {
      label: mixed ? "Responded" : external ? "Registered" : "Acknowledged",
      value: s.responded,
      sub: event.capacity > 0 && external ? `of ${event.capacity}` : undefined,
    },
    {
      label: "Attended",
      value: s.totalAttendance,
      sub: s.walkIns
        ? `incl. ${s.walkIns} walk-in${s.walkIns === 1 ? "" : "s"}`
        : undefined,
    },
    {
      label: "Attendance rate",
      value: s.attendanceRate == null ? "—" : `${s.attendanceRate}%`,
    },
    { label: "No-shows", value: s.noShows },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((i) => (
        <div
          key={i.label}
          className="rounded-md border bg-muted/30 p-3 text-center"
        >
          <div className="text-2xl font-bold">{i.value}</div>
          <div className="text-xs text-muted-foreground">{i.label}</div>
          {i.sub && (
            <div className="text-[10px] text-muted-foreground">{i.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export function PipelineStrip({ event }: { event: CrmEvent }) {
  const lc = event.lifecycle;
  if (!lc) return null;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={PHASE_STYLE[lc.phase]} variant="secondary">
          {lc.phase}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {fmtInZone(lc.startsAt, event.timezone)} →{" "}
          {fmtInZone(lc.endsAt, event.timezone)} ({event.timezone})
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {lc.pipeline.map((p) => (
          <div
            key={p.key}
            className={`rounded-md border px-2 py-1.5 text-xs ${PIPE_STYLE[p.state]}`}
          >
            <div className="flex items-center gap-1 font-medium">
              {p.state === "done" && <Check className="h-3 w-3" />}
              {p.state === "active" && (
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
              )}
              {p.label}
            </div>
            {p.detail && <div className="opacity-80">{p.detail}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Automation ───────────────────────────────────────────────────

const STATUS_BADGE: Record<ScheduleStatus, string> = {
  Off: "bg-muted text-muted-foreground",
  Pending: "bg-primary/10 text-primary",
  Sending: "bg-primary/10 text-primary",
  Sent: "bg-success/15 text-success",
  Skipped: "bg-warning/15 text-warning",
  Failed: "bg-destructive/10 text-destructive",
};

const DELAY_OPTIONS = [0, 1, 2, 4, 6, 12, 24, 48, 72, 168];
const delayLabel = (h: number) =>
  h === 0
    ? "Right after the event"
    : h % 24 === 0
      ? `${h / 24} day${h === 24 ? "" : "s"} after`
      : `${h} hour${h === 1 ? "" : "s"} after`;

export function AutomationPanel({ event }: { event: CrmEvent }) {
  const { toast, refresh, onErr } = useEventMutations();
  const a = event.automation;
  const lc = event.lifecycle;

  const patchMut = useMutation({
    mutationFn: (dto: EventAutomationPatch) =>
      updateEventAutomation(event._id, dto),
    onSuccess: refresh,
    onError: onErr("Couldn't save the automation setting"),
  });
  const sendMut = useMutation({
    mutationFn: (key: string) => sendEventAutomationStep(event._id, key),
    onSuccess: () => {
      refresh();
      toast({ title: "Sent" });
    },
    onError: onErr("Couldn't send"),
  });

  const [customOn, setCustomOn] = useState(false);
  const [customHours, setCustomHours] = useState("");
  useEffect(() => {
    setCustomOn(!!a?.customReminderHours);
    setCustomHours(a?.customReminderHours ? String(a.customReminderHours) : "");
  }, [event._id, a?.customReminderHours]);

  if (!a || !lc) return null;
  const cancelled = event.status === "Cancelled";
  const editable = !cancelled;
  const external = event.mode !== "InHouse";
  const mixed = event.mode === "Both";

  const toggle = (
    label: string,
    hint: string,
    key: keyof EventAutomationPatch,
    delayKey?: keyof EventAutomationPatch,
  ) => (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-2.5 last:border-b-0">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <div className="flex items-center gap-3">
        {delayKey && a[key as keyof typeof a] ? (
          <Select
            value={String(a[delayKey as keyof typeof a] as number)}
            onValueChange={(v) =>
              patchMut.mutate({ [delayKey]: Number(v) } as EventAutomationPatch)
            }
            disabled={!editable}
          >
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DELAY_OPTIONS.map((h) => (
                <SelectItem key={h} value={String(h)}>
                  {delayLabel(h)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Switch
          checked={!!a[key as keyof typeof a]}
          disabled={!editable || patchMut.isPending}
          onCheckedChange={(v) =>
            patchMut.mutate({ [key]: v } as EventAutomationPatch)
          }
        />
      </div>
    </div>
  );

  const canSendNow = (group: string) =>
    (group === "pre" &&
      event.status === "Published" &&
      lc.phase === "Pre-event") ||
    (group === "post" &&
      (event.status === "Completed" ||
        (event.status === "Published" && lc.phase === "Post-event")));

  return (
    <div className="space-y-5 pt-1">
      <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
        <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>
          This event is on your Tools calendar automatically, and you'll get a
          heads-up before it starts and a prompt to record results afterwards.
          Reminders and follow-ups go out on their own, once, at the times below
          ({event.timezone}).
        </span>
      </div>

      {!a.configured && !cancelled && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning/40 bg-warning/10 p-3">
          <div className="text-sm">
            <div className="font-medium">
              Automation isn't set up for this event
            </div>
            <div className="text-xs text-muted-foreground">
              It was created before automation existed, so nothing will be sent
              unless you turn it on.
            </div>
          </div>
          <Button
            size="sm"
            disabled={patchMut.isPending}
            onClick={() => patchMut.mutate({})}
          >
            Turn on recommended setup
          </Button>
        </div>
      )}

      <section className="space-y-2">
        <h4 className="text-sm font-semibold">Before the event</h4>
        <div className="rounded-md border">
          {toggle(
            "1 week before",
            "Reminder email to invitees",
            "reminderWeek",
          )}
          {toggle("1 day before", "Reminder email to invitees", "reminderDay")}
          {toggle(
            "1 hour before",
            "Reminder email to invitees",
            "reminderHour",
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
            <div>
              <div className="text-sm font-medium">Custom reminder</div>
              <div className="text-xs text-muted-foreground">
                Hours before the start (1–720)
              </div>
            </div>
            <div className="flex items-center gap-3">
              {customOn && (
                <Input
                  className="h-8 w-24"
                  type="number"
                  min={1}
                  max={720}
                  value={customHours}
                  disabled={!editable}
                  onChange={(e) => setCustomHours(e.target.value)}
                  onBlur={() => {
                    const n = Math.round(Number(customHours));
                    if (n >= 1 && n <= 720 && n !== a.customReminderHours)
                      patchMut.mutate({ customReminderHours: n });
                  }}
                  placeholder="e.g. 72"
                />
              )}
              <Switch
                checked={customOn}
                disabled={!editable}
                onCheckedChange={(v) => {
                  setCustomOn(v);
                  if (!v && a.customReminderHours)
                    patchMut.mutate({ customReminderHours: null });
                }}
              />
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Invitees who've already registered are sent a "see you there"
          reminder; the rest are nudged to register or confirm.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold">After the event</h4>
        <div className="rounded-md border">
          {toggle(
            "Thank-you email",
            "To everyone who attended",
            "thankYouEnabled",
            "thankYouDelayHours",
          )}
          {toggle(
            "Feedback request",
            "Attendees rate the event 1–5 from a personal link",
            "feedbackEnabled",
            "feedbackDelayHours",
          )}
          {toggle(
            "Recording & materials",
            "Sends the links you add in Post-event stats",
            "recordingEnabled",
            "recordingDelayHours",
          )}
          {toggle(
            "No-show follow-up",
            "To people who registered but didn't attend",
            "noShowEnabled",
            "noShowDelayHours",
          )}
          {external &&
            toggle(
              "Update CRM contacts",
              "Tags attendees' contacts with this event and adds it to their timeline",
              "syncContacts",
            )}
          {toggle(
            "Notify me",
            "In-app + email heads-up the day before, and a prompt to record attendance and results",
            "notifyOrganiser",
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Follow-ups count from when the event ends (or from when you mark it
          completed). They go to the attendance list — record who attended in
          the Attendees tab for the most accurate sends.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold">Schedule & delivery</h4>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Step</TableHead>
                <TableHead>Goes to</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lc.schedule.map((s) => (
                <TableRow
                  key={s.key}
                  className={s.status === "Off" ? "opacity-60" : ""}
                >
                  <TableCell className="text-sm font-medium">
                    {s.label}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.audience}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {fmtInZone(s.dueAt, event.timezone)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={STATUS_BADGE[s.status]}
                      variant="secondary"
                    >
                      {s.status}
                    </Badge>
                    {s.status === "Sent" && s.recipients > 0 && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        {s.delivered}/{s.recipients}
                      </span>
                    )}
                    {s.overdue && (
                      <span className="ml-1.5 text-xs text-warning">
                        overdue
                      </span>
                    )}
                    {s.note && (
                      <div className="mt-0.5 max-w-[240px] text-[11px] text-muted-foreground">
                        {s.note}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.manual &&
                      s.status !== "Sent" &&
                      s.status !== "Sending" &&
                      s.status !== "Off" &&
                      canSendNow(s.group) && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={sendMut.isPending}
                          onClick={() => sendMut.mutate(s.key)}
                        >
                          {sendMut.isPending && sendMut.variables === s.key ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="mr-1 h-3 w-3" />
                          )}
                          Send now
                        </Button>
                      )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

// ── Attendees ────────────────────────────────────────────────────

export function AttendeesPanel({ event }: { event: CrmEvent }) {
  const { toast, refresh, onErr } = useEventMutations();
  const lc = event.lifecycle;
  const [walkIns, setWalkIns] = useState("0");
  useEffect(() => {
    setWalkIns(String(event.outcome?.walkIns ?? 0));
  }, [event._id, event.outcome?.walkIns]);

  const markMut = useMutation({
    mutationFn: (dto: Parameters<typeof markEventAttendance>[1]) =>
      markEventAttendance(event._id, dto),
    onSuccess: refresh,
    onError: onErr("Couldn't record attendance"),
  });
  const walkInMut = useMutation({
    mutationFn: () =>
      recordEventOutcome(event._id, {
        walkIns: Math.max(0, Math.round(Number(walkIns) || 0)),
      }),
    onSuccess: () => {
      refresh();
      toast({ title: "Walk-ins saved" });
    },
    onError: onErr("Couldn't save walk-ins"),
  });

  const s = lc?.stats;
  const canRecord =
    event.status === "Completed" ||
    (event.status === "Published" &&
      (lc?.phase === "During" || lc?.phase === "Post-event"));
  const external = event.mode !== "InHouse";
  const mixed = event.mode === "Both";
  const rows: EventInvite[] = event.invites;

  const effective = (i: EventInvite) =>
    i.attended === true || (i.attended == null && hasResponded(i.status));

  const exportCsv = () => {
    downloadCsv(
      `${event.title.replace(/\s+/g, "-").toLowerCase()}-attendance.csv`,
      [
        [
          "Name",
          "Email",
          "Audience",
          "Organisation",
          mixed ? "Responded" : external ? "Registered" : "Acknowledged",
          "Attended",
          "Feedback rating",
          "Feedback comment",
          "Synced to contact",
        ],
        ...rows.map((i) => [
          i.name,
          i.email,
          i.audienceType,
          i.organisation,
          hasResponded(i.status) ? "Yes" : i.status,
          effective(i) ? "Yes" : "No",
          i.feedbackRating != null ? String(i.feedbackRating) : "",
          i.feedbackComment ?? "",
          i.syncedToContact ? "Yes" : "",
        ]),
      ],
    );
  };

  if (!s) return null;
  const synced = rows.filter((i) => i.syncedToContact).length;

  return (
    <div className="space-y-4 pt-1">
      <EventKpis event={event} />

      {!canRecord ? (
        <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          {event.status === "Cancelled"
            ? "This event was cancelled."
            : event.status === "Draft"
              ? "Publish the event first. Attendance can be recorded once it has started."
              : "Attendance can be recorded once the event starts. Until then, registrations and acknowledgements are shown."}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Until you mark someone, a registration / acknowledgement counts as
            attending. Mark who really showed up to correct that — no-shows are
            counted and can be followed up.
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={markMut.isPending}
            onClick={() => markMut.mutate({ markAllRespondedAttended: true })}
          >
            <UserCheck className="mr-1 h-3.5 w-3.5" /> Mark all{" "}
            {mixed ? "responded" : external ? "registered" : "acknowledged"} as
            attended
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Walk-ins (not on the list)</Label>
            <Input
              className="h-8 w-28"
              type="number"
              min={0}
              value={walkIns}
              disabled={!canRecord}
              onChange={(e) => setWalkIns(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={!canRecord || walkInMut.isPending}
            onClick={() => walkInMut.mutate()}
          >
            Save
          </Button>
        </div>
        <div className="flex items-center gap-3">
          {external && (
            <span className="text-xs text-muted-foreground">
              {synced} contact{synced === 1 ? "" : "s"} synced
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={exportCsv}
            disabled={!rows.length}
          >
            <Download className="mr-1 h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No invitees yet. Invite people from the Invitations tab.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>
                  {mixed
                    ? "Responded"
                    : external
                      ? "Registered"
                      : "Acknowledged"}
                </TableHead>
                <TableHead>Attended</TableHead>
                <TableHead>Feedback</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((i) => {
                const present = effective(i);
                const explicit = i.attended != null;
                return (
                  <TableRow key={i.id}>
                    <TableCell>
                      <div className="text-sm font-medium">{i.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {i.organisation || i.email}
                        {i.syncedToContact && (
                          <span className="ml-1 text-success">· in CRM</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {hasResponded(i.status) ? (
                        <span className="inline-flex items-center gap-1 text-xs text-success">
                          <Check className="h-3 w-3" />
                          {i.respondedAt
                            ? new Date(i.respondedAt).toLocaleDateString()
                            : "Yes"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {i.status}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {canRecord ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant={present ? "default" : "outline"}
                            className="h-7 px-2 text-xs"
                            disabled={markMut.isPending}
                            title={
                              i.attended === true
                                ? "Click to clear"
                                : "Mark as attended"
                            }
                            onClick={() =>
                              markMut.mutate({
                                entries: [
                                  {
                                    inviteId: i.id,
                                    attended: i.attended === true ? null : true,
                                  },
                                ],
                              })
                            }
                          >
                            <UserCheck className="mr-1 h-3 w-3" /> Present
                          </Button>
                          <Button
                            size="sm"
                            variant={
                              i.attended === false ? "destructive" : "outline"
                            }
                            className="h-7 px-2 text-xs"
                            disabled={markMut.isPending}
                            title={
                              i.attended === false
                                ? "Click to clear"
                                : "Mark as absent"
                            }
                            onClick={() =>
                              markMut.mutate({
                                entries: [
                                  {
                                    inviteId: i.id,
                                    attended:
                                      i.attended === false ? null : false,
                                  },
                                ],
                              })
                            }
                          >
                            <UserX className="mr-1 h-3 w-3" /> Absent
                          </Button>
                          {!explicit && present && (
                            <span className="text-[10px] text-muted-foreground">
                              from{" "}
                              {mixed
                                ? "response"
                                : external
                                  ? "registration"
                                  : "acknowledgement"}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {present ? "Expected" : "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {i.feedbackRating != null ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs"
                          title={i.feedbackComment || undefined}
                        >
                          <Star className="h-3 w-3 fill-warning text-warning" />
                          {i.feedbackRating}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ── Post-event stats ─────────────────────────────────────────────

export function ResultsPanel({ event }: { event: CrmEvent }) {
  const { toast, refresh, onErr } = useEventMutations();
  const lc = event.lifecycle;
  const o = event.outcome ?? {};

  const initial = useMemo(
    () => ({
      avgSessionDuration: o.avgSessionDuration ?? "",
      leadsGenerated: String(o.leadsGenerated ?? 0),
      followUpCallsBooked: String(o.followUpCallsBooked ?? 0),
      newContacts: String(o.newContacts ?? 0),
      recordingUrl: o.recordingUrl ?? "",
      materialsUrl: o.materialsUrl ?? "",
      notes: o.notes ?? "",
    }),
    [o],
  );
  const [f, setF] = useState(initial);
  useEffect(() => setF(initial), [event._id, initial]);

  const saveMut = useMutation({
    mutationFn: () => {
      const n = (v: string) => Math.max(0, Math.round(Number(v) || 0));
      return recordEventOutcome(event._id, {
        avgSessionDuration: f.avgSessionDuration,
        leadsGenerated: n(f.leadsGenerated),
        followUpCallsBooked: n(f.followUpCallsBooked),
        newContacts: n(f.newContacts),
        recordingUrl: f.recordingUrl,
        materialsUrl: f.materialsUrl,
        notes: f.notes,
      });
    },
    onSuccess: () => {
      refresh();
      toast({ title: "Post-event results saved" });
    },
    onError: onErr("Couldn't save results"),
  });

  if (!lc) return null;
  const s = lc.stats;
  const canRecord =
    event.status === "Completed" ||
    (event.status === "Published" &&
      (lc.phase === "During" || lc.phase === "Post-event"));
  const comments = event.invites.filter(
    (i) => i.feedbackRating != null && i.feedbackComment,
  );
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });

  return (
    <div className="space-y-5 pt-1">
      {!canRecord && (
        <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          {event.status === "Cancelled"
            ? "This event was cancelled."
            : "Results can be recorded once the event has started."}
        </div>
      )}

      <section className="space-y-2">
        <h4 className="text-sm font-semibold">Attendance</h4>
        <EventKpis event={event} />
        <p className="text-xs text-muted-foreground">
          Worked out from your invitations and attendance list —{" "}
          {s.attendedInvites} from the list
          {s.walkIns
            ? ` plus ${s.walkIns} walk-in${s.walkIns === 1 ? "" : "s"}`
            : ""}
          . Change it in the Attendees tab.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold">Feedback</h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-md border bg-muted/30 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold">
              {s.feedbackScore ?? "—"}
              {s.feedbackScore != null && (
                <Star className="h-5 w-5 fill-warning text-warning" />
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Average (out of 5)
            </div>
          </div>
          <div className="rounded-md border bg-muted/30 p-3 text-center">
            <div className="text-2xl font-bold">{s.feedbackResponses}</div>
            <div className="text-xs text-muted-foreground">Responses</div>
          </div>
        </div>
        {comments.length > 0 && (
          <div className="space-y-2">
            {comments.map((i) => (
              <div key={i.id} className="rounded-md border p-2.5 text-sm">
                <div className="mb-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-warning text-warning" />
                  {i.feedbackRating} · {i.name}
                </div>
                {i.feedbackComment}
              </div>
            ))}
          </div>
        )}
        {s.feedbackResponses === 0 && (
          <p className="text-xs text-muted-foreground">
            Feedback arrives from the link in the feedback-request email — turn
            that on in the Automation tab.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h4 className="text-sm font-semibold">Engagement & conversion</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Avg. session duration</Label>
            <Input
              value={f.avgSessionDuration}
              onChange={set("avgSessionDuration")}
              disabled={!canRecord}
              placeholder="e.g. 52 min"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Leads generated</Label>
            <Input
              type="number"
              min={0}
              value={f.leadsGenerated}
              onChange={set("leadsGenerated")}
              disabled={!canRecord}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Follow-up calls booked</Label>
            <Input
              type="number"
              min={0}
              value={f.followUpCallsBooked}
              onChange={set("followUpCallsBooked")}
              disabled={!canRecord}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">New contacts</Label>
            <Input
              type="number"
              min={0}
              value={f.newContacts}
              onChange={set("newContacts")}
              disabled={!canRecord}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="text-sm font-semibold">Content & materials</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Recording link</Label>
            <Input
              value={f.recordingUrl}
              onChange={set("recordingUrl")}
              disabled={!canRecord}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Materials / slides link</Label>
            <Input
              value={f.materialsUrl}
              onChange={set("materialsUrl")}
              disabled={!canRecord}
              placeholder="https://…"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          The "Recording & materials" email sends these links — add them before
          it goes out.
        </p>
        <div className="space-y-1">
          <Label className="text-xs">Post-event notes</Label>
          <Textarea
            rows={4}
            value={f.notes}
            disabled={!canRecord}
            onChange={(e) => setF({ ...f, notes: e.target.value })}
            placeholder="Key takeaways, what worked well, what to improve next time…"
          />
        </div>
      </section>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {o.recordedAt
            ? `Last saved ${fmtInZone(o.recordedAt, event.timezone)}`
            : "Not saved yet"}
        </span>
        <Button
          disabled={!canRecord || saveMut.isPending}
          onClick={() => saveMut.mutate()}
        >
          {saveMut.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Save results
        </Button>
      </div>
    </div>
  );
}

// ── Activity: the full record of the event ───────────────────────

export function ActivityPanel({ event }: { event: CrmEvent }) {
  const items = event.activity ?? [];
  if (!items.length) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nothing recorded yet.
      </p>
    );
  }
  return (
    <ol className="relative ml-2 space-y-4 border-l pl-5 pt-2">
      {items.map((a, idx) => (
        <li key={`${a.at}-${idx}`} className="relative">
          <span className="absolute -left-[26px] top-1.5 h-2 w-2 rounded-full bg-primary" />
          <div className="text-sm">{a.message}</div>
          <div className="text-xs text-muted-foreground">
            {fmtInZone(a.at, event.timezone)}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ── Cancel ───────────────────────────────────────────────────────

export function CancelEventDialog({
  event,
  open,
  onOpenChange,
}: {
  event: CrmEvent | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { toast, refresh, onErr } = useEventMutations();
  const [notify, setNotify] = useState(true);
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (open) {
      setNotify(true);
      setReason("");
    }
  }, [open]);

  const mut = useMutation({
    mutationFn: () =>
      cancelEvent(event!._id, {
        notifyInvitees: notify,
        reason: reason.trim() || undefined,
      }),
    onSuccess: () => {
      refresh();
      onOpenChange(false);
      toast({
        title: "Event cancelled",
        description: notify
          ? "Everyone who was invited has been emailed."
          : "No cancellation emails were sent.",
      });
    },
    onError: onErr("Failed to cancel"),
  });

  const emailed = event?.invites.filter((i) => i.sentAt).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Cancel this
            event?
          </DialogTitle>
          <DialogDescription>
            {event?.title} will be marked cancelled, scheduled reminders and
            follow-ups stop, and it can't be reopened.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={notify}
              onCheckedChange={(v) => setNotify(!!v)}
              className="mt-0.5"
            />
            <span>
              Email everyone who was invited
              <span className="block text-xs text-muted-foreground">
                {emailed} invitation{emailed === 1 ? " was" : "s were"} sent.
              </span>
            </span>
          </label>
          {notify && (
            <div className="space-y-1">
              <Label className="text-xs">Reason (included in the email)</Label>
              <Textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep event
          </Button>
          <Button
            variant="destructive"
            disabled={mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cancel event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
