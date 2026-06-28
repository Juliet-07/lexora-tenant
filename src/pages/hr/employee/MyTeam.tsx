import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, Briefcase, Mail, CalendarDays } from "lucide-react";

const initials = (first: string, last: string) =>
  `${(first?.[0] ?? "").toUpperCase()}${(last?.[0] ?? "").toUpperCase()}`;

// ── Dummy data ──────────────────────────────────────────────────
interface TeamMember {
  _id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  team: string;
  location: string;
  email: string;
  startDate: string;
  employmentType: "Full-time" | "Contract";
}

const MOCK_TEAM: TeamMember[] = [
  {
    _id: "1",
    firstName: "Amara",
    lastName: "Okafor",
    jobTitle: "Senior Compliance Analyst",
    team: "Compliance",
    location: "Lagos HQ",
    email: "amara.okafor@lexora.co",
    startDate: "2023-04-12",
    employmentType: "Full-time",
  },
  {
    _id: "2",
    firstName: "David",
    lastName: "Mensah",
    jobTitle: "KYC Specialist",
    team: "Compliance",
    location: "Accra Office",
    email: "david.mensah@lexora.co",
    startDate: "2024-01-08",
    employmentType: "Full-time",
  },
  {
    _id: "3",
    firstName: "Priya",
    lastName: "Sharma",
    jobTitle: "AML Investigator",
    team: "Compliance",
    location: "Remote",
    email: "priya.sharma@lexora.co",
    startDate: "2022-11-21",
    employmentType: "Full-time",
  },
  {
    _id: "4",
    firstName: "Jonas",
    lastName: "Becker",
    jobTitle: "Onboarding Associate",
    team: "Compliance",
    location: "Lagos HQ",
    email: "jonas.becker@lexora.co",
    startDate: "2025-02-03",
    employmentType: "Contract",
  },
  {
    _id: "5",
    firstName: "Chiamaka",
    lastName: "Eze",
    jobTitle: "Junior Analyst",
    team: "Compliance",
    location: "Lagos HQ",
    email: "chiamaka.eze@lexora.co",
    startDate: "2025-06-15",
    employmentType: "Full-time",
  },
  {
    _id: "6",
    firstName: "Liam",
    lastName: "O'Connor",
    jobTitle: "Risk Analyst",
    team: "Compliance",
    location: "Remote",
    email: "liam.oconnor@lexora.co",
    startDate: "2024-09-30",
    employmentType: "Full-time",
  },
];

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function MyTeam() {
  const reports = MOCK_TEAM;
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
          {reports.map((r) => (
            <Card key={r._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center font-semibold shrink-0">
                    {initials(r.firstName, r.lastName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold truncate">
                        {r.firstName} {r.lastName}
                      </p>
                      <Badge
                        variant="outline"
                        className="text-[10px] shrink-0"
                      >
                        {r.employmentType}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                      <Briefcase className="h-3 w-3 shrink-0" />
                      {r.jobTitle}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    <span className="truncate">{r.team}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="truncate">{r.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate">{r.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span className="truncate">
                      Joined {fmtDate(r.startDate)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
