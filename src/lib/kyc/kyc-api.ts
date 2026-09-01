import { api } from "../api";

// ─────────────────────────────────────────────────────────────
// SHARED TYPES
// ─────────────────────────────────────────────────────────────

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─────────────────────────────────────────────────────────────
// RISK ENGINE — Types
// ─────────────────────────────────────────────────────────────

export interface RiskDashboard {
  summary: {
    totalClients: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    unrated: number;
    avgRiskScore: number;
  };
  breakdown: { _id: string; count: number }[];
  highRiskClients: RiskClient[];
  overdueReviews: RiskClient[];
  riskTrend: {
    _id: { year: number; month: number };
    avgScore: number;
    count: number;
  }[];
  riskByRegion: { _id: string; count: number; avgScore: number }[];
  topRiskFactors: { _id: string; count: number }[];
  generatedAt: string;
}

export interface RiskClient {
  clientId: string;
  fullName: string;
  email: string;
  riskLevel: string;
  kycStatus: string;
  classifications: string;
  verificationCompletedAt: string | null;
  verificationResults: Record<string, any> | null;
  kycCompletedAt: string | null;
  address?: { country?: string };
}

export interface RiskRule {
  _id: string;
  tenantId: string | null; // null = global (SuperAdmin)
  name: string;
  description: string;
  ruleType: "transaction" | "client" | "behavioral";
  field: string;
  condition: string;
  value: string;
  action: string;
  isActive: boolean;
  createdBy: { firstName: string; lastName: string; email: string } | string;
  createdAt: string;
}

export interface RiskScenario {
  _id: string;
  tenantId: string;
  name: string;
  description: string;
  ruleIds: RiskRule[];
  logic: "AND" | "OR";
  action: string;
  isActive: boolean;
  createdBy: { firstName: string; lastName: string } | string;
  createdAt: string;
}

export interface RiskOverride {
  _id: string;
  clientId: string;
  tenantId: string;
  overriddenRiskLevel: string;
  reason: string;
  overriddenBy: { firstName: string; lastName: string; email: string };
  expiresAt: string | null;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// RISK ENGINE — API calls
// ─────────────────────────────────────────────────────────────

export const fetchRiskDashboard = async (): Promise<RiskDashboard> => {
  const res = await api.get("/kyc/risk/dashboard");
  return res.data?.data ?? res.data;
};

export const fetchClientRiskList = async (params?: {
  page?: number;
  limit?: number;
  riskLevel?: string;
  search?: string;
}): Promise<Paginated<RiskClient>> => {
  const res = await api.get("/kyc/risk/clients", { params });
  return res.data?.data ?? res.data;
};

export const fetchRiskRules = async (): Promise<RiskRule[]> => {
  const res = await api.get("/kyc/risk/rules");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createRiskRule = async (dto: {
  name: string;
  description?: string;
  ruleType: string;
  field: string;
  condition: string;
  value: string;
  action: string;
}): Promise<RiskRule> => {
  const res = await api.post("/kyc/risk/rules", dto);
  return res.data?.data ?? res.data;
};

export const updateRiskRule = async (
  ruleId: string,
  dto: Partial<RiskRule>,
): Promise<RiskRule> => {
  const res = await api.patch(`/kyc/risk/rules/${ruleId}`, dto);
  return res.data?.data ?? res.data;
};

export const deleteRiskRule = async (ruleId: string): Promise<void> => {
  await api.delete(`/kyc/risk/rules/${ruleId}`);
};

export const fetchRiskScenarios = async (): Promise<RiskScenario[]> => {
  const res = await api.get("/kyc/risk/scenarios");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createRiskScenario = async (dto: {
  name: string;
  description?: string;
  ruleIds: string[];
  logic: "AND" | "OR";
  action: string;
}): Promise<RiskScenario> => {
  const res = await api.post("/kyc/risk/scenarios", dto);
  return res.data?.data ?? res.data;
};

export const deleteRiskScenario = async (scenarioId: string): Promise<void> => {
  await api.delete(`/kyc/risk/scenarios/${scenarioId}`);
};

export const overrideRiskLevel = async (
  clientId: string,
  dto: { riskLevel: string; reason: string; expiresAt?: string },
): Promise<{ success: boolean; previousLevel: string; newLevel: string }> => {
  const res = await api.patch(`/kyc/risk/clients/${clientId}/override`, dto);
  return res.data?.data ?? res.data;
};

export const fetchRiskOverride = async (
  clientId: string,
): Promise<RiskOverride | null> => {
  const res = await api.get(`/kyc/risk/clients/${clientId}/override`);
  return res.data?.data ?? res.data ?? null;
};

// ─────────────────────────────────────────────────────────────
// TRANSACTION MONITORING — Types
// ─────────────────────────────────────────────────────────────

export interface TransactionDashboard {
  stats: {
    activeRules: number;
    openAlerts: number;
    underReview: number;
    activeScenarios: number;
  };
  recentFlagged: Transaction[];
  volumeByType: { _id: string; count: number; totalAmount: number }[];
  flaggedTrend: {
    _id: { year: number; month: number; day: number };
    count: number;
  }[];
}

export interface Transaction {
  _id: string;
  tenantId: string;
  clientId:
    | { _id: string; firstName: string; lastName: string; email: string }
    | string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  transactionDate: string;
  counterpartyName: string | null;
  counterpartyBank: string | null;
  counterpartyCountry: string | null;
  counterpartyAccount: string | null;
  reference: string | null;
  notes: string | null;
  triggeredRules: string[];
  loggedBy: { firstName: string; lastName: string } | string | null;
  reviewedBy: { firstName: string; lastName: string } | string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
}

export interface BehavioralProfile {
  clientId: string;
  last30Days: { count: number; totalAmount: number };
  last7Days: { count: number; totalAmount: number };
  byType: { _id: string; count: number; totalAmount: number }[];
  largestTransaction: Transaction | null;
  flaggedCount: number;
  dailyPattern: { _id: number; count: number; totalAmount: number }[];
}

// ─────────────────────────────────────────────────────────────
// TRANSACTION MONITORING — API calls
// ─────────────────────────────────────────────────────────────

export const fetchTransactionDashboard =
  async (): Promise<TransactionDashboard> => {
    const res = await api.get("/kyc/transactions/dashboard");
    return res.data?.data ?? res.data;
  };

export const logTransaction = async (dto: {
  clientId: string;
  amount: number;
  currency?: string;
  type: string;
  transactionDate: string;
  counterpartyName?: string;
  counterpartyBank?: string;
  counterpartyCountry?: string;
  counterpartyAccount?: string;
  reference?: string;
  notes?: string;
}): Promise<Transaction> => {
  const res = await api.post("/kyc/transactions", dto);
  return res.data?.data ?? res.data;
};

export const fetchTransactions = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<Paginated<Transaction>> => {
  const res = await api.get("/kyc/transactions", { params });
  return res.data?.data ?? res.data;
};

export const fetchTransactionById = async (
  txId: string,
): Promise<Transaction> => {
  const res = await api.get(`/kyc/transactions/${txId}`);
  return res.data?.data ?? res.data;
};

export const fetchWireTransfers = async (params?: {
  page?: number;
  limit?: number;
}): Promise<Paginated<Transaction>> => {
  const res = await api.get("/kyc/transactions/wire-transfers", { params });
  return res.data?.data ?? res.data;
};

export const reviewTransaction = async (
  txId: string,
  dto: { clearFlag: boolean; note?: string },
): Promise<Transaction> => {
  const res = await api.patch(`/kyc/transactions/${txId}/review`, dto);
  return res.data?.data ?? res.data;
};

export const fetchBehavioralProfile = async (
  clientId: string,
): Promise<BehavioralProfile> => {
  const res = await api.get(`/kyc/transactions/client/${clientId}/profile`);
  return res.data?.data ?? res.data;
};

// ─────────────────────────────────────────────────────────────
// COMPLIANCE ALERTS — Types
// ─────────────────────────────────────────────────────────────

export interface AlertStats {
  summary: {
    open: number;
    reviewed: number;
    dismissed: number;
    escalated: number;
    critical: number;
    high: number;
  };
  byType: { _id: string; count: number }[];
  recentCritical: ComplianceAlert[];
}

export interface ComplianceAlert {
  _id: string;
  tenantId: string;
  clientId:
    | { _id: string; firstName: string; lastName: string; email: string }
    | string
    | null;
  type: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  metadata: Record<string, any> | null;
  reviewedBy: { firstName: string; lastName: string; email: string } | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// COMPLIANCE ALERTS — API calls
// ─────────────────────────────────────────────────────────────

export const fetchAlertStats = async (): Promise<AlertStats> => {
  const res = await api.get("/kyc/alerts/stats");
  return res.data?.data ?? res.data;
};

export const fetchAlerts = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  severity?: string;
  type?: string;
}): Promise<Paginated<ComplianceAlert>> => {
  const res = await api.get("/kyc/alerts", { params });
  return res.data?.data ?? res.data;
};

export const fetchAlertById = async (
  alertId: string,
): Promise<ComplianceAlert> => {
  const res = await api.get(`/kyc/alerts/${alertId}`);
  return res.data?.data ?? res.data;
};

export const createManualAlert = async (dto: {
  clientId?: string;
  severity: string;
  title: string;
  description: string;
}): Promise<ComplianceAlert> => {
  const res = await api.post("/kyc/alerts", dto);
  return res.data?.data ?? res.data;
};

export const updateAlert = async (
  alertId: string,
  dto: { status: string; reviewNote?: string },
): Promise<ComplianceAlert> => {
  const res = await api.patch(`/kyc/alerts/${alertId}`, dto);
  return res.data?.data ?? res.data;
};

export const bulkDismissAlerts = async (
  alertIds: string[],
  note?: string,
): Promise<{ dismissed: number }> => {
  const res = await api.post("/kyc/alerts/bulk-dismiss", { alertIds, note });
  return res.data?.data ?? res.data;
};

export const fetchClientAlerts = async (
  clientId: string,
): Promise<ComplianceAlert[]> => {
  const res = await api.get(`/kyc/alerts/client/${clientId}`);
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

// ─────────────────────────────────────────────────────────────
// STR — Types
// ─────────────────────────────────────────────────────────────

export interface StrStats {
  draft: number;
  pendingReview: number;
  submitted: number;
  acknowledged: number;
  total: number;
}

export interface Str {
  _id: string;
  strId: string;
  tenantId: string;
  clientId:
    | { _id: string; firstName: string; lastName: string; email: string }
    | string;
  transactionId: string | null;
  relatedCaseId: string | null;
  customerName: string;
  amount: number;
  currency: string;
  transactionDate: string;
  bankName: string | null;
  descriptionOfActivity: string;
  additionalInformation: string | null;
  status: "draft" | "pending_review" | "submitted" | "acknowledged";
  reportedBy: { firstName: string; lastName: string; email: string } | string;
  reviewedBy: { firstName: string; lastName: string } | string | null;
  submittedAt: string | null;
  acknowledgedAt: string | null;
  goAmlReference: string | null;
  behavioralContext: BehavioralProfile | null;
  ficEmailSent: boolean;
  ficEmailSentAt: string | null;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// STR — API calls
// ─────────────────────────────────────────────────────────────

export const fetchStrStats = async (): Promise<StrStats> => {
  const res = await api.get("/kyc/str/stats");
  return res.data?.data ?? res.data;
};

export const fetchStrs = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<Paginated<Str>> => {
  const res = await api.get("/kyc/str", { params });
  return res.data?.data ?? res.data;
};

export const fetchStrById = async (strId: string): Promise<Str> => {
  const res = await api.get(`/kyc/str/${strId}`);
  return res.data?.data ?? res.data;
};

export const createStr = async (dto: {
  clientId: string;
  transactionId?: string;
  relatedCaseId?: string;
  customerName: string;
  amount: number;
  currency?: string;
  transactionDate: string;
  bankName?: string;
  descriptionOfActivity: string;
  additionalInformation?: string;
  saveAsDraft?: boolean;
}): Promise<Str> => {
  const res = await api.post("/kyc/str", dto);
  return res.data?.data ?? res.data;
};

export const updateStr = async (
  strId: string,
  dto: Partial<Str>,
): Promise<Str> => {
  const res = await api.patch(`/kyc/str/${strId}`, dto);
  return res.data?.data ?? res.data;
};

export const submitStr = async (
  strId: string,
): Promise<{
  success: boolean;
  message: string;
  strId: string;
  ficEmailSent: boolean;
  xml: string;
}> => {
  const res = await api.post(`/kyc/str/${strId}/submit`);
  return res.data?.data ?? res.data;
};

// Real pre-fill for the "File STR" flow from a flagged transaction —
// the actual connection between Transaction Monitoring and STR.
export interface StrDraft {
  clientId: string;
  transactionId: string;
  customerName: string;
  amount: number;
  currency: string;
  transactionDate: string;
  descriptionOfActivity: string;
  behavioralProfile: BehavioralProfile;
}

export const fetchStrDraftFromTransaction = async (
  txId: string,
): Promise<StrDraft> => {
  const res = await api.get(`/kyc/transactions/${txId}/str-draft`);
  return res.data?.data ?? res.data;
};

export const downloadStrXml = (strId: string): string =>
  `${import.meta.env.VITE_REACT_APP_BASE_URL}/kyc/str/${strId}/xml`;

export const acknowledgeStr = async (
  strId: string,
  goAmlReference?: string,
): Promise<Str> => {
  const res = await api.patch(`/kyc/str/${strId}/acknowledge`, {
    goAmlReference,
  });
  return res.data?.data ?? res.data;
};

// ─────────────────────────────────────────────────────────────
// WATCHLIST — Types
// ─────────────────────────────────────────────────────────────

export interface WatchlistStats {
  total: number;
  sanctions: number;
  pep: number;
  adverseMedia: number;
  internalBlock: number;
}

export interface WatchlistEntry {
  _id: string;
  entryId: string;
  tenantId: string;
  name: string;
  aliases: string | null;
  entityType: "individual" | "organization";
  listType: "sanctions" | "pep" | "adverse_media" | "internal_block";
  country: string | null;
  source: string | null;
  reason: string | null;
  isActive: boolean;
  externalId: string | null;
  addedBy: { firstName: string; lastName: string } | null;
  createdAt: string;
}

export interface AdHocScreenResult {
  name: string;
  localMatches: WatchlistEntry[];
  liveMatches: any[];
  totalHits: number;
  screenedAt: string;
}

// ─────────────────────────────────────────────────────────────
// WATCHLIST — API calls
// ─────────────────────────────────────────────────────────────

export const fetchWatchlistStats = async (): Promise<WatchlistStats> => {
  const res = await api.get("/kyc/watchlist/stats");
  return res.data?.data ?? res.data;
};

export const fetchWatchlistEntries = async (params?: {
  page?: number;
  limit?: number;
  listType?: string;
  entityType?: string;
  isActive?: boolean;
  search?: string;
}): Promise<Paginated<WatchlistEntry>> => {
  const res = await api.get("/kyc/watchlist", { params });
  return res.data?.data ?? res.data;
};

export const addWatchlistEntry = async (dto: {
  name: string;
  aliases?: string;
  entityType: string;
  listType: string;
  country?: string;
  source?: string;
  reason?: string;
}): Promise<WatchlistEntry> => {
  const res = await api.post("/kyc/watchlist", dto);
  return res.data?.data ?? res.data;
};

export const deleteWatchlistEntry = async (entryId: string): Promise<void> => {
  await api.delete(`/kyc/watchlist/${entryId}`);
};

export const importWatchlistCsv = async (
  csv: string,
): Promise<{ imported: number }> => {
  const res = await api.post("/kyc/watchlist/import-csv", { csv });
  return res.data?.data ?? res.data;
};

export const syncWatchlist = async (): Promise<{
  synced: number;
  syncedAt: string;
}> => {
  const res = await api.post("/kyc/watchlist/sync");
  return res.data?.data ?? res.data;
};

export const adHocScreen = async (dto: {
  name: string;
  listType?: string;
  checkLive?: boolean;
}): Promise<AdHocScreenResult> => {
  const res = await api.post("/kyc/watchlist/screen", dto);
  return res.data?.data ?? res.data;
};

// ─────────────────────────────────────────────────────────────
// REPORTS & ANALYTICS — Types
// ─────────────────────────────────────────────────────────────

export interface OperationalReport {
  period: string;
  summary: {
    alertsGenerated: { value: number; change: number | null };
    alertsResolved: { value: number; change: number | null };
    casesCreated: { value: number; change: number | null };
    casesClosed: { value: number; change: number | null };
    strsFiled: { value: number; change: number | null };
    avgResolutionDays: { value: number | null; change: number | null };
  };
  dailyAlertTrend: { date: string; label: string; count: number }[];
  generatedAt: string;
}

export interface RiskAnalyticsReport {
  summary: {
    totalClients: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    unrated: number;
  };
  riskDistribution: { _id: string; count: number }[];
  kycStatusBreakdown: { _id: string; count: number }[];
  verificationOutcomes: {
    _id: string;
    flagged: number;
    passed: number;
    failed: number;
  }[];
  topRiskFactors: { _id: string; count: number }[];
  highRiskClients: {
    clientId: string;
    fullName: string;
    email: string;
    riskLevel: string;
    kycStatus: string;
  }[];
  riskTrend: {
    _id: { year: number; month: number };
    avgScore: number;
    count: number;
  }[];
  recentlyFlagged: {
    clientId: string;
    fullName: string;
    email: string;
    riskLevel: string;
    verificationCompletedAt: string;
  }[];
  generatedAt: string;
}

export interface RegulatoryDashboard {
  strSummary: {
    draft: number;
    pendingReview: number;
    submitted: number;
    acknowledged: number;
    total: number;
  };
  complianceHealth: {
    overdueReviews: number;
    sanctionHits: number;
    pepHits: number;
    openAlerts: number;
  };
  overdueReviews: {
    clientId: string;
    fullName: string;
    email: string;
    riskLevel: string;
    kycCompletedAt: string;
  }[];
  recentStrs: any[];
  generatedAt: string;
}

export interface TrendAnalysis {
  clientGrowth: { _id: { year: number; month: number }; count: number }[];
  onboardingFunnel: { _id: string; count: number }[];
  alertTrend: {
    _id: { year: number; month: number };
    total: number;
    resolved: number;
  }[];
  txVolumeTrend: {
    _id: { year: number; month: number };
    count: number;
    totalAmount: number;
    flagged: number;
  }[];
  strTrend: {
    _id: { year: number; month: number };
    total: number;
    submitted: number;
  }[];
  generatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// REPORTS & ANALYTICS — API calls
// ─────────────────────────────────────────────────────────────

export const fetchOperationalReport = async (): Promise<OperationalReport> => {
  const res = await api.get("/kyc/reports/operational");
  return res.data?.data ?? res.data;
};

export const fetchRiskAnalyticsReport =
  async (): Promise<RiskAnalyticsReport> => {
    const res = await api.get("/kyc/reports/risk");
    return res.data?.data ?? res.data;
  };

export const fetchRegulatoryDashboard =
  async (): Promise<RegulatoryDashboard> => {
    const res = await api.get("/kyc/reports/regulatory");
    return res.data?.data ?? res.data;
  };

export const fetchTrendAnalysis = async (): Promise<TrendAnalysis> => {
  const res = await api.get("/kyc/reports/trends");
  return res.data?.data ?? res.data;
};

// Triggers CSV download directly in the browser
export const exportReport = (
  type: "operational" | "risk" | "regulatory" | "trends",
): void => {
  const token = localStorage.getItem("tenantToken");
  const base = import.meta.env.VITE_REACT_APP_BASE_URL;
  const filename = `lexora-${type}-report-${new Date().toISOString().split("T")[0]}.csv`;
  fetch(`${base}/kyc/reports/export/${type}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.blob())
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    });
};

// Triggers PDF download directly in the browser — same shared house
// style used across CRM and GRC reports.
export const exportReportPdf = (
  type: "operational" | "risk" | "regulatory" | "trends",
): void => {
  const token = localStorage.getItem("tenantToken");
  const base = import.meta.env.VITE_REACT_APP_BASE_URL;
  const filename = `lexora-${type}-report-${new Date().toISOString().split("T")[0]}.pdf`;
  fetch(`${base}/kyc/reports/export-pdf/${type}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.blob())
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    });
};
