import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchClients, type ApiClient } from "@/lib/client/clients-api";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function clientDisplayName(c: ApiClient): string {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
  return name || c.businessName || c.email;
}

// ─────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────

interface ClientSelectProps {
  /** Currently selected client ID */
  value: string;
  /** Called with the selected client ID */
  onValueChange: (clientId: string) => void;
  /** Called with the full client object when selection changes — useful
   *  for auto-filling other fields (e.g. customer name in STR form) */
  onClientChange?: (client: ApiClient) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Only show clients with this KYC status — e.g. "approved" */
  filterByKycStatus?: string;
  /** Only show clients whose overall account status is "approved".
   *  Opt-in and off by default — existing callers (e.g. STR, which
   *  often needs to reference clients regardless of approval state)
   *  are unaffected unless they explicitly turn this on. */
  onlyApproved?: boolean;
  /** Only show clients of this classification */
  classification?: "individual" | "corporate";
}

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

export function ClientSelect({
  value,
  onValueChange,
  onClientChange,
  placeholder = "Select client...",
  disabled = false,
  className,
  filterByKycStatus,
  onlyApproved = false,
  classification,
}: ClientSelectProps) {
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients-list"],
    queryFn: fetchClients,
    staleTime: 5 * 60_000, // cache for 5 min — avoids re-fetching on every mount
  });

  let filtered = clients;
  if (filterByKycStatus)
    filtered = filtered.filter((c) => c.kycStatus === filterByKycStatus);
  if (onlyApproved) {
    filtered = filtered.filter(
      (c) =>
        c.kycStatus?.toLowerCase() === "approved" &&
        c.status?.toLowerCase() === "active",
    );
  }
  if (classification)
    filtered = filtered.filter(
      (c) => c.classifications?.toLowerCase() === classification,
    );

  if (isLoading) {
    return <Skeleton className={`h-10 w-full ${className ?? ""}`} />;
  }

  const emptyMessage =
    filterByKycStatus || onlyApproved || classification
      ? "No eligible clients"
      : "No clients found";

  return (
    <Select
      value={value}
      onValueChange={(id) => {
        onValueChange(id);
        if (onClientChange) {
          const client = clients.find((c) => c._id === id);
          if (client) onClientChange(client);
        }
      }}
      disabled={disabled || filtered.length === 0}
    >
      <SelectTrigger className={className}>
        <SelectValue
          placeholder={filtered.length === 0 ? emptyMessage : placeholder}
        />
      </SelectTrigger>
      <SelectContent>
        {filtered.map((c) => (
          <SelectItem key={c._id} value={c._id}>
            <span>{clientDisplayName(c)}</span>
            {c.kycStatus && (
              <span className="ml-2 text-xs text-muted-foreground capitalize">
                · {c.kycStatus.replace(/_/g, " ")}
              </span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─────────────────────────────────────────────────────────────
// SPECIALIZED VARIANT — approved corporate clients only.
// A drop-in dropdown for anywhere a deal/engagement needs to be
// tied to a real, vetted corporate client — Deal Pipeline today,
// Deal Intelligence and anywhere else that comes up later.
// ─────────────────────────────────────────────────────────────

export function ApprovedCorporateClientSelect(
  props: Omit<ClientSelectProps, "onlyApproved" | "classification">,
) {
  return <ClientSelect {...props} onlyApproved classification="corporate" />;
}
