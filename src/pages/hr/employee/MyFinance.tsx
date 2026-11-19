import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Plus, Loader2, FileText, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  fetchMyFinanceVendors,
  fetchMySubmittedBills,
  fetchMySubmittedQuotes,
  submitMyBill,
  submitMyQuote,
  resolveFinanceFileUrl,
  type Bill,
  type Quote,
  type QuoteKind,
} from "@/lib/crm/finance-api";
import { approvalProgress } from "@/lib/crm/finance-approval";

const CURRENCIES = ["USD", "EUR", "RWF", "GBP"];
const OTHER_VENDOR = "__other__";

const money = (n: number, c = "USD") =>
  n.toLocaleString(undefined, { style: "currency", currency: c });

const tone = (s: string) => {
  if (
    ["Approved", "Paid", "Scheduled", "Draft", "Sent", "Accepted"].includes(s)
  )
    return "bg-success/10 text-success";
  if (["Awaiting approval", "Pending approval"].includes(s))
    return "bg-warning/10 text-warning";
  if (["Rejected", "Declined", "Expired"].includes(s))
    return "bg-destructive/10 text-destructive";
  return "bg-muted text-muted-foreground";
};

// What the employee sees as the status — "Draft" on a quote means it was
// approved and is waiting for the finance team to send it.
const friendly = (kind: "bill" | "quote", s: string) => {
  if (kind === "quote" && s === "Draft") return "Approved";
  if (kind === "quote" && s === "Rejected") return "Sent back";
  if (kind === "bill" && s === "Rejected") return "Sent back";
  return s;
};

const emptyBill = {
  vendorId: "",
  vendorName: "",
  description: "",
  category: "",
  dueOn: "",
  amount: "",
  currency: "USD",
};
const emptyQuote = {
  kind: "Quote" as QuoteKind,
  clientName: "",
  clientEmail: "",
  title: "",
  description: "",
  termsAndConditions: "",
  amount: "",
  vatPercent: "0",
  currency: "USD",
  expires: "",
};

export default function MyFinance() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [billOpen, setBillOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [bill, setBill] = useState(emptyBill);
  const [otherVendor, setOtherVendor] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [quote, setQuote] = useState(emptyQuote);

  const { data: bills = [], isLoading: billsLoading } = useQuery({
    queryKey: ["my-finance-bills"],
    queryFn: fetchMySubmittedBills,
  });
  const { data: quotes = [], isLoading: quotesLoading } = useQuery({
    queryKey: ["my-finance-quotes"],
    queryFn: fetchMySubmittedQuotes,
  });
  const { data: vendors = [] } = useQuery({
    queryKey: ["my-finance-vendors"],
    queryFn: fetchMyFinanceVendors,
    retry: false,
  });

  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message ?? err?.message,
      variant: "destructive",
    });

  const billMut = useMutation({
    mutationFn: () =>
      submitMyBill(
        {
          vendorId: bill.vendorId || undefined,
          vendorName: bill.vendorId ? undefined : bill.vendorName.trim(),
          description: bill.description.trim(),
          category: bill.category.trim() || undefined,
          dueOn: bill.dueOn,
          amount: Number(bill.amount),
          currency: bill.currency,
        },
        receipt!,
      ),
    onSuccess: (b) => {
      queryClient.invalidateQueries({ queryKey: ["my-finance-bills"] });
      setBillOpen(false);
      setBill(emptyBill);
      setOtherVendor(false);
      setReceipt(null);
      toast({
        title: "Bill submitted",
        description: `${b.ref} is with ${approvalProgress(b).replace("Waiting on ", "") || "the finance team"} for approval.`,
      });
    },
    onError: onErr("Couldn't submit the bill"),
  });

  const quoteMut = useMutation({
    mutationFn: () =>
      submitMyQuote({
        kind: quote.kind,
        clientName: quote.clientName.trim(),
        clientEmail: quote.clientEmail.trim(),
        title: quote.title.trim(),
        description: quote.description.trim() || undefined,
        termsAndConditions: quote.termsAndConditions.trim() || undefined,
        amount: Number(quote.amount),
        vatPercent: Number(quote.vatPercent) || 0,
        currency: quote.currency,
        expires: quote.expires,
      }),
    onSuccess: (q) => {
      queryClient.invalidateQueries({ queryKey: ["my-finance-quotes"] });
      setQuoteOpen(false);
      setQuote(emptyQuote);
      toast({
        title: `${q.kind} submitted`,
        description: `${q.ref} is waiting for approval.`,
      });
    },
    onError: onErr("Couldn't submit the quote"),
  });

  const billReady =
    (bill.vendorId || bill.vendorName.trim()) &&
    bill.description.trim() &&
    bill.dueOn &&
    Number(bill.amount) > 0 &&
    receipt;
  const quoteReady =
    quote.clientName.trim() &&
    /\S+@\S+\.\S+/.test(quote.clientEmail) &&
    quote.title.trim() &&
    quote.expires &&
    Number(quote.amount) > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finance</h1>
        <p className="text-sm text-muted-foreground">
          Submit a bill or prepare a quote. It goes to your finance managers and
          the account owner for approval — you'll be told when it's decided.
        </p>
      </div>

      <Tabs defaultValue="bills" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bills">
            <Receipt className="mr-2 h-4 w-4" /> Bills
          </TabsTrigger>
          <TabsTrigger value="quotes">
            <FileText className="mr-2 h-4 w-4" /> Quotes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bills" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setBillOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Submit a bill
            </Button>
          </div>
          {billsLoading && (
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          )}
          {!billsLoading && !bills.length && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                You haven't submitted any bills yet.
              </CardContent>
            </Card>
          )}
          {bills.map((b: Bill) => (
            <Card key={b._id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{b.ref}</span>
                    {b.receiptUrl && (
                      <a
                        href={resolveFinanceFileUrl(b.receiptUrl) ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        title={b.receiptFileName || "Receipt"}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  <p className="text-sm">
                    {b.vendorName} — {b.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Due {b.dueOn?.slice(0, 10)}
                    {b.status === "Awaiting approval" &&
                      ` · ${approvalProgress(b) || "Waiting for the account owner"}`}
                    {b.approvedBy && b.status !== "Awaiting approval"
                      ? ` · Approved by ${b.approvedBy}`
                      : ""}
                  </p>
                  {b.status === "Rejected" && b.rejectedReason && (
                    <p className="text-xs text-destructive">
                      Reason: {b.rejectedReason}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {money(b.amount, b.currency)}
                  </p>
                  <Badge className={`text-xs ${tone(b.status)}`}>
                    {friendly("bill", b.status)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="quotes" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setQuoteOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Prepare a quote
            </Button>
          </div>
          {quotesLoading && (
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          )}
          {!quotesLoading && !quotes.length && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                You haven't prepared any quotes yet.
              </CardContent>
            </Card>
          )}
          {quotes.map((q: Quote) => (
            <Card key={q._id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0 space-y-0.5">
                  <span className="text-sm font-semibold">
                    {q.ref} · {q.kind}
                  </span>
                  <p className="text-sm">
                    {q.clientName} — {q.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Valid until {q.expires?.slice(0, 10)}
                    {q.status === "Pending approval" &&
                      ` · ${approvalProgress(q) || "Waiting for the account owner"}`}
                    {q.status === "Draft" &&
                      " · Approved — the finance team will send it"}
                  </p>
                  {q.status === "Rejected" && q.rejectedReason && (
                    <p className="text-xs text-destructive">
                      Reason: {q.rejectedReason}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {money(q.amount, q.currency)}
                  </p>
                  <Badge className={`text-xs ${tone(q.status)}`}>
                    {friendly("quote", q.status)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Submit a bill */}
      <Dialog open={billOpen} onOpenChange={setBillOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit a bill</DialogTitle>
            <DialogDescription>
              Attach the vendor's invoice or receipt. Nothing is paid until it
              has been approved.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Vendor</Label>
              <Select
                value={otherVendor ? OTHER_VENDOR : bill.vendorId}
                onValueChange={(v) => {
                  const other = v === OTHER_VENDOR;
                  setOtherVendor(other);
                  setBill({
                    ...bill,
                    vendorId: other ? "" : v,
                    vendorName: other ? bill.vendorName : "",
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a vendor…" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v._id} value={v._id}>
                      {v.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={OTHER_VENDOR}>
                    Someone else (type the name)
                  </SelectItem>
                </SelectContent>
              </Select>
              {otherVendor && (
                <Input
                  className="mt-2"
                  placeholder="Who is this bill from?"
                  value={bill.vendorName}
                  onChange={(e) =>
                    setBill({ ...bill, vendorName: e.target.value })
                  }
                />
              )}
            </div>
            <div>
              <Label>What is it for?</Label>
              <Input
                value={bill.description}
                onChange={(e) =>
                  setBill({ ...bill, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  min={0}
                  value={bill.amount}
                  onChange={(e) => setBill({ ...bill, amount: e.target.value })}
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Select
                  value={bill.currency}
                  onValueChange={(v) => setBill({ ...bill, currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
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
                <Label>Due on</Label>
                <Input
                  type="date"
                  value={bill.dueOn}
                  onChange={(e) => setBill({ ...bill, dueOn: e.target.value })}
                />
              </div>
              <div>
                <Label>Category (optional)</Label>
                <Input
                  value={bill.category}
                  onChange={(e) =>
                    setBill({ ...bill, category: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Invoice or receipt (PDF or image)</Label>
              <Input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!billReady || billMut.isPending}
              onClick={() => billMut.mutate()}
            >
              {billMut.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Submit for approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prepare a quote */}
      <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prepare a quote</DialogTitle>
            <DialogDescription>
              It isn't sent to the client until a finance manager or the account
              owner approves it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={quote.kind}
                  onValueChange={(v) =>
                    setQuote({ ...quote, kind: v as QuoteKind })
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
              <div>
                <Label>Valid until</Label>
                <Input
                  type="date"
                  value={quote.expires}
                  onChange={(e) =>
                    setQuote({ ...quote, expires: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Client name</Label>
                <Input
                  value={quote.clientName}
                  onChange={(e) =>
                    setQuote({ ...quote, clientName: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Client email</Label>
                <Input
                  type="email"
                  value={quote.clientEmail}
                  onChange={(e) =>
                    setQuote({ ...quote, clientEmail: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Title</Label>
              <Input
                value={quote.title}
                onChange={(e) => setQuote({ ...quote, title: e.target.value })}
              />
            </div>
            <div>
              <Label>What's included</Label>
              <Textarea
                value={quote.description}
                onChange={(e) =>
                  setQuote({ ...quote, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  min={0}
                  value={quote.amount}
                  onChange={(e) =>
                    setQuote({ ...quote, amount: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>VAT %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={quote.vatPercent}
                  onChange={(e) =>
                    setQuote({ ...quote, vatPercent: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Select
                  value={quote.currency}
                  onValueChange={(v) => setQuote({ ...quote, currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Terms & conditions (optional)</Label>
              <Textarea
                value={quote.termsAndConditions}
                onChange={(e) =>
                  setQuote({ ...quote, termsAndConditions: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!quoteReady || quoteMut.isPending}
              onClick={() => quoteMut.mutate()}
            >
              {quoteMut.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Submit for approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
