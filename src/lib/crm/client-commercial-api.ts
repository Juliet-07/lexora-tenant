import { api } from "../api";

export type ClientRisk = "Low" | "Medium" | "High";
export type FeeTier = "Tier 1" | "Tier 2" | "Tier 3";
export type HealthBand = "Healthy" | "Watch" | "At risk";

export interface ClientCommercial {
  _id: string;
  clientUserId: string;
  relationshipManager: string;
  serviceLines: string[];
  riskRating: ClientRisk;
  feeTier: FeeTier;
  slaProfileId: string | null;
  revenueYtd: number;
  costYtd: number;
  currency: string;
  satisfaction: number;
  openTickets: number;
  invoiceDaysAvg: number;
  lastInteraction: string | null;
  notes: string;
  // Server-computed, present once saved — not present on the
  // client-side default() draft used before the first save.
  healthScore?: number;
  healthBand?: HealthBand;
}

export interface UpsertClientCommercialPayload {
  relationshipManager?: string;
  serviceLines?: string[];
  riskRating?: ClientRisk;
  feeTier?: FeeTier;
  slaProfileId?: string;
  revenueYtd?: number;
  costYtd?: number;
  currency?: string;
  satisfaction?: number;
  openTickets?: number;
  invoiceDaysAvg?: number;
  lastInteraction?: string;
  notes?: string;
}

const unwrap = (res: any) => res.data?.data ?? res.data;

export const fetchClientCommercials = async (): Promise<
  Record<string, ClientCommercial>
> => {
  const res = await api.get("/crm/client-commercials");
  const d = unwrap(res);
  return d && typeof d === "object" ? d : {};
};

export const saveClientCommercial = async (
  clientUserId: string,
  dto: UpsertClientCommercialPayload,
): Promise<ClientCommercial> => {
  const res = await api.put(`/crm/client-commercials/${clientUserId}`, dto);
  return unwrap(res);
};

// Client-side mirror of the backend formula — needed for the "as you
// type" margin/health preview in the assignment dialog before
// anything is saved. The backend's copy (services/client-commercial.service.ts)
// is the canonical one used for every already-saved profile; keep
// both in sync if the weighting ever changes.
export function healthScore(c: {
  lastInteraction: string | null;
  invoiceDaysAvg: number;
  openTickets: number;
  satisfaction: number;
  riskRating: ClientRisk;
}): number {
  const activity = c.lastInteraction && c.lastInteraction !== "—" ? 25 : 0;
  const payment = Math.max(
    0,
    Math.min(25, 25 - Math.round((c.invoiceDaysAvg - 30) / 2)),
  );
  const tickets = Math.max(0, 20 - c.openTickets * 4);
  const csat = Math.round((c.satisfaction / 5) * 20);
  const risk = c.riskRating === "Low" ? 10 : c.riskRating === "Medium" ? 6 : 2;
  return activity + payment + tickets + csat + risk;
}

export function healthBand(score: number): HealthBand {
  return score >= 75 ? "Healthy" : score >= 50 ? "Watch" : "At risk";
}

export const healthFactors = (c: {
  lastInteraction: string | null;
  invoiceDaysAvg: number;
  openTickets: number;
  satisfaction: number;
  riskRating: ClientRisk;
}) => [
  {
    l: "Recent activity",
    v: c.lastInteraction && c.lastInteraction !== "—" ? 25 : 0,
    max: 25,
  },
  {
    l: "Payment behaviour",
    v: Math.max(0, Math.min(25, 25 - Math.round((c.invoiceDaysAvg - 30) / 2))),
    max: 25,
  },
  { l: "Ticket load", v: Math.max(0, 20 - c.openTickets * 4), max: 20 },
  { l: "Satisfaction", v: Math.round((c.satisfaction / 5) * 20), max: 20 },
  {
    l: "Risk rating",
    v: c.riskRating === "Low" ? 10 : c.riskRating === "Medium" ? 6 : 2,
    max: 10,
  },
];

export const SERVICE_LINES = [
  "TCSP",
  "Compliance",
  "Advisory",
  "Governance",
  "Tax",
  "Legal",
  "Audit support",
];

export function defaultCommercial(
  clientUserId: string,
  riskLevel?: string,
): UpsertClientCommercialPayload & { clientUserId: string } {
  const risk: ClientRisk =
    riskLevel?.toLowerCase() === "high"
      ? "High"
      : riskLevel?.toLowerCase() === "medium"
        ? "Medium"
        : "Low";
  return {
    clientUserId,
    relationshipManager: "",
    serviceLines: [],
    riskRating: risk,
    feeTier: "Tier 3",
    slaProfileId: "",
    revenueYtd: 0,
    costYtd: 0,
    currency: "USD",
    satisfaction: 0,
    openTickets: 0,
    invoiceDaysAvg: 30,
    lastInteraction: "—",
    notes: "",
  };
}
