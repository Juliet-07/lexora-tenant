import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchVendors } from "@/lib/crm/vendor-api";

// "Who is this contract for?" — shared by New contract and Generate from
// template so the two forms can't drift apart. Three kinds of party:
//   • Client      — a registered client (optionally linked to a mandate)
//   • Vendor      — picked from the vendor register (approved vendors only)
//   • Consultant  — not on any register, so just a name and an email
export type PartyMode = "client" | "vendor" | "consultant";

export interface PartyDraft {
  partyMode: PartyMode;
  clientId: string;
  vendorId: string;
  mandateId: string;
  counterparty: string;
  counterpartyEmail: string;
}

export const emptyParty: PartyDraft = {
  partyMode: "client",
  clientId: "",
  vendorId: "",
  mandateId: "",
  counterparty: "",
  counterpartyEmail: "",
};

/** The party part of the request body — only what the chosen kind needs. */
export const partyPayload = (p: PartyDraft) =>
  p.partyMode === "client"
    ? { clientId: p.clientId, mandateId: p.mandateId || undefined }
    : p.partyMode === "vendor"
      ? { vendorId: p.vendorId }
      : {
          counterparty: p.counterparty.trim(),
          counterpartyEmail: p.counterpartyEmail.trim(),
        };

export const partyReady = (p: PartyDraft) =>
  p.partyMode === "client"
    ? !!p.clientId
    : p.partyMode === "vendor"
      ? !!p.vendorId
      : !!p.counterparty.trim() && !!p.counterpartyEmail.trim();

const MODES: { id: PartyMode; label: string }[] = [
  { id: "client", label: "Client" },
  { id: "vendor", label: "Vendor" },
  { id: "consultant", label: "Consultant" },
];

export function ContractPartyFields({
  value,
  onChange,
  clients,
  mandates,
}: {
  value: PartyDraft;
  onChange: (next: PartyDraft) => void;
  clients: { id: string; label: string }[];
  mandates: { id: string; name: string }[];
}) {
  // The vendor register. Only fetched once someone actually picks Vendor.
  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ["vendors-for-contracts"],
    queryFn: fetchVendors,
    enabled: value.partyMode === "vendor",
  });
  // Contracting can only begin once a vendor is approved (the engine
  // enforces it too), and it needs a contact email to send the contract to.
  const approved = vendors.filter((v) => v.approvalStatus === "approved");

  const set = (patch: Partial<PartyDraft>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-3">
      <div>
        <Label>Who is this contract for?</Label>
        <div className="mt-1 flex gap-2">
          {MODES.map((m) => (
            <Button
              key={m.id}
              type="button"
              size="sm"
              variant={value.partyMode === m.id ? "default" : "outline"}
              onClick={() => set({ partyMode: m.id })}
            >
              {m.label}
            </Button>
          ))}
        </div>
      </div>

      {value.partyMode === "client" && (
        <>
          <div>
            <Label>Client</Label>
            <Select
              value={value.clientId}
              onValueChange={(v) => set({ clientId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a registered client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Emailed to this client and also appears on their client-portal
              dashboard.
            </p>
          </div>
          <div>
            <Label>Linked mandate (optional)</Label>
            <Select
              value={value.mandateId || "none"}
              onValueChange={(v) => set({ mandateId: v === "none" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {mandates.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {value.partyMode === "vendor" && (
        <div>
          <Label>Vendor</Label>
          <Select
            value={value.vendorId}
            onValueChange={(v) => set({ vendorId: v })}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  vendorsLoading
                    ? "Loading vendors…"
                    : "Pick a vendor from your register"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {approved.map((v) => (
                <SelectItem
                  key={v._id}
                  value={v._id}
                  disabled={!v.contactEmail}
                >
                  {v.tradingName || v.legalName}
                  {v.category ? ` · ${v.category}` : ""}
                  {!v.contactEmail ? " (no contact email)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">
            {!vendorsLoading && approved.length === 0
              ? "No approved vendors yet — a vendor has to be approved in the vendor register before it can be contracted."
              : "Approved vendors from your vendor register. The contract goes to the vendor's contact email."}
          </p>
        </div>
      )}

      {value.partyMode === "consultant" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Name</Label>
            <Input
              value={value.counterparty}
              onChange={(e) => set({ counterparty: e.target.value })}
              placeholder="e.g. Jane Doe Consulting"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={value.counterpartyEmail}
              onChange={(e) => set({ counterpartyEmail: e.target.value })}
            />
          </div>
          <p className="col-span-2 text-xs text-muted-foreground">
            Sent via a secure public signing link — no client-portal account
            needed.
          </p>
        </div>
      )}
    </div>
  );
}
