import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  mandates,
  pmInvoices,
  invoiceTotal,
  utilisation,
  activityStream,
  calendarEvents,
  money,
  ragClass,
  MANDATE_STAGES,
} from "@/data/crmPmMockData";

type Role = "Partner" | "Manager" | "Team member" | "Finance";

export default function CrmOverview() {
  const [role, setRole] = useState<Role>("Partner");
  const navigate = useNavigate();

  const active = mandates.filter((m) => m.stage !== "Close");
  const wip = mandates.reduce((s, m) => s + m.wip, 0);
  const outstanding = pmInvoices
    .filter((i) => !["Paid", "Draft", "Written Off"].includes(i.stage))
    .reduce((s, i) => s + invoiceTotal(i).payable - i.paidAmount, 0);
  const overdue = pmInvoices
    .filter((i) => i.stage === "Overdue")
    .reduce((s, i) => s + invoiceTotal(i).payable, 0);
  const avgUtil = Math.round(
    utilisation.reduce((s, u) => s + (u.billable / u.available) * 100, 0) /
      utilisation.length,
  );

  const revenueByService = Object.entries(
    mandates.reduce<Record<string, number>>((acc, m) => {
      acc[m.type] = (acc[m.type] ?? 0) + m.billed;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const maxRevenue = Math.max(...revenueByService.map(([, v]) => v), 1);

  const kpis = [
    { label: "Active mandates", value: String(active.length), icon: Briefcase, sub: `${mandates.length} total in register` },
    { label: "Unbilled WIP", value: money(wip), icon: Clock, sub: "From approved timesheets" },
    { label: "Outstanding receivables", value: money(outstanding), icon: Receipt, sub: `${money(overdue)} overdue` },
    { label: "Team utilisation", value: `${avgUtil}%`, icon: Timer, sub: "Target 80%" },
  ];

  const quickActions = [
    { label: "New mandate", icon: Plus, to: "/crm/mandates" },
    { label: "Log time", icon: Timer, to: "/crm/time" },
    { label: "Raise invoice", icon: Receipt, to: "/crm/invoicing" },
    { label: "New ticket", icon: LifeBuoy, to: "/crm/service-desk" },
    { label: "New contract", icon: FileSignature, to: "/crm/contracts" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">CRM Overview</h1>
          <p className="text-sm text-muted-foreground">
            Role-based aggregation across mandates, delivery, finance and tools
          </p>
        </div>
        <Select value={role} onValueChange={(v) => setRole(v as Role)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["Partner", "Manager", "Team member", "Finance"].map((r) => (
              <SelectItem key={r} value={r}>
                Viewing as {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                    key={m.id}
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
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Team utilisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {utilisation.map((u) => {
              const pct = Math.round((u.billable / u.available) * 100);
              return (
                <div key={u.member} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{u.member}</span>
                    <span
                      className={
                        pct >= u.target ? "text-success" : "text-warning"
                      }
                    >
                      {pct}%
                    </span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
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
                <Progress
                  value={(value / maxRevenue) * 100}
                  className="h-2"
                />
              </div>
            ))}
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
            {pmInvoices.slice(0, 5).map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between rounded border p-2"
              >
                <div>
                  <p className="font-medium">{i.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.clientName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {money(invoiceTotal(i).payable, i.currency)}
                  </p>
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
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Activity feed</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityLog entries={activityStream} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-warning" /> Attention for{" "}
              {role}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              "MND-006 conflict check flagged — mandate blocked at Create",
              "INV-2026-039 is 46 days overdue — escalate to partner",
              "Greenfield trust account unreconciled for July",
              "Ticket TCK-103 at 95% of SLA — urgent",
              "Meridian MSA renewal notice window opens in 64 days",
            ].map((t) => (
              <div key={t} className="rounded border-l-2 border-warning bg-muted/40 p-2">
                {t}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
