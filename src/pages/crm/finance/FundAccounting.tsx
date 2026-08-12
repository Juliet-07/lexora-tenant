import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  funds, capitalAccounts, capitalCalls, distributions, navHistory,
  managementFees, carriedInterest, lpReports, fundLifecycle, fmoney,
} from "@/data/financeMockData";

export default function FundAccounting() {
  const [fundId, setFundId] = useState(funds[0].id);
  const fund = funds.find(f => f.id === fundId)!;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Fund Accounting</h1>
          <p className="text-sm text-muted-foreground">
            Capital accounts, calls, distributions, NAV, fees and LP reporting
          </p>
        </div>
        <Select value={fundId} onValueChange={setFundId}>
          <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {funds.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          ["Committed", fund.committed], ["Called", fund.called],
          ["Distributed", fund.distributed], ["NAV", fund.nav],
        ].map(([l, v]) => (
          <Card key={l as string}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{l as string}</p>
              <p className="text-xl font-bold">{fmoney(v as number, fund.currency)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="setup">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="setup">Fund setup</TabsTrigger>
          <TabsTrigger value="capital">Capital accounts</TabsTrigger>
          <TabsTrigger value="calls">Capital calls</TabsTrigger>
          <TabsTrigger value="dist">Distributions & waterfall</TabsTrigger>
          <TabsTrigger value="nav">NAV & performance</TabsTrigger>
          <TabsTrigger value="fees">Fees & carry</TabsTrigger>
          <TabsTrigger value="lp">LP reporting</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Entity</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ["Legal structure", fund.structure], ["Jurisdiction", fund.jurisdiction],
                ["Strategy", fund.strategy], ["Target size", fmoney(fund.targetSize, fund.currency)],
                ["Vintage", String(fund.vintage)], ["Status", fund.status],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">{l}</span><span className="font-medium">{v}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">LPA terms & lifecycle</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Management fee</span><span className="font-medium">{fund.mgmtFeePct}%</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Carried interest</span><span className="font-medium">{fund.carryPct}%</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Preferred return (hurdle)</span><span className="font-medium">{fund.hurdlePct}%</span></div>
              <div className="pt-2 space-y-1">
                {fundLifecycle.map((s, i) => (
                  <div key={s} className="flex items-center gap-2 text-xs">
                    <span className="h-2 w-2 rounded-full bg-primary/60" />{i + 1}. {s}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capital" className="mt-4">
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Limited partner</TableHead><TableHead>Commitment</TableHead>
                    <TableHead>Called</TableHead><TableHead>Unfunded</TableHead>
                    <TableHead>Distributed</TableHead><TableHead>NAV</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {capitalAccounts.filter(c => c.fund === fundId).map(c => (
                    <TableRow key={c.lp}>
                      <TableCell className="text-sm font-medium">{c.lp}</TableCell>
                      <TableCell className="text-sm">{fmoney(c.commitment, fund.currency)}</TableCell>
                      <TableCell className="text-sm">{fmoney(c.called, fund.currency)}</TableCell>
                      <TableCell className="text-sm">{fmoney(c.commitment - c.called, fund.currency)}</TableCell>
                      <TableCell className="text-sm">{fmoney(c.distributed, fund.currency)}</TableCell>
                      <TableCell className="text-sm font-semibold">{fmoney(c.nav, fund.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calls" className="mt-4">
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Call</TableHead><TableHead>Purpose</TableHead>
                    <TableHead>Amount</TableHead><TableHead>Issued</TableHead>
                    <TableHead>Due</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {capitalCalls.filter(c => c.fund === fundId).map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm font-medium">{c.id}</TableCell>
                      <TableCell className="text-sm">{c.purpose}</TableCell>
                      <TableCell className="text-sm font-semibold">{fmoney(c.amount, fund.currency)}</TableCell>
                      <TableCell className="text-sm">{c.issued}</TableCell>
                      <TableCell className="text-sm">{c.due}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${c.status === "Fully funded" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                          {c.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dist" className="mt-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            Withholding on non-resident LP distributions is calculated and certificated by the Tax module.
          </p>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distributions</CardTitle>
              <p className="text-xs text-muted-foreground">
                Waterfall: return of capital → preferred return ({fund.hurdlePct}%) → GP catch-up → {fund.carryPct}% carry split
              </p>
            </CardHeader>
            <CardContent className="p-4 pt-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Distribution</TableHead><TableHead>Source</TableHead>
                    <TableHead>Gross</TableHead><TableHead>Return of capital</TableHead>
                    <TableHead>Preferred</TableHead><TableHead>Catch-up</TableHead>
                    <TableHead>Carry</TableHead><TableHead>Net to LPs</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {distributions.filter(d => d.fund === fundId).map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="text-sm font-medium">{d.id}</TableCell>
                      <TableCell className="text-sm">{d.source}</TableCell>
                      <TableCell className="text-sm">{fmoney(d.gross, fund.currency)}</TableCell>
                      <TableCell className="text-sm">{fmoney(d.roc, fund.currency)}</TableCell>
                      <TableCell className="text-sm">{fmoney(d.pref, fund.currency)}</TableCell>
                      <TableCell className="text-sm">{fmoney(d.catchUp, fund.currency)}</TableCell>
                      <TableCell className="text-sm">{fmoney(d.carry, fund.currency)}</TableCell>
                      <TableCell className="text-sm font-semibold">{fmoney(d.netToLps, fund.currency)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{d.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nav" className="mt-4">
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead><TableHead>NAV</TableHead>
                    <TableHead>DPI</TableHead><TableHead>RVPI</TableHead>
                    <TableHead>TVPI</TableHead><TableHead>Net IRR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {navHistory.filter(n => n.fund === fundId).map(n => (
                    <TableRow key={n.period}>
                      <TableCell className="text-sm font-medium">{n.period}</TableCell>
                      <TableCell className="text-sm">{fmoney(n.nav, fund.currency)}</TableCell>
                      <TableCell className="text-sm">{n.dpi.toFixed(2)}x</TableCell>
                      <TableCell className="text-sm">{n.rvpi.toFixed(2)}x</TableCell>
                      <TableCell className="text-sm font-semibold">{n.tvpi.toFixed(2)}x</TableCell>
                      <TableCell className="text-sm">{n.irr}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Management fees</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {managementFees.filter(m => m.fund === fundId).map(m => (
                <div key={m.period} className="rounded-lg border p-3 space-y-1">
                  <div className="flex justify-between"><span className="font-medium">{m.period}</span><Badge variant="outline" className="text-xs">{m.status}</Badge></div>
                  <p className="text-xs text-muted-foreground">Basis: {m.basis} at {m.rate}%</p>
                  <div className="flex justify-between"><span className="text-muted-foreground">Fee</span><span>{fmoney(m.amount, fund.currency)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Offsets</span><span>-{fmoney(m.offsets, fund.currency)}</span></div>
                  <div className="flex justify-between font-semibold"><span>Net payable</span><span>{fmoney(m.net, fund.currency)}</span></div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Carried interest</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {carriedInterest.filter(c => c.fund === fundId).map(c => (
                <div key={c.fund} className="space-y-2">
                  <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Accrued (unrealised)</span><span className="font-medium">{fmoney(c.accrued, fund.currency)}</span></div>
                  <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Crystallised (realised)</span><span className="font-medium">{fmoney(c.crystallised, fund.currency)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Hurdle met</span>
                    <Badge className={`text-xs ${c.hurdleMet ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {c.hurdleMet ? "Yes" : "Not yet"}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lp" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Period</TableHead><TableHead>Report</TableHead><TableHead>Issued</TableHead><TableHead>Status</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {lpReports.filter(r => r.fund === fundId).map(r => (
                    <TableRow key={r.period + r.type}>
                      <TableCell className="text-sm font-medium">{r.period}</TableCell>
                      <TableCell className="text-sm">{r.type}</TableCell>
                      <TableCell className="text-sm">{r.issued}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${r.status === "Distributed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                          {r.status}
                        </Badge>
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
