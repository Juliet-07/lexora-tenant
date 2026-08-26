export interface AttentionItem {
  id: string;
  module: "AML/KYC" | "HR" | "CRM" | "GRC";
  title: string;
  detail: string;
  severity: "critical" | "warning" | "info";
  to: string;
}

export interface ModuleMetric {
  label: string;
  value: string | number;
  tone?: "default" | "good" | "warn" | "bad";
}

export interface ModulePulseCard {
  id: string;
  name: string;
  accent: string;
  to: string;
  headline: string;
  headlineLabel: string;
  score: number;
  metrics: ModuleMetric[];
}

// Real, derived from the /tenant/dashboard response — every module
// score, attention item, and win here reflects something a real
// query returned, not a mock store. Returns a safe all-zero shape
// while dashboardData is still loading, so callers don't need their
// own separate loading branch just for this hook.
export function useCrossModuleMetrics(dashboardData: any) {
  const kyc = dashboardData?.kyc ?? {
    total: 0,
    approved: 0,
    pending: 0,
    highRisk: 0,
    score: 0,
  };
  const grc = dashboardData?.grc ?? {
    openRisks: 0,
    criticalRisks: 0,
    openIncidents: 0,
    dueObligations: 0,
    overdueObligations: 0,
    liveDeals: 0,
    dealsWon: 0,
    dealValue: 0,
    score: 0,
  };
  const crm = dashboardData?.crm ?? {
    activeMandates: 0,
    atRiskMandates: 0,
    openTasks: 0,
    tasksDone: 0,
    tasksTotal: 0,
    openTickets: 0,
    overdueInvoices: 0,
    receivables: 0,
    score: 0,
  };
  const hr = dashboardData?.hr ?? {
    totalEmployees: 0,
    activeEmployees: 0,
    pendingLeave: 0,
    score: 0,
  };
  const attention: AttentionItem[] = dashboardData?.attention ?? [];
  const wins: { label: string; value: string | number; hint: string }[] =
    dashboardData?.wins ?? [];
  const overallScore: number = dashboardData?.overallScore ?? 0;

  const cards: ModulePulseCard[] = [
    {
      id: "kyc_aml",
      name: "AML / KYC",
      accent: "from-rose-500 to-orange-500",
      to: "/clients",
      headline: `${kyc.total}`,
      headlineLabel: "Clients onboarded",
      score: kyc.score,
      metrics: [
        { label: "Approved", value: kyc.approved, tone: "good" },
        {
          label: "Pending KYC",
          value: kyc.pending,
          tone: kyc.pending ? "warn" : "good",
        },
        {
          label: "High risk",
          value: kyc.highRisk,
          tone: kyc.highRisk ? "bad" : "good",
        },
      ],
    },
    {
      id: "grc",
      name: "Governance, Risk & Compliance",
      accent: "from-violet-500 to-purple-600",
      to: "/grc/overview",
      headline: `${grc.score}%`,
      headlineLabel: "Compliance health",
      score: grc.score,
      metrics: [
        {
          label: "Critical risks",
          value: grc.criticalRisks,
          tone: grc.criticalRisks ? "bad" : "good",
        },
        {
          label: "Obligations due",
          value: grc.dueObligations + grc.overdueObligations,
          tone: grc.overdueObligations ? "bad" : "warn",
        },
        {
          label: "Live deals",
          value: grc.liveDeals,
          tone: "default",
        },
      ],
    },
    {
      id: "crm",
      name: "Client & Delivery",
      accent: "from-blue-500 to-cyan-500",
      to: "/crm/overview",
      headline: `${crm.activeMandates}`,
      headlineLabel: "Active mandates",
      score: crm.score,
      metrics: [
        {
          label: "At risk",
          value: crm.atRiskMandates,
          tone: crm.atRiskMandates ? "warn" : "good",
        },
        { label: "Open tasks", value: crm.openTasks, tone: "default" },
        {
          label: "Receivables",
          value: `$${Math.round(crm.receivables / 1000)}k`,
          tone: crm.overdueInvoices ? "bad" : "good",
        },
      ],
    },
    {
      id: "hr_pm",
      name: "People & HR",
      accent: "from-emerald-500 to-teal-500",
      to: "/hr/overview",
      headline: `${hr.totalEmployees}`,
      headlineLabel: "Headcount",
      score: hr.score,
      metrics: [
        { label: "Active", value: hr.activeEmployees, tone: "good" },
        {
          label: "Leave requests",
          value: hr.pendingLeave,
          tone: hr.pendingLeave ? "warn" : "good",
        },
        {
          label: "Open roles",
          value: hr.totalEmployees - hr.activeEmployees,
          tone: "default",
        },
      ],
    },
  ];

  return {
    cards,
    attention,
    wins,
    overallScore,
    counts: {
      openTickets: crm.openTickets,
      employees: hr.totalEmployees,
      openRisks: grc.openRisks,
      criticalRisks: grc.criticalRisks,
      overdueObligations: grc.overdueObligations,
      overdueInvoices: crm.overdueInvoices,
      atRiskMandates: crm.atRiskMandates,
    },
  };
}
