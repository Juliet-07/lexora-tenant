import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  FileBarChart, Download, Paperclip, CheckCircle2, Plus, Send, BookMarked,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useEsg,
  uid,
  nowStamp,
  FRAMEWORKS,
  Framework,
  ReportIndicator,
  frameworkCoverage,
  indicatorTone,
  pillarScore,
} from "@/lib/grc/esgStore";
import { exportReportExcel, exportReportPdf, ReportDefinition } from "@/lib/grc/reportExport";

export default function EsgReporting() {
  const { state, mutate } = useEsg();
  const [tab, setTab] = useState<Framework>("GRI");
  const [selected, setSelected] = useState<ReportIndicator | null>(null);

  const indicatorsFor = (f: Framework) => state.indicators.filter((i) => i.framework === f);

  const patch = (idv: string, p: Partial<ReportIndicator>) => {
    mutate((s) => ({
      ...s,
      indicators: s.indicators.map((i) => (i.id === idv ? { ...i, ...p } : i)),
    }));
    setSelected((cur) => (cur && cur.id === idv ? { ...cur, ...p } : cur));
  };

  const contentIndex = (f: Framework): ReportDefinition => ({
    id: `esg-${f}`,
    title: `${f} Content Index`,
    subtitle: `ESG disclosure preparation · period 2026`,
    summary: [
      { label: "Framework", value: f },
      { label: "Indicators", value: indicatorsFor(f).length },
      { label: "Signed off", value: frameworkCoverage(state.indicators, f).signedOff },
      { label: "Coverage", value: `${frameworkCoverage(state.indicators, f).pct}%` },
    ],
    sections: [
      {
        heading: `${f} disclosures`,
        columns: ["Code", "Disclosure", "Owner", "Response", "Evidence", "Status", "Signed off by"],
        rows: indicatorsFor(f).map((i) => [
          i.code, i.title, i.owner, i.response || "—",
          i.evidence.map((e) => e.name).join("; ") || "None",
          i.status, i.signedOffBy ?? "—",
        ]),
      },
    ],
  });

  const compile = (f: Framework) => {
    const set = indicatorsFor(f);
    const pending = set.filter((i) => i.status !== "Signed off");
    if (pending.length) {
      toast({
        title: `${pending.length} indicator${pending.length !== 1 ? "s" : ""} not signed off`,
        description: "Compilation continues, but unsigned disclosures are flagged in the report.",
      });
    }
    mutate((s) => ({
      ...s,
      reports: [
        {
          id: uid("rep"),
          title: `${f} Report ${new Date().getFullYear()}`,
          framework: f,
          period: String(new Date().getFullYear()),
          status: "Compiled",
          compiledAt: nowStamp(),
          publishedAt: null,
          note: `Auto-assembled from ${set.length} indicators (${set.length - pending.length} signed off).`,
        },
        ...s.reports,
      ],
    }));
    toast({ title: "Report compiled" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileBarChart className="h-6 w-6 text-primary" />ESG Reporting
          </h1>
          <p className="text-sm text-muted-foreground">
            GRI, ISSB, TCFD, King V and SDG disclosure preparation with evidence and sign-off.
          </p>
        </div>
        <CustomReportDialog state={state} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {FRAMEWORKS.map((f) => {
          const c = frameworkCoverage(state.indicators, f);
          return (
            <Card key={f} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTab(f)}>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">{f}</div>
                <div className="text-2xl font-bold">{c.pct}%</div>
                <div className="text-xs text-muted-foreground">{c.signedOff}/{c.total} signed off</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Framework)}>
        <TabsList className="flex-wrap h-auto">
          {FRAMEWORKS.map((f) => <TabsTrigger key={f} value={f}>{f}</TabsTrigger>)}
        </TabsList>

        {FRAMEWORKS.map((f) => (
          <TabsContent key={f} value={f} className="mt-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 flex-wrap gap-2">
                <CardTitle className="text-base">{f} content index</CardTitle>
                <div className="flex gap-2">
                  <IndicatorDialog
                    framework={f}
                    onSave={(i) => {
                      mutate((s) => ({ ...s, indicators: [...s.indicators, i] }));
                      toast({ title: "Indicator added" });
                    }}
                  />
                  <Button size="sm" variant="outline" onClick={() => exportReportPdf(contentIndex(f))}>
                    <Download className="h-4 w-4 mr-1" />PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportReportExcel(contentIndex(f))}>
                    <Download className="h-4 w-4 mr-1" />Excel
                  </Button>
                  <Button size="sm" onClick={() => compile(f)}>
                    <BookMarked className="h-4 w-4 mr-1" />Compile report
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Disclosure</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Evidence</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {indicatorsFor(f).map((i) => (
                      <TableRow key={i.id} className="cursor-pointer" onClick={() => setSelected(i)}>
                        <TableCell className="text-sm font-mono">{i.code}</TableCell>
                        <TableCell className="text-sm font-medium">{i.title}</TableCell>
                        <TableCell className="text-sm">{i.owner}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {i.evidence.length ? `${i.evidence.length} file(s)` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={indicatorTone(i.status)}>{i.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {indicatorsFor(f).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">
                          No indicators mapped for {f} yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardHeader><CardTitle className="text-base">Compiled &amp; published reports</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report</TableHead>
                <TableHead>Framework</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-64">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.reports.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{r.title}</div>
                    <div className="text-xs text-muted-foreground">{r.note}</div>
                  </TableCell>
                  <TableCell className="text-sm">{r.framework}</TableCell>
                  <TableCell className="text-sm">{r.period}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={r.status === "Published" ? "text-emerald-600 border-emerald-500/30" : ""}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => exportReportPdf(contentIndex(r.framework))}>
                        <Download className="h-3.5 w-3.5 mr-1" />PDF
                      </Button>
                      {r.status !== "Published" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            mutate((s) => ({
                              ...s,
                              reports: s.reports.map((x) =>
                                x.id === r.id ? { ...x, status: "Published", publishedAt: nowStamp() } : x,
                              ),
                            }));
                            toast({ title: "Report published", description: "Available for board pack and investor distribution." });
                          }}
                        >
                          <Send className="h-3.5 w-3.5 mr-1" />Publish
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.code} — {selected.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">{selected.framework}</Badge>
                  <Badge variant="outline" className={indicatorTone(selected.status)}>{selected.status}</Badge>
                  <Badge variant="outline">Owner: {selected.owner}</Badge>
                </div>

                <div>
                  <Label>Disclosure response</Label>
                  <Textarea
                    rows={6}
                    value={selected.response}
                    onChange={(e) => patch(selected.id, { response: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Pull-through available: Environmental score {pillarScore(state.metrics, "Environmental")}, Social score {pillarScore(state.metrics, "Social")}.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Evidence</Label>
                    <label className="text-xs text-primary cursor-pointer flex items-center gap-1">
                      <Paperclip className="h-3.5 w-3.5" />Attach file
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          patch(selected.id, {
                            evidence: [
                              ...selected.evidence,
                              { id: uid("ev"), name: file.name, uploadedAt: nowStamp() },
                            ],
                            status: selected.status === "Not started" ? "In progress" : selected.status,
                          });
                          toast({ title: "Evidence attached" });
                        }}
                      />
                    </label>
                  </div>
                  <div className="space-y-1">
                    {selected.evidence.map((ev) => (
                      <div key={ev.id} className="flex justify-between border rounded px-2 py-1 text-xs">
                        <span>{ev.name}</span>
                        <span className="text-muted-foreground">{new Date(ev.uploadedAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                    {!selected.evidence.length && (
                      <div className="text-xs text-muted-foreground">No evidence attached.</div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-3 flex flex-wrap gap-2">
                  {selected.status !== "Awaiting sign-off" && selected.status !== "Signed off" && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (!selected.response) {
                          return toast({ title: "Add a response first", variant: "destructive" });
                        }
                        patch(selected.id, { status: "Awaiting sign-off" });
                        toast({ title: "Submitted for sign-off" });
                      }}
                    >
                      Submit for sign-off
                    </Button>
                  )}
                  {selected.status === "Awaiting sign-off" && (
                    <Button
                      onClick={() => {
                        patch(selected.id, {
                          status: "Signed off",
                          signedOffBy: "Sustainability Lead",
                          signedOffAt: nowStamp(),
                        });
                        toast({ title: "Indicator signed off" });
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />Sign off
                    </Button>
                  )}
                  {selected.status === "Signed off" && (
                    <div className="text-xs text-emerald-600">
                      Signed off by {selected.signedOffBy} on{" "}
                      {selected.signedOffAt ? new Date(selected.signedOffAt).toLocaleDateString() : "—"}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function IndicatorDialog({ framework, onSave }: { framework: Framework; onSave: (i: ReportIndicator) => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ code: "", title: "", owner: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />Indicator</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add {framework} indicator</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Code</Label><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></div>
          <div><Label>Disclosure title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div><Label>Owner</Label><Input value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (!f.code || !f.title) return toast({ title: "Code and title required", variant: "destructive" });
              onSave({
                id: uid("ind"),
                framework,
                code: f.code,
                title: f.title,
                owner: f.owner || "Unassigned",
                response: "",
                evidence: [],
                status: "Not started",
                signedOffBy: null,
                signedOffAt: null,
              });
              setOpen(false);
              setF({ code: "", title: "", owner: "" });
            }}
          >
            Add indicator
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomReportDialog({ state }: { state: any }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Custom ESG Report");
  const [frameworks, setFrameworks] = useState<Framework[]>(["GRI"]);
  const [includeMetrics, setIncludeMetrics] = useState(true);
  const [includeMateriality, setIncludeMateriality] = useState(true);

  const build = (): ReportDefinition => ({
    id: "esg-custom",
    title,
    subtitle: "Configurable ESG report",
    summary: [
      { label: "Frameworks", value: frameworks.join(", ") || "None" },
      { label: "Environmental score", value: pillarScore(state.metrics, "Environmental") },
      { label: "Social score", value: pillarScore(state.metrics, "Social") },
      { label: "Material topics", value: state.topics.filter((t: any) => Math.max(t.financial, t.impact) >= state.cycle.threshold).length },
    ],
    sections: [
      ...(includeMetrics
        ? [{
            heading: "ESG metrics",
            columns: ["Pillar", "Category", "Metric", "Value", "Unit", "Target", "Target year"],
            rows: state.metrics.map((m: any) => [m.pillar, m.category, m.name, m.value, m.unit, m.target, m.targetYear]),
          }]
        : []),
      ...(includeMateriality
        ? [{
            heading: "Material topics",
            columns: ["Topic", "Pillar", "Financial", "Impact", "Rationale"],
            rows: state.topics.map((t: any) => [t.topic, t.pillar, t.financial, t.impact, t.rationale]),
          }]
        : []),
      ...frameworks.map((f) => ({
        heading: `${f} disclosures`,
        columns: ["Code", "Disclosure", "Response", "Status"],
        rows: state.indicators
          .filter((i: any) => i.framework === f)
          .map((i: any) => [i.code, i.title, i.response || "—", i.status]),
      })),
    ],
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><FileBarChart className="h-4 w-4 mr-1" />Custom report builder</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Build a custom ESG report</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Report title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div>
            <Label>Frameworks to include</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {FRAMEWORKS.map((f) => (
                <label key={f} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={frameworks.includes(f)}
                    onCheckedChange={(v) =>
                      setFrameworks((cur) => (v ? [...cur, f] : cur.filter((x) => x !== f)))
                    }
                  />
                  {f}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={includeMetrics} onCheckedChange={(v) => setIncludeMetrics(Boolean(v))} />
            Include ESG metric data
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={includeMateriality} onCheckedChange={(v) => setIncludeMateriality(Boolean(v))} />
            Include materiality assessment
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => exportReportExcel(build())}>
            <Download className="h-4 w-4 mr-1" />Excel
          </Button>
          <Button onClick={() => exportReportPdf(build())}>
            <Download className="h-4 w-4 mr-1" />PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
