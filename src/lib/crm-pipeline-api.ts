import { api } from "./api";

export type LeadSource =
  | "event"
  | "referral"
  | "web"
  | "cold_outreach"
  | "partner"
  | "other";
export type LeadStage = "lead" | "prospect";
export type LeadStatus = "open" | "converted" | "lost";
export type ClientPipelineStage = "active" | "retained" | "past";
export type ClientType = "individual" | "corporate" | "partner" | "trust";

export interface Lead {
  _id: string;
  tenantId: string;
  contactName: string | null;
  companyName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  industry: string | null;
  source: LeadSource;
  sourceNote: string | null;
  stage: LeadStage;
  status: LeadStatus;
  notes: string | null;
  assignedToUserId: string | null;
  reachedProspectAt: string | null;
  convertedAt: string | null;
  lostAt: string | null;
  lostReason: string | null;
  convertedClientId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadStats {
  leads: number;
  prospects: number;
}

export interface LeadFunnel {
  totalLeads: number;
  reachedProspect: number;
  converted: number;
  leadToProspectRate: number;
  prospectToClientRate: number;
  clientRetentionRate: number;
}

export interface ClientBoardCard {
  pipelineId: string;
  clientUserId: string;
  name: string;
  email: string | null;
  kycStatus: string;
  riskLevel: string;
  clientSince: string;
  projectCount: number;
}

export interface ClientCounts {
  active: number;
  retained: number;
  past: number;
}

// ── Leads ──────────────────────────────────────────────────────

export const fetchLeads = async (): Promise<Lead[]> => {
  const res = await api.get("/crm/leads");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchLeadStats = async (): Promise<LeadStats> => {
  const res = await api.get("/crm/leads/stats");
  return res.data?.data ?? res.data;
};

export const fetchLeadFunnel = async (): Promise<LeadFunnel> => {
  const res = await api.get("/crm/leads/funnel");
  return res.data?.data ?? res.data;
};

export const createLead = async (dto: {
  contactName?: string;
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  industry?: string;
  source: LeadSource;
  sourceNote?: string;
  notes?: string;
}): Promise<Lead> => {
  const res = await api.post("/crm/leads", dto);
  return res.data?.data ?? res.data;
};

export const moveLeadStage = async (
  id: string,
  stage: LeadStage,
): Promise<Lead> => {
  const res = await api.patch(`/crm/leads/${id}/stage`, { stage });
  return res.data?.data ?? res.data;
};

export const markLeadLost = async (
  id: string,
  reason?: string,
): Promise<Lead> => {
  const res = await api.patch(`/crm/leads/${id}/lost`, { reason });
  return res.data?.data ?? res.data;
};

export const convertLead = async (
  id: string,
  dto: { email?: string; phoneNumber?: string; clientType: ClientType },
): Promise<{ lead: Lead; client: any; message: string }> => {
  const res = await api.post(`/crm/leads/${id}/convert`, dto);
  return res.data?.data ?? res.data;
};

export const deleteLead = async (id: string): Promise<void> => {
  await api.delete(`/crm/leads/${id}`);
};

// ── Client Pipeline ───────────────────────────────────────────

export const fetchClientBoard = async (
  stage: ClientPipelineStage,
): Promise<ClientBoardCard[]> => {
  const res = await api.get("/crm/clients/board", { params: { stage } });
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchClientCounts = async (): Promise<ClientCounts> => {
  const res = await api.get("/crm/clients/counts");
  return res.data?.data ?? res.data;
};

export const moveClientStage = async (
  pipelineId: string,
  stage: ClientPipelineStage,
  reason?: string,
): Promise<void> => {
  await api.patch(`/crm/clients/${pipelineId}/stage`, { stage, reason });
};
