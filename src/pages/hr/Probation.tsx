// =================================================================
// FULL REPLACEMENT: HRProbation.tsx
//
// REBUILT to match the REAL backend exactly, per your instruction:
// - Tenant sees the FULL 5-stage timeline for oversight (read-only
//   for Onboarding, Month 1, Month 2, Month 3 — those are MANAGER
//   actions, with no tenant route at all).
// - The ONLY action the tenant ever takes here is Final Decision —
//   and ONLY once Month 3's recommendation actually exists
//   (enforced server-side by recordFinalDecision()'s own guard;
//   mirrored here so the UI doesn't even offer a doomed action).
// - Due windows are LIVE, computed by the backend's
//   computeDueWindow() — never invented client-side.
// =================================================================

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  Loader2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchAllProbationRecords,
  fetchProbationRecordForEmployee,
  recordFinalProbationDecision,
  type ProbationListItem,
  type ProbationStage,
  type ProbationOutcome,
} from "@/lib/hr-probation-api";
import {
  fetchEmployeesByHierarchyRole,
  type Employee,
} from "@/lib/hr-api";
import {
  ManagerProbationSheet,
  ProbationRunnerPanel,
} from "@/components/hr/ManagerProbationSheet";
import { Briefcase, ClipboardCheck } from "lucide-react";

const STAGE_LABELS: Record<string, string> = {
  onboarding: "Onboarding",
  month_1: "Month 1 check-in",
  month_2: "Month 2 review",
  month_3: "Month 3 evaluation",
  final_decision: "Final decision",
};

const STAGE_WINDOWS: Record<string, string> = {
  onboarding: "Day 1",
  month_1: "Day 25–30",
  month_2: "Day 55–60",
  month_3: "Day 80–85",
  final_decision: "Day 85–90",
};

// Confirmed real ownership, per the document and everything built:
// manager acts on the first four; HR/tenant ONLY acts on the last.
const STAGE_OWNERS: Record<string, string> = {
  onboarding: "Line manager",
  month_1: "Line manager",
  month_2: "Line manager",
  month_3: "Line manager",
  final_decision: "HR (you)",
};

function stageBadge(stage: ProbationStage) {
  if (stage.status === "completed") {
    return (
      <Badge
        variant="outline"
        className="bg-success/10 text-success border-success/20"
      >
        <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
      </Badge>
    );
  }
  if (stage.isOverdue) {
    return (
      <Badge
        variant="outline"
        className="bg-destructive/10 text-destructive border-destructive/20"
      >
        <AlertTriangle className="h-3 w-3 mr-1" /> Overdue
      </Badge>
    );
  }
  if (stage.isDue) {
    return (
      <Badge
        variant="outline"
        className="bg-warning/10 text-warning border-warning/20"
      >
        <Clock className="h-3 w-3 mr-1" /> Due now
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Pending
    </Badge>
  );
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();

export default function HRProbation() {
  const [openEmployeeId, setOpenEmployeeId] = useState<string | null>(null);
  const [hodProbationFor, setHodProbationFor] = useState<{
    _id: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
  } | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["probation-all"],
    queryFn: fetchAllProbationRecords,
  });

  const { data: hods = [] } = useQuery({
    queryKey: ["employees-by-role", "head_of_department"],
    queryFn: () => fetchEmployeesByHierarchyRole("head_of_department"),
  });
  const hodIds = new Set(hods.map((e) => e._id));
  const hodProbationItems = items.filter(
    ({ employee }) =>
      employee &&
      (employee as any).hierarchyRole === "head_of_department"
        ? true
        : employee
        ? hodIds.has(employee._id)
        : false,
  );

  const totals = {
    active: items.length,
    overdue: items.reduce(
      (n, i) =>
        n +
        i.record.stages.filter((s) => s.isOverdue && s.status !== "completed")
          .length,
      0,
    ),
    dueSoon: items.reduce(
      (n, i) =>
        n +
        i.record.stages.filter((s) => s.isDue && s.status !== "completed")
          .length,
      0,
    ),
    decisionReady: items.filter((i) => {
      const month3 = i.record.stages.find((s) => s.type === "month_3");
      const finalDecision = i.record.stages.find(
        (s) => s.type === "final_decision",
      );
      return (
        month3?.status === "completed" && finalDecision?.status !== "completed"
      );
    }).length,
  };

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Probation Workflow</h1>
        <p className="text-sm text-muted-foreground">
          Read-only oversight of every employee's 90-day probation. Managers run
          the day-to-day stages — you record the final decision once a Month 3
          recommendation is ready.
        </p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>On probation</CardDescription>
            <CardTitle className="text-2xl">
              {isLoading ? "—" : totals.active}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Stages due</CardDescription>
            <CardTitle className="text-2xl text-warning">
              {isLoading ? "—" : totals.dueSoon}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overdue stages</CardDescription>
            <CardTitle className="text-2xl text-destructive">
              {isLoading ? "—" : totals.overdue}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Awaiting your decision</CardDescription>
            <CardTitle className="text-2xl">
              {isLoading ? "—" : totals.decisionReady}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {hodProbationItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Heads of Department on probation
            </CardTitle>
            <CardDescription>
              You run the 90-day plan and monthly check-ins for HODs directly —
              same stages as any other probation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hodProbationItems.map(({ record, employee }) => {
                if (!employee) return null;
                const nextStage =
                  record.stages.find((s) => s.status !== "completed") ?? null;
                return (
                  <div
                    key={record._id}
                    className="rounded-lg border p-4 flex flex-col gap-3 bg-card"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center font-semibold shrink-0">
                        {(employee.firstName?.[0] ?? "").toUpperCase()}
                        {(employee.lastName?.[0] ?? "").toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">
                          {employee.firstName} {employee.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                          <Briefcase className="h-3 w-3 shrink-0" />
                          {employee.jobTitle}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className="bg-warning/10 text-warning border-warning/20"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Head of Department
                      </Badge>
                      {nextStage && stageBadge(nextStage)}
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        setHodProbationFor({
                          _id: employee._id,
                          firstName: employee.firstName,
                          lastName: employee.lastName,
                          jobTitle: employee.jobTitle,
                        })
                      }
                    >
                      <ClipboardCheck className="h-4 w-4 mr-1.5" />
                      Manage 90-day plan
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center">
                      Ends {fmtDate(record.originalProbationEndDate)}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active probations</CardTitle>
          <CardDescription>
            Click a row to see the full timeline. You can only act once Month 3
            is complete.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No one is currently on probation.
            </p>
          ) : (
            items.map(({ record, employee }) => {
              if (!employee) return null;
              const nextStage =
                record.stages.find((s) => s.status !== "completed") ?? null;
              const completedCount = record.stages.filter(
                (s) => s.status === "completed",
              ).length;
              const pct = Math.round(
                (completedCount / record.stages.length) * 100,
              );
              const month3 = record.stages.find((s) => s.type === "month_3");
              const finalDecision = record.stages.find(
                (s) => s.type === "final_decision",
              );
              const readyForDecision =
                month3?.status === "completed" &&
                finalDecision?.status !== "completed";

              return (
                <div
                  key={record._id}
                  onClick={() => setOpenEmployeeId(employee._id)}
                  className="cursor-pointer rounded-lg border p-4 hover:bg-muted/30 transition-colors space-y-3"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">
                        {employee.firstName} {employee.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {employee.jobTitle}
                        {employee.team ? ` · ${employee.team}` : ""}
                        {employee.manager
                          ? ` · Manager: ${employee.manager}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {readyForDecision && (
                        <Badge
                          variant="outline"
                          className="bg-info/10 text-info border-info/20"
                        >
                          <FileText className="h-3 w-3 mr-1" /> Ready for your
                          decision
                        </Badge>
                      )}
                      {!readyForDecision && nextStage && stageBadge(nextStage)}
                      <Badge variant="outline">
                        <CalendarDays className="h-3 w-3 mr-1" />
                        Ends {fmtDate(record.originalProbationEndDate)}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {completedCount} of {record.stages.length} stages
                        complete
                      </span>
                      <span>
                        Next: {nextStage ? STAGE_LABELS[nextStage.type] : "—"}
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Sheet
        open={!!openEmployeeId}
        onOpenChange={(o) => !o && setOpenEmployeeId(null)}
      >
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {openEmployeeId && (
            <ProbationDetail
              employeeId={openEmployeeId}
              onClose={() => setOpenEmployeeId(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// -----------------------------------------------------------------
// Detail view — fetches the live, enriched record for ONE employee.
// -----------------------------------------------------------------

function ProbationDetail({
  employeeId,
  onClose,
}: {
  employeeId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["probation-detail", employeeId],
    queryFn: () => fetchProbationRecordForEmployee(employeeId),
  });

  const [outcome, setOutcome] = useState<ProbationOutcome | "">("");
  const [extensionReason, setExtensionReason] = useState("");
  const [revisedObjectives, setRevisedObjectives] = useState("");

  const decisionMutation = useMutation({
    mutationFn: () =>
      recordFinalProbationDecision(employeeId, {
        outcome: outcome as ProbationOutcome,
        agreedWithRecommendation: month3?.recommendation
          ? month3.recommendation.suggestedOutcome === outcome
          : false,
        extensionReason: outcome === "extend" ? extensionReason : undefined,
        revisedObjectives: outcome === "extend" ? revisedObjectives : undefined,
      }),
    onSuccess: () => {
      toast.success("Decision recorded.");
      queryClient.invalidateQueries({
        queryKey: ["probation-detail", employeeId],
      });
      queryClient.invalidateQueries({ queryKey: ["probation-all"] });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to record decision"),
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  const { record, employee, stages } = data;
  const month3 = stages.find((s) => s.type === "month_3");
  const finalDecision = stages.find((s) => s.type === "final_decision");
  const canDecide =
    month3?.status === "completed" && finalDecision?.status !== "completed";
  const isHod = employee?.hierarchyRole === "head_of_department";

  return (
    <>
      <SheetHeader>
        <SheetTitle>
          {employee.firstName} {employee.lastName}
        </SheetTitle>
        <SheetDescription>
          {employee.jobTitle} · Started {fmtDate(employee.startDate)}
          {isHod && (
            <span className="ml-2 inline-flex items-center rounded-md bg-info/10 text-info border border-info/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
              Head of Department · you run this end-to-end
            </span>
          )}
        </SheetDescription>
      </SheetHeader>

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
          {isHod ? (
            // HOD on probation → tenant runs the full manager-side flow
            // (onboarding, month 1, month 2, month 3) using the shared
            // runner panel, then records the final decision in the
            // adjacent tab. Same stage engine as everyone else.
            <ProbationRunnerPanel
              employee={{
                _id: employee._id,
                firstName: employee.firstName,
                lastName: employee.lastName,
                jobTitle: employee.jobTitle,
              }}
              mode="tenant"
            />
          ) : (
            stages
              .filter((s) => s.type !== "final_decision")
              .map((s) => (
                <Card key={s.type}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <CardTitle className="text-sm">
                          {STAGE_LABELS[s.type]}
                        </CardTitle>
                        <CardDescription className="text-xs flex items-center gap-1">
                          {STAGE_WINDOWS[s.type]} · {STAGE_OWNERS[s.type]}
                          <Lock className="h-3 w-3 ml-1" />
                        </CardDescription>
                      </div>
                      {stageBadge(s)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {s.type === "onboarding" && s.objectives && (
                      <>
                        <p>
                          <span className="font-medium">Objectives: </span>
                          {s.objectives.objectives}
                        </p>
                        {s.objectives.successMeasures && (
                          <p>
                            <span className="font-medium">
                              Success measures:{" "}
                            </span>
                            {s.objectives.successMeasures}
                          </p>
                        )}
                      </>
                    )}
                    {s.type === "month_1" && s.note && (
                      <p className="text-muted-foreground italic">{s.note}</p>
                    )}
                    {s.type === "month_2" && s.progressNote && (
                      <p>{s.progressNote}</p>
                    )}
                    {s.type === "month_3" && s.recommendation && (
                      <div className="rounded-md bg-muted/40 p-3 space-y-1">
                        <p>
                          <span className="font-medium">
                            Manager's recommendation:{" "}
                          </span>
                          <span className="capitalize">
                            {s.recommendation.suggestedOutcome}
                          </span>{" "}
                          (rated {s.recommendation.basedOnRatingBand})
                        </p>
                        <p className="text-muted-foreground">
                          {s.recommendation.managerReasoning}
                        </p>
                      </div>
                    )}
                    {s.status !== "completed" && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Lock className="h-3 w-3" /> This stage is completed by
                        the employee's manager — no action needed from you here.
                      </p>
                    )}
                    {s.completedAt && (
                      <p className="text-xs text-muted-foreground">
                        Completed {fmtDate(s.completedAt)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>

        <TabsContent value="decision" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Final decision ({STAGE_WINDOWS.final_decision})
              </CardTitle>
              <CardDescription className="text-xs">
                You record this once the Month 3 evaluation and recommendation
                are complete.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!canDecide && finalDecision?.status !== "completed" && (
                <div className="rounded-md border border-warning/30 bg-warning/10 text-warning text-xs p-3">
                  Month 3 hasn't been completed yet — the manager needs to
                  finish the evaluation and prepare a recommendation before you
                  can record a decision.
                </div>
              )}

              {finalDecision?.status === "completed" &&
              finalDecision.decision ? (
                <div className="rounded-md border border-success/30 bg-success/10 text-success text-xs p-3 space-y-1">
                  <p>
                    Decision recorded:{" "}
                    <strong className="capitalize">
                      {finalDecision.decision.outcome}
                    </strong>
                  </p>
                  {finalDecision.decision.extensionReason && (
                    <p>{finalDecision.decision.extensionReason}</p>
                  )}
                </div>
              ) : (
                canDecide && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Outcome</Label>
                      <Select
                        value={outcome}
                        onValueChange={(v) => setOutcome(v as ProbationOutcome)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select outcome…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="confirm">
                            Confirm — met all objectives
                          </SelectItem>
                          <SelectItem value="extend">
                            Extend — needs more time
                          </SelectItem>
                          <SelectItem value="terminate">
                            Terminate — did not meet standard
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {outcome === "extend" && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs">Extension reason</Label>
                          <Textarea
                            rows={3}
                            value={extensionReason}
                            onChange={(e) => setExtensionReason(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Revised objectives</Label>
                          <Textarea
                            rows={3}
                            value={revisedObjectives}
                            onChange={(e) =>
                              setRevisedObjectives(e.target.value)
                            }
                          />
                        </div>
                      </>
                    )}

                    <Button
                      size="sm"
                      disabled={
                        !outcome ||
                        (outcome === "extend" &&
                          (!extensionReason.trim() ||
                            !revisedObjectives.trim())) ||
                        decisionMutation.isPending
                      }
                      onClick={() => decisionMutation.mutate()}
                    >
                      {decisionMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Record decision"
                      )}
                    </Button>
                  </>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
