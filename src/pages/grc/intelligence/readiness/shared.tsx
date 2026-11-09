import type { ReactNode } from "react";
import { toast } from "@/hooks/use-toast";
import { scoreColor, type ReadinessAssessment } from "@/lib/grc/readiness-api";
import type { ReadinessWorkspace } from "@/lib/grc/readiness-workspace-api";

// What every tab gets from the page shell.
export interface TabProps {
  // Undefined until the first assessment has been created.
  current?: ReadinessAssessment;
  versions: ReadinessAssessment[];
  ws: ReadinessWorkspace;
  onAssessment: (a: ReadinessAssessment) => void;
  onWorkspace: (w: ReadinessWorkspace) => void;
  // Switch the page to another version.
  onSwitch: (id: string) => void;
  onNew: () => void;
}

export function errMsg(e: any, fallback = "Something went wrong"): string {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(", ") : (m ?? e?.message ?? fallback);
}

export function fail(title: string, e: any) {
  toast({ title, description: errMsg(e), variant: "destructive" });
}

export function fmtDate(d?: string | Date | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toISOString().slice(0, 10);
}

export function fmtDateTime(d?: string | Date | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return `${dt.toISOString().slice(0, 10)} ${dt.toISOString().slice(11, 16)}`;
}

export function fmtMoney(amount: number, currency: string): string {
  return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function uploadUrl(fileUrl: string): string {
  const base = (import.meta.env.VITE_REACT_APP_BASE_URL ?? "").replace(
    /\/api\/?$/,
    "",
  );
  return `${base}${fileUrl}`;
}

export function bandPill(label: string): string {
  switch (label) {
    case "Investor Ready":
      return "text-emerald-600 border-emerald-500/40 bg-emerald-500/10";
    case "Near Ready":
      return "text-sky-600 border-sky-500/40 bg-sky-500/10";
    case "In Progress":
      return "text-amber-600 border-amber-500/40 bg-amber-500/10";
    default:
      return "text-rose-600 border-rose-500/40 bg-rose-500/10";
  }
}

export function ScoreRing({
  value,
  size = 72,
}: {
  value: number;
  size?: number;
}) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const stroke = value >= 80 ? "#10b981" : value >= 60 ? "#f59e0b" : "#f43f5e";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={6}
          fill="none"
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={6}
          fill="none"
          stroke={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(100, value)) / 100)}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center text-xl font-bold ${scoreColor(value)}`}
      >
        {value}
      </span>
    </div>
  );
}

export function Tile({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 text-center">
      <div className={`text-2xl font-bold ${tone ?? ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {hint ? (
        <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}

export function NeedsAssessment({ onNew }: { onNew: () => void }) {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
      <p>Create an assessment to use this tab.</p>
      <button
        className="mt-3 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        onClick={onNew}
      >
        New assessment
      </button>
    </div>
  );
}

export const PRIORITY_TONE: Record<string, string> = {
  P1: "text-rose-600 border-rose-500/40 bg-rose-500/10",
  P2: "text-amber-600 border-amber-500/40 bg-amber-500/10",
  P3: "text-sky-600 border-sky-500/40 bg-sky-500/10",
};
export const PRIORITY_LABEL: Record<string, string> = {
  P1: "P1 · Deal blocker",
  P2: "P2 · High",
  P3: "P3 · Medium",
};
