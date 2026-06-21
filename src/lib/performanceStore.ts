// Shared client-side performance store.
// Mirrors the Jameela Rwanda M1 Employee Performance Review flow:
//   1. Employee Info + Document Control & Compliance Checks
//   2. KPI Performance Scores — Dual Assessment (out of 100)
//   3. Skills & Competencies — Dual Assessment (1–5)
//   4. Behaviour & Values — Dual Assessment (1–5)
//   5. Self-Assessment Narrative (achievements, challenges, previous goals)
//   6. Goals for Next Review Period
//   7. Training, Development & Career Goals
//   8. Manager's Evaluation
//   9. Sign-Off
// Persists to localStorage so the tenant (admin) and employee views stay in sync.

import { employees } from "@/data/hrMockData";

export type ReviewStatus =
  | "Not Started"
  | "Self Review"
  | "Manager Review"
  | "Calibration"
  | "Completed";

export type GoalStatus = "Achieved" | "Partially Achieved" | "Not Achieved" | "Carried Over";
export type Priority = "High" | "Medium" | "Low";
export type YesNo = "Yes" | "No" | "N/A";

export interface KPI {
  id: string;
  name: string;
  target: string;
  metric: string;
  weight: number;
  actual?: string;
  selfScore?: number;
  managerScore?: number;
}

/** A KPA in the Jameela form represents a single row of Section 2:
 *  one Key Performance Area with a performance-standard description,
 *  a weight (% of 100 across the scorecard) and dual 1–5 scores. */
export interface KPA {
  id: string;
  title: string;
  description: string;   // "Performance Standard"
  weight: number;        // 0–100, all KPAs sum to 100
  selfScore?: number;    // 1–5
  managerScore?: number; // 1–5
  kpis: KPI[];           // optional sub-KPIs (legacy)
}

export interface CompetencyRow {
  id: string;
  name: string;
  description: string;
  selfScore?: number;
  employeeComment?: string;
  managerScore?: number;
  managerObservation?: string;
}

export interface ValueRow {
  id: string;
  name: string;
  description: string;
  selfScore?: number;
  employeeComment?: string;
  managerScore?: number;
  managerObservation?: string;
}

export interface ComplianceCheck {
  id: string;
  question: string;
  answer?: YesNo;
  date?: string;
  notes?: string;
}

export interface PreviousGoal {
  id: string;
  goal: string;
  status?: GoalStatus;
  employeeComments?: string;
  managerComments?: string;
}

export interface NextGoal {
  id: string;
  description: string;
  priority?: Priority;
  timeline?: string;
  managerComments?: string;
}

export interface TrainingItem {
  id: string;
  area: string;
  priority?: Priority;
  managementRecommendation?: string;
}

export interface EmployeeInfo {
  jobTitle?: string;
  department?: string;
  manager?: string;
  reviewPeriod?: string;
  reviewDate?: string;
  lastReviewDate?: string;
  reviewType?: "Annual" | "Mid-Year" | "Probation" | "Quarterly" | "Other";
  contractStartDate?: string;
}

export interface ManagerEvaluation {
  lastPeriodSummary?: string;
  thisPeriodAssessment?: string;
  developmentAreas?: string;
  conclusions?: string;
}

export interface Scorecard {
  id: string;
  employeeId: string;
  employeeName: string;
  cycleId: string;
  status: ReviewStatus;

  // Section 1
  info?: EmployeeInfo;
  compliance?: ComplianceCheck[];

  // Section 2
  kpas: KPA[];

  // Section 3 & 4
  competencies?: CompetencyRow[];
  values?: ValueRow[];

  // Section 5
  achievements?: string;
  challenges?: string;
  achievementsManagerNote?: string;
  challengesManagerNote?: string;
  previousGoals?: PreviousGoal[];

  // Section 6
  nextGoals?: NextGoal[];

  // Section 7
  training?: TrainingItem[];
  shortTermCareer?: string;
  longTermCareer?: string;

  // Section 8 — manager only
  managerEvaluation?: ManagerEvaluation;

  // Sign-off
  employeeFeedback?: string;
  employeeSignedAt?: string;
  managerSignedAt?: string;

  // Legacy / summary
  selfReflection?: string;
  managerComments?: string;
  calibrationNotes?: string;
  overallSelfRating?: number;     // KPI total /100 — self
  overallManagerRating?: number;  // KPI total /100 — manager
  finalRating?: number;           // KPI total /100 — agreed
  finalisedAt?: string;
}

export interface Cycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  selfReviewDue: string;
  managerReviewDue: string;
  status: "Draft" | "Active" | "Calibration" | "Closed";
}

export interface FeedbackNote {
  id: string;
  employeeId: string;
  from: string;
  type: "Praise" | "Constructive" | "1-on-1";
  message: string;
  date: string;
}

interface State {
  cycles: Cycle[];
  scorecards: Scorecard[];
  feedback: FeedbackNote[];
}

const KEY = "perf-store-v2";
const listeners = new Set<() => void>();

// ───────────────────────── seeds & defaults ─────────────────────────

export const DEFAULT_COMPETENCIES: Omit<CompetencyRow, "id">[] = [
  { name: "Job Knowledge", description: "Understands role requirements, processes, SOPs, and technical demands of the position." },
  { name: "Quality of Work", description: "Accuracy, thoroughness, and professional standard of all outputs and deliverables." },
  { name: "Productivity & Efficiency", description: "Volume and timeliness of work relative to expectations; makes good use of available time." },
  { name: "Communication Skills", description: "Clarity and professionalism of written and verbal communication; active listening." },
  { name: "Teamwork & Collaboration", description: "Cooperates constructively with colleagues; contributes positively to team objectives." },
  { name: "Problem Solving", description: "Identifies issues proactively; proposes practical solutions; follows through to resolution." },
  { name: "Initiative & Innovation", description: "Acts without waiting to be directed; identifies and proposes improvements." },
  { name: "Time Management", description: "Meets deadlines consistently; prioritises effectively; punctual and reliable." },
  { name: "Leadership", description: "Guides or mentors others; takes ownership of team outcomes where applicable." },
];

export const DEFAULT_VALUES: Omit<ValueRow, "id">[] = [
  { name: "Integrity", description: "Acts honestly and ethically at all times; does what is right even without supervision." },
  { name: "Accountability", description: "Takes full responsibility for own work and outcomes; does not deflect blame." },
  { name: "Customer Focus", description: "Keeps internal and external customer needs central to all decisions and actions." },
  { name: "Adaptability", description: "Responds constructively to change, new tasks, and unexpected challenges." },
  { name: "Professional Conduct", description: "Maintains respectful, compliant, and appropriate behaviour in all circumstances." },
];

export const DEFAULT_COMPLIANCE: Omit<ComplianceCheck, "id">[] = [
  { question: "Contract signed by company?" },
  { question: "Company Handbook received?" },
  { question: "Rights & responsibilities understood?" },
  { question: "Family relationship with any customer or supplier?" },
  { question: "Family relationship with any government or authority?" },
  { question: "Previous performance appraisal completed?" },
];

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

function makeDefaultCompetencies(): CompetencyRow[] {
  return DEFAULT_COMPETENCIES.map((c) => ({ ...c, id: uid("cmp") }));
}
function makeDefaultValues(): ValueRow[] {
  return DEFAULT_VALUES.map((v) => ({ ...v, id: uid("val") }));
}
function makeDefaultCompliance(): ComplianceCheck[] {
  return DEFAULT_COMPLIANCE.map((c) => ({ ...c, id: uid("cmp") }));
}

function seed(): State {
  const cycleId = "CYC-H1-2026";
  const cycle: Cycle = {
    id: cycleId,
    name: "H1 2026",
    startDate: "2026-01-01",
    endDate: "2026-06-30",
    selfReviewDue: "2026-07-05",
    managerReviewDue: "2026-07-15",
    status: "Active",
  };

  // Doreen Muranga-style scorecard mirroring the uploaded Excel
  const doreenKpas: KPA[] = [
    { id: uid("kpa"), title: "Administrative Systems & Office Management", description: "Maintains efficient, organised office systems; manages filing, correspondence, document control, and day-to-day administrative workflows to support operations.", weight: 20, kpis: [], selfScore: 3, managerScore: 4 },
    { id: uid("kpa"), title: "HR Support & Staff Records Management", description: "Ensures accurate and current staff records, attendance registers, leave schedules, and HR documentation; supports onboarding and offboarding processes compliant with Law No. 66/2018.", weight: 20, kpis: [], selfScore: 3, managerScore: 4 },
    { id: uid("kpa"), title: "Financial Administration & Compliance", description: "Assists with bookkeeping, expense tracking, petty cash management; ensures transactions are properly documented, reconciled, and compliant with Rwanda Revenue Authority requirements.", weight: 15, kpis: [], selfScore: 3, managerScore: 4 },
    { id: uid("kpa"), title: "Correspondence & Communication Management", description: "Manages incoming and outgoing correspondence professionally; coordinates meetings, prepares agendas, accurate minutes, and follows up on action items.", weight: 15, kpis: [], selfScore: 3, managerScore: 4 },
    { id: uid("kpa"), title: "Reporting & Documentation Quality", description: "Produces accurate, well-structured reports and internal communications on time; maintains document version control and filing standards.", weight: 15, kpis: [], selfScore: 3, managerScore: 4 },
    { id: uid("kpa"), title: "Teamwork & Cross-Functional Collaboration", description: "Works cooperatively across departments; responds promptly to requests; proactively communicates issues affecting operations.", weight: 10, kpis: [], selfScore: 3, managerScore: 4 },
    { id: uid("kpa"), title: "Innovation & Process Improvement", description: "Identifies and proposes improvements to administrative workflows, templates, and office systems.", weight: 5, kpis: [], selfScore: 3, managerScore: 4 },
  ];

  const scorecards: Scorecard[] = employees.slice(0, 6).map((e, idx) => {
    const kpas: KPA[] = idx === 0
      ? doreenKpas
      : [
          { id: uid("kpa"), title: "Delivery & Execution", description: "Ship high-quality work on agreed timelines and to defined standards.", weight: 40, kpis: [] },
          { id: uid("kpa"), title: "Collaboration & Communication", description: "Works effectively with peers and stakeholders; communicates clearly.", weight: 30, kpis: [] },
          { id: uid("kpa"), title: "Growth & Development", description: "Invests in skills, takes initiative, mentors others where appropriate.", weight: 30, kpis: [] },
        ];

    return {
      id: `SC-${e.id}-${cycleId}`,
      employeeId: e.id,
      employeeName: `${e.firstName} ${e.lastName}`,
      cycleId,
      status: idx === 0 ? "Manager Review" : idx === 1 ? "Self Review" : "Not Started",
      info: {
        jobTitle: e.jobTitle,
        department: e.department,
        manager: e.manager ?? "",
        reviewPeriod: "Jan 2026 – Jun 2026",
        reviewDate: "2026-06-30",
        reviewType: "Mid-Year",
        contractStartDate: e.startDate,
      },
      compliance: makeDefaultCompliance(),
      kpas,
      competencies: makeDefaultCompetencies(),
      values: makeDefaultValues(),
      previousGoals: [],
      nextGoals: [],
      training: [],
    };
  });

  if (scorecards[2]) {
    scorecards[2].status = "Completed";
    scorecards[2].overallSelfRating = 78;
    scorecards[2].overallManagerRating = 82;
    scorecards[2].finalRating = 80;
    scorecards[2].finalisedAt = "2026-06-01";
    scorecards[2].managerComments = "Strong delivery this period. Continue mentoring juniors.";
  }

  const feedback: FeedbackNote[] = [
    { id: "F1", employeeId: employees[1]?.id ?? "EMP-002", from: "Amelia Okonkwo", type: "Praise", message: "Outstanding ownership of the billing migration.", date: "2026-06-08" },
    { id: "F2", employeeId: employees[1]?.id ?? "EMP-002", from: "Peer", type: "1-on-1", message: "Discussed roadmap clarity & deep-work cadence.", date: "2026-06-01" },
  ];

  return { cycles: [cycle], scorecards, feedback };
}

function load(): State {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as State;
  } catch {
    return seed();
  }
}

let state: State = load();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  listeners.forEach((l) => l());
}

// ───────────────────────── computations ─────────────────────────

/** Section 2 total out of 100 using (combined/5) × weight per row.
 *  combined = (self + manager) / 2 when both present, else whichever is available. */
export function computeKpiTotal(sc: Scorecard, mode: "self" | "manager" | "combined" = "combined"): number {
  let total = 0;
  sc.kpas.forEach((k) => {
    const self = k.selfScore;
    const mgr = k.managerScore;
    let score: number | undefined;
    if (mode === "self") score = self;
    else if (mode === "manager") score = mgr;
    else {
      if (typeof self === "number" && typeof mgr === "number") score = (self + mgr) / 2;
      else score = self ?? mgr;
    }
    if (typeof score === "number") total += (score / 5) * (k.weight || 0);
  });
  return +total.toFixed(1);
}

export interface RatingBand { label: string; tone: string; action: string }

export function kpiRatingBand(total: number): RatingBand {
  if (total >= 90) return { label: "Outstanding", tone: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", action: "Bonus/award nomination; fast-track development." };
  if (total >= 80) return { label: "Exceeds Expectations", tone: "bg-green-500/15 text-green-700 border-green-500/30", action: "Bonus eligible; expanded responsibilities." };
  if (total >= 70) return { label: "Good", tone: "bg-blue-500/15 text-blue-700 border-blue-500/30", action: "Positive confirmation; standard increments." };
  if (total >= 60) return { label: "Satisfactory", tone: "bg-amber-500/15 text-amber-700 border-amber-500/30", action: "Coaching plan; standard confirmation." };
  if (total >= 50) return { label: "Needs Improvement", tone: "bg-orange-500/15 text-orange-700 border-orange-500/30", action: "PIP to be issued within 30 days." };
  return { label: "Unsatisfactory", tone: "bg-rose-500/15 text-rose-700 border-rose-500/30", action: "Immediate Performance Management initiated." };
}

export function competencyAverage(sc: Scorecard): number {
  const list = (sc.competencies ?? []).map((c) => {
    const s = c.selfScore, m = c.managerScore;
    if (typeof s === "number" && typeof m === "number") return (s + m) / 2;
    return s ?? m;
  }).filter((x): x is number => typeof x === "number");
  return list.length ? +(list.reduce((a, b) => a + b, 0) / list.length).toFixed(2) : 0;
}

export function valuesAverage(sc: Scorecard): number {
  const list = (sc.values ?? []).map((c) => {
    const s = c.selfScore, m = c.managerScore;
    if (typeof s === "number" && typeof m === "number") return (s + m) / 2;
    return s ?? m;
  }).filter((x): x is number => typeof x === "number");
  return list.length ? +(list.reduce((a, b) => a + b, 0) / list.length).toFixed(2) : 0;
}

// ───────────────────────── store ─────────────────────────

export const perfStore = {
  getState: () => state,
  subscribe(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); },

  upsertCycle(c: Cycle) {
    const i = state.cycles.findIndex((x) => x.id === c.id);
    if (i >= 0) state.cycles[i] = c; else state.cycles.unshift(c);
    save();
  },

  upsertScorecard(sc: Scorecard) {
    const fresh: Scorecard = {
      ...sc,
      compliance: sc.compliance ?? makeDefaultCompliance(),
      competencies: sc.competencies ?? makeDefaultCompetencies(),
      values: sc.values ?? makeDefaultValues(),
      previousGoals: sc.previousGoals ?? [],
      nextGoals: sc.nextGoals ?? [],
      training: sc.training ?? [],
    };
    const i = state.scorecards.findIndex((x) => x.id === fresh.id);
    if (i >= 0) state.scorecards[i] = fresh; else state.scorecards.unshift(fresh);
    save();
  },

  patchScorecard(id: string, patch: Partial<Scorecard>) {
    const sc = state.scorecards.find((x) => x.id === id);
    if (!sc) return;
    Object.assign(sc, patch);
    save();
  },

  setKpas(scorecardId: string, kpas: KPA[]) {
    const sc = state.scorecards.find((x) => x.id === scorecardId);
    if (!sc) return;
    sc.kpas = kpas;
    save();
  },

  setStatus(scorecardId: string, status: ReviewStatus) {
    const sc = state.scorecards.find((x) => x.id === scorecardId);
    if (!sc) return;
    sc.status = status;
    if (status === "Completed") sc.finalisedAt = new Date().toISOString();
    save();
  },

  /** Employee submits their side of sections 2, 3, 4, 5, 7. */
  submitSelfReview(scorecardId: string, payload: {
    kpas: { id: string; selfScore?: number }[];
    competencies?: { id: string; selfScore?: number; employeeComment?: string }[];
    values?: { id: string; selfScore?: number; employeeComment?: string }[];
    achievements?: string;
    challenges?: string;
    previousGoals?: PreviousGoal[];
    training?: TrainingItem[];
    shortTermCareer?: string;
    longTermCareer?: string;
  }) {
    const sc = state.scorecards.find((x) => x.id === scorecardId);
    if (!sc) return;
    payload.kpas.forEach((u) => {
      const k = sc.kpas.find((x) => x.id === u.id);
      if (k) k.selfScore = u.selfScore;
    });
    if (payload.competencies && sc.competencies) {
      payload.competencies.forEach((u) => {
        const c = sc.competencies!.find((x) => x.id === u.id);
        if (c) { c.selfScore = u.selfScore; c.employeeComment = u.employeeComment; }
      });
    }
    if (payload.values && sc.values) {
      payload.values.forEach((u) => {
        const c = sc.values!.find((x) => x.id === u.id);
        if (c) { c.selfScore = u.selfScore; c.employeeComment = u.employeeComment; }
      });
    }
    sc.achievements = payload.achievements ?? sc.achievements;
    sc.challenges = payload.challenges ?? sc.challenges;
    if (payload.previousGoals) sc.previousGoals = payload.previousGoals;
    if (payload.training) sc.training = payload.training;
    sc.shortTermCareer = payload.shortTermCareer ?? sc.shortTermCareer;
    sc.longTermCareer = payload.longTermCareer ?? sc.longTermCareer;

    sc.overallSelfRating = computeKpiTotal(sc, "self");
    sc.status = "Manager Review";
    save();
  },

  /** Manager submits Section 2 manager scores, competency/value observations,
   *  Section 6 next goals + Section 8 evaluation. */
  submitManagerReview(scorecardId: string, payload: {
    kpas: { id: string; managerScore?: number }[];
    competencies?: { id: string; managerScore?: number; managerObservation?: string }[];
    values?: { id: string; managerScore?: number; managerObservation?: string }[];
    nextGoals?: NextGoal[];
    achievementsManagerNote?: string;
    challengesManagerNote?: string;
    managerEvaluation?: ManagerEvaluation;
    final?: number;
  }) {
    const sc = state.scorecards.find((x) => x.id === scorecardId);
    if (!sc) return;
    payload.kpas.forEach((u) => {
      const k = sc.kpas.find((x) => x.id === u.id);
      if (k) k.managerScore = u.managerScore;
    });
    if (payload.competencies && sc.competencies) {
      payload.competencies.forEach((u) => {
        const c = sc.competencies!.find((x) => x.id === u.id);
        if (c) { c.managerScore = u.managerScore; c.managerObservation = u.managerObservation; }
      });
    }
    if (payload.values && sc.values) {
      payload.values.forEach((u) => {
        const c = sc.values!.find((x) => x.id === u.id);
        if (c) { c.managerScore = u.managerScore; c.managerObservation = u.managerObservation; }
      });
    }
    if (payload.nextGoals) sc.nextGoals = payload.nextGoals;
    if (payload.achievementsManagerNote !== undefined) sc.achievementsManagerNote = payload.achievementsManagerNote;
    if (payload.challengesManagerNote !== undefined) sc.challengesManagerNote = payload.challengesManagerNote;
    if (payload.managerEvaluation) sc.managerEvaluation = { ...sc.managerEvaluation, ...payload.managerEvaluation };

    sc.overallManagerRating = computeKpiTotal(sc, "manager");
    sc.finalRating = payload.final ?? computeKpiTotal(sc, "combined");
    sc.status = "Calibration";
    save();
  },

  finalise(scorecardId: string, finalRating: number, notes?: string) {
    const sc = state.scorecards.find((x) => x.id === scorecardId);
    if (!sc) return;
    sc.finalRating = finalRating;
    sc.calibrationNotes = notes;
    sc.status = "Completed";
    sc.finalisedAt = new Date().toISOString();
    save();
  },

  signEmployee(id: string) {
    const sc = state.scorecards.find((x) => x.id === id);
    if (!sc) return;
    sc.employeeSignedAt = new Date().toISOString();
    save();
  },
  signManager(id: string) {
    const sc = state.scorecards.find((x) => x.id === id);
    if (!sc) return;
    sc.managerSignedAt = new Date().toISOString();
    save();
  },

  addFeedback(f: FeedbackNote) { state.feedback.unshift(f); save(); },

  /** Manual reset for development. */
  _reset() { try { localStorage.removeItem(KEY); } catch {} state = seed(); save(); },
};

// React hook
import { useSyncExternalStore } from "react";
export function usePerfStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => perfStore.subscribe(cb),
    () => selector(perfStore.getState()),
    () => selector(perfStore.getState()),
  );
}

export const newId = uid;
