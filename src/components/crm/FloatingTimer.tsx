import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
import { Play, Square, Timer, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMandates } from "@/lib/crm/mandates-api";
import { createTimeEntry, logMyTime } from "@/lib/crm/time-tracking-api";

const STORAGE_KEY = "lexora.crm.floating-timer.v1";
// Tracks when the user last confirmed they're genuinely still
// working — separate from startedAt, since that reflects the whole
// session, not the last "yes, still working" check-in.
const LAST_CONFIRMED_KEY = "lexora.crm.floating-timer.last-confirmed.v1";

const CHECK_IN_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const IDLE_GRACE_MS = 5 * 60 * 1000; // 5 minutes to respond

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
};

const fmtCountdown = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
};

export function FloatingTimer() {
  const { pathname } = useLocation();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [startedAt, setStartedAt] = useState<number | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? Number(raw) : null;
  });
  const [lastConfirmedAt, setLastConfirmedAt] = useState<number | null>(() => {
    const raw = localStorage.getItem(LAST_CONFIRMED_KEY);
    return raw ? Number(raw) : null;
  });
  const [now, setNow] = useState(Date.now());
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    mandateId: "",
    narrative: "",
    billable: true,
  });

  // Real idle check-in — the popup itself, and the deadline for a
  // response before we assume idle and stop the timer.
  const [idlePromptOpen, setIdlePromptOpen] = useState(false);
  const [idleDeadline, setIdleDeadline] = useState<number | null>(null);

  const inCrm = pathname.startsWith("/crm");
  const onTimesheets = pathname.startsWith("/crm/time");
  const visible = inCrm && !onTimesheets;

  const { data: mandates = [] } = useQuery({
    queryKey: ["mandates"],
    queryFn: fetchMandates,
    enabled: visible,
    retry: false,
  });

  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  // Real idle check-in — once an hour of confirmed work has passed,
  // prompt; if there's no response within the grace period, treat it
  // as idle and stop the timer rather than silently keep accumulating
  // time nobody actually worked.
  useEffect(() => {
    if (!startedAt || !lastConfirmedAt) return;

    if (!idlePromptOpen && now - lastConfirmedAt >= CHECK_IN_INTERVAL_MS) {
      setIdlePromptOpen(true);
      setIdleDeadline(now + IDLE_GRACE_MS);
      return;
    }

    if (idlePromptOpen && idleDeadline && now >= idleDeadline) {
      // Idle confirmed — real "stop running", not just a paused UI
      // state. Discards the accumulated time, since the entire point
      // of this check is that it likely isn't accurate work time.
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LAST_CONFIRMED_KEY);
      setStartedAt(null);
      setLastConfirmedAt(null);
      setIdlePromptOpen(false);
      setIdleDeadline(null);
      toast({
        title: "Timer stopped",
        description:
          "No response to the check-in, so we assumed you'd stepped away.",
      });
    }
  }, [now, startedAt, lastConfirmedAt, idlePromptOpen, idleDeadline, toast]);

  if (!visible) return null;

  const start = () => {
    const t = Date.now();
    localStorage.setItem(STORAGE_KEY, String(t));
    localStorage.setItem(LAST_CONFIRMED_KEY, String(t));
    setStartedAt(t);
    setLastConfirmedAt(t);
    setNow(t);
    toast({ title: "Timer started", description: "Tracking time in the CRM." });
  };

  const confirmStillWorking = () => {
    const t = Date.now();
    localStorage.setItem(LAST_CONFIRMED_KEY, String(t));
    setLastConfirmedAt(t);
    setIdlePromptOpen(false);
    setIdleDeadline(null);
  };

  const stopFromIdlePrompt = () => {
    setIdlePromptOpen(false);
    setIdleDeadline(null);
    setOpen(true);
  };

  const elapsedMs = startedAt ? now - startedAt : 0;
  const hours = Math.max(0.25, Number((elapsedMs / 3600000).toFixed(2)));

  const save = async () => {
    if (!form.mandateId) return;
    setSaving(true);
    const mandate = mandates.find((m: any) => m._id === form.mandateId);
    try {
      if (isAdmin) {
        await createTimeEntry({
          memberUserId: user?.id ?? "",
          member: user ? `${user.firstName} ${user.lastName}` : "",
          mandateId: form.mandateId,
          mandateName: mandate?.name ?? "",
          narrative: form.narrative,
          date: new Date().toISOString().slice(0, 10),
          hours,
          billable: form.billable,
        });
      } else {
        await logMyTime({
          mandateId: form.mandateId,
          narrative: form.narrative,
          date: new Date().toISOString().slice(0, 10),
          hours,
          billable: form.billable,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
      queryClient.invalidateQueries({ queryKey: ["myTimeEntries"] });
      toast({
        title: `${hours}h logged`,
        description: "Saved as a draft on your timesheet.",
      });
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LAST_CONFIRMED_KEY);
      setStartedAt(null);
      setLastConfirmedAt(null);
      setOpen(false);
      setForm({ mandateId: "", narrative: "", billable: true });
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
    <>
      <div className="fixed bottom-6 right-6 z-50">
        {startedAt ? (
          <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-2 shadow-lg">
            <span className="flex items-center gap-2 pl-1 font-mono text-sm tabular-nums">
              <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
              {fmt(elapsedMs)}
            </span>
            <Button
              size="sm"
              variant="destructive"
              className="rounded-full"
              onClick={() => setOpen(true)}
            >
              <Square className="mr-1 h-3 w-3" /> Stop
            </Button>
          </div>
        ) : (
          <Button
            size="lg"
            className="rounded-full shadow-lg"
            onClick={start}
            title="Start a timesheet timer"
          >
            <Play className="mr-2 h-4 w-4" /> Start timer
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="h-4 w-4" /> Log {hours}h to a mandate
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Mandate</Label>
              <Select
                value={form.mandateId}
                onValueChange={(v) => setForm({ ...form, mandateId: v })}
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
              <Label>Narrative</Label>
              <Textarea
                value={form.narrative}
                placeholder="What did you work on?"
                onChange={(e) =>
                  setForm({ ...form, narrative: e.target.value })
                }
              />
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
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(LAST_CONFIRMED_KEY);
                setStartedAt(null);
                setLastConfirmedAt(null);
                setOpen(false);
                toast({ title: "Timer discarded" });
              }}
            >
              Discard
            </Button>
            <Button disabled={!form.mandateId || saving} onClick={save}>
              {saving ? "Saving…" : "Log time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={idlePromptOpen} onOpenChange={() => {}}>
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
              {idleDeadline
                ? fmtCountdown(Math.max(0, idleDeadline - now))
                : "5:00"}
            </span>
            , we'll assume you stepped away and stop it.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={stopFromIdlePrompt}>
              <Square className="mr-1 h-3 w-3" /> No, I'm done
            </Button>
            <Button onClick={confirmStillWorking}>Yes, still working</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
