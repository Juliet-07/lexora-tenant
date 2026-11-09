import { api } from "../api";

export type ReadinessDimension =
  | "Corporate Structure & Governance"
  | "Financial Statements"
  | "Legal & Regulatory Compliance"
  | "Tax Compliance"
  | "Operational & Commercial"
  | "Management Team & HR"
  | "ESG & Sustainability"
  | "Data Room Completeness";

export const READINESS_DIMENSIONS: ReadinessDimension[] = [
  "Corporate Structure & Governance",
  "Financial Statements",
  "Legal & Regulatory Compliance",
  "Tax Compliance",
  "Operational & Commercial",
  "Management Team & HR",
  "ESG & Sustainability",
  "Data Room Completeness",
];

export const DIMENSION_SOURCE: Record<ReadinessDimension, string> = {
  "Corporate Structure & Governance":
    "GRC → Governance (board, committees, codes, meetings)",
  "Financial Statements":
    "Finance → Accounting (period close, balance sheet, reconciliations)",
  "Legal & Regulatory Compliance": "GRC → Compliance obligations, IP register",
  "Tax Compliance": "Finance → Tax (returns filed on time)",
  "Operational & Commercial": "CRM → Mandates, Finance → Invoicing",
  "Management Team & HR": "HR → Contracts, reviews, organisation chart",
  "ESG & Sustainability": "GRC → ESG dashboard",
  "Data Room Completeness": "This page → Data room checklist",
};

export const DIMENSION_SHORT: Record<ReadinessDimension, string> = {
  "Corporate Structure & Governance": "Governance",
  "Financial Statements": "Financial",
  "Legal & Regulatory Compliance": "Legal",
  "Tax Compliance": "Tax",
  "Operational & Commercial": "Commercial",
  "Management Team & HR": "Team & HR",
  "ESG & Sustainability": "ESG",
  "Data Room Completeness": "Data room",
};

export type ComputeMode = "auto" | "manual";
export type GapPriority = "P1" | "P2" | "P3";
export type GapStatus = "Open" | "In progress" | "Closed" | "Risk accepted";
export type ReportSectionState = "Auto" | "Review" | "Incomplete" | "Approved";
export type ReportStatus =
  | "Draft"
  | "Internal review"
  | "Advisor review"
  | "Final";
export const REPORT_STATUSES: ReportStatus[] = [
  "Draft",
  "Internal review",
  "Advisor review",
  "Final",
];

export type DealType =
  | "equity"
  | "debt"
  | "grant"
  | "strategic"
  | "ipo"
  | "general";
export type InvestorType = "dfi" | "vc" | "pe" | "bank" | "strategic" | "mixed";

export const DEAL_TYPE_LABEL: Record<DealType, string> = {
  equity: "Equity raise (new shares)",
  debt: "Debt facility / credit line",
  grant: "Grant or concessional funding",
  strategic: "Strategic sale or merger",
  ipo: "IPO / listing readiness",
  general: "General readiness (no active deal)",
};
export const INVESTOR_TYPE_LABEL: Record<InvestorType, string> = {
  dfi: "DFI / Impact investor",
  vc: "Venture capital / Angel",
  pe: "Private equity / Growth",
  bank: "Bank / Credit institution",
  strategic: "Strategic / Corporate",
  mixed: "Mixed / Multiple",
};

// Mirrors the engine's presets so the wizard can preview the weights an
// investor type produces before anything is created. The engine applies
// its own copy when it creates the assessment.
const W = (
  gov: number,
  fin: number,
  legal: number,
  tax: number,
  com: number,
  team: number,
  esg: number,
  dr: number,
): Record<ReadinessDimension, number> => ({
  "Corporate Structure & Governance": gov,
  "Financial Statements": fin,
  "Legal & Regulatory Compliance": legal,
  "Tax Compliance": tax,
  "Operational & Commercial": com,
  "Management Team & HR": team,
  "ESG & Sustainability": esg,
  "Data Room Completeness": dr,
});
export const INVESTOR_WEIGHT_PRESETS: Record<
  InvestorType,
  Record<ReadinessDimension, number>
> = {
  mixed: W(15, 18, 14, 10, 15, 10, 8, 10),
  dfi: W(18, 16, 14, 10, 12, 8, 14, 8),
  vc: W(10, 18, 10, 7, 25, 14, 4, 12),
  pe: W(14, 22, 14, 10, 18, 8, 4, 10),
  bank: W(10, 28, 14, 14, 14, 6, 4, 10),
  strategic: W(12, 16, 16, 10, 18, 10, 6, 12),
};

export interface DimensionScore {
  dimension: ReadinessDimension;
  computeMode: ComputeMode;
  autoScore: number;
  override: number | null;
  overrideReason: string | null;
  // Added by the server
  effective: number;
  weight: number | null;
}

export interface ReadinessIndicator {
  dimension: ReadinessDimension;
  key: string;
  label: string;
  weight: number;
  floor: number;
  target: number;
  unit: "%" | "x";
  value: number | null;
  autoValue: number | null;
  note: string;
  // Added by the server
  effectiveValue: number | null;
  score: number;
  source: "manual" | "auto" | "none";
}

export interface ReadinessGap {
  _id: string;
  dimension: ReadinessDimension;
  priority: GapPriority;
  description: string;
  impact: string;
  remediation: string;
  owner: string;
  targetDate: string;
  status: GapStatus;
  source?: "manual" | "score";
  closedAt: string | null;
}

export interface ReportSectionFlag {
  name: string;
  state: ReportSectionState;
  owner: string;
  content: string;
  updatedAt: string | null;
}

export interface ReadinessBand {
  label: string;
  tone: string;
}

export interface DealContext {
  dealType: DealType;
  investorType: InvestorType;
  raiseAmount: number;
  currency: string;
  targetClose: string | null;
  useOfFunds: string;
}

export interface ReadinessAssessment {
  _id: string;
  company: string;
  title: string;
  version: number;
  createdAt: string;
  advisor: string;
  threshold: number;
  mode: "indicators" | "legacy";
  dealContext: DealContext;
  weights: { dimension: ReadinessDimension; weight: number }[];
  indicators: ReadinessIndicator[];
  scores: DimensionScore[];
  gaps: ReadinessGap[];
  reportSections: ReportSectionFlag[];
  reportStatus: ReportStatus;
  confidentiality: string;
  versionNotes: string;
  notes: string;
  // Server-computed, authoritative — refreshed after every mutation.
  overallScore: number;
  band: ReadinessBand;
  projectedReadyDate: string;
  gapsClosed: number;
  gapsOpen: number;
  gapsAccepted: number;
  dimensionsBelowThreshold: number;
}

export function effectiveScore(d: DimensionScore): number {
  return d.override ?? d.autoScore;
}

export interface CreateAssessmentInput {
  advisor?: string;
  title?: string;
  dealContext?: Partial<
    Omit<DealContext, "targetClose"> & { targetClose: string | null }
  >;
  weights?: { dimension: ReadinessDimension; weight: number }[];
}

const unwrap = <T>(res: any): T => res.data?.data ?? res.data;
const base = "/deal-intel/readiness";

export const fetchAssessments = async (): Promise<ReadinessAssessment[]> => {
  const d = unwrap<ReadinessAssessment[]>(await api.get(base));
  return Array.isArray(d) ? d : [];
};
export const createAssessment = async (
  input: CreateAssessmentInput = {},
): Promise<ReadinessAssessment> => unwrap(await api.post(base, input));
export const updateAssessmentContext = async (
  id: string,
  dto: {
    title?: string;
    advisor?: string;
    dealContext?: CreateAssessmentInput["dealContext"];
  },
): Promise<ReadinessAssessment> =>
  unwrap(await api.patch(`${base}/${id}/context`, dto));
export const updateAssessmentWeights = async (
  id: string,
  weights: { dimension: ReadinessDimension; weight: number }[],
): Promise<ReadinessAssessment> =>
  unwrap(await api.patch(`${base}/${id}/weights`, { weights }));
export const setIndicator = async (
  id: string,
  dto: { key: string; value?: number | null; note?: string },
): Promise<ReadinessAssessment> =>
  unwrap(await api.patch(`${base}/${id}/indicators`, dto));
export const updateReadinessThreshold = async (
  id: string,
  threshold: number,
): Promise<ReadinessAssessment> =>
  unwrap(await api.patch(`${base}/${id}/threshold`, { threshold }));
export const setDimensionOverride = async (
  id: string,
  dimension: ReadinessDimension,
  value: number,
  reason: string,
): Promise<ReadinessAssessment> =>
  unwrap(
    await api.patch(`${base}/${id}/override`, { dimension, value, reason }),
  );
export const clearDimensionOverride = async (
  id: string,
  dimension: ReadinessDimension,
): Promise<ReadinessAssessment> =>
  unwrap(await api.post(`${base}/${id}/override/clear`, { dimension }));
export const recomputeAutoScores = async (
  id: string,
): Promise<ReadinessAssessment> =>
  unwrap(await api.post(`${base}/${id}/recompute`));
export const addReadinessGap = async (
  id: string,
  dto: {
    dimension: ReadinessDimension;
    priority: GapPriority;
    description: string;
    impact?: string;
    remediation?: string;
    owner?: string;
    targetDate: string;
  },
): Promise<ReadinessAssessment> =>
  unwrap(await api.post(`${base}/${id}/gaps`, dto));
export const generateGaps = async (
  id: string,
): Promise<ReadinessAssessment & { created: number }> =>
  unwrap(await api.post(`${base}/${id}/gaps/generate`));
export const updateGap = async (
  id: string,
  gapId: string,
  dto: Partial<
    Pick<
      ReadinessGap,
      | "priority"
      | "description"
      | "impact"
      | "remediation"
      | "owner"
      | "targetDate"
    >
  >,
): Promise<ReadinessAssessment> =>
  unwrap(await api.patch(`${base}/${id}/gaps/${gapId}`, dto));
export const setGapStatus = async (
  id: string,
  gapId: string,
  status: GapStatus,
): Promise<ReadinessAssessment> =>
  unwrap(await api.patch(`${base}/${id}/gaps/${gapId}/status`, { status }));
export const deleteGap = async (
  id: string,
  gapId: string,
): Promise<ReadinessAssessment> =>
  unwrap(await api.delete(`${base}/${id}/gaps/${gapId}`));
export const updateReportMeta = async (
  id: string,
  dto: {
    reportStatus?: ReportStatus;
    confidentiality?: string;
    versionNotes?: string;
  },
): Promise<ReadinessAssessment> =>
  unwrap(await api.patch(`${base}/${id}/report`, dto));
export const updateReportSection = async (
  id: string,
  dto: {
    name: string;
    content?: string;
    owner?: string;
    state?: ReportSectionState;
  },
): Promise<ReadinessAssessment> =>
  unwrap(await api.patch(`${base}/${id}/sections`, dto));
export const redraftReportSection = async (
  id: string,
  name: string,
): Promise<ReadinessAssessment> =>
  unwrap(await api.post(`${base}/${id}/sections/redraft`, { name }));
export const updateReadinessNotes = async (
  id: string,
  notes: string,
): Promise<ReadinessAssessment> =>
  unwrap(await api.patch(`${base}/${id}/notes`, { notes }));

// Authenticated file downloads (the PDF/DOCX/ZIP need the bearer token, so
// a plain link won't do).
export async function downloadAuthFile(
  path: string,
  filename: string,
): Promise<void> {
  const res = await api.get(path, { responseType: "blob" });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
export const downloadReadinessReport = (id: string) =>
  downloadAuthFile(`${base}/${id}/report`, "Investor Readiness Report.pdf");
export const downloadReadinessReportDocx = (id: string) =>
  downloadAuthFile(
    `${base}/${id}/report.docx`,
    "Investor Readiness Report.docx",
  );

// ── Scoring helpers shared by the page ───────────────────────

export function scoreColor(s: number): string {
  return s >= 80
    ? "text-emerald-600"
    : s >= 60
      ? "text-amber-600"
      : "text-rose-600";
}
export function scoreBar(s: number): string {
  return s >= 80 ? "bg-emerald-500" : s >= 60 ? "bg-amber-500" : "bg-rose-500";
}
export function fmtIndicator(v: number | null, unit: "%" | "x"): string {
  if (v === null || v === undefined) return "No data";
  return unit === "x" ? `${v.toFixed(1)}x` : `${Math.round(v)}%`;
}
