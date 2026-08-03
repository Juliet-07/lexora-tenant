import { useQuery } from "@tanstack/react-query";
import { Building2, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fetchClients, type ApiClient } from "@/lib/client/clients-api";

// ─────────────────────────────────────────────────────────────
// Deal Intelligence subject — the entity every workbook is run
// against. Either the tenant's own company, or one of its clients.
// ─────────────────────────────────────────────────────────────

export type IntelSubjectKind = "own" | "client";

export interface IntelSubject {
  kind: IntelSubjectKind;
  /** Display label — also the key records are stored under. */
  label: string;
  clientId?: string;
}

export function ownCompanyName(): string {
  try {
    const raw = localStorage.getItem("tenantUser");
    if (raw) {
      const u = JSON.parse(raw);
      const n =
        u?.tenant?.name ??
        u?.tenantName ??
        u?.companyName ??
        u?.organisationName;
      if (typeof n === "string" && n.trim()) return n.trim();
    }
  } catch {
    /* ignore */
  }
  return "My Company";
}

export function ownSubject(): IntelSubject {
  return { kind: "own", label: ownCompanyName() };
}

function clientLabel(c: ApiClient): string {
  return (
    c.businessName ||
    [c.firstName, c.lastName].filter(Boolean).join(" ") ||
    c.email
  );
}

const OWN_VALUE = "__own__";

interface Props {
  value: IntelSubject;
  onChange: (s: IntelSubject) => void;
  /** Company labels already present in the workbook store. */
  existing?: string[];
  className?: string;
}

export function IntelSubjectPicker({
  value,
  onChange,
  existing = [],
  className,
}: Props) {
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: fetchClients,
    staleTime: 5 * 60_000,
  });

  const own = ownCompanyName();
  const clientLabels = clients.map(clientLabel);
  const extras = existing.filter(
    (e) => e && e !== own && !clientLabels.includes(e),
  );

  const selected = value.kind === "own" ? OWN_VALUE : value.label;

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Select
        value={selected}
        onValueChange={(v) => {
          if (v === OWN_VALUE) return onChange(ownSubject());
          const c = clients.find((x) => clientLabel(x) === v);
          onChange({ kind: "client", label: v, clientId: c?._id });
        }}
      >
        <SelectTrigger className="w-72">
          <SelectValue placeholder="Select subject…" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Own organisation</SelectLabel>
            <SelectItem value={OWN_VALUE}>{own}</SelectItem>
          </SelectGroup>
          {clients.length > 0 && (
            <SelectGroup>
              <SelectLabel>Clients</SelectLabel>
              {clients.map((c) => (
                <SelectItem key={c._id} value={clientLabel(c)}>
                  {clientLabel(c)}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
          {extras.length > 0 && (
            <SelectGroup>
              <SelectLabel>Other workspaces</SelectLabel>
              {extras.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
      <Badge variant="outline" className="gap-1">
        {value.kind === "own" ? (
          <>
            <Building2 className="h-3 w-3" />
            Own company
          </>
        ) : (
          <>
            <Users className="h-3 w-3" />
            Client
          </>
        )}
      </Badge>
    </div>
  );
}
