import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Clock,
  Receipt,
  AlertTriangle,
  Plus,
  Timer,
  FileSignature,
  LifeBuoy,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ActivityLog } from "@/components/crm/CommentThread";
import {
  fetchMandates,
  MANDATE_STAGES,
  ragClass,
  money,
} from "@/lib/crm/mandates-api";
import { fetchInvoices } from "@/lib/crm/finance-api";
import {
  fetchTimeEntries,
  ASSUMED_AVAILABLE_HRS,
  UTILISATION_TARGET_PCT,
} from "@/lib/crm/time-tracking-api";
import {
  fetchCalendarEvents,
  fetchExpiringContracts,
} from "@/lib/crm/tools-api";
import { fetchTickets } from "@/lib/crm/service-desk-api";

export default function CrmOverview() {
  const navigate = useNavigate();

  const { data: mandates = [] } = useQuery({
    queryKey: ["overview-mandates"],
    queryFn: fetchMandates,
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["overview-invoices"],
    queryFn: () => fetchInvoices(),
  });
  const { data: timeEntries = [] } = useQuery({
    queryKey: ["overview-time-entries"],
    queryFn: () => fetchTimeEntries(),
  });
  const { data: calendarEvents = [] } = useQuery({
    queryKey: ["overview-calendar"],
    queryFn: fetchCalendarEvents,
  });
  const { data: tickets = [] } = useQuery({
    queryKey: ["overview-tickets"],
    queryFn: () => fetchTickets(),
  });
  const { data: expiringContracts = [] } = useQuery({
    queryKey: ["overview-expiring-contracts"],
    queryFn: () => fetchExpiringContracts(90),
  });

  const active = mandates.filter((m) => m.stage !== "Close");
  const wip = mandates.reduce((s, m) => s + m.wip, 0);
  const outstandingInvoices = invoices.filter(
    (i) => !["Paid", "Draft", "Written Off"].includes(i.stage),
  );
  const outstanding = outstandingInvoices.reduce(
    (s, i) => s + (i.payable - i.paidAmount),
    0,
  );
  const overdue = invoices
    .filter((i) => i.stage === "Overdue")
    .reduce((s, i) => s + (i.payable - i.paidAmount), 0);

  // Real billable hours per member, against the shared assumed
  // capacity — the same ASSUMED_AVAILABLE_HRS constant Timesheets'
  // Utilisation tab and Gantt & Planning's Resource Allocation tab
  // use, so this dashboard never quietly drifts to a different
  // number than those pages show.
  const billableByMember = timeEntries
    .filter((t) => t.billable)
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.member] = (acc[t.member] ?? 0) + t.hours;
      return acc;
    }, {});
  const memberUtilisation = Object.entries(billableByMember).map(
    ([member, billableHrs]) => ({
      member,
      billableHrs,
      pct: Math.round((billableHrs / ASSUMED_AVAILABLE_HRS) * 100),
    }),
  );
  const avgUtil = memberUtilisation.length
    ? Math.round(
        memberUtilisation.reduce((s, u) => s + u.pct, 0) /
          memberUtilisation.length,
      )
    : 0;

  const revenueByService = Object.entries(
    mandates.reduce<Record<string, number>>((acc, m) => {
      acc[m.type] = (acc[m.type] ?? 0) + m.billed;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const maxRevenue = Math.max(...revenueByService.map(([, v]) => v), 1);

  const kpis = [
    {
      label: "Active mandates",
      value: String(active.length),
      icon: Briefcase,
      sub: `${mandates.length} total in register`,
    },
    {
      label: "Unbilled WIP",
      value: money(wip),
      icon: Clock,
      sub: "From approved timesheets",
    },
    {
      label: "Outstanding receivables",
      value: money(outstanding),
      icon: Receipt,
      sub: `${money(overdue)} overdue`,
    },
    {
      label: "Team utilisation",
      value: `${avgUtil}%`,
      icon: Timer,
      sub: `Target ${UTILISATION_TARGET_PCT}%`,
    },
  ];

  const quickActions = [
    { label: "New mandate", icon: Plus, to: "/crm/mandates" },
    { label: "Log time", icon: Timer, to: "/crm/time" },
    { label: "Raise invoice", icon: Receipt, to: "/crm/invoicing" },
    { label: "New ticket", icon: LifeBuoy, to: "/crm/service-desk" },
    { label: "New contract", icon: FileSignature, to: "/crm/contracts" },
  ];

  // Real recent activity, derived live from already-fetched records
  // rather than a separate stored activity log — same reasoning the
  // calendar aggregation uses (compute from source records, don't
  // duplicate event storage).
  const activityStream = [
    ...mandates.map((m) => ({
      id: `mandate-${m._id}`,
      at: m.updatedAt,
      actor: m.manager || "System",
      type: "mandate",
      text: `updated mandate ${m.name} (${m.stage})`,
    })),
    ...invoices.map((i) => ({
      id: `invoice-${i._id}`,
      at: i.updatedAt,
      actor: i.clientName || "System",
      type: "invoice",
      text: `${i.stage.toLowerCase()} invoice ${i.ref}`,
    })),
    ...tickets.map((t) => ({
      id: `ticket-${t._id}`,
      at: t.createdAt,
      actor: t.agent || t.clientName || "System",
      type: "ticket",
      text: `logged ticket ${t.ref} — ${t.subject}`,
    })),
  ]
    .sort((a, b) => (b.at || "").localeCompare(a.at || ""))
    .slice(0, 8);

  // Real, rule-based alerts computed from the same data already on
  // the page — not invented, not a placeholder list.
  const attentionItems: string[] = [
    ...mandates
      .filter((m) => m.conflictCheck === "Pending")
      .map(
        (m) => `${m.ref} conflict check pending — mandate blocked at Create`,
      ),
    ...mandates
      .filter((m) => m.rag === "Red")
      .map((m) => `${m.name} is flagged Red — needs attention`),
    ...invoices
      .filter((i) => i.stage === "Overdue")
      .slice(0, 3)
      .map(
        (i) =>
          `${i.ref} is overdue — ${money(i.payable - i.paidAmount, i.currency)} outstanding`,
      ),
    ...tickets
      .filter((t) => t.slaElapsedHrs >= t.slaTargetHrs)
      .slice(0, 3)
      .map((t) => `Ticket ${t.ref} has breached its SLA target`),
    ...expiringContracts
      .filter((c) => {
        const days = Math.ceil(
          (new Date(c.expiresOn).getTime() - Date.now()) / 86_400_000,
        );
        return days <= 30;
      })
      .slice(0, 3)
      .map((c) => `${c.title} expires within 30 days`),
  ].slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CRM Overview</h1>
        <p className="text-sm text-muted-foreground">
          Aggregation across mandates, delivery, finance and tools
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="mt-1 text-2xl font-bold">{k.value}</p>
                  <p className="text-xs text-muted-foreground">{k.sub}</p>
                </div>
                <k.icon className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {quickActions.map((a) => (
            <Button
              key={a.label}
              variant="outline"
              size="sm"
              onClick={() => navigate(a.to)}
            >
              <a.icon className="mr-2 h-4 w-4" />
              {a.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Mandate pipeline</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/crm/mandates")}
            >
              Open register <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {MANDATE_STAGES.map((s) => {
                const n = mandates.filter((m) => m.stage === s).length;
                return (
                  <div key={s} className="rounded-lg border p-2 text-center">
                    <p className="text-lg font-bold">{n}</p>
                    <p className="text-[11px] text-muted-foreground">{s}</p>
                  </div>
                );
              })}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mandate</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>RAG</TableHead>
                  <TableHead className="w-32">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.slice(0, 5).map((m) => (
                  <TableRow
                    key={m._id}
                    className="cursor-pointer"
                    onClick={() => navigate("/crm/mandates")}
                  >
                    <TableCell>
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.clientName}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{m.stage}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={ragClass[m.rag]}>{m.rag}</Badge>
                    </TableCell>
                    <TableCell>
                      <Progress value={m.progress} className="h-2" />
                    </TableCell>
                  </TableRow>
                ))}
                {!active.length && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      No active mandates.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Team utilisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {memberUtilisation.map((u) => (
              <div key={u.member} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{u.member}</span>
                  <span
                    className={
                      u.pct >= UTILISATION_TARGET_PCT
                        ? "text-success"
                        : "text-warning"
                    }
                  >
                    {u.pct}%
                  </span>
                </div>
                <Progress value={u.pct} className="h-2" />
              </div>
            ))}
            {!memberUtilisation.length && (
              <p className="text-sm text-muted-foreground">
                No billable time logged yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Revenue by service line</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {revenueByService.map(([type, value]) => (
              <div key={type} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{type}</span>
                  <span className="font-medium">{money(value)}</span>
                </div>
                <Progress value={(value / maxRevenue) * 100} className="h-2" />
              </div>
            ))}
            {!revenueByService.length && (
              <p className="text-sm text-muted-foreground">
                No billed revenue recorded yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Billing snapshot</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/crm/invoicing")}
            >
              Finance <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {invoices.slice(0, 5).map((i) => (
              <div
                key={i._id}
                className="flex items-center justify-between rounded border p-2"
              >
                <div>
                  <p className="font-medium">{i.ref}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.clientName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{money(i.payable, i.currency)}</p>
                  <Badge
                    variant="outline"
                    className={
                      i.stage === "Overdue" ? "text-destructive" : undefined
                    }
                  >
                    {i.stage}
                  </Badge>
                </div>
              </div>
            ))}
            {!invoices.length && (
              <p className="text-muted-foreground">No invoices yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" /> Upcoming
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/crm/calendar")}
            >
              Calendar <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {calendarEvents
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(0, 5)
              .map((e) => (
                <div key={e.id} className="rounded border p-2">
                  <p className="text-sm font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.date} {e.time} · {e.layer}
                  </p>
                </div>
              ))}
            {!calendarEvents.length && (
              <p className="text-sm text-muted-foreground">
                Nothing scheduled.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Activity feed</CardTitle>
          </CardHeader>
          <CardContent>
            {activityStream.length ? (
              <ActivityLog entries={activityStream} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No recent activity.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-warning" /> Needs attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {attentionItems.length ? (
              attentionItems.map((t) => (
                <div
                  key={t}
                  className="rounded border-l-2 border-warning bg-muted/40 p-2"
                >
                  {t}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">
                Nothing needs attention right now.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
