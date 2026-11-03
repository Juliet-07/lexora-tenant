import { useEffect, useState, type ReactNode } from "react";
import {
  Banknote,
  Building2,
  BriefcaseBusiness,
  Globe,
  Handshake,
  HeartHandshake,
  Landmark,
  Newspaper,
  Scale,
  ShieldAlert,
  Truck,
  Umbrella,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { CommsStatus } from "@/lib/grc/bcp-comms-api";

// ── Dates ────────────────────────────────────────────────────
const MON = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const p2 = (n: number) => String(n).padStart(2, "0");
export const fmtD = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
};
export const fmtT = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
};
export const fmtDT = (iso?: string | null) =>
  iso ? `${fmtD(iso)}, ${fmtT(iso)}` : "";

/** 2h 05m, 3d 4h, 12m */
export const dur = (ms: number) => {
  const a = Math.abs(ms);
  const d = Math.floor(a / 864e5);
  const h = Math.floor((a % 864e5) / 36e5);
  const m = Math.floor((a % 36e5) / 6e4);
  return d ? `${d}d ${h}h` : h ? `${h}h ${p2(m)}m` : `${m}m`;
};
export const rel = (iso?: string | null) => {
  if (!iso) return "";
  const x = Date.now() - new Date(iso).getTime();
  return x < 6e4 ? "just now" : `${dur(x)} ago`;
};
/** value for <input type="datetime-local"> */
export const toLocalInput = (iso?: string | null) => {
  const d = iso ? new Date(iso) : new Date();
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
};

/** Re-render every `ms` so countdowns stay live. */
export function useTick(ms = 30_000) {
  const [, set] = useState(0);
  useEffect(() => {
    const t = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}

// ── Levels ───────────────────────────────────────────────────
export const LEVELS: Record<
  number,
  { label: string; desc: string; color: string }
> = {
  1: {
    label: "Operational",
    desc: "Minor disruption, under 1 hour",
    color: "#64748b",
  },
  2: {
    label: "Significant",
    desc: "Service degradation, 1 to 4 hours",
    color: "#d97706",
  },
  3: {
    label: "Critical",
    desc: "Major outage, over 4 hours",
    color: "#dc2626",
  },
  4: {
    label: "Catastrophic",
    desc: "Existential threat, regulator or media",
    color: "#7f1d1d",
  },
};

// ── Chips ────────────────────────────────────────────────────
const TONES = {
  grey: "bg-muted text-muted-foreground border-transparent",
  green: "bg-success/10 text-success border-success/20",
  red: "bg-destructive/10 text-destructive border-destructive/20",
  amber: "bg-warning/10 text-warning border-warning/30",
  blue: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300",
  purple:
    "bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-300",
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
  children: ReactNode;
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

export const STATUS: Record<CommsStatus, { label: string; tone: Tone }> = {
  none: { label: "Not started", tone: "grey" },
  draft: { label: "Drafted", tone: "blue" },
  pending: { label: "Awaiting approval", tone: "amber" },
  ready: { label: "Approved, on standby", tone: "purple" },
  sent: { label: "Sent", tone: "green" },
  confirmed: { label: "Receipt confirmed", tone: "green" },
  standby: { label: "On standby", tone: "purple" },
};

// ── Group icons ──────────────────────────────────────────────
export const GROUP_ICONS: Record<string, LucideIcon> = {
  "users-round": UsersRound,
  landmark: Landmark,
  scale: Scale,
  "briefcase-business": BriefcaseBusiness,
  newspaper: Newspaper,
  umbrella: Umbrella,
  handshake: Handshake,
  "building-2": Building2,
  banknote: Banknote,
  truck: Truck,
  "heart-handshake": HeartHandshake,
  globe: Globe,
  "shield-alert": ShieldAlert,
};
export const GROUP_COLORS = [
  "#3b36db",
  "#c62828",
  "#0e7490",
  "#047857",
  "#be185d",
  "#b45309",
  "#6d28d9",
  "#475569",
];

export function GroupIcon({
  icon,
  color,
  size = 38,
}: {
  icon: string;
  color: string;
  size?: number;
}) {
  const Icon = GROUP_ICONS[icon] ?? Handshake;
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[10px]"
      style={{
        width: size,
        height: size,
        background: `${color}1f`,
        color,
      }}
    >
      <Icon style={{ width: size * 0.47, height: size * 0.47 }} />
    </span>
  );
}

export const slaText = (sla: number | null, reactive?: boolean) =>
  reactive || !sla
    ? "Reactive, on request"
    : `Notify within ${sla === 1 ? "1 hour" : `${sla} hours`}`;

export const BRACKET = /\[[^\]]+\]/g;

// ── Confirm dialog ───────────────────────────────────────────
interface Ask {
  title: string;
  text: string;
  label: string;
  danger?: boolean;
  run: () => void;
}
export function useConfirm(): [ReactNode, (a: Ask) => void] {
  const [ask, setAsk] = useState<Ask | null>(null);
  const node = (
    <AlertDialog open={!!ask} onOpenChange={(o) => !o && setAsk(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{ask?.title}</AlertDialogTitle>
          <AlertDialogDescription>{ask?.text}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={
              ask?.danger
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
            onClick={() => {
              ask?.run();
              setAsk(null);
            }}
          >
            {ask?.label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return [node, setAsk];
}

export function Empty({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="px-5 py-10 text-center text-sm text-muted-foreground">
      {icon && <div className="mb-2 flex justify-center">{icon}</div>}
      <b className="mb-1 block text-foreground">{title}</b>
      {children}
    </div>
  );
}
