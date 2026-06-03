import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Gauge,
  User as UserIcon,
  Building2,
  Calendar,
  Percent,
  Users,
  Newspaper,
  Globe2,
  PlayCircle,
  RefreshCw,
  Lock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { prettyLabel, toneFor } from "@/lib/clients-api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { IndividualFormView } from "./IndividualFormView";
import { CorporateFormView } from "./CorporateFormView";
import { DocumentsView } from "./DocumentsView";
import { KycActivityView } from "./KycActivityView";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type CheckStatus =
  | "pending"
  | "running"
  | "passed"
  | "flagged"
  | "failed"
  | "skipped";

interface VerificationCheck {
  id: string;
  name: string;
  description: string;
  icon: typeof ShieldCheck;
  status: CheckStatus;
  result?: string;
  detail?: string;
  matches?: any[];
}

const CHECK_DEFS: VerificationCheck[] = [
  {
    id: "identity",
    name: "Identity Verification (CDD)",
    description: "Document authenticity & biometric match",
    icon: ShieldCheck,
    status: "pending",
  },
  {
    id: "pep",
    name: "PEP Screening",
    description: "Politically Exposed Persons database",
    icon: Users,
    status: "pending",
  },
  {
    id: "sanctions",
    name: "Sanctions Check",
    description: "OFAC, UN, EU & global sanctions lists",
    icon: Globe2,
    status: "pending",
  },
  {
    id: "ubo",
    name: "UBO Identification",
    description: "Ultimate Beneficial Owner verification",
    icon: Users,
    status: "pending",
  },
  {
    id: "adverseMedia",
    name: "Adverse Media Screening",
    description: "Negative news & reputational risk",
    icon: Newspaper,
    status: "pending",
  },
  {
    id: "riskScore",
    name: "Risk Scoring",
    description: "Composite AML risk assessment",
    icon: Gauge,
    status: "pending",
  },
];

const statusStyle: Record<CheckStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-blue-500/10 text-blue-600",
  passed: "bg-success/10 text-success",
  flagged: "bg-warning/10 text-warning",
  failed: "bg-destructive/10 text-destructive",
  skipped: "bg-muted text-muted-foreground",
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Maps backend result keys → frontend check list */
function resultsToChecks(
  results: Record<string, any>,
  baseChecks: VerificationCheck[],
): VerificationCheck[] {
  return baseChecks.map((check) => {
    const r = results[check.id];
    if (!r) return check;
    return {
      ...check,
      status: r.status as CheckStatus,
      result: r.result,
      detail: r.detail,
      matches: r.matches ?? [],
    };
  });
}

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

export default function OnboardingDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [checks, setChecks] = useState<VerificationCheck[]>(CHECK_DEFS);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestNote, setRequestNote] = useState("");
  const [activeTab, setActiveTab] = useState("formData");

  // ── Fetch client ──────────────────────────────────────────
  const {
    data: client,
    isLoading: loading,
    error: clientError,
  } = useQuery({
    queryKey: ["client-detail", id],
    queryFn: async () => {
      const res = await api.get(`/tenant/my-clients/${id}`);
      return res.data.data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });

  const error = clientError
    ? ((clientError as any)?.response?.data?.message ??
      "Failed to load client.")
    : null;

  // ── Mutations ─────────────────────────────────────────────
  const invalidateClient = () => {
    queryClient.invalidateQueries({ queryKey: ["client-detail", id] });
    queryClient.invalidateQueries({
      queryKey: ["tenant-onboarding-in-progress"],
    });
    queryClient.invalidateQueries({ queryKey: ["tenant-pending-approvals"] });
  };

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/tenant/${id}/approve`),
    onSuccess: () => {
      toast({ title: "Client approved", description: "Client is now active." });
      invalidateClient();
    },
    onError: (err: any) =>
      toast({
        title: "Approval failed",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      }),
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      api.post(`/tenant/${id}/reject`, {
        reason: "Rejected after compliance review",
      }),
    onSuccess: () => {
      toast({ title: "Client rejected", variant: "destructive" });
      invalidateClient();
    },
    onError: (err: any) =>
      toast({
        title: "Rejection failed",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      }),
  });

  const requestInfoMutation = useMutation({
    mutationFn: () =>
      api.post(`/tenant/${id}/request-info`, { message: requestNote }),
    onSuccess: () => {
      toast({
        title: "Request sent",
        description: `${client?.fullName} has been notified.`,
      });
      setRequestOpen(false);
      setRequestNote("");
      invalidateClient();
    },
    onError: (err: any) =>
      toast({
        title: "Failed to send",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      }),
  });

  // ── Run verifications — calls real API ────────────────────
  const runAllVerifications = async () => {
    setRunning(true);
    setCompleted(false);

    // Show all checks as "running" immediately for UX feedback
    setChecks(
      CHECK_DEFS.map((c) => ({ ...c, status: "running" as CheckStatus })),
    );

    try {
      const res = await api.post(`/tenant/${id}/verify`);
      const results: Record<string, any> = res.data?.results ?? {};

      // Map backend results onto the check list
      setChecks(resultsToChecks(results, CHECK_DEFS));
      setCompleted(true);

      // Refresh client so verificationCompletedAt + riskLevel update immediately
      queryClient.invalidateQueries({ queryKey: ["client-detail", id] });

      toast({
        title: "Verifications complete",
        description: "Review results before approving.",
      });
    } catch (err: any) {
      // Mark all as failed
      setChecks(
        CHECK_DEFS.map((c) => ({
          ...c,
          status: "failed" as CheckStatus,
          result: "Error",
          detail:
            err?.response?.data?.message ??
            "Could not connect to verification service.",
        })),
      );
      toast({
        title: "Verification failed",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  // ── Loading / Error ───────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="text-center py-12 space-y-3">
        <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {error ?? "Client not found"}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/clients/onboarding">Back to Onboarding</Link>
        </Button>
      </div>
    );
  }

  // ── Derived values ────────────────────────────────────────
  const classification = client.clientProfile?.classifications ?? "individual";
  const isIndividual = classification === "individual";
  const Icon = isIndividual ? UserIcon : Building2;

  const kycStatus =
    client.profile?.kycStatus ??
    client.clientProfile?.kycStatus ??
    "not_started";
  const riskLevel = (client.profile?.riskLevel ?? "unrated").toLowerCase();
  const isSubmitted = kycStatus === "submitted";

  // ── Gate: approve/reject only allowed after verification ──
  const verificationDone = !!client.profile?.verificationCompletedAt;
  const canApproveReject = isSubmitted && verificationDone;
  const lockReason = !isSubmitted
    ? "Client must submit onboarding first"
    : "Run all verifications before approving or rejecting";

  const riskTone =
    riskLevel === "high"
      ? "text-destructive"
      : riskLevel === "medium"
        ? "text-warning"
        : riskLevel === "low"
          ? "text-success"
          : "text-muted-foreground";

  const onboarding = client.onboarding ?? {};
  const formData = onboarding.formData ?? {};
  const documents = onboarding.documents ?? [];
  const auditTrail = client.profile?.metadata?.auditTrail ?? [];
  const infoRequests = client.profile?.metadata?.infoRequests ?? [];
  const completion = onboarding.completionPercent ?? 0;

  // If client already has saved verification results, restore them
  const savedResults = client.profile?.verificationResults;
  const displayChecks =
    verificationDone && savedResults && !completed
      ? resultsToChecks(savedResults, CHECK_DEFS)
      : checks;

  const passedCount = displayChecks.filter((c) => c.status === "passed").length;
  const flaggedCount = displayChecks.filter(
    (c) => c.status === "flagged" || c.status === "failed",
  ).length;
  const progressPct =
    verificationDone || completed
      ? 100
      : (displayChecks.filter(
          (c) => c.status !== "pending" && c.status !== "running",
        ).length /
          displayChecks.length) *
        100;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex items-start gap-3 flex-wrap">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/clients/onboarding">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center text-primary shrink-0">
            <Icon className="h-6 w-6" />
          </div>

          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{client.fullName}</h1>
              <Badge className={`border ${toneFor(client.status)}`}>
                {prettyLabel(client.status)}
              </Badge>
              <Badge className={`border ${toneFor(kycStatus)}`}>
                KYC: {prettyLabel(kycStatus)}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {prettyLabel(classification)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {client.email} · Added{" "}
              {new Date(client.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap items-center">
            {/* Request Info */}
            <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <MessageSquare className="h-4 w-4 mr-2" /> Request Info
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request More Information</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Send a note to <strong>{client.fullName}</strong> outlining
                    what's missing.
                  </p>
                  <Textarea
                    rows={5}
                    placeholder="e.g. Please upload a clearer copy of your proof of address dated within the last 3 months."
                    value={requestNote}
                    onChange={(e) => setRequestNote(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setRequestOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => requestInfoMutation.mutate()}
                    disabled={
                      requestInfoMutation.isPending || !requestNote.trim()
                    }
                  >
                    {requestInfoMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Send Request
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Approve — greyed out until verification done */}
            {isSubmitted && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      className="bg-success text-white hover:bg-success/90"
                      onClick={() => approveMutation.mutate()}
                      disabled={
                        !canApproveReject ||
                        approveMutation.isPending ||
                        rejectMutation.isPending
                      }
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : !canApproveReject ? (
                        <>
                          <Lock className="h-4 w-4 mr-1" /> Approve
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                        </>
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canApproveReject && (
                  <TooltipContent>
                    <p>{lockReason}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            )}

            {/* Reject — greyed out until verification done */}
            {isSubmitted && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => rejectMutation.mutate()}
                      disabled={
                        !canApproveReject ||
                        approveMutation.isPending ||
                        rejectMutation.isPending
                      }
                    >
                      {rejectMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : !canApproveReject ? (
                        <>
                          <Lock className="h-4 w-4 mr-1" /> Reject
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </>
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canApproveReject && (
                  <TooltipContent>
                    <p>{lockReason}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            )}
          </div>
        </div>

        {/* Verification required banner — shown when submitted but not yet verified */}
        {isSubmitted && !verificationDone && (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-warning/40 bg-warning/5">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            <div className="flex-1 text-sm">
              <span className="font-semibold text-warning">
                Verification required
              </span>
              <span className="text-muted-foreground ml-2">
                Run all AML/KYC checks in the Verifications tab before you can
                approve or reject this client.
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-warning/40 text-warning hover:bg-warning/10 shrink-0"
              // onClick={() => {
              //   const trigger = document.querySelector(
              //     '[data-value="verifications"]',
              //   ) as HTMLElement;
              //   trigger?.click();
              // }}
              onClick={() => setActiveTab("verifications")}
            >
              Go to Verifications
            </Button>
          </div>
        )}

        {/* Verification done banner */}
        {verificationDone && (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-success/30 bg-success/5">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            <p className="text-sm text-success font-medium">
              Verifications completed on{" "}
              {new Date(
                client.profile.verificationCompletedAt,
              ).toLocaleString()}
              .{isSubmitted && " You may now approve or reject this client."}
            </p>
          </div>
        )}

        {/* ── Quick stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">KYC Status</p>
                <Badge className={`mt-1 border text-xs ${toneFor(kycStatus)}`}>
                  {prettyLabel(kycStatus) || "Not Started"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                <Gauge className={`h-5 w-5 ${riskTone}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Risk Level</p>
                <p
                  className={`text-sm font-semibold capitalize mt-0.5 ${riskTone}`}
                >
                  {prettyLabel(riskLevel) || "Unrated"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                <Percent className="h-5 w-5 text-info" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Form Completion</p>
                <p className="text-sm font-semibold mt-0.5">{completion}%</p>
                <Progress value={completion} className="h-1 mt-1" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {onboarding.submittedAt ? "Submitted" : "Added"}
                </p>
                <p className="text-sm font-semibold mt-0.5">
                  {onboarding.submittedAt
                    ? new Date(onboarding.submittedAt).toLocaleDateString()
                    : new Date(client.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="formData">Form Data</TabsTrigger>
            <TabsTrigger value="documents">
              Documents
              {documents.length > 0 && (
                <span className="ml-1.5 rounded-full bg-primary/10 text-primary text-xs px-1.5">
                  {documents.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="verifications"
              data-value="verifications"
              id="verifications-tab"
            >
              Verifications
              {verificationDone && (
                <span className="ml-1.5 rounded-full bg-success/10 text-success text-xs px-1.5">
                  ✓
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* ── Form Data ── */}
          <TabsContent value="formData" className="mt-4">
            {Object.keys(formData).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ShieldCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No form data submitted yet.
                  </p>
                </CardContent>
              </Card>
            ) : isIndividual ? (
              <IndividualFormView formData={formData} />
            ) : (
              <CorporateFormView formData={formData} />
            )}
          </TabsContent>

          {/* ── Documents ── */}
          <TabsContent value="documents" className="mt-4">
            <DocumentsView documents={documents} />
          </TabsContent>

          {/* ── Verifications ── */}
          <TabsContent value="verifications" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-base">
                      AML / KYC Verifications
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Run regulatory checks before activating this client.
                    </p>
                  </div>
                  <Button
                    onClick={runAllVerifications}
                    disabled={running || !isSubmitted}
                    className="bg-gradient-to-r from-primary to-secondary"
                  >
                    {running ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                        Running…
                      </>
                    ) : verificationDone ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" /> Re-run All
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-4 w-4 mr-2" /> Run All
                        Verifications
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Can't run if not submitted */}
                {!isSubmitted && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4 shrink-0" />
                    Client must submit their onboarding form before
                    verifications can be run.
                  </div>
                )}

                {/* Progress summary */}
                {(running || verificationDone || completed) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        {Math.round(progressPct)}%
                      </span>
                    </div>
                    <Progress value={progressPct} className="h-2" />
                    {(verificationDone || completed) && (
                      <div className="flex gap-4 pt-1 text-xs">
                        <span className="flex items-center gap-1 text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {passedCount}{" "}
                          passed
                        </span>
                        {flaggedCount > 0 && (
                          <span className="flex items-center gap-1 text-warning">
                            <AlertTriangle className="h-3.5 w-3.5" />{" "}
                            {flaggedCount} flagged
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Check list */}
                <div className="space-y-3">
                  {displayChecks.map((check) => {
                    const CIcon = check.icon;
                    return (
                      <div
                        key={check.id}
                        className="flex items-start gap-3 p-4 rounded-lg border bg-card"
                      >
                        <div className="p-2 rounded-md bg-muted shrink-0">
                          <CIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-sm font-medium">{check.name}</p>
                            <Badge
                              className={`text-xs ${statusStyle[check.status]}`}
                            >
                              {check.status === "running" && (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              )}
                              {check.status === "passed" && (
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                              )}
                              {check.status === "flagged" && (
                                <AlertTriangle className="h-3 w-3 mr-1" />
                              )}
                              {check.status === "failed" && (
                                <XCircle className="h-3 w-3 mr-1" />
                              )}
                              {prettyLabel(check.status)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {check.description}
                          </p>
                          {check.result && (
                            <p className="text-xs mt-1.5">
                              <span className="font-medium">
                                {check.result}
                              </span>
                              {check.detail ? ` — ${check.detail}` : ""}
                            </p>
                          )}
                          {/* Show matches if any were flagged */}
                          {check.matches && check.matches.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {check.matches
                                .slice(0, 3)
                                .map((m: any, i: number) => (
                                  <div
                                    key={i}
                                    className="text-xs bg-warning/5 border border-warning/20 rounded px-2 py-1"
                                  >
                                    <span className="font-medium">
                                      {m.caption}
                                    </span>
                                    <span className="text-muted-foreground ml-2">
                                      Score: {Math.round((m.score ?? 0) * 100)}%
                                      · {m.datasets?.join(", ")}
                                    </span>
                                  </div>
                                ))}
                              {check.matches.length > 3 && (
                                <p className="text-xs text-muted-foreground">
                                  +{check.matches.length - 3} more matches
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Activity ── */}
          <TabsContent value="activity" className="mt-4">
            <KycActivityView
              auditTrail={auditTrail}
              infoRequests={infoRequests}
              submittedAt={onboarding.submittedAt}
              lastSavedAt={onboarding.lastSavedAt}
            />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
