import { api } from "../api";

export type TicketStatus =
  | "New"
  | "Assigned"
  | "In Progress"
  | "Pending Client"
  | "Resolved"
  | "Closed";
export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";
export type TicketChannel = "Portal" | "Email" | "WhatsApp";

export const TICKET_STATUSES: TicketStatus[] = [
  "New",
  "Assigned",
  "In Progress",
  "Pending Client",
  "Resolved",
  "Closed",
];
export const TICKET_PRIORITIES: TicketPriority[] = [
  "Low",
  "Medium",
  "High",
  "Urgent",
];

// Same vocabulary the Knowledge Base uses for its own categories —
// deliberately, so the two line up once KB is real.
export const TICKET_CATEGORIES = [
  "Portal access",
  "Billing",
  "Advisory",
  "Process",
  "New work",
  "Other",
];

export interface TicketNote {
  _id: string;
  author: string;
  internal: boolean;
  body: string;
  at: string;
}

export interface Ticket {
  _id: string;
  ref: string;
  subject: string;
  description: string;
  clientUserId: string;
  clientName: string;
  channel: TicketChannel;
  priority: TicketPriority;
  category: string;
  agentUserId: string | null;
  agent: string;
  status: TicketStatus;
  slaTargetHrs: number;
  // Live-computed by the backend on every read — never sent, always present.
  slaElapsedHrs: number;
  loggedHrs: number;
  rating: number | null;
  ratingComment: string | null;
  notes: TicketNote[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = (res: any) => res.data?.data ?? res.data;

// ── Tenant ────────────────────────────────────────────────────

export const fetchTickets = async (filters?: {
  status?: TicketStatus;
  agentUserId?: string;
}): Promise<Ticket[]> => {
  const res = await api.get("/crm/tickets", { params: filters });
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const fetchTicket = async (id: string): Promise<Ticket> => {
  const res = await api.get(`/crm/tickets/${id}`);
  return unwrap(res);
};

export const assignTicket = async (
  id: string,
  agentUserId: string,
  agentName: string,
): Promise<Ticket> => {
  const res = await api.post(`/crm/tickets/${id}/assign`, {
    agentUserId,
    agentName,
  });
  return unwrap(res);
};

export const setTicketStatus = async (
  id: string,
  status: TicketStatus,
): Promise<Ticket> => {
  const res = await api.patch(`/crm/tickets/${id}/status`, { status });
  return unwrap(res);
};

export const addTicketNote = async (
  id: string,
  author: string,
  body: string,
  internal: boolean,
): Promise<Ticket> => {
  const res = await api.post(`/crm/tickets/${id}/notes`, {
    author,
    body,
    internal,
  });
  return unwrap(res);
};

// ── Employee ──────────────────────────────────────────────────

export const fetchMyTickets = async (
  status?: TicketStatus,
): Promise<Ticket[]> => {
  const res = await api.get("/crm/my-tickets", {
    params: status ? { status } : undefined,
  });
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const fetchMyTicket = async (id: string): Promise<Ticket> => {
  const res = await api.get(`/crm/my-tickets/${id}`);
  return unwrap(res);
};

export const setMyTicketStatus = async (
  id: string,
  status: TicketStatus,
): Promise<Ticket> => {
  const res = await api.patch(`/crm/my-tickets/${id}/status`, { status });
  return unwrap(res);
};

export const addMyTicketNote = async (
  id: string,
  author: string,
  body: string,
  internal: boolean,
): Promise<Ticket> => {
  const res = await api.post(`/crm/my-tickets/${id}/notes`, {
    author,
    body,
    internal,
  });
  return unwrap(res);
};

// ── Knowledge Base ────────────────────────────────────────────

export type KbAudience = "Internal" | "Client-facing";
export type KbStatus = "Draft" | "Published";

export interface KbArticle {
  _id: string;
  ref: string;
  title: string;
  category: string;
  audience: KbAudience;
  status: KbStatus;
  tags: string[];
  body: string;
  author: string;
  views: number;
  helpful: number;
  notHelpful: number;
  linkedTicketId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertKbArticlePayload {
  title: string;
  category: string;
  audience: KbAudience;
  status?: KbStatus;
  tags?: string[];
  body?: string;
  author: string;
  linkedTicketId?: string;
}

// Tenant — full CRUD

export const fetchKbArticles = async (filters?: {
  audience?: KbAudience;
  status?: KbStatus;
  category?: string;
}): Promise<KbArticle[]> => {
  const res = await api.get("/crm/kb-articles", { params: filters });
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const createKbArticle = async (
  dto: UpsertKbArticlePayload,
): Promise<KbArticle> => {
  const res = await api.post("/crm/kb-articles", dto);
  return unwrap(res);
};

export const updateKbArticle = async (
  id: string,
  dto: Partial<UpsertKbArticlePayload>,
): Promise<KbArticle> => {
  const res = await api.patch(`/crm/kb-articles/${id}`, dto);
  return unwrap(res);
};

export const deleteKbArticle = async (id: string): Promise<void> => {
  await api.delete(`/crm/kb-articles/${id}`);
};

export const recordKbView = async (id: string): Promise<KbArticle> => {
  const res = await api.post(`/crm/kb-articles/${id}/view`);
  return unwrap(res);
};

export const voteKbArticle = async (
  id: string,
  helpful: boolean,
): Promise<KbArticle> => {
  const res = await api.post(`/crm/kb-articles/${id}/vote`, { helpful });
  return unwrap(res);
};

// Employee — read-only (Internal + Published), plus suggestions

export const fetchMyKbArticles = async (): Promise<KbArticle[]> => {
  const res = await api.get("/crm/my-kb-articles");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const suggestMyKbArticles = async (q: string): Promise<KbArticle[]> => {
  const res = await api.get("/crm/my-kb-articles/suggest", { params: { q } });
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const recordMyKbView = async (id: string): Promise<KbArticle> => {
  const res = await api.post(`/crm/my-kb-articles/${id}/view`);
  return unwrap(res);
};

export const voteMyKbArticle = async (
  id: string,
  helpful: boolean,
): Promise<KbArticle> => {
  const res = await api.post(`/crm/my-kb-articles/${id}/vote`, { helpful });
  return unwrap(res);
};
