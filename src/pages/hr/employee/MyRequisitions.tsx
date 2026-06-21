import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Laptop,
  Plane,
  DollarSign,
  UserPlus,
  GraduationCap,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchMyRequisitions,
  fetchMyRequisitionTypes,
  createRequisition,
  type Requisition,
  type RequisitionPriority,
} from "@/lib/hr-requisition-api";

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

const statusTone = (s: string) =>
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

export default function MyRequisitions() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Requisition | null>(null);
  const [open, setOpen] = useState(false);

  const { data: mine = [], isLoading } = useQuery({
    queryKey: ["my-requisitions"],
    queryFn: fetchMyRequisitions,
  });

  const { data: typeList } = useQuery({
    queryKey: ["my-requisition-types"],
    queryFn: fetchMyRequisitionTypes,
  });

  const [form, setForm] = useState({
    typeKey: "",
    title: "",
    amount: "",
    currency: "USD",
    priority: "medium" as RequisitionPriority,
    justification: "",
  });

  const createMutation = useMutation({
    mutationFn: createRequisition,
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["my-requisitions"] });
      setOpen(false);
      setForm({
        typeKey: "",
        title: "",
        amount: "",
        currency: "USD",
        priority: "medium",
        justification: "",
      });
      toast.success(`${r.title} submitted for approval.`);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to submit request"),
  });

  const pending = mine.filter((r) => r.status === "submitted").length;
  const approved = mine.filter(
    (r) => r.status === "approved" || r.status === "fulfilled",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Requisitions</h1>
          <p className="text-sm text-muted-foreground">
            Submit requests for equipment, budget, travel, training or hiring.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-secondary">
              <Plus className="h-4 w-4 mr-2" /> New Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit a Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select
                    value={form.typeKey}
                    onValueChange={(v) => setForm({ ...form, typeKey: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {(typeList?.items ?? []).map((t) => (
                        <SelectItem key={t.key} value={t.key}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Priority</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v: any) =>
                      setForm({ ...form, priority: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="What are you requesting?"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-2">
                  <Label>Estimated Amount</Label>
                  <Input
                    type="number"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Currency</Label>
                  <Select
                    value={form.currency}
                    onValueChange={(v) => setForm({ ...form, currency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["USD", "EUR", "GBP", "NGN", "RWF", "KES", "ZAR"].map(
                        (c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Justification</Label>
                <Textarea
                  rows={4}
                  value={form.justification}
                  onChange={(e) =>
                    setForm({ ...form, justification: e.target.value })
                  }
                  placeholder="Why does this need to happen?"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={
                  !form.typeKey || !form.title || createMutation.isPending
                }
                onClick={() =>
                  createMutation.mutate({
                    typeKey: form.typeKey,
                    title: form.title,
                    amount: form.amount ? Number(form.amount) : undefined,
                    currency: form.amount ? form.currency : undefined,
                    priority: form.priority,
                    justification: form.justification || undefined,
                  })
                }
                className="bg-gradient-to-r from-primary to-secondary"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Submit for Approval"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Stat
          label="My Total"
          value={mine.length}
          icon={ClipboardList}
          tone="from-primary to-secondary"
        />
        <Stat
          label="Pending"
          value={pending}
          icon={Clock}
          tone="from-amber-500 to-orange-500"
        />
        <Stat
          label="Approved"
          value={approved}
          icon={CheckCircle2}
          tone="from-emerald-500 to-teal-500"
        />
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <LoadingRow label="Loading your requests…" />
        ) : mine.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              You haven't submitted any requests yet.
            </CardContent>
          </Card>
        ) : (
          mine.map((r) => {
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
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.typeLabel} · submitted {fmtDate(r.createdAt)}
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
                    <Badge variant="outline" className={statusTone(r.status)}>
                      {r.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
                <SheetDescription>
                  {selected.typeLabel} · submitted {fmtDate(selected.createdAt)}
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

                {/* This IS the feedback the employee sees — the
                    tenant's decision and any note they left. */}
                {selected.status !== "submitted" ? (
                  <div className="border rounded-lg p-3 space-y-1 bg-muted/30">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      {selected.status === "rejected" ? (
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      )}
                      {selected.status === "rejected" ? "Rejected" : "Approved"}
                    </p>
                    {selected.reviewedAt && (
                      <p className="text-xs text-muted-foreground">
                        on {fmtDate(selected.reviewedAt)}
                      </p>
                    )}
                    {selected.reviewNote && (
                      <p className="text-sm mt-1">{selected.reviewNote}</p>
                    )}
                    {selected.status === "fulfilled" &&
                      selected.fulfilledAt && (
                        <p className="text-xs text-success mt-1">
                          Fulfilled on {fmtDate(selected.fulfilledAt)}
                        </p>
                      )}
                  </div>
                ) : (
                  <div className="border rounded-lg p-3 bg-muted/30 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-warning" />
                    <p className="text-sm text-muted-foreground">
                      Awaiting a decision.
                    </p>
                  </div>
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
