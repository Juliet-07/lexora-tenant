import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Circle,
  FileText,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchDealContractDraft,
  fetchDealContractTemplates,
  generateDealContract,
  type DealContractTemplate,
  type DealTemplateField,
} from "@/lib/grc/deal-contracts-api";
import type { Deal } from "@/lib/grc/deals-api";

const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "NGN",
  "GHS",
  "KES",
  "ZAR",
  "RWF",
  "UGX",
  "TZS",
  "XOF",
  "XAF",
  "CAD",
  "AUD",
  "AED",
  "INR",
];

// Which deal tab to point at when a field the deal should supply is empty.
function whereToFill(token: string): string {
  if (token.startsWith("termSheet")) return "the Term Sheet tab";
  if (/^(buyer|seller)/.test(token) || token === "partiesList")
    return "the deal's parties (Overview tab)";
  if (token.startsWith("signing") || token === "signatoriesList")
    return "the Signing tab";
  return "the deal's details";
}

// Fields the form itself supplies, and what feeds each.
function formHasValue(
  token: string,
  f: {
    title: string;
    counterparty: string;
    email: string;
    value: string;
    currency: string;
    expiresOn: string;
    scope: string;
  },
): boolean {
  switch (token) {
    case "title":
      return !!f.title.trim();
    case "counterpartyName":
    case "recipientName":
      return !!f.counterparty.trim();
    case "recipientEmail":
      return !!f.email.trim();
    case "contractValue":
      return f.value.trim() !== "";
    case "contractCurrency":
      return !!f.currency;
    case "expiryDate":
      return !!f.expiresOn;
    case "scopeOfWork":
      return !!f.scope.trim();
    default:
      return false;
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function GenerateDealContractDialog({
  deal,
  open,
  onOpenChange,
  canOpenContractManagement,
}: {
  deal: Deal;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** The workspace has the CRM module, so the new contract can be opened. */
  canOpenContractManagement: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [template, setTemplate] = useState<DealContractTemplate | null>(null);
  const [search, setSearch] = useState("");

  const [title, setTitle] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [email, setEmail] = useState("");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [expiresOn, setExpiresOn] = useState("");
  const [scope, setScope] = useState("");

  // Reset whenever the dialog is (re)opened.
  useEffect(() => {
    if (open) {
      setTemplate(null);
      setSearch("");
      setScope("");
    }
  }, [open]);

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["deal-contract-templates", deal._id],
    queryFn: () => fetchDealContractTemplates(deal._id),
    enabled: open,
  });

  const { data: draft, isLoading: loadingDraft } = useQuery({
    queryKey: ["deal-contract-draft", deal._id, template?._id ?? null],
    queryFn: () => fetchDealContractDraft(deal._id, template?._id),
    enabled: open && !!template,
  });

  // Seed the form from what the deal suggests, once per template.
  useEffect(() => {
    if (!draft || !template) return;
    setTitle(draft.suggested.title);
    setValue(draft.suggested.value ? String(draft.suggested.value) : "");
    setCurrency(draft.suggested.currency || "USD");
    setExpiresOn(draft.suggested.expiresOn || "");
    // With exactly one party on the deal there is nobody else to pick.
    if (draft.parties.length === 1) {
      setCounterparty(draft.parties[0].name);
      setEmail(draft.parties[0].email);
    } else {
      setCounterparty("");
      setEmail("");
    }
  }, [draft, template]);

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) =>
      [t.title, t.description, t.jurisdiction, t.category].some((x) =>
        (x ?? "").toLowerCase().includes(q),
      ),
    );
  }, [templates, search]);

  const form = {
    title,
    counterparty,
    email,
    value,
    currency,
    expiresOn,
    scope,
  };

  // ── Field readiness ──────────────────────────────────────────
  const fields = draft?.fields ?? [];
  const classified = useMemo(() => {
    const ready: DealTemplateField[] = [];
    const needsDeal: DealTemplateField[] = [];
    const needsForm: DealTemplateField[] = [];
    const cannot: DealTemplateField[] = [];
    for (const f of fields) {
      if (f.source === "auto") ready.push(f);
      else if (f.source === "deal") (f.filled ? ready : needsDeal).push(f);
      else if (f.source === "form")
        (formHasValue(f.token, form) ? ready : needsForm).push(f);
      else cannot.push(f);
    }
    return { ready, needsDeal, needsForm, cannot };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, title, counterparty, email, value, currency, expiresOn, scope]);

  const total = fields.length;
  const readyPct = total
    ? Math.round((classified.ready.length / total) * 100)
    : 100;
  const usesScope = fields.some((f) => f.token === "scopeOfWork");

  const emailOk = EMAIL.test(email.trim());
  const canSubmit =
    !!template &&
    !!title.trim() &&
    !!counterparty.trim() &&
    emailOk &&
    !!expiresOn;

  const generateMut = useMutation({
    mutationFn: () =>
      generateDealContract(deal._id, {
        templateId: template!._id,
        title: title.trim(),
        counterparty: counterparty.trim(),
        counterpartyEmail: email.trim(),
        value: value.trim() === "" ? undefined : Number(value),
        currency,
        scopeOfWork: scope.trim() || undefined,
        expiresOn,
      }),
    onSuccess: (c) => {
      queryClient.invalidateQueries({
        queryKey: ["deal-template-contracts", deal._id],
      });
      onOpenChange(false);
      toast.success(`Contract ${c.ref} created from the template`);
      if (canOpenContractManagement) navigate(`/crm/contracts/${c._id}`);
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ?? "Failed to generate the contract",
      ),
  });

  const pickParty = (i: string) => {
    const p = draft?.parties[Number(i)];
    if (p) {
      setCounterparty(p.name);
      setEmail(p.email);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[88vh] max-w-5xl flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Generate contract from a template
          </DialogTitle>
          <DialogDescription>
            {template
              ? `${deal.name} — the deal's details fill the template for you. You can finish any gaps in Contract Management afterwards.`
              : "Pick a template. It is filled in from this deal and then managed in Contract Management."}
          </DialogDescription>
        </DialogHeader>

        {/* ── Step 1 — choose a template ── */}
        {!template && (
          <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 py-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates…"
                className="pl-8"
              />
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {loadingTemplates &&
                [0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}
              {!loadingTemplates &&
                filteredTemplates.map((t) => (
                  <button
                    key={t._id}
                    onClick={() => setTemplate(t)}
                    className="flex w-full items-start gap-3 rounded-lg border p-4 text-left transition hover:border-primary hover:bg-muted/40"
                  >
                    <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{t.title}</span>
                        <Badge variant="outline">{t.category}</Badge>
                        {t.jurisdiction && (
                          <Badge variant="secondary">{t.jurisdiction}</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          v{t.version}
                        </span>
                      </div>
                      {t.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t.description}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Uses{" "}
                        {
                          new Set(
                            Array.from(
                              t.content.matchAll(/\{\{(\w+)\}\}/g),
                              (m) => m[1],
                            ),
                          ).size
                        }{" "}
                        merge fields
                      </p>
                    </div>
                  </button>
                ))}
              {!loadingTemplates && !templates.length && (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No deal-contract templates have been published yet. Ask your
                  platform administrator to publish one under <b>GRC → Deals</b>{" "}
                  in Contract Templates.
                </div>
              )}
              {!loadingTemplates &&
                !!templates.length &&
                !filteredTemplates.length && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No templates match “{search}”.
                  </p>
                )}
            </div>
          </div>
        )}

        {/* ── Step 2 — details + readiness ── */}
        {template && (
          <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-[1fr_320px]">
            <div className="min-h-0 space-y-4 overflow-y-auto px-6 py-4">
              <button
                onClick={() => setTemplate(null)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Choose a different
                template
              </button>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm font-medium">{template.title}</p>
                <p className="text-xs text-muted-foreground">
                  {template.category}
                  {template.jurisdiction ? ` · ${template.jurisdiction}` : ""} ·
                  v{template.version}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dc-title">Contract title</Label>
                <Input
                  id="dc-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label>Who is it with, and who signs?</Label>
                  {!!draft?.parties.length && (
                    <Select onValueChange={pickParty}>
                      <SelectTrigger className="h-8 w-[240px] text-xs">
                        <SelectValue placeholder="Fill from a deal party…" />
                      </SelectTrigger>
                      <SelectContent>
                        {draft.parties.map((p, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {p.name} — {p.side}
                            {p.title ? ` · ${p.title}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="dc-cp" className="text-xs">
                      Name
                    </Label>
                    <Input
                      id="dc-cp"
                      value={counterparty}
                      onChange={(e) => setCounterparty(e.target.value)}
                      placeholder="Full name or company"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dc-email" className="text-xs">
                      Email (the signing link is sent here)
                    </Label>
                    <Input
                      id="dc-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                    />
                    {!!email && !emailOk && (
                      <p className="text-[11px] text-destructive">
                        That doesn't look like a valid email address.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="dc-value">Contract value</Label>
                  <Input
                    id="dc-value"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) =>
                      setValue(e.target.value.replace(/[^0-9.]/g, ""))
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(CURRENCIES.includes(currency)
                        ? CURRENCIES
                        : [currency, ...CURRENCIES]
                      ).map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dc-exp">Expires on</Label>
                  <Input
                    id="dc-exp"
                    type="date"
                    value={expiresOn}
                    onChange={(e) => setExpiresOn(e.target.value)}
                  />
                </div>
              </div>
              <p className="-mt-2 text-[11px] text-muted-foreground">
                Value and currency start from the deal; expiry starts at the
                deal's longstop date.
              </p>

              {usesScope && (
                <div className="space-y-1.5">
                  <Label htmlFor="dc-scope">
                    Scope of work{" "}
                    <span className="font-normal text-muted-foreground">
                      — one item per line, becomes a numbered list
                    </span>
                  </Label>
                  <Textarea
                    id="dc-scope"
                    rows={4}
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Readiness */}
            <aside className="min-h-0 space-y-3 overflow-y-auto border-l bg-muted/20 px-4 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Fields in this template
                </p>
                {loadingDraft ? (
                  <Skeleton className="mt-2 h-10" />
                ) : (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        <b>{classified.ready.length}</b> of {total} ready
                      </span>
                      <span className="text-muted-foreground">{readyPct}%</span>
                    </div>
                    <Progress value={readyPct} className="h-1.5" />
                  </div>
                )}
              </div>

              {!loadingDraft && (
                <>
                  {classified.needsForm.length > 0 && (
                    <FieldGroup
                      tone="warn"
                      title="Complete in this form"
                      items={classified.needsForm}
                      note={() => "needs a value above"}
                    />
                  )}
                  {classified.needsDeal.length > 0 && (
                    <FieldGroup
                      tone="warn"
                      title="The deal has no value yet"
                      items={classified.needsDeal}
                      note={(f) => `add it in ${whereToFill(f.token)}`}
                    />
                  )}
                  {classified.cannot.length > 0 && (
                    <FieldGroup
                      tone="bad"
                      title="Can't be filled on a deal contract"
                      items={classified.cannot}
                      note={(f) =>
                        f.source === "unknown"
                          ? "not a recognised field — stays as text"
                          : "belongs to another module's contracts"
                      }
                    />
                  )}
                  {classified.ready.length > 0 && (
                    <FieldGroup
                      tone="ok"
                      title="Ready"
                      items={classified.ready}
                      note={(f) =>
                        f.source === "deal"
                          ? f.value.length > 36
                            ? `${f.value.slice(0, 36)}…`
                            : f.value.replace(/<[^>]*>/g, "")
                          : f.source === "auto"
                            ? "filled automatically"
                            : "from this form"
                      }
                    />
                  )}
                  {!total && (
                    <p className="text-xs text-muted-foreground">
                      This template has no merge fields, so it will be used as
                      written.
                    </p>
                  )}
                </>
              )}
            </aside>
          </div>
        )}

        <DialogFooter className="shrink-0 items-center border-t px-6 py-3 sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {template
              ? canOpenContractManagement
                ? "You'll land in Contract Management to review, send for signature and negotiate."
                : "Contract Management isn't enabled for this workspace — the contract will be listed on this deal."
              : ""}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={!canSubmit || generateMut.isPending}
              onClick={() => generateMut.mutate()}
            >
              {generateMut.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Generate contract
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldGroup({
  tone,
  title,
  items,
  note,
}: {
  tone: "ok" | "warn" | "bad";
  title: string;
  items: DealTemplateField[];
  note: (f: DealTemplateField) => string;
}) {
  const Icon =
    tone === "ok" ? CheckCircle2 : tone === "warn" ? Circle : AlertTriangle;
  const color =
    tone === "ok"
      ? "text-success"
      : tone === "warn"
        ? "text-warning"
        : "text-destructive";
  return (
    <div className="space-y-1.5">
      <p className={`text-xs font-semibold ${color}`}>
        {title} ({items.length})
      </p>
      <ul className="space-y-1">
        {items.map((f) => (
          <li key={f.token} className="flex items-start gap-1.5 text-xs">
            <Icon className={`mt-0.5 h-3 w-3 shrink-0 ${color}`} />
            <span className="min-w-0">
              <span className="font-medium">{f.label}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {note(f)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
