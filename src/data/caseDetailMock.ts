// ─────────────────────────────────────────────────────────────
// Dummy data for ADR / litigation case-detail surfaces that have
// no API yet. Everything is derived deterministically from the
// case id so a case looks consistent between visits. Replace each
// block with a real endpoint when the backend lands.
// ─────────────────────────────────────────────────────────────

const hash = (s: string) =>
  (s || "x").split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7);

export type CommsKind = "internal" | "sent" | "received";
export interface MockMessage {
  id: string;
  kind: CommsKind;
  author: string;
  to?: string;
  at: string;
  body: string;
}

export interface MockThreadMember {
  name: string;
  reach: "Internal + email" | "Email only";
}

export const mockCommsThread = (id: string): MockMessage[] => [
  {
    id: `${id}-m1`,
    kind: "internal",
    author: "Amara Nkurunziza",
    at: "Today, 09:12",
    body: "Position paper looks solid. Suggest we soften para 14 on causation before it goes to Rudo for sign-off.",
  },
  {
    id: `${id}-m2`,
    kind: "sent",
    author: "Rudo Sibanda",
    to: "James Karenzi (client)",
    at: "Yesterday, 16:40",
    body: "Confirming the settlement range of $220,000–$280,000 for Thursday's session. Please let us know if the mandate changes before then.",
  },
  {
    id: `${id}-m3`,
    kind: "received",
    author: "James Karenzi (client)",
    at: "Yesterday, 17:05",
    body: "Confirmed, board is comfortable with that range. Please also raise the retention issue on Phase 3 if it comes up.",
  },
  {
    id: `${id}-m4`,
    kind: "internal",
    author: "Rudo Sibanda",
    at: "Yesterday, 17:20",
    body: "Noted — will fold the Phase 3 retention point into the opening statement. @Amara please add to the bundle.",
  },
];

export const mockThreadMembers = (): MockThreadMember[] => [
  { name: "Rudo Sibanda (lead)", reach: "Internal + email" },
  { name: "Amara Nkurunziza (support)", reach: "Internal + email" },
  { name: "Client contact", reach: "Email only" },
  { name: "Opposing counsel", reach: "Email only" },
];

export interface MockFolder {
  name: string;
  count: number;
  tone: string;
}
export interface MockDoc {
  title: string;
  meta: string;
  tags: string[];
  size: string;
}

export const mockDocFolders = (id: string): MockFolder[] => {
  const h = hash(id);
  return [
    {
      name: "Position papers",
      count: 2 + (h % 4),
      tone: "bg-rose-100 text-rose-600",
    },
    {
      name: "Witness statements",
      count: 1 + (h % 5),
      tone: "bg-amber-100 text-amber-600",
    },
    { name: "Evidence", count: 6 + (h % 11), tone: "bg-amber-100 text-amber-600" },
    {
      name: "Correspondence",
      count: 9 + (h % 13),
      tone: "bg-emerald-100 text-emerald-600",
    },
    {
      name: "Contracts & signed",
      count: 2 + (h % 6),
      tone: "bg-violet-100 text-violet-600",
    },
  ];
};

export const mockRecentDocs = (): MockDoc[] => [
  {
    title: "Position paper (final draft)",
    meta: "18 pages · Rudo Sibanda · 5 Aug 2026",
    tags: ["Confidential", "v3", "Position papers"],
    size: "PDF · 2.4MB",
  },
  {
    title: "Witness statement: Eng. Mukiza (project manager)",
    meta: "Signed 1 Aug 2026 · Verified",
    tags: ["Signed", "Witness statements"],
    size: "PDF · 680KB",
  },
  {
    title: "Independent engineer's report",
    meta: "Eng. Niyonzima · 28 Jul 2026",
    tags: ["Expert report", "Evidence"],
    size: "PDF · 8.1MB",
  },
];

export interface MockDeadlineRule {
  id: string;
  trigger: string;
  rule: string;
  status: string;
  tone: "met" | "due" | "idle";
}

export const mockDeadlineRules = (id: string): MockDeadlineRule[] => [
  {
    id: `${id}-d1`,
    trigger: "Notice served (25 Jun 2026)",
    rule: "Rule: contract cl. 18.2 — 14-day response window",
    status: "Met — 2 Jul",
    tone: "met",
  },
  {
    id: `${id}-d2`,
    trigger: "Neutral appointed (5 Jul 2026)",
    rule: "Rule: institutional standard — session 1 within 6 weeks",
    status: "Due 14 Aug",
    tone: "due",
  },
  {
    id: `${id}-d3`,
    trigger: "Session 1 (if unresolved)",
    rule: "Rule: cascade — escalation within 21 days",
    status: "Not yet triggered",
    tone: "idle",
  },
];

export interface MockTimeEntry {
  date: string;
  timekeeper: string;
  activity: string;
  type: string;
  duration: string;
  amount: string;
  billable: boolean;
}

export const mockTimeEntries = (): MockTimeEntry[] => [
  {
    date: "6 Aug",
    timekeeper: "Amara N.",
    activity: "Drafting — opening statement",
    type: "Drafting",
    duration: "1.5 hrs",
    amount: "$300",
    billable: true,
  },
  {
    date: "5 Aug",
    timekeeper: "Rudo S.",
    activity: "Call — client update",
    type: "Call",
    duration: "0.5 hrs",
    amount: "$150",
    billable: true,
  },
  {
    date: "5 Aug",
    timekeeper: "Rudo S.",
    activity: "Position paper (final)",
    type: "Drafting",
    duration: "3 hrs",
    amount: "$900",
    billable: true,
  },
  {
    date: "4 Aug",
    timekeeper: "Rudo S.",
    activity: "Internal strategy huddle",
    type: "Internal",
    duration: "0.75 hrs",
    amount: "—",
    billable: false,
  },
];

export interface MockAuditEntry {
  title: string;
  detail: string;
  at: string;
  tone: string;
}

export const mockAuditTrail = (): MockAuditEntry[] => [
  {
    title: "Rudo Sibanda sent email to client contact",
    detail: "Confirmed settlement range $220k–$280k.",
    at: "Yesterday, 16:40",
    tone: "bg-primary",
  },
  {
    title: "Amara Nkurunziza finalised Position paper to Documents",
    detail: "v3 · marked Confidential.",
    at: "5 Aug, 14:10",
    tone: "bg-emerald-500",
  },
  {
    title: "Rudo Sibanda logged 3.0 hrs — Position paper (final)",
    detail: "Synced to timesheet.",
    at: "5 Aug, 18:02",
    tone: "bg-amber-500",
  },
  {
    title: "Case stage advanced",
    detail: "By Rudo Sibanda.",
    at: "2 Aug, 09:15",
    tone: "bg-primary",
  },
];

export interface MockAccessRow {
  who: string;
  level: string;
  tone: string;
}

export const mockAccessMatrix = (): MockAccessRow[] => [
  {
    who: "Rudo Sibanda (lead counsel)",
    level: "Full access",
    tone: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  {
    who: "Amara Nkurunziza (support counsel)",
    level: "Full access",
    tone: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  {
    who: "Upendo Sibanda (sign-off, above $300k)",
    level: "View + approve",
    tone: "bg-blue-100 text-blue-700 border-blue-200",
  },
  {
    who: "Billing team",
    level: "Financials only",
    tone: "bg-amber-100 text-amber-700 border-amber-200",
  },
  {
    who: "Client portal contact",
    level: "Restricted — status only",
    tone: "bg-amber-100 text-amber-700 border-amber-200",
  },
  {
    who: "Position paper & settlement analysis",
    level: "Confidential — case team only",
    tone: "bg-rose-100 text-rose-700 border-rose-200",
  },
];

export interface MockDraft {
  title: string;
  meta: string;
  status: "Draft" | "In review" | "Final";
}

export const mockDrafting = (): MockDraft[] => [
  {
    title: "Position paper",
    meta: "v3 · Rudo Sibanda · last edited 5 Aug 2026",
    status: "Final",
  },
  {
    title: "Opening statement",
    meta: "v1 · Amara Nkurunziza · last edited 6 Aug 2026",
    status: "In review",
  },
  {
    title: "Settlement deed (skeleton)",
    meta: "v1 · generated from clause library",
    status: "Draft",
  },
];

export interface MockCaseTemplate {
  title: string;
  category: string;
  jurisdiction: string;
  description: string;
}

export const CASE_TEMPLATES: MockCaseTemplate[] = [
  {
    title: "Notice of mediation",
    category: "Notices",
    jurisdiction: "Rwanda",
    description: "Standard notice served under an ADR clause",
  },
  {
    title: "Position paper skeleton",
    category: "Pleadings & papers",
    jurisdiction: "Rwanda",
    description: "Structured position paper with issues and relief",
  },
  {
    title: "Settlement deed",
    category: "Settlement",
    jurisdiction: "Rwanda",
    description: "Mutual release, payment schedule, confidentiality",
  },
  {
    title: "Statement of claim",
    category: "Pleadings & papers",
    jurisdiction: "Rwanda",
    description: "Court claim with particulars and prayer",
  },
  {
    title: "Witness statement",
    category: "Evidence",
    jurisdiction: "Rwanda",
    description: "Sworn statement template with verification block",
  },
  {
    title: "Hearing bundle index",
    category: "Hearings",
    jurisdiction: "Rwanda",
    description: "Paginated index for the hearing bundle",
  },
];
