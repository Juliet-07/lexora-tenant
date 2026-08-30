import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Info,
  Clock,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchProfitAndLoss,
  fetchBalanceSheet,
  fetchCashFlow,
  fetchWriteOffs,
  fetchServiceLineReport,
  fetchClientProfitability,
  fetchKpiDashboard,
  type WriteOffStage,
} from "@/lib/crm/finance-api";

const money = (n: number, c = "USD") =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: c,
    maximumFractionDigits: 0,
  });
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

const startOfYear = () => `${new Date().getFullYear()}-01-01`;
const today = () => new Date().toISOString().slice(0, 10);

const linkedReports = [
  {
    title: "Aged receivables",
    desc: "Bands, trend and client detail live in Sales → Ageing.",
    to: "/crm/sales",
  },
  {
    title: "Aged payables",
    desc: "Vendor ageing lives in Purchases → Aged payables.",
    to: "/crm/purchases",
  },
  {
    title: "Cash forecast",
    desc: "30/60/90-day forecast and runway live in Banking.",
    to: "/crm/banking",
  },
  {
    title: "WHT register & certificates",
    desc: "Single WHT source of truth lives in Tax.",
    to: "/crm/tax",
  },
];

const writeOffStages: WriteOffStage[] = [
  "WIP write-down",
  "Credit note",
  "Bad debt write-off",
];

export default function Financials() {
  const [from, setFrom] = useState(startOfYear());
  const [to, setTo] = useState(today());
  const [asOf, setAsOf] = useState(today());
  const [woStage, setWoStage] = useState<WriteOffStage | "All">("All");

  const { data: pl } = useQuery({
    queryKey: ["pl", from, to],
    queryFn: () => fetchProfitAndLoss(from, to),
  });
  const { data: bs } = useQuery({
    queryKey: ["bs", asOf],
    queryFn: () => fetchBalanceSheet(asOf),
  });
  const { data: cf } = useQuery({
    queryKey: ["cf", from, to],
    queryFn: () => fetchCashFlow(from, to),
  });
  const { data: serviceLine } = useQuery({
    queryKey: ["serviceLine", from, to],
    queryFn: () => fetchServiceLineReport(from, to),
  });
  const { data: clientProfitability } = useQuery({
    queryKey: ["clientProfitability", from, to],
    queryFn: () => fetchClientProfitability(from, to),
  });
  const { data: kpis } = useQuery({
    queryKey: ["kpis", from, to],
    queryFn: () => fetchKpiDashboard(from, to),
  });
  const { data: writeOffs = [] } = useQuery({
    queryKey: ["writeOffs", woStage],
    queryFn: () => fetchWriteOffs(woStage === "All" ? undefined : woStage),
  });
  const writeOffTotal = writeOffs.reduce((s, w) => s + w.amount, 0);

  const PeriodPicker = () => (
    <div className="flex items-center gap-2">
      <Input
        type="date"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        className="w-40"
      />
      <span className="text-sm text-muted-foreground">to</span>
      <Input
        type="date"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        className="w-40"
      />
    </div>
  );

  const ContributionTable = ({
    rows,
    labelKey,
    labelHeader,
  }: {
    rows: {
      revenue: number;
      directExpenses: number;
      contribution: number;
      contributionMargin: number;
      [k: string]: any;
    }[];
    labelKey: string;
    labelHeader: string;
  }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{labelHeader}</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
          <TableHead className="text-right">Direct expenses</TableHead>
          <TableHead className="text-right">Contribution</TableHead>
          <TableHead className="text-right">Margin</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r[labelKey]}>
            <TableCell className="text-sm font-medium">{r[labelKey]}</TableCell>
            <TableCell className="text-right text-sm">
              {money(r.revenue)}
            </TableCell>
            <TableCell className="text-right text-sm text-muted-foreground">
              {r.directExpenses ? money(r.directExpenses) : "—"}
            </TableCell>
            <TableCell
              className={`text-right text-sm font-semibold ${r.contribution < 0 ? "text-destructive" : ""}`}
            >
              {money(r.contribution)}
            </TableCell>
            <TableCell className="text-right text-sm">
              <Badge
                variant="outline"
                className={
                  r.contributionMargin < 0
                    ? "text-destructive"
                    : r.contributionMargin < 0.2
                      ? "text-warning"
                      : "text-success"
                }
              >
                {pct(r.contributionMargin)}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
        {!rows.length && (
          <TableRow>
            <TableCell
              colSpan={5}
              className="py-8 text-center text-sm text-muted-foreground"
            >
              No invoiced revenue in this period yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  const KpiCard = ({
    label,
    value,
    sub,
    tone,
  }: {
    label: string;
    value: string;
    sub?: string;
    tone?: "success" | "warning" | "destructive";
  }) => (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p
          className={`text-2xl font-bold ${tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "destructive" ? "text-destructive" : ""}`}
        >
          {value}
        </p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financials</h1>
        <p className="text-sm text-muted-foreground">
          Profit & loss, balance sheet, cash flow, service line and client
          contribution, KPIs, and the write-off audit trail — computed live from
          the real general ledger
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Revenue (period)</p>
            <p className="text-xl font-bold text-success">
              {pl ? money(pl.totalRevenue) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Profit before tax</p>
            <p className="text-xl font-bold">
              {pl ? money(pl.profitBeforeTax) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total assets</p>
            <p className="text-xl font-bold">
              {bs ? money(bs.totalAssets) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Net cash movement</p>
            <p
              className={`text-xl font-bold ${cf && cf.netMovement < 0 ? "text-destructive" : "text-success"}`}
            >
              {cf ? money(cf.netMovement) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pl">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="pl">P&amp;L</TabsTrigger>
          <TabsTrigger value="bs">Balance sheet</TabsTrigger>
          <TabsTrigger value="cf">Cash flow</TabsTrigger>
          <TabsTrigger value="serviceline">Service line P&amp;L</TabsTrigger>
          <TabsTrigger value="clientprofit">Client profitability</TabsTrigger>
          <TabsTrigger value="kpis">KPI dashboard</TabsTrigger>
          <TabsTrigger value="budget">Budget vs actual</TabsTrigger>
          <TabsTrigger value="writeoffs">Write-offs</TabsTrigger>
          <TabsTrigger value="linked">Linked reports</TabsTrigger>
        </TabsList>

        {/* P&L */}
        <TabsContent value="pl" className="mt-4 space-y-3">
          <PeriodPicker />
          {pl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Profit & loss — {pl.from} to {pl.to}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    REVENUE
                  </p>
                  <Table>
                    <TableBody>
                      {pl.revenueRows.map((r) => (
                        <TableRow key={r.code}>
                          <TableCell className="text-sm text-primary">
                            {r.code}
                          </TableCell>
                          <TableCell className="text-sm">{r.name}</TableCell>
                          <TableCell className="text-right text-sm">
                            {money(r.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!pl.revenueRows.length && (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="text-sm text-muted-foreground"
                          >
                            No revenue posted in this period.
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow className="border-t font-semibold">
                        <TableCell colSpan={2}>Total revenue</TableCell>
                        <TableCell className="text-right">
                          {money(pl.totalRevenue)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    EXPENSES
                  </p>
                  <Table>
                    <TableBody>
                      {pl.expenseRows.map((r) => (
                        <TableRow key={r.code}>
                          <TableCell className="text-sm text-primary">
                            {r.code}
                          </TableCell>
                          <TableCell className="text-sm">{r.name}</TableCell>
                          <TableCell className="text-right text-sm">
                            {money(r.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!pl.expenseRows.length && (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="text-sm text-muted-foreground"
                          >
                            No expenses posted in this period.
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow className="border-t font-semibold">
                        <TableCell colSpan={2}>Total expenses</TableCell>
                        <TableCell className="text-right">
                          {money(pl.totalExpenses)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-between border-t-2 pt-2 text-base font-bold">
                  <span>Profit before tax</span>
                  <span>{money(pl.profitBeforeTax)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Accrual basis — revenue counts when invoiced, not when paid.
                  CIT provision in Tax uses a separate cash-basis figure and
                  won't match this exactly.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Balance sheet */}
        <TabsContent value="bs" className="mt-4 space-y-3">
          <Input
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            className="w-40"
          />
          {bs && (
            <>
              <div
                className={`rounded-lg border p-3 text-sm ${bs.balanced ? "border-success/40 bg-success/5 text-success" : "border-destructive/40 bg-destructive/5 text-destructive"}`}
              >
                {bs.balanced
                  ? `Balanced. Assets (${money(bs.totalAssets)}) equal Liabilities + Equity (${money(bs.totalLiabilities + bs.totalEquity)}).`
                  : `Not balanced — Assets ${money(bs.totalAssets)} vs Liabilities + Equity ${money(bs.totalLiabilities + bs.totalEquity)}.`}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {[
                  ["Assets", bs.assets, bs.totalAssets],
                  ["Liabilities", bs.liabilities, bs.totalLiabilities],
                  ["Equity", bs.equity, bs.totalEquity],
                ].map(([title, rows, total]) => (
                  <Card key={title as string}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {title as string}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(
                        rows as { code: string; name: string; amount: number }[]
                      ).map((r) => (
                        <div
                          key={r.code}
                          className="flex items-center justify-between border-b pb-2 text-sm"
                        >
                          <span className="text-muted-foreground">
                            {r.name}
                          </span>
                          <span className="font-medium">{money(r.amount)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-1 text-sm font-semibold">
                        <span>Total</span>
                        <span>{money(total as number)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Equity includes "Retained earnings (current period)" — the
                cumulative real P&L result up to this date, computed live since
                there's no formal period-close journal.
              </p>
            </>
          )}
        </TabsContent>

        {/* Cash flow */}
        <TabsContent value="cf" className="mt-4 space-y-3">
          <PeriodPicker />
          {cf && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Cash flow — {cf.from} to {cf.to}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {cf.lines.map((l) => (
                  <div
                    key={l.source}
                    className="flex items-center justify-between border-b pb-2 text-sm"
                  >
                    <span className="text-muted-foreground">{l.source}</span>
                    <span
                      className={
                        l.netMovement < 0
                          ? "text-destructive font-medium"
                          : "text-success font-medium"
                      }
                    >
                      {money(l.netMovement)}
                    </span>
                  </div>
                ))}
                {!cf.lines.length && (
                  <p className="text-sm text-muted-foreground">
                    No bank movement in this period.
                  </p>
                )}
                <div className="flex items-center justify-between pt-1 text-sm font-semibold">
                  <span>Net movement in cash</span>
                  <span>{money(cf.netMovement)}</span>
                </div>
                <p className="pt-2 text-xs text-muted-foreground">
                  Direct method — real movement on the Bank - operating account,
                  grouped by source. Trust accounts are excluded, since that's
                  client money, not the firm's own cash. Forward-looking cash
                  isn't repeated here — see the 30/60/90-day forecast in
                  Banking.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Service line P&L */}
        <TabsContent value="serviceline" className="mt-4 space-y-3">
          <PeriodPicker />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Contribution by service line
              </CardTitle>
            </CardHeader>
            <CardContent>
              {serviceLine && (
                <>
                  <ContributionTable
                    rows={serviceLine.rows}
                    labelKey="serviceLine"
                    labelHeader="Service line"
                  />
                  <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />{" "}
                    {serviceLine.note}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Client profitability */}
        <TabsContent value="clientprofit" className="mt-4 space-y-3">
          <PeriodPicker />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Contribution by client
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clientProfitability && (
                <>
                  <ContributionTable
                    rows={clientProfitability.rows}
                    labelKey="clientName"
                    labelHeader="Client"
                  />
                  <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />{" "}
                    {clientProfitability.note}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* KPI dashboard */}
        <TabsContent value="kpis" className="mt-4 space-y-3">
          <PeriodPicker />
          {kpis && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <KpiCard
                  label="Gross margin"
                  value={pct(kpis.grossMargin)}
                  sub={kpis.grossMarginNote}
                  tone={
                    kpis.grossMargin >= 0.4
                      ? "success"
                      : kpis.grossMargin >= 0.2
                        ? "warning"
                        : "destructive"
                  }
                />
                <KpiCard
                  label="Net margin"
                  value={pct(kpis.netMargin)}
                  sub="Profit before tax ÷ revenue, same figures as the P&L tab"
                  tone={
                    kpis.netMargin >= 0.15
                      ? "success"
                      : kpis.netMargin >= 0
                        ? "warning"
                        : "destructive"
                  }
                />
                <KpiCard
                  label="Revenue per employee"
                  value={money(kpis.revenuePerEmployee)}
                  sub={`${kpis.activeEmployees} active employees`}
                />
                <KpiCard
                  label="Lockup days"
                  value={kpis.lockupDays.toFixed(0)}
                  sub={`${kpis.wipDays.toFixed(0)} WIP days + ${kpis.arDays.toFixed(0)} AR days`}
                  tone={
                    kpis.lockupDays <= 60
                      ? "success"
                      : kpis.lockupDays <= 90
                        ? "warning"
                        : "destructive"
                  }
                />
                <KpiCard
                  label="Realization rate"
                  value={pct(kpis.realizationRate)}
                  sub="Actual invoiced value vs standard (hours × rate) value of billed time"
                  tone={
                    kpis.realizationRate >= 0.9
                      ? "success"
                      : kpis.realizationRate >= 0.75
                        ? "warning"
                        : "destructive"
                  }
                />
                <KpiCard
                  label="Collection rate"
                  value={pct(kpis.collectionRate)}
                  sub="Cash collected vs amount invoiced this period"
                  tone={
                    kpis.collectionRate >= 0.85
                      ? "success"
                      : kpis.collectionRate >= 0.6
                        ? "warning"
                        : "destructive"
                  }
                />
              </div>
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Every figure above is computed live from real invoices, time
                entries, and the general ledger for {kpis.from} to {kpis.to} —
                none are entered manually.
              </p>
            </>
          )}
        </TabsContent>

        {/* Budget vs actual — real placeholder, not fake data */}
        <TabsContent value="budget" className="mt-4">
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="font-medium">Budget vs actual isn't set up yet</p>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                There's no budget captured anywhere in the system yet, so this
                tab has nothing real to show — showing sample numbers here would
                look like a working feature when it isn't.
              </p>
              <div className="mx-auto max-w-md rounded-lg border bg-muted/30 p-4 text-left text-xs text-muted-foreground">
                <p className="font-medium text-foreground">
                  Waiting on a product decision:
                </p>
                <p className="mt-1">
                  Should budgets be set per account per month, or as a simpler
                  lump revenue/expense figure per month? And should each new
                  period start from the prior period's numbers, or be entered
                  fresh?
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Write-offs */}
        <TabsContent value="writeoffs" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Write-downs & write-offs — single audit trail
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                One lifecycle, three checkpoints: unbilled WIP, issued invoice
                (credit note), and uncollectible receivable (bad debt).
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {(["All", ...writeOffStages] as const).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={woStage === s ? "default" : "outline"}
                    onClick={() => setWoStage(s)}
                  >
                    {s}
                  </Button>
                ))}
                <span className="ml-auto text-sm text-muted-foreground">
                  Total value{" "}
                  <span className="font-semibold text-foreground">
                    {money(writeOffTotal)}
                  </span>
                </span>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ref</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Client / mandate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Approved by</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {writeOffs.map((w) => (
                      <TableRow key={w._id}>
                        <TableCell className="text-sm font-medium">
                          {w.ref}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {w.stage}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{w.reference}</TableCell>
                        <TableCell className="text-sm">
                          {w.clientName}
                          <span className="block text-xs text-muted-foreground">
                            {w.mandateName}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold">
                          {money(w.amount)}
                        </TableCell>
                        <TableCell className="text-sm max-w-[240px]">
                          {w.reason}
                        </TableCell>
                        <TableCell className="text-sm">
                          {w.approvedBy}
                        </TableCell>
                        <TableCell className="text-sm">
                          {w.createdAt?.slice(0, 10)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs ${w.status === "Pending approval" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}
                          >
                            {w.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!writeOffs.length && (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          No write-offs recorded yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Linked reports */}
        <TabsContent value="linked" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {linkedReports.map((r) => (
              <Card key={r.title}>
                <CardContent className="p-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-sm text-muted-foreground">{r.desc}</p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link to={r.to}>
                      Open <ArrowUpRight className="ml-1 h-4 w-4" />
                    </Link>
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
