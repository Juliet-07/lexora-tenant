import type { ComponentType } from "react";
import {
  Megaphone,
  ScrollText,
  ShieldCheck,
  Scale,
  Building2,
  HeartPulse,
  Lock,
  PartyPopper,
  CalendarDays,
  TrendingUp,
  GraduationCap,
  Bell,
  Flag,
  Siren,
  Pin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type {
  NoticePriority,
  NoticeStatus,
  RecipientStatus,
} from "@/lib/hr/hr-notices-api";

// ── Dates ────────────────────────────────────────────────────
export const fmtD = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "None";

export const fmtT = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

export const fmtDT = (iso?: string | null) =>
  iso ? `${fmtD(iso)}, ${fmtT(iso)}` : "None";

/** "3 hours ago" / "in 2 days" */
export const rel = (iso?: string | null) => {
  if (!iso) return "";
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const min = Math.round(abs / 60000);
  const hr = Math.round(abs / 3600000);
  const day = Math.round(abs / 86400000);
  const unit =
    min < 1
      ? "moments"
      : min < 60
        ? `${min} min`
        : hr < 24
          ? `${hr} ${hr === 1 ? "hour" : "hours"}`
          : day < 30
            ? `${day} ${day === 1 ? "day" : "days"}`
            : fmtD(iso);
  if (unit === "moments") return diff > 0 ? "in moments" : "just now";
  if (!/\d/.test(unit) || /\d{4}$/.test(unit)) return unit;
  return diff > 0 ? `in ${unit}` : `${unit} ago`;
};

/** Whole days from now until the date (negative when past). */
export const daysUntil = (iso?: string | null) => {
  if (!iso) return 0;
  const d = new Date(iso);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  return Math.round((end - today) / 86400000);
};

export const dayWord = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

/** yyyy-mm-dd for <input type="date"> */
export const toDateInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** yyyy-mm-ddThh:mm for <input type="datetime-local"> */
export const toLocalInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${toDateInput(iso)}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export const inDays = (days: number, h = 8, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const stripHtml = (html: string) => {
  const el = document.createElement("div");
  el.innerHTML = html || "";
  return el.textContent || "";
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export const pct = (a: number, b: number) =>
  b ? Math.round((a / b) * 100) : 0;

// ── Categories ───────────────────────────────────────────────
type Icon = ComponentType<{ className?: string }>;
export const CATEGORY_STYLE: Record<string, { icon: Icon; color: string }> = {
  Policy: { icon: ScrollText, color: "#3b36db" },
  Compliance: { icon: ShieldCheck, color: "#b8860b" },
  Statutory: { icon: Scale, color: "#0f766e" },
  "Office and Facilities": { icon: Building2, color: "#475569" },
  "Health and Safety": { icon: HeartPulse, color: "#c62828" },
  "IT and Security": { icon: Lock, color: "#6d28d9" },
  Announcement: { icon: PartyPopper, color: "#059669" },
  Events: { icon: CalendarDays, color: "#d97706" },
  Performance: { icon: TrendingUp, color: "#0369a1" },
  Training: { icon: GraduationCap, color: "#7c3aed" },
  General: { icon: Megaphone, color: "#64748b" },
};
export const categoryStyle = (c: string) =>
  CATEGORY_STYLE[c] ?? { icon: Bell, color: "#64748b" };

// ── Chips ────────────────────────────────────────────────────
const TONES = {
  grey: "bg-muted text-muted-foreground border-transparent",
  green: "bg-success/10 text-success border-success/20",
  red: "bg-destructive/10 text-destructive border-destructive/20",
  amber: "bg-warning/10 text-warning border-warning/30",
  blue: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300",
  purple:
    "bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-300",
  gold: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300",
  primary: "bg-primary/10 text-primary border-primary/20",
} as const;
export type Tone = keyof typeof TONES;

export function Chip({
  tone = "grey",
  dot,
  className,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export const STATUS_TONE: Record<NoticeStatus, { label: string; tone: Tone }> =
  {
    draft: { label: "Draft", tone: "grey" },
    scheduled: { label: "Scheduled", tone: "blue" },
    sent: { label: "Sent", tone: "green" },
    archived: { label: "Archived", tone: "grey" },
  };

export const RECIPIENT_TONE: Record<
  RecipientStatus,
  { label: string; tone: Tone }
> = {
  acknowledged: { label: "Acknowledged", tone: "green" },
  overdue: { label: "Overdue", tone: "red" },
  pending: { label: "Read, not acknowledged", tone: "amber" },
  read: { label: "Read", tone: "blue" },
  unread: { label: "Not opened", tone: "grey" },
};

export const PRIORITY_LABEL: Record<NoticePriority, string> = {
  normal: "Normal",
  important: "Important",
  critical: "Critical",
};

export function PriorityChip({ priority }: { priority: NoticePriority }) {
  if (priority === "normal") return null;
  return priority === "critical" ? (
    <Chip tone="red">
      <Siren className="h-3 w-3" />
      Critical
    </Chip>
  ) : (
    <Chip tone="amber">
      <Flag className="h-3 w-3" />
      Important
    </Chip>
  );
}

export function CategoryChip({ category }: { category: string }) {
  const { color } = categoryStyle(category);
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: `${color}14`, color }}
    >
      {category}
    </span>
  );
}

export function PinMark({ className }: { className?: string }) {
  return <Pin className={cn("h-3.5 w-3.5 text-amber-600", className)} />;
}

export function CategoryIcon({
  category,
  size = 38,
}: {
  category: string;
  size?: number;
}) {
  const { icon: I, color } = categoryStyle(category);
  return (
    <span
      className="grid shrink-0 place-items-center rounded-xl"
      style={{ width: size, height: size, background: `${color}14`, color }}
    >
      <I className="h-[18px] w-[18px]" />
    </span>
  );
}

// ── Progress ─────────────────────────────────────────────────
export const ackColor = (p: number) =>
  p >= 90 ? "#059669" : p >= 60 ? "#d97706" : "#c62828";

export function Bar({
  value,
  color = "#3b36db",
  className,
}: {
  value: number;
  color?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            background: color,
          }}
        />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
        {value}%
      </span>
    </div>
  );
}

export function Person({
  name,
  sub,
  size = 32,
}: {
  name: string;
  sub?: string;
  size?: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className="grid shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary"
        style={{ width: size, height: size }}
      >
        {initials(name)}
      </span>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium">{name}</div>
        {sub && (
          <div className="truncate text-xs text-muted-foreground">{sub}</div>
        )}
      </div>
    </div>
  );
}

export function Empty({
  icon: I,
  title,
  children,
}: {
  icon: Icon;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-12 text-center text-sm text-muted-foreground">
      <I className="mb-1 h-7 w-7 opacity-60" />
      <b className="text-foreground">{title}</b>
      {children}
    </div>
  );
}

/** Rich-text body rendered from trusted tenant HTML. */
export function Prose({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_h2]:mb-1 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_li]:my-0.5 [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:my-2 [&_ul]:ml-5 [&_ul]:list-disc",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export const fileExt = (name: string) =>
  (name.split(".").pop() || "").toUpperCase().slice(0, 4);

/** Resolve an uploaded attachment URL against the API origin. */
export const attachmentHref = (url?: string | null) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  try {
    const base = api.defaults.baseURL ?? "";
    return `${new URL(base, window.location.origin).origin}${url}`;
  } catch {
    return url;
  }
};
