import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  Plus,
  Sun,
  Heart,
  Baby,
  GraduationCap,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Paperclip,
  FileText,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchMyLeaveBalance,
  fetchMyLeaveRequests,
  submitLeaveRequest,
  cancelLeaveRequest,
  uploadLeaveDocument,
  removeLeaveDocument,
  resolveLeaveFileUrl,
  type LeaveBalance,
  type LeaveRequest,
} from "@/lib/hr-api";

// ─── Constants ────────────────────────────────────────────────

const LEAVE_TYPES = [
  { value: "annual", label: "Annual" },
  { value: "sick", label: "Sick" },
  { value: "maternity", label: "Maternity" },
  { value: "paternity", label: "Paternity" },
  { value: "compassionate", label: "Compassionate" },
  { value: "study", label: "Study" },
  { value: "unpaid", label: "Unpaid" },
];

const BALANCE_CONFIG: Record<string, { tone: string; icon: any }> = {
  annual: { tone: "from-blue-500 to-cyan-500", icon: Sun },
  sick: { tone: "from-rose-500 to-red-500", icon: Heart },
  maternity: { tone: "from-pink-500 to-fuchsia-500", icon: Baby },
  paternity: { tone: "from-indigo-500 to-violet-500", icon: Baby },
  compassionate: { tone: "from-violet-500 to-purple-600", icon: Heart },
  study: { tone: "from-emerald-500 to-teal-500", icon: GraduationCap },
  unpaid: { tone: "from-slate-400 to-slate-600", icon: Clock },
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const STATUS_ICON: Record<string, React.ElementType> = {
  approved: CheckCircle2,
  rejected: XCircle,
  cancelled: XCircle,
  pending: Clock,
};

const typeLabel = (type: string) =>
  LEAVE_TYPES.find((t) => t.value === type)?.label ?? type;

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const fmtShort = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

const workingDays = (a: string, b: string) => {
  if (!a || !b) return 0;
  let count = 0;
  const cur = new Date(a);
  const end = new Date(b);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

const ACCEPTED_DOC_TYPES =
  "application/pdf,image/jpeg,image/jpg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// ─── Component ────────────────────────────────────────────────

export default function MyLeave() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    type: "annual",
    from: "",
    to: "",
    reason: "",
  });
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Tracks which existing request a hidden file input is currently
  // targeting, so one shared <input type="file"> can serve every
  // row in the list instead of rendering one per request.
  const attachInputRef = useRef<HTMLInputElement>(null);
  const [attachTargetId, setAttachTargetId] = useState<string | null>(null);

  // ── Queries ───────────────────────────────────────────────
  const { data: balanceData, isLoading: balLoading } = useQuery({
    queryKey: ["employee-leave-balance"],
    queryFn: fetchMyLeaveBalance,
    staleTime: 60_000,
  });

  const balances: LeaveBalance[] = balanceData?.balances ?? [];

  const { data: requests = [], isLoading: reqLoading } = useQuery<
    LeaveRequest[]
  >({
    queryKey: ["employee-leave-requests"],
    queryFn: fetchMyLeaveRequests,
    staleTime: 30_000,
  });

  // ── Submit mutation — creates the request, then attaches the
  // chosen file (if any) as a follow-up call, since the upload
  // endpoint needs a real request ID to attach to. ──────────────
  const submitMutation = useMutation({
    mutationFn: async () => {
      const request = await submitLeaveRequest({
        type: draft.type,
        startDate: draft.from,
        endDate: draft.to,
        reason: draft.reason,
      });
      if (pendingFile) {
        await uploadLeaveDocument(request._id, pendingFile);
      }
      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["employee-leave-balance"] });
      setOpen(false);
      setDraft({ type: "annual", from: "", to: "", reason: "" });
      setPendingFile(null);
      toast.success("Leave request submitted. Your manager will be notified.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to submit request"),
  });

  // ── Cancel mutation ───────────────────────────────────────
  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelLeaveRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-leave-requests"] });
      toast.success("Request cancelled.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to cancel request"),
  });

  // ── Attach / remove document on an existing request ─────────
  const attachMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      uploadLeaveDocument(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-leave-requests"] });
      toast.success("Document attached.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to attach document"),
    onSettled: () => setAttachTargetId(null),
  });

  const removeDocMutation = useMutation({
    mutationFn: ({ id, fileUrl }: { id: string; fileUrl: string }) =>
      removeLeaveDocument(id, fileUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-leave-requests"] });
      toast.success("Document removed.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to remove document"),
  });

  const openAttachPicker = (requestId: string) => {
    setAttachTargetId(requestId);
    // Reset so selecting the same file twice in a row still fires onChange
    if (attachInputRef.current) attachInputRef.current.value = "";
    attachInputRef.current?.click();
  };

  const pending = requests.filter((r) => r.status === "pending");
  const upcoming = requests.filter(
    (r) => r.status === "approved" && new Date(r.startDate) >= new Date(),
  );

  const estimatedDays = workingDays(draft.from, draft.to);
  const canSubmit =
    draft.from && draft.to && draft.reason.trim() && !submitMutation.isPending;

  // Primary 4 balances shown on top cards — annual, sick, then whichever
  // else has a non-zero entitlement.
  const primaryBalances = [
    ...balances.filter((b) => ["annual", "sick"].includes(b.type)),
    ...balances.filter(
      (b) => !["annual", "sick"].includes(b.type) && b.daysAllowed > 0,
    ),
  ].slice(0, 4);

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Hidden shared file input for attaching docs to existing requests */}
      <input
        ref={attachInputRef}
        type="file"
        accept={ACCEPTED_DOC_TYPES}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && attachTargetId) {
            attachMutation.mutate({ id: attachTargetId, file });
          } else {
            setAttachTargetId(null);
          }
        }}
      />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Leave</h1>
          <p className="text-sm text-muted-foreground">
            Request time off, view balances, and track upcoming leave.
          </p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="bg-gradient-to-r from-primary to-secondary"
        >
          <Plus className="h-4 w-4 mr-2" /> Request Leave
        </Button>
      </div>

      {/* Balance cards */}
      {balLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading balances…
        </div>
      ) : primaryBalances.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No leave policy has been set for your location yet. Contact your
            administrator.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {primaryBalances.map((b) => {
            const cfg = BALANCE_CONFIG[b.type] ?? BALANCE_CONFIG.unpaid;
            const Icon = cfg.icon;
            const pct =
              b.daysAllowed > 0 ? (b.daysUsed / b.daysAllowed) * 100 : 0;
            return (
              <Card key={b.type}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        {b.label}
                      </p>
                      <p className="text-2xl font-bold mt-1">
                        {b.daysLeft}
                        <span className="text-sm font-normal text-muted-foreground">
                          {" "}
                          / {b.daysAllowed} days
                        </span>
                      </p>
                    </div>
                    <div
                      className={`h-10 w-10 rounded-lg bg-gradient-to-br ${cfg.tone} flex items-center justify-center`}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {b.daysUsed} taken this year
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">My Requests</TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming {upcoming.length > 0 && `(${upcoming.length})`}
          </TabsTrigger>
          <TabsTrigger value="policy">Policy</TabsTrigger>
        </TabsList>

        {/* All requests */}
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" /> All Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {reqLoading ? (
                <div className="flex items-center justify-center h-24 gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading…</span>
                </div>
              ) : (
                <>
                  {pending.length > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-warning/10 text-warning rounded-lg text-sm mb-3">
                      <AlertCircle className="h-4 w-4" />
                      {pending.length} request{pending.length !== 1 ? "s" : ""}{" "}
                      awaiting approval.
                    </div>
                  )}
                  {requests.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No leave requests yet. Click "Request Leave" to submit
                      one.
                    </p>
                  ) : (
                    requests.map((r) => {
                      const Icon = STATUS_ICON[r.status] ?? Clock;
                      const isAttachingHere =
                        attachTargetId === r._id && attachMutation.isPending;
                      return (
                        <div
                          key={r._id}
                          className="flex items-start justify-between gap-3 py-3 border-b last:border-b-0"
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <Icon
                              className={`h-4 w-4 mt-1 shrink-0 ${
                                r.status === "approved"
                                  ? "text-success"
                                  : r.status === "rejected"
                                    ? "text-destructive"
                                    : r.status === "cancelled"
                                      ? "text-muted-foreground"
                                      : "text-warning"
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">
                                {typeLabel(r.type)} — {r.days} day
                                {r.days !== 1 ? "s" : ""}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {fmtShort(r.startDate)} – {fmt(r.endDate)}
                              </p>
                              {r.reason && (
                                <p className="text-xs text-foreground/80 italic mt-1 truncate">
                                  "{r.reason}"
                                </p>
                              )}
                              {r.reviewNote && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Note: {r.reviewNote}
                                </p>
                              )}

                              {/* Supporting documents */}
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                {r.documents?.map((doc) => (
                                  <span
                                    key={doc.url}
                                    className="inline-flex items-center gap-1 text-[11px] border rounded-md pl-2 pr-1 py-1 bg-muted/40"
                                  >
                                    <a
                                      href={resolveLeaveFileUrl(doc.url)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 hover:underline"
                                    >
                                      <FileText className="h-3 w-3" />
                                      {doc.name}
                                    </a>
                                    <button
                                      onClick={() =>
                                        removeDocMutation.mutate({
                                          id: r._id,
                                          fileUrl: doc.url,
                                        })
                                      }
                                      disabled={removeDocMutation.isPending}
                                      className="text-muted-foreground hover:text-destructive"
                                      title="Remove"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </span>
                                ))}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[11px] px-2"
                                  disabled={isAttachingHere}
                                  onClick={() => openAttachPicker(r._id)}
                                >
                                  {isAttachingHere ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <Paperclip className="h-3 w-3 mr-1" />
                                  )}
                                  Attach document
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <Badge
                              variant="outline"
                              className={STATUS_STYLE[r.status] ?? ""}
                            >
                              <span className="capitalize">{r.status}</span>
                            </Badge>
                            {r.status === "pending" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                disabled={cancelMutation.isPending}
                                onClick={() => cancelMutation.mutate(r._id)}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upcoming */}
        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Approved Upcoming Leave
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No upcoming approved leave.
                </p>
              ) : (
                upcoming.map((r) => (
                  <div
                    key={r._id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium">{typeLabel(r.type)}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtShort(r.startDate)} – {fmt(r.endDate)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-success/10 text-success border-success/20"
                    >
                      {r.days}d
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policy */}
        <TabsContent value="policy">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Your Leave Entitlements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {balLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : balances.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No policy configured for your location yet. Contact your
                  administrator.
                </p>
              ) : (
                balances.map((b) => (
                  <div
                    key={b.type}
                    className="flex items-center justify-between py-2 border-b last:border-b-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{b.label}</span>
                      {b.carryOver && (
                        <span className="text-[10px] text-muted-foreground">
                          ↻ carry over
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold">{b.daysLeft}d</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        of {b.daysAllowed}d
                      </span>
                    </div>
                  </div>
                ))
              )}
              <p className="text-xs italic mt-2 text-muted-foreground">
                Contact your administrator if you believe your entitlements are
                incorrect.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Request Leave Dialog ── */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setDraft({ type: "annual", from: "", to: "", reason: "" });
            setPendingFile(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
            <DialogDescription>
              Submit to your manager for approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>
                Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={draft.type}
                onValueChange={(v) => setDraft((d) => ({ ...d, type: v }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>
                  From <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  className="mt-1.5"
                  value={draft.from}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, from: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>
                  To <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  className="mt-1.5"
                  value={draft.to}
                  min={draft.from || new Date().toISOString().slice(0, 10)}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, to: e.target.value }))
                  }
                />
              </div>
            </div>

            {draft.from && draft.to && estimatedDays > 0 && (
              <p className="text-xs text-muted-foreground">
                Duration:{" "}
                <span className="font-medium text-foreground">
                  {estimatedDays} working day{estimatedDays !== 1 ? "s" : ""}
                </span>
              </p>
            )}

            {/* Balance hint */}
            {draft.type &&
              (() => {
                const b = balances.find((x) => x.type === draft.type);
                if (!b) return null;
                return (
                  <p className="text-xs text-muted-foreground bg-muted/30 rounded px-3 py-2">
                    {b.label} balance: <strong>{b.daysLeft}</strong> of{" "}
                    {b.daysAllowed} days remaining
                  </p>
                );
              })()}

            <div>
              <Label>
                Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                className="mt-1.5"
                rows={3}
                placeholder="Brief reason for your leave request…"
                value={draft.reason}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, reason: e.target.value }))
                }
              />
            </div>

            <div>
              <Label>Supporting document (optional)</Label>
              <p className="text-xs text-muted-foreground mb-1.5">
                E.g. a medical report for sick leave. PDF, Word, or image, up to
                15MB.
              </p>
              <Input
                type="file"
                accept={ACCEPTED_DOC_TYPES}
                onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
              />
              {pendingFile && (
                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                  <Paperclip className="h-3 w-3" /> {pendingFile.name} (
                  {(pendingFile.size / (1024 * 1024)).toFixed(1)} MB)
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-primary to-secondary"
              disabled={!canSubmit}
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
