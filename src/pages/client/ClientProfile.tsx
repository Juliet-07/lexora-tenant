import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Gauge,
  Activity,
  Mail,
  Phone,
  Globe2,
  User as UserIcon,
  Building2,
  Calendar,
  Download,
  UserCheck,
  Percent,
} from "lucide-react";
import {
  ApiClientDetail,
  fetchClientById,
  displayName,
  prettyLabel,
  toneFor,
} from "@/lib/clients-api";

export default function ClientProfile() {
  const { id } = useParams();
  const [client, setClient] = useState<ApiClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div className="space-y-4 p-1">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
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
          <Link to="/clients">Back to Clients</Link>
        </Button>
      </div>
    );
  }

  // ── Derived values from real response shape ───────────────
  const isCorporate = client.classifications?.toLowerCase() === "corporate";
  const Icon = isCorporate ? Building2 : UserIcon;

  const riskLevel = (client.riskLevel ?? "unrated").toLowerCase();
  const riskScore =
    riskLevel === "high"
      ? 78
      : riskLevel === "medium"
        ? 52
        : riskLevel === "low"
          ? 24
          : 0;
  const riskTone =
    riskLevel === "high"
      ? "text-destructive"
      : riskLevel === "medium"
        ? "text-warning"
        : riskLevel === "low"
          ? "text-success"
          : "text-muted-foreground";

  // assignedTo lives in client.profile.assignedTo
  const assignedTo = client.profile?.assignedTo;
  const officerName = assignedTo
    ? `${assignedTo.firstName} ${assignedTo.lastName}`.trim()
    : "—";

  const completion = client.profile?.profileCompletionPercent ?? 0;
  const isPep = client.profile?.isPoliticallyExposed ?? false;

  const auditTrail =
    (client.profile as any)?.metadata?.auditTrail ?? client.activityTimeline ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/clients">
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
            <Badge className={`border ${toneFor(client.kycStatus)}`}>
              KYC: {prettyLabel(client.kycStatus)}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {prettyLabel(client.classifications)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {client.email} · ID: {client._id}
          </p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">KYC Status</p>
              <p className="text-sm font-semibold capitalize">
                {prettyLabel(client.kycStatus) || "Not Started"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
              <Gauge className={`h-5 w-5 ${riskTone}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Risk Level</p>
              <p className={`text-sm font-semibold capitalize ${riskTone}`}>
                {prettyLabel(client.riskLevel) || "Unrated"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
              <Percent className="h-5 w-5 text-info" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                Profile Completion
              </p>
              <p className="text-sm font-semibold">{completion}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-success" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Onboarded</p>
              <p className="text-sm font-semibold">
                {new Date(client.createdAt).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="kyc">KYC</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row
                  icon={UserIcon}
                  label="Full Name"
                  value={client.fullName}
                />
                <Row icon={Mail} label="Email" value={client.email} />
                <Row icon={Phone} label="Phone" value={client.phone || "—"} />
                <Row
                  icon={Globe2}
                  label="Country"
                  value={client.country || "—"}
                />
                <Row
                  icon={Building2}
                  label="Type"
                  value={prettyLabel(client.classifications)}
                />
                <Row
                  icon={UserCheck}
                  label="Assigned Officer"
                  value={officerName}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Compliance Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Account Status</span>
                  <Badge className={`border ${toneFor(client.status)}`}>
                    {prettyLabel(client.status)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">KYC Status</span>
                  <Badge className={`border ${toneFor(client.kycStatus)}`}>
                    {prettyLabel(client.kycStatus) || "Not Started"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Risk Level</span>
                  <Badge variant="outline" className={`capitalize ${riskTone}`}>
                    {prettyLabel(client.riskLevel) || "Unrated"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    Politically Exposed
                  </span>
                  <Badge variant={isPep ? "destructive" : "secondary"}>
                    {isPep ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      Profile Completion
                    </span>
                    <span className="font-medium">{completion}%</span>
                  </div>
                  <Progress value={completion} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Individual profile details if available */}
            {client.profile?.individualProfile && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">
                    Individual Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {Object.entries(client.profile.individualProfile)
                    .filter(([, v]) => v != null && v !== "")
                    .map(([k, v]) => (
                      <div key={k}>
                        <p className="text-xs text-muted-foreground capitalize">
                          {k.replace(/([A-Z])/g, " $1")}
                        </p>
                        <p className="font-medium">{String(v)}</p>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}

            {/* Entity profile details if available */}
            {client.profile?.entityProfile && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Entity Profile</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {Object.entries(client.profile.entityProfile)
                    .filter(([, v]) => v != null && v !== "")
                    .map(([k, v]) => (
                      <div key={k}>
                        <p className="text-xs text-muted-foreground capitalize">
                          {k.replace(/([A-Z])/g, " $1")}
                        </p>
                        <p className="font-medium">{String(v)}</p>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── KYC ── */}
        <TabsContent value="kyc" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">KYC Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">KYC Status</p>
                  <Badge className={`mt-1 border ${toneFor(client.kycStatus)}`}>
                    {prettyLabel(client.kycStatus) || "Not Started"}
                  </Badge>
                </div>
                {client.profile?.kycCompletedAt && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Completed At
                    </p>
                    <p className="font-medium mt-1">
                      {new Date(
                        client.profile.kycCompletedAt,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">
                    Politically Exposed
                  </p>
                  <Badge
                    variant={isPep ? "destructive" : "secondary"}
                    className="mt-1"
                  >
                    {isPep ? "Yes — PEP" : "No"}
                  </Badge>
                </div>
              </div>

              {/* Audit trail from profile metadata */}
              {auditTrail.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Audit Trail
                  </p>
                  <div className="space-y-2">
                    {auditTrail.map((entry: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-sm font-medium capitalize">
                              {entry.action}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(
                                entry.timestamp ?? entry.date,
                              ).toLocaleString()}
                              {entry.performedBy
                                ? ` · ${entry.performedBy}`
                                : ""}
                            </p>
                          </div>
                        </div>
                        {entry.reason && (
                          <p className="text-xs text-muted-foreground max-w-[200px] text-right">
                            {entry.reason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {auditTrail.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No KYC activity recorded yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Risk ── */}
        <TabsContent value="risk" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/40 border">
                <Gauge className={`h-10 w-10 ${riskTone}`} />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">
                    Overall Risk Level
                  </p>
                  <p className={`text-2xl font-bold capitalize ${riskTone}`}>
                    {prettyLabel(client.riskLevel) || "Unrated"}
                  </p>
                  {riskScore > 0 && (
                    <Progress value={riskScore} className="h-2 mt-2" />
                  )}
                </div>
              </div>

              {isPep && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  ⚠ This client is flagged as a Politically Exposed Person
                  (PEP).
                  {client.profile?.pepDetails && (
                    <p className="mt-1 text-xs">
                      {JSON.stringify(client.profile.pepDetails)}
                    </p>
                  )}
                </div>
              )}

              <div className="text-sm text-muted-foreground text-center py-4">
                Detailed risk scoring will be available once the client
                completes their profile.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Documents ── */}
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Uploaded Documents</CardTitle>
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
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
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
                      <div className="flex items-center gap-2">
                        {doc.status && (
                          <Badge variant="outline" className="text-xs">
                            {doc.status}
                          </Badge>
                        )}
                        {doc.url && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={doc.url} target="_blank" rel="noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No documents uploaded yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Activity ── */}
        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {auditTrail.length > 0 ? (
                <div className="space-y-3">
                  {auditTrail.map((a: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                    >
                      <Activity className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm capitalize">{a.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(a.timestamp ?? a.date).toLocaleString()}
                          {a.performedBy ? ` · ${a.performedBy}` : ""}
                        </p>
                        {a.reason && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic">
                            Reason: {a.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No activity recorded yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-muted-foreground flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </span>
      <span className="font-medium text-right truncate max-w-[60%]">
        {value}
      </span>
    </div>
  );
}
