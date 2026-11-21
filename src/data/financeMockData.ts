/**
 * Demo finance figures for the Budget vs Actual dashboard.
 * Browser-local sample data until a finance reporting API exists.
 */

export const REPORTING_PERIOD = "FY 2026";

export const forecastAccuracyPct = 94.2;
export const forecastAccuracyTargetPct = 95;

export const fmoney = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: Math.abs(n) >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(n) >= 1_000_000 ? 1 : 0,
  }).format(n);

export interface MonthlyFigure {
  month: string;
  actual: number;
  budget: number;
}

export const monthlyRevenue: MonthlyFigure[] = [
  { month: "Jan", actual: 412_000, budget: 400_000 },
  { month: "Feb", actual: 388_000, budget: 405_000 },
  { month: "Mar", actual: 451_000, budget: 430_000 },
  { month: "Apr", actual: 470_000, budget: 455_000 },
  { month: "May", actual: 438_000, budget: 460_000 },
  { month: "Jun", actual: 492_000, budget: 475_000 },
  { month: "Jul", actual: 515_000, budget: 490_000 },
  { month: "Aug", actual: 501_000, budget: 505_000 },
  { month: "Sep", actual: 534_000, budget: 520_000 },
  { month: "Oct", actual: 0, budget: 540_000 },
  { month: "Nov", actual: 0, budget: 555_000 },
  { month: "Dec", actual: 0, budget: 570_000 },
];

export const monthlyExpenses: MonthlyFigure[] = [
  { month: "Jan", actual: 298_000, budget: 310_000 },
  { month: "Feb", actual: 305_000, budget: 312_000 },
  { month: "Mar", actual: 322_000, budget: 318_000 },
  { month: "Apr", actual: 315_000, budget: 320_000 },
  { month: "May", actual: 331_000, budget: 325_000 },
  { month: "Jun", actual: 340_000, budget: 332_000 },
  { month: "Jul", actual: 336_000, budget: 338_000 },
  { month: "Aug", actual: 344_000, budget: 342_000 },
  { month: "Sep", actual: 351_000, budget: 348_000 },
  { month: "Oct", actual: 0, budget: 352_000 },
  { month: "Nov", actual: 0, budget: 358_000 },
  { month: "Dec", actual: 0, budget: 365_000 },
];

export interface BudgetLine {
  group: string;
  line: string;
  actual: number;
  budget: number;
  higherIsBetter: boolean;
}

export const budgetVsActualLines: BudgetLine[] = [
  { group: "Revenue", line: "Advisory & consulting", actual: 1_482_000, budget: 1_430_000, higherIsBetter: true },
  { group: "Revenue", line: "Platform subscriptions", actual: 1_104_000, budget: 1_060_000, higherIsBetter: true },
  { group: "Revenue", line: "Training & capacity building", actual: 580_000, budget: 615_000, higherIsBetter: true },
  { group: "Direct costs", line: "Delivery personnel", actual: 892_000, budget: 905_000, higherIsBetter: false },
  { group: "Direct costs", line: "Subcontractors", actual: 214_000, budget: 240_000, higherIsBetter: false },
  { group: "Operating expenses", line: "Salaries & benefits", actual: 1_120_000, budget: 1_100_000, higherIsBetter: false },
  { group: "Operating expenses", line: "Rent & facilities", actual: 268_000, budget: 270_000, higherIsBetter: false },
  { group: "Operating expenses", line: "Technology & licences", actual: 196_000, budget: 210_000, higherIsBetter: false },
  { group: "Operating expenses", line: "Marketing & business development", actual: 148_000, budget: 165_000, higherIsBetter: false },
];
