import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ShieldAlert,
  Plus,
  Search,
  Trash2,
  RefreshCw,
  Upload,
  ListChecks,
  Globe2,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

type ListType = "Sanctions" | "PEP" | "Adverse Media" | "Internal Block";
type EntityType = "Individual" | "Organization";

interface WatchlistEntry {
  id: string;
  name: string;
  alias?: string;
  type: EntityType;
  list: ListType;
  country: string;
  source: string;
  dateOfBirth?: string;
  reason: string;
  addedAt: string;
  active: boolean;
}

interface ListSource {
  id: string;
  name: string;
  provider: string;
  type: ListType;
  records: number;
  lastSync: string;
  status: "Synced" | "Stale" | "Error";
}

const initialEntries: WatchlistEntry[] = [
  {
    id: "WL001",
    name: "Viktor Petrov",
    alias: "V. Petrov",
    type: "Individual",
    list: "Sanctions",
    country: "RU",
    source: "OFAC SDN",
    dateOfBirth: "1968-04-12",
    reason: "Designated under EO 14024",
    addedAt: "2025-12-04",
    active: true,
  },
  {
    id: "WL002",
    name: "Apex Capital Holdings",
    type: "Organization",
    list: "Sanctions",
    country: "AE",
    source: "EU Consolidated",
    reason: "Shell company linked to sanctioned entity",
    addedAt: "2025-11-22",
    active: true,
  },
  {
    id: "WL003",
    name: "Joseph Mwale",
    type: "Individual",
    list: "PEP",
    country: "ZM",
    source: "Dow Jones PEP",
    dateOfBirth: "1972-09-30",
    reason: "Senior cabinet minister",
    addedAt: "2025-10-15",
    active: true,
  },
  {
    id: "WL004",
    name: "Beijing Imports Ltd",
    type: "Organization",
    list: "Adverse Media",
    country: "CN",
    source: "Refinitiv World-Check",
    reason: "Multiple fraud allegations 2024",
    addedAt: "2025-09-08",
    active: true,
  },
  {
    id: "WL005",
    name: "Tafara Sibanda",
    type: "Individual",
    list: "Internal Block",
    country: "ZW",
    source: "Internal Risk Team",
    dateOfBirth: "1985-01-19",
    reason: "Confirmed account takeover attempt",
    addedAt: "2025-08-30",
    active: false,
  },
];

const listSources: ListSource[] = [
  { id: "LS01", name: "OFAC SDN", provider: "US Treasury", type: "Sanctions", records: 13420, lastSync: "2 hours ago", status: "Synced" },
  { id: "LS02", name: "EU Consolidated", provider: "European Union", type: "Sanctions", records: 4150, lastSync: "5 hours ago", status: "Synced" },
  { id: "LS03", name: "UN Sanctions", provider: "United Nations", type: "Sanctions", records: 1080, lastSync: "1 day ago", status: "Stale" },
  { id: "LS04", name: "Dow Jones PEP", provider: "Dow Jones", type: "PEP", records: 1280000, lastSync: "12 hours ago", status: "Synced" },
  { id: "LS05", name: "Refinitiv World-Check", provider: "Refinitiv", type: "Adverse Media", records: 5400000, lastSync: "3 hours ago", status: "Synced" },
  { id: "LS06", name: "Internal Block List", provider: "Lexora", type: "Internal Block", records: 42, lastSync: "Just now", status: "Synced" },
];

function listBadge(l: ListType) {
  const cls =
    l === "Sanctions"
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : l === "PEP"
        ? "bg-warning/15 text-warning border-warning/30"
        : l === "Adverse Media"
          ? "bg-info/15 text-info border-info/30"
          : "bg-muted text-muted-foreground";
  return <Badge variant="outline" className={`${cls} text-[10px]`}>{l}</Badge>;
}

export default function WatchlistManagement() {
  const [entries, setEntries] = useState<WatchlistEntry[]>(initialEntries);
  const [query, setQuery] = useState("");
  const [listFilter, setListFilter] = useState<ListType | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [screenName, setScreenName] = useState("");
  const [screenResult, setScreenResult] = useState<WatchlistEntry[] | null>(null);

  const [form, setForm] = useState({
    name: "",
    alias: "",
    type: "Individual" as EntityType,
    list: "Sanctions" as ListType,
    country: "",
    source: "Manual entry",
    dateOfBirth: "",
    reason: "",
  });

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const matchQ =
        !query ||
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.alias?.toLowerCase().includes(query.toLowerCase()) ||
        e.country.toLowerCase().includes(query.toLowerCase());
      const matchL = listFilter === "all" || e.list === listFilter;
      return matchQ && matchL;
    });
  }, [entries, query, listFilter]);

  const stats = useMemo(() => {
    return {
      total: entries.length,
      sanctions: entries.filter((e) => e.list === "Sanctions").length,
      pep: entries.filter((e) => e.list === "PEP").length,
      adverse: entries.filter((e) => e.list === "Adverse Media").length,
      internal: entries.filter((e) => e.list === "Internal Block").length,
    };
  }, [entries]);

  const resetForm = () =>
    setForm({
      name: "",
      alias: "",
      type: "Individual",
      list: "Sanctions",
      country: "",
      source: "Manual entry",
      dateOfBirth: "",
      reason: "",
    });

  const addEntry = () => {
    if (!form.name || !form.country || !form.reason) {
      toast.error("Name, country and reason are required");
      return;
    }
    setEntries([
      {
        id: `WL${String(entries.length + 1).padStart(3, "0")}`,
        name: form.name,
        alias: form.alias || undefined,
        type: form.type,
        list: form.list,
        country: form.country.toUpperCase(),
        source: form.source || "Manual entry",
        dateOfBirth: form.dateOfBirth || undefined,
        reason: form.reason,
        addedAt: new Date().toISOString().slice(0, 10),
        active: true,
      },
      ...entries,
    ]);
    resetForm();
    setDialogOpen(false);
    toast.success("Watchlist entry added");
  };

  const removeEntry = (id: string) => {
    setEntries(entries.filter((e) => e.id !== id));
    toast.success("Entry removed");
  };

  const runScreening = () => {
    if (!screenName.trim()) {
      toast.error("Enter a name to screen");
      return;
    }
    const q = screenName.toLowerCase();
    const hits = entries.filter(
      (e) =>
        e.active &&
        (e.name.toLowerCase().includes(q) ||
          e.alias?.toLowerCase().includes(q)),
    );
    setScreenResult(hits);
    if (hits.length === 0) toast.success("No matches found — clear");
    else toast.warning(`${hits.length} potential match(es) found`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Watchlist Management</h1>
          <p className="text-sm text-muted-foreground">
            Maintain sanctions, PEP, adverse media and internal block lists used for screening
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1" onClick={() => toast.info("Sync triggered for all sources")}>
            <RefreshCw className="h-4 w-4" /> Sync Sources
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Add Entry
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-primary/5 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Entries</p>
                <p className="text-3xl font-bold text-primary">{stats.total}</p>
              </div>
              <ListChecks className="h-7 w-7 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Sanctions</p>
                <p className="text-3xl font-bold text-destructive">{stats.sanctions}</p>
              </div>
              <ShieldAlert className="h-7 w-7 text-destructive/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-warning/5 border-warning/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">PEP</p>
                <p className="text-3xl font-bold text-warning">{stats.pep}</p>
              </div>
              <UserX className="h-7 w-7 text-warning/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-info/5 border-info/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Adverse Media</p>
                <p className="text-3xl font-bold text-info">{stats.adverse}</p>
              </div>
              <Globe2 className="h-7 w-7 text-info/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Internal Block</p>
                <p className="text-3xl font-bold">{stats.internal}</p>
              </div>
              <ShieldAlert className="h-7 w-7 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="entries">
        <TabsList>
          <TabsTrigger value="entries">Watchlist Entries</TabsTrigger>
          <TabsTrigger value="screen">Ad-hoc Screening</TabsTrigger>
          <TabsTrigger value="sources">List Sources</TabsTrigger>
        </TabsList>

        {/* Entries tab */}
        <TabsContent value="entries" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, alias, country…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={listFilter} onValueChange={(v) => setListFilter(v as any)}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Lists</SelectItem>
                    <SelectItem value="Sanctions">Sanctions</SelectItem>
                    <SelectItem value="PEP">PEP</SelectItem>
                    <SelectItem value="Adverse Media">Adverse Media</SelectItem>
                    <SelectItem value="Internal Block">Internal Block</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="gap-1" onClick={() => toast.info("Import wizard coming soon")}>
                  <Upload className="h-4 w-4" /> Import CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>List</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">{e.id}</TableCell>
                      <TableCell>
                        <div className="font-medium">{e.name}</div>
                        {e.alias && <div className="text-xs text-muted-foreground">aka {e.alias}</div>}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{e.type}</Badge></TableCell>
                      <TableCell>{listBadge(e.list)}</TableCell>
                      <TableCell className="font-mono text-xs">{e.country}</TableCell>
                      <TableCell className="text-xs">{e.source}</TableCell>
                      <TableCell className="text-xs max-w-[220px] truncate">{e.reason}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.addedAt}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={e.active ? "bg-success/15 text-success border-success/30" : "bg-muted text-muted-foreground"}
                        >
                          {e.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeEntry(e.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">
                        No entries match the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Screening tab */}
        <TabsContent value="screen" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" /> Ad-hoc Name Screening
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Check a name against all active watchlist entries before onboarding or releasing funds.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter full name or alias…"
                  value={screenName}
                  onChange={(e) => setScreenName(e.target.value)}
                />
                <Button onClick={runScreening} className="gap-1">
                  <Search className="h-4 w-4" /> Screen
                </Button>
              </div>

              {screenResult !== null && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  {screenResult.length === 0 ? (
                    <p className="text-sm text-success font-medium">
                      ✓ No matches found in any active watchlist.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-destructive">
                        {screenResult.length} potential match(es) for "{screenName}"
                      </p>
                      {screenResult.map((h) => (
                        <div key={h.id} className="flex items-center justify-between p-2 rounded bg-background border">
                          <div>
                            <p className="text-sm font-medium">{h.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {h.source} · {h.country} · {h.reason}
                            </p>
                          </div>
                          {listBadge(h.list)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sources tab */}
        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Connected List Sources</CardTitle>
              <p className="text-xs text-muted-foreground">
                Automated feeds powering screening. Sync intervals are configurable per source.
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listSources.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.id}</TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.provider}</TableCell>
                      <TableCell>{listBadge(s.type)}</TableCell>
                      <TableCell className="font-semibold">{s.records.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.lastSync}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            s.status === "Synced"
                              ? "bg-success/15 text-success border-success/30"
                              : s.status === "Stale"
                                ? "bg-warning/15 text-warning border-warning/30"
                                : "bg-destructive/15 text-destructive border-destructive/30"
                          }
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0"
                          onClick={() => toast.success(`Syncing ${s.name}`)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" /> Sync
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add entry dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Watchlist Entry</DialogTitle>
            <DialogDescription>
              Manually add a person or organization to a watchlist. They will be matched during screening.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>Full Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., John Doe / Acme Corp"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Alias</Label>
                <Input
                  value={form.alias}
                  onChange={(e) => setForm({ ...form, alias: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label>Country (ISO) *</Label>
                <Input
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  placeholder="e.g., ZW"
                  maxLength={2}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Entity Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as EntityType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Individual">Individual</SelectItem>
                    <SelectItem value="Organization">Organization</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>List</Label>
                <Select value={form.list} onValueChange={(v) => setForm({ ...form, list: v as ListType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sanctions">Sanctions</SelectItem>
                    <SelectItem value="PEP">PEP</SelectItem>
                    <SelectItem value="Adverse Media">Adverse Media</SelectItem>
                    <SelectItem value="Internal Block">Internal Block</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                />
              </div>
              <div>
                <Label>Source</Label>
                <Input
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Reason *</Label>
              <Textarea
                rows={3}
                placeholder="Why is this entity being watchlisted?"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>
              Cancel
            </Button>
            <Button onClick={addEntry}>Add Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
