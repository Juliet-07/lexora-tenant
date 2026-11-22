import { ReactNode, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  CaseOutcome,
  CaseOutcomesResponse,
  OutcomeCaseKind,
  OutcomeKind,
  OutcomeShareInput,
  deleteCaseOutcomeDraft,
  outcomeErrors,
  saveCaseOutcome,
  shareCaseOutcome,
} from "@/lib/crm/case-outcomes-api";
import {
  Check,
  DocState,
  ErrorBox,
  Field,
  Grid,
  OutcomeSheet,
  Pick,
  Section,
  docStateOf,
} from "./parts";
import { cn } from "@/lib/utils";

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

// ── Share and send ─────────────────────────────────────────────────────

export interface ShareState {
  email: boolean;
  portal: boolean;
  file: boolean;
  recipients: Record<string, boolean>;
  extras: { email: string }[];
  docs: Record<string, boolean>;
  when: "record" | "now";
  subject: string;
  message: string;
  copyTeam: boolean;
  ack: boolean;
  comments: boolean;
  sent: string;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function initialShare(
  res: CaseOutcomesResponse | undefined,
  kind: OutcomeKind,
  c: OutcomeCase,
): ShareState {
  const o = res?.shareOptions?.[kind];
  return {
    email: false,
    portal: false,
    file: false,
    recipients: {},
    extras: [],
    docs: Object.fromEntries((o?.documents ?? []).map((d, i) => [d, i < 2])),
    when: "record",
    subject: `${o?.subject ?? kind}: ${c.title} (${c.ref})`,
    message: o?.message ?? "",
    copyTeam: true,
    ack: true,
    comments: false,
    sent: "",
  };
}

function ShareSection({
  kind,
  c,
  res,
  share,
  setShare,
  canSendNow,
  sending,
  onSendNow,
}: {
  kind: OutcomeKind;
  c: OutcomeCase;
  res: CaseOutcomesResponse | undefined;
  share: ShareState;
  setShare: (p: Partial<ShareState>) => void;
  canSendNow: boolean;
  sending: boolean;
  onSendNow: () => void;
}) {
  const opts = res?.shareOptions?.[kind];
  const [newEmail, setNewEmail] = useState("");
  const { toast } = useToast();

  // Everyone the tenant can reach from the case: its client, then each
  // party that has an email on file.
  const people = useMemo(() => {
    const list: { email: string; name: string; role: string }[] = [];
    if (res?.client?.email)
      list.push({
        email: res.client.email,
        name: res.client.name,
        role: "Client",
      });
    c.parties.forEach((p) => {
      if (p.email && !list.some((x) => x.email === p.email))
        list.push({ email: p.email, name: p.name, role: p.role });
    });
    return list;
  }, [res?.client, c.parties]);

  const chosen = (e: string) =>
    share.recipients[e] ?? people.find((p) => p.email === e)?.role === "Client";

  if (!opts) return null;
  const channels: {
    key: "email" | "portal" | "file";
    label: string;
    sub: string;
  }[] = [
    { key: "email", label: "Email", sub: "PDF attachments" },
    {
      key: "portal",
      label: "Client portal",
      sub: "Client views and downloads",
    },
    { key: "file", label: opts.fileLabel, sub: opts.fileHint },
  ];
  const any = share.email || share.portal || share.file;

  return (
    <Section id="o-share" title="Share and send" note="(optional)">
      <div className="grid gap-2 sm:grid-cols-3">
        {channels.map((ch) => (
          <label
            key={ch.key}
            className={cn(
              "flex cursor-pointer items-start gap-2 rounded-md border p-2.5 text-sm",
              share[ch.key] && "border-primary bg-primary/5",
            )}
          >
            <input
              type="checkbox"
              className="mt-1"
              checked={share[ch.key]}
              onChange={(e) => setShare({ [ch.key]: e.target.checked })}
            />
            <span>
              <span className="block font-medium">{ch.label}</span>
              <span className="block text-xs text-muted-foreground">
                {ch.sub}
              </span>
            </span>
          </label>
        ))}
      </div>

      {share.email && (
        <Field label="Recipients">
          <div className="space-y-1 rounded-md border p-2">
            {people.map((p) => (
              <Check
                key={p.email}
                checked={chosen(p.email)}
                onChange={(v) =>
                  setShare({
                    recipients: { ...share.recipients, [p.email]: v },
                  })
                }
              >
                {p.name}{" "}
                <span className="text-xs text-muted-foreground">
                  {p.email} · {p.role}
                </span>
              </Check>
            ))}
            {share.extras.map((x) => (
              <Check
                key={x.email}
                checked={chosen(x.email)}
                onChange={(v) =>
                  setShare({
                    recipients: { ...share.recipients, [x.email]: v },
                  })
                }
              >
                {x.email}{" "}
                <span className="text-xs text-muted-foreground">· Other</span>
              </Check>
            ))}
            {!people.length && !share.extras.length && (
              <p className="px-1 py-1 text-xs text-muted-foreground">
                No party on this case has an email on file. Add one below.
              </p>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <Input
              type="email"
              placeholder="Add another email address"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const v = newEmail.trim().toLowerCase();
                if (!EMAIL.test(v)) {
                  toast({
                    title: "Enter a valid email address",
                    variant: "destructive",
                  });
                  return;
                }
                if (
                  !people.some((p) => p.email === v) &&
                  !share.extras.some((x) => x.email === v)
                )
                  setShare({
                    extras: [...share.extras, { email: v }],
                    recipients: { ...share.recipients, [v]: true },
                  });
                setNewEmail("");
              }}
            >
              Add
            </Button>
          </div>
        </Field>
      )}

      {share.portal && (
        <Field label="Client portal">
          <div className="space-y-0.5 rounded-md border p-2">
            <p className="px-1 text-xs text-muted-foreground">
              Published to {res?.client?.name ?? "the client"}'s portal, visible
              to their authorised users.
            </p>
            <Check checked={share.ack} onChange={(v) => setShare({ ack: v })}>
              Ask the client to acknowledge receipt
            </Check>
            <Check
              checked={share.comments}
              onChange={(v) => setShare({ comments: v })}
            >
              Allow the client to comment
            </Check>
          </div>
        </Field>
      )}

      {any && (
        <>
          <Field label="Include">
            <div className="space-y-0.5 rounded-md border p-2">
              {opts.documents.map((d) => (
                <Check
                  key={d}
                  checked={!!share.docs[d]}
                  onChange={(v) =>
                    setShare({ docs: { ...share.docs, [d]: v } })
                  }
                >
                  {d}
                </Check>
              ))}
            </div>
          </Field>
          {share.email && (
            <>
              <Field label="Subject">
                <Input
                  value={share.subject}
                  onChange={(e) => setShare({ subject: e.target.value })}
                />
              </Field>
              <Field label="Message">
                <Textarea
                  rows={3}
                  value={share.message}
                  onChange={(e) => setShare({ message: e.target.value })}
                />
              </Field>
              <Check
                checked={share.copyTeam}
                onChange={(v) => setShare({ copyTeam: v })}
              >
                Copy me and the case team
              </Check>
            </>
          )}
          <Field label="When to send">
            <Pick
              value={
                share.when === "record"
                  ? "When I record"
                  : "Now, before recording"
              }
              onChange={(v) =>
                setShare({ when: v === "When I record" ? "record" : "now" })
              }
              options={["When I record", "Now, before recording"]}
            />
          </Field>
          {share.when === "now" && (
            <div className="flex items-center justify-end gap-3">
              {share.sent && (
                <span className="text-xs text-success">
                  ✓ Sent: {share.sent}
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canSendNow || sending}
                onClick={onSendNow}
              >
                {sending && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                Send now
              </Button>
            </div>
          )}
          {!canSendNow && share.when === "now" && (
            <p className="text-xs text-muted-foreground">
              Attach or generate the document first.
            </p>
          )}
        </>
      )}
    </Section>
  );
}

/** The share payload for the engine, or null when nothing is ticked. */
export function shareInput(
  share: ShareState,
  res: CaseOutcomesResponse | undefined,
  c: OutcomeCase,
): OutcomeShareInput | null {
  const channels = (["email", "portal", "file"] as const).filter(
    (k) => share[k],
  );
  if (!channels.length) return null;
  const emails = new Set<string>();
  if (res?.client?.email && (share.recipients[res.client.email] ?? true))
    emails.add(res.client.email);
  c.parties.forEach(
    (p) => p.email && share.recipients[p.email] && emails.add(p.email),
  );
  share.extras.forEach(
    (x) => share.recipients[x.email] !== false && emails.add(x.email),
  );
  return {
    channels,
    recipients: [...emails],
    documents: Object.keys(share.docs).filter((d) => share.docs[d]),
    subject: share.subject,
    message: share.message,
    copyTeam: share.copyTeam,
    acknowledgement: share.portal && share.ack,
    allowComments: share.portal && share.comments,
  };
}

export function shareErrors(
  share: ShareState,
  input: OutcomeShareInput | null,
): string[] {
  if (!input || share.when !== "record" || share.sent) return [];
  const errs: string[] = [];
  if (share.email && !input.recipients.length)
    errs.push("Select at least one email recipient, or untick Email.");
  if (!input.documents.length)
    errs.push("Select at least one document to send.");
  return errs;
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
  const [share, setShareState] = useState<ShareState>(() =>
    initialShare(res, kind, c),
  );
  const [busy, setBusy] = useState<
    "draft" | "record" | "send" | "discard" | null
  >(null);

  // Start from the saved record (or fresh defaults) every time it opens.
  useEffect(() => {
    if (!open) return;
    setForm(buildInitial(existing?.form ?? null));
    setDocState(docStateOf(existing));
    setErrors([]);
    setShareState(initialShare(res, kind, c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (p: Partial<F>) => setForm((f) => ({ ...f, ...p }));
  const setDoc = (d: DocState | null) => {
    setDocState(d);
    setForm((f) => ({ ...f, documentId: d?.id ?? "" }));
  };
  const setShare = (p: Partial<ShareState>) =>
    setShareState((s) => ({ ...s, ...p }));

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
  const input = shareInput(share, res, c);

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
    const errs = [...validate(form), ...shareErrors(share, input)];
    if (errs.length) return showErrors(errs);
    setErrors([]);
    setBusy("record");
    try {
      const out = await saveCaseOutcome(caseKind, c._id, kind, {
        status: "Recorded",
        form,
        share:
          input && share.when === "record" && !share.sent ? input : undefined,
      });
      toast({
        title: `${kind} ${recorded ? "updated" : "recorded"}`,
        description: out.share
          ? `Shared: ${out.share.text}`
          : form.remind
            ? "Reminders scheduled."
            : undefined,
      });
      if (out.shareError)
        toast({
          title: "Recorded, but not shared",
          description: out.shareError,
          variant: "destructive",
        });
      refresh();
      onClose();
    } catch (err) {
      showErrors(outcomeErrors(err));
    } finally {
      setBusy(null);
    }
  };

  const sendNow = async () => {
    if (!input) return;
    const errs = shareErrors({ ...share, when: "record", sent: "" }, input);
    if (errs.length) return showErrors(errs);
    setBusy("send");
    try {
      if (!recorded) {
        await saveCaseOutcome(caseKind, c._id, kind, { status: "Draft", form });
      }
      const out = await shareCaseOutcome(caseKind, c._id, kind, input);
      setShare({ sent: out.text });
      setErrors([]);
      toast({ title: "Sent", description: out.text });
      refresh();
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
      nav={[...nav, { id: "o-share", label: "Share" }]}
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
      <ShareSection
        kind={kind}
        c={c}
        res={res}
        share={share}
        setShare={setShare}
        canSendNow={!!doc}
        sending={busy === "send"}
        onSendNow={sendNow}
      />
      <ErrorBox errors={errors} />
    </OutcomeSheet>
  );
}
