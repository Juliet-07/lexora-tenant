import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  ExternalLink,
  FilePlus2,
  FileText,
  Loader2,
  Pencil,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocumentEditorDialog } from "@/components/DocumentEditorDialog";
import { useMergeFieldRegistry } from "@/hooks/use-merge-field-registry";
import { useToast } from "@/hooks/use-toast";
import {
  deleteFundDoc,
  downloadFundDoc,
  draftFundDoc,
  fetchFundDoc,
  fetchFundDocMeta,
  fetchFundDocs,
  updateFundDoc,
  uploadFundDoc,
  type CapitalCall,
  type CapitalCommitment,
  type Distribution,
  type FundDocTemplateOption,
  type FundVaultDoc,
} from "@/lib/crm/finance-api";
import { StatusPill, errMessage, fmtDate, today } from "./fundShared";

const statusKind = (s: string) =>
  s === "Executed" || s === "Final"
    ? "green"
    : s === "Sent for signature" || s === "Under review"
      ? "amber"
      : s === "Superseded" || s === "Archived"
        ? "grey"
        : "blue";

// The fund's document vault: legal and formation documents, regulatory
// filings, notices and reports for every fund — uploaded, or drafted from
// the template library with the fund's own details merged in.
export function DocumentsPanel({
  fundId,
  commitments,
  capitalCalls,
  distributions,
}: {
  fundId: string;
  commitments: CapitalCommitment[];
  capitalCalls: CapitalCall[];
  distributions: Distribution[];
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  // Teaches the Merge Fields panel the labels of fund fields.
  useMergeFieldRegistry("fund");

  const key = ["fundDocs", fundId];
  const { data: meta } = useQuery({
    queryKey: ["fundDocMeta", fundId],
    queryFn: () => fetchFundDocMeta(fundId),
  });
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => fetchFundDocs(fundId),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: key });

  const [uploadOpen, setUploadOpen] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [editing, setEditing] = useState<FundVaultDoc | null>(null);
  const [filter, setFilter] = useState("all");

  const del = useMutation({
    mutationFn: (id: string) => deleteFundDoc(fundId, id),
    onSuccess: () => {
      refresh();
      toast({ title: "Document removed" });
    },
    onError: (e) =>
      toast({
        title: "Could not remove",
        description: errMessage(e),
        variant: "destructive",
      }),
  });
  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: string }) =>
      updateFundDoc(fundId, v.id, { status: v.status }),
    onSuccess: refresh,
    onError: (e) =>
      toast({
        title: "Could not update",
        description: errMessage(e),
        variant: "destructive",
      }),
  });

  const open = async (d: FundVaultDoc) => {
    if (d.file) {
      window.open(d.file.url, "_blank", "noopener");
      return;
    }
    try {
      setEditing(await fetchFundDoc(fundId, d._id));
    } catch (e) {
      toast({
        title: "Could not open",
        description: errMessage(e),
        variant: "destructive",
      });
    }
  };

  const download = async (d: FundVaultDoc) => {
    try {
      await downloadFundDoc(fundId, d._id, d.file?.name ?? `${d.title}.pdf`);
    } catch (e) {
      toast({
        title: "Could not download",
        description: errMessage(e),
        variant: "destructive",
      });
    }
  };

  const groups = (data?.groups ?? []).filter(
    (g) => filter === "all" || g.group === filter,
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Fund documents</CardTitle>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Every document for the fund in one place. Upload what you already
              have, or draft a new one from the template library — the fund, GP,
              LP, call and distribution details are filled in for you.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setUploadOpen(true)}
            >
              <Upload className="mr-2 h-4 w-4" /> Upload
            </Button>
            <Button size="sm" onClick={() => setDraftOpen(true)}>
              <Wand2 className="mr-2 h-4 w-4" /> Draft from template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center gap-2">
            <Label className="text-xs">Show</Label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All documents ({data?.total ?? 0})
                </SelectItem>
                {(meta?.groups ?? []).map((g) => (
                  <SelectItem key={g.group} value={g.group}>
                    {g.group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : !groups.length ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">No documents yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Add the LPA, subscription agreements, registrations and notices
                so they sit with the fund.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groups.map((g) => (
                <div key={g.group}>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {g.group}
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="w-44">Status</TableHead>
                        <TableHead>Access</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {g.documents.map((d) => (
                        <TableRow key={d._id}>
                          <TableCell>
                            <div className="font-medium">{d.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {d.category} · {d.version}
                              {d.lpName ? ` · ${d.lpName}` : ""}
                              {d.authority ? ` · ${d.authority}` : ""}
                            </div>
                            {d.templateName && (
                              <div className="text-[11px] text-muted-foreground">
                                from “{d.templateName}”
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {fmtDate(d.docDate)}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={d.status}
                              onValueChange={(status) =>
                                setStatus.mutate({ id: d._id, status })
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(meta?.statuses ?? [d.status]).map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <StatusPill
                              label={d.confidentiality}
                              kind={
                                d.confidentiality.startsWith("GP")
                                  ? "amber"
                                  : "grey"
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {d.file ? (
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Open file"
                                onClick={() => open(d)}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Edit document"
                                onClick={() => open(d)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              title={d.file ? "Download" : "Download as PDF"}
                              onClick={() => download(d)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Delete"
                              onClick={() => {
                                if (confirm(`Delete “${d.title}”?`))
                                  del.mutate(d._id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <UploadDocDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        fundId={fundId}
        meta={meta}
        commitments={commitments}
        onDone={refresh}
      />
      <DraftDocDialog
        open={draftOpen}
        onOpenChange={setDraftOpen}
        fundId={fundId}
        templates={meta?.templates ?? []}
        commitments={commitments}
        capitalCalls={capitalCalls}
        distributions={distributions}
        onCreated={(d) => {
          refresh();
          setEditing(d);
        }}
      />
      <DocEditor
        doc={editing}
        fundId={fundId}
        onClose={() => setEditing(null)}
        onSaved={refresh}
      />
    </div>
  );
}

function DocEditor({
  doc,
  fundId,
  onClose,
  onSaved,
}: {
  doc: FundVaultDoc | null;
  fundId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const save = useMutation({
    mutationFn: (v: { html: string; values?: Record<string, string> }) =>
      updateFundDoc(fundId, doc!._id, {
        content: v.html,
        mergeValues:
          v.values && Object.keys(v.values).length
            ? { ...(doc!.mergeValues ?? {}), ...v.values }
            : undefined,
      }),
    onSuccess: () => {
      onSaved();
      onClose();
      toast({ title: "Document saved" });
    },
    onError: (e) =>
      toast({
        title: "Could not save",
        description: errMessage(e),
        variant: "destructive",
      }),
  });
  return (
    <DocumentEditorDialog
      open={!!doc}
      title={doc?.title ?? ""}
      subtitle={[doc?.category, doc?.lpName, doc?.version]
        .filter(Boolean)
        .join(" · ")}
      value={doc?.content ?? ""}
      onClose={onClose}
      saving={save.isPending}
      mergeFields
      mergeRegistry="fund"
      onSave={(html, values) => save.mutate({ html, values })}
    />
  );
}

function UploadDocDialog({
  open,
  onOpenChange,
  fundId,
  meta,
  commitments,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  fundId: string;
  meta?: Awaited<ReturnType<typeof fetchFundDocMeta>>;
  commitments: CapitalCommitment[];
  onDone: () => void;
}) {
  const { toast } = useToast();
  const blank = () => ({
    category: "",
    title: "",
    docDate: today(),
    version: "v1.0",
    commitmentId: "",
    status: "Draft",
    confidentiality: "Fund-level (all LPs)",
    authority: "",
    filedOn: "",
    notes: "",
  });
  const [f, setF] = useState(blank());
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    if (open) {
      setF(blank());
      setFile(null);
    }
  }, [open]);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const group = meta?.groups.find((g) =>
    g.categories.includes(f.category),
  )?.group;
  const regulatory = group === "Regulatory";
  const lpScoped = /LP|Subscription|Side Letter|KYC/i.test(f.category);

  const run = useMutation({
    mutationFn: () =>
      uploadFundDoc(
        fundId,
        {
          ...f,
          commitmentId: f.commitmentId || undefined,
          authority: regulatory ? f.authority : undefined,
          filedOn: regulatory ? f.filedOn : undefined,
          confidentiality: f.commitmentId
            ? "LP-specific (restricted)"
            : f.confidentiality,
        },
        file!,
      ),
    onSuccess: () => {
      onDone();
      onOpenChange(false);
      toast({ title: "Document uploaded" });
    },
    onError: (e) =>
      toast({
        title: "Could not upload",
        description: errMessage(e),
        variant: "destructive",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload a fund document</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Category *</Label>
            <Select
              value={f.category}
              onValueChange={(v) => set({ category: v, title: f.title || v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category…" />
              </SelectTrigger>
              <SelectContent>
                {(meta?.groups ?? []).map((g) => (
                  <SelectGroup key={g.group}>
                    <SelectLabel>{g.group}</SelectLabel>
                    {g.categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title *</Label>
            <Input
              value={f.title}
              onChange={(e) => set({ title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Document date *</Label>
              <Input
                type="date"
                value={f.docDate}
                onChange={(e) => set({ docDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Version</Label>
              <Input
                value={f.version}
                onChange={(e) => set({ version: e.target.value })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={f.status}
                onValueChange={(v) => set({ status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(meta?.statuses ?? []).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Confidentiality</Label>
              <Select
                value={
                  f.commitmentId
                    ? "LP-specific (restricted)"
                    : f.confidentiality
                }
                disabled={!!f.commitmentId}
                onValueChange={(v) => set({ confidentiality: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(meta?.confidentiality ?? []).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(lpScoped || f.commitmentId) && (
            <div>
              <Label>Investor (if specific to one LP)</Label>
              <Select
                value={f.commitmentId || "__none"}
                onValueChange={(v) =>
                  set({ commitmentId: v === "__none" ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Fund-wide</SelectItem>
                  {commitments.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.lpName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {regulatory && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Authority</Label>
                <Input
                  value={f.authority}
                  onChange={(e) => set({ authority: e.target.value })}
                />
              </div>
              <div>
                <Label>Filed on</Label>
                <Input
                  type="date"
                  value={f.filedOn}
                  onChange={(e) => set({ filedOn: e.target.value })}
                />
              </div>
            </div>
          )}
          <div>
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={f.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />
          </div>
          <div>
            <Label>File *</Label>
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Up to 50 MB.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={
              !file ||
              !f.category ||
              !f.title.trim() ||
              !f.docDate ||
              run.isPending
            }
            onClick={() => run.mutate()}
          >
            {run.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DraftDocDialog({
  open,
  onOpenChange,
  fundId,
  templates,
  commitments,
  capitalCalls,
  distributions,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  fundId: string;
  templates: FundDocTemplateOption[];
  commitments: CapitalCommitment[];
  capitalCalls: CapitalCall[];
  distributions: Distribution[];
  onCreated: (d: FundVaultDoc) => void;
}) {
  const { toast } = useToast();
  const [tpl, setTpl] = useState<string>("blank");
  const [title, setTitle] = useState("");
  const [lp, setLp] = useState("");
  const [callId, setCallId] = useState("");
  const [distId, setDistId] = useState("");
  const [category, setCategory] = useState("Correspondence");

  useEffect(() => {
    if (open) {
      setTpl("blank");
      setTitle("");
      setLp("");
      setCallId("");
      setDistId("");
    }
  }, [open]);

  const t = templates.find((x) => x.key === tpl);
  const needs = t?.needs ?? "none";
  const issued = capitalCalls.filter((c) => c.status !== "Draft");
  const lpName = commitments.find((c) => c._id === lp)?.lpName;

  const pick = (k: string) => {
    setTpl(k);
    const x = templates.find((y) => y.key === k);
    if (x && !title) setTitle(x.title);
  };

  const ready =
    !!title.trim() &&
    (needs === "none" ||
      (needs === "lp" && !!lp) ||
      (needs === "call" && !!lp && !!callId) ||
      (needs === "distribution" && !!lp && !!distId));

  const bySource = useMemo(
    () => ({
      builtIn: templates.filter((x) => x.source === "built-in"),
      library: templates.filter((x) => x.source === "library"),
    }),
    [templates],
  );

  const run = useMutation({
    mutationFn: () =>
      draftFundDoc(fundId, {
        templateKey: tpl === "blank" ? undefined : tpl,
        title:
          title.trim() +
          (lpName && !title.includes(lpName) ? ` — ${lpName}` : ""),
        category: tpl === "blank" ? category : undefined,
        commitmentId: lp || undefined,
        callId: callId || undefined,
        distributionId: distId || undefined,
      }),
    onSuccess: async (d) => {
      onOpenChange(false);
      try {
        onCreated(await fetchFundDoc(fundId, d._id));
      } catch {
        onCreated(d);
      }
      toast({
        title: "Draft created",
        description: "Check the highlighted fields in the Merge Fields panel.",
      });
    },
    onError: (e) =>
      toast({
        title: "Could not draft",
        description: errMessage(e),
        variant: "destructive",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Draft a document</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Pick a template. The fund's details are merged in; anything the data
            can't supply is left for you to fill in the editor.
          </p>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => pick("blank")}
              className={`rounded-md border p-3 text-left hover:bg-muted/50 ${tpl === "blank" ? "border-primary bg-muted/60" : ""}`}
            >
              <FilePlus2 className="mb-1 h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Blank document</div>
              <div className="text-xs text-muted-foreground">
                Start from an empty page
              </div>
            </button>
            {[...bySource.builtIn, ...bySource.library].map((x) => (
              <button
                key={x.key}
                onClick={() => pick(x.key)}
                className={`rounded-md border p-3 text-left hover:bg-muted/50 ${tpl === x.key ? "border-primary bg-muted/60" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{x.title}</span>
                  <StatusPill
                    label={
                      x.source === "library" ? "Library" : x.tag || "Template"
                    }
                    kind={x.source === "library" ? "blue" : "grey"}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {x.description}
                </div>
              </button>
            ))}
          </div>

          <div>
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          {tpl === "blank" && (
            <div>
              <Label>Filed under</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
          )}
          {needs !== "none" && (
            <div>
              <Label>Investor *</Label>
              <Select value={lp} onValueChange={setLp}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an LP…" />
                </SelectTrigger>
                <SelectContent>
                  {commitments.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.lpName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {needs === "call" && (
            <div>
              <Label>Capital call *</Label>
              <Select value={callId} onValueChange={setCallId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a call…" />
                </SelectTrigger>
                <SelectContent>
                  {issued.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.ref} — {c.purpose}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {needs === "distribution" && (
            <div>
              <Label>Distribution *</Label>
              <Select value={distId} onValueChange={setDistId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a distribution…" />
                </SelectTrigger>
                <SelectContent>
                  {distributions.map((d) => (
                    <SelectItem key={d._id} value={d._id}>
                      {d.ref} — {fmtDate(d.date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!ready || run.isPending}
            onClick={() => run.mutate()}
          >
            {run.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
