import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Download, History, Calculator, Scale, TrendingUp, Coins } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useDealIntel, mutateDealIntel, id, today, money, pct,
  Valuation, DCFAssumptions, MethodKey, METHOD_KEYS,
  runDcf, runComps, runPrecedents, runNav, runDdm,
  methodEv, methodRange, blendedValuation, compsStats, sensitivityMatrix,
} from "@/lib/dealIntelligenceStore";
import { blankValuation } from "@/lib/dealIntelligenceStore";
import {
  IntelSubjectPicker,
  ownSubject,
  type IntelSubject,
} from "@/components/grc/IntelSubjectPicker";

export default function CompanyValuation() {
  const s = useDealIntel();
  const [subject, setSubject] = useState<IntelSubject>(() => ownSubject());
  const [selId, setSelId] = useState<string>("");

  const subjectModels = s.valuations.filter((x) => x.company === subject.label);
  const v = subjectModels.find((x) => x.id === selId) ?? subjectModels[0];

  const createModel = () => {
    const model = blankValuation(subject.label);
    mutateDealIntel((st) => ({ ...st, valuations: [...st.valuations, model] }));
    setSelId(model.id);
    toast({
      title: "Valuation model created",
      description: `New model for ${subject.label} — enter assumptions to start.`,
    });
  };

  if (!v) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Company Valuation</h1>
          <p className="text-sm text-muted-foreground">
            Value your own company or any client — five methods, one blended range.
          </p>
        </div>
        <IntelSubjectPicker
          value={subject}
          onChange={setSubject}
          existing={s.valuations.map((x) => x.company)}
        />
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          No valuation model for <span className="font-medium text-foreground">{subject.label}</span> yet.
        </CardContent></Card>
        <Button onClick={createModel}>
          <Plus className="h-4 w-4 mr-1" />New valuation for {subject.label}
        </Button>
      </div>
    );
  }

  const patch = (fn: (x: Valuation) => Valuation, change?: string) =>
    mutateDealIntel((st) => ({
      ...st,
      valuations: st.valuations.map((x) => {
        if (x.id !== v.id) return x;
        const next = { ...fn(x), updatedAt: new Date().toISOString() };
        if (change) {
          next.history = [
            ...next.history,
            {
              version: next.history.length + 1,
              at: today(),
              change,
              blendedEv: blendedValuation(next).ev,
            },
          ];
        }
        return next;
      }),
    }));

  const setDcf = (k: keyof DCFAssumptions, val: number) =>
    patch((x) => ({ ...x, dcf: { ...x.dcf, [k]: val } }));

  const dcf = runDcf(v.dcf);
  const comps = runComps(v);
  const prec = runPrecedents(v);
  const nav = runNav(v);
  const ddm = runDdm(v);
  const blend = blendedValuation(v);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Company Valuation</h1>
          <p className="text-sm text-muted-foreground">
            Five independent methods, blended into one negotiation range. Every input recalculates instantly.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <IntelSubjectPicker
            value={subject}
            onChange={(sub) => { setSubject(sub); setSelId(""); }}
            existing={s.valuations.map((x) => x.company)}
          />
          {subjectModels.length > 1 && (
            <Select value={v.id} onValueChange={setSelId}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {subjectModels.map((x, i) => (
                  <SelectItem key={x.id} value={x.id}>Model {i + 1} · {x.createdAt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={createModel}>
            <Plus className="h-4 w-4 mr-1" />New model
          </Button>
          <Button variant="outline" onClick={() => { toast({ title: "Valuation report queued" }); window.print(); }}>
            <Download className="h-4 w-4 mr-1" />Report
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 md:grid-cols-4">
        <Kpi label="Blended enterprise value" value={money(blend.ev, v.currency)} icon={Calculator} tone="from-violet-500 to-indigo-500" />
        <Kpi label="Equity value" value={money(blend.equity, v.currency)} icon={Coins} tone="from-emerald-500 to-teal-500" />
        <Kpi label="Negotiation range" value={`${money(blend.negotiationFloor, v.currency)} – ${money(blend.negotiationCeiling, v.currency)}`} icon={Scale} tone="from-sky-500 to-cyan-500" />
        <Kpi label="Implied EV/EBITDA" value={`${blend.impliedEvEbitda.toFixed(1)}x`} icon={TrendingUp} tone="from-amber-500 to-orange-500" />
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
          <Card><CardContent className="p-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Num label="Base revenue" value={v.dcf.baseRevenue} onChange={(n) => setDcf("baseRevenue", n)} />
            <Num label="Growth %" value={v.dcf.growthRate} onChange={(n) => setDcf("growthRate", n)} />
            <Num label="EBITDA margin %" value={v.dcf.ebitdaMargin} onChange={(n) => setDcf("ebitdaMargin", n)} />
            <Num label="Tax %" value={v.dcf.taxRate} onChange={(n) => setDcf("taxRate", n)} />
            <Num label="D&A % rev" value={v.dcf.daPct} onChange={(n) => setDcf("daPct", n)} />
            <Num label="Capex % rev" value={v.dcf.capexPct} onChange={(n) => setDcf("capexPct", n)} />
            <Num label="ΔWC % Δrev" value={v.dcf.wcPct} onChange={(n) => setDcf("wcPct", n)} />
            <Num label="WACC %" value={v.dcf.wacc} onChange={(n) => setDcf("wacc", n)} />
            <Num label="Terminal growth %" value={v.dcf.terminalGrowth} onChange={(n) => setDcf("terminalGrowth", n)} />
            <Num label="Net debt" value={v.dcf.netDebt} onChange={(n) => setDcf("netDebt", n)} />
            <Num label="Shares outstanding" value={v.dcf.sharesOutstanding} onChange={(n) => setDcf("sharesOutstanding", n)} />
          </CardContent></Card>

          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                {["Line", "Y1", "Y2", "Y3", "Y4", "Y5"].map((h) => <TableHead key={h}>{h}</TableHead>)}
              </TableRow></TableHeader>
              <TableBody>
                {([
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
                ] as const).map(([label, fn]) => (
                  <TableRow key={label}>
                    <TableCell className="font-medium text-xs">{label}</TableCell>
                    {dcf.years.map((y) => (
                      <TableCell key={y.year} className="text-xs tabular-nums">{money(fn(y), v.currency)}</TableCell>
                    ))}
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="font-medium text-xs">Discount factor</TableCell>
                  {dcf.years.map((y) => (
                    <TableCell key={y.year} className="text-xs tabular-nums">{y.df.toFixed(3)}</TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </CardContent></Card>

          <div className="grid gap-3 sm:grid-cols-4">
            <Mini label="PV of explicit FCF" value={money(dcf.pvExplicit, v.currency)} />
            <Mini label="Terminal value" value={money(dcf.terminalValue, v.currency)} />
            <Mini label="PV of terminal value" value={money(dcf.pvTerminal, v.currency)} />
            <Mini label="DCF enterprise value" value={money(dcf.ev, v.currency)} highlight />
          </div>
        </TabsContent>

        {/* ── Comparables ── */}
        <TabsContent value="comps" className="space-y-3 pt-4">
          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Company</TableHead><TableHead>Country</TableHead><TableHead>Sector</TableHead>
                <TableHead>Market cap</TableHead><TableHead>Revenue</TableHead><TableHead>EBITDA</TableHead>
                <TableHead>EV/Rev</TableHead><TableHead>EV/EBITDA</TableHead><TableHead>Margin</TableHead><TableHead />
              </TableRow></TableHeader>
              <TableBody>
                {v.comps.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs font-medium">{c.company}</TableCell>
                    <TableCell className="text-xs">{c.country}</TableCell>
                    <TableCell className="text-xs">{c.sector}</TableCell>
                    <TableCell className="text-xs">{money(c.marketCap, v.currency)}</TableCell>
                    <TableCell className="text-xs">{money(c.revenue, v.currency)}</TableCell>
                    <TableCell className="text-xs">{money(c.ebitda, v.currency)}</TableCell>
                    <TableCell className="text-xs">{(c.marketCap / c.revenue).toFixed(2)}x</TableCell>
                    <TableCell className="text-xs">{(c.marketCap / c.ebitda).toFixed(1)}x</TableCell>
                    <TableCell className="text-xs">{pct((c.ebitda / c.revenue) * 100)}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => patch((x) => ({ ...x, comps: x.comps.filter((y) => y.id !== c.id) }), `Removed peer ${c.company}`)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
          <AddCompRow onAdd={(row) => patch((x) => ({ ...x, comps: [...x.comps, row] }), `Added peer ${row.company}`)} />
          <div className="grid gap-3 sm:grid-cols-4">
            <Mini label="Mean EV/Revenue" value={`${comps.evRevMean.toFixed(2)}x`} />
            <Mini label="Median EV/EBITDA" value={`${comps.evEbitdaMedian.toFixed(1)}x`} />
            <Card><CardContent className="p-3">
              <Label className="text-xs">Private-company discount %</Label>
              <Input type="number" className="mt-1 h-8" value={v.privateDiscount}
                onChange={(e) => patch((x) => ({ ...x, privateDiscount: Number(e.target.value) }))} />
            </CardContent></Card>
            <Mini label="Comparables EV" value={money(comps.ev, v.currency)} highlight />
          </div>
        </TabsContent>

        {/* ── Precedents ── */}
        <TabsContent value="precedents" className="space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">
            Comparable transactions from the deal database, adjusted for size and sector.
          </p>
          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Target</TableHead><TableHead>Acquirer</TableHead><TableHead>Year</TableHead>
                <TableHead>Deal value</TableHead><TableHead>Revenue</TableHead><TableHead>EBITDA</TableHead>
                <TableHead>EV/EBITDA</TableHead><TableHead>Sector</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {v.precedents.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs font-medium">{p.target}</TableCell>
                    <TableCell className="text-xs">{p.acquirer}</TableCell>
                    <TableCell className="text-xs">{p.year}</TableCell>
                    <TableCell className="text-xs">{money(p.value, v.currency)}</TableCell>
                    <TableCell className="text-xs">{money(p.revenue, v.currency)}</TableCell>
                    <TableCell className="text-xs">{money(p.ebitda, v.currency)}</TableCell>
                    <TableCell className="text-xs">{(p.value / p.ebitda).toFixed(1)}x</TableCell>
                    <TableCell className="text-xs">{p.sector}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
          <div className="grid gap-3 sm:grid-cols-2">
            <Mini label="Median transaction multiple" value={`${prec.medianMultiple.toFixed(1)}x`} />
            <Mini label="Precedent EV" value={money(prec.ev, v.currency)} highlight />
          </div>
        </TabsContent>

        {/* ── NAV ── */}
        <TabsContent value="nav" className="space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">Adjusted net asset value — serves as the floor valuation.</p>
          <Card><CardContent className="p-4 grid gap-3 sm:grid-cols-4">
            <Num label="Book assets" value={v.nav.bookAssets} onChange={(n) => patch((x) => ({ ...x, nav: { ...x.nav, bookAssets: n } }))} />
            <Num label="PP&E revaluation uplift" value={v.nav.ppeUplift} onChange={(n) => patch((x) => ({ ...x, nav: { ...x.nav, ppeUplift: n } }))} />
            <Num label="Intangible write-down" value={v.nav.intangibleWriteDown} onChange={(n) => patch((x) => ({ ...x, nav: { ...x.nav, intangibleWriteDown: n } }))} />
            <Num label="Liabilities" value={v.nav.liabilities} onChange={(n) => patch((x) => ({ ...x, nav: { ...x.nav, liabilities: n } }))} />
          </CardContent></Card>
          <div className="grid gap-3 sm:grid-cols-2">
            <Mini label="Adjusted NAV (equity)" value={money(nav.equity, v.currency)} />
            <Mini label="NAV enterprise value" value={money(nav.ev, v.currency)} highlight />
          </div>
        </TabsContent>

        {/* ── DDM ── */}
        <TabsContent value="ddm" className="space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">Gordon Growth Model for dividend-paying companies.</p>
          <Card><CardContent className="p-4 grid gap-3 sm:grid-cols-3">
            <Num label="Expected dividend" value={v.ddm.dividend} onChange={(n) => patch((x) => ({ ...x, ddm: { ...x.ddm, dividend: n } }))} />
            <Num label="Dividend growth %" value={v.ddm.growth} onChange={(n) => patch((x) => ({ ...x, ddm: { ...x.ddm, growth: n } }))} />
            <Num label="Required return %" value={v.ddm.requiredReturn} onChange={(n) => patch((x) => ({ ...x, ddm: { ...x.ddm, requiredReturn: n } }))} />
          </CardContent></Card>
          <div className="grid gap-3 sm:grid-cols-2">
            <Mini label="DDM equity value" value={money(ddm.equity, v.currency)} />
            <Mini label="DDM enterprise value" value={money(ddm.ev, v.currency)} highlight />
          </div>
        </TabsContent>

        {/* ── Sensitivity ── */}
        <TabsContent value="sensitivity" className="space-y-4 pt-4">
          <Matrix v={v} title="WACC vs terminal growth" rowKey="wacc" colKey="terminalGrowth"
            rowSteps={[-2, -1, 0, 1, 2]} colSteps={[-1, -0.5, 0, 0.5, 1]} base={dcf.ev} />
          <Matrix v={v} title="WACC vs EBITDA margin" rowKey="wacc" colKey="ebitdaMargin"
            rowSteps={[-2, -1, 0, 1, 2]} colSteps={[-3, -1.5, 0, 1.5, 3]} base={dcf.ev} />
          <Matrix v={v} title="Revenue growth vs EBITDA margin" rowKey="growthRate" colKey="ebitdaMargin"
            rowSteps={[-4, -2, 0, 2, 4]} colSteps={[-3, -1.5, 0, 1.5, 3]} base={dcf.ev} />
        </TabsContent>

        {/* ── Blending ── */}
        <TabsContent value="blend" className="space-y-3 pt-4">
          {blend.totalWeight !== 100 && (
            <p className="text-xs text-amber-600">
              Weights total {blend.totalWeight}% — the blend is normalised to 100% for the calculation.
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
                        <p className="text-xs text-muted-foreground">{money(methodEv(v, k), v.currency)} EV</p>
                      </div>
                      <Switch checked={m.enabled}
                        onCheckedChange={(c) => patch((x) => ({ ...x, blend: { ...x.blend, [k]: { ...x.blend[k], enabled: c } } }), `${k} ${c ? "included in" : "excluded from"} blend`)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Weight %</Label>
                        <Input type="number" className="h-8" value={m.weight}
                          onChange={(e) => patch((x) => ({ ...x, blend: { ...x.blend, [k]: { ...x.blend[k], weight: Number(e.target.value) } } }))} />
                      </div>
                      <div>
                        <Label className="text-xs">Confidence</Label>
                        <Select value={m.confidence}
                          onValueChange={(c) => patch((x) => ({ ...x, blend: { ...x.blend, [k]: { ...x.blend[k], confidence: c as any } } }))}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["High", "Medium", "Low"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Rationale</Label>
                      <Textarea rows={2} value={m.rationale}
                        onChange={(e) => patch((x) => ({ ...x, blend: { ...x.blend, [k]: { ...x.blend[k], rationale: e.target.value } } }))} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Card><CardContent className="p-5 space-y-2">
            <p className="font-medium">Enterprise-to-equity bridge</p>
            <BridgeRow label="Blended enterprise value" value={money(blend.ev, v.currency)} />
            <BridgeRow label="Less: net debt" value={`(${money(v.dcf.netDebt, v.currency)})`} />
            <BridgeRow label="Equity value" value={money(blend.equity, v.currency)} bold />
            <BridgeRow label="Value per share" value={money(blend.perShare, v.currency)} />
            <BridgeRow label="Implied EV/Revenue" value={`${blend.impliedEvRev.toFixed(2)}x`} />
          </CardContent></Card>
          <Button variant="outline" onClick={() => patch((x) => x, "Blend assumptions committed to version history")}>
            <History className="h-4 w-4 mr-1" />Snapshot this version
          </Button>
        </TabsContent>

        {/* ── Football field ── */}
        <TabsContent value="field" className="space-y-3 pt-4">
          <FootballField v={v} />
        </TabsContent>

        {/* ── History ── */}
        <TabsContent value="history" className="pt-4">
          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Version</TableHead><TableHead>Date</TableHead>
                <TableHead>Change</TableHead><TableHead>Blended EV</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {[...v.history].reverse().map((h) => (
                  <TableRow key={h.version}>
                    <TableCell>v{h.version}</TableCell>
                    <TableCell className="text-xs">{h.at}</TableCell>
                    <TableCell className="text-xs">{h.change}</TableCell>
                    <TableCell className="text-xs font-medium">{money(h.blendedEv, v.currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ───────────────────────────── pieces ──

function Kpi({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone: string }) {
  return (
    <Card className="overflow-hidden"><CardContent className="p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} grid place-items-center shadow-sm shrink-0`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-base font-bold truncate">{value}</p>
      </div>
    </CardContent></Card>
  );
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" className="h-8 mt-1" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function Mini({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-primary/50" : ""}>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`font-bold ${highlight ? "text-primary" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function BridgeRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between border-b last:border-0 py-1.5 text-sm ${bold ? "font-bold" : ""}`}>
      <span>{label}</span><span className="tabular-nums">{value}</span>
    </div>
  );
}

function AddCompRow({ onAdd }: { onAdd: (r: any) => void }) {
  const [f, setF] = useState({ company: "", country: "", sector: "", marketCap: "", revenue: "", ebitda: "" });
  return (
    <Card><CardContent className="p-4 flex flex-wrap items-end gap-2">
      {(["company", "country", "sector", "marketCap", "revenue", "ebitda"] as const).map((k) => (
        <div key={k} className="w-36">
          <Label className="text-xs capitalize">{k.replace(/([A-Z])/g, " $1")}</Label>
          <Input className="h-8" value={(f as any)[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
        </div>
      ))}
      <Button size="sm" onClick={() => {
        if (!f.company.trim()) { toast({ title: "Company required", variant: "destructive" }); return; }
        onAdd({
          id: id("cmp"), company: f.company, country: f.country, sector: f.sector,
          marketCap: Number(f.marketCap) || 0, revenue: Number(f.revenue) || 0, ebitda: Number(f.ebitda) || 0,
        });
        setF({ company: "", country: "", sector: "", marketCap: "", revenue: "", ebitda: "" });
      }}>
        <Plus className="h-4 w-4 mr-1" />Add peer
      </Button>
    </CardContent></Card>
  );
}

function Matrix({
  v, title, rowKey, colKey, rowSteps, colSteps, base,
}: {
  v: Valuation; title: string; rowKey: keyof DCFAssumptions; colKey: keyof DCFAssumptions;
  rowSteps: number[]; colSteps: number[]; base: number;
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
    <Card><CardContent className="p-4 space-y-3">
      <p className="font-medium">{title}</p>
      <div className="overflow-x-auto">
        <table className="text-xs w-full">
          <thead>
            <tr>
              <th className="p-2 text-left text-muted-foreground">{String(rowKey)} \ {String(colKey)}</th>
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
                <td className="p-2 text-muted-foreground">{((v.dcf[rowKey] as number) + r).toFixed(1)}</td>
                {colSteps.map((c, ci) => {
                  const val = m[ri][ci];
                  const isBase = r === 0 && c === 0;
                  const above = val > base;
                  return (
                    <td key={c}
                      className={`p-2 text-center tabular-nums border ${isBase ? "ring-2 ring-primary font-bold" : ""} ${above ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-700"}`}>
                      {money(val, v.currency)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Across this range the enterprise value swings from {money(min, v.currency)} to {money(max, v.currency)} —
        about {swing.toFixed(0)}% of the base case. {swing > 60
          ? "That is a wide spread: the valuation is highly sensitive to these two assumptions, so both should be evidenced before negotiation."
          : "That is a contained spread, so the base case holds up reasonably well under stress."}
      </p>
    </CardContent></Card>
  );
}

function FootballField({ v }: { v: Valuation }) {
  const blend = blendedValuation(v);
  const active = METHOD_KEYS.filter((k) => v.blend[k].enabled);
  const ranges = active.map((k) => ({ key: k, ...methodRange(v, k) }));
  const all = [...ranges.flatMap((r) => [r.low, r.high]), blend.negotiationFloor, blend.negotiationCeiling];
  const min = Math.min(...all) * 0.9;
  const max = Math.max(...all) * 1.05;
  const posn = (x: number) => ((x - min) / (max - min)) * 100;

  return (
    <Card><CardContent className="p-5 space-y-4">
      <p className="font-medium">Football field — valuation range by method</p>
      <div className="space-y-3">
        {ranges.map((r) => (
          <div key={r.key} className="flex items-center gap-3">
            <span className="w-28 text-xs shrink-0">{r.key}</span>
            <div className="relative flex-1 h-6 bg-muted rounded">
              <div className="absolute h-6 rounded bg-gradient-to-r from-primary/50 to-primary"
                style={{ left: `${posn(r.low)}%`, width: `${posn(r.high) - posn(r.low)}%` }} />
              <div className="absolute h-6 w-0.5 bg-foreground" style={{ left: `${posn(r.mid)}%` }} />
            </div>
            <span className="w-40 text-right text-xs tabular-nums shrink-0">
              {money(r.low, v.currency)} – {money(r.high, v.currency)}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-3 pt-2 border-t">
          <span className="w-28 text-xs font-semibold shrink-0">Blended</span>
          <div className="relative flex-1 h-6 bg-muted rounded">
            <div className="absolute h-6 rounded bg-gradient-to-r from-emerald-500 to-teal-500"
              style={{ left: `${posn(blend.low)}%`, width: `${posn(blend.high) - posn(blend.low)}%` }} />
          </div>
          <span className="w-40 text-right text-xs tabular-nums font-semibold shrink-0">
            {money(blend.low, v.currency)} – {money(blend.high, v.currency)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-28 text-xs font-semibold shrink-0">Negotiation</span>
          <div className="relative flex-1 h-6 bg-muted rounded">
            <div className="absolute h-6 rounded border-2 border-dashed border-amber-500 bg-amber-500/15"
              style={{ left: `${posn(blend.negotiationFloor)}%`, width: `${posn(blend.negotiationCeiling) - posn(blend.negotiationFloor)}%` }} />
          </div>
          <span className="w-40 text-right text-xs tabular-nums shrink-0">
            {money(blend.negotiationFloor, v.currency)} – {money(blend.negotiationCeiling, v.currency)}
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Recommended negotiation range: floor at the 25th percentile of all method outcomes, ceiling at the
        blended enterprise value plus a 15% control premium.
      </p>
    </CardContent></Card>
  );
}
