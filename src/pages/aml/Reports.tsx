import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart3,
  Target,
  ClipboardList,
  LineChart as LineChartIcon,
  Download,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ---------- mock data (themed for Lexora, FIU-agnostic) ----------
const alertTrend = Array.from({ length: 30 }).map((_, i) => ({
  d: `D${i + 1}`,
  v: 18 + Math.round(Math.sin(i / 3) * 6 + i * 0.6 + Math.random() * 5),
}));

const analysts = [
  { name: "Ruvimbo Nyathi", handled: 45, closed: 38, avg: "2.8 days" },
  { name: "Tapiwa Mpofu", handled: 42, closed: 35, avg: "3.1 days" },
  { name: "Tendai Chikwanha", handled: 38, closed: 32, avg: "3.4 days" },
  { name: "Chipo Mutasa", handled: 35, closed: 30, avg: "3.0 days" },
];

const opsKpis = [
  { label: "Alerts Generated", value: "145", delta: "+12%", up: true },
  { label: "Alerts Resolved", value: "128", delta: "+8%", up: true },
  { label: "Cases Created", value: "23", delta: "+15%", up: true },
  { label: "Cases Closed", value: "18", delta: "+5%", up: true },
  { label: "STRs Filed to FIU", value: "5", delta: "+2", up: true },
  { label: "Avg Resolution Time", value: "3.2 days", delta: "-0.5 days", up: true },
];

const riskDist = [
  { name: "High Risk", value: 425, color: "hsl(var(--destructive))" },
  { name: "Medium Risk", value: 280, color: "hsl(var(--warning))" },
  { name: "Low Risk", value: 145, color: "hsl(var(--success))" },
];

const productRisk = [
  { label: "Savings Accounts", score: 30, tone: "success" },
  { label: "Wire Transfers", score: 65, tone: "warning" },
  { label: "Cash Transactions", score: 85, tone: "destructive" },
  { label: "Mobile Money", score: 55, tone: "warning" },
  { label: "Cross-Border Payments", score: 78, tone: "destructive" },
];

const heatmap = [
  { region: "Harare", score: 75, customers: 285 },
  { region: "Lagos", score: 68, customers: 142 },
  { region: "Nairobi", score: 52, customers: 98 },
  { region: "Accra", score: 45, customers: 76 },
  { region: "Kigali", score: 58, customers: 64 },
  { region: "Kampala", score: 42, customers: 52 },
  { region: "Dar es Salaam", score: 70, customers: 87 },
  { region: "Cape Town", score: 48, customers: 46 },
];

const heatTone = (s: number) =>
  s >= 70
    ? "bg-destructive/10 border-destructive/30"
    : s >= 55
    ? "bg-warning/10 border-warning/30"
    : s >= 45
    ? "bg-info/10 border-info/30"
    : "bg-success/10 border-success/30";

const compliance = [
  { label: "KYC Compliance Rate", value: 98, target: 95 },
  { label: "STR Filing Timeliness", value: 96, target: 90 },
  { label: "Alert Response Time", value: 89, target: 85 },
  { label: "Customer Risk Assessment", value: 92, target: 95 },
];

const trendVolume = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"].map((m, i) => ({
  m,
  Cash: 120 + i * 8 + Math.round(Math.random() * 10),
  Wire: 90 + i * 5 + Math.round(Math.random() * 10),
  Mobile: 60 + i * 6 + Math.round(Math.random() * 10),
}));

const alertPatterns = [
  { name: "Large Cash", v: 42 },
  { name: "Structuring", v: 31 },
  { name: "Round Amt", v: 24 },
  { name: "Cross Border", v: 38 },
  { name: "Unusual Time", v: 18 },
  { name: "Rapid Txns", v: 27 },
];

const emerging = [
  {
    title: "Increase in round-amount cash deposits",
    detail: "45% increase in last 30 days — potential structuring",
    tone: "warning" as const,
  },
  {
    title: "Surge in mobile money transfers to high-risk corridors",
    detail: "Cross-border transfers to flagged jurisdictions up 38%",
    tone: "destructive" as const,
  },
  {
    title: "PEP exposure growth in onboarding pipeline",
    detail: "12% more PEP-linked applicants vs prior quarter",
    tone: "info" as const,
  },
];

// ---------- small primitives ----------
function Delta({ up, children }: { up: boolean; children: React.ReactNode }) {
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${
        up ? "text-success" : "text-destructive"
      }`}
    >
      <Icon className="h-3 w-3" />
      {children}
    </span>
  );
}

function KpiCard({
  label,
  value,
  delta,
  up,
}: {
  label: string;
  value: string;
  delta: string;
  up: boolean;
}) {
  return (
    <Card className="relative overflow-hidden border-border/60">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-secondary" />
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-1 flex items-end justify-between gap-2">
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <Delta up={up}>{delta}</Delta>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- tab panels ----------
function OperationalReports({ range }: { range: string }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {opsKpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Alert Activity Trend ({range})</CardTitle>
          <Badge variant="outline" className="text-xs">Live</Badge>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={alertTrend}>
              <defs>
                <linearGradient id="barG" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="d" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="v" fill="url(#barG)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top Performing Analysts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground border-b">
            <div className="col-span-5">Analyst</div>
            <div className="col-span-2 text-right">Alerts</div>
            <div className="col-span-2 text-right">Cases Closed</div>
            <div className="col-span-3 text-right">Avg Time</div>
          </div>
          {analysts.map((a, i) => (
            <div
              key={a.name}
              className="grid grid-cols-12 items-center px-3 py-3 border-b last:border-0 hover:bg-muted/40 transition-colors"
            >
              <div className="col-span-5 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-secondary text-white grid place-items-center text-xs font-semibold">
                  {a.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Rank #{i + 1} · Compliance Analyst
                  </p>
                </div>
              </div>
              <div className="col-span-2 text-right text-sm font-semibold">{a.handled}</div>
              <div className="col-span-2 text-right text-sm font-semibold">{a.closed}</div>
              <div className="col-span-3 text-right text-sm">
                <Badge variant="outline" className="text-xs">{a.avg}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function RiskAnalytics() {
  const total = riskDist.reduce((s, r) => s + r.value, 0);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Customer Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={riskDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={92}
                    dataKey="value"
                    paddingAngle={3}
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  >
                    {riskDist.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-xs text-muted-foreground">Total Customers</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {riskDist.map((r) => (
                <div key={r.name} className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                    {r.name}
                  </span>
                  <span className="font-medium">
                    {r.value} <span className="text-muted-foreground text-xs">({Math.round((r.value / total) * 100)}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Risk by Product / Channel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {productRisk.map((p) => (
              <div key={p.label}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-medium">{p.label}</span>
                  <span className="font-semibold tabular-nums">{p.score}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      p.tone === "destructive"
                        ? "bg-destructive"
                        : p.tone === "warning"
                        ? "bg-warning"
                        : "bg-success"
                    }`}
                    style={{ width: `${p.score}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Risk Heatmap by Region</CardTitle>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" />Low</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-info" />Moderate</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" />Elevated</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" />High</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {heatmap.map((h) => (
              <div
                key={h.region}
                className={`rounded-lg border p-4 ${heatTone(h.score)}`}
              >
                <p className="text-xs font-medium text-muted-foreground">{h.region}</p>
                <p className="text-2xl font-bold mt-1">{h.score}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{h.customers} customers</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RegulatoryDashboard() {
  return (
    <div className="space-y-4">
      {compliance.map((c) => {
        const ok = c.value >= c.target;
        return (
          <Card key={c.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {ok ? (
                    <ShieldCheck className="h-4 w-4 text-success" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  )}
                  <p className="text-sm font-medium">{c.label}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={`text-[11px] ${
                      ok
                        ? "bg-success/15 text-success hover:bg-success/15"
                        : "bg-warning/15 text-warning hover:bg-warning/15"
                    }`}
                  >
                    {ok ? "Compliant" : "Warning"}
                  </Badge>
                  <span className="text-sm font-semibold tabular-nums">
                    {c.value}% <span className="text-muted-foreground text-xs">/ {c.target}%</span>
                  </span>
                </div>
              </div>
              <Progress
                value={c.value}
                className={`h-2 ${ok ? "[&>div]:bg-success" : "[&>div]:bg-warning"}`}
              />
            </CardContent>
          </Card>
        );
      })}

      <Card className="bg-gradient-to-br from-accent/60 via-card to-card border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">FIU Compliance Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { l: "STRs Filed to FIU (Q4)", v: "15" },
            { l: "Customers Under EDD", v: "32" },
            { l: "PEP Screenings Completed", v: "156" },
            { l: "Sanctions Matches", v: "8" },
            { l: "Compliance Training Rate", v: "94%" },
            { l: "Policy Violations", v: "2" },
          ].map((i) => (
            <div key={i.l}>
              <p className="text-xs text-muted-foreground">{i.l}:</p>
              <p className="text-2xl font-bold text-primary mt-0.5">{i.v}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function TrendAnalysis() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Transaction Volume Trends (6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendVolume}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="m" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Cash" stroke="hsl(var(--destructive))" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="Wire" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="Mobile" stroke="hsl(var(--success))" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Alert Patterns by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={alertPatterns}>
              <defs>
                <linearGradient id="patternG" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="v" fill="url(#patternG)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-warning/30 bg-warning/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Emerging Risk Indicators
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {emerging.map((e) => (
            <div
              key={e.title}
              className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border/60"
            >
              <div
                className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                  e.tone === "destructive"
                    ? "bg-destructive"
                    : e.tone === "warning"
                    ? "bg-warning"
                    : "bg-info"
                }`}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{e.detail}</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- page ----------
const TABS = [
  { id: "ops", label: "Operational Reports", icon: BarChart3 },
  { id: "risk", label: "Risk Analytics", icon: Target },
  { id: "regulatory", label: "Regulatory Dashboard", icon: ClipboardList },
  { id: "trend", label: "Trend Analysis", icon: LineChartIcon },
] as const;

export default function AmlReports() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("ops");
  const [range, setRange] = useState("Last 30 Days");
  const activeLabel = useMemo(() => TABS.find((t) => t.id === tab)!.label, [tab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reporting &amp; Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Comprehensive insights for FIU compliance and audit purposes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["Last 7 Days", "Last 30 Days", "Last 90 Days", "Year to Date"].map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-95">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid grid-cols-2 lg:grid-cols-4 h-auto p-1.5 bg-muted/60 gap-1.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className="flex-col gap-1.5 py-3 data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/30"
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium">{t.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="mt-4">
          <Card className="bg-card/40 border-border/60">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">{activeLabel}</CardTitle>
              <Badge variant="outline" className="text-[11px]">
                {range}
              </Badge>
            </CardHeader>
            <CardContent>
              <TabsContent value="ops" className="mt-0">
                <OperationalReports range={range} />
              </TabsContent>
              <TabsContent value="risk" className="mt-0">
                <RiskAnalytics />
              </TabsContent>
              <TabsContent value="regulatory" className="mt-0">
                <RegulatoryDashboard />
              </TabsContent>
              <TabsContent value="trend" className="mt-0">
                <TrendAnalysis />
              </TabsContent>
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}
