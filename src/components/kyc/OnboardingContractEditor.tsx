import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Send,
  FileText,
  Pencil,
  Save,
  X,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchContract,
  editContractBody,
  sendContractForSignature,
  countersignContract,
  type SignableContract,
} from "@/lib/crm/tools-api";

interface OnboardingContractEditorProps {
  contractId: string | null;
  onClose: () => void;
  onChanged?: () => void;
}

const statusMeta: Record<
  string,
  { label: string; className: string; icon: JSX.Element }
> = {
  not_sent: {
    label: "Not Sent",
    className: "bg-muted text-muted-foreground",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  sent: {
    label: "Awaiting Signature",
    className: "bg-warning/10 text-warning border-warning/20",
    icon: <Send className="h-3.5 w-3.5" />,
  },
  signed: {
    label: "Signed by Client",
    className: "bg-info/10 text-info border-info/20",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  countersigned: {
    label: "Fully Executed",
    className: "bg-success/10 text-success border-success/20",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  declined: {
    label: "Declined",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

// Real, lean editor scoped to onboarding — title, body, real status,
// and the three real actions that matter here (edit, send,
// countersign). Deliberately not the general CRM contract editor:
// no clause redlining, approval chains, obligations, or deal
// rounds, none of which apply to a KYC engagement letter.
export default function OnboardingContractEditor({
  contractId,
  onClose,
  onChanged,
}: OnboardingContractEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [draftBody, setDraftBody] = useState("");

  const { data: contract, isLoading } = useQuery({
    queryKey: ["onboarding-contract", contractId],
    queryFn: () => fetchContract(contractId!),
    enabled: !!contractId,
  });

  useEffect(() => {
    setEditing(false);
    if (contract) setDraftBody(contract.renderedBody);
  }, [contract?._id]);

  const invalidate = (updated?: SignableContract) => {
    queryClient.invalidateQueries({ queryKey: ["onboarding-contracts"] });
    if (updated) {
      queryClient.setQueryData(["onboarding-contract", contractId], updated);
    }
    onChanged?.();
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      editContractBody(contractId!, { renderedBody: draftBody }),
    onSuccess: (updated) => {
      invalidate(updated);
      setEditing(false);
      toast({ title: "Changes saved" });
    },
    onError: (err: any) =>
      toast({
        title: "Could not save",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      }),
  });

  const sendMutation = useMutation({
    mutationFn: () => sendContractForSignature(contractId!),
    onSuccess: (updated) => {
      invalidate(updated);
      toast({ title: "Contract sent for signing" });
    },
    onError: (err: any) =>
      toast({
        title: "Could not send",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      }),
  });

  const [signerName, setSignerName] = useState("");
  const countersignMutation = useMutation({
    mutationFn: () => countersignContract(contractId!, { signerName }),
    onSuccess: (updated) => {
      invalidate(updated);
      toast({
        title: "Countersigned — client will be activated automatically",
      });
    },
    onError: (err: any) =>
      toast({
        title: "Could not countersign",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      }),
  });

  const open = !!contractId;
  const meta = contract ? statusMeta[contract.signatureStatus] : null;
  const canEdit =
    contract &&
    (contract.signatureStatus === "not_sent" ||
      contract.signatureStatus === "sent");
  const canSend = contract && contract.signatureStatus === "not_sent";
  const canCountersign = contract && contract.signatureStatus === "signed";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {isLoading || !contract ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between gap-3 pr-6">
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {contract.title}
                </DialogTitle>
                {meta && (
                  <Badge className={`border ${meta.className} shrink-0`}>
                    <span className="flex items-center gap-1">
                      {meta.icon} {meta.label}
                    </span>
                  </Badge>
                )}
              </div>
            </DialogHeader>

            <p className="text-sm text-muted-foreground -mt-2">
              For {contract.counterparty} · {contract.ref}
            </p>

            <div className="rounded-lg border">
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40">
                <span className="text-xs text-muted-foreground">Document</span>
                {canEdit && !editing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                )}
                {editing && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        setDraftBody(contract.renderedBody);
                        setEditing(false);
                      }}
                    >
                      <X className="h-3 w-3 mr-1" /> Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 px-2 text-xs bg-gradient-to-r from-primary to-secondary"
                      onClick={() => saveMutation.mutate()}
                      disabled={saveMutation.isPending}
                    >
                      {saveMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Save className="h-3 w-3 mr-1" /> Save
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
              {editing ? (
                <Textarea
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  className="min-h-[280px] border-0 rounded-none focus-visible:ring-0 font-mono text-xs"
                />
              ) : (
                <div
                  className="p-4 max-h-72 overflow-y-auto text-sm prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: contract.renderedBody }}
                />
              )}
            </div>

            {contract.signatureStatus === "declined" && (
              <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 text-sm text-destructive">
                Declined by the client
                {contract.declineReason ? `: "${contract.declineReason}"` : "."}
              </div>
            )}

            {canSend && (
              <Button
                className="w-full bg-gradient-to-r from-primary to-secondary"
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending || editing}
              >
                {sendMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" /> Send Contract for Signing
                  </>
                )}
              </Button>
            )}

            {canCountersign && (
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-sm">
                  Signed by {contract.signature?.signerName} on{" "}
                  {contract.signature &&
                    new Date(contract.signature.signedAt).toLocaleDateString()}
                  . Countersign to finalise and automatically activate the
                  client.
                </p>
                <input
                  className="w-full h-9 rounded-md border px-3 text-sm"
                  placeholder="Your full name"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                />
                <Button
                  className="w-full bg-gradient-to-r from-primary to-secondary"
                  onClick={() => countersignMutation.mutate()}
                  disabled={!signerName.trim() || countersignMutation.isPending}
                >
                  {countersignMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Countersign & Activate Client"
                  )}
                </Button>
              </div>
            )}

            {contract.signatureStatus === "countersigned" && (
              <div className="rounded-lg bg-success/5 border border-success/20 p-3 text-sm text-success flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Fully executed. The client's login credentials and onboarding
                link were sent automatically.
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
