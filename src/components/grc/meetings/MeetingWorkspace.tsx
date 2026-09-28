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
  ArrowLeft,
  Check,
  Package,
  FileText,
  Download,
  Plus,
  Settings2,
  Circle,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  dispatchMeeting,
  addMeetingActionItem,
  removeMeetingActionItem,
  setMeetingActionItemStatus,
  resolveGrcFileUrl,
  type Meeting,
  type MeetingActionItemStatus,
} from "@/lib/grc/governance-api";

const fmt = (d: Date) =>
  d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

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

export function MeetingWorkspace({
  meeting,
  onBack,
  onManage,
}: {
  meeting: Meeting;
  onBack: () => void;
  onManage?: () => void;
}) {
  const queryClient = useQueryClient();
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
      label: "Pack dispatched",
      sub: meeting.sentAt ? fmt(new Date(meeting.sentAt)) : "—",
      state: meeting.sentAt ? "done" : "current",
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

  const printHtml = (title: string, html: string) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<html><head><title>${title}</title><style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;line-height:1.6}</style></head><body>${html}</body></html>`,
    );
    w.document.close();
    w.print();
  };

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
        <div className="flex gap-2">
          {onManage && (
            <Button variant="outline" onClick={onManage}>
              <Settings2 className="h-4 w-4 mr-1" />
              Manage meeting
            </Button>
          )}
          <Button
            onClick={() => dispatchMut.mutate()}
            disabled={dispatchMut.isPending || meeting.attendees.length === 0}
          >
            {dispatchMut.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Package className="h-4 w-4 mr-1" />
            )}
            {meeting.sentAt ? "Re-dispatch board pack" : "Dispatch board pack"}
          </Button>
        </div>
      </div>

      <Stepper steps={steps} />

      <Tabs defaultValue="agenda">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="pack">Board pack</TabsTrigger>
          <TabsTrigger value="attendance">Attendance & quorum</TabsTrigger>
          <TabsTrigger value="minutes">Minutes</TabsTrigger>
          <TabsTrigger value="actions">Actions & follow-up</TabsTrigger>
        </TabsList>

        {/* AGENDA */}
        <TabsContent value="agenda">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Meeting agenda</CardTitle>
              <div className="flex gap-2">
                {onManage && (
                  <Button size="sm" variant="outline" onClick={onManage}>
                    Edit agenda
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    printHtml(
                      "Agenda",
                      `<h2>${meeting.title} — Agenda</h2><ol>${meeting.agenda.map((a) => `<li>${a.title}${a.presenter ? ` — ${a.presenter}` : ""}</li>`).join("")}</ol>`,
                    )
                  }
                >
                  Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Agenda item</TableHead>
                    <TableHead>Presenter</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meeting.agenda.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{a.title}</TableCell>
                      <TableCell>{a.presenter || "—"}</TableCell>
                      <TableCell>{a.durationMinutes}m</TableCell>
                    </TableRow>
                  ))}
                  {meeting.agenda.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground py-6"
                      >
                        No agenda items yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BOARD PACK */}
        <TabsContent value="pack" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Board pack documents</CardTitle>
              {onManage && (
                <Button size="sm" variant="outline" onClick={onManage}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add document
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {meeting.boardPack.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <div className="flex gap-3 items-center">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{d.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Uploaded{" "}
                        {d.uploadedAt ? fmt(new Date(d.uploadedAt)) : "—"}
                      </div>
                    </div>
                  </div>
                  {d.fileUrl && (
                    <Button size="sm" variant="ghost" asChild>
                      <a
                        href={resolveGrcFileUrl(d.fileUrl)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        View
                      </a>
                    </Button>
                  )}
                </div>
              ))}
              {meeting.boardPack.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No documents uploaded yet.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Acknowledgements</CardTitle>
              <p className="text-sm text-muted-foreground">
                Each attendee confirms receipt of the agenda and board pack —
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meeting.attendees.map((a, i) => {
                    const ack = acknowledgments.find(
                      (x) =>
                        x.attendeeEmail.toLowerCase() === a.email.toLowerCase(),
                    );
                    const present = meeting.attendanceRecordedAt
                      ? meeting.attendanceAllPresent ||
                        meeting.attendancePresentIndices?.includes(i)
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
                          {present === null ? (
                            "—"
                          ) : present ? (
                            <Badge>Present</Badge>
                          ) : (
                            <Badge variant="secondary">Absent</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {meeting.attendees.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground py-6"
                      >
                        No attendees yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {onManage && (
                <p className="text-xs text-muted-foreground mt-3">
                  Add attendees or record actual attendance via{" "}
                  <button className="underline" onClick={onManage}>
                    Manage meeting
                  </button>
                  .
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MINUTES */}
        <TabsContent value="minutes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Minutes</CardTitle>
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
              {meeting.minutesPdfUrl && (
                <Button size="sm" variant="outline" asChild>
                  <a
                    href={resolveGrcFileUrl(meeting.minutesPdfUrl)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download minutes PDF
                  </a>
                </Button>
              )}
              {onManage && (
                <p className="text-xs text-muted-foreground">
                  Draft, edit or send minutes via{" "}
                  <button className="underline" onClick={onManage}>
                    Manage meeting
                  </button>
                  .
                </p>
              )}
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
                  Add attendees first (via Manage meeting) before assigning
                  action items.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
