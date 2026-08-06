import { api } from "../api";
import { DEAL_STAGES } from "../grc/deals-api";

export type BlendConfidence = "High" | "Medium" | "Low";
export type MethodKey = "DCF" | "Comparables" | "Precedents" | "NAV" | "DDM";
export const METHOD_KEYS: MethodKey[] = [
  "DCF",
  "Comparables",
  "Precedents",
  "NAV",
  "DDM",
];

export interface DCFAssumptions {
  baseRevenue: number;
  growthRate: number;
  ebitdaMargin: number;
  taxRate: number;
  daPct: number;
  capexPct: number;
  wcPct: number;
  wacc: number;
  terminalGrowth: number;
  netDebt: number;
  sharesOutstanding: number;
}
export interface CompRow {
  company: string;
  country: string;
  sector: string;
  marketCap: number;
  revenue: number;
  ebitda: number;
}
export interface PrecedentRow {
  target: string;
  acquirer: string;
  year: number;
  value: number;
  revenue: number;
  ebitda: number;
  sector: string;
}
export interface NavInputs {
  bookAssets: number;
  ppeUplift: number;
  intangibleWriteDown: number;
  liabilities: number;
}
export interface DdmInputs {
  dividend: number;
  growth: number;
  requiredReturn: number;
}
export interface MethodBlendEntry {
  weight: number;
  rationale: string;
  confidence: BlendConfidence;
  enabled: boolean;
}
export interface ValuationHistoryEntry {
  version: number;
  at: string;
  change: string;
  blendedEv: number;
}

export interface Valuation {
  _id: string;
  currency: string;
  advisor: string;
  createdAt: string;
  updatedAt: string;
  dcf: DCFAssumptions;
  comps: CompRow[];
  privateDiscount: number;
  precedents: PrecedentRow[];
  nav: NavInputs;
  ddm: DdmInputs;
  blend: Record<MethodKey, MethodBlendEntry>;
  history: ValuationHistoryEntry[];
  // Server-computed, authoritative — refreshed after every mutation.
  dcfResult: any;
  compsResult: any;
  precedentsResult: any;
  navResult: any;
  ddmResult: any;
  blendResult: any;
}

export const fetchValuations = async (): Promise<Valuation[]> => {
  const res = await api.get("/deal-intel/valuations");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};
export const createValuation = async (): Promise<Valuation> => {
  const res = await api.post("/deal-intel/valuations");
  return res.data?.data ?? res.data;
};
export const updateDcf = async (
  id: string,
  dto: Partial<DCFAssumptions>,
): Promise<Valuation> => {
  const res = await api.patch(`/deal-intel/valuations/${id}/dcf`, dto);
  return res.data?.data ?? res.data;
};
export const addComp = async (
  id: string,
  dto: Omit<CompRow, never>,
): Promise<Valuation> => {
  const res = await api.post(`/deal-intel/valuations/${id}/comps`, dto);
  return res.data?.data ?? res.data;
};
export const removeComp = async (
  id: string,
  index: number,
): Promise<Valuation> => {
  const res = await api.delete(`/deal-intel/valuations/${id}/comps/${index}`);
  return res.data?.data ?? res.data;
};
export const updatePrivateDiscount = async (
  id: string,
  privateDiscount: number,
): Promise<Valuation> => {
  const res = await api.patch(`/deal-intel/valuations/${id}/private-discount`, {
    privateDiscount,
  });
  return res.data?.data ?? res.data;
};
export const addPrecedent = async (
  id: string,
  dto: Omit<PrecedentRow, never>,
): Promise<Valuation> => {
  const res = await api.post(`/deal-intel/valuations/${id}/precedents`, dto);
  return res.data?.data ?? res.data;
};
export const removePrecedent = async (
  id: string,
  index: number,
): Promise<Valuation> => {
  const res = await api.delete(
    `/deal-intel/valuations/${id}/precedents/${index}`,
  );
  return res.data?.data ?? res.data;
};
export const updateNav = async (
  id: string,
  dto: Partial<NavInputs>,
): Promise<Valuation> => {
  const res = await api.patch(`/deal-intel/valuations/${id}/nav`, dto);
  return res.data?.data ?? res.data;
};
export const updateDdm = async (
  id: string,
  dto: Partial<DdmInputs>,
): Promise<Valuation> => {
  const res = await api.patch(`/deal-intel/valuations/${id}/ddm`, dto);
  return res.data?.data ?? res.data;
};
export const updateBlendEntry = async (
  id: string,
  method: MethodKey,
  dto: Partial<MethodBlendEntry>,
): Promise<Valuation> => {
  const res = await api.patch(
    `/deal-intel/valuations/${id}/blend/${method}`,
    dto,
  );
  return res.data?.data ?? res.data;
};
export const snapshotVersion = async (id: string): Promise<Valuation> => {
  const res = await api.post(`/deal-intel/valuations/${id}/snapshot`);
  return res.data?.data ?? res.data;
};
export const downloadValuationReport = (id: string): void => {
  const token = localStorage.getItem("tenantToken");
  const base = (import.meta.env.VITE_REACT_APP_BASE_URL ?? "").replace(
    /\/api\/?$/,
    "",
  );
  fetch(`${base}/api/deal-intel/valuations/${id}/report`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.blob())
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "Valuation Report.pdf";
      a.click();
      URL.revokeObjectURL(a.href);
    });
};

// PORTFOLIO
export interface ScenarioDeal {
  name: string;
  sector: string;
  stage: string;
  value: number;
  feeRate: number;
}
export interface PortfolioSettings {
  concentrationThreshold: number;
  feeRecoveryTarget: number;
  defaultFeeRate: number;
}
export interface PortfolioScenario {
  enabled: boolean;
  added: ScenarioDeal[];
  removedDealIds: string[];
  valueOverrides: Record<string, number>;
}

export interface PDeal {
  id: string;
  name: string;
  sector: string;
  stage: string;
  value: number;
  feeRate: number;
  feeRecovered: number;
  hypothetical: boolean;
  durationDays: number;
  won: boolean;
  lost: boolean;
}
export interface SectorMetric {
  key: string;
  count: number;
  value: number;
  fees: number;
  share: number;
  recovery: number;
}
export interface Metrics {
  total: number;
  max: number;
  count: number;
  bySector: SectorMetric[];
  largest: PDeal | null;
  largestShare: number;
  winRate: number;
  fees: number;
  avgFee: number;
  avgDuration: number;
  feeRecovery: number;
  topSectorShare: number;
  alerts: string[];
}

export interface PortfolioResponse {
  settings: PortfolioSettings;
  scenario: PortfolioScenario;
  liveDeals: PDeal[];
  effectiveDeals: PDeal[];
  liveMetrics: Metrics;
  metrics: Metrics;
}

export const fetchPortfolio = async (): Promise<PortfolioResponse> => {
  const res = await api.get("/deal-intel/portfolio");
  return res.data?.data ?? res.data;
};
export const updatePortfolioSettings = async (
  dto: Partial<PortfolioSettings>,
): Promise<PortfolioResponse> => {
  const res = await api.patch("/deal-intel/portfolio/settings", dto);
  return res.data?.data ?? res.data;
};
export const setScenarioEnabled = async (
  enabled: boolean,
): Promise<PortfolioResponse> => {
  const res = await api.patch("/deal-intel/portfolio/scenario/enabled", {
    enabled,
  });
  return res.data?.data ?? res.data;
};
export const resetScenario = async (): Promise<PortfolioResponse> => {
  const res = await api.post("/deal-intel/portfolio/scenario/reset");
  return res.data?.data ?? res.data;
};
export const addScenarioDeal = async (
  dto: ScenarioDeal,
): Promise<PortfolioResponse> => {
  const res = await api.post("/deal-intel/portfolio/scenario/deals", dto);
  return res.data?.data ?? res.data;
};
export const removeScenarioDeal = async (
  index: number,
): Promise<PortfolioResponse> => {
  const res = await api.delete(`/deal-intel/portfolio/scenario/deals/${index}`);
  return res.data?.data ?? res.data;
};
export const toggleRemovedDeal = async (
  dealId: string,
): Promise<PortfolioResponse> => {
  const res = await api.patch(
    `/deal-intel/portfolio/scenario/toggle-removed/${dealId}`,
  );
  return res.data?.data ?? res.data;
};
export const setValueOverride = async (
  dealId: string,
  value: number,
): Promise<PortfolioResponse> => {
  const res = await api.patch(
    `/deal-intel/portfolio/scenario/value-override/${dealId}`,
    { value },
  );
  return res.data?.data ?? res.data;
};

// READINESS
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
  "Financial Statements": "Manual — no connected accounting engine yet",
  "Legal & Regulatory Compliance": "GRC → Compliance obligations",
  "Tax Compliance": "GRC → Compliance obligations (RRA)",
  "Operational & Commercial": "Manual — no connected CRM/PM data yet",
  "Management Team & HR":
    "HR module (contracts, onboarding, performance reviews)",
  "ESG & Sustainability": "Manual — no connected ESG register yet",
  "Data Room Completeness":
    "Manual — Deals data room is per-transaction, not company-wide",
};

export type ComputeMode = "auto" | "manual";
export const DIMENSION_COMPUTE_MODE: Record<ReadinessDimension, ComputeMode> = {
  "Corporate Structure & Governance": "auto",
  "Financial Statements": "manual",
  "Legal & Regulatory Compliance": "auto",
  "Tax Compliance": "auto",
  "Operational & Commercial": "manual",
  "Management Team & HR": "auto",
  "ESG & Sustainability": "manual",
  "Data Room Completeness": "manual",
};

export type GapPriority = "P1" | "P2" | "P3";
export type GapStatus = "Open" | "In progress" | "Closed";
export type ReportSectionState = "Auto" | "Review" | "Incomplete";
export const REPORT_SECTIONS = [
  "Executive summary",
  "Company overview",
  "Governance",
  "Financials",
  "Compliance",
  "Tax",
  "ESG",
  "Key risks",
  "Remediation plan",
];

export interface DimensionScore {
  dimension: ReadinessDimension;
  computeMode: ComputeMode;
  autoScore: number;
  override: number | null;
  overrideReason: string | null;
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
  closedAt: string | null;
}
export interface ReportSectionFlag {
  name: string;
  state: ReportSectionState;
}
export interface ReadinessBand {
  label: string;
  tone: string;
}

export interface ReadinessAssessment {
  _id: string;
  company: string;
  version: number;
  createdAt: string;
  advisor: string;
  threshold: number;
  scores: DimensionScore[];
  gaps: ReadinessGap[];
  reportSections: ReportSectionFlag[];
  notes: string;
  // Server-computed, authoritative — refreshed after every mutation.
  overallScore: number;
  band: ReadinessBand;
  projectedReadyDate: string;
  gapsClosed: number;
  gapsOpen: number;
}

export function effectiveScore(d: DimensionScore): number {
  return d.override ?? d.autoScore;
}

export const fetchAssessments = async (): Promise<ReadinessAssessment[]> => {
  const res = await api.get("/deal-intel/readiness");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};
export const createAssessment = async (
  advisor?: string,
): Promise<ReadinessAssessment> => {
  const res = await api.post(
    "/deal-intel/readiness",
    advisor ? { advisor } : {},
  );
  return res.data?.data ?? res.data;
};
export const updateReadinessThreshold = async (
  id: string,
  threshold: number,
): Promise<ReadinessAssessment> => {
  const res = await api.patch(`/deal-intel/readiness/${id}/threshold`, {
    threshold,
  });
  return res.data?.data ?? res.data;
};
export const setDimensionOverride = async (
  id: string,
  dimension: ReadinessDimension,
  value: number,
  reason: string,
): Promise<ReadinessAssessment> => {
  const res = await api.patch(`/deal-intel/readiness/${id}/override`, {
    dimension,
    value,
    reason,
  });
  return res.data?.data ?? res.data;
};
export const clearDimensionOverride = async (
  id: string,
  dimension: ReadinessDimension,
): Promise<ReadinessAssessment> => {
  const res = await api.post(`/deal-intel/readiness/${id}/override/clear`, {
    dimension,
  });
  return res.data?.data ?? res.data;
};
export const recomputeAutoScores = async (
  id: string,
): Promise<ReadinessAssessment> => {
  const res = await api.post(`/deal-intel/readiness/${id}/recompute`);
  return res.data?.data ?? res.data;
};
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
): Promise<ReadinessAssessment> => {
  const res = await api.post(`/deal-intel/readiness/${id}/gaps`, dto);
  return res.data?.data ?? res.data;
};
export const setGapStatus = async (
  id: string,
  gapId: string,
  status: GapStatus,
): Promise<ReadinessAssessment> => {
  const res = await api.patch(
    `/deal-intel/readiness/${id}/gaps/${gapId}/status`,
    { status },
  );
  return res.data?.data ?? res.data;
};
export const deleteGap = async (
  id: string,
  gapId: string,
): Promise<ReadinessAssessment> => {
  const res = await api.delete(`/deal-intel/readiness/${id}/gaps/${gapId}`);
  return res.data?.data ?? res.data;
};
export const setReportSection = async (
  id: string,
  name: string,
  state: ReportSectionState,
): Promise<ReadinessAssessment> => {
  const res = await api.patch(`/deal-intel/readiness/${id}/report-sections`, {
    name,
    state,
  });
  return res.data?.data ?? res.data;
};
export const updateReadinessNotes = async (
  id: string,
  notes: string,
): Promise<ReadinessAssessment> => {
  const res = await api.patch(`/deal-intel/readiness/${id}/notes`, { notes });
  return res.data?.data ?? res.data;
};
export const downloadReadinessReport = (id: string): void => {
  const token = localStorage.getItem("tenantToken");
  const base = (import.meta.env.VITE_REACT_APP_BASE_URL ?? "").replace(
    /\/api\/?$/,
    "",
  );
  fetch(`${base}/api/deal-intel/readiness/${id}/report`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.blob())
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "Investor Readiness Report.pdf";
      a.click();
      URL.revokeObjectURL(a.href);
    });
};

export { DEAL_STAGES };
