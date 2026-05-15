import { useEffect, useState } from "react";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { prettyLabel, toneFor } from "@/lib/clients-api";

// ── Sub-components (in the same kyc/ folder) ─────────────────
import { IndividualFormView } from "./IndividualFormView";
import { CorporateFormView } from "./CorporateFormView";
import { DocumentsView } from "./DocumentsView";
import { KycActivityView } from "./KycActivityView";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type CheckStatus = "pending" | "running" | "passed" | "flagged" | "failed";

interface VerificationCheck {
  id: string;
  name: string;
  description: string;
  icon: typeof ShieldCheck;
  status: CheckStatus;
  result?: string;
  detail?: string;
}

const initialChecks: VerificationCheck[] = [
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
};

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

export default function OnboardingDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [checks, setChecks] = useState<VerificationCheck[]>(initialChecks);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestNote, setRequestNote] = useState("");
  const [requesting, setRequesting] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────
  const {
    data: client,
    isLoading: loading,
    error: clientError,
  } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const res = await api.get(`/tenant/my-clients/${id}`);
      return res.data.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const error = clientError
    ? ((clientError as any)?.response?.data?.message ??
      "Failed to load client.")
    : null;

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

  const kycStatus = client.profile?.kycStatus ?? "not_started";
  const riskLevel = (client.profile?.riskLevel ?? "unrated").toLowerCase();
  const isSubmitted = kycStatus === "submitted";

  const riskTone =
    riskLevel === "high"
      ? "text-destructive"
      : riskLevel === "medium"
        ? "text-warning"
        : riskLevel === "low"
          ? "text-success"
          : "text-muted-foreground";

  // Everything the form is about
  const onboarding = client.onboarding ?? {};
  const formData = onboarding.formData ?? {};
  const documents = onboarding.documents ?? [];
  const auditTrail = client.profile?.metadata?.auditTrail ?? [];
  const infoRequests = client.profile?.metadata?.infoRequests ?? [];

  const completion = onboarding.completionPercent ?? 0;

  // ── Verifications (simulated — wire to Ballerine when ready) ──
  const simulateCheck = (check: VerificationCheck): VerificationCheck => {
    const isHigh = riskLevel === "high";
    const isMedium = riskLevel === "medium";
    switch (check.id) {
      case "identity":
        return {
          ...check,
          status: "passed",
          result: "Verified",
          detail: "Document authenticity confirmed",
        };
      case "pep":
        return isHigh
          ? {
              ...check,
              status: "flagged",
              result: "Match found",
              detail: "Possible match — manual review required",
            }
          : {
              ...check,
              status: "passed",
              result: "No matches",
              detail: "No PEP database hits",
            };
      case "sanctions":
        return {
          ...check,
          status: "passed",
          result: "Clear",
          detail: "No matches across OFAC, UN, EU lists",
        };
      case "ubo":
        return !isIndividual
          ? {
              ...check,
              status: isHigh ? "flagged" : "passed",
              result: isHigh ? "Complex structure" : "Identified",
              detail: isHigh
                ? "Multi-layer ownership detected"
                : "All UBOs identified",
            }
          : {
              ...check,
              status: "passed",
              result: "N/A",
              detail: "Not applicable for individual clients",
            };
      case "adverseMedia":
        return isHigh
          ? {
              ...check,
              status: "flagged",
              result: "2 negative articles",
              detail: "Adverse coverage found in last 24 months",
            }
          : {
              ...check,
              status: "passed",
              result: "Clear",
              detail: "No adverse media found",
            };
      case "riskScore": {
        const score = isHigh ? 78 : isMedium ? 52 : 24;
        const label = isHigh ? "High" : isMedium ? "Medium" : "Low";
        return {
          ...check,
          status: isHigh ? "flagged" : "passed",
          result: `${label} (${score}/100)`,
          detail: "Composite weighted across all checks",
        };
      }
      default:
        return check;
    }
  };

  const runAllVerifications = async () => {
    setRunning(true);
    setCompleted(false);
    setChecks(initialChecks);
    for (let i = 0; i < initialChecks.length; i++) {
      setChecks((prev) =>
        prev.map((c, idx) => (idx === i ? { ...c, status: "running" } : c)),
      );
      await new Promise((r) => setTimeout(r, 700));
      setChecks((prev) =>
        prev.map((c, idx) => (idx === i ? simulateCheck(c) : c)),
      );
    }
    setRunning(false);
    setCompleted(true);
    toast({
      title: "Verifications complete",
      description: "Review results before approving.",
    });
  };

  const passedCount = checks.filter((c) => c.status === "passed").length;
  const flaggedCount = checks.filter(
    (c) => c.status === "flagged" || c.status === "failed",
  ).length;
  const progressPct =
    (checks.filter((c) => c.status !== "pending" && c.status !== "running")
      .length /
      checks.length) *
    100;

  // ── Actions ───────────────────────────────────────────────
  const handleApprove = async () => {
    setApproving(true);
    try {
      await api.post(`/tenant/${id}/approve`);
      toast({ title: "Client approved", description: "Client is now active." });
      queryClient.invalidateQueries({ queryKey: ["client", id] });
    } catch (err: any) {
      toast({
        title: "Approval failed",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      await api.post(`/tenant/${id}/reject`, {
        reason: "Rejected after compliance review",
      });
      toast({ title: "Client rejected", variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: ["client", id] });
    } catch (err: any) {
      toast({
        title: "Rejection failed",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRejecting(false);
    }
  };

  const handleRequestInfo = async () => {
    if (!requestNote.trim()) return;
    setRequesting(true);
    try {
      await api.post(`/tenant/${id}/request-info`, { message: requestNote });
      toast({
        title: "Request sent",
        description: `${client.fullName} has been notified.`,
      });
      setRequestOpen(false);
      setRequestNote("");
    } catch (err: any) {
      toast({
        title: "Failed to send",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRequesting(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  return (
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
        <div className="flex gap-2 flex-wrap">
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
                <Button variant="outline" onClick={() => setRequestOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleRequestInfo}
                  disabled={requesting || !requestNote.trim()}
                >
                  {requesting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Send Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Approve + Reject — only when submitted */}
          {isSubmitted && (
            <>
              <Button
                size="sm"
                className="bg-success text-white hover:bg-success/90"
                onClick={handleApprove}
                disabled={approving || rejecting}
              >
                {approving ? (
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
                onClick={handleReject}
                disabled={approving || rejecting}
              >
                {rejecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

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
      <Tabs defaultValue="formData">
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
          <TabsTrigger value="verifications">Verifications</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* ── Form Data — individual vs corporate ── */}
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
                  disabled={running}
                  className="bg-gradient-to-r from-primary to-secondary"
                >
                  {running ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running…
                    </>
                  ) : completed ? (
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
              {/* Progress summary */}
              {(running || completed) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      {Math.round(progressPct)}%
                    </span>
                  </div>
                  <Progress value={progressPct} className="h-2" />
                  {completed && (
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
                {checks.map((check) => {
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
                            <span className="font-medium">{check.result}</span>
                            {check.detail ? ` — ${check.detail}` : ""}
                          </p>
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
  );
}
