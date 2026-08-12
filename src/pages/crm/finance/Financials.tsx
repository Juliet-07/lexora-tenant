import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BudgetVsActual } from "@/components/finance/BudgetVsActual";
import {
  VarianceKpi, VarianceTable, VarianceComboChart, type ComboPoint,
} from "@/components/finance/VarianceViz";
import {
  plLines, balanceSheet, cashFlow, serviceLinePl, clientProfitability,
  financeKpis, writeOffs, fmoney, REPORTING_PERIOD,
} from "@/data/financeMockData";
import { useState } from "react";

const sum = (g: string) => plLines.filter(l => l.group === g).reduce((s, l) => s + l.actual, 0);

/* ── Linked reports: single source of truth lives elsewhere ── */
const linkedReports = [
  { title: "Aged receivables", desc: "Bands, trend and client detail live in Sales → Ageing.", to: "/crm/sales" },
  { title: "Aged payables", desc: "Vendor ageing lives in Purchases → Aged payables.", to: "/crm/purchases" },
  { title: "Cash forecast", desc: "30/60/90-day forecast and runway live in Banking.", to: "/crm/banking" },
  { title: "WHT register & certificates", desc: "Single WHT source of truth lives in Tax.", to: "/crm/tax" },
];

export default function Financials() {
  const [stage, setStage] = useState<string>("All");

  const revenue = sum("Revenue");
  const direct = sum("Direct cost");
  const opex = sum("Opex");
  const gross = revenue + direct;
  const pbt = gross + opex;
  const cit = pbt * 0.28;
  const net = pbt - cit;

  const assets = balanceSheet.assets.reduce((s, l) => s + l.current, 0);
  const liabilities = balanceSheet.liabilities.reduce((s, l) => s + l.current, 0);
  const equity = balanceSheet.equity.reduce((s, l) => s + l.current, 0);

  /* P&L in the shared variance language */
  const plRows = plLines.map(l => ({
    group: l.group === "Revenue" ? "Revenue" : "Expenses",
    label: l.line,
    actual: Math.abs(l.actual),
    comparison: Math.abs(l.budget),
    favourable: l.group === "Revenue" ? l.actual >= l.budget : Math.abs(l.actual) <= Math.abs(l.budget),
  }));
  const plChart: ComboPoint[] = plLines.map(l => {
    const variance = l.group === "Revenue" ? l.actual - l.budget : Math.abs(l.budget) - Math.abs(l.actual);
    return {
      label: l.line.split("—")[1]?.trim() ?? l.line,
      actual: Math.abs(l.actual),
      budget: Math.abs(l.budget),
      variance,
      favourable: variance >= 0,
    };
  });

  /* Service line P&L */
  const svcRows = serviceLinePl.map(s => {
    const netM = s.revenue - s.directCost - s.overhead;
    const target = s.revenue * 0.3;
    return {
      label: s.line,
      actual: netM,
      comparison: target,
      favourable: netM >= target,
      extra: `${Math.round((netM / s.revenue) * 100)}%`,
    };
  });
  const svcChart: ComboPoint[] = serviceLinePl.map(s => {
    const netM = s.revenue - s.directCost - s.overhead;
    const target = s.revenue * 0.3;
    return { label: s.line.split(" ")[0], actual: netM, budget: target, variance: netM - target, favourable: netM >= target };
  });

  /* Client profitability */
  const cliRows = [...clientProfitability]
    .sort((a, b) => (b.revenue - b.cost) - (a.revenue - a.cost))
    .map(c => {
      const margin = c.revenue - c.cost;
      const target = c.revenue * 0.35;
      return {
        label: c.client,
        actual: margin,
        comparison: target,
        favourable: margin >= target,
        extra: `${c.recovery}% recovery`,
      };
    });
  const cliChart: ComboPoint[] = clientProfitability.map(c => {
    const margin = c.revenue - c.cost;
    const target = c.revenue * 0.35;
    return { label: c.client.split(" ")[0], actual: margin, budget: target, variance: margin - target, favourable: margin >= target };
  });

  const stages = ["All", "WIP write-down", "Credit note", "Bad debt write-off"];
  const filteredWriteOffs = stage === "All" ? writeOffs : writeOffs.filter(w => w.stage === stage);
  const writeOffTotal = filteredWriteOffs.reduce((s, w) => s + w.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reporting</h1>
        <p className="text-sm text-muted-foreground">
          Financial statements, budget variance, profitability and the write-off audit trail — {REPORTING_PERIOD}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <VarianceKpi label="Revenue" value={fmoney(revenue)} />
        <VarianceKpi label="Gross profit" value={fmoney(gross)} qualifier={`${Math.round((gross / revenue) * 100)}% margin`} />
        <VarianceKpi label="Profit before tax" value={fmoney(pbt)} />
        <VarianceKpi label="Net profit (after CIT)" value={fmoney(net)} qualifier="CIT at 28%" />
      </div>

      <Tabs defaultValue="budget">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="budget">Budget vs actual</TabsTrigger>
          <TabsTrigger value="pl">P&amp;L</TabsTrigger>
          <TabsTrigger value="bs">Balance sheet</TabsTrigger>
          <TabsTrigger value="cf">Cash flow</TabsTrigger>
          <TabsTrigger value="service">Service line P&amp;L</TabsTrigger>
          <TabsTrigger value="clients">Client profitability</TabsTrigger>
          <TabsTrigger value="kpis">KPI dashboard</TabsTrigger>
          <TabsTrigger value="writeoffs">Write-offs</TabsTrigger>
          <TabsTrigger value="linked">Linked reports</TabsTrigger>
        </TabsList>

        <TabsContent value="budget" className="mt-4">
          <BudgetVsActual />
        </TabsContent>

        <TabsContent value="pl" className="mt-4 space-y-5">
          <VarianceComboChart title="Income statement — actual vs budget by line" data={plChart} />
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Line item detail</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <VarianceTable rows={plRows} money={fmoney} actualHeader="YTD actual" comparisonHeader="YTD budget" />
              <div className="mt-4 space-y-1">
                {[["Gross profit", gross], ["Profit before tax", pbt], ["CIT at 28%", -cit], ["Net profit", net]].map(([l, v]) => (
                  <div key={l as string} className="flex justify-between border-t pt-2 text-sm font-semibold">
                    <span>{l as string}</span><span>{fmoney(v as number)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bs" className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[
            ["Assets", balanceSheet.assets, assets],
            ["Liabilities", balanceSheet.liabilities, liabilities],
            ["Equity", balanceSheet.equity, equity],
          ].map(([title, rows, total]) => (
            <Card key={title as string}>
              <CardHeader><CardTitle className="text-base">{title as string}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(rows as { line: string; current: number; prior: number }[]).map(r => (
                  <div key={r.line} className="flex items-center justify-between border-b pb-2 text-sm">
                    <span className="text-muted-foreground">{r.line}</span>
                    <span className="font-medium">{fmoney(r.current)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1 text-sm font-semibold">
                  <span>Total</span><span>{fmoney(total as number)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="cf" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Cash flow statement</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {cashFlow.map(c => (
                <div key={c.line} className="flex items-center justify-between border-b pb-2 text-sm">
                  <span className="text-muted-foreground">{c.line}</span>
                  <span className={c.amount < 0 ? "text-destructive font-medium" : "text-success font-medium"}>
                    {fmoney(c.amount)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-1 text-sm font-semibold">
                <span>Net movement in cash</span>
                <span>{fmoney(cashFlow.reduce((s, c) => s + c.amount, 0))}</span>
              </div>
              <p className="pt-2 text-xs text-muted-foreground">
                Forward-looking cash is not repeated here — see the 30/60/90-day forecast in Banking.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="service" className="mt-4 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {serviceLinePl.map(s => {
              const netM = s.revenue - s.directCost - s.overhead;
              return (
                <VarianceKpi
                  key={s.line}
                  label={s.line}
                  value={fmoney(netM)}
                  delta={`${Math.round((netM / s.revenue) * 100)}% net margin`}
                  favourable={netM / s.revenue >= 0.3}
                  qualifier={`Revenue ${fmoney(s.revenue)}`}
                />
              );
            })}
          </div>
          <VarianceComboChart title="Net margin vs 30% target by service line" data={svcChart} budgetName="Target" />
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Service line detail</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <VarianceTable rows={svcRows} money={fmoney} actualHeader="Net margin" comparisonHeader="Target (30%)" extraHeader="Margin %" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="mt-4 space-y-5">
          <VarianceComboChart title="Client margin vs 35% target" data={cliChart} budgetName="Target" />
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Client profitability detail</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <VarianceTable rows={cliRows} money={fmoney} actualHeader="Margin" comparisonHeader="Target (35%)" extraHeader="Recovery" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kpis" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {financeKpis.map(k => (
              <Card key={k.kpi}>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">{k.kpi}</p>
                  <p className="text-xl font-bold">{k.value}</p>
                  <p className="text-xs text-muted-foreground">Target {k.target} · {k.trend}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="writeoffs" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Write-downs &amp; write-offs — single audit trail</CardTitle>
              <p className="text-sm text-muted-foreground">
                One lifecycle, three checkpoints: unbilled WIP, issued invoice (credit note), and uncollectible
                receivable (bad debt). Every entry requires a partner approval and a reason.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {stages.map(s => (
                  <Button
                    key={s}
                    size="sm"
                    variant={stage === s ? "default" : "outline"}
                    onClick={() => setStage(s)}
                  >
                    {s}
                  </Button>
                ))}
                <span className="ml-auto text-sm text-muted-foreground">
                  Total value <span className="font-semibold text-foreground">{fmoney(writeOffTotal)}</span>
                </span>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead><TableHead>Stage</TableHead>
                      <TableHead>Reference</TableHead><TableHead>Client / mandate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Reason</TableHead><TableHead>Approved by</TableHead>
                      <TableHead>Date</TableHead><TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWriteOffs.map(w => (
                      <TableRow key={w.id}>
                        <TableCell className="text-sm font-medium">{w.id}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{w.stage}</Badge></TableCell>
                        <TableCell className="text-sm">{w.reference}</TableCell>
                        <TableCell className="text-sm">
                          {w.client}
                          <span className="block text-xs text-muted-foreground">{w.mandate}</span>
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold">{fmoney(w.amount)}</TableCell>
                        <TableCell className="text-sm max-w-[240px]">{w.reason}</TableCell>
                        <TableCell className="text-sm">{w.approvedBy}</TableCell>
                        <TableCell className="text-sm">{w.date}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${w.status === "Pending approval" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                            {w.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="linked" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {linkedReports.map(r => (
              <Card key={r.title}>
                <CardContent className="p-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-sm text-muted-foreground">{r.desc}</p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link to={r.to}>Open <ArrowUpRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
