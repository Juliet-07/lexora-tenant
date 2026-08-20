import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  Package,
  Loader2,
  CalendarClock,
  ShieldCheck,
  Briefcase,
  Clock,
  Sparkles,
  FileText,
  Mail,
  Gauge,
  ListChecks,
  Activity,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useModule } from "@/contexts/ModuleContext";
import { timeEntries } from "@/data/mockData";
import { MotivationalQuote } from "@/components/dashboard/MotivationalQuote";

// ─── Trial banner ─────────────────────────────────────────────
function TrialBanner({
  trialEndsAt,
  plan,
}: {
  trialEndsAt: string | null;
  plan: string;
}) {
  if (!trialEndsAt || plan !== "free") return null;
  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    ),
  );
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
      <CalendarClock className="h-5 w-5 shrink-0" />
      <span className="min-w-[200px] flex-1">
        <strong>Free trial</strong> — {daysLeft} day{daysLeft !== 1 ? "s" : ""}{" "}
        remaining. Upgrade your plan to keep full access.
      </span>
      <Button
        asChild
        size="sm"
        variant="outline"
        className="border-warning/40 text-warning hover:bg-warning/20"
      >
        <Link to="/settings?tab=plan">Upgrade plan</Link>
      </Button>
    </div>
  );
}

const quickActions = [
  { label: "Clients", to: "/clients", icon: Users },
  { label: "Mandates", to: "/crm/mandates", icon: Briefcase },
  { label: "Tasks", to: "/crm/tasks", icon: ListChecks },
  { label: "Invoicing", to: "/crm/invoicing", icon: FileText },
  { label: "Newsletter", to: "/crm/newsletter", icon: Mail },
  { label: "Reports", to: "/crm/reports", icon: Gauge },
];

// ─── Component ────────────────────────────────────────────────
export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const { dashboardData, subscription, isLoadingDashboard, modules } =
    useModule();

  const now = new Date();
  const today = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  if (isLoadingDashboard) {
    return (
      <div className="flex h-64 items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading dashboard…</span>
      </div>
    );
  }

  const team = dashboardData?.team;
  const hr = dashboardData?.hr;
  const activeModules = subscription?.activeModules ?? [];
  const hasHrModule = activeModules.some(
    (m: string) => m === "hr_pm" || m === "hr",
  );

  // ── Stat cards ────────────────────────────────────────────
  const statCards = isAdmin
    ? [
        {
          title: "Team Members",
          value: team?.total ?? 0,
          icon: Users,
          change: `${team?.active ?? 0} active`,
          accent: "from-blue-500 to-cyan-500",
        },
        {
          title: "Active Modules",
          value: activeModules.length,
          icon: Package,
          change: subscription?.plan ? `${subscription.plan} plan` : "No plan",
          accent: "from-violet-500 to-purple-600",
        },
        {
          title: "Subscription",
          value: subscription?.status ?? "—",
          icon: ShieldCheck,
          change: subscription?.plan ?? "—",
          accent: "from-amber-500 to-orange-500",
        },
        ...(hasHrModule
          ? [
              {
                title: "Total Employees",
                value: hr?.totalEmployees ?? 0,
                icon: Briefcase,
                change: `${hr?.activeEmployees ?? 0} active`,
                accent: "from-emerald-500 to-teal-500",
              },
            ]
          : [
              {
                title: "Active",
                value: team?.active ?? 0,
                icon: CheckCircle2,
                change: "Online members",
                accent: "from-emerald-500 to-teal-500",
              },
            ]),
      ]
    : [
        {
          title: "Active Modules",
          value: activeModules.length,
          icon: Package,
          change: `${subscription?.plan ?? "—"} plan`,
          accent: "from-violet-500 to-purple-600",
        },
        {
          title: "Team Size",
          value: team?.total ?? 0,
          icon: Users,
          change: `${team?.active ?? 0} active`,
          accent: "from-blue-500 to-cyan-500",
        },
      ];

  // ── Time tracking rollup ──────────────────────────────────
  const fullName = user ? `${user.firstName} ${user.lastName}` : "";
  const visibleEntries = isAdmin
    ? timeEntries
    : timeEntries.filter((e) => e.teamMemberName === fullName);
  const totalHours = visibleEntries.reduce((s, e) => s + e.hours, 0);
  const billableHours = visibleEntries
    .filter((e) => e.billable)
    .reduce((s, e) => s + e.hours, 0);
  const revenue = visibleEntries
    .filter((e) => e.billable)
    .reduce((s, e) => s + e.hours * e.rate, 0);
  const utilisation = totalHours
    ? Math.round((billableHours / totalHours) * 100)
    : 0;
  const recentEntries = [...visibleEntries]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-secondary/10 p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {today}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              {greeting}, {user?.firstName}
            </h1>
            {user?.businessName && (
              <p className="mt-1 text-sm text-muted-foreground">
                {user.businessName}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {quickActions.map((a) => (
                <Button
                  key={a.label}
                  asChild
                  size="sm"
                  variant="outline"
                  className="bg-card/60"
                >
                  <Link to={a.to}>
                    <a.icon className="mr-2 h-3.5 w-3.5" />
                    {a.label}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
          <MotivationalQuote />
        </div>
      </section>

      <TrialBanner
        trialEndsAt={subscription?.trialEndsAt ?? null}
        plan={subscription?.plan ?? ""}
      />

      {user?.mustChangePassword && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="min-w-[200px] flex-1">
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

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card
            key={stat.title}
            className="relative overflow-hidden transition-shadow hover:shadow-lg"
          >
            <div
              className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${stat.accent}`}
            />
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="mt-1 text-2xl font-bold capitalize">
                    {stat.value}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <ArrowUpRight className="h-3 w-3" />
                    {stat.change}
                  </p>
                </div>
                <div
                  className={`rounded-xl bg-gradient-to-br ${stat.accent} p-3 text-white shadow-sm`}
                >
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Modules */}
        {modules.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4 text-primary" />
                Your workspace modules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {modules.map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <div
                      key={mod.id}
                      className="flex items-start gap-3 rounded-xl border bg-muted/20 p-3 transition-colors hover:bg-muted/40"
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${mod.color}`}
                      >
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{mod.shortName}</p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {mod.scope}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delivery pulse */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" />
              Delivery pulse
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link to="/crm/time">Tracker →</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-muted/30 p-2">
                <p className="text-[11px] text-muted-foreground">Hours</p>
                <p className="text-lg font-bold">{totalHours.toFixed(1)}</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-2">
                <p className="text-[11px] text-muted-foreground">Billable</p>
                <p className="text-lg font-bold">{billableHours.toFixed(1)}</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-2">
                <p className="text-[11px] text-muted-foreground">Revenue</p>
                <p className="text-lg font-bold">
                  ${Math.round(revenue).toLocaleString()}
                </p>
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Utilisation</span>
                <span className="font-medium">{utilisation}%</span>
              </div>
              <Progress value={utilisation} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentEntries.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No recent activity yet.
              </p>
            ) : (
              <div className="space-y-3">
                {recentEntries.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between border-b pb-2 text-sm last:border-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{e.projectName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {isAdmin ? `${e.teamMemberName} · ` : ""}
                        {e.description}
                      </p>
                    </div>
                    <div className="ml-3 shrink-0 text-right">
                      <p className="font-semibold">{e.hours}h</p>
                      <p className="text-[10px] text-muted-foreground">
                        {e.date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team overview — admin only */}
        {isAdmin && team ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Team composition</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {team.byRole?.length > 0 ? (
                <div className="space-y-2">
                  {team.byRole.map((r: { _id: string; count: number }) => (
                    <div
                      key={r._id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="capitalize text-muted-foreground">
                        {r._id.replace("tenant_", "").replace(/_/g, " ")}
                      </span>
                      <Badge variant="secondary">{r.count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No team members yet.
                </p>
              )}

              {team.recentMembers?.length > 0 && (
                <div className="space-y-3 border-t pt-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Recent members
                  </p>
                  {team.recentMembers.map((m) => (
                    <div key={m._id} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                        {m.firstName?.[0]}
                        {m.lastName?.[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {m.firstName} {m.lastName}
                        </p>
                        <p className="truncate text-xs capitalize text-muted-foreground">
                          {m.role?.replace("tenant_", "").replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Jump back in</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {quickActions.map((a) => (
                <Button
                  key={a.label}
                  asChild
                  variant="outline"
                  className="justify-start"
                >
                  <Link to={a.to}>
                    <a.icon className="mr-2 h-4 w-4" />
                    {a.label}
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
