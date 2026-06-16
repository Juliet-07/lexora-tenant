import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  TrendingUp,
  Target,
  DollarSign,
  Flame,
  Users,
  UserCheck,
  Repeat,
  UserX,
  ArrowRight,
} from "lucide-react";
import {
  opportunities as initialOpps,
  leads as initialLeads,
  accounts as initialAccounts,
  pipelineStages,
  type Opportunity,
  type LifecycleStage,
} from "@/data/crmMockData";

const stageColor: Record<Opportunity["stage"], string> = {
  Qualification: "bg-slate-500/10 text-slate-600",
  Discovery: "bg-blue-500/10 text-blue-600",
  Proposal: "bg-indigo-500/10 text-indigo-600",
  Negotiation: "bg-amber-500/10 text-amber-600",
  "Closed Won": "bg-success/10 text-success",
  "Closed Lost": "bg-destructive/10 text-destructive",
};

const lifecycleColor: Record<LifecycleStage, string> = {
  Lead: "bg-slate-500/10 text-slate-600",
  Prospect: "bg-blue-500/10 text-blue-600",
  "Active Client": "bg-success/10 text-success",
  "Retained Client": "bg-primary/10 text-primary",
  "Past Client": "bg-destructive/10 text-destructive",
};

const scoreTone = (score: number) =>
  score >= 70 ? "text-success" : score >= 40 ? "text-warning" : "text-muted-foreground";

export default function Pipeline() {
  const [opps] = useState(initialOpps);
  const [leads] = useState(initialLeads);
  const [accounts] = useState(initialAccounts);

  const open = opps.filter((o) => !o.stage.startsWith("Closed"));
  const pipelineValue = open.reduce((s, o) => s + o.amount, 0);
  const weighted = open.reduce((s, o) => s + (o.amount * o.probability) / 100, 0);
  const won = opps.filter((o) => o.stage === "Closed Won").reduce((s, o) => s + o.amount, 0);
  const winRate = Math.round(
    (opps.filter((o) => o.stage === "Closed Won").length /
      (opps.filter((o) => o.stage.startsWith("Closed")).length || 1)) *
      100,
  );

  // ── Lifecycle / conversion story ─────────────────────────────
  const funnel = useMemo(() => {
    const leadCount = leads.length + accounts.filter((a) => a.lifecycle === "Lead").length;
    const prospectCount = accounts.filter((a) => a.lifecycle === "Prospect").length;
    const activeCount = accounts.filter((a) => a.lifecycle === "Active Client").length;
    const retainedCount = accounts.filter((a) => a.lifecycle === "Retained Client").length;
    const pastCount = accounts.filter((a) => a.lifecycle === "Past Client").length;
    const clientTotal = activeCount + retainedCount + pastCount;
    return {
      stages: [
        { key: "Lead", label: "Leads", count: leadCount, icon: Users, tone: "bg-slate-500/10 text-slate-600" },
        { key: "Prospect", label: "Prospects", count: prospectCount, icon: Target, tone: "bg-blue-500/10 text-blue-600" },
        { key: "Client", label: "Paying Clients", count: clientTotal, icon: UserCheck, tone: "bg-success/10 text-success" },
        { key: "Retained", label: "Retained", count: retainedCount, icon: Repeat, tone: "bg-primary/10 text-primary" },
        { key: "Past", label: "Past Clients", count: pastCount, icon: UserX, tone: "bg-destructive/10 text-destructive" },
      ],
      leadCount,
      prospectCount,
      activeCount,
      retainedCount,
      pastCount,
      clientTotal,
    };
  }, [leads, accounts]);

  const leadToProspect = funnel.leadCount
    ? Math.round((funnel.prospectCount / funnel.leadCount) * 100)
    : 0;
  const prospectToClient = funnel.prospectCount + funnel.clientTotal
    ? Math.round((funnel.clientTotal / (funnel.prospectCount + funnel.clientTotal)) * 100)
    : 0;
  const retentionRate = funnel.clientTotal
    ? Math.round((funnel.retainedCount / funnel.clientTotal) * 100)
    : 0;

  const maxFunnel = Math.max(...funnel.stages.map((s) => s.count), 1);

  const activeClients = accounts.filter((a) => a.lifecycle === "Active Client");
  const retainedClients = accounts.filter((a) => a.lifecycle === "Retained Client");
  const pastClients = accounts.filter((a) => a.lifecycle === "Past Client");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            Track the full journey — from lead to paying client, retained or churned
          </p>
        </div>
        <Button className="bg-gradient-to-r from-primary to-secondary">
          <Plus className="h-4 w-4 mr-2" /> New Opportunity
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Target, label: "Open Pipeline", value: `$${pipelineValue.toLocaleString()}`, tone: "bg-primary/10 text-primary" },
          { icon: TrendingUp, label: "Weighted Forecast", value: `$${Math.round(weighted).toLocaleString()}`, tone: "bg-info/10 text-info" },
          { icon: DollarSign, label: "Closed Won (QTD)", value: `$${won.toLocaleString()}`, tone: "bg-success/10 text-success" },
          { icon: Flame, label: "Win Rate", value: `${winRate}%`, tone: "bg-warning/10 text-warning" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-center gap-3">
              <div className={`p-3 rounded-xl ${s.tone}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="funnel">
        <TabsList>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="kanban">Pipeline Board</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="list">Opportunities</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
        </TabsList>

        {/* ── Conversion funnel ──────────────────────────────── */}
        <TabsContent value="funnel" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">Lead → Prospect</p>
                <p className="text-2xl font-bold mt-1">{leadToProspect}%</p>
                <Progress value={leadToProspect} className="h-1.5 mt-2" />
                <p className="text-[11px] text-muted-foreground mt-2">
                  How many captured leads progress to qualified prospects.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">Prospect → Paying Client</p>
                <p className="text-2xl font-bold mt-1">{prospectToClient}%</p>
                <Progress value={prospectToClient} className="h-1.5 mt-2" />
                <p className="text-[11px] text-muted-foreground mt-2">
                  Share of prospects that converted into a paying engagement.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">Client Retention Rate</p>
                <p className="text-2xl font-bold mt-1">{retentionRate}%</p>
                <Progress value={retentionRate} className="h-1.5 mt-2" />
                <p className="text-[11px] text-muted-foreground mt-2">
                  Clients who came back for additional engagements vs one-time.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conversion Journey</CardTitle>
              <p className="text-xs text-muted-foreground">
                Lead → Prospect → Paying Client → Retained / Past
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {funnel.stages.map((s, i) => {
                const width = Math.max((s.count / maxFunnel) * 100, 8);
                return (
                  <div key={s.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-medium">
                        <s.icon className="h-4 w-4 text-muted-foreground" />
                        {s.label}
                      </div>
                      <span className="text-muted-foreground">{s.count} accounts</span>
                    </div>
                    <div className="h-9 rounded-md bg-muted/40 overflow-hidden">
                      <div
                        className={`h-full ${s.tone} flex items-center px-3 text-xs font-semibold transition-all`}
                        style={{ width: `${width}%` }}
                      >
                        {s.count}
                      </div>
                    </div>
                    {i < funnel.stages.length - 1 && (
                      <div className="flex justify-center text-muted-foreground">
                        <ArrowRight className="h-3 w-3 rotate-90" />
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead Sources</CardTitle>
              <p className="text-xs text-muted-foreground">
                Where new leads are originating from
              </p>
            </CardHeader>
            <CardContent>
              {(() => {
                const bySource = leads.reduce<Record<string, number>>((acc, l) => {
                  acc[l.source] = (acc[l.source] || 0) + 1;
                  return acc;
                }, {});
                const total = leads.length || 1;
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(bySource).map(([src, n]) => (
                      <div key={src} className="rounded-lg border border-border/50 p-3">
                        <p className="text-xs text-muted-foreground">{src}</p>
                        <p className="text-lg font-bold">{n}</p>
                        <Progress value={(n / total) * 100} className="h-1 mt-1" />
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Pipeline board ────────────────────────────────── */}
        <TabsContent value="kanban" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {pipelineStages.map((stage) => {
              const stageOpps = opps.filter((o) => o.stage === stage);
              const stageVal = stageOpps.reduce((s, o) => s + o.amount, 0);
              return (
                <Card key={stage} className="bg-muted/30">
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-xs font-semibold flex items-center justify-between">
                      <span>{stage}</span>
                      <Badge variant="outline" className="text-[10px]">{stageOpps.length}</Badge>
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground">${stageVal.toLocaleString()}</p>
                  </CardHeader>
                  <CardContent className="p-2 space-y-2 min-h-40">
                    {stageOpps.map((o) => (
                      <div key={o.id} className="rounded-lg bg-background p-3 border border-border/50 hover:border-primary/50 cursor-pointer">
                        <p className="text-xs font-medium leading-tight">{o.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{o.accountName}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs font-semibold">${o.amount.toLocaleString()}</span>
                          <Badge variant="outline" className="text-[10px]">{o.probability}%</Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Leads ─────────────────────────────────────────── */}
        <TabsContent value="leads" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{l.name}</p>
                        <p className="text-xs text-muted-foreground">{l.email}</p>
                      </TableCell>
                      <TableCell className="text-sm">{l.company}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{l.source}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 w-28">
                          <Progress value={l.score} className="h-1.5 flex-1" />
                          <span className={`text-xs font-bold ${scoreTone(l.score)}`}>{l.score}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge className="text-xs">{l.status}</Badge></TableCell>
                      <TableCell className="text-sm">{l.owner}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.createdAt}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Opportunities ─────────────────────────────────── */}
        <TabsContent value="list" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Opportunity</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Probability</TableHead>
                    <TableHead>Close Date</TableHead>
                    <TableHead>Next Step</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opps.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium text-sm">{o.name}</TableCell>
                      <TableCell className="text-sm">{o.accountName}</TableCell>
                      <TableCell><Badge className={`text-xs ${stageColor[o.stage]}`}>{o.stage}</Badge></TableCell>
                      <TableCell className="font-semibold">${o.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{o.probability}%</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{o.closeDate}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{o.nextStep}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Clients (active / retained / past) ────────────── */}
        <TabsContent value="clients" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Active Clients", value: activeClients.length, sub: "Currently engaged", tone: "bg-success/10 text-success", icon: UserCheck },
              { label: "Retained Clients", value: retainedClients.length, sub: "Multiple engagements", tone: "bg-primary/10 text-primary", icon: Repeat },
              { label: "Past Clients", value: pastClients.length, sub: "One-time / churned", tone: "bg-destructive/10 text-destructive", icon: UserX },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-5 flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${s.tone}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className="text-xl font-bold">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground">{s.sub}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Lifecycle</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Deals</TableHead>
                    <TableHead>First Won</TableHead>
                    <TableHead>Last Won</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                    <TableHead>Owner</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts
                    .filter((a) => a.lifecycle !== "Lead" && a.lifecycle !== "Prospect")
                    .sort((a, b) => b.totalRevenue - a.totalRevenue)
                    .map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{a.industry} · {a.country}</p>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${lifecycleColor[a.lifecycle]}`}>{a.lifecycle}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{a.source ?? "—"}</TableCell>
                        <TableCell className="text-sm font-semibold">{a.dealsCount}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{a.firstWonDate ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{a.lastWonDate ?? "—"}</TableCell>
                        <TableCell className="text-right font-semibold">${a.totalRevenue.toLocaleString()}</TableCell>
                        <TableCell className="text-sm">{a.owner}</TableCell>
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
