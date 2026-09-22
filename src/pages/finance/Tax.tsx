import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  RefreshCw,
  MoreHorizontal,
  Pencil,
  Download,
  Paperclip,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  useFinanceCurrency,
  FINANCE_CURRENCIES,
} from "@/hooks/use-finance-currency";
import { WorkflowTable } from "@/components/finance/WorkflowTable";
import {
  fetchTaxObligations,
  createTaxObligation,
  fileTaxObligation,
  fetchVatReturn,
  fetchPayrollTax,
  fetchCitProvision,
  fetchWhtRegister,
  fetchEbmStatus,
  resyncEbm,
  updateEbmReceipt,
  deleteEbmReceipt,
  type EbmDocument,
  type TaxObligationType,
  type TaxRecurringFrequency,
} from "@/lib/crm/finance-api";
import { Checkbox } from "@/components/ui/checkbox";

// Tolerant of null/undefined/NaN — a single missing field on one
// record (an older payroll run without totalEmployerContributions,
// for instance) shouldn't be able to crash the whole page. Falls
// back to 0 rather than throwing.
const money = (n: number | null | undefined, c = "RWF") => {
  const safe = typeof n === "number" && !Number.isNaN(n) ? n : 0;
  return safe.toLocaleString(undefined, {
    style: "currency",
    currency: c,
  });
};

const statusClass = (s: string) =>
  s === "Filed" || s === "Remitted" || s === "Synced" || s === "paid"
    ? "bg-success/10 text-success"
    : s === "Error"
      ? "bg-destructive/10 text-destructive"
      : "bg-warning/10 text-warning";

const OBLIGATION_TYPES: TaxObligationType[] = [
  "VAT return",
  "PAYE remittance",
  "RSSB contributions",
  "WHT remittance",
  "CIT provisional",
];

const RECURRING_FREQUENCIES: TaxRecurringFrequency[] = [
  "Monthly",
  "Quarterly",
  "Annually",
];

const taxWorkflow = [
  {
    action: "Review tax calendar",
    detail: "Upcoming RRA and RSSB obligations with due dates and amounts",
    owner: "Finance manager",
    trigger: "Start of month",
  },
  {
    action: "Prepare VAT return",
    detail:
      "Real output VAT from invoices and input VAT from bills, reconciled to the ledger",
    owner: "Accountant",
    trigger: "By the 10th",
  },
  {
    action: "Prepare PAYE & RSSB",
    detail:
      "Payroll declarations sourced directly from the authorised payroll run",
    owner: "Accountant",
    trigger: "After payroll",
  },
  {
    action: "Calculate WHT",
    detail:
      "15% on non-resident payments; gross / WHT / net computed and a certificate recorded automatically",
    owner: "Tax module (single source)",
    trigger: "Bill payment or invoice sent",
  },
  {
    action: "File and remit",
    detail:
      "Return filed, payment made, acknowledgement filed against the obligation",
    owner: "Finance manager",
    trigger: "By the 15th",
  },
  {
    action: "Provision CIT",
    detail: "Quarterly provisional CIT computed at 28% of profit before tax",
    owner: "Finance manager",
    trigger: "Quarter end",
  },
];

export default function Tax() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: calendar = [] } = useQuery({
    queryKey: ["taxObligations"],
    queryFn: fetchTaxObligations,
  });
  const [financeCurrency, setFinanceCurrency] = useFinanceCurrency();
  const { data: vat } = useQuery({
    queryKey: ["vatReturn", financeCurrency],
    queryFn: () => fetchVatReturn(undefined, financeCurrency || undefined),
  });
  const { data: payrollTax = [] } = useQuery({
    queryKey: ["payrollTax"],
    queryFn: fetchPayrollTax,
  });
  const { data: cit } = useQuery({
    queryKey: ["citProvision", financeCurrency],
    queryFn: () => fetchCitProvision(financeCurrency || undefined),
  });
  const { data: whtRegister = [] } = useQuery({
    queryKey: ["whtRegister"],
    queryFn: fetchWhtRegister,
  });
  const { data: ebm = [] } = useQuery({
    queryKey: ["ebmStatus"],
    queryFn: fetchEbmStatus,
  });

  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const [newObligationOpen, setNewObligationOpen] = useState(false);
  const [obligationDraft, setObligationDraft] = useState({
    type: "VAT return" as TaxObligationType,
    period: "",
    dueOn: "",
    amount: 0,
    recurring: false,
    frequency: "Monthly" as TaxRecurringFrequency,
  });
  const createObligationMut = useMutation({
    mutationFn: () =>
      createTaxObligation({
        type: obligationDraft.type,
        period: obligationDraft.period,
        dueOn: obligationDraft.dueOn,
        amount: obligationDraft.amount,
        recurring: obligationDraft.recurring,
        ...(obligationDraft.recurring
          ? { frequency: obligationDraft.frequency }
          : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxObligations"] });
      setNewObligationOpen(false);
      setObligationDraft({
        type: "VAT return",
        period: "",
        dueOn: "",
        amount: 0,
        recurring: false,
        frequency: "Monthly",
      });
      toast({ title: "Added to tax calendar" });
    },
    onError: onErr("Failed to add obligation"),
  });
  const fileMut = useMutation({
    mutationFn: (id: string) => fileTaxObligation(id),
    onSuccess: (o) => {
      queryClient.invalidateQueries({ queryKey: ["taxObligations"] });
      toast({
        title: "Filed to RRA",
        description: `${o.type} (${o.period}) submitted.`,
      });
    },
    onError: onErr("Failed to file"),
  });
  const resyncMut = useMutation({
    mutationFn: (invoiceId: string) => resyncEbm(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ebmStatus"] });
      toast({ title: "Re-synced to EBM" });
    },
    onError: onErr("Failed to re-sync"),
  });

  // Update receipt — the real number off the physical EBM
  // device/slip, no longer auto-generated, with an optional photo
  // or scan of the receipt as evidence.
  const [receiptTarget, setReceiptTarget] = useState<EbmDocument | null>(null);
  const [receiptNumberDraft, setReceiptNumberDraft] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const updateReceiptMut = useMutation({
    mutationFn: () =>
      updateEbmReceipt(receiptTarget!._id, receiptNumberDraft, receiptFile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ebmStatus"] });
      setReceiptTarget(null);
      setReceiptNumberDraft("");
      setReceiptFile(null);
      toast({ title: "Receipt recorded" });
    },
    onError: onErr("Failed to update receipt"),
  });

  // Delete a manually-recorded receipt — there's no standalone EBM
  // record to delete (rows are derived live off the invoice), so this
  // clears the receipt number/file and reverts the document back to
  // Pending.
  const [deleteTarget, setDeleteTarget] = useState<EbmDocument | null>(null);
  const deleteReceiptMut = useMutation({
    mutationFn: () => deleteEbmReceipt(deleteTarget!._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ebmStatus"] });
      setDeleteTarget(null);
      toast({ title: "Receipt deleted" });
    },
    onError: onErr("Failed to delete receipt"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tax</h1>
          <p className="text-sm text-muted-foreground">
            RRA and RSSB obligations: VAT, PAYE, RSSB, CIT, WHT and EBM
            compliance
          </p>
        </div>
        <Select
          value={financeCurrency || "base"}
          onValueChange={(v) => setFinanceCurrency(v === "base" ? "" : v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="base">
              {vat?.currency ? `Base (${vat.currency})` : "Base currency"}
            </SelectItem>
            {FINANCE_CURRENCIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="calendar">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="calendar">Tax calendar</TabsTrigger>
          <TabsTrigger value="vat">VAT</TabsTrigger>
          <TabsTrigger value="payroll">PAYE & RSSB</TabsTrigger>
          <TabsTrigger value="cit">CIT</TabsTrigger>
          <TabsTrigger value="wht">WHT</TabsTrigger>
          <TabsTrigger value="ebm">EBM</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
        </TabsList>

        {/* Tax calendar */}
        <TabsContent value="calendar" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setNewObligationOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Add obligation
            </Button>
          </div>
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Obligation</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calendar.map((t) => (
                    <TableRow key={t._id}>
                      <TableCell className="font-medium text-sm">
                        {t.type}
                      </TableCell>
                      <TableCell className="text-sm">{t.period}</TableCell>
                      <TableCell className="text-sm">
                        {t.dueOn?.slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-sm font-semibold">
                        {money(t.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${statusClass(t.status)}`}>
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {t.status !== "Filed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={fileMut.isPending}
                            onClick={() => fileMut.mutate(t._id)}
                          >
                            File return
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!calendar.length && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No obligations on the calendar yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VAT */}
        <TabsContent value="vat" className="space-y-4 mt-4">
          {vat && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  ["Output VAT", vat.outputVat],
                  ["Input VAT", vat.inputVat],
                  ["Net payable", vat.netPayable],
                ].map(([l, v]) => (
                  <Card key={l as string}>
                    <CardContent className="p-5">
                      <p className="text-sm text-muted-foreground">
                        {l as string}
                      </p>
                      <p className="text-xl font-bold">
                        {money(v as number, vat.currency)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    VAT return — {vat.period}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Classification</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Base</TableHead>
                        <TableHead>VAT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(vat.lines ?? []).map((v, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">
                            {v.category}
                          </TableCell>
                          <TableCell className="text-sm">{v.type}</TableCell>
                          <TableCell className="text-sm">
                            {money(v.base)}
                          </TableCell>
                          <TableCell className="text-sm font-semibold">
                            {money(v.vat)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!vat.lines?.length && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="py-8 text-center text-sm text-muted-foreground"
                          >
                            No VAT-relevant invoices or bills this period.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* PAYE & RSSB */}
        <TabsContent value="payroll" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                PAYE & RSSB remittances
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Sourced from real, approved HR payroll runs — PAYE and RSSB
                (pension, maternity, occupational hazard) taken directly from
                each payslip's own deduction lines.
              </p>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>PAYE</TableHead>
                    <TableHead>RSSB</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollTax.map((p) => (
                    <TableRow key={p.period}>
                      <TableCell className="text-sm font-medium">
                        {p.period}
                      </TableCell>
                      <TableCell className="text-sm">
                        {money(p.gross)}
                      </TableCell>
                      <TableCell className="text-sm">{money(p.paye)}</TableCell>
                      <TableCell className="text-sm">{money(p.rssb)}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${statusClass(p.status)}`}>
                          {p.status === "paid" ? "Remitted" : "Pending"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!payrollTax.length && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
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

        {/* CIT */}
        <TabsContent value="cit" className="mt-4">
          {cit && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Corporate income tax — {cit.citRate ?? 28}%
                </CardTitle>
                <p className="text-xs text-muted-foreground">{cit.note}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  ["Revenue (from paid invoices)", cit.revenue],
                  [
                    "Expenses (paid bills + payroll)",
                    cit.expenses != null ? -cit.expenses : null,
                  ],
                  ["Profit before tax", cit.profitBeforeTax],
                  [`CIT at ${cit.citRate ?? 28}%`, cit.citAtRate],
                ].map(([l, v]) => (
                  <div
                    key={l as string}
                    className="flex items-center justify-between border-b pb-2 text-sm"
                  >
                    <span className="text-muted-foreground">{l as string}</span>
                    <span className="font-medium">
                      {money(v as number | null, cit.currency)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* WHT */}
        <TabsContent value="wht" className="mt-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            Single source of truth for withholding tax: 15% on non-resident
            payments, gross / WHT / net. Invoicing and bill payments both call
            this register directly — they don't recalculate WHT themselves.
          </p>
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Counterparty</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>WHT</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Certificate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {whtRegister.map((w) => (
                    <TableRow key={w._id}>
                      <TableCell className="text-sm font-medium">
                        {w.counterparty}
                      </TableCell>
                      <TableCell className="text-sm">{w.direction}</TableCell>
                      <TableCell className="text-sm">{w.sourceRef}</TableCell>
                      <TableCell className="text-sm">
                        {money(w.gross)}
                      </TableCell>
                      <TableCell className="text-sm">{w.rate}%</TableCell>
                      <TableCell className="text-sm font-semibold">
                        {money(w.wht)}
                      </TableCell>
                      <TableCell className="text-sm">{money(w.net)}</TableCell>
                      <TableCell className="text-sm">
                        {w.certificateRef}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!whtRegister.length && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No WHT events yet — these appear automatically when a
                        bill is paid to a WHT-liable vendor, or an invoice with
                        a WHT rate is sent.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EBM */}
        <TabsContent value="ebm" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">EBM reconciliation</CardTitle>
              <Button
                size="sm"
                variant="outline"
                disabled={!ebm.length}
                onClick={() => {
                  const headers = [
                    "Document",
                    "Receipt number",
                    "Classification",
                    "Status",
                  ];
                  const rows = ebm.map((e) => [
                    e.document,
                    e.receipt,
                    e.classification,
                    e.status,
                  ]);
                  const csv = [headers, ...rows]
                    .map((r) =>
                      r
                        .map((v) => {
                          const s = String(v ?? "");
                          return /[",\n]/.test(s)
                            ? `"${s.replace(/"/g, '""')}"`
                            : s;
                        })
                        .join(","),
                    )
                    .join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `ebm-reconciliation-${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="mr-2 h-3.5 w-3.5" /> Download report
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Receipt number</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ebm.map((e) => (
                    <TableRow key={e._id}>
                      <TableCell className="text-sm font-medium">
                        {e.document}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1.5">
                          {e.receipt}
                          {e.receiptFileUrl && (
                            <a
                              href={e.receiptFileUrl}
                              target="_blank"
                              rel="noreferrer"
                              title={e.receiptFileName || "Receipt file"}
                              className="text-muted-foreground hover:text-primary"
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {e.classification}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${statusClass(e.status)}`}>
                          {e.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              disabled={resyncMut.isPending}
                              onClick={() => resyncMut.mutate(e._id)}
                            >
                              <RefreshCw className="mr-2 h-3.5 w-3.5" /> Re-sync
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setReceiptTarget(e);
                                setReceiptNumberDraft(
                                  e.receipt === "—" ? "" : e.receipt,
                                );
                                setReceiptFile(null);
                              }}
                            >
                              <Pencil className="mr-2 h-3.5 w-3.5" /> Update
                              receipt number
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={e.receipt === "—" && !e.receiptFileUrl}
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(e)}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                              receipt
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!ebm.length && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No invoices to reconcile yet.
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
            title="How tax compliance is used"
            steps={taxWorkflow}
          />
        </TabsContent>
      </Tabs>

      {/* New obligation */}
      <Dialog open={newObligationOpen} onOpenChange={setNewObligationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to tax calendar</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Obligation</Label>
              <Select
                value={obligationDraft.type}
                onValueChange={(v) =>
                  setObligationDraft({
                    ...obligationDraft,
                    type: v as TaxObligationType,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OBLIGATION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Period</Label>
              <Input
                value={obligationDraft.period}
                onChange={(e) =>
                  setObligationDraft({
                    ...obligationDraft,
                    period: e.target.value,
                  })
                }
                placeholder="e.g. July 2026"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={obligationDraft.dueOn}
                  onChange={(e) =>
                    setObligationDraft({
                      ...obligationDraft,
                      dueOn: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={obligationDraft.amount}
                  onChange={(e) =>
                    setObligationDraft({
                      ...obligationDraft,
                      amount: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="obligation-recurring"
                checked={obligationDraft.recurring}
                onCheckedChange={(v) =>
                  setObligationDraft({
                    ...obligationDraft,
                    recurring: v === true,
                  })
                }
              />
              <Label htmlFor="obligation-recurring" className="cursor-pointer">
                Recurring — add to calendar and remind me automatically
              </Label>
            </div>
            {obligationDraft.recurring && (
              <div>
                <Label>Frequency</Label>
                <Select
                  value={obligationDraft.frequency}
                  onValueChange={(v) =>
                    setObligationDraft({
                      ...obligationDraft,
                      frequency: v as TaxRecurringFrequency,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECURRING_FREQUENCIES.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  A new obligation is created and a reminder (email and portal)
                  is sent ahead of each due date, on this cadence.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              disabled={
                !obligationDraft.period ||
                !obligationDraft.dueOn ||
                createObligationMut.isPending
              }
              onClick={() => createObligationMut.mutate()}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update EBM receipt — the real number off the physical
          device/slip, never auto-generated, with an optional photo
          or scan of the receipt as evidence. */}
      <Dialog
        open={!!receiptTarget}
        onOpenChange={(open) => !open && setReceiptTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update receipt number</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Document</Label>
              <p className="text-sm text-muted-foreground">
                {receiptTarget?.document}
              </p>
            </div>
            <div>
              <Label>Receipt number</Label>
              <Input
                value={receiptNumberDraft}
                onChange={(e) => setReceiptNumberDraft(e.target.value)}
                placeholder="As printed on the EBM receipt"
              />
            </div>
            <div>
              <Label>Attach receipt (image or PDF)</Label>
              <Input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              />
              {receiptTarget?.receiptFileUrl && !receiptFile && (
                <p className="mt-1 text-xs text-muted-foreground">
                  A receipt file is already attached — choose a new one to
                  replace it.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !receiptNumberDraft.trim() || updateReceiptMut.isPending
              }
              onClick={() => updateReceiptMut.mutate()}
            >
              Save receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete EBM receipt confirm — clears the recorded receipt
          number/file and reverts the document back to Pending. There's
          no standalone EBM record: this never touches the invoice
          itself. */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete receipt for "{deleteTarget?.document}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This clears the recorded receipt number and attached file, and
              reverts this document back to Pending. It does not delete the
              underlying invoice.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteReceiptMut.isPending}
              onClick={() => deleteReceiptMut.mutate()}
            >
              {deleteReceiptMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
