import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type {
  CandidateStage,
  TerminationCategory,
  NoticeHandling,
} from "@/lib/hr/hr-recruitment-api";

export const STAGES: { key: CandidateStage; label: string }[] = [
  { key: "sourced", label: "Sourced" },
  { key: "screening", label: "Screening" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
  { key: "hired", label: "Hired" },
  { key: "rejected", label: "Rejected" },
];

export const stageColor = (s: CandidateStage) =>
  s === "hired"
    ? "bg-success/10 text-success border-success/20"
    : s === "rejected"
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : s === "offer"
        ? "bg-warning/10 text-warning border-warning/20"
        : s === "interview"
          ? "bg-info/10 text-info border-info/20"
          : "bg-muted text-muted-foreground border-border";

export const OFFBOARDING_STATUS_TONE: Record<string, string> = {
  not_started: "bg-muted text-muted-foreground border-border",
  in_progress: "bg-warning/10 text-warning border-warning/20",
  completed: "bg-success/10 text-success border-success/20",
  reversed: "bg-info/10 text-info border-info/20",
};

export const TERMINATION_CATEGORIES: TerminationCategory[] = [
  "misconduct",
  "performance",
  "redundancy",
  "mutual",
  "fixed_term",
  "retirement",
  "probation",
];

export const NOTICE_HANDLING_OPTIONS: NoticeHandling[] = [
  "serve",
  "pil",
  "garden",
  "summary",
];

export const RISK_TONE: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-success/10 text-success border-success/20",
};

export const READINESS_TONE: Record<string, string> = {
  ready_now: "bg-success/10 text-success border-success/20",
  ready_1_2_years: "bg-info/10 text-info border-info/20",
  ready_3_plus_years: "bg-info/10 text-info border-info/20",
  gap: "bg-destructive/10 text-destructive border-destructive/20",
};

export const READINESS_LABEL: Record<string, string> = {
  ready_now: "Ready now",
  ready_1_2_years: "Ready 1–2 yrs",
  ready_3_plus_years: "Ready 3+ yrs",
  gap: "Gap",
};

export const POTENTIAL_TONE: Record<string, string> = {
  high: "bg-success/10 text-success border-success/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-muted text-muted-foreground border-border",
};

export const ALERT_SEVERITY_TONE: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
};

export const PERFORMANCE_TONE: Record<string, string> = {
  high: "bg-success/10 text-success border-success/20",
  moderate: "bg-warning/10 text-warning border-warning/20",
  low: "bg-destructive/10 text-destructive border-destructive/20",
};

export const MILESTONE_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  in_progress: "In progress",
  done: "Done",
};

export const fmtDateShort = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const fmtMoney = (n: number, currency: string) =>
  `${currency} ${Math.round(n).toLocaleString("en-US")}`;

export const todayISO = () => new Date().toISOString().slice(0, 10);

export function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: any;
  icon: any;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div
          className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
      </CardContent>
    </Card>
  );
}

export function LoadingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyCard({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="p-10 text-center text-sm text-muted-foreground">
        {text}
      </CardContent>
    </Card>
  );
}
