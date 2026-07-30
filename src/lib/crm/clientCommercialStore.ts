import { useSyncExternalStore } from "react";

/**
 * Commercial / relationship parameters layered on top of the KYC client
 * records. KYC owns identity, risk screening and onboarding; the CRM owns
 * who manages the relationship, which service lines are sold, the SLA
 * profile that governs response times, and the commercials.
 *
 * Prototype persistence: localStorage. Swap for Cloud tables later.
 */

export type ClientRisk = "Low" | "Medium" | "High";
export type FeeTier = "Tier 1" | "Tier 2" | "Tier 3";

export interface ClientCommercial {
  clientId: string;
  clientName: string;
  relationshipManager: string;
  serviceLines: string[];
  riskRating: ClientRisk;
  feeTier: FeeTier;
  /** SLA profile id from crmClientMockData.slaProfiles */
  slaProfileId: string;
  revenueYtd: number;
  costYtd: number;
  currency: string;
  /** 0–5 CSAT */
  satisfaction: number;
  openTickets: number;
  invoiceDaysAvg: number;
  lastInteraction: string;
  notes: string;
  updatedAt: string;
}

export const RELATIONSHIP_MANAGERS = [
  "A. Whitfield",
  "S. Mbeki",
  "L. Duarte",
  "K. Osei",
  "R. Fitzgerald",
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

const KEY = "lexora.crm.client-commercials.v1";

let state: Record<string, ClientCommercial> = load();
const listeners = new Set<() => void>();

function load(): Record<string, ClientCommercial> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, ClientCommercial>) : {};
  } catch {
    return {};
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore quota errors in prototype */
  }
  listeners.forEach((l) => l());
}

export function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getCommercials(): Record<string, ClientCommercial> {
  return state;
}

export function useClientCommercials(): Record<string, ClientCommercial> {
  return useSyncExternalStore(subscribe, getCommercials, getCommercials);
}

export function defaultCommercial(
  clientId: string,
  clientName: string,
  riskLevel?: string,
): ClientCommercial {
  const risk: ClientRisk =
    riskLevel?.toLowerCase() === "high"
      ? "High"
      : riskLevel?.toLowerCase() === "medium"
        ? "Medium"
        : "Low";
  return {
    clientId,
    clientName,
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
    updatedAt: new Date().toISOString(),
  };
}

export function saveCommercial(record: ClientCommercial) {
  state = {
    ...state,
    [record.clientId]: { ...record, updatedAt: new Date().toISOString() },
  };
  persist();
}

export function clearCommercial(clientId: string) {
  const next = { ...state };
  delete next[clientId];
  state = next;
  persist();
}

/** Clients (id + name) mapped to a given SLA profile. */
export function clientsForSlaProfile(profileId: string): ClientCommercial[] {
  return Object.values(state).filter((c) => c.slaProfileId === profileId);
}

// ── Health scoring ──────────────────────────────────────────

export function healthScore(c: ClientCommercial): number {
  const activity = c.lastInteraction && c.lastInteraction !== "—" ? 25 : 0;
  const payment = Math.max(0, Math.min(25, 25 - Math.round((c.invoiceDaysAvg - 30) / 2)));
  const tickets = Math.max(0, 20 - c.openTickets * 4);
  const csat = Math.round((c.satisfaction / 5) * 20);
  const risk = c.riskRating === "Low" ? 10 : c.riskRating === "Medium" ? 6 : 2;
  return activity + payment + tickets + csat + risk;
}

export function healthBand(score: number) {
  return score >= 75 ? "Healthy" : score >= 50 ? "Watch" : "At risk";
}

export const healthFactors = (c: ClientCommercial) => [
  { l: "Recent activity", v: c.lastInteraction && c.lastInteraction !== "—" ? 25 : 0, max: 25 },
  {
    l: "Payment behaviour",
    v: Math.max(0, Math.min(25, 25 - Math.round((c.invoiceDaysAvg - 30) / 2))),
    max: 25,
  },
  { l: "Ticket load", v: Math.max(0, 20 - c.openTickets * 4), max: 20 },
  { l: "Satisfaction", v: Math.round((c.satisfaction / 5) * 20), max: 20 },
  { l: "Risk rating", v: c.riskRating === "Low" ? 10 : c.riskRating === "Medium" ? 6 : 2, max: 10 },
];
