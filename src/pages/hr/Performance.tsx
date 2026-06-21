import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Target,
  Star,
  TrendingUp,
  Award,
  CheckCircle2,
  Plus,
  Trash2,
  Save,
  Send,
  Gauge,
  Users,
  Calendar,
  FileSignature,
  ClipboardList,
  GraduationCap,
  ScrollText,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { employees } from "@/data/hrMockData";
import {
  perfStore,
  usePerfStore,
  newId,
  computeKpiTotal,
  kpiRatingBand,
  competencyAverage,
  valuesAverage,
  type KPA,
  type Scorecard,
  type ReviewStatus,
  type Cycle,
  type CompetencyRow,
  type ValueRow,
  type ComplianceCheck,
  type PreviousGoal,
  type NextGoal,
  type TrainingItem,
  type ManagerEvaluation,
} from "@/lib/performanceStore";

const statusTone: Record<ReviewStatus, string> = {
  "Not Started": "bg-muted text-muted-foreground",
  "Self Review": "bg-info/10 text-info border-info/20",
  "Manager Review": "bg-warning/10 text-warning border-warning/20",
  Calibration: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  Completed: "bg-success/10 text-success border-success/20",
};

export default function HRPerformance() {
  const cycles = usePerfStore((s) => s.cycles);
  const scorecards = usePerfStore((s) => s.scorecards);
  const feedback = usePerfStore((s) => s.feedback);

  const [activeCycleId, setActiveCycleId] = useState<string>(
    cycles[0]?.id ?? "",
  );
  const activeCycle = cycles.find((c) => c.id === activeCycleId) ?? cycles[0];

  const cards = useMemo(
    () => scorecards.filter((s) => s.cycleId === activeCycle?.id),
    [scorecards, activeCycle],
  );
  const completed = cards.filter((c) => c.status === "Completed");
  const inProgress = cards.filter(
    (c) => !["Not Started", "Completed"].includes(c.status),
  );
  const avgRating = completed.length
    ? Math.round(
        completed.reduce((s, c) => s + (c.finalRating ?? 0), 0) /
          completed.length,
      )
    : "—";

  const [selected, setSelected] = useState<Scorecard | null>(null);
  // Re-sync selected to latest store data on every render.
  const selectedLive = selected
    ? (scorecards.find((s) => s.id === selected.id) ?? null)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Performance</h1>
          <p className="text-sm text-muted-foreground">
            Configure KPAs & KPIs per employee and run the end-to-end review
            (dual scoring, competencies, values, goals, sign-off).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Stat
          label="Reviews In Progress"
          value={inProgress.length}
          icon={TrendingUp}
          tone="from-amber-500 to-orange-500"
        />
        <Stat
          label="Completed"
          value={completed.length}
          icon={CheckCircle2}
          tone="from-emerald-500 to-teal-500"
        />
        <Stat
          label="Avg Final Score"
          value={typeof avgRating === "number" ? `${avgRating}/100` : avgRating}
          icon={Star}
          tone="from-violet-500 to-purple-600"
        />
      </div>

      <Tabs defaultValue="scorecards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scorecards">
            <Gauge className="h-4 w-4 mr-2" /> KPAs & Scorecards
          </TabsTrigger>
          <TabsTrigger value="reviews">
            <Users className="h-4 w-4 mr-2" /> Review Workflow
          </TabsTrigger>
          <TabsTrigger value="calibration">
            <Target className="h-4 w-4 mr-2" /> Calibration
          </TabsTrigger>
          <TabsTrigger value="feedback">
            <Award className="h-4 w-4 mr-2" /> Continuous Feedback
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scorecards" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Define what each employee will be measured on. Total weight should
              equal 100%.
            </p>
            <AssignEmployeeDialog
              cycleId={activeCycle?.id ?? ""}
              existing={cards.map((c) => c.employeeId)}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {cards.map((sc) => (
              <ScorecardCard
                key={sc.id}
                sc={sc}
                onOpen={() => setSelected(sc)}
                mode="setup"
              />
            ))}
            {cards.length === 0 && (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                  No employees assigned to this cycle yet. Click "Assign
                  employee" to begin.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent
          value="reviews"
          className="grid grid-cols-1 lg:grid-cols-2 gap-3"
        >
          {cards.map((sc) => (
            <ScorecardCard
              key={sc.id}
              sc={sc}
              onOpen={() => setSelected(sc)}
              mode="review"
            />
          ))}
        </TabsContent>

        <TabsContent value="calibration" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Calibration table — KPI scores out of 100
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="text-left py-2">Employee</th>
                      <th className="text-left">Status</th>
                      <th className="text-right">Self /100</th>
                      <th className="text-right">Manager /100</th>
                      <th className="text-right">Final /100</th>
                      <th className="text-right">Rating</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cards.map((sc) => {
                      const final =
                        sc.finalRating ?? computeKpiTotal(sc, "combined");
                      const band = kpiRatingBand(final);
                      return (
                        <tr key={sc.id} className="border-b last:border-0">
                          <td className="py-2 font-medium">
                            {sc.employeeName}
                          </td>
                          <td>
                            <Badge
                              variant="outline"
                              className={statusTone[sc.status]}
                            >
                              {sc.status}
                            </Badge>
                          </td>
                          <td className="text-right">
                            {sc.overallSelfRating ?? "—"}
                          </td>
                          <td className="text-right">
                            {sc.overallManagerRating ?? "—"}
                          </td>
                          <td className="text-right font-semibold">
                            {sc.finalRating ?? "—"}
                          </td>
                          <td className="text-right">
                            <Badge variant="outline" className={band.tone}>
                              {band.label}
                            </Badge>
                          </td>
                          <td className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelected(sc)}
                            >
                              Open
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-3">
          <AddFeedbackForm />
          {feedback.map((f) => {
            const emp = employees.find((e) => e.id === f.employeeId);
            return (
              <Card key={f.id}>
                <CardContent className="p-4 flex gap-3">
                  <Award className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm">
                        <span className="font-medium">{f.from}</span> →{" "}
                        <span className="font-medium">
                          {emp
                            ? `${emp.firstName} ${emp.lastName}`
                            : f.employeeId}
                        </span>
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          {f.type}
                        </Badge>
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {f.date}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {f.message}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      <ReviewSheet sc={selectedLive} onClose={() => setSelected(null)} />
    </div>
  );
}

// ──────────────────────────── card ────────────────────────────

function ScorecardCard({
  sc,
  onOpen,
  mode,
}: {
  sc: Scorecard;
  onOpen: () => void;
  mode: "setup" | "review";
}) {
  const totalWeight = sc.kpas.reduce((s, k) => s + k.weight, 0);
  const combined = computeKpiTotal(sc, "combined");
  const band = kpiRatingBand(combined);
  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onOpen}
    >
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs font-semibold">
                {sc.employeeName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold truncate">{sc.employeeName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {sc.info?.jobTitle ?? "—"} · {sc.kpas.length} KPAs · weight{" "}
                {totalWeight}%
              </p>
            </div>
          </div>
          <Badge variant="outline" className={statusTone[sc.status]}>
            {sc.status}
          </Badge>
        </div>
        {mode === "review" && (
          <div className="grid grid-cols-3 gap-3 pt-1">
            <Metric label="Self /100" value={sc.overallSelfRating} />
            <Metric label="Manager /100" value={sc.overallManagerRating} />
            <Metric label="Final /100" value={sc.finalRating} emphasis />
          </div>
        )}
        {mode === "setup" && (
          <div className="space-y-1.5">
            {sc.kpas.slice(0, 3).map((k) => (
              <div key={k.id} className="text-xs flex justify-between gap-2">
                <span className="truncate">{k.title}</span>
                <span className="text-muted-foreground shrink-0">
                  {k.weight}%
                </span>
              </div>
            ))}
            {sc.kpas.length > 3 && (
              <p className="text-[11px] text-muted-foreground">
                + {sc.kpas.length - 3} more
              </p>
            )}
          </div>
        )}
        {combined > 0 && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">
              Combined score
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{combined}/100</span>
              <Badge variant="outline" className={band.tone}>
                {band.label}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  emphasis,
}: {
  label: string;
  value?: number;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-md border p-2 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-0.5 ${emphasis ? "font-bold text-base" : "text-sm"}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}

// ──────────────────────────── dialogs ────────────────────────────

function NewCycleDialog() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Cycle>>({
    name: "",
    startDate: "",
    endDate: "",
    selfReviewDue: "",
    managerReviewDue: "",
    status: "Active",
  });
  const submit = () => {
    if (!draft.name) return;
    perfStore.upsertCycle({
      id: newId("CYC"),
      name: draft.name!,
      startDate: draft.startDate ?? "",
      endDate: draft.endDate ?? "",
      selfReviewDue: draft.selfReviewDue ?? "",
      managerReviewDue: draft.managerReviewDue ?? "",
      status: (draft.status as Cycle["status"]) ?? "Active",
    });
    setOpen(false);
    toast({
      title: "Cycle created",
      description: `${draft.name} is now ${draft.status}.`,
    });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" /> New cycle
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New review cycle</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input
              className="mt-1.5"
              placeholder="H2 2026"
              value={draft.name ?? ""}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start</Label>
              <Input
                type="date"
                className="mt-1.5"
                value={draft.startDate ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, startDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label>End</Label>
              <Input
                type="date"
                className="mt-1.5"
                value={draft.endDate ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, endDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Self-review due</Label>
              <Input
                type="date"
                className="mt-1.5"
                value={draft.selfReviewDue ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, selfReviewDue: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Manager review due</Label>
              <Input
                type="date"
                className="mt-1.5"
                value={draft.managerReviewDue ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, managerReviewDue: e.target.value })
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            className="bg-gradient-to-r from-primary to-secondary"
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignEmployeeDialog({
  cycleId,
  existing,
}: {
  cycleId: string;
  existing: string[];
}) {
  const [open, setOpen] = useState(false);
  const [empId, setEmpId] = useState<string>("");
  const available = employees.filter((e) => !existing.includes(e.id));
  const submit = () => {
    const e = employees.find((x) => x.id === empId);
    if (!e || !cycleId) return;
    perfStore.upsertScorecard({
      id: `SC-${e.id}-${cycleId}-${Date.now()}`,
      employeeId: e.id,
      employeeName: `${e.firstName} ${e.lastName}`,
      cycleId,
      status: "Not Started",
      info: {
        jobTitle: e.jobTitle,
        department: e.department,
        manager: e.manager ?? "",
        reviewType: "Annual",
        contractStartDate: e.startDate,
      },
      kpas: [],
    });
    setOpen(false);
    setEmpId("");
    toast({
      title: "Employee assigned",
      description: `${e.firstName} ${e.lastName} added to this cycle.`,
    });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-primary to-secondary">
          <Plus className="h-4 w-4 mr-2" /> Assign employee
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign employee to cycle</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Employee</Label>
          <Select value={empId} onValueChange={setEmpId}>
            <SelectTrigger>
              <SelectValue placeholder="Select an employee" />
            </SelectTrigger>
            <SelectContent>
              {available.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.firstName} {e.lastName} — {e.jobTitle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!empId}
            className="bg-gradient-to-r from-primary to-secondary"
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddFeedbackForm() {
  const [empId, setEmpId] = useState("");
  const [type, setType] = useState<"Praise" | "Constructive" | "1-on-1">(
    "Praise",
  );
  const [msg, setMsg] = useState("");
  const submit = () => {
    if (!empId || !msg.trim()) return;
    perfStore.addFeedback({
      id: newId("F"),
      employeeId: empId,
      from: "You",
      type,
      message: msg.trim(),
      date: new Date().toISOString().slice(0, 10),
    });
    setMsg("");
    toast({ title: "Feedback shared" });
  };
  return (
    <Card>
      <CardContent className="p-4 grid md:grid-cols-[200px_160px_1fr_auto] gap-2 items-end">
        <div>
          <Label className="text-xs">Employee</Label>
          <Select value={empId} onValueChange={setEmpId}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as any)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Praise">Praise</SelectItem>
              <SelectItem value="Constructive">Constructive</SelectItem>
              <SelectItem value="1-on-1">1-on-1</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Message</Label>
          <Input
            className="mt-1.5"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Share specific, actionable feedback…"
          />
        </div>
        <Button
          onClick={submit}
          className="bg-gradient-to-r from-primary to-secondary"
        >
          Share
        </Button>
      </CardContent>
    </Card>
  );
}

// ────────────────────── full review sheet ──────────────────────

function ReviewSheet({
  sc,
  onClose,
}: {
  sc: Scorecard | null;
  onClose: () => void;
}) {
  const open = !!sc;

  // ── local editable copy
  const [kpas, setKpas] = useState<KPA[]>([]);
  const [comps, setComps] = useState<CompetencyRow[]>([]);
  const [vals, setVals] = useState<ValueRow[]>([]);
  const [compliance, setCompliance] = useState<ComplianceCheck[]>([]);
  const [info, setInfo] = useState<Scorecard["info"]>({});
  const [prevGoals, setPrevGoals] = useState<PreviousGoal[]>([]);
  const [nextGoals, setNextGoals] = useState<NextGoal[]>([]);
  const [achNote, setAchNote] = useState("");
  const [chNote, setChNote] = useState("");
  const [mgrEval, setMgrEval] = useState<ManagerEvaluation>({});
  const [final, setFinal] = useState<number | undefined>();
  const [calibrationNotes, setCalibrationNotes] = useState("");

  useEffect(() => {
    if (!sc) return;
    setKpas(JSON.parse(JSON.stringify(sc.kpas)));
    setComps(JSON.parse(JSON.stringify(sc.competencies ?? [])));
    setVals(JSON.parse(JSON.stringify(sc.values ?? [])));
    setCompliance(JSON.parse(JSON.stringify(sc.compliance ?? [])));
    setInfo({ ...(sc.info ?? {}) });
    setPrevGoals(JSON.parse(JSON.stringify(sc.previousGoals ?? [])));
    setNextGoals(JSON.parse(JSON.stringify(sc.nextGoals ?? [])));
    setAchNote(sc.achievementsManagerNote ?? "");
    setChNote(sc.challengesManagerNote ?? "");
    setMgrEval({ ...(sc.managerEvaluation ?? {}) });
    setFinal(sc.finalRating);
    setCalibrationNotes(sc.calibrationNotes ?? "");
  }, [sc?.id]);

  if (!sc) return null;

  const totalWeight = kpas.reduce((s, k) => s + k.weight, 0);
  const liveSc: Scorecard = { ...sc, kpas, competencies: comps, values: vals };
  const selfTotal = computeKpiTotal(liveSc, "self");
  const mgrTotal = computeKpiTotal(liveSc, "manager");
  const combined = computeKpiTotal(liveSc, "combined");
  const compAvg = competencyAverage(liveSc);
  const valAvg = valuesAverage(liveSc);
  const band = kpiRatingBand(combined);

  // ── KPA helpers
  const addKpa = () =>
    setKpas([
      ...kpas,
      {
        id: newId("kpa"),
        title: "New KPA",
        description: "",
        weight: 0,
        kpis: [],
      },
    ]);
  const removeKpa = (id: string) => setKpas(kpas.filter((k) => k.id !== id));
  const updateKpa = (id: string, patch: Partial<KPA>) =>
    setKpas(kpas.map((k) => (k.id === id ? { ...k, ...patch } : k)));

  // ── saves
  const saveKpas = () => {
    perfStore.patchScorecard(sc.id, { kpas });
    toast({
      title: "Scorecard saved",
      description: "Employee will see updated KPAs immediately.",
    });
  };
  const sendToEmployee = () => {
    perfStore.patchScorecard(sc.id, { kpas, info, compliance });
    perfStore.setStatus(sc.id, "Self Review");
    toast({
      title: "Sent for self-review",
      description: `${sc.employeeName} can now complete their self-assessment.`,
    });
    onClose();
  };
  const saveSection = (patch: Partial<Scorecard>, msg: string) => {
    perfStore.patchScorecard(sc.id, patch);
    toast({ title: msg });
  };

  const submitManager = () => {
    perfStore.submitManagerReview(sc.id, {
      kpas: kpas.map((k) => ({ id: k.id, managerScore: k.managerScore })),
      competencies: comps.map((c) => ({
        id: c.id,
        managerScore: c.managerScore,
        managerObservation: c.managerObservation,
      })),
      values: vals.map((c) => ({
        id: c.id,
        managerScore: c.managerScore,
        managerObservation: c.managerObservation,
      })),
      nextGoals,
      achievementsManagerNote: achNote,
      challengesManagerNote: chNote,
      managerEvaluation: mgrEval,
      final,
    });
    toast({
      title: "Manager review submitted",
      description: "Moved to calibration.",
    });
    onClose();
  };

  const finalise = () => {
    if (typeof final !== "number") return;
    perfStore.finalise(sc.id, final, calibrationNotes);
    perfStore.signManager(sc.id);
    toast({
      title: "Review finalised",
      description: `${sc.employeeName} — final ${final}/100 (${kpiRatingBand(final).label}).`,
    });
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs">
                {sc.employeeName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate">{sc.employeeName}</p>
              <p className="text-xs font-normal text-muted-foreground truncate">
                {info?.jobTitle ?? sc.info?.jobTitle}
              </p>
            </div>
          </SheetTitle>
          <SheetDescription className="flex flex-wrap gap-2 items-center">
            <Badge variant="outline" className={statusTone[sc.status]}>
              {sc.status}
            </Badge>
            <span className="text-xs">Weight {totalWeight}% / 100</span>
            <span className="text-xs">
              Self {selfTotal}/100 · Manager {mgrTotal}/100 · Combined{" "}
              {combined}/100
            </span>
            {combined > 0 && (
              <Badge variant="outline" className={band.tone}>
                {band.label}
              </Badge>
            )}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="info" className="mt-5">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="info">1 · Info</TabsTrigger>
            <TabsTrigger value="kpis">2 · KPIs</TabsTrigger>
            <TabsTrigger value="skills">3 · Skills</TabsTrigger>
            <TabsTrigger value="values">4 · Values</TabsTrigger>
            <TabsTrigger value="self">5 · Self-Assessment</TabsTrigger>
            <TabsTrigger value="goals">6 · Goals</TabsTrigger>
            <TabsTrigger value="dev">7 · Development</TabsTrigger>
            <TabsTrigger value="mgr">8 · Manager Eval</TabsTrigger>
            <TabsTrigger value="signoff">Sign-off</TabsTrigger>
          </TabsList>

          {/* ── 1 INFO ── */}
          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardContent className="p-4 grid sm:grid-cols-2 gap-3">
                <Field
                  label="Job Title"
                  value={info?.jobTitle}
                  onChange={(v) => setInfo({ ...info, jobTitle: v })}
                />
                <Field
                  label="Department"
                  value={info?.department}
                  onChange={(v) => setInfo({ ...info, department: v })}
                />
                <Field
                  label="Manager / Supervisor"
                  value={info?.manager}
                  onChange={(v) => setInfo({ ...info, manager: v })}
                />
                <Field
                  label="Review Period"
                  value={info?.reviewPeriod}
                  placeholder="Jan 2026 – Jun 2026"
                  onChange={(v) => setInfo({ ...info, reviewPeriod: v })}
                />
                <Field
                  label="Date of Review"
                  type="date"
                  value={info?.reviewDate}
                  onChange={(v) => setInfo({ ...info, reviewDate: v })}
                />
                <Field
                  label="Last Review Date"
                  type="date"
                  value={info?.lastReviewDate}
                  onChange={(v) => setInfo({ ...info, lastReviewDate: v })}
                />
                <div>
                  <Label>Review Type</Label>
                  <Select
                    value={info?.reviewType ?? ""}
                    onValueChange={(v) =>
                      setInfo({ ...info, reviewType: v as any })
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Annual",
                        "Mid-Year",
                        "Probation",
                        "Quarterly",
                        "Other",
                      ].map((x) => (
                        <SelectItem key={x} value={x}>
                          {x}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Field
                  label="Contract Start Date"
                  type="date"
                  value={info?.contractStartDate}
                  onChange={(v) => setInfo({ ...info, contractStartDate: v })}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" /> Document Control &
                  Compliance Checks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {compliance.map((c, i) => (
                  <div
                    key={c.id}
                    className="grid sm:grid-cols-[1fr_140px_140px_1fr] gap-2 items-center"
                  >
                    <p className="text-sm">{c.question}</p>
                    <Select
                      value={c.answer ?? ""}
                      onValueChange={(v) => {
                        const next = [...compliance];
                        next[i] = { ...c, answer: v as any };
                        setCompliance(next);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                        <SelectItem value="N/A">N/A</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="date"
                      value={c.date ?? ""}
                      onChange={(e) => {
                        const next = [...compliance];
                        next[i] = { ...c, date: e.target.value };
                        setCompliance(next);
                      }}
                    />
                    <Input
                      placeholder="Notes"
                      value={c.notes ?? ""}
                      onChange={(e) => {
                        const next = [...compliance];
                        next[i] = { ...c, notes: e.target.value };
                        setCompliance(next);
                      }}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() =>
                  saveSection({ info, compliance }, "Section 1 saved")
                }
              >
                <Save className="h-4 w-4 mr-2" /> Save Section 1
              </Button>
            </div>
          </TabsContent>

          {/* ── 2 KPIs ── */}
          <TabsContent value="kpis" className="space-y-3">
            <Card>
              <CardContent className="p-3 text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                <span>
                  Total weight:{" "}
                  <strong
                    className={
                      totalWeight === 100 ? "text-success" : "text-warning"
                    }
                  >
                    {totalWeight}%
                  </strong>{" "}
                  (target 100%)
                </span>
                <span>
                  Each row scored 1–5. Weighted score = (combined/5) × weight.
                  Total out of 100.
                </span>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {kpas.map((kpa, idx) => {
                const combinedRow =
                  typeof kpa.selfScore === "number" &&
                  typeof kpa.managerScore === "number"
                    ? (kpa.selfScore + kpa.managerScore) / 2
                    : (kpa.selfScore ?? kpa.managerScore);
                const weighted =
                  typeof combinedRow === "number"
                    ? +((combinedRow / 5) * kpa.weight).toFixed(2)
                    : undefined;
                const divergent =
                  typeof kpa.selfScore === "number" &&
                  typeof kpa.managerScore === "number" &&
                  Math.abs(kpa.selfScore - kpa.managerScore) >= 2;
                return (
                  <Card
                    key={kpa.id}
                    className={divergent ? "border-warning/50" : undefined}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-muted-foreground pt-2">
                          #{idx + 1}
                        </span>
                        <div className="flex-1 space-y-2">
                          <Input
                            value={kpa.title}
                            onChange={(e) =>
                              updateKpa(kpa.id, { title: e.target.value })
                            }
                            placeholder="Key Performance Area"
                          />
                          <Textarea
                            rows={2}
                            value={kpa.description}
                            onChange={(e) =>
                              updateKpa(kpa.id, { description: e.target.value })
                            }
                            placeholder="Performance standard…"
                          />
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeKpa(kpa.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end text-sm">
                        <div>
                          <Label className="text-xs">Weight %</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={kpa.weight}
                            onChange={(e) =>
                              updateKpa(kpa.id, { weight: +e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Self (1–5)</Label>
                          <Input
                            type="number"
                            min={1}
                            max={5}
                            step={0.1}
                            value={kpa.selfScore ?? ""}
                            onChange={(e) =>
                              updateKpa(kpa.id, {
                                selfScore:
                                  e.target.value === ""
                                    ? undefined
                                    : +e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Manager (1–5)</Label>
                          <Input
                            type="number"
                            min={1}
                            max={5}
                            step={0.1}
                            value={kpa.managerScore ?? ""}
                            onChange={(e) =>
                              updateKpa(kpa.id, {
                                managerScore:
                                  e.target.value === ""
                                    ? undefined
                                    : +e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="rounded-md bg-success/5 border p-2 text-center">
                          <p className="text-[10px] uppercase text-muted-foreground">
                            Combined
                          </p>
                          <p className="font-semibold">
                            {typeof combinedRow === "number"
                              ? combinedRow.toFixed(2)
                              : "—"}
                          </p>
                        </div>
                        <div className="rounded-md bg-violet-500/5 border p-2 text-center">
                          <p className="text-[10px] uppercase text-muted-foreground">
                            Weighted
                          </p>
                          <p className="font-semibold">{weighted ?? "—"}</p>
                        </div>
                      </div>
                      {divergent && (
                        <p className="text-xs text-warning">
                          ⚠ Self & Manager differ by 2+ — discuss in Section 5.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              <Button variant="outline" onClick={addKpa}>
                <Plus className="h-4 w-4 mr-2" /> Add KPA
              </Button>
            </div>

            <Card>
              <CardContent className="p-3 flex flex-wrap justify-between gap-2 items-center bg-muted/30">
                <div className="text-sm">
                  Total /100 — Self <strong>{selfTotal}</strong> · Manager{" "}
                  <strong>{mgrTotal}</strong> · Combined{" "}
                  <strong>{combined}</strong>
                </div>
                {combined > 0 && (
                  <Badge variant="outline" className={band.tone}>
                    {band.label}
                  </Badge>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={saveKpas}>
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
              {sc.status === "Not Started" && (
                <Button
                  onClick={sendToEmployee}
                  className="bg-gradient-to-r from-primary to-secondary"
                >
                  <Send className="h-4 w-4 mr-2" /> Send for self-review
                </Button>
              )}
            </div>
          </TabsContent>

          {/* ── 3 SKILLS ── */}
          <TabsContent value="skills" className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Dual assessment (1 = Poor · 5 = Excellent). Combined average
              shown.
            </p>
            <DualRows
              rows={comps}
              setRows={setComps}
              labelHeader="Competency"
            />
            <Card>
              <CardContent className="p-3 flex justify-between bg-muted/30">
                <span className="text-sm">
                  Overall competency score (avg of combined)
                </span>
                <span className="font-semibold">{compAvg || "—"} / 5</span>
              </CardContent>
            </Card>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() =>
                  saveSection({ competencies: comps }, "Skills saved")
                }
              >
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
            </div>
          </TabsContent>

          {/* ── 4 VALUES ── */}
          <TabsContent value="values" className="space-y-3">
            <DualRows rows={vals} setRows={setVals} labelHeader="Value" />
            <Card>
              <CardContent className="p-3 flex justify-between bg-muted/30">
                <span className="text-sm">
                  Overall values score (avg of combined)
                </span>
                <span className="font-semibold">{valAvg || "—"} / 5</span>
              </CardContent>
            </Card>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => saveSection({ values: vals }, "Values saved")}
              >
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
            </div>
          </TabsContent>

          {/* ── 5 SELF-ASSESSMENT (read employee content + manager space) ── */}
          <TabsContent value="self" className="space-y-3">
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  5.1 Key Achievements (employee)
                </p>
                <p className="text-sm whitespace-pre-wrap min-h-[40px]">
                  {sc.achievements || (
                    <span className="text-muted-foreground italic">
                      Pending self-assessment
                    </span>
                  )}
                </p>
                <Label className="text-xs">Manager space</Label>
                <Textarea
                  rows={3}
                  value={achNote}
                  onChange={(e) => setAchNote(e.target.value)}
                  placeholder="Manager observations on achievements…"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  5.2 Challenges (employee)
                </p>
                <p className="text-sm whitespace-pre-wrap min-h-[40px]">
                  {sc.challenges || (
                    <span className="text-muted-foreground italic">
                      Pending self-assessment
                    </span>
                  )}
                </p>
                <Label className="text-xs">Manager space</Label>
                <Textarea
                  rows={3}
                  value={chNote}
                  onChange={(e) => setChNote(e.target.value)}
                  placeholder="Manager observations on challenges…"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  5.3 Goals Review — Previous Period
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {prevGoals.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No previous goals captured.
                  </p>
                )}
                {prevGoals.map((g, i) => (
                  <div
                    key={g.id}
                    className="grid sm:grid-cols-[1fr_140px_1fr_1fr_auto] gap-2 items-start"
                  >
                    <Textarea
                      rows={2}
                      value={g.goal}
                      onChange={(e) => {
                        const n = [...prevGoals];
                        n[i] = { ...g, goal: e.target.value };
                        setPrevGoals(n);
                      }}
                      placeholder="Goal"
                    />
                    <Select
                      value={g.status ?? ""}
                      onValueChange={(v) => {
                        const n = [...prevGoals];
                        n[i] = { ...g, status: v as any };
                        setPrevGoals(n);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "Achieved",
                          "Partially Achieved",
                          "Not Achieved",
                          "Carried Over",
                        ].map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      rows={2}
                      value={g.employeeComments ?? ""}
                      onChange={(e) => {
                        const n = [...prevGoals];
                        n[i] = { ...g, employeeComments: e.target.value };
                        setPrevGoals(n);
                      }}
                      placeholder="Employee comments"
                    />
                    <Textarea
                      rows={2}
                      value={g.managerComments ?? ""}
                      onChange={(e) => {
                        const n = [...prevGoals];
                        n[i] = { ...g, managerComments: e.target.value };
                        setPrevGoals(n);
                      }}
                      placeholder="Manager comments"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setPrevGoals(prevGoals.filter((x) => x.id !== g.id))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setPrevGoals([...prevGoals, { id: newId("pg"), goal: "" }])
                  }
                >
                  <Plus className="h-3 w-3 mr-1" /> Add row
                </Button>
              </CardContent>
            </Card>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() =>
                  saveSection(
                    {
                      achievementsManagerNote: achNote,
                      challengesManagerNote: chNote,
                      previousGoals: prevGoals,
                    },
                    "Self-assessment notes saved",
                  )
                }
              >
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
            </div>
          </TabsContent>

          {/* ── 6 NEXT GOALS ── */}
          <TabsContent value="goals" className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Specific, measurable goals agreed for the next period.
            </p>
            {nextGoals.map((g, i) => (
              <Card key={g.id}>
                <CardContent className="p-3 grid sm:grid-cols-[1fr_120px_140px_1fr_auto] gap-2 items-start">
                  <Textarea
                    rows={2}
                    value={g.description}
                    onChange={(e) => {
                      const n = [...nextGoals];
                      n[i] = { ...g, description: e.target.value };
                      setNextGoals(n);
                    }}
                    placeholder="Goal description"
                  />
                  <Select
                    value={g.priority ?? ""}
                    onValueChange={(v) => {
                      const n = [...nextGoals];
                      n[i] = { ...g, priority: v as any };
                      setNextGoals(n);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {["High", "Medium", "Low"].map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={g.timeline ?? ""}
                    onChange={(e) => {
                      const n = [...nextGoals];
                      n[i] = { ...g, timeline: e.target.value };
                      setNextGoals(n);
                    }}
                    placeholder="Timeline"
                  />
                  <Textarea
                    rows={2}
                    value={g.managerComments ?? ""}
                    onChange={(e) => {
                      const n = [...nextGoals];
                      n[i] = { ...g, managerComments: e.target.value };
                      setNextGoals(n);
                    }}
                    placeholder="Manager comments / notes"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setNextGoals(nextGoals.filter((x) => x.id !== g.id))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setNextGoals([
                  ...nextGoals,
                  { id: newId("ng"), description: "" },
                ])
              }
            >
              <Plus className="h-3 w-3 mr-1" /> Add goal
            </Button>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => saveSection({ nextGoals }, "Next goals saved")}
              >
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
            </div>
          </TabsContent>

          {/* ── 7 DEVELOPMENT (read employee + recommend) ── */}
          <TabsContent value="dev" className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" /> 7.1 Training &
                  Development Needs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(sc.training ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No training needs proposed by employee yet.
                  </p>
                )}
                {(sc.training ?? []).map((t, i) => (
                  <div
                    key={t.id}
                    className="grid sm:grid-cols-[1fr_120px_1fr] gap-2 items-start"
                  >
                    <p className="text-sm pt-2">
                      {t.area || <em className="text-muted-foreground">—</em>}
                    </p>
                    <Badge variant="outline" className="self-start">
                      {t.priority ?? "—"}
                    </Badge>
                    <Textarea
                      rows={2}
                      value={t.managementRecommendation ?? ""}
                      onChange={(e) => {
                        const next = [...(sc.training ?? [])];
                        next[i] = {
                          ...t,
                          managementRecommendation: e.target.value,
                        };
                        perfStore.patchScorecard(sc.id, { training: next });
                      }}
                      placeholder="Management recommendation / comment"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-3 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                    7.2 Short-term career goals (employee, 6–12 mo)
                  </p>
                  <p className="whitespace-pre-wrap min-h-[40px]">
                    {sc.shortTermCareer || (
                      <span className="text-muted-foreground italic">
                        Pending
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                    7.3 Long-term career goals (employee, 3–5 yrs)
                  </p>
                  <p className="whitespace-pre-wrap min-h-[40px]">
                    {sc.longTermCareer || (
                      <span className="text-muted-foreground italic">
                        Pending
                      </span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── 8 MANAGER EVAL ── */}
          <TabsContent value="mgr" className="space-y-3">
            <Card>
              <CardContent className="p-4 space-y-3">
                <BlockLabel n="8.1" label="Performance Summary — Last Period">
                  <Textarea
                    rows={3}
                    value={mgrEval.lastPeriodSummary ?? ""}
                    onChange={(e) =>
                      setMgrEval({
                        ...mgrEval,
                        lastPeriodSummary: e.target.value,
                      })
                    }
                    placeholder="Summary of prior period performance"
                  />
                </BlockLabel>
                <BlockLabel
                  n="8.2"
                  label="Performance Assessment — This Period"
                >
                  <Textarea
                    rows={4}
                    value={mgrEval.thisPeriodAssessment ?? ""}
                    onChange={(e) =>
                      setMgrEval({
                        ...mgrEval,
                        thisPeriodAssessment: e.target.value,
                      })
                    }
                    placeholder="Strengths, results, behaviours observed"
                  />
                </BlockLabel>
                <BlockLabel
                  n="8.3"
                  label="Key Development Areas & Observations"
                >
                  <Textarea
                    rows={3}
                    value={mgrEval.developmentAreas ?? ""}
                    onChange={(e) =>
                      setMgrEval({
                        ...mgrEval,
                        developmentAreas: e.target.value,
                      })
                    }
                  />
                </BlockLabel>
                <BlockLabel
                  n="8.4"
                  label="Review Conclusions & Management Recommendations"
                >
                  <Textarea
                    rows={3}
                    value={mgrEval.conclusions ?? ""}
                    onChange={(e) =>
                      setMgrEval({ ...mgrEval, conclusions: e.target.value })
                    }
                  />
                </BlockLabel>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Label>Proposed final score (out of 100)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      className="mt-1.5 max-w-[140px]"
                      value={final ?? ""}
                      onChange={(e) =>
                        setFinal(
                          e.target.value === "" ? undefined : +e.target.value,
                        )
                      }
                      placeholder={`${combined}`}
                    />
                  </div>
                  <Badge
                    variant="outline"
                    className={kpiRatingBand(final ?? combined).tone}
                  >
                    {kpiRatingBand(final ?? combined).label}
                  </Badge>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      saveSection(
                        {
                          managerEvaluation: mgrEval,
                          achievementsManagerNote: achNote,
                          challengesManagerNote: chNote,
                        },
                        "Manager evaluation saved",
                      )
                    }
                  >
                    <Save className="h-4 w-4 mr-2" /> Save draft
                  </Button>
                  <Button
                    onClick={submitManager}
                    className="bg-gradient-to-r from-primary to-secondary"
                  >
                    <Send className="h-4 w-4 mr-2" /> Submit & calibrate
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SIGN-OFF / CALIBRATION ── */}
          <TabsContent value="signoff" className="space-y-3">
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Self overall</span>
                  <span className="font-semibold">
                    {sc.overallSelfRating ?? "—"} / 100
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Manager overall</span>
                  <span className="font-semibold">
                    {sc.overallManagerRating ?? "—"} / 100
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Combined</span>
                  <span className="font-semibold">{combined} / 100</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Proposed final</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      className="w-20 h-8"
                      value={final ?? ""}
                      onChange={(e) =>
                        setFinal(
                          e.target.value === "" ? undefined : +e.target.value,
                        )
                      }
                    />
                    <Badge
                      variant="outline"
                      className={kpiRatingBand(final ?? combined).tone}
                    >
                      {kpiRatingBand(final ?? combined).label}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div>
              <Label>Calibration notes</Label>
              <Textarea
                rows={3}
                className="mt-1.5"
                value={calibrationNotes}
                onChange={(e) => setCalibrationNotes(e.target.value)}
                placeholder="Notes from the calibration committee…"
              />
            </div>
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <p className="font-medium flex items-center gap-2">
                  <FileSignature className="h-4 w-4" /> Sign-off
                </p>
                <p className="text-xs text-muted-foreground">
                  By signing, both parties confirm this review has been
                  conducted and discussed in full.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 mt-2">
                  <SignBlock label="Employee" at={sc.employeeSignedAt} />
                  <SignBlock
                    label="Manager / HR"
                    at={sc.managerSignedAt}
                    onSign={() => perfStore.signManager(sc.id)}
                  />
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-end gap-2">
              <Button
                onClick={finalise}
                disabled={typeof final !== "number"}
                className="bg-gradient-to-r from-primary to-secondary"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" /> Finalise review
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// ──────────────────────── shared little bits ────────────────────────

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type={type}
        className="mt-1.5"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function BlockLabel({
  n,
  label,
  children,
}: {
  n: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
        {n} · {label}
      </p>
      {children}
    </div>
  );
}

function SignBlock({
  label,
  at,
  onSign,
}: {
  label: string;
  at?: string;
  onSign?: () => void;
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs uppercase text-muted-foreground tracking-wide">
        {label}
      </p>
      {at ? (
        <p className="text-sm mt-1">Signed {new Date(at).toLocaleString()}</p>
      ) : (
        <Button
          size="sm"
          className="mt-2"
          variant="outline"
          disabled={!onSign}
          onClick={onSign}
        >
          <FileSignature className="h-3.5 w-3.5 mr-2" /> Sign now
        </Button>
      )}
    </div>
  );
}

function DualRows<T extends CompetencyRow | ValueRow>({
  rows,
  setRows,
  labelHeader,
}: {
  rows: T[];
  setRows: (r: T[]) => void;
  labelHeader: string;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1.2fr_1fr_1fr_80px] gap-2 px-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        <span>{labelHeader}</span>
        <span>Employee comment</span>
        <span>Manager observation</span>
        <span className="text-right">Avg</span>
      </div>
      {rows.map((r, i) => {
        const avg =
          typeof r.selfScore === "number" && typeof r.managerScore === "number"
            ? +((r.selfScore + r.managerScore) / 2).toFixed(2)
            : (r.selfScore ?? r.managerScore);
        return (
          <Card key={r.id}>
            <CardContent className="p-3 space-y-2">
              <div className="grid grid-cols-[1.2fr_1fr_1fr_80px] gap-2 items-start">
                <div>
                  <p className="font-medium text-sm">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.description}
                  </p>
                </div>
                <Textarea
                  rows={2}
                  value={r.employeeComment ?? ""}
                  onChange={(e) => {
                    const n = [...rows];
                    n[i] = { ...r, employeeComment: e.target.value };
                    setRows(n);
                  }}
                  placeholder="Employee"
                />
                <Textarea
                  rows={2}
                  value={r.managerObservation ?? ""}
                  onChange={(e) => {
                    const n = [...rows];
                    n[i] = { ...r, managerObservation: e.target.value };
                    setRows(n);
                  }}
                  placeholder="Manager"
                />
                <div className="rounded-md bg-success/5 border p-2 text-center">
                  <p className="text-[10px] uppercase text-muted-foreground">
                    Avg
                  </p>
                  <p className="font-semibold">{avg ?? "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Self (1–5)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    step={0.1}
                    value={r.selfScore ?? ""}
                    onChange={(e) => {
                      const n = [...rows];
                      n[i] = {
                        ...r,
                        selfScore:
                          e.target.value === "" ? undefined : +e.target.value,
                      };
                      setRows(n);
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Manager (1–5)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    step={0.1}
                    value={r.managerScore ?? ""}
                    onChange={(e) => {
                      const n = [...rows];
                      n[i] = {
                        ...r,
                        managerScore:
                          e.target.value === "" ? undefined : +e.target.value,
                      };
                      setRows(n);
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
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
