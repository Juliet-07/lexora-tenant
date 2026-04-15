import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Send, Eye, Edit2, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { clients as initialClients, type Client } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

const statusColor: Record<string, string> = {
  Active: "bg-success/10 text-success",
  Invited: "bg-info/10 text-info",
  "In Progress": "bg-primary/10 text-primary",
  Submitted: "bg-warning/10 text-warning",
  Approved: "bg-success/10 text-success",
  Rejected: "bg-destructive/10 text-destructive",
  Pending: "bg-warning/10 text-warning",
  "Under Review": "bg-info/10 text-info",
};

export default function Clients() {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", email: "", phone: "", type: "Individual" as "Individual" | "Corporate" });
  const { toast } = useToast();

  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchType = typeFilter === "all" || c.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const handleCreateClient = () => {
    if (!newClient.name || !newClient.email) return;
    const id = `CLT-${String(clients.length + 1).padStart(3, "0")}`;
    const client: Client = {
      id,
      name: newClient.name,
      email: newClient.email,
      phone: newClient.phone,
      type: newClient.type,
      riskLevel: "Low",
      status: "Invited",
      dateAdded: new Date().toISOString().split("T")[0],
      assignedOfficer: "Sarah Chen",
      country: "—",
      kycStatus: "Not Started",
    };
    setClients([client, ...clients]);
    setDialogOpen(false);
    setNewClient({ name: "", email: "", phone: "", type: "Individual" });
    toast({ title: "Client Created", description: `Onboarding link sent to ${newClient.email}` });
  };

  const handleResendLink = (client: Client) => {
    toast({ title: "Link Resent", description: `Onboarding link resent to ${client.email}` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {clients.length} clients</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-secondary"><Plus className="h-4 w-4 mr-2" /> Add Client</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Client</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name / Company Name</Label>
                <Input value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} placeholder="Enter name" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} placeholder="client@email.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} placeholder="+1 234 567 8900" />
              </div>
              <div className="space-y-2">
                <Label>Client Type</Label>
                <Select value={newClient.type} onValueChange={(v: "Individual" | "Corporate") => setNewClient({ ...newClient, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Individual">Individual</SelectItem>
                    <SelectItem value="Corporate">Business / Corporate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full bg-gradient-to-r from-primary to-secondary" onClick={handleCreateClient}>
                <Send className="h-4 w-4 mr-2" /> Create & Send Onboarding Link
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search clients..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Invited">Invited</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Submitted">Submitted</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Individual">Individual</SelectItem>
            <SelectItem value="Corporate">Corporate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}<span className="block text-xs text-muted-foreground">{c.id}</span></TableCell>
                  <TableCell className="text-sm">{c.email}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{c.type}</Badge></TableCell>
                  <TableCell><Badge className={`text-xs ${statusColor[c.status]}`}>{c.status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.dateAdded}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild><Link to={`/clients/${c.id}`}><Eye className="h-4 w-4 mr-2" /> View Client</Link></DropdownMenuItem>
                        {c.status === "Invited" && <DropdownMenuItem onClick={() => handleResendLink(c)}><Send className="h-4 w-4 mr-2" /> Resend Onboarding Link</DropdownMenuItem>}
                        <DropdownMenuItem><Edit2 className="h-4 w-4 mr-2" /> Edit Details</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
