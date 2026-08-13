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

// A WipEntry is a real TimeEntry, re-shaped for billing review —
// not a separate entity. Same fields TimeEntry already has, plus
// the billing-review fields layered on top.
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
  // Server-computed on every read — never sent, always present.
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
  timeEntryIds: string[];
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
  clientUserId: string;
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
  clientUserId: string;
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
