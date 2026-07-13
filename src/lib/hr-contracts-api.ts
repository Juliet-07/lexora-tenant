import { api } from "./api";

// ─────────────────────────────────────────────────────────────
// CONTRACT TEMPLATES — Types & API
// ─────────────────────────────────────────────────────────────

export type WorkerCategory = "employee" | "consultant";

export type TemplateCategory = "contract" | "letter";

export interface ContractTemplate {
  _id: string;
  tenantId: string;
  name: string;
  workerCategory: WorkerCategory;
  body: string;
  description: string | null;
  isActive: boolean;
  category: TemplateCategory;
  requiresSignature: boolean;
  createdAt: string;
}

export const fetchContractTemplates = async (
  workerCategory?: WorkerCategory,
): Promise<ContractTemplate[]> => {
  const res = await api.get("/hr/contracts/templates", {
    params: workerCategory ? { workerCategory } : undefined,
  });
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchAvailableMergeFields = async (): Promise<string[]> => {
  const res = await api.get("/hr/contracts/templates/merge-fields");
  const d = res.data?.data ?? res.data;
  return d?.fields ?? [];
};

export const fetchContractTemplateById = async (
  templateId: string,
): Promise<ContractTemplate> => {
  const res = await api.get(`/hr/contracts/templates/${templateId}`);
  return res.data?.data ?? res.data;
};

export const createContractTemplate = async (dto: {
  name: string;
  workerCategory: WorkerCategory;
  body: string;
  description?: string;
  category?: TemplateCategory;
  requiresSignature?: boolean;
}): Promise<ContractTemplate> => {
  const res = await api.post("/hr/contracts/templates", dto);
  return res.data?.data ?? res.data;
};

export const updateContractTemplate = async (
  templateId: string,
  dto: {
    name?: string;
    body?: string;
    description?: string;
    isActive?: boolean;
    category?: TemplateCategory;
    requiresSignature?: boolean;
  },
): Promise<ContractTemplate> => {
  const res = await api.patch(`/hr/contracts/templates/${templateId}`, dto);
  return res.data?.data ?? res.data;
};

export const deleteContractTemplate = async (
  templateId: string,
): Promise<void> => {
  await api.delete(`/hr/contracts/templates/${templateId}`);
};

// ─────────────────────────────────────────────────────────────
// CONTRACTS — Types
// ─────────────────────────────────────────────────────────────

export type ContractStatus =
  | "draft"
  | "sent"
  | "signed"
  | "countersigned"
  | "declined"
  | "issued";

export type InteractionType =
  | "sent"
  | "viewed"
  | "comment"
  | "tenant_response"
  | "updated"
  | "resent"
  | "signed"
  | "countersigned"
  | "signed_copy_sent"
  | "declined"
  | "issued";

export interface TenantSignatureRecord {
  signedAt: string;
  signerName: string;
  signedByUserId: string;
  signatureImageData: string | null;
  stampImageData: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface ContractInteraction {
  type: InteractionType;
  occurredAt: string;
  actor: "signer" | "tenant";
  message: string | null;
  tenantUserId: string | null;
  tenantSignature: TenantSignatureRecord | null;
  signedCopySentAt: string | null;
}

export interface SignatureRecord {
  signedAt: string;
  signerName: string;
  signatureImageData: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface Contract {
  _id: string;
  tenantId: string;
  templateId: string;
  templateName: string;
  candidateId: string | null;
  employeeId: string | null;
  signerName: string;
  signerEmail: string;
  workerCategory: WorkerCategory;
  renderedBody: string;
  status: ContractStatus;
  requiresSignature: boolean;
  interactions: ContractInteraction[];
  signature: SignatureRecord | null;
  tenantSignature?: TenantSignatureRecord | null;
  signedCopySentAt?: string | null;
  declinedAt: string | null;
  declineReason: string | null;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// CONTRACTS — Tenant API
// ─────────────────────────────────────────────────────────────

export const fetchAllContracts = async (
  status?: ContractStatus,
): Promise<Contract[]> => {
  const res = await api.get("/hr/contracts", {
    params: status ? { status } : undefined,
  });
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchContractById = async (
  contractId: string,
): Promise<Contract> => {
  const res = await api.get(`/hr/contracts/${contractId}`);
  return res.data?.data ?? res.data;
};

export const generateContractFromCandidate = async (dto: {
  candidateId: string;
  templateId: string;
}): Promise<Contract> => {
  const res = await api.post("/hr/contracts/generate-from-candidate", dto);
  return res.data?.data ?? res.data;
};

export const generateContractForEmployee = async (dto: {
  employeeId: string;
  templateId: string;
  reason?: string;
  effectiveDate?: string;
  endDate?: string;
}): Promise<Contract> => {
  const res = await api.post("/hr/contracts/generate-for-employee", dto);
  return res.data?.data ?? res.data;
};

export const sendContract = async (
  contractId: string,
  expiresInHours?: number,
): Promise<Contract> => {
  const res = await api.post(`/hr/contracts/${contractId}/send`, {
    expiresInHours,
  });
  return res.data?.data ?? res.data;
};

export const respondToContractComment = async (
  contractId: string,
  message: string,
): Promise<Contract> => {
  const res = await api.post(`/hr/contracts/${contractId}/respond`, {
    message,
  });
  return res.data?.data ?? res.data;
};

export const editContractBody = async (
  contractId: string,
  dto: { renderedBody: string; changeNote?: string },
): Promise<Contract> => {
  const res = await api.patch(`/hr/contracts/${contractId}/body`, dto);
  return res.data?.data ?? res.data;
};

export const fetchHiredCandidatesWithoutContract = async (): Promise<
  {
    _id: string;
    name: string;
    email: string;
    roleAppliedFor: string;
    workerCategory: WorkerCategory;
  }[]
> => {
  const res = await api.get("/hr/contracts/hired-without-contract");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const countersignContract = async (
  contractId: string,
  dto: {
    signerName: string;
    signatureImageData?: string;
    stampImageData?: string;
  },
): Promise<Contract> => {
  const res = await api.post(`/hr/contracts/${contractId}/countersign`, dto);
  return res.data?.data ?? res.data;
};

export const issueLetter = async (
  contractId: string,
  dto: {
    signerName: string;
    signatureImageData?: string;
    stampImageData?: string;
  },
): Promise<Contract> => {
  const res = await api.post(`/hr/contracts/${contractId}/issue`, dto);
  return res.data?.data ?? res.data;
};

export const sendSignedCopy = async (contractId: string): Promise<Contract> => {
  const res = await api.post(
    `/hr/contracts/${contractId}/send-signed-copy`,
    {},
  );
  return res.data?.data ?? res.data;
};
// ─────────────────────────────────────────────────────────────
// CONTRACTS — Public signer-facing API (token-based, no auth)
//
// These deliberately do NOT go through the same `api` axios
// instance used everywhere else in this file IF that instance
// attaches an Authorization header by default — a signer has no
// session/JWT at all. Using a separate, bare axios call (or the
// same `api` instance if it's already configured to omit auth
// headers when none exist) avoids ever sending a stale/irrelevant
// auth header to a public endpoint.
// ─────────────────────────────────────────────────────────────

import axios from "axios";

const PUBLIC_API_BASE = (api.defaults as any)?.baseURL ?? "/api";
const publicApi = axios.create({ baseURL: PUBLIC_API_BASE });

export const fetchContractByToken = async (
  token: string,
): Promise<Contract> => {
  const res = await publicApi.get(`/contracts/sign/${token}`);
  return res.data?.data ?? res.data;
};

export const submitContractComment = async (
  token: string,
  message: string,
): Promise<Contract> => {
  const res = await publicApi.post(`/contracts/sign/${token}/comment`, {
    message,
  });
  return res.data?.data ?? res.data;
};

export const signContract = async (
  token: string,
  dto: { signerName: string; signatureImageData?: string },
): Promise<Contract> => {
  const res = await publicApi.post(`/contracts/sign/${token}/sign`, dto);
  return res.data?.data ?? res.data;
};

export const declineContract = async (
  token: string,
  reason?: string,
): Promise<Contract> => {
  const res = await publicApi.post(`/contracts/sign/${token}/decline`, {
    reason,
  });
  return res.data?.data ?? res.data;
};

export const downloadContractPdf = async (
  contractId: string,
  filename?: string,
): Promise<void> => {
  const res = await api.get(`/hr/contracts/${contractId}/pdf`, {
    responseType: "blob",
  });
  const blob = new Blob([res.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `contract-${contractId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};
