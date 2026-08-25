import { api } from "../api";

const unwrap = (res: any) => res.data?.data ?? res.data;

// ══════════════════════════════════════════════════════════════
// Contracts
// ══════════════════════════════════════════════════════════════

export type ContractType = "MSA" | "SOW" | "NDA" | "Lease" | "Supplier";
export type ContractStage =
  | "Draft"
  | "Internal review"
  | "Client review"
  | "Negotiation"
  | "Execution"
  | "Active"
  | "Renewal"
  | "Expiry / Termination";
export const CONTRACT_STAGES: ContractStage[] = [
  "Draft",
  "Internal review",
  "Client review",
  "Negotiation",
  "Execution",
  "Active",
  "Renewal",
  "Expiry / Termination",
];
export type ObligationType =
  | "Deliverable"
  | "Notice period"
  | "Payment"
  | "Covenant";

export type ClauseChangeStatus = "Pending" | "Accepted" | "Rejected";
export interface ClauseChange {
  _id: string;
  clauseRef: string;
  change: string;
  note: string;
  status: ClauseChangeStatus;
}
export interface NegotiationRound {
  _id: string;
  round: number;
  by: string;
  at: string;
  summary: string;
  changes: ClauseChange[];
}
export interface ContractObligation {
  _id: string;
  label: string;
  due: string;
  type: ObligationType;
  leadDays: number;
  done: boolean;
  doneAt: string | null;
}
export interface ContractAmendment {
  _id: string;
  ref: string;
  at: string;
  summary: string;
}
export interface ConditionPrecedent {
  _id: string;
  label: string;
  detail: string;
  satisfied: boolean;
}
export type ApprovalStepStatus =
  | "Waiting"
  | "In review"
  | "Approved"
  | "Rejected";
export interface ApprovalStep {
  _id: string;
  userId: string | null;
  name: string;
  role: string;
  status: ApprovalStepStatus;
  decidedAt: string | null;
  note: string;
}
export interface Contract {
  _id: string;
  ref: string;
  title: string;
  counterparty: string;
  type: ContractType;
  stage: ContractStage;
  value: number;
  currency: string;
  executedOn: string | null;
  effectiveOn: string | null;
  expiresOn: string;
  autoRenew: boolean;
  owner: string;
  clientId: string | null;
  mandateId: string | null;
  mandateName: string;
  rounds: NegotiationRound[];
  obligations: ContractObligation[];
  amendments: ContractAmendment[];
  // ── Governance panel — real, tenant-entered fields ──
  governingLaw: string;
  adrClause: string;
  leadDrafterUserId: string | null;
  leadDrafterName: string;
  noticeDays: number;
  conflictCheckStatus: "Pending" | "Clear" | "Flagged";
  riskClassification: "Low" | "Medium" | "High" | null;
  conditionsPrecedent: ConditionPrecedent[];
  approvalChain: ApprovalStep[];
  // ── Live-computed, never stored — see getById on the backend ──
  tenantBusinessName: string;
  counterpartyKycStatus: string | null;
  counterpartyRegistrationNumber: string | null;
  linkedRisks: {
    _id: string;
    title: string;
    severity: string;
    status: string;
  }[];
}
export interface ObligationDue extends ContractObligation {
  contractId: string;
  contractTitle: string;
  contractRef: string;
}

export const fetchContracts = async (): Promise<SignableContract[]> => {
  const res = await api.get("/tools/contracts");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const fetchContract = async (id: string): Promise<SignableContract> => {
  const d = unwrap(await api.get(`/tools/contracts/${id}`));
  return {
    ...d,
    conditionsPrecedent: d.conditionsPrecedent ?? [],
    rounds: d.rounds ?? [],
    interactions: d.interactions ?? [],
    obligations: d.obligations ?? [],
    amendments: d.amendments ?? [],
    approvalChain: d.approvalChain ?? [],
  };
};
export const fetchExpiringContracts = async (
  withinDays = 90,
): Promise<Contract[]> => {
  const res = await api.get("/tools/contracts/expiring", {
    params: { withinDays },
  });
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const fetchObligationsDue = async (
  withinDays = 90,
): Promise<ObligationDue[]> => {
  const res = await api.get("/tools/contracts/obligations-due", {
    params: { withinDays },
  });
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const createContract = async (dto: {
  title: string;
  // Either a real client, or both fields below for an external
  // party — the backend enforces this and derives name/email from
  // the real client record server-side when clientId is set.
  clientId?: string;
  counterparty?: string;
  counterpartyEmail?: string;
  type: ContractType;
  value?: number;
  currency?: string;
  expiresOn: string;
  autoRenew?: boolean;
  mandateId?: string;
  mandateName?: string;
  content?: string;
}): Promise<SignableContract> =>
  unwrap(await api.post("/tools/contracts", dto));
export const advanceContractStage = async (id: string): Promise<Contract> =>
  unwrap(await api.post(`/tools/contracts/${id}/advance`));
export const executeContract = async (
  id: string,
  dto: { executedOn: string; effectiveOn: string },
): Promise<Contract> =>
  unwrap(await api.post(`/tools/contracts/${id}/execute`, dto));
export const initiateRenewal = async (id: string): Promise<Contract> =>
  unwrap(await api.post(`/tools/contracts/${id}/initiate-renewal`));
export const toggleAutoRenew = async (id: string): Promise<Contract> =>
  unwrap(await api.post(`/tools/contracts/${id}/toggle-auto-renew`));
export const addNegotiationRound = async (
  id: string,
  dto: {
    by: string;
    at: string;
    summary: string;
    changes?: { clauseRef: string; change: string; note?: string }[];
  },
): Promise<Contract> =>
  unwrap(await api.post(`/tools/contracts/${id}/rounds`, dto));
export const updateClauseChangeStatus = async (
  id: string,
  roundId: string,
  changeId: string,
  status: ClauseChangeStatus,
): Promise<Contract> =>
  unwrap(
    await api.patch(
      `/tools/contracts/${id}/rounds/${roundId}/changes/${changeId}`,
      { status },
    ),
  );
export const addAmendment = async (
  id: string,
  dto: { summary: string; newBody?: string },
): Promise<SignableContract> =>
  unwrap(await api.post(`/tools/contracts/${id}/amendments`, dto));
export const addObligation = async (
  id: string,
  dto: { label: string; due: string; type: ObligationType; leadDays?: number },
): Promise<Contract> =>
  unwrap(await api.post(`/tools/contracts/${id}/obligations`, dto));
export const setObligationDone = async (
  id: string,
  obligationId: string,
  done: boolean,
): Promise<Contract> =>
  unwrap(
    await api.post(`/tools/contracts/${id}/obligations/${obligationId}/done`, {
      done,
    }),
  );

// ── Governance panel ────────────────────────────────────────────
export const updateContractGovernance = async (
  id: string,
  dto: Partial<{
    governingLaw: string;
    adrClause: string;
    leadDrafterUserId: string;
    leadDrafterName: string;
    noticeDays: number;
    conflictCheckStatus: "Pending" | "Clear" | "Flagged";
    riskClassification: "Low" | "Medium" | "High";
  }>,
): Promise<Contract> =>
  unwrap(await api.patch(`/tools/contracts/${id}/governance`, dto));

export interface ClauseLibraryEntry {
  _id: string;
  title: string;
  category: string;
  jurisdiction: string;
  body: string;
  approved: boolean;
  version: number;
}
// Real clause library — the same tenant-scoped collection Deals &
// Transactions manages, exposed here under a CRM-gated route.
export const fetchClauseLibrary = async (): Promise<ClauseLibraryEntry[]> => {
  const res = await api.get("/tools/contracts/clause-library");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

// ── Conditions precedent ────────────────────────────────────────
export const addConditionPrecedent = async (
  id: string,
  dto: { label: string; detail?: string },
): Promise<Contract> =>
  unwrap(await api.post(`/tools/contracts/${id}/conditions-precedent`, dto));
export const setConditionPrecedentSatisfied = async (
  id: string,
  conditionId: string,
  satisfied: boolean,
): Promise<Contract> =>
  unwrap(
    await api.patch(
      `/tools/contracts/${id}/conditions-precedent/${conditionId}`,
      { satisfied },
    ),
  );

// ── Approval chain ──────────────────────────────────────────────
// Setting the chain (re)starts it — the first step becomes "In
// review", every other step resets to "Waiting".
export const setApprovalChain = async (
  id: string,
  steps: { userId?: string; name: string; role: string }[],
): Promise<Contract> =>
  unwrap(await api.post(`/tools/contracts/${id}/approval-chain`, { steps }));
// Only the step currently "In review" can be decided — approving it
// advances the next Waiting step to In review.
export const decideApprovalStep = async (
  id: string,
  stepId: string,
  decision: "Approved" | "Rejected",
  note?: string,
): Promise<Contract> =>
  unwrap(
    await api.post(`/tools/contracts/${id}/approval-chain/${stepId}/decide`, {
      decision,
      note,
    }),
  );

// ══════════════════════════════════════════════════════════════
// Comments
// ══════════════════════════════════════════════════════════════

export type CommentSubjectType =
  | "Contract"
  | "Mandate"
  | "Task"
  | "Ticket"
  | "Document"
  | "ADR case";

export interface CommentNode {
  _id: string;
  author: string;
  createdAt: string;
  body: string;
  edited: boolean;
  deleted: boolean;
  reactions: Record<string, string[]>;
  replies: CommentNode[];
}
export interface MentionDirectoryEntry {
  name: string;
  role: string;
}

export const fetchCommentThread = async (
  subjectType: CommentSubjectType,
  subjectId: string,
): Promise<CommentNode[]> => {
  const res = await api.get(`/tools/comments/${subjectType}/${subjectId}`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const addComment = async (
  subjectType: CommentSubjectType,
  subjectId: string,
  dto: { author: string; body: string; parentId?: string },
): Promise<CommentNode> =>
  unwrap(await api.post(`/tools/comments/${subjectType}/${subjectId}`, dto));
export const editComment = async (
  commentId: string,
  body: string,
): Promise<CommentNode> =>
  unwrap(await api.patch(`/tools/comments/${commentId}`, { body }));
export const deleteComment = async (commentId: string): Promise<CommentNode> =>
  unwrap(await api.delete(`/tools/comments/${commentId}`));
export const toggleReaction = async (
  commentId: string,
  emoji: string,
  author: string,
): Promise<CommentNode> =>
  unwrap(
    await api.post(`/tools/comments/${commentId}/react`, { emoji, author }),
  );
export const fetchMentionDirectory = async (): Promise<
  MentionDirectoryEntry[]
> => {
  const res = await api.get("/tools/comments/mention-directory");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

// ══════════════════════════════════════════════════════════════
// Newsletter — Segments
// ══════════════════════════════════════════════════════════════

export type SegmentMode = "manual" | "rule";
export type SegmentRuleField = "classification" | "riskLevel" | "status";

export interface SegmentRule {
  field: SegmentRuleField;
  value: string;
}
export interface Segment {
  _id: string;
  name: string;
  description: string;
  mode: SegmentMode;
  memberIds: string[];
  rule: SegmentRule | null;
  memberCount: number;
}
export interface SegmentMember {
  _id: string;
  name: string;
  email: string;
}

export const fetchSegments = async (): Promise<Segment[]> => {
  const res = await api.get("/tools/segments");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const createSegment = async (dto: {
  name: string;
  description?: string;
  mode: SegmentMode;
  memberIds?: string[];
  rule?: SegmentRule;
}): Promise<Segment> => unwrap(await api.post("/tools/segments", dto));
export const updateSegment = async (
  id: string,
  dto: {
    name: string;
    description?: string;
    mode: SegmentMode;
    memberIds?: string[];
    rule?: SegmentRule;
  },
): Promise<Segment> => unwrap(await api.patch(`/tools/segments/${id}`, dto));
export const deleteSegment = async (
  id: string,
): Promise<{ deleted: boolean }> =>
  unwrap(await api.delete(`/tools/segments/${id}`));
export const fetchSegmentMembers = async (
  id: string,
): Promise<SegmentMember[]> => {
  const res = await api.get(`/tools/segments/${id}/members`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

// ══════════════════════════════════════════════════════════════
// Newsletter — Campaigns
// ══════════════════════════════════════════════════════════════

export type CampaignType = "Newsletter" | "Event invite";
export type CampaignStatus = "Draft" | "Scheduled" | "Sending" | "Sent";

export interface CampaignEventDetails {
  title: string;
  dateTime: string;
  location: string;
  rsvp: boolean;
}
export interface CampaignRecipient {
  clientId: string;
  clientName: string;
  email: string;
  delivered: boolean;
  deliveryError: string | null;
  opened: boolean;
  clicked: boolean;
  rsvped: boolean;
}
export interface Campaign {
  _id: string;
  name: string;
  type: CampaignType;
  segmentId: string;
  segmentName: string;
  subject: string;
  body: string;
  event: CampaignEventDetails | null;
  status: CampaignStatus;
  scheduledAt: string | null;
  sentAt: string | null;
  recipients: CampaignRecipient[];
  createdAt: string;
}

export const fetchCampaigns = async (): Promise<Campaign[]> => {
  const res = await api.get("/tools/campaigns");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const fetchCampaign = async (id: string): Promise<Campaign> =>
  unwrap(await api.get(`/tools/campaigns/${id}`));
export const createCampaign = async (dto: {
  name: string;
  type: CampaignType;
  segmentId: string;
  subject?: string;
  body?: string;
  event?: Partial<CampaignEventDetails>;
}): Promise<Campaign> => unwrap(await api.post("/tools/campaigns", dto));
export const updateCampaign = async (
  id: string,
  dto: {
    name: string;
    type: CampaignType;
    segmentId: string;
    subject?: string;
    body?: string;
    event?: Partial<CampaignEventDetails>;
  },
): Promise<Campaign> => unwrap(await api.patch(`/tools/campaigns/${id}`, dto));
export const duplicateCampaign = async (id: string): Promise<Campaign> =>
  unwrap(await api.post(`/tools/campaigns/${id}/duplicate`));
export const deleteCampaign = async (
  id: string,
): Promise<{ deleted: boolean }> =>
  unwrap(await api.delete(`/tools/campaigns/${id}`));
export const scheduleCampaign = async (
  id: string,
  scheduledAt: string,
): Promise<Campaign> =>
  unwrap(await api.post(`/tools/campaigns/${id}/schedule`, { scheduledAt }));
export const unscheduleCampaign = async (id: string): Promise<Campaign> =>
  unwrap(await api.post(`/tools/campaigns/${id}/unschedule`));
export const sendCampaignNow = async (id: string): Promise<Campaign> =>
  unwrap(await api.post(`/tools/campaigns/${id}/send-now`));
export const sendCampaignTest = async (
  id: string,
  to: string,
): Promise<{ sent: boolean }> =>
  unwrap(await api.post(`/tools/campaigns/${id}/send-test`, { to }));

// ══════════════════════════════════════════════════════════════
// Newsletter — Drafts
// ══════════════════════════════════════════════════════════════

export interface NewsletterDraft {
  _id: string;
  title: string;
  source: string;
  body: string;
  generatedAt: string;
  convertedToCampaignId: string | null;
}

export const fetchNewsletterDrafts = async (): Promise<NewsletterDraft[]> => {
  const res = await api.get("/tools/newsletter-drafts");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const generateNewsletterDraft = async (): Promise<NewsletterDraft> =>
  unwrap(await api.post("/tools/newsletter-drafts/generate"));
export const markDraftConverted = async (
  id: string,
  campaignId: string,
): Promise<NewsletterDraft> =>
  unwrap(
    await api.post(`/tools/newsletter-drafts/${id}/mark-converted`, {
      campaignId,
    }),
  );

// ══════════════════════════════════════════════════════════════
// Calendar
// ══════════════════════════════════════════════════════════════

export type CalendarLayer =
  | "Personal"
  | "Team"
  | "Client"
  | "Compliance"
  | "ADR"
  | "Contract";
export type RecurrenceRule = "None" | "Daily" | "Weekly" | "Monthly";
export type VirtualProvider = "Teams" | "Zoom" | "Google Meet";

export interface CalendarEventItem {
  id: string;
  title: string;
  date: string;
  time: string;
  layer: CalendarLayer;
  source: string;
  location: string;
  virtualProvider?: VirtualProvider | null;
  virtualLink?: string;
  recurrence?: RecurrenceRule;
  editable: boolean;
}

export const fetchCalendarEvents = async (): Promise<CalendarEventItem[]> => {
  const res = await api.get("/tools/calendar");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const createCalendarEvent = async (dto: {
  title: string;
  date: string;
  time: string;
  layer: CalendarLayer;
  location?: string;
  virtualProvider?: VirtualProvider;
  virtualLink?: string;
  recurrence?: RecurrenceRule;
  createdBy?: string;
}): Promise<CalendarEventItem> =>
  unwrap(await api.post("/tools/calendar", dto));
export const updateCalendarEvent = async (
  id: string,
  dto: {
    title: string;
    date: string;
    time: string;
    layer: CalendarLayer;
    location?: string;
    virtualProvider?: VirtualProvider;
    virtualLink?: string;
    recurrence?: RecurrenceRule;
  },
): Promise<CalendarEventItem> =>
  unwrap(await api.patch(`/tools/calendar/${id}`, dto));
export const deleteCalendarEvent = async (
  id: string,
): Promise<{ deleted: boolean }> =>
  unwrap(await api.delete(`/tools/calendar/${id}`));

// ══════════════════════════════════════════════════════════════
// Contract Templates (Tenant) — Word documents only
// ══════════════════════════════════════════════════════════════

export type TemplateSourceType = "authored" | "uploaded";

// Template creation was retired for tenants — kept read-only here so
// a contract already generated from a tenant-authored template built
// before that change stays fully readable. No new ones can be made.
export interface TenantContractTemplate {
  _id: string;
  title: string;
  type: ContractType;
  jurisdiction: string;
  description: string;
  sourceType: TemplateSourceType;
  content: string;
  fileUrl: string | null;
  fileName: string | null;
  fileMimeType: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableTemplate {
  _id: string;
  title: string;
  jurisdiction?: string;
  description: string;
  sourceType: TemplateSourceType;
  content: string;
  fileUrl: string | null;
  fileName: string | null;
  source: "platform" | "tenant";
  category?: string;
  type?: ContractType;
  // Real folder from the super admin's library — null/undefined
  // means uncategorized.
  folderId?: string | null;
}

export interface TemplateFolder {
  _id: string;
  name: string;
  description?: string;
  templateCount: number;
}

export const fetchTenantTemplates = async (): Promise<
  TenantContractTemplate[]
> => {
  const res = await api.get("/tools/contract-templates");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
// The real picker for generating a new contract — every published
// platform template, each carrying its real folderId.
export const fetchAvailableTemplates = async (): Promise<
  AvailableTemplate[]
> => {
  const res = await api.get("/tools/contract-templates/available");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const fetchTemplateFolders = async (): Promise<TemplateFolder[]> => {
  const res = await api.get("/tools/contract-templates/folders");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const fetchTenantTemplate = async (
  id: string,
): Promise<TenantContractTemplate> =>
  unwrap(await api.get(`/tools/contract-templates/${id}`));

// ══════════════════════════════════════════════════════════════
// Letterhead (Tenant)
// ══════════════════════════════════════════════════════════════

export interface Letterhead {
  _id: string;
  imageUrl: string;
  imageMimeType: string | null;
  createdAt: string;
  updatedAt: string;
}

export const fetchMyLetterhead = async (): Promise<Letterhead | null> => {
  const res = await api.get("/tools/letterhead");
  return unwrap(res) ?? null;
};
export const uploadLetterhead = async (file: File): Promise<Letterhead> => {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post("/tools/letterhead/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrap(res);
};
export const deleteLetterhead = async (): Promise<{ deleted: boolean }> =>
  unwrap(await api.delete("/tools/letterhead"));

// ══════════════════════════════════════════════════════════════
// Contract e-signature workflow (Tenant side)
// ══════════════════════════════════════════════════════════════

export type SignatureStatus =
  | "not_sent"
  | "sent"
  | "signed"
  | "countersigned"
  | "declined";
export type ToolContractInteractionType =
  | "sent"
  | "viewed"
  | "comment"
  | "tenant_response"
  | "updated"
  | "resent"
  | "signed"
  | "countersigned"
  | "signed_copy_sent"
  | "declined";

export interface ToolContractInteraction {
  type: ToolContractInteractionType;
  occurredAt: string;
  actor: "signer" | "tenant";
  message: string | null;
}
export interface ToolContractSignature {
  signedAt: string;
  signerName: string;
  signatureImageData: string | null;
}
export interface ToolContractTenantSignature {
  signedAt: string;
  signerName: string;
  signatureImageData: string | null;
  stampImageData: string | null;
}

export interface SignableContract extends Contract {
  templateId: string | null;
  templateName: string | null;
  counterpartyEmail: string;
  renderedBody: string;
  requiresSignature: boolean;
  signatureStatus: SignatureStatus;
  interactions: ToolContractInteraction[];
  signature: ToolContractSignature | null;
  tenantSignature: ToolContractTenantSignature | null;
  signedCopySentAt: string | null;
  declinedAt: string | null;
  declineReason: string | null;
}

export const generateContractFromTemplate = async (dto: {
  templateId: string;
  templateSource: "platform" | "tenant";
  title: string;
  type: ContractType;
  clientId?: string;
  counterparty?: string;
  counterpartyEmail?: string;
  value?: number;
  currency?: string;
  expiresOn: string;
  autoRenew?: boolean;
  mandateId?: string;
  mandateName?: string;
}): Promise<SignableContract> =>
  unwrap(await api.post("/tools/contracts/generate-from-template", dto));

// Sending emails a real PDF attachment of the contract-as-it-stands
// alongside the signing link, server-side.
export const sendContractForSignature = async (
  id: string,
  expiresInHours?: number,
): Promise<SignableContract> =>
  unwrap(
    await api.post(`/tools/contracts/${id}/send-for-signature`, {
      expiresInHours,
    }),
  );

export const respondToContractComment = async (
  id: string,
  message: string,
): Promise<SignableContract> =>
  unwrap(await api.post(`/tools/contracts/${id}/respond`, { message }));

export const editContractBody = async (
  id: string,
  dto: { renderedBody: string; changeNote?: string },
): Promise<SignableContract> =>
  unwrap(await api.patch(`/tools/contracts/${id}/body`, dto));

export const countersignContract = async (
  id: string,
  dto: {
    signerName: string;
    signatureImageData?: string;
    stampImageData?: string;
  },
): Promise<SignableContract> =>
  unwrap(await api.post(`/tools/contracts/${id}/countersign`, dto));

export const sendSignedContractCopy = async (
  id: string,
): Promise<SignableContract> =>
  unwrap(await api.post(`/tools/contracts/${id}/send-signed-copy`, {}));

export const downloadContractPdf = async (
  id: string,
  filename?: string,
): Promise<void> => {
  const res = await api.get(`/tools/contracts/${id}/pdf`, {
    responseType: "blob",
  });
  const blob = new Blob([res.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `contract-${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

// Real document preview — works at any status (draft, sent,
// signed...), showing the real letterhead and real current content
// exactly as it stands. Opens in a new tab rather than downloading.
export const previewContractPdf = async (id: string): Promise<void> => {
  const res = await api.get(`/tools/contracts/${id}/preview-pdf`, {
    responseType: "blob",
  });
  const blob = new Blob([res.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  // Revoke after a delay — the new tab needs time to actually load
  // the blob URL before it's invalidated.
  setTimeout(() => window.URL.revokeObjectURL(url), 30_000);
};

// ─────────────────────────────────────────────────────────────
// Contract signing — Public signer-facing API (token-based, no
// auth). Bypasses the shared `api` axios instance's auth handling.
// ─────────────────────────────────────────────────────────────

import axios from "axios";
const PUBLIC_API_BASE = (api.defaults as any)?.baseURL ?? "/api";
const publicApi = axios.create({ baseURL: PUBLIC_API_BASE });

export const fetchToolContractByToken = async (
  token: string,
): Promise<SignableContract> => {
  const res = await publicApi.get(`/tools/contracts/sign/${token}`);
  return res.data?.data ?? res.data;
};
export const submitToolContractComment = async (
  token: string,
  message: string,
): Promise<SignableContract> => {
  const res = await publicApi.post(`/tools/contracts/sign/${token}/comment`, {
    message,
  });
  return res.data?.data ?? res.data;
};
export const signToolContract = async (
  token: string,
  dto: { signerName: string; signatureImageData?: string },
): Promise<SignableContract> => {
  const res = await publicApi.post(`/tools/contracts/sign/${token}/sign`, dto);
  return res.data?.data ?? res.data;
};
export const declineToolContract = async (
  token: string,
  reason?: string,
): Promise<SignableContract> => {
  const res = await publicApi.post(`/tools/contracts/sign/${token}/decline`, {
    reason,
  });
  return res.data?.data ?? res.data;
};
