import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  ArrowLeft,
  Plus,
  Mail,
  Download,
  BarChart3,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Table as TableIcon,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchPolicy,
  updatePolicyProperties,
  addPolicySection,
  updatePolicySection,
  setPolicyStatus,
  publishPolicy,
  addPolicyComment,
  sendPolicyReminders,
  REVIEW_FREQUENCIES,
  ACK_REQUIREMENTS,
  type Policy,
  type ReviewFrequency,
  type AckRequirement,
} from "@/lib/grc/policy-api";

const statusTone: Record<string, string> = {
  Published: "text-emerald-600 border-emerald-500/30 bg-emerald-500/10",
  "Under review": "text-amber-600 border-amber-500/30 bg-amber-500/10",
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

  const exportDocx = () => {
    if (!policy) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${policy.title}</title></head><body>
      <h1>${policy.title}</h1>
      <p><i>Version ${policy.version} · Owner: ${policy.owner || "—"} · Approval: ${policy.approvalAuthority || "—"}</i></p>
      ${policy.sections.map((s) => `<h2>${s.title}</h2>${s.content || "<p></p>"}`).join("")}
    </body></html>`;
    const blob = new Blob(["﻿", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${policy.title.replace(/[^a-z0-9]+/gi, "_")}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading || !policy)
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading policy…
      </div>
    );

  const outstanding = policy.assignedCount - policy.acknowledgedCount;

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
        </div>
      </div>

      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <div className="flex gap-2 mb-1">
            <Badge variant="secondary">{policy.category}</Badge>
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
          <Button variant="outline" size="sm" onClick={exportDocx}>
            <Download className="h-4 w-4 mr-1" /> Export .docx
          </Button>
          {policy.status === "Published" ? (
            <Button
              variant="outline"
              size="sm"
              disabled={reviewMut.isPending}
              onClick={() => reviewMut.mutate()}
            >
              Send for review
            </Button>
          ) : (
            <Button size="sm" onClick={() => setPublishOpen(true)}>
              Publish
            </Button>
          )}
        </div>
      </div>

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
        onDone={invalidate}
      />
    </div>
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

  return (
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
  );
}

const TABLE_HTML =
  '<table style="border-collapse:collapse;width:100%"><tbody>' +
  Array.from({ length: 2 })
    .map(
      () =>
        `<tr>${Array.from({ length: 2 })
          .map(
            () => '<td style="border:1px solid #ccc;padding:6px">&nbsp;</td>',
          )
          .join("")}</tr>`,
    )
    .join("") +
  "</tbody></table><p></p>";

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
  const ref = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(section.title);
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

  const saveContent = () => {
    if (!ref.current) return;
    saveMut.mutate({ content: ref.current.innerHTML });
  };
  const scheduleSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveContent, 1500);
  };

  const exec = (cmd: string, value?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, value);
    scheduleSave();
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b px-3 py-2 gap-2 flex-wrap">
          <div className="flex gap-1">
            <ToolBtn onClick={() => exec("bold")}>
              <Bold className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn onClick={() => exec("italic")}>
              <Italic className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn onClick={() => exec("underline")}>
              <Underline className="h-3.5 w-3.5" />
            </ToolBtn>
            <div className="w-px bg-border mx-1" />
            <ToolBtn onClick={() => exec("formatBlock", "H1")}>H1</ToolBtn>
            <ToolBtn onClick={() => exec("formatBlock", "H2")}>H2</ToolBtn>
            <ToolBtn onClick={() => exec("formatBlock", "H3")}>H3</ToolBtn>
            <div className="w-px bg-border mx-1" />
            <ToolBtn onClick={() => exec("insertUnorderedList")}>
              <List className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn onClick={() => exec("insertOrderedList")}>
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn onClick={() => exec("insertHTML", TABLE_HTML)}>
              <TableIcon className="h-3.5 w-3.5" />
            </ToolBtn>
          </div>
          <span className="text-[11px] text-muted-foreground shrink-0">
            {saveMut.isPending
              ? "Saving…"
              : savedAt
                ? `Auto-saved ${savedAt.toLocaleTimeString()}`
                : ""}
          </span>
        </div>
        <div className="p-3 space-y-3">
          <Input
            className="font-semibold text-base border-none px-0 focus-visible:ring-0"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title !== section.title && saveMut.mutate({ title })}
          />
          <div
            ref={ref}
            contentEditable
            suppressContentEditableWarning
            className="min-h-[300px] text-sm leading-relaxed outline-none prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: section.content }}
            onInput={scheduleSave}
            onBlur={saveContent}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ToolBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="h-7 min-w-7 px-1.5 inline-flex items-center justify-center rounded border text-xs hover:bg-muted"
    >
      {children}
    </button>
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
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  policyId: string;
  onDone: () => void;
}) {
  const [notes, setNotes] = useState("");
  const mutation = useMutation({
    mutationFn: () => publishPolicy(policyId, notes.trim() || undefined),
    onSuccess: () => {
      onDone();
      setNotes("");
      onOpenChange(false);
      toast({ title: "Policy published" });
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
          <DialogTitle>Publish policy</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This bumps the version, records you as the approver, and (if
            configured) requires staff to re-acknowledge.
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
            {mutation.isPending ? "Publishing…" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
