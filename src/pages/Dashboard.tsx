import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Clock,
  FolderKanban,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  Package,
  Loader2,
  CalendarClock,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useModule } from "@/contexts/ModuleContext";

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
    <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30 text-warning text-sm">
      <CalendarClock className="h-5 w-5 shrink-0" />
      <span className="flex-1 min-w-[200px]">
        <strong>Free trial</strong> — {daysLeft} day{daysLeft !== 1 ? "s" : ""}{" "}
        remaining. Upgrade your plan to keep full access.
      </span>
      <Button asChild size="sm" variant="outline" className="border-warning/40 text-warning hover:bg-warning/20">
        <Link to="/settings?tab=plan">Upgrade plan</Link>
      </Button>
    </div>
  );
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const { dashboardData, subscription, isLoadingDashboard, modules } =
    useModule();

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (isLoadingDashboard) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading dashboard…</span>
      </div>
    );
  }

  const team = dashboardData?.team;
  const activeModules = subscription?.activeModules ?? [];

  // ── Stat cards — built from real data ──────────────────────
  const statCards = isAdmin
    ? [
        {
          title: "Team Members",
          value: team?.total ?? 0,
          icon: Users,
          change: `${team?.active ?? 0} active`,
          color: "text-primary",
        },
        {
          title: "Active",
          value: team?.active ?? 0,
          icon: CheckCircle2,
          change: "Online members",
          color: "text-success",
        },
        {
          title: "Active Modules",
          value: activeModules.length,
          icon: Package,
          change: subscription?.plan ? `${subscription.plan} plan` : "No plan",
          color: "text-secondary",
        },
        {
          title: "Subscription",
          value: subscription?.status ?? "—",
          icon: ShieldCheck,
          change: subscription?.plan ?? "—",
          color: "text-info",
        },
      ]
    : [
        {
          title: "Active Modules",
          value: activeModules.length,
          icon: Package,
          change: `${subscription?.plan ?? "—"} plan`,
          color: "text-primary",
        },
        {
          title: "Team Size",
          value: team?.total ?? 0,
          icon: Users,
          change: `${team?.active ?? 0} active`,
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

      {/* Trial banner */}
      <TrialBanner
        trialEndsAt={subscription?.trialEndsAt ?? null}
        plan={subscription?.plan ?? ""}
      />

      {/* Must change password notice */}
      {user?.mustChangePassword && (
        <div className="flex items-center gap-2 p-3 rounded-lg text-sm bg-destructive/10 text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          You are required to change your password. Go to Settings → Security.
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1 capitalize">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" />
                    {stat.change}
                  </p>
                </div>
                <div className={`p-3 rounded-xl bg-accent ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active modules grid */}
      {activeModules.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Your Active Modules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {modules.map((mod) => {
                const Icon = mod.icon;
                return (
                  <div
                    key={mod.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg bg-gradient-to-br ${mod.color} flex items-center justify-center shrink-0`}
                    >
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {mod.shortName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
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

      {/* Team overview — admin only */}
      {isAdmin && team && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Role breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Team by Role</CardTitle>
            </CardHeader>
            <CardContent>
              {team.byRole?.length > 0 ? (
                <div className="space-y-2">
                  {team.byRole.map((r: { _id: string; count: number }) => (
                    <div
                      key={r._id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="capitalize text-muted-foreground">
                        {r._id.replace("tenant_", "").replace("_", " ")}
                      </span>
                      <Badge variant="secondary">{r.count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No team members yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent members */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent Members</CardTitle>
            </CardHeader>
            <CardContent>
              {team.recentMembers?.length > 0 ? (
                <div className="space-y-3">
                  {team.recentMembers.map((m: any) => (
                    <div key={m._id} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {m.firstName?.[0]}
                        {m.lastName?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {m.firstName} {m.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {m.email}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] capitalize shrink-0"
                      >
                        {m.roles?.[0]?.replace("tenant_", "")}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No team members yet. Invite your first member.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
