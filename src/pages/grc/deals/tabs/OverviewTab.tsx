import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { type Deal } from "@/lib/grc/deals-api";
import PartiesSection from "./PartiesSection";

export default function OverviewTab({ deal }: { deal: Deal }) {
  const dd = deal.dd ?? [];
  const signingChecklist = deal.signing?.checklist ?? [];
  const flags = dd.filter((x) => x.status === "Red Flag");
  const signDone = signingChecklist.filter((c) => c.status === "Done").length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Due Diligence</span>
              <span>{deal.ddProgress}%</span>
            </div>
            <Progress value={deal.ddProgress} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Conditions Precedent</span>
              <span>
                {deal.cpsProgress.done}/{deal.cpsProgress.total}
              </span>
            </div>
            <Progress
              value={
                deal.cpsProgress.total
                  ? (deal.cpsProgress.done / deal.cpsProgress.total) * 100
                  : 0
              }
              className="h-2"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Pre-signing checklist</span>
              <span>
                {signDone}/{signingChecklist.length}
              </span>
            </div>
            <Progress
              value={
                signingChecklist.length
                  ? (signDone / signingChecklist.length) * 100
                  : 0
              }
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deal team</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div>
            <b>Lead partner:</b> {deal.leadPartner}
          </div>
          {(deal.team ?? []).length > 0 && (
            <div>
              <b>Team:</b> {(deal.team ?? []).join(", ")}
            </div>
          )}
          <div className="pt-2">
            <b>Conflict check:</b>{" "}
            {deal.conflictCheck.cleared ? (
              <Badge
                variant="outline"
                className="text-emerald-700 border-emerald-500/30"
              >
                Cleared
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-rose-700 border-rose-500/30"
              >
                Flagged
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {deal.conflictCheck.note}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-base">Deal parties</CardTitle>
        </CardHeader>
        <CardContent>
          <PartiesSection deal={deal} />
        </CardContent>
      </Card>
      {flags.length > 0 && (
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base text-rose-700">
              Red-flag findings ({flags.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {flags.map((f, i) => (
              <div
                key={i}
                className="rounded border border-rose-500/30 bg-rose-500/5 p-2 text-sm"
              >
                <div className="font-medium">
                  {f.workstream}: {f.item}
                </div>
                <div className="text-xs text-muted-foreground">
                  {f.finding} · Materiality: {f.materiality ?? "—"}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
