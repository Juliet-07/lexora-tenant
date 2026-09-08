import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  FileEdit,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface KycUpdateRequest {
  _id: string;
  status: "requested" | "submitted" | "approved" | "rejected";
  message: string;
  requestedSections: string[];
  requestedAt: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

const statusMeta: Record<
  string,
  { label: string; className: string; icon: JSX.Element }
> = {
  requested: {
    label: "Awaiting Client",
    className: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  submitted: {
    label: "Ready for Review",
    className: "bg-amber-100 text-amber-700 border-amber-200",
    icon: <FileEdit className="h-3.5 w-3.5" />,
  },
  approved: {
    label: "Approved",
    className: "bg-green-100 text-green-700 border-green-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-700 border-red-200",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

export function KycUpdatesSection({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [message, setMessage] = useState(
    "As part of our periodic compliance review, please confirm your details are still up to date and update anything that's changed.",
  );

  // Tenant-wide list, filtered to this client — request volume per
  // tenant is low (periodic, not frequent), so this stays simple
  // rather than adding a dedicated per-client backend query.
  const { data: allRequests = [], isLoading } = useQuery({
    queryKey: ["kyc-update-requests"],
    queryFn: async (): Promise<KycUpdateRequest[]> => {
      const res = await api.get("/tenant/kyc-update-requests");
      const d = res.data?.data ?? res.data;
      return Array.isArray(d) ? d : [];
    },
    staleTime: 30_000,
  });

  const requests = allRequests.filter(
    (r: any) => (r.clientId?._id ?? r.clientId) === clientId,
  );
  const openRequest = requests.find(
    (r) => r.status === "requested" || r.status === "submitted",
  );

  const requestMutation = useMutation({
    mutationFn: () => api.post(`/tenant/${clientId}/kyc-update`, { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyc-update-requests"] });
      setDialogOpen(false);
      toast({
        title: "KYC update requested",
        description: "The client has been emailed with instructions.",
      });
    },
    onError: (err: any) =>
      toast({
        title: "Could not request update",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      api.patch(`/tenant/kyc-update-requests/${id}/review`, {
        approve,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kyc-update-requests"] });
      toast({
        title: variables.approve
          ? "Update approved and merged into KYC record"
          : "Update rejected",
      });
    },
    onError: (err: any) =>
      toast({
        title: "Could not review update",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Periodic KYC Updates</CardTitle>
        {!openRequest && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDialogOpen(true)}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Request Update
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No KYC update requests yet. Request one periodically (e.g. annually)
            to keep this client's details current.
          </p>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => {
              const meta = statusMeta[r.status];
              return (
                <div
                  key={r._id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div>
                    <p className="text-sm font-medium">
                      Requested {new Date(r.requestedAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-md">
                      {r.message}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`border ${meta.className}`}>
                      <span className="flex items-center gap-1">
                        {meta.icon} {meta.label}
                      </span>
                    </Badge>
                    {r.status === "submitted" && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={reviewMutation.isPending}
                          onClick={() =>
                            reviewMutation.mutate({ id: r._id, approve: true })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={reviewMutation.isPending}
                          onClick={() =>
                            reviewMutation.mutate({
                              id: r._id,
                              approve: false,
                            })
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request KYC Update</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              The client will be emailed with a link to review and update their
              details. Their account remains fully active throughout.
            </p>
            <Textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message to the client..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-primary to-secondary"
              disabled={!message.trim() || requestMutation.isPending}
              onClick={() => requestMutation.mutate()}
            >
              {requestMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Send Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
