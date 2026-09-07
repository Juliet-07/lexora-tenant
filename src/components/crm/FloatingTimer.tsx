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
import { Play, Square, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMandates } from "@/lib/crm/mandates-api";
import { createTimeEntry, logMyTime } from "@/lib/crm/time-tracking-api";

const STORAGE_KEY = "lexora.crm.floating-timer.v1";

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
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
  const [now, setNow] = useState(Date.now());
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    mandateId: "",
    narrative: "",
    billable: true,
  });

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

  if (!visible) return null;

  const start = () => {
    const t = Date.now();
    localStorage.setItem(STORAGE_KEY, String(t));
    setStartedAt(t);
    setNow(t);
    toast({ title: "Timer started", description: "Tracking time in the CRM." });
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
      setStartedAt(null);
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
                onChange={(e) => setForm({ ...form, narrative: e.target.value })}
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
                setStartedAt(null);
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
    </>
  );
}
