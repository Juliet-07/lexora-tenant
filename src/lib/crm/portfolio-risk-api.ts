import { api } from "../api";

export type RiskType = "Risk" | "Issue";
export type RiskSeverity = "Critical" | "High" | "Medium" | "Low";
export type RiskStatus =
  | "Open"
  | "Mitigating"
  | "Monitoring"
  | "Escalated"
  | "Closed";

export interface RiskNote {
  _id: string;
  author: string;
  body: string;
  at: string;
}

export interface PortfolioRisk {
  _id: string;
  title: string;
  mandateId: string;
  mandateName: string;
  type: RiskType;
  severity: RiskSeverity;
  owner: string;
  status: RiskStatus;
  impact: string;
  notes: RiskNote[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePortfolioRiskPayload {
  title: string;
  mandateId: string;
  mandateName: string;
  type: RiskType;
  severity: RiskSeverity;
  owner?: string;
  impact?: string;
}

const unwrap = (res: any) => res.data?.data ?? res.data;

export const fetchPortfolioRisks = async (): Promise<PortfolioRisk[]> => {
  const res = await api.get("/crm/portfolio-risks");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const createPortfolioRisk = async (
  dto: CreatePortfolioRiskPayload,
): Promise<PortfolioRisk> => {
  const res = await api.post("/crm/portfolio-risks", dto);
  return unwrap(res);
};

export const setRiskStatus = async (
  id: string,
  status: RiskStatus,
): Promise<PortfolioRisk> => {
  const res = await api.patch(`/crm/portfolio-risks/${id}/status`, { status });
  return unwrap(res);
};

export const escalateRisk = async (id: string): Promise<PortfolioRisk> => {
  const res = await api.post(`/crm/portfolio-risks/${id}/escalate`);
  return unwrap(res);
};

export const addRiskNote = async (
  id: string,
  author: string,
  body: string,
): Promise<PortfolioRisk> => {
  const res = await api.post(`/crm/portfolio-risks/${id}/notes`, {
    author,
    body,
  });
  return unwrap(res);
};
