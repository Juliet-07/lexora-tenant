import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  updateTrustLedger,
  type InterestTreatment,
  type TrustLedger,
  type TrustPortalAccess,
  type TrustRiskLevel,
} from "@/lib/crm/finance-api";
import { Field, SectionTitle } from "./trustShared";

export function EditLedgerDialog({
  ledger,
  onClose,
  onSaved,
}: {
  ledger: TrustLedger | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [f, setF] = useState<any>({});
  useEffect(() => {
    if (!ledger) return;
    setF({
      mandateReference: ledger.mandateReference,
      interestTreatment: ledger.interestTreatment,
      interestRate: String(ledger.interestRate ?? 0),
      riskLevel: ledger.riskLevel,
      maxDrawdownPerRequest: ledger.maxDrawdownPerRequest
        ? String(ledger.maxDrawdownPerRequest)
        : "",
      invoiceLinkedOnly: ledger.invoiceLinkedOnly,
      minBalance: ledger.minBalance ? String(ledger.minBalance) : "",
      replenishmentTarget: ledger.replenishmentTarget
        ? String(ledger.replenishmentTarget)
        : "",
      portalAccess: ledger.portalAccess,
      portalContactEmail: ledger.portalContactEmail,
      additionalPortalUsers: (ledger.additionalPortalUsers ?? []).join(", "),
      emailDigest: ledger.emailDigest,
    });
  }, [ledger]);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const mut = useMutation({
    mutationFn: () =>
      updateTrustLedger(ledger!._id, {
        mandateReference: f.mandateReference,
        interestTreatment: f.interestTreatment as InterestTreatment,
        interestRate:
          f.interestTreatment === "No interest"
            ? 0
            : Number(f.interestRate || 0),
        riskLevel: f.riskLevel as TrustRiskLevel,
        maxDrawdownPerRequest: f.maxDrawdownPerRequest
          ? Number(f.maxDrawdownPerRequest)
          : 0,
        invoiceLinkedOnly: f.invoiceLinkedOnly,
        minBalance: f.minBalance ? Number(f.minBalance) : 0,
        replenishmentTarget: f.replenishmentTarget
          ? Number(f.replenishmentTarget)
          : 0,
        portalAccess: f.portalAccess as TrustPortalAccess,
        portalContactEmail: f.portalContactEmail || undefined,
        additionalPortalUsers: String(f.additionalPortalUsers ?? "")
          .split(/[,;\s]+/)
          .filter(Boolean),
        emailDigest: f.emailDigest,
      }),
    onSuccess: () => {
      toast({ title: "Ledger updated" });
      onSaved();
      onClose();
    },
    onError: (err: any) =>
      toast({
        title: "Could not update ledger",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  if (!ledger) return null;
  const earns = f.interestTreatment !== "No interest";
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {ledger.clientName}</DialogTitle>
          <DialogDescription>
            The bank account, client and currency are fixed once money has moved
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <SectionTitle>Interest &amp; controls</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mandate reference">
              <Input
                value={f.mandateReference ?? ""}
                onChange={(e) => set("mandateReference", e.target.value)}
              />
            </Field>
            <Field label="Risk level">
              <Select
                value={f.riskLevel}
                onValueChange={(v) => set("riskLevel", v)}
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
              label="Interest treatment"
              hint="Credit any accrued interest before changing the treatment or rate"
            >
              <Select
                value={f.interestTreatment}
                onValueChange={(v) => set("interestTreatment", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Client retained",
                    "Firm retained",
                    "Pooled",
                    "No interest",
                  ].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Interest rate (p.a., %)">
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                disabled={!earns}
                value={earns ? f.interestRate : ""}
                onChange={(e) => set("interestRate", e.target.value)}
              />
            </Field>
            <Field label="Maximum drawdown per request" hint="Blank = no limit">
              <Input
                type="number"
                min={0}
                value={f.maxDrawdownPerRequest ?? ""}
                onChange={(e) => set("maxDrawdownPerRequest", e.target.value)}
              />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <Checkbox
                checked={!!f.invoiceLinkedOnly}
                onCheckedChange={(c) => set("invoiceLinkedOnly", !!c)}
              />
              Invoice-linked drawdowns only
            </label>
            <Field label="Minimum balance">
              <Input
                type="number"
                min={0}
                value={f.minBalance ?? ""}
                onChange={(e) => set("minBalance", e.target.value)}
              />
            </Field>
            <Field label="Replenishment target">
              <Input
                type="number"
                min={0}
                value={f.replenishmentTarget ?? ""}
                onChange={(e) => set("replenishmentTarget", e.target.value)}
              />
            </Field>
          </div>
          <SectionTitle>Client portal</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Portal access">
              <Select
                value={f.portalAccess}
                onValueChange={(v) => set("portalAccess", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Invite pending">Invite pending</SelectItem>
                  <SelectItem value="Disabled">
                    Disabled (email only)
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Portal contact email">
              <Input
                type="email"
                value={f.portalContactEmail ?? ""}
                onChange={(e) => set("portalContactEmail", e.target.value)}
              />
            </Field>
            <Field
              label="Additional portal users"
              hint="Comma-separated emails"
            >
              <Input
                value={f.additionalPortalUsers ?? ""}
                onChange={(e) => set("additionalPortalUsers", e.target.value)}
              />
            </Field>
            <Field label="Email digest">
              <Select
                value={f.emailDigest}
                onValueChange={(v) => set("emailDigest", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Real-time">Real-time</SelectItem>
                  <SelectItem value="Daily digest">Daily digest</SelectItem>
                  <SelectItem value="Weekly summary">Weekly summary</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
