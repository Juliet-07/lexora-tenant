import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  updateMeetingMinutesDraft,
  setMeetingMinutesDraftStatus,
  updateMeetingMinutes,
  type Meeting,
  type MinuteSection,
  type MinuteSectionKind,
  type MinutesDraftAction,
  type MinutesDraftStatus,
} from "@/lib/grc/governance-api";

// Structured minutes drafting — real, backend-persisted
// (grc/governance/meetings/:id/minutes-draft[/status]), replacing the
// earlier localStorage-only prototype of the same shape. Sections
// start out generated from the meeting's real agenda; "Generate final
// minutes" renders the draft to HTML and saves it through the
// existing updateMeetingMinutes()/sendMinutes() flow, unchanged.

const LIBRARY: { title: string; kind: MinuteSectionKind }[] = [
  { title: "Opening, welcome & confirmation of quorum", kind: "Procedural" },
  { title: "Apologies for absence", kind: "Procedural" },
  { title: "Declarations of interest", kind: "Procedural" },
  { title: "Confirmation of previous minutes", kind: "Procedural" },
  { title: "CEO / MD report", kind: "Noting" },
  { title: "Financial review", kind: "Noting" },
  { title: "Committee report", kind: "Noting" },
  { title: "Risk & compliance update", kind: "Noting" },
  { title: "Approval of resolution", kind: "Resolution" },
  { title: "Any other business & close", kind: "Procedural" },
];

const STATUSES: MinutesDraftStatus[] = [
  "Draft",
  "Sent for Chair review",
  "Chair approved",
  "Tabled for Board adoption",
  "Adopted and signed",
];

const inferKind = (title: string): MinuteSectionKind => {
  const t = title.toLowerCase();
  if (/approv|resolut|ratif|declar|adopt/.test(t)) return "Resolution";
  if (/open|quorum|minutes|apolog|close|aob|other business/.test(t))
    return "Procedural";
  return "Noting";
};

let seq = 0;
const tmpId = () => `tmp_${Date.now()}_${seq++}`;

// Formats every conflict-of-interest declaration recorded for this
// meeting (whether recorded by the tenant from the Attendance
// register, or self-declared by a board member from their portal)
// into the minutes' "Declarations of interest" text — so neither side
// has to retype what was already captured there.
function formatConflictsText(meeting: Meeting): string {
  const declarations = meeting.conflictDeclarations ?? [];
  if (declarations.length === 0) return "None declared.";
  return declarations
    .map((c) => {
      const agenda = c.agendaItems?.length
        ? ` (re: ${c.agendaItems.join(", ")})`
        : "";
      return `${c.declaredByName}${agenda}: ${c.natureOfConflict} — ${c.actionTaken}.`;
    })
    .join("\n");
}

function buildInitial(meeting: Meeting): {
  sections: MinuteSection[];
  quorumText: string;
  conflicts: string;
} {
  const present = meeting.attendanceRecordedAt
    ? meeting.attendanceAllPresent
      ? meeting.attendees.length
      : meeting.attendancePresentIndices.length
    : null;
  const quorumText =
    present !== null
      ? `${present} of ${meeting.attendees.length} attendees present — ${
          present >= Math.floor(meeting.attendees.length / 2) + 1
            ? "quorum met"
            : "quorum NOT met"
        }.`
      : "Attendance not yet recorded.";

  const sections: MinuteSection[] =
    meeting.agenda.length > 0
      ? meeting.agenda.map((a) => ({
          _id: tmpId(),
          title: a.title,
          kind: inferKind(a.title),
          presenter: a.presenter ?? "",
          time: "",
          body: "",
          resolution: null,
        }))
      : [];

  return { sections, quorumText, conflicts: formatConflictsText(meeting) };
}

export function MinutesDrafter({ meeting }: { meeting: Meeting }) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["grc-meetings"] });
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const draft = meeting.minutesDraft;
  const seed = !draft ? buildInitial(meeting) : null;

  const [chair, setChair] = useState(draft?.chair ?? meeting.chair);
  const [minuteTaker, setMinuteTaker] = useState(draft?.minuteTaker ?? "");
  const [quorumText, setQuorumText] = useState(
    draft?.quorumText ?? seed?.quorumText ?? "",
  );
  const [conflicts, setConflicts] = useState(
    draft?.conflicts ?? seed?.conflicts ?? "",
  );
  const [sections, setSections] = useState<MinuteSection[]>(
    draft?.sections ?? seed?.sections ?? [],
  );
  const [actions, setActions] = useState<MinutesDraftAction[]>(
    draft?.actions ?? [],
  );

  useEffect(() => {
    if (draft) {
      setChair(draft.chair || meeting.chair);
      setMinuteTaker(draft.minuteTaker);
      setQuorumText(draft.quorumText);
      setConflicts(draft.conflicts);
      setSections(draft.sections);
      setActions(draft.actions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting._id]);

  const saveMut = useMutation({
    mutationFn: () =>
      updateMeetingMinutesDraft(meeting._id, {
        chair,
        minuteTaker,
        quorumText,
        conflicts,
        sections: sections.map(({ _id, ...s }) => s),
        actions,
      }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Minutes draft saved" });
    },
    onError: onErr("Failed to save minutes draft"),
  });

  const statusMut = useMutation({
    mutationFn: (status: MinutesDraftStatus) =>
      setMeetingMinutesDraftStatus(meeting._id, status),
    onSuccess: invalidate,
    onError: onErr("Failed to update status"),
  });

  const generateMut = useMutation({
    mutationFn: () => updateMeetingMinutes(meeting._id, toHtml()),
    onSuccess: () => {
      invalidate();
      toast({ title: "Final minutes generated from the draft" });
    },
    onError: onErr("Failed to generate final minutes"),
  });

  const toHtml = () => {
    const parts: string[] = [];
    parts.push(`<h2>${meeting.title} — Minutes</h2>`);
    parts.push(
      `<p><strong>Date:</strong> ${new Date(meeting.date).toLocaleString()}<br/>` +
        `<strong>Chair:</strong> ${chair}<br/>` +
        `<strong>Minute taker:</strong> ${minuteTaker || "—"}</p>`,
    );
    parts.push(`<p><strong>Quorum:</strong> ${quorumText}</p>`);
    if (conflicts.trim())
      parts.push(
        `<p><strong>Declarations of interest:</strong> ${conflicts}</p>`,
      );
    sections.forEach((s, i) => {
      parts.push(`<h3>${i + 1}. ${s.title} (${s.kind})</h3>`);
      if (s.presenter)
        parts.push(`<p><em>Presented by ${s.presenter}</em></p>`);
      if (s.body) parts.push(`<p>${s.body.replace(/\n/g, "<br/>")}</p>`);
      if (s.resolution) {
        const r = s.resolution;
        parts.push(
          `<p><strong>Resolution ${r.ref || ""}:</strong> Proposed by ${r.proposedBy || "—"}, seconded by ${r.secondedBy || "—"}. ` +
            `For: ${r.for}, Against: ${r.against}, Abstained: ${r.abstained}. <strong>Outcome: ${r.outcome}</strong>.</p>`,
        );
      }
    });
    if (actions.length > 0) {
      parts.push(`<h3>Action items</h3><ul>`);
      actions.forEach((a) =>
        parts.push(
          `<li>${a.action} — ${a.owner || "—"} (due ${a.due || "—"})</li>`,
        ),
      );
      parts.push(`</ul>`);
    }
    return parts.join("\n");
  };

  const move = (i: number, dir: -1 | 1) => {
    setSections((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const updateSection = (i: number, patch: Partial<MinuteSection>) =>
    setSections((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    );

  const removeSection = (i: number) =>
    setSections((prev) => prev.filter((_, idx) => idx !== i));

  const addSection = (title: string, kind: MinuteSectionKind) =>
    setSections((prev) => [
      ...prev,
      {
        _id: tmpId(),
        title,
        kind,
        presenter: "",
        time: "",
        body: "",
        resolution: null,
      },
    ]);

  const status = draft?.status ?? "Draft";
  const statusIdx = STATUSES.indexOf(status);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Minutes status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center flex-wrap gap-1">
            {STATUSES.map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <Badge
                  variant={i <= statusIdx ? "default" : "outline"}
                  className="whitespace-nowrap"
                >
                  {i < statusIdx && <Check className="h-3 w-3 mr-1" />}
                  {s}
                </Badge>
                {i < STATUSES.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
          {statusIdx < STATUSES.length - 1 && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              disabled={statusMut.isPending}
              onClick={() => statusMut.mutate(STATUSES[statusIdx + 1])}
            >
              {statusMut.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : null}
              Advance to "{STATUSES[statusIdx + 1]}"
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Minutes draft</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Chair</Label>
              <Input value={chair} onChange={(e) => setChair(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Minute taker</Label>
              <Select value={minuteTaker} onValueChange={setMinuteTaker}>
                <SelectTrigger>
                  <SelectValue placeholder="Select attendee" />
                </SelectTrigger>
                <SelectContent>
                  {meeting.attendees.map((a) => (
                    <SelectItem key={a.email} value={a.name}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Quorum</Label>
              <Input
                value={quorumText}
                onChange={(e) => setQuorumText(e.target.value)}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Declarations of interest</Label>
              {(meeting.conflictDeclarations?.length ?? 0) > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[11px] px-2"
                  onClick={() => setConflicts(formatConflictsText(meeting))}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Sync from Attendance register
                </Button>
              )}
            </div>
            <Textarea
              rows={2}
              value={conflicts}
              onChange={(e) => setConflicts(e.target.value)}
              placeholder="None declared, or list conflicts raised…"
            />
            {(meeting.conflictDeclarations?.length ?? 0) > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">
                {meeting.conflictDeclarations!.length} conflict(s) recorded on
                the Attendance register — pulled in automatically; edit freely
                above.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Sections</Label>
            {sections.map((s, i) => (
              <div key={s._id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex flex-col gap-0.5 pt-1">
                    <button onClick={() => move(i, -1)} disabled={i === 0}>
                      <ArrowUp className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === sections.length - 1}
                    >
                      <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex-1 grid md:grid-cols-4 gap-2">
                    <Input
                      className="md:col-span-2"
                      value={s.title}
                      onChange={(e) =>
                        updateSection(i, { title: e.target.value })
                      }
                      placeholder="Section title"
                    />
                    <Select
                      value={s.kind}
                      onValueChange={(v) =>
                        updateSection(i, {
                          kind: v as MinuteSectionKind,
                          resolution:
                            v === "Resolution"
                              ? (s.resolution ?? {
                                  ref: "",
                                  proposedBy: "",
                                  secondedBy: "",
                                  for: 0,
                                  against: 0,
                                  abstained: 0,
                                  outcome: "Passed",
                                })
                              : null,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          [
                            "Procedural",
                            "Noting",
                            "Discussion",
                            "Resolution",
                          ] as const
                        ).map((k) => (
                          <SelectItem key={k} value={k}>
                            {k}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={s.presenter || undefined}
                      onValueChange={(v) => updateSection(i, { presenter: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Presenter" />
                      </SelectTrigger>
                      <SelectContent>
                        {meeting.attendees.map((a) => (
                          <SelectItem key={a.email} value={a.name}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <button onClick={() => removeSection(i)} className="pt-2">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                <Textarea
                  rows={2}
                  value={s.body}
                  onChange={(e) => updateSection(i, { body: e.target.value })}
                  placeholder="Narrative for this section…"
                />
                {s.kind === "Resolution" && s.resolution && (
                  <div className="grid md:grid-cols-6 gap-2 bg-muted/20 rounded-md p-2">
                    <Input
                      className="md:col-span-2"
                      placeholder="Ref (e.g. RES-2026-020)"
                      value={s.resolution.ref}
                      onChange={(e) =>
                        updateSection(i, {
                          resolution: { ...s.resolution!, ref: e.target.value },
                        })
                      }
                    />
                    <Input
                      placeholder="Proposed by"
                      value={s.resolution.proposedBy}
                      onChange={(e) =>
                        updateSection(i, {
                          resolution: {
                            ...s.resolution!,
                            proposedBy: e.target.value,
                          },
                        })
                      }
                    />
                    <Input
                      placeholder="Seconded by"
                      value={s.resolution.secondedBy}
                      onChange={(e) =>
                        updateSection(i, {
                          resolution: {
                            ...s.resolution!,
                            secondedBy: e.target.value,
                          },
                        })
                      }
                    />
                    <Input
                      type="number"
                      placeholder="For"
                      value={s.resolution.for}
                      onChange={(e) =>
                        updateSection(i, {
                          resolution: {
                            ...s.resolution!,
                            for: Number(e.target.value),
                          },
                        })
                      }
                    />
                    <Select
                      value={s.resolution.outcome}
                      onValueChange={(v) =>
                        updateSection(i, {
                          resolution: { ...s.resolution!, outcome: v as any },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          [
                            "Passed",
                            "Not passed",
                            "Deferred",
                            "Withdrawn",
                          ] as const
                        ).map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ))}
            <div className="flex gap-2 flex-wrap">
              {LIBRARY.map((l) => (
                <Button
                  key={l.title}
                  size="sm"
                  variant="outline"
                  onClick={() => addSection(l.title, l.kind)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {l.title}
                </Button>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() => addSection("New item", "Noting")}
              >
                <Plus className="h-3 w-3 mr-1" />
                Custom section
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Post-meeting actions</Label>
            {actions.map((a, i) => (
              <div key={i} className="grid grid-cols-6 gap-2">
                <Input
                  className="col-span-3"
                  placeholder="Action"
                  value={a.action}
                  onChange={(e) =>
                    setActions((prev) =>
                      prev.map((x, idx) =>
                        idx === i ? { ...x, action: e.target.value } : x,
                      ),
                    )
                  }
                />
                <Select
                  value={a.owner || undefined}
                  onValueChange={(v) =>
                    setActions((prev) =>
                      prev.map((x, idx) =>
                        idx === i ? { ...x, owner: v } : x,
                      ),
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {meeting.attendees.map((att) => (
                      <SelectItem key={att.email} value={att.name}>
                        {att.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={a.due}
                  onChange={(e) =>
                    setActions((prev) =>
                      prev.map((x, idx) =>
                        idx === i ? { ...x, due: e.target.value } : x,
                      ),
                    )
                  }
                />
                <button
                  onClick={() =>
                    setActions((prev) => prev.filter((_, idx) => idx !== i))
                  }
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setActions((prev) => [
                  ...prev,
                  { action: "", owner: "", due: "" },
                ])
              }
            >
              <Plus className="h-3 w-3 mr-1" />
              Add action
            </Button>
          </div>

          <div className="flex gap-2 justify-end border-t pt-3">
            <Button
              variant="outline"
              disabled={saveMut.isPending}
              onClick={() => saveMut.mutate()}
            >
              {saveMut.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : null}
              Save draft
            </Button>
            <Button
              disabled={generateMut.isPending || sections.length === 0}
              onClick={() => generateMut.mutate()}
            >
              {generateMut.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : null}
              Generate final minutes
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            "Generate final minutes" renders this draft into the Minutes section
            below, ready to send to attendees once the meeting is marked held.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
