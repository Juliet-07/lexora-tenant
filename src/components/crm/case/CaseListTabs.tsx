import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Folder,
  Eye,
  Download,
  FileSpreadsheet,
  ExternalLink,
} from "lucide-react";
import {
  fetchAvailableTemplates,
  type AvailableTemplate,
} from "@/lib/crm/tools-api";

/** Template library, folder-categorised, shared by ADR and litigation.
 * Real, published platform templates tagged moduleKey "crm",
 * areaKey "adr-litigation" — the same taxonomy already used for KYC
 * and general contract templates, just a different area. */
export function CaseTemplatesLibrary() {
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["adr-litigation-templates"],
    queryFn: () => fetchAvailableTemplates("crm", "adr-litigation"),
    staleTime: 5 * 60_000,
  });
  const [previewing, setPreviewing] = useState<AvailableTemplate | null>(null);

  const categories = Array.from(new Set(templates.map((t) => t.category)));
  const [active, setActive] = useState<string>("all");
  const shown =
    active === "all"
      ? templates
      : templates.filter((t) => t.category === active);

  const openTemplate = (t: AvailableTemplate) => {
    if (t.sourceType === "uploaded" && t.fileUrl) {
      window.open(t.fileUrl, "_blank", "noopener,noreferrer");
    } else {
      setPreviewing(t);
    }
  };

  return (
    <>
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
              count={templates.length}
              active={active === "all"}
              onClick={() => setActive("all")}
            />
            {categories.map((c) => (
              <CategoryRow
                key={c}
                label={c ?? "Uncategorized"}
                count={templates.filter((t) => t.category === c).length}
                active={active === c}
                onClick={() => setActive(c as string)}
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
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
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
                    <TableRow key={t._id}>
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
                        {t.jurisdiction || "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openTemplate(t)}
                          title={
                            t.sourceType === "uploaded"
                              ? "Open file"
                              : "Preview"
                          }
                        >
                          {t.sourceType === "uploaded" ? (
                            <ExternalLink className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!shown.length && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No ADR & Litigation templates published yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={!!previewing}
        onOpenChange={(o) => !o && setPreviewing(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewing?.title}</DialogTitle>
          </DialogHeader>
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: previewing?.content ?? "" }}
          />
        </DialogContent>
      </Dialog>
    </>
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
