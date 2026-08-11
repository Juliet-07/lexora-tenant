import { api } from "../api";

export type SlaTier = "Premium" | "Standard" | "Basic";
export type SlaPriority = "Critical" | "High" | "Medium" | "Low";
export type SlaHours = Record<SlaPriority, number>;

export interface SlaProfile {
  _id: string;
  tier: SlaTier;
  serviceType: string;
  responseHrs: SlaHours;
  resolutionHrs: SlaHours;
  escalations: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertSlaProfilePayload {
  tier: SlaTier;
  serviceType: string;
  responseHrs: SlaHours;
  resolutionHrs: SlaHours;
  escalations: string;
}

const unwrap = (res: any) => res.data?.data ?? res.data;

export const fetchSlaProfiles = async (): Promise<SlaProfile[]> => {
  const res = await api.get("/crm/sla-profiles");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const createSlaProfile = async (
  dto: UpsertSlaProfilePayload,
): Promise<SlaProfile> => {
  const res = await api.post("/crm/sla-profiles", dto);
  return unwrap(res);
};

export const updateSlaProfile = async (
  id: string,
  dto: UpsertSlaProfilePayload,
): Promise<SlaProfile> => {
  const res = await api.patch(`/crm/sla-profiles/${id}`, dto);
  return unwrap(res);
};

export const deleteSlaProfile = async (id: string): Promise<void> => {
  await api.delete(`/crm/sla-profiles/${id}`);
};
