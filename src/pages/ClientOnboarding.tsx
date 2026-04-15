import { clients } from "@/data/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, RotateCw, Eye, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const statusColor: Record<string, string> = {
  Submitted: "bg-warning/10 text-warning",
  "In Progress": "bg-info/10 text-info",
};

export default function ClientOnboarding() {
  const { toast } = useToast();
  const pendingClients = clients.filter(c => c.kycStatus === "Submitted" || c.kycStatus === "In Progress");

  const handleApprove = (name: string) => {
    toast({ title: "Client Approved", description: `${name} onboarding approved. Ready for matter creation.` });
  };

  const handleReject = (name: string) => {
    toast({ title: "Client Rejected", description: `${name} onboarding rejected.`, variant: "destructive" });
  };

  const handleRequestInfo = (name: string) => {
    toast({ title: "Info Requested", description: `Additional information requested from ${name}.` });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pending Approvals</h1>
        <p className="text-sm text-muted-foreground">{pendingClients.length} clients awaiting review</p>
      </div>

      {pendingClients.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
            <h3 className="text-lg font-semibold">All caught up!</h3>
            <p className="text-sm text-muted-foreground">No pending onboarding reviews at the moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingClients.map(client => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{client.name}</h3>
                      <Badge className={statusColor[client.kycStatus || ""] || ""}>{client.kycStatus}</Badge>
                      <Badge variant="outline">{client.type}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div><span className="text-muted-foreground block">Email</span>{client.email}</div>
                      <div><span className="text-muted-foreground block">Phone</span>{client.phone}</div>
                      <div><span className="text-muted-foreground block">Country</span>{client.country}</div>
                      <div><span className="text-muted-foreground block">Date Added</span>{client.dateAdded}</div>
                    </div>

                    {client.documents && client.documents.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Submitted Documents</p>
                        <div className="flex flex-wrap gap-2">
                          {client.documents.map((doc, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 text-sm">
                              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{doc.name}</span>
                              <Badge variant="outline" className="text-[10px]">{doc.status}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <Button size="sm" asChild variant="outline"><Link to={`/clients/${client.id}`}><Eye className="h-4 w-4 mr-2" /> View</Link></Button>
                    <Button size="sm" className="bg-success text-white hover:bg-success/90" onClick={() => handleApprove(client.name)}><CheckCircle2 className="h-4 w-4 mr-2" /> Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleReject(client.name)}><XCircle className="h-4 w-4 mr-2" /> Reject</Button>
                    <Button size="sm" variant="outline" onClick={() => handleRequestInfo(client.name)}><RotateCw className="h-4 w-4 mr-2" /> Request Info</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
