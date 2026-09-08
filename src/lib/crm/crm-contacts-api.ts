import { api } from "../api";

export type ContactSource =
  | "Referral"
  | "Event"
  | "Web form"
  | "Cold outreach"
  | "Partner";

export type ActivityType = "Email" | "Call" | "Meeting" | "Document" | "Note";

export interface ContactActivity {
  type: ActivityType;
  summary: string;
  by: string;
  at: string;
}

export interface Contact {
  _id: string;
  name: string;
  title: string;
  organisation: string;
  email: string;
  phone: string;
  source: ContactSource;
  tags: string[];
  roleTags: string[];
  owner: string;
  assignedTo: string | null;
  notes: string;
  lastContact: string;
  duplicateOf: string | null;
  duplicateDismissed: boolean;
  activity: ContactActivity[];
  createdAt: string;
  updatedAt: string;
}

export interface UpsertContactPayload {
  name: string;
  title?: string;
  organisation?: string;
  email?: string;
  phone?: string;
  source: ContactSource;
  tags?: string[];
  roleTags?: string[];
  owner?: string;
  notes?: string;
}

const unwrap = (res: any) => res.data?.data ?? res.data;

export const fetchContacts = async (): Promise<Contact[]> => {
  const res = await api.get("/crm/contacts");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const createContact = async (
  dto: UpsertContactPayload,
): Promise<Contact> => {
  const res = await api.post("/crm/contacts", dto);
  return unwrap(res);
};

export const updateContact = async (
  id: string,
  dto: UpsertContactPayload,
): Promise<Contact> => {
  const res = await api.patch(`/crm/contacts/${id}`, dto);
  return unwrap(res);
};

export const deleteContact = async (id: string): Promise<void> => {
  await api.delete(`/crm/contacts/${id}`);
};

export const mergeContact = async (id: string): Promise<Contact> => {
  const res = await api.post(`/crm/contacts/${id}/merge`);
  return unwrap(res);
};

export const dismissDuplicate = async (id: string): Promise<Contact> => {
  const res = await api.patch(`/crm/contacts/${id}/dismiss-duplicate`);
  return unwrap(res);
};

// ── Employee-facing "My Contacts" — real, server-enforced scoping.
// A plain employee only ever sees/acts on contacts assigned to them;
// a tenant admin or role-bearing employee sees everyone's, matching
// the same real access rule already used for "My Clients".
export const fetchMyContacts = async (): Promise<Contact[]> => {
  const res = await api.get("/tenant/my-contacts");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const logMyContactActivity = async (
  id: string,
  dto: { type: ActivityType; summary: string },
): Promise<Contact> => {
  const res = await api.post(`/tenant/my-contacts/${id}/activity`, dto);
  return unwrap(res);
};

// Assign a contact to a specific employee (or unassign with null) —
// sets both the real, enforced relationship and the display owner
// label together on the backend.
export const assignContact = async (
  id: string,
  employeeId: string | null,
  employeeName?: string,
): Promise<Contact> => {
  const res = await api.patch(`/crm/contacts/${id}/assign`, {
    employeeId,
    employeeName,
  });
  return unwrap(res);
};

export const bulkTagContacts = async (
  contactIds: string[],
  tag: string,
): Promise<Contact[]> => {
  const res = await api.post("/crm/contacts/bulk-tag", { contactIds, tag });
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const logContactActivity = async (
  id: string,
  dto: { type: ActivityType; summary: string; by?: string },
): Promise<Contact> => {
  const res = await api.post(`/crm/contacts/${id}/activity`, dto);
  return unwrap(res);
};
