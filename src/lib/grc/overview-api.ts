import { api } from "../api";

// ─────────────────────────────────────────────────────────────
// Real API client for the top-level GRC Overview and Reporting
// pages. Backed by GET /grc/overview, which aggregates real data
// from every submodule except ESG (which already has its own API —
// see esg-api.ts). Field names below are verified against the real
// Mongoose schemas, not carried over from the old mock's naming.
// ─────────────────────────────────────────────────────────────

// ── Governance ───────────────────────────────────────────────
export interface BoardMember {
  _id: string;
  name: string;
  role: string;
  email: string;
  appointedAt: string;
  termEnds: string;
  bio: string;
  conflicts: { note: string; disclosedAt: string }[];
  training: { title: string; completedAt: string }[];
  skills: { name: string; category: string; level: string }[];
  isActive: boolean;
}
export interface Committee {
  _id: string;
  name: string;
  purpose: string;
  members: { name: string; email: string; role: string }[];
  tasks: { title: string; owner: string; dueDate: string; status: string }[];
}
export interface GovernanceMeeting {
  _id: string;
  title: string;
  type: string;
  date: string;
  mode: string;
  location: string;
  chair: string;
  status: string;
  attendees: { name: string; email: string; role: string }[];
}
export interface GovernanceCode {
  _id: string;
  title: string;
  category: string;
  version: number;
  status: string;
}
export interface Resolution {
  _id: string;
  reference: string;
  type: string;
  subject: string;
  effectiveDate: string;
  status: string;
  outcome: string | null;
}
export interface GovernanceData {
  boardMembers: BoardMember[];
  committees: Committee[];
  meetings: GovernanceMeeting[];
  codes: GovernanceCode[];
  resolutions: Resolution[];
}

// ── Risk ─────────────────────────────────────────────────────
export interface Risk {
  _id: string;
  title: string;
  category: string;
  owner: string;
  likelihood: number;
  impact: number;
  financialExposure: number;
  status: string;
  nextReviewDate: string;
  inherentScore: number;
  residualScore: number;
  inherentBand: "Extreme" | "High" | "Medium" | "Low";
  residualBand: "Extreme" | "High" | "Medium" | "Low";
  zone: "Green" | "Amber" | "Red";
}
export interface AppetiteEntry {
  category: string;
  maxLossPerEvent: number;
  amberThresholdPct: number;
  statement?: string;
}
export interface Control {
  _id: string;
  code: string;
  name: string;
  type: string;
  owner: string;
  frequency: string;
}
export interface Deficiency {
  _id: string;
  reference: string;
  title: string;
  origin: string;
  category: string;
  severity: string;
  owner: string;
  deadline: string;
  status: string;
}
export interface ControlTest {
  _id: string;
  controlCode: string;
  controlName: string;
  riskRating: string;
  frequency: string;
  dueDate: string;
  tester: string;
  status: string;
  conclusion: string | null;
}
export interface TreatmentPlan {
  _id: string;
  riskId: string;
  strategy: string;
  actions: string;
  owner: string;
  timeline: string;
  approvalStatus: string;
}
export interface EmergingRisk {
  _id: string;
  title: string;
  category: string;
  source: string;
  impact: number;
  velocity: string;
  watchList: string;
  owner: string;
  status: string;
}
export interface RiskData {
  risks: Risk[];
  appetite: AppetiteEntry[];
  controls: Control[];
  deficiencies: Deficiency[];
  controlTests: ControlTest[];
  treatmentPlans: TreatmentPlan[];
  emergingRisks: EmergingRisk[];
}

// ── Operations ───────────────────────────────────────────────
export interface Incident {
  _id: string;
  title: string;
  category: string;
  severity: string;
  reportedAt: string;
  owner: string;
  status: string;
}
export interface AuditFinding {
  observation: string;
  severity: string;
  status: string;
  remediationDueDate: string | null;
}
export interface AuditEngagement {
  _id: string;
  name: string;
  type: string;
  scope: string;
  startDate: string;
  endDate: string;
  status: string;
  findings: AuditFinding[];
}
export interface OperationsData {
  incidents: Incident[];
  audits: AuditEngagement[];
}

// ── Third-party & BCP ────────────────────────────────────────
export interface Vendor {
  _id: string;
  name: string;
  category: string;
  riskRating: "Low" | "Medium" | "High" | "Extreme";
  status: "Active" | "Terminated";
  nextReviewDate: string;
}
export interface BcpPlan {
  _id: string;
  title: string;
  version: number;
}
export interface BcpTest {
  _id: string;
  testedAt: string;
  outcome: string;
  notes: string;
}
export interface RtoRpo {
  _id: string;
  system: string;
  rtoHours: number;
  rpoHours: number;
  criticality: string;
}
export interface CrisisContact {
  _id: string;
  name: string;
  role: string;
  phone: string;
  escalationOrder: number;
}
export interface ThirdPartyBcpData {
  vendors: Vendor[];
  bcpPlans: BcpPlan[];
  bcpTests: BcpTest[];
  rtoRpo: RtoRpo[];
  crisisContacts: CrisisContact[];
}

// ── Compliance ───────────────────────────────────────────────
export interface Obligation {
  _id: string;
  reference: string;
  title: string;
  regulator: string;
  entity: string;
  frequency: string;
  nextDueDate: string;
  owner: string;
  status: "Compliant" | "Due" | "Overdue" | "Not Applicable";
}
export interface Filing {
  _id: string;
  obligationId: string;
  periodLabel: string;
  dueDate: string;
  stage: string;
  certifiedBy: string | null;
  submittedAt: string | null;
  receiptRef: string | null;
}
export interface Certification {
  _id: string;
  name: string;
  issuingBody: string;
  certificateNumber: string;
  issueDate: string;
  expiryDate: string;
  responsiblePerson: string;
  renewalStage: string;
}
export interface Policy {
  _id: string;
  title: string;
  category: string;
  type: string;
  acknowledgments: { name: string; email: string; ackedAt: string }[];
}
export interface RegulatoryChange {
  _id: string;
  title: string;
  regulator: string;
  publishedAt: string;
  urgency: string;
  assessmentOwner: string;
  assessmentDeadline: string | null;
  assessmentStatus: string;
}
export interface ComplianceData {
  obligations: Obligation[];
  filings: Filing[];
  certifications: Certification[];
  policies: Policy[];
  regulatoryChanges: RegulatoryChange[];
}

// ── Deals ────────────────────────────────────────────────────
export interface DDItem {
  workstream: string;
  item: string;
  owner: string;
  status: "Not Started" | "In Progress" | "Complete" | "Red Flag";
}
export interface CP {
  type: string;
  description: string;
  responsible: string;
  deadline: string;
  status: "Satisfied" | "Pending" | "At Risk" | "Not Yet Due";
}
export interface Deal {
  _id: string;
  name: string;
  client: string;
  counterparty: string;
  type: string;
  stage: string;
  status: "Active" | "Completed" | "Lost" | "On Hold" | string;
  leadPartner: string;
  value: number;
  currency: string;
  targetClose: string;
  dd: DDItem[];
  cps: CP[];
}
export interface Clause {
  _id: string;
  title: string;
  category: string;
  jurisdiction: string;
  approved: boolean;
  version: number;
}
export interface Precedent {
  _id: string;
  name: string;
  type: string;
  jurisdiction: string;
  fileName: string;
}
export interface DealsData {
  deals: Deal[];
  clauses: Clause[];
  precedents: Precedent[];
}

// ── Deal Intelligence ────────────────────────────────────────
export interface Valuation {
  _id: string;
  currency: string;
  advisor: string;
  createdAt: string;
  blendResult?: { blendedEv?: number };
}
export interface ReadinessAssessment {
  _id: string;
  company: string;
  version: number;
  advisor: string;
  threshold: number;
  overallScore: number;
  gapsOpen: number;
  gaps: unknown[];
}
export interface DealIntelligenceData {
  valuations: Valuation[];
  readiness: ReadinessAssessment[];
  portfolio: unknown;
}

// ── Root ─────────────────────────────────────────────────────
export interface GrcOverview {
  healthScore: number;
  governance: GovernanceData;
  risk: RiskData;
  operations: OperationsData;
  thirdPartyBcp: ThirdPartyBcpData;
  compliance: ComplianceData;
  deals: DealsData;
  dealIntelligence: DealIntelligenceData;
}

export const fetchGrcOverview = async (): Promise<GrcOverview> => {
  const res = await api.get("/grc/overview");
  return res.data?.data ?? res.data;
};

// ── Display helpers ──────────────────────────────────────────
// scoreToBand mirrors RiskService.scoreToBand exactly (score = likelihood
// × impact) — needed client-side only for the static 5×5 heatmap grid,
// which isn't tied to any single risk's already-server-computed band.
export function scoreToBand(
  score: number,
): "Extreme" | "High" | "Medium" | "Low" {
  if (score >= 17) return "Extreme";
  if (score >= 10) return "High";
  if (score >= 5) return "Medium";
  return "Low";
}
export function bandTone(band: string): string {
  switch (band) {
    case "Extreme":
      return "text-rose-600 border-rose-500/30 bg-rose-500/10";
    case "High":
      return "text-orange-600 border-orange-500/30 bg-orange-500/10";
    case "Medium":
      return "text-amber-600 border-amber-500/30 bg-amber-500/10";
    default:
      return "text-emerald-600 border-emerald-500/30 bg-emerald-500/10";
  }
}
export function zoneTone(zone: string): string {
  switch (zone) {
    case "Red":
      return "text-rose-600 border-rose-500/30 bg-rose-500/10";
    case "Amber":
      return "text-amber-600 border-amber-500/30 bg-amber-500/10";
    default:
      return "text-emerald-600 border-emerald-500/30 bg-emerald-500/10";
  }
}
