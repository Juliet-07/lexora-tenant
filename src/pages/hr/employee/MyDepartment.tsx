import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye } from "lucide-react";
import { fetchDepartmentTree } from "@/lib/hr-api";

export default function MyDepartment() {
  const { data, isLoading } = useQuery({
    queryKey: ["department-tree"],
    queryFn: fetchDepartmentTree,
  });
  console.log(data);
  const managers = data?.managers ?? [];
  const totalEmployees =
    managers.length +
    managers.reduce((sum, m) => sum + (m.directReports?.length ?? 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading your department…</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Department</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {managers.length} Manager{managers.length !== 1 ? "s" : ""},{" "}
            {totalEmployees} total employee{totalEmployees !== 1 ? "s" : ""}.
          </p>
        </div>
        <Badge
          variant="outline"
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-secondary/10 text-secondary border-secondary/20"
        >
          <Eye className="h-3.5 w-3.5" />
          Read-only overview
        </Badge>
      </div>

      {managers.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground">
          No team members in your department yet.
        </div>
      ) : (
        <div className="space-y-4">
          {managers.map((manager) => (
            <div
              key={manager._id}
              className="rounded-xl border bg-card overflow-hidden"
            >
              {/* Manager row */}
              <div className="flex items-center justify-between px-5 py-4 bg-muted/30">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-sm font-semibold">
                      {manager.firstName?.[0] ?? ""}
                      {manager.lastName?.[0] ?? ""}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">
                      {manager.firstName} {manager.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{manager.jobTitle ?? "—"}</span>
                      {manager.teamId && typeof manager.teamId === "object" && (
                        <>
                          <span>·</span>
                          <span>{manager.teamId.name}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <Badge className="text-xs bg-primary/10 text-primary border-primary/20 font-medium">
                  {manager.directReports?.length ?? 0} report
                  {(manager.directReports?.length ?? 0) !== 1 ? "s" : ""}
                </Badge>
              </div>

              {/* Direct reports */}
              {(manager.directReports ?? []).length > 0 && (
                <div className="divide-y">
                  {manager.directReports.map((report) => (
                    <div
                      key={report._id}
                      className="flex items-center justify-between px-5 py-3 pl-16"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                            {report.firstName?.[0] ?? ""}
                            {report.lastName?.[0] ?? ""}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-sm">
                          {report.firstName} {report.lastName}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {report.jobTitle ?? "—"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
