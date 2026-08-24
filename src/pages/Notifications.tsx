import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Lock, Archive, Trash2, MailCheck, Eye, EyeOff } from "lucide-react";
import {
  notifications as seedNotifications,
  AppNotification,
  NotificationCategory,
  NOTIFICATION_CATEGORIES,
  defaultNotificationPrefs,
  watchedItems as seedWatchedItems,
} from "@/data/crmClientMockData";

const CHANNELS: { key: keyof (typeof defaultNotificationPrefs)[string]; label: string }[] = [
  { key: "inApp", label: "In-app" },
  { key: "email", label: "Email" },
  { key: "sms", label: "SMS" },
  { key: "push", label: "Push" },
  { key: "whatsapp", label: "WhatsApp" },
];

const FREQUENCIES = ["Immediate", "Hourly digest", "Daily digest"];

interface Row extends AppNotification {
  archived: boolean;
}

export default function Notifications() {
  const [items, setItems] = useState<Row[]>(
    seedNotifications.map((n) => ({ ...n, archived: false })),
  );
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [prefs, setPrefs] = useState(defaultNotificationPrefs);
  const [quietFrom, setQuietFrom] = useState("21:00");
  const [quietTo, setQuietTo] = useState("07:00");
  const [watching, setWatching] = useState(seedWatchedItems);

  const filtered = useMemo(() => {
    return items.filter((n) => {
      if (n.archived) return false;
      if (tab === "unread" && n.read) return false;
      if (tab === "mentions" && n.category !== "@Mention") return false;
      if (tab === "approvals" && !n.category.startsWith("Approval")) return false;
      if (tab === "assignments" && n.category !== "Assignment") return false;
      if (category !== "all" && n.category !== category) return false;
      if (
        search &&
        !(
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.body.toLowerCase().includes(search.toLowerCase())
        )
      )
        return false;
      const day = n.at.slice(0, 10);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      return true;
    });
  }, [items, tab, category, search, dateFrom, dateTo]);

  const allSelected = filtered.length > 0 && filtered.every((n) => selected.has(n.id));

  const toggleSelectAll = () => {
    setSelected((prev) => {
      if (allSelected) return new Set();
      return new Set(filtered.map((n) => n.id));
    });
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkMarkRead = () => {
    setItems((prev) => prev.map((n) => (selected.has(n.id) ? { ...n, read: true } : n)));
    setSelected(new Set());
  };

  const bulkArchive = () => {
    setItems((prev) => prev.map((n) => (selected.has(n.id) ? { ...n, archived: true } : n)));
    setSelected(new Set());
  };

  const bulkDelete = () => {
    setItems((prev) => prev.filter((n) => !selected.has(n.id)));
    setSelected(new Set());
  };

  const [actioned, setActioned] = useState<Record<string, string>>({});
  const handleAction = (id: string, action: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setActioned((prev) => ({ ...prev, [id]: action }));
  };

  const updatePref = (
    cat: NotificationCategory,
    key: keyof (typeof defaultNotificationPrefs)[string],
    value: boolean | string,
  ) => {
    setPrefs((prev) => ({
      ...prev,
      [cat]: { ...prev[cat], [key]: value },
    }));
  };

  const unwatch = (id: string) => setWatching((prev) => prev.filter((w) => w.id !== id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notification Centre</h1>
        <p className="text-sm text-muted-foreground">
          All alerts, approvals, mentions and system events in one place.
        </p>
      </div>

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-4 pt-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
              <TabsTrigger value="mentions">Mentions</TabsTrigger>
              <TabsTrigger value="approvals">Approvals</TabsTrigger>
              <TabsTrigger value="assignments">Assignments</TabsTrigger>
            </TabsList>
          </Tabs>

          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[220px] flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search title or body…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {NOTIFICATION_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Input
                    type="date"
                    className="w-40"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input
                    type="date"
                    className="w-40"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>

              {selected.size > 0 && (
                <div className="flex items-center gap-2 rounded-md bg-muted p-2 text-sm">
                  <span>{selected.size} selected</span>
                  <Button size="sm" variant="outline" onClick={bulkMarkRead}>
                    <MailCheck className="mr-1 h-3.5 w-3.5" /> Mark read
                  </Button>
                  <Button size="sm" variant="outline" onClick={bulkArchive}>
                    <Archive className="mr-1 h-3.5 w-3.5" /> Archive
                  </Button>
                  <Button size="sm" variant="outline" onClick={bulkDelete}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                    </TableHead>
                    <TableHead>Notification</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Channels</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((n) => (
                    <TableRow key={n.id} className={!n.read ? "bg-muted/30" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(n.id)}
                          onCheckedChange={() => toggleSelect(n.id)}
                        />
                      </TableCell>
                      <TableCell className="max-w-sm">
                        <div className="flex items-center gap-1.5">
                          {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                          <p className="text-sm font-medium">{n.title}</p>
                        </div>
                        <p className="line-clamp-1 text-xs text-muted-foreground">{n.body}</p>
                        {n.actionable && (
                          <div className="mt-1 flex flex-wrap gap-1.5">
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
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {n.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{n.source}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {n.channels.map((c) => (
                            <Badge key={c} variant="secondary" className="text-[10px]">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {n.at}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title={n.read ? "Mark unread" : "Mark read"}
                          onClick={() =>
                            setItems((prev) =>
                              prev.map((i) => (i.id === n.id ? { ...i, read: !i.read } : i)),
                            )
                          }
                        >
                          {n.read ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                        No notifications match your filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Channel preferences by category</CardTitle>
              <p className="text-sm text-muted-foreground">
                Locked categories (
                <Lock className="inline h-3 w-3" /> ) always deliver in-app and cannot be fully
                disabled, as they cover compliance-critical alerts.
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    {CHANNELS.map((c) => (
                      <TableHead key={c.key} className="text-center">
                        {c.label}
                      </TableHead>
                    ))}
                    <TableHead>Frequency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {NOTIFICATION_CATEGORIES.map((cat) => {
                    const p = prefs[cat];
                    return (
                      <TableRow key={cat}>
                        <TableCell className="flex items-center gap-1.5 text-sm font-medium">
                          {p.locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                          {cat}
                        </TableCell>
                        {CHANNELS.map((c) => (
                          <TableCell key={c.key} className="text-center">
                            <Switch
                              checked={p[c.key] as boolean}
                              disabled={p.locked && c.key === "inApp"}
                              onCheckedChange={(v) => updatePref(cat, c.key, v)}
                            />
                          </TableCell>
                        ))}
                        <TableCell>
                          <Select
                            value={p.frequency}
                            onValueChange={(v) => updatePref(cat, "frequency", v)}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FREQUENCIES.map((f) => (
                                <SelectItem key={f} value={f}>
                                  {f}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <p className="mt-3 text-xs text-muted-foreground">
                Locked categories cover regulatory deadlines, escalations and system alerts — the
                in-app channel cannot be turned off for these.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quiet hours</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Non-critical notifications are held and delivered as a digest during this window.
                </p>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <div>
                  <Label className="text-xs">From</Label>
                  <Input
                    type="time"
                    value={quietFrom}
                    onChange={(e) => setQuietFrom(e.target.value)}
                    className="w-32"
                  />
                </div>
                <div>
                  <Label className="text-xs">To</Label>
                  <Input
                    type="time"
                    value={quietTo}
                    onChange={(e) => setQuietTo(e.target.value)}
                    className="w-32"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Watching</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Items you follow for update notifications.
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {watching.length === 0 && (
                  <p className="text-sm text-muted-foreground">You aren't watching anything.</p>
                )}
                {watching.map((w) => (
                  <div key={w.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{w.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {w.type} · {w.id} · {w.reason} · {w.updates} updates
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => unwatch(w.id)}>
                      Unwatch
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
