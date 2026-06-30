import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ClipboardCheck, Clock, AlertTriangle } from "lucide-react";
import {
  fetchPendingReviewsForMyTeam,
  updateReviewManagerSection,
  completeReviewAsManager,
  type PerformanceReview,
  fetchReviewForReviewer,
} from "@/lib/hr-performance-api";
import { ManagerReviewSheet } from "./ManagerReviewSheet";
import { ReviewedByMeHistoryTable } from "./ReviewedByMeHistoryTable";

export function ManagerTeamReviewsPanel() {
  const queryClient = useQueryClient();
  const [reviewing, setReviewing] = useState<PerformanceReview | null>(null);

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ["pending-reviews-for-my-team"],
    queryFn: fetchPendingReviewsForMyTeam,
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-base">Reviews Awaiting Your Input</h3>
        <p className="text-xs text-muted-foreground">
          {pending.length === 0
            ? "Nothing waiting on you right now."
            : `${pending.length} review(s) ready for your assessment. You score each section alongside the employee's self-assessment, then sign off.`}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : pending.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-40" />
            All caught up.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {pending.map((r) => {
            const isProbation = r.employeeEmploymentStatus === "probation";
            const awaitingEmployee = r.status === "employee_in_progress";
            return (
              <Card
                key={r._id}
                className="cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setReviewing(r)}
              >
                <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{r.employeeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.jobTitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {isProbation && (
                      <Badge
                        variant="outline"
                        className="bg-warning/10 text-warning border-warning/20"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" /> Probation
                      </Badge>
                    )}
                    {awaitingEmployee ? (
                      <Badge
                        variant="outline"
                        className="bg-info/10 text-info border-info/20"
                      >
                        <Clock className="h-3 w-3 mr-1" /> Awaiting self-review
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-warning/10 text-warning border-warning/20"
                      >
                        <Clock className="h-3 w-3 mr-1" /> Your turn to score
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ManagerReviewSheet
        review={reviewing}
        onClose={() => setReviewing(null)}
        onCompleted={() => {
          queryClient.invalidateQueries({
            queryKey: ["pending-reviews-for-my-team"],
          });
          setReviewing(null);
        }}
        fetchFn={fetchReviewForReviewer}
        saveFn={updateReviewManagerSection}
        completeFn={completeReviewAsManager}
      />
    </div>
  );
}
