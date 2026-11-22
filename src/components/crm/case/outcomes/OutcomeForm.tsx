import { ReactNode, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  CaseOutcome,
  CaseOutcomesResponse,
  OutcomeCaseKind,
  OutcomeKind,
  deleteCaseOutcomeDraft,
  outcomeErrors,
  saveCaseOutcome,
} from "@/lib/crm/case-outcomes-api";
import { DocState, ErrorBox, OutcomeSheet, docStateOf } from "./parts";

// What every panel needs to know about the case it is recording on. Both
// the ADR and the litigation case satisfy it as they are.
export interface OutcomeCase {
  _id: string;
  ref: string;
  title: string;
  claimValue: number;
  currency: string;
  type?: string;
  venue?: string;
  court?: string;
  courtCaseNumber?: string | null;
  judge?: string;
  neutral?: string;
  parties: {
    _id: string;
    name: string;
    role: string;
    organisation?: string;
    email?: string;
  }[];
  sessions?: { date: string; status: string }[];
}

export type Form = Record<string, any>;

const FIRST_SIDE: Record<OutcomeCaseKind, string> = {
  adr: "Claimant",
  litigation: "Plaintiff",
};
const SECOND_SIDE: Record<OutcomeCaseKind, string> = {
  adr: "Respondent",
  litigation: "Defendant",
};

export const partyLabel = (p: { name: string; role: string }) =>
  `${p.name} (${p.role})`;

/** The two sides of the dispute, from the case's own parties. */
export function sidesOf(caseKind: OutcomeCaseKind, c: OutcomeCase) {
  const find = (role: string) =>
    c.parties.find((p) => p.role === role && p.name.trim());
  const a = find(FIRST_SIDE[caseKind]);
  const b = find(SECOND_SIDE[caseKind]);
  const options = [a, b].filter(Boolean).map((p) => partyLabel(p!));
  return {
    first: a ? partyLabel(a) : "",
    second: b ? partyLabel(b) : "",
    options: options.length ? options : c.parties.map((p) => partyLabel(p)),
  };
}

// ── The shell every panel sits in ──────────────────────────────────────

export interface ShellCtx<F extends Form> {
  form: F;
  set: (p: Partial<F>) => void;
  doc: DocState | null;
  setDoc: (d: DocState | null) => void;
  caseKind: OutcomeCaseKind;
  c: OutcomeCase;
}

export function OutcomeFormShell<F extends Form>({
  open,
  onClose,
  caseKind,
  c,
  kind,
  res,
  existing,
  title,
  subtitle,
  recordLabel,
  nav,
  buildInitial,
  validate,
  onSaved,
  children,
}: {
  open: boolean;
  onClose: () => void;
  caseKind: OutcomeCaseKind;
  c: OutcomeCase;
  kind: OutcomeKind;
  res: CaseOutcomesResponse | undefined;
  existing: CaseOutcome | undefined;
  title: string;
  subtitle: string;
  recordLabel: string;
  nav: { id: string; label: string }[];
  buildInitial: (saved: Form | null) => F;
  validate: (f: F) => string[];
  onSaved: () => void;
  children: (ctx: ShellCtx<F>) => ReactNode;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<F>(() =>
    buildInitial(existing?.form ?? null),
  );
  const [doc, setDocState] = useState<DocState | null>(docStateOf(existing));
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState<"draft" | "record" | "discard" | null>(null);

  // Start from the saved record (or fresh defaults) every time it opens.
  useEffect(() => {
    if (!open) return;
    setForm(buildInitial(existing?.form ?? null));
    setDocState(docStateOf(existing));
    setErrors([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (p: Partial<F>) => setForm((f) => ({ ...f, ...p }));
  const setDoc = (d: DocState | null) => {
    setDocState(d);
    setForm((f) => ({ ...f, documentId: d?.id ?? "" }));
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["caseOutcomes", caseKind, c._id] });
    onSaved();
  };
  const showErrors = (errs: string[]) => {
    setErrors(errs);
    setTimeout(
      () =>
        document
          .getElementById("outcome-errors")
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      50,
    );
  };

  const recorded = existing?.status === "Recorded";

  const saveDraft = async () => {
    setBusy("draft");
    try {
      await saveCaseOutcome(caseKind, c._id, kind, { status: "Draft", form });
      toast({
        title: "Draft saved",
        description: "You can finish recording later.",
      });
      refresh();
      onClose();
    } catch (err) {
      showErrors(outcomeErrors(err));
    } finally {
      setBusy(null);
    }
  };

  const record = async () => {
    const errs = validate(form);
    if (errs.length) return showErrors(errs);
    setErrors([]);
    setBusy("record");
    try {
      await saveCaseOutcome(caseKind, c._id, kind, {
        status: "Recorded",
        form,
      });
      toast({
        title: `${kind} ${recorded ? "updated" : "recorded"}`,
        description: form.remind ? "Reminders scheduled." : undefined,
      });
      refresh();
      onClose();
    } catch (err) {
      showErrors(outcomeErrors(err));
    } finally {
      setBusy(null);
    }
  };

  const discard = async () => {
    setBusy("discard");
    try {
      await deleteCaseOutcomeDraft(caseKind, c._id, kind);
      toast({ title: "Draft discarded" });
      refresh();
      onClose();
    } catch (err) {
      showErrors(outcomeErrors(err));
    } finally {
      setBusy(null);
    }
  };

  const ctx: ShellCtx<F> = { form, set, doc, setDoc, caseKind, c };
  const working = busy !== null;

  return (
    <OutcomeSheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      nav={nav}
      footer={
        <>
          <div className="flex gap-2">
            {!recorded && (
              <Button variant="outline" disabled={working} onClick={saveDraft}>
                {busy === "draft" && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                )}
                Save draft
              </Button>
            )}
            {existing?.status === "Draft" && (
              <Button
                variant="ghost"
                className="text-muted-foreground"
                disabled={working}
                onClick={discard}
              >
                Discard draft
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={working} onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={working} onClick={record}>
              {busy === "record" && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              {recorded ? "Save changes" : recordLabel}
            </Button>
          </div>
        </>
      }
    >
      {children(ctx)}
      <ErrorBox errors={errors} />
    </OutcomeSheet>
  );
}
