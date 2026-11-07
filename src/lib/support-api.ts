import { api } from "./api";

// Tickets between this tenant and the platform team (Super Admin). Not to be
// confused with the CRM service desk, which is tenant ⇄ the tenant's clients.

export type SupportStatus =
  "Open" | "In Progress" | "Waiting on Tenant" | "Resolved" | "Closed";
export type SupportPriority = "Low" | "Medium" | "High" | "Urgent";

export const SUPPORT_CATEGORIES = [
  "Portal access",
  "Subscription & billing",
  "Modules & permissions",
  "Technical issue",
  "Feature request",
  "Other",
];
export const SUPPORT_PRIORITIES: SupportPriority[] = [
  "Low",
  "Medium",
  "High",
  "Urgent",
];

export interface SupportMessage {
  _id: string;
  authorType: "tenant" | "platform";
  authorName: string;
  body: string;
  at: string;
}

export interface SupportTicket {
  _id: string;
  ref: string;
  subject: string;
  description: string;
  category: string;
  priority: SupportPriority;
  status: SupportStatus;
  source: "tenant" | "escalated";
  // The tenant's own client ticket this was escalated from (tenant side only).
  sourceTicketId: string | null;
  raisedByName: string;
  assignedToName: string;
  messages: SupportMessage[];
  lastActor: "tenant" | "platform";
  lastActivityAt: string;
  createdAt: string;
}

const unwrap = (res: any) => res.data?.data ?? res.data;

export const fetchSupportTickets = async (): Promise<SupportTicket[]> => {
  const d = unwrap(await api.get("/support/tickets"));
  return Array.isArray(d) ? d : [];
};

export const fetchSupportTicket = async (id: string): Promise<SupportTicket> =>
  unwrap(await api.get(`/support/tickets/${id}`));

export const createSupportTicket = async (dto: {
  subject: string;
  description: string;
  category: string;
  priority: SupportPriority;
}): Promise<SupportTicket> => unwrap(await api.post("/support/tickets", dto));

export const replySupportTicket = async (
  id: string,
  body: string,
): Promise<SupportTicket> =>
  unwrap(await api.post(`/support/tickets/${id}/messages`, { body }));

export const closeSupportTicket = async (id: string): Promise<SupportTicket> =>
  unwrap(await api.patch(`/support/tickets/${id}/close`));

export const reopenSupportTicket = async (id: string): Promise<SupportTicket> =>
  unwrap(await api.patch(`/support/tickets/${id}/reopen`));

// The platform thread behind one of the tenant's client tickets (null if it
// was never escalated).
export const fetchEscalation = async (
  clientTicketId: string,
): Promise<SupportTicket | null> => {
  const res = await api.get(
    `/support/tickets/by-client-ticket/${clientTicketId}`,
  );
  // "Not escalated" comes back as a null payload — which `unwrap` would turn
  // into the response envelope, so read it explicitly.
  const d = res.data?.data !== undefined ? res.data.data : res.data;
  return d && typeof d === "object" && d._id ? (d as SupportTicket) : null;
};

export const escalateClientTicket = async (
  clientTicketId: string,
  dto: {
    subject: string;
    description: string;
    priority?: SupportPriority;
    notifyClient?: boolean;
  },
): Promise<SupportTicket> =>
  unwrap(await api.post(`/support/tickets/escalate/${clientTicketId}`, dto));

export const supportStatusClass: Record<SupportStatus, string> = {
  Open: "bg-primary/10 text-primary",
  "In Progress": "bg-info/10 text-info",
  "Waiting on Tenant": "bg-warning/10 text-warning",
  Resolved: "bg-success/10 text-success",
  Closed: "bg-muted text-muted-foreground",
};
