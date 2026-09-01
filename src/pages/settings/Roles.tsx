import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { fetchEmployees } from "@/lib/hr/hr-api";
import { prettyLabel } from "@/lib/client/clients-api";

const initials = (first: string, last: string) =>
  `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();

export default function RolesTab() {
  const [q, setQ] = useState("");

  // Real employee list, real roles pulled from each employee's
  // linked user account — same data source the HR module itself
  // uses. Search is server-side since the same endpoint already
  // supports it.
  const { data, isLoading } = useQuery({
    queryKey: ["settings-roles", q],
    queryFn: () => fetchEmployees({ search: q || undefined, limit: 100 }),
    staleTime: 60_000,
  });

  const rows = data?.items ?? [];

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
              placeholder="Search name, team, role"
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
                <TableHead>Team</TableHead>
                <TableHead>Hierarchy</TableHead>
                <TableHead>Role(s)</TableHead>
                <TableHead className="text-right">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    {q
                      ? "No employees match your search."
                      : "No employees added yet."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((u) => {
                  const team =
                    typeof u.teamId === "object" && u.teamId
                      ? u.teamId.name
                      : null;
                  return (
                    <TableRow key={u._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {initials(u.firstName, u.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {u.firstName} {u.lastName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{team ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {prettyLabel(u.hierarchyRole)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {u.roles && u.roles.length > 0 ? (
                            u.roles.map((r) => (
                              <Badge key={r} variant="secondary">
                                {prettyLabel(r)}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              No roles assigned
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {u.startDate
                          ? new Date(u.startDate).toLocaleDateString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
