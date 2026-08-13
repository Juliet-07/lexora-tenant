import { api } from "../api";

export type AdrType =
  | "Mediation"
  | "Arbitration"
  | "Conciliation"
  | "Expert determination";
export type AdrStage =
  | "Intake"
  | "Appointment"
  | "Sessions"
  | "Settlement"
  | "Award / Outcome"
  | "Closed";
export type SessionMode = "Physical" | "Virtual";

export const ADR_STAGES: AdrStage[] = [
  "Intake",
  "Appointment",
  "Sessions",
  "Settlement",
  "Award / Outcome",
  "Closed",
];
export const ADR_TYPES: AdrType[] = [
  "Mediation",
  "Arbitration",
  "Conciliation",
  "Expert determination",
];

export interface AdrSession {
  date: string;
  mode: SessionMode;
  venue: string;
  outcome: string;
}

export interface AdrSettlement {
  amount: number;
  date: string;
  terms: string;
}

export interface AdrCase {
  _id: string;
  ref: string;
  title: string;
  type: AdrType;
  parties: string[];
  neutralUserId: string | null;
  neutral: string;
  stage: AdrStage;
  claimValue: number;
  currency: string;
  filedOn: string;
  sessions: AdrSession[];
  settlement: AdrSettlement | null;
  outcome: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdrCasePayload {
  title: string;
  type: AdrType;
  parties: string[];
  neutralUserId?: string;
  neutral: string;
  claimValue?: number;
  currency?: string;
}

const unwrap = (res: any) => res.data?.data ?? res.data;

export const fetchAdrCases = async (): Promise<AdrCase[]> => {
  const res = await api.get("/crm/adr-cases");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const createAdrCase = async (
  dto: CreateAdrCasePayload,
): Promise<AdrCase> => {
  const res = await api.post("/crm/adr-cases", dto);
  return unwrap(res);
};

export const setAdrStage = async (
  id: string,
  stage: AdrStage,
): Promise<AdrCase> => {
  const res = await api.patch(`/crm/adr-cases/${id}/stage`, { stage });
  return unwrap(res);
};

export const addAdrSession = async (
  id: string,
  session: {
    date: string;
    mode: SessionMode;
    venue?: string;
    outcome?: string;
  },
): Promise<AdrCase> => {
  const res = await api.post(`/crm/adr-cases/${id}/sessions`, session);
  return unwrap(res);
};

export const recordAdrSettlement = async (
  id: string,
  amount: number,
  terms?: string,
): Promise<AdrCase> => {
  const res = await api.post(`/crm/adr-cases/${id}/settlement`, {
    amount,
    terms,
  });
  return unwrap(res);
};

export const recordAdrOutcome = async (
  id: string,
  outcome: string,
): Promise<AdrCase> => {
  const res = await api.post(`/crm/adr-cases/${id}/outcome`, { outcome });
  return unwrap(res);
};
