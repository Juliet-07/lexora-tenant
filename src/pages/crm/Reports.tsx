import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Download, FileDown, FileSpreadsheet, TrendingUp, Users, Briefcase,
  Clock, Receipt, Wallet, LifeBuoy, Send, Contact, Search, Layers,
} from "lucide-react";
import {
  exportReportExcel, exportReportPdf, type ReportDefinition,
} from "@/lib/grc/reportExport";
import {
  mandates, timeEntries, pmInvoices, tickets, utilisation, pmTasks,
  money, invoiceTotal,
} from "@/data/crmPmMockData";

// Campaign engagement mock (kept local — no shared export exists yet).
const campaigns = [
  { id: "CMP-01", name: "Q3 regulatory update — BNR circulars", channel: "Newsletter", segment: "All active clients", status: "Sent", recipients: 184, opened: 121, clicked: 47, unsubscribed: 2 },
  { id: "CMP-02", name: "Governance breakfast invitation", channel: "Email", segment: "Tier 1 · Board contacts", status: "Sent", recipients: 62, opened: 44, clicked: 21, unsubscribed: 0 },
  { id: "CMP-03", name: "New client onboarding sequence", channel: "Drip", segment: "Clients onboarded < 30 days", status: "Running", recipients: 11, opened: 9, clicked: 6, unsubscribed: 0 },
  { id: "CMP-04", name: "Filing deadline reminder", channel: "WhatsApp", segment: "Compliance retainer clients", status: "Scheduled", recipients: 38, opened: 0, clicked: 0, unsubscribed: 0 },
];
import { organisations, opportunities, contacts, weightedValue } from "@/data/crmClientMockData";
import { useClientCommercials } from "@/lib/crm/clientCommercialStore";
import { fetchClients, displayName, type ApiClient } from "@/lib/client/clients-api";

interface CatalogueEntry {
  def: ReportDefinition;
  domain: string;
  description: string;
  icon: any;
  tone: string;
}

const daysBetween = (a: string, b: string) =>
  Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86_400_000);

export default function Reports() {
  const commercials = useClientCommercials();
  const { data: kycClients = [] } = useQuery({
    queryKey: ["clients-list-reports"],
    queryFn: fetchClients,
    staleTime: 5 * 60_000,
  });

  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<ReportDefinition | null>(null);
  const [rangeFrom, setRangeFrom] = useState("2026-01-01");
  const [rangeTo, setRangeTo] = useState(new Date().toISOString().slice(0, 10));

  const periodLabel = `${rangeFrom} to ${rangeTo}`;
  const today = new Date().toISOString().slice(0, 10);

  const catalogue: CatalogueEntry[] = useMemo(() => {
    const entries: CatalogueEntry[] = [];

    // ── 1. Pipeline & deal conversion ──────────────────────
    const openOpps = opportunities.filter((o) => !o.stage.startsWith("Closed"));
    const won = opportunities.filter((o) => o.stage === "Closed Won");
    const lost = opportunities.filter((o) => o.stage === "Closed Lost");
    const winRate = won.length + lost.length
      ? Math.round((won.length / (won.length + lost.length)) * 100)
      : 0;
    entries.push({
      domain: "Pipeline",
      description: "Opportunities by stage, weighted pipeline value and win/loss conversion.",
      icon: TrendingUp,
      tone: "from-indigo-500 to-violet-500",
      def: {
        id: "crm-pipeline",
        title: "Pipeline & Deal Conversion Report",
        subtitle: `CRM · Period ${periodLabel}`,
        summary: [
          { label: "Open opportunities", value: openOpps.length },
          { label: "Pipeline value", value: money(openOpps.reduce((s, o) => s + o.value, 0)) },
          { label: "Win rate", value: `${winRate}%` },
          { label: "Closed won (value)", value: money(won.reduce((s, o) => s + o.value, 0)) },
        ],
        sections: [
          {
            heading: "Opportunity pipeline",
            columns: ["Opportunity", "Client", "Stage", "Service line", "Value", "Weighted value", "Owner", "Expected close"],
            rows: opportunities.map((o) => [
              o.name, o.orgName, o.stage, o.serviceLine,
              money(o.value, o.currency), money(weightedValue(o), o.currency),
              o.owner, o.expectedClose,
            ]),
          },
          {
            heading: "Win / loss summary",
            columns: ["Outcome", "Count", "Total value"],
            rows: [
              ["Closed Won", won.length, money(won.reduce((s, o) => s + o.value, 0))],
              ["Closed Lost", lost.length, money(lost.reduce((s, o) => s + o.value, 0))],
            ],
          },
        ],
      },
    });

    // ── 2. Client portfolio & relationship ─────────────────
    const kycRows = kycClients.map((c: ApiClient) => ({
      client: c,
      name: displayName(c),
      commercial: commercials[c._id],
    }));
    const commercialList = Object.values(commercials);
    entries.push({
      domain: "Clients",
      description: "Relationship managers, service lines, revenue/cost, CSAT and risk across the portfolio.",
      icon: Users,
      tone: "from-emerald-500 to-teal-500",
      def: {
        id: "crm-clients",
        title: "Client Portfolio & Relationship Report",
        subtitle: `CRM · Period ${periodLabel}`,
        summary: [
          { label: "KYC clients", value: kycClients.length },
          { label: "Assigned RM", value: commercialList.filter((c) => c.relationshipManager).length },
          { label: "Total revenue YTD", value: money(commercialList.reduce((s, c) => s + c.revenueYtd, 0)) },
          { label: "At-risk clients", value: commercialList.filter((c) => c.riskRating === "High").length },
        ],
        sections: [
          {
            heading: "Client relationship register",
            columns: ["Client", "RM", "Service lines", "Risk", "Revenue YTD", "Cost YTD", "CSAT", "Open tickets"],
            rows: kycRows.map((r) => [
              r.name,
              r.commercial?.relationshipManager || "Unassigned",
              (r.commercial?.serviceLines ?? []).join(", ") || "—",
              r.commercial?.riskRating ?? "—",
              money(r.commercial?.revenueYtd ?? 0, r.commercial?.currency ?? "USD"),
              money(r.commercial?.costYtd ?? 0, r.commercial?.currency ?? "USD"),
              r.commercial?.satisfaction ? `${r.commercial.satisfaction}/5` : "—",
              r.commercial?.openTickets ?? 0,
            ]),
          },
          {
            heading: "Legacy organisation book (reference data)",
            columns: ["Organisation", "RM", "Fee tier", "Revenue YTD", "Margin", "Satisfaction"],
            rows: organisations.map((o) => [
              o.name, o.relationshipManager, o.feeTier,
              money(o.revenueYtd), money(o.revenueYtd - o.costYtd), o.satisfaction ? `${o.satisfaction}/5` : "—",
            ]),
          },
        ],
      },
    });

    // ── 3. Mandates & project delivery ─────────────────────
    entries.push({
      domain: "Mandates",
      description: "Delivery stage, RAG status, budget vs actual and progress across active mandates.",
      icon: Briefcase,
      tone: "from-amber-500 to-orange-500",
      def: {
        id: "crm-mandates",
        title: "Mandates & Project Delivery Report",
        subtitle: `CRM · Period ${periodLabel}`,
        summary: [
          { label: "Active mandates", value: mandates.length },
          { label: "At risk (Amber/Red)", value: mandates.filter((m) => m.rag !== "Green").length },
          { label: "Total budget", value: money(mandates.reduce((s, m) => s + m.budget, 0)) },
          { label: "Total actual cost", value: money(mandates.reduce((s, m) => s + m.actualCost, 0)) },
        ],
        sections: [
          {
            heading: "Mandate register",
            columns: ["Ref", "Mandate", "Client", "Stage", "RAG", "Budget", "Actual cost", "Variance", "Progress %"],
            rows: mandates.map((m) => [
              m.ref, m.name, m.clientName, m.stage, m.rag,
              money(m.budget, m.currency), money(m.actualCost, m.currency),
              money(m.budget - m.actualCost, m.currency), `${m.progress}%`,
            ]),
          },
          {
            heading: "Milestone / closure readiness",
            columns: ["Mandate", "Checklist items", "Completed"],
            rows: mandates.map((m) => [
              m.name, m.closureChecklist.length, m.closureChecklist.filter((c) => c.done).length,
            ]),
          },
        ],
      },
    });

    // ── 4. Task & workload / resource utilisation ──────────
    entries.push({
      domain: "Workload",
      description: "Task status by assignee and billable utilisation vs target across the team.",
      icon: Layers,
      tone: "from-sky-500 to-blue-500",
      def: {
        id: "crm-workload",
        title: "Task & Workload / Resource Utilisation Report",
        subtitle: `CRM · Period ${periodLabel}`,
        summary: [
          { label: "Open tasks", value: pmTasks.filter((t) => t.status !== "Done").length },
          { label: "Overdue tasks", value: pmTasks.filter((t) => t.status !== "Done" && t.dueDate < today).length },
          { label: "Avg. utilisation", value: `${Math.round(utilisation.reduce((s, u) => s + u.billable / u.available, 0) / (utilisation.length || 1) * 100)}%` },
          { label: "Team members tracked", value: utilisation.length },
        ],
        sections: [
          {
            heading: "Task register",
            columns: ["Task", "Mandate", "Assignee", "Status", "Priority", "Due", "Estimate hrs", "Logged hrs"],
            rows: pmTasks.map((t) => [
              t.title, t.mandateName, t.assignee, t.status, t.priority, t.dueDate, t.estimateHrs, t.loggedHrs,
            ]),
          },
          {
            heading: "Resource utilisation",
            columns: ["Team member", "Billable hrs", "Available hrs", "Utilisation %", "Target %"],
            rows: utilisation.map((u) => [
              u.member, u.billable, u.available, Math.round((u.billable / u.available) * 100), u.target,
            ]),
          },
        ],
      },
    });

    // ── 5. Time & billing ───────────────────────────────────
    const billable = timeEntries.filter((t) => t.billable);
    const nonBillable = timeEntries.filter((t) => !t.billable);
    entries.push({
      domain: "Time & billing",
      description: "Timesheet entries, billable vs non-billable split and approval status.",
      icon: Clock,
      tone: "from-fuchsia-500 to-pink-500",
      def: {
        id: "crm-time-billing",
        title: "Time & Billing Report",
        subtitle: `CRM · Period ${periodLabel}`,
        summary: [
          { label: "Billable hours", value: billable.reduce((s, t) => s + t.hours, 0) },
          { label: "Non-billable hours", value: nonBillable.reduce((s, t) => s + t.hours, 0) },
          { label: "Billable value", value: money(billable.reduce((s, t) => s + t.hours * t.rate, 0)) },
          { label: "Entries pending approval", value: timeEntries.filter((t) => t.status === "Submitted").length },
        ],
        sections: [
          {
            heading: "Timesheet entries",
            columns: ["Date", "Member", "Mandate", "Task", "Hours", "Billable", "Rate", "Status"],
            rows: timeEntries.map((t) => [
              t.date, t.member, t.mandateName, t.taskTitle, t.hours, t.billable ? "Yes" : "No", money(t.rate), t.status,
            ]),
          },
        ],
      },
    });

    // ── 6. Invoicing & receivables ageing ──────────────────
    const outstanding = pmInvoices.filter((i) => !["Paid", "Written Off"].includes(i.stage));
    entries.push({
      domain: "Receivables",
      description: "Invoice register, ageing of outstanding receivables and collections status.",
      icon: Receipt,
      tone: "from-rose-500 to-red-500",
      def: {
        id: "crm-invoicing",
        title: "Invoicing & Receivables Ageing Report",
        subtitle: `CRM · Period ${periodLabel}`,
        summary: [
          { label: "Invoices issued", value: pmInvoices.length },
          { label: "Outstanding", value: outstanding.length },
          { label: "Outstanding value", value: money(outstanding.reduce((s, i) => s + (invoiceTotal(i).payable - i.paidAmount), 0)) },
          { label: "Overdue invoices", value: pmInvoices.filter((i) => i.stage === "Overdue").length },
        ],
        sections: [
          {
            heading: "Invoice register",
            columns: ["Invoice", "Client", "Mandate", "Issued", "Due", "Gross", "Paid", "Balance", "Stage", "Age (days)"],
            rows: pmInvoices.map((i) => {
              const tot = invoiceTotal(i);
              return [
                i.id, i.clientName, i.mandateName, i.issuedOn, i.dueOn,
                money(tot.gross, i.currency), money(i.paidAmount, i.currency),
                money(tot.payable - i.paidAmount, i.currency), i.stage,
                Math.max(0, daysBetween(today, i.dueOn)),
              ];
            }),
          },
        ],
      },
    });

    // ── 7. Service desk & SLA performance ──────────────────
    const openTickets = tickets.filter((t) => !["Resolved", "Closed"].includes(t.status));
    const breached = tickets.filter((t) => t.slaElapsedHrs > t.slaTargetHrs);
    entries.push({
      domain: "Service desk",
      description: "Ticket volumes, SLA performance and resolution times.",
      icon: LifeBuoy,
      tone: "from-cyan-500 to-teal-500",
      def: {
        id: "crm-service-desk",
        title: "Service Desk & SLA Performance Report",
        subtitle: `CRM · Period ${periodLabel}`,
        summary: [
          { label: "Open tickets", value: openTickets.length },
          { label: "SLA breaches", value: breached.length },
          { label: "Avg. logged hrs / ticket", value: (tickets.reduce((s, t) => s + t.loggedHrs, 0) / (tickets.length || 1)).toFixed(1) },
          { label: "Rated tickets", value: tickets.filter((t) => t.rating).length },
        ],
        sections: [
          {
            heading: "Ticket register",
            columns: ["Ticket", "Client", "Subject", "Priority", "Agent", "Status", "SLA target hrs", "SLA elapsed hrs", "Breached"],
            rows: tickets.map((t) => [
              t.id, t.clientName, t.subject, t.priority, t.agent, t.status,
              t.slaTargetHrs, t.slaElapsedHrs, t.slaElapsedHrs > t.slaTargetHrs ? "Yes" : "No",
            ]),
          },
        ],
      },
    });

    // ── 8. Communications & campaign engagement ────────────
    entries.push({
      domain: "Communications",
      description: "Campaign reach, open/click rates and engagement by channel.",
      icon: Send,
      tone: "from-purple-500 to-indigo-500",
      def: {
        id: "crm-communications",
        title: "Communications & Campaign Engagement Report",
        subtitle: `CRM · Period ${periodLabel}`,
        summary: [
          { label: "Campaigns", value: campaigns.length },
          { label: "Total recipients", value: campaigns.reduce((s, c) => s + c.recipients, 0) },
          { label: "Total opened", value: campaigns.reduce((s, c) => s + c.opened, 0) },
          { label: "Total clicked", value: campaigns.reduce((s, c) => s + c.clicked, 0) },
        ],
        sections: [
          {
            heading: "Campaign performance",
            columns: ["Campaign", "Channel", "Segment", "Status", "Recipients", "Opened", "Clicked", "Unsubscribed"],
            rows: campaigns.map((c) => [
              c.name, c.channel, c.segment, c.status, c.recipients, c.opened, c.clicked, c.unsubscribed,
            ]),
          },
        ],
      },
    });

    // ── 9. Contacts repository summary ─────────────────────
    entries.push({
      domain: "Contacts",
      description: "Contact repository across organisations, sources and last-contacted dates.",
      icon: Contact,
      tone: "from-slate-500 to-gray-500",
      def: {
        id: "crm-contacts",
        title: "Contacts Repository Summary",
        subtitle: `CRM · Period ${periodLabel}`,
        summary: [
          { label: "Contacts", value: contacts.length },
          { label: "Organisations covered", value: new Set(contacts.map((c) => c.orgId)).size },
          { label: "Referral-sourced", value: contacts.filter((c) => c.source === "Referral").length },
        ],
        sections: [
          {
            heading: "Contact directory",
            columns: ["Contact", "Title", "Organisation", "Email", "Phone", "Source", "Last contact"],
            rows: contacts.map((c) => [
              c.name, c.title, c.orgName, c.email, c.phone, c.source, c.lastContact,
            ]),
          },
        ],
      },
    });

    return entries;
  }, [kycClients, commercials, periodLabel, today]);

  const filtered = catalogue.filter(
    (c) =>
      c.def.title.toLowerCase().includes(query.toLowerCase()) ||
      c.domain.toLowerCase().includes(query.toLowerCase()),
  );

  const kpis = [
    { l: "Reports available", v: catalogue.length, icon: Layers },
    { l: "Open pipeline value", v: money(opportunities.filter((o) => !o.stage.startsWith("Closed")).reduce((s, o) => s + o.value, 0)), icon: TrendingUp },
    { l: "Active mandates", v: mandates.length, icon: Briefcase },
    { l: "Outstanding receivables", v: money(pmInvoices.filter((i) => !["Paid", "Written Off"].includes(i.stage)).reduce((s, i) => s + (invoiceTotal(i).payable - i.paidAmount), 0)), icon: Receipt },
  ];

  const fullReport: ReportDefinition = {
    id: "crm-full-report",
    title: "Full CRM Report",
    subtitle: `All CRM domains · Period ${periodLabel}`,
    summary: kpis.map((k) => ({ label: k.l, value: k.v })),
    sections: catalogue.flatMap((c) => c.def.sections.map((s) => ({ ...s, heading: `${c.def.title} — ${s.heading}` }))),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">CRM Reports</h1>
          <p className="text-sm text-muted-foreground">
            Reporting across pipeline, clients, mandates, workload, finance, service desk and communications.
          </p>
        </div>
        <Button onClick={() => exportReportPdf(fullReport)}>
          <FileDown className="mr-2 h-4 w-4" /> Download full CRM report
        </Button>
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

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search reports…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Period from</Label>
            <Input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} className="w-40" />
          </div>
          <div>
            <Label className="text-xs">Period to</Label>
            <Input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} className="w-40" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <Card key={c.def.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm">{c.def.title}</CardTitle>
                <Badge variant="outline" className="text-xs">{c.domain}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">{c.description}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setPreview(c.def)}>
                  Preview
                </Button>
                <Button size="sm" onClick={() => exportReportPdf(c.def)}>
                  <Download className="mr-1 h-3.5 w-3.5" /> PDF
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportReportExcel(c.def)}>
                  <FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No reports match this search.
            </CardContent>
          </Card>
        )}
      </div>

      {preview && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">{preview.title}</CardTitle>
              <p className="text-xs text-muted-foreground">{preview.subtitle}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => exportReportPdf(preview)}>
                <Download className="mr-1 h-3.5 w-3.5" /> Download PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportReportExcel(preview)}>
                <FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> Download Excel
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>Close</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {preview.summary && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {preview.summary.map((s) => (
                  <div key={s.label} className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-lg font-semibold">{s.value}</p>
                  </div>
                ))}
              </div>
            )}
            {preview.sections.map((section) => (
              <div key={section.heading} className="space-y-2">
                <h4 className="text-sm font-semibold">{section.heading}</h4>
                {section.note && <p className="text-xs text-muted-foreground">{section.note}</p>}
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>{section.columns.map((c) => <TableHead key={c}>{c}</TableHead>)}</TableRow>
                    </TableHeader>
                    <TableBody>
                      {section.rows.length ? (
                        section.rows.slice(0, 10).map((row, i) => (
                          <TableRow key={i}>
                            {row.map((cell, j) => <TableCell key={j} className="text-sm">{String(cell)}</TableCell>)}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={section.columns.length} className="text-center text-sm text-muted-foreground">
                            No records for this period.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {section.rows.length > 10 && (
                  <p className="text-xs text-muted-foreground">
                    Showing first 10 of {section.rows.length} rows — full data included in the download.
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
