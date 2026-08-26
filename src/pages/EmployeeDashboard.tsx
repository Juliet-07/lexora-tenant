import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  FolderKanban,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  AlertCircle,
  ListChecks,
  CalendarDays,
  Wallet,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { QuickClockCard } from "@/components/hr/QuickClockCard";
import { fetchMyTasks, fetchMyMandates } from "@/lib/crm/mandates-api";
import { fetchClients, displayName, toneFor } from "@/lib/client/clients-api";

// ─────────────────────────────────────────────────────────────
// Team Member ("employee of the tenant") dashboard. Scoped
// strictly to their own workspace: assigned clients (server-
// enforced, not a UI filter), assigned tasks across every
// project, and quick actions. No HR/admin actions here.
// ─────────────────────────────────────────────────────────────

const priorityColor: Record<string, string> = {
  Critical: "bg-destructive/10 text-destructive border-destructive/30",
  High: "bg-destructive/10 text-destructive border-destructive/30",
  Medium: "bg-warning/10 text-warning border-warning/30",
  Low: "bg-muted text-muted-foreground border-border",
};

const statusColor: Record<string, string> = {
  "In Progress": "bg-info/10 text-info",
  "In Review": "bg-info/10 text-info",
  Backlog: "bg-muted text-muted-foreground",
  Done: "bg-success/10 text-success",
};

const isThisWeek = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  return d >= weekAgo && d <= now;
};

export default function TeamMemberDashboard() {
  const { user } = useAuth();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["my-dashboard-tasks"],
    queryFn: () => fetchMyTasks(),
  });
  const { data: mandates = [], isLoading: mandatesLoading } = useQuery({
    queryKey: ["my-dashboard-mandates"],
    queryFn: fetchMyMandates,
  });
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["my-dashboard-clients"],
    queryFn: fetchClients,
  });

  const isLoading = tasksLoading || mandatesLoading || clientsLoading;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const openTasks = tasks.filter((t) => t.status !== "Done");
  const dueToday = openTasks.filter(
    (t) => new Date(t.dueDate).toDateString() === new Date().toDateString(),
  ).length;
  const completedThisWeek = tasks.filter(
    (t) => t.status === "Done" && isThisWeek(t.updatedAt),
  ).length;
  const upcomingTasks = [...openTasks]
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    )
    .slice(0, 6);

  const stats = [
    {
      title: "My Clients",
      value: clients.length,
      icon: Users,
      change: "Assigned to you",
      color: "text-primary",
    },
    {
      title: "Open Tasks",
      value: openTasks.length,
      icon: ListChecks,
      change: `${dueToday} due today`,
      color: "text-warning",
    },
    {
      title: "Projects",
      value: mandates.length,
      icon: FolderKanban,
      change: "Active",
      color: "text-secondary",
    },
    {
      title: "Completed",
      value: completedThisWeek,
      icon: CheckCircle2,
      change: "This week",
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
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[92px] w-full rounded-xl" />
            ))
          : stats.map((s) => (
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
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))
            ) : upcomingTasks.length ? (
              upcomingTasks.map((t) => (
                <Link
                  key={t._id}
                  to={`/projects/${t.mandateId}`}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="mt-1">
                    {t.status === "In Progress" || t.status === "In Review" ? (
                      <Clock className="h-4 w-4 text-info" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {t.mandateName} · Due{" "}
                      {new Date(t.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${priorityColor[t.priority]}`}
                  >
                    {t.priority}
                  </Badge>
                </Link>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No open tasks — you're all caught up.
              </p>
            )}
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
              <QuickClockCard />
              <Button
                asChild
                variant="outline"
                className="w-full justify-start"
              >
                <Link to="/my/leave">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Request Leave
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start"
              >
                <Link to="/my/performance">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  My Performance
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start"
              >
                <Link to="/my/payslips">
                  <Wallet className="h-4 w-4 mr-2" />
                  Payslips
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start"
              >
                <Link to="/clients">
                  <Users className="h-4 w-4 mr-2" />
                  My Clients
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start"
              >
                <Link to="/projects">
                  <FolderKanban className="h-4 w-4 mr-2" />
                  My Projects
                </Link>
              </Button>
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
          <Button asChild variant="ghost" size="sm">
            <Link to="/clients">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : clients.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {clients.slice(0, 6).map((c) => (
                <div
                  key={c._id}
                  className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-medium text-sm truncate">
                      {displayName(c)}
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${toneFor(c.status)}`}
                    >
                      {c.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">
                    {c.classifications} · Risk: {c.riskLevel ?? "unrated"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No clients assigned to you yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
