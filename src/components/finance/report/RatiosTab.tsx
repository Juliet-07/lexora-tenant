import { ArrowRight, ArrowDown, ArrowUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RatioItem } from "@/lib/crm/report-api";
import { Pill, TabHeading, useReport } from "./shared";

export const TrendIcon = ({ item }: { item: RatioItem }) => {
  const cls = item.ok === false ? "text-destructive" : item.ok ? "text-success" : "text-muted-foreground";
  if (item.trend === "up") return <ArrowUp className={`mx-auto h-3.5 w-3.5 ${cls}`} />;
  if (item.trend === "down") return <ArrowDown className={`mx-auto h-3.5 w-3.5 ${cls}`} />;
  if (item.trend === "flat") return <ArrowRight className={`mx-auto h-3.5 w-3.5 ${cls}`} />;
  return <span className="text-muted-foreground">—</span>;
};

const numeric = (s: string) => {
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ""));
  return Number.isNaN(n) ? null : n;
};

function StatusPill({ item }: { item: RatioItem }) {
  if (item.ok === null) return <Pill tone="grey">No target</Pill>;
  return item.ok ? <Pill tone="green">On track</Pill> : <Pill tone="amber">Watch</Pill>;
}

export default function RatiosTab() {
  const { pack, view } = useReport();

  return (
    <div className="space-y-4">
      <TabHeading
        title="Financial Ratios and Analysis"
        sub={`${pack.meta.periodLabel} · year-to-date figures where a ratio needs a full year`}
      />
      {pack.ratios.map((g) => (
        <Card key={g.group}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{g.group} ratios</CardTitle>
          </CardHeader>
          <CardContent className={view === "chart" ? "space-y-4 pt-4" : "overflow-x-auto p-0"}>
            {view === "chart" ? (
              g.items.map((r) => {
                const tgt = numeric(r.target);
                // `value` is a fraction for percentages; the shown figure and the
                // target share units, so compare those.
                const val = numeric(r.display);
                const maxBar = Math.max(Math.abs(val ?? 0), Math.abs(tgt ?? 0), 1) * 1.2;
                const valPct = val === null ? 0 : Math.min((Math.abs(val) / maxBar) * 100, 100);
                const tgtPct = tgt === null ? null : Math.min((Math.abs(tgt) / maxBar) * 100, 100);
                const color = r.ok === false ? "#d97706" : "#16a34a";
                return (
                  <div key={r.key}>
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="text-xs font-semibold">{r.name}</span>
                      <span className="text-sm font-bold" style={{ color }}>
                        {r.display}
                      </span>
                    </div>
                    {tgtPct !== null && tgtPct > 0 && val !== null ? (
                      <div className="relative mb-4 h-5 rounded bg-muted">
                        <div className="h-full rounded" style={{ width: `${valPct}%`, background: color }} />
                        <div
                          className="absolute -bottom-0.5 -top-0.5 w-0.5 bg-foreground"
                          style={{ left: `${tgtPct}%` }}
                          title={`Target: ${r.target}`}
                        />
                        <span
                          className="absolute top-full mt-1 whitespace-nowrap text-[9px] text-muted-foreground"
                          style={{ left: `${tgtPct}%`, transform: "translateX(-50%)" }}
                        >
                          target {r.target}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">{r.target === "—" || !r.target ? "No target set" : `Target ${r.target}`}</p>
                    )}
                  </div>
                );
              })
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 text-left font-semibold">Ratio</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Value</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Target</th>
                    <th className="px-4 py-2.5 text-center font-semibold">Trend</th>
                    <th className="px-4 py-2.5 text-center font-semibold">Status</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Formula</th>
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((r) => (
                    <tr key={r.key} className="border-b last:border-b-0">
                      <td className="px-4 py-2 font-semibold">{r.name}</td>
                      <td className="px-4 py-2 text-right font-bold tabular-nums">{r.display}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{r.target}</td>
                      <td className="px-4 py-2 text-center">
                        <TrendIcon item={r} />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <StatusPill item={r} />
                      </td>
                      <td className="px-4 py-2 text-[11px] italic text-muted-foreground">{r.formula}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      ))}
      <p className="text-xs text-muted-foreground">{pack.notes.targets}</p>
    </div>
  );
}
