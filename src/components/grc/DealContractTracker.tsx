import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { CornerDownRight, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  addContractComment,
  replyToContractComment,
  toggleContractComment,
  type Contract,
  type ContractComment,
  type Deal,
  type DealPartySide,
} from "@/lib/grc/deals-api";
import {
  changeCounts,
  collectThreads,
  commentCounts,
  fmtDay,
  fmtWhen,
  initialsOf,
  sourceLabel,
  type ThreadRef,
} from "@/lib/grc/contract-tracking";

// Comment threads and the "Comments & changes" tracker of a deal contract.

const CHIP: Record<string, string> = {
  "Party A": "border-violet-500/30 bg-violet-500/10 text-violet-700",
  "Party B": "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-700",
  Internal: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  Team: "border-border bg-muted text-muted-foreground",
};
const AVATAR: Record<string, string> = {
  "Party A": "bg-violet-600",
  "Party B": "bg-fuchsia-600",
  Internal: "bg-sky-600",
  Team: "bg-slate-500",
};

export function SourceChip({
  source,
}: {
  source: { internal?: boolean; party?: DealPartySide | null };
}) {
  const label = sourceLabel(source);
  return (
    <span
      className={`rounded border px-1.5 py-px text-[10px] font-medium uppercase tracking-wide ${CHIP[label]}`}
    >
      {label}
    </span>
  );
}

function Avatar({
  name,
  source,
  small,
}: {
  name: string;
  source: { internal?: boolean; party?: DealPartySide | null };
  small?: boolean;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${AVATAR[sourceLabel(source)]} ${small ? "h-5 w-5 text-[9px]" : "h-7 w-7 text-[10px]"}`}
    >
      {initialsOf(name)}
    </span>
  );
}

/** Add, reply to and resolve comments on a contract's clauses. */
export function useCommentActions(
  deal: Deal,
  contract: Contract,
  onChanged: () => void,
) {
  const { user } = useAuth();
  const me = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
    : "";
  const fail = (what: string) => (err: any) =>
    toast.error(err?.response?.data?.message ?? what);

  const toggle = useMutation({
    mutationFn: ({ sIndex, cIndex }: { sIndex: number; cIndex: number }) =>
      toggleContractComment(deal._id, contract._id, sIndex, cIndex),
    onSuccess: onChanged,
    onError: fail("Could not update the comment"),
  });
  const reply = useMutation({
    mutationFn: (v: {
      sIndex: number;
      cIndex: number;
      text: string;
      party?: DealPartySide;
      internal?: boolean;
    }) =>
      replyToContractComment(deal._id, contract._id, v.sIndex, v.cIndex, {
        author: me || "You",
        text: v.text,
        party: v.party,
        internal: v.internal,
      }),
    onSuccess: onChanged,
    onError: fail("Could not send the reply"),
  });
  const add = useMutation({
    mutationFn: (v: {
      sIndex: number;
      author: string;
      text: string;
      party?: DealPartySide;
      internal?: boolean;
    }) =>
      addContractComment(deal._id, contract._id, v.sIndex, v.author, v.text, {
        party: v.party,
        internal: v.internal,
      }),
    onSuccess: onChanged,
    onError: fail("Could not add the comment"),
  });
  return { me, toggle, reply, add };
}
export type CommentActions = ReturnType<typeof useCommentActions>;

const SIDES: DealPartySide[] = ["Party A", "Party B"];

/** One comment with its replies, a reply box and Resolve / Reopen. */
export function CommentThread({
  thread,
  actions,
  showSection,
  active,
  onOpen,
}: {
  thread: ThreadRef;
  actions: CommentActions;
  /** Show which clause it is on (the tracker does; the clause itself doesn't). */
  showSection?: boolean;
  active?: boolean;
  onOpen?: () => void;
}) {
  const { sIndex, cIndex, sectionTitle, comment: c } = thread;
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState("");
  const [party, setParty] = useState<DealPartySide | "">("");
  const [internal, setInternal] = useState(false);
  const replies = c.replies ?? [];

  const send = () =>
    actions.reply.mutate(
      {
        sIndex,
        cIndex,
        text: text.trim(),
        party: party || undefined,
        internal,
      },
      {
        onSuccess: () => {
          setText("");
          setReplying(false);
          setInternal(false);
        },
      },
    );

  return (
    <div
      data-testid="comment-thread"
      className={`rounded-md border p-2.5 text-xs ${c.resolved ? "border-emerald-500/20 bg-emerald-500/5 opacity-80" : "bg-background"} ${active ? "ring-2 ring-primary/40" : ""}`}
    >
      <div
        className={`flex items-start gap-2 ${onOpen ? "cursor-pointer" : ""}`}
        onClick={onOpen}
      >
        <Avatar name={c.author} source={c} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold">{c.author}</span>
            <SourceChip source={c} />
            {showSection && (
              <span className="truncate text-[10px] text-muted-foreground">
                §{sectionTitle}
              </span>
            )}
            {c.resolved && (
              <span className="text-[10px] font-medium text-emerald-700">
                Resolved{c.resolvedBy ? ` by ${c.resolvedBy}` : ""}
              </span>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {fmtWhen(c.createdAt)}
          </div>
          {c.quote && (
            <div className="mt-1 border-l-2 pl-2 italic text-muted-foreground">
              “{c.quote}”
            </div>
          )}
          <div
            className={`mt-1 whitespace-pre-wrap ${c.resolved ? "text-muted-foreground" : ""}`}
          >
            {c.text}
          </div>
        </div>
      </div>

      {replies.length > 0 && (
        <div className="ml-4 mt-2 space-y-2 border-l pl-3">
          {replies.map((r, i) => (
            <div key={i} className="flex items-start gap-2">
              <Avatar name={r.author} source={r} small />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">{r.author}</span>
                  <SourceChip source={r} />
                  <span className="text-[10px] text-muted-foreground">
                    {fmtWhen(r.createdAt)}
                  </span>
                </div>
                <div className="whitespace-pre-wrap">{r.text}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[11px]"
          onClick={() => setReplying((v) => !v)}
        >
          <CornerDownRight className="mr-1 h-3 w-3" />
          Reply
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[11px]"
          disabled={actions.toggle.isPending}
          onClick={() => actions.toggle.mutate({ sIndex, cIndex })}
        >
          {c.resolved ? (
            <>
              <RotateCcw className="mr-1 h-3 w-3" />
              Reopen
            </>
          ) : (
            <>
              <Check className="mr-1 h-3 w-3" />
              Resolve
            </>
          )}
        </Button>
      </div>

      {replying && (
        <div className="mt-1 space-y-1.5">
          <Textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Reply…"
            className="text-xs"
            aria-label="Reply"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Reply from"
              value={party}
              onChange={(e) => setParty(e.target.value as DealPartySide | "")}
              className="h-7 rounded-md border bg-background px-1.5 text-xs"
            >
              <option value="">From the team</option>
              {SIDES.map((s) => (
                <option key={s} value={s}>
                  From {s}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-[11px]">
              <input
                type="checkbox"
                checked={internal}
                onChange={(e) => setInternal(e.target.checked)}
              />
              Internal
            </label>
            <Button
              size="sm"
              className="ml-auto h-7"
              disabled={!text.trim() || actions.reply.isPending}
              onClick={send}
            >
              Send reply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

type Filter = "all" | "open" | "resolved" | "internal";

/**
 * The tracker: where the negotiation stands (round, changes, comments) and
 * every comment, line comment and tracked change in one list.
 */
export function ContractTrackerPanel({
  deal,
  contract,
  onChanged,
  onJump,
  onOpenRedline,
}: {
  deal: Deal;
  contract: Contract;
  onChanged: () => void;
  /** Go to a clause in the Edit tab. */
  onJump: (sIndex: number) => void;
  onOpenRedline: () => void;
}) {
  const actions = useCommentActions(deal, contract, onChanged);
  const [filter, setFilter] = useState<Filter>("all");
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const threads = collectThreads(contract);
  const { open, resolved, internal } = commentCounts(contract);
  const { pending, accepted } = changeCounts(contract);

  const shownThreads = threads.filter(({ comment: c }) =>
    filter === "all"
      ? true
      : filter === "open"
        ? !c.resolved
        : filter === "resolved"
          ? c.resolved
          : !!c.internal,
  );
  const changes = contract.sections.flatMap((s, sIndex) =>
    (s.changes ?? []).map((ch) => ({ ch, sIndex, title: s.title })),
  );
  const shownChanges = changes.filter(({ ch }) =>
    filter === "all"
      ? true
      : filter === "open"
        ? ch.status === "pending"
        : filter === "resolved"
          ? ch.status === "accepted"
          : false,
  );
  const lineComments =
    filter === "all"
      ? contract.sections.flatMap((s, sIndex) =>
          (s.redlines ?? []).map((r) => ({ r, sIndex, title: s.title })),
        )
      : [];
  const total = shownThreads.length + shownChanges.length + lineComments.length;

  return (
    <aside
      aria-label="Comments and changes"
      className="space-y-3 rounded-lg border bg-background p-3"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Comments &amp; changes</h4>
        <span className="text-xs text-muted-foreground">{total}</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {(
          [
            ["all", "All"],
            ["open", "Open"],
            ["resolved", "Resolved"],
            ["internal", "Internal"],
          ] as [Filter, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] ${filter === k ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-md bg-muted/50 p-2.5 text-xs">
        <div className="mb-1 font-semibold">
          Round {contract.round ?? 1}
          {contract.penParty ? ` · ${contract.penParty} has the pen` : ""}
        </div>
        {(
          [
            ["Pending changes", pending, "text-amber-600"],
            ["Accepted changes", accepted, "text-emerald-600"],
            ["Open comments", open, "text-primary"],
            ["Resolved comments", resolved, "text-muted-foreground"],
          ] as [string, number, string][]
        ).map(([label, n, tone]) => (
          <div key={label} className="flex justify-between py-0.5">
            <span>{label}</span>
            <span className={`font-semibold ${tone}`}>{n}</span>
          </div>
        ))}
        {internal > 0 && (
          <div className="flex justify-between py-0.5">
            <span>Internal notes</span>
            <span className="font-semibold text-sky-600">{internal}</span>
          </div>
        )}
      </div>

      <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-0.5">
        {total === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {filter === "all"
              ? "No comments or changes yet."
              : "Nothing matches this filter."}
          </p>
        )}

        {shownChanges.map(({ ch, sIndex, title }, i) => (
          <div
            key={`ch-${sIndex}-${ch.id ?? i}`}
            data-testid="tracker-change"
            className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold">Tracked change</span>
              <SourceChip source={{ party: ch.party }} />
              <span className="text-[10px] text-muted-foreground">
                R{ch.round} · {ch.status === "pending" ? "Pending" : "Accepted"}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {ch.authorName || ch.party} · §{title} · {fmtDay(ch.createdAt)}
            </div>
            <div className="mt-1">
              {ch.del && (
                <span className="rounded bg-rose-500/15 px-0.5 text-rose-700 line-through">
                  {ch.del}
                </span>
              )}{" "}
              {ch.ins && (
                <span className="rounded bg-emerald-500/15 px-0.5 text-emerald-700">
                  {ch.ins}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[11px]"
                onClick={() => onJump(sIndex)}
              >
                Go to clause
              </Button>
              {ch.status === "pending" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[11px]"
                  onClick={onOpenRedline}
                >
                  Review in Redline
                </Button>
              )}
            </div>
          </div>
        ))}

        {shownThreads.map((t) => {
          const key = `${t.sIndex}-${t.cIndex}`;
          return (
            <CommentThread
              key={key}
              thread={t}
              actions={actions}
              showSection
              active={activeKey === key}
              onOpen={() => {
                setActiveKey(key);
                onJump(t.sIndex);
              }}
            />
          );
        })}

        {lineComments.map(({ r, sIndex, title }, i) => (
          <div
            key={`ln-${sIndex}-${i}`}
            data-testid="tracker-line-comment"
            className="rounded-md border border-rose-500/20 bg-rose-500/5 p-2.5 text-xs"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold">{r.authorName}</span>
              <span
                className={`rounded border px-1.5 py-px text-[10px] font-medium uppercase tracking-wide ${r.source === "external" ? CHIP["Party B"] : CHIP.Team}`}
              >
                {r.source === "external" ? "Reviewer" : "Team"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                line comment · §{title}
              </span>
            </div>
            {r.quotedText && (
              <div className="mt-1 border-l-2 pl-2 italic text-muted-foreground">
                “
                {r.quotedText.length > 120
                  ? `${r.quotedText.slice(0, 120)}…`
                  : r.quotedText}
                ”
              </div>
            )}
            <div className="mt-1">{r.comment}</div>
            <Button
              size="sm"
              variant="ghost"
              className="mt-1 h-6 px-2 text-[11px]"
              onClick={() => onJump(sIndex)}
            >
              Go to clause
            </Button>
          </div>
        ))}
      </div>
    </aside>
  );
}

export type { ContractComment };
