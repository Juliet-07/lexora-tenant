import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Check,
  Package,
  FileText,
  Download,
  Eye,
  Plus,
  Settings2,
  Circle,
  Trash2,
  Loader2,
  ListChecks,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { escapeReportText, printGrcReport } from "@/lib/grc/printReport";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  MeetingChecklist,
  MeetingNotice,
  useMeetingPreparation,
} from "@/components/grc/meetings/MeetingPreparation";
import { MinutesDrafter } from "@/components/grc/meetings/MinutesDrafter";
import {
  MeetingHeaderControls,
  PostponedBanner,
  AgendaAddRow,
  UploadBoardPackDialog,
  RequestBoardPackDocDialog,
  FulfillBoardPackDocButton,
  AttendeesEditor,
  MinutesDistribution,
  useRemoveAgenda,
  useRemovePackDoc,
} from "@/components/grc/meetings/MeetingControls";
import { AttendanceSection } from "@/components/grc/meetings/MeetingSections";
import {
  MEETING_CHECKLIST_ITEMS,
  dispatchMeeting,
  addMeetingActionItem,
  removeMeetingActionItem,
  setMeetingActionItemStatus,
  resolveGrcFileUrl,
  updateExecutiveSummary,
  downloadExecutiveSummaryPdf,
  type Meeting,
  type MeetingActionItemStatus,
  type AgendaItemType,
  type BoardPackDoc,
} from "@/lib/grc/governance-api";

const fmt = (d: Date) =>
  d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

// Board pack documents are served from a public, unauthenticated
// static path (the existing "View" link already opened them with a
// plain <a href target=_blank>, no auth header) — so a real download
// is a client-side fetch-to-blob rather than relying on the <a
// download> attribute, which browsers ignore for a cross-origin href
// (the API usually runs on a different origin than the app).
async function downloadBoardPackDoc(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objUrl);
  } catch {
    toast({ title: "Failed to download document", variant: "destructive" });
  }
}

/** Eye-icon "View" action for a board pack document — opens an in-app
 * popup (an iframe pointed at the file) instead of a new browser tab,
 * paired with a separate Download icon alongside it in BoardPackSection. */
function DocPreviewButton({ name, url }: { name: string; url: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        aria-label="View"
        title="View"
        onClick={() => setOpen(true)}
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-3 border-b">
            <DialogTitle className="truncate">{name}</DialogTitle>
          </DialogHeader>
          <iframe
            title={name}
            src={url}
            className="w-full h-[75vh] border-0 bg-muted/30"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function Stepper({
  steps,
}: {
  steps: { label: string; sub: string; state: "done" | "current" | "todo" }[];
}) {
  return (
    <div className="flex flex-wrap gap-0 border rounded-lg bg-card overflow-hidden">
      {steps.map((s, i) => (
        <div
          key={i}
          className={`flex-1 min-w-[120px] px-3 py-2.5 border-r last:border-r-0 ${s.state === "current" ? "bg-primary/10" : ""}`}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            {s.state === "done" ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : s.state === "current" ? (
              <Circle className="h-3.5 w-3.5 text-primary fill-primary" />
            ) : (
              <Circle className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className={s.state === "todo" ? "text-muted-foreground" : ""}>
              {s.label}
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {s.sub}
          </div>
        </div>
      ))}
    </div>
  );
}

function AgendaTypeBadge({ type }: { type: AgendaItemType }) {
  const cls =
    type === "Resolution"
      ? "border-sky-400 text-sky-700 bg-sky-50"
      : type === "Procedural"
        ? "border-muted-foreground/30 text-muted-foreground bg-muted/40"
        : type === "Discussion"
          ? "border-amber-400 text-amber-700 bg-amber-50"
          : type === "Informational"
            ? "border-emerald-400 text-emerald-700 bg-emerald-50"
            : "border-violet-400 text-violet-700 bg-violet-50";
  return (
    <Badge variant="outline" className={cls}>
      {type}
    </Badge>
  );
}

/** One group of the Board Pack tab — either the "Procedural documents"
 * bucket (agendaItemTitle === "") or the documents linked to one agenda
 * item. Always rendered, even when empty, so the Agenda ↔ Board Pack
 * link this tab exists to show is visible before anything is uploaded. */
function BoardPackSection({
  title,
  docs,
  meeting,
  removeDoc,
}: {
  title: string;
  docs: { d: BoardPackDoc; i: number }[];
  meeting: Meeting;
  removeDoc: { mutate: (i: number) => void };
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        {title}
      </div>
      {docs.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          No documents linked yet.
        </p>
      ) : (
        <div className="space-y-2">
          {docs.map(({ d, i }) => (
            <div
              key={i}
              className={`flex items-center justify-between border rounded-lg p-3 ${
                !d.fileUrl ? "border-warning/40 bg-warning/5" : ""
              }`}
            >
              <div className="flex gap-3 items-center">
                <FileText
                  className={`h-5 w-5 ${!d.fileUrl ? "text-warning" : "text-muted-foreground"}`}
                />
                <div>
                  <div className="text-sm font-medium flex items-center gap-2">
                    {d.name}
                    {d.fileUrl ? (
                      <Badge
                        variant="outline"
                        className="bg-success/15 text-success border-success/30 text-[10px] px-1.5 py-0"
                      >
                        Uploaded
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-warning/15 text-warning border-warning/30 text-[10px] px-1.5 py-0"
                      >
                        Outstanding
                      </Badge>
                    )}
                  </div>
                  {d.fileUrl ? (
                    <div className="text-xs text-muted-foreground">
                      Uploaded{" "}
                      {d.uploadedAt ? fmt(new Date(d.uploadedAt)) : "—"}
                      {d.uploadedBy ? ` by ${d.uploadedBy}` : ""}
                    </div>
                  ) : (
                    <div className="text-xs text-warning">
                      Awaiting upload
                      {d.assignedToName ? ` from ${d.assignedToName}` : ""}
                      {d.dueDate
                        ? ` · Expected by ${fmt(new Date(d.dueDate))}`
                        : ""}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {d.fileUrl ? (
                  <>
                    <DocPreviewButton
                      name={d.name}
                      url={resolveGrcFileUrl(d.fileUrl)}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Download"
                      title="Download"
                      onClick={() =>
                        downloadBoardPackDoc(
                          resolveGrcFileUrl(d.fileUrl!),
                          d.name,
                        )
                      }
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <FulfillBoardPackDocButton meeting={meeting} index={i} />
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Remove document"
                  onClick={() => removeDoc.mutate(i)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Board pack cover page — rich text the tenant ("Company Secretary")
 * drafts to frame the pack for directors (matters for decision/noting,
 * outstanding action items, reading guidance — PO reference mockup,
 * Oct 2026). Unlike the notice, it's never dispatch-locked, so there's
 * just Save draft plus an in-app Preview popup and a PDF export. */
function BoardPackExecutiveSummary({ meeting }: { meeting: Meeting }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState(meeting.executiveSummary ?? "");
  const [preview, setPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const dirty = body !== (meeting.executiveSummary ?? "");

  const saveMut = useMutation({
    mutationFn: () => updateExecutiveSummary(meeting._id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-meetings"] });
      toast({ title: "Executive summary saved" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to save executive summary",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      if (dirty) {
        await updateExecutiveSummary(meeting._id, body);
        queryClient.invalidateQueries({ queryKey: ["grc-meetings"] });
      }
      await downloadExecutiveSummaryPdf(meeting._id, meeting.title);
    } catch {
      toast({
        title: "Failed to export the executive summary",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 flex-wrap gap-2">
        <div>
          <CardTitle className="text-base">
            Cover page &amp; executive summary
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            Frames the pack for directors — matters for decision, matters for
            noting, outstanding items, reading guidance.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!body.trim()}
            onClick={() => setPreview(true)}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            Preview
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!body.trim() || downloading}
            onClick={downloadPdf}
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5 mr-1" />
            )}
            Export as PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <RichTextEditor
          value={body}
          onChange={setBody}
          minHeight={180}
          placeholder="Dear Directors, please find enclosed the meeting pack for…"
        />
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs text-muted-foreground">
            {meeting.executiveSummaryUpdatedAt
              ? `Last saved ${new Date(meeting.executiveSummaryUpdatedAt).toLocaleString()}`
              : "Not written yet."}
          </p>
          <Button
            size="sm"
            disabled={!dirty || saveMut.isPending}
            onClick={() => saveMut.mutate()}
          >
            {saveMut.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : null}
            Save draft
          </Button>
        </div>
      </CardContent>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-3 border-b">
            <DialogTitle>
              Cover page &amp; executive summary — preview
            </DialogTitle>
          </DialogHeader>
          <div
            className="p-6 max-h-[75vh] overflow-y-auto prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
            dangerouslySetInnerHTML={{
              __html:
                body ||
                "<p class='text-muted-foreground'>Nothing written yet.</p>",
            }}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function MeetingWorkspace({
  meeting,
  onBack,
}: {
  meeting: Meeting;
  onBack: () => void;
}) {
  const removeAgenda = useRemoveAgenda(meeting);
  const removeDoc = useRemovePackDoc(meeting);
  const queryClient = useQueryClient();
  const preparation = useMeetingPreparation(meeting);
  const [newAction, setNewAction] = useState({
    title: "",
    assigneeEmail: "",
    dueDate: "",
  });

  const date = new Date(meeting.date);
  const held = meeting.status === "Held";
  const quorumNeeded = Math.floor(meeting.attendees.length / 2) + 1;
  const acknowledgments = meeting.acknowledgments ?? [];
  const actionItems = meeting.actionItems ?? [];
  const checklistDone = Object.keys(preparation.completed).length;
  const checklistComplete = checklistDone >= MEETING_CHECKLIST_ITEMS.length;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["grc-meetings"] });
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const dispatchMut = useMutation({
    mutationFn: () => dispatchMeeting(meeting._id),
    onSuccess: () => {
      invalidate();
      toast({
        title: "Meeting pack dispatched",
        description: `Sent to ${meeting.attendees.length} recipient(s).`,
      });
    },
    onError: onErr("Failed to dispatch"),
  });
  const addActionMut = useMutation({
    mutationFn: () =>
      addMeetingActionItem(meeting._id, {
        title: newAction.title,
        assigneeEmail: newAction.assigneeEmail,
        dueDate: newAction.dueDate || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setNewAction({ title: "", assigneeEmail: "", dueDate: "" });
    },
    onError: onErr("Failed to add action item"),
  });
  const removeActionMut = useMutation({
    mutationFn: (actionItemId: string) =>
      removeMeetingActionItem(meeting._id, actionItemId),
    onSuccess: invalidate,
    onError: onErr("Failed to remove action item"),
  });
  const statusMut = useMutation({
    mutationFn: ({
      actionItemId,
      status,
    }: {
      actionItemId: string;
      status: MeetingActionItemStatus;
    }) => setMeetingActionItemStatus(meeting._id, actionItemId, status),
    onSuccess: invalidate,
    onError: onErr("Failed to update action item status"),
  });

  const steps: {
    label: string;
    sub: string;
    state: "done" | "current" | "todo";
  }[] = [
    { label: "Scheduled", sub: fmt(date), state: "done" },
    {
      label: "Notice sent",
      sub: meeting.notice.dispatchedAt
        ? fmt(new Date(meeting.notice.dispatchedAt))
        : "Not sent yet",
      state: meeting.notice.dispatchedAt ? "done" : "current",
    },
    {
      label: "Preparing pack",
      sub: `${checklistDone}/${MEETING_CHECKLIST_ITEMS.length} checks`,
      state: meeting.sentAt
        ? "done"
        : checklistComplete
          ? "current"
          : "current",
    },
    {
      label: "Pack dispatched",
      sub: meeting.sentAt ? fmt(new Date(meeting.sentAt)) : "—",
      state: meeting.sentAt ? "done" : "todo",
    },
    {
      label: "Meeting held",
      sub: held ? fmt(date) : "—",
      state: held ? "done" : meeting.sentAt ? "current" : "todo",
    },
    {
      label: "Minutes sent",
      sub: meeting.minutesSentAt ? fmt(new Date(meeting.minutesSentAt)) : "—",
      state: meeting.minutesSentAt ? "done" : held ? "current" : "todo",
    },
  ];

  const dispatchDisabled =
    dispatchMut.isPending ||
    meeting.attendees.length === 0 ||
    (!meeting.sentAt && !checklistComplete);

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Meetings
      </Button>

      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <div className="flex gap-2 mb-1">
            <Badge variant="secondary">
              {meeting.type === "Board" ? "Full Board" : meeting.type}
            </Badge>
            <Badge variant="outline">
              {meeting.sentAt
                ? "Pack dispatched"
                : held
                  ? "Held"
                  : "Board pack in preparation"}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold">{meeting.title}</h1>
          <p className="text-sm text-muted-foreground">
            {date.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            ·{" "}
            {date.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · {meeting.location || meeting.venue || meeting.meetingLink}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex flex-wrap justify-end gap-2">
            <MeetingHeaderControls meeting={meeting} onDeleted={onBack} />
            <Button
              onClick={() => dispatchMut.mutate()}
              disabled={dispatchDisabled}
            >
              {dispatchMut.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Package className="h-4 w-4 mr-1" />
              )}
              {meeting.sentAt
                ? "Re-dispatch board pack"
                : "Dispatch board pack"}
            </Button>
          </div>
          {!meeting.sentAt && !checklistComplete && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <ListChecks className="h-3 w-3" />
              Complete the preparation checklist ({checklistDone}/
              {MEETING_CHECKLIST_ITEMS.length}) to unlock
            </p>
          )}
        </div>
      </div>

      <PostponedBanner meeting={meeting} />
      <Stepper steps={steps} />

      <Tabs defaultValue="checklist">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="checklist">Preparation checklist</TabsTrigger>
          <TabsTrigger value="notice">Notice</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="pack">Meeting pack</TabsTrigger>
          <TabsTrigger value="attendance">Attendance & quorum</TabsTrigger>
          <TabsTrigger value="minutes">Minutes</TabsTrigger>
          <TabsTrigger value="actions">Actions & follow-up</TabsTrigger>
        </TabsList>

        <TabsContent value="checklist">
          <MeetingChecklist meeting={meeting} state={preparation} />
        </TabsContent>
        <TabsContent value="notice">
          <MeetingNotice meeting={meeting} state={preparation} />
        </TabsContent>

        {/* AGENDA */}
        <TabsContent value="agenda">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Meeting agenda</CardTitle>
              <div className="flex gap-2">
                {/* <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                     printGrcReport({
                       title: `${meeting.title} — Agenda`,
                       category: "Meeting agenda",
                       details: [{ label: "Meeting date", value: fmt(date) }, { label: "Chair", value: meeting.chair || "—" }],
                       body: `<ol>${meeting.agenda.map((a) => `<li><strong>${escapeReportText(a.title)}</strong>${a.presenter ? ` — ${escapeReportText(a.presenter)}` : ""}</li>`).join("")}</ol>`,
                     })
                  }
                >
                  Export PDF
                </Button> */}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Agenda item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Presenter</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Papers</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meeting.agenda.map((a, i) => {
                    const papers = meeting.boardPack.filter(
                      (d) => d.agendaItemTitle === a.title,
                    );
                    return (
                      <TableRow key={i}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium">{a.title}</TableCell>
                        <TableCell>
                          <AgendaTypeBadge type={a.type} />
                        </TableCell>
                        <TableCell>{a.presenter || "—"}</TableCell>
                        <TableCell>{a.durationMinutes}m</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[220px]">
                          {papers.length > 0
                            ? papers.map((d) => d.name).join(", ")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Remove agenda item"
                            onClick={() => removeAgenda.mutate(i)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {meeting.agenda.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground py-6"
                      >
                        No agenda items yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <AgendaAddRow meeting={meeting} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* BOARD PACK */}
        <TabsContent value="pack" className="space-y-4">
          <BoardPackExecutiveSummary meeting={meeting} />
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 flex-wrap gap-2">
              <CardTitle className="text-base">Meeting pack documents</CardTitle>
              <div className="flex gap-2">
                <RequestBoardPackDocDialog meeting={meeting} />
                <UploadBoardPackDialog meeting={meeting} />
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <BoardPackSection
                title="Procedural documents"
                docs={meeting.boardPack
                  .map((d, i) => ({ d, i }))
                  .filter(({ d }) => !d.agendaItemTitle)}
                meeting={meeting}
                removeDoc={removeDoc}
              />
              {meeting.agenda.map((a, ai) => (
                <BoardPackSection
                  key={ai}
                  title={a.title}
                  docs={meeting.boardPack
                    .map((d, i) => ({ d, i }))
                    .filter(({ d }) => d.agendaItemTitle === a.title)}
                  meeting={meeting}
                  removeDoc={removeDoc}
                />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Acknowledgements</CardTitle>
              <p className="text-sm text-muted-foreground">
                Each attendee confirms receipt of the agenda and meeting pack —
                via the emailed link, or in-app on their board portal.
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Attendee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Acknowledged</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meeting.attendees.map((a) => {
                    const ack = acknowledgments.find(
                      (x) =>
                        x.attendeeEmail.toLowerCase() === a.email.toLowerCase(),
                    );
                    return (
                      <TableRow key={a.email}>
                        <TableCell className="font-medium">
                          {a.name}{" "}
                          <span className="text-muted-foreground text-xs">
                            ({a.role || "Attendee"})
                          </span>
                        </TableCell>
                        <TableCell>
                          {!meeting.sentAt ? (
                            <Badge variant="outline">Not yet dispatched</Badge>
                          ) : ack ? (
                            <Badge>Acknowledged</Badge>
                          ) : (
                            <Badge variant="secondary">Awaiting</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {ack ? fmt(new Date(ack.confirmedAt)) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {meeting.attendees.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-muted-foreground py-4"
                      >
                        No attendees yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ATTENDANCE */}
        <TabsContent value="attendance" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quorum requirement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {quorumNeeded}{" "}
                  <span className="text-base font-normal text-muted-foreground">
                    of {meeting.attendees.length} attendees
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Majority of attendees required. {acknowledgments.length} of{" "}
                  {meeting.attendees.length} have acknowledged the agenda.
                </p>
                <Badge
                  className="mt-3"
                  variant={meeting.attendanceRecordedAt ? "default" : "outline"}
                >
                  {meeting.attendanceRecordedAt
                    ? "Attendance recorded"
                    : "Attendance not yet recorded"}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Meeting details</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1.5">
                {[
                  ["Date", fmt(date)],
                  ["Location", meeting.location || "—"],
                  ["Mode", meeting.mode],
                  ["Type", meeting.type],
                  ["Chair", meeting.chair],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance register</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Agenda acknowledged</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Conflict of interest</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meeting.attendees.map((a, i) => {
                    const ack = acknowledgments.find(
                      (x) =>
                        x.attendeeEmail.toLowerCase() === a.email.toLowerCase(),
                    );
                    const entry = meeting.attendanceEntries?.find(
                      (e) => e.index === i,
                    );
                    const status = entry
                      ? entry.status
                      : meeting.attendanceRecordedAt
                        ? meeting.attendanceAllPresent ||
                          meeting.attendancePresentIndices?.includes(i)
                          ? "Present"
                          : "Absent"
                        : null;
                    const conflicts = meeting.conflictDeclarations?.filter(
                      (c) =>
                        c.declaredByEmail.toLowerCase() ===
                        a.email.toLowerCase(),
                    );
                    // Most recent declaration stands for this attendee — the
                    // four conflict-status values (see governance-api.ts)
                    // describe the current state directly, there's no
                    // separate declared/resolved lifecycle to pick from.
                    const latestConflict = conflicts?.length
                      ? [...conflicts].sort(
                          (x, y) =>
                            new Date(y.recordedAt).getTime() -
                            new Date(x.recordedAt).getTime(),
                        )[0]
                      : null;
                    return (
                      <TableRow key={a.email}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell>{a.role || "—"}</TableCell>
                        <TableCell>
                          {ack ? (
                            <Badge>Yes</Badge>
                          ) : (
                            <Badge variant="outline">Not yet</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {status === null ? (
                            "—"
                          ) : status === "Present" ? (
                            <Badge>Present</Badge>
                          ) : status === "Proxy" ? (
                            <Badge variant="secondary">
                              Proxy
                              {entry?.proxyHolderName
                                ? ` — ${entry.proxyHolderName}`
                                : ""}
                            </Badge>
                          ) : status === "Apology" ? (
                            <Badge variant="outline">Apology</Badge>
                          ) : (
                            <Badge variant="secondary">Absent</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!latestConflict ? (
                            "—"
                          ) : (
                            <Badge
                              variant="outline"
                              className={
                                latestConflict.status ===
                                "Conflict declared — recusal required"
                                  ? "border-destructive/40 text-destructive"
                                  : latestConflict.status ===
                                      "Standing declaration — ongoing"
                                    ? "border-sky-400 text-sky-700"
                                    : "border-amber-400 text-amber-700"
                              }
                            >
                              {latestConflict.status}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {meeting.attendees.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground py-6"
                      >
                        No attendees yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <AttendanceSection meeting={meeting} />
            </CardContent>
          </Card>
          <AttendeesEditor meeting={meeting} />
        </TabsContent>

        {/* MINUTES */}
        <TabsContent value="minutes" className="space-y-4">
          <MinutesDrafter meeting={meeting} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Approved minutes</CardTitle>
              <p className="text-sm text-muted-foreground">
                {!held
                  ? `Meeting upcoming (${fmt(date)}) — minutes can be drafted once the meeting is marked held.`
                  : meeting.minutesSentAt
                    ? `Sent to all attendees ${fmt(new Date(meeting.minutesSentAt))}.`
                    : "Drafted, not yet sent."}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {meeting.minutes ? (
                <div
                  className="prose prose-sm max-w-none border rounded-lg p-5 bg-muted/20"
                  dangerouslySetInnerHTML={{ __html: meeting.minutes }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No minutes drafted yet.
                </p>
              )}
              {meeting.minutes && (
                <Button size="sm" variant="outline" onClick={() => printGrcReport({
                  title: `${meeting.title} — Minutes`,
                  category: "Approved meeting minutes",
                  details: [
                    { label: "Meeting date", value: fmt(date) },
                    { label: "Chair", value: meeting.chair || "—" },
                    { label: "Status", value: meeting.minutesSentAt ? "Distributed" : "Not yet distributed" },
                  ],
                  body: meeting.minutes,
                })}>
                  <Download className="h-4 w-4 mr-1" />
                  Export branded PDF
                </Button>
              )}
              <MinutesDistribution meeting={meeting} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ACTIONS */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Action items arising from this meeting
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                The assignee must already be an attendee of this meeting.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actionItems.map((a) => (
                    <TableRow key={a._id}>
                      <TableCell className="font-medium">{a.title}</TableCell>
                      <TableCell>{a.assigneeName}</TableCell>
                      <TableCell>
                        {a.dueDate ? fmt(new Date(a.dueDate)) : "—"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={a.status}
                          onValueChange={(v: MeetingActionItemStatus) =>
                            statusMut.mutate({ actionItemId: a._id, status: v })
                          }
                        >
                          <SelectTrigger className="h-7 w-[110px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(["Open", "Done"] as const).map((o) => (
                              <SelectItem key={o} value={o}>
                                {o}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeActionMut.mutate(a._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {actionItems.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground py-4"
                      >
                        No action items yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex gap-2 flex-wrap">
                <Input
                  className="flex-1 min-w-[200px]"
                  placeholder="Action"
                  value={newAction.title}
                  onChange={(e) =>
                    setNewAction({ ...newAction, title: e.target.value })
                  }
                />
                <Select
                  value={newAction.assigneeEmail}
                  onValueChange={(v) =>
                    setNewAction({ ...newAction, assigneeEmail: v })
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {meeting.attendees.map((a) => (
                      <SelectItem key={a.email} value={a.email}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="w-40"
                  type="date"
                  value={newAction.dueDate}
                  onChange={(e) =>
                    setNewAction({ ...newAction, dueDate: e.target.value })
                  }
                />
                <Button
                  disabled={
                    !newAction.title.trim() ||
                    !newAction.assigneeEmail ||
                    addActionMut.isPending
                  }
                  onClick={() => addActionMut.mutate()}
                >
                  {addActionMut.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-1" />
                  )}
                  Add
                </Button>
              </div>
              {meeting.attendees.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  This meeting has no attendees to assign action items to yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
