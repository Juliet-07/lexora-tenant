import { api } from "../api";

// ─────────────────────────────────────────────────────────────
// GRC Health Score — client for GET /grc/health-score (and the
// settings / commentary updates). The score is computed by the engine
// from the tenant's own records; nothing here is calculated from
// typed-in numbers. The helpers at the bottom only format and colour
// what the engine returns.
// ─────────────────────────────────────────────────────────────

export type HsUnit = "%" | "x" | "mo";
export type HsModuleKey = "grc" | "finance" | "hr" | "crm" | "aml";

export interface HsIndicator {
  key: string;
  module: HsModuleKey;
  label: string;
  desc: string;
  /** Plain-language rule the system uses to measure it. */
  how: string;
  weight: number;
  floor: number;
  target: number;
  unit: HsUnit;
  defaultWeight: number;
  defaultFloor: number;
  defaultTarget: number;
  isMeasured: boolean;
  value: number | null;
  /** 0–100 position between floor and target. */
  normalised: number | null;
  /** What was counted, e.g. "7 of 9 meetings". */
  basis: string;
  sample: number;
  /** Share of the module score this indicator carries (unmeasured ones are left out). */
  effectiveWeight: number;
  customised: boolean;
}

export interface HsModule {
  key: HsModuleKey;
  name: string;
  fullName: string;
  weight: number;
  defaultWeight: number;
  effectiveWeight: number;
  score: number | null;
  rawScore: number | null;
  /** Multiplier applied for indicators scoring under 50 (1 = none). */
  penalty: number;
  critCount: number;
  measuredCount: number;
  totalCount: number;
  grade: string | null;
  gradeLabel: string | null;
  indicators: HsIndicator[];
}

export interface HsGrade {
  min: number;
  grade: string;
  label: string;
}

export interface HsTrendPoint {
  period: string;
  label: string;
  composite: number | null;
  modules: Record<string, number | null>;
}

export interface HsCommentary {
  ceoNote: string;
  moduleComments: Record<string, string>;
  updatedAt: string | null;
  updatedBy: string;
}

export interface HealthScore {
  assessedAt: string;
  period: string;
  periodLabel: string;
  composite: number | null;
  grade: string | null;
  gradeLabel: string | null;
  coverage: { measured: number; total: number; pct: number };
  modules: HsModule[];
  grades: HsGrade[];
  previous: { period: string; label: string; composite: number | null } | null;
  change: number | null;
  trend: HsTrendPoint[];
  commentary: HsCommentary;
  customised: boolean;
}

export interface HsSettingsInput {
  moduleWeights?: Partial<Record<HsModuleKey, number>>;
  indicators?: Record<
    string,
    { weight: number; floor: number; target: number }
  >;
  reset?: boolean;
}

const unwrap = <T>(res: { data: any }): T => res.data?.data ?? res.data;

export const fetchHealthScore = async (): Promise<HealthScore> =>
  unwrap(await api.get("/grc/health-score"));

export const updateHealthScoreSettings = async (
  dto: HsSettingsInput,
): Promise<unknown> => unwrap(await api.put("/grc/health-score/settings", dto));

export const updateHealthScoreCommentary = async (dto: {
  ceoNote?: string;
  moduleComments?: Record<string, string>;
}): Promise<HsCommentary> =>
  unwrap(await api.put("/grc/health-score/commentary", dto));

// ── Presentation helpers ─────────────────────────────────────

/** 80+ green, 60–79 amber, below 60 red. */
export type HsTone = "good" | "fair" | "poor" | "none";

export const scoreTone = (n: number | null | undefined): HsTone =>
  n === null || n === undefined
    ? "none"
    : n >= 80
      ? "good"
      : n >= 60
        ? "fair"
        : "poor";

export const TONE_TEXT: Record<HsTone, string> = {
  good: "text-emerald-600",
  fair: "text-amber-600",
  poor: "text-rose-600",
  none: "text-muted-foreground",
};
export const TONE_BG: Record<HsTone, string> = {
  good: "bg-emerald-500",
  fair: "bg-amber-500",
  poor: "bg-rose-500",
  none: "bg-muted-foreground/30",
};
export const TONE_SOFT: Record<HsTone, string> = {
  good: "bg-emerald-50 text-emerald-700 border-emerald-200",
  fair: "bg-amber-50 text-amber-700 border-amber-200",
  poor: "bg-rose-50 text-rose-700 border-rose-200",
  none: "bg-muted text-muted-foreground border-border",
};
export const TONE_HEX: Record<HsTone, string> = {
  good: "#10b981",
  fair: "#f59e0b",
  poor: "#f43f5e",
  none: "#94a3b8",
};

/** "85%", "1.65x", "7.5 mo" */
export const fmtValue = (
  v: number | null | undefined,
  unit: HsUnit,
): string => {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const n = Math.round(v * 100) / 100;
  if (unit === "%") return `${Math.round(v * 10) / 10}%`;
  if (unit === "x") return `${n}x`;
  return `${Math.round(v * 10) / 10} mo`;
};

export const fmtScore = (n: number | null | undefined): string =>
  n === null || n === undefined ? "—" : String(Math.round(n * 10) / 10);

/** What an indicator needs to reach the target, in words. */
export const rangeText = (i: Pick<HsIndicator, "floor" | "target" | "unit">) =>
  `${fmtValue(i.floor, i.unit)} scores 0 · ${fmtValue(i.target, i.unit)} scores 100`;

/** The one-sentence reading of a score for a non-specialist. */
export const readScore = (n: number | null): string => {
  if (n === null) return "There is not enough recorded yet to give a score.";
  if (n >= 90)
    return "Excellent — controls are operating well across the company.";
  if (n >= 80) return "Strong — a few areas to tighten, nothing urgent.";
  if (n >= 70) return "Good — sound overall, with some clear gaps to close.";
  if (n >= 60) return "Adequate — several areas need attention soon.";
  if (n >= 50) return "Weak — significant gaps; act on the priorities below.";
  return "Critical — urgent action needed in the areas below.";
};
