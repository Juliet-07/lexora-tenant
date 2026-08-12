/**
 * Finance module mock data — Lexora Africa Finance specification.
 * Sections: Sales, Purchases, Banking, Tax, Reporting (Financials),
 * Accounting, Trust, Fund accounting. Prototype data only.
 */

export const fmoney = (n: number, ccy = "RWF") =>
  `${ccy} ${Math.round(n).toLocaleString()}`;

export const TODAY = "2026-07-31";

/* ── 1. Sales ───────────────────────────────────────────── */

export interface WipItem {
  id: string;
  member: string;
  mandate: string;
  client: string;
  task: string;
  narrative: string;
  date: string;
  hours: number;
  rate: number;
  status: "Unbilled" | "Approved for billing" | "Written down" | "Written off" | "Held";
  ageDays: number;
  kind: "Time" | "Disbursement";
  markupPct?: number;
}

export const wip: WipItem[] = [
  { id: "WIP-001", member: "Aline Uwase", mandate: "Kigali Heights Lease", client: "Horizon Property Ltd", task: "Lease review", narrative: "Reviewed head lease and prepared mark-up", date: "2026-07-04", hours: 6.5, rate: 85000, status: "Approved for billing", ageDays: 27, kind: "Time" },
  { id: "WIP-002", member: "Eric Mugisha", mandate: "Series A — Nova Pay", client: "Nova Pay Rwanda", task: "SHA drafting", narrative: "Drafted shareholders agreement v3", date: "2026-06-18", hours: 12, rate: 120000, status: "Unbilled", ageDays: 43, kind: "Time" },
  { id: "WIP-003", member: "Sandrine Iradukunda", mandate: "BNR Licence Renewal", client: "Umoja Capital", task: "Regulatory filing", narrative: "Compiled renewal pack and covering letter", date: "2026-05-21", hours: 9, rate: 95000, status: "Held", ageDays: 71, kind: "Time" },
  { id: "WIP-004", member: "Finance", mandate: "Kigali Heights Lease", client: "Horizon Property Ltd", task: "Search fees", narrative: "Land registry searches (rechargeable)", date: "2026-07-09", hours: 0, rate: 0, status: "Approved for billing", ageDays: 22, kind: "Disbursement", markupPct: 10 },
  { id: "WIP-005", member: "Eric Mugisha", mandate: "Group Restructure", client: "Sasa Foods Group", task: "Advisory", narrative: "Tax structuring memo", date: "2026-04-02", hours: 15, rate: 120000, status: "Written down", ageDays: 120, kind: "Time" },
];

export const wipValue = (w: WipItem) =>
  w.kind === "Disbursement"
    ? 480000 * (1 + (w.markupPct ?? 0) / 100)
    : w.hours * w.rate;

export const wipBand = (days: number) =>
  days <= 30 ? "0–30" : days <= 60 ? "31–60" : days <= 90 ? "61–90" : "90+";

export interface Quote {
  id: string;
  client: string;
  title: string;
  amount: number;
  currency: string;
  issued: string;
  expires: string;
  status: "Draft" | "Sent" | "Accepted" | "Declined" | "Expired";
  kind: "Quote" | "Proforma";
}

export const quotes: Quote[] = [
  { id: "QT-2026-014", client: "Nova Pay Rwanda", title: "Series A legal package", amount: 18500000, currency: "RWF", issued: "2026-07-02", expires: "2026-08-02", status: "Sent", kind: "Quote" },
  { id: "QT-2026-015", client: "Sasa Foods Group", title: "Group restructure advisory", amount: 24000000, currency: "RWF", issued: "2026-06-11", expires: "2026-07-11", status: "Accepted", kind: "Quote" },
  { id: "QT-2026-016", client: "Umoja Capital", title: "Licence renewal support", amount: 7200000, currency: "RWF", issued: "2026-05-28", expires: "2026-06-28", status: "Expired", kind: "Quote" },
  { id: "PF-2026-008", client: "Horizon Property Ltd", title: "Lease advisory — pre-billing", amount: 5400000, currency: "RWF", issued: "2026-07-20", expires: "2026-08-05", status: "Sent", kind: "Proforma" },
];

export interface CreditNote {
  id: string;
  invoice: string;
  client: string;
  amount: number;
  reason: string;
  date: string;
  ebm: "Synced" | "Pending" | "Error";
  approvedBy: string;
}

export const creditNotes: CreditNote[] = [
  { id: "CN-2026-003", invoice: "INV-2026-118", client: "Umoja Capital", amount: 1200000, reason: "Duplicate line item billed", date: "2026-06-30", ebm: "Synced", approvedBy: "Partner — J. Karake" },
  { id: "CN-2026-004", invoice: "INV-2026-131", client: "Sasa Foods Group", amount: 2500000, reason: "Goodwill write-down after fee review", date: "2026-07-18", ebm: "Pending", approvedBy: "Partner — J. Karake" },
];

export interface RecurringInvoice {
  id: string;
  client: string;
  mandate: string;
  amount: number;
  frequency: "Monthly" | "Quarterly" | "Annually";
  nextRun: string;
  status: "Active" | "Paused";
}

export const recurringInvoices: RecurringInvoice[] = [
  { id: "REC-001", client: "Horizon Property Ltd", mandate: "Retainer — Corporate", amount: 3500000, frequency: "Monthly", nextRun: "2026-08-01", status: "Active" },
  { id: "REC-002", client: "Umoja Capital", mandate: "Compliance retainer", amount: 2200000, frequency: "Monthly", nextRun: "2026-08-01", status: "Paused" },
  { id: "REC-003", client: "Nova Pay Rwanda", mandate: "Company secretarial", amount: 4800000, frequency: "Quarterly", nextRun: "2026-09-30", status: "Active" },
];

export interface Receivable {
  id: string;
  client: string;
  mandate: string;
  amount: number;
  due: string;
  daysOverdue: number;
  stage: "Current" | "31–60" | "61–90" | "90+";
  dunningPaused?: boolean;
  lastAction?: string;
  notes?: string;
}

export const receivables: Receivable[] = [
  { id: "INV-2026-140", client: "Horizon Property Ltd", mandate: "Kigali Heights Lease", amount: 6400000, due: "2026-08-10", daysOverdue: 0, stage: "Current" },
  { id: "INV-2026-129", client: "Nova Pay Rwanda", mandate: "Series A — Nova Pay", amount: 11200000, due: "2026-06-20", daysOverdue: 41, stage: "31–60", lastAction: "1st reminder sent 2026-07-05", notes: "CFO confirmed payment run mid-August" },
  { id: "INV-2026-118", client: "Umoja Capital", mandate: "BNR Licence Renewal", amount: 7800000, due: "2026-05-22", daysOverdue: 70, stage: "61–90", lastAction: "2nd reminder + partner escalation", notes: "Awaiting board approval" },
  { id: "INV-2026-101", client: "Sasa Foods Group", mandate: "Group Restructure", amount: 15400000, due: "2026-03-30", daysOverdue: 123, stage: "90+", dunningPaused: true, lastAction: "Payment plan agreed 2026-07-01", notes: "3 instalments, first paid" },
];

export const dunningStages = [
  { stage: "Current", note: "No action" },
  { stage: "31–60", note: "1st reminder" },
  { stage: "61–90", note: "2nd reminder + escalation" },
  { stage: "90+", note: "Final notice + write-off review" },
] as const;

export interface PaymentPlan {
  id: string;
  invoice: string;
  client: string;
  instalments: { due: string; amount: number; status: "Scheduled" | "Paid" | "Overdue" }[];
}

export const paymentPlans: PaymentPlan[] = [
  {
    id: "PP-001",
    invoice: "INV-2026-101",
    client: "Sasa Foods Group",
    instalments: [
      { due: "2026-07-05", amount: 5133333, status: "Paid" },
      { due: "2026-08-05", amount: 5133333, status: "Scheduled" },
      { due: "2026-09-05", amount: 5133334, status: "Scheduled" },
    ],
  },
];

export const badDebtBands = [
  { band: "90 days", provisionPct: 25, exposure: 7800000 },
  { band: "120 days", provisionPct: 50, exposure: 3200000 },
  { band: "180 days", provisionPct: 100, exposure: 15400000 },
];

/* ── 2. Purchases ───────────────────────────────────────── */

export interface Bill {
  id: string;
  vendor: string;
  description: string;
  category: string;
  amount: number;
  due: string;
  status: "Draft" | "Awaiting approval" | "Approved" | "Scheduled" | "Paid";
  recurring?: boolean;
}

export const bills: Bill[] = [
  { id: "BILL-2026-071", vendor: "Kigali Business Park", description: "Office rent — August", category: "Premises", amount: 4200000, due: "2026-08-01", status: "Scheduled", recurring: true },
  { id: "BILL-2026-072", vendor: "MTN Rwanda", description: "Connectivity & data", category: "IT", amount: 780000, due: "2026-08-05", status: "Approved", recurring: true },
  { id: "BILL-2026-073", vendor: "Deloitte Rwanda", description: "External audit fees", category: "Professional", amount: 9500000, due: "2026-08-20", status: "Awaiting approval" },
  { id: "BILL-2026-069", vendor: "Rwanda Energy Group", description: "Utilities — July", category: "Premises", amount: 620000, due: "2026-07-25", status: "Paid" },
];

export interface ExpenseClaim {
  id: string;
  employee: string;
  description: string;
  category: string;
  mandate?: string;
  amount: number;
  submitted: string;
  rechargeable: boolean;
  status: "Submitted" | "Approved" | "Rejected" | "Scheduled" | "Paid";
}

export const expenseClaims: ExpenseClaim[] = [
  { id: "EXP-221", employee: "Aline Uwase", description: "Client travel — Musanze site visit", category: "Travel", mandate: "Kigali Heights Lease", amount: 185000, submitted: "2026-07-14", rechargeable: true, status: "Approved" },
  { id: "EXP-222", employee: "Eric Mugisha", description: "Notary fees", category: "Disbursement", mandate: "Series A — Nova Pay", amount: 340000, submitted: "2026-07-19", rechargeable: true, status: "Submitted" },
  { id: "EXP-223", employee: "Sandrine Iradukunda", description: "CPD seminar", category: "Training", amount: 250000, submitted: "2026-07-02", rechargeable: false, status: "Paid" },
];

export const expensePolicies = [
  { rule: "Per diem — domestic", value: "RWF 35,000 / day" },
  { rule: "Mileage", value: "RWF 650 / km" },
  { rule: "Receipt threshold", value: "Required above RWF 10,000" },
  { rule: "Approval chain", value: "Line manager → Finance above RWF 500,000" },
  { rule: "Blacklisted categories", value: "Alcohol, personal entertainment" },
];

export const payrollPayments = [
  { period: "July 2026", employees: 34, gross: 62400000, paye: 11800000, rssb: 6240000, net: 44360000, status: "Awaiting authorisation" },
  { period: "June 2026", employees: 34, gross: 61900000, paye: 11650000, rssb: 6190000, net: 44060000, status: "Paid" },
  { period: "May 2026", employees: 33, gross: 59800000, paye: 11200000, rssb: 5980000, net: 42620000, status: "Paid" },
];

export interface Vendor {
  id: string;
  name: string;
  tin: string;
  terms: string;
  category: string;
  currency: string;
  wht: boolean;
  outstanding: number;
  band: "Current" | "31–60" | "61–90" | "90+";
}

export const vendors: Vendor[] = [
  { id: "V-001", name: "Kigali Business Park", tin: "102938475", terms: "Net 15", category: "Premises", currency: "RWF", wht: false, outstanding: 4200000, band: "Current" },
  { id: "V-002", name: "Deloitte Rwanda", tin: "112233445", terms: "Net 30", category: "Professional", currency: "RWF", wht: false, outstanding: 9500000, band: "31–60" },
  { id: "V-003", name: "LexisNexis UK", tin: "GB-8834221", terms: "Net 30", category: "Subscriptions", currency: "GBP", wht: true, outstanding: 3100000, band: "61–90" },
  { id: "V-004", name: "MTN Rwanda", tin: "100200300", terms: "Net 7", category: "IT", currency: "RWF", wht: false, outstanding: 780000, band: "Current" },
];

/* ── 3. Banking ─────────────────────────────────────────── */

export const bankAccounts = [
  { id: "BA-01", name: "Office Operating", bank: "Bank of Kigali", number: "•••• 4471", currency: "RWF", balance: 148600000, type: "Office", synced: "2026-07-31 06:00" },
  { id: "BA-02", name: "Office USD", bank: "I&M Bank", number: "•••• 9902", currency: "USD", balance: 92400, type: "Office", synced: "2026-07-31 06:00" },
  { id: "BA-03", name: "Client Trust — Pooled", bank: "Bank of Kigali", number: "•••• 5510", currency: "RWF", balance: 310250000, type: "Trust", synced: "2026-07-31 06:00" },
  { id: "BA-04", name: "Fund I Capital Account", bank: "Equity Bank", number: "•••• 7723", currency: "USD", balance: 1840000, type: "Special purpose", synced: "2026-07-30 18:00" },
];

export const bankFeed = [
  { id: "TX-9001", date: "2026-07-29", description: "TRF NOVA PAY LTD INV129", amount: 11200000, matched: "INV-2026-129", status: "Matched" },
  { id: "TX-9002", date: "2026-07-28", description: "MOMO PAYMENT 0788***221", amount: 450000, matched: "", status: "Unmatched" },
  { id: "TX-9003", date: "2026-07-27", description: "REG — KIGALI BUSINESS PARK", amount: -4200000, matched: "BILL-2026-071", status: "Matched" },
  { id: "TX-9004", date: "2026-07-26", description: "FX INWARD REMITTANCE", amount: 6800000, matched: "", status: "Unmatched" },
];

export const bankRules = [
  { id: "BR-1", match: "Description contains 'KIGALI BUSINESS PARK'", account: "6100 · Rent", auto: true },
  { id: "BR-2", match: "Description contains 'MTN'", account: "6250 · Communications", auto: true },
  { id: "BR-3", match: "Reference starts with 'INV-'", account: "1200 · Trade receivables", auto: true },
];

export const cashForecast = [
  { horizon: "30 days", inflow: 41200000, outflow: 33800000, closing: 156000000 },
  { horizon: "60 days", inflow: 78400000, outflow: 69100000, closing: 165300000 },
  { horizon: "90 days", inflow: 112700000, outflow: 104900000, closing: 173100000 },
];

export const transfers = [
  { id: "TRF-041", date: "2026-07-22", from: "Client Trust — Pooled", to: "Office Operating", amount: 5200000, reference: "Drawdown DRW-018", authoriser: "J. Karake" },
  { id: "TRF-042", date: "2026-07-25", from: "Office Operating", to: "Office USD", amount: 12000000, reference: "FX funding", authoriser: "M. Habimana" },
];

/* ── 4. Tax ─────────────────────────────────────────────── */

export const taxCalendar = [
  { obligation: "VAT return", period: "July 2026", due: "2026-08-15", amount: 8420000, status: "Draft" },
  { obligation: "PAYE remittance", period: "July 2026", due: "2026-08-15", amount: 11800000, status: "Draft" },
  { obligation: "RSSB contributions", period: "July 2026", due: "2026-08-15", amount: 6240000, status: "Draft" },
  { obligation: "WHT remittance", period: "July 2026", due: "2026-08-15", amount: 1465000, status: "Draft" },
  { obligation: "CIT provisional Q2", period: "Q2 2026", due: "2026-06-30", amount: 18500000, status: "Filed" },
];

export const vatLines = [
  { category: "Standard rated (B) 18%", base: 128400000, vat: 23112000, type: "Output" },
  { category: "Zero rated (C)", base: 18600000, vat: 0, type: "Output" },
  { category: "Exempt (A)", base: 9200000, vat: 0, type: "Output" },
  { category: "Input VAT on bills", base: 81600000, vat: 14688000, type: "Input" },
];

export const whtRegister = [
  { vendor: "LexisNexis UK", invoice: "LN-3391", gross: 3100000, rate: 15, wht: 465000, net: 2635000, certificate: "WHT-2026-021", status: "Remitted" },
  { vendor: "Global Advisory FZE", invoice: "GA-1180", gross: 6660000, rate: 15, wht: 999000, net: 5661000, certificate: "WHT-2026-022", status: "Pending" },
];

export const ebmStatus = [
  { document: "INV-2026-140", receipt: "EBM-88213", classification: "B — 18%", status: "Synced" },
  { document: "INV-2026-139", receipt: "—", classification: "B — 18%", status: "Pending" },
  { document: "CN-2026-004", receipt: "—", classification: "Credit note", status: "Error" },
];

/* ── 5. Financials / Reporting ──────────────────────────── */

export const plLines = [
  { line: "Revenue — Corporate & Commercial", actual: 218400000, budget: 205000000, prior: 191200000, group: "Revenue" },
  { line: "Revenue — Regulatory & Compliance", actual: 96700000, budget: 110000000, prior: 88400000, group: "Revenue" },
  { line: "Revenue — Transactions & Funds", actual: 141300000, budget: 128000000, prior: 102600000, group: "Revenue" },
  { line: "Direct costs — fee earner salaries", actual: -186200000, budget: -180000000, prior: -168900000, group: "Direct cost" },
  { line: "Direct costs — disbursements", actual: -18400000, budget: -16000000, prior: -14700000, group: "Direct cost" },
  { line: "Overheads — premises", actual: -50400000, budget: -50400000, prior: -46800000, group: "Opex" },
  { line: "Overheads — technology", actual: -22800000, budget: -21000000, prior: -18300000, group: "Opex" },
  { line: "Overheads — admin & other", actual: -34600000, budget: -32000000, prior: -31100000, group: "Opex" },
];

export const balanceSheet = {
  assets: [
    { line: "Fixed assets (NBV)", current: 84300000, prior: 91200000 },
    { line: "Movable assets (NBV)", current: 31600000, prior: 28400000 },
    { line: "Trade receivables", current: 40800000, prior: 46100000 },
    { line: "Unbilled WIP", current: 27900000, prior: 24500000 },
    { line: "Bank — office", current: 148600000, prior: 121900000 },
    { line: "Bank — trust (contra)", current: 310250000, prior: 288400000 },
  ],
  liabilities: [
    { line: "Trade payables", current: 17580000, prior: 21300000 },
    { line: "Accruals", current: 9400000, prior: 8700000 },
    { line: "Tax payable (VAT, PAYE, RSSB, CIT)", current: 46925000, prior: 42100000 },
    { line: "Client funds held in trust", current: 310250000, prior: 288400000 },
  ],
  equity: [
    { line: "Partners' capital", current: 180000000, prior: 180000000 },
    { line: "Retained earnings", current: 79295000, prior: 60000000 },
  ],
};

export const cashFlow = [
  { line: "Cash from operations", amount: 62400000 },
  { line: "Working capital movement", amount: -8900000 },
  { line: "Tax paid", amount: -18500000 },
  { line: "Investing — asset purchases", amount: -9200000 },
  { line: "Financing — partner drawings", amount: -14000000 },
];

export const serviceLinePl = [
  { line: "Corporate & Commercial", revenue: 218400000, directCost: 121000000, overhead: 38000000 },
  { line: "Regulatory & Compliance", revenue: 96700000, directCost: 58200000, overhead: 19400000 },
  { line: "Transactions & Funds", revenue: 141300000, directCost: 71400000, overhead: 24800000 },
];

export const clientProfitability = [
  { client: "Nova Pay Rwanda", revenue: 88400000, cost: 44100000, recovery: 92 },
  { client: "Sasa Foods Group", revenue: 71200000, cost: 49800000, recovery: 74 },
  { client: "Horizon Property Ltd", revenue: 54600000, cost: 25300000, recovery: 96 },
  { client: "Umoja Capital", revenue: 39800000, cost: 28400000, recovery: 68 },
];

export const financeKpis = [
  { kpi: "Gross margin", value: "54.2%", target: "52%", trend: "+2.1pt" },
  { kpi: "Net margin", value: "31.4%", target: "30%", trend: "+1.4pt" },
  { kpi: "Revenue / employee", value: "RWF 13.4m", target: "RWF 12.5m", trend: "+7%" },
  { kpi: "Utilisation", value: "71%", target: "75%", trend: "-2pt" },
  { kpi: "Effective hourly rate", value: "RWF 92,400", target: "RWF 90,000", trend: "+3%" },
  { kpi: "Lock-up days", value: "68", target: "55", trend: "-4 days" },
  { kpi: "Collection rate", value: "88%", target: "92%", trend: "+1pt" },
  { kpi: "Overhead ratio", value: "22.6%", target: "23%", trend: "-0.4pt" },
];

export const budgetVariance = [
  { line: "Revenue", budget: 443000000, actual: 456400000 },
  { line: "Direct costs", budget: 196000000, actual: 204600000 },
  { line: "Overheads", budget: 103400000, actual: 107800000 },
];

/* ── 6. Accounting ──────────────────────────────────────── */

export const chartOfAccounts = [
  { code: "1000", name: "Bank — office operating", type: "Asset" },
  { code: "1100", name: "Bank — client trust", type: "Asset" },
  { code: "1200", name: "Trade receivables", type: "Asset" },
  { code: "1300", name: "Unbilled WIP", type: "Asset" },
  { code: "1500", name: "Fixed assets — cost", type: "Asset" },
  { code: "2000", name: "Trade payables", type: "Liability" },
  { code: "2200", name: "VAT payable", type: "Liability" },
  { code: "2300", name: "PAYE & RSSB payable", type: "Liability" },
  { code: "3000", name: "Partners' capital", type: "Equity" },
  { code: "4000", name: "Fee income — corporate", type: "Revenue" },
  { code: "4100", name: "Fee income — regulatory", type: "Revenue" },
  { code: "5000", name: "Fee earner salaries", type: "Cost" },
  { code: "6100", name: "Rent", type: "Opex" },
  { code: "6250", name: "Communications", type: "Opex" },
  { code: "6900", name: "Bad debt expense", type: "Opex" },
];

export const journals = [
  { id: "JNL-2026-081", date: "2026-07-31", narration: "Monthly depreciation", debit: "6500 · Depreciation", credit: "1590 · Accumulated depreciation", amount: 3150000, status: "Posted" },
  { id: "JNL-2026-082", date: "2026-07-31", narration: "Bad debt provision — 90+ band", debit: "6900 · Bad debt expense", credit: "1290 · Provision for doubtful debts", amount: 5800000, status: "Awaiting approval" },
  { id: "JNL-2026-083", date: "2026-07-31", narration: "Accrued audit fees", debit: "6400 · Professional fees", credit: "2100 · Accruals", amount: 9500000, status: "Posted" },
];

export interface AssetRecord {
  id: string;
  name: string;
  category: string;
  kind: "Fixed" | "Movable";
  cost: number;
  acquired: string;
  usefulLife: number;
  nbv: number;
  assignedTo?: string;
  condition?: string;
  status: "In use" | "In store" | "Disposed";
  insurer?: string;
  renewal?: string;
}

export const assets: AssetRecord[] = [
  { id: "FA-014", name: "Leasehold improvements — 4th floor", category: "Leasehold", kind: "Fixed", cost: 62000000, acquired: "2023-02-01", usefulLife: 10, nbv: 40300000, status: "In use", insurer: "Radiant Insurance", renewal: "2026-11-30" },
  { id: "FA-021", name: "Boardroom furniture set", category: "Furniture", kind: "Fixed", cost: 14500000, acquired: "2024-06-15", usefulLife: 8, nbv: 10800000, status: "In use" },
  { id: "MA-108", name: "MacBook Pro 14 — E. Mugisha", category: "IT equipment", kind: "Movable", cost: 3200000, acquired: "2025-03-10", usefulLife: 4, nbv: 2100000, assignedTo: "Eric Mugisha", condition: "Good", status: "In use", insurer: "Sanlam", renewal: "2027-03-09" },
  { id: "MA-119", name: "Toyota RAV4 — pool vehicle", category: "Vehicle", kind: "Movable", cost: 42000000, acquired: "2022-09-01", usefulLife: 6, nbv: 15400000, assignedTo: "Operations", condition: "Fair", status: "In use", insurer: "Radiant Insurance", renewal: "2026-09-01" },
];

export const maintenanceLog = [
  { asset: "MA-119", date: "2026-06-12", description: "Service and tyre replacement", vendor: "Toyota Rwanda", cost: 980000 },
  { asset: "FA-014", date: "2026-04-03", description: "HVAC servicing", vendor: "CoolTech Ltd", cost: 420000 },
];

/* ── 8. Fund accounting ─────────────────────────────────── */

export interface Fund {
  id: string;
  name: string;
  structure: string;
  jurisdiction: string;
  strategy: string;
  targetSize: number;
  currency: string;
  vintage: number;
  status: "Fundraising" | "Investing" | "Harvesting" | "Wound up";
  mgmtFeePct: number;
  carryPct: number;
  hurdlePct: number;
  committed: number;
  called: number;
  distributed: number;
  nav: number;
}

export const funds: Fund[] = [
  { id: "FND-01", name: "Lexora Growth Fund I", structure: "Limited Partnership", jurisdiction: "Kigali IFC", strategy: "Growth equity — East Africa", targetSize: 50000000, currency: "USD", vintage: 2023, status: "Investing", mgmtFeePct: 2, carryPct: 20, hurdlePct: 8, committed: 42000000, called: 21400000, distributed: 4600000, nav: 26800000 },
  { id: "FND-02", name: "Lexora Impact Fund II", structure: "Limited Partnership", jurisdiction: "Mauritius", strategy: "Impact / SME debt", targetSize: 30000000, currency: "USD", vintage: 2025, status: "Fundraising", mgmtFeePct: 1.75, carryPct: 15, hurdlePct: 7, committed: 12500000, called: 3100000, distributed: 0, nav: 3050000 },
];

export const capitalAccounts = [
  { fund: "FND-01", lp: "Rwanda Pension Board", commitment: 15000000, called: 7650000, distributed: 1650000, nav: 9580000 },
  { fund: "FND-01", lp: "Atlas DFI", commitment: 12000000, called: 6120000, distributed: 1320000, nav: 7660000 },
  { fund: "FND-01", lp: "Family Office Partners", commitment: 9000000, called: 4590000, distributed: 990000, nav: 5750000 },
  { fund: "FND-01", lp: "GP Commitment", commitment: 6000000, called: 3040000, distributed: 640000, nav: 3810000 },
  { fund: "FND-02", lp: "Kigali Impact Trust", commitment: 7500000, called: 1860000, distributed: 0, nav: 1830000 },
  { fund: "FND-02", lp: "Nordic Impact SA", commitment: 5000000, called: 1240000, distributed: 0, nav: 1220000 },
];

export const capitalCalls = [
  { id: "CC-2026-03", fund: "FND-01", purpose: "Investment — Zuba Logistics", amount: 4200000, issued: "2026-06-15", due: "2026-06-30", status: "Fully funded" },
  { id: "CC-2026-04", fund: "FND-01", purpose: "Management fee + expenses", amount: 950000, issued: "2026-07-10", due: "2026-07-25", status: "Partially funded" },
  { id: "CC-2026-05", fund: "FND-02", purpose: "First close deployment", amount: 1240000, issued: "2026-07-20", due: "2026-08-05", status: "Issued" },
];

export const distributions = [
  { id: "DST-2026-02", fund: "FND-01", source: "Exit — Mango Retail (partial)", gross: 3800000, roc: 2600000, pref: 620000, catchUp: 180000, carry: 80000, netToLps: 3720000, date: "2026-05-28", status: "Paid" },
  { id: "DST-2026-03", fund: "FND-01", source: "Portfolio dividend income", gross: 800000, roc: 640000, pref: 128000, catchUp: 20000, carry: 12000, netToLps: 788000, date: "2026-07-18", status: "Notice issued" },
];

export const navHistory = [
  { fund: "FND-01", period: "Q2 2026", nav: 26800000, dpi: 0.21, rvpi: 1.25, tvpi: 1.46, irr: 18.4 },
  { fund: "FND-01", period: "Q1 2026", nav: 24900000, dpi: 0.15, rvpi: 1.18, tvpi: 1.33, irr: 16.1 },
  { fund: "FND-02", period: "Q2 2026", nav: 3050000, dpi: 0, rvpi: 0.98, tvpi: 0.98, irr: -1.6 },
];

export const managementFees = [
  { fund: "FND-01", period: "Q2 2026", basis: "Invested capital", rate: 2, amount: 428000, offsets: 45000, net: 383000, status: "Invoiced" },
  { fund: "FND-02", period: "Q2 2026", basis: "Committed capital", rate: 1.75, amount: 54687, offsets: 0, net: 54687, status: "Accrued" },
];

export const carriedInterest = [
  { fund: "FND-01", accrued: 1240000, crystallised: 92000, hurdleMet: true },
  { fund: "FND-02", accrued: 0, crystallised: 0, hurdleMet: false },
];

export const lpReports = [
  { fund: "FND-01", period: "Q2 2026", type: "Quarterly report + capital account statement", issued: "2026-07-20", status: "Distributed" },
  { fund: "FND-01", period: "FY2025", type: "Audited financial statements", issued: "2026-04-30", status: "Distributed" },
  { fund: "FND-02", period: "Q2 2026", type: "Quarterly report", issued: "—", status: "Drafting" },
];

export const fundLifecycle = [
  "Fund formation & LPA terms",
  "Fundraising & closes",
  "Capital calls & deployment",
  "Portfolio monitoring & NAV",
  "Distributions & waterfall",
  "Wind-down & final accounting",
];

/* ── 9. Budget vs actual (Reporting) ────────────────────── */

export const REPORTING_PERIOD = "Year to date, 31 July 2026 (7 months)";

export interface MonthlyBudgetActual {
  month: string;
  actual: number;
  budget: number;
}

/** Revenue actual vs budget by month, FY2026. */
export const monthlyRevenue: MonthlyBudgetActual[] = [
  { month: "Jan", actual: 58200000, budget: 61000000 },
  { month: "Feb", actual: 63400000, budget: 61000000 },
  { month: "Mar", actual: 71900000, budget: 66000000 },
  { month: "Apr", actual: 59800000, budget: 64000000 },
  { month: "May", actual: 68300000, budget: 63000000 },
  { month: "Jun", actual: 66100000, budget: 64000000 },
  { month: "Jul", actual: 68700000, budget: 64000000 },
  { month: "Aug", actual: 0, budget: 64000000 },
  { month: "Sep", actual: 0, budget: 66000000 },
  { month: "Oct", actual: 0, budget: 68000000 },
  { month: "Nov", actual: 0, budget: 68000000 },
  { month: "Dec", actual: 0, budget: 70000000 },
];

export const monthlyExpenses: MonthlyBudgetActual[] = [
  { month: "Jan", actual: 41200000, budget: 40000000 },
  { month: "Feb", actual: 43800000, budget: 41000000 },
  { month: "Mar", actual: 46100000, budget: 44000000 },
  { month: "Apr", actual: 42400000, budget: 43000000 },
  { month: "May", actual: 45700000, budget: 44000000 },
  { month: "Jun", actual: 44900000, budget: 44000000 },
  { month: "Jul", actual: 48300000, budget: 45000000 },
  { month: "Aug", actual: 0, budget: 45000000 },
  { month: "Sep", actual: 0, budget: 45000000 },
  { month: "Oct", actual: 0, budget: 46000000 },
  { month: "Nov", actual: 0, budget: 46000000 },
  { month: "Dec", actual: 0, budget: 47000000 },
];

export interface VarianceLine {
  group: "Revenue" | "Expenses";
  line: string;
  actual: number;
  budget: number;
  /** true when actual above budget is good (revenue), false for cost lines */
  higherIsBetter: boolean;
}

export const budgetVsActualLines: VarianceLine[] = [
  { group: "Revenue", line: "Corporate & Commercial", actual: 218400000, budget: 205000000, higherIsBetter: true },
  { group: "Revenue", line: "Regulatory & Compliance", actual: 96700000, budget: 110000000, higherIsBetter: true },
  { group: "Revenue", line: "Transactions & Funds", actual: 141300000, budget: 128000000, higherIsBetter: true },
  { group: "Revenue", line: "Recovered disbursements", actual: 20000000, budget: 18000000, higherIsBetter: true },
  { group: "Expenses", line: "Fee earner salaries", actual: 186200000, budget: 180000000, higherIsBetter: false },
  { group: "Expenses", line: "Disbursements", actual: 18400000, budget: 16000000, higherIsBetter: false },
  { group: "Expenses", line: "Premises", actual: 50400000, budget: 50400000, higherIsBetter: false },
  { group: "Expenses", line: "Technology", actual: 22800000, budget: 21000000, higherIsBetter: false },
  { group: "Expenses", line: "Admin & other", actual: 34600000, budget: 32000000, higherIsBetter: false },
];

export const forecastAccuracyPct = 96.4;
export const forecastAccuracyTargetPct = 5;

/* ── 10. Write-downs & write-offs (single lifecycle) ────── */

export interface WriteOff {
  id: string;
  stage: "WIP write-down" | "Credit note" | "Bad debt write-off";
  reference: string;
  client: string;
  mandate: string;
  amount: number;
  reason: string;
  date: string;
  approvedBy: string;
  status: "Pending approval" | "Approved" | "Posted";
}

export const writeOffs: WriteOff[] = [
  { id: "WO-001", stage: "WIP write-down", reference: "WIP-005", client: "Sasa Foods Group", mandate: "Group Restructure", amount: 1800000, reason: "Time overrun not recoverable from client", date: "2026-05-04", approvedBy: "Partner — J. Karake", status: "Approved" },
  { id: "WO-002", stage: "WIP write-down", reference: "WIP-003", client: "Umoja Capital", mandate: "BNR Licence Renewal", amount: 855000, reason: "Scope creep absorbed as relationship investment", date: "2026-06-02", approvedBy: "Partner — A. Ndayisaba", status: "Pending approval" },
  { id: "WO-003", stage: "Credit note", reference: "CN-2026-003", client: "Umoja Capital", mandate: "BNR Licence Renewal", amount: 1200000, reason: "Duplicate line item billed", date: "2026-06-30", approvedBy: "Partner — J. Karake", status: "Posted" },
  { id: "WO-004", stage: "Credit note", reference: "CN-2026-004", client: "Sasa Foods Group", mandate: "Group Restructure", amount: 2500000, reason: "Goodwill write-down after fee review", date: "2026-07-18", approvedBy: "Partner — J. Karake", status: "Approved" },
  { id: "WO-005", stage: "Bad debt write-off", reference: "INV-2025-088", client: "Kivu Agro Ltd", mandate: "Supply contracts", amount: 4300000, reason: "Client in liquidation — 210 days overdue", date: "2026-04-15", approvedBy: "Partner — J. Karake", status: "Posted" },
  { id: "WO-006", stage: "Bad debt write-off", reference: "INV-2026-101", client: "Sasa Foods Group", mandate: "Group Restructure", amount: 5133334, reason: "Final instalment doubtful — provision 100%", date: "2026-07-28", approvedBy: "Partner — A. Ndayisaba", status: "Pending approval" },
];

/* ── 11. Find & recode (Accounting) ─────────────────────── */

export const recodeCandidates = [
  { id: "TX-9002", date: "2026-07-28", description: "MOMO PAYMENT 0788***221", amount: 450000, currentAccount: "9999 · Suspense", suggested: "4000 · Fee income — corporate" },
  { id: "JNL-2026-079", date: "2026-07-12", description: "Courier — client filing", amount: 68000, currentAccount: "6900 · Bad debt expense", suggested: "6300 · Disbursements" },
  { id: "BILL-2026-070", date: "2026-07-06", description: "Zoom subscription", amount: 145000, currentAccount: "6100 · Rent", suggested: "6250 · Communications" },
];
