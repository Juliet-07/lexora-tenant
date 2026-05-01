import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, DollarSign, Clock, AlertTriangle, Timer } from "lucide-react";
import { invoices as initialInvoices, clients, projects, teamMembers, timeEntries as initialTimeEntries, type Invoice, type TimeEntry } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const statusColor: Record<string, string> = { Paid: "bg-success/10 text-success", Pending: "bg-warning/10 text-warning", Overdue: "bg-destructive/10 text-destructive" };

export default function Billing() {
  const [invoiceList, setInvoiceList] = useState<Invoice[]>(initialInvoices);
  const [timeEntryList, setTimeEntryList] = useState<TimeEntry[]>(initialTimeEntries);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [timeDialogOpen, setTimeDialogOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ clientId: "", amount: 0, type: "Fixed" as "Fixed" | "Hourly" | "Milestone", dueDate: "" });
  const [newTimeEntry, setNewTimeEntry] = useState({ projectId: "", hours: 0, description: "", rate: 0 });
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  const totalPaid = invoiceList.filter(i => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
  const totalPending = invoiceList.filter(i => i.status === "Pending").reduce((s, i) => s + i.amount, 0);
  const totalOverdue = invoiceList.filter(i => i.status === "Overdue").reduce((s, i) => s + i.amount, 0);

  const fullName = user ? `${user.firstName} ${user.lastName}` : "";
  const displayEntries = isAdmin ? timeEntryList : timeEntryList.filter(e => e.teamMemberName === fullName);
  const totalBillableHours = displayEntries.filter(e => e.billable).reduce((s, e) => s + e.hours, 0);
  const totalBillableAmount = displayEntries.filter(e => e.billable).reduce((s, e) => s + e.hours * e.rate, 0);

  const handleCreateInvoice = () => {
    if (!newInvoice.clientId || !newInvoice.amount) return;
    const client = clients.find(c => c.id === newInvoice.clientId);
    const id = `INV-${String(invoiceList.length + 1).padStart(3, "0")}`;
    const invoice: Invoice = {
      id,
      clientId: newInvoice.clientId,
      clientName: client?.name || "",
      amount: newInvoice.amount,
      status: "Pending",
      date: new Date().toISOString().split("T")[0],
      dueDate: newInvoice.dueDate,
      type: newInvoice.type,
    };
    setInvoiceList([invoice, ...invoiceList]);
    setInvoiceDialogOpen(false);
    setNewInvoice({ clientId: "", amount: 0, type: "Fixed", dueDate: "" });
    toast({ title: "Invoice Created", description: `Invoice ${id} created for ${client?.name}` });
  };

  const handleLogTime = () => {
    if (!newTimeEntry.projectId || !newTimeEntry.hours) return;
    const project = projects.find(p => p.id === newTimeEntry.projectId);
    const id = `TE-${String(timeEntryList.length + 1).padStart(3, "0")}`;
    const entry: TimeEntry = {
      id,
      projectId: newTimeEntry.projectId,
      projectName: project?.name || "",
      teamMemberId: user?.id || "",
      teamMemberName: fullName,
      date: new Date().toISOString().split("T")[0],
      hours: newTimeEntry.hours,
      description: newTimeEntry.description,
      billable: true,
      rate: newTimeEntry.rate || 250,
    };
    setTimeEntryList([entry, ...timeEntryList]);
    setTimeDialogOpen(false);
    setNewTimeEntry({ projectId: "", hours: 0, description: "", rate: 0 });
    toast({ title: "Time Logged", description: `${newTimeEntry.hours} hours logged for ${project?.name}` });
  };

  const myProjects = isAdmin ? projects : projects.filter(p => p.assignedTeam.includes(fullName));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Billing & Time Tracking</h1><p className="text-sm text-muted-foreground">Law firm billing management</p></div>
        <div className="flex gap-2">
          <Dialog open={timeDialogOpen} onOpenChange={setTimeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Timer className="h-4 w-4 mr-2" /> Log Time</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Log Time Entry</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Project / Matter</Label>
                  <Select value={newTimeEntry.projectId} onValueChange={v => setNewTimeEntry({ ...newTimeEntry, projectId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>
                      {myProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {p.clientName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hours</Label>
                    <Input type="number" step="0.25" value={newTimeEntry.hours || ""} onChange={e => setNewTimeEntry({ ...newTimeEntry, hours: Number(e.target.value) })} placeholder="0.0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Rate ($/hr)</Label>
                    <Input type="number" value={newTimeEntry.rate || ""} onChange={e => setNewTimeEntry({ ...newTimeEntry, rate: Number(e.target.value) })} placeholder="250" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description of Work</Label>
                  <Textarea value={newTimeEntry.description} onChange={e => setNewTimeEntry({ ...newTimeEntry, description: e.target.value })} placeholder="Describe the work performed..." />
                </div>
                <Button className="w-full bg-gradient-to-r from-primary to-secondary" onClick={handleLogTime}>Log Time</Button>
              </div>
            </DialogContent>
          </Dialog>
          {isAdmin && (
            <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-primary to-secondary"><Plus className="h-4 w-4 mr-2" /> Create Invoice</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Client</Label>
                    <Select value={newInvoice.clientId} onValueChange={v => setNewInvoice({ ...newInvoice, clientId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                      <SelectContent>
                        {clients.filter(c => c.status === "Active").map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Invoice Type</Label>
                    <Select value={newInvoice.type} onValueChange={(v: "Fixed" | "Hourly" | "Milestone") => setNewInvoice({ ...newInvoice, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fixed">Fixed Fee</SelectItem>
                        <SelectItem value="Hourly">Hourly Billing</SelectItem>
                        <SelectItem value="Milestone">Milestone-Based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Amount ($)</Label>
                      <Input type="number" value={newInvoice.amount || ""} onChange={e => setNewInvoice({ ...newInvoice, amount: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input type="date" value={newInvoice.dueDate} onChange={e => setNewInvoice({ ...newInvoice, dueDate: e.target.value })} />
                    </div>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-primary to-secondary" onClick={handleCreateInvoice}>Create Invoice</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="timesheet">Timesheet</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4 mt-4">
          {isAdmin && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-success/10"><DollarSign className="h-5 w-5 text-success" /></div><div><p className="text-sm text-muted-foreground">Paid</p><p className="text-xl font-bold">${totalPaid.toLocaleString()}</p></div></CardContent></Card>
              <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-warning/10"><Clock className="h-5 w-5 text-warning" /></div><div><p className="text-sm text-muted-foreground">Pending</p><p className="text-xl font-bold">${totalPending.toLocaleString()}</p></div></CardContent></Card>
              <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div><div><p className="text-sm text-muted-foreground">Overdue</p><p className="text-xl font-bold">${totalOverdue.toLocaleString()}</p></div></CardContent></Card>
            </div>
          )}
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Client</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>Due Date</TableHead></TableRow></TableHeader>
                <TableBody>
                  {invoiceList.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.id}</TableCell>
                      <TableCell className="text-sm">{inv.clientName}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{inv.type}</Badge></TableCell>
                      <TableCell className="font-semibold">${inv.amount.toLocaleString()}</TableCell>
                      <TableCell><Badge className={`text-xs ${statusColor[inv.status]}`}>{inv.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{inv.date}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{inv.dueDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timesheet" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-primary/10"><Timer className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Billable Hours</p><p className="text-xl font-bold">{totalBillableHours}h</p></div></CardContent></Card>
            <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-success/10"><DollarSign className="h-5 w-5 text-success" /></div><div><p className="text-sm text-muted-foreground">Billable Amount</p><p className="text-xl font-bold">${totalBillableAmount.toLocaleString()}</p></div></CardContent></Card>
          </div>
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead>{isAdmin && <TableHead>Team Member</TableHead>}<TableHead>Project</TableHead><TableHead>Hours</TableHead><TableHead>Rate</TableHead><TableHead>Amount</TableHead><TableHead>Description</TableHead></TableRow></TableHeader>
                <TableBody>
                  {displayEntries.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm">{entry.date}</TableCell>
                      {isAdmin && <TableCell className="text-sm">{entry.teamMemberName}</TableCell>}
                      <TableCell className="text-sm font-medium">{entry.projectName}</TableCell>
                      <TableCell className="font-semibold">{entry.hours}h</TableCell>
                      <TableCell className="text-sm">${entry.rate}/hr</TableCell>
                      <TableCell className="font-semibold">${(entry.hours * entry.rate).toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{entry.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
