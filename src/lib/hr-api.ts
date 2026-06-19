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
  nextOfKin: NextOfKin | null;
  medicalInfo: MedicalInfo | null;
  certificates: EmployeeCertificate[];
  references: EmployeeReference[];
  onboardingStep: number; // 0-4
  onboardingCompleted: boolean;
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

export interface NextOfKin {
  name: string;
  relationship: string | null;
  phone: string;
}

export interface MedicalInfo {
  bloodGroup: string;
  allergies: string | null;
  conditions: string | null;
  medications: string | null;
  doctorName: string | null;
  doctorPhone: string | null;
}

export interface EmployeeReference {
  name: string;
  relationship: string | null;
  email: string | null;
  phone: string | null;
}

export interface EmployeeCertificate {
  name: string;
  fileUrl: string;
  originalFileName: string;
  uploadedAt: string;
}

export interface OnboardingSavedState {
  dateOfBirth: string | null;
  nationality: string | null;
  address: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  } | null;
  nextOfKin: NextOfKin | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  medicalInfo: MedicalInfo | null;
  certificates: EmployeeCertificate[];
  references: EmployeeReference[];
}

export interface OnboardingStatusResponse {
  completed: boolean;
  step: number; // 0-4
  documents: OnboardingDocument[];
  saved: OnboardingSavedState | null;
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
// ── My Profile — self-service employee profile ─────────────────

export interface UpdateMyProfileDto {
  phone?: string;
  dateOfBirth?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bankName?: string;
  bankAccountNumber?: string;
  nationality?: string;
  nationalId?: string;
}

export const fetchMyProfile = async (): Promise<Employee> => {
  const res = await api.get("/employee/profile");
  return res.data?.data ?? res.data;
};

export const updateMyProfile = async (
  dto: UpdateMyProfileDto,
): Promise<Employee> => {
  const res = await api.patch("/employee/profile", dto);
  return res.data?.data ?? res.data;
};

export interface SaveOnboardingPersonalDto {
  dateOfBirth: string;
  nationality?: string;
  address: string;
  nextOfKin: { name: string; relationship?: string; phone: string };
  emergencyContactName: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone: string;
}

export const saveOnboardingPersonal = async (
  dto: SaveOnboardingPersonalDto,
): Promise<OnboardingStatusResponse> => {
  const res = await api.patch("/employee/onboarding/personal", dto);
  return res.data?.data ?? res.data;
};

export interface SaveOnboardingMedicalDto {
  bloodGroup: string;
  allergies?: string;
  conditions?: string;
  medications?: string;
  doctorName?: string;
  doctorPhone?: string;
}

export const saveOnboardingMedical = async (
  dto: SaveOnboardingMedicalDto,
): Promise<OnboardingStatusResponse> => {
  const res = await api.patch("/employee/onboarding/medical", dto);
  return res.data?.data ?? res.data;
};

export const uploadOnboardingCertificate = async (
  file: File,
  name?: string,
): Promise<EmployeeCertificate> => {
  const form = new FormData();
  form.append("file", file);
  if (name) form.append("name", name);
  const res = await api.post("/employee/onboarding/certificates", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data?.data ?? res.data;
};

export const deleteOnboardingCertificate = async (
  fileUrl: string,
): Promise<void> => {
  await api.delete("/employee/onboarding/certificates", { data: { fileUrl } });
};

export interface SaveOnboardingReferencesDto {
  references: {
    name: string;
    relationship?: string;
    email?: string;
    phone?: string;
  }[];
}

export const saveOnboardingReferences = async (
  dto: SaveOnboardingReferencesDto,
): Promise<OnboardingStatusResponse> => {
  const res = await api.patch("/employee/onboarding/references", dto);
  return res.data?.data ?? res.data;
};

// ── Payroll Policy — Types ──────────────────────────────────────

export type DeductionCalculationBase =
  | "gross"
  | "gross_minus_transport"
  | "net"
  | "taxable_income"
  | "basic";

export type DeductionKind = "percentage" | "flat" | "progressive_brackets";

export interface TaxBracket {
  minAmount: number;
  maxAmount: number | null;
  rate: number;
}

export interface PayrollDeductionRule {
  key: string;
  label: string;
  kind: DeductionKind;
  calculationBase: DeductionCalculationBase;
  employeeRate: number;
  employerRate: number;
  employeeFlatAmount: number;
  employerFlatAmount: number;
  brackets: TaxBracket[];
  visibleToEmployee: boolean;
  isActive: boolean;
  isStatutoryPreset: boolean;
}

export interface AllowanceType {
  key: string;
  label: string;
  isTransportAllowance: boolean;
  isTaxable: boolean;
}

export interface PayrollPolicy {
  _id: string;
  tenantId: string;
  locationId: {
    _id: string;
    name: string;
    country: string;
    city: string | null;
  } | null;
  currency: string;
  payFrequency: string;
  allowanceTypes: AllowanceType[];
  deductions: PayrollDeductionRule[];
  effectiveFrom: string;
  createdAt: string;
}

export interface UpsertPayrollPolicyDto {
  locationId?: string;
  currency: string;
  payFrequency?: string;
  allowanceTypes?: AllowanceType[];
  deductions?: PayrollDeductionRule[];
  effectiveFrom?: string;
}

// ── Payroll Policy — API calls ──────────────────────────────────

export const fetchAllPayrollPolicies = async (): Promise<PayrollPolicy[]> => {
  const res = await api.get("/hr/payroll/policy");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchPayrollPolicyForLocation = async (
  locationId: string,
): Promise<PayrollPolicy | null> => {
  const res = await api.get(`/hr/payroll/policy/for-location/${locationId}`);
  return res.data?.data ?? res.data ?? null;
};

export const fetchDefaultPayrollPolicy =
  async (): Promise<PayrollPolicy | null> => {
    const res = await api.get("/hr/payroll/policy/default");
    return res.data?.data ?? res.data ?? null;
  };

export const upsertPayrollPolicy = async (
  dto: UpsertPayrollPolicyDto,
): Promise<PayrollPolicy> => {
  const res = await api.post("/hr/payroll/policy", dto);
  return res.data?.data ?? res.data;
};

export const applyRwandaPayrollPreset = async (dto: {
  locationId?: string;
  overwrite?: boolean;
}): Promise<PayrollPolicy> => {
  const res = await api.post("/hr/payroll/policy/apply-rwanda-preset", dto);
  return res.data?.data ?? res.data;
};

export const deletePayrollPolicy = async (policyId: string): Promise<void> => {
  await api.delete(`/hr/payroll/policy/${policyId}`);
};

// ── Employee Loans — Types ──────────────────────────────────────

export type LoanStatus = "active" | "paid_off" | "cancelled" | "paused";

export interface EmployeeLoan {
  _id: string;
  employeeId:
    | {
        _id: string;
        firstName: string;
        lastName: string;
        employeeNumber: string;
      }
    | string;
  tenantId: string;
  label: string;
  principalAmount: number;
  currency: string;
  monthlyInstallment: number;
  outstandingBalance: number;
  status: LoanStatus;
  startDate: string;
  note: string | null;
  deductionHistory: {
    payrollRunId: string;
    amount: number;
    deductedAt: string;
  }[];
  createdAt: string;
}

export interface CreateLoanDto {
  employeeId: string;
  label: string;
  principalAmount: number;
  currency: string;
  monthlyInstallment: number;
  startDate?: string;
  note?: string;
}

export interface UpdateLoanDto {
  label?: string;
  monthlyInstallment?: number;
  status?: LoanStatus;
  note?: string;
}

// ── Employee Loans — API calls ──────────────────────────────────

export const fetchAllLoans = async (
  status?: LoanStatus,
): Promise<EmployeeLoan[]> => {
  const res = await api.get("/hr/payroll/loans", {
    params: status ? { status } : undefined,
  });
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchLoansForEmployee = async (
  employeeId: string,
): Promise<EmployeeLoan[]> => {
  const res = await api.get(`/hr/payroll/loans/employee/${employeeId}`);
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createLoan = async (dto: CreateLoanDto): Promise<EmployeeLoan> => {
  const res = await api.post("/hr/payroll/loans", dto);
  return res.data?.data ?? res.data;
};

export const updateLoan = async (
  loanId: string,
  dto: UpdateLoanDto,
): Promise<EmployeeLoan> => {
  const res = await api.patch(`/hr/payroll/loans/${loanId}`, dto);
  return res.data?.data ?? res.data;
};

export const deleteLoan = async (loanId: string): Promise<void> => {
  await api.delete(`/hr/payroll/loans/${loanId}`);
};

// ── Payroll Runs — Types ────────────────────────────────────────

export type PayrollRunStatus = "draft" | "processed" | "paid";

export interface PayrollRun {
  _id: string;
  tenantId: string;
  locationId: { _id: string; name: string; country: string } | null;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  runCurrency: string;
  status: PayrollRunStatus;
  employeeCount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalEmployerContributions: number;
  processedBy: string | null;
  processedAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface PayslipAllowanceLine {
  key: string;
  label: string;
  amount: number;
}

export interface PayslipDeductionLine {
  key: string;
  label: string;
  employeeAmount: number;
  employerAmount: number;
  visibleToEmployee: boolean;
}

export interface PayslipLoanLine {
  loanId: string;
  label: string;
  amountDeducted: number;
  remainingBalance: number;
}

export interface Payslip {
  _id: string;
  payrollRunId: string;
  employeeId: string;
  tenantId: string;
  employeeName: string;
  jobTitle: string | null;
  employeeNumber: string | null;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  payCurrency: string;
  sourceCurrency: string | null;
  exchangeRateApplied: number | null;
  exchangeRateDate: string | null;
  basicSalary: number;
  allowances: PayslipAllowanceLine[];
  grossSalary: number;
  deductions: PayslipDeductionLine[];
  loanDeductions: PayslipLoanLine[];
  totalEmployeeDeductions: number;
  totalEmployerContributions: number;
  netSalary: number;
  notes: string | null;
  createdAt: string;
}

export interface CreatePayrollRunDto {
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  locationId?: string;
  runCurrency: string;
}

// ── Payroll Runs — API calls ────────────────────────────────────

export const fetchAllPayrollRuns = async (): Promise<PayrollRun[]> => {
  const res = await api.get("/hr/payroll/runs");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchPayrollRunDetail = async (
  runId: string,
): Promise<{ run: PayrollRun; payslips: Payslip[] }> => {
  const res = await api.get(`/hr/payroll/runs/${runId}`);
  return res.data?.data ?? res.data;
};

export const createPayrollRun = async (dto: {
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  locationId?: string;
  employeeId?: string;
  runCurrency: string;
}): Promise<PayrollRun> => {
  const res = await api.post("/hr/payroll/runs", dto);
  return res.data?.data ?? res.data;
};

export const recalculatePayrollRun = async (
  runId: string,
): Promise<PayrollRun> => {
  const res = await api.post(`/hr/payroll/runs/${runId}/recalculate`, {});
  return res.data?.data ?? res.data;
};

export const processPayrollRun = async (runId: string): Promise<PayrollRun> => {
  const res = await api.post(`/hr/payroll/runs/${runId}/process`, {});
  return res.data?.data ?? res.data;
};

export const markPayrollRunPaid = async (
  runId: string,
): Promise<PayrollRun> => {
  const res = await api.post(`/hr/payroll/runs/${runId}/mark-paid`, {});
  return res.data?.data ?? res.data;
};

export const discardPayrollRun = async (runId: string): Promise<void> => {
  await api.delete(`/hr/payroll/runs/${runId}`);
};

export const fetchPayslipById = async (payslipId: string): Promise<Payslip> => {
  const res = await api.get(`/hr/payroll/runs/payslip/${payslipId}`);
  return res.data?.data ?? res.data;
};

export const fetchPayslipHtml = async (payslipId: string): Promise<string> => {
  const res = await api.get(`/hr/payroll/runs/payslip/${payslipId}/render`);
  return typeof res.data === "string" ? res.data : (res.data?.data ?? res.data);
};

// ── Payslip Template — Types & API ──────────────────────────────

export interface PayslipTemplate {
  _id: string;
  tenantId: string;
  logoUrl: string | null;
  accentColor: string;
  companyName: string | null;
  companyAddress: string | null;
  footerNote: string | null;
  showEmployerContributions: boolean;
  showLoanDeductions: boolean;
  showYearToDateSummary: boolean;
}

export interface UpdatePayslipTemplateDto {
  accentColor?: string;
  companyName?: string;
  companyAddress?: string;
  footerNote?: string;
  showEmployerContributions?: boolean;
  showLoanDeductions?: boolean;
  showYearToDateSummary?: boolean;
}

export const fetchPayslipTemplate = async (): Promise<PayslipTemplate> => {
  const res = await api.get("/hr/payroll/template");
  return res.data?.data ?? res.data;
};

export const updatePayslipTemplate = async (
  dto: UpdatePayslipTemplateDto,
): Promise<PayslipTemplate> => {
  const res = await api.patch("/hr/payroll/template", dto);
  return res.data?.data ?? res.data;
};

// ── Employee self-service — My Payslips ─────────────────────────

export const fetchMyPayslips = async (): Promise<Payslip[]> => {
  const res = await api.get("/employee/payslips");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchMyPayslipHtml = async (
  payslipId: string,
): Promise<string> => {
  const res = await api.get(`/employee/payslips/${payslipId}/render`);
  return typeof res.data === "string" ? res.data : (res.data?.data ?? res.data);
};

// ─────────────────────────────────────────────────────────────────────────────
// ADD/REPLACE in src/lib/hr-api.ts
// ─────────────────────────────────────────────────────────────────────────────

export interface EmployeePeriodStatus {
  status: "draft" | "processed" | "paid";
  payslipId: string;
  runId: string;
  netSalary: number;
  payCurrency: string;
}

// NEW — returns a map keyed by employeeId. Employees with no entry
// simply haven't been calculated for this period yet ("not_started").
export const fetchAllEmployeesPeriodStatus = async (
  periodLabel: string,
): Promise<Record<string, EmployeePeriodStatus>> => {
  const res = await api.get("/hr/payroll/runs/period-status", {
    params: { periodLabel },
  });
  return res.data?.data ?? res.data ?? {};
};
