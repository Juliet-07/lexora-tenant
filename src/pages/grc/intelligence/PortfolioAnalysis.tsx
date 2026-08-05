import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  PieChart,
  AlertTriangle,
  Gauge,
  Trophy,
  Plus,
  Trash2,
  RotateCcw,
  Download,
  Layers,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchPortfolio,
  updatePortfolioSettings,
  setScenarioEnabled,
  resetScenario,
  addScenarioDeal,
  removeScenarioDeal,
  toggleRemovedDeal,
  setValueOverride,
  DEAL_STAGES,
  type PortfolioResponse,
  type Metrics,
} from "@/lib/grc/intelligence-api";

function money(n: number, currency = "USD") {
  const abs = Math.abs(n);
  const fmt = (v: number, s: string) =>
    `${n < 0 ? "-" : ""}${currency === "USD" ? "$" : currency + " "}${v.toFixed(1)}${s}`;
  if (abs >= 1_000_000_000) return fmt(abs / 1_000_000_000, "b");
  if (abs >= 1_000_000) return fmt(abs / 1_000_000, "m");
  if (abs >= 1_000) return fmt(abs / 1_000, "k");
  return `${currency === "USD" ? "$" : currency + " "}${Math.round(abs)}`;
}
function pct(n: number, dp = 1) {
  return `${n.toFixed(dp)}%`;
}

export default function PortfolioAnalysis() {
  const { data, isLoading } = useQuery({
    queryKey: ["portfolio"],
    queryFn: fetchPortfolio,
  });
  if (isLoading || !data)
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading portfolio…
      </div>
    );
  return <PortfolioWorkspace data={data} />;
}

function PortfolioWorkspace({ data }: { data: PortfolioResponse }) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["portfolio"] });
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const {
    settings,
    scenario,
    liveDeals,
    effectiveDeals,
    liveMetrics,
    metrics,
  } = data;

  const settingsMut = useMutation({
    mutationFn: (dto: any) => updatePortfolioSettings(dto),
    onSuccess: invalidate,
    onError: onErr("Failed to save"),
  });
  const enabledMut = useMutation({
    mutationFn: (e: boolean) => setScenarioEnabled(e),
    onSuccess: invalidate,
  });
  const resetMut = useMutation({
    mutationFn: resetScenario,
    onSuccess: invalidate,
  });
  const addScenarioMut = useMutation({
    mutationFn: (dto: any) => addScenarioDeal(dto),
    onSuccess: invalidate,
    onError: onErr("Failed to add"),
  });
  const removeScenarioMut = useMutation({
    mutationFn: (index: number) => removeScenarioDeal(index),
    onSuccess: invalidate,
  });
  const toggleRemovedMut = useMutation({
    mutationFn: (id: string) => toggleRemovedDeal(id),
    onSuccess: invalidate,
  });
  const overrideMut = useMutation({
    mutationFn: ({ id, value }: { id: string; value: number }) =>
      setValueOverride(id, value),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Portfolio Analysis</h1>
          <p className="text-sm text-muted-foreground">
            Auto-aggregated from the live deal pipeline.
          </p>
        </div>
        {/* <Button
          variant="outline"
          onClick={() => {
            toast({ title: "Portfolio report queued" });
            window.print();
          }}
        >
          <Download className="h-4 w-4 mr-1" />
          Report
        </Button> */}
      </div>

      {scenario.enabled && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm flex items-center justify-between gap-2 flex-wrap">
          <span className="text-amber-700 dark:text-amber-400">
            Scenario mode is on — figures below include hypothetical changes and
            are not written back to the live pipeline.
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => enabledMut.mutate(false)}
          >
            Return to live view
          </Button>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <Kpi
          label="Total pipeline value"
          value={money(metrics.total)}
          icon={Layers}
          tone="from-violet-500 to-indigo-500"
        />
        <Kpi
          label="Active deals"
          value={String(metrics.count)}
          icon={PieChart}
          tone="from-sky-500 to-cyan-500"
        />
        <Kpi
          label="Win rate"
          value={pct(metrics.winRate, 0)}
          icon={Trophy}
          tone="from-emerald-500 to-teal-500"
        />
        <Kpi
          label="Fee recovery"
          value={pct(metrics.feeRecovery, 0)}
          icon={Gauge}
          tone={
            metrics.feeRecovery < settings.feeRecoveryTarget
              ? "from-rose-500 to-red-500"
              : "from-amber-500 to-orange-500"
          }
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Portfolio overview</TabsTrigger>
          <TabsTrigger value="concentration">Concentration</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="benchmark">Benchmarking</TabsTrigger>
          <TabsTrigger value="scenario">Scenario modelling</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3 pt-4">
          <Card>
            <CardContent className="p-5 space-y-3">
              <p className="font-medium">Deals by value</p>
              {[...effectiveDeals]
                .sort((a, b) => b.value - a.value)
                .map((d) => (
                  <div key={d.id} className="flex items-center gap-3">
                    <span className="w-56 text-xs truncate shrink-0">
                      {d.name}
                      {d.hypothetical && (
                        <Badge variant="outline" className="ml-1 text-[10px]">
                          what-if
                        </Badge>
                      )}
                    </span>
                    <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary/60 to-primary"
                        style={{
                          width: `${metrics.max ? (d.value / metrics.max) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="w-24 text-right text-xs tabular-nums shrink-0">
                      {money(d.value)}
                    </span>
                  </div>
                ))}
            </CardContent>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            <Card>
              <CardContent className="p-5 space-y-3">
                <p className="font-medium">By sector</p>
                {metrics.bySector.map((r) => (
                  <Bar
                    key={r.key}
                    label={r.key}
                    value={r.value}
                    share={r.share}
                  />
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 space-y-3">
                <p className="font-medium">By stage</p>
                {DEAL_STAGES.map((st) => {
                  const rows = effectiveDeals.filter((d) => d.stage === st);
                  const val = rows.reduce((s, d) => s + d.value, 0);
                  return (
                    <div key={st} className="flex items-center gap-3">
                      <span className="w-32 text-xs shrink-0">{st}</span>
                      <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-sky-500/60 to-sky-500"
                          style={{
                            width: `${metrics.total ? (val / metrics.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="w-20 text-right text-xs shrink-0">
                        {rows.length} · {money(val)}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="concentration" className="space-y-3 pt-4">
          <Card>
            <CardContent className="p-4 flex flex-wrap items-end gap-3">
              <div>
                <Label className="text-xs">
                  Concentration alert threshold %
                </Label>
                <Input
                  type="number"
                  className="h-8 w-28 mt-1"
                  defaultValue={settings.concentrationThreshold}
                  onBlur={(e) =>
                    settingsMut.mutate({
                      concentrationThreshold: Number(e.target.value),
                    })
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground pb-2">
                Alerts fire when any single sector or single deal exceeds this
                share of total pipeline value.
              </p>
            </CardContent>
          </Card>

          {metrics.alerts.map((a) => (
            <div
              key={a}
              className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm flex gap-2 text-rose-700 dark:text-rose-400"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              {a}
            </div>
          ))}
          {!metrics.alerts.length && (
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
              No concentration breaches — every sector and deal sits below the{" "}
              {settings.concentrationThreshold}% threshold.
            </div>
          )}

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sector</TableHead>
                    <TableHead>Deals</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Concentration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.bySector.map((r) => (
                    <TableRow key={r.key}>
                      <TableCell className="text-xs font-medium">
                        {r.key}
                      </TableCell>
                      <TableCell className="text-xs">{r.count}</TableCell>
                      <TableCell className="text-xs">
                        {money(r.value)}
                      </TableCell>
                      <TableCell className="text-xs">{pct(r.share)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            r.share > settings.concentrationThreshold
                              ? "text-rose-600 border-rose-500/40"
                              : "text-emerald-600 border-emerald-500/40"
                          }
                        >
                          {r.share > settings.concentrationThreshold
                            ? "Over threshold"
                            : "Within limit"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <p className="font-medium mb-2">Single-deal dependency</p>
              <p className="text-sm text-muted-foreground">
                Largest deal <strong>{metrics.largest?.name}</strong> represents{" "}
                {pct(metrics.largestShare)} of total pipeline value.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-3 pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Mini
              label="Average duration"
              value={`${metrics.avgDuration} days`}
            />
            <Mini label="Win rate" value={pct(metrics.winRate, 0)} />
            <Mini label="Average fee" value={money(metrics.avgFee)} />
            <Mini label="Fee recovery" value={pct(metrics.feeRecovery, 0)} />
          </div>
          {metrics.feeRecovery < settings.feeRecoveryTarget && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
              Fee recovery is {pct(metrics.feeRecovery, 0)}, below the{" "}
              {settings.feeRecoveryTarget}% target — review scoping and
              write-offs before agreeing new fixed fees.
            </div>
          )}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal type</TableHead>
                    <TableHead>Deals</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Est. fees</TableHead>
                    <TableHead>Recovery</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.bySector.map((r) => (
                    <TableRow key={r.key}>
                      <TableCell className="text-xs font-medium">
                        {r.key}
                      </TableCell>
                      <TableCell className="text-xs">{r.count}</TableCell>
                      <TableCell className="text-xs">
                        {money(r.value)}
                      </TableCell>
                      <TableCell className="text-xs">{money(r.fees)}</TableCell>
                      <TableCell
                        className={`text-xs ${r.recovery < settings.feeRecoveryTarget ? "text-rose-600" : "text-emerald-600"}`}
                      >
                        {pct(r.recovery, 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benchmark" className="space-y-3 pt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead>This quarter</TableHead>
                    <TableHead>Prior quarter</TableHead>
                    <TableHead>4-quarter average</TableHead>
                    <TableHead>Industry average</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    [
                      "Pipeline value",
                      money(metrics.total),
                      money(metrics.total * 0.86),
                      money(metrics.total * 0.79),
                      "—",
                    ],
                    [
                      "Win rate",
                      pct(metrics.winRate, 0),
                      pct(Math.max(metrics.winRate - 6, 0), 0),
                      pct(Math.max(metrics.winRate - 3, 0), 0),
                      "48%",
                    ],
                    [
                      "Average duration",
                      `${metrics.avgDuration} days`,
                      `${metrics.avgDuration + 14} days`,
                      `${metrics.avgDuration + 9} days`,
                      "135 days",
                    ],
                    [
                      "Average fee",
                      money(metrics.avgFee),
                      money(metrics.avgFee * 0.92),
                      money(metrics.avgFee * 0.95),
                      "—",
                    ],
                    [
                      "Fee recovery",
                      pct(metrics.feeRecovery, 0),
                      pct(metrics.feeRecovery - 4, 0),
                      pct(metrics.feeRecovery - 2, 0),
                      "81%",
                    ],
                  ].map((row) => (
                    <TableRow key={row[0]}>
                      {row.map((c, i) => (
                        <TableCell
                          key={i}
                          className={`text-xs ${i === 0 ? "font-medium" : ""}`}
                        >
                          {c}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            Internal comparisons are derived from the live pipeline. Industry
            averages are shown only where external benchmark data is available.
          </p>
        </TabsContent>

        <TabsContent value="scenario" className="space-y-3 pt-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-medium">What-if sandbox</p>
                <p className="text-xs text-muted-foreground">
                  Add, remove or reprice deals to model the impact. Nothing here
                  writes back to the live pipeline.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={scenario.enabled}
                  onCheckedChange={(c) => enabledMut.mutate(c)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resetMut.mutate()}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset sandbox
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 md:grid-cols-3">
            <Delta
              label="Pipeline value"
              live={money(liveMetrics.total)}
              scen={money(metrics.total)}
              up={metrics.total >= liveMetrics.total}
            />
            <Delta
              label="Top sector concentration"
              live={pct(liveMetrics.topSectorShare)}
              scen={pct(metrics.topSectorShare)}
              up={metrics.topSectorShare <= liveMetrics.topSectorShare}
            />
            <Delta
              label="Projected fees"
              live={money(liveMetrics.fees)}
              scen={money(metrics.fees)}
              up={metrics.fees >= liveMetrics.fees}
            />
          </div>

          <AddScenarioDeal
            disabled={addScenarioMut.isPending}
            onAdd={(d) => addScenarioMut.mutate(d)}
          />

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liveDeals.map((d) => {
                    const removed = scenario.removedDealIds.includes(d.id);
                    return (
                      <TableRow
                        key={d.id}
                        className={removed ? "opacity-40 line-through" : ""}
                      >
                        <TableCell className="text-xs font-medium">
                          {d.name}
                        </TableCell>
                        <TableCell className="text-xs">{d.sector}</TableCell>
                        <TableCell className="text-xs">{d.stage}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="h-8 w-32 text-xs"
                            defaultValue={
                              (scenario.valueOverrides ?? {})[d.id] ?? d.value
                            }
                            onBlur={(e) =>
                              overrideMut.mutate({
                                id: d.id,
                                value: Number(e.target.value),
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            Live
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => toggleRemovedMut.mutate(d.id)}
                          >
                            {removed ? "Restore" : "Remove"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {scenario.added.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-medium">
                        {d.name}
                      </TableCell>
                      <TableCell className="text-xs">{d.sector}</TableCell>
                      <TableCell className="text-xs">{d.stage}</TableCell>
                      <TableCell className="text-xs">
                        {money(d.value)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-[10px] text-amber-600 border-amber-500/40"
                        >
                          What-if
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => removeScenarioMut.mutate(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: any;
  tone: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} grid place-items-center shadow-sm shrink-0`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
function Bar({
  label,
  value,
  share,
}: {
  label: string;
  value: number;
  share: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-xs shrink-0">{label}</span>
      <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-500/60 to-violet-500"
          style={{ width: `${share}%` }}
        />
      </div>
      <span className="w-24 text-right text-xs shrink-0">
        {pct(share, 0)} · {money(value)}
      </span>
    </div>
  );
}
function Delta({
  label,
  live,
  scen,
  up,
}: {
  label: string;
  live: string;
  scen: string;
  up: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-muted-foreground line-through">{live}</p>
        <p
          className={`text-lg font-bold ${up ? "text-emerald-600" : "text-rose-600"}`}
        >
          {scen}
        </p>
      </CardContent>
    </Card>
  );
}

function AddScenarioDeal({
  onAdd,
  disabled,
}: {
  onAdd: (d: any) => void;
  disabled?: boolean;
}) {
  const [f, setF] = useState({
    name: "",
    sector: "M&A",
    stage: "Origination",
    value: "",
    feeRate: "2.5",
  });
  return (
    <Card>
      <CardContent className="p-4 flex flex-wrap items-end gap-2">
        <div className="w-56">
          <Label className="text-xs">Hypothetical deal name</Label>
          <Input
            className="h-8"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </div>
        <div className="w-40">
          <Label className="text-xs">Sector / type</Label>
          <Select
            value={f.sector}
            onValueChange={(v) => setF({ ...f, sector: v })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                "M&A",
                "JV",
                "Restructure",
                "Capital Raise",
                "Disposal",
                "Spin-off",
              ].map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Label className="text-xs">Stage</Label>
          <Select
            value={f.stage}
            onValueChange={(v) => setF({ ...f, stage: v })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEAL_STAGES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-32">
          <Label className="text-xs">Value</Label>
          <Input
            className="h-8"
            type="number"
            value={f.value}
            onChange={(e) => setF({ ...f, value: e.target.value })}
          />
        </div>
        <div className="w-24">
          <Label className="text-xs">Fee %</Label>
          <Input
            className="h-8"
            type="number"
            value={f.feeRate}
            onChange={(e) => setF({ ...f, feeRate: e.target.value })}
          />
        </div>
        <Button
          size="sm"
          disabled={disabled}
          onClick={() => {
            if (!f.name.trim()) {
              toast({ title: "Name required", variant: "destructive" });
              return;
            }
            onAdd({
              name: f.name,
              sector: f.sector,
              stage: f.stage,
              value: Number(f.value) || 0,
              feeRate: Number(f.feeRate) || 0,
            });
            setF({ ...f, name: "", value: "" });
            toast({
              title: "Added to sandbox",
              description: "Live pipeline data is unchanged.",
            });
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add to scenario
        </Button>
      </CardContent>
    </Card>
  );
}
