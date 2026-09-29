import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Document, Page, pdfjs } from "react-pdf";
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
  fetchMinutesReviewSnapshot,
  submitMinutesReview,
  resolveGrcFileUrl,
} from "@/lib/grc/governance-api";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function MinutesReviewPage() {
  const { token } = useParams<{ token: string }>();

  const {
    data: snap,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["minutes-review", token],
    queryFn: () => fetchMinutesReviewSnapshot(token!),
    enabled: !!token,
    retry: false,
  });

  const [decision, setDecision] = useState<
    "approved" | "changes-requested" | ""
  >("");
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (snap) setName(snap.prefillName);
  }, [snap]);

  const submitMutation = useMutation({
    mutationFn: () =>
      submitMinutesReview(token!, {
        name: name.trim(),
        decision: decision as any,
        comment: comment.trim(),
      }),
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "Review recorded" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to submit",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  if (isLoading) {
    return (
      <Shell>
        <p className="text-center text-sm text-muted-foreground">Loading…</p>
      </Shell>
    );
  }

  if (isError || !snap) {
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

  if (snap.alreadyApproved && !submitted) {
    return (
      <Shell>
        <Card className="max-w-md mx-auto border-emerald-200">
          <CardContent className="p-8 text-center space-y-3">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="text-lg font-semibold">Already approved</div>
            <p className="text-sm text-muted-foreground">
              You approved these minutes for "{snap.title}"
              {snap.approvedAt &&
                ` on ${new Date(snap.approvedAt).toLocaleDateString()}`}
              .
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
              Thank you, {name}. The organiser has been notified of your{" "}
              {decision === "approved" ? "approval" : "requested changes"}.
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const canSubmit =
    name.trim() &&
    decision &&
    (decision === "approved" ? scrolledToEnd : comment.trim().length > 0) &&
    (decision !== "approved" || scrolledToEnd);

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
            {snap.pdfUrl ? (
              <MinutesPdfViewer
                url={resolveGrcFileUrl(snap.pdfUrl)}
                onScrolledToEnd={() => setScrolledToEnd(true)}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Minutes document not available.
              </p>
            )}
            {!scrolledToEnd && (
              <p className="text-xs text-muted-foreground">
                Scroll to the last page to unlock approval.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="font-semibold">Your review</div>
            <div>
              <Label>Your name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDecision("approved")}
                disabled={!scrolledToEnd}
                className={`text-left border rounded-lg p-4 transition disabled:opacity-40 disabled:cursor-not-allowed ${
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
                  {scrolledToEnd
                    ? "These minutes accurately reflect the meeting."
                    : "Scroll through the document first."}
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
            <Button
              className="w-full"
              disabled={!canSubmit || submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? "Submitting…" : "Submit review"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}

const PDF_LOAD_OPTIONS = { disableRange: true, disableStream: true };

function MinutesPdfViewer({
  url,
  onScrolledToEnd,
}: {
  url: string;
  onScrolledToEnd: () => void;
}) {
  const [numPages, setNumPages] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const firedRef = useRef(false);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el || firedRef.current) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      firedRef.current = true;
      onScrolledToEnd();
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="border rounded-md overflow-y-auto bg-muted/10"
      style={{ maxHeight: 480 }}
    >
      <Document
        file={url}
        options={PDF_LOAD_OPTIONS}
        onLoadSuccess={(pdf) => setNumPages(pdf.numPages)}
        loading={
          <p className="text-center text-sm text-muted-foreground py-8">
            Loading document…
          </p>
        }
        error={
          <p className="text-center text-sm text-red-600 py-8">
            Failed to load PDF.
          </p>
        }
      >
        {Array.from({ length: numPages }, (_, i) => (
          <Page key={i} pageNumber={i + 1} width={640} />
        ))}
      </Document>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 via-background to-muted/30 py-8 px-4">
      {children}
    </div>
  );
}
