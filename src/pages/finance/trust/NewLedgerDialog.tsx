import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ClientSelect } from "@/components/ClientDropdown";
import {
  createTrustLedger,
  fetchBankAccounts,
  type InterestTreatment,
  type TrustNotifyPrefs,
  type TrustPortalAccess,
  type TrustRiskLevel,
} from "@/lib/crm/finance-api";
import { fetchMandates } from "@/lib/crm/mandates-api";
import {
  Field,
  LEDGER_PURPOSES,
  SOURCE_OF_FUNDS,
  SectionTitle,
  SelectWithOther,
  TRUST_CURRENCIES,
} from "./trustShared";

const TREATMENTS: { value: InterestTreatment; label: string }[] = [
  { value: "Client retained", label: "Client retained" },
  { value: "Firm retained", label: "Firm retained (per agreement)" },
  { value: "Pooled", label: "Pooled (below threshold)" },
  { value: "No interest", label: "No interest (demand account)" },
];

const NOTIFY: { key: keyof TrustNotifyPrefs; label: string }[] = [
  { key: "depositConfirmations", label: "Deposit confirmations" },
  { key: "drawdownNotices", label: "Drawdown notices" },
  { key: "monthlyStatements", label: "Monthly statements" },
  { key: "lowBalanceAlerts", label: "Low-balance / replenishment alerts" },
  { key: "interestCredits", label: "Interest credits" },
  { key: "reconciliationReports", label: "Reconciliation reports" },
];

const blank = () => ({
  bankAccountId: "",
  clientUserId: "",
  clientName: "",
  mandateId: "none",
  mandateReference: "",
  currency: "",
  interestTreatment: "Client retained" as InterestTreatment,
  interestRate: "",
  sourceOfFunds: "",
  expectedPurpose: "",
  sourceOfFundsNotes: "",
  riskLevel: "Standard" as TrustRiskLevel,
  maxDrawdownPerRequest: "",
  invoiceLinkedOnly: false,
  frozen: false,
  minBalance: "",
  replenishmentTarget: "",
  portalAccess: "Invite pending" as TrustPortalAccess,
  portalContactEmail: "",
  additionalPortalUsers: "",
  emailDigest: "Real-time",
  notifyPrefs: {
    depositConfirmations: true,
    drawdownNotices: true,
    monthlyStatements: true,
    lowBalanceAlerts: true,
    interestCredits: true,
    reconciliationReports: false,
  } as TrustNotifyPrefs,
});

export function NewLedgerDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [f, setF] = useState(blank());
  const set = <K extends keyof ReturnType<typeof blank>>(
    k: K,
    v: ReturnType<typeof blank>[K],
  ) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (open) setF(blank());
  }, [open]);

  const { data: accounts = [] } = useQuery({
    queryKey: ["bankAccounts"],
    queryFn: fetchBankAccounts,
    enabled: open,
  });
  const trustAccounts = accounts.filter((a) => a.type === "Trust");
  const { data: mandates = [] } = useQuery({
    queryKey: ["mandates"],
    queryFn: fetchMandates,
    enabled: open,
  });
  const clientMandates = useMemo(
    () => mandates.filter((m) => m.clientUserId === f.clientUserId),
    [mandates, f.clientUserId],
  );
  const account = trustAccounts.find((a) => a._id === f.bankAccountId);
  const currency = (account?.currency || f.currency || "").toUpperCase();
  const earns = f.interestTreatment !== "No interest";
  const portalOn = f.portalAccess !== "Disabled";

  const emailOk = (s: string) => /^\S+@\S+\.\S+$/.test(s.trim());
  const extraUsers = f.additionalPortalUsers
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const problem = !f.bankAccountId
    ? "Choose the trust bank account"
    : !f.clientUserId
      ? "Choose the client"
      : !f.sourceOfFunds.trim()
        ? "Declare the expected source of funds"
        : earns && f.interestRate === ""
          ? "Enter the interest rate from the trust account agreement"
          : portalOn && !emailOk(f.portalContactEmail)
            ? "Enter the portal contact email"
            : extraUsers.some((e) => !emailOk(e))
              ? "One of the additional portal users is not a valid email"
              : "";

  const mut = useMutation({
    mutationFn: () => {
      const m = clientMandates.find((x) => x._id === f.mandateId);
      return createTrustLedger({
        bankAccountId: f.bankAccountId,
        clientUserId: f.clientUserId,
        clientName: f.clientName,
        currency,
        mandateId: m?._id,
        mandateName: m ? `${m.ref}: ${m.name}` : undefined,
        mandateReference: f.mandateReference.trim() || undefined,
        interestTreatment: f.interestTreatment,
        interestRate: earns ? Number(f.interestRate) : 0,
        sourceOfFunds: f.sourceOfFunds.trim(),
        expectedPurpose: f.expectedPurpose.trim() || undefined,
        sourceOfFundsNotes: f.sourceOfFundsNotes.trim() || undefined,
        riskLevel: f.riskLevel,
        maxDrawdownPerRequest: f.maxDrawdownPerRequest
          ? Number(f.maxDrawdownPerRequest)
          : 0,
        invoiceLinkedOnly: f.invoiceLinkedOnly,
        frozen: f.frozen,
        minBalance: f.minBalance ? Number(f.minBalance) : 0,
        replenishmentTarget: f.replenishmentTarget
          ? Number(f.replenishmentTarget)
          : 0,
        portalAccess: f.portalAccess,
        portalContactEmail: f.portalContactEmail.trim() || undefined,
        additionalPortalUsers: extraUsers,
        emailDigest: f.emailDigest,
        notifyPrefs: f.notifyPrefs,
      });
    },
    onSuccess: () => {
      toast({ title: "Trust ledger created" });
      onCreated();
      onClose();
    },
    onError: (err: any) =>
      toast({
        title: "Failed to create ledger",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New trust ledger</DialogTitle>
          <DialogDescription>
            A segregated client ledger with mandate linkage, source of funds and
            interest terms
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <SectionTitle>Client &amp; mandate</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Trust bank account" required>
              <Select
                value={f.bankAccountId}
                onValueChange={(v) => set("bankAccountId", v)}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      trustAccounts.length
                        ? "Select trust account..."
                        : "No trust account — add one in Banking"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {trustAccounts.map((a) => (
                    <SelectItem key={a._id} value={a._id}>
                      {a.name}, {a.bank} ({a.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Client" required>
              <ClientSelect
                value={f.clientUserId}
                onValueChange={(id) => set("clientUserId", id)}
                onClientChange={(c) => {
                  const name =
                    c.businessName?.trim() ||
                    [c.firstName, c.lastName].filter(Boolean).join(" ") ||
                    c.email;
                  setF((p) => ({
                    ...p,
                    clientUserId: c._id,
                    clientName: name,
                    mandateId: "none",
                    portalContactEmail: p.portalContactEmail || c.email || "",
                  }));
                }}
              />
            </Field>
            <Field
              label="Linked mandate / engagement"
              hint="Link this ledger to a specific engagement letter or mandate for drawdown control"
            >
              <Select
                value={f.mandateId}
                onValueChange={(v) => set("mandateId", v)}
                disabled={!f.clientUserId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    No mandate (general retainer)
                  </SelectItem>
                  {clientMandates.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.ref}: {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Mandate reference">
              <Input
                placeholder="e.g. EL-2026-0045"
                value={f.mandateReference}
                onChange={(e) => set("mandateReference", e.target.value)}
              />
            </Field>
          </div>

          <SectionTitle>Currency &amp; interest</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Currency"
              required
              hint={account ? "Fixed by the trust account" : undefined}
            >
              <Select
                value={currency}
                onValueChange={(v) => set("currency", v)}
                disabled={!!account}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  {TRUST_CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Interest treatment" required>
              <Select
                value={f.interestTreatment}
                onValueChange={(v) =>
                  set("interestTreatment", v as InterestTreatment)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TREATMENTS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label="Interest rate (p.a., %)"
              required={earns}
              hint="Applied rate from the trust account agreement"
            >
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                placeholder="e.g. 5.50"
                disabled={!earns}
                value={earns ? f.interestRate : ""}
                onChange={(e) => set("interestRate", e.target.value)}
              />
            </Field>
          </div>

          <SectionTitle>Source of funds (AML/CFT)</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Expected source of funds" required>
              <SelectWithOther
                value={f.sourceOfFunds}
                onChange={(v) => set("sourceOfFunds", v)}
                options={SOURCE_OF_FUNDS}
                placeholder="Select source..."
              />
            </Field>
            <Field label="Expected purpose of funds">
              <SelectWithOther
                value={f.expectedPurpose}
                onChange={(v) => set("expectedPurpose", v)}
                options={LEDGER_PURPOSES}
                placeholder="Select purpose..."
              />
            </Field>
          </div>
          <Field label="Source of funds declaration notes">
            <Textarea
              rows={2}
              value={f.sourceOfFundsNotes}
              onChange={(e) => set("sourceOfFundsNotes", e.target.value)}
            />
          </Field>

          <SectionTitle>Controls &amp; restrictions</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client risk level">
              <Select
                value={f.riskLevel}
                onValueChange={(v) => set("riskLevel", v as TrustRiskLevel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="EDD">
                    Enhanced due diligence (EDD)
                  </SelectItem>
                  <SelectItem value="PEP">PEP</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field
              label="Maximum drawdown per request"
              hint="Leave blank for no limit. Amounts above this need a second authoriser."
            >
              <Input
                type="number"
                min={0}
                placeholder="No limit"
                value={f.maxDrawdownPerRequest}
                onChange={(e) => set("maxDrawdownPerRequest", e.target.value)}
              />
            </Field>
          </div>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={f.invoiceLinkedOnly}
                onCheckedChange={(c) => set("invoiceLinkedOnly", !!c)}
              />
              Restrict drawdowns to linked invoices only (no ad-hoc drawdowns)
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={f.frozen}
                onCheckedChange={(c) => set("frozen", !!c)}
              />
              Create ledger in frozen state (no deposits or drawdowns until
              unfrozen)
            </label>
          </div>

          <SectionTitle>Retainer replenishment</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Minimum balance threshold"
              hint="Below this, a replenishment request is posted to the client portal and emailed"
            >
              <Input
                type="number"
                min={0}
                placeholder="0.00"
                value={f.minBalance}
                onChange={(e) => set("minBalance", e.target.value)}
              />
            </Field>
            <Field
              label="Replenishment target amount"
              hint="The suggested top-up included in the request"
            >
              <Input
                type="number"
                min={0}
                placeholder="0.00"
                value={f.replenishmentTarget}
                onChange={(e) => set("replenishmentTarget", e.target.value)}
              />
            </Field>
          </div>

          <SectionTitle>Client portal &amp; notifications</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client portal access">
              <Select
                value={f.portalAccess}
                onValueChange={(v) =>
                  set("portalAccess", v as TrustPortalAccess)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">
                    Active (client has portal login)
                  </SelectItem>
                  <SelectItem value="Invite pending">
                    Invite pending (send invitation on creation)
                  </SelectItem>
                  <SelectItem value="Disabled">
                    Portal disabled (email only)
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field
              label="Portal contact email"
              required={portalOn}
              hint="Used for notifications, statements and replenishment requests"
            >
              <Input
                type="email"
                placeholder="accounts@client.com"
                value={f.portalContactEmail}
                onChange={(e) => set("portalContactEmail", e.target.value)}
              />
            </Field>
            <Field
              label="Additional portal users"
              hint="Comma-separated. They get email copies of all notifications."
            >
              <Input
                placeholder="cfo@client.com, legal@client.com"
                value={f.additionalPortalUsers}
                onChange={(e) => set("additionalPortalUsers", e.target.value)}
              />
            </Field>
            <Field
              label="Email digest frequency"
              hint="Portal notifications are always real-time; this sets the email cadence"
            >
              <Select
                value={f.emailDigest}
                onValueChange={(v) => set("emailDigest", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Real-time">
                    Real-time (each event)
                  </SelectItem>
                  <SelectItem value="Daily digest">Daily digest</SelectItem>
                  <SelectItem value="Weekly summary">Weekly summary</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            {NOTIFY.map((n) => (
              <label key={n.key} className="flex items-center gap-2">
                <Checkbox
                  checked={f.notifyPrefs[n.key]}
                  onCheckedChange={(c) =>
                    set("notifyPrefs", { ...f.notifyPrefs, [n.key]: !!c })
                  }
                />
                {n.label}
              </label>
            ))}
          </div>
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
              {mut.isPending ? "Creating…" : "Create ledger"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
