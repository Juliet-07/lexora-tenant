import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Briefcase,
  Plus,
  Users,
  Clock,
  CheckCircle2,
  Star,
  MapPin,
  ArrowRight,
  LogOut,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { jobOpenings as initialJobs, type JobOpening } from "@/data/hrMockData";
import { fetchEmployees, type Employee } from "@/lib/hr-api";
import {
  fetchAllCandidates,
  fetchCandidateStageCounts,
  createCandidate,
  moveCandidateStage,
  deleteCandidate,
  fetchAllOffboarding,
  updateOffboarding,
  fetchAllSuccessionPlans,
  createSuccessionPlan,
  addSuccessor,
  removeSuccessor,
  type Candidate,
  type CandidateStage,
  type OffboardingRecord,
  type SuccessionPlan,
} from "@/lib/hr-recruitment-api";

// ─── Helpers ──────────────────────────────────────────────────

const STAGES: { key: CandidateStage; label: string }[] = [
  { key: "sourced", label: "Sourced" },
  { key: "screening", label: "Screening" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
  { key: "hired", label: "Hired" },
  { key: "rejected", label: "Rejected" },
];

const STAGE_ORDER: CandidateStage[] = [
  "sourced",
  "screening",
  "interview",
  "offer",
  "hired",
];

const stageColor = (s: CandidateStage) =>
  s === "hired"
    ? "bg-success/10 text-success border-success/20"
    : s === "rejected"
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : s === "offer"
        ? "bg-warning/10 text-warning border-warning/20"
        : s === "interview"
          ? "bg-info/10 text-info border-info/20"
          : "bg-muted text-muted-foreground border-border";

const OFFBOARDING_STATUS_TONE: Record<string, string> = {
  not_started: "bg-muted text-muted-foreground border-border",
  in_progress: "bg-warning/10 text-warning border-warning/20",
  completed: "bg-success/10 text-success border-success/20",
};

const RISK_TONE: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-success/10 text-success border-success/20",
};

const READINESS_TONE: Record<string, string> = {
  ready_now: "bg-success/10 text-success border-success/20",
  ready_1_2_years: "bg-info/10 text-info border-info/20",
  ready_3_plus_years: "bg-info/10 text-info border-info/20",
  gap: "bg-destructive/10 text-destructive border-destructive/20",
};

const READINESS_LABEL: Record<string, string> = {
  ready_now: "Ready now",
  ready_1_2_years: "Ready 1–2 yrs",
  ready_3_plus_years: "Ready 3+ yrs",
  gap: "Gap",
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function HRRecruitment() {
  const queryClient = useQueryClient();

  // ── Job Openings stays dummy, per scope — no API calls here ──
  const [jobs] = useState<JobOpening[]>(initialJobs);

  // ── Real data ──
  const { data: candidates = [], isLoading: candidatesLoading } = useQuery({
    queryKey: ["recruitment-candidates"],
    queryFn: () => fetchAllCandidates(),
  });

  const { data: offboarding = [], isLoading: offboardingLoading } = useQuery({
    queryKey: ["recruitment-offboarding"],
    queryFn: () => fetchAllOffboarding(),
  });

  const summary = useMemo(
    () => ({
      openings: jobs.filter((j) => j.status === "Open").length,
      applicants: candidates.length,
      interviews: candidates.filter((c) => c.stage === "interview").length,
      offers: candidates.filter((c) => c.stage === "offer").length,
    }),
    [jobs, candidates],
  );

  const offboardingActive = offboarding.filter(
    (o) => o.status !== "completed",
  ).length;
  const offboardingCompleted = offboarding.filter(
    (o) => o.status === "completed",
  ).length;

  const [newCandidateOpen, setNewCandidateOpen] = useState(false);
  const [openOffboarding, setOpenOffboarding] =
    useState<OffboardingRecord | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Recruitment</h1>
          <p className="text-sm text-muted-foreground">
            Manage roles, pipelines and candidate decisions.
          </p>
        </div>
        <DummyJobDialog jobs={jobs} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Open Roles"
          value={summary.openings}
          icon={Briefcase}
          tone="from-primary to-secondary"
        />
        <Stat
          label="Candidates"
          value={summary.applicants}
          icon={Users}
          tone="from-blue-500 to-cyan-500"
        />
        <Stat
          label="Interviews"
          value={summary.interviews}
          icon={Clock}
          tone="from-amber-500 to-orange-500"
        />
        <Stat
          label="Offers Out"
          value={summary.offers}
          icon={Star}
          tone="from-violet-500 to-purple-600"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Stat
          label="Offboarding Active"
          value={offboardingActive}
          icon={LogOut}
          tone="from-rose-500 to-red-600"
        />
        <Stat
          label="Offboarding Completed"
          value={offboardingCompleted}
          icon={CheckCircle}
          tone="from-slate-500 to-zinc-600"
        />
        <Stat
          label="Total Candidates"
          value={candidates.length}
          icon={Users}
          tone="from-emerald-500 to-teal-500"
        />
      </div>

      <Tabs defaultValue="openings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="openings">Job Openings</TabsTrigger>
          <TabsTrigger value="pipeline">Candidate Pipeline</TabsTrigger>
          <TabsTrigger value="offboarding">Offboarding</TabsTrigger>
          <TabsTrigger value="succession">Succession Planning</TabsTrigger>
        </TabsList>

        {/* ── Job Openings — DUMMY, unchanged ── */}
        <TabsContent
          value="openings"
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          <div className="lg:col-span-2 text-xs text-muted-foreground bg-muted/40 border rounded-lg px-3 py-2">
            This section uses placeholder data — the underlying module isn't
            built yet.
          </div>
          {jobs.map((j) => (
            <Card key={j.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{j.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {j.location} · {j.type}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      j.status === "Open"
                        ? "bg-success/10 text-success border-success/20"
                        : j.status === "On Hold"
                          ? "bg-warning/10 text-warning border-warning/20"
                          : "bg-muted"
                    }
                  >
                    {j.status}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground line-clamp-2">
                  {j.description}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Hiring Manager · {j.hiringManager}</span>
                  <span>{j.applicants} applicants</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ── Candidate Pipeline — REAL ── */}
        <TabsContent value="pipeline" className="space-y-3">
          <div className="flex justify-end">
            <Button
              className="bg-gradient-to-r from-primary to-secondary"
              onClick={() => setNewCandidateOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Candidate
            </Button>
          </div>
          {candidatesLoading ? (
            <LoadingRow label="Loading candidates…" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {STAGES.map((stage) => (
                <PipelineColumn
                  key={stage.key}
                  stageKey={stage.key}
                  label={stage.label}
                  candidates={candidates}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Offboarding — REAL ── */}
        <TabsContent value="offboarding" className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Offboarding records are created automatically when an employee is
            terminated or resigns.
          </p>
          {offboardingLoading ? (
            <LoadingRow label="Loading offboarding records…" />
          ) : offboarding.length === 0 ? (
            <EmptyCard text="No offboarding records yet." />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {offboarding.map((o) => {
                const clearedCount = o.clearanceChecklist.filter(
                  (c) => c.cleared,
                ).length;
                return (
                  <Card
                    key={o._id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setOpenOffboarding(o)}
                  >
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-gradient-to-br from-rose-500 to-red-600 text-white text-xs">
                              {o.employeeName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold">{o.employeeName}</h3>
                            <p className="text-xs text-muted-foreground">
                              {o.jobTitle}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={OFFBOARDING_STATUS_TONE[o.status]}
                        >
                          {o.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-md bg-muted/50 p-2 space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase">
                            Type
                          </p>
                          <p className="font-medium capitalize">{o.type}</p>
                        </div>
                        <div className="rounded-md bg-muted/50 p-2 space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase">
                            End Date
                          </p>
                          <p className="font-medium">{fmtDate(o.endDate)}</p>
                        </div>
                        <div className="rounded-md bg-muted/50 p-2 space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase">
                            Exit Interview
                          </p>
                          <p className="font-medium flex items-center gap-1">
                            {o.exitInterviewDone ? (
                              <CheckCircle className="h-3.5 w-3.5 text-success" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            {o.exitInterviewDone ? "Done" : "Pending"}
                          </p>
                        </div>
                        <div className="rounded-md bg-muted/50 p-2 space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase">
                            Clearance
                          </p>
                          <p className="font-medium">
                            {clearedCount} / {o.clearanceChecklist.length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Succession Planning — REAL ── */}
        <TabsContent value="succession" className="space-y-3">
          <SuccessionPlanning />
        </TabsContent>
      </Tabs>

      <AddCandidateDialog
        open={newCandidateOpen}
        onClose={() => setNewCandidateOpen(false)}
      />
      <OffboardingDetailSheet
        record={openOffboarding}
        onClose={() => setOpenOffboarding(null)}
      />
    </div>
  );
}

// ─── Pipeline column ──────────────────────────────────────────

function PipelineColumn({
  stageKey,
  label,
  candidates,
}: {
  stageKey: CandidateStage;
  label: string;
  candidates: Candidate[];
}) {
  const queryClient = useQueryClient();
  const inStage = candidates.filter((c) => c.stage === stageKey);

  const moveMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: CandidateStage }) =>
      moveCandidateStage(id, { stage }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-candidates"] });
      toast.success(
        `Moved to ${STAGES.find((s) => s.key === vars.stage)?.label}.`,
      );
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to move candidate"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCandidate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-candidates"] });
      toast.success("Candidate removed.");
    },
  });

  const nextStage = (current: CandidateStage): CandidateStage | null => {
    const idx = STAGE_ORDER.indexOf(current);
    if (idx === -1 || idx === STAGE_ORDER.length - 1) return null;
    return STAGE_ORDER[idx + 1];
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          {label} <Badge variant="outline">{inStage.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {inStage.map((c) => {
          const next = nextStage(c.stage);
          return (
            <div
              key={c._id}
              className="border rounded-lg p-3 space-y-2 bg-card"
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs">
                    {c.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {c.roleAppliedFor}
                  </p>
                </div>
              </div>
              {c.rating > 0 && (
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${i < Math.round(c.rating) ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                    />
                  ))}
                </div>
              )}
              <Badge
                variant="outline"
                className={`${stageColor(c.stage)} text-[10px] capitalize`}
              >
                {c.source.replace("_", " ")}
              </Badge>
              {c.stage === "rejected" && c.rejectionReason && (
                <p className="text-[11px] text-muted-foreground italic">
                  {c.rejectionReason}
                </p>
              )}
              <div className="flex gap-1">
                {next && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs flex-1"
                    disabled={moveMutation.isPending}
                    onClick={() =>
                      moveMutation.mutate({ id: c._id, stage: next })
                    }
                  >
                    Advance <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
                {c.stage !== "rejected" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-destructive"
                    disabled={moveMutation.isPending}
                    onClick={() =>
                      moveMutation.mutate({ id: c._id, stage: "rejected" })
                    }
                  >
                    Reject
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(c._id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>
          );
        })}
        {inStage.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No candidates
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Add Candidate dialog ─────────────────────────────────────

function AddCandidateDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    roleAppliedFor: "",
    source: "other" as const,
    notes: "",
  });

  const createMutation = useMutation({
    mutationFn: createCandidate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-candidates"] });
      onClose();
      setForm({
        name: "",
        email: "",
        phone: "",
        roleAppliedFor: "",
        source: "other",
        notes: "",
      });
      toast.success("Candidate added to pipeline.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to add candidate"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Candidate</DialogTitle>
          <DialogDescription>Starts in the "Sourced" stage.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Role applied for</Label>
            <Input
              placeholder="e.g. Senior Backend Engineer"
              value={form.roleAppliedFor}
              onChange={(e) =>
                setForm({ ...form, roleAppliedFor: e.target.value })
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Source</Label>
            <Select
              value={form.source}
              onValueChange={(v: any) => setForm({ ...form, source: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="job_board">Job Board</SelectItem>
                <SelectItem value="agency">Agency</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={
              !form.name ||
              !form.email ||
              !form.roleAppliedFor ||
              createMutation.isPending
            }
            onClick={() => createMutation.mutate(form)}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Add Candidate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Offboarding detail sheet ─────────────────────────────────

function OffboardingDetailSheet({
  record,
  onClose,
}: {
  record: OffboardingRecord | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [exitDone, setExitDone] = useState(false);
  const [exitNotes, setExitNotes] = useState("");
  const [handoverNotes, setHandoverNotes] = useState("");
  const [checklist, setChecklist] = useState<
    { key: string; cleared: boolean }[]
  >([]);

  useEffect(() => {
    if (record) {
      setExitDone(record.exitInterviewDone);
      setExitNotes(record.exitInterviewNotes ?? "");
      setHandoverNotes(record.handoverNotes ?? "");
      setChecklist(
        record.clearanceChecklist.map((c) => ({
          key: c.key,
          cleared: c.cleared,
        })),
      );
    }
  }, [record?._id]);

  const updateMutation = useMutation({
    mutationFn: (dto: Parameters<typeof updateOffboarding>[1]) =>
      updateOffboarding(record!._id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-offboarding"] });
      toast.success("Saved.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to save"),
  });

  if (!record) return null;

  return (
    <Sheet open={!!record} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{record.employeeName}</SheetTitle>
          <p className="text-xs text-muted-foreground">{record.jobTitle}</p>
        </SheetHeader>
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="border rounded-md p-3">
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="font-medium capitalize">{record.type}</p>
            </div>
            <div className="border rounded-md p-3">
              <p className="text-xs text-muted-foreground">End Date</p>
              <p className="font-medium">{fmtDate(record.endDate)}</p>
            </div>
          </div>
          {record.reason && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Reason
              </p>
              <p className="text-sm mt-1">{record.reason}</p>
            </div>
          )}

          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Clearance checklist
              </p>
              {record.clearanceChecklist.map((item, i) => (
                <label
                  key={item.key}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={
                      checklist.find((c) => c.key === item.key)?.cleared ??
                      item.cleared
                    }
                    onChange={(e) => {
                      const next = checklist.map((c) =>
                        c.key === item.key
                          ? { ...c, cleared: e.target.checked }
                          : c,
                      );
                      setChecklist(next);
                    }}
                  />
                  {item.label}
                </label>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={exitDone}
                  onChange={(e) => setExitDone(e.target.checked)}
                />
                Exit interview completed
              </label>
              <Textarea
                rows={3}
                placeholder="Exit interview notes"
                value={exitNotes}
                onChange={(e) => setExitNotes(e.target.value)}
              />
            </CardContent>
          </Card>

          <div className="space-y-1">
            <Label>Handover notes</Label>
            <Textarea
              rows={3}
              value={handoverNotes}
              onChange={(e) => setHandoverNotes(e.target.value)}
            />
          </div>

          <Button
            className="w-full bg-gradient-to-r from-primary to-secondary"
            disabled={updateMutation.isPending}
            onClick={() =>
              updateMutation.mutate({
                exitInterviewDone: exitDone,
                exitInterviewNotes: exitNotes,
                handoverNotes,
                clearanceChecklist: checklist,
              })
            }
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Succession Planning ──────────────────────────────────────

function SuccessionPlanning() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [addSuccessorTarget, setAddSuccessorTarget] =
    useState<SuccessionPlan | null>(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["succession-plans"],
    queryFn: fetchAllSuccessionPlans,
  });

  const { data: empData } = useQuery({
    queryKey: ["hr-employees-for-succession"],
    queryFn: () => fetchEmployees({ limit: 500 }),
  });
  const employees = empData?.items ?? [];

  const [form, setForm] = useState({
    criticalRole: "",
    incumbentId: "",
    riskOfLoss: "medium" as const,
    overallReadiness: "gap" as const,
  });

  const createMutation = useMutation({
    mutationFn: createSuccessionPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["succession-plans"] });
      setCreateOpen(false);
      setForm({
        criticalRole: "",
        incumbentId: "",
        riskOfLoss: "medium",
        overallReadiness: "gap",
      });
      toast.success("Succession plan created.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to create plan"),
  });

  const removeSuccessorMutation = useMutation({
    mutationFn: ({
      planId,
      employeeId,
    }: {
      planId: string;
      employeeId: string;
    }) => removeSuccessor(planId, employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["succession-plans"] });
      toast.success("Successor removed.");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Identify critical roles, name successors, and track bench readiness.
        </p>
        <Button
          className="bg-gradient-to-r from-primary to-secondary"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" /> New Plan
        </Button>
      </div>

      {isLoading ? (
        <LoadingRow label="Loading succession plans…" />
      ) : plans.length === 0 ? (
        <EmptyCard text="No succession plans yet." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {plans.map((p) => (
            <Card key={p._id}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{p.criticalRole}</h3>
                    <p className="text-xs text-muted-foreground">
                      Incumbent · {p.incumbentName}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
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
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Successors
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs"
                      onClick={() => setAddSuccessorTarget(p)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </div>
                  {p.successors.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      No successors identified — critical gap.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {p.successors.map((s) => (
                        <div
                          key={s.employeeId}
                          className="flex items-center justify-between text-xs border rounded-md px-2 py-1.5"
                        >
                          <span className="font-medium">{s.employeeName}</span>
                          <div className="flex gap-1 items-center">
                            <Badge variant="outline" className="text-[10px]">
                              {READINESS_LABEL[s.readiness]}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[10px] capitalize"
                            >
                              {s.potential} potential
                            </Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-5 w-5"
                              onClick={() =>
                                removeSuccessorMutation.mutate({
                                  planId: p._id,
                                  employeeId: s.employeeId,
                                })
                              }
                            >
                              <Trash2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Succession Plan</DialogTitle>
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
              onClick={() => createMutation.mutate(form)}
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

      {addSuccessorTarget && (
        <AddSuccessorDialog
          plan={addSuccessorTarget}
          employees={employees}
          onClose={() => setAddSuccessorTarget(null)}
        />
      )}
    </div>
  );
}

function AddSuccessorDialog({
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
  const [readiness, setReadiness] = useState<
    "ready_now" | "ready_1_2_years" | "ready_3_plus_years" | "gap"
  >("gap");
  const [potential, setPotential] = useState<"high" | "medium" | "low">(
    "medium",
  );

  const existingIds = new Set(plan.successors.map((s) => s.employeeId));
  const available = employees.filter(
    (e) => !existingIds.has(e._id) && e._id !== plan.incumbentId,
  );

  const mutation = useMutation({
    mutationFn: () =>
      addSuccessor(plan._id, { employeeId, readiness, potential }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["succession-plans"] });
      onClose();
      toast.success("Successor added.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to add successor"),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Successor — {plan.criticalRole}</DialogTitle>
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
              "Add Successor"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dummy Job Openings dialog — unchanged from mock, kept as-is ──

function DummyJobDialog({ jobs }: { jobs: JobOpening[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-primary to-secondary">
          <Plus className="h-4 w-4 mr-2" /> Post a Role
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open a New Role</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Job Openings isn't wired to a backend yet — this is a placeholder
          dialog.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
