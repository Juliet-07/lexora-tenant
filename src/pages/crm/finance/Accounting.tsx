import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { Plus, Download, CheckCircle2, Lock, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchAccountingOverview,
  fetchLedgerAccounts,
  createLedgerAccount,
  seedDefaultAccounts,
  fetchJournals,
  createJournal,
  postJournal,
  rejectJournal,
  fetchGeneralLedger,
  exportGeneralLedgerToCsv,
  fetchTrialBalance,
  fetchPeriodClose,
  completePeriodStep,
  lockPeriod,
  overridePeriodLock,
  PERIOD_CLOSE_STEP_LABELS,
  fetchBankAccounts,
  fetchCitProvision,
  fetchAssets,
  type AccountType,
  type JournalType,
  type JournalLine,
  type GlSource,
} from "@/lib/crm/finance-api";

const money = (n: number, c = "USD") =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: c,
    maximumFractionDigits: 0,
  });

const currentPeriod = () => new Date().toISOString().slice(0, 7);

const ACCOUNT_TYPES: AccountType[] = [
  "Asset",
  "Liability",
  "Equity",
  "Revenue",
  "Expense",
];
const JOURNAL_TYPES: JournalType[] = [
  "Accrual",
  "Depreciation",
  "Prepayment",
  "Tax",
  "Correction",
];
const GL_SOURCES: GlSource[] = [
  "Sales",
  "Purchases",
  "Banking",
  "Tax",
  "Manual",
  "Trust",
  "Fund",
];

export default function Accounting() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const { data: overview } = useQuery({
    queryKey: ["accountingOverview"],
    queryFn: fetchAccountingOverview,
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ["ledgerAccounts"],
    queryFn: fetchLedgerAccounts,
  });
  const { data: journals = [] } = useQuery({
    queryKey: ["journals"],
    queryFn: fetchJournals,
  });
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankAccounts"],
    queryFn: fetchBankAccounts,
  });
  const { data: cit } = useQuery({
    queryKey: ["citProvision"],
    queryFn: fetchCitProvision,
  });
  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: fetchAssets,
  });

  const [period, setPeriod] = useState(currentPeriod());
  const { data: trialBalance } = useQuery({
    queryKey: ["trialBalance"],
    queryFn: () => fetchTrialBalance(),
  });
  const { data: periodClose } = useQuery({
    queryKey: ["periodClose", period],
    queryFn: () => fetchPeriodClose(period),
  });

  // ── Export GL — real, client-side export of the full ledger,
  // not scoped to whatever filter happens to be active in the GL
  // tab, since this button lives in the page header as a global
  // action. Fetches fresh (unfiltered) rather than reusing the
  // filtered glEntries state below. ─────────────────────────
  const exportGlMut = useMutation({
    mutationFn: () => fetchGeneralLedger(),
    onSuccess: (entries) => {
      if (!entries.length) {
        toast({
          title: "Nothing to export",
          description: "No GL entries posted yet.",
        });
        return;
      }
      exportGeneralLedgerToCsv(
        entries,
        `general-ledger-${new Date().toISOString().slice(0, 10)}.csv`,
      );
      toast({
        title: "Exported",
        description: `${entries.length} GL entries downloaded.`,
      });
    },
    onError: onErr("Failed to export"),
  });

  // ── Overview figures ───────────────────────────────────────
  const cashBalance = bankAccounts
    .filter((a) => a.type === "Office")
    .reduce((s, a) => s + a.balance, 0);
  const assetsNbv = assets.reduce((s, a) => s + a.nbv, 0);
  const unpostedJournalsCount = journals.filter(
    (j) => j.status === "Unposted",
  ).length;

  // ── Chart of accounts ─────────────────────────────────────
  const [newAccountOpen, setNewAccountOpen] = useState(false);
  const [accountDraft, setAccountDraft] = useState({
    code: "",
    name: "",
    type: "Asset" as AccountType,
    subGroup: "",
  });
  const createAccountMut = useMutation({
    mutationFn: () => createLedgerAccount(accountDraft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ledgerAccounts"] });
      setNewAccountOpen(false);
      setAccountDraft({ code: "", name: "", type: "Asset", subGroup: "" });
      toast({ title: "Account added" });
    },
    onError: onErr("Failed to add account"),
  });
  const seedMut = useMutation({
    mutationFn: seedDefaultAccounts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ledgerAccounts"] });
      toast({ title: "Default chart of accounts created" });
    },
    onError: onErr("Failed to seed accounts"),
  });

  const groupedAccounts = ACCOUNT_TYPES.map((type) => {
    const rows = accounts.filter((a) => a.type === type);
    const bySubGroup = new Map<string, typeof rows>();
    rows.forEach((a) => {
      const key = a.subGroup || "Other";
      bySubGroup.set(key, [...(bySubGroup.get(key) ?? []), a]);
    });
    return {
      type,
      total: rows.reduce((s, a) => s + a.balance, 0),
      count: rows.length,
      groups: Array.from(bySubGroup.entries()),
    };
  });

  // ── Journals ───────────────────────────────────────────────
  const [journalFilter, setJournalFilter] = useState<
    "All" | "Unposted" | "Posted" | "Reversed"
  >("All");
  const [newJournalOpen, setNewJournalOpen] = useState(false);
  const [journalDraft, setJournalDraft] = useState({
    title: "",
    date: new Date().toISOString().slice(0, 10),
    type: "Accrual" as JournalType,
    narration: "",
    preparedBy: "",
  });
  const [journalLines, setJournalLines] = useState<JournalLine[]>([
    { accountCode: "", accountName: "", debit: 0, credit: 0 },
    { accountCode: "", accountName: "", debit: 0, credit: 0 },
  ]);
  const journalTotalDebit = journalLines.reduce(
    (s, l) => s + (Number(l.debit) || 0),
    0,
  );
  const journalTotalCredit = journalLines.reduce(
    (s, l) => s + (Number(l.credit) || 0),
    0,
  );
  const journalBalanced =
    Math.abs(journalTotalDebit - journalTotalCredit) < 0.01 &&
    journalTotalDebit > 0;

  const createJournalMut = useMutation({
    mutationFn: () =>
      createJournal({
        ...journalDraft,
        lines: journalLines.filter((l) => l.accountCode),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journals"] });
      setNewJournalOpen(false);
      setJournalDraft({
        title: "",
        date: new Date().toISOString().slice(0, 10),
        type: "Accrual",
        narration: "",
        preparedBy: "",
      });
      setJournalLines([
        { accountCode: "", accountName: "", debit: 0, credit: 0 },
        { accountCode: "", accountName: "", debit: 0, credit: 0 },
      ]);
      toast({ title: "Journal raised" });
    },
    onError: onErr("Failed to raise journal"),
  });
  const postMut = useMutation({
    mutationFn: (id: string) => postJournal(id, "You"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journals"] });
      queryClient.invalidateQueries({ queryKey: ["ledgerAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["trialBalance"] });
      queryClient.invalidateQueries({ queryKey: ["generalLedger"] });
      toast({ title: "Posted to the general ledger" });
    },
    onError: onErr("Failed to post"),
  });
  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectJournal(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["journals"] }),
  });
  const filteredJournals = journals.filter(
    (j) => journalFilter === "All" || j.status === journalFilter,
  );

  // ── General ledger ─────────────────────────────────────────
  const [glSource, setGlSource] = useState<GlSource | "All">("All");
  const [glSearch, setGlSearch] = useState("");
  const { data: glEntries = [] } = useQuery({
    queryKey: ["generalLedger", glSource, glSearch],
    queryFn: () =>
      fetchGeneralLedger({
        source: glSource === "All" ? undefined : glSource,
        search: glSearch || undefined,
      }),
  });

  const exportGlTabMut = useMutation({
    mutationFn: async () => glEntries,
    onSuccess: (entries) => {
      if (!entries.length) {
        toast({
          title: "Nothing to export",
          description: "No entries in the current view.",
        });
        return;
      }
      exportGeneralLedgerToCsv(
        entries,
        `general-ledger-${new Date().toISOString().slice(0, 10)}.csv`,
      );
      toast({
        title: "Exported",
        description: `${entries.length} GL entries downloaded.`,
      });
    },
  });

  // ── Period-end close ───────────────────────────────────────
  const completeStepMut = useMutation({
    mutationFn: (key: string) => completePeriodStep(period, key, "You"),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["periodClose", period] }),
    onError: onErr("Failed to complete step"),
  });
  const lockMut = useMutation({
    mutationFn: () => lockPeriod(period, "You"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodClose", period] });
      toast({ title: "Period locked" });
    },
    onError: onErr("Cannot lock period"),
  });
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const overrideMut = useMutation({
    mutationFn: () => overridePeriodLock(period, "You", overrideReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodClose", period] });
      setOverrideOpen(false);
      setOverrideReason("");
      toast({ title: "Override logged" });
    },
    onError: onErr("Failed to log override"),
  });
  const completedSteps =
    periodClose?.steps.filter((s) => s.completedBy).length ?? 0;
  const totalSteps = periodClose?.steps.length ?? 10;
  const progressPct = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Accounting</h1>
          <p className="text-sm text-muted-foreground">
            General ledger, chart of accounts, journal entries, trial balance,
            and period-end close
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={exportGlMut.isPending}
            onClick={() => exportGlMut.mutate()}
          >
            <Download className="mr-2 h-4 w-4" /> Export GL
          </Button>
          <Button size="sm" onClick={() => setNewJournalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New journal entry
          </Button>
        </div>
      </div>

      {/* Overview row 1 - cross-module summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          {
            label: "Sales",
            value: overview ? money(overview.salesRevenueYtd) : "—",
            hint: "Revenue posted YTD",
            color: "text-success",
          },
          {
            label: "Billing",
            value: overview ? money(overview.outstandingReceivables) : "—",
            hint: "Outstanding receivables",
          },
          {
            label: "Purchases",
            value: overview ? money(overview.purchasesExpensesYtd) : "—",
            hint: "Expenses posted YTD",
            color: "text-destructive",
          },
          { label: "Banking", value: money(cashBalance), hint: "Cash balance" },
          {
            label: "Tax",
            value: cit ? money(cit.citAtRate) : "—",
            hint: "CIT provision",
            color: "text-warning",
          },
          { label: "Trust", value: "—", hint: "Not yet available" },
          { label: "Fund", value: "—", hint: "Not yet available" },
          { label: "Assets", value: money(assetsNbv), hint: "Net book value" },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className={`text-lg font-bold ${c.color ?? ""}`}>{c.value}</p>
              <p className="text-[11px] text-muted-foreground">{c.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overview row 2 - real operational status */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total accounts</p>
            <p className="text-lg font-bold">{accounts.length}</p>
            <p className="text-[11px] text-muted-foreground">
              {ACCOUNT_TYPES.length} categories
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">GL entries</p>
            <p className="text-lg font-bold">{glEntries.length}</p>
            <p className="text-[11px] text-muted-foreground">
              across all sources
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Unposted journals</p>
            <p className="text-lg font-bold text-warning">
              {unpostedJournalsCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Trial balance</p>
            <p
              className={`text-lg font-bold ${trialBalance?.balanced ? "text-success" : "text-destructive"}`}
            >
              {trialBalance?.balanced
                ? "Balanced"
                : trialBalance
                  ? "Unbalanced"
                  : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Dr = Cr {trialBalance?.balanced ? "confirmed" : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Period status</p>
            <p className="text-lg font-bold">
              {periodClose?.locked ? "Locked" : "Open"}
            </p>
            <p className="text-[11px] text-muted-foreground">{period}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="coa">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="coa">Chart of accounts</TabsTrigger>
          <TabsTrigger value="gl">General ledger</TabsTrigger>
          <TabsTrigger value="journals">
            Journal entries
            {unpostedJournalsCount > 0 && (
              <Badge className="ml-1.5 h-4 px-1 text-[10px]">
                {unpostedJournalsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tb">Trial balance</TabsTrigger>
          <TabsTrigger value="close">Period-end close</TabsTrigger>
        </TabsList>

        {/* Chart of accounts */}
        <TabsContent value="coa" className="mt-4 space-y-3">
          <div className="flex justify-end gap-2">
            {!accounts.length && (
              <Button
                size="sm"
                variant="outline"
                disabled={seedMut.isPending}
                onClick={() => seedMut.mutate()}
              >
                <Sparkles className="mr-2 h-4 w-4" /> Seed default accounts
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setNewAccountOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Add account
            </Button>
          </div>
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedAccounts.map(
                    (g) =>
                      g.count > 0 && (
                        <>
                          <TableRow key={g.type} className="bg-muted/40">
                            <TableCell
                              colSpan={3}
                              className="text-sm font-semibold"
                            >
                              {g.type}
                            </TableCell>
                            <TableCell className="text-right text-sm font-semibold">
                              {money(g.total)}
                            </TableCell>
                          </TableRow>
                          {g.groups.map(([subGroup, rows]) => (
                            <>
                              {subGroup !== "Other" && (
                                <TableRow key={g.type + subGroup}>
                                  <TableCell
                                    colSpan={3}
                                    className="pl-6 text-xs font-medium text-muted-foreground"
                                  >
                                    {subGroup}
                                  </TableCell>
                                  <TableCell className="text-right text-xs text-muted-foreground">
                                    {money(
                                      rows.reduce((s, a) => s + a.balance, 0),
                                    )}
                                  </TableCell>
                                </TableRow>
                              )}
                              {rows.map((a) => (
                                <TableRow key={a._id}>
                                  <TableCell className="pl-10 text-sm text-primary">
                                    {a.code}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {a.name}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px]"
                                    >
                                      {a.type}
                                    </Badge>
                                  </TableCell>
                                  <TableCell
                                    className={`text-right text-sm ${a.balance < 0 ? "text-destructive" : ""}`}
                                  >
                                    {a.balance < 0
                                      ? `(${money(Math.abs(a.balance))})`
                                      : money(a.balance)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </>
                          ))}
                        </>
                      ),
                  )}
                  {!accounts.length && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No accounts yet — seed a starting chart of accounts.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General ledger */}
        <TabsContent value="gl" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={glSource === "All" ? "default" : "outline"}
              onClick={() => setGlSource("All")}
            >
              All ({glEntries.length})
            </Button>
            {GL_SOURCES.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={glSource === s ? "default" : "outline"}
                onClick={() => setGlSource(s)}
              >
                {s}
              </Button>
            ))}
            <Input
              placeholder="Search by account, reference, description..."
              className="w-72"
              value={glSearch}
              onChange={(e) => setGlSearch(e.target.value)}
            />
            <Button
              size="sm"
              variant="outline"
              className="ml-auto"
              disabled={exportGlTabMut.isPending}
              onClick={() => exportGlTabMut.mutate()}
            >
              <Download className="mr-2 h-4 w-4" /> Export view
            </Button>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Ref</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {glEntries.map((e) => (
                    <TableRow key={e._id}>
                      <TableCell className="text-sm">
                        {e.date?.slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-sm text-primary">
                        {e.ref}
                      </TableCell>
                      <TableCell className="text-sm">{e.description}</TableCell>
                      <TableCell className="text-sm">
                        {e.accountCode} {e.accountName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {e.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {e.debit ? money(e.debit) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {e.credit ? money(e.credit) : "—"}
                      </TableCell>
                      <TableCell
                        className={`text-right text-sm font-medium ${e.balance < 0 ? "text-destructive" : ""}`}
                      >
                        {e.balance < 0
                          ? `(${money(Math.abs(e.balance))})`
                          : money(e.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!glEntries.length && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No GL entries yet — they post automatically as real
                        invoices, bills, payments and journals happen.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <p className="p-3 text-xs text-muted-foreground">
                Each row shows the originating sub-ledger. Click a reference to
                drill through to the source document.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Journal entries */}
        <TabsContent value="journals" className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["All", "Unposted", "Posted", "Reversed"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={journalFilter === f ? "default" : "outline"}
                onClick={() => setJournalFilter(f)}
              >
                {f} (
                {f === "All"
                  ? journals.length
                  : journals.filter((j) => j.status === f).length}
                )
              </Button>
            ))}
          </div>
          <div className="space-y-3">
            {filteredJournals.map((j) => (
              <Card
                key={j._id}
                className={
                  j.status === "Unposted"
                    ? "border-warning/40 bg-warning/5"
                    : ""
                }
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-semibold text-primary">
                        {j.ref}
                      </span>
                      <span className="ml-2 text-sm font-medium">
                        {j.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {j.type}
                      </Badge>
                      <Badge
                        className={`text-[10px] ${j.status === "Posted" ? "bg-success/10 text-success" : j.status === "Reversed" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}
                      >
                        {j.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {j.status === "Posted"
                          ? `Posted ${new Date(j.postedAt!).toLocaleString()} · by ${j.postedBy}`
                          : `${j.isAutoGenerated ? "Auto-generated" : "Created"} ${new Date(j.createdAt).toLocaleDateString()}${j.isAutoGenerated ? "" : ` · by ${j.preparedBy}`}`}
                      </span>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-8">Account</TableHead>
                        <TableHead className="h-8 text-right">Debit</TableHead>
                        <TableHead className="h-8 text-right">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {j.lines.map((l, i) => (
                        <TableRow key={i}>
                          <TableCell className="py-1.5 text-sm">
                            {l.accountCode} {l.accountName}
                          </TableCell>
                          <TableCell className="py-1.5 text-right text-sm">
                            {l.debit ? money(l.debit) : "—"}
                          </TableCell>
                          <TableCell className="py-1.5 text-right text-sm">
                            {l.credit ? money(l.credit) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <p className="text-xs text-muted-foreground">
                    Narration: {j.narration}
                  </p>
                  {j.status === "Unposted" && (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => rejectMut.mutate(j._id)}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={postMut.isPending}
                        onClick={() => postMut.mutate(j._id)}
                      >
                        Post
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {!filteredJournals.length && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No journals match this filter.
              </p>
            )}
          </div>
        </TabsContent>

        {/* Trial balance */}
        <TabsContent value="tb" className="mt-4 space-y-3">
          {trialBalance && (
            <>
              <div
                className={`rounded-lg border p-3 text-sm ${trialBalance.balanced ? "border-success/40 bg-success/5 text-success" : "border-destructive/40 bg-destructive/5 text-destructive"}`}
              >
                {trialBalance.balanced
                  ? `Trial balance is in equilibrium. Total debits (${money(trialBalance.totalDebit)}) equal total credits (${money(trialBalance.totalCredit)}). The books are balanced.`
                  : `Trial balance is NOT balanced. Debits ${money(trialBalance.totalDebit)} vs credits ${money(trialBalance.totalCredit)}.`}
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    As at {trialBalance.asOf}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ACCOUNT_TYPES.map((type) => {
                        const rows = trialBalance.rows.filter(
                          (r) => r.type === type,
                        );
                        if (!rows.length) return null;
                        return (
                          <>
                            <TableRow key={type} className="bg-muted/40">
                              <TableCell
                                colSpan={5}
                                className="text-sm font-semibold"
                              >
                                {type}
                              </TableCell>
                            </TableRow>
                            {rows.map((r) => (
                              <TableRow key={r.code}>
                                <TableCell className="text-sm text-primary">
                                  {r.code}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {r.name}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px]"
                                  >
                                    {r.type}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                  {r.debit ? money(r.debit) : "—"}
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                  {r.credit ? money(r.credit) : "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </>
                        );
                      })}
                      <TableRow className="border-t-2 font-semibold">
                        <TableCell colSpan={3}>TOTAL</TableCell>
                        <TableCell className="text-right">
                          {money(trialBalance.totalDebit)}
                        </TableCell>
                        <TableCell className="text-right">
                          {money(trialBalance.totalCredit)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Period-end close */}
        <TabsContent value="close" className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <Input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-44"
            />
            {periodClose?.locked && (
              <Badge className="bg-success/10 text-success">
                <Lock className="mr-1 h-3 w-3" /> Locked
              </Badge>
            )}
          </div>
          {periodClose && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {period} close checklist
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Progress value={progressPct} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground">
                    {completedSteps} of {totalSteps} · {progressPct}%
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {periodClose.steps.map((s, i) => (
                  <div
                    key={s.key}
                    className={`flex items-center justify-between rounded-lg border p-3 ${s.completedBy ? "bg-success/5 border-success/30" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${s.completedBy ? "bg-success text-white" : "bg-muted text-muted-foreground"}`}
                      >
                        {s.completedBy ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          i + 1
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-medium">
                          {PERIOD_CLOSE_STEP_LABELS[s.key]}
                        </p>
                        {s.completedBy && (
                          <p className="text-xs text-muted-foreground">
                            By {s.completedBy} ·{" "}
                            {new Date(s.completedAt!).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    {!s.completedBy && s.key !== "lock" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={completeStepMut.isPending}
                        onClick={() => completeStepMut.mutate(s.key)}
                      >
                        Mark complete
                      </Button>
                    )}
                    {s.key === "lock" && !periodClose.locked && (
                      <Button
                        size="sm"
                        disabled={lockMut.isPending}
                        onClick={() => lockMut.mutate()}
                      >
                        <Lock className="mr-2 h-3.5 w-3.5" /> Lock period
                      </Button>
                    )}
                  </div>
                ))}
                {periodClose.locked && (
                  <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-xs">
                    <p className="font-medium text-warning">
                      Period lock is irreversible. Entries can only be posted
                      via a documented override.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => setOverrideOpen(true)}
                    >
                      Log an override
                    </Button>
                    {periodClose.overrideLog.map((l, i) => (
                      <p key={i} className="mt-2 text-muted-foreground">
                        {l}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* New account */}
      <Dialog open={newAccountOpen} onOpenChange={setNewAccountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add account</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Code</Label>
                <Input
                  value={accountDraft.code}
                  onChange={(e) =>
                    setAccountDraft({ ...accountDraft, code: e.target.value })
                  }
                  placeholder="e.g. 1150"
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={accountDraft.type}
                  onValueChange={(v) =>
                    setAccountDraft({ ...accountDraft, type: v as AccountType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={accountDraft.name}
                onChange={(e) =>
                  setAccountDraft({ ...accountDraft, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Sub-group (optional)</Label>
              <Input
                value={accountDraft.subGroup}
                onChange={(e) =>
                  setAccountDraft({ ...accountDraft, subGroup: e.target.value })
                }
                placeholder="e.g. Current assets"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !accountDraft.code ||
                !accountDraft.name ||
                createAccountMut.isPending
              }
              onClick={() => createAccountMut.mutate()}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New journal entry */}
      <Dialog open={newJournalOpen} onOpenChange={setNewJournalOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New journal entry</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Title</Label>
              <Input
                value={journalDraft.title}
                onChange={(e) =>
                  setJournalDraft({ ...journalDraft, title: e.target.value })
                }
                placeholder="e.g. Aug salary accrual"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={journalDraft.date}
                  onChange={(e) =>
                    setJournalDraft({ ...journalDraft, date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={journalDraft.type}
                  onValueChange={(v) =>
                    setJournalDraft({ ...journalDraft, type: v as JournalType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOURNAL_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Lines</Label>
              {journalLines.map((l, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_1.2fr_90px_90px] gap-2"
                >
                  <Input
                    placeholder="Code"
                    value={l.accountCode}
                    onChange={(e) => {
                      const acc = accounts.find(
                        (a) => a.code === e.target.value,
                      );
                      setJournalLines((p) =>
                        p.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                accountCode: e.target.value,
                                accountName: acc?.name ?? x.accountName,
                              }
                            : x,
                        ),
                      );
                    }}
                  />
                  <Input
                    placeholder="Account name"
                    value={l.accountName}
                    onChange={(e) =>
                      setJournalLines((p) =>
                        p.map((x, j) =>
                          j === i ? { ...x, accountName: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Debit"
                    value={l.debit || ""}
                    onChange={(e) =>
                      setJournalLines((p) =>
                        p.map((x, j) =>
                          j === i
                            ? { ...x, debit: Number(e.target.value), credit: 0 }
                            : x,
                        ),
                      )
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Credit"
                    value={l.credit || ""}
                    onChange={(e) =>
                      setJournalLines((p) =>
                        p.map((x, j) =>
                          j === i
                            ? { ...x, credit: Number(e.target.value), debit: 0 }
                            : x,
                        ),
                      )
                    }
                  />
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setJournalLines((p) => [
                    ...p,
                    { accountCode: "", accountName: "", debit: 0, credit: 0 },
                  ])
                }
              >
                Add line
              </Button>
              <p
                className={`text-xs ${journalBalanced ? "text-success" : "text-destructive"}`}
              >
                Debit {money(journalTotalDebit)} · Credit{" "}
                {money(journalTotalCredit)}{" "}
                {journalBalanced
                  ? "— balanced"
                  : "— must balance before saving"}
              </p>
            </div>
            <div>
              <Label>Narration</Label>
              <Input
                value={journalDraft.narration}
                onChange={(e) =>
                  setJournalDraft({
                    ...journalDraft,
                    narration: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Prepared by</Label>
              <Input
                value={journalDraft.preparedBy}
                onChange={(e) =>
                  setJournalDraft({
                    ...journalDraft,
                    preparedBy: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !journalBalanced ||
                !journalDraft.title ||
                !journalDraft.preparedBy ||
                createJournalMut.isPending
              }
              onClick={() => createJournalMut.mutate()}
            >
              Raise journal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Period lock override */}
      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log a documented override</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Label>Reason</Label>
            <Input
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Why this locked period needs a further posting"
            />
          </div>
          <DialogFooter>
            <Button
              disabled={!overrideReason || overrideMut.isPending}
              onClick={() => overrideMut.mutate()}
            >
              Log override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
