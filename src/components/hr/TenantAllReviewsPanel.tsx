import { useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Loader2, Users } from "lucide-react";
import { useState } from "react";
import {
  fetchAllReviewCycles,
  fetchReviewCycleDetail,
  type PerformanceReview,
} from "@/lib/hr/hr-performance-api";

const STATUS_TONE: Record<string, string> = {
  employee_in_progress: "bg-muted text-muted-foreground",
  manager_in_progress: "bg-warning/10 text-warning border-warning/20",
  completed: "bg-success/10 text-success border-success/20",
};

const STATUS_LABEL: Record<string, string> = {
  employee_in_progress: "Awaiting employee",
  manager_in_progress: "Awaiting manager",
  completed: "Completed",
};

type Row = PerformanceReview & { cycleName: string };

export function TenantAllReviewsPanel() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");

  const { data: cycles = [], isLoading: cyclesLoading } = useQuery({
    queryKey: ["performance-cycles"],
    queryFn: fetchAllReviewCycles,
  });

  const detailQueries = useQueries({
    queries: cycles.map((c) => ({
      queryKey: ["performance-cycle-detail", c._id],
      queryFn: () => fetchReviewCycleDetail(c._id),
      enabled: !!c._id,
    })),
  });

  const detailsLoading = detailQueries.some((q) => q.isLoading);

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    detailQueries.forEach((q, i) => {
      const cycle = cycles[i];
      if (!q.data?.reviews) return;
      for (const r of q.data.reviews) {
        out.push({
          ...r,
          cycleName: cycle?.name ?? "",
        });
      }
    });
    return out;
  }, [detailQueries, cycles]);

  const departments = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.department).filter(Boolean)),
      ) as string[],
    [rows],
  );

  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (deptFilter !== "all" && r.department !== deptFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !r.employeeName.toLowerCase().includes(q) &&
        !(r.jobTitle ?? "").toLowerCase().includes(q) &&
        !(r.managerName ?? "").toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const loading = cyclesLoading || detailsLoading;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-base flex items-center gap-2">
          <Users className="h-4 w-4" /> All Employee Performance Reviews
        </h3>
        <p className="text-xs text-muted-foreground">
          Every review across every cycle. Score is the combined employee +
          manager weighted assessment (0–100) once a review is completed.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search employee, role, manager…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="employee_in_progress">
              Awaiting employee
            </SelectItem>
            <SelectItem value="manager_in_progress">
              Awaiting manager
            </SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading reviews…</span>
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            No reviews match your filters.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Reports To</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r._id}>
                    <TableCell>
                      <div className="font-medium text-sm">
                        {r.employeeName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.jobTitle}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.department ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.managerName ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.cycleName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={STATUS_TONE[r.status]}
                      >
                        {STATUS_LABEL[r.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.scores?.kpiSection.totalWeightedScore != null ? (
                        <div className="flex items-center justify-end gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {r.scores.kpiSection.ratingBand}
                          </Badge>
                          <span className="font-semibold">
                            {r.scores.kpiSection.totalWeightedScore.toFixed(1)}
                            /100
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
