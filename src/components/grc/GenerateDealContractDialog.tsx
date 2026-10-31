import { useEffect, useMemo, useState } from "react";
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
  type ContractPartyInput,
  type DealContractDraft,
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

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface PartyForm {
  name: string;
  email: string;
  address: string;
  representative: string;
  representativeTitle: string;
}
const emptyParty = (): PartyForm => ({
  name: "",
  email: "",
  address: "",
  representative: "",
  representativeTitle: "",
});

// Which deal tab to point at when a field the deal should supply is empty.
function whereToFill(token: string): string {
  if (token.startsWith("termSheet")) return "the Term Sheet tab";
  if (/^(buyer|seller)/.test(token) || token === "partiesList")
    return "the deal's parties (Overview tab)";
  if (token.startsWith("signing") || token === "signatoriesList")
    return "the Signing tab";
  if (token.startsWith("tenantCompany") || token === "tenantRegisteredAddress")
    return "your company profile";
  return "the deal's details";
}

const partyValue = (p: PartyForm | null, key: keyof PartyForm) =>
  (p?.[key] ?? "").trim();

interface FormState {
  title: string;
  partyA: PartyForm | null; // null = our own company
  partyB: PartyForm;
  value: string;
  currency: string;
  governingLaw: string;
  effectiveDate: string;
  expiresOn: string;
  scope: string;
}

// Does the form itself supply this field? (Fields that come from the form.)
function formHasValue(token: string, f: FormState): boolean {
  switch (token) {
    case "title":
      return !!f.title.trim();
    case "partyBName":
    case "counterpartyName":
    case "recipientName":
      return !!partyValue(f.partyB, "name");
    case "partyBEmail":
    case "recipientEmail":
      return !!partyValue(f.partyB, "email");
    case "partyBAddress":
    case "clientRegisteredAddress":
      return !!partyValue(f.partyB, "address");
    case "partyBRepresentative":
    case "clientRepresentativeName":
      return !!partyValue(f.partyB, "representative");
    case "partyBRepresentativeTitle":
    case "clientRepresentativeTitle":
      return !!partyValue(f.partyB, "representativeTitle");
    case "partyARepresentative":
    case "leadProfessionalName":
      return !!partyValue(f.partyA, "representative");
    case "partyARepresentativeTitle":
    case "leadProfessionalTitle":
      return !!partyValue(f.partyA, "representativeTitle");
    case "contractValue":
      return f.value.trim() !== "";
    case "contractCurrency":
      return !!f.currency;
    case "governingLaw":
      return !!f.governingLaw.trim();
    case "expiryDate":
      return !!f.expiresOn;
    case "scopeOfWork":
      return !!f.scope.trim();
    default:
      return false;
  }
}

const toPartyInput = (p: PartyForm): ContractPartyInput => ({
  name: p.name.trim(),
  email: p.email.trim() || undefined,
  address: p.address.trim() || undefined,
  representative: p.representative.trim() || undefined,
  representativeTitle: p.representativeTitle.trim() || undefined,
});

export function GenerateDealContractDialog({
  deal,
  open,
  onOpenChange,
  onGenerated,
}: {
  deal: Deal;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Called with the new contract's id so the caller can open it. */
  onGenerated: (contractId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [template, setTemplate] = useState<DealContractTemplate | null>(null);
  const [search, setSearch] = useState("");

  const [title, setTitle] = useState("");
  const [partyA, setPartyA] = useState<PartyForm | null>(null);
  const [partyB, setPartyB] = useState<PartyForm>(emptyParty());
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [governingLaw, setGoverningLaw] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [scope, setScope] = useState("");

  // Reset whenever the dialog is (re)opened.
  useEffect(() => {
    if (open) {
      setTemplate(null);
      setSearch("");
      setScope("");
      setPartyA(null);
      setEffectiveDate("");
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
    setGoverningLaw(draft.suggested.governingLaw || "");
    setExpiresOn(draft.suggested.expiresOn || "");
    // With exactly one party on the deal there is nobody else to pick.
    if (draft.parties.length === 1) {
      const p = draft.parties[0];
      setPartyB({ ...emptyParty(), name: p.name, email: p.email });
    } else {
      setPartyB(emptyParty());
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

  const form: FormState = {
    title,
    partyA,
    partyB,
    value,
    currency,
    governingLaw,
    effectiveDate,
    expiresOn,
    scope,
  };

  // ── Field readiness ──────────────────────────────────────────
  const fields = draft?.fields ?? [];
  const classified = useMemo(() => {
    const ready: DealTemplateField[] = [];
    const needsForm: DealTemplateField[] = [];
    const needsDeal: DealTemplateField[] = [];
    const later: DealTemplateField[] = [];
    const unknown: DealTemplateField[] = [];
    for (const f of fields) {
      if (f.source === "unknown") unknown.push(f);
      else if (f.source === "clause") later.push(f);
      else if (formHasValue(f.token, form) || f.filled) ready.push(f);
      else if (f.source === "deal") needsDeal.push(f);
      else needsForm.push(f);
    }
    return { ready, needsForm, needsDeal, later, unknown };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fields,
    title,
    partyA,
    partyB,
    value,
    currency,
    governingLaw,
    expiresOn,
    scope,
  ]);

  const total = fields.length;
  const readyPct = total
    ? Math.round((classified.ready.length / total) * 100)
    : 100;
  const usesScope = fields.some((f) => f.token === "scopeOfWork");

  const emailBad = !!partyB.email.trim() && !EMAIL.test(partyB.email.trim());
  const canSubmit =
    !!template && !!title.trim() && !!partyB.name.trim() && !emailBad;

  const generateMut = useMutation({
    mutationFn: () =>
      generateDealContract(deal._id, {
        templateId: template!._id,
        title: title.trim(),
        partyA: partyA?.name.trim() ? toPartyInput(partyA) : undefined,
        partyB: toPartyInput(partyB),
        value: value.trim() === "" ? undefined : Number(value),
        currency,
        governingLaw: governingLaw.trim() || undefined,
        scopeOfWork: scope.trim() || undefined,
        effectiveDate: effectiveDate || undefined,
        expiresOn: expiresOn || undefined,
      }),
    onSuccess: async ({ contractId }) => {
      // Wait for the deal to reload so the new contract is there to open.
      await queryClient.invalidateQueries({ queryKey: ["deal", deal._id] });
      onOpenChange(false);
      toast.success("Contract created from the template");
      onGenerated(contractId);
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ?? "Failed to generate the contract",
      ),
  });

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
              ? `${deal.name} — the deal and your company profile fill the template for you. Anything left over can be completed in the contract's Fields tab.`
              : "Pick a template. It is filled in from this deal and opens here, ready to review, edit and send."}
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

              <PartyBlock
                label="Party A"
                hint="Your company by default"
                draft={draft}
                value={partyA}
                onChange={setPartyA}
                usOption
              />
              <PartyBlock
                label="Party B"
                hint="The other side of the contract"
                draft={draft}
                value={partyB}
                onChange={(p) => setPartyB(p ?? emptyParty())}
                emailError={emailBad}
              />

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
                  <Label htmlFor="dc-law">Governing law</Label>
                  <Input
                    id="dc-law"
                    value={governingLaw}
                    onChange={(e) => setGoverningLaw(e.target.value)}
                    placeholder="e.g. Rwanda"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="dc-eff">
                    Effective date{" "}
                    <span className="font-normal text-muted-foreground">
                      — today if left empty
                    </span>
                  </Label>
                  <Input
                    id="dc-eff"
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dc-exp">Expiry date</Label>
                  <Input
                    id="dc-exp"
                    type="date"
                    value={expiresOn}
                    onChange={(e) => setExpiresOn(e.target.value)}
                  />
                </div>
              </div>
              <p className="-mt-2 text-[11px] text-muted-foreground">
                Value, currency, governing law and expiry start from the deal
                (jurisdiction and longstop date).
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
                      note={() => "needs a value on the left"}
                    />
                  )}
                  {classified.needsDeal.length > 0 && (
                    <FieldGroup
                      tone="warn"
                      title="Not on the deal yet"
                      items={classified.needsDeal}
                      note={(f) => `add it in ${whereToFill(f.token)}`}
                    />
                  )}
                  {classified.later.length > 0 && (
                    <FieldGroup
                      tone="warn"
                      title="Complete on the contract"
                      items={classified.later}
                      note={() => "a detail of the clause itself"}
                    />
                  )}
                  {classified.unknown.length > 0 && (
                    <FieldGroup
                      tone="bad"
                      title="Not recognised"
                      items={classified.unknown}
                      note={() => "not a known field — stays as text"}
                    />
                  )}
                  {classified.ready.length > 0 && (
                    <FieldGroup
                      tone="ok"
                      title="Ready"
                      items={classified.ready}
                      note={(f) => {
                        const v = f.value.replace(/<[^>]*>/g, "");
                        return v
                          ? v.length > 36
                            ? `${v.slice(0, 36)}…`
                            : v
                          : "from this form";
                      }}
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
              ? "The contract opens here, where you can edit it, redline it and send it for review."
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

// One side of the contract. Party A (usOption) is our own company until
// someone else is chosen; Party B is always filled in. Either can be
// filled from a party on the deal.
function PartyBlock({
  label,
  hint,
  draft,
  value,
  onChange,
  usOption,
  emailError,
}: {
  label: string;
  hint: string;
  draft: DealContractDraft | undefined;
  value: PartyForm | null;
  onChange: (p: PartyForm | null) => void;
  usOption?: boolean;
  emailError?: boolean;
}) {
  const us = usOption && value === null;
  const set = (patch: Partial<PartyForm>) =>
    onChange({ ...(value ?? emptyParty()), ...patch });
  const pick = (v: string) => {
    if (v === "us") return onChange(null);
    if (v === "other") return onChange(emptyParty());
    const p = draft?.parties[Number(v)];
    if (p) onChange({ ...emptyParty(), name: p.name, email: p.email });
  };

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <Label>
          {label}{" "}
          <span className="font-normal text-muted-foreground">— {hint}</span>
        </Label>
        <Select onValueChange={pick} value={us ? "us" : undefined}>
          <SelectTrigger className="h-8 w-[240px] text-xs">
            <SelectValue placeholder="Fill from a deal party…" />
          </SelectTrigger>
          <SelectContent>
            {usOption && (
              <SelectItem value="us">
                Our company{draft ? ` — ${draft.ourCompany.name}` : ""}
              </SelectItem>
            )}
            {(draft?.parties ?? []).map((p, i) => (
              <SelectItem key={i} value={String(i)}>
                {p.name} — {p.side}
                {p.title ? ` · ${p.title}` : ""}
              </SelectItem>
            ))}
            <SelectItem value="other">Someone else…</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {us ? (
        <p className="text-xs text-muted-foreground">
          {draft?.ourCompany.name ?? "Your company"}
          {draft?.ourCompany.representative
            ? ` · signed by ${draft.ourCompany.representative}${
                draft.ourCompany.representativeTitle
                  ? `, ${draft.ourCompany.representativeTitle}`
                  : ""
              }`
            : ""}{" "}
          — taken from your company profile.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input
              value={value?.name ?? ""}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="Company or full name"
              aria-label={`${label} name`}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input
              type="email"
              value={value?.email ?? ""}
              onChange={(e) => set({ email: e.target.value })}
              placeholder="name@company.com"
              aria-label={`${label} email`}
            />
            {emailError && (
              <p className="text-[11px] text-destructive">
                That doesn't look like a valid email address.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Signatory</Label>
            <Input
              value={value?.representative ?? ""}
              onChange={(e) => set({ representative: e.target.value })}
              placeholder="Who signs"
              aria-label={`${label} signatory`}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Signatory title</Label>
            <Input
              value={value?.representativeTitle ?? ""}
              onChange={(e) => set({ representativeTitle: e.target.value })}
              placeholder="e.g. Managing Director"
              aria-label={`${label} signatory title`}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Address</Label>
            <Input
              value={value?.address ?? ""}
              onChange={(e) => set({ address: e.target.value })}
              placeholder="Registered address"
              aria-label={`${label} address`}
            />
          </div>
        </div>
      )}
    </div>
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
