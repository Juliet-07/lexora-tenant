import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PnlCols, StatementRow } from "@/lib/crm/report-api";
import {
  asOfLabel,
  ColumnChart,
  HBars,
  StatementTable,
  TabHeading,
  useFmt,
  useReport,
  varClass,
  CHART_PALETTE,
  type StatementColumn,
} from "./shared";

// ── Profit & Loss ────────────────────────────────────────────

export function PnlTab() {
  const { pack, view } = useReport();
  const { dash, signed } = useFmt();
  const [comparative, setComparative] = useState(true);
  const m = pack.meta;

  if (view === "chart") {
    return (
      <div className="space-y-4">
        <TabHeading title="Profit and Loss Statement" sub={`For the period ended ${asOfLabel(m.to)}`} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Revenue by service line ({m.ytdLabel})</CardTitle>
            </CardHeader>
            <CardContent>
              <HBars items={pack.revenueAnalysis.serviceLines} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Monthly revenue trend ({m.ytdLabel})</CardTitle>
            </CardHeader>
            <CardContent>
              <ColumnChart
                labels={pack.overview.revenueTrend.map((r) => r.label)}
                values={pack.overview.revenueTrend.map((r) => r.value)}
              />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Expense breakdown ({m.shortLabel})</CardTitle>
          </CardHeader>
          <CardContent>
            <HBars items={pack.overview.expenseBreakdown.items} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const cell = (v: (r: StatementRow<PnlCols>) => number | undefined) => (r: StatementRow<PnlCols>) =>
    r.vals ? dash(v(r)) : "";
  const columns: StatementColumn<StatementRow<PnlCols>>[] = [
    { key: "cur", label: m.shortLabel, align: "right", render: cell((r) => r.vals?.cur) },
    ...(comparative
      ? ([
          { key: "prior", label: m.priorLabel, align: "right", render: cell((r) => r.vals?.prior) },
          {
            key: "var",
            label: "Variance",
            align: "right",
            render: (r) =>
              r.vals ? (
                <span className={varClass(r.vals.cur - r.vals.prior)}>
                  {signed(r.vals.cur - r.vals.prior)}
                </span>
              ) : (
                ""
              ),
          },
        ] as StatementColumn<StatementRow<PnlCols>>[])
      : []),
    { key: "ytd", label: m.ytdLabel, align: "right", render: cell((r) => r.vals?.ytd) },
  ];

  return (
    <div>
      <TabHeading
        title="Profit and Loss Statement"
        sub={`For the period ended ${asOfLabel(m.to)} · amounts in ${m.currency}`}
        right={
          <Button size="sm" variant="outline" onClick={() => setComparative((c) => !c)}>
            {comparative ? "Hide comparative" : "Show comparative"}
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <StatementTable rows={pack.pnl.rows} columns={columns} firstLabel="Account" />
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">{pack.notes.costOfServices}</p>
    </div>
  );
}

// ── Balance sheet ────────────────────────────────────────────

export function BalanceSheetTab() {
  const { pack, view } = useReport();
  const { money, dash } = useFmt();
  const bs = pack.balanceSheet;

  if (view === "chart") {
    // Asset lines are the "row" entries before TOTAL ASSETS.
    const stop = bs.rows.findIndex((r) => r.name === "TOTAL ASSETS");
    const assetLines = bs.rows
      .slice(0, stop < 0 ? undefined : stop)
      .filter((r) => r.type === "row" && (r.val ?? 0) > 0)
      .sort((a, b) => (b.val ?? 0) - (a.val ?? 0));
    const top = assetLines.slice(0, 6);
    const rest = assetLines.slice(6).reduce((s, r) => s + (r.val ?? 0), 0);
    const assets = [
      ...top.map((r) => ({ name: r.name ?? "", val: r.val ?? 0 })),
      ...(rest > 0 ? [{ name: "Other assets", val: rest }] : []),
    ].map((r, i) => ({
      ...r,
      pct: bs.totalAssets ? Math.round((r.val / bs.totalAssets) * 1000) / 10 : 0,
      color: CHART_PALETTE[i % CHART_PALETTE.length],
    }));
    const lhs = bs.totalEquity + bs.totalLiabilities;
    const liabEq = [
      { name: "Equity", val: bs.totalEquity, color: CHART_PALETTE[0] },
      { name: "Current liabilities", val: bs.currentLiabilities, color: CHART_PALETTE[2] },
      { name: "Non-current liabilities", val: bs.nonCurrentLiabilities, color: CHART_PALETTE[4] },
    ]
      .filter((r) => r.val !== 0)
      .map((r) => ({ ...r, pct: lhs ? Math.round((Math.abs(r.val) / Math.abs(lhs)) * 1000) / 10 : 0 }));

    return (
      <div className="space-y-4">
        <TabHeading title="Statement of Financial Position" sub={`As at ${asOfLabel(bs.asOf)}`} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Asset composition</CardTitle>
            </CardHeader>
            <CardContent>
              <HBars items={assets} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Equity and liabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <HBars items={liabEq} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TabHeading
        title="Statement of Financial Position"
        sub={`As at ${asOfLabel(bs.asOf)} · amounts in ${pack.meta.currency}`}
        right={
          <span
            className={
              bs.balanced ? "text-xs font-semibold text-success" : "text-xs font-semibold text-destructive"
            }
          >
            {bs.balanced
              ? "Assets = Equity + Liabilities"
              : `Out of balance by ${money(bs.totalAssets - bs.totalLiabilities - bs.totalEquity)}`}
          </span>
        }
      />
      <Card className="overflow-hidden">
        <StatementTable
          rows={bs.rows}
          firstLabel="Account"
          columns={[
            {
              key: "val",
              label: pack.meta.currency,
              align: "right",
              render: (r) => (r.val !== undefined ? dash(r.val) : ""),
            },
          ]}
        />
      </Card>
    </div>
  );
}

// ── Cash flow ────────────────────────────────────────────────

export function CashFlowTab() {
  const { pack, view } = useReport();
  const { dash, money, compact } = useFmt();
  const [scope, setScope] = useState<"ytd" | "period">("ytd");
  const m = pack.meta;
  const cf = pack.cashFlow[scope];
  const span = scope === "ytd" ? m.ytdLabel : m.periodLabel;
  const showToggle = m.periodType !== "Year";

  const bars = [
    { name: "Operating", val: cf.operating, color: "#16a34a" },
    { name: "Investing", val: cf.investing, color: "#dc2626" },
    { name: "Financing", val: cf.financing, color: "#d97706" },
    { name: "Net change", val: cf.netChange, color: "#5b4bff" },
  ];
  const max = Math.max(...bars.map((b) => Math.abs(b.val)), 1);

  return (
    <div>
      <TabHeading
        title="Statement of Cash Flows"
        sub={`${span} · indirect method · amounts in ${m.currency}`}
        right={
          showToggle && (
            <div className="flex gap-1">
              <Button size="sm" variant={scope === "ytd" ? "default" : "outline"} onClick={() => setScope("ytd")}>
                Year to date
              </Button>
              <Button size="sm" variant={scope === "period" ? "default" : "outline"} onClick={() => setScope("period")}>
                This period
              </Button>
            </div>
          )
        }
      />
      {view === "chart" ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cash flow summary</CardTitle>
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
                <span className="w-32 shrink-0 text-right font-medium">{money(b.val)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <StatementTable
            rows={cf.rows}
            firstLabel="Description"
            columns={[
              {
                key: "val",
                label: m.currency,
                align: "right",
                render: (r) => (r.val !== undefined ? dash(r.val) : ""),
              },
            ]}
          />
        </Card>
      )}
      {Math.abs(cf.unmapped) > 0.5 && (
        <p className="mt-3 text-xs text-warning">
          {money(cf.unmapped)} of the movement in cash could not be tied to a specific ledger account and is shown as “Other
          movements” so the statement still reconciles to the bank balance.
        </p>
      )}
    </div>
  );
}

// ── Trial balance ────────────────────────────────────────────

const TB_CATEGORY: Record<string, string> = {
  Asset: "Assets",
  Liability: "Liabilities",
  Equity: "Equity",
  Revenue: "Revenue",
  Expense: "Expenses",
};

export function TrialBalanceTab() {
  const { pack, view } = useReport();
  const { num, dash, money, compact } = useFmt();
  const tb = pack.trialBalance;
  const diff = Math.abs(tb.totalDebit - tb.totalCredit);

  const groups = ["Assets", "Liabilities", "Equity", "Revenue", "Expenses"].map((cat) => {
    const rows = tb.rows.filter((r) => (TB_CATEGORY[r.type] ?? r.type) === cat);
    return {
      cat,
      dr: rows.reduce((s, r) => s + r.debit, 0),
      cr: rows.reduce((s, r) => s + r.credit, 0),
    };
  });
  const maxG = Math.max(...groups.flatMap((g) => [g.dr, g.cr]), 1);
  const top = [...tb.rows]
    .sort((a, b) => Math.max(b.debit, b.credit) - Math.max(a.debit, a.credit))
    .slice(0, 10);
  const maxTop = Math.max(...top.map((r) => Math.max(r.debit, r.credit)), 1);

  return (
    <div className="space-y-4">
      <TabHeading
        title="Trial Balance"
        sub={`As at ${asOfLabel(tb.asOf)} · amounts in ${pack.meta.currency}`}
      />
      <Card
        className={tb.balanced ? "border-success/40" : "border-destructive/50"}
      >
        <CardContent
          className={`flex items-center justify-center gap-2 p-3.5 text-sm font-bold ${
            tb.balanced ? "text-success" : "text-destructive"
          }`}
        >
          {tb.balanced ? (
            <>
              <CheckCircle2 className="h-4 w-4" /> Trial balance is balanced
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4" /> OUT OF BALANCE by {money(diff)}
            </>
          )}
        </CardContent>
      </Card>

      {view === "chart" ? (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Debit vs credit by account category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {groups
                .filter((g) => g.dr > 0 || g.cr > 0)
                .map((g) => (
                  <div key={g.cat}>
                    <p className="mb-1 text-xs font-bold">{g.cat}</p>
                    {(
                      [
                        ["Debit", g.dr, "#5b4bff"],
                        ["Credit", g.cr, "#d97706"],
                      ] as const
                    ).map(([lbl, v, col]) => (
                      <div key={lbl} className="mb-1 flex items-center gap-2 text-[10px]">
                        <span className="w-11 text-muted-foreground">{lbl}</span>
                        <div className="h-4 flex-1 overflow-hidden rounded bg-muted">
                          <div
                            className="flex h-full items-center justify-end px-1 text-[9px] font-semibold text-white"
                            style={{ width: `${v ? Math.max(3, (v / maxG) * 100) : 0}%`, background: col }}
                          >
                            {v > 0 ? compact(v) : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top 10 accounts by balance</CardTitle>
            </CardHeader>
            <CardContent>
              <HBars
                items={top.map((r) => ({
                  name: r.name,
                  val: Math.max(r.debit, r.credit),
                  pct: Math.round((Math.max(r.debit, r.credit) / maxTop) * 100),
                  color: r.debit > r.credit ? "#5b4bff" : "#d97706",
                }))}
              />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-semibold">Code</th>
                <th className="px-4 py-2.5 text-left font-semibold">Account</th>
                <th className="px-4 py-2.5 text-right font-semibold">Debit ({pack.meta.currency})</th>
                <th className="px-4 py-2.5 text-right font-semibold">Credit ({pack.meta.currency})</th>
              </tr>
            </thead>
            <tbody>
              {tb.rows.map((r) => (
                <tr key={r.code} className="border-b">
                  <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground">{r.code}</td>
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.debit ? num(r.debit) : "-"}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.credit ? num(r.credit) : "-"}</td>
                </tr>
              ))}
              {!tb.rows.length && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    No ledger balances yet.
                  </td>
                </tr>
              )}
              <tr className="border-t-2 bg-muted/50 font-bold">
                <td colSpan={2} className="px-4 py-2">
                  TOTAL
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{dash(tb.totalDebit)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{dash(tb.totalCredit)}</td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
