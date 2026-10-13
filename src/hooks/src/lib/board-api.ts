import { api } from "./api";

const unwrap = (res: any) => res.data?.data ?? res.data;

// Documents/induction-pack files come back as backend-relative paths
// (e.g. "/uploads/grc/board-members/documents/xyz.pdf") — resolve to
// an absolute URL the same way lexora-tenant's resolveGrcFileUrl does.
const API_BASE = (api.defaults as any)?.baseURL ?? "/api";
export const resolveBoardFileUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith("http")) return url;
  return `${new URL(API_BASE).origin}${url}`;
};

// ══════════════════════════════════════════════════════════════
// Auth
// ══════════════════════════════════════════════════════════════

export interface BoardPortalUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: string;
  mustChangePassword?: boolean;
}

export interface LoginResponse {
  user: BoardPortalUser;
  tokens: { accessToken: string; refreshToken: string };
}

export const login = async (
  email: string,
  password: string,
): Promise<LoginResponse> => {
  const res = await api.post("/auth/login", { email, password });
  return unwrap(res);
};

// ══════════════════════════════════════════════════════════════
// My onboarding (self-service — the signed-in board member's own
// record, scoped server-side to their own JWT, never an arbitrary
// board member id)
// ══════════════════════════════════════════════════════════════

export type BoardOnboardingStageId =
  | "accept"
  | "fit-proper"
  | "sign-docs"
  | "training"
  | "induction";

export interface OnboardingChecklistItem {
  label: string;
  done: boolean;
  completedAt: string | null;
  stageId: BoardOnboardingStageId | null;
}

export type BoardMemberLifecycleStatus = "Onboarding" | "Active" | "Offboarded";

// ══════════════════════════════════════════════════════════════
// Real onboarding form submissions — one shape per step, matching
// the backend's BoardMemberService exactly (board-member.schema.ts /
// board-member.dto.ts). Question/document/module ids are fixed,
// server-validated lists (REGULATORY_QUESTION_IDS, COI_QUESTION_IDS,
// APPOINTMENT_DOCUMENT_IDS, ONBOARDING_TRAINING_MODULE_IDS there),
// mirrored below as plain string unions so this file doesn't need a
// shared package to stay in sync — change one side, change the other.
// ══════════════════════════════════════════════════════════════

export type RegulatoryQuestionId = "sanction" | "bankrupt" | "convictions";
export type CoiQuestionId = "interest" | "related";
export type AppointmentDocumentId = "charter" | "conduct" | "nda";
// Training modules are a real, tenant-authored catalog now (see
// TrainingModule below) — no fixed id set any more, so this is just a
// plain string (the module's real _id).

export interface Directorship {
  company: string;
  position: string;
  detail: string;
}

export interface YesNoAnswer {
  questionId: string;
  yes: boolean;
  detail: string;
}

export interface FitProperSubmission {
  fullName: string;
  dob: string;
  idNumber: string;
  nationality: string;
  address: string;
  directorships: Directorship[];
  answers: YesNoAnswer[];
  referenceName: string;
  referenceRelationship: string;
  referenceEmail: string;
  submittedAt: string;
}

// signedDocumentIds now holds the _id of each BoardMember.documentsToSign
// entry the tenant set up for this director (see SignableDocument
// below) rather than the old fixed 'charter'/'conduct'/'nda' literals
// — a director with none configured simply has nothing to sign here.
export interface DocumentsCoiSubmission {
  signedDocumentIds: string[];
  holdsOtherDirectorships: boolean;
  currentDirectorships: Directorship[];
  answers: YesNoAnswer[];
  submittedAt: string;
}

// A document the tenant set up for this director to sign (Board
// Charter, Code of Conduct, etc.) — a snapshot of one of the tenant's
// published Governance Codes, taken when they assigned it.
export interface SignableDocument {
  _id: string;
  title: string;
  category: string;
  sourceCodeId: string | null;
  // The code's rich-text body at assignment time — codes are authored
  // in-app, not uploaded as files, so this (not fileUrl) is what lets
  // the director actually read and review what they're signing.
  body: string;
  fileUrl: string | null;
  version: number;
}

// A real file in the induction pack the tenant has sent so far — every
// document the tenant has uploaded for this director (from either the
// "Documents" tab or the dedicated induction-pack sender, which now
// write to the same place on the backend).
export interface InductionPackFile {
  _id: string;
  name: string;
  fileUrl: string | null;
  mimeType: string | null;
  size: number;
  uploadedBy: string;
}

// A real, tenant-authored mandatory training module (Step 4) — the
// tenant's own catalog, not a fixed reference list. "Start module"
// opens resourceUrl when present; a module with none is still
// completable by self-attestation.
export interface TrainingModule {
  _id: string;
  title: string;
  description: string;
  resourceUrl: string | null;
  resourceMimeType: string | null;
  order: number;
}

export interface MyOnboarding {
  lifecycleStatus: BoardMemberLifecycleStatus;
  checklist: OnboardingChecklistItem[];
  totalItems: number;
  doneItems: number;
  startedAt: string;
  completedAt: string | null;
  stages: {
    accept: { done: boolean };
    fitProper: { done: boolean; submission: FitProperSubmission | null };
    documentsCoi: {
      done: boolean;
      submission: DocumentsCoiSubmission | null;
      documents: SignableDocument[];
    };
    training: {
      done: boolean;
      completedModuleIds: string[];
      modules: TrainingModule[];
    };
    induction: {
      done: boolean;
      acknowledgement: {
        scheduledDate: string | null;
        acknowledgedDocumentIds: string[];
        acknowledgedAt: string;
      } | null;
      pack: InductionPackFile[];
    };
  };
}

export interface MyBoardProfile {
  id: string;
  name: string;
  role: string;
  email: string;
  // Lives only on the User doc backend-side — see
  // BoardMemberService#getMyProfile.
  phone: string;
  // Lives on the BoardMember doc — editing it here also updates what the
  // tenant's own Board Management > Personal details shows (PO, Oct 2026).
  bio: string;
  appointedAt: string;
  termEnds: string;
  lifecycleStatus: BoardMemberLifecycleStatus;
  // Tenant-provided at director-creation time — used to prefill Step 2
  // of onboarding unless the tenant left them blank.
  nationality: string;
  idNumber: string;
  // The real tenant company that appointed this director — used instead
  // of the platform's own name ("Lexora Africa") in onboarding questions
  // and declaration text, since the director is declaring to this tenant.
  tenantCompanyName: string;
}

export const fetchMyProfile = async (): Promise<MyBoardProfile> => {
  const res = await api.get("/board-portal/me");
  return unwrap(res);
};

// ══════════════════════════════════════════════════════════════
// Profile & Settings — "edit their own details, like phone number
// and email" (PO, Oct 2026). Password changes reuse the platform's
// existing /auth/change-password endpoint directly (it already works
// for every signed-in user type, board members included) rather than
// a board-portal-specific route.
// ══════════════════════════════════════════════════════════════

export const updateMyProfile = async (dto: {
  phone?: string;
  email?: string;
  bio?: string;
}): Promise<MyBoardProfile> => {
  const res = await api.patch("/board-portal/me", dto);
  return unwrap(res);
};

export const changeMyPassword = async (dto: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ message?: string }> => {
  const res = await api.patch("/auth/change-password", dto);
  return unwrap(res);
};

export const fetchMyOnboarding = async (): Promise<MyOnboarding> => {
  const res = await api.get("/board-portal/onboarding");
  return unwrap(res);
};

// Each of these four returns the same MyOnboarding shape fetchMyOnboarding
// does (the backend re-derives and returns it after saving), so a
// caller can just swap it straight into the query cache instead of
// refetching.

export const submitFitProper = async (dto: {
  fullName: string;
  dob: string;
  idNumber: string;
  nationality: string;
  address: string;
  directorships: Directorship[];
  answers: YesNoAnswer[];
  referenceName?: string;
  referenceRelationship?: string;
  referenceEmail?: string;
}): Promise<MyOnboarding> => {
  const res = await api.post("/board-portal/onboarding/fit-proper", dto);
  return unwrap(res);
};

export const submitDocumentsCoi = async (dto: {
  signedDocumentIds: string[];
  holdsOtherDirectorships: boolean;
  currentDirectorships: Directorship[];
  answers: YesNoAnswer[];
}): Promise<MyOnboarding> => {
  const res = await api.post("/board-portal/onboarding/documents-coi", dto);
  return unwrap(res);
};

export const submitOnboardingTraining = async (
  completedModuleIds: string[],
): Promise<MyOnboarding> => {
  const res = await api.post("/board-portal/onboarding/training", {
    completedModuleIds,
  });
  return unwrap(res);
};

export const submitInduction = async (dto: {
  scheduledDate?: string;
  acknowledgedDocumentIds: string[];
}): Promise<MyOnboarding> => {
  const res = await api.post("/board-portal/onboarding/induction", dto);
  return unwrap(res);
};

// ══════════════════════════════════════════════════════════════
// Governance Codes — codes this director has been asked to
// approve (Board Charter, Code of Conduct, etc.), decided in-app
// rather than via an emailed link since a board member is already
// an authenticated portal user.
// ══════════════════════════════════════════════════════════════

export type CodeApprovalDecision = "Pending" | "Approved" | "Rejected";

export interface PendingGovernanceCode {
  id: string;
  title: string;
  category: string;
  version: number;
  status: string;
  body: string;
  myDecision: CodeApprovalDecision | null;
  myNotes: string;
  myDecidedAt: string | null;
}

export const fetchPendingGovernanceCodes = async (): Promise<
  PendingGovernanceCode[]
> => {
  const res = await api.get("/board-portal/governance-codes");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const decideGovernanceCode = async (
  id: string,
  decision: "Approved" | "Rejected",
  notes?: string,
): Promise<{ status: string }> => {
  const res = await api.post(`/board-portal/governance-codes/${id}/decide`, {
    decision,
    notes,
  });
  return unwrap(res);
};

// ══════════════════════════════════════════════════════════════
// ESG disclosure approvals — two separate board-portal dockets, one
// per role in the two-party approval chain (board.controller.ts
// #getPending/decide and #getCommitteeApprovals/decideCommittee).
// Committee members — the ESG Committee Chair included — are always
// real board members (same precedent the Minutes chair-review/
// adoption workflow established), so both roles review in-app now;
// neither needs an external emailed link. The Board Chair's docket
// is still only ever populated once the ESG Committee Chair has
// approved — the backend hard-gates this, this is just the matching
// display: "one cannot sign if the other hasn't".
// ══════════════════════════════════════════════════════════════

export type EsgApprovalDecision = "Pending" | "Approved" | "Declined";

export interface IndicatorEvidence {
  _id?: string;
  name: string;
  fileUrl: string | null;
  mimeType: string | null;
  size: number;
}

export interface PendingEsgApproval {
  id: string;
  code: string;
  title: string;
  requirement: string;
  response: string;
  evidence: IndicatorEvidence[];
  frameworkLabel: string;
  esgChairDecidedAt: string | null;
  esgChairName: string;
  myDecision: EsgApprovalDecision;
  myNotes: string;
  myDecidedAt: string | null;
}

export const fetchEsgApprovals = async (): Promise<PendingEsgApproval[]> => {
  const res = await api.get("/board-portal/esg-approvals");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const decideEsgApproval = async (
  id: string,
  decision: "Approved" | "Declined",
  notes?: string,
): Promise<{ status: string }> => {
  const res = await api.post(`/board-portal/esg-approvals/${id}/decide`, {
    decision,
    notes,
  });
  return unwrap(res);
};

// The ESG Committee Chair's own docket — the first step in the
// chain, so there's no prior reviewer to show (unlike the Board
// Chair's PendingEsgApproval above, which shows who/when the
// Committee Chair reviewed).
export interface PendingEsgCommitteeApproval {
  id: string;
  code: string;
  title: string;
  requirement: string;
  response: string;
  evidence: IndicatorEvidence[];
  frameworkLabel: string;
  myDecision: EsgApprovalDecision;
  myNotes: string;
  myDecidedAt: string | null;
}

export const fetchEsgCommitteeApprovals = async (): Promise<
  PendingEsgCommitteeApproval[]
> => {
  const res = await api.get("/board-portal/esg-committee-approvals");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const decideEsgCommitteeApproval = async (
  id: string,
  decision: "Approved" | "Declined",
  notes?: string,
): Promise<{ status: string }> => {
  const res = await api.post(
    `/board-portal/esg-committee-approvals/${id}/decide`,
    { decision, notes },
  );
  return unwrap(res);
};

// ══════════════════════════════════════════════════════════════
// My Committees — the committees this director belongs to, per
// board-portal.controller.ts#getMyCommittees /
// committee.service.ts#getForBoardMemberPortal. Membership itself is
// set up entirely on the tenant side (Committees / Board Management
// pages there); this is a read-only view of it plus the committee's
// own tasks.
// ══════════════════════════════════════════════════════════════

export type CommitteeMemberRole = "Chair" | "Secretary" | "Member";
export type CommitteeTaskStatus = "Open" | "In Progress" | "Done";

export interface MyCommitteeTask {
  title: string;
  // Display snapshot of the owner's name.
  owner: string;
  // Real link to whichever board member owns this task — compare
  // against the signed-in director's own id to highlight "my tasks".
  ownerBoardMemberId: string | null;
  dueDate: string;
  status: CommitteeTaskStatus;
}

export interface MyCommittee {
  _id: string;
  name: string;
  purpose: string;
  cadence: string;
  quorum: string;
  charter: string;
  nextMeeting: string | null;
  chair: string | null;
  membersCount: number;
  // This director's own role on this committee.
  myRole: CommitteeMemberRole;
  tasks: MyCommitteeTask[];
}

export const fetchMyCommittees = async (): Promise<MyCommittee[]> => {
  const res = await api.get("/board-portal/committees");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

// ══════════════════════════════════════════════════════════════
// Board of Directors overview — the whole-board card on My
// Committees, distinct from any single committee. Per
// board-portal.controller.ts#getBoardOverview /
// board-member.service.ts#getBoardOverview: this director's own
// role/status, how many active board members the tenant has, their
// own real Board-meeting attendance (computed server-side from
// GovernanceMeeting records, not typed in anywhere), and the
// tenant's current published Board Charter (a Governance Code with
// category "Board Charter" — there's no separate charter document).
// ══════════════════════════════════════════════════════════════

export interface BoardAttendance {
  pct: number;
  present: number;
  eligible: number;
}

export interface BoardCharter {
  id: string;
  title: string;
  version: number;
  // Rich-text/HTML body, same as a Governance Code's body elsewhere
  // in the app — rendered as-is, not parsed into a fixed
  // purpose/principles shape.
  body: string;
  publishedAt: string | null;
}

export interface BoardOverview {
  name: string;
  role: string;
  status: string;
  totalMembers: number;
  // null until at least one Board-type meeting has had attendance
  // recorded and this director was on its attendee list.
  attendance: BoardAttendance | null;
  // null until the tenant has published a Board Charter code.
  charter: BoardCharter | null;
}

export const fetchBoardOverview = async (): Promise<BoardOverview> => {
  const res = await api.get("/board-portal/board-overview");
  return unwrap(res);
};

// ══════════════════════════════════════════════════════════════
// Meetings — "receive everything pertaining to it... both via email
// and on their board portal". Per
// board-portal.controller.ts#getMyMeetings/submitMeetingAck/
// setMyMeetingActionItemStatus and
// meeting.service.ts#getForBoardMemberPortal: every real, dispatched
// (non-Draft) meeting this director is an attendee of, scoped
// server-side to their own attendee record — never a free-text RSVP
// or a locally invented action-item list. Meetings are created and
// dispatched entirely from the tenant app; this is a read + narrow
// self-service view (RSVP, mark own action items done).
// ══════════════════════════════════════════════════════════════

export type MyMeetingAudienceType =
  | "Board"
  | "Committee"
  | "Executive"
  | "Ad-hoc";
export type MyMeetingMode = "Physical" | "Online";
export type MyMeetingStatus = "Sent" | "Held" | "Postponed";
export type MyMeetingActionItemStatus = "Open" | "Done";

export interface MyMeetingAgendaItem {
  title: string;
  presenter: string;
  durationMinutes: number;
}

export interface MyMeetingBoardPackDoc {
  name: string;
  fileUrl: string | null;
  mimeType: string | null;
  size: number;
  uploadedAt: string;
}

export interface MyMeetingActionItem {
  _id: string;
  title: string;
  description: string;
  dueDate: string | null;
  status: MyMeetingActionItemStatus;
  completedAt: string | null;
}

// Per PO feedback (2026-09): attendance is captured as in-person /
// by proxy / apology / absent, not just present/absent, and a
// director can declare a conflict of interest from their own portal
// — mirrors lexora-tenant's governance-api.ts types exactly.
export type MyMeetingAttendanceStatus =
  | "Present"
  | "Proxy"
  | "Apology"
  | "Absent";
// Four values (not a declared/resolved lifecycle) — mirrors
// lexora-tenant's governance-api.ts exactly. There's no status field
// in this portal's own dialog (see submitMeetingConflict below); the
// server infers one of these from the chosen action.
export type MeetingConflictStatus =
  | "No conflict declared"
  | "Conflict declared — recusal required"
  | "Conflict declared — noted, no recusal"
  | "Standing declaration — ongoing";
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

export interface MyMeetingConflict {
  _id: string;
  status: MeetingConflictStatus;
  agendaItems: string[];
  natureOfConflict: string;
  actionTaken: MeetingConflictAction | null;
  recordedAt: string;
}

export interface MyMeeting {
  _id: string;
  title: string;
  type: MyMeetingAudienceType;
  committeeId: string | null;
  date: string;
  mode: MyMeetingMode;
  location: string;
  chair: string;
  status: MyMeetingStatus;
  agenda: MyMeetingAgendaItem[];
  boardPack: MyMeetingBoardPackDoc[];
  // Board Packs page — the pack's own cover page, rich HTML the
  // tenant's Company Secretary drafts before circulating the pack.
  // Empty string until they've written one.
  executiveSummary: string;
  executiveSummaryUpdatedAt: string | null;
  // Only populated once minutes have actually been sent — a director
  // is never shown a draft/unsent minutes text.
  minutes: string | null;
  minutesPdfUrl: string | null;
  minutesSentAt: string | null;
  // null until attendance has been recorded for this meeting.
  myAttendance: boolean | null;
  // Per-attendee Present/Proxy/Apology/Absent status — null until the
  // tenant records attendance for this meeting.
  myAttendanceStatus: MyMeetingAttendanceStatus | null;
  // This director's own conflict-of-interest declaration for this
  // meeting, whether recorded by the tenant or self-declared here.
  myConflict: MyMeetingConflict | null;
  myAck: { agendaConfirmed: boolean; confirmedAt: string } | null;
  // This director's own action items only, never the full meeting list.
  actionItems: MyMeetingActionItem[];
  // Set once the tenant has dispatched the meeting Notice — visible
  // (and RSVP-able) even while the meeting itself is still Draft, ahead
  // of the board pack. Null until the notice goes out.
  notice: {
    body: string;
    rsvpDeadline: string | null;
    dispatchedAt: string;
  } | null;
  myNoticeRsvp: {
    rsvp: "Pending" | "Confirmed" | "Apologies";
    openedAt: string | null;
  } | null;
  // Board Packs page — this director's own reading progress across the
  // meeting's boardPack documents, plus every note left on any of them
  // (shared among attendees and the tenant, not private per-director).
  myBoardPack: {
    readFileUrls: string[];
    allDocumentsRead: boolean;
    allDocumentsReadAt: string | null;
  };
  boardPackNotes: BoardPackNote[];
  // Minutes chair-review / adoption workflow (PO feedback, Oct 2026).
  // Board/Committee chairs review and every attendee adopts in-app,
  // since they're real board members — see
  // MeetingService#resolveChairForReview/getForBoardMemberPortal.
  minutesDraftStatus: MinutesDraftStatus | null;
  // Only populated for the director actually resolved as this
  // meeting's Chair — everyone else sees null here.
  myChairReview: {
    decision: "Pending" | "Approved" | "Changes requested";
    notes: string;
    requestedAt: string | null;
    decidedAt: string | null;
    pdfUrl: string | null;
  } | null;
  // This director's own adoption decision, once they've adopted.
  myBoardAdoption: {
    decision: "approved" | "changes-requested";
    submittedAt: string;
  } | null;
  // Whether this director can adopt right now (minutes tabled for
  // adoption and not already adopted by them).
  canAdoptMinutes: boolean;
}

export type MinutesDraftStatus =
  | "Draft"
  | "Sent for Chair review"
  | "Chair approved"
  | "Tabled for adoption"
  | "Adopted and signed";

export interface BoardPackNote {
  fileUrl: string;
  authorName: string;
  authorEmail: string;
  text: string;
  createdAt: string;
  // True when this entry is the tenant's (Company Secretary's) reply
  // rather than a director's own note/question.
  fromTenant: boolean;
}

export const fetchMyMeetings = async (): Promise<MyMeeting[]> => {
  const res = await api.get("/board-portal/meetings");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const submitMeetingNoticeRsvp = async (
  meetingId: string,
  rsvp: "Confirmed" | "Apologies",
): Promise<MyMeeting> => {
  const res = await api.post(
    `/board-portal/meetings/${meetingId}/notice/rsvp`,
    { rsvp },
  );
  return unwrap(res);
};

export const markMeetingNoticeOpened = async (
  meetingId: string,
): Promise<{ success: boolean }> => {
  const res = await api.post(
    `/board-portal/meetings/${meetingId}/notice/opened`,
    {},
  );
  return unwrap(res);
};

export const submitMeetingAck = async (
  meetingId: string,
  agendaConfirmed: boolean,
): Promise<MyMeeting> => {
  const res = await api.post(`/board-portal/meetings/${meetingId}/ack`, {
    agendaConfirmed,
  });
  return unwrap(res);
};

// This director's own decision as Chair on a minutes chair-review
// request — approving auto-advances the minutes to "Chair approved".
export const decideMinutesChairReview = async (
  meetingId: string,
  dto: { decision: "approved" | "changes-requested"; notes?: string },
): Promise<{ success: boolean }> => {
  const res = await api.post(
    `/board-portal/meetings/${meetingId}/minutes/chair-review/decide`,
    dto,
  );
  return unwrap(res);
};

// This director adopting a Board/Committee meeting's minutes, in-app.
export const adoptMinutes = async (
  meetingId: string,
  comment?: string,
): Promise<{ success: boolean }> => {
  const res = await api.post(
    `/board-portal/meetings/${meetingId}/minutes/adopt`,
    { comment },
  );
  return unwrap(res);
};

// Declare a conflict of interest for this meeting, from the
// director's own portal (per PO feedback: "A board member should
// also be able declare conflict of interest from their portal").
// There is no status field here — the server infers one of the four
// MeetingConflictStatus values from the chosen action (a recusal
// action implies recusal is required, "noted" implies it isn't).
// "Standing declaration — ongoing" is tenant-only: that classification
// is left to the Company Secretary, not self-selected by the director.
export const submitMeetingConflict = async (
  meetingId: string,
  dto: {
    agendaItems?: string[];
    natureOfConflict: string;
    actionTaken?: MeetingConflictAction;
  },
): Promise<MyMeeting> => {
  const res = await api.post(
    `/board-portal/meetings/${meetingId}/conflicts`,
    dto,
  );
  return unwrap(res);
};

// ── Board Packs page ─────────────────────────────────────────────
// Mirrors board-portal.controller.ts#toggleBoardPackRead/
// confirmBoardPackRead/addBoardPackNote — real per-document reading
// progress and shared notes against a meeting's real boardPack, not a
// local read-tracking / comment store.

export const toggleBoardPackRead = async (
  meetingId: string,
  fileUrl: string,
  read: boolean,
): Promise<MyMeeting> => {
  const res = await api.patch(
    `/board-portal/meetings/${meetingId}/board-pack/read`,
    { fileUrl, read },
  );
  return unwrap(res);
};

export const confirmBoardPackRead = async (
  meetingId: string,
): Promise<MyMeeting> => {
  const res = await api.post(
    `/board-portal/meetings/${meetingId}/board-pack/confirm-read`,
    {},
  );
  return unwrap(res);
};

export const addBoardPackNote = async (
  meetingId: string,
  fileUrl: string,
  text: string,
): Promise<MyMeeting> => {
  const res = await api.post(
    `/board-portal/meetings/${meetingId}/board-pack/notes`,
    { fileUrl, text },
  );
  return unwrap(res);
};

export const setMyMeetingActionItemStatus = async (
  meetingId: string,
  actionItemId: string,
  status: MyMeetingActionItemStatus,
): Promise<MyMeeting> => {
  const res = await api.patch(
    `/board-portal/meetings/${meetingId}/action-items/${actionItemId}/status`,
    { status },
  );
  return unwrap(res);
};

// ══════════════════════════════════════════════════════════════
// Dashboard — the portal's landing page. Per
// board-portal.controller.ts#getMyDashboard /
// BoardDashboardService#getForBoardMember: every number and item here
// is computed server-side from real onboarding, meeting, board-pack
// and governance-code records — nothing fabricated, and nothing links
// to a page (Declarations, Evaluations, Board Directory, Resolutions)
// that isn't wired to the backend yet.
// ══════════════════════════════════════════════════════════════

export type Tone = "red" | "amber" | "blue" | "violet" | "green" | "gray";

export type DashboardAttentionKind =
  | "onboarding"
  | "sign"
  | "rsvp"
  | "ack"
  | "pack"
  | "code"
  | "action";

export interface DashboardAttentionItem {
  id: string;
  kind: DashboardAttentionKind;
  title: string;
  subtitle: string;
  tone: Tone;
  pill: string;
  to: string;
}

export interface DashboardUpcomingMeeting {
  id: string;
  date: string;
  title: string;
  location: string;
  mode: MyMeetingMode;
  tag: string;
  tagTone: Tone;
}

export interface DashboardStandingItem {
  id: string;
  label: string;
  status: string;
  due: string;
  tone: Tone;
}

export interface MyDashboard {
  kpis: {
    pendingActions: number;
    documentsToSign: number;
    boardPacksToRead: number;
    boardPacksTotal: number;
    nextMeeting: { title: string; date: string } | null;
    cpdHoursYTD: number;
    pendingCodeDecisions: number;
  };
  attentionItems: DashboardAttentionItem[];
  upcomingMeetings: DashboardUpcomingMeeting[];
  standing: DashboardStandingItem[];
}

export const fetchMyDashboard = async (): Promise<MyDashboard> => {
  const res = await api.get("/board-portal/dashboard");
  return unwrap(res);
};

// ══════════════════════════════════════════════════════════════
// Trainings — general, ongoing board training (distinct from the
// onboarding-only training step above). Per PO feedback: the tenant
// creates trainings with optional material, the director reviews it
// and marks complete, or — when there is no material — uploads their
// own proof of completion (certificate/screenshot) instead; the
// tenant can then access that proof on their end. Mirrors
// lexora-tenant's governance-api.ts Training section exactly.
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

export interface MyTraining {
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
  // This director's own completion entry, if any — resolved
  // server-side, never derived client-side from the full list.
  myCompletion: TrainingCompletion | null;
}

export const fetchMyTrainings = async (): Promise<MyTraining[]> => {
  const res = await api.get("/board-portal/trainings");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

// file is required when the training has no resourceUrl of its own
// (enforced server-side too) — it becomes the uploaded proof of
// completion (a PDF or image certificate, say).
export const completeTraining = async (
  trainingId: string,
  file?: File,
): Promise<MyTraining> => {
  const form = new FormData();
  if (file) form.append("file", file);
  const res = await api.post(
    `/board-portal/trainings/${trainingId}/complete`,
    form,
  );
  return unwrap(res);
};

// ══════════════════════════════════════════════════════════════
// Board Directory — "board members are able to see other board
// members and message them" (PO, Oct 2026). Per
// board-member.service.ts#getDirectoryForPortal.
// ══════════════════════════════════════════════════════════════

export interface DirectoryEntry {
  id: string;
  name: string;
  role: string;
  email: string;
  bio: string;
  appointedAt: string;
  termEnds: string;
  lifecycleStatus: BoardMemberLifecycleStatus;
  attendancePercentage: number;
  committees: string[];
  isYou: boolean;
}

export const fetchDirectory = async (): Promise<DirectoryEntry[]> => {
  const res = await api.get("/board-portal/directory");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

// ══════════════════════════════════════════════════════════════
// Messaging — a direct thread with one other director. A "thread" is
// derived server-side (see board-messaging.service.ts), never a
// separate document to create first.
// ══════════════════════════════════════════════════════════════

export interface MessageThread {
  counterpartId: string;
  name: string;
  role: string;
  lastMessage: string;
  lastAt: string;
  unreadCount: number;
}

export interface BoardMessageItem {
  id: string;
  body: string;
  fromMe: boolean;
  createdAt: string;
  // Only present on a message that just arrived live over the socket
  // (see useRealtimeEvent("message:new", …) in Messages.tsx) — not
  // part of the REST history shape.
  fromName?: string;
  fromBoardMemberId?: string;
}

export const fetchMessageThreads = async (): Promise<MessageThread[]> => {
  const res = await api.get("/board-portal/messages/threads");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const fetchMessageThread = async (
  counterpartId: string,
): Promise<BoardMessageItem[]> => {
  const res = await api.get(`/board-portal/messages/${counterpartId}`);
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const sendBoardMessage = async (
  counterpartId: string,
  body: string,
): Promise<BoardMessageItem> => {
  const res = await api.post(`/board-portal/messages/${counterpartId}`, {
    body,
  });
  return unwrap(res);
};

// ══════════════════════════════════════════════════════════════
// Skills Matrix — view every director's recorded skills, and submit
// one of your own when the tenant hasn't recorded it yet. Reuses the
// exact same BoardSkill shape the tenant's own Board Mgt matrix
// reads/writes (board-member.schema.ts) — one shared collection.
// ══════════════════════════════════════════════════════════════

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

export interface BoardSkillEntry {
  name: string;
  category: SkillCategory;
  level: SkillLevel;
  yearsExperience: number;
  qualified: boolean;
  notes: string;
  addedBy: SkillAddedBy;
}

export interface SkillsMatrixRow {
  boardMemberId: string;
  name: string;
  role: string;
  skills: BoardSkillEntry[];
}

export const fetchSkillsMatrix = async (): Promise<SkillsMatrixRow[]> => {
  const res = await api.get("/board-portal/skills-matrix");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const addMySkill = async (dto: {
  name: string;
  category: SkillCategory;
  level: SkillLevel;
  yearsExperience?: number;
  qualified?: boolean;
  notes?: string;
}): Promise<BoardSkillEntry[]> => {
  const res = await api.post("/board-portal/skills", dto);
  return unwrap(res);
};

export const removeMySkill = async (
  index: number,
): Promise<BoardSkillEntry[]> => {
  const res = await api.delete(`/board-portal/skills/${index}`);
  return unwrap(res);
};

// ══════════════════════════════════════════════════════════════
// Notifications — functional and real-time (see src/lib/realtime.ts
// for the live socket push; these are the REST list/read actions).
// ══════════════════════════════════════════════════════════════

export type BoardNotificationType =
  | "Meeting"
  | "Minutes"
  | "Governance Code"
  | "ESG"
  | "Message"
  | "Training"
  | "General";

export interface BoardNotificationItem {
  _id: string;
  type: BoardNotificationType;
  title: string;
  description: string;
  link: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export const fetchMyNotifications = async (): Promise<
  BoardNotificationItem[]
> => {
  const res = await api.get("/board-portal/notifications");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const fetchUnreadNotificationCount = async (): Promise<{
  count: number;
}> => {
  const res = await api.get("/board-portal/notifications/unread-count");
  return unwrap(res);
};

export const markNotificationRead = async (
  id: string,
): Promise<BoardNotificationItem> => {
  const res = await api.post(`/board-portal/notifications/${id}/read`);
  return unwrap(res);
};

export const markAllNotificationsRead = async (): Promise<{
  marked: boolean;
}> => {
  const res = await api.post("/board-portal/notifications/mark-all-read");
  return unwrap(res);
};

// ══════════════════════════════════════════════════════════════
// Resolutions — Board & Written resolutions the signed-in director
// has a vote/response on (Shareholder resolutions aren't individual
// director votes, so they never appear here). Voting happens only
// here now — the tenant side lost its vote-casting UI (Oct 2026).
// ══════════════════════════════════════════════════════════════

export type ResolutionType = "Board" | "Written";
export type ResolutionStatusT = "Draft" | "Voting open" | "Circulating" | "Closed";
export type ResolutionOutcomeT = "Passed" | "Failed" | null;
export type MyVoteChoice = "Approve" | "Oppose" | "Abstain";

export interface MyResolutionRow {
  recused: boolean;
  vote: MyVoteChoice | null;
  status: "Not sent" | "Sent" | "Reminded" | "Responded" | null;
  comment: string;
  respondedAt: string | null;
}

export interface MyResolutionTally {
  approve: number;
  oppose: number;
  abstain: number;
  awaiting: number;
  total: number;
}

export interface MyResolution {
  _id: string;
  reference: string;
  type: ResolutionType;
  subject: string;
  fullText: string;
  status: ResolutionStatusT;
  outcome: ResolutionOutcomeT;
  effectiveDate: string;
  deadline: string | null;
  proposer: string | null;
  seconder: string | null;
  tally: MyResolutionTally;
  myRow: MyResolutionRow | null;
  canAct: boolean;
}

export const fetchMyResolutions = async (): Promise<MyResolution[]> => {
  const res = await api.get("/board-portal/resolutions");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const castMyResolutionVote = async (
  id: string,
  vote: MyVoteChoice,
  comment?: string,
): Promise<MyResolution> =>
  unwrap(await api.post(`/board-portal/resolutions/${id}/vote`, { vote, comment }));

export const respondMyResolution = async (
  id: string,
  response: MyVoteChoice,
  comment?: string,
): Promise<MyResolution> =>
  unwrap(
    await api.post(`/board-portal/resolutions/${id}/respond`, {
      response,
      comment,
    }),
  );

// ══════════════════════════════════════════════════════════════
// Document Vault — documents/folders the tenant has uploaded for
// THIS director specifically (BoardMember.documents), not a
// company-wide library.
// ══════════════════════════════════════════════════════════════

export interface MyVaultDocument {
  _id: string;
  name: string;
  category: "Governance Document" | "Regulatory Filing";
  fileUrl: string | null;
  mimeType: string | null;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  signedAt: string | null;
  folder: string;
}

export interface MyVaultFolder {
  _id: string;
  name: string;
}

export interface MyVault {
  documents: MyVaultDocument[];
  documentFolders: MyVaultFolder[];
}

export const fetchMyVault = async (): Promise<MyVault> => {
  const res = await api.get("/board-portal/documents");
  return unwrap(res) ?? { documents: [], documentFolders: [] };
};

// ══════════════════════════════════════════════════════════════
// Policies — the Compliance page's communication with the tenant's
// Policies & Procedures page (GRC Compliance module): a policy that
// requires board sign-off flows here for approval, and once
// published, flows here again for acknowledgement. Both decided
// in-app, not via an emailed link (Oct 2026).
// ══════════════════════════════════════════════════════════════

export type PolicyApprovalDecision = "Pending" | "Approved" | "Rejected";

export interface PolicySectionRow {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface PendingPolicyApproval {
  id: string;
  title: string;
  category: string;
  version: string;
  status: string;
  description: string;
  sections: PolicySectionRow[];
  fileName: string;
  fileUrl: string | null;
  mimeType: string | null;
  myDecision: PolicyApprovalDecision | null;
  myNotes: string;
  myDecidedAt: string | null;
}

export const fetchMyPolicyApprovals = async (): Promise<
  PendingPolicyApproval[]
> => {
  const res = await api.get("/board-portal/policies/approvals");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const decideMyPolicyApproval = async (
  id: string,
  decision: "Approved" | "Rejected",
  notes?: string,
): Promise<PendingPolicyApproval> =>
  unwrap(
    await api.post(`/board-portal/policies/approvals/${id}/decide`, {
      decision,
      notes,
    }),
  );

export interface PendingPolicyAcknowledgement {
  id: string;
  title: string;
  category: string;
  version: string;
  description: string;
  sections: PolicySectionRow[];
  fileName: string;
  fileUrl: string | null;
  mimeType: string | null;
  alreadyAcknowledged: boolean;
  ackedAt: string | null;
}

export const fetchMyPolicyAcknowledgements = async (): Promise<
  PendingPolicyAcknowledgement[]
> => {
  const res = await api.get("/board-portal/policies/acknowledgements");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const acknowledgeMyPolicy = async (
  id: string,
  signature: string,
): Promise<{ success: boolean }> =>
  unwrap(
    await api.post(`/board-portal/policies/acknowledgements/${id}/acknowledge`, {
      signature,
    }),
  );

// ══════════════════════════════════════════════════════════════
// Fee structure — the Payments & Fees page's "Fee structure" tab,
// set by the tenant per director in Board Management's own
// Remuneration card (Oct 2026).
// ══════════════════════════════════════════════════════════════

export interface MyFeeStructure {
  annualRetainer: number;
  committeeChairFee: number;
  meetingAttendanceFee: number;
  currency: string;
  lastReviewedAt: string | null;
}

export const fetchMyFeeStructure = async (): Promise<MyFeeStructure> => {
  const res = await api.get("/board-portal/fee-structure");
  return (
    unwrap(res) ?? {
      annualRetainer: 0,
      committeeChairFee: 0,
      meetingAttendanceFee: 0,
      currency: "RWF",
      lastReviewedAt: null,
    }
  );
};

// ══════════════════════════════════════════════════════════════
// Expense claims — the Payments & Fees page's "Expense claims" tab.
// Multi-currency; picking category "Other" requires saying what the
// claim is for (Oct 2026).
// ══════════════════════════════════════════════════════════════

export type MyClaimStatus = "Submitted" | "Approved" | "Rejected" | "Paid";
export type MyClaimCategory = "Travel" | "Accommodation" | "Meals" | "Other";

export interface MyExpenseClaim {
  _id: string;
  ref: string;
  description: string;
  category: MyClaimCategory | null;
  otherCategoryDetail: string;
  relatedMeetingLabel: string;
  amount: number;
  currency: string;
  status: MyClaimStatus;
  receiptUrl: string | null;
  receiptName: string | null;
  createdAt: string;
}

export const fetchMyExpenseClaims = async (): Promise<MyExpenseClaim[]> => {
  const res = await api.get("/board-portal/expense-claims");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

// A receipt/supporting document is required (PO, Oct 2026: "For
// board member to submit expense claim, a document must be
// attached") — enforced server-side too (createAsBoardMember 400s
// without one). multipart/form-data, same pattern as completeTraining.
export const submitMyExpenseClaim = async (
  dto: {
    description: string;
    amount: number;
    currency?: string;
    category?: MyClaimCategory;
    otherCategoryDetail?: string;
    relatedMeetingLabel?: string;
  },
  file: File,
): Promise<MyExpenseClaim> => {
  const form = new FormData();
  Object.entries(dto).forEach(([k, v]) => {
    if (v !== undefined && v !== "") form.append(k, String(v));
  });
  form.append("file", file);
  return unwrap(await api.post("/board-portal/expense-claims", form));
};

// ══════════════════════════════════════════════════════════════
// Fee statements — the Payments & Fees page's "Fee statements" tab.
// Bills the tenant has recorded against this director via Capture
// Bill's board-member flow (Oct 2026); "Paid" here is the real
// record of the tenant having paid the director.
// ══════════════════════════════════════════════════════════════

export type MyFeeStatementStatus =
  | "Awaiting approval"
  | "Approved"
  | "Scheduled"
  | "Paid"
  | "Rejected";

export interface MyFeeStatement {
  _id: string;
  ref: string;
  description: string;
  category: string;
  dueOn: string;
  amount: number;
  currency: string;
  status: MyFeeStatementStatus;
  paidAt: string | null;
  scheduledPaymentDate: string | null;
  receiptUrl: string | null;
  receiptFileName: string | null;
}

export const fetchMyFeeStatements = async (): Promise<MyFeeStatement[]> => {
  const res = await api.get("/board-portal/fee-statements");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

// ══════════════════════════════════════════════════════════════
// Board Evaluations (Oct 2026) — "the board member is able to
// evaluate the peer according to each board member... same thing as
// when doing committee eval. When the board member is a chair, the
// tab for chair evaluation should be hidden." Self is one submission;
// Peer and Committee are one submission per target.
// ══════════════════════════════════════════════════════════════

export interface EvaluationRating {
  question: string;
  score: number;
}

export interface EvaluationSubmission {
  _id: string;
  type: "Self" | "Peer" | "Chair" | "Committee";
  targetId: string | null;
  targetName: string;
  committeeId: string | null;
  committeeName: string;
  ratings: EvaluationRating[];
  comment: string;
  submittedAt: string;
}

export interface MyEvaluationCycle {
  _id: string;
  title: string;
  dueDate: string;
  status: "Open" | "Closed";
  createdAt: string;
}

export interface MyEvaluationPeer {
  id: string;
  name: string;
  role: string;
}

export interface MyEvaluationCommittee {
  id: string;
  name: string;
  isChair: boolean;
}

export interface MyEvaluationContext {
  cycle: MyEvaluationCycle | null;
  isChair: boolean;
  reviewerName: string;
  peers: MyEvaluationPeer[];
  chair: { id: string; name: string } | null;
  committees: MyEvaluationCommittee[];
  submissions: {
    self: EvaluationSubmission | null;
    peer: Record<string, EvaluationSubmission>;
    chair: EvaluationSubmission | null;
    committee: Record<string, EvaluationSubmission>;
  };
}

export const fetchMyEvaluationContext =
  async (): Promise<MyEvaluationContext> =>
    unwrap(await api.get("/board-portal/evaluations/context"));

export interface MyEvaluationHistoryRow {
  cycleId: string;
  title: string;
  dueDate: string;
  closedAt: string;
  mySubmissionCount: number;
  myTypes: string[];
}

export const fetchMyEvaluationHistory = async (): Promise<
  MyEvaluationHistoryRow[]
> => {
  const res = await api.get("/board-portal/evaluations/history");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export interface SubmitEvaluationDto {
  ratings: EvaluationRating[];
  comment?: string;
}

export const submitMySelfEvaluation = async (
  cycleId: string,
  dto: SubmitEvaluationDto,
): Promise<EvaluationSubmission> =>
  unwrap(await api.post(`/board-portal/evaluations/${cycleId}/self`, dto));

export const submitMyPeerEvaluation = async (
  cycleId: string,
  targetId: string,
  dto: SubmitEvaluationDto,
): Promise<EvaluationSubmission> =>
  unwrap(
    await api.post(
      `/board-portal/evaluations/${cycleId}/peer/${targetId}`,
      dto,
    ),
  );

export const submitMyChairEvaluation = async (
  cycleId: string,
  dto: SubmitEvaluationDto,
): Promise<EvaluationSubmission> =>
  unwrap(await api.post(`/board-portal/evaluations/${cycleId}/chair`, dto));

export const submitMyCommitteeEvaluation = async (
  cycleId: string,
  committeeId: string,
  dto: SubmitEvaluationDto,
): Promise<EvaluationSubmission> =>
  unwrap(
    await api.post(
      `/board-portal/evaluations/${cycleId}/committee/${committeeId}`,
      dto,
    ),
  );

// ══════════════════════════════════════════════════════════════
// Newsletters — the Newsletters & Updates page, now reading real
// campaigns sent by the tenant from CRM Tools' Newsletter feature
// (Segment audience = Board Member) instead of mock data. Per
// newsletter.controller.ts's BoardPortalNewsletterController.
// ══════════════════════════════════════════════════════════════

export interface MyNewsletterEvent {
  title: string;
  dateTime: string;
  location: string;
  rsvp: boolean;
}

export interface MyNewsletter {
  _id: string;
  name: string;
  type: "Newsletter" | "Event invite";
  subject: string;
  body: string; // HTML
  event: MyNewsletterEvent | null;
  sentAt: string;
  opened: boolean;
}

export const fetchMyNewsletters = async (): Promise<MyNewsletter[]> => {
  const res = await api.get("/board-portal/newsletters");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const fetchMyNewsletter = async (id: string): Promise<MyNewsletter> => {
  const res = await api.get(`/board-portal/newsletters/${id}`);
  return unwrap(res);
};
