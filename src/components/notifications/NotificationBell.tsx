import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  UserPlus,
  Receipt,
  LifeBuoy,
  ShieldAlert,
  FileText,
  Users,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  fetchMyNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  type TenantNotification,
  type TenantNotificationType,
} from "@/lib/notification-api";

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

export function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Live, real unread badge — quietly refreshed in the background so
  // it stays current without the person needing to reopen the app.
  const { data: unread } = useQuery({
    queryKey: ["tenant-notifications-unread"],
    queryFn: fetchUnreadCount,
    refetchInterval: 60_000,
  });
  const unreadCount = unread?.count ?? 0;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["tenant-notifications"],
    queryFn: fetchMyNotifications,
    enabled: open,
    staleTime: 15_000,
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

  const recent = useMemo(() => items.slice(0, 20), [items]);

  const openNotification = (n: TenantNotification) => {
    if (!n.read) readMutation.mutate(n._id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => readAllMutation.mutate()}
            disabled={readAllMutation.isPending || unreadCount === 0}
          >
            Mark all as read
          </Button>
        </div>
        <Separator className="mt-2" />
        <ScrollArea className="h-[420px]">
          <div className="p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No notifications yet.
              </p>
            ) : (
              recent.map((n) => (
                <button
                  key={n._id}
                  onClick={() => openNotification(n)}
                  className={`flex w-full gap-2 rounded-md p-2 text-left text-sm hover:bg-muted/60 ${
                    !n.read ? "bg-muted/30" : ""
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{typeIcon[n.type]}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-medium">{n.title}</p>
                      {!n.read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {n.description}
                    </p>
                    <span className="text-[11px] text-muted-foreground">
                      {relativeTime(n.createdAt)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
        <Separator />
        <Link
          to="/notifications"
          onClick={() => setOpen(false)}
          className="flex items-center justify-center gap-1 py-2 text-xs font-medium text-primary hover:underline"
        >
          Open notification centre <ExternalLink className="h-3 w-3" />
        </Link>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationBell;
