import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  caseRefLine,
  pctOfClaim,
  scheduleErrors,
  splitEvenly,
  sumOf,
} from "./helpers";

const TYPES = ["Full and final", "Partial", "Conditional", "Interim"] as const;
const TYPE_HINT: Record<string, string> = {
  "Full and final":
    "Ends the dispute in full. All claims are released once the terms are performed.",
  Partial:
    "Resolves part of the dispute. The remaining issues continue in the proceedings.",
  Conditional: "Takes effect only when the conditions below are met.",
  Interim: "A temporary arrangement pending final resolution.",
};
const STRUCTURES = ["Lump sum", "Instalments", "On conditions"] as const;
const COSTS = [
  "Each party bears own",
  "Paid by respondent",
  "Shared equally",
] as const;
const DEFAULTS = [
  "Full balance due; revive claim",
  "Full balance due only",
  "Revive original claim only",
  "Penalty amount becomes due",
];
const EFFECTS = [
  "Withdraw mediation on signing",
  "Apply for consent award",
  "Stay proceedings until paid",
  "No action",
];
const AFTER = [
  "Settled, monitoring payments",
  "Settled and closed",
  "Settlement pending signature",
];

const sessionOptions = (c: OutcomeCase) => {
  const label = c.type ?? "ADR";
  const held = (c.sessions ?? [])
    .map((s, i) => ({ s, n: i + 1 }))
    .filter(({ s }) => s.status !== "Cancelled");
  return {
    list: [
      ...held.map(({ n }) => `${label} session ${n}`),
      "Direct negotiation",
      "Without prejudice correspondence",
    ],
    latestHeld: held.length
      ? `${label} session ${held[held.length - 1].n}`
      : "",
  };
};

export function buildSettlement(
  c: OutcomeCase,
  caseKind: "adr",
  saved: Form | null,
): Form {
  if (saved) return { ...saved };
  const sides = sidesOf(caseKind, c);
  const s = sessionOptions(c);
  return {
    type: "Full and final",
    amount: 0,
    currency: c.currency,
    payer: sides.second,
    payee: sides.first,
    agreedOn: todayIso(),
    reachedVia: s.latestHeld || "Direct negotiation",
    conditions: "",
    nonMonetary: "",
    structure: "Instalments",
    payments: [blankPayment(), blankPayment()],
    interest: "",
    defaultConsequence: DEFAULTS[0],
    mutualRelease: true,
    noAdmission: true,
    confidential: true,
    consentAward: false,
    costs: COSTS[0],
    documentId: "",
    authority: "",
    authorityOn: "",
    effect: EFFECTS[0],
    statusAfter: AFTER[0],
    remind: true,
  };
}

export function validateSettlement(f: Form): string[] {
  const errs: string[] = [];
  if (!f.agreedOn) errs.push("Enter the date the settlement was agreed.");
  if (!f.amount) errs.push("Enter the settlement amount.");
  if (f.payer && f.payer === f.payee)
    errs.push("The paying and receiving party must be different.");
  errs.push(...scheduleErrors(f));
  if (f.type === "Conditional" && !String(f.conditions ?? "").trim())
    errs.push("Describe the conditions that must be met.");
  if (!f.authority) errs.push("Confirm the client’s authority to settle.");
  return errs;
}

function Fields({
  ctx,
  existing,
}: {
  ctx: ShellCtx<Form>;
  existing?: CaseOutcome;
}) {
  const { form, set, doc, setDoc, caseKind, c } = ctx;
  const sides = sidesOf(caseKind, c);
  const sessions = sessionOptions(c);
  const cur: string = form.currency;
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
    else if (v === "Instalments" && rows.length < 2)
      next = splitEvenly(
        [rows[0] ?? blankPayment(), blankPayment()],
        form.amount,
      );
    if (v !== "On conditions") setAuto(true);
    set({ structure: v, payments: next });
  };

  const authorityText = form.authority
    ? `${form.authority}, ${fmtDay(form.authorityOn || todayIso())}`
    : "Not yet confirmed";

  return (
    <>
      <Section id="s-terms" title="Settlement terms">
        <Field label="Settlement type" hint={TYPE_HINT[form.type]}>
          <Seg
            value={form.type}
            options={TYPES}
            onChange={(v) => set({ type: v })}
          />
        </Field>
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
              value={cur}
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
        <Grid>
          <Field label="Date agreed">
            <Input
              type="date"
              value={form.agreedOn}
              onChange={(e) => set({ agreedOn: e.target.value })}
            />
          </Field>
          <Field label="Reached through">
            <Pick
              value={form.reachedVia}
              onChange={(v) => set({ reachedVia: v })}
              options={withCurrent(sessions.list, form.reachedVia)}
            />
          </Field>
        </Grid>
        {form.type === "Conditional" && (
          <Field label="Conditions to be met">
            <Textarea
              rows={2}
              value={form.conditions}
              onChange={(e) => set({ conditions: e.target.value })}
              placeholder="e.g. Board approval of the respondent by 30 November"
            />
          </Field>
        )}
        <Field label="Non-monetary terms">
          <Textarea
            rows={2}
            value={form.nonMonetary}
            onChange={(e) => set({ nonMonetary: e.target.value })}
            placeholder="e.g. Supply contract renewed for 12 months; public statements withdrawn"
          />
        </Field>
      </Section>

      <Section id="s-pay" title="Payment schedule">
        <Field label="Payment structure">
          <Seg
            value={form.structure}
            options={STRUCTURES}
            onChange={setStructure}
          />
        </Field>
        <PaymentsTable
          rows={rows}
          currency={cur}
          amount={form.amount}
          singleOnly={form.structure === "Lump sum"}
          onChange={(next, manual) => {
            if (manual) setAuto(false);
            set({ payments: next });
          }}
        />
        <Grid>
          <Field label="Late payment interest">
            <Input
              value={form.interest}
              onChange={(e) => set({ interest: e.target.value })}
              placeholder="e.g. 10% per annum"
            />
          </Field>
          <Field label="Default consequence">
            <Pick
              value={form.defaultConsequence}
              onChange={(v) => set({ defaultConsequence: v })}
              options={withCurrent(DEFAULTS, form.defaultConsequence)}
            />
          </Field>
        </Grid>
      </Section>

      <Section id="s-scope" title="Scope and protections">
        <Check
          checked={form.mutualRelease}
          onChange={(v) => set({ mutualRelease: v })}
        >
          Mutual release of all claims in this dispute
        </Check>
        <Check
          checked={form.noAdmission}
          onChange={(v) => set({ noAdmission: v })}
        >
          No admission of liability
        </Check>
        <Check
          checked={form.confidential}
          onChange={(v) => set({ confidential: v })}
        >
          Settlement terms confidential
        </Check>
        <Check
          checked={form.consentAward}
          onChange={(v) =>
            set(
              v
                ? { consentAward: v, effect: "Apply for consent award" }
                : { consentAward: v },
            )
          }
        >
          Withdrawal of proceedings or consent award required
        </Check>
        <Field label="Costs">
          <Seg
            value={form.costs}
            options={COSTS}
            onChange={(v) => set({ costs: v })}
          />
        </Field>
      </Section>

      <Section id="s-agree" title="Agreement and signing">
        <DocumentField
          caseKind={caseKind}
          caseId={c._id}
          title="Settlement Agreement"
          emptyText="Generate from this case's details, or attach the signed agreement"
          doc={doc}
          onChange={setDoc}
          generate={() =>
            generateOutcomeDocument(caseKind, c._id, "Settlement", form)
          }
        />
        <Note
          badge={form.authority ? "Verified" : "Required"}
          tone={form.authority ? "ok" : "warn"}
        >
          Client authority to settle: <b>{authorityText}</b>
        </Note>
        <Field label="Authority evidence">
          <Pick
            value={form.authority}
            onChange={(v) => set({ authority: v })}
            options={AUTHORITY_OPTIONS}
          />
        </Field>
      </Section>

      <Section id="s-close" title="Close-out">
        <Grid>
          <Field label="Effect on proceedings">
            <Pick
              value={form.effect}
              onChange={(v) => set({ effect: v })}
              options={withCurrent(EFFECTS, form.effect)}
            />
          </Field>
          <Field label="Case status after saving">
            <Pick
              value={form.statusAfter}
              onChange={(v) => set({ statusAfter: v })}
              options={AFTER}
            />
          </Field>
        </Grid>
        <Check checked={form.remind} onChange={(v) => set({ remind: v })}>
          Remind the team 3 days before each instalment is due
        </Check>
        <p className="text-xs text-muted-foreground">
          Recording is always logged in the case timeline and audit trail.
        </p>
      </Section>
    </>
  );
}

export function SettlementPanel({
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
      caseKind="adr"
      c={c}
      kind="Settlement"
      res={res}
      existing={existing}
      title="Record settlement"
      subtitle={caseRefLine(
        c,
        c.type ? `${c.type}${c.venue ? ` (${c.venue})` : ""}` : "",
      )}
      recordLabel="Record settlement"
      nav={[
        { id: "s-terms", label: "Terms" },
        { id: "s-pay", label: "Payments" },
        { id: "s-scope", label: "Scope" },
        { id: "s-agree", label: "Agreement" },
        { id: "s-close", label: "Close-out" },
      ]}
      buildInitial={(saved) => buildSettlement(c, "adr", saved)}
      validate={validateSettlement}
      onSaved={onSaved}
    >
      {(ctx) => <Fields ctx={ctx} existing={existing} />}
    </OutcomeFormShell>
  );
}
