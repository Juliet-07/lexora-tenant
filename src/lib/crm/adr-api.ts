import { api } from "../api";

const unwrap = (res: any) => res.data?.data ?? res.data;

export type AdrType =
  | "Mediation"
  | "Arbitration"
  | "Conciliation"
  | "Expert determination";
export const ADR_TYPES: AdrType[] = [
  "Mediation",
  "Arbitration",
  "Conciliation",
  "Expert determination",
];

export type AdrStage =
  | "Intake"
  | "Notice"
  | "Discovery"
  | "Preparation"
  | "Hearing"
  | "Resolution";
export const ADR_STAGES: AdrStage[] = [
  "Intake",
  "Notice",
  "Discovery",
  "Preparation",
  "Hearing",
  "Resolution",
];

// Real sub-tasks per stage — a static reference matching the
// product owner's spec exactly, not per-case data (every case
// shares the same real definition of what each stage covers).
export const ADR_STAGE_TASKS: Record<AdrStage, string> = {
  Intake: "Register, conflict check, assess, classify",
  Notice: "Serve ADR notice, response, mediator/arbitrator selection",
  Discovery: "Evidence gathering, expert reports, document exchange",
  Preparation: "Position paper, witness prep, settlement analysis, bundle",
  Hearing: "Session(s), opening statements, negotiation, adjournment",
  Resolution: "Settlement deed, award, enforcement, costs, close",
};

export type AdrCaseStatus =
  | "Active"
  | "Resolved"
  | "Escalated to litigation"
  | "Withdrawn";

export type SessionMode = "Physical" | "Virtual";
export type AdrSessionStatus = "Scheduled" | "Completed" | "Cancelled";

export type AdrPartyRole =
  | "Claimant"
  | "Respondent"
  | "Mediator"
  | "Arbitrator"
  | "Counsel"
  | "Expert"
  | "Other";
export const ADR_PARTY_ROLES: AdrPartyRole[] = [
  "Claimant",
  "Respondent",
  "Mediator",
  "Arbitrator",
  "Counsel",
  "Expert",
  "Other",
];

// Shared with litigation's own disbursements — one real cost
// vocabulary covers both phases so a combined total is honest.
export type DisbursementCategory =
  | "Filing fee"
  | "Mediator / arbitrator fee"
  | "Court fee"
  | "Bailiff / service"
  | "Expert"
  | "Venue"
  | "Other";
export const DISBURSEMENT_CATEGORIES: DisbursementCategory[] = [
  "Filing fee",
  "Mediator / arbitrator fee",
  "Court fee",
  "Bailiff / service",
  "Expert",
  "Venue",
  "Other",
];

export interface AdrParty {
  _id: string;
  name: string;
  role: AdrPartyRole;
  organisation: string;
  email: string;
  userId: string | null;
}
export interface AdrSession {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  mode: SessionMode;
  venue: string;
  status: AdrSessionStatus;
  outcome: string;
}
export interface AdrSettlement {
  amount: number;
  date: string;
  terms: string;
  deedDocumentId: string | null;
}
export interface AdrClosureDetails {
  clientSatisfaction: "" | "Excellent" | "Good" | "Fair" | "Poor";
  clientSatisfactionNotes: string;
  lessonsLearned: string;
  precedentValue: boolean;
  precedentNotes: string;
  recordedBy: string;
  recordedAt: string | null;
}
export type AdrTimelineSource = "System" | "Manual";
export interface AdrTimelineEntry {
  _id: string;
  at: string;
  title: string;
  description: string;
  source: AdrTimelineSource;
}
export interface AdrChecklistItem {
  _id: string;
  label: string;
  done: boolean;
}
export interface AdrDisbursement {
  _id: string;
  label: string;
  category: DisbursementCategory;
  amount: number;
  currency: string;
  date: string;
}

// Real hours/fees for this dispute specifically — computed live on
// the backend from actual TimeEntry records, never a stored number.
export interface AdrCaseTotals {
  hours: number;
  fees: number;
  disbursed: number;
  total: number;
  ageDays: number;
}

export interface AdrCase {
  _id: string;
  ref: string;
  title: string;
  type: AdrType;
  mandateId: string | null;
  mandateName: string;
  teamId: string | null;
  teamName: string;
  parties: AdrParty[];
  neutralUserId: string | null;
  neutral: string;
  stage: AdrStage;
  status: AdrCaseStatus;
  claimValue: number;
  currency: string;
  filedOn: string;
  category: string;
  settlementTargetMin: number | null;
  settlementTargetMax: number | null;
  venue: string;
  governingLaw: string;
  adrClause: string;
  escalationPath: string;
  sessions: AdrSession[];
  settlement: AdrSettlement | null;
  closure: AdrClosureDetails | null;
  outcome: string | null;
  timeline: AdrTimelineEntry[];
  checklist: AdrChecklistItem[];
  disbursements: AdrDisbursement[];
  litigationCaseId: string | null;
  createdAt: string;
  updatedAt: string;
  // Only present on the single-case detail fetch, not the list.
  totals?: AdrCaseTotals;
}

export const fetchAdrCases = async (): Promise<AdrCase[]> => {
  const res = await api.get("/crm/adr-cases");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const fetchAdrCase = async (id: string): Promise<AdrCase> =>
  unwrap(await api.get(`/crm/adr-cases/${id}`));

export const createAdrCase = async (dto: {
  title: string;
  type: AdrType;
  parties?: {
    name: string;
    role: AdrPartyRole;
    organisation?: string;
    email?: string;
    userId?: string;
  }[];
  mandateId?: string;
  neutralUserId?: string;
  neutral?: string;
  teamId?: string;
  teamName?: string;
  claimValue?: number;
  currency?: string;
  category?: string;
  settlementTargetMin?: number;
  settlementTargetMax?: number;
  venue?: string;
  governingLaw?: string;
  adrClause?: string;
  escalationPath?: string;
}): Promise<AdrCase> => unwrap(await api.post("/crm/adr-cases", dto));

export const updateAdrCaseDetails = async (
  id: string,
  dto: Partial<{
    category: string;
    teamId: string;
    teamName: string;
    settlementTargetMin: number;
    settlementTargetMax: number;
    venue: string;
    governingLaw: string;
    adrClause: string;
    escalationPath: string;
    claimValue: number;
    parties: {
      name: string;
      role: AdrPartyRole;
      organisation?: string;
      email?: string;
      userId?: string;
    }[];
  }>,
): Promise<AdrCase> =>
  unwrap(await api.patch(`/crm/adr-cases/${id}/details`, dto));

export const setAdrStage = async (
  id: string,
  stage: AdrStage,
  note?: string,
): Promise<AdrCase> =>
  unwrap(await api.patch(`/crm/adr-cases/${id}/stage`, { stage, note }));

export const addAdrSession = async (
  id: string,
  dto: {
    date: string;
    startTime?: string;
    endTime?: string;
    mode: SessionMode;
    venue?: string;
  },
): Promise<AdrCase> =>
  unwrap(await api.post(`/crm/adr-cases/${id}/sessions`, dto));

export const updateAdrSession = async (
  id: string,
  sessionId: string,
  dto: { status?: AdrSessionStatus; outcome?: string },
): Promise<AdrCase> =>
  unwrap(await api.patch(`/crm/adr-cases/${id}/sessions/${sessionId}`, dto));

export const recordAdrSettlement = async (
  id: string,
  amount: number,
  terms?: string,
): Promise<AdrCase> =>
  unwrap(await api.post(`/crm/adr-cases/${id}/settlement`, { amount, terms }));

export const linkAdrSettlementDeed = async (
  id: string,
  documentId: string,
): Promise<AdrCase> =>
  unwrap(
    await api.post(`/crm/adr-cases/${id}/settlement/deed`, { documentId }),
  );

export const recordAdrClosure = async (
  id: string,
  dto: Partial<{
    clientSatisfaction: string;
    clientSatisfactionNotes: string;
    lessonsLearned: string;
    precedentValue: boolean;
    precedentNotes: string;
  }>,
): Promise<AdrCase> =>
  unwrap(await api.post(`/crm/adr-cases/${id}/closure`, dto));

export const recordAdrOutcome = async (
  id: string,
  outcome: string,
): Promise<AdrCase> =>
  unwrap(await api.post(`/crm/adr-cases/${id}/outcome`, { outcome }));

// The real workflow transition matching "if mediation fails,
// restart as arbitration" — resets to Notice stage on the backend.
export const restartAdrAsType = async (
  id: string,
  newType: AdrType,
  reason: string,
): Promise<AdrCase> =>
  unwrap(
    await api.post(`/crm/adr-cases/${id}/restart-as`, { newType, reason }),
  );

export const withdrawAdrCase = async (
  id: string,
  reason?: string,
): Promise<AdrCase> =>
  unwrap(await api.post(`/crm/adr-cases/${id}/withdraw`, { reason }));

export const addAdrTimelineEntry = async (
  id: string,
  dto: { title: string; description?: string; at?: string },
): Promise<AdrCase> =>
  unwrap(await api.post(`/crm/adr-cases/${id}/timeline`, dto));

export const addAdrChecklistItem = async (
  id: string,
  label: string,
): Promise<AdrCase> =>
  unwrap(await api.post(`/crm/adr-cases/${id}/checklist`, { label }));

export const setAdrChecklistItemDone = async (
  id: string,
  itemId: string,
  done: boolean,
): Promise<AdrCase> =>
  unwrap(await api.patch(`/crm/adr-cases/${id}/checklist/${itemId}`, { done }));

export const addAdrDisbursement = async (
  id: string,
  dto: {
    label: string;
    category?: DisbursementCategory;
    amount: number;
    currency?: string;
    date?: string;
  },
): Promise<AdrCase> =>
  unwrap(await api.post(`/crm/adr-cases/${id}/disbursements`, dto));

// The real dependency mechanism between ADR and litigation — a
// reasoned action that creates the linked litigation case and
// preserves the full ADR history.
export const escalateAdrToLitigation = async (
  id: string,
  dto: {
    reason: string;
    court?: string;
    courtDivision?: string;
    registry?: string;
    filedOn?: string;
  },
): Promise<{ adrCase: AdrCase; litigationCase: any }> =>
  unwrap(await api.post(`/crm/adr-cases/${id}/escalate`, dto));

// Triggers PDF download directly in the browser — same shared house
// style used across CRM, KYC, and GRC reports.
export const exportAdrReportPdf = (): void => {
  const token = localStorage.getItem("tenantToken");
  const base = import.meta.env.VITE_REACT_APP_BASE_URL;
  const filename = `adr-case-register-${new Date().toISOString().split("T")[0]}.pdf`;
  fetch(`${base}/crm/adr-cases/report/export`, {
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

export const exportAdrAuditTrailPdf = (
  caseId: string,
  caseRef: string,
): void => {
  const token = localStorage.getItem("tenantToken");
  const base = import.meta.env.VITE_REACT_APP_BASE_URL;
  const filename = `audit-trail-${caseRef}-${new Date().toISOString().split("T")[0]}.pdf`;
  fetch(`${base}/crm/adr-cases/${caseId}/audit-trail/export`, {
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

// ── Communication ────────────────────────────────────────────
export interface AdrCaseMessage {
  _id: string;
  caseId: string;
  direction: "tenant" | "client";
  author: string;
  body: string;
  createdAt: string;
}

export const fetchAdrMessages = async (
  caseId: string,
): Promise<AdrCaseMessage[]> => {
  const res = await api.get(`/crm/adr-cases/${caseId}/messages`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const sendAdrMessage = async (
  caseId: string,
  author: string,
  body: string,
): Promise<AdrCaseMessage> => {
  const res = await api.post(`/crm/adr-cases/${caseId}/messages`, {
    author,
    body,
  });
  return unwrap(res);
};

export const sendAdrPartyEmail = async (
  caseId: string,
  dto: { partyIds: string[]; subject: string; body: string },
): Promise<{ success: boolean; sentTo: string[] }> => {
  const res = await api.post(`/crm/adr-cases/${caseId}/party-email`, dto);
  return unwrap(res);
};

// ── Drafting ──────────────────────────────────────────────────
export interface AdrDraftVersion {
  _id: string;
  versionNumber: number;
  content: string;
  savedBy: string;
  savedAt: string;
}
export interface AdrDraft {
  _id: string;
  caseId: string;
  title: string;
  content: string;
  status: "Draft" | "In review" | "Final";
  sourceTemplateId: string;
  sourceTemplateTitle: string;
  versions: AdrDraftVersion[];
  currentVersion: number;
  documentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const fetchAdrDrafts = async (caseId: string): Promise<AdrDraft[]> => {
  const res = await api.get(`/crm/adr-cases/${caseId}/drafts`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const createAdrDraft = async (
  caseId: string,
  dto: { title: string; templateId?: string },
): Promise<AdrDraft> =>
  unwrap(await api.post(`/crm/adr-cases/${caseId}/drafts`, dto));

export const saveAdrDraftVersion = async (
  caseId: string,
  draftId: string,
  content: string,
): Promise<AdrDraft> =>
  unwrap(
    await api.patch(`/crm/adr-cases/${caseId}/drafts/${draftId}`, { content }),
  );

export const updateAdrDraftStatus = async (
  caseId: string,
  draftId: string,
  status: AdrDraft["status"],
): Promise<AdrDraft> =>
  unwrap(
    await api.patch(`/crm/adr-cases/${caseId}/drafts/${draftId}/status`, {
      status,
    }),
  );

// ── Documents ─────────────────────────────────────────────────
export interface AdrDocument {
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

export const fetchAdrFolders = async (caseId: string): Promise<string[]> => {
  const res = await api.get(`/crm/adr-cases/${caseId}/folders`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : ["General"];
};

export const createAdrFolder = async (
  caseId: string,
  name: string,
): Promise<string[]> =>
  unwrap(await api.post(`/crm/adr-cases/${caseId}/folders`, { name }));

export const fetchAdrDocuments = async (
  caseId: string,
): Promise<AdrDocument[]> => {
  const res = await api.get(`/crm/adr-cases/${caseId}/documents`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const uploadAdrDocument = async (
  caseId: string,
  folder: string,
  file: File,
): Promise<AdrDocument> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(
    `/crm/adr-cases/${caseId}/documents?folder=${encodeURIComponent(folder)}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return unwrap(res);
};

// ── My Cases (employee-facing) ──────────────────────────────────
export const fetchMyCases = async (): Promise<AdrCase[]> => {
  const res = await api.get("/crm/my-cases");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const fetchMyCaseDetail = async (id: string): Promise<AdrCase> =>
  unwrap(await api.get(`/crm/my-cases/${id}`));

export const logMyCaseTime = async (
  caseId: string,
  dto: { narrative?: string; date: string; hours: number; billable?: boolean },
): Promise<void> => {
  await api.post(`/crm/my-cases/${caseId}/time`, dto);
};

export const logMyCaseCall = async (
  caseId: string,
  summary: string,
): Promise<AdrCase> =>
  unwrap(await api.post(`/crm/my-cases/${caseId}/call`, { summary }));

// ── Deadline rules ───────────────────────────────────────────────
export type DeadlineTriggerSource =
  | "case_filed"
  | "session_date"
  | "settlement"
  | "cascade"
  | "custom";

export interface AdrDeadlineRule {
  _id: string;
  caseId: string;
  triggerLabel: string;
  triggerSource: DeadlineTriggerSource;
  triggerSessionIndex: number | null;
  cascadeFromRuleId: string | null;
  customTriggerDate: string | null;
  ruleLabel: string;
  windowDays: number;
  metAt: string | null;
  triggerDate: string | null;
  dueDate: string | null;
  status: "not_triggered" | "due" | "overdue" | "met";
}

export interface CreateAdrDeadlineRulePayload {
  triggerLabel: string;
  triggerSource: DeadlineTriggerSource;
  triggerSessionIndex?: number;
  cascadeFromRuleId?: string;
  customTriggerDate?: string;
  ruleLabel: string;
  windowDays: number;
}

export const fetchAdrDeadlineRules = async (
  caseId: string,
): Promise<AdrDeadlineRule[]> => {
  const res = await api.get(`/crm/adr-cases/${caseId}/deadline-rules`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const createAdrDeadlineRule = async (
  caseId: string,
  dto: CreateAdrDeadlineRulePayload,
): Promise<AdrDeadlineRule> =>
  unwrap(await api.post(`/crm/adr-cases/${caseId}/deadline-rules`, dto));

export const updateAdrDeadlineRule = async (
  caseId: string,
  ruleId: string,
  dto: Partial<CreateAdrDeadlineRulePayload>,
): Promise<AdrDeadlineRule> =>
  unwrap(
    await api.patch(`/crm/adr-cases/${caseId}/deadline-rules/${ruleId}`, dto),
  );

export const markAdrDeadlineRuleMet = async (
  caseId: string,
  ruleId: string,
): Promise<AdrDeadlineRule> =>
  unwrap(
    await api.post(
      `/crm/adr-cases/${caseId}/deadline-rules/${ruleId}/mark-met`,
    ),
  );
