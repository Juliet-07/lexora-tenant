import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { fetchMandateOverview, type Mandate } from "@/lib/crm/mandates-api";

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString() : "—";

// The tenant owner's single view of everything on a mandate: every task
// (by status and by person) and every communication thread, merged.
export function OverviewTab({ mandate }: { mandate: Mandate }) {
  const { data, isLoading } = useQuery({
    queryKey: ["mandateOverview", mandate._id],
    queryFn: () => fetchMandateOverview(mandate._id),
    refetchInterval: 30_000,
  });

  if (isLoading || !data) {
    return (
      <p className="py-6 text-sm text-muted-foreground">Loading overview…</p>
    );
  }
  const { tasks, communications } = data;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Team</p>
            <p className="mt-1 text-sm font-medium">
              {data.mandate.teamName || "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              Manager (Head of Department)
            </p>
            <p className="mt-1 text-sm font-medium">
              {data.mandate.manager ||
                (data.mandate.managerMissing
                  ? "Team has no Head of Department"
                  : "—")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Tasks</p>
            <p className="mt-1 text-sm font-medium">
              {tasks.total} total
              {tasks.overdue > 0 && (
                <span className="ml-2 text-destructive">
                  {tasks.overdue} overdue
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Tasks by status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {Object.entries(tasks.byStatus).map(([status, n]) => (
            <Badge key={status} variant="outline">
              {status} · {n}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Workload by person</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!tasks.byAssignee.length && (
            <p className="text-sm text-muted-foreground">
              No tasks yet. The team's Head of Department assigns tasks from
              their employee dashboard.
            </p>
          )}
          {tasks.byAssignee.map((a) => (
            <div key={a.assigneeUserId ?? a.assignee} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{a.assignee}</span>
                <span className="text-xs text-muted-foreground">
                  {a.done}/{a.total} done
                  {a.overdue > 0 && (
                    <span className="ml-2 text-destructive">
                      {a.overdue} overdue
                    </span>
                  )}
                </span>
              </div>
              <Progress
                value={a.total ? Math.round((a.done / a.total) * 100) : 0}
                className="h-1.5"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Communications · client thread {communications.clientThread.count}{" "}
            message{communications.clientThread.count === 1 ? "" : "s"}
            {communications.employeeThreads.length > 0 &&
              ` · ${communications.employeeThreads.length} team thread${communications.employeeThreads.length === 1 ? "" : "s"}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!communications.feed.length && (
            <p className="text-sm text-muted-foreground">
              No messages on this mandate yet.
            </p>
          )}
          {communications.feed.map((m, i) => (
            <div key={i} className="rounded border p-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {m.channel}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {when(m.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-xs font-medium">{m.author}</p>
              <p className="text-sm">{m.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
