/**
 * Budget vs actual variance dashboard — the reference pattern for Reporting:
 * header + period toggle, four KPI cards, combo chart with variance markers
 * on their own axis, and a grouped detail table with inline variance bars.
 */
import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  VarianceKpi, VarianceComboChart, VarianceTable, type ComboPoint,
} from "@/components/finance/VarianceViz";
import {
  budgetVsActualLines, monthlyExpenses, monthlyRevenue, fmoney,
  REPORTING_PERIOD, forecastAccuracyPct, forecastAccuracyTargetPct,
} from "@/data/financeMockData";

type Period = "monthly" | "ytd" | "fy";
const YTD_MONTHS = 7;

export function BudgetVsActual() {
  const [period, setPeriod] = useState<Period>("ytd");
  const [view, setView] = useState<"revenue" | "expenses">("revenue");

  const months = period === "fy" ? 12 : YTD_MONTHS;
  const revSeries = monthlyRevenue.slice(0, period === "monthly" ? YTD_MONTHS : months);
  const expSeries = monthlyExpenses.slice(0, period === "monthly" ? YTD_MONTHS : months);

  const totals = useMemo(() => {
    const sum = (arr: { actual: number; budget: number }[], k: "actual" | "budget") =>
      arr.slice(0, months).reduce((s, r) => s + r[k], 0);
    const revA = sum(monthlyRevenue, "actual");
    const revB = sum(monthlyRevenue, "budget");
    const expA = sum(monthlyExpenses, "actual");
    const expB = sum(monthlyExpenses, "budget");
    return { revA, revB, expA, expB, npA: revA - expA, npB: revB - expB };
  }, [months]);

  const npVar = totals.npA - totals.npB;
  const npVarPct = totals.npB ? (npVar / Math.abs(totals.npB)) * 100 : 0;

  const chartData: ComboPoint[] = (view === "revenue" ? revSeries : expSeries).map((m) => {
    const variance = view === "revenue" ? m.actual - m.budget : m.budget - m.actual;
    return {
      label: m.month,
      actual: m.actual,
      budget: m.budget,
      variance,
      favourable: variance >= 0,
    };
  });

  const rows = budgetVsActualLines.map((l) => ({
    group: l.group,
    label: l.line,
    actual: l.actual,
    comparison: l.budget,
    favourable: l.higherIsBetter ? l.actual >= l.budget : l.actual <= l.budget,
  }));

  const periodLabel =
    period === "ytd" ? REPORTING_PERIOD
      : period === "fy" ? "Full year FY2026 (budget beyond July is forecast)"
        : "Monthly view — January to July 2026";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Budget vs actual variance dashboard</h2>
          <p className="text-sm text-muted-foreground">{periodLabel}</p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="ytd">YTD</TabsTrigger>
            <TabsTrigger value="fy">Full year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <VarianceKpi
          label="Revenue (actual)"
          value={fmoney(totals.revA)}
          delta={`${fmoney(Math.abs(totals.revA - totals.revB))} ${totals.revA >= totals.revB ? "over" : "under"} budget`}
          favourable={totals.revA >= totals.revB}
        />
        <VarianceKpi
          label="Total expenses (actual)"
          value={fmoney(totals.expA)}
          delta={`${fmoney(Math.abs(totals.expA - totals.expB))} ${totals.expA > totals.expB ? "over" : "under"} budget`}
          favourable={totals.expA <= totals.expB}
        />
        <VarianceKpi
          label="Net profit variance"
          value={`${npVar > 0 ? "+" : ""}${fmoney(npVar)}`}
          delta={`${npVarPct > 0 ? "+" : ""}${npVarPct.toFixed(1)}% vs budget`}
          favourable={npVar >= 0}
          qualifier={`Net profit ${fmoney(totals.npA)} against budget ${fmoney(totals.npB)}`}
        />
        <VarianceKpi
          label="Forecast accuracy"
          value={`${forecastAccuracyPct}%`}
          qualifier={`Within ${forecastAccuracyTargetPct}% target`}
        />
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as "revenue" | "expenses")}>
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>
      </Tabs>

      <VarianceComboChart
        title={view === "revenue" ? "Revenue — actual vs budget, with monthly variance" : "Expenses — actual vs budget, with monthly variance"}
        data={chartData}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Line item detail — {period === "fy" ? "full year" : "year to date"}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <VarianceTable rows={rows} money={fmoney} actualHeader="YTD actual" comparisonHeader="YTD budget" />
        </CardContent>
      </Card>
    </div>
  );
}
