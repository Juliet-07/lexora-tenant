import { api } from "../api";
import type { DisbursementCategory, AdrDisbursement } from "./adr-api";

const unwrap = (res: any) => res.data?.data ?? res.data;

export type LitigationStage =
  | "Filing"
  | "Service"
  | "Pleadings"
  | "Discovery"
  | "Pre-trial"
  | "Trial"
  | "Judgment"
  | "Enforce";
export const LITIGATION_STAGES: LitigationStage[] = [
  "Filing",
  "Service",
  "Pleadings",
  "Discovery",
  "Pre-trial",
  "Trial",
  "Judgment",
  "Enforce",
];

// Real sub-tasks per stage — static reference matching the product
// owner's spec exactly.
export const LITIGATION_STAGE_TASKS: Record<LitigationStage, string> = {
  Filing: "Draft claim, file at court, pay fees, obtain case number",
  Service: "Serve summons, proof of service, response deadline",
  Pleadings: "Claim, defence, counterclaim, reply, joinder, amendments",
  Discovery: "Document requests, production, interrogatories, inspections",
  "Pre-trial": "Conference, agreed facts, issues, witness lists, scheduling",
  Trial: "Opening, evidence, cross-exam, submissions, closing",
  Judgment: "Decision, costs order, interest, appeal window",
  Enforce: "Execution, garnishment, attachment, appeal",
};

export type LitigationCaseStatus =
  | "Active"
  | "Judgment issued"
  | "Settled"
  | "Withdrawn"
  | "Enforced";

export type LitigationPartyRole =
  | "Plaintiff"
  | "Defendant"
  | "Judge"
  | "Plaintiff counsel"
  | "Defendant counsel"
  | "Other";
export const LITIGATION_PARTY_ROLES: LitigationPartyRole[] = [
  "Plaintiff",
  "Defendant",
  "Judge",
  "Plaintiff counsel",
  "Defendant counsel",
  "Other",
];

export type PleadingType =
  | "Statement of claim"
  | "Statement of defence"
  | "Counterclaim"
  | "Reply"
  | "Defence to counterclaim"
  | "Discovery documents"
  | "Pre-trial memorandum"
  | "Interlocutory application"
  | "Other";
export const PLEADING_TYPES: PleadingType[] = [
  "Statement of claim",
  "Statement of defence",
  "Counterclaim",
  "Reply",
  "Defence to counterclaim",
  "Discovery documents",
  "Pre-trial memorandum",
  "Interlocutory application",
  "Other",
];
export type PleadingStatus = "Pending" | "Due" | "Filed";

export interface LitigationParty {
  _id: string;
  name: string;
  role: LitigationPartyRole;
  organisation: string;
  email: string;
  userId: string | null;
}
export type LitigationTimelineSource = "System" | "Manual";
export interface LitigationTimelineEntry {
  _id: string;
  at: string;
  title: string;
  description: string;
  source: LitigationTimelineSource;
}
export interface LitigationPleading {
  _id: string;
  type: PleadingType;
  label: string;
  status: PleadingStatus;
  dueOn: string | null;
  filedOn: string | null;
  note: string;
}
export interface LitigationCourtDate {
  _id: string;
  date: string;
  title: string;
  time: string;
  location: string;
  note: string;
}

// Real combined ADR + litigation totals, computed live on the
// backend from actual TimeEntry records and the linked ADR case —
// never stored, never stale.
export interface LitigationCombinedTotals {
  litigationHours: number;
  litigationFees: number;
  litigationDisbursed: number;
  adrHours: number;
  adrFees: number;
  adrDisbursed: number;
  combinedFees: number;
  combinedDisbursed: number;
  combinedTotal: number;
  litigationAgeDays: number;
  totalAgeDays: number;
}

export interface LitigationCase {
  _id: string;
  ref: string;
  title: string;
  adrCaseId: string | null;
  mandateId: string | null;
  mandateName: string;
  teamId: string | null;
  teamName: string;
  folders: string[];
  parties: LitigationParty[];
  stage: LitigationStage;
  status: LitigationCaseStatus;
  claimValue: number;
  currency: string;
  filedOn: string;
  court: string;
  courtDivision: string;
  courtCaseNumber: string | null;
  judge: string;
  registry: string;
  courtFeesPaid: number;
  courtFeesCurrency: string;
  timeline: LitigationTimelineEntry[];
  pleadings: LitigationPleading[];
  courtDates: LitigationCourtDate[];
  disbursements: AdrDisbursement[];
  outcome: string | null;
  createdAt: string;
  updatedAt: string;
  // Only present on the single-case detail fetch, not the list.
  totals?: LitigationCombinedTotals;
}

export const fetchLitigationCases = async (): Promise<LitigationCase[]> => {
  const res = await api.get("/crm/litigation-cases");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const fetchLitigationCase = async (
  id: string,
): Promise<LitigationCase> =>
  unwrap(await api.get(`/crm/litigation-cases/${id}`));

// Direct filing, no prior ADR phase. The far more common path —
// escalating a real ADR case — uses escalateAdrToLitigation instead.
export const createLitigationCase = async (dto: {
  title: string;
  mandateId?: string;
  parties?: {
    name: string;
    role: LitigationPartyRole;
    organisation?: string;
    email: string;
    userId?: string;
  }[];
  claimValue?: number;
  currency?: string;
  court?: string;
  courtDivision?: string;
  registry?: string;
  teamId?: string;
  teamName?: string;
}): Promise<LitigationCase> =>
  unwrap(await api.post("/crm/litigation-cases", dto));

export const updateLitigationDetails = async (
  id: string,
  dto: Partial<{
    court: string;
    courtDivision: string;
    courtCaseNumber: string;
    judge: string;
    registry: string;
    courtFeesPaid: number;
    courtFeesCurrency: string;
    claimValue: number;
    teamId: string;
    teamName: string;
    parties: {
      name: string;
      role: LitigationPartyRole;
      organisation?: string;
      email: string;
      userId?: string;
    }[];
  }>,
): Promise<LitigationCase> =>
  unwrap(await api.patch(`/crm/litigation-cases/${id}/details`, dto));

export const setLitigationStage = async (
  id: string,
  stage: LitigationStage,
  note?: string,
): Promise<LitigationCase> =>
  unwrap(await api.patch(`/crm/litigation-cases/${id}/stage`, { stage, note }));

export const addLitigationPleading = async (
  id: string,
  dto: { type: PleadingType; label?: string; dueOn?: string; note?: string },
): Promise<LitigationCase> =>
  unwrap(await api.post(`/crm/litigation-cases/${id}/pleadings`, dto));

export const updateLitigationPleading = async (
  id: string,
  pleadingId: string,
  dto: { status?: PleadingStatus; filedOn?: string; note?: string },
): Promise<LitigationCase> =>
  unwrap(
    await api.patch(`/crm/litigation-cases/${id}/pleadings/${pleadingId}`, dto),
  );

export const addLitigationCourtDate = async (
  id: string,
  dto: {
    date: string;
    title: string;
    time?: string;
    location?: string;
    note?: string;
  },
): Promise<LitigationCase> =>
  unwrap(await api.post(`/crm/litigation-cases/${id}/court-dates`, dto));

export const addLitigationDisbursement = async (
  id: string,
  dto: {
    label: string;
    category?: DisbursementCategory;
    amount: number;
    currency?: string;
    date?: string;
  },
): Promise<LitigationCase> =>
  unwrap(await api.post(`/crm/litigation-cases/${id}/disbursements`, dto));

export const addLitigationTimelineEntry = async (
  id: string,
  dto: { title: string; description?: string; at?: string },
): Promise<LitigationCase> =>
  unwrap(await api.post(`/crm/litigation-cases/${id}/timeline`, dto));

export const recordLitigationOutcome = async (
  id: string,
  outcome: string,
): Promise<LitigationCase> =>
  unwrap(await api.post(`/crm/litigation-cases/${id}/outcome`, { outcome }));

// Settlement reached mid-litigation — a consent judgment, per the
// product owner's spec ("settlement remains possible at any stage").
export const recordConsentJudgment = async (
  id: string,
  terms: string,
): Promise<LitigationCase> =>
  unwrap(
    await api.post(`/crm/litigation-cases/${id}/consent-judgment`, { terms }),
  );

export const withdrawLitigationCase = async (
  id: string,
  reason?: string,
): Promise<LitigationCase> =>
  unwrap(await api.post(`/crm/litigation-cases/${id}/withdraw`, { reason }));

// Triggers PDF download directly in the browser — same shared house
// style used across CRM, KYC, and GRC reports.
export const exportLitigationReportPdf = (): void => {
  const token = localStorage.getItem("tenantToken");
  const base = import.meta.env.VITE_REACT_APP_BASE_URL;
  const filename = `litigation-case-register-${new Date().toISOString().split("T")[0]}.pdf`;
  fetch(`${base}/crm/litigation-cases/report/export`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.blob())
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    });
};

// ── Communication ────────────────────────────────────────────────
export interface LitigationCaseMessage {
  _id: string;
  caseId: string;
  direction: "tenant" | "client";
  author: string;
  body: string;
  createdAt: string;
}

export const fetchLitigationMessages = async (
  caseId: string,
): Promise<LitigationCaseMessage[]> => {
  const res = await api.get(`/crm/litigation-cases/${caseId}/messages`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const sendLitigationMessage = async (
  caseId: string,
  author: string,
  body: string,
): Promise<LitigationCaseMessage> => {
  const res = await api.post(`/crm/litigation-cases/${caseId}/messages`, {
    author,
    body,
  });
  return unwrap(res);
};

export const sendLitigationPartyEmail = async (
  caseId: string,
  dto: { partyIds: string[]; subject: string; body: string },
): Promise<{ success: boolean; sentTo: string[] }> => {
  const res = await api.post(
    `/crm/litigation-cases/${caseId}/party-email`,
    dto,
  );
  return unwrap(res);
};

// ── Drafting ─────────────────────────────────────────────────────
export interface LitigationDraftVersion {
  _id: string;
  versionNumber: number;
  content: string;
  savedBy: string;
  savedAt: string;
}
export interface LitigationDraft {
  _id: string;
  caseId: string;
  title: string;
  content: string;
  status: "Draft" | "In review" | "Final";
  sourceTemplateId: string;
  sourceTemplateTitle: string;
  versions: LitigationDraftVersion[];
  currentVersion: number;
  documentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const fetchLitigationDrafts = async (
  caseId: string,
): Promise<LitigationDraft[]> => {
  const res = await api.get(`/crm/litigation-cases/${caseId}/drafts`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const createLitigationDraft = async (
  caseId: string,
  dto: { title: string; templateId?: string },
): Promise<LitigationDraft> =>
  unwrap(await api.post(`/crm/litigation-cases/${caseId}/drafts`, dto));

export const saveLitigationDraftVersion = async (
  caseId: string,
  draftId: string,
  content: string,
): Promise<LitigationDraft> =>
  unwrap(
    await api.patch(`/crm/litigation-cases/${caseId}/drafts/${draftId}`, {
      content,
    }),
  );

export const updateLitigationDraftStatus = async (
  caseId: string,
  draftId: string,
  status: LitigationDraft["status"],
): Promise<LitigationDraft> =>
  unwrap(
    await api.patch(
      `/crm/litigation-cases/${caseId}/drafts/${draftId}/status`,
      { status },
    ),
  );

// ── Folders ───────────────────────────────────────────────────────
export const fetchLitigationFolders = async (
  caseId: string,
): Promise<string[]> => {
  const res = await api.get(`/crm/litigation-cases/${caseId}/folders`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : ["General"];
};

export const createLitigationFolder = async (
  caseId: string,
  name: string,
): Promise<string[]> =>
  unwrap(await api.post(`/crm/litigation-cases/${caseId}/folders`, { name }));

// ── Documents ─────────────────────────────────────────────────────
export interface LitigationDocument {
  _id: string;
  caseId: string;
  folder: string;
  name: string;
  content: string;
  fileUrl: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  sourceDraftId: string | null;
  createdAt: string;
}

export const fetchLitigationDocuments = async (
  caseId: string,
): Promise<LitigationDocument[]> => {
  const res = await api.get(`/crm/litigation-cases/${caseId}/documents`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const uploadLitigationDocument = async (
  caseId: string,
  folder: string,
  file: File,
): Promise<LitigationDocument> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(
    `/crm/litigation-cases/${caseId}/documents?folder=${encodeURIComponent(folder)}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return unwrap(res);
};

// ── Deadline rules ───────────────────────────────────────────────
export type LitigationDeadlineTriggerSource =
  | "case_filed"
  | "court_date"
  | "outcome"
  | "cascade"
  | "custom";

export interface LitigationDeadlineRule {
  _id: string;
  caseId: string;
  triggerLabel: string;
  triggerSource: LitigationDeadlineTriggerSource;
  triggerCourtDateIndex: number | null;
  cascadeFromRuleId: string | null;
  customTriggerDate: string | null;
  ruleLabel: string;
  windowDays: number;
  metAt: string | null;
  triggerDate: string | null;
  dueDate: string | null;
  status: "not_triggered" | "due" | "overdue" | "met";
}

export interface CreateLitigationDeadlineRulePayload {
  triggerLabel: string;
  triggerSource: LitigationDeadlineTriggerSource;
  triggerCourtDateIndex?: number;
  cascadeFromRuleId?: string;
  customTriggerDate?: string;
  ruleLabel: string;
  windowDays: number;
}

export const fetchLitigationDeadlineRules = async (
  caseId: string,
): Promise<LitigationDeadlineRule[]> => {
  const res = await api.get(`/crm/litigation-cases/${caseId}/deadline-rules`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const createLitigationDeadlineRule = async (
  caseId: string,
  dto: CreateLitigationDeadlineRulePayload,
): Promise<LitigationDeadlineRule> =>
  unwrap(await api.post(`/crm/litigation-cases/${caseId}/deadline-rules`, dto));

export const updateLitigationDeadlineRule = async (
  caseId: string,
  ruleId: string,
  dto: Partial<CreateLitigationDeadlineRulePayload>,
): Promise<LitigationDeadlineRule> =>
  unwrap(
    await api.patch(
      `/crm/litigation-cases/${caseId}/deadline-rules/${ruleId}`,
      dto,
    ),
  );

export const markLitigationDeadlineRuleMet = async (
  caseId: string,
  ruleId: string,
): Promise<LitigationDeadlineRule> =>
  unwrap(
    await api.post(
      `/crm/litigation-cases/${caseId}/deadline-rules/${ruleId}/mark-met`,
    ),
  );

// ── Audit trail ────────────────────────────────────────────────────
export const exportLitigationAuditTrailPdf = (
  caseId: string,
  caseRef: string,
): void => {
  const token = localStorage.getItem("tenantToken");
  const base = import.meta.env.VITE_REACT_APP_BASE_URL;
  const filename = `audit-trail-${caseRef}-${new Date().toISOString().split("T")[0]}.pdf`;
  fetch(`${base}/crm/litigation-cases/${caseId}/audit-trail/export`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.blob())
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    });
};

// ── Tenant time logging ──────────────────────────────────────────
export const logLitigationTenantTime = async (
  caseId: string,
  dto: {
    narrative?: string;
    date: string;
    hours: number;
    billable?: boolean;
    rate: number;
  },
): Promise<void> => {
  await api.post(`/crm/litigation-cases/${caseId}/time`, dto);
};
