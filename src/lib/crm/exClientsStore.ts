import { useSyncExternalStore } from "react";

/**
 * Ex-clients archive. Clients the tenant no longer actively serves,
 * whose details stay retained and searchable, and can be restored to
 * the active list at any time.
 * Prototype persistence: localStorage.
 */

export interface ExClient {
  clientId: string;
  name: string;
  email: string;
  classification: string;
  country: string;
  relationshipManager: string;
  serviceLines: string[];
  lifetimeRevenue: number;
  currency: string;
  relationshipFrom: string;
  relationshipTo: string;
  reason: string;
  notes: string;
  archivedAt: string;
}

export const EXIT_REASONS = [
  "Engagement completed",
  "Client-initiated exit",
  "Firm-initiated exit",
  "Non-payment",
  "Risk / compliance concern",
  "Merged or acquired",
  "Dormant",
];

const KEY = "lexora.crm.ex-clients.v1";

let state: Record<string, ExClient> = load();
const listeners = new Set<() => void>();

function load(): Record<string, ExClient> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, ExClient>) : {};
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

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const snapshot = () => state;

export function useExClients(): Record<string, ExClient> {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function archiveClient(record: Omit<ExClient, "archivedAt">) {
  state = {
    ...state,
    [record.clientId]: { ...record, archivedAt: new Date().toISOString() },
  };
  persist();
}

export function restoreClient(clientId: string) {
  const next = { ...state };
  delete next[clientId];
  state = next;
  persist();
}
