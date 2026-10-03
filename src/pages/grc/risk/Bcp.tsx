import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
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
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  Info,
  Plus,
  Siren,
  XCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchBcpPlans,
  createBcpPlan,
  fetchBcpTests,
  logBcpTest,
  completeBcpTest,
  fetchRtoRpo,
  createRtoRpo,
  recordRtoRpoActual,
  fetchCrisisContacts,
  createCrisisContact,
  updateCrisisContact,
  deleteCrisisContact,
  fetchBiaProcesses,
  createBiaProcess,
  fetchVendorResilience,
  createVendorResilience,
  markVendorResilienceAttested,
  fetchBcpIncidents,
  declareBcpIncident,
  resolveBcpIncident,
  fetchBcpReports,
  createBcpReport,
  fetchBcpFindings,
  createBcpFinding,
  resolveBcpFinding,
  type BcpTestOutcome,
  type SystemCriticality,
  type BcpTestType,
  type BcpPlanStatus,
  type ReviewCycle,
  type AttestationStatus,
  type AlternateVendorStatus,
  type BcpIncidentSeverity,
  type BcpFindingStatus,
  type Severity,
  type BcpPlan as ApiBcpPlan,
  type BcpIncident as ApiBcpIncident,
  type BcpReport as ApiBcpReport,
  type BcpTestFinding as ApiBcpTestFinding,
  type CrisisContact,
} from "@/lib/grc/risk-api";
import {
  fetchTeams,
  fetchEmployees,
  type HrTeam,
  type Employee,
} from "@/lib/hr/hr-api";
import {
  fetchVendors as fetchCrmVendors,
  type Vendor as CrmVendor,
} from "@/lib/crm/vendor-api";
import { fetchCommittees, type Committee } from "@/lib/grc/governance-api";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types (BIA, Plans, DR systems, Tests, Vendor resilience, Incidents,
// Reports and the Crisis Management Team roster are all real,
// tenant-scoped backend records now — see AGENTS.md. Escalation
// matrix, notification order, communication templates, response
// playbooks, report-type catalog and the scheduled-reports card below
// remain static reference content: there's no create/edit affordance
// for them in this design.) ───
type Crit = Severity;
interface Process {
  id: string;
  name: string;
  departmentId: string | null;
  dept: string;
  owner: string;
  criticality: Crit;
  mtd: string;
  impactPerDay: number;
  nonFinancialImpact: string;
  deps: string[];
  linkedPlanId: string | null;
}
interface Plan {
  id: string;
  code: string;
  title: string;
  scope: string;
  version: string;
  reviewCycle: string;
  status: BcpPlanStatus;
  phase: number; // 0..6 of lifecycle
}
interface DrSystem {
  id: string;
  name: string;
  tier: SystemCriticality;
  strategy: string;
  rtoT: number; // minutes
  rtoA: number | null;
  rpoT: number;
  rpoA: number | null;
}
interface TestRec {
  id: string;
  code: string;
  planId: string | null;
  scenario: string;
  type: BcpTestType;
  date: string;
  result: "Passed" | "Partial" | "Failed" | "Scheduled";
  score: number | null;
  notes?: string;
}
interface Vendor {
  id: string;
  crmVendorId: string;
  name: string;
  criticality: Crit;
  sla: string;
  attestation: AttestationStatus;
  alternate: AlternateVendorStatus;
  dependentProcessIds: string[];
  escalationContact: string;
  lastReview: string;
  nextReview: string | null; // raw ISO
}
interface Finding {
  id: string;
  testId: string;
  severity: Crit;
  title: string;
  owner: string;
  dueDate: string | null;
  status: BcpFindingStatus;
}
interface Incident {
  id: string;
  code: string;
  date: string; // raw ISO declaredAt
  description: string;
  severity: BcpIncidentSeverity;
  status: "Active" | "Resolved";
  resolvedAt: string | null;
  mttr: string;
}
interface Report {
  id: string;
  name: string;
  type: string;
  period: string;
  generatedAt: string; // raw ISO
  recipients: string;
  sections: string[];
  schedule: string;
  format: string;
}

const LIFECYCLE = [
  "BIA",
  "Draft plan",
  "Stakeholder review",
  "Board approval",
  "Implementation & training",
  "Test & validate",
  "Annual review",
];
const PLAN_SCOPES = [
  "Client Onboarding (KYC)",
  "Client Reporting",
  "Fund Administration",
  "Payment Processing",
  "Regulatory Reporting",
  "HR & Payroll",
  "Other",
];
const REVIEW_CYCLES = ["Quarterly", "Annual", "Biennial"];
// Tabs a generated report can pull from — keys match the Tabs `value`s below.
const SECTION_LABELS: Record<string, string> = {
  overview: "Overview KPIs",
  bia: "Business Impact Analysis",
  plans: "Continuity Plans status",
  dr: "DR & Recovery Targets",
  testing: "Testing & Exercises results",
  vendors: "Vendor & Third-Party Resilience",
  crisis: "Crisis Management readiness",
  incidents: "Incident Response log",
};
const SECTION_KEYS = Object.keys(SECTION_LABELS);
const ESCALATION = [
  {
    level: "Level 1 — Operational",
    trigger: "Minor disruption, < 1 hour",
    who: "IT Lead",
    action: "notifies Dept. Manager within",
    time: "15 min",
  },
  {
    level: "Level 2 — Significant",
    trigger: "Service degradation, 1–4 hours",
    who: "Dept. Manager",
    action: "escalates to Crisis Team within",
    time: "30 min",
  },
  {
    level: "Level 3 — Critical",
    trigger: "Major outage, > 4 hours",
    who: "Crisis Team Lead",
    action: "convenes CMT within",
    time: "1 hour",
  },
  {
    level: "Level 4 — Catastrophic",
    trigger: "Existential threat, regulator/media",
    who: "Managing Partner + Board Chair",
    action: "notified within",
    time: "30 min",
  },
];
// Suggested CMT roles for the Add/Edit contact dialog's Role dropdown —
// "Other" lets the tenant type a role of their own, which is then
// saved as-is. The CMT table itself is real data now (CrisisContact
// records), not a fixed skeleton.
const CMT_ROLES = [
  "Crisis Commander",
  "IT Recovery Lead",
  "Compliance Lead",
  "Comms & Media",
  "Operations Lead",
  "Legal Counsel",
  "Other",
];
const NOTIFY = [
  ["Internal Crisis Team", "Within 15 min · WhatsApp group + phone tree"],
  ["Board Chair & Audit Committee", "Within 1 hour · Secure email + call"],
  [
    "The Regulator",
    "Within 24 hours for data breaches · Formal letter + portal",
  ],
  [
    "Affected clients",
    "Within 48 hours · Personalised email from Managing Partner",
  ],
  [
    "Media / public (if required)",
    "As needed · Prepared statement, single spokesperson",
  ],
  ["Insurance provider", "Within 72 hours · Formal claim notification"],
];
const TEMPLATES = [
  ["System Outage Notice", "For clients — scheduled/unscheduled downtime"],
  ["Data Breach Notification", "Regulatory + client — per Data Protection Law"],
  ["Regulator Incident Report", "Formal regulatory notification template"],
  ["Media Holding Statement", "Generic press response for active incidents"],
  ["Staff All-Hands Alert", "Internal broadcast for business-wide incidents"],
  ["Post-Incident Review", "Lessons-learned report template"],
];
const PLAYBOOKS = [
  ["Ransomware / Malware", "Isolate → contain → eradicate → recover → notify"],
  ["DDoS Attack", "Detect → mitigate → failover → restore"],
  ["Data Breach", "Identify → contain → assess → notify → remediate"],
  [
    "Physical / Natural Disaster",
    "Evacuate → account → activate alternate → communicate",
  ],
  [
    "Power / Infrastructure Failure",
    "UPS → generator → cloud failover → staff notification",
  ],
  ["Key Person Unavailability", "Activate deputy → redistribute → communicate"],
];
const REPORT_TYPES = [
  [
    "Board & Executive Summary",
    "Overview KPIs, needs-attention items, test trend, vendor risk flags — one page for the board pack.",
  ],
  [
    "Regulator Compliance Report",
    "Continuity plan status, RTO/RPO compliance, test results, incident summary — formatted for submission.",
  ],
  [
    "Annual BCM Programme Report",
    "Full-year view: BIA coverage, all plans, every test, every incident, vendor resilience.",
  ],
  [
    "Test After-Action Report",
    "Single test: scenario, participants, score, findings, and remediation owners.",
  ],
  [
    "Incident Post-Mortem",
    "Single incident: timeline, root cause, MTTR, playbook used, and lessons learned.",
  ],
  [
    "Audit-Ready Compliance Pack",
    "Bundles every plan, test, RTO/RPO record, and vendor attestation into one evidence pack.",
  ],
];

// ─── Helpers ───
const mins = (m: number | null) => {
  if (m === null) return "—";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
};
const fmtD = (d: string) =>
  /^\d{4}-/.test(d)
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : d;
const money = (n: number) => `$${n.toLocaleString()}`;
const shortCode = (prefix: string, id: string) =>
  `${prefix}-${id.slice(-4).toUpperCase()}`;
const mttrLabel = (start: string, end: string) => {
  const totalMin = Math.max(
    0,
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000),
  );
  return totalMin < 60
    ? `${totalMin} min`
    : `${(totalMin / 60).toFixed(1)} hrs`;
};
const quarterOf = (iso: string) => {
  const d = new Date(iso);
  const q = Math.floor(d.getMonth() / 3) + 1;
  return {
    key: d.getFullYear() * 4 + q,
    label: `Q${q} '${String(d.getFullYear()).slice(-2)}`,
  };
};

const tone = (s: string) => {
  if (
    [
      "Critical",
      "Breach",
      "Overdue",
      "Failed",
      "Active",
      "L3",
      "L4",
      "Fail",
      "No - single point of failure",
    ].includes(s)
  )
    return "bg-destructive/10 text-destructive border-destructive/30";
  if (
    [
      "High",
      "Partial",
      "Pending",
      "Under review",
      "Needs update",
      "Medium",
      "Flagged",
      "L2",
      "Draft",
      "Not yet requested",
      "Requested - pending",
      "Open",
    ].includes(s)
  )
    return "bg-warning/10 text-warning border-warning/30";
  if (["Scheduled", "Submitted", "Low", "L1"].includes(s))
    return "bg-primary/10 text-primary border-primary/30";
  return "bg-success/10 text-success border-success/30";
};
const Pill = ({ s }: { s: string }) => (
  <Badge variant="outline" className={tone(s)}>
    {s}
  </Badge>
);

interface Detail {
  sub: string;
  title: string;
  status?: string;
  body: ReactNode;
}

const Row = ({ k, v }: { k: string; v: ReactNode }) => (
  <div className="flex justify-between gap-4 py-1.5 border-b last:border-0 text-sm">
    <span className="text-muted-foreground">{k}</span>
    <span className="font-medium text-right">{v}</span>
  </div>
);

function Kpi({
  label,
  value,
  sub,
  warn,
}: {
  label: string;
  value: ReactNode;
  sub: string;
  warn?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
        <div
          className={`text-xs mt-0.5 ${warn ? "text-destructive" : "text-muted-foreground"}`}
        >
          {sub}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ───
export default function GrcBcp() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [dialog, setDialog] = useState<
    | null
    | "process"
    | "plan"
    | "test"
    | "system"
    | "vendor"
    | "contact"
    | "incident"
    | "report"
    | "crisis"
    | "finding"
  >(null);
  const [actualFor, setActualFor] = useState<DrSystem | null>(null);
  const [completeFor, setCompleteFor] = useState<TestRec | null>(null);
  const [editingContact, setEditingContact] = useState<CrisisContact | null>(
    null,
  );

  const { data: apiProcesses = [] } = useQuery({
    queryKey: ["grc-bcp-processes"],
    queryFn: fetchBiaProcesses,
    retry: 1,
  });
  const { data: apiPlans = [] } = useQuery({
    queryKey: ["grc-bcp-plans"],
    queryFn: fetchBcpPlans,
    retry: 1,
  });
  const { data: apiTests = [] } = useQuery({
    queryKey: ["grc-bcp-tests"],
    queryFn: fetchBcpTests,
    retry: 1,
  });
  const { data: apiRto = [] } = useQuery({
    queryKey: ["grc-bcp-rto"],
    queryFn: fetchRtoRpo,
    retry: 1,
  });
  const { data: apiContacts = [] } = useQuery({
    queryKey: ["grc-bcp-contacts"],
    queryFn: fetchCrisisContacts,
    retry: 1,
  });
  const { data: apiVendors = [] } = useQuery({
    queryKey: ["grc-bcp-vendors"],
    queryFn: fetchVendorResilience,
    retry: 1,
  });
  const { data: apiIncidents = [] } = useQuery({
    queryKey: ["grc-bcp-incidents"],
    queryFn: fetchBcpIncidents,
    retry: 1,
  });
  const { data: apiReports = [] } = useQuery({
    queryKey: ["grc-bcp-reports"],
    queryFn: fetchBcpReports,
    retry: 1,
  });
  const { data: apiFindings = [] } = useQuery({
    queryKey: ["grc-bcp-findings"],
    queryFn: fetchBcpFindings,
    retry: 1,
  });

  const processes: Process[] = useMemo(
    () =>
      apiProcesses.map((p) => ({
        id: p._id,
        name: p.name,
        departmentId: p.departmentId,
        dept: p.dept,
        owner: p.owner,
        criticality: p.criticality,
        mtd: p.mtd,
        impactPerDay: p.impactPerDay,
        nonFinancialImpact: p.nonFinancialImpact,
        deps: p.dependencies,
        linkedPlanId: p.linkedPlanId,
      })),
    [apiProcesses],
  );

  const plans: Plan[] = useMemo(
    () =>
      apiPlans.map((p: ApiBcpPlan) => ({
        id: p._id,
        code: shortCode("BCP", p._id),
        title: p.title,
        scope: p.scope || p.content.slice(0, 90),
        version: `v${p.version}`,
        reviewCycle: p.reviewCycle || "Not set",
        status: p.status,
        phase: Math.min(Math.max(p.phase, 0), LIFECYCLE.length - 1),
      })),
    [apiPlans],
  );

  const systems: DrSystem[] = useMemo(
    () =>
      apiRto.map((r) => ({
        id: r._id,
        name: r.system,
        tier: r.criticality,
        strategy: r.strategy || "Not yet defined",
        rtoT: Math.round(r.rtoHours * 60),
        rtoA:
          r.rtoActualHours === null ? null : Math.round(r.rtoActualHours * 60),
        rpoT: Math.round(r.rpoHours * 60),
        rpoA:
          r.rpoActualHours === null ? null : Math.round(r.rpoActualHours * 60),
      })),
    [apiRto],
  );

  const tests: TestRec[] = useMemo(
    () =>
      apiTests
        .map((t) => ({
          id: t._id,
          code: shortCode("TST", t._id),
          planId: t.planId,
          scenario: t.scenario,
          type: t.testType,
          date: t.testedAt ?? t.scheduledFor ?? "",
          result: (t.outcome === null
            ? "Scheduled"
            : t.outcome === "Pass"
              ? "Passed"
              : t.outcome === "Fail"
                ? "Failed"
                : "Partial") as TestRec["result"],
          score: t.score,
          notes: t.notes,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [apiTests],
  );

  const vendors: Vendor[] = useMemo(
    () =>
      apiVendors.map((v) => ({
        id: v._id,
        crmVendorId: v.crmVendorId,
        name: v.name,
        criticality: v.criticality,
        sla: v.sla,
        attestation: v.attestation,
        alternate: v.alternate,
        dependentProcessIds: v.dependentProcessIds,
        escalationContact: v.escalationContact,
        lastReview: fmtD(v.lastReviewDate),
        nextReview: v.nextReviewDate,
      })),
    [apiVendors],
  );

  const findings: Finding[] = useMemo(
    () =>
      apiFindings.map((f) => ({
        id: f._id,
        testId: f.testId,
        severity: f.severity,
        title: f.title,
        owner: f.owner,
        dueDate: f.dueDate,
        status: f.status,
      })),
    [apiFindings],
  );

  const incidents: Incident[] = useMemo(
    () =>
      apiIncidents.map((i: ApiBcpIncident) => ({
        id: i._id,
        code: i.code,
        date: i.declaredAt,
        description: i.description,
        severity: i.severity,
        status: i.status,
        resolvedAt: i.resolvedAt,
        mttr: i.resolvedAt ? mttrLabel(i.declaredAt, i.resolvedAt) : "—",
      })),
    [apiIncidents],
  );

  const reports: Report[] = useMemo(
    () =>
      apiReports.map((r: ApiBcpReport) => ({
        id: r._id,
        name: r.name,
        type: r.type,
        period: r.period,
        generatedAt: r.generatedAt,
        recipients: r.recipients,
        sections: r.sections,
        schedule: r.schedule,
        format: r.format,
      })),
    [apiReports],
  );
  const recurringReports = reports.filter(
    (r) => r.schedule && r.schedule !== "Generate once - now",
  );

  const sysStatus = (s: DrSystem) =>
    s.rtoA === null
      ? "Untested"
      : s.rtoA > s.rtoT || (s.rpoA ?? 0) > s.rpoT
        ? "Breach"
        : "Ready";
  const breaches = systems.filter((s) => sysStatus(s) === "Breach");
  const tested = systems.filter((s) => s.rtoA !== null);
  const exposure = processes
    .filter((p) => p.criticality === "Critical" || p.criticality === "High")
    .reduce((s, p) => s + p.impactPerDay, 0);
  const received = vendors.filter((v) => v.attestation === "Received").length;
  const spof = vendors.filter(
    (v) => v.alternate === "No - single point of failure",
  );
  const overdueReviews = vendors.filter(
    (v) => v.nextReview && new Date(v.nextReview) < new Date(),
  );
  const openFindings = findings.filter((f) => f.status === "Open");
  const doneTests = tests.filter((t) => t.result !== "Scheduled");
  const scored = doneTests.filter((t) => t.score !== null);
  const avgScore = scored.length
    ? Math.round(scored.reduce((s, t) => s + (t.score ?? 0), 0) / scored.length)
    : 0;
  const upcoming = tests.filter((t) => t.result === "Scheduled");
  const active = incidents.filter((i) => i.status === "Active");
  const resolvedIncidents = incidents.filter((i) => i.resolvedAt);
  const avgMttrHrs = resolvedIncidents.length
    ? resolvedIncidents.reduce(
        (s, i) =>
          s +
          (new Date(i.resolvedAt!).getTime() - new Date(i.date).getTime()) /
            3600000,
        0,
      ) / resolvedIncidents.length
    : null;
  const lastDrill = [...doneTests].sort((a, b) =>
    b.date.localeCompare(a.date),
  )[0];
  const thisYear = new Date().getFullYear();

  const attention = [
    ...breaches.map((s) => ({
      s: "Breach",
      title: `${s.name} — RTO breach`,
      sub: `${mins(s.rtoA)} actual vs ${mins(s.rtoT)} target`,
      go: "dr",
    })),
    ...vendors
      .filter((v) => v.attestation !== "Received")
      .map((v) => ({
        s: v.attestation,
        title: `${v.name} — attestation ${v.attestation.toLowerCase()}`,
        sub: `Last review: ${v.lastReview}`,
        go: "vendors",
      })),
    ...plans
      .filter((p) => p.status !== "Approved")
      .map((p) => ({
        s: "Pending",
        title: `${p.code} — ${LIFECYCLE[p.phase].toLowerCase()} in progress`,
        sub: p.title,
        go: "plans",
      })),
    ...spof.map((v) => ({
      s: "Flagged",
      title: `${v.name} — no alternate identified`,
      sub: "Single point of failure at vendor level",
      go: "vendors",
    })),
  ];

  const trend = useMemo(() => {
    const buckets = new Map<number, { label: string; items: TestRec[] }>();
    doneTests.forEach((t) => {
      if (!t.date) return;
      const { key, label } = quarterOf(t.date);
      const b = buckets.get(key) ?? { label, items: [] };
      b.items.push(t);
      buckets.set(key, b);
    });
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a - b)
      .slice(-4)
      .map(([, b]) => {
        const withScore = b.items.filter((t) => t.score !== null);
        const value = withScore.length
          ? Math.round(
              withScore.reduce((s, t) => s + (t.score ?? 0), 0) /
                withScore.length,
            )
          : Math.round(
              (b.items.filter((t) => t.result === "Passed").length /
                b.items.length) *
                100,
            );
        return { label: b.label, value };
      });
  }, [doneTests]);

  const printReport = (title: string, sections?: string[]) => {
    const w = window.open("", "_blank");
    if (!w) return;
    const want =
      sections && sections.length ? new Set(sections) : new Set(SECTION_KEYS);
    const businessName = user?.businessName || "Your organisation";
    const generatedAt = new Date().toLocaleString("en-GB");
    const kv = (rows: [string, string][]) =>
      `<table>${rows.map(([k, v]) => `<tr><td class="k">${k}</td><td>${v}</td></tr>`).join("")}</table>`;
    const blocks: Record<string, string> = {
      overview: `
        <h2>Overview KPIs</h2>
        ${kv([
          ["Active plans", String(plans.length)],
          [
            "RTO compliance",
            `${tested.length - breaches.length}/${tested.length}`,
          ],
          ["Average test score", `${avgScore}%`],
          ["Vendor attestations", `${received}/${vendors.length}`],
          ["Daily exposure", money(exposure)],
        ])}
        <h2>Needs attention</h2>
        ${attention.length ? kv(attention.map((a) => [a.title, a.sub])) : `<table><tr><td class="empty">Nothing needs attention.</td></tr></table>`}
      `,
      bia: `<h2>Business Impact Analysis</h2><table><tr><th>Process</th><th>Department</th><th>Owner</th><th>Criticality</th><th>MTD</th><th>Impact/day</th></tr>${processes.length ? processes.map((p) => `<tr><td>${p.name}</td><td>${p.dept}</td><td>${p.owner}</td><td>${p.criticality}</td><td>${p.mtd}</td><td>${money(p.impactPerDay)}</td></tr>`).join("") : `<tr><td colspan="6" class="empty">No business processes recorded yet.</td></tr>`}</table>`,
      plans: `<h2>Continuity Plans status</h2><table><tr><th>Plan</th><th>Status</th><th>Review cycle</th></tr>${plans.length ? plans.map((p) => `<tr><td>${p.code}: ${p.title}</td><td>${p.status}</td><td>${p.reviewCycle}</td></tr>`).join("") : `<tr><td colspan="3" class="empty">No continuity plans recorded yet.</td></tr>`}</table>`,
      dr: `<h2>DR &amp; Recovery Targets</h2><table><tr><th>System</th><th>Tier</th><th>RTO</th><th>RPO</th><th>Status</th></tr>${systems.length ? systems.map((s) => `<tr><td>${s.name}</td><td>${s.tier}</td><td>${mins(s.rtoT)} / ${mins(s.rtoA)}</td><td>${mins(s.rpoT)} / ${mins(s.rpoA)}</td><td>${sysStatus(s)}</td></tr>`).join("") : `<tr><td colspan="5" class="empty">No systems recorded yet.</td></tr>`}</table>`,
      testing: `<h2>Testing &amp; Exercises results</h2><table><tr><th>Test</th><th>Scenario</th><th>Date</th><th>Result</th></tr>${tests.length ? tests.map((t) => `<tr><td>${t.code}</td><td>${t.scenario}</td><td>${fmtD(t.date)}</td><td>${t.result}</td></tr>`).join("") : `<tr><td colspan="4" class="empty">No tests logged or scheduled yet.</td></tr>`}</table>${openFindings.length ? `<h2>Open findings</h2><table><tr><th>Severity</th><th>Finding</th><th>Owner</th><th>Due</th></tr>${openFindings.map((f) => `<tr><td>${f.severity}</td><td>${f.title}</td><td>${f.owner || "—"}</td><td>${f.dueDate ? fmtD(f.dueDate) : "—"}</td></tr>`).join("")}</table>` : ""}`,
      vendors: `<h2>Vendor &amp; Third-Party Resilience</h2><table><tr><th>Vendor</th><th>Criticality</th><th>SLA</th><th>Attestation</th><th>Alternate</th><th>Last review</th></tr>${vendors.length ? vendors.map((v) => `<tr><td>${v.name}</td><td>${v.criticality}</td><td>${v.sla}</td><td>${v.attestation}</td><td>${v.alternate}</td><td>${v.lastReview}</td></tr>`).join("") : `<tr><td colspan="6" class="empty">No vendors assessed yet.</td></tr>`}</table>`,
      crisis: `<h2>Crisis Management readiness</h2>${kv([
        ["Active incidents", String(active.length)],
        ["Last drill", lastDrill ? fmtD(lastDrill.date) : "None yet"],
      ])}<table><tr><th>Role</th><th>Primary</th><th>Backup</th></tr>${apiContacts.length ? apiContacts.map((c) => `<tr><td>${c.role}</td><td>${c.primaryName || "—"}</td><td>${c.backupName || "—"}</td></tr>`).join("") : `<tr><td colspan="3" class="empty">No crisis management roles recorded yet.</td></tr>`}</table>`,
      incidents: `<h2>Incident Response log</h2><table><tr><th>ID</th><th>Date</th><th>Description</th><th>Severity</th><th>Status</th><th>MTTR</th></tr>${incidents.length ? incidents.map((i) => `<tr><td>${i.code}</td><td>${fmtD(i.date)}</td><td>${i.description}</td><td>${i.severity}</td><td>${i.status}</td><td>${i.mttr}</td></tr>`).join("") : `<tr><td colspan="6" class="empty">No incidents declared yet.</td></tr>`}</table>`,
    };
    const body = SECTION_KEYS.filter((k) => want.has(k))
      .map((k) => blocks[k])
      .join("");
    w.document.write(`<!doctype html><html><head><title>${title}</title><style>
*{box-sizing:border-box}
body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;margin:0;padding:40px;background:#f8fafc}
.doc{max-width:860px;margin:0 auto;background:#fff;border-radius:12px;padding:0;box-shadow:0 4px 24px rgba(0,0,0,.06);overflow:hidden}
.brandbar{background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 40px;color:#fff}
.brandbar .logo{font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;opacity:.85;margin-bottom:10px}
.brandbar h1{font-size:22px;margin:0 0 4px;color:#fff}
.brandbar .meta{color:rgba(255,255,255,.75);font-size:12px;margin:2px 0 0}
.content{padding:32px 40px 40px}
h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#475569;margin:28px 0 10px;border-bottom:1px solid #e2e8f0;padding-bottom:6px}
h2:first-child{margin-top:0}
table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:4px}
th{text-align:left;padding:6px 8px 6px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
td{padding:7px 8px 7px 0;vertical-align:top;border-bottom:1px solid #f1f5f9}
td.k{color:#64748b;width:38%}
td.empty{color:#94a3b8;font-style:italic;border-bottom:none}
.footer{margin-top:36px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center}
.footer .brand{font-weight:700;color:#6366f1}
@media print{body{background:#fff;padding:0}.doc{box-shadow:none;border-radius:0}}
</style></head><body>
<div class="doc">
  <div class="brandbar">
    <div class="logo">Lexora</div>
    <h1>${title}</h1>
    <p class="meta">${businessName}</p>
    <p class="meta">Generated ${generatedAt} · Business Continuity &amp; Disaster Recovery</p>
  </div>
  <div class="content">
    ${body}
    <div class="footer">Powered by <span class="brand">Lexora</span></div>
  </div>
</div>
</body></html>`);
    w.document.close();
    w.print();
  };

  const exportBia = () => {
    const rows = [
      [
        "Process",
        "Department",
        "Owner",
        "Criticality",
        "MTD",
        "Impact/day",
        "Dependencies",
      ],
      ...processes.map((p) => [
        p.name,
        p.dept,
        p.owner,
        p.criticality,
        p.mtd,
        String(p.impactPerDay),
        p.deps.join("; "),
      ]),
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")], {
        type: "text/csv",
      }),
    );
    a.download = "business-impact-analysis.csv";
    a.click();
  };

  const stages = [
    ["Identify", "Business Impact Analysis", "bia"],
    ["Plan", "Continuity Plans", "plans"],
    ["Prepare", "DR & Recovery Targets", "dr"],
    ["De-risk", "Vendor Resilience", "vendors"],
    ["Test", "Testing & Exercises", "testing"],
    ["Mobilise", "Crisis Management", "crisis"],
    ["Respond", "Incident Response", "incidents"],
  ];

  const markAttestedMut = useMutation({
    mutationFn: (id: string) => markVendorResilienceAttested(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grc-bcp-vendors"] });
      toast({ title: "Attestation recorded" });
      setDetail(null);
    },
    onError: (e: any) =>
      toast({
        title: "Couldn't save",
        description: e?.response?.data?.message,
        variant: "destructive",
      }),
  });
  const resolveMut = useMutation({
    mutationFn: (id: string) => resolveBcpIncident(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grc-bcp-incidents"] });
      toast({ title: "Incident resolved" });
    },
    onError: (e: any) =>
      toast({
        title: "Couldn't save",
        description: e?.response?.data?.message,
        variant: "destructive",
      }),
  });
  const resolveFindingMut = useMutation({
    mutationFn: (id: string) => resolveBcpFinding(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grc-bcp-findings"] });
      toast({ title: "Finding resolved" });
    },
    onError: (e: any) =>
      toast({
        title: "Couldn't save",
        description: e?.response?.data?.message,
        variant: "destructive",
      }),
  });
  const deleteContactMut = useMutation({
    mutationFn: (id: string) => deleteCrisisContact(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grc-bcp-contacts"] });
      toast({ title: "Removed from crisis management team" });
    },
    onError: (e: any) =>
      toast({
        title: "Couldn't remove",
        description: e?.response?.data?.message,
        variant: "destructive",
      }),
  });
  const recordActualMut = useMutation({
    mutationFn: (vars: {
      id: string;
      rtoActualHours?: number;
      rpoActualHours?: number;
    }) =>
      recordRtoRpoActual(vars.id, {
        rtoActualHours: vars.rtoActualHours,
        rpoActualHours: vars.rpoActualHours,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grc-bcp-rto"] });
      toast({ title: "Recovery result recorded" });
      setActualFor(null);
    },
    onError: (e: any) =>
      toast({
        title: "Couldn't save",
        description: e?.response?.data?.message,
        variant: "destructive",
      }),
  });
  const completeTestMut = useMutation({
    mutationFn: (vars: {
      id: string;
      outcome: BcpTestOutcome;
      score?: number;
      notes?: string;
    }) =>
      completeBcpTest(vars.id, {
        outcome: vars.outcome,
        score: vars.score,
        notes: vars.notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grc-bcp-tests"] });
      toast({ title: "Test marked complete" });
      setCompleteFor(null);
    },
    onError: (e: any) =>
      toast({
        title: "Couldn't save",
        description: e?.response?.data?.message,
        variant: "destructive",
      }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Business Continuity &amp; Disaster Recovery
        </h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          The full resilience lifecycle: what could break, how we've planned for
          it, what we rely on to recover, whether it's been tested, and what
          happens the moment something goes wrong.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bia">Business Impact Analysis</TabsTrigger>
          <TabsTrigger value="plans">Continuity Plans</TabsTrigger>
          <TabsTrigger value="dr">DR &amp; Recovery Targets</TabsTrigger>
          <TabsTrigger value="testing">Testing &amp; Exercises</TabsTrigger>
          <TabsTrigger value="vendors">
            Vendor &amp; Third-Party Resilience
          </TabsTrigger>
          <TabsTrigger value="crisis">Crisis Management</TabsTrigger>
          <TabsTrigger value="incidents">Incident Response</TabsTrigger>
          <TabsTrigger value="reporting">Reporting</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-5 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <Kpi
              label="Active plans"
              value={plans.length}
              sub={`${plans.filter((p) => p.status === "Approved").length} approved`}
            />
            <Kpi
              label="Tests logged"
              value={`${doneTests.length} / ${tests.length}`}
              sub={
                upcoming[0]
                  ? `Next: ${fmtD(upcoming[0].date)}`
                  : "None scheduled"
              }
            />
            <Kpi
              label="Avg recovery score"
              value={`${avgScore}%`}
              sub="Across scored tests"
            />
            <Kpi
              label="RTO compliance"
              value={`${tested.length - breaches.length}/${tested.length}`}
              sub={`${breaches.length} systems breaching target`}
              warn={breaches.length > 0}
            />
            <Kpi
              label="Vendor attestations"
              value={`${received}/${vendors.length}`}
              sub={`${vendors.length - received} pending or overdue`}
              warn={received < vendors.length}
            />
            <Kpi
              label="Crisis readiness"
              value={active.length ? "Low" : "Medium"}
              sub={
                lastDrill
                  ? `Last drill: ${fmtD(lastDrill.date)}`
                  : "No drills yet"
              }
            />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                The resilience lifecycle
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Click any stage to jump straight to it. This is the order the
                programme runs in.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
                {stages.map(([k, l, t], i) => (
                  <button
                    key={k}
                    onClick={() => setTab(t)}
                    className="text-left border rounded-lg p-3 hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                      {i + 1}
                    </div>
                    <div className="font-semibold text-sm mt-2">{k}</div>
                    <div className="text-xs text-muted-foreground">{l}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" /> Needs
                  attention
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {attention.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => setTab(a.go)}
                    className="w-full flex items-center gap-3 border rounded-lg p-3 text-left hover:bg-muted/40"
                  >
                    <Pill s={a.s} />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{a.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.sub}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
                {attention.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nothing needs attention.
                  </p>
                )}
              </CardContent>
            </Card>
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" /> Upcoming tests
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {upcoming.map((t) => (
                    <div key={t.id} className="flex gap-3 text-sm">
                      <div className="text-xs font-bold text-primary w-14 shrink-0">
                        {fmtD(t.date).split(" ").slice(0, 2).join(" ")}
                      </div>
                      <div>
                        <div className="font-medium">{t.scenario}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.type}
                        </div>
                      </div>
                    </div>
                  ))}
                  {upcoming.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      None scheduled.
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Total daily exposure
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{money(exposure)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    If all critical &amp; high processes are down simultaneously
                    for 24 hours.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* BIA */}
        <TabsContent value="bia" className="mt-4">
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">
                  Business Impact Analysis
                </CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={exportBia}>
                    <Download className="h-4 w-4 mr-1" /> Export
                  </Button>
                  <Button size="sm" onClick={() => setDialog("process")}>
                    <Plus className="h-4 w-4 mr-1" /> Add process
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business process</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Criticality</TableHead>
                      <TableHead>Max downtime</TableHead>
                      <TableHead>Priority</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processes.map((p) => (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer"
                        onClick={() =>
                          setDetail({
                            sub: "Business process",
                            title: p.name,
                            status: p.criticality,
                            body: (
                              <>
                                <Row k="Department" v={p.dept} />
                                <Row k="Owner" v={p.owner} />
                                <Row k="Max tolerable downtime" v={p.mtd} />
                                <Row
                                  k="Financial impact / day"
                                  v={money(p.impactPerDay)}
                                />
                                <Row
                                  k="Non-financial impact"
                                  v={p.nonFinancialImpact || "—"}
                                />
                                <Row
                                  k="Linked continuity plan"
                                  v={
                                    plans.find((pl) => pl.id === p.linkedPlanId)
                                      ?.title ?? "None"
                                  }
                                />
                                <Row
                                  k="Dependencies"
                                  v={p.deps.join(", ") || "None"}
                                />
                              </>
                            ),
                          })
                        }
                      >
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.dept}</TableCell>
                        <TableCell>
                          <Pill s={p.criticality} />
                        </TableCell>
                        <TableCell>{p.mtd}</TableCell>
                        <TableCell>
                          {p.criticality === "Critical"
                            ? "P1"
                            : p.criticality === "High"
                              ? "P2"
                              : p.criticality === "Medium"
                                ? "P3"
                                : "P4"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {processes.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-sm text-muted-foreground py-8"
                        >
                          No processes added yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Impact distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(["Critical", "High", "Medium", "Low"] as Crit[]).map(
                    (c) => {
                      const n = processes.filter(
                        (p) => p.criticality === c,
                      ).length;
                      return (
                        <div key={c}>
                          <div className="flex justify-between text-xs mb-1">
                            <span>{c}</span>
                            <span>{n}</span>
                          </div>
                          <Progress
                            value={
                              processes.length
                                ? (n / processes.length) * 100
                                : 0
                            }
                          />
                        </div>
                      );
                    },
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Total daily exposure
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{money(exposure)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Key dependencies</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-1.5">
                  {Object.entries(
                    processes
                      .flatMap((p) => p.deps)
                      .reduce<
                        Record<string, number>
                      >((m, d) => ({ ...m, [d]: (m[d] ?? 0) + 1 }), {}),
                  )
                    .sort((a, b) => b[1] - a[1])
                    .map(([d, n]) => (
                      <Badge key={d} variant="secondary">
                        {d} ×{n}
                      </Badge>
                    ))}
                  {processes.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No processes added yet.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground w-full mt-2">
                    Single points of failure are flagged for review in Vendor
                    Resilience.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* PLANS */}
        <TabsContent value="plans" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Business Continuity Plans</h2>
            <Button size="sm" onClick={() => setDialog("plan")}>
              <Plus className="h-4 w-4 mr-1" /> New plan
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {plans.map((p) => (
              <Card
                key={p.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() =>
                  setDetail({
                    sub: p.code,
                    title: p.title,
                    status: p.status,
                    body: (
                      <>
                        <Row k="Scope" v={p.scope} />
                        <Row k="Version" v={p.version} />
                        <Row k="Review cycle" v={p.reviewCycle} />
                        <Row k="Lifecycle stage" v={LIFECYCLE[p.phase]} />
                      </>
                    ),
                  })
                }
              >
                <CardContent className="p-4">
                  <div className="flex justify-between gap-2">
                    <div className="font-semibold text-sm">
                      {p.code}: {p.title}
                    </div>
                    <Pill s={p.status} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {p.scope}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {p.version} · Review cycle: {p.reviewCycle}
                  </div>
                </CardContent>
              </Card>
            ))}
            {plans.length === 0 && (
              <p className="text-sm text-muted-foreground md:col-span-2">
                No continuity plans yet.
              </p>
            )}
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Plan lifecycle &amp; governance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {LIFECYCLE.map((l, i) => {
                  const behind = plans.filter(
                    (p) => p.phase === i && p.status !== "Approved",
                  );
                  return (
                    <div
                      key={l}
                      className={`rounded-md p-2 text-center text-xs border ${behind.length ? "border-warning bg-warning/10" : "bg-success/10 border-success/30"}`}
                    >
                      <div className="font-medium">{l}</div>
                      {behind.map((b) => (
                        <div key={b.id} className="text-[10px] mt-1 font-bold">
                          {b.code}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Plans still moving through the cycle are marked on their current
                stage; approved plans are in annual review.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DR */}
        <TabsContent value="dr" className="space-y-4 mt-4">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <p className="text-sm text-muted-foreground">
              Each system's recovery strategy and its RTO/RPO performance —
              click any row for the full picture.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDialog("system")}
              >
                <Plus className="h-4 w-4 mr-1" /> Add system
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  toast({
                    title: "Failover simulation complete",
                    description: `${tested.length - breaches.length} of ${tested.length} systems recovered within target (simulated).`,
                  })
                }
              >
                Run failover simulation
              </Button>
            </div>
          </div>
          <Card>
            <CardContent className="pt-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>System</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>DR strategy</TableHead>
                    <TableHead>RTO (target / actual)</TableHead>
                    <TableHead>RPO (target / actual)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {systems.map((s) => {
                    const st = sysStatus(s);
                    const ok = (a: number | null, t: number) =>
                      a === null ? null : a <= t;
                    const mark = (v: boolean | null) =>
                      v === null ? null : v ? (
                        <CheckCircle2 className="inline h-3.5 w-3.5 text-success ml-1" />
                      ) : (
                        <XCircle className="inline h-3.5 w-3.5 text-destructive ml-1" />
                      );
                    return (
                      <TableRow
                        key={s.id}
                        className="cursor-pointer"
                        onClick={() =>
                          setDetail({
                            sub: `${s.tier} system`,
                            title: s.name,
                            status: st,
                            body: (
                              <>
                                <Row k="DR strategy" v={s.strategy} />
                                <Row k="RTO target" v={mins(s.rtoT)} />
                                <Row
                                  k="RTO actual (last test)"
                                  v={mins(s.rtoA)}
                                />
                                <Row k="RPO target" v={mins(s.rpoT)} />
                                <Row
                                  k="RPO actual (last test)"
                                  v={mins(s.rpoA)}
                                />
                                {st === "Breach" && (
                                  <p className="text-sm text-destructive mt-3">
                                    Recovery exceeded target — remediation
                                    required before the next test.
                                  </p>
                                )}
                                <div className="flex gap-2 mt-4">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setActualFor(s);
                                      setDetail(null);
                                    }}
                                  >
                                    Record actual RTO/RPO
                                  </Button>
                                </div>
                              </>
                            ),
                          })
                        }
                      >
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.tier}</TableCell>
                        <TableCell>{s.strategy}</TableCell>
                        <TableCell>
                          {mins(s.rtoT)} / {mins(s.rtoA)}
                          {mark(ok(s.rtoA, s.rtoT))}
                        </TableCell>
                        <TableCell>
                          {mins(s.rpoT)} / {mins(s.rpoA)}
                          {mark(ok(s.rpoA, s.rpoT))}
                        </TableCell>
                        <TableCell>
                          <Pill s={st} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {systems.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-sm text-muted-foreground py-8"
                      >
                        No systems added yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TESTING */}
        <TabsContent value="testing" className="mt-4">
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Test history</CardTitle>
                <Button size="sm" onClick={() => setDialog("test")}>
                  <Plus className="h-4 w-4 mr-1" /> Schedule / log test
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test</TableHead>
                      <TableHead>Scenario</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tests.map((t) => (
                      <TableRow
                        key={t.id}
                        className="cursor-pointer"
                        onClick={() =>
                          setDetail({
                            sub: t.code,
                            title: t.scenario,
                            status: t.result,
                            body: (
                              <>
                                <Row k="Type" v={t.type} />
                                <Row k="Date" v={fmtD(t.date)} />
                                <Row
                                  k="Score"
                                  v={t.score === null ? "—" : `${t.score}%`}
                                />
                                {t.notes && (
                                  <p className="text-sm mt-3 whitespace-pre-wrap">
                                    {t.notes}
                                  </p>
                                )}
                                {t.result === "Scheduled" && (
                                  <div className="flex gap-2 mt-4">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setCompleteFor(t);
                                        setDetail(null);
                                      }}
                                    >
                                      Mark test complete
                                    </Button>
                                  </div>
                                )}
                              </>
                            ),
                          })
                        }
                      >
                        <TableCell className="font-mono text-xs">
                          {t.code}
                        </TableCell>
                        <TableCell className="font-medium">
                          {t.scenario}
                        </TableCell>
                        <TableCell>{t.type}</TableCell>
                        <TableCell>{fmtD(t.date)}</TableCell>
                        <TableCell>
                          <Pill s={t.result} />
                        </TableCell>
                        <TableCell>
                          {t.score === null ? "—" : `${t.score}%`}
                        </TableCell>
                      </TableRow>
                    ))}
                    {tests.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-sm text-muted-foreground py-8"
                        >
                          No tests logged or scheduled yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">
                    Open findings from tests
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDialog("finding")}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add finding
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {openFindings.map((f) => (
                    <div key={f.id} className="border rounded-lg p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <Pill s={f.severity} />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          disabled={resolveFindingMut.isPending}
                          onClick={() => resolveFindingMut.mutate(f.id)}
                        >
                          Mark resolved
                        </Button>
                      </div>
                      <div className="text-sm font-medium mt-1">{f.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Owner: {f.owner || "—"}
                        {f.dueDate ? ` · Due ${fmtD(f.dueDate)}` : ""}
                      </div>
                    </div>
                  ))}
                  {openFindings.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No open findings from testing.
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Test score trend (by quarter)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {trend.length > 0 ? (
                    <>
                      <div className="flex items-end gap-3 h-32">
                        {trend.map((q) => (
                          <div
                            key={q.label}
                            className="flex-1 flex flex-col items-center justify-end h-full"
                          >
                            <div className="text-xs font-medium">
                              {q.value}%
                            </div>
                            <div
                              className="w-full bg-primary rounded-t"
                              style={{
                                height: `${Math.max(q.value - 50, 4)}%`,
                              }}
                            />
                            <div className="text-[10px] text-muted-foreground mt-1">
                              {q.label}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Score where tests were scored, otherwise pass rate, by
                        quarter of completion.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No completed tests yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* VENDORS */}
        <TabsContent value="vendors" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">
              Vendor &amp; Third-Party Resilience
            </h2>
            <Button size="sm" onClick={() => setDialog("vendor")}>
              <Plus className="h-4 w-4 mr-1" /> Assess vendor resilience
            </Button>
          </div>
          <div className="flex gap-3 border rounded-lg p-3 bg-primary/5 text-sm">
            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <b>This is not vendor management.</b> Onboarding, contracts and
              commercial contacts live in CRM. This tab only covers how badly it
              hurts if a vendor fails, whether they've proven they can recover,
              and whether there's a fallback.
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Kpi
              label="Vendors assessed"
              value={vendors.length}
              sub="Resilience profiles"
            />
            <Kpi
              label="Attestations received"
              value={`${received}/${vendors.length}`}
              sub="Continuity evidence"
            />
            <Kpi
              label="Single points of failure"
              value={spof.length}
              sub={spof[0]?.name ?? "None"}
              warn={spof.length > 0}
            />
            <Kpi
              label="Overdue reviews"
              value={overdueReviews.length}
              sub="Need follow-up"
              warn={overdueReviews.length > 0}
            />
          </div>
          <Card>
            <CardContent className="pt-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Criticality</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead>Continuity attestation</TableHead>
                    <TableHead>Alternate vendor</TableHead>
                    <TableHead>Last review</TableHead>
                    <TableHead>CRM record</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((v) => (
                    <TableRow
                      key={v.id}
                      className="cursor-pointer"
                      onClick={() =>
                        setDetail({
                          sub: "Vendor resilience",
                          title: v.name,
                          status: v.attestation,
                          body: (
                            <>
                              <Row k="Criticality" v={v.criticality} />
                              <Row k="SLA" v={v.sla} />
                              <Row
                                k="Alternate vendor identified?"
                                v={v.alternate}
                              />
                              <Row
                                k="Dependent processes"
                                v={
                                  v.dependentProcessIds
                                    .map(
                                      (id) =>
                                        processes.find((p) => p.id === id)
                                          ?.name,
                                    )
                                    .filter(Boolean)
                                    .join(", ") || "None"
                                }
                              />
                              <Row
                                k="Escalation contact"
                                v={v.escalationContact || "—"}
                              />
                              <Row k="Last review" v={v.lastReview} />
                              <Row
                                k="Next review due"
                                v={
                                  v.nextReview ? fmtD(v.nextReview) : "Not set"
                                }
                              />
                              {v.attestation !== "Received" && (
                                <div className="flex gap-2 mt-4">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={markAttestedMut.isPending}
                                    onClick={() => markAttestedMut.mutate(v.id)}
                                  >
                                    Mark attestation received
                                  </Button>
                                </div>
                              )}
                            </>
                          ),
                        })
                      }
                    >
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell>
                        <Pill s={v.criticality} />
                      </TableCell>
                      <TableCell>{v.sla}</TableCell>
                      <TableCell>
                        <Pill s={v.attestation} />
                      </TableCell>
                      <TableCell
                        className={
                          v.alternate === "No - single point of failure"
                            ? "text-destructive font-medium"
                            : ""
                        }
                      >
                        {v.alternate}
                      </TableCell>
                      <TableCell>{v.lastReview}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Link
                          to="/crm/vendors"
                          className="text-primary text-sm hover:underline"
                        >
                          View in CRM →
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                  {vendors.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-sm text-muted-foreground py-8"
                      >
                        No vendors assessed yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CRISIS */}
        <TabsContent value="crisis" className="space-y-4 mt-4">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <h2 className="font-semibold">
              Crisis Management &amp; Communications
            </h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingContact(null);
                  setDialog("contact");
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Add contact
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDialog("crisis")}
              >
                <Siren className="h-4 w-4 mr-1" /> Activate crisis protocol
              </Button>
            </div>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Escalation matrix</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-4 gap-3">
              {ESCALATION.map((e, i) => (
                <button
                  key={e.level}
                  onClick={() =>
                    setDetail({
                      sub: "Escalation",
                      title: e.level,
                      body: (
                        <>
                          <Row k="Trigger" v={e.trigger} />
                          <Row k="Owner" v={e.who} />
                          <Row k="Action" v={`${e.action} ${e.time}`} />
                        </>
                      ),
                    })
                  }
                  className={`text-left border rounded-lg p-3 hover:border-primary ${i >= 2 ? "border-destructive/40" : ""}`}
                >
                  <div className="font-semibold text-sm">{e.level}</div>
                  <div className="text-xs text-muted-foreground">
                    {e.trigger}
                  </div>
                  <div className="text-xs mt-2">
                    <b>{e.who}</b> {e.action} <b>{e.time}</b>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Crisis Management Team (CMT)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Primary</TableHead>
                      <TableHead>Backup</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiContacts.map((c) => (
                      <TableRow key={c._id}>
                        <TableCell className="font-medium">{c.role}</TableCell>
                        <TableCell>{c.primaryName || "—"}</TableCell>
                        <TableCell>{c.backupName || "—"}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => {
                              setEditingContact(c);
                              setDialog("contact");
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-destructive"
                            disabled={deleteContactMut.isPending}
                            onClick={() => deleteContactMut.mutate(c._id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {apiContacts.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-sm text-muted-foreground py-8"
                        >
                          No crisis management roles added yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Stakeholder notification order
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {NOTIFY.map(([w, h], i) => (
                  <div key={w} className="flex gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{w}</div>
                      <div className="text-xs text-muted-foreground">{h}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Pre-approved communication templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-3">
                {TEMPLATES.map(([t, d]) => (
                  <button
                    key={t}
                    onClick={() =>
                      setDetail({
                        sub: "Communication template",
                        title: t,
                        body: (
                          <>
                            <p className="text-sm">{d}</p>
                            <p className="text-xs text-muted-foreground mt-3">
                              Editing a published template sends it back through
                              Comms + Legal re-approval before it replaces the
                              live version.
                            </p>
                          </>
                        ),
                      })
                    }
                    className="text-left border rounded-lg p-3 hover:border-primary"
                  >
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <FileText className="h-4 w-4 text-primary" /> {t}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {d}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INCIDENTS */}
        <TabsContent value="incidents" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Incident Response</h2>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setDialog("incident")}
            >
              <Siren className="h-4 w-4 mr-1" /> Declare incident
            </Button>
          </div>
          {active.length === 0 ? (
            <div className="border border-success/40 bg-success/10 rounded-lg p-4 flex gap-3 items-center">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <div>
                <div className="font-semibold text-sm">
                  No active incidents — all clear
                </div>
                <div className="text-xs text-muted-foreground">
                  {incidents[0]
                    ? `Last incident (${incidents[0].code}) was declared ${fmtD(incidents[0].date)}.`
                    : "No incidents declared yet."}
                  {avgMttrHrs !== null &&
                    ` Mean time to resolution: ${avgMttrHrs.toFixed(1)} hours.`}
                </div>
              </div>
            </div>
          ) : (
            active.map((i) => (
              <div
                key={i.id}
                className="border border-destructive/40 bg-destructive/10 rounded-lg p-4 flex gap-3 items-center"
              >
                <Siren className="h-5 w-5 text-destructive" />
                <div className="flex-1">
                  <div className="font-semibold text-sm">
                    {i.code} — {i.description}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Declared {fmtD(i.date)} · Severity {i.severity}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={resolveMut.isPending}
                  onClick={() => resolveMut.mutate(i.id)}
                >
                  Mark resolved
                </Button>
              </div>
            ))
          )}
          <div className="grid md:grid-cols-3 gap-3">
            {PLAYBOOKS.map(([t, steps]) => (
              <button
                key={t}
                onClick={() =>
                  setDetail({
                    sub: "Response playbook",
                    title: t,
                    body: (
                      <ol className="list-decimal pl-5 text-sm space-y-1">
                        {steps.split(" → ").map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ol>
                    ),
                  })
                }
                className="text-left border rounded-lg p-3 hover:border-primary"
              >
                <div className="font-medium text-sm">{t}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {steps}
                </div>
              </button>
            ))}
          </div>
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Incident log</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>MTTR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incidents.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-mono text-xs">
                          {i.code}
                        </TableCell>
                        <TableCell>{fmtD(i.date)}</TableCell>
                        <TableCell>{i.description}</TableCell>
                        <TableCell>
                          <Pill s={i.severity} />
                        </TableCell>
                        <TableCell>
                          <Pill s={i.status} />
                        </TableCell>
                        <TableCell>{i.mttr}</TableCell>
                      </TableRow>
                    ))}
                    {incidents.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-sm text-muted-foreground py-8"
                        >
                          No incidents declared yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-3 content-start">
              <Kpi
                label="Incidents YTD"
                value={
                  incidents.filter(
                    (i) => new Date(i.date).getFullYear() === thisYear,
                  ).length
                }
                sub={`${thisYear}`}
              />
              <Kpi
                label="Active now"
                value={active.length}
                sub="Unresolved"
                warn={active.length > 0}
              />
              <Kpi
                label="Resolved"
                value={resolvedIncidents.length}
                sub="All time"
              />
              <Kpi
                label="Mean time to resolve"
                value={
                  avgMttrHrs !== null ? `${avgMttrHrs.toFixed(1)} hrs` : "—"
                }
                sub="Across resolved incidents"
              />
            </div>
          </div>
        </TabsContent>

        {/* REPORTING */}
        <TabsContent value="reporting" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Reporting</h2>
            <Button size="sm" onClick={() => setDialog("report")}>
              <Plus className="h-4 w-4 mr-1" /> Generate report
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Every report is assembled live from the other tabs — nothing is
            typed up separately.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Kpi
              label="Reports generated YTD"
              value={
                reports.filter(
                  (r) => new Date(r.generatedAt).getFullYear() === thisYear,
                ).length
              }
              sub="Across all types"
            />
            <Kpi
              label="Next scheduled report"
              value={recurringReports[0]?.name ?? "None set up"}
              sub={
                recurringReports[0]
                  ? `${recurringReports[0].schedule.replace("Recurring - ", "").replace(/^\w/, (c) => c.toUpperCase())} (planning only)`
                  : "No recurring reports yet"
              }
            />
            {(() => {
              const lastReg = [...reports]
                .filter((r) => r.type.toLowerCase().includes("regulator"))
                .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];
              return (
                <Kpi
                  label="Last regulator submission"
                  value={lastReg ? fmtD(lastReg.generatedAt) : "—"}
                  sub={lastReg ? "Most recent" : "None yet"}
                />
              );
            })()}
            {(() => {
              const total = vendors.length + plans.length;
              const approved = plans.filter(
                (p) => p.status === "Approved",
              ).length;
              const pct = total
                ? Math.round(((received + approved) / total) * 100)
                : 0;
              return (
                <Kpi
                  label="Audit pack readiness"
                  value={total ? `${pct}%` : "—"}
                  sub={`Missing: ${vendors.length - received} vendor attestation(s)`}
                />
              );
            })()}
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {REPORT_TYPES.map(([t, d]) => (
              <button
                key={t}
                onClick={() => printReport(t)}
                className="text-left border rounded-lg p-3 hover:border-primary"
              >
                <div className="font-medium text-sm">{t}</div>
                <div className="text-xs text-muted-foreground mt-1">{d}</div>
              </button>
            ))}
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Report library</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.type}</TableCell>
                      <TableCell>{r.period}</TableCell>
                      <TableCell className="text-xs">
                        {fmtD(r.generatedAt)}
                      </TableCell>
                      <TableCell className="text-xs">{r.recipients}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => printReport(r.name, r.sections)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {reports.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-sm text-muted-foreground py-8"
                      >
                        No reports generated yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Scheduled reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recurringReports.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 border rounded-lg p-3"
                >
                  <Badge variant="secondary">
                    {r.schedule
                      .replace("Recurring - ", "")
                      .replace(/^\w/, (c) => c.toUpperCase())}
                  </Badge>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Recipients: {r.recipients}
                    </div>
                  </div>
                </div>
              ))}
              {recurringReports.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No recurring reports set up yet. Choose "Recurring -
                  quarterly" or "Recurring - annually" when generating a report
                  to schedule it here.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Schedules are shown for planning only; reports are not sent
                automatically yet.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail drawer */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                  {detail.sub}
                </div>
                <SheetTitle>{detail.title}</SheetTitle>
                {detail.status && (
                  <div>
                    <Pill s={detail.status} />
                  </div>
                )}
              </SheetHeader>
              <div className="mt-4">{detail.body}</div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <BcpDialogs
        kind={dialog}
        onClose={() => {
          setDialog(null);
          setEditingContact(null);
        }}
        plans={plans}
        processes={processes}
        tests={tests}
        editingContact={editingContact}
        invalidate={(k) => qc.invalidateQueries({ queryKey: [k] })}
        printReport={printReport}
        goToIncidents={() => setTab("incidents")}
      />
      <RecordActualDialog
        system={actualFor}
        onClose={() => setActualFor(null)}
        pending={recordActualMut.isPending}
        onSave={(vars) =>
          actualFor && recordActualMut.mutate({ id: actualFor.id, ...vars })
        }
      />
      <CompleteTestDialog
        test={completeFor}
        onClose={() => setCompleteFor(null)}
        pending={completeTestMut.isPending}
        onSave={(vars) =>
          completeFor && completeTestMut.mutate({ id: completeFor.id, ...vars })
        }
      />
    </div>
  );
}

// ─── Record actual RTO/RPO dialog ───
function RecordActualDialog({
  system,
  onClose,
  onSave,
  pending,
}: {
  system: DrSystem | null;
  onClose: () => void;
  onSave: (vars: { rtoActualHours?: number; rpoActualHours?: number }) => void;
  pending: boolean;
}) {
  const [rto, setRto] = useState("");
  const [rpo, setRpo] = useState("");
  useEffect(() => {
    setRto(
      system?.rtoA !== null && system?.rtoA !== undefined
        ? String(system.rtoA / 60)
        : "",
    );
    setRpo(
      system?.rpoA !== null && system?.rpoA !== undefined
        ? String(system.rpoA / 60)
        : "",
    );
  }, [system]);
  return (
    <Dialog open={!!system} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        {system && (
          <>
            <DialogHeader>
              <DialogTitle>Record actual RTO/RPO — {system.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Actual RTO (hours)</Label>
                <Input
                  type="number"
                  value={rto}
                  onChange={(e) => setRto(e.target.value)}
                />
              </div>
              <div>
                <Label>Actual RPO (hours)</Label>
                <Input
                  type="number"
                  value={rpo}
                  onChange={(e) => setRpo(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                disabled={pending}
                onClick={() =>
                  onSave({
                    rtoActualHours: rto ? Number(rto) : undefined,
                    rpoActualHours: rpo ? Number(rpo) : undefined,
                  })
                }
              >
                Save
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Mark scheduled test complete dialog ───
function CompleteTestDialog({
  test,
  onClose,
  onSave,
  pending,
}: {
  test: TestRec | null;
  onClose: () => void;
  onSave: (vars: {
    outcome: BcpTestOutcome;
    score?: number;
    notes?: string;
  }) => void;
  pending: boolean;
}) {
  const [outcome, setOutcome] = useState<BcpTestOutcome>("Pass");
  const [score, setScore] = useState("");
  const [notes, setNotes] = useState("");
  useEffect(() => {
    setOutcome("Pass");
    setScore("");
    setNotes("");
  }, [test]);
  return (
    <Dialog open={!!test} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        {test && (
          <>
            <DialogHeader>
              <DialogTitle>Mark test complete — {test.scenario}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Outcome</Label>
                <Select
                  value={outcome}
                  onValueChange={(v) => setOutcome(v as BcpTestOutcome)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Pass", "Partial", "Fail"].map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Score (optional, 0–100)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                disabled={pending}
                onClick={() =>
                  onSave({
                    outcome,
                    score: score ? Number(score) : undefined,
                    notes,
                  })
                }
              >
                Save
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialogs ───
function BcpDialogs({
  kind,
  onClose,
  plans,
  processes,
  tests,
  editingContact,
  invalidate,
  printReport,
  goToIncidents,
}: {
  kind: string | null;
  onClose: () => void;
  plans: Plan[];
  processes: Process[];
  tests: TestRec[];
  editingContact: CrisisContact | null;
  invalidate: (k: string) => void;
  printReport: (title: string, sections?: string[]) => void;
  goToIncidents: () => void;
}) {
  const [f, setF] = useState<Record<string, string>>({});
  const set = (k: string) => (e: { target: { value: string } }) =>
    setF((p) => ({ ...p, [k]: e.target.value }));
  const sel = (k: string) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const close = () => {
    setF({});
    onClose();
  };
  const err = (e: any) =>
    toast({
      title: "Couldn't save",
      description: e?.response?.data?.message,
      variant: "destructive",
    });
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Reference data for the dropdowns in this round's dialogs — only fetched
  // once the dialog that needs it is actually open.
  const { data: teams = [] } = useQuery({
    queryKey: ["hr-teams-for-bcp"],
    queryFn: fetchTeams,
    enabled: kind === "process",
    retry: 1,
  });
  const { data: crmVendors = [] } = useQuery({
    queryKey: ["crm-vendors-for-bcp"],
    queryFn: fetchCrmVendors,
    enabled: kind === "vendor",
    retry: 1,
  });
  const { data: committees = [] } = useQuery({
    queryKey: ["committees-for-bcp"],
    queryFn: fetchCommittees,
    enabled: kind === "report",
    retry: 1,
  });
  const { data: employeesPage } = useQuery({
    queryKey: ["employees-for-bcp-contacts"],
    queryFn: () => fetchEmployees({ limit: 500 }),
    enabled: kind === "contact",
    retry: 1,
  });
  const employees: Employee[] = employeesPage?.items ?? [];

  // Pre-fill the contact dialog's form when editing an existing CMT
  // role — a fresh "Add contact" open (editingContact null) leaves
  // whatever the tenant is mid-typing alone.
  useEffect(() => {
    if (kind === "contact" && editingContact) {
      setF((p) => ({
        ...p,
        contactRole: CMT_ROLES.includes(editingContact.role)
          ? editingContact.role
          : "Other",
        contactRoleOther: CMT_ROLES.includes(editingContact.role)
          ? ""
          : editingContact.role,
        contactPrimary: editingContact.primaryEmployeeId ?? "none",
        contactBackup: editingContact.backupEmployeeId ?? "none",
      }));
    }
  }, [kind, editingContact]);

  // Comma-separated-string multi-select helpers, reused for vendor
  // dependent-processes, report recipients, report committees and
  // report sections — all live in the same flat `f` form state.
  const csvList = (k: string): string[] =>
    (f[k] ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  const toggleCsv = (k: string, id: string) =>
    setF((p) => {
      const cur = (p[k] ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      const next = cur.includes(id)
        ? cur.filter((x) => x !== id)
        : [...cur, id];
      return { ...p, [k]: next.join(",") };
    });
  const MultiToggle = ({
    k,
    options,
  }: {
    k: string;
    options: { id: string; label: string }[];
  }) => {
    const chosen = csvList(k);
    return (
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = chosen.includes(o.id);
          return (
            <button
              type="button"
              key={o.id}
              onClick={() => toggleCsv(k, o.id)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:border-primary"}`}
            >
              {o.label}
            </button>
          );
        })}
        {options.length === 0 && (
          <p className="text-xs text-muted-foreground">None available yet.</p>
        )}
      </div>
    );
  };

  const planMut = useMutation({
    mutationFn: () =>
      createBcpPlan({
        title: f.title,
        content: f.content || "",
        scope: f.scope === "Other" ? f.scopeOther || "" : f.scope || "",
        phase: f.phase ? LIFECYCLE.indexOf(f.phase) : 0,
        reviewCycle: (f.reviewCycle as ReviewCycle) || undefined,
      }),
    onSuccess: () => {
      invalidate("grc-bcp-plans");
      toast({ title: "Plan created — status starts as Draft" });
      close();
    },
    onError: err,
  });
  const testMut = useMutation({
    mutationFn: () =>
      logBcpTest({
        scenario: f.scenario,
        planId: f.planId && f.planId !== "none" ? f.planId : undefined,
        testType: (f.type || "Tabletop") as BcpTestType,
        ...(f.mode === "Schedule"
          ? { scheduledFor: f.date }
          : {
              outcome: (f.outcome || "Pass") as BcpTestOutcome,
              score: f.score ? Number(f.score) : undefined,
              notes: f.notes || "",
            }),
      }),
    onSuccess: () => {
      invalidate("grc-bcp-tests");
      toast({
        title: f.mode === "Schedule" ? "Test scheduled" : "Test logged",
      });
      close();
    },
    onError: err,
  });
  const sysMut = useMutation({
    mutationFn: () =>
      createRtoRpo({
        system: f.system,
        rtoHours: Number(f.rto || 1),
        rpoHours: Number(f.rpo || 1),
        criticality: (f.tier || "Tier 2") as SystemCriticality,
        strategy: f.strategy || "",
      }),
    onSuccess: () => {
      invalidate("grc-bcp-rto");
      toast({ title: "System added" });
      close();
    },
    onError: err,
  });
  const contactRoleValue = () =>
    f.contactRole === "Other" ? f.contactRoleOther || "" : f.contactRole || "";
  const contactMut = useMutation({
    mutationFn: () =>
      createCrisisContact({
        role: contactRoleValue(),
        primaryEmployeeId:
          f.contactPrimary && f.contactPrimary !== "none"
            ? f.contactPrimary
            : undefined,
        backupEmployeeId:
          f.contactBackup && f.contactBackup !== "none"
            ? f.contactBackup
            : undefined,
      }),
    onSuccess: () => {
      invalidate("grc-bcp-contacts");
      toast({ title: "Added to crisis management team" });
      close();
    },
    onError: err,
  });
  const updateContactMut = useMutation({
    mutationFn: () =>
      updateCrisisContact(editingContact!._id, {
        role: contactRoleValue(),
        primaryEmployeeId:
          f.contactPrimary && f.contactPrimary !== "none"
            ? f.contactPrimary
            : "",
        backupEmployeeId:
          f.contactBackup && f.contactBackup !== "none" ? f.contactBackup : "",
      }),
    onSuccess: () => {
      invalidate("grc-bcp-contacts");
      toast({ title: "Crisis management role updated" });
      close();
    },
    onError: err,
  });
  const processMut = useMutation({
    mutationFn: () =>
      createBiaProcess({
        name: f.name,
        departmentId:
          f.departmentId && f.departmentId !== "none"
            ? f.departmentId
            : undefined,
        owner: f.owner || "",
        criticality: (f.crit || "High") as Severity,
        mtd: f.mtd || "24 hours",
        impactPerDay: Number(f.impact || 0),
        nonFinancialImpact: f.nonFinancialImpact || "",
        dependencies: (f.deps || "")
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean),
        linkedPlanId:
          f.linkedPlanId && f.linkedPlanId !== "none"
            ? f.linkedPlanId
            : undefined,
      }),
    onSuccess: () => {
      invalidate("grc-bcp-processes");
      toast({ title: "Process added to BIA" });
      close();
    },
    onError: err,
  });
  const vendorMut = useMutation({
    mutationFn: () =>
      createVendorResilience({
        crmVendorId: f.crmVendorId,
        criticality: (f.crit || "High") as Severity,
        sla: f.sla || "",
        attestation: (f.att || "Not yet requested") as AttestationStatus,
        alternate: (f.alt ||
          "No - single point of failure") as AlternateVendorStatus,
        dependentProcessIds: csvList("vendorDeps"),
        escalationContact: f.escalationContact || "",
        nextReviewDate: f.nextReview || undefined,
      }),
    onSuccess: () => {
      invalidate("grc-bcp-vendors");
      toast({ title: "Vendor assessed" });
      close();
    },
    onError: err,
  });
  const findingMut = useMutation({
    mutationFn: () =>
      createBcpFinding({
        testId: f.findingTestId,
        severity: (f.findingSev || "Medium") as Severity,
        title: f.findingTitle,
        owner: f.findingOwner || "",
        dueDate: f.findingDue || undefined,
      }),
    onSuccess: () => {
      invalidate("grc-bcp-findings");
      toast({ title: "Finding added" });
      close();
    },
    onError: err,
  });
  const incidentMut = useMutation({
    mutationFn: (vars: {
      description: string;
      severity: BcpIncidentSeverity;
    }) => declareBcpIncident(vars),
    onSuccess: (data) => {
      invalidate("grc-bcp-incidents");
      toast({
        title: `${data.code} declared`,
        description: "Follow the escalation matrix for this severity.",
      });
      goToIncidents();
      close();
    },
    onError: err,
  });
  const reportMut = useMutation({
    mutationFn: () => {
      const type = f.type || REPORT_TYPES[0][0];
      const recipCats = csvList("recipCats");
      let recipients = recipCats.length ? recipCats.join(", ") : "Internal";
      if (recipCats.includes("Committee")) {
        const chosen = csvList("committees")
          .map((id) => committees.find((c) => c._id === id)?.name)
          .filter(Boolean);
        recipients = recipients.replace(
          "Committee",
          chosen.length ? chosen.join(" & ") : "Committee",
        );
      }
      let period = f.period || "This quarter";
      if (period === "Custom range" && f.fromDate && f.toDate)
        period = `Custom range: ${fmtD(f.fromDate)} – ${fmtD(f.toDate)}`;
      const name =
        type === "Custom"
          ? f.customName || `Custom report — ${today}`
          : `${type} — ${today}`;
      return createBcpReport({
        name,
        type,
        period,
        recipients,
        sections: csvList("sections"),
        schedule: f.schedule || "Generate once - now",
        format: f.format || "PDF",
      });
    },
    onSuccess: (data) => {
      invalidate("grc-bcp-reports");
      printReport(data.name, data.sections);
      close();
    },
    onError: err,
  });

  const Field = ({
    k,
    label,
    type = "text",
    ...rest
  }: {
    k: string;
    label: string;
    type?: string;
    placeholder?: string;
  }) => (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={f[k] ?? ""} onChange={set(k)} {...rest} />
    </div>
  );
  const Pick = ({
    k,
    label,
    opts,
  }: {
    k: string;
    label: string;
    opts: string[];
  }) => (
    <div>
      <Label>{label}</Label>
      <Select value={f[k] ?? opts[0]} onValueChange={sel(k)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opts.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const content: Record<
    string,
    { title: string; body: ReactNode; ok: () => void; can: boolean }
  > = {
    process: {
      title: "Add business process",
      can: !!f.name,
      ok: () => processMut.mutate(),
      body: (
        <>
          {Field({ k: "name", label: "Business process name" })}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Department</Label>
              <Select
                value={f.departmentId ?? ""}
                onValueChange={(v) => {
                  const team = teams.find((t) => t._id === v);
                  setF((p) => ({
                    ...p,
                    departmentId: v,
                    owner: team?.headOfDepartment
                      ? `${team.headOfDepartment.firstName} ${team.headOfDepartment.lastName}`
                      : p.owner,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.name}
                    </SelectItem>
                  ))}
                  {teams.length === 0 && (
                    <SelectItem value="none" disabled>
                      No HR teams set up yet
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {Field({ k: "owner", label: "Process owner" })}
            {Pick({
              k: "crit",
              label: "Criticality",
              opts: ["High", "Critical", "Medium", "Low"],
            })}
            {Field({
              k: "mtd",
              label: "Max tolerable downtime",
              placeholder: "e.g. 4 hours",
            })}
            {Field({
              k: "impact",
              label: "Financial impact / day ($)",
              type: "number",
            })}
            {Field({ k: "deps", label: "Dependencies (comma separated)" })}
          </div>
          <div>
            <Label>Non-financial impact</Label>
            <Textarea
              rows={2}
              placeholder="e.g. Reputational damage, regulatory breach, staff safety..."
              value={f.nonFinancialImpact ?? ""}
              onChange={set("nonFinancialImpact")}
            />
          </div>
          <div>
            <Label>Linked continuity plan</Label>
            <Select
              value={f.linkedPlanId ?? "none"}
              onValueChange={sel("linkedPlanId")}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code}: {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      ),
    },
    plan: {
      title: "New continuity plan",
      can:
        !!f.title &&
        !!f.content &&
        !!f.scope &&
        (f.scope !== "Other" || !!f.scopeOther),
      ok: () => planMut.mutate(),
      body: (
        <>
          {Field({ k: "title", label: "Plan title" })}
          <div>
            <Label>Scope</Label>
            <Select value={f.scope ?? ""} onValueChange={sel("scope")}>
              <SelectTrigger>
                <SelectValue placeholder="Select a scope" />
              </SelectTrigger>
              <SelectContent>
                {PLAN_SCOPES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {f.scope === "Other" &&
            Field({ k: "scopeOther", label: "Custom scope" })}
          <div>
            <Label>Key procedures</Label>
            <Textarea
              rows={4}
              value={f.content ?? ""}
              onChange={set("content")}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Pick({ k: "phase", label: "Lifecycle stage", opts: LIFECYCLE })}
            <div>
              <Label>Review cycle</Label>
              <Select
                value={f.reviewCycle ?? ""}
                onValueChange={sel("reviewCycle")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a cycle" />
                </SelectTrigger>
                <SelectContent>
                  {REVIEW_CYCLES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            New plans start as <b>Draft</b> — status is system-managed from
            here.
          </p>
        </>
      ),
    },
    test: {
      title: "Schedule or log a test",
      can: !!f.scenario && (f.mode === "Schedule" ? !!f.date : true),
      ok: () => testMut.mutate(),
      body: (
        <>
          {Pick({
            k: "mode",
            label: "What would you like to do?",
            opts: ["Log a completed test", "Schedule"],
          })}
          {Field({ k: "scenario", label: "Scenario" })}
          <div className="grid grid-cols-2 gap-3">
            {Pick({
              k: "type",
              label: "Type",
              opts: ["Tabletop", "Walkthrough", "Component", "Full DR"],
            })}
            <div>
              <Label>Plan tested (optional)</Label>
              <Select value={f.planId ?? "none"} onValueChange={sel("planId")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None — ad-hoc test</SelectItem>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code}: {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {f.mode === "Schedule" ? (
            Field({ k: "date", label: "Date", type: "date" })
          ) : (
            <>
              {Pick({
                k: "outcome",
                label: "Outcome",
                opts: ["Pass", "Partial", "Fail"],
              })}
              {Field({
                k: "score",
                label: "Score (optional, 0–100)",
                type: "number",
              })}
              <div>
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={f.notes ?? ""}
                  onChange={set("notes")}
                />
              </div>
            </>
          )}
        </>
      ),
    },
    system: {
      title: "Add system recovery target",
      can: !!f.system,
      ok: () => sysMut.mutate(),
      body: (
        <>
          {Field({ k: "system", label: "System" })}
          <div className="grid grid-cols-2 gap-3">
            {Pick({
              k: "tier",
              label: "Tier",
              opts: ["Tier 2", "Tier 1", "Tier 3"],
            })}
            {Field({
              k: "strategy",
              label: "DR strategy",
              placeholder: "e.g. Warm Standby",
            })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Field({ k: "rto", label: "RTO target (hours)", type: "number" })}
            {Field({ k: "rpo", label: "RPO target (hours)", type: "number" })}
          </div>
        </>
      ),
    },
    vendor: {
      title: "Assess vendor resilience",
      can: !!f.crmVendorId,
      ok: () => vendorMut.mutate(),
      body: (
        <>
          <div>
            <Label>Vendor (from CRM)</Label>
            <Select
              value={f.crmVendorId ?? ""}
              onValueChange={sel("crmVendorId")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a vendor" />
              </SelectTrigger>
              <SelectContent>
                {crmVendors.map((v) => (
                  <SelectItem key={v._id} value={v._id}>
                    {v.tradingName || v.legalName}
                  </SelectItem>
                ))}
                {crmVendors.length === 0 && (
                  <SelectItem value="none" disabled>
                    No vendors in CRM yet
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Onboarding, contracts and the commercial contact live in CRM —
              manage vendors there.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Pick({
              k: "crit",
              label: "Criticality to business continuity",
              opts: ["High", "Critical", "Medium", "Low"],
            })}
            {Field({
              k: "sla",
              label: "SLA commitment",
              placeholder: "e.g. 99.5% uptime",
            })}
          </div>
          <div>
            <Label>Which processes/systems depend on this vendor?</Label>
            <MultiToggle
              k="vendorDeps"
              options={processes.map((p) => ({ id: p.id, label: p.name }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Pick({
              k: "att",
              label: "Continuity attestation status",
              opts: ["Not yet requested", "Requested - pending", "Received"],
            })}
            {Pick({
              k: "alt",
              label: "Alternate vendor identified?",
              opts: [
                "No - single point of failure",
                "Yes - evaluated but not contracted",
                "Yes - contracted and ready",
                "Not applicable",
              ],
            })}
          </div>
          {Field({
            k: "escalationContact",
            label: "Escalation contact for continuity incidents",
            placeholder: "May differ from the CRM commercial contact",
          })}
          {Field({ k: "nextReview", label: "Next review due", type: "date" })}
        </>
      ),
    },
    finding: {
      title: "Add test finding",
      can: !!f.findingTestId && !!f.findingTitle,
      ok: () => findingMut.mutate(),
      body: (
        <>
          <div>
            <Label>Which test?</Label>
            <Select
              value={f.findingTestId ?? ""}
              onValueChange={sel("findingTestId")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a test" />
              </SelectTrigger>
              <SelectContent>
                {tests.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.code}: {t.scenario}
                  </SelectItem>
                ))}
                {tests.length === 0 && (
                  <SelectItem value="none" disabled>
                    No tests logged yet
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Finding</Label>
            <Input
              value={f.findingTitle ?? ""}
              onChange={set("findingTitle")}
              placeholder="e.g. VPN latency exceeded threshold on last walkthrough"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Pick({
              k: "findingSev",
              label: "Severity",
              opts: ["Medium", "Critical", "High", "Low"],
            })}
            {Field({ k: "findingOwner", label: "Owner" })}
          </div>
          {Field({ k: "findingDue", label: "Due date", type: "date" })}
        </>
      ),
    },
    contact: {
      title: editingContact
        ? "Edit crisis management role"
        : "Add crisis management role",
      can: !!contactRoleValue(),
      ok: () =>
        editingContact ? updateContactMut.mutate() : contactMut.mutate(),
      body: (
        <>
          <div>
            <Label>Role</Label>
            <Select
              value={f.contactRole ?? ""}
              onValueChange={sel("contactRole")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {CMT_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {f.contactRole === "Other" &&
            Field({ k: "contactRoleOther", label: "Custom role name" })}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Primary</Label>
              <Select
                value={f.contactPrimary ?? "none"}
                onValueChange={sel("contactPrimary")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e._id} value={e._id}>
                      {e.firstName} {e.lastName}
                      {e.jobTitle ? ` — ${e.jobTitle}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Backup</Label>
              <Select
                value={f.contactBackup ?? "none"}
                onValueChange={sel("contactBackup")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e._id} value={e._id}>
                      {e.firstName} {e.lastName}
                      {e.jobTitle ? ` — ${e.jobTitle}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      ),
    },
    incident: {
      title: "Declare incident",
      can: !!f.description,
      ok: () =>
        incidentMut.mutate({
          description: f.description,
          severity: (f.sev || "L2") as BcpIncidentSeverity,
        }),
      body: (
        <>
          <div>
            <Label>What happened?</Label>
            <Textarea
              rows={3}
              value={f.description ?? ""}
              onChange={set("description")}
            />
          </div>
          {Pick({
            k: "sev",
            label: "Severity",
            opts: ["L2", "L1", "L3", "L4"],
          })}
        </>
      ),
    },
    crisis: {
      title: "Activate crisis protocol",
      can: !!f.description,
      ok: () =>
        incidentMut.mutate({
          description: `Crisis: ${f.description}`,
          severity: "L3",
        }),
      body: (
        <>
          <p className="text-sm text-muted-foreground">
            This records a Level 3 incident and opens the response view. Notify
            the Crisis Management Team using the notification order.
          </p>
          <div>
            <Label>Situation summary</Label>
            <Textarea
              rows={3}
              value={f.description ?? ""}
              onChange={set("description")}
            />
          </div>
        </>
      ),
    },
    report: {
      title: "Generate report",
      can: true,
      ok: () => reportMut.mutate(),
      body: (
        <>
          {Pick({
            k: "type",
            label: "Report type",
            opts: [...REPORT_TYPES.map((r) => r[0]), "Custom"],
          })}
          {f.type === "Custom" &&
            Field({ k: "customName", label: "Custom report name" })}
          {Pick({
            k: "period",
            label: "Reporting period",
            opts: ["This quarter", "This year", "Custom range", "Single item"],
          })}
          {f.period === "Custom range" && (
            <div className="grid grid-cols-2 gap-3">
              {Field({ k: "fromDate", label: "From", type: "date" })}
              {Field({ k: "toDate", label: "To", type: "date" })}
            </div>
          )}
          <div>
            <Label>Recipients</Label>
            <MultiToggle
              k="recipCats"
              options={[
                { id: "Board", label: "Board" },
                { id: "Committee", label: "Committee" },
                {
                  id: "Organization",
                  label: "Organization (all staff, Board)",
                },
              ]}
            />
          </div>
          {csvList("recipCats").includes("Committee") && (
            <div>
              <Label>Which committee(s)?</Label>
              <MultiToggle
                k="committees"
                options={committees.map((c) => ({ id: c._id, label: c.name }))}
              />
            </div>
          )}
          <div>
            <Label>Sections to include</Label>
            <p className="text-xs text-muted-foreground mb-1">
              Pulled live from these tabs — nothing is retyped.
            </p>
            <MultiToggle
              k="sections"
              options={SECTION_KEYS.map((k) => ({
                id: k,
                label: SECTION_LABELS[k],
              }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Pick({
              k: "schedule",
              label: "Schedule",
              opts: [
                "Generate once - now",
                "Recurring - quarterly",
                "Recurring - annually",
              ],
            })}
            {Pick({ k: "format", label: "Format", opts: ["PDF"] })}
          </div>
        </>
      ),
    },
  };
  const c = kind ? content[kind] : null;
  const pending =
    planMut.isPending ||
    testMut.isPending ||
    sysMut.isPending ||
    contactMut.isPending ||
    updateContactMut.isPending ||
    processMut.isPending ||
    vendorMut.isPending ||
    findingMut.isPending ||
    incidentMut.isPending ||
    reportMut.isPending;
  return (
    <Dialog open={!!c} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-lg">
        {c && (
          <>
            <DialogHeader>
              <DialogTitle>{c.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">{c.body}</div>
            <DialogFooter>
              <Button variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button onClick={c.ok} disabled={!c.can || pending}>
                Save
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
