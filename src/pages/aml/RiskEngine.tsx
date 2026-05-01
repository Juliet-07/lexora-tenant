import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { RefreshCw, Eye } from "lucide-react";

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

function scoreColor(score: number) {
  if (score >= 70) return "text-destructive";
  if (score >= 40) return "text-warning";
  return "text-success";
}

export default function RiskEngine() {
  const [tab, setTab] = useState("customer");

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Risk Assessment & Scoring</h1>
        <p className="text-sm text-muted-foreground">
          Quantify customer and transactional risk dynamically
        </p>
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
          <TabsTrigger value="customer">Customer Risk Model</TabsTrigger>
          <TabsTrigger value="transaction">Transaction Risk Model</TabsTrigger>
          <TabsTrigger value="dashboard">Risk Dashboard</TabsTrigger>
        </TabsList>

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
                  <span>• Geographic risk (Harare, Bulawayo, cross-border)</span>
                  <span>• Counterparty risk assessment</span>
                  <span>• Source of funds verification</span>
                  <span>• Historical transaction patterns</span>
                  <span>• Mobile money integration (Ecocash, Innbucks)</span>
                  <span>• Time of transaction</span>
                  <span>• PEP involvement</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Risk Dashboard ────────────────────────────── */}
        <TabsContent value="dashboard">
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
                <CardTitle className="text-base">Risk by Region (Zimbabwe)</CardTitle>
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
      </Tabs>
    </div>
  );
}
