import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  MessageSquare,
  PenSquare,
  Plus,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { useAuth } from "@/contexts/AuthContext";
import {
  addContractComment,
  addRedline,
  deleteContract,
  downloadContractPdf,
  downloadRedlinedContractPdf,
  fetchContractPdfBlob,
  removeContractSection,
  sendContractForReview,
  setContractVariable,
  toggleContractComment,
  updateContractSectionBody,
  type Contract,
  type ContractField,
  type ContractSection,
  type Deal,
} from "@/lib/grc/deals-api";

// ═══════════════════════════════════════════════════════════════
// A deal contract, opened in a pop-up. It is generated from a template and
// lives in the deal — editing, redlining, review and execution all happen
// here, with no hop to Contract Management.
//
//   Preview — the document as a reader sees it, merge fields filled in
//   Edit    — the sections: edit the text, comment, redline
//   Fields  — every merge field the contract uses, common ones first
//   Review  — what the parties said when it was sent for review
// ═══════════════════════════════════════════════════════════════

// Groups every module shares — listed first on the Fields tab.
const COMMON_GROUP_ORDER = [
  "Agreement",
  "Parties",
  "Our company",
  "Dates",
  "Value",
];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// Fields with no value yet stay as {{token}} in the text; show them
// highlighted so the gap is obvious rather than looking like real wording.
function highlightMissing(html: string, labels: Map<string, string>): string {
  return html.replace(
    /\{\{(\w+)\}\}/g,
    (_, t: string) =>
      `<mark data-missing="${t}" title="${esc(labels.get(t) ?? t)} — not filled in yet">{{${t}}}</mark>`,
  );
}

const DOC_CLASSES =
  "text-sm leading-relaxed [&_p]:my-2 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_table]:my-2 [&_table]:w-full [&_td]:border [&_td]:p-1.5 [&_th]:border [&_th]:p-1.5 [&_mark]:rounded [&_mark]:bg-warning/20 [&_mark]:px-0.5 [&_mark]:text-amber-800 dark:[&_mark]:text-amber-200 [&_mark]:ring-1 [&_mark]:ring-warning/40";

export function DealContractDialog({
  deal,
  contractId,
  open,
  onOpenChange,
}: {
  deal: Deal;
  contractId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const contract = (deal.contracts ?? []).find((c) => c._id === contractId);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("preview");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) setTab("preview");
  }, [open, contractId]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["deal", deal._id] });

  const sendReviewMut = useMutation({
    mutationFn: () => sendContractForReview(deal._id, contract!._id),
    onSuccess: (res) => {
      invalidate();
      toast.success(
        `Sent to ${res.sent.length} part${res.sent.length === 1 ? "y" : "ies"}`,
      );
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to send for review"),
  });
  const deleteMut = useMutation({
    mutationFn: () => deleteContract(deal._id, contract!._id),
    onSuccess: () => {
      invalidate();
      setConfirmDelete(false);
      onOpenChange(false);
      toast.success("Contract deleted");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to delete"),
  });
  const pdfMut = useMutation({
    mutationFn: () => fetchContractPdfBlob(deal._id, contract!._id),
    onSuccess: (blob) => {
      window.open(URL.createObjectURL(blob), "_blank", "noopener");
    },
    onError: () => toast.error("Failed to load the PDF preview"),
  });

  const fields = useMemo(() => contract?.fields ?? [], [contract?.fields]);
  const missing = fields.filter((f) => !f.filled);
  const labels = useMemo(
    () => new Map(fields.map((f) => [f.token, f.label])),
    [fields],
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[92vh] max-w-6xl flex-col gap-0 p-0">
          {!contract ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <DialogTitle className="sr-only">Contract</DialogTitle>
              This contract is no longer available.
            </div>
          ) : (
            <Tabs
              value={tab}
              onValueChange={setTab}
              className="flex min-h-0 flex-1 flex-col"
            >
              <DialogHeader className="shrink-0 space-y-3 border-b px-6 pb-3 pt-5">
                <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
                  <div className="min-w-0">
                    <DialogTitle className="flex items-center gap-2 text-lg">
                      <FileText className="h-5 w-5 shrink-0 text-primary" />
                      <span className="truncate">{contract.name}</span>
                    </DialogTitle>
                    <DialogDescription asChild>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        {contract.reference && (
                          <span className="font-mono text-xs">
                            {contract.reference}
                          </span>
                        )}
                        {contract.templateName && (
                          <span>From “{contract.templateName}”</span>
                        )}
                        {fields.length > 0 &&
                          (missing.length ? (
                            <Badge
                              variant="outline"
                              className="gap-1 border-warning/50 text-warning"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              {missing.length} of {fields.length} fields to fill
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="gap-1 border-success/50 text-success"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              All {fields.length} fields filled
                            </Badge>
                          ))}
                      </div>
                    </DialogDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={sendReviewMut.isPending}
                      onClick={() => sendReviewMut.mutate()}
                    >
                      <Send className="mr-1 h-3.5 w-3.5" />
                      Send for review
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        downloadContractPdf(deal._id, contract._id)
                      }
                    >
                      Export Execution Version
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        downloadRedlinedContractPdf(deal._id, contract._id)
                      }
                    >
                      Export Redlined
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Delete contract"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <TabsList className="w-fit">
                  <TabsTrigger value="preview">
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="edit">
                    <PenSquare className="mr-1.5 h-3.5 w-3.5" />
                    Edit ({contract.sections.length})
                  </TabsTrigger>
                  <TabsTrigger value="fields">
                    Fields
                    {missing.length > 0 && (
                      <span className="ml-1.5 rounded-full bg-warning/20 px-1.5 text-[11px] text-warning">
                        {missing.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="review">
                    Review ({contract.reviewLoop?.responses?.length ?? 0})
                  </TabsTrigger>
                </TabsList>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20">
                <TabsContent value="preview" className="m-0 p-6">
                  <PreviewTab
                    contract={contract}
                    labels={labels}
                    missing={missing.length}
                    onFill={() => setTab("fields")}
                    onPdf={() => pdfMut.mutate()}
                    pdfLoading={pdfMut.isPending}
                  />
                </TabsContent>
                <TabsContent value="edit" className="m-0 p-6">
                  <EditTab
                    deal={deal}
                    contract={contract}
                    labels={labels}
                    onChanged={invalidate}
                  />
                </TabsContent>
                <TabsContent value="fields" className="m-0 p-6">
                  <FieldsTab
                    deal={deal}
                    contract={contract}
                    onChanged={invalidate}
                  />
                </TabsContent>
                <TabsContent value="review" className="m-0 p-6">
                  <ReviewTab contract={contract} />
                </TabsContent>
              </div>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this contract?</AlertDialogTitle>
            <AlertDialogDescription>
              “{contract?.name}” and its comments, redlines and review responses
              will be removed from the deal. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMut.mutate()}
              disabled={deleteMut.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Preview ─────────────────────────────────────────────────

function PreviewTab({
  contract,
  labels,
  missing,
  onFill,
  onPdf,
  pdfLoading,
}: {
  contract: Contract;
  labels: Map<string, string>;
  missing: number;
  onFill: () => void;
  onPdf: () => void;
  pdfLoading: boolean;
}) {
  // A contract made from a template with a cover page and/or a contents page
  // reads in that order: cover, contents, then the body — each on its own page.
  const hasCover = !!contract.cover?.replace(/<[^>]*>/g, "").trim();
  const tocEntries = contract.toc?.enabled ? contract.toc.entries : [];
  const structured = hasCover || tocEntries.length > 0;
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {missing > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            {missing} field{missing === 1 ? "" : "s"} still need a value — they
            show highlighted below.
          </span>
          <Button size="sm" variant="outline" onClick={onFill}>
            Fill in fields
          </Button>
        </div>
      )}
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={onPdf} disabled={pdfLoading}>
          {pdfLoading ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileText className="mr-1 h-3.5 w-3.5" />
          )}
          Open PDF preview
        </Button>
      </div>
      {hasCover && (
        <article
          aria-label="Cover page"
          className="flex min-h-[460px] flex-col items-center justify-center rounded-lg border bg-background px-10 py-10 text-center shadow-sm"
        >
          <div
            className={DOC_CLASSES}
            dangerouslySetInnerHTML={{
              __html: highlightMissing(contract.cover ?? "", labels),
            }}
          />
        </article>
      )}
      {tocEntries.length > 0 && (
        <article
          aria-label="Table of contents"
          className="min-h-[460px] rounded-lg border bg-background px-10 py-10 shadow-sm"
        >
          <h2 className="mb-5 text-xl font-semibold">
            {contract.toc?.title || "Table of Contents"}
          </h2>
          <ul className="space-y-1.5 text-sm">
            {tocEntries.map((e, i) => (
              <li
                key={i}
                style={{ paddingLeft: `${(e.level - 1) * 20}px` }}
                className={e.level === 1 ? "font-semibold" : ""}
              >
                {e.title}
              </li>
            ))}
          </ul>
        </article>
      )}
      <article
        aria-label="Body"
        className="space-y-6 rounded-lg border bg-background px-10 py-10 shadow-sm"
      >
        {!structured && (
          <h2 className="text-center text-xl font-semibold uppercase tracking-wide">
            {contract.name}
          </h2>
        )}
        {contract.sections.map((s, i) => (
          <section key={i} className="space-y-1">
            <h3 className="text-sm font-semibold">{s.title}</h3>
            <div
              className={DOC_CLASSES}
              dangerouslySetInnerHTML={{
                __html: highlightMissing(s.renderedBody ?? s.body, labels),
              }}
            />
          </section>
        ))}
        {contract.sections.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            This contract has no sections.
          </p>
        )}
      </article>
    </div>
  );
}

// ── Edit ────────────────────────────────────────────────────

// A section's text editor. Typing is saved after a short pause (and when
// the editor loses focus or is closed) rather than on every keystroke.
function SectionBody({
  value,
  onSave,
}: {
  value: string;
  onSave: (html: string) => Promise<unknown> | void;
}) {
  const [html, setHtml] = useState(value);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const dirty = useRef(false);
  const latest = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const save = useRef(onSave);
  save.current = onSave;

  // Take the server's text unless the user has unsaved typing.
  useEffect(() => {
    if (!dirty.current) {
      setHtml(value);
      latest.current = value;
    }
  }, [value]);

  const flush = async () => {
    clearTimeout(timer.current);
    if (!dirty.current) return;
    dirty.current = false;
    setState("saving");
    try {
      await save.current(latest.current);
      setState("saved");
    } catch {
      dirty.current = true;
      setState("idle");
    }
  };
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => () => void flushRef.current(), []);

  return (
    <div onBlur={flush}>
      <RichTextEditor
        value={html}
        onChange={(h) => {
          latest.current = h;
          dirty.current = true;
          setHtml(h);
          setState("idle");
          clearTimeout(timer.current);
          timer.current = setTimeout(flush, 900);
        }}
        minHeight={120}
      />
      <p className="mt-1 h-4 text-right text-[11px] text-muted-foreground">
        {state === "saving" && "Saving…"}
        {state === "saved" && "Saved"}
      </p>
    </div>
  );
}

function EditTab({
  deal,
  contract,
  labels,
  onChanged,
}: {
  deal: Deal;
  contract: Contract;
  labels: Map<string, string>;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const defaultAuthor = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
    : "";
  const [openComments, setOpenComments] = useState<number | null>(null);
  const [openRedlines, setOpenRedlines] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentAuthor, setCommentAuthor] = useState(defaultAuthor);
  const [redlineLine, setRedlineLine] = useState<number | null>(null);
  const [redlineText, setRedlineText] = useState("");
  const [removeIdx, setRemoveIdx] = useState<number | null>(null);

  const bodyMut = useMutation({
    mutationFn: ({ index, body }: { index: number; body: string }) =>
      updateContractSectionBody(deal._id, contract._id, index, body),
    onSuccess: onChanged,
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to save the text"),
  });
  const removeMut = useMutation({
    mutationFn: (index: number) =>
      removeContractSection(deal._id, contract._id, index),
    onSuccess: () => {
      onChanged();
      setRemoveIdx(null);
      setOpenComments(null);
      setOpenRedlines(null);
    },
  });
  const commentMut = useMutation({
    mutationFn: (index: number) =>
      addContractComment(
        deal._id,
        contract._id,
        index,
        commentAuthor.trim() || "You",
        commentText,
      ),
    onSuccess: () => {
      onChanged();
      setCommentText("");
    },
  });
  const toggleMut = useMutation({
    mutationFn: ({ sIndex, cIndex }: { sIndex: number; cIndex: number }) =>
      toggleContractComment(deal._id, contract._id, sIndex, cIndex),
    onSuccess: onChanged,
  });
  const redlineMut = useMutation({
    mutationFn: ({
      sIndex,
      lineIndex,
      comment,
    }: {
      sIndex: number;
      lineIndex: number;
      comment: string;
    }) => addRedline(deal._id, contract._id, sIndex, lineIndex, comment),
    onSuccess: () => {
      onChanged();
      setRedlineText("");
      setRedlineLine(null);
      toast.success("Redline added");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to add redline"),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-3">
      <p className="rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
        Merge fields appear as <code>{"{{field}}"}</code> while you edit and are
        filled in from the <b>Fields</b> tab — change a value there and it
        updates everywhere it appears.
      </p>
      {contract.sections.map((s: ContractSection, i: number) => (
        <div key={i} className="rounded-lg border bg-background p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{s.title}</h3>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setOpenRedlines(openRedlines === i ? null : i)}
              >
                <PenSquare className="mr-1 h-3.5 w-3.5 text-rose-600" />
                {s.redlines?.length ?? 0}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setOpenComments(openComments === i ? null : i)}
              >
                <MessageSquare className="mr-1 h-3.5 w-3.5" />
                {s.comments.length}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Remove section ${s.title}`}
                onClick={() => setRemoveIdx(i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <SectionBody
            value={s.body}
            onSave={(body) => bodyMut.mutateAsync({ index: i, body })}
          />

          <div className="mt-1 border-t pt-2">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              With fields filled in
            </p>
            <div
              className={`${DOC_CLASSES} text-muted-foreground`}
              dangerouslySetInnerHTML={{
                __html: highlightMissing(s.renderedBody ?? s.body, labels),
              }}
            />
          </div>

          {openRedlines === i && (
            <div className="mt-3 space-y-1.5 border-t pt-2">
              <div className="mb-1 text-xs font-medium text-rose-700">
                Line-by-line redline
              </div>
              {(s.lines ?? []).map((line: string, lineIdx: number) => {
                const lineRedlines = (s.redlines ?? []).filter(
                  (r) => r.lineIndex === lineIdx,
                );
                return (
                  <div key={lineIdx} className="rounded border p-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex-1">{line}</span>
                      <button
                        className="shrink-0 text-rose-600 hover:text-rose-700"
                        aria-label="Add a redline to this line"
                        onClick={() => {
                          setRedlineLine(
                            redlineLine === lineIdx ? null : lineIdx,
                          );
                          setRedlineText("");
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {lineRedlines.map((r, ri) => (
                      <div
                        key={ri}
                        className="mt-1.5 border-l-2 border-rose-300 pl-2 text-[11px]"
                      >
                        <span className="font-medium">{r.authorName}</span>{" "}
                        <span className="text-muted-foreground">
                          ({r.source} ·{" "}
                          {new Date(r.createdAt).toLocaleDateString()})
                        </span>
                        <div>{r.comment}</div>
                      </div>
                    ))}
                    {redlineLine === lineIdx && (
                      <div className="mt-2 flex gap-2">
                        <Input
                          placeholder="Redline comment…"
                          value={redlineText}
                          onChange={(e) => setRedlineText(e.target.value)}
                          className="h-7 text-xs"
                        />
                        <Button
                          size="sm"
                          disabled={!redlineText.trim() || redlineMut.isPending}
                          onClick={() =>
                            redlineMut.mutate({
                              sIndex: i,
                              lineIndex: lineIdx,
                              comment: redlineText,
                            })
                          }
                        >
                          Add
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {openComments === i && (
            <div className="mt-3 space-y-2 border-t pt-2">
              {s.comments.map((c, ci) => (
                <div
                  key={ci}
                  className={`rounded border p-2 text-xs ${c.resolved ? "border-emerald-500/20 bg-emerald-500/5" : "bg-muted/40"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.author}</span>
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        toggleMut.mutate({ sIndex: i, cIndex: ci })
                      }
                    >
                      {c.resolved ? "Reopen" : "Resolve"}
                    </button>
                  </div>
                  <div
                    className={
                      c.resolved ? "text-muted-foreground line-through" : ""
                    }
                  >
                    {c.text}
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Your name"
                  value={commentAuthor}
                  onChange={(e) => setCommentAuthor(e.target.value)}
                  className="h-8 w-32 text-xs"
                />
                <Input
                  placeholder="Add a comment…"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button
                  size="sm"
                  disabled={!commentText.trim()}
                  onClick={() => commentMut.mutate(i)}
                >
                  Add
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
      {contract.sections.length === 0 && (
        <div className="py-10 text-center text-sm text-muted-foreground">
          This contract has no sections.
        </div>
      )}

      <AlertDialog
        open={removeIdx !== null}
        onOpenChange={(o) => !o && setRemoveIdx(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this section?</AlertDialogTitle>
            <AlertDialogDescription>
              “{removeIdx !== null ? contract.sections[removeIdx]?.title : ""}”
              and its comments and redlines will be removed from this contract.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeIdx !== null && removeMut.mutate(removeIdx)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Fields ──────────────────────────────────────────────────

function FieldRow({
  field,
  onSave,
}: {
  field: ContractField;
  onSave: (token: string, value: string) => Promise<unknown>;
}) {
  const [val, setVal] = useState(field.value);
  const [saving, setSaving] = useState(false);
  useEffect(() => setVal(field.value), [field.value]);

  const commit = async () => {
    if (val.trim() === field.value.trim()) return;
    setSaving(true);
    try {
      await onSave(field.token, val);
    } catch {
      setVal(field.value);
    } finally {
      setSaving(false);
    }
  };

  const common = {
    id: `f-${field.token}`,
    value: val,
    disabled: !field.editable,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setVal(e.target.value),
    onBlur: commit,
  };

  return (
    <div className="grid items-start gap-2 py-2 sm:grid-cols-[220px_1fr]">
      <Label htmlFor={common.id} className="pt-2 text-sm">
        <span className="flex items-center gap-1.5">
          {field.filled ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
          )}
          {field.label}
        </span>
        <code className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
          {`{{${field.token}}}`}
        </code>
      </Label>
      <div>
        {field.input === "textarea" ? (
          <Textarea
            {...common}
            rows={field.token === "scopeOfWork" ? 4 : 3}
            placeholder={
              field.token === "scopeOfWork"
                ? "One item per line — becomes a numbered list"
                : "Not filled in yet"
            }
          />
        ) : (
          <Input
            {...common}
            type={field.input === "date" ? "date" : "text"}
            inputMode={field.input === "number" ? "decimal" : undefined}
            placeholder="Not filled in yet"
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
        )}
        <p className="mt-1 h-4 text-[11px] text-muted-foreground">
          {saving
            ? "Saving…"
            : !field.editable
              ? "Comes from the deal — change it there"
              : field.unknown
                ? "A custom field of this template"
                : ""}
        </p>
      </div>
    </div>
  );
}

function FieldsTab({
  deal,
  contract,
  onChanged,
}: {
  deal: Deal;
  contract: Contract;
  onChanged: () => void;
}) {
  const [q, setQ] = useState("");
  const [onlyEmpty, setOnlyEmpty] = useState(false);
  const fields = useMemo(() => contract.fields ?? [], [contract.fields]);

  const mut = useMutation({
    mutationFn: ({ token, value }: { token: string; value: string }) =>
      setContractVariable(deal._id, contract._id, token, value),
    onSuccess: onChanged,
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to save the field"),
  });

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const shown = fields.filter(
      (f) =>
        (!onlyEmpty || !f.filled) &&
        (!needle ||
          f.label.toLowerCase().includes(needle) ||
          f.token.toLowerCase().includes(needle)),
    );
    const byGroup = new Map<string, ContractField[]>();
    for (const f of shown) {
      byGroup.set(f.group, [...(byGroup.get(f.group) ?? []), f]);
    }
    const names = Array.from(byGroup.keys());
    const common = COMMON_GROUP_ORDER.filter((g) => byGroup.has(g));
    const rest = names.filter((g) => !COMMON_GROUP_ORDER.includes(g));
    return {
      common: common.map((g) => ({ name: g, items: byGroup.get(g)! })),
      rest: rest.map((g) => ({ name: g, items: byGroup.get(g)! })),
    };
  }, [fields, q, onlyEmpty]);

  if (!fields.length) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        This contract's text has no merge fields.
      </p>
    );
  }

  const section = (
    title: string,
    list: { name: string; items: ContractField[] }[],
  ) =>
    list.length > 0 && (
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        {list.map((g) => (
          <div key={g.name} className="rounded-lg border bg-background px-4">
            <p className="border-b py-2 text-sm font-medium">{g.name}</p>
            <div className="divide-y">
              {g.items.map((f) => (
                <FieldRow
                  key={f.token}
                  field={f}
                  onSave={(token, value) => mut.mutateAsync({ token, value })}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search fields…"
            className="pl-8"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={onlyEmpty} onCheckedChange={setOnlyEmpty} />
          Only fields to fill
        </label>
      </div>
      {section("Common fields", groups.common)}
      {section("This contract's fields", groups.rest)}
      {!groups.common.length && !groups.rest.length && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {onlyEmpty && !q
            ? "Every field has a value."
            : "No fields match your search."}
        </p>
      )}
    </div>
  );
}

// ── Review ──────────────────────────────────────────────────

function ReviewTab({ contract }: { contract: Contract }) {
  const responses = contract.reviewLoop?.responses ?? [];
  const sent = contract.reviewLoop?.tokens ?? [];
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <p className="rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
        <b>Send for review</b> emails a secure link to each party on the deal
        who has contract-review access. They can comment, redline and approve or
        request changes — their answers appear here.
      </p>
      {sent.length > 0 && (
        <div className="rounded-lg border bg-background p-4">
          <p className="mb-2 text-sm font-medium">Sent to</p>
          <ul className="space-y-1 text-sm">
            {sent.map((t) => (
              <li key={t.partyEmail} className="flex justify-between gap-2">
                <span>
                  {t.partyName}{" "}
                  <span className="text-muted-foreground">
                    · {t.partyEmail}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(t.sentAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {responses.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {sent.length ? "No responses yet." : "Not sent for review yet."}
        </p>
      )}
      {responses.map((r, i) => (
        <div
          key={i}
          className={`rounded-md border p-3 text-sm ${r.decision === "Approved" ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}
        >
          <div className="flex justify-between">
            <span className="font-medium">{r.partyName}</span>
            <Badge variant="outline">{r.decision}</Badge>
          </div>
          {r.comment && (
            <div className="mt-1 text-xs text-muted-foreground">
              {r.comment}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
