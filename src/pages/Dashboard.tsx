import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, FolderKanban, DollarSign, AlertTriangle, CheckCircle2, ArrowUpRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { clients, tasks, complianceAlerts, recentActivity, revenueData } from "@/data/mockData";

const statCards = [
  { title: "Active Clients", value: clients.filter(c => c.status === "Active").length, icon: Users, change: "+3 this month", color: "text-primary" },
  { title: "Pending Approvals", value: clients.filter(c => c.status === "Pending" || c.status === "Under Review").length, icon: Clock, change: "2 urgent", color: "text-warning" },
  { title: "Open Projects", value: 5, icon: FolderKanban, change: "1 at risk", color: "text-secondary" },
  { title: "Revenue (Apr)", value: "$89,000", icon: DollarSign, change: "+12% vs last month", color: "text-success" },
];

const severityColor: Record<string, string> = {
  Critical: "bg-destructive text-destructive-foreground",
  High: "bg-warning text-warning-foreground",
  Medium: "bg-info text-info-foreground",
  Low: "bg-muted text-muted-foreground",
};

const priorityColor: Record<string, string> = {
  High: "text-destructive",
  Medium: "text-warning",
  Low: "text-muted-foreground",
};

const statusStyle: Record<string, string> = {
  Overdue: "bg-destructive/10 text-destructive",
  "Due Today": "bg-warning/10 text-warning",
  Upcoming: "bg-muted text-muted-foreground",
};

export default function Dashboard() {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, Sarah</h1>
        <p className="text-muted-foreground text-sm">{today}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `$${v/1000}k`} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className={`mt-0.5 ${priorityColor[task.priority]}`}>
                  {task.status === "Overdue" ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusStyle[task.status]}`}>{task.status}</Badge>
                    <span className="text-[10px] text-muted-foreground">{task.assignee}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Compliance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {complianceAlerts.filter(a => a.status !== "Resolved").map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${severityColor[alert.severity]}`}>{alert.severity}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{alert.clientName}</p>
                  <p className="text-xs text-muted-foreground truncate">{alert.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.map((act) => (
              <div key={act.id} className="flex items-start gap-3 p-2">
                <div className="mt-1 w-2 h-2 rounded-full bg-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{act.action}</p>
                  <p className="text-xs text-muted-foreground">{act.user} · {act.timestamp}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
