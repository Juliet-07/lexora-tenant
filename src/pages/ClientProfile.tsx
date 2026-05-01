import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  FileText,
  MessageSquare,
  Upload,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  PlayCircle,
  RefreshCw,
  Users,
  Newspaper,
  Gauge,
  Globe2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useModule } from "@/contexts/ModuleContext";
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

const statusBadge: Record<CheckStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-info/10 text-info",
  passed: "bg-success/10 text-success",
  flagged: "bg-warning/10 text-warning",
  failed: "bg-destructive/10 text-destructive",
};

export default function ClientProfile() {
  const { id } = useParams();
  const { toast } = useToast();
  const { currentModule } = useModule();
  const [client, setClient] = useState<ApiClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checks, setChecks] = useState<VerificationCheck[]>(initialChecks);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    fetchClientById(id)
      .then((c) => {
        if (active) setClient(c);
      })
      .catch((err) => {
        if (active)
          setError(err?.response?.data?.message ?? "Failed to load client.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
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
          <Link to="/clients">Back to Clients</Link>
        </Button>
      </div>
    );
  }

  const status = (client.status ?? "").toLowerCase();
  const kyc = (client.kycStatus ?? "").toLowerCase();
  const canRunVerifications =
    status === "submitted" ||
    status === "pending" ||
    kyc === "submitted" ||
    kyc === "in_progress";
  const isCorporate = (client.classification ?? "").toLowerCase() === "corporate";
  const riskLevel = (client.riskLevel ?? "low").toLowerCase();

  const officerName =
    typeof client.assignedOfficer === "string"
      ? client.assignedOfficer
      : client.assignedOfficer
        ? `${client.assignedOfficer.firstName ?? ""} ${client.assignedOfficer.lastName ?? ""}`.trim()
        : "—";

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
      await new Promise((r) => setTimeout(r, 800));
      setChecks((prev) => prev.map((c, idx) => (idx === i ? simulateCheck(c) : c)));
    }
    setRunning(false);
    setCompleted(true);
    toast({ title: "Verifications complete", description: "Review results before approving the client." });
  };

  const handleApprove = () => {
    if (canRunVerifications && !completed) {
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

  const flaggedCount = checks.filter((c) => c.status === "flagged" || c.status === "failed").length;
  const passedCount = checks.filter((c) => c.status === "passed").length;
  const progressPct =
    (checks.filter((c) => c.status !== "pending" && c.status !== "running").length / checks.length) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{displayName(client)}</h1>
            <Badge className={`border ${toneFor(client.status)}`}>{prettyLabel(client.status)}</Badge>
            <Badge variant="outline" className="capitalize">
              {prettyLabel(client.classification)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {client.email} · {client._id}
          </p>
        </div>
        {canRunVerifications && (
          <div className="flex gap-2">
            <Button className="bg-success text-white hover:bg-success/90" onClick={handleApprove}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              <XCircle className="h-4 w-4 mr-2" /> Reject
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue={canRunVerifications ? "verifications" : "overview"}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          {currentModule.id !== "crm" && (
            <TabsTrigger value="verifications">
              Verifications
              {canRunVerifications && !completed && (
                <span className="ml-2 inline-block w-2 h-2 rounded-full bg-warning animate-pulse" />
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="Name" value={displayName(client)} />
                <Row label="Email" value={client.email} />
                <Row label="Phone" value={client.phone || "—"} />
                <Row label="Type" value={prettyLabel(client.classification)} />
                <Row label="Country" value={client.country || "—"} />
                <Row label="Assigned Officer" value={officerName} />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Risk Level</span>
                  <Badge variant="outline" className="capitalize">
                    {prettyLabel(client.riskLevel) || "—"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">KYC Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Overall Status</span>
                  <Badge className={`border ${toneFor(client.kycStatus)}`}>
                    {prettyLabel(client.kycStatus) || "Not Started"}
                  </Badge>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm">
                    <MessageSquare className="h-4 w-4 mr-2" /> Request More Info
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Uploaded Documents</CardTitle>
              <Button size="sm" variant="outline">
                <Upload className="h-4 w-4 mr-2" /> Upload Document
              </Button>
            </CardHeader>
            <CardContent>
              {client.documents && client.documents.length > 0 ? (
                <div className="space-y-3">
                  {client.documents.map((doc, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.type ?? "Document"}
                            {doc.uploadedAt
                              ? ` · ${new Date(doc.uploadedAt).toLocaleDateString()}`
                              : ""}
                          </p>
                        </div>
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
                <p className="text-sm text-muted-foreground text-center py-8">
                  No documents uploaded yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verifications" className="mt-4 space-y-4">
          {!canRunVerifications && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Verifications unavailable</AlertTitle>
              <AlertDescription>
                Verifications can only be run when the client has submitted their KYC documents.
                Current status: <strong>{prettyLabel(client.status)}</strong>.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-base">AML / KYC Verifications</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Run regulatory checks (CDD/EDD, UBO, sanctions, PEP, adverse media,
                    risk scoring) before activating this client.
                  </p>
                </div>
                <Button
                  onClick={runAllVerifications}
                  disabled={!canRunVerifications || running}
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

              <div className="space-y-3">
                {checks.map((check) => {
                  const Icon = check.icon;
                  return (
                    <div key={check.id} className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                      <div className="p-2 rounded-md bg-muted shrink-0">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-sm font-medium">{check.name}</p>
                          <Badge className={`text-xs ${statusBadge[check.status]}`}>
                            {check.status === "running" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                            {check.status === "passed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {check.status === "flagged" && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {check.status === "pending"
                              ? "Pending"
                              : check.status === "running"
                                ? "Running"
                                : check.result}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{check.description}</p>
                        {check.detail && check.status !== "running" && (
                          <p className="text-xs mt-2 p-2 rounded bg-muted/50">{check.detail}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {completed && flaggedCount > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Enhanced Due Diligence (EDD) Required</AlertTitle>
                  <AlertDescription>
                    {flaggedCount} check{flaggedCount > 1 ? "s" : ""} flagged for review.
                    Conduct EDD or request additional documentation before approving.
                  </AlertDescription>
                </Alert>
              )}

              {completed && flaggedCount === 0 && (
                <Alert className="border-success/30 bg-success/5">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <AlertTitle>All checks passed</AlertTitle>
                  <AlertDescription>
                    Client is cleared for activation. You may now approve onboarding.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {client.activityTimeline && client.activityTimeline.length > 0 ? (
                <div className="space-y-4">
                  {client.activityTimeline.map((a, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-2 h-2 mt-2 rounded-full bg-primary shrink-0" />
                      <div>
                        <p className="text-sm">{a.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.date}
                          {a.user ? ` · ${a.user}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-2 h-2 mt-2 rounded-full bg-primary shrink-0" />
                    <div>
                      <p className="text-sm">Client created</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(client.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
