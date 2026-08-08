import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Diamond, AlertTriangle } from "lucide-react";
import {
  wbs,
  mandates,
  utilisation,
  pmTasks,
  calendarEvents,
} from "@/data/crmPmMockData";

const day = 86400000;

export default function GanttPlanning() {
  const withPlans = mandates.filter((m) => wbs[m.id]);
  const [mandateId, setMandateId] = useState(withPlans[0].id);
  const [zoom, setZoom] = useState<"Week" | "Month" | "Quarter">("Month");
  const nodes = wbs[mandateId] ?? [];

  const { min, max, span } = useMemo(() => {
    const starts = nodes.map((n) => new Date(n.start).getTime());
    const ends = nodes.map((n) => new Date(n.end).getTime());
    const mn = Math.min(...starts);
    const mx = Math.max(...ends);
    return { min: mn, max: mx, span: Math.max(mx - mn, day) };
  }, [nodes]);

  const today = new Date("2026-07-30").getTime();
  const pos = (t: number) => ((t - min) / span) * 100;

  const months = useMemo(() => {
    const out: { label: string; left: number }[] = [];
    const d = new Date(min);
    d.setDate(1);
    while (d.getTime() <= max) {
      out.push({
        label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        left: Math.max(0, pos(d.getTime())),
      });
      d.setMonth(d.getMonth() + 1);
    }
    return out;
  }, [min, max, span]);

  const mandate = mandates.find((m) => m.id === mandateId)!;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Gantt &amp; Planning</h1>
          <p className="text-sm text-muted-foreground">
            Work breakdown, scheduling and resource allocation (lifecycle steps
            2–4)
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={mandateId} onValueChange={setMandateId}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {withPlans.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={zoom} onValueChange={(v) => setZoom(v as typeof zoom)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["Week", "Month", "Quarter"].map((z) => (
                <SelectItem key={z} value={z}>
                  {z}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="gantt">
        <TabsList>
          <TabsTrigger value="gantt">Gantt</TabsTrigger>
          <TabsTrigger value="wbs">WBS</TabsTrigger>
          <TabsTrigger value="resources">Resource allocation</TabsTrigger>
          <TabsTrigger value="calendar">Calendar view</TabsTrigger>
        </TabsList>

        <TabsContent value="gantt" className="pt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {mandate.name} — {zoom} view
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Critical path highlighted · dashed line marks today · diamonds
                are milestones
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
                  const s = new Date(n.start).getTime();
                  const e = new Date(n.end).getTime();
                  const left = pos(s);
                  const width = Math.max(((e - s) / span) * 100, 0.6);
                  return (
                    <div
                      key={n.id}
                      className="flex items-center gap-2 border-b py-2 last:border-0"
                    >
                      <div
                        className="w-56 shrink-0 truncate text-xs"
                        style={{ paddingLeft: n.level * 14 }}
                      >
                        <span className={n.level === 0 ? "font-semibold" : ""}>
                          {n.name}
                        </span>
                        {n.dependsOn && (
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            ({n.depType} ← {n.dependsOn})
                          </span>
                        )}
                      </div>
                      <div className="relative h-5 flex-1">
                        {n.milestone ? (
                          <Diamond
                            className="absolute h-4 w-4 -translate-x-1/2 fill-primary text-primary"
                            style={{ left: `${left}%`, top: 2 }}
                          />
                        ) : (
                          <div
                            className={`absolute top-1 h-3 rounded ${
                              n.critical ? "bg-destructive/70" : "bg-primary/60"
                            }`}
                            style={{ left: `${left}%`, width: `${width}%` }}
                          >
                            <div
                              className="h-3 rounded bg-foreground/30"
                              style={{ width: `${n.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <span className="w-10 shrink-0 text-right text-[11px] text-muted-foreground">
                        {n.progress}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wbs" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Work breakdown structure</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>Finish</TableHead>
                    <TableHead>Dependency</TableHead>
                    <TableHead className="w-32">Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nodes.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell style={{ paddingLeft: 16 + n.level * 20 }}>
                        <span
                          className={`text-sm ${n.level === 0 ? "font-semibold" : ""}`}
                        >
                          {n.name}
                        </span>
                        {n.milestone && (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            Milestone
                          </Badge>
                        )}
                        {n.critical && (
                          <Badge className="ml-2 bg-destructive/10 text-[10px] text-destructive">
                            Critical path
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{n.owner}</TableCell>
                      <TableCell className="text-sm">{n.start}</TableCell>
                      <TableCell className="text-sm">{n.end}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {n.dependsOn ? `${n.depType} ← ${n.dependsOn}` : "—"}
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
        </TabsContent>

        <TabsContent value="resources" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Workload across all mandates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {utilisation.map((u) => {
                const allocated =
                  u.billable +
                  pmTasks
                    .filter((t) => t.assignee === u.member)
                    .reduce((s, t) => s + (t.estimateHrs - t.loggedHrs), 0);
                const over = allocated > u.available;
                return (
                  <div key={u.member} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{u.member}</span>
                      <span
                        className={over ? "text-destructive" : "text-muted-foreground"}
                      >
                        {allocated} / {u.available} hrs
                        {over && (
                          <AlertTriangle className="ml-1 inline h-3 w-3" />
                        )}
                      </span>
                    </div>
                    <Progress
                      value={Math.min((allocated / u.available) * 100, 100)}
                      className="h-2"
                    />
                    {over && (
                      <p className="text-xs text-destructive">
                        Over-allocated — rebalance tasks to another member.
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="pt-4">
          <Card>
            <CardContent className="space-y-2 p-4">
              {calendarEvents
                .filter((e) => e.layer !== "Personal")
                .map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.source} · {e.location}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {e.date} {e.time}
                    </Badge>
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
