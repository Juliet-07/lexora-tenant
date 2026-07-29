import { api } from "../api";

export type PolicyType = "organisation" | "board";

const GRC_API_BASE = (api.defaults as any)?.baseURL ?? "/api";
export const resolvePolicyFileUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith("http")) return url;
  return `${new URL(GRC_API_BASE).origin}${url}`;
};

export interface PolicyAcknowledgment {
  name: string;
  email: string;
  signature: string;
  ackedAt: string;
  source: "external" | "employee";
}

export interface Policy {
  _id: string;
  title: string;
  category: string;
  type: PolicyType;
  fileName: string;
  fileUrl: string | null;
  mimeType: string | null;
  size: number;
  acknowledgments: PolicyAcknowledgment[];
  createdAt: string;
}

export const fetchPolicies = async (): Promise<Policy[]> => {
  const res = await api.get("/grc/compliance/policies");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createPolicy = async (dto: {
  title: string;
  category?: string;
  type: PolicyType;
  file: File;
}): Promise<Policy> => {
  const form = new FormData();
  form.append("title", dto.title);
  if (dto.category) form.append("category", dto.category);
  form.append("type", dto.type);
  form.append("file", dto.file);
  const res = await api.post("/grc/compliance/policies", form);
  return res.data?.data ?? res.data;
};

export const deletePolicy = async (id: string): Promise<void> => {
  await api.delete(`/grc/compliance/policies/${id}`);
};

export const acknowledgePolicyAsEmployee = async (
  id: string,
  signature: string,
): Promise<Policy> => {
  const res = await api.post(`/grc/compliance/policies/${id}/acknowledge`, {
    signature,
  });
  return res.data?.data ?? res.data;
};

export interface PolicyAckSnapshot {
  title: string;
  category: string;
  fileName: string;
  fileUrl: string | null;
  mimeType: string | null;
  uploadedAt: string;
  prefillName: string;
  alreadyAcknowledged: boolean;
}

export const fetchPolicyAckSnapshot = async (
  token: string,
): Promise<PolicyAckSnapshot> => {
  const res = await api.get(`/grc/compliance/policies/ack/${token}`);
  return res.data?.data ?? res.data;
};

export const submitPolicyAck = async (
  token: string,
  dto: { name: string; signature: string },
): Promise<{ success: boolean }> => {
  const res = await api.post(`/grc/compliance/policies/ack/${token}`, dto);
  return res.data?.data ?? res.data;
};
