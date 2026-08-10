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
