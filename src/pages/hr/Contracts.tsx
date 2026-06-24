import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  FileSignature,
  FileText,
  Send,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Loader2,
  MessageSquare,
  Eye,
  XCircle,
  CheckCircle2,
  Pencil,
  Plus,
  Stamp,
  Mail,
  Eraser,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchAllContracts,
  sendContract,
  respondToContractComment,
  editContractBody,
  fetchHiredCandidatesWithoutContract,
  generateContractFromCandidate,
  fetchContractTemplates,
  countersignContract,
  sendSignedCopy,
  type Contract,
  type ContractStatus,
  type InteractionType,
  type WorkerCategory,
  downloadContractPdf,
} from "@/lib/hr-contracts-api";
import { ContractTemplatesPanel } from "@/components/hr/ContractTemplatesPanel";

const STATUS_TONE: Record<ContractStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-info/10 text-info border-info/20",
  signed: "bg-warning/10 text-warning border-warning/20",
  countersigned: "bg-success/10 text-success border-success/20",
  declined: "bg-destructive/10 text-destructive border-destructive/20",
};

const STATUS_LABEL: Record<ContractStatus, string> = {
  draft: "Draft",
  sent: "Awaiting Signature",
  signed: "Awaiting Your Countersignature",
  countersigned: "Fully Executed",
  declined: "Declined",
};

const INTERACTION_ICON: Record<InteractionType, any> = {
  sent: Send,
  viewed: Eye,
  comment: MessageSquare,
  tenant_response: MessageSquare,
  updated: Pencil,
  resent: Send,
  signed: CheckCircle2,
  countersigned: ShieldCheck,
  signed_copy_sent: Mail,
  declined: XCircle,
};

const INTERACTION_LABEL: Record<InteractionType, string> = {
  sent: "Sent for signature",
  viewed: "Viewed by signer",
  comment: "Comment from signer",
  tenant_response: "Reply from your team",
  updated: "Document updated",
  resent: "Re-sent for signature",
  signed: "Signed by signer",
  countersigned: "Countersigned by you",
  signed_copy_sent: "Signed copy emailed",
  declined: "Declined",
};

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function HRContracts() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Contract | null>(null);
  const [responseText, setResponseText] = useState("");
  const [editingBody, setEditingBody] = useState(false);
  const [editedBody, setEditedBody] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [countersignOpen, setCountersignOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => fetchAllContracts(),
  });

  const { data: pendingCandidates = [] } = useQuery({
    queryKey: ["hired-without-contract"],
    queryFn: fetchHiredCandidatesWithoutContract,
  });

  const sendMutation = useMutation({
    mutationFn: (contractId: string) => sendContract(contractId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      setSelected(updated);
      toast.success(`Sent to ${updated.signerEmail} for signature.`);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to send contract"),
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      respondToContractComment(id, message),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      setSelected(updated);
      setResponseText("");
      toast.success("Response sent.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to send response"),
  });

  const editMutation = useMutation({
    mutationFn: ({
      id,
      renderedBody,
      changeNote,
    }: {
      id: string;
      renderedBody: string;
      changeNote?: string;
    }) => editContractBody(id, { renderedBody, changeNote }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      setSelected(updated);
      setEditingBody(false);
      setChangeNote("");
      toast.success(
        "Contract updated. The signer's existing link will show the new terms.",
      );
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to update contract"),
  });

  const sendSignedCopyMutation = useMutation({
    mutationFn: (contractId: string) => sendSignedCopy(contractId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      setSelected(updated);
      toast.success(`Fully executed copy emailed to ${updated.signerEmail}.`);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to send signed copy"),
  });

  const handleDownloadPdf = async (contractId: string) => {
    setDownloadingPdf(true);
    try {
      await downloadContractPdf(contractId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to download PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const counts = {
    total: items.length,
    countersigned: items.filter((c) => c.status === "countersigned").length,
    sent: items.filter((c) => c.status === "sent").length,
    awaitingCountersign: items.filter((c) => c.status === "signed").length,
    declined: items.filter((c) => c.status === "declined").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Contracts</h1>
          <p className="text-sm text-muted-foreground">
            Employment agreements, consultant contracts, and e-signature.
          </p>
        </div>
        <Button variant="outline" onClick={() => setGenerateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Generate Contract
          {pendingCandidates.length > 0 && (
            <Badge
              variant="outline"
              className="ml-2 bg-warning/10 text-warning border-warning/20"
            >
              {pendingCandidates.length} pending
            </Badge>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat
          label="Total Contracts"
          value={counts.total}
          icon={FileSignature}
          tone="from-primary to-secondary"
        />
        <Stat
          label="Awaiting Signature"
          value={counts.sent}
          icon={Clock}
          tone="from-amber-500 to-orange-500"
        />
        <Stat
          label="Awaiting Countersignature"
          value={counts.awaitingCountersign}
          icon={Pencil}
          tone="from-violet-500 to-purple-600"
        />
        <Stat
          label="Fully Executed"
          value={counts.countersigned}
          icon={ShieldCheck}
          tone="from-emerald-500 to-teal-500"
        />
        <Stat
          label="Declined"
          value={counts.declined}
          icon={AlertTriangle}
          tone="from-rose-500 to-red-500"
        />
      </div>

      <Tabs defaultValue="all" className="space-y-3">
        <TabsList>
          <TabsTrigger value="all">All Contracts</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-2">
          {isLoading ? (
            <LoadingRow label="Loading contracts…" />
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                No contracts yet. Click "Generate Contract" to create one for a
                hired candidate.
              </CardContent>
            </Card>
          ) : (
            items.map((c) => (
              <Card
                key={c._id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelected(c)}
              >
                <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {c.templateName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.signerName} · {c.signerEmail}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {c.workerCategory}
                    </Badge>
                    <Badge variant="outline" className={STATUS_TONE[c.status]}>
                      {STATUS_LABEL[c.status]}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="templates">
          <ContractTemplatesPanel />
        </TabsContent>
      </Tabs>

      {/* ── Contract detail sheet ── */}
      <Sheet
        open={!!selected}
        onOpenChange={(o) => {
          if (!o) {
            setSelected(null);
            setResponseText("");
            setEditingBody(false);
            setEditedBody("");
            setChangeNote("");
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <FileSignature className="h-5 w-5" /> {selected.templateName}
                </SheetTitle>
                <SheetDescription>
                  {selected.signerName} · {selected.signerEmail} ·{" "}
                  <span className="capitalize">{selected.workerCategory}</span>
                </SheetDescription>
              </SheetHeader>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={STATUS_TONE[selected.status]}
                  >
                    {STATUS_LABEL[selected.status]}
                  </Badge>
                  <div className="flex gap-2">
                    {selected.status === "draft" && (
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-primary to-secondary"
                        disabled={sendMutation.isPending}
                        onClick={() => sendMutation.mutate(selected._id)}
                      >
                        {sendMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Send for Signature
                      </Button>
                    )}
                    {selected.status === "sent" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={sendMutation.isPending}
                        onClick={() => sendMutation.mutate(selected._id)}
                      >
                        {sendMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Re-send
                      </Button>
                    )}
                    {selected.status === "signed" && (
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-primary to-secondary"
                        onClick={() => setCountersignOpen(true)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1.5" /> Countersign
                      </Button>
                    )}
                    {selected.status === "countersigned" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={downloadingPdf}
                          onClick={() => handleDownloadPdf(selected._id)}
                        >
                          {downloadingPdf ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Download PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={sendSignedCopyMutation.isPending}
                          onClick={() =>
                            sendSignedCopyMutation.mutate(selected._id)
                          }
                        >
                          {sendSignedCopyMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Mail className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          {selected.signedCopySentAt
                            ? "Re-send Signed Copy"
                            : "Send Signed Copy"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {selected.status === "declined" && selected.declineReason && (
                  <div className="border border-destructive/20 bg-destructive/5 rounded-md p-3 text-sm">
                    <p className="font-medium text-destructive">Declined</p>
                    <p className="text-muted-foreground mt-1">
                      {selected.declineReason}
                    </p>
                  </div>
                )}

                {/* ── Signature blocks ── */}
                {(selected.signature || selected.tenantSignature) && (
                  <div className="grid grid-cols-2 gap-3">
                    {selected.signature && (
                      <Card>
                        <CardContent className="p-4 space-y-1 text-sm">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Signed by
                          </p>
                          <p className="font-medium">
                            {selected.signature.signerName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {fmtDateTime(selected.signature.signedAt)}
                            {selected.signature.ipAddress &&
                              ` · IP ${selected.signature.ipAddress}`}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                    {selected.tenantSignature && (
                      <Card>
                        <CardContent className="p-4 space-y-1 text-sm">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Countersigned by
                          </p>
                          {selected.tenantSignature.signatureImageData ? (
                            <img
                              src={selected.tenantSignature.signatureImageData}
                              alt="Signature"
                              className="h-10 object-contain"
                            />
                          ) : (
                            <p className="font-medium italic">
                              {selected.tenantSignature.signerName}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {fmtDateTime(selected.tenantSignature.signedAt)}
                          </p>
                          {selected.tenantSignature.stampImageData && (
                            <img
                              src={selected.tenantSignature.stampImageData}
                              alt="Stamp"
                              className="h-12 object-contain mt-1"
                            />
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {selected.signedCopySentAt && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Signed copy last emailed{" "}
                    {fmtDateTime(selected.signedCopySentAt)}
                  </p>
                )}

                {/* ── Document ── */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Document
                      </p>
                      {selected.status === "sent" && !editingBody && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditedBody(selected.renderedBody);
                            setEditingBody(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                        </Button>
                      )}
                    </div>

                    {editingBody ? (
                      <div className="space-y-2">
                        <Textarea
                          rows={12}
                          className="font-mono text-xs"
                          value={editedBody}
                          onChange={(e) => setEditedBody(e.target.value)}
                        />
                        <div className="space-y-1">
                          <Label className="text-xs">
                            What changed? (optional, visible in activity log)
                          </Label>
                          <Input
                            value={changeNote}
                            onChange={(e) => setChangeNote(e.target.value)}
                            placeholder="e.g. Adjusted notice period to 60 days per their request"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingBody(false);
                              setChangeNote("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            disabled={
                              !editedBody.trim() || editMutation.isPending
                            }
                            onClick={() =>
                              editMutation.mutate({
                                id: selected._id,
                                renderedBody: editedBody,
                                changeNote: changeNote || undefined,
                              })
                            }
                          >
                            {editMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Save Changes"
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          The signer's existing link keeps working — they'll see
                          these updated terms next time they open it. No new
                          email is sent automatically.
                        </p>
                      </div>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap bg-muted/30 rounded p-3 max-h-64 overflow-y-auto font-mono text-xs">
                        {selected.renderedBody}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* ── Interaction timeline ── */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                    Activity
                  </p>
                  <div className="space-y-2">
                    {selected.interactions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No activity yet.
                      </p>
                    ) : (
                      selected.interactions
                        .slice()
                        .reverse()
                        .map((interaction, i) => {
                          const Icon = INTERACTION_ICON[interaction.type];
                          return (
                            <div
                              key={i}
                              className="flex gap-3 border rounded-md p-3"
                            >
                              <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium">
                                    {INTERACTION_LABEL[interaction.type]}
                                  </p>
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    {fmtDateTime(interaction.occurredAt)}
                                  </span>
                                </div>
                                {interaction.message && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {interaction.message}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>

                {/* ── Respond to a comment ── */}
                {selected.status !== "countersigned" &&
                  selected.status !== "declined" && (
                    <div className="space-y-2">
                      <Label className="text-xs">Reply to the signer</Label>
                      <Textarea
                        rows={3}
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Respond to their comment or question…"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          !responseText.trim() || respondMutation.isPending
                        }
                        onClick={() =>
                          respondMutation.mutate({
                            id: selected._id,
                            message: responseText,
                          })
                        }
                      >
                        {respondMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          "Send Reply"
                        )}
                      </Button>
                    </div>
                  )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ManualGenerateContractDialog
        open={generateOpen}
        candidates={pendingCandidates}
        onClose={() => setGenerateOpen(false)}
      />

      {selected && (
        <CountersignDialog
          open={countersignOpen}
          contract={selected}
          onClose={() => setCountersignOpen(false)}
          onCountersigned={(updated) => setSelected(updated)}
        />
      )}
    </div>
  );
}

// ─── Generate Contract — standalone entry point, reachable any time ──

function ManualGenerateContractDialog({
  open,
  candidates,
  onClose,
}: {
  open: boolean;
  candidates: {
    _id: string;
    name: string;
    roleAppliedFor: string;
    workerCategory: WorkerCategory;
  }[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [candidateId, setCandidateId] = useState("");
  const [templateId, setTemplateId] = useState("");

  const selectedCandidate = candidates.find((c) => c._id === candidateId);

  const { data: templates = [] } = useQuery({
    queryKey: ["contract-templates", selectedCandidate?.workerCategory],
    queryFn: () => fetchContractTemplates(selectedCandidate!.workerCategory),
    enabled: !!selectedCandidate,
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      generateContractFromCandidate({ candidateId, templateId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["hired-without-contract"] });
      handleClose();
      toast.success("Contract draft created.");
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ?? "Failed to generate contract",
      ),
  });

  const handleClose = () => {
    setCandidateId("");
    setTemplateId("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Contract</DialogTitle>
          <DialogDescription>
            For a hired candidate without a contract yet.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Candidate</Label>
            <Select
              value={candidateId}
              onValueChange={(v) => {
                setCandidateId(v);
                setTemplateId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a hired candidate" />
              </SelectTrigger>
              <SelectContent>
                {candidates.length === 0 ? (
                  <div className="p-2 text-xs text-muted-foreground">
                    All hired candidates already have contracts.
                  </div>
                ) : (
                  candidates.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name} — {c.roleAppliedFor} ({c.workerCategory})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          {selectedCandidate && (
            <div className="space-y-1">
              <Label>Template</Label>
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No {selectedCandidate.workerCategory} templates exist yet.
                  Create one in the Templates tab first.
                </p>
              ) : (
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t._id} value={t._id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            disabled={!candidateId || !templateId || generateMutation.isPending}
            onClick={() => generateMutation.mutate()}
            className="bg-gradient-to-r from-primary to-secondary"
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Generate Contract"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Countersign dialog — typed name + drawn signature + optional stamp ──

function CountersignDialog({
  open,
  contract,
  onClose,
  onCountersigned,
}: {
  open: boolean;
  contract: Contract;
  onClose: () => void;
  onCountersigned: (updated: Contract) => void;
}) {
  const queryClient = useQueryClient();
  const [signerName, setSignerName] = useState("");
  const [signatureImageData, setSignatureImageData] = useState<string | null>(
    null,
  );
  const [stampImageData, setStampImageData] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const countersignMutation = useMutation({
    mutationFn: () =>
      countersignContract(contract._id, {
        signerName,
        signatureImageData: signatureImageData ?? undefined,
        stampImageData: stampImageData ?? undefined,
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      onCountersigned(updated);
      handleClose();
      toast.success("Countersigned. The contract is now fully executed.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to countersign"),
  });

  const handleClose = () => {
    setSignerName("");
    setSignatureImageData(null);
    setStampImageData(null);
    onClose();
  };

  const handleStampUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setStampImageData(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Countersign Contract</DialogTitle>
          <DialogDescription>
            {contract.signerName} has already signed. Add your signature to
            fully execute this agreement.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Your full name</Label>
            <Input
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Type your name"
            />
          </div>

          <div className="space-y-1">
            <Label>Signature</Label>
            <SignaturePad
              canvasRef={canvasRef}
              onChange={setSignatureImageData}
            />
            <p className="text-xs text-muted-foreground">
              Draw your signature above, or leave blank to use your typed name
              as the signature.
            </p>
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-1.5">
              <Stamp className="h-3.5 w-3.5" /> Company stamp (optional)
            </Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => handleStampUpload(e.target.files?.[0])}
            />
            {stampImageData && (
              <img
                src={stampImageData}
                alt="Stamp preview"
                className="h-16 object-contain mt-2 border rounded"
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            disabled={!signerName.trim() || countersignMutation.isPending}
            onClick={() => countersignMutation.mutate()}
            className="bg-gradient-to-r from-primary to-secondary"
          >
            {countersignMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Countersign"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Self-contained signature drawing canvas ──

function SignaturePad({
  canvasRef,
  onChange,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onChange: (dataUrl: string | null) => void;
}) {
  const drawing = useRef(false);

  const getPos = (
    e: React.MouseEvent | React.TouchEvent,
    canvas: HTMLCanvasElement,
  ) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawing.current = true;
    const ctx = canvas.getContext("2d");
    const { x, y } = getPos(e, canvas);
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { x, y } = getPos(e, canvas);
    if (ctx) {
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#1a1a2e";
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onChange(null);
    }
  };

  return (
    <div className="space-y-1">
      <div className="border rounded-md bg-white">
        <canvas
          ref={canvasRef}
          width={460}
          height={140}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
      </div>
      <Button type="button" size="sm" variant="ghost" onClick={clear}>
        <Eraser className="h-3.5 w-3.5 mr-1.5" /> Clear
      </Button>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: any;
  icon: any;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div
          className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
