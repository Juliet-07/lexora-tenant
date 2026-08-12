import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  Bell,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  pmInvoices as seed,
  PmInvoice,
  InvoiceStage,
  invoiceTotal,
  wipEntries,
  dunningLog,
  paymentsReceived,
  mandates,
  money,
} from "@/data/crmPmMockData";

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

const ageBucket = (dueOn: string) => {
  const days = Math.floor(
    (new Date("2026-07-30").getTime() - new Date(dueOn).getTime()) / 86400000,
  );
  if (days <= 0) return "Current";
  if (days <= 30) return "1–30 days";
  if (days <= 60) return "31–60 days";
  if (days <= 90) return "61–90 days";
  return "90+ days";
};

export default function Invoicing() {
  const [list, setList] = useState<PmInvoice[]>(seed);
  const [selected, setSelected] = useState<PmInvoice | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [payments, setPayments] = useState(paymentsReceived);
  const [draft, setDraft] = useState({
    mandateId: mandates[0].id,
    model: "Time & materials" as PmInvoice["model"],
    currency: "USD" as PmInvoice["currency"],
    subtotal: 0,
    vatRate: 18,
    whtRate: 5,
    discount: 0,
    dueOn: "",
    proforma: false,
  });
  const { toast } = useToast();

  const patch = (id: string, p: Partial<PmInvoice>) => {
    setList((l) => l.map((i) => (i.id === id ? { ...i, ...p } : i)));
    setSelected((s) => (s && s.id === id ? { ...s, ...p } : s));
  };

  const totalWip = wipEntries.reduce((s, w) => s + w.value, 0);
  const receivables = list
    .filter((i) => !["Paid", "Draft", "Written Off"].includes(i.stage))
    .reduce((s, i) => s + invoiceTotal(i).payable - i.paidAmount, 0);
  const collected = list.reduce((s, i) => s + i.paidAmount, 0);

  const aged = ["Current", "1–30 days", "31–60 days", "61–90 days", "90+ days"].map(
    (b) => ({
      bucket: b,
      value: list
        .filter(
          (i) =>
            !["Paid", "Draft", "Written Off"].includes(i.stage) &&
            ageBucket(i.dueOn) === b,
        )
        .reduce((s, i) => s + invoiceTotal(i).payable - i.paidAmount, 0),
    }),
  );

  const createFromWip = (wipId: string) => {
    const w = wipEntries.find((x) => x.id === wipId)!;
    const inv: PmInvoice = {
      id: `INV-2026-${String(50 + list.length)}`,
      clientName: w.clientName,
      mandateId: w.mandateId,
      mandateName: w.mandateName,
      currency: "USD",
      subtotal: w.value,
      vatRate: 18,
      whtRate: 5,
      discount: 0,
      stage: "Draft",
      issuedOn: new Date().toISOString().slice(0, 10),
      dueOn: "2026-08-30",
      paidAmount: 0,
      openedByClient: false,
      model: "Time & materials",
      lines: [
        { description: `${w.hours} hrs from approved timesheets`, qty: 1, unit: w.value },
      ],
    };
    setList([inv, ...list]);
    toast({
      title: "Invoice drafted from WIP",
      description: `${inv.id} · ${money(w.value)} · VAT and WHT calculated.`,
    });
  };

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
          { l: "Collected (period)", v: money(collected) },
          {
            l: "Overdue",
            v: money(
              list
                .filter((i) => i.stage === "Overdue")
                .reduce((s, i) => s + invoiceTotal(i).payable, 0),
            ),
          },
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
        WIP review, aged receivables and credit control live in Sales — this page is the invoice list and
        creation flow. Billing model is set on the mandate; invoice branding lives in Finance settings.
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
                  {list.map((i) => {
                    const t = invoiceTotal(i);
                    return (
                      <TableRow
                        key={i.id}
                        className="cursor-pointer"
                        onClick={() => setSelected(i)}
                      >
                        <TableCell>
                          <p className="font-mono text-sm">{i.id}</p>
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
                        </TableCell>
                        <TableCell className="text-sm">{i.dueOn}</TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {money(t.payable, i.currency)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-sm">{p.id}</TableCell>
                      <TableCell className="text-sm">{p.invoiceId}</TableCell>
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mandates.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
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
                    setDraft({ ...draft, model: v as PmInvoice["model"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Time & materials", "Fixed fee", "Retainer", "Milestone"].map(
                      (m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Currency</Label>
                <Select
                  value={draft.currency}
                  onValueChange={(v) =>
                    setDraft({ ...draft, currency: v as PmInvoice["currency"] })
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
              onClick={() => {
                const m = mandates.find((x) => x.id === draft.mandateId)!;
                setList([
                  {
                    id: `INV-2026-${String(50 + list.length)}`,
                    clientName: m.clientName,
                    mandateId: m.id,
                    mandateName: m.name,
                    currency: draft.currency,
                    subtotal: Number(draft.subtotal),
                    vatRate: Number(draft.vatRate),
                    whtRate: Number(draft.whtRate),
                    discount: Number(draft.discount),
                    stage: "Draft",
                    issuedOn: new Date().toISOString().slice(0, 10),
                    dueOn: draft.dueOn || "2026-08-31",
                    paidAmount: 0,
                    openedByClient: false,
                    model: draft.model,
                    lines: [
                      { description: `${draft.model} fees`, qty: 1, unit: Number(draft.subtotal) },
                    ],
                  },
                  ...list,
                ]);
                setOpenNew(false);
                toast({ title: "Draft invoice created" });
              }}
            >
              Create draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice detail */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.id}</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {selected.clientName} · {selected.mandateName}
                </p>
              </SheetHeader>

              <div className="mt-4 space-y-4">
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
                    {selected.lines.map((l, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">{l.description}</TableCell>
                        <TableCell className="text-right text-sm">{l.qty}</TableCell>
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

                {(() => {
                  const t = invoiceTotal(selected);
                  return (
                    <div className="space-y-1 rounded border p-3 text-sm">
                      {[
                        ["Net of discount", t.net],
                        [`VAT (${selected.vatRate}%)`, t.vat],
                        [`WHT (${selected.whtRate}%)`, -t.wht],
                        ["Payable", t.payable],
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
                  );
                })()}

                <div className="flex flex-wrap gap-2">
                  {selected.stage === "Draft" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        patch(selected.id, { stage: "In Review" });
                        toast({ title: "Sent for partner review" });
                      }}
                    >
                      Submit for review
                    </Button>
                  )}
                  {selected.stage === "In Review" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        patch(selected.id, { stage: "Approved" });
                        toast({ title: "Approved by partner" });
                      }}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                    </Button>
                  )}
                  {selected.stage === "Approved" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        patch(selected.id, { stage: "Sent" });
                        toast({
                          title: "Invoice delivered",
                          description: "Sent via client portal and email.",
                        });
                      }}
                    >
                      <Send className="mr-2 h-4 w-4" /> Send to client
                    </Button>
                  )}
                  {["Sent", "Part Paid", "Overdue"].includes(selected.stage) && (
                    <Button
                      size="sm"
                      onClick={() => {
                        const t = invoiceTotal(selected);
                        patch(selected.id, {
                          stage: "Paid",
                          paidAmount: t.payable,
                        });
                        setPayments((p) => [
                          {
                            id: `PMT-${p.length + 101}`,
                            invoiceId: selected.id,
                            clientName: selected.clientName,
                            amount: t.payable,
                            currency: selected.currency,
                            method: "Bank feed",
                            matched: "Auto-matched",
                            at: new Date().toISOString().slice(0, 10),
                          },
                          ...p,
                        ]);
                        toast({
                          title: "Payment recorded",
                          description: "Allocated and posted to the accounting engine.",
                        });
                      }}
                    >
                      <Banknote className="mr-2 h-4 w-4" /> Record payment
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      patch(selected.id, { stage: "Written Off" });
                      toast({ title: "Written off after bad debt review" });
                    }}
                  >
                    Write off
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
