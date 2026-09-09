import { useEffect, useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/RichTextEditor";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Loader2,
  Send,
  Save,
} from "lucide-react";
import {
  MERGE_FIELDS,
  VENDOR_CONTRACT_TEMPLATES,
  renderTemplate,
  saveContract,
  advanceContract,
  type Vendor,
  type VendorContract,
} from "@/lib/crm/vendorStore";

type Step = "template" | "terms" | "edit" | "send";

const STEPS: { key: Step; label: string }[] = [
  { key: "template", label: "1. Template" },
  { key: "terms", label: "2. Terms" },
  { key: "edit", label: "3. Edit" },
  { key: "send", label: "4. Send" },
];

const plusYear = (d: string) => {
  const date = new Date(d);
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
};

export function VendorContractDialog({
  vendor,
  contract,
  open,
  onOpenChange,
}: {
  vendor: Vendor;
  contract?: VendorContract | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);

  const [step, setStep] = useState<Step>("template");
  const [templateId, setTemplateId] = useState(
    contract?.templateId ?? VENDOR_CONTRACT_TEMPLATES[0].id,
  );
  const [title, setTitle] = useState(contract?.title ?? "");
  const [value, setValue] = useState(
    String(contract?.value ?? vendor.annualValue ?? 0),
  );
  const [currency, setCurrency] = useState(contract?.currency ?? vendor.currency);
  const [startDate, setStartDate] = useState(contract?.startDate ?? today);
  const [endDate, setEndDate] = useState(contract?.endDate ?? plusYear(today));
  const [signerName, setSignerName] = useState(
    contract?.signerName ?? vendor.contactName,
  );
  const [signerEmail, setSignerEmail] = useState(
    contract?.signerEmail ?? vendor.contactEmail,
  );
  const [body, setBody] = useState(contract?.body ?? "");
  const [busy, setBusy] = useState(false);

  const template = useMemo(
    () =>
      VENDOR_CONTRACT_TEMPLATES.find((t) => t.id === templateId) ??
      VENDOR_CONTRACT_TEMPLATES[0],
    [templateId],
  );

  useEffect(() => {
    if (!open) return;
    setStep(contract ? "edit" : "template");
    if (contract) setBody(contract.body);
  }, [open, contract]);

  const buildBody = () =>
    renderTemplate(template.body, vendor, {
      value: Number(value) || 0,
      currency,
      startDate,
      endDate,
    });

  const goEdit = () => {
    if (!title.trim()) {
      toast({ title: "Give the contract a title", variant: "destructive" });
      return;
    }
    if (!contract) setBody(buildBody());
    setStep("edit");
  };

  const persist = (): string => {
    return saveContract(vendor.id, {
      id: contract?.id,
      title: title.trim(),
      templateId: template.id,
      templateName: template.name,
      body,
      status: contract?.status ?? "draft",
      value: Number(value) || 0,
      currency,
      startDate,
      endDate,
      sentAt: contract?.sentAt ?? null,
      signedAt: contract?.signedAt ?? null,
      signerName,
      signerEmail,
    });
  };

  const handleSaveDraft = () => {
    persist();
    toast({ title: "Draft saved", description: title });
    onOpenChange(false);
  };

  const handleSend = () => {
    if (!signerEmail.trim()) {
      toast({ title: "Add a signer email", variant: "destructive" });
      return;
    }
    setBusy(true);
    const id = persist();
    setTimeout(() => {
      advanceContract(vendor.id, id, "sent", `Sent to ${signerEmail}`);
      setBusy(false);
      toast({
        title: "Contract sent",
        description: `${title} sent to ${signerName} (${signerEmail}) for signature.`,
      });
      onOpenChange(false);
    }, 400);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contract ? "Edit contract" : "New contract"} — {vendor.legalName}
          </DialogTitle>
          <DialogDescription>
            Start from a template, set the commercial terms, edit the wording,
            then send it to the vendor for signature.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          {STEPS.map((s) => (
            <div
              key={s.key}
              className={`flex-1 rounded-md px-3 py-1.5 text-[11px] font-semibold text-center border ${
                s.key === step
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "text-muted-foreground border-border/60"
              }`}
            >
              {s.label}
            </div>
          ))}
        </div>

        {step === "template" && (
          <div className="grid gap-2 sm:grid-cols-2">
            {VENDOR_CONTRACT_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplateId(t.id)}
                className={`text-left rounded-lg border p-3 transition-colors ${
                  templateId === t.id
                    ? "border-primary bg-primary/5"
                    : "border-border/60 hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">{t.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.description}
                </p>
              </button>
            ))}
          </div>
        )}

        {step === "terms" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Contract title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`${template.name} — ${vendor.tradingName || vendor.legalName}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contract value</Label>
              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Start date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>End date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Signer name</Label>
              <Input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Signer email</Label>
              <Input
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
              />
            </div>
            <p className="sm:col-span-2 text-[11px] text-muted-foreground">
              These values are merged into the template wording in the next
              step, where you can still edit every clause.
            </p>
          </div>
        )}

        {step === "edit" && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground mr-1">
                Merge fields:
              </span>
              {MERGE_FIELDS.map((f) => (
                <Badge key={f} variant="outline" className="text-[10px]">
                  {f}
                </Badge>
              ))}
            </div>
            <RichTextEditor value={body} onChange={setBody} minHeight={340} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBody(buildBody())}
            >
              Reset to template wording
            </Button>
          </div>
        )}

        {step === "send" && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border/60 p-4 space-y-1 text-sm">
              <p className="font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground">
                {template.name} · {currency} {Number(value).toLocaleString()} ·{" "}
                {startDate} → {endDate}
              </p>
              <p className="text-xs text-muted-foreground">
                Recipient: {signerName} ({signerEmail})
              </p>
            </div>
            <div
              className="rounded-lg border border-border/60 bg-muted/20 p-4 max-h-64 overflow-y-auto prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: body }}
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {step !== "template" && (
              <Button
                variant="outline"
                onClick={() =>
                  setStep(
                    step === "send"
                      ? "edit"
                      : step === "edit"
                        ? contract
                          ? "edit"
                          : "terms"
                        : "template",
                  )
                }
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {(step === "edit" || step === "send") && (
              <Button variant="outline" onClick={handleSaveDraft}>
                <Save className="h-4 w-4 mr-1" /> Save draft
              </Button>
            )}
            {step === "template" && (
              <Button onClick={() => setStep("terms")}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === "terms" && (
              <Button onClick={goEdit}>
                Draft contract <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === "edit" && (
              <Button onClick={() => setStep("send")}>
                Review & send <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === "send" && (
              <Button onClick={handleSend} disabled={busy}>
                {busy ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                Send to vendor
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
