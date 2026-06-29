// HR Overview — tenant-level organizational summary across departments.
// Dummy data for now; wire to live HR APIs later.

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Building2,
  TrendingUp,
  TrendingDown,
  UserPlus,
  UserMinus,
  CalendarDays,
  Wallet,
  Award,
  AlertTriangle,
} from "lucide-react";

interface DepartmentSummary {
  name: string;
  head: string;
  headcount: number;
  managers: number;
  openRoles: number;
  avgPerformance: number; // 0 - 5
  attendanceRate: number; // %
  attritionRate: number; // %
  payrollMonthly: number; // RWF
  reviewsCompleted: number;
  reviewsTotal: number;
}

const DEPARTMENTS: DepartmentSummary[] = [
  { name: "Engineering", head: "Adaeze Nwosu", headcount: 42, managers: 5, openRoles: 4, avgPerformance: 4.3, attendanceRate: 96, attritionRate: 6, payrollMonthly: 38_500_000, reviewsCompleted: 38, reviewsTotal: 42 },
  { name: "Finance", head: "Tunde Bakare", headcount: 18, managers: 2, openRoles: 1, avgPerformance: 4.1, attendanceRate: 98, attritionRate: 3, payrollMonthly: 16_200_000, reviewsCompleted: 17, reviewsTotal: 18 },
  { name: "Operations", head: "Fatima Diallo", headcount: 27, managers: 3, openRoles: 2, avgPerformance: 3.9, attendanceRate: 94, attritionRate: 8, payrollMonthly: 19_800_000, reviewsCompleted: 21, reviewsTotal: 27 },
  { name: "Sales & Marketing", head: "Liam O'Connor", headcount: 22, managers: 3, openRoles: 3, avgPerformance: 4.0, attendanceRate: 92, attritionRate: 11, payrollMonthly: 17_400_000, reviewsCompleted: 18, reviewsTotal: 22 },
  { name: "People & Culture", head: "Chiamaka Eze", headcount: 9, managers: 1, openRoles: 0, avgPerformance: 4.4, attendanceRate: 97, attritionRate: 4, payrollMonthly: 7_300_000, reviewsCompleted: 9, reviewsTotal: 9 },
  { name: "Customer Support", head: "Priya Sharma", headcount: 15, managers: 2, openRoles: 2, avgPerformance: 3.8, attendanceRate: 93, attritionRate: 12, payrollMonthly: 9_100_000, reviewsCompleted: 11, reviewsTotal: 15 },
];

const fmtRWF = (n: number) =>
  new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", maximumFractionDigits: 0 }).format(n);

export default function HROverview() {
  const totals = useMemo(() => {
    const headcount = DEPARTMENTS.reduce((s, d) => s + d.headcount, 0);
    const openRoles = DEPARTMENTS.reduce((s, d) => s + d.openRoles, 0);
    const payroll = DEPARTMENTS.reduce((s, d) => s + d.payrollMonthly, 0);
    const reviewsDone = DEPARTMENTS.reduce((s, d) => s + d.reviewsCompleted, 0);
    const reviewsTotal = DEPARTMENTS.reduce((s, d) => s + d.reviewsTotal, 0);
    const avgPerf =
      DEPARTMENTS.reduce((s, d) => s + d.avgPerformance * d.headcount, 0) / headcount;
    const avgAttendance =
      DEPARTMENTS.reduce((s, d) => s + d.attendanceRate * d.headcount, 0) / headcount;
    const avgAttrition =
      DEPARTMENTS.reduce((s, d) => s + d.attritionRate * d.headcount, 0) / headcount;
    return { headcount, openRoles, payroll, reviewsDone, reviewsTotal, avgPerf, avgAttendance, avgAttrition };
  }, []);

  const topPerformer = [...DEPARTMENTS].sort((a, b) => b.avgPerformance - a.avgPerformance)[0];
  const highestAttrition = [...DEPARTMENTS].sort((a, b) => b.attritionRate - a.attritionRate)[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">HR Overview</h1>
        <p className="text-sm text-muted-foreground">
          Organization-wide pulse across departments — headcount, performance, attendance and payroll.
        </p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Total headcount" value={totals.headcount} icon={Users} tone="from-primary to-secondary" sub={`${DEPARTMENTS.length} departments`} />
        <Kpi label="Open roles" value={totals.openRoles} icon={UserPlus} tone="from-blue-500 to-cyan-500" sub="across the org" />
        <Kpi label="Avg performance" value={`${totals.avgPerf.toFixed(2)} / 5`} icon={Award} tone="from-emerald-500 to-teal-500" sub={`${totals.reviewsDone}/${totals.reviewsTotal} reviews done`} />
        <Kpi label="Monthly payroll" value={fmtRWF(totals.payroll)} icon={Wallet} tone="from-amber-500 to-orange-500" sub="gross, all departments" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg attendance</p>
              <p className="text-xl font-bold">{totals.avgAttendance.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Top performing dept</p>
              <p className="text-base font-semibold">{topPerformer.name}</p>
              <p className="text-xs text-muted-foreground">Score {topPerformer.avgPerformance.toFixed(2)} / 5</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Highest attrition</p>
              <p className="text-base font-semibold">{highestAttrition.name}</p>
              <p className="text-xs text-muted-foreground">{highestAttrition.attritionRate}% rolling 12-mo</p>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-2 font-medium">Department</th>
                  <th className="text-left px-5 py-2 font-medium">Head</th>
                  <th className="text-right px-5 py-2 font-medium">Headcount</th>
                  <th className="text-right px-5 py-2 font-medium">Managers</th>
                  <th className="text-right px-5 py-2 font-medium">Open roles</th>
                  <th className="text-right px-5 py-2 font-medium">Avg perf.</th>
                  <th className="text-right px-5 py-2 font-medium">Attendance</th>
                  <th className="text-right px-5 py-2 font-medium">Attrition</th>
                  <th className="px-5 py-2 font-medium w-[180px]">Reviews</th>
                </tr>
              </thead>
              <tbody>
                {DEPARTMENTS.map((d) => {
                  const reviewPct = Math.round((d.reviewsCompleted / d.reviewsTotal) * 100);
                  return (
                    <tr key={d.name} className="border-t">
                      <td className="px-5 py-3 font-medium">{d.name}</td>
                      <td className="px-5 py-3 text-muted-foreground">{d.head}</td>
                      <td className="px-5 py-3 text-right">{d.headcount}</td>
                      <td className="px-5 py-3 text-right">{d.managers}</td>
                      <td className="px-5 py-3 text-right">
                        {d.openRoles > 0 ? (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-600">
                            {d.openRoles}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Badge
                          variant="outline"
                          className={
                            d.avgPerformance >= 4.2
                              ? "border-emerald-500/40 text-emerald-600"
                              : d.avgPerformance >= 3.8
                                ? "border-blue-500/40 text-blue-600"
                                : "border-rose-500/40 text-rose-600"
                          }
                        >
                          {d.avgPerformance.toFixed(1)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right">{d.attendanceRate}%</td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={
                            d.attritionRate >= 10
                              ? "text-rose-600"
                              : d.attritionRate >= 7
                                ? "text-amber-600"
                                : "text-emerald-600"
                          }
                        >
                          {d.attritionRate}%
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Progress value={reviewPct} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground w-10 text-right">
                            {reviewPct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Alerts / call-outs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Things to watch
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {DEPARTMENTS.filter((d) => d.attritionRate >= 10).map((d) => (
            <div key={`a-${d.name}`} className="flex items-start gap-2">
              <UserMinus className="h-4 w-4 mt-0.5 text-rose-500" />
              <span>
                <strong>{d.name}</strong> attrition at {d.attritionRate}% — review retention plan with {d.head}.
              </span>
            </div>
          ))}
          {DEPARTMENTS.filter((d) => d.reviewsCompleted < d.reviewsTotal).map((d) => (
            <div key={`r-${d.name}`} className="flex items-start gap-2">
              <Award className="h-4 w-4 mt-0.5 text-amber-500" />
              <span>
                <strong>{d.name}</strong> has {d.reviewsTotal - d.reviewsCompleted} pending performance reviews this cycle.
              </span>
            </div>
          ))}
          {DEPARTMENTS.filter((d) => d.openRoles >= 3).map((d) => (
            <div key={`o-${d.name}`} className="flex items-start gap-2">
              <UserPlus className="h-4 w-4 mt-0.5 text-blue-500" />
              <span>
                <strong>{d.name}</strong> has {d.openRoles} open requisitions — coordinate with recruitment.
              </span>
            </div>
          ))}
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
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold mt-1 truncate">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center shrink-0`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </CardContent>
    </Card>
  );
}
