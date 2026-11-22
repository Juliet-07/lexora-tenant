import { api } from "../api";
import { defaultCurrency } from "@/lib/currency";

const unwrap = (res: any) => res.data?.data ?? res.data;

// ── Shapes ─────────────────────────────────────────────────────────────

export type OutcomeCaseKind = "adr" | "litigation";
export type OutcomeKind =
  "Settlement" | "Award" | "Consent judgment" | "Judgment";

export const OUTCOME_SLUG: Record<OutcomeKind, string> = {
  Settlement: "settlement",
  Award: "award",
  "Consent judgment": "consent-judgment",
  Judgment: "judgment",
};

export interface OutcomePayment {
  dueOn: string;
  amount: number;
  method: string;
  paid: boolean;
  paidOn: string;
}
export interface OutcomeHead {
  label: string;
  amount: number;
}
export interface OutcomeSection {
  h: string;
  rows: [string, string][];
  tables: { head: string[]; rows: string[][] }[];
  ticks: string[];
}
export interface OutcomeShareEntry {
  _id: string;
  at: string;
  by: { name: string };
  channels: string[];
  recipients: string[];
  documents: string[];
  text: string;
  portalPublished: boolean;
  emailsSent: number;
  emailsFailed: string[];
}
export interface OutcomeDeadline {
  label: string;
  date: string;
  kind: string;
  index?: number;
}
export interface CaseOutcome {
  _id: string;
  kind: OutcomeKind;
  subtype: string;
  status: "Draft" | "Recorded";
  version: number;
  form: Record<string, any>;
  amount: number;
  currency: string;
  summary: string;
  occurredOn: string | null;
  challengeDeadline: string | null;
  documentId: string | null;
  documentName: string;
  documentUrl?: string;
  recordedBy: { name: string };
  recordedAt: string | null;
  shared: OutcomeShareEntry[];
  sections: OutcomeSection[];
  deadlines: OutcomeDeadline[];
  revisionCount: number;
}
export interface OutcomeShareOptions {
  mainDocument: string;
  documents: string[];
  fileLabel: string;
  fileHint: string;
  fileDone: string;
  subject: string;
  message: string;
}
export interface CaseOutcomesResponse {
  client: { name: string; email: string } | null;
  shareOptions: Record<OutcomeKind, OutcomeShareOptions>;
  outcomes: CaseOutcome[];
}
export interface OutcomeShareInput {
  channels: string[];
  recipients: string[];
  documents: string[];
  subject: string;
  message: string;
  copyTeam: boolean;
  acknowledgement: boolean;
  allowComments: boolean;
}

// ── Calls ──────────────────────────────────────────────────────────────

const base = (kind: OutcomeCaseKind, id: string) =>
  `/crm/${kind === "adr" ? "adr-cases" : "litigation-cases"}/${id}/outcomes`;

export const fetchCaseOutcomes = async (
  kind: OutcomeCaseKind,
  caseId: string,
): Promise<CaseOutcomesResponse> => unwrap(await api.get(base(kind, caseId)));

export const saveCaseOutcome = async (
  kind: OutcomeCaseKind,
  caseId: string,
  outcome: OutcomeKind,
  dto: {
    status: "Draft" | "Recorded";
    form: Record<string, any>;
    share?: OutcomeShareInput;
  },
): Promise<{
  outcome: CaseOutcome;
  share: { text: string; emailsSent: number; emailsFailed: string[] } | null;
  shareError: string;
}> =>
  unwrap(await api.put(`${base(kind, caseId)}/${OUTCOME_SLUG[outcome]}`, dto));

export const deleteCaseOutcomeDraft = async (
  kind: OutcomeCaseKind,
  caseId: string,
  outcome: OutcomeKind,
) => unwrap(await api.delete(`${base(kind, caseId)}/${OUTCOME_SLUG[outcome]}`));

export const setOutcomePaymentPaid = async (
  kind: OutcomeCaseKind,
  caseId: string,
  outcome: OutcomeKind,
  index: number,
  paid: boolean,
): Promise<CaseOutcome> =>
  unwrap(
    await api.patch(
      `${base(kind, caseId)}/${OUTCOME_SLUG[outcome]}/payments/${index}`,
      { paid },
    ),
  );

export interface GeneratedOutcomeDocument {
  _id: string;
  name: string;
  fileUrl: string;
}
export const generateOutcomeDocument = async (
  kind: OutcomeCaseKind,
  caseId: string,
  outcome: OutcomeKind,
  form: Record<string, any>,
): Promise<GeneratedOutcomeDocument> =>
  unwrap(
    await api.post(
      `${base(kind, caseId)}/${OUTCOME_SLUG[outcome]}/generate-document`,
      { form },
    ),
  );

export const shareCaseOutcome = async (
  kind: OutcomeCaseKind,
  caseId: string,
  outcome: OutcomeKind,
  dto: OutcomeShareInput,
): Promise<{
  text: string;
  emailsSent: number;
  emailsFailed: string[];
  outcome: CaseOutcome;
}> =>
  unwrap(
    await api.post(`${base(kind, caseId)}/${OUTCOME_SLUG[outcome]}/share`, dto),
  );

export const downloadOutcomePdf = async (
  kind: OutcomeCaseKind,
  caseId: string,
  outcome: OutcomeKind,
  filename: string,
): Promise<void> => {
  const res = await api.get(
    `${base(kind, caseId)}/${OUTCOME_SLUG[outcome]}/pdf`,
    { responseType: "blob" },
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(res.data);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

/** What the engine rejected, as a list of plain sentences. */
export const outcomeErrors = (err: any): string[] => {
  const m = err?.response?.data?.message;
  if (Array.isArray(m)) return m.map(String);
  if (typeof m === "string" && m) return [m];
  return [err?.message || "Something went wrong. Please try again."];
};

// ── Small helpers shared by the forms ──────────────────────────────────

export const parseNum = (v: unknown): number => {
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
export const fmtNum = (n: number): string =>
  (Number(n) || 0).toLocaleString("en-GB");
export const fmtDay = (d?: string | null): string =>
  d
    ? new Date(d.length === 10 ? `${d}T12:00:00Z` : d).toLocaleDateString(
        "en-GB",
        { day: "2-digit", month: "short", year: "numeric" },
      )
    : "";
export const todayIso = (): string => new Date().toISOString().slice(0, 10);
export const addDaysIso = (d: string, n: number): string => {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
export const daysLeft = (d: string): number =>
  Math.ceil(
    (Date.parse(`${d}T12:00:00Z`) - Date.parse(`${todayIso()}T12:00:00Z`)) /
      86_400_000,
  );

const AFRICAN_CURRENCIES: [string, string][] = [
  ["DZD", "Algerian dinar"],
  ["AOA", "Angolan kwanza"],
  ["XOF", "West African CFA franc (BCEAO)"],
  ["BWP", "Botswana pula"],
  ["BIF", "Burundian franc"],
  ["CVE", "Cape Verdean escudo"],
  ["XAF", "Central African CFA franc (BEAC)"],
  ["KMF", "Comorian franc"],
  ["CDF", "Congolese franc"],
  ["DJF", "Djiboutian franc"],
  ["EGP", "Egyptian pound"],
  ["ERN", "Eritrean nakfa"],
  ["SZL", "Eswatini lilangeni"],
  ["ETB", "Ethiopian birr"],
  ["GMD", "Gambian dalasi"],
  ["GHS", "Ghanaian cedi"],
  ["GNF", "Guinean franc"],
  ["KES", "Kenyan shilling"],
  ["LSL", "Lesotho loti"],
  ["LRD", "Liberian dollar"],
  ["LYD", "Libyan dinar"],
  ["MGA", "Malagasy ariary"],
  ["MWK", "Malawian kwacha"],
  ["MRU", "Mauritanian ouguiya"],
  ["MUR", "Mauritian rupee"],
  ["MAD", "Moroccan dirham"],
  ["MZN", "Mozambican metical"],
  ["NAD", "Namibian dollar"],
  ["NGN", "Nigerian naira"],
  ["RWF", "Rwandan franc"],
  ["STN", "Sao Tome and Principe dobra"],
  ["SCR", "Seychellois rupee"],
  ["SLE", "Sierra Leonean leone"],
  ["SOS", "Somali shilling"],
  ["ZAR", "South African rand"],
  ["SSP", "South Sudanese pound"],
  ["SDG", "Sudanese pound"],
  ["TZS", "Tanzanian shilling"],
  ["TND", "Tunisian dinar"],
  ["UGX", "Ugandan shilling"],
  ["ZMW", "Zambian kwacha"],
  ["ZWG", "Zimbabwe Gold"],
];
const INTERNATIONAL_CURRENCIES: [string, string][] = [
  ["USD", "US dollar"],
  ["EUR", "Euro"],
  ["GBP", "Pound sterling"],
  ["CNY", "Chinese yuan"],
  ["AED", "UAE dirham"],
  ["INR", "Indian rupee"],
];
export const CURRENCY_GROUPS = [
  { label: "African currencies", items: AFRICAN_CURRENCIES },
  { label: "International currencies", items: INTERNATIONAL_CURRENCIES },
];
/** Every currency code the picker offers, plus the case's own and the account's base. */
export const currencyCodes = (extra?: string): string[] =>
  Array.from(
    new Set(
      [
        extra,
        defaultCurrency(),
        ...CURRENCY_GROUPS.flatMap((g) => g.items.map(([c]) => c)),
      ].filter(Boolean) as string[],
    ),
  );
