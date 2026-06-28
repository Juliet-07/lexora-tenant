import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Users, MapPin, Briefcase } from "lucide-react";
import { fetchMyDirectReports, type DirectReport, type HrTeam, type HrLocation } from "@/lib/hr-api";

const initials = (first: string, last: string) =>
  `${(first?.[0] ?? "").toUpperCase()}${(last?.[0] ?? "").toUpperCase()}`;

const teamName = (t: DirectReport["teamId"]) =>
  t && typeof t === "object" ? (t as HrTeam).name : null;

const locName = (l: DirectReport["locationId"]) =>
  l && typeof l === "object" ? (l as HrLocation).name : null;

export default function MyTeam() {
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["my-team"],
    queryFn: fetchMyDirectReports,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
        Loading your team…
      </div>
    );
  }

  const count = reports.length;
  const subtitle =
    count === 0
      ? "No direct reports yet."
      : `${count} ${count === 1 ? "person reports" : "people reporting"} to you.`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Team</h1>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>

      {count === 0 ? (
        <Card>
          <CardContent className="py-20 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No one currently reports to you.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((r) => {
            const team = teamName(r.teamId);
            const loc = locName(r.locationId);
            return (
              <Card key={r._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
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
                        {r.jobTitle || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                    {team && (
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        <span className="truncate">{team}</span>
                      </div>
                    )}
                    {loc && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="truncate">{loc}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
