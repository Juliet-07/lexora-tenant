// Turns whatever approval history a record holds into one common shape —
// who asked, who has approved (and when), who is still to decide, and who
// sent it back — so every place that has an approval can show the same
// "details" view. Pure functions: no React, no network.

import type {
  ApprovalInfo,
  Bill,
  ExpenseClaim,
  Quote,
  TaxFiling,
  TaxObligation,
  HoldingValuation,
} from "@/lib/crm/finance-api";

export type StepState = "done" | "pending" | "rejected" | "info";

export interface TrailStep {
  label: string; // "Submitted", "Approval", "Sent back"…
  name: string;
  state: StepState;
  at?: string | null;
  note?: string;
  tag?: string; // "Account owner"
}

export interface ApprovalDetails {
  title: string;
  status: string;
  fields: { label: string; value: string }[];
  /** One line on where it stands ("Waiting on Aline and Jean"). */
  summary: string;
  steps: TrailStep[];
  /** Why it was routed this way. */
  rule?: string;
  rejectedReason?: string;
}

const needed = (a: ApprovalInfo) => (a.mode === "dual" ? 2 : 1);

interface Source {
  status: string;
  submittedByName?: string;
  submittedAt?: string | null; // when it was sent for approval
  approval?: ApprovalInfo | null;
  rejectedReason?: string;
  legacyApprovedBy?: string | null; // approver recorded as a plain name
  legacyApprovedAt?: string | null;
  pendingStatus: string;
  rejectedStatus: string;
}

/** Shared trail for bills and quotes (the two tier-routed approvals). */
export function approvalTrail(src: Source): {
  summary: string;
  steps: TrailStep[];
  rule?: string;
  rejectedReason?: string;
} {
  const a = src.approval ?? null;
  const steps: TrailStep[] = [];
  const pending = src.status === src.pendingStatus;
  const rejected = src.status === src.rejectedStatus;

  if (src.submittedByName) {
    steps.push({
      label: "Submitted",
      name: src.submittedByName,
      state: "done",
      at: a?.submittedAt ?? src.submittedAt ?? null,
    });
  }

  if (!a) {
    // Written by the account owner or a finance user — no routing.
    if (src.legacyApprovedBy) {
      steps.push({
        label: "Approved",
        name: src.legacyApprovedBy,
        state: "done",
        at: src.legacyApprovedAt ?? null,
      });
    }
    if (rejected) {
      steps.push({
        label: "Sent back",
        name: "—",
        state: "rejected",
        note: src.rejectedReason || undefined,
      });
    }
    return {
      summary: pending
        ? "Waiting for the account owner or a finance manager"
        : rejected
          ? "Sent back"
          : src.legacyApprovedBy
            ? `Approved by ${src.legacyApprovedBy}`
            : "No approval was needed — it was recorded by the account owner or finance team",
      steps,
      rejectedReason: rejected ? src.rejectedReason : undefined,
    };
  }

  const decidedIds = new Set(a.approvals.map((x) => x.userId));
  // Named approvers first, in the order the rule lists them.
  a.approverIds.forEach((id, i) => {
    const hit = a.approvals.find((x) => x.userId === id);
    steps.push({
      label: "Approval",
      name: hit?.name ?? a.approverNames[i] ?? "Approver",
      state: hit ? "done" : rejected ? "info" : "pending",
      at: hit?.at ?? null,
      note: hit ? undefined : rejected ? "Did not decide" : undefined,
    });
  });
  // Anyone else who approved — in practice the account owner.
  a.approvals
    .filter((x) => !a.approverIds.includes(x.userId))
    .forEach((x) =>
      steps.push({
        label: "Approval",
        name: x.name,
        state: "done",
        at: x.at,
        tag: x.isOwner ? "Account owner" : undefined,
      }),
    );
  a.approvals
    .filter((x) => x.isOwner && a.approverIds.includes(x.userId))
    .forEach((x) => {
      const s = steps.find((t) => t.name === x.name && t.state === "done");
      if (s) s.tag = "Account owner";
    });

  if (rejected) {
    steps.push({
      label: "Sent back",
      name: a.rejectedBy || "—",
      state: "rejected",
      at: a.rejectedAt ?? null,
      note: a.rejectedReason || src.rejectedReason || undefined,
    });
  }

  const done = a.approvals.length;
  let summary: string;
  if (rejected)
    summary = `Sent back${a.rejectedBy ? ` by ${a.rejectedBy}` : ""}`;
  else if (pending) {
    if (done === 0) {
      summary =
        a.mode === "dual"
          ? "Needs 2 approvals — none given yet (the account owner can approve on their own)"
          : "Waiting for one approver (the account owner can also approve)";
    } else {
      summary = `${done} of ${needed(a)} approvals given`;
    }
  } else {
    summary =
      done === 1 && a.approvals[0].isOwner
        ? `Approved by the account owner, ${a.approvals[0].name}`
        : `Approved by ${a.approvals.map((x) => x.name).join(" and ")}`;
  }

  return {
    summary,
    steps,
    rule:
      `${a.tierName} · ${a.mode === "dual" ? "two approvals" : "one approval"} needed` +
      " · the account owner can always approve on their own",
    rejectedReason: rejected
      ? a.rejectedReason || src.rejectedReason
      : undefined,
  };
}

const d = (s?: string | null) => (s ? s.slice(0, 10) : "—");

export function quoteDetails(
  q: Quote,
  fmt: (n: number, c: string) => string,
): ApprovalDetails {
  const t = approvalTrail({
    status: q.status,
    submittedByName: q.submittedByName,
    submittedAt: q.issued,
    approval: q.approval,
    rejectedReason: q.rejectedReason,
    pendingStatus: "Pending approval",
    rejectedStatus: "Rejected",
  });
  return {
    title: `${q.kind} ${q.ref}`,
    status: q.status,
    fields: [
      { label: "Client", value: q.clientName },
      { label: "Title", value: q.title },
      { label: "Amount", value: fmt(q.amount, q.currency) },
      { label: "Issued", value: d(q.issued) },
      { label: "Expires", value: d(q.expires) },
      { label: "Prepared by", value: q.submittedByName || "Account owner" },
    ],
    ...t,
  };
}

export function billDetails(
  b: Bill,
  fmt: (n: number, c: string) => string,
): ApprovalDetails {
  const t = approvalTrail({
    status: b.status,
    submittedByName: b.submittedByName,
    approval: b.approval,
    rejectedReason: b.rejectedReason,
    legacyApprovedBy: b.approvedBy,
    legacyApprovedAt: b.approvedAt ?? null,
    pendingStatus: "Awaiting approval",
    rejectedStatus: "Rejected",
  });
  return {
    title: `Bill ${b.ref}`,
    status: b.status,
    fields: [
      { label: "Payee", value: b.vendorName },
      { label: "Description", value: b.description },
      { label: "Amount", value: fmt(b.amount, b.currency) },
      { label: "Due", value: d(b.dueOn) },
      ...(b.submittedByName
        ? [{ label: "Submitted by", value: b.submittedByName }]
        : []),
    ],
    ...t,
  };
}

export function claimDetails(
  c: ExpenseClaim,
  fmt: (n: number, c: string) => string,
): ApprovalDetails {
  const decided = c.status === "Approved" || c.status === "Paid";
  const rejected = c.status === "Rejected";
  const steps: TrailStep[] = [
    {
      label: "Submitted",
      name: c.employee,
      state: "done",
      at: c.createdAt,
    },
  ];
  if (decided || rejected) {
    steps.push({
      label: rejected ? "Rejected" : "Approved",
      name:
        c.decidedByName ||
        "Not recorded (decided before approvers were tracked)",
      state: rejected ? "rejected" : "done",
      at: c.decidedAt ?? null,
    });
  }
  if (c.status === "Paid") {
    steps.push({ label: "Reimbursed", name: "—", state: "info" });
  }
  return {
    title: `Expense claim ${c.ref}`,
    status: c.status,
    fields: [
      { label: "Claimant", value: c.employee },
      { label: "Description", value: c.description },
      { label: "Amount", value: fmt(c.amount, c.currency) },
      { label: "Rechargeable", value: c.rechargeable ? "Yes" : "No" },
    ],
    summary: rejected
      ? `Rejected${c.decidedByName ? ` by ${c.decidedByName}` : ""}`
      : decided
        ? `Approved${c.decidedByName ? ` by ${c.decidedByName}` : ""}`
        : "Waiting for a finance decision",
    steps,
  };
}

export function taxFilingDetails(
  o: TaxObligation,
  fmt: (n: number, c: string) => string,
): ApprovalDetails {
  const f: TaxFiling | null = o.filing;
  const steps: TrailStep[] = [];
  if (f) {
    steps.push({
      label: "Recorded",
      name: f.recordedByName || "Account owner",
      state: "done",
      at: f.recordedAt ?? f.filedOn,
    });
    if (f.approvedByName) {
      steps.push({
        label: "Approved",
        name: f.approvedByName,
        state: "done",
        at: f.approvedAt,
        tag: "Account owner",
      });
    } else if (f.rejectedReason) {
      steps.push({
        label: "Sent back",
        name: "Account owner",
        state: "rejected",
        at: f.rejectedAt,
        note: f.rejectedReason,
      });
    } else if (o.status === "Pending approval") {
      steps.push({
        label: "Approval",
        name: "Account owner",
        state: "pending",
      });
    }
  }
  const ownerFiled = f && !f.approvedByName && o.status === "Filed";
  return {
    title: `${o.name} · ${o.period}`,
    status: o.status,
    fields: [
      { label: "Tax", value: o.name },
      { label: "Period", value: o.period },
      { label: "Due", value: d(o.dueOn) },
      { label: "Amount paid", value: f ? fmt(f.amountPaid, o.currency) : "—" },
      { label: "Filed on", value: d(f?.filedOn) },
    ],
    summary:
      o.status === "Pending approval"
        ? "Waiting for the account owner — they have the final say on every filing"
        : o.status === "Filed"
          ? ownerFiled
            ? "Filed directly by the account owner — no approval was needed"
            : `Approved by ${f?.approvedByName || "the account owner"}`
          : f?.rejectedReason
            ? "Sent back for changes"
            : "Not filed yet",
    steps,
    rule: "Filings recorded by anyone other than the account owner need the owner's approval.",
    rejectedReason: f?.rejectedReason || undefined,
  };
}

export function valuationDetails(
  v: HoldingValuation,
  companyName: string,
  fmt: (n: number) => string,
): ApprovalDetails {
  const steps: TrailStep[] = [
    {
      label: "Proposed",
      name: v.proposedBy || "—",
      state: v.proposedBy ? "done" : "info",
      at: v.proposedAt,
      note: `Proposed value ${fmt(v.proposedValue)}`,
    },
  ];
  if (v.reviewedBy || v.reviewedValue !== null) {
    steps.push({
      label: "Reviewed",
      name: v.reviewedBy || "—",
      state: "done",
      at: v.reviewedAt,
      note:
        [
          v.reviewedValue !== null
            ? `Reviewed value ${fmt(v.reviewedValue)}`
            : "",
          v.reviewNotes,
        ]
          .filter(Boolean)
          .join(" — ") || undefined,
    });
  }
  if (v.approvedBy) {
    steps.push({
      label: "Approved",
      name: v.approvedBy,
      state: "done",
      at: v.approvedAt,
      note:
        v.approvedValue !== null
          ? `Approved value ${fmt(v.approvedValue)}`
          : undefined,
    });
  } else {
    steps.push({
      label: "Approval",
      name: "Not yet approved",
      state: "pending",
    });
  }
  return {
    title: `${companyName} · ${v.period} valuation`,
    status: String(v.status),
    fields: [
      { label: "Method", value: String(v.method) },
      { label: "IFRS level", value: String(v.ifrsLevel) },
      { label: "Key input", value: v.keyInput || "—" },
    ],
    summary: v.approvedBy
      ? `Approved by ${v.approvedBy}`
      : "Waiting for approval",
    steps,
  };
}
