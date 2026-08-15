import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Landmark, Plus, ArrowRightLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchBankAccounts,
  createBankAccount,
  fetchBankTransactions,
  createBankTransaction,
  matchBankTransaction,
  fetchBankRules,
  createBankRule,
  fetchTransfers,
  createTransfer,
  fetchReconciliation,
  setStatementBalance,
  signOffReconciliation,
  fetchCashForecast,
  type BankAccountType,
  type TxLinkType,
} from "@/lib/crm/finance-api";
import { fetchInvoices } from "@/lib/crm/finance-api";
import { fetchBills } from "@/lib/crm/finance-api";

const money = (n: number, c = "USD") =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: c,
    maximumFractionDigits: 0,
  });

const currentPeriod = () => new Date().toISOString().slice(0, 7);

export default function Banking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: accounts = [] } = useQuery({
    queryKey: ["bankAccounts"],
    queryFn: fetchBankAccounts,
  });
  const { data: txs = [] } = useQuery({
    queryKey: ["bankTransactions"],
    queryFn: () => fetchBankTransactions(),
  });
  const { data: rules = [] } = useQuery({
    queryKey: ["bankRules"],
    queryFn: fetchBankRules,
  });
  const { data: transfers = [] } = useQuery({
    queryKey: ["transfers"],
    queryFn: fetchTransfers,
  });
  const { data: forecast = [] } = useQuery({
    queryKey: ["cashForecast"],
    queryFn: fetchCashForecast,
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => fetchInvoices(),
  });
  const { data: bills = [] } = useQuery({
    queryKey: ["bills"],
    queryFn: fetchBills,
  });

  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  // ── Accounts ───────────────────────────────────────────────
  const [newAccountOpen, setNewAccountOpen] = useState(false);
  const [accountDraft, setAccountDraft] = useState({
    name: "",
    bank: "",
    last4: "",
    currency: "USD",
    openingBalance: 0,
    type: "Office" as BankAccountType,
  });
  const createAccountMut = useMutation({
    mutationFn: () => createBankAccount(accountDraft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      setNewAccountOpen(false);
      setAccountDraft({
        name: "",
        bank: "",
        last4: "",
        currency: "USD",
        openingBalance: 0,
        type: "Office",
      });
      toast({ title: "Account added" });
    },
    onError: onErr("Failed to add account"),
  });

  // ── Bank feed ──────────────────────────────────────────────
  const [newTxOpen, setNewTxOpen] = useState(false);
  const [txDraft, setTxDraft] = useState({
    accountId: "",
    date: new Date().toISOString().slice(0, 10),
    description: "",
    amount: 0,
  });
  const [matchTarget, setMatchTarget] = useState<string | null>(null);
  const [matchType, setMatchType] = useState<TxLinkType>("Invoice");
  const [matchId, setMatchId] = useState("");

  const invalidateTx = () => {
    queryClient.invalidateQueries({ queryKey: ["bankTransactions"] });
    queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
  };
  const createTxMut = useMutation({
    mutationFn: () => createBankTransaction(txDraft),
    onSuccess: () => {
      invalidateTx();
      setNewTxOpen(false);
      setTxDraft({
        accountId: "",
        date: new Date().toISOString().slice(0, 10),
        description: "",
        amount: 0,
      });
      toast({ title: "Transaction recorded" });
    },
    onError: onErr("Failed to record transaction"),
  });
  const matchMut = useMutation({
    mutationFn: () => {
      const label =
        matchType === "Invoice"
          ? (invoices.find((i) => i._id === matchId)?.ref ?? matchId)
          : (bills.find((b) => b._id === matchId)?.ref ?? matchId);
      return matchBankTransaction(matchTarget!, matchType, matchId, label);
    },
    onSuccess: () => {
      invalidateTx();
      setMatchTarget(null);
      setMatchId("");
      toast({ title: "Matched" });
    },
    onError: onErr("Failed to match"),
  });

  // ── Rules ──────────────────────────────────────────────────
  const [newRuleOpen, setNewRuleOpen] = useState(false);
  const [ruleDraft, setRuleDraft] = useState({
    matchText: "",
    account: "",
    auto: true,
  });
  const createRuleMut = useMutation({
    mutationFn: () => createBankRule(ruleDraft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bankRules"] });
      setNewRuleOpen(false);
      setRuleDraft({ matchText: "", account: "", auto: true });
      toast({ title: "Rule created" });
    },
    onError: onErr("Failed to create rule"),
  });

  // ── Transfers ──────────────────────────────────────────────
  const [newTransferOpen, setNewTransferOpen] = useState(false);
  const [transferDraft, setTransferDraft] = useState({
    fromAccountId: "",
    toAccountId: "",
    amount: 0,
    reference: "",
    authoriser: "",
  });
  const createTransferMut = useMutation({
    mutationFn: () => createTransfer(transferDraft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      setNewTransferOpen(false);
      setTransferDraft({
        fromAccountId: "",
        toAccountId: "",
        amount: 0,
        reference: "",
        authoriser: "",
      });
      toast({ title: "Transfer recorded" });
    },
    onError: onErr("Failed to record transfer"),
  });

  // ── Reconciliation ─────────────────────────────────────────
  const [reconAccountId, setReconAccountId] = useState("");
  const [reconPeriod, setReconPeriod] = useState(currentPeriod());
  const { data: recon } = useQuery({
    queryKey: ["reconciliation", reconAccountId, reconPeriod],
    queryFn: () => fetchReconciliation(reconAccountId, reconPeriod),
    enabled: !!reconAccountId,
  });
  const [statementBalanceInput, setStatementBalanceInput] = useState<
    number | ""
  >("");
  const [preparedBy, setPreparedBy] = useState("");
  const [signOffBy, setSignOffBy] = useState("");

  const invalidateRecon = () =>
    queryClient.invalidateQueries({
      queryKey: ["reconciliation", reconAccountId, reconPeriod],
    });
  const setBalanceMut = useMutation({
    mutationFn: () =>
      setStatementBalance(
        reconAccountId,
        reconPeriod,
        Number(statementBalanceInput),
        preparedBy,
      ),
    onSuccess: () => {
      invalidateRecon();
      toast({ title: "Statement balance set" });
    },
    onError: onErr("Failed to set balance"),
  });
  const signOffMut = useMutation({
    mutationFn: () =>
      signOffReconciliation(reconAccountId, reconPeriod, signOffBy),
    onSuccess: () => {
      invalidateRecon();
      setSignOffBy("");
      toast({ title: "Reconciliation signed off" });
    },
    onError: onErr("Cannot sign off"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Banking</h1>
          <p className="text-sm text-muted-foreground">
            Accounts, bank feeds, reconciliation, rules, cash forecast and
            transfers
          </p>
        </div>
        <Button size="sm" onClick={() => setNewAccountOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add account
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {accounts.map((a) => (
          <Card key={a._id}>
            <CardContent className="p-5 space-y-1">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">{a.name}</p>
              </div>
              <p className="text-lg font-bold">
                {money(a.balance, a.currency)}
              </p>
              <p className="text-xs text-muted-foreground">
                {a.bank} · •••• {a.last4}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="outline" className="text-[10px]">
                  {a.type}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {!accounts.length && (
          <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
            No bank accounts yet.
          </p>
        )}
      </div>

      <Tabs defaultValue="feed">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="feed">Bank feed</TabsTrigger>
          <TabsTrigger value="recon">Reconciliation</TabsTrigger>
          <TabsTrigger value="rules">Bank rules</TabsTrigger>
          <TabsTrigger value="forecast">Cash forecast</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
        </TabsList>

        {/* Bank feed */}
        <TabsContent value="feed" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setNewTxOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Record transaction
            </Button>
          </div>
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Suggested account</TableHead>
                    <TableHead>Matched to</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txs.map((t) => (
                    <TableRow key={t._id}>
                      <TableCell className="text-sm">
                        {t.date?.slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-sm">{t.description}</TableCell>
                      <TableCell
                        className={`text-sm font-semibold ${t.amount < 0 ? "text-destructive" : "text-success"}`}
                      >
                        {money(t.amount)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {t.suggestedAccount || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {t.linkLabel || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-xs ${t.status === "Matched" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}
                        >
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {t.status === "Unmatched" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setMatchTarget(t._id);
                              setMatchType("Invoice");
                              setMatchId("");
                            }}
                          >
                            Match manually
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!txs.length && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No transactions recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reconciliation */}
        <TabsContent value="recon" className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            <Select value={reconAccountId} onValueChange={setReconAccountId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select account..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a._id} value={a._id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="month"
              className="w-40"
              value={reconPeriod}
              onChange={(e) => setReconPeriod(e.target.value)}
            />
          </div>
          {!reconAccountId ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Select an account to reconcile.
            </p>
          ) : (
            recon && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Monthly reconciliation — {reconPeriod}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    ["System balance", money(recon.systemBalance)],
                    ["Bank statement balance", money(recon.statementBalance)],
                    ["Unreconciled items", money(recon.unreconciled)],
                    ["Variance", money(recon.variance)],
                  ].map(([l, v]) => (
                    <div
                      key={l}
                      className="flex items-center justify-between text-sm border-b pb-2"
                    >
                      <span className="text-muted-foreground">{l}</span>
                      <span className="font-medium">{v}</span>
                    </div>
                  ))}
                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      type="number"
                      placeholder="Statement balance"
                      value={statementBalanceInput}
                      onChange={(e) =>
                        setStatementBalanceInput(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                    />
                    <Input
                      placeholder="Prepared by"
                      value={preparedBy}
                      onChange={(e) => setPreparedBy(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      disabled={
                        statementBalanceInput === "" ||
                        !preparedBy ||
                        setBalanceMut.isPending
                      }
                      onClick={() => setBalanceMut.mutate()}
                    >
                      Set balance
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Zero variance required before sign-off. Sign-off must be by
                    a person other than the preparer
                    {recon.preparedBy ? ` (${recon.preparedBy})` : ""}.
                  </p>
                  <div className="flex gap-3">
                    <Input
                      placeholder="Signed off by"
                      value={signOffBy}
                      onChange={(e) => setSignOffBy(e.target.value)}
                      className="max-w-xs"
                    />
                    <Button
                      disabled={!signOffBy || signOffMut.isPending}
                      onClick={() => signOffMut.mutate()}
                    >
                      Sign off reconciliation
                    </Button>
                  </div>
                  {recon.signedOffBy && (
                    <p className="text-xs text-success">
                      Signed off by {recon.signedOffBy} on{" "}
                      {new Date(recon.signedOffAt!).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          )}
        </TabsContent>

        {/* Rules */}
        <TabsContent value="rules" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setNewRuleOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> New rule
            </Button>
          </div>
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Match text</TableHead>
                    <TableHead>Posts to</TableHead>
                    <TableHead>Auto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell className="text-sm">
                        Description contains "{r.matchText}"
                      </TableCell>
                      <TableCell className="text-sm">{r.account}</TableCell>
                      <TableCell className="text-sm">
                        {r.auto ? "Yes" : "No"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!rules.length && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No rules yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash forecast */}
        <TabsContent value="forecast" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {forecast.map((f) => (
              <Card key={f.horizon}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{f.horizon}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Inflows (AR due)
                    </span>
                    <span className="text-success">{money(f.inflow)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Outflows (AP + payroll)
                    </span>
                    <span className="text-destructive">{money(f.outflow)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-semibold">
                    <span>Projected closing</span>
                    <span>{money(f.closing)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Computed live from real outstanding invoices (Sales), real
            outstanding bills (Purchases), real processed payroll runs (HR), and
            real current Office account balances — not a separately maintained
            projection.
          </p>
        </TabsContent>

        {/* Transfers */}
        <TabsContent value="transfers" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setNewTransferOpen(true)}
            >
              <ArrowRightLeft className="mr-2 h-4 w-4" /> New transfer
            </Button>
          </div>
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Authoriser</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((t) => (
                    <TableRow key={t._id}>
                      <TableCell className="font-medium text-sm">
                        {t.ref}
                      </TableCell>
                      <TableCell className="text-sm">
                        {t.date?.slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {t.fromAccountName}
                      </TableCell>
                      <TableCell className="text-sm">
                        {t.toAccountName}
                      </TableCell>
                      <TableCell className="text-sm font-semibold">
                        {money(t.amount)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {t.reference || "—"}
                      </TableCell>
                      <TableCell className="text-sm">{t.authoriser}</TableCell>
                    </TableRow>
                  ))}
                  {!transfers.length && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No transfers yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New account */}
      <Dialog open={newAccountOpen} onOpenChange={setNewAccountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add bank account</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Account name</Label>
              <Input
                value={accountDraft.name}
                onChange={(e) =>
                  setAccountDraft({ ...accountDraft, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bank</Label>
                <Input
                  value={accountDraft.bank}
                  onChange={(e) =>
                    setAccountDraft({ ...accountDraft, bank: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Last 4 digits</Label>
                <Input
                  maxLength={4}
                  value={accountDraft.last4}
                  onChange={(e) =>
                    setAccountDraft({ ...accountDraft, last4: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Currency</Label>
                <Select
                  value={accountDraft.currency}
                  onValueChange={(v) =>
                    setAccountDraft({ ...accountDraft, currency: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["USD", "EUR", "RWF", "GBP"].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={accountDraft.type}
                  onValueChange={(v) =>
                    setAccountDraft({
                      ...accountDraft,
                      type: v as BankAccountType,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Office", "Trust", "Special purpose"].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Opening balance</Label>
              <Input
                type="number"
                value={accountDraft.openingBalance}
                onChange={(e) =>
                  setAccountDraft({
                    ...accountDraft,
                    openingBalance: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !accountDraft.name ||
                !accountDraft.bank ||
                createAccountMut.isPending
              }
              onClick={() => createAccountMut.mutate()}
            >
              Add account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New transaction */}
      <Dialog open={newTxOpen} onOpenChange={setNewTxOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record transaction</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Account</Label>
              <Select
                value={txDraft.accountId}
                onValueChange={(v) => setTxDraft({ ...txDraft, accountId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a._id} value={a._id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={txDraft.description}
                onChange={(e) =>
                  setTxDraft({ ...txDraft, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={txDraft.date}
                  onChange={(e) =>
                    setTxDraft({ ...txDraft, date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Amount (negative for outflow)</Label>
                <Input
                  type="number"
                  value={txDraft.amount}
                  onChange={(e) =>
                    setTxDraft({ ...txDraft, amount: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !txDraft.accountId ||
                !txDraft.description ||
                createTxMut.isPending
              }
              onClick={() => createTxMut.mutate()}
            >
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Match transaction */}
      <Dialog
        open={!!matchTarget}
        onOpenChange={(o) => !o && setMatchTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Match transaction</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Match to</Label>
              <Select
                value={matchType}
                onValueChange={(v) => {
                  setMatchType(v as TxLinkType);
                  setMatchId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Invoice">Invoice payment</SelectItem>
                  <SelectItem value="Bill">Bill</SelectItem>
                  <SelectItem value="Manual">Other / manual note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {matchType === "Invoice" && (
              <Select value={matchId} onValueChange={setMatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select invoice..." />
                </SelectTrigger>
                <SelectContent>
                  {invoices.map((i) => (
                    <SelectItem key={i._id} value={i._id}>
                      {i.ref} — {i.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {matchType === "Bill" && (
              <Select value={matchId} onValueChange={setMatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bill..." />
                </SelectTrigger>
                <SelectContent>
                  {bills.map((b) => (
                    <SelectItem key={b._id} value={b._id}>
                      {b.ref} — {b.vendorName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {matchType === "Manual" && (
              <Input
                placeholder="Note"
                value={matchId}
                onChange={(e) => setMatchId(e.target.value)}
              />
            )}
          </div>
          <DialogFooter>
            <Button
              disabled={!matchId || matchMut.isPending}
              onClick={() => matchMut.mutate()}
            >
              Match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New rule */}
      <Dialog open={newRuleOpen} onOpenChange={setNewRuleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New bank rule</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Description contains</Label>
              <Input
                value={ruleDraft.matchText}
                onChange={(e) =>
                  setRuleDraft({ ...ruleDraft, matchText: e.target.value })
                }
                placeholder="e.g. KIGALI BUSINESS PARK"
              />
            </div>
            <div>
              <Label>Posts to ledger account</Label>
              <Input
                value={ruleDraft.account}
                onChange={(e) =>
                  setRuleDraft({ ...ruleDraft, account: e.target.value })
                }
                placeholder="e.g. 6100 · Rent"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !ruleDraft.matchText ||
                !ruleDraft.account ||
                createRuleMut.isPending
              }
              onClick={() => createRuleMut.mutate()}
            >
              Create rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New transfer */}
      <Dialog open={newTransferOpen} onOpenChange={setNewTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New transfer</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>From</Label>
                <Select
                  value={transferDraft.fromAccountId}
                  onValueChange={(v) =>
                    setTransferDraft({ ...transferDraft, fromAccountId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>To</Label>
                <Select
                  value={transferDraft.toAccountId}
                  onValueChange={(v) =>
                    setTransferDraft({ ...transferDraft, toAccountId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter((a) => a._id !== transferDraft.fromAccountId)
                      .map((a) => (
                        <SelectItem key={a._id} value={a._id}>
                          {a.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={transferDraft.amount}
                onChange={(e) =>
                  setTransferDraft({
                    ...transferDraft,
                    amount: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label>Reference</Label>
              <Input
                value={transferDraft.reference}
                onChange={(e) =>
                  setTransferDraft({
                    ...transferDraft,
                    reference: e.target.value,
                  })
                }
                placeholder="e.g. Drawdown DRW-018"
              />
            </div>
            <div>
              <Label>Authoriser</Label>
              <Input
                value={transferDraft.authoriser}
                onChange={(e) =>
                  setTransferDraft({
                    ...transferDraft,
                    authoriser: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !transferDraft.fromAccountId ||
                !transferDraft.toAccountId ||
                !transferDraft.amount ||
                !transferDraft.authoriser ||
                createTransferMut.isPending
              }
              onClick={() => createTransferMut.mutate()}
            >
              Record transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
