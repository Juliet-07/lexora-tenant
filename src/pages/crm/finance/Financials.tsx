import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  plLines, balanceSheet, cashFlow, serviceLinePl, clientProfitability,
  financeKpis, budgetVariance, fmoney,
} from "@/data/financeMockData";

const sum = (g: string) => plLines.filter(l => l.group === g).reduce((s, l) => s + l.actual, 0);

export default function Financials() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financials</h1>
        <p className="text-sm text-muted-foreground">
          Documented financial statements: P&amp;L, balance sheet, cash flow, budgets and KPIs — FY2026 to date
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          ["Revenue", revenue], ["Gross profit", gross], ["Profit before tax", pbt], ["Net profit (after CIT)", net],
        ].map(([l, v]) => (
          <Card key={l as string}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{l as string}</p>
              <p className="text-xl font-bold">{fmoney(v as number)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="pl">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="pl">P&amp;L</TabsTrigger>
          <TabsTrigger value="bs">Balance sheet</TabsTrigger>
          <TabsTrigger value="cf">Cash flow</TabsTrigger>
          <TabsTrigger value="budget">Budget variance</TabsTrigger>
          <TabsTrigger value="service">Service line P&amp;L</TabsTrigger>
          <TabsTrigger value="clients">Client profitability</TabsTrigger>
          <TabsTrigger value="kpis">KPIs</TabsTrigger>
        </TabsList>

        <TabsContent value="pl" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Income statement — actual vs budget vs prior</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Line</TableHead><TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Budget</TableHead><TableHead className="text-right">Prior year</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plLines.map(l => (
                    <TableRow key={l.line}>
                      <TableCell className="text-sm">{l.line}</TableCell>
                      <TableCell className="text-sm text-right font-medium">{fmoney(l.actual)}</TableCell>
                      <TableCell className="text-sm text-right text-muted-foreground">{fmoney(l.budget)}</TableCell>
                      <TableCell className="text-sm text-right text-muted-foreground">{fmoney(l.prior)}</TableCell>
                      <TableCell className={`text-sm text-right ${l.actual - l.budget >= 0 ? "text-success" : "text-destructive"}`}>
                        {fmoney(l.actual - l.budget)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {[["Gross profit", gross], ["Profit before tax", pbt], ["CIT at 28%", -cit], ["Net profit", net]].map(([l, v]) => (
                    <TableRow key={l as string} className="font-semibold">
                      <TableCell className="text-sm">{l as string}</TableCell>
                      <TableCell className="text-sm text-right" colSpan={4}>{fmoney(v as number)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Budget manager</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {budgetVariance.map(b => (
                <div key={b.line}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{b.line}</span>
                    <span className="text-muted-foreground">
                      {fmoney(b.actual)} of {fmoney(b.budget)}
                    </span>
                  </div>
                  <Progress value={Math.min((b.actual / b.budget) * 100, 130)} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="service" className="mt-4">
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service line</TableHead><TableHead>Revenue</TableHead>
                    <TableHead>Direct cost</TableHead><TableHead>Contribution</TableHead>
                    <TableHead>Overhead</TableHead><TableHead>Net margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceLinePl.map(s => {
                    const contribution = s.revenue - s.directCost;
                    const netM = contribution - s.overhead;
                    return (
                      <TableRow key={s.line}>
                        <TableCell className="text-sm font-medium">{s.line}</TableCell>
                        <TableCell className="text-sm">{fmoney(s.revenue)}</TableCell>
                        <TableCell className="text-sm">{fmoney(s.directCost)}</TableCell>
                        <TableCell className="text-sm">{fmoney(contribution)}</TableCell>
                        <TableCell className="text-sm">{fmoney(s.overhead)}</TableCell>
                        <TableCell className="text-sm font-semibold">
                          {fmoney(netM)} ({Math.round((netM / s.revenue) * 100)}%)
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="mt-4">
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead><TableHead>Revenue</TableHead>
                    <TableHead>Cost</TableHead><TableHead>Margin</TableHead>
                    <TableHead>Recovery rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...clientProfitability]
                    .sort((a, b) => b.revenue - b.cost - (a.revenue - a.cost))
                    .map(c => (
                      <TableRow key={c.client}>
                        <TableCell className="text-sm font-medium">{c.client}</TableCell>
                        <TableCell className="text-sm">{fmoney(c.revenue)}</TableCell>
                        <TableCell className="text-sm">{fmoney(c.cost)}</TableCell>
                        <TableCell className="text-sm font-semibold">
                          {fmoney(c.revenue - c.cost)} ({Math.round(((c.revenue - c.cost) / c.revenue) * 100)}%)
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${c.recovery >= 85 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                            {c.recovery}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
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
      </Tabs>
    </div>
  );
}
