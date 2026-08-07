import { api } from "../api";

// ─────────────────────────────────────────────────────────────
// Real ESG API client. Replaces the former esgStore.ts prototype
// (localStorage-backed) now that the backend module exists.
// Mirrors the shape of the NestJS DTOs/service responses exactly —
// see src/modules/grc/esg on the backend.
// ─────────────────────────────────────────────────────────────

// ── Shared ───────────────────────────────────────────────────

export const ENV_CATEGORIES = [
  "Carbon",
  "Energy",
  "Water",
  "Waste",
  "Biodiversity",
] as const;
export const SOCIAL_CATEGORIES = [
  "Workforce",
  "Diversity",
  "Health & Safety",
  "Community",
  "Engagement",
  "Equal Pay",
] as const;
export type EnvCategory = (typeof ENV_CATEGORIES)[number];
export type SocialCategory = (typeof SOCIAL_CATEGORIES)[number];
export type MetricCategory = EnvCategory | SocialCategory;

export type EsgPillar = "Environmental" | "Social" | "Governance";
export type MetricPillar = "Environmental" | "Social";
export type Direction = "lower" | "higher";
export type IntensityBasis =
  | "none"
  | "per employee"
  | "per m²"
  | "per revenue unit";

// ── Context ──────────────────────────────────────────────────

export interface PeerAverage {
  environmental: number;
  social: number;
  governance: number;
}
export interface OrgContext {
  _id: string;
  employees: number;
  floorAreaSqm: number;
  revenueMillions: number;
  sector: string;
  peerAverage: PeerAverage;
}
export interface ScoreHistoryEntry {
  _id?: string;
  period: string;
  e: number;
  s: number;
  g: number;
}

export const fetchContext = async (): Promise<OrgContext> => {
  const res = await api.get("/grc/esg/context");
  return res.data?.data ?? res.data;
};
export const updateContext = async (
  dto: Partial<{
    employees: number;
    floorAreaSqm: number;
    revenueMillions: number;
    sector: string;
    peerEnvironmental: number;
    peerSocial: number;
    peerGovernance: number;
  }>,
): Promise<OrgContext> => {
  const res = await api.patch("/grc/esg/context", dto);
  return res.data?.data ?? res.data;
};
export const fetchHistory = async (): Promise<ScoreHistoryEntry[]> => {
  const res = await api.get("/grc/esg/context/history");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

// ── Dashboard ────────────────────────────────────────────────

export interface FrameworkAlignmentRow {
  framework: string;
  frameworkId: string;
  signedOff: number;
  total: number;
  pct: number;
}
export interface DashboardMetric {
  _id: string;
  name: string;
  pillar: MetricPillar;
  category: string;
  value: number;
  unit: string;
  target: number;
  targetYear: string;
  targetProgress: number;
  improvement: number;
}
export interface Dashboard {
  environmental: number;
  social: number;
  governance: number;
  total: number;
  grade: string;
  context: OrgContext;
  trend: ScoreHistoryEntry[];
  materialTopics: number;
  materialTopicsList: MaterialTopic[];
  frameworkAlignment: FrameworkAlignmentRow[];
  furthestFromTarget: DashboardMetric[];
  peerBenchmark: Record<
    "environmental" | "social" | "governance",
    { ours: number; peer: number }
  >;
}

export const fetchDashboard = async (): Promise<Dashboard> => {
  const res = await api.get("/grc/esg/dashboard");
  return res.data?.data ?? res.data;
};
export const snapshotHistory = async (
  period: string,
): Promise<ScoreHistoryEntry[]> => {
  const res = await api.post("/grc/esg/dashboard/snapshot-history", {
    period,
  });
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

// ── Metrics & Initiatives ───────────────────────────────────

export interface EsgMetric {
  _id: string;
  pillar: MetricPillar;
  category: string;
  name: string;
  unit: string;
  period: string;
  value: number;
  baseline: number;
  target: number;
  targetYear: string;
  direction: Direction;
  intensityBasis: IntensityBasis;
  methodology: string;
  source: string;
  // Server-computed
  targetProgress: number;
  improvement: number;
  intensity: { value: number; label: string } | null;
}
export interface UpsertMetricDto {
  pillar: MetricPillar;
  category: string;
  name: string;
  unit: string;
  period: string;
  value: number;
  baseline: number;
  target: number;
  targetYear: string;
  direction: Direction;
  intensityBasis?: IntensityBasis;
  methodology?: string;
  source?: string;
}
export type InitiativeStatus =
  | "Planned"
  | "In progress"
  | "Delivered"
  | "Paused";
export interface EsgInitiative {
  _id: string;
  title: string;
  category: string;
  owner: string;
  cost: number;
  expectedImpact: string;
  status: InitiativeStatus;
  startDate: string;
}

export const fetchMetrics = async (
  pillar?: MetricPillar,
): Promise<EsgMetric[]> => {
  const res = await api.get("/grc/esg/metrics", { params: { pillar } });
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};
export const createMetric = async (
  dto: UpsertMetricDto,
): Promise<EsgMetric> => {
  const res = await api.post("/grc/esg/metrics", dto);
  return res.data?.data ?? res.data;
};
export const updateMetric = async (
  id: string,
  dto: UpsertMetricDto,
): Promise<EsgMetric> => {
  const res = await api.patch(`/grc/esg/metrics/${id}`, dto);
  return res.data?.data ?? res.data;
};
export const deleteMetric = async (id: string): Promise<void> => {
  await api.delete(`/grc/esg/metrics/${id}`);
};
export const fetchInitiatives = async (): Promise<EsgInitiative[]> => {
  const res = await api.get("/grc/esg/metrics/initiatives");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};
export const createInitiative = async (dto: {
  title: string;
  category: string;
  owner?: string;
  cost?: number;
  expectedImpact?: string;
}): Promise<EsgInitiative> => {
  const res = await api.post("/grc/esg/metrics/initiatives", dto);
  return res.data?.data ?? res.data;
};
export const setInitiativeStatus = async (
  id: string,
  status: InitiativeStatus,
): Promise<EsgInitiative> => {
  const res = await api.patch(`/grc/esg/metrics/initiatives/${id}/status`, {
    status,
  });
  return res.data?.data ?? res.data;
};

// ── Materiality ──────────────────────────────────────────────

export const STAKEHOLDER_GROUPS = [
  "Employees",
  "Investors",
  "Regulators",
  "Communities",
  "Customers",
  "Suppliers",
] as const;
export type StakeholderGroup = (typeof STAKEHOLDER_GROUPS)[number];
export type StakeholderPriority = "High" | "Medium" | "Low";

export interface Stakeholder {
  _id: string;
  group: string;
  priority: StakeholderPriority;
  engagementMethod: string;
  lastEngaged: string | null;
  input: string;
}
export type TopicStatus = "Material" | "Monitor" | "Not material";
export interface MaterialTopic {
  _id: string;
  topic: string;
  pillar: EsgPillar;
  financial: number;
  impact: number;
  priorFinancial: number | null;
  priorImpact: number | null;
  rationale: string;
  escalatedToRisk: boolean;
  riskId: string | null;
  // Server-computed
  status: TopicStatus;
  shift: number;
}
export type MaterialityCycleStatus = "In progress" | "Approved";
export interface MaterialityCycle {
  _id: string;
  year: string;
  status: MaterialityCycleStatus;
  threshold: number;
  approvedBy: string | null;
  approvedAt: string | null;
  nextReviewDate: string;
}

export const fetchCycle = async (): Promise<MaterialityCycle> => {
  const res = await api.get("/grc/esg/materiality/cycle");
  return res.data?.data ?? res.data;
};
export const updateThreshold = async (
  threshold: number,
): Promise<MaterialityCycle> => {
  const res = await api.patch("/grc/esg/materiality/cycle/threshold", {
    threshold,
  });
  return res.data?.data ?? res.data;
};
export const approveCycle = async (
  approvedBy: string,
): Promise<MaterialityCycle> => {
  const res = await api.post("/grc/esg/materiality/cycle/approve", {
    approvedBy,
  });
  return res.data?.data ?? res.data;
};
export const openNextCycle = async (): Promise<MaterialityCycle> => {
  const res = await api.post("/grc/esg/materiality/cycle/next");
  return res.data?.data ?? res.data;
};
export const fetchStakeholders = async (): Promise<Stakeholder[]> => {
  const res = await api.get("/grc/esg/materiality/stakeholders");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};
export const addStakeholder = async (dto: {
  group: string;
  priority?: StakeholderPriority;
  engagementMethod?: string;
  input?: string;
}): Promise<Stakeholder> => {
  const res = await api.post("/grc/esg/materiality/stakeholders", dto);
  return res.data?.data ?? res.data;
};
export const recordEngagement = async (
  id: string,
  input?: string,
): Promise<Stakeholder> => {
  const res = await api.patch(
    `/grc/esg/materiality/stakeholders/${id}/engagement`,
    { input },
  );
  return res.data?.data ?? res.data;
};
export const fetchTopics = async (): Promise<MaterialTopic[]> => {
  const res = await api.get("/grc/esg/materiality/topics");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};
export const addTopic = async (dto: {
  topic: string;
  pillar: EsgPillar;
  financial: number;
  impact: number;
  rationale?: string;
}): Promise<MaterialTopic> => {
  const res = await api.post("/grc/esg/materiality/topics", dto);
  return res.data?.data ?? res.data;
};
export const updateTopicScore = async (
  id: string,
  dto: { financial?: number; impact?: number },
): Promise<MaterialTopic> => {
  const res = await api.patch(`/grc/esg/materiality/topics/${id}/score`, dto);
  return res.data?.data ?? res.data;
};
export const escalateTopic = async (id: string): Promise<MaterialTopic> => {
  const res = await api.post(`/grc/esg/materiality/topics/${id}/escalate`);
  return res.data?.data ?? res.data;
};

// ── Frameworks, Indicators, Reports ─────────────────────────

export interface EsgFramework {
  _id: string;
  key: string;
  label: string;
  description: string;
  isStandard: boolean;
  isActive: boolean;
  order: number;
}
export type IndicatorStatus =
  | "Not started"
  | "In progress"
  | "Awaiting sign-off"
  | "Signed off";
export interface IndicatorEvidence {
  _id?: string;
  name: string;
  fileUrl: string | null;
  mimeType: string | null;
  size: number;
  createdAt?: string;
}
export interface ReportIndicator {
  _id: string;
  frameworkId: string;
  code: string;
  title: string;
  owner: string;
  response: string;
  evidence: IndicatorEvidence[];
  status: IndicatorStatus;
  signedOffBy: string | null;
  signedOffAt: string | null;
}
export type EsgReportStatus = "Draft" | "Compiled" | "Published";
export interface EsgReport {
  _id: string;
  frameworkId: string;
  title: string;
  period: string;
  status: EsgReportStatus;
  compiledAt: string | null;
  publishedAt: string | null;
  note: string;
}
export interface Coverage {
  signedOff: number;
  total: number;
  pct: number;
}

export const fetchFrameworks = async (): Promise<EsgFramework[]> => {
  const res = await api.get("/grc/esg/frameworks");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};
export const fetchFrameworkCoverage = async (): Promise<
  Record<string, Coverage>
> => {
  const res = await api.get("/grc/esg/frameworks/coverage");
  return res.data?.data ?? res.data;
};
export const createFramework = async (dto: {
  label: string;
  description?: string;
}): Promise<EsgFramework> => {
  const res = await api.post("/grc/esg/frameworks", dto);
  return res.data?.data ?? res.data;
};
export const updateFramework = async (
  id: string,
  dto: { label?: string; description?: string },
): Promise<EsgFramework> => {
  const res = await api.patch(`/grc/esg/frameworks/${id}`, dto);
  return res.data?.data ?? res.data;
};
export const setFrameworkActive = async (
  id: string,
  isActive: boolean,
): Promise<EsgFramework> => {
  const res = await api.patch(`/grc/esg/frameworks/${id}/active`, {
    isActive,
  });
  return res.data?.data ?? res.data;
};
export const reorderFrameworks = async (
  frameworkIds: string[],
): Promise<EsgFramework[]> => {
  const res = await api.patch("/grc/esg/frameworks/reorder", {
    frameworkIds,
  });
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};
export const deleteFramework = async (id: string): Promise<void> => {
  await api.delete(`/grc/esg/frameworks/${id}`);
};

export const fetchIndicators = async (
  frameworkId: string,
): Promise<ReportIndicator[]> => {
  const res = await api.get(`/grc/esg/frameworks/${frameworkId}/indicators`);
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};
export const addIndicator = async (
  frameworkId: string,
  dto: { code: string; title: string; owner?: string },
): Promise<ReportIndicator> => {
  const res = await api.post(
    `/grc/esg/frameworks/${frameworkId}/indicators`,
    dto,
  );
  return res.data?.data ?? res.data;
};
export const updateIndicatorResponse = async (
  id: string,
  response: string,
): Promise<ReportIndicator> => {
  const res = await api.patch(`/grc/esg/indicators/${id}/response`, {
    response,
  });
  return res.data?.data ?? res.data;
};
export const addIndicatorEvidence = async (
  id: string,
  files: File[],
): Promise<ReportIndicator> => {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  const res = await api.post(`/grc/esg/indicators/${id}/evidence`, form);
  return res.data?.data ?? res.data;
};
export const submitIndicatorForSignOff = async (
  id: string,
): Promise<ReportIndicator> => {
  const res = await api.post(`/grc/esg/indicators/${id}/submit`);
  return res.data?.data ?? res.data;
};
export const signOffIndicator = async (
  id: string,
  signedOffBy = "Sustainability Lead",
): Promise<ReportIndicator> => {
  const res = await api.post(`/grc/esg/indicators/${id}/sign-off`, null, {
    params: { signedOffBy },
  });
  return res.data?.data ?? res.data;
};

export const fetchReports = async (): Promise<EsgReport[]> => {
  const res = await api.get("/grc/esg/reports");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};
export const compileReport = async (
  frameworkId: string,
  period?: string,
): Promise<{ report: EsgReport; pendingCount: number }> => {
  const res = await api.post(`/grc/esg/frameworks/${frameworkId}/compile`, {
    period,
  });
  return res.data?.data ?? res.data;
};
export const publishReport = async (id: string): Promise<EsgReport> => {
  const res = await api.post(`/grc/esg/reports/${id}/publish`);
  return res.data?.data ?? res.data;
};

// ── Client-side derived helpers (no server round trip needed) ──

export function scoreGrade(score: number): string {
  if (score >= 85) return "AA";
  if (score >= 70) return "A";
  if (score >= 55) return "BBB";
  if (score >= 40) return "BB";
  return "B";
}
export function scoreTone(score: number): string {
  if (score >= 70)
    return "text-emerald-600 border-emerald-500/30 bg-emerald-500/10";
  if (score >= 50) return "text-amber-600 border-amber-500/30 bg-amber-500/10";
  return "text-rose-600 border-rose-500/30 bg-rose-500/10";
}
export const indicatorTone = (s: IndicatorStatus) =>
  s === "Signed off"
    ? "text-emerald-600 border-emerald-500/30"
    : s === "Awaiting sign-off"
      ? "text-amber-600 border-amber-500/30"
      : s === "In progress"
        ? "text-blue-600 border-blue-500/30"
        : "text-muted-foreground";
