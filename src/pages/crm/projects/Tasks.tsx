import { useMemo, useState } from "react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Repeat, LayoutGrid } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CommentThread } from "@/components/crm/CommentThread";
import {
  pmTasks as seedTasks,
  PmTask,
  TaskStatus,
  TASK_STATUSES,
  taskTemplates,
  mandates,
  teamDirectory,
} from "@/data/crmPmMockData";

const priorityClass: Record<string, string> = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-primary/10 text-primary",
  High: "bg-warning/10 text-warning",
  Critical: "bg-destructive/10 text-destructive",
};

export default function Tasks() {
  const [list, setList] = useState<PmTask[]>(seedTasks);
  const [mandateFilter, setMandateFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [selected, setSelected] = useState<PmTask | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    mandateId: mandates[0].id,
    assignee: "Chris Evans",
    priority: "Medium" as PmTask["priority"],
    dueDate: "",
    estimateHrs: 4,
  });
  const { toast } = useToast();

  const filtered = useMemo(
    () =>
      list.filter(
        (t) =>
          (mandateFilter === "all" || t.mandateId === mandateFilter) &&
          (assigneeFilter === "all" || t.assignee === assigneeFilter),
      ),
    [list, mandateFilter, assigneeFilter],
  );

  const move = (id: string, status: TaskStatus) => {
    setList((p) => p.map((t) => (t.id === id ? { ...t, status } : t)));
    setSelected((s) => (s && s.id === id ? { ...s, status } : s));
  };

  const create = () => {
    if (!draft.title) return;
    const m = mandates.find((x) => x.id === draft.mandateId)!;
    setList([
      {
        id: `TSK-${String(list.length + 101).padStart(3, "0")}`,
        title: draft.title,
        mandateId: m.id,
        mandateName: m.name,
        assignee: draft.assignee,
        status: "Backlog",
        priority: draft.priority,
        dueDate: draft.dueDate || m.targetDate,
        estimateHrs: Number(draft.estimateHrs) || 0,
        loggedHrs: 0,
        phase: "Delivery",
      },
      ...list,
    ]);
    setOpenNew(false);
    setDraft({ ...draft, title: "" });
    toast({ title: "Task created", description: `Assigned to ${draft.assignee}` });
  };

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
              <SelectItem key={m.id} value={m.id}>
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
            {teamDirectory
              .filter((t) => t.mandates > 0)
              .map((t) => (
                <SelectItem key={t.name} value={t.name}>
                  {t.name}
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
                        key={t.id}
                        className="cursor-pointer transition hover:shadow-md"
                        onClick={() => setSelected(t)}
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
                            <span>{t.assignee}</span>
                            <span>{t.dueDate}</span>
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
                    <TableHead>Phase</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Hrs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow
                      key={t.id}
                      className="cursor-pointer"
                      onClick={() => setSelected(t)}
                    >
                      <TableCell className="text-sm font-medium">
                        {t.title}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {t.mandateName}
                      </TableCell>
                      <TableCell className="text-sm">{t.phase}</TableCell>
                      <TableCell className="text-sm">{t.assignee}</TableCell>
                      <TableCell>
                        <Badge className={priorityClass[t.priority]}>
                          {t.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{t.dueDate}</TableCell>
                      <TableCell className="text-right text-sm">
                        {t.loggedHrs}/{t.estimateHrs}
                      </TableCell>
                    </TableRow>
                  ))}
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
        <DialogContent>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Assignee</Label>
                <Select
                  value={draft.assignee}
                  onValueChange={(v) => setDraft({ ...draft, assignee: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teamDirectory
                      .filter((t) => t.mandates > 0)
                      .map((t) => (
                        <SelectItem key={t.name} value={t.name}>
                          {t.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={draft.priority}
                  onValueChange={(v) =>
                    setDraft({ ...draft, priority: v as PmTask["priority"] })
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
            <div className="grid grid-cols-2 gap-3">
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
          </div>
          <DialogFooter>
            <Button onClick={create}>Create task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
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
                      onValueChange={(v) => move(selected.id, v as TaskStatus)}
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
                    <p className="pt-2">{selected.assignee}</p>
                  </div>
                  <div>
                    <Label className="text-xs">Due</Label>
                    <p className="pt-2">{selected.dueDate}</p>
                  </div>
                  <div>
                    <Label className="text-xs">Time</Label>
                    <p className="pt-2">
                      {selected.loggedHrs} / {selected.estimateHrs} hrs
                    </p>
                  </div>
                </div>
                <CommentThread subject={selected.id} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
