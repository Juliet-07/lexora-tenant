import { api } from "../api";

export type RiskCategory =
  | "Strategic"
  | "Operational"
  | "Financial"
  | "Compliance"
  | "Reputational"
  | "Information Security";
export type RiskPosture = "Averse" | "Cautious" | "Open" | "Hungry";
export type RiskStatus = "Open" | "On Hold" | "Transferred" | "Closed";
export type ControlEffectiveness =
  | "Effective"
  | "Partially Effective"
  | "Ineffective"
  | "Not Tested";
export type RiskBand = "Extreme" | "High" | "Medium" | "Low";
export type RiskZone = "Green" | "Amber" | "Red";

export const RISK_CATEGORIES: RiskCategory[] = [
  "Strategic",
  "Operational",
  "Financial",
  "Compliance",
  "Reputational",
  "Information Security",
];

export interface AppetiteEntry {
  category: RiskCategory;
  posture: RiskPosture;
  qualitative: string;
  maxLossPerEvent: number;
  maxAggregateExposure: number;
  amberThresholdPct: number;
}

export interface AppetiteVersion {
  _id: string;
  note: string;
  entries: AppetiteEntry[];
  createdAt: string;
}

export interface RiskControlLink {
  controlId: string;
  effectiveness: ControlEffectiveness;
}

export interface RiskChangeEntry {
  at: string;
  note: string;
}

export interface Risk {
  _id: string;
  title: string;
  category: RiskCategory;
  description: string;
  rootCauses: string;
  affectedProcesses: string;
  owner: string;
  likelihood: number;
  impact: number;
  financialExposure: number;
  controls: RiskControlLink[];
  relatedRiskIds: string[];
  status: RiskStatus;
  nextReviewDate: string;
  changes: RiskChangeEntry[];
  createdAt: string;
  // Computed server-side — never re-derived on the client.
  inherentScore: number;
  residualScore: number;
  inherentBand: RiskBand;
  residualBand: RiskBand;
  zone: RiskZone;
  treatmentPlans: {
    _id: string;
    strategy: TreatmentStrategy;
    approvalStatus: ApprovalStatus;
  }[];
}

export type ControlType = "Preventive" | "Detective" | "Corrective";
export type ControlFrequency =
  | "Continuous"
  | "Daily"
  | "Weekly"
  | "Monthly"
  | "Quarterly"
  | "Annual";
export type TestOutcome = "Pass" | "Fail";
export type DeficiencySeverity = "Critical" | "High" | "Medium" | "Low";
export type DeficiencyStatus = "Open" | "Remediated";

export interface GrcControl {
  _id: string;
  code: string;
  name: string;
  objective: string;
  type: ControlType;
  owner: string;
  frequency: ControlFrequency;
  linkedRiskCount: number;
  createdAt: string;
}

export interface ControlTestRecord {
  _id: string;
  controlId: string;
  testedAt: string;
  outcome: TestOutcome;
  effectiveness: ControlEffectiveness;
  notes: string;
}

export interface DeficiencyRecord {
  _id: string;
  controlId: string;
  severity: DeficiencySeverity;
  rootCause: string;
  remediationDeadline: string;
  status: DeficiencyStatus;
  openedAt: string;
}

export const REMEDIATION_DEADLINE_DAYS: Record<DeficiencySeverity, number> = {
  Critical: 30,
  High: 60,
  Medium: 90,
  Low: 180,
};

export type TreatmentStrategy = "Avoid" | "Reduce" | "Transfer" | "Accept";
export type ApprovalStatus =
  | "Draft"
  | "Pending Approval"
  | "Approved"
  | "Rejected";

export interface TreatmentPlan {
  _id: string;
  riskId: string;
  strategy: TreatmentStrategy;
  justification: string;
  targetResidualLevel: RiskBand;
  actions: string;
  resourceNeeds: string;
  owner: string;
  timeline: string;
  successCriteria: string;
  investment: number;
  approvalStatus: ApprovalStatus;
  createdAt: string;
}

export interface EligibleRisk {
  _id: string;
  title: string;
  residualBand: RiskBand;
}

export type IncidentCategory =
  | "Security"
  | "Operational"
  | "Compliance"
  | "Fraud"
  | "Error"
  | "System Outage";
export type IncidentSeverity = "Critical" | "High" | "Medium" | "Low";
export type IncidentStatus =
  | "Reported"
  | "Investigating"
  | "Awaiting Sign-off"
  | "Closed";
export type RcaMethod = "5 Whys" | "Fishbone";

export const INCIDENT_CATEGORIES: IncidentCategory[] = [
  "Security",
  "Operational",
  "Compliance",
  "Fraud",
  "Error",
  "System Outage",
];
export const INCIDENT_SEVERITIES: IncidentSeverity[] = [
  "Critical",
  "High",
  "Medium",
  "Low",
];

export interface Incident {
  _id: string;
  title: string;
  description: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  reportedAt: string;
  investigator: string;
  dueDate: string | null;
  rcaMethod: RcaMethod | null;
  rcaNotes: string;
  correctiveActions: string;
  preventiveActions: string;
  lessonsLearned: string;
  signOffBy: string;
  closedAt: string | null;
}

export type VendorStatus = "Active" | "Terminated";
export type TriRating = "Strong" | "Adequate" | "Weak";
export type BcpRating = "Documented" | "Partial" | "None";
export type ComplianceRating = "Compliant" | "Issues" | "Unknown";
export type ReputationRating = "Good" | "Neutral" | "Concerns";

export interface DueDiligence {
  financialStability: TriRating;
  cybersecurityPosture: TriRating;
  bcp: BcpRating;
  complianceStatus: ComplianceRating;
  reputation: ReputationRating;
}

export interface RatingHistoryEntry {
  at: string;
  rating: RiskBand;
  note: string;
}

export interface Vendor {
  _id: string;
  name: string;
  category: string;
  services: string;
  contractStart: string;
  contractEnd: string;
  riskRating: RiskBand;
  dueDiligence: DueDiligence;
  nextReviewDate: string;
  status: VendorStatus;
  ratingHistory: RatingHistoryEntry[];
  terminationReason: string | null;
  terminatedAt: string | null;
}

export type BcpTestOutcome = "Pass" | "Partial" | "Fail";
export type SystemCriticality = "Tier 1" | "Tier 2" | "Tier 3";

export interface BcpPlan {
  _id: string;
  title: string;
  version: number;
  content: string;
  updatedAt: string;
}
export interface BcpTestRecord {
  _id: string;
  planId: string;
  testedAt: string;
  outcome: BcpTestOutcome;
  notes: string;
}
export interface RtoRpoEntry {
  _id: string;
  system: string;
  rtoHours: number;
  rpoHours: number;
  criticality: SystemCriticality;
}
export interface CrisisContact {
  _id: string;
  name: string;
  role: string;
  phone: string;
  escalationOrder: number;
}

// ── Display-only styling helpers — pure lookup, no business logic ──

export function bandTone(band: RiskBand): string {
  return {
    Extreme: "bg-rose-100 text-rose-700 border-rose-200",
    High: "bg-orange-100 text-orange-700 border-orange-200",
    Medium: "bg-amber-100 text-amber-700 border-amber-200",
    Low: "bg-emerald-100 text-emerald-700 border-emerald-200",
  }[band];
}

export function zoneTone(zone: RiskZone): string {
  return {
    Green: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Amber: "bg-amber-100 text-amber-700 border-amber-200",
    Red: "bg-rose-100 text-rose-700 border-rose-200",
  }[zone];
}

// ── Appetite ─────────────────────────────────────────────────────

export const fetchAppetiteCurrent = async (): Promise<AppetiteEntry[]> => {
  const res = await api.get("/grc/risk/appetite/current");
  return res.data?.data ?? res.data;
};

export const saveAppetiteVersion = async (
  note: string,
  entries: AppetiteEntry[],
): Promise<AppetiteVersion> => {
  const res = await api.post("/grc/risk/appetite", { note, entries });
  return res.data?.data ?? res.data;
};

export const fetchAppetiteHistory = async (): Promise<AppetiteVersion[]> => {
  const res = await api.get("/grc/risk/appetite/history");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

// ── Risks ────────────────────────────────────────────────────────

export const fetchRisks = async (): Promise<Risk[]> => {
  const res = await api.get("/grc/risk/risks");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchRisk = async (id: string): Promise<Risk> => {
  const res = await api.get(`/grc/risk/risks/${id}`);
  return res.data?.data ?? res.data;
};

export const createRisk = async (dto: {
  title: string;
  category: RiskCategory;
  description?: string;
  rootCauses?: string;
  affectedProcesses?: string;
  owner?: string;
  likelihood: number;
  impact: number;
  financialExposure?: number;
}): Promise<Risk> => {
  const res = await api.post("/grc/risk/risks", dto);
  return res.data?.data ?? res.data;
};

export const updateRisk = async (
  id: string,
  dto: {
    note: string;
    title?: string;
    description?: string;
    rootCauses?: string;
    affectedProcesses?: string;
    owner?: string;
    likelihood?: number;
    impact?: number;
    financialExposure?: number;
  },
): Promise<Risk> => {
  const res = await api.patch(`/grc/risk/risks/${id}`, dto);
  return res.data?.data ?? res.data;
};

export const setRiskStatus = async (
  id: string,
  status: RiskStatus,
  note: string,
): Promise<Risk> => {
  const res = await api.patch(`/grc/risk/risks/${id}/status`, { status, note });
  return res.data?.data ?? res.data;
};

export const linkControl = async (
  id: string,
  controlId: string,
  effectiveness?: ControlEffectiveness,
): Promise<Risk> => {
  const res = await api.post(`/grc/risk/risks/${id}/controls`, {
    controlId,
    effectiveness,
  });
  return res.data?.data ?? res.data;
};

export const unlinkControl = async (
  id: string,
  controlId: string,
): Promise<Risk> => {
  const res = await api.delete(`/grc/risk/risks/${id}/controls/${controlId}`);
  return res.data?.data ?? res.data;
};

export const linkRelatedRisk = async (
  id: string,
  relatedRiskId: string,
): Promise<Risk> => {
  const res = await api.post(`/grc/risk/risks/${id}/related`, {
    relatedRiskId,
  });
  return res.data?.data ?? res.data;
};

export const unlinkRelatedRisk = async (
  id: string,
  relatedRiskId: string,
): Promise<Risk> => {
  const res = await api.delete(
    `/grc/risk/risks/${id}/related/${relatedRiskId}`,
  );
  return res.data?.data ?? res.data;
};

// ── Controls — placeholder until Control Library backend exists.
// Real shape/path will need confirming once that module is built;
// returns [] gracefully until then rather than throwing. ──────────

export interface ControlOption {
  _id: string;
  code: string;
  name: string;
}

export const fetchControlOptions = async (): Promise<ControlOption[]> => {
  const res = await api.get("/grc/risk/controls");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d)
    ? d.map((c: any) => ({ _id: c._id, code: c.code, name: c.name }))
    : [];
};

export const fetchControls = async (): Promise<GrcControl[]> => {
  const res = await api.get("/grc/risk/controls");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createControl = async (dto: {
  code: string;
  name: string;
  objective?: string;
  type: ControlType;
  owner?: string;
  frequency: ControlFrequency;
}): Promise<GrcControl> => {
  const res = await api.post("/grc/risk/controls", dto);
  return res.data?.data ?? res.data;
};

export const logControlTest = async (
  controlId: string,
  dto: {
    outcome: TestOutcome;
    effectiveness: ControlEffectiveness;
    notes?: string;
  },
): Promise<ControlTestRecord> => {
  const res = await api.post(`/grc/risk/controls/${controlId}/tests`, dto);
  return res.data?.data ?? res.data;
};

export const fetchAllControlTests = async (): Promise<ControlTestRecord[]> => {
  const res = await api.get("/grc/risk/controls/tests/all");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const logDeficiency = async (
  controlId: string,
  dto: {
    severity: DeficiencySeverity;
    rootCause: string;
  },
): Promise<DeficiencyRecord> => {
  const res = await api.post(
    `/grc/risk/controls/${controlId}/deficiencies`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const fetchAllDeficiencies = async (): Promise<DeficiencyRecord[]> => {
  const res = await api.get("/grc/risk/controls/deficiencies/all");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const markDeficiencyRemediated = async (
  id: string,
): Promise<DeficiencyRecord> => {
  const res = await api.patch(
    `/grc/risk/controls/deficiencies/${id}/remediate`,
    {},
  );
  return res.data?.data ?? res.data;
};

export const fetchEligibleRisksForTreatment = async (): Promise<
  EligibleRisk[]
> => {
  const res = await api.get("/grc/risk/treatment-plans/eligible-risks");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchTreatmentPlans = async (): Promise<TreatmentPlan[]> => {
  const res = await api.get("/grc/risk/treatment-plans");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createTreatmentPlan = async (dto: {
  riskId: string;
  strategy: TreatmentStrategy;
  justification: string;
  targetResidualLevel: RiskBand;
  actions: string;
  resourceNeeds?: string;
  owner?: string;
  timeline?: string;
  successCriteria?: string;
  investment: number;
}): Promise<TreatmentPlan> => {
  const res = await api.post("/grc/risk/treatment-plans", dto);
  return res.data?.data ?? res.data;
};

export const decideTreatmentPlan = async (
  id: string,
  status: "Approved" | "Rejected",
): Promise<TreatmentPlan> => {
  const res = await api.patch(`/grc/risk/treatment-plans/${id}/decide`, {
    status,
  });
  return res.data?.data ?? res.data;
};

export const fetchIncidents = async (): Promise<Incident[]> => {
  const res = await api.get("/grc/risk/incidents");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createIncident = async (dto: {
  title: string;
  description?: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
}): Promise<Incident> => {
  const res = await api.post("/grc/risk/incidents", dto);
  return res.data?.data ?? res.data;
};

export const updateIncident = async (
  id: string,
  dto: Partial<{
    investigator: string;
    dueDate: string;
    rcaMethod: RcaMethod;
    rcaNotes: string;
    correctiveActions: string;
    preventiveActions: string;
    lessonsLearned: string;
    signOffBy: string;
  }>,
): Promise<Incident> => {
  const res = await api.patch(`/grc/risk/incidents/${id}`, dto);
  return res.data?.data ?? res.data;
};

export const setIncidentStatus = async (
  id: string,
  status: "Investigating" | "Awaiting Sign-off",
): Promise<Incident> => {
  const res = await api.patch(`/grc/risk/incidents/${id}/status`, { status });
  return res.data?.data ?? res.data;
};

export const closeIncident = async (id: string): Promise<Incident> => {
  const res = await api.post(`/grc/risk/incidents/${id}/close`, {});
  return res.data?.data ?? res.data;
};

export const fetchVendors = async (): Promise<Vendor[]> => {
  const res = await api.get("/grc/risk/vendors");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createVendor = async (dto: {
  name: string;
  category: string;
  services: string;
  contractStart: string;
  contractEnd: string;
  riskRating: RiskBand;
  dueDiligence: DueDiligence;
  nextReviewDate: string;
}): Promise<Vendor> => {
  const res = await api.post("/grc/risk/vendors", dto);
  return res.data?.data ?? res.data;
};

export const updateVendorRating = async (
  id: string,
  rating: RiskBand,
  note: string,
): Promise<Vendor> => {
  const res = await api.patch(`/grc/risk/vendors/${id}/rating`, {
    rating,
    note,
  });
  return res.data?.data ?? res.data;
};

export const terminateVendor = async (
  id: string,
  reason: string,
): Promise<Vendor> => {
  const res = await api.post(`/grc/risk/vendors/${id}/terminate`, { reason });
  return res.data?.data ?? res.data;
};

export const fetchBcpPlans = async (): Promise<BcpPlan[]> => {
  const res = await api.get("/grc/risk/bcp/plans");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createBcpPlan = async (dto: {
  title: string;
  version: number;
  content: string;
}): Promise<BcpPlan> => {
  const res = await api.post("/grc/risk/bcp/plans", dto);
  return res.data?.data ?? res.data;
};

export const fetchBcpTests = async (): Promise<BcpTestRecord[]> => {
  const res = await api.get("/grc/risk/bcp/tests");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const logBcpTest = async (dto: {
  planId: string;
  outcome: BcpTestOutcome;
  notes: string;
}): Promise<BcpTestRecord> => {
  const res = await api.post("/grc/risk/bcp/tests", dto);
  return res.data?.data ?? res.data;
};

export const fetchRtoRpo = async (): Promise<RtoRpoEntry[]> => {
  const res = await api.get("/grc/risk/bcp/rto-rpo");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createRtoRpo = async (dto: {
  system: string;
  rtoHours: number;
  rpoHours: number;
  criticality: SystemCriticality;
}): Promise<RtoRpoEntry> => {
  const res = await api.post("/grc/risk/bcp/rto-rpo", dto);
  return res.data?.data ?? res.data;
};

export const fetchCrisisContacts = async (): Promise<CrisisContact[]> => {
  const res = await api.get("/grc/risk/bcp/crisis-contacts");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createCrisisContact = async (dto: {
  name: string;
  role: string;
  phone: string;
  escalationOrder: number;
}): Promise<CrisisContact> => {
  const res = await api.post("/grc/risk/bcp/crisis-contacts", dto);
  return res.data?.data ?? res.data;
};
