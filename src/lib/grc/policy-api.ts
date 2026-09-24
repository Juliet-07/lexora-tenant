import { api } from "../api";

export type PolicyType = "organisation" | "board";
export type PolicyStatus =
  | "Draft"
  | "Under review"
  | "Pending board approval"
  | "Published";
export type BoardApprovalDecision = "Pending" | "Approved" | "Rejected";
export type ReviewFrequency =
  | "Annual"
  | "Semi-annual"
  | "Quarterly"
  | "Biennial"
  | "Ad hoc";
export type AckRequirement =
  | "All staff must acknowledge"
  | "Department heads only"
  | "Specific roles"
  | "No acknowledgement required";

export const REVIEW_FREQUENCIES: ReviewFrequency[] = [
  "Annual",
  "Semi-annual",
  "Quarterly",
  "Biennial",
  "Ad hoc",
];
export const ACK_REQUIREMENTS: AckRequirement[] = [
  "All staff must acknowledge",
  "Department heads only",
  "Specific roles",
  "No acknowledgement required",
];
export const POLICY_TYPES: { value: PolicyType; label: string }[] = [
  { value: "organisation", label: "Organisation-wide (employees + board)" },
  { value: "board", label: "Board only" },
];
export const POLICY_CATEGORIES = [
  "Legal and Compliance",
  "IT, Data and Cyber",
  "Website and Client-Facing",
  "HR and People",
  "Operations and Finance",
];

const GRC_API_BASE = (api.defaults as any)?.baseURL ?? "/api";
export const resolvePolicyFileUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith("http")) return url;
  return `${new URL(GRC_API_BASE).origin}${url}`;
};

export interface PolicyAcknowledgment {
  name: string;
  email: string;
  signature: string;
  ackedAt: string;
  source: "external" | "employee";
  version: string;
}

export interface PolicySection {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface PolicyApprovalEntry {
  version: string;
  approvedBy: string;
  date: string;
  notes: string;
}

export interface PolicyComment {
  id: string;
  author: string;
  authorRole: string;
  date: string;
  content: string;
  parentId: string | null;
}

export interface PolicyRosterEntry {
  name: string;
  role: string;
  email: string;
  versionAcknowledged: string | null;
  dateAcknowledged: string | null;
  method: "In-app" | "Email link" | null;
  status: "Acknowledged" | "Outstanding";
}

export interface BoardApprovalRow {
  name: string;
  email: string;
  decision: BoardApprovalDecision;
  notes: string;
  decidedAt: string | null;
  requestedAt: string;
}

export interface BoardApprovalSummary {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  rows: BoardApprovalRow[];
}

export interface Policy {
  _id: string;
  title: string;
  category: string;
  type: PolicyType;
  status: PolicyStatus;
  version: string;
  documentReference: string;
  owner: string;
  approvalAuthority: string;
  reviewFrequency: ReviewFrequency;
  acknowledgementRequirement: AckRequirement;
  description: string;
  linkedRegulationsOrStandards: string[];
  effectiveDate: string | null;
  supersedes: string;
  relatedPolicies: string[];
  lastReviewed: string | null;
  nextReviewDue: string | null;
  templateId: string | null;
  sections: PolicySection[];
  approvalHistory: PolicyApprovalEntry[];
  comments: PolicyComment[];
  boardApprovalRequired: boolean;
  tenantApprovedBy: string;
  tenantApprovedAt: string | null;
  tenantApprovalNotes: string;
  fileName: string;
  fileUrl: string | null;
  mimeType: string | null;
  size: number;
  acknowledgments: PolicyAcknowledgment[];
  createdAt: string;
  // computed server-side
  computedOverdue: boolean;
  assignedCount: number;
  acknowledgedCount: number;
  ackRate: number | null;
  rosterStatus: PolicyRosterEntry[];
  boardApprovalSummary: BoardApprovalSummary | null;
}

export interface PolicyTemplateSection {
  title: string;
  content: string;
}

export interface PolicyTemplate {
  _id: string;
  title: string;
  category: string;
  description: string;
  sections: PolicyTemplateSection[];
  status: "Draft" | "Published";
}

export interface PolicyStats {
  totalPolicies: number;
  published: number;
  draft: number;
  underReview: number;
  overdueCount: number;
  overdueTitles: string[];
  avgAcknowledgement: number;
  staffWithGaps: number;
}

export interface PolicyRosterReportRow {
  policyTitle: string;
  policyReference: string;
  staffName: string;
  role: string;
  status: string;
  versionAcknowledged: string | null;
  dateAcknowledged: string | null;
}

export const fetchPolicies = async (): Promise<Policy[]> => {
  const res = await api.get("/grc/compliance/policies");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchPolicyStats = async (): Promise<PolicyStats> => {
  const res = await api.get("/grc/compliance/policies/stats");
  return res.data?.data ?? res.data;
};

export const fetchPolicyRosterReport = async (): Promise<
  PolicyRosterReportRow[]
> => {
  const res = await api.get("/grc/compliance/policies/roster-report");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchPolicy = async (id: string): Promise<Policy> => {
  const res = await api.get(`/grc/compliance/policies/${id}`);
  return res.data?.data ?? res.data;
};

export const fetchPolicyTemplates = async (
  category?: string,
): Promise<PolicyTemplate[]> => {
  const res = await api.get("/grc/compliance/policy-templates", {
    params: category ? { category } : undefined,
  });
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createPolicyDoc = async (dto: {
  title: string;
  category: string;
  templateId?: string;
  type?: PolicyType;
  owner?: string;
  approvalAuthority?: string;
  reviewFrequency?: ReviewFrequency;
  acknowledgementRequirement?: AckRequirement;
  description?: string;
  linkedRegulationsOrStandards?: string;
  boardApprovalRequired?: boolean;
}): Promise<Policy> => {
  const res = await api.post("/grc/compliance/policies", dto);
  return res.data?.data ?? res.data;
};

export const updatePolicyProperties = async (
  id: string,
  dto: Partial<{
    title: string;
    category: string;
    documentReference: string;
    effectiveDate: string;
    supersedes: string;
    relatedPolicies: string[];
    owner: string;
    approvalAuthority: string;
    reviewFrequency: ReviewFrequency;
    acknowledgementRequirement: AckRequirement;
    description: string;
    linkedRegulationsOrStandards: string[];
    type: PolicyType;
    boardApprovalRequired: boolean;
  }>,
): Promise<Policy> => {
  const res = await api.patch(`/grc/compliance/policies/${id}/properties`, dto);
  return res.data?.data ?? res.data;
};

export const addPolicySection = async (
  id: string,
  dto: { title?: string; content?: string },
): Promise<Policy> => {
  const res = await api.post(`/grc/compliance/policies/${id}/sections`, dto);
  return res.data?.data ?? res.data;
};

export const updatePolicySection = async (
  id: string,
  sectionId: string,
  dto: { title?: string; content?: string },
): Promise<Policy> => {
  const res = await api.put(
    `/grc/compliance/policies/${id}/sections/${sectionId}`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const deletePolicySection = async (
  id: string,
  sectionId: string,
): Promise<Policy> => {
  const res = await api.delete(
    `/grc/compliance/policies/${id}/sections/${sectionId}`,
  );
  return res.data?.data ?? res.data;
};

export const setPolicyStatus = async (
  id: string,
  status: "Under review" | "Draft",
): Promise<Policy> => {
  const res = await api.patch(`/grc/compliance/policies/${id}/status`, {
    status,
  });
  return res.data?.data ?? res.data;
};

export const publishPolicy = async (
  id: string,
  notes?: string,
): Promise<Policy> => {
  const res = await api.patch(`/grc/compliance/policies/${id}/publish`, {
    notes,
  });
  return res.data?.data ?? res.data;
};

export const addPolicyComment = async (
  id: string,
  dto: { content: string; parentId?: string },
): Promise<Policy> => {
  const res = await api.post(`/grc/compliance/policies/${id}/comments`, dto);
  return res.data?.data ?? res.data;
};

export const sendPolicyReminders = async (
  id: string,
): Promise<{ remindersSent: number }> => {
  const res = await api.post(`/grc/compliance/policies/${id}/remind`);
  return res.data?.data ?? res.data;
};

export const sendBoardApprovalReminders = async (
  id: string,
): Promise<{ remindersSent: number }> => {
  const res = await api.post(`/grc/compliance/policies/${id}/remind-board`);
  return res.data?.data ?? res.data;
};

export const deletePolicy = async (id: string): Promise<void> => {
  await api.delete(`/grc/compliance/policies/${id}`);
};

export const acknowledgePolicyAsEmployee = async (
  id: string,
  signature: string,
): Promise<Policy> => {
  const res = await api.post(`/grc/compliance/policies/${id}/acknowledge`, {
    signature,
  });
  return res.data?.data ?? res.data;
};

// ── Legacy single-file upload (kept for the board-policy flow) ───

export const uploadPolicyDocument = async (dto: {
  title: string;
  category?: string;
  type: PolicyType;
  file: File;
}): Promise<Policy> => {
  const form = new FormData();
  form.append("title", dto.title);
  if (dto.category) form.append("category", dto.category);
  form.append("type", dto.type);
  form.append("file", dto.file);
  const res = await api.post("/grc/compliance/policies/upload", form);
  return res.data?.data ?? res.data;
};

export interface PolicyAckSnapshot {
  title: string;
  category: string;
  fileName: string;
  fileUrl: string | null;
  mimeType: string | null;
  sections: PolicySection[];
  uploadedAt: string;
  prefillName: string;
  alreadyAcknowledged: boolean;
}

export const fetchPolicyAckSnapshot = async (
  token: string,
): Promise<PolicyAckSnapshot> => {
  const res = await api.get(`/grc/compliance/policies/ack/${token}`);
  return res.data?.data ?? res.data;
};

export const submitPolicyAck = async (
  token: string,
  dto: { name: string; signature: string },
): Promise<{ success: boolean }> => {
  const res = await api.post(`/grc/compliance/policies/ack/${token}`, dto);
  return res.data?.data ?? res.data;
};

// ── Board approval (pre-publish sign-off, separate from the
// post-publish acknowledgement above) ───────────────────────────

export interface PolicyBoardApprovalSnapshot {
  title: string;
  category: string;
  description: string;
  version: string;
  sections: PolicySection[];
  fileName: string;
  fileUrl: string | null;
  mimeType: string | null;
  prefillName: string;
  decision: BoardApprovalDecision;
  notes: string;
  alreadyDecided: boolean;
}

export const fetchBoardApprovalSnapshot = async (
  token: string,
): Promise<PolicyBoardApprovalSnapshot> => {
  const res = await api.get(`/grc/compliance/policies/board-approve/${token}`);
  return res.data?.data ?? res.data;
};

export const submitBoardApprovalDecision = async (
  token: string,
  dto: { decision: "Approved" | "Rejected"; notes?: string },
): Promise<{ success: boolean; outcome: string }> => {
  const res = await api.post(
    `/grc/compliance/policies/board-approve/${token}`,
    dto,
  );
  return res.data?.data ?? res.data;
};
