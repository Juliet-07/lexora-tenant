import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchWatchlistStats,
  fetchWatchlistEntries,
  addWatchlistEntry,
  deleteWatchlistEntry,
  syncWatchlist,
  adHocScreen,
  importWatchlistCsv,
  type WatchlistEntry,
  type WatchlistStats,
  type AdHocScreenResult,
} from "@/lib/kyc/kyc-api";
import { prettyLabel } from "@/lib/client/clients-api";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const LIST_TYPE_MAP: Record<string, string> = {
  sanctions: "Sanctions",
  pep: "PEP",
  adverse_media: "Adverse Media",
  internal_block: "Internal Block",
};

function listBadge(listType: string) {
  const label = LIST_TYPE_MAP[listType] ?? listType;
  const cls =
    listType === "sanctions"
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : listType === "pep"
        ? "bg-warning/15 text-warning border-warning/30"
        : listType === "adverse_media"
          ? "bg-info/15 text-info border-info/30"
          : "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={`${cls} text-[10px]`}>
      {label}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────
// ADD ENTRY DIALOG
// ─────────────────────────────────────────────────────────────

function AddEntryDialog({ onAdded }: { onAdded: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    aliases: "",
    entityType: "individual" as "individual" | "organization",
    listType: "sanctions" as
      | "sanctions"
      | "pep"
      | "adverse_media"
      | "internal_block",
    country: "",
    source: "Manual entry",
    reason: "",
  });

  const mutation = useMutation({
    mutationFn: () => addWatchlistEntry(form),
    onSuccess: () => {
      toast({ title: "Entry added to watchlist" });
      setOpen(false);
      setForm({
        name: "",
        aliases: "",
        entityType: "individual",
        listType: "sanctions",
        country: "",
        source: "Manual entry",
        reason: "",
      });
      onAdded();
    },
    onError: (err: any) =>
      toast({
        title: "Failed",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const canSubmit =
    form.name.trim() && form.reason.trim() && !mutation.isPending;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="gap-1 bg-gradient-to-r from-primary to-secondary"
      >
        <Plus className="h-4 w-4" /> Add Entry
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Watchlist Entry</DialogTitle>
            <DialogDescription>
              Manually add a person or organization. They will be matched during
              all future screenings.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label>
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g. John Doe / Acme Corp"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Aliases</Label>
                <Input
                  value={form.aliases}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, aliases: e.target.value }))
                  }
                  placeholder="aka, alternate names"
                />
              </div>
              <div className="space-y-2">
                <Label>Country (ISO code)</Label>
                <Input
                  value={form.country}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      country: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="e.g. RW, US, CN"
                  maxLength={2}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Entity Type</Label>
                <Select
                  value={form.entityType}
                  onValueChange={(v: any) =>
                    setForm((p) => ({ ...p, entityType: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="organization">Organization</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>List Type</Label>
                <Select
                  value={form.listType}
                  onValueChange={(v: any) =>
                    setForm((p) => ({ ...p, listType: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sanctions">Sanctions</SelectItem>
                    <SelectItem value="pep">PEP</SelectItem>
                    <SelectItem value="adverse_media">Adverse Media</SelectItem>
                    <SelectItem value="internal_block">
                      Internal Block
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Source</Label>
              <Input
                value={form.source}
                onChange={(e) =>
                  setForm((p) => ({ ...p, source: e.target.value }))
                }
                placeholder="e.g. OFAC SDN, Internal Risk Team"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={3}
                placeholder="Why is this entity being watchlisted?"
                value={form.reason}
                onChange={(e) =>
                  setForm((p) => ({ ...p, reason: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-primary to-secondary"
              disabled={!canSubmit}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add Entry"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// IMPORT CSV DIALOG
// ─────────────────────────────────────────────────────────────

function ImportCsvDialog({ onImported }: { onImported: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState("");

  const mutation = useMutation({
    mutationFn: () => importWatchlistCsv(csv),
    onSuccess: (data) => {
      toast({ title: `${data.imported} entries imported` });
      setOpen(false);
      setCsv("");
      onImported();
    },
    onError: (err: any) =>
      toast({
        title: "Import failed",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  return (
    <>
      <Button variant="outline" className="gap-1" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" /> Import CSV
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Watchlist from CSV</DialogTitle>
            <DialogDescription>
              Paste CSV content below. Required columns: name, entityType,
              listType, country, source, reason. Optional: aliases.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/40 text-xs font-mono text-muted-foreground">
              name,entityType,listType,country,source,reason,aliases
              <br />
              John Doe,individual,sanctions,US,OFAC SDN,Designated under EO,J.
              Doe
            </div>
            <Textarea
              rows={8}
              placeholder="Paste CSV here..."
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!csv.trim() || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Import"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────

export default function WatchlistManagement() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [listFilter, setListFilter] = useState("");
  const [screenName, setScreenName] = useState("");
  const [checkLive, setCheckLive] = useState(false);
  const [screenResult, setScreenResult] = useState<AdHocScreenResult | null>(
    null,
  );
  const [screening, setScreening] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["watchlist-stats"] });
    qc.invalidateQueries({ queryKey: ["watchlist-entries"] });
  };

  // ── Queries ───────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["watchlist-stats"],
    queryFn: fetchWatchlistStats,
    staleTime: 60_000,
  });

  const { data: entriesData, isLoading: entriesLoading } = useQuery({
    queryKey: ["watchlist-entries", listFilter, search],
    queryFn: () =>
      fetchWatchlistEntries({
        listType: listFilter || undefined,
        search: search || undefined,
        limit: 100,
      }),
    staleTime: 30_000,
  });

  // ── Sync mutation ─────────────────────────────────────────
  const syncMutation = useMutation({
    mutationFn: syncWatchlist,
    onSuccess: (data) => {
      toast({
        title: "Sync complete",
        description: `${data.synced} entries synced from OpenSanctions.`,
      });
      invalidate();
    },
    onError: (err: any) =>
      toast({
        title: "Sync failed",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  // ── Delete mutation ───────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: deleteWatchlistEntry,
    onSuccess: () => {
      toast({ title: "Entry deactivated" });
      invalidate();
    },
    onError: (err: any) =>
      toast({
        title: "Failed",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  // ── Ad-hoc screening ─────────────────────────────────────
  const runScreening = async () => {
    if (!screenName.trim()) {
      toast({ title: "Enter a name to screen", variant: "destructive" });
      return;
    }
    setScreening(true);
    setScreenResult(null);
    try {
      const result = await adHocScreen({ name: screenName, checkLive });
      setScreenResult(result);
      if (result.totalHits === 0) {
        toast({ title: "Clear — no matches found" });
      } else {
        toast({
          title: `${result.totalHits} potential match(es) found`,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Screening failed",
        description: err?.response?.data?.message,
        variant: "destructive",
      });
    } finally {
      setScreening(false);
    }
  };

  const entries = entriesData?.items ?? [];

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Watchlist Management</h1>
          <p className="text-sm text-muted-foreground">
            Maintain sanctions, PEP, adverse media and internal block lists used
            for screening
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            className="gap-1"
            disabled={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
          >
            {syncMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync Sources
          </Button>
          <AddEntryDialog onAdded={invalidate} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statsLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))
        ) : (
          <>
            {[
              {
                label: "Total Entries",
                value: stats?.total ?? 0,
                icon: ListChecks,
                color: "text-primary",
                bg: "bg-primary/5 border-primary/30",
              },
              {
                label: "Sanctions",
                value: stats?.sanctions ?? 0,
                icon: ShieldAlert,
                color: "text-destructive",
                bg: "bg-destructive/5 border-destructive/30",
              },
              {
                label: "PEP",
                value: stats?.pep ?? 0,
                icon: UserX,
                color: "text-warning",
                bg: "bg-warning/5 border-warning/30",
              },
              {
                label: "Adverse Media",
                value: stats?.adverseMedia ?? 0,
                icon: Globe2,
                color: "text-info",
                bg: "bg-info/5 border-info/30",
              },
              {
                label: "Internal Block",
                value: stats?.internalBlock ?? 0,
                icon: ShieldAlert,
                color: "text-foreground",
                bg: "",
              },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label} className={bg}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={`text-3xl font-bold ${color}`}>{value}</p>
                    </div>
                    <Icon className={`h-7 w-7 opacity-40 ${color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>

      <Tabs defaultValue="entries">
        <TabsList>
          <TabsTrigger value="entries">Watchlist Entries</TabsTrigger>
          <TabsTrigger value="screen">Ad-hoc Screening</TabsTrigger>
          <TabsTrigger value="sources">List Sources</TabsTrigger>
        </TabsList>

        {/* ── ENTRIES TAB ── */}
        <TabsContent value="entries" className="space-y-4 mt-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, alias, country…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={listFilter || "all"}
                  onValueChange={(v) => setListFilter(v === "all" ? "" : v)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Lists" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Lists</SelectItem>{" "}
                    {/* ← valid value */}
                    <SelectItem value="sanctions">Sanctions</SelectItem>
                    <SelectItem value="pep">PEP</SelectItem>
                    <SelectItem value="adverse_media">Adverse Media</SelectItem>
                    <SelectItem value="internal_block">
                      Internal Block
                    </SelectItem>
                  </SelectContent>
                </Select>
                <ImportCsvDialog onImported={invalidate} />
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {entriesLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : entries.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <ListChecks className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    {search || listFilter
                      ? "No entries match the current filters."
                      : "No watchlist entries yet. Add one manually or sync from OpenSanctions."}
                  </p>
                  {!search && !listFilter && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={syncMutation.isPending}
                      onClick={() => syncMutation.mutate()}
                    >
                      {syncMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Sync from OpenSanctions
                    </Button>
                  )}
                </div>
              ) : (
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
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((e) => (
                      <TableRow key={e._id}>
                        <TableCell className="font-mono text-xs">
                          {e.entryId}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{e.name}</div>
                          {e.aliases && (
                            <div className="text-xs text-muted-foreground">
                              aka {e.aliases}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-[10px] capitalize"
                          >
                            {e.entityType}
                          </Badge>
                        </TableCell>
                        <TableCell>{listBadge(e.listType)}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {e.country ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {e.source ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">
                          {e.reason ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(e.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              e.isActive
                                ? "bg-success/15 text-success border-success/30"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {e.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(e._id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── AD-HOC SCREENING TAB ── */}
        <TabsContent value="screen" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" /> Ad-hoc Name
                Screening
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Check a name against all active watchlist entries before
                onboarding or releasing funds.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Input
                  placeholder="Enter full name or alias…"
                  value={screenName}
                  onChange={(e) => setScreenName(e.target.value)}
                  className="flex-1 min-w-[200px]"
                  onKeyDown={(e) => e.key === "Enter" && runScreening()}
                />
                <Button
                  onClick={runScreening}
                  disabled={screening}
                  className="bg-gradient-to-r from-primary to-secondary"
                >
                  {screening ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Screen
                </Button>
              </div>

              {/* Live check toggle */}
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  id="checkLive"
                  checked={checkLive}
                  onChange={(e) => setCheckLive(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="checkLive" className="text-sm cursor-pointer">
                  Also check live against OpenSanctions API
                </label>
                <span className="text-xs text-muted-foreground">
                  (slower but more thorough)
                </span>
              </div>

              {/* Results */}
              {screenResult && (
                <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                  {screenResult.totalHits === 0 ? (
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                      <p className="text-sm font-medium">
                        No matches found in any active watchlist.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <p className="text-sm font-semibold">
                          {screenResult.totalHits} potential match(es) for "
                          {screenResult.name}"
                        </p>
                      </div>

                      {/* Local matches */}
                      {screenResult.localMatches.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Local Watchlist Matches
                          </p>
                          {screenResult.localMatches.map((h) => (
                            <div
                              key={h._id}
                              className="flex items-center justify-between p-2 rounded bg-background border"
                            >
                              <div>
                                <p className="text-sm font-medium">{h.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {h.source ?? "—"} · {h.country ?? "—"} ·{" "}
                                  {h.reason ?? "—"}
                                </p>
                              </div>
                              {listBadge(h.listType)}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Live OpenSanctions matches */}
                      {screenResult.liveMatches.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Live OpenSanctions Matches
                          </p>
                          {screenResult.liveMatches.map((h: any, i: number) => (
                            <div
                              key={h.id ?? i}
                              className="flex items-center justify-between p-2 rounded bg-background border"
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  {h.caption}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Score: {Math.round((h.score ?? 0) * 100)}% ·{" "}
                                  {h.datasets?.join(", ")}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className="text-xs bg-destructive/10 text-destructive border-destructive/20"
                              >
                                Live hit
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Screened at{" "}
                    {new Date(screenResult.screenedAt).toLocaleTimeString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── LIST SOURCES TAB ── */}
        <TabsContent value="sources" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Connected List Sources
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Automated feeds powered by OpenSanctions. Click "Sync Sources"
                to pull the latest data.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Info banner */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-info/5 border border-info/20 text-sm">
                <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Lexora uses <strong>OpenSanctions</strong> — an open-source
                  database aggregating 332+ global sources including OFAC, EU,
                  UN, UK HMT sanctions lists and PEP databases. Data is synced
                  on demand using the "Sync Sources" button.
                </p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dataset</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Coverage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    {
                      dataset: "us_ofac_sdn",
                      provider: "US Treasury (OFAC)",
                      listType: "sanctions",
                      coverage: "US sanctions — individuals and entities",
                    },
                    {
                      dataset: "eu_fsf",
                      provider: "European Union",
                      listType: "sanctions",
                      coverage: "EU consolidated financial sanctions list",
                    },
                    {
                      dataset: "un_sc_sanctions",
                      provider: "United Nations",
                      listType: "sanctions",
                      coverage: "UN Security Council consolidated sanctions",
                    },
                    {
                      dataset: "gb_hmt_sanctions",
                      provider: "UK HM Treasury",
                      listType: "sanctions",
                      coverage: "UK sanctions list",
                    },
                    {
                      dataset: "everypolitician",
                      provider: "EveryPolitician",
                      listType: "pep",
                      coverage: "Global politically exposed persons",
                    },
                  ].map((s) => (
                    <TableRow key={s.dataset}>
                      <TableCell className="font-mono text-xs">
                        {s.dataset}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {s.provider}
                      </TableCell>
                      <TableCell>{listBadge(s.listType)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.coverage}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-end">
                <Button
                  disabled={syncMutation.isPending}
                  onClick={() => syncMutation.mutate()}
                >
                  {syncMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Syncing…
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" /> Sync All Sources
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
