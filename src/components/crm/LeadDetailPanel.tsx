import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarPlus,
  MessageSquarePlus,
  StickyNote,
  Pencil,
  FileText,
  Upload,
  Thermometer,
  Target,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  updateLead,
  moveLeadStage,
  scheduleLeadMeeting,
  completeLeadMeeting,
  cancelLeadMeeting,
  sendLeadDocument,
  type Lead,
  type LeadSource,
  type LeadTemperature,
  type LeadQualification,
} from "@/lib/crm/crm-pipeline-api";
import {
  addLeadNote,
  buildTimeline,
  logComm,
  useLeadWorkspace,
  type CommChannel,
} from "@/lib/crm/leadWorkspaceStore";

const CHANNELS: { value: CommChannel; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "call", label: "Phone call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "meeting_note", label: "Meeting follow-up" },
];

const SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: "event", label: "Event" },
  { value: "referral", label: "Referral" },
  { value: "web", label: "Web" },
  { value: "cold_outreach", label: "Cold Outreach" },
  { value: "partner", label: "Partner" },
  { value: "other", label: "Other" },
];

export function LeadDetailPanel({
  lead,
  onClose,
  onConvert,
  onMarkLost,
  onUpdate,
}: {
  lead: Lead | null;
  onClose: () => void;
  onConvert: (lead: Lead) => void;
  onMarkLost: (lead: Lead) => void;
  onUpdate?: (lead: Lead) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState({
    contactName: "",
    companyName: "",
    contactEmail: "",
    contactPhone: "",
    industry: "",
    source: "other" as LeadSource,
    sourceNote: "",
    notes: "",
  });
  const openEdit = () => {
    if (!lead) return;
    setEditDraft({
      contactName: lead.contactName ?? "",
      companyName: lead.companyName ?? "",
      contactEmail: lead.contactEmail ?? "",
      contactPhone: lead.contactPhone ?? "",
      industry: lead.industry ?? "",
      source: lead.source,
      sourceNote: lead.sourceNote ?? "",
      notes: lead.notes ?? "",
    });
    setEditOpen(true);
  };
  const updateMut = useMutation({
    mutationFn: () => updateLead(lead!._id, editDraft),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      onUpdate?.(updated);
      setEditOpen(false);
      toast({ title: "Lead details updated" });
    },
    onError: (err: any) =>
      toast({
        title: "Could not update lead",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const advanceStageMut = useMutation({
    mutationFn: () => moveLeadStage(lead!._id, "prospect"),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      onUpdate?.(updated);
      toast({ title: "Moved to Prospect" });
    },
    onError: (err: any) =>
      toast({
        title: "Could not advance stage",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const fieldMut = useMutation({
    mutationFn: (dto: {
      temperature?: LeadTemperature;
      qualification?: LeadQualification;
    }) => updateLead(lead!._id, dto),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      onUpdate?.(updated);
    },
    onError: (err: any) =>
      toast({
        title: "Could not update",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const scheduleMeetingMut = useMutation({
    mutationFn: () => scheduleLeadMeeting(lead!._id, { ...meeting }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      onUpdate?.(updated);
      setMeeting({
        title: "",
        date: "",
        time: "",
        mode: "virtual",
        location: "",
        attendees: "",
        agenda: "",
      });
      toast({
        title: "Meeting scheduled",
        description: lead?.contactEmail
          ? `Invite emailed to ${lead.contactEmail}.`
          : "No contact email on file — the lead wasn't emailed.",
      });
    },
    onError: (err: any) =>
      toast({
        title: "Could not schedule meeting",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const completeMeetingMut = useMutation({
    mutationFn: ({
      meetingId,
      outcome,
    }: {
      meetingId: string;
      outcome: string;
    }) => completeLeadMeeting(lead!._id, meetingId, outcome),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      onUpdate?.(updated);
      setOutcome("");
      setOutcomeFor(null);
    },
  });

  const cancelMeetingMut = useMutation({
    mutationFn: (meetingId: string) => cancelLeadMeeting(lead!._id, meetingId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      onUpdate?.(updated);
    },
  });

  const [docMessage, setDocMessage] = useState("");
  const sendDocMut = useMutation({
    mutationFn: (file: File) =>
      sendLeadDocument(lead!._id, file, docMessage.trim()),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      onUpdate?.(updated);
      setDocMessage("");
      toast({
        title: "Document sent",
        description: `Emailed to ${lead?.contactEmail}.`,
      });
    },
    onError: (err: any) =>
      toast({
        title: "Could not send document",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  if (!lead) return null;
  const title = lead.contactName || lead.companyName || "Untitled lead";
  // Leads created before meetings/documents/temperature/qualification
  // existed on this schema can come back missing these keys entirely
  // (schema defaults don't retroactively apply to already-stored
  // documents) — always fall back to safe values rather than assume
  // every lead has the current shape.
  const meetings = lead.meetings ?? [];
  const documents = lead.documents ?? [];
  // Comms and notes still come from the local workspace; meetings
  // are now real, so they're merged in separately rather than
  // through the mock's own (now-unused) meeting tracking.
  const mockTimeline = buildTimeline(ws).filter((t) => t.kind !== "meeting");
  const meetingTimeline = meetings.map((m) => ({
    id: m._id,
    at: `${m.date}T${m.time || "00:00"}:00`,
    kind: "meeting" as const,
    text: `${m.status === "completed" ? "Completed" : m.status === "cancelled" ? "Cancelled" : "Scheduled"} meeting — ${m.title}`,
  }));
  const timeline = [...mockTimeline, ...meetingTimeline].sort((a, b) =>
    a.at < b.at ? 1 : -1,
  );

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
          <TabsList className="w-full grid grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="comms">Comms</TabsTrigger>
            <TabsTrigger value="meetings">Meetings</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={openEdit}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit details
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Thermometer className="h-3.5 w-3.5" /> Temperature
                </Label>
                <Select
                  value={lead.temperature ?? "warm"}
                  onValueChange={(v) =>
                    fieldMut.mutate({ temperature: v as LeadTemperature })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hot">Hot</SelectItem>
                    <SelectItem value="warm">Warm</SelectItem>
                    <SelectItem value="cold">Cold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Target className="h-3.5 w-3.5" /> Qualification
                </Label>
                <Select
                  value={lead.qualification ?? "unqualified"}
                  onValueChange={(v) =>
                    fieldMut.mutate({ qualification: v as LeadQualification })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unqualified">Unqualified</SelectItem>
                    <SelectItem value="mql">
                      Marketing Qualified (MQL)
                    </SelectItem>
                    <SelectItem value="sql">Sales Qualified (SQL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

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
                {lead.stage === "lead" ? (
                  <Button
                    className="flex-1"
                    disabled={advanceStageMut.isPending}
                    onClick={() => advanceStageMut.mutate()}
                  >
                    Convert to prospect
                  </Button>
                ) : (
                  <Button className="flex-1" onClick={() => onConvert(lead)}>
                    Convert to client
                  </Button>
                )}
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
                disabled={scheduleMeetingMut.isPending}
                onClick={() => {
                  if (!meeting.title.trim() || !meeting.date) return;
                  scheduleMeetingMut.mutate();
                }}
              >
                <CalendarPlus className="h-4 w-4 mr-1" />
                {scheduleMeetingMut.isPending
                  ? "Scheduling…"
                  : "Schedule meeting"}
              </Button>
            </div>

            {meetings.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No meetings scheduled yet.
              </p>
            )}
            {meetings.map((m) => (
              <div
                key={m._id}
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
                  {m.date} {m.time} ·{" "}
                  {m.mode === "virtual" ? "Virtual" : "In person"}
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
                    {outcomeFor === m._id ? (
                      <div className="flex-1 space-y-2">
                        <Textarea
                          rows={2}
                          placeholder="Meeting outcome…"
                          value={outcome}
                          onChange={(e) => setOutcome(e.target.value)}
                        />
                        <Button
                          size="sm"
                          disabled={completeMeetingMut.isPending}
                          onClick={() =>
                            completeMeetingMut.mutate({
                              meetingId: m._id,
                              outcome: outcome.trim(),
                            })
                          }
                        >
                          Save outcome
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setOutcomeFor(m._id)}
                        >
                          Mark completed
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => cancelMeetingMut.mutate(m._id)}
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

          {/* Documents */}
          <TabsContent value="documents" className="mt-4 space-y-3">
            <div className="rounded-lg border border-border/60 p-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                Send a proposal, company profile, or any other document — it's
                emailed to the lead with the file attached.
              </p>
              <Textarea
                rows={2}
                placeholder="A short message to include (optional)…"
                value={docMessage}
                onChange={(e) => setDocMessage(e.target.value)}
              />
              <label>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) sendDocMut.mutate(file);
                    e.target.value = "";
                  }}
                />
                <span className="inline-flex h-9 cursor-pointer items-center rounded-md border border-input px-3 text-sm font-medium hover:bg-accent">
                  <Upload className="h-4 w-4 mr-1.5" />
                  {sendDocMut.isPending ? "Sending…" : "Choose file & send"}
                </span>
              </label>
              {!lead.contactEmail && (
                <p className="text-xs text-destructive">
                  This lead has no contact email on file — add one under
                  Overview before sending a document.
                </p>
              )}
            </div>

            {documents.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No documents sent yet.
              </p>
            )}
            {documents.map((d) => (
              <div
                key={d._id}
                className="rounded-lg border border-border/60 p-3 flex items-start gap-3"
              >
                <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{d.name}</p>
                  {d.message && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {d.message}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Sent to {d.sentTo} · {new Date(d.sentAt).toLocaleString()}
                  </p>
                </div>
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
                <div
                  key={t.id}
                  className="flex gap-3 py-2 border-b last:border-0"
                >
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit lead details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Contact name</Label>
                <Input
                  value={editDraft.contactName}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, contactName: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Organisation</Label>
                <Input
                  value={editDraft.companyName}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, companyName: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={editDraft.contactEmail}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, contactEmail: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input
                  value={editDraft.contactPhone}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, contactPhone: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Industry</Label>
                <Input
                  value={editDraft.industry}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, industry: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Source</Label>
                <Select
                  value={editDraft.source}
                  onValueChange={(v) =>
                    setEditDraft({ ...editDraft, source: v as LeadSource })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Source note</Label>
              <Input
                value={editDraft.sourceNote}
                onChange={(e) =>
                  setEditDraft({ ...editDraft, sourceNote: e.target.value })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Capture notes</Label>
              <Textarea
                rows={3}
                value={editDraft.notes}
                onChange={(e) =>
                  setEditDraft({ ...editDraft, notes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={updateMut.isPending}
              onClick={() => updateMut.mutate()}
            >
              {updateMut.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
