import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Info,
  Download,
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
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

// ── CSV export — each tab downloads only its own rows, not the
// whole page. Client-side, so it always matches exactly what's on
// screen for the current filters. ──────────────────────────────
const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const downloadCsv = (
  filename: string,
  headers: string[],
  rows: (string | number)[][],
) => {
  const csv = [headers, ...rows]
    .map((r) => r.map(csvCell).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const DownloadButton = ({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) => (
  <Button size="sm" variant="outline" onClick={onClick} disabled={disabled}>
    <Download className="mr-2 h-4 w-4" /> Download this tab
  </Button>
);

const CHART_COLORS = [
  "#4B0082",
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#c62828",
  "#8b5cf6",
];

const money = (n: number, c = "USD") =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: c,
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
          <TabsTrigger value="writeoffs">Write-offs</TabsTrigger>
          <TabsTrigger value="linked">Linked reports</TabsTrigger>
        </TabsList>

        {/* P&L */}
        <TabsContent value="pl" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <PeriodPicker />
            <DownloadButton
              disabled={!pl}
              onClick={() =>
                pl &&
                downloadCsv(
                  `pl_${pl.from}_${pl.to}.csv`,
                  ["Type", "Code", "Name", "Amount"],
                  [
                    ...pl.revenueRows.map((r) => [
                      "Revenue",
                      r.code,
                      r.name,
                      r.amount,
                    ]),
                    ...pl.expenseRows.map((r) => [
                      "Expense",
                      r.code,
                      r.name,
                      r.amount,
                    ]),
                    ["Total", "", "Total revenue", pl.totalRevenue],
                    ["Total", "", "Total expenses", pl.totalExpenses],
                    ["Total", "", "Profit before tax", pl.profitBeforeTax],
                  ],
                )
              }
            />
          </div>
          {pl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Profit & loss — {pl.from} to {pl.to}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={[
                      { name: "Revenue", value: pl.totalRevenue },
                      { name: "Expenses", value: pl.totalExpenses },
                      { name: "Profit before tax", value: pl.profitBeforeTax },
                    ]}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="opacity-30"
                    />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(v: number) => money(v)} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {[
                        pl.totalRevenue,
                        pl.totalExpenses,
                        pl.profitBeforeTax,
                      ].map((v, i) => (
                        <Cell
                          key={i}
                          fill={v < 0 ? "#c62828" : CHART_COLORS[i]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Input
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className="w-40"
            />
            <DownloadButton
              disabled={!bs}
              onClick={() =>
                bs &&
                downloadCsv(
                  `balance_sheet_${asOf}.csv`,
                  ["Section", "Code", "Name", "Amount"],
                  [
                    ...bs.assets.map((r) => [
                      "Assets",
                      r.code,
                      r.name,
                      r.amount,
                    ]),
                    ...bs.liabilities.map((r) => [
                      "Liabilities",
                      r.code,
                      r.name,
                      r.amount,
                    ]),
                    ...bs.equity.map((r) => [
                      "Equity",
                      r.code,
                      r.name,
                      r.amount,
                    ]),
                    ["Total", "", "Total assets", bs.totalAssets],
                    ["Total", "", "Total liabilities", bs.totalLiabilities],
                    ["Total", "", "Total equity", bs.totalEquity],
                  ],
                )
              }
            />
          </div>
          {bs && (
            <>
              <div
                className={`rounded-lg border p-3 text-sm ${bs.balanced ? "border-success/40 bg-success/5 text-success" : "border-destructive/40 bg-destructive/5 text-destructive"}`}
              >
                {bs.balanced
                  ? `Balanced. Assets (${money(bs.totalAssets)}) equal Liabilities + Equity (${money(bs.totalLiabilities + bs.totalEquity)}).`
                  : `Not balanced — Assets ${money(bs.totalAssets)} vs Liabilities + Equity ${money(bs.totalLiabilities + bs.totalEquity)}.`}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={[
                    { name: "Assets", value: bs.totalAssets },
                    { name: "Liabilities", value: bs.totalLiabilities },
                    { name: "Equity", value: bs.totalEquity },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {[bs.totalAssets, bs.totalLiabilities, bs.totalEquity].map(
                      (v, i) => (
                        <Cell key={i} fill={CHART_COLORS[i]} />
                      ),
                    )}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <PeriodPicker />
            <DownloadButton
              disabled={!cf}
              onClick={() =>
                cf &&
                downloadCsv(
                  `cash_flow_${cf.from}_${cf.to}.csv`,
                  ["Source", "Net movement"],
                  [
                    ...cf.lines.map((l) => [l.source, l.netMovement]),
                    ["Net movement in cash", cf.netMovement],
                  ],
                )
              }
            />
          </div>
          {cf && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Cash flow — {cf.from} to {cf.to}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {cf.lines.length > 0 && (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={cf.lines.map((l) => ({
                        name: l.source,
                        value: l.netMovement,
                      }))}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="opacity-30"
                      />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip formatter={(v: number) => money(v)} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {cf.lines.map((l, i) => (
                          <Cell
                            key={i}
                            fill={l.netMovement < 0 ? "#c62828" : "#1a7f37"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <PeriodPicker />
            <DownloadButton
              disabled={!serviceLine?.rows.length}
              onClick={() =>
                serviceLine &&
                downloadCsv(
                  `service_line_pl_${from}_${to}.csv`,
                  [
                    "Service line",
                    "Revenue",
                    "Direct expenses",
                    "Contribution",
                    "Margin",
                  ],
                  serviceLine.rows.map((r) => [
                    r.serviceLine,
                    r.revenue,
                    r.directExpenses,
                    r.contribution,
                    r.contributionMargin,
                  ]),
                )
              }
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Contribution by service line
              </CardTitle>
            </CardHeader>
            <CardContent>
              {serviceLine && (
                <>
                  {serviceLine.rows.length > 0 && (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart
                        data={serviceLine.rows.map((r) => ({
                          name: r.serviceLine,
                          value: r.contribution,
                        }))}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="opacity-30"
                        />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip formatter={(v: number) => money(v)} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {serviceLine.rows.map((r, i) => (
                            <Cell
                              key={i}
                              fill={
                                r.contribution < 0
                                  ? "#c62828"
                                  : CHART_COLORS[i % CHART_COLORS.length]
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <PeriodPicker />
            <DownloadButton
              disabled={!clientProfitability?.rows.length}
              onClick={() =>
                clientProfitability &&
                downloadCsv(
                  `client_profitability_${from}_${to}.csv`,
                  [
                    "Client",
                    "Revenue",
                    "Direct expenses",
                    "Contribution",
                    "Margin",
                  ],
                  clientProfitability.rows.map((r) => [
                    r.clientName,
                    r.revenue,
                    r.directExpenses,
                    r.contribution,
                    r.contributionMargin,
                  ]),
                )
              }
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Contribution by client
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clientProfitability && (
                <>
                  {clientProfitability.rows.length > 0 && (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart
                        data={clientProfitability.rows
                          .slice(0, 12)
                          .map((r) => ({
                            name: r.clientName,
                            value: r.contribution,
                          }))}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="opacity-30"
                        />
                        <XAxis
                          dataKey="name"
                          fontSize={11}
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis fontSize={12} />
                        <Tooltip formatter={(v: number) => money(v)} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {clientProfitability.rows.slice(0, 12).map((r, i) => (
                            <Cell
                              key={i}
                              fill={
                                r.contribution < 0
                                  ? "#c62828"
                                  : CHART_COLORS[i % CHART_COLORS.length]
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <PeriodPicker />
            <DownloadButton
              disabled={!kpis}
              onClick={() =>
                kpis &&
                downloadCsv(
                  `kpi_dashboard_${kpis.from}_${kpis.to}.csv`,
                  ["KPI", "Value"],
                  [
                    ["Gross margin", pct(kpis.grossMargin)],
                    ["Net margin", pct(kpis.netMargin)],
                    ["Revenue per employee", kpis.revenuePerEmployee],
                    ["Active employees", kpis.activeEmployees],
                    ["Lockup days", kpis.lockupDays],
                    ["WIP days", kpis.wipDays],
                    ["AR days", kpis.arDays],
                    ["Realization rate", pct(kpis.realizationRate)],
                    ["Collection rate", pct(kpis.collectionRate)],
                  ],
                )
              }
            />
          </div>
          {kpis && (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={[
                    { name: "Gross margin", value: kpis.grossMargin * 100 },
                    { name: "Net margin", value: kpis.netMargin * 100 },
                    {
                      name: "Realization rate",
                      value: kpis.realizationRate * 100,
                    },
                    {
                      name: "Collection rate",
                      value: kpis.collectionRate * 100,
                    },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} unit="%" />
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {CHART_COLORS.slice(0, 4).map((c, i) => (
                      <Cell key={i} fill={c} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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
                <DownloadButton
                  disabled={!writeOffs.length}
                  onClick={() =>
                    downloadCsv(
                      `write_offs_${woStage === "All" ? "all" : woStage.replace(/\s+/g, "_")}.csv`,
                      [
                        "Ref",
                        "Stage",
                        "Reference",
                        "Client",
                        "Mandate",
                        "Amount",
                        "Reason",
                        "Approved by",
                        "Date",
                        "Status",
                      ],
                      writeOffs.map((w) => [
                        w.ref,
                        w.stage,
                        w.reference,
                        w.clientName,
                        w.mandateName,
                        w.amount,
                        w.reason,
                        w.approvedBy,
                        w.createdAt?.slice(0, 10) ?? "",
                        w.status,
                      ]),
                    )
                  }
                />
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
