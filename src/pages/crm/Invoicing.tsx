import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, DollarSign, Clock, AlertTriangle, Receipt, TrendingUp, Download } from "lucide-react";
import { invoices as initialInvoices, clients, type Invoice } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

const statusColor: Record<string, string> = {
  Paid: "bg-success/10 text-success",
  Pending: "bg-warning/10 text-warning",
  Overdue: "bg-destructive/10 text-destructive",
};

const payments = [
  { id: "PAY-001", invoiceId: "INV-001", clientName: "Meridian Holdings Ltd", amount: 45000, method: "Wire", date: "2026-03-29" },
  { id: "PAY-002", invoiceId: "INV-003", clientName: "Tanaka Enterprises", amount: 22000, method: "ACH", date: "2026-03-12" },
  { id: "PAY-003", invoiceId: "INV-006", clientName: "Nordic Shipping AS", amount: 18750, method: "Wire", date: "2026-02-05" },
];

const expenses = [
  { id: "EXP-001", category: "Travel", description: "Client meeting — London", amount: 1240, date: "2026-05-12", billable: true },
  { id: "EXP-002", category: "Software", description: "Annual SaaS renewal", amount: 4800, date: "2026-04-01", billable: false },
  { id: "EXP-003", category: "Legal Research", description: "Database subscription", amount: 980, date: "2026-05-20", billable: true },
];

export default function Invoicing() {
  const [list, setList] = useState<Invoice[]>(initialInvoices);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ clientId: "", amount: 0, type: "Fixed" as Invoice["type"], dueDate: "" });
  const { toast } = useToast();

  const paid = list.filter(i => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
  const pending = list.filter(i => i.status === "Pending").reduce((s, i) => s + i.amount, 0);
  const overdue = list.filter(i => i.status === "Overdue").reduce((s, i) => s + i.amount, 0);
  const revenue = paid;

  const create = () => {
    if (!draft.clientId || !draft.amount) return;
    const client = clients.find(c => c.id === draft.clientId);
    const inv: Invoice = {
      id: `INV-${String(list.length + 1).padStart(3, "0")}`,
      clientId: draft.clientId,
      clientName: client?.name || "",
      amount: draft.amount,
      status: "Pending",
      date: new Date().toISOString().split("T")[0],
      dueDate: draft.dueDate,
      type: draft.type,
    };
    setList([inv, ...list]);
    setOpen(false);
    setDraft({ clientId: "", amount: 0, type: "Fixed", dueDate: "" });
    toast({ title: "Invoice created", description: `${inv.id} for ${client?.name}` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Billing & Invoicing</h1>
          <p className="text-sm text-muted-foreground">Accounting, invoices, payments & expenses</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-secondary"><Plus className="h-4 w-4 mr-2" /> Create Invoice</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={draft.clientId} onValueChange={v => setDraft({ ...draft, clientId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients.filter(c => c.status === "Active").map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={draft.type} onValueChange={(v: Invoice["type"]) => setDraft({ ...draft, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fixed">Fixed Fee</SelectItem>
                    <SelectItem value="Hourly">Hourly</SelectItem>
                    <SelectItem value="Milestone">Milestone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Amount ($)</Label><Input type="number" value={draft.amount || ""} onChange={e => setDraft({ ...draft, amount: Number(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Due</Label><Input type="date" value={draft.dueDate} onChange={e => setDraft({ ...draft, dueDate: e.target.value })} /></div>
              </div>
              <Button onClick={create} className="w-full bg-gradient-to-r from-primary to-secondary">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-success/10"><DollarSign className="h-5 w-5 text-success" /></div><div><p className="text-sm text-muted-foreground">Revenue (YTD)</p><p className="text-xl font-bold">${revenue.toLocaleString()}</p></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-warning/10"><Clock className="h-5 w-5 text-warning" /></div><div><p className="text-sm text-muted-foreground">Pending</p><p className="text-xl font-bold">${pending.toLocaleString()}</p></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div><div><p className="text-sm text-muted-foreground">Overdue</p><p className="text-xl font-bold">${overdue.toLocaleString()}</p></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-info/10"><TrendingUp className="h-5 w-5 text-info" /></div><div><p className="text-sm text-muted-foreground">Collection Rate</p><p className="text-xl font-bold">{Math.round((paid / (paid + pending + overdue)) * 100)}%</p></div></CardContent></Card>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Client</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>Due</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {list.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium text-sm">{inv.id}</TableCell>
                      <TableCell className="text-sm">{inv.clientName}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{inv.type}</Badge></TableCell>
                      <TableCell className="font-semibold">${inv.amount.toLocaleString()}</TableCell>
                      <TableCell><Badge className={`text-xs ${statusColor[inv.status]}`}>{inv.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{inv.date}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{inv.dueDate}</TableCell>
                      <TableCell><Button size="sm" variant="ghost"><Download className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader><TableRow><TableHead>Payment</TableHead><TableHead>Invoice</TableHead><TableHead>Client</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                <TableBody>
                  {payments.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-sm">{p.id}</TableCell>
                      <TableCell className="text-sm">{p.invoiceId}</TableCell>
                      <TableCell className="text-sm">{p.clientName}</TableCell>
                      <TableCell className="font-semibold">${p.amount.toLocaleString()}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{p.method}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Category</TableHead><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Billable</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                <TableBody>
                  {expenses.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium text-sm">{e.id}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{e.category}</Badge></TableCell>
                      <TableCell className="text-sm">{e.description}</TableCell>
                      <TableCell className="font-semibold">${e.amount.toLocaleString()}</TableCell>
                      <TableCell>{e.billable ? <Badge className="text-[10px] bg-success/10 text-success">Yes</Badge> : <Badge variant="outline" className="text-[10px]">No</Badge>}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.date}</TableCell>
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
