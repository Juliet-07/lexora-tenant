import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Folder, Eye, Download, FileSpreadsheet } from "lucide-react";
import { CASE_TEMPLATES } from "@/data/caseDetailMock";

/** Template library, folder-categorised, shared by ADR and litigation. */
export function CaseTemplatesLibrary() {
  const categories = Array.from(
    new Set(CASE_TEMPLATES.map((t) => t.category)),
  );
  const [active, setActive] = useState<string>("all");
  const shown =
    active === "all"
      ? CASE_TEMPLATES
      : CASE_TEMPLATES.filter((t) => t.category === active);

  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
      <Card className="h-fit">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Folder className="h-4 w-4 fill-amber-400 text-amber-500" />
            Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 p-2">
          <CategoryRow
            label="All templates"
            count={CASE_TEMPLATES.length}
            active={active === "all"}
            onClick={() => setActive("all")}
          />
          {categories.map((c) => (
            <CategoryRow
              key={c}
              label={c}
              count={CASE_TEMPLATES.filter((t) => t.category === c).length}
              active={active === c}
              onClick={() => setActive(c)}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {active === "all" ? "All templates" : active}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Jurisdiction</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((t) => (
                <TableRow key={t.title}>
                  <TableCell>
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.description}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.category}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.jurisdiction}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function CategoryRow({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
        active
          ? "bg-primary/10 font-semibold text-primary"
          : "hover:bg-muted/60"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Folder className="h-4 w-4 shrink-0 fill-amber-400 text-amber-500" />
        <span className="truncate">{label}</span>
      </span>
      <Badge
        variant="outline"
        className={`shrink-0 text-[10px] ${
          active ? "bg-primary text-primary-foreground border-primary" : ""
        }`}
      >
        {count}
      </Badge>
    </button>
  );
}

export interface CaseReportMetric {
  label: string;
  value: string;
  sub?: string;
}

/** Simple report surface: metric cards plus export actions. */
export function CaseReportsPanel({
  title,
  metrics,
  rows,
}: {
  title: string;
  metrics: CaseReportMetric[];
  rows: { label: string; value: string }[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {title} — computed live from the case register.
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Download className="mr-1.5 h-4 w-4" /> Export PDF
          </Button>
          <Button size="sm" variant="outline">
            <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Export Excel
          </Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="mt-1 text-xl font-bold">{m.value}</p>
              {m.sub && (
                <p className="truncate text-[11px] text-muted-foreground">
                  {m.sub}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between border-b pb-2 text-sm last:border-0 last:pb-0"
            >
              <span className="text-muted-foreground">{r.label}</span>
              <span className="font-medium">{r.value}</span>
            </div>
          ))}
          {!rows.length && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing to report yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
