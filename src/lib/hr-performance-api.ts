import { api } from "./api";

// ─────────────────────────────────────────────────────────────
// SHARED TYPES — mirror the real backend schemas exactly
// ─────────────────────────────────────────────────────────────

// ── KPI Template ──────────────────────────────────────────────

export interface KpiDefinition {
  key: string;
  title: string;
  performanceStandard: string;
  weight: number; // fraction, e.g. 0.20 for 20%
}

export interface KpiTemplate {
  _id: string;
  tenantId: string;
  jobTitle: string;
  kpis: KpiDefinition[];
  isActive: boolean;
  createdAt: string;
}

export const fetchAllKpiTemplates = async (): Promise<KpiTemplate[]> => {
  const res = await api.get("/hr/performance/kpi-templates");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchKpiTemplateForJobTitle = async (
  jobTitle: string,
): Promise<KpiTemplate | null> => {
  const res = await api.get(
    `/hr/performance/kpi-templates/for-job-title/${encodeURIComponent(jobTitle)}`,
  );
  return res.data?.data ?? res.data ?? null;
};

export const upsertKpiTemplate = async (dto: {
  jobTitle: string;
  kpis: KpiDefinition[];
}): Promise<KpiTemplate> => {
  const res = await api.post("/hr/performance/kpi-templates", dto);
  return res.data?.data ?? res.data;
};

export const deleteKpiTemplate = async (templateId: string): Promise<void> => {
  await api.delete(`/hr/performance/kpi-templates/${templateId}`);
};

// ── Frameworks (Competencies / Values) ──────────────────────────

export interface FrameworkItem {
  key: string;
  title: string;
  description: string;
}

export interface CompetencyFramework {
  _id: string;
  tenantId: string;
  items: FrameworkItem[];
}

export interface ValuesFramework {
  _id: string;
  tenantId: string;
  items: FrameworkItem[];
}

export const fetchCompetencyFramework =
  async (): Promise<CompetencyFramework> => {
    const res = await api.get("/hr/performance/frameworks/competencies");
    return res.data?.data ?? res.data;
  };

export const updateCompetencyFramework = async (
  items: FrameworkItem[],
): Promise<CompetencyFramework> => {
  const res = await api.patch("/hr/performance/frameworks/competencies", {
    items,
  });
  return res.data?.data ?? res.data;
};

export const fetchValuesFramework = async (): Promise<ValuesFramework> => {
  const res = await api.get("/hr/performance/frameworks/values");
  return res.data?.data ?? res.data;
};

export const updateValuesFramework = async (
  items: FrameworkItem[],
): Promise<ValuesFramework> => {
  const res = await api.patch("/hr/performance/frameworks/values", { items });
  return res.data?.data ?? res.data;
};

// ── Review Cycle ─────────────────────────────────────────────────

export type ReviewCycleStatus = "draft" | "open" | "closed";

export interface ReviewCycle {
  _id: string;
  tenantId: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  reviewDate: string;
  locationId: { _id: string; name: string; country: string } | null;
  teamId: { _id: string; name: string } | null;
  status: ReviewCycleStatus;
  employeeCount: number;
  completedCount: number;
  skippedEmployees: {
    employeeId: string;
    employeeName: string;
    reason: string;
  }[];
  createdBy: string | null;
  createdAt: string;
}

export const fetchAllReviewCycles = async (): Promise<ReviewCycle[]> => {
  const res = await api.get("/hr/performance/cycles");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchReviewCycleDetail = async (
  cycleId: string,
): Promise<{ cycle: ReviewCycle; reviews: PerformanceReview[] }> => {
  const res = await api.get(`/hr/performance/cycles/${cycleId}`);
  return res.data?.data ?? res.data;
};

export const createReviewCycle = async (dto: {
  name: string;
  periodStart: string;
  periodEnd: string;
  reviewDate: string;
  locationId?: string;
  teamId?: string;
  employeeId?: string;
}): Promise<ReviewCycle> => {
  const res = await api.post("/hr/performance/cycles", dto);
  return res.data?.data ?? res.data;
};

export const openReviewCycle = async (
  cycleId: string,
): Promise<ReviewCycle> => {
  const res = await api.post(`/hr/performance/cycles/${cycleId}/open`, {});
  return res.data?.data ?? res.data;
};

export const closeReviewCycle = async (
  cycleId: string,
): Promise<ReviewCycle> => {
  const res = await api.post(`/hr/performance/cycles/${cycleId}/close`, {});
  return res.data?.data ?? res.data;
};

export const discardReviewCycle = async (cycleId: string): Promise<void> => {
  await api.delete(`/hr/performance/cycles/${cycleId}`);
};

// ── Performance Review — shared shapes ──────────────────────────

export type ReviewStatus =
  | "employee_in_progress"
  | "manager_in_progress"
  | "completed";

export interface ScoredKpiLine {
  key: string;
  title: string;
  performanceStandard: string;
  weight: number;
  employeeScore: number | null;
  managerScore: number | null;
}

export interface ScoredFrameworkLine {
  key: string;
  title: string;
  description: string;
  employeeScore: number | null;
  employeeComment: string | null;
  managerScore: number | null;
  managerObservation: string | null;
}

export interface PreviousGoalReview {
  description: string;
  status:
    | "achieved"
    | "partially_achieved"
    | "not_achieved"
    | "carried_forward"
    | null;
  employeeComment: string | null;
  managerComment: string | null;
}

export interface NextPeriodGoal {
  description: string;
  priority: "high" | "medium" | "low";
  timeline: string | null;
  managerComments: string | null;
}

export interface TrainingNeed {
  area: string;
  priority: "high" | "medium" | "low";
  managerRecommendation: string | null;
}

export interface ComplianceCheckItem {
  key: string;
  label: string;
  answer: "yes" | "no" | null;
  date: string | null;
  notes: string | null;
}

export interface PerformanceReview {
  _id: string;
  reviewCycleId: string;
  employeeId: string;
  tenantId: string;
  employeeName: string;
  jobTitle: string;
  department: string | null;
  managerName: string | null;
  status: ReviewStatus;
  complianceChecks: ComplianceCheckItem[];
  kpis: ScoredKpiLine[];
  competencies: ScoredFrameworkLine[];
  values: ScoredFrameworkLine[];
  achievements: string | null;
  challenges: string | null;
  previousGoalsReview: PreviousGoalReview[];
  nextPeriodGoals: NextPeriodGoal[];
  trainingNeeds: TrainingNeed[];
  shortTermCareerGoals: string | null;
  longTermCareerGoals: string | null;
  managerSummaryLastPeriod: string | null;
  managerAssessmentThisPeriod: string | null;
  managerDevelopmentAreas: string | null;
  managerConclusions: string | null;
  employeeFeedbackComments: string | null;
  employeeSignedAt: string | null;
  employeeSubmittedAt: string | null;
  managerSignedAt: string | null;
  managerSignedBy: string | null;
  createdAt: string;
  subjectHierarchyRole: "regular" | "manager" | "head_of_department" | null;
}

// ── Live-computed scores, returned alongside a review ───────────

export interface KpiScoreResult {
  key: string;
  title: string;
  weight: number;
  employeeScore: number | null;
  managerScore: number | null;
  combinedAverage: number | null;
  weightedScore: number | null;
}

export interface FrameworkScoreResult {
  key: string;
  title: string;
  employeeScore: number | null;
  managerScore: number | null;
  combinedAverage: number | null;
  divergent: boolean;
}

export interface KpiSectionResult {
  lines: KpiScoreResult[];
  employeeAverage: number | null;
  managerAverage: number | null;
  totalWeightedScore: number | null;
  ratingBand: string;
}

export interface FrameworkSectionResult {
  lines: FrameworkScoreResult[];
  overallScore: number | null;
  ratingBand: string;
}

export interface ScoredReviewResponse {
  review: PerformanceReview;
  scores: {
    kpiSection: KpiSectionResult;
    competencySection: FrameworkSectionResult;
    valuesSection: FrameworkSectionResult;
  };
}

// ── Performance Review — tenant/manager API ─────────────────────

export const fetchReviewById = async (
  reviewId: string,
): Promise<ScoredReviewResponse> => {
  const res = await api.get(`/hr/performance/reviews/${reviewId}`);
  return res.data?.data ?? res.data;
};

export interface ScoreInput {
  key: string;
  score?: number;
  comment?: string;
}

export const updateManagerReviewSection = async (
  reviewId: string,
  dto: {
    complianceChecks?: {
      key: string;
      answer?: "yes" | "no";
      date?: string;
      notes?: string;
    }[];
    kpiScores?: ScoreInput[];
    competencyScores?: ScoreInput[];
    valuesScores?: ScoreInput[];
    previousGoalsManagerComments?: {
      description: string;
      managerComment: string;
    }[];
    nextPeriodGoals?: {
      description: string;
      priority?: "high" | "medium" | "low";
      timeline?: string;
      managerComments?: string;
    }[];
    trainingNeeds?: {
      area: string;
      priority?: "high" | "medium" | "low";
      managerRecommendation?: string;
    }[];
    managerSummaryLastPeriod?: string;
    managerAssessmentThisPeriod?: string;
    managerDevelopmentAreas?: string;
    managerConclusions?: string;
  },
): Promise<PerformanceReview> => {
  const res = await api.patch(
    `/hr/performance/reviews/${reviewId}/manager`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const completeReview = async (
  reviewId: string,
): Promise<PerformanceReview> => {
  const res = await api.post(
    `/hr/performance/reviews/${reviewId}/complete`,
    {},
  );
  return res.data?.data ?? res.data;
};

export const fetchPendingHodReviews = async (): Promise<
  PerformanceReview[]
> => {
  const res = await api.get("/hr/performance/reviews/pending/hods");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const retrySkippedEmployees = async (
  cycleId: string,
): Promise<{ cycle: ReviewCycle; recovered: number; stillSkipped: number }> => {
  const res = await api.post(
    `/hr/performance/cycles/${cycleId}/retry-skipped`,
    {},
  );
  return res.data?.data ?? res.data;
};

// ── Performance Review — employee self-service API ──────────────

export const fetchMyReviews = async (): Promise<PerformanceReview[]> => {
  const res = await api.get("/employee/performance/reviews");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchMyReviewById = async (
  reviewId: string,
): Promise<ScoredReviewResponse> => {
  const res = await api.get(`/employee/performance/reviews/${reviewId}`);
  return res.data?.data ?? res.data;
};

export const updateMyReviewSection = async (
  reviewId: string,
  dto: {
    kpiScores?: ScoreInput[];
    competencyScores?: ScoreInput[];
    valuesScores?: ScoreInput[];
    achievements?: string;
    challenges?: string;
    previousGoalsReview?: {
      description: string;
      status?:
        | "achieved"
        | "partially_achieved"
        | "not_achieved"
        | "carried_forward";
      employeeComment?: string;
    }[];
    shortTermCareerGoals?: string;
    longTermCareerGoals?: string;
    trainingNeedAreas?: string[];
    employeeFeedbackComments?: string;
  },
): Promise<PerformanceReview> => {
  const res = await api.patch(`/employee/performance/reviews/${reviewId}`, dto);
  return res.data?.data ?? res.data;
};

export const submitMyReview = async (
  reviewId: string,
): Promise<PerformanceReview> => {
  const res = await api.post(
    `/employee/performance/reviews/${reviewId}/submit`,
    {},
  );
  return res.data?.data ?? res.data;
};

export const fetchPendingReviewsForMyTeam = async (): Promise<
  PerformanceReview[]
> => {
  const res = await api.get("/employee/reviews/pending-for-my-team");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchDepartmentReviewHistory = async (): Promise<
  PerformanceReview[]
> => {
  const res = await api.get("/employee/performance/department-history");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const updateReviewManagerSection = async (
  reviewId: string,
  dto: Parameters<typeof updateManagerReviewSection>[1],
): Promise<PerformanceReview> => {
  const res = await api.patch(
    `/employee/reviews/${reviewId}/manager-section`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const completeReviewAsManager = async (
  reviewId: string,
  probationRecommendationReasoning?: string,
): Promise<PerformanceReview> => {
  const res = await api.patch(`/employee/reviews/${reviewId}/complete`, {
    probationRecommendationReasoning,
  });
  return res.data?.data ?? res.data;
};
