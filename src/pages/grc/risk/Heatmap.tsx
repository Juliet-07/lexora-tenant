import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { fetchRisks, bandTone, type Risk } from "@/lib/grc/risk-api";

type View = "inherent" | "residual";

const clamp = (n: number) => Math.min(5, Math.max(1, Math.round(n)));

/** Residual position — inherent coordinates scaled by the control uplift. */
function coords(risk: Risk, view: View) {
  if (view === "inherent")
    return { l: clamp(risk.likelihood), i: clamp(risk.impact) };
  const factor =
    risk.inherentScore > 0
      ? Math.sqrt(Math.max(0.04, risk.residualScore / risk.inherentScore))
      : 1;
  return {
    l: clamp(risk.likelihood * factor),
    i: clamp(risk.impact * factor),
  };
}

function bandFor(score: number) {
  if (score >= 20) return "Extreme" as const;
  if (score >= 12) return "High" as const;
  if (score >= 6) return "Medium" as const;
  return "Low" as const;
}

const cellTone = (score: number) =>
  ({
    Extreme: "bg-rose-500/85 text-white hover:bg-rose-500",
    High: "bg-orange-400/85 text-white hover:bg-orange-400",
    Medium: "bg-amber-300/85 text-amber-950 hover:bg-amber-300",
    Low: "bg-emerald-400/80 text-emerald-950 hover:bg-emerald-400",
  })[bandFor(score)];

export default function GrcHeatmap() {
  const { data: risks = [], isLoading } = useQuery({
    queryKey: ["grc-risks"],
    queryFn: fetchRisks,
  });

  const [view, setView] = useState<View>("residual");
  const [cell, setCell] = useState<{ l: number; i: number } | null>(null);

  const active = useMemo(
    () => risks.filter((r) => r.status !== "Closed"),
    [risks],
  );

  const grid = useMemo(() => {
    const map = new Map<string, Risk[]>();
    active.forEach((r) => {
      const { l, i } = coords(r, view);
      const key = `${l}-${i}`;
      map.set(key, [...(map.get(key) ?? []), r]);
    });
    return map;
  }, [active, view]);

  const movements = useMemo(
    () =>
      active
        .map((r) => {
          const delta = r.residualScore - r.inherentScore;
          return {
            risk: r,
            delta,
            direction:
              delta < 0 ? "improved" : delta > 0 ? "deteriorated" : "stable",
          };
        })
        .sort((a, b) => a.delta - b.delta),
    [active],
  );

  const counts = useMemo(() => {
    const c = { Extreme: 0, High: 0, Medium: 0, Low: 0 } as Record<
      string,
      number
    >;
    active.forEach((r) => {
      c[view === "inherent" ? r.inherentBand : r.residualBand] += 1;
    });
    return c;
  }, [active, view]);

  const cellRisks = cell ? (grid.get(`${cell.l}-${cell.i}`) ?? []) : [];

  if (isLoading) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading heatmap…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Risk Heatmap</h1>
          <p className="text-sm text-muted-foreground">
            5x5 likelihood vs impact matrix. Reads live from the Risk Register —
            no separate scoring is kept here.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["Extreme", "High", "Medium", "Low"] as const).map((b) => (
          <Card key={b}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{counts[b]}</div>
              <Badge variant="outline" className={bandTone(b)}>
                {b}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="matrix">
        <TabsList>
          <TabsTrigger value="matrix">Matrix</TabsTrigger>
          <TabsTrigger value="comparison">Movement</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                {view === "inherent" ? "Inherent" : "Residual"} exposure
              </CardTitle>
              <div className="flex gap-1 rounded-md border p-1">
                {(["inherent", "residual"] as View[]).map((v) => (
                  <Button
                    key={v}
                    size="sm"
                    variant={view === v ? "default" : "ghost"}
                    className="h-7 capitalize"
                    onClick={() => setView(v)}
                  >
                    {v}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <div className="flex items-center">
                  <span className="text-xs font-medium text-muted-foreground -rotate-90 whitespace-nowrap">
                    Impact →
                  </span>
                </div>
                <div className="flex-1 overflow-x-auto">
                  <div className="min-w-[520px]">
                    {[5, 4, 3, 2, 1].map((impact) => (
                      <div key={impact} className="flex items-stretch gap-1 mb-1">
                        <div className="w-6 flex items-center justify-center text-xs text-muted-foreground">
                          {impact}
                        </div>
                        {[1, 2, 3, 4, 5].map((likelihood) => {
                          const list =
                            grid.get(`${likelihood}-${impact}`) ?? [];
                          const score = likelihood * impact;
                          return (
                            <button
                              key={likelihood}
                              onClick={() =>
                                list.length &&
                                setCell({ l: likelihood, i: impact })
                              }
                              className={`flex-1 h-20 rounded-md border border-white/40 transition-colors flex flex-col items-center justify-center ${cellTone(score)} ${list.length ? "cursor-pointer" : "opacity-60 cursor-default"}`}
                            >
                              <span className="text-lg font-bold">
                                {list.length || ""}
                              </span>
                              <span className="text-[10px] opacity-80">
                                {score}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                    <div className="flex gap-1 pl-6">
                      {[1, 2, 3, 4, 5].map((l) => (
                        <div
                          key={l}
                          className="flex-1 text-center text-xs text-muted-foreground"
                        >
                          {l}
                        </div>
                      ))}
                    </div>
                    <div className="pl-6 text-center text-xs font-medium text-muted-foreground mt-1">
                      Likelihood →
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Inherent vs residual — where controls are moving the needle
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Risk</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Inherent</TableHead>
                    <TableHead className="text-right">Residual</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead>Zone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map(({ risk, delta, direction }) => (
                    <TableRow key={risk._id}>
                      <TableCell className="font-medium">
                        {risk.title}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {risk.category}
                      </TableCell>
                      <TableCell className="text-right">
                        {risk.inherentScore}
                      </TableCell>
                      <TableCell className="text-right">
                        {risk.residualScore}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`inline-flex items-center gap-1 ${direction === "improved" ? "text-emerald-600" : direction === "deteriorated" ? "text-rose-600" : "text-muted-foreground"}`}
                        >
                          {direction === "improved" ? (
                            <ArrowDownRight className="h-3.5 w-3.5" />
                          ) : direction === "deteriorated" ? (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          ) : (
                            <Minus className="h-3.5 w-3.5" />
                          )}
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={bandTone(risk.residualBand)}
                        >
                          {risk.residualBand}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {movements.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-sm text-muted-foreground py-10"
                      >
                        No active risks in the register yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      <Sheet open={!!cell} onOpenChange={(o) => !o && setCell(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Likelihood {cell?.l} × Impact {cell?.i}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {cellRisks.map((r) => (
              <div key={r._id} className="border rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{r.title}</span>
                  <Badge variant="outline" className={bandTone(r.residualBand)}>
                    {r.residualBand}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {r.category} · Owner {r.owner || "—"} · Inherent{" "}
                  {r.inherentScore} → Residual {r.residualScore}
                </p>
                {r.description && <p className="text-sm">{r.description}</p>}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
