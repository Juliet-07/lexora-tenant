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
// Every entry here also doubles as the director's induction pack (Step
// 5 in the board portal) — see effectiveInductionPack on the backend.
export interface BoardDocument {
  _id: string;
  name: string;
  category: BoardDocumentCategory;
  fileUrl: string | null;
  mimeType: string | null;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  signedAt: string | null;
  // Snapshot of the BoardDocumentFolder's name this was filed under —
  // "" means Uncategorized. See BoardDocumentFolder.
  folder: string;
}

export interface BoardDocumentFolder {
  _id: string;
  name: string;
}

// A document the tenant has set up for this director to sign during
// onboarding (Step 3) — a snapshot of a published GovernanceCode taken
// at the moment it was assigned (see resolveDocumentsToSign on the
// backend), not a live reference.
export interface BoardSignableDocument {
  _id: string;
  title: string;
  category: string;
  sourceCodeId: string | null;
  // The code's rich-text body at assignment time — codes are authored
  // in-app, not uploaded as files, so this (not fileUrl) is what lets
  // a director actually read and review what they're signing.
  body: string;
  fileUrl: string | null;
  version: number;
}

// LEGACY — induction-pack files uploaded before "Documents" and
// "Induction pack" were unified onto one array (BoardMember.documents,
// see BoardDocument above). Kept only so pre-existing items still show
// up; new uploads go through the Documents tab.
export interface InductionPackItem {
  _id: string;
  name: string;
  fileUrl: string | null;
  mimeType: string | null;
  size: number;
  uploadedBy: string;
}

// A real, tenant-authored mandatory training module for board
// onboarding (Step 4) — see board-training-module.schema.ts.
export interface BoardTrainingModule {
  _id: string;
  title: string;
  description: string;
  resourceUrl: string | null;
  resourceMimeType: string | null;
  order: number;
}

// Computed from the real Committee.members link (see Committee below)
// rather than stored on the board member — a director's committees
// are whichever committees list them as a member, nothing typed here.
export interface CommitteeMembership {
  committeeId: string;
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

export interface BoardDirectorshipEntry {
  company: string;
  position: string;
  detail: string;
}

export interface OnboardingYesNoAnswer {
  questionId: string;
  yes: boolean;
  detail: string;
}

// What the director submitted on the "Fit & Proper" onboarding step —
// mirrors FitProperDeclaration on the backend board-member schema.
export interface FitProperDeclaration {
  fullName: string;
  dob: string;
  idNumber: string;
  nationality: string;
  address: string;
  directorships: BoardDirectorshipEntry[];
  // question ids: 'sanction' | 'bankrupt' | 'convictions'
  answers: OnboardingYesNoAnswer[];
  referenceName: string;
  referenceRelationship: string;
  referenceEmail: string;
  submittedAt: string;
}

// What the director submitted on the "Documents & COI" onboarding step —
// mirrors DocumentsCoiDeclaration on the backend board-member schema.
export interface DocumentsCoiDeclaration {
  signedDocumentIds: string[];
  holdsOtherDirectorships: boolean;
  currentDirectorships: BoardDirectorshipEntry[];
  // question ids: 'interest' | 'related'
  answers: OnboardingYesNoAnswer[];
  submittedAt: string;
}

export interface OnboardingTrainingProgress {
  completedModuleIds: string[];
  completedAt: string | null;
}

export interface InductionAcknowledgement {
  scheduledDate: string | null;
  acknowledgedDocumentIds: string[];
  acknowledgedAt: string | null;
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
  // True unless the member has been Offboarded — mirrors
  // BoardMemberService#getAll on the backend. Used to decide, e.g.,
  // whether a Board Charter can bootstrap-publish (no active board yet).
  isActive: boolean;
  committees: CommitteeMembership[];
  attendancePercentage: number;
  otherDirectorships: string[];
  remuneration: Remuneration;
  successorId: { _id: string; name: string; role: string } | string | null;
  conflicts: ConflictDisclosure[];
  training: TrainingRecord[];
  skills: BoardSkill[];
  documents: BoardDocument[];
  documentFolders: BoardDocumentFolder[];
  documentsToSign: BoardSignableDocument[];
  inductionPack: InductionPackItem[];
  onboardingChecklist: ChecklistItem[];
  // What this director actually submitted during self-service onboarding —
  // null/default until each step is completed.
  fitProperDeclaration: FitProperDeclaration | null;
  documentsCoiDeclaration: DocumentsCoiDeclaration | null;
  onboardingTraining: OnboardingTrainingProgress;
  inductionAcknowledgement: InductionAcknowledgement | null;
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
  // Real link back to the board member record. Null only for legacy
  // members added before this link existed — new members always carry it.
  boardMemberId: string | null;
}

export interface CommitteeTask {
  title: string;
  // Display snapshot of the owner's name, resolved server-side.
  owner: string;
  // Real link to the board member this task is assigned to — must be a
  // current member of this committee.
  ownerBoardMemberId: string | null;
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
  cadence: string;
  quorum: string;
  charter: string;
  nextMeeting: string | null;
}

export type MeetingAudienceType =
  | "Board"
  | "Committee"
  | "Executive"
  | "Ad-hoc"
  | "AGM"
  | "EGM";
export type MeetingMode = "Physical" | "Online";
export type MeetingPlatform = "Zoom" | "Google Meet" | "Microsoft Teams";
export type MeetingStatus = "Draft" | "Sent" | "Held" | "Postponed";

export interface MeetingAttendee {
  name: string;
  email: string;
  role: string;
}

// In person / by proxy / apology / absent — per PO feedback (2026-09):
// "it is meant to be captured if the attendee is attending the
// meeting in person or by proxy."
export type MeetingAttendanceStatus =
  | "Present"
  | "Proxy"
  | "Apology"
  | "Absent";

export interface AttendanceEntry {
  index: number;
  status: MeetingAttendanceStatus;
  proxyHolderName: string | null;
  note: string | null;
}

// Four values (not a declared/resolved lifecycle) — matches the PO's
// reference Conflict-of-Interest dialog. "Standing declaration" also
// gets linked into the director's own standing conflict register on
// the backend (see MeetingService#linkToStandingRegister).
export type MeetingConflictStatus =
  | "No conflict declared"
  | "Conflict declared — recusal required"
  | "Conflict declared — noted, no recusal"
  | "Standing declaration — ongoing";

export const MEETING_CONFLICT_STATUSES: MeetingConflictStatus[] = [
  "No conflict declared",
  "Conflict declared — recusal required",
  "Conflict declared — noted, no recusal",
  "Standing declaration — ongoing",
];

export type MeetingConflictAction =
  | "Director to recuse from discussion and vote"
  | "Director to recuse from vote only (may participate in discussion)"
  | "Conflict noted in minutes, no recusal required"
  | "Referred to Nominations Committee for guidance";

export const MEETING_CONFLICT_ACTIONS: MeetingConflictAction[] = [
  "Director to recuse from discussion and vote",
  "Director to recuse from vote only (may participate in discussion)",
  "Conflict noted in minutes, no recusal required",
  "Referred to Nominations Committee for guidance",
];

export interface MeetingConflictDeclaration {
  _id: string;
  declaredByName: string;
  declaredByEmail: string;
  declaredByBoardMemberId: string | null;
  status: MeetingConflictStatus;
  agendaItems: string[];
  natureOfConflict: string;
  actionTaken: MeetingConflictAction;
  recordedBy: string;
  recordedAt: string;
  source: "tenant" | "board-member";
}
export type AgendaItemType =
  | "Procedural"
  | "Noting"
  | "Resolution"
  | "Discussion"
  | "Informational";
export const AGENDA_ITEM_TYPES: AgendaItemType[] = [
  "Procedural",
  "Noting",
  "Resolution",
  "Discussion",
  "Informational",
];

export interface MeetingAgendaItem {
  title: string;
  presenter: string;
  durationMinutes: number;
  type: AgendaItemType;
}

// A document is filed either under one of the meeting's own agenda
// item titles, or — when `agendaItemTitle` is blank — in the general
// "Procedural documents" bucket (meeting notice, prior minutes,
// action tracker). `fileUrl: null` with `required: true` is an
// "Outstanding" row the tenant has asked for but not yet received —
// see fulfillBoardPackDoc.
export interface BoardPackDoc {
  name: string;
  fileUrl: string | null;
  mimeType: string | null;
  size: number;
  uploadedAt: string;
  agendaItemTitle: string;
  required: boolean;
  // A real Employee (picked from a dropdown, not typed in) — null
  // for an unassigned outstanding row. assignedToName is a resolved
  // display-name snapshot from request time. See MyBoardPackRequests
  // for the employee's own portal view of rows assigned to them.
  assignedToEmployeeId: string | null;
  assignedToName: string;
  dueDate: string | null;
  uploadedBy: string;
}

// A director's note/question on a board pack document, or the
// tenant's (Company Secretary's) reply in the same thread — notes are
// addressed by the document's fileUrl, not an id of their own.
// fromTenant distinguishes a reply from a director's original note.
export interface BoardPackNote {
  fileUrl: string;
  authorName: string;
  authorEmail: string;
  text: string;
  createdAt: string;
  fromTenant: boolean;
}

export type MeetingActionItemStatus = "Open" | "Done";

export interface MeetingActionItem {
  _id: string;
  title: string;
  description: string;
  assigneeName: string;
  assigneeEmail: string;
  // Real link to a BoardMember, resolved server-side from the
  // assignee's email — null for an Employee/guest attendee, who has
  // no BoardMember record. This is what lets a director's board
  // portal filter to action items assigned to them specifically.
  assigneeBoardMemberId: string | null;
  dueDate: string | null;
  status: MeetingActionItemStatus;
  completedAt: string | null;
  createdAt: string;
}

// ── Preparation checklist — the fixed 10-item list mirrors
// MEETING_CHECKLIST_ITEMS on the backend exactly (same ids/titles),
// the same convention already used for MeetingMode/MeetingPlatform
// enums above (duplicated, not fetched). Completing all 10 is what
// gates the Dispatch button. ─────────────────────────────────────────
export interface MeetingChecklistItemDef {
  id: string;
  title: string;
  detail: string;
}
export const MEETING_CHECKLIST_ITEMS: MeetingChecklistItemDef[] = [
  {
    id: "convened",
    title: "Meeting properly convened",
    detail:
      "Confirm the meeting has been called in line with the constitution/charter.",
  },
  {
    id: "notice-issued",
    title: "Required notice issued on time",
    detail: "The notice period for this meeting type has been met.",
  },
  {
    id: "agenda-complete",
    title: "Agenda complete",
    detail: "All agenda items and presenters are confirmed.",
  },
  {
    id: "minutes-reviewed",
    title: "Previous minutes and outstanding actions reviewed",
    detail: "Prior minutes are accurate and open actions are tracked.",
  },
  {
    id: "resolutions-prepared",
    title: "Draft resolutions prepared",
    detail: "Any resolutions expected at this meeting are drafted.",
  },
  {
    id: "quorum-confirmed",
    title: "Quorum confirmed",
    detail: "Expected attendance meets the quorum requirement.",
  },
  {
    id: "coi-checked",
    title: "Conflicts of interest checked",
    detail: "Known conflicts for this agenda have been identified.",
  },
  {
    id: "papers-circulated",
    title: "Board papers reviewed and circulated",
    detail: "Supporting papers are final and ready to circulate.",
  },
  {
    id: "statutory-checked",
    title: "Statutory and governance requirements checked",
    detail:
      "Any statutory filings or governance steps tied to this meeting are accounted for.",
  },
  {
    id: "actions-identified",
    title: "Post-meeting actions identified",
    detail: "Likely follow-up actions have been anticipated.",
  },
];

export interface MeetingChecklistRecord {
  itemId: string;
  completedAt: string;
  completedBy: string;
}

export type NoticeRsvpStatus = "Pending" | "Confirmed" | "Apologies";

export interface NoticeRecipient {
  name: string;
  email: string;
  rsvp: NoticeRsvpStatus;
  openedAt: string | null;
  lastReminderSentAt: string | null;
}

export interface MeetingNotice {
  body: string;
  minimumDays: number;
  rsvpDeadline: string | null;
  dispatchedAt: string | null;
  dispatchedBy: string | null;
  recipients: NoticeRecipient[];
}

export type MinuteSectionKind =
  | "Procedural"
  | "Noting"
  | "Discussion"
  | "Resolution"
  | "Informational";
export type MinutesDraftStatus =
  | "Draft"
  | "Sent for Chair review"
  | "Chair approved"
  // Renamed from "Tabled for Board adoption" (PO feedback, Oct 2026) —
  // this stage now covers every meeting type, not only Board.
  | "Tabled for adoption"
  | "Adopted and signed";
export type MinutesApprovalDecision =
  | "Pending"
  | "Approved"
  | "Changes requested";
export type MinutesReviewDecision = "approved" | "changes-requested";
export type MinuteResolutionOutcome =
  | "Passed"
  | "Not passed"
  | "Deferred"
  | "Withdrawn";

export interface MinuteResolution {
  ref: string;
  proposedBy: string;
  secondedBy: string;
  for: number;
  against: number;
  abstained: number;
  outcome: MinuteResolutionOutcome;
}

export interface MinuteSection {
  _id: string;
  title: string;
  kind: MinuteSectionKind;
  presenter: string;
  time: string;
  body: string;
  resolution: MinuteResolution | null;
}

export interface MinutesDraftAction {
  action: string;
  owner: string;
  due: string;
}

export interface MinutesReviewEntry {
  attendeeEmail: string;
  attendeeName: string;
  decision: MinutesReviewDecision;
  comment: string;
  submittedAt: string;
}

export interface MinutesChairReview {
  boardMemberId: string | null;
  name: string;
  email: string;
  token: string | null;
  decision: MinutesApprovalDecision;
  notes: string;
  requestedAt: string | null;
  decidedAt: string | null;
}

export interface MinutesDraft {
  chair: string;
  minuteTaker: string;
  quorumText: string;
  conflicts: string;
  sections: MinuteSection[];
  actions: MinutesDraftAction[];
  status: MinutesDraftStatus;
  updatedAt: string | null;
  updatedBy: string | null;
  chairReview: MinutesChairReview | null;
  boardAdoptions: MinutesReviewEntry[];
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
  timezone: string;
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
  // Board pack cover page — rich text HTML, same convention as
  // notice.body/minutes. Never dispatch-locked, unlike the notice.
  executiveSummary: string;
  executiveSummaryUpdatedAt: string | null;
  // Tenant-set override of when the board pack must be complete by.
  // Not currently surfaced in the UI (pulled 2026-10 — see
  // MeetingControls.tsx) but kept on the type/backend for a possible
  // return to it later.
  boardPackDueDate: string | null;
  // Directors' notes/questions on board pack documents, and the
  // tenant's replies in the same thread — see BoardPackNote.
  boardPackNotes: BoardPackNote[];
  sentAt: string | null;
  minutes: string | null;
  minutesSentAt: string | null;
  postponementReason: string | null;
  postponedAt: string | null;
  postponementHistory: {
    fromDate: string;
    toDate: string | null;
    reason: string;
    postponedAt: string;
  }[];
  attendanceAllPresent: boolean | null;
  attendancePresentIndices: number[];
  attendanceRecordedAt: string | null;
  attendanceEntries: AttendanceEntry[];
  conflictDeclarations: MeetingConflictDeclaration[];
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
  minutesReviews: MinutesReviewEntry[];
  actionItems: MeetingActionItem[];
  checklist: MeetingChecklistRecord[];
  notice: MeetingNotice;
  minutesDraft: MinutesDraft | null;
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
// Internal review / Board / Committee approval are real, server-enforced
// stages now (previously tracked only in browser localStorage) — the
// strings match the tenant UI's existing Stage badges exactly.
export type GovernanceCodeStatus =
  | "Draft"
  | "Internal review"
  | "Board / Committee approval"
  | "Published";

export interface CodeAttachment {
  name: string;
  fileUrl: string | null;
  mimeType: string | null;
  size: number;
  uploadedAt: string;
}

export type CodeApprovalDecision = "Pending" | "Approved" | "Rejected";

export interface CodeBoardApproval {
  boardMemberId: string;
  name: string;
  email: string;
  decision: CodeApprovalDecision;
  notes: string;
  decidedAt: string | null;
  requestedAt: string;
}

// A real signature — recorded the moment a director clicks "Sign now"
// on this code during their own onboarding. Distinct from
// boardApprovals above (a publish-gate approval round).
export interface CodeAcknowledgement {
  boardMemberId: string;
  name: string;
  acknowledgedAt: string;
}

export interface GovernanceCode {
  _id: string;
  title: string;
  category: GovernanceCodeCategory;
  body: string;
  documents: CodeAttachment[];
  version: number;
  status: GovernanceCodeStatus;
  templateId: string | null;
  boardApprovals: CodeBoardApproval[];
  acknowledgedBy: CodeAcknowledgement[];
  updatedAt: string;
}

export interface GovernanceCodeTemplateSection {
  title: string;
  content: string;
}

export interface GovernanceCodeTemplate {
  _id: string;
  title: string;
  category: string;
  description: string;
  sections: GovernanceCodeTemplateSection[];
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

export type SkillAddedBy = "Tenant" | "Self";

export interface BoardSkill {
  name: string;
  category: SkillCategory;
  level: SkillLevel;
  yearsExperience: number;
  qualified: boolean;
  notes: string;
  // Who put this entry on the matrix — this tenant's own "add
  // credential" action, or the director self-submitting a skill via
  // the board portal (Oct 2026). Old entries have no stored value;
  // treat a missing one as "Tenant" (see SkillsMatrixSection).
  addedBy?: SkillAddedBy;
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

export const fetchBoardMember = async (id: string): Promise<BoardMember> => {
  const res = await api.get(`/grc/governance/board-members/${id}`);
  return res.data?.data ?? res.data;
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
  documentIds?: string[];
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
//
// NOTE on the response shape: BoardMemberService#createWithContract
// (backend) already returns a full {success, message, data, member,
// contract} object of its own, and the global TransformInterceptor
// passes an object through unchanged whenever it already has a
// `success` key — it does NOT nest it under another `data`. So the
// axios response body IS this interface, with no further unwrapping,
// exactly like AddClientWizard.tsx's own createClientWithContract
// (which returns `res.data` directly, not `res.data?.data`). A
// generic `res.data?.data ?? res.data` unwrap here would grab just
// `data: {_id, email}` and silently drop `member`/`contract`.
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
  documentIds?: string[];
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
  return res.data;
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

// Board Onboarding monitoring page — mirrors fetchPendingApprovals /
// fetchOnboardingInProgress for KYC clients (src/lib/kyc-api.ts).
// "Awaiting appointment" = appointment contract not yet countersigned
// (no board-portal account yet); "In progress" = account active,
// still working through the fit-and-proper/docs/training/induction
// checklist. Both hit the endpoints added alongside board-member
// onboarding's other listing route (getAll/contracts).
export const fetchBoardMembersAwaitingAppointment = async (): Promise<
  BoardMember[]
> => {
  const res = await api.get(
    "/grc/governance/board-members/onboarding/awaiting-appointment",
  );
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchBoardMembersOnboardingInProgress = async (): Promise<
  BoardMember[]
> => {
  const res = await api.get(
    "/grc/governance/board-members/onboarding/in-progress",
  );
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

// There is no longer a way to set a board member's committees directly —
// membership is computed from Committee.members. Use addCommitteeMember /
// removeCommitteeMemberByBoardMember (below) on the committee side instead.

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
  folder?: string,
): Promise<BoardMember> => {
  const form = new FormData();
  form.append("file", file);
  if (category) form.append("category", category);
  if (folder) form.append("folder", folder);
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

export const addBoardDocumentFolder = async (
  id: string,
  name: string,
): Promise<BoardMember> => {
  const res = await api.post(
    `/grc/governance/board-members/${id}/document-folders`,
    { name },
  );
  return res.data?.data ?? res.data;
};

export const removeBoardDocumentFolder = async (
  id: string,
  folderId: string,
): Promise<BoardMember> => {
  const res = await api.delete(
    `/grc/governance/board-members/${id}/document-folders/${folderId}`,
  );
  return res.data?.data ?? res.data;
};

export const setBoardMemberDocumentsToSign = async (
  id: string,
  documentIds: string[],
): Promise<BoardMember> => {
  const res = await api.patch(
    `/grc/governance/board-members/${id}/documents-to-sign`,
    { documentIds },
  );
  return res.data?.data ?? res.data;
};

// The dedicated induction-pack UPLOAD endpoint is gone from this app's
// UI — "Documents" (addBoardMemberDocument above) is now the one real
// place to send a director files; everything uploaded there becomes
// their induction pack too. See BoardDocument's comment. Removal is
// kept, only to let a tenant clean up items sent before this change.
export const removeBoardMemberInductionItem = async (
  id: string,
  index: number,
): Promise<BoardMember> => {
  const res = await api.delete(
    `/grc/governance/board-members/${id}/induction-pack/${index}`,
  );
  return res.data?.data ?? res.data;
};

// ── Board Training Modules (Step 4) — a tenant-wide catalog, not
// scoped to one director. See board-training-module.schema.ts. ──────

export const fetchBoardTrainingModules = async (): Promise<
  BoardTrainingModule[]
> => {
  const res = await api.get("/grc/governance/board-training-modules");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createBoardTrainingModule = async (
  title: string,
  description: string,
  file?: File,
): Promise<BoardTrainingModule> => {
  const form = new FormData();
  form.append("title", title);
  if (description) form.append("description", description);
  if (file) form.append("file", file);
  const res = await api.post("/grc/governance/board-training-modules", form);
  return res.data?.data ?? res.data;
};

export const deleteBoardTrainingModule = async (id: string): Promise<void> => {
  await api.delete(`/grc/governance/board-training-modules/${id}`);
};

// ══════════════════════════════════════════════════════════════
// Trainings — general, ongoing board training (distinct from the
// onboarding-only modules above). The tenant creates a training,
// optionally with attached material; a director completes it from
// their portal, either by reviewing the material or, when none was
// attached, by uploading their own proof of completion.
// ══════════════════════════════════════════════════════════════

export type TrainingCategory =
  | "Governance"
  | "Regulatory"
  | "Risk"
  | "ESG"
  | "Cyber"
  | "Finance"
  | "Ethics"
  | "Other";
export const TRAINING_CATEGORIES: TrainingCategory[] = [
  "Governance",
  "Regulatory",
  "Risk",
  "ESG",
  "Cyber",
  "Finance",
  "Ethics",
  "Other",
];
export type TrainingFormat = "In-person" | "Online" | "Self-paced";
export type TrainingCompletionMethod =
  | "Material reviewed"
  | "Proof of completion uploaded";

export interface TrainingCompletion {
  boardMemberId: string | null;
  name: string;
  email: string;
  completedAt: string;
  method: TrainingCompletionMethod;
  proofFileUrl: string | null;
  proofMimeType: string | null;
  proofName: string | null;
}

export interface GovernanceTraining {
  _id: string;
  title: string;
  description: string;
  category: TrainingCategory;
  provider: string;
  format: TrainingFormat;
  cpdHours: number;
  dueDate: string | null;
  mandatory: boolean;
  assignedTo: string[];
  resourceUrl: string | null;
  resourceMimeType: string | null;
  resourceName: string | null;
  completions: TrainingCompletion[];
  createdAt: string;
}

export const fetchTrainings = async (): Promise<GovernanceTraining[]> => {
  const res = await api.get("/grc/governance/trainings");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createTraining = async (dto: {
  title: string;
  description?: string;
  category?: TrainingCategory;
  provider?: string;
  format?: TrainingFormat;
  cpdHours?: number;
  dueDate?: string;
  mandatory?: boolean;
  assignedTo?: string[];
  file?: File;
}): Promise<GovernanceTraining> => {
  const form = new FormData();
  form.append("title", dto.title);
  if (dto.description) form.append("description", dto.description);
  if (dto.category) form.append("category", dto.category);
  if (dto.provider) form.append("provider", dto.provider);
  if (dto.format) form.append("format", dto.format);
  if (dto.cpdHours !== undefined) form.append("cpdHours", String(dto.cpdHours));
  if (dto.dueDate) form.append("dueDate", dto.dueDate);
  if (dto.mandatory !== undefined)
    form.append("mandatory", String(dto.mandatory));
  if (dto.assignedTo) form.append("assignedTo", JSON.stringify(dto.assignedTo));
  if (dto.file) form.append("file", dto.file);
  const res = await api.post("/grc/governance/trainings", form);
  return res.data?.data ?? res.data;
};

export const updateTraining = async (
  id: string,
  dto: {
    title?: string;
    description?: string;
    category?: TrainingCategory;
    provider?: string;
    format?: TrainingFormat;
    cpdHours?: number;
    dueDate?: string;
    mandatory?: boolean;
    assignedTo?: string[];
    file?: File;
  },
): Promise<GovernanceTraining> => {
  const form = new FormData();
  if (dto.title !== undefined) form.append("title", dto.title);
  if (dto.description !== undefined)
    form.append("description", dto.description);
  if (dto.category !== undefined) form.append("category", dto.category);
  if (dto.provider !== undefined) form.append("provider", dto.provider);
  if (dto.format !== undefined) form.append("format", dto.format);
  if (dto.cpdHours !== undefined) form.append("cpdHours", String(dto.cpdHours));
  if (dto.dueDate !== undefined) form.append("dueDate", dto.dueDate);
  if (dto.mandatory !== undefined)
    form.append("mandatory", String(dto.mandatory));
  if (dto.assignedTo !== undefined)
    form.append("assignedTo", JSON.stringify(dto.assignedTo));
  if (dto.file) form.append("file", dto.file);
  const res = await api.patch(`/grc/governance/trainings/${id}`, form);
  return res.data?.data ?? res.data;
};

export const deleteTraining = async (id: string): Promise<void> => {
  await api.delete(`/grc/governance/trainings/${id}`);
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
  cadence?: string;
  quorum?: string;
  charter?: string;
  nextMeeting?: string;
}): Promise<Committee> => {
  const res = await api.post("/grc/governance/committees", dto);
  return res.data?.data ?? res.data;
};

export const updateCommitteeDetails = async (
  committeeId: string,
  dto: {
    name?: string;
    purpose?: string;
    cadence?: string;
    quorum?: string;
    charter?: string;
    nextMeeting?: string | null;
  },
): Promise<Committee> => {
  const res = await api.patch(`/grc/governance/committees/${committeeId}`, dto);
  return res.data?.data ?? res.data;
};

export const deleteCommittee = async (committeeId: string): Promise<void> => {
  await api.delete(`/grc/governance/committees/${committeeId}`);
};

// Adds an existing board member to the committee — name/email are resolved
// server-side from the board member record, never typed here.
export const addCommitteeMember = async (
  committeeId: string,
  dto: { boardMemberId: string; role?: CommitteeMemberRole },
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

// Same removal, addressed by the board member's id rather than their row
// index — used from the board member's own page (BoardMgt.tsx), which
// doesn't have the committee's member array/index handy.
export const removeCommitteeMemberByBoardMember = async (
  committeeId: string,
  boardMemberId: string,
): Promise<void> => {
  await api.delete(
    `/grc/governance/committees/${committeeId}/members/board-member/${boardMemberId}`,
  );
};

// Owner must be a current member of this committee (validated server-side);
// the owner name shown on the task is a snapshot resolved from that member.
export const addCommitteeTask = async (
  committeeId: string,
  dto: { title: string; ownerBoardMemberId: string; dueDate: string },
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
  timezone: string;
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
  dto: {
    title: string;
    presenter?: string;
    durationMinutes?: number;
    type?: AgendaItemType;
  },
): Promise<Meeting> => {
  const res = await api.post(`/grc/governance/meetings/${id}/agenda`, dto);
  return res.data?.data ?? res.data;
};

export const updateAgendaItem = async (
  id: string,
  index: number,
  dto: {
    title?: string;
    presenter?: string;
    durationMinutes?: number;
    type?: AgendaItemType;
  },
): Promise<Meeting> => {
  const res = await api.patch(
    `/grc/governance/meetings/${id}/agenda/${index}`,
    dto,
  );
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

// agendaItemTitle blank or omitted files the document under the
// general "Procedural documents" bucket.
export const addBoardPackDoc = async (
  id: string,
  file: File,
  agendaItemTitle?: string,
): Promise<Meeting> => {
  const form = new FormData();
  form.append("file", file);
  if (agendaItemTitle) form.append("agendaItemTitle", agendaItemTitle);
  const res = await api.post(`/grc/governance/meetings/${id}/board-pack`, form);
  return res.data?.data ?? res.data;
};

// Creates an "Outstanding" placeholder — a required document the
// tenant is asking for but hasn't received yet.
export const addBoardPackRequirement = async (
  id: string,
  dto: {
    name: string;
    agendaItemTitle?: string;
    assignedToEmployeeId?: string;
    dueDate?: string;
  },
): Promise<Meeting> => {
  const res = await api.post(
    `/grc/governance/meetings/${id}/board-pack/requirement`,
    dto,
  );
  return res.data?.data ?? res.data;
};

// Attaches a file to an existing outstanding requirement (by its
// index in boardPack) instead of creating a duplicate row.
export const fulfillBoardPackDoc = async (
  id: string,
  index: number,
  file: File,
): Promise<Meeting> => {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post(
    `/grc/governance/meetings/${id}/board-pack/${index}/fulfill`,
    form,
  );
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

// Reply, as the tenant, to a director's note/question on a board pack
// document (same thread shown on the board portal's document detail
// view — the fileUrl ties the reply to the right document).
export const addBoardPackNoteAsTenant = async (
  id: string,
  fileUrl: string,
  text: string,
): Promise<Meeting> => {
  const res = await api.post(
    `/grc/governance/meetings/${id}/board-pack/notes`,
    {
      fileUrl,
      text,
    },
  );
  return res.data?.data ?? res.data;
};

export const updateBoardPackDueDate = async (
  id: string,
  dueDate: string | null,
): Promise<Meeting> => {
  const res = await api.patch(
    `/grc/governance/meetings/${id}/board-pack-due-date`,
    { dueDate },
  );
  return res.data?.data ?? res.data;
};

// A board pack document request assigned to the logged-in employee,
// flattened with its parent meeting's context — same shape as
// MyAuditRequest in compliance-api.ts, what GET
// /grc/governance/meetings/my/board-pack-requests returns.
export interface MyBoardPackRequest extends BoardPackDoc {
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
  index: number;
}

export const fetchMyBoardPackRequests = async (): Promise<
  MyBoardPackRequest[]
> => {
  const res = await api.get("/grc/governance/meetings/my/board-pack-requests");
  return res.data?.data ?? res.data;
};

export const submitMyBoardPackDoc = async (
  meetingId: string,
  index: number,
  file: File,
): Promise<Meeting> => {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post(
    `/grc/governance/meetings/my/board-pack-requests/${meetingId}/${index}/file`,
    form,
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

export interface NoticeRsvpSnapshot {
  title: string;
  type: string;
  date: string;
  location: string;
  chair: string;
  noticeBody: string;
  rsvpDeadline: string | null;
  prefillName: string;
  currentRsvp: NoticeRsvpStatus;
}

export const fetchNoticeRsvpSnapshot = async (
  token: string,
): Promise<NoticeRsvpSnapshot> => {
  const res = await api.get(`/grc/governance/meetings/notice-rsvp/${token}`);
  return res.data?.data ?? res.data;
};

export const submitPublicNoticeRsvp = async (
  token: string,
  dto: { name: string; rsvp: "Confirmed" | "Apologies" },
): Promise<{ success: boolean }> => {
  const res = await api.post(
    `/grc/governance/meetings/notice-rsvp/${token}`,
    dto,
  );
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

// ── Preparation checklist ────────────────────────────────────────
export const setMeetingChecklistItem = async (
  id: string,
  itemId: string,
  completed: boolean,
): Promise<Meeting> => {
  const res = await api.patch(
    `/grc/governance/meetings/${id}/checklist/${itemId}`,
    { completed },
  );
  return res.data?.data ?? res.data;
};

// ── Notice — drafted, then dispatched to attendees ───────────────
export const updateMeetingNotice = async (
  id: string,
  dto: { body: string; minimumDays?: number; rsvpDeadline?: string },
): Promise<Meeting> => {
  const res = await api.patch(`/grc/governance/meetings/${id}/notice`, dto);
  return res.data?.data ?? res.data;
};

export const dispatchMeetingNotice = async (id: string): Promise<Meeting> => {
  const res = await api.post(
    `/grc/governance/meetings/${id}/notice/dispatch`,
    {},
  );
  return res.data?.data ?? res.data;
};

// ── Structured minutes drafting ──────────────────────────────────
export const updateMeetingMinutesDraft = async (
  id: string,
  dto: {
    chair?: string;
    minuteTaker?: string;
    quorumText?: string;
    conflicts?: string;
    sections: Omit<MinuteSection, "_id">[];
    actions: MinutesDraftAction[];
  },
): Promise<Meeting> => {
  const res = await api.patch(
    `/grc/governance/meetings/${id}/minutes-draft`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const setMeetingMinutesDraftStatus = async (
  id: string,
  status: MinutesDraftStatus,
): Promise<Meeting> => {
  const res = await api.patch(
    `/grc/governance/meetings/${id}/minutes-draft/status`,
    { status },
  );
  return res.data?.data ?? res.data;
};

// Tenant action: send the minutes to the meeting's Chair for review
// and approval. Only reachable from Draft, or again after the Chair
// has requested changes.
export const sendMinutesForChairReview = async (
  id: string,
): Promise<Meeting> => {
  const res = await api.post(
    `/grc/governance/meetings/${id}/minutes-draft/send-for-chair-review`,
    {},
  );
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
  newDate?: string,
): Promise<Meeting> => {
  const res = await api.post(`/grc/governance/meetings/${id}/postpone`, {
    reason,
    newDate,
  });
  return res.data?.data ?? res.data;
};

// No resumeMeeting: postponing a meeting already moves its `date`, so
// every upcoming/past split (date-based, not status-based) picks it
// back up on its own — there's no separate "resume" step or endpoint.

export const deleteMeeting = async (id: string): Promise<void> => {
  await api.delete(`/grc/governance/meetings/${id}`);
};

// Action items arising from a meeting — the assignee must already be
// a real attendee of the meeting (picked from meeting.attendees, no
// free-text name/email), matching the same "no manual adding of
// name/email" convention used for committee members and task owners.
export const addMeetingActionItem = async (
  id: string,
  dto: {
    title: string;
    description?: string;
    assigneeEmail: string;
    dueDate?: string;
  },
): Promise<Meeting> => {
  const res = await api.post(
    `/grc/governance/meetings/${id}/action-items`,
    dto,
  );
  return res.data?.data ?? res.data;
};

export const removeMeetingActionItem = async (
  id: string,
  actionItemId: string,
): Promise<Meeting> => {
  const res = await api.delete(
    `/grc/governance/meetings/${id}/action-items/${actionItemId}`,
  );
  return res.data?.data ?? res.data;
};

export const setMeetingActionItemStatus = async (
  id: string,
  actionItemId: string,
  status: MeetingActionItemStatus,
): Promise<Meeting> => {
  const res = await api.patch(
    `/grc/governance/meetings/${id}/action-items/${actionItemId}/status`,
    { status },
  );
  return res.data?.data ?? res.data;
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
  templateId?: string;
}): Promise<GovernanceCode> => {
  const res = await api.post("/grc/governance/codes", dto);
  return res.data?.data ?? res.data;
};

// Real, super-admin-managed templates (shared with Policies —
// appliesTo scopes this fetch to the ones flagged for Governance
// Codes) — replaces the old hardcoded local TEMPLATES list.
export const fetchGovernanceCodeTemplates = async (): Promise<
  GovernanceCodeTemplate[]
> => {
  const res = await api.get("/grc/compliance/policy-templates", {
    params: { appliesTo: "Governance Code" },
  });
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
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

export const sendCodeForReview = async (
  id: string,
): Promise<GovernanceCode> => {
  const res = await api.post(`/grc/governance/codes/${id}/send-for-review`, {});
  return res.data?.data ?? res.data;
};

export const sendCodeForBoardApproval = async (
  id: string,
): Promise<GovernanceCode> => {
  const res = await api.post(
    `/grc/governance/codes/${id}/send-for-board-approval`,
    {},
  );
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
  entries: {
    index: number;
    status: MeetingAttendanceStatus;
    proxyHolderName?: string;
    note?: string;
  }[],
): Promise<Meeting> => {
  const res = await api.patch(`/grc/governance/meetings/${id}/attendance`, {
    entries,
  });
  return res.data?.data ?? res.data;
};

export const resendNotice = async (
  id: string,
): Promise<{ success: boolean; resentTo: number }> => {
  const res = await api.post(
    `/grc/governance/meetings/${id}/notice/resend`,
    {},
  );
  return res.data?.data ?? res.data;
};

export const downloadNoticePdf = async (
  id: string,
  meetingTitle: string,
): Promise<void> => {
  const res = await api.get(`/grc/governance/meetings/${id}/notice/pdf`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(
    new Blob([res.data], { type: "application/pdf" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${meetingTitle.replace(/[^a-z0-9]+/gi, "-")}-notice.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ── Board pack cover page / executive summary ──────────────────────
export const updateExecutiveSummary = async (
  id: string,
  executiveSummary: string,
): Promise<Meeting> => {
  const res = await api.patch(
    `/grc/governance/meetings/${id}/executive-summary`,
    { executiveSummary },
  );
  return res.data?.data ?? res.data;
};

export const downloadExecutiveSummaryPdf = async (
  id: string,
  meetingTitle: string,
): Promise<void> => {
  const res = await api.get(
    `/grc/governance/meetings/${id}/executive-summary/pdf`,
    { responseType: "blob" },
  );
  const url = window.URL.createObjectURL(
    new Blob([res.data], { type: "application/pdf" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${meetingTitle.replace(/[^a-z0-9]+/gi, "-")}-executive-summary.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ── Meeting-specific conflict of interest ──────────────────────────
export const recordMeetingConflict = async (
  id: string,
  dto: {
    declaredByEmail: string;
    status?: MeetingConflictStatus;
    agendaItems?: string[];
    natureOfConflict: string;
    actionTaken?: MeetingConflictAction;
  },
): Promise<Meeting> => {
  const res = await api.post(`/grc/governance/meetings/${id}/conflicts`, dto);
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

// ── Public — minutes CHAIR review (Executive/Ad-hoc/AGM/EGM meetings
// only; Board/Committee chairs review in-app on the board portal). ──

export interface MinutesChairReviewSnapshot {
  title: string;
  type: string;
  date: string;
  pdfUrl: string | null;
  prefillName: string;
  decision: MinutesApprovalDecision;
  notes: string;
  decidedAt: string | null;
}

export const fetchMinutesChairReviewSnapshot = async (
  token: string,
): Promise<MinutesChairReviewSnapshot> => {
  const res = await api.get(
    `/grc/governance/meetings/minutes-chair-review/${token}`,
  );
  return res.data?.data ?? res.data;
};

export const submitMinutesChairReview = async (
  token: string,
  dto: { decision: "approved" | "changes-requested"; notes?: string },
): Promise<{ success: boolean }> => {
  const res = await api.post(
    `/grc/governance/meetings/minutes-chair-review/${token}`,
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

// ══════════════════════════════════════════════════════════════
// Organisation Structure — the real org chart, derived server-side
// from HR's own Employee records (reportsToManagerId/jobTitle/teamId),
// per the PO's explicit choice of HR-derived over a freeform
// tenant-designed structure. Read-only: the hierarchy itself is
// managed on the HR → Employees pages (reporting line, job title,
// team), not edited here.
// ══════════════════════════════════════════════════════════════

export type EmployeeHierarchyRole =
  | "regular"
  | "manager"
  | "head_of_department"
  | "owner";

export interface OrgChartNode {
  id: string;
  name: string;
  jobTitle: string;
  hierarchyRole: EmployeeHierarchyRole;
  employeeNumber: string;
  email: string;
  teamId: string | null;
  teamName: string | null;
  reportCount: number;
  children: OrgChartNode[];
}

export interface OrgChart {
  stats: {
    totalEmployees: number;
    teams: number;
    headsOfDepartment: number;
    managers: number;
    teamsWithoutHead: number;
  };
  roots: OrgChartNode[];
}

export const fetchOrgChart = async (): Promise<OrgChart> => {
  const res = await api.get("/grc/governance/org-structure");
  return (
    res.data?.data ??
    res.data ?? {
      stats: {
        totalEmployees: 0,
        teams: 0,
        headsOfDepartment: 0,
        managers: 0,
        teamsWithoutHead: 0,
      },
      roots: [],
    }
  );
};
