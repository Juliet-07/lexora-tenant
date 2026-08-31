import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, ShieldCheck } from "lucide-react";

interface RoleUser {
  id: string;
  name: string;
  email: string;
  department: string;
  hierarchy: string;
  roles: string[];
  assignedOn: string;
}

const ROLE_USERS: RoleUser[] = [
  {
    id: "u1",
    name: "Amina Okafor",
    email: "amina.okafor@lexora.io",
    department: "Executive",
    hierarchy: "Owner",
    roles: ["Tenant Owner"],
    assignedOn: "2025-01-12",
  },
  {
    id: "u2",
    name: "David Mensah",
    email: "david.mensah@lexora.io",
    department: "Compliance",
    hierarchy: "Head of Department",
    roles: ["Tenant Admin", "Compliance Officer"],
    assignedOn: "2025-02-04",
  },
  {
    id: "u3",
    name: "Sarah Ibrahim",
    email: "sarah.ibrahim@lexora.io",
    department: "Human Resources",
    hierarchy: "Head of Department",
    roles: ["HR Manager"],
    assignedOn: "2025-02-18",
  },
  {
    id: "u4",
    name: "Tunde Bello",
    email: "tunde.bello@lexora.io",
    department: "Finance",
    hierarchy: "Manager",
    roles: ["Finance Manager", "Approver"],
    assignedOn: "2025-03-06",
  },
  {
    id: "u5",
    name: "Grace Nwosu",
    email: "grace.nwosu@lexora.io",
    department: "Client Services",
    hierarchy: "Manager",
    roles: ["Relationship Manager"],
    assignedOn: "2025-03-22",
  },
  {
    id: "u6",
    name: "Peter Adeyemi",
    email: "peter.adeyemi@lexora.io",
    department: "Legal & Governance",
    hierarchy: "Manager",
    roles: ["GRC Analyst", "Board Secretary"],
    assignedOn: "2025-04-09",
  },
  {
    id: "u7",
    name: "Chidi Eze",
    email: "chidi.eze@lexora.io",
    department: "Operations",
    hierarchy: "Regular",
    roles: ["Service Desk Agent"],
    assignedOn: "2025-05-15",
  },
];

const initials = (n: string) =>
  n
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function RolesTab() {
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return ROLE_USERS;
    return ROLE_USERS.filter((u) =>
      [u.name, u.department, u.hierarchy, ...u.roles]
        .join(" ")
        .toLowerCase()
        .includes(s),
    );
  }, [q]);

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" /> Assigned roles
            </CardTitle>
            <CardDescription>
              Everyone in your organisation who currently holds a system role.
              Roles are granted when creating an employee in the HR module, or
              anytime after.
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, department, role"
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Hierarchy</TableHead>
                <TableHead>Role(s)</TableHead>
                <TableHead className="text-right">Assigned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {initials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{u.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {u.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{u.department}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{u.hierarchy}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <Badge key={r} variant="secondary">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {new Date(u.assignedOn).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No users match your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
