import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, ShieldAlert, Upload, Download, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePersistentState, fmtDate } from "@/lib/grc/usePersistentState";

type Status = "Open" | "Investigating" | "Closed";
type Severity = "Critical" | "High" | "Medium" | "Low";
interface Incident {
  ref: string; title: string; category: string; severity: Severity; status: Status;
  occurred: string; reported: string; reportedBy: string; assignedTo: string; escalatedTo: string;
  regulatoryReport: string; linkedAudit: string; description: string; investigationNotes: string;
  persons: string; clients: string; policies: string[]; immediateActions: string; anonymous: boolean;
  impact: { financial: string; regulatory: string; client: string; reputational: string };
  rootCauses: string[]; rootNarrative: string;
  findings: { ref: string; finding: string; severity: Severity; action: string }[];
  actions: { action: string; owner: string; due: string; status: "Pending" | "In progress" | "Done" }[];
  files: { name: string; type: string; by: string; date: string; size: string }[];
  links: { type: string; label: string }[];
  lessons: { title: string; category: string; detail: string; by: string; date: string }[];
  timeline: { at: string; event: string; detail?: string }[];
}

const CATEGORIES = ["Policy breach", "Data incident", "Near-miss", "Complaint (client)", "Complaint (staff)", "Fraud / financial irregularity", "Conflict of interest", "Regulatory non-compliance", "Health and safety", "IT / cybersecurity", "Third-party / outsourcing", "Other"];
const POLICIES = ["AML/CFT Policy", "Data Protection Policy", "IT Security Policy", "Client Acceptance Policy", "Code of Conduct", "Complaints Handling Policy", "Record Retention Policy", "Business Continuity Plan", "Employee Handbook"];
const ROOT = ["Process failure", "People / resourcing", "System / technology", "External / third-party", "Policy gap", "Training gap"];
const LESSON_CATS = ["Process", "Control design", "People / training", "Technology", "Policy gap", "Communication"];

const base = (p: Partial<Incident>): Incident => ({
  ref: "", title: "", category: "Other", severity: "Low", status: "Open", occurred: "", reported: "", reportedBy: "Compliance Officer", assignedTo: "Compliance Officer",
  escalatedTo: "—", regulatoryReport: "Not required", linkedAudit: "—", description: "", investigationNotes: "", persons: "", clients: "", policies: [], immediateActions: "", anonymous: false,
  impact: { financial: "None", regulatory: "None", client: "None", reputational: "None" }, rootCauses: [], rootNarrative: "", findings: [], actions: [], files: [], links: [], lessons: [], timeline: [], ...p,
});

const SEED: Incident[] = [
  base({
    ref: "INC-2026-004", title: "CDD refresh deadline missed, caught before exposure", category: "Near-miss", severity: "Medium", status: "Investigating",
    occurred: "2026-08-14", reported: "2026-08-18", linkedAudit: "AML/CFT Audit (F-01)",
    description: "A scheduled CDD refresh for a high-risk client was missed by 4 days before being caught by the fortnightly compliance sweep. The refresh was due on 14 August 2026 for client TRU-0147 (High Risk, annual refresh cycle). No transactions were processed during the 4-day gap, and no regulatory or transactional exposure resulted.",
    investigationNotes: "Root cause review of the CDD refresh tracking process is underway. Initial assessment suggests the reminder was routed to a shared inbox that was not monitored during a staff absence period (12–16 August).",
    impact: { financial: "None", regulatory: "None (caught pre-exposure)", client: "None", reputational: "None" },
    rootCauses: ["Process failure", "People / resourcing"],
    rootNarrative: "The CDD refresh reminder was generated automatically on 7 August (7 days before the deadline) and sent to the compliance shared inbox. The Compliance Officer was on planned leave from 12–16 August with no backup monitoring. The fortnightly sweep on 18 August caught the overdue item. Underlying issue: single point of failure — reminders go to one inbox with no escalation path.",
    policies: ["AML/CFT Policy (s.4 CDD)", "CDD Procedures SOP", "Staff Absence Protocol"],
    findings: [
      { ref: "F-01", finding: "No backup monitoring for compliance shared inbox during staff absence", severity: "Medium", action: "Implement backup notification routing" },
      { ref: "F-02", finding: "CDD reminder has no escalation path if unactioned within 48 hours", severity: "Medium", action: "Update CDD procedures with escalation trigger" },
      { ref: "F-03", finding: "Fortnightly sweep frequency allowed a 4-day gap before detection", severity: "Low", action: "Increase sweep frequency for high-risk clients" },
    ],
    actions: [
      { action: "Complete CDD refresh for client TRU-0147", owner: "Compliance Officer", due: "2026-08-25", status: "Done" },
      { action: "Review shared inbox monitoring during staff absence", owner: "IT Manager", due: "2026-08-30", status: "In progress" },
      { action: "Implement backup notification routing for CDD alerts", owner: "IT Manager", due: "2026-09-15", status: "Pending" },
      { action: "Update CDD procedures to add escalation for overdue items", owner: "Compliance Officer", due: "2026-09-30", status: "Pending" },
    ],
    files: [
      { name: "CDD_Sweep_Report_18Aug2026.pdf", type: "PDF", by: "Compliance Officer", date: "2026-08-18", size: "142 KB" },
      { name: "Client_TRU-0147_Risk_Profile.pdf", type: "PDF", by: "Compliance Officer", date: "2026-08-20", size: "89 KB" },
      { name: "Shared_Inbox_Audit_Log.xlsx", type: "Excel", by: "IT Manager", date: "2026-08-22", size: "34 KB" },
    ],
    links: [{ type: "Audit", label: "AML/CFT Compliance Audit 2026, Finding F-01" }, { type: "Risk", label: "RSK-001: Regulatory sanction for AML non-compliance" }, { type: "Policy", label: "AML/CFT Policy v5" }],
    lessons: [
      { title: "Single-point-of-failure in compliance monitoring", category: "Process", detail: "Critical compliance deadlines must not depend on a single person or notification channel. A secondary escalation path must be configured.", by: "Compliance Officer", date: "2026-08-22" },
      { title: "Sweep frequency should scale with risk tier", category: "Control design", detail: "Consider daily or weekly automated checks specifically for high-risk CDD deadlines.", by: "Rudo Sibanda", date: "2026-08-23" },
    ],
    timeline: [
      { at: "18 Aug 2026, 09:14", event: "Incident reported by Compliance Officer", detail: "Category: Near-miss · Severity: Medium" },
      { at: "18 Aug 2026, 10:30", event: "Assigned to Compliance Officer for investigation" },
      { at: "18 Aug 2026, 14:00", event: "Status changed to Under investigation" },
      { at: "20 Aug 2026, 11:00", event: "Attachment added: Client_TRU-0147_Risk_Profile.pdf" },
      { at: "22 Aug 2026, 15:45", event: "Lesson captured: Single-point-of-failure in compliance monitoring" },
      { at: "25 Aug 2026, 10:00", event: "Action completed: CDD refresh for client TRU-0147" },
    ],
  }),
  base({ ref: "INC-2026-003", title: "Client statement sent to outdated email address", category: "Data incident", severity: "Low", status: "Closed", occurred: "2026-07-01", reported: "2026-07-02", description: "Quarterly statement emailed to a client's former address. Recipient confirmed deletion.", rootCauses: ["Process failure"], timeline: [{ at: "2 Jul 2026", event: "Incident reported" }, { at: "9 Jul 2026", event: "Closed — client contact records updated" }] }),
  base({ ref: "INC-2026-002", title: "Client complaint: fund redemption processing delay", category: "Complaint (client)", severity: "Medium", status: "Closed", occurred: "2026-05-08", reported: "2026-05-10", description: "Redemption processed 6 days after request against a 3-day SLA.", rootCauses: ["People / resourcing"], timeline: [{ at: "10 May 2026", event: "Complaint logged" }, { at: "24 May 2026", event: "Closed — client compensated, SLA monitoring added" }] }),
  base({ ref: "INC-2026-001", title: "Code of Conduct acknowledgement overdue (staff)", category: "Policy breach", severity: "Low", status: "Open", occurred: "2026-03-15", reported: "2026-03-15", description: "Two staff members had not acknowledged the updated Code of Conduct by the deadline.", policies: ["Code of Conduct"], timeline: [{ at: "15 Mar 2026", event: "Incident reported" }] }),
];

const sevV = (s: string) => (s === "Critical" || s === "High" ? "destructive" : s === "Medium" ? "secondary" : "outline") as any;
const stV = (s: Status) => (s === "Closed" ? "default" : s === "Investigating" ? "secondary" : "outline") as any;
const stamp = () => new Date().toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function IncidentsBreaches() {
  const [list, setList] = usePersistentState<Incident[]>("grc_incidents_breaches_v1", SEED);
  const [openRef, setOpenRef] = useState<string | null>(null);
  const [filter, setFilter] = useState<"All" | Status>("All");
  const [reportOpen, setReportOpen] = useState(false);

  const update = (ref: string, fn: (i: Incident) => Incident) => setList((l) => l.map((i) => (i.ref === ref ? fn(i) : i)));
  const open = list.find((i) => i.ref === openRef);
  if (open) return <Detail inc={open} onBack={() => setOpenRef(null)} update={(fn) => update(open.ref, fn)} />;

  const closed = list.filter((i) => i.status === "Closed");
  const avg = closed.length ? Math.round(closed.reduce((a, i) => a + (i.timeline.length ? 12 : 0), 0) / closed.length) : 0;
  const shown = list.filter((i) => filter === "All" || i.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div><h1 className="text-2xl font-bold">Incidents & Breaches</h1><p className="text-sm text-muted-foreground">Report, investigate, and remediate compliance incidents, near-misses, and policy breaches.</p></div>
        <Button onClick={() => setReportOpen(true)}><Plus className="h-4 w-4 mr-1" />Report incident</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Total incidents YTD", list.length], ["Open / Investigating", list.length - closed.length], ["Closed", closed.length], ["Avg resolution", `${avg || "—"} days`]].map(([l, v]) => (
          <Card key={l as string}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{l}</div><div className="text-2xl font-bold mt-1">{v}</div></CardContent></Card>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap">
        {(["All", "Open", "Investigating", "Closed"] as const).map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>{s} ({s === "All" ? list.length : list.filter((i) => i.status === s).length})</Button>
        ))}
      </div>
      <Card><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Description</TableHead><TableHead>Category</TableHead><TableHead>Severity</TableHead><TableHead>Reported</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>{shown.map((i) => (
            <TableRow key={i.ref} className="cursor-pointer" onClick={() => setOpenRef(i.ref)}>
              <TableCell className="font-mono text-xs">{i.ref}</TableCell><TableCell className="font-medium">{i.title}</TableCell><TableCell>{i.category}</TableCell>
              <TableCell><Badge variant={sevV(i.severity)}>{i.severity}</Badge></TableCell><TableCell>{fmtDate(i.reported)}</TableCell>
              <TableCell><Badge variant={stV(i.status)}>{i.status}</Badge></TableCell><TableCell><Button size="sm" variant="ghost">Open</Button></TableCell>
            </TableRow>
          ))}
            {!shown.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No incidents.</TableCell></TableRow>}</TableBody></Table>
      </CardContent></Card>
      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} nextRef={`INC-${new Date().getFullYear()}-${String(list.length + 1).padStart(3, "0")}`}
        onSubmit={(inc) => { setList((l) => [inc, ...l]); setReportOpen(false); toast({ title: "Incident reported", description: `${inc.ref} logged and assigned for investigation.` }); }} />
    </div>
  );
}

function Detail({ inc, onBack, update }: { inc: Incident; onBack: () => void; update: (fn: (i: Incident) => Incident) => void }) {
  const [act, setAct] = useState({ action: "", owner: "", due: "" });
  const [fnd, setFnd] = useState({ finding: "", severity: "Medium" as Severity, action: "" });
  const [lesson, setLesson] = useState({ title: "", category: "Process", detail: "" });
  const log = (event: string, detail?: string) => (i: Incident) => ({ ...i, timeline: [...i.timeline, { at: stamp(), event, detail }] });
  const set = (p: Partial<Incident>, event?: string) => update((i) => { const n = { ...i, ...p }; return event ? log(event)(n) : n; });

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" />Back to Incidents & Breaches</Button>
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <div className="flex gap-2 mb-1"><Badge variant="outline">{inc.category}</Badge><Badge variant={sevV(inc.severity)}>{inc.severity}</Badge><Badge variant={stV(inc.status)}>{inc.status === "Investigating" ? "Under investigation" : inc.status}</Badge></div>
          <h1 className="text-2xl font-bold">{inc.ref} · {inc.title}</h1>
          <p className="text-sm text-muted-foreground">Reported by: {inc.anonymous ? "Anonymous" : inc.reportedBy} · {fmtDate(inc.reported)} · Assigned to: {inc.assignedTo} · Escalated: {inc.escalatedTo === "—" ? "No" : inc.escalatedTo}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {inc.escalatedTo === "—" && <Button variant="outline" onClick={() => set({ escalatedTo: "Managing Partner" }, "Escalated to Managing Partner")}><ShieldAlert className="h-4 w-4 mr-1" />Escalate</Button>}
          {inc.status === "Open" && <Button onClick={() => set({ status: "Investigating" }, "Status changed to Under investigation")}>Start investigation</Button>}
          {inc.status === "Investigating" && <Button onClick={() => {
            if (inc.actions.some((a) => a.status !== "Done")) return toast({ title: "Open remediation actions", description: "Complete all actions before closing.", variant: "destructive" });
            set({ status: "Closed" }, "Incident closed");
          }}>Close incident</Button>}
          {inc.status === "Closed" && <Button variant="outline" onClick={() => set({ status: "Investigating" }, "Incident reopened")}>Reopen</Button>}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-4">
        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap h-auto">
            {["Overview", "Investigation", "Documents", "Lessons learned", "Activity"].map((t) => <TabsTrigger key={t} value={t.toLowerCase().split(" ")[0]}>{t}</TabsTrigger>)}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card><CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader><CardContent className="text-sm space-y-3">
              <p>{inc.description || "—"}</p>
              {inc.immediateActions && <div><div className="font-semibold text-xs mb-1">Immediate actions taken</div><p>{inc.immediateActions}</p></div>}
              <div><div className="font-semibold text-xs mb-1">Investigation notes</div>
                <Textarea rows={3} value={inc.investigationNotes} onChange={(e) => set({ investigationNotes: e.target.value })} /></div>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Remediation actions</CardTitle></CardHeader><CardContent className="space-y-3">
              <Table><TableHeader><TableRow><TableHead>Action</TableHead><TableHead>Owner</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>{inc.actions.map((a, idx) => (
                  <TableRow key={idx}><TableCell className="font-medium">{a.action}</TableCell><TableCell>{a.owner}</TableCell><TableCell>{fmtDate(a.due)}</TableCell>
                    <TableCell><Select value={a.status} onValueChange={(v: any) => update((i) => log(v === "Done" ? `Action completed: ${a.action}` : `Action ${a.action} → ${v}`)({ ...i, actions: i.actions.map((x, j) => (j === idx ? { ...x, status: v } : x)) }))}>
                      <SelectTrigger className="h-7 w-[120px]"><SelectValue /></SelectTrigger><SelectContent>{["Pending", "In progress", "Done"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></TableCell></TableRow>
                ))}
                  {!inc.actions.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No actions yet.</TableCell></TableRow>}</TableBody></Table>
              <div className="flex gap-2 flex-wrap">
                <Input className="flex-1 min-w-[180px]" placeholder="Action" value={act.action} onChange={(e) => setAct({ ...act, action: e.target.value })} />
                <Input className="w-36" placeholder="Owner" value={act.owner} onChange={(e) => setAct({ ...act, owner: e.target.value })} />
                <Input className="w-36" type="date" value={act.due} onChange={(e) => setAct({ ...act, due: e.target.value })} />
                <Button onClick={() => { if (!act.action) return; update((i) => log(`Action added: ${act.action}`)({ ...i, actions: [...i.actions, { ...act, owner: act.owner || i.assignedTo, status: "Pending" }] })); setAct({ action: "", owner: "", due: "" }); }}><Plus className="h-4 w-4" /></Button>
              </div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="investigation" className="space-y-4">
            <Card><CardHeader><CardTitle className="text-base">Impact assessment</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3">
              {(["financial", "regulatory", "client", "reputational"] as const).map((k) => (
                <div key={k}><Label className="text-xs capitalize">{k} impact</Label><Input value={inc.impact[k]} onChange={(e) => set({ impact: { ...inc.impact, [k]: e.target.value } })} /></div>
              ))}
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Root cause analysis</CardTitle></CardHeader><CardContent className="space-y-3">
              <div><Label className="text-xs">Root cause category</Label><div className="flex flex-wrap gap-2 mt-1">{ROOT.map((r) => (
                <Button key={r} size="sm" variant={inc.rootCauses.includes(r) ? "default" : "outline"} onClick={() => set({ rootCauses: inc.rootCauses.includes(r) ? inc.rootCauses.filter((x) => x !== r) : [...inc.rootCauses, r] })}>{r}</Button>
              ))}</div></div>
              <div><Label className="text-xs">Detailed root cause narrative</Label><Textarea rows={5} value={inc.rootNarrative} onChange={(e) => set({ rootNarrative: e.target.value })} /></div>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Investigation findings</CardTitle></CardHeader><CardContent className="space-y-3">
              <Table><TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Finding</TableHead><TableHead>Severity</TableHead><TableHead>Linked action</TableHead></TableRow></TableHeader>
                <TableBody>{inc.findings.map((f) => <TableRow key={f.ref}><TableCell>{f.ref}</TableCell><TableCell className="font-medium">{f.finding}</TableCell><TableCell><Badge variant={sevV(f.severity)}>{f.severity}</Badge></TableCell><TableCell className="text-xs">{f.action}</TableCell></TableRow>)}
                  {!inc.findings.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No findings yet.</TableCell></TableRow>}</TableBody></Table>
              <div className="flex gap-2 flex-wrap">
                <Input className="flex-1 min-w-[200px]" placeholder="Finding" value={fnd.finding} onChange={(e) => setFnd({ ...fnd, finding: e.target.value })} />
                <Select value={fnd.severity} onValueChange={(v: Severity) => setFnd({ ...fnd, severity: v })}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent>{["Critical", "High", "Medium", "Low"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                <Input className="w-48" placeholder="Linked action" value={fnd.action} onChange={(e) => setFnd({ ...fnd, action: e.target.value })} />
                <Button onClick={() => { if (!fnd.finding) return; update((i) => log(`Finding added: ${fnd.finding}`)({ ...i, findings: [...i.findings, { ref: `F-${String(i.findings.length + 1).padStart(2, "0")}`, ...fnd }] })); setFnd({ finding: "", severity: "Medium", action: "" }); }}><Plus className="h-4 w-4 mr-1" />Add finding</Button>
              </div>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Policies and controls affected</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">
              {inc.policies.map((p) => <Badge key={p} variant="secondary">{p}</Badge>)}{!inc.policies.length && <span className="text-sm text-muted-foreground">None identified.</span>}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card><CardHeader className="flex-row justify-between items-center space-y-0"><CardTitle className="text-base">Attached documents</CardTitle>
              <label className="cursor-pointer"><input type="file" className="hidden" multiple onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (!files.length) return;
                update((i) => log(`Attachment${files.length > 1 ? "s" : ""} added: ${files.map((f) => f.name).join(", ")}`)({ ...i, files: [...i.files, ...files.map((f) => ({ name: f.name, type: f.name.split(".").pop()?.toUpperCase() ?? "File", by: "You", date: new Date().toISOString(), size: `${Math.max(1, Math.round(f.size / 1024))} KB` }))] }));
                e.target.value = "";
              }} /><span className="inline-flex items-center text-sm border rounded-md px-3 h-9"><Upload className="h-4 w-4 mr-1" />Upload file</span></label>
            </CardHeader><CardContent>
              <Table><TableHeader><TableRow><TableHead>File name</TableHead><TableHead>Type</TableHead><TableHead>Uploaded by</TableHead><TableHead>Date</TableHead><TableHead>Size</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>{inc.files.map((f, idx) => <TableRow key={idx}><TableCell className="font-medium">{f.name}</TableCell><TableCell>{f.type}</TableCell><TableCell>{f.by}</TableCell><TableCell>{fmtDate(f.date)}</TableCell><TableCell>{f.size}</TableCell><TableCell><Button size="icon" variant="ghost" onClick={() => toast({ title: "Download started", description: f.name })}><Download className="h-4 w-4" /></Button></TableCell></TableRow>)}
                  {!inc.files.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">No documents attached.</TableCell></TableRow>}</TableBody></Table>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Linked records</CardTitle></CardHeader><CardContent className="space-y-2">
              {inc.links.map((l, idx) => <div key={idx} className="flex gap-3 text-sm border rounded-lg p-2.5"><Badge variant="outline">{l.type}</Badge>{l.label}</div>)}
              {!inc.links.length && <span className="text-sm text-muted-foreground">No linked records.</span>}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="lessons" className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm"><b>Why capture lessons?</b> Lessons feed back into policy updates, training and control improvements. They are reviewed quarterly by the Compliance Committee and annually by the Board.</div>
            {inc.lessons.map((l, idx) => (
              <Card key={idx}><CardContent className="p-4 space-y-1"><div className="flex gap-2 items-center"><span className="font-semibold">{l.title}</span><Badge variant="secondary">{l.category}</Badge></div><p className="text-sm">{l.detail}</p><div className="text-xs text-muted-foreground">Added by {l.by} · {fmtDate(l.date)}</div></CardContent></Card>
            ))}
            <Card><CardHeader><CardTitle className="text-base">Add a lesson</CardTitle></CardHeader><CardContent className="space-y-3">
              <div className="grid grid-cols-[1fr_200px] gap-2">
                <div><Label className="text-xs">Lesson title</Label><Input value={lesson.title} onChange={(e) => setLesson({ ...lesson, title: e.target.value })} /></div>
                <div><Label className="text-xs">Category</Label><Select value={lesson.category} onValueChange={(v) => setLesson({ ...lesson, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LESSON_CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div><Label className="text-xs">Detail</Label><Textarea rows={3} value={lesson.detail} onChange={(e) => setLesson({ ...lesson, detail: e.target.value })} /></div>
              <Button onClick={() => { if (!lesson.title) return; update((i) => log(`Lesson captured: ${lesson.title}`)({ ...i, lessons: [...i.lessons, { ...lesson, by: "You", date: new Date().toISOString() }] })); setLesson({ title: "", category: "Process", detail: "" }); toast({ title: "Lesson saved" }); }}>Save lesson</Button>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card><CardHeader><CardTitle className="text-base">Activity timeline</CardTitle></CardHeader><CardContent className="space-y-3">
              {inc.timeline.map((t, idx) => (
                <div key={idx} className="flex gap-3 border-l-2 border-primary pl-3"><div className="text-xs text-muted-foreground w-36 shrink-0">{t.at}</div><div><div className="text-sm font-medium">{t.event}</div>{t.detail && <div className="text-xs text-muted-foreground">{t.detail}</div>}</div></div>
              ))}
            </CardContent></Card>
          </TabsContent>
        </Tabs>

        <Card className="h-fit"><CardHeader><CardTitle className="text-base">Incident properties</CardTitle></CardHeader><CardContent className="space-y-2.5 text-sm">
          {[["Reference", inc.ref], ["Date occurred", fmtDate(inc.occurred)], ["Date reported", fmtDate(inc.reported)], ["Reported by", inc.anonymous ? "Anonymous" : inc.reportedBy]].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2"><span className="text-muted-foreground">{k}</span><span className="font-medium text-right">{v}</span></div>
          ))}
          <div><Label className="text-xs">Category</Label><Select value={inc.category} onValueChange={(v) => set({ category: v })}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs">Severity</Label><Select value={inc.severity} onValueChange={(v: Severity) => set({ severity: v }, `Severity changed to ${v}`)}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent>{["Critical", "High", "Medium", "Low"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs">Assigned to</Label><Input className="h-8" value={inc.assignedTo} onChange={(e) => set({ assignedTo: e.target.value })} onBlur={() => update(log(`Assigned to ${inc.assignedTo}`))} /></div>
          <div><Label className="text-xs">Regulatory report</Label><Select value={inc.regulatoryReport} onValueChange={(v) => set({ regulatoryReport: v }, `Regulatory report: ${v}`)}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent>{["Not required", "Required — pending", "Filed with regulator"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          <div className="flex justify-between gap-2"><span className="text-muted-foreground">Escalated to</span><span className="font-medium">{inc.escalatedTo}</span></div>
          <div className="flex justify-between gap-2"><span className="text-muted-foreground">Linked audit</span><span className="font-medium text-right">{inc.linkedAudit}</span></div>
        </CardContent></Card>
      </div>
    </div>
  );
}

function ReportDialog({ open, onOpenChange, nextRef, onSubmit }: { open: boolean; onOpenChange: (o: boolean) => void; nextRef: string; onSubmit: (i: Incident) => void }) {
  const empty = { title: "", category: "", severity: "" as Severity | "", occurred: "", reported: new Date().toISOString().slice(0, 10), description: "", persons: "", clients: "", policy: "", immediateActions: "", anonymous: false, files: [] as File[] };
  const [f, setF] = useState(empty);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Report an incident</DialogTitle></DialogHeader>
        <div className="rounded-lg border bg-muted/30 p-3 text-xs flex gap-2"><Lock className="h-4 w-4 shrink-0" /><div><b>Confidential reporting.</b> Only the assigned investigator and the Managing Partner have access to incident details unless escalated.</div></div>
        <div className="space-y-3">
          <div><Label>Incident title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Category</Label><Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}><SelectTrigger><SelectValue placeholder="Select category…" /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Severity</Label><Select value={f.severity} onValueChange={(v: Severity) => setF({ ...f, severity: v })}><SelectTrigger><SelectValue placeholder="Assess severity…" /></SelectTrigger><SelectContent>
              <SelectItem value="Critical">Critical — regulatory action or material loss likely</SelectItem>
              <SelectItem value="High">High — significant impact, senior attention</SelectItem>
              <SelectItem value="Medium">Medium — moderate impact, process correction</SelectItem>
              <SelectItem value="Low">Low — minor issue, no material impact</SelectItem>
            </SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date incident occurred</Label><Input type="date" value={f.occurred} onChange={(e) => setF({ ...f, occurred: e.target.value })} /></div>
            <div><Label>Date discovered / reported</Label><Input type="date" value={f.reported} onChange={(e) => setF({ ...f, reported: e.target.value })} /></div>
          </div>
          <div><Label>Detailed description</Label><Textarea rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Persons involved</Label><Input value={f.persons} onChange={(e) => setF({ ...f, persons: e.target.value })} /></div>
            <div><Label>Clients affected (if any)</Label><Input value={f.clients} onChange={(e) => setF({ ...f, clients: e.target.value })} /></div>
          </div>
          <div><Label>Policy potentially breached</Label><Select value={f.policy} onValueChange={(v) => setF({ ...f, policy: v })}><SelectTrigger><SelectValue placeholder="Select if applicable…" /></SelectTrigger><SelectContent>{[...POLICIES, "Other (specify in description)"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Immediate actions taken</Label><Textarea rows={2} value={f.immediateActions} onChange={(e) => setF({ ...f, immediateActions: e.target.value })} /></div>
          <div><Label>Attachments</Label><Input type="file" multiple onChange={(e) => setF({ ...f, files: Array.from(e.target.files ?? []) })} /><p className="text-[11px] text-muted-foreground mt-1">PDF, Word, Excel, images. Max 10 MB per file.</p></div>
          <label className="flex gap-2 items-center text-sm"><Checkbox checked={f.anonymous} onCheckedChange={(v) => setF({ ...f, anonymous: !!v })} />I wish to report this anonymously</label>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => {
            if (!f.title || !f.category || !f.severity || !f.description) return toast({ title: "Title, category, severity and description are required", variant: "destructive" });
            onSubmit(base({
              ref: nextRef, title: f.title, category: f.category, severity: f.severity as Severity, status: "Open", occurred: f.occurred || f.reported, reported: f.reported,
              reportedBy: f.anonymous ? "Anonymous" : "You", anonymous: f.anonymous, description: f.description, persons: f.persons, clients: f.clients,
              policies: f.policy ? [f.policy] : [], immediateActions: f.immediateActions,
              files: f.files.map((x) => ({ name: x.name, type: x.name.split(".").pop()?.toUpperCase() ?? "File", by: f.anonymous ? "Anonymous" : "You", date: new Date().toISOString(), size: `${Math.max(1, Math.round(x.size / 1024))} KB` })),
              timeline: [{ at: stamp(), event: `Incident reported by ${f.anonymous ? "Anonymous" : "You"}`, detail: `Category: ${f.category} · Severity: ${f.severity}` }],
            }));
            setF(empty);
          }}>Submit incident report</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
