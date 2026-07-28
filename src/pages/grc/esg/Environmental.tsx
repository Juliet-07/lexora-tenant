import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Leaf, Plus, Factory, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { EsgMetricsPanel } from "@/components/grc/EsgMetricsPanel";
import {
  ENV_CATEGORIES,
  useEsg,
  uid,
  pillarScore,
  targetProgress,
  intensity,
  improvement,
} from "@/lib/grc/esgStore";
import { exportReportExcel, exportReportPdf } from "@/lib/grc/reportExport";

export default function EsgEnvironmental() {
  const { state, mutate } = useEsg();
  const score = pillarScore(state.metrics, "Environmental");
  const env = state.metrics.filter((m) => m.pillar === "Environmental");
  const scope = (n: string) => env.find((m) => m.name.startsWith(`Scope ${n}`))?.value ?? 0;
  const totalCarbon = scope("1") + scope("2") + scope("3");

  const definition = {
    id: "esg-environmental",
    title: "Environmental Performance Report",
    subtitle: `Pillar score ${score}/100 · ${state.context.sector}`,
    summary: [
      { label: "Pillar score", value: score },
      { label: "Total emissions (tCO2e)", value: totalCarbon },
      { label: "Metrics tracked", value: env.length },
      { label: "Initiatives", value: state.initiatives.length },
    ],
    sections: [
      {
        heading: "Environmental metrics",
        columns: ["Category", "Metric", "Value", "Unit", "Intensity", "YoY %", "Target", "Progress %", "Methodology"],
        rows: env.map((m) => {
          const its = intensity(m, state.context);
          return [
            m.category, m.name, m.value, m.unit,
            its ? `${its.value} ${its.label}` : "—",
            improvement(m), `${m.target} by ${m.targetYear}`,
            targetProgress(m), m.methodology,
          ];
        }),
      },
      {
        heading: "Reduction initiatives",
        columns: ["Initiative", "Category", "Owner", "Cost (USD)", "Expected impact", "Status", "Start"],
        rows: state.initiatives.map((i) => [
          i.title, i.category, i.owner, i.cost, i.expectedImpact, i.status, i.startDate,
        ]),
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Leaf className="h-6 w-6 text-emerald-600" />Environmental
          </h1>
          <p className="text-sm text-muted-foreground">
            Carbon, energy, water, waste and biodiversity data with intensity metrics and targets.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportReportPdf(definition)}>
            <Download className="h-4 w-4 mr-1" />PDF
          </Button>
          <Button variant="outline" onClick={() => exportReportExcel(definition)}>
            <Download className="h-4 w-4 mr-1" />Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Pillar score" value={score} />
        <Stat label="Scope 1" value={`${scope("1")} tCO2e`} />
        <Stat label="Scope 2" value={`${scope("2")} tCO2e`} />
        <Stat label="Scope 3" value={`${scope("3")} tCO2e`} />
        <Stat label="Total footprint" value={`${totalCarbon} tCO2e`} />
      </div>

      <Tabs defaultValue="Carbon">
        <TabsList className="flex-wrap h-auto">
          {ENV_CATEGORIES.map((c) => (
            <TabsTrigger key={c} value={c}>{c}</TabsTrigger>
          ))}
          <TabsTrigger value="initiatives">Initiatives</TabsTrigger>
        </TabsList>

        {ENV_CATEGORIES.map((c) => (
          <TabsContent key={c} value={c} className="mt-4">
            <EsgMetricsPanel pillar="Environmental" category={c} categories={ENV_CATEGORIES} />
          </TabsContent>
        ))}

        <TabsContent value="initiatives" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Factory className="h-4 w-4" />Reduction initiative register
              </CardTitle>
              <InitiativeDialog
                onSave={(i) => {
                  mutate((s) => ({ ...s, initiatives: [i, ...s.initiatives] }));
                  toast({ title: "Initiative logged" });
                }}
              />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Initiative</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Expected impact</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.initiatives.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium text-sm">{i.title}</TableCell>
                      <TableCell className="text-sm">{i.category}</TableCell>
                      <TableCell className="text-sm">{i.owner}</TableCell>
                      <TableCell className="text-sm">${i.cost.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{i.expectedImpact}</TableCell>
                      <TableCell>
                        <Select
                          value={i.status}
                          onValueChange={(v) =>
                            mutate((s) => ({
                              ...s,
                              initiatives: s.initiatives.map((x) =>
                                x.id === i.id ? { ...x, status: v as any } : x,
                              ),
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["Planned", "In progress", "Delivered", "Paused"].map((o) => (
                              <SelectItem key={o} value={o}>{o}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function InitiativeDialog({ onSave }: { onSave: (i: any) => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    title: "", category: "Carbon", owner: "", cost: 0, expectedImpact: "",
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />New initiative</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New reduction initiative</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENV_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Owner</Label><Input value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} /></div>
          </div>
          <div><Label>Cost (USD)</Label><Input type="number" value={f.cost} onChange={(e) => setF({ ...f, cost: Number(e.target.value) })} /></div>
          <div><Label>Expected impact</Label><Textarea rows={2} value={f.expectedImpact} onChange={(e) => setF({ ...f, expectedImpact: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (!f.title) return toast({ title: "Title required", variant: "destructive" });
              onSave({
                ...f,
                id: uid("ini"),
                status: "Planned",
                startDate: new Date().toISOString().slice(0, 10),
              });
              setOpen(false);
              setF({ title: "", category: "Carbon", owner: "", cost: 0, expectedImpact: "" });
            }}
          >
            Log initiative
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
