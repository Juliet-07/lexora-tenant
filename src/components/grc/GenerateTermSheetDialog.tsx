import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Circle,
  FileSignature,
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
  fetchTermSheetDraft,
  fetchTermSheetTemplates,
  generateTermSheet,
  type DealContractTemplate,
  type DealTemplateField,
  type TermSheetDraft,
  type TermSheetPartyInput,
} from "@/lib/grc/deal-contracts-api";
import type { Deal } from "@/lib/grc/deals-api";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type PartyForm = Required<TermSheetPartyInput>;
const emptyParty = (): PartyForm => ({
  name: "",
  entityType: "",
  jurisdiction: "",
  registrationNumber: "",
  address: "",
  email: "",
  signatory: "",
  signatoryTitle: "",
});
const fromDraft = (p?: TermSheetPartyInput): PartyForm => ({
  ...emptyParty(),
  ...Object.fromEntries(
    Object.entries(p ?? {}).filter(([, v]) => typeof v === "string"),
  ),
});

// Which party property a merge field stands for (partyAEntityType → A, …).
const PARTY_TOKENS: Record<string, keyof PartyForm> = {
  Name: "name",
  EntityType: "entityType",
  Jurisdiction: "jurisdiction",
  RegistrationNumber: "registrationNumber",
  Address: "address",
  Email: "email",
  Signatory: "signatory",
  Title: "signatoryTitle",
  NoticePerson: "signatory",
  NoticeAddress: "address",
};

// Where to point the person when the deal should have supplied a value.
function whereToFill(token: string): string {
  if (token === "cpLongstopDate") return "the deal's longstop date";
  if (token === "governingJurisdiction") return "the deal's jurisdiction";
  if (token.startsWith("tenantCompany") || token === "tenantRegisteredAddress")
    return "your company profile";
  return "the deal's details";
}

interface FormState {
  title: string;
  governingLaw: string;
  effectiveDate: string;
  partyA: PartyForm;
  partyB: PartyForm;
}

// Does this form itself supply the field?
function formHasValue(token: string, f: FormState): boolean {
  if (token === "title") return !!f.title.trim();
  if (token === "governingLaw") return !!f.governingLaw.trim();
  const m = /^party([AB])(\w+)$/.exec(token);
  if (m) {
    const key = PARTY_TOKENS[m[2]];
    if (key) return !!(m[1] === "A" ? f.partyA : f.partyB)[key].trim();
  }
  return false;
}

const toPartyInput = (p: PartyForm): TermSheetPartyInput => ({
  name: p.name.trim(),
  entityType: p.entityType.trim() || undefined,
  jurisdiction: p.jurisdiction.trim() || undefined,
  registrationNumber: p.registrationNumber.trim() || undefined,
  address: p.address.trim() || undefined,
  email: p.email.trim() || undefined,
  signatory: p.signatory.trim() || undefined,
  signatoryTitle: p.signatoryTitle.trim() || undefined,
});

export function GenerateTermSheetDialog({
  deal,
  open,
  onOpenChange,
  onGenerated,
}: {
  deal: Deal;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Called with the new term sheet's id so the caller can open it. */
  onGenerated: (termSheetId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [template, setTemplate] = useState<DealContractTemplate | null>(null);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [governingLaw, setGoverningLaw] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [partyA, setPartyA] = useState<PartyForm>(emptyParty());
  const [partyB, setPartyB] = useState<PartyForm>(emptyParty());

  useEffect(() => {
    if (open) {
      setTemplate(null);
      setSearch("");
    }
  }, [open]);

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["term-sheet-templates", deal._id],
    queryFn: () => fetchTermSheetTemplates(deal._id),
    enabled: open,
  });

  const { data: draft, isLoading: loadingDraft } = useQuery({
    queryKey: ["term-sheet-draft", deal._id, template?._id ?? null],
    queryFn: () => fetchTermSheetDraft(deal._id, template?._id),
    enabled: open && !!template,
  });

  // Seed the form from what the deal already knows, once per template.
  useEffect(() => {
    if (!draft || !template) return;
    setTitle(draft.suggested.title);
    setGoverningLaw(draft.suggested.governingLaw || "");
    setEffectiveDate(draft.suggested.effectiveDate || "");
    setPartyA(fromDraft(draft.partyA));
    setPartyB(fromDraft(draft.partyB));
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
    governingLaw,
    effectiveDate,
    partyA,
    partyB,
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
  }, [fields, title, governingLaw, partyA, partyB]);

  const total = fields.length;
  // Clause-level terms are expected to be completed on the document, so the
  // bar measures only what this form (and the deal) is responsible for.
  const upfront = total - classified.later.length - classified.unknown.length;
  const readyPct = upfront
    ? Math.round((classified.ready.length / upfront) * 100)
    : 100;

  const emailBad = (p: PartyForm) =>
    !!p.email.trim() && !EMAIL.test(p.email.trim());
  const canSubmit =
    !!template &&
    !!title.trim() &&
    !!partyA.name.trim() &&
    !!partyB.name.trim() &&
    !emailBad(partyA) &&
    !emailBad(partyB);

  const generateMut = useMutation({
    mutationFn: () =>
      generateTermSheet(deal._id, {
        templateId: template!._id,
        title: title.trim(),
        partyA: toPartyInput(partyA),
        partyB: toPartyInput(partyB),
        governingLaw: governingLaw.trim() || undefined,
        effectiveDate: effectiveDate || undefined,
      }),
    onSuccess: async ({ termSheetId }) => {
      // Wait for the deal to reload so the new term sheet is there to open.
      await queryClient.invalidateQueries({ queryKey: ["deal", deal._id] });
      onOpenChange(false);
      toast.success("Term sheet created from the template");
      onGenerated(termSheetId);
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ?? "Failed to generate the term sheet",
      ),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[88vh] max-w-5xl flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Generate term sheet from a template
          </DialogTitle>
          <DialogDescription>
            {template
              ? `${deal.name} — the deal and your company profile fill the template for you. The commercial terms are completed on the term sheet itself.`
              : "Pick a term sheet template. It is filled in from this deal and opens here, ready to complete, review and send to the parties."}
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
                placeholder="Search term sheet templates…"
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
                    <FileSignature className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
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
                  No term sheet templates have been published yet. Ask your
                  platform administrator to publish one under{" "}
                  <b>GRC → Term sheets</b> in Contract Templates.
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

        {/* ── Step 2 — parties + readiness ── */}
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
                <Label htmlFor="ts-title">Term sheet title</Label>
                <Input
                  id="ts-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <PartyBlock
                label="First Party"
                hint="Party A — the deal's client by default"
                draft={draft}
                value={partyA}
                onChange={setPartyA}
                emailError={emailBad(partyA)}
              />
              <PartyBlock
                label="Second Party"
                hint="Party B — the deal's counterparty by default"
                draft={draft}
                value={partyB}
                onChange={setPartyB}
                emailError={emailBad(partyB)}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ts-law">Governing law</Label>
                  <Input
                    id="ts-law"
                    value={governingLaw}
                    onChange={(e) => setGoverningLaw(e.target.value)}
                    placeholder="e.g. Rwanda"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ts-eff">
                    Effective date{" "}
                    <span className="font-normal text-muted-foreground">
                      — today if left empty
                    </span>
                  </Label>
                  <Input
                    id="ts-eff"
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                  />
                </div>
              </div>
              <p className="-mt-2 text-[11px] text-muted-foreground">
                Governing law starts from the deal's jurisdiction and the
                conditions long-stop date from the deal's longstop date.
              </p>
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
                        <b>{classified.ready.length}</b> of {upfront} ready
                      </span>
                      <span className="text-muted-foreground">{readyPct}%</span>
                    </div>
                    <Progress value={readyPct} className="h-1.5" />
                    {classified.later.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        {classified.later.length} commercial term
                        {classified.later.length === 1 ? "" : "s"} (ownership,
                        governance, timetable…) are completed on the term sheet.
                      </p>
                    )}
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
                      title="Complete on the term sheet"
                      items={classified.later}
                      note={() => "a commercial term of the document itself"}
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
              ? "The term sheet opens here, where you complete the terms, edit it and send it to the parties. It is separate from the contract."
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
              Generate term sheet
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// One party to the term sheet. Pre-filled from the deal; either side can be
// swapped for a party on the deal or typed in.
function PartyBlock({
  label,
  hint,
  draft,
  value,
  onChange,
  emailError,
}: {
  label: string;
  hint: string;
  draft: TermSheetDraft | undefined;
  value: PartyForm;
  onChange: (p: PartyForm) => void;
  emailError?: boolean;
}) {
  const set = (patch: Partial<PartyForm>) => onChange({ ...value, ...patch });
  const pick = (v: string) => {
    const p = draft?.dealParties[Number(v)];
    if (p)
      set({
        signatory: p.name,
        signatoryTitle: p.title || value.signatoryTitle,
        email: p.email || value.email,
      });
  };
  const text = (
    key: keyof PartyForm,
    name: string,
    placeholder: string,
    span = false,
  ) => (
    <div className={`space-y-1.5 ${span ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs">{name}</Label>
      <Input
        value={value[key]}
        onChange={(e) => set({ [key]: e.target.value })}
        placeholder={placeholder}
        aria-label={`${label} ${name.toLowerCase()}`}
      />
    </div>
  );

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <Label>
          {label}{" "}
          <span className="font-normal text-muted-foreground">— {hint}</span>
        </Label>
        {!!draft?.dealParties.length && (
          <Select onValueChange={pick}>
            <SelectTrigger className="h-8 w-[240px] text-xs">
              <SelectValue placeholder="Fill signatory from a deal party…" />
            </SelectTrigger>
            <SelectContent>
              {draft.dealParties.map((p, i) => (
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
        {text("name", "Name", "Company or full name", true)}
        {text("entityType", "Entity type", "e.g. private limited company")}
        {text("jurisdiction", "Jurisdiction", "e.g. Rwanda")}
        {text("registrationNumber", "Registration number", "Company number")}
        <div className="space-y-1.5">
          <Label className="text-xs">Email</Label>
          <Input
            type="email"
            value={value.email}
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
        {text("signatory", "Signatory", "Who signs")}
        {text("signatoryTitle", "Signatory title", "e.g. Managing Director")}
        {text("address", "Registered address", "Registered address", true)}
      </div>
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
