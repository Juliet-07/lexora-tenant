import { api } from "./api";

export interface ApiClient {
  _id: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  email: string;
  phone?: string;
  status: string; // pending | active | rejected | suspended | invited | submitted | in_progress | approved
  classifications?: string; // individual | corporate
  kycStatus?: string; // not_started | in_progress | submitted | approved | rejected
  riskLevel?: string; // low | medium | high
  country?: string;
  assignedOfficer?: { firstName?: string; lastName?: string } | string;
  createdAt: string;
  updatedAt?: string;
  documents?: Array<{
    name: string;
    type?: string;
    url?: string;
    status?: string;
    uploadedAt?: string;
  }>;
  activityTimeline?: Array<{ action: string; date: string; user?: string }>;
}

export interface ClientStats {
  total: number;
  byStatus: Array<{ _id: string; count: number }>;
  byClassification: Array<{ _id: string; count: number }>;
  kycStats: Array<{ _id: string; count: number }>;
  recentClients: ApiClient[];
}

export type AssignedTo = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
};

export type ClientProfileRecord = {
  _id: string;
  userId: string;
  tenantId: string;
  assignedTo: AssignedTo | null;
  classifications: string;
  individualProfile: Record<string, any> | null;
  entityProfile: Record<string, any> | null;
  isPoliticallyExposed: boolean;
  pepDetails: any | null;
  kycStatus: string;
  kycCompletedAt: string | null;
  riskLevel: string;
  profileCompletionPercent: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type ApiClientDetail = {
  _id: string;
  userType: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  roles: string[];
  status: string;
  tenantId: string;
  clientProfile: { classifications: string } | null;
  isEmailVerified: boolean;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  profile: ClientProfileRecord | null;
  classifications: string;
  kycStatus: string;
  riskLevel: string;
  country?: string;
  // documents?: {
  //   name: string;
  //   type?: string;
  //   status?: string;
  //   url?: string;
  //   uploadedAt?: string;
  // }[];
  activityTimeline?: { action: string; date: string; user?: string }[];
  onboarding?: {
    formData?: Record<string, any>;
    documents?: Array<{
      name: string;
      type?: string;
      url?: string;
      status?: string;
      uploadedAt?: string;
    }>;
    completionPercent?: number;
    submittedAt?: string;
    lastSavedAt?: string;
  } | null;
};

export const fetchClients = async (): Promise<ApiClient[]> => {
  const res = await api.get("/tenant/my-clients");
  const data = res.data?.data;
  // support either { clients: [...] } or array directly
  if (Array.isArray(data)) return data;
  return data?.clients ?? data?.items ?? [];
};

export const fetchClientStats = async (): Promise<ClientStats> => {
  const res = await api.get("/tenant/client-stats");
  console.log(res.data.data);
  return res.data.data;
};

export async function fetchClientById(id: string): Promise<ApiClientDetail> {
  const res = await api.get(`/tenant/my-clients/${id}`);
  const raw = res.data?.data ?? res.data;

  return {
    ...raw,
    classifications:
      raw.profile?.classifications ??
      raw.clientProfile?.classifications ??
      "individual",
    kycStatus: raw.profile?.kycStatus ?? "not_started",
    riskLevel: raw.profile?.riskLevel ?? "unrated",
    country: raw.profile?.address?.country ?? null,
    documents: raw.profile?.documents ?? [],
    activityTimeline: raw.profile?.metadata?.auditTrail ?? [],
  };
}

export async function reactivateClient(clientId: string): Promise<void> {
  await api.patch(`/tenant/${clientId}/reactivate`);
}
// ─── Display helpers ────────────────────────────────────────
export const displayName = (c: ApiClient): string => {
  if (c.businessName) return c.businessName;
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email;
};

export const prettyLabel = (s?: string): string => {
  if (!s) return "—";
  return s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
};

export const statusTone: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  approved: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  submitted: "bg-warning/10 text-warning border-warning/20",
  in_progress: "bg-info/10 text-info border-info/20",
  invited: "bg-info/10 text-info border-info/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
  not_started: "bg-muted text-muted-foreground border-border",
};

export const toneFor = (s?: string): string =>
  statusTone[(s ?? "").toLowerCase()] ??
  "bg-muted text-muted-foreground border-border";
// Add this to your existing clients-api.ts
