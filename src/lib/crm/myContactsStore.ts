import { useSyncExternalStore } from "react";

/**
 * Contacts assigned to the logged-in employee, with the same activity
 * timeline the tenant records on the CRM Contacts page.
 * Prototype persistence: localStorage with seeded dummy data.
 */

export type MyActivityType = "Email" | "Call" | "Meeting" | "Document" | "Note";

export const MY_ACTIVITY_TYPES: MyActivityType[] = [
  "Email",
  "Call",
  "Meeting",
  "Document",
  "Note",
];

export interface MyContactActivity {
  id: string;
  type: MyActivityType;
  summary: string;
  by: string;
  at: string;
}

export interface MyContact {
  id: string;
  name: string;
  title: string;
  organisation: string;
  email: string;
  phone: string;
  source: string;
  tags: string[];
  notes: string;
  activity: MyContactActivity[];
}

const KEY = "lexora.crm.my-contacts.v1";

const seed = (): MyContact[] => [
  {
    id: "mc-1",
    name: "Adaeze Nwosu",
    title: "Group Finance Director",
    organisation: "Kano Agro Holdings",
    email: "adaeze.nwosu@kanoagro.com",
    phone: "+234 802 114 8890",
    source: "Referral",
    tags: ["Decision maker", "Finance"],
    notes: "Primary commercial contact for the restructuring mandate.",
    activity: [
      {
        id: "a-1",
        type: "Meeting",
        summary: "Kick-off call on the FY restructuring scope.",
        by: "You",
        at: new Date(Date.now() - 6 * 864e5).toISOString(),
      },
      {
        id: "a-2",
        type: "Email",
        summary: "Sent revised engagement timeline and fee note.",
        by: "You",
        at: new Date(Date.now() - 2 * 864e5).toISOString(),
      },
    ],
  },
  {
    id: "mc-2",
    name: "Thabo Molefe",
    title: "Company Secretary",
    organisation: "Sandton Capital Partners",
    email: "t.molefe@sandtoncap.co.za",
    phone: "+27 71 555 2201",
    source: "Event",
    tags: ["Governance"],
    notes: "Coordinates board pack circulation.",
    activity: [
      {
        id: "a-3",
        type: "Call",
        summary: "Discussed board calendar for next quarter.",
        by: "You",
        at: new Date(Date.now() - 11 * 864e5).toISOString(),
      },
    ],
  },
  {
    id: "mc-3",
    name: "Grace Wanjiru",
    title: "Head of Compliance",
    organisation: "Nairobi Trust Services",
    email: "grace.wanjiru@nts.co.ke",
    phone: "+254 722 908 331",
    source: "Partner",
    tags: ["Compliance", "AML"],
    notes: "Requests quarterly AML refresh training.",
    activity: [],
  },
];

let state: MyContact[] = load();
const listeners = new Set<() => void>();

function load(): MyContact[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as MyContact[];
  } catch {
    /* ignore */
  }
  return seed();
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

const snapshot = () => state;

export function useMyContacts(): MyContact[] {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function logMyContactActivity(
  contactId: string,
  entry: { type: MyActivityType; summary: string; by?: string },
) {
  state = state.map((c) =>
    c.id === contactId
      ? {
          ...c,
          activity: [
            {
              id: `a-${Date.now()}`,
              type: entry.type,
              summary: entry.summary,
              by: entry.by || "You",
              at: new Date().toISOString(),
            },
            ...c.activity,
          ],
        }
      : c,
  );
  persist();
}

export function updateMyContactNotes(contactId: string, notes: string) {
  state = state.map((c) => (c.id === contactId ? { ...c, notes } : c));
  persist();
}

export const lastTouch = (c: MyContact) =>
  c.activity.length ? c.activity[0].at : null;
