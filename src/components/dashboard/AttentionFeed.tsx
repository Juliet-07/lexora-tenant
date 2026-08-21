import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import type { AttentionItem } from "./useCrossModuleMetrics";

const sevClass: Record<AttentionItem["severity"], string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  info: "bg-muted text-muted-foreground border-border",
};

export function AttentionFeed({
  items,
  limit = 8,
}: {
  items: AttentionItem[];
  limit?: number;
}) {
  const shown = items.slice(0, limit);
  const criticalCount = items.filter((i) => i.severity === "critical").length;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Needs your attention
        </CardTitle>
        <Badge variant="outline" className="text-xs">
          {criticalCount} critical
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {shown.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="h-6 w-6 text-success" />
            Everything is on track across your modules.
          </div>
        ) : (
          shown.map((i) => (
            <Link
              key={i.id}
              to={i.to}
              className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3 transition-colors hover:bg-muted/50"
            >
              <span
                className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${sevClass[i.severity]}`}
              >
                {i.module}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{i.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {i.detail}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
