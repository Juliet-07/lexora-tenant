import { ReactNode, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Paperclip, Plus, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  CURRENCY_GROUPS,
  CaseOutcome,
  OutcomeCaseKind,
  OutcomeHead,
  OutcomePayment,
  currencyCodes,
  fmtNum,
  outcomeErrors,
  parseNum,
} from "@/lib/crm/case-outcomes-api";
import {
  fetchAdrDocuments,
  resolveAdrFileUrl,
  uploadAdrDocument,
} from "@/lib/crm/adr-api";
import {
  fetchLitigationDocuments,
  uploadLitigationDocument,
} from "@/lib/crm/litigation-api";

// ── Layout ─────────────────────────────────────────────────────────────

export function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-4 space-y-3">
      <h3 className="border-b pb-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
        {title}
        {note && (
          <span className="ml-1.5 font-normal normal-case tracking-normal text-muted-foreground">
            {note}
          </span>
        )}
      </h3>
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <Label className="text-xs">{label}</Label>}
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export const Grid = ({
  cols = 2,
  children,
}: {
  cols?: 2 | 3;
  children: ReactNode;
}) => (
  <div
    className={cn(
      "grid gap-3",
      cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
    )}
  >
    {children}
  </div>
);

export function Seg<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-md border bg-muted/40 p-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o)}
          className={cn(
            "flex-1 whitespace-nowrap rounded px-2.5 py-1.5 text-xs font-medium transition-colors",
            value === o
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 py-1 text-sm">
      <Checkbox
        className="mt-0.5"
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
      />
      <span>{children}</span>
    </label>
  );
}

export function Note({
  children,
  badge,
  tone = "muted",
}: {
  children: ReactNode;
  badge?: string;
  tone?: "ok" | "warn" | "muted";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm">
      <span>{children}</span>
      {badge && (
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            tone === "ok" && "bg-success/15 text-success",
            tone === "warn" && "bg-warning/15 text-warning",
            tone === "muted" && "bg-muted text-muted-foreground",
          )}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

export function ErrorBox({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <div
      id="outcome-errors"
      className="space-y-0.5 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
    >
      {errors.map((e) => (
        <p key={e}>• {e}</p>
      ))}
    </div>
  );
}

// ── Inputs ─────────────────────────────────────────────────────────────

type PickOption = string | { label: string; items: string[] };

/** A dropdown over plain strings, optionally grouped. */
export function Pick({
  value,
  onChange,
  options,
  placeholder = "Select",
  labels,
}: {
  value: string;
  onChange: (v: string) => void;
  options: PickOption[];
  placeholder?: string;
  labels?: Record<string, string>;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map((o) =>
          typeof o === "string" ? (
            <SelectItem key={o} value={o}>
              {labels?.[o] ?? o}
            </SelectItem>
          ) : (
            <SelectGroup key={o.label}>
              <SelectLabel>{o.label}</SelectLabel>
              {o.items.map((i) => (
                <SelectItem key={i} value={i}>
                  {i}
                </SelectItem>
              ))}
            </SelectGroup>
          ),
        )}
      </SelectContent>
    </Select>
  );
}

/** A number the user types with thousands separators; the value is a number. */
export function MoneyInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [text, setText] = useState<string | null>(null);
  return (
    <Input
      inputMode="decimal"
      disabled={disabled}
      placeholder={placeholder}
      value={text ?? (value ? fmtNum(value) : "")}
      onFocus={() => setText(value ? String(value) : "")}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseNum(e.target.value));
      }}
      onBlur={() => setText(null)}
    />
  );
}

export function CurrencyPick({
  value,
  onChange,
  caseCurrency,
}: {
  value: string;
  onChange: (v: string) => void;
  caseCurrency?: string;
}) {
  const known = new Set(
    CURRENCY_GROUPS.flatMap((g) => g.items.map(([c]) => c)),
  );
  const extra = currencyCodes(caseCurrency).filter((c) => !known.has(c));
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {extra.length > 0 && (
          <SelectGroup>
            <SelectLabel>This account</SelectLabel>
            {extra.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {CURRENCY_GROUPS.map((g) => (
          <SelectGroup key={g.label}>
            <SelectLabel>{g.label}</SelectLabel>
            {g.items.map(([c, n]) => (
              <SelectItem key={c} value={c}>
                {c} ({n})
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Tables ─────────────────────────────────────────────────────────────

export const PAYMENT_METHODS = [
  "Bank transfer",
  "Mobile money",
  "Cheque",
  "Payment into court",
  "In kind",
];

export function PaymentsTable({
  rows,
  currency,
  amount,
  singleOnly,
  onChange,
  addLabel = "Add instalment",
}: {
  rows: OutcomePayment[];
  currency: string;
  amount: number;
  singleOnly?: boolean;
  onChange: (rows: OutcomePayment[], manual: boolean) => void;
  addLabel?: string;
}) {
  const total = rows.reduce((s, r) => s + (r.amount || 0), 0);
  const balance = Math.round((amount - total) * 100) / 100;
  const patch = (i: number, p: Partial<OutcomePayment>, manual = true) =>
    onChange(
      rows.map((r, x) => (x === i ? { ...r, ...p } : r)),
      manual,
    );
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="w-8 px-2 py-2">#</th>
              <th className="px-2 py-2">Due date</th>
              <th className="px-2 py-2">Amount</th>
              <th className="px-2 py-2">Method</th>
              <th className="px-2 py-2">Status</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t align-middle">
                <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                <td className="px-1 py-1.5">
                  <Input
                    type="date"
                    value={r.dueOn}
                    onChange={(e) => patch(i, { dueOn: e.target.value })}
                  />
                </td>
                <td className="px-1 py-1.5">
                  <MoneyInput
                    value={r.amount}
                    onChange={(n) => patch(i, { amount: n })}
                  />
                </td>
                <td className="px-1 py-1.5">
                  <Pick
                    value={r.method}
                    onChange={(m) => patch(i, { method: m })}
                    options={PAYMENT_METHODS}
                  />
                </td>
                <td className="px-1 py-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      patch(i, { paid: !r.paid, paidOn: "" }, false)
                    }
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium",
                      r.paid
                        ? "border-success/40 bg-success/10 text-success"
                        : "text-muted-foreground",
                    )}
                  >
                    {r.paid ? "Paid" : "Pending"}
                  </button>
                </td>
                <td className="px-1">
                  {rows.length > 1 && (
                    <button
                      type="button"
                      title="Remove"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        onChange(
                          rows.filter((_, x) => x !== i),
                          true,
                        )
                      }
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs">
        {singleOnly ? (
          <span />
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            onClick={() =>
              onChange(
                [
                  ...rows,
                  {
                    dueOn: "",
                    amount: Math.max(balance, 0),
                    method: "Bank transfer",
                    paid: false,
                    paidOn: "",
                  },
                ],
                true,
              )
            }
          >
            <Plus className="h-3.5 w-3.5" /> {addLabel}
          </button>
        )}
        <span className={cn(balance !== 0 && "text-destructive")}>
          Total{" "}
          <b>
            {currency} {fmtNum(total)}
          </b>{" "}
          · Balance{" "}
          <b>
            {currency} {fmtNum(balance)}
          </b>
        </span>
      </div>
    </div>
  );
}

export function HeadsTable({
  rows,
  onChange,
  headLabel,
  addLabel,
  suggestions,
}: {
  rows: OutcomeHead[];
  onChange: (rows: OutcomeHead[]) => void;
  headLabel: string;
  addLabel: string;
  suggestions: string[];
}) {
  const patch = (i: number, p: Partial<OutcomeHead>) =>
    onChange(rows.map((r, x) => (x === i ? { ...r, ...p } : r)));
  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-2 py-2">{headLabel}</th>
              <th className="w-40 px-2 py-2">Amount</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="px-1 py-1.5">
                  <Input
                    value={r.label}
                    list="outcome-head-suggestions"
                    placeholder={suggestions[i] ?? "Other"}
                    onChange={(e) => patch(i, { label: e.target.value })}
                  />
                </td>
                <td className="px-1 py-1.5">
                  <MoneyInput
                    value={r.amount}
                    onChange={(n) => patch(i, { amount: n })}
                  />
                </td>
                <td className="px-1">
                  {rows.length > 1 && (
                    <button
                      type="button"
                      title="Remove"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => onChange(rows.filter((_, x) => x !== i))}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <datalist id="outcome-head-suggestions">
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        onClick={() => onChange([...rows, { label: "", amount: 0 }])}
      >
        <Plus className="h-3.5 w-3.5" /> {addLabel}
      </button>
    </div>
  );
}

// ── The attached / generated document ──────────────────────────────────

export interface DocState {
  id: string;
  name: string;
  url: string | null;
}

export const docStateOf = (o?: CaseOutcome | null): DocState | null =>
  o?.documentId
    ? {
        id: o.documentId,
        name: o.documentName,
        url: resolveAdrFileUrl(o.documentUrl),
      }
    : null;

export function DocumentField({
  caseKind,
  caseId,
  title,
  emptyText,
  doc,
  onChange,
  generate,
  generateLabel = "Generate",
}: {
  caseKind: OutcomeCaseKind;
  caseId: string;
  title: string;
  emptyText: string;
  doc: DocState | null;
  onChange: (d: DocState | null) => void;
  generate?: () => Promise<{ _id: string; name: string; fileUrl: string }>;
  generateLabel?: string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"gen" | "up" | null>(null);

  const { data: filed = [] } = useQuery({
    queryKey: ["outcomeCaseDocs", caseKind, caseId],
    queryFn: () =>
      caseKind === "adr"
        ? fetchAdrDocuments(caseId)
        : fetchLitigationDocuments(caseId),
  });

  const take = (d: { _id: string; name: string; fileUrl: string }) => {
    onChange({ id: d._id, name: d.name, url: resolveAdrFileUrl(d.fileUrl) });
    qc.invalidateQueries({ queryKey: ["outcomeCaseDocs", caseKind, caseId] });
    qc.invalidateQueries({
      queryKey: [
        caseKind === "adr" ? "adrDocuments" : "litigationDocuments",
        caseId,
      ],
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 rounded-md border border-dashed p-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-medium">{title}</p>
            {doc ? (
              <p className="truncate text-xs text-muted-foreground">
                {doc.url ? (
                  <a
                    className="text-primary hover:underline"
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {doc.name}
                  </a>
                ) : (
                  doc.name
                )}{" "}
                · filed in Documents
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{emptyText}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {generate && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy !== null}
              onClick={async () => {
                setBusy("gen");
                try {
                  take(await generate());
                  toast({ title: `${title} generated and filed in Documents` });
                } catch (err) {
                  toast({
                    title: "Could not generate the document",
                    description: outcomeErrors(err).join(" "),
                    variant: "destructive",
                  });
                } finally {
                  setBusy(null);
                }
              }}
            >
              {busy === "gen" && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              {doc ? "Regenerate" : generateLabel}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() => fileRef.current?.click()}
          >
            {busy === "up" ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Paperclip className="mr-1.5 h-3.5 w-3.5" />
            )}
            {doc ? "Replace" : "Attach"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setBusy("up");
              try {
                const d =
                  caseKind === "adr"
                    ? await uploadAdrDocument(caseId, "General", f)
                    : await uploadLitigationDocument(caseId, "General", f);
                take(d);
                toast({ title: "Document attached and filed in Documents" });
              } catch (err) {
                toast({
                  title: "Could not attach the file",
                  description: outcomeErrors(err).join(" "),
                  variant: "destructive",
                });
              } finally {
                setBusy(null);
              }
            }}
          />
        </div>
      </div>
      {filed.length > 0 && (
        <Field label="Or pick a document already filed on this case">
          <Pick
            value={doc?.id ?? ""}
            placeholder="Choose from Documents"
            onChange={(id) => {
              const d = filed.find((x: any) => x._id === id);
              if (d) take(d as any);
            }}
            options={filed.map((d: any) => d._id)}
            labels={Object.fromEntries(filed.map((d: any) => [d._id, d.name]))}
          />
        </Field>
      )}
    </div>
  );
}

// ── The sheet itself ───────────────────────────────────────────────────

export function OutcomeSheet({
  open,
  onClose,
  title,
  subtitle,
  nav,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  nav: { id: string; label: string }[];
  children: ReactNode;
  footer: ReactNode;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const go = (id: string) =>
    bodyRef.current
      ?.querySelector(`#${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[680px]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{subtitle}</SheetDescription>
        </SheetHeader>
        <nav className="flex gap-1 overflow-x-auto border-b bg-muted/30 px-4 py-1.5">
          {nav.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => go(n.id)}
              className="whitespace-nowrap rounded px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-background hover:text-foreground"
            >
              {n.label}
            </button>
          ))}
        </nav>
        <div
          ref={bodyRef}
          className="flex-1 space-y-7 overflow-y-auto px-5 py-5"
        >
          {children}
        </div>
        <div className="flex items-center justify-between gap-2 border-t bg-background px-5 py-3">
          {footer}
        </div>
      </SheetContent>
    </Sheet>
  );
}
