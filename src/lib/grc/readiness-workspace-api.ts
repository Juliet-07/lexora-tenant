import axios from "axios";
import { api } from "../api";
import { downloadAuthFile } from "./readiness-api";

const base = "/deal-intel/readiness-workspace";
const unwrap = <T>(res: any): T => res.data?.data ?? res.data;

export type RoomStatus =
  "uploaded" | "missing" | "review" | "expired" | "not_applicable";
export const ROOM_STATUS_LABEL: Record<RoomStatus, string> = {
  uploaded: "Uploaded",
  missing: "Missing",
  review: "Under review",
  expired: "Expired",
  not_applicable: "N/A",
};

export interface RoomFile {
  _id: string;
  name: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  version: number;
  uploadedBy: string;
  uploadedAt: string;
}
export interface RoomItem {
  _id: string;
  category: string;
  name: string;
  status: RoomStatus;
  note: string;
  expiresAt: string | null;
  updatedBy: string;
  updatedAt: string | null;
  files: RoomFile[];
  version: number;
}

export type ShareState = "active" | "revoked" | "expired";
export interface RoomShare {
  _id: string;
  token: string;
  kind: "room" | "report";
  investorName: string;
  organisation: string;
  email: string;
  accessLevel: "view" | "download";
  categories: string[];
  nda: "none" | "click" | "on_file";
  ndaAcceptedAt: string | null;
  ndaAcceptedBy: string;
  message: string;
  expiresAt: string;
  status: "active" | "revoked";
  state: ShareState;
  sentAt: string;
  sentBy: string;
  lastViewedAt: string | null;
  views: number;
  downloads: number;
}
export interface ShareLogEntry {
  _id: string;
  shareId: string;
  investorName: string;
  action:
    "sent" | "resent" | "viewed" | "nda_accepted" | "downloaded" | "revoked";
  detail: string;
  at: string;
}

export interface PipelineStage {
  key: string;
  label: string;
}
export interface PipelineInvestor {
  _id: string;
  name: string;
  organisation: string;
  email: string;
  type: string;
  stage: string;
  interest: "high" | "medium" | "low";
  ticketAmount: number;
  ticketCurrency: string;
  firstContact: string;
  lastContact: string;
  ndaSignedAt: string | null;
  notes: string;
  engagement: {
    views: number;
    downloads: number;
    lastView: string | null;
    shares: number;
  };
  questions: number;
}

export interface QaAnswer {
  text: string;
  by: string;
  at: string | null;
  approved: boolean;
  approvedBy: string;
}
export type QaStatus = "open" | "pending_review" | "answered";
export interface InvestorQuestion {
  _id: string;
  question: string;
  investorId: string | null;
  askedBy: string;
  organisation: string;
  category: string;
  priority: "high" | "medium" | "low";
  assignee: string;
  status: QaStatus;
  askedAt: string;
  answer: QaAnswer | null;
}

export type TaskStatus = "open" | "in_progress" | "review" | "closed";
export interface RemediationTask {
  _id: string;
  title: string;
  dimension: string;
  priority: "P1" | "P2" | "P3";
  status: TaskStatus;
  owner: string;
  due: string | null;
  description: string;
  comments: { by: string; text: string; at: string }[];
  closedAt: string | null;
}

export type ActivityType =
  "upload" | "view" | "send" | "task" | "status" | "system";
export interface ActivityEvent {
  _id: string;
  type: ActivityType;
  text: string;
  detail: string;
  by: string;
  at: string;
}

export interface ReadinessWorkspace {
  room: RoomItem[];
  shares: RoomShare[];
  shareLog: ShareLogEntry[];
  investors: PipelineInvestor[];
  questions: InvestorQuestion[];
  tasks: RemediationTask[];
  activity: ActivityEvent[];
  stages: PipelineStage[];
}
export type WorkspaceWithMail = ReadinessWorkspace & {
  emailSent?: boolean;
  shareId?: string;
};

export const fetchWorkspace = async (): Promise<ReadinessWorkspace> =>
  unwrap(await api.get(base));

// Data room
export const updateRoomItem = async (
  id: string,
  dto: {
    status?: RoomStatus;
    note?: string;
    name?: string;
    expiresAt?: string | null;
  },
): Promise<ReadinessWorkspace> =>
  unwrap(await api.patch(`${base}/room/${id}`, dto));
export const addRoomItem = async (dto: {
  category: string;
  name: string;
}): Promise<ReadinessWorkspace> => unwrap(await api.post(`${base}/room`, dto));
export const removeRoomItem = async (id: string): Promise<ReadinessWorkspace> =>
  unwrap(await api.delete(`${base}/room/${id}`));
export const uploadRoomFile = async (
  id: string,
  file: File,
): Promise<ReadinessWorkspace> => {
  const fd = new FormData();
  fd.append("file", file);
  return unwrap(
    await api.post(`${base}/room/${id}/files`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  );
};
export const removeRoomFile = async (
  id: string,
  fileId: string,
): Promise<ReadinessWorkspace> =>
  unwrap(await api.delete(`${base}/room/${id}/files/${fileId}`));
export const attachReportToRoom = async (
  assessmentId: string,
): Promise<ReadinessWorkspace> =>
  unwrap(await api.post(`${base}/room-report`, { assessmentId }));
export const downloadRoomZip = (assessmentId?: string) =>
  downloadAuthFile(
    `${base}/zip${assessmentId ? `?assessmentId=${assessmentId}` : ""}`,
    "Data Room.zip",
  );

// Sharing
export interface CreateShareInput {
  investorName: string;
  organisation?: string;
  email: string;
  investorId?: string;
  accessLevel?: "view" | "download";
  categories?: string[];
  nda?: "none" | "click" | "on_file";
  expiryDays?: number;
  expiresAt?: string;
  message?: string;
  includeReport?: boolean;
}
export const createShare = async (
  dto: CreateShareInput,
): Promise<WorkspaceWithMail> => unwrap(await api.post(`${base}/shares`, dto));
export const sendReportToInvestor = async (dto: {
  investorName: string;
  organisation?: string;
  email: string;
  investorId?: string;
  assessmentId: string;
  message?: string;
}): Promise<WorkspaceWithMail> =>
  unwrap(await api.post(`${base}/report-send`, dto));
export const resendShare = async (id: string): Promise<WorkspaceWithMail> =>
  unwrap(await api.post(`${base}/shares/${id}/resend`));
export const revokeShare = async (id: string): Promise<ReadinessWorkspace> =>
  unwrap(await api.post(`${base}/shares/${id}/revoke`));

// Pipeline
export interface InvestorInput {
  name: string;
  organisation?: string;
  email?: string;
  type?: string;
  stage?: string;
  interest?: "high" | "medium" | "low";
  ticketAmount?: number;
  ticketCurrency?: string;
  notes?: string;
}
export const createInvestor = async (
  dto: InvestorInput,
): Promise<ReadinessWorkspace> =>
  unwrap(await api.post(`${base}/investors`, dto));
export const updateInvestor = async (
  id: string,
  dto: Partial<InvestorInput>,
): Promise<ReadinessWorkspace> =>
  unwrap(await api.patch(`${base}/investors/${id}`, dto));
export const advanceInvestor = async (
  id: string,
): Promise<ReadinessWorkspace> =>
  unwrap(await api.post(`${base}/investors/${id}/advance`));
export const deleteInvestor = async (id: string): Promise<ReadinessWorkspace> =>
  unwrap(await api.delete(`${base}/investors/${id}`));

// Q&A
export const createQuestion = async (dto: {
  question: string;
  investorId?: string;
  askedBy?: string;
  organisation?: string;
  category?: string;
  priority?: "high" | "medium" | "low";
  assignee?: string;
}): Promise<ReadinessWorkspace> =>
  unwrap(await api.post(`${base}/questions`, dto));
export const updateQuestion = async (
  id: string,
  dto: { priority?: string; assignee?: string; category?: string },
): Promise<ReadinessWorkspace> =>
  unwrap(await api.patch(`${base}/questions/${id}`, dto));
export const draftAnswer = async (
  id: string,
  text: string,
): Promise<ReadinessWorkspace> =>
  unwrap(await api.post(`${base}/questions/${id}/answer`, { text }));
export const approveAnswer = async (id: string): Promise<ReadinessWorkspace> =>
  unwrap(await api.post(`${base}/questions/${id}/approve`));
export const reopenQuestion = async (id: string): Promise<ReadinessWorkspace> =>
  unwrap(await api.post(`${base}/questions/${id}/reopen`));
export const deleteQuestion = async (id: string): Promise<ReadinessWorkspace> =>
  unwrap(await api.delete(`${base}/questions/${id}`));

// Remediation tasks
export const createTask = async (dto: {
  title: string;
  dimension?: string;
  priority?: string;
  owner?: string;
  due?: string;
  description?: string;
}): Promise<ReadinessWorkspace> => unwrap(await api.post(`${base}/tasks`, dto));
export const updateTask = async (
  id: string,
  dto: Partial<{
    title: string;
    dimension: string;
    priority: string;
    status: TaskStatus;
    owner: string;
    due: string | null;
    description: string;
  }>,
): Promise<ReadinessWorkspace> =>
  unwrap(await api.patch(`${base}/tasks/${id}`, dto));
export const addTaskComment = async (
  id: string,
  text: string,
): Promise<ReadinessWorkspace> =>
  unwrap(await api.post(`${base}/tasks/${id}/comments`, { text }));
export const deleteTask = async (id: string): Promise<ReadinessWorkspace> =>
  unwrap(await api.delete(`${base}/tasks/${id}`));

// ── Public investor view (no auth) ───────────────────────────

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_REACT_APP_BASE_URL,
});

export interface PublicShareFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  url: string | null;
}
export interface PublicShareView {
  company: string;
  investorName: string;
  message: string;
  accessLevel: "view" | "download";
  nda: "none" | "click" | "on_file";
  ndaAccepted: boolean;
  expiresAt: string;
  state: ShareState;
  categories: {
    category: string;
    items: { name: string; version: number; file: PublicShareFile }[];
  }[];
}
export const fetchPublicShare = async (
  token: string,
): Promise<PublicShareView> =>
  unwrap(await publicApi.get(`/deal-intel/readiness-share/${token}`));
export const acceptPublicNda = async (
  token: string,
  name: string,
): Promise<PublicShareView> =>
  unwrap(
    await publicApi.post(`/deal-intel/readiness-share/${token}/nda`, { name }),
  );
export const requestPublicDownload = async (
  token: string,
  fileId: string,
): Promise<{ url: string; name: string }> =>
  unwrap(
    await publicApi.post(`/deal-intel/readiness-share/${token}/download`, {
      fileId,
    }),
  );
