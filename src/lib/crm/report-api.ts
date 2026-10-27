import { api } from "../api";
import type { ReportPeriodType } from "./finance-api";

const unwrap = (res: any) => res.data?.data ?? res.data;

// ─────────────────────────────────────────────────────────────
// Finance → Report. One call returns everything every tab shows for
// the chosen period, already converted into the display currency
// (see ReportPackService in the engine).
// ─────────────────────────────────────────────────────────────

export type StatementRowType =
  | "h"
  | "sh"
  | "row"
  | "t"
  | "sub"
  | "gt"
  | "hl"
  | "s";

export interface StatementRow<V = Record<string, number>> {
  type: StatementRowType;
  name?: string;
  code?: string;
  vals?: V;
  val?: number;
}

export interface PnlCols {
  cur: number;
  prior: number;
  ytd: number;
}
export interface ActualBudget {
  actual: number;
  budget: number;
}

export interface CashFlowSection {
  rows: StatementRow[];
  operating: number;
  investing: number;
  financing: number;
  netChange: number;
  openingCash: number;
  closingCash: number;
  unmapped: number;
}

export interface AgedBuckets {
  current: number;
  d30: number;
  d60: number;
  d90: number;
  d90p: number;
}
export interface AgedReceivableRow extends AgedBuckets {
  client: string;
  clientUserId: string | null;
  total: number;
  invoices: number;
  oldestDays: number;
}
export interface AgedPayableRow {
  vendor: string;
  vendorId: string | null;
  current: number;
  d30: number;
  d60: number;
  d60p: number;
  total: number;
  bills: number;
  oldestDays: number;
}

export interface RatioItem {
  key: string;
  name: string;
  value: number | null;
  display: string;
  target: string;
  ok: boolean | null;
  trend: "up" | "down" | "flat" | null;
  formula: string;
}

export type LightStatus = "good" | "warn" | "bad" | "neutral";

export type RiskSeverity = "high" | "medium" | "low";
export type ActionPriority = "high" | "medium" | "normal" | "low";

export interface ReportRisk {
  id?: string;
  severity: RiskSeverity;
  text: string;
  impact: string;
  likelihood: string;
  owner: string;
  mitigation: string;
}
export interface ReportAction {
  id?: string;
  priority: ActionPriority;
  text: string;
  owner: string;
  due: string;
}
export interface ReportCommentary {
  ceoMessage: string;
  revenue: string;
  costs: string;
  cashflow: string;
  receivables: string;
  payables: string;
  budget: string;
}

export interface ReportPack {
  meta: {
    periodType: ReportPeriodType;
    periodKey: string;
    periodLabel: string;
    shortLabel: string;
    priorLabel: string;
    ytdLabel: string;
    from: string;
    to: string;
    ytdFrom: string;
    asOf: string;
    baseCurrency: string;
    currency: string;
    rate: number;
    generatedAt: string;
  };
  overview: {
    kpis: {
      revenue: number;
      revenuePrior: number;
      revenueChangePct: number | null;
      netProfit: number;
      netProfitPrior: number;
      netMargin: number | null;
      cashPosition: number;
      cashChangePct: number | null;
      receivables: number;
      receivablesOverdue60Plus: number;
      payables: number;
      revenueYtd: number;
      revenuePctOfAnnualBudget: number | null;
      monthlyBurn: number;
      runwayMonths: number | null;
      dso: number | null;
    };
    revenueTrend: { label: string; value: number }[];
    expenseBreakdown: {
      total: number;
      items: { name: string; val: number; pct: number }[];
    };
  };
  pnl: {
    rows: StatementRow<PnlCols>[];
    totals: {
      revenue: PnlCols;
      costOfServices: PnlCols;
      grossProfit: PnlCols;
      operatingExpenses: PnlCols;
      ebit: PnlCols;
      otherNet: PnlCols;
      profitBeforeTax: PnlCols;
      tax: PnlCols;
      netProfit: PnlCols;
    };
  };
  balanceSheet: {
    rows: StatementRow[];
    asOf: string;
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    currentAssets: number;
    currentLiabilities: number;
    nonCurrentAssets: number;
    nonCurrentLiabilities: number;
    balanced: boolean;
  };
  cashFlow: { period: CashFlowSection; ytd: CashFlowSection };
  trialBalance: {
    asOf: string;
    rows: {
      code: string;
      name: string;
      type: string;
      debit: number;
      credit: number;
    }[];
    totalDebit: number;
    totalCredit: number;
    balanced: boolean;
  };
  agedReceivables: {
    asOf: string;
    rows: AgedReceivableRow[];
    buckets: AgedBuckets;
    total: number;
    overdue60Plus: number;
    overdueTotal: number;
    glBalance: number;
    difference: number;
  };
  agedPayables: {
    asOf: string;
    rows: AgedPayableRow[];
    buckets: { current: number; d30: number; d60: number; d60p: number };
    total: number;
    glBalance: number;
    difference: number;
  };
  budget: {
    hasBudget: boolean;
    rows: StatementRow<ActualBudget>[];
    totals: {
      revenue: ActualBudget;
      costOfServices: ActualBudget;
      grossProfit: ActualBudget;
      operatingExpenses: ActualBudget;
      ebit: ActualBudget;
      profitBeforeTax: ActualBudget;
      netProfit: ActualBudget;
    };
    periodBudget: { revenue: number; expenses: number };
    annualBudget: { revenue: number; expenses: number };
  };
  ratios: { group: string; items: RatioItem[] }[];
  revenueAnalysis: {
    serviceLines: { name: string; val: number; pct: number }[];
    topClients: { name: string; val: number }[];
    invoicedTotal: number;
  };
  lights: Record<
    "revenue" | "collections" | "costs",
    { status: LightStatus; text: string }
  >;
  management: {
    commentary: ReportCommentary;
    ceoMessageStatus: "Draft" | "Final";
    risks: ReportRisk[];
    actions: ReportAction[];
    lastEditedBy: string;
    updatedAt: string | null;
    boardRecipients: number;
  };
  notes: { costOfServices: string; targets: string; position: string };
}

export const fetchReportPack = async (
  periodType: ReportPeriodType,
  periodKey: string,
  displayCurrency?: string,
): Promise<ReportPack> =>
  unwrap(
    await api.get(
      `/finance/management-reports/${periodType}/${periodKey}/pack`,
      { params: displayCurrency ? { displayCurrency } : undefined },
    ),
  );

export interface SaveReportContentPayload {
  commentary?: Partial<ReportCommentary>;
  ceoMessageStatus?: "Draft" | "Final";
  risks?: Omit<ReportRisk, "id">[];
  actions?: Omit<ReportAction, "id">[];
}
export const saveReportContent = async (
  periodType: ReportPeriodType,
  periodKey: string,
  dto: SaveReportContentPayload,
) =>
  unwrap(
    await api.put(
      `/finance/management-reports/${periodType}/${periodKey}/content`,
      dto,
    ),
  );

export const emailReportToBoard = async (
  periodType: ReportPeriodType,
  periodKey: string,
  dto: { subject?: string; displayCurrency?: string },
): Promise<{ sent: boolean; count: number }> =>
  unwrap(
    await api.post(
      `/finance/management-reports/${periodType}/${periodKey}/email-board`,
      dto,
    ),
  );

// ── Budgets (one per month, per ledger account, in base currency) ──

export interface BudgetLine {
  accountCode: string;
  accountName: string;
  budgetedAmount: number;
}
export const fetchBudget = async (
  period: string,
): Promise<{ period: string; lines: BudgetLine[] }> =>
  unwrap(await api.get(`/finance/budgets/${period}`));
export const saveBudget = async (period: string, lines: BudgetLine[]) =>
  unwrap(await api.post(`/finance/budgets/${period}`, { lines }));
export const copyBudgetFrom = async (period: string, fromPeriod: string) =>
  unwrap(await api.post(`/finance/budgets/${period}/copy-from/${fromPeriod}`));
