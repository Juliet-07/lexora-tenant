import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartTooltip,
} from "recharts";
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowUpCircle,
  Eye,
  Trash2,
  MessageSquare,
  FileText,
  ArrowUpRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchAlertStats,
  fetchAlerts,
  createManualAlert,
  updateAlert,
  bulkDismissAlerts,
  type ComplianceAlert,
  type AlertStats,
} from "@/lib/kyc-api";
import { ClientSelect } from "@/components/ClientDropdown";
import { prettyLabel, toneFor } from "@/lib/clients-api";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#3b82f6",
  low: "#94a3b8",
};

function severityBadge(s: string) {
  const cls =
    s === "critical"
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : s === "high"
        ? "bg-warning/15 text-warning border-warning/30"
        : s === "medium"
          ? "bg-info/15 text-info border-info/30"
          : "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={`${cls} text-[10px] capitalize`}>
      {s}
    </Badge>
  );
}

function statusBadge(s: string) {
  const cls =
    s === "open"
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : s === "acknowledged"
        ? "bg-primary/10 text-primary border-primary/20"
        : s === "escalated"
          ? "bg-warning/10 text-warning border-warning/20"
          : s === "reviewed"
            ? "bg-success/10 text-success border-success/20"
            : "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={`${cls} text-xs capitalize`}>
      {s === "acknowledged" ? "Client Responded" : prettyLabel(s)}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────
// ALERT DETAIL DIALOG
// ─────────────────────────────────────────────────────────────

function AlertDetailDialog({
  alert,
  onUpdated,
}: {
  alert: ComplianceAlert;
  onUpdated: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  const updateMutation = useMutation({
    mutationFn: (status: string) =>
      updateAlert(alert._id, { status, reviewNote: note }),
    onSuccess: (_, status) => {
      toast({ title: `Alert ${prettyLabel(status)}` });
      setOpen(false);
      onUpdated();
    },
    onError: (err: any) =>
      toast({
        title: "Failed",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const client =
    typeof alert.clientId === "object" && alert.clientId
      ? alert.clientId
      : null;

  const isPending = updateMutation.isPending;
  const canReview =
    alert.status === "open" ||
    alert.status === "acknowledged" ||
    alert.status === "escalated";

  // clientResponse may come as nested object
  const clientResponse = (alert as any).clientResponse ?? null;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-xs"
        onClick={() => setOpen(true)}
      >
        <Eye className="h-3 w-3" /> Review
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <span>{prettyLabel(alert.type)}</span>
              {severityBadge(alert.severity)}
              {statusBadge(alert.status)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto pr-1">
            {/* Client info */}
            {client && (
              <div className="p-3 rounded-lg bg-muted/40">
                <p className="text-xs text-muted-foreground mb-1">Client</p>
                <p className="font-medium">
                  {client.firstName} {client.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{client.email}</p>
              </div>
            )}

            {/* Alert details */}
            <div>
              <p className="font-semibold">{alert.title}</p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {alert.description}
              </p>
            </div>

            {/* Metadata */}
            {alert.metadata && Object.keys(alert.metadata).length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Details
                </p>
                <div className="p-2 rounded bg-muted/40 text-xs font-mono space-y-1">
                  {Object.entries(alert.metadata)
                    .filter(([k]) => !["createdBy", "officerId"].includes(k))
                    .map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <span className="text-muted-foreground shrink-0">
                          {k}:
                        </span>
                        <span className="truncate">
                          {typeof v === "object"
                            ? JSON.stringify(v)
                            : String(v)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* ── CLIENT RESPONSE — shown when client has acknowledged ── */}
            {clientResponse ? (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Client Response
                  <span className="font-normal text-muted-foreground ml-1">
                    · {new Date(clientResponse.respondedAt).toLocaleString()}
                  </span>
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {clientResponse.note}
                </p>
                {clientResponse.documentUrl && (
                  <a
                    href={clientResponse.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-1"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    View attached document
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                )}
              </div>
            ) : alert.status === "open" && client ? (
              <div className="rounded-lg border border-muted bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Awaiting client response — client has been notified.
                </p>
              </div>
            ) : null}

            {/* Previous review note */}
            {alert.reviewNote && (
              <div>
                <p className="text-xs text-muted-foreground">Previous Note</p>
                <p className="text-xs italic">{alert.reviewNote}</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Raised {new Date(alert.createdAt).toLocaleString()}
            </p>

            {/* Review note input */}
            {canReview && (
              <div className="space-y-2">
                <Label>
                  Review Note
                  {clientResponse && (
                    <span className="text-xs text-muted-foreground font-normal ml-2">
                      (optional — summarise your decision)
                    </span>
                  )}
                </Label>
                <Textarea
                  rows={2}
                  placeholder="Optional note about your decision..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          {canReview && (
            <DialogFooter className="gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => updateMutation.mutate("dismissed")}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" /> Dismiss
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-warning/40 text-warning hover:bg-warning/5"
                disabled={isPending}
                onClick={() => updateMutation.mutate("escalated")}
              >
                <ArrowUpCircle className="h-3.5 w-3.5 mr-1" /> Escalate
              </Button>
              <Button
                size="sm"
                className="bg-success text-white hover:bg-success/90"
                disabled={isPending}
                onClick={() => updateMutation.mutate("reviewed")}
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark Reviewed
                  </>
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// CREATE MANUAL ALERT DIALOG
// ─────────────────────────────────────────────────────────────

function CreateAlertDialog({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    severity: "medium",
    title: "",
    description: "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      createManualAlert({
        clientId: form.clientId || undefined,
        severity: form.severity,
        title: form.title,
        description: form.description,
      }),
    onSuccess: () => {
      toast({ title: "Alert created" });
      setOpen(false);
      setForm({ clientId: "", severity: "medium", title: "", description: "" });
      onCreated();
    },
    onError: (err: any) =>
      toast({
        title: "Failed",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const canSubmit =
    form.title.trim() && form.description.trim() && !mutation.isPending;

  return (
    <>
      <Button
        size="sm"
        className="bg-gradient-to-r from-primary to-secondary"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4 mr-1" /> New Alert
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Manual Alert</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client (optional)</Label>
              <ClientSelect
                value={form.clientId}
                onValueChange={(v) => setForm((p) => ({ ...p, clientId: v }))}
                placeholder="Select a client or leave blank..."
              />
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select
                value={form.severity}
                onValueChange={(v) => setForm((p) => ({ ...p, severity: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Brief alert title"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Describe what triggered this alert..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-primary to-secondary"
              disabled={!canSubmit}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create Alert"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────

export default function ComplianceAlerts() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState("open");
  const [selected, setSelected] = useState<string[]>([]);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["alert-stats"] });
    qc.invalidateQueries({ queryKey: ["alerts"] });
  };

  // ── Queries ───────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["alert-stats"],
    queryFn: fetchAlertStats,
    staleTime: 30_000,
  });

  // When tab is 'open', pass 'open' to backend — backend now returns
  // both OPEN and ACKNOWLEDGED for that filter value
  const statusParam =
    tab === "open"
      ? "open"
      : tab === "escalated"
        ? "escalated"
        : tab === "reviewed"
          ? "reviewed"
          : tab === "dismissed"
            ? "dismissed"
            : undefined;

  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ["alerts", tab, severityFilter, typeFilter],
    queryFn: () =>
      fetchAlerts({
        status: statusParam,
        severity: severityFilter !== "all" ? severityFilter : undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
        limit: 50,
      }),
    staleTime: 30_000,
  });

  // ── Bulk dismiss ──────────────────────────────────────────
  const bulkMutation = useMutation({
    mutationFn: () => bulkDismissAlerts(selected),
    onSuccess: (data) => {
      toast({ title: `${data.dismissed} alert(s) dismissed` });
      setSelected([]);
      invalidate();
    },
    onError: (err: any) =>
      toast({
        title: "Failed",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const alerts = alertsData?.items ?? [];
  const allChecked = alerts.length > 0 && selected.length === alerts.length;

  const toggleSelect = (id: string) =>
    setSelected((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );

  const toggleAll = () =>
    setSelected(allChecked ? [] : alerts.map((a) => a._id));

  // ── Pie data ──────────────────────────────────────────────
  const pieData = stats
    ? [
        {
          name: "Critical",
          value: stats.summary.critical,
          color: SEVERITY_COLORS.critical,
        },
        {
          name: "High",
          value: stats.summary.high,
          color: SEVERITY_COLORS.high,
        },
        {
          name: "Medium",
          value: (stats.summary as any).medium ?? 0,
          color: SEVERITY_COLORS.medium,
        },
        {
          name: "Low",
          value: (stats.summary as any).low ?? 0,
          color: SEVERITY_COLORS.low,
        },

      ].filter((d) => d.value > 0)
    : [];

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Compliance Alerts</h1>
          <p className="text-sm text-muted-foreground">
            {statsLoading
              ? "Loading…"
              : `${stats?.summary.open ?? 0} requiring attention · ${stats?.summary.critical ?? 0} critical`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={invalidate}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <CreateAlertDialog onCreated={invalidate} />
        </div>
      </div>

      {/* Summary cards + pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))
            : [
                {
                  label: "Open",
                  value: stats?.summary.open ?? 0,
                  color: "text-destructive",
                },
                {
                  label: "Escalated",
                  value: stats?.summary.escalated ?? 0,
                  color: "text-warning",
                },
                {
                  label: "Reviewed",
                  value: stats?.summary.reviewed ?? 0,
                  color: "text-success",
                },
                {
                  label: "Dismissed",
                  value: stats?.summary.dismissed ?? 0,
                  color: "text-muted-foreground",
                },
              ].map(({ label, value, color }) => (
                <Card
                  key={label}
                  className="cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => setTab(label.toLowerCase())}
                >
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`text-3xl font-bold ${color}`}>{value}</p>
                    {label === "Open" &&
                      ((stats?.summary as any)?.acknowledged ?? 0) > 0 && (
                        <p className="text-[10px] text-primary mt-0.5">
                          {(stats?.summary as any)?.acknowledged} client responded
                        </p>
                      )}

                  </CardContent>
                </Card>
              ))}

          {/* Recent critical */}
          {(stats?.recentCritical ?? []).length > 0 && (
            <Card className="col-span-2 sm:col-span-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Recent Critical / High Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(stats?.recentCritical ?? []).slice(0, 3).map((a) => {
                  const client =
                    typeof a.clientId === "object" && a.clientId
                      ? a.clientId
                      : null;
                  return (
                    <div
                      key={a._id}
                      className="flex items-start gap-3 p-2 rounded-lg bg-muted/40"
                    >
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">
                            {a.title}
                          </p>
                          {severityBadge(a.severity)}
                        </div>
                        {client && (
                          <p className="text-xs text-muted-foreground">
                            {client.firstName} {client.lastName}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(a.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open Alerts by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : pieData.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-success" />
                <p className="text-sm text-muted-foreground">No open alerts</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {pieData.map((d) => (
                    <div
                      key={d.name}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: d.color }}
                      />
                      {d.name} ({d.value})
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alert list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Tabs
              value={tab}
              onValueChange={(v) => {
                setTab(v);
                setSelected([]);
              }}
            >
              <TabsList>
                <TabsTrigger value="open">
                  Open
                  {(stats?.summary.open ?? 0) > 0 && (
                    <span className="ml-1.5 rounded-full bg-destructive/10 text-destructive text-xs px-1.5">
                      {stats?.summary.open}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="escalated">Escalated</TabsTrigger>
                <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
                <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2 flex-wrap">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              {selected.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-destructive/30 text-destructive"
                  disabled={bulkMutation.isPending}
                  onClick={() => bulkMutation.mutate()}
                >
                  {bulkMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                  )}
                  Dismiss {selected.length}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {alertsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
              <p className="text-sm text-muted-foreground">
                No {tab === "all" ? "" : tab} alerts.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {tab === "open" && (
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={toggleAll}
                        className="rounded"
                      />
                    </TableHead>
                  )}
                  <TableHead>Alert</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Raised</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => {
                  const client =
                    typeof alert.clientId === "object" && alert.clientId
                      ? alert.clientId
                      : null;
                  const isSelected = selected.includes(alert._id);
                  const clientResponse = (alert as any).clientResponse ?? null;

                  return (
                    <TableRow
                      key={alert._id}
                      className={
                        isSelected
                          ? "bg-muted/40"
                          : alert.status === "acknowledged"
                            ? "bg-primary/5"
                            : ""
                      }
                    >
                      {tab === "open" && (
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(alert._id)}
                            className="rounded"
                          />
                        </TableCell>
                      )}
                      <TableCell className="max-w-[220px]">
                        <p className="text-sm font-medium truncate">
                          {alert.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {alert.description}
                        </p>
                        {/* Client responded indicator in row */}
                        {clientResponse && (
                          <p className="text-[10px] text-primary flex items-center gap-1 mt-1">
                            <MessageSquare className="h-3 w-3" />
                            Client responded ·{" "}
                            {new Date(
                              clientResponse.respondedAt,
                            ).toLocaleDateString()}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {client ? (
                          <>
                            <p className="font-medium">
                              {client.firstName} {client.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {client.email}
                            </p>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {prettyLabel(alert.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>{severityBadge(alert.severity)}</TableCell>
                      <TableCell>{statusBadge(alert.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <AlertDetailDialog
                          alert={alert}
                          onUpdated={invalidate}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
