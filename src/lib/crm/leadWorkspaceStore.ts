import { useSyncExternalStore } from "react";

/**
 * Per-lead workspace: communications, meetings and notes captured while
 * working a lead in the pipeline side panel. Documents are deliberately
 * not part of this workspace.
 * Prototype persistence: localStorage.
 */

export type CommChannel = "email" | "call" | "whatsapp" | "meeting_note";

export interface LeadComm {
  id: string;
  at: string;
  channel: CommChannel;
  subject: string;
  summary: string;
  direction: "outbound" | "inbound";
  author: string;
}

export type MeetingStatus = "scheduled" | "completed" | "cancelled";

export interface LeadMeeting {
  id: string;
  title: string;
  date: string;
  time: string;
  mode: "virtual" | "physical";
  location: string;
  attendees: string;
  agenda: string;
  outcome: string;
  status: MeetingStatus;
}

export interface LeadNote {
  id: string;
  at: string;
  title: string;
  body: string;
  author: string;
}

export interface LeadWorkspace {
  comms: LeadComm[];
  meetings: LeadMeeting[];
  notes: LeadNote[];
  temperature: "hot" | "warm" | "cold";
}

const EMPTY: LeadWorkspace = {
  comms: [],
  meetings: [],
  notes: [],
  temperature: "warm",
};

const KEY = "lexora.crm.lead-workspace.v1";

let state: Record<string, LeadWorkspace> = load();
const listeners = new Set<() => void>();

function load(): Record<string, LeadWorkspace> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const snapshot = () => state;

const uid = () => Math.random().toString(36).slice(2, 10);

export function useLeadWorkspace(leadId: string | null): LeadWorkspace {
  const all = useSyncExternalStore(subscribe, snapshot, snapshot);
  if (!leadId) return EMPTY;
  return all[leadId] ?? EMPTY;
}

function update(leadId: string, fn: (w: LeadWorkspace) => LeadWorkspace) {
  const current = state[leadId] ?? EMPTY;
  state = { ...state, [leadId]: fn(current) };
  persist();
}

export function setLeadTemperature(
  leadId: string,
  temperature: LeadWorkspace["temperature"],
) {
  update(leadId, (w) => ({ ...w, temperature }));
}

export function logComm(
  leadId: string,
  data: Omit<LeadComm, "id" | "at" | "author">,
) {
  update(leadId, (w) => ({
    ...w,
    comms: [
      { ...data, id: uid(), at: new Date().toISOString(), author: "You" },
      ...w.comms,
    ],
  }));
}

export function scheduleMeeting(
  leadId: string,
  data: Omit<LeadMeeting, "id" | "status" | "outcome">,
) {
  update(leadId, (w) => ({
    ...w,
    meetings: [
      { ...data, id: uid(), status: "scheduled", outcome: "" },
      ...w.meetings,
    ],
  }));
}

export function completeMeeting(
  leadId: string,
  meetingId: string,
  outcome: string,
) {
  update(leadId, (w) => ({
    ...w,
    meetings: w.meetings.map((m) =>
      m.id === meetingId ? { ...m, status: "completed", outcome } : m,
    ),
  }));
}

export function cancelMeeting(leadId: string, meetingId: string) {
  update(leadId, (w) => ({
    ...w,
    meetings: w.meetings.map((m) =>
      m.id === meetingId ? { ...m, status: "cancelled" } : m,
    ),
  }));
}

export function addLeadNote(leadId: string, title: string, body: string) {
  update(leadId, (w) => ({
    ...w,
    notes: [
      {
        id: uid(),
        at: new Date().toISOString(),
        title,
        body,
        author: "You",
      },
      ...w.notes,
    ],
  }));
}

export interface TimelineEntry {
  id: string;
  at: string;
  text: string;
  kind: "comm" | "meeting" | "note";
}

export function buildTimeline(w: LeadWorkspace): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...w.comms.map((c) => ({
      id: c.id,
      at: c.at,
      kind: "comm" as const,
      text: `${c.direction === "outbound" ? "Sent" : "Received"} ${c.channel.replace("_", " ")} — ${c.subject}`,
    })),
    ...w.meetings.map((m) => ({
      id: m.id,
      at: `${m.date}T${m.time || "00:00"}:00`,
      kind: "meeting" as const,
      text: `${m.status === "completed" ? "Completed" : m.status === "cancelled" ? "Cancelled" : "Scheduled"} meeting — ${m.title}`,
    })),
    ...w.notes.map((n) => ({
      id: n.id,
      at: n.at,
      kind: "note" as const,
      text: `Note added — ${n.title}`,
    })),
  ];
  return entries.sort((a, b) => (a.at < b.at ? 1 : -1));
}
