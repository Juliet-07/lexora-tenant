import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  downloadFundStatementPdf,
  fetchFundStatement,
  generateStatements,
  type CapitalCommitment,
  type FundStatement,
} from "@/lib/crm/finance-api";
import {
  SectionTitle,
  StatusPill,
  errMessage,
  fmtDate,
  money,
  periodLabel,
  periodOptions,
} from "./fundShared";

const x = (n: number) => `${(n ?? 0).toFixed(2)}x`;

const Stat = ({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) => (
  <div className="rounded-md border p-3">
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <p className="text-base font-semibold">{value}</p>
    {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
  </div>
);

const Line = ({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: string;
}) => (
  <div
    className={`flex items-center justify-between py-1.5 text-sm ${strong ? "border-t font-semibold" : ""}`}
  >
    <span>{label}</span>
    <span className="flex items-baseline gap-3">
      {muted && <span className="text-xs text-muted-foreground">{muted}</span>}
      <span>{value}</span>
    </span>
  </div>
);

// One LP's statement of how their investment is flowing: what they
// committed, what has been called and paid, what the account did in the
// period (opening → contributions → income → expenses → gains →
// distributions → closing), and the multiples.
function StatementView({
  s,
  showComparative,
}: {
  s: FundStatement;
  showComparative: boolean;
}) {
  const cur = s.fund.currency;
  const a = s.activity;
  const c = s.comparative;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          {s.lp.type} · {s.lp.closeLabel} close
        </span>
        <span>· Period {s.period.label}</span>
        <span>
          ({s.period.from ? fmtDate(s.period.from) : "inception"} –{" "}
          {fmtDate(s.period.to)})
        </span>
        {s.lp.hasSideLetter && <StatusPill label="Side letter" kind="blue" />}
        {s.lp.isGp && <StatusPill label="GP commitment" kind="grey" />}
        <span>· Fee rate {s.lp.mgmtFeeRate}%</span>
      </div>

      <div>
        <SectionTitle>Commitment position</SectionTitle>
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="Commitment" value={money(s.position.commitment, cur)} />
          <Stat
            label="Called"
            value={money(s.position.called, cur)}
            sub={`${s.position.pctCalled.toFixed(1)}% of commitment`}
          />
          <Stat
            label="Paid in"
            value={money(s.position.paid, cur)}
            sub={
              s.position.outstanding > 0.005
                ? `${money(s.position.outstanding, cur)} outstanding`
                : "Fully paid"
            }
          />
          <Stat label="Uncalled" value={money(s.position.uncalled, cur)} />
        </div>
      </div>

      <div>
        <SectionTitle>Capital account activity</SectionTitle>
        <div className="mt-1">
          {c && showComparative && (
            <div className="mb-1 flex justify-end text-[11px] text-muted-foreground">
              Prior period: {c.label}
            </div>
          )}
          <Line
            label="Opening balance"
            value={money(a.opening, cur)}
            muted={c && showComparative ? money(c.opening, cur) : undefined}
          />
          <Line
            label="+ Contributions"
            value={money(a.contributions, cur)}
            muted={
              c && showComparative ? money(c.contributions, cur) : undefined
            }
          />
          <Line
            label="+ Income allocated"
            value={money(a.income, cur)}
            muted={c && showComparative ? money(c.income, cur) : undefined}
          />
          <Line
            label="− Expenses & fees"
            value={money(a.expenses, cur)}
            muted={c && showComparative ? money(c.expenses, cur) : undefined}
          />
          <Line
            label="± Realised / unrealised gain"
            value={money(a.gainLoss, cur)}
            muted={c && showComparative ? money(c.gainLoss, cur) : undefined}
          />
          <Line
            label="− Distributions"
            value={money(a.distributions, cur)}
            muted={
              c && showComparative ? money(c.distributions, cur) : undefined
            }
          />
          {Math.abs(a.other) > 0.005 && (
            <Line
              label="± Other (default, equalisation)"
              value={money(a.other, cur)}
              muted={c && showComparative ? money(c.other, cur) : undefined}
            />
          )}
          <Line
            strong
            label="Closing balance"
            value={money(a.closing, cur)}
            muted={c && showComparative ? money(c.closing, cur) : undefined}
          />
        </div>
      </div>

      <div>
        <SectionTitle>Performance (since inception)</SectionTitle>
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-5">
          <Stat label="Paid-in" value={money(s.metrics.paidIn, cur)} />
          <Stat label="Distributed" value={money(s.metrics.distributed, cur)} />
          <Stat label="Net asset value" value={money(s.metrics.nav, cur)} />
          <Stat
            label="DPI"
            value={x(s.metrics.dpi)}
            sub="Distributed / paid-in"
          />
          <Stat
            label="TVPI"
            value={x(s.metrics.tvpi)}
            sub={`RVPI ${x(s.metrics.rvpi)}`}
          />
        </div>
      </div>

      <div>
        <SectionTitle>Capital calls</SectionTitle>
        {s.calls.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            No calls made to this LP yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Call</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Called</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.calls.map((r) => (
                <TableRow key={r.callId}>
                  <TableCell>
                    <div className="font-medium">{r.ref}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.purpose}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{fmtDate(r.dueOn)}</TableCell>
                  <TableCell className="text-right">
                    {money(r.amount, cur)}
                  </TableCell>
                  <TableCell className="text-right">
                    {money(r.funded, cur)}
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      label={r.overdue ? "Overdue" : r.status}
                      kind={
                        r.overdue || r.status === "Defaulted"
                          ? "red"
                          : r.status === "Funded"
                            ? "green"
                            : "amber"
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div>
        <SectionTitle>Ledger for the period</SectionTitle>
        {s.ledger.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            No movements in this period.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Entry</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.ledger.map((l, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs">{fmtDate(l.date)}</TableCell>
                  <TableCell>
                    <div className="text-sm">{l.type}</div>
                    <div className="text-xs text-muted-foreground">
                      {l.description}
                    </div>
                  </TableCell>
                  <TableCell
                    className={`text-right ${l.amount < 0 ? "text-red-700" : ""}`}
                  >
                    {money(l.amount, cur)}
                  </TableCell>
                  <TableCell className="text-right">
                    {money(l.balance, cur)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

export function LpStatementSheet({
  open,
  onOpenChange,
  fundId,
  commitment,
  onGenerate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  fundId: string;
  commitment: { commitmentId: string; lpName: string } | null;
  onGenerate: (commitmentId: string) => void;
}) {
  const { toast } = useToast();
  const periods = periodOptions();
  const [period, setPeriod] = useState(periods[0]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [comparative, setComparative] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setPeriod(periods[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, commitment?.commitmentId]);

  const customReady = period !== "custom" || (!!from && !!to && from <= to);
  const q = {
    period: period === "custom" ? undefined : period,
    from: period === "custom" ? from : undefined,
    to: period === "custom" ? to : undefined,
    comparative,
  };
  const { data, isLoading, error } = useQuery({
    queryKey: [
      "fundStatement",
      fundId,
      commitment?.commitmentId,
      period,
      from,
      to,
      comparative,
    ],
    queryFn: () => fetchFundStatement(fundId, commitment!.commitmentId, q),
    enabled: open && !!commitment && customReady,
  });

  const pdf = async () => {
    if (!commitment) return;
    setBusy(true);
    try {
      await downloadFundStatementPdf(fundId, commitment.commitmentId, q);
    } catch (e) {
      toast({
        title: "Could not download the statement",
        description: errMessage(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>
            Capital account statement — {commitment?.lpName}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs">Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p} value={p}>
                      {periodLabel(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {period === "custom" && (
              <>
                <div>
                  <Label className="text-xs">From</Label>
                  <Input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">To</Label>
                  <Input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>
              </>
            )}
            <label className="flex items-center gap-2 pb-2 text-sm">
              <Switch checked={comparative} onCheckedChange={setComparative} />
              Compare to prior period
            </label>
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy || !customReady}
                onClick={pdf}
              >
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                PDF
              </Button>
              <Button
                size="sm"
                disabled={!commitment}
                onClick={() =>
                  commitment && onGenerate(commitment.commitmentId)
                }
              >
                <Send className="mr-2 h-4 w-4" /> Send / generate…
              </Button>
            </div>
          </div>

          {!customReady && (
            <p className="text-xs text-muted-foreground">
              Choose a start and end date (start on or before end).
            </p>
          )}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Compiling statement…
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive">
              {errMessage(error, "Could not build the statement")}
            </p>
          )}
          {data && <StatementView s={data} showComparative={comparative} />}
          <p className="text-[11px] text-muted-foreground">
            Compiled from the fund ledger: contributions from capital calls,
            distributions from the waterfall, fees from Fees & Carry and gains
            from NAV & Valuation.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Generate statements for every LP, or a chosen few, for any period —
// as PDF and/or Excel — and download, email or publish them to the
// LP portal.
export function GenerateStatementsDialog({
  open,
  onOpenChange,
  fundId,
  commitments,
  preselect,
  invalidate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  fundId: string;
  commitments: CapitalCommitment[];
  preselect?: string | null;
  invalidate: () => void;
}) {
  const { toast } = useToast();
  const periods = periodOptions();
  const [scope, setScope] = useState<"all" | "pick">("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [period, setPeriod] = useState(periods[0]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [format, setFormat] = useState<"pdf" | "xlsx" | "both">("pdf");
  const [delivery, setDelivery] = useState<
    "download" | "email" | "portal" | "email+portal"
  >("download");
  const [opts, setOpts] = useState({
    metrics: true,
    contributions: true,
    fees: true,
    gains: true,
    comparative: false,
  });

  useEffect(() => {
    if (!open) return;
    setPeriod(periods[0]);
    setFormat("pdf");
    setDelivery("download");
    if (preselect) {
      setScope("pick");
      setPicked(new Set([preselect]));
    } else {
      setScope("all");
      setPicked(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preselect]);

  const ids = scope === "all" ? [] : [...picked];
  const targets =
    scope === "all"
      ? commitments
      : commitments.filter((c) => picked.has(c._id));
  const noEmail = targets.filter((c) => !c.lpEmail);
  const customBad = period === "custom" && (!from || !to || from > to);

  const run = useMutation({
    mutationFn: () =>
      generateStatements(fundId, {
        commitmentIds: ids.length ? ids : undefined,
        period: period === "custom" ? undefined : period,
        from: period === "custom" ? from : undefined,
        to: period === "custom" ? to : undefined,
        format,
        delivery,
        ...opts,
      }),
    onSuccess: async (r) => {
      invalidate();
      const sent = r.deliveries.filter((d) => d.status === "Sent").length;
      const failed = r.deliveries.filter((d) => d.status !== "Sent");
      if (delivery === "download" || !r.deliveries.length) {
        // Hand the generated files to the browser.
        for (const f of r.files) {
          const a = document.createElement("a");
          a.href = f.url;
          a.download = f.name;
          a.target = "_blank";
          a.rel = "noopener";
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      }
      toast({
        title: `${targets.length} statement${targets.length === 1 ? "" : "s"} generated`,
        description: r.deliveries.length
          ? `${sent} delivered${failed.length ? `, ${failed.length} failed (${failed.map((d) => d.lpName).join(", ")})` : ""}.`
          : "Saved to the LP report library.",
        variant: failed.length ? "destructive" : "default",
      });
      onOpenChange(false);
    },
    onError: (e) =>
      toast({
        title: "Could not generate statements",
        description: errMessage(e),
        variant: "destructive",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate capital account statements</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Compiled from the fund ledger for the period you choose.
          </p>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Investors</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All LPs ({commitments.length})
                </SelectItem>
                <SelectItem value="pick">Choose LPs…</SelectItem>
              </SelectContent>
            </Select>
            {scope === "pick" && (
              <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                {commitments.map((c) => (
                  <label
                    key={c._id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={picked.has(c._id)}
                      onCheckedChange={(v) =>
                        setPicked((p) => {
                          const n = new Set(p);
                          v ? n.add(c._id) : n.delete(c._id);
                          return n;
                        })
                      }
                    />
                    {c.lpName}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p} value={p}>
                      {periodLabel(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {period === "custom" && (
              <>
                <div>
                  <Label>From</Label>
                  <Input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label>To</Label>
                  <Input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="xlsx">Excel</SelectItem>
                  <SelectItem value="both">PDF + Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Delivery</Label>
              <Select
                value={delivery}
                onValueChange={(v) => setDelivery(v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="download">
                    Generate only (download)
                  </SelectItem>
                  <SelectItem value="email">Generate & email to LPs</SelectItem>
                  <SelectItem value="portal">
                    Generate & upload to LP portal
                  </SelectItem>
                  <SelectItem value="email+portal">
                    Email + LP portal
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/email/.test(delivery) && noEmail.length > 0 && (
            <p className="text-xs text-amber-700">
              No email on file for {noEmail.map((c) => c.lpName).join(", ")} —
              they will be skipped for email.
            </p>
          )}

          <div className="space-y-2">
            <Label>Include</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["metrics", "Performance metrics (DPI / RVPI / TVPI)"],
                  ["contributions", "Contribution & call detail"],
                  ["fees", "Fee & expense breakdown"],
                  ["gains", "Realised / unrealised gains"],
                  ["comparative", "Prior-period comparative"],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={opts[k]}
                    onCheckedChange={(v) =>
                      setOpts((o) => ({ ...o, [k]: !!v }))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={
              run.isPending ||
              customBad ||
              !targets.length ||
              !commitments.length
            }
            onClick={() => run.mutate()}
          >
            {run.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : format === "xlsx" ? (
              <FileSpreadsheet className="mr-2 h-4 w-4" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Generate {targets.length} statement{targets.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
