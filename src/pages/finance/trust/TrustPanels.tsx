import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Mail,
  Play,
  RefreshCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useToast } from "@/hooks/use-toast";
import {
  creditAllTrustInterest,
  creditTrustInterest,
  downloadTrustReport,
  emailTrustStatements,
  fetchBankAccounts,
  fetchTrustAudit,
  fetchTrustIntegrityCheck,
  fetchTrustInterest,
  markTrustLedgerReconciled,
  runTrustInterestAccrual,
  runTrustReconciliation,
  type TrustIntegrityCheck,
  type TrustLedger,
  type TrustReportKind,
} from "@/lib/crm/finance-api";
import { LedgerStatusBadge, fmtDate, fmtDateTime, money } from "./trustShared";

const useErr = () => {
  const { toast } = useToast();
  return (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });
};

// ── Reconciliation ───────────────────────────────────────────

export function ReconciliationPanel({ ledgers }: { ledgers: TrustLedger[] }) {
  const { toast } = useToast();
  const onErr = useErr();
  const qc = useQueryClient();
  const { data: accounts = [] } = useQuery({
    queryKey: ["bankAccounts"],
    queryFn: fetchBankAccounts,
  });
  const trust = accounts.filter((a) => a.type === "Trust");
  const [accountId, setAccountId] = useState("");
  const selected = accountId || trust[0]?._id || "";
  const [ranAt, setRanAt] = useState<Record<string, string>>({});

  const { data: check } = useQuery({
    queryKey: ["trustIntegrity", selected],
    queryFn: () => fetchTrustIntegrityCheck(selected),
    enabled: !!selected,
  });
  const account = trust.find((a) => a._id === selected);
  const cur = account?.currency;

  const run = useMutation({
    mutationFn: () => runTrustReconciliation(selected),
    onSuccess: (res: TrustIntegrityCheck[]) => {
      setRanAt((p) => ({ ...p, [selected]: new Date().toISOString() }));
      qc.invalidateQueries({ queryKey: ["trustIntegrity"] });
      qc.invalidateQueries({ queryKey: ["trustAudit"] });
      const r = res[0];
      toast(
        r?.matched
          ? {
              title: "Reconciliation complete",
              description: "Bank and ledgers agree.",
            }
          : {
              title: "Variance found",
              description: `Bank and ledgers differ by ${money(r?.variance ?? 0, cur)}. The result is in the audit trail.`,
              variant: "destructive",
            },
      );
    },
    onError: onErr("Reconciliation failed"),
  });
  const signOff = useMutation({
    mutationFn: (id: string) => markTrustLedgerReconciled(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trustLedgers"] });
      qc.invalidateQueries({ queryKey: ["trustIntegrity"] });
      qc.invalidateQueries({ queryKey: ["trustAudit"] });
      toast({ title: "Ledger signed off" });
    },
    onError: onErr("Failed to sign off"),
  });

  if (!trust.length)
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          There is no trust bank account yet. Add one of type "Trust" in
          Banking, then create client ledgers against it.
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">
              Three-way reconciliation
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Bank balance against the sum of every client ledger — the
              no-commingling check
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selected} onValueChange={setAccountId}>
              <SelectTrigger className="w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {trust.map((a) => (
                  <SelectItem key={a._id} value={a._id}>
                    {a.name}, {a.bank} ({a.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => run.mutate()} disabled={run.isPending}>
              <Play className="mr-2 h-4 w-4" />
              {run.isPending ? "Running…" : "Run reconciliation"}
            </Button>
          </div>
        </CardHeader>
        {check && (
          <CardContent className="space-y-4">
            <div
              className={`flex items-start gap-3 rounded-md border p-4 ${
                check.matched
                  ? "border-success/30 bg-success/5"
                  : "border-destructive/30 bg-destructive/5"
              }`}
            >
              {check.matched ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
              ) : (
                <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
              )}
              <div>
                <p className="font-medium">
                  {check.matched
                    ? "No commingling detected"
                    : "Variance detected"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {check.matched
                    ? `The bank balance of ${money(check.bankBalance, cur)} matches the sum of ${check.ledgerCount} client ledger(s).`
                    : `The bank shows ${money(check.bankBalance, cur)} but the ${check.ledgerCount} client ledger(s) add up to ${money(check.ledgerTotal, cur)}. Find and clear the difference before any further drawdowns.`}
                  {ranAt[selected] &&
                    ` Last run ${fmtDateTime(ranAt[selected])}.`}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Bank balance</p>
                  <p className="text-lg font-bold">
                    {money(check.bankBalance, cur)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">
                    Sum of client ledgers
                  </p>
                  <p className="text-lg font-bold">
                    {money(check.ledgerTotal, cur)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {check.ledgerCount} ledger(s)
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Variance</p>
                  <p
                    className={`text-lg font-bold ${check.matched ? "text-success" : "text-destructive"}`}
                  >
                    {money(check.variance, cur)}
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        )}
      </Card>

      {check && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Per-client ledger reconciliation
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client / mandate</TableHead>
                  <TableHead className="text-right">Ledger balance</TableHead>
                  <TableHead className="text-right">
                    Deposits in transit
                  </TableHead>
                  <TableHead className="text-right">
                    Drawdowns clearing
                  </TableHead>
                  <TableHead>Last sign-off</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {check.ledgers.map((r) => (
                  <TableRow key={r.ledgerId}>
                    <TableCell>
                      <p className="font-medium">{r.clientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.mandateName || "General retainer"}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      {money(r.balance, r.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {money(r.depositsInTransit, r.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {money(r.drawdownsClearing, r.currency)}
                    </TableCell>
                    <TableCell>{fmtDate(r.lastReconciledAt)}</TableCell>
                    <TableCell>
                      <LedgerStatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!check.matched || signOff.isPending}
                        title={
                          check.matched
                            ? undefined
                            : "Clear the variance before signing ledgers off"
                        }
                        onClick={() => signOff.mutate(r.ledgerId)}
                      >
                        Sign off
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!check.ledgers.length && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      No client ledgers on this account yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <span className="hidden">{ledgers.length}</span>
    </div>
  );
}

// ── Interest performance ─────────────────────────────────────

export function InterestPanel() {
  const { toast } = useToast();
  const onErr = useErr();
  const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["trustInterest"],
    queryFn: fetchTrustInterest,
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["trustInterest"] });
    qc.invalidateQueries({ queryKey: ["trustLedgers"] });
    qc.invalidateQueries({ queryKey: ["trustMovements"] });
    qc.invalidateQueries({ queryKey: ["trustAudit"] });
  };
  const accrue = useMutation({
    mutationFn: runTrustInterestAccrual,
    onSuccess: () => {
      refresh();
      toast({
        title: "Accrual recalculated",
        description: "Figures are up to date.",
      });
    },
    onError: onErr("Accrual failed"),
  });
  const creditAll = useMutation({
    mutationFn: creditAllTrustInterest,
    onSuccess: (r: any) => {
      refresh();
      toast({
        title: "Interest credited",
        description: `${Array.isArray(r) ? r.length : 0} ledger(s) credited.`,
      });
    },
    onError: onErr("Credit failed"),
  });
  const creditOne = useMutation({
    mutationFn: (id: string) => creditTrustInterest(id),
    onSuccess: () => {
      refresh();
      toast({ title: "Interest credited" });
    },
    onError: onErr("Credit failed"),
  });

  const currencies = Object.entries(data?.byCurrency ?? {});
  const rows = data?.rows ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Interest performance</h2>
          <p className="text-xs text-muted-foreground">
            Accrued daily from each ledger's live balance and its agreed rate.
            Client interest is credited to the client; firm-retained interest is
            recognised as firm income and never touches the client balance.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => accrue.mutate()}
            disabled={accrue.isPending}
          >
            <RefreshCcw className="mr-2 h-4 w-4" /> Run daily accrual
          </Button>
          <Button
            variant="outline"
            onClick={() => creditAll.mutate()}
            disabled={creditAll.isPending}
          >
            Credit all due
          </Button>
          <Button
            variant="outline"
            onClick={() => downloadTrustReport("interest", "xlsx")}
          >
            <Download className="mr-2 h-4 w-4" /> Export interest report
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {currencies.map(([cur, t]) => (
          <Fragment key={cur}>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">
                  Accrued this month ({cur})
                </p>
                <p className="mt-1 text-lg font-bold">
                  {money(t.mtdAccrued, cur)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">
                  Earned, not yet credited ({cur})
                </p>
                <p className="mt-1 text-lg font-bold text-warning">
                  {money(t.uncredited, cur)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">
                  Credited to clients this year ({cur})
                </p>
                <p className="mt-1 text-lg font-bold">
                  {money(t.ytdCredited, cur)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">
                  Retained by the firm this year ({cur})
                </p>
                <p className="mt-1 text-lg font-bold">
                  {money(t.ytdFirmRetained, cur)}
                </p>
              </CardContent>
            </Card>
          </Fragment>
        ))}
        {!currencies.length && !isLoading && (
          <p className="col-span-full text-sm text-muted-foreground">
            No ledgers yet — interest is tracked once a ledger exists.
          </p>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-6" />
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Avg daily balance</TableHead>
                <TableHead className="text-right">Rate (p.a.)</TableHead>
                <TableHead>Treatment</TableHead>
                <TableHead className="text-right">MTD accrued</TableHead>
                <TableHead className="text-right">Not yet credited</TableHead>
                <TableHead className="text-right">YTD credited</TableHead>
                <TableHead className="text-right">Projected / year</TableHead>
                <TableHead>Next credit</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <Fragment key={r.ledgerId}>
                  <TableRow
                    className="cursor-pointer"
                    onClick={() =>
                      setOpen(open === r.ledgerId ? null : r.ledgerId)
                    }
                  >
                    <TableCell>
                      {open === r.ledgerId ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{r.clientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.mandateName || "General retainer"}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      {money(r.avgDailyBalance, r.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.earns ? `${r.rate}%` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.treatment}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {money(r.mtdAccrued, r.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {money(r.uncreditedAccrued, r.currency)}
                      {r.uncreditedDays > 0 && (
                        <span className="block text-[10px] text-muted-foreground">
                          {r.uncreditedDays} day(s)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.treatment === "Client retained" ||
                      r.treatment === "Pooled"
                        ? money(r.ytdCredited + r.ytdFirmRetained, r.currency)
                        : money(r.ytdFirmRetained || r.ytdCredited, r.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {money(r.projectedAnnual, r.currency)}
                    </TableCell>
                    <TableCell>{fmtDate(r.nextCredit)}</TableCell>
                    <TableCell className="text-right">
                      {r.earns && r.uncreditedAccrued > 0.005 && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={creditOne.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            creditOne.mutate(r.ledgerId);
                          }}
                        >
                          Credit now
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {open === r.ledgerId && (
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell />
                      <TableCell colSpan={10}>
                        <div className="grid gap-4 py-2 sm:grid-cols-[1fr_2fr]">
                          <dl className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">
                                Credited through
                              </dt>
                              <dd>{fmtDate(r.creditedThrough)}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">
                                Last credit
                              </dt>
                              <dd>{fmtDate(r.lastCreditAt)}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">
                                Lifetime credited to client
                              </dt>
                              <dd>{money(r.lifetimeCredited, r.currency)}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">
                                Retained by firm (YTD)
                              </dt>
                              <dd>{money(r.ytdFirmRetained, r.currency)}</dd>
                            </div>
                          </dl>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-muted-foreground">
                                <th className="py-1">Month</th>
                                <th className="py-1 text-right">Accrued</th>
                                <th className="py-1 text-right">Credited</th>
                                <th className="w-1/3 py-1" />
                              </tr>
                            </thead>
                            <tbody>
                              {r.history.map((h) => {
                                const max = Math.max(
                                  ...r.history.map((x) =>
                                    Math.max(x.accrued, x.credited),
                                  ),
                                  1,
                                );
                                return (
                                  <tr key={h.month} className="border-t">
                                    <td className="py-1">{h.month}</td>
                                    <td className="py-1 text-right">
                                      {money(h.accrued, r.currency)}
                                    </td>
                                    <td className="py-1 text-right">
                                      {money(h.credited, r.currency)}
                                    </td>
                                    <td className="py-1 pl-3">
                                      <div className="h-2 rounded bg-muted">
                                        <div
                                          className="h-2 rounded bg-primary"
                                          style={{
                                            width: `${(h.accrued / max) * 100}%`,
                                          }}
                                        />
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
              {!rows.length && !isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No trust ledgers to show.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Reports ──────────────────────────────────────────────────

type ReportDef = {
  kind: TrustReportKind;
  title: string;
  description: string;
  formats: ("pdf" | "xlsx" | "csv")[];
};
const REPORT_GROUPS: { title: string; reports: ReportDef[] }[] = [
  {
    title: "Regulatory authority returns",
    reports: [
      {
        kind: "regulatory-return",
        title: "Regulatory trust account return",
        description:
          "Quarterly return for inspection: per-client balances, source-of-funds declarations, the commingling check and interest treatment.",
        formats: ["pdf", "xlsx"],
      },
      {
        kind: "source-of-funds",
        title: "Source of funds summary",
        description:
          "AML/CFT report of the declared source and purpose of every deposit, by client, with whether evidence is attached.",
        formats: ["pdf"],
      },
    ],
  },
  {
    title: "Client statements",
    reports: [
      {
        kind: "client-statements",
        title: "Per-client trust statement",
        description:
          "Every movement, interest credited, current balance and the invoice or mandate each drawdown was made against.",
        formats: ["pdf"],
      },
      {
        kind: "balances",
        title: "Per-client balance report",
        description:
          "The real current balance of every client ledger, as shown in the register.",
        formats: ["csv", "xlsx", "pdf"],
      },
    ],
  },
  {
    title: "Management & audit reports",
    reports: [
      {
        kind: "movements",
        title: "Movement report",
        description:
          "Every deposit, drawdown and interest movement with its source document, approval status and preparer / authoriser.",
        formats: ["csv", "xlsx", "pdf"],
      },
      {
        kind: "interest",
        title: "Interest accrual report",
        description:
          "Accrued, credited and projected interest per client, with the rate and treatment applied.",
        formats: ["xlsx", "pdf"],
      },
      {
        kind: "reconciliation-history",
        title: "Reconciliation history",
        description:
          "Every reconciliation run, with the variance found and who signed off.",
        formats: ["pdf"],
      },
      {
        kind: "drawdown-audit",
        title: "Drawdown approval audit",
        description:
          "Every drawdown: who prepared and authorised it, the document it was made against, timestamps, rejection reasons and segregation-of-duties.",
        formats: ["pdf"],
      },
    ],
  },
];

export function ReportsPanel({ ledgers }: { ledgers: TrustLedger[] }) {
  const { toast } = useToast();
  const onErr = useErr();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [ledgerId, setLedgerId] = useState("all");
  const [busy, setBusy] = useState("");

  const dl = async (kind: TrustReportKind, format: "pdf" | "xlsx" | "csv") => {
    setBusy(`${kind}-${format}`);
    try {
      await downloadTrustReport(kind, format, {
        from: from || undefined,
        to: to || undefined,
        ledgerId: ledgerId === "all" ? undefined : ledgerId,
      });
    } catch (err: any) {
      onErr("Could not generate the report")(err);
    } finally {
      setBusy("");
    }
  };
  const email = useMutation({
    mutationFn: () =>
      emailTrustStatements({
        ledgerIds: ledgerId === "all" ? undefined : [ledgerId],
        from: from || undefined,
        to: to || undefined,
      }),
    onSuccess: (r) =>
      toast({
        title: `Statements emailed to ${r.sent} client(s)`,
        description: r.failed?.length
          ? `Not sent: ${r.failed.join(", ")}`
          : undefined,
        variant: r.failed?.length ? "destructive" : undefined,
      }),
    onError: onErr("Could not email statements"),
  });

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Client</p>
            <Select value={ledgerId} onValueChange={setLedgerId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clients</SelectItem>
                {ledgers.map((l) => (
                  <SelectItem key={l._id} value={l._id}>
                    {l.clientName} ({l.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">From</p>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">To</p>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Applies to every report below. Leave the dates blank for all time.
          </p>
        </CardContent>
      </Card>

      {REPORT_GROUPS.map((g) => (
        <div key={g.title} className="space-y-3">
          <h3 className="text-sm font-semibold">{g.title}</h3>
          <div className="grid gap-3 lg:grid-cols-2">
            {g.reports.map((r) => (
              <Card key={r.kind}>
                <CardContent className="space-y-3 p-4">
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {r.formats.map((fmt) => (
                      <Button
                        key={fmt}
                        size="sm"
                        variant="outline"
                        disabled={busy === `${r.kind}-${fmt}`}
                        onClick={() => dl(r.kind, fmt)}
                      >
                        {fmt === "pdf" ? (
                          <FileText className="mr-2 h-4 w-4" />
                        ) : (
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                        )}
                        {busy === `${r.kind}-${fmt}`
                          ? "Preparing…"
                          : fmt === "pdf"
                            ? "Generate PDF"
                            : fmt === "xlsx"
                              ? "Export XLSX"
                              : "Export CSV"}
                      </Button>
                    ))}
                    {r.kind === "client-statements" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={email.isPending}
                        onClick={() => email.mutate()}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        {email.isPending ? "Sending…" : "Email to clients"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
      <p className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
        Formal regulatory filings follow the prescribed format for your
        jurisdiction's authority. These exports give your accountant or
        compliance team the underlying data.
      </p>
    </div>
  );
}

// ── Audit trail ──────────────────────────────────────────────

const AUDIT_ACTIONS = [
  "Ledger created",
  "Ledger updated",
  "Deposit recorded",
  "Drawdown drafted",
  "Drawdown prepared",
  "Drawdown first approval",
  "Drawdown approved",
  "Drawdown rejected",
  "Reconciliation",
  "Interest accrual",
  "Interest credited",
  "Freeze applied",
  "Freeze lifted",
  "Replenishment requested",
  "Document attached",
  "Report generated",
];

export function AuditPanel({ ledgers }: { ledgers: TrustLedger[] }) {
  const onErr = useErr();
  const [q, setQ] = useState("");
  const [action, setAction] = useState("all");
  const [ledgerId, setLedgerId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState("");
  const filters = useMemo(
    () => ({
      q: q.trim() || undefined,
      action: action === "all" ? undefined : action,
      ledgerId: ledgerId === "all" ? undefined : ledgerId,
      from: from || undefined,
      to: to || undefined,
    }),
    [q, action, ledgerId, from, to],
  );
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["trustAudit", filters],
    queryFn: () => fetchTrustAudit(filters),
  });

  const dl = async (format: "pdf" | "xlsx") => {
    setBusy(format);
    try {
      await downloadTrustReport("audit-trail", format, filters);
    } catch (err: any) {
      onErr("Could not download the audit trail")(err);
    } finally {
      setBusy("");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">
            Trust accounting audit trail
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Append-only log of everything done to trust money — who, when, from
            where. Entries cannot be edited or removed.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!!busy}
            onClick={() => dl("xlsx")}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export XLSX
          </Button>
          <Button size="sm" disabled={!!busy} onClick={() => dl("pdf")}>
            <FileText className="mr-2 h-4 w-4" />
            {busy === "pdf" ? "Preparing…" : "Download PDF"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <Input
            className="w-[220px]"
            placeholder="Search actions, clients, users..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {AUDIT_ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ledgerId} onValueChange={setLedgerId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {ledgers.map((l) => (
                <SelectItem key={l._id} value={l._id}>
                  {l.clientName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            className="w-[150px]"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span className="pb-2 text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            className="w-[150px]"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e) => (
              <TableRow key={e._id}>
                <TableCell className="whitespace-nowrap text-xs">
                  {fmtDateTime(e.createdAt)}
                  {e.ip && (
                    <span className="block text-[10px] text-muted-foreground">
                      {e.ip}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-sm">{e.userName}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{e.action}</Badge>
                </TableCell>
                <TableCell className="text-sm">{e.clientName}</TableCell>
                <TableCell className="max-w-[420px] text-xs text-muted-foreground">
                  {e.details}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {e.amount != null && e.currency
                    ? money(e.amount, e.currency)
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
            {!entries.length && !isLoading && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No audit entries match.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
