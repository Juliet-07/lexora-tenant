import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Upload,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  ShieldOff,
  FileCheck,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface EngagementDoc {
  _id: string;
  documentType: "engagement_letter" | "terms_and_agreement";
  title: string;
  originalFileName: string;
  fileSize: number;
  version: number;
  bypassSigning: boolean;
  isActive: boolean;
  createdAt: string;
}

interface SigningRecord {
  _id: string;
  clientId: { firstName: string; lastName: string; email: string } | null;
  status: "pending" | "signed" | "expired";
  createdAt: string;
  signedAt: string | null;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const formatBytes = (bytes: number) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const docTypeLabel = (t: string) =>
  t === "engagement_letter" ? "Engagement Letter" : "Terms & Agreement";

// ─────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────

const fetchDocument = async (): Promise<EngagementDoc | null> => {
  try {
    const res = await api.get("/tenant/engagement/my-document");
    return res.data?.data ?? res.data ?? null;
  } catch {
    return null;
  }
};

const fetchSignings = async (): Promise<SigningRecord[]> => {
  try {
    const res = await api.get("/tenant/engagement/signings");
    const d = res.data?.data ?? res.data;
    return Array.isArray(d) ? d : [];
  } catch {
    return [];
  }
};

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────

export default function EngagementDocument() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<
    "engagement_letter" | "terms_and_agreement"
  >("engagement_letter");
  const [uploadTitle, setUploadTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [bypassExpanded, setBypassExpanded] = useState(false);
  const [bypassConfirmed, setBypassConfirmed] = useState(false);
  const [offlineOpen, setOfflineOpen] = useState(false);
  const [offlineClientId, setOfflineClientId] = useState("");
  const [offlineDate, setOfflineDate] = useState("");
  const [offlineNote, setOfflineNote] = useState("");

  // ── Queries ───────────────────────────────────────────────
  const { data: doc, isLoading: docLoading } = useQuery({
    queryKey: ["engagement-document"],
    queryFn: fetchDocument,
  });

  const { data: signings = [], isLoading: signingsLoading } = useQuery({
    queryKey: ["engagement-signings"],
    queryFn: fetchSignings,
    enabled: !!doc?.isActive,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["engagement-document"] });
    queryClient.invalidateQueries({ queryKey: ["engagement-signings"] });
  };

  // ── Upload mutation ───────────────────────────────────────
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");
      const form = new FormData();
      form.append("file", selectedFile);
      form.append("documentType", uploadDocType);
      form.append("title", uploadTitle);
      return api.post("/tenant/engagement/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      toast({
        title: "Document uploaded",
        description: "Your engagement document is now active.",
      });
      setUploadOpen(false);
      setSelectedFile(null);
      setUploadTitle("");
      invalidate();
    },
    onError: (err: any) => {
      toast({
        title: "Upload failed",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  // ── Delete mutation ───────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: () => api.delete("/tenant/engagement/my-document"),
    onSuccess: () => {
      toast({ title: "Document deleted" });
      setDeleteOpen(false);
      invalidate();
    },
    onError: (err: any) => {
      toast({
        title: "Delete failed",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  // ── Bypass mutation ───────────────────────────────────────
  const bypassMutation = useMutation({
    mutationFn: (bypass: boolean) =>
      api.patch("/tenant/engagement/bypass", { bypass }),
    onSuccess: (_, bypass) => {
      toast({
        title: bypass ? "Bypass enabled" : "Bypass removed",
        description: bypass
          ? "Clients will receive credentials without signing."
          : "Signing requirement re-enabled.",
      });
      setBypassExpanded(false);
      setBypassConfirmed(false);
      invalidate();
    },
    onError: (err: any) => {
      toast({
        title: "Failed",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  // ── Resend mutation ───────────────────────────────────────
  const resendMutation = useMutation({
    mutationFn: (clientId: string) =>
      api.post(`/tenant/engagement/resend/${clientId}`),
    onSuccess: () => {
      toast({ title: "Signing link resent" });
      invalidate();
    },
    onError: (err: any) => {
      toast({
        title: "Failed to resend",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  // ── Mark offline mutation ─────────────────────────────────
  const offlineMutation = useMutation({
    mutationFn: () =>
      api.post(`/tenant/engagement/mark-signed-offline/${offlineClientId}`, {
        signedDate: offlineDate,
        note: offlineNote,
      }),
    onSuccess: () => {
      toast({ title: "Marked as signed offline" });
      setOfflineOpen(false);
      invalidate();
    },
    onError: (err: any) => {
      toast({
        title: "Failed",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  // ── Signing stats ─────────────────────────────────────────
  const totalSent = signings.length;
  const totalSigned = signings.filter((s) => s.status === "signed").length;
  const totalPending = signings.filter((s) => s.status === "pending").length;

  // ── Status badge ──────────────────────────────────────────
  const statusBadge = () => {
    if (!doc || (!doc.isActive && !doc.bypassSigning)) {
      return (
        <Badge className="border border-destructive/30 bg-destructive/10 text-destructive">
          Setup Required
        </Badge>
      );
    }
    if (doc.bypassSigning) {
      return (
        <Badge className="border border-amber-300 bg-amber-50 text-amber-700">
          Signing Bypassed
        </Badge>
      );
    }
    return (
      <Badge className="border border-emerald-300 bg-emerald-50 text-emerald-700">
        Active — v{doc.version}
      </Badge>
    );
  };

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Engagement Document</h2>
              {!docLoading && statusBadge()}
            </div>
            <p className="text-sm text-muted-foreground">
              Required before you can add clients
            </p>
          </div>
        </div>
      </div>

      {docLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : doc?.bypassSigning ? (
        // ── BYPASSED STATE ──────────────────────────────────
        <BypassedCard
          onUpload={() => setUploadOpen(true)}
          onRemoveBypass={() => bypassMutation.mutate(false)}
          loading={bypassMutation.isPending}
        />
      ) : doc?.isActive ? (
        // ── DOCUMENT UPLOADED STATE ─────────────────────────
        <>
          {/* Document card */}
          <Card className="border-primary/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <p className="font-semibold">{doc.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {docTypeLabel(doc.documentType)} &middot; Version{" "}
                      {doc.version} &middot; {formatBytes(doc.fileSize)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {doc.originalFileName}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUploadOpen(true)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" /> Replace
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                label: "Total Sent",
                value: totalSent,
                icon: Send,
                color: "text-primary",
              },
              {
                label: "Signed",
                value: totalSigned,
                icon: CheckCircle2,
                color: "text-emerald-600",
              },
              {
                label: "Pending",
                value: totalPending,
                icon: Clock,
                color: "text-amber-600",
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${color}`} />
                  <div>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Signings table */}
          {signingsLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : signings.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          Client
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          Email
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          Sent
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {signings.map((s) => (
                        <tr
                          key={s._id}
                          className="border-b last:border-0 hover:bg-muted/20"
                        >
                          <td className="px-4 py-3 font-medium">
                            {s.clientId
                              ? `${s.clientId.firstName} ${s.clientId.lastName}`
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {s.clientId?.email ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(s.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <SigningStatusBadge status={s.status} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              {(s.status === "pending" ||
                                s.status === "expired") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    s.clientId && resendMutation.mutate(s._id)
                                  }
                                  disabled={resendMutation.isPending}
                                >
                                  <Send className="h-3 w-3 mr-1" /> Resend
                                </Button>
                              )}
                              {s.status !== "signed" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    if (s.clientId) {
                                      setOfflineClientId(s._id);
                                      setOfflineOpen(true);
                                    }
                                  }}
                                >
                                  <FileCheck className="h-3 w-3 mr-1" /> Mark
                                  Offline
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground text-sm">
                No signing requests sent yet. Signing records appear here when
                you add clients.
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        // ── EMPTY STATE ─────────────────────────────────────
        <EmptyState
          onUpload={(type) => {
            setUploadDocType(type);
            setUploadOpen(true);
          }}
          bypassExpanded={bypassExpanded}
          setBypassExpanded={setBypassExpanded}
          bypassConfirmed={bypassConfirmed}
          setBypassConfirmed={setBypassConfirmed}
          onConfirmBypass={() => bypassMutation.mutate(true)}
          bypassLoading={bypassMutation.isPending}
        />
      )}

      {/* ── Upload dialog ─────────────────────────────────── */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {doc?.isActive
                ? "Replace Document"
                : "Upload Engagement Document"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select
                value={uploadDocType}
                onValueChange={(v: any) => setUploadDocType(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="engagement_letter">
                    Engagement Letter
                  </SelectItem>
                  <SelectItem value="terms_and_agreement">
                    Terms & Agreement
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Document Title</Label>
              <Input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="e.g. Terms of Engagement & Client Authorization"
              />
            </div>

            <div className="space-y-2">
              <Label>PDF File</Label>
              <div
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <FileText className="h-5 w-5 text-red-500" />
                    <span className="font-medium">{selectedFile.name}</span>
                    <span className="text-muted-foreground">
                      ({formatBytes(selectedFile.size)})
                    </span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to select your PDF file
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF only · Max 10MB
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-primary to-secondary"
              onClick={() => uploadMutation.mutate()}
              disabled={
                !selectedFile || !uploadTitle.trim() || uploadMutation.isPending
              }
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" /> Upload Document
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm dialog ──────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Engagement Document?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete your engagement document. You will not
            be able to add new clients until you upload a replacement or enable
            the bypass option.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Mark offline dialog ────────────────────────────── */}
      <Dialog open={offlineOpen} onOpenChange={setOfflineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Signed Offline</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Use this for clients who signed their engagement document outside
            the platform — for example, via email or in person.
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date Signed</Label>
              <Input
                type="date"
                value={offlineDate}
                onChange={(e) => setOfflineDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Input
                value={offlineNote}
                onChange={(e) => setOfflineNote(e.target.value)}
                placeholder="e.g. Signed via email on 12 Jan 2025"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfflineOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-primary to-secondary"
              onClick={() => offlineMutation.mutate()}
              disabled={!offlineDate || offlineMutation.isPending}
            >
              {offlineMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────

function SigningStatusBadge({ status }: { status: string }) {
  if (status === "signed")
    return (
      <Badge className="border border-emerald-300 bg-emerald-50 text-emerald-700">
        Signed
      </Badge>
    );
  if (status === "expired")
    return (
      <Badge className="border border-red-300 bg-red-50 text-red-700">
        Expired
      </Badge>
    );
  return (
    <Badge className="border border-amber-300 bg-amber-50 text-amber-700">
      Pending
    </Badge>
  );
}

function BypassedCard({
  onUpload,
  onRemoveBypass,
  loading,
}: {
  onUpload: () => void;
  onRemoveBypass: () => void;
  loading: boolean;
}) {
  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <ShieldOff className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-800">
              Engagement signing is currently bypassed
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              Clients are receiving login credentials without signing a
              document. Upload an engagement document to re-enable the signing
              requirement.
            </p>
            <div className="flex gap-3 mt-4">
              <Button
                size="sm"
                className="bg-gradient-to-r from-primary to-secondary"
                onClick={onUpload}
              >
                <Upload className="h-4 w-4 mr-2" /> Upload Document
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-amber-700 hover:text-amber-800"
                onClick={onRemoveBypass}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Remove Bypass"
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  onUpload,
  bypassExpanded,
  setBypassExpanded,
  bypassConfirmed,
  setBypassConfirmed,
  onConfirmBypass,
  bypassLoading,
}: {
  onUpload: (type: "engagement_letter" | "terms_and_agreement") => void;
  bypassExpanded: boolean;
  setBypassExpanded: (v: boolean) => void;
  bypassConfirmed: boolean;
  setBypassConfirmed: (v: boolean) => void;
  onConfirmBypass: () => void;
  bypassLoading: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Main empty state card */}
      <Card className="border-2 border-dashed border-primary/30">
        <CardContent className="p-10 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            Upload your engagement document
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Before you can add clients, you must upload either an Engagement
            Letter or Terms &amp; Agreement. Your clients will be required to
            sign this document before receiving access to the platform.
          </p>

          <div className="flex gap-3 justify-center flex-wrap">
            <Button
              className="bg-gradient-to-r from-primary to-secondary"
              onClick={() => onUpload("engagement_letter")}
            >
              <Upload className="h-4 w-4 mr-2" /> Upload Engagement Letter
            </Button>
            <Button
              variant="outline"
              onClick={() => onUpload("terms_and_agreement")}
            >
              <Upload className="h-4 w-4 mr-2" /> Upload Terms &amp; Agreement
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bypass — deliberately small and understated */}
      <div className="text-center">
        <button
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
          onClick={() => setBypassExpanded(!bypassExpanded)}
        >
          I don't use an engagement document →
        </button>
      </div>

      {bypassExpanded && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="p-5">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    Are you sure you want to skip this?
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Bypassing this requirement means clients will receive login
                    credentials immediately without signing any document. Only
                    enable this if you are certain you do not require client
                    sign-off before onboarding.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bypassConfirmed}
                    onChange={(e) => setBypassConfirmed(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-amber-800">
                    I understand — skip the signing requirement
                  </span>
                </label>
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  disabled={!bypassConfirmed || bypassLoading}
                  onClick={onConfirmBypass}
                >
                  {bypassLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Confirm Bypass"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
