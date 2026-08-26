import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Search,
  Mail,
  Phone,
  Building2,
  ShieldAlert,
  ShieldCheck,
  FileCheck2,
  ExternalLink,
} from "lucide-react";
import {
  fetchClients,
  displayName,
  prettyLabel,
  toneFor,
  type ApiClient,
} from "@/lib/client/clients-api";

const riskStyle: Record<string, string> = {
  low: "bg-success/10 text-success",
  medium: "bg-warning/10 text-warning",
  high: "bg-destructive/10 text-destructive",
};

export default function AssignedClients() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [selected, setSelected] = useState<ApiClient | null>(null);

  // No assignedTo param needed — the backend already scopes this to
  // clients assigned to the logged-in employee, enforced server-side
  // from their own identity, not a value the frontend could tamper
  // with. Same call an admin's Clients.tsx makes; the response
  // differs because the caller differs.
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["my-assigned-clients"],
    queryFn: fetchClients,
  });

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (
        statusFilter !== "all" &&
        (c.status ?? "").toLowerCase() !== statusFilter
      )
        return false;
      if (
        riskFilter !== "all" &&
        (c.riskLevel ?? "").toLowerCase() !== riskFilter
      )
        return false;
      if (query) {
        const haystack = `${displayName(c)} ${c.email}`.toLowerCase();
        if (!haystack.includes(query.toLowerCase())) return false;
      }
      return true;
    });
  }, [clients, query, statusFilter, riskFilter]);

  const stats = [
    {
      label: "Assigned",
      value: clients.length,
      icon: Users,
      tone: "text-primary",
    },
    {
      label: "High risk",
      value: clients.filter((c) => (c.riskLevel ?? "").toLowerCase() === "high")
        .length,
      icon: ShieldAlert,
      tone: "text-destructive",
    },
    {
      label: "Pending KYC",
      value: clients.filter((c) =>
        ["not_started", "in_progress", "submitted"].includes(
          (c.kycStatus ?? "").toLowerCase(),
        ),
      ).length,
      icon: FileCheck2,
      tone: "text-warning",
    },
    {
      label: "Active",
      value: clients.filter((c) => (c.status ?? "").toLowerCase() === "active")
        .length,
      icon: ShieldCheck,
      tone: "text-success",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Clients</h1>
        <p className="text-sm text-muted-foreground">
          Clients assigned to you.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </div>
              <div className={`p-3 rounded-xl bg-accent ${s.tone}`}>
                <s.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Client list
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name or email"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9 w-full sm:w-64 h-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-36 h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="invited">Invited</SelectItem>
                </SelectContent>
              </Select>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-full sm:w-32 h-9">
                  <SelectValue placeholder="Risk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All risk</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>KYC</TableHead>
                  <TableHead className="text-right">Country</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow
                    key={c._id}
                    className="cursor-pointer hover:bg-accent/40"
                    onClick={() => setSelected(c)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {c.classifications === "corporate" ? (
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Users className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium text-sm">
                            {displayName(c)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {c.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize text-sm">
                      {prettyLabel(c.classifications)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${toneFor(c.status)}`}
                      >
                        {prettyLabel(c.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-[10px] capitalize ${riskStyle[(c.riskLevel ?? "").toLowerCase()] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {c.riskLevel ?? "Unrated"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${toneFor(c.kycStatus)}`}
                      >
                        {prettyLabel(c.kycStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {c.country ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-sm text-muted-foreground py-8"
                    >
                      {clients.length === 0
                        ? "No clients assigned to you yet."
                        : "No clients match your filters."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selected.classifications === "corporate" ? (
                    <Building2 className="h-4 w-4" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  {displayName(selected)}
                </SheetTitle>
                <SheetDescription className="capitalize">
                  {prettyLabel(selected.classifications)} · Client since{" "}
                  {new Date(selected.createdAt).toLocaleDateString()}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={toneFor(selected.status)}>
                    {prettyLabel(selected.status)}
                  </Badge>
                  <Badge
                    className={`capitalize ${riskStyle[(selected.riskLevel ?? "").toLowerCase()] ?? "bg-muted text-muted-foreground"}`}
                  >
                    {selected.riskLevel ?? "Unrated"} risk
                  </Badge>
                  <Badge
                    variant="outline"
                    className={toneFor(selected.kycStatus)}
                  >
                    KYC: {prettyLabel(selected.kycStatus)}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selected.email}</span>
                  </div>
                  {selected.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selected.phone}</span>
                    </div>
                  )}
                  {selected.country && (
                    <p className="text-xs text-muted-foreground">
                      {selected.country}
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button asChild variant="outline" className="flex-1">
                    <Link to="/projects">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View related projects
                    </Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
