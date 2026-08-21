import { useGrc, inherentScore, residualScore } from "@/lib/grcStore";
import { useDeals } from "@/lib/dealsStore";
import { useCompliance, obligationStatus, daysUntil } from "@/lib/complianceStore";
import { clients } from "@/data/mockData";
import { hrStats, employees, leaveRequests } from "@/data/hrMockData";
import {
  mandates,
  pmTasks,
  pmInvoices,
  tickets,
  invoiceTotal,
} from "@/data/crmPmMockData";

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

export function useCrossModuleMetrics() {
  const grc = useGrc();
  const deals = useDeals();
  const compliance = useCompliance();

  // ── AML / KYC ───────────────────────────────────────────────
  const kycApproved = clients.filter((c) => c.kycStatus === "Approved").length;
  const kycPending = clients.length - kycApproved;
  const highRiskClients = clients.filter((c) => c.riskLevel === "High").length;
  const kycScore = clients.length
    ? Math.round((kycApproved / clients.length) * 100)
    : 0;

  // ── HR ──────────────────────────────────────────────────────
  const pendingLeave = leaveRequests.filter(
    (l) => l.status === "Pending",
  ).length;
  const hrScore = hrStats.headcount
    ? Math.round((hrStats.active / hrStats.headcount) * 100)
    : 0;

  // ── CRM / Delivery ──────────────────────────────────────────
  const activeMandates = mandates.filter((m) => m.stage !== "Close").length;
  const atRiskMandates = mandates.filter((m) => m.rag !== "Green").length;
  const openTasks = pmTasks.filter((t) => t.status !== "Done").length;
  const overdueInvoices = pmInvoices.filter((i) => i.stage === "Overdue");
  const receivables = pmInvoices
    .filter((i) => i.stage !== "Paid" && i.stage !== "Draft")
    .reduce((s, i) => s + invoiceTotal(i).payable - i.paidAmount, 0);
  const openTickets = tickets.filter(
    (t) => t.status !== "Resolved" && t.status !== "Closed",
  ).length;
  const crmScore = mandates.length
    ? Math.round(
        (mandates.filter((m) => m.rag === "Green").length / mandates.length) *
          100,
      )
    : 0;

  // ── GRC ─────────────────────────────────────────────────────
  const openRisks = grc.risks.filter((r) => r.status !== "Closed");
  const criticalRisks = openRisks.filter((r) => residualScore(r) >= 17);
  const openIncidents = grc.incidents.filter((i) => i.status !== "Closed");
  const overdueObligations = compliance.obligations.filter(
    (o) => obligationStatus(o) === "Overdue",
  );
  const dueObligations = compliance.obligations.filter(
    (o) => obligationStatus(o) === "Due",
  );
  const liveDeals = deals.deals.filter((d) => d.status === "Active");
  const dealValue = liveDeals.reduce((s, d) => s + d.value, 0);
  const grcScore = Math.max(
    0,
    100 -
      criticalRisks.length * 8 -
      overdueObligations.length * 6 -
      openIncidents.length * 4,
  );

  const cards: ModulePulseCard[] = [
    {
      id: "kyc_aml",
      name: "AML / KYC",
      accent: "from-rose-500 to-orange-500",
      to: "/clients",
      headline: `${clients.length}`,
      headlineLabel: "Clients onboarded",
      score: kycScore,
      metrics: [
        { label: "Approved", value: kycApproved, tone: "good" },
        {
          label: "Pending KYC",
          value: kycPending,
          tone: kycPending ? "warn" : "good",
        },
        {
          label: "High risk",
          value: highRiskClients,
          tone: highRiskClients ? "bad" : "good",
        },
      ],
    },
    {
      id: "grc",
      name: "Governance, Risk & Compliance",
      accent: "from-violet-500 to-purple-600",
      to: "/grc/overview",
      headline: `${grcScore}%`,
      headlineLabel: "Compliance health",
      score: grcScore,
      metrics: [
        {
          label: "Critical risks",
          value: criticalRisks.length,
          tone: criticalRisks.length ? "bad" : "good",
        },
        {
          label: "Obligations due",
          value: dueObligations.length + overdueObligations.length,
          tone: overdueObligations.length ? "bad" : "warn",
        },
        {
          label: "Live deals",
          value: liveDeals.length,
          tone: "default",
        },
      ],
    },
    {
      id: "crm",
      name: "Client & Delivery",
      accent: "from-blue-500 to-cyan-500",
      to: "/crm/overview",
      headline: `${activeMandates}`,
      headlineLabel: "Active mandates",
      score: crmScore,
      metrics: [
        {
          label: "At risk",
          value: atRiskMandates,
          tone: atRiskMandates ? "warn" : "good",
        },
        { label: "Open tasks", value: openTasks, tone: "default" },
        {
          label: "Receivables",
          value: `$${Math.round(receivables / 1000)}k`,
          tone: overdueInvoices.length ? "bad" : "good",
        },
      ],
    },
    {
      id: "hr_pm",
      name: "People & HR",
      accent: "from-emerald-500 to-teal-500",
      to: "/hr/overview",
      headline: `${hrStats.headcount}`,
      headlineLabel: "Headcount",
      score: hrScore,
      metrics: [
        { label: "Active", value: hrStats.active, tone: "good" },
        {
          label: "Leave requests",
          value: pendingLeave,
          tone: pendingLeave ? "warn" : "good",
        },
        {
          label: "Open roles",
          value: hrStats.openRoles,
          tone: "default",
        },
      ],
    },
  ];

  // ── Attention feed ──────────────────────────────────────────
  const attention: AttentionItem[] = [];

  criticalRisks.slice(0, 2).forEach((r) =>
    attention.push({
      id: `risk-${r.id}`,
      module: "GRC",
      title: r.title,
      detail: `Residual score ${residualScore(r)} · inherent ${inherentScore(r)} · owner ${r.owner}`,
      severity: "critical",
      to: "/grc/risk/register",
    }),
  );

  overdueObligations.slice(0, 2).forEach((o) =>
    attention.push({
      id: `obl-${o.id}`,
      module: "GRC",
      title: o.title,
      detail: `${o.regulator} · ${Math.abs(daysUntil(o.nextDueDate))} days overdue`,
      severity: "critical",
      to: "/grc/compliance/obligations",
    }),
  );

  overdueInvoices.slice(0, 2).forEach((i) =>
    attention.push({
      id: `inv-${i.id}`,
      module: "CRM",
      title: `${i.id} — ${i.clientName}`,
      detail: `Overdue since ${i.dueOn} · ${i.currency} ${Math.round(invoiceTotal(i).payable - i.paidAmount).toLocaleString()}`,
      severity: "critical",
      to: "/crm/invoicing",
    }),
  );

  mandates
    .filter((m) => m.rag === "Red")
    .slice(0, 2)
    .forEach((m) =>
      attention.push({
        id: `mnd-${m.id}`,
        module: "CRM",
        title: m.name,
        detail: `${m.clientName} · ${m.progress}% complete · target ${m.targetDate}`,
        severity: "warning",
        to: "/crm/mandates",
      }),
    );

  clients
    .filter((c) => c.kycStatus !== "Approved")
    .slice(0, 2)
    .forEach((c) =>
      attention.push({
        id: `kyc-${c.id}`,
        module: "AML/KYC",
        title: c.name,
        detail: `KYC ${c.kycStatus} · ${c.riskLevel} risk · officer ${c.assignedOfficer}`,
        severity: c.riskLevel === "High" ? "critical" : "warning",
        to: "/clients",
      }),
    );

  leaveRequests
    .filter((l) => l.status === "Pending")
    .slice(0, 2)
    .forEach((l) =>
      attention.push({
        id: `leave-${l.id}`,
        module: "HR",
        title: `${l.employeeName} — ${l.type} leave`,
        detail: `${l.startDate} → ${l.endDate} · awaiting approval`,
        severity: "info",
        to: "/hr/leave",
      }),
    );

  openIncidents.slice(0, 2).forEach((i) =>
    attention.push({
      id: `inc-${i.id}`,
      module: "GRC",
      title: i.title,
      detail: `${i.severity} severity · ${i.status}`,
      severity: i.severity === "Critical" ? "critical" : "warning",
      to: "/grc/risk/incidents",
    }),
  );

  const rank = { critical: 0, warning: 1, info: 2 } as const;
  attention.sort((a, b) => rank[a.severity] - rank[b.severity]);

  // ── Wins / momentum ─────────────────────────────────────────
  const paidThisCycle = pmInvoices
    .filter((i) => i.stage === "Paid")
    .reduce((s, i) => s + i.paidAmount, 0);
  const tasksDone = pmTasks.filter((t) => t.status === "Done").length;
  const dealsWon = deals.deals.filter((d) => d.status === "Completed").length;

  const wins = [
    {
      label: "Collected",
      value: `$${Math.round(paidThisCycle).toLocaleString()}`,
      hint: "Cash received on settled invoices",
    },
    {
      label: "Tasks delivered",
      value: `${tasksDone}/${pmTasks.length}`,
      hint: "Delivery items closed out",
    },
    {
      label: "Deals closed",
      value: dealsWon,
      hint: "Transactions completed",
    },
    {
      label: "Pipeline value",
      value: `$${Math.round(dealValue / 1000)}k`,
      hint: "Value of live deals in flight",
    },
  ];

  const overallScore = Math.round(
    (kycScore + grcScore + crmScore + hrScore) / 4,
  );

  return {
    cards,
    attention,
    wins,
    overallScore,
    counts: {
      openTickets,
      employees: employees.length,
      openRisks: openRisks.length,
      criticalRisks: criticalRisks.length,
      overdueObligations: overdueObligations.length,
      overdueInvoices: overdueInvoices.length,
      atRiskMandates,
    },
  };
}
