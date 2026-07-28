import { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────
// Risk sub-module — programme layer (prototype, localStorage).
// Covers the three workflows that have no backend yet:
//   2.2 Emerging Risks  (pre-register watch list)
//   2.3 Testing Programme (recurring control testing cycle)
//   2.4 Deficiencies    (remediation cycle, 3 possible origins)
// A failed test fires a deficiency; an escalated emerging risk
// leaves this store and is handed to the Risk Register.
// ─────────────────────────────────────────────────────────────

const KEY = "grc_risk_programme_v1";
const EVT = "grc_risk_programme_changed";

export const RISK_CATEGORY_LIST = [
  "Strategic",
  "Operational",
  "Financial",
  "Compliance",
  "Reputational",
  "Information Security",
] as const;
export type ProgCategory = (typeof RISK_CATEGORY_LIST)[number];

export type Severity = "Critical" | "High" | "Medium" | "Low";
export const SEVERITIES: Severity[] = ["Critical", "High", "Medium", "Low"];

export const REMEDIATION_DAYS: Record<Severity, number> = {
  Critical: 30,
  High: 60,
  Medium: 90,
  Low: 180,
};

// ── Emerging risks ───────────────────────────────────────────

export type Velocity = "Immediate" | "Short term" | "Medium term" | "Long term";
export const VELOCITIES: Velocity[] = [
  "Immediate",
  "Short term",
  "Medium term",
  "Long term",
];

export type WatchList = "Active watch" | "Monitor" | "Low priority";
export type EmergingStatus = "Watching" | "Escalated" | "Removed";
export type TriggerKind =
  | "Likelihood increase"
  | "Proximity"
  | "Trigger event";

export interface EscalationTrigger {
  id: string;
  kind: TriggerKind;
  condition: string;
  fired: boolean;
  firedAt: string | null;
}

export interface QuarterlyReview {
  id: string;
  at: string;
  quarter: string;
  recommendation: "Escalate to register" | "Maintain watch" | "Remove";
  note: string;
}

export interface EmergingRisk {
  id: string;
  title: string;
  category: ProgCategory;
  source: "Manual entry" | "Regulatory feed" | "Horizon scan";
  description: string;
  impact: number; // 1-5
  velocity: Velocity;
  watchList: WatchList;
  owner: string;
  triggers: EscalationTrigger[];
  reviews: QuarterlyReview[];
  status: EmergingStatus;
  createdAt: string;
  escalatedAt: string | null;
  escalationNote: string;
}

// ── Testing programme ────────────────────────────────────────

export type TestFrequency =
  | "Every 6 months"
  | "Annually"
  | "Biennially"
  | "Every 2-3 years";

export type TestStatus =
  | "Planned"
  | "Assigned"
  | "In progress"
  | "Awaiting sign-off"
  | "Signed off";

export type TestConclusion = "Pass" | "Fail" | null;

export interface EvidenceItem {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
}

export interface ControlTest {
  id: string;
  controlCode: string;
  controlName: string;
  riskRating: "Extreme" | "High" | "Medium" | "Low";
  frequency: TestFrequency;
  procedure: string;
  year: number;
  dueDate: string;
  tester: string;
  status: TestStatus;
  conclusion: TestConclusion;
  findings: string;
  evidence: EvidenceItem[];
  signedOffBy: string;
  signedOffAt: string | null;
  completedAt: string | null;
}

export const FREQUENCY_BY_RATING: Record<
  ControlTest["riskRating"],
  TestFrequency
> = {
  Extreme: "Every 6 months",
  High: "Annually",
  Medium: "Biennially",
  Low: "Every 2-3 years",
};

// ── Deficiencies ─────────────────────────────────────────────

export type DeficiencyOrigin =
  | "Control test"
  | "Incident investigation"
  | "Audit finding";

export type DefStatus =
  | "Open"
  | "Plan agreed"
  | "In remediation"
  | "Awaiting validation"
  | "Closed";

export interface Deficiency {
  id: string;
  reference: string;
  title: string;
  origin: DeficiencyOrigin;
  sourceRef: string;
  category: ProgCategory;
  severity: Severity;
  rootCause: string;
  owner: string;
  loggedAt: string;
  deadline: string;
  plan: string;
  managementResponse: string;
  evidence: EvidenceItem[];
  validatedBy: string;
  validatedAt: string | null;
  status: DefStatus;
}

export interface ProgrammeState {
  emerging: EmergingRisk[];
  tests: ControlTest[];
  deficiencies: Deficiency[];
}

// ── helpers ──────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);
const iso = (d: Date) => d.toISOString();
const addDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
};
const ago = (n: number) => addDays(-n);

export const daysUntil = (dateIso: string) =>
  Math.ceil(
    (new Date(dateIso).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

export const isOverdue = (dateIso: string, closed: boolean) =>
  !closed && daysUntil(dateIso) < 0;

export function deadlineFor(severity: Severity, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + REMEDIATION_DAYS[severity]);
  return iso(d);
}

// ── seed ─────────────────────────────────────────────────────

function seed(): ProgrammeState {
  const year = new Date().getFullYear();
  return {
    emerging: [
      {
        id: uid(),
        title: "BNR draft directive on agent banking liquidity",
        category: "Compliance",
        source: "Regulatory feed",
        description:
          "Central bank consultation paper proposes minimum liquidity buffers for agent networks. Not yet gazetted.",
        impact: 4,
        velocity: "Short term",
        watchList: "Active watch",
        owner: "Head of Compliance",
        triggers: [
          {
            id: uid(),
            kind: "Trigger event",
            condition: "Directive gazetted or effective date published",
            fired: false,
            firedAt: null,
          },
        ],
        reviews: [
          {
            id: uid(),
            at: ago(28),
            quarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${year}`,
            recommendation: "Maintain watch",
            note: "Consultation window still open; no final text.",
          },
        ],
        status: "Watching",
        createdAt: ago(74),
        escalatedAt: null,
        escalationNote: "",
      },
      {
        id: uid(),
        title: "Regional data-localisation pressure",
        category: "Information Security",
        source: "Horizon scan",
        description:
          "Neighbouring jurisdictions signalling in-country hosting mandates that would affect our cloud footprint.",
        impact: 3,
        velocity: "Medium term",
        watchList: "Monitor",
        owner: "CTO",
        triggers: [
          {
            id: uid(),
            kind: "Proximity",
            condition: "Any bill tabled in Rwanda parliament",
            fired: false,
            firedAt: null,
          },
        ],
        reviews: [],
        status: "Watching",
        createdAt: ago(120),
        escalatedAt: null,
        escalationNote: "",
      },
      {
        id: uid(),
        title: "FX volatility on USD-denominated vendor contracts",
        category: "Financial",
        source: "Manual entry",
        description:
          "RWF depreciation trend increasing cost of core software subscriptions.",
        impact: 4,
        velocity: "Immediate",
        watchList: "Active watch",
        owner: "CFO",
        triggers: [
          {
            id: uid(),
            kind: "Likelihood increase",
            condition: "RWF/USD moves more than 8% in a quarter",
            fired: true,
            firedAt: ago(9),
          },
        ],
        reviews: [],
        status: "Watching",
        createdAt: ago(60),
        escalatedAt: null,
        escalationNote: "",
      },
      {
        id: uid(),
        title: "Key-person dependency in payments engineering",
        category: "Operational",
        source: "Horizon scan",
        description:
          "Escalated into the enterprise register after the trigger fired.",
        impact: 4,
        velocity: "Immediate",
        watchList: "Active watch",
        owner: "COO",
        triggers: [
          {
            id: uid(),
            kind: "Trigger event",
            condition: "Resignation of a named critical engineer",
            fired: true,
            firedAt: ago(40),
          },
        ],
        reviews: [],
        status: "Escalated",
        createdAt: ago(150),
        escalatedAt: ago(40),
        escalationNote: "Moved to Risk Register as RSK-014.",
      },
    ],
    tests: [
      {
        id: uid(),
        controlCode: "CTL-001",
        controlName: "Dual authorisation on payments above RWF 5m",
        riskRating: "Extreme",
        frequency: "Every 6 months",
        procedure:
          "Select a sample of 25 payments above threshold; confirm two distinct approver IDs in the audit log.",
        year,
        dueDate: ago(12),
        tester: "Internal Audit — J. Uwase",
        status: "Signed off",
        conclusion: "Fail",
        findings:
          "3 of 25 sampled payments released with a single approver during system downtime.",
        evidence: [
          { id: uid(), name: "sample-log-extract.xlsx", size: 41200, uploadedAt: ago(14) },
        ],
        signedOffBy: "Head of Risk",
        signedOffAt: ago(11),
        completedAt: ago(13),
      },
      {
        id: uid(),
        controlCode: "CTL-004",
        controlName: "Quarterly user access recertification",
        riskRating: "High",
        frequency: "Annually",
        procedure:
          "Confirm recertification pack completed and signed for each in-scope system.",
        year,
        dueDate: ago(3),
        tester: "Compliance Officer",
        status: "Awaiting sign-off",
        conclusion: "Pass",
        findings: "All four in-scope systems recertified within the window.",
        evidence: [
          { id: uid(), name: "recert-pack-q2.pdf", size: 88400, uploadedAt: ago(4) },
        ],
        signedOffBy: "",
        signedOffAt: null,
        completedAt: ago(3),
      },
      {
        id: uid(),
        controlCode: "CTL-007",
        controlName: "Vendor onboarding due diligence checklist",
        riskRating: "Medium",
        frequency: "Biennially",
        procedure:
          "Trace 10 vendors onboarded this year to a completed DD questionnaire and approval.",
        year,
        dueDate: addDays(21),
        tester: "Procurement Lead",
        status: "In progress",
        conclusion: null,
        findings: "",
        evidence: [],
        signedOffBy: "",
        signedOffAt: null,
        completedAt: null,
      },
      {
        id: uid(),
        controlCode: "CTL-011",
        controlName: "Daily core-banking backup verification",
        riskRating: "Extreme",
        frequency: "Every 6 months",
        procedure:
          "Verify backup completion logs and one restore test for the sampled month.",
        year,
        dueDate: addDays(48),
        tester: "",
        status: "Planned",
        conclusion: null,
        findings: "",
        evidence: [],
        signedOffBy: "",
        signedOffAt: null,
        completedAt: null,
      },
      {
        id: uid(),
        controlCode: "CTL-015",
        controlName: "Annual conflict-of-interest declarations",
        riskRating: "Low",
        frequency: "Every 2-3 years",
        procedure: "Confirm declaration completion rate above 95%.",
        year,
        dueDate: ago(20),
        tester: "HR Manager",
        status: "Assigned",
        conclusion: null,
        findings: "",
        evidence: [],
        signedOffBy: "",
        signedOffAt: null,
        completedAt: null,
      },
    ],
    deficiencies: [
      {
        id: uid(),
        reference: "DEF-001",
        title: "Single-approver payment releases during downtime",
        origin: "Control test",
        sourceRef: "CTL-001 test failure",
        category: "Operational",
        severity: "Critical",
        rootCause:
          "Break-glass procedure allows bypass without compensating review.",
        owner: "Head of Operations",
        loggedAt: ago(11),
        deadline: deadlineFor("Critical", new Date(Date.now() - 11 * 864e5)),
        plan: "Introduce post-event review within 24h for any break-glass release; log all bypasses.",
        managementResponse: "Accepted in full.",
        evidence: [],
        validatedBy: "",
        validatedAt: null,
        status: "In remediation",
      },
      {
        id: uid(),
        reference: "DEF-002",
        title: "Incomplete incident timeline documentation",
        origin: "Incident investigation",
        sourceRef: "INC-2026-014",
        category: "Compliance",
        severity: "Medium",
        rootCause: "No standard template for investigator timelines.",
        owner: "Compliance Officer",
        loggedAt: ago(55),
        deadline: deadlineFor("Medium", new Date(Date.now() - 55 * 864e5)),
        plan: "Publish incident timeline template and train investigators.",
        managementResponse: "Template drafted.",
        evidence: [
          { id: uid(), name: "timeline-template-v1.docx", size: 22100, uploadedAt: ago(8) },
        ],
        validatedBy: "",
        validatedAt: null,
        status: "Awaiting validation",
      },
      {
        id: uid(),
        reference: "DEF-003",
        title: "Access recertification evidence not retained centrally",
        origin: "Audit finding",
        sourceRef: "Internal Audit 2025 — finding 4",
        category: "Information Security",
        severity: "High",
        rootCause: "Evidence stored on local drives by system owners.",
        owner: "IT Manager",
        loggedAt: ago(140),
        deadline: deadlineFor("High", new Date(Date.now() - 140 * 864e5)),
        plan: "Central evidence repository with per-system folders.",
        managementResponse: "Repository live since last quarter.",
        evidence: [
          { id: uid(), name: "repo-structure.png", size: 65000, uploadedAt: ago(70) },
        ],
        validatedBy: "Internal Audit",
        validatedAt: ago(66),
        status: "Closed",
      },
      {
        id: uid(),
        reference: "DEF-004",
        title: "Vendor DD questionnaires missing data-access section",
        origin: "Audit finding",
        sourceRef: "Internal Audit 2026 — finding 2",
        category: "Operational",
        severity: "Medium",
        rootCause: "Questionnaire template predates data-protection policy.",
        owner: "Procurement Lead",
        loggedAt: ago(30),
        deadline: deadlineFor("Medium", new Date(Date.now() - 30 * 864e5)),
        plan: "",
        managementResponse: "",
        evidence: [],
        validatedBy: "",
        validatedAt: null,
        status: "Open",
      },
    ],
  };
}

// ── persistence ──────────────────────────────────────────────

function read(): ProgrammeState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as ProgrammeState;
  } catch {
    return seed();
  }
}

function write(next: ProgrammeState) {
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVT));
}

export function useRiskProgramme() {
  const [state, setState] = useState<ProgrammeState>(read);

  useEffect(() => {
    const sync = () => setState(read());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const mutate = (fn: (s: ProgrammeState) => ProgrammeState) => {
    const next = fn(read());
    write(next);
    setState(next);
  };

  // ── Emerging risks ─────────────────────────────────────────

  const addEmerging = (
    dto: Omit<
      EmergingRisk,
      | "id"
      | "triggers"
      | "reviews"
      | "status"
      | "createdAt"
      | "escalatedAt"
      | "escalationNote"
      | "watchList"
    > & { watchList?: WatchList },
  ) =>
    mutate((s) => ({
      ...s,
      emerging: [
        {
          ...dto,
          watchList:
            dto.watchList ?? categoriseWatchList(dto.impact, dto.velocity),
          id: uid(),
          triggers: [],
          reviews: [],
          status: "Watching",
          createdAt: iso(new Date()),
          escalatedAt: null,
          escalationNote: "",
        },
        ...s.emerging,
      ],
    }));

  const updateEmerging = (id: string, patch: Partial<EmergingRisk>) =>
    mutate((s) => ({
      ...s,
      emerging: s.emerging.map((e) =>
        e.id === id
          ? {
              ...e,
              ...patch,
              watchList:
                patch.impact !== undefined || patch.velocity !== undefined
                  ? categoriseWatchList(
                      patch.impact ?? e.impact,
                      patch.velocity ?? e.velocity,
                    )
                  : (patch.watchList ?? e.watchList),
            }
          : e,
      ),
    }));

  const addTrigger = (
    id: string,
    trigger: Omit<EscalationTrigger, "id" | "fired" | "firedAt">,
  ) =>
    mutate((s) => ({
      ...s,
      emerging: s.emerging.map((e) =>
        e.id === id
          ? {
              ...e,
              triggers: [
                ...e.triggers,
                { ...trigger, id: uid(), fired: false, firedAt: null },
              ],
            }
          : e,
      ),
    }));

  const fireTrigger = (id: string, triggerId: string) =>
    mutate((s) => ({
      ...s,
      emerging: s.emerging.map((e) =>
        e.id === id
          ? {
              ...e,
              triggers: e.triggers.map((t) =>
                t.id === triggerId
                  ? { ...t, fired: true, firedAt: iso(new Date()) }
                  : t,
              ),
            }
          : e,
      ),
    }));

  const addEmergingReview = (
    id: string,
    review: Omit<QuarterlyReview, "id" | "at">,
  ) =>
    mutate((s) => ({
      ...s,
      emerging: s.emerging.map((e) =>
        e.id === id
          ? {
              ...e,
              reviews: [
                { ...review, id: uid(), at: iso(new Date()) },
                ...e.reviews,
              ],
              status:
                review.recommendation === "Remove" ? "Removed" : e.status,
            }
          : e,
      ),
    }));

  /** Step 6 — the record moves out of the watch list into the register. */
  const escalateEmerging = (id: string, note: string) =>
    mutate((s) => ({
      ...s,
      emerging: s.emerging.map((e) =>
        e.id === id
          ? {
              ...e,
              status: "Escalated",
              escalatedAt: iso(new Date()),
              escalationNote: note,
            }
          : e,
      ),
    }));

  const removeEmerging = (id: string) =>
    mutate((s) => ({
      ...s,
      emerging: s.emerging.filter((e) => e.id !== id),
    }));

  // ── Testing programme ──────────────────────────────────────

  const addTest = (
    dto: Pick<
      ControlTest,
      "controlCode" | "controlName" | "riskRating" | "procedure" | "dueDate"
    > & { tester?: string },
  ) =>
    mutate((s) => ({
      ...s,
      tests: [
        {
          ...dto,
          id: uid(),
          frequency: FREQUENCY_BY_RATING[dto.riskRating],
          year: new Date().getFullYear(),
          tester: dto.tester ?? "",
          status: dto.tester ? "Assigned" : "Planned",
          conclusion: null,
          findings: "",
          evidence: [],
          signedOffBy: "",
          signedOffAt: null,
          completedAt: null,
        },
        ...s.tests,
      ],
    }));

  const updateTest = (id: string, patch: Partial<ControlTest>) =>
    mutate((s) => ({
      ...s,
      tests: s.tests.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));

  const assignTest = (id: string, tester: string, dueDate: string) =>
    updateTest(id, { tester, dueDate, status: "Assigned" });

  const addTestEvidence = (id: string, files: EvidenceItem[]) =>
    mutate((s) => ({
      ...s,
      tests: s.tests.map((t) =>
        t.id === id ? { ...t, evidence: [...t.evidence, ...files] } : t,
      ),
    }));

  /** Step 3 — a Fail conclusion fires a deficiency (workflow 2.4 step 1). */
  const completeTest = (
    id: string,
    conclusion: Exclude<TestConclusion, null>,
    findings: string,
    severity: Severity,
  ) =>
    mutate((s) => {
      const test = s.tests.find((t) => t.id === id);
      const tests = s.tests.map((t) =>
        t.id === id
          ? {
              ...t,
              conclusion,
              findings,
              status: "Awaiting sign-off" as TestStatus,
              completedAt: iso(new Date()),
            }
          : t,
      );
      if (conclusion === "Pass" || !test) return { ...s, tests };
      return {
        ...s,
        tests,
        deficiencies: [
          {
            id: uid(),
            reference: nextRef(s.deficiencies),
            title: `Control failure — ${test.controlName}`,
            origin: "Control test" as DeficiencyOrigin,
            sourceRef: `${test.controlCode} test failure`,
            category: "Operational" as ProgCategory,
            severity,
            rootCause: findings,
            owner: "",
            loggedAt: iso(new Date()),
            deadline: deadlineFor(severity),
            plan: "",
            managementResponse: "",
            evidence: [],
            validatedBy: "",
            validatedAt: null,
            status: "Open" as DefStatus,
          },
          ...s.deficiencies,
        ],
      };
    });

  const signOffTest = (id: string, by: string) =>
    updateTest(id, {
      signedOffBy: by,
      signedOffAt: iso(new Date()),
      status: "Signed off",
    });

  const deleteTest = (id: string) =>
    mutate((s) => ({ ...s, tests: s.tests.filter((t) => t.id !== id) }));

  /** Step 1 — regenerate the annual plan from control ratings. */
  const generateAnnualPlan = (
    controls: {
      controlCode: string;
      controlName: string;
      riskRating: ControlTest["riskRating"];
      procedure?: string;
    }[],
  ) =>
    mutate((s) => {
      const year = new Date().getFullYear();
      const existing = new Set(
        s.tests.filter((t) => t.year === year).map((t) => t.controlCode),
      );
      const created = controls
        .filter((c) => !existing.has(c.controlCode))
        .map((c, i) => ({
          id: uid(),
          controlCode: c.controlCode,
          controlName: c.controlName,
          riskRating: c.riskRating,
          frequency: FREQUENCY_BY_RATING[c.riskRating],
          procedure: c.procedure ?? "",
          year,
          dueDate: addDays(30 + i * 14),
          tester: "",
          status: "Planned" as TestStatus,
          conclusion: null,
          findings: "",
          evidence: [],
          signedOffBy: "",
          signedOffAt: null,
          completedAt: null,
        }));
      return { ...s, tests: [...created, ...s.tests] };
    });

  // ── Deficiencies ───────────────────────────────────────────

  const addDeficiency = (
    dto: Pick<
      Deficiency,
      "title" | "origin" | "sourceRef" | "category" | "severity" | "rootCause"
    > & { owner?: string },
  ) =>
    mutate((s) => ({
      ...s,
      deficiencies: [
        {
          ...dto,
          id: uid(),
          reference: nextRef(s.deficiencies),
          owner: dto.owner ?? "",
          loggedAt: iso(new Date()),
          deadline: deadlineFor(dto.severity),
          plan: "",
          managementResponse: "",
          evidence: [],
          validatedBy: "",
          validatedAt: null,
          status: "Open",
        },
        ...s.deficiencies,
      ],
    }));

  const updateDeficiency = (id: string, patch: Partial<Deficiency>) =>
    mutate((s) => ({
      ...s,
      deficiencies: s.deficiencies.map((d) =>
        d.id === id
          ? {
              ...d,
              ...patch,
              deadline:
                patch.severity && patch.severity !== d.severity
                  ? deadlineFor(patch.severity, new Date(d.loggedAt))
                  : (patch.deadline ?? d.deadline),
            }
          : d,
      ),
    }));

  const addDeficiencyEvidence = (id: string, files: EvidenceItem[]) =>
    mutate((s) => ({
      ...s,
      deficiencies: s.deficiencies.map((d) =>
        d.id === id
          ? {
              ...d,
              evidence: [...d.evidence, ...files],
              status:
                d.status === "Closed"
                  ? d.status
                  : ("Awaiting validation" as DefStatus),
            }
          : d,
      ),
    }));

  const validateDeficiency = (id: string, by: string) =>
    updateDeficiency(id, {
      validatedBy: by,
      validatedAt: iso(new Date()),
      status: "Closed",
    });

  const deleteDeficiency = (id: string) =>
    mutate((s) => ({
      ...s,
      deficiencies: s.deficiencies.filter((d) => d.id !== id),
    }));

  const resetProgramme = () => {
    localStorage.removeItem(KEY);
    const s = read();
    write(s);
    setState(s);
  };

  return {
    ...state,
    addEmerging,
    updateEmerging,
    addTrigger,
    fireTrigger,
    addEmergingReview,
    escalateEmerging,
    removeEmerging,
    addTest,
    updateTest,
    assignTest,
    addTestEvidence,
    completeTest,
    signOffTest,
    deleteTest,
    generateAnnualPlan,
    addDeficiency,
    updateDeficiency,
    addDeficiencyEvidence,
    validateDeficiency,
    deleteDeficiency,
    resetProgramme,
  };
}

function nextRef(list: Deficiency[]) {
  const n = list.length + 1;
  return `DEF-${String(n).padStart(3, "0")}`;
}

export function categoriseWatchList(
  impact: number,
  velocity: Velocity,
): WatchList {
  const fast = velocity === "Immediate" || velocity === "Short term";
  if (impact >= 4 && fast) return "Active watch";
  if (impact >= 3) return "Monitor";
  return "Low priority";
}

// ── display helpers ──────────────────────────────────────────

export const severityTone = (s: Severity) =>
  ({
    Critical: "bg-rose-100 text-rose-700 border-rose-200",
    High: "bg-orange-100 text-orange-700 border-orange-200",
    Medium: "bg-amber-100 text-amber-700 border-amber-200",
    Low: "bg-emerald-100 text-emerald-700 border-emerald-200",
  })[s];

export const testStatusTone = (s: TestStatus) =>
  ({
    Planned: "bg-muted text-muted-foreground border-border",
    Assigned: "bg-sky-100 text-sky-700 border-sky-200",
    "In progress": "bg-indigo-100 text-indigo-700 border-indigo-200",
    "Awaiting sign-off": "bg-amber-100 text-amber-700 border-amber-200",
    "Signed off": "bg-emerald-100 text-emerald-700 border-emerald-200",
  })[s];

export const defStatusTone = (s: DefStatus) =>
  ({
    Open: "bg-rose-100 text-rose-700 border-rose-200",
    "Plan agreed": "bg-sky-100 text-sky-700 border-sky-200",
    "In remediation": "bg-indigo-100 text-indigo-700 border-indigo-200",
    "Awaiting validation": "bg-amber-100 text-amber-700 border-amber-200",
    Closed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  })[s];

export const watchTone = (w: WatchList) =>
  ({
    "Active watch": "bg-rose-100 text-rose-700 border-rose-200",
    Monitor: "bg-amber-100 text-amber-700 border-amber-200",
    "Low priority": "bg-muted text-muted-foreground border-border",
  })[w];
