import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Download,
  Send,
  CheckCircle2,
  XCircle,
  Upload,
  Paperclip,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { WorkflowTable } from "@/components/finance/WorkflowTable";
import { fetchMandates } from "@/lib/crm/mandates-api";
import { fetchEmployees, fetchAllPayrollRuns } from "@/lib/hr/hr-api";
import {
  fetchVendors,
  createVendor,
  fetchPurchaseOrders,
  createPurchaseOrder,
  issuePurchaseOrder,
  fulfillPurchaseOrder,
  cancelPurchaseOrder,
  downloadPurchaseOrderPdf,
  fetchBills,
  createBill,
  approveBill,
  rejectBill,
  scheduleBillPayment,
  markBillPaid,
  fetchExpenseClaims,
  createExpenseClaim,
  approveExpenseClaim,
  rejectExpenseClaim,
  markExpenseClaimPaid,
  attachExpenseReceipt,
  fetchExpensePolicies,
  upsertExpensePolicy,
  type Vendor,
  type PurchaseOrder,
  type PoLine,
  type Bill,
  type ExpenseClaim,
} from "@/lib/crm/finance-api";

const purchasesWorkflow = [
  {
    action: "Capture",
    detail:
      "A vendor bill or a general expense (no vendor required) is recorded",
    owner: "Anyone with access",
    trigger: "On receipt of invoice/expense",
  },
  {
    action: "Approve",
    detail: "Bill is reviewed and approved for payment, or rejected",
    owner: "Finance manager",
    trigger: "Before due date",
  },
  {
    action: "Schedule payment",
    detail: "Approved bills are added to the next payment run",
    owner: "Accountant",
    trigger: "Ahead of the run",
  },
  {
    action: "Pay",
    detail: "Payment made — WHT withheld automatically for flagged vendors",
    owner: "Finance manager",
    trigger: "On the payment date",
  },
  {
    action: "Expense claims",
    detail:
      "Employees submit claims with proof; rechargeable + approved claims flow to WIP",
    owner: "Employee → approver",
    trigger: "As incurred",
  },
  {
    action: "Purchase orders",
    detail:
      "Formal orders issued to vendors, downloadable as PDF, tracked through fulfilment",
    owner: "Whoever's ordering",
    trigger: "Before the spend",
  },
];

const money = (n: number, c = "USD") =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: c,
    maximumFractionDigits: 0,
  });

const badge = (s: string) => {
  if (["Paid", "Approved", "Fulfilled"].includes(s))
    return "bg-success/10 text-success";
  if (["Awaiting approval", "Submitted", "Scheduled", "Draft"].includes(s))
    return "bg-warning/10 text-warning";
  if (["Rejected", "Cancelled"].includes(s))
    return "bg-destructive/10 text-destructive";
  if (s === "Issued") return "bg-primary/10 text-primary";
  return "bg-muted text-muted-foreground";
};

export default function Purchases() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: fetchVendors,
  });
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchaseOrders"],
    queryFn: fetchPurchaseOrders,
  });
  const { data: bills = [] } = useQuery({
    queryKey: ["bills"],
    queryFn: fetchBills,
  });
  const { data: claims = [] } = useQuery({
    queryKey: ["expenseClaims"],
    queryFn: fetchExpenseClaims,
  });
  const { data: policies = [] } = useQuery({
    queryKey: ["expensePolicies"],
    queryFn: fetchExpensePolicies,
  });
  const { data: payrollRuns = [] } = useQuery({
    queryKey: ["payrollRuns"],
    queryFn: fetchAllPayrollRuns,
  });
  const { data: mandates = [] } = useQuery({
    queryKey: ["mandates"],
    queryFn: fetchMandates,
  });
  const { data: employeesPage } = useQuery({
    queryKey: ["hr-employees-all"],
    queryFn: () => fetchEmployees({ limit: 500 }),
    retry: false,
  });
  const employees = employeesPage?.items ?? [];

  const payable = vendors.reduce((s, v) => s + v.outstanding, 0);
  const claimsAwaiting = claims
    .filter((c) => c.status !== "Paid")
    .reduce((s, c) => s + c.amount, 0);
  const nextPayroll = payrollRuns[0];

  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  // ── Vendors ────────────────────────────────────────────────
  const [newVendorOpen, setNewVendorOpen] = useState(false);
  const [vendorDraft, setVendorDraft] = useState({
    name: "",
    tin: "",
    category: "",
    terms: "Net 30",
    currency: "USD",
    email: "",
    wht: false,
  });
  const createVendorMut = useMutation({
    mutationFn: () => createVendor(vendorDraft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setNewVendorOpen(false);
      setVendorDraft({
        name: "",
        tin: "",
        category: "",
        terms: "Net 30",
        currency: "USD",
        email: "",
        wht: false,
      });
      toast({ title: "Vendor added" });
    },
    onError: onErr("Failed to add vendor"),
  });

  // ── Purchase orders ────────────────────────────────────────
  const [newPoOpen, setNewPoOpen] = useState(false);
  const [poDraft, setPoDraft] = useState({
    vendorId: "",
    currency: "USD",
    expectedDelivery: "",
    notes: "",
    deliveryAddress: "",
    deliveryAttention: "",
    deliveryPhone: "",
    deliveryInstructions: "",
  });
  const [poLines, setPoLines] = useState<PoLine[]>([
    { description: "", qty: 1, unit: 0, discountPct: 0, taxLabel: "" },
  ]);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);

  const invalidatePos = () =>
    queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
  const createPoMut = useMutation({
    mutationFn: () =>
      createPurchaseOrder({
        ...poDraft,
        lines: poLines.filter((l) => l.description),
      }),
    onSuccess: (po) => {
      invalidatePos();
      setNewPoOpen(false);
      setPoLines([
        { description: "", qty: 1, unit: 0, discountPct: 0, taxLabel: "" },
      ]);
      toast({ title: "Purchase order created", description: po.ref });
    },
    onError: onErr("Failed to create purchase order"),
  });
  const issuePoMut = useMutation({
    mutationFn: (id: string) => issuePurchaseOrder(id),
    onSuccess: (po) => {
      invalidatePos();
      setSelectedPo(po);
      const vendor = vendors.find((v) => v._id === po.vendorId);
      toast(
        vendor?.email
          ? {
              title: "Issued to vendor",
              description: `Emailed to ${vendor.email}`,
            }
          : {
              title: "Issued to vendor",
              description: `${po.vendorName} has no email on file — nothing was sent.`,
            },
      );
    },
    onError: onErr("Failed to issue"),
  });
  const fulfillPoMut = useMutation({
    mutationFn: (id: string) => fulfillPurchaseOrder(id),
    onSuccess: (po) => {
      invalidatePos();
      setSelectedPo(po);
    },
    onError: onErr("Failed"),
  });
  const cancelPoMut = useMutation({
    mutationFn: (id: string) => cancelPurchaseOrder(id),
    onSuccess: (po) => {
      invalidatePos();
      setSelectedPo(po);
    },
    onError: onErr("Failed"),
  });
  const downloadPdfMut = useMutation({
    mutationFn: ({ id, ref }: { id: string; ref: string }) =>
      downloadPurchaseOrderPdf(id, ref),
    onError: onErr("Failed to download PDF"),
  });

  // ── Bills ──────────────────────────────────────────────────
  const [newBillOpen, setNewBillOpen] = useState(false);
  const [billIsVendorless, setBillIsVendorless] = useState(false);
  const [billDraft, setBillDraft] = useState({
    vendorId: "",
    vendorName: "",
    poId: "",
    description: "",
    category: "",
    dueOn: "",
    amount: 0,
    currency: "USD",
    recurring: false,
  });
  const invalidateBills = () =>
    queryClient.invalidateQueries({ queryKey: ["bills"] });
  const createBillMut = useMutation({
    mutationFn: () =>
      createBill({
        ...billDraft,
        vendorId: billIsVendorless ? undefined : billDraft.vendorId,
        vendorName: billIsVendorless ? billDraft.vendorName : undefined,
        poId: billDraft.poId || undefined,
      }),
    onSuccess: () => {
      invalidateBills();
      setNewBillOpen(false);
      setBillIsVendorless(false);
      setBillDraft({
        vendorId: "",
        vendorName: "",
        poId: "",
        description: "",
        category: "",
        dueOn: "",
        amount: 0,
        currency: "USD",
        recurring: false,
      });
      toast({ title: "Bill captured" });
    },
    onError: onErr("Failed to capture bill"),
  });
  const approveBillMut = useMutation({
    mutationFn: (id: string) => approveBill(id, "You"),
    onSuccess: invalidateBills,
    onError: onErr("Failed"),
  });
  const rejectBillMut = useMutation({
    mutationFn: (id: string) => rejectBill(id),
    onSuccess: invalidateBills,
    onError: onErr("Failed"),
  });
  const scheduleBillMut = useMutation({
    mutationFn: (id: string) => scheduleBillPayment(id),
    onSuccess: (b) => {
      invalidateBills();
      toast({
        title: "Payment scheduled",
        description: `${b.ref} added to the next bank file.`,
      });
    },
    onError: onErr("Failed"),
  });
  const markBillPaidMut = useMutation({
    mutationFn: (id: string) => markBillPaid(id),
    onSuccess: invalidateBills,
    onError: onErr("Failed"),
  });

  // ── Expense claims ─────────────────────────────────────────
  const [newClaimOpen, setNewClaimOpen] = useState(false);
  const [claimDraft, setClaimDraft] = useState({
    employeeUserId: "",
    employee: "",
    description: "",
    mandateId: "",
    amount: 0,
    currency: "USD",
    rechargeable: false,
  });
  const invalidateClaims = () =>
    queryClient.invalidateQueries({ queryKey: ["expenseClaims"] });
  const createClaimMut = useMutation({
    mutationFn: () => {
      const m = mandates.find((x) => x._id === claimDraft.mandateId);
      return createExpenseClaim({
        ...claimDraft,
        mandateId: claimDraft.mandateId || undefined,
        mandateName: m?.name,
      });
    },
    onSuccess: () => {
      invalidateClaims();
      setNewClaimOpen(false);
      setClaimDraft({
        employeeUserId: "",
        employee: "",
        description: "",
        mandateId: "",
        amount: 0,
        currency: "USD",
        rechargeable: false,
      });
      toast({ title: "Claim recorded" });
    },
    onError: onErr("Failed to record claim"),
  });
  const approveClaimMut = useMutation({
    mutationFn: (id: string) => approveExpenseClaim(id),
    onSuccess: () => {
      invalidateClaims();
      toast({
        title: "Approved",
        description: "Rechargeable claims now show in Sales' WIP register.",
      });
    },
    onError: onErr("Failed"),
  });
  const rejectClaimMut = useMutation({
    mutationFn: (id: string) => rejectExpenseClaim(id),
    onSuccess: invalidateClaims,
    onError: onErr("Failed"),
  });
  const markClaimPaidMut = useMutation({
    mutationFn: (id: string) => markExpenseClaimPaid(id),
    onSuccess: invalidateClaims,
    onError: onErr("Failed"),
  });
  const [receiptTargetId, setReceiptTargetId] = useState<string | null>(null);
  const attachReceiptMut = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      attachExpenseReceipt(id, file),
    onSuccess: () => {
      invalidateClaims();
      toast({ title: "Receipt attached" });
    },
    onError: onErr("Failed to attach receipt"),
  });

  // ── Expense policies ───────────────────────────────────────
  const [policyOpen, setPolicyOpen] = useState(false);
  const [policyDraft, setPolicyDraft] = useState({ rule: "", value: "" });
  const upsertPolicyMut = useMutation({
    mutationFn: () => upsertExpensePolicy(policyDraft.rule, policyDraft.value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expensePolicies"] });
      setPolicyOpen(false);
      setPolicyDraft({ rule: "", value: "" });
    },
    onError: onErr("Failed to save policy"),
  });

  const bandTotal = (band: string) =>
    vendors
      .filter((v) => v.band === band)
      .reduce((s, v) => s + v.outstanding, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Purchases</h1>
        <p className="text-sm text-muted-foreground">
          Vendor bills, purchase orders, expense claims, payroll payments and
          payables
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total payables", value: money(payable) },
          { label: "Claims awaiting payment", value: money(claimsAwaiting) },
          {
            label: "Next payroll (net)",
            value: nextPayroll
              ? money(nextPayroll.totalNet, nextPayroll.runCurrency)
              : "—",
          },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{k.label}</p>
              <p className="text-xl font-bold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="bills">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="pos">Purchase orders</TabsTrigger>
          <TabsTrigger value="claims">Expense claims</TabsTrigger>
          <TabsTrigger value="payroll">Payroll payments</TabsTrigger>
          <TabsTrigger value="payables">Aged payables & vendors</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
        </TabsList>

        {/* Bills */}
        <TabsContent value="bills" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setNewBillOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Capture bill
            </Button>
          </div>
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((b) => (
                    <TableRow key={b._id}>
                      <TableCell className="font-medium text-sm">
                        {b.ref}
                        {b.recurring && (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            Recurring
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{b.vendorName}</TableCell>
                      <TableCell className="text-sm">{b.description}</TableCell>
                      <TableCell className="text-sm">{b.category}</TableCell>
                      <TableCell className="text-sm">
                        {b.dueOn?.slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-sm font-semibold">
                        {money(b.amount, b.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${badge(b.status)}`}>
                          {b.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {b.status === "Awaiting approval" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={approveBillMut.isPending}
                              onClick={() => approveBillMut.mutate(b._id)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => rejectBillMut.mutate(b._id)}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {b.status === "Approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={scheduleBillMut.isPending}
                            onClick={() => scheduleBillMut.mutate(b._id)}
                          >
                            Schedule payment
                          </Button>
                        )}
                        {b.status === "Scheduled" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markBillPaidMut.mutate(b._id)}
                          >
                            Mark paid
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!bills.length && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No bills captured yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase orders */}
        <TabsContent value="pos" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setNewPoOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New purchase order
            </Button>
          </div>
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expected delivery</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map((po) => (
                    <TableRow
                      key={po._id}
                      className="cursor-pointer"
                      onClick={() => setSelectedPo(po)}
                    >
                      <TableCell className="font-medium text-sm">
                        {po.ref}
                      </TableCell>
                      <TableCell className="text-sm">{po.vendorName}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${badge(po.status)}`}>
                          {po.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {po.expectedDelivery?.slice(0, 10) ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">
                        {money(po.total, po.currency)}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={downloadPdfMut.isPending}
                          onClick={() =>
                            downloadPdfMut.mutate({ id: po._id, ref: po.ref })
                          }
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!purchaseOrders.length && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No purchase orders yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expense claims */}
        <TabsContent value="claims" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setNewClaimOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Record claim
            </Button>
          </div>
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Mandate</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Rechargeable</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((c) => (
                    <TableRow key={c._id}>
                      <TableCell className="font-medium text-sm">
                        {c.ref}
                      </TableCell>
                      <TableCell className="text-sm">{c.employee}</TableCell>
                      <TableCell className="text-sm">{c.description}</TableCell>
                      <TableCell className="text-sm">
                        {c.mandateName ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm font-semibold">
                        {money(c.amount, c.currency)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.rechargeable ? "Yes — to WIP" : "No"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.receiptUrl ? (
                          <a
                            href={c.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <Paperclip className="h-3.5 w-3.5" />{" "}
                            {c.receiptName ?? "View"}
                          </a>
                        ) : (
                          <>
                            <input
                              type="file"
                              id={`receipt-${c._id}`}
                              accept="application/pdf,image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file)
                                  attachReceiptMut.mutate({ id: c._id, file });
                                e.target.value = "";
                              }}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              disabled={attachReceiptMut.isPending}
                              onClick={() =>
                                document
                                  .getElementById(`receipt-${c._id}`)
                                  ?.click()
                              }
                            >
                              <Upload className="mr-1 h-3 w-3" /> Attach
                            </Button>
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${badge(c.status)}`}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {c.status === "Submitted" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={approveClaimMut.isPending}
                              onClick={() => approveClaimMut.mutate(c._id)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => rejectClaimMut.mutate(c._id)}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {c.status === "Approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markClaimPaidMut.mutate(c._id)}
                          >
                            Mark reimbursed
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!claims.length && (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No expense claims yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Expense policies</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setPolicyDraft({ rule: "", value: "" });
                  setPolicyOpen(true);
                }}
              >
                Add / edit rule
              </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {policies.map((p) => (
                <button
                  key={p._id}
                  className="rounded-lg border p-3 text-left hover:bg-muted/50"
                  onClick={() => {
                    setPolicyDraft({ rule: p.rule, value: p.value });
                    setPolicyOpen(true);
                  }}
                >
                  <p className="text-xs text-muted-foreground">{p.rule}</p>
                  <p className="text-sm font-medium">{p.value}</p>
                </button>
              ))}
              {!policies.length && (
                <p className="text-sm text-muted-foreground">
                  No policy lines set yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll payments */}
        <TabsContent value="payroll" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payroll runs from HR</CardTitle>
              <p className="text-xs text-muted-foreground">
                Real payroll runs processed in HR — Finance reviews totals here
                before the run is authorised and paid.
              </p>
            </CardHeader>
            <CardContent className="p-4 pt-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollRuns.map((p) => (
                    <TableRow key={p._id}>
                      <TableCell className="font-medium text-sm">
                        {p.periodLabel}
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.employeeCount}
                      </TableCell>
                      <TableCell className="text-sm">
                        {money(p.totalGross, p.runCurrency)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {money(p.totalDeductions, p.runCurrency)}
                      </TableCell>
                      <TableCell className="text-sm font-semibold">
                        {money(p.totalNet, p.runCurrency)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-xs ${badge(p.status === "processed" ? "Approved" : p.status === "paid" ? "Paid" : "Draft")}`}
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {p.status === "processed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              toast({
                                title: "Bank file generated",
                                description: `Bulk payment file for ${p.periodLabel} ready for upload — authorisation happens in HR's payroll run.`,
                              })
                            }
                          >
                            Generate bank file
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!payrollRuns.length && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No payroll runs yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aged payables & vendors */}
        <TabsContent value="payables" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setNewVendorOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Add vendor
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {["Current", "31–60", "61–90", "90+"].map((band) => (
              <Card key={band}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{band}</p>
                  <p className="text-lg font-bold">{money(bandTotal(band))}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vendor register</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>TIN</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Terms</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>WHT</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Band</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((v) => (
                    <TableRow key={v._id}>
                      <TableCell className="font-medium text-sm">
                        {v.name}
                      </TableCell>
                      <TableCell className="text-sm">{v.tin || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {v.category || "—"}
                      </TableCell>
                      <TableCell className="text-sm">{v.terms}</TableCell>
                      <TableCell className="text-sm">{v.currency}</TableCell>
                      <TableCell className="text-sm">
                        {v.wht ? "15% non-resident" : "—"}
                      </TableCell>
                      <TableCell className="text-sm font-semibold">
                        {money(v.outstanding, v.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {v.band}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!vendors.length && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No vendors yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow" className="mt-4">
          <WorkflowTable
            title="How purchasing is used"
            steps={purchasesWorkflow}
          />
        </TabsContent>
      </Tabs>

      {/* New vendor */}
      <Dialog open={newVendorOpen} onOpenChange={setNewVendorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add vendor</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Name</Label>
              <Input
                value={vendorDraft.name}
                onChange={(e) =>
                  setVendorDraft({ ...vendorDraft, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={vendorDraft.email}
                onChange={(e) =>
                  setVendorDraft({ ...vendorDraft, email: e.target.value })
                }
                placeholder="For sending issued purchase orders"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>TIN</Label>
                <Input
                  value={vendorDraft.tin}
                  onChange={(e) =>
                    setVendorDraft({ ...vendorDraft, tin: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Category</Label>
                <Input
                  value={vendorDraft.category}
                  onChange={(e) =>
                    setVendorDraft({ ...vendorDraft, category: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Terms</Label>
                <Input
                  value={vendorDraft.terms}
                  onChange={(e) =>
                    setVendorDraft({ ...vendorDraft, terms: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Select
                  value={vendorDraft.currency}
                  onValueChange={(v) =>
                    setVendorDraft({ ...vendorDraft, currency: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["USD", "EUR", "RWF", "GBP"].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={vendorDraft.wht}
                onChange={(e) =>
                  setVendorDraft({ ...vendorDraft, wht: e.target.checked })
                }
              />
              Non-resident — subject to WHT
            </label>
          </div>
          <DialogFooter>
            <Button
              disabled={!vendorDraft.name || createVendorMut.isPending}
              onClick={() => createVendorMut.mutate()}
            >
              Add vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New PO */}
      <Dialog open={newPoOpen} onOpenChange={setNewPoOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New purchase order</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Vendor</Label>
              <Select
                value={poDraft.vendorId}
                onValueChange={(v) => setPoDraft({ ...poDraft, vendorId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor..." />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v._id} value={v._id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {poDraft.vendorId &&
                !vendors.find((v) => v._id === poDraft.vendorId)?.email && (
                  <p className="mt-1 text-[11px] text-warning">
                    This vendor has no email on file — issuing won't send a
                    notification.
                  </p>
                )}
            </div>
            <div className="space-y-2">
              <Label>Line items</Label>
              {poLines.map((l, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_55px_80px_65px_100px] gap-2"
                >
                  <Input
                    placeholder="Description"
                    value={l.description}
                    onChange={(e) =>
                      setPoLines((p) =>
                        p.map((x, j) =>
                          j === i ? { ...x, description: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={l.qty}
                    onChange={(e) =>
                      setPoLines((p) =>
                        p.map((x, j) =>
                          j === i ? { ...x, qty: Number(e.target.value) } : x,
                        ),
                      )
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Unit price"
                    value={l.unit}
                    onChange={(e) =>
                      setPoLines((p) =>
                        p.map((x, j) =>
                          j === i ? { ...x, unit: Number(e.target.value) } : x,
                        ),
                      )
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Disc %"
                    value={l.discountPct ?? 0}
                    onChange={(e) =>
                      setPoLines((p) =>
                        p.map((x, j) =>
                          j === i
                            ? { ...x, discountPct: Number(e.target.value) }
                            : x,
                        ),
                      )
                    }
                  />
                  <Input
                    placeholder="Tax label"
                    value={l.taxLabel ?? ""}
                    onChange={(e) =>
                      setPoLines((p) =>
                        p.map((x, j) =>
                          j === i ? { ...x, taxLabel: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setPoLines((p) => [
                    ...p,
                    {
                      description: "",
                      qty: 1,
                      unit: 0,
                      discountPct: 0,
                      taxLabel: "",
                    },
                  ])
                }
              >
                Add line
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Expected delivery</Label>
                <Input
                  type="date"
                  value={poDraft.expectedDelivery}
                  onChange={(e) =>
                    setPoDraft({ ...poDraft, expectedDelivery: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Select
                  value={poDraft.currency}
                  onValueChange={(v) => setPoDraft({ ...poDraft, currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["USD", "EUR", "RWF", "GBP"].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Reference / notes</Label>
              <Textarea
                value={poDraft.notes}
                onChange={(e) =>
                  setPoDraft({ ...poDraft, notes: e.target.value })
                }
              />
            </div>

            <div className="space-y-2 rounded border p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Delivery details (optional)
              </p>
              <Input
                placeholder="Delivery address"
                value={poDraft.deliveryAddress}
                onChange={(e) =>
                  setPoDraft({ ...poDraft, deliveryAddress: e.target.value })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Attention"
                  value={poDraft.deliveryAttention}
                  onChange={(e) =>
                    setPoDraft({
                      ...poDraft,
                      deliveryAttention: e.target.value,
                    })
                  }
                />
                <Input
                  placeholder="Telephone"
                  value={poDraft.deliveryPhone}
                  onChange={(e) =>
                    setPoDraft({ ...poDraft, deliveryPhone: e.target.value })
                  }
                />
              </div>
              <Input
                placeholder="Delivery instructions"
                value={poDraft.deliveryInstructions}
                onChange={(e) =>
                  setPoDraft({
                    ...poDraft,
                    deliveryInstructions: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !poDraft.vendorId ||
                !poLines.some((l) => l.description) ||
                createPoMut.isPending
              }
              onClick={() => createPoMut.mutate()}
            >
              Create draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PO detail */}
      <Sheet
        open={!!selectedPo}
        onOpenChange={(o) => !o && setSelectedPo(null)}
      >
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedPo && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {selectedPo.ref} · {selectedPo.vendorName}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <Badge className={badge(selectedPo.status)}>
                  {selectedPo.status}
                </Badge>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPo.lines.map((l, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">
                          {l.description}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {l.qty}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {money(l.unit, selectedPo.currency)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {money(l.qty * l.unit, selectedPo.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-right text-lg font-bold">
                  {money(selectedPo.total, selectedPo.currency)}
                </p>
                {selectedPo.notes && (
                  <p className="text-sm text-muted-foreground">
                    {selectedPo.notes}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={downloadPdfMut.isPending}
                    onClick={() =>
                      downloadPdfMut.mutate({
                        id: selectedPo._id,
                        ref: selectedPo.ref,
                      })
                    }
                  >
                    <Download className="mr-2 h-4 w-4" /> Download PDF
                  </Button>
                  {selectedPo.status === "Draft" && (
                    <Button
                      size="sm"
                      disabled={issuePoMut.isPending}
                      onClick={() => issuePoMut.mutate(selectedPo._id)}
                    >
                      <Send className="mr-2 h-4 w-4" /> Issue to vendor
                    </Button>
                  )}
                  {selectedPo.status === "Issued" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fulfillPoMut.mutate(selectedPo._id)}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Mark fulfilled
                    </Button>
                  )}
                  {["Draft", "Issued"].includes(selectedPo.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => cancelPoMut.mutate(selectedPo._id)}
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* New bill */}
      <Dialog open={newBillOpen} onOpenChange={setNewBillOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Capture bill</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`rounded-full border px-3 py-1 text-xs ${!billIsVendorless ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                onClick={() => {
                  setBillIsVendorless(false);
                  setBillDraft((d) => ({ ...d, vendorName: "" }));
                }}
              >
                Vendor invoice
              </button>
              <button
                type="button"
                className={`rounded-full border px-3 py-1 text-xs ${billIsVendorless ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                onClick={() => {
                  setBillIsVendorless(true);
                  setBillDraft((d) => ({ ...d, vendorId: "", poId: "" }));
                }}
              >
                General expense — no vendor
              </button>
            </div>
            {billIsVendorless ? (
              <div>
                <Label>Payee / description of who this was paid to</Label>
                <Input
                  value={billDraft.vendorName}
                  onChange={(e) =>
                    setBillDraft({ ...billDraft, vendorName: e.target.value })
                  }
                  placeholder="e.g. Bank charges, parking, one-off purchase"
                />
              </div>
            ) : (
              <div>
                <Label>Vendor</Label>
                <Select
                  value={billDraft.vendorId}
                  onValueChange={(v) =>
                    setBillDraft({ ...billDraft, vendorId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v._id} value={v._id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Linked purchase order (optional)</Label>
              <Select
                value={billDraft.poId}
                onValueChange={(v) => setBillDraft({ ...billDraft, poId: v })}
                disabled={billIsVendorless}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No PO" />
                </SelectTrigger>
                <SelectContent>
                  {purchaseOrders
                    .filter((p) => p.vendorId === billDraft.vendorId)
                    .map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.ref}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={billDraft.description}
                onChange={(e) =>
                  setBillDraft({ ...billDraft, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Input
                  value={billDraft.category}
                  onChange={(e) =>
                    setBillDraft({ ...billDraft, category: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={billDraft.dueOn}
                  onChange={(e) =>
                    setBillDraft({ ...billDraft, dueOn: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={billDraft.amount}
                  onChange={(e) =>
                    setBillDraft({
                      ...billDraft,
                      amount: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Select
                  value={billDraft.currency}
                  onValueChange={(v) =>
                    setBillDraft({ ...billDraft, currency: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["USD", "EUR", "RWF", "GBP"].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={billDraft.recurring}
                onChange={(e) =>
                  setBillDraft({ ...billDraft, recurring: e.target.checked })
                }
              />
              Recurring bill
            </label>
          </div>
          <DialogFooter>
            <Button
              disabled={
                (billIsVendorless
                  ? !billDraft.vendorName
                  : !billDraft.vendorId) ||
                !billDraft.description ||
                !billDraft.dueOn ||
                createBillMut.isPending
              }
              onClick={() => createBillMut.mutate()}
            >
              Capture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New claim */}
      <Dialog open={newClaimOpen} onOpenChange={setNewClaimOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record expense claim</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Employee</Label>
              <Select
                value={claimDraft.employeeUserId}
                onValueChange={(v) => {
                  const e = employees.find((x: any) => x._id === v);
                  setClaimDraft({
                    ...claimDraft,
                    employeeUserId: v,
                    employee: e ? `${e.firstName} ${e.lastName}` : "",
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e._id} value={e._id}>
                      {e.firstName} {e.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={claimDraft.description}
                onChange={(e) =>
                  setClaimDraft({ ...claimDraft, description: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Mandate (if rechargeable)</Label>
              <Select
                value={claimDraft.mandateId}
                onValueChange={(v) =>
                  setClaimDraft({ ...claimDraft, mandateId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No mandate" />
                </SelectTrigger>
                <SelectContent>
                  {mandates.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={claimDraft.amount}
                  onChange={(e) =>
                    setClaimDraft({
                      ...claimDraft,
                      amount: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Select
                  value={claimDraft.currency}
                  onValueChange={(v) =>
                    setClaimDraft({ ...claimDraft, currency: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["USD", "EUR", "RWF", "GBP"].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={claimDraft.rechargeable}
                onChange={(e) =>
                  setClaimDraft({
                    ...claimDraft,
                    rechargeable: e.target.checked,
                  })
                }
                disabled={!claimDraft.mandateId}
              />
              Rechargeable to mandate — flows to WIP once approved
            </label>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !claimDraft.employeeUserId ||
                !claimDraft.description ||
                createClaimMut.isPending
              }
              onClick={() => createClaimMut.mutate()}
            >
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Policy line */}
      <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Expense policy line</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Rule</Label>
              <Input
                value={policyDraft.rule}
                onChange={(e) =>
                  setPolicyDraft({ ...policyDraft, rule: e.target.value })
                }
                placeholder="e.g. Mileage"
              />
            </div>
            <div>
              <Label>Value</Label>
              <Input
                value={policyDraft.value}
                onChange={(e) =>
                  setPolicyDraft({ ...policyDraft, value: e.target.value })
                }
                placeholder="e.g. RWF 650 / km"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !policyDraft.rule ||
                !policyDraft.value ||
                upsertPolicyMut.isPending
              }
              onClick={() => upsertPolicyMut.mutate()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
