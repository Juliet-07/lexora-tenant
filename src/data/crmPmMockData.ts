// ────────────────────────────────────────────────────────────
// CRM & PM Module — dummy data for Sections 2, 4, 5, 6, 9
// (Overview Dashboard, Projects, Finance, Tools, Collaboration)
// Everything here is mock data used to demonstrate the flows.
// ────────────────────────────────────────────────────────────

export type MandateStage =
  | "Create"
  | "Setup"
  | "Deliver"
  | "Review"
  | "Bill"
  | "Close";

export const MANDATE_STAGES: MandateStage[] = [
  "Create",
  "Setup",
  "Deliver",
  "Review",
  "Bill",
  "Close",
];

export const MANDATE_STAGE_META: Record<
  MandateStage,
  { owner: string; trigger: string }
> = {
  Create: {
    owner: "Manager",
    trigger:
      "Manual entry, engagement win, or onboarding handoff. Type selected, template applied, conflict check run.",
  },
  Setup: {
    owner: "Manager",
    trigger:
      "Template engine — team assigned, tasks created, Gantt scheduled, budget set, fee structure confirmed, client notified via portal.",
  },
  Deliver: {
    owner: "Team",
    trigger:
      "Ongoing — tasks worked, time logged, documents produced, client comms via portal, tickets handled, team collaborates via @mentions.",
  },
  Review: {
    owner: "Manager",
    trigger:
      "Milestone trigger — quality checks, client feedback, budget vs actual, RAG status updated, issues escalated to PMO.",
  },
  Bill: {
    owner: "Finance",
    trigger:
      "Billing cycle — approved timesheets generate WIP, invoices raised, sent via portal, payment tracked, trust drawdowns processed.",
  },
  Close: {
    owner: "Manager",
    trigger:
      "Checklist validation — closure checklist completed, final invoice raised, trust balance cleared, documents archived, survey sent.",
  },
};

export type Rag = "Green" | "Amber" | "Red";

export interface Mandate {
  id: string;
  ref: string;
  name: string;
  clientName: string;
  type: string;
  stage: MandateStage;
  rag: Rag;
  manager: string;
  team: string[];
  teamId?: string;
  teamName?: string;
  startDate: string;
  targetDate: string;
  budget: number;
  actualCost: number;
  billed: number;
  wip: number;
  feeStructure: "Fixed fee" | "Time & materials" | "Retainer" | "Capped fee";
  progress: number;
  conflictCheck: "Cleared" | "Pending" | "Flagged";
  currency: string;
  closureChecklist: { label: string; done: boolean }[];
}

export const mandates: Mandate[] = [
  {
    id: "MND-001",
    ref: "M-2026-001",
    name: "Annual Statutory Audit 2026",
    clientName: "Meridian Holdings Ltd",
    type: "Audit",
    stage: "Deliver",
    rag: "Green",
    manager: "Sarah Chen",
    teamId: "TEAM-AUD",
    teamName: "Audit Team",
    team: ["David Park", "Chris Evans"],
    startDate: "2026-02-01",
    targetDate: "2026-09-30",
    budget: 320000,
    actualCost: 168000,
    billed: 140000,
    wip: 46500,
    feeStructure: "Fixed fee",
    progress: 58,
    conflictCheck: "Cleared",
    currency: "USD",
    closureChecklist: [
      { label: "Deliverables signed off by client", done: false },
      { label: "Final invoice raised", done: false },
      { label: "Trust balance cleared / refunded", done: false },
      { label: "Documents archived", done: false },
      { label: "Satisfaction survey sent", done: false },
    ],
  },
  {
    id: "MND-002",
    ref: "M-2026-002",
    name: "Corporate Restructuring Phase 2",
    clientName: "Greenfield Capital Partners",
    type: "Advisory",
    stage: "Review",
    rag: "Amber",
    manager: "Michael Torres",
    teamId: "TEAM-ADV",
    teamName: "Advisory Team",
    team: ["Ana Rodriguez", "Sarah Chen"],
    startDate: "2026-01-15",
    targetDate: "2026-08-15",
    budget: 260000,
    actualCost: 214000,
    billed: 180000,
    wip: 28400,
    feeStructure: "Time & materials",
    progress: 74,
    conflictCheck: "Cleared",
    currency: "USD",
    closureChecklist: [
      { label: "Deliverables signed off by client", done: false },
      { label: "Final invoice raised", done: false },
      { label: "Trust balance cleared / refunded", done: false },
      { label: "Documents archived", done: false },
      { label: "Satisfaction survey sent", done: false },
    ],
  },
  {
    id: "MND-003",
    ref: "M-2026-003",
    name: "Tanaka — FY27 Expansion Advisory",
    clientName: "Tanaka Enterprises",
    type: "Transaction",
    stage: "Setup",
    rag: "Green",
    manager: "David Park",
    teamId: "TEAM-TRX",
    teamName: "Transactions Team",
    team: ["Chris Evans"],
    startDate: "2026-06-01",
    targetDate: "2027-01-31",
    budget: 320000,
    actualCost: 22000,
    billed: 0,
    wip: 12800,
    feeStructure: "Capped fee",
    progress: 12,
    conflictCheck: "Pending",
    currency: "USD",
    closureChecklist: [
      { label: "Deliverables signed off by client", done: false },
      { label: "Final invoice raised", done: false },
      { label: "Trust balance cleared / refunded", done: false },
      { label: "Documents archived", done: false },
      { label: "Satisfaction survey sent", done: false },
    ],
  },
  {
    id: "MND-004",
    ref: "M-2026-004",
    name: "Compliance Retainer — Helios",
    clientName: "Helios Renewables",
    type: "Compliance",
    stage: "Bill",
    rag: "Green",
    manager: "Sarah Chen",
    teamId: "TEAM-CMP",
    teamName: "Compliance Team",
    team: ["Ana Rodriguez"],
    startDate: "2026-03-01",
    targetDate: "2027-02-28",
    budget: 180000,
    actualCost: 96000,
    billed: 90000,
    wip: 18200,
    feeStructure: "Retainer",
    progress: 52,
    conflictCheck: "Cleared",
    currency: "EUR",
    closureChecklist: [
      { label: "Deliverables signed off by client", done: false },
      { label: "Final invoice raised", done: false },
      { label: "Trust balance cleared / refunded", done: false },
      { label: "Documents archived", done: false },
      { label: "Satisfaction survey sent", done: false },
    ],
  },
  {
    id: "MND-005",
    ref: "M-2025-018",
    name: "Apex — Annual Audit 2025",
    clientName: "Apex Ventures Group",
    type: "Audit",
    stage: "Close",
    rag: "Green",
    manager: "Sarah Chen",
    teamId: "TEAM-AUD",
    teamName: "Audit Team",
    team: ["David Park"],
    startDate: "2025-04-01",
    targetDate: "2026-05-31",
    budget: 95000,
    actualCost: 88500,
    billed: 95000,
    wip: 0,
    feeStructure: "Fixed fee",
    progress: 98,
    conflictCheck: "Cleared",
    currency: "USD",
    closureChecklist: [
      { label: "Deliverables signed off by client", done: true },
      { label: "Final invoice raised", done: true },
      { label: "Trust balance cleared / refunded", done: false },
      { label: "Documents archived", done: false },
      { label: "Satisfaction survey sent", done: false },
    ],
  },
  {
    id: "MND-006",
    ref: "M-2026-006",
    name: "Northwind — Onboarding Setup",
    clientName: "Northwind Logistics",
    type: "Onboarding",
    stage: "Create",
    rag: "Red",
    manager: "Michael Torres",
    teamId: "TEAM-ONB",
    teamName: "Onboarding Team",
    team: [],
    startDate: "2026-07-01",
    targetDate: "2026-10-31",
    budget: 45000,
    actualCost: 0,
    billed: 0,
    wip: 0,
    feeStructure: "Fixed fee",
    progress: 2,
    conflictCheck: "Flagged",
    currency: "USD",
    closureChecklist: [
      { label: "Deliverables signed off by client", done: false },
      { label: "Final invoice raised", done: false },
      { label: "Trust balance cleared / refunded", done: false },
      { label: "Documents archived", done: false },
      { label: "Satisfaction survey sent", done: false },
    ],
  },
];

export const mandateTemplates = [
  { id: "TPL-AUD", name: "Statutory Audit", tasks: 24, phases: 4 },
  { id: "TPL-ADV", name: "Advisory Engagement", tasks: 14, phases: 3 },
  { id: "TPL-TRX", name: "Transaction / M&A", tasks: 31, phases: 5 },
  { id: "TPL-CMP", name: "Compliance Retainer", tasks: 12, phases: 2 },
];

// ── Tasks ───────────────────────────────────────────────────

export type TaskStatus = "Backlog" | "In Progress" | "In Review" | "Done";

export interface PmTask {
  id: string;
  title: string;
  mandateId: string;
  mandateName: string;
  assignee: string;
  status: TaskStatus;
  priority: "Low" | "Medium" | "High" | "Critical";
  dueDate: string;
  estimateHrs: number;
  loggedHrs: number;
  phase: string;
  recurring?: string;
}

export const TASK_STATUSES: TaskStatus[] = [
  "Backlog",
  "In Progress",
  "In Review",
  "Done",
];

export const pmTasks: PmTask[] = [
  { id: "TSK-001", title: "Planning memo & risk assessment", mandateId: "MND-001", mandateName: "Annual Statutory Audit 2026", assignee: "David Park", status: "Done", priority: "High", dueDate: "2026-03-14", estimateHrs: 16, loggedHrs: 18, phase: "Planning" },
  { id: "TSK-002", title: "Walkthrough of revenue cycle", mandateId: "MND-001", mandateName: "Annual Statutory Audit 2026", assignee: "Chris Evans", status: "In Progress", priority: "High", dueDate: "2026-08-05", estimateHrs: 24, loggedHrs: 11, phase: "Fieldwork" },
  { id: "TSK-003", title: "Sample testing — receivables", mandateId: "MND-001", mandateName: "Annual Statutory Audit 2026", assignee: "Chris Evans", status: "Backlog", priority: "Medium", dueDate: "2026-08-22", estimateHrs: 20, loggedHrs: 0, phase: "Fieldwork" },
  { id: "TSK-004", title: "Draft restructuring step plan", mandateId: "MND-002", mandateName: "Corporate Restructuring Phase 2", assignee: "Ana Rodriguez", status: "In Review", priority: "Critical", dueDate: "2026-07-31", estimateHrs: 30, loggedHrs: 27, phase: "Design" },
  { id: "TSK-005", title: "Tax impact modelling", mandateId: "MND-002", mandateName: "Corporate Restructuring Phase 2", assignee: "Michael Torres", status: "In Progress", priority: "High", dueDate: "2026-08-08", estimateHrs: 18, loggedHrs: 9, phase: "Design" },
  { id: "TSK-006", title: "Kick-off workshop with client", mandateId: "MND-003", mandateName: "Tanaka — FY27 Expansion Advisory", assignee: "David Park", status: "In Progress", priority: "Medium", dueDate: "2026-08-02", estimateHrs: 8, loggedHrs: 4, phase: "Mobilisation" },
  { id: "TSK-007", title: "Monthly compliance filing pack", mandateId: "MND-004", mandateName: "Compliance Retainer — Helios", assignee: "Ana Rodriguez", status: "Backlog", priority: "Medium", dueDate: "2026-08-01", estimateHrs: 6, loggedHrs: 0, phase: "Run", recurring: "Monthly" },
  { id: "TSK-008", title: "Archive working papers", mandateId: "MND-005", mandateName: "Apex — Annual Audit 2025", assignee: "David Park", status: "In Review", priority: "Low", dueDate: "2026-08-15", estimateHrs: 4, loggedHrs: 3, phase: "Closure" },
  { id: "TSK-009", title: "Conflict check clearance", mandateId: "MND-006", mandateName: "Northwind — Onboarding Setup", assignee: "Michael Torres", status: "Backlog", priority: "Critical", dueDate: "2026-07-31", estimateHrs: 3, loggedHrs: 0, phase: "Intake" },
];

export const taskTemplates = [
  { id: "TT-01", name: "Audit fieldwork pack", tasks: 12 },
  { id: "TT-02", name: "Monthly compliance run", tasks: 5, recurring: "Monthly" },
  { id: "TT-03", name: "Deal closing checklist", tasks: 18 },
];

// ── Gantt / WBS ─────────────────────────────────────────────

export interface WbsNode {
  id: string;
  name: string;
  level: 0 | 1 | 2;
  start: string;
  end: string;
  progress: number;
  owner: string;
  milestone?: boolean;
  critical?: boolean;
  dependsOn?: string;
  depType?: "FS" | "SS" | "FF" | "SF";
}

export const wbs: Record<string, WbsNode[]> = {
  "MND-001": [
    { id: "W1", name: "Phase 1 — Planning", level: 0, start: "2026-02-01", end: "2026-03-31", progress: 100, owner: "Sarah Chen", critical: true },
    { id: "W1.1", name: "Risk assessment", level: 1, start: "2026-02-01", end: "2026-02-28", progress: 100, owner: "David Park", critical: true },
    { id: "W1.2", name: "Planning memo signed", level: 1, start: "2026-03-14", end: "2026-03-14", progress: 100, owner: "Sarah Chen", milestone: true, dependsOn: "W1.1", depType: "FS" },
    { id: "W2", name: "Phase 2 — Fieldwork", level: 0, start: "2026-04-01", end: "2026-08-31", progress: 46, owner: "David Park", critical: true, dependsOn: "W1", depType: "FS" },
    { id: "W2.1", name: "Revenue cycle testing", level: 1, start: "2026-04-01", end: "2026-06-30", progress: 70, owner: "Chris Evans", critical: true },
    { id: "W2.2", name: "Receivables sampling", level: 1, start: "2026-06-15", end: "2026-08-22", progress: 10, owner: "Chris Evans", dependsOn: "W2.1", depType: "SS" },
    { id: "W3", name: "Phase 3 — Reporting", level: 0, start: "2026-09-01", end: "2026-09-30", progress: 0, owner: "Sarah Chen", dependsOn: "W2", depType: "FS" },
    { id: "W3.1", name: "Audit opinion issued", level: 1, start: "2026-09-30", end: "2026-09-30", progress: 0, owner: "Sarah Chen", milestone: true },
  ],
  "MND-002": [
    { id: "R1", name: "Phase 1 — Diagnostic", level: 0, start: "2026-01-15", end: "2026-03-31", progress: 100, owner: "Michael Torres" },
    { id: "R2", name: "Phase 2 — Design", level: 0, start: "2026-04-01", end: "2026-07-31", progress: 78, owner: "Ana Rodriguez", critical: true, dependsOn: "R1", depType: "FS" },
    { id: "R2.1", name: "Step plan approved", level: 1, start: "2026-07-31", end: "2026-07-31", progress: 0, owner: "Michael Torres", milestone: true, critical: true },
    { id: "R3", name: "Phase 3 — Implementation", level: 0, start: "2026-08-01", end: "2026-08-15", progress: 0, owner: "Michael Torres", dependsOn: "R2", depType: "FS" },
  ],
};

// ── Timesheets ──────────────────────────────────────────────

export type TimesheetStatus =
  | "Draft"
  | "Submitted"
  | "Lead Approved"
  | "Approved"
  | "Rejected";

export interface TimeEntry {
  id: string;
  date: string;
  member: string;
  mandateId: string;
  mandateName: string;
  taskTitle: string;
  narrative: string;
  hours: number;
  billable: boolean;
  rate: number;
  status: TimesheetStatus;
  rejectReason?: string;
}

export const timeEntries: TimeEntry[] = [
  { id: "TE-001", date: "2026-07-27", member: "Chris Evans", mandateId: "MND-001", mandateName: "Annual Statutory Audit 2026", taskTitle: "Walkthrough of revenue cycle", narrative: "Documented revenue process, tested 3 transactions end-to-end", hours: 6.5, billable: true, rate: 180, status: "Submitted" },
  { id: "TE-002", date: "2026-07-27", member: "David Park", mandateId: "MND-001", mandateName: "Annual Statutory Audit 2026", taskTitle: "Fieldwork supervision", narrative: "Reviewed junior workpapers, coaching notes issued", hours: 3, billable: true, rate: 260, status: "Lead Approved" },
  { id: "TE-003", date: "2026-07-28", member: "Ana Rodriguez", mandateId: "MND-002", mandateName: "Corporate Restructuring Phase 2", taskTitle: "Draft restructuring step plan", narrative: "Second draft of step plan incl. cross-border considerations", hours: 7, billable: true, rate: 210, status: "Approved" },
  { id: "TE-004", date: "2026-07-28", member: "Michael Torres", mandateId: "MND-002", mandateName: "Corporate Restructuring Phase 2", taskTitle: "Tax impact modelling", narrative: "Built base and downside scenarios", hours: 4.5, billable: true, rate: 300, status: "Submitted" },
  { id: "TE-005", date: "2026-07-28", member: "Sarah Chen", mandateId: "MND-004", mandateName: "Compliance Retainer — Helios", taskTitle: "Client call", narrative: "Quarterly compliance status call", hours: 1.5, billable: true, rate: 340, status: "Approved" },
  { id: "TE-006", date: "2026-07-29", member: "Chris Evans", mandateId: "MND-001", mandateName: "Annual Statutory Audit 2026", taskTitle: "Internal training", narrative: "Firm-wide audit methodology refresher", hours: 2, billable: false, rate: 0, status: "Draft" },
  { id: "TE-007", date: "2026-07-29", member: "David Park", mandateId: "MND-003", mandateName: "Tanaka — FY27 Expansion Advisory", taskTitle: "Kick-off workshop with client", narrative: "Facilitated scoping workshop in Tokyo", hours: 5, billable: true, rate: 260, status: "Rejected", rejectReason: "Narrative too generic — split by workstream" },
];

export const rateCards = [
  { member: "Sarah Chen", role: "Senior Partner", standard: 340, client: "Meridian Holdings Ltd", negotiated: 320 },
  { member: "Michael Torres", role: "Tax Advisor", standard: 300, client: "Greenfield Capital Partners", negotiated: 285 },
  { member: "David Park", role: "Audit Manager", standard: 260, client: "—", negotiated: 260 },
  { member: "Ana Rodriguez", role: "Legal Analyst", standard: 210, client: "—", negotiated: 210 },
  { member: "Chris Evans", role: "Junior Associate", standard: 180, client: "—", negotiated: 180 },
];

export const utilisation = [
  { member: "Sarah Chen", billable: 132, available: 160, target: 80, trend: [78, 81, 84, 83, 82] },
  { member: "Michael Torres", billable: 118, available: 160, target: 80, trend: [70, 72, 74, 73, 74] },
  { member: "David Park", billable: 104, available: 160, target: 80, trend: [61, 63, 66, 64, 65] },
  { member: "Ana Rodriguez", billable: 88, available: 160, target: 80, trend: [50, 52, 55, 54, 55] },
  { member: "Chris Evans", billable: 61, available: 160, target: 80, trend: [30, 34, 37, 38, 38] },
];

// ── Service Desk ────────────────────────────────────────────

export type TicketStatus =
  | "New"
  | "Assigned"
  | "In Progress"
  | "Pending Client"
  | "Resolved"
  | "Closed";

export const TICKET_STATUSES: TicketStatus[] = [
  "New",
  "Assigned",
  "In Progress",
  "Pending Client",
  "Resolved",
  "Closed",
];

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  clientName: string;
  channel: "Portal" | "Email" | "WhatsApp";
  priority: "Low" | "Medium" | "High" | "Urgent";
  category: string;
  agent: string;
  status: TicketStatus;
  createdAt: string;
  slaTargetHrs: number;
  slaElapsedHrs: number;
  loggedHrs: number;
  rating?: number;
  ratingComment?: string;
  notes: { author: string; internal: boolean; at: string; body: string }[];
}

export const tickets: Ticket[] = [
  { id: "TCK-101", subject: "Cannot download signed MSA from portal", description: "Client reports the signed MSA link returns an error.", clientName: "Meridian Holdings Ltd", channel: "Portal", priority: "High", category: "Portal access", agent: "Chris Evans", status: "In Progress", createdAt: "2026-07-29T09:12:00Z", slaTargetHrs: 8, slaElapsedHrs: 6.4, loggedHrs: 1.5, notes: [
    { author: "Chris Evans", internal: true, at: "2026-07-29T10:00:00Z", body: "Reproduced. Looks like a stale document version. @David Park can you confirm the archive job?" },
    { author: "Chris Evans", internal: false, at: "2026-07-29T10:20:00Z", body: "Thanks for flagging — we are re-issuing the document link today." },
  ] },
  { id: "TCK-102", subject: "Request for FY26 withholding tax certificates", description: "Need copies of WHT certificates for the last 3 invoices.", clientName: "Tanaka Enterprises", channel: "Email", priority: "Medium", category: "Billing", agent: "Ana Rodriguez", status: "Pending Client", createdAt: "2026-07-26T14:02:00Z", slaTargetHrs: 24, slaElapsedHrs: 12, loggedHrs: 0.75, notes: [
    { author: "Ana Rodriguez", internal: false, at: "2026-07-27T08:00:00Z", body: "Could you confirm the invoice numbers required?" },
  ] },
  { id: "TCK-103", subject: "Advice needed on new BNR circular", description: "Client asks whether the new circular affects their reporting.", clientName: "Helios Renewables", channel: "WhatsApp", priority: "Urgent", category: "Advisory", agent: "Sarah Chen", status: "Assigned", createdAt: "2026-07-30T06:40:00Z", slaTargetHrs: 4, slaElapsedHrs: 3.8, loggedHrs: 0.5, notes: [] },
  { id: "TCK-104", subject: "Add two users to the client portal", description: "Onboarding two new finance staff.", clientName: "Apex Ventures Group", channel: "Portal", priority: "Low", category: "Portal access", agent: "Chris Evans", status: "Resolved", createdAt: "2026-07-20T11:00:00Z", slaTargetHrs: 48, slaElapsedHrs: 20, loggedHrs: 0.4, rating: 5, ratingComment: "Fast and clear, thank you.", notes: [] },
  { id: "TCK-105", subject: "Scope query — can you handle our Kenya subsidiary?", description: "Potential new work outside current mandate scope.", clientName: "Greenfield Capital Partners", channel: "Email", priority: "Medium", category: "New work", agent: "Michael Torres", status: "New", createdAt: "2026-07-30T05:05:00Z", slaTargetHrs: 24, slaElapsedHrs: 1.2, loggedHrs: 0, notes: [] },
];

export const knowledgeBase = [
  { id: "KB-01", title: "How to reset client portal access", category: "Portal access", audience: "Client-facing", views: 214 },
  { id: "KB-02", title: "Requesting withholding tax certificates", category: "Billing", audience: "Client-facing", views: 132 },
  { id: "KB-03", title: "SLA escalation matrix (internal)", category: "Process", audience: "Internal", views: 88 },
  { id: "KB-04", title: "Converting a ticket into a mandate", category: "Process", audience: "Internal", views: 61 },
];

// ── ADR ─────────────────────────────────────────────────────

export type AdrStage =
  | "Intake"
  | "Appointment"
  | "Sessions"
  | "Settlement"
  | "Award / Outcome"
  | "Closed";

export const ADR_STAGES: AdrStage[] = [
  "Intake",
  "Appointment",
  "Sessions",
  "Settlement",
  "Award / Outcome",
  "Closed",
];

export interface AdrCase {
  id: string;
  title: string;
  type: "Mediation" | "Arbitration" | "Conciliation" | "Expert determination";
  parties: string[];
  neutral: string;
  stage: AdrStage;
  claimValue: number;
  filedOn: string;
  sessions: { date: string; mode: "Physical" | "Virtual"; venue: string; outcome: string }[];
  settlement?: { amount: number; date: string; terms: string };
  outcome?: string;
}

export const adrCases: AdrCase[] = [
  { id: "ADR-001", title: "Meridian v. Larkspur — supply contract dispute", type: "Mediation", parties: ["Meridian Holdings Ltd", "Larkspur Media"], neutral: "Sarah Chen", stage: "Sessions", claimValue: 420000, filedOn: "2026-05-04", sessions: [
    { date: "2026-06-12", mode: "Physical", venue: "Kigali — Lexora Room 2", outcome: "Positions exchanged" },
    { date: "2026-07-10", mode: "Virtual", venue: "Zoom", outcome: "Narrowed to quantum only" },
  ] },
  { id: "ADR-002", title: "Apex / Sable shareholder deadlock", type: "Arbitration", parties: ["Apex Ventures Group", "Sable & Co"], neutral: "Michael Torres", stage: "Award / Outcome", claimValue: 1150000, filedOn: "2025-11-18", sessions: [
    { date: "2026-02-20", mode: "Physical", venue: "Dubai", outcome: "Preliminary hearing" },
    { date: "2026-04-15", mode: "Physical", venue: "Dubai", outcome: "Evidentiary hearing" },
  ], outcome: "Award issued in favour of claimant — USD 780,000" },
  { id: "ADR-003", title: "Helios EPC delay claim", type: "Expert determination", parties: ["Helios Renewables", "Northwind Logistics"], neutral: "Ana Rodriguez", stage: "Settlement", claimValue: 260000, filedOn: "2026-06-30", sessions: [
    { date: "2026-07-22", mode: "Virtual", venue: "Teams", outcome: "Joint expert instruction agreed" },
  ], settlement: { amount: 145000, date: "2026-07-28", terms: "Payment in 2 tranches within 60 days" } },
];

// ── Finance: invoices, WIP, trust ───────────────────────────

export type InvoiceStage =
  | "Draft"
  | "In Review"
  | "Approved"
  | "Sent"
  | "Part Paid"
  | "Paid"
  | "Overdue"
  | "Written Off";

export interface PmInvoice {
  id: string;
  clientName: string;
  mandateId: string;
  mandateName: string;
  currency: "USD" | "EUR" | "RWF" | "GBP";
  subtotal: number;
  vatRate: number;
  whtRate: number;
  discount: number;
  stage: InvoiceStage;
  issuedOn: string;
  dueOn: string;
  paidAmount: number;
  openedByClient: boolean;
  model: "Time & materials" | "Fixed fee" | "Retainer" | "Milestone";
  proforma?: boolean;
  lines: { description: string; qty: number; unit: number }[];
}

export const pmInvoices: PmInvoice[] = [
  { id: "INV-2026-041", clientName: "Meridian Holdings Ltd", mandateId: "MND-001", mandateName: "Annual Statutory Audit 2026", currency: "USD", subtotal: 60000, vatRate: 18, whtRate: 5, discount: 0, stage: "Sent", issuedOn: "2026-07-01", dueOn: "2026-07-31", paidAmount: 0, openedByClient: true, model: "Fixed fee", lines: [{ description: "Interim audit fee — instalment 2", qty: 1, unit: 60000 }] },
  { id: "INV-2026-042", clientName: "Greenfield Capital Partners", mandateId: "MND-002", mandateName: "Corporate Restructuring Phase 2", currency: "USD", subtotal: 48200, vatRate: 18, whtRate: 0, discount: 2000, stage: "In Review", issuedOn: "2026-07-28", dueOn: "2026-08-27", paidAmount: 0, openedByClient: false, model: "Time & materials", lines: [
    { description: "Partner time — 14.5 hrs", qty: 14.5, unit: 300 },
    { description: "Analyst time — 92 hrs", qty: 92, unit: 210 },
    { description: "Disbursements", qty: 1, unit: 4550 },
  ] },
  { id: "INV-2026-043", clientName: "Helios Renewables", mandateId: "MND-004", mandateName: "Compliance Retainer — Helios", currency: "EUR", subtotal: 15000, vatRate: 20, whtRate: 0, discount: 0, stage: "Paid", issuedOn: "2026-06-01", dueOn: "2026-06-30", paidAmount: 18000, openedByClient: true, model: "Retainer", lines: [{ description: "Monthly retainer — June", qty: 1, unit: 15000 }] },
  { id: "INV-2026-039", clientName: "Tanaka Enterprises", mandateId: "MND-003", mandateName: "Tanaka — FY27 Expansion Advisory", currency: "USD", subtotal: 30000, vatRate: 10, whtRate: 10, discount: 0, stage: "Overdue", issuedOn: "2026-05-15", dueOn: "2026-06-14", paidAmount: 0, openedByClient: true, model: "Milestone", lines: [{ description: "Mobilisation milestone", qty: 1, unit: 30000 }] },
  { id: "INV-2026-044", clientName: "Apex Ventures Group", mandateId: "MND-005", mandateName: "Apex — Annual Audit 2025", currency: "USD", subtotal: 22000, vatRate: 18, whtRate: 5, discount: 0, stage: "Part Paid", issuedOn: "2026-07-10", dueOn: "2026-08-09", paidAmount: 10000, openedByClient: true, model: "Fixed fee", lines: [{ description: "Final audit fee", qty: 1, unit: 22000 }] },
  { id: "PRO-2026-007", clientName: "Northwind Logistics", mandateId: "MND-006", mandateName: "Northwind — Onboarding Setup", currency: "USD", subtotal: 12000, vatRate: 18, whtRate: 0, discount: 0, stage: "Draft", issuedOn: "2026-07-29", dueOn: "2026-08-28", paidAmount: 0, openedByClient: false, model: "Fixed fee", proforma: true, lines: [{ description: "Onboarding setup — proforma", qty: 1, unit: 12000 }] },
];

export const wipEntries = [
  { id: "WIP-001", mandateId: "MND-001", mandateName: "Annual Statutory Audit 2026", clientName: "Meridian Holdings Ltd", source: "Approved timesheets", hours: 186, value: 46500, ageDays: 22, billable: true },
  { id: "WIP-002", mandateId: "MND-002", mandateName: "Corporate Restructuring Phase 2", clientName: "Greenfield Capital Partners", source: "Approved timesheets", hours: 106, value: 28400, ageDays: 9, billable: true },
  { id: "WIP-003", mandateId: "MND-003", mandateName: "Tanaka — FY27 Expansion Advisory", clientName: "Tanaka Enterprises", source: "Milestone completion", hours: 48, value: 12800, ageDays: 4, billable: true },
  { id: "WIP-004", mandateId: "MND-004", mandateName: "Compliance Retainer — Helios", clientName: "Helios Renewables", source: "Approved timesheets", hours: 72, value: 18200, ageDays: 31, billable: true },
];

export const dunningLog = [
  { invoiceId: "INV-2026-039", stage: "30 days", action: "Reminder email sent", at: "2026-07-14", by: "System" },
  { invoiceId: "INV-2026-039", stage: "45 days", action: "Second reminder + statement", at: "2026-07-29", by: "System" },
  { invoiceId: "INV-2026-044", stage: "—", action: "Part payment allocated (USD 10,000)", at: "2026-07-24", by: "Finance" },
];

export const paymentsReceived = [
  { id: "PMT-001", invoiceId: "INV-2026-043", clientName: "Helios Renewables", amount: 18000, currency: "EUR", method: "Bank feed", matched: "Auto-matched", at: "2026-06-26" },
  { id: "PMT-002", invoiceId: "INV-2026-044", clientName: "Apex Ventures Group", amount: 10000, currency: "USD", method: "Wire", matched: "Manual", at: "2026-07-24" },
];

export interface TrustAccount {
  id: string;
  clientName: string;
  mandateId: string;
  mandateName: string;
  currency: string;
  balance: number;
  lastReconciled: string;
  reconciled: boolean;
  interestTreatment: "Client" | "Office";
}

export const trustAccounts: TrustAccount[] = [
  { id: "TRS-001", clientName: "Meridian Holdings Ltd", mandateId: "MND-001", mandateName: "Annual Statutory Audit 2026", currency: "USD", balance: 75000, lastReconciled: "2026-06-30", reconciled: true, interestTreatment: "Client" },
  { id: "TRS-002", clientName: "Greenfield Capital Partners", mandateId: "MND-002", mandateName: "Corporate Restructuring Phase 2", currency: "USD", balance: 240000, lastReconciled: "2026-06-30", reconciled: false, interestTreatment: "Office" },
  { id: "TRS-003", clientName: "Apex Ventures Group", mandateId: "MND-005", mandateName: "Apex — Annual Audit 2025", currency: "USD", balance: 4500, lastReconciled: "2026-06-30", reconciled: true, interestTreatment: "Client" },
];

export interface TrustMovement {
  id: string;
  accountId: string;
  type: "Deposit" | "Drawdown" | "Interest" | "Refund";
  amount: number;
  reference: string;
  date: string;
  status: "Recorded" | "Awaiting authorisation" | "Approved" | "Rejected";
  preparer?: string;
  authoriser?: string;
  linkedInvoice?: string;
}

export const trustMovements: TrustMovement[] = [
  { id: "TM-001", accountId: "TRS-001", type: "Deposit", amount: 100000, reference: "Client wire 8841", date: "2026-02-05", status: "Recorded" },
  { id: "TM-002", accountId: "TRS-001", type: "Drawdown", amount: 25000, reference: "INV-2026-041 part", date: "2026-07-05", status: "Approved", preparer: "Ana Rodriguez", authoriser: "Sarah Chen", linkedInvoice: "INV-2026-041" },
  { id: "TM-003", accountId: "TRS-002", type: "Deposit", amount: 250000, reference: "Escrow funding", date: "2026-03-01", status: "Recorded" },
  { id: "TM-004", accountId: "TRS-002", type: "Drawdown", amount: 10000, reference: "INV-2026-042", date: "2026-07-29", status: "Awaiting authorisation", preparer: "Ana Rodriguez", linkedInvoice: "INV-2026-042" },
  { id: "TM-005", accountId: "TRS-003", type: "Interest", amount: 500, reference: "Q2 interest", date: "2026-06-30", status: "Recorded" },
];

// ── Tools: documents, contracts, forms, calendar, reports ───

export interface PmDocument {
  id: string;
  name: string;
  folder: string;
  clientName: string;
  mandateName: string;
  version: string;
  checkedOutBy?: string;
  tags: string[];
  retention: string;
  access: "Team" | "Client-shared" | "Restricted";
  updatedAt: string;
  size: string;
  signature?: { status: "Pending" | "Signed"; signer: string; signedAt?: string; certificateId?: string };
}

export const pmDocuments: PmDocument[] = [
  { id: "PDOC-001", name: "Engagement Letter — Meridian 2026.pdf", folder: "Meridian Holdings Ltd / Audit 2026", clientName: "Meridian Holdings Ltd", mandateName: "Annual Statutory Audit 2026", version: "v3", tags: ["engagement", "signed"], retention: "7 years", access: "Client-shared", updatedAt: "2026-02-04", size: "820 KB", signature: { status: "Signed", signer: "Eleanor Pritchard", signedAt: "2026-02-04", certificateId: "SIG-4471-AA" } },
  { id: "PDOC-002", name: "Audit Planning Memo.docx", folder: "Meridian Holdings Ltd / Audit 2026", clientName: "Meridian Holdings Ltd", mandateName: "Annual Statutory Audit 2026", version: "v6", checkedOutBy: "David Park", tags: ["workpaper"], retention: "7 years", access: "Team", updatedAt: "2026-07-22", size: "1.2 MB" },
  { id: "PDOC-003", name: "Restructuring Step Plan.docx", folder: "Greenfield Capital / Restructuring", clientName: "Greenfield Capital Partners", mandateName: "Corporate Restructuring Phase 2", version: "v2", tags: ["draft", "confidential"], retention: "10 years", access: "Restricted", updatedAt: "2026-07-28", size: "640 KB" },
  { id: "PDOC-004", name: "Client Authorisation — Helios.pdf", folder: "Helios Renewables / Compliance", clientName: "Helios Renewables", mandateName: "Compliance Retainer — Helios", version: "v1", tags: ["authorisation"], retention: "5 years", access: "Client-shared", updatedAt: "2026-07-18", size: "310 KB", signature: { status: "Pending", signer: "Isabella Ortega" } },
];

export const docTemplates = [
  { id: "DT-01", name: "Engagement letter", variables: ["{{client.name}}", "{{mandate.ref}}", "{{fee.structure}}"] },
  { id: "DT-02", name: "Audit report cover", variables: ["{{client.name}}", "{{period.end}}"] },
  { id: "DT-03", name: "Compliance filing certificate", variables: ["{{client.name}}", "{{filing.date}}"] },
  { id: "DT-04", name: "Client correspondence", variables: ["{{contact.firstName}}", "{{manager.name}}"] },
];

export type ContractStage =
  | "Draft"
  | "Internal review"
  | "Client review"
  | "Negotiation"
  | "Execution"
  | "Active"
  | "Renewal"
  | "Expiry / Termination";

export const CONTRACT_STAGES: ContractStage[] = [
  "Draft",
  "Internal review",
  "Client review",
  "Negotiation",
  "Execution",
  "Active",
  "Renewal",
  "Expiry / Termination",
];

export interface PmContract {
  id: string;
  title: string;
  counterparty: string;
  type: "MSA" | "SOW" | "NDA" | "Lease" | "Supplier";
  stage: ContractStage;
  value: number;
  currency: string;
  executedOn?: string;
  effectiveOn?: string;
  expiresOn: string;
  autoRenew: boolean;
  owner: string;
  mandateName: string;
  rounds: { round: number; by: string; at: string; summary: string }[];
  obligations: { label: string; due: string; type: string; leadDays: number; done: boolean }[];
  amendments: { ref: string; at: string; summary: string }[];
}

export const pmContracts: PmContract[] = [
  { id: "CTR-2026-01", title: "Meridian — Master Services Agreement", counterparty: "Meridian Holdings Ltd", type: "MSA", stage: "Active", value: 480000, currency: "USD", executedOn: "2025-12-20", effectiveOn: "2026-01-01", expiresOn: "2026-12-31", autoRenew: true, owner: "Sarah Chen", mandateName: "Annual Statutory Audit 2026", rounds: [
    { round: 1, by: "Lexora", at: "2025-11-30", summary: "First draft issued" },
    { round: 2, by: "Counterparty", at: "2025-12-08", summary: "Redlines on liability cap" },
    { round: 3, by: "Lexora", at: "2025-12-15", summary: "Cap agreed at 2x fees" },
  ], obligations: [
    { label: "Quarterly service review", due: "2026-09-30", type: "Deliverable", leadDays: 14, done: false },
    { label: "Renewal notice window opens", due: "2026-10-02", type: "Notice period", leadDays: 30, done: false },
    { label: "Annual fee review", due: "2026-11-15", type: "Payment", leadDays: 21, done: false },
  ], amendments: [{ ref: "AMD-01", at: "2026-04-12", summary: "Added Kenya subsidiary to scope" }] },
  { id: "CTR-2026-02", title: "Tanaka — Statement of Work Q3", counterparty: "Tanaka Enterprises", type: "SOW", stage: "Negotiation", value: 120000, currency: "USD", expiresOn: "2026-09-30", autoRenew: false, owner: "David Park", mandateName: "Tanaka — FY27 Expansion Advisory", rounds: [
    { round: 1, by: "Lexora", at: "2026-07-08", summary: "Draft SOW issued" },
    { round: 2, by: "Counterparty", at: "2026-07-21", summary: "Requested milestone-based fees" },
  ], obligations: [{ label: "Milestone 1 delivery", due: "2026-08-31", type: "Deliverable", leadDays: 10, done: false }], amendments: [] },
  { id: "CTR-2026-03", title: "Helios — NDA", counterparty: "Helios Renewables", type: "NDA", stage: "Renewal", value: 0, currency: "EUR", executedOn: "2026-05-23", effectiveOn: "2026-05-23", expiresOn: "2026-09-15", autoRenew: false, owner: "Sarah Chen", mandateName: "Compliance Retainer — Helios", rounds: [{ round: 1, by: "Lexora", at: "2026-05-20", summary: "Standard NDA issued and signed" }], obligations: [{ label: "Confidentiality tail begins", due: "2026-09-15", type: "Covenant", leadDays: 30, done: false }], amendments: [] },
  { id: "CTR-2026-04", title: "Greenfield — SOW Restructuring", counterparty: "Greenfield Capital Partners", type: "SOW", stage: "Internal review", value: 260000, currency: "USD", expiresOn: "2027-02-01", autoRenew: false, owner: "Michael Torres", mandateName: "Corporate Restructuring Phase 2", rounds: [{ round: 1, by: "Lexora", at: "2026-07-25", summary: "Draft prepared from precedent" }], obligations: [], amendments: [] },
  { id: "CTR-2025-11", title: "Sable & Co — Supplier Agreement", counterparty: "Sable & Co", type: "Supplier", stage: "Expiry / Termination", value: 32000, currency: "EUR", executedOn: "2024-04-18", effectiveOn: "2024-05-01", expiresOn: "2026-04-30", autoRenew: false, owner: "Michael Torres", mandateName: "—", rounds: [], obligations: [], amendments: [{ ref: "AMD-01", at: "2025-06-01", summary: "Extended by 12 months" }] },
];

export const formTemplates = [
  { id: "FRM-01", name: "Client onboarding intake", fields: 18, submissions: 42, status: "Published", steps: ["Submission", "Compliance review", "Partner approval"] },
  { id: "FRM-02", name: "Mandate opening request", fields: 12, submissions: 27, status: "Published", steps: ["Submission", "Conflict check", "Manager approval"] },
  { id: "FRM-03", name: "Invoice approval", fields: 8, submissions: 96, status: "Published", steps: ["Draft", "Manager review", "Partner approval"] },
  { id: "FRM-04", name: "Expense claim", fields: 9, submissions: 61, status: "Published", steps: ["Submission", "Line manager", "Finance"] },
  { id: "FRM-05", name: "Service desk escalation", fields: 7, submissions: 14, status: "Draft", steps: ["Submission", "Team lead", "Partner"] },
];

export const formFieldTypes = [
  "Text",
  "Number",
  "Date",
  "Dropdown",
  "Checkbox",
  "File upload",
  "Signature",
  "Calculated",
];

export const workflowRuns = [
  { id: "WF-1201", template: "Invoice approval", subject: "INV-2026-042", step: "Partner approval", status: "In progress", sla: "6h remaining", updated: "2026-07-29" },
  { id: "WF-1202", template: "Mandate opening request", subject: "Northwind Logistics", step: "Conflict check", status: "Escalated", sla: "Breached", updated: "2026-07-30" },
  { id: "WF-1203", template: "Expense claim", subject: "Travel — Tokyo (D. Park)", step: "Finance", status: "Approved", sla: "Met", updated: "2026-07-28" },
];

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  layer: "Personal" | "Team" | "Client" | "Compliance" | "ADR" | "Contract";
  source: string;
  location: string;
  virtual?: "Teams" | "Zoom" | "Google Meet";
  recurring?: string;
}

export const calendarEvents: CalendarEvent[] = [
  { id: "EV-01", title: "Meridian audit status call", date: "2026-08-03", time: "10:00", layer: "Client", source: "Mandate MND-001", location: "Virtual", virtual: "Teams", recurring: "Weekly" },
  { id: "EV-02", title: "Renewal notice window — Meridian MSA", date: "2026-10-02", time: "09:00", layer: "Contract", source: "CTR-2026-01", location: "—" },
  { id: "EV-03", title: "Mediation session — Meridian v. Larkspur", date: "2026-08-14", time: "13:00", layer: "ADR", source: "ADR-001", location: "Kigali — Room 2" },
  { id: "EV-04", title: "Monthly compliance filing deadline", date: "2026-08-01", time: "17:00", layer: "Compliance", source: "Mandate MND-004", location: "—" },
  { id: "EV-05", title: "Team resourcing huddle", date: "2026-08-04", time: "08:30", layer: "Team", source: "PMO", location: "Virtual", virtual: "Zoom", recurring: "Weekly" },
  { id: "EV-06", title: "Partner 1:1 — Chris Evans", date: "2026-08-05", time: "15:00", layer: "Personal", source: "HR", location: "Room 1" },
  { id: "EV-07", title: "Arbitration award readout", date: "2026-08-11", time: "11:00", layer: "ADR", source: "ADR-002", location: "Virtual", virtual: "Google Meet" },
  { id: "EV-08", title: "Board pack circulation (GRC)", date: "2026-08-20", time: "12:00", layer: "Compliance", source: "GRC Governance", location: "—" },
];

export const prebuiltReports = [
  { id: "RPT-01", name: "Mandate profitability", category: "Finance", lastRun: "2026-07-29" },
  { id: "RPT-02", name: "Team utilisation", category: "People", lastRun: "2026-07-28" },
  { id: "RPT-03", name: "Aged receivables", category: "Finance", lastRun: "2026-07-30" },
  { id: "RPT-04", name: "Pipeline conversion", category: "CRM", lastRun: "2026-07-27" },
  { id: "RPT-05", name: "SLA compliance", category: "Service Desk", lastRun: "2026-07-30" },
  { id: "RPT-06", name: "Client revenue", category: "Finance", lastRun: "2026-07-25" },
  { id: "RPT-07", name: "Trust balances", category: "Finance", lastRun: "2026-07-30" },
  { id: "RPT-08", name: "Timesheet summary", category: "People", lastRun: "2026-07-29" },
  { id: "RPT-09", name: "Service desk resolution times", category: "Service Desk", lastRun: "2026-07-30" },
];

export const scheduledReports = [
  { id: "SCH-01", report: "Aged receivables", frequency: "Weekly (Mon 07:00)", recipients: "Finance, Partners", format: "PDF" },
  { id: "SCH-02", report: "Team utilisation", frequency: "Monthly (1st)", recipients: "PMO, Partners", format: "Excel" },
  { id: "SCH-03", report: "Executive pack", frequency: "Quarterly", recipients: "Board", format: "PDF" },
];

export const portfolioRisks = [
  { id: "RSK-01", title: "Key resource over-allocated on two audits", mandate: "Annual Statutory Audit 2026", type: "Risk", severity: "High", owner: "Sarah Chen", status: "Mitigating", impact: "Delivery slippage of 2 weeks" },
  { id: "RSK-02", title: "Client data late — restructuring", mandate: "Corporate Restructuring Phase 2", type: "Issue", severity: "Critical", owner: "Michael Torres", status: "Escalated", impact: "Step plan approval at risk" },
  { id: "RSK-03", title: "Conflict check unresolved", mandate: "Northwind — Onboarding Setup", type: "Issue", severity: "High", owner: "Michael Torres", status: "Open", impact: "Mandate cannot leave Create stage" },
  { id: "RSK-04", title: "FX exposure on EUR retainer", mandate: "Compliance Retainer — Helios", type: "Risk", severity: "Medium", owner: "Finance", status: "Monitoring", impact: "Margin variance ±4%" },
];

// ── Collaboration ───────────────────────────────────────────

export const teamDirectory = [
  { name: "Sarah Chen", role: "Senior Partner", availability: "Online" as const, mandates: 3 },
  { name: "Michael Torres", role: "Tax Advisor", availability: "Away" as const, mandates: 2 },
  { name: "David Park", role: "Audit Manager", availability: "Online" as const, mandates: 3 },
  { name: "Ana Rodriguez", role: "Legal Analyst", availability: "DND" as const, mandates: 2 },
  { name: "Chris Evans", role: "Junior Associate", availability: "Offline" as const, mandates: 1 },
  { name: "compliance-team", role: "Group mention", availability: "Online" as const, mandates: 0 },
  { name: "partners", role: "Group mention", availability: "Online" as const, mandates: 0 },
];

export interface CommentNode {
  id: string;
  author: string;
  at: string;
  body: string;
  edited?: boolean;
  deleted?: boolean;
  reactions: Record<string, string[]>;
  replies: CommentNode[];
}

export const seedComments = (subject: string): CommentNode[] => [
  {
    id: `${subject}-c1`,
    author: "Sarah Chen",
    at: "2026-07-29T09:20:00Z",
    body: "@David Park budget vs actual is drifting — can you post the latest WIP before Friday?",
    reactions: { "👀": ["David Park"], "👍": ["Ana Rodriguez", "Chris Evans"] },
    replies: [
      {
        id: `${subject}-c1-r1`,
        author: "David Park",
        at: "2026-07-29T10:02:00Z",
        body: "On it. Fieldwork hours are approved up to 27 July, remainder pending @partners sign-off.",
        reactions: { "✅": ["Sarah Chen"] },
        replies: [],
      },
    ],
  },
  {
    id: `${subject}-c2`,
    author: "Ana Rodriguez",
    at: "2026-07-30T07:41:00Z",
    body: "Uploaded the revised step plan (v2) to the document repository.",
    reactions: {},
    replies: [],
  },
];

export const activityStream = [
  { id: "AC-01", at: "2026-07-30T08:12:00Z", actor: "System", type: "Billing", text: "WIP of USD 12,800 generated from approved timesheets on MND-003" },
  { id: "AC-02", at: "2026-07-30T07:41:00Z", actor: "Ana Rodriguez", type: "Document", text: "Uploaded Restructuring Step Plan v2" },
  { id: "AC-03", at: "2026-07-29T16:05:00Z", actor: "Michael Torres", type: "Escalation", text: "Escalated 'Client data late' to the PMO risk log" },
  { id: "AC-04", at: "2026-07-29T10:02:00Z", actor: "David Park", type: "Comment", text: "Replied on mandate MND-001 thread" },
  { id: "AC-05", at: "2026-07-29T09:20:00Z", actor: "Sarah Chen", type: "Mention", text: "Mentioned @David Park on mandate MND-001" },
  { id: "AC-06", at: "2026-07-28T15:30:00Z", actor: "Finance", type: "Invoice", text: "INV-2026-042 submitted for partner review" },
  { id: "AC-07", at: "2026-07-28T11:14:00Z", actor: "Chris Evans", type: "Time", text: "Logged 6.5 billable hours on MND-001" },
];

// ── Derived helpers ─────────────────────────────────────────

export const money = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);

export const invoiceTotal = (i: PmInvoice) => {
  const net = i.subtotal - i.discount;
  const vat = (net * i.vatRate) / 100;
  const wht = (net * i.whtRate) / 100;
  return { net, vat, wht, gross: net + vat, payable: net + vat - wht };
};

export const ragClass: Record<Rag, string> = {
  Green: "bg-success/10 text-success",
  Amber: "bg-warning/10 text-warning",
  Red: "bg-destructive/10 text-destructive",
};
