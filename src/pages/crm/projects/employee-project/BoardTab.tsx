import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AssignTaskDialog } from "./AssignTaskDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  deleteTaskAsManager,
  fetchMandateBoardTasks,
} from "@/lib/crm/mandates-api";
import {
  TASK_STATUSES,
  type Task,
  type TaskPriority,
} from "@/lib/crm/tasks-api";

const priorityColor: Record<TaskPriority, string> = {
  Low: "bg-muted text-muted-foreground border-border",
  Medium: "bg-primary/10 text-primary border-primary/30",
  High: "bg-warning/10 text-warning border-warning/30",
  Critical: "bg-destructive/10 text-destructive border-destructive/30",
};

export function BoardTab({
  mandateId,
  isManager = false,
}: {
  mandateId: string;
  // The caller is this mandate's manager (its team's Head of Department):
  // they can assign, edit, reassign and remove tasks.
  isManager?: boolean;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["mandateBoardTasks", mandateId],
    queryFn: () => fetchMandateBoardTasks(mandateId),
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const delMut = useMutation({
    mutationFn: (taskId: string) => deleteTaskAsManager(mandateId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["mandateBoardTasks", mandateId],
      });
      toast({ title: "Task removed" });
    },
    onError: (err: any) =>
      toast({
        title: "Could not remove task",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  if (isLoading)
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Loading board…
      </p>
    );

  return (
    <div className="space-y-3">
      {isManager && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">
            You manage this mandate as Head of Department. Assign work to
            members of your team.
          </p>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Assign task
          </Button>
        </div>
      )}
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
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={priorityColor[t.priority]}
                      >
                        {t.priority}
                      </Badge>
                      {isManager && (
                        <span className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => {
                              setEditing(t);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive"
                            disabled={delMut.isPending}
                            onClick={() => {
                              if (window.confirm(`Remove task "${t.title}"?`))
                                delMut.mutate(t._id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        ))}
      </div>
      {isManager && (
        <AssignTaskDialog
          mandateId={mandateId}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          task={editing}
        />
      )}
    </div>
  );
}
