import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  FolderKanban,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  AlertCircle,
  ListChecks,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// ─────────────────────────────────────────────────────────────
// Team Member dashboard — scoped strictly to their workspace:
// assigned clients, assigned tasks/projects, announcements.
// No HR / admin actions here.
// ─────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────
// Team Member ("employee of the tenant") dashboard.
// Focused, task-oriented view: assigned clients, assigned projects/tasks,
// upcoming leave, learning, and quick actions. Mock data for now —
// endpoints can be wired in later.
// ─────────────────────────────────────────────────────────────

const assignedClients = [
  {
    id: "c-1",
    name: "Acme Holdings Ltd",
    status: "in_review",
    classification: "corporate",
    risk: "medium",
    nextAction: "Review EDD documents",
  },
  {
    id: "c-2",
    name: "Jane Smith",
    status: "pending",
    classification: "individual",
    risk: "low",
    nextAction: "Complete KYC verification",
  },
  {
    id: "c-3",
    name: "Bright Futures NGO",
    status: "active",
    classification: "corporate",
    risk: "low",
    nextAction: "Annual review due",
  },
];

const assignedTasks = [
  {
    id: "t-1",
    title: "Acme Holdings — Source of funds review",
    project: "Q2 KYC Refresh",
    due: "Today",
    priority: "high",
    status: "in_progress",
  },
  {
    id: "t-2",
    title: "Prepare STR draft for case #4421",
    project: "AML Investigations",
    due: "Tomorrow",
    priority: "high",
    status: "todo",
  },
  {
    id: "t-3",
    title: "Upload signed engagement letter",
    project: "Onboarding — Bright Futures",
    due: "Jun 12",
    priority: "medium",
    status: "todo",
  },
  {
    id: "t-4",
    title: "Quarterly compliance training",
    project: "Learning & Dev",
    due: "Jun 18",
    priority: "low",
    status: "todo",
  },
];

const announcements = [
  {
    id: "a-1",
    title: "Updated KYC policy v3.2 published",
    time: "2h ago",
  },
  {
    id: "a-2",
    title: "Office closed Monday — public holiday",
    time: "Yesterday",
  },
];

const priorityColor: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground border-border",
};

const statusColor: Record<string, string> = {
  in_progress: "bg-info/10 text-info",
  todo: "bg-muted text-muted-foreground",
  done: "bg-success/10 text-success",
  active: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  in_review: "bg-info/10 text-info",
};

export default function TeamMemberDashboard() {
  const { user } = useAuth();

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const openTasks = assignedTasks.filter((t) => t.status !== "done").length;
  const dueToday = assignedTasks.filter((t) => t.due === "Today").length;

  const stats = [
    {
      title: "My Clients",
      value: assignedClients.length,
      icon: Users,
      change: "Assigned to you",
      color: "text-primary",
    },
    {
      title: "Open Tasks",
      value: openTasks,
      icon: ListChecks,
      change: `${dueToday} due today`,
      color: "text-warning",
    },
    {
      title: "Projects",
      value: 3,
      icon: FolderKanban,
      change: "Active",
      color: "text-secondary",
    },
    {
      title: "Leave Balance",
      value: "12d",
      icon: CalendarDays,
      change: "Annual remaining",
      color: "text-success",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user?.firstName}</h1>
        <p className="text-muted-foreground text-sm">{today}</p>
        {user?.businessName && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {user.businessName}
          </p>
        )}
      </div>

      {/* Must change password notice */}
      {user?.mustChangePassword && (
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg text-sm bg-destructive/10 text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1 min-w-[200px]">
            You are required to change your password.
          </span>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/20"
          >
            <Link to="/settings?tab=security">Change password</Link>
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.title}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" />
                    {s.change}
                  </p>
                </div>
                <div className={`p-3 rounded-xl bg-accent ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              My Tasks
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/projects">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {assignedTasks.map((t) => (
              <div
                key={t.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="mt-1">
                  {t.status === "in_progress" ? (
                    <Clock className="h-4 w-4 text-info" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t.project} · Due {t.due}
                  </p>
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

        {/* Side column */}
        <div className="space-y-6">
          {/* Quick actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/hr/leave">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Request Leave
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/hr/attendance">
                  <Clock className="h-4 w-4 mr-2" />
                  Clock In / Out
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/hr/requisitions">
                  <ListChecks className="h-4 w-4 mr-2" />
                  New Requisition
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/hr/learning">
                  <GraduationCap className="h-4 w-4 mr-2" />
                  My Learning
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Announcements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="text-sm">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.time}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assigned clients */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            My Clients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {assignedClients.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-medium text-sm truncate">{c.name}</p>
                  <Badge
                    variant="outline"
                    className={`text-[10px] capitalize ${statusColor[c.status]}`}
                  >
                    {c.status.replace("_", " ")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground capitalize mb-2">
                  {c.classification} · Risk: {c.risk}
                </p>
                <p className="text-xs text-foreground/80 mb-3">
                  Next: {c.nextAction}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
