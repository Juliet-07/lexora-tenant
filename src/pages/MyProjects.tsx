import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  FolderKanban,
  Calendar,
  MessageSquare,
  Paperclip,
  Plus,
  Timer,
  Flag,
  Search,
} from "lucide-react";

// ──────────────────────────────────────────────────────────────
// Team-member projects flow.
// List → Detail with: Overview, My Tasks (kanban), All Tasks,
// Milestones, Time Log, Files, Activity / comments.
// All mock data — will be wired to API later.
// ──────────────────────────────────────────────────────────────

type TaskStatus = "todo" | "in_progress" | "review" | "done";
type Priority = "low" | "medium" | "high";

type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  due: string;
  assignee: string;
  mine: boolean;
};

type Milestone = {
  id: string;
  title: string;
  date: string;
  done: boolean;
};

type TimeLog = {
  id: string;
  date: string;
  hours: number;
  note: string;
};

type Activity = {
  id: string;
  who: string;
  what: string;
  when: string;
};

type FileItem = {
  id: string;
  name: string;
  size: string;
  uploadedBy: string;
  date: string;
};

type Project = {
  id: string;
  name: string;
  client: string;
  description: string;
  caseType: string;
  status: "Planning" | "In Progress" | "On Hold" | "Completed";
  progress: number;
  deadline: string;
  hoursLogged: number;
  hoursEstimated: number;
  team: string[];
  tasks: Task[];
  milestones: Milestone[];
  files: FileItem[];
  timeLogs: TimeLog[];
  activity: Activity[];
};

const PROJECTS: Project[] = [
  {
    id: "PRJ-001",
    name: "Q2 KYC Refresh — Acme Holdings",
    client: "Acme Holdings Ltd",
    description:
      "Refresh CDD documentation and re-screen UBOs against updated sanctions lists.",
    caseType: "Compliance",
    status: "In Progress",
    progress: 55,
    deadline: "2026-06-30",
    hoursLogged: 22,
    hoursEstimated: 60,
    team: ["You", "Sarah Chen", "Marcus Lee"],
    tasks: [
      {
        id: "t-1",
        title: "Source of funds review",
        status: "in_progress",
        priority: "high",
        due: "Today",
        assignee: "You",
        mine: true,
      },
      {
        id: "t-2",
        title: "Re-screen directors against OFAC",
        status: "todo",
        priority: "high",
        due: "Jun 12",
        assignee: "You",
        mine: true,
      },
      {
        id: "t-3",
        title: "Update beneficial owner registry",
        status: "review",
        priority: "medium",
        due: "Jun 15",
        assignee: "Sarah Chen",
        mine: false,
      },
      {
        id: "t-4",
        title: "Compile EDD memo",
        status: "done",
        priority: "medium",
        due: "Jun 02",
        assignee: "You",
        mine: true,
      },
    ],
    milestones: [
      { id: "m-1", title: "Kickoff", date: "2026-05-12", done: true },
      { id: "m-2", title: "Document collection", date: "2026-05-25", done: true },
      { id: "m-3", title: "Risk review", date: "2026-06-15", done: false },
      { id: "m-4", title: "Final sign-off", date: "2026-06-30", done: false },
    ],
    files: [
      {
        id: "f-1",
        name: "Acme_UBO_Register_v2.pdf",
        size: "1.2 MB",
        uploadedBy: "You",
        date: "2 days ago",
      },
      {
        id: "f-2",
        name: "SOF_Statements_Q1.xlsx",
        size: "340 KB",
        uploadedBy: "Sarah Chen",
        date: "5 days ago",
      },
    ],
    timeLogs: [
      { id: "tl-1", date: "2026-06-08", hours: 3.5, note: "EDD interview prep" },
      {
        id: "tl-2",
        date: "2026-06-07",
        hours: 2,
        note: "Document review — bank statements",
      },
    ],
    activity: [
      {
        id: "a-1",
        who: "You",
        what: "completed task “Compile EDD memo”",
        when: "2 days ago",
      },
      {
        id: "a-2",
        who: "Sarah Chen",
        what: "uploaded SOF_Statements_Q1.xlsx",
        when: "5 days ago",
      },
      {
        id: "a-3",
        who: "Marcus Lee",
        what: "created project",
        when: "May 12",
      },
    ],
  },
  {
    id: "PRJ-002",
    name: "Onboarding — Bright Futures NGO",
    client: "Bright Futures NGO",
    description: "New client onboarding and risk classification.",
    caseType: "Onboarding",
    status: "In Progress",
    progress: 30,
    deadline: "2026-06-22",
    hoursLogged: 8,
    hoursEstimated: 30,
    team: ["You", "Sarah Chen"],
    tasks: [
      {
        id: "t-1",
        title: "Collect registration documents",
        status: "done",
        priority: "medium",
        due: "Jun 05",
        assignee: "You",
        mine: true,
      },
      {
        id: "t-2",
        title: "Upload signed engagement letter",
        status: "in_progress",
        priority: "medium",
        due: "Jun 12",
        assignee: "You",
        mine: true,
      },
      {
        id: "t-3",
        title: "Initial risk classification",
        status: "todo",
        priority: "low",
        due: "Jun 18",
        assignee: "Sarah Chen",
        mine: false,
      },
    ],
    milestones: [
      { id: "m-1", title: "Documents received", date: "2026-06-05", done: true },
      {
        id: "m-2",
        title: "Engagement signed",
        date: "2026-06-12",
        done: false,
      },
      { id: "m-3", title: "Go-live", date: "2026-06-22", done: false },
    ],
    files: [
      {
        id: "f-1",
        name: "BrightFutures_Registration.pdf",
        size: "820 KB",
        uploadedBy: "You",
        date: "Yesterday",
      },
    ],
    timeLogs: [
      {
        id: "tl-1",
        date: "2026-06-08",
        hours: 1.5,
        note: "Engagement letter prep",
      },
    ],
    activity: [
      {
        id: "a-1",
        who: "You",
        what: "uploaded BrightFutures_Registration.pdf",
        when: "Yesterday",
      },
    ],
  },
  {
    id: "PRJ-003",
    name: "AML Investigations — Case #4421",
    client: "Vortex Trading Co.",
    description:
      "Investigation into unusual transaction patterns; prepare draft STR.",
    caseType: "AML Investigation",
    status: "Planning",
    progress: 15,
    deadline: "2026-07-05",
    hoursLogged: 4,
    hoursEstimated: 40,
    team: ["You", "Marcus Lee"],
    tasks: [
      {
        id: "t-1",
        title: "Pull 90-day transaction history",
        status: "in_progress",
        priority: "high",
        due: "Tomorrow",
        assignee: "You",
        mine: true,
      },
      {
        id: "t-2",
        title: "Prepare STR draft",
        status: "todo",
        priority: "high",
        due: "Jun 20",
        assignee: "You",
        mine: true,
      },
    ],
    milestones: [
      { id: "m-1", title: "Investigation start", date: "2026-06-05", done: true },
      { id: "m-2", title: "Draft STR", date: "2026-06-22", done: false },
      { id: "m-3", title: "Submit to FIU", date: "2026-07-05", done: false },
    ],
    files: [],
    timeLogs: [
      {
        id: "tl-1",
        date: "2026-06-06",
        hours: 4,
        note: "Initial case review",
      },
    ],
    activity: [
      {
        id: "a-1",
        who: "Marcus Lee",
        what: "assigned you to this project",
        when: "4 days ago",
      },
    ],
  },
];

const statusColor: Record<Project["status"], string> = {
  Planning: "bg-info/10 text-info",
  "In Progress": "bg-primary/10 text-primary",
  "On Hold": "bg-warning/10 text-warning",
  Completed: "bg-success/10 text-success",
};

const priorityColor: Record<Priority, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground border-border",
};

const taskStatusLabel: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  review: "In review",
  done: "Done",
};

// ──────────────────────────────────────────────────────────────
// List page
// ──────────────────────────────────────────────────────────────

export function MyProjectsList() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(
    () =>
      PROJECTS.filter((p) => {
        if (statusFilter !== "all" && p.status !== statusFilter) return false;
        if (
          query &&
          !`${p.name} ${p.client}`.toLowerCase().includes(query.toLowerCase())
        )
          return false;
        return true;
      }),
    [query, statusFilter],
  );

  const myOpenTasks = PROJECTS.reduce(
    (sum, p) => sum + p.tasks.filter((t) => t.mine && t.status !== "done").length,
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Projects</h1>
        <p className="text-sm text-muted-foreground">
          Projects assigned to you — track tasks, log hours, and stay on top of
          deadlines.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active projects" value={PROJECTS.length} icon={FolderKanban} tone="text-primary" />
        <StatCard label="My open tasks" value={myOpenTasks} icon={CheckCircle2} tone="text-warning" />
        <StatCard
          label="Hours logged"
          value={PROJECTS.reduce((s, p) => s + p.hoursLogged, 0)}
          icon={Timer}
          tone="text-info"
        />
        <StatCard
          label="Due this month"
          value={
            PROJECTS.filter((p) => p.deadline.startsWith("2026-06")).length
          }
          icon={Calendar}
          tone="text-secondary"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
            <CardTitle className="text-base">Projects</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects"
                  className="pl-9 w-64 h-9"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="Planning">Planning</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const myTasks = p.tasks.filter(
              (t) => t.mine && t.status !== "done",
            ).length;
            return (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="block rounded-lg border bg-card p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-medium text-sm">{p.name}</p>
                  <Badge className={`text-[10px] ${statusColor[p.status]}`}>
                    {p.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {p.client} · {p.id}
                </p>
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Progress value={p.progress} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground">
                      {p.progress}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {p.deadline}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {p.hoursLogged}/
                      {p.hoursEstimated}h
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {p.team.slice(0, 3).map((m) => (
                      <Avatar key={m} className="h-6 w-6 border-2 border-card">
                        <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary to-secondary text-white">
                          {m
                            .split(" ")
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  {myTasks > 0 && (
                    <Badge variant="outline" className="text-[10px]">
                      {myTasks} of yours open
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-full text-center text-sm text-muted-foreground py-8">
              No projects match your filters.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: any;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-xl bg-accent ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// Detail page
// ──────────────────────────────────────────────────────────────

export function MyProjectDetail() {
  const { id } = useParams();
  const initial = PROJECTS.find((p) => p.id === id);
  const { toast } = useToast();

  const [project, setProject] = useState<Project | undefined>(initial);
  const [comment, setComment] = useState("");
  const [logHours, setLogHours] = useState("");
  const [logNote, setLogNote] = useState("");
  const [logOpen, setLogOpen] = useState(false);

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Project not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/projects">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to projects
          </Link>
        </Button>
      </div>
    );
  }

  const myTasks = project.tasks.filter((t) => t.mine);
  const kanbanCols: TaskStatus[] = ["todo", "in_progress", "review", "done"];

  const moveTask = (taskId: string, status: TaskStatus) => {
    setProject((prev) =>
      prev
        ? {
            ...prev,
            tasks: prev.tasks.map((t) =>
              t.id === taskId ? { ...t, status } : t,
            ),
          }
        : prev,
    );
    toast({ title: "Task updated", description: taskStatusLabel[status] });
  };

  const submitTime = () => {
    const hours = Number(logHours);
    if (!hours || hours <= 0) return;
    setProject((prev) =>
      prev
        ? {
            ...prev,
            hoursLogged: prev.hoursLogged + hours,
            timeLogs: [
              {
                id: `tl-${prev.timeLogs.length + 1}`,
                date: new Date().toISOString().slice(0, 10),
                hours,
                note: logNote || "—",
              },
              ...prev.timeLogs,
            ],
          }
        : prev,
    );
    setLogHours("");
    setLogNote("");
    setLogOpen(false);
    toast({ title: "Time logged", description: `${hours}h added` });
  };

  const addComment = () => {
    if (!comment.trim()) return;
    setProject((prev) =>
      prev
        ? {
            ...prev,
            activity: [
              {
                id: `a-${prev.activity.length + 1}`,
                who: "You",
                what: `commented: “${comment}”`,
                when: "just now",
              },
              ...prev.activity,
            ],
          }
        : prev,
    );
    setComment("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold truncate">{project.name}</h1>
            <Badge className={statusColor[project.status]}>
              {project.status}
            </Badge>
            <Badge variant="outline">{project.caseType}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {project.client} · {project.id}
          </p>
        </div>
        <Dialog open={logOpen} onOpenChange={setLogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Timer className="h-4 w-4 mr-2" /> Log time
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log time on this project</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Hours</label>
                <Input
                  type="number"
                  step="0.25"
                  value={logHours}
                  onChange={(e) => setLogHours(e.target.value)}
                  placeholder="e.g. 1.5"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Note</label>
                <Textarea
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                  placeholder="What did you work on?"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitTime}>Save log</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">{project.description}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Progress</p>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={project.progress} className="h-2 flex-1" />
              <span className="font-bold text-sm">{project.progress}%</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Deadline</p>
            <p className="font-bold mt-1 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {project.deadline}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Hours</p>
            <p className="font-bold mt-1 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {project.hoursLogged} / {project.hoursEstimated}h
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Team</p>
            <div className="flex -space-x-2 mt-2">
              {project.team.map((m) => (
                <Avatar key={m} className="h-7 w-7 border-2 border-card">
                  <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary to-secondary text-white">
                    {m
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="my-tasks">
        <TabsList>
          <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="time">Time</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="my-tasks" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-2">
              {myTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30"
                >
                  <button
                    onClick={() =>
                      moveTask(t.id, t.status === "done" ? "todo" : "done")
                    }
                  >
                    {t.status === "done" ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}
                    >
                      {t.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Due {t.due} · {taskStatusLabel[t.status]}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] capitalize ${priorityColor[t.priority]}`}
                  >
                    <Flag className="h-3 w-3 mr-1" />
                    {t.priority}
                  </Badge>
                  <Select
                    value={t.status}
                    onValueChange={(v) => moveTask(t.id, v as TaskStatus)}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {kanbanCols.map((s) => (
                        <SelectItem key={s} value={s}>
                          {taskStatusLabel[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              {myTasks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  You have no tasks on this project.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="board" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {kanbanCols.map((col) => (
              <Card key={col}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                    {taskStatusLabel[col]} ·{" "}
                    {project.tasks.filter((t) => t.status === col).length}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {project.tasks
                    .filter((t) => t.status === col)
                    .map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-lg border bg-card text-xs space-y-1"
                      >
                        <p className="font-medium text-sm">{t.title}</p>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>{t.assignee}</span>
                          <span>{t.due}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize ${priorityColor[t.priority]}`}
                        >
                          {t.priority}
                        </Badge>
                      </div>
                    ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="milestones" className="mt-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              {project.milestones.map((m) => (
                <div key={m.id} className="flex items-center gap-4">
                  <div
                    className={`w-3 h-3 rounded-full shrink-0 ${m.done ? "bg-success" : "bg-muted-foreground/30"}`}
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <span
                      className={`text-sm ${m.done ? "font-medium" : "text-muted-foreground"}`}
                    >
                      {m.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {m.date}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-2">
              {project.timeLogs.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="text-sm font-medium">{l.note}</p>
                    <p className="text-xs text-muted-foreground">{l.date}</p>
                  </div>
                  <Badge variant="outline">{l.hours}h</Badge>
                </div>
              ))}
              {project.timeLogs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No time logged yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-2">
              {project.files.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.size} · {f.uploadedBy} · {f.date}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost">
                    Download
                  </Button>
                </div>
              ))}
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" /> Upload file
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Leave a comment or update..."
                />
                <div className="flex justify-end">
                  <Button size="sm" onClick={addComment}>
                    <MessageSquare className="h-4 w-4 mr-2" /> Post
                  </Button>
                </div>
              </div>
              <div className="space-y-3 pt-2 border-t">
                {project.activity.map((a) => (
                  <div key={a.id} className="flex items-start gap-3">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary to-secondary text-white">
                        {a.who
                          .split(" ")
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-sm">
                      <span className="font-medium">{a.who}</span>{" "}
                      <span className="text-muted-foreground">{a.what}</span>
                      <p className="text-xs text-muted-foreground">{a.when}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
