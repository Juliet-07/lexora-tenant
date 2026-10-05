import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Leaf } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchEsgChairApprovalSnapshot,
  decideEsgChairApproval,
} from "@/lib/grc/esg-api";

export default function EsgChairApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const {
    data: snap,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["esg-chair-approval", token],
    queryFn: () => fetchEsgChairApprovalSnapshot(token!),
    enabled: !!token,
    retry: false,
  });

  const [notes, setNotes] = useState("");
  const [decided, setDecided] = useState<"Approved" | "Declined" | null>(null);

  const mutation = useMutation({
    mutationFn: (decision: "Approved" | "Declined") =>
      decideEsgChairApproval(token!, {
        decision,
        notes: notes.trim() || undefined,
      }),
    onSuccess: (_r, decision) => {
      setDecided(decision);
      toast({ title: "Decision recorded" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to submit",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  if (isLoading)
    return (
      <Shell>
        <p className="text-center text-sm text-muted-foreground">Loading…</p>
      </Shell>
    );

  if (isError || !snap) {
    return (
      <Shell>
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center space-y-2">
            <div className="text-lg font-semibold">Approval link invalid</div>
            <p className="text-sm text-muted-foreground">
              This approval link is no longer valid. Please contact the company
              secretary for a new one.
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const outcome =
    decided ??
    (snap.myDecision !== "Pending"
      ? (snap.myDecision as "Approved" | "Declined")
      : null);

  if (outcome === "Approved" || outcome === "Declined") {
    const isApproved = outcome === "Approved";
    return (
      <Shell>
        <Card
          className={`max-w-md mx-auto ${isApproved ? "border-emerald-200" : "border-rose-200"}`}
        >
          <CardContent className="p-8 text-center space-y-3">
            {isApproved ? (
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
            ) : (
              <XCircle className="h-12 w-12 text-rose-600 mx-auto" />
            )}
            <div className="text-lg font-semibold">
              {isApproved ? "Review recorded" : "Decline recorded"}
            </div>
            <p className="text-sm text-muted-foreground">
              {isApproved
                ? `Thank you. Your review of "${snap.code} — ${snap.title}" has been logged and sent to the Board Chair for final sign-off.`
                : `Your decision on "${snap.code} — ${snap.title}" has been logged and sent back to the team for revision.`}
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-500/70 text-white p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-90">
              <Leaf className="h-4 w-4" /> ESG Committee Chair review
            </div>
            <h1 className="text-2xl font-bold mt-2">
              {snap.code} — {snap.title}
            </h1>
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              {snap.frameworkLabel && (
                <Badge variant="secondary">{snap.frameworkLabel}</Badge>
              )}
            </div>
          </div>
          <CardContent className="p-6 space-y-6">
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                Applicability
              </div>
              <Badge
                variant="outline"
                className={
                  snap.isApplicable
                    ? "text-emerald-600 border-emerald-500/30"
                    : "text-muted-foreground"
                }
              >
                {snap.isApplicable ? "Applicable" : "Not applicable"}
              </Badge>
              {snap.applicabilityNote && (
                <p className="text-sm text-muted-foreground mt-2">
                  {snap.applicabilityNote}
                </p>
              )}
            </div>

            {snap.requirement && (
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                  The requirement
                </div>
                <blockquote className="text-sm border-l-2 border-emerald-500/40 pl-3 italic text-foreground">
                  {snap.requirement}
                </blockquote>
              </div>
            )}

            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                Disclosure response
              </div>
              <p className="text-sm whitespace-pre-wrap border rounded-md p-3 bg-muted/10">
                {snap.response || "No response has been recorded yet."}
              </p>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Evidence
              </div>
              <div className="space-y-1">
                {snap.evidence.map((ev, idx) => (
                  <div
                    key={ev._id ?? idx}
                    className="flex justify-between border rounded px-2 py-1.5 text-sm"
                  >
                    <span>{ev.name}</span>
                    {ev.fileUrl && (
                      <a
                        href={ev.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline text-xs"
                      >
                        View
                      </a>
                    )}
                  </div>
                ))}
                {!snap.evidence.length && (
                  <div className="text-sm text-muted-foreground">
                    No evidence attached.
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Record your review</div>
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any comments for the team, especially if declining…"
              />
              <div className="flex gap-2 mt-3">
                <Button
                  className="flex-1"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate("Approved")}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate("Declined")}
                >
                  <XCircle className="h-4 w-4 mr-1" /> Decline
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-muted/30 py-10 px-4">{children}</div>;
}
