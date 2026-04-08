import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, DollarSign, Clock, AlertTriangle } from "lucide-react";
import { invoices } from "@/data/mockData";

const statusColor: Record<string, string> = { Paid: "bg-success/10 text-success", Pending: "bg-warning/10 text-warning", Overdue: "bg-destructive/10 text-destructive" };

export default function Billing() {
  const totalPaid = invoices.filter(i => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
  const totalPending = invoices.filter(i => i.status === "Pending").reduce((s, i) => s + i.amount, 0);
  const totalOverdue = invoices.filter(i => i.status === "Overdue").reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Billing</h1><p className="text-sm text-muted-foreground">{invoices.length} invoices</p></div>
        <Button className="bg-gradient-to-r from-primary to-secondary"><Plus className="h-4 w-4 mr-2" /> Create Invoice</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-success/10"><DollarSign className="h-5 w-5 text-success" /></div><div><p className="text-sm text-muted-foreground">Paid</p><p className="text-xl font-bold">${totalPaid.toLocaleString()}</p></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-warning/10"><Clock className="h-5 w-5 text-warning" /></div><div><p className="text-sm text-muted-foreground">Pending</p><p className="text-xl font-bold">${totalPending.toLocaleString()}</p></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div><div><p className="text-sm text-muted-foreground">Overdue</p><p className="text-xl font-bold">${totalOverdue.toLocaleString()}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Client</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>Due Date</TableHead></TableRow></TableHeader>
            <TableBody>
              {invoices.map(inv => (
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
    </div>
  );
}
