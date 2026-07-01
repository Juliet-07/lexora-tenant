import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Gavel,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  ArrowUpRight,
  ShieldAlert,
  ScrollText,
  Scale,
} from "lucide-react";
import { toast } from "sonner";
import {
  useDisputes,
  updateDispute,
  appendInvestigationNote,
  appendHearingNote,
  STAGE_LABEL,
  STAGE_TONE,
  SEVERITY_TONE,
  type Dispute,
  type DisputeStage,
} from "@/lib/disputesStore";

export default function HRDisputes() {
  const items = useDisputes();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<string>("all");
  const [active, setActive] = useState<Dispute | null>(null);

  const filtered = useMemo(
    () =>
      items.filter(
        (d) =>
          (stage === "all" || d.stage === stage) &&
          (!search ||
            d.reporterName.toLowerCase().includes(search.toLowerCase()) ||
            d.againstName.toLowerCase().includes(search.toLowerCase()) ||
            d.title.toLowerCase().includes(search.toLowerCase())),
      ),
    [items, search, stage],
  );

  const stats = {
    open: items.filter((d) => d.stage !== "closed" && d.stage !== "court")
      .length,
    high: items.filter((d) => d.severity === "High" && d.stage !== "closed")
      .length,
    hearing: items.filter((d) => d.stage === "hearing").length,
    escalated: items.filter((d) =>
      ["escalated_local", "escalated_national", "court"].includes(d.stage),
    ).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dispute Management</h1>
          <p className="text-sm text-muted-foreground">
            Acknowledge cases within 2 working days, investigate, hear, decide,
            and hand appeals to next-level authority. Escalate to the Labour
            Inspectorate only after internal resolution fails.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Open" value={stats.open} icon={Gavel} tone="from-primary to-secondary" />
        <Stat label="High severity" value={stats.high} icon={AlertTriangle} tone="from-rose-500 to-red-600" />
        <Stat label="In hearing" value={stats.hearing} icon={Clock} tone="from-amber-500 to-orange-500" />
        <Stat label="Escalated externally" value={stats.escalated} icon={Scale} tone="from-fuchsia-500 to-purple-600" />
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search employee, respondent or title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {Object.entries(STAGE_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Cases</TabsTrigger>
          <TabsTrigger value="board">Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-3 mt-4">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                No cases match your filters.
              </CardContent>
            </Card>
          ) : (
            filtered.map((d) => (
              <CaseRow key={d.id} d={d} onOpen={() => setActive(d)} />
            ))
          )}
        </TabsContent>

        <TabsContent value="board" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {(
              [
                "reported",
                "acknowledged",
                "investigation",
                "hearing",
                "outcome",
                "appeal",
                "closed",
                "escalated_local",
              ] as DisputeStage[]
            ).map((s) => (
              <Card key={s}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>{STAGE_LABEL[s]}</span>
                    <Badge variant="outline">
                      {items.filter((d) => d.stage === s).length}
                    </Badge>
                  </div>
                  {items
                    .filter((d) => d.stage === s)
                    .map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setActive(d)}
                        className="w-full text-left border rounded-md p-2 text-xs space-y-1 hover:bg-muted/50"
                      >
                        <p className="font-medium">{d.title}</p>
                        <p className="text-muted-foreground">
                          {d.reporterName} → {d.againstName}
                        </p>
                        <Badge
                          variant="outline"
                          className={`${SEVERITY_TONE[d.severity]} text-[10px]`}
                        >
                          {d.severity}
                        </Badge>
                      </button>
                    ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <CaseSheet
        dispute={active}
        onClose={() => setActive(null)}
        onChange={(next) => setActive(next)}
      />
    </div>
  );
}

function CaseRow({ d, onOpen }: { d: Dispute; onOpen: () => void }) {
  return (
    <Card className="hover:border-primary/40 transition-colors">
      <CardContent className="p-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{d.title}</p>
            <Badge variant="outline" className={SEVERITY_TONE[d.severity]}>
              {d.severity}
            </Badge>
            <Badge variant="outline">{d.type}</Badge>
            {d.managerLooped ? (
              <Badge variant="outline" className="text-[10px]">
                Manager looped: {d.loopedManagerName}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">
                Tenant-only
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Filed by <strong>{d.reporterName}</strong> ({d.reporterRole}) against{" "}
            <strong>{d.againstName}</strong> ({d.againstRole}) · {d.filedOn}
          </p>
          <p className="text-sm mt-2 line-clamp-2">{d.description}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline" className={STAGE_TONE[d.stage]}>
            {STAGE_LABEL[d.stage]}
          </Badge>
          <Button size="sm" variant="outline" onClick={onOpen}>
            Open case <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Detail sheet with stage actions ─────────────────────────────
function CaseSheet({
  dispute,
  onClose,
  onChange,
}: {
  dispute: Dispute | null;
  onClose: () => void;
  onChange: (d: Dispute) => void;
}) {
  const [ackNote, setAckNote] = useState("");
  const [invNote, setInvNote] = useState("");
  const [hearingDate, setHearingDate] = useState("");
  const [hearingVenue, setHearingVenue] = useState("");
  const [hearingNote, setHearingNote] = useState("");
  const [outcomeDecision, setOutcomeDecision] = useState<any>(
    "First written warning",
  );
  const [outcomeRationale, setOutcomeRationale] = useState("");
  const [appealDecision, setAppealDecision] = useState<"Upheld" | "Dismissed" | "Modified">("Dismissed");
  const [appealNote, setAppealNote] = useState("");
  const [escalationNote, setEscalationNote] = useState("");

  const [outcomeOpen, setOutcomeOpen] = useState(false);

  if (!dispute) return null;
  const d = dispute;

  const patch = (next: Partial<Dispute>) => {
    updateDispute(d.id, next);
    onChange({ ...d, ...next });
  };

  return (
    <Sheet open={!!dispute} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{d.title}</SheetTitle>
          <p className="text-xs text-muted-foreground">
            {d.id} · Filed {d.filedOn} · {d.type}
          </p>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          <Card>
            <CardContent className="p-4 space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Reporter:</span>{" "}
                <strong>{d.reporterName}</strong> ({d.reporterRole})
              </p>
              <p>
                <span className="text-muted-foreground">Respondent:</span>{" "}
                <strong>{d.againstName}</strong> ({d.againstRole}) —{" "}
                {d.againstDepartment ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Severity:</span>{" "}
                <Badge variant="outline" className={SEVERITY_TONE[d.severity]}>
                  {d.severity}
                </Badge>
              </p>
              <p>
                <span className="text-muted-foreground">Stage:</span>{" "}
                <Badge variant="outline" className={STAGE_TONE[d.stage]}>
                  {STAGE_LABEL[d.stage]}
                </Badge>
              </p>
              <p className="text-sm pt-2">{d.description}</p>
              {d.outcomeSought && (
                <p className="text-xs text-muted-foreground">
                  Outcome sought: {d.outcomeSought}
                </p>
              )}
              {d.witnesses && (
                <p className="text-xs text-muted-foreground">
                  Witnesses: {d.witnesses}
                </p>
              )}
              {d.managerLooped && (
                <p className="text-xs pt-1">
                  <ShieldAlert className="h-3 w-3 inline mr-1" />
                  Investigation shared with reporter's manager (
                  {d.loopedManagerName}).
                </p>
              )}
            </CardContent>
          </Card>

          {/* Acknowledge */}
          {d.stage === "reported" && (
            <Section title="Step 1 — Acknowledge">
              <p className="text-xs text-muted-foreground">
                Issue written acknowledgment within 2 working days;
                confidentiality explained.
              </p>
              <Textarea
                rows={3}
                value={ackNote}
                onChange={(e) => setAckNote(e.target.value)}
                placeholder="Acknowledgment note to reporter…"
              />
              <Button
                size="sm"
                onClick={() => {
                  patch({
                    stage: "acknowledged",
                    acknowledgement: {
                      at: today(),
                      by: "HR",
                      note: ackNote || "Acknowledged; investigation to follow.",
                    },
                  });
                  setAckNote("");
                  toast.success("Case acknowledged.");
                }}
              >
                Acknowledge case
              </Button>
            </Section>
          )}

          {d.acknowledgement && (
            <Section title="Acknowledgement">
              <p className="text-xs">
                {d.acknowledgement.by} · {d.acknowledgement.at}
              </p>
              <p className="text-sm">{d.acknowledgement.note}</p>
            </Section>
          )}

          {/* Investigate */}
          {(d.stage === "acknowledged" || d.stage === "investigation") && (
            <Section title="Step 2 — Investigate">
              <p className="text-xs text-muted-foreground">
                {d.managerLooped
                  ? `HR + ${d.loopedManagerName} both add findings. 5–10 working days target.`
                  : "Tenant-only investigation (respondent is a manager/HoD)."}
              </p>
              <Textarea
                rows={3}
                value={invNote}
                onChange={(e) => setInvNote(e.target.value)}
                placeholder="Interview / evidence note…"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!invNote.trim()) return;
                    appendInvestigationNote(d.id, {
                      by: "HR",
                      role: "HR",
                      note: invNote,
                      at: today(),
                    });
                    setInvNote("");
                    if (d.stage !== "investigation") patch({ stage: "investigation" });
                    onChange({
                      ...d,
                      stage: "investigation",
                      investigationNotes: [
                        ...d.investigationNotes,
                        { by: "HR", role: "HR", note: invNote, at: today() },
                      ],
                    });
                  }}
                >
                  Add finding
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    patch({
                      stage: "hearing",
                      hearing: d.hearing ?? { notes: [] },
                    });
                    toast.success("Moved to hearing.");
                  }}
                >
                  Close investigation → Hearing
                </Button>
              </div>
              {d.investigationNotes.length > 0 && (
                <ul className="mt-3 space-y-2 text-sm">
                  {d.investigationNotes.map((n, i) => (
                    <li key={i} className="border rounded-md p-2">
                      <p className="text-xs text-muted-foreground">
                        {n.by} ({n.role}) · {n.at}
                      </p>
                      <p>{n.note}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}

          {/* Hearing */}
          {d.stage === "hearing" && (
            <Section title="Step 3 — Hearing">
              <p className="text-xs text-muted-foreground">
                Schedule within 5 working days of investigation close. Employee
                has right of representation.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={hearingDate || d.hearing?.scheduledAt || ""}
                    onChange={(e) => setHearingDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Venue</Label>
                  <Input
                    value={hearingVenue || d.hearing?.venue || ""}
                    onChange={(e) => setHearingVenue(e.target.value)}
                    placeholder="e.g. HR Boardroom"
                  />
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const hearing = {
                    ...(d.hearing ?? { notes: [] }),
                    scheduledAt: hearingDate || d.hearing?.scheduledAt,
                    venue: hearingVenue || d.hearing?.venue,
                  };
                  patch({ hearing });
                  toast.success("Hearing scheduled.");
                }}
              >
                Save hearing details
              </Button>

              <Textarea
                rows={3}
                value={hearingNote}
                onChange={(e) => setHearingNote(e.target.value)}
                placeholder="Hearing minute / testimony note…"
                className="mt-2"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!hearingNote.trim()) return;
                    appendHearingNote(d.id, {
                      by: "HR",
                      role: "HR",
                      note: hearingNote,
                      at: today(),
                    });
                    const hearing = d.hearing ?? { notes: [] };
                    onChange({
                      ...d,
                      hearing: {
                        ...hearing,
                        notes: [
                          ...hearing.notes,
                          { by: "HR", role: "HR", note: hearingNote, at: today() },
                        ],
                      },
                    });
                    setHearingNote("");
                  }}
                >
                  Add hearing note
                </Button>
                <Button size="sm" onClick={() => setOutcomeOpen(true)}>
                  Record outcome
                </Button>
              </div>
              {d.hearing?.notes?.length ? (
                <ul className="mt-3 space-y-2 text-sm">
                  {d.hearing.notes.map((n, i) => (
                    <li key={i} className="border rounded-md p-2">
                      <p className="text-xs text-muted-foreground">
                        {n.by} · {n.at}
                      </p>
                      <p>{n.note}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Section>
          )}

          {/* Outcome recorded */}
          {d.outcome && (
            <Section title="Outcome">
              <p className="text-xs text-muted-foreground">
                {d.outcome.by} · {d.outcome.at}
              </p>
              <p>
                <Badge variant="outline">{d.outcome.decision}</Badge>
              </p>
              <p className="text-sm">{d.outcome.rationale}</p>
            </Section>
          )}

          {/* Appeal window (after outcome) */}
          {d.stage === "outcome" && (
            <Section title="Step 5 — Appeal window">
              <p className="text-xs text-muted-foreground">
                Employee has 5 working days to appeal. Move directly to close if
                no appeal is filed.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => patch({ stage: "closed" })}
              >
                Close case (no appeal)
              </Button>
            </Section>
          )}

          {/* Appeal review */}
          {d.stage === "appeal" && d.appeal && (
            <Section title="Step 5 — Review appeal">
              <p className="text-xs text-muted-foreground">
                Filed {d.appeal.filedAt} · reviewed by next-level authority.
              </p>
              <p className="text-sm">
                <strong>Grounds:</strong> {d.appeal.grounds}
              </p>
              <p className="text-sm">
                <strong>Remedy sought:</strong> {d.appeal.remedySought}
              </p>
              <Select
                value={appealDecision}
                onValueChange={(v: any) => setAppealDecision(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Upheld", "Dismissed", "Modified"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                rows={3}
                value={appealNote}
                onChange={(e) => setAppealNote(e.target.value)}
                placeholder="Appeal decision rationale…"
              />
              <Button
                size="sm"
                onClick={() => {
                  patch({
                    stage: "closed",
                    appeal: {
                      ...d.appeal!,
                      decision: appealDecision,
                      decisionNote: appealNote,
                      decidedAt: today(),
                    },
                  });
                  toast.success("Appeal decided; case closed.");
                }}
              >
                Decide appeal & close
              </Button>
            </Section>
          )}

          {/* Escalation */}
          <Section title="External escalation (Labour Inspectorate / Courts)">
            <p className="text-xs text-muted-foreground">
              Use only after internal resolution has failed. Mandatory referral
              path under Rwandan labour law.
            </p>
            <Textarea
              rows={2}
              value={escalationNote}
              onChange={(e) => setEscalationNote(e.target.value)}
              placeholder="Reason for escalation…"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  escalate(d, "escalated_local", escalationNote, patch, onChange)
                }
              >
                Refer to Labour Inspectorate (local)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  escalate(d, "escalated_national", escalationNote, patch, onChange)
                }
              >
                Escalate to national inspector
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  escalate(d, "court", escalationNote, patch, onChange)
                }
              >
                Refer to Primary Court
              </Button>
            </div>
            {d.escalation.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs">
                {d.escalation.map((e, i) => (
                  <li key={i} className="border rounded-md p-2">
                    <strong>{e.level}</strong> · {e.at}
                    <div>{e.note}</div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* Outcome dialog */}
        <Dialog open={outcomeOpen} onOpenChange={setOutcomeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record outcome</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Decision</Label>
                <Select
                  value={outcomeDecision}
                  onValueChange={(v: any) => setOutcomeDecision(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Verbal warning",
                      "First written warning",
                      "Final written warning",
                      "Suspension",
                      "Termination",
                      "Grievance upheld",
                      "Grievance dismissed",
                      "No case to answer",
                    ].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Rationale</Label>
                <Textarea
                  rows={3}
                  value={outcomeRationale}
                  onChange={(e) => setOutcomeRationale(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  patch({
                    stage: "outcome",
                    outcome: {
                      decision: outcomeDecision,
                      rationale: outcomeRationale,
                      at: today(),
                      by: "HR",
                    },
                  });
                  setOutcomeOpen(false);
                  setOutcomeRationale("");
                  toast.success("Outcome recorded.");
                }}
              >
                Save outcome
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

function escalate(
  d: Dispute,
  level: DisputeStage,
  note: string,
  patch: (n: Partial<Dispute>) => void,
  onChange: (d: Dispute) => void,
) {
  const entry = {
    level: STAGE_LABEL[level],
    at: today(),
    note: note || "Escalated externally.",
  };
  patch({ stage: level, escalation: [...d.escalation, entry] });
  onChange({ ...d, stage: level, escalation: [...d.escalation, entry] });
  toast.success(`Escalated to ${STAGE_LABEL[level]}.`);
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 border rounded-lg p-3">
      <p className="text-sm font-semibold flex items-center gap-2">
        <ScrollText className="h-4 w-4 text-muted-foreground" />
        {title}
      </p>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: any;
  icon: any;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div
          className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
      </CardContent>
    </Card>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
