import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Download, Mail, Send, AlertTriangle, Check, Circle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePersistentState, fmtDate, uid } from "@/lib/grc/usePersistentState";
import {
  fetchAudits, createAudit, setAuditStatus, addAuditRequest, setRequestStatus, addFinding, updateFinding,
  type AuditEngagement, type AuditType, type FindingSeverity, type FindingStatus, type RequestStatus, type AuditEngagementStatus,
} from "@/lib/grc/compliance-api";

// ─── Extras not covered by the API ─────────────────────────────
interface Extras {
  engagementType: string;
  auditor: string;
  lead: string;
  priority: "Normal" | "High" | "Critical";
  risks: string[];
  linkedRisks: string[];
  objectives: string[];
  committeeDate: string;
  budget: string;
  riskAssessment: { area: string; inherent: string; controls: string; approach: string }[];
  progress: { area: string; pct: number }[];
  samples: { population: string; size: string; method: string; dates: string }[];
  notes: { date: string; title: string; detail: string }[];
  workingPapers: { ref: string; desc: string; preparer: string; reviewer: string; status: string }[];
  findingMeta: Record<number, { ref: string; owner: string; process: string; evidence: string; verifiedBy: string }>;
  reportStage: number; // 0 draft .. 4 issued
  distribution: { name: string; role: string; sent: string; ack: boolean }[];
  execSummary: string;
  committeeActions: { action: string; owner: string; due: string; status: string }[];
}

const LIFECYCLE = [
  ["Planning", "Scope, objectives, risk areas"], ["Fieldwork", "Document requests, testing"], ["Findings", "Issues, root cause, risk rating"],
  ["Reporting", "Draft report, management response"], ["Remediation", "Action tracking, follow-up"], ["Committee report", "Present to Audit Committee"],
];
const RISK_AREAS = ["AML/CFT", "Financial Controls", "IT / Cyber", "Operations", "Governance", "Compliance", "HR", "Other"];
const LINKED_RISKS = ["RSK-001 — Regulatory sanction for AML non-compliance", "RSK-002 — Data breach or unauthorised access", "RSK-003 — Key person dependency", "RSK-004 — Conflict of interest", "RSK-005 — Client concentration", "RSK-006 — FX exposure"];
const REM_LABEL: Record<FindingStatus, string> = { Open: "Not started", "In Progress": "In progress", Remediated: "Implemented", Closed: "Verified" };

const blankExtras = (e: Partial<AuditEngagement>): Extras => ({
  engagementType: e.type === "External" ? "External Audit" : "Internal Audit", auditor: "", lead: "", priority: "Normal", risks: [], linkedRisks: [],
  objectives: [], committeeDate: "", budget: "", riskAssessment: [], progress: [], samples: [], notes: [], workingPapers: [], findingMeta: {},
  reportStage: 0, distribution: [], execSummary: "", committeeActions: [],
});

const d = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

function seedDemo(): { engagements: AuditEngagement[]; extras: Record<string, Extras> } {
  const aml: AuditEngagement = {
    _id: "demo_aml", name: "Internal Audit — AML/CFT Controls", type: "Internal", startDate: d(-50), endDate: d(-7), status: "Reporting",
    scope: "This engagement covers the design and operating effectiveness of the AML/CFT control environment for H1. The review covers CDD/EDD, STR filing, sanctions and PEP screening, and ongoing transaction monitoring across all client relationships.",
    requests: [
      { description: "Client due diligence files (sample of 25)", assignedTo: "Client Services", dueDate: d(-45), status: "Received" },
      { description: "STR filing log Jan–Jun", assignedTo: "MLRO", dueDate: d(-45), status: "Received" },
      { description: "Sanctions screening tool configuration & update log", assignedTo: "IT / Compliance", dueDate: d(-42), status: "Received" },
      { description: "Transaction monitoring threshold review history", assignedTo: "Compliance Officer", dueDate: d(-42), status: "Received" },
      { description: "Board / Compliance Committee minutes referencing AML matters", assignedTo: "Company Secretary", dueDate: d(-40), status: "Received" },
    ],
    findings: [
      { observation: "CDD refresh not completed for 3 high-risk clients (overdue >90 days)", condition: "", criteria: "", cause: "Manual tracking spreadsheet, no automated refresh alert", consequence: "", recommendation: "Implement automated refresh reminders in CRM; complete overdue refreshes immediately", severity: "High", status: "In Progress", managementResponse: "Agreed — refresh in progress", remediationDueDate: d(-3), createdAt: d(-20) },
      { observation: "STR filing timeline exceeded in 1 instance (6 days vs 5-day target)", condition: "", criteria: "", cause: "No delegated MLRO approver during leave periods", consequence: "", recommendation: "Formalise a deputy MLRO delegation with sign-off authority", severity: "High", status: "In Progress", managementResponse: "Agreed — deputy MLRO to be appointed", remediationDueDate: d(14), createdAt: d(-20) },
      { observation: "Sanctions list update frequency insufficient (11 months vs quarterly policy)", condition: "", criteria: "", cause: "Daily feed not activated on vendor subscription", consequence: "", recommendation: "Upgrade vendor subscription tier to enable daily feed", severity: "Medium", status: "Open", managementResponse: "Agreed — budget approval requested", remediationDueDate: d(30), createdAt: d(-20) },
      { observation: "Transaction monitoring thresholds not reviewed in 18 months", condition: "", criteria: "", cause: "No scheduled recalibration process", consequence: "", recommendation: "Introduce a bi-annual threshold recalibration process", severity: "Medium", status: "Remediated", managementResponse: "Agreed — process to be documented", remediationDueDate: d(30), createdAt: d(-20) },
    ],
  };
  const sop: AuditEngagement = {
    _id: "demo_sop", name: "Internal Audit — Standard Operating Procedures", type: "Internal", startDate: d(-25), endDate: d(20), status: "In Progress",
    scope: "SOP completeness across Advisory, Trust & Fiduciary, Fund Admin.",
    requests: [{ description: "Fund Admin procedure manuals", assignedTo: "Fund Administrator", dueDate: d(-2), status: "Overdue" }],
    findings: [
      { observation: "Fund Admin NAV calc procedure not documented", condition: "", criteria: "", cause: "", consequence: "", recommendation: "Document NAV procedure", severity: "Medium", status: "Open", managementResponse: "", remediationDueDate: d(45), createdAt: d(-5) },
      { observation: "Client file checklist gaps (Advisory)", condition: "", criteria: "", cause: "", consequence: "", recommendation: "Update checklist", severity: "Low", status: "Open", managementResponse: "", remediationDueDate: d(60), createdAt: d(-5) },
      { observation: "Client file checklist gaps (Trust)", condition: "", criteria: "", cause: "", consequence: "", recommendation: "Update checklist", severity: "Low", status: "Open", managementResponse: "", remediationDueDate: d(60), createdAt: d(-5) },
    ],
  };
  const ext: AuditEngagement = {
    _id: "demo_ext", name: "External Audit — FY2026 Interim Review", type: "External", startDate: d(5), endDate: d(60), status: "Planned",
    scope: "H1 2026 financial statements · BDO Rwanda", requests: [], findings: [],
  };
  const amlX: Extras = {
    ...blankExtras(aml), auditor: "Internal Compliance team + Aegis Advisory (external consultant)", lead: "Chantal Uwase", priority: "High",
    risks: ["AML/CFT", "Compliance", "Operations"], linkedRisks: [LINKED_RISKS[0]], committeeDate: d(10), budget: "120 hours (80 internal, 40 external)",
    objectives: [
      "Assess whether CDD and EDD are completed and refreshed in line with the AML/CFT Policy and BNR regulations",
      "Test whether suspicious transactions are identified and STRs filed within statutory timelines",
      "Evaluate the adequacy of sanctions and PEP screening tools and update frequency",
      "Determine whether transaction monitoring thresholds remain appropriate",
    ],
    riskAssessment: [
      { area: "Customer due diligence", inherent: "High", controls: "CDD checklist, risk rating model, periodic refresh", approach: "Sample of 25 client files across risk tiers" },
      { area: "STR filing", inherent: "High", controls: "Monitoring alerts, MLRO escalation", approach: "Review of all alerts raised Jan–Jun" },
      { area: "Sanctions / PEP screening", inherent: "Medium", controls: "Screening tool, update schedule", approach: "Confirm update frequency and vendor SLA" },
      { area: "Transaction monitoring", inherent: "Medium", controls: "Automated thresholds, manual review queue", approach: "Threshold recalculation review, walkthrough" },
    ],
    progress: [{ area: "CDD / EDD testing", pct: 100 }, { area: "STR filing review", pct: 100 }, { area: "Sanctions screening review", pct: 100 }, { area: "Transaction monitoring review", pct: 90 }],
    samples: [
      { population: "Active client relationships (142)", size: "25", method: "Risk-stratified random sample", dates: "4–14 Aug" },
      { population: "Transaction monitoring alerts (61)", size: "61 (full)", method: "Full population — high materiality", dates: "10–18 Aug" },
      { population: "Sanctions screening hits (9)", size: "9 (full)", method: "Full population", dates: "15–19 Aug" },
    ],
    notes: [
      { date: "6 Aug", title: "3 of 25 sampled files show CDD refresh overdue by more than 90 days", detail: "All 3 are high-risk clients. Flagged for follow-up with MLRO." },
      { date: "11 Aug", title: "1 STR filed 6 business days after escalation, against a 5-day target", detail: "Root cause appears to be MLRO leave without a delegated approver." },
      { date: "16 Aug", title: "Sanctions list last updated 11 months ago vs quarterly requirement", detail: "Daily feed available but not activated on current subscription tier." },
    ],
    workingPapers: [
      { ref: "WP-01", desc: "CDD file testing schedule (25 samples)", preparer: "Chantal Uwase", reviewer: "Compliance Officer", status: "Reviewed" },
      { ref: "WP-02", desc: "STR filing timeline analysis", preparer: "Aegis Advisory", reviewer: "Compliance Officer", status: "Reviewed" },
      { ref: "WP-03", desc: "Sanctions screening configuration review", preparer: "Chantal Uwase", reviewer: "Compliance Officer", status: "Reviewed" },
      { ref: "WP-04", desc: "Transaction monitoring threshold assessment", preparer: "Aegis Advisory", reviewer: "Pending", status: "Draft" },
    ],
    findingMeta: {
      0: { ref: "F-01", owner: "Compliance Officer", process: "Customer due diligence", evidence: "2 of 3 files refreshed", verifiedBy: "" },
      1: { ref: "F-02", owner: "Compliance Officer", process: "Suspicious transaction reporting", evidence: "Draft delegation memo circulated", verifiedBy: "" },
      2: { ref: "F-03", owner: "IT / Compliance", process: "Sanctions / PEP screening", evidence: "", verifiedBy: "" },
      3: { ref: "F-04", owner: "Compliance Officer", process: "Transaction monitoring", evidence: "Process note v1 filed", verifiedBy: "Naledi Mokoena (pending)" },
    },
    reportStage: 1,
    distribution: [
      { name: "Naledi Mokoena", role: "Audit Committee Chair", sent: d(-3), ack: true },
      { name: "Compliance Officer", role: "Process owner", sent: d(-3), ack: true },
      { name: "James Karenzi", role: "CFO", sent: d(-3), ack: false },
    ],
    execSummary: "The audit covered CDD/EDD, STR filing, sanctions screening, and transaction monitoring for H1. Fieldwork is complete and four findings were identified, two rated high and two medium; none are critical. Overall, the control environment is assessed as adequate with improvement areas. Management has agreed all findings and remediation is underway, though the CDD refresh action is overdue and will be highlighted to the Committee.",
    committeeActions: [
      { action: "Escalate overdue CDD refresh (F-01) to Managing Partner", owner: "Naledi Mokoena", due: d(12), status: "To be raised" },
      { action: "Approve budget for sanctions screening subscription upgrade", owner: "Audit Committee", due: d(10), status: "To be raised" },
    ],
  };
  return {
    engagements: [aml, sop, ext],
    extras: { demo_aml: amlX, demo_sop: { ...blankExtras(sop), auditor: "Operations Manager", lead: "Operations Manager", risks: ["Operations"], progress: [{ area: "Document review", pct: 45 }] }, demo_ext: { ...blankExtras(ext), auditor: "BDO Rwanda (external)", lead: "Audit partner", risks: ["Financial Controls"], progress: [{ area: "Planning", pct: 10 }] } },
  };
}

const phaseOf = (e: AuditEngagement, x: Extras) => {
  if (e.status === "Planned") return 0;
  if (e.status === "In Progress") return e.findings.length ? 2 : 1;
  if (e.status === "Reporting") return x.reportStage >= 4 ? 4 : 3;
  return 5;
};
const pctOf = (e: AuditEngagement, x: Extras) => [10, 45, 60, 65, 85, 100][phaseOf(e, x)];
const sevVariant = (s: string) => (s === "Critical" || s === "High" ? "destructive" : s === "Medium" ? "secondary" : "outline") as any;
const isOverdue = (f: { remediationDueDate: string | null; status: FindingStatus }) => !!f.remediationDueDate && new Date(f.remediationDueDate).getTime() < Date.now() && f.status !== "Remediated" && f.status !== "Closed";

export default function GrcAudits() {
  const qc = useQueryClient();
  const { data: apiAudits = [], isLoading } = useQuery({ queryKey: ["grc-audits"], queryFn: fetchAudits, retry: 1 });
  const [demo, setDemo] = usePersistentState("grc_audits_demo_v1", seedDemo);
  const [extrasStore, setExtrasStore] = usePersistentState<Record<string, Extras>>("grc_audits_extras_v1", {});
  const [openId, setOpenId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const isDemo = apiAudits.length === 0;
  const engagements = isDemo ? demo.engagements : apiAudits;
  const extrasOf = (e: AuditEngagement): Extras => (isDemo ? demo.extras[e._id] : extrasStore[e._id]) ?? blankExtras(e);
  const setExtras = (id: string, patch: Partial<Extras>) => {
    const e = engagements.find((x) => x._id === id)!;
    const cur = extrasOf(e);
    if (isDemo) setDemo((s) => ({ ...s, extras: { ...s.extras, [id]: { ...cur, ...patch } } }));
    else setExtrasStore((s) => ({ ...s, [id]: { ...cur, ...patch } }));
  };

  /** Run an API mutation, or apply it locally for sample data. */
  const mutate = async (id: string, api: () => Promise<unknown>, local: (e: AuditEngagement) => AuditEngagement, msg?: string) => {
    try {
      if (isDemo) setDemo((s) => ({ ...s, engagements: s.engagements.map((e) => (e._id === id ? local(e) : e)) }));
      else { await api(); await qc.invalidateQueries({ queryKey: ["grc-audits"] }); }
      if (msg) toast({ title: msg });
    } catch (err: any) {
      toast({ title: "Action failed", description: err?.response?.data?.message ?? err.message, variant: "destructive" });
    }
  };

  const allFindings = useMemo(() => engagements.flatMap((e) => e.findings.map((f, i) => ({ e, f, i }))), [engagements]);
  const openFindings = allFindings.filter(({ f }) => f.status !== "Closed" && f.status !== "Remediated");

  if (isLoading) return <div className="flex justify-center py-24 gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading audits…</div>;

  const open = engagements.find((e) => e._id === openId);
  if (open) {
    return <EngagementDetail e={open} x={extrasOf(open)} onBack={() => setOpenId(null)} setExtras={(p) => setExtras(open._id, p)} mutate={(api, local, msg) => mutate(open._id, api, local, msg)} />;
  }

  const active = engagements.filter((e) => e.status !== "Closed");
  const nextCommittee = engagements.map((e) => extrasOf(e).committeeDate).filter((x) => x && new Date(x).getTime() >= Date.now()).sort()[0];
  const bySev = (s: FindingSeverity) => openFindings.filter(({ f }) => f.severity === s).length;

  const exportFindings = () => {
    const csv = ["Finding,Audit,Rating,Owner,Due,Status", ...allFindings.map(({ e, f, i }) => `"${f.observation}","${e.name}",${f.severity},"${extrasOf(e).findingMeta[i]?.owner ?? ""}",${f.remediationDueDate ?? ""},${REM_LABEL[f.status]}`)].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "audit-findings.csv"; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div><h1 className="text-2xl font-bold">Audit Management</h1><p className="text-sm text-muted-foreground max-w-3xl">Plan, execute, and track internal and external audit engagements — from audit planning through to findings remediation and committee reporting.</p></div>
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" />New audit engagement</Button>
      </div>
      {isDemo && <div className="text-xs rounded-md border bg-muted/40 px-3 py-2 text-muted-foreground">Showing sample engagements. Create an engagement to start your own audit register.</div>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[["Active engagements", active.length, ""], ["Open findings", openFindings.length, `${bySev("High") + bySev("Critical")} high, ${bySev("Medium")} medium, ${bySev("Low")} low`], ["Overdue remediation", openFindings.filter(({ f }) => isOverdue(f)).length, ""], ["Completed YTD", engagements.filter((e) => e.status === "Closed").length, ""], ["Next Audit Comm.", nextCommittee ? fmtDate(nextCommittee) : "—", ""]].map(([l, v, s]) => (
          <Card key={l as string}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{l}</div><div className="text-2xl font-bold mt-1">{v}</div>{s && <div className="text-[11px] text-muted-foreground">{s}</div>}</CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Audit engagement lifecycle</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {LIFECYCLE.map(([t, s], i) => (
            <div key={t} className="rounded-lg border p-3"><div className="text-sm font-semibold">{i + 1}. {t}</div><div className="text-[11px] text-muted-foreground">{s}</div>
              <div className="text-xs mt-1 text-primary">{engagements.filter((e) => phaseOf(e, extrasOf(e)) === i).length} engagement(s)</div></div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="font-semibold">Active audit engagements</h2>
        {active.map((e) => {
          const x = extrasOf(e); const ph = phaseOf(e, x); const pct = pctOf(e, x);
          const sevs = (["High", "Medium", "Low"] as const).map((s) => [s, e.findings.filter((f) => f.severity === s || (s === "High" && f.severity === "Critical")).length] as const).filter(([, n]) => n);
          return (
            <Card key={e._id} className="cursor-pointer hover:shadow-md transition" onClick={() => setOpenId(e._id)}>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between gap-2 flex-wrap">
                  <div><div className="font-semibold">{e.name}</div><div className="text-xs text-muted-foreground">{e.type} audit · {e.scope?.slice(0, 110)}</div></div>
                  <Badge variant="secondary">{LIFECYCLE[ph][0]}</Badge>
                </div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4">
                  <span>Auditor: <b className="text-foreground">{x.auditor || "—"}</b></span>
                  <span>Findings: {sevs.length ? sevs.map(([s, n]) => `${n} ${s.toLowerCase()}`).join(", ") : "—"}</span>
                  <span>Target: {fmtDate(e.endDate)}</span>
                </div>
                <div className="flex items-center gap-2"><Progress value={pct} className="h-1.5 flex-1" /><span className="text-xs text-muted-foreground">{pct}%</span></div>
              </CardContent>
            </Card>
          );
        })}
        {active.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">No active engagements.</div>}
      </div>

      <Card>
        <CardHeader className="flex-row justify-between items-center space-y-0 flex-wrap gap-2">
          <CardTitle className="text-base">Open findings tracker</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportFindings}><Download className="h-4 w-4 mr-1" />Export findings report</Button>
            <Button size="sm" variant="outline" onClick={() => toast({ title: "Remediation reminders sent", description: `${openFindings.length} owner reminder(s) sent.` })}><Mail className="h-4 w-4 mr-1" />Send remediation reminders</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Finding</TableHead><TableHead>Audit</TableHead><TableHead>Rating</TableHead><TableHead>Owner</TableHead><TableHead>Remediation due</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {openFindings.map(({ e, f, i }) => (
                <TableRow key={`${e._id}-${i}`} className="cursor-pointer" onClick={() => setOpenId(e._id)}>
                  <TableCell className="font-medium max-w-[320px]">{f.observation}</TableCell>
                  <TableCell className="text-xs">{e.name.replace(/^(Internal|External) Audit — /, "")}</TableCell>
                  <TableCell><Badge variant={sevVariant(f.severity)}>{f.severity}</Badge></TableCell>
                  <TableCell>{extrasOf(e).findingMeta[i]?.owner || "—"}</TableCell>
                  <TableCell className={isOverdue(f) ? "text-destructive" : ""}>{fmtDate(f.remediationDueDate)}{isOverdue(f) && " (overdue)"}</TableCell>
                  <TableCell><Badge variant={isOverdue(f) ? "destructive" : "outline"}>{isOverdue(f) ? "Overdue" : REM_LABEL[f.status]}</Badge></TableCell>
                </TableRow>
              ))}
              {openFindings.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No open findings.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NewEngagementDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreate={async (dto, extras) => {
          try {
            if (isDemo) {
              const e: AuditEngagement = { _id: uid("demo"), name: dto.name, type: dto.type, scope: dto.scope, startDate: dto.startDate, endDate: dto.endDate, status: "Planned", requests: [], findings: [] };
              setDemo((s) => ({ engagements: [e, ...s.engagements], extras: { ...s.extras, [e._id]: { ...blankExtras(e), ...extras } } }));
            } else {
              const e = await createAudit(dto);
              setExtrasStore((s) => ({ ...s, [e._id]: { ...blankExtras(e), ...extras } }));
              qc.invalidateQueries({ queryKey: ["grc-audits"] });
            }
            toast({ title: "Engagement created" });
            setNewOpen(false);
          } catch (err: any) {
            toast({ title: "Could not create engagement", description: err?.response?.data?.message ?? err.message, variant: "destructive" });
          }
        }}
      />
    </div>
  );
}

// ─── Detail view ─────────────────────────────────────────────
type Mutate = (api: () => Promise<unknown>, local: (e: AuditEngagement) => AuditEngagement, msg?: string) => Promise<void>;

function EngagementDetail({ e, x, onBack, setExtras, mutate }: { e: AuditEngagement; x: Extras; onBack: () => void; setExtras: (p: Partial<Extras>) => void; mutate: Mutate }) {
  const ph = phaseOf(e, x);
  const [req, setReq] = useState({ description: "", assignedTo: "", dueDate: "" });
  const [fOpen, setFOpen] = useState(false);
  const [note, setNote] = useState({ title: "", detail: "" });
  const sevCount = (s: string) => e.findings.filter((f) => f.severity === s).length;
  const remCounts = (["Open", "In Progress", "Remediated", "Closed"] as FindingStatus[]).map((s) => e.findings.filter((f) => f.status === s).length);
  const remPct = e.findings.length ? Math.round(((remCounts[2] * 0.5 + remCounts[3]) / e.findings.length) * 100) : 0;
  const overdue = e.findings.map((f, i) => ({ f, i })).filter(({ f }) => isOverdue(f));
  const fm = (i: number) => x.findingMeta[i] ?? { ref: `F-${String(i + 1).padStart(2, "0")}`, owner: "", process: "", evidence: "", verifiedBy: "" };
  const setFm = (i: number, p: Partial<Extras["findingMeta"][number]>) => setExtras({ findingMeta: { ...x.findingMeta, [i]: { ...fm(i), ...p } } });

  const NEXT: Record<AuditEngagementStatus, AuditEngagementStatus | null> = { Planned: "In Progress", "In Progress": "Reporting", Reporting: "Closed", Closed: null };
  const next = NEXT[e.status];

  const exportFile = () => {
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(`<html><head><title>${e.name}</title><style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;line-height:1.5}td,th{border:1px solid #ccc;padding:4px 6px;font-size:12px}table{border-collapse:collapse;width:100%}</style></head><body><h1>${e.name}</h1><p>${e.scope}</p><h2>Findings</h2><table><tr><th>Ref</th><th>Finding</th><th>Rating</th><th>Recommendation</th><th>Response</th></tr>${e.findings.map((f, i) => `<tr><td>${fm(i).ref}</td><td>${f.observation}</td><td>${f.severity}</td><td>${f.recommendation}</td><td>${f.managementResponse}</td></tr>`).join("")}</table><h2>Executive summary</h2><p>${x.execSummary}</p></body></html>`);
    w.document.close(); w.print();
  };

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" />Back to Audit Management</Button>
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <div className="flex gap-2 mb-1"><Badge variant="secondary">{x.engagementType}</Badge><Badge variant="outline">{LIFECYCLE[ph][0]}</Badge>{x.priority !== "Normal" && <Badge variant="destructive">{x.priority}</Badge>}</div>
          <h1 className="text-2xl font-bold">{e.name}</h1>
          <p className="text-sm text-muted-foreground">Auditor: {x.auditor || "—"} · Lead auditor: {x.lead || "—"} · Started {fmtDate(e.startDate)} · Target completion {fmtDate(e.endDate)}{x.committeeDate && ` · Reports to Audit Committee ${fmtDate(x.committeeDate)}`}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportFile}><Download className="h-4 w-4 mr-1" />Export engagement file</Button>
          {next && <Button variant="outline" onClick={() => mutate(() => setAuditStatus(e._id, next), (en) => ({ ...en, status: next }), `Moved to ${next}`)}>Move to {next === "In Progress" ? "fieldwork" : next === "Reporting" ? "reporting" : "closed"}</Button>}
          <Button onClick={() => toast({ title: "Sent to Audit Committee", description: "Engagement pack added to the next committee meeting." })}><Send className="h-4 w-4 mr-1" />Send to Audit Committee</Button>
        </div>
      </div>

      <div className="flex flex-wrap border rounded-lg bg-card overflow-hidden">
        {LIFECYCLE.map(([t], i) => (
          <div key={t} className={`flex-1 min-w-[110px] px-3 py-2.5 border-r last:border-r-0 ${i === ph ? "bg-primary/10" : ""}`}>
            <div className="flex items-center gap-1.5 text-xs font-semibold">{i < ph ? <Check className="h-3.5 w-3.5 text-success" /> : <Circle className={`h-3.5 w-3.5 ${i === ph ? "text-primary fill-primary" : "text-muted-foreground"}`} />}{t}</div>
            <div className="text-[11px] text-muted-foreground">{i < ph ? "Complete" : i === ph ? "In progress" : "—"}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="planning">
        <TabsList className="flex-wrap h-auto">
          {["Planning", "Fieldwork", "Findings", "Reporting", "Remediation", "Committee report"].map((t) => <TabsTrigger key={t} value={t.toLowerCase().split(" ")[0]}>{t}</TabsTrigger>)}
        </TabsList>

        {/* PLANNING */}
        <TabsContent value="planning" className="space-y-4">
          <Card><CardHeader><CardTitle className="text-base">Audit scope statement</CardTitle></CardHeader><CardContent className="text-sm space-y-4">
            <p>{e.scope || "No scope recorded."}</p>
            <div><div className="font-semibold mb-1">Objectives</div>
              <ol className="list-decimal pl-5 space-y-1">{x.objectives.map((o, i) => <li key={i}>{o}</li>)}</ol>
              <ObjectiveAdder onAdd={(o) => setExtras({ objectives: [...x.objectives, o] })} />
            </div>
            <div><div className="font-semibold mb-1">Risk areas covered</div><div className="flex gap-1.5 flex-wrap">{x.risks.map((r) => <Badge key={r} variant="secondary">{r}</Badge>)}{!x.risks.length && "—"}</div></div>
          </CardContent></Card>
          <div className="grid md:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle className="text-base">Planning details</CardTitle></CardHeader><CardContent className="text-sm space-y-1.5">
              {[["Engagement type", x.engagementType], ["Auditor", x.auditor || "—"], ["Planned start / completion", `${fmtDate(e.startDate)} → ${fmtDate(e.endDate)}`], ["Budget / hours", x.budget || "—"], ["Linked risks", x.linkedRisks.join("; ") || "—"]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b pb-1.5 last:border-0"><span className="text-muted-foreground">{k}</span><span className="font-medium text-right">{v}</span></div>
              ))}
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Document requests</CardTitle></CardHeader><CardContent className="space-y-2">
              <RequestTable e={e} mutate={mutate} />
              <div className="flex gap-2 flex-wrap pt-2">
                <Input className="flex-1 min-w-[160px]" placeholder="Item requested" value={req.description} onChange={(ev) => setReq({ ...req, description: ev.target.value })} />
                <Input className="w-32" placeholder="From" value={req.assignedTo} onChange={(ev) => setReq({ ...req, assignedTo: ev.target.value })} />
                <Input className="w-36" type="date" value={req.dueDate} onChange={(ev) => setReq({ ...req, dueDate: ev.target.value })} />
                <Button size="sm" onClick={() => {
                  if (!req.description || !req.dueDate) return toast({ title: "Item and due date required", variant: "destructive" });
                  mutate(() => addAuditRequest(e._id, req), (en) => ({ ...en, requests: [...en.requests, { ...req, status: "Requested" }] }), "Request added");
                  setReq({ description: "", assignedTo: "", dueDate: "" });
                }}><Plus className="h-4 w-4" /></Button>
              </div>
            </CardContent></Card>
          </div>
          <Card><CardHeader><CardTitle className="text-base">Preliminary risk assessment</CardTitle></CardHeader><CardContent>
            <Table><TableHeader><TableRow><TableHead>Risk area</TableHead><TableHead>Inherent risk</TableHead><TableHead>Key controls</TableHead><TableHead>Testing approach</TableHead></TableRow></TableHeader>
              <TableBody>{x.riskAssessment.map((r, i) => <TableRow key={i}><TableCell className="font-medium">{r.area}</TableCell><TableCell><Badge variant={sevVariant(r.inherent)}>{r.inherent}</Badge></TableCell><TableCell className="text-xs">{r.controls}</TableCell><TableCell className="text-xs">{r.approach}</TableCell></TableRow>)}
                {!x.riskAssessment.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No risk assessment yet.</TableCell></TableRow>}</TableBody></Table>
          </CardContent></Card>
        </TabsContent>

        {/* FIELDWORK */}
        <TabsContent value="fieldwork" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle className="text-base">Fieldwork progress tracker</CardTitle></CardHeader><CardContent className="space-y-3">
              {x.progress.map((p, i) => (
                <div key={i}><div className="flex justify-between text-sm"><span>{p.area}</span><span className="text-muted-foreground">{p.pct}%</span></div>
                  <input type="range" min={0} max={100} step={5} value={p.pct} className="w-full accent-primary" onChange={(ev) => setExtras({ progress: x.progress.map((q, j) => (j === i ? { ...q, pct: +ev.target.value } : q)) })} /></div>
              ))}
              {!x.progress.length && <Button size="sm" variant="outline" onClick={() => setExtras({ progress: [{ area: "Testing", pct: 0 }] })}>Add workstream</Button>}
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Document request status</CardTitle></CardHeader><CardContent><RequestTable e={e} mutate={mutate} /></CardContent></Card>
          </div>
          <Card><CardHeader><CardTitle className="text-base">Sample selections</CardTitle></CardHeader><CardContent>
            <Table><TableHeader><TableRow><TableHead>Population</TableHead><TableHead>Sample size</TableHead><TableHead>Selection method</TableHead><TableHead>Testing dates</TableHead></TableRow></TableHeader>
              <TableBody>{x.samples.map((s, i) => <TableRow key={i}><TableCell className="font-medium">{s.population}</TableCell><TableCell>{s.size}</TableCell><TableCell className="text-xs">{s.method}</TableCell><TableCell>{s.dates}</TableCell></TableRow>)}
                {!x.samples.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No samples recorded.</TableCell></TableRow>}</TableBody></Table>
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Fieldwork notes & observations</CardTitle></CardHeader><CardContent className="space-y-3">
            {x.notes.map((n, i) => (
              <div key={i} className="flex gap-3 border-l-2 border-primary pl-3"><div className="text-xs text-muted-foreground w-14 shrink-0">{n.date}</div><div><div className="text-sm font-medium">{n.title}</div><div className="text-xs text-muted-foreground">{n.detail}</div></div></div>
            ))}
            <div className="grid gap-2 pt-2 border-t">
              <Input placeholder="Observation" value={note.title} onChange={(ev) => setNote({ ...note, title: ev.target.value })} />
              <Textarea rows={2} placeholder="Detail" value={note.detail} onChange={(ev) => setNote({ ...note, detail: ev.target.value })} />
              <Button size="sm" className="justify-self-start" onClick={() => { if (!note.title) return; setExtras({ notes: [...x.notes, { date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }), ...note }] }); setNote({ title: "", detail: "" }); }}>Add note</Button>
            </div>
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Working papers register</CardTitle></CardHeader><CardContent>
            <Table><TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Description</TableHead><TableHead>Preparer</TableHead><TableHead>Reviewer</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>{x.workingPapers.map((w, i) => (
                <TableRow key={w.ref}><TableCell>{w.ref}</TableCell><TableCell className="font-medium">{w.desc}</TableCell><TableCell>{w.preparer}</TableCell><TableCell>{w.reviewer}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" className="h-7" onClick={() => setExtras({ workingPapers: x.workingPapers.map((q, j) => (j === i ? { ...q, status: q.status === "Reviewed" ? "Draft" : "Reviewed", reviewer: q.status === "Reviewed" ? q.reviewer : q.reviewer === "Pending" ? "Compliance Officer" : q.reviewer } : q)) })}><Badge variant={w.status === "Reviewed" ? "default" : "secondary"}>{w.status}</Badge></Button></TableCell></TableRow>
              ))}
                {!x.workingPapers.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">No working papers yet.</TableCell></TableRow>}</TableBody></Table>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setExtras({ workingPapers: [...x.workingPapers, { ref: `WP-${String(x.workingPapers.length + 1).padStart(2, "0")}`, desc: "New working paper", preparer: x.lead || "Auditor", reviewer: "Pending", status: "Draft" }] })}><Plus className="h-4 w-4 mr-1" />Add working paper</Button>
          </CardContent></Card>
        </TabsContent>

        {/* FINDINGS */}
        <TabsContent value="findings" className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {(["High", "Medium", "Low"] as const).map((s) => <Card key={s}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{s}</div><div className="text-2xl font-bold">{sevCount(s) + (s === "High" ? sevCount("Critical") : 0)}</div></CardContent></Card>)}
          </div>
          <Card><CardHeader className="flex-row justify-between items-center space-y-0"><CardTitle className="text-base">Detailed findings</CardTitle><Button size="sm" onClick={() => setFOpen(true)}><Plus className="h-4 w-4 mr-1" />Add finding</Button></CardHeader><CardContent className="overflow-x-auto">
            <Table><TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Finding</TableHead><TableHead>Rating</TableHead><TableHead>Root cause</TableHead><TableHead>Process</TableHead><TableHead>Recommendation</TableHead><TableHead>Mgmt response</TableHead><TableHead>Owner</TableHead><TableHead>Due</TableHead></TableRow></TableHeader>
              <TableBody>{e.findings.map((f, i) => (
                <TableRow key={i}><TableCell>{fm(i).ref}</TableCell><TableCell className="font-medium min-w-[200px]">{f.observation}</TableCell><TableCell><Badge variant={sevVariant(f.severity)}>{f.severity}</Badge></TableCell>
                  <TableCell className="text-xs min-w-[150px]">{f.cause || "—"}</TableCell><TableCell className="text-xs">{fm(i).process || "—"}</TableCell><TableCell className="text-xs min-w-[180px]">{f.recommendation || "—"}</TableCell>
                  <TableCell className="text-xs min-w-[160px]"><Input className="h-7 text-xs" defaultValue={f.managementResponse} placeholder="Response…" onBlur={(ev) => ev.target.value !== f.managementResponse && mutate(() => updateFinding(e._id, i, { managementResponse: ev.target.value }), (en) => ({ ...en, findings: en.findings.map((q, j) => (j === i ? { ...q, managementResponse: ev.target.value } : q)) }), "Response saved")} /></TableCell>
                  <TableCell><Input className="h-7 text-xs w-32" value={fm(i).owner} placeholder="Owner" onChange={(ev) => setFm(i, { owner: ev.target.value })} /></TableCell>
                  <TableCell><Input type="date" className="h-7 text-xs w-36" defaultValue={f.remediationDueDate?.slice(0, 10) ?? ""} onBlur={(ev) => ev.target.value && mutate(() => updateFinding(e._id, i, { remediationDueDate: ev.target.value }), (en) => ({ ...en, findings: en.findings.map((q, j) => (j === i ? { ...q, remediationDueDate: ev.target.value } : q)) }))} /></TableCell>
                </TableRow>
              ))}
                {!e.findings.length && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">No findings recorded.</TableCell></TableRow>}</TableBody></Table>
          </CardContent></Card>
        </TabsContent>

        {/* REPORTING */}
        <TabsContent value="reporting" className="space-y-4">
          <Card><CardHeader><CardTitle className="text-base">Report workflow</CardTitle></CardHeader><CardContent>
            <div className="flex flex-wrap gap-2">
              {["Draft prepared", "Internal review", "Management response", "Final report", "Issued"].map((s, i) => (
                <button key={s} onClick={() => setExtras({ reportStage: i })} className={`flex-1 min-w-[120px] rounded-lg border px-3 py-2 text-left text-xs ${i < x.reportStage ? "bg-success/10 border-success/30" : i === x.reportStage ? "bg-primary/10 border-primary" : ""}`}>
                  <div className="font-semibold flex items-center gap-1">{i < x.reportStage && <Check className="h-3 w-3" />}{s}</div><div className="text-muted-foreground">{i < x.reportStage ? "Done" : i === x.reportStage ? "In progress" : "—"}</div>
                </button>
              ))}
            </div>
          </CardContent></Card>
          <div className="grid md:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle className="text-base">Draft report details</CardTitle></CardHeader><CardContent className="text-sm space-y-1.5">
              {[["Title", `Internal Audit Report — ${e.name.replace(/^.*— /, "")}`], ["Version", `v${x.reportStage + 1}${x.reportStage < 3 ? " (draft)" : ""}`], ["Author", x.lead || "—"], ["Reviewer", x.reportStage >= 2 ? "Compliance Officer" : "Compliance Officer (in progress)"]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b pb-1.5 last:border-0"><span className="text-muted-foreground">{k}</span><span className="font-medium text-right">{v}</span></div>
              ))}
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Report distribution list</CardTitle></CardHeader><CardContent>
              <Table><TableHeader><TableRow><TableHead>Recipient</TableHead><TableHead>Role</TableHead><TableHead>Sent</TableHead><TableHead>Ack.</TableHead></TableRow></TableHeader>
                <TableBody>{x.distribution.map((r, i) => (
                  <TableRow key={i}><TableCell className="font-medium">{r.name}</TableCell><TableCell className="text-xs">{r.role}</TableCell><TableCell>{fmtDate(r.sent)}</TableCell>
                    <TableCell><Checkbox checked={r.ack} onCheckedChange={() => setExtras({ distribution: x.distribution.map((q, j) => (j === i ? { ...q, ack: !q.ack } : q)) })} /></TableCell></TableRow>
                ))}
                  {!x.distribution.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">Not yet distributed.</TableCell></TableRow>}</TableBody></Table>
              {!x.distribution.length && <Button size="sm" variant="outline" className="mt-2" onClick={() => setExtras({ distribution: [{ name: "Audit Committee Chair", role: "Audit Committee Chair", sent: new Date().toISOString(), ack: false }, { name: "Process owner", role: "Process owner", sent: new Date().toISOString(), ack: false }] })}>Distribute draft</Button>}
            </CardContent></Card>
          </div>
          <Card><CardHeader><CardTitle className="text-base">Management response tracker</CardTitle></CardHeader><CardContent>
            <Table><TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Finding summary</TableHead><TableHead>Agrees</TableHead><TableHead>Action committed</TableHead><TableHead>Responsible</TableHead><TableHead>Target</TableHead></TableRow></TableHeader>
              <TableBody>{e.findings.map((f, i) => (
                <TableRow key={i}><TableCell>{fm(i).ref}</TableCell><TableCell className="text-sm">{f.observation}</TableCell><TableCell>{f.managementResponse ? <Badge>Yes</Badge> : <Badge variant="outline">Pending</Badge>}</TableCell><TableCell className="text-xs">{f.recommendation}</TableCell><TableCell>{fm(i).owner || "—"}</TableCell><TableCell>{fmtDate(f.remediationDueDate)}</TableCell></TableRow>
              ))}</TableBody></Table>
          </CardContent></Card>
        </TabsContent>

        {/* REMEDIATION */}
        <TabsContent value="remediation" className="space-y-4">
          {overdue.length > 0 && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm flex gap-2"><AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
              <div><b>{overdue.length} remediation action(s) overdue.</b> {overdue.map(({ f, i }) => `${fm(i).ref} was due ${fmtDate(f.remediationDueDate)}`).join("; ")}.</div></div>
          )}
          <Card><CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="font-semibold">Remediation progress</span><span>{remPct}% complete</span></div>
            <Progress value={remPct} className="h-2" />
            <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">{["Not started", "In progress", "Implemented", "Verified"].map((l, i) => <span key={l}>{l}: <b className="text-foreground">{remCounts[i]}</b></span>)}</div>
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Action tracking</CardTitle></CardHeader><CardContent className="overflow-x-auto">
            <Table><TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Agreed action</TableHead><TableHead>Owner</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead><TableHead>Evidence</TableHead><TableHead>Verified by</TableHead></TableRow></TableHeader>
              <TableBody>{e.findings.map((f, i) => (
                <TableRow key={i}><TableCell>{fm(i).ref}</TableCell><TableCell className="text-sm min-w-[200px]">{f.recommendation || f.observation}</TableCell><TableCell>{fm(i).owner || "—"}</TableCell>
                  <TableCell className={isOverdue(f) ? "text-destructive" : ""}>{fmtDate(f.remediationDueDate)}</TableCell>
                  <TableCell>
                    <Select value={f.status} onValueChange={(v: FindingStatus) => mutate(() => updateFinding(e._id, i, { status: v }), (en) => ({ ...en, findings: en.findings.map((q, j) => (j === i ? { ...q, status: v } : q)) }), `Status: ${REM_LABEL[v]}`)}>
                      <SelectTrigger className="h-7 w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{(Object.keys(REM_LABEL) as FindingStatus[]).map((s) => <SelectItem key={s} value={s}>{REM_LABEL[s]}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input className="h-7 text-xs w-40" value={fm(i).evidence} placeholder="Evidence…" onChange={(ev) => setFm(i, { evidence: ev.target.value })} /></TableCell>
                  <TableCell><Input className="h-7 text-xs w-36" value={fm(i).verifiedBy} placeholder="—" onChange={(ev) => setFm(i, { verifiedBy: ev.target.value })} /></TableCell>
                </TableRow>
              ))}</TableBody></Table>
          </CardContent></Card>
        </TabsContent>

        {/* COMMITTEE */}
        <TabsContent value="committee" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle className="text-base">Audit Committee presentation</CardTitle></CardHeader><CardContent className="text-sm space-y-2">
              <div><Label className="text-xs">Meeting date</Label><Input type="date" value={x.committeeDate?.slice(0, 10) ?? ""} onChange={(ev) => setExtras({ committeeDate: ev.target.value })} /></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Presenter</span><span>Compliance Officer{x.lead ? `, with ${x.lead}` : ""}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Papers reference</span><span>Audit Committee report — Annex</span></div>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Key statistics for Committee</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3">
              {[["Findings by severity", `${sevCount("High") + sevCount("Critical")}H / ${sevCount("Medium")}M / ${sevCount("Low")}L`], ["Remediation status", `${remPct}%`, `${overdue.length} overdue`], ["Requests received", `${e.requests.filter((r) => r.status === "Received").length}/${e.requests.length}`], ["Working papers", `${x.workingPapers.filter((w) => w.status === "Reviewed").length}/${x.workingPapers.length} reviewed`]].map(([l, v, s]) => (
                <div key={l} className="border rounded-lg p-2.5"><div className="text-[11px] text-muted-foreground">{l}</div><div className="font-bold">{v}</div>{s && <div className="text-[11px] text-destructive">{s}</div>}</div>
              ))}
            </CardContent></Card>
          </div>
          <Card><CardHeader><CardTitle className="text-base">Executive summary for Committee</CardTitle></CardHeader><CardContent>
            <Textarea rows={5} value={x.execSummary} placeholder="Summarise scope, findings, overall assessment and remediation status…" onChange={(ev) => setExtras({ execSummary: ev.target.value })} />
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Committee actions arising</CardTitle></CardHeader><CardContent>
            <Table><TableHeader><TableRow><TableHead>Action</TableHead><TableHead>Owner</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>{x.committeeActions.map((a, i) => (
                <TableRow key={i}><TableCell className="font-medium">{a.action}</TableCell><TableCell>{a.owner}</TableCell><TableCell>{fmtDate(a.due)}</TableCell>
                  <TableCell><Select value={a.status} onValueChange={(v) => setExtras({ committeeActions: x.committeeActions.map((q, j) => (j === i ? { ...q, status: v } : q)) })}><SelectTrigger className="h-7 w-[130px]"><SelectValue /></SelectTrigger><SelectContent>{["To be raised", "Raised", "Resolved"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></TableCell></TableRow>
              ))}
                {!x.committeeActions.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No committee actions.</TableCell></TableRow>}</TableBody></Table>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setExtras({ committeeActions: [...x.committeeActions, { action: "New committee action", owner: "Audit Committee", due: x.committeeDate || new Date().toISOString(), status: "To be raised" }] })}><Plus className="h-4 w-4 mr-1" />Add action</Button>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <FindingDialog open={fOpen} onOpenChange={setFOpen} onSave={(dto, meta) => {
        const idx = e.findings.length;
        mutate(() => addFinding(e._id, dto), (en) => ({ ...en, findings: [...en.findings, { condition: "", criteria: "", consequence: "", status: "Open", managementResponse: "", remediationDueDate: null, createdAt: new Date().toISOString(), cause: "", recommendation: "", ...dto }] }), "Finding added");
        setFm(idx, { ...meta, ref: `F-${String(idx + 1).padStart(2, "0")}` });
        setFOpen(false);
      }} />
    </div>
  );
}

function ObjectiveAdder({ onAdd }: { onAdd: (o: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="flex gap-2 mt-2"><Input className="h-8" placeholder="Add objective" value={v} onChange={(e) => setV(e.target.value)} /><Button size="sm" variant="outline" onClick={() => { if (v.trim()) { onAdd(v.trim()); setV(""); } }}>Add</Button></div>
  );
}

function RequestTable({ e, mutate }: { e: AuditEngagement; mutate: Mutate }) {
  return (
    <Table><TableHeader><TableRow><TableHead>Item</TableHead><TableHead>From</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
      <TableBody>{e.requests.map((r, i) => (
        <TableRow key={i}><TableCell className="text-sm">{r.description}</TableCell><TableCell className="text-xs">{r.assignedTo || "—"}</TableCell><TableCell className="text-xs">{fmtDate(r.dueDate)}</TableCell>
          <TableCell>
            <Select value={r.status} onValueChange={(v: RequestStatus) => mutate(() => setRequestStatus(e._id, i, v), (en) => ({ ...en, requests: en.requests.map((q, j) => (j === i ? { ...q, status: v } : q)) }))}>
              <SelectTrigger className="h-7 w-[110px]"><Badge variant={r.status === "Received" ? "default" : r.status === "Overdue" ? "destructive" : "secondary"}>{r.status}</Badge></SelectTrigger>
              <SelectContent>{["Requested", "Received", "Overdue"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </TableCell></TableRow>
      ))}
        {!e.requests.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No requests yet.</TableCell></TableRow>}</TableBody></Table>
  );
}

function FindingDialog({ open, onOpenChange, onSave }: { open: boolean; onOpenChange: (o: boolean) => void; onSave: (dto: { observation: string; cause?: string; recommendation?: string; severity: FindingSeverity }, meta: { owner: string; process: string; evidence: string; verifiedBy: string }) => void }) {
  const [f, setF] = useState({ observation: "", cause: "", recommendation: "", severity: "Medium" as FindingSeverity, owner: "", process: "" });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent><DialogHeader><DialogTitle>Add finding</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Finding</Label><Textarea rows={2} value={f.observation} onChange={(e) => setF({ ...f, observation: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Rating</Label><Select value={f.severity} onValueChange={(v: FindingSeverity) => setF({ ...f, severity: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Critical", "High", "Medium", "Low"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Affected process</Label><Input value={f.process} onChange={(e) => setF({ ...f, process: e.target.value })} /></div>
          </div>
          <div><Label>Root cause</Label><Input value={f.cause} onChange={(e) => setF({ ...f, cause: e.target.value })} /></div>
          <div><Label>Recommendation</Label><Textarea rows={2} value={f.recommendation} onChange={(e) => setF({ ...f, recommendation: e.target.value })} /></div>
          <div><Label>Owner</Label><Input value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { if (!f.observation.trim()) return; onSave({ observation: f.observation, cause: f.cause, recommendation: f.recommendation, severity: f.severity }, { owner: f.owner, process: f.process, evidence: "", verifiedBy: "" }); setF({ observation: "", cause: "", recommendation: "", severity: "Medium", owner: "", process: "" }); }}>Add finding</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewEngagementDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (o: boolean) => void; onCreate: (dto: { name: string; type: AuditType; scope: string; startDate: string; endDate: string }, extras: Partial<Extras>) => void }) {
  const [f, setF] = useState({ engagementType: "Internal Audit", name: "", scope: "", risks: [] as string[], auditor: "", startDate: "", endDate: "", committeeDate: "", priority: "Normal" as Extras["priority"], lead: "", linkedRisks: [] as string[] });
  const toggle = (k: "risks" | "linkedRisks", v: string) => setF({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>New audit engagement</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Engagement type</Label><Select value={f.engagementType} onValueChange={(v) => setF({ ...f, engagementType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Internal Audit", "External Audit", "Special Investigation", "Regulatory Examination"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Priority level</Label><Select value={f.priority} onValueChange={(v: any) => setF({ ...f, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Normal", "High", "Critical"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div><Label>Engagement title</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><Label>Scope / objectives</Label><Textarea rows={3} value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value })} /></div>
          <div><Label>Risk areas covered</Label><div className="flex flex-wrap gap-2 mt-1">{RISK_AREAS.map((r) => <Button key={r} type="button" size="sm" variant={f.risks.includes(r) ? "default" : "outline"} onClick={() => toggle("risks", r)}>{r}</Button>)}</div></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Auditor (team or firm)</Label><Input value={f.auditor} onChange={(e) => setF({ ...f, auditor: e.target.value })} /></div>
            <div><Label>Lead auditor / partner</Label><Input value={f.lead} onChange={(e) => setF({ ...f, lead: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Planned start</Label><Input type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></div>
            <div><Label>Target completion</Label><Input type="date" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></div>
            <div><Label>Audit Committee date</Label><Input type="date" value={f.committeeDate} onChange={(e) => setF({ ...f, committeeDate: e.target.value })} /></div>
          </div>
          <div><Label>Linked risk register entries</Label><div className="space-y-1 mt-1">{LINKED_RISKS.map((r) => <label key={r} className="flex gap-2 items-center text-sm"><Checkbox checked={f.linkedRisks.includes(r)} onCheckedChange={() => toggle("linkedRisks", r)} />{r}</label>)}</div></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => {
            if (!f.name || !f.startDate || !f.endDate) return toast({ title: "Title, start and target dates are required", variant: "destructive" });
            onCreate({ name: f.name, type: f.engagementType === "External Audit" ? "External" : "Internal", scope: f.scope, startDate: f.startDate, endDate: f.endDate },
              { engagementType: f.engagementType, auditor: f.auditor, lead: f.lead, priority: f.priority, risks: f.risks, linkedRisks: f.linkedRisks, committeeDate: f.committeeDate });
          }}>Create engagement</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
