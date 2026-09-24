import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  ShieldCheck,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchBoardApprovalSnapshot,
  submitBoardApprovalDecision,
  resolvePolicyFileUrl,
} from "@/lib/grc/policy-api";

export default function PolicyApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const {
    data: snap,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["policy-board-approval", token],
    queryFn: () => fetchBoardApprovalSnapshot(token!),
    enabled: !!token,
    retry: false,
  });

  const [notes, setNotes] = useState("");
  const [decided, setDecided] = useState<"Approved" | "Rejected" | null>(null);

  const mutation = useMutation({
    mutationFn: (decision: "Approved" | "Rejected") =>
      submitBoardApprovalDecision(token!, {
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

  const outcome = decided ?? (snap.alreadyDecided ? snap.decision : null);

  if (outcome === "Approved" || outcome === "Rejected") {
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
              {isApproved ? "Approval recorded" : "Decline recorded"}
            </div>
            <p className="text-sm text-muted-foreground">
              {isApproved
                ? `Thank you. Your approval of "${snap.title}" has been logged. Once every assigned board member approves, it publishes automatically.`
                : `Your decision on "${snap.title}" has been logged and sent back to the tenant for revision.`}
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const isPdf = snap.mimeType === "application/pdf";

  return (
    <Shell>
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-90">
              <ShieldCheck className="h-4 w-4" /> Board policy approval
            </div>
            <h1 className="text-2xl font-bold mt-2">{snap.title}</h1>
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              {snap.category && (
                <Badge variant="secondary">{snap.category}</Badge>
              )}
              <Badge variant="secondary">Version {snap.version}</Badge>
            </div>
          </div>
          <CardContent className="p-6 space-y-6">
            <div>
              <div className="text-sm font-medium mb-2">
                1. Review the document
              </div>
              {snap.description && (
                <p className="text-sm text-muted-foreground mb-3">
                  {snap.description}
                </p>
              )}
              {snap.fileUrl ? (
                <div className="flex items-center justify-between gap-3 border rounded-md px-3 py-2">
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="truncate">{snap.fileName}</span>
                  </div>
                  <a
                    href={resolvePolicyFileUrl(snap.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-1" /> Download
                    </Button>
                  </a>
                </div>
              ) : snap.sections?.length ? (
                <div
                  className="border rounded-md overflow-y-auto bg-muted/10 p-4 space-y-4"
                  style={{ maxHeight: 360 }}
                >
                  {snap.sections.map((s, i) => (
                    <div key={i}>
                      <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
                      <div
                        className="prose prose-sm max-w-none text-foreground"
                        dangerouslySetInnerHTML={{ __html: s.content || "" }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This policy has no content yet.
                </p>
              )}
            </div>

            <div>
              <div className="text-sm font-medium mb-2">
                2. Record your decision
              </div>
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any comments for the tenant, especially if declining…"
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
                  onClick={() => mutation.mutate("Rejected")}
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
