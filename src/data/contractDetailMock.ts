// ─────────────────────────────────────────────────────────────
// Dummy data for contract-detail surfaces that have no API yet.
// Everything here is derived deterministically from the contract
// so each contract looks consistent between visits. Replace each
// block with a real endpoint when the backend lands.
// ─────────────────────────────────────────────────────────────

export interface MockParty {
  name: string;
  meta: string;
  signatory: string;
  role: "First Party" | "Second Party";
}

export interface MockApprover {
  initials: string;
  name: string;
  role: string;
  status: "Approved" | "In review" | "Waiting" | "Final sign-off";
  at?: string;
}

export interface MockCondition {
  label: string;
  detail: string;
  satisfied: boolean;
}

export interface MockChange {
  clause: string;
  change: string;
  note: string;
  status: "Accepted" | "Rejected" | "Pending";
}

export interface MockRound {
  round: number;
  title: string;
  meta: string;
  changes: MockChange[];
}

export interface MockVersion {
  label: string;
  title: string;
  meta: string;
}

const hash = (s: string) =>
  s.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7);

export const mockParties = (
  counterparty: string,
  counterpartyEmail: string,
): MockParty[] => [
  {
    name: counterparty || "Counterparty",
    meta: "Reg. 2024/123456/07 · Counterparty entity",
    signatory: `Authorised signatory · ${counterpartyEmail || "—"}`,
    role: "First Party",
  },
  {
    name: "Lexora Africa (Limited)",
    meta: "Reg. 100XXXXXX · Rwanda (KIFC)",
    signatory: "Upendo · Managing Partner",
    role: "Second Party",
  },
];

export const mockApprovalChain = (id: string): MockApprover[] => {
  const h = hash(id) % 3;
  const chain: MockApprover[] = [
    {
      initials: "RS",
      name: "Rudo Sibanda",
      role: "Lead drafter",
      status: "Waiting",
    },
    {
      initials: "AN",
      name: "Amara Ndikumana",
      role: "Senior associate",
      status: "Waiting",
    },
    {
      initials: "UM",
      name: "Upendo",
      role: "Managing Partner",
      status: "Final sign-off",
    },
  ];
  for (let i = 0; i < h; i++) {
    chain[i] = { ...chain[i], status: "Approved", at: "Approved this week" };
  }
  if (h < 3) chain[h] = { ...chain[h], status: "In review" };
  return chain;
};

export const mockConditionsPrecedent = (id: string): MockCondition[] => {
  const h = hash(id);
  return [
    {
      label: "AML/KYC verification",
      detail: `Auto-verified via KYC module (CDD-2026-0${(h % 89) + 10})`,
      satisfied: true,
    },
    {
      label: "Conflict of interest check",
      detail: "Cleared by compliance",
      satisfied: true,
    },
    {
      label: "Internal approvals complete",
      detail: "Sequential approval chain must finish",
      satisfied: h % 2 === 0,
    },
    {
      label: "Annexure A (fee schedule)",
      detail: "Required before execution per fee clause",
      satisfied: h % 3 === 0,
    },
  ];
};

export const mockNegotiationRounds = (id: string): MockRound[] => [
  {
    round: 2,
    title: "Counterparty mark-up",
    meta: "v1 → v2 · 7 changes",
    changes: [
      {
        clause: "cl. 1 Background",
        change: '"a company" → "an entity"',
        note: "Minor terminology. No commercial impact. Auto-accepted.",
        status: "Accepted",
      },
      {
        clause: "cl. 2 Purpose",
        change: 'Added "non-binding" before "framework"',
        note: "Standard qualifier. Accepted by lead drafter.",
        status: "Accepted",
      },
      {
        clause: "cl. 3.1 Joint activities",
        change: 'Added item (c) "shared use of training facilities"',
        note: "New scope item. Needs partner review. Cross-ref: cost impact in 5.1.",
        status: "Pending",
      },
      {
        clause: "cl. 5.1 Cost sharing",
        change: '"equally" → "proportionally per Annexure A"',
        note: "Material change. Annexure A not yet drafted. Blocking.",
        status: "Pending",
      },
      {
        clause: "cl. 9 Dispute resolution",
        change: "Requested Kigali as arbitration seat",
        note: "Jurisdictional preference. Recommend accept.",
        status: "Pending",
      },
      {
        clause: "cl. 7 Confidentiality",
        change: "Accepted library clause CL-CONF-001 v4 as-is",
        note: "Standard clause, no changes.",
        status: "Accepted",
      },
      {
        clause: "cl. 4 Roles",
        change: "Liaison officer period extended to 15 business days",
        note: "Comment received, no markup yet. Awaiting decision.",
        status: "Pending",
      },
    ],
  },
  {
    round: 1,
    title: "Internal review",
    meta: "Template → v1 · 4 changes · All resolved",
    changes: [
      {
        clause: "Preamble",
        change: "Updated template header",
        note: "",
        status: "Accepted",
      },
      {
        clause: "cl. 6 IP",
        change: "Swapped to joint ownership clause (CL-IP-002)",
        note: "",
        status: "Accepted",
      },
      {
        clause: "cl. 9 Dispute",
        change: "Inserted ADR escalation ladder (CL-ADR-001)",
        note: "",
        status: "Accepted",
      },
      {
        clause: "cl. 5 Financial",
        change: "Proposed retainer fee clause removed",
        note: "Not appropriate for this instrument.",
        status: "Rejected",
      },
    ],
  },
];

export const CLAUSE_LIBRARY = [
  { ref: "CL-CONF-001", label: "Confidentiality (standard)" },
  { ref: "CL-ADR-001", label: "ADR escalation ladder" },
  { ref: "CL-FM-003", label: "Force majeure" },
  { ref: "CL-IP-002", label: "IP ownership (joint)" },
  { ref: "CL-NS-004", label: "Non-solicitation" },
  { ref: "CL-TERM-006", label: "Termination for convenience" },
];

export const POST_EXECUTION_TRIGGERS = [
  { area: "CRM", detail: "Create mandate and link engagement letter" },
  { area: "Billing", detail: "Create billing schedule per fee clause" },
  { area: "Calendar", detail: "Set milestones and review dates" },
  { area: "Obligations", detail: "Activate obligation tracker" },
  { area: "CS tracker", detail: "Activate conditions subsequent" },
  { area: "Archive", detail: "Store executed copy with SHA-256 hash" },
];

export const mockVersions = (createdRef: string): MockVersion[] => [
  {
    label: "v2",
    title: "Current draft",
    meta: `Internal + counterparty edits · 4 changes · ${createdRef}`,
  },
  {
    label: "v1",
    title: "Initial draft from template",
    meta: "Generated from template · Lead drafter",
  },
];

export const mockGovernance = (id: string) => {
  const h = hash(id);
  return {
    governingLaw: "Laws of Rwanda",
    adrClause: "Mediation then arbitration",
    leadDrafter: "Rudo Barbra Sibanda",
    approvalChain: "Rudo → Amara → Upendo",
    conflictCheck: "Clear",
    kycStatus: "Verified",
    kycRef: `CDD-2026-0${(h % 89) + 10}`,
    riskClassification: (["Low", "Medium", "High"] as const)[h % 3],
    linkedRisk: `RSK-00${(h % 89) + 10}`,
    noticeDays: 60,
  };
};
