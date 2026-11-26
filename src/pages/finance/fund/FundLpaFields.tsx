import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Fund } from "@/lib/crm/finance-api";

// LPA particulars, wire instructions and notice signatory — everything a
// capital call notice or LP document quotes from the fund, captured once
// on the fund instead of retyped per notice.
export interface FundLpaState {
  gpEntityName: string;
  lpaDate: string;
  firstCloseDate: string;
  finalCloseDeadline: string;
  termYears: number;
  lpaCallClause: string;
  lpaDefaultInterestClause: string;
  lpaDefaultClause: string;
  gpCommitmentPct: number;
  wireBeneficiary: string;
  wireBankName: string;
  wireAccountNumber: string;
  wireSwift: string;
  wireBranch: string;
  noticeSignatory: string;
  noticeSignatoryTitle: string;
  administratorEmail: string;
}

export const emptyLpaState = (): FundLpaState => ({
  gpEntityName: "",
  lpaDate: "",
  firstCloseDate: "",
  finalCloseDeadline: "",
  termYears: 10,
  lpaCallClause: "4.1",
  lpaDefaultInterestClause: "4.3",
  lpaDefaultClause: "4.4",
  gpCommitmentPct: 0,
  wireBeneficiary: "",
  wireBankName: "",
  wireAccountNumber: "",
  wireSwift: "",
  wireBranch: "",
  noticeSignatory: "",
  noticeSignatoryTitle: "",
  administratorEmail: "",
});

const day = (d?: string | null) => (d ? d.slice(0, 10) : "");

export const lpaStateFromFund = (f: Fund): FundLpaState => ({
  gpEntityName: f.gpEntityName ?? "",
  lpaDate: day(f.lpaDate),
  firstCloseDate: day(f.firstCloseDate),
  finalCloseDeadline: day(f.finalCloseDeadline),
  termYears: f.termYears ?? 10,
  lpaCallClause: f.lpaCallClause ?? "4.1",
  lpaDefaultInterestClause: f.lpaDefaultInterestClause ?? "4.3",
  lpaDefaultClause: f.lpaDefaultClause ?? "4.4",
  gpCommitmentPct: f.gpCommitmentPct ?? 0,
  wireBeneficiary: f.wireBeneficiary ?? "",
  wireBankName: f.wireBankName ?? "",
  wireAccountNumber: f.wireAccountNumber ?? "",
  wireSwift: f.wireSwift ?? "",
  wireBranch: f.wireBranch ?? "",
  noticeSignatory: f.noticeSignatory ?? "",
  noticeSignatoryTitle: f.noticeSignatoryTitle ?? "",
  administratorEmail: f.administratorEmail ?? "",
});

/** Blank dates / emails must be left out — the engine validates them. */
export const cleanFundPayload = <T extends Record<string, any>>(form: T) => {
  const out: Record<string, any> = { ...form };
  for (const k of [
    "lpaDate",
    "firstCloseDate",
    "finalCloseDeadline",
    "administratorEmail",
    "investmentPeriodEndDate",
    "bankAccountId",
  ]) {
    if (out[k] === "") delete out[k];
  }
  return out as T;
};

export function FundLpaFields<T extends FundLpaState>({
  form,
  setForm,
}: {
  form: T;
  setForm: (f: T) => void;
}) {
  const set = (patch: Partial<FundLpaState>) => setForm({ ...form, ...patch });
  const text = (k: keyof FundLpaState, label: string, ph = "") => (
    <div>
      <Label>{label}</Label>
      <Input
        value={String(form[k] ?? "")}
        placeholder={ph}
        onChange={(e) => set({ [k]: e.target.value } as any)}
      />
    </div>
  );
  return (
    <div className="mt-4 space-y-4 border-t pt-4">
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          LPA PARTICULARS
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {text("gpEntityName", "General partner entity", "e.g. Acme GP Ltd")}
          <div>
            <Label>GP commitment (% of fund)</Label>
            <Input
              type="number"
              value={form.gpCommitmentPct}
              onChange={(e) => set({ gpCommitmentPct: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>LPA date</Label>
            <Input
              type="date"
              value={form.lpaDate}
              onChange={(e) => set({ lpaDate: e.target.value })}
            />
          </div>
          <div>
            <Label>Term (years)</Label>
            <Input
              type="number"
              value={form.termYears}
              onChange={(e) => set({ termYears: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>First close</Label>
            <Input
              type="date"
              value={form.firstCloseDate}
              onChange={(e) => set({ firstCloseDate: e.target.value })}
            />
          </div>
          <div>
            <Label>Final close deadline</Label>
            <Input
              type="date"
              value={form.finalCloseDeadline}
              onChange={(e) => set({ finalCloseDeadline: e.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {text("lpaCallClause", "Capital call clause", "4.1")}
          {text("lpaDefaultInterestClause", "Default interest clause", "4.3")}
          {text("lpaDefaultClause", "Default remedies clause", "4.4")}
        </div>
        <p className="text-[11px] text-muted-foreground">
          The clause numbers are quoted on every capital call notice.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          WIRE INSTRUCTIONS (SHOWN ON CALL NOTICES)
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {text("wireBeneficiary", "Beneficiary", "Defaults to the fund name")}
          {text("wireBankName", "Bank")}
          {text("wireAccountNumber", "Account number / IBAN")}
          {text("wireSwift", "SWIFT / BIC")}
          {text("wireBranch", "Branch")}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          NOTICE SIGNATORY & ADMINISTRATOR
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {text("noticeSignatory", "Authorised signatory")}
          {text("noticeSignatoryTitle", "Signatory title")}
          {text("administratorEmail", "Fund administrator email")}
        </div>
      </div>
    </div>
  );
}
