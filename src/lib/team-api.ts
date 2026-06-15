import { api } from "./api";

// ─────────────────────────────────────────────────────────────
// SHARED TYPES
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// LEAVE — Types
// ─────────────────────────────────────────────────────────────

export type TeamLeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
export type TeamLeaveType =
  | "annual"
  | "sick"
  | "parental"
  | "compassionate"
  | "study"
  | "unpaid";

export interface TeamLeaveBalance {
  type: TeamLeaveType;
  label: string;
  entitled: number;
  used: number;
  remaining: number;
}

export interface TeamLeaveRequest {
  _id: string;
  memberId:
    | string
    | { _id: string; firstName: string; lastName: string; email: string };
  tenantId: string;
  type: TeamLeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: TeamLeaveStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// ATTENDANCE — Types
// ─────────────────────────────────────────────────────────────

export type AttendanceStatus = "present" | "late" | "remote" | "absent";

export interface AttendanceRecord {
  _id: string;
  memberId: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  hoursWorked: number | null;
  location: string;
  status: AttendanceStatus;
  breakStartedAt: string | null;
}

export interface AttendanceStats {
  weekHours: number;
  monthHours: number;
  daysPresent: number;
}

// ─────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────

export const fetchMyTeamProfile = async () => {
  const res = await api.get("/tenant/me/profile");
  return res.data?.data ?? res.data;
};

export const updateMyTeamProfile = async (dto: {
  phone?: string;
  firstName?: string;
  lastName?: string;
}) => {
  const res = await api.patch("/tenant/me/profile", dto);
  return res.data?.data ?? res.data;
};

// ─────────────────────────────────────────────────────────────
// LEAVE — self-service (team member)
// ─────────────────────────────────────────────────────────────

export const fetchMyTeamLeaveBalance = async (): Promise<
  TeamLeaveBalance[]
> => {
  const res = await api.get("/tenant/me/leave/balance");
  const d = res.data?.data ?? res.data;
  console.log(d)
  return Array.isArray(d) ? d : [];
};

export const fetchMyTeamLeaveHistory = async (): Promise<
  TeamLeaveRequest[]
> => {
  const res = await api.get("/tenant/me/leave");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const submitTeamLeaveRequest = async (dto: {
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
}): Promise<TeamLeaveRequest> => {
  const res = await api.post("/tenant/me/leave", dto);
  return res.data?.data ?? res.data;
};

export const cancelTeamLeaveRequest = async (
  id: string,
): Promise<TeamLeaveRequest> => {
  const res = await api.patch(`/tenant/me/leave/${id}/cancel`, {});
  return res.data?.data ?? res.data;
};

// ─────────────────────────────────────────────────────────────
// LEAVE — admin review (tenant owner/admin/manager)
// ─────────────────────────────────────────────────────────────

export const fetchTeamLeaveRequests = async (params?: {
  status?: string;
  memberId?: string;
}): Promise<TeamLeaveRequest[]> => {
  const res = await api.get("/tenant/team/leave", { params });
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const reviewTeamLeaveRequest = async (
  id: string,
  dto: { status: "approved" | "rejected"; reviewNote?: string },
): Promise<TeamLeaveRequest> => {
  const res = await api.patch(`/tenant/team/leave/${id}/review`, dto);
  return res.data?.data ?? res.data;
};

// ─────────────────────────────────────────────────────────────
// ATTENDANCE
// ─────────────────────────────────────────────────────────────

export const fetchActiveShift = async (): Promise<AttendanceRecord | null> => {
  const res = await api.get("/tenant/me/attendance/active");
  return res.data?.data ?? res.data ?? null;
};

export const fetchAttendanceStats = async (): Promise<AttendanceStats> => {
  const res = await api.get("/tenant/me/attendance/stats");
  return res.data?.data ?? res.data;
};

export const fetchAttendanceHistory = async (
  limit = 30,
): Promise<AttendanceRecord[]> => {
  const res = await api.get("/tenant/me/attendance", { params: { limit } });
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const clockIn = async (dto: {
  location?: string;
}): Promise<AttendanceRecord> => {
  const res = await api.post("/tenant/me/attendance/clock-in", dto);
  return res.data?.data ?? res.data;
};

export const startBreak = async (): Promise<AttendanceRecord> => {
  const res = await api.post("/tenant/me/attendance/break/start", {});
  return res.data?.data ?? res.data;
};

export const endBreak = async (): Promise<AttendanceRecord> => {
  const res = await api.post("/tenant/me/attendance/break/end", {});
  return res.data?.data ?? res.data;
};

export const clockOut = async (): Promise<AttendanceRecord> => {
  const res = await api.post("/tenant/me/attendance/clock-out", {});
  return res.data?.data ?? res.data;
};
