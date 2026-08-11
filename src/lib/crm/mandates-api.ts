import { api } from "../api";

export type MandateType =
  | "Audit"
  | "Advisory"
  | "Transaction"
  | "Compliance"
  | "Onboarding"
  | "Litigation";
export type MandateStage =
  | "Create"
  | "Setup"
  | "Deliver"
  | "Review"
  | "Bill"
  | "Close";
export type Rag = "Green" | "Amber" | "Red";
export type FeeStructure =
  | "Fixed fee"
  | "Time & materials"
  | "Retainer"
  | "Capped fee";
export type ConflictCheckStatus = "Pending" | "Cleared";

export const MANDATE_STAGES: MandateStage[] = [
  "Create",
  "Setup",
  "Deliver",
  "Review",
  "Bill",
  "Close",
];

export const MANDATE_STAGE_META: Record<
  MandateStage,
  { owner: string; trigger: string }
> = {
  Create: {
    owner: "Partner",
    trigger: "Mandate created, template applied, conflict check queued.",
  },
  Setup: {
    owner: "Manager",
    trigger: "Conflict check cleared — engagement letter and team setup.",
  },
  Deliver: {
    owner: "Team",
    trigger: "Delivery work in progress — tasks, WBS and time logging.",
  },
  Review: {
    owner: "Manager",
    trigger: "Quality review of deliverables before billing.",
  },
  Bill: {
    owner: "Finance",
    trigger: "Invoice raised against WIP and billed to the client.",
  },
  Close: {
    owner: "Partner",
    trigger: "Closure checklist complete — documents archived.",
  },
};

export const ragClass: Record<Rag, string> = {
  Green: "bg-success/10 text-success",
  Amber: "bg-warning/10 text-warning",
  Red: "bg-destructive/10 text-destructive",
};

export const money = (n: number, c = "USD") =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: c,
    maximumFractionDigits: 0,
  });

export interface ClosureChecklistItem {
  _id: string;
  label: string;
  done: boolean;
}

export interface Mandate {
  _id: string;
  ref: string;
  name: string;
  clientUserId: string;
  clientName: string;
  type: MandateType;
  stage: MandateStage;
  rag: Rag;
  manager: string;
  teamId: string | null;
  teamName: string;
  team: string[];
  startDate: string;
  targetDate: string;
  budget: number;
  actualCost: number;
  billed: number;
  wip: number;
  feeStructure: FeeStructure;
  progress: number;
  conflictCheck: ConflictCheckStatus;
  currency: string;
  closureChecklist: ClosureChecklistItem[];
  customFolders: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMandatePayload {
  name: string;
  clientUserId: string;
  clientName: string;
  type: MandateType;
  manager?: string;
  teamId?: string;
  teamName?: string;
  targetDate: string;
  budget: number;
  feeStructure: FeeStructure;
  currency?: string;
  templateName?: string;
  templateTaskCount?: number;
}

export interface UpdateMandatePayload {
  name?: string;
  rag?: Rag;
  manager?: string;
  teamId?: string;
  teamName?: string;
  team?: string[];
  targetDate?: string;
  budget?: number;
  actualCost?: number;
  billed?: number;
  wip?: number;
  feeStructure?: FeeStructure;
  progress?: number;
}

const unwrap = (res: any) => res.data?.data ?? res.data;

export const fetchMandates = async (): Promise<Mandate[]> => {
  const res = await api.get("/crm/mandates");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const createMandate = async (
  dto: CreateMandatePayload,
): Promise<Mandate> => {
  const res = await api.post("/crm/mandates", dto);
  return unwrap(res);
};

export const updateMandate = async (
  id: string,
  dto: UpdateMandatePayload,
): Promise<Mandate> => {
  const res = await api.patch(`/crm/mandates/${id}`, dto);
  return unwrap(res);
};

export const advanceMandateStage = async (
  id: string,
): Promise<Mandate & { stageTrigger: string }> => {
  const res = await api.post(`/crm/mandates/${id}/advance`);
  return unwrap(res);
};

export const clearConflictCheck = async (id: string): Promise<Mandate> => {
  const res = await api.post(`/crm/mandates/${id}/clear-conflict-check`);
  return unwrap(res);
};

export const setClosureItem = async (
  mandateId: string,
  itemId: string,
  done: boolean,
): Promise<Mandate> => {
  const res = await api.patch(`/crm/mandates/${mandateId}/closure/${itemId}`, {
    done,
  });
  return unwrap(res);
};

export const closeMandate = async (id: string): Promise<Mandate> => {
  const res = await api.post(`/crm/mandates/${id}/close`);
  return unwrap(res);
};

// ── Workspace ────────────────────────────────────────────────

export interface WorkspaceMessage {
  _id: string;
  mandateId: string;
  direction: "tenant" | "client";
  author: string;
  body: string;
  createdAt: string;
}
export interface WorkspaceNote {
  _id: string;
  mandateId: string;
  author: string;
  body: string;
  createdAt: string;
}
export interface WorkspaceDocument {
  _id: string;
  mandateId: string;
  folder: string;
  name: string;
  fileUrl: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  fromClient: boolean;
  status: "pending" | "filed" | null;
  createdAt: string;
}

export const fetchMessages = async (
  mandateId: string,
): Promise<WorkspaceMessage[]> => {
  const res = await api.get(`/crm/mandates/${mandateId}/messages`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const sendMessage = async (
  mandateId: string,
  author: string,
  body: string,
): Promise<WorkspaceMessage> => {
  const res = await api.post(`/crm/mandates/${mandateId}/messages`, {
    author,
    body,
  });
  return unwrap(res);
};

export const fetchNotes = async (
  mandateId: string,
): Promise<WorkspaceNote[]> => {
  const res = await api.get(`/crm/mandates/${mandateId}/notes`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const addWorkspaceNote = async (
  mandateId: string,
  author: string,
  body: string,
): Promise<WorkspaceNote> => {
  const res = await api.post(`/crm/mandates/${mandateId}/notes`, {
    author,
    body,
  });
  return unwrap(res);
};
export const deleteWorkspaceNote = async (
  mandateId: string,
  noteId: string,
): Promise<void> => {
  await api.delete(`/crm/mandates/${mandateId}/notes/${noteId}`);
};

export const fetchFolders = async (mandateId: string): Promise<string[]> => {
  const res = await api.get(`/crm/mandates/${mandateId}/folders`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const addFolder = async (
  mandateId: string,
  folder: string,
): Promise<string[]> => {
  const res = await api.post(`/crm/mandates/${mandateId}/folders`, { folder });
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const fetchDocuments = async (
  mandateId: string,
  folder?: string,
): Promise<WorkspaceDocument[]> => {
  const res = await api.get(`/crm/mandates/${mandateId}/documents`, {
    params: folder ? { folder } : undefined,
  });
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const fetchReceivedDocuments = async (
  mandateId: string,
): Promise<WorkspaceDocument[]> => {
  const res = await api.get(`/crm/mandates/${mandateId}/documents/received`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const uploadDocument = async (
  mandateId: string,
  folder: string,
  file: File,
): Promise<WorkspaceDocument> => {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post(
    `/crm/mandates/${mandateId}/documents?folder=${encodeURIComponent(folder)}`,
    form,
  );
  return unwrap(res);
};
export const fileClientDocument = async (
  mandateId: string,
  documentId: string,
  folder: string,
): Promise<WorkspaceDocument> => {
  const res = await api.post(
    `/crm/mandates/${mandateId}/documents/${documentId}/file`,
    { folder },
  );
  return unwrap(res);
};
