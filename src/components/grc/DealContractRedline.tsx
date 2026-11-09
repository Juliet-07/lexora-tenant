import { Fragment, useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Check, Lock, PenSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  advanceRound,
  decideAllChanges,
  decideChange,
  proposeChange,
  type Contract,
  type ContractSection,
  type Deal,
  type DealPartySide,
  type TrackedChange,
} from "@/lib/grc/deals-api";

// ─────────────────────────────────────────────────────────────
// Redline tab — negotiating a deal contract. One side at a time has
// the pen and proposes new wording for a line (a tracked change); the
// other accepts or rejects it, and the contract moves round by round.
// The same text can be read as a Redline, Clean (every pending change
// applied) or Original (before any change was accepted).
// ─────────────────────────────────────────────────────────────

type View = "redline" | "clean" | "original";
const VIEWS: { key: View; label: string }[] = [
  { key: "redline", label: "Redline" },
  { key: "clean", label: "Clean" },
  { key: "original", label: "Original" },
];

const SIDE: Record<DealPartySide, { text: string; chip: string; ins: string }> =
  {
    "Party A": {
      text: "text-sky-700 dark:text-sky-300",
      chip: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      ins: "bg-sky-500/15 text-sky-800 dark:text-sky-200",
    },
    "Party B": {
      text: "text-violet-700 dark:text-violet-300",
      chip: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
      ins: "bg-violet-500/15 text-violet-800 dark:text-violet-200",
    },
  };
const sideOf = (p?: string): DealPartySide =>
  p === "Party B" ? "Party B" : "Party A";
const other = (p: DealPartySide): DealPartySide =>
  p === "Party A" ? "Party B" : "Party A";

// Who is marking the contract up in round n: Party A drafts (round 1),
// then the sides alternate.
const roundSide = (n: number, first: DealPartySide): DealPartySide =>
  n % 2 === 1 ? first : other(first);
const roundLabel = (n: number, side: DealPartySide) =>
  `R${n} ${side}'s ${n === 1 ? "draft" : n % 2 === 0 ? "markup" : "response"}`;

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

// {{merge_fields}} stay visible as fields, like on the Edit tab.
function withFields(text: string): ReactNode {
  return text.split(/(\{\{\w+\}\})/g).map((part, i) =>
    /^\{\{\w+\}\}$/.test(part) ? (
      <code
        key={i}
        className="rounded bg-warning/15 px-1 text-[0.85em] text-amber-800 dark:text-amber-200"
      >
        {part}
      </code>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

function PartyChip({ party, round }: { party: DealPartySide; round?: number }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-1.5 py-px text-[10px] font-semibold ${SIDE[party].chip}`}
    >
      {party}
      {round ? ` · R${round}` : ""}
    </span>
  );
}

export default function DealContractRedline({
  deal,
  contract,
  onChanged,
}: {
  deal: Deal;
  contract: Contract;
  onChanged: () => void;
}) {
  const [view, setView] = useState<View>("redline");
  const [proposing, setProposing] = useState<{ s: number; l: number } | null>(
    null,
  );
  const [text, setText] = useState("");
  const [asParty, setAsParty] = useState<DealPartySide | null>(null);

  const locked = !!contract.executed;
  const round = contract.round ?? 1;
  const pen = sideOf(contract.penParty);
  const firstSide = round % 2 === 1 ? pen : other(pen);
  const pending = contract.sections.reduce(
    (n, s) =>
      n + (s.changes ?? []).filter((c) => c.status === "pending").length,
    0,
  );

  const fail = (fallback: string) => (err: any) =>
    toast.error(err?.response?.data?.message ?? fallback);

  const proposeMut = useMutation({
    mutationFn: (v: { s: number; l: number }) =>
      proposeChange(deal._id, contract._id, v.s, {
        lineIndex: v.l,
        text,
        party: asParty ?? pen,
      }),
    onSuccess: () => {
      onChanged();
      setProposing(null);
      setText("");
      toast.success("Change proposed");
    },
    onError: fail("Failed to propose the change"),
  });
  const decideMut = useMutation({
    mutationFn: (v: { s: number; id: string; decision: "accept" | "reject" }) =>
      decideChange(deal._id, contract._id, v.s, v.id, v.decision),
    onSuccess: (_r, v) => {
      onChanged();
      toast.success(
        v.decision === "accept" ? "Change accepted" : "Change rejected",
      );
    },
    onError: fail("Failed to update the change"),
  });
  const decideAllMut = useMutation({
    mutationFn: (decision: "accept" | "reject") =>
      decideAllChanges(deal._id, contract._id, decision),
    onSuccess: (r, decision) => {
      onChanged();
      toast.success(
        `${r.count} change${r.count === 1 ? "" : "s"} ${decision === "accept" ? "accepted" : "rejected"}`,
      );
    },
    onError: fail("Failed to update the changes"),
  });
  const roundMut = useMutation({
    mutationFn: () => advanceRound(deal._id, contract._id),
    onSuccess: (r) => {
      onChanged();
      toast.success(`Round ${r.round} — ${r.penParty} has the pen`);
    },
    onError: fail("Failed to advance the round"),
  });

  const decideButtons = (s: number, c: TrackedChange) =>
    !locked && (
      <span className="ml-1.5 inline-flex gap-1 align-middle">
        <button
          type="button"
          aria-label="Accept change"
          title="Accept"
          disabled={decideMut.isPending}
          onClick={() => decideMut.mutate({ s, id: c.id, decision: "accept" })}
          className="rounded border border-emerald-500/40 p-0.5 text-emerald-600 hover:bg-emerald-500/10"
        >
          <Check className="h-3 w-3" />
        </button>
        <button
          type="button"
          aria-label="Reject change"
          title="Reject"
          disabled={decideMut.isPending}
          onClick={() => decideMut.mutate({ s, id: c.id, decision: "reject" })}
          className="rounded border border-rose-500/40 p-0.5 text-rose-600 hover:bg-rose-500/10"
        >
          <X className="h-3 w-3" />
        </button>
      </span>
    );

  // One line of a section in the chosen view.
  const renderLine = (
    s: ContractSection,
    si: number,
    line: string,
    li: number,
  ): ReactNode => {
    const changes = s.changes ?? [];
    const pend = changes.find(
      (c) => c.status === "pending" && c.lineIndex === li,
    );
    const accepted = changes.filter(
      (c) => c.status === "accepted" && norm(c.after) === norm(line),
    );

    if (view === "original") return withFields(line);
    if (view === "clean") {
      return (
        <>
          {withFields(pend ? pend.after : line)}
          {pend?.addedLines.map((a, i) => (
            <div key={i} className="mt-1">
              {withFields(a)}
            </div>
          ))}
        </>
      );
    }
    if (pend) {
      const p = SIDE[pend.party];
      const head = pend.before.slice(0, pend.offset);
      const tail = pend.before.slice(pend.offset + pend.del.length);
      return (
        <>
          {withFields(head)}
          {pend.del && (
            <span className="rounded bg-rose-500/15 text-rose-700 line-through dark:text-rose-300">
              {pend.del}
            </span>
          )}
          {pend.ins && (
            <span className={`rounded px-0.5 ${p.ins}`}>{pend.ins}</span>
          )}
          {withFields(tail)}
          {decideButtons(si, pend)}
          <span className="ml-1.5 align-middle">
            <PartyChip party={pend.party} round={pend.round} />
          </span>
          {pend.addedLines.map((a, i) => (
            <div key={i} className={`mt-1 rounded px-0.5 ${p.ins}`}>
              {a}
            </div>
          ))}
        </>
      );
    }
    return (
      <>
        {withFields(line)}
        {accepted.map((c) => (
          <span key={c.id} className="ml-1.5 align-middle">
            <span className="mr-1 rounded-full bg-emerald-500/15 px-1.5 py-px text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              accepted
            </span>
            <PartyChip party={c.party} round={c.round} />
          </span>
        ))}
      </>
    );
  };

  const total = contract.sections.length;
  const canMark = !locked && view === "redline";

  return (
    <div className="mx-auto max-w-4xl space-y-3">
      {locked && (
        <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          This contract has been executed, so it can no longer be marked up. Use
          the Amendments tab to vary it.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-semibold text-muted-foreground">
            View:
          </span>
          {VIEWS.map((v) => (
            <Button
              key={v.key}
              size="sm"
              variant={view === v.key ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              aria-pressed={view === v.key}
              onClick={() => setView(v.key)}
            >
              {v.label}
            </Button>
          ))}
          {!locked && (
            <>
              <span className="mx-1 h-4 w-px bg-border" />
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs"
                disabled={!pending || decideAllMut.isPending}
                onClick={() => decideAllMut.mutate("accept")}
              >
                <Check className="mr-1 h-3 w-3" />
                Accept all
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs"
                disabled={!pending || decideAllMut.isPending}
                onClick={() => decideAllMut.mutate("reject")}
              >
                <X className="mr-1 h-3 w-3" />
                Reject all
              </Button>
            </>
          )}
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${SIDE[pen].chip}`}
        >
          <PenSquare className="h-3 w-3" />
          {pen} has the pen · Round {round}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-background px-3 py-2 text-xs">
        <span className="mr-1 font-semibold text-muted-foreground">
          Rounds:
        </span>
        {Array.from({ length: round }, (_, i) => i + 1).map((n) => (
          <Fragment key={n}>
            <span
              className={`rounded-full border px-2.5 py-0.5 ${
                n === round
                  ? "border-primary bg-primary/10 font-semibold text-primary"
                  : "text-muted-foreground"
              }`}
              aria-current={n === round ? "step" : undefined}
            >
              {n < round ? "✓ " : ""}
              {roundLabel(n, roundSide(n, firstSide))}
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          </Fragment>
        ))}
        <span className="rounded-full border border-dashed px-2.5 py-0.5 text-muted-foreground">
          Final
        </span>
        <span className="flex-1" />
        {!locked && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs"
            disabled={roundMut.isPending}
            onClick={() => roundMut.mutate()}
          >
            Advance to R{round + 1} →
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {view === "redline"
          ? `Propose new wording for a line and it appears here as a tracked change from ${pen}. ${pending} pending change${pending === 1 ? "" : "s"}.`
          : view === "clean"
            ? "The contract as it would read with every pending change applied."
            : "The contract before any proposed change was accepted."}
      </p>

      {contract.sections.map((s, si) => {
        const lines =
          view === "original"
            ? (s.originalLines ?? s.rawLines ?? [])
            : (s.rawLines ?? []);
        const sectionPending = (s.changes ?? []).filter(
          (c) => c.status === "pending",
        ).length;
        return (
          <section
            key={si}
            aria-label={s.title}
            className="rounded-lg border bg-background p-4"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">
                {s.title}
                {s.variationRef && (
                  <span className="ml-2 rounded-full bg-sky-500/10 px-1.5 py-px text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                    {s.variationRef}
                  </span>
                )}
              </h3>
              {view === "redline" && sectionPending > 0 && (
                <span className="text-[11px] text-rose-600">
                  {sectionPending} pending
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {lines.map((line, li) => {
                const open = proposing?.s === si && proposing.l === li;
                const hasPending = (s.changes ?? []).some(
                  (c) => c.status === "pending" && c.lineIndex === li,
                );
                return (
                  <div
                    key={li}
                    className="rounded border px-2.5 py-1.5 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 leading-relaxed">
                        {renderLine(s, si, line, li)}
                      </div>
                      {canMark && !s.variationRef && !hasPending && (
                        <button
                          type="button"
                          aria-label={`Propose a change to line ${li + 1} of ${s.title}`}
                          title="Propose a change"
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setProposing(open ? null : { s: si, l: li });
                            setText(line);
                            setAsParty(null);
                          }}
                        >
                          <PenSquare className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {open && (
                      <div className="mt-2 space-y-2 border-t pt-2">
                        <Textarea
                          aria-label="Proposed wording"
                          rows={3}
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          className="text-sm"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Edit the line as it should read. Start a new line for
                          an additional paragraph.
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            Proposed by
                          </span>
                          <Select
                            value={asParty ?? pen}
                            onValueChange={(v) =>
                              setAsParty(v as DealPartySide)
                            }
                          >
                            <SelectTrigger
                              aria-label="Proposed by"
                              className="h-8 w-28 text-xs"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Party A">Party A</SelectItem>
                              <SelectItem value="Party B">Party B</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="flex-1" />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setProposing(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            disabled={
                              !text.trim() ||
                              norm(text) === norm(line) ||
                              proposeMut.isPending
                            }
                            onClick={() => proposeMut.mutate({ s: si, l: li })}
                          >
                            Propose change
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      {total === 0 && (
        <div className="py-10 text-center text-sm text-muted-foreground">
          This document has no sections.
        </div>
      )}
    </div>
  );
}
