import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Building2,
  TrendingUp,
  UserPlus,
  CalendarDays,
  Award,
  Loader2,
} from "lucide-react";
import { fetchHrOverview } from "@/lib/hr-api";

const perfTone = (score: number) =>
  score >= 80
    ? "border-emerald-500/40 text-emerald-600"
    : score >= 60
      ? "border-blue-500/40 text-blue-600"
      : "border-rose-500/40 text-rose-600";

export default function HROverview() {
  const { data, isLoading } = useQuery({
    queryKey: ["hr-overview"],
    queryFn: fetchHrOverview,
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading HR overview…</span>
      </div>
    );
  }

  const { departments, totals, topPerformingDepartment } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">HR Overview</h1>
        <p className="text-sm text-muted-foreground">
          Organization-wide pulse across departments — headcount, performance,
          and attendance.
        </p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Kpi
          label="Total headcount"
          value={totals.headcount}
          icon={Users}
          tone="from-primary to-secondary"
          sub={`${totals.departmentCount} departments`}
        />
        <Kpi
          label="Open roles"
          value={totals.openRoles}
          icon={UserPlus}
          tone="from-blue-500 to-cyan-500"
          sub="across the org"
        />
        <Kpi
          label="Avg performance"
          value={
            totals.avgPerformance != null
              ? `${totals.avgPerformance} / 100`
              : "—"
          }
          icon={Award}
          tone="from-emerald-500 to-teal-500"
          sub={`${totals.reviewsCompleted}/${totals.reviewsTotal} ever reviewed`}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Attendance today
              </p>
              <p className="text-xl font-bold">
                {totals.avgAttendance != null
                  ? `${totals.avgAttendance}%`
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Top performing dept
              </p>
              {topPerformingDepartment ? (
                <>
                  <p className="text-base font-semibold">
                    {topPerformingDepartment.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Score {topPerformingDepartment.avgPerformance} / 100
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No completed reviews yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Departments table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" />
            Departments
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {departments.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No departments set up yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="text-left px-5 py-2 font-medium">
                      Department
                    </th>
                    <th className="text-left px-5 py-2 font-medium">Head</th>
                    <th className="text-right px-5 py-2 font-medium">
                      Headcount
                    </th>
                    <th className="text-right px-5 py-2 font-medium">
                      Managers
                    </th>
                    <th className="text-right px-5 py-2 font-medium">
                      Open roles
                    </th>
                    <th className="text-right px-5 py-2 font-medium">
                      Avg perf.
                    </th>
                    <th className="text-right px-5 py-2 font-medium">
                      Attendance today
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((d) => (
                    <tr key={d.teamId} className="border-t">
                      <td className="px-5 py-3 font-medium">{d.name}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {d.head ?? "Unassigned"}
                      </td>
                      <td className="px-5 py-3 text-right">{d.headcount}</td>
                      <td className="px-5 py-3 text-right">{d.managers}</td>
                      <td className="px-5 py-3 text-right">
                        {d.openRoles > 0 ? (
                          <Badge
                            variant="outline"
                            className="border-amber-500/40 text-amber-600"
                          >
                            {d.openRoles}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {d.avgPerformance != null ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <Badge
                              variant="outline"
                              className={perfTone(d.avgPerformance)}
                            >
                              {d.avgPerformance}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {d.reviewsCompleted}/{d.reviewsTotal} reviewed
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No reviews yet
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {d.attendanceRate != null
                          ? `${d.attendanceRate}%`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
  sub,
}: {
  label: string;
  value: any;
  icon: any;
  tone: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-bold mt-1 truncate">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div
          className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center shrink-0`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
      </CardContent>
    </Card>
  );
}
