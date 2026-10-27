import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReportPack } from "@/lib/crm/report-api";
import { ColumnChart, HBars, KpiCard, useFmt, useReport, varClass } from "./shared";

// ─────────────────────────────────────────────────────────────
// The data half of each Management Report section. The editor tabs
// pair these with a commentary box; the Preview pairs the very same
// components with the commentary as plain text, so what the author
// sees while drafting is exactly what the Board receives.
// ─────────────────────────────────────────────────────────────

const GREEN = "#16a34a";
const AMBER = "#d97706";
const ORANGE = "#ea580c";
const RED = "#dc2626";
const DARK_RED = "#991b1b";

const ratio = (pack: ReportPack, key: string) =>
  pack.ratios.flatMap((g) => g.items).find((i) => i.key === key);

export function Stat({ label, value, sub, color }: { label: string; value: ReactNode; sub?: ReactNode; color?: string }) {
  return (
    <div className="text-center">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-bold" style={color ? { color } : undefined}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

const periodTag = (t: string) => (t === "Month" ? "MTD" : t === "Quarter" ? "QTD" : "YTD");

export function KeyFigures() {
  const { pack } = useReport();
  const { money, pct } = useFmt();
  const k = pack.overview.kpis;
  const dso = ratio(pack, "dso");
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-muted-foreground">Key figures for reference</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={`Revenue (${periodTag(pack.meta.periodType)})`} value={money(k.revenue)} color={GREEN} />
        <Stat label="Net margin" value={k.netMargin === null ? "—" : pct(k.netMargin)} color={(k.netMargin ?? 0) >= 0 ? GREEN : RED} />
        <Stat label="Cash position" value={money(k.cashPosition)} />
        <Stat label="DSO" value={dso?.display ?? "—"} color={dso?.ok === false ? RED : undefined} />
      </CardContent>
    </Card>
  );
}

const LIGHT_STYLE = {
  good: { bg: "bg-success/10", border: "border-success", text: "text-success" },
  warn: { bg: "bg-warning/10", border: "border-warning", text: "text-warning" },
  bad: { bg: "bg-destructive/10", border: "border-destructive", text: "text-destructive" },
  neutral: { bg: "bg-muted", border: "border-border", text: "text-muted-foreground" },
} as const;

export function SummarySection() {
  const { pack } = useReport();
  const { money, pct, num, signed } = useFmt();
  const { overview: o, pnl, budget, lights, meta } = pack;
  const k = o.kpis;
  const t = pnl.totals;
  const bt = budget.totals;

  const rows = [
    { n: "Total Revenue", cur: t.revenue.cur, prior: t.revenue.prior, ytd: t.revenue.ytd, bud: bt.revenue.budget },
    { n: "Cost of Services", cur: -t.costOfServices.cur, prior: -t.costOfServices.prior, ytd: -t.costOfServices.ytd, bud: -bt.costOfServices.budget, cost: true },
    { n: "Gross Profit", cur: t.grossProfit.cur, prior: t.grossProfit.prior, ytd: t.grossProfit.ytd, bud: bt.grossProfit.budget, bold: true },
    { n: "Operating Expenses", cur: -t.operatingExpenses.cur, prior: -t.operatingExpenses.prior, ytd: -t.operatingExpenses.ytd, bud: -bt.operatingExpenses.budget, cost: true },
    { n: "Net Profit Before Tax", cur: t.profitBeforeTax.cur, prior: t.profitBeforeTax.prior, ytd: t.profitBeforeTax.ytd, bud: bt.profitBeforeTax.budget, bold: true },
  ];

  return (
    <div className="space-y-4">
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Executive summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat
              label={`Revenue (${periodTag(meta.periodType)})`}
              value={money(k.revenue)}
              color={GREEN}
              sub={k.revenueChangePct === null ? undefined : `${k.revenueChangePct >= 0 ? "+" : ""}${k.revenueChangePct.toFixed(1)}% vs ${meta.priorLabel}`}
            />
            <Stat
              label="Revenue (YTD)"
              value={money(k.revenueYtd)}
              sub={k.revenuePctOfAnnualBudget === null ? "No annual budget set" : `${pct(k.revenuePctOfAnnualBudget)} of annual budget`}
            />
            <Stat
              label={`Net margin (${periodTag(meta.periodType)})`}
              value={k.netMargin === null ? "—" : pct(k.netMargin)}
              color={(k.netMargin ?? 0) >= 0 ? GREEN : RED}
            />
            <Stat
              label="Cash runway"
              value={k.runwayMonths === null ? "—" : `${k.runwayMonths.toFixed(1)} months`}
              sub={k.monthlyBurn > 0 ? `at ${money(k.monthlyBurn)} average monthly cost` : "No operating costs recorded"}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {(["revenue", "collections", "costs"] as const).map((key) => {
              const l = lights[key];
              const st = LIGHT_STYLE[l.status];
              return (
                <div key={key} className={`rounded-lg border-l-4 p-3 text-xs ${st.bg} ${st.border}`}>
                  <b className={`capitalize ${st.text}`}>{key}</b>
                  <br />
                  {l.text}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-x-auto">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Income statement summary</CardTitle>
        </CardHeader>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2 text-left" />
              <th className="px-4 py-2 text-right">{meta.shortLabel}</th>
              <th className="px-4 py-2 text-right">{meta.priorLabel}</th>
              <th className="px-4 py-2 text-right">Variance</th>
              <th className="px-4 py-2 text-right">{meta.ytdLabel}</th>
              <th className="px-4 py-2 text-right">YTD budget</th>
              <th className="px-4 py-2 text-right">Var %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const v = r.cur - r.prior;
              // Budget figures for cost lines are held as positives; the table
              // shows them with the same sign as the actuals.
              const bud = r.bud;
              const vp = bud ? ((r.ytd / bud) - 1) * 100 : null;
              return (
                <tr key={r.n} className={`border-b ${r.bold ? "bg-muted/40 font-bold" : ""}`}>
                  <td className="px-4 py-2">{r.n}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{num(r.cur)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{num(r.prior)}</td>
                  <td className={`px-4 py-2 text-right tabular-nums ${varClass(v)}`}>{signed(v)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{num(r.ytd)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{bud ? num(bud) : "—"}</td>
                  <td className={`px-4 py-2 text-right tabular-nums ${vp === null ? "" : varClass(vp, "cost" in r && !!r.cost)}`}>
                    {vp === null ? "—" : `${vp >= 0 ? "+" : ""}${vp.toFixed(1)}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function RevenueSection() {
  const { pack } = useReport();
  const { money } = useFmt();
  const ra = pack.revenueAnalysis;
  const maxClient = Math.max(...ra.topClients.map((c) => c.val), 1);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Revenue by service line ({pack.meta.ytdLabel})</CardTitle>
          </CardHeader>
          <CardContent>
            <HBars items={ra.serviceLines} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top clients by revenue ({pack.meta.ytdLabel})</CardTitle>
          </CardHeader>
          <CardContent>
            <HBars
              items={ra.topClients.map((c) => ({
                name: c.name,
                val: c.val,
                pct: Math.round((c.val / maxClient) * 100),
              }))}
              valueLabel={(n) => `${money(n)}`}
            />
            {!ra.topClients.length && <p className="py-4 text-center text-sm text-muted-foreground">No invoiced revenue yet.</p>}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Monthly revenue trend ({pack.meta.ytdLabel})</CardTitle>
        </CardHeader>
        <CardContent>
          <ColumnChart labels={pack.overview.revenueTrend.map((r) => r.label)} values={pack.overview.revenueTrend.map((r) => r.value)} />
        </CardContent>
      </Card>
    </div>
  );
}

export function CostsSection() {
  const { pack } = useReport();
  const { money } = useFmt();
  const e = pack.overview.expenseBreakdown;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Expense breakdown ({pack.meta.shortLabel})</CardTitle>
      </CardHeader>
      <CardContent>
        <HBars items={e.items} />
        <div className="mt-3 flex justify-between border-t pt-2.5 text-xs font-bold">
          <span>Total expenses</span>
          <span>{money(e.total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function CashFlowSection() {
  const { pack } = useReport();
  const { money, compact } = useFmt();
  const cf = pack.cashFlow.ytd;
  const k = pack.overview.kpis;
  const bars = [
    { name: "Operating", val: cf.operating, color: GREEN },
    { name: "Investing", val: cf.investing, color: RED },
    { name: "Financing", val: cf.financing, color: AMBER },
    { name: "Net change", val: cf.netChange, color: "#5b4bff" },
  ];
  const max = Math.max(...bars.map((b) => Math.abs(b.val)), 1);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Cash flow summary ({pack.meta.ytdLabel})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {bars.map((b) => (
            <div key={b.name} className="flex items-center gap-3 text-xs">
              <span className="w-24 shrink-0 text-muted-foreground">{b.name}</span>
              <div className="h-6 flex-1 overflow-hidden rounded bg-muted">
                <div
                  className="flex h-full items-center justify-end rounded px-2 text-[11px] font-semibold text-white"
                  style={{ width: `${Math.max(3, (Math.abs(b.val) / max) * 100)}%`, background: b.color }}
                >
                  {compact(b.val)}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Cash position" value={money(k.cashPosition)} tone="success" />
        <KpiCard label="Monthly burn" value={money(k.monthlyBurn)} />
        <KpiCard label="Cash runway" value={k.runwayMonths === null ? "—" : `${k.runwayMonths.toFixed(1)} months`} />
      </div>
    </div>
  );
}

export function ReceivablesSection() {
  const { pack } = useReport();
  const { money, pct } = useFmt();
  const ar = pack.agedReceivables;
  const b = ar.buckets;
  const share = (v: number) => (ar.total ? (v / ar.total) * 100 : 0);
  const buckets = [
    { name: "Current", val: b.current, color: GREEN },
    { name: "1-30 days", val: b.d30, color: AMBER },
    { name: "31-60 days", val: b.d60, color: ORANGE },
    { name: "61-90 days", val: b.d90, color: RED },
    { name: "90+ days", val: b.d90p, color: DARK_RED },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {buckets.map((x) => (
          <KpiCard key={x.name} label={x.name} value={<span style={{ color: x.color }}>{money(x.val)}</span>} sub={pct(share(x.val))} />
        ))}
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Aging distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <HBars
            items={buckets.map((x) => ({ ...x, pct: Math.round(share(x.val) * 10) / 10 }))}
            maxPct={Math.max(...buckets.map((x) => share(x.val)), 1)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function PayablesSection() {
  const { pack } = useReport();
  const { money } = useFmt();
  const b = pack.agedPayables.buckets;
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard label="Current" value={<span style={{ color: GREEN }}>{money(b.current)}</span>} />
      <KpiCard label="1-30 days" value={money(b.d30)} />
      <KpiCard label="31-60 days" value={<span style={{ color: AMBER }}>{money(b.d60)}</span>} />
      <KpiCard label="60+ days" value={<span style={{ color: RED }}>{money(b.d60p)}</span>} />
    </div>
  );
}

export function BudgetSection() {
  const { pack } = useReport();
  const { compact } = useFmt();
  const lines = pack.budget.rows.filter(
    (r) => r.vals && ["t", "sub", "hl", "gt"].includes(r.type) && (r.vals.budget || r.vals.actual),
  );
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Budget vs actual — key lines ({pack.meta.ytdLabel})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!pack.budget.hasBudget && (
          <p className="text-sm text-muted-foreground">
            No budget has been entered for this year. Add one under Budget vs Actuals → Manage budget.
          </p>
        )}
        {lines.map((r, i) => {
          const v = r.vals!;
          const max = Math.max(Math.abs(v.budget), Math.abs(v.actual), 1);
          return (
            <div key={i}>
              <p className="mb-1 text-xs font-bold">{r.name}</p>
              {(
                [
                  ["Budget", v.budget, "#c4cad4"],
                  ["Actual", v.actual, "#5b4bff"],
                ] as const
              ).map(([lbl, val, col]) => (
                <div key={lbl} className="mb-1 flex items-center gap-2 text-[10px]">
                  <span className="w-12 text-muted-foreground">{lbl}</span>
                  <div className="h-3.5 flex-1 overflow-hidden rounded bg-muted">
                    <div
                      className="flex h-full items-center justify-end px-1 text-[8px] font-semibold"
                      style={{ width: `${val ? Math.max(3, (Math.abs(val) / max) * 100) : 0}%`, background: col }}
                    >
                      {compact(val)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// KPIs that the ledger can actually support. Billable utilisation and
// client retention from the prototype are deliberately not here: they
// need timesheet and contract data the ledger doesn't hold.
const KPI_KEYS = ["grossMargin", "ebitMargin", "dso", "revenuePerEmployee", "staffCost", "currentRatio", "netMargin", "collection"];

export function KpisSection() {
  const { pack } = useReport();
  const items = KPI_KEYS.map((k) => ratio(pack, k)).filter((i): i is NonNullable<typeof i> => !!i && i.value !== null);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Key performance indicators</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {items.map((i) => {
            const color = i.ok === false ? AMBER : i.ok ? GREEN : undefined;
            return (
              <div key={i.key} className="rounded-lg border p-3.5 text-center">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{i.name}</div>
                <div className="text-xl font-bold" style={color ? { color } : undefined}>
                  {i.display}
                </div>
                <div className="text-[10px]" style={color ? { color } : undefined}>
                  {i.target}
                </div>
              </div>
            );
          })}
        </div>
        {!items.length && <p className="py-4 text-center text-sm text-muted-foreground">Not enough ledger data to compute KPIs yet.</p>}
        <p className="mt-3 text-xs text-muted-foreground">{pack.notes.targets}</p>
      </CardContent>
    </Card>
  );
}
