import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Briefcase, Eye } from "lucide-react";

const initials = (first: string, last: string) =>
  `${(first?.[0] ?? "").toUpperCase()}${(last?.[0] ?? "").toUpperCase()}`;

// ── Dummy data ──────────────────────────────────────────────────
interface DeptReport {
  _id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
}
interface DeptManager {
  _id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  team: string;
  reports: DeptReport[];
}

const MOCK_MANAGERS: DeptManager[] = [
  {
    _id: "m1",
    firstName: "Adaeze",
    lastName: "Nwosu",
    jobTitle: "Compliance Manager",
    team: "Compliance",
    reports: [
      { _id: "r1", firstName: "Amara", lastName: "Okafor", jobTitle: "Senior Compliance Analyst" },
      { _id: "r2", firstName: "David", lastName: "Mensah", jobTitle: "KYC Specialist" },
      { _id: "r3", firstName: "Priya", lastName: "Sharma", jobTitle: "AML Investigator" },
      { _id: "r4", firstName: "Jonas", lastName: "Becker", jobTitle: "Onboarding Associate" },
      { _id: "r5", firstName: "Chiamaka", lastName: "Eze", jobTitle: "Junior Analyst" },
    ],
  },
  {
    _id: "m2",
    firstName: "Tunde",
    lastName: "Bakare",
    jobTitle: "Risk & Monitoring Manager",
    team: "Risk",
    reports: [
      { _id: "r6", firstName: "Liam", lastName: "O'Connor", jobTitle: "Risk Analyst" },
      { _id: "r7", firstName: "Yuki", lastName: "Tanaka", jobTitle: "Transaction Monitoring Analyst" },
      { _id: "r8", firstName: "Sofia", lastName: "Rossi", jobTitle: "Risk Analyst" },
      { _id: "r9", firstName: "Marcus", lastName: "Hill", jobTitle: "Junior Risk Analyst" },
    ],
  },
  {
    _id: "m3",
    firstName: "Fatima",
    lastName: "Diallo",
    jobTitle: "Operations Manager",
    team: "Operations",
    reports: [
      { _id: "r10", firstName: "Sara", lastName: "Khan", jobTitle: "Ops Associate" },
      { _id: "r11", firstName: "Daniel", lastName: "Owusu", jobTitle: "Ops Associate" },
      { _id: "r12", firstName: "Hannah", lastName: "Cole", jobTitle: "Ops Coordinator" },
      { _id: "r13", firstName: "Kwame", lastName: "Asante", jobTitle: "Ops Analyst" },
      { _id: "r14", firstName: "Noor", lastName: "Hassan", jobTitle: "Junior Ops Associate" },
    ],
  },
];

export default function MyDepartment() {
  const managers = MOCK_MANAGERS;
  const totalEmployees = managers.reduce((s, m) => s + m.reports.length, 0);
  const managerCount = managers.length;

  const subtitle =
    managerCount === 0
      ? "Read-only overview."
      : `${managerCount} ${managerCount === 1 ? "Manager" : "Managers"}, ${totalEmployees} total ${totalEmployees === 1 ? "employee" : "employees"}.`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Department</h1>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1.5">
          <Eye className="h-3 w-3" />
          Read-only overview
        </Badge>
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
          {managers.map((m) => (
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
                      <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 truncate">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {m.jobTitle}
                        </span>
                        <span aria-hidden>·</span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {m.team}
                        </span>
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {m.reports.length}{" "}
                    {m.reports.length === 1 ? "report" : "reports"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {m.reports.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic pl-1">
                    No direct reports.
                  </p>
                ) : (
                  <ul className="divide-y border rounded-md">
                    {m.reports.map((r) => (
                      <li
                        key={r._id}
                        className="flex items-center justify-between px-4 py-2.5 text-sm gap-3"
                      >
                        <span className="font-medium truncate">
                          {r.firstName} {r.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground truncate text-right">
                          {r.jobTitle}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
