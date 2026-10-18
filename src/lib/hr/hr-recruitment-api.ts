import { api } from "../api";

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

export type OffboardingStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "reversed";
export type OffboardingType = "resignation" | "termination";

export type TerminationCategory =
  | "misconduct"
  | "performance"
  | "redundancy"
  | "mutual"
  | "resignation"
  | "fixed_term"
  | "retirement"
  | "probation";

export const TERMINATION_CATEGORY_LABEL: Record<TerminationCategory, string> = {
  misconduct: "Misconduct",
  performance: "Poor performance / incapacity",
  redundancy: "Redundancy",
  mutual: "Mutual agreement",
  resignation: "Resignation",
  fixed_term: "Fixed-term contract expiry",
  retirement: "Retirement",
  probation: "Probation failure",
};

export type NoticeHandling = "serve" | "pil" | "garden" | "summary";

export const NOTICE_HANDLING_LABEL: Record<NoticeHandling, string> = {
  serve: "Serve the notice period",
  pil: "Payment in lieu of notice",
  garden: "Garden leave",
  summary: "Summary dismissal (no notice)",
};

export type AppealOutcomeDecision =
  | "pending"
  | "hearing_scheduled"
  | "upheld"
  | "overturned"
  | "modified"
  | "adjourned"
  | "withdrawn";

export interface ClearanceItem {
  key: string;
  label: string;
  cleared: boolean;
  clearedAt: string | null;
  notes: string | null;
}

export interface OffboardingFileRef {
  name: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

// Kept as an alias — existing code referenced this name for the
// certificate-of-service file before the shared OffboardingFileRef
// shape was introduced.
export type OffboardingCertificateFile = OffboardingFileRef;

export interface FairnessItem {
  cat: "substantive" | "procedural";
  item: string;
  detail: string;
  status: "pass" | "pending";
}

export interface OffboardingAppeal {
  window: string;
  deadline: string | null;
  filed: boolean;
  filedAt: string | null;
  grounds: string | null;
  letterFile: OffboardingFileRef | null;
  hearingDate: string | null;
  status: AppealOutcomeDecision;
  panelMembers: string | null;
  hearingNotes: string | null;
  hearingMinutesFile: OffboardingFileRef | null;
  withdrawnReason: string | null;
  withdrawnAt: string | null;
  withdrawnFile: OffboardingFileRef | null;
}

export interface FinalPayDeductionLine {
  key: string;
  label: string;
  employeeAmount: number;
  employerAmount: number;
  visibleToEmployee: boolean;
}

export interface OffboardingFinalPay {
  proRataDays: number;
  proRataAmount: number;
  leaveBalanceDays: number;
  leaveBalanceAmount: number;
  thirteenthMonthAmount: number;
  transportAllowanceProrated: number;
  outstandingAdvances: number;
  severanceDue: boolean;
  severanceAmount: number;
  grossFinalPay: number;
  deductions: FinalPayDeductionLine[];
  netFinalPay: number;
  currency: string;
  computedAt: string;
  approved: boolean;
  approvedAt: string | null;
  sentToPayrollAt: string | null;
}

export interface OffboardingRecord {
  _id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  jobTitle: string;
  type: OffboardingType;
  category: TerminationCategory | null;
  endDate: string;
  reason: string | null;
  status: OffboardingStatus;

  // Step 1 — fairness checklist
  fairnessChecklist: FairnessItem[];

  // Step 2 — notice
  noticePeriodDays: number | null;
  noticePeriodLabel: string | null;
  noticeType: NoticeHandling | null;
  noticeServed: boolean;
  noticeServedAt: string | null;
  noticeMethod: string | null;
  noticeFile: OffboardingFileRef | null;
  noticePaused: boolean;
  noticePausedAt: string | null;
  noticePausedReason: string | null;

  // Step 3 — appeal
  appeal: OffboardingAppeal | null;

  // Step 4 — exit interview
  exitInterviewDone: boolean;
  exitInterviewNotes: string | null;
  exitFormSent: boolean;
  exitFormSentAt: string | null;
  exitFormDeadline: string | null;
  exitScheduled: boolean;
  exitScheduledAt: string | null;
  exitInterviewer: string | null;
  exitLocation: string | null;
  exitReasonCategory: string | null;
  exitRating: number | null;
  exitWhatWentWell: string | null;
  exitWhatToImprove: string | null;
  exitFairnessAssessment: string | null;

  // Step 5 — clearance & handover
  clearanceChecklist: ClearanceItem[];
  handoverNotes: string | null;
  assignedTo: string | null;
  handoverAssigneeName: string | null;

  // Step 6 — final pay
  finalPay: OffboardingFinalPay | null;

  // Step 7 — certificate of service
  completedAt: string | null;
  certificateOfServiceSentAt: string | null;
  certificateGeneratedAt: string | null;
  certificateOfServiceFile: OffboardingFileRef | null;

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

export const uploadOffboardingCertificate = async (
  recordId: string,
  file: File,
): Promise<OffboardingRecord> => {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post(
    `/hr/recruitment/offboarding/${recordId}/certificate/upload`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return res.data?.data ?? res.data;
};

export const sendOffboardingCertificate = async (
  recordId: string,
): Promise<OffboardingRecord> => {
  const res = await api.post(
    `/hr/recruitment/offboarding/${recordId}/certificate/send`,
    {},
  );
  return res.data?.data ?? res.data;
};

export const generateOffboardingCertificate = async (
  recordId: string,
): Promise<OffboardingRecord> => {
  const res = await api.post(
    `/hr/recruitment/offboarding/${recordId}/certificate/generate`,
    {},
  );
  return res.data?.data ?? res.data;
};

const RECRUITMENT_API_BASE = (api.defaults as any)?.baseURL ?? "/api";
export const resolveOffboardingFileUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith("http")) return url;
  const origin = new URL(RECRUITMENT_API_BASE).origin;
  return `${origin}${url}`;
};

export const updateOffboarding = async (
  recordId: string,
  dto: {
    exitInterviewDone?: boolean;
    exitInterviewNotes?: string;
    clearanceChecklist?: { key: string; cleared: boolean; notes?: string }[];
    handoverNotes?: string;
    assignedTo?: string;
    handoverAssigneeName?: string;
  },
): Promise<OffboardingRecord> => {
  const res = await api.patch(`/hr/recruitment/offboarding/${recordId}`, dto);
  return res.data?.data ?? res.data;
};

// ── Step 1: Pre-termination fairness checklist ──

export const updateOffboardingFairnessChecklist = async (
  recordId: string,
  items: { index: number; status: "pass" | "pending" }[],
): Promise<OffboardingRecord> => {
  const res = await api.patch(
    `/hr/recruitment/offboarding/${recordId}/fairness`,
    { items },
  );
  return res.data?.data ?? res.data;
};

// ── Step 2: Draft & serve notice ──

export const downloadOffboardingNoticePdf = async (
  recordId: string,
  employeeName: string,
): Promise<void> => {
  const res = await api.get(
    `/hr/recruitment/offboarding/${recordId}/notice/pdf`,
    { responseType: "blob" },
  );
  const blob = new Blob([res.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Termination-Notice-${employeeName.replace(/\s+/g, "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

export const downloadOffboardingNoticeDocx = async (
  recordId: string,
  employeeName: string,
): Promise<void> => {
  const res = await api.get(
    `/hr/recruitment/offboarding/${recordId}/notice/docx`,
    { responseType: "blob" },
  );
  const blob = new Blob([res.data], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Termination-Notice-${employeeName.replace(/\s+/g, "_")}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

export const serveOffboardingNotice = async (
  recordId: string,
  dto: { noticeType: NoticeHandling; method: string; servedAt?: string },
): Promise<OffboardingRecord> => {
  const res = await api.patch(
    `/hr/recruitment/offboarding/${recordId}/notice/serve`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const uploadOffboardingNoticeFile = async (
  recordId: string,
  file: File,
): Promise<OffboardingRecord> => {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post(
    `/hr/recruitment/offboarding/${recordId}/notice/file`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return res.data?.data ?? res.data;
};

// ── Step 3: Appeal period (Art. 29) ──

export const fileOffboardingAppeal = async (
  recordId: string,
  dto: { filedAt: string; grounds: string; hearingDate?: string },
): Promise<OffboardingRecord> => {
  const res = await api.post(
    `/hr/recruitment/offboarding/${recordId}/appeal/file`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const recordOffboardingAppealOutcome = async (
  recordId: string,
  dto: {
    decision: "upheld" | "overturned" | "modified" | "adjourned";
    panelMembers?: string;
    notes?: string;
  },
): Promise<OffboardingRecord> => {
  const res = await api.patch(
    `/hr/recruitment/offboarding/${recordId}/appeal/outcome`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const withdrawOffboardingAppeal = async (
  recordId: string,
  reason: string,
): Promise<OffboardingRecord> => {
  const res = await api.post(
    `/hr/recruitment/offboarding/${recordId}/appeal/withdraw`,
    { reason },
  );
  return res.data?.data ?? res.data;
};

export const uploadOffboardingAppealFile = async (
  recordId: string,
  kind: "hearing_minutes" | "withdrawal_letter",
  file: File,
): Promise<OffboardingRecord> => {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post(
    `/hr/recruitment/offboarding/${recordId}/appeal/upload`,
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
      params: { kind },
    },
  );
  return res.data?.data ?? res.data;
};

// ── Step 4: Exit interview ──

export const updateOffboardingExitInterview = async (
  recordId: string,
  dto: Partial<{
    formSent: boolean;
    formDeadline: string;
    scheduled: boolean;
    scheduledAt: string;
    interviewer: string;
    location: string;
    done: boolean;
    reasonCategory: string;
    rating: number;
    whatWentWell: string;
    whatToImprove: string;
    fairnessAssessment: string;
    notes: string;
  }>,
): Promise<OffboardingRecord> => {
  const res = await api.patch(
    `/hr/recruitment/offboarding/${recordId}/exit-interview`,
    dto,
  );
  return res.data?.data ?? res.data;
};

// ── Step 6: Final pay ──

export const computeOffboardingFinalPay = async (
  recordId: string,
): Promise<OffboardingRecord> => {
  const res = await api.post(
    `/hr/recruitment/offboarding/${recordId}/final-pay/compute`,
    {},
  );
  return res.data?.data ?? res.data;
};

export const approveOffboardingFinalPay = async (
  recordId: string,
): Promise<OffboardingRecord> => {
  const res = await api.post(
    `/hr/recruitment/offboarding/${recordId}/final-pay/approve`,
    {},
  );
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
