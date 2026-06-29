import { api } from "./api";

export type ProbationStageType =
  | "onboarding"
  | "month_1"
  | "month_2"
  | "month_3"
  | "final_decision";
export type ProbationStageStatus = "pending" | "completed";
export type ProbationOutcome = "confirm" | "extend" | "terminate";
export type ProbationRecordStatus =
  | "in_progress"
  | "confirmed"
  | "terminated"
  | "extended";

export interface ProbationRecommendation {
  suggestedOutcome: ProbationOutcome;
  basedOnRatingBand: string;
  managerReasoning: string;
  reviewId: string;
  preparedBy: string;
  preparedAt: string;
}

export interface ProbationDecisionDetail {
  outcome: ProbationOutcome;
  agreedWithRecommendation: boolean | null;
  extendedEndDate: string | null;
  extensionReason: string | null;
  revisedObjectives: string | null;
  terminationTriggered: boolean;
  decidedBy: string;
  decidedAt: string;
}

export interface ProbationStage {
  type: ProbationStageType;
  status: ProbationStageStatus;
  completedAt: string | null;
  completedBy: string | null;
  objectives: { objectives: string; successMeasures: string | null } | null;
  progressNote: string | null;
  note: string | null;
  recommendation: ProbationRecommendation | null;
  decision: ProbationDecisionDetail | null;
  linkedReviewId: string | null;
  // Employee self-assessment per monthly stage (optional)
  employeeSelfAssessment: string | null;
  employeeSelfAssessmentAt: string | null;
  // LIVE due-window fields, added by computeDueWindow() at read time
  // — never stored, always fresh:
  dueFrom: string;
  dueTo: string;
  isDue: boolean;
  isOverdue: boolean;
}


export interface ProbationRecord {
  _id: string;
  employeeId: string;
  tenantId: string;
  status: ProbationRecordStatus;
  stages: ProbationStage[];
  originalProbationEndDate: string;
}

export interface ProbationListEmployee {
  _id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  team: string | null;
  manager: string | null;
}

export interface ProbationListItem {
  record: ProbationRecord;
  employee: ProbationListEmployee | null;
}

export const fetchAllProbationRecords = async (): Promise<
  ProbationListItem[]
> => {
  const res = await api.get("/hr/probation");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchProbationRecordForEmployee = async (
  employeeId: string,
): Promise<{
  record: ProbationRecord;
  employee: any;
  stages: ProbationStage[];
}> => {
  const res = await api.get(`/hr/probation/employee/${employeeId}`);
  return res.data?.data ?? res.data;
};

export const recordFinalProbationDecision = async (
  employeeId: string,
  dto: {
    outcome: ProbationOutcome;
    agreedWithRecommendation: boolean;
    extensionReason?: string;
    revisedObjectives?: string;
  },
): Promise<ProbationRecord> => {
  const res = await api.post(
    `/hr/probation/employee/${employeeId}/final-decision`,
    dto,
  );
  return res.data?.data ?? res.data;
};

// ─────────────────────────────────────────────────────────────
// MANAGER-SIDE — for line managers running their direct reports'
// probation. The four stages are executed sequentially: each
// endpoint is guarded server-side so a later stage cannot run
// until the previous one is completed.
// ─────────────────────────────────────────────────────────────

export interface MyTeamProbationItem {
  record: ProbationRecord;
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
    employmentType: string;
    startDate: string;
    probationEndDate: string | null;
  };
}

export const fetchMyTeamProbations = async (): Promise<
  MyTeamProbationItem[]
> => {
  try {
    const res = await api.get("/employee/my-team/probations");
    const d = res.data?.data ?? res.data;
    return Array.isArray(d) ? d : [];
  } catch {
    return [];
  }
};

export const fetchProbationForMyReport = async (
  employeeId: string,
): Promise<{
  record: ProbationRecord;
  employee: any;
  stages: ProbationStage[];
}> => {
  const res = await api.get(`/employee/probation/team/${employeeId}`);
  return res.data?.data ?? res.data;
};

export const setProbationOnboarding = async (
  employeeId: string,
  dto: { objectives: string; successMeasures?: string },
): Promise<ProbationRecord> => {
  const res = await api.post(
    `/employee/probation/team/${employeeId}/onboarding`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const completeProbationMonth1 = async (
  employeeId: string,
  dto: { note: string },
): Promise<ProbationRecord> => {
  const res = await api.post(
    `/employee/probation/team/${employeeId}/month-1`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const completeProbationMonth2 = async (
  employeeId: string,
  dto: { progressNote: string },
): Promise<ProbationRecord> => {
  const res = await api.post(
    `/employee/probation/team/${employeeId}/month-2`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const submitProbationMonth3 = async (
  employeeId: string,
  dto: {
    managerReasoning: string;
    suggestedOutcome: ProbationOutcome;
    basedOnRatingBand?: string;
  },
): Promise<ProbationRecord> => {
  const res = await api.post(
    `/employee/probation/team/${employeeId}/month-3`,
    dto,
  );
  return res.data?.data ?? res.data;
};

// ─────────────────────────────────────────────────────────────
// EMPLOYEE-SIDE — the on-probation employee gets to read their
// 90-day plan and submit a self-assessment for each month.
// ─────────────────────────────────────────────────────────────

export const fetchMyProbation = async (): Promise<{
  record: ProbationRecord;
  stages: ProbationStage[];
} | null> => {
  try {
    const res = await api.get("/employee/my-probation");
    const d = res.data?.data ?? res.data;
    return d ?? null;
  } catch {
    return null;
  }
};

export const submitMyProbationSelfAssessment = async (
  stageType: "month_1" | "month_2" | "month_3",
  dto: { text: string },
): Promise<ProbationRecord> => {
  const res = await api.post(
    `/employee/my-probation/stages/${stageType}/self-assessment`,
    dto,
  );
  return res.data?.data ?? res.data;
};

