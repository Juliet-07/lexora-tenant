import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Eye,
  FileText,
  Plus,
  Send,
  Loader2,
  Clock,
  Building2,
  User as UserIcon,
  RefreshCw,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  ApiClient,
  displayName,
  prettyLabel,
  toneFor,
} from "@/lib/clients-api";
import { api } from "@/lib/api";

// ─────────────────────────────────────────────────────────────
// API FETCHERS
// ─────────────────────────────────────────────────────────────

const fetchPending = async (): Promise<ApiClient[]> => {
  const res = await api.get("/tenant/pending-approvals");
  const d = res.data?.data;
  return Array.isArray(d) ? d : (d?.items ?? []);
};

const fetchInProgress = async (): Promise<ApiClient[]> => {
  const res = await api.get("/tenant/onboarding");
  const d = res.data?.data;
  return Array.isArray(d) ? d : (d?.items ?? []);
};

const fetchEngagementDoc = async () => {
  try {
    const res = await api.get("/tenant/engagement/my-document");
    return res.data?.data ?? res.data ?? null;
  } catch {
    return null;
  }
};

const createClient = async (payload: {
  fullName: string;
  email: string;
  phoneNumber: string;
  clientType: string;
}) => {
  const res = await api.post("/tenant/create-client", payload);
  return res.data;
};

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function ClientOnboarding() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    fullName: "",
    email: "",
    phone: "",
    classification: "individual" as "individual" | "corporate",
  });

  // ── Queries ───────────────────────────────────────────────
  const {
    data: pending = [],
    isLoading: pendingLoading,
    isFetching: pendingFetching,
    refetch: refetchPending,
  } = useQuery({
    queryKey: ["tenant-pending-approvals"],
    queryFn: fetchPending,
    staleTime: 30_000,
  });

  const {
    data: inProgress = [],
    isLoading: inProgressLoading,
    isFetching: inProgressFetching,
    refetch: refetchInProgress,
  } = useQuery({
    queryKey: ["tenant-onboarding-in-progress"],
    queryFn: fetchInProgress,
    staleTime: 30_000,
  });

  const { data: engagementDoc, isLoading: engagementLoading } = useQuery({
    queryKey: ["engagement-document"],
    queryFn: fetchEngagementDoc,
    staleTime: 60_000,
  });

  const loading = pendingLoading || inProgressLoading;
  const refreshing =
    (pendingFetching && !pendingLoading) ||
    (inProgressFetching && !inProgressLoading);

  const handleRefresh = () => {
    refetchPending();
    refetchInProgress();
  };

  const engagementReady =
    engagementDoc?.isActive === true || engagementDoc?.bypassSigning === true;

  const handleAddClientClick = () => {
    if (!engagementReady) {
      // Don't open the dialog — redirect to settings with a toast
      toast({
        title: "Engagement document required",
        description:
          "You must upload an engagement letter or terms & agreement before adding clients.",
        variant: "destructive",
      });
      navigate("/settings?tab=engagement");
      return;
    }
    setDialogOpen(true);
  };

  // ── Create client mutation ────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createClient,
    onSuccess: (data, variables) => {
      const msg =
        data?.message ?? `Onboarding invitation sent to ${variables.email}`;
      toast({
        title: "Client created",
        description: msg,
      });
      setDialogOpen(false);
      setNewClient({
        fullName: "",
        email: "",
        phone: "",
        classification: "individual",
      });
      // Invalidate both lists so they refetch
      queryClient.invalidateQueries({ queryKey: ["tenant-pending-approvals"] });
      queryClient.invalidateQueries({
        queryKey: ["tenant-onboarding-in-progress"],
      });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message ?? "Please try again";

      if (err?.response?.status === 403 && message.includes("engagement")) {
        toast({
          title: "Setup required",
          description: message,
          variant: "destructive",
        });
        setDialogOpen(false);
        navigate("/settings?tab=engagement");
        return;
      }

      toast({
        title: "Could not create client",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!newClient.email || !newClient.fullName) {
      toast({
        title: "Missing fields",
        description: "Full name and email are required.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({
      fullName: newClient.fullName,
      email: newClient.email,
      phoneNumber: newClient.phone,
      clientType: newClient.classification,
    });
  };

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Client Onboarding</h1>
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Loading…"
              : `${pending.length + inProgress.length} total client${pending.length + inProgress.length === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>

          <Button
            className="bg-gradient-to-r from-primary to-secondary"
            onClick={handleAddClientClick}
            disabled={engagementLoading || !engagementReady}
            title={
              !engagementReady
                ? "Upload an engagement document in Settings first"
                : undefined
            }
          >
            {engagementLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add Client
          </Button>

          {/* <Dialog open={dialogOpen} onOpenChange={setDialogOpen}></Dialog> */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            {/* <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-secondary">
                <Plus className="h-4 w-4 mr-2" /> Add Client
              </Button>
            </DialogTrigger> */}
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New Client</DialogTitle>
              </DialogHeader>

              {engagementDoc?.isActive && !engagementDoc?.bypassSigning && (
                <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
                  <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-muted-foreground">
                    Your client will receive your{" "}
                    <span className="font-medium text-foreground">
                      {engagementDoc.documentType === "engagement_letter"
                        ? "engagement letter"
                        : "terms & agreement"}
                    </span>{" "}
                    to sign before they receive their login credentials.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Client Type</Label>
                  <Select
                    value={newClient.classification}
                    onValueChange={(v: "individual" | "corporate") =>
                      setNewClient({ ...newClient, classification: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="corporate">
                        Business / Corporate
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    {newClient.classification === "individual"
                      ? "Full Name"
                      : "Business Name"}
                  </Label>
                  <Input
                    value={newClient.fullName}
                    onChange={(e) =>
                      setNewClient({ ...newClient, fullName: e.target.value })
                    }
                    placeholder={
                      newClient.classification === "individual"
                        ? "Jane Doe"
                        : "Acme Holdings Ltd"
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newClient.email}
                    onChange={(e) =>
                      setNewClient({ ...newClient, email: e.target.value })
                    }
                    placeholder="client@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={newClient.phone}
                    onChange={(e) =>
                      setNewClient({ ...newClient, phone: e.target.value })
                    }
                    placeholder="+1 234 567 8900"
                  />
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-primary to-secondary"
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                      Creating…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" /> Create & Send Onboarding
                      Link
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!engagementLoading && !engagementReady && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">Setup required:</span> Upload
                  your engagement document before you can add clients.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0"
                onClick={() => navigate("/settings?tab=engagement")}
              >
                Go to Settings →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Not Started
            {pending.length > 0 && (
              <span className="ml-2 rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="inProgress">
            Onboarding
            {inProgress.length > 0 && (
              <span className="ml-2 rounded-full bg-warning/10 text-warning text-xs px-2 py-0.5">
                {inProgress.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1 — Not started */}
        <TabsContent value="pending" className="mt-4">
          {pendingLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : pending.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
                <h3 className="text-lg font-semibold">All caught up!</h3>
                <p className="text-sm text-muted-foreground">
                  No clients waiting to start onboarding.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pending.map((client) => (
                <ClientCard key={client._id} client={client} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2 — In progress or submitted */}
        <TabsContent value="inProgress" className="mt-4">
          {inProgressLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : inProgress.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Nothing in progress</h3>
                <p className="text-sm text-muted-foreground">
                  Clients appear here once they start filling their onboarding
                  form.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {inProgress.map((client) => (
                <ClientCard key={client._id} client={client} showProgress />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CLIENT CARD — extracted outside the parent component
// ─────────────────────────────────────────────────────────────

function ClientCard({
  client,
  showProgress = false,
}: {
  client: ApiClient;
  showProgress?: boolean;
}) {
  const isCorporate = client.classifications === "corporate";
  const Icon = isCorporate ? Building2 : UserIcon;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 space-y-3 min-w-[260px]">
            {/* Name + badges */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{displayName(client)}</h3>
              <Badge className={`border ${toneFor(client.status)}`}>
                {prettyLabel(client.status)}
              </Badge>
              {client.kycStatus && (
                <Badge className={`border ${toneFor(client.kycStatus)}`}>
                  KYC: {prettyLabel(client.kycStatus)}
                </Badge>
              )}
              <Badge variant="outline" className="capitalize">
                {prettyLabel(client.classifications)}
              </Badge>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs">
                  Email
                </span>
                {client.email}
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">
                  Phone
                </span>
                {client.phone || "—"}
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">
                  Country
                </span>
                {client.country || "—"}
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">
                  Added
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(client.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Progress bar — inProgress tab only */}
            {/* {showProgress && client.completionPercent !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Form completion</span>
                  <span className="font-medium text-foreground">
                    {client.completionPercent}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${client.completionPercent}%` }}
                  />
                </div>
                {client.submittedAt ? (
                  <p className="text-xs text-success flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Submitted{" "}
                    {new Date(client.submittedAt).toLocaleDateString()}
                  </p>
                ) : client.lastSavedAt ? (
                  <p className="text-xs text-muted-foreground">
                    Last saved{" "}
                    {new Date(client.lastSavedAt).toLocaleDateString()}
                  </p>
                ) : null}
              </div>
            )} */}

            {/* Documents */}
            {client.documents && client.documents.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Documents</p>
                <div className="flex flex-wrap gap-2">
                  {client.documents.map((doc: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 text-sm"
                    >
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{doc.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Actions */}
          <div className="flex flex-col gap-2 shrink-0">
            {showProgress && (
              <Button
                size="sm"
                asChild
                className="bg-gradient-to-r from-primary to-secondary"
              >
                <Link to={`/clients/onboarding/${client._id}`}>
                  <Eye className="h-4 w-4 mr-2" /> View
                </Link>
              </Button>
            )}
            {showProgress && client.kycStatus === "submitted" && (
              <>
                <ApproveRejectButtons clientId={client._id} />
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// APPROVE | REJECT ACTIONS
// ─────────────────────────────────────────────────────────────
function ApproveRejectButtons({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: ["tenant-onboarding-in-progress"],
    });
    queryClient.invalidateQueries({ queryKey: ["tenant-pending-approvals"] });
  };

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/tenant/${clientId}/approve`),
    onSuccess: () => {
      toast({ title: "Client approved", description: "Client is now active." });
      invalidate();
    },
    onError: (err: any) => {
      toast({
        title: "Approval failed",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      api.post(`/tenant/${clientId}/reject`, {
        reason: "Rejected after review",
      }),
    onSuccess: () => {
      toast({ title: "Client rejected", variant: "destructive" });
      invalidate();
    },
    onError: (err: any) => {
      toast({
        title: "Rejection failed",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <Button
        size="sm"
        className="bg-success text-white hover:bg-success/90 w-full"
        onClick={() => approveMutation.mutate()}
        disabled={approveMutation.isPending || rejectMutation.isPending}
      >
        {approveMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
          </>
        )}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        className="w-full"
        onClick={() => rejectMutation.mutate()}
        disabled={approveMutation.isPending || rejectMutation.isPending}
      >
        {rejectMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <XCircle className="h-4 w-4 mr-1" /> Reject
          </>
        )}
      </Button>
    </>
  );
}
