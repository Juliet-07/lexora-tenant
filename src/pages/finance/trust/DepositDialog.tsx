import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { recordTrustDeposit, type TrustLedger } from "@/lib/crm/finance-api";
import {
  DEPOSIT_PURPOSES,
  Field,
  FilePicker,
  SOURCE_OF_FUNDS,
  SectionTitle,
  SelectWithOther,
  money,
} from "./trustShared";

const today = () => new Date().toISOString().slice(0, 10);

export function DepositDialog({
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
    amount: "",
    date: today(),
    reference: "",
    remitterName: "",
    sourceOfFunds: "",
    purpose: "",
    internalNotes: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!open) return;
    const l = ledgers.find((x) => x._id === initialLedgerId);
    setF({
      ledgerId: initialLedgerId ?? "",
      amount: "",
      date: today(),
      reference: "",
      remitterName: "",
      // A deposit usually comes from the source declared on the ledger.
      sourceOfFunds: l?.sourceOfFunds ?? "",
      purpose: "",
      internalNotes: "",
    });
    setFiles([]);
  }, [open, initialLedgerId, ledgers]);

  const ledger = ledgers.find((l) => l._id === f.ledgerId);
  const openLedgers = ledgers.filter((l) => l.status === "Active");
  const amount = Number(f.amount);
  const problem = !ledger
    ? "Choose the client ledger"
    : ledger.status !== "Active"
      ? `This ledger is ${ledger.status.toLowerCase()} — no deposits can be recorded`
      : !(amount > 0)
        ? "Enter the amount received"
        : !f.reference.trim()
          ? "Enter the bank reference / receipt number"
          : !f.sourceOfFunds.trim()
            ? "Declare the source of this deposit"
            : "";

  const mut = useMutation({
    mutationFn: () =>
      recordTrustDeposit(
        {
          ledgerId: f.ledgerId,
          amount,
          date: f.date,
          reference: f.reference.trim(),
          remitterName: f.remitterName.trim() || undefined,
          sourceOfFunds: f.sourceOfFunds.trim(),
          purpose: f.purpose.trim() || undefined,
          internalNotes: f.internalNotes.trim() || undefined,
        },
        files,
      ),
    onSuccess: () => {
      toast({
        title: "Deposit recorded",
        description: files.length
          ? "Balance updated, evidence attached."
          : "Balance updated. No evidence attached yet — add it from the movement.",
      });
      onDone();
      onClose();
    },
    onError: (err: any) =>
      toast({
        title: "Failed to record deposit",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record trust deposit</DialogTitle>
          <DialogDescription>
            A client deposit into a segregated ledger, with its source-of-funds
            declaration
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <SectionTitle>Deposit details</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client ledger" required>
              <Select
                value={f.ledgerId}
                onValueChange={(v) => set("ledgerId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent>
                  {openLedgers.map((l) => (
                    <SelectItem key={l._id} value={l._id}>
                      {l.clientName} ({l.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Linked mandate">
              <Input
                disabled
                value={
                  ledger
                    ? ledger.mandateName || "General retainer"
                    : "Taken from the ledger"
                }
              />
            </Field>
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
            </Field>
            <Field label="Date received" required>
              <Input
                type="date"
                max={today()}
                value={f.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </Field>
            <Field
              label="Bank reference / receipt number"
              required
              hint="Each reference can be used once on a ledger"
            >
              <Input
                placeholder="e.g. REC-TRUST-234567890"
                value={f.reference}
                onChange={(e) => set("reference", e.target.value)}
              />
            </Field>
            <Field label="Remitter name">
              <Input
                placeholder="Name on the incoming transfer"
                value={f.remitterName}
                onChange={(e) => set("remitterName", e.target.value)}
              />
            </Field>
          </div>
          {ledger && (
            <p className="text-xs text-muted-foreground">
              Current balance {money(ledger.balance, ledger.currency)} · after
              this deposit{" "}
              {money(
                ledger.balance + (amount > 0 ? amount : 0),
                ledger.currency,
              )}
            </p>
          )}

          <SectionTitle>Source of funds declaration</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Source of this deposit" required>
              <SelectWithOther
                key={f.ledgerId}
                value={f.sourceOfFunds}
                onChange={(v) => set("sourceOfFunds", v)}
                options={SOURCE_OF_FUNDS}
                placeholder="Select source..."
              />
            </Field>
            <Field label="Purpose of deposit">
              <SelectWithOther
                value={f.purpose}
                onChange={(v) => set("purpose", v)}
                options={DEPOSIT_PURPOSES}
                placeholder="Select purpose..."
              />
            </Field>
          </div>

          <SectionTitle>Supporting documentation</SectionTitle>
          <FilePicker
            files={files}
            onChange={setFiles}
            label="Attach the bank statement extract, wire confirmation or source-of-funds evidence"
            hint="PDF, JPG, PNG up to 10MB each"
          />
          <Field label="Internal notes">
            <Textarea
              rows={2}
              value={f.internalNotes}
              onChange={(e) => set("internalNotes", e.target.value)}
            />
          </Field>
        </div>
        <DialogFooter className="items-center gap-2 sm:justify-between">
          <p className="text-xs text-destructive">{problem}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={!!problem || mut.isPending}
              onClick={() => mut.mutate()}
            >
              {mut.isPending ? "Recording…" : "Record deposit"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
