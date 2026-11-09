import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  Download,
  FileText,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  advanceVariation,
  createVariation,
  deleteVariation,
  fetchContractClauses,
  fetchVariationDocument,
  updateVariation,
  type ContractVariation,
  type SignableContract,
  type VariationStatus,
  type VariationType,
} from "@/lib/crm/tools-api";

// ─────────────────────────────────────────────────────────────
// Types of variation (labels, descriptions and reference prefixes
// match the engine and the product owner's outline).
// ─────────────────────────────────────────────────────────────

export const VARIATION_TYPES: {
  key: VariationType;
  label: string;
  desc: string;
  prefix: string;
  cls: string;
}[] = [
  {
    key: "amendment",
    label: "Amendment",
    desc: "Modifies existing clause(s)",
    prefix: "AMD",
    cls: "bg-primary/10 text-primary border-primary/30",
  },
  {
    key: "addendum",
    label: "Addendum",
    desc: "Adds new clauses, schedules or annexures",
    prefix: "ADD",
    cls: "bg-info/15 text-info border-info/30",
  },
  {
    key: "side_letter",
    label: "Side Letter",
    desc: "Supplementary agreement clarifying or modifying specific terms",
    prefix: "SL",
    cls: "bg-warning/15 text-warning border-warning/30",
  },
  {
    key: "waiver",
    label: "Waiver",
    desc: "Temporarily or permanently waives a specific obligation",
    prefix: "WAV",
    cls: "bg-destructive/10 text-destructive border-destructive/30",
  },
  {
    key: "extension",
    label: "Extension",
    desc: "Extends the term or a deadline",
    prefix: "EXT",
    cls: "bg-success/15 text-success border-success/30",
  },
];
const typeInfo = (k: VariationType) =>
  VARIATION_TYPES.find((t) => t.key === k) ?? VARIATION_TYPES[0];

const STATUS: Record<VariationStatus, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
  review: {
    label: "Under review",
    cls: "bg-warning/15 text-warning border-warning/30",
  },
  approved: {
    label: "Approved",
    cls: "bg-info/15 text-info border-info/30",
  },
  executed: {
    label: "Executed",
    cls: "bg-success/15 text-success border-success/30",
  },
};
const STEPS: VariationStatus[] = ["draft", "review", "approved", "executed"];
const ACTION_LABEL = {
  amend: "Amended",
  clarify: "Clarified",
  waive: "Waived",
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";
const fmtDateTime = (d?: string | null) =>
  d
    ? new Date(d).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
const toInputDate = (d?: string | null) =>
  d ? new Date(d).toISOString().slice(0, 10) : "";
const normalise = (s: string) => s.replace(/\s+/g, " ").trim();

const errMsg = (err: any, fallback: string) => {
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m.join(", ") : m) || fallback;
};

function Pill({ status }: { status: VariationStatus }) {
  const s = STATUS[status];
  return (
    <Badge variant="outline" className={`${s.cls} text-[10px]`}>
      {s.label}
    </Badge>
  );
}
function TypeBadge({ type }: { type: VariationType }) {
  const t = typeInfo(type);
  return (
    <Badge variant="outline" className={`${t.cls} text-[10px]`}>
      {t.label}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────
// Export — a print-ready page for the variation (use "Save as PDF").
// ─────────────────────────────────────────────────────────────

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const para = (s: string) =>
  esc(s)
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

function exportVariation(contract: SignableContract, v: ContractVariation) {
  const t = typeInfo(v.type);
  const clauses = v.clauses
    .map(
      (
        c,
      ) => `<div class="clause"><h3>Clause ${esc(c.ref)}${c.title ? ` — ${esc(c.title)}` : ""} <small>${ACTION_LABEL[c.action]}</small></h3>
        <div class="lbl">Original</div><div class="orig">${para(c.original)}</div>
        <div class="lbl">${ACTION_LABEL[c.action]} text</div><div>${para(c.amended)}</div></div>`,
    )
    .join("");
  const added = v.addendumClauses
    .map(
      (c) =>
        `<div class="clause"><h3>${esc(c.ref)} — ${esc(c.title)}</h3>${para(c.text)}</div>`,
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(v.ref)} — ${esc(v.title)}</title>
<style>
body{font-family:Georgia,serif;max-width:760px;margin:40px auto;padding:0 24px;color:#111;line-height:1.55}
h1{font-size:22px;margin:0 0 4px}h2{font-size:13px;font-weight:normal;color:#555;margin:0 0 24px}
h3{font-size:14px;margin:0 0 8px}h3 small{color:#6b4de0;font-weight:normal;margin-left:6px}
.meta{display:grid;grid-template-columns:140px 1fr;gap:4px 12px;font-size:13px;margin-bottom:24px}
.meta b{color:#555;font-weight:normal}.clause{border:1px solid #ccc;border-radius:6px;padding:14px;margin-bottom:14px;font-size:13px}
.lbl{font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#777;margin:10px 0 3px}.orig{color:#555}
.sig{display:flex;justify-content:space-between;margin-top:70px;font-size:12px;color:#555}
.sig div{border-top:1px solid #111;width:240px;padding-top:6px}
@media print{body{margin:0}}
</style></head><body>
<h1>${esc(t.label)} ${esc(v.ref)} — ${esc(v.title)}</h1>
<h2>to ${esc(contract.title)} (${esc(contract.ref)}) · ${esc(contract.counterparty)}</h2>
<div class="meta">
<b>Status</b><span>${esc(STATUS[v.status].label)}</span>
<b>Effective date</b><span>${esc(fmtDate(v.effectiveDate))}</span>
<b>Prepared by</b><span>${esc(v.createdBy)}</span>
${v.approvedBy ? `<b>Approved by</b><span>${esc(v.approvedBy)}</span>` : ""}
${v.executedDate ? `<b>Executed</b><span>${esc(fmtDate(v.executedDate))}</span>` : ""}
<b>Reason</b><span>${esc(v.reason || "—")}</span></div>
${clauses}${added}
<div class="sig"><div>For ${esc(contract.tenantBusinessName || "the firm")}</div><div>For ${esc(contract.counterparty)}</div></div>
<script>window.onload=function(){setTimeout(function(){window.print()},250)}</script>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}

// ─────────────────────────────────────────────────────────────
// Full-document view — Current / Original / Redline
// ─────────────────────────────────────────────────────────────

type DocMode = "current" | "original" | "redline";

function DocumentDialog({
  contract,
  open,
  onClose,
  initialMode,
}: {
  contract: SignableContract;
  open: boolean;
  onClose: () => void;
  initialMode: DocMode;
}) {
  const [mode, setMode] = useState<DocMode>(initialMode);
  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);
  const executed = contract.variations.filter(
    (v) => v.status === "executed",
  ).length;
  const q = useQuery({
    queryKey: ["variation-doc", contract._id, mode, executed],
    queryFn: () => fetchVariationDocument(contract._id, mode),
    enabled: open,
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[92vh] flex-col sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{contract.title}</DialogTitle>
          <DialogDescription>
            {contract.ref} ·{" "}
            {mode === "original"
              ? "Original, before any variation"
              : `Current version with ${executed} executed variation${executed === 1 ? "" : "s"}`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Label htmlFor="doc-mode" className="text-xs">
            View
          </Label>
          <Select value={mode} onValueChange={(v) => setMode(v as DocMode)}>
            <SelectTrigger id="doc-mode" className="h-8 w-56 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current (with variations)</SelectItem>
              <SelectItem value="original">Original</SelectItem>
              <SelectItem value="redline">Redline (changes marked)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {q.isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : q.isError ? (
            <p className="py-10 text-center text-sm text-destructive">
              Could not load the document.
            </p>
          ) : !q.data?.html ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              This contract has no document text yet.
            </p>
          ) : (
            <>
              {mode === "redline" && executed === 0 && (
                <p className="mb-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  No variation has been executed yet, so there is nothing to
                  mark up.
                </p>
              )}
              <div
                data-testid="variation-doc"
                className="contract-doc prose prose-sm max-w-none rounded-md border bg-card p-6 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: q.data.html }}
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// New / edit variation — step 1: details; step 2: the wording
// ─────────────────────────────────────────────────────────────

interface AddendumRow {
  ref: string;
  title: string;
  text: string;
}

function VariationForm({
  contract,
  open,
  editing,
  nextRefFor,
  onClose,
  onSaved,
}: {
  contract: SignableContract;
  open: boolean;
  editing: ContractVariation | null;
  nextRefFor: (t: VariationType) => string;
  onClose: () => void;
  onSaved: (v: ContractVariation, submitted: boolean) => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState<VariationType>("amendment");
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [amended, setAmended] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<AddendumRow[]>([
    { ref: "", title: "", text: "" },
  ]);
  const [pickerKey, setPickerKey] = useState(0);
  const [error, setError] = useState("");

  const clausesQ = useQuery({
    queryKey: ["contract-clauses", contract._id],
    queryFn: () => fetchContractClauses(contract._id),
    enabled: open,
    staleTime: 0,
    gcTime: 0,
  });
  const clauses = clausesQ.data?.clauses ?? [];

  // Reset whenever the panel is opened (blank, or loaded from a draft).
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setError("");
    setPickerKey((k) => k + 1);
    if (editing) {
      setType(editing.type);
      setTitle(editing.title);
      setReason(editing.reason);
      setDate(toInputDate(editing.effectiveDate));
      setPicked(editing.clauses.map((c) => c.ref));
      setAmended(
        Object.fromEntries(editing.clauses.map((c) => [c.ref, c.amended])),
      );
      setRows(
        editing.addendumClauses.length
          ? editing.addendumClauses.map((c) => ({
              ref: c.ref,
              title: c.title,
              text: c.text,
            }))
          : [{ ref: "", title: "", text: "" }],
      );
    } else {
      setType("amendment");
      setTitle("");
      setReason("");
      setDate("");
      setPicked([]);
      setAmended({});
      setRows([{ ref: "", title: "", text: "" }]);
    }
  }, [open, editing?._id]);

  const ti = typeInfo(type);
  const isAddendum = type === "addendum";
  const refLabel = editing ? editing.ref : nextRefFor(type);
  const clauseByRef = (ref: string) => clauses.find((c) => c.ref === ref);

  const mut = useMutation({
    mutationFn: async (submit: boolean) => {
      const common = {
        title: title.trim(),
        reason: reason.trim(),
        effectiveDate: date || undefined,
      };
      const body = isAddendum
        ? {
            addendumClauses: rows.map((r) => ({
              ref: r.ref.trim() || undefined,
              title: r.title.trim(),
              text: r.text.trim(),
            })),
          }
        : {
            clauses: picked.map((ref) => ({
              ref,
              amended: amended[ref] ?? clauseByRef(ref)?.text ?? "",
            })),
          };
      let v: ContractVariation;
      if (editing) {
        v = await updateVariation(contract._id, editing.ref, {
          ...common,
          ...body,
        });
        if (submit) v = await advanceVariation(contract._id, v.ref, "review");
      } else {
        v = await createVariation(contract._id, {
          type,
          ...common,
          ...body,
          submit,
        });
      }
      return { v, submit };
    },
    onSuccess: ({ v, submit }) => onSaved(v, submit),
    onError: (err: any) => {
      const m = errMsg(err, "Could not save the variation.");
      setError(m);
      toast({ title: "Not saved", description: m, variant: "destructive" });
    },
  });

  const detailsOk =
    !!title.trim() &&
    (isAddendum
      ? true
      : picked.length > 0 && picked.every((r) => !!clauseByRef(r)));
  const wordingOk = isAddendum
    ? rows.length > 0 && rows.every((r) => r.title.trim() && r.text.trim())
    : picked.some(
        (r) =>
          (amended[r] ?? "").trim() &&
          normalise(amended[r] ?? "") !== normalise(clauseByRef(r)?.text ?? ""),
      ) && picked.every((r) => (amended[r] ?? "").trim());

  const addPicked = (ref: string) => {
    if (!ref || picked.includes(ref)) return;
    const c = clauseByRef(ref);
    setPicked([...picked, ref]);
    setAmended((a) => (ref in a ? a : { ...a, [ref]: c?.text ?? "" }));
    setPickerKey((k) => k + 1);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && !mut.isPending && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b p-5 pr-12 text-left">
          <SheetTitle>
            {editing ? `Edit ${editing.ref}` : "New variation"}
          </SheetTitle>
          <SheetDescription>
            {step === 1
              ? "Step 1 of 2 — what is changing and why"
              : "Step 2 of 2 — the wording"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {step === 1 ? (
            <>
              <div className="space-y-1">
                <Label htmlFor="var-type">Type of variation</Label>
                <Select
                  value={type}
                  onValueChange={(v) => {
                    setType(v as VariationType);
                    setPicked([]);
                  }}
                  disabled={!!editing}
                >
                  <SelectTrigger id="var-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VARIATION_TYPES.map((t) => (
                      <SelectItem key={t.key} value={t.key}>
                        {t.label} — {t.desc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="rounded-md bg-primary/5 px-3 py-2 text-xs text-primary">
                Will be recorded as <b>{refLabel}</b>. {ti.desc}.
              </p>
              <div className="space-y-1">
                <Label htmlFor="var-title">Title</Label>
                <Input
                  id="var-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    isAddendum
                      ? "e.g. Schedule 2: Data Processing Terms"
                      : "e.g. Extend term to 24 months"
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="var-reason">Reason</Label>
                <Textarea
                  id="var-reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={`What is being ${isAddendum ? "added" : "changed"} and why.`}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="var-date">Proposed effective date</Label>
                <Input
                  id="var-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="space-y-2 border-t pt-4">
                {isAddendum ? (
                  <>
                    <p className="text-sm font-medium">
                      New clauses / schedules to add
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Addenda add new content to the contract without modifying
                      existing clauses. Draft them in the next step.
                    </p>
                    <div className="space-y-1">
                      <Label htmlFor="var-count">
                        Number of new clauses/schedules
                      </Label>
                      <Select
                        value={String(rows.length)}
                        onValueChange={(n) =>
                          setRows((r) =>
                            Array.from(
                              { length: Number(n) },
                              (_, i) =>
                                r[i] ?? { ref: "", title: "", text: "" },
                            ),
                          )
                        }
                      >
                        <SelectTrigger id="var-count" className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium">Affected clauses</p>
                    <p className="text-xs text-muted-foreground">
                      Add the clause(s) this {ti.label.toLowerCase()} affects.
                    </p>
                    {clausesQ.isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : !clauses.length ? (
                      <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                        This contract's text has no clauses to pick from. Use an
                        addendum to add terms instead.
                      </p>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          {picked.map((ref) => {
                            const c = clauseByRef(ref);
                            return (
                              <div
                                key={ref}
                                className="flex items-center justify-between rounded-md border px-3 py-1.5 text-xs"
                              >
                                <span>
                                  <b>Clause {ref}</b>
                                  {c ? ` — ${c.title}` : ""}
                                </span>
                                <button
                                  type="button"
                                  aria-label={`Remove clause ${ref}`}
                                  className="text-muted-foreground hover:text-destructive"
                                  onClick={() =>
                                    setPicked(picked.filter((r) => r !== ref))
                                  }
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        <Select
                          key={pickerKey}
                          onValueChange={(v) => addPicked(v)}
                        >
                          <SelectTrigger
                            id="var-clause-picker"
                            aria-label="Choose a clause"
                            className="text-xs"
                          >
                            <SelectValue placeholder="Choose a clause…" />
                          </SelectTrigger>
                          <SelectContent>
                            {clauses
                              .filter((c) => !picked.includes(c.ref))
                              .map((c) => (
                                <SelectItem key={c.ref} value={c.ref}>
                                  Clause {c.ref} — {c.title}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </>
                )}
              </div>
            </>
          ) : isAddendum ? (
            rows.map((r, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-3">
                <p className="text-xs font-semibold text-info">
                  New clause {i + 1}
                </p>
                <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
                  <div className="space-y-1">
                    <Label htmlFor={`add-ref-${i}`} className="text-xs">
                      Reference
                    </Label>
                    <Input
                      id={`add-ref-${i}`}
                      value={r.ref}
                      placeholder={`Schedule ${i + 1}`}
                      onChange={(e) =>
                        setRows(
                          rows.map((x, j) =>
                            j === i ? { ...x, ref: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`add-title-${i}`} className="text-xs">
                      Title
                    </Label>
                    <Input
                      id={`add-title-${i}`}
                      value={r.title}
                      onChange={(e) =>
                        setRows(
                          rows.map((x, j) =>
                            j === i ? { ...x, title: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`add-text-${i}`} className="text-xs">
                    Text
                  </Label>
                  <Textarea
                    id={`add-text-${i}`}
                    rows={5}
                    value={r.text}
                    onChange={(e) =>
                      setRows(
                        rows.map((x, j) =>
                          j === i ? { ...x, text: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </div>
              </div>
            ))
          ) : (
            picked.map((ref) => {
              const c = clauseByRef(ref);
              const action =
                type === "waiver"
                  ? "Waived"
                  : type === "side_letter"
                    ? "Clarified"
                    : "Amended";
              return (
                <div key={ref} className="overflow-hidden rounded-lg border">
                  <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2 text-xs">
                    <b>
                      Clause {ref}
                      {c ? ` — ${c.title}` : ""}
                    </b>
                    <Badge
                      variant="outline"
                      className={`${ti.cls} text-[10px]`}
                    >
                      {action}
                    </Badge>
                  </div>
                  <div className="space-y-3 p-3">
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-destructive">
                        Original
                      </p>
                      <p className="whitespace-pre-line rounded-md bg-muted/40 p-2 text-xs leading-relaxed text-muted-foreground">
                        {c?.text}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label
                        htmlFor={`amended-${ref}`}
                        className="text-[10px] font-bold uppercase tracking-wide text-success"
                      >
                        {action} text
                      </Label>
                      <Textarea
                        id={`amended-${ref}`}
                        rows={6}
                        className="text-xs leading-relaxed"
                        value={amended[ref] ?? c?.text ?? ""}
                        onChange={(e) =>
                          setAmended({ ...amended, [ref]: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive"
            >
              {error}
            </p>
          )}
        </div>

        <SheetFooter className="flex-row flex-wrap justify-end gap-2 border-t p-4 sm:space-x-0">
          {step === 1 ? (
            <>
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!detailsOk}
                onClick={() => {
                  setError("");
                  setStep(2);
                }}
              >
                Next →
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={mut.isPending}
                onClick={() => setStep(1)}
              >
                ← Back
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!wordingOk || mut.isPending}
                onClick={() => mut.mutate(false)}
              >
                {mut.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : editing ? (
                  "Save changes"
                ) : (
                  "Save draft"
                )}
              </Button>
              <Button
                size="sm"
                disabled={!wordingOk || mut.isPending}
                onClick={() => mut.mutate(true)}
              >
                Save &amp; submit →
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────
// Detail panel
// ─────────────────────────────────────────────────────────────

function DetailSheet({
  contract,
  variation,
  onClose,
  onEdit,
  onPreview,
  onChanged,
}: {
  contract: SignableContract;
  variation: ContractVariation | null;
  onClose: () => void;
  onEdit: (v: ContractVariation) => void;
  onPreview: () => void;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const advance = useMutation({
    mutationFn: (to: VariationStatus) =>
      advanceVariation(contract._id, variation!.ref, to),
    onSuccess: (v) => {
      const msg = {
        draft: "Returned to draft",
        review: "Submitted for review",
        approved: "Approved",
        executed: "Executed and applied to the contract",
      }[v.status];
      toast({ title: `${v.ref} — ${msg}` });
      onChanged();
    },
    onError: (err: any) =>
      toast({
        title: "Could not update",
        description: errMsg(err, "Please try again."),
        variant: "destructive",
      }),
  });
  const del = useMutation({
    mutationFn: () => deleteVariation(contract._id, variation!.ref),
    onSuccess: () => {
      toast({ title: `${variation!.ref} deleted` });
      setConfirmDelete(false);
      onClose();
      onChanged();
    },
    onError: (err: any) =>
      toast({
        title: "Could not delete",
        description: errMsg(err, "Please try again."),
        variant: "destructive",
      }),
  });

  const v = variation;
  const stepIdx = v ? STEPS.indexOf(v.status) : 0;
  const busy = advance.isPending || del.isPending;

  return (
    <>
      <Sheet open={!!v} onOpenChange={(o) => !o && onClose()}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
        >
          {v && (
            <>
              <SheetHeader className="border-b p-5 pr-12 text-left">
                <SheetTitle className="flex flex-wrap items-center gap-2">
                  <span className="font-mono">{v.ref}</span>
                  <TypeBadge type={v.type} />
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Details of {v.ref}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Pill status={v.status} />
                  Created {fmtDate(v.createdAt)} by {v.createdBy}
                </div>
                <p className="text-base font-semibold">{v.title}</p>

                <div>
                  <p className="mb-2 text-xs font-semibold">Lifecycle</p>
                  <ol className="flex items-center">
                    {STEPS.map((s, i) => (
                      <li
                        key={s}
                        className="flex flex-1 items-center last:flex-none"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold ${
                              i < stepIdx
                                ? "border-success bg-success text-success-foreground"
                                : i === stepIdx
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {i < stepIdx ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              i + 1
                            )}
                          </span>
                          <span className="text-[10px] capitalize text-muted-foreground">
                            {s === "review" ? "Review" : STATUS[s].label}
                          </span>
                        </div>
                        {i < STEPS.length - 1 && (
                          <span
                            className={`mx-1 mb-4 h-px flex-1 ${i < stepIdx ? "bg-success" : "bg-border"}`}
                          />
                        )}
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold">Reason</p>
                  <p className="whitespace-pre-line rounded-md bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
                    {v.reason || "—"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-6 text-xs">
                  <div>
                    <p className="text-muted-foreground">Effective date</p>
                    <p className="text-sm font-semibold">
                      {fmtDate(v.effectiveDate)}
                    </p>
                  </div>
                  {v.approvedBy && (
                    <div>
                      <p className="text-muted-foreground">Approved by</p>
                      <p className="text-sm font-semibold">{v.approvedBy}</p>
                    </div>
                  )}
                  {v.executedDate && (
                    <div>
                      <p className="text-muted-foreground">Executed</p>
                      <p className="text-sm font-semibold">
                        {fmtDate(v.executedDate)}
                      </p>
                    </div>
                  )}
                </div>

                {v.clauses.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold">
                      {v.type === "waiver" ? "Waived" : "Affected"} clauses (
                      {v.clauses.length})
                    </p>
                    {v.clauses.map((c) => (
                      <div
                        key={c.ref}
                        className="overflow-hidden rounded-lg border"
                      >
                        <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2 text-xs">
                          <b>
                            Clause {c.ref}
                            {c.title ? ` — ${c.title}` : ""}
                          </b>
                          <span className="font-semibold text-primary">
                            {ACTION_LABEL[c.action]}
                          </span>
                        </div>
                        <div className="space-y-3 p-3 text-xs leading-relaxed">
                          <div>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-destructive">
                              Original
                            </p>
                            <p className="whitespace-pre-line text-muted-foreground">
                              {c.original}
                            </p>
                          </div>
                          <div>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-success">
                              {ACTION_LABEL[c.action]} text
                            </p>
                            <p className="whitespace-pre-line">{c.amended}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {v.addendumClauses.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-info">
                      New clauses / schedules added ({v.addendumClauses.length})
                    </p>
                    {v.addendumClauses.map((c, i) => (
                      <div
                        key={i}
                        className="overflow-hidden rounded-lg border border-info/40"
                      >
                        <div className="flex items-center justify-between border-b bg-info/10 px-3 py-2 text-xs">
                          <b>
                            {c.ref} — {c.title}
                          </b>
                          <span className="font-semibold text-info">Added</span>
                        </div>
                        <p className="whitespace-pre-line p-3 text-xs leading-relaxed">
                          {c.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <p className="mb-2 text-xs font-semibold">Activity</p>
                  <ul className="space-y-2 border-l pl-4">
                    {v.history.map((h, i) => (
                      <li key={i} className="relative text-xs">
                        <span
                          className={`absolute -left-[21px] top-1 h-2 w-2 rounded-full ${i === 0 ? "bg-primary" : "bg-border"}`}
                        />
                        <p className="text-muted-foreground">
                          {fmtDateTime(h.at)}
                        </p>
                        <p>
                          <b>{h.user}</b> — {h.action}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <SheetFooter className="flex-row flex-wrap justify-end gap-2 border-t p-4 sm:space-x-0">
                {v.status === "draft" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mr-auto text-destructive"
                      disabled={busy}
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => onEdit(v)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => advance.mutate("review")}
                    >
                      Submit for review →
                    </Button>
                  </>
                )}
                {v.status === "review" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => advance.mutate("draft")}
                    >
                      ← Draft
                    </Button>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => advance.mutate("approved")}
                    >
                      Approve →
                    </Button>
                  </>
                )}
                {v.status === "approved" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => advance.mutate("draft")}
                    >
                      ← Draft
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!exportVariation(contract, v))
                          toast({
                            title: "Pop-up blocked",
                            description:
                              "Allow pop-ups for this site to export.",
                            variant: "destructive",
                          });
                      }}
                    >
                      <Download className="mr-1 h-3.5 w-3.5" /> Export
                    </Button>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => advance.mutate("executed")}
                    >
                      {advance.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Execute →"
                      )}
                    </Button>
                  </>
                )}
                {v.status === "executed" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!exportVariation(contract, v))
                          toast({
                            title: "Pop-up blocked",
                            description:
                              "Allow pop-ups for this site to export.",
                            variant: "destructive",
                          });
                      }}
                    >
                      <Download className="mr-1 h-3.5 w-3.5" /> Export
                    </Button>
                    <Button variant="outline" size="sm" onClick={onPreview}>
                      <FileText className="mr-1 h-3.5 w-3.5" /> Preview
                    </Button>
                  </>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {v?.ref}?</AlertDialogTitle>
            <AlertDialogDescription>
              This draft will be removed. It has not been applied to the
              contract.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                del.mutate();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// The tab
// ─────────────────────────────────────────────────────────────

export default function ContractVariations({
  contract,
  canVary,
  blockedReason,
  onChanged,
}: {
  contract: SignableContract;
  canVary: boolean;
  blockedReason: string;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | VariationType>("all");
  const [openRef, setOpenRef] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContractVariation | null>(null);
  const [docOpen, setDocOpen] = useState(false);
  const [docMode, setDocMode] = useState<DocMode>("current");

  const variations = contract.variations ?? [];
  // Amendments logged before variations existed: kept visible, read-only.
  const legacy = useMemo(
    () =>
      contract.amendments.filter(
        (a) => !variations.some((v) => v.ref === a.ref),
      ),
    [contract.amendments, variations],
  );

  const nextRefFor = (t: VariationType) => {
    const prefix = typeInfo(t).prefix;
    const re = new RegExp(`^${prefix}-(\\d+)$`);
    let max = 0;
    for (const r of [
      ...variations.map((v) => v.ref),
      ...contract.amendments.map((a) => a.ref),
    ]) {
      const m = re.exec(r);
      if (m) max = Math.max(max, Number(m[1]));
    }
    return `${prefix}-${String(max + 1).padStart(2, "0")}`;
  };

  const refresh = () => {
    onChanged();
    qc.invalidateQueries({ queryKey: ["variation-doc", contract._id] });
  };

  const draft = variations.filter((v) => v.status === "draft").length;
  const inReview = variations.filter(
    (v) => v.status === "review" || v.status === "approved",
  ).length;
  const executed =
    variations.filter((v) => v.status === "executed").length + legacy.length;
  const clauseCount = variations.reduce(
    (n, v) => n + v.clauses.length + v.addendumClauses.length,
    0,
  );

  const count = (t: VariationType) =>
    variations.filter((v) => v.type === t).length +
    (t === "amendment" ? legacy.length : 0);
  const shown =
    filter === "all" ? variations : variations.filter((v) => v.type === filter);
  const shownLegacy = filter === "all" || filter === "amendment" ? legacy : [];
  const open = variations.find((v) => v.ref === openRef) ?? null;

  const tile = (n: number, label: string, cls: string) => (
    <div className="rounded-lg border bg-card p-3 text-center">
      <p className={`font-mono text-2xl font-bold ${cls}`}>{n}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tile(draft, "Draft", "text-muted-foreground")}
        {tile(inReview, "In review / approved", "text-warning")}
        {tile(executed, "Executed", "text-success")}
        {tile(clauseCount, "Clauses affected", "text-primary")}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Amendments &amp; variations</h2>
          <p className="text-sm text-muted-foreground">
            All formal changes to the executed contract: amendments, addenda,
            side letters, waivers and extensions.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDocMode("current");
              setDocOpen(true);
            }}
          >
            <FileText className="mr-2 h-4 w-4" /> View full document
          </Button>
          <Button
            size="sm"
            disabled={!canVary}
            title={canVary ? undefined : blockedReason}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New variation
          </Button>
        </div>
      </div>

      {!canVary && (
        <p className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {blockedReason}
        </p>
      )}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter">
        {(
          [
            { key: "all", label: "All", n: variations.length + legacy.length },
            ...VARIATION_TYPES.map((t) => ({
              key: t.key,
              label: t.label,
              n: count(t.key),
            })),
          ] as { key: "all" | VariationType; label: string; n: number }[]
        ).map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === f.key
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {f.label}
            <span className="ml-1.5 opacity-70">{f.n}</span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {shown.map((v) => {
          const n = v.clauses.length + v.addendumClauses.length;
          return (
            <button
              key={v.ref}
              type="button"
              data-testid={`variation-${v.ref}`}
              onClick={() => setOpenRef(v.ref)}
              className="block w-full rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold">
                    {v.ref}
                  </span>
                  <TypeBadge type={v.type} />
                  <Pill status={v.status} />
                </div>
                <span className="text-xs text-muted-foreground">
                  {fmtDate(v.createdAt)}
                </span>
              </div>
              <p className="mt-1.5 text-sm font-medium">{v.title}</p>
              <p className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                <span>Created by {v.createdBy}</span>
                {v.effectiveDate && (
                  <span>Effective {fmtDate(v.effectiveDate)}</span>
                )}
                <span>
                  {n} clause{n === 1 ? "" : "s"}{" "}
                  {v.type === "addendum" ? "added" : "affected"}
                </span>
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {v.clauses.map((c) => (
                  <span
                    key={c.ref}
                    className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground"
                  >
                    Cl. {c.ref}
                    {c.title ? ` — ${c.title}` : ""}
                  </span>
                ))}
                {v.addendumClauses.map((c, i) => (
                  <span
                    key={i}
                    className="rounded border border-info/40 px-1.5 py-0.5 text-[11px] text-info"
                  >
                    {c.ref} — {c.title}
                  </span>
                ))}
              </div>
            </button>
          );
        })}

        {shownLegacy.map((a) => (
          <Card key={a._id}>
            <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">
                    {a.ref}
                  </span>
                  <TypeBadge type="amendment" />
                  <Pill status="executed" />
                </div>
                <p className="mt-1.5 text-sm font-medium">{a.summary}</p>
                <p className="text-xs text-muted-foreground">
                  Logged before clause-level amendments were available.
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {fmtDate(a.at)}
              </span>
            </CardContent>
          </Card>
        ))}

        {!shown.length && !shownLegacy.length && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              {variations.length + legacy.length
                ? "No variations of this type."
                : canVary
                  ? "No amendments or variations yet."
                  : "No amendments or variations. They can be added once the contract is executed and Active."}
            </CardContent>
          </Card>
        )}
      </div>

      <DetailSheet
        contract={contract}
        variation={open}
        onClose={() => setOpenRef(null)}
        onEdit={(v) => {
          setOpenRef(null);
          setEditing(v);
          setFormOpen(true);
        }}
        onPreview={() => {
          setDocMode("redline");
          setDocOpen(true);
        }}
        onChanged={refresh}
      />

      <VariationForm
        contract={contract}
        open={formOpen}
        editing={editing}
        nextRefFor={nextRefFor}
        onClose={() => setFormOpen(false)}
        onSaved={(v, submitted) => {
          setFormOpen(false);
          setEditing(null);
          refresh();
          setOpenRef(v.ref);
        }}
      />

      <DocumentDialog
        contract={contract}
        open={docOpen}
        onClose={() => setDocOpen(false)}
        initialMode={docMode}
      />
    </div>
  );
}
