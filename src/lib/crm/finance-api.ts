import { api } from "../api";

const unwrap = (res: any) => res.data?.data ?? res.data;

// ── WIP ───────────────────────────────────────────────────────

export type WipBillingStatus =
  | "Unbilled"
  | "Approved for billing"
  | "Written down"
  | "Written off"
  | "Held"
  | "Invoiced";

export interface WipEntry {
  _id: string;
  memberUserId: string;
  member: string;
  mandateId: string;
  mandateName: string;
  taskId: string | null;
  taskTitle: string;
  narrative: string;
  date: string;
  hours: number;
  rate: number;
  currency: string;
  billingStatus: WipBillingStatus;
  writtenDownAmount: number;
  billingReviewReason: string | null;
  invoiceId: string | null;
}

export const wipValue = (w: WipEntry) =>
  w.billingStatus === "Written down"
    ? w.writtenDownAmount
    : w.billingStatus === "Written off"
      ? 0
      : w.hours * w.rate;

export const wipAgeDays = (w: WipEntry) =>
  Math.floor((Date.now() - new Date(w.date).getTime()) / 86400000);

export const wipBand = (ageDays: number) =>
  ageDays <= 30
    ? "0–30"
    : ageDays <= 60
      ? "31–60"
      : ageDays <= 90
        ? "61–90"
        : "90+";

export const fetchWipRegister = async (
  mandateId?: string,
): Promise<WipEntry[]> => {
  const res = await api.get("/finance/wip", {
    params: mandateId ? { mandateId } : undefined,
  });
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const approveWipForBilling = async (id: string): Promise<WipEntry> =>
  unwrap(await api.post(`/finance/wip/${id}/approve-for-billing`));

export const writeDownWip = async (
  id: string,
  writtenDownAmount: number,
  reason: string,
  approvedBy: string,
): Promise<WipEntry> =>
  unwrap(
    await api.post(`/finance/wip/${id}/write-down`, {
      writtenDownAmount,
      reason,
      approvedBy,
    }),
  );

export const writeOffWip = async (
  id: string,
  reason: string,
  approvedBy: string,
): Promise<WipEntry> =>
  unwrap(
    await api.post(`/finance/wip/${id}/write-off`, { reason, approvedBy }),
  );

export const holdWip = async (id: string, reason?: string): Promise<WipEntry> =>
  unwrap(await api.post(`/finance/wip/${id}/hold`, { reason }));

// ── Invoices ──────────────────────────────────────────────────

export type InvoiceStage =
  | "Draft"
  | "In Review"
  | "Approved"
  | "Sent"
  | "Part Paid"
  | "Paid"
  | "Overdue"
  | "Written Off";
export type BillingModel =
  | "Time & materials"
  | "Fixed fee"
  | "Retainer"
  | "Milestone";

export const INVOICE_STAGES: InvoiceStage[] = [
  "Draft",
  "In Review",
  "Approved",
  "Sent",
  "Part Paid",
  "Paid",
  "Overdue",
  "Written Off",
];
export const BILLING_MODELS: BillingModel[] = [
  "Time & materials",
  "Fixed fee",
  "Retainer",
  "Milestone",
];

export interface InvoiceLine {
  _id: string;
  description: string;
  qty: number;
  unit: number;
  timeEntryId: string | null;
}
export interface DunningEvent {
  _id: string;
  action: string;
  by: string;
  at: string;
  note: string | null;
}
export interface Invoice {
  _id: string;
  ref: string;
  clientUserId: string;
  clientName: string;
  mandateId: string;
  mandateName: string;
  currency: string;
  vatRate: number;
  whtRate: number;
  discount: number;
  stage: InvoiceStage;
  issuedOn: string;
  dueOn: string;
  paidAmount: number;
  openedByClient: boolean;
  model: BillingModel;
  proforma: boolean;
  lines: InvoiceLine[];
  dunningPaused: boolean;
  dunningLog: DunningEvent[];
  writeOffReason: string | null;
  // A claim, not a fact — the client saying they paid or flagging
  // an issue. Never implies the invoice is actually settled; only
  // a real recorded payment (which clears this automatically) does.
  clientAction: "Paid" | "Cancelled" | null;
  clientActionAt: string | null;
  clientActionNote: string | null;
  subtotal: number;
  net: number;
  vat: number;
  wht: number;
  gross: number;
  payable: number;
  createdAt: string;
  updatedAt: string;
}

export const ageBucket = (dueOn: string) => {
  const days = Math.floor((Date.now() - new Date(dueOn).getTime()) / 86400000);
  if (days <= 0) return "Current";
  if (days <= 30) return "1–30 days";
  if (days <= 60) return "31–60 days";
  if (days <= 90) return "61–90 days";
  return "90+ days";
};
export const daysOverdue = (dueOn: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(dueOn).getTime()) / 86400000));

export const fetchInvoices = async (filters?: {
  mandateId?: string;
  clientUserId?: string;
  stage?: InvoiceStage;
}): Promise<Invoice[]> => {
  const res = await api.get("/finance/invoices", { params: filters });
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const fetchInvoice = async (id: string): Promise<Invoice> =>
  unwrap(await api.get(`/finance/invoices/${id}`));

export interface CreateInvoicePayload {
  mandateId: string;
  model: BillingModel;
  currency?: string;
  vatRate?: number;
  whtRate?: number;
  discount?: number;
  dueOn: string;
  proforma?: boolean;
  lines: { description: string; qty: number; unit: number }[];
}
export const createInvoice = async (
  dto: CreateInvoicePayload,
): Promise<Invoice> => unwrap(await api.post("/finance/invoices", dto));

export interface CreateInvoiceFromWipPayload {
  mandateId: string;
  timeEntryIds?: string[];
  expenseClaimIds?: string[];
  currency?: string;
  vatRate?: number;
  whtRate?: number;
  dueOn: string;
}
export const createInvoiceFromWip = async (
  dto: CreateInvoiceFromWipPayload,
): Promise<Invoice> =>
  unwrap(await api.post("/finance/invoices/from-wip", dto));

export const submitInvoice = async (id: string): Promise<Invoice> =>
  unwrap(await api.post(`/finance/invoices/${id}/submit`));
export const approveInvoice = async (id: string): Promise<Invoice> =>
  unwrap(await api.post(`/finance/invoices/${id}/approve`));
export const sendInvoice = async (id: string): Promise<Invoice> =>
  unwrap(await api.post(`/finance/invoices/${id}/send`));
export const writeOffInvoice = async (
  id: string,
  reason: string,
  approvedBy: string,
): Promise<Invoice> =>
  unwrap(
    await api.post(`/finance/invoices/${id}/write-off`, { reason, approvedBy }),
  );
export const addDunningEvent = async (
  id: string,
  action: string,
  by: string,
  note?: string,
): Promise<Invoice> =>
  unwrap(
    await api.post(`/finance/invoices/${id}/dunning-events`, {
      action,
      by,
      note,
    }),
  );
export const setDunningPaused = async (
  id: string,
  paused: boolean,
): Promise<Invoice> =>
  unwrap(await api.post(`/finance/invoices/${id}/dunning-pause`, { paused }));

// ── Payments ──────────────────────────────────────────────────

export type PaymentMethod =
  | "Bank transfer"
  | "Mobile money"
  | "Cheque"
  | "Cash"
  | "Bank feed";
export const PAYMENT_METHODS: PaymentMethod[] = [
  "Bank transfer",
  "Mobile money",
  "Cheque",
  "Cash",
  "Bank feed",
];

export interface Payment {
  _id: string;
  ref: string;
  invoiceId: string;
  clientName: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  matched: "Auto-matched" | "Manual";
  at: string;
}

export const fetchPayments = async (invoiceId?: string): Promise<Payment[]> => {
  const res = await api.get("/finance/payments", {
    params: invoiceId ? { invoiceId } : undefined,
  });
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const recordPayment = async (
  invoiceId: string,
  method: PaymentMethod,
  amount?: number,
): Promise<Payment> =>
  unwrap(
    await api.post(`/finance/invoices/${invoiceId}/payments`, {
      method,
      amount,
    }),
  );

// Clears a client's "I've paid"/"there's an issue" claim without
// recording a payment — the claim was premature, mistaken, or
// already resolved another way.
export const dismissClientAction = async (
  invoiceId: string,
): Promise<Invoice> =>
  unwrap(
    await api.post(`/finance/invoices/${invoiceId}/dismiss-client-action`),
  );

// ── Credit notes ──────────────────────────────────────────────

export type EbmStatus = "Synced" | "Pending" | "Error";
export interface CreditNote {
  _id: string;
  ref: string;
  invoiceId: string;
  invoiceRef: string;
  clientName: string;
  amount: number;
  reason: string;
  approvedBy: string;
  ebm: EbmStatus;
  createdAt: string;
}
export const fetchCreditNotes = async (): Promise<CreditNote[]> => {
  const res = await api.get("/finance/credit-notes");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const createCreditNote = async (dto: {
  invoiceId: string;
  amount: number;
  reason: string;
  approvedBy: string;
}): Promise<CreditNote> => unwrap(await api.post("/finance/credit-notes", dto));

// ── Write-offs (the unified lifecycle audit trail) ───────────

export type WriteOffStage =
  | "WIP write-down"
  | "Credit note"
  | "Bad debt write-off";
export type WriteOffStatus = "Pending approval" | "Approved" | "Posted";
export interface WriteOff {
  _id: string;
  ref: string;
  stage: WriteOffStage;
  reference: string;
  clientName: string;
  mandateName: string;
  amount: number;
  reason: string;
  approvedBy: string;
  status: WriteOffStatus;
  createdAt: string;
}
export const fetchWriteOffs = async (
  stage?: WriteOffStage,
): Promise<WriteOff[]> => {
  const res = await api.get("/finance/write-offs", {
    params: stage ? { stage } : undefined,
  });
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

// ── Quotes & proformas ────────────────────────────────────────

export type QuoteStatus =
  | "Draft"
  | "Sent"
  | "Accepted"
  | "Declined"
  | "Expired";
export type QuoteKind = "Quote" | "Proforma";
export interface Quote {
  _id: string;
  ref: string;
  clientUserId: string | null;
  clientName: string;
  mandateId: string | null;
  title: string;
  amount: number;
  currency: string;
  issued: string;
  expires: string;
  status: QuoteStatus;
  kind: QuoteKind;
  convertedInvoiceId: string | null;
}
export const fetchQuotes = async (): Promise<Quote[]> => {
  const res = await api.get("/finance/quotes");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const createQuote = async (dto: {
  clientUserId?: string;
  clientName: string;
  mandateId?: string;
  title: string;
  amount: number;
  currency?: string;
  expires: string;
  kind: QuoteKind;
}): Promise<Quote> => unwrap(await api.post("/finance/quotes", dto));
export const setQuoteStatus = async (
  id: string,
  status: QuoteStatus,
): Promise<Quote> =>
  unwrap(await api.patch(`/finance/quotes/${id}/status`, { status }));
export const convertQuoteToInvoice = async (
  id: string,
  dueOn: string,
): Promise<{ quote: Quote; invoice: Invoice }> =>
  unwrap(await api.post(`/finance/quotes/${id}/convert`, { dueOn }));
export const setQuoteMandate = async (
  id: string,
  mandateId: string,
): Promise<Quote> =>
  unwrap(await api.patch(`/finance/quotes/${id}/mandate`, { mandateId }));
export const downloadQuotePdf = async (
  id: string,
  ref: string,
): Promise<void> => {
  const res = await api.get(`/finance/quotes/${id}/pdf`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(
    new Blob([res.data], { type: "application/pdf" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${ref}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ── Recurring invoices ───────────────────────────────────────

export type RecurringFrequency = "Monthly" | "Quarterly" | "Annually";
export type RecurringStatus = "Active" | "Paused";
export interface RecurringInvoice {
  _id: string;
  clientUserId: string;
  clientName: string;
  mandateId: string;
  mandateName: string;
  description: string;
  amount: number;
  currency: string;
  frequency: RecurringFrequency;
  nextRun: string;
  status: RecurringStatus;
}
export const fetchRecurringInvoices = async (): Promise<RecurringInvoice[]> => {
  const res = await api.get("/finance/recurring-invoices");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const createRecurringInvoice = async (dto: {
  clientUserId: string;
  clientName: string;
  mandateId: string;
  mandateName: string;
  description: string;
  amount: number;
  currency?: string;
  frequency: RecurringFrequency;
  nextRun: string;
}): Promise<RecurringInvoice> =>
  unwrap(await api.post("/finance/recurring-invoices", dto));
export const setRecurringStatus = async (
  id: string,
  status: RecurringStatus,
): Promise<RecurringInvoice> =>
  unwrap(
    await api.patch(`/finance/recurring-invoices/${id}/status`, { status }),
  );
export const generateRecurringNow = async (
  id: string,
): Promise<{ recurring: RecurringInvoice; invoice: Invoice }> =>
  unwrap(await api.post(`/finance/recurring-invoices/${id}/generate`));

// ── Payment plans ─────────────────────────────────────────────

export type InstalmentStatus = "Scheduled" | "Paid" | "Overdue";
export interface Instalment {
  _id: string;
  due: string;
  amount: number;
  status: InstalmentStatus;
}
export interface PaymentPlan {
  _id: string;
  invoiceId: string;
  invoiceRef: string;
  clientName: string;
  instalments: Instalment[];
}
export const fetchPaymentPlans = async (): Promise<PaymentPlan[]> => {
  const res = await api.get("/finance/payment-plans");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const createPaymentPlan = async (dto: {
  invoiceId: string;
  instalments: { due: string; amount: number }[];
}): Promise<PaymentPlan> =>
  unwrap(await api.post("/finance/payment-plans", dto));
export const markInstalmentPaid = async (
  planId: string,
  instalmentId: string,
): Promise<PaymentPlan> =>
  unwrap(
    await api.post(
      `/finance/payment-plans/${planId}/instalments/${instalmentId}/paid`,
    ),
  );

// ── Purchases: vendors ────────────────────────────────────────

export interface Vendor {
  _id: string;
  name: string;
  tin: string;
  category: string;
  terms: string;
  currency: string;
  email: string;
  wht: boolean;
  outstanding: number;
  band: "Current" | "31–60" | "61–90" | "90+";
}
export const fetchVendors = async (): Promise<Vendor[]> => {
  const res = await api.get("/finance/vendors");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const createVendor = async (dto: {
  name: string;
  tin?: string;
  category?: string;
  terms?: string;
  currency?: string;
  email?: string;
  wht?: boolean;
}): Promise<Vendor> => unwrap(await api.post("/finance/vendors", dto));

// ── Purchases: purchase orders ────────────────────────────────

export type PoStatus = "Draft" | "Issued" | "Fulfilled" | "Cancelled";
export interface PoLine {
  description: string;
  qty: number;
  unit: number;
  discountPct?: number;
  taxLabel?: string;
  _id?: string;
}
export interface PurchaseOrder {
  _id: string;
  ref: string;
  vendorId: string;
  vendorName: string;
  vendorTin: string;
  currency: string;
  status: PoStatus;
  issuedOn: string | null;
  expectedDelivery: string | null;
  notes: string;
  deliveryAddress: string;
  deliveryAttention: string;
  deliveryPhone: string;
  deliveryInstructions: string;
  lines: PoLine[];
  total: number;
  createdAt: string;
}
export const fetchPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
  const res = await api.get("/finance/purchase-orders");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const createPurchaseOrder = async (dto: {
  vendorId: string;
  currency?: string;
  expectedDelivery?: string;
  notes?: string;
  deliveryAddress?: string;
  deliveryAttention?: string;
  deliveryPhone?: string;
  deliveryInstructions?: string;
  lines: PoLine[];
}): Promise<PurchaseOrder> =>
  unwrap(await api.post("/finance/purchase-orders", dto));
export const issuePurchaseOrder = async (id: string): Promise<PurchaseOrder> =>
  unwrap(await api.post(`/finance/purchase-orders/${id}/issue`));
export const fulfillPurchaseOrder = async (
  id: string,
): Promise<PurchaseOrder> =>
  unwrap(await api.post(`/finance/purchase-orders/${id}/fulfill`));
export const cancelPurchaseOrder = async (id: string): Promise<PurchaseOrder> =>
  unwrap(await api.post(`/finance/purchase-orders/${id}/cancel`));
export const downloadPurchaseOrderPdf = async (
  id: string,
  ref: string,
): Promise<void> => {
  const res = await api.get(`/finance/purchase-orders/${id}/pdf`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(
    new Blob([res.data], { type: "application/pdf" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${ref}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ── Purchases: bills ──────────────────────────────────────────

export type BillStatus =
  | "Awaiting approval"
  | "Approved"
  | "Scheduled"
  | "Paid"
  | "Rejected";
export interface Bill {
  _id: string;
  ref: string;
  vendorId: string | null;
  vendorName: string;
  poId: string | null;
  description: string;
  category: string;
  dueOn: string;
  amount: number;
  currency: string;
  status: BillStatus;
  recurring: boolean;
  approvedBy: string | null;
  paidAt: string | null;
}
export const fetchBills = async (): Promise<Bill[]> => {
  const res = await api.get("/finance/bills");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const createBill = async (dto: {
  vendorId?: string;
  vendorName?: string;
  poId?: string;
  description: string;
  category?: string;
  dueOn: string;
  amount: number;
  currency?: string;
  recurring?: boolean;
}): Promise<Bill> => unwrap(await api.post("/finance/bills", dto));
export const approveBill = async (
  id: string,
  approvedBy: string,
): Promise<Bill> =>
  unwrap(await api.post(`/finance/bills/${id}/approve`, { approvedBy }));
export const rejectBill = async (id: string): Promise<Bill> =>
  unwrap(await api.post(`/finance/bills/${id}/reject`));
export const scheduleBillPayment = async (id: string): Promise<Bill> =>
  unwrap(await api.post(`/finance/bills/${id}/schedule-payment`));
export const markBillPaid = async (id: string): Promise<Bill> =>
  unwrap(await api.post(`/finance/bills/${id}/mark-paid`));

// ── Purchases: expense claims ────────────────────────────────

export type ClaimStatus = "Submitted" | "Approved" | "Rejected" | "Paid";
export interface ExpenseClaim {
  _id: string;
  ref: string;
  employeeUserId: string;
  employee: string;
  description: string;
  mandateId: string | null;
  mandateName: string | null;
  amount: number;
  currency: string;
  rechargeable: boolean;
  status: ClaimStatus;
  invoiceId: string | null;
  receiptUrl: string | null;
  receiptName: string | null;
  createdAt: string;
}
export const fetchExpenseClaims = async (): Promise<ExpenseClaim[]> => {
  const res = await api.get("/finance/expense-claims");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const createExpenseClaim = async (dto: {
  employeeUserId: string;
  employee: string;
  description: string;
  mandateId?: string;
  mandateName?: string;
  amount: number;
  currency?: string;
  rechargeable?: boolean;
}): Promise<ExpenseClaim> =>
  unwrap(await api.post("/finance/expense-claims", dto));
export const attachExpenseReceipt = async (
  id: string,
  file: File,
): Promise<ExpenseClaim> => {
  const form = new FormData();
  form.append("file", file);
  return unwrap(
    await api.post(`/finance/expense-claims/${id}/receipt`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  );
};
export const approveExpenseClaim = async (id: string): Promise<ExpenseClaim> =>
  unwrap(await api.post(`/finance/expense-claims/${id}/approve`));
export const rejectExpenseClaim = async (id: string): Promise<ExpenseClaim> =>
  unwrap(await api.post(`/finance/expense-claims/${id}/reject`));
export const markExpenseClaimPaid = async (id: string): Promise<ExpenseClaim> =>
  unwrap(await api.post(`/finance/expense-claims/${id}/mark-paid`));

// ── Purchases: expense policies ──────────────────────────────

export interface ExpensePolicy {
  _id: string;
  rule: string;
  value: string;
}
export const fetchExpensePolicies = async (): Promise<ExpensePolicy[]> => {
  const res = await api.get("/finance/expense-policies");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const upsertExpensePolicy = async (
  rule: string,
  value: string,
): Promise<ExpensePolicy> =>
  unwrap(await api.patch("/finance/expense-policies", { rule, value }));

// ── Banking ───────────────────────────────────────────────────

export type BankAccountType = "Office" | "Trust" | "Special purpose" | "Fund";
export interface BankAccount {
  _id: string;
  name: string;
  bank: string;
  last4: string;
  currency: string;
  openingBalance: number;
  type: BankAccountType;
  lastSyncedAt: string | null;
  balance: number;
}
export const fetchBankAccounts = async (): Promise<BankAccount[]> => {
  const res = await api.get("/finance/bank-accounts");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const createBankAccount = async (dto: {
  name: string;
  bank: string;
  last4: string;
  currency?: string;
  openingBalance?: number;
  type: BankAccountType;
}): Promise<BankAccount> =>
  unwrap(await api.post("/finance/bank-accounts", dto));

export type TxStatus = "Matched" | "Unmatched";
export type TxLinkType = "Invoice" | "Bill" | "Payroll" | "Manual";
export interface BankTransaction {
  _id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  status: TxStatus;
  linkType: TxLinkType | null;
  linkId: string | null;
  linkLabel: string;
  suggestedAccount: string;
}
export const fetchBankTransactions = async (
  accountId?: string,
): Promise<BankTransaction[]> => {
  const res = await api.get("/finance/bank-transactions", {
    params: accountId ? { accountId } : undefined,
  });
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const createBankTransaction = async (dto: {
  accountId: string;
  date: string;
  description: string;
  amount: number;
}): Promise<BankTransaction> =>
  unwrap(await api.post("/finance/bank-transactions", dto));
export const matchBankTransaction = async (
  id: string,
  linkType: TxLinkType,
  linkId: string,
  linkLabel: string,
): Promise<BankTransaction> =>
  unwrap(
    await api.post(`/finance/bank-transactions/${id}/match`, {
      linkType,
      linkId,
      linkLabel,
    }),
  );

export interface BankRule {
  _id: string;
  matchText: string;
  account: string;
  auto: boolean;
}
export const fetchBankRules = async (): Promise<BankRule[]> => {
  const res = await api.get("/finance/bank-rules");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const createBankRule = async (dto: {
  matchText: string;
  account: string;
  auto?: boolean;
}): Promise<BankRule> => unwrap(await api.post("/finance/bank-rules", dto));

export interface Transfer {
  _id: string;
  ref: string;
  date: string;
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amount: number;
  reference: string;
  authoriser: string;
}
export const fetchTransfers = async (): Promise<Transfer[]> => {
  const res = await api.get("/finance/transfers");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const createTransfer = async (dto: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  reference?: string;
  authoriser: string;
}): Promise<Transfer> => unwrap(await api.post("/finance/transfers", dto));

export interface ReconciliationView {
  accountId: string;
  period: string;
  systemBalance: number;
  statementBalance: number;
  unreconciled: number;
  variance: number;
  preparedBy: string | null;
  signedOffBy: string | null;
  signedOffAt: string | null;
}
export const fetchReconciliation = async (
  accountId: string,
  period: string,
): Promise<ReconciliationView> =>
  unwrap(await api.get(`/finance/reconciliation/${accountId}/${period}`));
export const setStatementBalance = async (
  accountId: string,
  period: string,
  statementBalance: number,
  preparedBy: string,
): Promise<ReconciliationView> =>
  unwrap(
    await api.post(
      `/finance/reconciliation/${accountId}/${period}/statement-balance`,
      { statementBalance, preparedBy },
    ),
  );
export const signOffReconciliation = async (
  accountId: string,
  period: string,
  signedOffBy: string,
): Promise<ReconciliationView> =>
  unwrap(
    await api.post(`/finance/reconciliation/${accountId}/${period}/sign-off`, {
      signedOffBy,
    }),
  );

export interface CashForecastPoint {
  horizon: string;
  inflow: number;
  outflow: number;
  closing: number;
}
export const fetchCashForecast = async (): Promise<CashForecastPoint[]> => {
  const res = await api.get("/finance/cash-forecast");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

// ── Tax ───────────────────────────────────────────────────────

export type TaxObligationType =
  | "VAT return"
  | "PAYE remittance"
  | "RSSB contributions"
  | "WHT remittance"
  | "CIT provisional";
export type TaxObligationStatus = "Draft" | "Filed";
export interface TaxObligation {
  _id: string;
  type: TaxObligationType;
  period: string;
  dueOn: string;
  amount: number;
  status: TaxObligationStatus;
  filedAt: string | null;
}
export const fetchTaxObligations = async (): Promise<TaxObligation[]> => {
  const res = await api.get("/finance/tax-obligations");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const createTaxObligation = async (dto: {
  type: TaxObligationType;
  period: string;
  dueOn: string;
  amount: number;
}): Promise<TaxObligation> =>
  unwrap(await api.post("/finance/tax-obligations", dto));
export const fileTaxObligation = async (id: string): Promise<TaxObligation> =>
  unwrap(await api.post(`/finance/tax-obligations/${id}/file`));

export interface VatLine {
  category: string;
  type: "Output" | "Input";
  base: number;
  vat: number;
}
export interface VatReturn {
  period: string;
  outputVat: number;
  inputVat: number;
  netPayable: number;
  lines: VatLine[];
}
export const fetchVatReturn = async (period?: string): Promise<VatReturn> =>
  unwrap(
    await api.get("/finance/vat", { params: period ? { period } : undefined }),
  );

export interface PayrollTaxLine {
  period: string;
  gross: number;
  paye: number;
  rssb: number;
  status: string;
}
export const fetchPayrollTax = async (): Promise<PayrollTaxLine[]> => {
  const res = await api.get("/finance/payroll-tax");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export interface CitProvision {
  revenue: number;
  expenses: number;
  profitBeforeTax: number;
  citRate: number;
  citAtRate: number;
  note: string;
}
export const fetchCitProvision = async (): Promise<CitProvision> =>
  unwrap(await api.get("/finance/cit"));

export type WhtDirection = "Vendor payment" | "Client receipt";
export interface WhtCertificate {
  _id: string;
  certificateRef: string;
  direction: WhtDirection;
  counterparty: string;
  sourceRef: string;
  gross: number;
  rate: number;
  wht: number;
  net: number;
  date: string;
}
export const fetchWhtRegister = async (): Promise<WhtCertificate[]> => {
  const res = await api.get("/finance/wht");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export interface EbmDocument {
  _id: string;
  document: string;
  receipt: string;
  classification: string;
  status: "Synced" | "Pending" | "Error";
}
export const fetchEbmStatus = async (): Promise<EbmDocument[]> => {
  const res = await api.get("/finance/ebm");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const resyncEbm = async (invoiceId: string): Promise<any> =>
  unwrap(await api.post(`/finance/ebm/${invoiceId}/resync`));

// ── Accounting: overview ─────────────────────────────────────

export interface AccountingOverview {
  salesRevenueYtd: number;
  outstandingReceivables: number;
  purchasesExpensesYtd: number;
}
export const fetchAccountingOverview = async (): Promise<AccountingOverview> =>
  unwrap(await api.get("/finance/accounting-overview"));

// ── Accounting: chart of accounts ────────────────────────────

export type AccountType =
  | "Asset"
  | "Liability"
  | "Equity"
  | "Revenue"
  | "Expense";
export interface LedgerAccount {
  _id: string;
  code: string;
  name: string;
  type: AccountType;
  subGroup: string;
  active: boolean;
  balance: number;
}
export const fetchLedgerAccounts = async (): Promise<LedgerAccount[]> => {
  const res = await api.get("/finance/accounts");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const createLedgerAccount = async (dto: {
  code: string;
  name: string;
  type: AccountType;
  subGroup?: string;
}): Promise<LedgerAccount> => unwrap(await api.post("/finance/accounts", dto));
export const seedDefaultAccounts = async (): Promise<LedgerAccount[]> =>
  unwrap(await api.post("/finance/accounts/seed-defaults"));

// ── Accounting: journals (real multi-line double-entry) ──────

export type JournalType =
  | "Accrual"
  | "Depreciation"
  | "Prepayment"
  | "Tax"
  | "Correction";
export type JournalStatus = "Unposted" | "Posted" | "Reversed";
export interface JournalLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}
export interface Journal {
  _id: string;
  ref: string;
  title: string;
  date: string;
  type: JournalType;
  narration: string;
  lines: JournalLine[];
  status: JournalStatus;
  isAutoGenerated: boolean;
  preparedBy: string;
  postedBy: string | null;
  postedAt: string | null;
  reversedAt: string | null;
  createdAt: string;
}
export const fetchJournals = async (): Promise<Journal[]> => {
  const res = await api.get("/finance/journals");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const createJournal = async (dto: {
  title: string;
  date: string;
  type: JournalType;
  narration: string;
  preparedBy: string;
  lines: {
    accountCode: string;
    accountName: string;
    debit?: number;
    credit?: number;
  }[];
}): Promise<Journal> => unwrap(await api.post("/finance/journals", dto));
export const postJournal = async (
  id: string,
  postedBy: string,
): Promise<Journal> =>
  unwrap(await api.post(`/finance/journals/${id}/post`, { postedBy }));
export const rejectJournal = async (id: string): Promise<Journal> =>
  unwrap(await api.post(`/finance/journals/${id}/reject`));

// ── Accounting: general ledger ───────────────────────────────

export type GlSource =
  | "Sales"
  | "Purchases"
  | "Banking"
  | "Tax"
  | "Manual"
  | "Trust"
  | "Fund";
export interface GlEntry {
  _id: string;
  date: string;
  ref: string;
  description: string;
  accountCode: string;
  accountName: string;
  source: GlSource;
  debit: number;
  credit: number;
  sourceId: string | null;
  balance: number;
}
export const fetchGeneralLedger = async (filters?: {
  source?: GlSource;
  from?: string;
  to?: string;
  search?: string;
}): Promise<GlEntry[]> => {
  const res = await api.get("/finance/general-ledger", { params: filters });
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

const csvEscape = (val: string | number) => {
  const s = String(val ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const exportGeneralLedgerToCsv = (
  entries: GlEntry[],
  filename = "general-ledger.csv",
) => {
  const headers = [
    "Date",
    "Ref",
    "Description",
    "Account Code",
    "Account Name",
    "Source",
    "Debit",
    "Credit",
    "Balance",
  ];
  const rows = entries.map((e) => [
    e.date?.slice(0, 10),
    e.ref,
    e.description,
    e.accountCode,
    e.accountName,
    e.source,
    e.debit || "",
    e.credit || "",
    e.balance,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ── Accounting: trial balance ────────────────────────────────

export interface TrialBalanceRow {
  code: string;
  name: string;
  type: AccountType;
  debit: number;
  credit: number;
}
export interface TrialBalance {
  asOf: string;
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}
export const fetchTrialBalance = async (asOf?: string): Promise<TrialBalance> =>
  unwrap(
    await api.get("/finance/trial-balance", {
      params: asOf ? { asOf } : undefined,
    }),
  );

// ── Accounting: period-end close ─────────────────────────────

export interface PeriodCloseStep {
  key: string;
  completedBy: string | null;
  completedAt: string | null;
}
export interface AccountingPeriod {
  _id: string;
  period: string;
  steps: PeriodCloseStep[];
  locked: boolean;
  lockedBy: string | null;
  lockedAt: string | null;
  overrideLog: string[];
}
export const PERIOD_CLOSE_STEP_LABELS: Record<string, string> = {
  bank_reconciliation: "Bank reconciliation",
  trust_reconciliation: "Trust account reconciliation",
  receivables_review: "Receivables review",
  payables_review: "Payables review",
  accruals_prepayments: "Post accruals and prepayments",
  depreciation: "Post depreciation",
  vat_reconciliation: "VAT reconciliation",
  cit_provision: "CIT provision update",
  trial_balance_review: "Trial balance review",
  lock: "Lock period",
};
export const fetchPeriodClose = async (
  period: string,
): Promise<AccountingPeriod> =>
  unwrap(await api.get(`/finance/period-close/${period}`));
export const completePeriodStep = async (
  period: string,
  key: string,
  completedBy: string,
): Promise<AccountingPeriod> =>
  unwrap(
    await api.post(`/finance/period-close/${period}/steps/${key}`, {
      completedBy,
    }),
  );
export const lockPeriod = async (
  period: string,
  lockedBy: string,
): Promise<AccountingPeriod> =>
  unwrap(await api.post(`/finance/period-close/${period}/lock`, { lockedBy }));
export const overridePeriodLock = async (
  period: string,
  by: string,
  reason: string,
): Promise<AccountingPeriod> =>
  unwrap(
    await api.post(`/finance/period-close/${period}/override`, { by, reason }),
  );

// ── Accounting: find & recode ────────────────────────────────

export const fetchRecodeCandidates = async (): Promise<BankTransaction[]> => {
  const res = await api.get("/finance/recode");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const recodeTransaction = async (
  transactionId: string,
  ledgerAccount: string,
): Promise<BankTransaction> =>
  unwrap(await api.post(`/finance/recode/${transactionId}`, { ledgerAccount }));

// ── Asset register ────────────────────────────────────────────

export type AssetKind = "Fixed" | "Movable";
export type AssetStatus = "In use" | "In store" | "Disposed";
export interface AssetRecord {
  _id: string;
  tag: string;
  name: string;
  category: string;
  kind: AssetKind;
  cost: number;
  acquiredOn: string;
  usefulLifeYears: number;
  assignedTo: string | null;
  condition: string | null;
  status: AssetStatus;
  insurer: string | null;
  renewalDate: string | null;
  disposedOn: string | null;
  disposalValue: number | null;
  disposalGainLoss: number | null;
  lastDepreciationPeriod: string | null;
  nbv: number;
  annualDepreciation: number;
  monthlyDepreciation: number;
}
export const fetchAssets = async (): Promise<AssetRecord[]> => {
  const res = await api.get("/finance/assets");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const createAsset = async (dto: {
  name: string;
  category: string;
  kind: AssetKind;
  cost: number;
  acquiredOn: string;
  usefulLifeYears: number;
  assignedTo?: string;
  condition?: string;
  insurer?: string;
  renewalDate?: string;
}): Promise<AssetRecord> => unwrap(await api.post("/finance/assets", dto));
export const disposeAsset = async (
  id: string,
  disposalValue: number,
): Promise<AssetRecord> =>
  unwrap(await api.post(`/finance/assets/${id}/dispose`, { disposalValue }));
export const generateDepreciationJournal = async (
  period: string,
  preparedBy: string,
): Promise<Journal> =>
  unwrap(
    await api.post(`/finance/assets/generate-depreciation/${period}`, {
      preparedBy,
    }),
  );

export interface MaintenanceLogEntry {
  _id: string;
  assetId: string;
  assetTag: string;
  date: string;
  description: string;
  vendor: string;
  cost: number;
}
export const fetchMaintenanceLog = async (): Promise<MaintenanceLogEntry[]> => {
  const res = await api.get("/finance/asset-maintenance");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const createMaintenanceLog = async (dto: {
  assetId: string;
  date: string;
  description: string;
  vendor?: string;
  cost: number;
}): Promise<MaintenanceLogEntry> =>
  unwrap(await api.post("/finance/asset-maintenance", dto));

// ── Financials: P&L, Balance Sheet, Cash Flow ────────────────

export interface PlRow {
  code: string;
  name: string;
  subGroup: string;
  amount: number;
}
export interface ProfitAndLoss {
  from: string;
  to: string;
  revenueRows: PlRow[];
  expenseRows: PlRow[];
  totalRevenue: number;
  totalExpenses: number;
  profitBeforeTax: number;
}
export const fetchProfitAndLoss = async (
  from: string,
  to: string,
): Promise<ProfitAndLoss> =>
  unwrap(await api.get("/finance/financials/pl", { params: { from, to } }));

export interface BalanceSheetRow {
  code: string;
  name: string;
  subGroup: string;
  amount: number;
}
export interface BalanceSheet {
  asOf: string;
  assets: BalanceSheetRow[];
  liabilities: BalanceSheetRow[];
  equity: BalanceSheetRow[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  balanced: boolean;
}
export const fetchBalanceSheet = async (asOf: string): Promise<BalanceSheet> =>
  unwrap(
    await api.get("/finance/financials/balance-sheet", { params: { asOf } }),
  );

export interface CashFlowLine {
  source: GlSource;
  inflow: number;
  outflow: number;
  netMovement: number;
}
export interface CashFlowStatement {
  from: string;
  to: string;
  lines: CashFlowLine[];
  netMovement: number;
}
export const fetchCashFlow = async (
  from: string,
  to: string,
): Promise<CashFlowStatement> =>
  unwrap(
    await api.get("/finance/financials/cash-flow", { params: { from, to } }),
  );

// ── Financials: Service line P&L ─────────────────────────────

export interface ServiceLineRow {
  serviceLine: string;
  revenue: number;
  directExpenses: number;
  contribution: number;
  contributionMargin: number;
}
export interface ServiceLineReport {
  from: string;
  to: string;
  rows: ServiceLineRow[];
  note: string;
}
export const fetchServiceLineReport = async (
  from: string,
  to: string,
): Promise<ServiceLineReport> =>
  unwrap(
    await api.get("/finance/financials/service-line", { params: { from, to } }),
  );

// ── Financials: Client profitability ─────────────────────────

export interface ClientProfitabilityRow {
  clientName: string;
  revenue: number;
  directExpenses: number;
  contribution: number;
  contributionMargin: number;
}
export interface ClientProfitabilityReport {
  from: string;
  to: string;
  rows: ClientProfitabilityRow[];
  note: string;
}
export const fetchClientProfitability = async (
  from: string,
  to: string,
): Promise<ClientProfitabilityReport> =>
  unwrap(
    await api.get("/finance/financials/client-profitability", {
      params: { from, to },
    }),
  );

// ── Financials: KPI dashboard ────────────────────────────────

export interface KpiDashboard {
  from: string;
  to: string;
  totalRevenue: number;
  grossMargin: number;
  netMargin: number;
  activeEmployees: number;
  revenuePerEmployee: number;
  lockupDays: number;
  wipDays: number;
  arDays: number;
  realizationRate: number;
  collectionRate: number;
  grossMarginNote: string;
}
export const fetchKpiDashboard = async (
  from: string,
  to: string,
): Promise<KpiDashboard> =>
  unwrap(await api.get("/finance/financials/kpis", { params: { from, to } }));

// ── Remittance accounts ──────────────────────────────────────

export interface RemittanceAccount {
  _id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  currency: string;
  branchCode: string;
  swiftCode: string;
  active: boolean;
  createdAt: string;
}
export const fetchRemittanceAccounts = async (): Promise<
  RemittanceAccount[]
> => {
  const res = await api.get("/finance/remittance-accounts");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const createRemittanceAccount = async (dto: {
  accountName: string;
  bankName: string;
  accountNumber: string;
  currency: string;
  branchCode?: string;
  swiftCode?: string;
}): Promise<RemittanceAccount> =>
  unwrap(await api.post("/finance/remittance-accounts", dto));
export const updateRemittanceAccount = async (
  id: string,
  dto: Partial<{
    accountName: string;
    bankName: string;
    accountNumber: string;
    currency: string;
    branchCode: string;
    swiftCode: string;
  }>,
): Promise<RemittanceAccount> =>
  unwrap(await api.patch(`/finance/remittance-accounts/${id}`, dto));
export const setRemittanceAccountActive = async (
  id: string,
  active: boolean,
): Promise<RemittanceAccount> =>
  unwrap(
    await api.post(`/finance/remittance-accounts/${id}/active`, { active }),
  );

// ── Trust accounting ──────────────────────────────────────────

export type InterestTreatment = "Client retained" | "Firm retained" | "Pooled";
export type TrustMovementType = "Deposit" | "Drawdown" | "Interest";
export type TrustMovementStatus =
  | "Recorded"
  | "Awaiting authorisation"
  | "Approved"
  | "Rejected";

export interface TrustLedger {
  _id: string;
  bankAccountId: string;
  clientUserId: string;
  clientName: string;
  mandateId: string | null;
  mandateName: string;
  currency: string;
  interestTreatment: InterestTreatment;
  lastReconciledAt: string | null;
  // Server-computed live from real movements — never sent, always present.
  balance: number;
}
export const fetchTrustLedgers = async (): Promise<TrustLedger[]> => {
  const res = await api.get("/finance/trust-ledgers");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const fetchTrustLedger = async (id: string): Promise<TrustLedger> =>
  unwrap(await api.get(`/finance/trust-ledgers/${id}`));
export const createTrustLedger = async (dto: {
  bankAccountId: string;
  clientUserId: string;
  clientName: string;
  mandateId?: string;
  mandateName?: string;
  currency?: string;
  interestTreatment?: InterestTreatment;
}): Promise<TrustLedger> =>
  unwrap(await api.post("/finance/trust-ledgers", dto));
export const markTrustLedgerReconciled = async (
  id: string,
): Promise<TrustLedger> =>
  unwrap(await api.post(`/finance/trust-ledgers/${id}/reconcile`));

export interface TrustIntegrityCheck {
  bankBalance: number;
  ledgerTotal: number;
  ledgerCount: number;
  variance: number;
  matched: boolean;
}
export const fetchTrustIntegrityCheck = async (
  bankAccountId: string,
): Promise<TrustIntegrityCheck> =>
  unwrap(await api.get(`/finance/trust-ledgers/integrity/${bankAccountId}`));

export interface TrustMovement {
  _id: string;
  ref: string;
  ledgerId: string;
  type: TrustMovementType;
  amount: number;
  reference: string;
  date: string;
  status: TrustMovementStatus;
  preparedBy: string;
  authorisedBy: string | null;
  authorisedAt: string | null;
  linkedInvoiceId: string | null;
  rejectedReason: string | null;
  createdAt: string;
}
export const fetchTrustMovements = async (
  ledgerId?: string,
): Promise<TrustMovement[]> => {
  const res = await api.get("/finance/trust-movements", {
    params: ledgerId ? { ledgerId } : undefined,
  });
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const recordTrustDeposit = async (dto: {
  ledgerId: string;
  amount: number;
  reference?: string;
  date: string;
  preparedBy: string;
}): Promise<TrustMovement> =>
  unwrap(await api.post("/finance/trust-movements/deposit", dto));
export const requestTrustDrawdown = async (dto: {
  ledgerId: string;
  amount: number;
  linkedInvoiceId?: string;
  preparedBy: string;
}): Promise<TrustMovement> =>
  unwrap(await api.post("/finance/trust-movements/drawdown", dto));
export const authoriseTrustDrawdown = async (
  id: string,
  authorisedBy: string,
): Promise<TrustMovement> =>
  unwrap(
    await api.post(`/finance/trust-movements/${id}/authorise`, {
      authorisedBy,
    }),
  );
export const rejectTrustDrawdown = async (
  id: string,
  reason?: string,
): Promise<TrustMovement> =>
  unwrap(await api.post(`/finance/trust-movements/${id}/reject`, { reason }));

// ══════════════════════════════════════════════════════════════
// Fund accounting
// ══════════════════════════════════════════════════════════════

export type WaterfallType = "Whole-fund (European)" | "Deal-by-deal (American)";
export type FundStatus =
  | "Fundraising"
  | "Investing"
  | "Harvesting"
  | "Wound down";

export interface Fund {
  _id: string;
  name: string;
  structure: string;
  jurisdiction: string;
  strategy: string;
  targetSize: number;
  vintage: number;
  currency: string;
  status: FundStatus;
  bankAccountId: string | null;
  mgmtFeePct: number;
  carryPct: number;
  hurdlePct: number;
  waterfallType: WaterfallType;
  defaultInterestPct: number;
  curePeriodDays: number;
  forfeiturePct: number;
  equalisationInterestPct: number;
  carryEscrowPct: number;
  investmentPeriodEndDate: string | null;
  orgCostsCapAmount: number;
  recyclingPermitted: boolean;
  recyclingCapPct: number;
  maxSingleInvestmentPct: number;
  maxSectorConcentrationPct: number;
  maxCountryConcentrationPct: number;
  excludedSectors: string[];
  allowedGeography: string[];
  investmentPeriodSuspended: boolean;
  committed: number;
  called: number;
  unfunded: number;
  lpCount: number;
}
export interface FundTermsInput {
  name?: string;
  structure?: string;
  jurisdiction?: string;
  strategy?: string;
  targetSize?: number;
  vintage?: number;
  currency?: string;
  bankAccountId?: string;
  mgmtFeePct?: number;
  carryPct?: number;
  hurdlePct?: number;
  waterfallType?: WaterfallType;
  defaultInterestPct?: number;
  curePeriodDays?: number;
  forfeiturePct?: number;
  equalisationInterestPct?: number;
  carryEscrowPct?: number;
  investmentPeriodEndDate?: string;
  orgCostsCapAmount?: number;
  recyclingPermitted?: boolean;
  recyclingCapPct?: number;
}
export const fetchFunds = async (): Promise<Fund[]> => {
  const res = await api.get("/finance/funds");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const fetchFund = async (fundId: string): Promise<Fund> =>
  unwrap(await api.get(`/finance/funds/${fundId}`));
export const createFund = async (
  dto: FundTermsInput & { name: string },
): Promise<Fund> => unwrap(await api.post("/finance/funds", dto));
export const setFundStatus = async (
  fundId: string,
  status: FundStatus,
): Promise<Fund> =>
  unwrap(await api.post(`/finance/funds/${fundId}/status`, { status }));
export const updateFundTerms = async (
  fundId: string,
  dto: FundTermsInput,
): Promise<Fund> =>
  unwrap(await api.patch(`/finance/funds/${fundId}/terms`, dto));

// ── Capital commitments ─────────────────────────────────────────

export type CommitmentType =
  | "Institutional"
  | "DFI"
  | "Pension"
  | "Family office"
  | "Corporate"
  | "HNW"
  | "Trust"
  | "GP commit";

export interface CapitalCommitment {
  _id: string;
  fundId: string;
  lpUserId: string;
  lpName: string;
  commitment: number;
  type: CommitmentType;
  closeLabel: string;
  closeDate: string | null;
  isGpCommitment: boolean;
  hasSideLetter: boolean;
  mgmtFeePctOverride: number | null;
  sideLetterNotes: string;
  equalisationApplied: boolean;
}
export const fetchCommitments = async (
  fundId: string,
): Promise<CapitalCommitment[]> => {
  const res = await api.get(`/finance/funds/${fundId}/commitments`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const createCommitment = async (
  fundId: string,
  dto: {
    lpUserId: string;
    lpName: string;
    commitment: number;
    type?: CommitmentType;
    closeLabel?: string;
    closeDate?: string;
    isGpCommitment?: boolean;
    hasSideLetter?: boolean;
    mgmtFeePctOverride?: number;
    sideLetterNotes?: string;
  },
): Promise<CapitalCommitment> =>
  unwrap(await api.post(`/finance/funds/${fundId}/commitments`, dto));

export interface EqualisationCalc {
  commitmentId: string;
  lpName: string;
  closeDate: string;
  firstCloseDate: string;
  daysAfterFirstClose: number;
  calledPctAtClose: number;
  catchUpCall: number;
  eqInterest: number;
  totalEqualisationPaid: number;
  earlierLpCount: number;
}
export const computeEqualisation = async (
  fundId: string,
  commitmentId: string,
): Promise<EqualisationCalc> =>
  unwrap(
    await api.get(
      `/finance/funds/${fundId}/commitments/${commitmentId}/equalisation`,
    ),
  );
export const applyEqualisation = async (
  fundId: string,
  commitmentId: string,
): Promise<EqualisationCalc> =>
  unwrap(
    await api.post(
      `/finance/funds/${fundId}/commitments/${commitmentId}/equalisation/apply`,
    ),
  );

// ── Capital calls ────────────────────────────────────────────────

export type CapitalCallAllocationStatus =
  | "Unfunded"
  | "Partially funded"
  | "Funded"
  | "Defaulted";

export interface CapitalCallAllocation {
  _id: string;
  commitmentId: string;
  lpName: string;
  amount: number;
  fundedAmount: number;
  status: CapitalCallAllocationStatus;
  fundedAt: string | null;
  defaultDeclaredAt: string | null;
  cureDeadline: string | null;
  forfeitedAmount: number;
  cured: boolean;
}
export interface CapitalCall {
  _id: string;
  fundId: string;
  ref: string;
  purpose: string;
  totalAmount: number;
  issuedOn: string;
  dueOn: string;
  allocations: CapitalCallAllocation[];
}
export const fetchCapitalCalls = async (
  fundId: string,
): Promise<CapitalCall[]> => {
  const res = await api.get(`/finance/funds/${fundId}/capital-calls`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const createCapitalCall = async (
  fundId: string,
  dto: {
    purpose: string;
    totalAmount: number;
    issuedOn: string;
    dueOn: string;
  },
): Promise<CapitalCall> =>
  unwrap(await api.post(`/finance/funds/${fundId}/capital-calls`, dto));
export const recordCallFunding = async (
  fundId: string,
  callId: string,
  allocationId: string,
  amount: number,
): Promise<CapitalCall> =>
  unwrap(
    await api.post(
      `/finance/funds/${fundId}/capital-calls/${callId}/allocations/${allocationId}/fund`,
      { amount },
    ),
  );
export const declareDefault = async (
  fundId: string,
  callId: string,
  allocationId: string,
): Promise<CapitalCall> =>
  unwrap(
    await api.post(
      `/finance/funds/${fundId}/capital-calls/${callId}/allocations/${allocationId}/default`,
    ),
  );
export const cureDefault = async (
  fundId: string,
  callId: string,
  allocationId: string,
  amount: number,
): Promise<{ call: CapitalCall; defaultInterestCharged: number }> =>
  unwrap(
    await api.post(
      `/finance/funds/${fundId}/capital-calls/${callId}/allocations/${allocationId}/cure`,
      { amount },
    ),
  );
export const forfeitDefault = async (
  fundId: string,
  callId: string,
  allocationId: string,
): Promise<{ call: CapitalCall; forfeited: number }> =>
  unwrap(
    await api.post(
      `/finance/funds/${fundId}/capital-calls/${callId}/allocations/${allocationId}/forfeit`,
    ),
  );

// ── Capital accounts ─────────────────────────────────────────────

export interface CapitalAccountRow {
  commitmentId: string;
  lpName: string;
  type: CommitmentType;
  closeLabel: string;
  isGpCommitment: boolean;
  hasSideLetter: boolean;
  equalisationApplied: boolean;
  commitment: number;
  commitmentPct: number;
  called: number;
  incomeAlloc: number;
  expenseAlloc: number;
  gainLoss: number;
  distributions: number;
  balance: number;
}
export interface CapitalAccountRegister {
  rows: CapitalAccountRow[];
  totalCommitment: number;
  totalCalled: number;
  totalBalance: number;
}
export const fetchCapitalAccounts = async (
  fundId: string,
): Promise<CapitalAccountRegister> =>
  unwrap(await api.get(`/finance/funds/${fundId}/capital-accounts`));
export interface CapitalAccountEntry {
  _id: string;
  commitmentId: string;
  type: string;
  amount: number;
  date: string;
  description: string;
  sourceId: string | null;
}
export const fetchCapitalAccountEntries = async (
  fundId: string,
  commitmentId: string,
): Promise<CapitalAccountEntry[]> => {
  const res = await api.get(
    `/finance/funds/${fundId}/capital-accounts/${commitmentId}/entries`,
  );
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

// ── Distributions & waterfall ─────────────────────────────────────

export type DistributionSource =
  | "Exit"
  | "Dividend"
  | "Interest income"
  | "Recapitalisation"
  | "Other";

export interface Distribution {
  _id: string;
  fundId: string;
  ref: string;
  date: string;
  source: DistributionSource;
  sourceDescription: string;
  totalAmount: number;
  tier1Amount: number;
  tier2Amount: number;
  tier3Amount: number;
  tier4LpAmount: number;
  tier4GpAmount: number;
  totalToLps: number;
  totalToGpGross: number;
  carryHeldInEscrow: number;
  carryPaidToGp: number;
  allocations: { commitmentId: string; lpName: string; amount: number }[];
}
export interface WaterfallTier {
  target: number;
  paid: number;
  remaining: number;
  complete: boolean;
}
export interface WaterfallState {
  waterfallType: WaterfallType;
  totalDistributed: number;
  totalToLps: number;
  totalToGpGross: number;
  carryHeldInEscrow: number;
  carryPaidNet: number;
  tier1: WaterfallTier;
  tier2: WaterfallTier;
  tier3: WaterfallTier;
  tier4: { lpPaid: number; gpPaid: number };
  hurdleStatusPct: number;
  distributionEventCount: number;
}
export interface GpCarryPosition {
  carryReceivedToDate: number;
  carryEntitled: number;
  carryPaidNet: number;
  carryHeldInEscrow: number;
  clawbackObligation: number;
  noClawback: boolean;
}
export interface AccruedCarryOnNav {
  hypotheticalNav: number;
  accruedCarryGross: number;
  accruedCarryNote: string;
}

export const fetchDistributions = async (
  fundId: string,
): Promise<Distribution[]> => {
  const res = await api.get(`/finance/funds/${fundId}/distributions`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const fetchWaterfallState = async (
  fundId: string,
): Promise<WaterfallState> =>
  unwrap(await api.get(`/finance/funds/${fundId}/distributions/waterfall`));
export const fetchGpCarryPosition = async (
  fundId: string,
): Promise<GpCarryPosition> =>
  unwrap(
    await api.get(`/finance/funds/${fundId}/distributions/gp-carry-position`),
  );
export const fetchAccruedCarryOnNav = async (
  fundId: string,
): Promise<AccruedCarryOnNav> =>
  unwrap(await api.get(`/finance/funds/${fundId}/distributions/accrued-carry`));
export const recordDistribution = async (
  fundId: string,
  dto: {
    totalAmount: number;
    date: string;
    source?: DistributionSource;
    sourceDescription?: string;
  },
): Promise<Distribution> =>
  unwrap(await api.post(`/finance/funds/${fundId}/distributions`, dto));

// ── Portfolio holdings & NAV valuation ────────────────────────────

export type HoldingStatus = "Active" | "Exited";
export type ValuationMethod =
  | "Last round"
  | "DCF"
  | "Earnings multiple"
  | "At cost (<12mo)"
  | "Precedent transaction"
  | "Market price";
export type IfrsLevel = "Level 1" | "Level 2" | "Level 3";
export type HoldingValuationStatus = "Proposed" | "Reviewed" | "Approved";

export interface PortfolioHolding {
  _id: string;
  fundId: string;
  companyName: string;
  sector: string;
  country: string;
  entryDate: string;
  costBasis: number;
  currency: string;
  status: HoldingStatus;
  exitedAt: string | null;
  exitProceeds: number | null;
  recycledAmount: number;
  fairValue: number | null;
  fairValuePeriod: string | null;
  moic: number | null;
}
export const fetchHoldings = async (
  fundId: string,
): Promise<PortfolioHolding[]> => {
  const res = await api.get(`/finance/funds/${fundId}/holdings`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const createHolding = async (
  fundId: string,
  dto: {
    companyName: string;
    sector?: string;
    country?: string;
    entryDate: string;
    costBasis: number;
  },
): Promise<PortfolioHolding> =>
  unwrap(await api.post(`/finance/funds/${fundId}/holdings`, dto));
export const recordExit = async (
  fundId: string,
  holdingId: string,
  dto: { exitedAt: string; exitProceeds: number; recycledAmount?: number },
): Promise<PortfolioHolding> =>
  unwrap(
    await api.post(`/finance/funds/${fundId}/holdings/${holdingId}/exit`, dto),
  );

export interface HoldingValuation {
  _id: string;
  holdingId: string;
  period: string;
  method: ValuationMethod;
  ifrsLevel: IfrsLevel;
  keyInput: string;
  proposedValue: number;
  proposedBy: string;
  proposedAt: string | null;
  reviewedValue: number | null;
  reviewNotes: string;
  reviewedBy: string;
  reviewedAt: string | null;
  methodologyChanged: boolean;
  approvedValue: number | null;
  approvedBy: string;
  approvedAt: string | null;
  status: HoldingValuationStatus;
}
export interface ValuationWorkflowRow {
  holdingId: string;
  companyName: string;
  sector: string;
  country: string;
  costBasis: number;
  valuation: HoldingValuation | null;
  priorApprovedValue: number | null;
  priorPeriod: string | null;
}
export const fetchValuationWorkflow = async (
  fundId: string,
  period: string,
): Promise<ValuationWorkflowRow[]> =>
  unwrap(await api.get(`/finance/funds/${fundId}/valuations/${period}`));
export const proposeValuation = async (
  fundId: string,
  holdingId: string,
  period: string,
  dto: {
    method: ValuationMethod;
    ifrsLevel?: IfrsLevel;
    keyInput?: string;
    proposedValue: number;
    proposedBy: string;
  },
): Promise<HoldingValuation> =>
  unwrap(
    await api.post(
      `/finance/funds/${fundId}/valuations/holdings/${holdingId}/periods/${period}/propose`,
      dto,
    ),
  );
export const reviewValuation = async (
  fundId: string,
  valuationId: string,
  dto: {
    reviewedValue: number;
    reviewNotes?: string;
    reviewedBy: string;
    methodologyChanged?: boolean;
  },
): Promise<HoldingValuation> =>
  unwrap(
    await api.post(
      `/finance/funds/${fundId}/valuations/${valuationId}/review`,
      dto,
    ),
  );
export const approveValuation = async (
  fundId: string,
  valuationId: string,
  approvedBy: string,
): Promise<HoldingValuation> =>
  unwrap(
    await api.post(
      `/finance/funds/${fundId}/valuations/${valuationId}/approve`,
      { approvedBy },
    ),
  );

// ── NAV & performance ──────────────────────────────────────────

export interface NavResult {
  portfolioInvestments: {
    holdingId: string;
    companyName: string;
    costBasis: number;
    fairValue: number;
    period: string | null;
  }[];
  portfolioTotal: number;
  cashHeld: number;
  accruedManagementFeePayable: number;
  fundExpensesPayable: number;
  nav: number;
}
export interface PerformanceMetrics {
  called: number;
  distributed: number;
  nav: number;
  dpi: number;
  rvpi: number;
  tvpi: number;
  netIrr: number | null;
  netIrrNote: string;
  pmeNote: string;
}
export const fetchNav = async (fundId: string): Promise<NavResult> =>
  unwrap(await api.get(`/finance/funds/${fundId}/nav`));
export const fetchPerformanceMetrics = async (
  fundId: string,
): Promise<PerformanceMetrics> =>
  unwrap(await api.get(`/finance/funds/${fundId}/nav/performance`));

// ── Fund expenses & management fee ────────────────────────────────

export type ExpenseBorneBy = "Fund" | "GP";
export type FeeChargeStatus = "Accrued" | "Paid";

export interface FundExpenseRecord {
  _id: string;
  category: string;
  amount: number;
  date: string;
  isOrganisationalCost: boolean;
  borneBy: ExpenseBorneBy;
  gpBorneAmount: number;
}
export const fetchFundExpenses = async (
  fundId: string,
): Promise<FundExpenseRecord[]> => {
  const res = await api.get(`/finance/funds/${fundId}/expenses`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const recordFundExpense = async (
  fundId: string,
  dto: {
    category: string;
    amount: number;
    date: string;
    isOrganisationalCost?: boolean;
  },
): Promise<FundExpenseRecord> =>
  unwrap(await api.post(`/finance/funds/${fundId}/expenses`, dto));

export interface FeeChargeAllocation {
  commitmentId: string;
  lpName: string;
  baseAmount: number;
  ratePct: number;
  feeAmount: number;
}
export interface ManagementFeeCharge {
  _id: string;
  period: string;
  basis: string;
  totalBaseAmount: number;
  totalFeeAmount: number;
  allocations: FeeChargeAllocation[];
  status: FeeChargeStatus;
  paidAt: string | null;
}
export interface FeePreview {
  basis: string;
  allocations: FeeChargeAllocation[];
  totalBaseAmount: number;
  totalFeeAmount: number;
}

export const fetchManagementFeeCharges = async (
  fundId: string,
): Promise<ManagementFeeCharge[]> => {
  const res = await api.get(`/finance/funds/${fundId}/management-fee`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const previewManagementFee = async (
  fundId: string,
): Promise<FeePreview> =>
  unwrap(await api.get(`/finance/funds/${fundId}/management-fee/preview`));
export const chargeManagementFee = async (
  fundId: string,
  period: string,
  asOfDate: string,
): Promise<ManagementFeeCharge> =>
  unwrap(
    await api.post(`/finance/funds/${fundId}/management-fee/${period}/charge`, {
      asOfDate,
    }),
  );
export const payManagementFee = async (
  fundId: string,
  chargeId: string,
): Promise<ManagementFeeCharge> =>
  unwrap(
    await api.post(
      `/finance/funds/${fundId}/management-fee/charges/${chargeId}/pay`,
    ),
  );

// ── Compliance ──────────────────────────────────────────────────

export type KeyPersonStatus = "Active" | "Departed";
export type ComplianceFrequency =
  | "Quarterly"
  | "Semi-annual"
  | "Annual"
  | "As needed";

export interface KeyPerson {
  _id: string;
  name: string;
  role: string;
  timeThresholdPct: number;
  status: KeyPersonStatus;
  lastConfirmedAt: string | null;
  departedAt: string | null;
}
export interface ComplianceCalendarItem {
  _id: string;
  name: string;
  frequency: ComplianceFrequency;
  daysAfterPeriodEnd: number;
  lastCompletedAt: string | null;
  lastCompletedPeriod: string | null;
  nextDueDate: string | null;
  daysUntilDue: number | null;
  status: string;
}
export interface RestrictionCheck {
  pct: number;
  withinLimit: boolean;
  amount: number;
  capAmount?: number;
}
export interface RestrictionMonitoring {
  singleInvestment: (RestrictionCheck & { companyName: string })[];
  sectorConcentration: (RestrictionCheck & { sector: string })[];
  countryConcentration: (RestrictionCheck & { country: string })[];
  excludedSectorViolations: PortfolioHolding[];
  outOfGeographyHoldings: PortfolioHolding[];
  investmentPeriodSuspended: boolean;
  amlNote: string;
}

export const fetchKeyPersons = async (fundId: string): Promise<KeyPerson[]> => {
  const res = await api.get(`/finance/funds/${fundId}/compliance/key-persons`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const addKeyPerson = async (
  fundId: string,
  dto: { name: string; role: string; timeThresholdPct: number },
): Promise<KeyPerson> =>
  unwrap(
    await api.post(`/finance/funds/${fundId}/compliance/key-persons`, dto),
  );
export const confirmKeyPersonActive = async (
  fundId: string,
  keyPersonId: string,
): Promise<KeyPerson> =>
  unwrap(
    await api.post(
      `/finance/funds/${fundId}/compliance/key-persons/${keyPersonId}/confirm`,
    ),
  );
export const markKeyPersonDeparted = async (
  fundId: string,
  keyPersonId: string,
): Promise<KeyPerson> =>
  unwrap(
    await api.post(
      `/finance/funds/${fundId}/compliance/key-persons/${keyPersonId}/depart`,
    ),
  );

export const fetchComplianceCalendar = async (
  fundId: string,
): Promise<ComplianceCalendarItem[]> =>
  unwrap(await api.get(`/finance/funds/${fundId}/compliance/calendar`));
export const addComplianceCalendarItem = async (
  fundId: string,
  dto: {
    name: string;
    frequency: ComplianceFrequency;
    daysAfterPeriodEnd?: number;
  },
): Promise<ComplianceCalendarItem> =>
  unwrap(await api.post(`/finance/funds/${fundId}/compliance/calendar`, dto));
export const markComplianceComplete = async (
  fundId: string,
  calendarItemId: string,
  period: string,
): Promise<ComplianceCalendarItem> =>
  unwrap(
    await api.post(
      `/finance/funds/${fundId}/compliance/calendar/${calendarItemId}/complete`,
      { period },
    ),
  );

export const fetchRestrictionMonitoring = async (
  fundId: string,
): Promise<RestrictionMonitoring> =>
  unwrap(await api.get(`/finance/funds/${fundId}/compliance/restrictions`));

// ── Multi-currency (FX) ────────────────────────────────────────

export interface FxRateRecord {
  _id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  asOfDate: string;
  source: string;
}
export interface FxExposureRow {
  companyName: string;
  currency: string;
  entryRate?: number;
  currentRate?: number;
  costBasisFundCcy?: number;
  fxGainLoss?: number;
  note?: string;
}
export interface FxExposure {
  fundCurrency: string;
  rows: FxExposureRow[];
  totalFxGainLoss: number;
  currencyCount: number;
}

export const fetchFxRates = async (fundId: string): Promise<FxRateRecord[]> => {
  const res = await api.get(`/finance/funds/${fundId}/fx-rates`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const recordFxRate = async (
  fundId: string,
  dto: {
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    asOfDate: string;
    source?: string;
  },
): Promise<FxRateRecord> =>
  unwrap(await api.post(`/finance/funds/${fundId}/fx-rates`, dto));
export const fetchFxExposure = async (fundId: string): Promise<FxExposure> =>
  unwrap(await api.get(`/finance/funds/${fundId}/fx-rates/exposure`));

// ── Scenarios ───────────────────────────────────────────────────

export interface ScenarioResult {
  perHolding: {
    holdingId: string;
    companyName: string;
    value: number;
    overridden: boolean;
  }[];
  cashHeld: number;
  hypotheticalTotal: number;
  tier1Amount: number;
  tier2Amount: number;
  tier3Amount: number;
  tier4LpAmount: number;
  tier4GpAmount: number;
  totalToLps: number;
  totalToGpGross: number;
  hurdleCleared: boolean;
  tier2Target: number;
  tier3Target: number;
  note: string;
}
export const runScenario = async (
  fundId: string,
  holdingExitValues?: { holdingId: string; exitValue: number }[],
): Promise<ScenarioResult> =>
  unwrap(
    await api.post(`/finance/funds/${fundId}/scenarios/run`, {
      holdingExitValues,
    }),
  );

// ── LP reporting ────────────────────────────────────────────────

export interface QuarterlyStatement {
  commitmentId: string;
  lpName: string;
  periodStart: string;
  periodEnd: string;
  commitment: number;
  calledToDate: number;
  uncalled: number;
  openingBalance: number;
  contributionsInPeriod: number;
  incomeAlloc: number;
  expenseAlloc: number;
  gainLoss: number;
  distributionsInPeriod: number;
  closingBalance: number;
  dpi: number;
  rvpi: number;
  tvpi: number;
}
export const fetchQuarterlyStatement = async (
  fundId: string,
  commitmentId: string,
  periodStart: string,
  periodEnd: string,
): Promise<QuarterlyStatement> =>
  unwrap(
    await api.get(
      `/finance/funds/${fundId}/lp-reporting/commitments/${commitmentId}/statement`,
      {
        params: { periodStart, periodEnd },
      },
    ),
  );
export const fetchCallNotice = async (
  fundId: string,
  callId: string,
  commitmentId: string,
) =>
  unwrap(
    await api.get(
      `/finance/funds/${fundId}/lp-reporting/calls/${callId}/notice/${commitmentId}`,
    ),
  );
export const fetchDistributionNotice = async (
  fundId: string,
  distributionId: string,
  commitmentId: string,
) =>
  unwrap(
    await api.get(
      `/finance/funds/${fundId}/lp-reporting/distributions/${distributionId}/notice/${commitmentId}`,
    ),
  );
export const fetchFeeExpenseDisclosure = async (
  fundId: string,
  commitmentId: string,
  period: string,
) =>
  unwrap(
    await api.get(
      `/finance/funds/${fundId}/lp-reporting/commitments/${commitmentId}/fee-expense-disclosure/${period}`,
    ),
  );
