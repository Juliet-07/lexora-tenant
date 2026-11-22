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
  COURT_HINTS,
  caseRefLine,
  courtOptions,
  headsTotal,
  pctOfClaim,
} from "./helpers";

const TYPES = [
  {
    label: "Final",
    items: [
      "Final judgment after trial",
      "Summary judgment",
      "Default judgment",
      "Judgment on appeal",
    ],
  },
  {
    label: "Other",
    items: [
      "Partial judgment",
      "Interlocutory order",
      "Claim dismissed",
      "Claim struck out",
    ],
  },
];
const HINTS: Record<string, string> = {
  "Final judgment after trial":
    "Final on the merits. Starts the appeal period.",
  "Summary judgment":
    "Given without a full trial. Appealable within the period.",
  "Default judgment":
    "Given because the defendant did not respond. It may be set aside on application.",
  "Judgment on appeal": "Replaces or confirms the judgment below.",
  "Partial judgment": "Decides some claims. The rest continue.",
  "Interlocutory order": "A procedural or interim order. The case continues.",
  "Claim dismissed": "No relief to the plaintiff. Costs may be ordered.",
  "Claim struck out": "The claim ends without a decision on the merits.",
};
export const NO_RELIEF = [
  "Interlocutory order",
  "Claim dismissed",
  "Claim struck out",
];
const OPEN_TYPES = ["Interlocutory order", "Partial judgment"];
const FAVOUR = ["Plaintiff", "Defendant", "Partly each"] as const;
const RESULT = ["Upheld in full", "Upheld in part", "Dismissed"] as const;
const SAT = ["Unsatisfied", "Partly", "Satisfied"] as const;
const COSTS_ORDER = [
  "Costs to the successful party, as taxed",
  "Costs fixed by the court",
  "Each party bears own costs",
  "Costs reserved",
];
const METHODS = [
  "Writ of execution against movable property",
  "Attachment of immovable property",
  "Garnishee order against bank accounts",
  "Contempt proceedings for non-monetary orders",
  "Insolvency or liquidation proceedings",
];
const NEXT = [
  "Await payment",
  "Enforce the judgment",
  "File an appeal",
  "Tax the bill of costs",
  "Close the case",
];
const AFTER_FINAL = [
  "Judgment delivered, awaiting satisfaction",
  "Under appeal",
  "Closed",
];
const AFTER_OPEN = ["Order recorded, case continues", "Closed"];

export function buildJudgment(c: OutcomeCase, saved: Form | null): Form {
  if (saved) return { ...saved };
  const sides = sidesOf("litigation", c);
  return {
    type: "Final judgment after trial",
    court: c.court ?? "",
    judge: c.judge ?? "",
    caseNumber: c.courtCaseNumber ?? "",
    deliveredOn: todayIso(),
    receivedOn: todayIso(),
    favour: "Plaintiff",
    result: "Upheld in full",
    summary: "",
    currency: c.currency,
    debtor: sides.second,
    heads: [
      { label: "Damages", amount: 0 },
      { label: "Pre-judgment interest", amount: 0 },
      { label: "Costs (as fixed)", amount: 0 },
    ],
    interestRate: "",
    costsOrder: COSTS_ORDER[0],
    nonMonetary: "",
    appealDays: 30,
    leaveRequired: false,
    intendsToAppeal: false,
    stay: false,
    dueOn: "",
    satisfaction: "Unsatisfied",
    enforcementMethod: METHODS[0],
    enforceAbroad: false,
    enforceCountry: "",
    documentId: "",
    nextStep: "Await payment",
    statusAfter: AFTER_FINAL[0],
    remind: true,
    notify: true,
  };
}

export function validateJudgment(f: Form): string[] {
  const errs: string[] = [];
  const nr = NO_RELIEF.includes(f.type);
  if (!f.deliveredOn) errs.push("Enter the date the judgment was delivered.");
  if (!f.receivedOn)
    errs.push(
      "Enter the date the sealed judgment was received, to work out the appeal deadline.",
    );
  if (!nr && !headsTotal(f) && !String(f.nonMonetary ?? "").trim())
    errs.push("Enter the judgment sum or the non-monetary relief.");
  if (!f.documentId) errs.push("Attach the sealed judgment or order.");
  if (f.enforceAbroad && !String(f.enforceCountry ?? "").trim())
    errs.push("Enter the country of enforcement.");
  return errs;
}

function Fields({ ctx }: { ctx: ShellCtx<Form> }) {
  const { form, set, doc, setDoc, caseKind, c } = ctx;
  const sides = sidesOf(caseKind, c);
  const nr = NO_RELIEF.includes(form.type);
  const total = headsTotal(form);
  const days = Number(form.appealDays) || 0;
  const last = form.receivedOn ? addDaysIso(form.receivedOn, days) : "";
  const left = last ? daysLeft(last) : 0;
  const withCurrent = (opts: string[], v: string) =>
    v && !opts.includes(v) ? [v, ...opts] : opts;

  const setType = (t: string) => {
    const patch: Form = { type: t };
    patch.statusAfter = OPEN_TYPES.includes(t) ? AFTER_OPEN[0] : AFTER_FINAL[0];
    if (t === "Judgment on appeal") patch.court = "Court of Appeal";
    if (t === "Claim dismissed" || t === "Claim struck out") {
      patch.result = "Dismissed";
      patch.favour = "Defendant";
    }
    if (t === "Interlocutory order") patch.nextStep = "Await payment";
    set(patch);
  };

  return (
    <>
      <Section id="j-judg" title="Judgment">
        <Grid>
          <Field label="Type of judgment" hint={HINTS[form.type]}>
            <Pick value={form.type} onChange={setType} options={TYPES} />
          </Field>
          <Field label="Court level" hint={COURT_HINTS[form.court]}>
            <Pick
              value={form.court}
              onChange={(v) =>
                set(
                  v === "Small Claims Court"
                    ? { court: v, leaveRequired: false }
                    : { court: v },
                )
              }
              options={courtOptions(form.court)}
              placeholder="Select the court"
            />
          </Field>
        </Grid>
        <Grid>
          <Field label="Judge or panel">
            <Input
              value={form.judge}
              onChange={(e) => set({ judge: e.target.value })}
              placeholder="e.g. Hon. Justice N. Uwase"
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
          <Field label="Date delivered">
            <Input
              type="date"
              value={form.deliveredOn}
              onChange={(e) => set({ deliveredOn: e.target.value })}
            />
          </Field>
          <Field label="Date sealed judgment received">
            <Input
              type="date"
              value={form.receivedOn}
              onChange={(e) => set({ receivedOn: e.target.value })}
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
                debtor:
                  v === "Defendant"
                    ? sides.first
                    : v === "Plaintiff"
                      ? sides.second
                      : form.debtor,
              })
            }
          />
        </Field>
        <Field label="Result on the claim">
          <Seg
            value={form.result}
            options={RESULT}
            onChange={(v) => set({ result: v })}
          />
        </Field>
        <Field label="Summary of reasons">
          <Textarea
            rows={3}
            value={form.summary}
            onChange={(e) => set({ summary: e.target.value })}
            placeholder="e.g. Court found the defendant in breach of the shareholders agreement and awarded damages, interest and costs."
          />
        </Field>
      </Section>

      {!nr && (
        <Section id="j-relief" title="Relief granted">
          <Grid>
            <Field label="Currency">
              <CurrencyPick
                value={form.currency}
                caseCurrency={c.currency}
                onChange={(v) => set({ currency: v })}
              />
            </Field>
            <Field label="Judgment debtor">
              <Pick
                value={form.debtor}
                onChange={(v) => set({ debtor: v })}
                options={withCurrent(sides.options, form.debtor)}
                placeholder="Select the judgment debtor"
              />
            </Field>
          </Grid>
          <HeadsTable
            rows={form.heads}
            onChange={(heads) => set({ heads })}
            headLabel="Head of judgment"
            addLabel="Add head"
            suggestions={[
              "Damages",
              "Pre-judgment interest",
              "Costs (as fixed)",
              "Special damages",
            ]}
          />
          <p className="text-right text-xs">
            Judgment sum{" "}
            <b>
              {form.currency} {fmtNum(total)}
            </b>
            {pctOfClaim(total, c.claimValue) &&
              ` · ${pctOfClaim(total, c.claimValue)}`}
          </p>
          <Grid>
            <Field label="Post-judgment interest">
              <Input
                value={form.interestRate}
                onChange={(e) => set({ interestRate: e.target.value })}
                placeholder="e.g. At the statutory judgment rate"
              />
            </Field>
            <Field label="Costs order">
              <Pick
                value={form.costsOrder}
                onChange={(v) => set({ costsOrder: v })}
                options={withCurrent(COSTS_ORDER, form.costsOrder)}
              />
            </Field>
          </Grid>
          <Field label="Non-monetary relief">
            <Textarea
              rows={2}
              value={form.nonMonetary}
              onChange={(e) => set({ nonMonetary: e.target.value })}
              placeholder="e.g. Declaration that the share transfer is void; order to rectify the register of members"
            />
          </Field>
        </Section>
      )}

      <Section id="j-appeal" title="Appeal">
        <Grid>
          <Field label="Appeal period (days)">
            <Input
              inputMode="numeric"
              value={String(form.appealDays ?? "")}
              onChange={(e) =>
                set({
                  appealDays: Number(e.target.value.replace(/\D/g, "")) || 0,
                })
              }
            />
          </Field>
          <Field label="Last day to appeal">
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
              ? `${left} day${left === 1 ? "" : "s"} left to appeal, counted from the date the sealed judgment was received.`
              : "The appeal period has ended."}
          </Note>
        )}
        <Check
          checked={form.leaveRequired}
          onChange={(v) => set({ leaveRequired: v })}
        >
          Leave to appeal required
        </Check>
        <Check
          checked={form.intendsToAppeal}
          onChange={(v) =>
            set(
              v
                ? {
                    intendsToAppeal: v,
                    nextStep: "File an appeal",
                    statusAfter: "Under appeal",
                  }
                : { intendsToAppeal: v },
            )
          }
        >
          Our client intends to appeal
        </Check>
        <Check checked={form.stay} onChange={(v) => set({ stay: v })}>
          Stay of execution sought or granted
        </Check>
      </Section>

      {!nr && (
        <Section id="j-enforce" title="Satisfaction and enforcement">
          <Grid>
            <Field label="Date for payment or compliance">
              <Input
                type="date"
                value={form.dueOn}
                onChange={(e) => set({ dueOn: e.target.value })}
              />
            </Field>
            <Field label="Satisfaction status">
              <Seg
                value={form.satisfaction}
                options={SAT}
                onChange={(v) =>
                  set(
                    v === "Satisfied"
                      ? { satisfaction: v, nextStep: "Close the case" }
                      : { satisfaction: v },
                  )
                }
              />
            </Field>
          </Grid>
          <Field label="Enforcement method if unpaid">
            <Pick
              value={form.enforcementMethod}
              onChange={(v) => set({ enforcementMethod: v })}
              options={withCurrent(METHODS, form.enforcementMethod)}
            />
          </Field>
          <Check
            checked={form.enforceAbroad}
            onChange={(v) => set({ enforceAbroad: v })}
          >
            Enforcement needed in another country
          </Check>
          {form.enforceAbroad && (
            <Field label="Country of enforcement">
              <Input
                value={form.enforceCountry}
                onChange={(e) => set({ enforceCountry: e.target.value })}
                placeholder="e.g. Uganda (reciprocal enforcement of judgments)"
              />
            </Field>
          )}
        </Section>
      )}

      <Section id="j-close" title="Judgment document and close-out">
        <DocumentField
          caseKind={caseKind}
          caseId={c._id}
          title="Sealed judgment and order"
          emptyText="No file attached. Attach the sealed judgment"
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
                OPEN_TYPES.includes(form.type) ? AFTER_OPEN : AFTER_FINAL,
                form.statusAfter,
              )}
            />
          </Field>
        </Grid>
        <Check checked={form.remind} onChange={(v) => set({ remind: v })}>
          Remind the team 7 days before the appeal and payment deadlines
        </Check>
        <Check checked={form.notify} onChange={(v) => set({ notify: v })}>
          Notify the client and record in the audit trail
        </Check>
      </Section>
    </>
  );
}

export function JudgmentPanel({
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
      kind="Judgment"
      res={res}
      existing={existing}
      title="Record judgment"
      subtitle={caseRefLine(
        c,
        c.court
          ? `${c.court}${c.courtCaseNumber ? ` · ${c.courtCaseNumber}` : ""}`
          : "",
      )}
      recordLabel="Record judgment"
      nav={[
        { id: "j-judg", label: "Judgment" },
        { id: "j-relief", label: "Relief" },
        { id: "j-appeal", label: "Appeal" },
        { id: "j-enforce", label: "Enforcement" },
        { id: "j-close", label: "Close-out" },
      ]}
      buildInitial={(saved) => buildJudgment(c, saved)}
      validate={validateJudgment}
      onSaved={onSaved}
    >
      {(ctx) => <Fields ctx={ctx} />}
    </OutcomeFormShell>
  );
}
