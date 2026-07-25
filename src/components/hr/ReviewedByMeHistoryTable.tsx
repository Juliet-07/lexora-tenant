import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, History } from "lucide-react";
import { fetchReviewedHistoryForManager } from "@/lib/hr/hr-performance-api";

export function ReviewedByMeHistoryTable() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["reviewed-history-by-me"],
    queryFn: fetchReviewedHistoryForManager,
  });

  const completed = data.filter((r) => r.status === "completed");

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold text-base flex items-center gap-2">
          <History className="h-4 w-4" /> Past Reviews You've Completed
        </h3>
        <p className="text-xs text-muted-foreground">
          {completed.length === 0
            ? "You haven't signed off any reviews yet."
            : `${completed.length} review(s) signed off.`}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : completed.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            No completed reviews yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead className="text-right">KPI Score</TableHead>
                  <TableHead>Rating Band</TableHead>
                  <TableHead className="text-right">Signed Off</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completed.map((r) => {
                  const total = r.scores?.kpiSection?.totalWeightedScore;
                  const band = r.scores?.kpiSection?.ratingBand;
                  return (
                    <TableRow key={r._id}>
                      <TableCell className="font-medium">
                        {r.employeeName}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {r.jobTitle}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {total != null ? `${Number(total).toFixed(1)}/100` : "—"}
                      </TableCell>
                      <TableCell>
                        {band ? (
                          <Badge variant="outline" className="text-xs">
                            {band}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {r.managerSignedAt
                          ? new Date(r.managerSignedAt).toLocaleDateString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
