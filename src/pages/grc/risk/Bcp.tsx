import { useMemo, useState, type ReactNode } from "react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  Cloud,
  Download,
  FileText,
  Info,
  Plus,
  Server,
  Siren,
  XCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchBcpPlans,
  createBcpPlan,
  fetchBcpTests,
  logBcpTest,
  fetchRtoRpo,
  createRtoRpo,
  fetchCrisisContacts,
  createCrisisContact,
  type BcpTestOutcome,
  type SystemCriticality,
} from "@/lib/grc/risk-api";
import { usePersistentState, uid } from "@/lib/grc/usePersistentState";

// ─── Types & demo data (API covers plans, tests, RTO/RPO, contacts) ───
type Crit = "Critical" | "High" | "Medium" | "Low";
interface Process {
  id: string;
  name: string;
  dept: string;
  owner: string;
  criticality: Crit;
  mtd: string;
  impactPerDay: number;
  deps: string[];
}
interface Plan {
  id: string;
  code: string;
  title: string;
  scope: string;
  version: string;
  owner: string;
  review: string;
  status: "Approved" | "Under review" | "Draft";
  phase: number; // 0..6 of lifecycle
  fromApi?: boolean;
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
  fromApi?: boolean;
}
interface TestRec {
  id: string;
  code: string;
  scenario: string;
  type: string;
  date: string;
  result: "Passed" | "Partial" | "Failed" | "Scheduled";
  score: number | null;
  notes?: string;
}
interface Vendor {
  id: string;
  name: string;
  criticality: Crit;
  sla: string;
  attestation: "Received" | "Pending" | "Overdue";
  alternate: string;
  lastReview: string;
}
interface Incident {
  id: string;
  code: string;
  date: string;
  description: string;
  severity: "L1" | "L2" | "L3" | "L4";
  status: "Active" | "Resolved";
  mttr: string;
}
interface Report {
  id: string;
  name: string;
  type: string;
  period: string;
  generated: string;
  recipients: string;
  status: "Delivered" | "Submitted" | "Draft";
}

const PROCESSES: Process[] = [
  { id: "p1", name: "Client Onboarding (KYC/AML)", dept: "Compliance", owner: "J. Mugabo", criticality: "Critical", mtd: "4 hours", impactPerDay: 18500, deps: ["Core Banking", "ID Verify API"] },
  { id: "p2", name: "Fund Administration", dept: "Operations", owner: "E. Mutoni", criticality: "Critical", mtd: "8 hours", impactPerDay: 15200, deps: ["NAV Engine", "Custodian Link"] },
  { id: "p3", name: "Payment Processing", dept: "Finance", owner: "D. Kamanzi", criticality: "Critical", mtd: "2 hours", impactPerDay: 21000, deps: ["Core Banking", "SWIFT"] },
  { id: "p4", name: "Regulatory Reporting", dept: "Compliance", owner: "R. Sibanda", criticality: "High", mtd: "24 hours", impactPerDay: 6500, deps: ["Data Warehouse"] },
  { id: "p5", name: "Email & Communications", dept: "IT", owner: "A. Niyonzima", criticality: "High", mtd: "4 hours", impactPerDay: 4200, deps: ["M365"] },
  { id: "p6", name: "Client Reporting", dept: "Operations", owner: "E. Mutoni", criticality: "High", mtd: "24 hours", impactPerDay: 4800, deps: ["Data Warehouse"] },
  { id: "p7", name: "Board & Governance Portal", dept: "Corporate Sec.", owner: "R. Sibanda", criticality: "Medium", mtd: "48 hours", impactPerDay: 900, deps: ["GRC Platform"] },
  { id: "p8", name: "HR & Payroll", dept: "HR", owner: "F. Ishimwe", criticality: "Medium", mtd: "72 hours", impactPerDay: 700, deps: [] },
];
const PLANS: Plan[] = [
  { id: "bcp1", code: "BCP-001", title: "Core Operations Recovery", scope: "Client onboarding, fund admin, payment processing", version: "v3.1", owner: "J. Mugabo", review: "15 Feb 2027", status: "Approved", phase: 6 },
  { id: "bcp2", code: "BCP-002", title: "IT Infrastructure & Cybersecurity", scope: "Data centre, network, cybersecurity containment", version: "v2.4", owner: "A. Niyonzima", review: "1 Mar 2027", status: "Approved", phase: 6 },
  { id: "bcp3", code: "BCP-003", title: "Regulatory & Compliance Continuity", scope: "Regulatory reporting, AML obligations, licensing", version: "v1.2", owner: "R. Sibanda", review: "20 Jan 2027", status: "Approved", phase: 6 },
  { id: "bcp4", code: "BCP-004", title: "Workplace & Personnel Recovery", scope: "Office unavailability, pandemic, key person absence", version: "v2.0", owner: "F. Ishimwe", review: "Review pending", status: "Under review", phase: 3 },
];
const LIFECYCLE = ["BIA", "Draft plan", "Stakeholder review", "Board approval", "Implementation & training", "Test & validate", "Annual review"];
const SYSTEMS: DrSystem[] = [
  { id: "s1", name: "Core Banking Platform", tier: "Tier 1", strategy: "Hot Standby", rtoT: 15, rtoA: 12, rpoT: 0, rpoA: 0 },
  { id: "s2", name: "Payment Gateway", tier: "Tier 1", strategy: "Hot Standby", rtoT: 30, rtoA: 22, rpoT: 0, rpoA: 0 },
  { id: "s3", name: "AML Screening", tier: "Tier 1", strategy: "Hot Standby", rtoT: 30, rtoA: 25, rpoT: 5, rpoA: 4 },
  { id: "s4", name: "VPN / Remote Access", tier: "Tier 1", strategy: "Active-Active", rtoT: 2, rtoA: 1, rpoT: 0, rpoA: 0 },
  { id: "s5", name: "GRC Platform", tier: "Tier 2", strategy: "Warm Standby", rtoT: 60, rtoA: 48, rpoT: 15, rpoA: 12 },
  { id: "s6", name: "NAV Engine", tier: "Tier 2", strategy: "Warm Standby", rtoT: 120, rtoA: 105, rpoT: 30, rpoA: 28 },
  { id: "s7", name: "Email (M365)", tier: "Tier 2", strategy: "Cloud-native HA", rtoT: 5, rtoA: 3, rpoT: 0, rpoA: 0 },
  { id: "s8", name: "Data Warehouse", tier: "Tier 2", strategy: "Warm Standby", rtoT: 120, rtoA: 135, rpoT: 30, rpoA: 25 },
  { id: "s9", name: "Document Management", tier: "Tier 3", strategy: "Cold Standby", rtoT: 240, rtoA: 310, rpoT: 60, rpoA: 55 },
  { id: "s10", name: "CRM", tier: "Tier 3", strategy: "Warm Standby", rtoT: 240, rtoA: 200, rpoT: 60, rpoA: 45 },
  { id: "s11", name: "HRIS / Payroll", tier: "Tier 3", strategy: "Warm Standby", rtoT: 480, rtoA: 390, rpoT: 240, rpoA: 225 },
  { id: "s12", name: "Board Portal", tier: "Tier 3", strategy: "Warm Standby", rtoT: 480, rtoA: 255, rpoT: 120, rpoA: 90 },
];
const TESTS: TestRec[] = [
  { id: "t1", code: "TST-001", scenario: "Full site failover to cloud DR", type: "Full DR", date: "2026-09-06", result: "Passed", score: 92 },
  { id: "t2", code: "TST-002", scenario: "Ransomware incident response", type: "Tabletop", date: "2026-08-22", result: "Passed", score: 88 },
  { id: "t3", code: "TST-003", scenario: "Payment gateway failover", type: "Component", date: "2026-07-10", result: "Passed", score: 95 },
  { id: "t4", code: "TST-004", scenario: "Office evacuation & remote work activation", type: "Walkthrough", date: "2026-06-15", result: "Partial", score: 72 },
  { id: "t5", code: "TST-005", scenario: "Data backup restoration", type: "Component", date: "2026-05-28", result: "Passed", score: 90 },
  { id: "t6", code: "TST-006", scenario: "Crisis communication cascade", type: "Tabletop", date: "2026-04-12", result: "Passed", score: 85 },
  { id: "t7", code: "TST-007", scenario: "Cyber breach & regulator notification", type: "Full DR", date: "2026-10-18", result: "Scheduled", score: null },
  { id: "t8", code: "TST-008", scenario: "Year-end full DR exercise", type: "Full DR", date: "2026-12-12", result: "Scheduled", score: null },
];
const FINDINGS = [
  { sev: "Medium", title: "TST-004: VPN latency exceeded threshold", owner: "A. Niyonzima", due: "30 Oct 2026" },
  { sev: "Medium", title: "TST-004: Staff rally point awareness poor (38%)", owner: "F. Ishimwe", due: "15 Nov 2026" },
  { sev: "Low", title: "TST-002: Ransomware playbook missing legal step", owner: "J. Mugabo", due: "1 Nov 2026" },
];
const VENDORS: Vendor[] = [
  { id: "v1", name: "Core Banking Software Vendor", criticality: "Critical", sla: "99.9%", attestation: "Received", alternate: "None identified", lastReview: "15 Mar 2026" },
  { id: "v2", name: "Cloud Hosting Provider (DR site)", criticality: "Critical", sla: "99.95%", attestation: "Received", alternate: "Evaluated only", lastReview: "1 Jun 2026" },
  { id: "v3", name: "SWIFT Service Bureau", criticality: "Critical", sla: "Network standard", attestation: "Received", alternate: "N/A", lastReview: "10 Jul 2026" },
  { id: "v4", name: "Custodian (fund administration)", criticality: "Critical", sla: "Per custody agreement", attestation: "Received", alternate: "Dual custodian in place", lastReview: "20 Feb 2026" },
  { id: "v5", name: "ID Verification API provider", criticality: "High", sla: "99.5%", attestation: "Overdue", alternate: "Backup contracted", lastReview: "Overdue" },
  { id: "v6", name: "Microsoft 365", criticality: "High", sla: "99.9%", attestation: "Received", alternate: "Accepted risk", lastReview: "1 Sep 2026" },
];
const ESCALATION = [
  { level: "Level 1 — Operational", trigger: "Minor disruption, < 1 hour", who: "IT Lead", action: "notifies Dept. Manager within", time: "15 min" },
  { level: "Level 2 — Significant", trigger: "Service degradation, 1–4 hours", who: "Dept. Manager", action: "escalates to Crisis Team within", time: "30 min" },
  { level: "Level 3 — Critical", trigger: "Major outage, > 4 hours", who: "Crisis Team Lead", action: "convenes CMT within", time: "1 hour" },
  { level: "Level 4 — Catastrophic", trigger: "Existential threat, regulator/media", who: "Managing Partner + Board Chair", action: "notified within", time: "30 min" },
];
const CMT = [
  ["Crisis Commander", "R. Sibanda", "J. Mugabo"],
  ["IT Recovery Lead", "A. Niyonzima", "P. Habimana"],
  ["Compliance Lead", "J. Mugabo", "M. Uwase"],
  ["Comms & Media", "F. Ishimwe", "D. Kamanzi"],
  ["Operations Lead", "E. Mutoni", "S. Ndayisaba"],
  ["Legal Counsel", "K&L Associates", "—"],
];
const NOTIFY = [
  ["Internal Crisis Team", "Within 15 min · WhatsApp group + phone tree"],
  ["Board Chair & Audit Committee", "Within 1 hour · Secure email + call"],
  ["The Regulator", "Within 24 hours for data breaches · Formal letter + portal"],
  ["Affected clients", "Within 48 hours · Personalised email from Managing Partner"],
  ["Media / public (if required)", "As needed · Prepared statement, single spokesperson"],
  ["Insurance provider", "Within 72 hours · Formal claim notification"],
];
const TEMPLATES = [
  ["System Outage Notice", "For clients — scheduled/unscheduled downtime", "15 Aug 2026"],
  ["Data Breach Notification", "Regulatory + client — per Data Protection Law", "1 Sep 2026"],
  ["Regulator Incident Report", "Formal regulatory notification template", "20 Jul 2026"],
  ["Media Holding Statement", "Generic press response for active incidents", "12 Jun 2026"],
  ["Staff All-Hands Alert", "Internal broadcast for business-wide incidents", "15 Jun 2026"],
  ["Post-Incident Review", "Lessons-learned report template", "22 Aug 2026"],
];
const PLAYBOOKS = [
  ["Ransomware / Malware", "Tested", "Isolate → contain → eradicate → recover → notify"],
  ["DDoS Attack", "Tested", "Detect → mitigate → failover → restore"],
  ["Data Breach", "Tested", "Identify → contain → assess → notify → remediate"],
  ["Physical / Natural Disaster", "Needs update", "Evacuate → account → activate alternate → communicate"],
  ["Power / Infrastructure Failure", "Tested", "UPS → generator → cloud failover → staff notification"],
  ["Key Person Unavailability", "Tested", "Activate deputy → redistribute → communicate"],
];
const INCIDENTS: Incident[] = [
  { id: "i8", code: "INC-008", date: "18 Aug 2026", description: "Payment gateway timeout during peak", severity: "L2", status: "Resolved", mttr: "1.5 hrs" },
  { id: "i7", code: "INC-007", date: "3 Jul 2026", description: "Phishing attempt on finance team", severity: "L2", status: "Resolved", mttr: "0.5 hrs" },
  { id: "i6", code: "INC-006", date: "15 Jun 2026", description: "Scheduled power outage — extended", severity: "L1", status: "Resolved", mttr: "4 hrs" },
  { id: "i5", code: "INC-005", date: "22 May 2026", description: "Regulator portal connectivity loss", severity: "L1", status: "Resolved", mttr: "2 hrs" },
  { id: "i4", code: "INC-004", date: "10 Apr 2026", description: "SSL certificate expiry — client portal", severity: "L2", status: "Resolved", mttr: "0.3 hrs" },
];
const REPORT_TYPES = [
  ["Board & Executive Summary", "Overview KPIs, needs-attention items, test trend, vendor risk flags — one page for the board pack."],
  ["Regulator Compliance Report", "Continuity plan status, RTO/RPO compliance, test results, incident summary — formatted for submission."],
  ["Annual BCM Programme Report", "Full-year view: BIA coverage, all plans, every test, every incident, vendor resilience."],
  ["Test After-Action Report", "Single test: scenario, participants, score, findings, and remediation owners."],
  ["Incident Post-Mortem", "Single incident: timeline, root cause, MTTR, playbook used, and lessons learned."],
  ["Audit-Ready Compliance Pack", "Bundles every plan, test, RTO/RPO record, and vendor attestation into one evidence pack."],
];
const REPORTS: Report[] = [
  { id: "r1", name: "Q3 2026 Board BCP/DR Summary", type: "Board Summary", period: "Q3 2026", generated: "1 Oct 2026 · R. Sibanda", recipients: "Board, Risk Committee", status: "Delivered" },
  { id: "r2", name: "2026 Regulator Compliance Attestation", type: "Regulator Report", period: "FY2026 (interim)", generated: "15 Jul 2026 · R. Sibanda", recipients: "The Regulator", status: "Submitted" },
  { id: "r3", name: "TST-001 After-Action Report", type: "Test After-Action", period: "Single test", generated: "8 Sep 2026 · A. Niyonzima", recipients: "IT, Risk Committee", status: "Delivered" },
  { id: "r4", name: "INC-008 Post-Incident Review", type: "Incident Post-Mortem", period: "Single incident", generated: "20 Aug 2026 · E. Mutoni", recipients: "CMT, Board Chair", status: "Delivered" },
  { id: "r5", name: "2025 Annual BCM Programme Report", type: "Annual Programme", period: "FY2025", generated: "20 Jan 2026 · R. Sibanda", recipients: "Board, Auditor", status: "Delivered" },
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
    ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : d;
const money = (n: number) => `$${n.toLocaleString()}`;

const tone = (s: string) => {
  if (["Critical", "Breach", "Overdue", "Failed", "Active", "L3", "L4", "Fail"].includes(s)) return "bg-destructive/10 text-destructive border-destructive/30";
  if (["High", "Partial", "Pending", "Under review", "Needs update", "Medium", "Flagged", "L2", "Draft"].includes(s)) return "bg-warning/10 text-warning border-warning/30";
  if (["Scheduled", "Submitted", "Low", "L1"].includes(s)) return "bg-primary/10 text-primary border-primary/30";
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

function Kpi({ label, value, sub, warn }: { label: string; value: ReactNode; sub: string; warn?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
        <div className={`text-xs mt-0.5 ${warn ? "text-destructive" : "text-muted-foreground"}`}>{sub}</div>
      </CardContent>
    </Card>
  );
}

// ─── Page ───
export default function GrcBcp() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("overview");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [dialog, setDialog] = useState<null | "process" | "plan" | "test" | "system" | "vendor" | "contact" | "incident" | "report" | "crisis">(null);

  const [processes, setProcesses] = usePersistentState<Process[]>("grc_bcp_bia_v1", PROCESSES);
  const [vendors, setVendors] = usePersistentState<Vendor[]>("grc_bcp_vendors_v1", VENDORS);
  const [incidents, setIncidents] = usePersistentState<Incident[]>("grc_bcp_incidents_v1", INCIDENTS);
  const [reports, setReports] = usePersistentState<Report[]>("grc_bcp_reports_v1", REPORTS);
  const [localTests, setLocalTests] = usePersistentState<TestRec[]>("grc_bcp_tests_v1", TESTS);

  const { data: apiPlans = [] } = useQuery({ queryKey: ["grc-bcp-plans"], queryFn: fetchBcpPlans, retry: 1 });
  const { data: apiTests = [] } = useQuery({ queryKey: ["grc-bcp-tests"], queryFn: fetchBcpTests, retry: 1 });
  const { data: apiRto = [] } = useQuery({ queryKey: ["grc-bcp-rto"], queryFn: fetchRtoRpo, retry: 1 });
  const { data: apiContacts = [] } = useQuery({ queryKey: ["grc-bcp-contacts"], queryFn: fetchCrisisContacts, retry: 1 });

  const plans: Plan[] = useMemo(
    () => [
      ...PLANS,
      ...apiPlans.map((p, i) => ({
        id: p._id,
        code: `BCP-${String(PLANS.length + i + 1).padStart(3, "0")}`,
        title: p.title,
        scope: p.content.slice(0, 90),
        version: `v${p.version}`,
        owner: "—",
        review: fmtD(p.updatedAt),
        status: "Draft" as const,
        phase: 1,
        fromApi: true,
      })),
    ],
    [apiPlans],
  );
  const systems: DrSystem[] = useMemo(
    () => [
      ...SYSTEMS,
      ...apiRto.map((r) => ({
        id: r._id,
        name: r.system,
        tier: r.criticality,
        strategy: "Not yet defined",
        rtoT: Math.round(r.rtoHours * 60),
        rtoA: null,
        rpoT: Math.round(r.rpoHours * 60),
        rpoA: null,
        fromApi: true,
      })),
    ],
    [apiRto],
  );
  const tests: TestRec[] = useMemo(
    () => [
      ...apiTests.map((t, i) => ({
        id: t._id,
        code: `TST-L${i + 1}`,
        scenario: plans.find((p) => p.id === t.planId)?.title ?? "Plan test",
        type: "Logged test",
        date: t.testedAt,
        result: (t.outcome === "Pass" ? "Passed" : t.outcome === "Fail" ? "Failed" : "Partial") as TestRec["result"],
        score: null,
        notes: t.notes,
      })),
      ...localTests,
    ],
    [apiTests, localTests, plans],
  );

  const sysStatus = (s: DrSystem) =>
    s.rtoA === null ? "Untested" : s.rtoA > s.rtoT || (s.rpoA ?? 0) > s.rpoT ? "Breach" : "Ready";
  const breaches = systems.filter((s) => sysStatus(s) === "Breach");
  const tested = systems.filter((s) => s.rtoA !== null);
  const exposure = processes.filter((p) => p.criticality === "Critical" || p.criticality === "High").reduce((s, p) => s + p.impactPerDay, 0);
  const received = vendors.filter((v) => v.attestation === "Received").length;
  const spof = vendors.filter((v) => v.alternate === "None identified");
  const doneTests = tests.filter((t) => t.result !== "Scheduled");
  const scored = doneTests.filter((t) => t.score !== null);
  const avgScore = scored.length ? Math.round(scored.reduce((s, t) => s + (t.score ?? 0), 0) / scored.length) : 0;
  const upcoming = tests.filter((t) => t.result === "Scheduled").sort((a, b) => a.date.localeCompare(b.date));
  const active = incidents.filter((i) => i.status === "Active");

  const attention = [
    ...breaches.map((s) => ({ s: "Breach", title: `${s.name} — RTO breach`, sub: `${mins(s.rtoA)} actual vs ${mins(s.rtoT)} target`, go: "dr" })),
    ...vendors.filter((v) => v.attestation !== "Received").map((v) => ({ s: v.attestation, title: `${v.name} — attestation ${v.attestation.toLowerCase()}`, sub: `Last review: ${v.lastReview}`, go: "vendors" })),
    ...plans.filter((p) => p.status !== "Approved").map((p) => ({ s: "Pending", title: `${p.code} — ${LIFECYCLE[p.phase].toLowerCase()} in progress`, sub: p.title, go: "plans" })),
    ...spof.map((v) => ({ s: "Flagged", title: `${v.name} — no alternate identified`, sub: "Single point of failure at vendor level", go: "vendors" })),
  ];

  const printReport = (title: string) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${title}</title><style>body{font-family:Georgia,serif;max-width:760px;margin:40px auto;line-height:1.5}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:4px 6px;font-size:12px;text-align:left}</style></head><body>
      <h1>${title}</h1><p>Generated ${new Date().toLocaleString()}</p>
      <h2>Key figures</h2><ul><li>Active plans: ${plans.length}</li><li>RTO compliance: ${tested.length - breaches.length}/${tested.length}</li><li>Average test score: ${avgScore}%</li><li>Vendor attestations: ${received}/${vendors.length}</li><li>Daily exposure: ${money(exposure)}</li></ul>
      <h2>Needs attention</h2><ul>${attention.map((a) => `<li>${a.title} — ${a.sub}</li>`).join("")}</ul>
      <h2>Recovery targets</h2><table><tr><th>System</th><th>Tier</th><th>RTO</th><th>RPO</th><th>Status</th></tr>${systems.map((s) => `<tr><td>${s.name}</td><td>${s.tier}</td><td>${mins(s.rtoT)} / ${mins(s.rtoA)}</td><td>${mins(s.rpoT)} / ${mins(s.rpoA)}</td><td>${sysStatus(s)}</td></tr>`).join("")}</table>
      <h2>Tests</h2><table><tr><th>Test</th><th>Scenario</th><th>Date</th><th>Result</th></tr>${tests.map((t) => `<tr><td>${t.code}</td><td>${t.scenario}</td><td>${fmtD(t.date)}</td><td>${t.result}</td></tr>`).join("")}</table>
      </body></html>`);
    w.document.close();
    w.print();
  };

  const exportBia = () => {
    const rows = [["Process", "Department", "Owner", "Criticality", "MTD", "Impact/day", "Dependencies"], ...processes.map((p) => [p.name, p.dept, p.owner, p.criticality, p.mtd, String(p.impactPerDay), p.deps.join("; ")])];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")], { type: "text/csv" }));
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Business Continuity &amp; Disaster Recovery</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          The full resilience lifecycle: what could break, how we've planned for it, what we rely on to recover, whether it's been tested, and what happens the moment something goes wrong.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bia">Business Impact Analysis</TabsTrigger>
          <TabsTrigger value="plans">Continuity Plans</TabsTrigger>
          <TabsTrigger value="dr">DR &amp; Recovery Targets</TabsTrigger>
          <TabsTrigger value="testing">Testing &amp; Exercises</TabsTrigger>
          <TabsTrigger value="vendors">Vendor &amp; Third-Party Resilience</TabsTrigger>
          <TabsTrigger value="crisis">Crisis Management</TabsTrigger>
          <TabsTrigger value="incidents">Incident Response</TabsTrigger>
          <TabsTrigger value="reporting">Reporting</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-5 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <Kpi label="Active plans" value={plans.length} sub={`${plans.filter((p) => p.status === "Approved").length} approved`} />
            <Kpi label="Tests this year" value={`${doneTests.length} / ${tests.length}`} sub={upcoming[0] ? `Next: ${fmtD(upcoming[0].date)}` : "None scheduled"} />
            <Kpi label="Avg recovery score" value={`${avgScore}%`} sub="Across scored tests" />
            <Kpi label="RTO compliance" value={`${tested.length - breaches.length}/${tested.length}`} sub={`${breaches.length} systems breaching target`} warn={breaches.length > 0} />
            <Kpi label="Vendor attestations" value={`${received}/${vendors.length}`} sub={`${vendors.length - received} pending or overdue`} warn={received < vendors.length} />
            <Kpi label="Crisis readiness" value={active.length ? "Low" : "Medium"} sub="Last drill: 6 Sep 2026" />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">The resilience lifecycle</CardTitle>
              <p className="text-xs text-muted-foreground">Click any stage to jump straight to it. This is the order the programme runs in.</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
                {stages.map(([k, l, t], i) => (
                  <button key={k} onClick={() => setTab(t)} className="text-left border rounded-lg p-3 hover:border-primary hover:bg-primary/5 transition-colors">
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">{i + 1}</div>
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
                <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Needs attention</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {attention.map((a, i) => (
                  <button key={i} onClick={() => setTab(a.go)} className="w-full flex items-center gap-3 border rounded-lg p-3 text-left hover:bg-muted/40">
                    <Pill s={a.s} />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{a.title}</div>
                      <div className="text-xs text-muted-foreground">{a.sub}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
                {attention.length === 0 && <p className="text-sm text-muted-foreground">Nothing needs attention.</p>}
              </CardContent>
            </Card>
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Upcoming tests</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {upcoming.map((t) => (
                    <div key={t.id} className="flex gap-3 text-sm">
                      <div className="text-xs font-bold text-primary w-14 shrink-0">{fmtD(t.date).split(" ").slice(0, 2).join(" ")}</div>
                      <div><div className="font-medium">{t.scenario}</div><div className="text-xs text-muted-foreground">{t.type}</div></div>
                    </div>
                  ))}
                  {upcoming.length === 0 && <p className="text-sm text-muted-foreground">None scheduled.</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Total daily exposure</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{money(exposure)}</div>
                  <p className="text-xs text-muted-foreground mt-1">If all critical &amp; high processes are down simultaneously for 24 hours.</p>
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
                <CardTitle className="text-base">Business Impact Analysis</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={exportBia}><Download className="h-4 w-4 mr-1" /> Export</Button>
                  <Button size="sm" onClick={() => setDialog("process")}><Plus className="h-4 w-4 mr-1" /> Add process</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Business process</TableHead><TableHead>Department</TableHead><TableHead>Criticality</TableHead><TableHead>Max downtime</TableHead><TableHead>Priority</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {processes.map((p) => (
                      <TableRow key={p.id} className="cursor-pointer" onClick={() => setDetail({ sub: "Business process", title: p.name, status: p.criticality, body: (<><Row k="Department" v={p.dept} /><Row k="Owner" v={p.owner} /><Row k="Max tolerable downtime" v={p.mtd} /><Row k="Financial impact / day" v={money(p.impactPerDay)} /><Row k="Dependencies" v={p.deps.join(", ") || "None"} /></>) })}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.dept}</TableCell>
                        <TableCell><Pill s={p.criticality} /></TableCell>
                        <TableCell>{p.mtd}</TableCell>
                        <TableCell>{p.criticality === "Critical" ? "P1" : p.criticality === "High" ? "P2" : p.criticality === "Medium" ? "P3" : "P4"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Impact distribution</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {(["Critical", "High", "Medium", "Low"] as Crit[]).map((c) => {
                    const n = processes.filter((p) => p.criticality === c).length;
                    return (
                      <div key={c}>
                        <div className="flex justify-between text-xs mb-1"><span>{c}</span><span>{n}</span></div>
                        <Progress value={processes.length ? (n / processes.length) * 100 : 0} />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Total daily exposure</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{money(exposure)}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Key dependencies</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-1.5">
                  {Object.entries(processes.flatMap((p) => p.deps).reduce<Record<string, number>>((m, d) => ({ ...m, [d]: (m[d] ?? 0) + 1 }), {}))
                    .sort((a, b) => b[1] - a[1])
                    .map(([d, n]) => <Badge key={d} variant="secondary">{d} ×{n}</Badge>)}
                  <p className="text-xs text-muted-foreground w-full mt-2">Single points of failure are flagged for review in Vendor Resilience.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* PLANS */}
        <TabsContent value="plans" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Business Continuity Plans</h2>
            <Button size="sm" onClick={() => setDialog("plan")}><Plus className="h-4 w-4 mr-1" /> New plan</Button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {plans.map((p) => (
              <Card key={p.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => setDetail({ sub: p.code, title: p.title, status: p.status, body: (<><Row k="Scope" v={p.scope} /><Row k="Version" v={p.version} /><Row k="Owner" v={p.owner} /><Row k="Next review" v={p.review} /><Row k="Lifecycle stage" v={LIFECYCLE[p.phase]} />{p.fromApi && <p className="text-xs text-muted-foreground mt-2">Saved plan record.</p>}</>) })}>
                <CardContent className="p-4">
                  <div className="flex justify-between gap-2"><div className="font-semibold text-sm">{p.code}: {p.title}</div><Pill s={p.status} /></div>
                  <div className="text-xs text-muted-foreground mt-1">{p.scope}</div>
                  <div className="text-xs text-muted-foreground mt-2">{p.version} · {p.owner} · Next review {p.review}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Plan lifecycle &amp; governance</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {LIFECYCLE.map((l, i) => {
                  const behind = plans.filter((p) => p.phase === i && p.status !== "Approved");
                  return (
                    <div key={l} className={`rounded-md p-2 text-center text-xs border ${behind.length ? "border-warning bg-warning/10" : "bg-success/10 border-success/30"}`}>
                      <div className="font-medium">{l}</div>
                      {behind.map((b) => <div key={b.id} className="text-[10px] mt-1 font-bold">{b.code}</div>)}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Plans still moving through the cycle are marked on their current stage; approved plans are in annual review.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DR */}
        <TabsContent value="dr" className="space-y-4 mt-4">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <p className="text-sm text-muted-foreground">Each system's recovery strategy and its RTO/RPO performance — click any row for the full picture.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setDialog("system")}><Plus className="h-4 w-4 mr-1" /> Add system</Button>
              <Button size="sm" onClick={() => toast({ title: "Failover simulation complete", description: `${tested.length - breaches.length} of ${tested.length} systems recovered within target (simulated).` })}>Run failover simulation</Button>
            </div>
          </div>
          <Card>
            <CardContent className="p-5 grid md:grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 font-semibold"><Server className="h-4 w-4" /> Primary site</div>
                <div className="text-sm text-muted-foreground">Kigali Data Centre</div>
                <Row k="Servers" v="6 production" /><Row k="Uptime SLA" v="99.95%" />
              </div>
              <div className="text-center text-xs text-muted-foreground">⟺<br />Synchronous replication<br /><span className="text-success">● Active</span></div>
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 font-semibold"><Cloud className="h-4 w-4" /> DR site</div>
                <div className="text-sm text-muted-foreground">Cape Town cloud region</div>
                <Row k="Configuration" v="Warm standby" /><Row k="Replication lag" v="< 15 min" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <Table>
                <TableHeader><TableRow><TableHead>System</TableHead><TableHead>Tier</TableHead><TableHead>DR strategy</TableHead><TableHead>RTO (target / actual)</TableHead><TableHead>RPO (target / actual)</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {systems.map((s) => {
                    const st = sysStatus(s);
                    const ok = (a: number | null, t: number) => a === null ? null : a <= t;
                    const mark = (v: boolean | null) => v === null ? null : v ? <CheckCircle2 className="inline h-3.5 w-3.5 text-success ml-1" /> : <XCircle className="inline h-3.5 w-3.5 text-destructive ml-1" />;
                    return (
                      <TableRow key={s.id} className="cursor-pointer" onClick={() => setDetail({ sub: `${s.tier} system`, title: s.name, status: st, body: (<><Row k="DR strategy" v={s.strategy} /><Row k="RTO target" v={mins(s.rtoT)} /><Row k="RTO actual (last test)" v={mins(s.rtoA)} /><Row k="RPO target" v={mins(s.rpoT)} /><Row k="RPO actual (last test)" v={mins(s.rpoA)} />{st === "Breach" && <p className="text-sm text-destructive mt-3">Recovery exceeded target — remediation required before the next test.</p>}</>) })}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.tier}</TableCell>
                        <TableCell>{s.strategy}</TableCell>
                        <TableCell>{mins(s.rtoT)} / {mins(s.rtoA)}{mark(ok(s.rtoA, s.rtoT))}</TableCell>
                        <TableCell>{mins(s.rpoT)} / {mins(s.rpoA)}{mark(ok(s.rpoA, s.rpoT))}</TableCell>
                        <TableCell><Pill s={st} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Backup strategy (3-2-1 rule)</CardTitle></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-3">
                {[["3", "Copies of data", "Production + 2 backups"], ["2", "Storage media types", "SSD + cloud object storage"], ["1", "Off-site copy", "Cape Town, encrypted, immutable"]].map(([n, l, s]) => (
                  <div key={l} className="border rounded-lg p-4 text-center"><div className="text-3xl font-bold text-primary">{n}</div><div className="font-medium text-sm">{l}</div><div className="text-xs text-muted-foreground">{s}</div></div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3"><b>Schedule:</b> full backup weekly · incremental daily · transaction logs every 15 min · retention 90 days standard, 7 years regulatory.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TESTING */}
        <TabsContent value="testing" className="mt-4">
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Test history</CardTitle>
                <Button size="sm" onClick={() => setDialog("test")}><Plus className="h-4 w-4 mr-1" /> Schedule / log test</Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Test</TableHead><TableHead>Scenario</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead>Result</TableHead><TableHead>Score</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {tests.map((t) => (
                      <TableRow key={t.id} className="cursor-pointer" onClick={() => setDetail({ sub: t.code, title: t.scenario, status: t.result, body: (<><Row k="Type" v={t.type} /><Row k="Date" v={fmtD(t.date)} /><Row k="Score" v={t.score === null ? "—" : `${t.score}%`} />{t.notes && <p className="text-sm mt-3 whitespace-pre-wrap">{t.notes}</p>}</>) })}>
                        <TableCell className="font-mono text-xs">{t.code}</TableCell>
                        <TableCell className="font-medium">{t.scenario}</TableCell>
                        <TableCell>{t.type}</TableCell>
                        <TableCell>{fmtD(t.date)}</TableCell>
                        <TableCell><Pill s={t.result} /></TableCell>
                        <TableCell>{t.score === null ? "—" : `${t.score}%`}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Open findings from tests</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {FINDINGS.map((f) => (
                    <div key={f.title} className="border rounded-lg p-2.5">
                      <Pill s={f.sev} />
                      <div className="text-sm font-medium mt-1">{f.title}</div>
                      <div className="text-xs text-muted-foreground">Owner: {f.owner} · Due {f.due}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Test trend (rolling 12 months)</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-end gap-3 h-32">
                    {[["Q4 '25", 78], ["Q1 '26", 82], ["Q2 '26", 85], ["Q3 '26", 92]].map(([q, v]) => (
                      <div key={q} className="flex-1 flex flex-col items-center justify-end h-full">
                        <div className="text-xs font-medium">{v}%</div>
                        <div className="w-full bg-primary rounded-t" style={{ height: `${Number(v) - 50}%` }} />
                        <div className="text-[10px] text-muted-foreground mt-1">{q}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Average score improving steadily. Target: ≥ 90% by year-end.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* VENDORS */}
        <TabsContent value="vendors" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Vendor &amp; Third-Party Resilience</h2>
            <Button size="sm" onClick={() => setDialog("vendor")}><Plus className="h-4 w-4 mr-1" /> Assess vendor resilience</Button>
          </div>
          <div className="flex gap-3 border rounded-lg p-3 bg-primary/5 text-sm">
            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div><b>This is not vendor management.</b> Onboarding, contracts and commercial contacts live in CRM. This tab only covers how badly it hurts if a vendor fails, whether they've proven they can recover, and whether there's a fallback.</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Kpi label="Vendors assessed" value={vendors.length} sub="Resilience profiles" />
            <Kpi label="Attestations received" value={`${received}/${vendors.length}`} sub="Continuity evidence" />
            <Kpi label="Single points of failure" value={spof.length} sub={spof[0]?.name ?? "None"} warn={spof.length > 0} />
            <Kpi label="Overdue reviews" value={vendors.filter((v) => v.attestation === "Overdue").length} sub="Need follow-up" />
          </div>
          <Card>
            <CardContent className="pt-5">
              <Table>
                <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>Criticality</TableHead><TableHead>SLA</TableHead><TableHead>Continuity attestation</TableHead><TableHead>Alternate vendor</TableHead><TableHead>Last review</TableHead><TableHead>CRM record</TableHead></TableRow></TableHeader>
                <TableBody>
                  {vendors.map((v) => (
                    <TableRow key={v.id} className="cursor-pointer" onClick={() => setDetail({ sub: "Vendor resilience", title: v.name, status: v.attestation, body: (<><Row k="Criticality" v={v.criticality} /><Row k="SLA" v={v.sla} /><Row k="Alternate" v={v.alternate} /><Row k="Last review" v={v.lastReview} /><div className="flex gap-2 mt-4"><Button size="sm" variant="outline" onClick={() => { setVendors((p) => p.map((x) => x.id === v.id ? { ...x, attestation: "Received", lastReview: fmtD(new Date().toISOString()) } : x)); setDetail(null); toast({ title: "Attestation recorded" }); }}>Mark attestation received</Button></div></>) })}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell><Pill s={v.criticality} /></TableCell>
                      <TableCell>{v.sla}</TableCell>
                      <TableCell><Pill s={v.attestation} /></TableCell>
                      <TableCell className={v.alternate === "None identified" ? "text-destructive font-medium" : ""}>{v.alternate}</TableCell>
                      <TableCell>{v.lastReview}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}><Link to="/crm/vendors" className="text-primary text-sm hover:underline">View in CRM →</Link></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CRISIS */}
        <TabsContent value="crisis" className="space-y-4 mt-4">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <h2 className="font-semibold">Crisis Management &amp; Communications</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setDialog("contact")}><Plus className="h-4 w-4 mr-1" /> Add contact</Button>
              <Button size="sm" variant="destructive" onClick={() => setDialog("crisis")}><Siren className="h-4 w-4 mr-1" /> Activate crisis protocol</Button>
            </div>
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Escalation matrix</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-4 gap-3">
              {ESCALATION.map((e, i) => (
                <button key={e.level} onClick={() => setDetail({ sub: "Escalation", title: e.level, body: <><Row k="Trigger" v={e.trigger} /><Row k="Owner" v={e.who} /><Row k="Action" v={`${e.action} ${e.time}`} /></> })} className={`text-left border rounded-lg p-3 hover:border-primary ${i >= 2 ? "border-destructive/40" : ""}`}>
                  <div className="font-semibold text-sm">{e.level}</div>
                  <div className="text-xs text-muted-foreground">{e.trigger}</div>
                  <div className="text-xs mt-2"><b>{e.who}</b> {e.action} <b>{e.time}</b></div>
                </button>
              ))}
            </CardContent>
          </Card>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Crisis Management Team (CMT)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Primary</TableHead><TableHead>Backup</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {CMT.map(([r, p, b]) => <TableRow key={r}><TableCell className="font-medium">{r}</TableCell><TableCell>{p}</TableCell><TableCell>{b}</TableCell></TableRow>)}
                  </TableBody>
                </Table>
                {apiContacts.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-2">Emergency contacts</div>
                    {[...apiContacts].sort((a, b) => a.escalationOrder - b.escalationOrder).map((c) => (
                      <div key={c._id} className="flex justify-between text-sm border-b py-1.5"><span>{c.escalationOrder}. {c.name} <span className="text-muted-foreground">· {c.role}</span></span><span>{c.phone}</span></div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Stakeholder notification order</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {NOTIFY.map(([w, h], i) => (
                  <div key={w} className="flex gap-3"><div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</div><div><div className="text-sm font-medium">{w}</div><div className="text-xs text-muted-foreground">{h}</div></div></div>
                ))}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Pre-approved communication templates</CardTitle></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-3">
                {TEMPLATES.map(([t, d, u]) => (
                  <button key={t} onClick={() => setDetail({ sub: "Communication template", title: t, status: "Approved", body: <><p className="text-sm">{d}</p><Row k="Last updated" v={u} /><p className="text-xs text-muted-foreground mt-3">Editing a published template sends it back through Comms + Legal re-approval before it replaces the live version.</p></> })} className="text-left border rounded-lg p-3 hover:border-primary">
                    <div className="flex items-center gap-2 font-medium text-sm"><FileText className="h-4 w-4 text-primary" /> {t}</div>
                    <div className="text-xs text-muted-foreground mt-1">{d}</div>
                    <div className="flex justify-between items-center mt-2"><span className="text-[11px] text-muted-foreground">Updated {u}</span><Pill s="Approved" /></div>
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
            <Button size="sm" variant="destructive" onClick={() => setDialog("incident")}><Siren className="h-4 w-4 mr-1" /> Declare incident</Button>
          </div>
          {active.length === 0 ? (
            <div className="border border-success/40 bg-success/10 rounded-lg p-4 flex gap-3 items-center">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <div><div className="font-semibold text-sm">No active incidents — all clear</div><div className="text-xs text-muted-foreground">Last incident ({incidents[0]?.code}) was resolved on {incidents[0]?.date}. Mean time to resolution: 2.4 hours.</div></div>
            </div>
          ) : (
            active.map((i) => (
              <div key={i.id} className="border border-destructive/40 bg-destructive/10 rounded-lg p-4 flex gap-3 items-center">
                <Siren className="h-5 w-5 text-destructive" />
                <div className="flex-1"><div className="font-semibold text-sm">{i.code} — {i.description}</div><div className="text-xs text-muted-foreground">Declared {i.date} · Severity {i.severity}</div></div>
                <Button size="sm" variant="outline" onClick={() => { setIncidents((p) => p.map((x) => x.id === i.id ? { ...x, status: "Resolved", mttr: "—" } : x)); toast({ title: `${i.code} resolved` }); }}>Mark resolved</Button>
              </div>
            ))
          )}
          <div className="grid md:grid-cols-3 gap-3">
            {PLAYBOOKS.map(([t, s, steps]) => (
              <button key={t} onClick={() => setDetail({ sub: "Response playbook", title: t, status: s, body: <ol className="list-decimal pl-5 text-sm space-y-1">{steps.split(" → ").map((x) => <li key={x}>{x}</li>)}</ol> })} className="text-left border rounded-lg p-3 hover:border-primary">
                <div className="flex justify-between items-center gap-2"><span className="font-medium text-sm">{t}</span><Pill s={s} /></div>
                <div className="text-xs text-muted-foreground mt-1">{steps}</div>
              </button>
            ))}
          </div>
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-base">Recent incident log</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead>MTTR</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {incidents.map((i) => (
                      <TableRow key={i.id}><TableCell className="font-mono text-xs">{i.code}</TableCell><TableCell>{i.date}</TableCell><TableCell>{i.description}</TableCell><TableCell><Pill s={i.severity} /></TableCell><TableCell><Pill s={i.status} /></TableCell><TableCell>{i.mttr}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-3 content-start">
              <Kpi label="Incidents YTD" value={incidents.length + 3} sub="vs 12 in 2025" />
              <Kpi label="Mean time to detect" value="8 min" sub="↓ from 22 min" />
              <Kpi label="Mean time to resolve" value="2.4 hrs" sub="↓ from 4.1 hrs" />
              <Kpi label="Zero-day exposure" value="0" sub="All patches current" />
            </div>
          </div>
        </TabsContent>

        {/* REPORTING */}
        <TabsContent value="reporting" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Reporting</h2>
            <Button size="sm" onClick={() => setDialog("report")}><Plus className="h-4 w-4 mr-1" /> Generate report</Button>
          </div>
          <p className="text-sm text-muted-foreground">Every report is assembled live from the other tabs — nothing is typed up separately.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Kpi label="Reports generated YTD" value={reports.length + 1} sub="Across all types" />
            <Kpi label="Next scheduled report" value="Q4 Board" sub="Due 2 Jan 2027" />
            <Kpi label="Last regulator submission" value="15 Jul" sub="2026" />
            <Kpi label="Audit pack readiness" value={`${Math.round(((received + plans.filter((p) => p.status === "Approved").length) / (vendors.length + plans.length)) * 100)}%`} sub={`Missing: ${vendors.length - received} vendor attestation(s)`} />
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {REPORT_TYPES.map(([t, d]) => (
              <button key={t} onClick={() => printReport(t)} className="text-left border rounded-lg p-3 hover:border-primary">
                <div className="font-medium text-sm">{t}</div>
                <div className="text-xs text-muted-foreground mt-1">{d}</div>
              </button>
            ))}
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Report library</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Report</TableHead><TableHead>Type</TableHead><TableHead>Period</TableHead><TableHead>Generated</TableHead><TableHead>Recipients</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {reports.map((r) => (
                    <TableRow key={r.id}><TableCell className="font-medium">{r.name}</TableCell><TableCell>{r.type}</TableCell><TableCell>{r.period}</TableCell><TableCell className="text-xs">{r.generated}</TableCell><TableCell className="text-xs">{r.recipients}</TableCell><TableCell><Pill s={r.status} /></TableCell><TableCell><Button size="sm" variant="ghost" onClick={() => printReport(r.name)}>View</Button></TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Scheduled reports</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[["Quarterly", "Board & Executive Summary", "2 Jan 2027", "Board, Risk Committee"], ["Annual", "Regulator Compliance Attestation", "31 Jan 2027", "The Regulator"], ["Annual", "Annual BCM Programme Report", "20 Jan 2027", "Board, External Auditor"]].map(([f, t, d, to]) => (
                <div key={t} className="flex items-center gap-3 border rounded-lg p-3"><Badge variant="secondary">{f}</Badge><div className="flex-1"><div className="text-sm font-medium">{t}</div><div className="text-xs text-muted-foreground">Next due: {d} · Recipients: {to}</div></div></div>
              ))}
              <p className="text-xs text-muted-foreground">Schedules are shown for planning only; reports are not sent automatically yet.</p>
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
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{detail.sub}</div>
                <SheetTitle>{detail.title}</SheetTitle>
                {detail.status && <div><Pill s={detail.status} /></div>}
              </SheetHeader>
              <div className="mt-4">{detail.body}</div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <BcpDialogs
        kind={dialog}
        onClose={() => setDialog(null)}
        plans={plans}
        onProcess={(p) => setProcesses((x) => [...x, p])}
        onVendor={(v) => setVendors((x) => [...x, v])}
        onIncident={(i) => { setIncidents((x) => [i, ...x]); setTab("incidents"); }}
        onReport={(r) => { setReports((x) => [r, ...x]); printReport(r.name); }}
        onLocalTest={(t) => setLocalTests((x) => [...x, t])}
        invalidate={(k) => qc.invalidateQueries({ queryKey: [k] })}
        nextIncident={`INC-${String(incidents.length + 4).padStart(3, "0")}`}
        nextTest={`TST-${String(localTests.length + 1).padStart(3, "0")}`}
      />
    </div>
  );
}

// ─── Dialogs ───
function BcpDialogs({
  kind,
  onClose,
  plans,
  onProcess,
  onVendor,
  onIncident,
  onReport,
  onLocalTest,
  invalidate,
  nextIncident,
  nextTest,
}: {
  kind: string | null;
  onClose: () => void;
  plans: Plan[];
  onProcess: (p: Process) => void;
  onVendor: (v: Vendor) => void;
  onIncident: (i: Incident) => void;
  onReport: (r: Report) => void;
  onLocalTest: (t: TestRec) => void;
  invalidate: (k: string) => void;
  nextIncident: string;
  nextTest: string;
}) {
  const [f, setF] = useState<Record<string, string>>({});
  const set = (k: string) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));
  const sel = (k: string) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const close = () => { setF({}); onClose(); };
  const err = (e: any) => toast({ title: "Couldn't save", description: e?.response?.data?.message, variant: "destructive" });
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const planMut = useMutation({ mutationFn: () => createBcpPlan({ title: f.title, version: Number(f.version || 1), content: f.content || "" }), onSuccess: () => { invalidate("grc-bcp-plans"); toast({ title: "Plan created" }); close(); }, onError: err });
  const testMut = useMutation({ mutationFn: () => logBcpTest({ planId: f.planId, outcome: (f.outcome || "Pass") as BcpTestOutcome, notes: f.notes || "" }), onSuccess: () => { invalidate("grc-bcp-tests"); toast({ title: "Test logged" }); close(); }, onError: err });
  const sysMut = useMutation({ mutationFn: () => createRtoRpo({ system: f.system, rtoHours: Number(f.rto || 1), rpoHours: Number(f.rpo || 1), criticality: (f.tier || "Tier 2") as SystemCriticality }), onSuccess: () => { invalidate("grc-bcp-rto"); toast({ title: "System added" }); close(); }, onError: err });
  const contactMut = useMutation({ mutationFn: () => createCrisisContact({ name: f.name, role: f.role || "", phone: f.phone || "", escalationOrder: Number(f.order || 1) }), onSuccess: () => { invalidate("grc-bcp-contacts"); toast({ title: "Contact added" }); close(); }, onError: err });

  const Field = ({ k, label, type = "text", ...rest }: { k: string; label: string; type?: string; placeholder?: string }) => (
    <div><Label>{label}</Label><Input type={type} value={f[k] ?? ""} onChange={set(k)} {...rest} /></div>
  );
  const Pick = ({ k, label, opts }: { k: string; label: string; opts: string[] }) => (
    <div><Label>{label}</Label><Select value={f[k] ?? opts[0]} onValueChange={sel(k)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
  );

  const content: Record<string, { title: string; body: ReactNode; ok: () => void; can: boolean }> = {
    process: { title: "Add business process", can: !!f.name, ok: () => { onProcess({ id: uid("p"), name: f.name, dept: f.dept || "Operations", owner: f.owner || "—", criticality: (f.crit || "High") as Crit, mtd: f.mtd || "24 hours", impactPerDay: Number(f.impact || 0), deps: (f.deps || "").split(",").map((d) => d.trim()).filter(Boolean) }); toast({ title: "Process added to BIA" }); close(); }, body: <>{Field({ k: "name", label: "Business process name" })}<div className="grid grid-cols-2 gap-3">{Pick({ k: "dept", label: "Department", opts: ["Operations", "Compliance", "Finance", "IT", "Corporate Sec.", "HR"] })}{Field({ k: "owner", label: "Process owner" })}{Pick({ k: "crit", label: "Criticality", opts: ["High", "Critical", "Medium", "Low"] })}{Field({ k: "mtd", label: "Max tolerable downtime", placeholder: "e.g. 4 hours" })}{Field({ k: "impact", label: "Financial impact / day ($)", type: "number" })}{Field({ k: "deps", label: "Dependencies (comma separated)" })}</div></> },
    plan: { title: "New continuity plan", can: !!f.title, ok: () => planMut.mutate(), body: <>{Field({ k: "title", label: "Plan title" })}{Field({ k: "version", label: "Version", type: "number" })}<div><Label>Scope & content</Label><Textarea rows={4} value={f.content ?? ""} onChange={set("content")} /></div></> },
    test: { title: "Schedule or log a test", can: f.mode === "Schedule" ? !!f.scenario && !!f.date : !!f.planId, ok: () => { if (f.mode === "Schedule") { onLocalTest({ id: uid("t"), code: nextTest, scenario: f.scenario, type: f.type || "Tabletop", date: f.date, result: "Scheduled", score: null }); toast({ title: "Test scheduled" }); close(); } else testMut.mutate(); }, body: <>{Pick({ k: "mode", label: "What would you like to do?", opts: ["Log a completed test", "Schedule"] })}{f.mode === "Schedule" ? <>{Field({ k: "scenario", label: "Scenario" })}{Pick({ k: "type", label: "Type", opts: ["Tabletop", "Walkthrough", "Component", "Full DR"] })}{Field({ k: "date", label: "Date", type: "date" })}</> : <><div><Label>Plan tested</Label><Select value={f.planId} onValueChange={sel("planId")}><SelectTrigger><SelectValue placeholder="Select a plan" /></SelectTrigger><SelectContent>{plans.filter((p) => p.fromApi).map((p) => <SelectItem key={p.id} value={p.id}>{p.code}: {p.title}</SelectItem>)}</SelectContent></Select>{!plans.some((p) => p.fromApi) && <p className="text-xs text-muted-foreground mt-1">Create a plan first to log tests against it.</p>}</div>{Pick({ k: "outcome", label: "Outcome", opts: ["Pass", "Partial", "Fail"] })}<div><Label>Notes</Label><Textarea rows={3} value={f.notes ?? ""} onChange={set("notes")} /></div></>}</> },
    system: { title: "Add system recovery target", can: !!f.system, ok: () => sysMut.mutate(), body: <>{Field({ k: "system", label: "System" })}{Pick({ k: "tier", label: "Tier", opts: ["Tier 2", "Tier 1", "Tier 3"] })}<div className="grid grid-cols-2 gap-3">{Field({ k: "rto", label: "RTO target (hours)", type: "number" })}{Field({ k: "rpo", label: "RPO target (hours)", type: "number" })}</div></> },
    vendor: { title: "Assess vendor resilience", can: !!f.name, ok: () => { onVendor({ id: uid("v"), name: f.name, criticality: (f.crit || "High") as Crit, sla: f.sla || "—", attestation: (f.att || "Pending") as Vendor["attestation"], alternate: f.alt || "None identified", lastReview: today }); toast({ title: "Vendor assessed" }); close(); }, body: <>{Field({ k: "name", label: "Vendor" })}<div className="grid grid-cols-2 gap-3">{Pick({ k: "crit", label: "Criticality", opts: ["High", "Critical", "Medium", "Low"] })}{Field({ k: "sla", label: "SLA" })}{Pick({ k: "att", label: "Continuity attestation", opts: ["Pending", "Received", "Overdue"] })}{Field({ k: "alt", label: "Alternate vendor", placeholder: "None identified" })}</div></> },
    contact: { title: "Add crisis contact", can: !!f.name, ok: () => contactMut.mutate(), body: <>{Field({ k: "name", label: "Name" })}{Field({ k: "role", label: "Role" })}<div className="grid grid-cols-2 gap-3">{Field({ k: "phone", label: "Phone" })}{Field({ k: "order", label: "Escalation order", type: "number" })}</div></> },
    incident: { title: "Declare incident", can: !!f.description, ok: () => { onIncident({ id: uid("i"), code: nextIncident, date: today, description: f.description, severity: (f.sev || "L2") as Incident["severity"], status: "Active", mttr: "—" }); toast({ title: `${nextIncident} declared`, description: "Follow the escalation matrix for this severity." }); close(); }, body: <><div><Label>What happened?</Label><Textarea rows={3} value={f.description ?? ""} onChange={set("description")} /></div>{Pick({ k: "sev", label: "Severity", opts: ["L2", "L1", "L3", "L4"] })}</> },
    crisis: { title: "Activate crisis protocol", can: !!f.description, ok: () => { onIncident({ id: uid("i"), code: nextIncident, date: today, description: `Crisis: ${f.description}`, severity: "L3", status: "Active", mttr: "—" }); toast({ title: "Crisis protocol activated", description: "Recorded here only — no messages have been sent to the team." }); close(); }, body: <><p className="text-sm text-muted-foreground">This records a Level 3 incident and opens the response view. Notify the Crisis Management Team using the notification order.</p><div><Label>Situation summary</Label><Textarea rows={3} value={f.description ?? ""} onChange={set("description")} /></div></> },
    report: { title: "Generate report", can: true, ok: () => { const t = f.type || REPORT_TYPES[0][0]; onReport({ id: uid("r"), name: `${t} — ${today}`, type: t, period: f.period || "Current", generated: `${today} · You`, recipients: f.to || "Internal", status: "Draft" }); close(); }, body: <>{Pick({ k: "type", label: "Report type", opts: REPORT_TYPES.map((r) => r[0]) })}{Field({ k: "period", label: "Period", placeholder: "e.g. Q4 2026" })}{Field({ k: "to", label: "Recipients" })}</> },
  };
  const c = kind ? content[kind] : null;
  const pending = planMut.isPending || testMut.isPending || sysMut.isPending || contactMut.isPending;
  return (
    <Dialog open={!!c} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-lg">
        {c && (
          <>
            <DialogHeader><DialogTitle>{c.title}</DialogTitle></DialogHeader>
            <div className="space-y-3">{c.body}</div>
            <DialogFooter>
              <Button variant="outline" onClick={close}>Cancel</Button>
              <Button onClick={c.ok} disabled={!c.can || pending}>Save</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
