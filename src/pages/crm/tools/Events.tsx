import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { toast } from "sonner";
import {
  useEventsStore,
  createEvent,
  updateEventDetails,
  deleteEvent,
  sendEventInvites,
  removeInvite,
  setRegistrationStatus,
  activeRegistrations,
  attendedCount,
  EVENT_TYPES,
  type CrmEvent,
  type EventStatus,
  type UpsertEventPayload,
} from "@/lib/crm/eventsStore";
import { fetchContacts, type Contact } from "@/lib/crm/crm-contacts-api";

const STATUS_STYLES: Record<EventStatus, string> = {
  Draft: "bg-muted text-muted-foreground",
  Published: "bg-success/15 text-success",
  Completed: "bg-primary/10 text-primary",
  Cancelled: "bg-destructive/10 text-destructive",
};

const emptyDraft = (): UpsertEventPayload => ({
  title: "",
  type: "Webinar",
  status: "Draft",
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
});

const toDraft = (e: CrmEvent): UpsertEventPayload => ({
  title: e.title,
  type: e.type,
  status: e.status,
  description: e.description,
  date: e.date,
  startTime: e.startTime,
  endTime: e.endTime,
  location: e.location,
  virtual: e.virtual,
  meetingLink: e.meetingLink,
  capacity: e.capacity,
  host: e.host,
  agenda: e.agenda,
  registrationDeadline: e.registrationDeadline,
});

const downloadCsv = (filename: string, rows: string[][]) => {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export default function Events() {
  const { events } = useEventsStore();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<UpsertEventPayload>(emptyDraft());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [checkedContacts, setCheckedContacts] = useState<string[]>([]);
  const [regSearch, setRegSearch] = useState("");

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["crm-contacts"],
    queryFn: fetchContacts,
  });

  const selected = events.find((e) => e.id === selectedId) ?? null;

  const totals = useMemo(() => {
    const published = events.filter((e) => e.status === "Published").length;
    const invites = events.reduce((n, e) => n + e.invites.length, 0);
    const regs = events.reduce((n, e) => n + activeRegistrations(e).length, 0);
    const attended = events.reduce((n, e) => n + attendedCount(e), 0);
    return { published, invites, regs, attended };
  }, [events]);

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setEditorOpen(true);
  };

  const openEdit = (e: CrmEvent) => {
    setEditingId(e.id);
    setDraft(toDraft(e));
    setEditorOpen(true);
  };

  const saveEvent = () => {
    if (!draft.title.trim() || !draft.date) {
      toast.error("Give the event a title and a date.");
      return;
    }
    if (editingId) {
      updateEventDetails(editingId, draft);
      toast.success("Event updated.");
    } else {
      createEvent(draft);
      toast.success("Event created.");
    }
    setEditorOpen(false);
  };

  const openInvites = () => {
    setCheckedContacts([]);
    setContactSearch("");
    setInviteOpen(true);
  };

  const emailableContacts = useMemo(
    () =>
      contacts
        .filter((c) => c.email)
        .filter((c) =>
          contactSearch
            ? `${c.name} ${c.organisation} ${c.email}`
                .toLowerCase()
                .includes(contactSearch.toLowerCase())
            : true,
        ),
    [contacts, contactSearch],
  );

  const dispatchInvites = () => {
    if (!selected) return;
    const chosen = contacts.filter((c) => checkedContacts.includes(c._id));
    if (!chosen.length) {
      toast.error("Select at least one contact.");
      return;
    }
    // Demo dispatch only — no email is actually sent (prototype store).
    sendEventInvites(
      selected.id,
      chosen.map((c) => ({
        id: c._id,
        name: c.name,
        email: c.email,
        organisation: c.organisation,
      })),
    );
    toast.success(
      `${chosen.length} invitation${chosen.length === 1 ? "" : "s"} recorded (demo — no email sent).`,
    );
    setInviteOpen(false);
  };

  const copyLink = (token: string) => {
    navigator.clipboard
      .writeText(`${window.location.origin}/event-register/${token}`)
      .then(() => toast.success("Registration link copied."))
      .catch(() => toast.error("Couldn't copy the link."));
  };

  const exportRegistrations = (e: CrmEvent) => {
    downloadCsv(
      `${e.title.replace(/\s+/g, "-").toLowerCase()}-registrations.csv`,
      [
        ["Name", "Email", "Organisation", "Phone", "Status", "Registered at", "Checked in"],
        ...e.registrations.map((r) => [
          r.name,
          r.email,
          r.organisation,
          r.phone,
          r.status,
          new Date(r.registeredAt).toLocaleString(),
          r.checkedInAt ? new Date(r.checkedInAt).toLocaleString() : "",
        ]),
      ],
    );
    toast.success("Registrations exported.");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Event Management</h1>
          <p className="text-sm text-muted-foreground">
            Preview data is saved only in this browser. Invitation links do not work on other devices, and no emails are sent.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> New event
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Published events", value: totals.published, icon: CalendarDays },
          { label: "Invitations recorded", value: totals.invites, icon: Mail },
          { label: "Registrations", value: totals.regs, icon: Users },
          { label: "Attended", value: totals.attended, icon: CheckCircle2 },
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
              No events yet — create your first event to start inviting contacts.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Invited</TableHead>
                  <TableHead className="text-right">Registered</TableHead>
                  <TableHead className="text-right">Attended</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow
                    key={e.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(e.id)}
                  >
                    <TableCell>
                      <div className="font-medium">{e.title}</div>
                      <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        {e.virtual ? (
                          <Video className="h-3 w-3" />
                        ) : (
                          <MapPin className="h-3 w-3" />
                        )}
                        {e.location}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {e.date}
                      <div className="text-xs text-muted-foreground">
                        {e.startTime}–{e.endTime}
                      </div>
                    </TableCell>
                    <TableCell>{e.type}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_STYLES[e.status]} variant="secondary">
                        {e.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{e.invites.length}</TableCell>
                    <TableCell className="text-right">
                      {activeRegistrations(e).length}
                      {e.capacity > 0 && (
                        <span className="text-xs text-muted-foreground">/{e.capacity}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{attendedCount(e)}</TableCell>
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
              Publish the event to open registration; keep it as a draft while you prepare.
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
                onValueChange={(v) => setDraft({ ...draft, type: v as UpsertEventPayload["type"] })}
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
              <Label>Status</Label>
              <Select
                value={draft.status}
                onValueChange={(v) => setDraft({ ...draft, status: v as EventStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["Draft", "Published", "Completed", "Cancelled"] as EventStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Registration deadline</Label>
              <Input
                type="date"
                value={draft.registrationDeadline}
                onChange={(e) => setDraft({ ...draft, registrationDeadline: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Start time</Label>
              <Input
                type="time"
                value={draft.startTime}
                onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>End time</Label>
              <Input
                type="time"
                value={draft.endTime}
                onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
              />
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
                  onChange={(e) => setDraft({ ...draft, meetingLink: e.target.value })}
                  placeholder="https://…"
                />
              </div>
            ) : (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Venue</Label>
                <Input
                  value={draft.location}
                  onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Capacity (0 = unlimited)</Label>
              <Input
                type="number"
                min={0}
                value={draft.capacity}
                onChange={(e) => setDraft({ ...draft, capacity: Number(e.target.value) || 0 })}
              />
            </div>
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
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
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
            <Button onClick={saveEvent}>{editingId ? "Save changes" : "Create event"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Event detail sheet ───────────────────────────────── */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 flex-wrap">
                  {selected.title}
                  <Badge className={STATUS_STYLES[selected.status]} variant="secondary">
                    {selected.status}
                  </Badge>
                </SheetTitle>
                <SheetDescription>
                  {selected.date} · {selected.startTime}–{selected.endTime} · {selected.location}
                </SheetDescription>
              </SheetHeader>

              <div className="flex gap-2 flex-wrap mt-4">
                <Button size="sm" variant="outline" onClick={() => openEdit(selected)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => copyLink(selected.id)}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy open link
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportRegistrations(selected)}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Export registrations
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => {
                    deleteEvent(selected.id);
                    setSelectedId(null);
                    toast.success("Event deleted.");
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              </div>

              <Tabs defaultValue="invites" className="mt-6">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="invites">
                    Invitations ({selected.invites.length})
                  </TabsTrigger>
                  <TabsTrigger value="registrations">
                    Registrations ({activeRegistrations(selected).length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 pt-4">
                  {selected.description && (
                    <p className="text-sm whitespace-pre-line">{selected.description}</p>
                  )}
                  {selected.agenda && (
                    <div className="rounded-md border bg-muted/40 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                        Agenda
                      </p>
                      <p className="text-sm whitespace-pre-line">{selected.agenda}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Type:</span> {selected.type}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Host:</span> {selected.host || "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Capacity:</span>{" "}
                      {selected.capacity > 0 ? selected.capacity : "Unlimited"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Deadline:</span>{" "}
                      {selected.registrationDeadline || "—"}
                    </div>
                    {selected.virtual && selected.meetingLink && (
                      <div className="col-span-2 break-all">
                        <span className="text-muted-foreground">Meeting link:</span>{" "}
                        {selected.meetingLink}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="invites" className="space-y-3 pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      Demo tracking only — invitations are recorded here, no email is sent.
                    </p>
                    <Button size="sm" onClick={openInvites}>
                      <Send className="h-3.5 w-3.5 mr-1" /> Invite contacts
                    </Button>
                  </div>
                  {selected.invites.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      No invitations yet.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Contact</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.invites.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell>
                              <div className="font-medium">{inv.name}</div>
                              <div className="text-xs text-muted-foreground">{inv.email}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{inv.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Copy personal registration link"
                                onClick={() => copyLink(inv.token)}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Remove invite"
                                onClick={() => removeInvite(selected.id, inv.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                <TabsContent value="registrations" className="space-y-3 pt-4">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-8"
                      placeholder="Search registrations…"
                      value={regSearch}
                      onChange={(e) => setRegSearch(e.target.value)}
                    />
                  </div>
                  {selected.registrations.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      No registrations yet — share the open link or invite contacts.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Attendee</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.registrations
                          .filter((r) =>
                            regSearch
                              ? `${r.name} ${r.email} ${r.organisation}`
                                  .toLowerCase()
                                  .includes(regSearch.toLowerCase())
                              : true,
                          )
                          .map((r) => (
                            <TableRow key={r.id}>
                              <TableCell>
                                <div className="font-medium">{r.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {r.email}
                                  {r.organisation ? ` · ${r.organisation}` : ""}
                                </div>
                                {r.notes && (
                                  <div className="text-xs text-muted-foreground italic">
                                    {r.notes}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{r.status}</Badge>
                              </TableCell>
                              <TableCell className="text-right space-x-1">
                                {r.status === "Registered" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setRegistrationStatus(selected.id, r.id, "Attended")
                                    }
                                  >
                                    Check in
                                  </Button>
                                )}
                                {r.status !== "Cancelled" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      setRegistrationStatus(selected.id, r.id, "Cancelled")
                                    }
                                  >
                                    Cancel
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Invite contacts dialog ───────────────────────────── */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invite contacts</DialogTitle>
            <DialogDescription>
              Select CRM contacts to invite. Invitation links are generated for each
              contact; dispatch is recorded for tracking only — no email is sent in
              this prototype.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search contacts…"
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            {emailableContacts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No contacts with an email address found.
              </p>
            ) : (
              emailableContacts.map((c) => {
                const already = selected?.invites.some(
                  (i) => i.email.toLowerCase() === c.email.toLowerCase(),
                );
                return (
                  <label
                    key={c._id}
                    className="flex items-center gap-3 rounded-md border p-2.5 cursor-pointer hover:bg-muted/50"
                  >
                    <Checkbox
                      disabled={already}
                      checked={already || checkedContacts.includes(c._id)}
                      onCheckedChange={(v) =>
                        setCheckedContacts((prev) =>
                          v ? [...prev, c._id] : prev.filter((id) => id !== c._id),
                        )
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {c.name}
                        {already && (
                          <span className="text-xs text-muted-foreground"> (already invited)</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {c.organisation} · {c.email}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={dispatchInvites} disabled={!checkedContacts.length}>
              <Send className="h-4 w-4 mr-2" />
              Record {checkedContacts.length || ""} invitation
              {checkedContacts.length === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
