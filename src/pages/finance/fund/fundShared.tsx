import { Badge } from "@/components/ui/badge";

export {
  money,
  fmtDate,
  fmtDateTime,
  Field,
  SectionTitle,
} from "../trust/trustShared";

export const today = () => new Date().toISOString().slice(0, 10);

export const AML_KYC_STATUSES = [
  "Pending",
  "In review",
  "Cleared",
  "Enhanced due diligence",
  "Expired",
];
export const SUBSCRIPTION_STATUSES = [
  "Not yet sent",
  "Sent for signature",
  "Signed",
  "Countersigned",
  "Accepted",
];

const tone: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-800 border-emerald-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  red: "bg-red-100 text-red-800 border-red-200",
  blue: "bg-blue-100 text-blue-800 border-blue-200",
  grey: "bg-muted text-muted-foreground border-transparent",
};

export const StatusPill = ({
  label,
  kind = "grey",
}: {
  label: string;
  kind?: keyof typeof tone;
}) => (
  <Badge variant="outline" className={`font-medium ${tone[kind]}`}>
    {label}
  </Badge>
);

export const kycKind = (s?: string) =>
  s === "Cleared"
    ? "green"
    : s === "Expired" || s === "Enhanced due diligence"
      ? "red"
      : s === "In review"
        ? "amber"
        : "grey";
export const subscriptionKind = (s?: string) =>
  s === "Countersigned" || s === "Accepted"
    ? "green"
    : s === "Signed"
      ? "blue"
      : s === "Sent for signature"
        ? "amber"
        : "grey";

export const errMessage = (err: any, fallback = "Something went wrong") => {
  const m = err?.response?.data?.message;
  return Array.isArray(m) ? m.join(", ") : (m ?? fallback);
};

/** Saves a Blob-less download from a hosted file URL. */
export const openFileUrl = (url?: string | null) => {
  if (url) window.open(url, "_blank", "noopener");
};

/** Reporting periods the engine understands: quarters, financial years, YTD, ITD. */
export const periodOptions = () => {
  const now = new Date();
  let y = now.getFullYear();
  let q = Math.floor(now.getMonth() / 3) + 1;
  const quarters: string[] = [];
  for (let i = 0; i < 6; i++) {
    quarters.push(`${y}-Q${q}`);
    q -= 1;
    if (q === 0) {
      q = 4;
      y -= 1;
    }
  }
  const fy = now.getFullYear();
  return [...quarters, `FY ${fy}`, `FY ${fy - 1}`, "YTD", "ITD", "custom"];
};
export const periodLabel = (p: string) =>
  p === "YTD"
    ? "Year to date"
    : p === "ITD"
      ? "Inception to date"
      : p === "custom"
        ? "Custom range…"
        : p;
