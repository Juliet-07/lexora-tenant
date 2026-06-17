import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  Plane,
  Loader2,
  X,
  Check,
  Plus,
  MapPin,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchLeaveStats,
  fetchTenantLeaveRequests,
  reviewLeaveRequest,
  fetchAllLeavePolicies,
  fetchUncoveredLocations,
  upsertLeavePolicy,
  fetchLocations,
  type LeaveRequest,
  type LeaveStats,
  type LeavePolicy,
  type HrLocation,
} from "@/lib/hr-api";

// ─── Constants ────────────────────────────────────────────────

const LEAVE_TYPES = [
  {
    value: "annual",
    label: "Annual",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  {
    value: "sick",
    label: "Sick",
    color: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  },
  {
    value: "maternity",
    label: "Maternity",
    color: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  },
  {
    value: "paternity",
    label: "Paternity",
    color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  },
  {
    value: "compassionate",
    label: "Compassionate",
    color: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  },
  {
    value: "study",
    label: "Study",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  { value: "unpaid", label: "Unpaid", color: "bg-muted text-muted-foreground" },
];

const DEFAULT_DAYS: Record<string, number> = {
  annual: 21,
  sick: 10,
  maternity: 90,
  paternity: 5,
  compassionate: 3,
  study: 5,
  unpaid: 0,
};

const typeColor = (t: string) =>
  LEAVE_TYPES.find((x) => x.value === t)?.color ??
  "bg-muted text-muted-foreground";
const typeLabel = (t: string) =>
  LEAVE_TYPES.find((x) => x.value === t)?.label ?? t;
const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
const getInit = (n: string) =>
  n
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const EMPTY_POLICY_ENTRIES = LEAVE_TYPES.map((t) => ({
  type: t.value,
  daysAllowed: DEFAULT_DAYS[t.value] ?? 0,
  carryOver: false,
}));

// ─── Component ────────────────────────────────────────────────

export default function HRLeave() {
  const queryClient = useQueryClient();

  // Review state
  const [reviewTarget, setReviewTarget] = useState<{
    request: LeaveRequest;
    action: "approved" | "rejected";
  } | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  // Policy dialog state
  const [policyOpen, setPolicyOpen] = useState(false);
  const [policyLocId, setPolicyLocId] = useState<string | null>(null);
  const [policyEntries, setPolicyEntries] = useState(EMPTY_POLICY_ENTRIES);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // ── Queries ───────────────────────────────────────────────

  const { data: stats } = useQuery<LeaveStats>({
    queryKey: ["hr-leave-stats"],
    queryFn: fetchLeaveStats,
    staleTime: 30_000,
  });

  const { data: requestsData, isLoading } = useQuery({
    queryKey: ["hr-leave-requests", statusFilter, typeFilter],
    queryFn: () =>
      fetchTenantLeaveRequests({
        limit: 200,
        status: statusFilter !== "all" ? statusFilter : undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
      }),
    staleTime: 30_000,
  });

  const { data: policies = [], isLoading: policiesLoading } = useQuery<
    LeavePolicy[]
  >({
    queryKey: ["hr-leave-policies"],
    queryFn: fetchAllLeavePolicies,
    staleTime: 60_000,
  });

  const { data: allLocations = [] } = useQuery<HrLocation[]>({
    queryKey: ["hr-locations"],
    queryFn: fetchLocations,
    staleTime: 60_000,
  });

  const { data: uncoveredLocations = [] } = useQuery<HrLocation[]>({
    queryKey: ["hr-uncovered-locations"],
    queryFn: fetchUncoveredLocations,
    staleTime: 60_000,
  });

  const requests: LeaveRequest[] = requestsData?.items ?? [];
  const pending = requests.filter((r) => r.status === "pending");
  const upcoming = requests.filter(
    (r) => r.status === "approved" && new Date(r.startDate) > new Date(),
  );

  // ── Open policy dialog pre-filled with existing data ─────

  const openPolicyDialog = (
    loc: HrLocation | null,
    existingPolicy?: LeavePolicy,
  ) => {
    setPolicyLocId(loc?._id ?? null);
    if (existingPolicy?.policies?.length) {
      setPolicyEntries(
        LEAVE_TYPES.map((t) => {
          const found = existingPolicy.policies.find((p) => p.type === t.value);
          return {
            type: t.value,
            daysAllowed: found?.daysAllowed ?? DEFAULT_DAYS[t.value] ?? 0,
            carryOver: found?.carryOver ?? false,
          };
        }),
      );
    } else {
      setPolicyEntries(EMPTY_POLICY_ENTRIES);
    }
    setPolicyOpen(true);
  };

  // ── Mutations ─────────────────────────────────────────────

  const reviewMutation = useMutation({
    mutationFn: () =>
      reviewLeaveRequest(reviewTarget!.request._id, {
        status: reviewTarget!.action,
        reviewNote: reviewNote || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["hr-leave-stats"] });
      const action = reviewTarget!.action;
      setReviewTarget(null);
      setReviewNote("");
      toast.success(
        action === "approved"
          ? "Leave approved. Employee notified."
          : "Leave rejected. Employee notified.",
      );
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to review request"),
  });

  const policyMutation = useMutation({
    mutationFn: () =>
      upsertLeavePolicy({
        locationId: policyLocId,
        policies: policyEntries,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-leave-policies"] });
      queryClient.invalidateQueries({ queryKey: ["hr-uncovered-locations"] });
      setPolicyOpen(false);
      const locName = policyLocId
        ? (allLocations.find((l) => l._id === policyLocId)?.name ?? "location")
        : "default";
      toast.success(`Leave policy saved for ${locName}.`);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to save policy"),
  });

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Leave Management</h1>
        <p className="text-sm text-muted-foreground">
          Review requests, set location policies and track the team calendar.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          {
            label: "Annual Leave",
            color: "from-blue-500 to-cyan-500",
            count: stats?.byType?.find((t) => t._id === "annual")?.count ?? 0,
          },
          {
            label: "Sick Leave",
            color: "from-rose-500 to-red-500",
            count: stats?.byType?.find((t) => t._id === "sick")?.count ?? 0,
          },
          {
            label: "Pending Approval",
            color: "from-amber-500 to-orange-500",
            count: stats?.pending ?? 0,
          },
        ].map((b) => (
          <Card key={b.label}>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {b.label}
                </p>
                <p className="text-2xl font-bold mt-1">{b.count}</p>
              </div>
              <div
                className={`h-10 w-10 rounded-lg bg-gradient-to-br ${b.color} flex items-center justify-center`}
              >
                <Plane className="h-5 w-5 text-white" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {LEAVE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending
            {pending.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pending.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All Requests</TabsTrigger>
          <TabsTrigger value="calendar">Team Calendar</TabsTrigger>
          <TabsTrigger value="policies">
            Policies
            {uncoveredLocations.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 bg-warning/20 text-warning"
              >
                {uncoveredLocations.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Pending ── */}
        <TabsContent value="pending" className="space-y-2">
          {isLoading ? (
            <LoadingState />
          ) : pending.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                All caught up — no pending leave requests.
              </CardContent>
            </Card>
          ) : (
            pending.map((r) => (
              <RequestRow
                key={r._id}
                r={r}
                onApprove={() => {
                  setReviewTarget({ request: r, action: "approved" });
                  setReviewNote("");
                }}
                onReject={() => {
                  setReviewTarget({ request: r, action: "rejected" });
                  setReviewNote("");
                }}
              />
            ))
          )}
        </TabsContent>

        {/* ── All Requests ── */}
        <TabsContent value="all" className="space-y-2">
          {isLoading ? (
            <LoadingState />
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                No leave requests found.
              </CardContent>
            </Card>
          ) : (
            requests.map((r) => (
              <RequestRow
                key={r._id}
                r={r}
                onApprove={() => {
                  setReviewTarget({ request: r, action: "approved" });
                  setReviewNote("");
                }}
                onReject={() => {
                  setReviewTarget({ request: r, action: "rejected" });
                  setReviewNote("");
                }}
              />
            ))
          )}
        </TabsContent>

        {/* ── Team Calendar ── */}
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle className="text-base inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Who's Out — Next 30 Days
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nobody is scheduled to be out in the next 30 days.
                </p>
              ) : (
                upcoming.map((r) => {
                  const emp = r.employeeId;
                  const name = emp ? `${emp.firstName} ${emp.lastName}` : "—";
                  return (
                    <div
                      key={r._id}
                      className="flex items-center justify-between border-b pb-2 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs">
                            {getInit(name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{name}</p>
                          <p className="text-xs text-muted-foreground">
                            {fmt(r.startDate)} → {fmt(r.endDate)} ({r.days}d)
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className={typeColor(r.type)}>
                        {typeLabel(r.type)}
                      </Badge>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Policies ── */}
        <TabsContent value="policies" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-muted-foreground">
              Leave entitlements are set per location. Employees inherit their
              location's policy.
            </p>
            {uncoveredLocations.length > 0 && (
              <Select
                value=""
                onValueChange={(locId) => {
                  const loc = uncoveredLocations.find((l) => l._id === locId);
                  if (loc) openPolicyDialog(loc);
                }}
              >
                <SelectTrigger className="w-auto gap-2 h-9 px-4 bg-gradient-to-r from-primary to-secondary text-white border-0">
                  <Plus className="h-4 w-4" />
                  <SelectValue placeholder="Set policy for…" />
                </SelectTrigger>
                <SelectContent>
                  {uncoveredLocations.map((l) => (
                    <SelectItem key={l._id} value={l._id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Default policy card */}
          {(() => {
            const defaultPolicy = policies.find((p) => !p.locationId);
            return (
              <Card className="border-dashed">
                <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-sm font-semibold">Default Policy</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Applies to employees with no location assigned.
                    </p>
                    {defaultPolicy && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {defaultPolicy.policies.slice(0, 4).map((p) => (
                          <span
                            key={p.type}
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeColor(p.type)}`}
                          >
                            {typeLabel(p.type)}: {p.daysAllowed}d
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPolicyDialog(null, defaultPolicy)}
                  >
                    <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                    {defaultPolicy ? "Edit" : "Set default"}
                  </Button>
                </CardContent>
              </Card>
            );
          })()}

          {/* Location policy cards */}
          {policiesLoading ? (
            <LoadingState />
          ) : (
            policies
              .filter((p) => !!p.locationId)
              .map((policy) => {
                const loc = policy.locationId as any;
                return (
                  <Card key={policy._id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <MapPin className="h-4 w-4 text-primary" />
                            <p className="text-sm font-semibold">
                              {loc?.name ?? "Unknown"}
                            </p>
                            <Badge variant="secondary">
                              {policy.memberCount} employee
                              {policy.memberCount !== 1 ? "s" : ""}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {[loc?.city, loc?.country]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {policy.policies.map((p) => (
                              <div
                                key={p.type}
                                className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-medium ${typeColor(p.type)}`}
                              >
                                {typeLabel(p.type)}
                                <span className="font-bold ml-1">
                                  {p.daysAllowed}d
                                </span>
                                {p.carryOver && (
                                  <span className="opacity-70">↻</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const loc =
                              allLocations.find(
                                (l) =>
                                  l._id === (policy.locationId as any)?._id,
                              ) ?? null;
                            openPolicyDialog(loc, policy);
                          }}
                        >
                          <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
          )}

          {policies.filter((p) => !!p.locationId).length === 0 &&
            !policiesLoading && (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  No location policies yet. Use "Set policy for…" to configure
                  entitlements per location.
                </CardContent>
              </Card>
            )}
        </TabsContent>
      </Tabs>

      {/* ── Review Dialog ── */}
      <Dialog
        open={!!reviewTarget}
        onOpenChange={(v) => {
          if (!v) {
            setReviewTarget(null);
            setReviewNote("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewTarget?.action === "approved"
                ? "Approve Leave"
                : "Reject Leave"}
            </DialogTitle>
            <DialogDescription>
              {reviewTarget &&
                (() => {
                  const emp = reviewTarget.request.employeeId;
                  const name = emp
                    ? `${emp.firstName} ${emp.lastName}`
                    : "Employee";
                  return `${name} — ${typeLabel(reviewTarget.request.type)} leave, ${reviewTarget.request.days} day${reviewTarget.request.days !== 1 ? "s" : ""}`;
                })()}
            </DialogDescription>
          </DialogHeader>
          {reviewTarget && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dates</span>
                  <span className="font-mono text-xs">
                    {fmt(reviewTarget.request.startDate)} →{" "}
                    {fmt(reviewTarget.request.endDate)}
                  </span>
                </div>
                {reviewTarget.request.reason && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">
                      Reason
                    </span>
                    <span className="text-right">
                      {reviewTarget.request.reason}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <Label>
                  Note{" "}
                  {reviewTarget.action === "rejected" ? (
                    <span className="text-destructive">*</span>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      (optional)
                    </span>
                  )}
                </Label>
                <Textarea
                  className="mt-1.5"
                  rows={2}
                  placeholder={
                    reviewTarget.action === "rejected"
                      ? "Reason for rejection…"
                      : "Optional message to the employee…"
                  }
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setReviewTarget(null);
                setReviewNote("");
              }}
            >
              Cancel
            </Button>
            {reviewTarget?.action === "rejected" ? (
              <Button
                variant="destructive"
                disabled={!reviewNote.trim() || reviewMutation.isPending}
                onClick={() => reviewMutation.mutate()}
              >
                {reviewMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Rejecting…
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" /> Reject
                  </>
                )}
              </Button>
            ) : (
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={reviewMutation.isPending}
                onClick={() => reviewMutation.mutate()}
              >
                {reviewMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Approving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Policy Dialog ── */}
      <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {policyLocId
                ? `Leave Policy — ${allLocations.find((l) => l._id === policyLocId)?.name ?? "Location"}`
                : "Default Leave Policy"}
            </DialogTitle>
            <DialogDescription>
              {policyLocId
                ? "Set annual leave entitlements for employees at this location."
                : "Default policy applied to employees with no location assigned."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {policyEntries.map((entry, i) => (
              <div
                key={entry.type}
                className="flex items-center gap-3 py-1.5 border-b last:border-b-0"
              >
                <span
                  className={`text-[11px] px-2.5 py-1 rounded-full font-medium w-28 text-center shrink-0 ${typeColor(entry.type)}`}
                >
                  {typeLabel(entry.type)}
                </span>
                <Input
                  type="number"
                  min={0}
                  className="h-8 w-20"
                  value={entry.daysAllowed}
                  onChange={(e) => {
                    const next = [...policyEntries];
                    next[i] = {
                      ...next[i],
                      daysAllowed: Number(e.target.value),
                    };
                    setPolicyEntries(next);
                  }}
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  days / year
                </span>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto cursor-pointer">
                  <input
                    type="checkbox"
                    checked={entry.carryOver}
                    onChange={(e) => {
                      const next = [...policyEntries];
                      next[i] = { ...next[i], carryOver: e.target.checked };
                      setPolicyEntries(next);
                    }}
                    className="rounded"
                  />
                  Carry over
                </label>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPolicyOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-primary to-secondary"
              disabled={policyMutation.isPending}
              onClick={() => policyMutation.mutate()}
            >
              {policyMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
                </>
              ) : (
                "Save Policy"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">Loading…</span>
    </div>
  );
}

function RequestRow({
  r,
  onApprove,
  onReject,
}: {
  r: LeaveRequest;
  onApprove: () => void;
  onReject: () => void;
}) {
  const emp = r.employeeId;
  const name = emp ? `${emp.firstName} ${emp.lastName}` : "—";
  return (
    <Card>
      <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs font-semibold">
              {getInit(name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium flex items-center gap-1.5 flex-wrap">
              {name}
              <Badge
                variant="outline"
                className={`text-[10px] ${typeColor(r.type)}`}
              >
                {typeLabel(r.type)}
              </Badge>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {fmt(r.startDate)} → {fmt(r.endDate)} · {r.days}d
              {r.reason ? ` · ${r.reason}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant="outline"
            className={
              r.status === "approved"
                ? "bg-success/10 text-success border-success/20"
                : r.status === "rejected"
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : r.status === "cancelled"
                    ? "bg-muted text-muted-foreground"
                    : "bg-warning/10 text-warning border-warning/20"
            }
          >
            <Clock className="h-3 w-3 mr-1 inline" />
            <span className="capitalize">{r.status}</span>
          </Badge>
          {r.status === "pending" && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-success border-success/30 hover:bg-success/10"
                onClick={onApprove}
              >
                <Check className="h-3 w-3 mr-1" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={onReject}
              >
                <X className="h-3 w-3 mr-1" /> Reject
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
