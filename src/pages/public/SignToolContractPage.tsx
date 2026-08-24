import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  FileSignature,
  Loader2,
  CheckCircle2,
  XCircle,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchToolContractByToken,
  submitToolContractComment,
  signToolContract,
  declineToolContract,
} from "@/lib/crm/tools-api";

// ─────────────────────────────────────────────────────────────
// Public, unauthenticated page — reached via the signing-link
// email sent from CRM Contract Management. No layout/shell from
// the rest of the app wraps this. Registered at
// /sign-tool-contract/:token, deliberately distinct from HR's own
// /sign-contract/:token, since these are two separate real
// signing systems (employment contracts vs CRM contracts).
// ─────────────────────────────────────────────────────────────

export default function SignToolContractPage() {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();

  const [commentText, setCommentText] = useState("");
  const [signOpen, setSignOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [declineReason, setDeclineReason] = useState("");

  const {
    data: contract,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["tool-contract-by-token", token],
    queryFn: () => fetchToolContractByToken(token!),
    enabled: !!token,
    retry: false,
  });

  const commentMutation = useMutation({
    mutationFn: (message: string) => submitToolContractComment(token!, message),
    onSuccess: (updated) => {
      queryClient.setQueryData(["tool-contract-by-token", token], updated);
      setCommentText("");
      toast.success("Your comment has been sent.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to send comment"),
  });

  const signMutation = useMutation({
    mutationFn: () => signToolContract(token!, { signerName }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["tool-contract-by-token", token], updated);
      setSignOpen(false);
      toast.success("Signed successfully.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to sign"),
  });

  const declineMutation = useMutation({
    mutationFn: () => declineToolContract(token!, declineReason || undefined),
    onSuccess: (updated) => {
      queryClient.setQueryData(["tool-contract-by-token", token], updated);
      setDeclineOpen(false);
      toast.success("Response recorded.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to decline"),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-warning mx-auto" />
            <h2 className="font-semibold">This link isn't valid</h2>
            <p className="text-sm text-muted-foreground">
              {(error as any)?.response?.data?.message ??
                "This signing link may have expired or already been used. Contact the sender for a new link."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isFinalized =
    contract.signatureStatus === "signed" ||
    contract.signatureStatus === "countersigned" ||
    contract.signatureStatus === "declined";

  const discussion = contract.interactions.filter(
    (i) => i.type === "comment" || i.type === "tenant_response",
  );

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-center space-y-1">
          <FileSignature className="h-8 w-8 text-primary mx-auto" />
          <h1 className="text-xl font-bold">{contract.title}</h1>
          <p className="text-sm text-muted-foreground">
            For {contract.counterparty}
          </p>
        </div>

        {(contract.signatureStatus === "signed" ||
          contract.signatureStatus === "countersigned") && (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <p className="text-sm">
                Signed on{" "}
                {new Date(contract.signature!.signedAt).toLocaleString()}.{" "}
                {contract.signatureStatus === "countersigned"
                  ? "Fully executed — no further action needed."
                  : "Waiting on the other party's countersignature."}
              </p>
            </CardContent>
          </Card>
        )}

        {contract.signatureStatus === "declined" && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <XCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm">
                You declined this document. The sender has been notified.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6">
            <div
              className="text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: contract.renderedBody }}
            />
          </CardContent>
        </Card>

        {discussion.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Discussion
              </p>
              {discussion.map((i, idx) => (
                <div key={idx} className="flex gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium">
                      {i.actor === "signer" ? "You" : "Sender"} ·{" "}
                      <span className="text-muted-foreground">
                        {new Date(i.occurredAt).toLocaleDateString()}
                      </span>
                    </p>
                    <p className="text-sm">{i.message}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {!isFinalized && (
          <>
            <Card>
              <CardContent className="p-4 space-y-2">
                <Label className="text-xs">
                  Have a question or want to suggest a change?
                </Label>
                <Textarea
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Leave a comment before signing…"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!commentText.trim() || commentMutation.isPending}
                  onClick={() => commentMutation.mutate(commentText)}
                >
                  {commentMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Send Comment"
                  )}
                </Button>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                className="flex-1 bg-gradient-to-r from-primary to-secondary"
                onClick={() => setSignOpen(true)}
              >
                <FileSignature className="h-4 w-4 mr-2" /> Review &amp; Sign
              </Button>
              <Button variant="outline" onClick={() => setDeclineOpen(true)}>
                Decline
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Sign dialog */}
      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm your signature</DialogTitle>
            <DialogDescription>
              Typing your full name below constitutes your electronic signature
              on this document.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label>Full legal name</Label>
            <Input
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder={contract.counterparty}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!signerName.trim() || signMutation.isPending}
              onClick={() => signMutation.mutate()}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              {signMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Sign Document"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline dialog */}
      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline this document?</DialogTitle>
            <DialogDescription>The sender will be notified.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label>Reason (optional)</Label>
            <Textarea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={declineMutation.isPending}
              onClick={() => declineMutation.mutate()}
            >
              {declineMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Decline"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
