import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Play, Square, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchEmployees } from "@/lib/hr/hr-api";
import { fetchMandates } from "@/lib/crm/mandates-api";
import { fetchTasks } from "@/lib/crm/tasks-api";
import {
  fetchTimeEntries,
  createTimeEntry,
  type TimeEntry,
} from "@/lib/crm/time-tracking-api";

import { EntriesTab } from "./EntriesTab";
import { WeeklyGridTab } from "./WeeklyGridTab";
import { ApprovalsTab } from "./ApprovalsTab";
import { UtilisationTab } from "./UtilisationTab";
import { RateCardsTab } from "./RateCardsTab";

const money = (n: number, c = "USD") =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: c,
    maximumFractionDigits: 0,
  });

export default function TimeTracking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["timeEntries"],
    queryFn: () => fetchTimeEntries(),
  });
  const { data: mandates = [] } = useQuery({
    queryKey: ["mandates"],
    queryFn: fetchMandates,
  });
  const { data: employeesPage } = useQuery({
    queryKey: ["hr-employees-all"],
    queryFn: () => fetchEmployees({ limit: 500 }),
    retry: false,
  });
  const employees = employeesPage?.items ?? [];

  const [openNew, setOpenNew] = useState(false);
  const [running, setRunning] = useState<{ start: number } | null>(null);
  const [draft, setDraft] = useState({
    employeeUserId: "",
    member: "",
    mandateId: "",
    mandateName: "",
    taskId: "",
    taskTitle: "",
    narrative: "",
    date: new Date().toISOString().slice(0, 10),
    hours: 1,
    billable: true,
  });

  const { data: mandateTasks = [] } = useQuery({
    queryKey: ["tasks", { mandateId: draft.mandateId }],
    queryFn: () => fetchTasks({ mandateId: draft.mandateId }),
    enabled: !!draft.mandateId,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["timeEntries"] });

  const createMut = useMutation({
    mutationFn: (hours: number) =>
      createTimeEntry({
        memberUserId: draft.employeeUserId,
        member: draft.member,
        mandateId: draft.mandateId,
        mandateName: draft.mandateName,
        taskId: draft.taskId || undefined,
        taskTitle: draft.taskTitle || undefined,
        narrative: draft.narrative,
        date: draft.date,
        hours,
        billable: draft.billable,
      }),
    onSuccess: () => {
      invalidate();
      setOpenNew(false);
      toast({
        title: "Time logged",
        description: "Saved as a draft — submit it when ready for approval.",
      });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to log time",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const pending = entries.filter(
    (e) => e.status === "Submitted" || e.status === "Lead Approved",
  );
  const approvedValue = entries
    .filter((e) => e.status === "Approved" && e.billable)
    .reduce((s, e) => s + e.hours * e.rate, 0);
  const billableHrs = entries
    .filter((e) => e.billable)
    .reduce((s, e) => s + e.hours, 0);
  const totalHrs = entries.reduce((s, e) => s + e.hours, 0);

  const stopTimer = () => {
    if (!running || !draft.employeeUserId || !draft.mandateId) {
      toast({
        title: "Pick an employee and mandate first",
        variant: "destructive",
      });
      return;
    }
    const hrs = Math.max(0.25, (Date.now() - running.start) / 3600000);
    createMut.mutate(Number(hrs.toFixed(2)));
    setRunning(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Timesheets</h1>
          <p className="text-sm text-muted-foreground">
            Time entry, two-stage approval, utilisation and billing
          </p>
        </div>
        <div className="flex gap-2">
          {running ? (
            <Button variant="destructive" onClick={stopTimer}>
              <Square className="mr-2 h-4 w-4" /> Stop timer
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                if (!draft.employeeUserId || !draft.mandateId) {
                  setOpenNew(true);
                  toast({
                    title:
                      "Pick an employee and mandate first, then start the timer from here.",
                  });
                  return;
                }
                setRunning({ start: Date.now() });
                toast({ title: "Timer started" });
              }}
            >
              <Play className="mr-2 h-4 w-4" /> Start timer
            </Button>
          )}
          <Button onClick={() => setOpenNew(true)}>
            <Plus className="mr-2 h-4 w-4" /> Log time
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "Hours logged", v: totalHrs.toFixed(1) },
          { l: "Billable hours", v: billableHrs.toFixed(1) },
          { l: "Approved value (to WIP)", v: money(approvedValue) },
          { l: "Awaiting approval", v: String(pending.length) },
        ].map((k) => (
          <Card key={k.l}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.l}</p>
              <p className="mt-1 text-xl font-bold">{k.v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Loading…
        </p>
      ) : (
        <Tabs defaultValue="entries">
          <TabsList className="flex-wrap">
            <TabsTrigger value="entries">Time entries</TabsTrigger>
            <TabsTrigger value="grid">Weekly grid</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="utilisation">Utilisation</TabsTrigger>
            <TabsTrigger value="rates">Rate cards &amp; billing</TabsTrigger>
          </TabsList>

          <TabsContent value="entries" className="pt-4">
            <EntriesTab entries={entries} />
          </TabsContent>
          <TabsContent value="grid" className="pt-4">
            <WeeklyGridTab entries={entries} />
          </TabsContent>
          <TabsContent value="approvals" className="pt-4">
            <ApprovalsTab entries={entries} />
          </TabsContent>
          <TabsContent value="utilisation" className="pt-4">
            <UtilisationTab entries={entries} />
          </TabsContent>
          <TabsContent value="rates" className="pt-4">
            <RateCardsTab />
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log time</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Employee</Label>
              <Select
                value={draft.employeeUserId}
                onValueChange={(v) => {
                  const e = employees.find((x: any) => x._id === v);
                  setDraft({
                    ...draft,
                    employeeUserId: v,
                    member: e ? `${e.firstName} ${e.lastName}` : "",
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e._id} value={e._id}>
                      {e.firstName} {e.lastName}
                      {e.jobTitle ? ` · ${e.jobTitle}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mandate</Label>
              <Select
                value={draft.mandateId}
                onValueChange={(v) => {
                  const m = mandates.find((x) => x._id === v);
                  setDraft({
                    ...draft,
                    mandateId: v,
                    mandateName: m?.name ?? "",
                    taskId: "",
                    taskTitle: "",
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mandate..." />
                </SelectTrigger>
                <SelectContent>
                  {mandates.map((m) => (
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
                value={draft.taskId}
                onValueChange={(v) => {
                  const t = mandateTasks.find((x) => x._id === v);
                  setDraft({ ...draft, taskId: v, taskTitle: t?.title ?? "" });
                }}
                disabled={!draft.mandateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ad-hoc work (no specific task)" />
                </SelectTrigger>
                <SelectContent>
                  {mandateTasks.map((t) => (
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
                value={draft.narrative}
                onChange={(e) =>
                  setDraft({ ...draft, narrative: e.target.value })
                }
                placeholder="What did you work on?"
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
                <Label>Hours</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={draft.hours}
                  onChange={(e) =>
                    setDraft({ ...draft, hours: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <label className="flex items-center justify-between rounded border p-3 text-sm">
              Billable
              <Switch
                checked={draft.billable}
                onCheckedChange={(v) => setDraft({ ...draft, billable: v })}
              />
            </label>
          </div>
          <DialogFooter>
            <Button
              disabled={
                createMut.isPending ||
                !draft.employeeUserId ||
                !draft.mandateId ||
                !draft.hours
              }
              onClick={() => createMut.mutate(draft.hours)}
            >
              {createMut.isPending ? "Saving…" : "Log time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
