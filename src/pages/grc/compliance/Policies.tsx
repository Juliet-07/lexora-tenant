import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, ChevronRight, ChevronDown, Mail, BarChart3 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchPolicies,
  fetchPolicyStats,
  fetchPolicyRosterReport,
  fetchPolicyTemplates,
  createPolicyDoc,
  POLICY_TYPES,
  POLICY_CATEGORIES,
  REVIEW_FREQUENCIES,
  ACK_REQUIREMENTS,
  type Policy,
  type PolicyStatus,
  type PolicyType,
  type ReviewFrequency,
  type AckRequirement,
} from "@/lib/grc/policy-api";

const statusTone: Record<PolicyStatus, string> = {
  Published: "text-emerald-600 border-emerald-500/30 bg-emerald-500/10",
  "Under review": "text-amber-600 border-amber-500/30 bg-amber-500/10",
  "Pending board approval": "text-blue-600 border-blue-500/30 bg-blue-500/10",
  Draft: "text-muted-foreground",
};
const ackTone = (rate: number) =>
  rate >= 90
    ? "text-emerald-600"
    : rate >= 70
      ? "text-amber-600"
      : "text-rose-600";

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) =>
      r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function GrcPolicies() {
  const nav = useNavigate();
  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["grc-policies"],
    queryFn: fetchPolicies,
  });
  const { data: stats } = useQuery({
    queryKey: ["grc-policy-stats"],
    queryFn: fetchPolicyStats,
  });
  const [newOpen, setNewOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | PolicyStatus | "Overdue">("All");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const byCategory = useMemo(() => {
    const m = new Map<string, Policy[]>();
    policies.forEach((p) => {
      const cat = p.category || "Uncategorised";
      if (!m.has(cat)) m.set(cat, []);
      m.get(cat)!.push(p);
    });
    const order = POLICY_CATEGORIES;
    return [...m.entries()].sort((a, b) => {
      const ia = order.indexOf(a[0]);
      const ib = order.indexOf(b[0]);
      if (ia === -1 && ib === -1) return a[0].localeCompare(b[0]);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [policies]);

  const matches = (p: Policy) => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()))
      return false;
    if (filter === "All") return true;
    if (filter === "Overdue") return p.computedOverdue;
    return p.status === filter;
  };

  const toggle = (cat: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      n.has(cat) ? n.delete(cat) : n.add(cat);
      return n;
    });

  const remindersMut = useMutation({
    mutationFn: async () => {
      // Reminders go out per-policy; batch across every policy with
      // outstanding acknowledgements so this one button covers all
      // of them, matching the main-page action shown for the whole
      // register rather than a single policy.
      const outstanding = policies.filter(
        (p) =>
          p.status === "Published" && p.acknowledgedCount < p.assignedCount,
      );
      const { sendPolicyReminders } = await import("@/lib/grc/policy-api");
      let total = 0;
      for (const p of outstanding) {
        const r = await sendPolicyReminders(p._id);
        total += r.remindersSent;
      }
      return total;
    },
    onSuccess: (total) =>
      toast({
        title: "Reminders sent",
        description: `${total} reminder${total === 1 ? "" : "s"} sent to staff with outstanding acknowledgements.`,
      }),
    onError: (err: any) =>
      toast({
        title: "Failed to send reminders",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const exportReport = async () => {
    const rows = await fetchPolicyRosterReport();
    downloadCsv("policy-acknowledgement-report.csv", [
      [
        "Policy",
        "Reference",
        "Staff member",
        "Role",
        "Status",
        "Version acknowledged",
        "Date acknowledged",
      ],
      ...rows.map((r) => [
        r.policyTitle,
        r.policyReference,
        r.staffName,
        r.role,
        r.status,
        r.versionAcknowledged ?? "",
        r.dateAcknowledged ? r.dateAcknowledged.slice(0, 10) : "",
      ]),
    ]);
  };

  if (isLoading)
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading policies…
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Policies &amp; Procedures</h1>
          <p className="text-sm text-muted-foreground">
            Version-controlled policy register with review cycles and
            acknowledgement tracking.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New policy
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total policies</div>
            <div className="text-2xl font-bold mt-1">
              {stats?.totalPolicies ?? policies.length}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {stats?.published ?? 0} published, {stats?.draft ?? 0} draft,{" "}
              {stats?.underReview ?? 0} review
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Overdue reviews</div>
            <div className="text-2xl font-bold mt-1 text-rose-600">
              {stats?.overdueCount ?? 0}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 truncate">
              {stats?.overdueTitles?.join(", ") || "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">
              Avg acknowledgement
            </div>
            <div
              className={`text-2xl font-bold mt-1 ${ackTone(stats?.avgAcknowledgement ?? 0)}`}
            >
              {stats?.avgAcknowledgement ?? 0}%
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              target: 100%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Staff with gaps</div>
            <div className="text-2xl font-bold mt-1">
              {stats?.staffWithGaps ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="flex gap-1">
          {(
            [
              "All",
              "Published",
              "Draft",
              "Under review",
              "Pending board approval",
              "Overdue",
            ] as const
          ).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={filter === s ? "default" : "outline"}
              onClick={() => setFilter(s)}
            >
              {s}
            </Button>
          ))}
        </div>
        <Input
          className="max-w-xs"
          placeholder="Search policies…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {byCategory.map(([cat, items]) => {
          const isOpen = expanded.has(cat);
          const shown = items.filter(matches);
          const overdue = items.filter((p) => p.computedOverdue).length;
          const underReview = items.filter(
            (p) => p.status === "Under review",
          ).length;
          if (search || filter !== "All") {
            if (shown.length === 0) return null;
          }
          return (
            <Card key={cat}>
              <CardContent className="p-0">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
                  onClick={() => toggle(cat)}
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Badge variant="secondary">{cat}</Badge>
                    <span className="font-medium text-sm">
                      {items.length}{" "}
                      {items.length === 1 ? "policy" : "policies"}
                    </span>
                  </div>
                  {(overdue > 0 || underReview > 0) && (
                    <span className="text-xs text-muted-foreground">
                      {[
                        overdue > 0 ? `${overdue} overdue` : null,
                        underReview > 0 ? `${underReview} under review` : null,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  )}
                </button>
                {isOpen && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Policy</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Ver.</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Next review</TableHead>
                        <TableHead>Ack.</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shown.map((p) => (
                        <TableRow key={p._id}>
                          <TableCell className="font-medium">
                            {p.title}
                          </TableCell>
                          <TableCell className="text-sm">
                            {p.owner || "—"}
                          </TableCell>
                          <TableCell className="text-sm">{p.version}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={statusTone[p.status]}
                            >
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className={
                              p.computedOverdue
                                ? "text-rose-600 font-medium"
                                : ""
                            }
                          >
                            {p.status === "Draft" || !p.nextReviewDue
                              ? "—"
                              : `${p.nextReviewDue.slice(0, 10)}${p.computedOverdue ? " ⚠" : ""}`}
                          </TableCell>
                          <TableCell
                            className={
                              p.ackRate === null
                                ? "text-muted-foreground"
                                : ackTone(p.ackRate)
                            }
                          >
                            {p.ackRate === null ? "—" : `${p.ackRate}%`}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                nav(`/grc/compliance/policies/${p._id}`)
                              }
                            >
                              Open
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {shown.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center text-sm text-muted-foreground py-6"
                          >
                            No policies match.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          );
        })}
        {byCategory.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-10">
            No policies yet.
          </div>
        )}
      </div>

      <NewPolicyDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}

const CUSTOM_TEMPLATE = "__custom__";

function NewPolicyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const [f, setF] = useState({
    templateId: CUSTOM_TEMPLATE,
    title: "",
    category: POLICY_CATEGORIES[0],
    type: "organisation" as PolicyType,
    owner: "",
    approvalAuthority: "",
    reviewFrequency: "Annual" as ReviewFrequency,
    acknowledgementRequirement: "All staff must acknowledge" as AckRequirement,
    description: "",
    linkedRegulationsOrStandards: "",
    boardApprovalRequired: false,
  });

  // Templates are authored by Super Admin under the GRC module's
  // Policies area — fetched fresh (not cached across categories) and
  // filtered client-side to the category currently selected, plus a
  // "Custom policy" option for a blank editor.
  const { data: allTemplates = [] } = useQuery({
    queryKey: ["policy-templates"],
    queryFn: () => fetchPolicyTemplates(),
    enabled: open,
  });
  const templatesForCategory = allTemplates.filter(
    (t) => t.category === f.category,
  );

  const mutation = useMutation({
    mutationFn: () =>
      createPolicyDoc({
        ...f,
        templateId: f.templateId === CUSTOM_TEMPLATE ? undefined : f.templateId,
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["grc-policies"] });
      queryClient.invalidateQueries({ queryKey: ["grc-policy-stats"] });
      onOpenChange(false);
      nav(`/grc/compliance/policies/${created._id}`);
    },
    onError: (err: any) =>
      toast({
        title: "Failed to create policy",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const submit = () => {
    if (!f.title.trim())
      return toast({ title: "Policy title required", variant: "destructive" });
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New policy or procedure</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Category</Label>
            <Select
              value={f.category}
              onValueChange={(v) =>
                setF((prev) => {
                  const stillValid = allTemplates.some(
                    (t) => t._id === prev.templateId && t.category === v,
                  );
                  return {
                    ...prev,
                    category: v,
                    templateId: stillValid ? prev.templateId : CUSTOM_TEMPLATE,
                  };
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POLICY_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Template</Label>
            <Select
              value={f.templateId}
              onValueChange={(v) => setF({ ...f, templateId: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CUSTOM_TEMPLATE}>
                  Custom policy (blank editor)
                </SelectItem>
                {templatesForCategory.map((t) => (
                  <SelectItem key={t._id} value={t._id}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              {templatesForCategory.length > 0
                ? "Templates are published by your platform provider for this category. Pick one to start pre-structured, or leave it as a blank editor."
                : "No published templates for this category yet — this will start as a blank editor."}
            </p>
          </div>
          <div>
            <Label>Policy title</Label>
            <Input
              placeholder="e.g. Acceptable Use Policy"
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Acknowledgement audience</Label>
              <Select
                value={f.type}
                onValueChange={(v: PolicyType) => setF({ ...f, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POLICY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Organisation-wide policies are visible to employees and the
                board; board-only policies are restricted to the board.
              </p>
            </div>
            <div>
              <Label>Owner</Label>
              <Input
                placeholder="e.g. Compliance Officer"
                value={f.owner}
                onChange={(e) => setF({ ...f, owner: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-md border p-3">
            <Checkbox
              checked={f.boardApprovalRequired}
              onCheckedChange={(v) =>
                setF({ ...f, boardApprovalRequired: Boolean(v) })
              }
            />
            <div>
              <Label className="font-normal">
                Require board approval before publishing
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                When checked, approving this policy sends it to every active
                board member for sign-off; it only publishes once all of them
                approve.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Approval authority</Label>
              <Input
                placeholder="e.g. Board of Directors"
                value={f.approvalAuthority}
                onChange={(e) =>
                  setF({ ...f, approvalAuthority: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Review frequency</Label>
              <Select
                value={f.reviewFrequency}
                onValueChange={(v: ReviewFrequency) =>
                  setF({ ...f, reviewFrequency: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REVIEW_FREQUENCIES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Acknowledgement requirement</Label>
            <Select
              value={f.acknowledgementRequirement}
              onValueChange={(v: AckRequirement) =>
                setF({ ...f, acknowledgementRequirement: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACK_REQUIREMENTS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description / scope</Label>
            <Textarea
              rows={3}
              placeholder="Brief description of what this policy covers and its purpose…"
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          </div>
          <div>
            <Label>Linked regulations or standards</Label>
            <Input
              placeholder="e.g. BNR Law N° 75/2023, FATF Recommendations, King V Principle 2"
              value={f.linkedRegulationsOrStandards}
              onChange={(e) =>
                setF({ ...f, linkedRegulationsOrStandards: e.target.value })
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={mutation.isPending} onClick={submit}>
            {mutation.isPending ? "Creating…" : "Create and open editor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
