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
} from "lucide-react";
import {
  ApiClient,
  fetchClientById,
  displayName,
  prettyLabel,
  toneFor,
} from "@/lib/clients-api";

export default function ClientProfile() {
  const { id } = useParams();
  const [client, setClient] = useState<ApiClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <Link to="/clients">Back to Clients</Link>
        </Button>
      </div>
    );
  }

  const isCorporate = (client.classification ?? "").toLowerCase() === "corporate";
  const Icon = isCorporate ? Building2 : UserIcon;
  const riskLevel = (client.riskLevel ?? "").toLowerCase();
  const riskScore = riskLevel === "high" ? 78 : riskLevel === "medium" ? 52 : 24;
  const riskTone =
    riskLevel === "high"
      ? "text-destructive"
      : riskLevel === "medium"
        ? "text-warning"
        : "text-success";

  const officerName =
    typeof client.assignedOfficer === "string"
      ? client.assignedOfficer
      : client.assignedOfficer
        ? `${client.assignedOfficer.firstName ?? ""} ${client.assignedOfficer.lastName ?? ""}`.trim()
        : "—";

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
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
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
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Gauge className={`h-5 w-5 ${riskTone}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Risk Score</p>
              <p className={`text-sm font-semibold ${riskTone}`}>
                {riskScore}/100 · {prettyLabel(client.riskLevel) || "Low"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-info" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Documents</p>
              <p className="text-sm font-semibold">{client.documents?.length ?? 0} on file</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
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

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="kyc">KYC History</TabsTrigger>
          <TabsTrigger value="risk">Risk Scoring</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row icon={UserIcon} label="Name" value={displayName(client)} />
                <Row icon={Mail} label="Email" value={client.email} />
                <Row icon={Phone} label="Phone" value={client.phone || "—"} />
                <Row icon={Globe2} label="Country" value={client.country || "—"} />
                <Row icon={Building2} label="Type" value={prettyLabel(client.classification)} />
                <Row icon={UserIcon} label="Assigned Officer" value={officerName} />
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
                    {prettyLabel(client.riskLevel) || "Low"}
                  </Badge>
                </div>
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Risk Score</span>
                    <span className="font-medium">{riskScore}/100</span>
                  </div>
                  <Progress value={riskScore} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* KYC History */}
        <TabsContent value="kyc" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">KYC History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: "Submitted documents", date: client.createdAt, status: client.kycStatus ?? "pending" },
                  { label: "Identity verification", date: client.createdAt, status: "passed" },
                  { label: "Sanctions screening", date: client.createdAt, status: "passed" },
                  { label: "PEP screening", date: client.createdAt, status: riskLevel === "high" ? "flagged" : "passed" },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium capitalize">{row.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(row.date).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge className={`border ${toneFor(row.status)}`}>
                      {prettyLabel(row.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Scoring */}
        <TabsContent value="risk" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Risk Scoring Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/40 border">
                <Gauge className={`h-10 w-10 ${riskTone}`} />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Composite Risk Score</p>
                  <p className={`text-2xl font-bold ${riskTone}`}>
                    {riskScore}/100 — {prettyLabel(client.riskLevel) || "Low"}
                  </p>
                </div>
              </div>
              {[
                { label: "Geographic Risk", value: riskLevel === "high" ? 70 : 25 },
                { label: "Product / Service Risk", value: riskLevel === "high" ? 65 : 30 },
                { label: "Customer Risk", value: riskLevel === "high" ? 80 : 20 },
                { label: "Channel Risk", value: riskLevel === "high" ? 60 : 35 },
              ].map((r) => (
                <div key={r.label} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span>{r.label}</span>
                    <span className="font-medium">{r.value}/100</span>
                  </div>
                  <Progress value={r.value} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Uploaded Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {client.documents && client.documents.length > 0 ? (
                <div className="space-y-3">
                  {client.documents.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.type ?? "Document"}
                            {doc.uploadedAt ? ` · ${new Date(doc.uploadedAt).toLocaleDateString()}` : ""}
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

        {/* Activity */}
        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {client.activityTimeline && client.activityTimeline.length > 0 ? (
                <div className="space-y-3">
                  {client.activityTimeline.map((a, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                      <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm">{a.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(a.date).toLocaleString()}
                          {a.user ? ` · ${a.user}` : ""}
                        </p>
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
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="font-medium text-right truncate max-w-[60%]">{value}</span>
    </div>
  );
}
