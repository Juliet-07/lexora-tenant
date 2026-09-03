import { useState } from "react";
import { Link } from "react-router-dom";
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
  Loader2,
  Clock,
  Building2,
  User as UserIcon,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  ApiClient,
  displayName,
  prettyLabel,
  toneFor,
} from "@/lib/client/clients-api";
import { api } from "@/lib/api";
import AddClientWizard from "@/components/kyc/AddClientWizard";
import OnboardingContractingTab from "./OnboardingContractingTab";

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

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function ClientOnboarding() {
  const [wizardOpen, setWizardOpen] = useState(false);

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

  const loading = pendingLoading || inProgressLoading;
  const refreshing =
    (pendingFetching && !pendingLoading) ||
    (inProgressFetching && !inProgressLoading);

  const handleRefresh = () => {
    refetchPending();
    refetchInProgress();
  };

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-primary/10 via-secondary/5 to-background p-6 sm:p-8">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-primary/15 to-secondary/15 blur-2xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Client Onboarding
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {loading
                ? "Loading…"
                : `${pending.length + inProgress.length} total client${pending.length + inProgress.length === 1 ? "" : "s"} across the onboarding pipeline`}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="bg-background/60 backdrop-blur"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </Button>

            <Button
              className="bg-gradient-to-r from-primary to-secondary text-white shadow-md shadow-primary/25"
              onClick={() => setWizardOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>

            <AddClientWizard
              open={wizardOpen}
              onClose={() => setWizardOpen(false)}
              onDone={handleRefresh}
            />
          </div>
        </div>

        {/* Pipeline stats */}
        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          {[
            {
              label: "Not Started",
              value: pending.length,
              hint: "Awaiting first action",
              icon: Clock,
              accent: "text-primary bg-primary/10",
            },
            {
              label: "Onboarding",
              value: inProgress.length,
              hint: "Forms in progress or submitted",
              icon: Loader2,
              accent: "text-warning bg-warning/10",
            },
            {
              label: "Contracting",
              value: "—",
              hint: "See the Contracting tab",
              icon: FileText,
              accent: "text-secondary bg-secondary/10",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-3 rounded-xl border bg-background/70 backdrop-blur px-4 py-3"
            >
              <div className={`p-2.5 rounded-lg ${s.accent}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold leading-none">{s.value}</p>
                <p className="text-xs font-medium mt-1">{s.label}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {s.hint}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending">
        <TabsList className="bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="pending" className="rounded-lg">
            Not Started
            {pending.length > 0 && (
              <span className="ml-2 rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="inProgress" className="rounded-lg">
            Onboarding
            {inProgress.length > 0 && (
              <span className="ml-2 rounded-full bg-warning/10 text-warning text-xs px-2 py-0.5">
                {inProgress.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="contracting" className="rounded-lg">
            Contracting
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

        {/* Tab 3 — Contracting */}
        <TabsContent value="contracting" className="mt-4">
          <OnboardingContractingTab />
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
    <Card className="group hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 transition-all duration-200 overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-primary/60 via-secondary/60 to-transparent" />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 space-y-3 min-w-[260px]">
            {/* Name + badges */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-secondary p-[1.5px] shadow-sm">
                <div className="h-full w-full rounded-[10px] bg-background flex items-center justify-center text-primary">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                {displayName(client)}
              </h3>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm rounded-xl bg-muted/40 border border-muted p-4">
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
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-sm"
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
