import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Briefcase } from "lucide-react";
import { fetchMyDepartment } from "@/lib/hr-api";

const initials = (first: string, last: string) =>
  `${(first?.[0] ?? "").toUpperCase()}${(last?.[0] ?? "").toUpperCase()}`;

export default function MyDepartment() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-department"],
    queryFn: fetchMyDepartment,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
        Loading your department…
      </div>
    );
  }

  const managers = data?.managers ?? [];
  const totalEmployees =
    data?.totalEmployees ??
    managers.reduce((s, m) => s + (m.reports?.length ?? 0), 0);

  const managerCount = managers.length;
  const subtitle =
    managerCount === 0
      ? "Read-only overview."
      : `${managerCount} ${managerCount === 1 ? "Manager" : "Managers"}, ${totalEmployees} total ${totalEmployees === 1 ? "employee" : "employees"}. Read-only overview.`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Department</h1>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>

      {managerCount === 0 ? (
        <Card>
          <CardContent className="py-20 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No Managers currently report to you.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {managers.map((m) => {
            const reports = m.reports ?? [];
            return (
              <Card key={m._id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center font-semibold text-sm shrink-0">
                        {initials(m.firstName, m.lastName)}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">
                          {m.firstName} {m.lastName}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                          <Briefcase className="h-3 w-3" />
                          {m.jobTitle || "Manager"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {reports.length}{" "}
                      {reports.length === 1 ? "report" : "reports"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {reports.length === 0 ? (
                    <p className="text-xs text-muted-foreground pl-13 ml-13">
                      No direct reports.
                    </p>
                  ) : (
                    <ul className="divide-y border rounded-md">
                      {reports.map((r) => (
                        <li
                          key={r._id}
                          className="flex items-center justify-between px-4 py-2.5 text-sm"
                        >
                          <span className="font-medium truncate">
                            {r.firstName} {r.lastName}
                          </span>
                          <span className="text-xs text-muted-foreground truncate ml-3">
                            {r.jobTitle || "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
