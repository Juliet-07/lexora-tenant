import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Crown, ClipboardCheck, Clock } from "lucide-react";
import { ManagerReviewSheet } from "@/components/hr/ManagerReviewSheet";
import {
  fetchPendingHodReviews,
  type PerformanceReview,
} from "@/lib/hr-performance-api";

const STATUS_TONE: Record<string, string> = {
  employee_in_progress: "bg-muted text-muted-foreground",
  manager_in_progress: "bg-orange-500/10 text-orange-600 border-orange-500/20",
};

const STATUS_LABEL: Record<string, string> = {
  employee_in_progress: "HoD self-assessing",
  manager_in_progress: "Awaiting your review",
};

export function TenantHoDReviewsPanel() {
  const queryClient = useQueryClient();
  const [reviewing, setReviewing] = useState<PerformanceReview | null>(null);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["pending-hod-reviews"],
    queryFn: fetchPendingHodReviews,
  });

  const awaitingYou = reviews.filter((r) => r.status === "manager_in_progress");
  const stillSelfAssessing = reviews.filter(
    (r) => r.status === "employee_in_progress",
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-base">Heads of Department Reviews</h3>
        <p className="text-xs text-muted-foreground">
          {awaitingYou.length === 0
            ? "Nothing awaiting your review right now."
            : `${awaitingYou.length} review(s) ready for your sign-off.`}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-40" />
            No HoD reviews in progress.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {[...awaitingYou, ...stillSelfAssessing].map((r) => (
            <Card
              key={r._id}
              className={
                r.status === "manager_in_progress"
                  ? "cursor-pointer hover:bg-muted/30 transition-colors"
                  : "opacity-70"
              }
              onClick={() =>
                r.status === "manager_in_progress" && setReviewing(r)
              }
            >
              <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0">
                    <Crown className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{r.employeeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.jobTitle}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={STATUS_TONE[r.status]}>
                  {r.status === "manager_in_progress" && (
                    <Clock className="h-3 w-3 mr-1" />
                  )}
                  {STATUS_LABEL[r.status]}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ManagerReviewSheet
        review={reviewing}
        onClose={() => setReviewing(null)}
        onCompleted={() => {
          queryClient.invalidateQueries({ queryKey: ["pending-hod-reviews"] });
          setReviewing(null);
        }}
      />
    </div>
  );
}
