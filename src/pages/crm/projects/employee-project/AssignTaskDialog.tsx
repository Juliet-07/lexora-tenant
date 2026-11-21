import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  createTaskAsManager,
  fetchManagerTeamMembers,
  updateTaskAsManager,
} from "@/lib/crm/mandates-api";
import type { Task, TaskPriority } from "@/lib/crm/tasks-api";

const PRIORITIES: TaskPriority[] = ["Low", "Medium", "High", "Critical"];

// Used by a mandate's manager (the team's Head of Department) to assign a
// task to a member of their team, or to edit / reassign an existing one.
export function AssignTaskDialog({
  mandateId,
  open,
  onOpenChange,
  task,
}: {
  mandateId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task?: Task | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const editing = !!task;

  const { data: members = [] } = useQuery({
    queryKey: ["managerTeamMembers", mandateId],
    queryFn: () => fetchManagerTeamMembers(mandateId),
    enabled: open,
  });

  const blank = {
    title: "",
    assigneeEmployeeId: "",
    priority: "Medium" as TaskPriority,
    startDate: "",
    dueDate: "",
    estimateHrs: 8,
  };
  const [draft, setDraft] = useState(blank);
  useEffect(() => {
    if (!open) return;
    setDraft(
      task
        ? {
            title: task.title,
            assigneeEmployeeId: task.assigneeUserId ?? "",
            priority: task.priority,
            startDate: task.startDate?.slice(0, 10) ?? "",
            dueDate: task.dueDate?.slice(0, 10) ?? "",
            estimateHrs: task.estimateHrs,
          }
        : blank,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task?._id]);

  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["mandateBoardTasks", mandateId],
    });
    queryClient.invalidateQueries({ queryKey: ["myTasks"] });
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = {
        title: draft.title.trim(),
        assigneeEmployeeId: draft.assigneeEmployeeId,
        priority: draft.priority,
        startDate: draft.startDate || undefined,
        dueDate: draft.dueDate,
        estimateHrs: Number(draft.estimateHrs) || 0,
      };
      return editing
        ? updateTaskAsManager(mandateId, task!._id, payload)
        : createTaskAsManager(mandateId, payload);
    },
    onSuccess: () => {
      refresh();
      toast({
        title: editing ? "Task updated" : "Task assigned",
        description: editing ? undefined : "The team member has been notified.",
      });
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast({
        title: "Could not save task",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const valid = draft.title.trim() && draft.assigneeEmployeeId && draft.dueDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit task" : "Assign a task"}</DialogTitle>
          <DialogDescription>
            Tasks can be assigned to members of this mandate's team.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Task</Label>
            <Input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </div>
          <div>
            <Label>Assign to</Label>
            <Select
              value={draft.assigneeEmployeeId}
              onValueChange={(v) =>
                setDraft({ ...draft, assigneeEmployeeId: v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team member..." />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m._id} value={m._id}>
                    {m.name}
                    {m.jobTitle ? ` — ${m.jobTitle}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <Select
                value={draft.priority}
                onValueChange={(v) =>
                  setDraft({ ...draft, priority: v as TaskPriority })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estimate (hrs)</Label>
              <Input
                type="number"
                min={0}
                value={draft.estimateHrs}
                onChange={(e) =>
                  setDraft({ ...draft, estimateHrs: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start date</Label>
              <Input
                type="date"
                value={draft.startDate}
                onChange={(e) =>
                  setDraft({ ...draft, startDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Due date</Label>
              <Input
                type="date"
                value={draft.dueDate}
                onChange={(e) =>
                  setDraft({ ...draft, dueDate: e.target.value })
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!valid || saveMut.isPending}
            onClick={() => saveMut.mutate()}
          >
            {saveMut.isPending
              ? "Saving…"
              : editing
                ? "Save changes"
                : "Assign task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
