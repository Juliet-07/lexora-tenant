import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CaseOutcome,
  CaseOutcomesResponse,
  addDaysIso,
  daysLeft,
  fmtDay,
  fmtNum,
  todayIso,
} from "@/lib/crm/case-outcomes-api";
import {
  Check,
  CurrencyPick,
  DocumentField,
  Field,
  Grid,
  HeadsTable,
  Note,
  Pick,
  Section,
  Seg,
} from "./parts";
import {
  Form,
  OutcomeCase,
  OutcomeFormShell,
  ShellCtx,
  sidesOf,
} from "./OutcomeForm";
import { caseRefLine, headsTotal, pctOfClaim } from "./helpers";

const TYPES = [
  {
    label: "Binding decisions",
    items: [
      "Final arbitral award",
      "Partial award",
      "Interim award",
      "Consent award",
      "Expert determination",
      "Adjudicator's decision",
      "Dispute board decision",
    ],
  },
  {
    label: "Non-binding or procedural",
    items: [
      "Mediation ended without settlement",
      "Non-binding recommendation",
      "Claim dismissed",
      "Claim withdrawn",
    ],
  },
];
const HINTS: Record<string, string> = {
  "Final arbitral award": "Binding and final. Starts the challenge period.",
  "Partial award": "Decides some issues. The proceedings continue on the rest.",
  "Interim award": "Temporary relief pending the final award.",
  "Consent award":
    "Records an agreed settlement as an award, so it can be enforced.",
  "Expert determination":
    "Binding on the issues referred, save for fraud or manifest error.",
  "Adjudicator's decision":
    "Binding until finally decided by arbitration or the courts.",
  "Dispute board decision":
    "Binding unless a notice of dissatisfaction is served in time.",
  "Mediation ended without settlement":
    "No relief. Record the next step, for example arbitration or litigation.",
  "Non-binding recommendation":
    "Not enforceable. Record whether the parties accept it.",
  "Claim dismissed": "No relief to the claimant. Costs may still be awarded.",
  "Claim withdrawn": "Proceedings end. Record any costs order.",
};
export const NON_MONEY_AWARD = [
  "Mediation ended without settlement",
  "Non-binding recommendation",
  "Claim withdrawn",
];
const FAVOUR = ["Claimant", "Respondent", "Split", "Neither"] as const;
const COMPLY = ["Awaiting", "Partly", "Complied"] as const;
const NEXT = [
  "Monitor compliance",
  "Enforce the award",
  "Challenge the award",
  "Escalate to litigation",
  "Close the case",
];
const AFTER_BINDING = [
  "Award issued, monitoring compliance",
  "Award under challenge",
  "Closed",
];
const AFTER_OPEN = ["Outcome recorded, case continues", "Closed"];

// A sensible starting type from the kind of ADR the case is.
const defaultType = (c: OutcomeCase) =>
  c.type === "Arbitration"
    ? "Final arbitral award"
    : c.type === "Expert determination"
      ? "Expert determination"
      : "Mediation ended without settlement";

export function buildAward(c: OutcomeCase, saved: Form | null): Form {
  if (saved) return { ...saved };
  const sides = sidesOf("adr", c);
  const type = defaultType(c);
  return {
    type,
    outcomeDate: todayIso(),
    receivedOn: todayIso(),
    neutral: c.neutral ?? "",
    reference: "",
    favour: "Claimant",
    summary: "",
    currency: c.currency,
    payer: sides.second,
    heads: [
      { label: "Principal damages", amount: 0 },
      { label: "Pre-award interest", amount: 0 },
      { label: "Costs of the arbitration", amount: 0 },
    ],
    interestRate: "",
    interestFrom: "",
    nonMonetary: "",
    dueOn: "",
    compliance: "Awaiting",
    remind: true,
    challengeDays: 30,
    intendsToChallenge: false,
    enforceAbroad: false,
    enforceCountry: "",
    documentId: "",
    nextStep: NON_MONEY_AWARD.includes(type)
      ? type === "Mediation ended without settlement"
        ? "Escalate to litigation"
        : "Close the case"
      : "Monitor compliance",
    statusAfter: NON_MONEY_AWARD.includes(type)
      ? AFTER_OPEN[0]
      : AFTER_BINDING[0],
    notify: true,
  };
}

export function validateAward(f: Form): string[] {
  const errs: string[] = [];
  const nm = NON_MONEY_AWARD.includes(f.type);
  if (!f.outcomeDate) errs.push("Enter the date of the award or outcome.");
  if (
    !nm &&
    f.type !== "Claim dismissed" &&
    !headsTotal(f) &&
    !String(f.nonMonetary ?? "").trim()
  )
    errs.push("Enter the amounts awarded or the non-monetary relief.");
  if (!nm && !f.receivedOn)
    errs.push(
      "Enter the date the award was received, to work out the challenge deadline.",
    );
  if (!nm && !f.documentId) errs.push("Attach the signed award or decision.");
  if (f.enforceAbroad && !String(f.enforceCountry ?? "").trim())
    errs.push("Enter the country of enforcement.");
  return errs;
}

function Fields({ ctx }: { ctx: ShellCtx<Form> }) {
  const { form, set, doc, setDoc, caseKind, c } = ctx;
  const sides = sidesOf(caseKind, c);
  const nm = NON_MONEY_AWARD.includes(form.type);
  const total = headsTotal(form);
  const days = Number(form.challengeDays) || 0;
  const last = form.receivedOn ? addDaysIso(form.receivedOn, days) : "";
  const left = last ? daysLeft(last) : 0;
  const withCurrent = (opts: string[], v: string) =>
    v && !opts.includes(v) ? [v, ...opts] : opts;

  const setType = (t: string) => {
    const patch: Form = { type: t };
    const nowNm = NON_MONEY_AWARD.includes(t);
    patch.statusAfter = nowNm ? AFTER_OPEN[0] : AFTER_BINDING[0];
    if (nowNm)
      patch.nextStep =
        t === "Mediation ended without settlement"
          ? "Escalate to litigation"
          : "Close the case";
    else if (NON_MONEY_AWARD.includes(form.type))
      patch.nextStep = "Monitor compliance";
    if (t === "Claim withdrawn") patch.statusAfter = "Closed";
    set(patch);
  };

  return (
    <>
      <Section id="a-outcome" title="Outcome">
        <Field label="Outcome type" hint={HINTS[form.type]}>
          <Pick value={form.type} onChange={setType} options={TYPES} />
        </Field>
        <Grid>
          <Field label="Date of award or outcome">
            <Input
              type="date"
              value={form.outcomeDate}
              onChange={(e) => set({ outcomeDate: e.target.value })}
            />
          </Field>
          <Field label="Date received by us">
            <Input
              type="date"
              value={form.receivedOn}
              onChange={(e) => set({ receivedOn: e.target.value })}
            />
          </Field>
        </Grid>
        <Grid>
          <Field label="Tribunal, expert or neutral">
            <Input
              value={form.neutral}
              onChange={(e) => set({ neutral: e.target.value })}
              placeholder="e.g. Sole arbitrator, Hon. A. Mukamana"
            />
          </Field>
          <Field label="Award reference">
            <Input
              value={form.reference}
              onChange={(e) => set({ reference: e.target.value })}
              placeholder="e.g. KIAC/ARB/2026/014"
            />
          </Field>
        </Grid>
        <Field label="In favour of">
          <Seg
            value={form.favour}
            options={FAVOUR}
            onChange={(v) =>
              set({
                favour: v,
                payer:
                  v === "Respondent"
                    ? sides.first
                    : v === "Claimant"
                      ? sides.second
                      : form.payer,
              })
            }
          />
        </Field>
        <Field label="Summary of findings">
          <Textarea
            rows={3}
            value={form.summary}
            onChange={(e) => set({ summary: e.target.value })}
            placeholder={
              form.type === "Consent award"
                ? "e.g. Award by consent recording the settlement reached between the parties."
                : "e.g. Tribunal found the respondent in breach of the supply agreement and awarded damages, interest and costs."
            }
          />
        </Field>
      </Section>

      {!nm && (
        <>
          <Section id="a-relief" title="Monetary relief">
            <Grid>
              <Field label="Currency">
                <CurrencyPick
                  value={form.currency}
                  caseCurrency={c.currency}
                  onChange={(v) => set({ currency: v })}
                />
              </Field>
              <Field label="Payable by">
                <Pick
                  value={form.payer}
                  onChange={(v) => set({ payer: v })}
                  options={withCurrent(sides.options, form.payer)}
                  placeholder="Select the paying party"
                />
              </Field>
            </Grid>
            <HeadsTable
              rows={form.heads}
              onChange={(heads) => set({ heads })}
              headLabel="Head of award"
              addLabel="Add head of award"
              suggestions={[
                "Principal damages",
                "Pre-award interest",
                "Costs of the arbitration",
                "Legal fees",
              ]}
            />
            <p className="text-right text-xs">
              Total awarded{" "}
              <b>
                {form.currency} {fmtNum(total)}
              </b>
              {pctOfClaim(total, c.claimValue) &&
                ` · ${pctOfClaim(total, c.claimValue)}`}
            </p>
            <Grid>
              <Field label="Post-award interest rate">
                <Input
                  value={form.interestRate}
                  onChange={(e) => set({ interestRate: e.target.value })}
                  placeholder="e.g. 9% per annum"
                />
              </Field>
              <Field label="Interest runs from">
                <Input
                  type="date"
                  value={form.interestFrom}
                  onChange={(e) => set({ interestFrom: e.target.value })}
                />
              </Field>
            </Grid>
            <Field label="Non-monetary relief">
              <Textarea
                rows={2}
                value={form.nonMonetary}
                onChange={(e) => set({ nonMonetary: e.target.value })}
                placeholder="e.g. Declaration that the termination notice was invalid; order to return equipment"
              />
            </Field>
          </Section>

          <Section id="a-comply" title="Compliance">
            <Grid>
              <Field label="Payment or compliance deadline">
                <Input
                  type="date"
                  value={form.dueOn}
                  onChange={(e) => set({ dueOn: e.target.value })}
                />
              </Field>
              <Field label="Compliance status">
                <Seg
                  value={form.compliance}
                  options={COMPLY}
                  onChange={(v) => set({ compliance: v })}
                />
              </Field>
            </Grid>
            <Check checked={form.remind} onChange={(v) => set({ remind: v })}>
              Remind the team 7 days before the compliance deadline
            </Check>
          </Section>

          <Section id="a-final" title="Challenge and enforcement">
            <Grid>
              <Field label="Challenge or set-aside period (days)">
                <Input
                  inputMode="numeric"
                  value={String(form.challengeDays ?? "")}
                  onChange={(e) =>
                    set({
                      challengeDays:
                        Number(e.target.value.replace(/\D/g, "")) || 0,
                    })
                  }
                />
              </Field>
              <Field label="Last day to challenge">
                <Input
                  readOnly
                  value={last ? fmtDay(last) : ""}
                  placeholder="Enter the date received"
                />
              </Field>
            </Grid>
            {last && (
              <Note
                badge={left <= 0 ? "Closed" : left <= 7 ? "Closing" : "Open"}
                tone={left <= 7 ? "warn" : "ok"}
              >
                {left > 0
                  ? `${left} day${left === 1 ? "" : "s"} left to challenge, counted from the date received.`
                  : "The challenge period has ended."}
              </Note>
            )}
            <Check
              checked={form.intendsToChallenge}
              onChange={(v) =>
                set(
                  v
                    ? {
                        intendsToChallenge: v,
                        nextStep: "Challenge the award",
                        statusAfter: "Award under challenge",
                      }
                    : { intendsToChallenge: v },
                )
              }
            >
              Our client intends to challenge or appeal
            </Check>
            <Check
              checked={form.enforceAbroad}
              onChange={(v) =>
                set(
                  v
                    ? { enforceAbroad: v, nextStep: "Enforce the award" }
                    : { enforceAbroad: v },
                )
              }
            >
              Recognition or enforcement needed in another country
            </Check>
            {form.enforceAbroad && (
              <Field label="Country of enforcement">
                <Input
                  value={form.enforceCountry}
                  onChange={(e) => set({ enforceCountry: e.target.value })}
                  placeholder="e.g. Kenya (New York Convention state)"
                />
              </Field>
            )}
          </Section>
        </>
      )}

      <Section id="a-close" title="Award document and close-out">
        <DocumentField
          caseKind={caseKind}
          caseId={c._id}
          title="Award document"
          emptyText={
            nm
              ? "Optional. Attach the decision if there is one"
              : "No file attached. Attach the signed award or decision"
          }
          doc={doc}
          onChange={setDoc}
        />
        <Grid>
          <Field label="Next step">
            <Pick
              value={form.nextStep}
              onChange={(v) => set({ nextStep: v })}
              options={withCurrent(NEXT, form.nextStep)}
            />
          </Field>
          <Field label="Case status after saving">
            <Pick
              value={form.statusAfter}
              onChange={(v) => set({ statusAfter: v })}
              options={withCurrent(
                nm ? AFTER_OPEN : AFTER_BINDING,
                form.statusAfter,
              )}
            />
          </Field>
        </Grid>
        <Check checked={form.notify} onChange={(v) => set({ notify: v })}>
          Notify the client and the engagement team
        </Check>
        <p className="text-xs text-muted-foreground">
          Recording is always logged in the case timeline and audit trail.
        </p>
      </Section>
    </>
  );
}

export function AwardPanel({
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
      kind="Award"
      res={res}
      existing={existing}
      title="Record award / outcome"
      subtitle={caseRefLine(
        c,
        c.type ? `${c.type}${c.venue ? ` (${c.venue})` : ""}` : "",
      )}
      recordLabel="Record outcome"
      nav={[
        { id: "a-outcome", label: "Outcome" },
        { id: "a-relief", label: "Relief" },
        { id: "a-comply", label: "Compliance" },
        { id: "a-final", label: "Challenge" },
        { id: "a-close", label: "Close-out" },
      ]}
      buildInitial={(saved) => buildAward(c, saved)}
      validate={validateAward}
      onSaved={onSaved}
    >
      {(ctx) => <Fields ctx={ctx} />}
    </OutcomeFormShell>
  );
}
