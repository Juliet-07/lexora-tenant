import { defaultCurrency } from "@/lib/currency";
import { api } from "../api";
import { Task, TaskStatus, type TaskPriority } from "./tasks-api";

// Mandate documents carry a relative /uploads/... fileUrl, same as every
// other module — resolve it against the API's own origin before using it
// in an href/src, same pattern as resolveGrcFileUrl etc.
const MANDATES_API_BASE = (api.defaults as any)?.baseURL ?? "/api";
export const resolveMandateFileUrl = (
  url: string | null | undefined,
): string | null => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${new URL(MANDATES_API_BASE).origin}${url}`;
};

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
    trigger: "Mandate created — conflict check queued for partner review.",
  },
  Setup: {
    owner: "Manager",
    trigger: "Conflict check cleared — team and delivery setup.",
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

export const money = (n: number, c = defaultCurrency()) =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: c,
  });

export interface ClosureChecklistItem {
  _id: string;
  label: string;
  done: boolean;
}

export interface ConflictHit {
  _id: string;
  matchedAgainst: string;
  source: "client" | "mandate";
  matchedName: string;
  clientUserId?: string;
  mandateId?: string;
  mandateRef?: string;
}

export type MilestoneStatus = "pending" | "in_progress" | "completed";

export interface Milestone {
  _id: string;
  name: string;
  status: MilestoneStatus;
  date: string;
}

export interface Mandate {
  _id: string;
  ref: string;
  name: string;
  description?: string;
  clientUserId: string;
  clientName: string;
  type: MandateType;
  stage: MandateStage;
  rag: Rag;
  // Always the Head of Department of the assigned team (resolved by the
  // server) — never entered by hand.
  manager: string;
  managerEmployeeId?: string | null;
  // True when a team is assigned but it has no Head of Department yet.
  managerMissing?: boolean;
  // Employee dashboard only: the caller is this mandate's manager (team HOD).
  isManager?: boolean;
  teamId: string | null;
  teamName: string;
  team: string[];
  startDate: string;
  targetDate: string;
  budget: number;
  actualCost: number;
  billed: number;
  // Server-computed from Approved, billable time entries — never sent, always present.
  wip: number;
  feeStructure: FeeStructure;
  progress: number;
  conflictCheck: ConflictCheckStatus;
  parties: string[];
  conflictHits: ConflictHit[];
  currency: string;
  closureChecklist: ClosureChecklistItem[];
  milestones: Milestone[];
  customFolders: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMandatePayload {
  name: string;
  clientUserId: string;
  clientName: string;
  type: MandateType;
  teamId?: string;
  teamName?: string;
  targetDate: string;
  budget: number;
  feeStructure: FeeStructure;
  currency?: string;
  parties?: string[];
}

export interface UpdateMandatePayload {
  name?: string;
  description?: string;
  rag?: Rag;
  teamId?: string;
  teamName?: string;
  team?: string[];
  targetDate?: string;
  budget?: number;
  actualCost?: number;
  billed?: number;
  feeStructure?: FeeStructure;
  progress?: number;
  parties?: string[];
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

// Real automated search against existing clients and other mandates —
// re-runnable on demand, e.g. after editing parties.
export const rerunConflictCheck = async (id: string): Promise<Mandate> => {
  const res = await api.post(`/crm/mandates/${id}/rerun-conflict-check`);
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

// ── Messages (tenant ↔ a specific employee) ─────────────────────
// Distinct from WorkspaceMessage (that's tenant↔client). Powers the
// Collaboration tab: tenant @mentions a team member, gets a
// dedicated thread with them.

export interface EmployeeMessage {
  _id: string;
  mandateId: string;
  employeeUserId: string;
  direction: "tenant" | "employee";
  author: string;
  body: string;
  createdAt: string;
}

export const fetchEmployeeMessages = async (
  mandateId: string,
  employeeUserId: string,
): Promise<EmployeeMessage[]> => {
  const res = await api.get(
    `/crm/mandates/${mandateId}/employee-messages/${employeeUserId}`,
  );
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const sendEmployeeMessage = async (
  mandateId: string,
  employeeUserId: string,
  author: string,
  body: string,
): Promise<EmployeeMessage> => {
  const res = await api.post(
    `/crm/mandates/${mandateId}/employee-messages/${employeeUserId}`,
    { author, body },
  );
  return unwrap(res);
};

// Real unread count per employee thread on this mandate — keyed by
// employee id, for a badge on each @mention recipient plus the
// overall Collaboration tab indicator.
export const fetchEmployeeThreadUnreadSummary = async (
  mandateId: string,
): Promise<Record<string, number>> => {
  const res = await api.get(
    `/crm/mandates/${mandateId}/employee-messages/unread-summary`,
  );
  return unwrap(res) ?? {};
};

export const markEmployeeThreadReadByTenant = async (
  mandateId: string,
  employeeUserId: string,
): Promise<void> => {
  await api.post(
    `/crm/mandates/${mandateId}/employee-messages/${employeeUserId}/read`,
  );
};

export const addMilestone = async (
  mandateId: string,
  name: string,
  date: string,
): Promise<Mandate> => {
  const res = await api.post(`/crm/mandates/${mandateId}/milestones`, {
    name,
    date,
  });
  return unwrap(res);
};

export const updateMilestone = async (
  mandateId: string,
  milestoneId: string,
  dto: { name?: string; date?: string; status?: MilestoneStatus },
): Promise<Mandate> => {
  const res = await api.patch(
    `/crm/mandates/${mandateId}/milestones/${milestoneId}`,
    dto,
  );
  return unwrap(res);
};

export const deleteMilestone = async (
  mandateId: string,
  milestoneId: string,
): Promise<Mandate> => {
  const res = await api.delete(
    `/crm/mandates/${mandateId}/milestones/${milestoneId}`,
  );
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

export interface MandateDeleteImpact {
  willDelete: Record<string, number>;
  willDetach: Record<string, number>;
  paidInvoiceCount: number;
}

export const fetchMandateDeleteImpact = async (
  id: string,
): Promise<MandateDeleteImpact> => {
  const res = await api.get(`/crm/mandates/${id}/delete-impact`);
  return unwrap(res);
};

// Removes the mandate and everything tied to it.
export const deleteMandate = async (id: string): Promise<void> => {
  await api.delete(`/crm/mandates/${id}`);
};

export interface MandateTeamMember {
  _id: string;
  name: string;
  jobTitle: string;
  isHod?: boolean;
}

export const fetchMandateTeamMembers = async (
  id: string,
): Promise<MandateTeamMember[]> => {
  const res = await api.get(`/crm/mandates/${id}/team-members`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export interface MandateOverview {
  mandate: {
    _id: string;
    name: string;
    manager: string;
    managerMissing?: boolean;
    teamName: string;
  };
  tasks: {
    total: number;
    overdue: number;
    byStatus: Record<string, number>;
    byAssignee: {
      assignee: string;
      assigneeUserId: string | null;
      total: number;
      done: number;
      overdue: number;
    }[];
    recent: {
      _id: string;
      title: string;
      assignee: string;
      status: TaskStatus;
      dueDate: string;
    }[];
  };
  communications: {
    clientThread: { count: number; lastAt: string | null };
    employeeThreads: {
      employeeUserId: string;
      name: string;
      count: number;
      lastAt: string | null;
      lastBody: string;
    }[];
    feed: {
      channel: string;
      author: string;
      body: string;
      direction: string;
      createdAt: string;
    }[];
  };
}

export const fetchMandateOverview = async (
  id: string,
): Promise<MandateOverview> => {
  const res = await api.get(`/crm/mandates/${id}/overview`);
  return unwrap(res);
};

// EMPLOYEE PROJECTS APIS
export const fetchMyMandates = async (): Promise<Mandate[]> => {
  const res = await api.get("/crm/my-mandates");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const fetchMyMandate = async (id: string): Promise<Mandate> => {
  const res = await api.get(`/crm/my-mandates/${id}`);
  return unwrap(res);
};

// All tasks on the mandate, any assignee — the Board view.
export const fetchMandateBoardTasks = async (
  mandateId: string,
): Promise<Task[]> => {
  const res = await api.get(`/crm/my-mandates/${mandateId}/tasks`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

// Just the employee's own tasks, across everything or one mandate.
export const fetchMyTasks = async (mandateId?: string): Promise<Task[]> => {
  const res = await api.get("/crm/my-tasks", {
    params: mandateId ? { mandateId } : undefined,
  });
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

// Status only now — logged hours used to be directly editable here,
// but loggedHrs is derived from Approved time entries. An employee
// logs time through Timesheets, which needs approval before it
// counts, rather than bumping this number directly.
export const updateMyTask = async (
  id: string,
  dto: { status?: TaskStatus },
): Promise<Task> => {
  const res = await api.patch(`/crm/my-tasks/${id}`, dto);
  return unwrap(res);
};

export const fetchMandateDocumentsForEmployee = async (
  mandateId: string,
): Promise<WorkspaceDocument[]> => {
  const res = await api.get(`/crm/my-mandates/${mandateId}/documents`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

// The employee's own side of the tenant↔employee thread — always
// their own thread, resolved server-side, no employeeUserId needed
// in the URL.
export const fetchMyCollabMessages = async (
  mandateId: string,
): Promise<EmployeeMessage[]> => {
  const res = await api.get(`/crm/my-mandates/${mandateId}/messages`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const sendMyCollabMessage = async (
  mandateId: string,
  author: string,
  body: string,
): Promise<EmployeeMessage> => {
  const res = await api.post(`/crm/my-mandates/${mandateId}/messages`, {
    author,
    body,
  });
  return unwrap(res);
};

export const fetchMyThreadUnreadCount = async (
  mandateId: string,
): Promise<number> => {
  const res = await api.get(
    `/crm/my-mandates/${mandateId}/messages/unread-count`,
  );
  return unwrap(res) ?? 0;
};

export const markMyThreadRead = async (mandateId: string): Promise<void> => {
  await api.post(`/crm/my-mandates/${mandateId}/messages/read`);
};

// ── Manager (team Head of Department) task assignment ───────────

export interface ManagerTaskPayload {
  title: string;
  assigneeEmployeeId: string;
  priority: TaskPriority;
  startDate?: string;
  dueDate: string;
  estimateHrs: number;
  phase?: string;
}

export const fetchManagerTeamMembers = async (
  mandateId: string,
): Promise<MandateTeamMember[]> => {
  const res = await api.get(`/crm/my-mandates/${mandateId}/team-members`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const createTaskAsManager = async (
  mandateId: string,
  dto: ManagerTaskPayload,
): Promise<Task> => {
  const res = await api.post(`/crm/my-mandates/${mandateId}/tasks`, dto);
  return unwrap(res);
};

export const updateTaskAsManager = async (
  mandateId: string,
  taskId: string,
  dto: Partial<ManagerTaskPayload> & { status?: TaskStatus },
): Promise<Task> => {
  const res = await api.patch(
    `/crm/my-mandates/${mandateId}/tasks/${taskId}`,
    dto,
  );
  return unwrap(res);
};

export const deleteTaskAsManager = async (
  mandateId: string,
  taskId: string,
): Promise<void> => {
  await api.delete(`/crm/my-mandates/${mandateId}/tasks/${taskId}`);
};
