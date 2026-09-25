import { api } from "../api";

export type Regulator =
  | "BNR"
  | "RRA"
  | "RSSB"
  | "CMA"
  | "FIU"
  | "NCSA"
  | "MIFOTRA"
  | "RDB"
  | "Sector-specific";
export type Frequency =
  | "Annual"
  | "Semi-annual"
  | "Quarterly"
  | "Monthly"
  | "Ad hoc"
  | "Event-driven";
export type ObligationStatus =
  | "Compliant"
  | "Due"
  | "Overdue"
  | "Not Applicable";
export type FilingStage =
  | "Not started"
  | "In preparation"
  | "Evidence collected"
  | "Certified"
  | "Completed";
export type EvidenceCategory =
  | "Document"
  | "Declaration"
  | "Proof of payment"
  | "Other";
export const EVIDENCE_CATEGORIES: EvidenceCategory[] = [
  "Document",
  "Declaration",
  "Proof of payment",
  "Other",
];

export const REGULATORS: Regulator[] = [
  "BNR",
  "RRA",
  "RSSB",
  "CMA",
  "FIU",
  "NCSA",
  "MIFOTRA",
  "RDB",
  "Sector-specific",
];
export const FREQUENCIES: Frequency[] = [
  "Annual",
  "Semi-annual",
  "Quarterly",
  "Monthly",
  "Ad hoc",
  "Event-driven",
];
export const FILING_STAGES: FilingStage[] = [
  "Not started",
  "In preparation",
  "Evidence collected",
  "Certified",
  "Completed",
];

export const daysUntil = (dateStr: string): number => {
  const d = new Date(dateStr + "T00:00:00").getTime();
  const t = new Date(todayStr() + "T00:00:00").getTime();
  return Math.round((d - t) / 86400000);
};
export const todayStr = (): string => new Date().toISOString().slice(0, 10);

const GRC_API_BASE = (api.defaults as any)?.baseURL ?? "/api";
export const resolveComplianceFileUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith("http")) return url;
  return `${new URL(GRC_API_BASE).origin}${url}`;
};

export interface FilingEvidence {
  name: string;
  category: EvidenceCategory;
  fileUrl: string | null;
  mimeType: string | null;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface Filing {
  _id: string;
  obligationId: string;
  periodLabel: string;
  dueDate: string;
  stage: FilingStage;
  evidence: FilingEvidence[];
  certifiedBy: string | null;
  certifiedAt: string | null;
  completedBy: string | null;
  completedAt: string | null;
}

export interface ComplianceObligation {
  _id: string;
  reference: string;
  title: string;
  regulator: Regulator;
  entity: string;
  description: string;
  legalBasis: string;
  frequency: Frequency;
  nextDueDate: string;
  evidenceRequirements: string;
  owner: string;
  ownerEmail: string;
  certifier: string;
  reminderDays: number[];
  status: ObligationStatus;
  createdAt: string;
  // Computed server-side, never re-derived on the client.
  computedStatus: ObligationStatus;
  activeReminderDays: number | null;
}

export type RenewalStage =
  | "Current"
  | "Renewal initiated"
  | "Documentation gathering"
  | "Application submitted"
  | "Approved"
  | "Expired";
export const RENEWAL_STAGES: RenewalStage[] = [
  "Current",
  "Renewal initiated",
  "Documentation gathering",
  "Application submitted",
  "Approved",
  "Expired",
];

export interface CertEvidence {
  name: string;
  fileUrl: string | null;
  mimeType: string | null;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface Certification {
  _id: string;
  name: string;
  issuingBody: string;
  certificateNumber: string;
  issueDate: string;
  expiryDate: string;
  renewalRequirements: string;
  cost: number;
  currency: string;
  responsiblePerson: string;
  leadTimeDays: number;
  renewalStage: RenewalStage;
  evidence: CertEvidence[];
}

export type AuditType = "Internal" | "External";
export type AuditEngagementStatus =
  | "Planned"
  | "In Progress"
  | "Reporting"
  | "Closed";
// Requested → Submitted (files uploaded) / Disputed (employee pushed
// back) → Resolved (tenant/auditor signed off). Nothing here is a
// stored "Overdue" state — overdue-ness is computed at display time
// from dueDate vs. now, so it can never go stale.
export type RequestStatus = "Requested" | "Submitted" | "Disputed" | "Resolved";
export type FindingSeverity = "Critical" | "High" | "Medium" | "Low";
export type FindingStatus = "Open" | "In Progress" | "Remediated" | "Closed";

export interface RequestFile {
  name: string;
  fileUrl: string;
  uploadedAt: string;
  uploadedBy: string;
}

// A tenant-created folder for an engagement's document requests —
// created up front, then picked (not retyped) when a request is raised.
export interface AuditFolder {
  _id: string;
  name: string;
}

export interface AuditRequest {
  _id: string;
  description: string;
  folder: string;
  assignedToEmployeeId: string;
  assignedToName: string;
  dueDate: string;
  status: RequestStatus;
  files: RequestFile[];
  disputeReason: string;
  disputedAt: string | null;
  resolutionNote: string;
  resolvedAt: string | null;
  resolvedBy: string;
}
export interface AuditFinding {
  observation: string;
  condition: string;
  criteria: string;
  cause: string;
  consequence: string;
  recommendation: string;
  severity: FindingSeverity;
  status: FindingStatus;
  managementResponse: string;
  remediationDueDate: string | null;
  createdAt: string;
}

export interface AuditEngagement {
  _id: string;
  name: string;
  type: AuditType;
  scope: string;
  startDate: string;
  endDate: string;
  status: AuditEngagementStatus;
  auditTeamId: string | null;
  auditTeamName: string;
  leadAuditorEmployeeId: string | null;
  leadAuditorName: string;
  externalAuditorName: string;
  linkedRiskIds: string[];
  folders: AuditFolder[];
  requests: AuditRequest[];
  findings: AuditFinding[];
}

// An employee's own view of a request they've been assigned, flattened
// with the parent engagement's context — what GET /audits/my/requests
// returns.
export interface MyAuditRequest extends AuditRequest {
  auditId: string;
  auditName: string;
  auditType: AuditType;
}

export type ChangeUrgency =
  | "Action Required"
  | "Review"
  | "Informational"
  | "Noted";
export type AssessmentStatus = "Unassigned" | "In Progress" | "Complete";
export type LoopStatus = "Pending" | "In Progress" | "Done" | "Not Applicable";

export const URGENCIES: ChangeUrgency[] = [
  "Action Required",
  "Review",
  "Informational",
  "Noted",
];

export interface LoopAction {
  status: LoopStatus;
  note: string;
  completedAt: string | null;
}

export interface RegulatoryChange {
  _id: string;
  title: string;
  regulator: Regulator;
  publishedAt: string;
  summary: string;
  fullTextRef: string;
  urgency: ChangeUrgency;
  practiceAreas: string[];
  affectedObligationIds: string[];
  affectedPolicyTitles: string[];
  assessmentOwner: string;
  assessmentDeadline: string | null;
  assessmentNotes: string;
  assessmentStatus: AssessmentStatus;
  obligationAction: LoopAction;
  policyAction: LoopAction;
  clauseAction: LoopAction;
  advisoryAction: LoopAction;
}

export const fetchObligations = async (): Promise<ComplianceObligation[]> => {
  const res = await api.get("/grc/compliance/obligations");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createObligation = async (dto: {
  title: string;
  regulator: Regulator;
  entity?: string;
  description?: string;
  legalBasis?: string;
  frequency: Frequency;
  nextDueDate: string;
  evidenceRequirements?: string;
  owner?: string;
  certifier?: string;
}): Promise<ComplianceObligation> => {
  const res = await api.post("/grc/compliance/obligations", dto);
  return res.data?.data ?? res.data;
};

export const fetchFilings = async (): Promise<Filing[]> => {
  const res = await api.get("/grc/compliance/obligations/filings");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const setFilingStage = async (
  id: string,
  stage: "In preparation" | "Evidence collected",
): Promise<Filing> => {
  const res = await api.patch(
    `/grc/compliance/obligations/filings/${id}/stage`,
    { stage },
  );
  return res.data?.data ?? res.data;
};

export const addFilingEvidence = async (
  id: string,
  files: File[],
  category?: EvidenceCategory,
): Promise<Filing> => {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  if (category) form.append("category", category);
  const res = await api.post(
    `/grc/compliance/obligations/filings/${id}/evidence`,
    form,
  );
  return res.data?.data ?? res.data;
};

// certifiedBy is resolved server-side from the logged-in user.
export const certifyFiling = async (id: string): Promise<Filing> => {
  const res = await api.patch(
    `/grc/compliance/obligations/filings/${id}/certify`,
  );
  return res.data?.data ?? res.data;
};

// The tick-box that closes the current filing period (requires
// evidence + certification) and schedules the next one.
// completedBy is resolved server-side from the logged-in user.
export const completeFiling = async (
  id: string,
): Promise<{ filing: Filing; obligation: ComplianceObligation }> => {
  const res = await api.patch(
    `/grc/compliance/obligations/filings/${id}/complete`,
  );
  return res.data?.data ?? res.data;
};

export const fetchCertifications = async (): Promise<Certification[]> => {
  const res = await api.get("/grc/compliance/certifications");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createCertification = async (dto: {
  name: string;
  issuingBody?: string;
  certificateNumber?: string;
  issueDate: string;
  expiryDate: string;
  renewalRequirements?: string;
  cost?: number;
  currency?: string;
  responsiblePerson?: string;
  leadTimeDays?: number;
}): Promise<Certification> => {
  const res = await api.post("/grc/compliance/certifications", dto);
  return res.data?.data ?? res.data;
};

export const updateCertStage = async (
  id: string,
  renewalStage: RenewalStage,
): Promise<Certification> => {
  const res = await api.patch(`/grc/compliance/certifications/${id}/stage`, {
    renewalStage,
  });
  return res.data?.data ?? res.data;
};

export const recordCertRenewal = async (
  id: string,
  newExpiryDate: string,
): Promise<Certification> => {
  const res = await api.patch(`/grc/compliance/certifications/${id}/renew`, {
    newExpiryDate,
  });
  return res.data?.data ?? res.data;
};

export const addCertEvidence = async (
  id: string,
  files: File[],
): Promise<Certification> => {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  const res = await api.post(
    `/grc/compliance/certifications/${id}/evidence`,
    form,
  );
  return res.data?.data ?? res.data;
};

export const deleteCertification = async (id: string): Promise<void> => {
  await api.delete(`/grc/compliance/certifications/${id}`);
};

export const fetchAudits = async (): Promise<AuditEngagement[]> => {
  const res = await api.get("/grc/compliance/audits");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createAudit = async (dto: {
  name: string;
  type: AuditType;
  scope?: string;
  startDate: string;
  endDate: string;
  // External only — Internal auto-resolves the tenant's Audit team.
  externalAuditorName?: string;
  linkedRiskIds?: string[];
}): Promise<AuditEngagement> => {
  const res = await api.post("/grc/compliance/audits", dto);
  return res.data?.data ?? res.data;
};

export const setAuditStatus = async (
  id: string,
  status: AuditEngagementStatus,
): Promise<AuditEngagement> => {
  const res = await api.patch(`/grc/compliance/audits/${id}/status`, {
    status,
  });
  return res.data?.data ?? res.data;
};

// Create a folder up front so it can be picked (not retyped) when a
// document request is raised.
export const addAuditFolder = async (
  id: string,
  name: string,
): Promise<AuditEngagement> => {
  const res = await api.post(`/grc/compliance/audits/${id}/folders`, {
    name,
  });
  return res.data?.data ?? res.data;
};

// Blocked server-side once a request already references this folder.
export const removeAuditFolder = async (
  id: string,
  folderId: string,
): Promise<AuditEngagement> => {
  const res = await api.delete(
    `/grc/compliance/audits/${id}/folders/${folderId}`,
  );
  return res.data?.data ?? res.data;
};

export const addAuditRequest = async (
  id: string,
  dto: {
    description: string;
    // Must name one of the engagement's existing folders — create it
    // first with addAuditFolder if it doesn't exist yet.
    folder: string;
    assignedToEmployeeId: string;
    dueDate: string;
  },
): Promise<AuditEngagement> => {
  const res = await api.post(`/grc/compliance/audits/${id}/requests`, dto);
  return res.data?.data ?? res.data;
};

export const resolveAuditRequest = async (
  auditId: string,
  requestId: string,
  note?: string,
): Promise<AuditEngagement> => {
  const res = await api.patch(
    `/grc/compliance/audits/${auditId}/requests/${requestId}/resolve`,
    { note },
  );
  return res.data?.data ?? res.data;
};

// Triggers a browser download of every uploaded document across this
// engagement's requests, grouped into folders inside the zip.
export const downloadAuditRequestsZip = async (
  auditId: string,
  auditName: string,
): Promise<void> => {
  const res = await api.get(`/grc/compliance/audits/${auditId}/requests/zip`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    `${auditName.replace(/[^a-z0-9]+/gi, "_")}_documents.zip`,
  );
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ── Employee-facing document-request portal ("my/*" endpoints) ──
export const fetchMyAuditRequests = async (): Promise<MyAuditRequest[]> => {
  const res = await api.get("/grc/compliance/audits/my/requests");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const submitMyAuditRequestFiles = async (
  requestId: string,
  files: File[],
): Promise<AuditEngagement> => {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  const res = await api.post(
    `/grc/compliance/audits/my/requests/${requestId}/files`,
    form,
  );
  return res.data?.data ?? res.data;
};

export const disputeMyAuditRequest = async (
  requestId: string,
  reason: string,
): Promise<AuditEngagement> => {
  const res = await api.post(
    `/grc/compliance/audits/my/requests/${requestId}/dispute`,
    { reason },
  );
  return res.data?.data ?? res.data;
};

export const resolveAuditFileUrl = (relativeUrl: string): string => {
  if (!relativeUrl) return relativeUrl;
  if (relativeUrl.startsWith("http")) return relativeUrl;
  const base = import.meta.env.VITE_REACT_APP_BASE_URL ?? "";
  try {
    return `${new URL(base).origin}${relativeUrl}`;
  } catch {
    return `${base}${relativeUrl}`;
  }
};

export const addFinding = async (
  id: string,
  dto: {
    observation: string;
    condition?: string;
    criteria?: string;
    cause?: string;
    consequence?: string;
    recommendation?: string;
    severity: FindingSeverity;
  },
): Promise<AuditEngagement> => {
  const res = await api.post(`/grc/compliance/audits/${id}/findings`, dto);
  return res.data?.data ?? res.data;
};

export const updateFinding = async (
  id: string,
  index: number,
  dto: Partial<{
    managementResponse: string;
    remediationDueDate: string;
    status: FindingStatus;
  }>,
): Promise<AuditEngagement> => {
  const res = await api.patch(
    `/grc/compliance/audits/${id}/findings/${index}`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const fetchRegChanges = async (): Promise<RegulatoryChange[]> => {
  const res = await api.get("/grc/compliance/regulatory-changes");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createRegChange = async (dto: {
  title: string;
  regulator: Regulator;
  publishedAt: string;
  summary?: string;
  fullTextRef?: string;
  urgency: ChangeUrgency;
  practiceAreas?: string[];
  affectedObligationIds?: string[];
  assessmentOwner?: string;
  assessmentDeadline?: string;
}): Promise<RegulatoryChange> => {
  const res = await api.post("/grc/compliance/regulatory-changes", dto);
  return res.data?.data ?? res.data;
};

export const updateRegChangeAssessment = async (
  id: string,
  dto: Partial<{
    assessmentOwner: string;
    assessmentDeadline: string;
    assessmentNotes: string;
    assessmentStatus: AssessmentStatus;
  }>,
): Promise<RegulatoryChange> => {
  const res = await api.patch(
    `/grc/compliance/regulatory-changes/${id}/assessment`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const updateLoopAction = async (
  id: string,
  field:
    | "obligationAction"
    | "policyAction"
    | "clauseAction"
    | "advisoryAction",
  dto: Partial<{ status: LoopStatus; note: string }>,
): Promise<RegulatoryChange> => {
  const res = await api.patch(
    `/grc/compliance/regulatory-changes/${id}/loop/${field}`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export type IncidentStatus = "Open" | "Investigating" | "Closed";
export type IncidentSeverity = "Critical" | "High" | "Medium" | "Low";
export type IncidentActionStatus = "Pending" | "In progress" | "Done";

export interface IncidentImpact {
  financial: string;
  regulatory: string;
  client: string;
  reputational: string;
}
export interface IncidentFinding {
  ref: string;
  finding: string;
  severity: IncidentSeverity;
  action: string;
}
export interface IncidentAction {
  action: string;
  owner: string;
  due: string | null;
  status: IncidentActionStatus;
}
export interface IncidentFile {
  name: string;
  fileUrl: string;
  type: string;
  by: string;
  date: string;
  size: string;
}
export interface IncidentLink {
  type: string;
  label: string;
}
export interface IncidentLesson {
  title: string;
  category: string;
  detail: string;
  by: string;
  date: string;
}
export interface IncidentTimelineEntry {
  at: string;
  event: string;
  detail?: string;
}

export interface Incident {
  _id: string;
  ref: string;
  title: string;
  category: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  occurred: string | null;
  reported: string;
  reportedBy: string;
  anonymous: boolean;
  assignedTo: string;
  escalatedTo: string;
  regulatoryReport: string;
  linkedAudit: string;
  description: string;
  investigationNotes: string;
  persons: string;
  clients: string;
  policies: string[];
  immediateActions: string;
  impact: IncidentImpact;
  rootCauses: string[];
  rootNarrative: string;
  findings: IncidentFinding[];
  actions: IncidentAction[];
  files: IncidentFile[];
  links: IncidentLink[];
  lessons: IncidentLesson[];
  timeline: IncidentTimelineEntry[];
  createdAt: string;
  updatedAt: string;
}

export const fetchIncidents = async (): Promise<Incident[]> => {
  const res = await api.get("/grc/compliance/incidents");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createIncident = async (dto: {
  title: string;
  category: string;
  severity: IncidentSeverity;
  occurred?: string;
  reported: string;
  description: string;
  persons?: string;
  clients?: string;
  policy?: string;
  immediateActions?: string;
  anonymous?: boolean;
}): Promise<Incident> => {
  const res = await api.post("/grc/compliance/incidents", dto);
  return res.data?.data ?? res.data;
};

export const updateIncidentFields = async (
  id: string,
  dto: Partial<{
    category: string;
    severity: IncidentSeverity;
    assignedTo: string;
    escalatedTo: string;
    regulatoryReport: string;
    investigationNotes: string;
    status: IncidentStatus;
    impact: Partial<IncidentImpact>;
    rootCauses: string[];
    rootNarrative: string;
    timelineEvent: string;
    timelineDetail: string;
  }>,
): Promise<Incident> => {
  const res = await api.patch(`/grc/compliance/incidents/${id}`, dto);
  return res.data?.data ?? res.data;
};

export const addIncidentFinding = async (
  id: string,
  dto: { finding: string; severity: IncidentSeverity; action?: string },
): Promise<Incident> => {
  const res = await api.post(`/grc/compliance/incidents/${id}/findings`, dto);
  return res.data?.data ?? res.data;
};

export const addIncidentAction = async (
  id: string,
  dto: { action: string; owner?: string; due?: string },
): Promise<Incident> => {
  const res = await api.post(`/grc/compliance/incidents/${id}/actions`, dto);
  return res.data?.data ?? res.data;
};

export const updateIncidentActionStatus = async (
  id: string,
  index: number,
  status: IncidentActionStatus,
): Promise<Incident> => {
  const res = await api.patch(
    `/grc/compliance/incidents/${id}/actions/${index}`,
    { status },
  );
  return res.data?.data ?? res.data;
};

export const addIncidentLesson = async (
  id: string,
  dto: { title: string; category?: string; detail?: string },
): Promise<Incident> => {
  const res = await api.post(`/grc/compliance/incidents/${id}/lessons`, dto);
  return res.data?.data ?? res.data;
};

export const addIncidentFiles = async (
  id: string,
  files: File[],
): Promise<Incident> => {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  const res = await api.post(`/grc/compliance/incidents/${id}/files`, form);
  return res.data?.data ?? res.data;
};
