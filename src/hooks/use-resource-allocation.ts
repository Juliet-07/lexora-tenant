import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTasks } from "@/lib/crm/tasks-api";
import {
  fetchTimeEntries,
  ASSUMED_AVAILABLE_HRS,
  UTILISATION_TARGET_PCT,
} from "@/lib/crm/time-tracking-api";

export interface MemberAllocation {
  member: string;
  billable: number;
  remaining: number;
  allocated: number;
}

// Firm-wide, not scoped to any one mandate — whether someone's
// overloaded depends on everything on their plate. Used by both
// Gantt & Planning's Resource Allocation tab and PMO's Resources
// tab — one real computation, not two copies that could drift.
export function useResourceAllocation() {
  const { data: allTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", "all"],
    queryFn: () => fetchTasks(),
  });
  const { data: allEntries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ["timeEntries", "all"],
    queryFn: () => fetchTimeEntries(),
  });

  const allocation = useMemo<MemberAllocation[]>(() => {
    const members = new Set<string>([
      ...allTasks.map((t) => t.assignee),
      ...allEntries.map((e) => e.member),
    ]);
    return Array.from(members)
      .map((member) => {
        // Already real, already approved — this is actual worked time.
        const billable = allEntries
          .filter(
            (e) => e.member === member && e.status === "Approved" && e.billable,
          )
          .reduce((s, e) => s + e.hours, 0);
        // What's left on their open tasks — estimate minus what's
        // actually been approved against it so far, never negative.
        const remaining = allTasks
          .filter((t) => t.assignee === member && t.status !== "Done")
          .reduce((s, t) => s + Math.max(0, t.estimateHrs - t.loggedHrs), 0);
        return { member, billable, remaining, allocated: billable + remaining };
      })
      .sort((a, b) => b.allocated - a.allocated);
  }, [allTasks, allEntries]);

  return {
    allocation,
    isLoading: tasksLoading || entriesLoading,
    ASSUMED_AVAILABLE_HRS,
    UTILISATION_TARGET_PCT,
  };
}
