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
  Send,
  CheckCircle2,
  Eye,
  Banknote,
  ArrowRight,
  AlertTriangle,
  X,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchMandates, money } from "@/lib/crm/mandates-api";
import {
  fetchInvoices,
  fetchWipRegister,
  wipValue,
  createInvoice,
  submitInvoice,
  approveInvoice,
  sendInvoice,
  recordPayment,
  dismissClientAction,
  writeOffInvoice,
  fetchPayments,
  ageBucket,
  daysOverdue,
  createCreditNote,
  INVOICE_STAGES,
  BILLING_MODELS,
  PAYMENT_METHODS,
  type Invoice,
  type InvoiceStage,
  type BillingModel,
  type PaymentMethod,
} from "@/lib/crm/finance-api";

const STEPS = [
  "WIP accumulation",
  "Invoice creation",
  "Review",
  "Delivery",
  "Payment",
  "Dunning",
];

const stageClass: Record<InvoiceStage, string> = {
  Draft: "bg-muted text-muted-foreground",
  "In Review": "bg-primary/10 text-primary",
  Approved: "bg-primary/10 text-primary",
  Sent: "bg-warning/10 text-warning",
  "Part Paid": "bg-warning/10 text-warning",
  Paid: "bg-success/10 text-success",
  Overdue: "bg-destructive/10 text-destructive",
  "Written Off": "bg-muted text-muted-foreground",
};

export default function Invoicing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => fetchInvoices(),
  });
  const { data: wipList = [] } = useQuery({
    queryKey: ["wipRegister"],
    queryFn: () => fetchWipRegister(),
  });
  const { data: mandates = [] } = useQuery({
    queryKey: ["mandates"],
    queryFn: fetchMandates,
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => fetchPayments(),
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = list.find((i) => i._id === selectedId) ?? null;
  const [openNew, setOpenNew] = useState(false);
  const [draft, setDraft] = useState({
    mandateId: "",
    model: "Time & materials" as BillingModel,
    currency: "USD",
    subtotal: 0,
    vatRate: 18,
    whtRate: 0,
    discount: 0,
    dueOn: "",
    proforma: false,
  });
  const [payMethod, setPayMethod] = useState<PaymentMethod>("Bank feed");
  const [payAmount, setPayAmount] = useState<number | "">("");
  const [woReason, setWoReason] = useState("");
  const [woApprover, setWoApprover] = useState("");
  const [woOpen, setWoOpen] = useState(false);
  const [cnOpen, setCnOpen] = useState(false);
  const [cnAmount, setCnAmount] = useState(0);
  const [cnReason, setCnReason] = useState("");
  const [cnApprover, setCnApprover] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
  };
  const invalidateSel = (inv: Invoice) => {
    invalidate();
    setSelectedId(inv._id);
  };
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const totalWip = wipList.reduce((s, w) => s + wipValue(w), 0);
  const receivables = list
    .filter((i) => !["Paid", "Draft", "Written Off"].includes(i.stage))
    .reduce((s, i) => s + (i.payable - i.paidAmount), 0);
  const collected = list.reduce((s, i) => s + i.paidAmount, 0);
  const overdueTotal = list
    .filter(
      (i) =>
        !["Paid", "Draft", "Written Off"].includes(i.stage) &&
        daysOverdue(i.dueOn) > 0,
    )
    .reduce((s, i) => s + (i.payable - i.paidAmount), 0);

  const createMut = useMutation({
    mutationFn: () => {
      const m = mandates.find((x) => x._id === draft.mandateId)!;
      return createInvoice({
        mandateId: draft.mandateId,
        model: draft.model,
        currency: draft.currency,
        vatRate: draft.vatRate,
        whtRate: draft.whtRate,
        discount: draft.discount,
        dueOn: draft.dueOn,
        proforma: draft.proforma,
        lines: [
          {
            description: `${draft.model} fees — ${m.name}`,
            qty: 1,
            unit: Number(draft.subtotal),
          },
        ],
      });
    },
    onSuccess: (inv) => {
      invalidate();
      setOpenNew(false);
      toast({ title: "Draft invoice created", description: inv.ref });
    },
    onError: onErr("Failed to create invoice"),
  });

  const submitMut = useMutation({
    mutationFn: (id: string) => submitInvoice(id),
    onSuccess: invalidateSel,
    onError: onErr("Failed"),
  });
  const approveMut = useMutation({
    mutationFn: (id: string) => approveInvoice(id),
    onSuccess: invalidateSel,
    onError: onErr("Failed"),
  });
  const sendMut = useMutation({
    mutationFn: (id: string) => sendInvoice(id),
    onSuccess: (inv) => {
      invalidateSel(inv);
      toast({
        title: "Invoice delivered",
        description: "Sent via client portal and email.",
      });
    },
    onError: onErr("Failed"),
  });
  const payMut = useMutation({
    mutationFn: () =>
      recordPayment(
        selected!._id,
        payMethod,
        payAmount === "" ? undefined : Number(payAmount),
      ),
    onSuccess: () => {
      invalidate();
      setPayAmount("");
      toast({
        title: "Payment recorded",
        description: "Allocated and posted.",
      });
    },
    onError: onErr("Failed to record payment"),
  });
  // Quick action for confirming a client's "I've paid" claim — goes
  // through the exact same real payment-recording flow as any
  // manual payment, defaulting to the full remaining balance and
  // Bank transfer as the method, since that's what remittance-based
  // payment actually is.
  const markReceivedMut = useMutation({
    mutationFn: () => recordPayment(selected!._id, "Bank transfer", undefined),
    onSuccess: () => {
      invalidate();
      toast({
        title: "Payment recorded",
        description: "Confirmed and posted.",
      });
    },
    onError: onErr("Failed to record payment"),
  });
  const dismissClaimMut = useMutation({
    mutationFn: () => dismissClientAction(selected!._id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Claim dismissed" });
    },
    onError: onErr("Failed to dismiss"),
  });
  const writeOffMut = useMutation({
    mutationFn: () => writeOffInvoice(selected!._id, woReason, woApprover),
    onSuccess: (inv) => {
      invalidateSel(inv);
      setWoOpen(false);
      toast({ title: "Written off after bad debt review" });
    },
    onError: onErr("Failed"),
  });
  const creditNoteMut = useMutation({
    mutationFn: () =>
      createCreditNote({
        invoiceId: selected!._id,
        amount: cnAmount,
        reason: cnReason,
        approvedBy: cnApprover,
      }),
    onSuccess: () => {
      invalidate();
      setCnOpen(false);
      toast({ title: "Credit note issued" });
    },
    onError: onErr("Failed to issue credit note"),
  });

  if (isLoading)
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Billing &amp; Invoicing</h1>
          <p className="text-sm text-muted-foreground">
            Invoice-to-Cash: WIP → creation → review → delivery → payment →
            dunning
          </p>
        </div>
        <Button onClick={() => setOpenNew(true)}>
          <Plus className="mr-2 h-4 w-4" /> New invoice
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <Badge variant="outline">
                {i + 1}. {s}
              </Badge>
              {i < STEPS.length - 1 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "Unbilled WIP", v: money(totalWip) },
          { l: "Outstanding receivables", v: money(receivables) },
          { l: "Collected (total)", v: money(collected) },
          { l: "Overdue", v: money(overdueTotal) },
        ].map((k) => (
          <Card key={k.l}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.l}</p>
              <p className="mt-1 text-xl font-bold">{k.v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        WIP review, aged receivables and credit control live in Sales — generate
        invoices directly from approved WIP there. This page is the invoice
        list, manual creation, and payment ledger. Billing model is set per
        invoice; branding lives in Finance settings.
      </p>

      <Tabs defaultValue="invoices">
        <TabsList className="flex-wrap">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client / mandate</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Payable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((i) => (
                    <TableRow
                      key={i._id}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(i._id)}
                    >
                      <TableCell>
                        <p className="font-mono text-sm">{i.ref}</p>
                        {i.proforma && (
                          <Badge variant="outline" className="text-[10px]">
                            Proforma
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{i.clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {i.mandateName}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">{i.model}</TableCell>
                      <TableCell>
                        <Badge className={stageClass[i.stage]}>{i.stage}</Badge>
                        {i.openedByClient && i.stage === "Sent" && (
                          <span className="ml-2 inline-flex items-center text-[11px] text-muted-foreground">
                            <Eye className="mr-1 h-3 w-3" /> opened
                          </span>
                        )}
                        {i.clientAction && (
                          <Badge
                            className={`ml-2 text-[10px] ${i.clientAction === "Paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}
                          >
                            <AlertTriangle className="mr-1 h-2.5 w-2.5" />
                            {i.clientAction === "Paid"
                              ? "Client says paid"
                              : "Client flagged issue"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {i.dueOn?.slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {money(i.payable, i.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!list.length && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No invoices yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Allocation</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p._id}>
                      <TableCell className="font-mono text-sm">
                        {p.ref}
                      </TableCell>
                      <TableCell className="text-sm">
                        {list.find((i) => i._id === p.invoiceId)?.ref ??
                          p.invoiceId}
                      </TableCell>
                      <TableCell className="text-sm">{p.clientName}</TableCell>
                      <TableCell className="text-sm">{p.method}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.matched}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {money(p.amount, p.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!payments.length && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No payments recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create invoice */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New invoice</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Mandate</Label>
              <Select
                value={draft.mandateId}
                onValueChange={(v) => setDraft({ ...draft, mandateId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mandate..." />
                </SelectTrigger>
                <SelectContent>
                  {mandates.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.name} — {m.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Billing model</Label>
                <Select
                  value={draft.model}
                  onValueChange={(v) =>
                    setDraft({ ...draft, model: v as BillingModel })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_MODELS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Currency</Label>
                <Select
                  value={draft.currency}
                  onValueChange={(v) => setDraft({ ...draft, currency: v })}
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Subtotal</Label>
                <Input
                  type="number"
                  value={draft.subtotal}
                  onChange={(e) =>
                    setDraft({ ...draft, subtotal: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Discount</Label>
                <Input
                  type="number"
                  value={draft.discount}
                  onChange={(e) =>
                    setDraft({ ...draft, discount: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>VAT %</Label>
                <Input
                  type="number"
                  value={draft.vatRate}
                  onChange={(e) =>
                    setDraft({ ...draft, vatRate: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>WHT %</Label>
                <Input
                  type="number"
                  value={draft.whtRate}
                  onChange={(e) =>
                    setDraft({ ...draft, whtRate: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Due date</Label>
              <Input
                type="date"
                value={draft.dueOn}
                onChange={(e) => setDraft({ ...draft, dueOn: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!draft.mandateId || !draft.dueOn || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              Create draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice detail */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.ref}</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {selected.clientName} · {selected.mandateName}
                </p>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                {selected.clientAction && (
                  <div
                    className={`flex items-start justify-between gap-3 rounded-lg border p-3 text-sm ${
                      selected.clientAction === "Paid"
                        ? "border-success/40 bg-success/5"
                        : "border-warning/40 bg-warning/5"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        className={`mt-0.5 h-4 w-4 shrink-0 ${selected.clientAction === "Paid" ? "text-success" : "text-warning"}`}
                      />
                      <div>
                        <p className="font-medium">
                          {selected.clientAction === "Paid"
                            ? "Client marked this as paid"
                            : "Client flagged an issue with this invoice"}
                        </p>
                        {selected.clientActionNote && (
                          <p className="text-xs text-muted-foreground">
                            "{selected.clientActionNote}"
                          </p>
                        )}
                        {selected.proofOfPaymentUrl && (
                          <a
                            href={selected.proofOfPaymentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary underline"
                          >
                            <FileText className="h-3 w-3" />
                            {selected.proofOfPaymentFileName ||
                              "View proof of payment"}
                          </a>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {selected.clientActionAt &&
                            new Date(
                              selected.clientActionAt,
                            ).toLocaleString()}{" "}
                          — this is the client's claim, not a confirmed payment
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {selected.clientAction === "Paid" && (
                        <Button
                          size="sm"
                          disabled={markReceivedMut.isPending}
                          onClick={() => markReceivedMut.mutate()}
                        >
                          <Banknote className="mr-2 h-3.5 w-3.5" /> Mark
                          received
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={dismissClaimMut.isPending}
                        onClick={() => dismissClaimMut.mutate()}
                      >
                        <X className="mr-2 h-3.5 w-3.5" /> Dismiss
                      </Button>
                    </div>
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Line</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selected.lines.map((l) => (
                      <TableRow key={l._id}>
                        <TableCell className="text-sm">
                          {l.description}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {l.qty}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {money(l.unit, selected.currency)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {money(l.qty * l.unit, selected.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="space-y-1 rounded border p-3 text-sm">
                  {[
                    ["Net of discount", selected.net],
                    [`VAT (${selected.vatRate}%)`, selected.vat],
                    [`WHT (${selected.whtRate}%)`, -selected.wht],
                    ["Payable", selected.payable],
                  ].map(([l, v]) => (
                    <div key={String(l)} className="flex justify-between">
                      <span className="text-muted-foreground">{l}</span>
                      <span className="font-medium">
                        {money(Number(v), selected.currency)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid</span>
                    <span>{money(selected.paidAmount, selected.currency)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selected.stage === "Draft" && (
                    <Button
                      size="sm"
                      disabled={submitMut.isPending}
                      onClick={() => submitMut.mutate(selected._id)}
                    >
                      Submit for review
                    </Button>
                  )}
                  {selected.stage === "In Review" && (
                    <Button
                      size="sm"
                      disabled={approveMut.isPending}
                      onClick={() => approveMut.mutate(selected._id)}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                    </Button>
                  )}
                  {selected.stage === "Approved" && (
                    <Button
                      size="sm"
                      disabled={sendMut.isPending}
                      onClick={() => sendMut.mutate(selected._id)}
                    >
                      <Send className="mr-2 h-4 w-4" /> Send to client
                    </Button>
                  )}
                  {["Sent", "Part Paid", "Overdue"].includes(
                    selected.stage,
                  ) && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={payMethod}
                        onValueChange={(v) => setPayMethod(v as PaymentMethod)}
                      >
                        <SelectTrigger className="h-8 w-40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Full balance"
                        className="h-8 w-32 text-xs"
                        value={payAmount}
                        onChange={(e) =>
                          setPayAmount(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                      />
                      <Button
                        size="sm"
                        disabled={payMut.isPending}
                        onClick={() => payMut.mutate()}
                      >
                        <Banknote className="mr-2 h-4 w-4" /> Record payment
                      </Button>
                    </div>
                  )}
                  {!["Draft", "Written Off", "Paid"].includes(
                    selected.stage,
                  ) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCnAmount(0);
                        setCnReason("");
                        setCnApprover("");
                        setCnOpen(true);
                      }}
                    >
                      Issue credit note
                    </Button>
                  )}
                  {selected.stage !== "Written Off" &&
                    selected.stage !== "Paid" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setWoReason("");
                          setWoApprover("");
                          setWoOpen(true);
                        }}
                      >
                        Write off
                      </Button>
                    )}
                </div>
                {selected.writeOffReason && (
                  <p className="rounded border p-2 text-xs text-muted-foreground">
                    Written off: {selected.writeOffReason}
                  </p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Write off */}
      <Dialog open={woOpen} onOpenChange={setWoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Write off as bad debt</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Reason</Label>
              <Textarea
                value={woReason}
                onChange={(e) => setWoReason(e.target.value)}
              />
            </div>
            <div>
              <Label>Approved by</Label>
              <Input
                value={woApprover}
                onChange={(e) => setWoApprover(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={!woReason || !woApprover || writeOffMut.isPending}
              onClick={() => writeOffMut.mutate()}
            >
              Write off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit note */}
      <Dialog open={cnOpen} onOpenChange={setCnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue credit note</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={cnAmount}
                onChange={(e) => setCnAmount(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea
                value={cnReason}
                onChange={(e) => setCnReason(e.target.value)}
              />
            </div>
            <div>
              <Label>Approved by</Label>
              <Input
                value={cnApprover}
                onChange={(e) => setCnApprover(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !cnAmount || !cnReason || !cnApprover || creditNoteMut.isPending
              }
              onClick={() => creditNoteMut.mutate()}
            >
              Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
