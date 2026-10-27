import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { fetchLedgerAccounts } from "@/lib/crm/finance-api";
import {
  copyBudgetFrom,
  fetchBudget,
  saveBudget,
  type ActualBudget,
  type StatementRow,
} from "@/lib/crm/report-api";
import {
  Pill,
  StatementTable,
  TabHeading,
  useFmt,
  useReport,
  varClass,
  type StatementColumn,
} from "./shared";

const KEY_TYPES = new Set(["t", "sub", "hl", "gt"]);

// Status thresholds from the PO prototype: within 5% on track, within
// 15% watch, anything wider is a variance.
function status(actual: number, budget: number) {
  if (!budget) return null;
  const v = Math.abs((actual - budget) / budget);
  if (v < 0.05) return <Pill tone="green">On track</Pill>;
  if (v < 0.15) return <Pill tone="amber">Watch</Pill>;
  return <Pill tone="red">Variance</Pill>;
}

export default function BudgetTab() {
  const { pack, view } = useReport();
  const { dash, signed, pct, compact } = useFmt();
  const [manage, setManage] = useState(false);
  const qc = useQueryClient();
  const b = pack.budget;
  const m = pack.meta;
  const year = m.periodKey.slice(0, 4);

  // Cost lines are favourable when under budget; income lines when over.
  const rows = b.rows.filter((r) => r.type !== "s");
  // A row is a cost row when it sits under a cost heading (cost of services,
  // operating expenses, tax) — spending under budget is the favourable side.
  const costRows = useMemo(() => {
    const set = new Set<StatementRow<ActualBudget>>();
    let inCost = false;
    for (const r of rows) {
      if (r.type === "h") inCost = /cost of services|operating expenses|tax/i.test(r.name ?? "");
      else if ((r.type === "row" || r.type === "t") && inCost) set.add(r);
    }
    return set;
  }, [rows]);

  const columns: StatementColumn<StatementRow<ActualBudget>>[] = [
    { key: "budget", label: `Budget (${m.currency})`, align: "right", render: (r) => (r.vals ? dash(r.vals.budget) : "") },
    { key: "actual", label: `Actual (${m.currency})`, align: "right", render: (r) => (r.vals ? dash(r.vals.actual) : "") },
    {
      key: "var",
      label: "Variance",
      align: "right",
      render: (r) =>
        r.vals ? (
          <span className={varClass(r.vals.actual - r.vals.budget, costRows.has(r))}>
            {signed(r.vals.actual - r.vals.budget)}
          </span>
        ) : (
          ""
        ),
    },
    {
      key: "pct",
      label: "%",
      align: "right",
      render: (r) => (r.vals ? (r.vals.budget ? pct((r.vals.actual / r.vals.budget) * 100) : "-") : ""),
    },
    {
      key: "status",
      label: "Status",
      align: "center",
      render: (r) => (r.vals ? status(r.vals.actual, r.vals.budget) : ""),
    },
  ];

  const keyLines = rows.filter((r) => r.vals && KEY_TYPES.has(r.type) && (r.vals.budget || r.vals.actual));

  return (
    <div>
      <TabHeading
        title="Budget vs Actuals"
        sub={`Year to date — ${m.ytdLabel} · amounts in ${m.currency}`}
        right={
          <Button size="sm" variant="outline" onClick={() => setManage(true)}>
            <Settings2 className="mr-2 h-4 w-4" /> Manage budget
          </Button>
        }
      />

      {!b.hasBudget && (
        <Card className="mb-4 border-warning/40 bg-warning/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <span>
              No budget has been entered for {year} yet, so there is nothing to compare actuals against. Enter a monthly
              budget per ledger account to turn this on.
            </span>
            <Button size="sm" onClick={() => setManage(true)}>
              Set up {year} budget
            </Button>
          </CardContent>
        </Card>
      )}

      {view === "chart" ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Budget vs actual (key lines)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {keyLines.map((r, i) => {
              const v = r.vals!;
              const max = Math.max(Math.abs(v.budget), Math.abs(v.actual), 1);
              return (
                <div key={i}>
                  <p className="mb-1 text-xs font-bold">{r.name}</p>
                  {(
                    [
                      ["Budget", v.budget, "#c4cad4"],
                      ["Actual", v.actual, "#5b4bff"],
                    ] as const
                  ).map(([lbl, val, col]) => (
                    <div key={lbl} className="mb-1 flex items-center gap-2 text-[10px]">
                      <span className="w-12 text-muted-foreground">{lbl}</span>
                      <div className="h-3.5 flex-1 overflow-hidden rounded bg-muted">
                        <div
                          className="flex h-full items-center justify-end px-1 text-[8px] font-semibold text-foreground"
                          style={{ width: `${val ? Math.max(3, (Math.abs(val) / max) * 100) : 0}%`, background: col }}
                        >
                          {compact(val)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
            {!keyLines.length && <p className="py-6 text-center text-sm text-muted-foreground">Nothing to chart yet.</p>}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <StatementTable rows={rows} columns={columns} firstLabel="Line item" />
        </Card>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Budgets are entered monthly per ledger account in {m.baseCurrency}
        {m.currency !== m.baseCurrency ? ` and converted to ${m.currency} at today's rate` : ""}. Variance is coloured
        green when it is favourable.
      </p>

      <ManageBudgetDialog
        open={manage}
        onOpenChange={setManage}
        defaultMonth={m.periodKey.length === 7 ? m.periodKey : `${year}-${String(new Date().getMonth() + 1).padStart(2, "0")}`}
        baseCurrency={m.baseCurrency}
        onSaved={() => qc.invalidateQueries({ queryKey: ["report-pack"] })}
      />
    </div>
  );
}

// ── Manage budget dialog ─────────────────────────────────────

function prevMonth(ym: string) {
  const [y, mo] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function ManageBudgetDialog({
  open,
  onOpenChange,
  defaultMonth,
  baseCurrency,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultMonth: string;
  baseCurrency: string;
  onSaved: () => void;
}) {
  const [month, setMonth] = useState(defaultMonth);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    if (open) setMonth(defaultMonth);
  }, [open, defaultMonth]);

  const { data: accounts = [] } = useQuery({
    queryKey: ["ledger-accounts"],
    queryFn: fetchLedgerAccounts,
    enabled: open,
  });
  const { data: budget, isFetching, refetch } = useQuery({
    queryKey: ["budget", month],
    queryFn: () => fetchBudget(month),
    enabled: open && /^\d{4}-\d{2}$/.test(month),
  });

  // Only income and expense accounts are budgeted.
  const lines = useMemo(
    () =>
      accounts
        .filter((a) => a.active !== false && (a.type === "Revenue" || a.type === "Expense"))
        .sort((a, b) => a.code.localeCompare(b.code)),
    [accounts],
  );

  useEffect(() => {
    if (!budget) return;
    const next: Record<string, string> = {};
    budget.lines.forEach((l) => {
      if (l.budgetedAmount) next[l.accountCode] = String(l.budgetedAmount);
    });
    setAmounts(next);
  }, [budget, month]);

  const total = (type: string) =>
    lines
      .filter((a) => a.type === type)
      .reduce((s, a) => s + (parseFloat(amounts[a.code] ?? "") || 0), 0);

  const save = async () => {
    setSaving(true);
    try {
      await saveBudget(
        month,
        lines
          .filter((a) => (parseFloat(amounts[a.code] ?? "") || 0) !== 0)
          .map((a) => ({
            accountCode: a.code,
            accountName: a.name,
            budgetedAmount: parseFloat(amounts[a.code]),
          })),
      );
      toast({ title: `Budget for ${month} saved` });
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Could not save the budget", description: e?.response?.data?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const copyPrev = async () => {
    setCopying(true);
    try {
      await copyBudgetFrom(month, prevMonth(month));
      await refetch();
      toast({ title: `Copied from ${prevMonth(month)}`, description: "Review the amounts, then save." });
    } catch (e: any) {
      toast({ title: "Nothing to copy", description: e?.response?.data?.message ?? "The previous month has no budget.", variant: "destructive" });
    } finally {
      setCopying(false);
    }
  };

  const section = (type: "Revenue" | "Expense", title: string) => (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-bold uppercase tracking-wide">
        <span>{title}</span>
        <span className="font-mono">
          {baseCurrency} {total(type).toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </span>
      </div>
      <div className="divide-y rounded-md border">
        {lines
          .filter((a) => a.type === type)
          .map((a) => (
            <div key={a.code} className="flex items-center gap-3 px-3 py-1.5 text-sm">
              <span className="w-14 font-mono text-[11px] text-muted-foreground">{a.code}</span>
              <span className="flex-1 truncate">{a.name}</span>
              <Input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                className="h-8 w-40 text-right"
                value={amounts[a.code] ?? ""}
                placeholder="0"
                onChange={(e) => setAmounts((s) => ({ ...s, [a.code]: e.target.value }))}
              />
            </div>
          ))}
        {!lines.some((a) => a.type === type) && (
          <p className="px-3 py-3 text-xs text-muted-foreground">No {title.toLowerCase()} accounts in the chart of accounts.</p>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage budget</DialogTitle>
          <DialogDescription>
            One budget per month, per ledger account, in {baseCurrency}. Amounts are positive for both income and costs.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
          <Button size="sm" variant="outline" onClick={copyPrev} disabled={copying || !month}>
            {copying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
            Copy from {month ? prevMonth(month) : "previous month"}
          </Button>
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        <div className="space-y-4">
          {section("Revenue", "Revenue")}
          {section("Expense", "Expenses")}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !month}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save budget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
