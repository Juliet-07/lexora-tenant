import { useState } from "react";
import { Check, Download, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePersistentState } from "@/lib/grc/usePersistentState";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Meeting } from "@/lib/grc/governance-api";

const checklist = [
  ["Meeting properly convened", "Confirm the Articles, charter and authority of the convener."],
  ["Required notice issued on time", "Check the notice deadline and retain a dispatch record."],
  ["Agenda complete", "Confirm all necessary matters and the chair's approval."],
  ["Previous minutes and outstanding actions reviewed", "Carry forward matters arising from the last meeting."],
  ["Draft resolutions prepared", "Prepare wording for decisions requiring formal approval."],
  ["Quorum confirmed", "Check expected attendance against the required quorum."],
  ["Conflicts of interest checked", "Review standing declarations and agenda-specific interests."],
  ["Board papers reviewed and circulated", "Check every supporting document before dispatch."],
  ["Statutory and governance requirements checked", "Confirm obligations relevant to the agenda."],
  ["Post-meeting actions identified", "Plan filings, notifications and follow-up approvals."],
] as const;

type CheckRecord = { at: string; by: string };
type NoticeRecord = {
  body: string;
  minimumDays: number;
  rsvpDeadline: string;
  dispatchedAt: string | null;
  dispatchedBy: string;
  recipients: Record<string, { rsvp: "Pending" | "Confirmed" | "Apologies"; openedAt: string | null }>;
};

const formatDate = (date: string) => new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const validDate = (date: string) => !Number.isNaN(new Date(date).getTime());

export function useMeetingPreparation(meeting: Meeting) {
  const { user } = useAuth();
  const key = `grc_meeting_preparation_v1:${user?.tenantId ?? user?.id ?? "guest"}:${meeting._id}`;
  const [completed, setCompleted] = usePersistentState<Record<string, CheckRecord>>(key + ":checklist", {});
  const [notice, setNotice] = usePersistentState<NoticeRecord>(key + ":notice", {
    body: "",
    minimumDays: 14,
    rsvpDeadline: "",
    dispatchedAt: null,
    dispatchedBy: "",
    recipients: {},
  });
  return { completed, setCompleted, notice, setNotice, user };
}

export type PreparationState = ReturnType<typeof useMeetingPreparation>;

export function MeetingChecklist({ meeting, state }: { meeting: Meeting; state: PreparationState }) {
  const { completed, setCompleted, user } = state;
  const count = checklist.filter((_, i) => completed[String(i)]).length;
  return (
    <section className="space-y-4">
      <div className="border-b pb-4">
        <h2 className="font-semibold">Company Secretary pre-meeting checklist</h2>
        <p className="text-sm text-muted-foreground">Track preparation for {meeting.title}. These records are saved as demo data on this device.</p>
      </div>
      <div className="flex items-center gap-4 text-sm font-medium"><span>{count} of {checklist.length} complete</span><Progress value={count / checklist.length * 100} className="max-w-52 h-2" /></div>
      <div className="divide-y border-y">
        {checklist.map(([title, detail], i) => {
          const record = completed[String(i)];
          return <div key={title} className="flex gap-3 py-3">
            <Button type="button" variant={record ? "default" : "outline"} size="icon" className="h-7 w-7 shrink-0" aria-label={`${record ? "Undo" : "Complete"} ${title}`} onClick={() => setCompleted(prev => {
              const next = { ...prev };
              if (next[String(i)]) delete next[String(i)];
              else next[String(i)] = { at: new Date().toISOString(), by: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Company Secretary" };
              return next;
            })}>{record && <Check className="h-4 w-4" />}</Button>
            <div><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground">{detail}</p>{record && <p className="text-xs text-success mt-1">Completed {formatDate(record.at)} · {record.by}</p>}</div>
          </div>;
        })}
      </div>
    </section>
  );
}

export function MeetingNotice({ meeting, state }: { meeting: Meeting; state: PreparationState }) {
  const { notice, setNotice, user } = state;
  const [draft, setDraft] = useState<string | null>(null);
  const meetingDate = new Date(meeting.date);
  const deadline = new Date(meetingDate);
  deadline.setDate(deadline.getDate() - notice.minimumDays);
  const sender = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Company Secretary";
  const defaultBody = `NOTICE OF ${meeting.type.toUpperCase()} MEETING\n\nDear colleague,\n\nNotice is hereby given that ${meeting.title} will be held on ${validDate(meeting.date) ? formatDate(meeting.date) : meeting.date} at ${validDate(meeting.date) ? meetingDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "the scheduled time"}.\n\nVenue: ${meeting.location || meeting.venue || meeting.meetingLink || "To be confirmed"}\n\nAgenda: ${meeting.agenda.length ? meeting.agenda.map((a, i) => `${i + 1}. ${a.title}`).join("; ") : "To follow"}\n\nThe board pack will follow. Please declare any conflicts of interest in advance and confirm your attendance or apologies${notice.rsvpDeadline ? ` by ${notice.rsvpDeadline}` : ""}.\n\nYours faithfully,\n${sender}\nCompany Secretary`;
  const body = draft ?? (notice.body || defaultBody);
  const sent = notice.dispatchedAt;
  const download = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const page = w.document.createElement("pre");
    page.style.cssText = "white-space:pre-wrap;font:16px/1.6 Georgia,serif;max-width:720px;margin:48px auto";
    page.textContent = body;
    w.document.body.appendChild(page);
    w.document.title = `${meeting.title} — Notice`;
    w.document.close();
    w.print();
  };
  return <section className="space-y-5">
    <div className="border-b pb-4"><h2 className="font-semibold">Meeting notice preparation and dispatch</h2><p className="text-sm text-muted-foreground">Draft and track the formal notice. Dispatch and recipient activity here are demo records only; no email is sent.</p></div>
    <div className="grid gap-5 lg:grid-cols-2">
      <Card><CardHeader><CardTitle className="text-base">Notice timeline</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
        <div className="flex justify-between gap-2"><span>Meeting date</span><strong>{validDate(meeting.date) ? formatDate(meeting.date) : meeting.date}</strong></div>
        <div><Label htmlFor="minimum-notice">Minimum notice (calendar days)</Label><Input id="minimum-notice" type="number" min={0} max={365} value={notice.minimumDays} onChange={e => setNotice(prev => ({ ...prev, minimumDays: Math.min(365, Math.max(0, Number(e.target.value) || 0)) }))} className="mt-1 w-28" /></div>
        <div className="flex justify-between gap-2"><span>Notice deadline</span><strong>{validDate(meeting.date) ? formatDate(deadline.toISOString()) : "—"}</strong></div>
        <div><Label htmlFor="rsvp-deadline">RSVP deadline</Label><Input id="rsvp-deadline" type="date" className="mt-1 max-w-52" value={notice.rsvpDeadline} onChange={e => setNotice(prev => ({ ...prev, rsvpDeadline: e.target.value }))} /></div>
        <div className="flex justify-between gap-2"><span>Dispatch</span><span>{sent ? `${formatDate(sent)} · ${notice.dispatchedBy}` : "Not recorded"}</span></div>
        {sent && new Date(sent) > deadline && <p className="text-warning">Recorded after the configured deadline.</p>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Notice content</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{["Date, time and venue / virtual link", "Draft agenda or business summary", "Proxy form, if applicable", "Conflict of interest reminder", "RSVP request and deadline", "Board pack to follow"].map(item => <p key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-success shrink-0" />{item}</p>)}</CardContent></Card>
    </div>
    <div className="space-y-2"><Label htmlFor="notice-body">Draft notice</Label><Textarea id="notice-body" className="min-h-64 font-serif leading-relaxed" value={body} onChange={e => setDraft(e.target.value)} /><div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => { setNotice(prev => ({ ...prev, body })); setDraft(null); toast({ title: "Notice draft saved" }); }}>Save draft</Button>
      <Button variant="outline" onClick={download}><Download className="h-4 w-4 mr-2" />Print / save PDF</Button>
      <Button disabled={!meeting.attendees.length || !body.trim()} onClick={() => { setNotice(prev => ({ ...prev, body, dispatchedAt: new Date().toISOString(), dispatchedBy: sender, recipients: Object.fromEntries(meeting.attendees.map(a => [a.email, prev.recipients[a.email] ?? { rsvp: "Pending", openedAt: null }])) })); setDraft(null); toast({ title: "Demo dispatch recorded", description: "No email was sent. Recipient status is simulated here." }); }}><Send className="h-4 w-4 mr-2" />{sent ? "Record re-dispatch (demo)" : "Record dispatch (demo)"}</Button>
    </div></div>
    <div className="space-y-3"><h3 className="font-semibold">Recipients and dispatch status</h3><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Recipient</TableHead><TableHead>Role</TableHead><TableHead>Email</TableHead><TableHead>Dispatched</TableHead><TableHead>Opened</TableHead><TableHead>RSVP (demo)</TableHead></TableRow></TableHeader><TableBody>{meeting.attendees.map(a => { const recipient = notice.recipients[a.email]; return <TableRow key={a.email}><TableCell className="font-medium">{a.name}</TableCell><TableCell>{a.role}</TableCell><TableCell>{a.email}</TableCell><TableCell>{sent ? <Badge variant="secondary">{formatDate(sent)}</Badge> : "—"}</TableCell><TableCell><Button size="sm" variant="ghost" disabled={!sent} onClick={() => setNotice(prev => ({ ...prev, recipients: { ...prev.recipients, [a.email]: { rsvp: prev.recipients[a.email]?.rsvp ?? "Pending", openedAt: prev.recipients[a.email]?.openedAt ? null : new Date().toISOString() } } }))}>{recipient?.openedAt ? formatDate(recipient.openedAt) : "Mark opened"}</Button></TableCell><TableCell><Select disabled={!sent} value={recipient?.rsvp ?? "Pending"} onValueChange={(rsvp: "Pending" | "Confirmed" | "Apologies") => setNotice(prev => ({ ...prev, recipients: { ...prev.recipients, [a.email]: { rsvp, openedAt: prev.recipients[a.email]?.openedAt ?? null } } }))}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Confirmed">Confirmed</SelectItem><SelectItem value="Apologies">Apologies</SelectItem></SelectContent></Select></TableCell></TableRow>; })}</TableBody></Table></div></div>
  </section>;
}
