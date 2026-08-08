// ────────────────────────────────────────────────────────────
// CRM section mock data — Section 3 of the CRM & PM spec
// (Contacts, Leads & Pipeline, Clients, Communications, SLA)
// plus Section 8 (Notifications). All dummy data.
// ────────────────────────────────────────────────────────────

export type RelationshipType =
  | "Lead"
  | "Prospect"
  | "Active Client"
  | "Past Client";

export const RELATIONSHIP_TYPES: RelationshipType[] = [
  "Lead",
  "Prospect",
  "Active Client",
  "Past Client",
];

// ── Contacts & organisations ────────────────────────────────

export interface CrmOrganisation {
  id: string;
  name: string;
  industry: string;
  jurisdiction: string;
  size: string;
  riskRating: "Low" | "Medium" | "High";
  kycStatus: "Approved" | "In review" | "Not started" | "Expired";
  relationship: RelationshipType;
  relationshipManager: string;
  serviceLines: string[];
  feeTier: "Tier 1" | "Tier 2" | "Tier 3";
  slaProfile: "Premium" | "Standard" | "Basic";
  revenueYtd: number;
  costYtd: number;
  mandates: number;
  clientSince: string;
  lastInteraction: string;
  satisfaction: number;
  openTickets: number;
  invoiceDaysAvg: number;
}

export const organisations: CrmOrganisation[] = [
  {
    id: "ORG-001",
    name: "Meridian Holdings Ltd",
    industry: "Financial services",
    jurisdiction: "Rwanda",
    size: "250-500",
    riskRating: "Medium",
    kycStatus: "Approved",
    relationship: "Active Client",
    relationshipManager: "Sarah Chen",
    serviceLines: ["TCSP", "Compliance", "Governance"],
    feeTier: "Tier 1",
    slaProfile: "Premium",
    revenueYtd: 412000,
    costYtd: 233000,
    mandates: 3,
    clientSince: "2022-04-11",
    lastInteraction: "2026-07-29",
    satisfaction: 4.6,
    openTickets: 2,
    invoiceDaysAvg: 27,
  },
  {
    id: "ORG-002",
    name: "Greenfield Capital Partners",
    industry: "Private equity",
    jurisdiction: "Kenya",
    size: "50-250",
    riskRating: "High",
    kycStatus: "Approved",
    relationship: "Active Client",
    relationshipManager: "Michael Torres",
    serviceLines: ["Governance", "Compliance"],
    feeTier: "Tier 1",
    slaProfile: "Premium",
    revenueYtd: 288000,
    costYtd: 191000,
    mandates: 2,
    clientSince: "2023-01-30",
    lastInteraction: "2026-07-27",
    satisfaction: 3.4,
    openTickets: 4,
    invoiceDaysAvg: 61,
  },
  {
    id: "ORG-003",
    name: "Tanaka Enterprises",
    industry: "Manufacturing",
    jurisdiction: "Tanzania",
    size: "500+",
    riskRating: "Low",
    kycStatus: "Approved",
    relationship: "Active Client",
    relationshipManager: "David Park",
    serviceLines: ["Advisory", "HR"],
    feeTier: "Tier 2",
    slaProfile: "Standard",
    revenueYtd: 154000,
    costYtd: 88000,
    mandates: 1,
    clientSince: "2025-06-02",
    lastInteraction: "2026-07-30",
    satisfaction: 4.9,
    openTickets: 0,
    invoiceDaysAvg: 18,
  },
  {
    id: "ORG-004",
    name: "Helios Renewables",
    industry: "Energy",
    jurisdiction: "Rwanda",
    size: "50-250",
    riskRating: "Medium",
    kycStatus: "In review",
    relationship: "Active Client",
    relationshipManager: "Sarah Chen",
    serviceLines: ["Compliance"],
    feeTier: "Tier 2",
    slaProfile: "Standard",
    revenueYtd: 96000,
    costYtd: 61000,
    mandates: 1,
    clientSince: "2024-11-19",
    lastInteraction: "2026-07-22",
    satisfaction: 4.1,
    openTickets: 1,
    invoiceDaysAvg: 34,
  },
  {
    id: "ORG-005",
    name: "Northwind Logistics",
    industry: "Transport & logistics",
    jurisdiction: "Uganda",
    size: "50-250",
    riskRating: "High",
    kycStatus: "Not started",
    relationship: "Prospect",
    relationshipManager: "Michael Torres",
    serviceLines: ["TCSP"],
    feeTier: "Tier 3",
    slaProfile: "Basic",
    revenueYtd: 0,
    costYtd: 0,
    mandates: 0,
    clientSince: "—",
    lastInteraction: "2026-07-30",
    satisfaction: 0,
    openTickets: 0,
    invoiceDaysAvg: 0,
  },
  {
    id: "ORG-006",
    name: "Apex Industries",
    industry: "Construction",
    jurisdiction: "Rwanda",
    size: "250-500",
    riskRating: "Low",
    kycStatus: "Expired",
    relationship: "Past Client",
    relationshipManager: "David Park",
    serviceLines: ["Audit"],
    feeTier: "Tier 3",
    slaProfile: "Basic",
    revenueYtd: 42000,
    costYtd: 31000,
    mandates: 0,
    clientSince: "2021-02-08",
    lastInteraction: "2026-03-14",
    satisfaction: 3.8,
    openTickets: 0,
    invoiceDaysAvg: 45,
  },
];

export interface CrmContact {
  id: string;
  name: string;
  title: string;
  orgId: string;
  orgName: string;
  email: string;
  phone: string;
  source: "Referral" | "Event" | "Web form" | "Cold outreach" | "Partner";
  tags: string[];
  notes?: string;
  lastContact: string;
}

export const contacts: CrmContact[] = [
  { id: "CT-001", name: "Amara Nsengimana", title: "Chief Executive Officer", orgId: "ORG-001", orgName: "Meridian Holdings Ltd", email: "amara@meridian.rw", phone: "+250 788 100 221", source: "Referral", tags: ["Decision maker", "Board"], lastContact: "2026-07-29" },
  { id: "CT-002", name: "Jean-Luc Habimana", title: "Group CFO", orgId: "ORG-001", orgName: "Meridian Holdings Ltd", email: "jl.habimana@meridian.rw", phone: "+250 788 100 244", source: "Referral", tags: ["Billing"], lastContact: "2026-07-24" },
  { id: "CT-003", name: "Priya Shah", title: "Managing Partner", orgId: "ORG-002", orgName: "Greenfield Capital Partners", email: "priya@greenfieldcap.co.ke", phone: "+254 711 553 900", source: "Event", tags: ["Decision maker"], lastContact: "2026-07-27" },
  { id: "CT-004", name: "Kenji Tanaka", title: "Chairman", orgId: "ORG-003", orgName: "Tanaka Enterprises", email: "k.tanaka@tanaka.co.tz", phone: "+255 764 220 118", source: "Partner", tags: ["Board"], lastContact: "2026-07-30" },
  { id: "CT-005", name: "Ines Uwase", title: "Head of Compliance", orgId: "ORG-004", orgName: "Helios Renewables", email: "ines@heliosrenew.rw", phone: "+250 782 445 019", source: "Web form", tags: ["Operational"], lastContact: "2026-07-22" },
  { id: "CT-006", name: "Robert Okello", title: "Operations Director", orgId: "ORG-005", orgName: "Northwind Logistics", email: "r.okello@northwind.ug", phone: "+256 772 880 341", source: "Cold outreach", tags: ["Prospect"], lastContact: "2026-07-30" },
  { id: "CT-008", name: "Grace Mutoni", title: "Former FD", orgId: "ORG-006", orgName: "Apex Industries", email: "g.mutoni@apex.rw", phone: "+250 788 663 018", source: "Referral", tags: ["Dormant"], lastContact: "2026-03-14" },
];



// ── Leads & opportunity pipeline ────────────────────────────

export type OppStage =
  | "Discovery"
  | "Qualification"
  | "Proposal"
  | "Negotiation"
  | "Closed Won"
  | "Closed Lost";

export const OPP_STAGES: OppStage[] = [
  "Discovery",
  "Qualification",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
];

export const STAGE_PROBABILITY: Record<OppStage, number> = {
  Discovery: 10,
  Qualification: 30,
  Proposal: 55,
  Negotiation: 75,
  "Closed Won": 100,
  "Closed Lost": 0,
};

export interface Bant {
  budget: number;
  authority: number;
  need: number;
  timeline: number;
}

export interface Opportunity {
  id: string;
  name: string;
  orgName: string;
  contactName: string;
  relationship: RelationshipType;
  serviceLine: string;
  stage: OppStage;
  value: number;
  currency: string;
  owner: string;
  source: "Referral" | "Event" | "Web form" | "Cold outreach" | "Partner";
  createdAt: string;
  expectedClose: string;
  bant: Bant;
  competitor?: string;
  lostReason?: string;
  stageEnteredAt: string;
  notes: string;
}

export const opportunities: Opportunity[] = [
  { id: "OPP-001", name: "Northwind — TCSP administration", orgName: "Northwind Logistics", contactName: "Robert Okello", relationship: "Prospect", serviceLine: "TCSP", stage: "Qualification", value: 84000, currency: "USD", owner: "Michael Torres", source: "Cold outreach", createdAt: "2026-06-18", expectedClose: "2026-09-15", bant: { budget: 18, authority: 22, need: 24, timeline: 14 }, competitor: "Baseline Corporate Services", stageEnteredAt: "2026-07-08", notes: "Needs entity administration across UG and RW." },
  { id: "OPP-002", name: "Meridian — Governance review 2027", orgName: "Meridian Holdings Ltd", contactName: "Amara Nsengimana", relationship: "Active Client", serviceLine: "Governance", stage: "Proposal", value: 145000, currency: "USD", owner: "Sarah Chen", source: "Referral", createdAt: "2026-05-30", expectedClose: "2026-08-29", bant: { budget: 24, authority: 25, need: 21, timeline: 18 }, stageEnteredAt: "2026-07-16", notes: "Board requested independent effectiveness review." },
  { id: "OPP-003", name: "Sable & Co — AML programme build", orgName: "Sable & Co", contactName: "Nadia Bello", relationship: "Lead", serviceLine: "Compliance", stage: "Discovery", value: 62000, currency: "EUR", owner: "Ana Rodriguez", source: "Event", createdAt: "2026-07-21", expectedClose: "2026-11-01", bant: { budget: 10, authority: 12, need: 20, timeline: 8 }, stageEnteredAt: "2026-07-21", notes: "Met at Kigali compliance summit." },
  { id: "OPP-004", name: "Greenfield — HR advisory retainer", orgName: "Greenfield Capital Partners", contactName: "Priya Shah", relationship: "Active Client", serviceLine: "HR", stage: "Negotiation", value: 96000, currency: "USD", owner: "Michael Torres", source: "Partner", createdAt: "2026-04-12", expectedClose: "2026-08-12", bant: { budget: 22, authority: 24, need: 19, timeline: 22 }, competitor: "In-house build", stageEnteredAt: "2026-07-19", notes: "Fee tier and notice period under discussion." },
  { id: "OPP-005", name: "Tanaka — FY27 expansion advisory", orgName: "Tanaka Enterprises", contactName: "Kenji Tanaka", relationship: "Active Client", serviceLine: "Advisory", stage: "Closed Won", value: 180000, currency: "USD", owner: "David Park", source: "Referral", createdAt: "2026-03-02", expectedClose: "2026-06-20", bant: { budget: 25, authority: 25, need: 25, timeline: 23 }, stageEnteredAt: "2026-06-20", notes: "Engagement letter signed, mandate MND-003 created." },
  { id: "OPP-006", name: "Kivu Agritech — Board secretarial", orgName: "Kivu Agritech", contactName: "Eric Bizimana", relationship: "Lead", serviceLine: "Governance", stage: "Closed Lost", value: 48000, currency: "USD", owner: "Ana Rodriguez", source: "Web form", createdAt: "2026-02-14", expectedClose: "2026-05-30", bant: { budget: 8, authority: 10, need: 16, timeline: 9 }, lostReason: "Price — appointed lower-cost provider", stageEnteredAt: "2026-05-30", notes: "Revisit at renewal in 2027." },
  { id: "OPP-007", name: "Helios — Compliance retainer uplift", orgName: "Helios Renewables", contactName: "Ines Uwase", relationship: "Active Client", serviceLine: "Compliance", stage: "Discovery", value: 38000, currency: "EUR", owner: "Sarah Chen", source: "Referral", createdAt: "2026-07-09", expectedClose: "2026-10-10", bant: { budget: 14, authority: 15, need: 18, timeline: 11 }, stageEnteredAt: "2026-07-09", notes: "Scope expansion following regulatory change." },
];

export const leadScore = (b: Bant) => b.budget + b.authority + b.need + b.timeline;

export const weightedValue = (o: Opportunity) =>
  Math.round((o.value * STAGE_PROBABILITY[o.stage]) / 100);

export const sourceEffectiveness = [
  { source: "Referral", leads: 34, won: 14, revenue: 512000 },
  { source: "Event", leads: 41, won: 9, revenue: 268000 },
  { source: "Web form", leads: 58, won: 7, revenue: 141000 },
  { source: "Partner", leads: 19, won: 8, revenue: 305000 },
  { source: "Cold outreach", leads: 72, won: 5, revenue: 96000 },
];

export const funnelStats = [
  { stage: "Discovery", count: 24, value: 980000, avgDays: 11 },
  { stage: "Qualification", count: 17, value: 742000, avgDays: 14 },
  { stage: "Proposal", count: 11, value: 588000, avgDays: 19 },
  { stage: "Negotiation", count: 6, value: 402000, avgDays: 22 },
  { stage: "Closed Won", count: 4, value: 311000, avgDays: 0 },
];

// ── Engagements ─────────────────────────────────────────────

export type EngagementStatus =
  | "Proposed"
  | "Active"
  | "On hold"
  | "Completed"
  | "Terminated";

export interface Engagement {
  id: string;
  title: string;
  orgName: string;
  template: string;
  feeStructure: "Hourly" | "Fixed" | "Retainer" | "Milestone" | "Hybrid";
  value: number;
  currency: string;
  status: EngagementStatus;
  signedAt?: string;
  signedBy?: string;
  certificateRef?: string;
  team: string[];
  scope: string;
  mandateRef?: string;
}

export const engagements: Engagement[] = [
  { id: "ENG-2026-01", title: "Meridian — TCSP administration 2026", orgName: "Meridian Holdings Ltd", template: "TCSP engagement letter", feeStructure: "Retainer", value: 240000, currency: "USD", status: "Active", signedAt: "2026-01-14", signedBy: "Amara Nsengimana", certificateRef: "SC-88213", team: ["Sarah Chen", "David Park"], scope: "Company secretarial, registered office, statutory filings for 4 entities.", mandateRef: "MND-001" },
  { id: "ENG-2026-02", title: "Tanaka — FY27 expansion advisory", orgName: "Tanaka Enterprises", template: "Advisory engagement letter", feeStructure: "Milestone", value: 180000, currency: "USD", status: "Active", signedAt: "2026-06-20", signedBy: "Kenji Tanaka", certificateRef: "SC-90114", team: ["David Park", "Chris Evans"], scope: "Market entry advisory across three East African jurisdictions.", mandateRef: "MND-003" },
  { id: "ENG-2026-03", title: "Greenfield — HR advisory retainer", orgName: "Greenfield Capital Partners", template: "HR advisory engagement letter", feeStructure: "Retainer", value: 96000, currency: "USD", status: "Proposed", team: ["Michael Torres"], scope: "Monthly HR advisory, policy refresh, and disciplinary support." },
  { id: "ENG-2025-09", title: "Apex — Statutory audit 2025", orgName: "Apex Industries", template: "Audit engagement letter", feeStructure: "Fixed", value: 88000, currency: "USD", status: "Completed", signedAt: "2025-03-04", signedBy: "Grace Mutoni", certificateRef: "SC-71904", team: ["David Park"], scope: "FY2025 statutory audit and management letter.", mandateRef: "MND-005" },
  { id: "ENG-2026-04", title: "Helios — Compliance retainer", orgName: "Helios Renewables", template: "Compliance engagement letter", feeStructure: "Hybrid", value: 72000, currency: "EUR", status: "On hold", signedAt: "2025-11-19", signedBy: "Ines Uwase", certificateRef: "SC-83320", team: ["Sarah Chen", "Ana Rodriguez"], scope: "Monthly compliance filings and AML programme maintenance.", mandateRef: "MND-004" },
];

export const engagementTemplates = [
  "TCSP engagement letter",
  "Advisory engagement letter",
  "Compliance engagement letter",
  "Governance engagement letter",
  "HR advisory engagement letter",
  "Special project engagement letter",
];

// ── Client health ───────────────────────────────────────────

export const healthScore = (o: CrmOrganisation) => {
  const activity = o.lastInteraction === "—" ? 0 : 25;
  const payment = Math.max(0, 25 - Math.round((o.invoiceDaysAvg - 30) / 2));
  const tickets = Math.max(0, 20 - o.openTickets * 4);
  const satisfaction = Math.round((o.satisfaction / 5) * 20);
  const risk = o.riskRating === "Low" ? 10 : o.riskRating === "Medium" ? 6 : 2;
  return Math.max(
    0,
    Math.min(100, activity + Math.min(25, payment) + tickets + satisfaction + risk),
  );
};

export const healthBand = (score: number) =>
  score >= 75 ? "Healthy" : score >= 50 ? "Watch" : "At risk";

// ── Communications ──────────────────────────────────────────

export interface Campaign {
  id: string;
  name: string;
  channel: "Email" | "Newsletter" | "WhatsApp" | "Drip";
  segment: string;
  status: "Draft" | "Scheduled" | "Sent" | "Running";
  recipients: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  sentAt?: string;
  steps?: { day: number; subject: string }[];
}

export const campaigns: Campaign[] = [
  { id: "CMP-01", name: "Q3 regulatory update — BNR circulars", channel: "Newsletter", segment: "All active clients · Financial services", status: "Sent", recipients: 184, opened: 121, clicked: 47, unsubscribed: 2, sentAt: "2026-07-14" },
  { id: "CMP-02", name: "Governance breakfast invitation", channel: "Email", segment: "Tier 1 · Board contacts", status: "Sent", recipients: 62, opened: 44, clicked: 21, unsubscribed: 0, sentAt: "2026-07-02" },
  { id: "CMP-03", name: "New client onboarding sequence", channel: "Drip", segment: "Clients onboarded < 30 days", status: "Running", recipients: 11, opened: 9, clicked: 6, unsubscribed: 0, steps: [{ day: 0, subject: "Welcome to Lexora" }, { day: 3, subject: "Meet your engagement team" }, { day: 10, subject: "Using the client portal" }, { day: 21, subject: "Your first month check-in" }] },
  { id: "CMP-04", name: "Filing deadline reminder", channel: "WhatsApp", segment: "Compliance retainer clients", status: "Scheduled", recipients: 38, opened: 0, clicked: 0, unsubscribed: 0 },
  { id: "CMP-05", name: "Thought leadership — ESG in East Africa", channel: "Newsletter", segment: "All contacts with consent", status: "Draft", recipients: 0, opened: 0, clicked: 0, unsubscribed: 0 },
];

export const segments = [
  { id: "SEG-01", name: "Tier 1 clients", criteria: "Fee tier = Tier 1", size: 2 },
  { id: "SEG-02", name: "Financial services", criteria: "Industry = Financial services", size: 1 },
  { id: "SEG-03", name: "High risk", criteria: "Risk rating = High", size: 2 },
  { id: "SEG-04", name: "Rwanda entities", criteria: "Jurisdiction = Rwanda", size: 3 },
  { id: "SEG-05", name: "Compliance retainer", criteria: "Service line includes Compliance", size: 3 },
];

// ── SLA management ──────────────────────────────────────────

export interface SlaProfile {
  id: string;
  tier: "Premium" | "Standard" | "Basic";
  serviceType: string;
  responseHrs: Record<"Critical" | "High" | "Medium" | "Low", number>;
  resolutionHrs: Record<"Critical" | "High" | "Medium" | "Low", number>;
  clients: string[];
  escalations: string;
}

export const slaProfiles: SlaProfile[] = [
  {
    id: "SLA-PRM",
    tier: "Premium",
    serviceType: "TCSP & Governance",
    responseHrs: { Critical: 1, High: 2, Medium: 8, Low: 24 },
    resolutionHrs: { Critical: 8, High: 24, Medium: 72, Low: 120 },
    clients: ["Meridian Holdings Ltd", "Greenfield Capital Partners"],
    escalations: "75% → team lead · 90% → client manager · 100% → partner",
  },
  {
    id: "SLA-STD",
    tier: "Standard",
    serviceType: "Compliance & Advisory",
    responseHrs: { Critical: 2, High: 4, Medium: 16, Low: 48 },
    resolutionHrs: { Critical: 16, High: 48, Medium: 120, Low: 240 },
    clients: ["Tanaka Enterprises", "Helios Renewables"],
    escalations: "90% → team lead · 100% → client manager",
  },
  {
    id: "SLA-BSC",
    tier: "Basic",
    serviceType: "Ad hoc",
    responseHrs: { Critical: 4, High: 8, Medium: 24, Low: 72 },
    resolutionHrs: { Critical: 24, High: 72, Medium: 240, Low: 480 },
    clients: ["Northwind Logistics", "Apex Industries"],
    escalations: "100% → team lead",
  },
];

export const slaCompliance = [
  { scope: "Meridian Holdings Ltd", type: "Client", target: 95, actual: 97, tickets: 42, breaches: 1 },
  { scope: "Greenfield Capital Partners", type: "Client", target: 95, actual: 88, tickets: 31, breaches: 4 },
  { scope: "Tanaka Enterprises", type: "Client", target: 90, actual: 100, tickets: 12, breaches: 0 },
  { scope: "Compliance", type: "Service", target: 90, actual: 93, tickets: 58, breaches: 4 },
  { scope: "TCSP", type: "Service", target: 95, actual: 91, tickets: 44, breaches: 4 },
  { scope: "Ana Rodriguez", type: "Agent", target: 90, actual: 96, tickets: 27, breaches: 1 },
  { scope: "Chris Evans", type: "Agent", target: 90, actual: 84, tickets: 22, breaches: 4 },
];

export const slaTrend = [
  { month: "Feb", pct: 89 },
  { month: "Mar", pct: 91 },
  { month: "Apr", pct: 88 },
  { month: "May", pct: 93 },
  { month: "Jun", pct: 94 },
  { month: "Jul", pct: 92 },
];

// ── Notifications (Section 8) ───────────────────────────────

export type NotificationCategory =
  | "Assignment"
  | "@Mention"
  | "Approval request"
  | "Approval outcome"
  | "Deadline approaching"
  | "Deadline breached"
  | "Status change"
  | "Escalation"
  | "Client activity"
  | "System alert"
  | "Watcher update";

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  at: string;
  read: boolean;
  actionable: boolean;
  actions?: string[];
  link: string;
  source: string;
  channels: string[];
}

export const notifications: AppNotification[] = [
  { id: "NT-01", category: "Approval request", title: "Timesheet awaiting your approval", body: "Chris Evans submitted 38.5h for week ending 26 Jul.", at: "2026-07-30 08:12", read: false, actionable: true, actions: ["Approve", "Reject"], link: "/crm/timesheets", source: "Timesheets", channels: ["In-app", "Email"] },
  { id: "NT-02", category: "@Mention", title: "Sarah Chen mentioned you", body: "@you can you confirm the receivables sample size before Friday?", at: "2026-07-30 07:45", read: false, actionable: true, actions: ["Reply"], link: "/crm/tasks", source: "TSK-003", channels: ["In-app", "Email"] },
  { id: "NT-03", category: "Escalation", title: "Invoice overdue 60 days — escalated", body: "INV-2026-039 (Greenfield) is 61 days overdue and has been escalated to partner.", at: "2026-07-30 06:00", read: false, actionable: true, actions: ["Acknowledge"], link: "/crm/invoicing", source: "Finance", channels: ["In-app", "Email"] },
  { id: "NT-04", category: "Deadline breached", title: "SLA breached on TCK-103", body: "Resolution target passed for Greenfield ticket TCK-103.", at: "2026-07-29 19:20", read: false, actionable: false, link: "/crm/service-desk", source: "Service Desk", channels: ["In-app", "Email", "SMS"] },
  { id: "NT-05", category: "Approval request", title: "Trust drawdown authorisation", body: "Drawdown of USD 18,000 from Meridian trust against INV-2026-041.", at: "2026-07-29 15:02", read: false, actionable: true, actions: ["Approve", "Reject"], link: "/crm/trust", source: "Trust Accounting", channels: ["In-app", "Email"] },
  { id: "NT-06", category: "Client activity", title: "Client viewed invoice", body: "Tanaka Enterprises opened INV-2026-044 in the portal.", at: "2026-07-29 11:31", read: true, actionable: false, link: "/crm/invoicing", source: "Client portal", channels: ["In-app"] },
  { id: "NT-07", category: "Assignment", title: "You were assigned to a mandate", body: "Added to the delivery team on MND-002 Corporate Restructuring Phase 2.", at: "2026-07-28 16:10", read: true, actionable: false, link: "/crm/mandates", source: "Mandates", channels: ["In-app", "Email"] },
  { id: "NT-08", category: "Deadline approaching", title: "Contract renewal in 60 days", body: "Meridian MSA renewal notice window opens 02 Oct 2026.", at: "2026-07-28 09:00", read: true, actionable: false, link: "/crm/contracts", source: "Contracts", channels: ["In-app", "Email"] },
  { id: "NT-09", category: "System alert", title: "KYC screening alert", body: "Adverse media hit on a Northwind Logistics director (Module 1).", at: "2026-07-27 13:44", read: true, actionable: false, link: "/aml/compliance", source: "AML/KYC", channels: ["In-app", "Email"] },
  { id: "NT-10", category: "Status change", title: "Mandate status changed", body: "MND-004 moved from Deliver to Review.", at: "2026-07-27 10:02", read: true, actionable: false, link: "/crm/mandates", source: "Mandates", channels: ["In-app"] },
  { id: "NT-11", category: "Watcher update", title: "Update on a mandate you watch", body: "New comment on MND-001 by David Park.", at: "2026-07-26 17:55", read: true, actionable: false, link: "/crm/mandates", source: "Mandates", channels: ["In-app"] },
  { id: "NT-12", category: "Approval outcome", title: "Invoice approved", body: "INV-2026-042 approved by Sarah Chen and queued for delivery.", at: "2026-07-26 12:20", read: true, actionable: false, link: "/crm/invoicing", source: "Finance", channels: ["In-app", "Email"] },
];

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  "Assignment",
  "@Mention",
  "Approval request",
  "Approval outcome",
  "Deadline approaching",
  "Deadline breached",
  "Status change",
  "Escalation",
  "Client activity",
  "System alert",
  "Watcher update",
];

export const defaultNotificationPrefs: Record<
  string,
  { inApp: boolean; email: boolean; sms: boolean; push: boolean; whatsapp: boolean; frequency: string; locked?: boolean }
> = {
  Assignment: { inApp: true, email: true, sms: false, push: true, whatsapp: false, frequency: "Immediate" },
  "@Mention": { inApp: true, email: true, sms: false, push: true, whatsapp: false, frequency: "Immediate" },
  "Approval request": { inApp: true, email: true, sms: false, push: true, whatsapp: false, frequency: "Immediate" },
  "Approval outcome": { inApp: true, email: true, sms: false, push: false, whatsapp: false, frequency: "Daily digest" },
  "Deadline approaching": { inApp: true, email: true, sms: false, push: true, whatsapp: false, frequency: "Immediate" },
  "Deadline breached": { inApp: true, email: true, sms: true, push: true, whatsapp: false, frequency: "Immediate", locked: true },
  "Status change": { inApp: true, email: false, sms: false, push: false, whatsapp: false, frequency: "Daily digest" },
  Escalation: { inApp: true, email: true, sms: true, push: true, whatsapp: false, frequency: "Immediate", locked: true },
  "Client activity": { inApp: true, email: false, sms: false, push: false, whatsapp: false, frequency: "Hourly digest" },
  "System alert": { inApp: true, email: true, sms: false, push: false, whatsapp: false, frequency: "Immediate", locked: true },
  "Watcher update": { inApp: true, email: false, sms: false, push: false, whatsapp: false, frequency: "Daily digest" },
};

export const watchedItems = [
  { id: "MND-001", type: "Mandate", name: "Annual Statutory Audit 2026", reason: "Team member (auto)", updates: 6 },
  { id: "TSK-004", type: "Task", name: "Draft restructuring step plan", reason: "@mentioned", updates: 3 },
  { id: "TCK-103", type: "Ticket", name: "Greenfield — portal access issue", reason: "Manual watch", updates: 9 },
];
