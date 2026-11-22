import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CaseOutcome,
  CaseOutcomesResponse,
  fmtDay,
  generateOutcomeDocument,
  todayIso,
} from "@/lib/crm/case-outcomes-api";
import {
  Check,
  CurrencyPick,
  DocumentField,
  Field,
  Grid,
  MoneyInput,
  Note,
  PaymentsTable,
  Pick,
  Seg,
  Section,
} from "./parts";
import {
  Form,
  OutcomeCase,
  OutcomeFormShell,
  ShellCtx,
  sidesOf,
} from "./OutcomeForm";
import {
  AUTHORITY_OPTIONS,
  blankPayment,
  courtOptions,
  pctOfClaim,
  scheduleErrors,
  splitEvenly,
  sumOf,
} from "./helpers";

const STAGES = [
  "Draft agreed",
  "Filed with court",
  "Made by the court",
] as const;
const STAGE_HINT: Record<string, string> = {
  "Draft agreed": "Terms are agreed but the order is not yet filed.",
  "Filed with court":
    "The consent order is filed and awaiting the court's endorsement.",
  "Made by the court":
    "The court has endorsed the order. It is enforceable as a judgment.",
};
const STRUCT = ["Lump sum", "Instalments"] as const;
const COSTS = [
  "Each party bears own",
  "Defendant pays, as taxed",
  "Agreed amount",
] as const;
const DEFAULTS = [
  "Execution for the full balance without further notice",
  "Execution for the overdue instalment only",
  "Plaintiff may reinstate the original claim",
];
const AFTER = [
  "Closed by consent, monitoring payments",
  "Closed by consent",
  "Consent order pending endorsement",
];
const RELATED = [
  "None",
  "Withdraw counterclaim",
  "Withdraw related ADR or appeal",
];

export function buildConsent(c: OutcomeCase, saved: Form | null): Form {
  if (saved) return { ...saved };
  const sides = sidesOf("litigation", c);
  return {
    court: c.court ?? "",
    caseNumber: c.courtCaseNumber ?? "",
    judge: c.judge ?? "",
    orderDate: todayIso(),
    orderStatus: "Filed with court",
    amount: 0,
    currency: c.currency,
    payer: sides.second,
    payee: sides.first,
    terms: "",
    fullAndFinal: true,
    noAdmission: true,
    separateAgreement: false,
    structure: "Instalments",
    payments: [blankPayment(), blankPayment()],
    interest: "",
    onDefault: DEFAULTS[0],
    costs: COSTS[0],
    costsAmount: 0,
    authority: "",
    authorityOn: "",
    documentId: "",
    statusAfter: AFTER[0],
    related: RELATED[0],
    remind: true,
    notify: true,
  };
}

export function validateConsent(f: Form): string[] {
  const errs: string[] = [];
  if (!f.orderDate) errs.push("Enter the date of the consent order.");
  if (!f.amount && !String(f.terms ?? "").trim())
    errs.push("Enter the settlement amount or the terms to be recorded.");
  if (f.payer && f.payer === f.payee)
    errs.push("The paying and receiving party must be different.");
  errs.push(...scheduleErrors(f));
  if (f.costs === "Agreed amount" && !f.costsAmount)
    errs.push("Enter the agreed costs amount.");
  if (!f.authority) errs.push("Confirm the client’s authority to settle.");
  if (!f.documentId) errs.push("Generate or attach the consent order.");
  return errs;
}

function Fields({ ctx }: { ctx: ShellCtx<Form> }) {
  const { form, set, doc, setDoc, caseKind, c } = ctx;
  const sides = sidesOf(caseKind, c);
  const rows = form.payments ?? [];
  const [auto, setAuto] = useState(() => sumOf(rows) === 0);
  const withCurrent = (opts: string[], v: string) =>
    v && !opts.includes(v) ? [v, ...opts] : opts;
  const setAmount = (amount: number) =>
    set({ amount, payments: auto ? splitEvenly(rows, amount) : rows });
  const setPayer = (v: string) => {
    const other = sides.options.find((o) => o !== v);
    set({
      payer: v,
      payee: sides.options.length === 2 && other ? other : form.payee,
    });
  };
  const setPayee = (v: string) => {
    const other = sides.options.find((o) => o !== v);
    set({
      payee: v,
      payer: sides.options.length === 2 && other ? other : form.payer,
    });
  };
  const setStructure = (v: string) => {
    let next = rows;
    if (v === "Lump sum")
      next = [{ ...(rows[0] ?? blankPayment()), amount: form.amount }];
    else if (rows.length < 2)
      next = splitEvenly(
        [rows[0] ?? blankPayment(), blankPayment()],
        form.amount,
      );
    setAuto(true);
    set({ structure: v, payments: next });
  };
  const authorityText = form.authority
    ? `${form.authority}, ${fmtDay(form.authorityOn || todayIso())}`
    : "Not yet confirmed";

  return (
    <>
      <Section id="c-order" title="Court order">
        <Grid>
          <Field label="Court">
            <Pick
              value={form.court}
              onChange={(v) => set({ court: v })}
              options={courtOptions(form.court)}
              placeholder="Select the court"
            />
          </Field>
          <Field label="Case number">
            <Input
              value={form.caseNumber}
              onChange={(e) => set({ caseNumber: e.target.value })}
            />
          </Field>
        </Grid>
        <Grid>
          <Field label="Judge">
            <Input
              value={form.judge}
              onChange={(e) => set({ judge: e.target.value })}
              placeholder="e.g. Hon. Justice N. Uwase"
            />
          </Field>
          <Field label="Date of consent order">
            <Input
              type="date"
              value={form.orderDate}
              onChange={(e) => set({ orderDate: e.target.value })}
            />
          </Field>
        </Grid>
        <Field label="Order status" hint={STAGE_HINT[form.orderStatus]}>
          <Seg
            value={form.orderStatus}
            options={STAGES}
            onChange={(v) => set({ orderStatus: v })}
          />
        </Field>
      </Section>

      <Section id="c-terms" title="Settlement terms">
        <Grid cols={3}>
          <Field label="Settlement amount">
            <MoneyInput
              value={form.amount}
              onChange={setAmount}
              placeholder="0"
            />
          </Field>
          <Field label="Currency">
            <CurrencyPick
              value={form.currency}
              caseCurrency={c.currency}
              onChange={(v) => set({ currency: v })}
            />
          </Field>
          <Field label="Against claim">
            <Input
              readOnly
              value={pctOfClaim(form.amount, c.claimValue)}
              placeholder="No claim value set"
            />
          </Field>
        </Grid>
        <Grid>
          <Field label="Paying party">
            <Pick
              value={form.payer}
              onChange={setPayer}
              options={withCurrent(sides.options, form.payer)}
              placeholder="Select the paying party"
            />
          </Field>
          <Field label="Receiving party">
            <Pick
              value={form.payee}
              onChange={setPayee}
              options={withCurrent(sides.options, form.payee)}
              placeholder="Select the receiving party"
            />
          </Field>
        </Grid>
        <Field label="Terms of settlement to be recorded in the order">
          <Textarea
            rows={3}
            value={form.terms}
            onChange={(e) => set({ terms: e.target.value })}
            placeholder="e.g. The defendant shall pay the plaintiff the agreed sum in instalments, in full and final settlement of the claim and counterclaim."
          />
        </Field>
        <Check
          checked={form.fullAndFinal}
          onChange={(v) => set({ fullAndFinal: v })}
        >
          Full and final settlement of the claim and any counterclaim
        </Check>
        <Check
          checked={form.noAdmission}
          onChange={(v) => set({ noAdmission: v })}
        >
          No admission of liability
        </Check>
        <Check
          checked={form.separateAgreement}
          onChange={(v) => set({ separateAgreement: v })}
        >
          Confidential terms kept in a separate settlement agreement
        </Check>
        <p className="text-xs text-muted-foreground">
          A consent judgment is a public court record. Use a separate agreement
          for terms that must stay confidential.
        </p>
      </Section>

      <Section id="c-pay" title="Payment schedule">
        <Seg value={form.structure} options={STRUCT} onChange={setStructure} />
        <PaymentsTable
          rows={rows}
          currency={form.currency}
          amount={form.amount}
          singleOnly={form.structure === "Lump sum"}
          onChange={(next, manual) => {
            if (manual) setAuto(false);
            set({ payments: next });
          }}
        />
        <Grid>
          <Field label="Interest on late payment">
            <Input
              value={form.interest}
              onChange={(e) => set({ interest: e.target.value })}
              placeholder="e.g. At the statutory judgment rate"
            />
          </Field>
          <Field label="On default">
            <Pick
              value={form.onDefault}
              onChange={(v) => set({ onDefault: v })}
              options={withCurrent(DEFAULTS, form.onDefault)}
            />
          </Field>
        </Grid>
      </Section>

      <Section id="c-costs" title="Costs and authority">
        <Field label="Costs">
          <Seg
            value={form.costs}
            options={COSTS}
            onChange={(v) => set({ costs: v })}
          />
        </Field>
        {form.costs === "Agreed amount" && (
          <Field label="Agreed costs amount">
            <MoneyInput
              value={form.costsAmount}
              onChange={(n) => set({ costsAmount: n })}
              placeholder="e.g. 450,000"
            />
          </Field>
        )}
        <Field label="Client authority to settle">
          <Pick
            value={form.authority}
            onChange={(v) => set({ authority: v })}
            options={AUTHORITY_OPTIONS}
          />
        </Field>
        <Note
          badge={form.authority ? "Verified" : "Required"}
          tone={form.authority ? "ok" : "warn"}
        >
          Authority status: <b>{authorityText}</b>
        </Note>
        <DocumentField
          caseKind={caseKind}
          caseId={c._id}
          title="Consent order"
          emptyText="Generate a draft from this case's details, signed by counsel for both parties, or attach it"
          doc={doc}
          onChange={setDoc}
          generate={() =>
            generateOutcomeDocument(caseKind, c._id, "Consent judgment", form)
          }
          generateLabel="Generate draft"
        />
      </Section>

      <Section id="c-close" title="Close-out">
        <Grid>
          <Field label="Case status after saving">
            <Pick
              value={form.statusAfter}
              onChange={(v) => set({ statusAfter: v })}
              options={AFTER}
            />
          </Field>
          <Field label="Related proceedings">
            <Pick
              value={form.related}
              onChange={(v) => set({ related: v })}
              options={withCurrent(RELATED, form.related)}
            />
          </Field>
        </Grid>
        <Check checked={form.remind} onChange={(v) => set({ remind: v })}>
          Remind the team 3 days before each instalment is due
        </Check>
        <Check checked={form.notify} onChange={(v) => set({ notify: v })}>
          Notify the client and record in the audit trail
        </Check>
      </Section>
    </>
  );
}

export function ConsentJudgmentPanel({
  open,
  onClose,
  c,
  res,
  existing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  c: OutcomeCase;
  res: CaseOutcomesResponse | undefined;
  existing: CaseOutcome | undefined;
  onSaved: () => void;
}) {
  return (
    <OutcomeFormShell<Form>
      open={open}
      onClose={onClose}
      caseKind="litigation"
      c={c}
      kind="Consent judgment"
      res={res}
      existing={existing}
      title="Record consent judgment"
      subtitle={`${c.ref} · Settlement reached during litigation, recorded as an order of court`}
      recordLabel="Record consent judgment"
      nav={[
        { id: "c-order", label: "Order" },
        { id: "c-terms", label: "Terms" },
        { id: "c-pay", label: "Payments" },
        { id: "c-costs", label: "Costs" },
        { id: "c-close", label: "Close-out" },
      ]}
      buildInitial={(saved) => buildConsent(c, saved)}
      validate={validateConsent}
      onSaved={onSaved}
    >
      {(ctx) => <Fields ctx={ctx} />}
    </OutcomeFormShell>
  );
}
