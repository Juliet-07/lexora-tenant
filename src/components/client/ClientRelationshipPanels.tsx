import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
} from "lucide-react";
import { fetchDeals } from "@/lib/grc/deals-api";
import {
  mandates,
  pmInvoices,
  invoiceTotal,
  money,
  ragClass,
  tickets,
} from "@/data/crmPmMockData";
import {
  useClientCommercials,
  healthScore,
  healthBand,
} from "@/lib/crm/clientCommercialStore";

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
  const rows = pick(
    mandates,
    (m) => norm(m.clientName) === norm(clientName),
    clientId,
  );
  const clientTickets = pick(
    tickets,
    (t: any) => norm(t.clientName ?? "") === norm(clientName),
    clientId,
  );

  if (!rows.length) return <Empty text="No projects for this client." />;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Mandates" value={String(rows.length)} icon={FolderKanban} />
        <Kpi
          label="Budget"
          value={money(rows.reduce((s, m) => s + m.budget, 0))}
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
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{m.type}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{m.stage}</Badge>
                  </TableCell>
                  <TableCell>{m.manager}</TableCell>
                  <TableCell>
                    <Badge className={ragClass[m.rag]} variant="secondary">
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
                    {money(m.budget, m.currency)}
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
  const commercials = useClientCommercials();
  const rec = commercials[clientId];

  if (!rec)
    return (
      <Card>
        <CardContent className="p-10 text-center text-sm text-muted-foreground space-y-2">
          <p>
            No commercial parameters assigned to {clientName} yet — relationship
            manager, service lines, SLA profile and fees are set in CRM.
          </p>
          <Link
            to="/crm/clients"
            className="text-primary inline-flex items-center gap-1"
          >
            Go to Client Management <ExternalLink className="h-3 w-3" />
          </Link>
        </CardContent>
      </Card>
    );

  const score = healthScore(rec);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi
          label="Relationship manager"
          value={rec.relationshipManager || "—"}
          icon={Handshake}
        />
        <Kpi label="Fee tier" value={rec.feeTier} icon={Receipt} />
        <Kpi
          label="Revenue YTD"
          value={money(rec.revenueYtd, rec.currency)}
          icon={Receipt}
        />
        <Kpi
          label="Health"
          value={`${score} · ${healthBand(score)}`}
          icon={Briefcase}
        />
      </div>
      <Card>
        <CardContent className="p-5 grid gap-4 sm:grid-cols-2">
          <Field
            label="Service lines"
            value={rec.serviceLines.join(", ") || "—"}
          />
          <Field label="Risk rating" value={rec.riskRating} />
          <Field label="Cost YTD" value={money(rec.costYtd, rec.currency)} />
          <Field label="Satisfaction (CSAT)" value={`${rec.satisfaction}/5`} />
          <Field label="Open tickets" value={String(rec.openTickets)} />
          <Field label="Avg invoice days" value={String(rec.invoiceDaysAvg)} />
          <Field label="Last interaction" value={rec.lastInteraction} />
          <Field label="Notes" value={rec.notes || "—"} />
        </CardContent>
      </Card>
    </div>
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
