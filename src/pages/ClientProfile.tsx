import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, MapPin, FileText, ShieldCheck, Receipt, MessageSquare } from "lucide-react";
import { clients, projects, invoices, complianceAlerts } from "@/data/mockData";

const riskColor: Record<string, string> = { Low: "bg-success/10 text-success", Medium: "bg-warning/10 text-warning", High: "bg-destructive/10 text-destructive" };
const statusColor: Record<string, string> = { Active: "bg-success/10 text-success", Pending: "bg-warning/10 text-warning", "Under Review": "bg-info/10 text-info", Rejected: "bg-destructive/10 text-destructive" };

export default function ClientProfile() {
  const { id } = useParams();
  const client = clients.find(c => c.id === id);
  if (!client) return <div className="text-center py-12"><p>Client not found</p><Button asChild variant="link"><Link to="/clients">Back to Clients</Link></Button></div>;

  const clientProjects = projects.filter(p => p.clientId === client.id);
  const clientInvoices = invoices.filter(i => i.clientId === client.id);
  const clientAlerts = complianceAlerts.filter(a => a.clientId === client.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/clients"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{client.name}</h1>
            <Badge variant="outline">{client.type}</Badge>
            <Badge className={riskColor[client.riskLevel]}>{client.riskLevel} Risk</Badge>
            <Badge className={statusColor[client.status]}>{client.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{client.id} · Added {client.dateAdded}</p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" />{client.email}</div>
                <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />{client.phone}</div>
                <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground" />{client.country}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Engagement</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Assigned Officer</span><span className="font-medium">{client.assignedOfficer}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Engagement Letter</span><Badge variant="outline" className="bg-success/10 text-success text-xs">Signed</Badge></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Active Projects</span><span className="font-medium">{clientProjects.length}</span></div>
                {client.industry && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Industry</span><span className="font-medium">{client.industry}</span></div>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-3">
              {["Passport Copy", "Proof of Address", "Source of Funds Declaration", "Engagement Letter"].map((doc) => (
                <div key={doc} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3"><FileText className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{doc}</span></div>
                  <Button variant="outline" size="sm">View</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-3">
              {clientProjects.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No projects yet</p> :
                clientProjects.map(p => (
                  <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                    <div><p className="font-medium text-sm">{p.name}</p><p className="text-xs text-muted-foreground">{p.status} · {p.progress}% complete</p></div>
                    <Badge variant="outline">{p.deadline}</Badge>
                  </Link>
                ))
              }
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-3">
              {clientAlerts.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No compliance alerts</p> :
                clientAlerts.map(a => (
                  <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <ShieldCheck className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2"><p className="text-sm font-medium">{a.type}</p><Badge variant="outline" className="text-xs">{a.severity}</Badge></div>
                      <p className="text-xs text-muted-foreground">{a.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{a.date}</p>
                    </div>
                  </div>
                ))
              }
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-3">
              {clientInvoices.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No invoices</p> :
                clientInvoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3"><Receipt className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm font-medium">{inv.id}</p><p className="text-xs text-muted-foreground">{inv.type} · {inv.date}</p></div></div>
                    <div className="text-right"><p className="font-semibold text-sm">${inv.amount.toLocaleString()}</p><Badge variant="outline" className={`text-xs ${inv.status === "Paid" ? "text-success" : inv.status === "Overdue" ? "text-destructive" : "text-warning"}`}>{inv.status}</Badge></div>
                  </div>
                ))
              }
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communications" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[
                  { from: "Sarah Chen", msg: "Please review the updated engagement letter and sign at your earliest convenience.", time: "2 days ago", outgoing: true },
                  { from: client.name, msg: "Thank you, I've reviewed the document. Will sign by end of day.", time: "1 day ago", outgoing: false },
                  { from: "Sarah Chen", msg: "Document received. We'll proceed with the next steps.", time: "12 hours ago", outgoing: true },
                ].map((m, i) => (
                  <div key={i} className={`flex ${m.outgoing ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-md p-3 rounded-lg text-sm ${m.outgoing ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      <p>{m.msg}</p>
                      <p className={`text-xs mt-1 ${m.outgoing ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{m.from} · {m.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
