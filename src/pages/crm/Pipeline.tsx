import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Plus, TrendingUp, Target, DollarSign, Flame } from "lucide-react";
import { opportunities as initialOpps, leads as initialLeads, pipelineStages, type Opportunity } from "@/data/crmMockData";

const stageColor: Record<Opportunity["stage"], string> = {
  Qualification: "bg-slate-500/10 text-slate-600",
  Discovery: "bg-blue-500/10 text-blue-600",
  Proposal: "bg-indigo-500/10 text-indigo-600",
  Negotiation: "bg-amber-500/10 text-amber-600",
  "Closed Won": "bg-success/10 text-success",
  "Closed Lost": "bg-destructive/10 text-destructive",
};

const scoreTone = (score: number) =>
  score >= 70 ? "text-success" : score >= 40 ? "text-warning" : "text-muted-foreground";

export default function Pipeline() {
  const [opps] = useState(initialOpps);
  const [leads] = useState(initialLeads);

  const open = opps.filter(o => !o.stage.startsWith("Closed"));
  const pipelineValue = open.reduce((s, o) => s + o.amount, 0);
  const weighted = open.reduce((s, o) => s + (o.amount * o.probability) / 100, 0);
  const won = opps.filter(o => o.stage === "Closed Won").reduce((s, o) => s + o.amount, 0);
  const winRate = Math.round(
    (opps.filter(o => o.stage === "Closed Won").length /
      (opps.filter(o => o.stage.startsWith("Closed")).length || 1)) *
      100,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales Pipeline</h1>
          <p className="text-sm text-muted-foreground">Opportunities & lead scoring</p>
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
        ].map(s => (
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

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban">Pipeline Board</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="list">Opportunities</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {pipelineStages.map(stage => {
              const stageOpps = opps.filter(o => o.stage === stage);
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
                    {stageOpps.map(o => (
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
                  {leads.map(l => (
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
                  {opps.map(o => (
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
      </Tabs>
    </div>
  );
}
