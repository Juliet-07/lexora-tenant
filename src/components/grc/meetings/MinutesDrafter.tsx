import { useState } from "react";
import { ArrowDown, ArrowUp, Download, FileText, Plus, Save, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePersistentState, uid } from "@/lib/grc/usePersistentState";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Meeting } from "@/lib/grc/governance-api";

type SectionKind = "Procedural" | "Noting" | "Discussion" | "Resolution";
type Outcome = "Passed" | "Not passed" | "Deferred" | "Withdrawn";
interface MinuteSection {
  id: string;
  title: string;
  kind: SectionKind;
  presenter: string;
  time: string;
  body: string;
  resolution?: { ref: string; proposedBy: string; secondedBy: string; for: number; against: number; abstained: number; outcome: Outcome };
}
const STATUSES = ["Draft", "Sent for Chair review", "Chair approved", "Tabled for Board adoption", "Adopted and signed"] as const;
type Status = (typeof STATUSES)[number];
interface MinutesDraft {
  meetingType: string;
  dateTime: string;
  venue: string;
  chair: string;
  minuteTaker: string;
  quorum: string;
  conflicts: string;
  sections: MinuteSection[];
  actions: { id: string; action: string; owner: string; due: string }[];
  preparedOn: string;
  status: Status;
  savedAt: string | null;
}

const LIBRARY: { title: string; kind: SectionKind; body: string }[] = [
  { title: "Opening, quorum, and adoption of agenda", kind: "Procedural", body: "The Chair called the meeting to order at [time] and confirmed a quorum of [X] directors present. The agenda as circulated was adopted without amendment." },
  { title: "Apologies for absence", kind: "Procedural", body: "Apologies were received from [names]." },
  { title: "Declarations of interest", kind: "Procedural", body: "No declarations of interest were made in respect of the matters on the agenda." },
  { title: "Confirmation of previous minutes and matters arising", kind: "Procedural", body: "The minutes of the meeting held on [date] were tabled and confirmed as a true record. Matters arising were noted." },
  { title: "CEO / Managing Director report", kind: "Noting", body: "" },
  { title: "Financial review", kind: "Noting", body: "" },
  { title: "Committee reports", kind: "Noting", body: "" },
  { title: "Risk and compliance update", kind: "Discussion", body: "" },
  { title: "Approval of resolution", kind: "Resolution", body: "" },
  { title: "Any other business and close", kind: "Procedural", body: "There being no further business, the Chair declared the meeting closed at [time]." },
];

const KIND_TONE: Record<SectionKind, string> = {
  Procedural: "bg-muted text-muted-foreground",
  Noting: "bg-secondary/15 text-secondary",
  Discussion: "bg-accent text-accent-foreground",
  Resolution: "bg-primary/15 text-primary",
};

const blankResolution = (n: number) => ({ ref: `RES-${new Date().getFullYear()}-${String(n).padStart(3, "0")}`, proposedBy: "", secondedBy: "", for: 0, against: 0, abstained: 0, outcome: "Passed" as Outcome });

function buildInitial(meeting: Meeting): MinutesDraft {
  const d = new Date(meeting.date);
  let t = d.getTime();
  const at = () => { const s = new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); return s; };
  const fromAgenda: MinuteSection[] = meeting.agenda.map((a, i) => {
    const time = at(); t += (a.durationMinutes || 15) * 60000;
    const low = a.title.toLowerCase();
    const kind: SectionKind = /approv|resolut|ratif|declar|adopt/.test(low) ? "Resolution" : /open|quorum|minutes|apolog|close|aob|other business/.test(low) ? "Procedural" : "Noting";
    return { id: uid("ms"), title: a.title, kind, presenter: a.presenter || "", time, body: "", resolution: kind === "Resolution" ? blankResolution(i + 1) : undefined };
  });
  const sections = fromAgenda.length ? fromAgenda : [LIBRARY[0], LIBRARY[3], LIBRARY[9]].map((l) => ({ id: uid("ms"), title: l.title, kind: l.kind, presenter: "Chair", time: "", body: l.body }));
  const present = meeting.attendancePresentIndices?.length || meeting.attendees.length;
  return {
    meetingType: meeting.type === "Committee" ? "Committee Meeting" : "Board of Directors",
    dateTime: d.toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    venue: meeting.venue || meeting.location || meeting.meetingLink || "",
    chair: meeting.chair || "",
    minuteTaker: "Company Secretary",
    quorum: `${Math.floor(meeting.attendees.length / 2) + 1} of ${meeting.attendees.length} required (${present} present)`,
    conflicts: "No conflicts of interest were declared by any director in respect of the matters on the agenda.",
    sections,
    actions: [{ id: uid("ac"), action: "", owner: "", due: "" }],
    preparedOn: "",
    status: "Draft",
    savedAt: null,
  };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br/>");

function toHtml(meeting: Meeting, m: MinutesDraft) {
  return `<h1>Minutes: ${esc(meeting.title)}</h1>
<p><b>Meeting type:</b> ${esc(m.meetingType)}<br/><b>Date and time:</b> ${esc(m.dateTime)}<br/><b>Venue:</b> ${esc(m.venue)}<br/><b>Chairperson:</b> ${esc(m.chair)}<br/><b>Minute taker:</b> ${esc(m.minuteTaker)}<br/><b>Quorum:</b> ${esc(m.quorum)}</p>
<h3>Attendance</h3><p>${meeting.attendees.map((a) => esc(`${a.name}${a.role ? ` (${a.role})` : ""}`)).join(", ") || "—"}</p>
<h3>Conflicts of interest</h3><p>${esc(m.conflicts)}</p>
${m.sections.map((s, i) => `<h3>${i + 1}. ${esc(s.title)}</h3><p>${esc(s.body || "—")}</p>${s.resolution ? `<p><i>Resolution ${esc(s.resolution.ref)} — proposed by ${esc(s.resolution.proposedBy || "—")}, seconded by ${esc(s.resolution.secondedBy || "—")}. For ${s.resolution.for}, against ${s.resolution.against}, abstained ${s.resolution.abstained}. Outcome: ${s.resolution.outcome}.</i></p>` : ""}`).join("\n")}
<h3>Action items</h3><table border="1" cellpadding="4" style="border-collapse:collapse"><tr><th>Action</th><th>Owner</th><th>Due</th></tr>${m.actions.filter((a) => a.action).map((a) => `<tr><td>${esc(a.action)}</td><td>${esc(a.owner)}</td><td>${esc(a.due)}</td></tr>`).join("")}</table>
<p><b>Prepared:</b> ${esc(m.preparedOn || "—")} · <b>Status:</b> ${m.status}</p>`;
}

export function MinutesDrafter({ meeting }: { meeting: Meeting }) {
  const { user } = useAuth();
  const key = `grc_meeting_minutes_v1:${user?.tenantId ?? user?.id ?? "guest"}:${meeting._id}`;
  const [draft, setDraft] = usePersistentState<MinutesDraft | null>(key, null);
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState({ title: "", kind: "Discussion" as SectionKind });

  const m = draft ?? buildInitial(meeting);
  const update = (patch: Partial<MinutesDraft>) => setDraft({ ...m, ...patch });
  const setSection = (id: string, patch: Partial<MinuteSection>) =>
    update({ sections: m.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const move = (i: number, dir: -1 | 1) => {
    const arr = [...m.sections]; const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]]; update({ sections: arr });
  };
  const addSection = (title: string, kind: SectionKind, body = "") => {
    if (!title.trim()) return;
    const n = m.sections.filter((s) => s.resolution).length + 1;
    update({ sections: [...m.sections, { id: uid("ms"), title: title.trim(), kind, presenter: "", time: "", body, resolution: kind === "Resolution" ? blankResolution(n) : undefined }] });
  };
  const removeSection = (id: string) => update({ sections: m.sections.filter((s) => s.id !== id) });
  const unused = LIBRARY.filter((l) => !m.sections.some((s) => s.title.toLowerCase() === l.title.toLowerCase()));

  const save = (status?: Status) => {
    setDraft({ ...m, status: status ?? m.status, savedAt: new Date().toISOString() });
    toast({ title: status ? `Status: ${status}` : "Draft saved", description: "Stored as a prototype draft on this device — nothing has been sent." });
  };
  const exportDoc = () => {
    const html = `<html><head><meta charset="utf-8"><title>${esc(meeting.title)} minutes</title></head><body>${toHtml(meeting, m)}</body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "application/msword" }));
    const a = document.createElement("a"); a.href = url; a.download = `${meeting.title.replace(/\W+/g, "_")}_minutes.doc`; a.click();
    URL.revokeObjectURL(url);
  };

  const stepIdx = STATUSES.indexOf(m.status);
  const steps = [
    ["Meeting held", "Attendance, quorum, conflicts noted"],
    ["Draft minutes", "Co. Secretary drafts structured minutes"],
    ["Chair review", "Chair approves draft for circulation"],
    ["Board approval", "Tabled at next meeting for adoption"],
    ["Signed and filed", "Chair signs, official record"],
  ];
  const doneUpTo = !draft ? 0 : stepIdx === 0 ? 1 : stepIdx <= 1 ? 2 : stepIdx <= 3 ? 3 : 4;
  const presentSet = new Set(meeting.attendancePresentIndices ?? []);
  const recorded = !!meeting.attendanceRecordedAt;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Minutes lifecycle</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-1">
            {steps.map(([t, s], i) => (
              <div key={t} className={`rounded-md border p-2 text-center text-xs ${i < doneUpTo ? "bg-primary/10 border-primary/40" : i === doneUpTo ? "border-primary" : "bg-muted/30"}`}>
                <div className="font-semibold">{i + 1}. {t}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{s}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-sm text-muted-foreground">
          Structured draft · <Badge variant="outline">{m.status}</Badge>
          {m.savedAt && <span className="ml-2 text-xs">saved {new Date(m.savedAt).toLocaleString("en-GB")}</span>}
        </div>
        <Button onClick={() => setOpen((v) => !v)}>
          <FileText className="h-4 w-4 mr-1" /> {open ? "Hide drafting editor" : draft ? "Continue drafting" : "Draft minutes"}
        </Button>
      </div>

      {open && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 flex-wrap">
            <div>
              <CardTitle className="text-base">Minutes drafting editor</CardTitle>
              <p className="text-xs text-muted-foreground">{meeting.title}, {m.dateTime}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => save()}><Save className="h-4 w-4 mr-1" /> Save draft</Button>
              <Button size="sm" variant="outline" onClick={() => save("Sent for Chair review")}><Send className="h-4 w-4 mr-1" /> Send for Chair review</Button>
              <Button size="sm" onClick={exportDoc}><Download className="h-4 w-4 mr-1" /> Export .doc</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label className="text-xs">Meeting type</Label>
                <Select value={m.meetingType} onValueChange={(v) => update({ meetingType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Board of Directors", "Annual General Meeting", "Extraordinary General Meeting", "Committee Meeting"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {([["dateTime", "Date and time"], ["venue", "Venue"], ["chair", "Chairperson"], ["minuteTaker", "Minute taker"], ["quorum", "Quorum"]] as const).map(([k, l]) => (
                <div key={k}><Label className="text-xs">{l}</Label><Input value={m[k]} onChange={(e) => update({ [k]: e.target.value } as Partial<MinutesDraft>)} /></div>
              ))}
            </div>

            <div>
              <Label className="text-xs">Attendance <span className="text-muted-foreground font-normal">(from the attendance register)</span></Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {meeting.attendees.map((a, i) => {
                  const here = !recorded ? null : meeting.attendanceAllPresent || presentSet.has(i);
                  return <Badge key={a.email + i} variant={here === false ? "outline" : "secondary"}>{here === null ? "?" : here ? "✓" : "✗"} {a.name}{a.role ? ` (${a.role})` : ""}</Badge>;
                })}
                {meeting.attendees.length === 0 && <span className="text-xs text-muted-foreground">No attendees on this meeting.</span>}
              </div>
            </div>

            <div>
              <Label className="text-xs">Conflicts of interest declared</Label>
              <Textarea rows={2} value={m.conflicts} onChange={(e) => update({ conflicts: e.target.value })} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Minute sections <span className="text-xs text-muted-foreground font-normal">(generated from the agenda — add or remove what applies)</span></Label>
                <span className="text-xs text-muted-foreground">{m.sections.length} section(s)</span>
              </div>
              {m.sections.map((s, i) => (
                <div key={s.id} className="rounded-lg border">
                  <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2 flex-wrap">
                    <span className="text-sm font-semibold text-muted-foreground">{i + 1}.</span>
                    <Input className="h-8 flex-1 min-w-[180px] font-medium" value={s.title} onChange={(e) => setSection(s.id, { title: e.target.value })} />
                    <Select value={s.kind} onValueChange={(v) => setSection(s.id, { kind: v as SectionKind, resolution: v === "Resolution" ? s.resolution ?? blankResolution(i + 1) : undefined })}>
                      <SelectTrigger className={`h-8 w-[130px] text-xs ${KIND_TONE[s.kind]}`}><SelectValue /></SelectTrigger>
                      <SelectContent>{(["Procedural", "Noting", "Discussion", "Resolution"] as SectionKind[]).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input className="h-8 w-[150px] text-xs" placeholder="Presenter" value={s.presenter} onChange={(e) => setSection(s.id, { presenter: e.target.value })} />
                    <Input className="h-8 w-[80px] text-xs" placeholder="Time" value={s.time} onChange={(e) => setSection(s.id, { time: e.target.value })} />
                    <Button size="icon" variant="ghost" className="h-8 w-8" disabled={i === 0} onClick={() => move(i, -1)} title="Move up"><ArrowUp className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" disabled={i === m.sections.length - 1} onClick={() => move(i, 1)} title="Move down"><ArrowDown className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeSection(s.id)} title="Remove section"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="p-3 space-y-3">
                    <Textarea rows={3} value={s.body} onChange={(e) => setSection(s.id, { body: e.target.value })}
                      placeholder={s.kind === "Resolution" ? "Record discussion leading to the resolution, including any conditions..." : "Record discussion, decisions and any amendments..."} />
                    {s.resolution && (
                      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
                        <div className="text-xs font-semibold text-primary">Resolution record</div>
                        <div className="grid gap-2 grid-cols-2 md:grid-cols-6">
                          <div><Label className="text-[11px]">Ref</Label><Input className="h-8" value={s.resolution.ref} onChange={(e) => setSection(s.id, { resolution: { ...s.resolution!, ref: e.target.value } })} /></div>
                          <div><Label className="text-[11px]">Proposed by</Label><Input className="h-8" value={s.resolution.proposedBy} onChange={(e) => setSection(s.id, { resolution: { ...s.resolution!, proposedBy: e.target.value } })} /></div>
                          <div><Label className="text-[11px]">Seconded by</Label><Input className="h-8" value={s.resolution.secondedBy} onChange={(e) => setSection(s.id, { resolution: { ...s.resolution!, secondedBy: e.target.value } })} /></div>
                          {(["for", "against", "abstained"] as const).map((k) => (
                            <div key={k}><Label className="text-[11px] capitalize">Vote: {k}</Label><Input className="h-8" type="number" min={0} value={s.resolution![k]} onChange={(e) => setSection(s.id, { resolution: { ...s.resolution!, [k]: Math.max(0, Number(e.target.value)) } })} /></div>
                          ))}
                        </div>
                        <div className="w-48">
                          <Label className="text-[11px]">Outcome</Label>
                          <Select value={s.resolution.outcome} onValueChange={(v) => setSection(s.id, { resolution: { ...s.resolution!, outcome: v as Outcome } })}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>{(["Passed", "Not passed", "Deferred", "Withdrawn"] as Outcome[]).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {m.sections.length === 0 && <p className="text-sm text-muted-foreground">No sections — add one below.</p>}

              <div className="rounded-lg border border-dashed p-3 space-y-3">
                <div className="text-xs font-semibold">Add a section</div>
                {unused.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {unused.map((l) => (
                      <Button key={l.title} size="sm" variant="outline" className="h-7 text-xs" onClick={() => addSection(l.title, l.kind, l.body)}>
                        <Plus className="h-3 w-3 mr-1" /> {l.title}
                      </Button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Input className="h-8 flex-1 min-w-[200px]" placeholder="Custom section title" value={custom.title} onChange={(e) => setCustom({ ...custom, title: e.target.value })} />
                  <Select value={custom.kind} onValueChange={(v) => setCustom({ ...custom, kind: v as SectionKind })}>
                    <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{(["Procedural", "Noting", "Discussion", "Resolution"] as SectionKind[]).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="sm" onClick={() => { addSection(custom.title, custom.kind); setCustom({ ...custom, title: "" }); }}><Plus className="h-4 w-4 mr-1" /> Add</Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Action items arising from this meeting</Label>
              <Table>
                <TableHeader><TableRow><TableHead>Action</TableHead><TableHead className="w-48">Owner</TableHead><TableHead className="w-40">Due</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
                <TableBody>
                  {m.actions.map((a) => {
                    const setA = (p: Partial<typeof a>) => update({ actions: m.actions.map((x) => (x.id === a.id ? { ...x, ...p } : x)) });
                    return (
                      <TableRow key={a.id}>
                        <TableCell><Input className="h-8" placeholder="Action description..." value={a.action} onChange={(e) => setA({ action: e.target.value })} /></TableCell>
                        <TableCell><Input className="h-8" placeholder="Owner" value={a.owner} onChange={(e) => setA({ owner: e.target.value })} /></TableCell>
                        <TableCell><Input className="h-8" type="date" value={a.due} onChange={(e) => setA({ due: e.target.value })} /></TableCell>
                        <TableCell><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => update({ actions: m.actions.filter((x) => x.id !== a.id) })}><X className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Button size="sm" variant="outline" onClick={() => update({ actions: [...m.actions, { id: uid("ac"), action: "", owner: "", due: "" }] })}><Plus className="h-4 w-4 mr-1" /> Add action</Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label className="text-xs">Date minutes prepared</Label><Input type="date" value={m.preparedOn} onChange={(e) => update({ preparedOn: e.target.value })} /></div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={m.status} onValueChange={(v) => update({ status: v as Status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">Prototype draft stored on this device until the governance service supports structured minutes. Status changes do not notify anyone.</p>
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setDraft(null); toast({ title: "Draft reset from agenda" }); }}>Reset draft from agenda</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
