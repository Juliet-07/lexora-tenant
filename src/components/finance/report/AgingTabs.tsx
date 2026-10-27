import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { asOfLabel, HBars, KpiCard, TabHeading, useFmt, useReport } from "./shared";

const COLORS = {
  green: "#16a34a",
  amber: "#d97706",
  orange: "#ea580c",
  red: "#dc2626",
  dark: "#991b1b",
};

// A small note under each ageing table: the ageing is built from open
// documents, so if it disagrees with the ledger control account the
// reader should see by how much rather than wonder.
function ReconNote({ label, glBalance, difference }: { label: string; glBalance: number; difference: number }) {
  const { money } = useFmt();
  if (Math.abs(difference) < 0.5) return null;
  return (
    <p className="mt-3 flex items-start gap-1.5 text-xs text-warning">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        The ledger {label} balance is {money(glBalance)}, which differs from this ageing by {money(Math.abs(difference))}.
        The ageing is built from open documents; the difference is usually opening balances or manual journals posted
        straight to the control account.
      </span>
    </p>
  );
}

// ── Aged receivables ─────────────────────────────────────────

export function AgedReceivablesTab() {
  const { pack, view } = useReport();
  const { money, dash, pct } = useFmt();
  const navigate = useNavigate();
  const ar = pack.agedReceivables;
  const b = ar.buckets;
  const share = (v: number) => (ar.total ? (v / ar.total) * 100 : 0);

  const buckets = [
    { name: "Current", val: b.current, color: COLORS.green },
    { name: "1-30 days", val: b.d30, color: COLORS.amber },
    { name: "31-60 days", val: b.d60, color: COLORS.orange },
    { name: "61-90 days", val: b.d90, color: COLORS.red },
    { name: "90+ days", val: b.d90p, color: COLORS.dark },
  ];

  return (
    <div className="space-y-4">
      <TabHeading title="Aged Receivables" sub={`As at ${asOfLabel(ar.asOf)} · amounts in ${pack.meta.currency}`} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {buckets.map((x) => (
          <Card key={x.name}>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{x.name}</p>
              <p className="mt-1 text-lg font-bold" style={{ color: x.color }}>
                {money(x.val)}
              </p>
              <p className="text-xs text-muted-foreground">{pct(share(x.val))}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {view === "chart" ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Aging distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <HBars
              items={buckets.map((x) => ({ ...x, pct: Math.round(share(x.val) * 10) / 10 }))}
              maxPct={Math.max(...buckets.map((x) => share(x.val)), 1)}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-semibold">Client</th>
                <th className="px-4 py-2.5 text-right font-semibold">Current</th>
                <th className="px-4 py-2.5 text-right font-semibold">1-30</th>
                <th className="px-4 py-2.5 text-right font-semibold">31-60</th>
                <th className="px-4 py-2.5 text-right font-semibold">61-90</th>
                <th className="px-4 py-2.5 text-right font-semibold">90+</th>
                <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                <th className="px-4 py-2.5 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {ar.rows.map((r) => (
                <tr key={r.client} className="border-b">
                  <td className="px-4 py-2 font-semibold">
                    {r.client}
                    <span className="block text-[11px] font-normal text-muted-foreground">
                      {r.invoices} open invoice{r.invoices === 1 ? "" : "s"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{dash(r.current)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{dash(r.d30)}</td>
                  <td className={`px-4 py-2 text-right tabular-nums ${r.d60 ? "text-orange-600" : ""}`}>{dash(r.d60)}</td>
                  <td className={`px-4 py-2 text-right tabular-nums ${r.d90 ? "text-destructive" : ""}`}>{dash(r.d90)}</td>
                  <td className={`px-4 py-2 text-right tabular-nums ${r.d90p ? "font-bold text-red-800" : ""}`}>{dash(r.d90p)}</td>
                  <td className="px-4 py-2 text-right font-bold tabular-nums">{dash(r.total)}</td>
                  <td className="px-4 py-2 text-center">
                    <Button size="sm" variant="outline" onClick={() => navigate("/finance/sales")}>
                      Remind
                    </Button>
                  </td>
                </tr>
              ))}
              {!ar.rows.length && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                    No open invoices — nothing is owed to you right now.
                  </td>
                </tr>
              )}
              {ar.rows.length > 0 && (
                <tr className="border-t-2 bg-muted/50 font-bold">
                  <td className="px-4 py-2">TOTAL</td>
                  <td className="px-4 py-2 text-right tabular-nums">{dash(b.current)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{dash(b.d30)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{dash(b.d60)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{dash(b.d90)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{dash(b.d90p)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{dash(ar.total)}</td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
      <p className="text-xs text-muted-foreground">
        “Remind” opens Sales, where invoices are chased and reminders are logged.
      </p>
      <ReconNote label="receivables" glBalance={ar.glBalance} difference={ar.difference} />
    </div>
  );
}

// ── Aged payables ────────────────────────────────────────────

export function AgedPayablesTab() {
  const { pack, view } = useReport();
  const { money, dash, pct } = useFmt();
  const navigate = useNavigate();
  const ap = pack.agedPayables;
  const b = ap.buckets;
  const share = (v: number) => (ap.total ? (v / ap.total) * 100 : 0);

  const buckets = [
    { name: "Current", val: b.current, color: COLORS.green },
    { name: "1-30 days", val: b.d30, color: COLORS.amber },
    { name: "31-60 days", val: b.d60, color: COLORS.orange },
    { name: "60+ days", val: b.d60p, color: COLORS.red },
  ];

  return (
    <div className="space-y-4">
      <TabHeading title="Aged Payables" sub={`As at ${asOfLabel(ap.asOf)} · amounts in ${pack.meta.currency}`} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {buckets.map((x) => (
          <KpiCard key={x.name} label={x.name} value={<span style={{ color: x.color }}>{money(x.val)}</span>} sub={pct(share(x.val))} />
        ))}
      </div>

      {view === "chart" ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Aging distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <HBars
              items={buckets.map((x) => ({ ...x, pct: Math.round(share(x.val) * 10) / 10 }))}
              maxPct={Math.max(...buckets.map((x) => share(x.val)), 1)}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-semibold">Vendor</th>
                <th className="px-4 py-2.5 text-right font-semibold">Current</th>
                <th className="px-4 py-2.5 text-right font-semibold">1-30</th>
                <th className="px-4 py-2.5 text-right font-semibold">31-60</th>
                <th className="px-4 py-2.5 text-right font-semibold">60+</th>
                <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                <th className="px-4 py-2.5 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {ap.rows.map((r) => (
                <tr key={r.vendor} className="border-b">
                  <td className="px-4 py-2 font-semibold">
                    {r.vendor}
                    <span className="block text-[11px] font-normal text-muted-foreground">
                      {r.bills} open bill{r.bills === 1 ? "" : "s"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{dash(r.current)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{dash(r.d30)}</td>
                  <td className={`px-4 py-2 text-right tabular-nums ${r.d60 ? "text-warning" : ""}`}>{dash(r.d60)}</td>
                  <td className={`px-4 py-2 text-right tabular-nums ${r.d60p ? "text-destructive" : ""}`}>{dash(r.d60p)}</td>
                  <td className="px-4 py-2 text-right font-bold tabular-nums">{dash(r.total)}</td>
                  <td className="px-4 py-2 text-center">
                    <Button size="sm" variant="outline" onClick={() => navigate("/finance/purchases")}>
                      Pay
                    </Button>
                  </td>
                </tr>
              ))}
              {!ap.rows.length && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No approved bills are waiting to be paid.
                  </td>
                </tr>
              )}
              {ap.rows.length > 0 && (
                <tr className="border-t-2 bg-muted/50 font-bold">
                  <td className="px-4 py-2">TOTAL</td>
                  <td className="px-4 py-2 text-right tabular-nums">{dash(b.current)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{dash(b.d30)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{dash(b.d60)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{dash(b.d60p)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{dash(ap.total)}</td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
      <p className="text-xs text-muted-foreground">“Pay” opens Purchases, where bills are approved, scheduled and paid.</p>
      <ReconNote label="payables" glBalance={ap.glBalance} difference={ap.difference} />
    </div>
  );
}
