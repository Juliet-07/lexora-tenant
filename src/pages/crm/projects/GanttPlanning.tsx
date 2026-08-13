import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { Diamond, TriangleAlert } from "lucide-react";
import { fetchMandates, type Milestone } from "@/lib/crm/mandates-api";
import { fetchTasks, DEPENDENCY_TYPES, type Task } from "@/lib/crm/tasks-api";
import { useResourceAllocation } from "@/hooks/use-resource-allocation";

const day = 86400000;

interface TaskNode extends Task {
  depth: number;
}

// Depth-first ordering by parentTaskId, so children sit right under
// their parent in both the WBS table and the Gantt rows, rather than
// a flat unordered list.
function buildHierarchy(tasks: Task[]): TaskNode[] {
  const byId = new Set(tasks.map((t) => t._id));
  const childrenOf = new Map<string, Task[]>();
  const roots: Task[] = [];
  tasks.forEach((t) => {
    if (t.parentTaskId && byId.has(t.parentTaskId)) {
      const arr = childrenOf.get(t.parentTaskId) ?? [];
      arr.push(t);
      childrenOf.set(t.parentTaskId, arr);
    } else {
      roots.push(t);
    }
  });
  const result: TaskNode[] = [];
  const visit = (t: Task, depth: number) => {
    result.push({ ...t, depth });
    (childrenOf.get(t._id) ?? []).forEach((c) => visit(c, depth + 1));
  };
  roots.forEach((t) => visit(t, 0));
  return result;
}

const depLabel = (t: Task, byId: Map<string, Task>) => {
  if (!t.dependsOnTaskId) return null;
  const dep = byId.get(t.dependsOnTaskId);
  const type =
    DEPENDENCY_TYPES.find((d) => d.value === t.depType)?.label ?? t.depType;
  return dep ? `${type} ← ${dep.title}` : null;
};

export default function GanttPlanning() {
  const { data: mandates = [] } = useQuery({
    queryKey: ["mandates"],
    queryFn: fetchMandates,
  });
  const [mandateId, setMandateId] = useState("");
  const activeMandateId = mandateId || mandates[0]?._id || "";
  const mandate = mandates.find((m) => m._id === activeMandateId);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", { mandateId: activeMandateId }],
    queryFn: () => fetchTasks({ mandateId: activeMandateId }),
    enabled: !!activeMandateId,
  });

  const nodes = useMemo(() => buildHierarchy(tasks), [tasks]);

  // Resource Allocation is deliberately firm-wide, not scoped to the
  // selected mandate — same shared computation PMO's Resources tab
  // uses now, not a second copy that could drift.
  const { allocation, ASSUMED_AVAILABLE_HRS } = useResourceAllocation();
  const tasksById = useMemo(
    () => new Map(tasks.map((t) => [t._id, t])),
    [tasks],
  );
  const milestones: Milestone[] = mandate?.milestones ?? [];

  const { min, max, span } = useMemo(() => {
    const dates = [
      ...tasks.flatMap((t) => [
        new Date(t.startDate).getTime(),
        new Date(t.dueDate).getTime(),
      ]),
      ...milestones.map((m) => new Date(m.date).getTime()),
    ].filter((d) => !Number.isNaN(d));
    if (!dates.length) return { min: 0, max: 0, span: day };
    const mn = Math.min(...dates);
    const mx = Math.max(...dates);
    return { min: mn, max: mx, span: Math.max(mx - mn, day) };
  }, [tasks, milestones]);

  const today = Date.now();
  const pos = (t: number) => ((t - min) / span) * 100;

  const months = useMemo(() => {
    if (!tasks.length && !milestones.length) return [];
    const out: { label: string; left: number }[] = [];
    const d = new Date(min);
    d.setDate(1);
    while (d.getTime() <= max) {
      out.push({
        label: d.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        left: Math.max(0, pos(d.getTime())),
      });
      d.setMonth(d.getMonth() + 1);
    }
    return out;
  }, [min, max, span, tasks.length, milestones.length]);

  const hasSchedule = tasks.length > 0 || milestones.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Gantt &amp; Planning</h1>
          <p className="text-sm text-muted-foreground">
            Work breakdown, scheduling and dependencies
          </p>
        </div>
        <Select value={activeMandateId} onValueChange={setMandateId}>
          <SelectTrigger className="w-64">
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

      {!activeMandateId ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Select a mandate to view its schedule.
        </p>
      ) : isLoading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Loading…
        </p>
      ) : !hasSchedule ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No tasks or milestones on this mandate yet — add some to see the
          schedule here.
        </p>
      ) : (
        <Tabs defaultValue="gantt">
          <TabsList>
            <TabsTrigger value="gantt">Gantt</TabsTrigger>
            <TabsTrigger value="wbs">WBS</TabsTrigger>
            <TabsTrigger value="resources">Resource allocation</TabsTrigger>
          </TabsList>

          <TabsContent value="gantt" className="pt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{mandate?.name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Red bars are marked critical path · dashed line is today ·
                  diamonds are milestones
                </p>
              </CardHeader>
              <CardContent className="space-y-1 overflow-x-auto">
                <div className="relative h-6 min-w-[640px] border-b text-[11px] text-muted-foreground">
                  {months.map((m) => (
                    <span
                      key={m.label}
                      className="absolute -translate-x-1/2"
                      style={{ left: `${m.left}%` }}
                    >
                      {m.label}
                    </span>
                  ))}
                </div>
                <div className="relative min-w-[640px]">
                  <div
                    className="pointer-events-none absolute top-0 z-10 h-full border-l-2 border-dashed border-primary"
                    style={{ left: `${pos(today)}%` }}
                  />
                  {nodes.map((n) => {
                    const s = new Date(n.startDate).getTime();
                    const e = new Date(n.dueDate).getTime();
                    const left = pos(s);
                    const width = Math.max(((e - s) / span) * 100, 0.6);
                    return (
                      <div
                        key={n._id}
                        className="flex items-center gap-2 border-b py-2 last:border-0"
                      >
                        <div
                          className="w-56 shrink-0 truncate text-xs"
                          style={{ paddingLeft: n.depth * 14 }}
                        >
                          <span
                            className={n.depth === 0 ? "font-semibold" : ""}
                          >
                            {n.title}
                          </span>
                        </div>
                        <div className="relative h-5 flex-1">
                          <div
                            className={`absolute top-1 h-3 rounded ${n.critical ? "bg-destructive/70" : "bg-primary/60"}`}
                            style={{ left: `${left}%`, width: `${width}%` }}
                          >
                            <div
                              className="h-3 rounded bg-foreground/30"
                              style={{ width: `${n.progress}%` }}
                            />
                          </div>
                        </div>
                        <span className="w-10 shrink-0 text-right text-[11px] text-muted-foreground">
                          {n.progress}%
                        </span>
                      </div>
                    );
                  })}
                  {milestones.map((m) => {
                    const t = new Date(m.date).getTime();
                    return (
                      <div
                        key={m._id}
                        className="flex items-center gap-2 border-b py-2 last:border-0"
                      >
                        <div className="w-56 shrink-0 truncate text-xs font-semibold">
                          {m.name}
                        </div>
                        <div className="relative h-5 flex-1">
                          <Diamond
                            className="absolute h-4 w-4 -translate-x-1/2 fill-secondary text-secondary"
                            style={{ left: `${pos(t)}%`, top: 2 }}
                          />
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {m.status.replace("_", " ")}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wbs" className="space-y-4 pt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Work breakdown structure</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Dependency</TableHead>
                      <TableHead className="w-32">Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nodes.map((n) => (
                      <TableRow key={n._id}>
                        <TableCell style={{ paddingLeft: 16 + n.depth * 20 }}>
                          <span
                            className={`text-sm ${n.depth === 0 ? "font-semibold" : ""}`}
                          >
                            {n.title}
                          </span>
                          {n.critical && (
                            <Badge className="ml-2 bg-destructive/10 text-[10px] text-destructive">
                              Critical path
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{n.assignee}</TableCell>
                        <TableCell className="text-sm">
                          {n.startDate?.slice(0, 10)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {n.dueDate?.slice(0, 10)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {depLabel(n, tasksById) ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Progress value={n.progress} className="h-2" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {milestones.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Milestones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {milestones.map((m) => (
                    <div
                      key={m._id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <Diamond className="h-3 w-3 fill-secondary text-secondary" />
                        {m.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {m.date?.slice(0, 10)} · {m.status.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="resources" className="space-y-4 pt-4">
            {/* <div className="flex items-start gap-2 rounded border border-dashed p-3 text-xs text-muted-foreground">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Firm-wide, not just this mandate — allocated hours are real
                Approved billable time plus what's left on each person's open
                tasks (estimate minus what's already been approved). "Available"
                is the same stated {ASSUMED_AVAILABLE_HRS}h assumption used in
                Timesheets' Utilisation tab — there's no real capacity tracking
                to compute it from yet.
              </span>
            </div> */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Workload across all mandates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {allocation.map((a) => {
                  const over = a.allocated > ASSUMED_AVAILABLE_HRS;
                  const pct = Math.round(
                    (a.allocated / ASSUMED_AVAILABLE_HRS) * 100,
                  );
                  return (
                    <div key={a.member} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{a.member}</span>
                        <span
                          className={
                            over ? "text-destructive" : "text-muted-foreground"
                          }
                        >
                          {a.allocated.toFixed(1)} / {ASSUMED_AVAILABLE_HRS}h
                          {over && (
                            <TriangleAlert className="ml-1 inline h-3 w-3" />
                          )}
                        </span>
                      </div>
                      <Progress value={Math.min(pct, 100)} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {a.billable.toFixed(1)}h approved ·{" "}
                        {a.remaining.toFixed(1)}h remaining on open tasks
                      </p>
                      {over && (
                        <p className="text-xs text-destructive">
                          Over-allocated — rebalance tasks to another member.
                        </p>
                      )}
                    </div>
                  );
                })}
                {!allocation.length && (
                  <p className="text-sm text-muted-foreground">
                    No tasks or time entries yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
