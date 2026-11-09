import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  Eye,
  RefreshCw,
  Send,
  Settings2,
  Upload,
} from "lucide-react";
import type { ActivityType } from "@/lib/grc/readiness-workspace-api";
import { fmtDateTime, type TabProps } from "./shared";

const META: Record<
  ActivityType,
  { label: string; icon: typeof Upload; tone: string }
> = {
  upload: {
    label: "Uploads",
    icon: Upload,
    tone: "bg-sky-500/15 text-sky-600",
  },
  view: {
    label: "Investor views",
    icon: Eye,
    tone: "bg-violet-500/15 text-violet-600",
  },
  send: {
    label: "Sends",
    icon: Send,
    tone: "bg-emerald-500/15 text-emerald-600",
  },
  task: {
    label: "Tasks",
    icon: ClipboardList,
    tone: "bg-amber-500/15 text-amber-600",
  },
  status: {
    label: "Status changes",
    icon: RefreshCw,
    tone: "bg-rose-500/15 text-rose-600",
  },
  system: {
    label: "System",
    icon: Settings2,
    tone: "bg-muted text-muted-foreground",
  },
};

export function ActivityTab({ ws }: TabProps) {
  const [filter, setFilter] = useState<"all" | ActivityType>("all");
  const events = ws.activity.filter(
    (a) => filter === "all" || a.type === filter,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Activity</h3>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-[190px]" aria-label="Filter activity">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All activity</SelectItem>
            {(Object.keys(META) as ActivityType[]).map((k) => (
              <SelectItem key={k} value={k}>
                {META[k].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nothing has happened yet. Uploads, shares, task moves and investor
          activity will appear here.
        </div>
      ) : (
        <ol className="relative space-y-4 border-l pl-6">
          {events.slice(0, 200).map((a) => {
            const m = META[a.type];
            const Icon = m.icon;
            return (
              <li key={a._id} className="relative">
                <span
                  className={`absolute -left-[37px] flex h-7 w-7 items-center justify-center rounded-full ${m.tone}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="text-sm font-medium">{a.text}</div>
                <div className="text-xs text-muted-foreground">
                  {a.by || "—"} · {fmtDateTime(a.at)}
                  {a.detail ? ` · ${a.detail}` : ""}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
