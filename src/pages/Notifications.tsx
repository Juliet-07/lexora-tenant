import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  MailCheck,
  UserPlus,
  Receipt,
  LifeBuoy,
  ShieldAlert,
  FileText,
  Users,
  Bell,
  Loader2,
} from "lucide-react";
import {
  fetchMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type TenantNotification,
  type TenantNotificationType,
} from "@/lib/notification-api";

const TYPES: TenantNotificationType[] = [
  "Onboarding",
  "Invoice",
  "Ticket",
  "Compliance",
  "Document",
  "HR",
  "General",
];

const typeIcon: Record<TenantNotificationType, JSX.Element> = {
  Onboarding: <UserPlus className="h-4 w-4 text-primary" />,
  Invoice: <Receipt className="h-4 w-4 text-emerald-600" />,
  Ticket: <LifeBuoy className="h-4 w-4 text-amber-500" />,
  Compliance: <ShieldAlert className="h-4 w-4 text-destructive" />,
  Document: <FileText className="h-4 w-4 text-primary" />,
  HR: <Users className="h-4 w-4 text-muted-foreground" />,
  General: <Bell className="h-4 w-4 text-muted-foreground" />,
};

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<"all" | "unread">("all");
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("all");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["tenant-notifications"],
    queryFn: fetchMyNotifications,
    staleTime: 30_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["tenant-notifications"] });
    queryClient.invalidateQueries({
      queryKey: ["tenant-notifications-unread"],
    });
  };

  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: invalidate,
  });
  const readAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidate,
  });

  const filtered = useMemo(() => {
    return items.filter((n) => {
      if (tab === "unread" && n.read) return false;
      if (type !== "all" && n.type !== type) return false;
      if (
        search &&
        !(
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.description.toLowerCase().includes(search.toLowerCase())
        )
      )
        return false;
      return true;
    });
  }, [items, tab, type, search]);

  const unreadCount = items.filter((n) => !n.read).length;

  const openNotification = (n: TenantNotification) => {
    if (!n.read) readMutation.mutate(n._id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notification Centre</h1>
          <p className="text-sm text-muted-foreground">
            Real updates from your clients and team — invoices paid, tickets
            replied to, documents signed, compliance alerts and more.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => readAllMutation.mutate()}
          disabled={readAllMutation.isPending || unreadCount === 0}
        >
          {readAllMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <MailCheck className="h-4 w-4 mr-2" />
          )}
          Mark all as read
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "unread")}>
        <TabsList>
          <TabsTrigger value="all">All ({items.length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search title or description…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border divide-y">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4">
                  <Skeleton className="h-10 w-full" />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No notifications match your filters.
              </div>
            ) : (
              filtered.map((n) => (
                <button
                  key={n._id}
                  onClick={() => openNotification(n)}
                  className={`w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-muted/40 ${
                    !n.read ? "bg-muted/20" : ""
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{typeIcon[n.type]}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm truncate">{n.title}</p>
                      {!n.read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {n.description}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[11px]">
                        {n.type}
                      </Badge>
                      {n.emailSent && (
                        <Badge variant="secondary" className="text-[11px]">
                          <MailCheck className="h-3 w-3 mr-1" /> Emailed
                        </Badge>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {relativeTime(n.createdAt)}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
