import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Trash2, CalendarClock } from "lucide-react";
import { READINESS_DIMENSIONS } from "@/lib/grc/readiness-api";
import {
  addTaskComment,
  createTask,
  deleteTask,
  updateTask,
  type RemediationTask,
  type TaskStatus,
} from "@/lib/grc/readiness-workspace-api";
import {
  PRIORITY_LABEL,
  PRIORITY_TONE,
  Tile,
  fail,
  fmtDate,
  fmtDateTime,
  type TabProps,
} from "./shared";

const LANES: { key: TaskStatus; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In progress" },
  { key: "review", label: "Under review" },
  { key: "closed", label: "Completed" },
];

const AREAS = [...READINESS_DIMENSIONS, "Deal Materials", "General"];

function isOverdue(t: RemediationTask): boolean {
  return (
    t.status !== "closed" &&
    !!t.due &&
    new Date(t.due).getTime() < Date.now() - 86400000
  );
}

export function RemediationTab({ ws, onWorkspace }: TabProps) {
  const [edit, setEdit] = useState<string | "new" | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      updateTask(id, { status }),
    onSuccess: onWorkspace,
    onError: (e) => fail("Could not move the task", e),
  });

  const tasks = ws.tasks;
  const open = tasks.filter((t) => t.status !== "closed").length;
  const overdue = tasks.filter(isOverdue).length;
  const p1 = tasks.filter(
    (t) => t.status !== "closed" && t.priority === "P1",
  ).length;
  const editing =
    edit && edit !== "new" ? tasks.find((t) => t._id === edit) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-4">
          <Tile label="Total tasks" value={tasks.length} />
          <Tile label="Still open" value={open} tone="text-amber-600" />
          <Tile
            label="P1 outstanding"
            value={p1}
            tone={p1 ? "text-rose-600" : "text-emerald-600"}
          />
          <Tile
            label="Overdue"
            value={overdue}
            tone={overdue ? "text-rose-600" : "text-emerald-600"}
          />
        </div>
        <Button onClick={() => setEdit("new")}>
          <Plus className="mr-2 h-4 w-4" /> New task
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {LANES.map((lane) => {
          const cards = tasks.filter((t) => t.status === lane.key);
          return (
            <div
              key={lane.key}
              data-testid={`lane-${lane.key}`}
              className={`min-h-[200px] rounded-lg border bg-muted/30 p-3 ${
                dragId ? "border-dashed" : ""
              }`}
              onDragOver={(e) => dragId && e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const t = tasks.find((x) => x._id === dragId);
                setDragId(null);
                if (t && t.status !== lane.key) {
                  move.mutate({ id: t._id, status: lane.key });
                }
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold">{lane.label}</h4>
                <Badge variant="secondary">{cards.length}</Badge>
              </div>
              <div className="space-y-2">
                {cards.map((t) => (
                  <div
                    key={t._id}
                    role="button"
                    tabIndex={0}
                    draggable
                    onDragStart={() => setDragId(t._id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => setEdit(t._id)}
                    onKeyDown={(e) => e.key === "Enter" && setEdit(t._id)}
                    className="cursor-pointer rounded-md border bg-card p-3 text-left shadow-sm transition hover:border-primary/50"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${PRIORITY_TONE[t.priority]}`}
                      >
                        {t.priority}
                      </Badge>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {t.dimension}
                      </span>
                    </div>
                    <div className="text-sm font-medium leading-snug">
                      {t.title}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{t.owner || "Unassigned"}</span>
                      {t.due ? (
                        <span
                          className={`flex items-center gap-1 ${isOverdue(t) ? "font-semibold text-rose-600" : ""}`}
                        >
                          <CalendarClock className="h-3 w-3" />
                          {fmtDate(t.due)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
                {cards.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    Nothing here
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {edit ? (
        <TaskDialog
          key={edit}
          task={editing ?? undefined}
          onClose={() => setEdit(null)}
          onWorkspace={onWorkspace}
        />
      ) : null}
    </div>
  );
}

function TaskDialog({
  task,
  onClose,
  onWorkspace,
}: {
  task?: RemediationTask;
  onClose: () => void;
  onWorkspace: TabProps["onWorkspace"];
}) {
  const [f, setF] = useState({
    title: task?.title ?? "",
    dimension: task?.dimension ?? "General",
    priority: task?.priority ?? "P2",
    status: (task?.status ?? "open") as TaskStatus,
    owner: task?.owner ?? "",
    due: task?.due ? fmtDate(task.due) : "",
    description: task?.description ?? "",
  });
  const [comment, setComment] = useState("");

  const save = useMutation({
    mutationFn: () =>
      task
        ? updateTask(task._id, { ...f, due: f.due || null })
        : createTask({ ...f, due: f.due || undefined }),
    onSuccess: (w) => {
      onWorkspace(w);
      onClose();
    },
    onError: (e) => fail("Could not save the task", e),
  });
  const del = useMutation({
    mutationFn: () => deleteTask(task!._id),
    onSuccess: (w) => {
      onWorkspace(w);
      onClose();
    },
    onError: (e) => fail("Could not delete the task", e),
  });
  const addComment = useMutation({
    mutationFn: () => addTaskComment(task!._id, comment),
    onSuccess: (w) => {
      onWorkspace(w);
      setComment("");
    },
    onError: (e) => fail("Could not add the comment", e),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            Work needed to close a readiness gap.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Area</Label>
            <Select
              value={f.dimension}
              onValueChange={(v) => setF({ ...f, dimension: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AREAS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select
              value={f.priority}
              onValueChange={(v) => setF({ ...f, priority: v as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["P1", "P2", "P3"].map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-owner">Owner</Label>
            <Input
              id="task-owner"
              value={f.owner}
              onChange={(e) => setF({ ...f, owner: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-due">Due</Label>
            <Input
              id="task-due"
              type="date"
              value={f.due}
              onChange={(e) => setF({ ...f, due: e.target.value })}
            />
          </div>
          {task ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Status</Label>
              <Select
                value={f.status}
                onValueChange={(v) => setF({ ...f, status: v as TaskStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANES.map((l) => (
                    <SelectItem key={l.key} value={l.key}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
              className="min-h-[80px]"
            />
          </div>
        </div>

        {task ? (
          <div className="space-y-2 border-t pt-3">
            <h4 className="text-sm font-semibold">
              Comments ({task.comments.length})
            </h4>
            <div className="max-h-40 space-y-2 overflow-y-auto">
              {task.comments.map((c, i) => (
                <div key={i} className="rounded-md bg-muted/50 p-2 text-sm">
                  <div className="text-[11px] text-muted-foreground">
                    {c.by} · {fmtDateTime(c.at)}
                  </div>
                  {c.text}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a comment"
                aria-label="Add a comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && comment.trim() && addComment.mutate()
                }
              />
              <Button
                variant="outline"
                disabled={!comment.trim() || addComment.isPending}
                onClick={() => addComment.mutate()}
              >
                Post
              </Button>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          {task ? (
            <Button
              variant="ghost"
              className="text-rose-600"
              onClick={() => del.mutate()}
              disabled={del.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          ) : (
            <span />
          )}
          <Button
            onClick={() => save.mutate()}
            disabled={!f.title.trim() || save.isPending}
          >
            {task ? "Save" : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
