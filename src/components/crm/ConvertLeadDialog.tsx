import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Loader2, FileText } from "lucide-react";
import { fetchAvailableTemplates } from "@/lib/crm/tools-api";
import type { Lead, ClientType } from "@/lib/crm/crm-pipeline-api";

const CLIENT_TYPE_OPTIONS: { value: ClientType; label: string }[] = [
  { value: "individual", label: "Individual" },
  { value: "corporate", label: "Corporate" },
  { value: "partner", label: "Partner" },
  { value: "trust", label: "Trust" },
];

export interface ConvertLeadPayload {
  email?: string;
  phoneNumber?: string;
  clientType: ClientType;
  templateId: string;
  templateSource: "platform" | "tenant";
  contractTitle: string;
  contractType?: string;
}

// A client is only ever activated once a real, countersigned
// contract exists — converting a lead is no exception, so this
// dialog collects the same template selection the rest of client
// onboarding requires, not just the contact details.
export function ConvertLeadDialog({
  lead,
  onClose,
  onConfirm,
  isSubmitting,
}: {
  lead: Lead | null;
  onClose: () => void;
  onConfirm: (payload: ConvertLeadPayload) => void;
  isSubmitting: boolean;
}) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [clientType, setClientType] = useState<ClientType>("individual");
  const [templateId, setTemplateId] = useState("");
  const [contractTitle, setContractTitle] = useState("");

  const { data: templates = [] } = useQuery({
    queryKey: ["contract-templates-available"],
    queryFn: () => fetchAvailableTemplates(),
    enabled: !!lead,
  });

  useEffect(() => {
    if (lead) {
      setEmail(lead.contactEmail ?? "");
      setPhone(lead.contactPhone ?? "");
      setContractTitle(
        `Engagement letter — ${lead.contactName || lead.companyName || ""}`,
      );
    }
  }, [lead]);

  if (!lead) return null;
  const emailValue = email || lead.contactEmail || "";
  const canSubmit =
    emailValue.trim().length > 0 &&
    !!templateId &&
    contractTitle.trim().length > 0 &&
    !isSubmitting;

  return (
    <Dialog open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Convert {lead.contactName || lead.companyName} into a client
          </DialogTitle>
          <DialogDescription>
            This creates a real client account and generates a real contract
            from a published template — the client activates once it's signed
            and countersigned.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={email || lead.contactEmail || ""}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@acme.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Phone (optional)</Label>
            <Input
              value={phone || lead.contactPhone || ""}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Client type</Label>
            <Select
              value={clientType}
              onValueChange={(v) => setClientType(v as ClientType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLIENT_TYPE_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Contract title</Label>
            <Input
              value={contractTitle}
              onChange={(e) => setContractTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Contract template</Label>
            {!templates.length ? (
              <p className="text-xs text-muted-foreground py-2">
                No published templates yet — your Superadmin needs to publish at
                least one contract template first.
              </p>
            ) : (
              <div className="grid gap-2 max-h-48 overflow-y-auto">
                {templates.map((t) => (
                  <button
                    key={t._id}
                    type="button"
                    onClick={() => setTemplateId(t._id)}
                    className={`text-left rounded-lg border p-2.5 transition-colors ${
                      templateId === t._id
                        ? "border-primary bg-primary/5"
                        : "border-border/60 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-medium">{t.title}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={() =>
              onConfirm({
                email: emailValue.trim(),
                phoneNumber: phone || lead.contactPhone || undefined,
                clientType,
                templateId,
                templateSource: "platform",
                contractTitle: contractTitle.trim(),
              })
            }
            className="bg-gradient-to-r from-primary to-secondary"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Convert to Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
