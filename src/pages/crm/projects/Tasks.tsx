import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Plus, Repeat, LayoutGrid, TriangleAlert, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchEmployees } from "@/lib/hr/hr-api";
import {
  fetchMandates,
  fetchEmployeeMessages,
  sendEmployeeMessage,
} from "@/lib/crm/mandates-api";
import {
  fetchTasks,
  createTask,
  updateTask,
  TASK_STATUSES,
  DEPENDENCY_TYPES,
  type Task,
  type TaskStatus,
  type TaskPriority,
  type DependencyType,
} from "@/lib/crm/tasks-api";
import { taskTemplates } from "@/data/crmPmMockData";

const priorityClass: Record<string, string> = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-primary/10 text-primary",
  High: "bg-warning/10 text-warning",
  Critical: "bg-destructive/10 text-destructive",
};

export default function Tasks() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => fetchTasks(),
  });
  const { data: mandates = [] } = useQuery({
    queryKey: ["mandates"],
    queryFn: fetchMandates,
  });

  const [mandateFilter, setMandateFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = list.find((t) => t._id === selectedId) ?? null;
  const [openNew, setOpenNew] = useState(false);

  const [draft, setDraft] = useState({
    title: "",
    mandateId: "",
    assignee: "",
    assigneeUserId: "",
    priority: "Medium" as TaskPriority,
    startDate: "",
    dueDate: "",
    estimateHrs: 4,
    parentTaskId: "",
    dependsOnTaskId: "",
    depType: "FS" as DependencyType,
    critical: false,
  });

  const draftMandate = mandates.find((m) => m._id === draft.mandateId);
  // Always offer real employees to assign to — a mandate having no
  // formal team shouldn't block picking a real person, same lesson
  // as the mandate-visibility fix.
  const { data: employeesPage } = useQuery({
    queryKey: ["hr-employees-all"],
    queryFn: () => fetchEmployees({ limit: 500 }),
    retry: false,
  });
  const eligibleAssignees = employeesPage?.items ?? [];

  const assigneeOptions = useMemo(
    () => Array.from(new Set(list.map((t) => t.assignee))).sort(),
    [list],
  );

  // Other tasks on the same mandate — the only sensible scope for a
  // parent task or a dependency.
  const mandateTaskOptions = useMemo(
    () => list.filter((t) => t.mandateId === draft.mandateId),
    [list, draft.mandateId],
  );

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const filtered = useMemo(
    () =>
      list.filter(
        (t) =>
          (mandateFilter === "all" || t.mandateId === mandateFilter) &&
          (assigneeFilter === "all" || t.assignee === assigneeFilter),
      ),
    [list, mandateFilter, assigneeFilter],
  );

  const createMut = useMutation({
    mutationFn: () =>
      createTask({
        title: draft.title,
        mandateId: draft.mandateId,
        assignee: draft.assignee,
        assigneeUserId: draft.assigneeUserId || undefined,
        priority: draft.priority,
        startDate: draft.startDate || undefined,
        dueDate: draft.dueDate || draftMandate!.targetDate,
        estimateHrs: Number(draft.estimateHrs) || 0,
        parentTaskId: draft.parentTaskId || undefined,
        dependsOnTaskId: draft.dependsOnTaskId || undefined,
        depType: draft.dependsOnTaskId ? draft.depType : undefined,
        critical: draft.critical || undefined,
      }),
    onSuccess: (t) => {
      invalidate();
      setOpenNew(false);
      setDraft({ ...draft, title: "" });
      toast({
        title: "Task created",
        description: `Assigned to ${t.assignee}`,
      });
    },
    onError: onErr("Failed to create task"),
  });

  const moveMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      updateTask(id, { status }),
    onSuccess: invalidate,
  });

  const reassignMut = useMutation({
    mutationFn: ({
      id,
      assigneeUserId,
      assignee,
    }: {
      id: string;
      assigneeUserId: string;
      assignee: string;
    }) => updateTask(id, { assigneeUserId, assignee }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Task reassigned" });
    },
    onError: onErr("Failed to reassign task"),
  });

  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Loading tasks…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            Delivery work inside the mandate lifecycle (Step 3 — Deliver)
          </p>
        </div>
        <Button onClick={() => setOpenNew(true)}>
          <Plus className="mr-2 h-4 w-4" /> New task
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={mandateFilter} onValueChange={setMandateFilter}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All mandates</SelectItem>
            {mandates.map((m) => (
              <SelectItem key={m._id} value={m._id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            {assigneeOptions.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board">
            <LayoutGrid className="mr-2 h-4 w-4" /> Kanban
          </TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="templates">Templates &amp; recurring</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="pt-4">
          <div className="grid gap-3 md:grid-cols-4">
            {TASK_STATUSES.map((s) => (
              <div key={s} className="rounded-lg bg-muted/40 p-2">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-sm font-semibold">{s}</span>
                  <Badge variant="secondary">
                    {filtered.filter((t) => t.status === s).length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {filtered
                    .filter((t) => t.status === s)
                    .map((t) => (
                      <Card
                        key={t._id}
                        className="cursor-pointer transition hover:shadow-md"
                        onClick={() => setSelectedId(t._id)}
                      >
                        <CardContent className="space-y-2 p-3">
                          <p className="text-sm font-medium">{t.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.mandateName}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge className={priorityClass[t.priority]}>
                              {t.priority}
                            </Badge>
                            {t.recurring && (
                              <Badge variant="outline" className="text-[10px]">
                                <Repeat className="mr-1 h-3 w-3" />
                                {t.recurring}
                              </Badge>
                            )}
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              {t.assignee}
                              {!t.assigneeUserId && (
                                <TriangleAlert
                                  className="h-3 w-3 text-warning"
                                  aria-label="Not linked to a real employee"
                                />
                              )}
                            </span>
                            <span>{t.dueDate?.slice(0, 10)}</span>
                          </div>
                          <Progress
                            value={
                              t.estimateHrs
                                ? Math.min(
                                    100,
                                    (t.loggedHrs / t.estimateHrs) * 100,
                                  )
                                : 0
                            }
                            className="h-1.5"
                          />
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="list" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Mandate</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow
                      key={t._id}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(t._id)}
                    >
                      <TableCell className="text-sm font-medium">
                        {t.title}
                      </TableCell>
                      <TableCell className="text-sm">{t.mandateName}</TableCell>
                      <TableCell className="text-sm">
                        <span className="inline-flex items-center gap-1.5">
                          {t.assignee}
                          {!t.assigneeUserId && (
                            <TriangleAlert
                              className="h-3.5 w-3.5 text-warning shrink-0"
                              aria-label="Not linked to a real employee"
                            />
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={priorityClass[t.priority]}>
                          {t.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {t.dueDate?.slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {t.loggedHrs}/{t.estimateHrs}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filtered.length && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No tasks match your filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="pt-4">
          <div className="grid gap-3 md:grid-cols-3">
            {taskTemplates.map((t) => (
              <Card key={t.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t.tasks} tasks
                    {"recurring" in t && t.recurring
                      ? ` · recurs ${String(t.recurring).toLowerCase()}`
                      : ""}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toast({
                        title: "Template applied",
                        description: `${t.tasks} tasks generated on the selected mandate.`,
                      })
                    }
                  >
                    Apply to mandate
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Title</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Mandate</Label>
              <Select
                value={draft.mandateId}
                onValueChange={(v) =>
                  setDraft({
                    ...draft,
                    mandateId: v,
                    assignee: "",
                    assigneeUserId: "",
                  })
                }
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Assignee</Label>
                {eligibleAssignees.length > 0 ? (
                  <Select
                    value={draft.assigneeUserId}
                    onValueChange={(v) => {
                      const e = eligibleAssignees.find((x) => x._id === v);
                      setDraft({
                        ...draft,
                        assigneeUserId: v,
                        assignee: e ? `${e.firstName} ${e.lastName}` : "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee..." />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleAssignees.map((e) => (
                        <SelectItem key={e._id} value={e._id}>
                          {e.firstName} {e.lastName}
                          {e.jobTitle ? ` · ${e.jobTitle}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Assignee name"
                    value={draft.assignee}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        assignee: e.target.value,
                        assigneeUserId: "",
                      })
                    }
                  />
                )}
              </div>
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
                    {["Low", "Medium", "High", "Critical"].map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
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
              <div>
                <Label>Estimate (hrs)</Label>
                <Input
                  type="number"
                  value={draft.estimateHrs}
                  onChange={(e) =>
                    setDraft({ ...draft, estimateHrs: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="space-y-3 rounded border p-3">
              <p className="text-xs font-medium text-muted-foreground">
                WBS &amp; scheduling (optional — powers Gantt &amp; Planning)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Parent task</Label>
                  <Select
                    value={draft.parentTaskId}
                    onValueChange={(v) =>
                      setDraft({ ...draft, parentTaskId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None (top level)" />
                    </SelectTrigger>
                    <SelectContent>
                      {mandateTaskOptions.map((t) => (
                        <SelectItem key={t._id} value={t._id}>
                          {t.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Depends on</Label>
                  <Select
                    value={draft.dependsOnTaskId}
                    onValueChange={(v) =>
                      setDraft({ ...draft, dependsOnTaskId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No dependency" />
                    </SelectTrigger>
                    <SelectContent>
                      {mandateTaskOptions.map((t) => (
                        <SelectItem key={t._id} value={t._id}>
                          {t.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {draft.dependsOnTaskId && (
                <div>
                  <Label>Dependency type</Label>
                  <Select
                    value={draft.depType}
                    onValueChange={(v) =>
                      setDraft({ ...draft, depType: v as DependencyType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPENDENCY_TYPES.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.critical}
                  onCheckedChange={(v) => setDraft({ ...draft, critical: !!v })}
                />
                On the critical path
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                createMut.isPending ||
                !draft.title ||
                !draft.mandateId ||
                !draft.assignee
              }
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? "Creating…" : "Create task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {selected.mandateName} · {selected.phase}
                </p>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={selected.status}
                      onValueChange={(v) =>
                        moveMut.mutate({
                          id: selected._id,
                          status: v as TaskStatus,
                        })
                      }
                    >
                      <SelectTrigger>
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
                  <div>
                    <Label className="text-xs">Assignee</Label>
                    <Select
                      value={selected.assigneeUserId ?? ""}
                      onValueChange={(v) => {
                        const e = eligibleAssignees.find((x) => x._id === v);
                        if (!e) return;
                        reassignMut.mutate({
                          id: selected._id,
                          assigneeUserId: v,
                          assignee: `${e.firstName} ${e.lastName}`,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={selected.assignee || "Unassigned"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {eligibleAssignees.map((e) => (
                          <SelectItem key={e._id} value={e._id}>
                            {e.firstName} {e.lastName}
                            {e.jobTitle ? ` · ${e.jobTitle}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!selected.assigneeUserId && (
                      <p className="mt-1 text-[11px] text-warning">
                        Shows "{selected.assignee}" but isn't linked to a real
                        employee — reassign here to fix it.
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Due</Label>
                    <p className="pt-2">{selected.dueDate?.slice(0, 10)}</p>
                  </div>
                  <div>
                    <Label className="text-xs">Time</Label>
                    <p className="pt-2">
                      {selected.loggedHrs} / {selected.estimateHrs} hrs
                    </p>
                  </div>
                </div>
                <TaskDiscussion
                  mandateId={selected.mandateId}
                  assigneeUserId={selected.assigneeUserId}
                  assignee={selected.assignee}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── Discussion (real — reuses the same tenant↔employee thread the
// Mandate's Collaboration tab shows). A task's discussion is just
// the ongoing conversation with whoever's assigned to it, scoped to
// this mandate — not a separate thread per task. Mentioning the same
// person from the Mandate workspace shows the identical messages.

function TaskDiscussion({
  mandateId,
  assigneeUserId,
  assignee,
}: {
  mandateId: string;
  assigneeUserId: string | null;
  assignee: string;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [text, setText] = useState("");

  const { data: thread = [], isLoading } = useQuery({
    queryKey: ["employeeMessages", mandateId, assigneeUserId],
    queryFn: () => fetchEmployeeMessages(mandateId, assigneeUserId as string),
    enabled: !!assigneeUserId,
  });

  const sendMut = useMutation({
    mutationFn: () =>
      sendEmployeeMessage(
        mandateId,
        assigneeUserId as string,
        "You",
        text.trim(),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["employeeMessages", mandateId, assigneeUserId],
      });
      setText("");
    },
    onError: (err: any) =>
      toast({
        title: "Failed to send",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  if (!assigneeUserId) {
    return (
      <div>
        <p className="mb-2 text-sm font-medium">Discussion</p>
        <p className="rounded border border-dashed p-3 text-xs text-muted-foreground">
          This task isn't linked to a real employee — reassign it above to
          enable discussion.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Discussion with {assignee}</p>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="max-h-72 space-y-3 overflow-y-auto rounded border p-3">
          {!thread.length && (
            <p className="text-sm text-muted-foreground">
              No messages yet — say hello.
            </p>
          )}
          {thread.map((m) => (
            <div
              key={m._id}
              className={`flex gap-2 ${m.direction === "tenant" ? "flex-row-reverse" : ""}`}
            >
              <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-muted text-xs font-medium">
                {m.author
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${m.direction === "tenant" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                <p className="mb-0.5 text-[11px] font-medium opacity-80">
                  {m.author}
                </p>
                <p>{m.body}</p>
                <p className="mt-1 text-[10px] opacity-70">
                  {new Date(m.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Message ${assignee}…`}
          className="min-h-[50px]"
        />
        <Button
          disabled={sendMut.isPending || !text.trim()}
          onClick={() => sendMut.mutate()}
          className="self-end"
        >
          <Send className="mr-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
