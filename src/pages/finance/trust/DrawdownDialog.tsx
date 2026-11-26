import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useToast } from "@/hooks/use-toast";
import {
  fetchBankAccounts,
  fetchBills,
  fetchInvoices,
  fetchTrustMovements,
  requestTrustDrawdown,
  type TrustDrawdownType,
  type TrustLedger,
} from "@/lib/crm/finance-api";
import { fetchMandates } from "@/lib/crm/mandates-api";
import {
  EXPENSE_CATEGORIES,
  Field,
  FilePicker,
  PAYMENT_METHODS,
  SectionTitle,
  SelectWithOther,
  fmtDate,
  money,
} from "./trustShared";

const TYPES: { value: TrustDrawdownType; label: string; help: string }[] = [
  {
    value: "Invoice",
    label: "Invoice-linked (draw against a specific invoice)",
    help: "Pays an issued invoice from the client's trust money into the office account. The invoice is settled when the drawdown is approved.",
  },
  {
    value: "Mandate",
    label: "Mandate-linked (draw against engagement scope)",
    help: "A payment made under the client's engagement, checked against the mandate budget.",
  },
  {
    value: "Third-party expense",
    label: "Third-party expense (disbursement on behalf of client)",
    help: "Money paid out to someone else for the client. Needs the bill, or the invoice / receipt attached.",
  },
  {
    value: "Trust-to-office",
    label: "Trust-to-office transfer (fees earned)",
    help: "Moves earned fees from trust to the office account.",
  },
  {
    value: "Refund",
    label: "Refund to client",
    help: "Returns money to the client. It has to trace back to a deposit they made.",
  },
];

const today = () => new Date().toISOString().slice(0, 10);

export function DrawdownDialog({
  open,
  onClose,
  ledgers,
  initialLedgerId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  ledgers: TrustLedger[];
  initialLedgerId?: string;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [f, setF] = useState({
    ledgerId: "",
    type: "Invoice" as TrustDrawdownType,
    invoiceId: "",
    billId: "",
    mandateId: "",
    depositId: "",
    officeBankAccountId: "",
    payeeName: "",
    expenseCategory: "",
    amount: "",
    requestedDate: today(),
    paymentMethod: "",
    beneficiaryAccount: "",
    narrative: "",
    internalNotes: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!open) return;
    setF({
      ledgerId: initialLedgerId ?? "",
      type: "Invoice",
      invoiceId: "",
      billId: "",
      mandateId: "",
      depositId: "",
      officeBankAccountId: "",
      payeeName: "",
      expenseCategory: "",
      amount: "",
      requestedDate: today(),
      paymentMethod: "",
      beneficiaryAccount: "",
      narrative: "",
      internalNotes: "",
    });
    setFiles([]);
  }, [open, initialLedgerId]);

  const ledger = ledgers.find((l) => l._id === f.ledgerId);

  const { data: invoices = [] } = useQuery({
    queryKey: ["trustDrawInvoices", ledger?.clientUserId],
    queryFn: () => fetchInvoices({ clientUserId: ledger!.clientUserId }),
    enabled: open && !!ledger,
  });
  const { data: bills = [] } = useQuery({
    queryKey: ["bills"],
    queryFn: fetchBills,
    enabled: open && f.type === "Third-party expense",
  });
  const { data: mandates = [] } = useQuery({
    queryKey: ["mandates"],
    queryFn: fetchMandates,
    enabled: open && f.type === "Mandate",
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ["bankAccounts"],
    queryFn: fetchBankAccounts,
    enabled: open,
  });
  const { data: ledgerMovements = [] } = useQuery({
    queryKey: ["trustMovements", ledger?._id, "deposits"],
    queryFn: () =>
      fetchTrustMovements({ ledgerId: ledger!._id, type: "Deposit" }),
    enabled: open && !!ledger && f.type === "Refund",
  });

  // Only what can genuinely be paid from this ledger is offered: issued,
  // unpaid invoices in the ledger's currency.
  const payable = useMemo(
    () =>
      invoices
        .filter(
          (i) =>
            ![
              "Draft",
              "In Review",
              "Paid",
              "Written Off",
              "Cancelled",
            ].includes(i.stage) &&
            !i.proforma &&
            i.currency === ledger?.currency &&
            i.payable - i.paidAmount > 0.005,
        )
        .map((i) => ({ ...i, open: i.payable - i.paidAmount })),
    [invoices, ledger],
  );
  const openBills = bills.filter(
    (b) =>
      !["Paid", "Rejected"].includes(b.status) &&
      b.currency === ledger?.currency,
  );
  const clientMandates = mandates.filter(
    (m) => m.clientUserId === ledger?.clientUserId,
  );
  const officeAccounts = accounts.filter(
    (a) => a.type !== "Trust" && a.currency === ledger?.currency,
  );
  const deposits = ledgerMovements.filter(
    (m) => m.type === "Deposit" && m.status === "Recorded",
  );

  // Default the office account once the ledger's currency is known.
  useEffect(() => {
    if (!f.officeBankAccountId && officeAccounts[0])
      setF((p) => ({ ...p, officeBankAccountId: officeAccounts[0]._id }));
  }, [officeAccounts, f.officeBankAccountId]);

  const inv = payable.find((i) => i._id === f.invoiceId);
  const bill = openBills.find((b) => b._id === f.billId);
  const mandateId = f.mandateId || ledger?.mandateId || "";
  const mandate = clientMandates.find((m) => m._id === mandateId);
  const deposit = deposits.find((d) => d._id === f.depositId);
  const amount = Number(f.amount);
  const typeInfo = TYPES.find((t) => t.value === f.type)!;
  const restricted = !!ledger?.invoiceLinkedOnly && f.type !== "Invoice";
  const overLimit =
    !!ledger &&
    ledger.maxDrawdownPerRequest > 0 &&
    amount > ledger.maxDrawdownPerRequest;
  const overdraft = !!ledger && amount > ledger.available + 0.005;
  const needsDoc =
    f.type === "Third-party expense" && !f.billId && files.length === 0;

  const needsPayee = ["Mandate", "Third-party expense", "Refund"].includes(
    f.type,
  );
  const problem = !ledger
    ? "Choose the client ledger"
    : ledger.status !== "Active"
      ? `This ledger is ${ledger.status.toLowerCase()}`
      : restricted
        ? "This ledger only allows invoice-linked drawdowns"
        : f.type === "Invoice" && !f.invoiceId
          ? "Choose the invoice being paid"
          : f.type === "Mandate" && !mandateId
            ? "Choose the mandate"
            : f.type === "Refund" && !f.depositId
              ? "Choose the deposit being refunded"
              : needsDoc
                ? "Link the bill, or attach the invoice / receipt"
                : !(amount > 0)
                  ? "Enter the amount"
                  : overdraft
                    ? "That is more than the available balance"
                    : f.type === "Invoice" && inv && amount > inv.open + 0.005
                      ? `That is more than the invoice's outstanding ${money(inv.open, inv.currency)}`
                      : needsPayee && !f.payeeName.trim() && !bill
                        ? "Enter who is being paid"
                        : !f.narrative.trim()
                          ? "Enter the purpose / narrative"
                          : "";

  const mut = useMutation({
    mutationFn: (saveAsDraft: boolean) =>
      requestTrustDrawdown(
        {
          ledgerId: f.ledgerId,
          drawdownType: f.type,
          amount,
          linkedInvoiceId: f.type === "Invoice" ? f.invoiceId : undefined,
          linkedBillId:
            f.type === "Third-party expense"
              ? f.billId || undefined
              : undefined,
          mandateId: f.type === "Mandate" ? mandateId : undefined,
          linkedDepositId: f.type === "Refund" ? f.depositId : undefined,
          officeBankAccountId: ["Invoice", "Trust-to-office"].includes(f.type)
            ? f.officeBankAccountId || undefined
            : undefined,
          payeeName: f.payeeName.trim() || undefined,
          expenseCategory: f.expenseCategory.trim() || undefined,
          requestedDate: f.requestedDate || undefined,
          paymentMethod: f.paymentMethod || undefined,
          beneficiaryAccount: f.beneficiaryAccount.trim() || undefined,
          narrative: f.narrative.trim(),
          internalNotes: f.internalNotes.trim() || undefined,
          saveAsDraft,
        },
        files,
      ),
    onSuccess: (m, saveAsDraft) => {
      toast({
        title: saveAsDraft ? "Draft saved" : "Drawdown prepared",
        description: saveAsDraft
          ? `${m.ref} saved — submit it when it is ready.`
          : m.requiresAdditionalApproval
            ? `${m.ref} is over this ledger's limit, so two other authorisers must approve it.`
            : `${m.ref} is waiting for someone other than you to authorise it.`,
      });
      onDone();
      onClose();
    },
    onError: (err: any) =>
      toast({
        title: "Could not prepare drawdown",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request trust drawdown</DialogTitle>
          <DialogDescription>
            Every drawdown is traced to a source document and needs a second
            person's authorisation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <SectionTitle>Drawdown source</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client ledger" required>
              <Select
                value={f.ledgerId}
                onValueChange={(v) =>
                  setF((p) => ({
                    ...p,
                    ledgerId: v,
                    invoiceId: "",
                    billId: "",
                    depositId: "",
                    mandateId: "",
                    officeBankAccountId: "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent>
                  {ledgers
                    .filter((l) => l.status === "Active")
                    .map((l) => (
                      <SelectItem key={l._id} value={l._id}>
                        {l.clientName} ({l.currency})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Available balance">
              <Input
                disabled
                value={ledger ? money(ledger.available, ledger.currency) : ""}
              />
              {ledger && (
                <p className="text-[11px] text-muted-foreground">
                  Balance {money(ledger.balance, ledger.currency)}
                  {ledger.reserved > 0 &&
                    ` · ${money(ledger.reserved, ledger.currency)} already requested`}
                  {ledger.minBalance > 0 &&
                    ` · minimum balance ${money(ledger.minBalance, ledger.currency)}`}
                </p>
              )}
            </Field>
          </div>

          <SectionTitle>Drawdown linkage</SectionTitle>
          <Field label="Link type" required>
            <Select
              value={f.type}
              onValueChange={(v) => set("type", v as TrustDrawdownType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem
                    key={t.value}
                    value={t.value}
                    disabled={
                      !!ledger?.invoiceLinkedOnly && t.value !== "Invoice"
                    }
                  >
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">{typeInfo.help}</p>
          </Field>

          {f.type === "Invoice" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Invoice"
                required
                hint="Only issued, unpaid invoices for this client in the ledger's currency"
              >
                <Select
                  value={f.invoiceId}
                  onValueChange={(v) => {
                    const i = payable.find((x) => x._id === v);
                    setF((p) => ({
                      ...p,
                      invoiceId: v,
                      amount:
                        p.amount || !i
                          ? p.amount
                          : String(
                              Math.min(i.open, ledger?.available ?? i.open),
                            ),
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        payable.length
                          ? "Select invoice..."
                          : "No payable invoices"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {payable.map((i) => (
                      <SelectItem key={i._id} value={i._id}>
                        {i.ref}: {i.mandateName}, {money(i.open, i.currency)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Invoice balance outstanding">
                <Input
                  disabled
                  value={inv ? money(inv.open, inv.currency) : ""}
                />
              </Field>
            </div>
          )}

          {f.type === "Mandate" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mandate / engagement" required>
                <Select
                  value={mandateId}
                  onValueChange={(v) => set("mandateId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mandate..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientMandates.map((m) => (
                      <SelectItem key={m._id} value={m._id}>
                        {m.ref}: {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Mandate budget">
                <Input
                  disabled
                  value={
                    mandate
                      ? `${money(mandate.budget, (mandate as any).currency)} budget`
                      : ""
                  }
                />
              </Field>
            </div>
          )}

          {f.type === "Third-party expense" && (
            <Field
              label="Bill being paid"
              hint="Link the bill if one exists; otherwise attach the third party's invoice or receipt below"
            >
              <Select
                value={f.billId || "none"}
                onValueChange={(v) => set("billId", v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    No bill — I will attach the document
                  </SelectItem>
                  {openBills.map((b) => (
                    <SelectItem key={b._id} value={b._id}>
                      {b.ref}: {b.vendorName}, {money(b.amount, b.currency)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {f.type === "Refund" && (
            <Field
              label="Deposit being refunded"
              required
              hint="A refund has to trace back to money the client paid in"
            >
              <Select
                value={f.depositId}
                onValueChange={(v) => set("depositId", v)}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      deposits.length ? "Select deposit..." : "No deposits"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {deposits.map((d) => (
                    <SelectItem key={d._id} value={d._id}>
                      {d.ref}: {money(d.amount, d.currency)} on{" "}
                      {fmtDate(d.date)}
                      {d.reference ? ` (${d.reference})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {["Invoice", "Trust-to-office"].includes(f.type) && (
            <Field
              label="Office bank account"
              hint="Where the fees land. Must be an office account in the ledger's currency."
            >
              <Select
                value={f.officeBankAccountId}
                onValueChange={(v) => set("officeBankAccountId", v)}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      officeAccounts.length
                        ? "Select office account..."
                        : "No office account in this currency"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {officeAccounts.map((a) => (
                    <SelectItem key={a._id} value={a._id}>
                      {a.name}, {a.bank} (…{a.last4})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {needsPayee && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Payee name" required={!bill}>
                <Input
                  placeholder="e.g. Rwanda Development Board"
                  value={f.payeeName}
                  onChange={(e) => set("payeeName", e.target.value)}
                />
              </Field>
              {f.type !== "Refund" && (
                <Field label="Expense category">
                  <SelectWithOther
                    value={f.expenseCategory}
                    onChange={(v) => set("expenseCategory", v)}
                    options={EXPENSE_CATEGORIES}
                    placeholder="Select category..."
                  />
                </Field>
              )}
            </div>
          )}

          <SectionTitle>Amount &amp; payment</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={`Amount${ledger ? ` (${ledger.currency})` : ""}`}
              required
            >
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={f.amount}
                onChange={(e) => set("amount", e.target.value)}
              />
              {overdraft && (
                <Badge
                  variant="outline"
                  className="mt-1 bg-destructive/10 text-destructive"
                >
                  Overdraft blocked
                </Badge>
              )}
            </Field>
            <Field label="Requested date">
              <Input
                type="date"
                value={f.requestedDate}
                onChange={(e) => set("requestedDate", e.target.value)}
              />
            </Field>
            <Field label="Payment method">
              <Select
                value={f.paymentMethod}
                onValueChange={(v) => set("paymentMethod", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method..." />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Beneficiary account">
              <Input
                placeholder="Account number or mobile number"
                value={f.beneficiaryAccount}
                onChange={(e) => set("beneficiaryAccount", e.target.value)}
              />
            </Field>
          </div>
          {overLimit && ledger && (
            <p className="flex items-center gap-2 rounded-md bg-warning/10 p-2 text-xs text-warning">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              This is above the ledger's per-request limit of{" "}
              {money(ledger.maxDrawdownPerRequest, ledger.currency)}, so two
              different authorisers must approve it.
            </p>
          )}

          <SectionTitle>Supporting documentation</SectionTitle>
          <FilePicker
            files={files}
            onChange={setFiles}
            label="Attach the invoice, receipt, engagement letter or third-party bill"
            hint={`PDF, JPG, PNG up to 10MB each${
              f.type === "Third-party expense"
                ? ". Required unless a bill is linked."
                : ""
            }`}
          />
          <Field label="Purpose / narrative" required>
            <Textarea
              rows={2}
              value={f.narrative}
              onChange={(e) => set("narrative", e.target.value)}
            />
          </Field>
          <Field label="Internal notes">
            <Textarea
              rows={2}
              value={f.internalNotes}
              onChange={(e) => set("internalNotes", e.target.value)}
            />
          </Field>
          <p className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
            This drawdown will be submitted for dual-control approval. A
            different authorised signatory must approve it before funds are
            released. You cannot approve your own drawdown request.
          </p>
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <p className="text-xs text-destructive">{problem}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="outline"
              disabled={!!problem || mut.isPending}
              onClick={() => mut.mutate(true)}
            >
              Save as draft
            </Button>
            <Button
              disabled={!!problem || mut.isPending}
              onClick={() => mut.mutate(false)}
            >
              {mut.isPending ? "Submitting…" : "Submit for approval"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
