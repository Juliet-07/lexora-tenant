import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Play, Pause, Square, Timer, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchMandates,
  fetchMyMandates,
  fetchMyTasks,
} from "@/lib/crm/mandates-api";
import { fetchTasks } from "@/lib/crm/tasks-api";
import { logMyTime } from "@/lib/crm/time-tracking-api";
import {
  elapsedMsOf,
  formatClock,
  hoursFromMs,
  useWorkTimer,
  workTimer,
} from "@/lib/crm/work-timer";

const CHECK_IN_INTERVAL_MS = 60 * 60 * 1000; // an hour of running time
const IDLE_GRACE_MS = 5 * 60 * 1000; // 5 minutes to answer

const fmtCountdown = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const today = () => new Date().toISOString().slice(0, 10);

const blankForm = () => ({
  mandateId: "",
  taskId: "",
  narrative: "",
  date: today(),
  hours: 1,
  billable: true,
});

// The one and only "log this time" form — used when the timer is stopped,
// wherever the timer is controlled from.
function StopTimerDialog({
  open,
  onOpenChange,
  initialHours,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialHours: number;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ ...blankForm(), hours: initialHours });
  }, [open, initialHours]);

  const { data: mandates = [] } = useQuery({
    queryKey: ["timerMandates", isAdmin],
    queryFn: isAdmin ? fetchMandates : fetchMyMandates,
    enabled: open,
    retry: false,
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["timerTasks", isAdmin, form.mandateId],
    queryFn: () =>
      isAdmin
        ? fetchTasks({ mandateId: form.mandateId })
        : fetchMyTasks(form.mandateId),
    enabled: open && !!form.mandateId,
    retry: false,
  });

  const save = async () => {
    if (!form.mandateId || !form.hours) return;
    setSaving(true);
    try {
      // Always the self-service endpoint: it resolves the caller's own
      // Employee record (the identity a rate card is keyed on), so the
      // entry can be valued and approved.
      const task = tasks.find((t: any) => t._id === form.taskId);
      await logMyTime({
        mandateId: form.mandateId,
        taskId: form.taskId || undefined,
        taskTitle: task?.title,
        narrative: form.narrative,
        date: form.date,
        hours: Number(form.hours),
        billable: form.billable,
      });
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
      queryClient.invalidateQueries({ queryKey: ["myTimeEntries"] });
      toast({
        title: `${form.hours}h logged`,
        description: "Saved as a draft on your timesheet.",
      });
      workTimer.reset();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Couldn't save the time entry",
        description: err?.response?.data?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-4 w-4" /> Log {form.hours}h to a mandate
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Mandate</Label>
            <Select
              value={form.mandateId}
              onValueChange={(v) =>
                setForm({ ...form, mandateId: v, taskId: "" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select mandate…" />
              </SelectTrigger>
              <SelectContent>
                {mandates.map((m: any) => (
                  <SelectItem key={m._id} value={m._id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Task (optional)</Label>
            <Select
              value={form.taskId}
              onValueChange={(v) => setForm({ ...form, taskId: v })}
              disabled={!form.mandateId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Ad-hoc work (no specific task)" />
              </SelectTrigger>
              <SelectContent>
                {tasks.map((t: any) => (
                  <SelectItem key={t._id} value={t._id}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Narrative</Label>
            <Textarea
              value={form.narrative}
              placeholder="What did you work on?"
              onChange={(e) => setForm({ ...form, narrative: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Hours</Label>
              <Input
                type="number"
                min={0.01}
                step="0.25"
                value={form.hours}
                onChange={(e) =>
                  setForm({ ...form, hours: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <label className="flex items-center justify-between rounded border p-3 text-sm">
            Billable
            <Switch
              checked={form.billable}
              onCheckedChange={(v) => setForm({ ...form, billable: v })}
            />
          </label>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              workTimer.reset();
              onOpenChange(false);
              toast({ title: "Timer discarded" });
            }}
          >
            Discard
          </Button>
          <Button
            disabled={!form.mandateId || !form.hours || saving}
            onClick={save}
          >
            {saving ? "Saving…" : "Log time"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// The timer control that lives in the top bar of every CRM page, plus its
// stop form and the "still working?" check-in.
export function WorkTimer() {
  const { pathname } = useLocation();
  const { toast } = useToast();
  const timer = useWorkTimer();
  const [now, setNow] = useState(Date.now());
  const [stopOpen, setStopOpen] = useState(false);
  const [stopHours, setStopHours] = useState(1);
  const [idleDeadline, setIdleDeadline] = useState<number | null>(null);

  const visible = pathname.startsWith("/crm");

  useEffect(() => {
    if (!timer.running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [timer.running]);

  const elapsedMs = timer.active ? elapsedMsOf(timer, now) : 0;

  // Hourly check-in on *running* time. No answer within the grace period
  // means the person walked away: stop and discard rather than keep
  // billing time nobody worked.
  useEffect(() => {
    if (!timer.running) {
      setIdleDeadline(null);
      return;
    }
    if (
      idleDeadline === null &&
      elapsedMs - timer.confirmedAtMs >= CHECK_IN_INTERVAL_MS
    ) {
      setIdleDeadline(now + IDLE_GRACE_MS);
    } else if (idleDeadline !== null && now >= idleDeadline) {
      workTimer.reset();
      setIdleDeadline(null);
      toast({
        title: "Timer stopped",
        description:
          "No response to the check-in, so we assumed you'd stepped away.",
      });
    }
  }, [now, timer.running, timer.confirmedAtMs, elapsedMs, idleDeadline, toast]);

  if (!visible) return null;

  const openStop = () => {
    // Freeze the clock on the figure being logged.
    workTimer.pause();
    setIdleDeadline(null);
    setStopHours(hoursFromMs(elapsedMsOf(timer, Date.now())));
    setStopOpen(true);
  };

  return (
    <>
      {!timer.active ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            workTimer.start();
            toast({
              title: "Timer started",
              description: "Tracking time in the CRM.",
            });
          }}
          title="Start a timesheet timer"
        >
          <Play className="mr-1.5 h-3.5 w-3.5" /> Start timer
        </Button>
      ) : (
        <div className="flex items-center gap-1.5 rounded-full border bg-card py-1 pl-3 pr-1">
          <span className="flex items-center gap-2 font-mono text-sm tabular-nums">
            <span
              className={`h-2 w-2 rounded-full ${timer.running ? "animate-pulse bg-destructive" : "bg-amber-500"}`}
            />
            {formatClock(elapsedMs)}
            {!timer.running && (
              <span className="font-sans text-[11px] text-muted-foreground">
                paused
              </span>
            )}
          </span>
          {timer.running ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 rounded-full px-2.5"
              onClick={() => workTimer.pause()}
              title="Take a break — the clock stops until you resume"
            >
              <Pause className="mr-1 h-3 w-3" /> Pause
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 rounded-full px-2.5"
              onClick={() => workTimer.resume()}
            >
              <Play className="mr-1 h-3 w-3" /> Resume
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            className="h-7 rounded-full px-2.5"
            onClick={openStop}
          >
            <Square className="mr-1 h-3 w-3" /> Stop
          </Button>
        </div>
      )}

      <StopTimerDialog
        open={stopOpen}
        onOpenChange={(o) => {
          setStopOpen(o);
          // Closed without logging — pick the clock back up where it was.
          if (!o && workTimer.getState().active) workTimer.resume();
        }}
        initialHours={stopHours}
      />

      <Dialog open={idleDeadline !== null} onOpenChange={() => {}}>
        <DialogContent
          className="max-w-sm"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" /> Still working?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Your timer has been running for a while. If we don't hear from you
            in{" "}
            <span className="font-medium tabular-nums text-foreground">
              {idleDeadline ? fmtCountdown(idleDeadline - now) : "5:00"}
            </span>
            , we'll assume you stepped away and stop it.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIdleDeadline(null);
                openStop();
              }}
            >
              <Square className="mr-1 h-3 w-3" /> No, I'm done
            </Button>
            <Button
              onClick={() => {
                workTimer.confirmStillWorking();
                setIdleDeadline(null);
              }}
            >
              Yes, still working
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
