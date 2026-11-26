import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Download,
  Pencil,
  Plus,
  ShieldCheck,
  Snowflake,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  authoriseTrustDrawdown,
  downloadTrustReport,
  fetchBankAccounts,
  fetchTrustInterest,
  fetchTrustLedgers,
  fetchTrustMovements,
  markTrustLedgerReconciled,
  rejectTrustDrawdown,
  setTrustLedgerStatus,
  submitTrustDraft,
  type TrustLedger,
  type TrustMovement,
} from "@/lib/crm/finance-api";
import { NewLedgerDialog } from "./trust/NewLedgerDialog";
import { DepositDialog } from "./trust/DepositDialog";
import { DrawdownDialog } from "./trust/DrawdownDialog";
import { EditLedgerDialog } from "./trust/EditLedgerDialog";
import { MovementDetailDialog } from "./trust/MovementDetail";
import {
  AuditPanel,
  InterestPanel,
  ReconciliationPanel,
  ReportsPanel,
} from "./trust/TrustPanels";
import {
  LedgerStatusBadge,
  MovementStatusBadge,
  SourceBadge,
  fmtDate,
  money,
} from "./trust/trustShared";

const STALE_DAYS = 30;
const isStale = (l: TrustLedger) =>
  !l.lastReconciledAt ||
  Date.now() - new Date(l.lastReconciledAt).getTime() > STALE_DAYS * 86400000;

// Money in several currencies is never added together.
const byCurrency = (rows: { currency: string; v: number }[]) => {
  const t: Record<string, number> = {};
  rows.forEach((r) => (t[r.currency] = (t[r.currency] ?? 0) + r.v));
  return Object.entries(t);
};

export default function TrustAccounting() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["trustLedgers"] });
    qc.invalidateQueries({ queryKey: ["trustLedger"] });
    qc.invalidateQueries({ queryKey: ["trustMovements"] });
    qc.invalidateQueries({ queryKey: ["trustIntegrity"] });
    qc.invalidateQueries({ queryKey: ["trustInterest"] });
    qc.invalidateQueries({ queryKey: ["trustAudit"] });
  };

  const { data: ledgers = [] } = useQuery({
    queryKey: ["trustLedgers"],
    queryFn: fetchTrustLedgers,
  });
  const { data: movements = [] } = useQuery({
    queryKey: ["trustMovements", "all"],
    queryFn: () => fetchTrustMovements(),
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ["bankAccounts"],
    queryFn: fetchBankAccounts,
  });
  const { data: interest } = useQuery({
    queryKey: ["trustInterest"],
    queryFn: fetchTrustInterest,
  });
  const accountName = (id: string) => {
    const a = accounts.find((x) => x._id === id);
    return a ? `${a.name}, ${a.bank}` : "—";
  };

  const pending = movements.filter(
    (m) => m.status === "Awaiting authorisation",
  );
  const drafts = movements.filter((m) => m.status === "Draft");
  const approvalsCount = pending.length + drafts.length;
  const stale = ledgers.filter(isStale);
  const belowMin = ledgers.filter((l) => l.belowMinimum);

  // ── Dialogs ────────────────────────────────────────────────
  const [newLedger, setNewLedger] = useState(false);
  const [deposit, setDeposit] = useState<{ open: boolean; ledgerId?: string }>({
    open: false,
  });
  const [drawdown, setDrawdown] = useState<{
    open: boolean;
    ledgerId?: string;
  }>({ open: false });
  const [editing, setEditing] = useState<TrustLedger | null>(null);
  const [detailMovement, setDetailMovement] = useState<TrustMovement | null>(
    null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = ledgers.find((l) => l._id === selectedId) ?? null;
  const selectedMovements = movements.filter((m) => m.ledgerId === selectedId);
  const selectedInterest = interest?.rows.find(
    (r) => r.ledgerId === selectedId,
  );

  // ── Register filters ───────────────────────────────────────
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const filteredLedgers = useMemo(
    () =>
      ledgers.filter(
        (l) =>
          (statusFilter === "all" || l.status === statusFilter) &&
          (accountFilter === "all" || l.bankAccountId === accountFilter) &&
          (!search.trim() ||
            `${l.clientName} ${l.mandateName} ${l.mandateReference}`
              .toLowerCase()
              .includes(search.trim().toLowerCase())),
      ),
    [ledgers, search, statusFilter, accountFilter],
  );

  // ── Movement filters ───────────────────────────────────────
  const [mType, setMType] = useState("all");
  const [mStatus, setMStatus] = useState("all");
  const [mFrom, setMFrom] = useState("");
  const [mTo, setMTo] = useState("");
  const [mSearch, setMSearch] = useState("");
  const filteredMovements = useMemo(
    () =>
      movements.filter((m) => {
        if (mType !== "all" && m.type !== mType) return false;
        if (mStatus !== "all" && m.status !== mStatus) return false;
        if (mFrom && new Date(m.date) < new Date(mFrom)) return false;
        if (mTo && new Date(m.date) > new Date(`${mTo}T23:59:59`)) return false;
        if (
          mSearch.trim() &&
          !`${m.clientName} ${m.ref} ${m.reference} ${m.linkRef} ${m.payeeName}`
            .toLowerCase()
            .includes(mSearch.trim().toLowerCase())
        )
          return false;
        return true;
      }),
    [movements, mType, mStatus, mFrom, mTo, mSearch],
  );

  // ── Ledger actions ─────────────────────────────────────────
  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: "Active" | "Frozen" | "Closing" }) =>
      setTrustLedgerStatus(v.id, v.status),
    onSuccess: (_d, v) => {
      refresh();
      toast({
        title:
          v.status === "Frozen"
            ? "Ledger frozen"
            : v.status === "Closing"
              ? "Ledger marked as closing"
              : "Ledger reactivated",
      });
    },
    onError: onErr("Could not change the ledger status"),
  });
  const reconcileMut = useMutation({
    mutationFn: (id: string) => markTrustLedgerReconciled(id),
    onSuccess: () => {
      refresh();
      toast({ title: "Sign-off recorded" });
    },
    onError: onErr("Failed to sign off"),
  });

  // ── Approvals ──────────────────────────────────────────────
  const [authoriseTarget, setAuthoriseTarget] = useState<TrustMovement | null>(
    null,
  );
  const [rejectTarget, setRejectTarget] = useState<TrustMovement | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const authoriseMut = useMutation({
    mutationFn: (id: string) => authoriseTrustDrawdown(id),
    onSuccess: (m) => {
      refresh();
      setAuthoriseTarget(null);
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["bankAccounts"] });
      toast(
        m.status === "Approved"
          ? {
              title: "Drawdown authorised",
              description: m.settledPaymentRef
                ? `Paid into the office account as ${m.settledPaymentRef}.`
                : "Funds released from the ledger.",
            }
          : {
              title: "First approval recorded",
              description:
                "One more authoriser, different from you and the preparer, is needed.",
            },
      );
    },
    onError: onErr("Could not authorise"),
  });
  const rejectMut = useMutation({
    mutationFn: () =>
      rejectTrustDrawdown(rejectTarget!._id, rejectReason.trim() || undefined),
    onSuccess: () => {
      refresh();
      setRejectTarget(null);
      setRejectReason("");
      toast({ title: "Drawdown rejected" });
    },
    onError: onErr("Failed to reject"),
  });
  const submitMut = useMutation({
    mutationFn: (id: string) => submitTrustDraft(id),
    onSuccess: () => {
      refresh();
      toast({ title: "Submitted for approval" });
    },
    onError: onErr("Could not submit"),
  });

  const cannotAuthorise = (m: TrustMovement) => {
    if (!user) return "";
    if (m.preparedById === user.id) return "You prepared this drawdown";
    if (m.firstAuthorisedById === user.id) return "You gave the first approval";
    return "";
  };

  const totals = byCurrency(
    ledgers.map((l) => ({ currency: l.currency, v: l.balance })),
  );
  const accrued = Object.entries(interest?.byCurrency ?? {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Trust Accounting</h1>
          <p className="text-sm text-muted-foreground">
            Segregated client funds: deposits, source-traced drawdowns,
            dual-control approvals, three-way reconciliation, interest and
            regulatory reporting
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setNewLedger(true)}>
            <Plus className="mr-2 h-4 w-4" /> New ledger
          </Button>
          <Button variant="outline" onClick={() => setDeposit({ open: true })}>
            <ArrowDownToLine className="mr-2 h-4 w-4" /> Record deposit
          </Button>
          <Button onClick={() => setDrawdown({ open: true })}>
            <ArrowUpFromLine className="mr-2 h-4 w-4" /> Request drawdown
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total trust balance</p>
            {totals.length ? (
              totals.map(([c, v]) => (
                <p key={c} className="mt-1 text-lg font-bold leading-tight">
                  {money(v, c)}
                </p>
              ))
            ) : (
              <p className="mt-1 text-xl font-bold">—</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Across {new Set(ledgers.map((l) => l.bankAccountId)).size} trust
              account(s)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Client ledgers</p>
            <p className="mt-1 text-xl font-bold">{ledgers.length}</p>
            <p className="text-[11px] text-muted-foreground">
              {ledgers.filter((l) => l.mandateId).length} mandate-linked,{" "}
              {ledgers.filter((l) => !l.mandateId).length} general
              {ledgers.some((l) => l.status === "Frozen") &&
                `, ${ledgers.filter((l) => l.status === "Frozen").length} frozen`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              Awaiting authorisation
            </p>
            <p className="mt-1 text-xl font-bold text-warning">
              {pending.length}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {drafts.length
                ? `${drafts.length} draft(s) not yet submitted`
                : "Nothing in draft"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              Interest accrued this month
            </p>
            {accrued.length ? (
              accrued.map(([c, t]) => (
                <p key={c} className="mt-1 text-lg font-bold leading-tight">
                  {money(t.mtdAccrued, c)}
                </p>
              ))
            ) : (
              <p className="mt-1 text-xl font-bold">—</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              All earning ledgers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              Not reconciled in {STALE_DAYS} days
            </p>
            <p
              className={`mt-1 text-xl font-bold ${stale.length ? "text-destructive" : ""}`}
            >
              {stale.length}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {belowMin.length
                ? `${belowMin.length} below minimum balance`
                : "No ledger below its minimum"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="register" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="register">Trust register</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
          <TabsTrigger value="approvals">
            Drawdown approvals
            {approvalsCount > 0 && (
              <Badge className="ml-2 px-1.5 py-0 text-[10px]">
                {approvalsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          <TabsTrigger value="interest">Interest</TabsTrigger>
          <TabsTrigger value="reports">Trust reporting</TabsTrigger>
          <TabsTrigger value="audit">Audit trail</TabsTrigger>
        </TabsList>

        {/* ── Register ── */}
        <TabsContent value="register">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  Client trust ledgers
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Each client's segregated funds, linked to mandates and
                  engagement letters
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Input
                  className="w-[200px]"
                  placeholder="Search clients..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Select value={accountFilter} onValueChange={setAccountFilter}>
                  <SelectTrigger className="w-[190px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All accounts</SelectItem>
                    {accounts
                      .filter((a) => a.type === "Trust")
                      .map((a) => (
                        <SelectItem key={a._id} value={a._id}>
                          {a.name} ({a.currency})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Frozen">Frozen</SelectItem>
                    <SelectItem value="Closing">Closing</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadTrustReport("balances", "csv")}
                >
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client / mandate</TableHead>
                    <TableHead>Trust account</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Interest</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Last reconciled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLedgers.map((l) => (
                    <TableRow
                      key={l._id}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(l._id)}
                    >
                      <TableCell>
                        <p className="font-medium">{l.clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {l.mandateName || "General retainer"}
                          {l.mandateReference && ` · ${l.mandateReference}`}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {accountName(l.bankAccountId)}
                      </TableCell>
                      <TableCell>{l.currency}</TableCell>
                      <TableCell className="text-sm">
                        {l.interestTreatment}
                        {l.interestTreatment !== "No interest" && (
                          <span className="block text-xs text-muted-foreground">
                            {l.interestRate}% p.a.
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            l.riskLevel === "Standard"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {l.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={isStale(l) ? "text-destructive" : ""}
                      >
                        {l.lastReconciledAt
                          ? fmtDate(l.lastReconciledAt)
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <LedgerStatusBadge status={l.status} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {money(l.balance, l.currency)}
                        {l.belowMinimum && (
                          <span className="block text-[10px] text-warning">
                            below minimum
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filteredLedgers.length && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        {ledgers.length
                          ? "No ledgers match those filters."
                          : "No trust ledgers yet. Create the first one to start holding client money."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Movements ── */}
        <TabsContent value="movements">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Trust movements</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Every deposit, drawdown and interest credit — each traced to
                  the document it came from or went against
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  className="w-[170px]"
                  placeholder="Search..."
                  value={mSearch}
                  onChange={(e) => setMSearch(e.target.value)}
                />
                <Input
                  type="date"
                  className="w-[140px]"
                  value={mFrom}
                  onChange={(e) => setMFrom(e.target.value)}
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="date"
                  className="w-[140px]"
                  value={mTo}
                  onChange={(e) => setMTo(e.target.value)}
                />
                <Select value={mType} onValueChange={setMType}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="Deposit">Deposit</SelectItem>
                    <SelectItem value="Drawdown">Drawdown</SelectItem>
                    <SelectItem value="Interest">Interest</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={mStatus} onValueChange={setMStatus}>
                  <SelectTrigger className="w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {[
                      "Draft",
                      "Recorded",
                      "Awaiting authorisation",
                      "Approved",
                      "Rejected",
                    ].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    downloadTrustReport("movements", "csv", {
                      from: mFrom || undefined,
                      to: mTo || undefined,
                      type: mType === "all" ? undefined : mType,
                      status: mStatus === "all" ? undefined : mStatus,
                      q: mSearch.trim() || undefined,
                    })
                  }
                >
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <MovementsTable
                rows={filteredMovements}
                onOpen={setDetailMovement}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Approvals ── */}
        <TabsContent value="approvals" className="space-y-4">
          <div className="flex items-start gap-3 rounded-md border border-info/30 bg-info/5 p-3 text-sm">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-info" />
            <p>
              <strong>Dual control.</strong> A drawdown is prepared by one
              person and authorised by a different one. Above a ledger's
              per-request limit two other people must approve. Nobody can
              approve their own request, and every drawdown has to point at a
              real invoice, bill, mandate or deposit.
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Waiting for authorisation
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Linked to</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Prepared by</TableHead>
                    <TableHead>Workflow</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...pending, ...drafts].map((m) => {
                    const blocked = cannotAuthorise(m);
                    const isDraft = m.status === "Draft";
                    return (
                      <TableRow key={m._id}>
                        <TableCell>
                          <button
                            className="text-left font-medium hover:underline"
                            onClick={() => setDetailMovement(m)}
                          >
                            {m.clientName}
                          </button>
                          <p className="text-xs text-muted-foreground">
                            {m.ref} · {fmtDate(m.date)}
                          </p>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {money(m.amount, m.currency)}
                        </TableCell>
                        <TableCell>
                          <SourceBadge
                            linkType={m.linkType}
                            linkRef={m.linkRef}
                          />
                          <p className="text-[11px] text-muted-foreground">
                            {m.drawdownType}
                          </p>
                        </TableCell>
                        <TableCell className="max-w-[220px] text-xs">
                          {m.narrative || m.payeeName || "—"}
                          {m.documents.length > 0 && (
                            <span className="block text-muted-foreground">
                              {m.documents.length} document(s) attached
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {m.preparedBy}
                        </TableCell>
                        <TableCell className="text-xs">
                          {isDraft ? (
                            <Badge variant="outline">Draft</Badge>
                          ) : m.requiresAdditionalApproval ? (
                            <>
                              <Badge
                                variant="outline"
                                className="bg-warning/10 text-warning"
                              >
                                {m.firstAuthorisedBy
                                  ? "Needs final approval"
                                  : "Needs 2 approvals"}
                              </Badge>
                              {m.firstAuthorisedBy && (
                                <span className="block text-muted-foreground">
                                  1st: {m.firstAuthorisedBy}
                                </span>
                              )}
                            </>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-warning/10 text-warning"
                            >
                              Needs authoriser
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {isDraft ? (
                              <Button
                                size="sm"
                                disabled={submitMut.isPending}
                                onClick={() => submitMut.mutate(m._id)}
                              >
                                Submit
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                disabled={!!blocked}
                                title={blocked || undefined}
                                onClick={() => setAuthoriseTarget(m)}
                              >
                                Authorise
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRejectTarget(m)}
                            >
                              {isDraft ? "Discard" : "Reject"}
                            </Button>
                          </div>
                          {blocked && !isDraft && (
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {blocked}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!approvalsCount && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        Nothing is waiting for authorisation.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation">
          <ReconciliationPanel ledgers={ledgers} />
        </TabsContent>
        <TabsContent value="interest">
          <InterestPanel />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsPanel ledgers={ledgers} />
        </TabsContent>
        <TabsContent value="audit">
          <AuditPanel ledgers={ledgers} />
        </TabsContent>
      </Tabs>

      {/* ── Ledger detail ── */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selected.clientName}
                  <LedgerStatusBadge status={selected.status} />
                </SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {selected.mandateName || "General retainer"}
                  {selected.mandateReference &&
                    ` · ${selected.mandateReference}`}
                </p>
              </SheetHeader>
              <div className="mt-4 space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-md border p-3">
                    <p className="text-[11px] text-muted-foreground">Balance</p>
                    <p className="font-bold">
                      {money(selected.balance, selected.currency)}
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-[11px] text-muted-foreground">
                      Requested
                    </p>
                    <p className="font-bold">
                      {money(selected.reserved, selected.currency)}
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-[11px] text-muted-foreground">
                      Available
                    </p>
                    <p className="font-bold">
                      {money(selected.available, selected.currency)}
                    </p>
                  </div>
                </div>
                {selected.belowMinimum && (
                  <p className="flex items-center gap-2 rounded-md bg-warning/10 p-2 text-xs text-warning">
                    <AlertTriangle className="h-4 w-4" /> Below the{" "}
                    {money(selected.minBalance, selected.currency)} minimum — a
                    replenishment request goes to the client
                    {selected.replenishmentTarget > 0 &&
                      ` for ${money(selected.replenishmentTarget, selected.currency)}`}
                    .
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      setDeposit({ open: true, ledgerId: selected._id })
                    }
                    disabled={selected.status !== "Active"}
                  >
                    <ArrowDownToLine className="mr-2 h-4 w-4" /> Deposit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDrawdown({ open: true, ledgerId: selected._id })
                    }
                    disabled={selected.status !== "Active"}
                  >
                    <ArrowUpFromLine className="mr-2 h-4 w-4" /> Drawdown
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(selected)}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => reconcileMut.mutate(selected._id)}
                    disabled={reconcileMut.isPending}
                  >
                    Sign off
                  </Button>
                  {selected.status === "Frozen" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        statusMut.mutate({ id: selected._id, status: "Active" })
                      }
                    >
                      Unfreeze
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        statusMut.mutate({ id: selected._id, status: "Frozen" })
                      }
                    >
                      <Snowflake className="mr-2 h-4 w-4" /> Freeze
                    </Button>
                  )}
                  {selected.status === "Active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        statusMut.mutate({
                          id: selected._id,
                          status: "Closing",
                        })
                      }
                    >
                      Mark closing
                    </Button>
                  )}
                </div>

                <section className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                    Interest
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted-foreground">Treatment</span>
                    <span>{selected.interestTreatment}</span>
                    <span className="text-muted-foreground">Rate</span>
                    <span>
                      {selected.interestTreatment === "No interest"
                        ? "—"
                        : `${selected.interestRate}% p.a.`}
                    </span>
                    {selectedInterest && selectedInterest.earns && (
                      <>
                        <span className="text-muted-foreground">
                          Accrued this month
                        </span>
                        <span>
                          {money(
                            selectedInterest.mtdAccrued,
                            selected.currency,
                          )}
                        </span>
                        <span className="text-muted-foreground">
                          Earned, not yet credited
                        </span>
                        <span>
                          {money(
                            selectedInterest.uncreditedAccrued,
                            selected.currency,
                          )}
                        </span>
                        <span className="text-muted-foreground">
                          Credited this year
                        </span>
                        <span>
                          {money(
                            selectedInterest.ytdCredited +
                              selectedInterest.ytdFirmRetained,
                            selected.currency,
                          )}
                        </span>
                        <span className="text-muted-foreground">
                          Projected for the year
                        </span>
                        <span>
                          {money(
                            selectedInterest.projectedAnnual,
                            selected.currency,
                          )}
                        </span>
                      </>
                    )}
                  </div>
                </section>

                <section className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                    Source of funds
                  </h4>
                  <p className="text-sm">
                    {selected.sourceOfFunds || "Not declared"}
                  </p>
                  {selected.expectedPurpose && (
                    <p className="text-xs text-muted-foreground">
                      Purpose: {selected.expectedPurpose}
                    </p>
                  )}
                  {selected.sourceOfFundsNotes && (
                    <p className="text-xs text-muted-foreground">
                      {selected.sourceOfFundsNotes}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {selected.depositsWithEvidence ?? 0} deposit(s) with
                    evidence attached
                  </p>
                </section>

                <section className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                    Controls
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted-foreground">Risk level</span>
                    <span>{selected.riskLevel}</span>
                    <span className="text-muted-foreground">
                      Max per drawdown
                    </span>
                    <span>
                      {selected.maxDrawdownPerRequest
                        ? money(
                            selected.maxDrawdownPerRequest,
                            selected.currency,
                          )
                        : "No limit"}
                    </span>
                    <span className="text-muted-foreground">
                      Invoice-linked only
                    </span>
                    <span>{selected.invoiceLinkedOnly ? "Yes" : "No"}</span>
                    <span className="text-muted-foreground">Client portal</span>
                    <span>
                      {selected.portalAccess}
                      {selected.portalContactEmail &&
                        ` · ${selected.portalContactEmail}`}
                    </span>
                    <span className="text-muted-foreground">
                      Last reconciled
                    </span>
                    <span>
                      {selected.lastReconciledAt
                        ? fmtDate(selected.lastReconciledAt)
                        : "Never"}
                    </span>
                  </div>
                </section>

                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                    Movements
                  </h4>
                  <MovementsTable
                    rows={selectedMovements}
                    onOpen={setDetailMovement}
                    compact
                  />
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <NewLedgerDialog
        open={newLedger}
        onClose={() => setNewLedger(false)}
        onCreated={refresh}
      />
      <DepositDialog
        open={deposit.open}
        onClose={() => setDeposit({ open: false })}
        ledgers={ledgers}
        initialLedgerId={deposit.ledgerId}
        onDone={refresh}
      />
      <DrawdownDialog
        open={drawdown.open}
        onClose={() => setDrawdown({ open: false })}
        ledgers={ledgers}
        initialLedgerId={drawdown.ledgerId}
        onDone={refresh}
      />
      <EditLedgerDialog
        ledger={editing}
        onClose={() => setEditing(null)}
        onSaved={refresh}
      />
      <MovementDetailDialog
        movement={detailMovement}
        onClose={() => setDetailMovement(null)}
      />

      <Dialog
        open={!!authoriseTarget}
        onOpenChange={(o) => !o && setAuthoriseTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Authorise drawdown</DialogTitle>
            <DialogDescription>
              {authoriseTarget &&
                `${authoriseTarget.ref} · ${money(authoriseTarget.amount, authoriseTarget.currency)} from ${authoriseTarget.clientName}`}
            </DialogDescription>
          </DialogHeader>
          {authoriseTarget && (
            <div className="space-y-2 text-sm">
              <p>
                Linked to{" "}
                <SourceBadge
                  linkType={authoriseTarget.linkType}
                  linkRef={authoriseTarget.linkRef}
                />
                {authoriseTarget.linkLabel && (
                  <span className="text-muted-foreground">
                    {" "}
                    — {authoriseTarget.linkLabel}
                  </span>
                )}
              </p>
              <p className="text-muted-foreground">
                Prepared by {authoriseTarget.preparedBy}. You are authorising as{" "}
                <strong>
                  {user?.firstName} {user?.lastName}
                </strong>
                ; the balance and the source document are re-checked when you
                confirm.
              </p>
              {authoriseTarget.requiresAdditionalApproval &&
                !authoriseTarget.firstAuthorisedBy && (
                  <p className="rounded bg-warning/10 p-2 text-xs text-warning">
                    This is above the ledger's limit, so it needs a second
                    authoriser after you.
                  </p>
                )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuthoriseTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={authoriseMut.isPending}
              onClick={() => authoriseMut.mutate(authoriseTarget!._id)}
            >
              {authoriseMut.isPending ? "Authorising…" : "Authorise"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(o) => !o && setRejectTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {rejectTarget?.status === "Draft"
                ? "Discard draft"
                : "Reject drawdown"}
            </DialogTitle>
            <DialogDescription>
              The movement stays in the record as Rejected — nothing is deleted.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            placeholder="Reason (kept in the audit trail)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={rejectMut.isPending}
              onClick={() => rejectMut.mutate()}
            >
              {rejectTarget?.status === "Draft" ? "Discard" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MovementsTable({
  rows,
  onOpen,
  compact,
}: {
  rows: TrustMovement[];
  onOpen: (m: TrustMovement) => void;
  compact?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          {!compact && <TableHead>Client</TableHead>}
          <TableHead>Type</TableHead>
          <TableHead>Linked to</TableHead>
          {!compact && <TableHead>Reference</TableHead>}
          {!compact && <TableHead>Prepared by</TableHead>}
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((m) => {
          const out = m.type === "Drawdown";
          const dead = m.status === "Rejected" || m.status === "Draft";
          return (
            <TableRow
              key={m._id}
              className="cursor-pointer"
              onClick={() => onOpen(m)}
            >
              <TableCell className="whitespace-nowrap text-sm">
                {fmtDate(m.date)}
              </TableCell>
              {!compact && (
                <TableCell className="text-sm">{m.clientName}</TableCell>
              )}
              <TableCell className="text-sm">
                {m.type}
                {m.drawdownType && (
                  <span className="block text-[11px] text-muted-foreground">
                    {m.drawdownType}
                  </span>
                )}
                {m.type === "Interest" && m.firmRetained && (
                  <span className="block text-[11px] text-muted-foreground">
                    firm income
                  </span>
                )}
              </TableCell>
              <TableCell>
                <SourceBadge linkType={m.linkType} linkRef={m.linkRef} />
              </TableCell>
              {!compact && (
                <TableCell className="font-mono text-xs">
                  {m.reference || m.ref}
                </TableCell>
              )}
              {!compact && (
                <TableCell className="text-sm">{m.preparedBy}</TableCell>
              )}
              <TableCell>
                <MovementStatusBadge status={m.status} />
              </TableCell>
              <TableCell
                className={`text-right font-medium ${dead ? "text-muted-foreground line-through" : out ? "" : "text-success"}`}
              >
                {out ? "−" : "+"}
                {money(m.amount, m.currency)}
              </TableCell>
            </TableRow>
          );
        })}
        {!rows.length && (
          <TableRow>
            <TableCell
              colSpan={compact ? 5 : 8}
              className="py-8 text-center text-sm text-muted-foreground"
            >
              No movements.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
