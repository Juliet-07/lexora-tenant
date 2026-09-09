import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarPlus, MessageSquarePlus, StickyNote } from "lucide-react";
import type { Lead } from "@/lib/crm/crm-pipeline-api";
import {
  addLeadNote,
  buildTimeline,
  cancelMeeting,
  completeMeeting,
  logComm,
  scheduleMeeting,
  setLeadTemperature,
  useLeadWorkspace,
  type CommChannel,
} from "@/lib/crm/leadWorkspaceStore";

const CHANNELS: { value: CommChannel; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "call", label: "Phone call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "meeting_note", label: "Meeting follow-up" },
];

const TEMPS = [
  { value: "hot", label: "🔥 Hot" },
  { value: "warm", label: "🌤 Warm" },
  { value: "cold", label: "❄️ Cold" },
] as const;

export function LeadDetailPanel({
  lead,
  onClose,
  onConvert,
  onMarkLost,
}: {
  lead: Lead | null;
  onClose: () => void;
  onConvert: (lead: Lead) => void;
  onMarkLost: (lead: Lead) => void;
}) {
  const ws = useLeadWorkspace(lead?._id ?? null);
  const [comm, setComm] = useState({
    channel: "email" as CommChannel,
    direction: "outbound" as "outbound" | "inbound",
    subject: "",
    summary: "",
  });
  const [meeting, setMeeting] = useState({
    title: "",
    date: "",
    time: "",
    mode: "virtual" as "virtual" | "physical",
    location: "",
    attendees: "",
    agenda: "",
  });
  const [note, setNote] = useState({ title: "", body: "" });
  const [outcomeFor, setOutcomeFor] = useState<string | null>(null);
  const [outcome, setOutcome] = useState("");

  if (!lead) return null;
  const title = lead.contactName || lead.companyName || "Untitled lead";
  const timeline = buildTimeline(ws);

  return (
    <Sheet open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className="capitalize">
            {lead.stage} · {lead.companyName || "No company"} ·{" "}
            {lead.source.replace("_", " ")}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="comms">Comms</TabsTrigger>
            <TabsTrigger value="meetings">Meetings</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="rounded-lg border border-border/60 divide-y">
              {[
                ["Organisation", lead.companyName ?? "—"],
                ["Contact", lead.contactName ?? "—"],
                ["Email", lead.contactEmail ?? "—"],
                ["Phone", lead.contactPhone ?? "—"],
                ["Industry", lead.industry ?? "—"],
                ["Source", lead.source.replace("_", " ")],
                ["Source note", lead.sourceNote ?? "—"],
                ["Stage", lead.stage],
                ["Status", lead.status],
                ["Created", new Date(lead.createdAt).toLocaleDateString()],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-3 py-1.5">
                  <span className="text-xs text-muted-foreground">{k}</span>
                  <span className="text-xs font-medium capitalize text-right">
                    {v}
                  </span>
                </div>
              ))}
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase text-muted-foreground mb-2">
                Temperature
              </p>
              <div className="flex gap-2">
                {TEMPS.map((t) => (
                  <Button
                    key={t.value}
                    size="sm"
                    variant={ws.temperature === t.value ? "default" : "outline"}
                    onClick={() => setLeadTemperature(lead._id, t.value)}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>

            {lead.notes && (
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Capture notes
                </p>
                <p className="text-sm mt-1">{lead.notes}</p>
              </div>
            )}

            {lead.status === "open" && (
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => onConvert(lead)}>
                  Convert to client
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onMarkLost(lead)}
                >
                  Mark lost
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Communications */}
          <TabsContent value="comms" className="mt-4 space-y-3">
            <div className="rounded-lg border border-border/60 p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Channel</Label>
                  <Select
                    value={comm.channel}
                    onValueChange={(v) =>
                      setComm({ ...comm, channel: v as CommChannel })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNELS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Direction</Label>
                  <Select
                    value={comm.direction}
                    onValueChange={(v) =>
                      setComm({ ...comm, direction: v as "outbound" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outbound">Outbound</SelectItem>
                      <SelectItem value="inbound">Inbound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Input
                placeholder="Subject"
                value={comm.subject}
                onChange={(e) => setComm({ ...comm, subject: e.target.value })}
              />
              <Textarea
                rows={3}
                placeholder="What was discussed?"
                value={comm.summary}
                onChange={(e) => setComm({ ...comm, summary: e.target.value })}
              />
              <Button
                size="sm"
                onClick={() => {
                  if (!comm.subject.trim()) return;
                  logComm(lead._id, {
                    channel: comm.channel,
                    direction: comm.direction,
                    subject: comm.subject.trim(),
                    summary: comm.summary.trim(),
                  });
                  setComm({ ...comm, subject: "", summary: "" });
                }}
              >
                <MessageSquarePlus className="h-4 w-4 mr-1" /> Log communication
              </Button>
            </div>

            {ws.comms.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No communications logged yet.
              </p>
            )}
            {ws.comms.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-border/60 p-3 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{c.subject}</p>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {c.channel.replace("_", " ")} · {c.direction}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{c.summary}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(c.at).toLocaleString()} · {c.author}
                </p>
              </div>
            ))}
          </TabsContent>

          {/* Meetings */}
          <TabsContent value="meetings" className="mt-4 space-y-3">
            <div className="rounded-lg border border-border/60 p-3 space-y-2">
              <Input
                placeholder="Meeting title"
                value={meeting.title}
                onChange={(e) =>
                  setMeeting({ ...meeting, title: e.target.value })
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={meeting.date}
                  onChange={(e) =>
                    setMeeting({ ...meeting, date: e.target.value })
                  }
                />
                <Input
                  type="time"
                  value={meeting.time}
                  onChange={(e) =>
                    setMeeting({ ...meeting, time: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={meeting.mode}
                  onValueChange={(v) =>
                    setMeeting({ ...meeting, mode: v as "virtual" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="virtual">Virtual</SelectItem>
                    <SelectItem value="physical">In person</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder={
                    meeting.mode === "virtual" ? "Meeting link" : "Location"
                  }
                  value={meeting.location}
                  onChange={(e) =>
                    setMeeting({ ...meeting, location: e.target.value })
                  }
                />
              </div>
              <Input
                placeholder="Attendees"
                value={meeting.attendees}
                onChange={(e) =>
                  setMeeting({ ...meeting, attendees: e.target.value })
                }
              />
              <Textarea
                rows={2}
                placeholder="Agenda"
                value={meeting.agenda}
                onChange={(e) =>
                  setMeeting({ ...meeting, agenda: e.target.value })
                }
              />
              <Button
                size="sm"
                onClick={() => {
                  if (!meeting.title.trim() || !meeting.date) return;
                  scheduleMeeting(lead._id, { ...meeting });
                  setMeeting({
                    title: "",
                    date: "",
                    time: "",
                    mode: "virtual",
                    location: "",
                    attendees: "",
                    agenda: "",
                  });
                }}
              >
                <CalendarPlus className="h-4 w-4 mr-1" /> Schedule meeting
              </Button>
            </div>

            {ws.meetings.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No meetings scheduled yet.
              </p>
            )}
            {ws.meetings.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border border-border/60 p-3 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{m.title}</p>
                  <Badge
                    variant="outline"
                    className={`text-[10px] capitalize ${
                      m.status === "completed"
                        ? "bg-success/10 text-success border-success/20"
                        : m.status === "cancelled"
                          ? "bg-destructive/10 text-destructive border-destructive/20"
                          : "bg-warning/10 text-warning border-warning/20"
                    }`}
                  >
                    {m.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {m.date} {m.time} · {m.mode === "virtual" ? "Virtual" : "In person"}
                  {m.location ? ` · ${m.location}` : ""}
                </p>
                {m.attendees && (
                  <p className="text-xs text-muted-foreground">
                    Attendees: {m.attendees}
                  </p>
                )}
                {m.agenda && <p className="text-xs">{m.agenda}</p>}
                {m.outcome && (
                  <p className="text-xs">
                    <span className="font-medium">Outcome:</span> {m.outcome}
                  </p>
                )}
                {m.status === "scheduled" && (
                  <div className="flex gap-2 pt-1">
                    {outcomeFor === m.id ? (
                      <div className="flex-1 space-y-2">
                        <Textarea
                          rows={2}
                          placeholder="Meeting outcome…"
                          value={outcome}
                          onChange={(e) => setOutcome(e.target.value)}
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            completeMeeting(lead._id, m.id, outcome.trim());
                            setOutcome("");
                            setOutcomeFor(null);
                          }}
                        >
                          Save outcome
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setOutcomeFor(m.id)}
                        >
                          Mark completed
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => cancelMeeting(lead._id, m.id)}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </TabsContent>

          {/* Notes */}
          <TabsContent value="notes" className="mt-4 space-y-3">
            <div className="rounded-lg border border-border/60 p-3 space-y-2">
              <Input
                placeholder="Note title"
                value={note.title}
                onChange={(e) => setNote({ ...note, title: e.target.value })}
              />
              <Textarea
                rows={4}
                placeholder="Write your note…"
                value={note.body}
                onChange={(e) => setNote({ ...note, body: e.target.value })}
              />
              <Button
                size="sm"
                onClick={() => {
                  if (!note.title.trim()) return;
                  addLeadNote(lead._id, note.title.trim(), note.body.trim());
                  setNote({ title: "", body: "" });
                }}
              >
                <StickyNote className="h-4 w-4 mr-1" /> Add note
              </Button>
            </div>
            {ws.notes.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No notes yet.
              </p>
            )}
            {ws.notes.map((n) => (
              <div
                key={n.id}
                className="rounded-lg border-l-2 border-primary border border-border/60 p-3"
              >
                <div className="flex justify-between gap-2">
                  <p className="text-sm font-semibold">{n.title}</p>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(n.at).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                  {n.body}
                </p>
                <p className="text-[10px] text-primary mt-1">{n.author}</p>
              </div>
            ))}
          </TabsContent>

          {/* Activity */}
          <TabsContent value="activity" className="mt-4">
            <div className="space-y-0">
              <div className="flex gap-3 py-2 border-b">
                <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
                <span className="text-xs flex-1">Lead created</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(lead.createdAt).toLocaleString()}
                </span>
              </div>
              {timeline.map((t) => (
                <div key={t.id} className="flex gap-3 py-2 border-b last:border-0">
                  <span
                    className={`h-1.5 w-1.5 rounded-full mt-1.5 ${
                      t.kind === "comm"
                        ? "bg-info"
                        : t.kind === "meeting"
                          ? "bg-warning"
                          : "bg-success"
                    }`}
                  />
                  <span className="text-xs flex-1">{t.text}</span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(t.at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
