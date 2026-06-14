import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
  Settings,
  Loader2,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchLeaveStats,
  fetchTenantLeaveRequests,
  reviewLeaveRequest,
  upsertLeavePolicy,
  fetchLeavePolicy,
  fetchCorporateClients,
  fetchAllLeavePolicies,
  type LeaveRequest,
  type LeaveStats,
  type LeavePolicy,
  type CorporateClient,
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

const DEFAULT_POLICY_DAYS: Record<string, number> = {
  annual: 21,
  sick: 10,
  maternity: 90,
  paternity: 5,
  compassionate: 3,
  study: 5,
  unpaid: 0,
};

const typeColor = (type: string) =>
  LEAVE_TYPES.find((t) => t.value === type)?.color ??
  "bg-muted text-muted-foreground";

const typeLabel = (type: string) =>
  LEAVE_TYPES.find((t) => t.value === type)?.label ?? type;

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// ─── Component ────────────────────────────────────────────────

export default function HRLeave() {
  const queryClient = useQueryClient();

  // ── Review state ──────────────────────────────────────────
  const [reviewTarget, setReviewTarget] = useState<{
    request: LeaveRequest;
    action: "approved" | "rejected";
  } | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  // ── Policy state ──────────────────────────────────────────
  const [policyOpen, setPolicyOpen] = useState(false);
  const [policyClientId, setPolicyClientId] = useState("");
  const [policyEntries, setPolicyEntries] = useState(
    LEAVE_TYPES.map((t) => ({
      type: t.value,
      daysAllowed: DEFAULT_POLICY_DAYS[t.value] ?? 0,
      carryOver: false,
    })),
  );

  // ── Filters ───────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");

  // ── Queries ───────────────────────────────────────────────
  const { data: stats } = useQuery<LeaveStats>({
    queryKey: ["hr-leave-stats"],
    queryFn: () => fetchLeaveStats(),
    staleTime: 30_000,
  });

  const { data: requestsData, isLoading } = useQuery({
    queryKey: ["hr-leave-requests", statusFilter, clientFilter],
    queryFn: () =>
      fetchTenantLeaveRequests({
        limit: 100,
        status: statusFilter !== "all" ? statusFilter : undefined,
        clientId: clientFilter !== "all" ? clientFilter : undefined,
      }),
    staleTime: 30_000,
  });

  const { data: corporateClients = [] } = useQuery<CorporateClient[]>({
    queryKey: ["hr-corporate-clients"],
    queryFn: fetchCorporateClients,
    staleTime: 5 * 60_000,
  });

  const { data: allPolicies = [] } = useQuery<LeavePolicy[]>({
    queryKey: ["hr-leave-policies"],
    queryFn: fetchAllLeavePolicies,
    staleTime: 60_000,
  });

  const requests: LeaveRequest[] = requestsData?.items ?? [];
  const pending = requests.filter((r) => r.status === "pending");
  const upcoming = requests.filter(
    (r) => r.status === "approved" && new Date(r.startDate) > new Date(),
  );

  // ── Review mutation ───────────────────────────────────────
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

  // ── Policy mutation ───────────────────────────────────────
  const policyMutation = useMutation({
    mutationFn: () =>
      upsertLeavePolicy({
        clientId: policyClientId,
        policies: policyEntries.filter((p) => p.daysAllowed > 0),
      }),
    onSuccess: () => {
      setPolicyOpen(false);
      toast.success("Leave policy saved successfully.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to save policy"),
  });

  // ── Load existing policy when client selected ─────────────
  const { data: existingPolicy } = useQuery<LeavePolicy | null>({
    queryKey: ["leave-policy", policyClientId],
    queryFn: () => fetchLeavePolicy(policyClientId),
    enabled: !!policyClientId,
    staleTime: 60_000,
    onSuccess: (policy) => {
      if (policy?.policies?.length) {
        setPolicyEntries(
          LEAVE_TYPES.map((t) => {
            const existing = policy.policies.find((p) => p.type === t.value);
            return {
              type: t.value,
              daysAllowed:
                existing?.daysAllowed ?? DEFAULT_POLICY_DAYS[t.value] ?? 0,
              carryOver: existing?.carryOver ?? false,
            };
          }),
        );
      } else {
        // Reset to defaults when no policy found
        setPolicyEntries(
          LEAVE_TYPES.map((t) => ({
            type: t.value,
            daysAllowed: DEFAULT_POLICY_DAYS[t.value] ?? 0,
            carryOver: false,
          })),
        );
      }
    },
  } as any);

  const clientNameMap = corporateClients.reduce(
    (m, c) => {
      const profileId = c.profile?._id ?? c._id;
      const name = c.profile?.businessName ?? c.fullName ?? c.email;
      m[profileId] = name;
      return m;
    },
    {} as Record<string, string>,
  );

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Leave Management</h1>
          <p className="text-sm text-muted-foreground">
            Balances, requests and team calendar.
          </p>
        </div>
        <Button variant="outline" onClick={() => setPolicyOpen(true)}>
          <Settings className="h-4 w-4 mr-2" /> Leave Policy
        </Button>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          {
            label: "Annual Leave",
            key: "annual",
            color: "from-blue-500 to-cyan-500",
            count: stats?.byType?.find((t) => t._id === "annual")?.count ?? 0,
          },
          {
            label: "Sick Leave",
            key: "sick",
            color: "from-rose-500 to-red-500",
            count: stats?.byType?.find((t) => t._id === "sick")?.count ?? 0,
          },
          {
            label: "Pending Approval",
            key: "pending",
            color: "from-amber-500 to-orange-500",
            count: stats?.pending ?? 0,
          },
        ].map((b) => (
          <Card key={b.key}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
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

        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {corporateClients.map((c) => {
              const profileId = c.profile?._id ?? c._id;
              const name = c.profile?.businessName ?? c.fullName ?? c.email;
              return (
                <SelectItem key={profileId} value={profileId}>
                  {name}
                </SelectItem>
              );
            })}
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
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>

        {/* Pending */}
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

        {/* All requests */}
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

        {/* Team Calendar */}
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
                            {getInitials(name)}
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

        {/* Policies */}
        <TabsContent value="policies" className="space-y-4">
          {allPolicies.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                No leave policies set yet. Click{" "}
                <button
                  className="text-primary underline underline-offset-2"
                  onClick={() => setPolicyOpen(true)}
                >
                  Leave Policy
                </button>{" "}
                to configure one for a client.
              </CardContent>
            </Card>
          ) : (
            allPolicies.map((policy) => {
              const clientName =
                clientNameMap[policy.clientId?.toString()] ?? "Unknown Client";

              return (
                <Card key={policy._id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-sm font-semibold">
                        {clientName}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          Effective{" "}
                          {new Date(policy.effectiveFrom).toLocaleDateString(
                            "en-GB",
                            { day: "numeric", month: "short", year: "numeric" },
                          )}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            setPolicyClientId(policy.clientId?.toString());
                            setPolicyOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {policy.policies.map((p) => (
                        <div
                          key={p.type}
                          className="flex items-center justify-between px-3 py-2 rounded-lg border bg-muted/20"
                        >
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              LEAVE_TYPES.find((t) => t.value === p.type)
                                ?.color ?? "bg-muted text-muted-foreground"
                            }`}
                          >
                            {LEAVE_TYPES.find((t) => t.value === p.type)
                              ?.label ?? p.type}
                          </span>
                          <span className="text-sm font-bold ml-2">
                            {p.daysAllowed}d
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
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
              {/* Request summary */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dates</span>
                  <span className="font-mono text-xs">
                    {fmt(reviewTarget.request.startDate)} →{" "}
                    {fmt(reviewTarget.request.endDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reason</span>
                  <span>{reviewTarget.request.reason}</span>
                </div>
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

      {/* ── Leave Policy Dialog ── */}
      <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Leave Policy</DialogTitle>
            <DialogDescription>
              Set leave day allowances per type for a specific client. Changes
              take effect immediately for new leave requests.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Client selector */}
            <div>
              <Label>
                Client <span className="text-destructive">*</span>
              </Label>
              <Select value={policyClientId} onValueChange={setPolicyClientId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select a corporate client…" />
                </SelectTrigger>
                <SelectContent>
                  {corporateClients.map((c) => {
                    const profileId = c.profile?._id ?? c._id;
                    const name =
                      c.profile?.businessName ?? c.fullName ?? c.email;
                    return (
                      <SelectItem key={profileId} value={profileId}>
                        {name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Leave type entries */}
            <div>
              <Label className="mb-3 block">Days per leave type</Label>
              <div className="space-y-2">
                {LEAVE_TYPES.map((t, i) => (
                  <div key={t.value} className="flex items-center gap-3">
                    <span
                      className={`text-[11px] px-2.5 py-1 rounded-full font-medium w-32 text-center shrink-0 ${t.color}`}
                    >
                      {t.label}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      className="h-8 w-20"
                      value={policyEntries[i]?.daysAllowed || ""}
                      placeholder="0"
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
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPolicyOpen(false)}>
              Cancel
            </Button>
            <Button
              className="gradient-primary"
              disabled={!policyClientId || policyMutation.isPending}
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
              {getInitials(name)}
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
              {fmt(r.startDate)} → {fmt(r.endDate)} · {r.days}d ·{" "}
              {r.reason || "No reason given"}
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
