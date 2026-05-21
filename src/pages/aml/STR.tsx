import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  FileText,
  Download,
  Edit,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Eye,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchStrStats,
  fetchStrs,
  fetchStrById,
  createStr,
  updateStr,
  submitStr,
  acknowledgeStr,
  downloadStrXml,
  type Str,
  type StrStats,
} from "@/lib/kyc-api";
import { prettyLabel } from "@/lib/clients-api";
import { ClientSelect } from "@/components/ClientDropdown";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function statusBadge(s: string) {
  const cls =
    s === "submitted"
      ? "bg-success/15 text-success border-success/30"
      : s === "acknowledged"
        ? "bg-info/15 text-info border-info/30"
        : s === "pending_review"
          ? "bg-warning/15 text-warning border-warning/30"
          : "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={`${cls} text-[10px] capitalize`}>
      {prettyLabel(s)}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────
// NEW / EDIT STR DIALOG
// ─────────────────────────────────────────────────────────────

interface StrFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editStr?: Str | null; // if set → edit mode
}

function StrFormDialog({
  open,
  onClose,
  onSaved,
  editStr,
}: StrFormDialogProps) {
  const { toast } = useToast();
  const isEdit = !!editStr;

  const [form, setForm] = useState({
    clientId: editStr
      ? typeof editStr.clientId === "object"
        ? editStr.clientId._id
        : editStr.clientId
      : "",
    relatedCaseId: editStr?.relatedCaseId ?? "",
    customerName: editStr?.customerName ?? "",
    amount: editStr ? String(editStr.amount) : "",
    currency: editStr?.currency ?? "USD",
    transactionDate: editStr?.transactionDate
      ? new Date(editStr.transactionDate).toISOString().split("T")[0]
      : "",
    bankName: editStr?.bankName ?? "",
    descriptionOfActivity: editStr?.descriptionOfActivity ?? "",
    additionalInformation: editStr?.additionalInformation ?? "",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    if (
      !form.clientId ||
      !form.customerName ||
      !form.amount ||
      !form.transactionDate ||
      !form.descriptionOfActivity
    ) {
      toast({
        title: "Missing fields",
        description: "Please fill all required fields.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (saveAsDraft: boolean) =>
      createStr({
        clientId: form.clientId,
        relatedCaseId: form.relatedCaseId || undefined,
        customerName: form.customerName,
        amount: Number(form.amount),
        currency: form.currency,
        transactionDate: form.transactionDate,
        bankName: form.bankName || undefined,
        descriptionOfActivity: form.descriptionOfActivity,
        additionalInformation: form.additionalInformation || undefined,
        saveAsDraft,
      }),
    onSuccess: (_, saveAsDraft) => {
      toast({
        title: saveAsDraft ? "Saved as draft" : "STR moved to pending review",
        description: saveAsDraft
          ? "You can continue editing and submit later."
          : "A compliance officer will review before submission.",
      });
      onSaved();
      onClose();
    },
    onError: (err: any) =>
      toast({
        title: "Failed",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  // Update mutation (edit mode — only drafts)
  const updateMutation = useMutation({
    mutationFn: () =>
      updateStr(editStr!._id, {
        relatedCaseId: form.relatedCaseId || undefined,
        customerName: form.customerName,
        amount: Number(form.amount),
        currency: form.currency,
        transactionDate: form.transactionDate,
        bankName: form.bankName || undefined,
        descriptionOfActivity: form.descriptionOfActivity,
        additionalInformation: form.additionalInformation || undefined,
      }),
    onSuccess: () => {
      toast({ title: "STR updated" });
      onSaved();
      onClose();
    },
    onError: (err: any) =>
      toast({
        title: "Failed",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit STR" : "New Suspicious Transaction Report"}
          </DialogTitle>
          <DialogDescription>
            Submit to Rwanda FIC Financial Intelligence Unit. All starred fields
            are required.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 py-2">
          {/* Client selector */}
          {!isEdit && (
            <div className="md:col-span-2 space-y-2">
              <Label>
                Client <span className="text-destructive">*</span>
              </Label>
              <ClientSelect
                value={form.clientId}
                onValueChange={(v) => set("clientId", v)}
                onClientChange={(client) =>
                  set(
                    "customerName",
                    [client.firstName, client.lastName]
                      .filter(Boolean)
                      .join(" ") || client.email,
                  )
                }
              />
            </div>
          )}

          {/* Related Case ID */}
          <div className="space-y-2">
            <Label>Related Case ID</Label>
            <Input
              placeholder="CASE001"
              value={form.relatedCaseId}
              onChange={(e) => set("relatedCaseId", e.target.value)}
            />
          </div>

          {/* Customer Name */}
          <div className="space-y-2">
            <Label>
              Customer Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.customerName}
              onChange={(e) => set("customerName", e.target.value)}
              placeholder="Auto-filled from client selection"
            />
          </div>

          {/* Amount + Currency */}
          <div className="space-y-2">
            <Label>
              Transaction Amount <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select
              value={form.currency}
              onValueChange={(v) => set("currency", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["USD", "RWF", "EUR", "GBP", "KES", "UGX"].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transaction Date */}
          <div className="space-y-2">
            <Label>
              Transaction Date <span className="text-destructive">*</span>
            </Label>
            <Input
              type="date"
              value={form.transactionDate}
              onChange={(e) => set("transactionDate", e.target.value)}
            />
          </div>

          {/* Bank */}
          <div className="space-y-2">
            <Label>Bank / Institution</Label>
            <Input
              value={form.bankName}
              onChange={(e) => set("bankName", e.target.value)}
              placeholder="e.g. Bank of Kigali"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2 space-y-2">
            <Label>
              Description of Suspicious Activity{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              rows={4}
              placeholder="Describe the suspicious activity in detail…"
              value={form.descriptionOfActivity}
              onChange={(e) => set("descriptionOfActivity", e.target.value)}
            />
          </div>

          {/* Additional Info */}
          <div className="md:col-span-2 space-y-2">
            <Label>Additional Information</Label>
            <Textarea
              rows={3}
              placeholder="Any other relevant information…"
              value={form.additionalInformation}
              onChange={(e) => set("additionalInformation", e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          {isEdit ? (
            <Button
              variant="secondary"
              disabled={isPending}
              onClick={() => {
                if (validate()) updateMutation.mutate();
              }}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save Changes"
              )}
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                disabled={isPending}
                onClick={() => {
                  if (validate()) createMutation.mutate(true);
                }}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save as Draft"
                )}
              </Button>
              <Button
                className="bg-gradient-to-r from-primary to-secondary"
                disabled={isPending}
                onClick={() => {
                  if (validate()) createMutation.mutate(false);
                }}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" /> Submit to Rwanda FIC
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// VIEW STR DIALOG
// ─────────────────────────────────────────────────────────────

function ViewStrDialog({
  str,
  onUpdated,
}: {
  str: Str;
  onUpdated: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [ackRef, setAckRef] = useState("");

  const submitMutation = useMutation({
    mutationFn: () => submitStr(str._id),
    onSuccess: (data) => {
      toast({
        title: "STR submitted",
        description: "Download the goAML XML and upload it to goweb.fic.gov.rw",
      });
      // Auto-trigger XML download
      const blob = new Blob([data.xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${str.strId}-goAML.xml`;
      a.click();
      URL.revokeObjectURL(url);
      onUpdated();
    },
    onError: (err: any) =>
      toast({
        title: "Failed",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const ackMutation = useMutation({
    mutationFn: () => acknowledgeStr(str._id, ackRef || undefined),
    onSuccess: () => {
      toast({ title: "STR acknowledged" });
      setOpen(false);
      onUpdated();
    },
    onError: (err: any) =>
      toast({
        title: "Failed",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const client = typeof str.clientId === "object" ? str.clientId : null;
  const reportedBy = typeof str.reportedBy === "object" ? str.reportedBy : null;

  return (
    <>
      <button
        className="text-primary hover:underline inline-flex items-center gap-1 text-xs"
        onClick={() => setOpen(true)}
      >
        <Eye className="h-3 w-3" /> View
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {str.strId}
              {statusBadge(str.status)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            {/* Client info */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40">
              <div>
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="font-medium">{str.customerName}</p>
                {client && (
                  <p className="text-xs text-muted-foreground">
                    {client.email}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bank</p>
                <p className="font-medium">{str.bankName ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="font-semibold">
                  {str.currency} {str.amount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Transaction Date
                </p>
                <p className="font-medium">
                  {new Date(str.transactionDate).toLocaleDateString()}
                </p>
              </div>
              {str.relatedCaseId && (
                <div>
                  <p className="text-xs text-muted-foreground">Related Case</p>
                  <p className="font-mono">{str.relatedCaseId}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Reported By</p>
                <p className="font-medium">
                  {reportedBy
                    ? `${reportedBy.firstName} ${reportedBy.lastName}`
                    : "—"}
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Description of Suspicious Activity
              </p>
              <p className="text-sm leading-relaxed">
                {str.descriptionOfActivity}
              </p>
            </div>

            {str.additionalInformation && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Additional Information
                </p>
                <p className="text-sm leading-relaxed">
                  {str.additionalInformation}
                </p>
              </div>
            )}

            {/* Timeline */}
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Timeline
              </p>
              {[
                { label: "Created", date: str.createdAt },
                { label: "Submitted", date: str.submittedAt },
                { label: "Acknowledged", date: str.acknowledgedAt },
              ]
                .filter((t) => t.date)
                .map((t) => (
                  <div
                    key={t.label}
                    className="flex items-center gap-2 text-xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                    <span className="text-muted-foreground">{t.label}:</span>
                    <span>{new Date(t.date!).toLocaleString()}</span>
                  </div>
                ))}
              {str.goAmlReference && (
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-info shrink-0" />
                  <span className="text-muted-foreground">goAML Ref:</span>
                  <span className="font-mono">{str.goAmlReference}</span>
                </div>
              )}
            </div>

            {/* Acknowledge input — only for submitted */}
            {str.status === "submitted" && (
              <div className="space-y-2 p-3 rounded-lg border border-info/30 bg-info/5">
                <p className="text-xs font-medium text-info">
                  Mark as acknowledged by Rwanda FIC
                </p>
                <Input
                  placeholder="goAML reference number (optional)"
                  value={ackRef}
                  onChange={(e) => setAckRef(e.target.value)}
                  className="text-xs"
                />
                <Button
                  size="sm"
                  className="w-full"
                  disabled={ackMutation.isPending}
                  onClick={() => ackMutation.mutate()}
                >
                  {ackMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Mark as Acknowledged"
                  )}
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>

            {/* Submit — for pending_review status */}
            {str.status === "pending_review" && (
              <Button
                className="bg-gradient-to-r from-primary to-secondary"
                disabled={submitMutation.isPending}
                onClick={() => submitMutation.mutate()}
              >
                {submitMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" /> Submit to Rwanda FIC
                  </>
                )}
              </Button>
            )}

            {/* Re-download XML — for submitted/acknowledged */}
            {(str.status === "submitted" || str.status === "acknowledged") && (
              <Button
                variant="outline"
                onClick={() => {
                  const token = localStorage.getItem("tenantToken");
                  const url = downloadStrXml(str._id);
                  // Open with auth header via fetch then trigger download
                  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
                    .then((r) => r.blob())
                    .then((blob) => {
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = `${str.strId}-goAML.xml`;
                      a.click();
                    });
                }}
              >
                <Download className="h-4 w-4 mr-1" /> Download XML
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────

export default function STR() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editStr, setEditStr] = useState<Str | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["str-stats"] });
    qc.invalidateQueries({ queryKey: ["str-list"] });
  };

  // ── Queries ───────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["str-stats"],
    queryFn: fetchStrStats,
    staleTime: 30_000,
  });

  const { data: strList, isLoading: listLoading } = useQuery({
    queryKey: ["str-list", statusFilter],
    queryFn: () => fetchStrs({ limit: 50, status: statusFilter || undefined }),
    staleTime: 30_000,
  });

  // Submit mutation (from list row — for drafts going to pending)
  const submitMutation = useMutation({
    mutationFn: (id: string) => submitStr(id),
    onSuccess: (data) => {
      toast({
        title: "STR submitted to Rwanda FIC",
        description: "Downloading goAML XML…",
      });
      const blob = new Blob([data.xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.strId}-goAML.xml`;
      a.click();
      URL.revokeObjectURL(url);
      invalidate();
    },
    onError: (err: any) =>
      toast({
        title: "Failed",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const strs = strList?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">
            Suspicious Transaction Reporting (STR)
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate and submit required regulatory reports to Rwanda FIC
            Financial Intelligence Unit
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={invalidate}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            className="bg-gradient-to-r from-primary to-secondary"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4 mr-1" /> New STR
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))
        ) : (
          <>
            <Card
              className={`cursor-pointer transition-colors ${statusFilter === "draft" ? "ring-2 ring-primary" : ""}`}
              onClick={() =>
                setStatusFilter(statusFilter === "draft" ? "" : "draft")
              }
            >
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Draft STRs</p>
                <p className="text-3xl font-bold">{stats?.draft ?? 0}</p>
              </CardContent>
            </Card>
            <Card
              className={`bg-warning/5 border-warning/30 cursor-pointer transition-colors ${statusFilter === "pending_review" ? "ring-2 ring-warning" : ""}`}
              onClick={() =>
                setStatusFilter(
                  statusFilter === "pending_review" ? "" : "pending_review",
                )
              }
            >
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Pending Review</p>
                <p className="text-3xl font-bold text-warning">
                  {stats?.pendingReview ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card
              className={`bg-success/5 border-success/30 cursor-pointer transition-colors ${statusFilter === "submitted" ? "ring-2 ring-success" : ""}`}
              onClick={() =>
                setStatusFilter(statusFilter === "submitted" ? "" : "submitted")
              }
            >
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Submitted</p>
                <p className="text-3xl font-bold text-success">
                  {stats?.submitted ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card
              className={`bg-primary/5 border-primary/30 cursor-pointer transition-colors ${statusFilter === "" ? "" : ""}`}
            >
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total STRs</p>
                <p className="text-3xl font-bold text-primary">
                  {stats?.total ?? 0}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filter indicator */}
      {statusFilter && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtering by:</span>
          <Badge variant="outline" className="capitalize">
            {prettyLabel(statusFilter)}
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => setStatusFilter("")}>
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        </div>
      )}

      {/* STR Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">STR Reports</CardTitle>
          {listLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : strs.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                {statusFilter
                  ? `No ${prettyLabel(statusFilter)} STRs found.`
                  : "No STR reports yet."}
              </p>
              <Button
                size="sm"
                className="bg-gradient-to-r from-primary to-secondary mt-2"
                onClick={() => setShowForm(true)}
              >
                <Plus className="h-4 w-4 mr-1" /> Create First STR
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>STR ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {strs.map((r) => {
                  const client =
                    typeof r.clientId === "object" ? r.clientId : null;
                  const reportedBy =
                    typeof r.reportedBy === "object" ? r.reportedBy : null;

                  return (
                    <TableRow key={r._id}>
                      <TableCell className="font-mono text-xs">
                        {r.strId}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">
                          {r.customerName}
                        </div>
                        {client && (
                          <div className="text-xs text-muted-foreground">
                            {client.email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.bankName ?? "—"}
                      </TableCell>
                      <TableCell className="font-semibold text-sm">
                        {r.currency} {r.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell className="text-xs">
                        {reportedBy
                          ? `${reportedBy.firstName} ${reportedBy.lastName}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs">
                          {/* View */}
                          <ViewStrDialog str={r} onUpdated={invalidate} />

                          {/* Edit — drafts only */}
                          {r.status === "draft" && (
                            <button
                              className="text-warning hover:underline inline-flex items-center gap-1"
                              onClick={() => setEditStr(r)}
                            >
                              <Edit className="h-3 w-3" /> Edit
                            </button>
                          )}

                          {/* Submit — pending_review */}
                          {r.status === "pending_review" && (
                            <button
                              className="text-primary hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                              disabled={submitMutation.isPending}
                              onClick={() => submitMutation.mutate(r._id)}
                            >
                              {submitMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Send className="h-3 w-3" /> Submit
                                </>
                              )}
                            </button>
                          )}

                          {/* Download XML — submitted/acknowledged */}
                          {(r.status === "submitted" ||
                            r.status === "acknowledged") && (
                            <button
                              className="text-primary hover:underline inline-flex items-center gap-1"
                              onClick={() => {
                                const token =
                                  localStorage.getItem("tenantToken");
                                const url = downloadStrXml(r._id);
                                fetch(url, {
                                  headers: { Authorization: `Bearer ${token}` },
                                })
                                  .then((res) => res.blob())
                                  .then((blob) => {
                                    const a = document.createElement("a");
                                    a.href = URL.createObjectURL(blob);
                                    a.download = `${r.strId}-goAML.xml`;
                                    a.click();
                                  });
                              }}
                            >
                              <Download className="h-3 w-3" /> Download
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New STR Dialog */}
      <StrFormDialog
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={invalidate}
      />

      {/* Edit STR Dialog */}
      {editStr && (
        <StrFormDialog
          open={!!editStr}
          onClose={() => setEditStr(null)}
          onSaved={invalidate}
          editStr={editStr}
        />
      )}
    </div>
  );
}
