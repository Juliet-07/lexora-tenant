import { api } from "../api";

export type BoardMemberRole =
  | "Chair"
  | "Vice-Chair"
  | "Executive Director"
  | "Non-Executive Director"
  | "Independent Director"
  | "Alternate Director"
  | "Company Secretary (Non-voting)";

export type BoardMemberLifecycleStatus = "Onboarding" | "Active" | "Offboarded";
// Read-path derived only — never sent to the API. "Term expiring" /
// "Term expired" overlay onto Active based on termEnds; Onboarding and
// Offboarded pass through as-is from lifecycleStatus.
export type BoardMemberTermStatus =
  | "Onboarding"
  | "Active"
  | "Term expiring"
  | "Term expired"
  | "Offboarded";

export type ConflictType = "Standing" | "Meeting-specific";
export interface ConflictDisclosure {
  note: string;
  disclosedAt: string;
  type: ConflictType;
  resolved: boolean;
}

export type TrainingType = "Mandatory" | "Certification" | "CPD";
export interface TrainingRecord {
  title: string;
  completedAt: string;
  type: TrainingType;
  provider: string;
  hours: number;
  expiresAt: string | null;
}

export type BoardOnboardingStageId =
  | "accept"
  | "fit-proper"
  | "sign-docs"
  | "training"
  | "induction";

export interface ChecklistItem {
  label: string;
  done: boolean;
  completedAt: string | null;
  stageId?: BoardOnboardingStageId | null;
}

export type BoardDocumentCategory = "Governance Document" | "Regulatory Filing";
export interface BoardDocument {
  name: string;
  category: BoardDocumentCategory;
  fileUrl: string | null;
  mimeType: string | null;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  signedAt: string | null;
}

export interface CommitteeMembership {
  name: string;
  isChair: boolean;
}

export interface Remuneration {
  annualRetainer: number;
  committeeChairFee: number;
  meetingAttendanceFee: number;
  lastReviewedAt: string | null;
}

export type SuccessionStageName =
  | "Trigger"
  | "NomCo review"
  | "Evaluation"
  | "Recommendation"
  | "AGM approval"
  | "Confirmed";
export type SuccessionStageStatus = "Pending" | "In progress" | "Done";
export interface SuccessionStage {
  name: SuccessionStageName;
  status: SuccessionStageStatus;
  notes: string;
  completedAt: string | null;
}

export interface SuccessionRiskAssessment {
  criticality: string;
  skillsAtRisk: string[];
  committeeRolesAtRisk: string[];
  regulatoryImpact: string;
  diversityImpact: string;
  institutionalKnowledgeRating: string;
  internalCandidates: number;
  externalCandidates: number;
  timeToReplaceEstimate: string;
  interimSuccessorId:
    | { _id: string; name: string; role: string }
    | string
    | null;
  interimNotes: string;
}

export interface SuccessionCandidate {
  name: string;
  source: string;
  skillsMatch: string[];
  bnrPreCleared: boolean;
  availability: string;
  assessmentStatus: string;
}

export interface SuccessionPlan {
  reference: string;
  triggerType: string;
  triggeredAt: string;
  triggeredBy: string;
  stages: SuccessionStage[];
  riskAssessment: SuccessionRiskAssessment;
  candidates: SuccessionCandidate[];
  knowledgeTransferChecklist: ChecklistItem[];
}

export interface OffboardingRecord {
  reason: string;
  effectiveDate: string | null;
  notes: string;
  checklist: ChecklistItem[];
  initiatedAt: string;
}

export interface BoardMember {
  _id: string;
  name: string;
  role: BoardMemberRole;
  email: string;
  appointedAt: string;
  termEnds: string;
  bio: string;
  nationality: string;
  idNumber: string;
  taxResidency: string;
  lifecycleStatus: BoardMemberLifecycleStatus;
  termStatus: BoardMemberTermStatus;
  committees: CommitteeMembership[];
  attendancePercentage: number;
  otherDirectorships: string[];
  remuneration: Remuneration;
  successorId: { _id: string; name: string; role: string } | string | null;
  conflicts: ConflictDisclosure[];
  training: TrainingRecord[];
  skills: BoardSkill[];
  documents: BoardDocument[];
  onboardingChecklist: ChecklistItem[];
  successionPlan: SuccessionPlan | null;
  offboarding: OffboardingRecord | null;
  userId: string | null;
  contractId: string | null;
}

export type CommitteeMemberRole = "Chair" | "Secretary" | "Member";
export type CommitteeTaskStatus = "Open" | "In Progress" | "Done";

export interface CommitteeMember {
  name: string;
  email: string;
  role: CommitteeMemberRole;
}

export interface CommitteeTask {
  title: string;
  owner: string;
  dueDate: string;
  status: CommitteeTaskStatus;
}

export interface Committee {
  _id: string;
  name: string;
  purpose: string;
  chair: string | null;
  members: CommitteeMember[];
  tasks: CommitteeTask[];
}

export type MeetingAudienceType =
  | "Board"
  | "Committee"
  | "Executive"
  | "Ad-hoc";
export type MeetingMode = "Physical" | "Online";
export type MeetingPlatform = "Zoom" | "Google Meet" | "Microsoft Teams";
export type MeetingStatus = "Draft" | "Sent" | "Held" | "Postponed";

export interface MeetingAttendee {
  name: string;
  email: string;
  role: string;
}
export interface MeetingAgendaItem {
  title: string;
  presenter: string;
  durationMinutes: number;
}

export interface BoardPackDoc {
  name: string;
  fileUrl: string | null;
  mimeType: string | null;
  size: number;
  uploadedAt: string;
}

const GRC_API_BASE = (api.defaults as any)?.baseURL ?? "/api";
export const resolveGrcFileUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith("http")) return url;
  return `${new URL(GRC_API_BASE).origin}${url}`;
};

export interface Meeting {
  _id: string;
  title: string;
  type: MeetingAudienceType;
  date: string;
  mode: MeetingMode;
  venue: string | null;
  meetingLink: string | null;
  platform: MeetingPlatform | null;
  location: string;
  chair: string;
  committeeId: string | null;
  notes: string;
  status: MeetingStatus;
  attendees: MeetingAttendee[];
  agenda: MeetingAgendaItem[];
  boardPack: BoardPackDoc[];
  sentAt: string | null;
  minutes: string | null;
  minutesSentAt: string | null;
  postponementReason: string | null;
  postponedAt: string | null;
  attendanceAllPresent: boolean | null;
  attendancePresentIndices: number[];
  attendanceRecordedAt: string | null;
  acknowledgments: {
    attendeeName: string;
    attendeeEmail: string;
    agendaConfirmed: boolean;
    documents: {
      name: string;
      fileUrl: string | null;
      ackedAt: string;
      method: string;
    }[];
    confirmedAt: string;
    signature: string;
  }[];
  ackTokens: unknown[];
  minutesPdfUrl: string | null;
  minutesReviews: {
    attendeeEmail: string;
    attendeeName: string;
    decision: string;
    comment: string;
    submittedAt: string;
  }[];
}

export interface MinutesReviewSnapshot {
  title: string;
  type: string;
  date: string;
  chair: string;
  pdfUrl: string | null;
  prefillName: string;
  alreadyApproved: boolean;
  approvedAt: string | null;
}

export interface AckSnapshot {
  expired: boolean;
  title: string;
  type: string;
  date: string;
  mode: string;
  venue: string | null;
  platform: string | null;
  chair: string;
  notes: string;
  attendeeCount: number;
  agenda: MeetingAgendaItem[];
  boardPack: {
    name: string;
    fileUrl: string | null;
    mimeType: string | null;
  }[];
  prefillName: string;
  prefillEmail: string;
  alreadyAcknowledged: boolean;
}

export type GovernanceCodeCategory =
  | "Code of Conduct"
  | "Governance Charter"
  | "Board Charter"
  | "Ethics"
  | "Other";
export type GovernanceCodeStatus = "Draft" | "Published";

export interface CodeAttachment {
  name: string;
  fileUrl: string | null;
  mimeType: string | null;
  size: number;
  uploadedAt: string;
}

export interface GovernanceCode {
  _id: string;
  title: string;
  category: GovernanceCodeCategory;
  body: string;
  documents: CodeAttachment[];
  version: number;
  status: GovernanceCodeStatus;
  updatedAt: string;
}

export type SkillCategory =
  | "Finance"
  | "Legal"
  | "Risk"
  | "Strategy"
  | "Technology"
  | "Governance"
  | "Industry"
  | "Other";
export type SkillLevel = "Basic" | "Intermediate" | "Expert";

export interface BoardSkill {
  name: string;
  category: SkillCategory;
  level: SkillLevel;
  yearsExperience: number;
  qualified: boolean;
  notes: string;
}

export type ResolutionType = "Board" | "Written" | "Shareholder";
export type ResolutionStatus =
  | "Draft"
  | "Voting open"
  | "Circulating"
  | "Closed";
export type BoardVote = "Approve" | "Oppose" | "Abstain";
export type WrittenStatus = "Not sent" | "Sent" | "Reminded" | "Responded";
export type ShareholderSubType = "Ordinary" | "Special";

export interface BoardVoteRow {
  directorId: string | null;
  directorName: string;
  directorEmail: string;
  recused: boolean;
  vote: BoardVote | null;
}
export interface WrittenRow {
  directorId: string | null;
  directorName: string;
  directorEmail: string;
  recused: boolean;
  status: WrittenStatus;
  response: BoardVote | null;
  respondedAt: string | null;
  manualEntry: boolean;
}
export interface NotificationEvent {
  at: string;
  kind: string;
  message: string;
}
export interface ProxyRecord {
  proxyName: string;
  representing: string;
  shares: number;
  vote: BoardVote | null;
}

export interface Resolution {
  _id: string;
  reference: string;
  type: ResolutionType;
  subject: string;
  fullText: string;
  linkedMeetingId: string | null;
  effectiveDate: string;
  status: ResolutionStatus;
  outcome: "Passed" | "Failed" | null;
  closedAt: string | null;
  proposer: string | null;
  seconder: string | null;
  boardVotes: BoardVoteRow[];
  deadline: string | null;
  majorityRule: string;
  writtenRows: WrittenRow[];
  notifications: NotificationEvent[];
  forceClosedBy: string | null;
  forceClosedAt: string | null;
  subType: ShareholderSubType | null;
  quorumRequired: number;
  quorumPresent: number;
  proxies: ProxyRecord[];
  pollFor: number;
  pollAgainst: number;
  pollAbstain: number;
  createdAt: string;
}

export const fetchBoardMembers = async (): Promise<BoardMember[]> => {
  const res = await api.get("/grc/governance/board-members");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createBoardMember = async (dto: {
  name: string;
  role: BoardMemberRole;
  email: string;
  appointedAt: string;
  termEnds: string;
  bio?: string;
  nationality?: string;
  idNumber?: string;
  taxResidency?: string;
  otherDirectorships?: string[];
}): Promise<BoardMember> => {
  const res = await api.post("/grc/governance/board-members", dto);
  return res.data?.data ?? res.data;
};

// Real, atomic appointment — creates the director's own login and
// generates their appointment-letter contract together, the same
// process the "Add Client" wizard uses (see
// createClientWithContract in components/kyc/AddClientWizard.tsx).
// The returned contract is still a draft at this point — call
// sendContractForSignature (from @/lib/crm/tools-api) separately once
// the tenant has reviewed/edited it, exactly like the client flow.
export interface CreateBoardMemberWithContractResponse {
  success: boolean;
  message: string;
  data: { _id: string; email: string };
  member: BoardMember;
  contract: import("@/lib/crm/tools-api").SignableContract;
}

export const createBoardMemberWithContract = async (dto: {
  name: string;
  role: BoardMemberRole;
  email: string;
  appointedAt: string;
  termEnds: string;
  bio?: string;
  nationality?: string;
  idNumber?: string;
  taxResidency?: string;
  otherDirectorships?: string[];
  templateId: string;
  templateSource: "platform" | "tenant";
  contractTitle: string;
  value?: number;
  currency?: string;
  scopeOfWork?: string;
  tenantCompanyJurisdiction?: string;
  clientJurisdiction?: string;
  leadProfessionalName?: string;
  leadProfessionalTitle?: string;
  clientRepresentativeName?: string;
  clientRepresentativeTitle?: string;
  commencementDate?: string;
  engagementDuration?: string;
  tenantRegisteredAddress?: string;
  clientRegisteredAddress?: string;
  serviceCategory?: string;
}): Promise<CreateBoardMemberWithContractResponse> => {
  const res = await api.post(
    "/grc/governance/board-members/create-with-contract",
    dto,
  );
  return res.data?.data ?? res.data;
};

// Every appointment-letter contract ever generated for a board
// member — the Board Management module's own equivalent of KYC
// onboarding's Contracting tab.
export const fetchBoardMemberOnboardingContracts = async (): Promise<
  import("@/lib/crm/tools-api").SignableContract[]
> => {
  const res = await api.get("/grc/governance/board-members/contracts");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const updateBoardMember = async (
  id: string,
  dto: Partial<{
    name: string;
    role: BoardMemberRole;
    email: string;
    termEnds: string;
    bio: string;
    nationality: string;
    idNumber: string;
    taxResidency: string;
    lifecycleStatus: BoardMemberLifecycleStatus;
  }>,
): Promise<BoardMember> => {
  const res = await api.patch(`/grc/governance/board-members/${id}`, dto);
  return res.data?.data ?? res.data;
};

export const deleteBoardMember = async (id: string): Promise<void> => {
  await api.delete(`/grc/governance/board-members/${id}`);
};

export const recordConflict = async (
  id: string,
  note: string,
  type?: ConflictType,
): Promise<BoardMember> => {
  const res = await api.post(`/grc/governance/board-members/${id}/conflicts`, {
    note,
    type,
  });
  return res.data?.data ?? res.data;
};

export const resolveConflict = async (
  id: string,
  index: number,
): Promise<BoardMember> => {
  const res = await api.patch(
    `/grc/governance/board-members/${id}/conflicts/${index}/resolve`,
    {},
  );
  return res.data?.data ?? res.data;
};

export const logTraining = async (
  id: string,
  dto: {
    title: string;
    completedAt?: string;
    type?: TrainingType;
    provider?: string;
    hours?: number;
    expiresAt?: string;
  },
): Promise<BoardMember> => {
  const res = await api.post(
    `/grc/governance/board-members/${id}/training`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const setSuccessor = async (
  id: string,
  successorId: string | null,
): Promise<BoardMember> => {
  const res = await api.patch(`/grc/governance/board-members/${id}/successor`, {
    successorId,
  });
  return res.data?.data ?? res.data;
};

export const updateRemuneration = async (
  id: string,
  dto: Partial<Remuneration>,
): Promise<BoardMember> => {
  const res = await api.patch(
    `/grc/governance/board-members/${id}/remuneration`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const setCommittees = async (
  id: string,
  committees: CommitteeMembership[],
): Promise<BoardMember> => {
  const res = await api.patch(
    `/grc/governance/board-members/${id}/committees`,
    { committees },
  );
  return res.data?.data ?? res.data;
};

export const updateAttendance = async (
  id: string,
  attendancePercentage: number,
): Promise<BoardMember> => {
  const res = await api.patch(
    `/grc/governance/board-members/${id}/attendance`,
    { attendancePercentage },
  );
  return res.data?.data ?? res.data;
};

export const addOtherDirectorship = async (
  id: string,
  value: string,
): Promise<BoardMember> => {
  const res = await api.post(
    `/grc/governance/board-members/${id}/other-directorships`,
    { value },
  );
  return res.data?.data ?? res.data;
};

export const removeOtherDirectorship = async (
  id: string,
  index: number,
): Promise<BoardMember> => {
  const res = await api.delete(
    `/grc/governance/board-members/${id}/other-directorships/${index}`,
  );
  return res.data?.data ?? res.data;
};

export const addBoardMemberDocument = async (
  id: string,
  file: File,
  category?: BoardDocumentCategory,
): Promise<BoardMember> => {
  const form = new FormData();
  form.append("file", file);
  if (category) form.append("category", category);
  const res = await api.post(
    `/grc/governance/board-members/${id}/documents`,
    form,
  );
  return res.data?.data ?? res.data;
};

export const removeBoardMemberDocument = async (
  id: string,
  index: number,
): Promise<BoardMember> => {
  const res = await api.delete(
    `/grc/governance/board-members/${id}/documents/${index}`,
  );
  return res.data?.data ?? res.data;
};

export const toggleOnboardingItem = async (
  id: string,
  index: number,
): Promise<BoardMember> => {
  const res = await api.patch(
    `/grc/governance/board-members/${id}/onboarding/${index}/toggle`,
    {},
  );
  return res.data?.data ?? res.data;
};

export const initiateSuccession = async (
  id: string,
  dto?: { triggerType?: string; triggeredBy?: string },
): Promise<BoardMember> => {
  const res = await api.post(
    `/grc/governance/board-members/${id}/succession`,
    dto ?? {},
  );
  return res.data?.data ?? res.data;
};

export const updateSuccessionStage = async (
  id: string,
  dto: {
    stageName: SuccessionStageName;
    status: SuccessionStageStatus;
    notes?: string;
  },
): Promise<BoardMember> => {
  const res = await api.patch(
    `/grc/governance/board-members/${id}/succession/stage`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const updateRiskAssessment = async (
  id: string,
  dto: Partial<{
    criticality: string;
    skillsAtRisk: string[];
    committeeRolesAtRisk: string[];
    regulatoryImpact: string;
    diversityImpact: string;
    institutionalKnowledgeRating: string;
    internalCandidates: number;
    externalCandidates: number;
    timeToReplaceEstimate: string;
    interimSuccessorId: string | null;
    interimNotes: string;
  }>,
): Promise<BoardMember> => {
  const res = await api.patch(
    `/grc/governance/board-members/${id}/succession/risk-assessment`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const addSuccessionCandidate = async (
  id: string,
  dto: {
    name: string;
    source?: string;
    skillsMatch?: string[];
    bnrPreCleared?: boolean;
    availability?: string;
    assessmentStatus?: string;
  },
): Promise<BoardMember> => {
  const res = await api.post(
    `/grc/governance/board-members/${id}/succession/candidates`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const removeSuccessionCandidate = async (
  id: string,
  index: number,
): Promise<BoardMember> => {
  const res = await api.delete(
    `/grc/governance/board-members/${id}/succession/candidates/${index}`,
  );
  return res.data?.data ?? res.data;
};

export const toggleKnowledgeTransferItem = async (
  id: string,
  index: number,
): Promise<BoardMember> => {
  const res = await api.patch(
    `/grc/governance/board-members/${id}/succession/knowledge-transfer/${index}/toggle`,
    {},
  );
  return res.data?.data ?? res.data;
};

export const initiateOffboarding = async (
  id: string,
  dto: { reason: string; effectiveDate: string; notes?: string },
): Promise<BoardMember> => {
  const res = await api.post(
    `/grc/governance/board-members/${id}/offboard`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const toggleOffboardingItem = async (
  id: string,
  index: number,
): Promise<BoardMember> => {
  const res = await api.patch(
    `/grc/governance/board-members/${id}/offboarding/${index}/toggle`,
    {},
  );
  return res.data?.data ?? res.data;
};

export const fetchCommittees = async (): Promise<Committee[]> => {
  const res = await api.get("/grc/governance/committees");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createCommittee = async (dto: {
  name: string;
  purpose?: string;
}): Promise<Committee> => {
  const res = await api.post("/grc/governance/committees", dto);
  return res.data?.data ?? res.data;
};

export const addCommitteeMember = async (
  committeeId: string,
  dto: { name: string; email: string; role?: CommitteeMemberRole },
): Promise<Committee> => {
  const res = await api.post(
    `/grc/governance/committees/${committeeId}/members`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const removeCommitteeMember = async (
  committeeId: string,
  index: number,
): Promise<Committee> => {
  const res = await api.delete(
    `/grc/governance/committees/${committeeId}/members/${index}`,
  );
  return res.data?.data ?? res.data;
};

export const addCommitteeTask = async (
  committeeId: string,
  dto: { title: string; owner: string; dueDate: string },
): Promise<Committee> => {
  const res = await api.post(
    `/grc/governance/committees/${committeeId}/tasks`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const updateCommitteeTaskStatus = async (
  committeeId: string,
  index: number,
  status: CommitteeTaskStatus,
): Promise<Committee> => {
  const res = await api.patch(
    `/grc/governance/committees/${committeeId}/tasks/${index}/status`,
    { status },
  );
  return res.data?.data ?? res.data;
};

export const fetchMeetings = async (): Promise<Meeting[]> => {
  const res = await api.get("/grc/governance/meetings");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createMeeting = async (dto: {
  title: string;
  type: MeetingAudienceType;
  date: string;
  committeeId?: string;
  mode: MeetingMode;
  venue?: string;
  meetingLink?: string;
  platform?: MeetingPlatform;
  chair: string;
  notes?: string;
}): Promise<Meeting> => {
  const res = await api.post("/grc/governance/meetings", dto);
  return res.data?.data ?? res.data;
};

export const addAttendee = async (
  id: string,
  dto: { name: string; email: string; role?: string },
): Promise<Meeting> => {
  const res = await api.post(`/grc/governance/meetings/${id}/attendees`, dto);
  return res.data?.data ?? res.data;
};

export const removeAttendee = async (
  id: string,
  index: number,
): Promise<Meeting> => {
  const res = await api.delete(
    `/grc/governance/meetings/${id}/attendees/${index}`,
  );
  return res.data?.data ?? res.data;
};

export const addAgendaItem = async (
  id: string,
  dto: { title: string; presenter?: string; durationMinutes?: number },
): Promise<Meeting> => {
  const res = await api.post(`/grc/governance/meetings/${id}/agenda`, dto);
  return res.data?.data ?? res.data;
};

export const removeAgendaItem = async (
  id: string,
  index: number,
): Promise<Meeting> => {
  const res = await api.delete(
    `/grc/governance/meetings/${id}/agenda/${index}`,
  );
  return res.data?.data ?? res.data;
};

export const addBoardPackDoc = async (
  id: string,
  file: File,
): Promise<Meeting> => {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post(`/grc/governance/meetings/${id}/board-pack`, form);
  return res.data?.data ?? res.data;
};

export const removeBoardPackDoc = async (
  id: string,
  index: number,
): Promise<Meeting> => {
  const res = await api.delete(
    `/grc/governance/meetings/${id}/board-pack/${index}`,
  );
  return res.data?.data ?? res.data;
};

export const updateMeetingNotes = async (
  id: string,
  notes: string,
): Promise<Meeting> => {
  const res = await api.patch(`/grc/governance/meetings/${id}/notes`, {
    notes,
  });
  return res.data?.data ?? res.data;
};

export const fetchAckSnapshot = async (token: string): Promise<AckSnapshot> => {
  const res = await api.get(`/grc/governance/meetings/ack/${token}`);
  return res.data?.data ?? res.data;
};

export const submitAck = async (
  token: string,
  dto: {
    name: string;
    signature: string;
    agendaConfirmed: boolean;
    documents: { name: string; fileUrl?: string; method: string }[];
  },
): Promise<{ success: boolean }> => {
  const res = await api.post(`/grc/governance/meetings/ack/${token}`, dto);
  return res.data?.data ?? res.data;
};

export const updateMeetingMinutes = async (
  id: string,
  minutes: string,
): Promise<Meeting> => {
  const res = await api.patch(`/grc/governance/meetings/${id}/minutes`, {
    minutes,
  });
  return res.data?.data ?? res.data;
};

export const markMeetingHeld = async (id: string): Promise<Meeting> => {
  const res = await api.post(`/grc/governance/meetings/${id}/mark-held`, {});
  return res.data?.data ?? res.data;
};
export const dispatchMeeting = async (id: string): Promise<Meeting> => {
  const res = await api.post(`/grc/governance/meetings/${id}/dispatch`, {});
  return res.data?.data ?? res.data;
};

export const sendMeetingMinutes = async (id: string): Promise<Meeting> => {
  const res = await api.post(`/grc/governance/meetings/${id}/send-minutes`, {});
  return res.data?.data ?? res.data;
};

export const postponeMeeting = async (
  id: string,
  reason: string,
): Promise<Meeting> => {
  const res = await api.post(`/grc/governance/meetings/${id}/postpone`, {
    reason,
  });
  return res.data?.data ?? res.data;
};

export const resumeMeeting = async (id: string): Promise<Meeting> => {
  const res = await api.post(`/grc/governance/meetings/${id}/resume`, {});
  return res.data?.data ?? res.data;
};

export const deleteMeeting = async (id: string): Promise<void> => {
  await api.delete(`/grc/governance/meetings/${id}`);
};

export const fetchGovernanceCodes = async (): Promise<GovernanceCode[]> => {
  const res = await api.get("/grc/governance/codes");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createGovernanceCode = async (dto: {
  title: string;
  category: GovernanceCodeCategory;
  body?: string;
}): Promise<GovernanceCode> => {
  const res = await api.post("/grc/governance/codes", dto);
  return res.data?.data ?? res.data;
};

export const updateCodeBody = async (
  id: string,
  body: string,
): Promise<GovernanceCode> => {
  const res = await api.patch(`/grc/governance/codes/${id}/body`, { body });
  return res.data?.data ?? res.data;
};

export const addCodeDocument = async (
  id: string,
  file: File,
): Promise<GovernanceCode> => {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post(`/grc/governance/codes/${id}/documents`, form);
  return res.data?.data ?? res.data;
};

export const removeCodeDocument = async (
  id: string,
  index: number,
): Promise<GovernanceCode> => {
  const res = await api.delete(
    `/grc/governance/codes/${id}/documents/${index}`,
  );
  return res.data?.data ?? res.data;
};

export const publishCode = async (id: string): Promise<GovernanceCode> => {
  const res = await api.post(`/grc/governance/codes/${id}/publish`, {});
  return res.data?.data ?? res.data;
};

export const startNewCodeVersion = async (
  id: string,
): Promise<GovernanceCode> => {
  const res = await api.post(`/grc/governance/codes/${id}/new-version`, {});
  return res.data?.data ?? res.data;
};

export const deleteGovernanceCode = async (id: string): Promise<void> => {
  await api.delete(`/grc/governance/codes/${id}`);
};

export const addSkill = async (
  id: string,
  dto: {
    name: string;
    category: SkillCategory;
    level: SkillLevel;
    yearsExperience?: number;
    qualified?: boolean;
    notes?: string;
  },
): Promise<BoardMember> => {
  const res = await api.post(`/grc/governance/board-members/${id}/skills`, dto);
  return res.data?.data ?? res.data;
};

export const removeSkill = async (
  id: string,
  index: number,
): Promise<BoardMember> => {
  const res = await api.delete(
    `/grc/governance/board-members/${id}/skills/${index}`,
  );
  return res.data?.data ?? res.data;
};

export const recordAttendance = async (
  id: string,
  allAttended: boolean,
  presentIndices?: number[],
  absenceNotes?: { index: number; note: string }[],
): Promise<Meeting> => {
  const res = await api.patch(`/grc/governance/meetings/${id}/attendance`, {
    allAttended,
    presentIndices,
    absenceNotes,
  });
  return res.data?.data ?? res.data;
};

export const fetchMinutesReviewSnapshot = async (
  token: string,
): Promise<MinutesReviewSnapshot> => {
  const res = await api.get(`/grc/governance/meetings/minutes-review/${token}`);
  return res.data?.data ?? res.data;
};

export const submitMinutesReview = async (
  token: string,
  dto: {
    name: string;
    decision: "approved" | "changes-requested";
    comment?: string;
  },
): Promise<{ success: boolean }> => {
  const res = await api.post(
    `/grc/governance/meetings/minutes-review/${token}`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export function tallyRows(
  rows: {
    recused: boolean;
    vote?: BoardVote | null;
    response?: BoardVote | null;
  }[],
) {
  const eligible = rows.filter((r) => !r.recused);
  const value = (r: any) => r.vote ?? r.response ?? null;
  return {
    approve: eligible.filter((r) => value(r) === "Approve").length,
    oppose: eligible.filter((r) => value(r) === "Oppose").length,
    abstain: eligible.filter((r) => value(r) === "Abstain").length,
    awaiting: eligible.filter((r) => value(r) === null).length,
    total: eligible.length,
  };
}

export const fetchNextReference = async (): Promise<string> => {
  const res = await api.get("/grc/governance/resolutions/next-reference");
  return (res.data?.data ?? res.data).reference;
};

export const fetchResolutions = async (): Promise<Resolution[]> => {
  const res = await api.get("/grc/governance/resolutions");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createResolution = async (dto: {
  reference?: string;
  type: ResolutionType;
  subject: string;
  fullText: string;
  linkedMeetingId?: string;
  effectiveDate: string;
  proposer?: string;
  seconder?: string;
  deadline?: string;
  subType?: ShareholderSubType;
}): Promise<Resolution> => {
  const res = await api.post("/grc/governance/resolutions", dto);
  return res.data?.data ?? res.data;
};

export const setBoardVote = async (
  id: string,
  rowIndex: number,
  vote: BoardVote,
): Promise<Resolution> => {
  const res = await api.patch(`/grc/governance/resolutions/${id}/board-vote`, {
    rowIndex,
    vote,
  });
  return res.data?.data ?? res.data;
};
export const closeBoardVote = async (id: string): Promise<Resolution> => {
  const res = await api.post(
    `/grc/governance/resolutions/${id}/board-vote/close`,
    {},
  );
  return res.data?.data ?? res.data;
};

export const setWrittenStatus = async (
  id: string,
  rowIndex: number,
  status: "Sent" | "Reminded",
): Promise<Resolution> => {
  const res = await api.patch(
    `/grc/governance/resolutions/${id}/written-status`,
    { rowIndex, status },
  );
  return res.data?.data ?? res.data;
};
export const recordWrittenResponse = async (
  id: string,
  rowIndex: number,
  response: BoardVote,
): Promise<Resolution> => {
  const res = await api.patch(
    `/grc/governance/resolutions/${id}/written-response`,
    { rowIndex, response },
  );
  return res.data?.data ?? res.data;
};
export const closeWritten = async (
  id: string,
  forced = false,
): Promise<Resolution> => {
  const res = await api.post(
    `/grc/governance/resolutions/${id}/written/close`,
    { forced },
  );
  return res.data?.data ?? res.data;
};

export const addProxy = async (
  id: string,
  dto: { proxyName: string; representing: string; shares: number },
): Promise<Resolution> => {
  const res = await api.post(`/grc/governance/resolutions/${id}/proxies`, dto);
  return res.data?.data ?? res.data;
};
export const saveShareholderPoll = async (
  id: string,
  dto: {
    pollFor: number;
    pollAgainst: number;
    pollAbstain: number;
    quorumPresent: number;
  },
): Promise<Resolution> => {
  const res = await api.patch(
    `/grc/governance/resolutions/${id}/shareholder-poll`,
    dto,
  );
  return res.data?.data ?? res.data;
};
export const closeShareholder = async (id: string): Promise<Resolution> => {
  const res = await api.post(
    `/grc/governance/resolutions/${id}/shareholder/close`,
    {},
  );
  return res.data?.data ?? res.data;
};
