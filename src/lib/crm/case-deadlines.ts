import { useQueries } from "@tanstack/react-query";
import { fetchAdrDeadlineRules } from "@/lib/crm/adr-api";
import { fetchLitigationDeadlineRules } from "@/lib/crm/litigation-api";

export type CaseDeadlineTone = "met" | "due" | "overdue" | "idle";

export interface CaseDeadlineRow {
  key: string;
  caseId: string;
  caseRef: string;
  caseTitle: string;
  trigger: string;
  rule: string;
  status: string;
  tone: CaseDeadlineTone;
}

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : "");

// The tenant's real deadline rules across a set of cases (same query keys
// the case's own Deadline rules tab uses, so the two stay in step). A case
// with no rules contributes nothing — nothing is ever made up.
export function useCaseDeadlines(
  cases: { _id: string; ref?: string; title: string }[],
  caseType: "ADR" | "Litigation",
): CaseDeadlineRow[] {
  const isAdr = caseType === "ADR";
  const results = useQueries({
    queries: cases.map((c) => ({
      queryKey: isAdr
        ? ["adrDeadlineRules", c._id]
        : ["litigationDeadlineRules", c._id],
      queryFn: () =>
        isAdr
          ? fetchAdrDeadlineRules(c._id)
          : fetchLitigationDeadlineRules(c._id),
    })),
  });

  return cases.flatMap((c, i) =>
    ((results[i]?.data as any[]) ?? []).map((r) => {
      const status: string = r.status;
      return {
        key: `${c._id}-${r._id}`,
        caseId: c._id,
        caseRef: c.ref ?? "",
        caseTitle: c.title,
        trigger: r.triggerLabel,
        rule: r.ruleLabel,
        status:
          status === "met"
            ? `Met — ${fmt(r.metAt)}`
            : status === "overdue"
              ? `Overdue — was ${fmt(r.dueDate)}`
              : status === "due"
                ? `Due ${fmt(r.dueDate)}`
                : "Not yet triggered",
        tone: (status === "not_triggered"
          ? "idle"
          : status) as CaseDeadlineTone,
      };
    }),
  );
}
