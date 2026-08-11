import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Circle, Flag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchMyTasks, updateMyTask } from "@/lib/crm/mandates-api";
import {
  TASK_STATUSES,
  type TaskStatus,
  type TaskPriority,
} from "@/lib/crm/tasks-api";

const priorityColor: Record<TaskPriority, string> = {
  Low: "bg-muted text-muted-foreground border-border",
  Medium: "bg-primary/10 text-primary border-primary/30",
  High: "bg-warning/10 text-warning border-warning/30",
  Critical: "bg-destructive/10 text-destructive border-destructive/30",
};

export function MyTasksTab({ mandateId }: { mandateId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["myTasks", mandateId],
    queryFn: () => fetchMyTasks(mandateId),
  });

  const moveMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      updateMyTask(id, { status }),
    onSuccess: (t) => {
      queryClient.invalidateQueries({ queryKey: ["myTasks", mandateId] });
      queryClient.invalidateQueries({
        queryKey: ["mandateBoardTasks", mandateId],
      });
      toast({ title: "Task updated", description: t.status });
    },
  });

  if (isLoading)
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Loading your tasks…
      </p>
    );

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        {tasks.map((t) => (
          <div
            key={t._id}
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30"
          >
            <button
              onClick={() =>
                moveMut.mutate({
                  id: t._id,
                  status: t.status === "Done" ? "Backlog" : "Done",
                })
              }
            >
              {t.status === "Done" ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium ${t.status === "Done" ? "line-through text-muted-foreground" : ""}`}
              >
                {t.title}
              </p>
              <p className="text-xs text-muted-foreground">
                Due {t.dueDate?.slice(0, 10)} · {t.status}
              </p>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] ${priorityColor[t.priority]}`}
            >
              <Flag className="h-3 w-3 mr-1" />
              {t.priority}
            </Badge>
            <Select
              value={t.status}
              onValueChange={(v) =>
                moveMut.mutate({ id: t._id, status: v as TaskStatus })
              }
            >
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        {!tasks.length && (
          <p className="text-sm text-muted-foreground text-center py-6">
            You have no tasks on this mandate.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
