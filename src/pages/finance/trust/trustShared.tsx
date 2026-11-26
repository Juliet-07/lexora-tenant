import { useState } from "react";
import { defaultCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  TrustLedgerStatus,
  TrustMovementStatus,
} from "@/lib/crm/finance-api";

export const money = (n: number, c = defaultCurrency()) =>
  (n ?? 0).toLocaleString(undefined, {
    style: "currency",
    currency: c || "USD",
    maximumFractionDigits: 2,
  });

export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";
export const fmtDateTime = (d?: string | null) =>
  d
    ? new Date(d).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

export const SOURCE_OF_FUNDS = [
  "Business operating revenue",
  "Investment proceeds",
  "Sale of property / assets",
  "Loan / credit facility",
  "Grant / donor funding",
  "Personal savings",
  "Inheritance",
];
export const LEDGER_PURPOSES = [
  "Company formation costs",
  "Share capital subscription",
  "Transaction escrow",
  "Professional fees deposit",
  "Regulatory fees and levies",
  "Property acquisition",
  "Investment holding",
];
export const DEPOSIT_PURPOSES = [
  "Professional fees deposit",
  "Share capital subscription",
  "Transaction escrow",
  "Regulatory fees and levies",
  "Property acquisition",
];
export const EXPENSE_CATEGORIES = [
  "Government fees and levies",
  "Notarisation / legalisation",
  "Third-party professional fees",
  "Court / filing fees",
  "Translation services",
  "Other disbursement",
];
export const PAYMENT_METHODS = [
  "Bank transfer (EFT)",
  "RTGS",
  "Cheque",
  "Mobile money (MTN/Airtel)",
  "Internal transfer (trust-to-office)",
];
export const TRUST_CURRENCIES = [
  "RWF",
  "KES",
  "TZS",
  "UGX",
  "BIF",
  "ZAR",
  "BWP",
  "ZWG",
  "MZN",
  "MWK",
  "NGN",
  "GHS",
  "XOF",
  "XAF",
  "USD",
  "EUR",
  "GBP",
  "CHF",
  "AED",
  "CNY",
  "MUR",
];

export const movementStatusClass: Record<TrustMovementStatus, string> = {
  Draft: "bg-muted text-muted-foreground",
  Recorded: "bg-success/10 text-success",
  "Awaiting authorisation": "bg-warning/10 text-warning",
  Approved: "bg-success/10 text-success",
  Rejected: "bg-destructive/10 text-destructive",
};
export const MovementStatusBadge = ({
  status,
}: {
  status: TrustMovementStatus;
}) => (
  <Badge variant="outline" className={movementStatusClass[status] ?? ""}>
    {status}
  </Badge>
);

export const ledgerStatusClass: Record<TrustLedgerStatus, string> = {
  Active: "bg-success/10 text-success",
  Frozen: "bg-info/10 text-info",
  Closing: "bg-warning/10 text-warning",
};
export const LedgerStatusBadge = ({
  status,
}: {
  status: TrustLedgerStatus;
}) => (
  <Badge variant="outline" className={ledgerStatusClass[status] ?? ""}>
    {status}
  </Badge>
);

/** The document behind a movement: INV-…, BILL-…, MND-…, or the original deposit. */
export const SourceBadge = ({
  linkType,
  linkRef,
}: {
  linkType: string | null;
  linkRef: string;
}) =>
  linkType ? (
    <span className="inline-flex items-center gap-1 text-xs">
      <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
        {linkType}
      </Badge>
      <span className="font-mono">{linkRef}</span>
    </span>
  ) : (
    <span className="text-xs text-muted-foreground">—</span>
  );

export const Field = ({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <Label className="text-xs">
      {label}
      {required && <span className="text-destructive"> *</span>}
    </Label>
    {children}
    {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="border-b pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
    {children}
  </h3>
);

/**
 * A dropdown of known choices plus "Other (specify)", which reveals a text
 * box. The value stored is the typed text, so the record says what was
 * actually meant instead of the word "Other".
 */
export function SelectWithOther({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  const known = options.includes(value);
  const [other, setOther] = useState(!!value && !known);
  return (
    <div className="space-y-2">
      <Select
        value={other ? "__other" : value}
        onValueChange={(v) => {
          if (v === "__other") {
            setOther(true);
            onChange("");
          } else {
            setOther(false);
            onChange(v);
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
          <SelectItem value="__other">Other (specify)</SelectItem>
        </SelectContent>
      </Select>
      {other && (
        <Input
          autoFocus
          placeholder="Specify"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

/** A file drop-zone that keeps the chosen files and lets them be removed. */
export function FilePicker({
  files,
  onChange,
  label,
  hint,
}: {
  files: File[];
  onChange: (f: File[]) => void;
  label: string;
  hint: string;
}) {
  return (
    <div className="space-y-2">
      <label className="flex cursor-pointer flex-col items-center gap-1 rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground hover:bg-muted/40">
        <span className="font-medium text-foreground">{label}</span>
        <span>{hint}</span>
        <input
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            const tooBig = picked.find((f) => f.size > 10 * 1024 * 1024);
            if (tooBig) {
              alert(`${tooBig.name} is larger than 10MB`);
              return;
            }
            onChange([...files, ...picked].slice(0, 8));
            e.target.value = "";
          }}
        />
      </label>
      {files.length > 0 && (
        <ul className="space-y-1 text-xs">
          {files.map((f, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded bg-muted/50 px-2 py-1"
            >
              <span className="truncate">{f.name}</span>
              <button
                type="button"
                className="ml-2 text-destructive"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
