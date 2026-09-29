import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, Loader2, Mail, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  MEETING_CHECKLIST_ITEMS,
  setMeetingChecklistItem,
  updateMeetingNotice,
  dispatchMeetingNotice,
  type Meeting,
} from "@/lib/grc/governance-api";

// Preparation checklist + Notice — real, backend-persisted
// (grc/governance/meetings/:id/checklist/:itemId and .../notice),
// replacing the earlier localStorage-only prototype of the same
// shape. Completing all 10 checklist items is what unlocks the
// Dispatch button on the meeting workspace (see MeetingService#dispatch).

export function useMeetingPreparation(meeting: Meeting) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["grc-meetings"] });
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const checklistMut = useMutation({
    mutationFn: ({
      itemId,
      completed,
    }: {
      itemId: string;
      completed: boolean;
    }) => setMeetingChecklistItem(meeting._id, itemId, completed),
    onSuccess: invalidate,
    onError: onErr("Failed to update checklist"),
  });

  const noticeMut = useMutation({
    mutationFn: (dto: {
      body: string;
      minimumDays?: number;
      rsvpDeadline?: string;
    }) => updateMeetingNotice(meeting._id, dto),
    onSuccess: () => {
      invalidate();
      toast({ title: "Notice saved" });
    },
    onError: onErr("Failed to save notice"),
  });

  const dispatchNoticeMut = useMutation({
    mutationFn: () => dispatchMeetingNotice(meeting._id),
    onSuccess: () => {
      invalidate();
      toast({
        title: "Notice sent",
        description: `Sent to ${meeting.attendees.length} attendee(s).`,
      });
    },
    onError: onErr("Failed to send notice"),
  });

  const completed: Record<string, { at: string; by: string }> = {};
  (meeting.checklist ?? []).forEach((c) => {
    completed[c.itemId] = { at: c.completedAt, by: c.completedBy };
  });

  return {
    completed,
    toggle: (itemId: string, done: boolean) =>
      checklistMut.mutate({ itemId, completed: done }),
    isToggling: checklistMut.isPending,
    notice: meeting.notice,
    saveNotice: (dto: {
      body: string;
      minimumDays?: number;
      rsvpDeadline?: string;
    }) => noticeMut.mutate(dto),
    isSavingNotice: noticeMut.isPending,
    dispatchNotice: () => dispatchNoticeMut.mutate(),
    isDispatchingNotice: dispatchNoticeMut.isPending,
  };
}

export type MeetingPreparationState = ReturnType<typeof useMeetingPreparation>;

export function MeetingChecklist({
  meeting: _meeting,
  state,
}: {
  meeting: Meeting;
  state: MeetingPreparationState;
}) {
  const doneCount = Object.keys(state.completed).length;
  const pct = Math.round((doneCount / MEETING_CHECKLIST_ITEMS.length) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          Preparation checklist
          <span className="text-sm font-normal text-muted-foreground">
            {doneCount}/{MEETING_CHECKLIST_ITEMS.length} complete
          </span>
        </CardTitle>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {MEETING_CHECKLIST_ITEMS.map((item) => {
          const record = state.completed[item.id];
          const done = !!record;
          return (
            <button
              key={item.id}
              type="button"
              disabled={state.isToggling}
              onClick={() => state.toggle(item.id, !done)}
              className={`w-full text-left flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                done ? "bg-success/5 border-success/30" : "hover:bg-muted/40"
              }`}
            >
              <div
                className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border flex items-center justify-center ${
                  done
                    ? "bg-success border-success text-white"
                    : "border-muted-foreground/40"
                }`}
              >
                {done && <Check className="h-3 w-3" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground">
                  {item.detail}
                </div>
                {done && (
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Completed by {record.by} on{" "}
                    {new Date(record.at).toLocaleString()}
                  </div>
                )}
              </div>
            </button>
          );
        })}
        {doneCount < MEETING_CHECKLIST_ITEMS.length && (
          <p className="text-xs text-muted-foreground pt-1">
            All {MEETING_CHECKLIST_ITEMS.length} items must be complete before
            the board pack can be dispatched.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function MeetingNotice({
  meeting,
  state,
}: {
  meeting: Meeting;
  state: MeetingPreparationState;
}) {
  const notice = state.notice;
  const [body, setBody] = useState(notice.body ?? "");
  const [minimumDays, setMinimumDays] = useState(notice.minimumDays ?? 14);
  const [rsvpDeadline, setRsvpDeadline] = useState(
    notice.rsvpDeadline ? notice.rsvpDeadline.slice(0, 10) : "",
  );

  const autoDraft = () => {
    const date = new Date(meeting.date);
    const agendaLines = meeting.agenda
      .map(
        (a, i) =>
          `  ${i + 1}. ${a.title}${a.presenter ? ` — ${a.presenter}` : ""}`,
      )
      .join("\n");
    setBody(
      `Notice is hereby given of the ${meeting.type} meeting "${meeting.title}", to be held on ${date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} at ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}, ${meeting.location}.\n\nAgenda:\n${agendaLines || "  (to be confirmed)"}\n\nPlease confirm your attendance.`,
    );
  };

  const dispatched = !!notice.dispatchedAt;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Meeting notice</CardTitle>
          {!dispatched && (
            <Button size="sm" variant="outline" onClick={autoDraft}>
              Auto-draft
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {dispatched ? (
            <div className="rounded-md border bg-muted/20 p-3 whitespace-pre-wrap text-sm">
              {notice.body}
            </div>
          ) : (
            <Textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Draft the notice to send to attendees ahead of this meeting…"
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Minimum notice (days)</Label>
              <Input
                type="number"
                disabled={dispatched}
                value={minimumDays}
                onChange={(e) => setMinimumDays(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-xs">RSVP deadline</Label>
              <Input
                type="date"
                disabled={dispatched}
                value={rsvpDeadline}
                onChange={(e) => setRsvpDeadline(e.target.value)}
              />
            </div>
          </div>
          {!dispatched ? (
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                disabled={!body.trim() || state.isSavingNotice}
                onClick={() =>
                  state.saveNotice({
                    body,
                    minimumDays,
                    rsvpDeadline: rsvpDeadline || undefined,
                  })
                }
              >
                {state.isSavingNotice ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : null}
                Save draft
              </Button>
              <Button
                size="sm"
                disabled={
                  !body.trim() ||
                  meeting.attendees.length === 0 ||
                  state.isDispatchingNotice
                }
                onClick={() => {
                  state.saveNotice({
                    body,
                    minimumDays,
                    rsvpDeadline: rsvpDeadline || undefined,
                  });
                  state.dispatchNotice();
                }}
              >
                {state.isDispatchingNotice ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5 mr-1" />
                )}
                Send notice
              </Button>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" />
              Sent {new Date(notice.dispatchedAt!).toLocaleString()}
            </div>
          )}
          {meeting.attendees.length === 0 && !dispatched && (
            <p className="text-xs text-muted-foreground">
              This meeting has no attendees yet.
            </p>
          )}
        </CardContent>
      </Card>

      {dispatched && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">RSVPs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {notice.recipients.map((r) => (
              <div
                key={r.email}
                className="flex items-center justify-between text-sm border rounded-md px-3 py-2"
              >
                <div>
                  <span className="font-medium">{r.name}</span>{" "}
                  <span className="text-xs text-muted-foreground">
                    {r.email}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {r.openedAt && (
                    <span className="text-[11px] text-muted-foreground">
                      Opened {new Date(r.openedAt).toLocaleDateString()}
                    </span>
                  )}
                  <Badge
                    variant={
                      r.rsvp === "Confirmed"
                        ? "default"
                        : r.rsvp === "Apologies"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {r.rsvp}
                  </Badge>
                </div>
              </div>
            ))}
            {notice.recipients.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recipients.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
