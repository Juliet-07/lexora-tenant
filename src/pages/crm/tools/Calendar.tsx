import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Video,
  MapPin,
  Repeat,
  Link2,
  Lock,
  Trash2,
  Pencil,
  PlugZap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  type CalendarEventItem,
  type CalendarLayer,
  type RecurrenceRule,
  type VirtualProvider,
} from "@/lib/crm/tools-api";

const LAYERS: CalendarLayer[] = [
  "Personal",
  "Team",
  "Client",
  "Compliance",
  "ADR",
  "Contract",
];

const layerClass: Record<CalendarLayer, string> = {
  Personal: "bg-primary/10 text-primary border-primary/20",
  Team: "bg-accent text-accent-foreground border-accent",
  Client: "bg-success/10 text-success border-success/20",
  Compliance: "bg-destructive/10 text-destructive border-destructive/20",
  ADR: "bg-warning/10 text-warning border-warning/20",
  Contract: "bg-muted text-muted-foreground border-border",
};

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (y: number, m: number, d: number) =>
  `${y}-${pad(m + 1)}-${pad(d)}`;
const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyDraft = {
  title: "",
  date: todayISO(),
  time: "10:00",
  layer: "Team" as CalendarLayer,
  recurrence: "None" as RecurrenceRule,
  location: "",
  virtualProvider: "none" as VirtualProvider | "none",
  virtualLink: "",
};

export default function CalendarPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [view, setView] = useState("month");
  const [activeLayers, setActiveLayers] = useState<CalendarLayer[]>([
    ...LAYERS,
  ]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(
    null,
  );
  const [newOpen, setNewOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dayIndex, setDayIndex] = useState(now.getDate());

  const { data: events = [] } = useQuery({
    queryKey: ["calendar-events"],
    queryFn: fetchCalendarEvents,
  });
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["calendar-events"] });

  const [draft, setDraft] = useState(emptyDraft);

  const filtered = events.filter((e) => activeLayers.includes(e.layer));

  const monthLabel = new Date(year, month, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const grid = useMemo(() => {
    const first = new Date(year, month, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { date: number | null; iso: string | null }[] = [];
    for (let i = 0; i < startDow; i++) cells.push({ date: null, iso: null });
    for (let d = 1; d <= daysInMonth; d++)
      cells.push({ date: d, iso: toISO(year, month, d) });
    while (cells.length % 7 !== 0) cells.push({ date: null, iso: null });
    return cells;
  }, [year, month]);

  const eventsFor = (iso: string) => filtered.filter((e) => e.date === iso);

  const toggleLayer = (l: CalendarLayer) =>
    setActiveLayers((cur) =>
      cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l],
    );

  const shiftMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    if (m > 11) {
      m = 0;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  };

  const openCreate = (presetDate?: string) => {
    setEditingId(null);
    setDraft({ ...emptyDraft, date: presetDate ?? todayISO() });
    setNewOpen(true);
  };
  const openEdit = (e: CalendarEventItem) => {
    setEditingId(e.id);
    setDraft({
      title: e.title,
      date: e.date,
      time: e.time,
      layer: e.layer,
      recurrence: e.recurrence ?? "None",
      location: e.location === "—" ? "" : e.location,
      virtualProvider: e.virtualProvider ?? "none",
      virtualLink: e.virtualLink ?? "",
    });
    setSelectedEvent(null);
    setNewOpen(true);
  };

  const saveEventMut = useMutation({
    mutationFn: () => {
      const payload = {
        title: draft.title,
        date: draft.date,
        time: draft.time,
        layer: draft.layer,
        location: draft.location,
        recurrence: draft.recurrence,
        virtualProvider:
          draft.virtualProvider === "none" ? undefined : draft.virtualProvider,
        virtualLink:
          draft.virtualProvider === "none" ? undefined : draft.virtualLink,
      };
      return editingId
        ? updateCalendarEvent(editingId, payload)
        : createCalendarEvent(payload);
    },
    onSuccess: () => {
      invalidate();
      setNewOpen(false);
      toast({ title: editingId ? "Event updated" : "Event created" });
    },
    onError: onErr("Failed to save event"),
  });
  const deleteEventMut = useMutation({
    mutationFn: (id: string) => deleteCalendarEvent(id),
    onSuccess: () => {
      invalidate();
      setSelectedEvent(null);
      toast({ title: "Event deleted" });
    },
    onError: onErr("Failed to delete event"),
  });

  const agendaSorted = [...filtered].sort((a, b) =>
    `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
  );

  const weekDays = useMemo(() => {
    const anchor = new Date(
      year,
      month,
      Math.min(dayIndex, new Date(year, month + 1, 0).getDate()),
    );
    const dow = anchor.getDay();
    const start = new Date(anchor);
    start.setDate(anchor.getDate() - dow);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [year, month, dayIndex]);

  const dayDate = new Date(
    year,
    month,
    Math.min(dayIndex, new Date(year, month + 1, 0).getDate()),
  );
  const dayIso = toISO(
    dayDate.getFullYear(),
    dayDate.getMonth(),
    dayDate.getDate(),
  );

  const sync = [
    { name: "Microsoft 365" },
    { name: "Google Calendar" },
    { name: "Apple Calendar" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Unified view of client, team, compliance, ADR and contract dates.
          </p>
        </div>
        <Button onClick={() => openCreate()}>
          <Plus className="mr-2 h-4 w-4" /> New event
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="space-y-4 lg:col-span-3">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => shiftMonth(-1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-sm">{monthLabel}</CardTitle>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => shiftMonth(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Tabs value={view} onValueChange={setView}>
                <TabsList>
                  <TabsTrigger value="month">Month</TabsTrigger>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="day">Day</TabsTrigger>
                  <TabsTrigger value="agenda">Agenda</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              {view === "month" && (
                <div className="grid grid-cols-7 gap-1 text-xs">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (d) => (
                      <div
                        key={d}
                        className="p-1 text-center font-medium text-muted-foreground"
                      >
                        {d}
                      </div>
                    ),
                  )}
                  {grid.map((c, i) => (
                    <div
                      key={i}
                      className={`min-h-[84px] rounded border p-1 ${c.iso ? "cursor-pointer hover:bg-accent/40" : "bg-muted/30"}`}
                      onClick={() => c.iso && setSelectedDay(c.iso)}
                    >
                      {c.date && (
                        <>
                          <p className="text-[11px] font-medium text-muted-foreground">
                            {c.date}
                          </p>
                          <div className="mt-1 space-y-0.5">
                            {eventsFor(c.iso!)
                              .slice(0, 3)
                              .map((e) => (
                                <div
                                  key={e.id}
                                  className={`truncate rounded border px-1 text-[10px] ${layerClass[e.layer]}`}
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    setSelectedEvent(e);
                                  }}
                                >
                                  {e.time} {e.title}
                                </div>
                              ))}
                            {eventsFor(c.iso!).length > 3 && (
                              <p className="text-[10px] text-muted-foreground">
                                +{eventsFor(c.iso!).length - 3} more
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {view === "week" && (
                <div className="grid grid-cols-7 gap-1 text-xs">
                  {weekDays.map((d) => {
                    const iso = toISO(
                      d.getFullYear(),
                      d.getMonth(),
                      d.getDate(),
                    );
                    return (
                      <div
                        key={iso}
                        className="min-h-[140px] rounded border p-1"
                      >
                        <p className="text-[11px] font-medium text-muted-foreground">
                          {d.toLocaleDateString("en-US", {
                            weekday: "short",
                            day: "numeric",
                          })}
                        </p>
                        <div className="mt-1 space-y-0.5">
                          {eventsFor(iso).map((e) => (
                            <div
                              key={e.id}
                              className={`cursor-pointer truncate rounded border px-1 text-[10px] ${layerClass[e.layer]}`}
                              onClick={() => setSelectedEvent(e)}
                            >
                              {e.time} {e.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {view === "day" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setDayIndex((d) => d - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <p className="text-sm font-medium">
                      {dayDate.toDateString()}
                    </p>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setDayIndex((d) => d + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  {eventsFor(dayIso).length === 0 && (
                    <p className="text-sm text-muted-foreground">No events.</p>
                  )}
                  {eventsFor(dayIso).map((e) => (
                    <div
                      key={e.id}
                      className={`cursor-pointer rounded border p-2 text-sm ${layerClass[e.layer]}`}
                      onClick={() => setSelectedEvent(e)}
                    >
                      <span className="font-medium">{e.time}</span> — {e.title}
                    </div>
                  ))}
                </div>
              )}

              {view === "agenda" && (
                <div className="space-y-2">
                  {agendaSorted.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between rounded border p-2 cursor-pointer"
                      onClick={() => setSelectedEvent(e)}
                    >
                      <div>
                        <p className="text-sm font-medium">{e.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.date} · {e.time} · {e.source}
                        </p>
                      </div>
                      <Badge className={layerClass[e.layer]} variant="outline">
                        {e.layer}
                      </Badge>
                    </div>
                  ))}
                  {!agendaSorted.length && (
                    <p className="text-sm text-muted-foreground">
                      No events match the active layers.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Layers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {LAYERS.map((l) => (
                <label key={l} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={activeLayers.includes(l)}
                    onCheckedChange={() => toggleLayer(l)}
                  />
                  <Badge className={layerClass[l]} variant="outline">
                    {l}
                  </Badge>
                </label>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">External sync</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sync.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Not connected
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    title="Requires OAuth setup — not yet configured"
                  >
                    <PlugZap className="mr-1 h-3 w-3" />
                    Connect
                  </Button>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                External calendar sync isn't set up yet — this needs a real
                OAuth connection to each provider first.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Day detail dialog */}
      <Dialog
        open={!!selectedDay}
        onOpenChange={(o) => !o && setSelectedDay(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedDay}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {selectedDay && eventsFor(selectedDay).length === 0 && (
              <p className="text-sm text-muted-foreground">
                No events on this day.
              </p>
            )}
            {selectedDay &&
              eventsFor(selectedDay).map((e) => (
                <div
                  key={e.id}
                  className={`cursor-pointer rounded border p-2 text-sm ${layerClass[e.layer]}`}
                  onClick={() => {
                    setSelectedEvent(e);
                    setSelectedDay(null);
                  }}
                >
                  <span className="font-medium">{e.time}</span> — {e.title}
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                const d = selectedDay;
                setSelectedDay(null);
                if (d) openCreate(d);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New event on this day
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event detail dialog */}
      <Dialog
        open={!!selectedEvent}
        onOpenChange={(o) => !o && setSelectedEvent(null)}
      >
        <DialogContent>
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedEvent.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Date/time: </span>
                  {selectedEvent.date} · {selectedEvent.time}
                </p>
                <p>
                  <span className="text-muted-foreground">Layer: </span>
                  <Badge
                    className={layerClass[selectedEvent.layer]}
                    variant="outline"
                  >
                    {selectedEvent.layer}
                  </Badge>
                </p>
                <p className="flex items-center gap-1">
                  <Link2 className="h-3.5 w-3.5 text-muted-foreground" />{" "}
                  Source: {selectedEvent.source}
                </p>
                <p className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />{" "}
                  Location: {selectedEvent.location}
                </p>
                {selectedEvent.recurrence &&
                  selectedEvent.recurrence !== "None" && (
                    <p className="flex items-center gap-1">
                      <Repeat className="h-3.5 w-3.5 text-muted-foreground" />{" "}
                      Recurrence: {selectedEvent.recurrence}
                    </p>
                  )}
                {selectedEvent.virtualProvider && (
                  <div className="flex items-center gap-2 pt-1">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedEvent.virtualProvider}</span>
                    {selectedEvent.virtualLink ? (
                      <Button size="sm" className="ml-auto" asChild>
                        <a
                          href={selectedEvent.virtualLink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Join
                        </a>
                      </Button>
                    ) : (
                      <span className="ml-auto text-xs text-muted-foreground">
                        No link set
                      </span>
                    )}
                  </div>
                )}
                {!selectedEvent.editable && (
                  <p className="flex items-center gap-1 pt-2 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" /> Derived from{" "}
                    {selectedEvent.source} — edit it at the source to change
                    this.
                  </p>
                )}
              </div>
              {selectedEvent.editable && (
                <DialogFooter className="gap-2 sm:justify-between">
                  <Button
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => deleteEventMut.mutate(selectedEvent.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openEdit(selectedEvent)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New / edit event dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit event" : "New event"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Title</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                />
              </div>
              <div>
                <Label>Time</Label>
                <Input
                  type="time"
                  value={draft.time}
                  onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Layer</Label>
                <Select
                  value={draft.layer}
                  onValueChange={(v) =>
                    setDraft({ ...draft, layer: v as CalendarLayer })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYERS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Recurrence</Label>
                <Select
                  value={draft.recurrence}
                  onValueChange={(v) =>
                    setDraft({ ...draft, recurrence: v as RecurrenceRule })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      ["None", "Daily", "Weekly", "Monthly"] as RecurrenceRule[]
                    ).map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Location / room</Label>
              <Input
                value={draft.location}
                onChange={(e) =>
                  setDraft({ ...draft, location: e.target.value })
                }
                placeholder="e.g. Room 2, Boardroom, or leave blank"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Virtual provider</Label>
                <Select
                  value={draft.virtualProvider}
                  onValueChange={(v) =>
                    setDraft({
                      ...draft,
                      virtualProvider: v as VirtualProvider | "none",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {(
                      ["Teams", "Zoom", "Google Meet"] as VirtualProvider[]
                    ).map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {draft.virtualProvider !== "none" && (
                <div>
                  <Label>Meeting link</Label>
                  <Input
                    value={draft.virtualLink}
                    onChange={(e) =>
                      setDraft({ ...draft, virtualLink: e.target.value })
                    }
                    placeholder="Paste your real meeting link"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!draft.title.trim() || saveEventMut.isPending}
              onClick={() => saveEventMut.mutate()}
            >
              {editingId ? "Save changes" : "Create event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
