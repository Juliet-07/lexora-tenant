import axios from "axios";

// Deliberately NOT the shared `api` instance — that one auto-attaches
// any token sitting in localStorage and force-redirects to /login on
// a 401. Neither is acceptable here: this page exists specifically
// for a tenant who is locked out and has no way to log in at all.
const PUBLIC_API_BASE = import.meta.env.VITE_REACT_APP_BASE_URL;
const publicApi = axios.create({ baseURL: PUBLIC_API_BASE });

export type TransactionStatus =
  | "pending"
  | "awaiting_payment"
  | "payment_claimed"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";

export interface OpenInvoice {
  _id: string;
  status: TransactionStatus;
  amount: number;
  currency: string;
  plan: string;
  invoiceNumber: string | null;
  paymentClaimedAt: string | null;
}

export interface ReactivationPlan {
  plan: string;
  displayName?: string;
  description?: string;
  priceMonthly?: number;
  features?: string[];
  maxUsers?: number;
}

export interface ReactivationInfo {
  tenantId: string;
  businessName: string;
  firstName: string;
  currentPlan: string | null;
  subscriptionStatus: string | null;
  openInvoice: OpenInvoice | null;
  availablePlans: ReactivationPlan[];
}

export const fetchReactivationInfo = async (
  token: string,
): Promise<ReactivationInfo> => {
  const res = await publicApi.get(`/public/reactivation/${token}`);
  return res.data?.data ?? res.data;
};

export const requestReactivationUpgrade = async (
  token: string,
  plan: string,
  currency: "USD" | "RWF",
): Promise<OpenInvoice> => {
  const res = await publicApi.post(
    `/public/reactivation/${token}/request-upgrade`,
    { plan, currency },
  );
  return res.data?.data ?? res.data;
};

export const markReactivationPaid = async (
  token: string,
  transactionId: string,
): Promise<OpenInvoice> => {
  const res = await publicApi.post(`/public/reactivation/${token}/mark-paid`, {
    transactionId,
  });
  return res.data?.data ?? res.data;
};

export const resendReactivationLink = async (
  email: string,
): Promise<{ success: boolean; message: string }> => {
  const res = await publicApi.post(`/public/reactivation/resend`, { email });
  return res.data?.data ?? res.data;
};
