import { api } from "./api";

// ─────────────────────────────────────────────────────────────
// SHARED TYPES
// ─────────────────────────────────────────────────────────────

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─────────────────────────────────────────────────────────────
// TEAM (DEPARTMENT) — Types & API
// ─────────────────────────────────────────────────────────────

export interface HrTeam {
  _id: string;
  tenantId: string;
  name: string;
  description: string | null;
  lead: string | null;
  memberCount: number;
  isActive: boolean;
  createdAt: string;
}

export const fetchTeams = async (): Promise<HrTeam[]> => {
  const res = await api.get("/hr/teams");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createTeam = async (dto: {
  name: string;
  description?: string;
  lead?: string;
}): Promise<HrTeam> => {
  const res = await api.post("/hr/teams", dto);
  return res.data?.data ?? res.data;
};

export const updateTeam = async (
  id: string,
  dto: { name?: string; description?: string; lead?: string },
): Promise<HrTeam> => {
  const res = await api.patch(`/hr/teams/${id}`, dto);
  return res.data?.data ?? res.data;
};

export const deleteTeam = async (id: string): Promise<void> => {
  await api.delete(`/hr/teams/${id}`);
};

// ─────────────────────────────────────────────────────────────
// LOCATION (BRANCH) — Types & API
// ─────────────────────────────────────────────────────────────

export interface HrLocation {
  _id: string;
  tenantId: string;
  name: string;
  country: string;
  city: string | null;
  address: string | null;
  timezone: string | null;
  memberCount: number;
  isActive: boolean;
  createdAt: string;
}

export const fetchLocations = async (): Promise<HrLocation[]> => {
  const res = await api.get("/hr/locations");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createLocation = async (dto: {
  name: string;
  country: string;
  city?: string;
  address?: string;
  timezone?: string;
}): Promise<HrLocation> => {
  const res = await api.post("/hr/locations", dto);
  return res.data?.data ?? res.data;
};

export const updateLocation = async (
  id: string,
  dto: {
    name?: string;
    country?: string;
    city?: string;
    address?: string;
    timezone?: string;
  },
): Promise<HrLocation> => {
  const res = await api.patch(`/hr/locations/${id}`, dto);
  return res.data?.data ?? res.data;
};

export const deleteLocation = async (id: string): Promise<void> => {
  await api.delete(`/hr/locations/${id}`);
};

// ─────────────────────────────────────────────────────────────
// EMPLOYEES — Types
// ─────────────────────────────────────────────────────────────

export type EmploymentStatus =
  | "active"
  | "on_leave"
  | "probation"
  | "suspended"
  | "terminated"
  | "resigned";

export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "intern"
  | "consultant";

export interface Employee {
  _id: string;
  tenantId: string;
  teamId: HrTeam | string | null;
  locationId: HrLocation | string | null;
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  nationalId: string | null;
  address: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  } | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  employeeNumber: string;
  jobTitle: string;
  reportsTo: string | null;
  employmentType: EmploymentType;
  employmentStatus: EmploymentStatus;
  startDate: string;
  endDate: string | null;
  probationEndDate: string | null;
  salary: number | null;
  salaryCurrency: string;
  salaryFrequency: string;
  bankName: string | null;
  bankAccountNumber: string | null;
  taxId: string | null;
  annualLeaveBalance: number;
  annualLeaveUsed: number;
  sickLeaveBalance: number;
  sickLeaveUsed: number;
  avatarUrl: string | null;
  documents: { name: string; url: string; uploadedAt: string }[];
  createdAt: string;
}

export interface EmployeeStats {
  total: number;
  active: number;
  onLeave: number;
  probation: number;
  terminated: number;
  teamCount: number;
  locationCount: number;
  byTeam: { _id: string; count: number }[];
  byLocation: { _id: string; count: number }[];
  recentJoins: Partial<Employee>[];
}

export interface CreateEmployeeDto {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  startDate: string;
  teamId?: string;
  locationId?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  nationality?: string;
  nationalId?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  reportsTo?: string;
  employmentType?: EmploymentType;
  probationEndDate?: string;
  salary?: number;
  salaryCurrency?: string;
  salaryFrequency?: string;
  bankName?: string;
  bankAccountNumber?: string;
  taxId?: string;
  annualLeaveBalance?: number;
  sickLeaveBalance?: number;
}

export interface TerminateEmployeeDto {
  endDate: string;
  reason: string;
  status: "terminated" | "resigned";
}
export interface EmployeeAttendanceRecord {
  _id: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  hoursWorked: number | null;
  location: string;
  status: string;
}

export interface EmployeeAttendanceStats {
  weekHours: number;
  monthHours: number;
  daysPresent: number;
  punctuality: number;
}

export interface EmployeeLeaveHistoryEntry {
  _id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  reason: string;
}

export interface EmployeeDetailResponse {
  employee: Employee;
  leave: {
    balances: LeaveBalance[];
    history: EmployeeLeaveHistoryEntry[];
  };
  attendance: {
    recent: EmployeeAttendanceRecord[];
    stats: EmployeeAttendanceStats;
  };
}
// ─────────────────────────────────────────────────────────────
// EMPLOYEES — API calls
// ─────────────────────────────────────────────────────────────

export const fetchEmployeeStats = async (): Promise<EmployeeStats> => {
  const res = await api.get("/hr/stats");
  return res.data?.data ?? res.data;
};

export const fetchEmployees = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  teamId?: string;
  locationId?: string;
  employmentStatus?: EmploymentStatus;
  employmentType?: EmploymentType;
}): Promise<Paginated<Employee>> => {
  const res = await api.get("/hr/employees", { params });
  return res.data?.data ?? res.data;
};

export const fetchEmployeeById = async (id: string): Promise<Employee> => {
  const res = await api.get(`/hr/employees/${id}`);
  return res.data?.data ?? res.data;
};

export const createEmployee = async (
  dto: CreateEmployeeDto,
): Promise<Employee> => {
  const res = await api.post("/hr/employees", dto);
  return res.data?.data ?? res.data;
};

export const updateEmployee = async (
  id: string,
  dto: Partial<CreateEmployeeDto>,
): Promise<Employee> => {
  const res = await api.patch(`/hr/employees/${id}`, dto);
  return res.data?.data ?? res.data;
};

export const terminateEmployee = async (
  id: string,
  dto: TerminateEmployeeDto,
): Promise<Employee> => {
  const res = await api.patch(`/hr/employees/${id}/terminate`, dto);
  return res.data?.data ?? res.data;
};

export const fetchEmployeeDetail = async (
  id: string,
): Promise<EmployeeDetailResponse> => {
  const res = await api.get(`/hr/employees/${id}/detail`);
  return res.data?.data ?? res.data;
};
// ─────────────────────────────────────────────────────────────
// LEAVE — Types & API (keep as-is, clientId removed internally)
// ─────────────────────────────────────────────────────────────

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
export type LeaveType =
  | "annual"
  | "sick"
  | "maternity"
  | "paternity"
  | "compassionate"
  | "study"
  | "unpaid";

export interface LeaveBalance {
  type: LeaveType;
  label: string;
  daysAllowed: number;
  daysUsed: number;
  daysLeft: number;
  carryOver?: boolean;
}

export interface LeaveRequest {
  _id: string;
  employeeId: {
    _id: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
  } | null;
  tenantId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface LeaveStats {
  pending: number;
  byStatus: { _id: string; count: number }[];
  byType: { _id: string; count: number }[];
  recentApproved: LeaveRequest[];
}

// ── Leave Policy — Types ──────────────────────────────────────

export interface LeavePolicyEntry {
  type: string;
  daysAllowed: number;
  carryOver: boolean;
  maxCarryOverDays: number;
}

export interface LeavePolicy {
  _id: string;
  tenantId: string;
  locationId: {
    _id: string;
    name: string;
    country: string;
    city: string | null;
  } | null;
  policies: LeavePolicyEntry[];
  memberCount: number;
  effectiveFrom: string;
  createdAt: string;
}

export interface MyLeaveBalanceResponse {
  balances: LeaveBalance[];
  locationId: string | null;
  policyId: string | null;
}

export const fetchLeaveStats = async (): Promise<LeaveStats> => {
  const res = await api.get("/hr/leave/stats");
  return res.data?.data ?? res.data;
};

export const fetchTenantLeaveRequests = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  employeeId?: string;
  type?: string;
}): Promise<Paginated<LeaveRequest>> => {
  const res = await api.get("/hr/leave/requests", { params });
  return res.data?.data ?? res.data;
};

export const reviewLeaveRequest = async (
  id: string,
  dto: { status: "approved" | "rejected"; reviewNote?: string },
): Promise<LeaveRequest> => {
  const res = await api.patch(`/hr/leave/requests/${id}/review`, dto);
  return res.data?.data ?? res.data;
};

// ── Leave Policy — API calls ──────────────────────────────────

export const fetchAllLeavePolicies = async (): Promise<LeavePolicy[]> => {
  const res = await api.get("/hr/leave/policy");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchLeavePolicy = async (
  locationId: string | "default",
): Promise<LeavePolicy | null> => {
  const res = await api.get(`/hr/leave/policy/${locationId}`);
  return res.data?.data ?? res.data ?? null;
};

export const fetchUncoveredLocations = async (): Promise<HrLocation[]> => {
  const res = await api.get("/hr/leave/policy/uncovered");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const upsertLeavePolicy = async (dto: {
  locationId: string | null;
  policies: { type: string; daysAllowed: number; carryOver?: boolean }[];
}): Promise<LeavePolicy> => {
  const res = await api.post("/hr/leave/policy", dto);
  return res.data?.data ?? res.data;
};

// ── Employee leave balance ─────────────────────────────────────

export const fetchMyLeaveBalance =
  async (): Promise<MyLeaveBalanceResponse> => {
    const res = await api.get("/employee/leave/balance");
    return res.data?.data ?? res.data;
  };

export const fetchMyLeaveRequests = async (): Promise<LeaveRequest[]> => {
  const res = await api.get("/employee/leave");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const submitLeaveRequest = async (dto: {
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
}): Promise<LeaveRequest> => {
  const res = await api.post("/employee/leave", dto);
  return res.data?.data ?? res.data;
};

export const cancelLeaveRequest = async (id: string): Promise<void> => {
  await api.patch(`/employee/leave/${id}/cancel`, {});
};

// ── Attendance — Types ────────────────────────────────────────

export type AttendanceStatus =
  | "present"
  | "late"
  | "remote"
  | "absent"
  | "on_leave";

export interface AttendanceRecord {
  _id: string;
  employeeId: string;
  tenantId: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  breakStartedAt: string | null;
  hoursWorked: number | null;
  location: string;
  status: AttendanceStatus;
  note: string | null;
}

export interface AttendanceStats {
  weekHours: number;
  monthHours: number;
  daysPresent: number;
}

// ── Attendance — API calls ────────────────────────────────────

export const fetchActiveShift = async (): Promise<AttendanceRecord | null> => {
  const res = await api.get("/employee/attendance/active");
  return res.data?.data ?? res.data ?? null;
};

export const fetchAttendanceStats = async (): Promise<AttendanceStats> => {
  const res = await api.get("/employee/attendance/stats");
  return res.data?.data ?? res.data;
};

export const fetchAttendanceHistory = async (
  limit = 30,
): Promise<AttendanceRecord[]> => {
  const res = await api.get("/employee/attendance", { params: { limit } });
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const clockIn = async (dto: {
  location?: string;
}): Promise<AttendanceRecord> => {
  const res = await api.post("/employee/attendance/clock-in", dto);
  return res.data?.data ?? res.data;
};

export const startBreak = async (): Promise<AttendanceRecord> => {
  const res = await api.post("/employee/attendance/break/start", {});
  return res.data?.data ?? res.data;
};

export const endBreak = async (): Promise<AttendanceRecord> => {
  const res = await api.post("/employee/attendance/break/end", {});
  return res.data?.data ?? res.data;
};

export const clockOut = async (): Promise<AttendanceRecord> => {
  const res = await api.post("/employee/attendance/clock-out", {});
  return res.data?.data ?? res.data;
};

// ── Onboarding — Types ────────────────────────────────────────

export type OnboardingDocType = "text" | "pdf";

export interface OnboardingDocument {
  _id: string;
  tenantId: string;
  title: string;
  type: OnboardingDocType;
  content: string | null; // populated when type === "text"
  fileUrl: string | null; // populated when type === "pdf"
  originalFileName: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
}

export interface OnboardingAcknowledgement {
  documentId: string;
  documentTitle: string;
  acknowledged: boolean;
}

export interface EmployeeOnboardingRecord {
  _id: string;
  employeeId: string;
  tenantId: string;
  signatureName: string;
  signedAt: string;
  ipAddress: string | null;
  acknowledgements: OnboardingAcknowledgement[];
  completedAt: string;
}

export interface OnboardingStatusResponse {
  completed: boolean;
  documents: OnboardingDocument[]; // empty when completed === true
}

export interface EmployeeOnboardingTabResponse {
  completed: boolean;
  record: EmployeeOnboardingRecord | null;
}

// ── Onboarding — Tenant admin API ───────────────────────────────

export const fetchOnboardingDocuments = async (
  includeInactive = false,
): Promise<OnboardingDocument[]> => {
  const res = await api.get("/hr/onboarding-documents", {
    params: includeInactive ? { includeInactive: "true" } : undefined,
  });
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createOnboardingDocument = async (dto: {
  title: string;
  type: OnboardingDocType;
  content?: string;
  order?: number;
  file?: File;
}): Promise<OnboardingDocument> => {
  const form = new FormData();
  form.append("title", dto.title);
  form.append("type", dto.type);
  if (dto.content) form.append("content", dto.content);
  if (dto.order !== undefined) form.append("order", String(dto.order));
  if (dto.file) form.append("file", dto.file);

  const res = await api.post("/hr/onboarding-documents", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data?.data ?? res.data;
};

export const updateOnboardingDocument = async (
  id: string,
  dto: {
    title?: string;
    content?: string;
    order?: number;
    isActive?: boolean;
    file?: File;
  },
): Promise<OnboardingDocument> => {
  const form = new FormData();
  if (dto.title !== undefined) form.append("title", dto.title);
  if (dto.content !== undefined) form.append("content", dto.content);
  if (dto.order !== undefined) form.append("order", String(dto.order));
  if (dto.isActive !== undefined) form.append("isActive", String(dto.isActive));
  if (dto.file) form.append("file", dto.file);

  const res = await api.patch(`/hr/onboarding-documents/${id}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data?.data ?? res.data;
};

export const deleteOnboardingDocument = async (id: string): Promise<void> => {
  await api.delete(`/hr/onboarding-documents/${id}`);
};

export const fetchEmployeeOnboardingRecord = async (
  employeeId: string,
): Promise<EmployeeOnboardingTabResponse> => {
  const res = await api.get(`/hr/onboarding-documents/employee/${employeeId}`);
  return res.data?.data ?? res.data;
};

// ── Onboarding — Employee self-service API ──────────────────────

export const fetchMyOnboardingStatus =
  async (): Promise<OnboardingStatusResponse> => {
    const res = await api.get("/employee/onboarding/status");
    return res.data?.data ?? res.data;
  };

export const completeMyOnboarding = async (dto: {
  signatureName: string;
  acknowledgedDocumentIds: string[];
}): Promise<EmployeeOnboardingRecord> => {
  const res = await api.post("/employee/onboarding/complete", dto);
  return res.data?.data ?? res.data;
};
