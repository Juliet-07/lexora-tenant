import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Clock,
  LogIn,
  LogOut,
  Coffee,
  MapPin,
  Timer,
  Plus,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchActiveShift,
  fetchAttendanceStats,
  fetchAttendanceHistory,
  clockIn,
  startBreak,
  endBreak,
  clockOut,
  type AttendanceRecord,
  type AttendanceStats,
} from "@/lib/team-api";

// ─── Helpers ──────────────────────────────────────────────────

const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

const STATUS_STYLE: Record<string, string> = {
  present: "bg-success/10 text-success border-success/20",
  late: "bg-warning/10 text-warning border-warning/20",
  remote: "bg-info/10 text-info border-info/20",
  absent: "bg-destructive/10 text-destructive border-destructive/20",
};

// ─── Component ────────────────────────────────────────────────

export default function MyTime() {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(new Date());
  const [location, setLocation] = useState("Office");
  const [logOpen, setLogOpen] = useState(false);
  const [draft, setDraft] = useState({
    date: new Date().toISOString().slice(0, 10),
    project: "Internal",
    task: "",
    hours: 1,
    billable: true,
    note: "",
  });

  // Tick every 30 seconds to update elapsed display
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // ── Queries ───────────────────────────────────────────────
  const { data: activeShift, isLoading: shiftLoading } =
    useQuery<AttendanceRecord | null>({
      queryKey: ["active-shift"],
      queryFn: fetchActiveShift,
      staleTime: 30_000,
      refetchInterval: 60_000,
    });

  const { data: stats } = useQuery<AttendanceStats>({
    queryKey: ["attendance-stats"],
    queryFn: fetchAttendanceStats,
    staleTime: 60_000,
  });

  const { data: history = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ["attendance-history"],
    queryFn: () => fetchAttendanceHistory(20),
    staleTime: 60_000,
  });

  // ── Calculate elapsed time from active shift ──────────────
  const elapsed = activeShift?.clockIn
    ? Math.max(
        0,
        Math.floor(
          (now.getTime() - new Date(activeShift.clockIn).getTime()) / 60000,
        ) - (activeShift.breakMinutes ?? 0),
      )
    : 0;
  const hh = Math.floor(elapsed / 60);
  const mm = elapsed % 60;

  const clockedIn = !!activeShift && !activeShift.clockOut;
  const onBreak = clockedIn && !!activeShift?.breakStartedAt;

  // ── Mutations ─────────────────────────────────────────────
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["active-shift"] });
    queryClient.invalidateQueries({ queryKey: ["attendance-stats"] });
    queryClient.invalidateQueries({ queryKey: ["attendance-history"] });
  };

  const clockInMutation = useMutation({
    mutationFn: () => clockIn({ location }),
    onSuccess: (record) => {
      invalidate();
      toast.success(
        `Clocked in at ${fmtTime(record.clockIn)} — ${record.location}`,
      );
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to clock in"),
  });

  const breakStartMutation = useMutation({
    mutationFn: startBreak,
    onSuccess: () => {
      invalidate();
      toast.success("Break started.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to start break"),
  });

  const breakEndMutation = useMutation({
    mutationFn: endBreak,
    onSuccess: () => {
      invalidate();
      toast.success("Break ended.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to end break"),
  });

  const clockOutMutation = useMutation({
    mutationFn: clockOut,
    onSuccess: (record) => {
      invalidate();
      toast.success(
        `Clocked out. Logged ${record.hoursWorked?.toFixed(1)}h today.`,
      );
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to clock out"),
  });

  const anyMutating =
    clockInMutation.isPending ||
    breakStartMutation.isPending ||
    breakEndMutation.isPending ||
    clockOutMutation.isPending;

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Time</h1>
          <p className="text-sm text-muted-foreground">
            Clock in/out, track breaks and view attendance history.
          </p>
        </div>
        <Button
          onClick={() => setLogOpen(true)}
          className="bg-gradient-to-r from-primary to-secondary"
        >
          <Plus className="h-4 w-4 mr-2" /> Log Time
        </Button>
      </div>

      {/* Live clock card */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Clock className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {shiftLoading
                    ? "Loading…"
                    : clockedIn
                      ? onBreak
                        ? "On break"
                        : "Currently on shift"
                      : "Not clocked in"}
                </p>
                <p className="text-3xl font-bold font-mono">
                  {clockedIn ? `${hh}h ${mm}m` : "0h 0m"}
                </p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {clockedIn
                    ? (activeShift?.location ?? "Office")
                    : location} ·{" "}
                  {now.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Location selector when not clocked in */}
              {!clockedIn && (
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger className="w-32 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Office">Office</SelectItem>
                    <SelectItem value="Remote">Remote</SelectItem>
                    <SelectItem value="Field">Field</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {!clockedIn ? (
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-emerald-500 to-teal-500"
                  disabled={anyMutating}
                  onClick={() => clockInMutation.mutate()}
                >
                  {clockInMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <LogIn className="h-4 w-4 mr-2" />
                  )}
                  Clock In
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    variant="outline"
                    disabled={anyMutating}
                    onClick={() =>
                      onBreak
                        ? breakEndMutation.mutate()
                        : breakStartMutation.mutate()
                    }
                  >
                    {breakStartMutation.isPending ||
                    breakEndMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Coffee className="h-4 w-4 mr-2" />
                    )}
                    {onBreak ? "End Break" : "Start Break"}
                  </Button>
                  <Button
                    size="lg"
                    variant="destructive"
                    disabled={anyMutating}
                    onClick={() => clockOutMutation.mutate()}
                  >
                    {clockOutMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <LogOut className="h-4 w-4 mr-2" />
                    )}
                    Clock Out
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "This Week",
            value: `${stats?.weekHours ?? 0}h`,
            tone: "from-blue-500 to-cyan-500",
            icon: Timer,
          },
          {
            label: "This Month",
            value: `${stats?.monthHours ?? 0}h`,
            tone: "from-emerald-500 to-teal-500",
            icon: TrendingUp,
          },
          {
            label: "Days Present",
            value: stats?.daysPresent ?? 0,
            tone: "from-violet-500 to-purple-600",
            icon: Clock,
          },
          {
            label: "On Break",
            value: activeShift?.breakMinutes
              ? `${activeShift.breakMinutes}m`
              : "0m",
            tone: "from-amber-500 to-orange-500",
            icon: Coffee,
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {s.label}
                </p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </div>
              <div
                className={`h-10 w-10 rounded-lg bg-gradient-to-br ${s.tone} flex items-center justify-center`}
              >
                <s.icon className="h-5 w-5 text-white" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* History */}
      <Tabs defaultValue="clock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clock">Clock Log</TabsTrigger>
        </TabsList>

        <TabsContent value="clock">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Shifts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No attendance records yet. Clock in to start tracking.
                </p>
              ) : (
                history.map((rec) => (
                  <div
                    key={rec._id}
                    className="flex items-center justify-between py-3 border-b last:border-b-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{fmtDate(rec.date)}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" /> {rec.location}
                      </p>
                    </div>
                    <div className="hidden md:flex items-center gap-6 text-xs text-muted-foreground">
                      <div>
                        <p>In</p>
                        <p className="font-mono text-sm text-foreground">
                          {fmtTime(rec.clockIn)}
                        </p>
                      </div>
                      <div>
                        <p>Out</p>
                        <p className="font-mono text-sm text-foreground">
                          {rec.clockOut ? fmtTime(rec.clockOut) : "—"}
                        </p>
                      </div>
                      <div>
                        <p>Break</p>
                        <p className="font-mono text-sm text-foreground">
                          {rec.breakMinutes}m
                        </p>
                      </div>
                      <div>
                        <p>Hours</p>
                        <p className="font-mono text-sm text-foreground">
                          {rec.hoursWorked != null
                            ? rec.hoursWorked.toFixed(1)
                            : "—"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={STATUS_STYLE[rec.status] ?? ""}
                    >
                      <span className="capitalize">{rec.status}</span>
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Log Time Dialog (manual entry — static for now) ── */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Time</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  className="mt-1.5"
                  value={draft.date}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, date: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Hours</Label>
                <Input
                  type="number"
                  step="0.25"
                  className="mt-1.5"
                  value={draft.hours}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, hours: +e.target.value }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>Project</Label>
              <Select
                value={draft.project}
                onValueChange={(v) => setDraft((d) => ({ ...d, project: v }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Internal">Internal</SelectItem>
                  <SelectItem value="Client Work">Client Work</SelectItem>
                  <SelectItem value="Training">Training</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Task</Label>
              <Input
                className="mt-1.5"
                value={draft.task}
                placeholder="What did you work on?"
                onChange={(e) =>
                  setDraft((d) => ({ ...d, task: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Note</Label>
              <Input
                className="mt-1.5"
                value={draft.note}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, note: e.target.value }))
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="bill"
                type="checkbox"
                checked={draft.billable}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, billable: e.target.checked }))
                }
              />
              <Label htmlFor="bill" className="cursor-pointer">
                Billable
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-primary to-secondary"
              disabled={!draft.task.trim()}
              onClick={() => {
                toast.success(`${draft.hours}h logged.`);
                setLogOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
