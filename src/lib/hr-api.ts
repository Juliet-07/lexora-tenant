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
// EMPLOYEES — Types
// ─────────────────────────────────────────────────────────────

export type EmploymentStatus =
  | "active"
  | "on_leave"
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
  clientId: string;
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
  department: string | null;
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

export interface EmployeeClientGroup {
  client: {
    _id: string;
    businessName: string;
    classifications?: string;
  };
  employees: Employee[];
}

export interface EmployeeGroupedResponse {
  stats: {
    totalHeadcount: number;
    clientsServed: number;
    active: number;
    onLeave: number;
  };
  groups: EmployeeClientGroup[];
  total: number;
}

export interface EmployeeStats {
  total: number;
  active: number;
  onLeave: number;
  terminated: number;
  byDepartment: { _id: string; count: number }[];
  byEmploymentType: { _id: string; count: number }[];
  byClient: { _id: string; count: number }[];
  recentJoins: Partial<Employee>[];
}

export interface CreateEmployeeDto {
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  startDate: string;
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
  department?: string;
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

// ─────────────────────────────────────────────────────────────
// LEAVE — Types
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
}

export interface LeaveRequest {
  _id: string;
  employeeId: {
    _id: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
    department: string | null;
  } | null;
  clientId: string;
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

export interface LeavePolicy {
  _id: string;
  tenantId: string;
  clientId: string;
  policies: {
    type: LeaveType;
    daysAllowed: number;
    carryOver: boolean;
  }[];
  effectiveFrom: string;
}

export interface LeaveStats {
  pending: number;
  byStatus: { _id: string; count: number }[];
  byType: { _id: string; count: number }[];
  recentApproved: LeaveRequest[];
}

// ─────────────────────────────────────────────────────────────
// EMPLOYEES — API calls
// ─────────────────────────────────────────────────────────────

export const fetchEmployeesGrouped = async (params?: {
  search?: string;
  clientId?: string;
  department?: string;
  employmentStatus?: string;
  employmentType?: string;
}): Promise<EmployeeGroupedResponse> => {
  const res = await api.get("/hr/employees/grouped", { params });
  return res.data?.data ?? res.data;
};

export const fetchEmployeeStats = async (): Promise<EmployeeStats> => {
  const res = await api.get("/hr/stats");
  return res.data?.data ?? res.data;
};

export const fetchEmployees = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  clientId?: string;
  department?: string;
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

export const fetchEmployeesByClient = async (
  clientId: string,
  params?: { page?: number; limit?: number },
): Promise<Paginated<Employee>> => {
  const res = await api.get(`/hr/clients/${clientId}/employees`, { params });
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

export const fetchDepartments = async (): Promise<string[]> => {
  const res = await api.get("/hr/employees/departments");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

// ─────────────────────────────────────────────────────────────
// CORPORATE CLIENTS — fetch for employee assignment
// Returns only corporate clients belonging to this tenant
// ─────────────────────────────────────────────────────────────

export interface CorporateClient {
  _id: string;
  fullName: string;
  email: string;
  profile: {
    _id: string;
    businessName?: string;
    classifications: string;
  } | null;
}

export const fetchCorporateClients = async (): Promise<CorporateClient[]> => {
  const res = await api.get("/tenant/my-clients", {
    params: { classification: "corporate", limit: 200 },
  });
  const d = res.data?.data ?? res.data;
  // my-clients returns paginated — extract items
  const items = d?.items ?? d ?? [];
  // Only return corporate clients
  return items.filter(
    (c: any) =>
      c.classifications === "corporate" ||
      c.profile?.classifications === "corporate",
  );
};

// ─────────────────────────────────────────────────────────────
// LEAVE — Types & API calls (placeholder — built in next section)
// ─────────────────────────────────────────────────────────────

export const fetchLeaveStats = async (
  clientId?: string,
): Promise<LeaveStats> => {
  const res = await api.get("/hr/leave/stats", {
    params: clientId ? { clientId } : {},
  });
  return res.data?.data ?? res.data;
};

export const fetchTenantLeaveRequests = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  clientId?: string;
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

export const upsertLeavePolicy = async (dto: {
  clientId: string;
  policies: { type: string; daysAllowed: number; carryOver?: boolean }[];
}): Promise<LeavePolicy> => {
  const res = await api.post("/hr/leave/policy", dto);
  return res.data?.data ?? res.data;
};

export const fetchLeavePolicy = async (
  clientId: string,
): Promise<LeavePolicy | null> => {
  const res = await api.get(`/hr/leave/policy/${clientId}`);
  return res.data?.data ?? res.data ?? null;
};

export const fetchAllLeavePolicies = async (): Promise<LeavePolicy[]> => {
  const res = await api.get("/hr/leave/policy");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

// ─────────────────────────────────────────────────────────────
// ATTENDANCE — Types & API calls (placeholder)
// ─────────────────────────────────────────────────────────────

// export const fetchAttendance = ...
// export const clockIn = ...
// export const clockOut = ...

// ─────────────────────────────────────────────────────────────
// PAYROLL — Types & API calls (placeholder)
// ─────────────────────────────────────────────────────────────

// export const fetchPayrollRecords = ...
// export const runPayroll = ...

// ─────────────────────────────────────────────────────────────
// PERFORMANCE — Types & API calls (placeholder)
// ─────────────────────────────────────────────────────────────

// export const fetchPerformanceReviews = ...
// export const createPerformanceReview = ...

// ─────────────────────────────────────────────────────────────
// CONTRACTS — Types & API calls (placeholder)
// ─────────────────────────────────────────────────────────────

// export const fetchContracts = ...
// export const createContract = ...

// ─────────────────────────────────────────────────────────────
// LEARNING — Types & API calls (placeholder)
// ─────────────────────────────────────────────────────────────

// export const fetchLearningRecords = ...
// export const assignCourse = ...

// ─────────────────────────────────────────────────────────────
// REQUISITIONS — Types & API calls (placeholder)
// ─────────────────────────────────────────────────────────────

// export const fetchRequisitions = ...
// export const createRequisition = ...

// ─────────────────────────────────────────────────────────────
// RECRUITMENT — Types & API calls (placeholder)
// ─────────────────────────────────────────────────────────────

// export const fetchJobPostings = ...
// export const createJobPosting = ...
// export const fetchApplications = ...
