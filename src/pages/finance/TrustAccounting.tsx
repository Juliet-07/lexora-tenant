import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Banknote,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShieldCheck,
  AlertTriangle,
  Download,
  ScaleIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ClientSelect } from "@/components/ClientDropdown";
import {
  fetchTrustLedgers,
  fetchTrustLedger,
  createTrustLedger,
  markTrustLedgerReconciled,
  fetchTrustIntegrityCheck,
  fetchTrustMovements,
  recordTrustDeposit,
  requestTrustDrawdown,
  authoriseTrustDrawdown,
  rejectTrustDrawdown,
  fetchBankAccounts,
  type InterestTreatment,
  type TrustLedger,
} from "@/lib/crm/finance-api";

const money = (n: number, c = "USD") =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: c,
    maximumFractionDigits: 2,
  });

const INTEREST_TREATMENTS: InterestTreatment[] = [
  "Client retained",
  "Firm retained",
  "Pooled",
];

const csvDownload = (
  rows: (string | number)[][],
  headers: string[],
  filename: string,
) => {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default function TrustAccounting() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["trustLedgers"] });
    queryClient.invalidateQueries({ queryKey: ["trustMovements"] });
  };

  const { data: ledgers = [] } = useQuery({
    queryKey: ["trustLedgers"],
    queryFn: fetchTrustLedgers,
  });
  const { data: movements = [] } = useQuery({
    queryKey: ["trustMovements"],
    queryFn: () => fetchTrustMovements(),
  });
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankAccounts"],
    queryFn: fetchBankAccounts,
  });
  const trustAccounts = bankAccounts.filter((a) => a.type === "Trust");

  const ledgerById = useMemo(
    () => new Map(ledgers.map((l) => [l._id, l])),
    [ledgers],
  );
  const total = ledgers.reduce((s, l) => s + l.balance, 0);
  const pendingAuth = movements.filter(
    (m) => m.status === "Awaiting authorisation",
  );
  const unreconciled = ledgers.filter((l) => !l.lastReconciledAt);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: selectedDetail } = useQuery({
    queryKey: ["trustLedger", selectedId],
    queryFn: () => fetchTrustLedger(selectedId!),
    enabled: !!selectedId,
  });
  const { data: selectedMovements = [] } = useQuery({
    queryKey: ["trustMovements", selectedId],
    queryFn: () => fetchTrustMovements(selectedId!),
    enabled: !!selectedId,
  });

  // ── New ledger ─────────────────────────────────────────────
  const [openNewLedger, setOpenNewLedger] = useState(false);
  const [newLedger, setNewLedger] = useState({
    bankAccountId: "",
    clientUserId: "",
    clientName: "",
    mandateName: "",
    currency: "USD",
    interestTreatment: "Client retained" as InterestTreatment,
  });
  const createLedgerMut = useMutation({
    mutationFn: () => createTrustLedger(newLedger),
    onSuccess: () => {
      invalidate();
      setOpenNewLedger(false);
      setNewLedger({
        bankAccountId: "",
        clientUserId: "",
        clientName: "",
        mandateName: "",
        currency: "USD",
        interestTreatment: "Client retained",
      });
      toast({ title: "Trust ledger created" });
    },
    onError: onErr("Failed to create ledger"),
  });

  // ── Deposit ────────────────────────────────────────────────
  const [openDeposit, setOpenDeposit] = useState(false);
  const [deposit, setDeposit] = useState({
    ledgerId: "",
    amount: 0,
    reference: "",
    date: new Date().toISOString().slice(0, 10),
    preparedBy: "",
  });
  const depositMut = useMutation({
    mutationFn: () => recordTrustDeposit(deposit),
    onSuccess: () => {
      invalidate();
      setOpenDeposit(false);
      setDeposit({
        ledgerId: "",
        amount: 0,
        reference: "",
        date: new Date().toISOString().slice(0, 10),
        preparedBy: "",
      });
      toast({ title: "Deposit recorded", description: "Balance updated." });
    },
    onError: onErr("Failed to record deposit"),
  });

  // ── Drawdown request ───────────────────────────────────────
  const [openDrawdown, setOpenDrawdown] = useState(false);
  const [drawdown, setDrawdown] = useState({
    ledgerId: "",
    amount: 0,
    preparedBy: "",
  });
  const drawdownMut = useMutation({
    mutationFn: () => requestTrustDrawdown(drawdown),
    onSuccess: () => {
      invalidate();
      setOpenDrawdown(false);
      setDrawdown({ ledgerId: "", amount: 0, preparedBy: "" });
      toast({
        title: "Drawdown prepared",
        description: "Awaiting a different person's authorisation.",
      });
    },
    onError: onErr("Failed to request drawdown"),
  });

  // ── Authorise / reject ─────────────────────────────────────
  const [authoriseTarget, setAuthoriseTarget] = useState<{
    id: string;
    preparedBy: string;
  } | null>(null);
  const [authorisedBy, setAuthorisedBy] = useState("");
  const authoriseMut = useMutation({
    mutationFn: () => authoriseTrustDrawdown(authoriseTarget!.id, authorisedBy),
    onSuccess: () => {
      invalidate();
      setAuthoriseTarget(null);
      setAuthorisedBy("");
      toast({
        title: "Drawdown authorised",
        description: "Trust-to-office transfer posted to the ledger.",
      });
    },
    onError: onErr("Failed to authorise"),
  });
  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectTrustDrawdown(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Drawdown rejected" });
    },
    onError: onErr("Failed to reject"),
  });

  // ── Reconciliation ─────────────────────────────────────────
  const reconcileMut = useMutation({
    mutationFn: (id: string) => markTrustLedgerReconciled(id),
    onSuccess: () => {
      invalidate();
      toast({
        title: "Monthly sign-off recorded",
        description: "No commingling with office funds detected.",
      });
    },
    onError: onErr("Failed to reconcile"),
  });

  const [integrityAccountId, setIntegrityAccountId] = useState<string>(
    trustAccounts[0]?._id ?? "",
  );
  const { data: integrity } = useQuery({
    queryKey: ["trustIntegrity", integrityAccountId],
    queryFn: () => fetchTrustIntegrityCheck(integrityAccountId),
    enabled: !!integrityAccountId,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Trust Accounting</h1>
          <p className="text-sm text-muted-foreground">
            Segregated client funds — deposits, dual-control drawdowns,
            reconciliation and reporting
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpenNewLedger(true)}>
            <Plus className="mr-2 h-4 w-4" /> New ledger
          </Button>
          <Button variant="outline" onClick={() => setOpenDeposit(true)}>
            <ArrowDownToLine className="mr-2 h-4 w-4" /> Record deposit
          </Button>
          <Button onClick={() => setOpenDrawdown(true)}>
            <ArrowUpFromLine className="mr-2 h-4 w-4" /> Request drawdown
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total trust balance</p>
            <p className="mt-1 text-xl font-bold">{money(total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Client ledgers</p>
            <p className="mt-1 text-xl font-bold">{ledgers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              Awaiting authorisation
            </p>
            <p className="mt-1 text-xl font-bold text-warning">
              {pendingAuth.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              Unreconciled ledgers
            </p>
            <p className="mt-1 text-xl font-bold">{unreconciled.length}</p>
          </CardContent>
        </Card>
      </div>

      {!trustAccounts.length && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          No Trust-type bank account exists yet — add one in Banking before
          creating a trust ledger.
        </div>
      )}

      <Tabs defaultValue="register">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="register">Trust register</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
          <TabsTrigger value="approvals">
            Drawdown approvals
            {pendingAuth.length > 0 && (
              <Badge className="ml-1.5 h-4 px-1 text-[10px]">
                {pendingAuth.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="recon">Reconciliation</TabsTrigger>
          <TabsTrigger value="reports">Trust reporting</TabsTrigger>
        </TabsList>

        {/* Trust register */}
        <TabsContent value="register" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client / mandate</TableHead>
                    <TableHead>Interest treatment</TableHead>
                    <TableHead>Last reconciled</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgers.map((l) => (
                    <TableRow
                      key={l._id}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(l._id)}
                    >
                      <TableCell>
                        <p className="text-sm font-medium">{l.clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {l.mandateName || "—"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{l.interestTreatment}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {l.lastReconciledAt
                          ? new Date(l.lastReconciledAt).toLocaleDateString()
                          : "—"}
                        {!l.lastReconciledAt && (
                          <Badge className="ml-2 bg-warning/10 text-warning">
                            Unreconciled
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {money(l.balance, l.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!ledgers.length && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No trust ledgers yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Movements */}
        <TabsContent value="movements" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m._id}>
                      <TableCell className="text-sm">
                        {new Date(m.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {ledgerById.get(m.ledgerId)?.clientName ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{m.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{m.reference}</TableCell>
                      <TableCell className="text-sm">{m.status}</TableCell>
                      <TableCell className="text-right text-sm">
                        {m.type === "Drawdown" ? "−" : "+"}
                        {money(m.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!movements.length && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No trust movements yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Drawdown approvals */}
        <TabsContent value="approvals" className="pt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Two-stage approval — preparer then a different authoriser
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingAuth.map((m) => (
                <div
                  key={m._id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {money(m.amount)} — {m.reference}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ledgerById.get(m.ledgerId)?.clientName ??
                        "Unknown client"}{" "}
                      · prepared by {m.preparedBy}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        setAuthoriseTarget({
                          id: m._id,
                          preparedBy: m.preparedBy,
                        })
                      }
                    >
                      Authorise
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectMut.mutate(m._id)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
              {!pendingAuth.length && (
                <p className="text-sm text-muted-foreground">
                  No drawdowns awaiting authorisation.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reconciliation */}
        <TabsContent value="recon" className="pt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ScaleIcon className="h-4 w-4" /> No-commingling check
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                The trust bank account's own real balance must equal the sum of
                every client ledger — any gap means money moved that isn't
                accounted for at the client level.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {trustAccounts.length > 0 && (
                <Select
                  value={integrityAccountId}
                  onValueChange={setIntegrityAccountId}
                >
                  <SelectTrigger className="w-72">
                    <SelectValue placeholder="Select trust bank account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {trustAccounts.map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.name} — {a.bank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {integrity && (
                <div
                  className={`rounded-lg border p-3 text-sm ${integrity.matched ? "border-success/40 bg-success/5 text-success" : "border-destructive/40 bg-destructive/5 text-destructive"}`}
                >
                  {integrity.matched
                    ? `Matched. Bank balance ${money(integrity.bankBalance)} equals the sum of ${integrity.ledgerCount} client ledgers (${money(integrity.ledgerTotal)}).`
                    : `Variance detected — bank balance ${money(integrity.bankBalance)} vs ledger total ${money(integrity.ledgerTotal)} (${money(integrity.variance)} unaccounted for).`}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-4">
              {ledgers.map((l) => (
                <div
                  key={l._id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {l.clientName} — {money(l.balance, l.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last sign-off{" "}
                      {l.lastReconciledAt
                        ? new Date(l.lastReconciledAt).toLocaleDateString()
                        : "never"}
                    </p>
                  </div>
                  {l.lastReconciledAt ? (
                    <Badge className="bg-success/10 text-success">
                      <ShieldCheck className="mr-1 h-3 w-3" /> Reconciled
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      disabled={reconcileMut.isPending}
                      onClick={() => reconcileMut.mutate(l._id)}
                    >
                      Reconcile &amp; sign off
                    </Button>
                  )}
                </div>
              ))}
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <AlertTriangle className="h-3 w-3" /> A mandate should not be
                closed while its trust balance is still outstanding.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trust reporting */}
        <TabsContent value="reports" className="pt-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Card>
              <CardContent className="space-y-3 p-4">
                <p className="text-sm font-medium">
                  Per-client trust balance report
                </p>
                <p className="text-xs text-muted-foreground">
                  Real current balance for every client ledger, as shown in the
                  register.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!ledgers.length}
                  onClick={() =>
                    csvDownload(
                      ledgers.map((l) => [
                        l.clientName,
                        l.mandateName,
                        l.interestTreatment,
                        l.currency,
                        l.balance,
                        l.lastReconciledAt
                          ? new Date(l.lastReconciledAt).toLocaleDateString()
                          : "Never",
                      ]),
                      [
                        "Client",
                        "Mandate",
                        "Interest treatment",
                        "Currency",
                        "Balance",
                        "Last reconciled",
                      ],
                      `trust-balances-${new Date().toISOString().slice(0, 10)}.csv`,
                    )
                  }
                >
                  <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-3 p-4">
                <p className="text-sm font-medium">Movement report</p>
                <p className="text-xs text-muted-foreground">
                  Every real deposit, drawdown and interest movement across all
                  ledgers.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!movements.length}
                  onClick={() =>
                    csvDownload(
                      movements.map((m) => [
                        new Date(m.date).toLocaleDateString(),
                        ledgerById.get(m.ledgerId)?.clientName ?? "",
                        m.type,
                        m.reference,
                        m.status,
                        m.amount,
                        m.preparedBy,
                        m.authorisedBy ?? "",
                      ]),
                      [
                        "Date",
                        "Client",
                        "Type",
                        "Reference",
                        "Status",
                        "Amount",
                        "Prepared by",
                        "Authorised by",
                      ],
                      `trust-movements-${new Date().toISOString().slice(0, 10)}.csv`,
                    )
                  }
                >
                  <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
              </CardContent>
            </Card>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            A formal regulatory filing (e.g. for a BNR inspection) typically
            follows a prescribed format — the two exports above give the real
            underlying data an accountant would need to prepare one, rather than
            claiming to already match a specific regulator's template.
          </p>
        </TabsContent>
      </Tabs>

      {/* New ledger */}
      <Dialog open={openNewLedger} onOpenChange={setOpenNewLedger}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New trust ledger</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Trust bank account</Label>
              <Select
                value={newLedger.bankAccountId}
                onValueChange={(v) =>
                  setNewLedger({ ...newLedger, bankAccountId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trust account..." />
                </SelectTrigger>
                <SelectContent>
                  {trustAccounts.map((a) => (
                    <SelectItem key={a._id} value={a._id}>
                      {a.name} — {a.bank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Client</Label>
              <ClientSelect
                value={newLedger.clientUserId}
                onValueChange={(v) =>
                  setNewLedger((d) => ({ ...d, clientUserId: v }))
                }
                onClientChange={(c: any) =>
                  setNewLedger((d) => ({
                    ...d,
                    clientName:
                      [c.firstName, c.lastName].filter(Boolean).join(" ") ||
                      c.businessName ||
                      c.email,
                  }))
                }
              />
            </div>
            <div>
              <Label>Mandate name (optional)</Label>
              <Input
                value={newLedger.mandateName}
                onChange={(e) =>
                  setNewLedger({ ...newLedger, mandateName: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Currency</Label>
                <Input
                  value={newLedger.currency}
                  onChange={(e) =>
                    setNewLedger({
                      ...newLedger,
                      currency: e.target.value.toUpperCase(),
                    })
                  }
                  maxLength={3}
                />
              </div>
              <div>
                <Label>Interest treatment</Label>
                <Select
                  value={newLedger.interestTreatment}
                  onValueChange={(v) =>
                    setNewLedger({
                      ...newLedger,
                      interestTreatment: v as InterestTreatment,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTEREST_TREATMENTS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !newLedger.bankAccountId ||
                !newLedger.clientUserId ||
                createLedgerMut.isPending
              }
              onClick={() => createLedgerMut.mutate()}
            >
              Create ledger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deposit */}
      <Dialog open={openDeposit} onOpenChange={setOpenDeposit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record deposit</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Trust ledger</Label>
              <Select
                value={deposit.ledgerId}
                onValueChange={(v) => setDeposit({ ...deposit, ledgerId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client ledger..." />
                </SelectTrigger>
                <SelectContent>
                  {ledgers.map((l) => (
                    <SelectItem key={l._id} value={l._id}>
                      {l.clientName} ({money(l.balance, l.currency)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={deposit.amount}
                  onChange={(e) =>
                    setDeposit({ ...deposit, amount: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={deposit.date}
                  onChange={(e) =>
                    setDeposit({ ...deposit, date: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Source / reference</Label>
              <Input
                value={deposit.reference}
                onChange={(e) =>
                  setDeposit({ ...deposit, reference: e.target.value })
                }
                placeholder="e.g. client receipt"
              />
            </div>
            <div>
              <Label>Prepared by</Label>
              <Input
                value={deposit.preparedBy}
                onChange={(e) =>
                  setDeposit({ ...deposit, preparedBy: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !deposit.ledgerId ||
                !deposit.amount ||
                !deposit.preparedBy ||
                depositMut.isPending
              }
              onClick={() => depositMut.mutate()}
            >
              <Banknote className="mr-2 h-4 w-4" /> Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drawdown request */}
      <Dialog open={openDrawdown} onOpenChange={setOpenDrawdown}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request drawdown</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Trust ledger</Label>
              <Select
                value={drawdown.ledgerId}
                onValueChange={(v) => setDrawdown({ ...drawdown, ledgerId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client ledger..." />
                </SelectTrigger>
                <SelectContent>
                  {ledgers.map((l) => (
                    <SelectItem key={l._id} value={l._id}>
                      {l.clientName} ({money(l.balance, l.currency)} available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={drawdown.amount}
                onChange={(e) =>
                  setDrawdown({ ...drawdown, amount: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>Prepared by</Label>
              <Input
                value={drawdown.preparedBy}
                onChange={(e) =>
                  setDrawdown({ ...drawdown, preparedBy: e.target.value })
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This will need authorisation from a different person before it
              takes effect — the balance won't move until then.
            </p>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !drawdown.ledgerId ||
                !drawdown.amount ||
                !drawdown.preparedBy ||
                drawdownMut.isPending
              }
              onClick={() => drawdownMut.mutate()}
            >
              Submit for authorisation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Authorise drawdown */}
      <Dialog
        open={!!authoriseTarget}
        onOpenChange={(o) => !o && setAuthoriseTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Authorise drawdown</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              Prepared by{" "}
              <span className="font-medium text-foreground">
                {authoriseTarget?.preparedBy}
              </span>{" "}
              — enter a different name to authorise.
            </p>
            <div>
              <Label>Authorised by</Label>
              <Input
                value={authorisedBy}
                onChange={(e) => setAuthorisedBy(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !authorisedBy ||
                authorisedBy === authoriseTarget?.preparedBy ||
                authoriseMut.isPending
              }
              onClick={() => authoriseMut.mutate()}
            >
              Authorise
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ledger detail */}
      <Sheet
        open={!!selectedId}
        onOpenChange={(o) => !o && setSelectedId(null)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selectedDetail && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedDetail.clientName}</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedDetail.mandateName || "No mandate linked"}
                </p>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">
                      Current balance
                    </p>
                    <p className="text-2xl font-bold">
                      {money(selectedDetail.balance, selectedDetail.currency)}
                    </p>
                  </CardContent>
                </Card>
                <h4 className="text-sm font-semibold">Audit trail</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedMovements.map((m) => (
                      <TableRow key={m._id}>
                        <TableCell className="text-sm">
                          {new Date(m.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm">{m.type}</TableCell>
                        <TableCell className="text-xs">{m.status}</TableCell>
                        <TableCell className="text-right text-sm">
                          {money(m.amount, selectedDetail.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!selectedMovements.length && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-6 text-center text-sm text-muted-foreground"
                        >
                          No movements yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
