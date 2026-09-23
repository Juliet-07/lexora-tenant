import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Check, Package, Mail, FileText, Download, Plus, Settings2, AlertTriangle, Circle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/RichTextEditor";
import { usePersistentState, uid } from "@/lib/grc/usePersistentState";
import type { Meeting } from "@/lib/grc/governance-api";

// ─── Types for workflow data not yet covered by the API ────────────────
interface ChecklistItem { id: string; title: string; detail: string; done: boolean; by?: string; at?: string }
interface Recipient { name: string; role: string; email: string; dispatched?: string; opened?: string; rsvp: "Confirmed" | "Pending" | "Declined" }
interface Conflict { status: string; items: string[]; nature: string; action: string }
interface MinuteSection { title: string; type: string; body: string; resolution?: { ref: string; proposed: string; seconded: string; for: string; against: string; abstain: string; outcome: string } }
export interface ActionItem { id: string; action: string; source: string; owner: string; due: string; status: "Not started" | "In progress" | "Draft" | "Overdue" | "Done" }
interface PostAction { action: string; trigger: string; owner: string; deadline: string; type: string; done?: boolean }

interface WorkspaceState {
  checklist: ChecklistItem[];
  notice: string;
  recipients: Recipient[];
  cover: string;
  packDispatched?: string;
  packAcks: Record<string, string>;
  conflicts: Record<string, Conflict>;
  minutesStatus: string;
  minuteSections: MinuteSection[];
  conflictsText: string;
  actions: ActionItem[];
  postActions: PostAction[];
  expected: { name: string; agendaRef: string; from: string; due: string }[];
}

const CHECKLIST: Omit<ChecklistItem, "id" | "done">[] = [
  { title: "Meeting properly convened per Articles and applicable procedures", detail: "Verified against Articles of Incorporation §12, Board Charter §4.1. Convened by Chair through Company Secretary." },
  { title: "Required notices issued within applicable timeline", detail: "14 calendar days' notice per Board Charter §4.2." },
  { title: "Agenda complete with all necessary matters", detail: "Chair approved final agenda." },
  { title: "Previous minutes reviewed and follow-up on outstanding action points", detail: "Previous minutes approved; outstanding action items carried forward." },
  { title: "Draft resolutions for matters requiring Board approval prepared", detail: "Draft resolutions prepared for each resolution-type agenda item." },
  { title: "Quorum confirmed — required attendance will be present", detail: "Quorum: majority of directors, at least one independent." },
  { title: "Conflicts of interest or disclosures identified", detail: "Conflict check against agenda items; standing declaration register reviewed." },
  { title: "Board papers and supporting documents reviewed and circulated", detail: "Board pack circulated at least 7 days before the meeting." },
  { title: "Statutory, regulatory, or governance requirements checked", detail: "Confirm Companies Act requirements and BNR notification obligations." },
  { title: "Post-meeting actions identified — approvals, filings, notifications", detail: "Prepare post-meeting action list (regulatory filings, register updates)." },
];

const DEFAULT_POST: PostAction[] = [
  { action: "Draft meeting minutes", trigger: "Meeting conclusion", owner: "Company Secretary", deadline: "Within 7 days", type: "Internal" },
  { action: "File BNR notification — interim dividend", trigger: "If dividend resolution passes", owner: "Company Secretary", deadline: "Within 14 days", type: "Regulatory" },
  { action: "Update resolution register", trigger: "Any resolution passed", owner: "Company Secretary", deadline: "Same day", type: "Internal" },
  { action: "Circulate adopted policies for acknowledgement", trigger: "If policy ratified", owner: "Compliance", deadline: "Within 3 days", type: "Governance" },
  { action: "Publish ratified code on Governance Codes", trigger: "If policy ratified", owner: "Company Secretary", deadline: "Same day", type: "Governance" },
  { action: "Update dividend register & shareholder notification", trigger: "If dividend approved", owner: "CFO", deadline: "Within 7 days", type: "Corporate" },
  { action: "Distribute approved minutes to all directors", trigger: "Chair sign-off on minutes", owner: "Company Secretary", deadline: "Within 2 days of sign-off", type: "Internal" },
];

const MINUTES_STAGES = ["Draft", "Sent for Chair review", "Chair approved", "Tabled for Board adoption", "Adopted and signed"];

const PAST_MINUTES = [
  ["Q2 Board of Directors Meeting", "10 Jun 2026", "Board", "RES-2026-018, RES-2026-019"],
  ["Q1 Board of Directors Meeting", "12 Mar 2026", "Board", "RES-2026-014, RES-2026-015"],
  ["Audit Committee: Q1 Review", "5 Mar 2026", "Committee", "None"],
  ["Q4 2025 Board of Directors Meeting", "8 Dec 2025", "Board", "RES-2025-012, RES-2025-013"],
  ["Annual General Meeting 2025", "15 Nov 2025", "AGM", "RES-AGM-2025-001 to 005"],
  ["Extraordinary Board Meeting: KIFC Licence", "18 Jul 2025", "EGM", "RES-2025-008"],
];

const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const today = () => fmt(new Date());

function buildInitial(m: Meeting): WorkspaceState {
  const date = new Date(m.date);
  const upcoming = date.getTime() > Date.now();
  const doneCount = m.status === "Held" ? 10 : m.status === "Sent" ? 7 : 3;
  return {
    checklist: CHECKLIST.map((c, i) => ({ ...c, id: `c${i}`, done: i < doneCount, by: i < doneCount ? "Company Secretary" : undefined, at: i < doneCount ? today() : undefined })),
    notice: `<h3>Notice of ${m.type} Meeting</h3><p>Dear Director,</p><p>Notice is hereby given that a meeting of the ${m.type === "Board" ? "Board of Directors" : m.type} will be held as follows:</p><p><b>Date:</b> ${fmt(date)}<br/><b>Time:</b> ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}<br/><b>Venue:</b> ${m.location || m.venue || "TBC"}</p><p>The draft agenda is attached. The board pack will be circulated no later than 7 days before the meeting.</p><p>Directors are reminded of their obligation to declare any conflicts of interest in respect of any matter on the agenda.</p><p>Please confirm your attendance or tender your apologies to the Company Secretary.</p><p>Yours faithfully,<br/>Company Secretary</p>`,
    recipients: (m.attendees.length ? m.attendees : [{ name: m.chair, email: "", role: "Chair" }]).map((a, i) => ({
      name: a.name, role: a.role || "Director", email: a.email,
      dispatched: m.sentAt ? fmt(new Date(m.sentAt)) : undefined,
      opened: m.sentAt && i % 5 !== 4 ? fmt(new Date(m.sentAt)) : undefined,
      rsvp: m.sentAt ? (i % 5 === 4 ? "Pending" : "Confirmed") : "Pending",
    })),
    cover: `<h3>Board Pack — Executive Summary</h3><p><i>${m.title} · ${fmt(date)} · Prepared by the Company Secretary</i></p><p>Dear Directors,</p><p>Please find enclosed the board pack. This summary provides an overview of the key matters for your attention and highlights items requiring a decision.</p><p><b>Matters for decision:</b></p><ol>${m.agenda.slice(0, 2).map((a) => `<li>${a.title}</li>`).join("") || "<li>[Resolution item]</li>"}</ol><p><b>Matters for noting:</b></p><ol>${m.agenda.slice(2).map((a) => `<li>${a.title}</li>`).join("") || "<li>[Noting item]</li>"}</ol><p><b>Reading guidance:</b> Directors are encouraged to focus on the resolution papers ahead of the meeting.</p><p>Company Secretary</p>`,
    packAcks: {},
    conflicts: {},
    minutesStatus: m.minutes ? "Sent for Chair review" : "Draft",
    minuteSections: (m.agenda.length ? m.agenda : [{ title: "Opening, quorum, and adoption of agenda" }, { title: "Any other business & close" }]).map((a: any, i) => ({
      title: a.title,
      type: /approv|ratif|resolution|declar/i.test(a.title) ? "Resolution" : i === 0 ? "Procedural" : "Noting",
      body: i === 0 ? "The Chair called the meeting to order and confirmed a quorum of [X] directors present. The agenda as circulated was adopted without amendment." : "",
      resolution: /approv|ratif|resolution|declar/i.test(a.title) ? { ref: "", proposed: "", seconded: "", for: "", against: "", abstain: "", outcome: "Passed" } : undefined,
    })),
    conflictsText: "No conflicts of interest were declared by any director in respect of the matters on the agenda.",
    actions: upcoming ? [] : [
      { id: uid("act"), action: "Circulate approved minutes", source: m.title, owner: "Company Secretary", due: fmt(new Date(date.getTime() + 7 * 864e5)), status: "In progress" },
    ],
    postActions: DEFAULT_POST,
    expected: [
      { name: "Management accounts", agendaRef: "Financial review", from: "CFO", due: fmt(new Date(date.getTime() - 9 * 864e5)) },
      { name: "Committee Chair's report", agendaRef: "Committee report", from: "Committee Chair", due: fmt(new Date(date.getTime() - 8 * 864e5)) },
    ],
  };
}

function Stepper({ steps }: { steps: { label: string; sub: string; state: "done" | "current" | "todo" }[] }) {
  return (
    <div className="flex flex-wrap gap-0 border rounded-lg bg-card overflow-hidden">
      {steps.map((s, i) => (
        <div key={i} className={`flex-1 min-w-[120px] px-3 py-2.5 border-r last:border-r-0 ${s.state === "current" ? "bg-primary/10" : ""}`}>
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            {s.state === "done" ? <Check className="h-3.5 w-3.5 text-success" /> : s.state === "current" ? <Circle className="h-3.5 w-3.5 text-primary fill-primary" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className={s.state === "todo" ? "text-muted-foreground" : ""}>{s.label}</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

const rsvpVariant = (s: string) => (s === "Confirmed" ? "default" : s === "Declined" ? "destructive" : "secondary") as any;

export function MeetingWorkspace({
  meeting, onBack, onManage, isDemo,
}: { meeting: Meeting; onBack: () => void; onManage?: () => void; isDemo?: boolean }) {
  const [ws, setWs] = usePersistentState<WorkspaceState>(`grc_meeting_ws_${meeting._id}`, () => buildInitial(meeting));
  const [conflictFor, setConflictFor] = useState<string | null>(null);
  const [editNotice, setEditNotice] = useState(false);
  const [editCover, setEditCover] = useState(false);
  const [newAction, setNewAction] = useState({ action: "", owner: "", due: "" });

  const date = new Date(meeting.date);
  const doneChecks = ws.checklist.filter((c) => c.done).length;
  const quorumNeeded = Math.floor(ws.recipients.length / 2) + 1;
  const confirmed = ws.recipients.filter((r) => r.rsvp === "Confirmed").length;
  const held = meeting.status === "Held";

  const steps = useMemo(() => {
    const noticeSent = !!meeting.sentAt;
    const packSent = !!ws.packDispatched;
    const minApproved = ws.minutesStatus === "Adopted and signed";
    const minDrafted = MINUTES_STAGES.indexOf(ws.minutesStatus) >= 1;
    const flags = [true, noticeSent, noticeSent && packSent, packSent, held, minDrafted, minApproved];
    const firstTodo = flags.indexOf(false);
    const labels: [string, string][] = [
      ["Scheduled", fmt(date)], ["Notice sent", noticeSent ? fmt(new Date(meeting.sentAt!)) : "—"],
      ["Preparing pack", `Due ${fmt(new Date(date.getTime() - 7 * 864e5))}`], ["Pack dispatched", ws.packDispatched ?? "—"],
      ["Meeting held", fmt(date)], ["Minutes drafted", minDrafted ? "Yes" : "—"], ["Minutes approved", minApproved ? "Yes" : "—"],
    ];
    return labels.map(([label, sub], i) => ({ label, sub, state: (flags[i] ? "done" : i === firstTodo ? "current" : "todo") as any }));
  }, [meeting, ws, held, date]);

  const toggleCheck = (id: string) =>
    setWs((s) => ({ ...s, checklist: s.checklist.map((c) => (c.id === id ? { ...c, done: !c.done, by: !c.done ? "Company Secretary" : undefined, at: !c.done ? today() : undefined } : c)) }));

  const dispatchPack = () => {
    if (doneChecks < 7) {
      toast({ title: "Checklist incomplete", description: "Complete at least the first 7 checklist items before dispatching the pack.", variant: "destructive" });
      return;
    }
    setWs((s) => ({ ...s, packDispatched: today() }));
    toast({ title: "Board pack dispatched", description: `Sent to ${ws.recipients.length} attendees.` });
  };

  const resendPending = () => {
    const pending = ws.recipients.filter((r) => r.rsvp === "Pending");
    setWs((s) => ({ ...s, recipients: s.recipients.map((r) => (r.rsvp === "Pending" ? { ...r, dispatched: today() } : r)) }));
    toast({ title: "Reminder sent", description: `${pending.length} non-respondent(s) reminded.` });
  };

  const printHtml = (title: string, html: string) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${title}</title><style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;line-height:1.6}</style></head><body>${html}</body></html>`);
    w.document.close();
    w.print();
  };

  const packDocs = [
    ...meeting.boardPack.map((d) => ({ name: d.name, meta: `Uploaded ${d.uploadedAt ? fmt(new Date(d.uploadedAt)) : ""}`, status: "Uploaded" })),
    ...ws.expected.map((e) => ({ name: e.name, meta: `Awaiting from ${e.from} · Expected by ${e.due}`, status: "Outstanding" })),
  ];
  const uploadedCount = packDocs.filter((d) => d.status === "Uploaded").length;

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2"><ArrowLeft className="h-4 w-4 mr-1" />Back to Meetings</Button>

      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <div className="flex gap-2 mb-1">
            <Badge variant="secondary">{meeting.type === "Board" ? "Full Board" : meeting.type}</Badge>
            <Badge variant="outline">{ws.packDispatched ? "Pack dispatched" : held ? "Held" : "Board pack in preparation"}</Badge>
            {isDemo && <Badge variant="outline">Sample</Badge>}
          </div>
          <h1 className="text-2xl font-bold">{meeting.title}</h1>
          <p className="text-sm text-muted-foreground">
            {date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · {date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · {meeting.location || meeting.venue || meeting.meetingLink}
          </p>
        </div>
        <div className="flex gap-2">
          {onManage && <Button variant="outline" onClick={onManage}><Settings2 className="h-4 w-4 mr-1" />Manage meeting</Button>}
          <Button onClick={dispatchPack} disabled={!!ws.packDispatched}><Package className="h-4 w-4 mr-1" />{ws.packDispatched ? "Pack dispatched" : "Dispatch board pack"}</Button>
        </div>
      </div>

      <Stepper steps={steps} />

      <Tabs defaultValue="checklist">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="checklist">Preparation checklist</TabsTrigger>
          <TabsTrigger value="notice">Notice</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="pack">Board pack</TabsTrigger>
          <TabsTrigger value="attendance">Attendance & quorum</TabsTrigger>
          <TabsTrigger value="minutes">Minutes</TabsTrigger>
          <TabsTrigger value="actions">Actions & follow-up</TabsTrigger>
        </TabsList>

        {/* CHECKLIST */}
        <TabsContent value="checklist">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company Secretary pre-meeting checklist</CardTitle>
              <p className="text-sm text-muted-foreground">Best-practice preparation workflow aligned to King V and ISO 37000. Complete all items before dispatching the board pack.</p>
              <div className="flex items-center gap-3 pt-2">
                <Progress value={(doneChecks / ws.checklist.length) * 100} className="h-2 flex-1" />
                <span className="text-sm font-medium">{doneChecks} of {ws.checklist.length} complete</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {ws.checklist.map((c) => (
                <label key={c.id} className={`flex gap-3 p-3 rounded-lg border cursor-pointer ${c.done ? "bg-success/5 border-success/30" : ""}`}>
                  <Checkbox checked={c.done} onCheckedChange={() => toggleCheck(c.id)} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{c.title}</div>
                    <div className="text-xs text-muted-foreground">{c.detail}</div>
                    {c.done && <div className="text-[11px] text-success mt-1">Completed {c.at} — {c.by}</div>}
                  </div>
                </label>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOTICE */}
        <TabsContent value="notice" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Notice timeline</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                {[
                  ["Meeting date", fmt(date)],
                  ["Minimum notice", "14 calendar days (Board Charter §4.2)"],
                  ["Notice deadline", fmt(new Date(date.getTime() - 14 * 864e5))],
                  ["Notice sent", meeting.sentAt ? `${fmt(new Date(meeting.sentAt))} (${Math.round((date.getTime() - new Date(meeting.sentAt).getTime()) / 864e5)} days' notice)` : "Not yet sent"],
                  ["Sent by", "Company Secretary"],
                  ["Method", "Email with PDF attachment + portal notification"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b pb-1.5 last:border-0"><span className="text-muted-foreground">{k}</span><span className="font-medium text-right">{v}</span></div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Notice content</CardTitle></CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                {["Date, time and venue (including virtual link)", "Draft agenda or summary of business", "Proxy form (if applicable)", "Conflict of interest reminder", "RSVP request with deadline", "Reference to board pack to follow"].map((t) => (
                  <div key={t} className="flex gap-2 items-center"><Check className="h-4 w-4 text-success" />{t}</div>
                ))}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Draft notice</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => printHtml("Notice", ws.notice)}><FileText className="h-4 w-4 mr-1" />Preview PDF</Button>
                <Button size="sm" variant="outline" onClick={() => setEditNotice((e) => !e)}>{editNotice ? "Done" : "Edit"}</Button>
              </div>
            </CardHeader>
            <CardContent>
              {editNotice ? (
                <RichTextEditor value={ws.notice} onChange={(v) => setWs((s) => ({ ...s, notice: v }))} minHeight={260} />
              ) : (
                <div className="prose prose-sm max-w-none border rounded-lg p-5 bg-muted/20" dangerouslySetInnerHTML={{ __html: ws.notice }} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Recipients and dispatch status</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={resendPending}><Mail className="h-4 w-4 mr-1" />Resend to non-respondents</Button>
                <Button size="sm" variant="outline" onClick={() => printHtml("Notice", ws.notice)}><Download className="h-4 w-4 mr-1" />Download notice</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Recipient</TableHead><TableHead>Role</TableHead><TableHead>Email</TableHead><TableHead>Dispatched</TableHead><TableHead>Opened</TableHead><TableHead>RSVP</TableHead></TableRow></TableHeader>
                <TableBody>
                  {ws.recipients.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.role}</TableCell>
                      <TableCell className="text-muted-foreground">{r.email || "—"}</TableCell>
                      <TableCell>{r.dispatched ?? "—"}</TableCell>
                      <TableCell>{r.opened ?? <span className="text-muted-foreground">Not opened</span>}</TableCell>
                      <TableCell>
                        <Select value={r.rsvp} onValueChange={(v: any) => setWs((s) => ({ ...s, recipients: s.recipients.map((x, j) => (j === i ? { ...x, rsvp: v } : x)) }))}>
                          <SelectTrigger className="h-7 w-[120px]"><Badge variant={rsvpVariant(r.rsvp)}>{r.rsvp}</Badge></SelectTrigger>
                          <SelectContent>{["Confirmed", "Pending", "Declined"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AGENDA */}
        <TabsContent value="agenda">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Meeting agenda</CardTitle>
              <div className="flex gap-2">
                {onManage && <Button size="sm" variant="outline" onClick={onManage}>Edit agenda</Button>}
                <Button size="sm" variant="outline" onClick={() => printHtml("Agenda", `<h2>${meeting.title} — Agenda</h2><ol>${meeting.agenda.map((a) => `<li>${a.title}${a.presenter ? ` — ${a.presenter}` : ""}</li>`).join("")}</ol>`)}>Export PDF</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Agenda item</TableHead><TableHead>Presenter</TableHead><TableHead>Time</TableHead><TableHead>Type</TableHead><TableHead>Papers</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(() => {
                    let t = date.getTime();
                    return meeting.agenda.map((a: any, i) => {
                      const start = new Date(t); t += (a.minutes || 15) * 60000; const end = new Date(t);
                      const type = /approv|ratif|resolution|declar/i.test(a.title) ? "Resolution" : /opening|quorum|minutes|close|business/i.test(a.title) ? "Procedural" : "Noting";
                      const hm = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                      const paper = meeting.boardPack[i]?.name;
                      return (
                        <TableRow key={i}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell className="font-medium">{a.title}</TableCell>
                          <TableCell>{a.presenter || "—"}</TableCell>
                          <TableCell className="whitespace-nowrap">{hm(start)} – {hm(end)}</TableCell>
                          <TableCell><Badge variant={type === "Resolution" ? "default" : "outline"}>{type}</Badge></TableCell>
                          <TableCell className="text-muted-foreground text-xs">{paper || "—"}</TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                  {meeting.agenda.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No agenda items yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BOARD PACK */}
        <TabsContent value="pack" className="space-y-4">
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm flex gap-2">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
            <div><b>Board pack due: {fmt(new Date(date.getTime() - 7 * 864e5))}</b> (7 days before meeting). {uploadedCount} of {packDocs.length} required documents uploaded.</div>
          </div>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Cover page and executive summary</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => printHtml("Board pack summary", ws.cover)}><FileText className="h-4 w-4 mr-1" />Preview PDF</Button>
                <Button size="sm" variant="outline" onClick={() => setEditCover((e) => !e)}>{editCover ? "Save draft" : "Edit"}</Button>
              </div>
            </CardHeader>
            <CardContent>
              {editCover ? <RichTextEditor value={ws.cover} onChange={(v) => setWs((s) => ({ ...s, cover: v }))} minHeight={260} /> :
                <div className="prose prose-sm max-w-none border rounded-lg p-5 bg-muted/20" dangerouslySetInnerHTML={{ __html: ws.cover }} />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Pack documents</CardTitle>
              {onManage && <Button size="sm" variant="outline" onClick={onManage}><Plus className="h-4 w-4 mr-1" />Add document</Button>}
            </CardHeader>
            <CardContent className="space-y-2">
              {packDocs.map((d, i) => (
                <div key={i} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="flex gap-3 items-center"><FileText className="h-5 w-5 text-muted-foreground" /><div><div className="text-sm font-medium">{d.name}</div><div className="text-xs text-muted-foreground">{d.meta}</div></div></div>
                  <div className="flex gap-2 items-center">
                    <Badge variant={d.status === "Uploaded" ? "default" : "secondary"}>{d.status}</Badge>
                    {d.status === "Outstanding" && (
                      <Button size="sm" variant="ghost" onClick={() => { setWs((s) => ({ ...s, expected: s.expected.filter((e) => e.name !== d.name) })); toast({ title: "Marked as received" }); }}>Mark received</Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Board pack acknowledgements</CardTitle>
              <p className="text-sm text-muted-foreground">Once dispatched, each director must confirm receipt. Non-acknowledgement after 48 hours triggers an automatic reminder.</p></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Director</TableHead><TableHead>Dispatched</TableHead><TableHead>Acknowledged</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {ws.recipients.map((r) => {
                    const apiAck = meeting.acknowledgments?.find((a) => a.attendeeEmail === r.email);
                    const ack = apiAck ? fmt(new Date(apiAck.confirmedAt)) : ws.packAcks[r.name];
                    return (
                      <TableRow key={r.name}>
                        <TableCell className="font-medium">{r.name} <span className="text-muted-foreground text-xs">({r.role})</span></TableCell>
                        <TableCell>{ws.packDispatched ?? "—"}</TableCell>
                        <TableCell>{ack ?? "—"}</TableCell>
                        <TableCell>
                          {!ws.packDispatched ? <Badge variant="outline">Not yet dispatched</Badge> : ack ? <Badge>Acknowledged</Badge> :
                            <Button size="sm" variant="ghost" className="h-7" onClick={() => setWs((s) => ({ ...s, packAcks: { ...s.packAcks, [r.name]: today() } }))}>Record ack</Button>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ATTENDANCE */}
        <TabsContent value="attendance" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Quorum requirement</CardTitle></CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{quorumNeeded} <span className="text-base font-normal text-muted-foreground">of {ws.recipients.length} attendees</span></div>
                <p className="text-sm text-muted-foreground mt-1">Per Board Charter §4.3 — at least one director must be independent. RSVPs: <b>{confirmed} confirmed</b>, {ws.recipients.length - confirmed} pending.</p>
                <Badge className="mt-3" variant={confirmed >= quorumNeeded ? "default" : "destructive"}>{confirmed >= quorumNeeded ? "Quorum assured" : "Quorum at risk"}</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Meeting details</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1.5">
                {[["Date", fmt(date)], ["Location", meeting.location || "—"], ["Mode", meeting.mode], ["Type", meeting.type], ["Chair", meeting.chair], ["Secretary", "Company Secretary"]].map(([k, v]) => (
                  <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>
                ))}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Attendance register</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>RSVP</TableHead><TableHead>Attendance</TableHead><TableHead>Conflict declared</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {ws.recipients.map((r, i) => {
                    const present = meeting.attendanceRecordedAt ? (meeting.attendanceAllPresent || meeting.attendancePresentIndices?.includes(i)) : null;
                    const c = ws.conflicts[r.name];
                    return (
                      <TableRow key={r.name}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{r.role}</TableCell>
                        <TableCell><Badge variant={rsvpVariant(r.rsvp)}>{r.rsvp}</Badge></TableCell>
                        <TableCell>{present === null ? "—" : present ? <Badge>Present</Badge> : <Badge variant="secondary">Absent</Badge>}</TableCell>
                        <TableCell>{c && c.status !== "No conflict declared" ? <Badge variant="destructive">Declared</Badge> : "None"}</TableCell>
                        <TableCell><Button size="sm" variant="ghost" onClick={() => setConflictFor(r.name)}>{c ? "View" : "+ Note"}</Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {onManage && <p className="text-xs text-muted-foreground mt-3">Record actual attendance via <button className="underline" onClick={onManage}>Manage meeting</button>.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MINUTES */}
        <TabsContent value="minutes" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Minutes lifecycle</CardTitle></CardHeader>
            <CardContent>
              <Stepper steps={["Meeting held", ...MINUTES_STAGES.slice(0, 1).map(() => "Draft minutes"), "Chair review", "Board approval", "Signed and filed"].map((l, i) => {
                const idx = held ? MINUTES_STAGES.indexOf(ws.minutesStatus) + 1 : 0;
                return { label: `${i + 1}. ${l}`, sub: ["Attendance, quorum, conflicts", "Co. Secretary drafts", "Chair approves draft", "Tabled at next meeting", "Official record"][i], state: i < idx ? "done" : i === idx ? "current" : "todo" };
              })} />
              {!held && <p className="text-sm text-muted-foreground mt-3">Meeting upcoming: {fmt(date)}. Minutes drafting opens once the meeting is held — you can start a draft now.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 flex-wrap gap-2">
              <CardTitle className="text-base">Minutes drafting editor — {meeting.title}</CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => toast({ title: "Minutes draft saved" })}>Save draft</Button>
                <Button size="sm" onClick={() => { setWs((s) => ({ ...s, minutesStatus: "Sent for Chair review" })); toast({ title: "Sent to Chair for review" }); }}>Send for Chair review</Button>
                <Button size="sm" variant="outline" onClick={() => printHtml("Minutes", `<h2>Minutes — ${meeting.title}</h2><p>${ws.conflictsText}</p>${ws.minuteSections.map((s, i) => `<h3>${i + 1}. ${s.title}</h3><p>${s.body}</p>${s.resolution ? `<p><i>Resolution ${s.resolution.ref}: For ${s.resolution.for} / Against ${s.resolution.against} / Abstain ${s.resolution.abstain} — ${s.resolution.outcome}</i></p>` : ""}`).join("")}`)}>Export</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">Attendance (auto-populated from register)</Label>
                <div className="flex flex-wrap gap-2 mt-1">{ws.recipients.map((r) => <Badge key={r.name} variant="outline">{r.rsvp === "Confirmed" ? "✓" : "?"} {r.name} ({r.role})</Badge>)}</div>
              </div>
              <div>
                <Label className="text-xs">Conflicts of interest declared</Label>
                <Textarea rows={2} value={ws.conflictsText} onChange={(e) => setWs((s) => ({ ...s, conflictsText: e.target.value }))} />
              </div>
              {ws.minuteSections.map((sec, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2"><span className="font-semibold text-sm">{i + 1}. {sec.title}</span><Badge variant="outline">{sec.type}</Badge></div>
                  <Textarea rows={3} placeholder="Record discussion and decisions…" value={sec.body} onChange={(e) => setWs((s) => ({ ...s, minuteSections: s.minuteSections.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)) }))} />
                  {sec.resolution && (
                    <div className="grid grid-cols-2 md:grid-cols-7 gap-2 bg-muted/30 p-2 rounded">
                      {(["ref", "proposed", "seconded", "for", "against", "abstain"] as const).map((k) => (
                        <div key={k}><Label className="text-[10px] capitalize">{k === "ref" ? "Resolution ref" : k}</Label>
                          <Input className="h-8" value={sec.resolution![k]} onChange={(e) => setWs((s) => ({ ...s, minuteSections: s.minuteSections.map((x, j) => (j === i ? { ...x, resolution: { ...x.resolution!, [k]: e.target.value } } : x)) }))} /></div>
                      ))}
                      <div><Label className="text-[10px]">Outcome</Label>
                        <Select value={sec.resolution.outcome} onValueChange={(v) => setWs((s) => ({ ...s, minuteSections: s.minuteSections.map((x, j) => (j === i ? { ...x, resolution: { ...x.resolution!, outcome: v } } : x)) }))}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>{["Passed", "Not passed", "Deferred", "Withdrawn"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                        </Select></div>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex items-center gap-3">
                <Label className="text-xs">Status</Label>
                <Select value={ws.minutesStatus} onValueChange={(v) => setWs((s) => ({ ...s, minutesStatus: v }))}>
                  <SelectTrigger className="w-[240px] h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{MINUTES_STAGES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Past meeting minutes</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Meeting</TableHead><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Resolutions</TableHead></TableRow></TableHeader>
                <TableBody>{PAST_MINUTES.map((p) => (
                  <TableRow key={p[0]}><TableCell className="font-medium">{p[0]}</TableCell><TableCell>{p[1]}</TableCell><TableCell>{p[2]}</TableCell><TableCell><Badge>Adopted and signed</Badge></TableCell><TableCell className="text-xs text-muted-foreground">{p[3]}</TableCell></TableRow>
                ))}</TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ACTIONS */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Pre-identified post-meeting actions</CardTitle>
              <p className="text-sm text-muted-foreground">After the meeting, trigger the post-meeting workflow: minutes, action items, regulatory notifications, resolution register updates.</p></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead className="w-8" /><TableHead>Action</TableHead><TableHead>Trigger</TableHead><TableHead>Owner</TableHead><TableHead>Deadline</TableHead><TableHead>Type</TableHead></TableRow></TableHeader>
                <TableBody>{ws.postActions.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell><Checkbox checked={!!p.done} onCheckedChange={() => setWs((s) => ({ ...s, postActions: s.postActions.map((x, j) => (j === i ? { ...x, done: !x.done } : x)) }))} /></TableCell>
                    <TableCell className={`font-medium ${p.done ? "line-through text-muted-foreground" : ""}`}>{p.action}</TableCell>
                    <TableCell className="text-xs">{p.trigger}</TableCell><TableCell>{p.owner}</TableCell><TableCell>{p.deadline}</TableCell>
                    <TableCell><Badge variant={p.type === "Regulatory" ? "destructive" : "outline"}>{p.type}</Badge></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Action items arising from this meeting</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Table>
                <TableHeader><TableRow><TableHead>Action</TableHead><TableHead>Owner</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {ws.actions.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.action}</TableCell><TableCell>{a.owner}</TableCell><TableCell>{a.due}</TableCell>
                      <TableCell>
                        <Select value={a.status} onValueChange={(v: any) => setWs((s) => ({ ...s, actions: s.actions.map((x) => (x.id === a.id ? { ...x, status: v } : x)) }))}>
                          <SelectTrigger className="h-7 w-[130px]"><SelectValue /></SelectTrigger>
                          <SelectContent>{["Not started", "In progress", "Draft", "Overdue", "Done"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                  {ws.actions.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No action items yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
              <div className="flex gap-2 flex-wrap">
                <Input className="flex-1 min-w-[200px]" placeholder="Action" value={newAction.action} onChange={(e) => setNewAction({ ...newAction, action: e.target.value })} />
                <Input className="w-40" placeholder="Owner" value={newAction.owner} onChange={(e) => setNewAction({ ...newAction, owner: e.target.value })} />
                <Input className="w-40" type="date" value={newAction.due} onChange={(e) => setNewAction({ ...newAction, due: e.target.value })} />
                <Button onClick={() => {
                  if (!newAction.action.trim()) return;
                  setWs((s) => ({ ...s, actions: [...s.actions, { id: uid("act"), action: newAction.action, owner: newAction.owner || "Company Secretary", due: newAction.due ? fmt(new Date(newAction.due)) : "—", source: meeting.title, status: "Not started" }] }));
                  setNewAction({ action: "", owner: "", due: "" });
                }}><Plus className="h-4 w-4 mr-1" />Add</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConflictDialog
        name={conflictFor}
        agenda={meeting.agenda.map((a, i) => `${i + 1}. ${a.title}`)}
        value={conflictFor ? ws.conflicts[conflictFor] : undefined}
        onClose={() => setConflictFor(null)}
        onSave={(c) => { if (conflictFor) setWs((s) => ({ ...s, conflicts: { ...s.conflicts, [conflictFor]: c } })); setConflictFor(null); toast({ title: "Conflict note saved", description: "Recorded under declarations of interest." }); }}
      />
    </div>
  );
}

function ConflictDialog({ name, agenda, value, onClose, onSave }: { name: string | null; agenda: string[]; value?: Conflict; onClose: () => void; onSave: (c: Conflict) => void }) {
  const [c, setC] = useState<Conflict>({ status: "No conflict declared", items: [], nature: "", action: "Conflict noted in minutes, no recusal required" });
  const [lastName, setLastName] = useState<string | null>(null);
  if (name !== lastName) {
    setLastName(name);
    setC(value ?? { status: "No conflict declared", items: [], nature: "", action: "Conflict noted in minutes, no recusal required" });
  }
  return (
    <Dialog open={!!name} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Conflict of Interest — {name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Conflict status</Label>
            <Select value={c.status} onValueChange={(v) => setC({ ...c, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["No conflict declared", "Conflict declared — recusal required", "Conflict declared — noted, no recusal", "Standing declaration — ongoing"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><Label>Agenda items affected</Label>
            <div className="space-y-1 mt-1 max-h-32 overflow-auto">{[...agenda, "All items"].map((a) => (
              <label key={a} className="flex gap-2 items-center text-sm"><Checkbox checked={c.items.includes(a)} onCheckedChange={() => setC({ ...c, items: c.items.includes(a) ? c.items.filter((x) => x !== a) : [...c.items, a] })} />{a}</label>
            ))}</div></div>
          <div><Label>Nature of conflict</Label><Textarea rows={3} value={c.nature} onChange={(e) => setC({ ...c, nature: e.target.value })} /></div>
          <div><Label>Action to be taken</Label>
            <Select value={c.action} onValueChange={(v) => setC({ ...c, action: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Director to recuse from discussion and vote", "Director to recuse from vote only (may participate in discussion)", "Conflict noted in minutes, no recusal required", "Referred to Nominations Committee for guidance"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select></div>
          <p className="text-xs text-muted-foreground">This note is recorded in the minutes under declarations of interest and linked to the director's standing conflict register.</p>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(c)}>Save conflict note</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
