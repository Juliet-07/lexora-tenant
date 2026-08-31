import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Briefcase,
  FolderKanban,
  Receipt,
  Handshake,
  ExternalLink,
  AlertTriangle,
  HeartPulse,
  TrendingUp,
  Pencil,
  Loader2,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchDeals } from "@/lib/grc/deals-api";
import {
  fetchMandates,
  ragClass as realRagClass,
  money as realMoney,
} from "@/lib/crm/mandates-api";
import { fetchTickets } from "@/lib/crm/service-desk-api";
import {
  pmInvoices,
  invoiceTotal,
  money,
  ragClass,
} from "@/data/crmPmMockData";
import { slaProfiles } from "@/data/crmClientMockData";
import {
  fetchClientHealth,
  updateClientCommercial,
  type ClientHealth,
  type UpdateClientCommercialPayload,
} from "@/lib/client/client-health-api";

const SERVICE_LINE_OPTIONS = [
  "TCSP",
  "Compliance",
  "Advisory",
  "Governance",
  "Tax",
  "Legal",
  "Audit support",
];

// ─────────────────────────────────────────────────────────────
// Cross-module views of a single client: deals, projects,
// invoices and the commercial relationship record.
// ─────────────────────────────────────────────────────────────

interface Props {
  clientId: string;
  clientName: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function Empty({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="p-10 text-center text-sm text-muted-foreground">
        {text}
      </CardContent>
    </Card>
  );
}

/** Fallback so the prototype pages always show a relationship picture:
 *  if nothing matches the real client name, key demo rows by index. */
function pick<T>(rows: T[], match: (r: T) => boolean, clientId: string): T[] {
  const hit = rows.filter(match);
  if (hit.length) return hit;
  if (!rows.length) return [];
  const seed = clientId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return [rows[seed % rows.length]];
}

// ─────────────────────────── Deals ──

export function ClientDealsPanel({ clientId, clientName }: Props) {
  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals"],
    queryFn: fetchDeals,
  });

  const rows = useMemo(
    () => deals.filter((d) => d.clientId === clientId),
    [deals, clientId],
  );

  if (isLoading) return <Empty text="Loading deals…" />;
  if (!rows.length)
    return <Empty text={`No deals recorded for ${clientName} yet.`} />;

  const total = rows.reduce((s, d) => s + (d.value ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Deals" value={String(rows.length)} icon={Briefcase} />
        <Kpi
          label="Active"
          value={String(rows.filter((d) => d.status === "Active").length)}
          icon={Handshake}
        />
        <Kpi label="Total value" value={money(total)} icon={Receipt} />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Target close</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => (
                <TableRow key={d._id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>{d.type}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{d.stage}</Badge>
                  </TableCell>
                  <TableCell>{d.status}</TableCell>
                  <TableCell className="text-right">
                    {money(d.value ?? 0, d.currency || "USD")}
                  </TableCell>
                  <TableCell>{d.targetClose?.slice(0, 10) || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      to={`/grc/deals/${d._id}`}
                      className="text-primary inline-flex items-center gap-1 text-xs"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────── Projects / mandates ──

export function ClientProjectsPanel({ clientId, clientName }: Props) {
  const { data: allMandates = [], isLoading: mandatesLoading } = useQuery({
    queryKey: ["mandates"],
    queryFn: fetchMandates,
  });
  const { data: allTickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => fetchTickets(),
  });

  const rows = useMemo(
    () => allMandates.filter((m) => m.clientUserId === clientId),
    [allMandates, clientId],
  );
  const clientTickets = useMemo(
    () =>
      allTickets.filter(
        (t) => t.clientUserId === clientId && t.status !== "Closed",
      ),
    [allTickets, clientId],
  );

  if (mandatesLoading || ticketsLoading)
    return <Empty text="Loading projects…" />;
  if (!rows.length)
    return <Empty text={`No projects for ${clientName} yet.`} />;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Mandates" value={String(rows.length)} icon={FolderKanban} />
        <Kpi
          label="Budget"
          value={realMoney(rows.reduce((s, m) => s + m.budget, 0))}
          icon={Receipt}
        />
        <Kpi
          label="Open tickets"
          value={String(clientTickets.length)}
          icon={Briefcase}
        />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mandate</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>RAG</TableHead>
                <TableHead className="w-40">Progress</TableHead>
                <TableHead className="text-right">Budget</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m) => (
                <TableRow key={m._id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{m.type}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{m.stage}</Badge>
                  </TableCell>
                  <TableCell>{m.manager || "—"}</TableCell>
                  <TableCell>
                    <Badge className={realRagClass[m.rag]} variant="secondary">
                      {m.rag}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={m.progress} className="h-2" />
                      <span className="text-xs">{m.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {realMoney(m.budget, m.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────── Invoices ──

export function ClientInvoicesPanel({ clientId, clientName }: Props) {
  const rows = pick(
    pmInvoices,
    (i) => norm(i.clientName) === norm(clientName),
    clientId,
  );

  if (!rows.length) return <Empty text="No invoices for this client." />;

  const billed = rows.reduce((s, i) => s + invoiceTotal(i).payable, 0);
  const paid = rows.reduce((s, i) => s + i.paidAmount, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Invoices" value={String(rows.length)} icon={Receipt} />
        <Kpi label="Billed" value={money(billed)} icon={Receipt} />
        <Kpi
          label="Outstanding"
          value={money(Math.max(billed - paid, 0))}
          icon={Receipt}
        />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Mandate</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Payable</TableHead>
                <TableHead className="text-right">Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.id}</TableCell>
                  <TableCell>{i.mandateName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{i.stage}</Badge>
                  </TableCell>
                  <TableCell>{i.issuedOn}</TableCell>
                  <TableCell>{i.dueOn}</TableCell>
                  <TableCell className="text-right">
                    {money(invoiceTotal(i).payable, i.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {money(i.paidAmount, i.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────── Commercial relationship ──

export function ClientCommercialPanel({ clientId, clientName }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: health, isLoading } = useQuery({
    queryKey: ["client-health", clientId],
    queryFn: () => fetchClientHealth(clientId),
  });

  const mutation = useMutation({
    mutationFn: (payload: UpdateClientCommercialPayload) =>
      updateClientCommercial(clientId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-health", clientId] });
      setEditOpen(false);
      toast({ title: "Commercial details saved" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to save",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (!health) return <Empty text="Could not load commercial details." />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
        </Button>
      </div>

      {!health.hasRecord && (
        <p className="text-xs text-muted-foreground">
          No commercial parameters recorded for {clientName} yet — click Edit to
          set service lines, fee tier and other relationship details.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi
          label="Relationship manager"
          value={health.relationshipManager || "Unassigned"}
          icon={Handshake}
        />
        <Kpi label="Fee tier" value={health.feeTier || "—"} icon={Receipt} />
        <Kpi
          label="Revenue YTD"
          value={realMoney(health.revenueYtd, health.currency)}
          icon={Receipt}
        />
        <Kpi
          label="Health"
          value={`${health.score} · ${health.band}`}
          icon={Briefcase}
        />
      </div>
      <Card>
        <CardContent className="p-5 grid gap-4 sm:grid-cols-2">
          <Field
            label="Service lines"
            value={health.serviceLines.join(", ") || "—"}
          />
          <Field label="Risk rating" value={health.riskRating || "—"} />
          <Field
            label="Cost YTD"
            value={realMoney(health.costYtd, health.currency)}
          />
          <Field
            label="Satisfaction (CSAT)"
            value={
              health.satisfaction == null
                ? "Not yet recorded"
                : `${health.satisfaction}/5`
            }
          />
          <Field label="Open tickets" value={String(health.openTickets)} />
          <Field
            label="Avg invoice days"
            value={
              health.invoiceDaysAvg == null
                ? "No paid invoices yet"
                : String(health.invoiceDaysAvg)
            }
          />
          <Field
            label="Last interaction"
            value={health.lastInteraction || "—"}
          />
          <Field label="Notes" value={health.notes || "—"} />
        </CardContent>
      </Card>

      <CommercialEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        health={health}
        onSave={(payload) => mutation.mutate(payload)}
        saving={mutation.isPending}
      />
    </div>
  );
}

function CommercialEditDialog({
  open,
  onOpenChange,
  health,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  health: ClientHealth;
  onSave: (payload: UpdateClientCommercialPayload) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<UpdateClientCommercialPayload>({
    serviceLines: health.serviceLines,
    riskRating: (health.riskRating as any) ?? undefined,
    feeTier: health.feeTier ?? undefined,
    slaProfileId: health.slaProfileId,
    revenueYtd: health.revenueYtd,
    costYtd: health.costYtd,
    currency: health.currency,
    satisfaction: health.satisfaction ?? undefined,
    notes: health.notes,
  });

  const toggleServiceLine = (line: string) => {
    setForm((f) => {
      const lines = f.serviceLines ?? [];
      return {
        ...f,
        serviceLines: lines.includes(line)
          ? lines.filter((l) => l !== line)
          : [...lines, line],
      };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Commercial details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Service lines</Label>
            <div className="flex flex-wrap gap-1.5">
              {SERVICE_LINE_OPTIONS.map((line) => {
                const active = form.serviceLines?.includes(line);
                return (
                  <button
                    key={line}
                    type="button"
                    onClick={() => toggleServiceLine(line)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      active
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-muted text-muted-foreground border-transparent"
                    }`}
                  >
                    {line}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Risk rating</Label>
              <Select
                value={form.riskRating}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, riskRating: v as any }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fee tier</Label>
              <Select
                value={form.feeTier}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, feeTier: v as any }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tier 1">Tier 1</SelectItem>
                  <SelectItem value="Tier 2">Tier 2</SelectItem>
                  <SelectItem value="Tier 3">Tier 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>SLA profile</Label>
            <Select
              value={form.slaProfileId}
              onValueChange={(v) => setForm((f) => ({ ...f, slaProfileId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {slaProfiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.tier} — {p.serviceType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Revenue YTD</Label>
              <Input
                type="number"
                min={0}
                value={form.revenueYtd}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    revenueYtd: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Cost YTD</Label>
              <Input
                type="number"
                min={0}
                value={form.costYtd}
                onChange={(e) =>
                  setForm((f) => ({ ...f, costYtd: Number(e.target.value) }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="RWF">RWF</SelectItem>
                  <SelectItem value="KES">KES</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              Satisfaction (CSAT) — your own 0–5 assessment of this relationship
            </Label>
            <Input
              type="number"
              min={0}
              max={5}
              step={0.5}
              value={form.satisfaction ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  satisfaction: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSave(form)} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────── bits ──

function Kpi({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

// ─────────────────────────── Health ──

const bandClass: Record<string, string> = {
  Healthy: "text-success",
  Watch: "text-warning",
  "At risk": "text-destructive",
};

export function ClientHealthPanel({ clientId, clientName }: Props) {
  const { data: health, isLoading } = useQuery({
    queryKey: ["client-health", clientId],
    queryFn: () => fetchClientHealth(clientId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (!health) return <Empty text="Could not load health data." />;

  const { score, band, factors } = health;

  return (
    <div className="space-y-4">
      {!health.hasRecord && (
        <p className="text-xs text-muted-foreground">
          No commercial parameters recorded for {clientName} yet — some factors
          below default to 0 until they're set on the Commercial tab.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={score < 50 ? "border-destructive/40" : ""}>
          <CardContent className="p-5 text-center space-y-2">
            <HeartPulse className={`mx-auto h-6 w-6 ${bandClass[band]}`} />
            <p className={`text-4xl font-bold ${bandClass[band]}`}>{score}</p>
            <p className={`text-sm font-medium ${bandClass[band]}`}>{band}</p>
            <Progress value={score} className="h-2" />
            {health.relationshipManager && (
              <p className="text-xs text-muted-foreground">
                RM {health.relationshipManager}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Score breakdown
            </p>
            {factors.map((f) => (
              <div key={f.l} className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{f.l}</span>
                  <span>
                    {f.v}/{f.max}
                  </span>
                </div>
                <Progress value={(f.v / f.max) * 100} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi
          label="Satisfaction"
          value={
            health.satisfaction == null
              ? "Not yet recorded"
              : `${health.satisfaction}/5`
          }
          icon={Handshake}
        />
        <Kpi
          label="Open tickets"
          value={String(health.openTickets)}
          icon={Briefcase}
        />
        <Kpi
          label="Avg invoice days"
          value={
            health.invoiceDaysAvg == null
              ? "No paid invoices yet"
              : String(health.invoiceDaysAvg)
          }
          icon={Receipt}
        />
        <Kpi
          label="Last interaction"
          value={health.lastInteraction || "—"}
          icon={FolderKanban}
        />
      </div>

      {score < 50 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> Deteriorating health —
            recommend relationship manager outreach this week.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
