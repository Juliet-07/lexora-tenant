import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TriangleAlert } from "lucide-react";
import {
  ASSUMED_AVAILABLE_HRS,
  UTILISATION_TARGET_PCT,
  type TimeEntry,
} from "@/lib/crm/time-tracking-api";

export function UtilisationTab({ entries }: { entries: TimeEntry[] }) {
  const byMember = useMemo(() => {
    const map = new Map<string, number>();
    entries
      .filter((e) => e.status === "Approved" && e.billable)
      .forEach((e) => map.set(e.member, (map.get(e.member) ?? 0) + e.hours));
    return Array.from(map, ([member, billable]) => ({ member, billable })).sort(
      (a, b) => b.billable - a.billable,
    );
  }, [entries]);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded border border-dashed p-3 text-xs text-muted-foreground">
        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Billable hours below are real (Approved entries only). "Available" is
          a stated assumption of {ASSUMED_AVAILABLE_HRS}h against an{" "}
          {UTILISATION_TARGET_PCT}% target — there's no real capacity or
          contracted-hours tracking yet to compute this from.
        </span>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Utilisation by member</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {byMember.map((m) => {
            const pct = Math.round((m.billable / ASSUMED_AVAILABLE_HRS) * 100);
            const below = pct < UTILISATION_TARGET_PCT;
            return (
              <div key={m.member} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{m.member}</span>
                  <span
                    className={below ? "text-warning" : "text-muted-foreground"}
                  >
                    {m.billable}h / {ASSUMED_AVAILABLE_HRS}h ({pct}%)
                  </span>
                </div>
                <Progress value={Math.min(pct, 100)} className="h-2" />
              </div>
            );
          })}
          {!byMember.length && (
            <p className="text-sm text-muted-foreground">
              No approved billable time yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
