// Shared client-side performance store.
// Persists KPAs/KPIs, review cycles, self-assessments and feedback to localStorage
// so the tenant (admin) view and the employee (My Performance) view stay in sync.

import { employees } from "@/data/hrMockData";

export type ReviewStatus =
  | "Not Started"
  | "Self Review"
  | "Manager Review"
  | "Calibration"
  | "Completed";

export interface KPI {
  id: string;
  name: string;
  target: string;       // e.g. "<48h", "95%", "12 deals"
  metric: string;       // unit / description
  weight: number;       // 0–100, within the parent KPA
  actual?: string;      // captured during review
  selfScore?: number;   // 1–5 (employee)
  managerScore?: number; // 1–5 (manager)
}

export interface KPA {
  id: string;
  title: string;        // Key Performance Area
  description: string;
  weight: number;       // 0–100 across all KPAs for this scorecard
  kpis: KPI[];
}

export interface Scorecard {
  id: string;
  employeeId: string;
  employeeName: string;
  cycleId: string;
  status: ReviewStatus;
  kpas: KPA[];
  selfReflection?: string;
  managerComments?: string;
  calibrationNotes?: string;
  overallSelfRating?: number;
  overallManagerRating?: number;
  finalRating?: number;
  finalisedAt?: string;
}

export interface Cycle {
  id: string;
  name: string;          // e.g. "H1 2026"
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

const KEY = "perf-store-v1";
const listeners = new Set<() => void>();

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

  const sample = (employeeId: string, name: string, kpas: KPA[]): Scorecard => ({
    id: `SC-${employeeId}-${cycleId}`,
    employeeId,
    employeeName: name,
    cycleId,
    status: "Not Started",
    kpas,
  });

  const scorecards: Scorecard[] = employees.slice(0, 6).map((e) => {
    const kpas: KPA[] = [
      {
        id: `kpa-${e.id}-1`,
        title: "Delivery & Execution",
        description: "Ship high-quality work on agreed timelines.",
        weight: 40,
        kpis: [
          { id: `${e.id}-k1`, name: "Sprint commitments met", target: "≥ 90%", metric: "%", weight: 60 },
          { id: `${e.id}-k2`, name: "Defects post-release", target: "≤ 2 per release", metric: "count", weight: 40 },
        ],
      },
      {
        id: `kpa-${e.id}-2`,
        title: "Collaboration",
        description: "Work effectively with peers and stakeholders.",
        weight: 30,
        kpis: [
          { id: `${e.id}-k3`, name: "Peer feedback score", target: "≥ 4 / 5", metric: "rating", weight: 100 },
        ],
      },
      {
        id: `kpa-${e.id}-3`,
        title: "Growth & Development",
        description: "Invest in skills and mentor others.",
        weight: 30,
        kpis: [
          { id: `${e.id}-k4`, name: "Learning hours", target: "≥ 20h", metric: "hours", weight: 50 },
          { id: `${e.id}-k5`, name: "Mentorship sessions", target: "≥ 6", metric: "sessions", weight: 50 },
        ],
      },
    ];
    return sample(e.id, `${e.firstName} ${e.lastName}`, kpas);
  });

  // Mark a couple to demo flow states
  if (scorecards[1]) scorecards[1].status = "Self Review";
  if (scorecards[2]) {
    scorecards[2].status = "Completed";
    scorecards[2].finalRating = 4.3;
    scorecards[2].overallSelfRating = 4.1;
    scorecards[2].overallManagerRating = 4.3;
    scorecards[2].finalisedAt = "2026-06-01";
  }

  const feedback: FeedbackNote[] = [
    { id: "F1", employeeId: "EMP-002", from: "Amelia Okonkwo", type: "Praise", message: "Outstanding ownership of the billing migration.", date: "2026-06-08" },
    { id: "F2", employeeId: "EMP-002", from: "Marco's peer", type: "1-on-1", message: "Discussed roadmap clarity & deep-work cadence.", date: "2026-06-01" },
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

export const perfStore = {
  getState: () => state,
  subscribe(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); },

  // ── cycles ──
  upsertCycle(c: Cycle) {
    const i = state.cycles.findIndex((x) => x.id === c.id);
    if (i >= 0) state.cycles[i] = c; else state.cycles.unshift(c);
    save();
  },

  // ── scorecards ──
  upsertScorecard(sc: Scorecard) {
    const i = state.scorecards.findIndex((x) => x.id === sc.id);
    if (i >= 0) state.scorecards[i] = sc; else state.scorecards.unshift(sc);
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
  submitSelfReview(scorecardId: string, payload: { reflection: string; kpis: { id: string; actual?: string; selfScore?: number }[] }) {
    const sc = state.scorecards.find((x) => x.id === scorecardId);
    if (!sc) return;
    sc.selfReflection = payload.reflection;
    payload.kpis.forEach((u) => {
      sc.kpas.forEach((kpa) => kpa.kpis.forEach((k) => {
        if (k.id === u.id) { k.actual = u.actual; k.selfScore = u.selfScore; }
      }));
    });
    sc.overallSelfRating = computeOverall(sc, "selfScore");
    sc.status = "Manager Review";
    save();
  },
  submitManagerReview(scorecardId: string, payload: { comments: string; kpis: { id: string; managerScore?: number }[]; final?: number }) {
    const sc = state.scorecards.find((x) => x.id === scorecardId);
    if (!sc) return;
    sc.managerComments = payload.comments;
    payload.kpis.forEach((u) => {
      sc.kpas.forEach((kpa) => kpa.kpis.forEach((k) => {
        if (k.id === u.id) k.managerScore = u.managerScore;
      }));
    });
    sc.overallManagerRating = computeOverall(sc, "managerScore");
    sc.finalRating = payload.final ?? sc.overallManagerRating;
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

  // ── feedback ──
  addFeedback(f: FeedbackNote) { state.feedback.unshift(f); save(); },
};

function computeOverall(sc: Scorecard, field: "selfScore" | "managerScore"): number {
  let total = 0, weightSum = 0;
  sc.kpas.forEach((kpa) => {
    let kpaScore = 0, kpiWeightSum = 0;
    kpa.kpis.forEach((k) => {
      const s = k[field];
      if (typeof s === "number") {
        kpaScore += s * k.weight;
        kpiWeightSum += k.weight;
      }
    });
    if (kpiWeightSum > 0) {
      total += (kpaScore / kpiWeightSum) * kpa.weight;
      weightSum += kpa.weight;
    }
  });
  return weightSum > 0 ? +(total / weightSum).toFixed(2) : 0;
}

// React hook
import { useSyncExternalStore } from "react";
export function usePerfStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => perfStore.subscribe(cb),
    () => selector(perfStore.getState()),
    () => selector(perfStore.getState()),
  );
}
