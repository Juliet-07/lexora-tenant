import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchClients, type ApiClient } from "@/lib/clients-api";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function clientDisplayName(c: ApiClient): string {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
  return name || c.email;
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
}: ClientSelectProps) {
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients-list"],
    queryFn: fetchClients,
    staleTime: 5 * 60_000, // cache for 5 min — avoids re-fetching on every mount
  });

  const filtered = filterByKycStatus
    ? clients.filter((c) => c.kycStatus === filterByKycStatus)
    : clients;

  if (isLoading) {
    return <Skeleton className={`h-10 w-full ${className ?? ""}`} />;
  }

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
          placeholder={
            filtered.length === 0
              ? filterByKycStatus
                ? `No ${filterByKycStatus} clients`
                : "No clients found"
              : placeholder
          }
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
