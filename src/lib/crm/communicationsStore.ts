import { useSyncExternalStore } from "react";
import type { ApiClient } from "@/lib/client/clients-api";

/**
 * CRM Communications store: segments + campaigns built over the tenant's
 * actual client list. Prototype persistence: in-memory + localStorage.
 */

// ── Clients (lightweight shape used for segmentation) ───────

export interface CommClient {
  id: string;
  name: string;
  type: "individual" | "corporate";
  riskLevel: "low" | "medium" | "high" | "unrated";
  status: string;
  serviceLine?: string;
}

export const DUMMY_CLIENTS: CommClient[] = [
  { id: "DC-01", name: "Meridian Holdings Ltd", type: "corporate", riskLevel: "medium", status: "active", serviceLine: "TCSP" },
  { id: "DC-02", name: "Greenfield Capital Partners", type: "corporate", riskLevel: "high", status: "active", serviceLine: "Compliance" },
  { id: "DC-03", name: "Tanaka Enterprises", type: "corporate", riskLevel: "low", status: "active", serviceLine: "Advisory" },
  { id: "DC-04", name: "Helios Renewables", type: "corporate", riskLevel: "medium", status: "pending", serviceLine: "Compliance" },
  { id: "DC-05", name: "Northwind Logistics", type: "corporate", riskLevel: "high", status: "pending", serviceLine: "TCSP" },
  { id: "DC-06", name: "Amara Nsengimana", type: "individual", riskLevel: "low", status: "active", serviceLine: "Governance" },
  { id: "DC-07", name: "Priya Shah", type: "individual", riskLevel: "medium", status: "active", serviceLine: "HR" },
];

export function apiClientToComm(c: ApiClient, name: string): CommClient {
  return {
    id: c._id,
    name,
    type: (c.classifications as CommClient["type"]) || "individual",
    riskLevel: (c.riskLevel as CommClient["riskLevel"]) || "unrated",
    status: c.status || "unknown",
    serviceLine: undefined,
  };
}

// ── Segments ─────────────────────────────────────────────────

export type SegmentRuleField = "type" | "riskLevel" | "status" | "serviceLine";

export interface SegmentRule {
  field: SegmentRuleField;
  value: string;
}

export interface Segment {
  id: string;
  name: string;
  description: string;
  mode: "manual" | "rule";
  memberIds: string[]; // used when mode === "manual"
  rule?: SegmentRule; // used when mode === "rule"
}

export function resolveSegmentMembers(segment: Segment, clients: CommClient[]): CommClient[] {
  if (segment.mode === "manual") {
    const ids = new Set(segment.memberIds);
    return clients.filter((c) => ids.has(c.id));
  }
  if (!segment.rule) return [];
  const { field, value } = segment.rule;
  return clients.filter((c) => (c[field] ?? "").toString().toLowerCase() === value.toLowerCase());
}

export function segmentCriteriaLabel(segment: Segment): string {
  if (segment.mode === "manual") return `Manual selection (${segment.memberIds.length})`;
  if (!segment.rule) return "No rule set";
  const labels: Record<SegmentRuleField, string> = {
    type: "Client type",
    riskLevel: "Risk rating",
    status: "Status",
    serviceLine: "Service line",
  };
  return `${labels[segment.rule.field]} = ${segment.rule.value}`;
}

// ── Campaigns ────────────────────────────────────────────────

export type CampaignType = "Newsletter" | "Event invite";
export type CampaignStatus = "Draft" | "Scheduled" | "Sending" | "Sent";

export interface CampaignEventDetails {
  title: string;
  dateTime: string;
  location: string;
  rsvp: boolean;
}

export interface RecipientDelivery {
  clientId: string;
  clientName: string;
  delivered: boolean;
  opened: boolean;
  clicked: boolean;
  rsvped: boolean;
  unsubscribed: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  segmentId: string;
  segmentName: string;
  subject: string;
  body: string;
  status: CampaignStatus;
  createdAt: string;
  scheduledAt?: string;
  sentAt?: string;
  event?: CampaignEventDetails;
  recipients: RecipientDelivery[];
  metrics?: {
    delivered: number;
    opened: number;
    clicked: number;
    rsvped: number;
    unsubscribed: number;
  };
}

export interface NewsletterDraft {
  id: string;
  title: string;
  generatedAt: string;
  source: string;
  body: string;
  convertedToCampaignId?: string;
}

interface State {
  segments: Segment[];
  campaigns: Campaign[];
  newsletters: NewsletterDraft[];
}

const KEY = "lexora.crm.communications.v1";

function seed(): State {
  return {
    segments: [
      { id: "SEG-01", name: "Tier 1 corporate clients", description: "Larger active corporate relationships", mode: "rule", memberIds: [], rule: { field: "type", value: "corporate" } },
      { id: "SEG-02", name: "High risk clients", description: "Clients flagged high risk for enhanced comms", mode: "rule", memberIds: [], rule: { field: "riskLevel", value: "high" } },
      { id: "SEG-03", name: "Active clients", description: "All clients with active status", mode: "rule", memberIds: [], rule: { field: "status", value: "active" } },
    ],
    campaigns: [],
    newsletters: [
      { id: "NL-01", title: "BNR circular 14/2026 — impact summary", generatedAt: "2026-07-28", source: "GRC regulatory feed", body: "<p>Summary of BNR circular 14/2026 and its impact on regulated entities…</p>" },
      { id: "NL-02", title: "Q2 AML typology bulletin", generatedAt: "2026-07-10", source: "GRC regulatory feed", body: "<p>Emerging AML typologies observed in Q2 2026…</p>" },
    ],
  };
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    /* ignore */
  }
  return seed();
}

let state: State = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore quota errors */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getState() {
  return state;
}

export function useCommunicationsStore(): State {
  return useSyncExternalStore(subscribe, getState, getState);
}

let seq = 100;
const nextId = (prefix: string) => `${prefix}-${String(++seq).padStart(3, "0")}`;

// ── Segment actions ──────────────────────────────────────────

export function createSegment(input: Omit<Segment, "id">): Segment {
  const seg: Segment = { ...input, id: nextId("SEG") };
  state = { ...state, segments: [...state.segments, seg] };
  persist();
  return seg;
}

export function updateSegment(id: string, patch: Partial<Segment>) {
  state = { ...state, segments: state.segments.map((s) => (s.id === id ? { ...s, ...patch } : s)) };
  persist();
}

export function deleteSegment(id: string) {
  state = { ...state, segments: state.segments.filter((s) => s.id !== id) };
  persist();
}

// ── Campaign actions ─────────────────────────────────────────

export function createCampaign(input: {
  name: string;
  type: CampaignType;
  segmentId: string;
  segmentName: string;
  subject: string;
  body: string;
  event?: CampaignEventDetails;
  recipientClients: CommClient[];
}): Campaign {
  const c: Campaign = {
    id: nextId("CMP"),
    name: input.name,
    type: input.type,
    segmentId: input.segmentId,
    segmentName: input.segmentName,
    subject: input.subject,
    body: input.body,
    status: "Draft",
    createdAt: new Date().toISOString(),
    event: input.event,
    recipients: input.recipientClients.map((cl) => ({
      clientId: cl.id,
      clientName: cl.name,
      delivered: false,
      opened: false,
      clicked: false,
      rsvped: false,
      unsubscribed: false,
    })),
  };
  state = { ...state, campaigns: [c, ...state.campaigns] };
  persist();
  return c;
}

export function duplicateCampaign(id: string): Campaign | undefined {
  const src = state.campaigns.find((c) => c.id === id);
  if (!src) return undefined;
  const c: Campaign = {
    ...src,
    id: nextId("CMP"),
    name: `${src.name} (copy)`,
    status: "Draft",
    createdAt: new Date().toISOString(),
    scheduledAt: undefined,
    sentAt: undefined,
    metrics: undefined,
    recipients: src.recipients.map((r) => ({ ...r, delivered: false, opened: false, clicked: false, rsvped: false, unsubscribed: false })),
  };
  state = { ...state, campaigns: [c, ...state.campaigns] };
  persist();
  return c;
}

export function deleteCampaign(id: string) {
  state = { ...state, campaigns: state.campaigns.filter((c) => c.id !== id) };
  persist();
}

export function scheduleCampaign(id: string, when: string) {
  state = {
    ...state,
    campaigns: state.campaigns.map((c) => (c.id === id ? { ...c, status: "Scheduled", scheduledAt: when } : c)),
  };
  persist();
}

function simulateDelivery(c: Campaign): Campaign {
  const recipients = c.recipients.map((r) => {
    const delivered = Math.random() > 0.04;
    const opened = delivered && Math.random() > 0.35;
    const clicked = opened && Math.random() > 0.55;
    const rsvped = c.type === "Event invite" && opened && Math.random() > 0.5;
    const unsubscribed = delivered && Math.random() > 0.92;
    return { ...r, delivered, opened, clicked, rsvped, unsubscribed };
  });
  const metrics = {
    delivered: recipients.filter((r) => r.delivered).length,
    opened: recipients.filter((r) => r.opened).length,
    clicked: recipients.filter((r) => r.clicked).length,
    rsvped: recipients.filter((r) => r.rsvped).length,
    unsubscribed: recipients.filter((r) => r.unsubscribed).length,
  };
  return { ...c, recipients, metrics, status: "Sent", sentAt: new Date().toISOString() };
}

export function sendCampaignNow(id: string, onSent?: (c: Campaign) => void) {
  state = { ...state, campaigns: state.campaigns.map((c) => (c.id === id ? { ...c, status: "Sending" } : c)) };
  persist();
  setTimeout(() => {
    const target = state.campaigns.find((c) => c.id === id);
    if (!target) return;
    const sent = simulateDelivery(target);
    state = { ...state, campaigns: state.campaigns.map((c) => (c.id === id ? sent : c)) };
    persist();
    onSent?.(sent);
  }, 1500);
}

// ── Newsletter actions ───────────────────────────────────────

export function generateNewsletterDraft(): NewsletterDraft {
  const nl: NewsletterDraft = {
    id: nextId("NL"),
    title: "Auto-generated regulatory digest — this week",
    generatedAt: new Date().toISOString().slice(0, 10),
    source: "GRC regulatory feed",
    body: "<p>Draft compiled from the latest GRC regulatory feed entries. Edit before sending.</p>",
  };
  state = { ...state, newsletters: [nl, ...state.newsletters] };
  persist();
  return nl;
}

export function markNewsletterConverted(id: string, campaignId: string) {
  state = {
    ...state,
    newsletters: state.newsletters.map((n) => (n.id === id ? { ...n, convertedToCampaignId: campaignId } : n)),
  };
  persist();
}
