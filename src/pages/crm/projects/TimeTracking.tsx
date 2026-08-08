import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Play, Square, Plus, Lock, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  timeEntries as seed,
  TimeEntry,
  TimesheetStatus,
  mandates,
  rateCards,
  utilisation,
  money,
} from "@/data/crmPmMockData";

const statusClass: Record<TimesheetStatus, string> = {
  Draft: "bg-muted text-muted-foreground",
  Submitted: "bg-primary/10 text-primary",
  "Lead Approved": "bg-warning/10 text-warning",
  Approved: "bg-success/10 text-success",
  Rejected: "bg-destructive/10 text-destructive",
};

const ME = "Sarah Chen";

export default function TimeTracking() {
  const [entries, setEntries] = useState<TimeEntry[]>(seed);
  const [running, setRunning] = useState<{ start: number; mandateId: string } | null>(
    null,
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [openNew, setOpenNew] = useState(false);
  const [lockDate, setLockDate] = useState("2026-06-30");
  const [draft, setDraft] = useState({
    date: "2026-07-30",
    mandateId: mandates[0].id,
    taskTitle: "",
    narrative: "",
    hours: 1,
    billable: true,
  });
  const { toast } = useToast();

  const pending = entries.filter((e) =>
    ["Submitted", "Lead Approved"].includes(e.status),
  );
  const approvedValue = entries
    .filter((e) => e.status === "Approved" && e.billable)
    .reduce((s, e) => s + e.hours * e.rate, 0);
  const billableHrs = entries
    .filter((e) => e.billable)
    .reduce((s, e) => s + e.hours, 0);
  const totalHrs = entries.reduce((s, e) => s + e.hours, 0);

  const setStatus = (ids: string[], status: TimesheetStatus, reason?: string) => {
    setEntries((p) =>
      p.map((e) =>
        ids.includes(e.id) ? { ...e, status, rejectReason: reason } : e,
      ),
    );
    setSelected([]);
  };

  const addEntry = (hours: number, extra?: Partial<TimeEntry>) => {
    const m = mandates.find((x) => x.id === draft.mandateId)!;
    const rate = rateCards.find((r) => r.member === ME)?.standard ?? 200;
    setEntries((p) => [
      {
        id: `TE-${String(p.length + 101)}`,
        date: draft.date,
        member: ME,
        mandateId: m.id,
        mandateName: m.name,
        taskTitle: draft.taskTitle || "Ad-hoc work",
        narrative: draft.narrative || "—",
        hours: Number(hours.toFixed(2)),
        billable: draft.billable,
        rate: draft.billable ? rate : 0,
        status: "Draft",
        ...extra,
      },
      ...p,
    ]);
  };

  const weekGrid = useMemo(() => {
    const days = ["2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30"];
    const members = Array.from(new Set(entries.map((e) => e.member)));
    return { days, members };
  }, [entries]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Timesheets</h1>
          <p className="text-sm text-muted-foreground">
            Time entry, two-stage approval, utilisation and billing integration
          </p>
        </div>
        <div className="flex gap-2">
          {running ? (
            <Button
              variant="destructive"
              onClick={() => {
                const hrs = Math.max(
                  0.25,
                  (Date.now() - running.start) / 3600000,
                );
                addEntry(hrs);
                setRunning(null);
                toast({
                  title: "Timer stopped",
                  description: `${hrs.toFixed(2)} hrs captured as a draft entry.`,
                });
              }}
            >
              <Square className="mr-2 h-4 w-4" /> Stop timer
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                setRunning({ start: Date.now(), mandateId: draft.mandateId });
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

      <Tabs defaultValue="entries">
        <TabsList className="flex-wrap">
          <TabsTrigger value="entries">Time entries</TabsTrigger>
          <TabsTrigger value="grid">Weekly grid</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="utilisation">Utilisation</TabsTrigger>
          <TabsTrigger value="rates">Rate cards &amp; billing</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Mandate / task</TableHead>
                    <TableHead>Narrative</TableHead>
                    <TableHead className="text-right">Hrs</TableHead>
                    <TableHead>Billable</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm">{e.date}</TableCell>
                      <TableCell className="text-sm">{e.member}</TableCell>
                      <TableCell>
                        <p className="text-sm">{e.taskTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.mandateName}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-[240px] text-xs text-muted-foreground">
                        {e.narrative}
                        {e.rejectReason && (
                          <span className="block text-destructive">
                            Rejected: {e.rejectReason}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {e.hours}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {e.billable ? "Billable" : "Non-billable"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusClass[e.status]}>
                          {e.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {money(e.hours * e.rate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setStatus(
                  entries.filter((e) => e.status === "Draft").map((e) => e.id),
                  "Submitted",
                )
              }
            >
              Submit all drafts
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="grid" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    {weekGrid.days.map((d) => (
                      <TableHead key={d} className="text-center">
                        {d.slice(5)}
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weekGrid.members.map((m) => {
                    const rowTotal = entries
                      .filter((e) => e.member === m)
                      .reduce((s, e) => s + e.hours, 0);
                    return (
                      <TableRow key={m}>
                        <TableCell className="text-sm font-medium">{m}</TableCell>
                        {weekGrid.days.map((d) => {
                          const hrs = entries
                            .filter((e) => e.member === m && e.date === d)
                            .reduce((s, e) => s + e.hours, 0);
                          return (
                            <TableCell key={d} className="text-center text-sm">
                              {hrs || "—"}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right text-sm font-semibold">
                          {rowTotal}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Two-stage approval — team lead then partner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  disabled={!selected.length}
                  onClick={() => {
                    const leadStage = entries.filter(
                      (e) => selected.includes(e.id) && e.status === "Submitted",
                    );
                    setStatus(
                      leadStage.map((e) => e.id),
                      "Lead Approved",
                    );
                    const partnerStage = entries.filter(
                      (e) =>
                        selected.includes(e.id) && e.status === "Lead Approved",
                    );
                    setStatus(
                      partnerStage.map((e) => e.id),
                      "Approved",
                    );
                    toast({
                      title: "Approved",
                      description:
                        "Approved billable time flows to WIP for invoicing.",
                    });
                  }}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Approve selected
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!selected.length}
                  onClick={() => {
                    setStatus(selected, "Rejected", "Narrative insufficient");
                    toast({
                      title: "Rejected",
                      description: "Submitter notified with reason.",
                    });
                  }}
                >
                  <XCircle className="mr-2 h-4 w-4" /> Reject selected
                </Button>
                <div className="ml-auto flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-xs">Locked up to</Label>
                  <Input
                    type="date"
                    className="w-40"
                    value={lockDate}
                    onChange={(e) => setLockDate(e.target.value)}
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Member</TableHead>
                    <TableHead>Mandate</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Hrs</TableHead>
                    <TableHead>Stage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <Checkbox
                          checked={selected.includes(e.id)}
                          onCheckedChange={(v) =>
                            setSelected((p) =>
                              v ? [...p, e.id] : p.filter((x) => x !== e.id),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="text-sm">{e.member}</TableCell>
                      <TableCell className="text-sm">{e.mandateName}</TableCell>
                      <TableCell className="text-sm">{e.date}</TableCell>
                      <TableCell className="text-right text-sm">
                        {e.hours}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusClass[e.status]}>
                          {e.status === "Submitted"
                            ? "Awaiting team lead"
                            : "Awaiting partner"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!pending.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                        Nothing awaiting approval.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="utilisation" className="pt-4">
          <Card>
            <CardContent className="space-y-4 p-4">
              {utilisation.map((u) => {
                const pct = Math.round((u.billable / u.available) * 100);
                return (
                  <div key={u.member} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{u.member}</span>
                      <span>
                        {pct}% · target {u.target}% · trend{" "}
                        {u.trend.join(" → ")}
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Standard rate</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Negotiated rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rateCards.map((r) => (
                    <TableRow key={r.member}>
                      <TableCell className="text-sm">{r.member}</TableCell>
                      <TableCell className="text-sm">{r.role}</TableCell>
                      <TableCell className="text-right text-sm">
                        {money(r.standard)}
                      </TableCell>
                      <TableCell className="text-sm">{r.client}</TableCell>
                      <TableCell className="text-right text-sm">
                        {money(r.negotiated)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log time</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
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
            <div>
              <Label>Mandate</Label>
              <Select
                value={draft.mandateId}
                onValueChange={(v) => setDraft({ ...draft, mandateId: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mandates.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Task</Label>
              <Input
                value={draft.taskTitle}
                onChange={(e) =>
                  setDraft({ ...draft, taskTitle: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Narrative</Label>
              <Textarea
                rows={3}
                value={draft.narrative}
                onChange={(e) =>
                  setDraft({ ...draft, narrative: e.target.value })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.billable}
                onCheckedChange={(v) => setDraft({ ...draft, billable: v })}
              />
              <Label>Billable</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                addEntry(draft.hours);
                setOpenNew(false);
                toast({ title: "Time entry saved as draft" });
              }}
            >
              Save entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
