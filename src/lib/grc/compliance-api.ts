import { api } from "../api";

export type Regulator =
  | "BNR"
  | "RRA"
  | "RSSB"
  | "CMA"
  | "FIU"
  | "NCSA"
  | "MIFOTRA"
  | "RDB"
  | "Sector-specific";
export type Frequency =
  | "Annual"
  | "Quarterly"
  | "Monthly"
  | "Ad hoc"
  | "Event-driven";
export type ObligationStatus =
  | "Compliant"
  | "Due"
  | "Overdue"
  | "Not Applicable";
export type FilingStage =
  | "Not started"
  | "In preparation"
  | "Evidence collected"
  | "Certified"
  | "Submitted"
  | "Receipt confirmed";

export const REGULATORS: Regulator[] = [
  "BNR",
  "RRA",
  "RSSB",
  "CMA",
  "FIU",
  "NCSA",
  "MIFOTRA",
  "RDB",
  "Sector-specific",
];
export const FREQUENCIES: Frequency[] = [
  "Annual",
  "Quarterly",
  "Monthly",
  "Ad hoc",
  "Event-driven",
];
export const FILING_STAGES: FilingStage[] = [
  "Not started",
  "In preparation",
  "Evidence collected",
  "Certified",
  "Submitted",
  "Receipt confirmed",
];

export const daysUntil = (dateStr: string): number => {
  const d = new Date(dateStr + "T00:00:00").getTime();
  const t = new Date(todayStr() + "T00:00:00").getTime();
  return Math.round((d - t) / 86400000);
};
export const todayStr = (): string => new Date().toISOString().slice(0, 10);

const GRC_API_BASE = (api.defaults as any)?.baseURL ?? "/api";
export const resolveComplianceFileUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith("http")) return url;
  return `${new URL(GRC_API_BASE).origin}${url}`;
};

export interface FilingEvidence {
  name: string;
  fileUrl: string | null;
  mimeType: string | null;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface Filing {
  _id: string;
  obligationId: string;
  periodLabel: string;
  dueDate: string;
  stage: FilingStage;
  evidence: FilingEvidence[];
  certifiedBy: string | null;
  certifiedAt: string | null;
  submittedAt: string | null;
  receiptRef: string | null;
}

export interface ComplianceObligation {
  _id: string;
  reference: string;
  title: string;
  regulator: Regulator;
  entity: string;
  description: string;
  legalBasis: string;
  frequency: Frequency;
  nextDueDate: string;
  evidenceRequirements: string;
  owner: string;
  ownerEmail: string;
  certifier: string;
  reminderDays: number[];
  status: ObligationStatus;
  createdAt: string;
  // Computed server-side, never re-derived on the client.
  computedStatus: ObligationStatus;
  activeReminderDays: number | null;
}

export const fetchObligations = async (): Promise<ComplianceObligation[]> => {
  const res = await api.get("/grc/compliance/obligations");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createObligation = async (dto: {
  title: string;
  regulator: Regulator;
  entity?: string;
  description?: string;
  legalBasis?: string;
  frequency: Frequency;
  nextDueDate: string;
  evidenceRequirements?: string;
  owner?: string;
  certifier?: string;
}): Promise<ComplianceObligation> => {
  const res = await api.post("/grc/compliance/obligations", dto);
  return res.data?.data ?? res.data;
};

export const fetchFilings = async (): Promise<Filing[]> => {
  const res = await api.get("/grc/compliance/obligations/filings");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const setFilingStage = async (
  id: string,
  stage: "In preparation" | "Evidence collected",
): Promise<Filing> => {
  const res = await api.patch(
    `/grc/compliance/obligations/filings/${id}/stage`,
    { stage },
  );
  return res.data?.data ?? res.data;
};

export const addFilingEvidence = async (
  id: string,
  files: File[],
): Promise<Filing> => {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  const res = await api.post(
    `/grc/compliance/obligations/filings/${id}/evidence`,
    form,
  );
  return res.data?.data ?? res.data;
};

export const certifyFiling = async (
  id: string,
  certifiedBy: string,
): Promise<Filing> => {
  const res = await api.patch(
    `/grc/compliance/obligations/filings/${id}/certify`,
    { certifiedBy },
  );
  return res.data?.data ?? res.data;
};

export const confirmFilingReceipt = async (
  id: string,
  receiptRef: string,
): Promise<{ filing: Filing; obligation: ComplianceObligation }> => {
  const res = await api.patch(
    `/grc/compliance/obligations/filings/${id}/confirm-receipt`,
    { receiptRef },
  );
  return res.data?.data ?? res.data;
};
