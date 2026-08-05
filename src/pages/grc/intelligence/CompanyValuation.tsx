import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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
  Plus,
  Trash2,
  Download,
  History,
  Calculator,
  Scale,
  TrendingUp,
  Coins,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchValuations,
  createValuation,
  updateDcf,
  addComp,
  removeComp,
  updatePrivateDiscount,
  addPrecedent,
  removePrecedent,
  updateNav,
  updateDdm,
  updateBlendEntry,
  snapshotVersion,
  downloadValuationReport,
  METHOD_KEYS,
  type Valuation,
  type DCFAssumptions,
} from "@/lib/grc/intelligence-api";
import {
  runDcf,
  runComps,
  runPrecedents,
  methodEv,
  methodRange,
  blendedValuation,
  sensitivityMatrix,
  money,
  pct,
  type MethodKey,
} from "@/lib/grc/valuation-math";

export default function CompanyValuation() {
  const queryClient = useQueryClient();
  const { data: valuations = [], isLoading } = useQuery({
    queryKey: ["valuations"],
    queryFn: fetchValuations,
  });
  const [selId, setSelId] = useState<string>("");
  const v = valuations.find((x) => x._id === selId) ?? valuations[0];

  const createMut = useMutation({
    mutationFn: createValuation,
    onSuccess: (nv) => {
      queryClient.invalidateQueries({ queryKey: ["valuations"] });
      setSelId(nv._id);
      toast({
        title: "Valuation model created",
        description: "Enter assumptions to start.",
      });
    },
  });

  if (isLoading)
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading valuation models…
      </div>
    );

  if (!v) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Company Valuation</h1>
          <p className="text-sm text-muted-foreground">
            Five independent methods, blended into one negotiation range.
          </p>
        </div>
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            No valuation model yet.
          </CardContent>
        </Card>
        <Button
          disabled={createMut.isPending}
          onClick={() => createMut.mutate()}
        >
          <Plus className="h-4 w-4 mr-1" />
          {createMut.isPending ? "Creating…" : "New valuation"}
        </Button>
      </div>
    );
  }

  return (
    <ValuationWorkspace
      key={v._id}
      v={v}
      allModels={valuations}
      onSwitch={setSelId}
      onCreateNew={() => createMut.mutate()}
      creating={createMut.isPending}
    />
  );
}

function ValuationWorkspace({
  v,
  allModels,
  onSwitch,
  onCreateNew,
  creating,
}: {
  v: Valuation;
  allModels: Valuation[];
  onSwitch: (id: string) => void;
  onCreateNew: () => void;
  creating: boolean;
}) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["valuations"] });
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  // Local draft mirrors the server DCF so number inputs feel instant
  // (recalculated client-side on every keystroke via the shared math
  // module) while the actual save only fires on blur.
  const [dcfDraft, setDcfDraft] = useState<DCFAssumptions>(v.dcf);
  useEffect(() => setDcfDraft(v.dcf), [v.dcf]);

  const dcfMut = useMutation({
    mutationFn: (dto: Partial<DCFAssumptions>) => updateDcf(v._id, dto),
    onSuccess: invalidate,
    onError: onErr("Failed to save"),
  });
  const compAddMut = useMutation({
    mutationFn: (row: any) => addComp(v._id, row),
    onSuccess: invalidate,
    onError: onErr("Failed to add peer"),
  });
  const compRemoveMut = useMutation({
    mutationFn: (index: number) => removeComp(v._id, index),
    onSuccess: invalidate,
  });
  const discountMut = useMutation({
    mutationFn: (n: number) => updatePrivateDiscount(v._id, n),
    onSuccess: invalidate,
  });
  const precAddMut = useMutation({
    mutationFn: (row: any) => addPrecedent(v._id, row),
    onSuccess: invalidate,
    onError: onErr("Failed to add precedent"),
  });
  const precRemoveMut = useMutation({
    mutationFn: (index: number) => removePrecedent(v._id, index),
    onSuccess: invalidate,
  });
  const navMut = useMutation({
    mutationFn: (dto: any) => updateNav(v._id, dto),
    onSuccess: invalidate,
  });
  const ddmMut = useMutation({
    mutationFn: (dto: any) => updateDdm(v._id, dto),
    onSuccess: invalidate,
  });
  const blendMut = useMutation({
    mutationFn: ({ method, dto }: { method: MethodKey; dto: any }) =>
      updateBlendEntry(v._id, method, dto),
    onSuccess: invalidate,
  });
  const snapshotMut = useMutation({
    mutationFn: () => snapshotVersion(v._id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Version snapshotted" });
    },
  });

  // Live client-side recalculation over the draft state — instant
  // feedback while typing, exactly matching the original feel.
  const liveModel = { ...v, dcf: dcfDraft };
  const dcf = runDcf(dcfDraft);
  const comps = runComps(liveModel);
  const prec = runPrecedents(liveModel);
  const blend = blendedValuation(liveModel);

  const setDcfField = (k: keyof DCFAssumptions, val: number) =>
    setDcfDraft((d) => ({ ...d, [k]: val }));
  const saveDcfField = (k: keyof DCFAssumptions) =>
    dcfMut.mutate({ [k]: dcfDraft[k] } as any);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Company Valuation</h1>
          <p className="text-sm text-muted-foreground">
            Five independent methods, blended into one negotiation range. Every
            input recalculates instantly.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {allModels.length > 1 && (
            <Select value={v._id} onValueChange={onSwitch}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allModels.map((x, i) => (
                  <SelectItem key={x._id} value={x._id}>
                    Model {i + 1} · {x.createdAt.slice(0, 10)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" disabled={creating} onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-1" />
            New model
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              toast({ title: "Valuation report downloading…" });
              downloadValuationReport(v._id);
            }}
          >
            <Download className="h-4 w-4 mr-1" />
            Report
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Kpi
          label="Blended enterprise value"
          value={money(blend.ev, v.currency)}
          icon={Calculator}
          tone="from-violet-500 to-indigo-500"
        />
        <Kpi
          label="Equity value"
          value={money(blend.equity, v.currency)}
          icon={Coins}
          tone="from-emerald-500 to-teal-500"
        />
        <Kpi
          label="Negotiation range"
          value={`${money(blend.negotiationFloor, v.currency)} – ${money(blend.negotiationCeiling, v.currency)}`}
          icon={Scale}
          tone="from-sky-500 to-cyan-500"
        />
        <Kpi
          label="Implied EV/EBITDA"
          value={`${blend.impliedEvEbitda.toFixed(1)}x`}
          icon={TrendingUp}
          tone="from-amber-500 to-orange-500"
        />
      </div>

      <Tabs defaultValue="dcf">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="dcf">DCF</TabsTrigger>
          <TabsTrigger value="comps">Comparables</TabsTrigger>
          <TabsTrigger value="precedents">Precedents</TabsTrigger>
          <TabsTrigger value="nav">NAV</TabsTrigger>
          <TabsTrigger value="ddm">DDM</TabsTrigger>
          <TabsTrigger value="sensitivity">Sensitivity</TabsTrigger>
          <TabsTrigger value="blend">Weighted blending</TabsTrigger>
          <TabsTrigger value="field">Football field</TabsTrigger>
          <TabsTrigger value="history">Version history</TabsTrigger>
        </TabsList>

        {/* ── DCF ── */}
        <TabsContent value="dcf" className="space-y-3 pt-4">
          <Card>
            <CardContent className="p-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Num
                label="Base revenue"
                value={dcfDraft.baseRevenue}
                onChange={(n) => setDcfField("baseRevenue", n)}
                onBlur={() => saveDcfField("baseRevenue")}
              />
              <Num
                label="Growth %"
                value={dcfDraft.growthRate}
                onChange={(n) => setDcfField("growthRate", n)}
                onBlur={() => saveDcfField("growthRate")}
              />
              <Num
                label="EBITDA margin %"
                value={dcfDraft.ebitdaMargin}
                onChange={(n) => setDcfField("ebitdaMargin", n)}
                onBlur={() => saveDcfField("ebitdaMargin")}
              />
              <Num
                label="Tax %"
                value={dcfDraft.taxRate}
                onChange={(n) => setDcfField("taxRate", n)}
                onBlur={() => saveDcfField("taxRate")}
              />
              <Num
                label="D&A % rev"
                value={dcfDraft.daPct}
                onChange={(n) => setDcfField("daPct", n)}
                onBlur={() => saveDcfField("daPct")}
              />
              <Num
                label="Capex % rev"
                value={dcfDraft.capexPct}
                onChange={(n) => setDcfField("capexPct", n)}
                onBlur={() => saveDcfField("capexPct")}
              />
              <Num
                label="ΔWC % Δrev"
                value={dcfDraft.wcPct}
                onChange={(n) => setDcfField("wcPct", n)}
                onBlur={() => saveDcfField("wcPct")}
              />
              <Num
                label="WACC %"
                value={dcfDraft.wacc}
                onChange={(n) => setDcfField("wacc", n)}
                onBlur={() => saveDcfField("wacc")}
              />
              <Num
                label="Terminal growth %"
                value={dcfDraft.terminalGrowth}
                onChange={(n) => setDcfField("terminalGrowth", n)}
                onBlur={() => saveDcfField("terminalGrowth")}
              />
              <Num
                label="Net debt"
                value={dcfDraft.netDebt}
                onChange={(n) => setDcfField("netDebt", n)}
                onBlur={() => saveDcfField("netDebt")}
              />
              <Num
                label="Shares outstanding"
                value={dcfDraft.sharesOutstanding}
                onChange={(n) => setDcfField("sharesOutstanding", n)}
                onBlur={() => saveDcfField("sharesOutstanding")}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {["Line", "Y1", "Y2", "Y3", "Y4", "Y5"].map((h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(
                    [
                      ["Revenue", (y: any) => y.revenue],
                      ["EBITDA", (y: any) => y.ebitda],
                      ["D&A", (y: any) => -y.da],
                      ["EBIT", (y: any) => y.ebit],
                      ["Tax", (y: any) => -y.tax],
                      ["NOPAT", (y: any) => y.nopat],
                      ["Capex", (y: any) => -y.capex],
                      ["ΔWorking capital", (y: any) => -y.wc],
                      ["Free cash flow", (y: any) => y.fcf],
                      ["PV of FCF", (y: any) => y.pv],
                    ] as const
                  ).map(([label, fn]) => (
                    <TableRow key={label}>
                      <TableCell className="font-medium text-xs">
                        {label}
                      </TableCell>
                      {dcf.years.map((y) => (
                        <TableCell
                          key={y.year}
                          className="text-xs tabular-nums"
                        >
                          {money(fn(y), v.currency)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="font-medium text-xs">
                      Discount factor
                    </TableCell>
                    {dcf.years.map((y) => (
                      <TableCell key={y.year} className="text-xs tabular-nums">
                        {y.df.toFixed(3)}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-4">
            <Mini
              label="PV of explicit FCF"
              value={money(dcf.pvExplicit, v.currency)}
            />
            <Mini
              label="Terminal value"
              value={money(dcf.terminalValue, v.currency)}
            />
            <Mini
              label="PV of terminal value"
              value={money(dcf.pvTerminal, v.currency)}
            />
            <Mini
              label="DCF enterprise value"
              value={money(dcf.ev, v.currency)}
              highlight
            />
          </div>
        </TabsContent>

        {/* ── Comparables ── */}
        <TabsContent value="comps" className="space-y-3 pt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead>Market cap</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>EBITDA</TableHead>
                    <TableHead>EV/Rev</TableHead>
                    <TableHead>EV/EBITDA</TableHead>
                    <TableHead>Margin</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {v.comps.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-medium">
                        {c.company}
                      </TableCell>
                      <TableCell className="text-xs">{c.country}</TableCell>
                      <TableCell className="text-xs">{c.sector}</TableCell>
                      <TableCell className="text-xs">
                        {money(c.marketCap, v.currency)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {money(c.revenue, v.currency)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {money(c.ebitda, v.currency)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.revenue
                          ? (c.marketCap / c.revenue).toFixed(2)
                          : "0.00"}
                        x
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.ebitda ? (c.marketCap / c.ebitda).toFixed(1) : "0.0"}
                        x
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.revenue ? pct((c.ebitda / c.revenue) * 100) : "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => compRemoveMut.mutate(i)}
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
          <AddCompRow
            disabled={compAddMut.isPending}
            onAdd={(row) => compAddMut.mutate(row)}
          />
          <div className="grid gap-3 sm:grid-cols-4">
            <Mini
              label="Mean EV/Revenue"
              value={`${comps.evRevMean.toFixed(2)}x`}
            />
            <Mini
              label="Median EV/EBITDA"
              value={`${comps.evEbitdaMedian.toFixed(1)}x`}
            />
            <Card>
              <CardContent className="p-3">
                <Label className="text-xs">Private-company discount %</Label>
                <Input
                  type="number"
                  className="mt-1 h-8"
                  defaultValue={v.privateDiscount}
                  onBlur={(e) => discountMut.mutate(Number(e.target.value))}
                />
              </CardContent>
            </Card>
            <Mini
              label="Comparables EV"
              value={money(comps.ev, v.currency)}
              highlight
            />
          </div>
        </TabsContent>

        {/* ── Precedents ── */}
        <TabsContent value="precedents" className="space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">
            Comparable transactions — add real deals as they become known, or
            enter market-known precedents.
          </p>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Target</TableHead>
                    <TableHead>Acquirer</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Deal value</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>EBITDA</TableHead>
                    <TableHead>EV/EBITDA</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {v.precedents.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-medium">
                        {p.target}
                      </TableCell>
                      <TableCell className="text-xs">{p.acquirer}</TableCell>
                      <TableCell className="text-xs">{p.year}</TableCell>
                      <TableCell className="text-xs">
                        {money(p.value, v.currency)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {money(p.revenue, v.currency)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {money(p.ebitda, v.currency)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {p.ebitda ? (p.value / p.ebitda).toFixed(1) : "0.0"}x
                      </TableCell>
                      <TableCell className="text-xs">{p.sector}</TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => precRemoveMut.mutate(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {v.precedents.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center text-xs text-muted-foreground py-6"
                      >
                        No precedent transactions yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <AddPrecedentRow
            disabled={precAddMut.isPending}
            onAdd={(row) => precAddMut.mutate(row)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Mini
              label="Median transaction multiple"
              value={`${prec.medianMultiple.toFixed(1)}x`}
            />
            <Mini
              label="Precedent EV"
              value={money(prec.ev, v.currency)}
              highlight
            />
          </div>
        </TabsContent>

        {/* ── NAV ── */}
        <TabsContent value="nav" className="space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">
            Adjusted net asset value — serves as the floor valuation.
          </p>
          <Card>
            <CardContent className="p-4 grid gap-3 sm:grid-cols-4">
              <Num
                label="Book assets"
                value={v.nav.bookAssets}
                onChange={() => {}}
                onBlur={(n) => navMut.mutate({ bookAssets: n })}
                editable
                defaultValue={v.nav.bookAssets}
              />
              <Num
                label="PP&E revaluation uplift"
                value={v.nav.ppeUplift}
                onChange={() => {}}
                onBlur={(n) => navMut.mutate({ ppeUplift: n })}
                editable
                defaultValue={v.nav.ppeUplift}
              />
              <Num
                label="Intangible write-down"
                value={v.nav.intangibleWriteDown}
                onChange={() => {}}
                onBlur={(n) => navMut.mutate({ intangibleWriteDown: n })}
                editable
                defaultValue={v.nav.intangibleWriteDown}
              />
              <Num
                label="Liabilities"
                value={v.nav.liabilities}
                onChange={() => {}}
                onBlur={(n) => navMut.mutate({ liabilities: n })}
                editable
                defaultValue={v.nav.liabilities}
              />
            </CardContent>
          </Card>
          <div className="grid gap-3 sm:grid-cols-2">
            <Mini
              label="Adjusted NAV (equity)"
              value={money(v.navResult.equity, v.currency)}
            />
            <Mini
              label="NAV enterprise value"
              value={money(v.navResult.ev, v.currency)}
              highlight
            />
          </div>
        </TabsContent>

        {/* ── DDM ── */}
        <TabsContent value="ddm" className="space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">
            Gordon Growth Model for dividend-paying companies.
          </p>
          <Card>
            <CardContent className="p-4 grid gap-3 sm:grid-cols-3">
              <Num
                label="Expected dividend"
                value={v.ddm.dividend}
                onChange={() => {}}
                onBlur={(n) => ddmMut.mutate({ dividend: n })}
                editable
                defaultValue={v.ddm.dividend}
              />
              <Num
                label="Dividend growth %"
                value={v.ddm.growth}
                onChange={() => {}}
                onBlur={(n) => ddmMut.mutate({ growth: n })}
                editable
                defaultValue={v.ddm.growth}
              />
              <Num
                label="Required return %"
                value={v.ddm.requiredReturn}
                onChange={() => {}}
                onBlur={(n) => ddmMut.mutate({ requiredReturn: n })}
                editable
                defaultValue={v.ddm.requiredReturn}
              />
            </CardContent>
          </Card>
          <div className="grid gap-3 sm:grid-cols-2">
            <Mini
              label="DDM equity value"
              value={money(v.ddmResult.equity, v.currency)}
            />
            <Mini
              label="DDM enterprise value"
              value={money(v.ddmResult.ev, v.currency)}
              highlight
            />
          </div>
        </TabsContent>

        {/* ── Sensitivity ── */}
        <TabsContent value="sensitivity" className="space-y-4 pt-4">
          <Matrix
            v={liveModel}
            title="WACC vs terminal growth"
            rowKey="wacc"
            colKey="terminalGrowth"
            rowSteps={[-2, -1, 0, 1, 2]}
            colSteps={[-1, -0.5, 0, 0.5, 1]}
            base={dcf.ev}
            currency={v.currency}
          />
          <Matrix
            v={liveModel}
            title="WACC vs EBITDA margin"
            rowKey="wacc"
            colKey="ebitdaMargin"
            rowSteps={[-2, -1, 0, 1, 2]}
            colSteps={[-3, -1.5, 0, 1.5, 3]}
            base={dcf.ev}
            currency={v.currency}
          />
          <Matrix
            v={liveModel}
            title="Revenue growth vs EBITDA margin"
            rowKey="growthRate"
            colKey="ebitdaMargin"
            rowSteps={[-4, -2, 0, 2, 4]}
            colSteps={[-3, -1.5, 0, 1.5, 3]}
            base={dcf.ev}
            currency={v.currency}
          />
        </TabsContent>

        {/* ── Blending ── */}
        <TabsContent value="blend" className="space-y-3 pt-4">
          {blend.totalWeight !== 100 && (
            <p className="text-xs text-amber-600">
              Weights total {blend.totalWeight}% — the blend is normalised to
              100% for the calculation.
            </p>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {METHOD_KEYS.map((k) => {
              const m = v.blend[k];
              return (
                <Card key={k} className={m.enabled ? "" : "opacity-60"}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{k}</p>
                        <p className="text-xs text-muted-foreground">
                          {money(methodEv(liveModel, k), v.currency)} EV
                        </p>
                      </div>
                      <Switch
                        checked={m.enabled}
                        onCheckedChange={(c) =>
                          blendMut.mutate({ method: k, dto: { enabled: c } })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Weight %</Label>
                        <Input
                          type="number"
                          className="h-8"
                          defaultValue={m.weight}
                          onBlur={(e) =>
                            blendMut.mutate({
                              method: k,
                              dto: { weight: Number(e.target.value) },
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Confidence</Label>
                        <Select
                          value={m.confidence}
                          onValueChange={(c) =>
                            blendMut.mutate({
                              method: k,
                              dto: { confidence: c as any },
                            })
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["High", "Medium", "Low"].map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Rationale</Label>
                      <Textarea
                        rows={2}
                        defaultValue={m.rationale}
                        onBlur={(e) =>
                          blendMut.mutate({
                            method: k,
                            dto: { rationale: e.target.value },
                          })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Card>
            <CardContent className="p-5 space-y-2">
              <p className="font-medium">Enterprise-to-equity bridge</p>
              <BridgeRow
                label="Blended enterprise value"
                value={money(blend.ev, v.currency)}
              />
              <BridgeRow
                label="Less: net debt"
                value={`(${money(v.dcf.netDebt, v.currency)})`}
              />
              <BridgeRow
                label="Equity value"
                value={money(blend.equity, v.currency)}
                bold
              />
              <BridgeRow
                label="Value per share"
                value={money(blend.perShare, v.currency)}
              />
              <BridgeRow
                label="Implied EV/Revenue"
                value={`${blend.impliedEvRev.toFixed(2)}x`}
              />
            </CardContent>
          </Card>
          <Button
            variant="outline"
            disabled={snapshotMut.isPending}
            onClick={() => snapshotMut.mutate()}
          >
            <History className="h-4 w-4 mr-1" />
            Snapshot this version
          </Button>
        </TabsContent>

        {/* ── Football field ── */}
        <TabsContent value="field" className="space-y-3 pt-4">
          <FootballField v={liveModel} currency={v.currency} />
        </TabsContent>

        {/* ── History ── */}
        <TabsContent value="history" className="pt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Blended EV</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...v.history].reverse().map((h) => (
                    <TableRow key={h.version}>
                      <TableCell>v{h.version}</TableCell>
                      <TableCell className="text-xs">{h.at}</TableCell>
                      <TableCell className="text-xs">{h.change}</TableCell>
                      <TableCell className="text-xs font-medium">
                        {money(h.blendedEv, v.currency)}
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

// ───────────────────────────── pieces ──

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
          <p className="text-base font-bold truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Num({
  label,
  value,
  onChange,
  onBlur,
  editable,
  defaultValue,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  onBlur: (n: number) => void;
  editable?: boolean;
  defaultValue?: number;
}) {
  if (editable) {
    return (
      <div>
        <Label className="text-xs">{label}</Label>
        <Input
          type="number"
          className="h-8 mt-1"
          defaultValue={defaultValue}
          onBlur={(e) => onBlur(Number(e.target.value))}
        />
      </div>
    );
  }
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        className="h-8 mt-1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onBlur={(e) => onBlur(Number(e.target.value))}
      />
    </div>
  );
}

function Mini({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/50" : ""}>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`font-bold ${highlight ? "text-primary" : ""}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function BridgeRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex justify-between border-b last:border-0 py-1.5 text-sm ${bold ? "font-bold" : ""}`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function AddCompRow({
  onAdd,
  disabled,
}: {
  onAdd: (r: any) => void;
  disabled?: boolean;
}) {
  const [f, setF] = useState({
    company: "",
    country: "",
    sector: "",
    marketCap: "",
    revenue: "",
    ebitda: "",
  });
  return (
    <Card>
      <CardContent className="p-4 flex flex-wrap items-end gap-2">
        {(
          [
            "company",
            "country",
            "sector",
            "marketCap",
            "revenue",
            "ebitda",
          ] as const
        ).map((k) => (
          <div key={k} className="w-36">
            <Label className="text-xs capitalize">
              {k.replace(/([A-Z])/g, " $1")}
            </Label>
            <Input
              className="h-8"
              value={(f as any)[k]}
              onChange={(e) => setF({ ...f, [k]: e.target.value })}
            />
          </div>
        ))}
        <Button
          size="sm"
          disabled={disabled}
          onClick={() => {
            if (!f.company.trim()) {
              toast({ title: "Company required", variant: "destructive" });
              return;
            }
            onAdd({
              company: f.company,
              country: f.country,
              sector: f.sector,
              marketCap: Number(f.marketCap) || 0,
              revenue: Number(f.revenue) || 0,
              ebitda: Number(f.ebitda) || 0,
            });
            setF({
              company: "",
              country: "",
              sector: "",
              marketCap: "",
              revenue: "",
              ebitda: "",
            });
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add peer
        </Button>
      </CardContent>
    </Card>
  );
}

function AddPrecedentRow({
  onAdd,
  disabled,
}: {
  onAdd: (r: any) => void;
  disabled?: boolean;
}) {
  const [f, setF] = useState({
    target: "",
    acquirer: "",
    year: String(new Date().getFullYear()),
    value: "",
    revenue: "",
    ebitda: "",
    sector: "",
  });
  return (
    <Card>
      <CardContent className="p-4 flex flex-wrap items-end gap-2">
        {(
          [
            "target",
            "acquirer",
            "year",
            "value",
            "revenue",
            "ebitda",
            "sector",
          ] as const
        ).map((k) => (
          <div key={k} className="w-32">
            <Label className="text-xs capitalize">{k}</Label>
            <Input
              className="h-8"
              type={
                k === "year" ||
                k === "value" ||
                k === "revenue" ||
                k === "ebitda"
                  ? "number"
                  : "text"
              }
              value={(f as any)[k]}
              onChange={(e) => setF({ ...f, [k]: e.target.value })}
            />
          </div>
        ))}
        <Button
          size="sm"
          disabled={disabled}
          onClick={() => {
            if (!f.target.trim()) {
              toast({ title: "Target required", variant: "destructive" });
              return;
            }
            onAdd({
              target: f.target,
              acquirer: f.acquirer,
              year: Number(f.year) || new Date().getFullYear(),
              value: Number(f.value) || 0,
              revenue: Number(f.revenue) || 0,
              ebitda: Number(f.ebitda) || 0,
              sector: f.sector,
            });
            setF({
              target: "",
              acquirer: "",
              year: String(new Date().getFullYear()),
              value: "",
              revenue: "",
              ebitda: "",
              sector: "",
            });
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add precedent
        </Button>
      </CardContent>
    </Card>
  );
}

function Matrix({
  v,
  title,
  rowKey,
  colKey,
  rowSteps,
  colSteps,
  base,
  currency,
}: {
  v: any;
  title: string;
  rowKey: keyof DCFAssumptions;
  colKey: keyof DCFAssumptions;
  rowSteps: number[];
  colSteps: number[];
  base: number;
  currency: string;
}) {
  const m = useMemo(
    () => sensitivityMatrix(v, rowKey, colKey, rowSteps, colSteps),
    [v, rowKey, colKey, rowSteps, colSteps],
  );
  const flat = m.flat();
  const min = Math.min(...flat);
  const max = Math.max(...flat);
  const swing = base ? ((max - min) / base) * 100 : 0;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <p className="font-medium">{title}</p>
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr>
                <th className="p-2 text-left text-muted-foreground">
                  {String(rowKey)} \ {String(colKey)}
                </th>
                {colSteps.map((c) => (
                  <th key={c} className="p-2 text-muted-foreground">
                    {((v.dcf[colKey] as number) + c).toFixed(1)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowSteps.map((r, ri) => (
                <tr key={r}>
                  <td className="p-2 text-muted-foreground">
                    {((v.dcf[rowKey] as number) + r).toFixed(1)}
                  </td>
                  {colSteps.map((c, ci) => {
                    const val = m[ri][ci];
                    const isBase = r === 0 && c === 0;
                    const above = val > base;
                    return (
                      <td
                        key={c}
                        className={`p-2 text-center tabular-nums border ${isBase ? "ring-2 ring-primary font-bold" : ""} ${above ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-700"}`}
                      >
                        {money(val, currency)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Across this range the enterprise value swings from{" "}
          {money(min, currency)} to {money(max, currency)} — about{" "}
          {swing.toFixed(0)}% of the base case.{" "}
          {swing > 60
            ? "That is a wide spread: the valuation is highly sensitive to these two assumptions, so both should be evidenced before negotiation."
            : "That is a contained spread, so the base case holds up reasonably well under stress."}
        </p>
      </CardContent>
    </Card>
  );
}

function FootballField({ v, currency }: { v: any; currency: string }) {
  const blend = blendedValuation(v);
  const active = METHOD_KEYS.filter((k) => v.blend[k].enabled);
  const ranges = active.map((k) => ({ key: k, ...methodRange(v, k) }));
  const all = [
    ...ranges.flatMap((r) => [r.low, r.high]),
    blend.negotiationFloor,
    blend.negotiationCeiling,
  ];
  const min = Math.min(...all) * 0.9;
  const max = Math.max(...all) * 1.05;
  const posn = (x: number) => ((x - min) / (max - min)) * 100;

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <p className="font-medium">
          Football field — valuation range by method
        </p>
        <div className="space-y-3">
          {ranges.map((r) => (
            <div key={r.key} className="flex items-center gap-3">
              <span className="w-28 text-xs shrink-0">{r.key}</span>
              <div className="relative flex-1 h-6 bg-muted rounded">
                <div
                  className="absolute h-6 rounded bg-gradient-to-r from-primary/50 to-primary"
                  style={{
                    left: `${posn(r.low)}%`,
                    width: `${posn(r.high) - posn(r.low)}%`,
                  }}
                />
                <div
                  className="absolute h-6 w-0.5 bg-foreground"
                  style={{ left: `${posn(r.mid)}%` }}
                />
              </div>
              <span className="w-40 text-right text-xs tabular-nums shrink-0">
                {money(r.low, currency)} – {money(r.high, currency)}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-3 pt-2 border-t">
            <span className="w-28 text-xs font-semibold shrink-0">Blended</span>
            <div className="relative flex-1 h-6 bg-muted rounded">
              <div
                className="absolute h-6 rounded bg-gradient-to-r from-emerald-500 to-teal-500"
                style={{
                  left: `${posn(blend.low)}%`,
                  width: `${posn(blend.high) - posn(blend.low)}%`,
                }}
              />
            </div>
            <span className="w-40 text-right text-xs tabular-nums font-semibold shrink-0">
              {money(blend.low, currency)} – {money(blend.high, currency)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-28 text-xs font-semibold shrink-0">
              Negotiation
            </span>
            <div className="relative flex-1 h-6 bg-muted rounded">
              <div
                className="absolute h-6 rounded border-2 border-dashed border-amber-500 bg-amber-500/15"
                style={{
                  left: `${posn(blend.negotiationFloor)}%`,
                  width: `${posn(blend.negotiationCeiling) - posn(blend.negotiationFloor)}%`,
                }}
              />
            </div>
            <span className="w-40 text-right text-xs tabular-nums shrink-0">
              {money(blend.negotiationFloor, currency)} –{" "}
              {money(blend.negotiationCeiling, currency)}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Recommended negotiation range: floor at the 25th percentile of all
          method outcomes, ceiling at the blended enterprise value plus a 15%
          control premium.
        </p>
      </CardContent>
    </Card>
  );
}
