import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, FileText, Loader2 } from "lucide-react";
import {
  fetchAvailableTemplates,
  generateContractFromTemplate,
  type ContractType,
} from "@/lib/crm/tools-api";
import { type Vendor } from "@/lib/crm/vendor-api";

type Step = "template" | "terms";

const CONTRACT_TYPES: ContractType[] = [
  "MSA",
  "SOW",
  "NDA",
  "Lease",
  "Supplier",
];

const plusYear = (d: string) => {
  const date = new Date(d);
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
};

// Only handles picking a real, Superadmin-published template and
// setting the commercial terms. Once generated, the real contract
// record exists — editing the wording, sending for signature, and
// countersigning all happen on the existing full Contract detail
// page (/crm/contracts/:id), never duplicated here.
export function VendorContractDialog({
  vendor,
  open,
  onOpenChange,
}: {
  vendor: Vendor;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: templates = [] } = useQuery({
    queryKey: ["contract-templates-available"],
    queryFn: () => fetchAvailableTemplates(),
    enabled: open,
  });

  const [step, setStep] = useState<Step>("template");
  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ContractType>("Supplier");
  const [value, setValue] = useState(String(vendor.annualValue ?? 0));
  const [currency, setCurrency] = useState(vendor.currency);
  const [endDate, setEndDate] = useState(plusYear(today));

  useEffect(() => {
    if (!open) return;
    setStep("template");
    setTemplateId("");
    setTitle("");
    setValue(String(vendor.annualValue ?? 0));
    setCurrency(vendor.currency);
    setEndDate(plusYear(today));
  }, [open]);

  const template = templates.find((t) => t._id === templateId) ?? null;

  const generateMut = useMutation({
    mutationFn: () =>
      generateContractFromTemplate({
        templateId,
        templateSource: "platform",
        title: title.trim(),
        type,
        vendorId: vendor._id,
        value: Number(value) || 0,
        currency,
        expiresOn: endDate,
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({
        queryKey: ["vendorContracts", vendor._id],
      });
      onOpenChange(false);
      toast({
        title: "Contract drafted",
        description: "Opening it now to review the wording and send it.",
      });
      navigate(`/crm/contracts/${created._id}`);
    },
    onError: (err: any) =>
      toast({
        title: "Could not draft contract",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const goDraft = () => {
    if (!templateId) {
      toast({ title: "Pick a template first", variant: "destructive" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Give the contract a title", variant: "destructive" });
      return;
    }
    if (!vendor.contactEmail) {
      toast({
        title: "This vendor has no contact email on file",
        description:
          "Add one on the vendor's Overview tab before drafting a contract.",
        variant: "destructive",
      });
      return;
    }
    generateMut.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New contract — {vendor.legalName}</DialogTitle>
          <DialogDescription>
            Start from a real template published by your Superadmin. Once
            drafted, you'll edit the wording and send it from the full contract
            page — it emails the vendor a PDF and a link to comment and sign.
          </DialogDescription>
        </DialogHeader>

        {step === "template" && (
          <div className="space-y-2">
            {!templates.length && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No published templates yet — your Superadmin needs to publish at
                least one contract template first.
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {templates.map((t) => (
                <button
                  key={t._id}
                  onClick={() => setTemplateId(t._id)}
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    templateId === t._id
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">{t.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.description || t.category || "Superadmin template"}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "terms" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Contract title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`${template?.title ?? "Contract"} — ${vendor.tradingName || vendor.legalName}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contract type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as ContractType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTRACT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label>Expiry date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs">
              <p className="font-medium">Recipient (from the vendor record)</p>
              <p className="mt-0.5 text-muted-foreground">
                {vendor.contactName || "No contact name on file"} —{" "}
                {vendor.contactEmail || "no contact email on file"}
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {step === "terms" && (
              <Button variant="outline" onClick={() => setStep("template")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
          </div>
          {step === "template" && (
            <Button onClick={() => setStep("terms")} disabled={!templateId}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === "terms" && (
            <Button onClick={goDraft} disabled={generateMut.isPending}>
              {generateMut.isPending && (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              )}
              Draft contract
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
