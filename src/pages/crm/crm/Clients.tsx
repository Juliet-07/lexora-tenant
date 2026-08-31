import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Users,
  DollarSign,
  Heart,
  AlertTriangle,
  Timer,
  UserCog,
  Link2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  fetchClients,
  displayName,
  prettyLabel,
  type ApiClient,
} from "@/lib/client/clients-api";
import { fetchSlaProfiles } from "@/lib/crm/sla-profiles-api";
import {
  fetchClientCommercials,
  saveClientCommercial,
  defaultCommercial,
  healthScore,
  healthBand,
  SERVICE_LINES,
  type ClientCommercial,
  type ClientRisk,
  type FeeTier,
  type UpsertClientCommercialPayload,
} from "@/lib/crm/client-commercial-api";
import { fetchEmployees } from "@/lib/hr/hr-api";

const money = (n: number, c = "USD") =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: c,
    maximumFractionDigits: 0,
  });

const riskClass: Record<string, string> = {
  Low: "bg-success/15 text-success border-success/30",
  Medium: "bg-warning/15 text-warning border-warning/30",
  High: "bg-destructive/15 text-destructive border-destructive/30",
};

const tierClass: Record<string, string> = {
  Premium: "bg-primary/15 text-primary border-primary/30",
  Standard: "bg-warning/15 text-warning border-warning/30",
  Basic: "bg-muted text-muted-foreground",
};

type Draft = UpsertClientCommercialPayload & {
  clientUserId: string;
  clientName: string;
};

export default function Clients() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: kycClients = [], isLoading } = useQuery({
    queryKey: ["clients-list"],
    queryFn: fetchClients,
    staleTime: 5 * 60_000,
  });

  const { data: commercials = {} } = useQuery({
    queryKey: ["clientCommercials"],
    queryFn: fetchClientCommercials,
  });

  const { data: slaProfiles = [] } = useQuery({
    queryKey: ["slaProfiles"],
    queryFn: fetchSlaProfiles,
  });

  const { data: employeesPage, isError: employeesError } = useQuery({
    queryKey: ["hr-employees", "rm-dropdown"],
    queryFn: () => fetchEmployees({ limit: 200 }),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const employeeOptions = (employeesPage?.items ?? []).map((e: any) => ({
    id: e._id,
    name: `${e.firstName} ${e.lastName}`.trim(),
    jobTitle: e.jobTitle,
  }));
  const hasEmployees = employeeOptions.length > 0 && !employeesError;

  const [q, setQ] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [rmFilter, setRmFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [slaFilter, setSlaFilter] = useState("all");
  const [draft, setDraft] = useState<Draft | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["clientCommercials"] });

  const saveMut = useMutation({
    mutationFn: (d: Draft) => {
      const { clientUserId, clientName, ...dto } = d;
      return saveClientCommercial(clientUserId, dto);
    },
    onSuccess: (_saved, d) => {
      invalidate();
      setDraft(null);
      toast({
        title: "Client parameters saved",
        description: `${d.clientName} — RM, service lines and SLA updated.`,
      });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to save",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const rows = useMemo(
    () =>
      kycClients.map((c: ApiClient) => {
        const saved = commercials[c._id];
        const commercial: Draft = saved
          ? { ...saved, clientUserId: c._id, clientName: displayName(c) }
          : {
              ...defaultCommercial(c._id, c.riskLevel),
              clientName: displayName(c),
            };
        return {
          client: c,
          name: displayName(c),
          commercial,
          assigned: Boolean(saved),
        };
      }),
    [kycClients, commercials],
  );

  const filtered = rows.filter(
    (r) =>
      (serviceFilter === "all" ||
        (r.commercial.serviceLines ?? []).includes(serviceFilter)) &&
      (rmFilter === "all" || r.commercial.relationshipManager === rmFilter) &&
      (riskFilter === "all" || r.commercial.riskRating === riskFilter) &&
      (slaFilter === "all" || r.commercial.slaProfileId === slaFilter) &&
      r.name.toLowerCase().includes(q.toLowerCase()),
  );

  const assignedRows = rows.filter((r) => r.assigned);
  const totalRevenue = assignedRows.reduce(
    (s, r) => s + (r.commercial.revenueYtd ?? 0),
    0,
  );
  const totalMargin = assignedRows.reduce(
    (s, r) =>
      s + ((r.commercial.revenueYtd ?? 0) - (r.commercial.costYtd ?? 0)),
    0,
  );
  const rated = assignedRows.filter(
    (r) => (r.commercial.satisfaction ?? 0) > 0,
  );
  const avgSatisfaction = rated.length
    ? (
        rated.reduce((s, r) => s + (r.commercial.satisfaction ?? 0), 0) /
        rated.length
      ).toFixed(1)
    : "—";
  const unassigned = rows.length - assignedRows.length;

  const slaName = (id?: string | null) => slaProfiles.find((p) => p._id === id);

  const kpis = [
    { l: "KYC clients", v: kycClients.length, icon: Users },
    { l: "Revenue YTD", v: money(totalRevenue), icon: DollarSign },
    { l: "Margin YTD", v: money(totalMargin), icon: DollarSign },
    {
      l: "Avg. satisfaction",
      v: avgSatisfaction === "—" ? "—" : `${avgSatisfaction}/5`,
      icon: Heart,
    },
  ];

  const toggleService = (s: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      serviceLines: (draft.serviceLines ?? []).includes(s)
        ? (draft.serviceLines ?? []).filter((x) => x !== s)
        : [...(draft.serviceLines ?? []), s],
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Client Management</h1>
        <p className="text-sm text-muted-foreground">
          Clients onboarded through KYC. Assign relationship managers, service
          lines, SLA profiles and commercial parameters here.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.l}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{k.l}</p>
                <p className="mt-1 text-xl font-bold">{k.v}</p>
              </div>
              <k.icon className="h-6 w-6 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      {unassigned > 0 && !isLoading && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-warning">
            <UserCog className="h-4 w-4" /> {unassigned} KYC client(s) have no
            relationship manager or SLA profile assigned yet.
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="clients">
        <TabsList>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="sla">SLA coverage</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="pt-4">
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search clients…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
                {hasEmployees && (
                  <Select value={rmFilter} onValueChange={setRmFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="RM" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All RMs</SelectItem>
                      {employeeOptions.map((e) => (
                        <SelectItem key={e.id} value={e.name}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select value={serviceFilter} onValueChange={setServiceFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Service line" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All services</SelectItem>
                    {SERVICE_LINES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Risk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All risk</SelectItem>
                    {["Low", "Medium", "High"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={slaFilter} onValueChange={setSlaFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="SLA profile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All SLA tiers</SelectItem>
                    {slaProfiles.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.tier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client (KYC)</TableHead>
                      <TableHead>RM</TableHead>
                      <TableHead>Service lines</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead>SLA</TableHead>
                      <TableHead className="text-right">
                        Revenue / Cost
                      </TableHead>
                      <TableHead>CSAT</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(({ client, name, commercial, assigned }) => {
                      const sla = slaName(commercial.slaProfileId);
                      return (
                        <TableRow key={client._id}>
                          <TableCell>
                            <p className="text-sm font-medium">{name}</p>
                            <p className="text-xs text-muted-foreground">
                              {prettyLabel(client.classifications)} · KYC{" "}
                              {prettyLabel(client.kycStatus)}
                              {client.country ? ` · ${client.country}` : ""}
                            </p>
                          </TableCell>
                          <TableCell className="text-sm">
                            {commercial.relationshipManager || (
                              <span className="text-muted-foreground">
                                Unassigned
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(commercial.serviceLines ?? []).length ? (
                                commercial.serviceLines!.map((s) => (
                                  <Badge
                                    key={s}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {s}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={riskClass[commercial.riskRating!]}
                            >
                              {commercial.riskRating}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {sla ? (
                              <Badge
                                variant="outline"
                                className={tierClass[sla.tier]}
                              >
                                {sla.tier}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Not set
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {money(
                              commercial.revenueYtd ?? 0,
                              commercial.currency,
                            )}{" "}
                            /{" "}
                            {money(
                              commercial.costYtd ?? 0,
                              commercial.currency,
                            )}
                            <span className="block text-xs text-success">
                              {money(
                                (commercial.revenueYtd ?? 0) -
                                  (commercial.costYtd ?? 0),
                                commercial.currency,
                              )}{" "}
                              margin
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {commercial.satisfaction
                              ? `${commercial.satisfaction}/5`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant={assigned ? "outline" : "default"}
                              onClick={() => setDraft(commercial)}
                            >
                              <UserCog className="mr-1 h-3 w-3" />
                              {assigned ? "Edit" : "Assign"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          No clients match these filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla" className="space-y-4 pt-4">
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Timer className="h-4 w-4" />
                SLA profiles are defined in SLA Management; assignments made
                here drive the response and resolution targets applied to each
                client's tickets.
              </span>
              <Button asChild size="sm" variant="outline">
                <Link to="/crm/sla">
                  <Link2 className="mr-1 h-3 w-3" />
                  Open SLA Management
                </Link>
              </Button>
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {slaProfiles.map((p) => {
              const covered = assignedRows.filter(
                (r) => r.commercial.slaProfileId === p._id,
              );
              return (
                <Card key={p._id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{p.tier}</CardTitle>
                      <Badge variant="outline" className={tierClass[p.tier]}>
                        {p.serviceType}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Critical response {p.responseHrs.Critical}h · resolution{" "}
                      {p.resolutionHrs.Critical}h
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Clients covered ({covered.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {covered.length ? (
                        covered.map((r) => (
                          <Badge
                            key={r.client._id}
                            variant="secondary"
                            className="text-xs"
                          >
                            {r.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No clients assigned to this profile.
                        </span>
                      )}
                    </div>
                    <p className="pt-1 text-xs text-muted-foreground">
                      {p.escalations}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Client parameters — {draft?.clientName}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Relationship manager (RM)</Label>
                  {hasEmployees ? (
                    <Select
                      value={draft.relationshipManager}
                      onValueChange={(v) =>
                        setDraft({ ...draft, relationshipManager: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select RM" />
                      </SelectTrigger>
                      <SelectContent>
                        {employeeOptions.map((e) => (
                          <SelectItem key={e.id} value={e.name}>
                            {e.name}
                            {e.jobTitle ? ` — ${e.jobTitle}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="Type relationship manager's name"
                      value={draft.relationshipManager}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          relationshipManager: e.target.value,
                        })
                      }
                    />
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {hasEmployees
                      ? "Selected from employees in HR."
                      : "No employees found in HR — type the RM's name directly."}
                  </p>
                </div>
                <div>
                  <Label>SLA profile</Label>
                  <Select
                    value={draft.slaProfileId ?? ""}
                    onValueChange={(v) =>
                      setDraft({ ...draft, slaProfileId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select SLA tier" />
                    </SelectTrigger>
                    <SelectContent>
                      {slaProfiles.map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          {p.tier} — {p.serviceType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Service lines</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SERVICE_LINES.map((s) => (
                    <Badge
                      key={s}
                      variant={
                        (draft.serviceLines ?? []).includes(s)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() => toggleService(s)}
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>Risk rating</Label>
                  <Select
                    value={draft.riskRating}
                    onValueChange={(v) =>
                      setDraft({ ...draft, riskRating: v as ClientRisk })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Low", "Medium", "High"].map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fee tier</Label>
                  <Select
                    value={draft.feeTier}
                    onValueChange={(v) =>
                      setDraft({ ...draft, feeTier: v as FeeTier })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Tier 1", "Tier 2", "Tier 3"].map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Currency</Label>
                  <Select
                    value={draft.currency}
                    onValueChange={(v) => setDraft({ ...draft, currency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["USD", "EUR", "GBP", "NGN", "ZAR"].map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Revenue YTD</Label>
                  <Input
                    type="number"
                    value={draft.revenueYtd}
                    onChange={(e) =>
                      setDraft({ ...draft, revenueYtd: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>Cost to serve YTD</Label>
                  <Input
                    type="number"
                    value={draft.costYtd}
                    onChange={(e) =>
                      setDraft({ ...draft, costYtd: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>Satisfaction (0–5)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={draft.satisfaction}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        satisfaction: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Open tickets</Label>
                  <Input
                    type="number"
                    min={0}
                    value={draft.openTickets}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        openTickets: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Avg. invoice days</Label>
                  <Input
                    type="number"
                    min={0}
                    value={draft.invoiceDaysAvg}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        invoiceDaysAvg: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Last interaction</Label>
                <Input
                  type="date"
                  value={
                    draft.lastInteraction === "—"
                      ? ""
                      : (draft.lastInteraction ?? "")
                  }
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      lastInteraction: e.target.value || "—",
                    })
                  }
                />
              </div>

              <div>
                <Label>Relationship notes</Label>
                <Textarea
                  rows={3}
                  value={draft.notes}
                  onChange={(e) =>
                    setDraft({ ...draft, notes: e.target.value })
                  }
                  placeholder="Coverage plan, escalation contacts, commercial context…"
                />
              </div>

              <p className="rounded border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                Margin preview:{" "}
                {money(
                  (draft.revenueYtd ?? 0) - (draft.costYtd ?? 0),
                  draft.currency,
                )}{" "}
                · Health score preview: {healthScore(draft as any)} (
                {healthBand(healthScore(draft as any))})
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button
              disabled={saveMut.isPending}
              onClick={() => draft && saveMut.mutate(draft)}
            >
              {saveMut.isPending ? "Saving…" : "Save parameters"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
