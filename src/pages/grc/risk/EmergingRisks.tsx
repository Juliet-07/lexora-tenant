import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Zap,
  ArrowUpRight,
  Trash2,
  Radar,
  Bell,
  CalendarClock,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchEmergingRisks,
  createEmergingRisk,
  updateEmergingRisk,
  addEmergingTrigger,
  fireEmergingTrigger,
  addEmergingReview,
  escalateEmergingRisk,
  deleteEmergingRisk,
  RISK_CATEGORIES,
  VELOCITIES,
  watchTone,
  categoriseWatchList,
  type EmergingRisk,
  type RiskCategory,
  type Velocity,
  type TriggerKind,
  type ReviewRecommendation,
} from "@/lib/grc/risk-api";

const SOURCES = ["Manual entry", "Regulatory feed", "Horizon scan"] as const;
const TRIGGER_KINDS: TriggerKind[] = [
  "Likelihood increase",
  "Proximity",
  "Trigger event",
];
const RECOMMENDATIONS: ReviewRecommendation[] = [
  "Escalate to register",
  "Maintain watch",
  "Remove",
];

const currentQuarter = () =>
  `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`;

export default function GrcEmergingRisks() {
  const { data: emerging = [], isLoading } = useQuery({
    queryKey: ["grc-emerging"],
    queryFn: fetchEmergingRisks,
  });
  const [openNew, setOpenNew] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = emerging.find((e) => e._id === selectedId) ?? null;
  const watching = emerging.filter((e) => e.status === "Watching");
  const escalated = emerging.filter((e) => e.status === "Escalated");
  const removed = emerging.filter((e) => e.status === "Removed");
  const armed = watching.filter((e) => e.triggers.some((t) => t.fired));

  const [form, setForm] = useState({
    title: "",
    category: "Compliance" as RiskCategory,
    source: "Manual entry" as (typeof SOURCES)[number],
    description: "",
    impact: 3,
    velocity: "Medium term" as Velocity,
    owner: "",
  });

  const createMut = useMutation({
    mutationFn: () => createEmergingRisk(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-emerging"] });
      setOpenNew(false);
      setForm({
        title: "",
        category: "Compliance",
        source: "Manual entry",
        description: "",
        impact: 3,
        velocity: "Medium term",
        owner: "",
      });
      toast({
        title: "Added to horizon scan",
        description: `Watch-list: ${categoriseWatchList(form.impact, form.velocity)}`,
      });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to add entry",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });
  const queryClient = useQueryClient();

  const create = () => {
    if (!form.title.trim())
      return toast({ title: "Title is required", variant: "destructive" });
    createMut.mutate();
  };

  const rows = (list: EmergingRisk[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Risk</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Source</TableHead>
          <TableHead className="text-center">Impact</TableHead>
          <TableHead>Velocity</TableHead>
          <TableHead>Watch-list</TableHead>
          <TableHead>Triggers</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.map((e) => (
          <TableRow
            key={e._id}
            className="cursor-pointer"
            onClick={() => setSelectedId(e._id)}
          >
            <TableCell className="font-medium">{e.title}</TableCell>
            <TableCell className="text-muted-foreground">
              {e.category}
            </TableCell>
            <TableCell className="text-muted-foreground">{e.source}</TableCell>
            <TableCell className="text-center">{e.impact}/5</TableCell>
            <TableCell>{e.velocity}</TableCell>
            <TableCell>
              <Badge variant="outline" className={watchTone(e.watchList)}>
                {e.watchList}
              </Badge>
            </TableCell>
            <TableCell>
              {e.triggers.some((t) => t.fired) ? (
                <Badge
                  variant="outline"
                  className="bg-rose-100 text-rose-700 border-rose-200"
                >
                  <Zap className="h-3 w-3 mr-1" /> Fired
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {e.triggers.length} configured
                </span>
              )}
            </TableCell>
          </TableRow>
        ))}
        {list.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={7}
              className="text-center text-sm text-muted-foreground py-10"
            >
              Nothing here.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  if (isLoading)
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading horizon scan…
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Emerging Risks</h1>
          <p className="text-sm text-muted-foreground">
            A pre-register watch list. Escalation moves the record into the Risk
            Register — it never lives in both places.
          </p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add to horizon scan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Horizon scanning entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Draft directive on agent liquidity"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) =>
                      setForm({ ...form, category: v as RiskCategory })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RISK_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Source</Label>
                  <Select
                    value={form.source}
                    onValueChange={(v) =>
                      setForm({ ...form, source: v as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Impact (1-5)</Label>
                  <Select
                    value={String(form.impact)}
                    onValueChange={(v) =>
                      setForm({ ...form, impact: Number(v) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Velocity</Label>
                  <Select
                    value={form.velocity}
                    onValueChange={(v) =>
                      setForm({ ...form, velocity: v as Velocity })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VELOCITIES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Owner</Label>
                  <Input
                    value={form.owner}
                    onChange={(e) =>
                      setForm({ ...form, owner: e.target.value })
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Watch-list category is assigned automatically:{" "}
                <strong>
                  {categoriseWatchList(form.impact, form.velocity)}
                </strong>
              </p>
            </div>
            <DialogFooter>
              <Button onClick={create} disabled={createMut.isPending}>
                {createMut.isPending ? "Adding…" : "Add entry"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Radar className="h-4 w-4" />}
          label="On watch"
          value={watching.length}
          tone="from-sky-500 to-indigo-500"
        />
        <StatCard
          icon={<Zap className="h-4 w-4" />}
          label="Triggers fired"
          value={armed.length}
          tone="from-rose-500 to-orange-500"
        />
        <StatCard
          icon={<ArrowUpRight className="h-4 w-4" />}
          label="Escalated"
          value={escalated.length}
          tone="from-emerald-500 to-teal-500"
        />
        <StatCard
          icon={<CalendarClock className="h-4 w-4" />}
          label="Reviewed this quarter"
          value={
            emerging.filter((e) =>
              e.reviews.some((r) => r.quarter === currentQuarter()),
            ).length
          }
          tone="from-violet-500 to-fuchsia-500"
        />
      </div>

      {armed.length > 0 && (
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <Bell className="h-4 w-4 text-rose-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-rose-700">
                {armed.length} watch-list risk
                {armed.length > 1 ? "s have" : " has"} a fired escalation
                trigger
              </p>
              <p className="text-muted-foreground">
                Open the record and escalate it into the Risk Register at Step 1
                (Identify).
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="watching">
        <TabsList>
          <TabsTrigger value="watching">Watch list</TabsTrigger>
          <TabsTrigger value="escalated">Escalated</TabsTrigger>
          <TabsTrigger value="removed">Removed</TabsTrigger>
        </TabsList>
        <TabsContent value="watching">
          <Card>
            <CardContent className="p-0">{rows(watching)}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="escalated">
          <Card>
            <CardContent className="p-0">{rows(escalated)}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="removed">
          <Card>
            <CardContent className="p-0">{rows(removed)}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EmergingSheet risk={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className={`h-9 w-9 rounded-lg bg-gradient-to-br ${tone} text-white flex items-center justify-center`}
        >
          {icon}
        </div>
        <div>
          <div className="text-xl font-bold leading-none">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmergingSheet({
  risk,
  onClose,
}: {
  risk: EmergingRisk | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["grc-emerging"] });
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const [trigger, setTrigger] = useState<{
    kind: TriggerKind;
    condition: string;
  }>({ kind: "Trigger event", condition: "" });
  const [review, setReview] = useState<{
    recommendation: ReviewRecommendation;
    note: string;
  }>({ recommendation: "Maintain watch", note: "" });
  const [escalationNote, setEscalationNote] = useState("");
  const [escalationLikelihood, setEscalationLikelihood] = useState(3);

  const updateMut = useMutation({
    mutationFn: (patch: { impact?: number; velocity?: Velocity }) =>
      updateEmergingRisk(risk!._id, patch),
    onSuccess: invalidate,
  });
  const addTriggerMut = useMutation({
    mutationFn: () => addEmergingTrigger(risk!._id, trigger),
    onSuccess: () => {
      invalidate();
      setTrigger({ ...trigger, condition: "" });
    },
    onError: onErr("Failed to add trigger"),
  });
  const fireTriggerMut = useMutation({
    mutationFn: (index: number) => fireEmergingTrigger(risk!._id, index),
    onSuccess: invalidate,
    onError: onErr("Failed to mark fired"),
  });
  const addReviewMut = useMutation({
    mutationFn: () =>
      addEmergingReview(risk!._id, {
        quarter: currentQuarter(),
        recommendation: review.recommendation,
        note: review.note,
      }),
    onSuccess: () => {
      invalidate();
      setReview({ recommendation: "Maintain watch", note: "" });
      toast({ title: "Review recorded" });
    },
    onError: onErr("Failed to record review"),
  });
  const escalateMut = useMutation({
    mutationFn: () =>
      escalateEmergingRisk(risk!._id, escalationLikelihood, escalationNote),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["grc-risks"] });
      setEscalationNote("");
      toast({
        title: "Escalated",
        description: "A matching Risk Register entry has been created.",
      });
    },
    onError: onErr("Failed to escalate"),
  });
  const deleteMut = useMutation({
    mutationFn: () => deleteEmergingRisk(risk!._id),
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: onErr("Failed to delete"),
  });

  const canEscalate = risk?.status === "Watching";
  const fired = useMemo(
    () => risk?.triggers.some((t) => t.fired) ?? false,
    [risk],
  );

  if (!risk) return null;

  return (
    <Sheet open={!!risk} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="pr-8">{risk.title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{risk.category}</Badge>
            <Badge variant="outline">{risk.source}</Badge>
            <Badge variant="outline" className={watchTone(risk.watchList)}>
              {risk.watchList}
            </Badge>
            <Badge variant="outline">Impact {risk.impact}/5</Badge>
            <Badge variant="outline">{risk.velocity}</Badge>
          </div>

          <p className="text-sm text-muted-foreground">{risk.description}</p>

          {risk.status === "Escalated" && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
              <p className="font-medium text-emerald-700">
                Escalated to the Risk Register
              </p>
              <p className="text-muted-foreground">
                {risk.escalationNote || "No note recorded."}
              </p>
            </div>
          )}

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Impact & velocity</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Impact</Label>
                <Select
                  value={String(risk.impact)}
                  onValueChange={(v) => updateMut.mutate({ impact: Number(v) })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Velocity</Label>
                <Select
                  value={risk.velocity}
                  onValueChange={(v) =>
                    updateMut.mutate({ velocity: v as Velocity })
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VELOCITIES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Escalation triggers</h3>
            {risk.triggers.map((t, i) => (
              <div
                key={i}
                className="border rounded-lg p-3 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="text-sm font-medium">{t.kind}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.condition}
                  </div>
                </div>
                {t.fired ? (
                  <Badge
                    variant="outline"
                    className="bg-rose-100 text-rose-700 border-rose-200"
                  >
                    Fired
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={fireTriggerMut.isPending}
                    onClick={() => fireTriggerMut.mutate(i)}
                  >
                    <Zap className="h-3.5 w-3.5 mr-1" /> Mark fired
                  </Button>
                )}
              </div>
            ))}
            <div className="grid grid-cols-[160px_1fr_auto] gap-2 items-end">
              <div>
                <Label className="text-xs">Type</Label>
                <Select
                  value={trigger.kind}
                  onValueChange={(v) =>
                    setTrigger({ ...trigger, kind: v as TriggerKind })
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Condition</Label>
                <Input
                  className="h-8"
                  value={trigger.condition}
                  onChange={(e) =>
                    setTrigger({ ...trigger, condition: e.target.value })
                  }
                  placeholder="e.g. Directive gazetted"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!trigger.condition.trim() || addTriggerMut.isPending}
                onClick={() => addTriggerMut.mutate()}
              >
                Add
              </Button>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Quarterly review</h3>
            {risk.reviews.map((r, i) => (
              <div key={i} className="border rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{r.recommendation}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.quarter} · {new Date(r.at).toLocaleDateString()}
                  </span>
                </div>
                {r.note && (
                  <p className="text-xs text-muted-foreground mt-1">{r.note}</p>
                )}
              </div>
            ))}
            <div className="space-y-2">
              <Select
                value={review.recommendation}
                onValueChange={(v) =>
                  setReview({
                    ...review,
                    recommendation: v as ReviewRecommendation,
                  })
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECOMMENDATIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                rows={2}
                placeholder="Review note"
                value={review.note}
                onChange={(e) => setReview({ ...review, note: e.target.value })}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={addReviewMut.isPending}
                onClick={() => addReviewMut.mutate()}
              >
                Record review
              </Button>
            </div>
          </section>

          <section className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-semibold">Escalate to Risk Register</h3>
            <p className="text-xs text-muted-foreground">
              {fired
                ? "A trigger has fired — this record is ready to enter the Risk Lifecycle at Step 1 (Identify)."
                : "Usually done once a trigger fires, but the Risk Committee can escalate early."}
            </p>
            {risk.linkedRiskId ? (
              <p className="text-xs text-emerald-700">
                Already escalated — a Risk Register entry exists for this
                record.
              </p>
            ) : (
              <>
                <div>
                  <Label className="text-xs">
                    Likelihood (1-5) — the register's 5×5 matrix needs this, and
                    nothing above implies one
                  </Label>
                  <Select
                    value={String(escalationLikelihood)}
                    onValueChange={(v) => setEscalationLikelihood(Number(v))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  placeholder="Handover note (optional)"
                  value={escalationNote}
                  onChange={(e) => setEscalationNote(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    disabled={!canEscalate || escalateMut.isPending}
                    onClick={() => escalateMut.mutate()}
                  >
                    <ArrowUpRight className="h-4 w-4 mr-2" /> Escalate
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-destructive"
                    disabled={deleteMut.isPending}
                    onClick={() => deleteMut.mutate()}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </Button>
                </div>
              </>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
