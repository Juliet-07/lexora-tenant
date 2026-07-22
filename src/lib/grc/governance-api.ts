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
