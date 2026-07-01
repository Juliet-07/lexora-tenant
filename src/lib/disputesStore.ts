import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────
export type DisputeStage =
  | "reported"
  | "acknowledged"
  | "investigation"
  | "hearing"
  | "outcome"
  | "appeal"
  | "closed"
  | "escalated_local"
  | "escalated_national"
  | "court";

export type Severity = "Low" | "Medium" | "High";
export type CaseType =
  | "Grievance"
  | "Disciplinary"
  | "Harassment"
  | "Performance"
  | "Other";
export type Hierarchy = "regular" | "manager" | "head_of_department";

export interface Note {
  by: string;
  role: string;
  note: string;
  at: string;
}

export interface Dispute {
  id: string;
  // Reporter
  reporterId: string;
  reporterName: string;
  reporterRole: Hierarchy;
  reporterManagerName?: string;
  // Respondent
  againstName: string;
  againstRole: Hierarchy;
  againstDepartment?: string;
  // Case
  type: CaseType;
  title: string;
  description: string;
  severity: Severity;
  witnesses?: string;
  outcomeSought?: string;
  stage: DisputeStage;
  filedOn: string;
  // Ownership — depending on class of the case
  investigators: string[]; // e.g., ["HR", "Manager: Joel K."]
  managerLooped: boolean; // true when against a regular employee
  loopedManagerName?: string;
  // Trail
  acknowledgement?: { at: string; by: string; note: string };
  investigationNotes: Note[];
  hearing?: {
    scheduledAt?: string;
    venue?: string;
    representative?: string;
    notes: Note[];
  };
  outcome?: {
    decision:
      | "Verbal warning"
      | "First written warning"
      | "Final written warning"
      | "Suspension"
      | "Termination"
      | "Grievance upheld"
      | "Grievance dismissed"
      | "No case to answer";
    rationale: string;
    at: string;
    by: string;
  };
  appeal?: {
    filedAt: string;
    grounds: string;
    remedySought: string;
    decision?: "Upheld" | "Dismissed" | "Modified";
    decisionNote?: string;
    decidedAt?: string;
  };
  escalation: { level: string; at: string; note: string }[];
}

// ─── Storage ──────────────────────────────────────────────────────
const KEY = "lexora.disputes.v1";

const SEED: Dispute[] = [
  {
    id: "DSP-001",
    reporterId: "u-emp-1",
    reporterName: "Adaeze Okonkwo",
    reporterRole: "regular",
    reporterManagerName: "Joel Kagabo",
    againstName: "Samuel Nkurunziza",
    againstRole: "regular",
    againstDepartment: "Operations",
    type: "Grievance",
    title: "Unfair shift allocation",
    description:
      "Repeatedly assigned weekend shifts beyond the rota policy, without consultation.",
    severity: "Medium",
    stage: "investigation",
    filedOn: "2026-06-18",
    investigators: ["HR", "Manager: Joel Kagabo"],
    managerLooped: true,
    loopedManagerName: "Joel Kagabo",
    acknowledgement: {
      at: "2026-06-19",
      by: "HR — Sarah Lee",
      note: "Case received and logged confidentially.",
    },
    investigationNotes: [
      {
        by: "Joel Kagabo",
        role: "Manager",
        note: "Interviewed both parties; pulled rota records for May–June.",
        at: "2026-06-22",
      },
    ],
    escalation: [],
  },
  {
    id: "DSP-002",
    reporterId: "u-mgr-2",
    reporterName: "Joel Kagabo",
    reporterRole: "manager",
    againstName: "Tariq Hassan",
    againstRole: "regular",
    againstDepartment: "Sales",
    type: "Disciplinary",
    title: "Repeated lateness",
    description:
      "Six late arrivals in May exceeding the policy threshold of three.",
    severity: "Low",
    stage: "hearing",
    filedOn: "2026-06-02",
    investigators: ["HR", "Manager: Joel Kagabo"],
    managerLooped: true,
    loopedManagerName: "Joel Kagabo",
    acknowledgement: {
      at: "2026-06-03",
      by: "HR — Sarah Lee",
      note: "Acknowledged; investigation opened.",
    },
    investigationNotes: [
      {
        by: "Sarah Lee",
        role: "HR",
        note: "Attendance logs pulled — 6 late arrivals confirmed.",
        at: "2026-06-09",
      },
    ],
    hearing: {
      scheduledAt: "2026-06-28",
      venue: "HR Boardroom",
      representative: "Peer — Marie Uwase",
      notes: [],
    },
    escalation: [],
  },
  {
    id: "DSP-003",
    reporterId: "u-emp-3",
    reporterName: "Marie Uwase",
    reporterRole: "regular",
    reporterManagerName: "Joel Kagabo",
    againstName: "Aline Mukamana",
    againstRole: "head_of_department",
    againstDepartment: "Finance",
    type: "Harassment",
    title: "Verbal misconduct from department head",
    description:
      "Formal complaint against HoD; witness statements collected in-office.",
    severity: "High",
    stage: "outcome",
    filedOn: "2026-05-10",
    investigators: ["HR Director"],
    managerLooped: false,
    acknowledgement: {
      at: "2026-05-11",
      by: "HR Director",
      note: "Case escalated directly to HR Director owing to seniority of respondent.",
    },
    investigationNotes: [
      {
        by: "HR Director",
        role: "HR",
        note: "Two witnesses interviewed; statements on file.",
        at: "2026-05-18",
      },
    ],
    hearing: {
      scheduledAt: "2026-05-25",
      venue: "External counsel offices",
      notes: [
        {
          by: "HR Director",
          role: "HR",
          note: "Hearing held; respondent accompanied by representative.",
          at: "2026-05-25",
        },
      ],
    },
    outcome: {
      decision: "Final written warning",
      rationale:
        "Conduct breached the Respectful Workplace Policy; final written warning issued with 12-month review.",
      at: "2026-05-28",
      by: "HR Director",
    },
    escalation: [],
  },
];

function load(): Dispute[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as Dispute[];
  } catch {
    return SEED;
  }
}

function save(items: Dispute[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("disputes:changed"));
}

// ─── API ──────────────────────────────────────────────────────────
export function getDisputes(): Dispute[] {
  return load();
}

export function nextDisputeId(): string {
  return `DSP-${String(load().length + 1).padStart(3, "0")}`;
}

export function addDispute(d: Dispute) {
  save([d, ...load()]);
}

export function updateDispute(id: string, patch: Partial<Dispute>) {
  save(load().map((x) => (x.id === id ? { ...x, ...patch } : x)));
}

export function appendInvestigationNote(id: string, note: Note) {
  const items = load().map((x) =>
    x.id === id
      ? { ...x, investigationNotes: [...x.investigationNotes, note] }
      : x,
  );
  save(items);
}

export function appendHearingNote(id: string, note: Note) {
  const items = load().map((x) => {
    if (x.id !== id) return x;
    const hearing = x.hearing ?? { notes: [] };
    return { ...x, hearing: { ...hearing, notes: [...hearing.notes, note] } };
  });
  save(items);
}

export function useDisputes() {
  const [items, setItems] = useState<Dispute[]>(() => load());
  useEffect(() => {
    const sync = () => setItems(load());
    window.addEventListener("disputes:changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("disputes:changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return items;
}

// ─── Presentation helpers ─────────────────────────────────────────
export const STAGE_LABEL: Record<DisputeStage, string> = {
  reported: "Reported",
  acknowledged: "Acknowledged",
  investigation: "Investigation",
  hearing: "Hearing",
  outcome: "Outcome",
  appeal: "Appeal",
  closed: "Closed",
  escalated_local: "Labour Inspectorate (local)",
  escalated_national: "Labour Inspectorate (national)",
  court: "Primary Court",
};

export const STAGE_TONE: Record<DisputeStage, string> = {
  reported: "bg-muted text-muted-foreground border-border",
  acknowledged: "bg-info/10 text-info border-info/20",
  investigation: "bg-primary/10 text-primary border-primary/20",
  hearing: "bg-warning/10 text-warning border-warning/20",
  outcome: "bg-success/10 text-success border-success/20",
  appeal: "bg-secondary/10 text-secondary border-secondary/20",
  closed: "bg-muted text-muted-foreground border-border",
  escalated_local: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  escalated_national: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  court: "bg-destructive/10 text-destructive border-destructive/20",
};

export const SEVERITY_TONE: Record<Severity, string> = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-warning/10 text-warning border-warning/20",
  High: "bg-destructive/10 text-destructive border-destructive/20",
};

/** Standard internal flow order (excludes escalation branch). */
export const INTERNAL_FLOW: DisputeStage[] = [
  "reported",
  "acknowledged",
  "investigation",
  "hearing",
  "outcome",
  "appeal",
  "closed",
];

/** External escalation ladder per Rwandan labour law. */
export const ESCALATION_LADDER: DisputeStage[] = [
  "escalated_local",
  "escalated_national",
  "court",
];
