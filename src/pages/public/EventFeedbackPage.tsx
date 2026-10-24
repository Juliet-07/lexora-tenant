import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, CheckCircle2, AlertTriangle, Star } from "lucide-react";
import {
  fetchEventFeedbackByToken,
  submitEventFeedback,
} from "@/lib/crm/events-api";

// ─────────────────────────────────────────────────────────────
// Public, unauthenticated feedback page — reached from the
// "Give feedback" button in the post-event email. The personal token
// identifies the invitee, so no login and no name/email re-entry:
// pick 1–5 stars, optionally add a comment.
// ─────────────────────────────────────────────────────────────

const LABELS = ["Poor", "Fair", "Good", "Very good", "Excellent"];

export default function EventFeedbackPage() {
  const { token } = useParams<{ token: string }>();
  const {
    data: view,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["public-event-feedback", token],
    queryFn: () => fetchEventFeedbackByToken(token as string),
    enabled: !!token,
    retry: false,
  });

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submitMut = useMutation({
    mutationFn: () =>
      submitEventFeedback(token as string, {
        rating,
        comment: comment.trim() || undefined,
      }),
    onSuccess: () => setDone(true),
    onError: (err: any) =>
      setError(
        err?.response?.data?.message ??
          "Couldn't submit your feedback. Please try again.",
      ),
  });

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="max-w-xl mx-auto space-y-4">{children}</div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (isError || !view) {
    return shell(
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-warning mx-auto" />
          <h2 className="font-semibold">This link isn't valid</h2>
          <p className="text-sm text-muted-foreground">
            This feedback link may have expired or been withdrawn.
          </p>
        </CardContent>
      </Card>,
    );
  }

  const header = (
    <div className="text-center space-y-2">
      <CalendarDays className="h-8 w-8 text-primary mx-auto" />
      <Badge variant="secondary">{view.type}</Badge>
      <h1 className="text-2xl font-bold">{view.title}</h1>
      <p className="text-sm text-muted-foreground">{view.when}</p>
    </div>
  );

  if (done || view.alreadySubmitted) {
    return shell(
      <>
        {header}
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
            <h2 className="text-lg font-semibold">
              {done
                ? "Thank you for your feedback"
                : "Feedback already received"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {done
                ? "It helps us make the next one better."
                : "You've already shared your feedback on this event — thank you."}
            </p>
          </CardContent>
        </Card>
      </>,
    );
  }

  if (!view.open) {
    return shell(
      <>
        {header}
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-warning mx-auto" />
            <h2 className="font-semibold">Feedback isn't open</h2>
            <p className="text-sm text-muted-foreground">
              Feedback opens once the event has started, and isn't available for
              events that were cancelled.
            </p>
          </CardContent>
        </Card>
      </>,
    );
  }

  const shown = hover || rating;
  return shell(
    <>
      {header}
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="text-center space-y-2">
            <h2 className="font-semibold">
              How was it{view.invite?.name ? `, ${view.invite.name}` : ""}?
            </h2>
            <div
              className="flex justify-center gap-1"
              onMouseLeave={() => setHover(0)}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  onMouseEnter={() => setHover(n)}
                  onClick={() => setRating(n)}
                  className="p-1"
                >
                  <Star
                    className={`h-9 w-9 transition-colors ${
                      n <= shown
                        ? "fill-warning text-warning"
                        : "text-muted-foreground/40"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="h-5 text-sm text-muted-foreground">
              {shown ? LABELS[shown - 1] : "Tap a star to rate"}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ef-comment">Anything you'd like to add?</Label>
            <Textarea
              id="ef-comment"
              rows={4}
              value={comment}
              maxLength={2000}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="w-full"
            disabled={!rating || submitMut.isPending}
            onClick={() => {
              setError(null);
              submitMut.mutate();
            }}
          >
            Submit feedback
          </Button>
        </CardContent>
      </Card>
    </>,
  );
}
