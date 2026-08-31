import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trash2,
  Activity,
  AlertCircle,
  Bell,
  Pause,
  Play,
  Eye,
  Plus,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileWarning,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchTransactionDashboard,
  fetchTransactions,
  fetchWireTransfers,
  fetchRiskRules,
  logTransaction,
  reviewTransaction,
  fetchBehavioralProfile,
  type Transaction,
} from "@/lib/kyc/kyc-api";
import { prettyLabel, toneFor } from "@/lib/client/clients-api";
import { ClientSelect } from "@/components/ClientDropdown";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function severityBadge(s: string) {
  const cls =
    s === "critical" || s === "Critical"
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : s === "high" || s === "High"
        ? "bg-warning/15 text-warning border-warning/30"
        : s === "medium" || s === "Medium"
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
    s === "flagged" || s === "blocked"
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : s === "reviewed"
        ? "bg-success/15 text-success border-success/30"
        : "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={`${cls} text-xs capitalize`}>
      {prettyLabel(s)}
    </Badge>
  );
}

const TX_TYPES = [
  { value: "cash_deposit", label: "Cash Deposit" },
  { value: "cash_withdrawal", label: "Cash Withdrawal" },
  { value: "wire_transfer_in", label: "Wire Transfer (In)" },
  { value: "wire_transfer_out", label: "Wire Transfer (Out)" },
  { value: "internal_transfer", label: "Internal Transfer" },
  { value: "cross_border_transfer", label: "Cross-Border Transfer" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "loan_disbursement", label: "Loan Disbursement" },
  { value: "loan_repayment", label: "Loan Repayment" },
  { value: "other", label: "Other" },
];

// ─────────────────────────────────────────────────────────────
// LOG TRANSACTION DIALOG
// ─────────────────────────────────────────────────────────────

function LogTransactionDialog({ onLogged }: { onLogged: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    amount: "",
    currency: "USD",
    type: "cash_deposit",
    transactionDate: new Date().toISOString().split("T")[0],
    counterpartyName: "",
    counterpartyBank: "",
    counterpartyCountry: "",
    reference: "",
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      logTransaction({
        ...form,
        amount: Number(form.amount),
        counterpartyName: form.counterpartyName || undefined,
        counterpartyBank: form.counterpartyBank || undefined,
        counterpartyCountry: form.counterpartyCountry || undefined,
        reference: form.reference || undefined,
        notes: form.notes || undefined,
      }),
    onSuccess: (tx: any) => {
      const wasFlagged = tx.status === "flagged" || tx.status === "blocked";
      toast({
        title: wasFlagged
          ? "Transaction logged & flagged"
          : "Transaction logged",
        description: wasFlagged
          ? `Triggered rules: ${tx.triggeredRules?.join(", ") || "unknown"}`
          : "Transaction recorded successfully.",
        variant: wasFlagged ? "destructive" : "default",
      });
      setOpen(false);
      setForm({
        clientId: "",
        amount: "",
        currency: "USD",
        type: "cash_deposit",
        transactionDate: new Date().toISOString().split("T")[0],
        counterpartyName: "",
        counterpartyBank: "",
        counterpartyCountry: "",
        reference: "",
        notes: "",
      });
      onLogged();
    },
    onError: (err: any) =>
      toast({
        title: "Failed to log transaction",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      }),
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const isWire = [
    "wire_transfer_in",
    "wire_transfer_out",
    "cross_border_transfer",
    "internal_transfer",
  ].includes(form.type);
  const canSubmit = form.clientId && form.amount && !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-primary to-secondary">
          <Plus className="h-4 w-4 mr-2" /> Log Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Transaction</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Enter transaction details. Rules are checked automatically on save.
          </p>
        </DialogHeader>
        <div className="space-y-4">
          {/* Client */}
          <div className="space-y-2">
            <Label>
              Client <span className="text-destructive">*</span>
            </Label>
            <ClientSelect
              value={form.clientId}
              onValueChange={(v) => set("clientId", v)}
            />
          </div>

          {/* Amount + Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label>
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => set("currency", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["USD", "RWF", "EUR", "GBP", "ZWL", "KES", "UGX"].map(
                    (c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Type + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>
                Type <span className="text-destructive">*</span>
              </Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TX_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={form.transactionDate}
                onChange={(e) => set("transactionDate", e.target.value)}
              />
            </div>
          </div>

          {/* Counterparty fields — only for wire/transfer types */}
          {isWire && (
            <div className="space-y-3 p-3 rounded-lg bg-muted/40 border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Counterparty Details
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Counterparty Name</Label>
                  <Input
                    value={form.counterpartyName}
                    onChange={(e) => set("counterpartyName", e.target.value)}
                    placeholder="Beneficiary name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Counterparty Bank</Label>
                  <Input
                    value={form.counterpartyBank}
                    onChange={(e) => set("counterpartyBank", e.target.value)}
                    placeholder="Bank name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Destination Country</Label>
                <Input
                  value={form.counterpartyCountry}
                  onChange={(e) => set("counterpartyCountry", e.target.value)}
                  placeholder="e.g. AE, US, CN"
                />
              </div>
            </div>
          )}

          {/* Reference + Notes */}
          <div className="space-y-2">
            <Label>Reference</Label>
            <Input
              value={form.reference}
              onChange={(e) => set("reference", e.target.value)}
              placeholder="Transaction reference number"
            />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Any additional notes"
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
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Logging...
              </>
            ) : (
              "Log & Check Rules"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// REVIEW TRANSACTION DIALOG
// ─────────────────────────────────────────────────────────────

function ReviewDialog({
  tx,
  onReviewed,
}: {
  tx: Transaction;
  onReviewed: () => void;
}) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: (clearFlag: boolean) =>
      reviewTransaction(tx._id, { clearFlag, note }),
    onSuccess: (_, clearFlag) => {
      toast({
        title: clearFlag ? "Transaction cleared" : "Transaction kept flagged",
      });
      setOpen(false);
      onReviewed();
    },
    onError: (err: any) =>
      toast({
        title: "Failed",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const client = typeof tx.clientId === "object" ? tx.clientId : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
          <Eye className="h-3 w-3" /> Review
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Review Flagged Transaction</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Transaction details */}
          <div className="p-3 rounded-lg bg-muted/40 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client</span>
              <span className="font-medium">
                {client ? `${client.firstName} ${client.lastName}` : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold">
                {tx.currency} {tx.amount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span>{prettyLabel(tx.type)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>{new Date(tx.transactionDate).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Triggered rules */}
          {tx.triggeredRules?.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2">Triggered Rules</p>
              <div className="flex flex-wrap gap-1.5">
                {tx.triggeredRules.map((r) => (
                  <Badge
                    key={r}
                    variant="outline"
                    className="text-xs bg-destructive/5 text-destructive border-destructive/20"
                  >
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Review Note</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about your decision..."
            />
          </div>
        </div>
        <DialogFooter className="gap-2 flex-wrap">
          <Button
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/5"
            onClick={() => navigate(`/aml/str?fromTransaction=${tx._id}`)}
          >
            <FileWarning className="h-4 w-4 mr-1" /> File STR
          </Button>
          <Button
            variant="outline"
            className="border-destructive/30 text-destructive hover:bg-destructive/5"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(false)}
          >
            <XCircle className="h-4 w-4 mr-1" /> Keep Flagged
          </Button>
          <Button
            className="bg-success text-white hover:bg-success/90"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(true)}
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Clear Flag
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────

export default function TransactionMonitoring() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState("overview");

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["tx-dashboard"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["wire-transfers"] });
  };

  // ── Queries ───────────────────────────────────────────────
  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ["tx-dashboard"],
    queryFn: fetchTransactionDashboard,
    staleTime: 30_000,
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => fetchTransactions({ limit: 20 }),
    staleTime: 30_000,
    enabled: tab === "alerts" || tab === "overview",
  });

  const { data: flaggedTx, isLoading: flaggedLoading } = useQuery({
    queryKey: ["transactions-flagged"],
    queryFn: () => fetchTransactions({ status: "flagged", limit: 20 }),
    staleTime: 30_000,
    enabled: tab === "alerts",
  });

  const { data: wireTransfers, isLoading: wireLoading } = useQuery({
    queryKey: ["wire-transfers"],
    queryFn: () => fetchWireTransfers({ limit: 20 }),
    staleTime: 30_000,
    enabled: tab === "wire",
  });

  const { data: rules = [] } = useQuery({
    queryKey: ["kyc-risk-rules"],
    queryFn: fetchRiskRules,
    staleTime: 60_000,
  });

  // ── Derived ───────────────────────────────────────────────
  const activeRules = rules.filter((r) => r.isActive).length;
  const openAlerts = dashboard?.stats.openAlerts ?? 0;
  const underReview = dashboard?.stats.underReview ?? 0;
  const activeScenarios = dashboard?.stats.activeScenarios ?? 0;
  const recentFlagged = dashboard?.recentFlagged ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Transaction Monitoring</h1>
          <p className="text-sm text-muted-foreground">
            Real-time surveillance, rules engine, wire transfer monitoring and
            alerts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={invalidateAll}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <LogTransactionDialog onLogged={invalidateAll} />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rules">Rules Engine</TabsTrigger>
          <TabsTrigger value="wire">Wire Transfer Monitoring</TabsTrigger>
          <TabsTrigger value="profiling">Behavioral Profiling</TabsTrigger>
          <TabsTrigger value="alerts">
            Real-Time Alerts
            {openAlerts > 0 && (
              <span className="ml-1.5 rounded-full bg-destructive/10 text-destructive text-xs px-1.5">
                {openAlerts}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Active Rules",
                value: activeRules,
                icon: Activity,
                color: "text-primary",
              },
              {
                label: "Open Alerts",
                value: openAlerts,
                icon: AlertCircle,
                color: "text-destructive",
              },
              {
                label: "Under Review",
                value: underReview,
                icon: Bell,
                color: "text-warning",
              },
              {
                label: "Active Scenarios",
                value: activeScenarios,
                icon: Activity,
                color: "text-secondary",
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      {dashLoading ? (
                        <Skeleton className="h-8 w-12 mt-1" />
                      ) : (
                        <p className={`text-3xl font-bold ${color}`}>{value}</p>
                      )}
                    </div>
                    <Icon className={`h-7 w-7 opacity-40 ${color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent flagged transactions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Alerts</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTab("alerts")}
                >
                  View all
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {dashLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))
              ) : recentFlagged.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No flagged transactions
                  </p>
                </div>
              ) : (
                recentFlagged.slice(0, 5).map((tx: Transaction) => {
                  const client =
                    typeof tx.clientId === "object" ? tx.clientId : null;
                  return (
                    <div
                      key={tx._id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/40"
                    >
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                        <div>
                          <p className="text-sm font-medium">
                            {prettyLabel(tx.type)} —{" "}
                            {client
                              ? `${client.firstName} ${client.lastName}`
                              : "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.transactionDate).toLocaleString()} ·{" "}
                            {tx.currency} {tx.amount.toLocaleString()}
                            {tx.triggeredRules?.length > 0 &&
                              ` · ${tx.triggeredRules[0]}`}
                          </p>
                        </div>
                      </div>
                      {statusBadge(tx.status)}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Volume by type */}
          {(dashboard?.volumeByType ?? []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Transaction Volume by Type
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(dashboard?.volumeByType ?? []).map((v) => (
                  <div
                    key={v._id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="capitalize">{prettyLabel(v._id)}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">
                        {v.count} transactions
                      </span>
                      <span className="font-medium">
                        USD{" "}
                        {v.totalAmount.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── RULES ENGINE ── */}
        <TabsContent value="rules" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rules Engine</CardTitle>
              <p className="text-xs text-muted-foreground">
                These are the active rules checked against every logged
                transaction. Manage rules in the Risk Engine page.
              </p>
            </CardHeader>
            <CardContent>
              {rules.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No rules configured. Go to Risk Engine to create rules.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((r) => (
                      <TableRow key={r._id}>
                        <TableCell>
                          <p className="font-medium text-sm">{r.name}</p>
                          {r.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {r.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {r.ruleType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {r.field} {r.condition.replace(/_/g, " ")} {r.value}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs ${
                              r.action.includes("high")
                                ? "bg-destructive/10 text-destructive"
                                : r.action.includes("medium")
                                  ? "bg-warning/10 text-warning"
                                  : r.action === "block"
                                    ? "bg-destructive/20 text-destructive"
                                    : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {prettyLabel(r.action)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {r.tenantId ? "Your rule" : "Global"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              r.isActive
                                ? "bg-success/10 text-success text-xs"
                                : "bg-muted text-muted-foreground text-xs"
                            }
                          >
                            {r.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── WIRE TRANSFER MONITORING ── */}
        <TabsContent value="wire" className="space-y-4 mt-4">
          {wireLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: "Total Wires",
                    value: wireTransfers?.total ?? 0,
                    color: "text-primary",
                  },
                  {
                    label: "Cross-Border",
                    value: (wireTransfers?.items ?? []).filter(
                      (t) => t.type === "cross_border_transfer",
                    ).length,
                    color: "text-warning",
                  },
                  {
                    label: "Flagged Wires",
                    value: (wireTransfers?.items ?? []).filter(
                      (t) => t.status === "flagged",
                    ).length,
                    color: "text-destructive",
                  },
                  {
                    label: "Blocked",
                    value: (wireTransfers?.items ?? []).filter(
                      (t) => t.status === "blocked",
                    ).length,
                    color: "text-destructive",
                  },
                ].map(({ label, value, color }) => (
                  <Card key={label}>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={`text-3xl font-bold mt-1 ${color}`}>
                        {value}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Wire Transfers</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Cross-border and wire transfers — monitored for corridor
                    risk and counterparty screening.
                  </p>
                </CardHeader>
                <CardContent>
                  {(wireTransfers?.items ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      No wire transfers logged yet.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Counterparty</TableHead>
                          <TableHead>Corridor</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(wireTransfers?.items ?? []).map((tx) => {
                          const client =
                            typeof tx.clientId === "object"
                              ? tx.clientId
                              : null;
                          return (
                            <TableRow key={tx._id}>
                              <TableCell className="text-xs text-muted-foreground">
                                {new Date(
                                  tx.transactionDate,
                                ).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="font-medium text-sm">
                                {client
                                  ? `${client.firstName} ${client.lastName}`
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-sm">
                                <p>{tx.counterpartyName ?? "—"}</p>
                                {tx.counterpartyBank && (
                                  <p className="text-xs text-muted-foreground">
                                    {tx.counterpartyBank}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell className="text-xs">
                                {tx.counterpartyCountry
                                  ? `→ ${tx.counterpartyCountry}`
                                  : "—"}
                              </TableCell>
                              <TableCell className="font-semibold text-sm">
                                {tx.currency} {tx.amount.toLocaleString()}
                              </TableCell>
                              <TableCell>{statusBadge(tx.status)}</TableCell>
                              <TableCell>
                                {tx.status === "flagged" && (
                                  <ReviewDialog
                                    tx={tx}
                                    onReviewed={invalidateAll}
                                  />
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── BEHAVIORAL PROFILING ── */}
        <TabsContent value="profiling" className="space-y-4 mt-4">
          <BehavioralProfilingTab />
        </TabsContent>

        {/* ── REAL-TIME ALERTS ── */}
        <TabsContent value="alerts" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Flagged Transactions
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    qc.invalidateQueries({ queryKey: ["transactions-flagged"] })
                  }
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {flaggedLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (flaggedTx?.items ?? []).length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No flagged transactions
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Triggered Rules</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(flaggedTx?.items ?? []).map((tx) => {
                      const client =
                        typeof tx.clientId === "object" ? tx.clientId : null;
                      return (
                        <TableRow key={tx._id}>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(tx.transactionDate).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {client
                              ? `${client.firstName} ${client.lastName}`
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="text-xs capitalize"
                            >
                              {prettyLabel(tx.type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-sm">
                            {tx.currency} {tx.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(tx.triggeredRules ?? [])
                                .slice(0, 2)
                                .map((r) => (
                                  <Badge
                                    key={r}
                                    variant="outline"
                                    className="text-xs bg-destructive/5 text-destructive border-destructive/20"
                                  >
                                    {r}
                                  </Badge>
                                ))}
                              {(tx.triggeredRules ?? []).length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{tx.triggeredRules.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{statusBadge(tx.status)}</TableCell>
                          <TableCell>
                            <ReviewDialog tx={tx} onReviewed={invalidateAll} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BEHAVIORAL PROFILING TAB — client selector + profile view
// ─────────────────────────────────────────────────────────────

function BehavioralProfilingTab() {
  const [clientId, setClientId] = useState<string>("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["behavioral-profile", clientId],
    queryFn: () => fetchBehavioralProfile(clientId),
    enabled: !!clientId,
  });

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Label className="shrink-0">Select Client</Label>
            <ClientSelect
              value={clientId}
              onValueChange={setClientId}
              placeholder="Choose a client to profile..."
              className="max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      {!clientId && (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Select a client above to view their behavioral profile
        </div>
      )}

      {clientId && isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {profile && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Transactions (30 days)",
                value: profile.last30Days.count,
                sub: `USD ${profile.last30Days.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} total`,
              },
              {
                label: "Transactions (7 days)",
                value: profile.last7Days.count,
                sub: `USD ${profile.last7Days.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} total`,
              },
              {
                label: "Flagged Transactions",
                value: profile.flaggedCount,
                sub: "Total flagged",
              },
              {
                label: "Largest Transaction",
                value: `${profile.largestTransaction?.currency ?? "—"} ${(profile.largestTransaction?.amount ?? 0).toLocaleString()}`,
                sub: profile.largestTransaction
                  ? prettyLabel(profile.largestTransaction.type)
                  : "N/A",
              },
            ].map(({ label, value, sub }) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold mt-1 text-primary">
                    {value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Volume by type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Transaction Breakdown by Type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {profile.byType.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No transactions recorded yet.
                </p>
              ) : (
                profile.byType.map((t) => (
                  <div
                    key={t._id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="capitalize">{prettyLabel(t._id)}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">{t.count}×</span>
                      <span className="font-medium">
                        USD{" "}
                        {t.totalAmount.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Daily activity pattern */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Activity by Day of Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 text-center">
                {DAYS.map((day, idx) => {
                  const dayData = profile.dailyPattern.find(
                    (d) => d._id === idx + 1,
                  );
                  const count = dayData?.count ?? 0;
                  const max = Math.max(
                    ...profile.dailyPattern.map((d) => d.count),
                    1,
                  );
                  const pct = Math.round((count / max) * 100);
                  return (
                    <div key={day} className="space-y-2">
                      <div className="h-20 bg-muted rounded flex items-end overflow-hidden">
                        <div
                          className="w-full bg-primary/60 rounded transition-all"
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{day}</p>
                      <p className="text-xs font-medium">{count}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
