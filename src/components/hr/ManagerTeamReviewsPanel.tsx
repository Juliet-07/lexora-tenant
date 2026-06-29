import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Loader2, ClipboardCheck, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  fetchPendingReviewsForMyTeam,
  updateReviewManagerSection,
  completeReviewAsManager,
  type PerformanceReview,
} from "@/lib/hr-performance-api";

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
            : `${pending.length} review(s) ready for your assessment.`}
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
          {pending.map((r) => (
            <Card
              key={r._id}
              className="cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setReviewing(r)}
            >
              <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{r.employeeName}</p>
                  <p className="text-xs text-muted-foreground">{r.jobTitle}</p>
                </div>
                <Badge
                  variant="outline"
                  className="bg-warning/10 text-warning border-warning/20"
                >
                  <Clock className="h-3 w-3 mr-1" /> Awaiting you
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {reviewing && (
        <ReviewActionSheet
          review={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => {
            queryClient.invalidateQueries({
              queryKey: ["pending-reviews-for-my-team"],
            });
            setReviewing(null);
          }}
        />
      )}
    </div>
  );
}

function ReviewActionSheet({
  review,
  onClose,
  onDone,
}: {
  review: PerformanceReview;
  onClose: () => void;
  onDone: () => void;
}) {
  const [assessment, setAssessment] = useState(
    review.managerAssessmentThisPeriod ?? "",
  );
  const [conclusions, setConclusions] = useState(
    review.managerConclusions ?? "",
  );
  const [recommendationReasoning, setRecommendationReasoning] = useState("");

  const saveMutation = useMutation({
    mutationFn: () =>
      updateReviewManagerSection(review._id, {
        managerAssessmentThisPeriod: assessment,
        managerConclusions: conclusions,
      }),
    onSuccess: () => toast.success("Saved."),
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to save"),
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      completeReviewAsManager(review._id, recommendationReasoning || undefined),
    onSuccess: () => {
      toast.success(`Review for ${review.employeeName} completed.`);
      onDone();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to complete review");
    },
  });

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{review.employeeName}</SheetTitle>
          <SheetDescription>{review.jobTitle}</SheetDescription>
        </SheetHeader>
        <div className="mt-5 space-y-4">
          <div>
            <Label>Your assessment this period</Label>
            <Textarea
              className="mt-1.5"
              rows={4}
              value={assessment}
              onChange={(e) => setAssessment(e.target.value)}
              placeholder="Summarize their performance this period…"
            />
          </div>
          <div>
            <Label>Conclusions</Label>
            <Textarea
              className="mt-1.5"
              rows={3}
              value={conclusions}
              onChange={(e) => setConclusions(e.target.value)}
              placeholder="Overall conclusions and next steps…"
            />
          </div>

          <div className="rounded-md border border-warning/30 bg-warning/5 p-3 space-y-2">
            <p className="text-xs font-medium flex items-center gap-1.5 text-warning">
              <AlertTriangle className="h-3.5 w-3.5" /> If this is a probation
              evaluation
            </p>
            <p className="text-xs text-muted-foreground">
              If this review is this person's Month 3 probation evaluation, a
              recommendation with reasoning is required before you can complete
              it. Otherwise, leave this blank.
            </p>
            <Textarea
              rows={3}
              value={recommendationReasoning}
              onChange={(e) => setRecommendationReasoning(e.target.value)}
              placeholder="Your recommendation and reasoning for HR's final decision…"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save draft"
              )}
            </Button>
            <Button
              disabled={completeMutation.isPending}
              onClick={() => completeMutation.mutate()}
            >
              {completeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Complete & sign off"
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
