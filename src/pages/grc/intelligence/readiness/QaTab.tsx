import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Plus, CheckCircle2, RotateCcw, Trash2 } from "lucide-react";
import {
  approveAnswer,
  createQuestion,
  deleteQuestion,
  draftAnswer,
  reopenQuestion,
  updateQuestion,
  type InvestorQuestion,
  type QaStatus,
} from "@/lib/grc/readiness-workspace-api";
import { Tile, fail, fmtDate, type TabProps } from "./shared";

const STATUS_LABEL: Record<QaStatus, string> = {
  open: "Open",
  pending_review: "Pending review",
  answered: "Answered",
};
const STATUS_TONE: Record<QaStatus, string> = {
  open: "text-rose-600 border-rose-500/40 bg-rose-500/10",
  pending_review: "text-amber-600 border-amber-500/40 bg-amber-500/10",
  answered: "text-emerald-600 border-emerald-500/40 bg-emerald-500/10",
};
const CATEGORIES = [
  "General",
  "Financial",
  "Corporate",
  "Legal",
  "Tax",
  "Commercial",
  "HR",
  "ESG",
];

export function QaTab({ ws, onWorkspace }: TabProps) {
  const [filter, setFilter] = useState<"all" | QaStatus>("all");
  const [active, setActive] = useState<string>("");
  const [logOpen, setLogOpen] = useState(false);

  const qs = ws.questions;
  const open = qs.filter((q) => q.status === "open").length;
  const pending = qs.filter((q) => q.status === "pending_review").length;
  const answered = qs.filter((q) => q.status === "answered").length;
  const answeredWith = qs.filter((q) => q.answer?.at);
  const avgDays = answeredWith.length
    ? Math.round(
        answeredWith.reduce(
          (s, q) =>
            s + (+new Date(q.answer!.at!) - +new Date(q.askedAt)) / 86400000,
          0,
        ) / answeredWith.length,
      )
    : 0;

  const askers = useMemo(() => {
    const map = new Map<
      string,
      { name: string; org: string; items: InvestorQuestion[] }
    >();
    for (const q of qs) {
      const e = map.get(q.askedBy) ?? {
        name: q.askedBy,
        org: q.organisation,
        items: [],
      };
      e.items.push(q);
      map.set(q.askedBy, e);
    }
    return [...map.values()].sort(
      (a, b) =>
        b.items.filter((q) => q.status === "open").length -
          a.items.filter((q) => q.status === "open").length ||
        b.items.length - a.items.length,
    );
  }, [qs]);

  useEffect(() => {
    if (!askers.some((a) => a.name === active))
      setActive(askers[0]?.name ?? "");
  }, [askers, active]);

  const current = askers.find((a) => a.name === active);
  const visible = (current?.items ?? []).filter(
    (q) => filter === "all" || q.status === filter,
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Tile label="Open" value={open} tone="text-rose-600" />
        <Tile label="Pending review" value={pending} tone="text-amber-600" />
        <Tile label="Answered" value={answered} tone="text-emerald-600" />
        <Tile label="Avg response" value={`${avgDays}d`} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-[190px]" aria-label="Filter questions">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="pending_review">Pending review</SelectItem>
            <SelectItem value="answered">Answered</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setLogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Log question
        </Button>
      </div>

      {qs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No investor questions logged yet.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="space-y-1">
            {askers.map((a) => {
              const openN = a.items.filter((q) => q.status === "open").length;
              return (
                <button
                  type="button"
                  key={a.name}
                  onClick={() => setActive(a.name)}
                  className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left ${
                    a.name === active
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {a.name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{a.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {a.org || "—"} · {a.items.length} question
                      {a.items.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  {openN ? <Badge variant="destructive">{openN}</Badge> : null}
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            {visible.length === 0 ? (
              <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No questions match this filter.
              </p>
            ) : (
              visible.map((q) => (
                <QuestionCard key={q._id} q={q} onWorkspace={onWorkspace} />
              ))
            )}
          </div>
        </div>
      )}

      <LogQuestionDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        ws={ws}
        defaultAsker={active}
        onDone={onWorkspace}
      />
    </div>
  );
}

function QuestionCard({
  q,
  onWorkspace,
}: {
  q: InvestorQuestion;
  onWorkspace: TabProps["onWorkspace"];
}) {
  const [text, setText] = useState(q.answer?.text ?? "");
  const [assignee, setAssignee] = useState(q.assignee);
  useEffect(() => {
    setText(q.answer?.text ?? "");
    setAssignee(q.assignee);
  }, [q.answer?.text, q.assignee]);

  const draft = useMutation({
    mutationFn: () => draftAnswer(q._id, text),
    onSuccess: onWorkspace,
    onError: (e) => fail("Could not save the answer", e),
  });
  const approve = useMutation({
    mutationFn: () => approveAnswer(q._id),
    onSuccess: onWorkspace,
    onError: (e) => fail("Could not approve", e),
  });
  const reopen = useMutation({
    mutationFn: () => reopenQuestion(q._id),
    onSuccess: onWorkspace,
    onError: (e) => fail("Could not reopen", e),
  });
  const patch = useMutation({
    mutationFn: (dto: Parameters<typeof updateQuestion>[1]) =>
      updateQuestion(q._id, dto),
    onSuccess: onWorkspace,
    onError: (e) => fail("Could not save", e),
  });
  const del = useMutation({
    mutationFn: () => deleteQuestion(q._id),
    onSuccess: onWorkspace,
    onError: (e) => fail("Could not delete", e),
  });

  const changed = text.trim() !== (q.answer?.text ?? "");

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{q.question}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {q.category} · asked {fmtDate(q.askedAt)} · {q.priority} priority
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={STATUS_TONE[q.status]}>
            {STATUS_LABEL[q.status]}
          </Badge>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Delete question"
            onClick={() => del.mutate()}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <Label
          htmlFor={`as-${q._id}`}
          className="text-xs text-muted-foreground"
        >
          Assigned to
        </Label>
        <Input
          id={`as-${q._id}`}
          className="h-8 w-44"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          onBlur={() => assignee !== q.assignee && patch.mutate({ assignee })}
        />
      </div>

      <Textarea
        className="min-h-[80px] text-sm"
        aria-label="Answer"
        placeholder="Draft the answer"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          {q.answer?.text
            ? `Drafted by ${q.answer.by || "—"} on ${fmtDate(q.answer.at)}${
                q.answer.approved
                  ? ` · approved by ${q.answer.approvedBy || "—"}`
                  : ""
              }`
            : "No answer yet"}
        </span>
        <div className="flex gap-2">
          {changed ? (
            <Button
              size="sm"
              onClick={() => draft.mutate()}
              disabled={!text.trim() || draft.isPending}
            >
              {q.answer?.text ? "Save draft" : "Submit for review"}
            </Button>
          ) : null}
          {q.status === "pending_review" && !changed ? (
            <Button
              size="sm"
              onClick={() => approve.mutate()}
              disabled={approve.isPending}
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Approve answer
            </Button>
          ) : null}
          {q.status === "answered" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => reopen.mutate()}
              disabled={reopen.isPending}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reopen
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LogQuestionDialog({
  open,
  onOpenChange,
  ws,
  defaultAsker,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ws: TabProps["ws"];
  defaultAsker: string;
  onDone: TabProps["onWorkspace"];
}) {
  const [f, setF] = useState({
    investorId: "",
    askedBy: "",
    organisation: "",
    question: "",
    category: "General",
    priority: "medium",
    assignee: "",
  });
  useEffect(() => {
    if (!open) return;
    const known = ws.investors.find((i) => i.name === defaultAsker);
    setF({
      investorId: known?._id ?? "",
      askedBy: known ? "" : defaultAsker,
      organisation: "",
      question: "",
      category: "General",
      priority: "medium",
      assignee: "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const add = useMutation({
    mutationFn: () =>
      createQuestion({
        question: f.question.trim(),
        investorId: f.investorId || undefined,
        askedBy: f.investorId ? undefined : f.askedBy.trim(),
        organisation: f.organisation.trim() || undefined,
        category: f.category,
        priority: f.priority as "high" | "medium" | "low",
        assignee: f.assignee.trim() || undefined,
      }),
    onSuccess: (w) => {
      onDone(w);
      onOpenChange(false);
    },
    onError: (e) => fail("Could not log the question", e),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log investor question</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {ws.investors.length ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Investor (from your pipeline)</Label>
              <Select
                value={f.investorId || "other"}
                onValueChange={(v) =>
                  setF({ ...f, investorId: v === "other" ? "" : v })
                }
              >
                <SelectTrigger aria-label="Investor">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ws.investors.map((i) => (
                    <SelectItem key={i._id} value={i._id}>
                      {i.name}
                      {i.organisation ? ` — ${i.organisation}` : ""}
                    </SelectItem>
                  ))}
                  <SelectItem value="other">Someone else…</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {!f.investorId ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="q-by">Asked by</Label>
                <Input
                  id="q-by"
                  value={f.askedBy}
                  onChange={(e) => setF({ ...f, askedBy: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="q-org">Organisation</Label>
                <Input
                  id="q-org"
                  value={f.organisation}
                  onChange={(e) => setF({ ...f, organisation: e.target.value })}
                />
              </div>
            </>
          ) : null}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="q-text">Question</Label>
            <Textarea
              id="q-text"
              value={f.question}
              onChange={(e) => setF({ ...f, question: e.target.value })}
              className="min-h-[80px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={f.category}
              onValueChange={(v) => setF({ ...f, category: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select
              value={f.priority}
              onValueChange={(v) => setF({ ...f, priority: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="q-assignee">Assign to</Label>
            <Input
              id="q-assignee"
              value={f.assignee}
              onChange={(e) => setF({ ...f, assignee: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => add.mutate()}
            disabled={
              !f.question.trim() ||
              (!f.investorId && !f.askedBy.trim()) ||
              add.isPending
            }
          >
            Log question
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
