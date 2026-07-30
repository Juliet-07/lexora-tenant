import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell,
  AtSign,
  CheckCircle2,
  CalendarClock,
  UserPlus,
  AlertTriangle,
  Info,
  Eye,
  ArrowUpCircle,
  Activity,
  ExternalLink,
} from "lucide-react";
import {
  notifications as seedNotifications,
  AppNotification,
  NotificationCategory,
} from "@/data/crmClientMockData";

const NOW = new Date("2026-07-30T18:00:00");

const categoryIcon: Record<NotificationCategory, JSX.Element> = {
  Assignment: <UserPlus className="h-4 w-4 text-primary" />,
  "@Mention": <AtSign className="h-4 w-4 text-primary" />,
  "Approval request": <CheckCircle2 className="h-4 w-4 text-amber-500" />,
  "Approval outcome": <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  "Deadline approaching": <CalendarClock className="h-4 w-4 text-amber-500" />,
  "Deadline breached": <CalendarClock className="h-4 w-4 text-destructive" />,
  "Status change": <Activity className="h-4 w-4 text-muted-foreground" />,
  Escalation: <ArrowUpCircle className="h-4 w-4 text-destructive" />,
  "Client activity": <Eye className="h-4 w-4 text-muted-foreground" />,
  "System alert": <AlertTriangle className="h-4 w-4 text-destructive" />,
  "Watcher update": <Info className="h-4 w-4 text-muted-foreground" />,
};

type FilterKey = "All" | "Mentions" | "Approvals" | "Deadlines" | "Assignments" | "System";

const FILTERS: { key: FilterKey; categories: NotificationCategory[] | "all" }[] = [
  { key: "All", categories: "all" },
  { key: "Mentions", categories: ["@Mention"] },
  { key: "Approvals", categories: ["Approval request", "Approval outcome"] },
  { key: "Deadlines", categories: ["Deadline approaching", "Deadline breached"] },
  { key: "Assignments", categories: ["Assignment"] },
  { key: "System", categories: ["System alert", "Escalation", "Status change", "Client activity", "Watcher update"] },
];

function relativeTime(at: string): string {
  const d = new Date(at.replace(" ", "T"));
  const diffMs = NOW.getTime() - d.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

function bucketOf(at: string): "Today" | "Yesterday" | "Earlier" {
  const d = new Date(at.replace(" ", "T"));
  const today = new Date(NOW);
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dDay = new Date(d);
  dDay.setHours(0, 0, 0, 0);
  if (dDay.getTime() === today.getTime()) return "Today";
  if (dDay.getTime() === yesterday.getTime()) return "Yesterday";
  return "Earlier";
}

export function NotificationBell() {
  const [items, setItems] = useState<AppNotification[]>(seedNotifications);
  const [filter, setFilter] = useState<FilterKey>("All");
  const [actioned, setActioned] = useState<Record<string, string>>({});

  const unreadCount = items.filter((n) => !n.read).length;

  const filtered = useMemo(() => {
    const f = FILTERS.find((f) => f.key === filter);
    if (!f || f.categories === "all") return items;
    return items.filter((n) => (f.categories as NotificationCategory[]).includes(n.category));
  }, [items, filter]);

  const grouped = useMemo(() => {
    const buckets: Record<string, AppNotification[]> = { Today: [], Yesterday: [], Earlier: [] };
    filtered.forEach((n) => buckets[bucketOf(n.at)].push(n));
    return buckets;
  }, [filtered]);

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));

  const markRead = (id: string) =>
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  const handleAction = (id: string, action: string) => {
    markRead(id);
    setActioned((prev) => ({ ...prev, [id]: action }));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[10px]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-3 pt-3">
          <p className="text-sm font-semibold">Notifications</p>
          <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={markAllRead}>
            Mark all as read
          </Button>
        </div>
        <div className="flex flex-wrap gap-1 px-3 pt-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                filter === f.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {f.key}
            </button>
          ))}
        </div>
        <Separator className="mt-2" />
        <ScrollArea className="h-[420px]">
          <div className="p-2">
            {(["Today", "Yesterday", "Earlier"] as const).map((bucket) =>
              grouped[bucket].length > 0 ? (
                <div key={bucket} className="mb-2">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase text-muted-foreground">
                    {bucket}
                  </p>
                  {grouped[bucket].map((n) => (
                    <div
                      key={n.id}
                      className={`flex gap-2 rounded-md p-2 text-sm hover:bg-muted/60 ${
                        !n.read ? "bg-muted/30" : ""
                      }`}
                    >
                      <div className="mt-0.5">{categoryIcon[n.category]}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate font-medium">{n.title}</p>
                          {!n.read && (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">
                            {relativeTime(n.at)}
                          </span>
                        </div>
                        {n.actionable && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {actioned[n.id] ? (
                              <Badge variant="outline" className="text-[11px]">
                                {actioned[n.id]}
                              </Badge>
                            ) : (
                              n.actions?.map((a) => (
                                <Button
                                  key={a}
                                  size="sm"
                                  variant={a === "Reject" ? "outline" : "default"}
                                  className="h-6 px-2 text-[11px]"
                                  onClick={() => handleAction(n.id, a)}
                                >
                                  {a}
                                </Button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null,
            )}
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No notifications in this filter.
              </p>
            )}
          </div>
        </ScrollArea>
        <Separator />
        <Link
          to="/crm/notifications"
          className="flex items-center justify-center gap-1 py-2 text-xs font-medium text-primary hover:underline"
        >
          Open notification centre <ExternalLink className="h-3 w-3" />
        </Link>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationBell;
