import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, Search, TrendingUp, Users } from "lucide-react";

// ── Dummy department-wide reviews ──────────────────────────────
interface DeptReview {
  _id: string;
  employeeName: string;
  jobTitle: string;
  manager: string;
  team: string;
  cycleName: string;
  reviewDate: string;
  score: number;
  ratingBand: string;
}

const RATING_BAND_TONE: Record<string, string> = {
  Outstanding: "bg-success/10 text-success border-success/20",
  "Exceeds Expectations": "bg-success/10 text-success border-success/20",
  Good: "bg-info/10 text-info border-info/20",
  Satisfactory: "bg-warning/10 text-warning border-warning/20",
  "Needs Improvement": "bg-orange-500/10 text-orange-600 border-orange-500/20",
  Unsatisfactory: "bg-destructive/10 text-destructive border-destructive/20",
};

const bandFor = (score: number) => {
  if (score >= 90) return "Outstanding";
  if (score >= 80) return "Exceeds Expectations";
  if (score >= 70) return "Good";
  if (score >= 60) return "Satisfactory";
  if (score >= 50) return "Needs Improvement";
  return "Unsatisfactory";
};

const make = (
  id: string,
  employeeName: string,
  jobTitle: string,
  manager: string,
  team: string,
  score: number,
): DeptReview => ({
  _id: id,
  employeeName,
  jobTitle,
  manager,
  team,
  cycleName: "Q2 2026 Review",
  reviewDate: "2026-06-25",
  score,
  ratingBand: bandFor(score),
});

const MOCK_REVIEWS: DeptReview[] = [
  make("1", "Amara Okafor", "Senior Compliance Analyst", "Adaeze Nwosu", "Compliance", 92),
  make("2", "David Mensah", "KYC Specialist", "Adaeze Nwosu", "Compliance", 81),
  make("3", "Priya Sharma", "AML Investigator", "Adaeze Nwosu", "Compliance", 87),
  make("4", "Jonas Becker", "Onboarding Associate", "Adaeze Nwosu", "Compliance", 74),
  make("5", "Chiamaka Eze", "Junior Analyst", "Adaeze Nwosu", "Compliance", 68),
  make("6", "Liam O'Connor", "Risk Analyst", "Tunde Bakare", "Risk", 79),
  make("7", "Yuki Tanaka", "Transaction Monitoring Analyst", "Tunde Bakare", "Risk", 85),
  make("8", "Sofia Rossi", "Risk Analyst", "Tunde Bakare", "Risk", 72),
  make("9", "Marcus Hill", "Junior Risk Analyst", "Tunde Bakare", "Risk", 58),
  make("10", "Sara Khan", "Ops Associate", "Fatima Diallo", "Operations", 83),
  make("11", "Daniel Owusu", "Ops Associate", "Fatima Diallo", "Operations", 76),
  make("12", "Hannah Cole", "Ops Coordinator", "Fatima Diallo", "Operations", 90),
  make("13", "Kwame Asante", "Ops Analyst", "Fatima Diallo", "Operations", 65),
  make("14", "Noor Hassan", "Junior Ops Associate", "Fatima Diallo", "Operations", 71),
];

export function DepartmentReviewsPanel() {
  const [search, setSearch] = useState("");
  const [managerFilter, setManagerFilter] = useState<string>("all");

  const managers = useMemo(
    () => Array.from(new Set(MOCK_REVIEWS.map((r) => r.manager))),
    [],
  );

  const filtered = MOCK_REVIEWS.filter((r) => {
    const matchSearch =
      search === "" ||
      r.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      r.jobTitle.toLowerCase().includes(search.toLowerCase());
    const matchManager = managerFilter === "all" || r.manager === managerFilter;
    return matchSearch && matchManager;
  });

  const avg =
    filtered.length === 0
      ? 0
      : Math.round(filtered.reduce((s, r) => s + r.score, 0) / filtered.length);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-base">Department Performance</h3>
        <p className="text-xs text-muted-foreground">
          Review scores across all employees in your department.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Employees</p>
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
              <p className="text-lg font-bold">{avg}/100</p>
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
                {filtered.filter((r) => r.score >= 85).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search employee or role…"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={managerFilter} onValueChange={setManagerFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All managers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All managers</SelectItem>
            {managers.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                    {r.jobTitle} · {r.team} · Reports to {r.manager}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={RATING_BAND_TONE[r.ratingBand] ?? ""}
                  >
                    {r.ratingBand}
                  </Badge>
                  <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2.5 py-1 rounded-md text-xs">
                    <Star className="h-3 w-3 fill-white" />
                    <span className="font-bold">{r.score}</span>
                    <span className="opacity-80">/100</span>
                  </div>
                </div>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                No matching reviews.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
