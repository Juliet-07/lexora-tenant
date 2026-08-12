import { api } from "../api";

export type TimesheetStatus =
  | "Draft"
  | "Submitted"
  | "Lead Approved"
  | "Approved"
  | "Rejected";

export const TIMESHEET_STATUSES: TimesheetStatus[] = [
  "Draft",
  "Submitted",
  "Lead Approved",
  "Approved",
  "Rejected",
];

// No real capacity or contracted-hours tracking exists anywhere in
// this system yet — this is a stated, shared assumption used by both
// Timesheets' Utilisation tab and Gantt & Planning's Resource
// Allocation tab, so the two never quietly drift to different
// numbers. Move this to a real per-employee value if that ever
// exists.
export const ASSUMED_AVAILABLE_HRS = 160;
export const UTILISATION_TARGET_PCT = 80;

export interface TimeEntry {
  _id: string;
  memberUserId: string;
  member: string;
  mandateId: string;
  mandateName: string;
  taskId: string | null;
  taskTitle: string;
  narrative: string;
  date: string;
  hours: number;
  billable: boolean;
  rate: number;
  currency: string;
  status: TimesheetStatus;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTimeEntryPayload {
  memberUserId: string;
  member: string;
  mandateId: string;
  mandateName: string;
  taskId?: string;
  taskTitle?: string;
  narrative?: string;
  date: string;
  hours: number;
  billable?: boolean;
}

export interface UpdateTimeEntryPayload {
  narrative?: string;
  date?: string;
  hours?: number;
  billable?: boolean;
}

export interface RateCard {
  _id: string;
  employeeUserId: string;
  member: string;
  role: string;
  standardRate: number;
  currency: string;
}

export interface UpsertRateCardPayload {
  member: string;
  role?: string;
  standardRate: number;
  currency?: string;
}

const unwrap = (res: any) => res.data?.data ?? res.data;

export const fetchTimeEntries = async (filters?: {
  mandateId?: string;
  memberUserId?: string;
  status?: TimesheetStatus;
}): Promise<TimeEntry[]> => {
  const res = await api.get("/crm/time-entries", { params: filters });
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const createTimeEntry = async (
  dto: CreateTimeEntryPayload,
): Promise<TimeEntry> => {
  const res = await api.post("/crm/time-entries", dto);
  return unwrap(res);
};

export const updateTimeEntry = async (
  id: string,
  dto: UpdateTimeEntryPayload,
): Promise<TimeEntry> => {
  const res = await api.patch(`/crm/time-entries/${id}`, dto);
  return unwrap(res);
};

export const deleteTimeEntry = async (id: string): Promise<void> => {
  await api.delete(`/crm/time-entries/${id}`);
};

export const submitTimeEntry = async (id: string): Promise<TimeEntry> => {
  const res = await api.post(`/crm/time-entries/${id}/submit`);
  return unwrap(res);
};

export const leadApproveTimeEntry = async (id: string): Promise<TimeEntry> => {
  const res = await api.post(`/crm/time-entries/${id}/lead-approve`);
  return unwrap(res);
};

export const approveTimeEntry = async (id: string): Promise<TimeEntry> => {
  const res = await api.post(`/crm/time-entries/${id}/approve`);
  return unwrap(res);
};

export const rejectTimeEntry = async (
  id: string,
  reason: string,
): Promise<TimeEntry> => {
  const res = await api.post(`/crm/time-entries/${id}/reject`, { reason });
  return unwrap(res);
};

export const fetchRateCards = async (): Promise<RateCard[]> => {
  const res = await api.get("/crm/rate-cards");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const upsertRateCard = async (
  employeeUserId: string,
  dto: UpsertRateCardPayload,
): Promise<RateCard> => {
  const res = await api.put(`/crm/rate-cards/${employeeUserId}`, dto);
  return unwrap(res);
};

// ── Employee self-service ────────────────────────────────────
// memberUserId is always resolved server-side from the caller's own
// session — never supplied here, same rule as everywhere else an
// employee only ever sees or writes their own data.

export interface CreateMyTimeEntryPayload {
  mandateId: string;
  taskId?: string;
  taskTitle?: string;
  narrative?: string;
  date: string;
  hours: number;
  billable?: boolean;
}

export const fetchMyTimeEntries = async (
  mandateId?: string,
): Promise<TimeEntry[]> => {
  const res = await api.get("/crm/my-time-entries", {
    params: mandateId ? { mandateId } : undefined,
  });
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const logMyTime = async (
  dto: CreateMyTimeEntryPayload,
): Promise<TimeEntry> => {
  const res = await api.post("/crm/my-time-entries", dto);
  return unwrap(res);
};

export const submitMyTimeEntry = async (id: string): Promise<TimeEntry> => {
  const res = await api.post(`/crm/my-time-entries/${id}/submit`);
  return unwrap(res);
};
