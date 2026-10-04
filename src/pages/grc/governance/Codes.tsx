import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Plus,
  Search,
  Loader2,
  Trash2,
  Download,
  Eye,
  History,
  Send,
  Mail,
  FileText,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  Scale,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { printGrcReport } from "@/lib/grc/printReport";
import { RichTextEditor } from "@/components/RichTextEditor";
import { usePersistentState, fmtDate } from "@/lib/grc/usePersistentState";
import {
  fetchGovernanceCodes,
  createGovernanceCode,
  updateCodeBody,
  deleteGovernanceCode,
  fetchGovernanceCodeTemplates,
  sendCodeForReview,
  sendCodeForBoardApproval,
  fetchBoardMembers,
  type GovernanceCode,
  type GovernanceCodeCategory,
  type GovernanceCodeTemplate,
  type CodeBoardApproval,
  type CodeAcknowledgement,
} from "@/lib/grc/governance-api";

// Matches GovernanceCodeStatus exactly — a code's stage is now real,
// server-enforced state (see the engine's GovernanceCodeService),
// not something tracked client-side.
type Stage =
  | "Draft"
  | "Internal review"
  | "Board / Committee approval"
  | "Published";
const STAGES: Stage[] = [
  "Draft",
  "Internal review",
  "Board / Committee approval",
  "Published",
];

interface CodeMeta {
  owner: string;
  standard: string;
  description: string;
  stage: Stage;
  reviewCycle: "Annual" | "Biennial";
  approval: "Full Board" | "Committee";
  nextReview: string; // ISO date
  nextAction: string;
  audience: string;
  audienceSize: number;
  acknowledged: number;
  comments: { by: string; at: string; text: string }[];
  history: { at: string; text: string }[];
}

interface CodeRow {
  id: string;
  title: string;
  category: GovernanceCodeCategory;
  body: string;
  version: number;
  updatedAt: string;
  boardApprovals: CodeBoardApproval[];
  acknowledgedBy: CodeAcknowledgement[];
  meta: CodeMeta;
}

const CLAUSES: Record<string, string> = {
  "Quorum requirement":
    "A quorum shall be {{quorum_number}} directors, of whom at least one must be independent.",
  "Term limits":
    "Non-executive directors shall serve terms of three years, renewable to a maximum of nine years.",
  "Delegation of authority":
    "The Board may delegate authority to committees and management in accordance with the Delegation of Authority Policy, while retaining ultimate accountability.",
  "Related party approval":
    "All related party transactions shall be disclosed and approved by independent directors before execution.",
  "Confidentiality of deliberations":
    "All Board deliberations and papers are confidential and shall not be disclosed without authorisation of the Chair.",
};

const daysFrom = (n: number) =>
  new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

// Defaults applied to a freshly created code's local-only metadata (see
// metaStore below) — zeroed rather than pre-populated, since a new code
// really does start with no audience acknowledgements yet.
const defaultMeta = (title: string, published: boolean): CodeMeta => ({
  owner: "Company Secretary",
  standard: "Custom",
  description: "",
  stage: published ? "Published" : "Draft",
  reviewCycle: "Annual",
  approval: "Full Board",
  nextReview: daysFrom(300),
  nextAction: published ? "—" : "Complete draft, send for internal review",
  audience: "All staff",
  audienceSize: 0,
  acknowledged: 0,
  comments: [],
  history: [{ at: new Date().toISOString(), text: `${title} created` }],
});

const stageVariant = (s: Stage) =>
  (s === "Published"
    ? "default"
    : s === "Draft"
      ? "outline"
      : "secondary") as any;

export default function GrcCodes() {
  const qc = useQueryClient();
  const { data: apiCodes = [], isLoading } = useQuery({
    queryKey: ["grc-gov-codes"],
    queryFn: fetchGovernanceCodes,
    retry: 1,
  });
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["grc-code-templates"],
    queryFn: fetchGovernanceCodeTemplates,
    retry: 1,
  });
  // Used only to decide whether a Board Charter can bootstrap straight
  // from Draft to Published (no board yet to review/approve it) — see
  // hasActiveBoardMembers below and its use in the Draft-stage action.
  const { data: boardMembers = [] } = useQuery({
    queryKey: ["grc-board-members"],
    queryFn: fetchBoardMembers,
    retry: 1,
  });
  const hasActiveBoardMembers = (boardMembers as any[]).some(
    (m: any) => m.isActive,
  );
  // Supplementary metadata (owner, standard, review cycle, audience
  // tracking, comments, history) has no home on the real backend
  // GovernanceCode schema yet, so it's kept as real, tenant-entered data
  // in local storage, keyed by the code's real _id — not dummy/sample
  // content, just a client-side field until the backend grows these
  // columns.
  const [metaStore, setMetaStore] = usePersistentState<
    Record<string, CodeMeta>
  >("grc_codes_meta_v1", {});
  const [view, setView] = useState<"library" | "templates" | "editor">(
    "library",
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | Stage>("all");

  const rows: CodeRow[] = useMemo(
    () =>
      apiCodes.map((c: GovernanceCode) => {
        const m =
          metaStore[c._id] ?? defaultMeta(c.title, c.status === "Published");
        return {
          id: c._id,
          title: c.title,
          category: c.category,
          body: c.body || "",
          version: c.version,
          updatedAt: c.updatedAt,
          boardApprovals: c.boardApprovals ?? [],
          acknowledgedBy: c.acknowledgedBy ?? [],
          // Stage is real, server-tracked state now — mirror it
          // directly rather than merging with anything stored
          // locally.
          meta: { ...m, stage: c.status },
        };
      }),
    [apiCodes, metaStore],
  );

  const setMeta = (id: string, patch: Partial<CodeMeta>) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setMetaStore((s) => ({ ...s, [id]: { ...row.meta, ...patch } }));
  };
  const logHistory = (id: string, text: string) => {
    const row = rows.find((r) => r.id === id);
    if (row)
      setMeta(id, {
        history: [{ at: new Date().toISOString(), text }, ...row.meta.history],
      });
  };

  const createMut = useMutation({
    mutationFn: (t: GovernanceCodeTemplate) =>
      createGovernanceCode({
        title: t.title,
        category: t.category as GovernanceCodeCategory,
        templateId: t._id,
      }),
    onSuccess: (c, t) => {
      setMetaStore((s) => ({
        ...s,
        [c._id]: { ...defaultMeta(t.title, false), description: t.description },
      }));
      qc.invalidateQueries({ queryKey: ["grc-gov-codes"] });
      setEditingId(c._id);
      setView("editor");
      toast({ title: "Draft created from template" });
    },
    onError: (e: any) =>
      toast({
        title: "Could not create code",
        description: e?.response?.data?.message ?? e.message,
        variant: "destructive",
      }),
  });

  const startFromTemplate = (t: GovernanceCodeTemplate) => createMut.mutate(t);

  if (isLoading)
    return (
      <div className="flex justify-center py-24 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading codes…
      </div>
    );

  const editing = rows.find((r) => r.id === editingId);
  if (view === "editor" && editing) {
    return (
      <CodeEditor
        row={editing}
        bootstrapPublish={
          editing.category === "Board Charter" && !hasActiveBoardMembers
        }
        onBack={() => setView("library")}
        setMeta={(p) => setMeta(editing.id, p)}
        logHistory={(t) => logHistory(editing.id, t)}
        onSaveBody={async (body) => {
          await updateCodeBody(editing.id, body);
          qc.invalidateQueries({ queryKey: ["grc-gov-codes"] });
        }}
        onSendForReview={async () => {
          const updated = await sendCodeForReview(editing.id);
          qc.invalidateQueries({ queryKey: ["grc-gov-codes"] });
          return updated;
        }}
        onSendForBoardApproval={async () => {
          const updated = await sendCodeForBoardApproval(editing.id);
          qc.invalidateQueries({ queryKey: ["grc-gov-codes"] });
          if (updated.status === "Published") {
            toast({
              title: "Code published",
              description:
                "No active board members yet, so this Board Charter was published directly.",
            });
          }
        }}
      />
    );
  }

  if (view === "templates") {
    const groups = [...new Set(templates.map((t) => t.category))];
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => setView("library")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Governance Codes
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            Start a new code from a template
          </h1>
          <p className="text-sm text-muted-foreground">
            Templates are authored and published by your platform administrator,
            pre-structured with standard sections.
          </p>
        </div>
        {templatesLoading && (
          <div className="flex justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading templates…
          </div>
        )}
        {!templatesLoading && templates.length === 0 && (
          <div className="text-sm rounded-md border bg-muted/40 px-4 py-8 text-center text-muted-foreground">
            No governance code templates have been published yet. Ask your
            platform administrator to publish one, or start a code from scratch
            by saving a draft below.
          </div>
        )}
        {groups.map((g) => (
          <div key={g} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {g}
            </h2>
            <div className="grid md:grid-cols-3 gap-3">
              {templates
                .filter((t) => t.category === g)
                .map((t) => (
                  <Card
                    key={t._id}
                    className="cursor-pointer hover:shadow-md hover:border-primary/40 transition"
                    onClick={() => startFromTemplate(t)}
                  >
                    <CardContent className="p-4 space-y-2">
                      <Badge variant="secondary">{t.category}</Badge>
                      <div className="font-semibold">{t.title}</div>
                      <p className="text-xs text-muted-foreground">
                        {t.description}
                      </p>
                      <div className="text-[11px] text-muted-foreground">
                        {t.sections.length} section
                        {t.sections.length === 1 ? "" : "s"}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const counts = {
    all: rows.length,
    Published: rows.filter((r) => r.meta.stage === "Published").length,
    Draft: rows.filter((r) => r.meta.stage === "Draft").length,
    review: rows.filter(
      (r) =>
        r.meta.stage === "Internal review" ||
        r.meta.stage === "Board / Committee approval",
    ).length,
  };
  const overdue = rows.filter(
    (r) => new Date(r.meta.nextReview).getTime() < Date.now(),
  );
  const nextDue = [...rows]
    .filter((r) => new Date(r.meta.nextReview).getTime() >= Date.now())
    .sort((a, b) => a.meta.nextReview.localeCompare(b.meta.nextReview))[0];
  const filtered = rows.filter(
    (r) =>
      (filter === "all" || r.meta.stage === filter) &&
      `${r.title} ${r.meta.owner} ${r.meta.standard}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const curMonth = new Date().getMonth();
  const inProgress = rows.filter((r) => r.meta.stage !== "Published");
  const published = rows.filter((r) => r.meta.stage === "Published");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Governance Codes</h1>
          <p className="text-sm text-muted-foreground">
            Author, publish, and maintain governance codes and charters —
            drafted inside Lexora from templates, not uploaded as static files.
          </p>
        </div>
        <Button onClick={() => setView("templates")}>
          <Plus className="h-4 w-4 mr-1" />
          New code
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          ["Total codes", counts.all, ""],
          ["Published", counts.Published, ""],
          ["In draft", counts.Draft, ""],
          [
            "Under review",
            counts.review,
            overdue.length ? `${overdue.length} overdue` : "",
          ],
          [
            "Next review due",
            nextDue?.title ?? "—",
            nextDue ? fmtDate(nextDue.meta.nextReview) : "",
          ],
        ].map(([l, v, s]) => (
          <Card key={l as string}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{l}</div>
              <div
                className={`font-bold mt-1 ${typeof v === "number" ? "text-2xl" : "text-sm"}`}
              >
                {v}
              </div>
              {s && <div className="text-[11px] text-destructive">{s}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Annual review cycle</CardTitle>
          <p className="text-sm text-muted-foreground">
            Each code has a scheduled review date. Overdue reviews are escalated
            to the Governance Overview dashboard.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 md:grid-cols-12 gap-1.5">
            {months.map((m, i) => {
              const due = rows.filter(
                (r) =>
                  new Date(r.meta.nextReview).getMonth() === i &&
                  new Date(r.meta.nextReview).getFullYear() <=
                    new Date().getFullYear() + 1,
              );
              const isOver = due.some((r) => overdue.includes(r));
              return (
                <div
                  key={m}
                  className={`rounded-md border p-2 text-center ${i === curMonth ? "border-primary bg-primary/5" : ""} ${isOver ? "bg-destructive/10 border-destructive/40" : ""}`}
                >
                  <div className="text-[11px] font-semibold">
                    {m}
                    {i === curMonth ? " ←" : ""}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {due.length
                      ? due.map((d) => d.title.split(" ")[0]).join(", ")
                      : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search codes by name, owner, or standard…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {(
          [
            ["all", `All (${counts.all})`],
            ["Published", `Published (${counts.Published})`],
            ["Draft", `Draft (${counts.Draft})`],
            ["Internal review", `Under review (${counts.review})`],
          ] as const
        ).map(([k, l]) => (
          <Button
            key={k}
            size="sm"
            variant={filter === k ? "default" : "outline"}
            onClick={() => setFilter(k as any)}
          >
            {l}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Code library</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.map((r) => {
            const isOver = overdue.includes(r);
            return (
              <div
                key={r.id}
                className="flex items-center gap-3 border rounded-lg p-3 hover:bg-muted/30 cursor-pointer"
                onClick={() => {
                  setEditingId(r.id);
                  setView("editor");
                }}
              >
                <BookOpen className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.meta.description || r.category}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Owner: {r.meta.owner} · {r.meta.standard}
                    {isOver && (
                      <span className="text-destructive">
                        {" "}
                        · Review overdue
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <Badge variant={stageVariant(r.meta.stage)}>
                    {r.meta.stage === "Internal review"
                      ? "Under review"
                      : r.meta.stage}
                  </Badge>
                  <div className="text-[11px] text-muted-foreground">
                    v{r.version} · Next review {fmtDate(r.meta.nextReview)}
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete "{r.title}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes the code and its version history.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          await deleteGovernanceCode(r.id);
                          qc.invalidateQueries({
                            queryKey: ["grc-gov-codes"],
                          });
                          toast({ title: "Code deleted" });
                        }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              {rows.length === 0
                ? "No governance codes yet. Create your first code from a template to start your library."
                : "No codes match."}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approval workflow</CardTitle>
          <p className="text-sm text-muted-foreground">
            Every code follows a 5-stage lifecycle. Codes cannot be published
            without board or committee approval.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[...STAGES, "Acknowledgement"].map((s, i) => (
              <Badge key={s} variant="outline" className="py-1">
                {i + 1}. {s}
              </Badge>
            ))}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Next action</TableHead>
                <TableHead>Target date</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {inProgress.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell>
                    <Badge variant={stageVariant(r.meta.stage)}>
                      {r.meta.stage}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.meta.owner}</TableCell>
                  <TableCell
                    className={`text-xs ${overdue.includes(r) ? "text-destructive" : ""}`}
                  >
                    {overdue.includes(r) ? "Overdue — " : ""}
                    {r.meta.nextAction}
                  </TableCell>
                  <TableCell>{fmtDate(r.meta.nextReview)}</TableCell>
                  <TableCell>
                    {(r.meta.stage === "Draft" ||
                      r.meta.stage === "Internal review") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            const updated =
                              r.meta.stage === "Draft"
                                ? await sendCodeForReview(r.id)
                                : await sendCodeForBoardApproval(r.id);
                            qc.invalidateQueries({
                              queryKey: ["grc-gov-codes"],
                            });
                            toast({
                              title:
                                updated.status === "Published"
                                  ? `${r.title} published`
                                  : `${r.title} moved to ${updated.status}`,
                            });
                          } catch (e: any) {
                            toast({
                              title: "Could not advance",
                              description:
                                e?.response?.data?.message ?? e.message,
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        Advance
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {inProgress.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-4"
                  >
                    No codes in progress.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row justify-between items-start space-y-0 flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">
              Acknowledgement tracking
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Published codes require acknowledgement from all relevant
              personnel.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                toast({
                  title: "Reminders sent",
                  description: `${published.reduce((a, r) => a + (r.meta.audienceSize - r.meta.acknowledged), 0)} people reminded.`,
                })
              }
            >
              <Mail className="h-4 w-4 mr-1" />
              Send reminders to pending
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const csv = [
                  "Code,Audience,Acknowledged,Pending,Coverage",
                  ...published.map(
                    (r) =>
                      `${r.title},${r.meta.audience} (${r.meta.audienceSize}),${r.meta.acknowledged},${r.meta.audienceSize - r.meta.acknowledged},${Math.round((r.meta.acknowledged / r.meta.audienceSize) * 100)}%`,
                  ),
                ].join("\n");
                const a = document.createElement("a");
                a.href = URL.createObjectURL(
                  new Blob([csv], { type: "text/csv" }),
                );
                a.download = "code-acknowledgements.csv";
                a.click();
              }}
            >
              <Download className="h-4 w-4 mr-1" />
              Export report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Published code</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Acknowledged</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Coverage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {published.map((r) => {
                const cov = Math.round(
                  (r.meta.acknowledged / Math.max(1, r.meta.audienceSize)) *
                    100,
                );
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell>
                      {r.meta.audience} ({r.meta.audienceSize})
                    </TableCell>
                    <TableCell>{r.meta.acknowledged}</TableCell>
                    <TableCell>
                      {r.meta.audienceSize - r.meta.acknowledged}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          cov === 100
                            ? "default"
                            : cov >= 80
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {cov}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CodeEditor({
  row,
  bootstrapPublish,
  onBack,
  setMeta,
  logHistory,
  onSaveBody,
  onSendForReview,
  onSendForBoardApproval,
}: {
  row: CodeRow;
  // Board Charter, zero active board members: there's no board yet to
  // review or approve it, so the Draft-stage action skips straight to
  // Publish instead of Send for review — see GovernanceCodeService
  // #sendForReview's matching bootstrap branch, which this only relabels.
  bootstrapPublish: boolean;
  onBack: () => void;
  setMeta: (p: Partial<CodeMeta>) => void;
  logHistory: (t: string) => void;
  onSaveBody: (body: string) => Promise<void>;
  onSendForReview: () => Promise<GovernanceCode>;
  onSendForBoardApproval: () => Promise<void>;
}) {
  const [body, setBody] = useState(row.body);
  const [saving, setSaving] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [comment, setComment] = useState("");
  const [preview, setPreview] = useState(false);
  const sections = [...body.matchAll(/<h3>(.*?)<\/h3>/g)].map((m) =>
    m[1].replace(/<[^>]+>/g, ""),
  );
  const drafted = body
    .split(/<h3>/)
    .slice(1)
    .filter((s) => !s.includes("[Draft this section]")).length;
  const locked = row.meta.stage === "Published";

  const save = async (silent = false) => {
    setSaving(true);
    try {
      await onSaveBody(body);
      if (!silent) {
        toast({ title: "Draft saved" });
        logHistory("Draft saved");
      }
    } catch (e: any) {
      toast({
        title: "Save failed",
        description: e?.response?.data?.message ?? e.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const exportDoc = () => {
    printGrcReport({ title: row.title, category: "Governance code", body,
      details: [{ label: "Version", value: String(row.version) }, { label: "Status", value: row.meta.stage }, { label: "Owner", value: row.meta.owner }] });
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Governance Codes
      </Button>
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <div className="flex gap-2">
            <Badge variant={stageVariant(row.meta.stage)}>
              {row.meta.stage}
            </Badge>
            <Badge variant="outline">v{row.version}</Badge>
          </div>
          <h1 className="text-2xl font-bold mt-1">{row.title}</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPreview((p) => !p)}
          >
            <Eye className="h-4 w-4 mr-1" />
            {preview ? "Edit" : "Preview"}
          </Button>
          <Button size="sm" variant="outline" onClick={exportDoc}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          {!locked && (
            <Button
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => save()}
            >
              {saving ? "Saving…" : "Save draft"}
            </Button>
          )}
          {row.meta.stage === "Draft" && (
            <Button
              size="sm"
              disabled={advancing}
              onClick={async () => {
                setAdvancing(true);
                try {
                  await save(true);
                  const updated = await onSendForReview();
                  if (updated.status === "Published") {
                    logHistory("Published directly — no board members yet");
                    toast({
                      title: "Code published",
                      description:
                        "No active board members yet, so this Board Charter was published directly.",
                    });
                  } else {
                    logHistory("Sent for internal review");
                    toast({ title: "Sent for internal review" });
                  }
                } catch (e: any) {
                  toast({
                    title: bootstrapPublish
                      ? "Could not publish"
                      : "Could not send for review",
                    description: e?.response?.data?.message ?? e.message,
                    variant: "destructive",
                  });
                } finally {
                  setAdvancing(false);
                }
              }}
            >
              <Send className="h-4 w-4 mr-1" />
              {bootstrapPublish ? "Publish" : "Send for review"}
            </Button>
          )}
          {row.meta.stage === "Internal review" && (
            <Button
              size="sm"
              disabled={advancing}
              onClick={async () => {
                setAdvancing(true);
                try {
                  await save(true);
                  await onSendForBoardApproval();
                  logHistory("Sent for board approval");
                  toast({
                    title: "Sent for board approval",
                    description:
                      "Active board members can now decide from their Board Portal.",
                  });
                } catch (e: any) {
                  toast({
                    title: "Could not send for board approval",
                    description: e?.response?.data?.message ?? e.message,
                    variant: "destructive",
                  });
                } finally {
                  setAdvancing(false);
                }
              }}
            >
              <Send className="h-4 w-4 mr-1" />
              Send for board approval
            </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr_300px] gap-4">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                Contents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {sections.map((s) => (
                <div key={s} className="truncate">
                  {s}
                </div>
              ))}
            </CardContent>
          </Card>
          {!locked && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                  Clause library · click to insert
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {Object.entries(CLAUSES).map(([k, v]) => (
                  <button
                    key={k}
                    className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted"
                    onClick={() => {
                      setBody((b) => `${b}<p>${v}</p>`);
                      toast({ title: `Inserted: ${k}` });
                    }}
                  >
                    + {k}
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardContent className="p-4">
            {preview || locked ? (
              <div
                className="prose prose-sm max-w-none p-4"
                dangerouslySetInnerHTML={{ __html: body }}
              />
            ) : (
              <RichTextEditor value={body} onChange={setBody} minHeight={520} />
            )}
            <div className="text-xs text-muted-foreground mt-2">
              {drafted} of {sections.length} sections drafted
              {locked &&
                " · Published codes are read-only — start a new version to amend."}
            </div>
          </CardContent>
        </Card>

        <Card>
          <Tabs
            defaultValue={
              row.meta.stage === "Board / Committee approval"
                ? "approval"
                : "comments"
            }
            className="p-3"
          >
            <TabsList className="w-full">
              <TabsTrigger value="approval" className="flex-1">
                Approval
              </TabsTrigger>
              <TabsTrigger value="comments" className="flex-1">
                Comms
              </TabsTrigger>
              <TabsTrigger value="props" className="flex-1">
                Props
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1">
                History
              </TabsTrigger>
            </TabsList>
            <TabsContent value="approval" className="space-y-2">
              {row.boardApprovals.length === 0 ? (
                <div className="text-sm text-muted-foreground flex gap-2 py-2">
                  <Scale className="h-4 w-4 shrink-0" />
                  {row.meta.stage === "Published"
                    ? "This code published without a board approval round — no active board members were on record when it was sent, or it was created before this history was tracked."
                    : "No board approval round has been opened for this code yet."}
                </div>
              ) : (
                row.boardApprovals.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 border rounded-lg p-2.5"
                  >
                    {a.decision === "Approved" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    ) : a.decision === "Rejected" ? (
                      <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{a.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.decision}
                        {a.decidedAt
                          ? ` · ${fmtDate(a.decidedAt)}`
                          : " · Awaiting decision"}
                      </div>
                      {a.notes && <div className="text-xs mt-1">{a.notes}</div>}
                    </div>
                  </div>
                ))
              )}
              <div className="pt-3 mt-1 border-t">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Signed by directors during onboarding
                </div>
                {row.acknowledgedBy.length === 0 ? (
                  <div className="text-sm text-muted-foreground flex gap-2 py-1">
                    <CheckCircle2 className="h-4 w-4 shrink-0 opacity-50" />
                    No director has signed this code from their onboarding yet.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {row.acknowledgedBy.map((a, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-sm border rounded-lg p-2"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="font-medium">{a.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {fmtDate(a.acknowledgedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="comments" className="space-y-3">
              {row.meta.comments.map((c, i) => (
                <div key={i} className="border rounded-lg p-2.5">
                  <div className="text-xs font-semibold">
                    {c.by}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {c.at}
                    </span>
                  </div>
                  <div className="text-sm mt-1">{c.text}</div>
                </div>
              ))}
              <Textarea
                rows={2}
                placeholder="Add a comment…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button
                size="sm"
                className="w-full"
                onClick={() => {
                  if (!comment.trim()) return;
                  setMeta({
                    comments: [
                      ...row.meta.comments,
                      { by: "You", at: "just now", text: comment },
                    ],
                  });
                  setComment("");
                }}
              >
                Comment
              </Button>
            </TabsContent>
            <TabsContent value="props" className="space-y-3">
              <div>
                <Label className="text-xs">Owner</Label>
                <Input
                  value={row.meta.owner}
                  onChange={(e) => setMeta({ owner: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Standard</Label>
                <Input
                  value={row.meta.standard}
                  onChange={(e) => setMeta({ standard: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Review cycle</Label>
                <Select
                  value={row.meta.reviewCycle}
                  onValueChange={(v: any) => setMeta({ reviewCycle: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Annual">Annual</SelectItem>
                    <SelectItem value="Biennial">Biennial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Next review</Label>
                <Input
                  type="date"
                  value={row.meta.nextReview.slice(0, 10)}
                  onChange={(e) => setMeta({ nextReview: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Approval authority</Label>
                <Select
                  value={row.meta.approval}
                  onValueChange={(v: any) => setMeta({ approval: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full Board">Full Board</SelectItem>
                    <SelectItem value="Committee">Committee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Audience</Label>
                  <Input
                    value={row.meta.audience}
                    onChange={(e) => setMeta({ audience: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Headcount</Label>
                  <Input
                    type="number"
                    value={row.meta.audienceSize}
                    onChange={(e) =>
                      setMeta({ audienceSize: Number(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="history" className="space-y-2">
              {row.meta.history.map((h, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <History className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div>{h.text}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {fmtDate(h.at)}
                    </div>
                  </div>
                </div>
              ))}
              {row.meta.history.length === 0 && (
                <div className="text-sm text-muted-foreground flex gap-2">
                  <FileText className="h-4 w-4" />
                  No history yet.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
