/**
 * Management Reporting — Finance module.
 *
 * There is no API for management reporting yet, so everything on this
 * page is deterministic dummy data held in this file. Swap each block
 * for a real fetch when the endpoints land; the shapes below are the
 * contract we expect.
 */
import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Download,
  Mail,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { WorkflowTable } from "@/components/finance/WorkflowTable";
import { fmoney } from "@/data/financeMockData";

// ── Dummy data ────────────────────────────────────────────────

const PERIODS = ["Jul 2026", "Jun 2026", "May 2026", "Q2 2026"] as const;
type Period = (typeof PERIODS)[number];

const headline: Record<
  Period,
  { revenue: number; ebitda: number; cash: number; dso: number; margin: number }
> = {
  "Jul 2026": { revenue: 486_000_000, ebitda: 121_500_000, cash: 302_400_000, dso: 47, margin: 25 },
  "Jun 2026": { revenue: 452_000_000, ebitda: 104_000_000, cash: 288_100_000, dso: 51, margin: 23 },
  "May 2026": { revenue: 438_500_000, ebitda: 96_400_000, cash: 271_900_000, dso: 54, margin: 22 },
  "Q2 2026": { revenue: 1_331_000_000, ebitda: 302_800_000, cash: 288_100_000, dso: 51, margin: 23 },
};

const priorHeadline: Record<Period, { revenue: number; ebitda: number; cash: number; dso: number }> = {
  "Jul 2026": { revenue: 452_000_000, ebitda: 104_000_000, cash: 288_100_000, dso: 51 },
  "Jun 2026": { revenue: 438_500_000, ebitda: 96_400_000, cash: 271_900_000, dso: 54 },
  "May 2026": { revenue: 421_200_000, ebitda: 91_800_000, cash: 264_300_000, dso: 56 },
  "Q2 2026": { revenue: 1_248_000_000, ebitda: 271_400_000, cash: 264_300_000, dso: 56 },
};

interface PackItem {
  section: string;
  owner: string;
  status: "Complete" | "In review" | "Outstanding";
  due: string;
}

const packChecklist: PackItem[] = [
  { section: "Executive summary & commentary", owner: "Aline U. (CFO)", status: "Complete", due: "05 Aug 2026" },
  { section: "Profit & loss vs budget", owner: "Eric M. (FC)", status: "Complete", due: "04 Aug 2026" },
  { section: "Balance sheet & working capital", owner: "Eric M. (FC)", status: "Complete", due: "04 Aug 2026" },
  { section: "13-week cash flow forecast", owner: "Sandra K. (Treasury)", status: "In review", due: "06 Aug 2026" },
  { section: "Service line profitability", owner: "Jean P. (FP&A)", status: "In review", due: "06 Aug 2026" },
  { section: "Client & mandate margin review", owner: "Jean P. (FP&A)", status: "Outstanding", due: "07 Aug 2026" },
  { section: "Capex & asset movements", owner: "Grace N. (Assets)", status: "Outstanding", due: "07 Aug 2026" },
  { section: "Tax & statutory position", owner: "Didier R. (Tax)", status: "Complete", due: "03 Aug 2026" },
];

const segments = [
  { name: "Advisory", revenue: 182_400_000, budget: 170_000_000, cost: 121_300_000, headcount: 34 },
  { name: "Litigation & ADR", revenue: 128_900_000, budget: 136_000_000, cost: 93_600_000, headcount: 27 },
  { name: "Compliance & AML", revenue: 96_700_000, budget: 88_000_000, cost: 61_100_000, headcount: 19 },
  { name: "Corporate secretarial", revenue: 48_300_000, budget: 46_500_000, cost: 32_800_000, headcount: 11 },
  { name: "Fund administration", revenue: 29_700_000, budget: 34_000_000, cost: 25_400_000, headcount: 8 },
];

const cashBridge = [
  { label: "Opening cash", value: 288_100_000, kind: "anchor" as const },
  { label: "Collections", value: 421_600_000, kind: "in" as const },
  { label: "Supplier payments", value: -168_900_000, kind: "out" as const },
  { label: "Payroll & benefits", value: -173_400_000, kind: "out" as const },
  { label: "Tax remittances", value: -49_800_000, kind: "out" as const },
  { label: "Capex", value: -15_200_000, kind: "out" as const },
  { label: "Closing cash", value: 302_400_000, kind: "anchor" as const },
];

const forecast13w = [
  { week: "W31", inflow: 96_000_000, outflow: 88_400_000 },
  { week: "W32", inflow: 104_500_000, outflow: 91_200_000 },
  { week: "W33", inflow: 88_300_000, outflow: 96_700_000 },
  { week: "W34", inflow: 112_800_000, outflow: 84_100_000 },
  { week: "W35", inflow: 79_600_000, outflow: 102_400_000 },
  { week: "W36", inflow: 121_200_000, outflow: 89_900_000 },
  { week: "W37", inflow: 93_400_000, outflow: 94_800_000 },
  { week: "W38", inflow: 108_100_000, outflow: 87_300_000 },
];

const commentary = [
  {
    title: "Revenue ahead of budget on Advisory demand",
    body: "Advisory billed RWF 182.4m against a RWF 170.0m budget, driven by three unplanned transaction mandates that closed in July. Realisation held at 93% with no discount concessions.",
    tone: "positive" as const,
  },
  {
    title: "Litigation & ADR behind plan",
    body: "Two court adjournments pushed an estimated RWF 11.4m of billable work into August. WIP is recoverable; no provision taken. Recovery expected within the quarter.",
    tone: "negative" as const,
  },
  {
    title: "DSO improved four days to 47",
    body: "Dunning automation and the two new payment plans reduced 90+ day receivables by RWF 18.2m. Target remains 45 days by year end.",
    tone: "positive" as const,
  },
  {
    title: "Fund administration under-recovering",
    body: "Revenue RWF 29.7m against RWF 34.0m budget with cost base largely fixed. Margin at 14%. Pricing review scheduled with the partner group in August.",
    tone: "negative" as const,
  },
];

const kpiWatchlist = [
  { metric: "Gross margin", actual: "37.2%", target: "36.0%", status: "On track" },
  { metric: "EBITDA margin", actual: "25.0%", target: "24.0%", status: "On track" },
  { metric: "Utilisation (fee earners)", actual: "76%", target: "80%", status: "Watch" },
  { metric: "Realisation rate", actual: "93%", target: "92%", status: "On track" },
  { metric: "DSO", actual: "47 days", target: "45 days", status: "Watch" },
  { metric: "Unbilled WIP days", actual: "31 days", target: "25 days", status: "Off track" },
  { metric: "Cash runway", actual: "8.4 months", target: "6.0 months", status: "On track" },
  { metric: "Cost per fee earner", actual: "RWF 3.1m", target: "RWF 3.0m", status: "Watch" },
];

const distribution = [
  { recipient: "Board of Directors", pack: "Full management pack", cadence: "Monthly, by 10th", channel: "Board portal" },
  { recipient: "Audit & Risk Committee", pack: "Financials + controls appendix", cadence: "Quarterly", channel: "Board portal" },
  { recipient: "Partner group", pack: "P&L, utilisation, WIP", cadence: "Monthly, by 8th", channel: "Email" },
  { recipient: "Department heads", pack: "Segment scorecard", cadence: "Monthly, by 8th", channel: "Email" },
  { recipient: "Lenders", pack: "Covenant certificate", cadence: "Quarterly", channel: "Secure link" },
];

const packWorkflow = [
  { action: "Close the ledger", detail: "Post accruals, prepayments, depreciation and FX revaluation; lock the period.", owner: "Financial Controller", trigger: "Day 3 after month end" },
  { action: "Build the pack", detail: "Refresh P&L, balance sheet, cash flow and segment schedules from the closed ledger.", owner: "FP&A", trigger: "Ledger locked" },
  { action: "Variance interrogation", detail: "Any line varying more than 5% or RWF 5m from budget requires written commentary.", owner: "Segment owners", trigger: "Draft pack circulated" },
  { action: "CFO review & sign-off", detail: "CFO challenges commentary, approves the pack and releases it for distribution.", owner: "CFO", trigger: "All commentary received" },
  { action: "Distribute", detail: "Publish to the board portal and email segment scorecards to department heads.", owner: "Finance Ops", trigger: "CFO sign-off" },
  { action: "Board discussion & actions", detail: "Log decisions and finance actions arising, and carry them into the next pack.", owner: "Company Secretary", trigger: "Board meeting held" },
];

// ── Small presentational helpers ──────────────────────────────

function Kpi({
  label, value, delta, favourable, note,
}: { label: string; value: string; delta?: string; favourable?: boolean; note?: string }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tracking-tight">{value}</p>
        {delta && (
          <p
            className={`text-xs flex items-center gap-1 ${
              favourable ? "text-emerald-600" : "text-destructive"
            }`}
          >
            {favourable ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {delta}
          </p>
        )}
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </CardContent>
    </Card>
  );
}

const statusVariant = (s: string) =>
  s === "Complete" || s === "On track"
    ? "default"
    : s === "Off track"
      ? "destructive"
      : "secondary";

// ── Page ──────────────────────────────────────────────────────

export default function ManagementReporting() {
  const [period, setPeriod] = useState<Period>("Jul 2026");
  const { toast } = useToast();

  const cur = headline[period];
  const prior = priorHeadline[period];

  const pct = (a: number, b: number) => (b ? ((a - b) / Math.abs(b)) * 100 : 0);

  const packProgress = useMemo(() => {
    const done = packChecklist.filter((p) => p.status === "Complete").length;
    return Math.round((done / packChecklist.length) * 100);
  }, []);

  const maxFlow = Math.max(...forecast13w.map((w) => Math.max(w.inflow, w.outflow)));

  const notImplemented = (what: string) =>
    toast({
      title: `${what} queued`,
      description: "Dummy data only — wire this to the reporting service when the API is available.",
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Management reporting</h1>
          <p className="text-sm text-muted-foreground">
            Monthly management pack, segment performance and board commentary — {period}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList>
              {PERIODS.map((p) => (
                <TabsTrigger key={p} value={p}>{p}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={() => notImplemented("Pack export")}>
            <Download className="h-4 w-4 mr-1" /> Export pack
          </Button>
          <Button size="sm" onClick={() => notImplemented("Distribution")}>
            <Mail className="h-4 w-4 mr-1" /> Distribute
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi
          label="Revenue"
          value={fmoney(cur.revenue)}
          delta={`${pct(cur.revenue, prior.revenue).toFixed(1)}% vs prior period`}
          favourable={cur.revenue >= prior.revenue}
        />
        <Kpi
          label="EBITDA"
          value={fmoney(cur.ebitda)}
          delta={`${pct(cur.ebitda, prior.ebitda).toFixed(1)}% vs prior period`}
          favourable={cur.ebitda >= prior.ebitda}
        />
        <Kpi label="EBITDA margin" value={`${cur.margin}%`} note="Board target 24%" />
        <Kpi
          label="Closing cash"
          value={fmoney(cur.cash)}
          delta={`${pct(cur.cash, prior.cash).toFixed(1)}% vs prior period`}
          favourable={cur.cash >= prior.cash}
        />
        <Kpi
          label="Debtor days (DSO)"
          value={`${cur.dso} days`}
          delta={`${Math.abs(cur.dso - prior.dso)} days ${cur.dso <= prior.dso ? "faster" : "slower"}`}
          favourable={cur.dso <= prior.dso}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Management pack readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="flex items-center gap-3">
              <Progress value={packProgress} className="h-2" />
              <span className="text-sm font-medium tabular-nums">{packProgress}%</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packChecklist.map((p) => (
                  <TableRow key={p.section}>
                    <TableCell className="text-sm font-medium flex items-center gap-2">
                      {p.status === "Complete" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <CircleDashed className="h-4 w-4 text-muted-foreground" />
                      )}
                      {p.section}
                    </TableCell>
                    <TableCell className="text-sm">{p.owner}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.due}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">KPI watchlist</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpiWatchlist.map((k) => (
                  <TableRow key={k.metric}>
                    <TableCell className="text-sm">
                      <div className="font-medium">{k.metric}</div>
                      <Badge variant={statusVariant(k.status)} className="mt-1">
                        {k.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">{k.actual}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground tabular-nums">{k.target}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Segment performance — revenue, margin and budget variance</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service line</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-right">Direct cost</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">Headcount</TableHead>
                <TableHead className="w-32">vs budget</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {segments.map((s) => {
                const variance = s.revenue - s.budget;
                const margin = Math.round(((s.revenue - s.cost) / s.revenue) * 100);
                const attain = Math.min(140, Math.round((s.revenue / s.budget) * 100));
                return (
                  <TableRow key={s.name}>
                    <TableCell className="text-sm font-medium">{s.name}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{fmoney(s.revenue)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground tabular-nums">{fmoney(s.budget)}</TableCell>
                    <TableCell
                      className={`text-right text-sm font-medium tabular-nums ${
                        variance >= 0 ? "text-emerald-600" : "text-destructive"
                      }`}
                    >
                      {variance >= 0 ? "+" : "−"}{fmoney(Math.abs(variance))}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{fmoney(s.cost)}</TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">{margin}%</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground tabular-nums">{s.headcount}</TableCell>
                    <TableCell>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full ${variance >= 0 ? "bg-emerald-500" : "bg-destructive"}`}
                          style={{ width: `${Math.min(100, attain)}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground">{attain}% of budget</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cash bridge — {period}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {cashBridge.map((c) => (
              <div key={c.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className={c.kind === "anchor" ? "font-semibold" : ""}>{c.label}</span>
                  <span
                    className={`tabular-nums font-medium ${
                      c.kind === "in" ? "text-emerald-600" : c.kind === "out" ? "text-destructive" : ""
                    }`}
                  >
                    {c.value < 0 ? "−" : ""}{fmoney(Math.abs(c.value))}
                  </span>
                </div>
                {c.kind === "anchor" && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Rolling 8-week cash forecast
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {forecast13w.map((w) => {
              const net = w.inflow - w.outflow;
              return (
                <div key={w.week} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{w.week}</span>
                    <span className={net >= 0 ? "text-emerald-600" : "text-destructive"}>
                      net {net < 0 ? "−" : "+"}{fmoney(Math.abs(net))}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(w.inflow / maxFlow) * 50}%` }} />
                    <div className="h-2 rounded-full bg-destructive/70" style={{ width: `${(w.outflow / maxFlow) * 50}%` }} />
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground">
              Green = forecast collections, red = forecast disbursements.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Variance commentary for the board</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
          {commentary.map((c) => (
            <div
              key={c.title}
              className={`rounded-lg border p-4 space-y-1 ${
                c.tone === "positive" ? "border-emerald-500/40" : "border-destructive/40"
              }`}
            >
              <p className="text-sm font-medium">{c.title}</p>
              <p className="text-sm text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Distribution list</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Pack</TableHead>
                <TableHead>Cadence</TableHead>
                <TableHead>Channel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {distribution.map((d) => (
                <TableRow key={d.recipient}>
                  <TableCell className="text-sm font-medium">{d.recipient}</TableCell>
                  <TableCell className="text-sm">{d.pack}</TableCell>
                  <TableCell className="text-sm">{d.cadence}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.channel}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <WorkflowTable title="Month-end reporting workflow" steps={packWorkflow} />
    </div>
  );
}
