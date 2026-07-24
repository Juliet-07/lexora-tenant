import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  MessageSquare,
  CalendarClock,
  UserCircle2,
  ScrollText,
  Sparkles,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  decodeMinutesToken,
  getSharedMinutes,
  saveMinutesReview,
  type MinutesReviewDecision,
} from "@/lib/grcGovernanceLocal";

export default function MinutesReviewPage() {
  const { token } = useParams<{ token: string }>();
  const parsed = useMemo(() => (token ? decodeMinutesToken(token) : null), [token]);
  const snap = useMemo(
    () => (parsed?.m ? getSharedMinutes(parsed.m) : null),
    [parsed],
  );
  const attendee = useMemo(
    () =>
      snap && parsed
        ? snap.attendees.find(
            (a) => a.email.toLowerCase() === parsed.e.toLowerCase(),
          ) ?? null
        : null,
    [snap, parsed],
  );

  const [decision, setDecision] = useState<MinutesReviewDecision | "">("");
  const [comment, setComment] = useState("");
  const [name, setName] = useState(attendee?.name ?? "");
  const [submitted, setSubmitted] = useState(false);

  if (!parsed || !snap) {
    return (
      <Shell>
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center space-y-2">
            <div className="text-lg font-semibold">Review link invalid</div>
            <p className="text-sm text-muted-foreground">
              This minutes review link is no longer valid. Please contact the
              meeting organiser.
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (submitted) {
    return (
      <Shell>
        <Card className="max-w-md mx-auto border-emerald-200">
          <CardContent className="p-8 text-center space-y-3">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="text-lg font-semibold">Review submitted</div>
            <p className="text-sm text-muted-foreground">
              Thank you, {name || attendee?.name}. The organiser has been
              notified of your{" "}
              {decision === "approved" ? "approval" : "requested changes"}.
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const submit = () => {
    if (!name.trim())
      return toast({ title: "Enter your name", variant: "destructive" });
    if (!decision)
      return toast({ title: "Select a decision", variant: "destructive" });
    if (decision === "changes-requested" && !comment.trim())
      return toast({
        title: "Add a comment describing the changes",
        variant: "destructive",
      });
    saveMinutesReview({
      meetingId: snap.meetingId,
      reviewerEmail: parsed.e,
      reviewerName: name.trim(),
      decision,
      comment: comment.trim(),
      submittedAt: new Date().toISOString(),
    });
    setSubmitted(true);
    toast({ title: "Review recorded" });
  };

  return (
    <Shell>
      <div className="max-w-3xl mx-auto space-y-5">
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground p-6 sm:p-8">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-90">
              <Sparkles className="h-3.5 w-3.5" /> Minutes for review
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold leading-tight">
              {snap.title}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge className="bg-white/20 hover:bg-white/25 border-0 text-white gap-1">
                <CalendarClock className="h-3 w-3" />
                {new Date(snap.date).toLocaleString()}
              </Badge>
              <Badge className="bg-white/20 hover:bg-white/25 border-0 text-white">
                {snap.type}
              </Badge>
              <Badge className="bg-white/20 hover:bg-white/25 border-0 text-white gap-1">
                <UserCircle2 className="h-3 w-3" />
                Chair: {snap.chair}
              </Badge>
            </div>
          </div>
        </Card>

        <Card>
          <CardContent className="p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2 font-semibold">
              <ScrollText className="h-4 w-4 text-primary" />
              Meeting minutes
            </div>
            <div
              className="prose prose-sm max-w-none border rounded-md p-4 bg-muted/20"
              dangerouslySetInnerHTML={{ __html: snap.minutesHtml || "<p><em>No minutes provided.</em></p>" }}
            />
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="font-semibold">Your review</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Your name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={parsed.e} disabled />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDecision("approved")}
                className={`text-left border rounded-lg p-4 transition ${
                  decision === "approved"
                    ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200"
                    : "hover:border-emerald-300"
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Approve minutes
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  These minutes accurately reflect the meeting.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setDecision("changes-requested")}
                className={`text-left border rounded-lg p-4 transition ${
                  decision === "changes-requested"
                    ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200"
                    : "hover:border-amber-300"
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  <MessageSquare className="h-4 w-4 text-amber-600" />
                  Request changes
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Add a comment describing what needs to change.
                </p>
              </button>
            </div>

            <div>
              <Label>
                Comment{" "}
                {decision === "approved" && (
                  <span className="text-xs text-muted-foreground">
                    (optional)
                  </span>
                )}
              </Label>
              <Textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  decision === "changes-requested"
                    ? "Describe the requested changes…"
                    : "Any remarks (optional)"
                }
              />
            </div>

            <Button className="w-full" onClick={submit}>
              Submit review
            </Button>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 via-background to-muted/30 py-8 px-4">
      {children}
    </div>
  );
}
