import { exportReportExcel, exportReportPdf, type ReportDefinition, type ReportSection } from "@/lib/grc/reportExport";
import type { ReportPack, StatementRow } from "@/lib/crm/report-api";
import { makeFormatters } from "./shared";

// ─────────────────────────────────────────────────────────────
// Download PDF / Excel for whichever report tab is open. Each tab is
// turned into a ReportDefinition (title, summary strip, tabular
// sections) from the same pack the screen is showing, so the file
// always matches the screen. The PDF carries formatted text; the Excel
// carries real numbers so finance can sum and filter them.
// ─────────────────────────────────────────────────────────────

type Cell = string | number;

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export const EXPORTABLE_TABS = new Set([
  "overview",
  "pnl",
  "balance-sheet",
  "cashflow",
  "trial-balance",
  "aged-rec",
  "aged-pay",
  "budget",
  "ratios",
]);

export function buildDefinition(pack: ReportPack, tab: string, raw: boolean): ReportDefinition | null {
  const m = pack.meta;
  const f = makeFormatters(m.currency);
  // In raw (Excel) mode numbers stay numbers.
  const n = (v: number | null | undefined): Cell => (raw ? Math.round((v ?? 0) * 100) / 100 : f.dash(v));
  const base = {
    subtitle: `${m.periodLabel} · amounts in ${m.currency}`,
  };

  // Statement rows → table rows (spacers dropped, headings kept as labelled rows).
  const statement = <V,>(rows: StatementRow<V>[], cells: (r: StatementRow<V>) => Cell[], width: number): Cell[][] =>
    rows
      .filter((r) => r.type !== "s")
      .map((r) => {
        const label = `${r.code ? r.code + "  " : ""}${r.name ?? ""}`;
        if (r.type === "h" || r.type === "sh") return [r.name ?? "", ...Array(width).fill("")];
        return [label, ...cells(r)];
      });

  const sec = (heading: string, columns: string[], rows: Cell[][], note?: string): ReportSection => ({
    heading,
    columns,
    rows,
    note,
  });

  switch (tab) {
    case "overview": {
      const k = pack.overview.kpis;
      return {
        id: "report-overview",
        title: "Finance Report — Overview",
        ...base,
        summary: [
          { label: "Revenue", value: f.money(k.revenue) },
          { label: "Net profit", value: f.money(k.netProfit) },
          { label: "Cash position", value: f.money(k.cashPosition) },
          { label: "Receivables", value: f.money(k.receivables) },
          { label: "Payables", value: f.money(k.payables) },
        ],
        sections: [
          sec(
            "Revenue trend",
            ["Month", "Revenue"],
            pack.overview.revenueTrend.map((r) => [r.label, n(r.value)]),
          ),
          sec(
            "Expense breakdown",
            ["Category", "Amount", "Share %"],
            pack.overview.expenseBreakdown.items.map((r) => [r.name, n(r.val), r.pct]),
          ),
        ],
      };
    }
    case "pnl":
      return {
        id: "report-pnl",
        title: "Profit and Loss Statement",
        ...base,
        sections: [
          sec(
            "Profit & Loss",
            ["Account", m.shortLabel, m.priorLabel, "Variance", m.ytdLabel],
            statement(
              pack.pnl.rows,
              (r) =>
                r.vals
                  ? [n(r.vals.cur), n(r.vals.prior), n(r.vals.cur - r.vals.prior), n(r.vals.ytd)]
                  : ["", "", "", ""],
              4,
            ),
            `For the period ended ${dayLabel(m.to)}. ${pack.notes.costOfServices}`,
          ),
        ],
      };
    case "balance-sheet":
      return {
        id: "report-bs",
        title: "Statement of Financial Position",
        ...base,
        sections: [
          sec(
            "Balance Sheet",
            ["Account", m.currency],
            statement(pack.balanceSheet.rows, (r) => [r.val === undefined ? "" : n(r.val)], 1),
            `As at ${dayLabel(pack.balanceSheet.asOf)}`,
          ),
        ],
      };
    case "cashflow":
      return {
        id: "report-cf",
        title: "Statement of Cash Flows",
        ...base,
        sections: [
          sec(
            "Cash Flow YTD",
            ["Description", m.currency],
            statement(pack.cashFlow.ytd.rows, (r) => [r.val === undefined ? "" : n(r.val)], 1),
            `${m.ytdLabel} · indirect method`,
          ),
          ...(m.periodType === "Year"
            ? []
            : [
                sec(
                  "Cash Flow Period",
                  ["Description", m.currency],
                  statement(pack.cashFlow.period.rows, (r) => [r.val === undefined ? "" : n(r.val)], 1),
                  `${m.periodLabel} · indirect method`,
                ),
              ]),
        ],
      };
    case "trial-balance": {
      const tb = pack.trialBalance;
      return {
        id: "report-tb",
        title: "Trial Balance",
        ...base,
        summary: [
          { label: "Total debit", value: f.money(tb.totalDebit) },
          { label: "Total credit", value: f.money(tb.totalCredit) },
          { label: "Status", value: tb.balanced ? "Balanced" : "OUT OF BALANCE" },
        ],
        sections: [
          sec(
            "Trial Balance",
            ["Code", "Account", "Type", "Debit", "Credit"],
            [
              ...tb.rows.map((r): Cell[] => [r.code, r.name, r.type, n(r.debit), n(r.credit)]),
              ["", "TOTAL", "", n(tb.totalDebit), n(tb.totalCredit)],
            ],
            `As at ${dayLabel(tb.asOf)}`,
          ),
        ],
      };
    }
    case "aged-rec": {
      const ar = pack.agedReceivables;
      return {
        id: "report-ar",
        title: "Aged Receivables",
        ...base,
        sections: [
          sec(
            "Aged Receivables",
            ["Client", "Current", "1-30", "31-60", "61-90", "90+", "Total", "Open invoices"],
            [
              ...ar.rows.map((r): Cell[] => [r.client, n(r.current), n(r.d30), n(r.d60), n(r.d90), n(r.d90p), n(r.total), r.invoices]),
              ["TOTAL", n(ar.buckets.current), n(ar.buckets.d30), n(ar.buckets.d60), n(ar.buckets.d90), n(ar.buckets.d90p), n(ar.total), ""],
            ],
            `As at ${dayLabel(ar.asOf)}.` +
              (Math.abs(ar.difference) > 0.5
                ? ` Ledger receivables balance is ${f.money(ar.glBalance)}; difference to this ageing ${f.money(ar.difference)}.`
                : ""),
          ),
        ],
      };
    }
    case "aged-pay": {
      const ap = pack.agedPayables;
      return {
        id: "report-ap",
        title: "Aged Payables",
        ...base,
        sections: [
          sec(
            "Aged Payables",
            ["Vendor", "Current", "1-30", "31-60", "60+", "Total", "Open bills"],
            [
              ...ap.rows.map((r): Cell[] => [r.vendor, n(r.current), n(r.d30), n(r.d60), n(r.d60p), n(r.total), r.bills]),
              ["TOTAL", n(ap.buckets.current), n(ap.buckets.d30), n(ap.buckets.d60), n(ap.buckets.d60p), n(ap.total), ""],
            ],
            `As at ${dayLabel(ap.asOf)}.` +
              (Math.abs(ap.difference) > 0.5
                ? ` Ledger payables balance is ${f.money(ap.glBalance)}; difference to this ageing ${f.money(ap.difference)}.`
                : ""),
          ),
        ],
      };
    }
    case "budget":
      return {
        id: "report-budget",
        title: "Budget vs Actuals",
        ...base,
        sections: [
          sec(
            "Budget vs Actuals",
            ["Line item", "Budget", "Actual", "Variance", "% of budget"],
            statement(
              pack.budget.rows,
              (r) =>
                r.vals
                  ? [
                      n(r.vals.budget),
                      n(r.vals.actual),
                      n(r.vals.actual - r.vals.budget),
                      r.vals.budget ? (raw ? Math.round((r.vals.actual / r.vals.budget) * 1000) / 10 : f.pct((r.vals.actual / r.vals.budget) * 100)) : "",
                    ]
                  : ["", "", "", ""],
              4,
            ),
            `Year to date — ${m.ytdLabel}.` + (pack.budget.hasBudget ? "" : " No budget has been entered for this year."),
          ),
        ],
      };
    case "ratios":
      return {
        id: "report-ratios",
        title: "Financial Ratios and Analysis",
        ...base,
        sections: pack.ratios.map((g) =>
          sec(
            `${g.group} ratios`,
            ["Ratio", "Value", "Target", "Status", "Formula"],
            g.items.map((r): Cell[] => [
              r.name,
              r.display,
              r.target,
              r.ok === null ? "No target" : r.ok ? "On track" : "Watch",
              r.formula,
            ]),
          ),
        ),
      };
    default:
      return null;
  }
}

export function exportTabPdf(pack: ReportPack, tab: string) {
  const def = buildDefinition(pack, tab, false);
  if (def) exportReportPdf(def);
}

export function exportTabExcel(pack: ReportPack, tab: string) {
  const def = buildDefinition(pack, tab, true);
  if (def) exportReportExcel(def);
}

// The whole report as one workbook: one sheet per statement. Used by the
// Excel button on the Management Report tab, which has no single table.
const SHEET_NAMES: Record<string, string> = {
  overview: "Overview",
  pnl: "P&L",
  "balance-sheet": "Balance Sheet",
  cashflow: "Cash Flow",
  "trial-balance": "Trial Balance",
  "aged-rec": "Aged Receivables",
  "aged-pay": "Aged Payables",
  budget: "Budget vs Actuals",
  ratios: "Ratios",
};

export function exportFullWorkbook(pack: ReportPack) {
  const tabs = ["overview", "pnl", "balance-sheet", "cashflow", "trial-balance", "aged-rec", "aged-pay", "budget", "ratios"];
  const defs = tabs.map((t) => buildDefinition(pack, t, true)) as ReportDefinition[];
  exportReportExcel({
    id: "report-full",
    title: "Finance Report",
    subtitle: `${pack.meta.periodLabel} · amounts in ${pack.meta.currency}`,
    summary: [
      { label: "Period", value: pack.meta.periodLabel },
      { label: "Currency", value: pack.meta.currency },
      { label: "Generated", value: new Date(pack.meta.generatedAt).toLocaleString() },
    ],
    sections: defs.flatMap((d, di) =>
      d.sections.map((s) => ({
        ...s,
        // Sheet names are limited to 31 characters, so lead with the tab's short name.
        heading:
          d.sections.length === 1
            ? SHEET_NAMES[tabs[di]]
            : s.heading.startsWith(SHEET_NAMES[tabs[di]])
              ? s.heading
              : `${SHEET_NAMES[tabs[di]]} - ${s.heading}`,
      })),
    ),
  });
}
