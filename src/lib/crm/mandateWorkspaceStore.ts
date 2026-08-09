import { useSyncExternalStore } from "react";

/**
 * Per-mandate collaboration workspace: client communications thread,
 * internal notes log, and a folder-first document store.
 * Prototype persistence: in-memory only (module state), mirroring the
 * lightweight pattern used by clientCommercialStore.ts.
 */

export interface WorkspaceMessage {
  id: string;
  mandateId: string;
  direction: "tenant" | "client";
  author: string;
  body: string;
  at: string;
}

export interface WorkspaceNote {
  id: string;
  mandateId: string;
  author: string;
  body: string;
  at: string;
}

export interface WorkspaceDocument {
  id: string;
  mandateId: string;
  folder: string;
  name: string;
  size: string;
  uploadedBy: string;
  at: string;
  fromClient?: boolean;
  status?: "pending" | "filed";
}

const DEFAULT_FOLDERS = [
  "Engagement letter",
  "Filings",
  "Correspondence",
  "Client submissions",
];

let messages: WorkspaceMessage[] = [
  {
    id: "MSG-1",
    mandateId: "MND-001",
    direction: "client",
    author: "Meridian Holdings Ltd",
    body: "Hi team, please find the FY26 trial balance attached in the portal. Let us know if anything else is needed for fieldwork.",
    at: "2026-07-20T09:15:00Z",
  },
  {
    id: "MSG-2",
    mandateId: "MND-001",
    direction: "tenant",
    author: "Sarah Chen",
    body: "Thanks — received. We'll start revenue cycle walkthroughs this week and flag any queries here.",
    at: "2026-07-20T11:02:00Z",
  },
  {
    id: "MSG-3",
    mandateId: "MND-002",
    direction: "client",
    author: "Greenfield Capital Partners",
    body: "Can we get an updated timeline for the step plan sign-off?",
    at: "2026-07-25T14:40:00Z",
  },
];

let notes: WorkspaceNote[] = [
  {
    id: "NOTE-1",
    mandateId: "MND-001",
    author: "David Park",
    body: "Client is responsive; revenue cycle documentation is thorough this year.",
    at: "2026-07-18T10:00:00Z",
  },
  {
    id: "NOTE-2",
    mandateId: "MND-002",
    author: "Michael Torres",
    body: "Flag: cross-border tax treatment still under discussion with client counsel.",
    at: "2026-07-24T16:30:00Z",
  },
];

let documents: WorkspaceDocument[] = [
  { id: "DOC-1", mandateId: "MND-001", folder: "Engagement letter", name: "Meridian_Engagement_Letter_2026.pdf", size: "220 KB", uploadedBy: "Sarah Chen", at: "2026-02-02" },
  { id: "DOC-2", mandateId: "MND-001", folder: "Filings", name: "Statutory_Accounts_Draft_v1.docx", size: "1.4 MB", uploadedBy: "David Park", at: "2026-06-10" },
  { id: "DOC-3", mandateId: "MND-001", folder: "Correspondence", name: "Kickoff_Email_Thread.pdf", size: "88 KB", uploadedBy: "Sarah Chen", at: "2026-02-05" },
  { id: "DOC-4", mandateId: "MND-001", folder: "Client submissions", name: "FY26_Trial_Balance.xlsx", size: "640 KB", uploadedBy: "Meridian Holdings Ltd", at: "2026-07-20", fromClient: true, status: "pending" },
  { id: "DOC-5", mandateId: "MND-002", folder: "Engagement letter", name: "Greenfield_Engagement_Letter.pdf", size: "198 KB", uploadedBy: "Michael Torres", at: "2026-01-16" },
  { id: "DOC-6", mandateId: "MND-002", folder: "Client submissions", name: "Board_Resolution_Draft.pdf", size: "310 KB", uploadedBy: "Greenfield Capital Partners", at: "2026-07-25", fromClient: true, status: "pending" },
];

const listeners = new Set<() => void>();

// Snapshot caches — useSyncExternalStore requires getSnapshot to return a
// referentially stable value between emits, otherwise React loops forever.
let msgCache: Record<string, WorkspaceMessage[]> = {};
let noteCache: Record<string, WorkspaceNote[]> = {};
let docCache: Record<string, WorkspaceDocument[]> = {};

function emit() {
  msgCache = {};
  noteCache = {};
  docCache = {};
  listeners.forEach((l) => l());
}
export function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// ── Messages ────────────────────────────────────────────────
export function getMessages(mandateId: string): WorkspaceMessage[] {
  if (!msgCache[mandateId]) {
    msgCache[mandateId] = messages
      .filter((m) => m.mandateId === mandateId)
      .sort((a, b) => a.at.localeCompare(b.at));
  }
  return msgCache[mandateId];
}
export function useMessages(mandateId: string): WorkspaceMessage[] {
  return useSyncExternalStore(
    subscribe,
    () => getMessages(mandateId),
    () => getMessages(mandateId),
  );
}
export function addMessage(
  mandateId: string,
  direction: "tenant" | "client",
  author: string,
  body: string,
) {
  messages = [
    ...messages,
    {
      id: `MSG-${Date.now()}`,
      mandateId,
      direction,
      author,
      body,
      at: new Date().toISOString(),
    },
  ];
  emit();
}

// ── Notes ───────────────────────────────────────────────────
export function getNotes(mandateId: string): WorkspaceNote[] {
  if (!noteCache[mandateId]) {
    noteCache[mandateId] = notes
      .filter((n) => n.mandateId === mandateId)
      .sort((a, b) => b.at.localeCompare(a.at));
  }
  return noteCache[mandateId];
}
export function useNotes(mandateId: string): WorkspaceNote[] {
  return useSyncExternalStore(
    subscribe,
    () => getNotes(mandateId),
    () => getNotes(mandateId),
  );
}
export function addNote(mandateId: string, author: string, body: string) {
  notes = [
    { id: `NOTE-${Date.now()}`, mandateId, author, body, at: new Date().toISOString() },
    ...notes,
  ];
  emit();
}
export function deleteNote(id: string) {
  notes = notes.filter((n) => n.id !== id);
  emit();
}

// ── Documents ───────────────────────────────────────────────
export function getFolders(mandateId: string): string[] {
  const custom = documents
    .filter((d) => d.mandateId === mandateId)
    .map((d) => d.folder);
  return Array.from(new Set([...DEFAULT_FOLDERS, ...custom]));
}
export function getDocuments(mandateId: string, folder: string): WorkspaceDocument[] {
  return documents.filter((d) => d.mandateId === mandateId && d.folder === folder);
}
export function getReceivedFromClient(mandateId: string): WorkspaceDocument[] {
  return documents.filter(
    (d) => d.mandateId === mandateId && d.fromClient && d.status === "pending",
  );
}
export function getMandateDocuments(mandateId: string): WorkspaceDocument[] {
  if (!docCache[mandateId]) {
    docCache[mandateId] = documents.filter((d) => d.mandateId === mandateId);
  }
  return docCache[mandateId];
}
export function useDocuments(mandateId: string): WorkspaceDocument[] {
  return useSyncExternalStore(
    subscribe,
    () => getMandateDocuments(mandateId),
    () => getMandateDocuments(mandateId),
  );
}
export function addFolder(mandateId: string, folder: string) {
  // folders materialize lazily; nothing to persist until a doc is added,
  // but we push a marker-less no-op doc list entry via a hidden field is
  // unnecessary — instead track via a side list.
  extraFolders[mandateId] = extraFolders[mandateId] || [];
  if (!extraFolders[mandateId].includes(folder)) extraFolders[mandateId].push(folder);
  emit();
}
const extraFolders: Record<string, string[]> = {};
export function getAllFolders(mandateId: string): string[] {
  return Array.from(new Set([...getFolders(mandateId), ...(extraFolders[mandateId] || [])]));
}
export function addDocument(doc: Omit<WorkspaceDocument, "id" | "at">) {
  documents = [
    ...documents,
    { ...doc, id: `DOC-${Date.now()}`, at: new Date().toISOString().slice(0, 10) },
  ];
  emit();
}
export function fileClientDocument(id: string, folder: string) {
  documents = documents.map((d) =>
    d.id === id ? { ...d, status: "filed" as const, folder } : d,
  );
  emit();
}
