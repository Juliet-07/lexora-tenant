import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users,
  Plus,
  Trash2,
  MapPin,
  Calendar,
  Eye,
  Loader2,
  Settings2,
  Target,
  Award,
  CheckCircle2,
  Star,
  Gauge,
} from "lucide-react";
import { toast } from "sonner";
import { fetchLocations, fetchEmployees, fetchTeams } from "@/lib/hr-api";
import {
  fetchAllReviewCycles,
  fetchReviewCycleDetail,
  createReviewCycle,
  openReviewCycle,
  closeReviewCycle,
  discardReviewCycle,
  type ReviewCycle,
  type PerformanceReview,
} from "@/lib/hr-performance-api";
import { ManagerReviewSheet } from "@/components/hr/ManagerReviewSheet";
import { KpiTemplatesPanel } from "@/components/hr/KpiTemplatePanel";
import { PerformanceFrameworksPanel } from "@/components/hr/PerformanceFrameworksPanel";

const CYCLE_STATUS_TONE: Record<string, string> = {
  draft: "bg-warning/10 text-warning border-warning/20",
  open: "bg-info/10 text-info border-info/20",
  closed: "bg-muted text-muted-foreground",
};

const REVIEW_STATUS_TONE: Record<string, string> = {
  employee_in_progress: "bg-muted text-muted-foreground",
  manager_in_progress: "bg-warning/10 text-warning border-warning/20",
  completed: "bg-success/10 text-success border-success/20",
};

const REVIEW_STATUS_LABEL: Record<string, string> = {
  employee_in_progress: "Awaiting employee",
  manager_in_progress: "Awaiting manager",
  completed: "Completed",
};

const RATING_BAND_TONE: Record<string, string> = {
  Outstanding: "bg-success/10 text-success border-success/20",
  "Exceeds Expectations": "bg-success/10 text-success border-success/20",
  Good: "bg-info/10 text-info border-info/20",
  Satisfactory: "bg-warning/10 text-warning border-warning/20",
  "Needs Improvement": "bg-orange-500/10 text-orange-600 border-orange-500/20",
  Unsatisfactory: "bg-destructive/10 text-destructive border-destructive/20",
  "—": "bg-muted text-muted-foreground",
};

export default function HRPerformance() {
  const queryClient = useQueryClient();
  const [openCycle, setOpenCycle] = useState<ReviewCycle | null>(null);
  const [openReview, setOpenReview] = useState<PerformanceReview | null>(null);

  const [newCycleOpen, setNewCycleOpen] = useState(false);
  const [discardTarget, setDiscardTarget] = useState<ReviewCycle | null>(null);

  const { data: locations = [] } = useQuery({
    queryKey: ["hr-locations"],
    queryFn: fetchLocations,
  });
  const { data: teams = [] } = useQuery({
    queryKey: ["hr-teams"],
    queryFn: fetchTeams,
  });

  const { data: cycles = [], isLoading: cyclesLoading } = useQuery({
    queryKey: ["performance-cycles"],
    queryFn: fetchAllReviewCycles,
  });

  const { data: cycleDetail, isLoading: cycleDetailLoading } = useQuery({
    queryKey: ["performance-cycle-detail", openCycle?._id],
    queryFn: () => fetchReviewCycleDetail(openCycle!._id),
    enabled: !!openCycle,
  });

  const createCycleMutation = useMutation({
    mutationFn: createReviewCycle,
    onSuccess: (cycle) => {
      queryClient.invalidateQueries({ queryKey: ["performance-cycles"] });
      setNewCycleOpen(false);
      toast.success(
        `Draft cycle created — ${cycle.employeeCount} review(s) generated.`,
      );
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to create cycle"),
  });

  const openCycleMutation = useMutation({
    mutationFn: openReviewCycle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-cycles"] });
      toast.success("Cycle opened — employees can now begin self-assessments.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to open cycle"),
  });

  const closeCycleMutation = useMutation({
    mutationFn: closeReviewCycle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-cycles"] });
      toast.success("Cycle closed.");
    },
  });

  const discardCycleMutation = useMutation({
    mutationFn: discardReviewCycle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-cycles"] });
      setDiscardTarget(null);
      toast.success("Draft cycle discarded.");
    },
  });

  const [cycleForm, setCycleForm] = useState({
    name: "",
    periodStart: "",
    periodEnd: "",
    reviewDate: "",
    scope: "all" as "all" | "location" | "team",
    locationId: "",
    teamId: "",
  });

  const resetCycleForm = () =>
    setCycleForm({
      name: "",
      periodStart: "",
      periodEnd: "",
      reviewDate: "",
      scope: "all",
      locationId: "",
      teamId: "",
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Performance</h1>
        <p className="text-sm text-muted-foreground">
          Role-specific KPIs, universal competencies and values, dual
          self/manager scoring.
        </p>
      </div>

      <Tabs defaultValue="cycles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cycles">
            <Calendar className="h-3.5 w-3.5 mr-1.5" /> Review Cycles
          </TabsTrigger>
          <TabsTrigger value="kpi-templates">
            <Target className="h-3.5 w-3.5 mr-1.5" /> KPI Templates
          </TabsTrigger>
          <TabsTrigger value="frameworks">
            <Award className="h-3.5 w-3.5 mr-1.5" /> Competencies & Values
          </TabsTrigger>
        </TabsList>

        {/* ════════════════ REVIEW CYCLES ════════════════ */}
        <TabsContent value="cycles" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Launch a cycle to generate a review for every employee in scope,
              using their role's KPI template.
            </p>
            <Button
              className="bg-gradient-to-r from-primary to-secondary"
              onClick={() => setNewCycleOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" /> New Review Cycle
            </Button>
          </div>

          {cyclesLoading ? (
            <LoadingRow label="Loading cycles…" />
          ) : cycles.length === 0 ? (
            <EmptyCard text="No review cycles yet. Create your first one." />
          ) : (
            cycles.map((c) => (
              <Card key={c._id}>
                <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Gauge className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.employeeCount} employee
                        {c.employeeCount !== 1 ? "s" : ""} ·{" "}
                        {c.locationId?.name ??
                          c.teamId?.name ??
                          "All employees"}
                        {c.skippedEmployees.length > 0 && (
                          <span className="text-warning">
                            {" "}
                            · {c.skippedEmployees.length} skipped
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span>
                      Completed <strong>{c.completedCount}</strong> /{" "}
                      {c.employeeCount}
                    </span>
                    <Badge
                      variant="outline"
                      className={CYCLE_STATUS_TONE[c.status]}
                    >
                      {c.status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOpenCycle(c)}
                    >
                      <Eye className="h-3 w-3 mr-1" /> View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ════════════════ KPI TEMPLATES ════════════════ */}
        <TabsContent value="kpi-templates">
          <KpiTemplatesPanel />
        </TabsContent>

        {/* ════════════════ FRAMEWORKS ════════════════ */}
        <TabsContent value="frameworks">
          <PerformanceFrameworksPanel />
        </TabsContent>
      </Tabs>

      {/* ── New Cycle dialog ── */}
      <Dialog
        open={newCycleOpen}
        onOpenChange={(o) => {
          setNewCycleOpen(o);
          if (!o) resetCycleForm();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Review Cycle</DialogTitle>
            <DialogDescription>
              Generates a performance review for every employee in scope,
              pre-filled with their role's KPI template plus the tenant's
              competency/values frameworks. Employees whose job title has no KPI
              template will be skipped and listed on the cycle.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Cycle name</Label>
              <Input
                placeholder="e.g. H1 2026 Review"
                value={cycleForm.name}
                onChange={(e) =>
                  setCycleForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Period start</Label>
                <Input
                  type="date"
                  value={cycleForm.periodStart}
                  onChange={(e) =>
                    setCycleForm((f) => ({ ...f, periodStart: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Period end</Label>
                <Input
                  type="date"
                  value={cycleForm.periodEnd}
                  onChange={(e) =>
                    setCycleForm((f) => ({ ...f, periodEnd: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Review date</Label>
              <Input
                type="date"
                value={cycleForm.reviewDate}
                onChange={(e) =>
                  setCycleForm((f) => ({ ...f, reviewDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Scope</Label>
              <Select
                value={cycleForm.scope}
                onValueChange={(v: any) =>
                  setCycleForm((f) => ({ ...f, scope: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  <SelectItem value="location">A specific location</SelectItem>
                  <SelectItem value="team">A specific team</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {cycleForm.scope === "location" && (
              <div className="space-y-1">
                <Label>Location</Label>
                <Select
                  value={cycleForm.locationId}
                  onValueChange={(v) =>
                    setCycleForm((f) => ({ ...f, locationId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => (
                      <SelectItem key={l._id} value={l._id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {cycleForm.scope === "team" && (
              <div className="space-y-1">
                <Label>Team</Label>
                <Select
                  value={cycleForm.teamId}
                  onValueChange={(v) =>
                    setCycleForm((f) => ({ ...f, teamId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t._id} value={t._id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCycleOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !cycleForm.name ||
                !cycleForm.periodStart ||
                !cycleForm.periodEnd ||
                !cycleForm.reviewDate ||
                (cycleForm.scope === "location" && !cycleForm.locationId) ||
                (cycleForm.scope === "team" && !cycleForm.teamId) ||
                createCycleMutation.isPending
              }
              onClick={() =>
                createCycleMutation.mutate({
                  name: cycleForm.name,
                  periodStart: cycleForm.periodStart,
                  periodEnd: cycleForm.periodEnd,
                  reviewDate: cycleForm.reviewDate,
                  locationId:
                    cycleForm.scope === "location"
                      ? cycleForm.locationId
                      : undefined,
                  teamId:
                    cycleForm.scope === "team" ? cycleForm.teamId : undefined,
                })
              }
            >
              {createCycleMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…
                </>
              ) : (
                "Create Cycle"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cycle detail sheet ── */}
      <Sheet open={!!openCycle} onOpenChange={(o) => !o && setOpenCycle(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {openCycle && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5" /> {openCycle.name}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={CYCLE_STATUS_TONE[openCycle.status]}
                  >
                    {openCycle.status}
                  </Badge>
                  <div className="flex gap-2">
                    {openCycle.status === "draft" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDiscardTarget(openCycle)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5 text-destructive" />{" "}
                          Discard
                        </Button>
                        <Button
                          size="sm"
                          disabled={openCycleMutation.isPending}
                          onClick={() =>
                            openCycleMutation.mutate(openCycle._id)
                          }
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Open
                          Cycle
                        </Button>
                      </>
                    )}
                    {openCycle.status === "open" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={closeCycleMutation.isPending}
                        onClick={() => closeCycleMutation.mutate(openCycle._id)}
                      >
                        Close Cycle
                      </Button>
                    )}
                  </div>
                </div>

                {openCycle.skippedEmployees.length > 0 && (
                  <div className="text-xs bg-warning/10 border border-warning/20 text-warning rounded-md p-3 space-y-1">
                    <p className="font-medium">
                      {openCycle.skippedEmployees.length} employee(s) skipped:
                    </p>
                    {openCycle.skippedEmployees.map((s, i) => (
                      <p key={i}>
                        • {s.employeeName} — {s.reason}
                      </p>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="border rounded-md p-3">
                    <p className="text-xs text-muted-foreground">Completed</p>
                    <p className="font-bold">
                      {openCycle.completedCount} / {openCycle.employeeCount}
                    </p>
                  </div>
                  <div className="border rounded-md p-3">
                    <p className="text-xs text-muted-foreground">Review date</p>
                    <p className="font-bold">
                      {new Date(openCycle.reviewDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                    Reviews ({cycleDetail?.reviews.length ?? 0})
                  </p>
                  {cycleDetailLoading ? (
                    <LoadingRow label="Loading reviews…" />
                  ) : (
                    <div className="space-y-1.5">
                      {(cycleDetail?.reviews ?? []).map((r) => (
                        <div
                          key={r._id}
                          className="flex items-center justify-between border rounded-md p-2.5 cursor-pointer hover:bg-muted/30"
                          onClick={() => setOpenReview(r)}
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {r.employeeName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {r.jobTitle}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={REVIEW_STATUS_TONE[r.status]}
                          >
                            {REVIEW_STATUS_LABEL[r.status]}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Manager review sheet (separate component — large) ── */}
      <ManagerReviewSheet
        review={openReview}
        onClose={() => setOpenReview(null)}
        onCompleted={() => {
          queryClient.invalidateQueries({
            queryKey: ["performance-cycle-detail"],
          });
          queryClient.invalidateQueries({ queryKey: ["performance-cycles"] });
          setOpenReview(null);
        }}
      />

      {/* ── Discard confirm ── */}
      <AlertDialog
        open={!!discardTarget}
        onOpenChange={(o) => !o && setDiscardTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this draft cycle?</AlertDialogTitle>
            <AlertDialogDescription>
              All generated reviews for this cycle will be deleted. This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (discardTarget) {
                  discardCycleMutation.mutate(discardTarget._id);
                  setOpenCycle(null);
                }
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LoadingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="p-10 text-center text-sm text-muted-foreground">
        {text}
      </CardContent>
    </Card>
  );
}
