import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  FileText,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  PlayCircle,
  RefreshCw,
  Users,
  Newspaper,
  Gauge,
  Globe2,
  Clock,
  User as UserIcon,
  Building2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  ApiClient,
  fetchClientById,
  displayName,
  prettyLabel,
  toneFor,
} from "@/lib/clients-api";

type CheckId =
  | "identity"
  | "pep"
  | "sanctions"
  | "ubo"
  | "adverseMedia"
  | "riskScore";
type CheckStatus = "pending" | "running" | "passed" | "flagged" | "failed";

interface VerificationCheck {
  id: CheckId;
  name: string;
  description: string;
  icon: typeof ShieldCheck;
  status: CheckStatus;
  result?: string;
  detail?: string;
}

const initialChecks: VerificationCheck[] = [
  { id: "identity", name: "Identity Verification (CDD)", description: "Document authenticity & biometric match", icon: ShieldCheck, status: "pending" },
  { id: "pep", name: "PEP Screening", description: "Politically Exposed Persons database", icon: Users, status: "pending" },
  { id: "sanctions", name: "Sanctions Check", description: "OFAC, UN, EU & global sanctions lists", icon: Globe2, status: "pending" },
  { id: "ubo", name: "UBO Identification", description: "Ultimate Beneficial Owner verification", icon: Users, status: "pending" },
  { id: "adverseMedia", name: "Adverse Media Screening", description: "Negative news & reputational risk", icon: Newspaper, status: "pending" },
  { id: "riskScore", name: "Risk Scoring", description: "Composite AML risk assessment", icon: Gauge, status: "pending" },
];

const statusBadge: Record<CheckStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-info/10 text-info",
  passed: "bg-success/10 text-success",
  flagged: "bg-warning/10 text-warning",
  failed: "bg-destructive/10 text-destructive",
};

// Approximate stage progression for the onboarding pipeline
const STAGES = [
  { key: "invited", label: "Invited" },
  { key: "in_progress", label: "Information Submitted" },
  { key: "submitted", label: "Documents Uploaded" },
  { key: "pending", label: "Pending Review" },
  { key: "approved", label: "Approved" },
];

export default function OnboardingDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [client, setClient] = useState<ApiClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checks, setChecks] = useState<VerificationCheck[]>(initialChecks);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestNote, setRequestNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    fetchClientById(id)
      .then((c) => active && setClient(c))
      .catch((err) => active && setError(err?.response?.data?.message ?? "Failed to load client."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="text-center py-12 space-y-3">
        <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{error ?? "Client not found"}</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/clients/onboarding">Back to Onboarding</Link>
        </Button>
      </div>
    );
  }

  const isCorporate = (client.classifications ?? "").toLowerCase() === "corporate";
  const Icon = isCorporate ? Building2 : UserIcon;
  const status = (client.status ?? "").toLowerCase();
  const riskLevel = (client.riskLevel ?? "low").toLowerCase();

  const stageIdx = Math.max(
    0,
    STAGES.findIndex((s) => s.key === status),
  );
  const stagePct = ((stageIdx + 1) / STAGES.length) * 100;

  const simulateCheck = (check: VerificationCheck): VerificationCheck => {
    const isHigh = riskLevel === "high";
    const isMedium = riskLevel === "medium";
    switch (check.id) {
      case "identity":
        return { ...check, status: "passed", result: "Verified", detail: "Document authenticity confirmed" };
      case "pep":
        return isHigh
          ? { ...check, status: "flagged", result: "Match found", detail: "Possible match with PEP — manual review required" }
          : { ...check, status: "passed", result: "No matches", detail: "No PEP database hits" };
      case "sanctions":
        return { ...check, status: "passed", result: "Clear", detail: "No matches across OFAC, UN, EU lists" };
      case "ubo":
        return isCorporate
          ? {
              ...check,
              status: isHigh ? "flagged" : "passed",
              result: isHigh ? "Complex structure" : "Identified",
              detail: isHigh
                ? "Multi-layer ownership; UBO chain >3 levels"
                : "All UBOs (>25%) identified and verified",
            }
          : { ...check, status: "passed", result: "N/A", detail: "Not applicable for Individual clients" };
      case "adverseMedia":
        return isHigh
          ? { ...check, status: "flagged", result: "2 negative articles", detail: "Adverse coverage from credible sources in last 24 months" }
          : { ...check, status: "passed", result: "Clear", detail: "No adverse media found" };
      case "riskScore": {
        const score = isHigh ? 78 : isMedium ? 52 : 24;
        const level = isHigh ? "High" : isMedium ? "Medium" : "Low";
        return {
          ...check,
          status: isHigh ? "flagged" : "passed",
          result: `${level} (${score}/100)`,
          detail: "Composite weighted across all checks",
        };
      }
    }
  };

  const runAllVerifications = async () => {
    setRunning(true);
    setCompleted(false);
    setChecks(initialChecks);
    for (let i = 0; i < initialChecks.length; i++) {
      setChecks((prev) => prev.map((c, idx) => (idx === i ? { ...c, status: "running" } : c)));
      await new Promise((r) => setTimeout(r, 700));
      setChecks((prev) => prev.map((c, idx) => (idx === i ? simulateCheck(c) : c)));
    }
    setRunning(false);
    setCompleted(true);
    toast({ title: "Verifications complete", description: "Review results before approving." });
  };

  const handleApprove = () => {
    if (!completed) {
      toast({
        title: "Run verifications first",
        description: "Complete AML/KYC checks before approving.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Client Approved", description: `${displayName(client)} is now Active.` });
  };

  const handleReject = () => {
    toast({
      title: "Client Rejected",
      description: `${displayName(client)} has been rejected.`,
      variant: "destructive",
    });
  };

  const handleRequestInfo = async () => {
    if (!requestNote.trim()) return;
    setSubmittingNote(true);
    // TODO: wire to backend endpoint
    await new Promise((r) => setTimeout(r, 600));
    setSubmittingNote(false);
    setRequestOpen(false);
    setRequestNote("");
    toast({
      title: "Request sent",
      description: `${displayName(client)} has been notified.`,
    });
  };

  const flaggedCount = checks.filter((c) => c.status === "flagged" || c.status === "failed").length;
  const passedCount = checks.filter((c) => c.status === "passed").length;
  const progressPct =
    (checks.filter((c) => c.status !== "pending" && c.status !== "running").length / checks.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
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
            <h1 className="text-2xl font-bold">{displayName(client)}</h1>
            <Badge className={`border ${toneFor(client.status)}`}>{prettyLabel(client.status)}</Badge>
            <Badge variant="outline" className="capitalize">
              {prettyLabel(client.classifications)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {client.email} · Onboarding in progress
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" /> Request More Info
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request More Information</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Send a note to <strong>{displayName(client)}</strong> outlining what's missing.
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
                <Button onClick={handleRequestInfo} disabled={submittingNote || !requestNote.trim()}>
                  {submittingNote && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Send Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button className="bg-success text-white hover:bg-success/90" onClick={handleApprove}>
            <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
          </Button>
          <Button variant="destructive" onClick={handleReject}>
            <XCircle className="h-4 w-4 mr-2" /> Reject
          </Button>
        </div>
      </div>

      {/* Progress pipeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Onboarding Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={stagePct} className="h-2" />
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {STAGES.map((s, i) => {
              const reached = i <= stageIdx;
              return (
                <div
                  key={s.key}
                  className={`p-2 rounded-md text-center text-xs border ${
                    reached
                      ? "bg-primary/10 border-primary/20 text-primary font-medium"
                      : "bg-muted/30 text-muted-foreground"
                  }`}
                >
                  <div className="text-[10px] mb-0.5">Step {i + 1}</div>
                  {s.label}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Submitted info & docs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submitted Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Name" value={displayName(client)} />
            <Row label="Email" value={client.email} />
            <Row label="Phone" value={client.phone || "—"} />
            <Row label="Country" value={client.country || "—"} />
            <Row label="Type" value={prettyLabel(client.classifications)} />
            <Row label="Submitted" value={new Date(client.createdAt).toLocaleString()} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submitted Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {client.documents && client.documents.length > 0 ? (
              <div className="space-y-2">
                {client.documents.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{doc.name}</span>
                    </div>
                    {doc.status && (
                      <Badge variant="outline" className="text-xs">
                        {doc.status}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No documents submitted yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Verifications */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-base">AML / KYC Verifications</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Run regulatory checks (CDD/EDD, UBO, sanctions, PEP, adverse media, risk scoring) before activating this client.
              </p>
            </div>
            <Button
              onClick={runAllVerifications}
              disabled={running}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              {running ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running…</>
              ) : completed ? (
                <><RefreshCw className="h-4 w-4 mr-2" /> Re-run All</>
              ) : (
                <><PlayCircle className="h-4 w-4 mr-2" /> Run All Verifications</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(running || completed) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(progressPct)}%</span>
              </div>
              <Progress value={progressPct} className="h-2" />
              {completed && (
                <div className="flex gap-3 pt-2 text-xs">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" /> {passedCount} passed
                  </span>
                  {flaggedCount > 0 && (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-warning" /> {flaggedCount} flagged
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {completed && flaggedCount > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Manual review required</AlertTitle>
              <AlertDescription>
                {flaggedCount} check{flaggedCount === 1 ? "" : "s"} flagged. Review details below before approving.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {checks.map((check) => {
              const CIcon = check.icon;
              return (
                <div key={check.id} className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                  <div className="p-2 rounded-md bg-muted shrink-0">
                    <CIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-medium">{check.name}</p>
                      <Badge className={`text-xs ${statusBadge[check.status]}`}>
                        {check.status === "running" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        {check.status === "passed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {check.status === "flagged" && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {check.status === "failed" && <XCircle className="h-3 w-3 mr-1" />}
                        {prettyLabel(check.status)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{check.description}</p>
                    {check.result && (
                      <p className="text-xs mt-2">
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
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right truncate">{value}</span>
    </div>
  );
}
