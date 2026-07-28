import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  EsgMetric,
  IntensityBasis,
  intensity,
  improvement,
  targetProgress,
  useEsg,
  uid,
  nowStamp,
} from "@/lib/grc/esgStore";

const BASES: IntensityBasis[] = ["none", "per employee", "per m²", "per revenue unit"];

/** Reusable metric table used by both the Environmental and Social screens. */
export function EsgMetricsPanel({
  pillar,
  category,
  categories,
}: {
  pillar: "Environmental" | "Social";
  category: string;
  categories: readonly string[];
}) {
  const { state, mutate } = useEsg();
  const rows = state.metrics.filter(
    (m) => m.pillar === pillar && m.category === category,
  );
  const [editing, setEditing] = useState<EsgMetric | null>(null);
  const [open, setOpen] = useState(false);

  const save = (m: EsgMetric) => {
    mutate((s) => ({
      ...s,
      metrics: s.metrics.some((x) => x.id === m.id)
        ? s.metrics.map((x) => (x.id === m.id ? m : x))
        : [...s.metrics, m],
    }));
    toast({ title: "Metric saved", description: "Intensity, target progress and pillar score recalculated." });
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4">
          <div>
            <div className="font-medium">{category}</div>
            <div className="text-xs text-muted-foreground">
              {rows.length} metric{rows.length !== 1 ? "s" : ""} tracked for this period
            </div>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                <Plus className="h-4 w-4 mr-1" />Add metric
              </Button>
            </DialogTrigger>
            <MetricDialog
              metric={editing}
              pillar={pillar}
              defaultCategory={category}
              categories={categories}
              onSave={(m) => { save(m); setOpen(false); setEditing(null); }}
            />
          </Dialog>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Intensity</TableHead>
              <TableHead>YoY</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((m) => {
              const its = intensity(m, state.context);
              const yoy = improvement(m);
              const prog = targetProgress(m);
              return (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.methodology}</div>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {m.value} {m.unit}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {its ? `${its.value} ${its.label}` : "—"}
                  </TableCell>
                  <TableCell>
                    <span className={yoy >= 0 ? "text-emerald-600 text-xs" : "text-rose-600 text-xs"}>
                      {yoy >= 0 ? "+" : ""}{yoy}%
                    </span>
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {m.target} {m.unit} by {m.targetYear}
                  </TableCell>
                  <TableCell className="min-w-[120px]">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded bg-muted overflow-hidden">
                        <div
                          className={`h-full ${prog >= 75 ? "bg-emerald-500" : prog >= 40 ? "bg-amber-500" : "bg-rose-500"}`}
                          style={{ width: `${prog}%` }}
                        />
                      </div>
                      <Badge variant="outline" className="text-xs">{prog}%</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { setEditing(m); setOpen(true); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">
                  No metrics captured yet for {category}.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function MetricDialog({
  metric,
  pillar,
  defaultCategory,
  categories,
  onSave,
}: {
  metric: EsgMetric | null;
  pillar: "Environmental" | "Social";
  defaultCategory: string;
  categories: readonly string[];
  onSave: (m: EsgMetric) => void;
}) {
  const [f, setF] = useState<EsgMetric>(
    metric ?? {
      id: uid("mx"),
      pillar,
      category: defaultCategory as any,
      name: "",
      unit: "",
      period: String(new Date().getFullYear()),
      value: 0,
      baseline: 0,
      target: 0,
      targetYear: String(new Date().getFullYear() + 1),
      direction: "lower",
      intensityBasis: "none",
      methodology: "",
      source: "",
      updatedAt: nowStamp(),
    },
  );

  const submit = () => {
    if (!f.name || !f.unit) {
      toast({ title: "Name and unit are required", variant: "destructive" });
      return;
    }
    onSave({ ...f, updatedAt: nowStamp() });
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{metric ? "Edit metric" : "New metric"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Metric name</Label>
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div><Label>Unit</Label><Input value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></div>
          <div><Label>Period</Label><Input value={f.period} onChange={(e) => setF({ ...f, period: e.target.value })} /></div>
          <div><Label>Current value</Label><Input type="number" value={f.value} onChange={(e) => setF({ ...f, value: Number(e.target.value) })} /></div>
          <div><Label>Baseline / prior</Label><Input type="number" value={f.baseline} onChange={(e) => setF({ ...f, baseline: Number(e.target.value) })} /></div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div><Label>Target</Label><Input type="number" value={f.target} onChange={(e) => setF({ ...f, target: Number(e.target.value) })} /></div>
          <div><Label>Target year</Label><Input value={f.targetYear} onChange={(e) => setF({ ...f, targetYear: e.target.value })} /></div>
          <div>
            <Label>Better when</Label>
            <Select value={f.direction} onValueChange={(v) => setF({ ...f, direction: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lower">Lower</SelectItem>
                <SelectItem value="higher">Higher</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Intensity basis</Label>
            <Select value={f.intensityBasis} onValueChange={(v) => setF({ ...f, intensityBasis: v as IntensityBasis })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BASES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div><Label>Measurement methodology</Label><Textarea rows={2} value={f.methodology} onChange={(e) => setF({ ...f, methodology: e.target.value })} /></div>
        <div><Label>Data source</Label><Input value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} /></div>
      </div>
      <DialogFooter><Button onClick={submit}>Save metric</Button></DialogFooter>
    </DialogContent>
  );
}
