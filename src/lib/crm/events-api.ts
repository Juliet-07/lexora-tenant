import { api } from "../api";

// Real CRM → Tools → Event Management API — replaces the former
// browser-local prototype (eventsStore.ts). Publishing an event
// really emails every invitee; External invitees register via their
// own personal link, InHouse invitees acknowledge attendance from
// their own portal (client portal / board portal / employee
// dashboard) — see event.schema.ts on the backend for the full
// reasoning.

const unwrap = (res: any) => res.data?.data ?? res.data;

export type EventType =
  | "Webinar"
  | "Conference"
  | "Workshop"
  | "Networking"
  | "Client briefing";
export const EVENT_TYPES: EventType[] = [
  "Webinar",
  "Conference",
  "Workshop",
  "Networking",
  "Client briefing",
];

export type EventMode = "InHouse" | "External";
export type EventStatus = "Draft" | "Published" | "Completed" | "Cancelled";
export type EventAudienceType =
  | "Client"
  | "BoardMember"
  | "Employee"
  | "Contact";
export type EventInviteStatus =
  | "Invited"
  | "Registered"
  | "Acknowledged"
  | "Declined";

export interface EventInvite {
  id: string;
  audienceType: EventAudienceType;
  sourceId: string;
  name: string;
  email: string;
  organisation: string;
  status: EventInviteStatus;
  token: string;
  sentAt: string | null;
  deliveryError: string | null;
  respondedAt: string | null;
  phone: string;
  notes: string;
  // Lifecycle — null means "not recorded": the registration /
  // acknowledgement signal then counts as attendance.
  attended?: boolean | null;
  attendanceRecordedAt?: string | null;
  syncedToContact?: boolean;
  feedbackRating?: number | null;
  feedbackComment?: string;
  feedbackAt?: string | null;
}

export type EventPhase = "Pre-event" | "During" | "Post-event" | "Cancelled";
export type ScheduleStatus =
  | "Off"
  | "Pending"
  | "Sending"
  | "Sent"
  | "Skipped"
  | "Failed";
export type PipelineState = "done" | "active" | "pending" | "skipped";

export interface EventAutomation {
  configured: boolean;
  reminderWeek: boolean;
  reminderDay: boolean;
  reminderHour: boolean;
  customReminderHours: number | null;
  thankYouEnabled: boolean;
  thankYouDelayHours: number;
  feedbackEnabled: boolean;
  feedbackDelayHours: number;
  recordingEnabled: boolean;
  recordingDelayHours: number;
  noShowEnabled: boolean;
  noShowDelayHours: number;
  syncContacts: boolean;
  notifyOrganiser: boolean;
}

export interface EventStats {
  invited: number;
  sent: number;
  failed: number;
  responded: number;
  declined: number;
  attendedInvites: number;
  walkIns: number;
  totalAttendance: number;
  noShows: number;
  attendanceRate: number | null;
  feedbackResponses: number;
  feedbackScore: number | null;
  spotsLeft: number | null;
}

export interface EventScheduleItem {
  key: string;
  label: string;
  group: "pre" | "post" | "organiser";
  audience: string;
  dueAt: string;
  status: ScheduleStatus;
  note: string;
  manual: boolean;
  recipients: number;
  delivered: number;
  failed: number;
  ranAt: string | null;
  overdue: boolean;
}

export interface EventPipelineStage {
  key: string;
  label: string;
  state: PipelineState;
  detail: string;
}

export interface EventOutcome {
  walkIns?: number;
  avgSessionDuration?: string;
  leadsGenerated?: number;
  followUpCallsBooked?: number;
  newContacts?: number;
  recordingUrl?: string;
  materialsUrl?: string;
  notes?: string;
  recordedAt?: string | null;
  attendanceRecordedAt?: string | null;
}

export interface EventActivityItem {
  at: string;
  kind: string;
  message: string;
}

export interface EventLifecycle {
  phase: EventPhase;
  startsAt: string;
  endsAt: string;
  stats: EventStats;
  schedule: EventScheduleItem[];
  pipeline: EventPipelineStage[];
  attendanceRecorded: boolean;
  resultsRecorded: boolean;
}

export interface CrmEvent {
  _id: string;
  title: string;
  type: EventType;
  mode: EventMode;
  status: EventStatus;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  virtual: boolean;
  meetingLink: string;
  capacity: number;
  host: string;
  agenda: string;
  registrationDeadline: string | null;
  invites: EventInvite[];
  publishedAt: string | null;
  createdAt: string;
  timezone?: string;
  completedAt?: string | null;
  autoCompleted?: boolean;
  automation?: EventAutomation;
  outcome?: EventOutcome;
  activity?: EventActivityItem[];
  lifecycle?: EventLifecycle;
}

export interface EventPayload {
  title: string;
  type: EventType;
  mode: EventMode;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  virtual?: boolean;
  meetingLink?: string;
  capacity?: number;
  host?: string;
  agenda?: string;
  registrationDeadline?: string;
  timezone?: string;
}

export interface EventInviteeRef {
  audienceType: EventAudienceType;
  sourceId: string;
}

export const fetchEvents = async (): Promise<CrmEvent[]> => {
  const res = await api.get("/tools/events");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const fetchEvent = async (id: string): Promise<CrmEvent> =>
  unwrap(await api.get(`/tools/events/${id}`));
export const createEvent = async (dto: EventPayload): Promise<CrmEvent> =>
  unwrap(await api.post("/tools/events", dto));
export const updateEvent = async (
  id: string,
  dto: EventPayload,
): Promise<CrmEvent> => unwrap(await api.patch(`/tools/events/${id}`, dto));
export const deleteEvent = async (id: string): Promise<{ deleted: boolean }> =>
  unwrap(await api.delete(`/tools/events/${id}`));
export const inviteToEvent = async (
  id: string,
  invitees: EventInviteeRef[],
): Promise<CrmEvent> =>
  unwrap(await api.post(`/tools/events/${id}/invite`, { invitees }));
export const removeEventInvite = async (
  id: string,
  inviteId: string,
): Promise<CrmEvent> =>
  unwrap(await api.delete(`/tools/events/${id}/invites/${inviteId}`));
export const publishEvent = async (id: string): Promise<CrmEvent> =>
  unwrap(await api.post(`/tools/events/${id}/publish`));
export const cancelEvent = async (
  id: string,
  dto: { notifyInvitees?: boolean; reason?: string } = {},
): Promise<CrmEvent> =>
  unwrap(await api.post(`/tools/events/${id}/cancel`, dto));
export const completeEvent = async (id: string): Promise<CrmEvent> =>
  unwrap(await api.post(`/tools/events/${id}/complete`));

// ── Lifecycle: automation, attendance, results ───────────────

export type EventAutomationPatch = Partial<Omit<EventAutomation, "configured">>;

export const updateEventAutomation = async (
  id: string,
  dto: EventAutomationPatch,
): Promise<CrmEvent> =>
  unwrap(await api.patch(`/tools/events/${id}/automation`, dto));
export const sendEventAutomationStep = async (
  id: string,
  key: string,
): Promise<CrmEvent> =>
  unwrap(
    await api.post(
      `/tools/events/${id}/automation/${encodeURIComponent(key)}/send`,
    ),
  );
export const markEventAttendance = async (
  id: string,
  dto: {
    entries?: { inviteId: string; attended: boolean | null }[];
    markAllRespondedAttended?: boolean;
  },
): Promise<CrmEvent> =>
  unwrap(await api.post(`/tools/events/${id}/attendance`, dto));
export const recordEventOutcome = async (
  id: string,
  dto: {
    walkIns?: number;
    avgSessionDuration?: string;
    leadsGenerated?: number;
    followUpCallsBooked?: number;
    newContacts?: number;
    recordingUrl?: string;
    materialsUrl?: string;
    notes?: string;
  },
): Promise<CrmEvent> =>
  unwrap(await api.patch(`/tools/events/${id}/outcome`, dto));

// ── Public registration (no auth) ─────────────────────────────

export interface PublicEventView {
  title: string;
  type: EventType;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  virtual: boolean;
  meetingLink: string;
  agenda: string;
  host: string;
  capacity: number;
  registrationDeadline: string | null;
  status: EventStatus;
  registeredCount: number;
  invite: {
    name: string;
    email: string;
    organisation: string;
    status: EventInviteStatus;
  };
}

// Bypasses the shared `api` axios instance — same reasoning as the
// contract-signing public API: a visitor on this page is frequently
// not a logged-in tenant user at all, and this keeps any tenant
// Bearer token that happens to be in this browser out of a public
// request entirely.
import axios from "axios";
const PUBLIC_API_BASE = (api.defaults as any)?.baseURL ?? "/api";
const publicApi = axios.create({ baseURL: PUBLIC_API_BASE });

export const fetchPublicEventByToken = async (
  token: string,
): Promise<PublicEventView> => {
  const res = await publicApi.get(`/tools/events/register/${token}`);
  return res.data?.data ?? res.data;
};

export const registerForEvent = async (
  token: string,
  dto: {
    name: string;
    email: string;
    organisation?: string;
    phone?: string;
    notes?: string;
  },
): Promise<{ ok: boolean }> => {
  const res = await publicApi.post(`/tools/events/register/${token}`, dto);
  return res.data?.data ?? res.data;
};

// ── Employee self-service ──────────────────────────────────────
// Sanitized portal shape (EventService#sanitizeForPortal) — only
// this employee's own `myStatus`, never the rest of the guest list.

export interface MyPortalEvent {
  _id: string;
  title: string;
  type: EventType;
  status: EventStatus;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  virtual: boolean;
  meetingLink: string;
  host: string;
  agenda: string;
  myStatus: EventInviteStatus | null;
}

export const fetchMyEvents = async (): Promise<MyPortalEvent[]> => {
  const res = await api.get("/crm/my-events");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const acknowledgeMyEvent = async (
  id: string,
): Promise<{ acknowledged: boolean }> =>
  unwrap(await api.post(`/crm/my-events/${id}/acknowledge`));

// ── Public feedback (no auth) — the link in the post-event email ──

export interface PublicEventFeedbackView {
  title: string;
  type: EventType;
  when: string;
  host: string;
  open: boolean;
  alreadySubmitted: boolean;
  invite: { name: string };
}

export const fetchEventFeedbackByToken = async (
  token: string,
): Promise<PublicEventFeedbackView> => {
  const res = await publicApi.get(`/tools/events/feedback/${token}`);
  return res.data?.data ?? res.data;
};
export const submitEventFeedback = async (
  token: string,
  dto: { rating: number; comment?: string },
): Promise<{ ok: boolean }> => {
  const res = await publicApi.post(`/tools/events/feedback/${token}`, dto);
  return res.data?.data ?? res.data;
};
