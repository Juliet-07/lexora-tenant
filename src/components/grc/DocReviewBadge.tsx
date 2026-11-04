import { Badge } from "@/components/ui/badge";
import type { DealDocReview } from "@/lib/grc/deals-api";

// Where a contract or term sheet stands with the parties it was sent to.
export function DocReviewBadge({ review }: { review?: DealDocReview }) {
  if (!review || review.status === "draft")
    return <Badge variant="outline">Draft</Badge>;
  if (review.status === "approved")
    return (
      <Badge className="border-success/40 bg-success/10 text-success hover:bg-success/10">
        Approved by all {review.sent}
      </Badge>
    );
  if (review.status === "changes_requested")
    return (
      <Badge className="border-warning/40 bg-warning/10 text-warning hover:bg-warning/10">
        Changes requested
      </Badge>
    );
  return (
    <Badge variant="secondary">
      In review · {review.approved} of {review.sent} approved
    </Badge>
  );
}
