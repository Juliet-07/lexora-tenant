import { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────
// GRC prototype store — single localStorage source of truth for
// the whole GRC module. All entities live here so cross-module
// widgets (dashboard, appetite vs. actual) can aggregate easily.
// ─────────────────────────────────────────────────────────────

const KEY = "grc_store_v2";
const EVT = "grc_store_changed";

export type RiskCategory =
  | "Strategic"
  | "Operational"
  | "Financial"
  | "Compliance"
  | "Reputational"
  | "Information Security";

export const RISK_CATEGORIES: RiskCategory[] = [
  "Strategic",
  "Operational",
  "Financial",
  "Compliance",
  "Reputational",
  "Information Security",
];

export type Zone = "Green" | "Amber" | "Red";
export type Band = "Low" | "Medium" | "High" | "Extreme";

export interface AppetiteEntry {
  category: RiskCategory;
  posture: "Averse" | "Cautious" | "Open" | "Hungry";
  qualitative: string;
  maxLossPerEvent: number;
  maxAggregateExposure: number;
  amberThresholdPct: number; // % of red threshold that flips to amber
}

export interface AppetiteVersion {
  id: string;
  createdAt: string;
  note: string;
  entries: AppetiteEntry[];
}

export interface RiskControlLink {
  controlId: string;
  effectiveness: "Effective" | "Partially Effective" | "Ineffective" | "Not Tested";
}

export interface RiskChange {
  at: string;
  note: string;
}

export interface Risk {
  id: string;
  title: string;
  category: RiskCategory;
  description: string;
  rootCauses: string;
  affectedProcesses: string;
  owner: string;
  likelihood: number; // 1-5
  impact: number; // 1-5
  financialExposure: number;
  controls: RiskControlLink[];
  relatedRiskIds: string[];
  status: "Open" | "Monitoring" | "Closed";
  nextReviewDate: string;
  createdAt: string;
  updatedAt: string;
  submittedBy?: string; // for employee-submitted
  changes: RiskChange[];
}

export interface Control {
  id: string;
  code: string;
  name: string;
  objective: string;
  type: "Preventive" | "Detective" | "Corrective";
  owner: string;
  frequency: "Continuous" | "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Annual";
  createdAt: string;
}

export interface ControlTest {
  id: string;
  controlId: string;
  testedAt: string;
  outcome: "Pass" | "Fail";
  effectiveness: "Effective" | "Partially Effective" | "Ineffective" | "Not Tested";
  notes: string;
}

export interface Deficiency {
  id: string;
  controlId: string;
  testId?: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  rootCause: string;
  remediationDeadline: string;
  status: "Open" | "In Progress" | "Remediated";
  openedAt: string;
}

export interface TreatmentPlan {
  id: string;
  riskId: string;
  strategy: "Avoid" | "Reduce" | "Transfer" | "Accept";
  justification: string;
  targetResidualLevel: Band;
  actions: string;
  resourceNeeds: string;
  owner: string;
  timeline: string;
  successCriteria: string;
  investment: number;
  approvalStatus: "Draft" | "Pending Approval" | "Approved" | "Rejected";
  createdAt: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  category: "Security" | "Operational" | "Compliance" | "Fraud" | "Error" | "System Outage";
  severity: "Critical" | "High" | "Medium" | "Low";
  reportedBy: string;
  reportedAt: string;
  investigator?: string;
  dueDate?: string;
  status: "Reported" | "Investigating" | "Awaiting Sign-off" | "Closed";
  rcaMethod?: "5 Whys" | "Fishbone";
  rcaNotes?: string;
  correctiveActions?: string;
  preventiveActions?: string;
  lessonsLearned?: string;
  signOffBy?: string;
  closedAt?: string;
}

export interface Obligation {
  id: string;
  title: string;
  regulationType: "BNR" | "Data Protection" | "Labour Law" | "Tax Law" | "Company Law" | "AML" | "Other";
  source: string;
  description: string;
  owner: string;
  deadline: string;
  frequency: "One-off" | "Monthly" | "Quarterly" | "Annual";
  status: "Pending" | "In Progress" | "Completed" | "Overdue";
  evidence: { name: string; uploadedAt: string }[];
  signedOffBy?: string;
  completedAt?: string;
}

export interface RegulatoryChange {
  id: string;
  title: string;
  regulationType: Obligation["regulationType"];
  summary: string;
  impact: "High" | "Medium" | "Low";
  affectedObligationIds: string[];
  loggedAt: string;
}

export interface PolicyVersion {
  version: number;
  content: string;
  updatedAt: string;
  note: string;
}

export interface PolicyAck {
  employeeId: string;
  employeeName: string;
  ackAt?: string;
}

export interface Policy {
  id: string;
  title: string;
  category: string;
  status: "Draft" | "In Review" | "Approved" | "Published" | "Archived";
  currentVersion: number;
  versions: PolicyVersion[];
  requiredAudience: "All Employees" | "Department" | "Role";
  audienceNote: string;
  acknowledgments: PolicyAck[];
  nextReviewDate: string;
  trainingRequired: boolean;
  publishedAt?: string;
}

export interface AuditRequest {
  id: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: "Requested" | "Received" | "Overdue";
}

export interface AuditFinding {
  id: string;
  observation: string;
  condition: string;
  criteria: string;
  cause: string;
  consequence: string;
  recommendation: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  managementResponse?: string;
  remediationDueDate?: string;
  status: "Open" | "In Progress" | "Remediated" | "Closed";
  createdAt: string;
}

export interface AuditEngagement {
  id: string;
  name: string;
  type: "Internal" | "External";
  scope: string;
  startDate: string;
  endDate: string;
  status: "Planned" | "In Progress" | "Reporting" | "Closed";
  requests: AuditRequest[];
  findings: AuditFinding[];
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  services: string;
  contractStart: string;
  contractEnd: string;
  riskRating: Band;
  status: "Active" | "Under Review" | "Terminated";
  dueDiligence: {
    financialStability: "Strong" | "Adequate" | "Weak";
    cybersecurityPosture: "Strong" | "Adequate" | "Weak";
    bcp: "Documented" | "Partial" | "None";
    complianceStatus: "Compliant" | "Issues" | "Unknown";
    reputation: "Good" | "Neutral" | "Concerns";
  };
  nextReviewDate: string;
  ratingHistory: { at: string; rating: Band; note: string }[];
  terminationReason?: string;
  terminatedAt?: string;
}

export interface BcpPlan {
  id: string;
  title: string;
  version: number;
  updatedAt: string;
  content: string;
}

export interface BcpTest {
  id: string;
  planId: string;
  testedAt: string;
  outcome: "Pass" | "Partial" | "Fail";
  notes: string;
}

export interface RtoRpo {
  id: string;
  system: string;
  rtoHours: number;
  rpoHours: number;
  criticality: "Tier 1" | "Tier 2" | "Tier 3";
}

export interface CrisisContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  escalationOrder: number;
}

export interface GrcState {
  appetite: AppetiteEntry[];
  appetiteHistory: AppetiteVersion[];
  risks: Risk[];
  controls: Control[];
  controlTests: ControlTest[];
  deficiencies: Deficiency[];
  treatmentPlans: TreatmentPlan[];
  incidents: Incident[];
  obligations: Obligation[];
  regulatoryChanges: RegulatoryChange[];
  policies: Policy[];
  audits: AuditEngagement[];
  vendors: Vendor[];
  bcpPlans: BcpPlan[];
  bcpTests: BcpTest[];
  rtoRpo: RtoRpo[];
  crisisContacts: CrisisContact[];
}

// ─────────────────────────────────────────────────────────────
// Seed
// ─────────────────────────────────────────────────────────────

const now = () => new Date().toISOString();
const daysFromNow = (n: number) =>
  new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const defaultAppetite: AppetiteEntry[] = RISK_CATEGORIES.map((c) => ({
  category: c,
  posture:
    c === "Compliance" || c === "Information Security" ? "Averse" : "Cautious",
  qualitative:
    c === "Compliance"
      ? "Zero tolerance for regulatory breaches."
      : "Balanced posture with proactive mitigation.",
  maxLossPerEvent: 250000,
  maxAggregateExposure: 1000000,
  amberThresholdPct: 70,
}));

function seed(): GrcState {
  const c1: Control = {
    id: "ctl_1",
    code: "CTL-001",
    name: "Quarterly access review",
    objective: "Ensure user access to core systems is appropriate.",
    type: "Detective",
    owner: "IT Security Lead",
    frequency: "Quarterly",
    createdAt: now(),
  };
  const c2: Control = {
    id: "ctl_2",
    code: "CTL-002",
    name: "Payment approval segregation",
    objective: "Two-person approval on all payments above threshold.",
    type: "Preventive",
    owner: "Finance Manager",
    frequency: "Continuous",
    createdAt: now(),
  };
  const c3: Control = {
    id: "ctl_3",
    code: "CTL-003",
    name: "Vendor DD refresh",
    objective: "Annual reassessment of critical vendors.",
    type: "Preventive",
    owner: "Procurement Lead",
    frequency: "Annual",
    createdAt: now(),
  };

  const r1: Risk = {
    id: "rsk_1",
    title: "Data breach via third-party integration",
    category: "Information Security",
    description:
      "A vulnerability in a connected vendor system could expose customer data.",
    rootCauses: "Weak vendor security posture; limited monitoring.",
    affectedProcesses: "Customer data pipeline, CRM sync",
    owner: "CISO",
    likelihood: 3,
    impact: 5,
    financialExposure: 800000,
    controls: [{ controlId: "ctl_1", effectiveness: "Partially Effective" }],
    relatedRiskIds: [],
    status: "Open",
    nextReviewDate: daysFromNow(30),
    createdAt: now(),
    updatedAt: now(),
    changes: [{ at: now(), note: "Risk created" }],
  };
  const r2: Risk = {
    id: "rsk_2",
    title: "Fraudulent payment processing",
    category: "Financial",
    description: "Insider or external actor initiates unauthorized payment.",
    rootCauses: "Manual controls, limited system enforcement.",
    affectedProcesses: "AP, treasury",
    owner: "CFO",
    likelihood: 2,
    impact: 4,
    financialExposure: 400000,
    controls: [{ controlId: "ctl_2", effectiveness: "Effective" }],
    relatedRiskIds: [],
    status: "Monitoring",
    nextReviewDate: daysFromNow(90),
    createdAt: now(),
    updatedAt: now(),
    changes: [{ at: now(), note: "Risk created" }],
  };
  const r3: Risk = {
    id: "rsk_3",
    title: "Regulatory non-compliance — data protection",
    category: "Compliance",
    description: "Failure to meet data protection filing requirements.",
    rootCauses: "Manual tracking, unclear ownership.",
    affectedProcesses: "Compliance filings",
    owner: "Compliance Officer",
    likelihood: 3,
    impact: 4,
    financialExposure: 200000,
    controls: [],
    relatedRiskIds: ["rsk_1"],
    status: "Open",
    nextReviewDate: daysFromNow(14),
    createdAt: now(),
    updatedAt: now(),
    changes: [{ at: now(), note: "Risk created" }],
  };

  return {
    appetite: defaultAppetite,
    appetiteHistory: [
      {
        id: "apv_1",
        createdAt: now(),
        note: "Initial Board-approved appetite statement.",
        entries: defaultAppetite,
      },
    ],
    risks: [r1, r2, r3],
    controls: [c1, c2, c3],
    controlTests: [
      {
        id: "tst_1",
        controlId: "ctl_1",
        testedAt: now(),
        outcome: "Pass",
        effectiveness: "Partially Effective",
        notes: "Some inactive accounts not disabled promptly.",
      },
    ],
    deficiencies: [
      {
        id: "def_1",
        controlId: "ctl_1",
        testId: "tst_1",
        severity: "Medium",
        rootCause: "Manual disablement process lags HR offboarding.",
        remediationDeadline: daysFromNow(60),
        status: "Open",
        openedAt: now(),
      },
    ],
    treatmentPlans: [
      {
        id: "trt_1",
        riskId: "rsk_1",
        strategy: "Reduce",
        justification: "Cannot avoid vendor; reduce via monitoring.",
        targetResidualLevel: "Medium",
        actions: "Deploy DLP, enhance vendor SLA, quarterly attestations.",
        resourceNeeds: "Security budget $80k, 1 FTE",
        owner: "CISO",
        timeline: "Q1–Q2 2026",
        successCriteria: "Residual score ≤ 8, no incidents in 6 months.",
        investment: 80000,
        approvalStatus: "Approved",
        createdAt: now(),
      },
    ],
    incidents: [
      {
        id: "inc_1",
        title: "Brief system outage — CRM",
        description: "CRM was unreachable for ~20 minutes.",
        category: "System Outage",
        severity: "Medium",
        reportedBy: "Ops Analyst",
        reportedAt: now(),
        status: "Investigating",
        investigator: "IT Lead",
        dueDate: daysFromNow(7),
      },
    ],
    obligations: [
      {
        id: "obl_1",
        title: "Annual data protection filing",
        regulationType: "Data Protection",
        source: "Data Protection Authority",
        description: "Submit annual DPO report.",
        owner: "Compliance Officer",
        deadline: daysFromNow(45),
        frequency: "Annual",
        status: "Pending",
        evidence: [],
      },
      {
        id: "obl_2",
        title: "Quarterly tax return",
        regulationType: "Tax Law",
        source: "Revenue Authority",
        description: "Corporate income tax quarterly return.",
        owner: "Finance Manager",
        deadline: daysFromNow(20),
        frequency: "Quarterly",
        status: "In Progress",
        evidence: [],
      },
    ],
    regulatoryChanges: [
      {
        id: "reg_1",
        title: "New data-portability requirement",
        regulationType: "Data Protection",
        summary:
          "Amendment introduces a 30-day portability response window for controllers. Data subjects can now request structured export of their personal data in a common, machine-readable format. In-scope controllers must adjust internal SLAs, update privacy notices, and confirm technical export paths for every production data store.",
        impact: "Medium",
        affectedObligationIds: ["obl_1"],
        loggedAt: now(),
      },
      {
        id: "reg_2",
        title: "BNR directive on operational-risk reporting",
        regulationType: "BNR",
        summary:
          "The central bank has published Directive 04/2026 requiring quarterly submission of operational-risk incidents above a materiality threshold. Reporting templates and severity taxonomy must align with the new schema effective next quarter.",
        impact: "High",
        affectedObligationIds: [],
        loggedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
      {
        id: "reg_3",
        title: "Labour Law — parental leave extension",
        regulationType: "Labour Law",
        summary:
          "Maternity leave extended from 12 to 14 weeks; new 4-week paid paternity leave introduced. HR policies, payroll accruals, and employment contract templates must be updated before the effective date.",
        impact: "Medium",
        affectedObligationIds: [],
        loggedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
      {
        id: "reg_4",
        title: "AML — beneficial-ownership threshold lowered",
        regulationType: "AML",
        summary:
          "The beneficial-ownership disclosure threshold has been lowered from 25% to 10% for reporting entities in the financial sector. Existing customer files require re-screening and updated ownership charts within 180 days.",
        impact: "High",
        affectedObligationIds: [],
        loggedAt: new Date(Date.now() - 21 * 86400000).toISOString(),
      },
      {
        id: "reg_5",
        title: "Tax Law — quarterly VAT filing format change",
        regulationType: "Tax Law",
        summary:
          "Revenue authority migrates quarterly VAT filings to the new XML-based schema. Legacy CSV uploads will be rejected from the next filing cycle onward.",
        impact: "Low",
        affectedObligationIds: ["obl_2"],
        loggedAt: new Date(Date.now() - 35 * 86400000).toISOString(),
      },
    ],
    policies: [
      {
        id: "pol_1",
        title: "Acceptable Use Policy",
        category: "IT & Security",
        status: "Published",
        currentVersion: 1,
        versions: [
          {
            version: 1,
            content:
              "All employees must use company systems responsibly and only for authorized purposes.",
            updatedAt: now(),
            note: "Initial publication.",
          },
        ],
        requiredAudience: "All Employees",
        audienceNote: "Every employee, on hire and annually.",
        acknowledgments: [
          { employeeId: "e1", employeeName: "Aline U.", ackAt: now() },
          { employeeId: "e2", employeeName: "Jean B." },
          { employeeId: "e3", employeeName: "Sophie N." },
        ],
        nextReviewDate: daysFromNow(180),
        trainingRequired: false,
        publishedAt: now(),
      },
    ],
    audits: [
      {
        id: "aud_1",
        name: "FY25 Internal audit — Finance controls",
        type: "Internal",
        scope: "Payment processing, expense approvals, month-end close.",
        startDate: daysFromNow(-15),
        endDate: daysFromNow(45),
        status: "In Progress",
        requests: [
          {
            id: "req_1",
            description: "Bank reconciliations for last 6 months",
            assignedTo: "Finance Manager",
            dueDate: daysFromNow(7),
            status: "Requested",
          },
        ],
        findings: [
          {
            id: "fnd_1",
            observation: "Segregation of duties gap in payment approval.",
            condition: "Same user creates and approves payments below threshold.",
            criteria: "Company policy requires dual approval.",
            cause: "System role setup permits both actions.",
            consequence: "Increased fraud risk.",
            recommendation: "Reconfigure roles to enforce separation.",
            severity: "High",
            managementResponse: "Agreed. Will remediate in 30 days.",
            remediationDueDate: daysFromNow(30),
            status: "In Progress",
            createdAt: now(),
          },
        ],
      },
    ],
    vendors: [
      {
        id: "ven_1",
        name: "CloudOps Ltd",
        category: "Cloud Infrastructure",
        services: "Hosting, backups, DR",
        contractStart: daysFromNow(-400),
        contractEnd: daysFromNow(60),
        riskRating: "High",
        status: "Active",
        dueDiligence: {
          financialStability: "Strong",
          cybersecurityPosture: "Adequate",
          bcp: "Documented",
          complianceStatus: "Compliant",
          reputation: "Good",
        },
        nextReviewDate: daysFromNow(30),
        ratingHistory: [
          { at: now(), rating: "High", note: "Initial assessment." },
        ],
      },
      {
        id: "ven_2",
        name: "Print & Post Co",
        category: "Facilities",
        services: "Statement printing & mailing",
        contractStart: daysFromNow(-200),
        contractEnd: daysFromNow(200),
        riskRating: "Low",
        status: "Active",
        dueDiligence: {
          financialStability: "Adequate",
          cybersecurityPosture: "Adequate",
          bcp: "Partial",
          complianceStatus: "Compliant",
          reputation: "Neutral",
        },
        nextReviewDate: daysFromNow(120),
        ratingHistory: [
          { at: now(), rating: "Low", note: "Initial assessment." },
        ],
      },
    ],
    bcpPlans: [
      {
        id: "bcp_1",
        title: "Enterprise BCP",
        version: 2,
        updatedAt: now(),
        content:
          "Enterprise-wide continuity plan covering people, systems, facilities, and communications.",
      },
    ],
    bcpTests: [
      {
        id: "bt_1",
        planId: "bcp_1",
        testedAt: now(),
        outcome: "Partial",
        notes: "Failover succeeded; comms tree had two stale numbers.",
      },
    ],
    rtoRpo: [
      { id: "rt_1", system: "Core banking", rtoHours: 2, rpoHours: 1, criticality: "Tier 1" },
      { id: "rt_2", system: "CRM", rtoHours: 8, rpoHours: 4, criticality: "Tier 2" },
      { id: "rt_3", system: "Reporting warehouse", rtoHours: 24, rpoHours: 12, criticality: "Tier 3" },
    ],
    crisisContacts: [
      { id: "cc_1", name: "CEO", role: "Executive owner", phone: "+250 788 000 001", escalationOrder: 1 },
      { id: "cc_2", name: "COO", role: "Operations lead", phone: "+250 788 000 002", escalationOrder: 2 },
      { id: "cc_3", name: "CISO", role: "Security lead", phone: "+250 788 000 003", escalationOrder: 3 },
    ],
  };
}

// ─────────────────────────────────────────────────────────────
// Read/write
// ─────────────────────────────────────────────────────────────

function read(): GrcState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const s = seed();
  localStorage.setItem(KEY, JSON.stringify(s));
  return s;
}

function write(next: GrcState) {
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useGrc() {
  const [state, setState] = useState<GrcState>(() => read());
  useEffect(() => {
    const h = () => setState(read());
    window.addEventListener(EVT, h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener(EVT, h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return state;
}

export function mutateGrc(fn: (s: GrcState) => GrcState) {
  const next = fn(read());
  write(next);
}

export const id = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

export function inherentScore(r: Pick<Risk, "likelihood" | "impact">) {
  return r.likelihood * r.impact;
}

export function residualScore(r: Risk) {
  const inh = inherentScore(r);
  if (r.controls.length === 0) return inh;
  const reduction = r.controls.reduce((acc, c) => {
    const factor =
      c.effectiveness === "Effective"
        ? 0.4
        : c.effectiveness === "Partially Effective"
          ? 0.25
          : c.effectiveness === "Ineffective"
            ? 0.1
            : 0;
    return acc + factor;
  }, 0);
  return Math.max(1, Math.round(inh * (1 - Math.min(0.75, reduction))));
}

export function scoreToBand(score: number): Band {
  if (score >= 20) return "Extreme";
  if (score >= 12) return "High";
  if (score >= 6) return "Medium";
  return "Low";
}

export function bandTone(b: Band): string {
  return b === "Extreme"
    ? "bg-rose-500/15 text-rose-600 border-rose-500/30"
    : b === "High"
      ? "bg-orange-500/15 text-orange-600 border-orange-500/30"
      : b === "Medium"
        ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
        : "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
}

export function zoneTone(z: Zone): string {
  return z === "Red"
    ? "bg-rose-500/15 text-rose-600 border-rose-500/30"
    : z === "Amber"
      ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
      : "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
}

export function riskZone(r: Risk, appetite: AppetiteEntry[]): Zone {
  const a = appetite.find((x) => x.category === r.category);
  if (!a) return "Green";
  const ratio = r.financialExposure / a.maxLossPerEvent;
  if (ratio >= 1) return "Red";
  if (ratio >= a.amberThresholdPct / 100) return "Amber";
  return "Green";
}

export function reviewFrequencyDays(b: Band): number {
  return b === "Extreme" ? 30 : b === "High" ? 90 : b === "Medium" ? 180 : 730;
}

export function remediationDeadlineDays(sev: Deficiency["severity"]): number {
  return sev === "Critical" ? 30 : sev === "High" ? 60 : sev === "Medium" ? 90 : 180;
}

export function grcHealthScore(s: GrcState): number {
  // 0-100 composite based on: risk load, overdue obligations, open incidents, control effectiveness.
  const risks = s.risks.filter((r) => r.status !== "Closed");
  const bandPenalty = risks.reduce((acc, r) => {
    const b = scoreToBand(residualScore(r));
    return acc + (b === "Extreme" ? 8 : b === "High" ? 4 : b === "Medium" ? 1 : 0);
  }, 0);
  const today = new Date().toISOString().slice(0, 10);
  const overdueObl = s.obligations.filter(
    (o) => o.status !== "Completed" && o.deadline < today,
  ).length;
  const openInc = s.incidents.filter((i) => i.status !== "Closed").length;
  const openDef = s.deficiencies.filter((d) => d.status !== "Remediated").length;
  const raw =
    100 - bandPenalty - overdueObl * 5 - openInc * 3 - openDef * 2;
  return Math.max(0, Math.min(100, Math.round(raw)));
}
