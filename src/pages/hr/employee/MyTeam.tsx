import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Briefcase,
  ClipboardCheck,
  AlertTriangle,
} from "lucide-react";
import { fetchMyDirectReports, type DirectReport } from "@/lib/hr-api";
import { ManagerProbationSheet } from "@/components/hr/ManagerProbationSheet";

const initials = (first: string, last: string) =>
  `${(first?.[0] ?? "").toUpperCase()}${(last?.[0] ?? "").toUpperCase()}`;

const EMPLOYMENT_TYPE_LABEL: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  intern: "Intern",
  consultant: "Consultant",
};

const STATUS_TONE: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  probation: "bg-warning/10 text-warning border-warning/20",
  on_leave: "bg-info/10 text-info border-info/20",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
  terminated: "bg-muted text-muted-foreground",
  resigned: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  probation: "Probation",
  on_leave: "On leave",
  suspended: "Suspended",
  terminated: "Terminated",
  resigned: "Resigned",
};

export default function MyTeam() {
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["my-direct-reports"],
    queryFn: fetchMyDirectReports,
  });

  const [probationFor, setProbationFor] = useState<DirectReport | null>(null);

  const count = reports.length;
  const probationCount = reports.filter(
    (r) => r.employmentStatus === "probation",
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Team</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isLoading
            ? "Loading…"
            : count === 0
              ? "No direct reports yet."
              : `${count} ${count === 1 ? "person reports" : "people report"} to you${
                  probationCount > 0
                    ? ` · ${probationCount} on probation`
                    : ""
                }.`}
        </p>
      </div>

      {!isLoading && count === 0 ? (
        <Card>
          <CardContent className="py-20 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No one currently reports to you.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((r) => {
            const status = r.employmentStatus ?? "active";
            const type = r.employmentType ?? "full_time";
            const isProbation = status === "probation";
            return (
              <Card
                key={r._id}
                className="hover:shadow-md transition-shadow flex flex-col"
              >
                <CardContent className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center font-semibold shrink-0">
                      {initials(r.firstName, r.lastName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">
                        {r.firstName} {r.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                        <Briefcase className="h-3 w-3 shrink-0" />
                        {r.jobTitle}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    <Badge
                      variant="outline"
                      className={STATUS_TONE[status] ?? ""}
                    >
                      {isProbation && (
                        <AlertTriangle className="h-3 w-3 mr-1" />
                      )}
                      {STATUS_LABEL[status] ?? status}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {EMPLOYMENT_TYPE_LABEL[type] ?? type}
                    </Badge>
                  </div>

                  {isProbation && (
                    <div className="mt-4 pt-3 border-t">
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => setProbationFor(r)}
                      >
                        <ClipboardCheck className="h-4 w-4 mr-1.5" />
                        Manage 90-day plan
                      </Button>
                      {r.probationEndDate && (
                        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                          Ends{" "}
                          {new Date(r.probationEndDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ManagerProbationSheet
        employee={
          probationFor
            ? {
                _id: probationFor._id,
                firstName: probationFor.firstName,
                lastName: probationFor.lastName,
                jobTitle: probationFor.jobTitle,
              }
            : null
        }
        onClose={() => setProbationFor(null)}
      />
    </div>
  );
}
