import { api } from "../api";

export type BoardMemberRole =
  | "Chair"
  | "Vice-Chair"
  | "Executive Director"
  | "Non-Executive Director"
  | "Independent Director";

export interface ConflictDisclosure {
  note: string;
  disclosedAt: string;
}

export interface TrainingRecord {
  title: string;
  completedAt: string;
}

export interface BoardMember {
  _id: string;
  name: string;
  role: BoardMemberRole;
  email: string;
  appointedAt: string;
  termEnds: string;
  bio: string;
  successorId: { _id: string; name: string; role: string } | string | null;
  conflicts: ConflictDisclosure[];
  training: TrainingRecord[];
  isActive: boolean;
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
export type MeetingStatus = "Draft" | "Sent" | "Held";

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
}): Promise<BoardMember> => {
  const res = await api.post("/grc/governance/board-members", dto);
  return res.data?.data ?? res.data;
};

export const recordConflict = async (
  id: string,
  note: string,
): Promise<BoardMember> => {
  const res = await api.post(`/grc/governance/board-members/${id}/conflicts`, {
    note,
  });
  return res.data?.data ?? res.data;
};

export const logTraining = async (
  id: string,
  title: string,
): Promise<BoardMember> => {
  const res = await api.post(`/grc/governance/board-members/${id}/training`, {
    title,
  });
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
