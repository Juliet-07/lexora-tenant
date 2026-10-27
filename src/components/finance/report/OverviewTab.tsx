import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ColumnChart,
  HBars,
  KpiCard,
  useFmt,
  useReport,
} from "./shared";

export const REPORT_TAB_LINKS: { id: string; label: string }[] = [
  { id: "pnl", label: "Profit & Loss" },
  { id: "balance-sheet", label: "Balance Sheet" },
  { id: "cashflow", label: "Cash Flow" },
  { id: "trial-balance", label: "Trial Balance" },
  { id: "aged-rec", label: "Aged Receivables" },
  { id: "aged-pay", label: "Aged Payables" },
  { id: "budget", label: "Budget vs Actuals" },
  { id: "ratios", label: "Financial Ratios" },
  { id: "mgmt", label: "Management Report" },
];

const signedPct = (n: number | null, vs: string) =>
  n === null ? `No ${vs} comparison` : `${n >= 0 ? "+" : ""}${n.toFixed(1)}% vs ${vs}`;

export default function OverviewTab() {
  const { pack, goTab } = useReport();
  const { money, pct } = useFmt();
  const { overview: o, meta } = pack;
  const k = o.kpis;
  const per = meta.periodType === "Month" ? "MTD" : meta.periodType === "Quarter" ? "QTD" : "YTD";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={`Revenue ${per}`}
          value={money(k.revenue)}
          tone="success"
          sub={signedPct(k.revenueChangePct, meta.priorLabel)}
          subTone={k.revenueChangePct === null ? "muted" : k.revenueChangePct >= 0 ? "success" : "destructive"}
          onClick={() => goTab("pnl")}
        />
        <KpiCard
          label={`Net profit ${per}`}
          value={money(k.netProfit)}
          tone={k.netProfit >= 0 ? "success" : "destructive"}
          sub={k.netMargin === null ? "Margin: —" : `Margin: ${pct(k.netMargin)}`}
          subTone={k.netProfit >= 0 ? "success" : "destructive"}
          onClick={() => goTab("pnl")}
        />
        <KpiCard
          label="Cash position"
          value={money(k.cashPosition)}
          sub={signedPct(k.cashChangePct, "prior period end")}
          subTone={k.cashChangePct === null ? "muted" : k.cashChangePct >= 0 ? "success" : "destructive"}
          onClick={() => goTab("cashflow")}
        />
        <KpiCard
          label="Outstanding receivables"
          value={money(k.receivables)}
          tone="warning"
          sub={`${money(k.receivablesOverdue60Plus)} overdue 60+`}
          subTone={k.receivablesOverdue60Plus > 0 ? "destructive" : "muted"}
          onClick={() => goTab("aged-rec")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Revenue trend ({meta.ytdLabel})</CardTitle>
          </CardHeader>
          <CardContent>
            <ColumnChart
              labels={o.revenueTrend.map((r) => r.label)}
              values={o.revenueTrend.map((r) => r.value)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Expense breakdown ({meta.shortLabel})</CardTitle>
          </CardHeader>
          <CardContent>
            <HBars items={o.expenseBreakdown.items} />
            <div className="mt-3 flex justify-between border-t pt-2.5 text-xs font-bold">
              <span>Total expenses</span>
              <span>{money(o.expenseBreakdown.total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {REPORT_TAB_LINKS.map((t) => (
            <Button key={t.id} size="sm" variant="outline" onClick={() => goTab(t.id)}>
              {t.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Position (as of {new Date(meta.asOf).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })})</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Cash position" value={money(k.cashPosition)} />
          <KpiCard label="Outstanding receivables" value={money(k.receivables)} />
          <KpiCard label="Outstanding payables" value={money(k.payables)} />
        </CardContent>
      </Card>
    </div>
  );
}
