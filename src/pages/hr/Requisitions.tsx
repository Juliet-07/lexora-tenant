import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  Laptop,
  Plane,
  DollarSign,
  UserPlus,
  GraduationCap,
  Search,
  Inbox,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchAllRequisitions,
  reviewRequisition,
  fulfillRequisition,
  type Requisition,
  type RequisitionStatus,
} from "@/lib/hr-requisition-api";

// ─── Helpers ──────────────────────────────────────────────────

const TYPE_ICON: Record<string, any> = {
  hiring: UserPlus,
  equipment: Laptop,
  budget: DollarSign,
  travel: Plane,
  training: GraduationCap,
};

const priorityTone = (p: string) =>
  p === "urgent"
    ? "bg-destructive/10 text-destructive border-destructive/20"
    : p === "high"
      ? "bg-warning/10 text-warning border-warning/20"
      : p === "medium"
        ? "bg-info/10 text-info border-info/20"
        : "bg-muted text-muted-foreground";

const statusTone = (s: RequisitionStatus) =>
  s === "approved" || s === "fulfilled"
    ? "bg-success/10 text-success border-success/20"
    : s === "rejected"
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : "bg-warning/10 text-warning border-warning/20";

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function HRRequisitions() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Requisition | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [reviewNote, setReviewNote] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["requisitions"],
    queryFn: () => fetchAllRequisitions(),
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      id,
      decision,
    }: {
      id: string;
      decision: "approved" | "rejected";
    }) =>
      reviewRequisition(id, { decision, reviewNote: reviewNote || undefined }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["requisitions"] });
      setSelected(null);
      setReviewNote("");
      toast.success(`Requisition ${updated.status}.`);
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ?? "Failed to review requisition",
      ),
  });

  const fulfillMutation = useMutation({
    mutationFn: fulfillRequisition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requisitions"] });
      setSelected(null);
      toast.success("Marked as fulfilled.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to mark fulfilled"),
  });

  const filtered = useMemo(
    () =>
      items.filter((r) => {
        const q = query.trim().toLowerCase();
        const matchesQ =
          !q ||
          r.title.toLowerCase().includes(q) ||
          r.employeeName.toLowerCase().includes(q) ||
          (r.department ?? "").toLowerCase().includes(q) ||
          r._id.toLowerCase().includes(q);
        const matchesT = typeFilter === "all" || r.typeKey === typeFilter;
        return matchesQ && matchesT;
      }),
    [items, query, typeFilter],
  );

  const pending = items.filter((r) => r.status === "submitted");
  const approvedAll = items.filter(
    (r) => r.status === "approved" || r.status === "fulfilled",
  );
  const totalPendingSpend = pending.reduce((s, r) => s + (r.amount ?? 0), 0);

  const distinctTypes = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((r) => map.set(r.typeKey, r.typeLabel));
    return Array.from(map.entries());
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Requisitions</h1>
          <p className="text-sm text-muted-foreground">
            Review and approve requests submitted by employees.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Total"
          value={items.length}
          icon={ClipboardList}
          tone="from-primary to-secondary"
        />
        <Stat
          label="Awaiting Approval"
          value={pending.length}
          icon={Clock}
          tone="from-amber-500 to-orange-500"
        />
        <Stat
          label="Approved"
          value={approvedAll.length}
          icon={CheckCircle2}
          tone="from-emerald-500 to-teal-500"
        />
        <Stat
          label="Pending Spend"
          value={`$${totalPendingSpend.toLocaleString()}`}
          icon={DollarSign}
          tone="from-violet-500 to-purple-600"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, employee, department or ID"
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {distinctTypes.map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingRow label="Loading requisitions…" />
      ) : (
        <Tabs defaultValue="pending" className="space-y-2">
          <TabsList>
            <TabsTrigger value="pending">
              Awaiting Approval ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>

          {(["pending", "all", "approved", "rejected"] as const).map((tab) => {
            const list = filtered.filter((r) =>
              tab === "all"
                ? true
                : tab === "pending"
                  ? r.status === "submitted"
                  : tab === "approved"
                    ? r.status === "approved" || r.status === "fulfilled"
                    : r.status === "rejected",
            );
            return (
              <TabsContent key={tab} value={tab} className="space-y-2">
                {list.length === 0 && (
                  <Card>
                    <CardContent className="p-10 text-center text-sm text-muted-foreground">
                      <Inbox className="h-6 w-6 mx-auto mb-2 opacity-60" />
                      No requisitions in this view.
                    </CardContent>
                  </Card>
                )}
                {list.map((r) => {
                  const Icon = TYPE_ICON[r.typeKey] ?? ClipboardList;
                  return (
                    <Card
                      key={r._id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelected(r)}
                    >
                      <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {r.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {r.typeLabel} · {r.department ?? "—"} · by{" "}
                              {r.employeeName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {r.amount != null && (
                            <span className="text-sm font-bold">
                              {r.currency} {r.amount.toLocaleString()}
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className={priorityTone(r.priority)}
                          >
                            {r.priority}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={statusTone(r.status)}
                          >
                            {r.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      <Sheet
        open={!!selected}
        onOpenChange={(o) => {
          if (!o) {
            setSelected(null);
            setReviewNote("");
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
                <SheetDescription>
                  {selected.typeLabel} · {selected.department ?? "—"} · by{" "}
                  {selected.employeeName} · {fmtDate(selected.createdAt)}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={priorityTone(selected.priority)}
                  >
                    {selected.priority}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={statusTone(selected.status)}
                  >
                    {selected.status}
                  </Badge>
                  {selected.amount != null && (
                    <Badge variant="outline" className="bg-muted">
                      {selected.currency} {selected.amount.toLocaleString()}
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Justification
                  </p>
                  <p className="text-sm whitespace-pre-wrap">
                    {selected.justification || "—"}
                  </p>
                </div>

                {selected.status !== "submitted" && (
                  <div className="border rounded-lg p-3 space-y-1 bg-muted/30">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Review decision
                    </p>
                    <p className="text-sm">
                      {selected.status === "rejected" ? "Rejected" : "Approved"}
                      {selected.reviewedAt &&
                        ` on ${fmtDate(selected.reviewedAt)}`}
                    </p>
                    {selected.reviewNote && (
                      <p className="text-sm text-muted-foreground">
                        {selected.reviewNote}
                      </p>
                    )}
                  </div>
                )}

                {selected.status === "submitted" && (
                  <div className="space-y-2">
                    <Label className="text-xs">
                      Feedback to employee (optional)
                    </Label>
                    <Textarea
                      rows={3}
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="Visible to the employee once you decide…"
                    />
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-gradient-to-r from-primary to-secondary"
                        disabled={reviewMutation.isPending}
                        onClick={() =>
                          reviewMutation.mutate({
                            id: selected._id,
                            decision: "approved",
                          })
                        }
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={reviewMutation.isPending}
                        onClick={() =>
                          reviewMutation.mutate({
                            id: selected._id,
                            decision: "rejected",
                          })
                        }
                      >
                        <XCircle className="h-4 w-4 mr-2" /> Reject
                      </Button>
                    </div>
                  </div>
                )}

                {selected.status === "approved" && (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={fulfillMutation.isPending}
                    onClick={() => fulfillMutation.mutate(selected._id)}
                  >
                    {fulfillMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Mark as Fulfilled"
                    )}
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
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

function LoadingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
