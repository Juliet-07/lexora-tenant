import type {
  Contract,
  ContractComment,
  DealPartySide,
  ReviewLoopResponse,
  ReviewLoopToken,
} from "@/lib/grc/deals-api";

// Everything that has happened in a contract's negotiation — comments,
// tracked changes, line comments and the review — gathered from the
// contract itself so it can be shown in one place.

export interface ThreadRef {
  sIndex: number;
  cIndex: number;
  sectionTitle: string;
  comment: ContractComment;
}

export const timeOf = (iso?: string | null) =>
  iso ? new Date(iso).getTime() : 0;

/** "9 Nov 2026, 14:05" in Kigali time. */
export const fmtWhen = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        timeZone: "Africa/Kigali",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

export const fmtDay = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        timeZone: "Africa/Kigali",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

/** Every clause comment, newest first. */
export function collectThreads(contract: Contract): ThreadRef[] {
  const out: ThreadRef[] = [];
  contract.sections.forEach((s, sIndex) =>
    (s.comments ?? []).forEach((comment, cIndex) =>
      out.push({ sIndex, cIndex, sectionTitle: s.title, comment }),
    ),
  );
  return out.sort(
    (a, b) => timeOf(b.comment.createdAt) - timeOf(a.comment.createdAt),
  );
}

export function changeCounts(contract: Contract) {
  let pending = 0;
  let accepted = 0;
  for (const s of contract.sections)
    for (const c of s.changes ?? [])
      c.status === "pending" ? pending++ : accepted++;
  return { pending, accepted };
}

export function commentCounts(contract: Contract) {
  const all = collectThreads(contract);
  return {
    open: all.filter((t) => !t.comment.resolved).length,
    resolved: all.filter((t) => t.comment.resolved).length,
    internal: all.filter((t) => t.comment.internal).length,
  };
}

/** Who a comment is from: "Internal", the side it names, or just the team. */
export function sourceLabel(c: {
  internal?: boolean;
  party?: DealPartySide | null;
}) {
  if (c.internal) return "Internal";
  return c.party ?? "Team";
}

export type ReviewerStatus = "approved" | "changes" | "pending";
export interface ReviewerRow {
  token: ReviewLoopToken;
  answer: ReviewLoopResponse | null;
  status: ReviewerStatus;
  viewed: boolean;
}

/** Each reviewer's standing on the version they were last sent. */
export function reviewerRows(contract: Contract): ReviewerRow[] {
  const loop = contract.reviewLoop;
  const responses = loop?.responses ?? [];
  return (loop?.tokens ?? []).map((token) => {
    const since = timeOf(token.sentAt);
    const answer =
      [...responses]
        .reverse()
        .find(
          (r) =>
            r.partyEmail === token.partyEmail && timeOf(r.respondedAt) >= since,
        ) ?? null;
    return {
      token,
      answer,
      status: answer
        ? answer.decision === "Approved"
          ? "approved"
          : "changes"
        : "pending",
      viewed: !!token.viewedAt,
    };
  });
}

export type ActivityKind =
  | "sent"
  | "reminded"
  | "viewed"
  | "approved"
  | "changes"
  | "comment"
  | "reply"
  | "resolved"
  | "line"
  | "change"
  | "accepted";

export interface ActivityItem {
  at: string;
  kind: ActivityKind;
  by: string;
  text: string;
  /** The clause it belongs to, to jump to. */
  sIndex?: number;
}

const clip = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** One timeline of the whole negotiation, newest first. */
export function buildActivity(contract: Contract): ActivityItem[] {
  const out: ActivityItem[] = [];
  const loop = contract.reviewLoop;

  const history = loop?.history ?? [];
  if (history.length) {
    for (const h of history) {
      out.push({
        at: h.at,
        by: h.by,
        sIndex: undefined,
        kind:
          h.type === "responded"
            ? h.detail.startsWith("Approved")
              ? "approved"
              : "changes"
            : h.type,
        text: h.detail,
      });
    }
  } else {
    // Reviews made before the history was kept: rebuild what we can.
    for (const t of loop?.tokens ?? [])
      out.push({
        at: t.sentAt,
        by: "Team",
        kind: "sent",
        text: `Sent to ${t.partyName ?? t.partyEmail}`,
      });
    for (const r of loop?.responses ?? [])
      out.push({
        at: r.respondedAt,
        by: r.partyName ?? r.name ?? r.partyEmail ?? "Reviewer",
        kind: r.decision === "Approved" ? "approved" : "changes",
        text:
          r.decision === "Approved"
            ? "Approved"
            : `Requested changes${r.comment ? ` — ${r.comment}` : ""}`,
      });
  }

  contract.sections.forEach((s, sIndex) => {
    for (const c of s.comments ?? []) {
      out.push({
        at: c.createdAt,
        by: c.author,
        sIndex,
        kind: "comment",
        text: `${c.internal ? "Internal note" : "Comment"} on “${s.title}”: ${clip(c.text)}`,
      });
      for (const r of c.replies ?? [])
        out.push({
          at: r.createdAt,
          by: r.author,
          sIndex,
          kind: "reply",
          text: `Replied on “${s.title}”: ${clip(r.text)}`,
        });
      if (c.resolved && c.resolvedAt)
        out.push({
          at: c.resolvedAt,
          by: c.resolvedBy || "Team",
          sIndex,
          kind: "resolved",
          text: `Resolved a comment on “${s.title}”`,
        });
    }
    for (const r of s.redlines ?? [])
      out.push({
        at: r.createdAt,
        by: r.authorName,
        sIndex,
        kind: "line",
        text: `Line comment on “${s.title}”: ${clip(r.comment)}`,
      });
    for (const ch of s.changes ?? []) {
      out.push({
        at: ch.createdAt,
        by: ch.authorName || ch.party,
        sIndex,
        kind: "change",
        text: `Proposed a change in “${s.title}” (${ch.party}, round ${ch.round})`,
      });
      if (ch.status === "accepted" && ch.decidedAt)
        out.push({
          at: ch.decidedAt,
          by: ch.decidedBy || "Team",
          sIndex,
          kind: "accepted",
          text: `Accepted a change in “${s.title}”`,
        });
    }
  });

  return out
    .filter((i) => timeOf(i.at) > 0)
    .sort((a, b) => timeOf(b.at) - timeOf(a.at));
}
