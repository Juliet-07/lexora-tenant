import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  FileText,
  ReceiptText,
  RefreshCw,
  AlertTriangle,
  Send,
} from "lucide-react";
import { ClientSelect } from "@/components/ClientDropdown";
import { fetchMandates, money } from "@/lib/crm/mandates-api";
import {
  fetchWipRegister,
  wipValue,
  wipAgeDays,
  wipBand,
  approveWipForBilling,
  writeDownWip,
  writeOffWip,
  holdWip,
  createInvoiceFromWip,
  fetchInvoices,
  ageBucket,
  daysOverdue,
  addDunningEvent,
  setDunningPaused,
  fetchQuotes,
  createQuote,
  setQuoteStatus,
  convertQuoteToInvoice,
  fetchCreditNotes,
  fetchRecurringInvoices,
  createRecurringInvoice,
  setRecurringStatus,
  generateRecurringNow,
  fetchPaymentPlans,
  createPaymentPlan,
  markInstalmentPaid,
  type WipEntry,
  type Invoice,
  type Quote,
  type QuoteKind,
  type RecurringFrequency,
} from "@/lib/crm/finance-api";

const badge = (s: string) => {
  if (
    ["Accepted", "Paid", "Active", "Approved for billing", "Synced"].includes(s)
  )
    return "bg-success/10 text-success";
  if (["Sent", "Unbilled", "Pending", "Scheduled", "Held"].includes(s))
    return "bg-warning/10 text-warning";
  if (["Declined", "Expired", "Written off", "Overdue", "Error"].includes(s))
    return "bg-destructive/10 text-destructive";
  return "bg-muted text-muted-foreground";
};

const BAD_DEBT_BANDS = [
  { band: "Current–89 days", pct: 0 },
  { band: "90–119 days", pct: 25 },
  { band: "120–179 days", pct: 50 },
  { band: "180+ days", pct: 100 },
];

export default function Sales() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: mandates = [] } = useQuery({
    queryKey: ["mandates"],
    queryFn: fetchMandates,
  });
  const { data: wipList = [], isLoading: wipLoading } = useQuery({
    queryKey: ["wipRegister"],
    queryFn: () => fetchWipRegister(),
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => fetchInvoices(),
  });
  const { data: quotes = [] } = useQuery({
    queryKey: ["quotes"],
    queryFn: fetchQuotes,
  });
  const { data: creditNotes = [] } = useQuery({
    queryKey: ["creditNotes"],
    queryFn: fetchCreditNotes,
  });
  const { data: recurring = [] } = useQuery({
    queryKey: ["recurringInvoices"],
    queryFn: fetchRecurringInvoices,
  });
  const { data: paymentPlans = [] } = useQuery({
    queryKey: ["paymentPlans"],
    queryFn: fetchPaymentPlans,
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [wipReviewTarget, setWipReviewTarget] = useState<{
    entry: WipEntry;
    action: "writeDown" | "writeOff" | "hold";
  } | null>(null);
  const [reviewAmount, setReviewAmount] = useState(0);
  const [reviewReason, setReviewReason] = useState("");
  const [reviewApprover, setReviewApprover] = useState("");
  const [genInvoiceOpen, setGenInvoiceOpen] = useState(false);
  const [genDueOn, setGenDueOn] = useState("");
  const [genVat, setGenVat] = useState(18);
  const [genWht, setGenWht] = useState(0);

  const [selectedReceivable, setSelectedReceivable] = useState<Invoice | null>(
    null,
  );

  const [newQuoteOpen, setNewQuoteOpen] = useState(false);
  const [quoteDraft, setQuoteDraft] = useState({
    clientId: "",
    clientName: "",
    mandateId: "",
    title: "",
    amount: 0,
    currency: "USD",
    expires: "",
    kind: "Quote" as QuoteKind,
  });

  const [newRecurringOpen, setNewRecurringOpen] = useState(false);
  const [recurringDraft, setRecurringDraft] = useState({
    mandateId: "",
    description: "",
    amount: 0,
    currency: "USD",
    frequency: "Monthly" as RecurringFrequency,
    nextRun: "",
  });

  const [planInvoiceId, setPlanInvoiceId] = useState<string | null>(null);
  const [planInstalments, setPlanInstalments] = useState<
    { due: string; amount: number }[]
  >([{ due: "", amount: 0 }]);

  const invalidateWip = () =>
    queryClient.invalidateQueries({ queryKey: ["wipRegister"] });
  const invalidateInvoices = () =>
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const totals = useMemo(() => {
    const unbilled = wipList.reduce((s, w) => s + wipValue(w), 0);
    const outstanding = invoices.filter(
      (i) => !["Paid", "Draft", "Written Off"].includes(i.stage),
    );
    const ar = outstanding.reduce((s, i) => s + (i.payable - i.paidAmount), 0);
    const overdue = outstanding
      .filter((i) => daysOverdue(i.dueOn) > 0)
      .reduce((s, i) => s + (i.payable - i.paidAmount), 0);
    const avgWipAge = wipList.length
      ? wipList.reduce((s, w) => s + wipAgeDays(w), 0) / wipList.length
      : 0;
    const avgArAge = outstanding.length
      ? outstanding.reduce((s, i) => s + daysOverdue(i.dueOn), 0) /
        outstanding.length
      : 0;
    return {
      unbilled,
      ar,
      overdue,
      lockUpDays: Math.round(avgWipAge + avgArAge),
    };
  }, [wipList, invoices]);

  const approveMut = useMutation({
    mutationFn: (id: string) => approveWipForBilling(id),
    onSuccess: invalidateWip,
    onError: onErr("Failed to approve"),
  });
  const holdMut = useMutation({
    mutationFn: () =>
      holdWip(wipReviewTarget!.entry._id, reviewReason || undefined),
    onSuccess: () => {
      invalidateWip();
      setWipReviewTarget(null);
    },
    onError: onErr("Failed to hold"),
  });
  const writeDownMut = useMutation({
    mutationFn: () =>
      writeDownWip(
        wipReviewTarget!.entry._id,
        reviewAmount,
        reviewReason,
        reviewApprover,
      ),
    onSuccess: () => {
      invalidateWip();
      setWipReviewTarget(null);
      toast({ title: "Written down" });
    },
    onError: onErr("Failed to write down"),
  });
  const writeOffWipMut = useMutation({
    mutationFn: () =>
      writeOffWip(wipReviewTarget!.entry._id, reviewReason, reviewApprover),
    onSuccess: () => {
      invalidateWip();
      setWipReviewTarget(null);
      toast({ title: "Written off" });
    },
    onError: onErr("Failed to write off"),
  });

  const selectedEntries = wipList.filter((w) => selectedIds.includes(w._id));
  const selectedMandateId = selectedEntries[0]?.mandateId;
  const canGenerate =
    selectedEntries.length > 0 &&
    selectedEntries.every((e) => e.mandateId === selectedMandateId);

  const generateInvoiceMut = useMutation({
    mutationFn: () =>
      createInvoiceFromWip({
        mandateId: selectedMandateId!,
        timeEntryIds: selectedIds,
        dueOn: genDueOn,
        vatRate: genVat,
        whtRate: genWht,
      }),
    onSuccess: (inv) => {
      invalidateWip();
      invalidateInvoices();
      setGenInvoiceOpen(false);
      setSelectedIds([]);
      toast({
        title: "Invoice drafted from WIP",
        description: `${inv.ref} · ${money(inv.payable, inv.currency)}`,
      });
    },
    onError: onErr("Failed to generate invoice"),
  });

  const dunningMut = useMutation({
    mutationFn: ({
      id,
      action,
      note,
    }: {
      id: string;
      action: string;
      note?: string;
    }) => addDunningEvent(id, action, "You", note),
    onSuccess: () => {
      invalidateInvoices();
      toast({ title: "Logged" });
    },
    onError: onErr("Failed to log action"),
  });
  const pauseMut = useMutation({
    mutationFn: ({ id, paused }: { id: string; paused: boolean }) =>
      setDunningPaused(id, paused),
    onSuccess: invalidateInvoices,
  });

  const createQuoteMut = useMutation({
    mutationFn: () =>
      createQuote({
        clientUserId: quoteDraft.clientId,
        clientName: quoteDraft.clientName,
        mandateId: quoteDraft.mandateId || undefined,
        title: quoteDraft.title,
        amount: Number(quoteDraft.amount),
        currency: quoteDraft.currency,
        expires: quoteDraft.expires,
        kind: quoteDraft.kind,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      setNewQuoteOpen(false);
      toast({ title: `${quoteDraft.kind} created` });
    },
    onError: onErr("Failed to create"),
  });
  const convertQuoteMut = useMutation({
    mutationFn: (id: string) =>
      convertQuoteToInvoice(
        id,
        new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      ),
    onSuccess: ({ invoice }) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      invalidateInvoices();
      toast({
        title: "Converted",
        description: `${invoice.ref} created as a draft invoice.`,
      });
    },
    onError: onErr("Failed to convert"),
  });

  const createRecurringMut = useMutation({
    mutationFn: () => {
      const m = mandates.find((x) => x._id === recurringDraft.mandateId)!;
      return createRecurringInvoice({
        clientUserId: m.clientUserId,
        clientName: m.clientName,
        mandateId: m._id,
        mandateName: m.name,
        description: recurringDraft.description,
        amount: Number(recurringDraft.amount),
        currency: recurringDraft.currency,
        frequency: recurringDraft.frequency,
        nextRun: recurringDraft.nextRun,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurringInvoices"] });
      setNewRecurringOpen(false);
      toast({ title: "Recurring schedule created" });
    },
    onError: onErr("Failed to create"),
  });
  const generateRecurringMut = useMutation({
    mutationFn: (id: string) => generateRecurringNow(id),
    onSuccess: ({ invoice }) => {
      queryClient.invalidateQueries({ queryKey: ["recurringInvoices"] });
      invalidateInvoices();
      toast({ title: "Generated", description: `${invoice.ref} created.` });
    },
    onError: onErr("Failed to generate"),
  });

  const createPlanMut = useMutation({
    mutationFn: () =>
      createPaymentPlan({
        invoiceId: planInvoiceId!,
        instalments: planInstalments,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentPlans"] });
      invalidateInvoices();
      setPlanInvoiceId(null);
      toast({
        title: "Payment plan agreed",
        description: "Dunning paused while the client stays compliant.",
      });
    },
    onError: onErr("Failed to create plan"),
  });
  const payInstalmentMut = useMutation({
    mutationFn: ({
      planId,
      instalmentId,
    }: {
      planId: string;
      instalmentId: string;
    }) => markInstalmentPaid(planId, instalmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentPlans"] });
      invalidateInvoices();
    },
  });

  const bands = ["0–30", "31–60", "61–90", "90+"];
  const outstandingInvoices = invoices.filter(
    (i) => !["Paid", "Draft", "Written Off"].includes(i.stage),
  );
  const dunningGroups = [
    { stage: "Current", note: "No action needed" },
    { stage: "31–60", note: "1st reminder" },
    { stage: "61–90", note: "2nd reminder + escalation" },
    { stage: "90+", note: "Final notice + write-off review" },
  ];
  const dunningBucket = (i: Invoice) => {
    const d = daysOverdue(i.dueOn);
    if (d <= 0) return "Current";
    if (d <= 60) return "31–60";
    if (d <= 90) return "61–90";
    return "90+";
  };

  const badDebtExposure = (band: (typeof BAD_DEBT_BANDS)[number]) => {
    const [lo, hi] = band.band.includes("Current")
      ? [0, 89]
      : band.band.includes("90")
        ? [90, 119]
        : band.band.includes("120")
          ? [120, 179]
          : [180, Infinity];
    return outstandingInvoices
      .filter((i) => {
        const d = daysOverdue(i.dueOn);
        return d >= lo && d <= hi;
      })
      .reduce((s, i) => s + (i.payable - i.paidAmount), 0);
  };

  if (wipLoading)
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sales</h1>
        <p className="text-sm text-muted-foreground">
          WIP, quotes, credit notes, receivables and credit control
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "Unbilled WIP", value: money(totals.unbilled), icon: Clock },
          {
            label: "Total receivables",
            value: money(totals.ar),
            icon: ReceiptText,
          },
          {
            label: "Overdue",
            value: money(totals.overdue),
            icon: AlertTriangle,
          },
          {
            label: "Lock-up days",
            value: `${totals.lockUpDays} days`,
            icon: RefreshCw,
          },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-5 flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <k.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{k.label}</p>
                <p className="text-lg font-bold">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="wip">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="wip">Work in progress</TabsTrigger>
          <TabsTrigger value="quotes">Quotes & proformas</TabsTrigger>
          <TabsTrigger value="credit">Credit notes</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
          <TabsTrigger value="ar">Aged receivables</TabsTrigger>
          <TabsTrigger value="dunning">Credit control</TabsTrigger>
        </TabsList>

        {/* WIP */}
        <TabsContent value="wip" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {bands.map((b) => {
              const items = wipList.filter((w) => wipBand(wipAgeDays(w)) === b);
              return (
                <Card key={b}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{b} days</p>
                    <p className="text-lg font-bold">
                      {money(items.reduce((s, w) => s + wipValue(w), 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {items.length} entries
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 rounded border bg-muted/40 p-2 text-sm">
              <span className="text-muted-foreground">
                {selectedIds.length} selected —{" "}
                {money(selectedEntries.reduce((s, e) => s + wipValue(e), 0))}
              </span>
              <Button
                size="sm"
                disabled={!canGenerate}
                onClick={() => setGenInvoiceOpen(true)}
              >
                Generate invoice
              </Button>
              {!canGenerate && (
                <span className="text-xs text-destructive">
                  Select entries from one mandate only
                </span>
              )}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">WIP register</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Member</TableHead>
                    <TableHead>Mandate</TableHead>
                    <TableHead>Narrative</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Review</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wipList.map((w) => (
                    <TableRow key={w._id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(w._id)}
                          disabled={
                            w.billingStatus === "Written off" ||
                            w.billingStatus === "Held"
                          }
                          onCheckedChange={(v) =>
                            setSelectedIds((ids) =>
                              v
                                ? [...ids, w._id]
                                : ids.filter((id) => id !== w._id),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="text-sm">{w.member}</TableCell>
                      <TableCell className="text-sm">{w.mandateName}</TableCell>
                      <TableCell className="text-sm max-w-[220px] truncate">
                        {w.taskTitle}
                        {w.narrative ? ` — ${w.narrative}` : ""}
                      </TableCell>
                      <TableCell className="text-sm">
                        {w.date?.slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-sm">{w.hours}h</TableCell>
                      <TableCell className="text-sm font-semibold">
                        {money(wipValue(w), w.currency)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {wipBand(wipAgeDays(w))}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${badge(w.billingStatus)}`}>
                          {w.billingStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {w.billingStatus === "Unbilled" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={approveMut.isPending}
                            onClick={() => approveMut.mutate(w._id)}
                          >
                            Approve
                          </Button>
                        )}
                        {!["Written off", "Invoiced"].includes(
                          w.billingStatus,
                        ) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setWipReviewTarget({
                                entry: w,
                                action: "writeDown",
                              });
                              setReviewAmount(0);
                              setReviewReason("");
                              setReviewApprover("");
                            }}
                          >
                            Write down
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!wipList.length && (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No unbilled WIP — approve time entries in Timesheets to
                        see them here.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quotes */}
        <TabsContent value="quotes" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setNewQuoteOpen(true)}>
              New quote / proforma
            </Button>
          </div>
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((q) => (
                    <TableRow key={q._id}>
                      <TableCell className="font-medium text-sm">
                        {q.ref}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {q.kind}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{q.clientName}</TableCell>
                      <TableCell className="text-sm">{q.title}</TableCell>
                      <TableCell className="text-sm font-semibold">
                        {money(q.amount, q.currency)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {q.issued?.slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {q.expires?.slice(0, 10)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${badge(q.status)}`}>
                          {q.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {q.status === "Draft" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setQuoteStatus(q._id, "Sent").then(() =>
                                queryClient.invalidateQueries({
                                  queryKey: ["quotes"],
                                }),
                              )
                            }
                          >
                            Send
                          </Button>
                        )}
                        {!q.convertedInvoiceId &&
                          q.status !== "Declined" &&
                          q.status !== "Expired" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={convertQuoteMut.isPending}
                              onClick={() => convertQuoteMut.mutate(q._id)}
                            >
                              Convert to invoice
                            </Button>
                          )}
                        {q.convertedInvoiceId && (
                          <Badge variant="outline" className="text-[10px]">
                            Converted
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!quotes.length && (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No quotes yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credit notes */}
        <TabsContent value="credit" className="mt-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            Credit notes are checkpoint two of the write-down lifecycle — issued
            from an invoice's own detail view in Billing &amp; Invoicing. The
            full audit trail across WIP write-downs, credit notes and bad debt
            is below.
          </p>
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Credit note</TableHead>
                    <TableHead>Original invoice</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Approved by</TableHead>
                    <TableHead>EBM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditNotes.map((c) => (
                    <TableRow key={c._id}>
                      <TableCell className="font-medium text-sm">
                        {c.ref}
                      </TableCell>
                      <TableCell className="text-sm">{c.invoiceRef}</TableCell>
                      <TableCell className="text-sm">{c.clientName}</TableCell>
                      <TableCell className="text-sm font-semibold">
                        {money(c.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.reason}
                      </TableCell>
                      <TableCell className="text-sm">{c.approvedBy}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${badge(c.ebm)}`}>
                          {c.ebm}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!creditNotes.length && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No credit notes issued yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recurring */}
        <TabsContent value="recurring" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setNewRecurringOpen(true)}>
              New recurring schedule
            </Button>
          </div>
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Mandate</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Next run</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recurring.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell className="text-sm">{r.clientName}</TableCell>
                      <TableCell className="text-sm">{r.mandateName}</TableCell>
                      <TableCell className="text-sm">{r.description}</TableCell>
                      <TableCell className="text-sm font-semibold">
                        {money(r.amount, r.currency)}
                      </TableCell>
                      <TableCell className="text-sm">{r.frequency}</TableCell>
                      <TableCell className="text-sm">
                        {r.nextRun?.slice(0, 10)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${badge(r.status)}`}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={generateRecurringMut.isPending}
                          onClick={() => generateRecurringMut.mutate(r._id)}
                        >
                          Generate now
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setRecurringStatus(
                              r._id,
                              r.status === "Active" ? "Paused" : "Active",
                            ).then(() =>
                              queryClient.invalidateQueries({
                                queryKey: ["recurringInvoices"],
                              }),
                            )
                          }
                        >
                          {r.status === "Active" ? "Pause" : "Resume"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!recurring.length && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No recurring schedules yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aged receivables */}
        <TabsContent value="ar" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {["Current", "1–30 days", "31–60 days", "61–90 days"].map(
              (band) => {
                const items = outstandingInvoices.filter(
                  (i) => ageBucket(i.dueOn) === band,
                );
                const total = items.reduce(
                  (s, i) => s + (i.payable - i.paidAmount),
                  0,
                );
                return (
                  <Card key={band}>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">{band}</p>
                      <p className="text-lg font-bold">{money(total)}</p>
                      <Progress
                        className="mt-2 h-1.5"
                        value={totals.ar ? (total / totals.ar) * 100 : 0}
                      />
                    </CardContent>
                  </Card>
                );
              },
            )}
          </div>
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Mandate</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Days overdue</TableHead>
                    <TableHead>Band</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outstandingInvoices.map((i) => (
                    <TableRow
                      key={i._id}
                      className="cursor-pointer"
                      onClick={() => setSelectedReceivable(i)}
                    >
                      <TableCell className="font-medium text-sm">
                        {i.ref}
                      </TableCell>
                      <TableCell className="text-sm">{i.clientName}</TableCell>
                      <TableCell className="text-sm">{i.mandateName}</TableCell>
                      <TableCell className="text-sm font-semibold">
                        {money(i.payable - i.paidAmount, i.currency)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {i.dueOn?.slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {daysOverdue(i.dueOn)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {ageBucket(i.dueOn)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!outstandingInvoices.length && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No outstanding receivables.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dunning */}
        <TabsContent value="dunning" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {dunningGroups.map((s) => {
              const items = outstandingInvoices.filter(
                (i) => dunningBucket(i) === s.stage,
              );
              return (
                <Card key={s.stage}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{s.stage}</CardTitle>
                    <p className="text-xs text-muted-foreground">{s.note}</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-lg font-bold">
                      {money(
                        items.reduce(
                          (a, i) => a + (i.payable - i.paidAmount),
                          0,
                        ),
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {items.length} invoice(s)
                    </p>
                    {items.map((i) => (
                      <button
                        key={i._id}
                        onClick={() => setSelectedReceivable(i)}
                        className="w-full text-left rounded-lg border p-2 hover:bg-muted/50"
                      >
                        <p className="text-xs font-medium">{i.clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {i.ref} · {money(i.payable - i.paidAmount)}
                        </p>
                        {i.dunningPaused && (
                          <Badge className="mt-1 text-[10px] bg-muted text-muted-foreground">
                            Paused
                          </Badge>
                        )}
                      </button>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment plans</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {paymentPlans.map((p) => (
                  <div key={p._id} className="rounded-lg border p-3">
                    <p className="text-sm font-medium">
                      {p.clientName} · {p.invoiceRef}
                    </p>
                    <div className="mt-2 space-y-1">
                      {p.instalments.map((inst) => (
                        <div
                          key={inst._id}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-muted-foreground">
                            {inst.due?.slice(0, 10)}
                          </span>
                          <span>{money(inst.amount)}</span>
                          <div className="flex items-center gap-1">
                            <Badge
                              className={`text-[10px] ${badge(inst.status)}`}
                            >
                              {inst.status}
                            </Badge>
                            {inst.status === "Scheduled" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 px-1 text-[10px]"
                                onClick={() =>
                                  payInstalmentMut.mutate({
                                    planId: p._id,
                                    instalmentId: inst._id,
                                  })
                                }
                              >
                                Mark paid
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {!paymentPlans.length && (
                  <p className="text-sm text-muted-foreground">
                    No payment plans yet.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Bad debt provisioning
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Age band</TableHead>
                      <TableHead>Provision %</TableHead>
                      <TableHead>Exposure</TableHead>
                      <TableHead>Provision</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {BAD_DEBT_BANDS.map((b) => {
                      const exposure = badDebtExposure(b);
                      return (
                        <TableRow key={b.band}>
                          <TableCell className="text-sm">{b.band}</TableCell>
                          <TableCell className="text-sm">{b.pct}%</TableCell>
                          <TableCell className="text-sm">
                            {money(exposure)}
                          </TableCell>
                          <TableCell className="text-sm font-semibold">
                            {money((exposure * b.pct) / 100)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* WIP review (write down / write off) */}
      <Dialog
        open={!!wipReviewTarget}
        onOpenChange={(o) => !o && setWipReviewTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review WIP entry</DialogTitle>
          </DialogHeader>
          {wipReviewTarget && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {wipReviewTarget.entry.taskTitle} ·{" "}
                {wipReviewTarget.entry.member} ·{" "}
                {money(wipValue(wipReviewTarget.entry))}
              </p>
              <div>
                <Label>Write down to (new value)</Label>
                <Input
                  type="number"
                  value={reviewAmount}
                  onChange={(e) => setReviewAmount(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                />
              </div>
              <div>
                <Label>Approved by</Label>
                <Input
                  value={reviewApprover}
                  onChange={(e) => setReviewApprover(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              disabled={
                writeOffWipMut.isPending || !reviewReason || !reviewApprover
              }
              onClick={() => writeOffWipMut.mutate()}
            >
              Write off entirely
            </Button>
            <Button
              disabled={
                writeDownMut.isPending || !reviewReason || !reviewApprover
              }
              onClick={() => writeDownMut.mutate()}
            >
              Write down
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate invoice from WIP */}
      <Dialog open={genInvoiceOpen} onOpenChange={setGenInvoiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Generate invoice from {selectedIds.length} WIP entries
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <p className="text-sm">
              Total:{" "}
              {money(selectedEntries.reduce((s, e) => s + wipValue(e), 0))}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>VAT %</Label>
                <Input
                  type="number"
                  value={genVat}
                  onChange={(e) => setGenVat(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>WHT %</Label>
                <Input
                  type="number"
                  value={genWht}
                  onChange={(e) => setGenWht(Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <Label>Due date</Label>
              <Input
                type="date"
                value={genDueOn}
                onChange={(e) => setGenDueOn(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!genDueOn || generateInvoiceMut.isPending}
              onClick={() => generateInvoiceMut.mutate()}
            >
              Create draft invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New quote */}
      <Dialog open={newQuoteOpen} onOpenChange={setNewQuoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New quote / proforma</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Client</Label>
              <ClientSelect
                value={quoteDraft.clientId}
                onValueChange={(v) =>
                  setQuoteDraft({ ...quoteDraft, clientId: v })
                }
                onClientChange={(c: any) =>
                  setQuoteDraft((d) => ({
                    ...d,
                    clientName: c.companyName || c.fullName || c.name,
                  }))
                }
              />
            </div>
            <div>
              <Label>Linked mandate (optional)</Label>
              <Select
                value={quoteDraft.mandateId}
                onValueChange={(v) =>
                  setQuoteDraft({ ...quoteDraft, mandateId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No mandate yet" />
                </SelectTrigger>
                <SelectContent>
                  {mandates
                    .filter((m) => m.clientUserId === quoteDraft.clientId)
                    .map((m) => (
                      <SelectItem key={m._id} value={m._id}>
                        {m.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input
                value={quoteDraft.title}
                onChange={(e) =>
                  setQuoteDraft({ ...quoteDraft, title: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={quoteDraft.amount}
                  onChange={(e) =>
                    setQuoteDraft({
                      ...quoteDraft,
                      amount: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Kind</Label>
                <Select
                  value={quoteDraft.kind}
                  onValueChange={(v) =>
                    setQuoteDraft({ ...quoteDraft, kind: v as QuoteKind })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Quote">Quote</SelectItem>
                    <SelectItem value="Proforma">Proforma</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Expires</Label>
              <Input
                type="date"
                value={quoteDraft.expires}
                onChange={(e) =>
                  setQuoteDraft({ ...quoteDraft, expires: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !quoteDraft.clientId ||
                !quoteDraft.title ||
                createQuoteMut.isPending
              }
              onClick={() => createQuoteMut.mutate()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New recurring */}
      <Dialog open={newRecurringOpen} onOpenChange={setNewRecurringOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New recurring schedule</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Mandate</Label>
              <Select
                value={recurringDraft.mandateId}
                onValueChange={(v) =>
                  setRecurringDraft({ ...recurringDraft, mandateId: v })
                }
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
            <div>
              <Label>Description</Label>
              <Input
                value={recurringDraft.description}
                onChange={(e) =>
                  setRecurringDraft({
                    ...recurringDraft,
                    description: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={recurringDraft.amount}
                  onChange={(e) =>
                    setRecurringDraft({
                      ...recurringDraft,
                      amount: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Frequency</Label>
                <Select
                  value={recurringDraft.frequency}
                  onValueChange={(v) =>
                    setRecurringDraft({
                      ...recurringDraft,
                      frequency: v as RecurringFrequency,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Monthly", "Quarterly", "Annually"].map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Next run</Label>
              <Input
                type="date"
                value={recurringDraft.nextRun}
                onChange={(e) =>
                  setRecurringDraft({
                    ...recurringDraft,
                    nextRun: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !recurringDraft.mandateId || createRecurringMut.isPending
              }
              onClick={() => createRecurringMut.mutate()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receivable detail */}
      <Sheet
        open={!!selectedReceivable}
        onOpenChange={(o) => !o && setSelectedReceivable(null)}
      >
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedReceivable && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {selectedReceivable.ref} · {selectedReceivable.clientName}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Mandate</p>
                    {selectedReceivable.mandateName}
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Amount</p>
                    {money(
                      selectedReceivable.payable -
                        selectedReceivable.paidAmount,
                      selectedReceivable.currency,
                    )}
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Due</p>
                    {selectedReceivable.dueOn?.slice(0, 10)}
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Days overdue
                    </p>
                    {daysOverdue(selectedReceivable.dueOn)}
                  </div>
                </div>
                {selectedReceivable.dunningLog.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Dunning log
                    </p>
                    <div className="space-y-2">
                      {selectedReceivable.dunningLog.map((ev) => (
                        <div
                          key={ev._id}
                          className="rounded border p-2 text-sm"
                        >
                          <p className="font-medium">{ev.action}</p>
                          <p className="text-xs text-muted-foreground">
                            {ev.by} · {new Date(ev.at).toLocaleString()}
                            {ev.note ? ` — ${ev.note}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Log call",
                    "Resend reminder",
                    "Escalate to partner",
                    "Mark as disputed",
                  ].map((a) => (
                    <Button
                      key={a}
                      size="sm"
                      variant="outline"
                      disabled={dunningMut.isPending}
                      onClick={() =>
                        dunningMut.mutate({
                          id: selectedReceivable._id,
                          action: a,
                        })
                      }
                    >
                      {a}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      pauseMut.mutate({
                        id: selectedReceivable._id,
                        paused: !selectedReceivable.dunningPaused,
                      })
                    }
                  >
                    {selectedReceivable.dunningPaused
                      ? "Resume dunning"
                      : "Pause dunning"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPlanInvoiceId(selectedReceivable._id);
                      setPlanInstalments([{ due: "", amount: 0 }]);
                    }}
                  >
                    Offer payment plan
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Payment plan */}
      <Dialog
        open={!!planInvoiceId}
        onOpenChange={(o) => !o && setPlanInvoiceId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agree a payment plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {planInstalments.map((inst, i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={inst.due}
                  onChange={(e) =>
                    setPlanInstalments((p) =>
                      p.map((x, j) =>
                        j === i ? { ...x, due: e.target.value } : x,
                      ),
                    )
                  }
                />
                <Input
                  type="number"
                  placeholder="Amount"
                  value={inst.amount}
                  onChange={(e) =>
                    setPlanInstalments((p) =>
                      p.map((x, j) =>
                        j === i ? { ...x, amount: Number(e.target.value) } : x,
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
                setPlanInstalments((p) => [...p, { due: "", amount: 0 }])
              }
            >
              Add instalment
            </Button>
          </div>
          <DialogFooter>
            <Button
              disabled={createPlanMut.isPending}
              onClick={() => createPlanMut.mutate()}
            >
              Save plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Sales workflow
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-2">
          {[
            "WIP accumulation",
            "WIP review",
            "Invoice creation",
            "Approve & send",
            "Payment received",
            "Credit control",
          ].map((s, i) => (
            <div key={s} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Step {i + 1}</p>
              <p className="text-sm font-medium">{s}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
