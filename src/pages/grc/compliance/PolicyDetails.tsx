import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import jsPDF from "jspdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Plus,
  Mail,
  BarChart3,
  ShieldCheck,
  Eye,
  FileDown,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  fetchPolicy,
  updatePolicyProperties,
  addPolicySection,
  updatePolicySection,
  setPolicyStatus,
  publishPolicy,
  addPolicyComment,
  sendPolicyReminders,
  sendBoardApprovalReminders,
  REVIEW_FREQUENCIES,
  ACK_REQUIREMENTS,
  POLICY_TYPES,
  type Policy,
  type PolicyType,
  type ReviewFrequency,
  type AckRequirement,
} from "@/lib/grc/policy-api";

const statusTone: Record<string, string> = {
  Published: "text-emerald-600 border-emerald-500/30 bg-emerald-500/10",
  "Under review": "text-amber-600 border-amber-500/30 bg-amber-500/10",
  "Pending board approval": "text-blue-600 border-blue-500/30 bg-blue-500/10",
  Draft: "text-muted-foreground",
};

export default function PolicyDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const { data: policy, isLoading } = useQuery({
    queryKey: ["grc-policy", id],
    queryFn: () => fetchPolicy(id!),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["grc-policy", id] });
    queryClient.invalidateQueries({ queryKey: ["grc-policies"] });
    queryClient.invalidateQueries({ queryKey: ["grc-policy-stats"] });
  };
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const [publishOpen, setPublishOpen] = useState(false);
  const [tab, setTab] = useState("editor");

  const reviewMut = useMutation({
    mutationFn: () => setPolicyStatus(id!, "Under review"),
    onSuccess: () => {
      invalidate();
      toast({ title: "Review cycle started" });
    },
    onError: onErr("Failed to start review"),
  });
  const remindMut = useMutation({
    mutationFn: () => sendPolicyReminders(id!),
    onSuccess: (r) =>
      toast({
        title: "Reminders sent",
        description: `${r.remindersSent} reminder(s) sent.`,
      }),
    onError: onErr("Failed to send reminders"),
  });
  const remindBoardMut = useMutation({
    mutationFn: () => sendBoardApprovalReminders(id!),
    onSuccess: (r) =>
      toast({
        title: "Board reminded",
        description: `${r.remindersSent} reminder(s) sent.`,
      }),
    onError: onErr("Failed to send reminders"),
  });

  if (isLoading || !policy)
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading policy…
      </div>
    );

  const outstanding = policy.assignedCount - policy.acknowledgedCount;

  // "Send for review" only makes sense once the policy's own review
  // cadence (reviewFrequency → nextReviewDue, set at publish time) has
  // actually arrived — starting a review early would reset nothing
  // and just confuse the "next review due" date shown elsewhere.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextReviewDate = policy.nextReviewDue
    ? new Date(policy.nextReviewDue)
    : null;
  if (nextReviewDate) nextReviewDate.setHours(0, 0, 0, 0);
  const reviewNotYetDue =
    !!nextReviewDate && nextReviewDate.getTime() > today.getTime();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => nav("/grc/compliance/policies")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Policies &amp;
          Procedures
        </Button>
        <div className="flex gap-2">
          {outstanding > 0 && policy.status === "Published" && (
            <Button
              variant="outline"
              size="sm"
              disabled={remindMut.isPending}
              onClick={() => remindMut.mutate()}
            >
              <Mail className="h-4 w-4 mr-1" /> Send reminders to outstanding
            </Button>
          )}
          {policy.status === "Pending board approval" && (
            <Button
              variant="outline"
              size="sm"
              disabled={remindBoardMut.isPending}
              onClick={() => remindBoardMut.mutate()}
            >
              <Mail className="h-4 w-4 mr-1" /> Remind board
            </Button>
          )}
        </div>
      </div>

      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <div className="flex gap-2 mb-1">
            <Badge variant="secondary">{policy.category}</Badge>
            <Badge variant="outline">
              {policy.type === "board" ? "Board only" : "Organisation-wide"}
            </Badge>
            <Badge variant="outline" className={statusTone[policy.status]}>
              {policy.status}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold">{policy.title}</h1>
          <p className="text-sm text-muted-foreground">
            Owner: {policy.owner || "—"} · Version: {policy.version} · Last
            reviewed:{" "}
            {policy.lastReviewed ? policy.lastReviewed.slice(0, 10) : "—"} ·
            Review frequency: {policy.reviewFrequency} · Approval:{" "}
            {policy.approvalAuthority || "—"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {policy.status === "Published" ? (
            <Button
              variant="outline"
              size="sm"
              disabled={reviewMut.isPending || reviewNotYetDue}
              title={
                reviewNotYetDue
                  ? `Not due for review until ${nextReviewDate!.toISOString().slice(0, 10)}`
                  : undefined
              }
              onClick={() => reviewMut.mutate()}
            >
              {reviewNotYetDue
                ? `Review due ${nextReviewDate!.toISOString().slice(0, 10)}`
                : "Send for review"}
            </Button>
          ) : policy.status === "Pending board approval" ? (
            <Button size="sm" disabled>
              Awaiting board approval
            </Button>
          ) : (
            <Button size="sm" onClick={() => setPublishOpen(true)}>
              {policy.boardApprovalRequired
                ? "Approve & send to board"
                : "Publish"}
            </Button>
          )}
        </div>
      </div>

      {policy.boardApprovalRequired && policy.boardApprovalSummary && (
        <BoardApprovalCard policy={policy} />
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="acknowledgements">Acknowledgements</TabsTrigger>
          <TabsTrigger value="history">Version history</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="mt-4">
          <EditorTab policy={policy} invalidate={invalidate} onErr={onErr} />
        </TabsContent>
        <TabsContent value="properties" className="mt-4">
          <PropertiesTab
            policy={policy}
            invalidate={invalidate}
            onErr={onErr}
          />
        </TabsContent>
        <TabsContent value="acknowledgements" className="mt-4">
          <AcknowledgementsTab policy={policy} />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <HistoryTab policy={policy} />
        </TabsContent>
        <TabsContent value="comments" className="mt-4">
          <CommentsTab policy={policy} invalidate={invalidate} onErr={onErr} />
        </TabsContent>
      </Tabs>

      <PublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        policyId={policy._id}
        boardApprovalRequired={policy.boardApprovalRequired}
        onDone={invalidate}
      />
    </div>
  );
}

// ── Board approval card ──────────────────────────────────────

function BoardApprovalCard({ policy }: { policy: Policy }) {
  const summary = policy.boardApprovalSummary;
  if (!summary) return null;
  return (
    <Card className="border-blue-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-blue-600" /> Board approval —{" "}
          {summary.approved} of {summary.total} approved
          {summary.rejected > 0 && (
            <Badge
              variant="outline"
              className="text-rose-600 border-rose-500/30 bg-rose-500/10"
            >
              {summary.rejected} declined
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Board member</TableHead>
              <TableHead>Decision</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Decided</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.rows.map((r) => (
              <TableRow key={r.email}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      r.decision === "Approved"
                        ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
                        : r.decision === "Rejected"
                          ? "text-rose-600 border-rose-500/30 bg-rose-500/10"
                          : "text-muted-foreground"
                    }
                  >
                    {r.decision}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{r.notes || "—"}</TableCell>
                <TableCell className="text-xs">
                  {r.decidedAt ? r.decidedAt.slice(0, 10) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── Editor tab ────────────────────────────────────────────────

function EditorTab({
  policy,
  invalidate,
  onErr,
}: {
  policy: Policy;
  invalidate: () => void;
  onErr: (t: string) => (e: any) => void;
}) {
  const [activeId, setActiveId] = useState(policy.sections[0]?.id ?? null);
  useEffect(() => {
    if (!policy.sections.find((s) => s.id === activeId)) {
      setActiveId(policy.sections[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policy.sections.length]);

  const addMut = useMutation({
    mutationFn: () =>
      addPolicySection(policy._id, { title: "New section", content: "" }),
    onSuccess: (updated) => {
      invalidate();
      const added = updated.sections[updated.sections.length - 1];
      if (added) setActiveId(added.id);
    },
    onError: onErr("Failed to add section"),
  });

  const active = policy.sections.find((s) => s.id === activeId) ?? null;

  const [previewOpen, setPreviewOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportPdf = async () => {
    setExporting(true);
    try {
      await exportPolicyPdf(policy);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPreviewOpen(true)}
        >
          <Eye className="h-4 w-4 mr-1" /> Preview
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={exporting}
          onClick={exportPdf}
        >
          <FileDown className="h-4 w-4 mr-1" />
          {exporting ? "Exporting…" : "Export PDF"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-[200px_1fr_260px] gap-4">
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-2 px-1">
            SECTIONS
          </div>
          <div className="space-y-0.5">
            {policy.sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveId(s.id)}
                className={`w-full text-left text-sm px-2 py-1.5 rounded ${
                  s.id === activeId
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted"
                }`}
              >
                {s.order + 1}. {s.title}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full mt-2"
            disabled={addMut.isPending}
            onClick={() => addMut.mutate()}
          >
            <Plus className="h-4 w-4 mr-1" /> Add section
          </Button>
        </div>

        {active ? (
          <SectionEditor
            key={active.id}
            policyId={policy._id}
            section={active}
            invalidate={invalidate}
            onErr={onErr}
          />
        ) : (
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              No sections yet — add one to start writing.
            </CardContent>
          </Card>
        )}

        <PropertiesSidebar
          policy={policy}
          invalidate={invalidate}
          onErr={onErr}
        />
      </div>

      <PolicyPreviewDialog
        policy={policy}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}

// ── Preview dialog + PDF export ──────────────────────────────
// Both read the policy exactly as it will be seen by an approver or
// an acknowledging staff member — the full assembled document, not
// one section at a time like the editor's own left-hand list.

function PolicyPreviewDialog({
  policy,
  open,
  onOpenChange,
}: {
  policy: Policy;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{policy.title}</DialogTitle>
        </DialogHeader>
        <div className="text-xs text-muted-foreground -mt-2 mb-2">
          Version {policy.version} · Owner: {policy.owner || "—"} · Approval:{" "}
          {policy.approvalAuthority || "—"}
        </div>
        <div className="space-y-6">
          {policy.sections.map((s) => (
            <div key={s.id}>
              <h3 className="text-base font-semibold mb-2">{s.title}</h3>
              <div
                className="prose prose-sm max-w-none text-foreground"
                dangerouslySetInnerHTML={{
                  __html: s.content || "<p><em>No content yet.</em></p>",
                }}
              />
            </div>
          ))}
          {policy.sections.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No sections yet.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c] as string,
  );
}

// jsPDF's own doc.html() plugin (tried first here previously) rendered
// a blank page for this content — a known failure mode when the
// source element is positioned off-screen (e.g. left:-9999px), which
// throws off html2canvas's viewport-relative capture rect. Rendering
// with html2canvas directly, on-screen but hidden behind everything
// via a negative z-index at the top-left of the page, then slicing
// the resulting canvas into page-sized chunks ourselves, is the
// standard workaround and doesn't depend on jsPDF's own html2canvas
// wrapper at all.
async function exportPolicyPdf(policy: Policy): Promise<void> {
  const WIDTH_PX = 700;
  const container = document.createElement("div");
  container.style.cssText =
    `position:absolute;left:0;top:0;width:${WIDTH_PX}px;z-index:-1000;` +
    "padding:32px;font-family:Georgia,serif;color:#1a1a1a;background:#fff;";
  container.innerHTML = `
    <h1 style="font-size:22px;margin:0 0 6px;">${escapeHtml(policy.title)}</h1>
    <p style="font-size:11px;color:#666;margin:0 0 24px;">
      Version ${escapeHtml(policy.version)} · Owner: ${escapeHtml(policy.owner || "—")} · Approval authority: ${escapeHtml(policy.approvalAuthority || "—")}
    </p>
    ${policy.sections
      .map(
        (s) =>
          `<h2 style="font-size:15px;margin:20px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px;">${escapeHtml(s.title)}</h2>
           <div style="font-size:12px;line-height:1.65;">${s.content || "<p style='color:#999'>No content.</p>"}</div>`,
      )
      .join("")}
  `;
  document.body.appendChild(container);

  try {
    // Let the browser actually paint the container (fonts, layout)
    // before capturing it.
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );

    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      windowWidth: WIDTH_PX,
    });

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;

    // pt-per-canvas-px scale, then how many source canvas px make up
    // one page's worth of vertical space.
    const ptPerPx = usableWidth / canvas.width;
    const pagePxHeight = Math.floor(usableHeight / ptPerPx);

    let renderedPx = 0;
    let firstPage = true;
    while (renderedPx < canvas.height) {
      const sliceHeightPx = Math.min(pagePxHeight, canvas.height - renderedPx);
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeightPx;
      const ctx = sliceCanvas.getContext("2d")!;
      ctx.drawImage(
        canvas,
        0,
        renderedPx,
        canvas.width,
        sliceHeightPx,
        0,
        0,
        canvas.width,
        sliceHeightPx,
      );

      if (!firstPage) pdf.addPage();
      pdf.addImage(
        sliceCanvas.toDataURL("image/png"),
        "PNG",
        margin,
        margin,
        usableWidth,
        sliceHeightPx * ptPerPx,
      );

      renderedPx += sliceHeightPx;
      firstPage = false;
    }

    pdf.save(`${policy.title.replace(/[^a-z0-9]+/gi, "_")}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

// Section content editing uses the same shared RichTextEditor as the
// rest of the app (contracts, resolutions, codes, meeting notices,
// …) instead of a policy-only toolbar — one editor, uniform
// formatting (font, size, paragraph/heading, alignment, tables)
// everywhere it appears.
function SectionEditor({
  policyId,
  section,
  invalidate,
  onErr,
}: {
  policyId: string;
  section: Policy["sections"][number];
  invalidate: () => void;
  onErr: (t: string) => (e: any) => void;
}) {
  const [title, setTitle] = useState(section.title);
  const [content, setContent] = useState(section.content);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveMut = useMutation({
    mutationFn: (dto: { title?: string; content?: string }) =>
      updatePolicySection(policyId, section.id, dto),
    onSuccess: () => {
      setSavedAt(new Date());
      invalidate();
    },
    onError: onErr("Failed to save section"),
  });

  const handleContentChange = (html: string) => {
    setContent(html);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(
      () => saveMut.mutate({ content: html }),
      1500,
    );
  };

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Input
            className="font-semibold text-base border-none px-0 focus-visible:ring-0"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title !== section.title && saveMut.mutate({ title })}
          />
          <span className="text-[11px] text-muted-foreground shrink-0">
            {saveMut.isPending
              ? "Saving…"
              : savedAt
                ? `Auto-saved ${savedAt.toLocaleTimeString()}`
                : ""}
          </span>
        </div>
        <RichTextEditor
          value={content}
          onChange={handleContentChange}
          minHeight={300}
          placeholder="Start writing this section…"
        />
      </CardContent>
    </Card>
  );
}

// ── shared properties fields (used by both the editor sidebar and
// the Properties tab) ───────────────────────────────────────────

function PropertiesSidebar({
  policy,
  invalidate,
  onErr,
}: {
  policy: Policy;
  invalidate: () => void;
  onErr: (t: string) => (e: any) => void;
}) {
  const saveMut = useMutation({
    mutationFn: (dto: Parameters<typeof updatePolicyProperties>[1]) =>
      updatePolicyProperties(policy._id, dto),
    onSuccess: invalidate,
    onError: onErr("Failed to update"),
  });

  return (
    <Card className="h-fit">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">DOCUMENT PROPERTIES</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 text-sm">
        <div>
          <Label className="text-xs">Status</Label>
          <div className="text-sm font-medium">{policy.status}</div>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground text-xs">Version</span>
          <span className="font-medium">{policy.version}</span>
        </div>
        <div>
          <Label className="text-xs">Owner</Label>
          <Input
            className="h-8"
            defaultValue={policy.owner}
            onBlur={(e) =>
              e.target.value !== policy.owner &&
              saveMut.mutate({ owner: e.target.value })
            }
          />
        </div>
        <div>
          <Label className="text-xs">Approval authority</Label>
          <Input
            className="h-8"
            defaultValue={policy.approvalAuthority}
            onBlur={(e) =>
              e.target.value !== policy.approvalAuthority &&
              saveMut.mutate({ approvalAuthority: e.target.value })
            }
          />
        </div>
        <div>
          <Label className="text-xs">Review frequency</Label>
          <Select
            value={policy.reviewFrequency}
            onValueChange={(v: ReviewFrequency) =>
              saveMut.mutate({ reviewFrequency: v })
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REVIEW_FREQUENCIES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground text-xs">Last reviewed</span>
          <span className="font-medium">
            {policy.lastReviewed ? policy.lastReviewed.slice(0, 10) : "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground text-xs">Next review due</span>
          <span
            className={`font-medium ${policy.computedOverdue ? "text-rose-600" : ""}`}
          >
            {policy.nextReviewDue ? policy.nextReviewDue.slice(0, 10) : "—"}
          </span>
        </div>
        <div>
          <Label className="text-xs">Linked regulations</Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {policy.linkedRegulationsOrStandards.map((r) => (
              <Badge key={r} variant="outline" className="text-[10px]">
                {r}
              </Badge>
            ))}
            {policy.linkedRegulationsOrStandards.length === 0 && (
              <span className="text-xs text-muted-foreground">None</span>
            )}
          </div>
        </div>
        <div>
          <Label className="text-xs">Acknowledgement required</Label>
          <Select
            value={policy.acknowledgementRequirement}
            onValueChange={(v: AckRequirement) =>
              saveMut.mutate({ acknowledgementRequirement: v })
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACK_REQUIREMENTS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Acknowledgement audience</Label>
          <Select
            value={policy.type}
            onValueChange={(v: PolicyType) => saveMut.mutate({ type: v })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POLICY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-start gap-2 pt-1">
          <Checkbox
            checked={policy.boardApprovalRequired}
            onCheckedChange={(v) =>
              saveMut.mutate({ boardApprovalRequired: Boolean(v) })
            }
          />
          <Label className="text-xs font-normal leading-snug">
            Require board approval before publishing
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Properties tab ───────────────────────────────────────────

function PropertiesTab({
  policy,
  invalidate,
  onErr,
}: {
  policy: Policy;
  invalidate: () => void;
  onErr: (t: string) => (e: any) => void;
}) {
  const saveMut = useMutation({
    mutationFn: (dto: Parameters<typeof updatePolicyProperties>[1]) =>
      updatePolicyProperties(policy._id, dto),
    onSuccess: invalidate,
    onError: onErr("Failed to update"),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Policy information</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Policy title</Label>
            <Input
              defaultValue={policy.title}
              onBlur={(e) =>
                e.target.value !== policy.title &&
                saveMut.mutate({ title: e.target.value })
              }
            />
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Input
              defaultValue={policy.category}
              onBlur={(e) =>
                e.target.value !== policy.category &&
                saveMut.mutate({ category: e.target.value })
              }
            />
          </div>
          <div>
            <Label className="text-xs">Document reference</Label>
            <Input
              defaultValue={policy.documentReference}
              onBlur={(e) =>
                e.target.value !== policy.documentReference &&
                saveMut.mutate({ documentReference: e.target.value })
              }
            />
          </div>
          <div>
            <Label className="text-xs">Effective date</Label>
            <Input
              type="date"
              defaultValue={policy.effectiveDate?.slice(0, 10) ?? ""}
              onBlur={(e) =>
                e.target.value &&
                saveMut.mutate({ effectiveDate: e.target.value })
              }
            />
          </div>
          <div>
            <Label className="text-xs">Supersedes</Label>
            <Input
              defaultValue={policy.supersedes}
              placeholder="e.g. AML Policy v4 (Aug 2024)"
              onBlur={(e) =>
                e.target.value !== policy.supersedes &&
                saveMut.mutate({ supersedes: e.target.value })
              }
            />
          </div>
          <div>
            <Label className="text-xs">Related policies</Label>
            <Input
              defaultValue={policy.relatedPolicies.join(", ")}
              placeholder="e.g. Client Acceptance, Sanctions Screening SOP"
              onBlur={(e) =>
                saveMut.mutate({
                  relatedPolicies: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Description / scope</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={3}
            defaultValue={policy.description}
            onBlur={(e) =>
              e.target.value !== policy.description &&
              saveMut.mutate({ description: e.target.value })
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Approval history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Approved by</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policy.approvalHistory
                .slice()
                .reverse()
                .map((a, i) => (
                  <TableRow key={i}>
                    <TableCell>{a.version}</TableCell>
                    <TableCell>{a.approvedBy}</TableCell>
                    <TableCell>{a.date.slice(0, 10)}</TableCell>
                    <TableCell className="text-xs">{a.notes || "—"}</TableCell>
                  </TableRow>
                ))}
              {policy.approvalHistory.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-sm text-muted-foreground py-6"
                  >
                    Not yet published.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Acknowledgements tab ─────────────────────────────────────

function AcknowledgementsTab({ policy }: { policy: Policy }) {
  const exportReport = () => {
    const rows = [
      [
        "Staff member",
        "Role",
        "Version ack.",
        "Date acknowledged",
        "Method",
        "Status",
      ],
      ...policy.rosterStatus.map((r) => [
        r.name,
        r.role,
        r.versionAcknowledged ?? "",
        r.dateAcknowledged ? r.dateAcknowledged.slice(0, 10) : "",
        r.method ?? "",
        r.status,
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${policy.title.replace(/[^a-z0-9]+/gi, "_")}_acknowledgements.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const remindMut = useMutation({
    mutationFn: () => sendPolicyReminders(policy._id),
    onSuccess: (r) =>
      toast({
        title: "Reminders sent",
        description: `${r.remindersSent} reminder(s) sent.`,
      }),
    onError: (err: any) =>
      toast({
        title: "Failed to send reminders",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  if (policy.acknowledgementRequirement === "No acknowledgement required") {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          This policy is configured with no acknowledgement requirement.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div>
              <div className="font-medium text-sm">
                Acknowledgement rate:{" "}
                <span className="text-amber-600">{policy.ackRate ?? 0}%</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {policy.acknowledgedCount} of {policy.assignedCount} assigned
                staff have acknowledged this policy (current version{" "}
                {policy.version})
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={remindMut.isPending}
                onClick={() => remindMut.mutate()}
              >
                <Mail className="h-4 w-4 mr-1" /> Send reminders to outstanding
              </Button>
              <Button size="sm" variant="outline" onClick={exportReport}>
                <BarChart3 className="h-4 w-4 mr-1" /> Export report
              </Button>
            </div>
          </div>
          <Progress value={policy.ackRate ?? 0} className="h-2" />
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-muted/30 p-3 text-sm">
        <b>How acknowledgement works</b>
        <p className="text-muted-foreground mt-1">
          When a policy is published or updated, Lexora sends an acknowledgement
          request to all assigned staff. Each person must open the policy, read
          it, and click "I acknowledge". Re- acknowledgement is triggered
          automatically when a new version is published if the policy is
          configured to require it. Acknowledgements are timestamped and stored
          for regulatory evidence.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Individual acknowledgement status
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Version ack.</TableHead>
                <TableHead>Date acknowledged</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policy.rosterStatus.map((r) => (
                <TableRow
                  key={r.email}
                  className={
                    r.status === "Outstanding" ? "bg-rose-500/5" : undefined
                  }
                >
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-sm">{r.role || "—"}</TableCell>
                  <TableCell>{r.versionAcknowledged ?? "—"}</TableCell>
                  <TableCell>
                    {r.dateAcknowledged ? r.dateAcknowledged.slice(0, 10) : "—"}
                  </TableCell>
                  <TableCell>{r.method ?? "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        r.status === "Acknowledged"
                          ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
                          : "text-rose-600 border-rose-500/30 bg-rose-500/10"
                      }
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {policy.rosterStatus.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-sm text-muted-foreground py-6"
                  >
                    No staff assigned yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Version history tab ──────────────────────────────────────

function HistoryTab({ policy }: { policy: Policy }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Version history</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Approved by</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policy.approvalHistory
              .slice()
              .reverse()
              .map((a, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">
                    {a.version}
                    {a.version === policy.version && (
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        Current
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{a.approvedBy}</TableCell>
                  <TableCell>{a.date.slice(0, 10)}</TableCell>
                  <TableCell className="text-xs">{a.notes || "—"}</TableCell>
                </TableRow>
              ))}
            {policy.approvalHistory.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-sm text-muted-foreground py-6"
                >
                  This policy has not been published yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── Comments tab ──────────────────────────────────────────────

function CommentsTab({
  policy,
  invalidate,
  onErr,
}: {
  policy: Policy;
  invalidate: () => void;
  onErr: (t: string) => (e: any) => void;
}) {
  const [text, setText] = useState("");
  const addMut = useMutation({
    mutationFn: () => addPolicyComment(policy._id, { content: text.trim() }),
    onSuccess: () => {
      invalidate();
      setText("");
    },
    onError: onErr("Failed to post comment"),
  });

  const roots = policy.comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) =>
    policy.comments.filter((c) => c.parentId === id);

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Review comments</div>
      {roots.map((c) => (
        <div key={c.id} className="space-y-2">
          <CommentCard comment={c} />
          {repliesOf(c.id).map((r) => (
            <div key={r.id} className="ml-8">
              <CommentCard comment={r} />
            </div>
          ))}
        </div>
      ))}
      {roots.length === 0 && (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      )}
      <Card>
        <CardContent className="p-3 space-y-2">
          <Textarea
            rows={3}
            placeholder="Add a comment or review note…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={!text.trim() || addMut.isPending}
              onClick={() => addMut.mutate()}
            >
              Post comment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CommentCard({ comment }: { comment: Policy["comments"][number] }) {
  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-baseline gap-2 text-sm">
        <span className="font-medium">{comment.author}</span>
        <span className="text-xs text-muted-foreground">
          {comment.authorRole}
          {comment.authorRole ? " · " : ""}
          {new Date(comment.date).toLocaleDateString()}
        </span>
      </div>
      <p className="text-sm mt-1">{comment.content}</p>
    </div>
  );
}

// ── Publish dialog ───────────────────────────────────────────

function PublishDialog({
  open,
  onOpenChange,
  policyId,
  boardApprovalRequired,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  policyId: string;
  boardApprovalRequired: boolean;
  onDone: () => void;
}) {
  const [notes, setNotes] = useState("");
  const mutation = useMutation({
    mutationFn: () => publishPolicy(policyId, notes.trim() || undefined),
    onSuccess: () => {
      onDone();
      setNotes("");
      onOpenChange(false);
      toast({
        title: boardApprovalRequired
          ? "Sent to the board for approval"
          : "Policy published",
      });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to publish",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {boardApprovalRequired ? "Approve policy" : "Publish policy"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {boardApprovalRequired
              ? "This records your approval and emails every active board member a link to review and approve. The policy publishes automatically once all of them approve."
              : "This bumps the version, records you as the approver, and (if configured) requires staff to re-acknowledge."}
          </p>
          <div>
            <Label className="text-xs">Approval notes (optional)</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Annual review, updated sanctions screening frequency"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending
              ? "Submitting…"
              : boardApprovalRequired
                ? "Approve & send to board"
                : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
