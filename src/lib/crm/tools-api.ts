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

export interface NegotiationRound {
  _id: string;
  round: number;
  by: string;
  at: string;
  summary: string;
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
  mandateId: string | null;
  mandateName: string;
  rounds: NegotiationRound[];
  obligations: ContractObligation[];
  amendments: ContractAmendment[];
}
export interface ObligationDue extends ContractObligation {
  contractId: string;
  contractTitle: string;
  contractRef: string;
}

export const fetchContracts = async (): Promise<Contract[]> => {
  const res = await api.get("/tools/contracts");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const fetchContract = async (id: string): Promise<Contract> =>
  unwrap(await api.get(`/tools/contracts/${id}`));
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
  counterparty: string;
  type: ContractType;
  value?: number;
  currency?: string;
  expiresOn: string;
  autoRenew?: boolean;
  owner?: string;
  mandateId?: string;
  mandateName?: string;
}): Promise<Contract> => unwrap(await api.post("/tools/contracts", dto));
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
  dto: { by: string; at: string; summary: string },
): Promise<Contract> =>
  unwrap(await api.post(`/tools/contracts/${id}/rounds`, dto));
export const addAmendment = async (
  id: string,
  dto: { summary: string },
): Promise<Contract> =>
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

// ══════════════════════════════════════════════════════════════
// Comments — shared thread, keyed by subjectType + subjectId
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
export const sendCampaignNow = async (id: string): Promise<Campaign> =>
  unwrap(await api.post(`/tools/campaigns/${id}/send-now`));
export const sendCampaignTest = async (
  id: string,
  to: string,
): Promise<{ sent: boolean }> =>
  unwrap(await api.post(`/tools/campaigns/${id}/send-test`, { to }));

// ══════════════════════════════════════════════════════════════
// Newsletter — Drafts (from the GRC regulatory feed)
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
  // Only real manual events (source: "Manual") can be edited or
  // deleted — Contract/Compliance/ADR events are computed live from
  // their real source records and have no separate identity to edit.
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
