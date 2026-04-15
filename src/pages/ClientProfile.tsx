import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, CheckCircle2, XCircle, FileText, MessageSquare, Upload } from "lucide-react";
import { clients, projects } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

const statusColor: Record<string, string> = {
  Active: "bg-success/10 text-success",
  Invited: "bg-info/10 text-info",
  "In Progress": "bg-primary/10 text-primary",
  Submitted: "bg-warning/10 text-warning",
  Approved: "bg-success/10 text-success",
  Rejected: "bg-destructive/10 text-destructive",
};

const kycColor: Record<string, string> = {
  "Not Started": "bg-muted text-muted-foreground",
  "In Progress": "bg-info/10 text-info",
  Submitted: "bg-warning/10 text-warning",
  Approved: "bg-success/10 text-success",
  Rejected: "bg-destructive/10 text-destructive",
};

export default function ClientProfile() {
  const { id } = useParams();
  const client = clients.find(c => c.id === id);
  const { toast } = useToast();

  if (!client) return <div className="text-center py-12"><p>Client not found</p></div>;

  const clientProjects = projects.filter(p => p.clientId === client.id);

  const handleApprove = () => {
    toast({ title: "Client Approved", description: `${client.name} has been approved successfully.` });
  };

  const handleReject = () => {
    toast({ title: "Client Rejected", description: `${client.name} has been rejected.`, variant: "destructive" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/clients"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{client.name}</h1>
            <Badge className={statusColor[client.status] || ""}>{client.status}</Badge>
            <Badge variant="outline">{client.type}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{client.email} · {client.id}</p>
        </div>
        {(client.status === "Submitted" || client.kycStatus === "Submitted") && (
          <div className="flex gap-2">
            <Button className="bg-success text-white hover:bg-success/90" onClick={handleApprove}><CheckCircle2 className="h-4 w-4 mr-2" /> Approve</Button>
            <Button variant="destructive" onClick={handleReject}><XCircle className="h-4 w-4 mr-2" /> Reject</Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="kyc">KYC Status</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Basic Info</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{client.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{client.email}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{client.phone}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{client.type}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Country</span><span>{client.country}</span></div>
                {client.industry && <div className="flex justify-between"><span className="text-muted-foreground">Industry</span><span>{client.industry}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Assigned Officer</span><span>{client.assignedOfficer}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Risk Level</span><Badge variant="outline">{client.riskLevel}</Badge></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">KYC Status</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Overall Status</span>
                  <Badge className={kycColor[client.kycStatus || "Not Started"]}>{client.kycStatus || "Not Started"}</Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /><span>Identity Verification</span></div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /><span>PEP Screening</span></div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /><span>Sanctions Check</span></div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm"><MessageSquare className="h-4 w-4 mr-2" /> Request More Info</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Uploaded Documents</CardTitle>
              <Button size="sm" variant="outline"><Upload className="h-4 w-4 mr-2" /> Upload Document</Button>
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
                          <p className="text-xs text-muted-foreground">{doc.type} · {doc.date}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">{doc.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No documents uploaded yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kyc" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">KYC Review History</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div><p className="text-sm font-medium">Identity Verification</p><p className="text-xs text-muted-foreground">Automated check</p></div>
                  <Badge className="bg-success/10 text-success">Passed</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div><p className="text-sm font-medium">PEP Screening</p><p className="text-xs text-muted-foreground">Database scan</p></div>
                  <Badge className="bg-success/10 text-success">Clear</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div><p className="text-sm font-medium">Sanctions Check</p><p className="text-xs text-muted-foreground">Global sanctions list</p></div>
                  <Badge className="bg-success/10 text-success">Clear</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div><p className="text-sm font-medium">Risk Score</p><p className="text-xs text-muted-foreground">Composite assessment</p></div>
                  <Badge variant="outline">{client.riskLevel}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Linked Projects / Matters</CardTitle></CardHeader>
            <CardContent>
              {clientProjects.length > 0 ? (
                <div className="space-y-3">
                  {clientProjects.map(p => (
                    <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors block">
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.caseType || "General"} · {p.assignedTeam.join(", ")}</p>
                      </div>
                      <Badge variant="outline">{p.status}</Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No projects linked yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Activity Timeline</CardTitle></CardHeader>
            <CardContent>
              {client.activityTimeline && client.activityTimeline.length > 0 ? (
                <div className="space-y-4">
                  {client.activityTimeline.map((a, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-2 h-2 mt-2 rounded-full bg-primary shrink-0" />
                      <div>
                        <p className="text-sm">{a.action}</p>
                        <p className="text-xs text-muted-foreground">{a.date} · {a.user}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No activity recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
