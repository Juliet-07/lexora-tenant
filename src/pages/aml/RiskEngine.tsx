import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ShieldAlert,
  TrendingUp,
  Users,
  AlertTriangle,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  Globe2,
  BarChart3,
  Edit2,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  fetchRiskDashboard,
  fetchRiskRules,
  fetchRiskScenarios,
  fetchClientRiskList,
  createRiskRule,
  deleteRiskRule,
  createRiskScenario,
  deleteRiskScenario,
  overrideRiskLevel,
  type RiskRule,
  type RiskScenario,
  type RiskClient,
} from "@/lib/kyc-api";
import { prettyLabel, toneFor } from "@/lib/clients-api";

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
  unrated: "#94a3b8",
};

const RULE_FIELDS = [
  { value: "amount", label: "Transaction Amount" },
  { value: "currency", label: "Currency" },
  { value: "type", label: "Transaction Type" },
  { value: "counterpartyCountry", label: "Counterparty Country" },
  { value: "transactionCount", label: "Transaction Count (24h)" },
];

const RULE_CONDITIONS = [
  { value: "greater_than", label: "Greater than" },
  { value: "less_than", label: "Less than" },
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not equals" },
  { value: "contains", label: "Contains" },
  { value: "in_list", label: "In list (comma-separated)" },
];

const RULE_ACTIONS = [
  { value: "flag_high", label: "Flag — High Risk" },
  { value: "flag_medium", label: "Flag — Medium Risk" },
  { value: "flag_low", label: "Flag — Low Risk" },
  { value: "create_alert", label: "Create Compliance Alert" },
  { value: "block", label: "Block Transaction" },
];

const RULE_TYPES = [
  { value: "transaction", label: "Transaction Rule" },
  { value: "behavioral", label: "Behavioral Rule" },
  { value: "client", label: "Client Rule" },
];

// ─────────────────────────────────────────────────────────────
// MONTH LABEL HELPER
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
const monthLabel = (m: { year: number; month: number }) =>
  `${MONTHS[m.month - 1]} ${m.year}`;

// ─────────────────────────────────────────────────────────────
// RISK SUMMARY CARD
// ─────────────────────────────────────────────────────────────

function RiskSummaryCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number | string;
  sub: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// CREATE RULE DIALOG
// ─────────────────────────────────────────────────────────────

function CreateRuleDialog({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    ruleType: "transaction",
    field: "amount",
    condition: "greater_than",
    value: "",
    action: "flag_high",
  });

  const mutation = useMutation({
    mutationFn: () => createRiskRule(form),
    onSuccess: () => {
      toast({ title: "Rule created" });
      setOpen(false);
      setForm({
        name: "",
        description: "",
        ruleType: "transaction",
        field: "amount",
        condition: "greater_than",
        value: "",
        action: "flag_high",
      });
      onCreated();
    },
    onError: (err: any) =>
      toast({
        title: "Failed",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const canSubmit =
    form.name.trim() && form.value.trim() && !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-primary to-secondary">
          <Plus className="h-4 w-4 mr-2" /> New Risk Rule
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Risk Rule</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Rule Name</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Large Cash Deposit"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Rule Type</Label>
              <Select
                value={form.ruleType}
                onValueChange={(v) => set("ruleType", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RULE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Field</Label>
              <Select value={form.field} onValueChange={(v) => set("field", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RULE_FIELDS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select
                value={form.condition}
                onValueChange={(v) => set("condition", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RULE_CONDITIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                value={form.value}
                onChange={(e) => set("value", e.target.value)}
                placeholder="e.g. 10000"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Action</Label>
            <Select value={form.action} onValueChange={(v) => set("action", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RULE_ACTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            className="bg-gradient-to-r from-primary to-secondary"
            disabled={!canSubmit}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Create Rule"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// CREATE SCENARIO DIALOG
// ─────────────────────────────────────────────────────────────

function CreateScenarioDialog({
  rules,
  onCreated,
}: {
  rules: RiskRule[];
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    ruleIds: [] as string[],
    logic: "AND" as "AND" | "OR",
    action: "flag_high",
  });

  const mutation = useMutation({
    mutationFn: () => createRiskScenario(form),
    onSuccess: () => {
      toast({ title: "Scenario created" });
      setOpen(false);
      onCreated();
    },
    onError: (err: any) =>
      toast({
        title: "Failed",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const toggleRule = (id: string) =>
    setForm((p) => ({
      ...p,
      ruleIds: p.ruleIds.includes(id)
        ? p.ruleIds.filter((r) => r !== id)
        : [...p.ruleIds, id],
    }));

  const canSubmit =
    form.name.trim() && form.ruleIds.length >= 1 && !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" /> New Scenario
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Build Risk Scenario</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Scenario Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. High-Value Cross-Border"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Logic</Label>
              <Select
                value={form.logic}
                onValueChange={(v: "AND" | "OR") =>
                  setForm((p) => ({ ...p, logic: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">
                    AND — all rules must match
                  </SelectItem>
                  <SelectItem value="OR">OR — any rule matches</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Action</Label>
              <Select
                value={form.action}
                onValueChange={(v) => setForm((p) => ({ ...p, action: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RULE_ACTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Select Rules to combine</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
              {rules.length === 0 && (
                <p className="text-xs text-muted-foreground p-2">
                  No rules available. Create rules first.
                </p>
              )}
              {rules.map((rule) => (
                <div
                  key={rule._id}
                  onClick={() => toggleRule(rule._id)}
                  className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                    form.ruleIds.includes(rule._id)
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-muted"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      form.ruleIds.includes(rule._id)
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    }`}
                  >
                    {form.ruleIds.includes(rule._id) && (
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{rule.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {rule.field} {rule.condition.replace(/_/g, " ")}{" "}
                      {rule.value}
                    </p>
                  </div>
                  {!rule.tenantId && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      Global
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            className="bg-gradient-to-r from-primary to-secondary"
            disabled={!canSubmit}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Create Scenario"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────

export default function RiskEngine() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [riskFilter, setRiskFilter] = useState("");

  // ── Queries ───────────────────────────────────────────────
  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ["kyc-risk-dashboard"],
    queryFn: fetchRiskDashboard,
    staleTime: 60_000,
  });

  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ["kyc-risk-rules"],
    queryFn: fetchRiskRules,
  });

  const { data: scenarios = [], isLoading: scenariosLoading } = useQuery({
    queryKey: ["kyc-risk-scenarios"],
    queryFn: fetchRiskScenarios,
  });

  const { data: clientRisk, isLoading: clientsLoading } = useQuery({
    queryKey: ["kyc-risk-clients", riskFilter],
    queryFn: () =>
      fetchClientRiskList({ riskLevel: riskFilter || undefined, limit: 20 }),
    staleTime: 30_000,
  });

  // ── Mutations ─────────────────────────────────────────────
  const deleteRuleMutation = useMutation({
    mutationFn: deleteRiskRule,
    onSuccess: () => {
      toast({ title: "Rule deleted" });
      qc.invalidateQueries({ queryKey: ["kyc-risk-rules"] });
    },
    onError: (err: any) =>
      toast({
        title: "Failed",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const deleteScenarioMutation = useMutation({
    mutationFn: deleteRiskScenario,
    onSuccess: () => {
      toast({ title: "Scenario deleted" });
      qc.invalidateQueries({ queryKey: ["kyc-risk-scenarios"] });
    },
  });

  // ── Derived ───────────────────────────────────────────────
  const total = dashboard?.summary.totalClients ?? 0;
  const pieData = dashboard
    ? ["critical", "high", "medium", "low"]
        .map((k) => ({
          name: k.charAt(0).toUpperCase() + k.slice(1),
          value: dashboard.summary[
            k as keyof typeof dashboard.summary
          ] as number,
        }))
        .filter((d) => d.value > 0)
    : [];

  const trendData = (dashboard?.riskTrend ?? []).map((t) => ({
    month: monthLabel(t._id),
    score: Math.round(t.avgScore),
  }));

  const regionData = (dashboard?.riskByRegion ?? []).map((r) => ({
    country: r._id ?? "Unknown",
    count: r.count,
    score: Math.round(r.avgScore ?? 0),
  }));

  // ── Loading ───────────────────────────────────────────────
  if (dashLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Risk Assessment & Scoring</h1>
            <p className="text-sm text-muted-foreground">
              Quantify customer and transactional risk dynamically using
              configurable rules
            </p>
          </div>
          <CreateRuleDialog
            onCreated={() =>
              qc.invalidateQueries({ queryKey: ["kyc-risk-rules"] })
            }
          />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <RiskSummaryCard
            label="High Risk"
            value={dashboard?.summary.high ?? 0}
            sub={
              total > 0
                ? `${Math.round(((dashboard?.summary.high ?? 0) / total) * 100)}% of total`
                : "—"
            }
            color="text-destructive"
          />
          <RiskSummaryCard
            label="Medium Risk"
            value={dashboard?.summary.medium ?? 0}
            sub={
              total > 0
                ? `${Math.round(((dashboard?.summary.medium ?? 0) / total) * 100)}% of total`
                : "—"
            }
            color="text-warning"
          />
          <RiskSummaryCard
            label="Low Risk"
            value={dashboard?.summary.low ?? 0}
            sub={
              total > 0
                ? `${Math.round(((dashboard?.summary.low ?? 0) / total) * 100)}% of total`
                : "—"
            }
            color="text-success"
          />
          <RiskSummaryCard
            label="Avg Risk Score"
            value={dashboard?.summary.avgRiskScore ?? 0}
            sub="Across all customers"
            color="text-primary"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="insights">
          <TabsList>
            <TabsTrigger value="insights">Risk Insights</TabsTrigger>
            <TabsTrigger value="rules">
              Risk Rules
              <span className="ml-1.5 rounded-full bg-primary/10 text-primary text-xs px-1.5">
                {rules.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="scenarios">
              Scenario Builder
              <span className="ml-1.5 rounded-full bg-primary/10 text-primary text-xs px-1.5">
                {scenarios.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="clients">Customer Risk Model</TabsTrigger>
          </TabsList>

          {/* ── Risk Insights ── */}
          <TabsContent value="insights" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Donut chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Risk Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {pieData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                      No risk data yet
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={3}
                            dataKey="value"
                            label={({ value }) => value}
                          >
                            {pieData.map((entry) => (
                              <Cell
                                key={entry.name}
                                fill={
                                  RISK_COLORS[entry.name.toLowerCase()] ??
                                  "#94a3b8"
                                }
                              />
                            ))}
                          </Pie>
                          <RechartTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap gap-3 justify-center mt-2">
                        {pieData.map((entry) => (
                          <div
                            key={entry.name}
                            className="flex items-center gap-1.5 text-xs"
                          >
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{
                                background:
                                  RISK_COLORS[entry.name.toLowerCase()],
                              }}
                            />
                            {entry.name} Risk — {entry.value} (
                            {total > 0
                              ? Math.round((entry.value / total) * 100)
                              : 0}
                            %)
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Risk Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Risk Trend (6 Months)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {trendData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                      Not enough data yet
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <RechartTooltip />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="#6d28d9"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          name="Avg Risk Score"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Average Risk Score by Month
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Risk by Region */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Risk by Region</CardTitle>
                </CardHeader>
                <CardContent>
                  {regionData.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No region data
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {regionData.map((r) => (
                        <div
                          key={r.country}
                          className="flex items-center gap-3"
                        >
                          <span className="text-sm w-24 shrink-0">
                            {r.country}
                          </span>
                          <div className="flex-1">
                            <Progress value={r.score} className="h-2" />
                          </div>
                          <span className="text-xs text-muted-foreground w-6 text-right">
                            {r.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Risk Factors */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Risk Factors</CardTitle>
                </CardHeader>
                <CardContent>
                  {(dashboard?.topRiskFactors ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No verification data yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {(dashboard?.topRiskFactors ?? []).map((f) => (
                        <div
                          key={f._id}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm capitalize">
                            {prettyLabel(f._id)}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              ({f.count})
                            </span>
                            <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                              High
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Overdue Reviews */}
            {(dashboard?.overdueReviews ?? []).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Overdue for Review
                  </CardTitle>
                  <CardDescription>
                    Clients approved more than 180 days ago — due for periodic
                    review
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Risk Level</TableHead>
                        <TableHead>Approved</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(dashboard?.overdueReviews ?? []).map((c) => (
                        <TableRow key={c.clientId}>
                          <TableCell>
                            <p className="font-medium text-sm">{c.fullName}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.email}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`border text-xs ${toneFor(c.riskLevel)}`}
                            >
                              {prettyLabel(c.riskLevel)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {c.kycCompletedAt
                              ? new Date(c.kycCompletedAt).toLocaleDateString()
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Risk Rules ── */}
          <TabsContent value="rules" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-base">Risk Rules</CardTitle>
                    <CardDescription>
                      Global rules (created by platform admin) are visible but
                      not editable. Your own rules can be managed here.
                    </CardDescription>
                  </div>
                  <CreateRuleDialog
                    onCreated={() =>
                      qc.invalidateQueries({ queryKey: ["kyc-risk-rules"] })
                    }
                  />
                </div>
              </CardHeader>
              <CardContent>
                {rulesLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : rules.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No rules yet. Create your first rule above.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules.map((rule) => (
                        <TableRow key={rule._id}>
                          <TableCell>
                            <p className="font-medium text-sm">{rule.name}</p>
                            {rule.description && (
                              <p className="text-xs text-muted-foreground">
                                {rule.description}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="text-xs capitalize"
                            >
                              {rule.ruleType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {rule.field} {rule.condition.replace(/_/g, " ")}{" "}
                              {rule.value}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`text-xs ${
                                rule.action.includes("high")
                                  ? "bg-destructive/10 text-destructive"
                                  : rule.action.includes("medium")
                                    ? "bg-warning/10 text-warning"
                                    : rule.action === "block"
                                      ? "bg-destructive/20 text-destructive"
                                      : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {prettyLabel(rule.action)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {rule.tenantId ? "Your rule" : "Global"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                rule.isActive
                                  ? "bg-success/10 text-success"
                                  : "bg-muted text-muted-foreground"
                              }
                            >
                              {rule.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {rule.tenantId && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                disabled={deleteRuleMutation.isPending}
                                onClick={() =>
                                  deleteRuleMutation.mutate(rule._id)
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Scenario Builder ── */}
          <TabsContent value="scenarios" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-base">
                      Scenario Builder
                    </CardTitle>
                    <CardDescription>
                      Combine multiple rules with AND/OR logic to model complex
                      risk scenarios.
                    </CardDescription>
                  </div>
                  <CreateScenarioDialog
                    rules={rules}
                    onCreated={() =>
                      qc.invalidateQueries({ queryKey: ["kyc-risk-scenarios"] })
                    }
                  />
                </div>
              </CardHeader>
              <CardContent>
                {scenariosLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : scenarios.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <ShieldAlert className="h-10 w-10 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      No scenarios yet. Build your first scenario to model
                      complex risk patterns.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {scenarios.map((scenario) => (
                      <Card key={scenario._id} className="border bg-card">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-sm">
                                  {scenario.name}
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  {scenario.logic}
                                </Badge>
                                <Badge
                                  className={`text-xs ${
                                    scenario.isActive
                                      ? "bg-success/10 text-success"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {scenario.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              {scenario.description && (
                                <p className="text-xs text-muted-foreground mb-2">
                                  {scenario.description}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-1.5">
                                {(scenario.ruleIds as RiskRule[]).map(
                                  (rule) => (
                                    <Badge
                                      key={rule._id ?? String(rule)}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {(rule as RiskRule).name ?? String(rule)}
                                    </Badge>
                                  ),
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                Action:{" "}
                                <span className="font-medium capitalize">
                                  {prettyLabel(scenario.action)}
                                </span>
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                              disabled={deleteScenarioMutation.isPending}
                              onClick={() =>
                                deleteScenarioMutation.mutate(scenario._id)
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Customer Risk Model ── */}
          <TabsContent value="clients" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-base">
                      Customer Risk Model
                    </CardTitle>
                    <CardDescription>
                      All clients ranked by risk level
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={riskFilter} onValueChange={setRiskFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="All risk levels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All levels</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="unrated">Unrated</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        qc.invalidateQueries({ queryKey: ["kyc-risk-clients"] })
                      }
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {clientsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (clientRisk?.items ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No clients found
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Risk Level</TableHead>
                        <TableHead>KYC Status</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Verified</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(clientRisk?.items ?? []).map((client) => (
                        <TableRow key={client.clientId}>
                          <TableCell>
                            <p className="font-medium text-sm">
                              {client.fullName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {client.email}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="text-xs capitalize"
                            >
                              {client.classifications ?? "—"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`border text-xs capitalize ${toneFor(client.riskLevel)}`}
                              style={{
                                borderColor:
                                  RISK_COLORS[client.riskLevel] + "40",
                              }}
                            >
                              {prettyLabel(client.riskLevel)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`border text-xs ${toneFor(client.kycStatus)}`}
                            >
                              {prettyLabel(client.kycStatus)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {client.address?.country ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {client.verificationCompletedAt
                              ? new Date(
                                  client.verificationCompletedAt,
                                ).toLocaleDateString()
                              : "Not verified"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
