import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  FileSignature,
  FileText,
  Paperclip,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  UserCheck,
  X,
} from "lucide-react";
import {
  fetchVendor,
  fetchEligibleApprovers,
  uploadDdEvidence,
  removeDdEvidence,
  addVendorNote,
  setVendorStatus,
  advanceVendorContract,
  deleteVendorContract,
  requestVendorApproval,
  decideVendorApproval,
  vendorSpendYtd,
  SPEND_MONTHS,
  type VendorContract,
  type VendorStatus,
} from "@/lib/crm/vendor-api";
import { VendorContractDialog } from "./VendorContractDialog";
import { RISK_TONE, STATUS_TONE, CONTRACT_TONE } from "@/pages/crm/crm/Vendors";

const money = (n: number, c = "USD") =>
  `${c === "USD" ? "$" : `${c} `}${n.toLocaleString()}`;

function DetailBlock({
  title,
  rows,
}: {
  title: string;
  rows: [string, string][];
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase text-muted-foreground mb-1.5">
        {title}
      </p>
      <div className="rounded-lg border border-border/60 divide-y">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-3 py-1.5">
            <span className="text-xs text-muted-foreground">{k}</span>
            <span className="text-xs font-medium text-right">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VendorSheet({
  vendorId,
  onClose,
}: {
  vendorId: string | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vendor } = useQuery({
    queryKey: ["vendor", vendorId],
    queryFn: () => fetchVendor(vendorId!),
    enabled: !!vendorId,
  });
  const { data: approvers = [] } = useQuery({
    queryKey: ["vendor-eligible-approvers"],
    queryFn: fetchEligibleApprovers,
    enabled: !!vendorId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["vendor", vendorId] });
    queryClient.invalidateQueries({ queryKey: ["vendors"] });
  };

  const [contractOpen, setContractOpen] = useState(false);
  const [editing, setEditing] = useState<VendorContract | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [preview, setPreview] = useState<VendorContract | null>(null);
  const [approverPickerOpen, setApproverPickerOpen] = useState(false);
  const [pickedApprover, setPickedApprover] = useState("");
  const [decisionOpen, setDecisionOpen] = useState<
    "approved" | "rejected" | null
  >(null);
  const [decisionNote, setDecisionNote] = useState("");

  const statusMut = useMutation({
    mutationFn: (status: VendorStatus) => setVendorStatus(vendorId!, status),
    onSuccess: invalidate,
  });
  const uploadMut = useMutation({
    mutationFn: ({ itemId, file }: { itemId: string; file: File }) =>
      uploadDdEvidence(vendorId!, itemId, file),
    onSuccess: () => {
      invalidate();
      toast({ title: "Evidence uploaded" });
    },
    onError: (err: any) =>
      toast({
        title: "Upload failed",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });
  const removeEvidenceMut = useMutation({
    mutationFn: (itemId: string) => removeDdEvidence(vendorId!, itemId),
    onSuccess: invalidate,
  });
  const noteMut = useMutation({
    mutationFn: () =>
      addVendorNote(vendorId!, noteTitle.trim(), noteBody.trim()),
    onSuccess: () => {
      invalidate();
      setNoteTitle("");
      setNoteBody("");
    },
  });
  const advanceMut = useMutation({
    mutationFn: ({
      contractId,
      status,
      label,
    }: {
      contractId: string;
      status: VendorContract["status"];
      label: string;
    }) => advanceVendorContract(vendorId!, contractId, status, label),
    onSuccess: invalidate,
  });
  const deleteContractMut = useMutation({
    mutationFn: (contractId: string) =>
      deleteVendorContract(vendorId!, contractId),
    onSuccess: invalidate,
  });
  const requestApprovalMut = useMutation({
    mutationFn: () => requestVendorApproval(vendorId!, pickedApprover),
    onSuccess: () => {
      invalidate();
      setApproverPickerOpen(false);
      setPickedApprover("");
      toast({ title: "Approval requested" });
    },
    onError: (err: any) =>
      toast({
        title: "Could not request approval",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });
  const decideMut = useMutation({
    mutationFn: () =>
      decideVendorApproval(vendorId!, decisionOpen!, decisionNote.trim()),
    onSuccess: () => {
      invalidate();
      setDecisionOpen(null);
      setDecisionNote("");
      toast({
        title:
          decisionOpen === "approved" ? "Vendor approved" : "Vendor rejected",
      });
    },
  });

  if (!vendor) return null;
  const done = vendor.ddItems.filter((d) => d.done).length;

  return (
    <>
      <Sheet open={!!vendor} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{vendor.legalName}</SheetTitle>
            <SheetDescription>
              {vendor.category} · {vendor.serviceSummary}
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="overview" className="mt-4">
            <TabsList className="w-full grid grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="dd">Diligence</TabsTrigger>
              <TabsTrigger value="contracts">Contracts</TabsTrigger>
              <TabsTrigger value="spend">Spend</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <DetailBlock
                title="Vendor details"
                rows={[
                  ["Legal name", vendor.legalName],
                  ["Trading name", vendor.tradingName || "—"],
                  ["Category", vendor.category],
                  ["Jurisdiction", vendor.jurisdiction],
                  ["Registration no.", vendor.registrationNumber || "—"],
                  ["Tax ID", vendor.taxId || "—"],
                  ["Website", vendor.website || "—"],
                ]}
              />
              <DetailBlock
                title="Primary contact"
                rows={[
                  ["Name", vendor.contactName || "—"],
                  ["Title", vendor.contactTitle || "—"],
                  ["Email", vendor.contactEmail || "—"],
                  ["Phone", vendor.contactPhone || "—"],
                ]}
              />
              <DetailBlock
                title="Commercial"
                rows={[
                  ["Engagement", vendor.engagementType || "—"],
                  ["Annual value", money(vendor.annualValue, vendor.currency)],
                  ["Payment terms", vendor.paymentTerms || "—"],
                  ["Budget code", vendor.budgetCode || "—"],
                  ["Used by", vendor.usedByModules.join(", ") || "—"],
                ]}
              />
              <DetailBlock
                title="Risk & governance"
                rows={[
                  ["Risk rating", vendor.risk],
                  ["Review frequency", vendor.reviewFrequency],
                  [
                    "Next review",
                    vendor.nextReview
                      ? new Date(vendor.nextReview).toLocaleDateString()
                      : "Not scheduled",
                  ],
                  [
                    "Onboarded",
                    vendor.onboardedAt
                      ? new Date(vendor.onboardedAt).toLocaleDateString()
                      : "—",
                  ],
                ]}
              />
              {vendor.justification && (
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Business justification
                  </p>
                  <p className="text-sm mt-1">{vendor.justification}</p>
                </div>
              )}

              {/* ── Approval — real workflow, restricted to HOD/Manager ── */}
              <div className="rounded-lg border border-border/60 p-3 space-y-2">
                <p className="text-[11px] font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5" /> Approval
                </p>
                {vendor.approvalStatus === "not_requested" && (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      No approval requested yet.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setApproverPickerOpen(true)}
                    >
                      Request approval
                    </Button>
                  </div>
                )}
                {vendor.approvalStatus === "pending" && (
                  <div className="space-y-2">
                    <p className="text-xs">
                      Pending with <strong>{vendor.approverName}</strong> since{" "}
                      {vendor.approvalRequestedAt &&
                        new Date(
                          vendor.approvalRequestedAt,
                        ).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setDecisionOpen("approved")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDecisionOpen("rejected")}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
                {vendor.approvalStatus === "approved" && (
                  <p className="text-xs">
                    Approved by <strong>{vendor.approverName}</strong> on{" "}
                    {vendor.approvalDecidedAt &&
                      new Date(vendor.approvalDecidedAt).toLocaleDateString()}
                    {vendor.approvalDecisionNote &&
                      ` — ${vendor.approvalDecisionNote}`}
                  </p>
                )}
                {vendor.approvalStatus === "rejected" && (
                  <div className="space-y-2">
                    <p className="text-xs text-destructive">
                      Rejected by <strong>{vendor.approverName}</strong>
                      {vendor.approvalDecisionNote &&
                        ` — ${vendor.approvalDecisionNote}`}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setApproverPickerOpen(true)}
                    >
                      Request approval again
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {(["Active", "Suspended", "Offboarded"] as VendorStatus[]).map(
                  (s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={vendor.status === s ? "default" : "outline"}
                      onClick={() => statusMut.mutate(s)}
                    >
                      {s}
                    </Button>
                  ),
                )}
              </div>
            </TabsContent>

            <TabsContent value="dd" className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                <Progress
                  value={(done / vendor.ddItems.length) * 100}
                  className="h-2 flex-1"
                />
                <span className="text-xs text-muted-foreground">
                  {done}/{vendor.ddItems.length} complete
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Each item is marked done only once a real document is uploaded
                against it.
              </p>
              {vendor.ddItems.map((d) => (
                <div
                  key={d._id}
                  className="flex items-start gap-3 rounded-lg border border-border/60 p-3"
                >
                  <ShieldCheck
                    className={`h-4 w-4 mt-0.5 shrink-0 ${d.done ? "text-success" : "text-muted-foreground"}`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{d.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {d.hint}
                    </p>
                    {d.documentName && (
                      <p className="text-[11px] text-primary mt-1">
                        <Paperclip className="h-3 w-3 inline mr-1" />
                        {d.documentName}
                      </p>
                    )}
                  </div>
                  {d.done ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeEvidenceMut.mutate(d._id)}
                    >
                      <X className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  ) : (
                    <label>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadMut.mutate({ itemId: d._id, file });
                          e.target.value = "";
                        }}
                      />
                      <span className="inline-flex h-8 cursor-pointer items-center rounded-md border border-input px-3 text-xs font-medium hover:bg-accent">
                        <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload
                      </span>
                    </label>
                  )}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="contracts" className="mt-4 space-y-3">
              <Button
                className="w-full"
                onClick={() => {
                  setEditing(null);
                  setContractOpen(true);
                }}
              >
                <FileSignature className="h-4 w-4 mr-2" /> New contract from
                template
              </Button>
              {vendor.contracts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No contracts yet. Draft one from a template above.
                </p>
              )}
              {vendor.contracts.map((c) => (
                <div
                  key={c._id}
                  className="rounded-lg border border-border/60 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{c.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {c.templateName} · {money(c.value, c.currency)} ·{" "}
                        {c.startDate?.slice(0, 10)} → {c.endDate?.slice(0, 10)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize ${CONTRACT_TONE[c.status]}`}
                    >
                      {c.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Signer: {c.signerName} ({c.signerEmail})
                  </p>
                  {c.history.length > 0 && (
                    <div className="space-y-0.5">
                      {c.history.slice(-3).map((h, i) => (
                        <p
                          key={i}
                          className="text-[10px] text-muted-foreground"
                        >
                          {new Date(h.at).toLocaleString()} — {h.label}
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreview(c)}
                    >
                      <FileText className="h-3.5 w-3.5 mr-1" /> View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(c);
                        setContractOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    {c.status === "draft" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          advanceMut.mutate({
                            contractId: c._id,
                            status: "sent",
                            label: `Sent to ${c.signerEmail}`,
                          })
                        }
                      >
                        <Send className="h-3.5 w-3.5 mr-1" /> Send
                      </Button>
                    )}
                    {c.status === "sent" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          advanceMut.mutate({
                            contractId: c._id,
                            status: "signed",
                            label: `Signed by ${c.signerName}`,
                          })
                        }
                      >
                        Mark signed
                      </Button>
                    )}
                    {c.status === "signed" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          advanceMut.mutate({
                            contractId: c._id,
                            status: "active",
                            label: "Contract activated",
                          })
                        }
                      >
                        Activate
                      </Button>
                    )}
                    {c.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          advanceMut.mutate({
                            contractId: c._id,
                            status: "terminated",
                            label: "Contract terminated",
                          })
                        }
                      >
                        Terminate
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteContractMut.mutate(c._id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="spend" className="mt-4 space-y-3">
              <div className="rounded-lg border border-border/60 p-4">
                <p className="text-xs text-muted-foreground">Spend YTD</p>
                <p className="text-2xl font-bold">
                  {money(vendorSpendYtd(vendor), vendor.currency)}
                </p>
              </div>
              {vendor.spend.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No spend recorded yet.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {vendor.spend.map((e, i) => (
                    <div key={e.month} className="flex items-center gap-2">
                      <span className="text-xs w-10 text-muted-foreground">
                        {SPEND_MONTHS[i] ?? e.month}
                      </span>
                      <Progress
                        value={
                          (e.amount /
                            Math.max(...vendor.spend.map((s) => s.amount), 1)) *
                          100
                        }
                        className="h-2 flex-1"
                      />
                      <span className="text-xs w-16 text-right">
                        {money(e.amount, vendor.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="mt-4 space-y-3">
              <div className="space-y-2 rounded-lg border border-border/60 p-3">
                <Input
                  placeholder="Note title"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                />
                <Textarea
                  rows={3}
                  placeholder="What happened?"
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                />
                <Button
                  size="sm"
                  disabled={noteMut.isPending || !noteTitle.trim()}
                  onClick={() => noteMut.mutate()}
                >
                  Add note
                </Button>
              </div>
              {vendor.notes.map((n) => (
                <div
                  key={n._id}
                  className="rounded-lg border border-border/60 p-3"
                >
                  <div className="flex justify-between">
                    <p className="text-sm font-semibold">{n.title}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(n.at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{n.body}</p>
                  <p className="text-[10px] text-primary mt-1">{n.author}</p>
                </div>
              ))}
              <div>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground mb-2">
                  Activity
                </p>
                {vendor.activity.map((a) => (
                  <div
                    key={a._id}
                    className="flex gap-2 py-1.5 border-b last:border-0"
                  >
                    <span className="text-xs flex-1">{a.text}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(a.at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <VendorContractDialog
        vendor={vendor}
        contract={editing}
        open={contractOpen}
        onOpenChange={setContractOpen}
      />

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{preview?.title}</DialogTitle>
            <DialogDescription>
              {preview?.templateName} · {preview?.status}
            </DialogDescription>
          </DialogHeader>
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: preview?.body ?? "" }}
          />
        </DialogContent>
      </Dialog>

      {/* ── Approver picker — real employees, HOD/Manager only ── */}
      <Dialog open={approverPickerOpen} onOpenChange={setApproverPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request vendor approval</DialogTitle>
            <DialogDescription>
              Only employees who are a Head of Department or Manager can approve
              a vendor.
            </DialogDescription>
          </DialogHeader>
          {approvers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No employees with Head of Department or Manager role were found.
              Assign that role to an employee first.
            </p>
          ) : (
            <Select value={pickedApprover} onValueChange={setPickedApprover}>
              <SelectTrigger>
                <SelectValue placeholder="Select an approver…" />
              </SelectTrigger>
              <SelectContent>
                {approvers.map((a) => (
                  <SelectItem key={a.employeeId} value={a.employeeId}>
                    {a.name} — {a.jobTitle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button
              disabled={!pickedApprover || requestApprovalMut.isPending}
              onClick={() => requestApprovalMut.mutate()}
            >
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Approve/reject decision ── */}
      <Dialog
        open={!!decisionOpen}
        onOpenChange={(o) => !o && setDecisionOpen(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decisionOpen === "approved" ? "Approve vendor" : "Reject vendor"}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Decision note (optional)…"
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant={decisionOpen === "rejected" ? "destructive" : "default"}
              disabled={decideMut.isPending}
              onClick={() => decideMut.mutate()}
            >
              Confirm {decisionOpen}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
