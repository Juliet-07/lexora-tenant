import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import {
  Users,
  Search,
  Mail,
  Phone,
  Building2,
  ShieldAlert,
  CalendarClock,
  FileText,
  ExternalLink,
} from "lucide-react";

// ──────────────────────────────────────────────────────────────
// AssignedClients — clients assigned to the currently logged-in
// team member. Mock data for now; will swap for an API call later.
// ──────────────────────────────────────────────────────────────

type AssignedClient = {
  id: string;
  name: string;
  type: "individual" | "corporate";
  email: string;
  phone: string;
  industry?: string;
  status: "active" | "in_review" | "pending" | "suspended";
  risk: "low" | "medium" | "high";
  assignedOn: string;
  nextAction: string;
  nextActionDue: string;
  openTasks: number;
  lastContact: string;
};

const MOCK_CLIENTS: AssignedClient[] = [
  {
    id: "c-001",
    name: "Acme Holdings Ltd",
    type: "corporate",
    email: "chloe@acme.com",
    phone: "+250 794 424 333",
    industry: "Financial Services",
    status: "in_review",
    risk: "medium",
    assignedOn: "2026-05-12",
    nextAction: "Review EDD documents",
    nextActionDue: "Today",
    openTasks: 3,
    lastContact: "2 days ago",
  },
  {
    id: "c-002",
    name: "Jane Smith",
    type: "individual",
    email: "jane.smith@gmail.com",
    phone: "+250 788 110 220",
    status: "pending",
    risk: "low",
    assignedOn: "2026-05-30",
    nextAction: "Complete KYC verification",
    nextActionDue: "Tomorrow",
    openTasks: 1,
    lastContact: "5 days ago",
  },
  {
    id: "c-003",
    name: "Bright Futures NGO",
    type: "corporate",
    email: "ops@brightfutures.org",
    phone: "+250 722 998 100",
    industry: "Non-Profit",
    status: "active",
    risk: "low",
    assignedOn: "2026-02-14",
    nextAction: "Annual review",
    nextActionDue: "Jun 18",
    openTasks: 2,
    lastContact: "1 week ago",
  },
  {
    id: "c-004",
    name: "Vortex Trading Co.",
    type: "corporate",
    email: "compliance@vortex.co",
    phone: "+1 415 555 0192",
    industry: "Trading",
    status: "active",
    risk: "high",
    assignedOn: "2026-04-02",
    nextAction: "Source of funds follow-up",
    nextActionDue: "Jun 11",
    openTasks: 4,
    lastContact: "Yesterday",
  },
  {
    id: "c-005",
    name: "Daniel Okafor",
    type: "individual",
    email: "d.okafor@outlook.com",
    phone: "+234 803 111 4477",
    status: "active",
    risk: "low",
    assignedOn: "2026-03-21",
    nextAction: "Quarterly check-in",
    nextActionDue: "Jul 01",
    openTasks: 0,
    lastContact: "3 weeks ago",
  },
];

const statusStyle: Record<AssignedClient["status"], string> = {
  active: "bg-success/10 text-success border-success/30",
  in_review: "bg-info/10 text-info border-info/30",
  pending: "bg-warning/10 text-warning border-warning/30",
  suspended: "bg-destructive/10 text-destructive border-destructive/30",
};

const riskStyle: Record<AssignedClient["risk"], string> = {
  low: "bg-success/10 text-success",
  medium: "bg-warning/10 text-warning",
  high: "bg-destructive/10 text-destructive",
};

export default function AssignedClients() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [selected, setSelected] = useState<AssignedClient | null>(null);

  const filtered = useMemo(() => {
    return MOCK_CLIENTS.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (riskFilter !== "all" && c.risk !== riskFilter) return false;
      if (
        query &&
        !`${c.name} ${c.email}`.toLowerCase().includes(query.toLowerCase())
      )
        return false;
      return true;
    });
  }, [query, statusFilter, riskFilter]);

  const stats = [
    {
      label: "Assigned",
      value: MOCK_CLIENTS.length,
      icon: Users,
      tone: "text-primary",
    },
    {
      label: "High risk",
      value: MOCK_CLIENTS.filter((c) => c.risk === "high").length,
      icon: ShieldAlert,
      tone: "text-destructive",
    },
    {
      label: "Due this week",
      value: MOCK_CLIENTS.filter((c) =>
        ["Today", "Tomorrow", "Jun 11", "Jun 12", "Jun 13", "Jun 14"].includes(
          c.nextActionDue,
        ),
      ).length,
      icon: CalendarClock,
      tone: "text-warning",
    },
    {
      label: "Open tasks",
      value: MOCK_CLIENTS.reduce((sum, c) => sum + c.openTasks, 0),
      icon: FileText,
      tone: "text-info",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Clients</h1>
        <p className="text-sm text-muted-foreground">
          Clients assigned to you. Reach out, log activity, and track next steps.
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
                  <SelectItem value="in_review">In review</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Next action</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Tasks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-accent/40"
                  onClick={() => setSelected(c)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {c.type === "corporate" ? (
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Users className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize text-sm">{c.type}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize ${statusStyle[c.status]}`}
                    >
                      {c.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`text-[10px] capitalize ${riskStyle[c.risk]}`}
                    >
                      {c.risk}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{c.nextAction}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.nextActionDue}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {c.openTasks}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-sm text-muted-foreground py-8"
                  >
                    No clients match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selected.type === "corporate" ? (
                    <Building2 className="h-4 w-4" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  {selected.name}
                </SheetTitle>
                <SheetDescription className="capitalize">
                  {selected.type} · Assigned {selected.assignedOn}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={`capitalize ${statusStyle[selected.status]}`}
                  >
                    {selected.status.replace("_", " ")}
                  </Badge>
                  <Badge className={`capitalize ${riskStyle[selected.risk]}`}>
                    {selected.risk} risk
                  </Badge>
                  {selected.industry && (
                    <Badge variant="outline">{selected.industry}</Badge>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selected.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selected.phone}</span>
                  </div>
                </div>

                <Card>
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Next action
                    </p>
                    <p className="font-medium text-sm">{selected.nextAction}</p>
                    <p className="text-xs text-muted-foreground">
                      Due {selected.nextActionDue} · Last contact{" "}
                      {selected.lastContact}
                    </p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Open tasks</p>
                      <p className="text-xl font-bold">{selected.openTasks}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Assigned on</p>
                      <p className="text-sm font-medium">{selected.assignedOn}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button asChild variant="outline" className="flex-1">
                    <Link to="/projects">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View related projects
                    </Link>
                  </Button>
                  <Button className="flex-1">
                    <Mail className="h-4 w-4 mr-2" />
                    Contact client
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
