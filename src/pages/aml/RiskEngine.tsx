import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from "recharts";
import { RefreshCw, Eye, Plus, Pause, Play, Trash2, Settings2, Workflow } from "lucide-react";
import { toast } from "sonner";

interface Scenario {
  id: string;
  name: string;
  steps: string[];
  active: boolean;
}

const initialScenarios: Scenario[] = [
  { id: "S001", name: "Smurfing detection", steps: ["Multiple deposits < USD 10K within 24h", "Same beneficiary", "Aggregate > USD 50K"], active: true },
  { id: "S002", name: "Layering pattern", steps: ["Funds received from foreign account", "Multiple internal transfers within 48h", "Outbound wire to high-risk jurisdiction"], active: true },
  { id: "S003", name: "Dormant account reactivation", steps: ["Account dormant > 180 days", "Sudden large inbound", "Quick outbound transfer"], active: false },
];

interface CustomerRisk {
  id: string;
  name: string;
  bank: string;
  score: number;
  level: "HIGH" | "MEDIUM" | "LOW";
  lastUpdate: string;
  region: string;
}

interface TxnRisk {
  id: string;
  date: string;
  customer: string;
  region: string;
  bank: string;
  type: string;
  amount: number;
  score: number;
  level: "HIGH" | "MEDIUM" | "LOW";
  flags: string[];
}

interface RiskRule {
  id: string;
  name: string;
  category: "Customer" | "Transaction" | "Geographic" | "Behavioral";
  appliesWhen: string;
  weight: number;
  severity: "Low" | "Medium" | "High" | "Critical";
  description: string;
  active: boolean;
}

const customerRisks: CustomerRisk[] = [
  { id: "CUST001", name: "Tendai Moyo", bank: "CBZ Bank", score: 75, level: "HIGH", lastUpdate: "2024-10-27", region: "Harare" },
  { id: "CUST002", name: "Rudo Chihota", bank: "CABS", score: 45, level: "MEDIUM", lastUpdate: "2024-10-26", region: "Bulawayo" },
  { id: "CUST003", name: "Nhaka Enterprises", bank: "Steward Bank", score: 85, level: "HIGH", lastUpdate: "2024-10-25", region: "Harare" },
  { id: "CUST004", name: "Farai Nyamande", bank: "Stanbic Bank", score: 25, level: "LOW", lastUpdate: "2024-10-24", region: "Gweru" },
  { id: "CUST005", name: "Chipo Trading", bank: "NMB Bank", score: 55, level: "MEDIUM", lastUpdate: "2024-10-23", region: "Harare" },
  { id: "CUST006", name: "Tapiwa Mpofu", bank: "CBZ Bank", score: 90, level: "HIGH", lastUpdate: "2024-10-22", region: "Bulawayo" },
];

const txnRisks: TxnRisk[] = [
  { id: "TXN001", date: "2024-10-27", customer: "Tendai Moyo", region: "Harare", bank: "CBZ Bank", type: "Cash Deposit", amount: 15000, score: 78, level: "HIGH", flags: ["Large amount", "Cash transaction", "Pattern deviation"] },
  { id: "TXN002", date: "2024-10-27", customer: "Nhaka Enterprises", region: "Harare", bank: "Steward Bank", type: "International Transfer", amount: 45000, score: 85, level: "HIGH", flags: ["High amount", "Cross-border", "High-risk country"] },
  { id: "TXN003", date: "2024-10-26", customer: "Rudo Chihota", region: "Bulawayo", bank: "CABS", type: "Mobile Money", amount: 5000, score: 42, level: "MEDIUM", flags: ["Ecocash transfer", "Unusual time"] },
  { id: "TXN004", date: "2024-10-26", customer: "Tapiwa Mpofu", region: "Bulawayo", bank: "CBZ Bank", type: "Wire Transfer", amount: 25000, score: 88, level: "HIGH", flags: ["PEP involved", "Large amount", "Rapid succession"] },
  { id: "TXN005", date: "2024-10-25", customer: "Chipo Trading", region: "Harare", bank: "NMB Bank", type: "Business Payment", amount: 8500, score: 48, level: "MEDIUM", flags: ["Round amount", "Cash intensive business"] },
];

const initialRules: RiskRule[] = [
  { id: "RR001", name: "PEP Status Detected", category: "Customer", appliesWhen: "Customer is flagged as Politically Exposed Person", weight: 30, severity: "Critical", description: "Adds 30 points to customer risk score when PEP match is confirmed", active: true },
  { id: "RR002", name: "High-Risk Jurisdiction", category: "Geographic", appliesWhen: "Counterparty in FATF grey/black list country", weight: 25, severity: "High", description: "Increases score for transactions involving high-risk geographies", active: true },
  { id: "RR003", name: "Cash Intensive Business", category: "Customer", appliesWhen: "Business sector flagged as cash-intensive", weight: 15, severity: "Medium", description: "Applies to bars, casinos, MSBs and similar sectors", active: true },
  { id: "RR004", name: "Velocity Spike", category: "Behavioral", appliesWhen: "Transaction count > 200% of baseline in 24h", weight: 20, severity: "High", description: "Triggers when activity sharply deviates from customer baseline", active: false },
];

const regionData = [
  { region: "Harare", avgScore: 60, customers: 3, color: "hsl(var(--warning))" },
  { region: "Bulawayo", avgScore: 75, customers: 2, color: "hsl(var(--destructive))" },
  { region: "Mutare", avgScore: 45, customers: 1, color: "hsl(var(--warning))" },
  { region: "Gweru", avgScore: 25, customers: 0, color: "hsl(var(--success))" },
];

const trendData = [
  { month: "May", score: 52 },
  { month: "Jun", score: 58 },
  { month: "Jul", score: 61 },
  { month: "Aug", score: 65 },
  { month: "Sep", score: 60 },
  { month: "Oct", score: 63 },
];

const topRiskFactors = [
  { name: "High Transaction Volume", count: 8, level: "High", pct: 90 },
  { name: "Cross-Border Transfers", count: 5, level: "High", pct: 80 },
  { name: "PEP Status", count: 4, level: "High", pct: 75 },
  { name: "Geographic Risk", count: 6, level: "Medium", pct: 55 },
  { name: "Cash Intensive Business", count: 3, level: "Medium", pct: 40 },
];

function levelBadge(level: "HIGH" | "MEDIUM" | "LOW") {
  const cls =
    level === "HIGH"
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : level === "MEDIUM"
        ? "bg-warning/15 text-warning border-warning/30"
        : "bg-success/15 text-success border-success/30";
  return <Badge variant="outline" className={`${cls} text-[10px]`}>{level}</Badge>;
}

function severityBadge(s: RiskRule["severity"]) {
  const cls =
    s === "Critical"
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : s === "High"
        ? "bg-warning/15 text-warning border-warning/30"
        : s === "Medium"
          ? "bg-info/15 text-info border-info/30"
          : "bg-muted text-muted-foreground";
  return <Badge variant="outline" className={`${cls} text-[10px]`}>{s}</Badge>;
}

function scoreColor(score: number) {
  if (score >= 70) return "text-destructive";
  if (score >= 40) return "text-warning";
  return "text-success";
}

export default function RiskEngine() {
  const [tab, setTab] = useState("insights");
  const [rules, setRules] = useState<RiskRule[]>(initialRules);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    name: "",
    category: "Customer" as RiskRule["category"],
    severity: "Medium" as RiskRule["severity"],
    weight: "10",
    appliesWhen: "",
    description: "",
  });

  const high = customerRisks.filter((c) => c.level === "HIGH").length;
  const medium = customerRisks.filter((c) => c.level === "MEDIUM").length;
  const low = customerRisks.filter((c) => c.level === "LOW").length;
  const total = customerRisks.length;
  const avg = Math.round(customerRisks.reduce((s, c) => s + c.score, 0) / total);

  const distribution = [
    { name: "High Risk", value: high, color: "hsl(var(--destructive))" },
    { name: "Medium Risk", value: medium, color: "hsl(var(--warning))" },
    { name: "Low Risk", value: low, color: "hsl(var(--success))" },
  ];

  const resetRuleForm = () =>
    setRuleForm({ name: "", category: "Customer", severity: "Medium", weight: "10", appliesWhen: "", description: "" });

  const saveRule = () => {
    if (!ruleForm.name || !ruleForm.appliesWhen || !ruleForm.description) {
      toast.error("Please fill name, condition and description");
      return;
    }
    setRules([
      {
        id: `RR${String(rules.length + 1).padStart(3, "0")}`,
        name: ruleForm.name,
        category: ruleForm.category,
        severity: ruleForm.severity,
        weight: Number(ruleForm.weight) || 10,
        appliesWhen: ruleForm.appliesWhen,
        description: ruleForm.description,
        active: true,
      },
      ...rules,
    ]);
    resetRuleForm();
    setRuleDialogOpen(false);
    toast.success("Risk rule created");
  };

  const toggleRule = (id: string) =>
    setRules(rules.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));

  const deleteRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
    toast.success("Rule removed");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Risk Assessment & Scoring</h1>
          <p className="text-sm text-muted-foreground">
            Quantify customer and transactional risk dynamically using configurable rules
          </p>
        </div>
        <Button onClick={() => setRuleDialogOpen(true)} className="gap-1">
          <Plus className="h-4 w-4" /> New Risk Rule
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-destructive/5 border-destructive/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">High Risk</p>
            <p className="text-3xl font-bold text-destructive">{high}</p>
            <p className="text-xs text-muted-foreground mt-1">{Math.round((high / total) * 100)}% of total</p>
          </CardContent>
        </Card>
        <Card className="bg-warning/5 border-warning/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Medium Risk</p>
            <p className="text-3xl font-bold text-warning">{medium}</p>
            <p className="text-xs text-muted-foreground mt-1">{Math.round((medium / total) * 100)}% of total</p>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Low Risk</p>
            <p className="text-3xl font-bold text-success">{low}</p>
            <p className="text-xs text-muted-foreground mt-1">{Math.round((low / total) * 100)}% of total</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg Risk Score</p>
            <p className="text-3xl font-bold text-primary">{avg}</p>
            <p className="text-xs text-muted-foreground mt-1">Across all customers</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="insights">Risk Insights</TabsTrigger>
          <TabsTrigger value="rules">Risk Rules</TabsTrigger>
          <TabsTrigger value="customer">Customer Risk Model</TabsTrigger>
          <TabsTrigger value="transaction">Transaction Risk Model</TabsTrigger>
        </TabsList>

        {/* ── Risk Insights (default) ───────────────────── */}
        <TabsContent value="insights">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Risk Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={distribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ value }) => value}
                    >
                      {distribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {distribution.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ background: d.color }} />
                        <span>{d.name}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {d.value} ({Math.round((d.value / total) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Risk Trend (6 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  Average Risk Score by Month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Risk by Region</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {regionData.map((r) => (
                  <div key={r.region} className="flex items-center gap-3">
                    <span className="text-xs w-20 shrink-0">{r.region}</span>
                    <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
                      <div
                        className="h-full flex items-center justify-end pr-2 text-[10px] font-semibold text-white"
                        style={{ width: `${r.avgScore}%`, background: r.color }}
                      >
                        {r.avgScore}
                      </div>
                    </div>
                    <span className="text-xs w-6 text-right text-muted-foreground">{r.customers}</span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Avg Risk Score | # of Customers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Risk Factors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topRiskFactors.map((f) => (
                  <div key={f.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{f.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">({f.count})</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            f.level === "High"
                              ? "bg-destructive/15 text-destructive border-destructive/30"
                              : "bg-warning/15 text-warning border-warning/30"
                          }`}
                        >
                          {f.level}
                        </Badge>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${f.pct}%`,
                          background:
                            f.level === "High" ? "hsl(var(--destructive))" : "hsl(var(--warning))",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Risk Rules ────────────────────────────────── */}
        <TabsContent value="rules">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-primary" /> Risk Rule Library
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Rules feeding the customer & transaction scoring engine
                </p>
              </div>
              <Button size="sm" onClick={() => setRuleDialogOpen(true)} className="gap-1">
                <Plus className="h-4 w-4" /> New Rule
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Rule</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.id}</TableCell>
                      <TableCell>
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{r.appliesWhen}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{r.category}</Badge>
                      </TableCell>
                      <TableCell>{severityBadge(r.severity)}</TableCell>
                      <TableCell className="font-semibold">+{r.weight}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={r.active ? "bg-success/15 text-success border-success/30" : "bg-muted text-muted-foreground"}
                        >
                          {r.active ? "Active" : "Paused"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => toggleRule(r.id)}>
                            {r.active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteRule(r.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Customer Risk ─────────────────────────────── */}
        <TabsContent value="customer">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer Risk Ratings</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Last Update</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerRisks.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.id}</TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.bank}</TableCell>
                      <TableCell>
                        <span className={`text-lg font-bold ${scoreColor(c.score)}`}>{c.score}</span>
                      </TableCell>
                      <TableCell>{levelBadge(c.level)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{c.lastUpdate}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="link" size="sm" className="h-auto p-0 text-primary">
                            <Eye className="h-3 w-3 mr-1" /> View Details
                          </Button>
                          <Button variant="link" size="sm" className="h-auto p-0 text-secondary">
                            <RefreshCw className="h-3 w-3 mr-1" /> Recalculate
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Transaction Risk ──────────────────────────── */}
        <TabsContent value="transaction">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Transaction Risk Scoring</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Risk Flags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txnRisks.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.id}</TableCell>
                      <TableCell className="text-xs">{t.date}</TableCell>
                      <TableCell>
                        <div className="font-medium">{t.customer}</div>
                        <div className="text-xs text-muted-foreground">{t.region}</div>
                      </TableCell>
                      <TableCell>{t.bank}</TableCell>
                      <TableCell>{t.type}</TableCell>
                      <TableCell className="font-semibold">USD {t.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={`text-lg font-bold ${scoreColor(t.score)}`}>{t.score}</span>
                      </TableCell>
                      <TableCell>{levelBadge(t.level)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {t.flags.map((f) => (
                            <Badge key={f} variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">
                              {f}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="bg-muted/40 rounded-lg p-4 text-sm">
                <p className="font-semibold mb-2">Risk Scoring Factors</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-1 text-muted-foreground text-xs">
                  <span>• Transaction volume and velocity</span>
                  <span>• Geographic risk (cross-border, high-risk jurisdictions)</span>
                  <span>• Counterparty risk assessment</span>
                  <span>• Source of funds verification</span>
                  <span>• Historical transaction patterns</span>
                  <span>• Mobile money integration</span>
                  <span>• Time of transaction</span>
                  <span>• PEP involvement</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create rule dialog */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Risk Rule</DialogTitle>
            <DialogDescription>
              Define a condition and the weight it adds to a customer or transaction score.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Rule Name *</Label>
              <Input
                placeholder="e.g., Sanctions List Hit"
                value={ruleForm.name}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={ruleForm.category}
                  onValueChange={(v) => setRuleForm({ ...ruleForm, category: v as RiskRule["category"] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Customer">Customer</SelectItem>
                    <SelectItem value="Transaction">Transaction</SelectItem>
                    <SelectItem value="Geographic">Geographic</SelectItem>
                    <SelectItem value="Behavioral">Behavioral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity</Label>
                <Select
                  value={ruleForm.severity}
                  onValueChange={(v) => setRuleForm({ ...ruleForm, severity: v as RiskRule["severity"] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Score Weight (points added)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={ruleForm.weight}
                onChange={(e) => setRuleForm({ ...ruleForm, weight: e.target.value })}
              />
            </div>
            <div>
              <Label>Applies When *</Label>
              <Input
                placeholder="e.g., Customer matches sanctions list"
                value={ruleForm.appliesWhen}
                onChange={(e) => setRuleForm({ ...ruleForm, appliesWhen: e.target.value })}
              />
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea
                rows={3}
                placeholder="Explain how this rule influences the risk score…"
                value={ruleForm.description}
                onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetRuleForm(); setRuleDialogOpen(false); }}>
              Cancel
            </Button>
            <Button onClick={saveRule}>Create Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
