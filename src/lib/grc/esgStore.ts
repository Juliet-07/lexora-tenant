import { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────
// ESG sub-module store (prototype, localStorage).
// Covers the three ESG workflows from the module spec:
//   2.1 ESG Data & Scoring      → metrics, intensities, targets, pillar scores
//   2.2 Double Materiality      → stakeholders, topics, matrix, reassessment
//   2.3 ESG Reporting           → framework indicators, evidence, sign-off
// ─────────────────────────────────────────────────────────────

const KEY = "grc_esg_v1";
const EVT = "grc_esg_changed";

export const uid = (p: string) =>
  `${p}_${Math.random().toString(36).slice(2, 9)}`;
const nowIso = () => new Date().toISOString();
const ago = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

// ── Metrics ──────────────────────────────────────────────────

export type Pillar = "Environmental" | "Social" | "Governance";

export const ENV_CATEGORIES = [
  "Carbon",
  "Energy",
  "Water",
  "Waste",
  "Biodiversity",
] as const;
export type EnvCategory = (typeof ENV_CATEGORIES)[number];

export const SOCIAL_CATEGORIES = [
  "Workforce",
  "Diversity",
  "Health & Safety",
  "Community",
  "Engagement",
  "Equal Pay",
] as const;
export type SocialCategory = (typeof SOCIAL_CATEGORIES)[number];

export type MetricCategory = EnvCategory | SocialCategory;

/** Whether an improving trend means the number goes down or up. */
export type Direction = "lower" | "higher";

export type IntensityBasis =
  | "none"
  | "per employee"
  | "per m²"
  | "per revenue unit";

export interface EsgMetric {
  id: string;
  pillar: Exclude<Pillar, "Governance">;
  category: MetricCategory;
  name: string;
  unit: string;
  period: string; // e.g. "2026"
  value: number;
  baseline: number; // prior period / baseline year value
  target: number;
  targetYear: string;
  direction: Direction;
  intensityBasis: IntensityBasis;
  methodology: string;
  source: string;
  updatedAt: string;
}

export interface ReductionInitiative {
  id: string;
  title: string;
  category: MetricCategory;
  owner: string;
  cost: number;
  expectedImpact: string;
  status: "Planned" | "In progress" | "Delivered" | "Paused";
  startDate: string;
}

// ── Materiality ──────────────────────────────────────────────

export const STAKEHOLDER_GROUPS = [
  "Employees",
  "Investors",
  "Regulators",
  "Communities",
  "Customers",
  "Suppliers",
] as const;
export type StakeholderGroup = (typeof STAKEHOLDER_GROUPS)[number];

export interface Stakeholder {
  id: string;
  group: StakeholderGroup;
  priority: "High" | "Medium" | "Low";
  engagementMethod: string;
  lastEngaged: string | null;
  input: string;
}

export type TopicStatus = "Material" | "Monitor" | "Not material";

export interface MaterialTopic {
  id: string;
  topic: string;
  pillar: Pillar;
  financial: number; // 1..5 impact on enterprise value
  impact: number; // 1..5 impact on society / environment
  priorFinancial: number | null;
  priorImpact: number | null;
  rationale: string;
  escalatedToRisk: boolean;
  updatedAt: string;
}

export interface MaterialityCycle {
  year: string;
  status: "In progress" | "Approved";
  threshold: number; // topics with max(fin,imp) >= threshold are Material
  approvedBy: string | null;
  approvedAt: string | null;
  nextReviewDate: string;
}

// ── Reporting ────────────────────────────────────────────────

export const FRAMEWORKS = [
  "GRI",
  "ISSB S1",
  "ISSB S2",
  "TCFD",
  "King V",
  "UN SDG",
] as const;
export type Framework = (typeof FRAMEWORKS)[number];

export type IndicatorStatus =
  | "Not started"
  | "In progress"
  | "Awaiting sign-off"
  | "Signed off";

export interface IndicatorEvidence {
  id: string;
  name: string;
  uploadedAt: string;
}

export interface ReportIndicator {
  id: string;
  framework: Framework;
  code: string;
  title: string;
  owner: string;
  response: string;
  evidence: IndicatorEvidence[];
  status: IndicatorStatus;
  signedOffBy: string | null;
  signedOffAt: string | null;
}

export interface EsgReport {
  id: string;
  title: string;
  framework: Framework;
  period: string;
  status: "Draft" | "Compiled" | "Published";
  compiledAt: string | null;
  publishedAt: string | null;
  note: string;
}

export interface OrgContext {
  employees: number;
  floorAreaSqm: number;
  revenueMillions: number;
  sector: string;
  peerAverage: { environmental: number; social: number; governance: number };
}

export interface EsgState {
  context: OrgContext;
  metrics: EsgMetric[];
  initiatives: ReductionInitiative[];
  stakeholders: Stakeholder[];
  topics: MaterialTopic[];
  cycle: MaterialityCycle;
  indicators: ReportIndicator[];
  reports: EsgReport[];
  history: { period: string; e: number; s: number; g: number }[];
}

// ── Seed ─────────────────────────────────────────────────────

const metric = (
  m: Omit<EsgMetric, "id" | "updatedAt">,
): EsgMetric => ({ ...m, id: uid("mx"), updatedAt: ago(9) });

function seed(): EsgState {
  return {
    context: {
      employees: 148,
      floorAreaSqm: 3200,
      revenueMillions: 12.4,
      sector: "Professional Services — East Africa",
      peerAverage: { environmental: 61, social: 68, governance: 72 },
    },
    metrics: [
      metric({ pillar: "Environmental", category: "Carbon", name: "Scope 1 — direct emissions", unit: "tCO2e", period: "2026", value: 182, baseline: 214, target: 150, targetYear: "2027", direction: "lower", intensityBasis: "per employee", methodology: "GHG Protocol, fuel-based method for fleet and generators", source: "Fleet log + fuel invoices" }),
      metric({ pillar: "Environmental", category: "Carbon", name: "Scope 2 — purchased energy", unit: "tCO2e", period: "2026", value: 96, baseline: 118, target: 70, targetYear: "2027", direction: "lower", intensityBasis: "per m²", methodology: "GHG Protocol, location-based grid factor", source: "Utility bills" }),
      metric({ pillar: "Environmental", category: "Carbon", name: "Scope 3 — value chain", unit: "tCO2e", period: "2026", value: 431, baseline: 402, target: 360, targetYear: "2028", direction: "lower", intensityBasis: "per revenue unit", methodology: "Spend-based estimation across categories 1, 5, 6", source: "Procurement + travel data" }),
      metric({ pillar: "Environmental", category: "Energy", name: "Grid electricity consumed", unit: "MWh", period: "2026", value: 214, baseline: 246, target: 180, targetYear: "2027", direction: "lower", intensityBasis: "per m²", methodology: "Metered readings", source: "REG utility statements" }),
      metric({ pillar: "Environmental", category: "Energy", name: "Diesel generator output", unit: "MWh", period: "2026", value: 38, baseline: 52, target: 20, targetYear: "2027", direction: "lower", intensityBasis: "none", methodology: "Runtime hours × rated output", source: "Facilities log" }),
      metric({ pillar: "Environmental", category: "Energy", name: "Renewable energy share", unit: "%", period: "2026", value: 22, baseline: 12, target: 40, targetYear: "2028", direction: "higher", intensityBasis: "none", methodology: "Solar generation ÷ total consumption", source: "Inverter dashboard" }),
      metric({ pillar: "Environmental", category: "Water", name: "Municipal water withdrawn", unit: "m³", period: "2026", value: 3120, baseline: 3480, target: 2800, targetYear: "2027", direction: "lower", intensityBasis: "per employee", methodology: "Metered", source: "WASAC bills" }),
      metric({ pillar: "Environmental", category: "Water", name: "Water recycled / reused", unit: "%", period: "2026", value: 14, baseline: 8, target: 30, targetYear: "2028", direction: "higher", intensityBasis: "none", methodology: "Recycled volume ÷ withdrawal", source: "Facilities" }),
      metric({ pillar: "Environmental", category: "Waste", name: "Total waste generated", unit: "tonnes", period: "2026", value: 41, baseline: 47, target: 35, targetYear: "2027", direction: "lower", intensityBasis: "per employee", methodology: "Weighbridge tickets", source: "Waste contractor" }),
      metric({ pillar: "Environmental", category: "Waste", name: "Diversion rate (recycled)", unit: "%", period: "2026", value: 52, baseline: 41, target: 70, targetYear: "2028", direction: "higher", intensityBasis: "none", methodology: "Recycled ÷ generated", source: "Waste contractor" }),
      metric({ pillar: "Environmental", category: "Waste", name: "Hazardous waste (e-waste)", unit: "tonnes", period: "2026", value: 2.1, baseline: 2.6, target: 1.5, targetYear: "2027", direction: "lower", intensityBasis: "none", methodology: "Certified disposal manifests", source: "E-waste partner" }),
      metric({ pillar: "Environmental", category: "Biodiversity", name: "Sites with biodiversity screening", unit: "%", period: "2026", value: 60, baseline: 40, target: 100, targetYear: "2027", direction: "higher", intensityBasis: "none", methodology: "Screened locations ÷ operating locations", source: "Sustainability lead" }),

      metric({ pillar: "Social", category: "Workforce", name: "Headcount", unit: "people", period: "2026", value: 148, baseline: 131, target: 160, targetYear: "2027", direction: "higher", intensityBasis: "none", methodology: "HR module headcount", source: "HR Module" }),
      metric({ pillar: "Social", category: "Workforce", name: "Voluntary turnover", unit: "%", period: "2026", value: 11.4, baseline: 15.2, target: 9, targetYear: "2027", direction: "lower", intensityBasis: "none", methodology: "Resignations ÷ average headcount", source: "HR Module" }),
      metric({ pillar: "Social", category: "Diversity", name: "Women in workforce", unit: "%", period: "2026", value: 46, baseline: 42, target: 50, targetYear: "2027", direction: "higher", intensityBasis: "none", methodology: "Headcount split", source: "HR Module" }),
      metric({ pillar: "Social", category: "Diversity", name: "Women in senior management", unit: "%", period: "2026", value: 31, baseline: 25, target: 40, targetYear: "2028", direction: "higher", intensityBasis: "none", methodology: "Senior grades split", source: "HR Module" }),
      metric({ pillar: "Social", category: "Health & Safety", name: "Lost-time injury frequency rate", unit: "per 1m hrs", period: "2026", value: 0.8, baseline: 1.4, target: 0, targetYear: "2027", direction: "lower", intensityBasis: "none", methodology: "LTIs × 1,000,000 ÷ hours worked", source: "Incident register" }),
      metric({ pillar: "Social", category: "Health & Safety", name: "Safety training coverage", unit: "%", period: "2026", value: 88, baseline: 74, target: 100, targetYear: "2027", direction: "higher", intensityBasis: "none", methodology: "Employees trained ÷ headcount", source: "Learning module" }),
      metric({ pillar: "Social", category: "Engagement", name: "Employee engagement score", unit: "/100", period: "2026", value: 74, baseline: 69, target: 80, targetYear: "2027", direction: "higher", intensityBasis: "none", methodology: "Annual pulse survey", source: "HR Module" }),
      metric({ pillar: "Social", category: "Engagement", name: "Training hours per employee", unit: "hours", period: "2026", value: 22, baseline: 16, target: 30, targetYear: "2027", direction: "higher", intensityBasis: "per employee", methodology: "Learning module completions", source: "Learning module" }),
      metric({ pillar: "Social", category: "Engagement", name: "Internal promotion rate", unit: "%", period: "2026", value: 27, baseline: 21, target: 35, targetYear: "2028", direction: "higher", intensityBasis: "none", methodology: "Internal fills ÷ total fills", source: "Recruitment" }),
      metric({ pillar: "Social", category: "Equal Pay", name: "Gender pay gap (mean)", unit: "%", period: "2026", value: 7.9, baseline: 11.3, target: 0, targetYear: "2028", direction: "lower", intensityBasis: "none", methodology: "Mean male pay vs mean female pay", source: "Payroll" }),
      metric({ pillar: "Social", category: "Community", name: "Community investment", unit: "USD '000", period: "2026", value: 46, baseline: 32, target: 60, targetYear: "2027", direction: "higher", intensityBasis: "per revenue unit", methodology: "Cash + in-kind contributions", source: "Finance" }),
    ],
    initiatives: [
      { id: uid("ini"), title: "Rooftop solar phase 2 (60 kWp)", category: "Energy", owner: "Facilities Manager", cost: 74000, expectedImpact: "≈ 42 MWh/yr grid displacement, −18 tCO2e", status: "In progress", startDate: ago(120).slice(0, 10) },
      { id: uid("ini"), title: "Fleet transition to hybrid", category: "Carbon", owner: "Operations Lead", cost: 120000, expectedImpact: "−26 tCO2e Scope 1 by 2027", status: "Planned", startDate: ago(20).slice(0, 10) },
      { id: uid("ini"), title: "Paperless client onboarding", category: "Waste", owner: "Head of Client Services", cost: 8000, expectedImpact: "−3.4 t paper waste, diversion +6pp", status: "Delivered", startDate: ago(300).slice(0, 10) },
      { id: uid("ini"), title: "Rainwater harvesting tanks", category: "Water", owner: "Facilities Manager", cost: 15500, expectedImpact: "≈ 380 m³/yr reuse", status: "Planned", startDate: ago(5).slice(0, 10) },
    ],
    stakeholders: [
      { id: uid("sh"), group: "Employees", priority: "High", engagementMethod: "Annual engagement survey + quarterly town halls", lastEngaged: ago(45).slice(0, 10), input: "Career pathways and hybrid work flexibility ranked highest." },
      { id: uid("sh"), group: "Investors", priority: "High", engagementMethod: "Semi-annual investor briefing, ESG data pack", lastEngaged: ago(78).slice(0, 10), input: "Climate disclosure readiness (ISSB S2) and board independence." },
      { id: uid("sh"), group: "Regulators", priority: "High", engagementMethod: "Filing cycle correspondence and supervisory meetings", lastEngaged: ago(30).slice(0, 10), input: "Data protection compliance and AML control effectiveness." },
      { id: uid("sh"), group: "Customers", priority: "Medium", engagementMethod: "Client satisfaction survey", lastEngaged: ago(110).slice(0, 10), input: "Service continuity and data security assurances." },
      { id: uid("sh"), group: "Communities", priority: "Medium", engagementMethod: "Community forum, CSR partnerships", lastEngaged: ago(160).slice(0, 10), input: "Local hiring and skills transfer." },
      { id: uid("sh"), group: "Suppliers", priority: "Low", engagementMethod: "Supplier code acknowledgement, annual review", lastEngaged: null, input: "" },
    ],
    topics: [
      { id: uid("tp"), topic: "Climate change & emissions", pillar: "Environmental", financial: 4, impact: 5, priorFinancial: 3, priorImpact: 4, rationale: "Rising energy costs and investor climate disclosure expectations.", escalatedToRisk: true, updatedAt: ago(40) },
      { id: uid("tp"), topic: "Data privacy & security", pillar: "Governance", financial: 5, impact: 4, priorFinancial: 5, priorImpact: 3, rationale: "Regulated client data; breach would be material to enterprise value.", escalatedToRisk: true, updatedAt: ago(40) },
      { id: uid("tp"), topic: "Talent attraction & retention", pillar: "Social", financial: 4, impact: 4, priorFinancial: 4, priorImpact: 3, rationale: "Professional services model is people-dependent.", escalatedToRisk: false, updatedAt: ago(40) },
      { id: uid("tp"), topic: "Diversity, equity & inclusion", pillar: "Social", financial: 3, impact: 4, priorFinancial: 2, priorImpact: 4, rationale: "Client and investor expectations; senior representation gap.", escalatedToRisk: false, updatedAt: ago(40) },
      { id: uid("tp"), topic: "Business ethics & anti-corruption", pillar: "Governance", financial: 5, impact: 5, priorFinancial: 5, priorImpact: 5, rationale: "Licence-to-operate issue in regulated advisory work.", escalatedToRisk: true, updatedAt: ago(40) },
      { id: uid("tp"), topic: "Energy management", pillar: "Environmental", financial: 3, impact: 3, priorFinancial: 3, priorImpact: 3, rationale: "Grid reliability drives generator use and cost.", escalatedToRisk: false, updatedAt: ago(40) },
      { id: uid("tp"), topic: "Waste & circularity", pillar: "Environmental", financial: 2, impact: 3, priorFinancial: 2, priorImpact: 2, rationale: "Limited financial exposure; moderate local impact.", escalatedToRisk: false, updatedAt: ago(40) },
      { id: uid("tp"), topic: "Water stewardship", pillar: "Environmental", financial: 2, impact: 2, priorFinancial: 2, priorImpact: 2, rationale: "Low withdrawal volumes; no water-stressed sites.", escalatedToRisk: false, updatedAt: ago(40) },
      { id: uid("tp"), topic: "Occupational health & safety", pillar: "Social", financial: 3, impact: 4, priorFinancial: 3, priorImpact: 4, rationale: "Duty of care obligations; low-severity office environment.", escalatedToRisk: false, updatedAt: ago(40) },
      { id: uid("tp"), topic: "Community investment", pillar: "Social", financial: 1, impact: 3, priorFinancial: 1, priorImpact: 3, rationale: "Reputational upside, immaterial financially.", escalatedToRisk: false, updatedAt: ago(40) },
      { id: uid("tp"), topic: "Board effectiveness & independence", pillar: "Governance", financial: 4, impact: 3, priorFinancial: 3, priorImpact: 3, rationale: "King V alignment; investor scrutiny of board composition.", escalatedToRisk: false, updatedAt: ago(40) },
      { id: uid("tp"), topic: "Supply chain responsibility", pillar: "Social", financial: 2, impact: 3, priorFinancial: 2, priorImpact: 2, rationale: "Emerging expectation from investors on supplier standards.", escalatedToRisk: false, updatedAt: ago(40) },
    ],
    cycle: {
      year: "2026",
      status: "In progress",
      threshold: 4,
      approvedBy: null,
      approvedAt: null,
      nextReviewDate: new Date(Date.now() + 210 * 86400000).toISOString().slice(0, 10),
    },
    indicators: [
      { id: uid("ind"), framework: "GRI", code: "GRI 2-1", title: "Organisational details", owner: "Company Secretary", response: "Lexora Africa Ltd, registered in Kigali, Rwanda; professional services.", evidence: [{ id: uid("ev"), name: "certificate-of-incorporation.pdf", uploadedAt: ago(60) }], status: "Signed off", signedOffBy: "Company Secretary", signedOffAt: ago(30) },
      { id: uid("ind"), framework: "GRI", code: "GRI 2-7", title: "Employees", owner: "Head of HR", response: "148 employees at period end; 46% women; 92% permanent contracts.", evidence: [{ id: uid("ev"), name: "hr-headcount-extract.xlsx", uploadedAt: ago(25) }], status: "Signed off", signedOffBy: "Head of HR", signedOffAt: ago(20) },
      { id: uid("ind"), framework: "GRI", code: "GRI 305-1", title: "Direct (Scope 1) GHG emissions", owner: "Sustainability Lead", response: "182 tCO2e for 2026, calculated under the GHG Protocol fuel-based method.", evidence: [{ id: uid("ev"), name: "ghg-inventory-2026.xlsx", uploadedAt: ago(12) }], status: "Awaiting sign-off", signedOffBy: null, signedOffAt: null },
      { id: uid("ind"), framework: "GRI", code: "GRI 305-2", title: "Energy indirect (Scope 2) GHG emissions", owner: "Sustainability Lead", response: "96 tCO2e location-based.", evidence: [], status: "In progress", signedOffBy: null, signedOffAt: null },
      { id: uid("ind"), framework: "GRI", code: "GRI 403-9", title: "Work-related injuries", owner: "Facilities Manager", response: "", evidence: [], status: "Not started", signedOffBy: null, signedOffAt: null },
      { id: uid("ind"), framework: "GRI", code: "GRI 405-1", title: "Diversity of governance bodies and employees", owner: "Head of HR", response: "Board 33% women; senior management 31% women.", evidence: [], status: "In progress", signedOffBy: null, signedOffAt: null },
      { id: uid("ind"), framework: "ISSB S1", code: "S1.27", title: "Governance of sustainability-related risks", owner: "Company Secretary", response: "Risk & Sustainability Committee oversees ESG; quarterly board reporting.", evidence: [{ id: uid("ev"), name: "committee-charter.pdf", uploadedAt: ago(70) }], status: "Signed off", signedOffBy: "Board Chair", signedOffAt: ago(18) },
      { id: uid("ind"), framework: "ISSB S1", code: "S1.42", title: "Strategy and decision-making", owner: "CEO", response: "", evidence: [], status: "Not started", signedOffBy: null, signedOffAt: null },
      { id: uid("ind"), framework: "ISSB S2", code: "S2.29", title: "Climate-related metrics — GHG emissions", owner: "Sustainability Lead", response: "Scope 1: 182 tCO2e · Scope 2: 96 tCO2e · Scope 3: 431 tCO2e.", evidence: [], status: "In progress", signedOffBy: null, signedOffAt: null },
      { id: uid("ind"), framework: "ISSB S2", code: "S2.33", title: "Climate-related targets", owner: "Sustainability Lead", response: "40% renewable share by 2028; Scope 1 to 150 tCO2e by 2027.", evidence: [], status: "Awaiting sign-off", signedOffBy: null, signedOffAt: null },
      { id: uid("ind"), framework: "TCFD", code: "TCFD-RM", title: "Risk management — climate risk identification", owner: "Head of Risk", response: "Climate topics escalated to the Risk Register via materiality assessment.", evidence: [], status: "In progress", signedOffBy: null, signedOffAt: null },
      { id: uid("ind"), framework: "King V", code: "P4", title: "Principle 4 — Strategy, performance and reporting", owner: "Company Secretary", response: "Integrated report covers the six capitals and value creation process.", evidence: [], status: "In progress", signedOffBy: null, signedOffAt: null },
      { id: uid("ind"), framework: "King V", code: "P11", title: "Principle 11 — Risk governance", owner: "Head of Risk", response: "Risk appetite approved annually by the board.", evidence: [], status: "Signed off", signedOffBy: "Board Chair", signedOffAt: ago(15) },
      { id: uid("ind"), framework: "UN SDG", code: "SDG 5", title: "Gender equality contribution", owner: "Head of HR", response: "Target 50% women in workforce by 2027.", evidence: [], status: "In progress", signedOffBy: null, signedOffAt: null },
      { id: uid("ind"), framework: "UN SDG", code: "SDG 7", title: "Affordable and clean energy contribution", owner: "Facilities Manager", response: "Renewable share 22%, rising to 40% by 2028.", evidence: [], status: "Not started", signedOffBy: null, signedOffAt: null },
    ],
    reports: [
      { id: uid("rep"), title: "Annual Sustainability Report 2025", framework: "GRI", period: "2025", status: "Published", compiledAt: ago(240), publishedAt: ago(220), note: "Published on the corporate website and included in the board pack." },
      { id: uid("rep"), title: "Investor ESG Data Pack H1 2026", framework: "ISSB S1", period: "H1 2026", status: "Compiled", compiledAt: ago(35), publishedAt: null, note: "Prepared for the semi-annual investor briefing." },
    ],
    history: [
      { period: "2023", e: 48, s: 57, g: 61 },
      { period: "2024", e: 55, s: 62, g: 66 },
      { period: "2025", e: 62, s: 68, g: 71 },
    ],
  };
}

// ── Persistence ──────────────────────────────────────────────

function read(): EsgState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as EsgState;
  } catch {
    return seed();
  }
}

function write(next: EsgState) {
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVT));
}

export function getEsg(): EsgState {
  return read();
}

export function mutateEsg(fn: (s: EsgState) => EsgState) {
  write(fn(read()));
}

export function resetEsg() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVT));
}

export function useEsg() {
  const [state, setState] = useState<EsgState>(read);

  useEffect(() => {
    const sync = () => setState(read());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const mutate = (fn: (s: EsgState) => EsgState) => {
    const next = fn(read());
    write(next);
    setState(next);
  };

  return { state, mutate };
}

// ── Derived calculations ─────────────────────────────────────

/** Progress toward target, 0–100. Handles both directions. */
export function targetProgress(m: EsgMetric): number {
  const span = m.baseline - m.target;
  if (span === 0) return m.value === m.target ? 100 : 0;
  const done = (m.baseline - m.value) / span;
  return Math.max(0, Math.min(100, Math.round(done * 100)));
}

/** Year-on-year change, positive = improvement regardless of direction. */
export function improvement(m: EsgMetric): number {
  if (!m.baseline) return 0;
  const delta = ((m.value - m.baseline) / Math.abs(m.baseline)) * 100;
  return Number((m.direction === "lower" ? -delta : delta).toFixed(1));
}

export function intensity(
  m: EsgMetric,
  ctx: OrgContext,
): { value: number; label: string } | null {
  if (m.intensityBasis === "none") return null;
  const divisor =
    m.intensityBasis === "per employee"
      ? ctx.employees
      : m.intensityBasis === "per m²"
        ? ctx.floorAreaSqm
        : ctx.revenueMillions;
  if (!divisor) return null;
  return {
    value: Number((m.value / divisor).toFixed(3)),
    label: `${m.unit} ${m.intensityBasis}`,
  };
}

export function pillarScore(
  metrics: EsgMetric[],
  pillar: "Environmental" | "Social",
): number {
  const set = metrics.filter((m) => m.pillar === pillar);
  if (!set.length) return 0;
  const total = set.reduce((sum, m) => sum + targetProgress(m), 0);
  return Math.round(total / set.length);
}

export function consolidatedScore(e: number, s: number, g: number): number {
  return Math.round(e * 0.35 + s * 0.35 + g * 0.3);
}

export function scoreGrade(score: number): string {
  if (score >= 85) return "AA";
  if (score >= 70) return "A";
  if (score >= 55) return "BBB";
  if (score >= 40) return "BB";
  return "B";
}

export function scoreTone(score: number): string {
  if (score >= 70) return "text-emerald-600 border-emerald-500/30 bg-emerald-500/10";
  if (score >= 50) return "text-amber-600 border-amber-500/30 bg-amber-500/10";
  return "text-rose-600 border-rose-500/30 bg-rose-500/10";
}

export function topicStatus(t: MaterialTopic, threshold: number): TopicStatus {
  const peak = Math.max(t.financial, t.impact);
  if (peak >= threshold) return "Material";
  if (peak >= threshold - 1) return "Monitor";
  return "Not material";
}

export function topicShift(t: MaterialTopic): number {
  if (t.priorFinancial == null || t.priorImpact == null) return 0;
  return (
    Math.max(t.financial, t.impact) -
    Math.max(t.priorFinancial, t.priorImpact)
  );
}

export function frameworkCoverage(
  indicators: ReportIndicator[],
  framework: Framework,
): { signedOff: number; total: number; pct: number } {
  const set = indicators.filter((i) => i.framework === framework);
  const signedOff = set.filter((i) => i.status === "Signed off").length;
  return {
    signedOff,
    total: set.length,
    pct: set.length ? Math.round((signedOff / set.length) * 100) : 0,
  };
}

export const indicatorTone = (s: IndicatorStatus) =>
  s === "Signed off"
    ? "text-emerald-600 border-emerald-500/30"
    : s === "Awaiting sign-off"
      ? "text-amber-600 border-amber-500/30"
      : s === "In progress"
        ? "text-blue-600 border-blue-500/30"
        : "text-muted-foreground";

export const nowStamp = nowIso;
