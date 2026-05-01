import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Trash2, Activity, AlertCircle, Bell, Pause, Play, Eye } from "lucide-react";
import { toast } from "sonner";

interface Rule {
  id: string;
  name: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  threshold: number;
  timeframe: string;
  description: string;
  active: boolean;
  triggers: number;
}

interface Scenario {
  id: string;
  name: string;
  steps: string[];
  active: boolean;
}

interface Profile {
  customer: string;
  baseline: string;
  deviation: number;
  status: "Normal" | "Anomalous" | "Suspicious";
}

interface Alert {
  id: string;
  time: string;
  rule: string;
  customer: string;
  amount: number;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "Reviewing" | "Closed";
}

const initialRules: Rule[] = [
  { id: "R001", name: "Large Cash Deposit", priority: "High", threshold: 10000, timeframe: "24 hours", description: "Single cash deposit above USD 10,000", active: true, triggers: 12 },
  { id: "R002", name: "Cross-Border Transfer", priority: "Critical", threshold: 25000, timeframe: "7 days", description: "International transfers above threshold", active: true, triggers: 5 },
  { id: "R003", name: "Rapid Succession Withdrawals", priority: "Medium", threshold: 5000, timeframe: "1 hour", description: "Multiple withdrawals in short period", active: true, triggers: 8 },
  { id: "R004", name: "Round Amount Pattern", priority: "Low", threshold: 1000, timeframe: "30 days", description: "Frequent round-amount transactions", active: false, triggers: 3 },
];

const initialScenarios: Scenario[] = [
  { id: "S001", name: "Smurfing detection", steps: ["Multiple deposits < USD 10K within 24h", "Same beneficiary", "Aggregate > USD 50K"], active: true },
  { id: "S002", name: "Layering pattern", steps: ["Funds received from foreign account", "Multiple internal transfers within 48h", "Outbound wire to high-risk jurisdiction"], active: true },
  { id: "S003", name: "Dormant account reactivation", steps: ["Account dormant > 180 days", "Sudden large inbound", "Quick outbound transfer"], active: false },
];

const profiles: Profile[] = [
  { customer: "Tendai Moyo", baseline: "USD 2,000 / month avg", deviation: 650, status: "Suspicious" },
  { customer: "Rudo Chihota", baseline: "USD 800 / month avg", deviation: 120, status: "Anomalous" },
  { customer: "Farai Nyamande", baseline: "USD 1,200 / month avg", deviation: 15, status: "Normal" },
  { customer: "Tapiwa Mpofu", baseline: "USD 5,000 / month avg", deviation: 480, status: "Suspicious" },
];

const alerts: Alert[] = [
  { id: "ALT001", time: "2024-10-27 14:32", rule: "Large Cash Deposit", customer: "Tendai Moyo", amount: 15000, severity: "High", status: "Open" },
  { id: "ALT002", time: "2024-10-27 11:08", rule: "Cross-Border Transfer", customer: "Nhaka Enterprises", amount: 45000, severity: "Critical", status: "Reviewing" },
  { id: "ALT003", time: "2024-10-27 09:45", rule: "Rapid Succession Withdrawals", customer: "Chipo Trading", amount: 8500, severity: "Medium", status: "Open" },
  { id: "ALT004", time: "2024-10-26 18:21", rule: "Smurfing detection", customer: "Tapiwa Mpofu", amount: 25000, severity: "Critical", status: "Reviewing" },
];

function priorityBadge(p: string) {
  const cls =
    p === "Critical"
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : p === "High"
        ? "bg-warning/15 text-warning border-warning/30"
        : p === "Medium"
          ? "bg-info/15 text-info border-info/30"
          : "bg-muted text-muted-foreground";
  return <Badge variant="outline" className={`${cls} text-[10px]`}>{p}</Badge>;
}

export default function TransactionMonitoring() {
  const [tab, setTab] = useState("overview");
  const [rules, setRules] = useState(initialRules);
  const [scenarios] = useState(initialScenarios);
  const [showRuleForm, setShowRuleForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    priority: "Medium",
    threshold: "",
    timeframe: "",
    description: "",
  });

  const createRule = () => {
    if (!form.name || !form.threshold || !form.timeframe || !form.description) {
      toast.error("Please fill all required fields");
      return;
    }
    setRules([
      ...rules,
      {
        id: `R${String(rules.length + 1).padStart(3, "0")}`,
        name: form.name,
        priority: form.priority as Rule["priority"],
        threshold: Number(form.threshold),
        timeframe: form.timeframe,
        description: form.description,
        active: true,
        triggers: 0,
      },
    ]);
    setForm({ name: "", priority: "Medium", threshold: "", timeframe: "", description: "" });
    setShowRuleForm(false);
    toast.success("Rule created");
  };

  const toggleRule = (id: string) => {
    setRules(rules.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
  };

  const deleteRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
    toast.success("Rule deleted");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transaction Monitoring</h1>
        <p className="text-sm text-muted-foreground">
          Real-time surveillance, rules engine, scenario analysis and alerts
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rules">Rules Engine</TabsTrigger>
          <TabsTrigger value="scenarios">Scenario Builder</TabsTrigger>
          <TabsTrigger value="profiling">Behavioral Profiling</TabsTrigger>
          <TabsTrigger value="alerts">Real-Time Alerts</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Active Rules</p>
                  <p className="text-3xl font-bold text-primary">{rules.filter((r) => r.active).length}</p>
                </div>
                <Activity className="h-7 w-7 text-primary/50" />
              </div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Open Alerts</p>
                  <p className="text-3xl font-bold text-destructive">{alerts.filter((a) => a.status === "Open").length}</p>
                </div>
                <AlertCircle className="h-7 w-7 text-destructive/50" />
              </div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Under Review</p>
                  <p className="text-3xl font-bold text-warning">{alerts.filter((a) => a.status === "Reviewing").length}</p>
                </div>
                <Bell className="h-7 w-7 text-warning/50" />
              </div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Active Scenarios</p>
                  <p className="text-3xl font-bold text-secondary">{scenarios.filter((s) => s.active).length}</p>
                </div>
                <Activity className="h-7 w-7 text-secondary/50" />
              </div>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Recent Alerts</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {alerts.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <div>
                      <p className="text-sm font-medium">{a.rule} — {a.customer}</p>
                      <p className="text-xs text-muted-foreground">{a.time} · USD {a.amount.toLocaleString()}</p>
                    </div>
                  </div>
                  {priorityBadge(a.severity)}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rules Engine */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Rules Engine</CardTitle>
              <Button
                variant={showRuleForm ? "outline" : "default"}
                size="sm"
                onClick={() => setShowRuleForm(!showRuleForm)}
              >
                {showRuleForm ? "Cancel" : (<><Plus className="h-4 w-4 mr-1" /> New Rule</>)}
              </Button>
            </CardHeader>
            {showRuleForm && (
              <CardContent className="border-t bg-muted/30">
                <p className="font-semibold text-sm mb-4">Create New Rule</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Rule Name *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Priority *</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Threshold (USD) *</Label>
                    <Input
                      type="number"
                      value={form.threshold}
                      onChange={(e) => setForm({ ...form, threshold: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Timeframe *</Label>
                    <Input
                      placeholder="e.g., 24 hours, 7 days"
                      value={form.timeframe}
                      onChange={(e) => setForm({ ...form, timeframe: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Description *</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button onClick={createRule}>Create Rule</Button>
                </div>
              </CardContent>
            )}
            <CardContent className={showRuleForm ? "border-t pt-4" : ""}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>Timeframe</TableHead>
                    <TableHead>Triggers</TableHead>
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
                        <div className="text-xs text-muted-foreground line-clamp-1">{r.description}</div>
                      </TableCell>
                      <TableCell>{priorityBadge(r.priority)}</TableCell>
                      <TableCell>USD {r.threshold.toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{r.timeframe}</TableCell>
                      <TableCell><Badge variant="secondary">{r.triggers}</Badge></TableCell>
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

        {/* Scenario Builder */}
        <TabsContent value="scenarios" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Scenarios</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {scenarios.map((s) => (
                <div key={s.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.id}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={s.active ? "bg-success/15 text-success border-success/30" : "bg-muted"}
                    >
                      {s.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="space-y-1.5 ml-2">
                    {s.steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-muted-foreground">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Behavioral Profiling */}
        <TabsContent value="profiling" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Customer Behavioral Profiles</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Baseline</TableHead>
                    <TableHead>Deviation %</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((p) => (
                    <TableRow key={p.customer}>
                      <TableCell className="font-medium">{p.customer}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.baseline}</TableCell>
                      <TableCell>
                        <span
                          className={
                            p.deviation > 200
                              ? "text-destructive font-bold"
                              : p.deviation > 50
                                ? "text-warning font-semibold"
                                : "text-success"
                          }
                        >
                          +{p.deviation}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            p.status === "Suspicious"
                              ? "bg-destructive/15 text-destructive border-destructive/30"
                              : p.status === "Anomalous"
                                ? "bg-warning/15 text-warning border-warning/30"
                                : "bg-success/15 text-success border-success/30"
                          }
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Real-time alerts */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Real-Time Alerts</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alert ID</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Rule</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.id}</TableCell>
                      <TableCell className="text-xs">{a.time}</TableCell>
                      <TableCell>{a.rule}</TableCell>
                      <TableCell className="font-medium">{a.customer}</TableCell>
                      <TableCell>USD {a.amount.toLocaleString()}</TableCell>
                      <TableCell>{priorityBadge(a.severity)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            a.status === "Open"
                              ? "bg-destructive/15 text-destructive border-destructive/30"
                              : a.status === "Reviewing"
                                ? "bg-warning/15 text-warning border-warning/30"
                                : "bg-success/15 text-success border-success/30"
                          }
                        >
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="link" size="sm" className="h-auto p-0">
                          <Eye className="h-3 w-3 mr-1" /> Investigate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
