import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Clock,
  UserX,
  CalendarDays,
  TrendingUp,
  Loader2,
  MapPin,
} from "lucide-react";
import { api } from "@/lib/api";
import { fetchTeams, type HrTeam } from "@/lib/hr-api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────

interface AttendanceLog {
  employeeId: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  team: string | null;
  clockIn: string | null;
  clockOut: string | null;
  hoursWorked: number | null;
  breakMinutes: number;
  location: string | null;
  status: string;
}

interface TodayAttendance {
  date: string;
  stats: {
    present: number;
    late: number;
    remote: number;
    absent: number;
    onLeave: number;
    avgHours: number;
    total: number;
  };
  log: AttendanceLog[];
}

interface WeeklyTrend {
  date: string;
  present: number;
  late: number;
  remote: number;
  avgHours: number;
  total: number;
}

// ─── Helpers ──────────────────────────────────────────────────

const fmtTime = (d: string | null) =>
  d
    ? new Date(d).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

const fmtChartDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

const getInitials = (first: string, last: string) =>
  `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();

const STATUS_STYLE: Record<string, string> = {
  present: "bg-success/10 text-success border-success/20",
  late: "bg-warning/10 text-warning border-warning/20",
  remote: "bg-info/10 text-info border-info/20",
  absent: "bg-destructive/10 text-destructive border-destructive/20",
  on_leave: "bg-purple-100 text-purple-700 border-purple-200",
};

const STATUS_LABEL: Record<string, string> = {
  present: "Present",
  late: "Late",
  remote: "Remote",
  absent: "Absent",
  on_leave: "On Leave",
};

// ─── Stat Card ────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <div
          className={`h-12 w-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Component ────────────────────────────────────────────────

export default function HRAttendance() {
  const [teamFilter, setTeamFilter] = useState("all");

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // ── Teams, for the filter dropdown ────────────────────────
  const { data: teams = [] } = useQuery<HrTeam[]>({
    queryKey: ["hr-teams"],
    queryFn: fetchTeams,
    staleTime: 60_000,
  });

  // ── Fetch today's attendance ──────────────────────────────
  const { data, isLoading } = useQuery<TodayAttendance>({
    queryKey: ["hr-attendance-today", teamFilter],
    queryFn: async () => {
      const params: any = {};
      if (teamFilter !== "all") params.teamId = teamFilter;
      const res = await api.get("/hr/attendance/today", { params });
      return res.data?.data ?? res.data;
    },
    staleTime: 60_000,
    refetchInterval: 2 * 60_000, // refresh every 2 mins
  });

  // ── Fetch weekly trends ───────────────────────────────────
  const { data: trends = [] } = useQuery<WeeklyTrend[]>({
    queryKey: ["hr-attendance-trends", teamFilter],
    queryFn: async () => {
      const params: any = {};
      if (teamFilter !== "all") params.teamId = teamFilter;
      const res = await api.get("/hr/attendance/trends", { params });
      const d = res.data?.data ?? res.data;
      return Array.isArray(d) ? d : [];
    },
    staleTime: 5 * 60_000,
  });

  const stats = data?.stats;
  const log = data?.log ?? [];

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Time & Attendance</h1>
        <p className="text-sm text-muted-foreground">
          Daily attendance and shifts — for {today}.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Present"
          value={stats?.present ?? 0}
          icon={Users}
          color="from-emerald-500 to-teal-500"
        />
        <StatCard
          label="Late"
          value={stats?.late ?? 0}
          icon={Clock}
          color="from-amber-500 to-orange-500"
        />
        <StatCard
          label="Absent"
          value={stats?.absent ?? 0}
          icon={UserX}
          color="from-red-500 to-rose-500"
        />
        <StatCard
          label="On Leave"
          value={stats?.onLeave ?? 0}
          icon={CalendarDays}
          color="from-violet-500 to-purple-600"
        />
        <StatCard
          label="Avg Hours"
          value={stats ? `${stats.avgHours}h` : "—"}
          icon={TrendingUp}
          color="from-blue-500 to-cyan-500"
        />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teams</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t._id} value={t._id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="today" className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">Today's Log</TabsTrigger>
          <TabsTrigger value="trends">Weekly Trends</TabsTrigger>
        </TabsList>

        {/* Today's log */}
        <TabsContent value="today">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Daily Attendance Log</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-48 gap-3 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading attendance…</span>
                </div>
              ) : log.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">
                  No active employees found.
                </p>
              ) : (
                <div className="space-y-1">
                  {log.map((emp) => (
                    <div
                      key={emp.employeeId}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      {/* Avatar */}
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs font-semibold">
                          {getInitials(emp.firstName, emp.lastName)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Name + role/team + location */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {emp.firstName} {emp.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {emp.jobTitle}
                          {emp.team ? ` · ${emp.team}` : ""}
                        </p>
                        {emp.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" /> {emp.location}
                          </p>
                        )}
                      </div>

                      {/* Times */}
                      <div className="hidden md:flex items-center gap-8 text-xs text-muted-foreground">
                        <div className="text-center w-16">
                          <p>In</p>
                          <p className="font-mono text-sm text-foreground">
                            {fmtTime(emp.clockIn)}
                          </p>
                        </div>
                        <div className="text-center w-16">
                          <p>Out</p>
                          <p className="font-mono text-sm text-foreground">
                            {fmtTime(emp.clockOut)}
                          </p>
                        </div>
                        <div className="text-center w-16">
                          <p>Hours</p>
                          <p className="font-mono text-sm text-foreground">
                            {emp.hoursWorked != null
                              ? emp.hoursWorked.toFixed(1)
                              : emp.clockIn && !emp.clockOut
                                ? "live"
                                : "0.0"}
                          </p>
                        </div>
                      </div>

                      {/* Status badge */}
                      <Badge
                        variant="outline"
                        className={`shrink-0 ${STATUS_STYLE[emp.status] ?? ""}`}
                      >
                        {STATUS_LABEL[emp.status] ?? emp.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weekly trends */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Attendance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {trends.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">
                  No data for this week yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trends}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="opacity-30"
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={fmtChartDate}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} allowDecimals={false} />
                    <Tooltip
                      labelFormatter={(d) => fmtDate(d as string)}
                      formatter={(value: number, name: string) => [value, name]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="present"
                      stroke="#10b981"
                      name="Present"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="late"
                      stroke="#f59e0b"
                      name="Late"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="remote"
                      stroke="#3b82f6"
                      name="Remote"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgHours"
                      stroke="#8b5cf6"
                      name="Avg Hours"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Day-by-Day Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {trends.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">
                  No data for this week yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {trends.map((t) => (
                    <div
                      key={t.date}
                      className="flex items-center gap-4 p-3 rounded-lg border"
                    >
                      <div className="w-24 shrink-0">
                        <p className="text-sm font-medium">{fmtDate(t.date)}</p>
                      </div>
                      <div className="flex-1 flex items-center gap-6 text-xs text-muted-foreground">
                        <span className="text-success font-medium">
                          {t.present} present
                        </span>
                        {t.late > 0 && (
                          <span className="text-warning">{t.late} late</span>
                        )}
                        {t.remote > 0 && (
                          <span className="text-info">{t.remote} remote</span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-mono">{t.avgHours}h avg</p>
                        <p className="text-xs text-muted-foreground">
                          {t.total} total
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
