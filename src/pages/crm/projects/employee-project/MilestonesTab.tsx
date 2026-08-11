import { Card, CardContent } from "@/components/ui/card";
import type { Mandate, MilestoneStatus } from "@/lib/crm/mandates-api";

const dotClass: Record<MilestoneStatus, string> = {
  completed: "bg-success",
  in_progress: "bg-warning",
  pending: "bg-muted-foreground/30",
};

export function MilestonesTab({ mandate }: { mandate: Mandate }) {
  const milestones = mandate.milestones ?? [];

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        {milestones.map((m) => (
          <div key={m._id} className="flex items-center gap-4">
            <div
              className={`w-3 h-3 rounded-full shrink-0 ${dotClass[m.status]}`}
            />
            <div className="flex-1 flex items-center justify-between">
              <span
                className={`text-sm ${m.status === "completed" ? "font-medium" : "text-muted-foreground"}`}
              >
                {m.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {m.date?.slice(0, 10)}
              </span>
            </div>
          </div>
        ))}
        {!milestones.length && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No milestones set for this mandate yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
