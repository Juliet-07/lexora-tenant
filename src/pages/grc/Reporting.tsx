import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
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
  FileSpreadsheet,
  FileDown,
  Landmark,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Briefcase,
  LifeBuoy,
  Handshake,
  TrendingUp,
  Leaf,
  Layers,
  Eye,
  Search,
  BarChart3,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { fetchGrcOverview, type GrcOverview } from "@/lib/grc/overview-api";
import { fetchDashboard, fetchMetrics } from "@/lib/grc/esg-api";
import {
  exportReportExcel,
  exportReportPdf,
  ReportDefinition,
} from "@/lib/grc/reportExport";

interface CatalogueEntry {
  def: ReportDefinition;
  domain: string;
  description: string;
  icon: any;
  tone: string;
}

export default function GrcReporting() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ["grcOverview"],
    queryFn: fetchGrcOverview,
  });
  const { data: dash } = useQuery({
    queryKey: ["esgDashboard"],
    queryFn: fetchDashboard,
  });
  const { data: esgMetrics = [] } = useQuery({
    queryKey: ["esgMetrics", "all"],
    queryFn: () => fetchMetrics(),
  });

  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<ReportDefinition | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const catalogue: CatalogueEntry[] = useMemo(() => {
    if (!overview) return [];
    const {
      governance: gov,
      risk,
      operations: ops,
      thirdPartyBcp: tp,
      compliance,
      deals,
      dealIntelligence: intel,
    } = overview;

    const openRisks = risk.risks.filter((r) => r.status !== "Closed");
    const openIncidents = ops.incidents.filter((i) => i.status !== "Closed");
    const overdueObligations = compliance.obligations.filter(
      (o) => o.status === "Overdue",
    );
    const openDeficiencies = risk.deficiencies.filter(
      (d) => d.status !== "Closed",
    );
    const openFindings = ops.audits
      .flatMap((a) => a.findings)
      .filter((f) => f.status !== "Remediated" && f.status !== "Closed");

    const entries: CatalogueEntry[] = [];

    // ── Governance ────────────────────────────────────────────
    entries.push({
      domain: "Governance",
      description:
        "Board composition, committees, meetings, codes and resolutions.",
      icon: Landmark,
      tone: "from-indigo-500 to-violet-500",
      def: {
        id: "governance",
        title: "Governance Report",
        subtitle: "Board, committees, meetings, codes and resolutions",
        summary: [
          { label: "Directors", value: gov.boardMembers.length },
          { label: "Committees", value: gov.committees.length },
          { label: "Meetings", value: gov.meetings.length },
          { label: "Resolutions", value: gov.resolutions.length },
        ],
        sections: [
          {
            heading: "Board composition",
            columns: [
              "Director",
              "Role",
              "Appointed",
              "Term ends",
              "Conflicts disclosed",
              "Training records",
            ],
            rows: gov.boardMembers.map((b) => [
              b.name,
              b.role,
              b.appointedAt?.slice(0, 10) ?? "—",
              b.termEnds?.slice(0, 10) ?? "—",
              b.conflicts?.length ?? 0,
              b.training?.length ?? 0,
            ]),
          },
          {
            heading: "Committees",
            columns: ["Committee", "Chair", "Members", "Open tasks", "Purpose"],
            rows: gov.committees.map((c) => [
              c.name,
              c.members.find((m) => m.role === "Chair")?.name ?? "—",
              c.members.length,
              c.tasks.filter((t) => t.status !== "Done").length,
              c.purpose,
            ]),
          },
          {
            heading: "Meetings",
            columns: [
              "Meeting",
              "Type",
              "Date",
              "Mode",
              "Chair",
              "Attendees",
              "Status",
            ],
            rows: gov.meetings.map((m) => [
              m.title,
              m.type,
              m.date?.slice(0, 10) ?? "—",
              m.mode,
              m.chair,
              m.attendees.length,
              m.status,
            ]),
          },
          {
            heading: "Governance codes",
            columns: ["Code", "Category", "Status"],
            rows: gov.codes.map((c) => [c.title, c.category, c.status]),
          },
          {
            heading: "Resolutions",
            columns: [
              "Reference",
              "Type",
              "Subject",
              "Effective date",
              "Status",
              "Outcome",
            ],
            rows: gov.resolutions.map((r) => [
              r.reference,
              r.type,
              r.subject,
              r.effectiveDate?.slice(0, 10) ?? "—",
              r.status,
              r.outcome ?? "—",
            ]),
          },
        ],
      },
    });

    // ── Risk ──────────────────────────────────────────────────
    entries.push({
      domain: "Risk",
      description:
        "Register, appetite, controls, treatment, emerging risks, testing and deficiencies.",
      icon: AlertTriangle,
      tone: "from-rose-500 to-orange-500",
      def: {
        id: "risk",
        title: "Risk Management Report",
        subtitle: "Register, appetite, controls, testing and remediation",
        summary: [
          { label: "Open risks", value: openRisks.length },
          {
            label: "Extreme / High residual",
            value: openRisks.filter((r) =>
              ["Extreme", "High"].includes(r.residualBand),
            ).length,
          },
          { label: "Controls", value: risk.controls.length },
          { label: "Open deficiencies", value: openDeficiencies.length },
        ],
        sections: [
          {
            heading: "Risk register",
            columns: [
              "Risk",
              "Category",
              "Owner",
              "Likelihood",
              "Impact",
              "Inherent",
              "Residual",
              "Band",
              "Status",
              "Next review",
            ],
            rows: openRisks.map((r) => [
              r.title,
              r.category,
              r.owner,
              r.likelihood,
              r.impact,
              r.inherentScore,
              r.residualScore,
              r.residualBand,
              r.status,
              r.nextReviewDate?.slice(0, 10) ?? "—",
            ]),
          },
          {
            heading: "Risk appetite",
            columns: ["Category", "Max loss per event", "Amber threshold %"],
            rows: risk.appetite.map((a) => [
              a.category,
              a.maxLossPerEvent,
              a.amberThresholdPct,
            ]),
          },
          {
            heading: "Control library",
            columns: ["Control", "Code", "Type", "Owner", "Frequency"],
            rows: risk.controls.map((c) => [
              c.name,
              c.code,
              c.type,
              c.owner,
              c.frequency,
            ]),
          },
          {
            heading: "Treatment plans",
            columns: [
              "Strategy",
              "Actions",
              "Owner",
              "Timeline",
              "Approval status",
            ],
            rows: risk.treatmentPlans.map((t) => [
              t.strategy,
              t.actions,
              t.owner,
              t.timeline,
              t.approvalStatus,
            ]),
          },
          {
            heading: "Emerging risks",
            columns: [
              "Emerging risk",
              "Category",
              "Source",
              "Impact",
              "Velocity",
              "Watch list",
              "Owner",
              "Status",
            ],
            rows: risk.emergingRisks.map((e) => [
              e.title,
              e.category,
              e.source,
              e.impact,
              e.velocity,
              e.watchList,
              e.owner,
              e.status,
            ]),
          },
          {
            heading: "Control testing programme",
            columns: [
              "Control",
              "Rating",
              "Frequency",
              "Due",
              "Tester",
              "Status",
              "Conclusion",
            ],
            rows: risk.controlTests.map((t) => [
              `${t.controlCode} — ${t.controlName}`,
              t.riskRating,
              t.frequency,
              t.dueDate?.slice(0, 10) ?? "—",
              t.tester,
              t.status,
              t.conclusion ?? "—",
            ]),
          },
          {
            heading: "Deficiencies",
            columns: [
              "Reference",
              "Title",
              "Origin",
              "Severity",
              "Owner",
              "Deadline",
              "Status",
            ],
            rows: risk.deficiencies.map((d) => [
              d.reference,
              d.title,
              d.origin,
              d.severity,
              d.owner,
              d.deadline?.slice(0, 10) ?? "—",
              d.status,
            ]),
          },
        ],
      },
    });

    // ── Compliance ────────────────────────────────────────────
    entries.push({
      domain: "Compliance",
      description:
        "Regulatory obligations, filings, certifications, regulatory change and policies.",
      icon: ShieldCheck,
      tone: "from-amber-500 to-yellow-500",
      def: {
        id: "compliance",
        title: "Compliance Report",
        subtitle: "Obligations, filings, certifications and regulatory change",
        summary: [
          { label: "Obligations", value: compliance.obligations.length },
          { label: "Overdue", value: overdueObligations.length },
          { label: "Certifications", value: compliance.certifications.length },
          {
            label: "Regulatory changes",
            value: compliance.regulatoryChanges.length,
          },
        ],
        sections: [
          {
            heading: "Regulatory obligations",
            columns: [
              "Reference",
              "Obligation",
              "Regulator",
              "Entity",
              "Frequency",
              "Next due",
              "Owner",
              "Status",
            ],
            rows: compliance.obligations.map((o) => [
              o.reference,
              o.title,
              o.regulator,
              o.entity,
              o.frequency,
              o.nextDueDate?.slice(0, 10) ?? "—",
              o.owner,
              o.status,
            ]),
          },
          {
            heading: "Filings",
            columns: [
              "Period",
              "Due",
              "Stage",
              "Certified by",
              "Submitted",
              "Receipt",
            ],
            rows: compliance.filings.map((f) => [
              f.periodLabel,
              f.dueDate?.slice(0, 10) ?? "—",
              f.stage,
              f.certifiedBy ?? "—",
              f.submittedAt?.slice(0, 10) ?? "—",
              f.receiptRef ?? "—",
            ]),
          },
          {
            heading: "Certifications & licences",
            columns: [
              "Certification",
              "Issuer",
              "Number",
              "Issued",
              "Expires",
              "Stage",
              "Owner",
            ],
            rows: compliance.certifications.map((c) => [
              c.name,
              c.issuingBody,
              c.certificateNumber,
              c.issueDate?.slice(0, 10) ?? "—",
              c.expiryDate?.slice(0, 10) ?? "—",
              c.renewalStage,
              c.responsiblePerson,
            ]),
          },
          {
            heading: "Regulatory change",
            columns: [
              "Change",
              "Regulator",
              "Published",
              "Urgency",
              "Assessment owner",
              "Deadline",
              "Assessment status",
            ],
            rows: compliance.regulatoryChanges.map((c) => [
              c.title,
              c.regulator,
              c.publishedAt?.slice(0, 10) ?? "—",
              c.urgency,
              c.assessmentOwner,
              c.assessmentDeadline?.slice(0, 10) ?? "—",
              c.assessmentStatus,
            ]),
          },
          {
            heading: "Policies",
            columns: ["Policy", "Category", "Type", "Acknowledgments"],
            rows: compliance.policies.map((p) => [
              p.title,
              p.category,
              p.type,
              p.acknowledgments.length,
            ]),
          },
        ],
      },
    });

    // ── Operations ────────────────────────────────────────────
    entries.push({
      domain: "Operations",
      description: "Incidents, internal audits and audit findings.",
      icon: Activity,
      tone: "from-violet-500 to-purple-500",
      def: {
        id: "operations",
        title: "Operations Report",
        subtitle: "Incidents, audits and findings",
        summary: [
          { label: "Open incidents", value: openIncidents.length },
          { label: "Audit engagements", value: ops.audits.length },
          { label: "Open findings", value: openFindings.length },
        ],
        sections: [
          {
            heading: "Incidents",
            columns: [
              "Incident",
              "Category",
              "Severity",
              "Reported",
              "Owner",
              "Status",
            ],
            rows: ops.incidents.map((i) => [
              i.title,
              i.category,
              i.severity,
              i.reportedAt?.slice(0, 10) ?? "—",
              i.owner ?? "—",
              i.status,
            ]),
          },
          {
            heading: "Audit engagements",
            columns: ["Audit", "Type", "Period", "Status", "Findings"],
            rows: ops.audits.map((a) => [
              a.name,
              a.type,
              `${a.startDate?.slice(0, 10) ?? "—"} – ${a.endDate?.slice(0, 10) ?? "—"}`,
              a.status,
              a.findings.length,
            ]),
          },
          {
            heading: "Audit findings",
            columns: ["Observation", "Severity", "Due", "Status"],
            rows: ops.audits.flatMap((a) =>
              a.findings.map((f) => [
                f.observation,
                f.severity,
                f.remediationDueDate?.slice(0, 10) ?? "—",
                f.status,
              ]),
            ),
          },
        ],
      },
    });

    // ── Third-party & BCP ─────────────────────────────────────
    entries.push({
      domain: "Third-Party & BCP",
      description:
        "Vendor risk exposure, continuity plans, RTO/RPO and crisis contacts.",
      icon: LifeBuoy,
      tone: "from-cyan-500 to-blue-500",
      def: {
        id: "third-party-bcp",
        title: "Third-Party & Continuity Report",
        subtitle: "Vendor risk, business continuity and disaster recovery",
        summary: [
          { label: "Vendors", value: tp.vendors.length },
          {
            label: "High / Extreme risk",
            value: tp.vendors.filter((v) =>
              ["High", "Extreme"].includes(v.riskRating),
            ).length,
          },
          { label: "BCP plans", value: tp.bcpPlans.length },
          {
            label: "Tier-1 systems",
            value: tp.rtoRpo.filter((r) => r.criticality === "Tier 1").length,
          },
        ],
        sections: [
          {
            heading: "Vendor register",
            columns: [
              "Vendor",
              "Category",
              "Risk rating",
              "Status",
              "Next review",
            ],
            rows: tp.vendors.map((v) => [
              v.name,
              v.category,
              v.riskRating,
              v.status,
              v.nextReviewDate?.slice(0, 10) ?? "—",
            ]),
          },
          {
            heading: "Continuity plans",
            columns: ["Plan", "Version"],
            rows: tp.bcpPlans.map((p) => [p.title, p.version]),
          },
          {
            heading: "RTO / RPO",
            columns: ["System", "Criticality", "RTO (hrs)", "RPO (hrs)"],
            rows: tp.rtoRpo.map((r) => [
              r.system,
              r.criticality,
              r.rtoHours,
              r.rpoHours,
            ]),
          },
          {
            heading: "Continuity tests",
            columns: ["Tested", "Outcome", "Notes"],
            rows: tp.bcpTests.map((t) => [
              t.testedAt?.slice(0, 10) ?? "—",
              t.outcome,
              t.notes,
            ]),
          },
          {
            heading: "Crisis contacts",
            columns: ["Name", "Role", "Phone", "Escalation order"],
            rows: tp.crisisContacts.map((c) => [
              c.name,
              c.role,
              c.phone,
              c.escalationOrder,
            ]),
          },
        ],
      },
    });

    // ── Deals ─────────────────────────────────────────────────
    entries.push({
      domain: "Deals & Transactions",
      description:
        "Pipeline, due diligence progress, conditions precedent and clause library.",
      icon: Handshake,
      tone: "from-emerald-500 to-teal-500",
      def: {
        id: "deals",
        title: "Deals & Transactions Report",
        subtitle: "Pipeline, diligence and completion tracking",
        summary: [
          { label: "Deals", value: deals.deals.length },
          {
            label: "Active",
            value: deals.deals.filter((d) => d.status === "Active").length,
          },
          { label: "Clause library", value: deals.clauses.length },
          { label: "Precedents", value: deals.precedents.length },
        ],
        sections: [
          {
            heading: "Deal pipeline",
            columns: [
              "Deal",
              "Client",
              "Counterparty",
              "Type",
              "Stage",
              "Status",
              "Value",
              "Lead",
              "Target close",
            ],
            rows: deals.deals.map((d) => [
              d.name,
              d.client,
              d.counterparty,
              d.type,
              d.stage,
              d.status,
              `${d.currency} ${d.value.toLocaleString()}`,
              d.leadPartner,
              d.targetClose?.slice(0, 10) ?? "—",
            ]),
          },
          {
            heading: "Due diligence & CPs",
            columns: [
              "Deal",
              "DD items",
              "DD complete",
              "CPs",
              "CPs satisfied",
            ],
            rows: deals.deals.map((d) => [
              d.name,
              d.dd.length,
              d.dd.filter((i) => i.status === "Complete").length,
              d.cps.length,
              d.cps.filter((c) => c.status === "Satisfied").length,
            ]),
          },
          {
            heading: "Clause library",
            columns: [
              "Clause",
              "Category",
              "Jurisdiction",
              "Approved",
              "Version",
            ],
            rows: deals.clauses.map((c) => [
              c.title,
              c.category,
              c.jurisdiction,
              c.approved ? "Yes" : "No",
              c.version,
            ]),
          },
        ],
      },
    });

    // ── Deal intelligence ─────────────────────────────────────
    entries.push({
      domain: "Deal Intelligence",
      description: "Investor readiness assessments and valuation outputs.",
      icon: TrendingUp,
      tone: "from-blue-500 to-indigo-500",
      def: {
        id: "deal-intelligence",
        title: "Deal Intelligence Report",
        subtitle: "Investor readiness and valuation",
        summary: [
          { label: "Assessments", value: intel.readiness.length },
          { label: "Valuations", value: intel.valuations.length },
        ],
        sections: [
          {
            heading: "Investor readiness",
            columns: [
              "Company",
              "Version",
              "Advisor",
              "Threshold",
              "Overall score",
              "Open gaps",
            ],
            rows: intel.readiness.map((a) => [
              a.company,
              a.version,
              a.advisor,
              a.threshold,
              a.overallScore,
              a.gapsOpen,
            ]),
          },
          {
            heading: "Valuations",
            columns: ["Advisor", "Currency", "Blended EV", "Created"],
            rows: intel.valuations.map((v) => [
              v.advisor,
              v.currency,
              v.blendResult?.blendedEv?.toLocaleString() ?? "—",
              v.createdAt?.slice(0, 10) ?? "—",
            ]),
          },
        ],
      },
    });

    // ── ESG ───────────────────────────────────────────────────
    if (dash) {
      entries.push({
        domain: "ESG",
        description:
          "Pillar scores, metric performance, materiality and framework alignment.",
        icon: Leaf,
        tone: "from-lime-500 to-emerald-500",
        def: {
          id: "esg",
          title: "ESG Performance Report",
          subtitle: `Consolidated score ${dash.total}/100`,
          summary: [
            { label: "Environmental", value: dash.environmental },
            { label: "Social", value: dash.social },
            { label: "Governance", value: dash.governance },
            { label: "Consolidated", value: dash.total },
          ],
          sections: [
            {
              heading: "ESG metrics",
              columns: [
                "Pillar",
                "Category",
                "Metric",
                "Value",
                "Unit",
                "Target",
                "Target year",
                "Source",
              ],
              rows: esgMetrics.map((m) => [
                m.pillar,
                m.category,
                m.name,
                m.value,
                m.unit,
                m.target,
                m.targetYear,
                m.source,
              ]),
            },
            {
              heading: "Material topics",
              columns: [
                "Topic",
                "Pillar",
                "Financial",
                "Impact",
                "Escalated to risk",
              ],
              rows: dash.materialTopicsList.map((t) => [
                t.topic,
                t.pillar,
                t.financial,
                t.impact,
                t.escalatedToRisk ? "Yes" : "No",
              ]),
            },
            {
              heading: "Framework alignment",
              columns: ["Framework", "Signed off", "Total", "Coverage %"],
              rows: dash.frameworkAlignment.map((f) => [
                f.framework,
                f.signedOff,
                f.total,
                `${f.pct}%`,
              ]),
            },
          ],
        },
      });
    }

    return entries;
  }, [overview, dash, esgMetrics]);

  const health = overview?.healthScore ?? 0;
  const esgTotal = dash?.total ?? 0;
  const openRisksCount =
    overview?.risk.risks.filter((r) => r.status !== "Closed").length ?? 0;
  const openIncidentsCount =
    overview?.operations.incidents.filter((i) => i.status !== "Closed")
      .length ?? 0;
  const overdueObligationsList =
    overview?.compliance.obligations.filter((o) => o.status === "Overdue") ??
    [];
  const openDeficienciesList =
    overview?.risk.deficiencies.filter((d) => d.status !== "Closed") ?? [];
  const openFindingsList =
    overview?.operations.audits
      .flatMap((a) => a.findings)
      .filter((f) => f.status !== "Remediated" && f.status !== "Closed") ?? [];

  const executivePack: ReportDefinition = {
    id: "grc-executive-pack",
    title: "GRC Executive Pack",
    subtitle: "Consolidated board pack across every GRC domain",
    summary: [
      { label: "GRC health score", value: `${health}/100` },
      { label: "Open risks", value: openRisksCount },
      { label: "Overdue obligations", value: overdueObligationsList.length },
      { label: "Open incidents", value: openIncidentsCount },
      { label: "Open deficiencies", value: openDeficienciesList.length },
      { label: "ESG score", value: esgTotal },
    ],
    sections: catalogue.flatMap((c) =>
      c.def.sections.map((sec) => ({
        ...sec,
        heading: `${c.domain} — ${sec.heading}`,
      })),
    ),
  };

  const filtered = catalogue.filter(
    (c) =>
      !query ||
      c.domain.toLowerCase().includes(query.toLowerCase()) ||
      c.def.title.toLowerCase().includes(query.toLowerCase()),
  );

  const download = (def: ReportDefinition, fmt: "pdf" | "excel") => {
    if (fmt === "pdf") exportReportPdf(def);
    else exportReportExcel(def);
    toast({
      title: `${def.title} downloaded`,
      description:
        fmt === "pdf" ? "PDF generated." : "Excel workbook generated.",
    });
  };

  if (isLoading || !overview) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading GRC reports…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            GRC Reporting
          </h1>
          <p className="text-sm text-muted-foreground">
            Every governance, risk, compliance, operations, deals and ESG
            dataset, downloadable as PDF or Excel.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => download(executivePack, "excel")}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Executive pack (Excel)
          </Button>
          <Button onClick={() => download(executivePack, "pdf")}>
            <FileDown className="h-4 w-4 mr-1" />
            Executive pack (PDF)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi
          label="GRC health"
          value={`${health}/100`}
          icon={ShieldCheck}
          tone="from-primary to-violet-500"
        />
        <Kpi
          label="Open risks"
          value={openRisksCount}
          icon={AlertTriangle}
          tone="from-rose-500 to-orange-500"
        />
        <Kpi
          label="Overdue obligations"
          value={overdueObligationsList.length}
          icon={ShieldCheck}
          tone="from-amber-500 to-yellow-500"
        />
        <Kpi
          label="Open incidents"
          value={openIncidentsCount}
          icon={Activity}
          tone="from-red-500 to-rose-500"
        />
        <Kpi
          label="Open deficiencies"
          value={openDeficienciesList.length}
          icon={Briefcase}
          tone="from-blue-500 to-cyan-500"
        />
        <Kpi
          label="ESG score"
          value={esgTotal}
          icon={Leaf}
          tone="from-lime-500 to-emerald-500"
        />
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search reports…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((entry) => {
          const rowCount = entry.def.sections.reduce(
            (t, sec) => t + sec.rows.length,
            0,
          );
          return (
            <Card key={entry.def.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div
                  className={`w-9 h-9 rounded-lg bg-gradient-to-br ${entry.tone} flex items-center justify-center mb-2`}
                >
                  <entry.icon className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-base">{entry.def.title}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {entry.description}
                </p>
              </CardHeader>
              <CardContent className="mt-auto space-y-3">
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline">
                    {entry.def.sections.length} sections
                  </Badge>
                  <Badge variant="outline">{rowCount} records</Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreview(entry.def)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => download(entry.def, "pdf")}
                  >
                    <FileDown className="h-3.5 w-3.5 mr-1" />
                    PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => download(entry.def, "excel")}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
                    Excel
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Attention list — items past due today ({today})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ...overdueObligationsList.map((o) => ({
                  item: o.title,
                  domain: "Compliance",
                  owner: o.owner,
                  due: o.nextDueDate?.slice(0, 10),
                })),
                ...openDeficienciesList
                  .filter((d) => d.deadline?.slice(0, 10) < today)
                  .map((d) => ({
                    item: d.title,
                    domain: "Risk",
                    owner: d.owner,
                    due: d.deadline.slice(0, 10),
                  })),
                ...openFindingsList
                  .filter(
                    (f) =>
                      (f.remediationDueDate ?? "") < today &&
                      f.remediationDueDate,
                  )
                  .map((f) => ({
                    item: f.observation,
                    domain: "Operations",
                    owner: "—",
                    due: f.remediationDueDate!.slice(0, 10),
                  })),
                ...(overview?.thirdPartyBcp.vendors ?? [])
                  .filter(
                    (v) => v.status === "Active" && v.nextReviewDate < today,
                  )
                  .map((v) => ({
                    item: `${v.name} — vendor review`,
                    domain: "Third-party",
                    owner: "Procurement",
                    due: v.nextReviewDate.slice(0, 10),
                  })),
              ]
                .sort((a, b) => (a.due < b.due ? -1 : 1))
                .slice(0, 12)
                .map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-sm font-medium">
                      {row.item}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.domain}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{row.owner}</TableCell>
                    <TableCell className="text-xs text-rose-600">
                      {row.due}
                    </TableCell>
                  </TableRow>
                ))}
              {overdueObligationsList.length === 0 &&
                openDeficienciesList.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-xs text-muted-foreground py-8"
                    >
                      Nothing is past due.
                    </TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{preview?.title}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-6">
              {preview.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {preview.summary.map((sm) => (
                    <div key={sm.label} className="border rounded p-2">
                      <div className="text-xs text-muted-foreground">
                        {sm.label}
                      </div>
                      <div className="text-lg font-bold">{sm.value}</div>
                    </div>
                  ))}
                </div>
              )}
              {preview.sections.map((sec) => (
                <div key={sec.heading}>
                  <div className="font-medium text-sm mb-2">{sec.heading}</div>
                  <div className="border rounded overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {sec.columns.map((c) => (
                            <TableHead key={c} className="text-xs">
                              {c}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sec.rows.slice(0, 8).map((r, i) => (
                          <TableRow key={i}>
                            {r.map((cell, j) => (
                              <TableCell key={j} className="text-xs">
                                {String(cell)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                        {sec.rows.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={sec.columns.length}
                              className="text-xs text-muted-foreground text-center py-4"
                            >
                              No records
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {sec.rows.length > 8 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Showing 8 of {sec.rows.length} rows — the full set is
                      included in the download.
                    </div>
                  )}
                </div>
              ))}
              <div className="flex gap-2 justify-end sticky bottom-0 bg-background pt-2">
                <Button
                  variant="outline"
                  onClick={() => download(preview, "excel")}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Excel
                </Button>
                <Button onClick={() => download(preview, "pdf")}>
                  <FileDown className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, tone }: any) {
  return (
    <Card>
      <CardContent className="p-4">
        <div
          className={`w-8 h-8 rounded bg-gradient-to-br ${tone} flex items-center justify-center mb-2`}
        >
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
