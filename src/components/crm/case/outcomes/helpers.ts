import {
  OutcomeHead,
  OutcomePayment,
  fmtNum,
  parseNum,
} from "@/lib/crm/case-outcomes-api";
import { Form, OutcomeCase } from "./OutcomeForm";

export const blankPayment = (amount = 0): OutcomePayment => ({
  dueOn: "",
  amount,
  method: "Bank transfer",
  paid: false,
  paidOn: "",
});

export const sumOf = (xs: { amount: number }[]): number =>
  Math.round(xs.reduce((s, x) => s + (x.amount || 0), 0) * 100) / 100;

/** Spread an amount over the existing rows, keeping their dates and methods. */
export const splitEvenly = (
  rows: OutcomePayment[],
  amount: number,
): OutcomePayment[] => {
  if (!rows.length) return rows;
  const each = Math.round((amount / rows.length) * 100) / 100;
  return rows.map((r, i) => ({
    ...r,
    amount:
      i === rows.length - 1
        ? Math.round((amount - each * (rows.length - 1)) * 100) / 100
        : each,
  }));
};

export const pctOfClaim = (amount: number, claim: number): string =>
  amount && claim ? `${Math.round((amount / claim) * 100)}% of claim` : "";

// Shared by the settlement and consent-judgment forms.
export function scheduleErrors(f: Form): string[] {
  const errs: string[] = [];
  const rows: OutcomePayment[] = f.payments ?? [];
  const amount: number = f.amount || 0;
  if (!amount) return errs;
  if (!rows.length) return ["Add at least one payment to the schedule."];
  const bal = Math.round((amount - sumOf(rows)) * 100) / 100;
  if (bal !== 0)
    errs.push(
      `The payment schedule does not match the settlement amount (balance ${f.currency} ${fmtNum(bal)}).`,
    );
  if (rows.some((r) => !r.dueOn))
    errs.push("Add a due date for every payment.");
  if (rows.some((r) => !r.amount))
    errs.push("Enter an amount for every payment.");
  return errs;
}

export const headsTotal = (f: Form): number =>
  sumOf((f.heads ?? []) as OutcomeHead[]);

/** Keep only what the form really has — numbers as numbers, dates as dates. */
export const cleanNumber = parseNum;

export const COURT_GROUPS = [
  {
    label: "Lower courts",
    items: [
      "Small Claims Court",
      "Magistrates' Court",
      "Primary Court",
      "Intermediate Court",
    ],
  },
  {
    label: "Specialised courts and tribunals",
    items: [
      "Commercial Court",
      "Labour or Industrial Court",
      "Land Court",
      "Tax or Revenue Tribunal",
      "Other tribunal",
    ],
  },
  { label: "Superior courts", items: ["High Court", "Commercial High Court"] },
  {
    label: "Appellate courts",
    items: ["Court of Appeal", "Supreme Court", "Constitutional Court"],
  },
];

/** The courts to offer, with the case's own court first when it is not listed. */
export const courtOptions = (current?: string) => {
  const known = COURT_GROUPS.flatMap((g) => g.items);
  return current && !known.includes(current)
    ? [{ label: "On this case", items: [current] }, ...COURT_GROUPS]
    : COURT_GROUPS;
};

export const COURT_HINTS: Record<string, string> = {
  "Small Claims Court":
    "Small claims decisions are usually final. Review, not appeal, is the normal route, and legal representation may be limited.",
  "Magistrates' Court":
    "Appeals usually lie to the High Court. Check the monetary jurisdiction limit.",
  "Primary Court": "Appeals usually lie to the Intermediate Court.",
  "Constitutional Court": "Usually final. No further appeal.",
  "Supreme Court": "Usually final. Review only in limited cases.",
};

export const AUTHORITY_OPTIONS = [
  "Board resolution",
  "Written instruction from client representative",
  "Power of attorney",
];

export const caseRefLine = (c: OutcomeCase, extra?: string) =>
  [c.ref, c.title, extra].filter(Boolean).join(" · ");
