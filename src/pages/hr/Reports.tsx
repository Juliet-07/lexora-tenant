import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  FileBarChart,
  Globe,
  Accessibility,
  GraduationCap,
  FileText,
  Wallet,
  Gavel,
  ClipboardList,
  Award,
  Loader2,
} from "lucide-react";
import {
  fetchDemographicsReport,
  fetchPayrollPeriods,
  fetchPayrollReport,
  fetchDisputesReport,
  fetchEmployeeRecordsReport,
  fetchRequisitionsReport,
  fetchPerformanceReport,
  type DemographicRow,
} from "@/lib/hr/hr-reports-api";

export default function HRReports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">HR Reports</h1>
        <p className="text-sm text-muted-foreground">
          Real, live reporting across payroll, disputes, employee records,
          requisitions, performance, and workplace demographics.
        </p>
      </div>

      <Tabs defaultValue="demographics">
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="disputes">Disputes</TabsTrigger>
          <TabsTrigger value="records">Employee Records</TabsTrigger>
          <TabsTrigger value="requisitions">Requisitions</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="demographics" className="mt-4">
          <DemographicsTab />
        </TabsContent>
        <TabsContent value="payroll" className="mt-4">
          <PayrollTab />
        </TabsContent>
        <TabsContent value="disputes" className="mt-4">
          <DisputesTab />
        </TabsContent>
        <TabsContent value="records" className="mt-4">
          <RecordsTab />
        </TabsContent>
        <TabsContent value="requisitions" className="mt-4">
          <RequisitionsTab />
        </TabsContent>
        <TabsContent value="performance" className="mt-4">
          <PerformanceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">Loading…</span>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: any;
  icon: any;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div
          className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
      </CardContent>
    </Card>
  );
}

function DemoTable({
  rows,
  icon: Icon,
  title,
}: {
  rows: DemographicRow[];
  icon: any;
  title: string;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center gap-2 px-5 py-3 border-b">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        {rows.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-2 font-medium">Category</th>
                  <th className="text-right px-5 py-2 font-medium">Male</th>
                  <th className="text-right px-5 py-2 font-medium">Female</th>
                  <th className="text-right px-5 py-2 font-medium">Total</th>
                  <th className="text-right px-5 py-2 font-medium">% Share</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.category} className="border-t">
                    <td className="px-5 py-2">{r.category}</td>
                    <td className="px-5 py-2 text-right">{r.male}</td>
                    <td className="px-5 py-2 text-right">{r.female}</td>
                    <td className="px-5 py-2 text-right font-medium">
                      {r.total}
                    </td>
                    <td className="px-5 py-2 text-right">
                      <Badge variant="outline">{r.share}%</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CountTable({
  rows,
  title,
}: {
  rows: { category: string; count: number }[];
  title: string;
}) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-5 py-3 border-b">
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        {rows.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <div className="divide-y">
            {rows.map((r) => (
              <div
                key={r.category}
                className="flex items-center justify-between px-5 py-2 text-sm"
              >
                <span className="capitalize">
                  {r.category.replace(/_/g, " ")}
                </span>
                <span className="font-medium">
                  {r.count}{" "}
                  {total > 0 && (
                    <span className="text-muted-foreground text-xs">
                      ({Math.round((r.count / total) * 100)}%)
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Demographics (MIFOTRA) ──────────────────────────────────────

function DemographicsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["report-demographics"],
    queryFn: fetchDemographicsReport,
  });
  if (isLoading || !data) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Headcount"
          value={data.totalHeadcount}
          icon={Users}
          tone="from-primary to-secondary"
        />
        <Stat
          label="Male"
          value={`${data.totals.male} (${data.totalHeadcount > 0 ? Math.round((data.totals.male / data.totalHeadcount) * 100) : 0}%)`}
          icon={Users}
          tone="from-blue-500 to-cyan-500"
        />
        <Stat
          label="Female"
          value={`${data.totals.female} (${data.totalHeadcount > 0 ? Math.round((data.totals.female / data.totalHeadcount) * 100) : 0}%)`}
          icon={Users}
          tone="from-pink-500 to-rose-500"
        />
        <Stat
          label="With disability"
          value={data.totals.withDisability}
          icon={Accessibility}
          tone="from-amber-500 to-orange-500"
        />
      </div>

      <Tabs defaultValue="age">
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="age">Age Band</TabsTrigger>
          <TabsTrigger value="nationality">Nationality</TabsTrigger>
          <TabsTrigger value="contract">Contract Type</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="occupation">Occupation</TabsTrigger>
        </TabsList>
        <TabsContent value="age" className="mt-4">
          <DemoTable rows={data.age} icon={Users} title="Age distribution" />
        </TabsContent>
        <TabsContent value="nationality" className="mt-4">
          <DemoTable rows={data.nationality} icon={Globe} title="Nationality" />
        </TabsContent>
        <TabsContent value="contract" className="mt-4">
          <DemoTable
            rows={data.contractType}
            icon={FileText}
            title="Contract type"
          />
        </TabsContent>
        <TabsContent value="education" className="mt-4">
          <DemoTable
            rows={data.education}
            icon={GraduationCap}
            title="Education level"
          />
        </TabsContent>
        <TabsContent value="occupation" className="mt-4">
          <DemoTable
            rows={data.occupation}
            icon={FileBarChart}
            title="Occupational category"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Payroll ──────────────────────────────────────────────────────

function PayrollTab() {
  const [period, setPeriod] = useState<string | undefined>(undefined);
  const { data: periods = [] } = useQuery({
    queryKey: ["report-payroll-periods"],
    queryFn: fetchPayrollPeriods,
  });
  const { data, isLoading } = useQuery({
    queryKey: ["report-payroll", period],
    queryFn: () => fetchPayrollReport(period),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Period</span>
          <Select
            value={period ?? "latest"}
            onValueChange={(v) => setPeriod(v === "latest" ? undefined : v)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest run</SelectItem>
              {periods.map((p) => (
                <SelectItem key={p.periodLabel} value={p.periodLabel}>
                  {p.periodLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading || !data ? (
        <Loading />
      ) : !data.totals ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No payroll runs yet.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat
              label="Headcount"
              value={data.totals.headcount}
              icon={Users}
              tone="from-primary to-secondary"
            />
            <Stat
              label="Gross"
              value={`${data.currency} ${data.totals.totalGross.toLocaleString()}`}
              icon={Wallet}
              tone="from-emerald-500 to-teal-500"
            />
            <Stat
              label="Net"
              value={`${data.currency} ${data.totals.totalNet.toLocaleString()}`}
              icon={Wallet}
              tone="from-blue-500 to-cyan-500"
            />
            <Stat
              label="Deductions"
              value={`${data.currency} ${data.totals.totalDeductions.toLocaleString()}`}
              icon={Wallet}
              tone="from-amber-500 to-orange-500"
            />
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="px-5 py-3 border-b">
                <h3 className="font-semibold text-sm">
                  By department — {data.period}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="text-left px-5 py-2 font-medium">
                        Department
                      </th>
                      <th className="text-right px-5 py-2 font-medium">
                        Headcount
                      </th>
                      <th className="text-right px-5 py-2 font-medium">
                        Gross
                      </th>
                      <th className="text-right px-5 py-2 font-medium">Net</th>
                      <th className="text-right px-5 py-2 font-medium">
                        Deductions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byDepartment.map((d) => (
                      <tr key={d.department} className="border-t">
                        <td className="px-5 py-2 font-medium">
                          {d.department}
                        </td>
                        <td className="px-5 py-2 text-right">{d.headcount}</td>
                        <td className="px-5 py-2 text-right">
                          {d.gross.toLocaleString()}
                        </td>
                        <td className="px-5 py-2 text-right">
                          {d.net.toLocaleString()}
                        </td>
                        <td className="px-5 py-2 text-right">
                          {d.deductions.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Disputes ─────────────────────────────────────────────────────

function DisputesTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["report-disputes"],
    queryFn: fetchDisputesReport,
  });
  if (isLoading || !data) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Stat
          label="Total cases"
          value={data.total}
          icon={Gavel}
          tone="from-primary to-secondary"
        />
        <Stat
          label="Avg resolution"
          value={
            data.avgResolutionDays != null ? `${data.avgResolutionDays}d` : "—"
          }
          icon={Gavel}
          tone="from-blue-500 to-cyan-500"
        />
        <Stat
          label="Distinct outcomes"
          value={data.byOutcome.length}
          icon={Gavel}
          tone="from-amber-500 to-orange-500"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CountTable rows={data.byType} title="By type" />
        <CountTable rows={data.byStatus} title="By status" />
        <CountTable rows={data.byStage} title="By stage" />
        <CountTable rows={data.byOutcome} title="By outcome" />
      </div>
    </div>
  );
}

// ── Employee Records ─────────────────────────────────────────────

function RecordsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["report-records"],
    queryFn: fetchEmployeeRecordsReport,
  });
  if (isLoading || !data) return <Loading />;

  return (
    <div className="space-y-4">
      <Stat
        label="Total records"
        value={data.total}
        icon={ClipboardList}
        tone="from-primary to-secondary"
      />
      <CountTable rows={data.byType} title="By type" />
      <Card>
        <CardContent className="p-0">
          <div className="px-5 py-3 border-b">
            <h3 className="font-semibold text-sm">By department</h3>
          </div>
          {data.byDepartment.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <div className="divide-y">
              {data.byDepartment.map((d) => (
                <div key={d.department} className="px-5 py-3 text-sm">
                  <div className="flex justify-between font-medium mb-1">
                    <span>{d.department}</span>
                    <span>{d.total}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(d.counts).map(([type, count]) => (
                      <Badge
                        key={type}
                        variant="outline"
                        className="text-[10px] capitalize"
                      >
                        {type.replace(/_/g, " ")}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Requisitions ──────────────────────────────────────────────────

function RequisitionsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["report-requisitions"],
    queryFn: fetchRequisitionsReport,
  });
  if (isLoading || !data) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Total requests"
          value={data.total}
          icon={ClipboardList}
          tone="from-primary to-secondary"
        />
        <Stat
          label="Approval rate"
          value={data.approvalRate != null ? `${data.approvalRate}%` : "—"}
          icon={ClipboardList}
          tone="from-emerald-500 to-teal-500"
        />
        <Stat
          label="Avg review time"
          value={data.avgReviewDays != null ? `${data.avgReviewDays}d` : "—"}
          icon={ClipboardList}
          tone="from-blue-500 to-cyan-500"
        />
        <Stat
          label="Total requested"
          value={data.totalAmountRequested.toLocaleString()}
          icon={Wallet}
          tone="from-amber-500 to-orange-500"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CountTable rows={data.byStatus} title="By status" />
        <CountTable rows={data.byType} title="By type" />
        <CountTable rows={data.byPriority} title="By priority" />
      </div>
    </div>
  );
}

// ── Performance ───────────────────────────────────────────────────

function PerformanceTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["report-performance"],
    queryFn: fetchPerformanceReport,
  });
  if (isLoading || !data) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Stat
          label="Total employees"
          value={data.totalEmployees}
          icon={Users}
          tone="from-primary to-secondary"
        />
        <Stat
          label="Ever reviewed"
          value={data.everReviewed}
          icon={Award}
          tone="from-emerald-500 to-teal-500"
        />
        <Stat
          label="Rating bands"
          value={data.ratingBandDistribution.length}
          icon={Award}
          tone="from-amber-500 to-orange-500"
        />
      </div>
      <CountTable
        rows={data.ratingBandDistribution.map((b) => ({
          category: b.band,
          count: b.count,
        }))}
        title="Rating band distribution (latest review per employee)"
      />
      <Card>
        <CardContent className="p-0">
          <div className="px-5 py-3 border-b">
            <h3 className="font-semibold text-sm">By department</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-2 font-medium">
                    Department
                  </th>
                  <th className="text-right px-5 py-2 font-medium">Reviewed</th>
                  <th className="text-right px-5 py-2 font-medium">
                    Avg score
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.byDepartment.map((d) => (
                  <tr key={d.department} className="border-t">
                    <td className="px-5 py-2 font-medium">{d.department}</td>
                    <td className="px-5 py-2 text-right">{d.reviewed}</td>
                    <td className="px-5 py-2 text-right">
                      {d.avgScore != null ? `${d.avgScore}/100` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
