import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileSearch,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Paperclip,
  Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchMyAuditRequests,
  submitMyAuditRequestFiles,
  disputeMyAuditRequest,
  resolveAuditFileUrl,
  type MyAuditRequest,
} from "@/lib/grc/compliance-api";

function StatCard({ label, value, icon: Icon }: any) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

const isOverdue = (r: MyAuditRequest) =>
  (r.status === "Requested" || r.status === "Disputed") &&
  new Date(r.dueDate).getTime() < Date.now();

const STATUS_BADGE: Record<
  MyAuditRequest["status"],
  "default" | "destructive" | "secondary" | "outline"
> = {
  Requested: "outline",
  Submitted: "default",
  Disputed: "destructive",
  Resolved: "secondary",
};

function DisputeDialog({
  request,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  request: MyAuditRequest | null;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  isSubmitting: boolean;
}) {
  const [reason, setReason] = useState("");
  if (!request) return null;
  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dispute this request</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{request.description}</p>
          <div className="space-y-1.5">
            <Label className="text-xs">Reason *</Label>
            <Textarea
              rows={4}
              placeholder="Explain why you can't fulfil this request as asked…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!reason.trim() || isSubmitting}
            onClick={() => onSubmit(reason.trim())}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Submit dispute"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RequestCard({
  r,
  onUpload,
  onDispute,
  uploading,
}: {
  r: MyAuditRequest;
  onUpload: (files: File[]) => void;
  onDispute: () => void;
  uploading: boolean;
}) {
  const canAct = r.status === "Requested" || r.status === "Disputed";
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold">{r.description}</p>
            <p className="text-xs text-muted-foreground">
              {r.auditName} · {r.auditType} audit · Folder:{" "}
              {r.folder || "General"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={STATUS_BADGE[r.status]}>{r.status}</Badge>
            <span
              className={`text-[11px] ${isOverdue(r) ? "text-destructive" : "text-muted-foreground"}`}
            >
              Due {new Date(r.dueDate).toLocaleDateString()}
              {isOverdue(r) && " (overdue)"}
            </span>
          </div>
        </div>

        {r.status === "Disputed" && r.disputeReason && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs">
            <b>Your dispute:</b> {r.disputeReason}
          </div>
        )}
        {r.status === "Resolved" && (
          <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-xs">
            Marked resolved{r.resolvedBy ? ` by ${r.resolvedBy}` : ""}
            {r.resolutionNote ? ` — ${r.resolutionNote}` : ""}
          </div>
        )}

        {r.files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {r.files.map((f, i) => (
              <a
                key={i}
                href={resolveAuditFileUrl(f.fileUrl)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs bg-muted/40 hover:bg-muted rounded px-2 py-1"
              >
                <Paperclip className="h-3 w-3" />
                {f.name}
              </a>
            ))}
          </div>
        )}

        {canAct && (
          <div className="flex items-center gap-2 pt-1">
            <label className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs cursor-pointer hover:bg-muted">
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Paperclip className="h-3.5 w-3.5" />
              )}
              Upload files
              <input
                type="file"
                className="hidden"
                multiple
                disabled={uploading}
                onChange={(e) => {
                  if (e.target.files?.length)
                    onUpload(Array.from(e.target.files));
                  e.target.value = "";
                }}
              />
            </label>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={onDispute}
            >
              Dispute
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MyAuditRequests() {
  const queryClient = useQueryClient();
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["my-audit-requests"],
    queryFn: fetchMyAuditRequests,
  });
  const [disputing, setDisputing] = useState<MyAuditRequest | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: ({ id, files }: { id: string; files: File[] }) =>
      submitMyAuditRequestFiles(id, files),
    onMutate: ({ id }) => setUploadingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-audit-requests"] });
      toast({ title: "Files uploaded" });
    },
    onError: (err: any) =>
      toast({
        title: "Upload failed",
        description: err?.response?.data?.message ?? err.message,
        variant: "destructive",
      }),
    onSettled: () => setUploadingId(null),
  });

  const disputeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      disputeMyAuditRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-audit-requests"] });
      setDisputing(null);
      toast({ title: "Dispute submitted" });
    },
    onError: (err: any) =>
      toast({
        title: "Could not submit dispute",
        description: err?.response?.data?.message ?? err.message,
        variant: "destructive",
      }),
  });

  const pending = useMemo(
    () =>
      requests.filter(
        (r) => r.status === "Requested" || r.status === "Disputed",
      ),
    [requests],
  );
  const submitted = requests.filter((r) => r.status === "Submitted");
  const resolved = requests.filter((r) => r.status === "Resolved");
  const overdueCount = pending.filter(isOverdue).length;

  if (isLoading) {
    return (
      <div className="flex justify-center py-24 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading document requests…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSearch className="h-6 w-6" />
          Audit Requests
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Documents requested of you as part of an audit engagement — upload
          what's asked, or dispute a request if it doesn't apply to you.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Pending" value={pending.length} icon={Clock} />
        <StatCard label="Overdue" value={overdueCount} icon={AlertTriangle} />
        <StatCard label="Submitted" value={submitted.length} icon={Paperclip} />
        <StatCard
          label="Resolved"
          value={resolved.length}
          icon={CheckCircle2}
        />
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            You have no audit document requests right now.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <RequestCard
              key={r._id}
              r={r}
              uploading={uploadingId === r._id}
              onUpload={(files) => uploadMutation.mutate({ id: r._id, files })}
              onDispute={() => setDisputing(r)}
            />
          ))}
        </div>
      )}

      <DisputeDialog
        request={disputing}
        onClose={() => setDisputing(null)}
        isSubmitting={disputeMutation.isPending}
        onSubmit={(reason) =>
          disputing && disputeMutation.mutate({ id: disputing._id, reason })
        }
      />
    </div>
  );
}
