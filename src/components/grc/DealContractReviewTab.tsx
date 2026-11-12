import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BellRing,
  Check,
  Clock,
  Eye,
  Mail,
  MessageSquare,
  PenLine,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  remindContractReviewers,
  sendContractForReview,
  type Contract,
  type Deal,
} from "@/lib/grc/deals-api";
import {
  buildActivity,
  changeCounts,
  collectThreads,
  fmtDay,
  fmtWhen,
  initialsOf,
  reviewerRows,
  type ActivityKind,
} from "@/lib/grc/contract-tracking";
import {
  CommentThread,
  useCommentActions,
} from "@/components/grc/DealContractTracker";

const errMsg = (err: any, fallback: string) =>
  err?.response?.data?.message ?? fallback;

/** Who can be sent this document: the parties allowed to review it. */
export function reviewCandidates(deal: Deal, contract: Contract) {
  const termSheet = contract.kind === "term_sheet";
  return (deal.parties ?? []).filter((p) =>
    termSheet ? p.permissions?.offerReview : p.permissions?.contractReview,
  );
}

// ── Send for review ──────────────────────────────────────────

export function SendForReviewDialog({
  deal,
  contract,
  open,
  onOpenChange,
  onSent,
}: {
  deal: Deal;
  contract: Contract;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSent: () => void;
}) {
  const candidates = reviewCandidates(deal, contract);
  const [picked, setPicked] = useState<string[] | null>(null);
  const [message, setMessage] = useState("");
  // Everyone is selected until the sender changes it.
  const selected = picked ?? candidates.map((p) => p.email.toLowerCase());
  const { pending } = changeCounts(contract);
  const openComments = collectThreads(contract).filter(
    (t) => !t.comment.resolved,
  ).length;
  const round = contract.round ?? 1;
  const alreadySent = new Set(
    (contract.reviewLoop?.tokens ?? []).map((t) =>
      (t.partyEmail ?? "").toLowerCase(),
    ),
  );

  const sendMut = useMutation({
    mutationFn: () =>
      sendContractForReview(deal._id, contract._id, {
        recipients: selected,
        message: message.trim() || undefined,
      }),
    onSuccess: (res) => {
      toast.success(
        `Sent to ${res.sent.length} ${res.sent.length === 1 ? "person" : "people"}`,
      );
      setMessage("");
      setPicked(null);
      onSent();
      onOpenChange(false);
    },
    onError: (err) => toast.error(errMsg(err, "Failed to send for review")),
  });

  const toggle = (email: string) => {
    const e = email.toLowerCase();
    setPicked(
      selected.includes(e) ? selected.filter((x) => x !== e) : [...selected, e],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send for review</DialogTitle>
          <DialogDescription>
            Each person gets a secure link to read it, comment, and approve or
            request changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div>
            <div className="mb-1.5 text-xs font-medium">Send to</div>
            {candidates.length === 0 ? (
              <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
                No party has review access for this document. Turn it on for a
                party in the deal’s Parties.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {candidates.map((p) => {
                  const on = selected.includes(p.email.toLowerCase());
                  return (
                    <button
                      key={p.email}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(p.email)}
                      className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
                    >
                      {p.name}
                      <span className="ml-1 opacity-70">· {p.side}</span>
                      {alreadySent.has(p.email.toLowerCase()) && (
                        <span className="ml-1 opacity-70">· sent before</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="mb-1.5 text-xs font-medium">
              Message <span className="text-muted-foreground">(optional)</span>
            </div>
            <Textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Please review and let us have your comments by…"
              aria-label="Message to reviewers"
            />
          </div>

          <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <b className="text-foreground">Round {round}</b> · {pending} pending{" "}
            {pending === 1 ? "change" : "changes"} · {openComments} open{" "}
            {openComments === 1 ? "comment" : "comments"}. Anyone you send it to
            again is asked to respond afresh.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={selected.length === 0 || sendMut.isPending}
            onClick={() => sendMut.mutate()}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Send
            {selected.length > 0 ? ` to ${selected.length}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Review tab ───────────────────────────────────────────────

const STATUS: Record<
  "approved" | "changes" | "pending",
  { label: string; cls: string }
> = {
  approved: {
    label: "Approved",
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  },
  changes: {
    label: "Changes requested",
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  },
  pending: {
    label: "Pending",
    cls: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  },
};

const DOT: Record<ActivityKind, { icon: React.ReactNode; cls: string }> = {
  sent: { icon: <Mail className="h-3 w-3" />, cls: "bg-sky-500" },
  reminded: { icon: <BellRing className="h-3 w-3" />, cls: "bg-slate-400" },
  viewed: { icon: <Eye className="h-3 w-3" />, cls: "bg-slate-400" },
  approved: { icon: <Check className="h-3 w-3" />, cls: "bg-emerald-500" },
  changes: { icon: <PenLine className="h-3 w-3" />, cls: "bg-amber-500" },
  comment: {
    icon: <MessageSquare className="h-3 w-3" />,
    cls: "bg-violet-500",
  },
  reply: { icon: <MessageSquare className="h-3 w-3" />, cls: "bg-violet-400" },
  resolved: { icon: <Check className="h-3 w-3" />, cls: "bg-emerald-400" },
  line: { icon: <PenLine className="h-3 w-3" />, cls: "bg-rose-500" },
  change: { icon: <PenLine className="h-3 w-3" />, cls: "bg-amber-500" },
  accepted: { icon: <Check className="h-3 w-3" />, cls: "bg-emerald-500" },
};

export function ContractReviewTab({
  deal,
  contract,
  docName,
  onChanged,
  onJump,
  onSend,
}: {
  deal: Deal;
  contract: Contract;
  docName: string;
  onChanged: () => void;
  onJump: (sIndex: number) => void;
  onSend: () => void;
}) {
  const reviewers = useMemo(() => reviewerRows(contract), [contract]);
  const approved = reviewers.filter((r) => r.status === "approved").length;
  const changes = reviewers.filter((r) => r.status === "changes").length;
  const pending = reviewers.filter((r) => r.status === "pending").length;
  const total = reviewers.length;
  const answered = approved + changes;
  const activity = useMemo(() => buildActivity(contract), [contract]);
  const actions = useCommentActions(deal, contract, onChanged);
  const threads = collectThreads(contract);
  const open = threads.filter((t) => !t.comment.resolved);
  const resolved = threads.filter((t) => t.comment.resolved);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const remindMut = useMutation({
    mutationFn: (email?: string) =>
      remindContractReviewers(
        deal._id,
        contract._id,
        email ? [email] : undefined,
      ),
    onSuccess: (r) => {
      onChanged();
      toast.success(
        r.reminded.length === 1
          ? "Reminder sent"
          : `Reminders sent to ${r.reminded.length} people`,
      );
    },
    onError: (err) => toast.error(errMsg(err, "Could not send the reminder")),
  });

  // Open comments grouped by clause.
  const bySection = new Map<number, typeof open>();
  for (const t of open)
    bySection.set(t.sIndex, [...(bySection.get(t.sIndex) ?? []), t]);

  const shownActivity = showAll ? activity : activity.slice(0, 12);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-start justify-between gap-3 rounded-md border bg-background px-3 py-2.5 text-xs text-muted-foreground">
        <p>
          <b>Send for review</b> emails a secure link to each party on the deal
          who has {docName === "term sheet" ? "offer" : "contract"}-review
          access. They can comment, redline and approve or request changes —
          their answers appear here.
        </p>
        <Button size="sm" className="shrink-0" onClick={onSend}>
          <Send className="mr-1.5 h-3.5 w-3.5" />
          {total ? "Send again" : "Send for review"}
        </Button>
      </div>

      {total > 0 && (
        <section className="space-y-3 rounded-lg border bg-background p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Approval progress</h4>
            <Badge variant="outline">
              {answered} of {total} responded
            </Badge>
          </div>
          <Progress
            value={total ? (answered / total) * 100 : 0}
            className="h-2"
            aria-label="Approval progress"
          />
          <div className="grid grid-cols-3 gap-2 text-center">
            {(
              [
                ["Approved", approved, "text-emerald-600"],
                ["Changes requested", changes, "text-amber-600"],
                ["Pending", pending, "text-sky-600"],
              ] as [string, number, string][]
            ).map(([label, n, tone]) => (
              <div key={label} className="rounded-md bg-muted/50 py-2">
                <div className={`text-lg font-semibold ${tone}`}>{n}</div>
                <div className="text-[11px] text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {total > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Reviewers</h4>
            {pending > 1 && (
              <Button
                size="sm"
                variant="outline"
                disabled={remindMut.isPending}
                onClick={() => remindMut.mutate(undefined)}
              >
                <BellRing className="mr-1.5 h-3.5 w-3.5" />
                Remind everyone waiting
              </Button>
            )}
          </div>
          {reviewers.map((r) => {
            const email = r.token.partyEmail ?? "";
            const name = r.token.partyName ?? email;
            const isOpen = expanded === email;
            const st = STATUS[r.status];
            return (
              <div
                key={email}
                data-testid="reviewer-card"
                className="rounded-lg border bg-background"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 p-3 text-left"
                  onClick={() => setExpanded(isOpen ? null : email)}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-[11px] font-semibold text-white">
                      {initialsOf(name)}
                    </span>
                    <div>
                      <div className="text-sm font-medium">{name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.status === "pending" && r.viewed && (
                      <span className="text-[10px] text-muted-foreground">
                        Viewed
                      </span>
                    )}
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${st.cls}`}
                    >
                      {st.label}
                    </span>
                  </div>
                </button>
                {isOpen && (
                  <div className="space-y-1.5 border-t px-3 py-2.5 text-xs">
                    <div>
                      <b>Sent:</b> {fmtWhen(r.token.sentAt)}
                      {r.token.round ? ` · Round ${r.token.round}` : ""}
                      {r.token.sentBy ? ` · by ${r.token.sentBy}` : ""}
                    </div>
                    {r.token.message && (
                      <div className="border-l-2 pl-2 italic text-muted-foreground">
                        “{r.token.message}”
                      </div>
                    )}
                    {r.token.viewedAt && (
                      <div>
                        <b>Opened:</b> {fmtWhen(r.token.viewedAt)}
                      </div>
                    )}
                    {r.token.lastRemindedAt && (
                      <div>
                        <b>Last reminded:</b> {fmtWhen(r.token.lastRemindedAt)}
                      </div>
                    )}
                    {r.answer ? (
                      <>
                        <div>
                          <b>Responded:</b> {fmtWhen(r.answer.respondedAt)}
                        </div>
                        {r.answer.comment && (
                          <div className="rounded border bg-muted/40 px-2 py-1.5">
                            “{r.answer.comment}”
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Awaiting response
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7"
                          disabled={remindMut.isPending}
                          onClick={() => remindMut.mutate(email)}
                        >
                          <BellRing className="mr-1.5 h-3 w-3" />
                          Nudge
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {total === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Not sent for review yet.
        </p>
      )}

      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-semibold">All comments</h4>
          <Badge variant="outline" className="text-rose-600">
            {open.length} open
          </Badge>
          {resolved.length > 0 && (
            <Badge variant="outline" className="text-emerald-600">
              {resolved.length} resolved
            </Badge>
          )}
        </div>
        {open.length === 0 && (
          <p className="text-xs text-muted-foreground">No open comments.</p>
        )}
        {[...bySection.entries()].map(([sIndex, list]) => (
          <div key={sIndex} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                § {contract.sections[sIndex]?.title}
              </span>
              <button
                type="button"
                className="text-[11px] text-primary hover:underline"
                onClick={() => onJump(sIndex)}
              >
                Go to clause →
              </button>
            </div>
            {list.map((t) => (
              <CommentThread
                key={`${t.sIndex}-${t.cIndex}`}
                thread={t}
                actions={actions}
              />
            ))}
          </div>
        ))}
        {resolved.length > 0 && (
          <div>
            <button
              type="button"
              className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
              onClick={() => setShowResolved((v) => !v)}
            >
              Resolved ({resolved.length}) {showResolved ? "▴" : "▾"}
            </button>
            {showResolved && (
              <div className="mt-1.5 space-y-1.5">
                {resolved.map((t) => (
                  <CommentThread
                    key={`${t.sIndex}-${t.cIndex}`}
                    thread={t}
                    actions={actions}
                    showSection
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold">Activity</h4>
        {activity.length === 0 && (
          <p className="text-xs text-muted-foreground">Nothing yet.</p>
        )}
        <ol className="space-y-2.5" data-testid="activity">
          {shownActivity.map((a, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white ${DOT[a.kind].cls}`}
              >
                {DOT[a.kind].icon}
              </span>
              <div className="min-w-0 flex-1">
                <div>
                  <b>{a.by}</b> · {a.text}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {fmtWhen(a.at)}
                </div>
              </div>
              {a.sIndex !== undefined && (
                <button
                  type="button"
                  className="shrink-0 text-[11px] text-primary hover:underline"
                  onClick={() => onJump(a.sIndex!)}
                >
                  Go to clause
                </button>
              )}
            </li>
          ))}
        </ol>
        {activity.length > 12 && (
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? "Show fewer" : `Show all ${activity.length}`}
          </button>
        )}
      </section>

      {total > 0 && (
        <section className="space-y-1.5">
          <h4 className="text-sm font-semibold">Sent to</h4>
          <div className="divide-y rounded-lg border bg-background">
            {reviewers.map((r) => (
              <div
                key={r.token.partyEmail}
                className="flex items-center justify-between px-3 py-2 text-xs"
              >
                <span>
                  <b>{r.token.partyName}</b>{" "}
                  <span className="text-muted-foreground">
                    · {r.token.partyEmail}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  {fmtDay(r.token.sentAt)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
