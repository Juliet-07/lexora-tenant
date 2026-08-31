import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowUpRight } from "lucide-react";
import type { ModulePulseCard } from "./useCrossModuleMetrics";

const toneClass: Record<string, string> = {
  good: "text-success",
  warn: "text-warning",
  bad: "text-destructive",
  default: "text-foreground",
};

export function ModulePulse({ cards }: { cards: ModulePulseCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((c) => (
        <Card
          key={c.id}
          className="group relative overflow-hidden transition-shadow hover:shadow-lg"
        >
          <div
            className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${c.accent}`}
          />
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {c.name}
              </p>
              <Link
                to={c.to}
                className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                aria-label={`Open ${c.name}`}
              >
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <div>
              <p className="text-3xl font-bold tracking-tight">{c.headline}</p>
              <p className="text-xs text-muted-foreground">
                {c.headlineLabel}
              </p>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Module health</span>
                <span className="font-semibold text-foreground">
                  {c.score}%
                </span>
              </div>
              <Progress value={c.score} className="h-1.5" />
            </div>

            <div className="grid grid-cols-3 gap-2 border-t pt-3 text-center">
              {c.metrics.map((m) => (
                <div key={m.label}>
                  <p
                    className={`text-sm font-bold ${toneClass[m.tone ?? "default"]}`}
                  >
                    {m.value}
                  </p>
                  <p className="text-[10px] leading-tight text-muted-foreground">
                    {m.label}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
