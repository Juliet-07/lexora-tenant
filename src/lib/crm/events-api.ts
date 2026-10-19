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
export const cancelEvent = async (id: string): Promise<CrmEvent> =>
  unwrap(await api.post(`/tools/events/${id}/cancel`));
export const completeEvent = async (id: string): Promise<CrmEvent> =>
  unwrap(await api.post(`/tools/events/${id}/complete`));

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
