import { api } from "./api";

export interface DemographicRow {
  category: string;
  male: number;
  female: number;
  total: number;
  share: number;
}

export interface DemographicsReport {
  totalHeadcount: number;
  totals: { male: number; female: number; withDisability: number };
  age: DemographicRow[];
  nationality: DemographicRow[];
  contractType: DemographicRow[];
  education: DemographicRow[];
  occupation: DemographicRow[];
  disability: { withDisability: number; withoutDisability: number };
}

export const fetchDemographicsReport =
  async (): Promise<DemographicsReport> => {
    const res = await api.get("/hr/reports/demographics");
    return res.data?.data ?? res.data;
  };

export interface PayrollPeriod {
  periodLabel: string;
  status: string;
  periodEnd: string;
}

export const fetchPayrollPeriods = async (): Promise<PayrollPeriod[]> => {
  const res = await api.get("/hr/reports/payroll/periods");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export interface PayrollReport {
  period: string | null;
  runStatus?: string;
  currency?: string;
  totals: {
    headcount: number;
    totalGross: number;
    totalNet: number;
    totalDeductions: number;
    totalEmployerContributions: number;
  } | null;
  byDepartment: {
    department: string;
    headcount: number;
    gross: number;
    net: number;
    deductions: number;
    employerContrib: number;
  }[];
}

export const fetchPayrollReport = async (
  period?: string,
): Promise<PayrollReport> => {
  const res = await api.get("/hr/reports/payroll", {
    params: period ? { period } : undefined,
  });
  return res.data?.data ?? res.data;
};

export interface CountRow {
  category: string;
  count: number;
}

export interface DisputesReport {
  total: number;
  byType: CountRow[];
  byStatus: CountRow[];
  byStage: CountRow[];
  byOutcome: CountRow[];
  avgResolutionDays: number | null;
}

export const fetchDisputesReport = async (): Promise<DisputesReport> => {
  const res = await api.get("/hr/reports/disputes");
  return res.data?.data ?? res.data;
};

export interface EmployeeRecordsReport {
  total: number;
  byType: CountRow[];
  byDepartment: {
    department: string;
    counts: Record<string, number>;
    total: number;
  }[];
}

export const fetchEmployeeRecordsReport =
  async (): Promise<EmployeeRecordsReport> => {
    const res = await api.get("/hr/reports/employee-records");
    return res.data?.data ?? res.data;
  };

export interface RequisitionsReport {
  total: number;
  byStatus: CountRow[];
  byType: CountRow[];
  byPriority: CountRow[];
  avgReviewDays: number | null;
  approvalRate: number | null;
  totalAmountRequested: number;
}

export const fetchRequisitionsReport =
  async (): Promise<RequisitionsReport> => {
    const res = await api.get("/hr/reports/requisitions");
    return res.data?.data ?? res.data;
  };

export interface PerformanceReport {
  totalEmployees: number;
  everReviewed: number;
  ratingBandDistribution: { band: string; count: number }[];
  byDepartment: {
    department: string;
    reviewed: number;
    avgScore: number | null;
  }[];
}

export const fetchPerformanceReport = async (): Promise<PerformanceReport> => {
  const res = await api.get("/hr/reports/performance");
  return res.data?.data ?? res.data;
};
