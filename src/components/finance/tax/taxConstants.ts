import type {
  TaxObligation,
  TaxObligationType,
  TaxPeriodType,
  TaxRecurringFrequency,
} from "@/lib/crm/finance-api";

// Obligation types in the order the add form offers them, with the
// wording the product uses (RSSB is shown as pension / social security).
export const TAX_TYPES: { value: TaxObligationType; label: string }[] = [
  { value: "VAT return", label: "VAT" },
  { value: "PAYE remittance", label: "PAYE" },
  { value: "RSSB contributions", label: "Pension / Social Security" },
  { value: "WHT remittance", label: "WHT" },
  { value: "CIT provisional", label: "CIT" },
  { value: "Excise duty return", label: "Excise Duty" },
  { value: "Capital gains tax", label: "Capital Gains Tax" },
  { value: "Stamp duty", label: "Stamp Duty" },
  { value: "Skills development levy", label: "Skills Development Levy" },
  { value: "Turnover tax", label: "Turnover Tax" },
  { value: "Environmental levy", label: "Environmental Levy" },
];

export const taxTypeLabel = (t: string) =>
  TAX_TYPES.find((x) => x.value === t)?.label ?? t;

export const JURISDICTIONS = [
  { value: "rw", label: "Rwanda — RRA" },
  { value: "ke", label: "Kenya — KRA" },
  { value: "za", label: "South Africa — SARS" },
  { value: "ng", label: "Nigeria — FIRS" },
  { value: "gh", label: "Ghana — GRA" },
  { value: "ug", label: "Uganda — URA" },
  { value: "tz", label: "Tanzania — TRA" },
  { value: "et", label: "Ethiopia — ERCA" },
  { value: "sn", label: "Senegal — DGID" },
  { value: "ci", label: "Cote d'Ivoire — DGI" },
  { value: "cm", label: "Cameroon — DGI" },
  { value: "bw", label: "Botswana — BURS" },
  { value: "zm", label: "Zambia — ZRA" },
  { value: "mw", label: "Malawi — MRA" },
  { value: "zw", label: "Zimbabwe — ZIMRA" },
  { value: "mu", label: "Mauritius — MRA" },
  { value: "other", label: "Other" },
];

export const TAX_CURRENCIES = [
  { value: "RWF", label: "RWF — Rwandan Franc" },
  { value: "KES", label: "KES — Kenyan Shilling" },
  { value: "ZAR", label: "ZAR — South African Rand" },
  { value: "NGN", label: "NGN — Nigerian Naira" },
  { value: "GHS", label: "GHS — Ghanaian Cedi" },
  { value: "UGX", label: "UGX — Ugandan Shilling" },
  { value: "TZS", label: "TZS — Tanzanian Shilling" },
  { value: "ETB", label: "ETB — Ethiopian Birr" },
  { value: "XOF", label: "XOF — CFA Franc (BCEAO)" },
  { value: "XAF", label: "XAF — CFA Franc (BEAC)" },
  { value: "BWP", label: "BWP — Botswana Pula" },
  { value: "ZMW", label: "ZMW — Zambian Kwacha" },
  { value: "MWK", label: "MWK — Malawian Kwacha" },
  { value: "ZWL", label: "ZWL — Zimbabwean Dollar" },
  { value: "MUR", label: "MUR — Mauritian Rupee" },
  { value: "USD", label: "USD — US Dollar" },
];

export const PERIOD_TYPES: { value: TaxPeriodType; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
  { value: "once-off", label: "Once-off" },
];

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const RECURRING_FREQUENCIES: TaxRecurringFrequency[] = [
  "Monthly",
  "Quarterly",
  "Bi-annually",
  "Annually",
];

// Frequency a period type most naturally repeats at — used only to
// pre-fill the recurring step; the user can change it.
export const frequencyForPeriod = (
  t: TaxPeriodType,
): TaxRecurringFrequency | null =>
  t === "monthly"
    ? "Monthly"
    : t === "quarterly"
      ? "Quarterly"
      : t === "annual"
        ? "Annually"
        : null;

export const ordinal = (n: number) => {
  if (n === 31) return "Last day";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

const todayStr = () => new Date().toISOString().slice(0, 10);

// Only an unfiled obligation can be overdue — once a filing is recorded
// (even while it waits for the owner) the work has been done.
export const isOverdue = (o: TaxObligation) =>
  o.status === "Draft" && o.dueOn.slice(0, 10) < todayStr();

export const docCount = (o: TaxObligation) =>
  (o.filing?.returnFile ? 1 : 0) + (o.filing?.popFile ? 1 : 0);

// "Year of Income" is the tax year an obligation belongs to — the archive's
// top-level folder.
export const periodYear = (o: TaxObligation) => o.periodYear;

export const statusBadgeClass = (s: string, overdue = false) =>
  s === "Filed"
    ? "bg-success/10 text-success"
    : s === "Pending approval"
      ? "bg-primary/10 text-primary"
      : overdue
        ? "bg-destructive/10 text-destructive"
        : "bg-warning/10 text-warning";

export const formatMoney = (n: number | null | undefined, c = "RWF") => {
  const safe = typeof n === "number" && !Number.isNaN(n) ? n : 0;
  try {
    return safe.toLocaleString(undefined, { style: "currency", currency: c });
  } catch {
    return `${c} ${safe.toLocaleString()}`;
  }
};
