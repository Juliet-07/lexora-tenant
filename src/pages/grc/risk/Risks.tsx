import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useGrc,
  mutateGrc,
  id,
  RISK_CATEGORIES,
  RiskCategory,
  Risk,
  inherentScore,
  residualScore,
  scoreToBand,
  bandTone,
  riskZone,
  zoneTone,
  reviewFrequencyDays,
} from "@/lib/grcStore";

export default function GrcRisks() {
  const s = useGrc();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [band, setBand] = useState<string>("all");
  const [selected, setSelected] = useState<Risk | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const rows = useMemo(() => {
    return s.risks.filter((r) => {
      if (cat !== "all" && r.category !== cat) return false;
      if (band !== "all" && scoreToBand(residualScore(r)) !== band)
        return false;
      if (q && !r.title.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [s.risks, q, cat, band]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Risk Register</h1>
          <p className="text-sm text-muted-foreground">
            Central catalogue of organizational risks with 5×5 inherent and
            residual scoring.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New risk
          </Button>
        </div>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Register</TabsTrigger>
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          <TabsTrigger value="network">Relationships</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              className="w-[240px]"
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {RISK_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={band} onValueChange={setBand}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Band" />
              </SelectTrigger>
              <SelectContent>
                {["all", "Extreme", "High", "Medium", "Low"].map((b) => (
                  <SelectItem key={b} value={b}>
                    {b === "all" ? "All bands" : b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Risk</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-right">Inherent</TableHead>
                    <TableHead className="text-right">Residual</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Next review</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const inh = inherentScore(r);
                    const res = residualScore(r);
                    const b = scoreToBand(res);
                    const z = riskZone(r, s.appetite);
                    return (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer"
                        onClick={() => setSelected(r)}
                      >
                        <TableCell className="font-medium">{r.title}</TableCell>
                        <TableCell>{r.category}</TableCell>
                        <TableCell>{r.owner}</TableCell>
                        <TableCell className="text-right">{inh}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className={bandTone(b)}>
                            {res} · {b}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={zoneTone(z)}>
                            {z}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.nextReviewDate}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.status}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No risks match.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heatmap">
          <HeatmapCard risks={s.risks.filter((r) => r.status !== "Closed")} />
        </TabsContent>

        <TabsContent value="network">
          <Card>
            <CardContent className="p-4 space-y-2">
              {s.risks.map((r) => (
                <div key={r.id} className="border rounded p-3">
                  <div className="font-medium text-sm">{r.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Related:{" "}
                    {r.relatedRiskIds.length === 0
                      ? "—"
                      : r.relatedRiskIds
                          .map(
                            (id) =>
                              s.risks.find((x) => x.id === id)?.title ?? id,
                          )
                          .join(", ")}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NewRiskDialog open={newOpen} onOpenChange={setNewOpen} />
      <RiskDetailSheet risk={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function HeatmapCard({ risks }: { risks: Risk[] }) {
  const cells: Record<string, Risk[]> = {};
  risks.forEach((r) => {
    const k = `${r.likelihood}-${r.impact}`;
    (cells[k] = cells[k] || []).push(r);
  });
  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-6 gap-1 text-xs">
          <div />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={"h" + i} className="text-center text-muted-foreground">
              Impact {i}
            </div>
          ))}
          {[5, 4, 3, 2, 1].map((l) => (
            <>
              <div
                key={"l" + l}
                className="text-right pr-1 text-muted-foreground"
              >
                Likelihood {l}
              </div>
              {[1, 2, 3, 4, 5].map((i) => {
                const list = cells[`${l}-${i}`] || [];
                const score = l * i;
                const b = scoreToBand(score);
                const bg =
                  b === "Extreme"
                    ? "bg-rose-500/70"
                    : b === "High"
                      ? "bg-orange-500/60"
                      : b === "Medium"
                        ? "bg-amber-500/50"
                        : "bg-emerald-500/40";
                return (
                  <div
                    key={`c${l}${i}`}
                    className={`min-h-[64px] rounded ${bg} p-1 text-white text-[10px] space-y-0.5 overflow-hidden`}
                  >
                    {list.slice(0, 3).map((r) => (
                      <div key={r.id} className="truncate">
                        {r.title}
                      </div>
                    ))}
                    {list.length > 3 && <div>+{list.length - 3} more</div>}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function NewRiskDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [f, setF] = useState({
    title: "",
    category: "Operational" as RiskCategory,
    description: "",
    rootCauses: "",
    affectedProcesses: "",
    owner: "",
    likelihood: 3,
    impact: 3,
    financialExposure: 0,
  });
  const submit = () => {
    if (!f.title.trim())
      return toast({ title: "Title required", variant: "destructive" });
    const now = new Date().toISOString();
    const band = scoreToBand(f.likelihood * f.impact);
    const nextReview = new Date(
      Date.now() + reviewFrequencyDays(band) * 86400000,
    )
      .toISOString()
      .slice(0, 10);
    mutateGrc((s) => ({
      ...s,
      risks: [
        {
          id: id("rsk"),
          ...f,
          controls: [],
          relatedRiskIds: [],
          status: "Open",
          nextReviewDate: nextReview,
          createdAt: now,
          updatedAt: now,
          changes: [],
        },
        ...s.risks,
      ],
    }));
    toast({ title: "Risk created" });
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New risk</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Title</Label>
          <Input
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Category</Label>
              <Select
                value={f.category}
                onValueChange={(v) =>
                  setF({ ...f, category: v as RiskCategory })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Owner</Label>
              <Input
                value={f.owner}
                onChange={(e) => setF({ ...f, owner: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          </div>
          <div>
            <Label>Root causes</Label>
            <Textarea
              rows={2}
              value={f.rootCauses}
              onChange={(e) => setF({ ...f, rootCauses: e.target.value })}
            />
          </div>
          <div>
            <Label>Affected processes</Label>
            <Input
              value={f.affectedProcesses}
              onChange={(e) =>
                setF({ ...f, affectedProcesses: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Likelihood (1-5)</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={f.likelihood}
                onChange={(e) =>
                  setF({
                    ...f,
                    likelihood: Math.max(
                      1,
                      Math.min(5, Number(e.target.value)),
                    ),
                  })
                }
              />
            </div>
            <div>
              <Label>Impact (1-5)</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={f.impact}
                onChange={(e) =>
                  setF({
                    ...f,
                    impact: Math.max(1, Math.min(5, Number(e.target.value))),
                  })
                }
              />
            </div>
            <div>
              <Label>Financial exposure</Label>
              <Input
                type="number"
                value={f.financialExposure}
                onChange={(e) =>
                  setF({ ...f, financialExposure: Number(e.target.value) })
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit}>Create risk</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RiskDetailSheet({
  risk,
  onClose,
}: {
  risk: Risk | null;
  onClose: () => void;
}) {
  const s = useGrc();
  if (!risk) return null;
  const inh = inherentScore(risk);
  const res = residualScore(risk);
  const b = scoreToBand(res);
  const z = riskZone(risk, s.appetite);
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">{risk.title}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{risk.category}</Badge>
            <Badge variant="outline" className={bandTone(b)}>
              Residual {res} · {b}
            </Badge>
            <Badge variant="outline" className={zoneTone(z)}>
              {z} zone
            </Badge>
            <Badge variant="outline">{risk.status}</Badge>
          </div>
          <Info label="Description">{risk.description}</Info>
          <Info label="Root causes">{risk.rootCauses || "—"}</Info>
          <Info label="Affected processes">
            {risk.affectedProcesses || "—"}
          </Info>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <Stat label="Likelihood" v={risk.likelihood} />
            <Stat label="Impact" v={risk.impact} />
            <Stat label="Inherent score" v={inh} />
          </div>
          <Info label="Owner">{risk.owner}</Info>
          <Info label="Financial exposure">
            {risk.financialExposure.toLocaleString()}
          </Info>
          <Info label="Next review">{risk.nextReviewDate}</Info>

          <div>
            <div className="text-sm font-medium mb-1">Linked controls</div>
            {risk.controls.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No controls linked. Add one in the Controls Library.
              </div>
            ) : (
              <ul className="text-sm space-y-1">
                {risk.controls.map((c) => {
                  const ctl = s.controls.find((x) => x.id === c.controlId);
                  return (
                    <li
                      key={c.controlId}
                      className="border rounded px-2 py-1 flex justify-between"
                    >
                      <span>
                        {ctl?.code} — {ctl?.name}
                      </span>
                      <Badge variant="outline">{c.effectiveness}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div>
            <div className="text-sm font-medium mb-1">Change history</div>
            <ul className="text-xs text-muted-foreground space-y-1">
              {risk.changes
                .slice()
                .reverse()
                .map((c, i) => (
                  <li key={i}>
                    {new Date(c.at).toLocaleString()} — {c.note}
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, children }: any) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground tracking-wide">
        {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}
function Stat({ label, v }: any) {
  return (
    <div className="border rounded p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{v}</div>
    </div>
  );
}
