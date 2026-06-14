import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  LogIn,
  LogOut,
  Coffee,
  MapPin,
  Timer,
  Plus,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─────────────────────────────────────────────────────────────
// Team member self-service: time clock + timesheet
// ─────────────────────────────────────────────────────────────

interface LogEntry {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  breakMins: number;
  hours: number;
  location: string;
  status: "Present" | "Late" | "Remote";
}

interface ManualEntry {
  id: string;
  date: string;
  project: string;
  task: string;
  hours: number;
  billable: boolean;
  note: string;
}

const initialLogs: LogEntry[] = [
  { id: "l1", date: "2026-06-13", clockIn: "08:55", clockOut: "17:32", breakMins: 45, hours: 7.8, location: "HQ — Floor 3", status: "Present" },
  { id: "l2", date: "2026-06-12", clockIn: "09:18", clockOut: "18:05", breakMins: 60, hours: 7.8, location: "HQ — Floor 3", status: "Late" },
  { id: "l3", date: "2026-06-11", clockIn: "08:48", clockOut: "17:11", breakMins: 30, hours: 7.9, location: "Remote", status: "Remote" },
  { id: "l4", date: "2026-06-10", clockIn: "09:01", clockOut: "17:48", breakMins: 45, hours: 8.0, location: "HQ — Floor 3", status: "Present" },
  { id: "l5", date: "2026-06-09", clockIn: "08:50", clockOut: "17:33", breakMins: 45, hours: 8.0, location: "HQ — Floor 3", status: "Present" },
];

const initialManual: ManualEntry[] = [
  { id: "m1", date: "2026-06-13", project: "Q2 KYC Refresh", task: "Acme Holdings review", hours: 3.5, billable: true, note: "Source of funds analysis" },
  { id: "m2", date: "2026-06-13", project: "AML Investigations", task: "Case #4421 STR drafting", hours: 2.0, billable: true, note: "" },
  { id: "m3", date: "2026-06-12", project: "Internal", task: "Team standup + admin", hours: 1.0, billable: false, note: "" },
];

export default function MyTime() {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [manual, setManual] = useState<ManualEntry[]>(initialManual);
  const [clockedIn, setClockedIn] = useState(false);
  const [shiftStart, setShiftStart] = useState<Date | null>(null);
  const [onBreak, setOnBreak] = useState(false);
  const [breakAccum, setBreakAccum] = useState(0); // minutes
  const [breakStart, setBreakStart] = useState<Date | null>(null);
  const [now, setNow] = useState(new Date());
  const [logOpen, setLogOpen] = useState(false);
  const [draft, setDraft] = useState<ManualEntry>({
    id: "",
    date: new Date().toISOString().slice(0, 10),
    project: "Q2 KYC Refresh",
    task: "",
    hours: 1,
    billable: true,
    note: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  const elapsed = shiftStart
    ? Math.max(0, Math.floor((now.getTime() - shiftStart.getTime()) / 60000) - breakAccum)
    : 0;
  const hh = Math.floor(elapsed / 60);
  const mm = elapsed % 60;

  const weekHours = logs.reduce((s, l) => s + l.hours, 0);
  const billable = manual.filter((m) => m.billable).reduce((s, m) => s + m.hours, 0);
  const nonBillable = manual.filter((m) => !m.billable).reduce((s, m) => s + m.hours, 0);
  const utilization = Math.min(100, Math.round((billable / Math.max(1, billable + nonBillable)) * 100));

  const handleClockIn = () => {
    setShiftStart(new Date());
    setClockedIn(true);
    toast({ title: "Clocked in", description: `Shift started at ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` });
  };
  const handleClockOut = () => {
    if (!shiftStart) return;
    const out = new Date();
    const inStr = shiftStart.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const outStr = out.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const totalMins = Math.max(0, Math.floor((out.getTime() - shiftStart.getTime()) / 60000) - breakAccum);
    const hours = +(totalMins / 60).toFixed(1);
    setLogs([
      { id: `l-${Date.now()}`, date: out.toISOString().slice(0, 10), clockIn: inStr, clockOut: outStr, breakMins: breakAccum, hours, location: "HQ — Floor 3", status: "Present" },
      ...logs,
    ]);
    setClockedIn(false);
    setShiftStart(null);
    setBreakAccum(0);
    setOnBreak(false);
    setBreakStart(null);
    toast({ title: "Clocked out", description: `Logged ${hours}h. Good work!` });
  };
  const toggleBreak = () => {
    if (onBreak && breakStart) {
      const mins = Math.floor((new Date().getTime() - breakStart.getTime()) / 60000);
      setBreakAccum((b) => b + mins);
      setOnBreak(false);
      setBreakStart(null);
      toast({ title: "Break ended", description: `${mins} min break recorded.` });
    } else {
      setOnBreak(true);
      setBreakStart(new Date());
      toast({ title: "Break started" });
    }
  };

  const saveManual = () => {
    if (!draft.task.trim() || draft.hours <= 0) return;
    setManual([{ ...draft, id: `m-${Date.now()}` }, ...manual]);
    setDraft({ ...draft, task: "", hours: 1, note: "" });
    setLogOpen(false);
    toast({ title: "Time logged", description: `${draft.hours}h on ${draft.project}.` });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Time</h1>
          <p className="text-sm text-muted-foreground">Clock in/out, track breaks and log billable hours.</p>
        </div>
        <Button onClick={() => setLogOpen(true)} className="bg-gradient-to-r from-primary to-secondary">
          <Plus className="h-4 w-4 mr-2" /> Log Time
        </Button>
      </div>

      {/* Live clock */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Clock className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {clockedIn ? (onBreak ? "On break" : "Currently on shift") : "Not clocked in"}
                </p>
                <p className="text-3xl font-bold font-mono">
                  {clockedIn ? `${hh}h ${mm}m` : "0h 0m"}
                </p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> HQ — Floor 3 · {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!clockedIn ? (
                <Button size="lg" onClick={handleClockIn} className="bg-gradient-to-r from-emerald-500 to-teal-500">
                  <LogIn className="h-4 w-4 mr-2" /> Clock In
                </Button>
              ) : (
                <>
                  <Button size="lg" variant="outline" onClick={toggleBreak}>
                    <Coffee className="h-4 w-4 mr-2" />
                    {onBreak ? "End Break" : "Start Break"}
                  </Button>
                  <Button size="lg" variant="destructive" onClick={handleClockOut}>
                    <LogOut className="h-4 w-4 mr-2" /> Clock Out
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="This Week" value={`${weekHours.toFixed(1)}h`} icon={Timer} tone="from-blue-500 to-cyan-500" />
        <Stat label="Billable" value={`${billable.toFixed(1)}h`} icon={TrendingUp} tone="from-emerald-500 to-teal-500" />
        <Stat label="Non-Billable" value={`${nonBillable.toFixed(1)}h`} icon={Coffee} tone="from-amber-500 to-orange-500" />
        <Stat label="Utilization" value={`${utilization}%`} icon={TrendingUp} tone="from-violet-500 to-purple-600" />
      </div>

      <Tabs defaultValue="clock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clock">Clock Log</TabsTrigger>
          <TabsTrigger value="sheet">Timesheet</TabsTrigger>
          <TabsTrigger value="week">Weekly Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="clock">
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Shifts</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {logs.map((l) => (
                <div key={l.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                  <div>
                    <p className="text-sm font-medium">{new Date(l.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{l.location}</p>
                  </div>
                  <div className="hidden md:flex items-center gap-6 text-xs text-muted-foreground">
                    <div><p>In</p><p className="font-mono text-sm text-foreground">{l.clockIn}</p></div>
                    <div><p>Out</p><p className="font-mono text-sm text-foreground">{l.clockOut ?? "—"}</p></div>
                    <div><p>Break</p><p className="font-mono text-sm text-foreground">{l.breakMins}m</p></div>
                    <div><p>Hours</p><p className="font-mono text-sm text-foreground">{l.hours.toFixed(1)}</p></div>
                  </div>
                  <Badge variant="outline" className={
                    l.status === "Late" ? "bg-warning/10 text-warning border-warning/20" :
                    l.status === "Remote" ? "bg-info/10 text-info border-info/20" :
                    "bg-success/10 text-success border-success/20"
                  }>{l.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sheet">
          <Card>
            <CardHeader><CardTitle className="text-base">Logged Time</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {manual.map((m) => (
                <div key={m.id} className="flex items-start justify-between gap-3 py-3 border-b last:border-b-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.task}</p>
                    <p className="text-xs text-muted-foreground">{m.project} · {new Date(m.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                    {m.note && <p className="text-xs text-foreground/70 mt-1 italic">"{m.note}"</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-medium">{m.hours.toFixed(1)}h</p>
                    <Badge variant="outline" className={m.billable ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}>
                      {m.billable ? "Billable" : "Internal"}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="week">
          <Card>
            <CardHeader><CardTitle className="text-base">This Week vs Target (40h)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {["Mon","Tue","Wed","Thu","Fri"].map((d, i) => {
                const v = [8.0, 7.8, 8.0, 7.8, clockedIn ? +(elapsed/60).toFixed(1) : 0][i];
                return (
                  <div key={d}>
                    <div className="flex justify-between text-sm mb-1"><span>{d}</span><span className="font-mono">{v.toFixed(1)}h</span></div>
                    <Progress value={(v / 8) * 100} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Manual log */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Time</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Hours</Label><Input type="number" step="0.25" value={draft.hours} onChange={(e) => setDraft({ ...draft, hours: +e.target.value })} className="mt-1.5" /></div>
            </div>
            <div>
              <Label>Project</Label>
              <Select value={draft.project} onValueChange={(v) => setDraft({ ...draft, project: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q2 KYC Refresh">Q2 KYC Refresh</SelectItem>
                  <SelectItem value="AML Investigations">AML Investigations</SelectItem>
                  <SelectItem value="Onboarding — Bright Futures">Onboarding — Bright Futures</SelectItem>
                  <SelectItem value="Internal">Internal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Task</Label><Input value={draft.task} onChange={(e) => setDraft({ ...draft, task: e.target.value })} placeholder="What did you work on?" className="mt-1.5" /></div>
            <div><Label>Note</Label><Input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} className="mt-1.5" /></div>
            <div className="flex items-center gap-2">
              <input id="bill" type="checkbox" checked={draft.billable} onChange={(e) => setDraft({ ...draft, billable: e.target.checked })} />
              <Label htmlFor="bill" className="cursor-pointer">Billable</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogOpen(false)}>Cancel</Button>
            <Button onClick={saveManual} className="bg-gradient-to-r from-primary to-secondary">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: any; icon: any; tone: string }) {
  return (
    <Card><CardContent className="p-5 flex items-center justify-between">
      <div><p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p><p className="text-2xl font-bold mt-1">{value}</p></div>
      <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center`}><Icon className="h-5 w-5 text-white" /></div>
    </CardContent></Card>
  );
}
