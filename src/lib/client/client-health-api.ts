import { api } from "../api";

export type CommercialRiskRating = "Low" | "Medium" | "High";
export type FeeTier = "Tier 1" | "Tier 2" | "Tier 3";

export interface ClientHealthFactor {
  l: string;
  v: number;
  max: number;
}

export interface ClientHealth {
  serviceLines: string[];
  riskRating: CommercialRiskRating | string | null;
  feeTier: FeeTier | null;
  slaProfileId: string;
  revenueYtd: number;
  costYtd: number;
  currency: string;
  // Real, manually-recorded CSAT — null means never yet recorded,
  // not zero.
  satisfaction: number | null;
  notes: string;
  relationshipManager: string | null;
  openTickets: number;
  // Real average days-to-pay from actual settled invoices — null
  // when the client has no paid invoices yet, not a guessed number.
  invoiceDaysAvg: number | null;
  lastInteraction: string | null;
  // Whether a relationship manager has ever saved commercial data
  // for this client — false means everything shown is a real
  // default/live signal, not a fabricated placeholder.
  hasRecord: boolean;
  score: number;
  band: "Healthy" | "Watch" | "At risk";
  factors: ClientHealthFactor[];
}

export interface UpdateClientCommercialPayload {
  serviceLines?: string[];
  riskRating?: CommercialRiskRating;
  feeTier?: FeeTier;
  slaProfileId?: string;
  revenueYtd?: number;
  costYtd?: number;
  currency?: string;
  satisfaction?: number;
  notes?: string;
}

export const fetchClientHealth = async (
  clientId: string,
): Promise<ClientHealth> => {
  const res = await api.get(`/tenant/my-clients/${clientId}/health`);
  return res.data?.data ?? res.data;
};

export const updateClientCommercial = async (
  clientId: string,
  payload: UpdateClientCommercialPayload,
): Promise<void> => {
  await api.patch(`/tenant/my-clients/${clientId}/commercial`, payload);
};
