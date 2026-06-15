// import { useState } from "react";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Avatar, AvatarFallback } from "@/components/ui/avatar";
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import { Progress } from "@/components/ui/progress";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Clock, LogIn, LogOut, MapPin, Users, CalendarDays, TrendingUp } from "lucide-react";
// import { attendanceRecords as initial, type AttendanceRecord } from "@/data/hrMockData";
// import { useToast } from "@/hooks/use-toast";

// const statusColor = (s: AttendanceRecord["status"]) =>
//   s === "Present" || s === "Remote" ? "bg-success/10 text-success border-success/20"
//   : s === "Late" ? "bg-warning/10 text-warning border-warning/20"
//   : s === "Half-day" ? "bg-info/10 text-info border-info/20"
//   : s === "On Leave" ? "bg-muted text-muted-foreground border-border"
//   : "bg-destructive/10 text-destructive border-destructive/20";

// export default function HRAttendance() {
//   const [records, setRecords] = useState<AttendanceRecord[]>(initial);
//   const [clockedIn, setClockedIn] = useState(false);
//   const [shiftStart, setShiftStart] = useState<string | null>(null);
//   const { toast } = useToast();

//   const present = records.filter(r => r.status === "Present" || r.status === "Remote").length;
//   const late = records.filter(r => r.status === "Late").length;
//   const absent = records.filter(r => r.status === "Absent").length;
//   const onLeave = records.filter(r => r.status === "On Leave").length;
//   const avg = (records.reduce((s, r) => s + r.hoursWorked, 0) / Math.max(1, records.filter(r => r.hoursWorked > 0).length)).toFixed(1);

//   const clockIn = () => {
//     const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
//     setClockedIn(true); setShiftStart(now);
//     toast({ title: "Clocked in", description: `Shift started at ${now}.` });
//   };
//   const clockOut = () => {
//     const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
//     setClockedIn(false);
//     toast({ title: "Clocked out", description: `Shift ended at ${now}. Great work!` });
//   };

//   return (
//     <div className="space-y-6">
//       <div>
//         <h1 className="text-2xl font-bold">Time & Attendance</h1>
//         <p className="text-sm text-muted-foreground">Daily attendance, shifts and overtime — for {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.</p>
//       </div>

//       <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
//         <Stat label="Present" value={present} icon={Users} tone="from-emerald-500 to-teal-500" />
//         <Stat label="Late" value={late} icon={Clock} tone="from-amber-500 to-orange-500" />
//         <Stat label="Absent" value={absent} icon={Users} tone="from-rose-500 to-red-500" />
//         <Stat label="On Leave" value={onLeave} icon={CalendarDays} tone="from-violet-500 to-purple-600" />
//         <Stat label="Avg Hours" value={`${avg}h`} icon={TrendingUp} tone="from-blue-500 to-cyan-500" />
//       </div>

//       <Tabs defaultValue="today" className="space-y-4">
//         <TabsList><TabsTrigger value="today">Today's Log</TabsTrigger><TabsTrigger value="trends">Weekly Trends</TabsTrigger><TabsTrigger value="overtime">Overtime</TabsTrigger></TabsList>

//         <TabsContent value="today">
//           <Card><CardHeader><CardTitle className="text-base">Daily Attendance Log</CardTitle></CardHeader>
//             <CardContent className="space-y-2">
//               {records.map(r => (
//                 <div key={r.id} className="flex items-center justify-between gap-3 py-3 border-b last:border-b-0">
//                   <div className="flex items-center gap-3 min-w-0">
//                     <Avatar className="h-9 w-9"><AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs font-semibold">{r.employeeName.split(" ").map(n => n[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
//                     <div className="min-w-0"><p className="text-sm font-medium truncate">{r.employeeName}</p><p className="text-xs text-muted-foreground truncate">{r.location ?? "—"}</p></div>
//                   </div>
//                   <div className="hidden md:flex items-center gap-6 text-xs text-muted-foreground">
//                     <div><p>In</p><p className="font-mono text-sm text-foreground">{r.clockIn ?? "—"}</p></div>
//                     <div><p>Out</p><p className="font-mono text-sm text-foreground">{r.clockOut ?? "—"}</p></div>
//                     <div><p>Hours</p><p className="font-mono text-sm text-foreground">{r.hoursWorked.toFixed(1)}</p></div>
//                   </div>
//                   <Badge variant="outline" className={statusColor(r.status)}>{r.status}</Badge>
//                 </div>
//               ))}
//             </CardContent>
//           </Card>
//         </TabsContent>

//         <TabsContent value="trends">
//           <Card><CardHeader><CardTitle className="text-base">Last 7 Days · Attendance Rate</CardTitle></CardHeader>
//             <CardContent className="space-y-3">
//               {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d, i) => {
//                 const v = [96, 94, 98, 92, 95, 40, 30][i];
//                 return <div key={d}><div className="flex justify-between text-sm mb-1"><span>{d}</span><span className="font-medium">{v}%</span></div><Progress value={v} className="h-2" /></div>;
//               })}
//             </CardContent>
//           </Card>
//         </TabsContent>

//         <TabsContent value="overtime">
//           <Card><CardHeader><CardTitle className="text-base">Overtime — This Pay Period</CardTitle></CardHeader>
//             <CardContent className="space-y-3">
//               {[{ n: "Amelia Okonkwo", h: 12.5, rate: "1.5×" }, { n: "Liam Walsh", h: 8, rate: "1.5×" }, { n: "Marco Bianchi", h: 5.5, rate: "1.5×" }, { n: "Noah Petrov", h: 3, rate: "1.0×" }].map(o => (
//                 <div key={o.n} className="flex items-center justify-between border-b pb-2 last:border-b-0">
//                   <div><p className="text-sm font-medium">{o.n}</p><p className="text-xs text-muted-foreground">{o.rate} rate</p></div>
//                   <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">{o.h}h</Badge>
//                 </div>
//               ))}
//             </CardContent>
//           </Card>
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// }

// function Stat({ label, value, icon: Icon, tone }: { label: string; value: any; icon: any; tone: string }) {
//   return (
//     <Card><CardContent className="p-5 flex items-center justify-between">
//       <div><p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p><p className="text-2xl font-bold mt-1">{value}</p></div>
//       <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center`}><Icon className="h-5 w-5 text-white" /></div>
//     </CardContent></Card>
//   );
// }

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

// ─── Types ────────────────────────────────────────────────────

interface AttendanceLog {
  employeeId: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  department: string | null;
  clientId: string;
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
  const [clientFilter, setClientFilter] = useState("all");

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // ── Fetch today's attendance ──────────────────────────────
  const { data, isLoading } = useQuery<TodayAttendance>({
    queryKey: ["hr-attendance-today", clientFilter],
    queryFn: async () => {
      const params: any = {};
      if (clientFilter !== "all") params.clientId = clientFilter;
      const res = await api.get("/hr/attendance/today", { params });
      return res.data?.data ?? res.data;
    },
    staleTime: 60_000,
    refetchInterval: 2 * 60_000, // refresh every 2 mins
  });

  // ── Fetch weekly trends ───────────────────────────────────
  const { data: trends = [] } = useQuery<WeeklyTrend[]>({
    queryKey: ["hr-attendance-trends", clientFilter],
    queryFn: async () => {
      const params: any = {};
      if (clientFilter !== "all") params.clientId = clientFilter;
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
          Daily attendance, shifts and overtime — for {today}.
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
      {/* TODO: populate with real corporate clients once client list API is wired here */}

      {/* Tabs */}
      <Tabs defaultValue="today" className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">Today's Log</TabsTrigger>
          <TabsTrigger value="trends">Weekly Trends</TabsTrigger>
          <TabsTrigger value="overtime">Overtime</TabsTrigger>
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

                      {/* Name + location */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {emp.firstName} {emp.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          {emp.location ? (
                            <>
                              <MapPin className="h-3 w-3" /> {emp.location}
                            </>
                          ) : (
                            "—"
                          )}
                        </p>
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
        <TabsContent value="trends">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Weekly Attendance Trends
              </CardTitle>
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

        {/* Overtime — placeholder */}
        <TabsContent value="overtime">
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              Overtime tracking will be available once payroll module is
              configured.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
