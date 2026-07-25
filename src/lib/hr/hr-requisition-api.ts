import { api } from "../api";

// ─────────────────────────────────────────────────────────────
// REQUISITION TYPES — Types & API
// ─────────────────────────────────────────────────────────────

export interface RequisitionTypeItem {
  key: string;
  label: string;
}

export interface RequisitionTypeList {
  _id: string;
  tenantId: string;
  items: RequisitionTypeItem[];
}

export const fetchRequisitionTypes = async (): Promise<RequisitionTypeList> => {
  const res = await api.get("/hr/requisitions/types");
  return res.data?.data ?? res.data;
};

export const updateRequisitionTypes = async (
  items: RequisitionTypeItem[],
): Promise<RequisitionTypeList> => {
  const res = await api.patch("/hr/requisitions/types", { items });
  return res.data?.data ?? res.data;
};

// Employee-side — same shape, different route (tenant-wide list,
// just exposed read-only from the employee's own session).
export const fetchMyRequisitionTypes =
  async (): Promise<RequisitionTypeList> => {
    const res = await api.get("/employee/requisitions/types");
    return res.data?.data ?? res.data;
  };

// ─────────────────────────────────────────────────────────────
// REQUISITIONS — Types
// ─────────────────────────────────────────────────────────────

export type RequisitionStatus =
  | "submitted"
  | "approved"
  | "rejected"
  | "fulfilled";
export type RequisitionPriority = "low" | "medium" | "high" | "urgent";

export interface Requisition {
  _id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  department: string | null;
  typeKey: string;
  typeLabel: string;
  title: string;
  amount: number | null;
  currency: string | null;
  priority: RequisitionPriority;
  justification: string | null;
  status: RequisitionStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  fulfilledAt: string | null;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// REQUISITIONS — Tenant/HR API
// ─────────────────────────────────────────────────────────────

export const fetchAllRequisitions = async (
  status?: RequisitionStatus,
): Promise<Requisition[]> => {
  const res = await api.get("/hr/requisitions", {
    params: status ? { status } : undefined,
  });
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchRequisitionById = async (
  requisitionId: string,
): Promise<Requisition> => {
  const res = await api.get(`/hr/requisitions/${requisitionId}`);
  return res.data?.data ?? res.data;
};

export const reviewRequisition = async (
  requisitionId: string,
  dto: { decision: "approved" | "rejected"; reviewNote?: string },
): Promise<Requisition> => {
  const res = await api.patch(`/hr/requisitions/${requisitionId}/review`, dto);
  return res.data?.data ?? res.data;
};

export const fulfillRequisition = async (
  requisitionId: string,
): Promise<Requisition> => {
  const res = await api.post(`/hr/requisitions/${requisitionId}/fulfill`, {});
  return res.data?.data ?? res.data;
};

// ─────────────────────────────────────────────────────────────
// REQUISITIONS — Employee self-service API
// ─────────────────────────────────────────────────────────────

export const fetchMyRequisitions = async (): Promise<Requisition[]> => {
  const res = await api.get("/employee/requisitions");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchMyRequisitionById = async (
  requisitionId: string,
): Promise<Requisition> => {
  const res = await api.get(`/employee/requisitions/${requisitionId}`);
  return res.data?.data ?? res.data;
};

export const createRequisition = async (dto: {
  typeKey: string;
  title: string;
  amount?: number;
  currency?: string;
  priority?: RequisitionPriority;
  justification?: string;
}): Promise<Requisition> => {
  const res = await api.post("/employee/requisitions", dto);
  return res.data?.data ?? res.data;
};
