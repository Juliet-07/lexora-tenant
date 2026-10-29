import { useMemo, useRef, type ReactNode } from "react";
import { useQuery, type QueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Paperclip, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { FINANCE_CURRENCIES } from "@/hooks/use-finance-currency";
import { toAbsoluteFileUrl } from "@/lib/hr/hr-employee-documents-api";
import { fetchCapTableFx, type UploadedDoc } from "@/lib/grc/ownership-api";
import {
  fetchOrgStructure,
  type OrgStructureNode,
} from "@/lib/grc/governance-api";

// Shared bits for the Cap Table / Intellectual Property / Register of
// Charges tabs of Organisation Structure.

export const fmtNum = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("en-US");

export const fmtPct = (n: number) => `${(Math.round(n * 10) / 10).toFixed(1)}%`;

export function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** yyyy-mm-dd for <input type="date">. */
export const toDateInput = (d: string | Date | null | undefined) =>
  d ? new Date(d).toISOString().slice(0, 10) : "";

export const todayInput = () => new Date().toISOString().slice(0, 10);

// A colour per holder / slice. Hex so they also work inside SVG.
export const SLICE_COLORS = [
  "#6C5CE7",
  "#C4A35A",
  "#2563EB",
  "#16A34A",
  "#DC2626",
  "#D97706",
  "#8B5CF6",
  "#0EA5E9",
];

export const errMsg = (e: any) =>
  e?.response?.data?.message
    ? Array.isArray(e.response.data.message)
      ? e.response.data.message.join(", ")
      : e.response.data.message
    : (e?.message ?? "Something went wrong");

// ── Display currency ────────────────────────────────────────────
// Everything is stored in the tenant's base currency. `displayCurrency`
// ("" = base) is chosen once at the top of the page; the rate comes
// from the engine's exchange-rate service.
export function useMoney(
  baseCurrency: string | undefined,
  displayCurrency: string,
) {
  const base = baseCurrency ?? "";
  const target = displayCurrency || base;
  const needsRate = !!base && !!target && target !== base;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["cap-table-fx", base, target],
    queryFn: () => fetchCapTableFx(target),
    enabled: needsRate,
    staleTime: 10 * 60 * 1000,
  });
  const rate = needsRate ? (data?.rate ?? null) : 1;
  const currency = needsRate && rate === null ? base : target;

  const money = (amountInBase: number | null | undefined) => {
    const v = (amountInBase ?? 0) * (rate ?? 1);
    const abs = Math.abs(v);
    const digits = abs >= 1000 || Number.isInteger(v) ? 0 : 2;
    return `${currency} ${v.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    })}`;
  };

  return {
    money,
    currency,
    base,
    rate: rate ?? 1,
    loading: needsRate && isLoading,
    failed: needsRate && isError,
    converted: needsRate && rate !== null,
    stale: !!data?.stale,
  };
}

export function CurrencySwitcher({
  baseCurrency,
  value,
  onChange,
  status,
}: {
  baseCurrency?: string;
  value: string;
  onChange: (v: string) => void;
  status?: { loading: boolean; failed: boolean; stale: boolean };
}) {
  const options = Array.from(
    new Set([baseCurrency, ...FINANCE_CURRENCIES].filter(Boolean) as string[]),
  );
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Show values in</span>
      <Select
        value={value || baseCurrency || "base"}
        onValueChange={(v) => onChange(v === baseCurrency ? "" : v)}
      >
        <SelectTrigger className="h-8 w-28 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
              {c === baseCurrency ? " (base)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {status?.loading && (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      )}
      {status?.failed && (
        <span className="text-xs text-destructive">
          Rate unavailable — showing {baseCurrency}
        </span>
      )}
      {!status?.failed && status?.stale && (
        <span className="text-xs text-amber-600">Rate may be out of date</span>
      )}
    </div>
  );
}

// ── Small building blocks ───────────────────────────────────────
export function StatCards({
  items,
}: {
  items: { label: string; value: ReactNode; sub?: string; tone?: string }[];
}) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}
    >
      {items.map((k) => (
        <Card key={k.label}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.tone ?? ""}`}>
              {k.value}
            </p>
            {k.sub && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {k.sub}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="py-12 text-center space-y-3">
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      {action}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  pending,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** A labelled hidden file input behind a button. */
export function UploadButton({
  label = "Attach",
  pending,
  onFile,
  accept = ".pdf,.doc,.docx,.png,.jpg,.jpeg",
  size = "sm",
}: {
  label?: string;
  pending?: boolean;
  onFile: (file: File) => void;
  accept?: string;
  size?: "sm" | "default";
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        size={size}
        variant="outline"
        className="h-7 text-xs"
        disabled={pending}
        onClick={() => ref.current?.click()}
      >
        {pending ? (
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        ) : (
          <Paperclip className="h-3 w-3 mr-1" />
        )}
        {label}
      </Button>
    </>
  );
}

/** Public-folder documents (IP, charges, convertibles). */
export function DocChips({
  docs,
  onRemove,
  max,
}: {
  docs: UploadedDoc[];
  onRemove?: (index: number) => void;
  max?: number;
}) {
  if (!docs?.length) {
    return <span className="text-[11px] text-muted-foreground">None</span>;
  }
  const shown = max ? docs.slice(0, max) : docs;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((d, i) => (
        <span
          key={`${d.fileUrl}-${i}`}
          className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-0.5 text-[11px]"
        >
          <a
            href={toAbsoluteFileUrl(d.fileUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:underline"
            onClick={(e) => e.stopPropagation()}
            title={d.name}
          >
            <FileText className="h-3 w-3" />
            {d.name.length > 20 ? `${d.name.slice(0, 18)}…` : d.name}
          </a>
          {onRemove && (
            <button
              type="button"
              className="text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(i);
              }}
              title="Remove"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      {max && docs.length > max && (
        <Badge variant="outline" className="text-[10px]">
          +{docs.length - max}
        </Badge>
      )}
    </div>
  );
}

// ── Form field wrapper ──────────────────────────────────────────
export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ── People from the org structure ───────────────────────────────
// Everyone on the org chart, once each (a node connected to several
// parents appears several times in the tree) — the pool of people a
// shareholder, vesting holder, etc. can be picked from.
export function useOrgPeople() {
  const { data } = useQuery({
    queryKey: ["org-structure"],
    queryFn: fetchOrgStructure,
  });
  return useMemo(() => {
    const seen = new Map<string, OrgStructureNode>();
    const walk = (list: OrgStructureNode[]) => {
      for (const n of list) {
        if (!seen.has(n.id)) seen.set(n.id, n);
        walk(n.children);
      }
    };
    walk(data?.roots ?? []);
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);
}

/** Refresh everything the ownership tabs and the org chart show. */
export function invalidateOwnership(qc: QueryClient) {
  for (const key of [
    "cap-table",
    "cap-transactions",
    "cap-vesting",
    "cap-convertibles",
    "org-structure",
  ]) {
    qc.invalidateQueries({ queryKey: [key] });
  }
}

export const rolesOf = (n: { type: string; types?: string[] }) =>
  n.types?.length ? n.types : [n.type];
