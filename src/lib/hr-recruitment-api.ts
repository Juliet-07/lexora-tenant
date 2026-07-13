import { api } from "./api";

// ─────────────────────────────────────────────────────────────
// CANDIDATES — Types & API
// ─────────────────────────────────────────────────────────────

export type CandidateStage =
  | "sourced"
  | "screening"
  | "interview"
  | "offer"
  | "hired"
  | "rejected";

export type CandidateSource =
  | "referral"
  | "linkedin"
  | "job_board"
  | "agency"
  | "website"
  | "other";

export type WorkerCategory = "employee" | "consultant";

export interface StageHistoryEntry {
  stage: CandidateStage;
  enteredAt: string;
}

export interface Candidate {
  _id: string;
  tenantId: string;
  name: string;
  email: string;
  phone: string | null;
  roleAppliedFor: string;
  source: CandidateSource;
  workerCategory: WorkerCategory;
  stage: CandidateStage;
  rating: number;
  notes: string | null;
  rejectionReason: string | null;
  stageHistory: StageHistoryEntry[];
  resumeUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export const EMPLOYEE_STAGE_ORDER: CandidateStage[] = [
  "sourced",
  "screening",
  "interview",
  "offer",
  "hired",
];

export const CONSULTANT_STAGE_ORDER: CandidateStage[] = [
  "sourced",
  "screening",
  "hired",
];

export const fetchAllCandidates = async (
  stage?: CandidateStage,
): Promise<Candidate[]> => {
  const res = await api.get("/hr/recruitment/candidates", {
    params: stage ? { stage } : undefined,
  });
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchCandidateStageCounts = async (): Promise<
  Record<string, number>
> => {
  const res = await api.get("/hr/recruitment/candidates/stage-counts");
  return res.data?.data ?? res.data ?? {};
};

export const fetchCandidateById = async (
  candidateId: string,
): Promise<Candidate> => {
  const res = await api.get(`/hr/recruitment/candidates/${candidateId}`);
  return res.data?.data ?? res.data;
};

export const createCandidate = async (dto: {
  name: string;
  email: string;
  phone?: string;
  roleAppliedFor: string;
  source?: CandidateSource;
  workerCategory?: WorkerCategory;
  notes?: string;
}): Promise<Candidate> => {
  const res = await api.post("/hr/recruitment/candidates", dto);
  return res.data?.data ?? res.data;
};

export const updateCandidate = async (
  candidateId: string,
  dto: {
    name?: string;
    email?: string;
    phone?: string;
    roleAppliedFor?: string;
    source?: CandidateSource;
    rating?: number;
    notes?: string;
  },
): Promise<Candidate> => {
  const res = await api.patch(`/hr/recruitment/candidates/${candidateId}`, dto);
  return res.data?.data ?? res.data;
};

export const moveCandidateStage = async (
  candidateId: string,
  dto: { stage: CandidateStage; rejectionReason?: string },
): Promise<Candidate> => {
  const res = await api.patch(
    `/hr/recruitment/candidates/${candidateId}/stage`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const deleteCandidate = async (candidateId: string): Promise<void> => {
  await api.delete(`/hr/recruitment/candidates/${candidateId}`);
};

export const getStageOrderFor = (
  workerCategory: WorkerCategory,
): CandidateStage[] =>
  workerCategory === "consultant"
    ? CONSULTANT_STAGE_ORDER
    : EMPLOYEE_STAGE_ORDER;

export const getNextStage = (
  currentStage: CandidateStage,
  workerCategory: WorkerCategory,
): CandidateStage | null => {
  const order = getStageOrderFor(workerCategory);
  const idx = order.indexOf(currentStage);
  if (idx === -1 || idx === order.length - 1) return null;
  return order[idx + 1];
};
// ─────────────────────────────────────────────────────────────
// OFFBOARDING — Types & API
// ─────────────────────────────────────────────────────────────

export type OffboardingStatus = "not_started" | "in_progress" | "completed";
export type OffboardingType = "resignation" | "termination";

export interface ClearanceItem {
  key: string;
  label: string;
  cleared: boolean;
  clearedAt: string | null;
  notes: string | null;
}

export interface OffboardingRecord {
  _id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  jobTitle: string;
  type: OffboardingType;
  endDate: string;
  reason: string | null;
  status: OffboardingStatus;
  exitInterviewDone: boolean;
  exitInterviewNotes: string | null;
  clearanceChecklist: ClearanceItem[];
  handoverNotes: string | null;
  assignedTo: string | null;
  completedAt: string | null;
  createdAt: string;
}

export const fetchAllOffboarding = async (
  status?: OffboardingStatus,
): Promise<OffboardingRecord[]> => {
  const res = await api.get("/hr/recruitment/offboarding", {
    params: status ? { status } : undefined,
  });
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchOffboardingById = async (
  recordId: string,
): Promise<OffboardingRecord> => {
  const res = await api.get(`/hr/recruitment/offboarding/${recordId}`);
  return res.data?.data ?? res.data;
};

export const updateOffboarding = async (
  recordId: string,
  dto: {
    exitInterviewDone?: boolean;
    exitInterviewNotes?: string;
    clearanceChecklist?: { key: string; cleared: boolean; notes?: string }[];
    handoverNotes?: string;
    assignedTo?: string;
  },
): Promise<OffboardingRecord> => {
  const res = await api.patch(`/hr/recruitment/offboarding/${recordId}`, dto);
  return res.data?.data ?? res.data;
};

// ─────────────────────────────────────────────────────────────
// SUCCESSION PLANNING — Types & API
// ─────────────────────────────────────────────────────────────

export type RiskOfLoss = "low" | "medium" | "high";
export type BenchReadiness =
  | "ready_now"
  | "ready_1_2_years"
  | "ready_3_plus_years"
  | "gap";
export type SuccessorPotential = "high" | "medium" | "low";

export interface Successor {
  employeeId: string;
  employeeName: string;
  readiness: BenchReadiness;
  potential: SuccessorPotential;
  notes: string | null;
}

export interface SuccessionPlan {
  _id: string;
  tenantId: string;
  criticalRole: string;
  incumbentId: string;
  incumbentName: string;
  riskOfLoss: RiskOfLoss;
  overallReadiness: BenchReadiness;
  successors: Successor[];
  notes: string | null;
  createdAt: string;
}

export const fetchAllSuccessionPlans = async (): Promise<SuccessionPlan[]> => {
  const res = await api.get("/hr/recruitment/succession-plans");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchSuccessionPlanById = async (
  planId: string,
): Promise<SuccessionPlan> => {
  const res = await api.get(`/hr/recruitment/succession-plans/${planId}`);
  return res.data?.data ?? res.data;
};

export const createSuccessionPlan = async (dto: {
  criticalRole: string;
  incumbentId: string;
  riskOfLoss?: RiskOfLoss;
  overallReadiness?: BenchReadiness;
  notes?: string;
}): Promise<SuccessionPlan> => {
  const res = await api.post("/hr/recruitment/succession-plans", dto);
  return res.data?.data ?? res.data;
};

export const updateSuccessionPlan = async (
  planId: string,
  dto: {
    criticalRole?: string;
    riskOfLoss?: RiskOfLoss;
    overallReadiness?: BenchReadiness;
    notes?: string;
  },
): Promise<SuccessionPlan> => {
  const res = await api.patch(
    `/hr/recruitment/succession-plans/${planId}`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const deleteSuccessionPlan = async (planId: string): Promise<void> => {
  await api.delete(`/hr/recruitment/succession-plans/${planId}`);
};

export const addSuccessor = async (
  planId: string,
  dto: {
    employeeId: string;
    readiness?: BenchReadiness;
    potential?: SuccessorPotential;
    notes?: string;
  },
): Promise<SuccessionPlan> => {
  const res = await api.post(
    `/hr/recruitment/succession-plans/${planId}/successors`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const removeSuccessor = async (
  planId: string,
  employeeId: string,
): Promise<SuccessionPlan> => {
  const res = await api.delete(
    `/hr/recruitment/succession-plans/${planId}/successors/${employeeId}`,
  );
  return res.data?.data ?? res.data;
};

// ─────────────────────────────────────────────────────────────
// JOB OPENING — Types & API
// ─────────────────────────────────────────────────────────────

export type JobOpeningType = "Full-time" | "Part-time" | "Contract";
export type JobOpeningStatus = "Open" | "Interviewing" | "Filled";

export interface JobOpening {
  _id: string;
  title: string;
  teamId: { _id: string; name: string } | string | null;
  locationId:
    | { _id: string; name: string; country?: string; city?: string }
    | string
    | null;
  type: JobOpeningType;
  status: JobOpeningStatus;
  description: string | null;
  postedDate: string;
  filledAt: string | null;
  createdAt: string;
}

export const fetchJobOpenings = async (): Promise<JobOpening[]> => {
  const res = await api.get("/hr/job-openings");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createJobOpening = async (dto: {
  title: string;
  teamId?: string;
  locationId?: string;
  type?: JobOpeningType;
  description?: string;
}): Promise<JobOpening> => {
  const res = await api.post("/hr/job-openings", dto);
  return res.data?.data ?? res.data;
};

export const updateJobOpening = async (
  id: string,
  dto: Partial<{
    title: string;
    teamId: string;
    locationId: string;
    type: JobOpeningType;
    description: string;
    status: JobOpeningStatus;
  }>,
): Promise<JobOpening> => {
  const res = await api.patch(`/hr/job-openings/${id}`, dto);
  return res.data?.data ?? res.data;
};

export const deleteJobOpening = async (id: string): Promise<void> => {
  await api.delete(`/hr/job-openings/${id}`);
};
