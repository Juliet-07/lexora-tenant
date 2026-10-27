import { createContext, useContext, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReportPack, StatementRow } from "@/lib/crm/report-api";

// ─────────────────────────────────────────────────────────────
// Shared plumbing for the Finance → Report tabs: the pack context,
// currency-aware number formatting, and the small chart / table
// building blocks every tab reuses so they all look and behave alike.
// ─────────────────────────────────────────────────────────────

export type ReportView = "table" | "chart";

interface ReportCtxValue {
  pack: ReportPack;
  view: ReportView;
  goTab: (tab: string) => void;
}
const ReportCtx = createContext<ReportCtxValue | null>(null);
export const ReportProvider = ReportCtx.Provider;
export function useReport() {
  const v = useContext(ReportCtx);
  if (!v) throw new Error("useReport must be used inside ReportProvider");
  return v;
}

// Currencies that have no minor unit in everyday use — everything else
// shows its natural two decimals, so a 3.60 VAT never reads as 4.
const ZERO_DECIMAL = new Set(["RWF", "UGX", "BIF", "XOF", "XAF", "JPY", "KMF", "DJF"]);

export function makeFormatters(currency: string) {
  const dp = ZERO_DECIMAL.has(currency) ? 0 : 2;
  const num = (n: number | null | undefined) => {
    if (n === null || n === undefined || Number.isNaN(n)) return "—";
    const s = Math.abs(n).toLocaleString("en-US", {
      minimumFractionDigits: dp,
      maximumFractionDigits: dp,
    });
    return n < 0 && Math.abs(n) >= (dp === 0 ? 0.5 : 0.005) ? `(${s})` : s;
  };
  const dash = (n: number | null | undefined) =>
    !n || Math.abs(n) < (dp === 0 ? 0.5 : 0.005) ? "-" : num(n);
  const money = (n: number | null | undefined) =>
    n === null || n === undefined ? "—" : `${currency} ${num(n)}`;
  const signed = (n: number) =>
    Math.abs(n) < (dp === 0 ? 0.5 : 0.005)
      ? "-"
      : `${n >= 0 ? "+" : "-"}${num(Math.abs(n))}`;
  // 127.5M / 600K style for tight spaces (chart labels, bar values).
  const compact = (n: number) => {
    const a = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (a >= 1e9) return `${sign}${(a / 1e9).toFixed(1)}B`;
    if (a >= 1e6) return `${sign}${(a / 1e6).toFixed(1)}M`;
    if (a >= 1e3) return `${sign}${(a / 1e3).toFixed(a >= 1e5 ? 0 : 1)}K`;
    return `${sign}${a.toFixed(dp === 0 ? 0 : 2)}`;
  };
  const pct = (n: number | null | undefined, d = 1) =>
    n === null || n === undefined ? "—" : `${n.toFixed(d)}%`;
  return { num, dash, money, signed, compact, pct, currency };
}

export function useFmt() {
  const { pack } = useReport();
  return makeFormatters(pack.meta.currency);
}

// Favourable / unfavourable colouring for a variance. For costs a
// negative variance (spending less) is the good direction.
export const varClass = (v: number, inverted = false) =>
  (inverted ? v <= 0 : v >= 0) ? "text-success" : "text-destructive";

// ── KPI card ─────────────────────────────────────────────────

export function KpiCard({
  label,
  value,
  sub,
  tone,
  subTone,
  onClick,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "success" | "warning" | "destructive";
  subTone?: "success" | "warning" | "destructive" | "muted";
  onClick?: () => void;
}) {
  const toneClass = (t?: string) =>
    t === "success"
      ? "text-success"
      : t === "warning"
        ? "text-warning"
        : t === "destructive"
          ? "text-destructive"
          : "";
  return (
    <Card
      className={cn(onClick && "cursor-pointer transition-shadow hover:shadow-md")}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className={cn("mt-1 text-xl font-bold", toneClass(tone))}>{value}</p>
        {sub !== undefined && (
          <p
            className={cn(
              "mt-1 text-xs",
              subTone === "muted" || !subTone
                ? "text-muted-foreground"
                : toneClass(subTone),
            )}
          >
            {sub}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Charts ───────────────────────────────────────────────────

export const CHART_PALETTE = [
  "#5b4bff",
  "#16a34a",
  "#d97706",
  "#8b7be0",
  "#e07b8b",
  "#7bc8e0",
  "#c4cad4",
];

export function HBars({
  items,
  maxPct,
  valueLabel,
}: {
  items: { name: string; val: number; pct: number; color?: string }[];
  maxPct?: number;
  valueLabel?: (n: number) => string;
}) {
  const { money } = useFmt();
  const max = maxPct ?? Math.max(...items.map((i) => i.pct), 1);
  if (!items.length)
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nothing to show for this period yet.
      </p>
    );
  return (
    <div className="space-y-2.5">
      {items.map((e, i) => (
        <div key={e.name} className="flex items-center gap-3 text-xs">
          <span className="w-40 shrink-0 truncate text-muted-foreground" title={e.name}>
            {e.name}
          </span>
          <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
            <div
              className="flex h-full items-center justify-end rounded px-1.5 text-[10px] font-semibold text-white"
              style={{
                width: `${Math.max(2, (e.pct / max) * 100)}%`,
                background: e.color ?? CHART_PALETTE[i % CHART_PALETTE.length],
              }}
            >
              {e.pct > 8 ? `${Math.round(e.pct * 10) / 10}%` : ""}
            </div>
          </div>
          <span className="w-32 shrink-0 text-right font-medium">
            {valueLabel ? valueLabel(e.val) : money(e.val)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ColumnChart({
  labels,
  values,
}: {
  labels: string[];
  values: number[];
}) {
  const { compact } = useFmt();
  const max = Math.max(...values.map((v) => Math.abs(v)), 1);
  if (!values.length)
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No revenue posted yet this year.
      </p>
    );
  return (
    <div className="flex h-44 items-end gap-2">
      {values.map((v, i) => {
        const last = i === values.length - 1;
        return (
          <div key={labels[i]} className="flex h-full flex-1 flex-col items-center justify-end">
            <span
              className={cn(
                "mb-1 text-[10px]",
                last ? "font-semibold text-primary" : "text-muted-foreground",
              )}
            >
              {compact(v)}
            </span>
            <div
              className={cn("w-full rounded-t", last ? "bg-primary" : "bg-muted-foreground/30")}
              style={{ height: `${Math.max(2, (Math.abs(v) / max) * 78)}%` }}
            />
            <span className="mt-1 text-[10px] text-muted-foreground">{labels[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Pills ────────────────────────────────────────────────────

export function Pill({
  tone,
  children,
}: {
  tone: "green" | "amber" | "red" | "grey";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tone === "green" && "bg-success/10 text-success",
        tone === "amber" && "bg-warning/10 text-warning",
        tone === "red" && "bg-destructive/10 text-destructive",
        tone === "grey" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

// ── Statement table ──────────────────────────────────────────
//
// One renderer for the P&L, balance sheet, cash flow and budget so
// headings, totals and grand totals look the same everywhere.

export interface StatementColumn<R> {
  key: string;
  label: string;
  align?: "right" | "center";
  // Hidden by the comparative toggle on the P&L.
  className?: string;
  render: (row: R) => ReactNode;
}

export function StatementTable<R extends StatementRow<any>>({
  rows,
  columns,
  firstLabel,
}: {
  rows: R[];
  columns: StatementColumn<R>[];
  firstLabel: string;
}) {
  const span = columns.length + 1;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2.5 text-left font-semibold">{firstLabel}</th>
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "px-4 py-2.5 font-semibold",
                  c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                  c.className,
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            if (r.type === "s")
              return (
                <tr key={i}>
                  <td colSpan={span} className="h-2" />
                </tr>
              );
            if (r.type === "h")
              return (
                <tr key={i} className="bg-muted/60">
                  <td colSpan={span} className="px-4 py-2 text-xs font-bold uppercase tracking-wide">
                    {r.name}
                  </td>
                </tr>
              );
            if (r.type === "sh")
              return (
                <tr key={i}>
                  <td colSpan={span} className="px-5 pb-1 pt-2 text-xs font-semibold italic text-muted-foreground">
                    {r.name}
                  </td>
                </tr>
              );
            const strong = r.type !== "row";
            return (
              <tr
                key={i}
                className={cn(
                  "border-b last:border-b-0",
                  (r.type === "t" || r.type === "sub") && "bg-muted/30 font-semibold",
                  r.type === "gt" && "border-t-2 bg-muted/50 font-bold",
                  r.type === "hl" && "bg-primary/10 font-bold",
                )}
              >
                <td className={cn("px-4 py-2", !strong && "pl-7")}>
                  {r.code && (
                    <span className="mr-2 font-mono text-[11px] text-muted-foreground">
                      {r.code}
                    </span>
                  )}
                  {r.name}
                </td>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-4 py-2",
                      c.align === "right" && "text-right tabular-nums",
                      c.align === "center" && "text-center",
                      c.className,
                    )}
                  >
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Page-level headings used by every tab.
export function TabHeading({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
      <div>
        <h3 className="text-lg font-bold">{title}</h3>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export const asOfLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
