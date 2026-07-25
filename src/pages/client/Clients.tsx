import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Eye,
  MoreHorizontal,
  Users,
  UserCheck,
  Clock,
  ShieldCheck,
  Building2,
  User as UserIcon,
  ArrowUpRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ApiClient,
  ClientStats,
  fetchClients,
  fetchClientStats,
  displayName,
  prettyLabel,
  toneFor,
  reactivateClient,
} from "@/lib/client/clients-api";

export default function Clients() {
  const { toast } = useToast();
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const loadAll = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [list, s] = await Promise.all([fetchClients(), fetchClientStats()]);
      setClients(list);
      setStats(s);
    } catch (err: any) {
      toast({
        title: "Failed to load clients",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Derive lists & filters
  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const name = displayName(c).toLowerCase();
      const matchSearch =
        name.includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === "all" ||
        (c.status ?? "").toLowerCase() === statusFilter;
      const matchType =
        typeFilter === "all" ||
        (c.classifications ?? "").toLowerCase() === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [clients, search, statusFilter, typeFilter]);

  const total = stats?.total ?? clients.length;
  const countOf = (
    arr: { _id: string; count: number }[] | undefined,
    id: string,
  ) => arr?.find((x) => x._id?.toLowerCase() === id)?.count ?? 0;

  const activeCount =
    countOf(stats?.byStatus, "active") + countOf(stats?.byStatus, "approved");
  const pendingCount =
    countOf(stats?.byStatus, "pending") +
    countOf(stats?.byStatus, "submitted") +
    countOf(stats?.byStatus, "in_progress");
  const kycApproved = countOf(stats?.kycStats, "approved");

  const statCards = [
    {
      title: "Total Clients",
      value: total,
      icon: Users,
      sub: "All time",
      color: "from-blue-500 to-cyan-500",
      tone: "text-primary",
    },
    {
      title: "Active",
      value: activeCount,
      icon: UserCheck,
      sub: "Approved & active",
      color: "from-emerald-500 to-teal-500",
      tone: "text-success",
    },
    {
      title: "Pending Review",
      value: pendingCount,
      icon: Clock,
      sub: "Awaiting action",
      color: "from-amber-500 to-orange-500",
      tone: "text-warning",
    },
    {
      title: "KYC Approved",
      value: kycApproved,
      icon: ShieldCheck,
      sub: "Verified identities",
      color: "from-violet-500 to-purple-600",
      tone: "text-secondary",
    },
  ];

  const handleReactivate = async (clientId: string) => {
    try {
      await reactivateClient(clientId);
      toast({
        title: "Client reactivated",
        description: "They can now log in and redo onboarding.",
      });
      loadAll(true);
    } catch (err: any) {
      toast({
        title: "Reactivation failed",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground">
            Manage every client across your organization
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAll(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card
            key={s.title}
            className="overflow-hidden hover:shadow-md transition-shadow"
          >
            <CardContent className="p-5 relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.title}</p>
                  {loading ? (
                    <Skeleton className="h-8 w-16 mt-2" />
                  ) : (
                    <p className="text-3xl font-bold mt-1">{s.value}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" />
                    {s.sub}
                  </p>
                </div>
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shrink-0`}
                >
                  <s.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Breakdown row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <BreakdownCard
          title="By Status"
          icon={Users}
          loading={loading}
          items={stats?.byStatus ?? []}
          total={total}
        />
        <BreakdownCard
          title="By Classification"
          icon={Building2}
          loading={loading}
          items={stats?.byClassification ?? []}
          total={total}
        />
        <BreakdownCard
          title="KYC Status"
          icon={ShieldCheck}
          loading={loading}
          items={stats?.kycStats ?? []}
          total={total}
        />
      </div>

      {/* Recent clients */}
      {/* {stats?.recentClients && stats.recentClients.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Recently Added
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.recentClients.map((c) => (
                <Link
                  key={c._id}
                  to={`/clients/${c._id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {(displayName(c)[0] ?? "?").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {displayName(c)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.email}
                    </p>
                  </div>
                  <Badge
                    className={`text-[10px] capitalize border ${toneFor(c.status)}`}
                  >
                    {prettyLabel(c.status)}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )} */}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="invited">Invited</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="individual">Individual</SelectItem>
            <SelectItem value="corporate">Corporate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-4">
          {loading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No clients match your filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>KYC</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c._id} className="hover:bg-muted/40">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {c.classifications === "corporate" ? (
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <UserIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <Link
                          to={`/clients/${c._id}`}
                          className="hover:text-primary"
                        >
                          {displayName(c)}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{c.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {prettyLabel(c.classifications)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs capitalize border ${toneFor(c.status)}`}
                      >
                        {prettyLabel(c.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs capitalize border ${toneFor(c.kycStatus)}`}
                      >
                        {prettyLabel(c.kycStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/clients/${c._id}`}>
                              <Eye className="h-4 w-4 mr-2" /> View Profile
                            </Link>
                          </DropdownMenuItem>
                          {(c.status ?? "").toLowerCase() === "inactive" && (
                            <DropdownMenuItem
                              onClick={() => handleReactivate(c._id)}
                              className="text-emerald-600 focus:text-emerald-600"
                            >
                              <RefreshCw className="h-4 w-4 mr-2" /> Reactivate
                              Client
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BreakdownCard({
  title,
  icon: Icon,
  items,
  total,
  loading,
}: {
  title: string;
  icon: typeof Users;
  items: { _id: string; count: number }[];
  total: number;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No data yet.</p>
        ) : (
          <div className="space-y-3">
            {items.map((it) => {
              const pct = total > 0 ? (it.count / total) * 100 : 0;
              return (
                <div key={it._id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="capitalize text-muted-foreground">
                      {prettyLabel(it._id)}
                    </span>
                    <span className="font-medium">{it.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-secondary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
