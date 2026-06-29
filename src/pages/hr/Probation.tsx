// HR Probation Workflow — tenant view of all employees on probation,
// with the 90-day staged check-in timeline and final decision capture.
// Mock data — wire to live HR APIs later.

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CalendarDays,
  FileText,
  UserCheck,
  UserX,
  RotateCw,
  ClipboardList,
} from "lucide-react";

// ─── Types & mock data ─────────────────────────────────────────

type StageKey = "onboarding" | "month1" | "month2" | "month3" | "decision";
type StageStatus = "pending" | "due" | "completed" | "overdue";
type DecisionOutcome = "confirm" | "extend" | "terminate" | null;

interface StageRecord {
  key: StageKey;
  label: string;
  window: string; // e.g. "Day 25–30"
  owner: string;
  activities: string[];
  status: StageStatus;
  completedAt: string | null;
  notes: string | null;
}

interface ProbationCase {
  id: string;
  employeeName: string;
  jobTitle: string;
  department: string;
  lineManager: string;
  startDate: string; // ISO
  endDate: string; // ISO (Day 90)
  stages: StageRecord[];
  decision: DecisionOutcome;
  decisionNotes: string | null;
}

const today = new Date();
const isoDaysFromStart = (start: Date, days: number) => {
  const d = new Date(start);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

const makeStages = (start: Date, dayProgress: number): StageRecord[] => {
  const stageDefs: Array<{
    key: StageKey;
    label: string;
    window: string;
    dueDay: number;
    owner: string;
    activities: string[];
  }> = [
    {
      key: "onboarding",
      label: "Onboarding",
      window: "Day 1",
      dueDay: 1,
      owner: "Line manager / HR",
      activities: [
        "Issue probation letter and role expectations",
        "Set 90-day objectives and success measures",
      ],
    },
    {
      key: "month1",
      label: "Month 1 check-in",
      window: "Day 25–30",
      dueDay: 30,
      owner: "Line manager",
      activities: [
        "Informal review of settling-in and early performance",
        "Flag any concerns early; agree support if needed",
      ],
    },
    {
      key: "month2",
      label: "Month 2 review",
      window: "Day 55–60",
      dueDay: 60,
      owner: "Line manager / HR",
      activities: [
        "Formal mid-point assessment against objectives",
        "Written record of progress and any corrective actions",
      ],
    },
    {
      key: "month3",
      label: "Month 3 evaluation",
      window: "Day 80–85",
      dueDay: 85,
      owner: "Line manager",
      activities: [
        "Final performance assessment against probation criteria",
        "Recommendation prepared for sign-off",
      ],
    },
    {
      key: "decision",
      label: "Final decision",
      window: "Day 85–90",
      dueDay: 90,
      owner: "HR / Company Secretary",
      activities: [
        "HR and manager review the recommendation",
        "Decision recorded: confirm, extend, or terminate",
      ],
    },
  ];

  return stageDefs.map((s) => {
    let status: StageStatus = "pending";
    let completedAt: string | null = null;
    if (dayProgress >= s.dueDay + 5) {
      status = "completed";
      completedAt = isoDaysFromStart(start, s.dueDay);
    } else if (dayProgress >= s.dueDay - 5 && dayProgress <= s.dueDay + 5) {
      status = "due";
    } else if (dayProgress > s.dueDay + 5) {
      status = "overdue";
    }
    return {
      key: s.key,
      label: s.label,
      window: s.window,
      owner: s.owner,
      activities: s.activities,
      status,
      completedAt,
      notes: null,
    };
  });
};

const startMinus = (days: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - days);
  return d;
};

const MOCK_CASES: ProbationCase[] = [
  {
    id: "p1",
    employeeName: "Amara Okonkwo",
    jobTitle: "Junior Software Engineer",
    department: "Engineering",
    lineManager: "Adaeze Nwosu",
    startDate: startMinus(12).toISOString(),
    endDate: isoDaysFromStart(startMinus(12), 90),
    stages: makeStages(startMinus(12), 12),
    decision: null,
    decisionNotes: null,
  },
  {
    id: "p2",
    employeeName: "Brian Mensah",
    jobTitle: "Account Executive",
    department: "Sales & Marketing",
    lineManager: "Liam O'Connor",
    startDate: startMinus(34).toISOString(),
    endDate: isoDaysFromStart(startMinus(34), 90),
    stages: makeStages(startMinus(34), 34),
    decision: null,
    decisionNotes: null,
  },
  {
    id: "p3",
    employeeName: "Chinwe Ibrahim",
    jobTitle: "Operations Analyst",
    department: "Operations",
    lineManager: "Fatima Diallo",
    startDate: startMinus(58).toISOString(),
    endDate: isoDaysFromStart(startMinus(58), 90),
    stages: makeStages(startMinus(58), 58),
    decision: null,
    decisionNotes: null,
  },
  {
    id: "p4",
    employeeName: "Daniel Roy",
    jobTitle: "Customer Support Specialist",
    department: "Customer Support",
    lineManager: "Priya Sharma",
    startDate: startMinus(83).toISOString(),
    endDate: isoDaysFromStart(startMinus(83), 90),
    stages: makeStages(startMinus(83), 83),
    decision: null,
    decisionNotes: null,
  },
  {
    id: "p5",
    employeeName: "Esi Boateng",
    jobTitle: "People & Culture Coordinator",
    department: "People & Culture",
    lineManager: "Chiamaka Eze",
    startDate: startMinus(95).toISOString(),
    endDate: isoDaysFromStart(startMinus(95), 90),
    stages: makeStages(startMinus(95), 95).map((s) =>
      s.key !== "decision"
        ? { ...s, status: "completed", completedAt: s.completedAt ?? today.toISOString() }
        : s,
    ),
    decision: null,
    decisionNotes: null,
  },
];

// ─── Helpers ───────────────────────────────────────────────────

const dayProgress = (c: ProbationCase) => {
  const ms = today.getTime() - new Date(c.startDate).getTime();
  return Math.max(0, Math.min(90, Math.floor(ms / (1000 * 60 * 60 * 24))));
};

const stageBadge = (s: StageStatus) => {
  switch (s) {
    case "completed":
      return (
        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
        </Badge>
      );
    case "due":
      return (
        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
          <Clock className="h-3 w-3 mr-1" /> Due now
        </Badge>
      );
    case "overdue":
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
          <AlertTriangle className="h-3 w-3 mr-1" /> Overdue
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Pending
        </Badge>
      );
  }
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();

// ─── Page ──────────────────────────────────────────────────────

export default function HRProbation() {
  const [cases, setCases] = useState<ProbationCase[]>(MOCK_CASES);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = cases.find((c) => c.id === openId) ?? null;

  const totals = useMemo(() => {
    const active = cases.filter((c) => c.decision === null).length;
    const overdue = cases.reduce(
      (n, c) => n + c.stages.filter((s) => s.status === "overdue").length,
      0,
    );
    const dueSoon = cases.reduce(
      (n, c) => n + c.stages.filter((s) => s.status === "due").length,
      0,
    );
    const decisionReady = cases.filter(
      (c) => dayProgress(c) >= 85 && c.decision === null,
    ).length;
    return { active, overdue, dueSoon, decisionReady };
  }, [cases]);

  const updateStageNotes = (caseId: string, stageKey: StageKey, notes: string) =>
    setCases((prev) =>
      prev.map((c) =>
        c.id !== caseId
          ? c
          : {
              ...c,
              stages: c.stages.map((s) =>
                s.key === stageKey ? { ...s, notes } : s,
              ),
            },
      ),
    );

  const completeStage = (caseId: string, stageKey: StageKey) =>
    setCases((prev) =>
      prev.map((c) =>
        c.id !== caseId
          ? c
          : {
              ...c,
              stages: c.stages.map((s) =>
                s.key === stageKey
                  ? {
                      ...s,
                      status: "completed",
                      completedAt: new Date().toISOString(),
                    }
                  : s,
              ),
            },
      ),
    );

  const recordDecision = (
    caseId: string,
    decision: DecisionOutcome,
    notes: string,
  ) =>
    setCases((prev) =>
      prev.map((c) =>
        c.id !== caseId
          ? c
          : {
              ...c,
              decision,
              decisionNotes: notes,
              stages: c.stages.map((s) =>
                s.key === "decision"
                  ? {
                      ...s,
                      status: "completed",
                      completedAt: new Date().toISOString(),
                    }
                  : s,
              ),
            },
      ),
    );

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Probation Workflow</h1>
        <p className="text-sm text-muted-foreground">
          Track every new hire across the 90-day probation: onboarding, monthly
          check-ins, and final decision.
        </p>
      </header>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>On probation</CardDescription>
            <CardTitle className="text-2xl">{totals.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Check-ins due</CardDescription>
            <CardTitle className="text-2xl text-warning">
              {totals.dueSoon}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overdue stages</CardDescription>
            <CardTitle className="text-2xl text-destructive">
              {totals.overdue}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Awaiting final decision</CardDescription>
            <CardTitle className="text-2xl">{totals.decisionReady}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* List of probationers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active probations</CardTitle>
          <CardDescription>
            Click a row to open the timeline and record check-ins or the final
            decision.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {cases.map((c) => {
            const dp = dayProgress(c);
            const pct = Math.round((dp / 90) * 100);
            const nextStage =
              c.stages.find((s) => s.status !== "completed") ?? null;
            return (
              <div
                key={c.id}
                onClick={() => setOpenId(c.id)}
                className="cursor-pointer rounded-lg border p-4 hover:bg-muted/30 transition-colors space-y-3"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{c.employeeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.jobTitle} · {c.department} · Manager:{" "}
                      {c.lineManager}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.decision ? (
                      <Badge
                        variant="outline"
                        className={
                          c.decision === "confirm"
                            ? "bg-success/10 text-success border-success/20"
                            : c.decision === "extend"
                              ? "bg-warning/10 text-warning border-warning/20"
                              : "bg-destructive/10 text-destructive border-destructive/20"
                        }
                      >
                        {c.decision === "confirm" && (
                          <UserCheck className="h-3 w-3 mr-1" />
                        )}
                        {c.decision === "extend" && (
                          <RotateCw className="h-3 w-3 mr-1" />
                        )}
                        {c.decision === "terminate" && (
                          <UserX className="h-3 w-3 mr-1" />
                        )}
                        {c.decision.charAt(0).toUpperCase() +
                          c.decision.slice(1)}
                      </Badge>
                    ) : nextStage ? (
                      stageBadge(nextStage.status)
                    ) : null}
                    <Badge variant="outline">
                      <CalendarDays className="h-3 w-3 mr-1" />
                      Ends {fmtDate(c.endDate)}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Day {dp} of 90</span>
                    <span>
                      Next:{" "}
                      {nextStage
                        ? `${nextStage.label} (${nextStage.window})`
                        : "—"}
                    </span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Detail sheet */}
      <Sheet
        open={!!open}
        onOpenChange={(o) => !o && setOpenId(null)}
      >
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {open && (
            <ProbationDetail
              caseRec={open}
              onUpdateNotes={(k, n) => updateStageNotes(open.id, k, n)}
              onCompleteStage={(k) => completeStage(open.id, k)}
              onRecordDecision={(d, n) => recordDecision(open.id, d, n)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Detail / timeline ─────────────────────────────────────────

function ProbationDetail({
  caseRec,
  onUpdateNotes,
  onCompleteStage,
  onRecordDecision,
}: {
  caseRec: ProbationCase;
  onUpdateNotes: (k: StageKey, n: string) => void;
  onCompleteStage: (k: StageKey) => void;
  onRecordDecision: (d: DecisionOutcome, n: string) => void;
}) {
  const dp = dayProgress(caseRec);
  const [decision, setDecision] = useState<DecisionOutcome>(caseRec.decision);
  const [decisionNotes, setDecisionNotes] = useState(
    caseRec.decisionNotes ?? "",
  );
  const [extensionEnd, setExtensionEnd] = useState("");

  return (
    <>
      <SheetHeader>
        <SheetTitle>{caseRec.employeeName}</SheetTitle>
        <SheetDescription>
          {caseRec.jobTitle} · {caseRec.department} · Line manager:{" "}
          {caseRec.lineManager}
        </SheetDescription>
      </SheetHeader>

      <div className="mt-4 space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            Day {dp} of 90 · Start {fmtDate(caseRec.startDate)}
          </span>
          <span>Ends {fmtDate(caseRec.endDate)}</span>
        </div>
        <Progress value={(dp / 90) * 100} className="h-1.5" />
      </div>

      <Tabs defaultValue="timeline" className="mt-6">
        <TabsList>
          <TabsTrigger value="timeline">
            <ClipboardList className="h-4 w-4 mr-1" /> Timeline
          </TabsTrigger>
          <TabsTrigger value="decision">
            <FileText className="h-4 w-4 mr-1" /> Final decision
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-3 mt-4">
          {caseRec.stages
            .filter((s) => s.key !== "decision")
            .map((s) => (
              <Card key={s.key}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <CardTitle className="text-sm">{s.label}</CardTitle>
                      <CardDescription className="text-xs">
                        {s.window} · {s.owner}
                      </CardDescription>
                    </div>
                    {stageBadge(s.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                    {s.activities.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                  <div className="space-y-1">
                    <Label className="text-xs">Notes / written record</Label>
                    <Textarea
                      rows={3}
                      placeholder="Document observations, support agreed, corrective actions…"
                      value={s.notes ?? ""}
                      onChange={(e) => onUpdateNotes(s.key, e.target.value)}
                      disabled={s.status === "completed"}
                    />
                  </div>
                  {s.status !== "completed" && (
                    <Button
                      size="sm"
                      onClick={() => onCompleteStage(s.key)}
                      disabled={!(s.notes && s.notes.trim().length > 0)}
                    >
                      Mark stage complete
                    </Button>
                  )}
                  {s.completedAt && (
                    <p className="text-xs text-muted-foreground">
                      Completed {fmtDate(s.completedAt)}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="decision" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Final decision (Day 85–90)</CardTitle>
              <CardDescription className="text-xs">
                HR and the line manager agree one of three outcomes once the
                Month 3 evaluation is complete.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dp < 80 && !caseRec.decision && (
                <div className="rounded-md border border-warning/30 bg-warning/10 text-warning text-xs p-3">
                  Final decision is typically recorded between Day 85 and Day
                  90. Current day: {dp}.
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs">Outcome</Label>
                <Select
                  value={decision ?? ""}
                  onValueChange={(v) =>
                    setDecision((v as DecisionOutcome) || null)
                  }
                  disabled={!!caseRec.decision}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirm">
                      Confirm — met all objectives
                    </SelectItem>
                    <SelectItem value="extend">
                      Extend — needs more time (1–3 months)
                    </SelectItem>
                    <SelectItem value="terminate">
                      Terminate — did not meet standard
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {decision === "extend" && (
                <div className="space-y-1">
                  <Label className="text-xs">New probation end date</Label>
                  <Input
                    type="date"
                    value={extensionEnd}
                    onChange={(e) => setExtensionEnd(e.target.value)}
                    disabled={!!caseRec.decision}
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs">
                  {decision === "confirm" &&
                    "Confirmation reasoning (becomes confirmation letter)"}
                  {decision === "extend" &&
                    "Extension reasons and revised objectives"}
                  {decision === "terminate" &&
                    "Termination grounds, exit checklist notes, final pay & notice"}
                  {!decision && "Notes / required documentation"}
                </Label>
                <Textarea
                  rows={5}
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  disabled={!!caseRec.decision}
                  placeholder="Document everything that supports the decision…"
                />
              </div>

              {!caseRec.decision ? (
                <Button
                  size="sm"
                  disabled={
                    !decision ||
                    decisionNotes.trim().length === 0 ||
                    (decision === "extend" && !extensionEnd)
                  }
                  onClick={() => onRecordDecision(decision, decisionNotes)}
                >
                  Record decision
                </Button>
              ) : (
                <div className="rounded-md border border-success/30 bg-success/10 text-success text-xs p-3">
                  Decision recorded: <strong>{caseRec.decision}</strong>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
