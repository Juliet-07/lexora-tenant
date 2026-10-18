import { useSyncExternalStore } from "react";

/**
 * Event Management prototype store (CRM → Tools → Events).
 *
 * The governance/CRM API has no event, invite or registration endpoints,
 * so the whole lifecycle (events, invitations, public registrations,
 * check-in) persists in localStorage, seeded with sample data. Invite
 * "dispatch" here is demo tracking only — it is NOT real email delivery.
 * Registrations submitted on the public /event-register/:token page write
 * into this same store, so they are only visible in the same browser.
 */

export type EventType = "Webinar" | "Conference" | "Workshop" | "Networking" | "Client briefing";
export type EventStatus = "Draft" | "Published" | "Completed" | "Cancelled";
export type InviteStatus = "Invited" | "Registered" | "Declined" | "Attended";
export type RegistrationStatus = "Registered" | "Attended" | "Cancelled";

export const EVENT_TYPES: EventType[] = [
  "Webinar",
  "Conference",
  "Workshop",
  "Networking",
  "Client briefing",
];

export interface EventInvite {
  id: string;
  contactId: string | null;
  name: string;
  email: string;
  organisation: string;
  status: InviteStatus;
  token: string;
  sentAt: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  name: string;
  email: string;
  organisation: string;
  phone: string;
  notes: string;
  status: RegistrationStatus;
  registeredAt: string;
  checkedInAt: string | null;
}

export interface CrmEvent {
  id: string;
  title: string;
  type: EventType;
  status: EventStatus;
  description: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;
  location: string;
  virtual: boolean;
  meetingLink: string;
  capacity: number; // 0 = unlimited
  host: string;
  agenda: string;
  registrationDeadline: string; // YYYY-MM-DD or ""
  invites: EventInvite[];
  registrations: EventRegistration[];
  createdAt: string;
}

const KEY = "lexora.crm.events.v1";

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
export const newInviteToken = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

const daysFromNow = (d: number) => {
  const dt = new Date(Date.now() + d * 864e5);
  return dt.toISOString().slice(0, 10);
};

const seed = (): CrmEvent[] => [
  {
    id: "ev-1",
    title: "East Africa Governance Forum 2026",
    type: "Conference",
    status: "Published",
    description:
      "A half-day forum bringing together board chairs, company secretaries and compliance leaders to discuss governance trends shaping East African markets.",
    date: daysFromNow(21),
    startTime: "09:00",
    endTime: "13:00",
    location: "Kigali Convention Centre, Kigali",
    virtual: false,
    meetingLink: "",
    capacity: 120,
    host: "Lexora Advisory",
    agenda:
      "09:00 — Opening keynote: Governance before growth\n10:30 — Panel: Board effectiveness in family enterprises\n12:00 — Networking lunch",
    registrationDeadline: daysFromNow(14),
    invites: [
      {
        id: "inv-1",
        contactId: null,
        name: "Adaeze Nwosu",
        email: "adaeze.nwosu@kanoagro.com",
        organisation: "Kano Agro Holdings",
        status: "Registered",
        token: "demo-token-adaeze",
        sentAt: new Date(Date.now() - 5 * 864e5).toISOString(),
      },
      {
        id: "inv-2",
        contactId: null,
        name: "Thabo Molefe",
        email: "t.molefe@sandtoncap.co.za",
        organisation: "Sandton Capital Partners",
        status: "Invited",
        token: "demo-token-thabo",
        sentAt: new Date(Date.now() - 5 * 864e5).toISOString(),
      },
    ],
    registrations: [
      {
        id: "reg-1",
        eventId: "ev-1",
        name: "Adaeze Nwosu",
        email: "adaeze.nwosu@kanoagro.com",
        organisation: "Kano Agro Holdings",
        phone: "+234 802 114 8890",
        notes: "",
        status: "Registered",
        registeredAt: new Date(Date.now() - 3 * 864e5).toISOString(),
        checkedInAt: null,
      },
    ],
    createdAt: new Date(Date.now() - 10 * 864e5).toISOString(),
  },
  {
    id: "ev-2",
    title: "AML/CFT Refresh Webinar — Q3",
    type: "Webinar",
    status: "Published",
    description:
      "Quarterly refresher on AML/CFT obligations, beneficial-ownership filing updates and practical watchlist screening tips for compliance teams.",
    date: daysFromNow(9),
    startTime: "14:00",
    endTime: "15:30",
    location: "Online",
    virtual: true,
    meetingLink: "https://meet.lexora.example/aml-q3",
    capacity: 0,
    host: "Lexora Compliance",
    agenda: "14:00 — Regulatory update\n14:30 — Screening walkthrough\n15:00 — Q&A",
    registrationDeadline: "",
    invites: [],
    registrations: [],
    createdAt: new Date(Date.now() - 4 * 864e5).toISOString(),
  },
];

interface State {
  events: CrmEvent[];
}

let state: State = load();
const listeners = new Set<() => void>();

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    /* ignore */
  }
  return { events: seed() };
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const getState = () => state;

export function useEventsStore(): State {
  return useSyncExternalStore(subscribe, getState, getState);
}

const updateEvent = (id: string, fn: (e: CrmEvent) => CrmEvent) => {
  state = { events: state.events.map((e) => (e.id === id ? fn(e) : e)) };
  persist();
};

export type UpsertEventPayload = Omit<
  CrmEvent,
  "id" | "invites" | "registrations" | "createdAt"
>;

export function createEvent(payload: UpsertEventPayload): CrmEvent {
  const ev: CrmEvent = {
    ...payload,
    id: uid("ev"),
    invites: [],
    registrations: [],
    createdAt: new Date().toISOString(),
  };
  state = { events: [ev, ...state.events] };
  persist();
  return ev;
}

export function updateEventDetails(id: string, payload: UpsertEventPayload) {
  updateEvent(id, (e) => ({ ...e, ...payload }));
}

export function deleteEvent(id: string) {
  state = { events: state.events.filter((e) => e.id !== id) };
  persist();
}

/**
 * Demo invite dispatch: records invitations for the selected contacts and
 * marks them "Invited". No email is actually sent — see module docstring.
 */
export function sendEventInvites(
  eventId: string,
  contacts: { id: string | null; name: string; email: string; organisation: string }[],
) {
  updateEvent(eventId, (e) => {
    const existing = new Set(e.invites.map((i) => i.email.toLowerCase()));
    const fresh: EventInvite[] = contacts
      .filter((c) => c.email && !existing.has(c.email.toLowerCase()))
      .map((c) => ({
        id: uid("inv"),
        contactId: c.id,
        name: c.name,
        email: c.email,
        organisation: c.organisation,
        status: "Invited",
        token: newInviteToken(),
        sentAt: new Date().toISOString(),
      }));
    return { ...e, invites: [...e.invites, ...fresh] };
  });
}

export function removeInvite(eventId: string, inviteId: string) {
  updateEvent(eventId, (e) => ({
    ...e,
    invites: e.invites.filter((i) => i.id !== inviteId),
  }));
}

/** Public registration via an invite token or the open event link. */
export function registerForEvent(
  eventId: string,
  dto: { name: string; email: string; organisation: string; phone: string; notes: string },
): { ok: boolean; reason?: string; waitlisted?: boolean } {
  const ev = state.events.find((e) => e.id === eventId);
  if (!ev) return { ok: false, reason: "Event not found." };
  if (ev.status !== "Published") return { ok: false, reason: "Registration is not open for this event." };
  if (ev.registrationDeadline && ev.registrationDeadline < new Date().toISOString().slice(0, 10)) {
    return { ok: false, reason: "The registration deadline has passed." };
  }
  const email = dto.email.trim().toLowerCase();
  if (!dto.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, reason: "Please provide your name and a valid email address." };
  }
  if (
    ev.registrations.some(
      (r) => r.email.toLowerCase() === email && r.status !== "Cancelled",
    )
  ) {
    return { ok: false, reason: "This email address is already registered." };
  }
  if (ev.capacity > 0 && ev.registrations.filter((r) => r.status !== "Cancelled").length >= ev.capacity) {
    return { ok: false, reason: "This event has reached full capacity." };
  }
  const reg: EventRegistration = {
    id: uid("reg"),
    eventId,
    name: dto.name.trim(),
    email: dto.email.trim(),
    organisation: dto.organisation.trim(),
    phone: dto.phone.trim(),
    notes: dto.notes.trim(),
    status: "Registered",
    registeredAt: new Date().toISOString(),
    checkedInAt: null,
  };
  updateEvent(eventId, (e) => ({
    ...e,
    registrations: [...e.registrations, reg],
    invites: e.invites.map((i) =>
      i.email.toLowerCase() === email ? { ...i, status: "Registered" } : i,
    ),
  }));
  return { ok: true };
}

export function setRegistrationStatus(
  eventId: string,
  registrationId: string,
  status: RegistrationStatus,
) {
  updateEvent(eventId, (e) => ({
    ...e,
    registrations: e.registrations.map((r) =>
      r.id === registrationId
        ? {
            ...r,
            status,
            checkedInAt:
              status === "Attended" ? r.checkedInAt ?? new Date().toISOString() : null,
          }
        : r,
    ),
    invites: e.invites.map((i) => {
      const reg = e.registrations.find((r) => r.id === registrationId);
      if (reg && i.email.toLowerCase() === reg.email.toLowerCase()) {
        return { ...i, status: status === "Attended" ? "Attended" : status === "Cancelled" ? "Declined" : "Registered" };
      }
      return i;
    }),
  }));
}

export function findEventByInviteToken(token: string): {
  event: CrmEvent;
  invite: EventInvite | null;
} | null {
  for (const event of state.events) {
    const invite = event.invites.find((i) => i.token === token);
    if (invite) return { event, invite };
  }
  // Open registration link: token is the event id.
  const event = state.events.find((e) => e.id === token);
  if (event) return { event, invite: null };
  return null;
}

export const activeRegistrations = (e: CrmEvent) =>
  e.registrations.filter((r) => r.status !== "Cancelled");

export const attendedCount = (e: CrmEvent) =>
  e.registrations.filter((r) => r.status === "Attended").length;
