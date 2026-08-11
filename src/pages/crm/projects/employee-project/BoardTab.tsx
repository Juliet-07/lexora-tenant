import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchMandateBoardTasks } from "@/lib/crm/mandates-api";
import { TASK_STATUSES, type TaskPriority } from "@/lib/crm/tasks-api";

const priorityColor: Record<TaskPriority, string> = {
  Low: "bg-muted text-muted-foreground border-border",
  Medium: "bg-primary/10 text-primary border-primary/30",
  High: "bg-warning/10 text-warning border-warning/30",
  Critical: "bg-destructive/10 text-destructive border-destructive/30",
};

export function BoardTab({ mandateId }: { mandateId: string }) {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["mandateBoardTasks", mandateId],
    queryFn: () => fetchMandateBoardTasks(mandateId),
  });

  if (isLoading)
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Loading board…
      </p>
    );

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      {TASK_STATUSES.map((col) => (
        <Card key={col}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
              {col} · {tasks.filter((t) => t.status === col).length}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasks
              .filter((t) => t.status === col)
              .map((t) => (
                <div
                  key={t._id}
                  className="p-3 rounded-lg border bg-card text-xs space-y-1"
                >
                  <p className="font-medium text-sm">{t.title}</p>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>{t.assignee}</span>
                    <span>{t.dueDate?.slice(0, 10)}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={priorityColor[t.priority]}
                  >
                    {t.priority}
                  </Badge>
                </div>
              ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
