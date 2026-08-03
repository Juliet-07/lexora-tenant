import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  fetchReviewSnapshot,
  submitReview,
  type OfferReviewSnapshot,
} from "@/lib/grc/deals-api";

export default function DealOfferReviewPage() {
  const { token } = useParams<{ token: string }>();
  const {
    data: snap,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["offer-review", token],
    queryFn: () =>
      fetchReviewSnapshot("offer", token!) as Promise<OfferReviewSnapshot>,
    enabled: !!token,
    retry: false,
  });

  const [name, setName] = useState("");
  const [decision, setDecision] = useState<
    "Approved" | "Changes Requested" | ""
  >("");
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (snap) setName(snap.prefillName);
  }, [snap]);

  const mutation = useMutation({
    mutationFn: () =>
      submitReview("offer", token!, {
        name: name.trim(),
        decision: decision as any,
        comment: comment.trim(),
      }),
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Response recorded");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to submit"),
  });

  if (isLoading)
    return (
      <Shell>
        <p className="text-center text-sm text-muted-foreground">Loading…</p>
      </Shell>
    );
  if (isError || !snap)
    return (
      <Shell>
        <InvalidCard />
      </Shell>
    );
  if (
    snap.alreadyResponded &&
    snap.previousDecision === "Approved" &&
    !submitted
  ) {
    return (
      <Shell>
        <DoneCard
          title="Already approved"
          body={`You have already approved the term sheet for "${snap.dealName}".`}
        />
      </Shell>
    );
  }
  if (submitted) {
    return (
      <Shell>
        <DoneCard
          title="Response recorded"
          body={`Thank you, ${name}. Your response for "${snap.dealName}" has been logged.`}
        />
      </Shell>
    );
  }

  const canSubmit =
    name.trim() &&
    decision &&
    (decision !== "Changes Requested" || comment.trim());
  const ts = snap.termSheet;
  const fields: [string, string][] = [
    ["Parties", ts.parties ?? ""],
    ["Structure", ts.structure],
    ["Consideration", ts.consideration],
    ["Conditions", ts.conditions],
    ["Exclusivity", ts.exclusivity],
    ["Confidentiality", ts.confidentiality],
    ["Timeline", ts.timeline],
  ];

  return (
    <Shell>
      <div className="max-w-3xl mx-auto space-y-5">
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-90">
              <ShieldCheck className="h-4 w-4" />
              Term sheet / offer review
            </div>
            <h1 className="text-2xl font-bold mt-2">{snap.dealName}</h1>
          </div>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-3">
            {fields.map(([label, value]) => (
              <div key={label}>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {label}
                </div>
                <div className="text-sm whitespace-pre-wrap mt-0.5">
                  {value || "—"}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDecision("Approved")}
                className={`text-left border rounded-lg p-4 transition ${decision === "Approved" ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200" : "hover:border-emerald-300"}`}
              >
                <div className="font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Approve
                </div>
              </button>
              <button
                onClick={() => setDecision("Changes Requested")}
                className={`text-left border rounded-lg p-4 transition ${decision === "Changes Requested" ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200" : "hover:border-amber-300"}`}
              >
                <div className="font-medium">Request changes</div>
              </button>
            </div>
            <div>
              <Label>Full name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>
                Comment{" "}
                {decision === "Approved" && (
                  <span className="text-xs text-muted-foreground">
                    (optional)
                  </span>
                )}
              </Label>
              <Textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  decision === "Changes Requested"
                    ? "Describe the requested changes…"
                    : ""
                }
              />
            </div>
            <Button
              className="w-full"
              disabled={!canSubmit || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Submitting…" : "Submit response"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}

function InvalidCard() {
  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="p-6 text-center space-y-2">
        <div className="text-lg font-semibold">Review link invalid</div>
        <p className="text-sm text-muted-foreground">
          This link is no longer valid. Please contact the deal team for a new
          one.
        </p>
      </CardContent>
    </Card>
  );
}
function DoneCard({ title, body }: { title: string; body: string }) {
  return (
    <Card className="max-w-md mx-auto border-emerald-200">
      <CardContent className="p-8 text-center space-y-3">
        <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
        <div className="text-lg font-semibold">{title}</div>
        <p className="text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}
function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-muted/30 py-10 px-4">{children}</div>;
}
