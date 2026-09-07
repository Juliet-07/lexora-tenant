import { api } from "@/lib/api";

export type TransactionStatus =
  | "pending"
  | "awaiting_payment"
  | "payment_claimed"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";

export interface TenantTransaction {
  _id: string;
  type: string;
  status: TransactionStatus;
  amount: number;
  currency: string;
  plan: string;
  documentType: "invoice" | "receipt" | null;
  invoiceNumber: string | null;
  receiptNumber: string | null;
  paidAt: string | null;
  paymentClaimedAt: string | null;
  paymentMethod: "dpo" | "manual" | "invoice" | null;
  paymentReference: string | null;
  notes: string | null;
  createdAt: string;
}

export const fetchMyTransactions = async (): Promise<TenantTransaction[]> => {
  const res = await api.get("/tenant/payments/history");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

// Real, no-gateway upgrade request — creates a real invoice and
// emails it with Proof-of-Payment instructions. No plan change
// happens until a super admin confirms it.
export const requestUpgrade = async (
  plan: string,
  currency: "USD" | "RWF",
): Promise<TenantTransaction> => {
  const res = await api.post("/tenant/payments/request-upgrade", {
    plan,
    currency,
  });
  return res.data?.data ?? res.data;
};

// The tenant's own "I've made payment" declaration.
export const markPaymentClaimed = async (
  transactionId: string,
): Promise<TenantTransaction> => {
  const res = await api.post(`/tenant/payments/${transactionId}/mark-paid`);
  return res.data?.data ?? res.data;
};
