import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  FileDown,
  FileSpreadsheet,
  TrendingUp,
  Users,
  Briefcase,
  Clock,
  Receipt,
  LifeBuoy,
  Send,
  Contact,
  Search,
  Layers,
} from "lucide-react";
import {
  exportReportExcel,
  exportReportPdf,
  type ReportDefinition,
} from "@/lib/grc/reportExport";
import { fetchMandates, money, type Mandate } from "@/lib/crm/mandates-api";
import { fetchTasks, type Task } from "@/lib/crm/tasks-api";
import {
  fetchTimeEntries,
  type TimeEntry,
  ASSUMED_AVAILABLE_HRS,
  UTILISATION_TARGET_PCT,
} from "@/lib/crm/time-tracking-api";
import { fetchInvoices, type Invoice } from "@/lib/crm/finance-api";
import { fetchTickets, type Ticket } from "@/lib/crm/service-desk-api";
import {
  fetchContacts,
  type Contact as CrmContact,
} from "@/lib/crm/crm-contacts-api";
import {
  fetchLeads,
  fetchLeadFunnel,
  type Lead,
  type LeadFunnel,
} from "@/lib/crm/crm-pipeline-api";
import { fetchCampaigns, type Campaign } from "@/lib/crm/tools-api";
import {
  fetchClientCommercials,
  type ClientCommercial,
} from "@/lib/crm/client-commercial-api";
import {
  fetchClients,
  displayName,
  type ApiClient,
} from "@/lib/client/clients-api";

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
  const { data: clients = [] } = useQuery({
    queryKey: ["reports-clients"],
    queryFn: fetchClients,
  });
  const { data: commercials = {} } = useQuery({
    queryKey: ["reports-commercials"],
    queryFn: fetchClientCommercials,
  });
  const { data: mandates = [] } = useQuery({
    queryKey: ["reports-mandates"],
    queryFn: fetchMandates,
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["reports-tasks"],
    queryFn: () => fetchTasks(),
  });
  const { data: timeEntries = [] } = useQuery({
    queryKey: ["reports-time-entries"],
    queryFn: () => fetchTimeEntries(),
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["reports-invoices"],
    queryFn: () => fetchInvoices(),
  });
  const { data: tickets = [] } = useQuery({
    queryKey: ["reports-tickets"],
    queryFn: () => fetchTickets(),
  });
  const { data: contacts = [] } = useQuery({
    queryKey: ["reports-contacts"],
    queryFn: fetchContacts,
  });
  const { data: leads = [] } = useQuery({
    queryKey: ["reports-leads"],
    queryFn: fetchLeads,
  });
  const { data: leadFunnel } = useQuery({
    queryKey: ["reports-lead-funnel"],
    queryFn: fetchLeadFunnel,
  });
  const { data: campaigns = [] } = useQuery({
    queryKey: ["reports-campaigns"],
    queryFn: fetchCampaigns,
  });

  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<ReportDefinition | null>(null);
  const [rangeFrom, setRangeFrom] = useState("2026-01-01");
  const [rangeTo, setRangeTo] = useState(new Date().toISOString().slice(0, 10));

  const periodLabel = `${rangeFrom} to ${rangeTo}`;
  const today = new Date().toISOString().slice(0, 10);

  const commercialByClient = commercials;

  const commercialsList = useMemo(
    () => Object.values(commercials),
    [commercials],
  );

  const catalogue: CatalogueEntry[] = useMemo(() => {
    const entries: CatalogueEntry[] = [];

    // ── 1. Lead & conversion funnel ─────────────────────────
    // Real model: lead → prospect → client, tracked by stage/
    // status, not a dollar-value opportunity pipeline — that
    // concept doesn't exist in the real backend.
    const openLeads = leads.filter((l) => l.status === "open");
    const converted = leads.filter((l) => l.status === "converted");
    const lost = leads.filter((l) => l.status === "lost");
    entries.push({
      domain: "Pipeline",
      description: "Lead-to-client conversion funnel and stage breakdown.",
      icon: TrendingUp,
      tone: "from-indigo-500 to-violet-500",
      def: {
        id: "crm-pipeline",
        title: "Lead & Conversion Funnel Report",
        subtitle: `CRM · Period ${periodLabel}`,
        summary: [
          { label: "Open leads/prospects", value: openLeads.length },
          { label: "Converted to client", value: converted.length },
          {
            label: "Lead → prospect rate",
            value: leadFunnel ? `${leadFunnel.leadToProspectRate}%` : "—",
          },
          {
            label: "Prospect → client rate",
            value: leadFunnel ? `${leadFunnel.prospectToClientRate}%` : "—",
          },
        ],
        sections: [
          {
            heading: "Lead register",
            columns: [
              "Contact",
              "Company",
              "Source",
              "Stage",
              "Status",
              "Assigned to",
              "Reached prospect",
              "Converted",
            ],
            rows: leads.map((l: Lead) => [
              l.contactName || "—",
              l.companyName || "—",
              l.source,
              l.stage,
              l.status,
              l.assignedToUserId || "Unassigned",
              l.reachedProspectAt
                ? new Date(l.reachedProspectAt).toLocaleDateString()
                : "—",
              l.convertedAt
                ? new Date(l.convertedAt).toLocaleDateString()
                : "—",
            ]),
          },
          {
            heading: "Outcome summary",
            columns: ["Outcome", "Count"],
            rows: [
              ["Open", openLeads.length],
              ["Converted", converted.length],
              ["Lost", lost.length],
            ],
          },
        ],
      },
    });

    // ── 2. Client portfolio & relationship ─────────────────
    const kycRows = clients.map((c: ApiClient) => ({
      client: c,
      name: displayName(c),
      commercial: commercialByClient[c._id],
    }));
    entries.push({
      domain: "Clients",
      description:
        "Relationship managers, service lines, revenue/cost, CSAT and risk across the portfolio.",
      icon: Users,
      tone: "from-emerald-500 to-teal-500",
      def: {
        id: "crm-clients",
        title: "Client Portfolio & Relationship Report",
        subtitle: `CRM · Period ${periodLabel}`,
        summary: [
          { label: "Clients", value: clients.length },
          {
            label: "Assigned RM",
            value: commercialsList.filter((c) => c.relationshipManager).length,
          },
          {
            label: "Total revenue YTD",
            value: money(commercialsList.reduce((s, c) => s + c.revenueYtd, 0)),
          },
          {
            label: "At-risk clients",
            value: commercialsList.filter((c) => c.riskRating === "High")
              .length,
          },
        ],
        sections: [
          {
            heading: "Client relationship register",
            columns: [
              "Client",
              "RM",
              "Service lines",
              "Risk",
              "Revenue YTD",
              "Cost YTD",
              "CSAT",
              "Open tickets",
            ],
            rows: kycRows.map((r) => [
              r.name,
              r.commercial?.relationshipManager || "Unassigned",
              (r.commercial?.serviceLines ?? []).join(", ") || "—",
              r.commercial?.riskRating ?? "—",
              money(
                r.commercial?.revenueYtd ?? 0,
                r.commercial?.currency ?? "USD",
              ),
              money(
                r.commercial?.costYtd ?? 0,
                r.commercial?.currency ?? "USD",
              ),
              r.commercial?.satisfaction
                ? `${r.commercial.satisfaction}/5`
                : "—",
              r.commercial?.openTickets ?? 0,
            ]),
          },
        ],
      },
    });

    // ── 3. Mandates & project delivery ─────────────────────
    entries.push({
      domain: "Mandates",
      description:
        "Delivery stage, RAG status, budget vs actual and progress across active mandates.",
      icon: Briefcase,
      tone: "from-amber-500 to-orange-500",
      def: {
        id: "crm-mandates",
        title: "Mandates & Project Delivery Report",
        subtitle: `CRM · Period ${periodLabel}`,
        summary: [
          {
            label: "Active mandates",
            value: mandates.filter((m) => m.stage !== "Close").length,
          },
          {
            label: "At risk (Amber/Red)",
            value: mandates.filter((m) => m.rag !== "Green").length,
          },
          {
            label: "Total budget",
            value: money(mandates.reduce((s, m) => s + m.budget, 0)),
          },
          {
            label: "Total actual cost",
            value: money(mandates.reduce((s, m) => s + m.actualCost, 0)),
          },
        ],
        sections: [
          {
            heading: "Mandate register",
            columns: [
              "Ref",
              "Mandate",
              "Client",
              "Stage",
              "RAG",
              "Budget",
              "Actual cost",
              "Variance",
              "Progress %",
            ],
            rows: mandates.map((m: Mandate) => [
              m.ref,
              m.name,
              m.clientName,
              m.stage,
              m.rag,
              money(m.budget, m.currency),
              money(m.actualCost, m.currency),
              money(m.budget - m.actualCost, m.currency),
              `${m.progress}%`,
            ]),
          },
          {
            heading: "Milestone / closure readiness",
            columns: ["Mandate", "Checklist items", "Completed"],
            rows: mandates.map((m) => [
              m.name,
              m.closureChecklist.length,
              m.closureChecklist.filter((c) => c.done).length,
            ]),
          },
        ],
      },
    });

    // ── 4. Task & workload / resource utilisation ──────────
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
    entries.push({
      domain: "Workload",
      description:
        "Task status by assignee and billable utilisation vs target across the team.",
      icon: Layers,
      tone: "from-sky-500 to-blue-500",
      def: {
        id: "crm-workload",
        title: "Task & Workload / Resource Utilisation Report",
        subtitle: `CRM · Period ${periodLabel} · Utilisation assumes ${ASSUMED_AVAILABLE_HRS} available hrs, same convention as Timesheets`,
        summary: [
          {
            label: "Open tasks",
            value: tasks.filter((t) => t.status !== "Done").length,
          },
          {
            label: "Overdue tasks",
            value: tasks.filter((t) => t.status !== "Done" && t.dueDate < today)
              .length,
          },
          {
            label: "Avg. utilisation",
            value: memberUtilisation.length
              ? `${Math.round(memberUtilisation.reduce((s, u) => s + u.pct, 0) / memberUtilisation.length)}%`
              : "0%",
          },
          { label: "Team members tracked", value: memberUtilisation.length },
        ],
        sections: [
          {
            heading: "Task register",
            columns: [
              "Task",
              "Mandate",
              "Assignee",
              "Status",
              "Priority",
              "Due",
              "Estimate hrs",
              "Logged hrs",
            ],
            rows: tasks.map((t: Task) => [
              t.title,
              t.mandateName,
              t.assignee,
              t.status,
              t.priority,
              t.dueDate,
              t.estimateHrs,
              t.loggedHrs,
            ]),
          },
          {
            heading: "Resource utilisation",
            columns: [
              "Team member",
              "Billable hrs",
              "Assumed available hrs",
              "Utilisation %",
              "Target %",
            ],
            rows: memberUtilisation.map((u) => [
              u.member,
              u.billableHrs,
              ASSUMED_AVAILABLE_HRS,
              `${u.pct}%`,
              `${UTILISATION_TARGET_PCT}%`,
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
      description:
        "Timesheet entries, billable vs non-billable split and approval status.",
      icon: Clock,
      tone: "from-fuchsia-500 to-pink-500",
      def: {
        id: "crm-time-billing",
        title: "Time & Billing Report",
        subtitle: `CRM · Period ${periodLabel}`,
        summary: [
          {
            label: "Billable hours",
            value: billable.reduce((s, t) => s + t.hours, 0),
          },
          {
            label: "Non-billable hours",
            value: nonBillable.reduce((s, t) => s + t.hours, 0),
          },
          {
            label: "Billable value",
            value: money(billable.reduce((s, t) => s + t.hours * t.rate, 0)),
          },
          {
            label: "Entries pending approval",
            value: timeEntries.filter((t) => t.status === "Submitted").length,
          },
        ],
        sections: [
          {
            heading: "Timesheet entries",
            columns: [
              "Date",
              "Member",
              "Mandate",
              "Task",
              "Hours",
              "Billable",
              "Rate",
              "Status",
            ],
            rows: timeEntries.map((t: TimeEntry) => [
              t.date,
              t.member,
              t.mandateName,
              t.taskTitle,
              t.hours,
              t.billable ? "Yes" : "No",
              money(t.rate, t.currency),
              t.status,
            ]),
          },
        ],
      },
    });

    // ── 6. Invoicing & receivables ageing ──────────────────
    const outstanding = invoices.filter(
      (i) => !["Paid", "Written Off"].includes(i.stage),
    );
    entries.push({
      domain: "Receivables",
      description:
        "Invoice register, ageing of outstanding receivables and collections status.",
      icon: Receipt,
      tone: "from-rose-500 to-red-500",
      def: {
        id: "crm-invoicing",
        title: "Invoicing & Receivables Ageing Report",
        subtitle: `CRM · Period ${periodLabel}`,
        summary: [
          { label: "Invoices issued", value: invoices.length },
          { label: "Outstanding", value: outstanding.length },
          {
            label: "Outstanding value",
            value: money(
              outstanding.reduce((s, i) => s + (i.payable - i.paidAmount), 0),
            ),
          },
          {
            label: "Overdue invoices",
            value: invoices.filter((i) => i.stage === "Overdue").length,
          },
        ],
        sections: [
          {
            heading: "Invoice register",
            columns: [
              "Invoice",
              "Client",
              "Mandate",
              "Issued",
              "Due",
              "Gross",
              "Paid",
              "Balance",
              "Stage",
              "Age (days)",
            ],
            rows: invoices.map((i: Invoice) => [
              i.ref,
              i.clientName,
              i.mandateName,
              i.issuedOn,
              i.dueOn,
              money(i.gross, i.currency),
              money(i.paidAmount, i.currency),
              money(i.payable - i.paidAmount, i.currency),
              i.stage,
              Math.max(0, daysBetween(today, i.dueOn)),
            ]),
          },
        ],
      },
    });

    // ── 7. Service desk & SLA performance ──────────────────
    const openTickets = tickets.filter(
      (t) => !["Resolved", "Closed"].includes(t.status),
    );
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
          {
            label: "Avg. logged hrs / ticket",
            value: (
              tickets.reduce((s, t) => s + t.loggedHrs, 0) /
              (tickets.length || 1)
            ).toFixed(1),
          },
          {
            label: "Rated tickets",
            value: tickets.filter((t) => t.rating).length,
          },
        ],
        sections: [
          {
            heading: "Ticket register",
            columns: [
              "Ticket",
              "Client",
              "Subject",
              "Priority",
              "Agent",
              "Status",
              "SLA target hrs",
              "SLA elapsed hrs",
              "Breached",
            ],
            rows: tickets.map((t: Ticket) => [
              t.ref,
              t.clientName,
              t.subject,
              t.priority,
              t.agent,
              t.status,
              t.slaTargetHrs,
              t.slaElapsedHrs.toFixed(1),
              t.slaElapsedHrs > t.slaTargetHrs ? "Yes" : "No",
            ]),
          },
        ],
      },
    });

    // ── 8. Communications & campaign engagement ────────────
    // Real delivery/RSVP data only — open/click tracking would
    // require a connected email-tracking provider that doesn't
    // exist here, so those metrics are deliberately left out
    // rather than shown as a false 0.
    entries.push({
      domain: "Communications",
      description:
        "Campaign reach, delivery success and RSVP engagement by channel.",
      icon: Send,
      tone: "from-purple-500 to-indigo-500",
      def: {
        id: "crm-communications",
        title: "Communications & Campaign Engagement Report",
        subtitle: `CRM · Period ${periodLabel} · Open/click tracking not available — no tracking provider connected`,
        summary: [
          { label: "Campaigns", value: campaigns.length },
          {
            label: "Total recipients",
            value: campaigns.reduce((s, c) => s + c.recipients.length, 0),
          },
          {
            label: "Delivered",
            value: campaigns.reduce(
              (s, c) => s + c.recipients.filter((r) => r.delivered).length,
              0,
            ),
          },
          {
            label: "RSVPs (event invites)",
            value: campaigns.reduce(
              (s, c) => s + c.recipients.filter((r) => r.rsvped).length,
              0,
            ),
          },
        ],
        sections: [
          {
            heading: "Campaign performance",
            columns: [
              "Campaign",
              "Type",
              "Segment",
              "Status",
              "Recipients",
              "Delivered",
              "Delivery errors",
              "RSVPs",
            ],
            rows: campaigns.map((c: Campaign) => [
              c.name,
              c.type,
              c.segmentName,
              c.status,
              c.recipients.length,
              c.recipients.filter((r) => r.delivered).length,
              c.recipients.filter((r) => r.deliveryError).length,
              c.recipients.filter((r) => r.rsvped).length,
            ]),
          },
        ],
      },
    });

    // ── 9. Contacts repository summary ─────────────────────
    entries.push({
      domain: "Contacts",
      description:
        "Contact repository across organisations, sources and last-contacted dates.",
      icon: Contact,
      tone: "from-slate-500 to-gray-500",
      def: {
        id: "crm-contacts",
        title: "Contacts Repository Summary",
        subtitle: `CRM · Period ${periodLabel}`,
        summary: [
          { label: "Contacts", value: contacts.length },
          {
            label: "Organisations covered",
            value: new Set(contacts.map((c) => c.organisation)).size,
          },
          {
            label: "Referral-sourced",
            value: contacts.filter((c) => c.source === "Referral").length,
          },
        ],
        sections: [
          {
            heading: "Contact directory",
            columns: [
              "Contact",
              "Title",
              "Organisation",
              "Email",
              "Phone",
              "Source",
              "Last contact",
            ],
            rows: contacts.map((c: CrmContact) => [
              c.name,
              c.title,
              c.organisation,
              c.email,
              c.phone,
              c.source,
              c.lastContact
                ? new Date(c.lastContact).toLocaleDateString()
                : "—",
            ]),
          },
        ],
      },
    });

    return entries;
  }, [
    clients,
    commercials,
    commercialByClient,
    mandates,
    tasks,
    timeEntries,
    invoices,
    tickets,
    contacts,
    leads,
    leadFunnel,
    campaigns,
    periodLabel,
    today,
  ]);

  const filtered = catalogue.filter(
    (c) =>
      c.def.title.toLowerCase().includes(query.toLowerCase()) ||
      c.domain.toLowerCase().includes(query.toLowerCase()),
  );

  const kpis = [
    { l: "Reports available", v: catalogue.length, icon: Layers },
    {
      l: "Open leads/prospects",
      v: leads.filter((l) => l.status === "open").length,
      icon: TrendingUp,
    },
    {
      l: "Active mandates",
      v: mandates.filter((m) => m.stage !== "Close").length,
      icon: Briefcase,
    },
    {
      l: "Outstanding receivables",
      v: money(
        invoices
          .filter((i) => !["Paid", "Written Off"].includes(i.stage))
          .reduce((s, i) => s + (i.payable - i.paidAmount), 0),
      ),
      icon: Receipt,
    },
  ];

  const fullReport: ReportDefinition = {
    id: "crm-full-report",
    title: "Full CRM Report",
    subtitle: `All CRM domains · Period ${periodLabel}`,
    summary: kpis.map((k) => ({ label: k.l, value: k.v })),
    sections: catalogue.flatMap((c) =>
      c.def.sections.map((s) => ({
        ...s,
        heading: `${c.def.title} — ${s.heading}`,
      })),
    ),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">CRM Reports</h1>
          <p className="text-sm text-muted-foreground">
            Reporting across pipeline, clients, mandates, workload, finance,
            service desk and communications.
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
            <Input
              className="pl-9"
              placeholder="Search reports…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Period from</Label>
            <Input
              type="date"
              value={rangeFrom}
              onChange={(e) => setRangeFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <Label className="text-xs">Period to</Label>
            <Input
              type="date"
              value={rangeTo}
              onChange={(e) => setRangeTo(e.target.value)}
              className="w-40"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <Card key={c.def.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm">{c.def.title}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {c.domain}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">{c.description}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreview(c.def)}
                >
                  Preview
                </Button>
                <Button size="sm" onClick={() => exportReportPdf(c.def)}>
                  <Download className="mr-1 h-3.5 w-3.5" /> PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportReportExcel(c.def)}
                >
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
              <p className="text-xs text-muted-foreground">
                {preview.subtitle}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => exportReportPdf(preview)}>
                <Download className="mr-1 h-3.5 w-3.5" /> Download PDF
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportReportExcel(preview)}
              >
                <FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> Download Excel
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPreview(null)}
              >
                Close
              </Button>
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
                {section.note && (
                  <p className="text-xs text-muted-foreground">
                    {section.note}
                  </p>
                )}
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {section.columns.map((c) => (
                          <TableHead key={c}>{c}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {section.rows.length ? (
                        section.rows.slice(0, 10).map((row, i) => (
                          <TableRow key={i}>
                            {row.map((cell, j) => (
                              <TableCell key={j} className="text-sm">
                                {String(cell)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={section.columns.length}
                            className="text-center text-sm text-muted-foreground"
                          >
                            No records for this period.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {section.rows.length > 10 && (
                  <p className="text-xs text-muted-foreground">
                    Showing first 10 of {section.rows.length} rows — full data
                    included in the download.
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
