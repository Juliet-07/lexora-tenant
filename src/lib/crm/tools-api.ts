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
  createdAt: string;
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
  // Real marker set at generation time — distinguishes a contract
  // issued as part of KYC onboarding or vendor management from an
  // ordinary CRM contract.
  origin?: "crm" | "kyc_onboarding" | "vendor";
  // Real link back to the vendor this contract is with — set only
  // by the vendor-management flow.
  vendorId?: string | null;
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

// Real, filtered list for the KYC onboarding module's own
// Contracting tab — every contract issued as part of onboarding a
// client, never the tenant's whole CRM contract book.
export const fetchOnboardingContracts = async (): Promise<
  SignableContract[]
> => {
  const res = await api.get("/tenant/onboarding-contracts");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
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
  tenantRegisteredAddress?: string;
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
// Which real tenant-side audience a segment draws from. Rule mode
// only exists for Client today — Contact/BoardMember segments are
// always manual (see the backend's SegmentService.resolveMembers).
export type SegmentAudience = "Client" | "Contact" | "BoardMember";

export interface SegmentRule {
  field: SegmentRuleField;
  value: string;
}
export interface Segment {
  _id: string;
  name: string;
  description: string;
  mode: SegmentMode;
  audience: SegmentAudience;
  memberIds: string[];
  rule: SegmentRule | null;
  memberCount: number;
  // People the segment would hold but who have unsubscribed — they're
  // skipped, not counted in memberCount.
  unsubscribedCount?: number;
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
  audience: SegmentAudience;
  memberIds?: string[];
  rule?: SegmentRule;
}): Promise<Segment> => unwrap(await api.post("/tools/segments", dto));
export const updateSegment = async (
  id: string,
  dto: {
    name: string;
    description?: string;
    mode: SegmentMode;
    audience: SegmentAudience;
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

// "Event invite" was retired Oct 2026 — Event Management (events-api,
// backed by the real backend Event module) is the one real place an
// event lives now.
export type CampaignType = "Newsletter";
export type CampaignStatus = "Draft" | "Scheduled" | "Sending" | "Sent";

export interface CampaignEventDetails {
  title: string;
  dateTime: string;
  location: string;
  rsvp: boolean;
}
export interface CampaignRecipient {
  // Generalised for Contact/BoardMember audiences — sourceType/
  // sourceId are the real identity now; clientId stays populated
  // only when sourceType is "Client".
  sourceType: SegmentAudience;
  sourceId: string;
  clientId: string | null;
  clientName: string;
  email: string;
  delivered: boolean;
  deliveryError: string | null;
  opened: boolean;
  clicked: boolean;
  rsvped: boolean;
}
export type NewsletterTemplate =
  | "RegulatoryAlert"
  | "QuarterlyRoundup"
  | "ArticleSpotlight"
  | "EventInvite";
export interface CampaignContentPayload {
  subject?: string;
  body?: string;
  previewText?: string;
  template?: NewsletterTemplate;
  templateData?: Record<string, any>;
}
export interface Campaign {
  _id: string;
  name: string;
  type: CampaignType;
  // Plural — a campaign can target several segments (of mixed
  // audiences) at once.
  segmentIds: string[];
  segmentNames: string[];
  subject: string;
  body: string;
  // Template newsletters: `template` + `templateData` are the source of
  // truth (the editor reloads from them); `body` is the rendered
  // portal-safe fragment the client/board portals display.
  previewText?: string;
  template?: NewsletterTemplate | null;
  templateData?: Record<string, any>;
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
export const createCampaign = async (
  dto: {
    name: string;
    type: CampaignType;
    segmentIds: string[];
  } & CampaignContentPayload,
): Promise<Campaign> => unwrap(await api.post("/tools/campaigns", dto));
export const updateCampaign = async (
  id: string,
  dto: {
    name: string;
    type: CampaignType;
    segmentIds: string[];
  } & CampaignContentPayload,
): Promise<Campaign> => unwrap(await api.patch(`/tools/campaigns/${id}`, dto));
export const previewNewsletter = async (dto: {
  template: NewsletterTemplate;
  templateData: Record<string, any>;
  previewText?: string;
}): Promise<{ html: string; missingFields: string[] }> =>
  unwrap(await api.post("/tools/campaigns/preview", dto));
export const uploadNewsletterImage = async (file: File): Promise<string> => {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post("/tools/campaigns/media", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrap(res).url;
};
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
// Newsletter — Alerts
// ══════════════════════════════════════════════════════════════

export type AlertCategory =
  | "Regulatory"
  | "Legal"
  | "Financial"
  | "Compliance"
  | "Operations"
  | "System"
  | "Industry"
  | "Health & Safety"
  | "Environmental"
  | "Technology"
  | "Supply chain";
export const ALERT_CATEGORIES: AlertCategory[] = [
  "Regulatory",
  "Legal",
  "Financial",
  "Compliance",
  "Operations",
  "System",
  "Industry",
  "Health & Safety",
  "Environmental",
  "Technology",
  "Supply chain",
];
// Emoji shown next to each category pill in the prototype's design —
// kept as a lookup rather than baked into the category string itself.
export const ALERT_CATEGORY_ICON: Record<AlertCategory, string> = {
  Regulatory: "🏛",
  Legal: "⚖",
  Financial: "💰",
  Compliance: "📋",
  Operations: "🏗",
  System: "⚙",
  Industry: "📢",
  "Health & Safety": "🦺",
  Environmental: "🌱",
  Technology: "💻",
  "Supply chain": "🚚",
};

export type AlertPriority = "Critical" | "High" | "Medium" | "Low";
export const ALERT_PRIORITIES: AlertPriority[] = [
  "Critical",
  "High",
  "Medium",
  "Low",
];

export type AlertStatus = "Draft" | "Scheduled" | "Sending" | "Sent";

export interface Alert {
  _id: string;
  title: string;
  category: AlertCategory;
  priority: AlertPriority;
  triggerType: string;
  source: string;
  summary: string;
  actionRequired: string;
  effectiveDate: string | null;
  deadline: string | null;
  segmentIds: string[];
  segmentNames: string[];
  status: AlertStatus;
  scheduledAt: string | null;
  sentAt: string | null;
  recipients: CampaignRecipient[];
  createdAt: string;
}

export interface AlertPayload {
  title: string;
  category: AlertCategory;
  priority: AlertPriority;
  triggerType?: string;
  source?: string;
  summary: string;
  actionRequired?: string;
  effectiveDate?: string;
  deadline?: string;
  segmentIds: string[];
}

export const fetchAlerts = async (): Promise<Alert[]> => {
  const res = await api.get("/tools/alerts");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const fetchAlert = async (id: string): Promise<Alert> =>
  unwrap(await api.get(`/tools/alerts/${id}`));
export const createAlert = async (dto: AlertPayload): Promise<Alert> =>
  unwrap(await api.post("/tools/alerts", dto));
export const updateAlert = async (
  id: string,
  dto: AlertPayload,
): Promise<Alert> => unwrap(await api.patch(`/tools/alerts/${id}`, dto));
export const deleteAlert = async (id: string): Promise<{ deleted: boolean }> =>
  unwrap(await api.delete(`/tools/alerts/${id}`));
export const scheduleAlert = async (
  id: string,
  scheduledAt: string,
): Promise<Alert> =>
  unwrap(await api.post(`/tools/alerts/${id}/schedule`, { scheduledAt }));
export const unscheduleAlert = async (id: string): Promise<Alert> =>
  unwrap(await api.post(`/tools/alerts/${id}/unschedule`));
export const sendAlertNow = async (id: string): Promise<Alert> =>
  unwrap(await api.post(`/tools/alerts/${id}/send-now`));
export const sendAlertTest = async (
  id: string,
  to: string,
): Promise<{ sent: boolean }> =>
  unwrap(await api.post(`/tools/alerts/${id}/send-test`, { to }));

// ══════════════════════════════════════════════════════════════
// Calendar
// ══════════════════════════════════════════════════════════════

export type CalendarLayer =
  | "Personal"
  | "Team"
  | "Client"
  | "Compliance"
  | "ADR"
  | "Litigation"
  | "Contract"
  | "Finance"
  | "HR"
  | "Event";
export type RecurrenceRule =
  | "None"
  | "Daily"
  | "Weekly"
  | "Monthly"
  | "Quarterly"
  | "Annually";
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
  moduleKey?: string;
  areaKey?: string;
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
// The real picker for generating a new contract — every published
// platform template, each carrying its real folderId. moduleKey
// narrows to templates tagged for a specific real use (e.g.
// 'kyc_aml' for client onboarding).
export const fetchAvailableTemplates = async (
  moduleKey?: string,
  areaKey?: string,
): Promise<AvailableTemplate[]> => {
  const res = await api.get("/tools/contract-templates/available", {
    params: { moduleKey, areaKey },
  });
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
  vendorId?: string;
  counterparty?: string;
  counterpartyEmail?: string;
  value?: number;
  currency?: string;
  // Free-text scope of work / deliverables, one item per line —
  // merged into the drafted document as {{scopeOfWork}} (a real
  // numbered list) when the template references it.
  scopeOfWork?: string;
  // Engagement-letter fields — all optional, merged in only when the
  // chosen template actually references the matching {{token}}.
  tenantCompanyJurisdiction?: string;
  clientJurisdiction?: string;
  leadProfessionalName?: string;
  leadProfessionalTitle?: string;
  clientRepresentativeName?: string;
  clientRepresentativeTitle?: string;
  commencementDate?: string;
  engagementDuration?: string;
  expiresOn: string;
  autoRenew?: boolean;
  mandateId?: string;
  mandateName?: string;
  tenantRegisteredAddress?: string;
  clientRegisteredAddress?: string;
  serviceCategory?: string;
}): Promise<SignableContract> =>
  unwrap(await api.post("/tools/contracts/generate-from-template", dto));

// A single vendor's own contracts — the real filtered list, not the
// tenant's whole CRM contract book.
export const fetchVendorContracts = async (
  vendorId: string,
): Promise<SignableContract[]> => {
  const res = await api.get(`/tools/contracts/vendor/${vendorId}`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

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
  dto: {
    renderedBody: string;
    changeNote?: string;
    // Values changed in the editor's Merge fields panel, keyed by field
    // name — written back to the contract's saved details.
    mergeFieldValues?: Record<string, string>;
  },
): Promise<SignableContract> =>
  unwrap(await api.patch(`/tools/contracts/${id}/body`, dto));

// Re-applies merge-field substitution using the contract's own saved
// details — fixes a contract whose rendered body still shows a
// literal {{token}} for a field that didn't exist yet when it was
// generated, without recreating the contract from scratch.
export const resyncContractMergeFields = async (
  id: string,
): Promise<SignableContract & { unresolvedMergeFields?: string[] }> =>
  unwrap(await api.post(`/tools/contracts/${id}/resync-merge-fields`, {}));

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

// Real, fully-executed copy — only ever succeeds once the backend's
// own guard confirms both parties have actually signed. Opens in a
// new tab rather than downloading, since "view" and "download" are
// different real needs.
export const viewSignedContractPdf = async (id: string): Promise<void> => {
  const res = await api.get(`/tools/contracts/${id}/pdf`, {
    responseType: "blob",
  });
  const blob = new Blob([res.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => window.URL.revokeObjectURL(url), 30_000);
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

// ══════════════════════════════════════════════════════════════
// Email footer (social links) + unsubscribes
// ══════════════════════════════════════════════════════════════

export type SocialLinkKey =
  | "website"
  | "linkedin"
  | "x"
  | "facebook"
  | "instagram"
  | "youtube";
export const SOCIAL_LINK_FIELDS: {
  key: SocialLinkKey;
  label: string;
  placeholder: string;
}[] = [
  { key: "website", label: "Website", placeholder: "https://yourcompany.com" },
  {
    key: "linkedin",
    label: "LinkedIn",
    placeholder: "https://linkedin.com/company/yourcompany",
  },
  { key: "x", label: "X (Twitter)", placeholder: "https://x.com/yourcompany" },
  {
    key: "facebook",
    label: "Facebook",
    placeholder: "https://facebook.com/yourcompany",
  },
  {
    key: "instagram",
    label: "Instagram",
    placeholder: "https://instagram.com/yourcompany",
  },
  {
    key: "youtube",
    label: "YouTube",
    placeholder: "https://youtube.com/@yourcompany",
  },
];
export type EmailFooterSettings = Record<SocialLinkKey, string> & {
  address: string;
};
export interface UnsubscribedPerson {
  _id: string;
  email: string;
  name: string;
  role: string;
  reason: string;
  unsubscribedAt: string;
}

export const fetchEmailFooter = async (): Promise<EmailFooterSettings> =>
  unwrap(await api.get("/tools/email-footer"));
export const saveEmailFooter = async (
  dto: Partial<EmailFooterSettings>,
): Promise<EmailFooterSettings> =>
  unwrap(await api.put("/tools/email-footer", dto));
export const fetchUnsubscribed = async (): Promise<UnsubscribedPerson[]> => {
  const d = unwrap(await api.get("/tools/email-footer/unsubscribed"));
  return Array.isArray(d) ? d : [];
};

// Public, token-gated (the link at the bottom of every email).
// Plain axios-style calls through the same client; no auth needed.
export interface UnsubscribeInfo {
  businessName: string;
  email: string;
  unsubscribed: boolean;
}
export const fetchUnsubscribeInfo = async (
  token: string,
): Promise<UnsubscribeInfo> =>
  unwrap(await api.get(`/tools/unsubscribe/${encodeURIComponent(token)}`));
export const submitUnsubscribe = async (
  token: string,
  reason?: string,
): Promise<{ unsubscribed: boolean; businessName: string }> =>
  unwrap(
    await api.post(`/tools/unsubscribe/${encodeURIComponent(token)}`, {
      reason,
    }),
  );
export const submitResubscribe = async (
  token: string,
): Promise<{ unsubscribed: boolean; businessName: string }> =>
  unwrap(
    await api.post(
      `/tools/unsubscribe/${encodeURIComponent(token)}/resubscribe`,
    ),
  );
