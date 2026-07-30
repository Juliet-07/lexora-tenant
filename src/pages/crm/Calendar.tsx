import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft, ChevronRight, Plus, Video, MapPin, Repeat, Link2,
} from "lucide-react";
import { calendarEvents, CalendarEvent } from "@/data/crmPmMockData";

const LAYERS = ["Personal", "Team", "Client", "Compliance", "ADR", "Contract"] as const;
type Layer = (typeof LAYERS)[number];

const layerClass: Record<Layer, string> = {
  Personal: "bg-primary/10 text-primary border-primary/20",
  Team: "bg-accent text-accent-foreground border-accent",
  Client: "bg-success/10 text-success border-success/20",
  Compliance: "bg-destructive/10 text-destructive border-destructive/20",
  ADR: "bg-warning/10 text-warning border-warning/20",
  Contract: "bg-muted text-muted-foreground border-border",
};

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export default function CalendarPage() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(7); // 0-indexed, Aug 2026
  const [view, setView] = useState("month");
  const [activeLayers, setActiveLayers] = useState<Layer[]>([...LAYERS]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [dayIndex, setDayIndex] = useState(3); // for week/day nav within month

  const [events, setEvents] = useState<CalendarEvent[]>(calendarEvents);
  const [draft, setDraft] = useState({
    title: "", date: "2026-08-05", time: "10:00", layer: "Team" as Layer,
    recurrence: "None", room: "None", provider: "None",
  });

  const filtered = events.filter((e) => activeLayers.includes(e.layer));

  const monthLabel = new Date(year, month, 1).toLocaleString("en-US", { month: "long", year: "numeric" });

  const grid = useMemo(() => {
    const first = new Date(year, month, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { date: number | null; iso: string | null }[] = [];
    for (let i = 0; i < startDow; i++) cells.push({ date: null, iso: null });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ date: d, iso: toISO(year, month, d) });
    while (cells.length % 7 !== 0) cells.push({ date: null, iso: null });
    return cells;
  }, [year, month]);

  const eventsFor = (iso: string) => filtered.filter((e) => e.date === iso);

  const toggleLayer = (l: Layer) =>
    setActiveLayers((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]));

  const shiftMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m); setYear(y);
  };

  const [sync, setSync] = useState([
    { name: "Microsoft 365", connected: true, last: "2026-07-30 08:12" },
    { name: "Google Calendar", connected: true, last: "2026-07-30 07:55" },
    { name: "Apple Calendar", connected: false, last: "—" },
  ]);

  const createEvent = () => {
    if (!draft.title) return;
    const id = `EV-${Date.now()}`;
    const link = draft.provider !== "None" ? `https://meet.${draft.provider.toLowerCase().replace(" ", "")}.example/${id}` : undefined;
    setEvents((ev) => [
      ...ev,
      {
        id, title: draft.title, date: draft.date, time: draft.time, layer: draft.layer,
        source: "Manual", location: draft.room !== "None" ? draft.room : link ? "Virtual" : "—",
        virtual: draft.provider !== "None" ? (draft.provider as CalendarEvent["virtual"]) : undefined,
        recurring: draft.recurrence !== "None" ? draft.recurrence : undefined,
      },
    ]);
    setNewOpen(false);
  };

  const agendaSorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));

  const weekDays = useMemo(() => {
    const anchor = new Date(year, month, Math.min(dayIndex, new Date(year, month + 1, 0).getDate()));
    const dow = anchor.getDay();
    const start = new Date(anchor);
    start.setDate(anchor.getDate() - dow);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [year, month, dayIndex]);

  const dayDate = new Date(year, month, Math.min(dayIndex, new Date(year, month + 1, 0).getDate()));
  const dayIso = toISO(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Unified view of client, team, compliance, ADR and contract dates.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}><Plus className="mr-2 h-4 w-4" /> New event</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="space-y-4 lg:col-span-3">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" onClick={() => shiftMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                <CardTitle className="text-sm">{monthLabel}</CardTitle>
                <Button size="icon" variant="outline" onClick={() => shiftMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
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
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <div key={d} className="p-1 text-center font-medium text-muted-foreground">{d}</div>
                  ))}
                  {grid.map((c, i) => (
                    <div
                      key={i}
                      className={`min-h-[84px] rounded border p-1 ${c.iso ? "cursor-pointer hover:bg-accent/40" : "bg-muted/30"}`}
                      onClick={() => c.iso && setSelectedDay(c.iso)}
                    >
                      {c.date && (
                        <>
                          <p className="text-xs font-medium">{c.date}</p>
                          <div className="mt-1 space-y-0.5">
                            {eventsFor(c.iso!).slice(0, 3).map((e) => (
                              <div
                                key={e.id}
                                className={`truncate rounded border px-1 py-0.5 text-[10px] ${layerClass[e.layer]}`}
                                onClick={(ev) => { ev.stopPropagation(); setSelectedEvent(e); }}
                              >
                                {e.time} {e.title}
                              </div>
                            ))}
                            {eventsFor(c.iso!).length > 3 && (
                              <p className="text-[10px] text-muted-foreground">+{eventsFor(c.iso!).length - 3} more</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {view === "week" && (
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((d) => {
                    const iso = toISO(d.getFullYear(), d.getMonth(), d.getDate());
                    return (
                      <div key={iso} className="min-h-[140px] rounded border p-2">
                        <p className="text-xs font-medium">{d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" })}</p>
                        <div className="mt-1 space-y-1">
                          {eventsFor(iso).map((e) => (
                            <div key={e.id} className={`cursor-pointer rounded border px-1 py-0.5 text-[10px] ${layerClass[e.layer]}`} onClick={() => setSelectedEvent(e)}>
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
                    <Button size="icon" variant="outline" onClick={() => setDayIndex((d) => d - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                    <p className="text-sm font-medium">{dayDate.toDateString()}</p>
                    <Button size="icon" variant="outline" onClick={() => setDayIndex((d) => d + 1)}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                  {eventsFor(dayIso).length === 0 && <p className="text-sm text-muted-foreground">No events.</p>}
                  {eventsFor(dayIso).map((e) => (
                    <div key={e.id} className={`cursor-pointer rounded border p-2 text-sm ${layerClass[e.layer]}`} onClick={() => setSelectedEvent(e)}>
                      <span className="font-medium">{e.time}</span> — {e.title}
                    </div>
                  ))}
                </div>
              )}

              {view === "agenda" && (
                <div className="space-y-2">
                  {agendaSorted.map((e) => (
                    <div key={e.id} className="flex items-center justify-between rounded border p-2 cursor-pointer" onClick={() => setSelectedEvent(e)}>
                      <div>
                        <p className="text-sm font-medium">{e.title}</p>
                        <p className="text-xs text-muted-foreground">{e.date} · {e.time} · {e.source}</p>
                      </div>
                      <Badge className={layerClass[e.layer]} variant="outline">{e.layer}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Layers</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {LAYERS.map((l) => (
                <label key={l} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={activeLayers.includes(l)} onCheckedChange={() => toggleLayer(l)} />
                  <Badge className={layerClass[l]} variant="outline">{l}</Badge>
                </label>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">External sync</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {sync.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">Last sync: {s.last}</p>
                  </div>
                  <Switch
                    checked={s.connected}
                    onCheckedChange={(v) =>
                      setSync((arr) => arr.map((x, j) => (j === i ? { ...x, connected: v, last: v ? "Just now" : x.last } : x)))
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Day detail dialog */}
      <Dialog open={!!selectedDay} onOpenChange={(o) => !o && setSelectedDay(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedDay}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {selectedDay && eventsFor(selectedDay).length === 0 && <p className="text-sm text-muted-foreground">No events on this day.</p>}
            {selectedDay && eventsFor(selectedDay).map((e) => (
              <div key={e.id} className={`cursor-pointer rounded border p-2 text-sm ${layerClass[e.layer]}`} onClick={() => { setSelectedEvent(e); setSelectedDay(null); }}>
                <span className="font-medium">{e.time}</span> — {e.title}
              </div>
            ))}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setSelectedDay(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event detail dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(o) => !o && setSelectedEvent(null)}>
        <DialogContent>
          {selectedEvent && (
            <>
              <DialogHeader><DialogTitle>{selectedEvent.title}</DialogTitle></DialogHeader>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Date/time: </span>{selectedEvent.date} · {selectedEvent.time}</p>
                <p><span className="text-muted-foreground">Layer: </span><Badge className={layerClass[selectedEvent.layer]} variant="outline">{selectedEvent.layer}</Badge></p>
                <p className="flex items-center gap-1"><Link2 className="h-3.5 w-3.5 text-muted-foreground" /> Source: {selectedEvent.source}</p>
                <p className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Location: {selectedEvent.location}</p>
                {selectedEvent.recurring && (
                  <p className="flex items-center gap-1"><Repeat className="h-3.5 w-3.5 text-muted-foreground" /> Recurrence: {selectedEvent.recurring}</p>
                )}
                {selectedEvent.virtual && (
                  <div className="flex items-center gap-2 pt-1">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedEvent.virtual}</span>
                    <Button size="sm" className="ml-auto">Join</Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New event dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New event</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Title</Label>
              <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></div>
              <div><Label>Time</Label><Input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Layer</Label>
                <Select value={draft.layer} onValueChange={(v) => setDraft({ ...draft, layer: v as Layer })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LAYERS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Recurrence</Label>
                <Select value={draft.recurrence} onValueChange={(v) => setDraft({ ...draft, recurrence: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["None", "Daily", "Weekly", "Monthly"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Room / equipment</Label>
                <Select value={draft.room} onValueChange={(v) => setDraft({ ...draft, room: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["None", "Room 1", "Room 2", "Projector", "Boardroom"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Virtual provider</Label>
                <Select value={draft.provider} onValueChange={(v) => setDraft({ ...draft, provider: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["None", "Teams", "Zoom", "Google Meet"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={createEvent}>Create event</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
