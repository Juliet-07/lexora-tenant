import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Briefcase,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  TrendingUp,
  LayoutGrid,
  Plus,
  AlertTriangle,
  Eye,
  Users,
  UserPlus,
  GraduationCap,
  Target,
  CalendarClock,
  Star,
  Loader2,
  Trash2,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { fetchEmployees, type Employee } from "@/lib/hr/hr-api";
import {
  fetchAllSuccessionPlans,
  fetchSuccessionRiskAlerts,
  fetchSuccessionBenchStrength,
  fetchSuccessionNineBox,
  createSuccessionPlan,
  addSuccessor,
  removeSuccessor,
  recordSuccessorAssessment,
  createDevelopmentPlan,
  addDevelopmentMilestone,
  updateDevelopmentMilestoneStatus,
  setDevelopmentPlanNextReview,
  setSuccessionEmergencyCover,
  setSuccessionNextReview,
  type RiskAlert,
  type BenchStrengthReport,
  type Successor,
  type DevelopmentMilestoneStatus,
  type RiskOfLoss,
  type BenchReadiness,
  type SuccessorPotential,
  type SuccessionPlan,
} from "@/lib/hr/hr-recruitment-api";
import {
  RISK_TONE,
  READINESS_TONE,
  READINESS_LABEL,
  POTENTIAL_TONE,
  ALERT_SEVERITY_TONE,
  MILESTONE_STATUS_LABEL,
  fmtDateShort,
  LoadingRow,
  EmptyCard,
} from "./shared";

// ─── Succession tab content ────────────────────────────────────

export function SuccessionTab() {
  return (
    <TabsContent value="succession" className="space-y-3">
      <SuccessionPlanning />
    </TabsContent>
  );
}

function SuccessionPlanning() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [nominateTarget, setNominateTarget] = useState<SuccessionPlan | null>(
    null,
  );
  const [successorDetail, setSuccessorDetail] = useState<{
    plan: SuccessionPlan;
    successor: Successor;
  } | null>(null);
  const [riskAlertsOpen, setRiskAlertsOpen] = useState(false);
  const [benchStrengthOpen, setBenchStrengthOpen] = useState(false);
  const [nineBoxOpen, setNineBoxOpen] = useState(false);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["succession-plans"],
    queryFn: fetchAllSuccessionPlans,
  });

  const { data: riskAlerts = [] } = useQuery({
    queryKey: ["succession-risk-alerts"],
    queryFn: fetchSuccessionRiskAlerts,
  });

  const { data: benchStrength } = useQuery({
    queryKey: ["succession-bench-strength"],
    queryFn: fetchSuccessionBenchStrength,
  });

  const { data: empData } = useQuery({
    queryKey: ["hr-employees-for-succession"],
    queryFn: () => fetchEmployees({ limit: 500 }),
  });
  const employees = empData?.items ?? [];

  const selectedPlan = plans.find((p) => p._id === selectedPlanId) ?? null;

  // Keep the detail sheet's data fresh as mutations invalidate ["succession-plans"].
  useEffect(() => {
    if (successorDetail && selectedPlan) {
      const fresh = selectedPlan.successors.find(
        (s) => s.employeeId === successorDetail.successor.employeeId,
      );
      if (fresh) setSuccessorDetail({ plan: selectedPlan, successor: fresh });
    }
  }, [selectedPlan]);

  const [form, setForm] = useState({
    criticalRole: "",
    department: "",
    incumbentId: "",
    businessImpact: "",
    riskOfLoss: "medium" as RiskOfLoss,
    overallReadiness: "gap" as BenchReadiness,
  });

  const createMutation = useMutation({
    mutationFn: createSuccessionPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["succession-plans"] });
      queryClient.invalidateQueries({
        queryKey: ["succession-bench-strength"],
      });
      queryClient.invalidateQueries({ queryKey: ["succession-risk-alerts"] });
      setCreateOpen(false);
      setForm({
        criticalRole: "",
        department: "",
        incumbentId: "",
        businessImpact: "",
        riskOfLoss: "medium",
        overallReadiness: "gap",
      });
      toast.success("Critical role added.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to create plan"),
  });

  const invalidatePlan = () => {
    queryClient.invalidateQueries({ queryKey: ["succession-plans"] });
    queryClient.invalidateQueries({ queryKey: ["succession-bench-strength"] });
    queryClient.invalidateQueries({ queryKey: ["succession-risk-alerts"] });
    queryClient.invalidateQueries({ queryKey: ["succession-nine-box"] });
  };

  const removeSuccessorMutation = useMutation({
    mutationFn: ({
      planId,
      employeeId,
    }: {
      planId: string;
      employeeId: string;
    }) => removeSuccessor(planId, employeeId),
    onSuccess: () => {
      invalidatePlan();
      toast.success("Successor removed.");
    },
  });

  const emergencyCoverMutation = useMutation({
    mutationFn: ({
      planId,
      dto,
    }: {
      planId: string;
      dto: { interimCoverId?: string | null; externalBackupNotes?: string };
    }) => setSuccessionEmergencyCover(planId, dto),
    onSuccess: () => {
      invalidatePlan();
      toast.success("Emergency cover plan updated.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to update"),
  });

  const nextReviewMutation = useMutation({
    mutationFn: ({ planId, date }: { planId: string; date: string }) =>
      setSuccessionNextReview(planId, date),
    onSuccess: () => {
      invalidatePlan();
      toast.success("Next review date set.");
    },
  });

  const alertsByPlan = useMemo(() => {
    const map = new Map<string, RiskAlert[]>();
    for (const a of riskAlerts) {
      map.set(a.planId, [...(map.get(a.planId) ?? []), a]);
    }
    return map;
  }, [riskAlerts]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          Identify critical roles, name successors, and track bench readiness.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRiskAlertsOpen(true)}
          >
            <ShieldAlert className="h-4 w-4 mr-1.5" /> Risk Alerts
            {riskAlerts.length > 0 && (
              <Badge className="ml-1.5 h-5 px-1.5 bg-destructive text-destructive-foreground">
                {riskAlerts.length}
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBenchStrengthOpen(true)}
          >
            <TrendingUp className="h-4 w-4 mr-1.5" /> Bench Strength
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNineBoxOpen(true)}
          >
            <LayoutGrid className="h-4 w-4 mr-1.5" /> 9-Box Grid
          </Button>
          <Button
            className="bg-gradient-to-r from-primary to-secondary"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" /> New Critical Role
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile
          icon={<Briefcase className="h-4 w-4" />}
          label="Critical roles"
          value={plans.length}
        />
        <StatTile
          icon={<CheckCircle2 className="h-4 w-4 text-success" />}
          label="Ready now"
          value={benchStrength?.readyNowCount ?? 0}
        />
        <StatTile
          icon={<XCircle className="h-4 w-4 text-destructive" />}
          label="No successor"
          value={benchStrength?.noSuccessorCount ?? 0}
        />
        <StatTile
          icon={<ShieldAlert className="h-4 w-4 text-warning" />}
          label="Open risk alerts"
          value={riskAlerts.length}
        />
      </div>

      {isLoading ? (
        <LoadingRow label="Loading succession plans…" />
      ) : plans.length === 0 ? (
        <EmptyCard text="No critical roles identified yet." />
      ) : (
        <div className="space-y-2">
          {plans.map((p) => {
            const planAlerts = alertsByPlan.get(p._id) ?? [];
            const readyNowCount = p.successors.filter(
              (s) => s.readiness === "ready_now",
            ).length;
            return (
              <Card key={p._id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{p.criticalRole}</h3>
                        {p.department && (
                          <Badge variant="outline" className="text-[10px]">
                            {p.department}
                          </Badge>
                        )}
                        {p.holderExiting && (
                          <Badge className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
                            Holder exiting
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Incumbent · {p.incumbentName}
                      </p>
                      {planAlerts.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3 text-warning" />
                          <span className="text-[11px] text-muted-foreground">
                            {planAlerts.length} alert
                            {planAlerts.length > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={RISK_TONE[p.riskOfLoss]}
                      >
                        Risk: {p.riskOfLoss}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={READINESS_TONE[p.overallReadiness]}
                      >
                        {READINESS_LABEL[p.overallReadiness]}
                      </Badge>
                      <Badge variant="outline" className="text-[11px]">
                        <Users className="h-3 w-3 mr-1" />
                        {p.successors.length} successor
                        {p.successors.length === 1 ? "" : "s"}
                        {readyNowCount > 0 ? ` (${readyNowCount} ready)` : ""}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedPlanId(p._id)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" /> View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── New critical role ───────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Critical Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Critical role</Label>
              <Input
                placeholder="e.g. Head of Compliance"
                value={form.criticalRole}
                onChange={(e) =>
                  setForm({ ...form, criticalRole: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <Input
                placeholder="e.g. Compliance"
                value={form.department}
                onChange={(e) =>
                  setForm({ ...form, department: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Incumbent</Label>
              <Select
                value={form.incumbentId}
                onValueChange={(v) => setForm({ ...form, incumbentId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e: Employee) => (
                    <SelectItem key={e._id} value={e._id}>
                      {e.firstName} {e.lastName} — {e.jobTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Business impact if vacated</Label>
              <Textarea
                placeholder="What breaks if this role sits empty?"
                value={form.businessImpact}
                onChange={(e) =>
                  setForm({ ...form, businessImpact: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Risk of loss</Label>
                <Select
                  value={form.riskOfLoss}
                  onValueChange={(v: any) =>
                    setForm({ ...form, riskOfLoss: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Bench readiness</Label>
                <Select
                  value={form.overallReadiness}
                  onValueChange={(v: any) =>
                    setForm({ ...form, overallReadiness: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ready_now">Ready now</SelectItem>
                    <SelectItem value="ready_1_2_years">
                      Ready 1–2 yrs
                    </SelectItem>
                    <SelectItem value="ready_3_plus_years">
                      Ready 3+ yrs
                    </SelectItem>
                    <SelectItem value="gap">Gap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !form.criticalRole ||
                !form.incumbentId ||
                createMutation.isPending
              }
              onClick={() =>
                createMutation.mutate({
                  criticalRole: form.criticalRole,
                  department: form.department || undefined,
                  incumbentId: form.incumbentId,
                  businessImpact: form.businessImpact || undefined,
                  riskOfLoss: form.riskOfLoss,
                  overallReadiness: form.overallReadiness,
                })
              }
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Role detail sheet ───────────────────────────────── */}
      <Sheet
        open={!!selectedPlan}
        onOpenChange={(o) => !o && setSelectedPlanId(null)}
      >
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {selectedPlan && (
            <RoleDetailPanel
              plan={selectedPlan}
              employees={employees}
              onNominate={() => setNominateTarget(selectedPlan)}
              onOpenSuccessor={(s) =>
                setSuccessorDetail({ plan: selectedPlan, successor: s })
              }
              onRemoveSuccessor={(employeeId) =>
                removeSuccessorMutation.mutate({
                  planId: selectedPlan._id,
                  employeeId,
                })
              }
              onSaveEmergencyCover={(dto) =>
                emergencyCoverMutation.mutate({
                  planId: selectedPlan._id,
                  dto,
                })
              }
              onSaveNextReview={(date) =>
                nextReviewMutation.mutate({ planId: selectedPlan._id, date })
              }
            />
          )}
        </SheetContent>
      </Sheet>

      {nominateTarget && (
        <NominateSuccessorDialog
          plan={nominateTarget}
          employees={employees}
          onClose={() => setNominateTarget(null)}
        />
      )}

      {successorDetail && (
        <SuccessorDetailDialog
          plan={successorDetail.plan}
          successor={successorDetail.successor}
          onClose={() => setSuccessorDetail(null)}
        />
      )}

      <RiskAlertsDialog
        open={riskAlertsOpen}
        onClose={() => setRiskAlertsOpen(false)}
        alerts={riskAlerts}
        onViewPlan={(planId) => {
          setRiskAlertsOpen(false);
          setSelectedPlanId(planId);
        }}
      />

      <BenchStrengthDialog
        open={benchStrengthOpen}
        onClose={() => setBenchStrengthOpen(false)}
        report={benchStrength ?? null}
      />

      <NineBoxDialog open={nineBoxOpen} onClose={() => setNineBoxOpen(false)} />
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="p-3.5 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-lg font-semibold leading-none">{value}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Role detail panel (inside the Sheet) ──────────────────────

function RoleDetailPanel({
  plan,
  employees,
  onNominate,
  onOpenSuccessor,
  onRemoveSuccessor,
  onSaveEmergencyCover,
  onSaveNextReview,
}: {
  plan: SuccessionPlan;
  employees: Employee[];
  onNominate: () => void;
  onOpenSuccessor: (s: Successor) => void;
  onRemoveSuccessor: (employeeId: string) => void;
  onSaveEmergencyCover: (dto: {
    interimCoverId?: string | null;
    externalBackupNotes?: string;
  }) => void;
  onSaveNextReview: (date: string) => void;
}) {
  const [interimCoverId, setInterimCoverId] = useState(
    plan.interimCoverId ?? "none",
  );
  const [externalBackupNotes, setExternalBackupNotes] = useState(
    plan.externalBackupNotes ?? "",
  );
  const [nextReview, setNextReview] = useState(
    plan.nextReviewDate ? plan.nextReviewDate.slice(0, 10) : "",
  );

  useEffect(() => {
    setInterimCoverId(plan.interimCoverId ?? "none");
    setExternalBackupNotes(plan.externalBackupNotes ?? "");
    setNextReview(plan.nextReviewDate ? plan.nextReviewDate.slice(0, 10) : "");
  }, [
    plan._id,
    plan.interimCoverId,
    plan.externalBackupNotes,
    plan.nextReviewDate,
  ]);

  return (
    <div className="space-y-5 pb-8">
      <SheetHeader>
        <SheetTitle>{plan.criticalRole}</SheetTitle>
      </SheetHeader>

      <div className="flex items-center gap-2 flex-wrap">
        {plan.department && <Badge variant="outline">{plan.department}</Badge>}
        <Badge variant="outline" className={RISK_TONE[plan.riskOfLoss]}>
          Risk: {plan.riskOfLoss}
        </Badge>
        <Badge
          variant="outline"
          className={READINESS_TONE[plan.overallReadiness]}
        >
          {READINESS_LABEL[plan.overallReadiness]}
        </Badge>
        {plan.holderExiting && (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            Holder exiting
          </Badge>
        )}
      </div>

      <div className="text-sm">
        <p className="text-muted-foreground">
          Incumbent ·{" "}
          <span className="text-foreground">{plan.incumbentName}</span>
        </p>
      </div>

      {plan.businessImpact && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
            Business impact if vacated
          </p>
          <p className="text-sm">{plan.businessImpact}</p>
        </div>
      )}

      {/* Successors */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Successors
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs"
            onClick={onNominate}
          >
            <UserPlus className="h-3 w-3 mr-1" /> Nominate
          </Button>
        </div>
        {plan.successors.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No successors identified — critical gap.
          </p>
        ) : (
          <div className="space-y-2">
            {plan.successors.map((s) => (
              <Card key={s.employeeId}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {s.employeeName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="text-[10px]">
                          {READINESS_LABEL[s.readiness]}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize ${POTENTIAL_TONE[s.potential]}`}
                        >
                          {s.potential} potential
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => onOpenSuccessor(s)}
                      >
                        <GraduationCap className="h-3.5 w-3.5 mr-1" /> Assess /
                        Develop
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => onRemoveSuccessor(s.employeeId)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                      <span>Readiness</span>
                      <span>{s.readinessPct}%</span>
                    </div>
                    <Progress value={s.readinessPct} className="h-1.5" />
                  </div>
                  {(s.strengths || s.gaps) && (
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {s.strengths && (
                        <div>
                          <p className="text-muted-foreground">Strengths</p>
                          <p>{s.strengths}</p>
                        </div>
                      )}
                      {s.gaps && (
                        <div>
                          <p className="text-muted-foreground">Gaps</p>
                          <p>{s.gaps}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {s.devPlan && (
                    <p className="text-[11px] text-muted-foreground">
                      <Target className="h-3 w-3 inline mr-1" />
                      Developing toward {s.devPlan.targetRole} ·{" "}
                      {
                        s.devPlan.milestones.filter((m) => m.status === "done")
                          .length
                      }
                      /{s.devPlan.milestones.length} milestones done
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Emergency cover */}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
          Emergency cover plan (0–30 days)
        </p>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Interim cover</Label>
            <Select value={interimCoverId} onValueChange={setInterimCoverId}>
              <SelectTrigger>
                <SelectValue placeholder="None selected" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {employees
                  .filter((e) => e._id !== plan.incumbentId)
                  .map((e) => (
                    <SelectItem key={e._id} value={e._id}>
                      {e.firstName} {e.lastName} — {e.jobTitle}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">External backup notes</Label>
            <Textarea
              placeholder="e.g. Retained consultant on standby"
              value={externalBackupNotes}
              onChange={(e) => setExternalBackupNotes(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onSaveEmergencyCover({
                interimCoverId:
                  interimCoverId === "none" ? null : interimCoverId,
                externalBackupNotes,
              })
            }
          >
            <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Save Cover Plan
          </Button>
        </div>
      </div>

      {/* Next review */}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
          Next succession review
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={nextReview}
            onChange={(e) => setNextReview(e.target.value)}
            className="w-auto"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!nextReview}
            onClick={() => onSaveNextReview(nextReview)}
          >
            <CalendarClock className="h-3.5 w-3.5 mr-1.5" /> Set
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Nominate successor ─────────────────────────────────────────

function NominateSuccessorDialog({
  plan,
  employees,
  onClose,
}: {
  plan: SuccessionPlan;
  employees: Employee[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [employeeId, setEmployeeId] = useState("");
  const [readiness, setReadiness] = useState<BenchReadiness>("gap");
  const [potential, setPotential] = useState<SuccessorPotential>("medium");
  const [strengths, setStrengths] = useState("");
  const [gaps, setGaps] = useState("");

  const existingIds = new Set(plan.successors.map((s) => s.employeeId));
  const available = employees.filter(
    (e) => !existingIds.has(e._id) && e._id !== plan.incumbentId,
  );

  const mutation = useMutation({
    mutationFn: () =>
      addSuccessor(plan._id, {
        employeeId,
        readiness,
        potential,
        strengths: strengths || undefined,
        gaps: gaps || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["succession-plans"] });
      queryClient.invalidateQueries({
        queryKey: ["succession-bench-strength"],
      });
      queryClient.invalidateQueries({ queryKey: ["succession-risk-alerts"] });
      onClose();
      toast.success("Successor nominated.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to add successor"),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nominate Successor — {plan.criticalRole}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {available.map((e) => (
                  <SelectItem key={e._id} value={e._id}>
                    {e.firstName} {e.lastName} — {e.jobTitle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Readiness</Label>
              <Select
                value={readiness}
                onValueChange={(v: any) => setReadiness(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ready_now">Ready now</SelectItem>
                  <SelectItem value="ready_1_2_years">Ready 1–2 yrs</SelectItem>
                  <SelectItem value="ready_3_plus_years">
                    Ready 3+ yrs
                  </SelectItem>
                  <SelectItem value="gap">Gap</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Potential</Label>
              <Select
                value={potential}
                onValueChange={(v: any) => setPotential(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Strengths</Label>
            <Textarea
              placeholder="What makes them a strong candidate?"
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Development gaps</Label>
            <Textarea
              placeholder="What do they still need to grow into the role?"
              value={gaps}
              onChange={(e) => setGaps(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!employeeId || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Nominate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Star rating input ──────────────────────────────────────────

function StarRating({
  value,
  onChange,
  label,
}: {
  value: number | null;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground flex-1">{label}</span>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="p-0.5"
          >
            <Star
              className={`h-4 w-4 ${
                value !== null && n <= value
                  ? "fill-warning text-warning"
                  : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Successor detail — assessment + development plan ──────────

function SuccessorDetailDialog({
  plan,
  successor,
  onClose,
}: {
  plan: SuccessionPlan;
  successor: Successor;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const a = successor.assessment;
  const [scores, setScores] = useState({
    technicalKnowledge: a?.technicalKnowledge ?? null,
    leadershipAbility: a?.leadershipAbility ?? null,
    strategicThinking: a?.strategicThinking ?? null,
    stakeholderManagement: a?.stakeholderManagement ?? null,
    industryKnowledge: a?.industryKnowledge ?? null,
    culturalFit: a?.culturalFit ?? null,
  });
  const [comments, setComments] = useState(a?.comments ?? "");

  const [devForm, setDevForm] = useState({
    targetRole: "",
    timelineMonths: "12",
    startDate: new Date().toISOString().slice(0, 10),
    objectives: "",
  });
  const [milestoneForm, setMilestoneForm] = useState({
    item: "",
    dueDate: "",
  });
  const [devReviewDate, setDevReviewDate] = useState(
    successor.devPlan?.nextReviewDate
      ? successor.devPlan.nextReviewDate.slice(0, 10)
      : "",
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["succession-plans"] });
    queryClient.invalidateQueries({ queryKey: ["succession-risk-alerts"] });
    queryClient.invalidateQueries({ queryKey: ["succession-nine-box"] });
  };

  const assessMutation = useMutation({
    mutationFn: () =>
      recordSuccessorAssessment(plan._id, successor.employeeId, {
        ...(scores as any),
        comments: comments || undefined,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Assessment saved.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to save assessment"),
  });

  const createDevPlanMutation = useMutation({
    mutationFn: () =>
      createDevelopmentPlan(plan._id, successor.employeeId, {
        targetRole: devForm.targetRole,
        timelineMonths: Number(devForm.timelineMonths) || 12,
        startDate: devForm.startDate,
        objectives: devForm.objectives || undefined,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Development plan created.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to create plan"),
  });

  const addMilestoneMutation = useMutation({
    mutationFn: () =>
      addDevelopmentMilestone(plan._id, successor.employeeId, milestoneForm),
    onSuccess: () => {
      invalidate();
      setMilestoneForm({ item: "", dueDate: "" });
      toast.success("Milestone added.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to add milestone"),
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: ({
      milestoneId,
      status,
    }: {
      milestoneId: string;
      status: DevelopmentMilestoneStatus;
    }) =>
      updateDevelopmentMilestoneStatus(
        plan._id,
        successor.employeeId,
        milestoneId,
        status,
      ),
    onSuccess: () => invalidate(),
  });

  const devReviewMutation = useMutation({
    mutationFn: () =>
      setDevelopmentPlanNextReview(
        plan._id,
        successor.employeeId,
        devReviewDate,
      ),
    onSuccess: () => {
      invalidate();
      toast.success("Next review date set.");
    },
  });

  const nextMilestoneStatus = (
    s: DevelopmentMilestoneStatus,
  ): DevelopmentMilestoneStatus =>
    s === "pending" ? "in_progress" : s === "in_progress" ? "done" : "pending";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {successor.employeeName} — {plan.criticalRole}
          </DialogTitle>
          <DialogDescription>
            Readiness assessment and development plan for this successor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Assessment */}
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
              Readiness assessment
            </p>
            <div className="space-y-2 border rounded-md p-3">
              <StarRating
                label="Technical knowledge"
                value={scores.technicalKnowledge}
                onChange={(v) =>
                  setScores({ ...scores, technicalKnowledge: v })
                }
              />
              <StarRating
                label="Leadership ability"
                value={scores.leadershipAbility}
                onChange={(v) => setScores({ ...scores, leadershipAbility: v })}
              />
              <StarRating
                label="Strategic thinking"
                value={scores.strategicThinking}
                onChange={(v) => setScores({ ...scores, strategicThinking: v })}
              />
              <StarRating
                label="Stakeholder management"
                value={scores.stakeholderManagement}
                onChange={(v) =>
                  setScores({ ...scores, stakeholderManagement: v })
                }
              />
              <StarRating
                label="Industry knowledge"
                value={scores.industryKnowledge}
                onChange={(v) => setScores({ ...scores, industryKnowledge: v })}
              />
              <StarRating
                label="Cultural fit"
                value={scores.culturalFit}
                onChange={(v) => setScores({ ...scores, culturalFit: v })}
              />
              <Textarea
                placeholder="Assessment comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
              <Button
                size="sm"
                disabled={assessMutation.isPending}
                onClick={() => assessMutation.mutate()}
              >
                {assessMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Assessment"
                )}
              </Button>
              {a?.assessedAt && (
                <p className="text-[11px] text-muted-foreground">
                  Last assessed {fmtDateShort(a.assessedAt)}
                </p>
              )}
            </div>
          </div>

          {/* Development plan */}
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
              Development plan
            </p>
            {!successor.devPlan ? (
              <div className="space-y-2 border rounded-md p-3">
                <div className="space-y-1">
                  <Label className="text-xs">Target role</Label>
                  <Input
                    value={devForm.targetRole}
                    onChange={(e) =>
                      setDevForm({ ...devForm, targetRole: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Timeline (months)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={devForm.timelineMonths}
                      onChange={(e) =>
                        setDevForm({
                          ...devForm,
                          timelineMonths: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Start date</Label>
                    <Input
                      type="date"
                      value={devForm.startDate}
                      onChange={(e) =>
                        setDevForm({ ...devForm, startDate: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Objectives</Label>
                  <Textarea
                    value={devForm.objectives}
                    onChange={(e) =>
                      setDevForm({ ...devForm, objectives: e.target.value })
                    }
                  />
                </div>
                <Button
                  size="sm"
                  disabled={
                    !devForm.targetRole || createDevPlanMutation.isPending
                  }
                  onClick={() => createDevPlanMutation.mutate()}
                >
                  {createDevPlanMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Create Development Plan"
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3 border rounded-md p-3">
                <div className="text-sm">
                  <p className="font-medium">{successor.devPlan.targetRole}</p>
                  <p className="text-xs text-muted-foreground">
                    {successor.devPlan.timelineMonths} months ·{" "}
                    {fmtDateShort(successor.devPlan.startDate)} →{" "}
                    {fmtDateShort(successor.devPlan.targetDate)}
                  </p>
                  {successor.devPlan.objectives && (
                    <p className="text-xs mt-1">
                      {successor.devPlan.objectives}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                    Milestones
                  </p>
                  {successor.devPlan.milestones.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      No milestones yet.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {successor.devPlan.milestones.map((m) => (
                        <div
                          key={m._id}
                          className="flex items-center justify-between text-xs border rounded-md px-2 py-1.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate">{m.item}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Due {fmtDateShort(m.dueDate)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[11px] shrink-0"
                            onClick={() =>
                              updateMilestoneMutation.mutate({
                                milestoneId: m._id,
                                status: nextMilestoneStatus(m.status),
                              })
                            }
                          >
                            {m.status === "done" && (
                              <CheckCircle2 className="h-3 w-3 mr-1 text-success" />
                            )}
                            {MILESTONE_STATUS_LABEL[m.status]}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      placeholder="New milestone"
                      className="h-8 text-xs"
                      value={milestoneForm.item}
                      onChange={(e) =>
                        setMilestoneForm({
                          ...milestoneForm,
                          item: e.target.value,
                        })
                      }
                    />
                    <Input
                      type="date"
                      className="h-8 text-xs w-36"
                      value={milestoneForm.dueDate}
                      onChange={(e) =>
                        setMilestoneForm({
                          ...milestoneForm,
                          dueDate: e.target.value,
                        })
                      }
                    />
                    <Button
                      size="sm"
                      className="h-8"
                      disabled={
                        !milestoneForm.item ||
                        !milestoneForm.dueDate ||
                        addMilestoneMutation.isPending
                      }
                      onClick={() => addMilestoneMutation.mutate()}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs shrink-0">Next review</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs w-auto"
                    value={devReviewDate}
                    onChange={(e) => setDevReviewDate(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={!devReviewDate || devReviewMutation.isPending}
                    onClick={() => devReviewMutation.mutate()}
                  >
                    Set
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Risk alerts ─────────────────────────────────────────────────

function RiskAlertsDialog({
  open,
  onClose,
  alerts,
  onViewPlan,
}: {
  open: boolean;
  onClose: () => void;
  alerts: RiskAlert[];
  onViewPlan: (planId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Succession Risk Alerts</DialogTitle>
          <DialogDescription>
            Roles with no successor, successors behind schedule, or an incumbent
            currently in offboarding.
          </DialogDescription>
        </DialogHeader>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No open risk alerts.
          </p>
        ) : (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div
                key={i}
                className="border rounded-md p-3 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={ALERT_SEVERITY_TONE[a.severity]}
                    >
                      {a.severity}
                    </Badge>
                    <p className="text-sm font-medium">{a.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {a.detail}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => onViewPlan(a.planId)}
                >
                  View
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Bench strength ──────────────────────────────────────────────

function BenchStrengthDialog({
  open,
  onClose,
  report,
}: {
  open: boolean;
  onClose: () => void;
  report: BenchStrengthReport | null;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bench Strength Report</DialogTitle>
        </DialogHeader>
        {!report ? (
          <LoadingRow label="Loading…" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <StatTile
                icon={<CheckCircle2 className="h-4 w-4 text-success" />}
                label="Ready now"
                value={report.readyNowCount}
              />
              <StatTile
                icon={<Clock className="h-4 w-4 text-info" />}
                label="1–2 years out"
                value={report.oneToTwoYearsCount}
              />
              <StatTile
                icon={<XCircle className="h-4 w-4 text-destructive" />}
                label="No successor"
                value={report.noSuccessorCount}
              />
            </div>
            <div className="space-y-1.5">
              {report.rows.map((r) => (
                <div
                  key={r.planId}
                  className="flex items-center justify-between text-xs border rounded-md px-2.5 py-1.5"
                >
                  <span className="font-medium">{r.role}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      Bench depth: {r.benchDepth}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${r.nearestReady ? READINESS_TONE[r.nearestReady] : "bg-destructive/10 text-destructive border-destructive/20"}`}
                    >
                      {r.nearestReady
                        ? READINESS_LABEL[r.nearestReady]
                        : "No successor"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── 9-box grid ───────────────────────────────────────────────────

const NINE_BOX_PERFORMANCE: ("low" | "moderate" | "high")[] = [
  "high",
  "moderate",
  "low",
];
const NINE_BOX_POTENTIAL: SuccessorPotential[] = ["low", "medium", "high"];

function NineBoxDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: people = [], isLoading } = useQuery({
    queryKey: ["succession-nine-box"],
    queryFn: fetchSuccessionNineBox,
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>9-Box Talent Grid</DialogTitle>
          <DialogDescription>
            Every nominated successor plotted by performance (from their latest
            performance review) against potential.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <LoadingRow label="Loading…" />
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {NINE_BOX_PERFORMANCE.map((perf) =>
                NINE_BOX_POTENTIAL.map((pot) => {
                  const cellPeople = people.filter(
                    (p) => p.performance === perf && p.potential === pot,
                  );
                  return (
                    <div
                      key={`${perf}-${pot}`}
                      className="border rounded-md p-2 min-h-[90px]"
                    >
                      <p className="text-[9px] uppercase tracking-wide text-muted-foreground mb-1">
                        {pot} potential / {perf} performance
                      </p>
                      <div className="space-y-1">
                        {cellPeople.map((p) => (
                          <Badge
                            key={p.employeeId}
                            variant="outline"
                            className="text-[10px] block w-fit"
                          >
                            {p.employeeName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                }),
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
              <span>← Lower performance</span>
              <span>Higher performance →</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
