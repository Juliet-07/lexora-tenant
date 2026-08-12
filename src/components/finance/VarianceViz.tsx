/**
 * Shared variance visual language for Finance → Reporting.
 * Pattern: KPI row + combo chart with a real variance encoding + detail
 * table with inline variance bars. Reused by Budget vs actual, P&L,
 * Service line P&L and Client profitability.
 */
import { ReactNode } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const compact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}b`;
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (a >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return `${Math.round(n)}`;
};

const ACTUAL = "hsl(var(--primary))";
const BUDGET = "hsl(var(--muted-foreground))";
export const GOOD = "hsl(var(--success))";
export const BAD = "hsl(var(--destructive))";

/* ── KPI card ────────────────────────────────────────────── */

export function VarianceKpi({
  label, value, delta, deltaLabel, favourable, qualifier,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaLabel?: string;
  favourable?: boolean;
  qualifier?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 space-y-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {delta && (
          <p className={cn("text-sm font-medium", favourable ? "text-success" : "text-destructive")}>
            {delta}
            {deltaLabel && <span className="text-muted-foreground font-normal"> {deltaLabel}</span>}
          </p>
        )}
        {qualifier && <p className="text-xs text-muted-foreground">{qualifier}</p>}
      </CardContent>
    </Card>
  );
}

/* ── Combo chart: actual / budget bars + variance markers ── */

export interface ComboPoint {
  label: string;
  actual: number;
  budget: number;
  variance: number;
  favourable: boolean;
}

export function VarianceComboChart({
  title, data, height = 340, actualName = "Actual", budgetName = "Budget",
}: {
  title: string;
  data: ComboPoint[];
  height?: number;
  actualName?: string;
  budgetName?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="value" tickFormatter={compact} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={52} />
              <YAxis yAxisId="variance" orientation="right" tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${compact(v)}`} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={58} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "hsl(var(--popover-foreground))",
                }}
                formatter={(v: number, n: string) => [`${v > 0 && n === "Variance" ? "+" : ""}${compact(v)}`, n]}
              />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                payload={[
                  { value: actualName, type: "square", color: ACTUAL, id: "a" },
                  { value: budgetName, type: "square", color: BUDGET, id: "b" },
                  { value: "Favourable variance", type: "square", color: GOOD, id: "f" },
                  { value: "Unfavourable variance", type: "square", color: BAD, id: "u" },
                ]}
              />
              <Bar yAxisId="value" dataKey="actual" name={actualName} fill={ACTUAL} radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Bar yAxisId="value" dataKey="budget" name={budgetName} fill={BUDGET} fillOpacity={0.35} radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Bar yAxisId="variance" dataKey="variance" name="Variance" maxBarSize={7} radius={[2, 2, 2, 2]}>
                {data.map((d) => (
                  <Cell key={d.label} fill={d.favourable ? GOOD : BAD} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Detail table with inline variance bars ──────────────── */

export interface VarianceRow {
  group?: string;
  label: string;
  actual: number;
  comparison: number;
  favourable: boolean;
  extra?: ReactNode;
}

function InlineVarianceBar({ pct, favourable }: { pct: number; favourable: boolean }) {
  const w = Math.min(Math.abs(pct), 100) / 2; // half-width max
  return (
    <div className="flex h-3 w-28 items-center">
      <div className="flex h-full w-1/2 justify-end">
        {!favourable && <div className="h-full rounded-l-sm bg-destructive" style={{ width: `${w * 2}%` }} />}
      </div>
      <div className="h-3 w-px bg-border" />
      <div className="flex h-full w-1/2">
        {favourable && <div className="h-full rounded-r-sm bg-success" style={{ width: `${w * 2}%` }} />}
      </div>
    </div>
  );
}

export function VarianceTable({
  rows, money, actualHeader = "Actual", comparisonHeader = "Budget", extraHeader,
}: {
  rows: VarianceRow[];
  money: (n: number) => string;
  actualHeader?: string;
  comparisonHeader?: string;
  extraHeader?: string;
}) {
  let lastGroup: string | undefined;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Line item</TableHead>
            <TableHead className="text-right">{actualHeader}</TableHead>
            <TableHead className="text-right">{comparisonHeader}</TableHead>
            <TableHead className="text-right">Variance</TableHead>
            <TableHead className="text-right">Variance %</TableHead>
            <TableHead>Variance</TableHead>
            {extraHeader && <TableHead className="text-right">{extraHeader}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const diff = r.actual - r.comparison;
            const pct = r.comparison ? (diff / Math.abs(r.comparison)) * 100 : 0;
            const header = r.group && r.group !== lastGroup ? r.group : null;
            lastGroup = r.group ?? lastGroup;
            const tone = r.favourable ? "text-success" : "text-destructive";
            return (
              <>
                {header && (
                  <TableRow key={`g-${header}`} className="bg-muted/50 hover:bg-muted/50">
                    <TableCell colSpan={extraHeader ? 7 : 6} className="py-2 text-xs font-semibold uppercase tracking-wide">
                      {header}
                    </TableCell>
                  </TableRow>
                )}
                <TableRow key={r.label}>
                  <TableCell className="text-sm">{r.label}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{money(r.actual)}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{money(r.comparison)}</TableCell>
                  <TableCell className={cn("text-right text-sm font-medium", tone)}>
                    {diff > 0 ? "+" : ""}{money(diff)}
                  </TableCell>
                  <TableCell className={cn("text-right text-sm", tone)}>
                    {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
                  </TableCell>
                  <TableCell>
                    <InlineVarianceBar pct={pct} favourable={r.favourable} />
                  </TableCell>
                  {extraHeader && <TableCell className="text-right text-sm">{r.extra}</TableCell>}
                </TableRow>
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/* ── Simple grouped bar chart (no variance axis) ─────────── */

export function SimpleBars({
  title, data, keys, height = 300,
}: {
  title: string;
  data: Record<string, string | number>[];
  keys: { key: string; name: string; color: string }[];
  height?: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={compact} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={52} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "hsl(var(--popover-foreground))",
                }}
                formatter={(v: number, n: string) => [compact(v), n]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {keys.map((k) => (
                <Bar key={k.key} dataKey={k.key} name={k.name} fill={k.color} radius={[3, 3, 0, 0]} maxBarSize={26} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
