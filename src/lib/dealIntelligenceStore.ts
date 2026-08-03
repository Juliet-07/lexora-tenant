import { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────
// Deal Intelligence store (prototype, localStorage backed).
// Three INDEPENDENT analytical workspaces — Investor Readiness,
// Company Valuation, Portfolio Analysis. No shared state machine;
// each is a workbook that pulls data in, gets adjusted, and emits
// a versioned output.
// ─────────────────────────────────────────────────────────────

const KEY = "grc_deal_intel_v1";
const EVT = "grc_deal_intel_changed";

export const id = (p = "di") =>
  `${p}_${Math.random().toString(36).slice(2, 9)}`;

export const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();

// ───────────────────────────── Investor Readiness ──

export const READINESS_DIMENSIONS = [
  "Corporate Structure & Governance",
  "Financial Statements",
  "Legal & Regulatory Compliance",
  "Tax Compliance",
  "Operational & Commercial",
  "Management Team & HR",
  "ESG & Sustainability",
  "Data Room Completeness",
] as const;
export type ReadinessDimension = (typeof READINESS_DIMENSIONS)[number];

/** Named cross-module source each dimension auto-scores from (read-only). */
export const DIMENSION_SOURCE: Record<ReadinessDimension, string> = {
  "Corporate Structure & Governance": "GRC → Governance (board, committees, resolutions)",
  "Financial Statements": "Accounting engine",
  "Legal & Regulatory Compliance": "GRC → Compliance obligations",
  "Tax Compliance": "GRC → Compliance (RRA filings)",
  "Operational & Commercial": "CRM → Projects & Pipeline",
  "Management Team & HR": "HR module (org, contracts, performance)",
  "ESG & Sustainability": "GRC → ESG register",
  "Data Room Completeness": "Deals → Data room index",
};

export type GapPriority = "P1" | "P2" | "P3";
export type GapStatus = "Open" | "In progress" | "Closed";

export interface ReadinessGap {
  id: string;
  dimension: ReadinessDimension;
  priority: GapPriority;
  description: string;
  impact: string;
  remediation: string;
  owner: string;
  targetDate: string;
  status: GapStatus;
  closedAt?: string;
}

export interface DimensionScore {
  dimension: ReadinessDimension;
  autoScore: number;
  override?: number;
  overrideReason?: string;
}

export type ReportSectionState = "Auto" | "Review" | "Incomplete";

export interface ReadinessAssessment {
  id: string;
  company: string;
  version: number;
  createdAt: string;
  advisor: string;
  threshold: number;
  scores: DimensionScore[];
  gaps: ReadinessGap[];
  reportSections: { name: string; state: ReportSectionState }[];
  notes?: string;
}

export const REPORT_SECTIONS = [
  "Executive summary",
  "Company overview",
  "Governance",
  "Financials",
  "Compliance",
  "Tax",
  "ESG",
  "Key risks",
  "Remediation plan",
];

export function effectiveScore(d: DimensionScore): number {
  return d.override ?? d.autoScore;
}

export function overallScore(a: ReadinessAssessment): number {
  if (!a.scores.length) return 0;
  return Math.round(
    a.scores.reduce((s, d) => s + effectiveScore(d), 0) / a.scores.length,
  );
}

export function readinessBand(score: number) {
  if (score >= 80)
    return { label: "Investment Ready", tone: "text-emerald-600 border-emerald-500/40" };
  if (score >= 60)
    return { label: "Conditionally Ready", tone: "text-amber-600 border-amber-500/40" };
  return { label: "Not Ready", tone: "text-rose-600 border-rose-500/40" };
}

/** Projected readiness date from remediation velocity (gaps closed / week). */
export function projectedReadyDate(a: ReadinessAssessment): string {
  const total = a.gaps.length;
  const closed = a.gaps.filter((g) => g.status === "Closed").length;
  const open = total - closed;
  if (open === 0) return "Ready now";
  const weeks = new Set(a.gaps.filter((g) => g.closedAt).map((g) => g.closedAt!.slice(0, 7))).size || 1;
  const velocity = Math.max(closed / weeks, 0.5); // gaps per month, floor
  const months = Math.ceil(open / velocity);
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

// ───────────────────────────── Company Valuation ──

export interface DCFAssumptions {
  baseRevenue: number;
  growthRate: number; // %
  ebitdaMargin: number; // %
  taxRate: number; // %
  daPct: number; // % of revenue
  capexPct: number; // % of revenue
  wcPct: number; // % of revenue change
  wacc: number; // %
  terminalGrowth: number; // %
  netDebt: number;
  sharesOutstanding: number;
}

export interface CompRow {
  id: string;
  company: string;
  country: string;
  sector: string;
  marketCap: number;
  revenue: number;
  ebitda: number;
}

export interface PrecedentRow {
  id: string;
  target: string;
  acquirer: string;
  year: number;
  value: number;
  revenue: number;
  ebitda: number;
  sector: string;
}

export interface NavInputs {
  bookAssets: number;
  ppeUplift: number;
  intangibleWriteDown: number;
  liabilities: number;
}

export interface DdmInputs {
  dividend: number;
  growth: number; // %
  requiredReturn: number; // %
}

export type MethodKey = "DCF" | "Comparables" | "Precedents" | "NAV" | "DDM";
export const METHOD_KEYS: MethodKey[] = ["DCF", "Comparables", "Precedents", "NAV", "DDM"];

export interface MethodBlend {
  weight: number; // %
  rationale: string;
  confidence: "High" | "Medium" | "Low";
  enabled: boolean;
}

export interface ValuationVersion {
  version: number;
  at: string;
  change: string;
  blendedEv: number;
}

export interface Valuation {
  id: string;
  company: string;
  currency: string;
  advisor: string;
  createdAt: string;
  updatedAt: string;
  dcf: DCFAssumptions;
  comps: CompRow[];
  privateDiscount: number; // %
  precedents: PrecedentRow[];
  nav: NavInputs;
  ddm: DdmInputs;
  blend: Record<MethodKey, MethodBlend>;
  history: ValuationVersion[];
}

// ── Valuation maths (each method recalculates independently) ──

export interface DcfYear {
  year: number;
  revenue: number;
  ebitda: number;
  da: number;
  ebit: number;
  tax: number;
  nopat: number;
  capex: number;
  wc: number;
  fcf: number;
  df: number;
  pv: number;
}

export function runDcf(a: DCFAssumptions) {
  const years: DcfYear[] = [];
  let prevRev = a.baseRevenue;
  for (let i = 1; i <= 5; i++) {
    const revenue = prevRev * (1 + a.growthRate / 100);
    const ebitda = revenue * (a.ebitdaMargin / 100);
    const da = revenue * (a.daPct / 100);
    const ebit = ebitda - da;
    const tax = Math.max(ebit, 0) * (a.taxRate / 100);
    const nopat = ebit - tax;
    const capex = revenue * (a.capexPct / 100);
    const wc = (revenue - prevRev) * (a.wcPct / 100);
    const fcf = nopat + da - capex - wc;
    const df = 1 / Math.pow(1 + a.wacc / 100, i);
    years.push({ year: i, revenue, ebitda, da, ebit, tax, nopat, capex, wc, fcf, df, pv: fcf * df });
    prevRev = revenue;
  }
  const last = years[years.length - 1];
  const g = a.terminalGrowth / 100;
  const w = a.wacc / 100;
  const terminalValue = w > g ? (last.fcf * (1 + g)) / (w - g) : 0;
  const pvTerminal = terminalValue * last.df;
  const pvExplicit = years.reduce((s, y) => s + y.pv, 0);
  const ev = pvExplicit + pvTerminal;
  return { years, terminalValue, pvTerminal, pvExplicit, ev, equity: ev - a.netDebt };
}

export function compsStats(rows: CompRow[]) {
  const evRev = rows.map((r) => (r.revenue ? r.marketCap / r.revenue : 0)).filter(Boolean);
  const evEbitda = rows.map((r) => (r.ebitda ? r.marketCap / r.ebitda : 0)).filter(Boolean);
  const mean = (n: number[]) => (n.length ? n.reduce((a, b) => a + b, 0) / n.length : 0);
  const median = (n: number[]) => {
    if (!n.length) return 0;
    const s = [...n].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  return {
    evRevMean: mean(evRev),
    evRevMedian: median(evRev),
    evEbitdaMean: mean(evEbitda),
    evEbitdaMedian: median(evEbitda),
  };
}

export function runComps(v: Valuation) {
  const st = compsStats(v.comps);
  const targetRev = v.dcf.baseRevenue;
  const targetEbitda = targetRev * (v.dcf.ebitdaMargin / 100);
  const raw = (st.evEbitdaMedian * targetEbitda + st.evRevMedian * targetRev) / 2;
  const ev = raw * (1 - v.privateDiscount / 100);
  return { ...st, ev, targetEbitda };
}

export function runPrecedents(v: Valuation) {
  const mult = v.precedents
    .map((p) => (p.ebitda ? p.value / p.ebitda : 0))
    .filter(Boolean);
  const med = mult.length ? [...mult].sort((a, b) => a - b)[Math.floor(mult.length / 2)] : 0;
  const targetEbitda = v.dcf.baseRevenue * (v.dcf.ebitdaMargin / 100);
  return { medianMultiple: med, ev: med * targetEbitda };
}

export function runNav(v: Valuation) {
  const equity =
    v.nav.bookAssets + v.nav.ppeUplift - v.nav.intangibleWriteDown - v.nav.liabilities;
  return { equity, ev: equity + v.dcf.netDebt };
}

export function runDdm(v: Valuation) {
  const r = v.ddm.requiredReturn / 100;
  const g = v.ddm.growth / 100;
  const equity = r > g ? (v.ddm.dividend * (1 + g)) / (r - g) : 0;
  return { equity, ev: equity + v.dcf.netDebt };
}

export function methodEv(v: Valuation, k: MethodKey): number {
  switch (k) {
    case "DCF": return runDcf(v.dcf).ev;
    case "Comparables": return runComps(v).ev;
    case "Precedents": return runPrecedents(v).ev;
    case "NAV": return runNav(v).ev;
    case "DDM": return runDdm(v).ev;
  }
}

/** ±15% band per method for the football field. */
export function methodRange(v: Valuation, k: MethodKey) {
  const mid = methodEv(v, k);
  return { low: mid * 0.85, mid, high: mid * 1.15 };
}

export function blendedValuation(v: Valuation) {
  const active = METHOD_KEYS.filter((k) => v.blend[k].enabled);
  const totalWeight = active.reduce((s, k) => s + v.blend[k].weight, 0) || 1;
  const ev = active.reduce((s, k) => s + methodEv(v, k) * (v.blend[k].weight / totalWeight), 0);
  const equity = ev - v.dcf.netDebt;
  const lows = active.map((k) => methodRange(v, k).low);
  const highs = active.map((k) => methodRange(v, k).high);
  const sorted = [...lows, ...highs].sort((a, b) => a - b);
  const p25 = sorted.length ? sorted[Math.floor(sorted.length * 0.25)] : 0;
  return {
    totalWeight,
    ev,
    equity,
    low: ev * 0.9,
    high: ev * 1.1,
    negotiationFloor: p25,
    negotiationCeiling: ev * 1.15,
    perShare: v.dcf.sharesOutstanding ? equity / v.dcf.sharesOutstanding : 0,
    impliedEvEbitda: (() => {
      const e = v.dcf.baseRevenue * (v.dcf.ebitdaMargin / 100);
      return e ? ev / e : 0;
    })(),
    impliedEvRev: v.dcf.baseRevenue ? ev / v.dcf.baseRevenue : 0,
  };
}

export function sensitivityMatrix(
  v: Valuation,
  rowKey: keyof DCFAssumptions,
  colKey: keyof DCFAssumptions,
  rowSteps: number[],
  colSteps: number[],
) {
  const base = v.dcf;
  return rowSteps.map((r) =>
    colSteps.map((c) => {
      const a = { ...base, [rowKey]: (base[rowKey] as number) + r, [colKey]: (base[colKey] as number) + c };
      return runDcf(a as DCFAssumptions).ev;
    }),
  );
}

// ───────────────────────────── Portfolio Analysis ──

export interface ScenarioDeal {
  id: string;
  name: string;
  sector: string;
  stage: string;
  value: number;
  feeRate: number; // %
  hypothetical: true;
}

export interface PortfolioSettings {
  concentrationThreshold: number; // %
  feeRecoveryTarget: number; // %
  defaultFeeRate: number; // %
}

export interface PortfolioScenario {
  enabled: boolean;
  added: ScenarioDeal[];
  removedDealIds: string[];
  valueOverrides: Record<string, number>;
}

// ───────────────────────────── State ──

export interface DealIntelState {
  assessments: ReadinessAssessment[];
  valuations: Valuation[];
  portfolio: { settings: PortfolioSettings; scenario: PortfolioScenario };
}

// ───────────────────────────── Seed ──

function seedScores(vals: number[]): DimensionScore[] {
  return READINESS_DIMENSIONS.map((d, i) => ({ dimension: d, autoScore: vals[i] }));
}

function seedAssessments(): ReadinessAssessment[] {
  const mk = (
    company: string,
    version: number,
    createdAt: string,
    vals: number[],
    gaps: ReadinessGap[],
  ): ReadinessAssessment => ({
    id: id("ira"),
    company,
    version,
    createdAt,
    advisor: "Aline Uwase",
    threshold: 70,
    scores: seedScores(vals),
    gaps,
    reportSections: REPORT_SECTIONS.map((name, i) => ({
      name,
      state: i < 5 ? "Auto" : i < 7 ? "Review" : "Incomplete",
    })),
  });

  return [
    mk("Kivu Agro Processing Ltd", 1, "2026-02-10", [62, 55, 68, 74, 71, 60, 44, 58], [
      {
        id: id("gap"), dimension: "Financial Statements", priority: "P1",
        description: "FY2024 accounts unaudited; no IFRS conversion completed.",
        impact: "Deal blocker — investors cannot rely on historicals.",
        remediation: "Appoint external auditor and complete FY2024 audit.",
        owner: "CFO", targetDate: "2026-05-30", status: "Closed", closedAt: "2026-04-28",
      },
      {
        id: id("gap"), dimension: "ESG & Sustainability", priority: "P2",
        description: "No environmental impact policy or emissions baseline.",
        impact: "High — DFI investors mandate ESG screening.",
        remediation: "Adopt ESG policy, run baseline emissions assessment.",
        owner: "Head of Operations", targetDate: "2026-08-15", status: "In progress",
      },
      {
        id: id("gap"), dimension: "Corporate Structure & Governance", priority: "P2",
        description: "Board has no independent non-executive directors.",
        impact: "High — governance discount at pricing.",
        remediation: "Recruit two INEDs and formalise board charter.",
        owner: "Company Secretary", targetDate: "2026-09-30", status: "Open",
      },
      {
        id: id("gap"), dimension: "Management Team & HR", priority: "P3",
        description: "Key-person dependency on founder; no succession plan.",
        impact: "Medium — retention risk raised in DD.",
        remediation: "Document succession plan and key-person insurance.",
        owner: "HR Director", targetDate: "2026-10-31", status: "Open",
      },
      {
        id: id("gap"), dimension: "Data Room Completeness", priority: "P2",
        description: "Data room 58% populated; contracts folder empty.",
        impact: "High — slows diligence, signals disorganisation.",
        remediation: "Upload material contracts and IP register.",
        owner: "Legal Counsel", targetDate: "2026-07-15", status: "In progress",
      },
    ]),
    mk("Kivu Agro Processing Ltd", 2, "2026-06-18", [68, 78, 72, 79, 74, 63, 52, 66], [
      {
        id: id("gap"), dimension: "ESG & Sustainability", priority: "P2",
        description: "Emissions baseline drafted, policy not board-approved.",
        impact: "High — DFI investors mandate ESG screening.",
        remediation: "Table ESG policy at Q3 board meeting.",
        owner: "Head of Operations", targetDate: "2026-08-15", status: "In progress",
      },
      {
        id: id("gap"), dimension: "Corporate Structure & Governance", priority: "P2",
        description: "One INED appointed; board charter still in draft.",
        impact: "High — governance discount at pricing.",
        remediation: "Appoint second INED, approve charter.",
        owner: "Company Secretary", targetDate: "2026-09-30", status: "In progress",
      },
      {
        id: id("gap"), dimension: "Management Team & HR", priority: "P3",
        description: "Succession plan drafted, not signed off.",
        impact: "Medium — retention risk raised in DD.",
        remediation: "Board sign-off on succession plan.",
        owner: "HR Director", targetDate: "2026-10-31", status: "Open",
      },
      {
        id: id("gap"), dimension: "Data Room Completeness", priority: "P3",
        description: "Data room 79% populated; IP register outstanding.",
        impact: "Medium — minor diligence friction.",
        remediation: "Upload IP register and trademark filings.",
        owner: "Legal Counsel", targetDate: "2026-07-15", status: "Closed", closedAt: "2026-07-02",
      },
    ]),
    mk("Rwanda FinServe Group", 1, "2026-05-04", [84, 81, 77, 86, 80, 75, 66, 88], [
      {
        id: id("gap"), dimension: "ESG & Sustainability", priority: "P3",
        description: "Sustainability reporting not aligned to GRI standard.",
        impact: "Medium — reporting gap for institutional LPs.",
        remediation: "Map disclosures to GRI core option.",
        owner: "Compliance Manager", targetDate: "2026-11-30", status: "Open",
      },
    ]),
  ];
}

function seedValuation(): Valuation {
  return {
    id: id("val"),
    company: "Kivu Agro Processing Ltd",
    currency: "USD",
    advisor: "Aline Uwase",
    createdAt: "2026-06-01",
    updatedAt: now(),
    dcf: {
      baseRevenue: 24_000_000,
      growthRate: 12,
      ebitdaMargin: 21,
      taxRate: 30,
      daPct: 4,
      capexPct: 6,
      wcPct: 10,
      wacc: 16.5,
      terminalGrowth: 4,
      netDebt: 5_400_000,
      sharesOutstanding: 12_000_000,
    },
    comps: [
      { id: id("cmp"), company: "Nairobi Foods Plc", country: "Kenya", sector: "Agri-processing", marketCap: 310_000_000, revenue: 168_000_000, ebitda: 29_000_000 },
      { id: id("cmp"), company: "Kampala Grain Ltd", country: "Uganda", sector: "Agri-processing", marketCap: 96_000_000, revenue: 62_000_000, ebitda: 11_500_000 },
      { id: id("cmp"), company: "Tanzania Agro Holdings", country: "Tanzania", sector: "Agri-processing", marketCap: 145_000_000, revenue: 88_000_000, ebitda: 16_800_000 },
      { id: id("cmp"), company: "Zambeef Products", country: "Zambia", sector: "Food & Agri", marketCap: 128_000_000, revenue: 210_000_000, ebitda: 18_400_000 },
    ],
    privateDiscount: 25,
    precedents: [
      { id: id("prc"), target: "Musanze Mills", acquirer: "AFC Partners", year: 2025, value: 41_000_000, revenue: 26_000_000, ebitda: 5_200_000, sector: "Agri-processing" },
      { id: id("prc"), target: "Lake Foods EA", acquirer: "Norfund", year: 2024, value: 88_000_000, revenue: 54_000_000, ebitda: 11_000_000, sector: "Agri-processing" },
      { id: id("prc"), target: "Gisenyi Dairy", acquirer: "Kasada Capital", year: 2024, value: 22_500_000, revenue: 17_000_000, ebitda: 2_900_000, sector: "Food & Agri" },
    ],
    nav: {
      bookAssets: 38_000_000,
      ppeUplift: 6_500_000,
      intangibleWriteDown: 1_200_000,
      liabilities: 17_800_000,
    },
    ddm: { dividend: 1_400_000, growth: 5, requiredReturn: 15 },
    blend: {
      DCF: { weight: 40, rationale: "Primary method — business plan is credible and cash-generative.", confidence: "Medium", enabled: true },
      Comparables: { weight: 20, rationale: "Regional listed peers, adjusted for illiquidity.", confidence: "Medium", enabled: true },
      Precedents: { weight: 25, rationale: "Three directly comparable East African agri deals.", confidence: "High", enabled: true },
      NAV: { weight: 15, rationale: "Asset-heavy operations — sets the floor.", confidence: "High", enabled: true },
      DDM: { weight: 0, rationale: "Dividend history too short to be meaningful.", confidence: "Low", enabled: false },
    },
    history: [
      { version: 1, at: "2026-06-01", change: "Initial model built from FY2025 management accounts.", blendedEv: 47_800_000 },
      { version: 2, at: "2026-06-14", change: "WACC raised 15.0% → 16.5% after country risk review.", blendedEv: 44_100_000 },
      { version: 3, at: "2026-07-02", change: "Added Gisenyi Dairy precedent; private discount set to 25%.", blendedEv: 45_600_000 },
    ],
  };
}

/** Empty starting model for a new subject (own company or a client). */
export function blankValuation(
  company: string,
  currency = "USD",
  advisor = "",
): Valuation {
  return {
    id: id("val"),
    company,
    currency,
    advisor,
    createdAt: today(),
    updatedAt: now(),
    dcf: {
      baseRevenue: 1_000_000,
      growthRate: 10,
      ebitdaMargin: 20,
      taxRate: 30,
      daPct: 4,
      capexPct: 6,
      wcPct: 10,
      wacc: 16,
      terminalGrowth: 3,
      netDebt: 0,
      sharesOutstanding: 1_000_000,
    },
    comps: [],
    privateDiscount: 25,
    precedents: [],
    nav: { bookAssets: 0, ppeUplift: 0, intangibleWriteDown: 0, liabilities: 0 },
    ddm: { dividend: 0, growth: 3, requiredReturn: 15 },
    blend: {
      DCF: { weight: 50, rationale: "Primary method.", confidence: "Medium", enabled: true },
      Comparables: { weight: 20, rationale: "Add peers to activate.", confidence: "Low", enabled: false },
      Precedents: { weight: 20, rationale: "Add precedents to activate.", confidence: "Low", enabled: false },
      NAV: { weight: 10, rationale: "Asset floor.", confidence: "Medium", enabled: true },
      DDM: { weight: 0, rationale: "Not applicable.", confidence: "Low", enabled: false },
    },
    history: [
      { version: 1, at: today(), change: `Model initiated for ${company}.`, blendedEv: 0 },
    ],
  };
}

function seed(): DealIntelState {
  return {
    assessments: seedAssessments(),
    valuations: [seedValuation()],
    portfolio: {
      settings: { concentrationThreshold: 25, feeRecoveryTarget: 75, defaultFeeRate: 2.5 },
      scenario: { enabled: false, added: [], removedDealIds: [], valueOverrides: {} },
    },
  };
}

// ───────────────────────────── Persistence ──

function read(): DealIntelState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as DealIntelState;
  } catch {
    return seed();
  }
}

export function mutateDealIntel(fn: (s: DealIntelState) => DealIntelState): void {
  const next = fn(read());
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVT));
}

export function resetDealIntel() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVT));
}

export function useDealIntel(): DealIntelState {
  const [state, setState] = useState<DealIntelState>(() => read());
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

// ───────────────────────────── Formatting ──

export function money(n: number, currency = "USD") {
  const abs = Math.abs(n);
  const fmt = (v: number, s: string) =>
    `${n < 0 ? "-" : ""}${currency === "USD" ? "$" : currency + " "}${v.toFixed(1)}${s}`;
  if (abs >= 1_000_000_000) return fmt(abs / 1_000_000_000, "b");
  if (abs >= 1_000_000) return fmt(abs / 1_000_000, "m");
  if (abs >= 1_000) return fmt(abs / 1_000, "k");
  return `${currency === "USD" ? "$" : currency + " "}${Math.round(abs)}`;
}

export function pct(n: number, dp = 1) {
  return `${n.toFixed(dp)}%`;
}
