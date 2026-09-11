import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import {
  createVendor,
  VENDOR_CATEGORIES,
  JURISDICTIONS,
  ENGAGEMENT_TYPES,
  PAYMENT_TERMS,
  DD_CHECKLIST_LABELS,
  type VendorCategory,
  type VendorRisk,
} from "@/lib/crm/vendor-api";

const STEP_LABELS = [
  "1. Details",
  "2. Services",
  "3. Risk & review",
  "4. Justification",
];

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

export function AddVendorDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    legalName: "",
    tradingName: "",
    category: "" as VendorCategory | "",
    jurisdiction: "",
    registrationNumber: "",
    taxId: "",
    contactName: "",
    contactTitle: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    serviceSummary: "",
    engagementType: ENGAGEMENT_TYPES[0],
    annualValue: "",
    currency: "USD",
    paymentTerms: PAYMENT_TERMS[0],
    budgetCode: "",
    risk: "Low" as VendorRisk,
    reviewFrequency: "Annual",
    justification: "",
  });

  const set = (k: keyof typeof f, v: any) => setF((p) => ({ ...p, [k]: v }));

  const reset = () => setStep(0);

  const createMut = useMutation({
    mutationFn: () =>
      createVendor({
        legalName: f.legalName.trim(),
        tradingName: f.tradingName.trim(),
        category: f.category as VendorCategory,
        serviceSummary: f.serviceSummary.trim(),
        jurisdiction: f.jurisdiction || "Other",
        registrationNumber: f.registrationNumber,
        taxId: f.taxId,
        contactName: f.contactName.trim(),
        contactTitle: f.contactTitle,
        contactEmail: f.contactEmail.trim(),
        contactPhone: f.contactPhone,
        website: f.website,
        engagementType: f.engagementType,
        annualValue: Number(f.annualValue) || 0,
        currency: f.currency,
        paymentTerms: f.paymentTerms,
        budgetCode: f.budgetCode,
        risk: f.risk,
        reviewFrequency: f.reviewFrequency,
        justification: f.justification,
      }),
    onSuccess: (v) => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast({
        title: "Vendor registered",
        description: `${v.legalName} added — due diligence evidence can now be uploaded from the vendor's Diligence tab.`,
      });
      onOpenChange(false);
      reset();
    },
    onError: (err: any) =>
      toast({
        title: "Could not register vendor",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const submit = () => {
    if (!f.legalName.trim() || !f.category || !f.contactEmail.trim()) {
      toast({
        title: "Missing details",
        description: "Legal name, category and contact email are required.",
        variant: "destructive",
      });
      setStep(0);
      return;
    }
    createMut.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Vendor</DialogTitle>
          <DialogDescription>
            Register a new vendor. Due diligence evidence and approval are
            handled afterwards from the vendor's detail view.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          {STEP_LABELS.map((l, i) => (
            <div
              key={l}
              className={`flex-1 rounded-md px-3 py-1.5 text-[11px] font-semibold text-center border ${
                i === step
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "text-muted-foreground border-border/60"
              }`}
            >
              {l}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Legal name *" className="sm:col-span-2">
              <Input
                value={f.legalName}
                onChange={(e) => set("legalName", e.target.value)}
                placeholder="e.g. Smile Identity Ltd"
              />
            </Field>
            <Field label="Trading name">
              <Input
                value={f.tradingName}
                onChange={(e) => set("tradingName", e.target.value)}
              />
            </Field>
            <Field label="Category *">
              <Select
                value={f.category}
                onValueChange={(v) => set("category", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category…" />
                </SelectTrigger>
                <SelectContent>
                  {VENDOR_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Jurisdiction">
              <Select
                value={f.jurisdiction}
                onValueChange={(v) => set("jurisdiction", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select jurisdiction…" />
                </SelectTrigger>
                <SelectContent>
                  {JURISDICTIONS.map((j) => (
                    <SelectItem key={j} value={j}>
                      {j}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Registration number">
              <Input
                value={f.registrationNumber}
                onChange={(e) => set("registrationNumber", e.target.value)}
              />
            </Field>
            <Field label="Tax ID / TIN">
              <Input
                value={f.taxId}
                onChange={(e) => set("taxId", e.target.value)}
              />
            </Field>
            <Field label="Contact name">
              <Input
                value={f.contactName}
                onChange={(e) => set("contactName", e.target.value)}
              />
            </Field>
            <Field label="Job title">
              <Input
                value={f.contactTitle}
                onChange={(e) => set("contactTitle", e.target.value)}
              />
            </Field>
            <Field label="Email *">
              <Input
                value={f.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={f.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
              />
            </Field>
            <Field label="Website" className="sm:col-span-2">
              <Input
                value={f.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://"
              />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Services to be provided" className="sm:col-span-2">
              <Textarea
                rows={3}
                value={f.serviceSummary}
                onChange={(e) => set("serviceSummary", e.target.value)}
              />
            </Field>
            <Field label="Engagement type">
              <Select
                value={f.engagementType}
                onValueChange={(v) => set("engagementType", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENGAGEMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Estimated annual value">
              <Input
                type="number"
                value={f.annualValue}
                onChange={(e) => set("annualValue", e.target.value)}
              />
            </Field>
            <Field label="Payment terms">
              <Select
                value={f.paymentTerms}
                onValueChange={(v) => set("paymentTerms", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TERMS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Budget code / cost centre">
              <Input
                value={f.budgetCode}
                onChange={(e) => set("budgetCode", e.target.value)}
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-sm font-medium">Due diligence checklist</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Once registered, this vendor's checklist (
                {DD_CHECKLIST_LABELS.length} items) opens in the Diligence tab.
                Each item is only marked done once a real supporting document is
                uploaded against it — there's no shortcut here at registration.
              </p>
              <ul className="mt-2 space-y-1">
                {DD_CHECKLIST_LABELS.map((label) => (
                  <li
                    key={label}
                    className="text-xs text-muted-foreground flex items-center gap-1.5"
                  >
                    <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Initial risk rating">
                <Select value={f.risk} onValueChange={(v) => set("risk", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">
                      Low — no client data access
                    </SelectItem>
                    <SelectItem value="Medium">
                      Medium — sensitive data or operations
                    </SelectItem>
                    <SelectItem value="High">
                      High — critical or regulated dependency
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Review frequency">
                <Select
                  value={f.reviewFrequency}
                  onValueChange={(v) => set("reviewFrequency", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Annual", "Semi-annual", "Quarterly"].map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <Field label="Business justification">
              <Textarea
                rows={4}
                value={f.justification}
                onChange={(e) => set("justification", e.target.value)}
                placeholder="Why is this vendor needed and why were they selected over alternatives?"
              />
            </Field>
            <div className="rounded-lg border border-border/60 p-3 text-xs space-y-1">
              <p className="font-semibold text-sm">Summary</p>
              <p>
                {f.legalName || "—"} · {f.category || "—"} ·{" "}
                {f.jurisdiction || "—"}
              </p>
              <p>
                Will be registered as <strong>Pending DD</strong>.
              </p>
              <p className="text-muted-foreground">
                Approval is requested afterwards from a Head of Department or
                Manager, once due diligence is complete.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="sm:justify-between gap-2">
          <Button
            variant="outline"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
          >
            Back
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)}>Next</Button>
          ) : (
            <Button onClick={submit} disabled={createMut.isPending}>
              {createMut.isPending ? "Registering…" : "Register vendor"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
