export interface DCFAssumptions {
  baseRevenue: number;
  growthRate: number;
  ebitdaMargin: number;
  taxRate: number;
  daPct: number;
  capexPct: number;
  wcPct: number;
  wacc: number;
  terminalGrowth: number;
  netDebt: number;
  sharesOutstanding: number;
}
export interface CompRow {
  company: string;
  country: string;
  sector: string;
  marketCap: number;
  revenue: number;
  ebitda: number;
}
export interface PrecedentRow {
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
  growth: number;
  requiredReturn: number;
}
export type MethodKey = "DCF" | "Comparables" | "Precedents" | "NAV" | "DDM";
export const METHOD_KEYS: MethodKey[] = [
  "DCF",
  "Comparables",
  "Precedents",
  "NAV",
  "DDM",
];
export interface MethodBlendEntry {
  weight: number;
  rationale: string;
  confidence: "High" | "Medium" | "Low";
  enabled: boolean;
}

export interface ValuationLike {
  dcf: DCFAssumptions;
  comps: CompRow[];
  privateDiscount: number;
  precedents: PrecedentRow[];
  nav: NavInputs;
  ddm: DdmInputs;
  blend: Record<MethodKey, MethodBlendEntry>;
}

export function runDcf(a: DCFAssumptions) {
  const years: any[] = [];
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
    years.push({
      year: i,
      revenue,
      ebitda,
      da,
      ebit,
      tax,
      nopat,
      capex,
      wc,
      fcf,
      df,
      pv: fcf * df,
    });
    prevRev = revenue;
  }
  const last = years[years.length - 1];
  const g = a.terminalGrowth / 100;
  const w = a.wacc / 100;
  const terminalValue = w > g ? (last.fcf * (1 + g)) / (w - g) : 0;
  const pvTerminal = terminalValue * last.df;
  const pvExplicit = years.reduce((s, y) => s + y.pv, 0);
  const ev = pvExplicit + pvTerminal;
  return {
    years,
    terminalValue,
    pvTerminal,
    pvExplicit,
    ev,
    equity: ev - a.netDebt,
  };
}

export function compsStats(rows: CompRow[]) {
  const evRev = rows
    .map((r) => (r.revenue ? r.marketCap / r.revenue : 0))
    .filter(Boolean);
  const evEbitda = rows
    .map((r) => (r.ebitda ? r.marketCap / r.ebitda : 0))
    .filter(Boolean);
  const mean = (n: number[]) =>
    n.length ? n.reduce((a, b) => a + b, 0) / n.length : 0;
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

export function runComps(v: ValuationLike) {
  const st = compsStats(v.comps);
  const targetRev = v.dcf.baseRevenue;
  const targetEbitda = targetRev * (v.dcf.ebitdaMargin / 100);
  const raw =
    (st.evEbitdaMedian * targetEbitda + st.evRevMedian * targetRev) / 2;
  const ev = raw * (1 - v.privateDiscount / 100);
  return { ...st, ev, targetEbitda };
}

export function runPrecedents(v: ValuationLike) {
  const mult = v.precedents
    .map((p) => (p.ebitda ? p.value / p.ebitda : 0))
    .filter(Boolean);
  const med = mult.length
    ? [...mult].sort((a, b) => a - b)[Math.floor(mult.length / 2)]
    : 0;
  const targetEbitda = v.dcf.baseRevenue * (v.dcf.ebitdaMargin / 100);
  return { medianMultiple: med, ev: med * targetEbitda };
}

export function runNav(v: ValuationLike) {
  const equity =
    v.nav.bookAssets +
    v.nav.ppeUplift -
    v.nav.intangibleWriteDown -
    v.nav.liabilities;
  return { equity, ev: equity + v.dcf.netDebt };
}

export function runDdm(v: ValuationLike) {
  const r = v.ddm.requiredReturn / 100;
  const g = v.ddm.growth / 100;
  const equity = r > g ? (v.ddm.dividend * (1 + g)) / (r - g) : 0;
  return { equity, ev: equity + v.dcf.netDebt };
}

export function methodEv(v: ValuationLike, k: MethodKey): number {
  switch (k) {
    case "DCF":
      return runDcf(v.dcf).ev;
    case "Comparables":
      return runComps(v).ev;
    case "Precedents":
      return runPrecedents(v).ev;
    case "NAV":
      return runNav(v).ev;
    case "DDM":
      return runDdm(v).ev;
  }
}

export function methodRange(v: ValuationLike, k: MethodKey) {
  const mid = methodEv(v, k);
  return { low: mid * 0.85, mid, high: mid * 1.15 };
}

export function blendedValuation(v: ValuationLike) {
  const active = METHOD_KEYS.filter((k) => v.blend[k].enabled);
  const totalWeight = active.reduce((s, k) => s + v.blend[k].weight, 0) || 1;
  const ev = active.reduce(
    (s, k) => s + methodEv(v, k) * (v.blend[k].weight / totalWeight),
    0,
  );
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
  v: ValuationLike,
  rowKey: keyof DCFAssumptions,
  colKey: keyof DCFAssumptions,
  rowSteps: number[],
  colSteps: number[],
) {
  const base = v.dcf;
  return rowSteps.map((r) =>
    colSteps.map((c) => {
      const a = {
        ...base,
        [rowKey]: (base[rowKey] as number) + r,
        [colKey]: (base[colKey] as number) + c,
      };
      return runDcf(a as DCFAssumptions).ev;
    }),
  );
}

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
