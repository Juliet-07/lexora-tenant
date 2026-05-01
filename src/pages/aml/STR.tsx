import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, FileText, Download, Edit, Send } from "lucide-react";
import { toast } from "sonner";

interface STR {
  id: string;
  customer: string;
  customerId: string;
  bank: string;
  amount: number;
  createdDate: string;
  status: "Draft" | "Pending Review" | "Submitted" | "Acknowledged";
  reportedBy: string;
}

const initialReports: STR[] = [
  { id: "STR001", customer: "Tendai Moyo", customerId: "CUST001", bank: "CBZ Bank", amount: 15000, createdDate: "2024-10-25", status: "Submitted", reportedBy: "Ruvimbo Nyathi" },
  { id: "STR002", customer: "Nhaka Enterprises", customerId: "CUST003", bank: "Steward Bank", amount: 45000, createdDate: "2024-10-20", status: "Draft", reportedBy: "Tapiwa Mpofu" },
  { id: "STR003", customer: "Farai Nyamande", customerId: "CUST005", bank: "Stanbic Bank", amount: 25000, createdDate: "2024-10-18", status: "Acknowledged", reportedBy: "Ruvimbo Nyathi" },
];

function statusBadge(s: STR["status"]) {
  const cls =
    s === "Submitted"
      ? "bg-success/15 text-success border-success/30"
      : s === "Acknowledged"
        ? "bg-info/15 text-info border-info/30"
        : s === "Pending Review"
          ? "bg-warning/15 text-warning border-warning/30"
          : "bg-muted text-muted-foreground";
  return <Badge variant="outline" className={`${cls} text-[10px]`}>{s}</Badge>;
}

export default function STR() {
  const [reports, setReports] = useState<STR[]>(initialReports);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    relatedCaseId: "",
    customerId: "",
    customerName: "",
    amount: "",
    transactionDate: "",
    description: "",
    additional: "",
  });

  const draftCount = reports.filter((r) => r.status === "Draft").length;
  const pendingCount = reports.filter((r) => r.status === "Pending Review").length;
  const submittedCount = reports.filter((r) => r.status === "Submitted" || r.status === "Acknowledged").length;

  const reset = () => {
    setForm({
      relatedCaseId: "",
      customerId: "",
      customerName: "",
      amount: "",
      transactionDate: "",
      description: "",
      additional: "",
    });
  };

  const validate = () => {
    if (!form.customerId || !form.customerName || !form.amount || !form.transactionDate || !form.description) {
      toast.error("Please fill all required fields");
      return false;
    }
    return true;
  };

  const create = (status: STR["status"]) => {
    if (!validate()) return;
    setReports([
      {
        id: `STR${String(reports.length + 1).padStart(3, "0")}`,
        customer: form.customerName,
        customerId: form.customerId,
        bank: "—",
        amount: Number(form.amount),
        createdDate: new Date().toISOString().slice(0, 10),
        status,
        reportedBy: "Current User",
      },
      ...reports,
    ]);
    reset();
    setShowForm(false);
    toast.success(status === "Draft" ? "Saved as draft" : "Submitted to RBZ FIU");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Suspicious Transaction Reporting (STR)</h1>
        <p className="text-sm text-muted-foreground">
          Generate and submit required regulatory reports to RBZ Financial Intelligence Unit
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Draft STRs</p>
          <p className="text-3xl font-bold">{draftCount}</p>
        </CardContent></Card>
        <Card className="bg-warning/5 border-warning/30"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Pending Review</p>
          <p className="text-3xl font-bold text-warning">{pendingCount}</p>
        </CardContent></Card>
        <Card className="bg-success/5 border-success/30"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Submitted</p>
          <p className="text-3xl font-bold text-success">{submittedCount}</p>
        </CardContent></Card>
        <Card className="bg-primary/5 border-primary/30"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total STRs</p>
          <p className="text-3xl font-bold text-primary">{reports.length}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">STR Reports</CardTitle>
          <Button
            variant={showForm ? "outline" : "default"}
            size="sm"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Cancel" : (<><Plus className="h-4 w-4 mr-1" /> New STR</>)}
          </Button>
        </CardHeader>

        {showForm && (
          <CardContent className="border-t bg-muted/30">
            <p className="font-semibold text-sm mb-4">New Suspicious Transaction Report</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Related Case ID</Label>
                <Input
                  placeholder="CASE001"
                  value={form.relatedCaseId}
                  onChange={(e) => setForm({ ...form, relatedCaseId: e.target.value })}
                />
              </div>
              <div>
                <Label>Customer ID *</Label>
                <Input
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                />
              </div>
              <div>
                <Label>Customer Name *</Label>
                <Input
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                />
              </div>
              <div>
                <Label>Transaction Amount (USD) *</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Transaction Date *</Label>
                <Input
                  type="date"
                  value={form.transactionDate}
                  onChange={(e) => setForm({ ...form, transactionDate: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Description of Suspicious Activity *</Label>
                <Textarea
                  rows={4}
                  placeholder="Describe the suspicious activity in detail…"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Additional Information</Label>
                <Textarea
                  rows={3}
                  placeholder="Any other relevant information…"
                  value={form.additional}
                  onChange={(e) => setForm({ ...form, additional: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { reset(); setShowForm(false); }}>Cancel</Button>
              <Button variant="secondary" onClick={() => create("Draft")}>Save as Draft</Button>
              <Button onClick={() => create("Submitted")}>
                <Send className="h-4 w-4 mr-1" /> Submit to RBZ FIU
              </Button>
            </div>
          </CardContent>
        )}

        <CardContent className={showForm ? "border-t pt-4" : ""}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>STR ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reported By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{r.customer}</div>
                    <div className="text-xs text-muted-foreground">{r.customerId}</div>
                  </TableCell>
                  <TableCell>{r.bank}</TableCell>
                  <TableCell className="font-semibold">USD {r.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{r.createdDate}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell className="text-xs">{r.reportedBy}</TableCell>
                  <TableCell>
                    <div className="flex gap-2 text-xs">
                      <button className="text-primary hover:underline inline-flex items-center gap-1">
                        <FileText className="h-3 w-3" /> View
                      </button>
                      {r.status === "Draft" ? (
                        <>
                          <button className="text-warning hover:underline inline-flex items-center gap-1">
                            <Edit className="h-3 w-3" /> Edit
                          </button>
                          <button className="text-secondary hover:underline inline-flex items-center gap-1">
                            <Send className="h-3 w-3" /> Submit
                          </button>
                        </>
                      ) : (
                        <button className="text-primary hover:underline inline-flex items-center gap-1">
                          <Download className="h-3 w-3" /> Download
                        </button>
                      )}
                    </div>
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
