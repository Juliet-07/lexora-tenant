import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ShieldCheck,
  ClipboardList,
  Activity,
  AlertTriangle,
  Users,
  FileText,
  Clock,
} from "lucide-react";
import {
  fetchOperationalReport,
  fetchRiskAnalyticsReport,
  fetchRegulatoryDashboard,
  fetchTrendAnalysis,
  exportReport,
  type OperationalReport,
  type RiskAnalyticsReport,
  type RegulatoryDashboard,
  type TrendAnalysis,
} from "@/lib/kyc/kyc-api";
import { prettyLabel, toneFor } from "@/lib/client/clients-api";

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const RISK_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
  unrated: "#94a3b8",
};

const KYC_COLORS: Record<string, string> = {
  approved: "#22c55e",
  submitted: "#3b82f6",
  in_progress: "#a855f7",
  not_started: "#94a3b8",
  rejected: "#ef4444",
};

const monthLabel = (m: { year: number; month: number }) =>
  `${MONTHS[m.month - 1]} ${m.year}`;

// ─────────────────────────────────────────────────────────────
// STAT CARD — matches the style from other pages
// ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  change,
  sub,
  icon: Icon,
  color = "text-primary",
}: {
  label: string;
  value: string | number;
  change?: number | null;
  sub?: string;
  icon?: any;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            {change !== undefined && change !== null && (
              <div className="flex items-center gap-1 mt-1">
                {change >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-success" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <span
                  className={`text-xs font-medium ${change >= 0 ? "text-success" : "text-destructive"}`}
                >
                  {change >= 0 ? "+" : ""}
                  {change}%
                </span>
              </div>
            )}
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          {Icon && <Icon className={`h-6 w-6 opacity-40 shrink-0 ${color}`} />}
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// OPERATIONAL REPORTS TAB
// ─────────────────────────────────────────────────────────────

function OperationalTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports-operational"],
    queryFn: fetchOperationalReport,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const s = data?.summary;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Alerts Generated"
          value={s?.alertsGenerated.value ?? 0}
          change={s?.alertsGenerated.change}
          icon={AlertTriangle}
          color="text-destructive"
        />
        <StatCard
          label="Alerts Resolved"
          value={s?.alertsResolved.value ?? 0}
          change={s?.alertsResolved.change}
          icon={ShieldCheck}
          color="text-success"
        />
        <StatCard
          label="Cases (STRs) Created"
          value={s?.casesCreated.value ?? 0}
          change={s?.casesCreated.change}
          icon={FileText}
          color="text-primary"
        />
        <StatCard
          label="Cases Closed"
          value={s?.casesClosed.value ?? 0}
          icon={ClipboardList}
          color="text-info"
        />
        <StatCard
          label="STRs Filed to FIU"
          value={s?.strsFiled.value ?? 0}
          change={s?.strsFiled.change ?? undefined}
          icon={FileText}
          color="text-secondary"
        />
        <StatCard
          label="Avg Resolution Time"
          value={
            s?.avgResolutionDays.value != null
              ? `${s.avgResolutionDays.value} days`
              : "—"
          }
          icon={Clock}
          color="text-warning"
        />
      </div>

      {/* Daily alert trend — bar chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Alert Activity Trend (Last 30 Days)
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Live
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {(data?.dailyAlertTrend ?? []).length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
              No alert data for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data?.dailyAlertTrend ?? []} barSize={16}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-lg border bg-background p-2 text-xs shadow-md">
                        <p className="font-medium">{label}</p>
                        <p className="text-muted-foreground">
                          {payload[0]?.payload?.date}
                        </p>
                        <p className="text-primary font-semibold">
                          {payload[0]?.value} alerts
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={[3, 3, 0, 0]}
                  fill="url(#barGradient)"
                />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.9}
                    />
                    <stop
                      offset="100%"
                      stopColor="hsl(var(--secondary))"
                      stopOpacity={0.6}
                    />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RISK ANALYTICS TAB
// ─────────────────────────────────────────────────────────────

function RiskAnalyticsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports-risk"],
    queryFn: fetchRiskAnalyticsReport,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const s = data?.summary;
  const total = s?.totalClients ?? 0;
  const pieData = [
    { name: "Critical", value: s?.critical ?? 0, color: RISK_COLORS.critical },
    { name: "High", value: s?.high ?? 0, color: RISK_COLORS.high },
    { name: "Medium", value: s?.medium ?? 0, color: RISK_COLORS.medium },
    { name: "Low", value: s?.low ?? 0, color: RISK_COLORS.low },
    { name: "Unrated", value: s?.unrated ?? 0, color: RISK_COLORS.unrated },
  ].filter((d) => d.value > 0);

  const kycPie = (data?.kycStatusBreakdown ?? []).map((k) => ({
    name: prettyLabel(k._id),
    value: k.count,
    color: KYC_COLORS[k._id] ?? "#94a3b8",
  }));

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: "Critical",
            value: s?.critical ?? 0,
            color: "text-destructive",
          },
          { label: "High", value: s?.high ?? 0, color: "text-warning" },
          { label: "Medium", value: s?.medium ?? 0, color: "text-yellow-500" },
          { label: "Low", value: s?.low ?? 0, color: "text-success" },
          {
            label: "Unrated",
            value: s?.unrated ?? 0,
            color: "text-muted-foreground",
          },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label} Risk</p>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {total > 0
                  ? `${Math.round((value / total) * 100)}% of total`
                  : "—"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risk distribution pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                No risk data yet
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ value }) => value}
                    >
                      {pieData.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                  {pieData.map((d) => (
                    <div
                      key={d.name}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: d.color }}
                      />
                      {d.name} ({d.value})
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* KYC status pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">KYC Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {kycPie.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                No KYC data yet
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={kycPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ value }) => value}
                    >
                      {kycPie.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                  {kycPie.map((d) => (
                    <div
                      key={d.name}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: d.color }}
                      />
                      {d.name} ({d.value})
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Verification outcomes */}
      {(data?.verificationOutcomes ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Verification Outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Check</TableHead>
                  <TableHead>Flagged</TableHead>
                  <TableHead>Passed</TableHead>
                  <TableHead>Failed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.verificationOutcomes ?? []).map((v) => (
                  <TableRow key={v._id}>
                    <TableCell className="font-medium capitalize">
                      {prettyLabel(v._id)}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-destructive/10 text-destructive text-xs">
                        {v.flagged}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-success/10 text-success text-xs">
                        {v.passed}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-muted text-muted-foreground text-xs">
                        {v.failed}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* High risk clients */}
      {(data?.highRiskClients ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              High & Critical Risk Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>KYC Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.highRiskClients ?? []).map((c) => (
                  <TableRow key={c.clientId}>
                    <TableCell>
                      <p className="font-medium text-sm">{c.fullName}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize border ${toneFor(c.riskLevel)}`}
                      >
                        {prettyLabel(c.riskLevel)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${toneFor(c.kycStatus)}`}
                      >
                        {prettyLabel(c.kycStatus)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// REGULATORY DASHBOARD TAB
// ─────────────────────────────────────────────────────────────

function RegulatoryTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports-regulatory"],
    queryFn: fetchRegulatoryDashboard,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const str = data?.strSummary;
  const health = data?.complianceHealth;

  return (
    <div className="space-y-4">
      {/* STR stats */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          STR Status
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              label: "Draft",
              value: str?.draft ?? 0,
              color: "text-muted-foreground",
            },
            {
              label: "Pending Review",
              value: str?.pendingReview ?? 0,
              color: "text-warning",
            },
            {
              label: "Submitted",
              value: str?.submitted ?? 0,
              color: "text-success",
            },
            {
              label: "Acknowledged",
              value: str?.acknowledged ?? 0,
              color: "text-info",
            },
            { label: "Total", value: str?.total ?? 0, color: "text-primary" },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Compliance health */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Compliance Health
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Overdue Reviews",
              value: health?.overdueReviews ?? 0,
              color: "text-destructive",
              icon: Clock,
            },
            {
              label: "Sanctions Hits",
              value: health?.sanctionHits ?? 0,
              color: "text-destructive",
              icon: AlertTriangle,
            },
            {
              label: "PEP Matches",
              value: health?.pepHits ?? 0,
              color: "text-warning",
              icon: Users,
            },
            {
              label: "Open Alerts",
              value: health?.openAlerts ?? 0,
              color: "text-warning",
              icon: Activity,
            },
          ].map(({ label, value, color, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`text-3xl font-bold ${color}`}>{value}</p>
                  </div>
                  <Icon className={`h-6 w-6 opacity-40 ${color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Overdue reviews */}
      {(data?.overdueReviews ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              Clients Overdue for Periodic Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Last Reviewed</TableHead>
                  <TableHead>Days Overdue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.overdueReviews ?? []).map((c) => {
                  const daysAgo = Math.floor(
                    (Date.now() - new Date(c.kycCompletedAt).getTime()) /
                      (1000 * 60 * 60 * 24),
                  );
                  return (
                    <TableRow key={c.clientId}>
                      <TableCell>
                        <p className="font-medium text-sm">{c.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.email}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize ${toneFor(c.riskLevel)}`}
                        >
                          {prettyLabel(c.riskLevel)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(c.kycCompletedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-destructive/10 text-destructive border-destructive/20 text-xs"
                        >
                          {daysAgo - 180}d overdue
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent STRs */}
      {(data?.recentStrs ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent STR Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>STR ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Filed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.recentStrs ?? []).map((s: any) => {
                  const client =
                    typeof s.clientId === "object" ? s.clientId : null;
                  return (
                    <TableRow key={s._id}>
                      <TableCell className="font-mono text-xs">
                        {s.strId}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {client
                          ? `${client.firstName} ${client.lastName}`
                          : s.customerName}
                      </TableCell>
                      <TableCell className="font-semibold text-sm">
                        {s.currency} {s.amount?.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize ${
                            s.status === "submitted" ||
                            s.status === "acknowledged"
                              ? "bg-success/10 text-success border-success/20"
                              : s.status === "pending_review"
                                ? "bg-warning/10 text-warning border-warning/20"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {prettyLabel(s.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TREND ANALYSIS TAB
// ─────────────────────────────────────────────────────────────

function TrendAnalysisTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports-trends"],
    queryFn: fetchTrendAnalysis,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  const clientGrowthData = (data?.clientGrowth ?? []).map((d) => ({
    month: monthLabel(d._id),
    count: d.count,
  }));

  const alertTrendData = (data?.alertTrend ?? []).map((d) => ({
    month: monthLabel(d._id),
    total: d.total,
    resolved: d.resolved,
  }));

  const txTrendData = (data?.txVolumeTrend ?? []).map((d) => ({
    month: monthLabel(d._id),
    total: d.count,
    flagged: d.flagged,
    amount: Math.round(d.totalAmount / 1000), // in thousands
  }));

  const funnelData = (data?.onboardingFunnel ?? []).map((d) => ({
    stage: prettyLabel(d._id),
    count: d.count,
    color: KYC_COLORS[d._id] ?? "#94a3b8",
  }));

  return (
    <div className="space-y-4">
      {/* Client growth */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Client Growth (Last 6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clientGrowthData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              No client data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={clientGrowthData} barSize={32}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  fill="hsl(var(--primary))"
                  name="New Clients"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alert trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Alert Volume vs Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alertTrendData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                No alert data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={alertTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Generated"
                  />
                  <Line
                    type="monotone"
                    dataKey="resolved"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Resolved"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Onboarding funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Onboarding Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            {funnelData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                No onboarding data yet
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {funnelData
                  .sort((a, b) => b.count - a.count)
                  .map((d) => {
                    const max = Math.max(...funnelData.map((f) => f.count), 1);
                    const pct = Math.round((d.count / max) * 100);
                    return (
                      <div key={d.stage} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">{d.stage}</span>
                          <span className="text-muted-foreground">
                            {d.count}
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: d.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction volume */}
      {txTrendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Transaction Volume (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={txTrendData} barSize={24}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="total"
                  radius={[3, 3, 0, 0]}
                  fill="hsl(var(--primary))"
                  name="Total"
                />
                <Bar
                  dataKey="flagged"
                  radius={[3, 3, 0, 0]}
                  fill="hsl(var(--destructive))"
                  name="Flagged"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────

export default function Reports() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("operational");

  const exportMap: Record<
    string,
    "operational" | "risk" | "regulatory" | "trends"
  > = {
    operational: "operational",
    risk: "risk",
    regulatory: "regulatory",
    trends: "trends",
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["reports-operational"] });
    qc.invalidateQueries({ queryKey: ["reports-risk"] });
    qc.invalidateQueries({ queryKey: ["reports-regulatory"] });
    qc.invalidateQueries({ queryKey: ["reports-trends"] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Reporting & Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Comprehensive insights for FIU compliance and audit purposes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={invalidate}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            className="bg-gradient-to-r from-primary to-secondary"
            onClick={() => exportReport(exportMap[tab] ?? "operational")}
          >
            <Download className="h-4 w-4 mr-2" /> Export Report
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full lg:w-auto lg:inline-flex">
          <TabsTrigger value="operational" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Operational Reports</span>
            <span className="sm:hidden">Ops</span>
          </TabsTrigger>
          <TabsTrigger value="risk" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Risk Analytics</span>
            <span className="sm:hidden">Risk</span>
          </TabsTrigger>
          <TabsTrigger value="regulatory" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Regulatory Dashboard</span>
            <span className="sm:hidden">Reg</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Trend Analysis</span>
            <span className="sm:hidden">Trends</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operational" className="mt-4">
          <OperationalTab />
        </TabsContent>
        <TabsContent value="risk" className="mt-4">
          <RiskAnalyticsTab />
        </TabsContent>
        <TabsContent value="regulatory" className="mt-4">
          <RegulatoryTab />
        </TabsContent>
        <TabsContent value="trends" className="mt-4">
          <TrendAnalysisTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
