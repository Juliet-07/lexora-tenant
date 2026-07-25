import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Star, Search, TrendingUp, Users } from "lucide-react";
import { fetchDepartmentReviewHistory } from "@/lib/hr/hr-performance-api";

const RATING_BAND_TONE: Record<string, string> = {
  Outstanding: "bg-success/10 text-success border-success/20",
  "Exceeds Expectations": "bg-success/10 text-success border-success/20",
  Good: "bg-info/10 text-info border-info/20",
  Satisfactory: "bg-warning/10 text-warning border-warning/20",
  "Needs Improvement": "bg-orange-500/10 text-orange-600 border-orange-500/20",
  Unsatisfactory: "bg-destructive/10 text-destructive border-destructive/20",
  "—": "bg-muted text-muted-foreground",
};

export function DepartmentReviewsPanel() {
  const [search, setSearch] = useState("");

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["department-review-history"],
    queryFn: fetchDepartmentReviewHistory,
  });

  const enriched = useMemo(
    () =>
      reviews.map((r) => ({
        ...r,
        band: r.scores?.kpiSection.ratingBand ?? "—",
        score: r.scores?.kpiSection.totalWeightedScore ?? null,
      })),
    [reviews],
  );
  console.log(enriched);
  const filtered = enriched.filter(
    (r) =>
      search === "" ||
      r.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      r.jobTitle.toLowerCase().includes(search.toLowerCase()),
  );

  const scored = filtered.filter((r) => r.score != null);
  const avg =
    scored.length === 0
      ? null
      : Math.round(
          scored.reduce((s, r) => s + (r.score ?? 0), 0) / scored.length,
        );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading department reviews…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-base">Department Performance</h3>
        <p className="text-xs text-muted-foreground">
          Completed review scores across your whole department. Read-only.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completed Reviews</p>
              <p className="text-lg font-bold">{filtered.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Score</p>
              <p className="text-lg font-bold">{avg ?? "—"}/100</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Top performers</p>
              <p className="text-lg font-bold">
                {filtered.filter((r) => (r.score ?? 0) >= 85).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
        <Input
          placeholder="Search employee or role…"
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Reviews</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {filtered.map((r) => (
              <li
                key={r._id}
                className="flex items-center justify-between px-4 py-3 gap-3 flex-wrap"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm">{r.employeeName}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.jobTitle}{" "}
                    {r.managerName ? `· Reports to ${r.managerName}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={RATING_BAND_TONE[r.band] ?? ""}
                  >
                    {r.band}
                  </Badge>
                  {r.score != null && (
                    <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2.5 py-1 rounded-md text-xs">
                      <Star className="h-3 w-3 fill-white" />
                      <span className="font-bold">{r.score}</span>
                      <span className="opacity-80">/100</span>
                    </div>
                  )}
                </div>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                No completed reviews yet.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
