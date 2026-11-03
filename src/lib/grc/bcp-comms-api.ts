import { api } from "@/lib/api";
import type { BcpIncident } from "@/lib/grc/risk-api";

const unwrap = <T>(res: { data?: { data?: T } | T }): T =>
  ((res.data as { data?: T })?.data ?? res.data) as T;

export const errMessage = (e: unknown, fallback = "Something went wrong") => {
  const m = (e as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message;
  return Array.isArray(m) ? m.join(", ") : (m ?? fallback);
};

export const COMMS_KEY = "grc-bcp-comms";

export type CommsStatus =
  "none" | "draft" | "pending" | "ready" | "sent" | "confirmed" | "standby";
export type CommsMessageStatus = "draft" | "pending" | "ready" | "sent";
export type CommsKind = "initial" | "update";
export type CommsDelivery = "emailed" | "failed" | "manual";
export type CommsGroupSource = "contacts" | "crm_clients";

export interface CommsTrigger {
  minLevel: number | null;
  types: string[];
  flags: string[];
}

export interface CommsContact {
  _id: string;
  groupId: string;
  name: string;
  role: string;
  email: string;
  phone: string;
}

export interface CommsGroup {
  _id: string;
  name: string;
  icon: string;
  color: string;
  order: number;
  slaHours: number | null;
  reactive: boolean;
  channel: string;
  statutory: string;
  ownerEmployeeId: string | null;
  ownerName: string;
  trigger: CommsTrigger;
  approvalMinLevel: number;
  source: CommsGroupSource;
  custom: boolean;
  key: string;
  triggerText?: string;
  contacts?: CommsContact[];
  clientCount?: number;
}

export interface CommsTemplate {
  _id: string;
  name: string;
  groupId: string | null;
  groupName: string;
  description: string;
  subject: string;
  body: string;
  custom: boolean;
  edited: boolean;
  key: string;
}

export interface CommsActor {
  userId: string | null;
  name: string;
}

export interface CommsRecipient {
  kind: "contact" | "client";
  refId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  delivery: CommsDelivery | null;
  error: string;
  deliveredAt: string | null;
}

export interface CommsReceipt {
  at: string;
  ref: string;
  note: string;
  loggedBy: CommsActor;
}

export interface CommsMessage {
  _id: string;
  incidentId: string;
  groupId: string;
  groupName: string;
  channel: string;
  kind: CommsKind;
  templateId: string | null;
  subject: string;
  body: string;
  recipients: CommsRecipient[];
  status: CommsMessageStatus;
  createdBy: CommsActor;
  approvedBy: CommsActor | null;
  approvedAt: string | null;
  submittedAt: string | null;
  sentAt: string | null;
  returnedNote: string;
  confirm: CommsReceipt | null;
  createdAt: string;
}

export interface CommsPlanItem {
  order: number;
  group: CommsGroup;
  status: CommsStatus;
  needsApproval: boolean;
  deadlineAt: string | null;
  lead: {
    _id: string;
    status: CommsMessageStatus;
    createdAt: string;
    submittedAt: string | null;
    sentAt: string | null;
    createdBy: CommsActor;
    confirm: CommsReceipt | null;
  } | null;
}

export interface CommsPlan {
  incident: BcpIncident & { level: number };
  plan: CommsPlanItem[];
  notTriggered: {
    group: CommsGroup;
    needsApproval: boolean;
    triggerText: string;
  }[];
  summary: { required: number; sent: number; messages: number };
  canApprove: boolean;
  serverTime: string;
}

export interface RecipientRef {
  kind: "contact" | "client";
  refId: string;
}

export type SaveAction = "draft" | "submit" | "hold" | "send";

export interface SaveMessageDto {
  groupId: string;
  kind: CommsKind;
  templateId: string | null;
  subject: string;
  body: string;
  recipients: RecipientRef[];
  action: SaveAction;
}

const base = "/grc/risk/bcp/comms";

// ── Plan, notices, record ────────────────────────────────────
export const fetchCommsPlan = async (incidentId: string) =>
  unwrap<CommsPlan>(await api.get(`${base}/incidents/${incidentId}/plan`));

export const fetchCommsMessages = async (incidentId: string) => {
  const d = unwrap<CommsMessage[]>(
    await api.get(`${base}/incidents/${incidentId}/messages`),
  );
  return Array.isArray(d) ? d : [];
};

export const composeComms = async (
  incidentId: string,
  dto: { groupId: string; kind?: CommsKind; templateId?: string },
) =>
  unwrap<{
    templateId: string;
    subject: string;
    body: string;
    channel: string;
    recipients: RecipientRef[];
  }>(await api.post(`${base}/incidents/${incidentId}/compose`, dto));

export const saveCommsMessage = async (
  incidentId: string,
  dto: SaveMessageDto,
  messageId?: string | null,
) =>
  unwrap<CommsMessage>(
    messageId
      ? await api.patch(
          `${base}/incidents/${incidentId}/messages/${messageId}`,
          dto,
        )
      : await api.post(`${base}/incidents/${incidentId}/messages`, dto),
  );

export const issueCommsMessage = async (incidentId: string, id: string) =>
  unwrap<CommsMessage>(
    await api.post(`${base}/incidents/${incidentId}/messages/${id}/issue`, {}),
  );

export const resendFailedComms = async (incidentId: string, id: string) =>
  unwrap<CommsMessage>(
    await api.post(
      `${base}/incidents/${incidentId}/messages/${id}/resend-failed`,
      {},
    ),
  );

export const returnCommsMessage = async (
  incidentId: string,
  id: string,
  dto: { comment: string; subject?: string; body?: string },
) =>
  unwrap<CommsMessage>(
    await api.post(
      `${base}/incidents/${incidentId}/messages/${id}/return`,
      dto,
    ),
  );

export const deleteCommsMessage = async (incidentId: string, id: string) => {
  await api.delete(`${base}/incidents/${incidentId}/messages/${id}`);
};

export const logCommsReceipt = async (
  incidentId: string,
  id: string,
  dto: { receivedAt?: string; reference?: string; note?: string },
) =>
  unwrap<CommsMessage>(
    await api.post(
      `${base}/incidents/${incidentId}/messages/${id}/receipt`,
      dto,
    ),
  );

export const fetchCommsRecord = async (incidentId: string) =>
  unwrap<{ record: string; review: string }>(
    await api.get(`${base}/incidents/${incidentId}/record`),
  );

// ── Stakeholder register ─────────────────────────────────────
export const fetchCommsGroups = async () => {
  const d = unwrap<CommsGroup[]>(await api.get(`${base}/groups`));
  return Array.isArray(d) ? d : [];
};

export interface GroupInput {
  name: string;
  icon: string;
  color: string;
  channel: string;
  statutory: string;
  slaHours: number | null;
  reactive: boolean;
  ownerEmployeeId: string;
  trigger: {
    minLevel: number | null;
    types: string[];
    flags: string[];
  };
  approvalMinLevel: number;
  source: CommsGroupSource;
}

export const createCommsGroup = async (dto: GroupInput) =>
  unwrap<CommsGroup>(await api.post(`${base}/groups`, dto));

export const updateCommsGroup = async (id: string, dto: Partial<GroupInput>) =>
  unwrap<CommsGroup>(await api.patch(`${base}/groups/${id}`, dto));

export const reorderCommsGroups = async (ids: string[]) =>
  unwrap<CommsGroup[]>(await api.post(`${base}/groups/reorder`, { ids }));

export const deleteCommsGroup = async (id: string) => {
  await api.delete(`${base}/groups/${id}`);
};

export const addCommsContact = async (
  groupId: string,
  dto: { name: string; role?: string; email?: string; phone?: string },
) =>
  unwrap<CommsContact>(
    await api.post(`${base}/groups/${groupId}/contacts`, dto),
  );

export const deleteCommsContact = async (id: string) => {
  await api.delete(`${base}/contacts/${id}`);
};

export interface CommsClient {
  _id: string;
  name: string;
  email: string;
}
export const fetchCommsClients = async (search?: string) => {
  const d = unwrap<CommsClient[]>(
    await api.get(`${base}/clients`, { params: search ? { search } : {} }),
  );
  return Array.isArray(d) ? d : [];
};

// ── Templates ────────────────────────────────────────────────
export const fetchCommsTemplates = async () =>
  unwrap<{
    templates: CommsTemplate[];
    mergeFields: { key: string; label: string }[];
  }>(await api.get(`${base}/templates`));

export interface TemplateInput {
  name: string;
  groupId: string | null;
  description: string;
  subject: string;
  body: string;
}
export const createCommsTemplate = async (dto: TemplateInput) =>
  unwrap<CommsTemplate>(await api.post(`${base}/templates`, dto));
export const updateCommsTemplate = async (
  id: string,
  dto: Partial<TemplateInput>,
) => unwrap<CommsTemplate>(await api.patch(`${base}/templates/${id}`, dto));
export const deleteCommsTemplate = async (id: string) => {
  await api.delete(`${base}/templates/${id}`);
};
