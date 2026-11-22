import { api } from "./api";

const unwrap = (res: any) => res.data?.data ?? res.data;

// The two places an approval chain applies. One chain per account per area.
export type ApprovalArea = "crm_contracts" | "grc_deals";
export type StepKind = "Reviewer" | "Approver";

export interface WorkflowPerson {
  id: string;
  name: string;
  email: string;
  position: string;
  /** False when the person has since left the team. */
  active?: boolean;
}
export interface WorkflowStepView {
  id: string;
  name: string;
  kind: StepKind;
  people: WorkflowPerson[];
}
export interface ApprovalWorkflow {
  module: ApprovalArea;
  label: string;
  /** False until the owner adds a drafter or a step — nothing is gated then. */
  configured: boolean;
  drafters: WorkflowPerson[];
  steps: WorkflowStepView[];
  updatedByName: string;
  updatedAt: string | null;
  /** Everyone the owner may pick from (owner only). */
  eligible: WorkflowPerson[];
  me: { isOwner: boolean; canDraft: boolean; stepNames: string[] };
}

export interface WorkflowInput {
  drafterIds: string[];
  steps: { name: string; kind: StepKind; userIds: string[] }[];
}

export const fetchApprovalWorkflow = async (
  area: ApprovalArea,
): Promise<ApprovalWorkflow> =>
  unwrap(await api.get(`/approvals/workflows/${area}`));

export const saveApprovalWorkflow = async (
  area: ApprovalArea,
  body: WorkflowInput,
): Promise<ApprovalWorkflow> =>
  unwrap(await api.put(`/approvals/workflows/${area}`, body));

// ── The chain on one contract ──────────────────────────────────
export type RunStepStatus =
  "Waiting" | "In review" | "Approved" | "Sent back" | "Skipped";
export type RunStatus =
  "Not submitted" | "In approval" | "Approved" | "Sent back";

export interface ApprovalRunStep {
  _id?: string;
  name: string;
  kind: StepKind | "Owner";
  userIds: string[];
  userNames: string[];
  status: RunStepStatus;
  decidedById: string | null;
  decidedByName: string;
  decidedAt: string | null;
  note: string;
}
export interface ApprovalRun {
  status: RunStatus;
  steps: ApprovalRunStep[];
  submittedAt: string | null;
  submittedByName: string;
  sentBackReason: string;
  round: number;
  history: { at: string; byName: string; action: string; detail: string }[];
}

export const EMPTY_RUN: ApprovalRun = {
  status: "Not submitted",
  steps: [],
  submittedAt: null,
  submittedByName: "",
  sentBackReason: "",
  round: 0,
  history: [],
};

export const runOf = (item: { approval?: ApprovalRun | null }): ApprovalRun =>
  item.approval && item.approval.status ? item.approval : EMPTY_RUN;

/** The step waiting on someone, if the chain is under way. */
export const currentRunStep = (run: ApprovalRun) =>
  run.status === "In approval"
    ? (run.steps.find((s) => s.status === "In review") ?? null)
    : null;

/** Ok to go to the client / signing: no chain set up, or it is approved. */
export const approvalClears = (
  workflow: ApprovalWorkflow | undefined,
  run: ApprovalRun,
) => !workflow?.configured || run.status === "Approved";

/** Why it cannot go yet, in a sentence — null when it can. */
export const approvalBlockReason = (
  workflow: ApprovalWorkflow | undefined,
  run: ApprovalRun,
): string | null => {
  if (approvalClears(workflow, run)) return null;
  if (run.status === "In approval") {
    const step = currentRunStep(run);
    return `Waiting for approval${step ? ` — ${step.name}` : ""}.`;
  }
  if (run.status === "Sent back")
    return "Sent back for changes — resubmit it for approval.";
  return "Submit it for approval first.";
};
