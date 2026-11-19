import type { ApprovalInfo } from "@/lib/crm/finance-api";

interface Approvable {
  submittedById?: string | null;
  approval?: ApprovalInfo | null;
}
interface Viewer {
  id: string;
  userType: string;
}

/**
 * Whether this person should be shown Approve / Reject on a bill or quote
 * an employee submitted. The server enforces the same rules; this only
 * keeps buttons off the screen for people who would be refused.
 * The account owner always has the final say.
 */
export function canDecide(item: Approvable, viewer?: Viewer | null): boolean {
  if (!viewer) return false;
  if (viewer.userType === "tenant") return true;
  if (item.submittedById && item.submittedById === viewer.id) return false;
  if (!item.approval) return true;
  if (!item.approval.approverIds.includes(viewer.id)) return false;
  return !item.approval.approvals.some((a) => a.userId === viewer.id);
}

/** "Waiting on Aline and Jean" / "1 of 2 approvals" for a pending item. */
export function approvalProgress(item: Approvable): string {
  const a = item.approval;
  if (!a) return "";
  const needed = a.mode === "dual" ? 2 : 1;
  if (a.approvals.length > 0 && a.mode === "dual")
    return `${a.approvals.length} of ${needed} approvals`;
  const names = a.approverNames.slice(0, 3).join(", ");
  return names ? `Waiting on ${names}` : "Waiting for the account owner";
}
