import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronRight, Eye, Folder, FolderOpen, Paperclip } from "lucide-react";
import type { TaxObligation } from "@/lib/crm/finance-api";
import {
  TAX_TYPES,
  docCount,
  formatMoney,
  statusBadgeClass,
  taxTypeLabel,
} from "./taxConstants";

// Everything that has been filed (or is waiting for the owner to approve
// it), grouped Year of Income → period → tax type. It reads the same
// obligations as the calendar, so a filing recorded there appears here
// with no second step.
export function TaxFilingArchiveTab({
  obligations,
  onViewDocs,
}: {
  obligations: TaxObligation[];
  onViewDocs: (o: TaxObligation) => void;
}) {
  const [year, setYear] = useState("all");
  const [type, setType] = useState("all");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const filed = useMemo(
    () =>
      obligations.filter(
        (o) =>
          (o.status === "Filed" || o.status === "Pending approval") && o.filing,
      ),
    [obligations],
  );
  const years = useMemo(
    () =>
      Array.from(new Set(filed.map((o) => o.periodYear))).sort((a, b) => b - a),
    [filed],
  );

  const visible = filed.filter(
    (o) =>
      (year === "all" || String(o.periodYear) === year) &&
      (type === "all" || o.type === type),
  );

  const tree = useMemo(() => {
    const byYear = new Map<number, Map<number, TaxObligation[]>>();
    for (const o of visible) {
      const y = byYear.get(o.periodYear) ?? new Map<number, TaxObligation[]>();
      const list = y.get(o.periodKey) ?? [];
      list.push(o);
      y.set(o.periodKey, list);
      byYear.set(o.periodYear, y);
    }
    return [...byYear.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([y, periods]) => ({
        year: y,
        periods: [...periods.entries()]
          .sort((a, b) => b[0] - a[0])
          .map(([key, items]) => ({ key, items })),
      }));
  }, [visible]);

  const stats = {
    filed: visible.filter((o) => o.status === "Filed").length,
    pending: visible.filter((o) => o.status === "Pending approval").length,
    docs: visible.reduce((n, o) => n + docCount(o), 0),
  };

  const toggle = (k: string) => setOpen((p) => ({ ...p, [k]: !p[k] }));
  // First year starts open so the archive is not a wall of closed folders.
  const isOpen = (k: string, first = false) => open[k] ?? first;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ["Filed", stats.filed],
          ["Pending owner approval", stats.pending],
          ["Documents stored", stats.docs],
        ].map(([l, v]) => (
          <Card key={l as string}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{l}</p>
              <p className="text-xl font-bold">{v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Year of Income
          </Label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Tax Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {TAX_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-1 p-4">
          {tree.map((y, yi) => {
            const yk = `y${y.year}`;
            const yOpen = isOpen(yk, yi === 0);
            return (
              <div key={yk}>
                <button
                  type="button"
                  onClick={() => toggle(yk)}
                  className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm font-semibold hover:bg-muted/50"
                >
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${yOpen ? "rotate-90" : ""}`}
                  />
                  {yOpen ? (
                    <FolderOpen className="h-4 w-4 text-primary" />
                  ) : (
                    <Folder className="h-4 w-4 text-primary" />
                  )}
                  {y.year}
                  <span className="text-xs font-normal text-muted-foreground">
                    {y.periods.reduce((n, p) => n + p.items.length, 0)} filings
                  </span>
                </button>
                {yOpen &&
                  y.periods.map((p, pi) => {
                    const pk = `${yk}-${p.key}`;
                    const pOpen = isOpen(pk, yi === 0 && pi === 0);
                    return (
                      <div key={pk} className="ml-6">
                        <button
                          type="button"
                          onClick={() => toggle(pk)}
                          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm font-medium hover:bg-muted/50"
                        >
                          <ChevronRight
                            className={`h-4 w-4 transition-transform ${pOpen ? "rotate-90" : ""}`}
                          />
                          <Folder className="h-4 w-4 text-muted-foreground" />
                          {p.items[0].period}
                          <span className="text-xs font-normal text-muted-foreground">
                            {p.items.length}
                          </span>
                        </button>
                        {pOpen && (
                          <ul className="ml-8 divide-y rounded-md border">
                            {p.items.map((o) => (
                              <li
                                key={o._id}
                                className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm"
                              >
                                <div className="min-w-0">
                                  <p className="font-medium">
                                    {taxTypeLabel(o.type)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Filed {o.filing?.filedOn?.slice(0, 10)} ·{" "}
                                    {formatMoney(
                                      o.filing?.amountPaid,
                                      o.currency,
                                    )}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge
                                    className={`text-xs ${statusBadgeClass(o.status)}`}
                                  >
                                    {o.status}
                                  </Badge>
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                    <Paperclip className="h-3.5 w-3.5" />
                                    {docCount(o)}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onViewDocs(o)}
                                  >
                                    <Eye className="mr-1 h-4 w-4" /> Documents
                                  </Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
              </div>
            );
          })}
          {!tree.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {filed.length
                ? "Nothing matches these filters."
                : "Nothing has been filed yet. Record a filing from the Tax calendar and it is archived here."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
