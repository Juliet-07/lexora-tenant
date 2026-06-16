// ────────────────────────────────────────────────────────────
// CRM Mock Data — Pipeline, contacts, contracts, documents,
// resources, e-signing. Used by the CRM module pages.
// ────────────────────────────────────────────────────────────

export interface Contact {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  accountId: string;
  accountName: string;
  isPrimary: boolean;
  tags: string[];
  lastContacted: string;
}

export type LifecycleStage =
  | "Lead"
  | "Prospect"
  | "Active Client"
  | "Retained Client"
  | "Past Client";

export interface Account {
  id: string;
  name: string;
  industry: string;
  size: "SMB" | "Mid-Market" | "Enterprise";
  country: string;
  owner: string;
  arr: number;
  status: "Prospect" | "Customer" | "Churned";
  tier: "Tier 1" | "Tier 2" | "Tier 3";
  /** Where the relationship currently sits in the conversion journey. */
  lifecycle: LifecycleStage;
  /** Original channel that produced the lead. */
  source?: "Referral" | "Web" | "Event" | "Cold Outreach" | "Partner" | "Social Media" | "Direct";
  /** Number of closed-won deals to date. >1 = retained / repeat business. */
  dealsCount: number;
  firstWonDate?: string;
  lastWonDate?: string;
  totalRevenue: number;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  source: "Referral" | "Web" | "Event" | "Cold Outreach" | "Partner";
  score: number; // 0-100
  status: "New" | "Qualified" | "Unqualified" | "Converted";
  owner: string;
  createdAt: string;
}

export interface Opportunity {
  id: string;
  name: string;
  accountId: string;
  accountName: string;
  stage:
    | "Qualification"
    | "Discovery"
    | "Proposal"
    | "Negotiation"
    | "Closed Won"
    | "Closed Lost";
  amount: number;
  probability: number;
  closeDate: string;
  owner: string;
  nextStep: string;
}

export interface Contract {
  id: string;
  title: string;
  clientName: string;
  type: "MSA" | "SOW" | "NDA";
  status: "Draft" | "Sent" | "Signed" | "Expired" | "Awaiting Signature";
  value: number;
  startDate: string;
  endDate: string;
  owner: string;
  signers: { name: string; email: string; signed: boolean; signedAt?: string }[];
}

export interface CrmDocument {
  id: string;
  name: string;
  type: "PDF" | "DOCX" | "XLSX" | "Image";
  folder: string;
  clientName: string;
  uploadedBy: string;
  uploadedAt: string;
  size: string;
  shared: boolean;
  eSignRequired: boolean;
  eSignStatus?: "Pending" | "Signed" | "Declined";
}

export interface ResourceAllocation {
  memberId: string;
  memberName: string;
  role: string;
  utilization: number;
  capacityHours: number;
  allocatedHours: number;
  projects: { projectId: string; projectName: string; hours: number }[];
}

// ──────────────────────────────────────────────────────────── DATA ──

export const accounts: Account[] = [
  { id: "ACC-001", name: "Meridian Holdings Ltd", industry: "Financial Services", size: "Enterprise", country: "United Kingdom", owner: "Sarah Chen", arr: 480000, status: "Customer", tier: "Tier 1" },
  { id: "ACC-002", name: "Apex Ventures Group", industry: "Investment Mgmt", size: "Mid-Market", country: "UAE", owner: "Sarah Chen", arr: 220000, status: "Customer", tier: "Tier 2" },
  { id: "ACC-003", name: "Tanaka Enterprises", industry: "Technology", size: "Enterprise", country: "Japan", owner: "David Park", arr: 360000, status: "Customer", tier: "Tier 1" },
  { id: "ACC-004", name: "Greenfield Capital Partners", industry: "Private Equity", size: "Enterprise", country: "United States", owner: "Michael Torres", arr: 540000, status: "Customer", tier: "Tier 1" },
  { id: "ACC-005", name: "Helios Renewables", industry: "Energy", size: "Mid-Market", country: "Spain", owner: "Sarah Chen", arr: 0, status: "Prospect", tier: "Tier 2" },
  { id: "ACC-006", name: "Northwind Logistics", industry: "Logistics", size: "SMB", country: "Norway", owner: "Michael Torres", arr: 0, status: "Prospect", tier: "Tier 3" },
];

export const contacts: Contact[] = [
  { id: "CON-001", name: "Eleanor Pritchard", title: "CFO", email: "e.pritchard@meridianholdings.com", phone: "+44 20 7946 0958", accountId: "ACC-001", accountName: "Meridian Holdings Ltd", isPrimary: true, tags: ["Decision Maker", "Finance"], lastContacted: "2026-06-10" },
  { id: "CON-002", name: "Hassan Al-Mansoori", title: "Managing Partner", email: "hassan@apexventures.io", phone: "+971 4 555 8842", accountId: "ACC-002", accountName: "Apex Ventures Group", isPrimary: true, tags: ["Decision Maker"], lastContacted: "2026-06-08" },
  { id: "CON-003", name: "Yuki Tanaka", title: "General Counsel", email: "y.tanaka@tanaka-ent.jp", phone: "+81 3 5555 0199", accountId: "ACC-003", accountName: "Tanaka Enterprises", isPrimary: true, tags: ["Legal", "Influencer"], lastContacted: "2026-06-05" },
  { id: "CON-004", name: "Marcus Greenfield", title: "Managing Director", email: "m.greenfield@greenfieldcp.com", phone: "+1 415 555 2200", accountId: "ACC-004", accountName: "Greenfield Capital Partners", isPrimary: true, tags: ["Decision Maker", "Champion"], lastContacted: "2026-06-12" },
  { id: "CON-005", name: "Isabella Ortega", title: "Head of Compliance", email: "i.ortega@helios-renew.es", phone: "+34 91 555 7800", accountId: "ACC-005", accountName: "Helios Renewables", isPrimary: true, tags: ["Evaluator"], lastContacted: "2026-06-11" },
  { id: "CON-006", name: "Lars Henriksen", title: "Operations Director", email: "lars@northwindlog.no", phone: "+47 22 55 33 00", accountId: "ACC-006", accountName: "Northwind Logistics", isPrimary: true, tags: ["Evaluator"], lastContacted: "2026-06-09" },
];

export const leads: Lead[] = [
  { id: "LEAD-001", name: "Isabella Ortega", company: "Helios Renewables", email: "i.ortega@helios-renew.es", source: "Referral", score: 82, status: "Qualified", owner: "Sarah Chen", createdAt: "2026-05-22" },
  { id: "LEAD-002", name: "Lars Henriksen", company: "Northwind Logistics", email: "lars@northwindlog.no", source: "Event", score: 64, status: "Qualified", owner: "Michael Torres", createdAt: "2026-05-30" },
  { id: "LEAD-003", name: "Priya Subramanian", company: "Bluewave Fintech", email: "priya@bluewavefin.in", source: "Web", score: 38, status: "New", owner: "David Park", createdAt: "2026-06-06" },
  { id: "LEAD-004", name: "Tom Whitfield", company: "Whitfield & Sons", email: "tom@whitfield.co.uk", source: "Cold Outreach", score: 21, status: "Unqualified", owner: "Michael Torres", createdAt: "2026-06-02" },
  { id: "LEAD-005", name: "Anika Sørensen", company: "Polar Asset Mgmt", email: "anika@polar-am.dk", source: "Partner", score: 71, status: "Qualified", owner: "Sarah Chen", createdAt: "2026-06-04" },
];

export const opportunities: Opportunity[] = [
  { id: "OPP-001", name: "Helios — Compliance Retainer", accountId: "ACC-005", accountName: "Helios Renewables", stage: "Proposal", amount: 180000, probability: 60, closeDate: "2026-07-30", owner: "Sarah Chen", nextStep: "Send revised SOW" },
  { id: "OPP-002", name: "Northwind — Onboarding Setup", accountId: "ACC-006", accountName: "Northwind Logistics", stage: "Discovery", amount: 45000, probability: 30, closeDate: "2026-08-15", owner: "Michael Torres", nextStep: "Discovery call w/ CFO" },
  { id: "OPP-003", name: "Tanaka — Expansion FY27", accountId: "ACC-003", accountName: "Tanaka Enterprises", stage: "Negotiation", amount: 320000, probability: 80, closeDate: "2026-07-10", owner: "David Park", nextStep: "Final pricing approval" },
  { id: "OPP-004", name: "Greenfield — Restructuring Phase 2", accountId: "ACC-004", accountName: "Greenfield Capital Partners", stage: "Qualification", amount: 260000, probability: 20, closeDate: "2026-09-30", owner: "Michael Torres", nextStep: "Qualify scope" },
  { id: "OPP-005", name: "Apex — Annual Audit Renewal", accountId: "ACC-002", accountName: "Apex Ventures Group", stage: "Closed Won", amount: 95000, probability: 100, closeDate: "2026-06-01", owner: "Sarah Chen", nextStep: "Kickoff scheduled" },
  { id: "OPP-006", name: "Meridian — Tax Advisory Add-on", accountId: "ACC-001", accountName: "Meridian Holdings Ltd", stage: "Closed Lost", amount: 40000, probability: 0, closeDate: "2026-05-15", owner: "Sarah Chen", nextStep: "Re-engage in Q4" },
];

export const contracts: Contract[] = [
  { id: "CTR-001", title: "Meridian — MSA 2026", clientName: "Meridian Holdings Ltd", type: "MSA", status: "Signed", value: 480000, startDate: "2026-01-01", endDate: "2026-12-31", owner: "Sarah Chen", signers: [{ name: "Eleanor Pritchard", email: "e.pritchard@meridianholdings.com", signed: true, signedAt: "2025-12-20" }, { name: "Sarah Chen", email: "s.chen@firm.com", signed: true, signedAt: "2025-12-20" }] },
  { id: "CTR-003", title: "Tanaka — SOW Q3", clientName: "Tanaka Enterprises", type: "SOW", status: "Sent", value: 120000, startDate: "2026-07-01", endDate: "2026-09-30", owner: "David Park", signers: [{ name: "Yuki Tanaka", email: "y.tanaka@tanaka-ent.jp", signed: false }] },
  { id: "CTR-004", title: "Helios — NDA", clientName: "Helios Renewables", type: "NDA", status: "Signed", value: 0, startDate: "2026-05-22", endDate: "2028-05-22", owner: "Sarah Chen", signers: [{ name: "Isabella Ortega", email: "i.ortega@helios-renew.es", signed: true, signedAt: "2026-05-23" }] },
  { id: "CTR-005", title: "Greenfield — SOW Restructuring", clientName: "Greenfield Capital Partners", type: "SOW", status: "Draft", value: 260000, startDate: "2026-08-01", endDate: "2027-02-01", owner: "Michael Torres", signers: [] },
];

export const crmDocuments: CrmDocument[] = [
  { id: "DOC-001", name: "Meridian MSA 2026 (signed).pdf", type: "PDF", folder: "Contracts", clientName: "Meridian Holdings Ltd", uploadedBy: "Sarah Chen", uploadedAt: "2025-12-20", size: "1.4 MB", shared: true, eSignRequired: true, eSignStatus: "Signed" },
  { id: "DOC-002", name: "Apex — Audit Workpapers.xlsx", type: "XLSX", folder: "Client Documents", clientName: "Apex Ventures Group", uploadedBy: "Sarah Chen", uploadedAt: "2026-06-11", size: "1.1 MB", shared: false, eSignRequired: false },
  { id: "DOC-003", name: "Tanaka — FY26 Financials.xlsx", type: "XLSX", folder: "Client Documents", clientName: "Tanaka Enterprises", uploadedBy: "David Park", uploadedAt: "2026-06-08", size: "2.1 MB", shared: false, eSignRequired: false },
  { id: "DOC-004", name: "Helios — Project Plan.pdf", type: "PDF", folder: "Projects", clientName: "Helios Renewables", uploadedBy: "Sarah Chen", uploadedAt: "2026-06-09", size: "880 KB", shared: true, eSignRequired: false },
  { id: "DOC-005", name: "Greenfield — Restructuring Memo.docx", type: "DOCX", folder: "Projects", clientName: "Greenfield Capital Partners", uploadedBy: "Michael Torres", uploadedAt: "2026-06-12", size: "540 KB", shared: false, eSignRequired: false },
  { id: "DOC-006", name: "NDA Template.docx", type: "DOCX", folder: "Templates", clientName: "—", uploadedBy: "Sarah Chen", uploadedAt: "2026-01-10", size: "180 KB", shared: false, eSignRequired: false },
];

export const resourceAllocations: ResourceAllocation[] = [
  { memberId: "TM-001", memberName: "Sarah Chen", role: "Senior Partner", utilization: 88, capacityHours: 160, allocatedHours: 141, projects: [{ projectId: "PRJ-001", projectName: "Annual Audit 2026", hours: 60 }, { projectId: "PRJ-003", projectName: "Due Diligence Review", hours: 45 }, { projectId: "PRJ-005", projectName: "Corporate Restructuring", hours: 36 }] },
  { memberId: "TM-002", memberName: "Michael Torres", role: "Tax Advisor", utilization: 72, capacityHours: 160, allocatedHours: 115, projects: [{ projectId: "PRJ-002", projectName: "Tax Advisory", hours: 50 }, { projectId: "PRJ-005", projectName: "Corporate Restructuring", hours: 65 }] },
  { memberId: "TM-003", memberName: "David Park", role: "Audit Manager", utilization: 65, capacityHours: 160, allocatedHours: 104, projects: [{ projectId: "PRJ-001", projectName: "Annual Audit 2026", hours: 50 }, { projectId: "PRJ-004", projectName: "Regulatory Compliance", hours: 54 }] },
  { memberId: "TM-004", memberName: "Ana Rodriguez", role: "Legal Analyst", utilization: 48, capacityHours: 160, allocatedHours: 77, projects: [{ projectId: "PRJ-003", projectName: "Due Diligence Review", hours: 32 }, { projectId: "PRJ-005", projectName: "Corporate Restructuring", hours: 45 }] },
  { memberId: "TM-005", memberName: "Chris Evans", role: "Junior Associate", utilization: 32, capacityHours: 160, allocatedHours: 51, projects: [{ projectId: "PRJ-002", projectName: "Tax Advisory", hours: 51 }] },
];

export const pipelineStages: Opportunity["stage"][] = [
  "Qualification",
  "Discovery",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
];
