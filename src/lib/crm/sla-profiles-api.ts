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

/**
 * Service lines are defined by the tenant: each SLA profile carries the
 * service line it covers. This returns the distinct, sorted list, and
 * optionally folds in lines already assigned to clients so nothing that is
 * in use ever disappears from a picker (case-insensitive de-dupe).
 */
export const serviceLinesFromProfiles = (
  profiles: Pick<SlaProfile, "serviceType">[],
  alsoInUse: string[] = [],
): string[] => {
  const seen = new Map<string, string>();
  for (const raw of [...profiles.map((p) => p.serviceType), ...alsoInUse]) {
    const name = (raw ?? "").trim();
    if (name && !seen.has(name.toLowerCase()))
      seen.set(name.toLowerCase(), name);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
};
