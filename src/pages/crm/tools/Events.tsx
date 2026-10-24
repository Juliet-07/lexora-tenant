import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  CalendarDays,
  Plus,
  Users,
  Mail,
  CheckCircle2,
  Download,
  Trash2,
  Send,
  Copy,
  Pencil,
  Search,
  Video,
  MapPin,
  Rocket,
  Ban,
  FlagOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EventOpenLink } from "@/components/crm/EventOpenLink";
import {
  ActivityPanel,
  AttendeesPanel,
  AutomationPanel,
  CancelEventDialog,
  EventKpis,
  PipelineStrip,
  ResultsPanel,
} from "@/components/crm/EventLifeCycle";
import {
  fetchEvents,
  fetchEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  inviteToEvent,
  removeEventInvite,
  publishEvent,
  completeEvent,
  EVENT_TYPES,
  type CrmEvent,
  type EventType,
  type EventMode,
  type EventStatus,
  type EventAudienceType,
  type EventPayload,
} from "@/lib/crm/events-api";
import {
  fetchClients,
  displayName,
  type ApiClient,
} from "@/lib/client/clients-api";
import { fetchContacts, type Contact } from "@/lib/crm/crm-contacts-api";
import { fetchBoardMembers, type BoardMember } from "@/lib/grc/governance-api";
import { fetchEmployees, type Employee } from "@/lib/hr/hr-api";

const STATUS_STYLES: Record<EventStatus, string> = {
  Draft: "bg-muted text-muted-foreground",
  Published: "bg-success/15 text-success",
  Completed: "bg-primary/10 text-primary",
  Cancelled: "bg-destructive/10 text-destructive",
};

const AUDIENCE_LABEL: Record<EventAudienceType, string> = {
  Client: "Client",
  BoardMember: "Board member",
  Employee: "Employee",
  Contact: "Contact",
};

// The backend validates registrationDeadline's format only when a
// real value is present (an empty string from the hidden InHouse
// field, or a cleared date picker, is not a value) — but there's no
// reason to send a meaningless "" either way.
const cleanPayload = (d: EventPayload): EventPayload => ({
  ...d,
  registrationDeadline: d.registrationDeadline || undefined,
});

const browserZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Kigali";
  } catch {
    return "Africa/Kigali";
  }
};
const COMMON_ZONES = [
  "Africa/Kigali",
  "Africa/Nairobi",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Africa/Cairo",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "UTC",
];

const emptyDraft = (): EventPayload => ({
  title: "",
  type: "Webinar",
  mode: "External",
  description: "",
  date: "",
  startTime: "09:00",
  endTime: "10:00",
  location: "",
  virtual: false,
  meetingLink: "",
  capacity: 0,
  host: "",
  agenda: "",
  registrationDeadline: "",
  timezone: browserZone(),
});

const toDraft = (e: CrmEvent): EventPayload => ({
  title: e.title,
  type: e.type,
  mode: e.mode,
  description: e.description,
  date: e.date.slice(0, 10),
  startTime: e.startTime,
  endTime: e.endTime,
  location: e.location,
  virtual: e.virtual,
  meetingLink: e.meetingLink,
  capacity: e.capacity,
  host: e.host,
  agenda: e.agenda,
  registrationDeadline: e.registrationDeadline
    ? e.registrationDeadline.slice(0, 10)
    : "",
  timezone: e.timezone || "Africa/Kigali",
});

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

// Real attendance signal for either event shape — a submitted
// External registration or an InHouse portal acknowledgement; there
// is no separate manual "check in" step on top of either.
const hasResponded = (status: string) =>
  status === "Registered" || status === "Acknowledged";

export default function Events() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const { data: events = [] } = useQuery({
    queryKey: ["crm-events"],
    queryFn: fetchEvents,
  });
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["crm-events"] });

  const { data: clients = [] } = useQuery<ApiClient[]>({
    queryKey: ["clients-for-events"],
    queryFn: fetchClients,
  });
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["contacts-for-events"],
    queryFn: fetchContacts,
  });
  const { data: boardMembers = [] } = useQuery<BoardMember[]>({
    queryKey: ["board-members-for-events"],
    queryFn: fetchBoardMembers,
  });
  const { data: employeesPage } = useQuery({
    queryKey: ["employees-for-events"],
    queryFn: () => fetchEmployees({ limit: 500 }),
  });
  const employees: Employee[] = employeesPage?.items ?? [];

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EventPayload>(emptyDraft());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState("");
  const [checkedInvitees, setCheckedInvitees] = useState<
    { audienceType: EventAudienceType; sourceId: string }[]
  >([]);
  const [regSearch, setRegSearch] = useState("");

  const selected = events.find((e) => e._id === selectedId) ?? null;
  const zoneOptions = useMemo(
    () =>
      Array.from(new Set([draft.timezone, ...COMMON_ZONES])).filter(
        Boolean,
      ) as string[],
    [draft.timezone],
  );

  const totals = useMemo(() => {
    const published = events.filter((e) => e.status === "Published").length;
    const invited = events.reduce((n, e) => n + e.invites.length, 0);
    const responded = events.reduce(
      (n, e) => n + e.invites.filter((i) => hasResponded(i.status)).length,
      0,
    );
    const failed = events.reduce(
      (n, e) => n + e.invites.filter((i) => i.deliveryError).length,
      0,
    );
    return { published, invited, responded, failed };
  }, [events]);

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setEditorOpen(true);
  };
  const openEdit = (e: CrmEvent) => {
    setEditingId(e._id);
    setDraft(toDraft(e));
    setEditorOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = cleanPayload(draft);
      return editingId ? updateEvent(editingId, payload) : createEvent(payload);
    },
    onSuccess: (e) => {
      invalidate();
      setEditorOpen(false);
      setSelectedId(e._id);
      toast({
        title: editingId ? "Event updated" : "Event created as a draft",
        description: editingId
          ? undefined
          : "It's on your calendar, and reminders will go out once you publish.",
      });
    },
    onError: onErr(
      editingId ? "Failed to save changes" : "Failed to create event",
    ),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      invalidate();
      setSelectedId(null);
      toast({ title: "Event deleted" });
    },
    onError: onErr("Failed to delete"),
  });
  const publishMut = useMutation({
    mutationFn: (id: string) => publishEvent(id),
    onSuccess: (e) => {
      invalidate();
      const sent = e.invites.filter((i) => i.sentAt).length;
      toast({
        title: "Event published",
        description: sent
          ? `Invitations sent to ${sent} invitee${sent === 1 ? "" : "s"}.`
          : "No invitees yet — invite people, and they'll be emailed as soon as you do.",
      });
    },
    onError: onErr("Failed to publish"),
  });
  const [cancelOpen, setCancelOpen] = useState(false);
  const completeMut = useMutation({
    mutationFn: (id: string) => completeEvent(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Event marked completed" });
    },
    onError: onErr("Failed to mark completed"),
  });

  const openInvites = () => {
    setCheckedInvitees([]);
    setPeopleSearch("");
    setInviteOpen(true);
  };

  const alreadyInvitedKeys = useMemo(
    () =>
      new Set(
        (selected?.invites ?? []).map((i) => `${i.audienceType}:${i.sourceId}`),
      ),
    [selected],
  );
  const toggleInvitee = (audienceType: EventAudienceType, sourceId: string) => {
    const key = `${audienceType}:${sourceId}`;
    setCheckedInvitees((prev) =>
      prev.some((p) => `${p.audienceType}:${p.sourceId}` === key)
        ? prev.filter((p) => `${p.audienceType}:${p.sourceId}` !== key)
        : [...prev, { audienceType, sourceId }],
    );
  };
  const isChecked = (audienceType: EventAudienceType, sourceId: string) =>
    checkedInvitees.some(
      (p) => p.audienceType === audienceType && p.sourceId === sourceId,
    );

  const filteredClients = clients.filter((c) =>
    displayName(c).toLowerCase().includes(peopleSearch.toLowerCase()),
  );
  const filteredBoardMembers = boardMembers
    .filter((m) => m.lifecycleStatus !== "Offboarded")
    .filter((m) => m.name.toLowerCase().includes(peopleSearch.toLowerCase()));
  const filteredEmployees = employees.filter((e) =>
    `${e.firstName} ${e.lastName}`
      .toLowerCase()
      .includes(peopleSearch.toLowerCase()),
  );
  const filteredContacts = contacts
    .filter((c) => c.email)
    .filter((c) =>
      `${c.name} ${c.organisation} ${c.email}`
        .toLowerCase()
        .includes(peopleSearch.toLowerCase()),
    );

  const inviteMut = useMutation({
    mutationFn: () => inviteToEvent(selected!._id, checkedInvitees),
    onSuccess: (e) => {
      invalidate();
      const added = e.invites.length - (selected?.invites.length ?? 0);
      toast({
        title: `${added} invitation${added === 1 ? "" : "s"} added`,
        description:
          e.status === "Published"
            ? "They've been emailed immediately — the event is already published."
            : "They'll be emailed once you publish this event.",
      });
      setInviteOpen(false);
    },
    onError: onErr("Failed to invite"),
  });
  const removeInviteMut = useMutation({
    mutationFn: (inviteId: string) =>
      removeEventInvite(selected!._id, inviteId),
    onSuccess: () => {
      invalidate();
      toast({ title: "Invite removed" });
    },
    onError: onErr("Failed to remove invite"),
  });

  const copyLink = (token: string) => {
    navigator.clipboard
      .writeText(`${window.location.origin}/event-register/${token}`)
      .then(() => toast({ title: "Registration link copied" }))
      .catch(() =>
        toast({ title: "Couldn't copy the link", variant: "destructive" }),
      );
  };

  const exportInvites = (e: CrmEvent) => {
    downloadCsv(`${e.title.replace(/\s+/g, "-").toLowerCase()}-invites.csv`, [
      [
        "Name",
        "Email",
        "Audience",
        "Organisation",
        "Status",
        "Sent at",
        "Responded at",
        "Source",
      ],
      ...e.invites.map((i) => [
        i.name,
        i.email,
        AUDIENCE_LABEL[i.audienceType],
        i.organisation,
        i.status,
        i.sentAt ? new Date(i.sentAt).toLocaleString() : "",
        i.respondedAt ? new Date(i.respondedAt).toLocaleString() : "",
        i.source === "OpenLink" ? "Public link" : "Invited",
      ]),
    ]);
    toast({ title: "Invitations exported" });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Event Management</h1>
          <p className="text-sm text-muted-foreground">
            Plan it, run it and follow it up. Publishing emails every invitee
            their registration link (external) or asks them to acknowledge on
            their own portal (in-house); reminders, attendance, feedback and
            follow-ups are tracked here, and every event is on your calendar.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> New event
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Published events",
            value: totals.published,
            icon: CalendarDays,
          },
          { label: "Invitations sent", value: totals.invited, icon: Mail },
          {
            label: "Registered / acknowledged",
            value: totals.responded,
            icon: CheckCircle2,
          },
          { label: "Delivery failures", value: totals.failed, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Events</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No events yet — create your first event to start inviting people.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Invited</TableHead>
                  <TableHead className="text-right">Responded</TableHead>
                  <TableHead className="text-right">Attended</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow
                    key={e._id}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(e._id)}
                  >
                    <TableCell>
                      <div className="font-medium">{e.title}</div>
                      <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        {e.virtual ? (
                          <Video className="h-3 w-3" />
                        ) : (
                          <MapPin className="h-3 w-3" />
                        )}
                        {e.location || (e.virtual ? "Virtual" : "—")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {e.mode === "InHouse" ? "In-house" : "External"}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {e.date.slice(0, 10)}
                      <div className="text-xs text-muted-foreground">
                        {e.startTime}–{e.endTime}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={STATUS_STYLES[e.status]}
                        variant="secondary"
                      >
                        {e.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {e.invites.length}
                    </TableCell>
                    <TableCell className="text-right">
                      {e.invites.filter((i) => hasResponded(i.status)).length}
                      {e.capacity > 0 && (
                        <span className="text-xs text-muted-foreground">
                          /{e.capacity}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {e.lifecycle &&
                      (e.status === "Completed" ||
                        e.lifecycle.phase === "During" ||
                        e.lifecycle.phase === "Post-event") &&
                      e.status !== "Cancelled" &&
                      e.status !== "Draft"
                        ? e.lifecycle.stats.totalAttendance
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Create / edit dialog ─────────────────────────────── */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit event" : "New event"}</DialogTitle>
            <DialogDescription>
              Publish the event to email every invitee; keep it as a draft while
              you prepare.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Title *</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={draft.type}
                onValueChange={(v) =>
                  setDraft({ ...draft, type: v as EventType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Audience</Label>
              {editingId ? (
                <div className="flex h-10 items-center">
                  <Badge variant="outline">
                    {draft.mode === "InHouse" ? "In-house" : "External"}
                  </Badge>
                  <span className="ml-2 text-xs text-muted-foreground">
                    Fixed once created
                  </span>
                </div>
              ) : (
                <Select
                  value={draft.mode}
                  onValueChange={(v) =>
                    setDraft({ ...draft, mode: v as EventMode })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="External">
                      External — invite CRM contacts, who register
                    </SelectItem>
                    <SelectItem value="InHouse">
                      In-house — invite clients / board members / employees, who
                      acknowledge on their portal
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </div>
            {draft.mode === "External" && (
              <div className="space-y-1.5">
                <Label>Registration deadline</Label>
                <Input
                  type="date"
                  value={draft.registrationDeadline}
                  onChange={(e) =>
                    setDraft({ ...draft, registrationDeadline: e.target.value })
                  }
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Start time</Label>
              <Input
                type="time"
                value={draft.startTime}
                onChange={(e) =>
                  setDraft({ ...draft, startTime: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>End time</Label>
              <Input
                type="time"
                value={draft.endTime}
                onChange={(e) =>
                  setDraft({ ...draft, endTime: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Time zone</Label>
              <Select
                value={draft.timezone}
                onValueChange={(v) => setDraft({ ...draft, timezone: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {zoneOptions.map((z) => (
                    <SelectItem key={z} value={z}>
                      {z.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The times above are in this zone — reminders and follow-ups are
                scheduled against it.
              </p>
            </div>
            <div className="space-y-1.5 sm:col-span-2 flex items-center gap-2">
              <Switch
                checked={draft.virtual}
                onCheckedChange={(v) => setDraft({ ...draft, virtual: v })}
              />
              <Label>Virtual event</Label>
            </div>
            {draft.virtual ? (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Meeting link</Label>
                <Input
                  value={draft.meetingLink}
                  onChange={(e) =>
                    setDraft({ ...draft, meetingLink: e.target.value })
                  }
                  placeholder="https://…"
                />
              </div>
            ) : (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Venue</Label>
                <Input
                  value={draft.location}
                  onChange={(e) =>
                    setDraft({ ...draft, location: e.target.value })
                  }
                />
              </div>
            )}
            {draft.mode === "External" && (
              <div className="space-y-1.5">
                <Label>Capacity (0 = unlimited)</Label>
                <Input
                  type="number"
                  min={0}
                  value={draft.capacity}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      capacity: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Host / organiser</Label>
              <Input
                value={draft.host}
                onChange={(e) => setDraft({ ...draft, host: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Agenda</Label>
              <Textarea
                rows={3}
                value={draft.agenda}
                onChange={(e) => setDraft({ ...draft, agenda: e.target.value })}
                placeholder="09:00 — Opening keynote…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMut.mutate()}
              disabled={!draft.title.trim() || !draft.date || saveMut.isPending}
            >
              {editingId ? "Save changes" : "Create event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Event detail sheet ───────────────────────────────── */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 flex-wrap">
                  {selected.title}
                  <Badge
                    className={STATUS_STYLES[selected.status]}
                    variant="secondary"
                  >
                    {selected.status}
                  </Badge>
                  <Badge variant="outline">
                    {selected.mode === "InHouse" ? "In-house" : "External"}
                  </Badge>
                </SheetTitle>
                <SheetDescription>
                  {selected.date.slice(0, 10)} · {selected.startTime}–
                  {selected.endTime} ·{" "}
                  {selected.virtual ? "Virtual" : selected.location}
                </SheetDescription>
              </SheetHeader>

              <div className="flex gap-2 flex-wrap mt-4">
                {(selected.status === "Draft" ||
                  selected.status === "Published") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(selected)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                )}
                {selected.status === "Draft" && (
                  <Button
                    size="sm"
                    onClick={() => publishMut.mutate(selected._id)}
                    disabled={publishMut.isPending}
                  >
                    <Rocket className="h-3.5 w-3.5 mr-1" /> Publish
                  </Button>
                )}
                {selected.status === "Published" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => completeMut.mutate(selected._id)}
                  >
                    <FlagOff className="h-3.5 w-3.5 mr-1" /> Mark completed
                  </Button>
                )}
                {(selected.status === "Draft" ||
                  selected.status === "Published") && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => setCancelOpen(true)}
                  >
                    <Ban className="h-3.5 w-3.5 mr-1" /> Cancel event
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportInvites(selected)}
                >
                  <Download className="h-3.5 w-3.5 mr-1" /> Export invitations
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => deleteMut.mutate(selected._id)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              </div>

              {selected.status !== "Draft" && (
                <div className="mt-5 space-y-4">
                  <EventKpis event={selected} />
                  <PipelineStrip event={selected} />
                </div>
              )}

              <Tabs defaultValue="overview" className="mt-6" key={selected._id}>
                <TabsList className="h-auto flex-wrap justify-start">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="invites">
                    Invitations ({selected.invites.length})
                  </TabsTrigger>
                  <TabsTrigger value="automation">Automation</TabsTrigger>
                  <TabsTrigger value="attendees">Attendees</TabsTrigger>
                  <TabsTrigger value="results">Post-event stats</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="automation">
                  <AutomationPanel event={selected} />
                </TabsContent>
                <TabsContent value="attendees">
                  <AttendeesPanel event={selected} />
                </TabsContent>
                <TabsContent value="results">
                  <ResultsPanel event={selected} />
                </TabsContent>
                <TabsContent value="activity">
                  <ActivityPanel event={selected} />
                </TabsContent>

                <TabsContent value="overview" className="space-y-4 pt-4">
                  {selected.description && (
                    <p className="text-sm whitespace-pre-line">
                      {selected.description}
                    </p>
                  )}
                  {selected.agenda && (
                    <div className="rounded-md border bg-muted/40 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                        Agenda
                      </p>
                      <p className="text-sm whitespace-pre-line">
                        {selected.agenda}
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Type:</span>{" "}
                      {selected.type}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Host:</span>{" "}
                      {selected.host || "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time zone:</span>{" "}
                      {selected.timezone || "Africa/Kigali"}
                    </div>
                    {selected.mode === "External" && (
                      <>
                        <div>
                          <span className="text-muted-foreground">
                            Capacity:
                          </span>{" "}
                          {selected.capacity > 0
                            ? selected.capacity
                            : "Unlimited"}
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Deadline:
                          </span>{" "}
                          {selected.registrationDeadline
                            ? selected.registrationDeadline.slice(0, 10)
                            : "—"}
                        </div>
                      </>
                    )}
                    {selected.virtual && selected.meetingLink && (
                      <div className="col-span-2 break-all">
                        <span className="text-muted-foreground">
                          Meeting link:
                        </span>{" "}
                        {selected.meetingLink}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="invites" className="space-y-3 pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {selected.mode === "External"
                        ? "Each invited contact gets their own personal registration link — submitting it is their attendance record. For people who aren't contacts yet, share the public link below."
                        : "Each invitee acknowledges attendance from their own portal — that's their attendance record."}
                    </p>
                    <Button size="sm" onClick={openInvites}>
                      <Send className="h-3.5 w-3.5 mr-1" /> Invite{" "}
                      {selected.mode === "External" ? "contacts" : "people"}
                    </Button>
                  </div>
                  <EventOpenLink event={selected} />
                  {selected.invites.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      No invitations yet.
                    </p>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="pl-8"
                          placeholder="Search invitations…"
                          value={regSearch}
                          onChange={(e) => setRegSearch(e.target.value)}
                        />
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invitee</TableHead>
                            <TableHead>Audience</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selected.invites
                            .filter((i) =>
                              regSearch
                                ? `${i.name} ${i.email} ${i.organisation}`
                                    .toLowerCase()
                                    .includes(regSearch.toLowerCase())
                                : true,
                            )
                            .map((inv) => (
                              <TableRow key={inv.id}>
                                <TableCell>
                                  <div className="font-medium">{inv.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {inv.email}
                                    {inv.deliveryError && (
                                      <span className="text-destructive">
                                        {" "}
                                        · send failed: {inv.deliveryError}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {AUDIENCE_LABEL[inv.audienceType]}
                                  </Badge>
                                  {inv.source === "OpenLink" && (
                                    <Badge
                                      variant="secondary"
                                      className="ml-1 text-xs"
                                    >
                                      Public link
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">
                                    {inv.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right space-x-1">
                                  {inv.audienceType === "Contact" &&
                                    inv.source !== "OpenLink" && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        title="Copy personal registration link"
                                        onClick={() => copyLink(inv.token)}
                                      >
                                        <Copy className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  {!hasResponded(inv.status) && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      title="Remove invite"
                                      onClick={() =>
                                        removeInviteMut.mutate(inv.id)
                                      }
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      <CancelEventDialog
        event={selected}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
      />

      {/* ── Invite people dialog — audience depends on the event's mode ── */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Invite {selected?.mode === "External" ? "contacts" : "people"}
            </DialogTitle>
            <DialogDescription>
              {selected?.mode === "External"
                ? "Select CRM contacts — each gets their own personal registration link by email."
                : "Select clients, board members and/or employees — each is notified to acknowledge attendance on their own portal."}
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search…"
              value={peopleSearch}
              onChange={(e) => setPeopleSearch(e.target.value)}
            />
          </div>

          {selected?.mode === "External" ? (
            <ScrollArea className="h-72">
              <div className="space-y-1">
                {filteredContacts.length === 0 && (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No contacts with an email address found.
                  </p>
                )}
                {filteredContacts.map((c) => {
                  const already = alreadyInvitedKeys.has(`Contact:${c._id}`);
                  return (
                    <label
                      key={c._id}
                      className="flex items-center gap-3 rounded-md border p-2.5 cursor-pointer hover:bg-muted/50"
                    >
                      <Checkbox
                        disabled={already}
                        checked={already || isChecked("Contact", c._id)}
                        onCheckedChange={() => toggleInvitee("Contact", c._id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {c.name}
                          {already && (
                            <span className="text-xs text-muted-foreground">
                              {" "}
                              (already invited)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {c.organisation} · {c.email}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <Tabs defaultValue="clients">
              <TabsList className="flex-wrap">
                <TabsTrigger value="clients">Clients</TabsTrigger>
                <TabsTrigger value="board">Board members</TabsTrigger>
                <TabsTrigger value="employees">Employees</TabsTrigger>
              </TabsList>
              <TabsContent value="clients">
                <ScrollArea className="h-64">
                  <div className="space-y-1">
                    {filteredClients.map((c) => {
                      const already = alreadyInvitedKeys.has(`Client:${c._id}`);
                      return (
                        <label
                          key={c._id}
                          className="flex items-center gap-3 rounded-md border p-2.5 cursor-pointer hover:bg-muted/50"
                        >
                          <Checkbox
                            disabled={already}
                            checked={already || isChecked("Client", c._id)}
                            onCheckedChange={() =>
                              toggleInvitee("Client", c._id)
                            }
                          />
                          <div className="text-sm">
                            {displayName(c)}
                            {already && (
                              <span className="text-xs text-muted-foreground">
                                {" "}
                                (already invited)
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                    {!filteredClients.length && (
                      <p className="text-sm text-muted-foreground py-6 text-center">
                        No clients match.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="board">
                <ScrollArea className="h-64">
                  <div className="space-y-1">
                    {filteredBoardMembers.map((m) => {
                      const already = alreadyInvitedKeys.has(
                        `BoardMember:${m._id}`,
                      );
                      return (
                        <label
                          key={m._id}
                          className="flex items-center gap-3 rounded-md border p-2.5 cursor-pointer hover:bg-muted/50"
                        >
                          <Checkbox
                            disabled={already}
                            checked={already || isChecked("BoardMember", m._id)}
                            onCheckedChange={() =>
                              toggleInvitee("BoardMember", m._id)
                            }
                          />
                          <div className="text-sm">
                            {m.name}
                            {already && (
                              <span className="text-xs text-muted-foreground">
                                {" "}
                                (already invited)
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                    {!filteredBoardMembers.length && (
                      <p className="text-sm text-muted-foreground py-6 text-center">
                        No board members match.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="employees">
                <ScrollArea className="h-64">
                  <div className="space-y-1">
                    {filteredEmployees.map((e) => {
                      const already = alreadyInvitedKeys.has(
                        `Employee:${e._id}`,
                      );
                      return (
                        <label
                          key={e._id}
                          className="flex items-center gap-3 rounded-md border p-2.5 cursor-pointer hover:bg-muted/50"
                        >
                          <Checkbox
                            disabled={already}
                            checked={already || isChecked("Employee", e._id)}
                            onCheckedChange={() =>
                              toggleInvitee("Employee", e._id)
                            }
                          />
                          <div className="text-sm">
                            {e.firstName} {e.lastName}
                            {already && (
                              <span className="text-xs text-muted-foreground">
                                {" "}
                                (already invited)
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                    {!filteredEmployees.length && (
                      <p className="text-sm text-muted-foreground py-6 text-center">
                        No employees match.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => inviteMut.mutate()}
              disabled={!checkedInvitees.length || inviteMut.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              Invite {checkedInvitees.length || ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
