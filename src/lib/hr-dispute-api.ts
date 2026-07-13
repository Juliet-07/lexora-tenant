import { api } from "./api";

// =================================================================
// TYPES
// =================================================================

export type DisputeType = "grievance" | "disciplinary" | "incident" | "report";
export type DisputeTrack = "internal" | "external";
export type DisputeStatus =
  | "open"
  | "under_investigation"
  | "hearing_scheduled"
  | "outcome_recorded"
  | "appealed"
  | "closed"
  | "escalated_external";
export type DisputeStage =
  | "case_reported"
  | "acknowledge"
  | "investigate"
  | "hearing"
  | "outcome"
  | "appeal"
  | "labour_local"
  | "labour_national"
  | "court";
export type DisputeOutcomeDecision =
  | "first_warning"
  | "second_warning"
  | "final_warning"
  | "suspension"
  | "termination"
  | "grievance_resolved"
  | "no_action";
export type DisputeResolverLevel = "manager" | "tenant";
export type GrievanceNature =
  | "harassment_or_bullying"
  | "discrimination"
  | "unfair_treatment"
  | "violation_of_policy"
  | "pay_or_benefits_dispute"
  | "working_conditions"
  | "health_and_safety"
  | "others";
export type InjurySeverity =
  | "no_injury"
  | "minor_injury"
  | "serious_injury"
  | "fatality";

export interface DisputeStageHistoryEntry {
  stage: DisputeStage;
  enteredAt: string;
  completedAt: string | null;
  notes: string | null;
  completedBy: string | null;
}

export interface DisputeOutcome {
  decision: DisputeOutcomeDecision;
  recordedAt: string;
  recordedBy: string;
  notes: string | null;
  attachmentUrl: string | null;
}

export interface DisputeAppeal {
  filedAt: string;
  filedBy: string;
  grounds: string;
  reviewedBy: string | null;
  decision: string | null;
  resolvedAt: string | null;
  notes: string | null;
}

export interface DisputeExternalEscalation {
  referredAt: string;
  referredBy: string;
  body: "labour_local" | "labour_national" | "court";
  caseRef: string | null;
  notes: string | null;
  resolvedAt: string | null;
  resolution: string | null;
}

export interface DisputeSupportingDoc {
  name: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

export type HearingMode = "physical" | "online";
export type MeetingPlatform = "google_meet" | "microsoft_teams" | "zoom";

export interface DisputeHearing {
  scheduledAt: string;
  mode: HearingMode;
  venue: string | null;
  meetingPlatform: MeetingPlatform | null;
  meetingLink: string | null;
  scheduledBy: string;
  notes: string | null;
}

export interface ScheduleHearingPayload {
  scheduledAt: string;
  mode: HearingMode;
  venue?: string;
  meetingPlatform?: MeetingPlatform;
  meetingLink?: string;
  notes?: string;
}

export interface DisputeCase {
  _id: string;
  caseNumber: string;
  tenantId: string;
  type: DisputeType;
  track: DisputeTrack;
  status: DisputeStatus;
  stage: DisputeStage;
  resolverLevel: DisputeResolverLevel;
  filedAt: string;
  filedBy: string;
  complainantId: string;
  respondentIds: string[];
  description: string;
  natureOfGrievance: GrievanceNature | null;
  adverseEffect: string | null;
  informalResolutionSteps: string | null;
  desiredOutcome: string | null;
  causeOfIncident: string | null;
  injurySeverity: InjurySeverity | null;
  natureOfInjury: string | null;
  medicalTreatmentProvided: string | null;
  witnesses: string[];
  supportingDocs: DisputeSupportingDoc[];
  confidentialParties: string[];
  stageHistory: DisputeStageHistoryEntry[];
  outcome: DisputeOutcome | null;
  appeal: DisputeAppeal | null;
  externalEscalation: DisputeExternalEscalation | null;
  hearing: DisputeHearing | null;
  createdAt: string;
  updatedAt: string;
  complainant?: {
    _id: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
    hierarchyRole: string;
    department: string | null;
    managerName: string | null;
  } | null;
  respondents?: {
    _id: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
    hierarchyRole: string;
    department: string | null;
    managerName: string | null;
  }[];
  respondentResponses: {
    text: string;
    respondedAt: string;
    respondent: {
      _id: string;
      firstName: string;
      lastName: string;
      jobTitle: string;
    } | null;
  }[];
}

// Shared shape for filing a case, employee or tenant side
export interface OpenDisputePayload {
  type: DisputeType;
  description: string;
  respondentIds?: string[];
  witnesses?: string[];
  filedAt?: string;
  natureOfGrievance?: GrievanceNature;
  adverseEffect?: string;
  informalResolutionSteps?: string;
  desiredOutcome?: string;
  causeOfIncident?: string;
  injurySeverity?: InjurySeverity;
  natureOfInjury?: string;
  medicalTreatmentProvided?: string;
}

// Minimal shape for the "employees involved" directory picker
export interface DirectoryEmployee {
  _id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
}

export const resolveDisputeFileUrl = (relativeUrl: string): string => {
  const base = import.meta.env.VITE_REACT_APP_BASE_URL ?? "";
  try {
    return `${new URL(base).origin}${relativeUrl}`;
  } catch {
    return `${base}${relativeUrl}`;
  }
};

export const isImageFile = (nameOrUrl: string): boolean =>
  /\.(png|jpe?g|gif|webp)$/i.test(nameOrUrl);
// =================================================================
// HR / TENANT API FUNCTIONS
// =================================================================

export const fetchAllDisputeCases = async (filters?: {
  status?: DisputeStatus;
  type?: DisputeType;
  stage?: DisputeStage;
  track?: DisputeTrack;
}): Promise<DisputeCase[]> => {
  const res = await api.get("/hr/disputes", { params: filters });
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchDisputeCaseById = async (
  caseId: string,
): Promise<DisputeCase> => {
  const res = await api.get(`/hr/disputes/${caseId}`);
  return res.data?.data ?? res.data;
};

export const openDisputeCase = async (payload: {
  type: DisputeType;
  description: string;
  complainantEmployeeId: string;
  respondentId?: string;
  witnesses?: string[];
  filedAt?: string;
}): Promise<DisputeCase> => {
  const res = await api.post("/hr/disputes", payload);
  return res.data?.data ?? res.data;
};

export const acknowledgeDisputeCase = async (
  caseId: string,
  dto: { acknowledgmentText: string; notes?: string },
): Promise<DisputeCase> => {
  const res = await api.patch(`/hr/disputes/${caseId}/acknowledge`, dto);
  return res.data?.data ?? res.data;
};

export const investigateDisputeCase = async (
  caseId: string,
  dto: { findings: string; notes?: string },
): Promise<DisputeCase> => {
  const res = await api.patch(`/hr/disputes/${caseId}/investigate`, dto);
  return res.data?.data ?? res.data;
};

export const scheduleDisputeHearing = async (
  caseId: string,
  dto: ScheduleHearingPayload,
): Promise<DisputeCase> => {
  const res = await api.patch(`/hr/disputes/${caseId}/schedule-hearing`, dto);
  return res.data?.data ?? res.data;
};

export const recordDisputeOutcome = async (
  caseId: string,
  dto: {
    decision: DisputeOutcomeDecision;
    notes?: string;
    attachmentUrl?: string;
  },
): Promise<DisputeCase> => {
  const res = await api.patch(`/hr/disputes/${caseId}/outcome`, dto);
  return res.data?.data ?? res.data;
};

export const resolveDisputeAppeal = async (
  caseId: string,
  dto: { decision: string; notes?: string },
): Promise<DisputeCase> => {
  const res = await api.patch(`/hr/disputes/${caseId}/resolve-appeal`, dto);
  return res.data?.data ?? res.data;
};

export const escalateDisputeExternal = async (
  caseId: string,
  dto: {
    body: "labour_local" | "labour_national" | "court";
    caseRef?: string;
    notes?: string;
  },
): Promise<DisputeCase> => {
  const res = await api.patch(`/hr/disputes/${caseId}/escalate-external`, dto);
  return res.data?.data ?? res.data;
};

export const closeDisputeCase = async (
  caseId: string,
  dto?: { notes?: string },
): Promise<DisputeCase> => {
  const res = await api.patch(`/hr/disputes/${caseId}/close`, dto ?? {});
  return res.data?.data ?? res.data;
};

export const attachDisputeDocument = async (
  caseId: string,
  file: File,
): Promise<DisputeCase> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(`/hr/disputes/${caseId}/documents`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data?.data ?? res.data;
};

export const fetchDisputesForEmployee = async (
  employeeId: string,
): Promise<DisputeCase[]> => {
  const res = await api.get(`/hr/disputes/employee/${employeeId}`);
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

// =================================================================
// EMPLOYEE API FUNCTIONS
// =================================================================

export const fetchMyDisputeCases = async (): Promise<DisputeCase[]> => {
  const res = await api.get("/employee/disputes/my-cases");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchDisputesAgainstMe = async (): Promise<DisputeCase[]> => {
  const res = await api.get("/employee/disputes/against-me");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const respondToDisputeAsEmployee = async (
  caseId: string,
  dto: { response: string },
): Promise<DisputeCase> => {
  const res = await api.patch(`/employee/disputes/${caseId}/respond`, dto);
  return res.data?.data ?? res.data;
};

export const fetchTeamDisputeCases = async (): Promise<DisputeCase[]> => {
  const res = await api.get("/employee/disputes/team-cases");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchDepartmentDisputeCases = async (): Promise<DisputeCase[]> => {
  const res = await api.get("/employee/disputes/department-cases");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const openDisputeCaseAsEmployee = async (dto: {
  type: DisputeType;
  description: string;
  respondentId?: string;
  witnesses?: string[];
}): Promise<DisputeCase> => {
  const res = await api.post("/employee/disputes", dto);
  return res.data?.data ?? res.data;
};

export const fileDisputeAppeal = async (
  caseId: string,
  dto: { grounds: string },
): Promise<DisputeCase> => {
  const res = await api.post(`/employee/disputes/${caseId}/appeal`, dto);
  return res.data?.data ?? res.data;
};

export const attachEmployeeDisputeDocument = async (
  caseId: string,
  file: File,
): Promise<DisputeCase> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(
    `/employee/disputes/${caseId}/documents`,
    formData,
  );
  return res.data?.data ?? res.data;
};

export const raiseGrievance = async (dto: {
  description: string;
  respondentId?: string;
  witnesses?: string[];
}): Promise<DisputeCase> => {
  const res = await api.post("/employee/disputes", {
    ...dto,
    type: "grievance",
  });
  return res.data?.data ?? res.data;
};

// ── Manager actions ──────────────────────────────────────────────

export const acknowledgeDisputeAsManager = async (
  caseId: string,
  dto: { acknowledgmentText: string; notes?: string },
): Promise<DisputeCase> => {
  const res = await api.patch(
    `/employee/disputes/${caseId}/manager/acknowledge`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const investigateDisputeAsManager = async (
  caseId: string,
  dto: { findings: string; notes?: string },
): Promise<DisputeCase> => {
  const res = await api.patch(
    `/employee/disputes/${caseId}/manager/investigate`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const scheduleDisputeHearingAsManager = async (
  caseId: string,
  dto: ScheduleHearingPayload,
): Promise<DisputeCase> => {
  const res = await api.patch(
    `/employee/disputes/${caseId}/manager/schedule-hearing`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const recordDisputeOutcomeAsManager = async (
  caseId: string,
  dto: {
    decision: DisputeOutcomeDecision;
    notes?: string;
    attachmentUrl?: string;
  },
): Promise<DisputeCase> => {
  const res = await api.patch(
    `/employee/disputes/${caseId}/manager/outcome`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const closeDisputeCaseAsManager = async (
  caseId: string,
  dto?: { notes?: string },
): Promise<DisputeCase> => {
  const res = await api.patch(
    `/employee/disputes/${caseId}/manager/close`,
    dto ?? {},
  );
  return res.data?.data ?? res.data;
};

export const escalateDisputeToTenant = async (
  caseId: string,
  notes?: string,
): Promise<DisputeCase> => {
  const res = await api.patch(
    `/employee/disputes/${caseId}/manager/escalate-to-tenant`,
    { notes },
  );
  return res.data?.data ?? res.data;
};

export const fetchDisputeCaseByIdAsManager = async (
  caseId: string,
): Promise<DisputeCase> => {
  const res = await api.get(`/employee/disputes/${caseId}`);
  return res.data?.data ?? res.data;
};

// ── Directory (for "employees involved" multi-select pickers) ────

export const fetchEmployeeDirectory = async (): Promise<
  DirectoryEmployee[]
> => {
  const res = await api.get("/employee/directory");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};
