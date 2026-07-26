import { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────
// Compliance sub-module store (prototype, localStorage backed).
// Three independent state machines — Obligations, Certifications,
// Policies/Audits (in grcStore) — plus the Regulatory Change
// closed-loop layer that fans out into all of them.
// ─────────────────────────────────────────────────────────────

const KEY = "grc_compliance_v1";
const EVT = "grc_compliance_changed";

export const REGULATORS = [
  "BNR",
  "RRA",
  "RSSB",
  "CMA",
  "FIU",
  "NCSA",
  "MIFOTRA",
  "RDB",
  "Sector-specific",
] as const;
export type Regulator = (typeof REGULATORS)[number];

export const FREQUENCIES = [
  "Annual",
  "Quarterly",
  "Monthly",
  "Ad hoc",
  "Event-driven",
] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export type ObligationStatus = "Compliant" | "Due" | "Overdue" | "Not Applicable";

export type FilingStage =
  | "Not started"
  | "In preparation"
  | "Evidence collected"
  | "Certified"
  | "Submitted"
  | "Receipt confirmed";

export const FILING_STAGES: FilingStage[] = [
  "Not started",
  "In preparation",
  "Evidence collected",
  "Certified",
  "Submitted",
  "Receipt confirmed",
];

export interface Evidence {
  id: string;
  name: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface Filing {
  id: string;
  obligationId: string;
  periodLabel: string;
  dueDate: string;
  stage: FilingStage;
  evidence: Evidence[];
  certifiedBy?: string;
  certifiedAt?: string;
  submittedAt?: string;
  receiptRef?: string;
  notes?: string;
}

export interface ComplianceObligation {
  id: string;
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
  certifier: string;
  reminderDays: number[];
  status: ObligationStatus;
  createdAt: string;
}

export interface Certification {
  id: string;
  name: string;
  issuingBody: string;
  certificateNumber: string;
  issueDate: string;
  expiryDate: string;
  renewalRequirements: string;
  cost: number;
  currency: string;
  responsiblePerson: string;
  leadTimeDays: number;
  renewalStage:
    | "Current"
    | "Renewal initiated"
    | "Documentation gathering"
    | "Application submitted"
    | "Approved"
    | "Expired";
  evidence: Evidence[];
}

export type ChangeUrgency =
  | "Action Required"
  | "Review"
  | "Informational"
  | "Noted";

export interface LoopAction {
  status: "Pending" | "In Progress" | "Done" | "Not Applicable";
  note: string;
  completedAt?: string;
}

export interface RegChange {
  id: string;
  title: string;
  regulator: Regulator;
  publishedAt: string;
  summary: string;
  fullTextRef: string;
  urgency: ChangeUrgency;
  practiceAreas: string[];
  affectedObligationIds: string[];
  affectedPolicyTitles: string[];
  assessmentOwner: string;
  assessmentDeadline: string;
  assessmentNotes: string;
  assessmentStatus: "Unassigned" | "In Progress" | "Complete";
  loop: {
    obligation: LoopAction;
    policy: LoopAction;
    clause: LoopAction;
    advisory: LoopAction;
  };
  loggedAt: string;
}

export interface ComplianceState {
  obligations: ComplianceObligation[];
  filings: Filing[];
  certifications: Certification[];
  changes: RegChange[];
}

export const id = (p: string) =>
  `${p}_${Math.random().toString(36).slice(2, 9)}`;

const today = () => new Date().toISOString().slice(0, 10);
const day = (n: number) =>
  new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString();

const emptyLoop = (): RegChange["loop"] => ({
  obligation: { status: "Pending", note: "" },
  policy: { status: "Pending", note: "" },
  clause: { status: "Pending", note: "" },
  advisory: { status: "Pending", note: "" },
});

function seed(): ComplianceState {
  const obligations: ComplianceObligation[] = [
    {
      id: "cobl_1",
      reference: "OBL-001",
      title: "BNR quarterly TCSP prudential return",
      regulator: "BNR",
      entity: "Lexora Africa Ltd",
      description:
        "Submit the quarterly prudential return covering client asset balances and fiduciary exposures.",
      legalBasis: "BNR Regulation No. 05/2021 on Trust & Company Service Providers, art. 14",
      frequency: "Quarterly",
      nextDueDate: day(12),
      evidenceRequirements:
        "Signed return, supporting trial balance, submission receipt from BNR portal.",
      owner: "Compliance Officer",
      certifier: "Head of Compliance",
      reminderDays: [90, 60, 30, 14, 7],
      status: "Due",
      createdAt: nowIso(),
    },
    {
      id: "cobl_2",
      reference: "OBL-002",
      title: "RRA annual corporate income tax declaration",
      regulator: "RRA",
      entity: "Lexora Africa Ltd",
      description: "File the annual CIT declaration and settle any balance due.",
      legalBasis: "Law No. 027/2022 on Tax Procedures, art. 26",
      frequency: "Annual",
      nextDueDate: day(-6),
      evidenceRequirements: "Filed declaration, payment proof, RRA acknowledgement.",
      owner: "Finance Manager",
      certifier: "CFO",
      reminderDays: [90, 60, 30, 14, 7],
      status: "Overdue",
      createdAt: nowIso(),
    },
    {
      id: "cobl_3",
      reference: "OBL-003",
      title: "RSSB monthly contribution filing",
      regulator: "RSSB",
      entity: "Lexora Africa Ltd",
      description: "Declare and remit staff social security contributions.",
      legalBasis: "Law No. 05/2015 governing the organisation of pension schemes",
      frequency: "Monthly",
      nextDueDate: day(9),
      evidenceRequirements: "Payroll summary, RSSB declaration, bank transfer proof.",
      owner: "HR Manager",
      certifier: "Finance Manager",
      reminderDays: [30, 14, 7],
      status: "Due",
      createdAt: nowIso(),
    },
    {
      id: "cobl_4",
      reference: "OBL-004",
      title: "FIU suspicious transaction reporting readiness attestation",
      regulator: "FIU",
      entity: "Lexora Africa Ltd",
      description:
        "Annual attestation confirming AML/CFT reporting procedures and staff training are in place.",
      legalBasis: "Law No. 75/2019 on AML/CFT, art. 33",
      frequency: "Annual",
      nextDueDate: day(74),
      evidenceRequirements: "Attestation letter, training register, STR log extract.",
      owner: "MLRO",
      certifier: "Head of Compliance",
      reminderDays: [90, 60, 30, 14, 7],
      status: "Compliant",
      createdAt: nowIso(),
    },
    {
      id: "cobl_5",
      reference: "OBL-005",
      title: "NCSA data protection registration renewal filing",
      regulator: "NCSA",
      entity: "Lexora Africa Ltd",
      description: "Confirm data controller registration details and processing register.",
      legalBasis: "Law No. 058/2021 on the protection of personal data, art. 44",
      frequency: "Annual",
      nextDueDate: day(38),
      evidenceRequirements: "Processing register, DPO appointment letter, filing receipt.",
      owner: "DPO",
      certifier: "Head of Compliance",
      reminderDays: [90, 60, 30, 14, 7],
      status: "Due",
      createdAt: nowIso(),
    },
  ];

  const filings: Filing[] = [
    {
      id: "fil_1",
      obligationId: "cobl_1",
      periodLabel: "Q1 2026",
      dueDate: day(-95),
      stage: "Receipt confirmed",
      evidence: [
        { id: id("ev"), name: "Q1-return-signed.pdf", uploadedAt: nowIso(), uploadedBy: "Compliance Officer" },
        { id: id("ev"), name: "BNR-portal-receipt.png", uploadedAt: nowIso(), uploadedBy: "Compliance Officer" },
      ],
      certifiedBy: "Head of Compliance",
      certifiedAt: nowIso(),
      submittedAt: nowIso(),
      receiptRef: "BNR/2026/Q1/00214",
    },
    {
      id: "fil_2",
      obligationId: "cobl_1",
      periodLabel: "Q2 2026",
      dueDate: day(12),
      stage: "In preparation",
      evidence: [
        { id: id("ev"), name: "draft-trial-balance.xlsx", uploadedAt: nowIso(), uploadedBy: "Finance Analyst" },
      ],
    },
    {
      id: "fil_3",
      obligationId: "cobl_2",
      periodLabel: "FY 2025",
      dueDate: day(-6),
      stage: "Evidence collected",
      evidence: [
        { id: id("ev"), name: "CIT-declaration-draft.pdf", uploadedAt: nowIso(), uploadedBy: "Finance Manager" },
      ],
      notes: "Awaiting CFO certification — escalated.",
    },
    {
      id: "fil_4",
      obligationId: "cobl_3",
      periodLabel: "June 2026",
      dueDate: day(9),
      stage: "Not started",
      evidence: [],
    },
  ];

  const certifications: Certification[] = [
    {
      id: "cert_1",
      name: "BNR TCSP operating licence",
      issuingBody: "National Bank of Rwanda",
      certificateNumber: "TCSP/0042/2024",
      issueDate: day(-500),
      expiryDate: day(46),
      renewalRequirements:
        "Renewal application, audited financials, fit & proper declarations for directors, licence fee.",
      cost: 2500000,
      currency: "RWF",
      responsiblePerson: "Head of Compliance",
      leadTimeDays: 90,
      renewalStage: "Renewal initiated",
      evidence: [],
    },
    {
      id: "cert_2",
      name: "CMA advisory licence",
      issuingBody: "Capital Market Authority",
      certificateNumber: "CMA/ADV/118",
      issueDate: day(-300),
      expiryDate: day(180),
      renewalRequirements: "Annual return, compliance officer confirmation, renewal fee.",
      cost: 1200000,
      currency: "RWF",
      responsiblePerson: "Managing Partner",
      leadTimeDays: 60,
      renewalStage: "Current",
      evidence: [],
    },
    {
      id: "cert_3",
      name: "NCSA data controller registration",
      issuingBody: "National Cyber Security Authority",
      certificateNumber: "NCSA/DC/2025/771",
      issueDate: day(-200),
      expiryDate: day(-12),
      renewalRequirements: "Updated processing register, DPO details, renewal form.",
      cost: 400000,
      currency: "RWF",
      responsiblePerson: "DPO",
      leadTimeDays: 45,
      renewalStage: "Application submitted",
      evidence: [],
    },
    {
      id: "cert_4",
      name: "RDB company registration (annual return)",
      issuingBody: "Rwanda Development Board",
      certificateNumber: "RDB/107839221",
      issueDate: day(-700),
      expiryDate: day(120),
      renewalRequirements: "Annual return filing, beneficial ownership confirmation.",
      cost: 150000,
      currency: "RWF",
      responsiblePerson: "Company Secretary",
      leadTimeDays: 30,
      renewalStage: "Current",
      evidence: [],
    },
  ];

  const changes: RegChange[] = [
    {
      id: "chg_1",
      title: "BNR Directive 03/2026 — enhanced beneficial ownership verification",
      regulator: "BNR",
      publishedAt: day(-9),
      summary:
        "TCSPs must verify beneficial ownership against the RDB register at onboarding and on every annual review, and retain verification evidence for ten years. Quarterly prudential returns gain a new BO-verification completeness field.",
      fullTextRef: "Legal Library › BNR › Directive 03/2026",
      urgency: "Action Required",
      practiceAreas: ["Corporate Services", "AML/CFT", "Client Onboarding"],
      affectedObligationIds: ["cobl_1", "cobl_4"],
      affectedPolicyTitles: ["AML/CFT Policy", "Client Onboarding Policy"],
      assessmentOwner: "Head of Compliance",
      assessmentDeadline: day(5),
      assessmentNotes:
        "Two obligations and two policies affected. Onboarding clause set in Contract Builder needs a BO-verification warranty.",
      assessmentStatus: "In Progress",
      loop: {
        obligation: {
          status: "Done",
          note: "OBL-001 evidence requirements updated with BO verification field.",
          completedAt: nowIso(),
        },
        policy: { status: "In Progress", note: "AML/CFT Policy sent back to review cycle." },
        clause: { status: "Pending", note: "BO warranty clause flagged for revision." },
        advisory: { status: "Pending", note: "Client advisory note to be drafted." },
      },
      loggedAt: nowIso(),
    },
    {
      id: "chg_2",
      title: "RRA public notice — e-invoicing thresholds lowered",
      regulator: "RRA",
      publishedAt: day(-21),
      summary:
        "The EBM e-invoicing obligation now applies to all taxpayers with annual turnover above RWF 20m, down from RWF 50m. Effective start of the next tax quarter.",
      fullTextRef: "Legal Library › RRA › Public Notice 2026/07",
      urgency: "Review",
      practiceAreas: ["Tax", "Finance Operations"],
      affectedObligationIds: ["cobl_2"],
      affectedPolicyTitles: ["Finance & Procurement Policy"],
      assessmentOwner: "Finance Manager",
      assessmentDeadline: day(14),
      assessmentNotes: "",
      assessmentStatus: "Unassigned",
      loop: emptyLoop(),
    },
    {
      id: "chg_3",
      title: "NCSA guidance on cross-border personal data transfers",
      regulator: "NCSA",
      publishedAt: day(-34),
      summary:
        "Guidance clarifying adequacy assessments and standard contractual clauses for transfers outside Rwanda. No new filing obligation, but processing registers should record transfer safeguards.",
      fullTextRef: "Legal Library › NCSA › Guidance Note 2/2026",
      urgency: "Informational",
      practiceAreas: ["Data Protection"],
      affectedObligationIds: ["cobl_5"],
      affectedPolicyTitles: ["Data Protection Policy"],
      assessmentOwner: "DPO",
      assessmentDeadline: day(-4),
      assessmentNotes: "Register updated; no obligation change required.",
      assessmentStatus: "Complete",
      loop: {
        obligation: { status: "Not Applicable", note: "No change to filing requirements." },
        policy: { status: "Done", note: "Data Protection Policy v3.1 published.", completedAt: nowIso() },
        clause: { status: "Not Applicable", note: "" },
        advisory: { status: "Done", note: "Included in June client bulletin.", completedAt: nowIso() },
      },
      loggedAt: nowIso(),
    },
  ];

  return { obligations, filings, certifications, changes };
}

// ─────────────────────────────────────────────────────────────
// Store plumbing
// ─────────────────────────────────────────────────────────────

function read(): ComplianceState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as ComplianceState;
  } catch {
    /* ignore */
  }
  const s = seed();
  localStorage.setItem(KEY, JSON.stringify(s));
  return s;
}

export function getCompliance(): ComplianceState {
  return read();
}

export function mutateCompliance(
  fn: (s: ComplianceState) => ComplianceState,
): void {
  const next = fn(read());
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVT));
}

export function resetCompliance() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVT));
}

export function useCompliance(): ComplianceState {
  const [state, setState] = useState<ComplianceState>(() => read());
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

// ─────────────────────────────────────────────────────────────
// Derivations
// ─────────────────────────────────────────────────────────────

export function daysUntil(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00").getTime();
  const t = new Date(today() + "T00:00:00").getTime();
  return Math.round((d - t) / 86400000);
}

export function obligationStatus(o: ComplianceObligation): ObligationStatus {
  if (o.status === "Not Applicable") return "Not Applicable";
  const d = daysUntil(o.nextDueDate);
  if (d < 0) return "Overdue";
  if (d <= 30) return "Due";
  return o.status === "Overdue" ? "Due" : o.status;
}

/** Next reminder milestone that has been passed for an obligation. */
export function activeReminder(o: ComplianceObligation): number | null {
  const d = daysUntil(o.nextDueDate);
  if (d < 0) return null;
  const hit = o.reminderDays.filter((r) => d <= r).sort((a, b) => a - b);
  return hit.length ? hit[0] : null;
}

export const ESCALATION_WINDOW: Record<string, number> = {
  Critical: 30,
  High: 60,
  Medium: 90,
  Low: 180,
};

export function nextDueAfter(from: string, freq: Frequency): string {
  const d = new Date(from + "T00:00:00");
  if (freq === "Monthly") d.setMonth(d.getMonth() + 1);
  else if (freq === "Quarterly") d.setMonth(d.getMonth() + 3);
  else if (freq === "Annual") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export function periodLabelFor(date: string, freq: Frequency): string {
  const d = new Date(date + "T00:00:00");
  if (freq === "Annual") return `FY ${d.getFullYear()}`;
  if (freq === "Quarterly") return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
  if (freq === "Monthly")
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return d.toISOString().slice(0, 10);
}

export const todayStr = today;
