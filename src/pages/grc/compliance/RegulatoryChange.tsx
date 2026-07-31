import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Plus,
  Newspaper,
  CalendarClock,
  FileText,
  ScrollText,
  Send,
  CheckCircle2,
  CircleDashed,
  Minus,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchRegChanges,
  createRegChange,
  updateRegChangeAssessment,
  updateLoopAction,
  fetchObligations,
  REGULATORS,
  URGENCIES,
  todayStr,
  type RegulatoryChange,
  type Regulator,
  type ChangeUrgency,
  type LoopAction,
  type LoopStatus,
} from "@/lib/grc/compliance-api";

const urgencyTone: Record<string, string> = {
  "Action Required": "text-rose-600 border-rose-500/30 bg-rose-500/10",
  Review: "text-amber-600 border-amber-500/30 bg-amber-500/10",
  Informational: "text-sky-600 border-sky-500/30 bg-sky-500/10",
  Noted: "text-muted-foreground",
};

const LOOP_KEYS = [
  {
    key: "obligationAction" as const,
    label: "Obligation updated",
    icon: CalendarClock,
  },
  {
    key: "policyAction" as const,
    label: "Policy review triggered",
    icon: FileText,
  },
  { key: "clauseAction" as const, label: "Clause flagged", icon: ScrollText },
  { key: "advisoryAction" as const, label: "Client advisory sent", icon: Send },
];

export default function ComplianceRegulatoryChange() {
  const { data: changes = [], isLoading } = useQuery({
    queryKey: ["compliance-regchanges"],
    queryFn: fetchRegChanges,
  });
  const [newOpen, setNewOpen] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const items = changes
    .filter((c) => filter === "all" || c.urgency === filter)
    .slice()
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  const current = changes.find((c) => c._id === sel) ?? null;

  if (isLoading)
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading regulatory change log…
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Regulatory Change</h1>
          <p className="text-sm text-muted-foreground">
            The cross-cutting closed loop: log a change, assess impact, then
            track the four downstream actions to completion.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All urgencies</SelectItem>
              {URGENCIES.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Log change
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Newspaper className="h-4 w-4" />
        Change feed — sourced from regulator publications and the platform
        monitoring service.
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((c) => (
          <Card
            key={c._id}
            className="cursor-pointer hover:shadow-md transition"
            onClick={() => setSel(c._id)}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{c.regulator}</Badge>
                <Badge variant="outline" className={urgencyTone[c.urgency]}>
                  {c.urgency}
                </Badge>
              </div>
              <div className="font-semibold text-sm">{c.title}</div>
              <p className="text-xs text-muted-foreground line-clamp-3">
                {c.summary}
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                {c.practiceAreas.map((p) => (
                  <span
                    key={p}
                    className="text-[10px] rounded bg-muted px-1.5 py-0.5"
                  >
                    {p}
                  </span>
                ))}
              </div>
              <div className="border-t pt-2 flex items-center justify-between">
                <LoopStrip change={c} />
                <span className="text-[11px] text-muted-foreground">
                  {c.publishedAt.slice(0, 10)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && (
          <div className="col-span-full text-center text-sm text-muted-foreground py-8">
            No changes logged.
          </div>
        )}
      </div>

      <NewChangeDialog open={newOpen} onOpenChange={setNewOpen} />
      {current && <ChangeSheet change={current} onClose={() => setSel(null)} />}
    </div>
  );
}

function LoopStrip({ change }: { change: RegulatoryChange }) {
  return (
    <div className="flex items-center gap-1.5">
      {LOOP_KEYS.map(({ key, icon: Icon, label }) => {
        const st = change[key].status;
        const tone =
          st === "Done"
            ? "text-emerald-600"
            : st === "In Progress"
              ? "text-amber-600"
              : st === "Not Applicable"
                ? "text-muted-foreground/50"
                : "text-muted-foreground";
        return (
          <Icon
            key={key}
            className={`h-3.5 w-3.5 ${tone}`}
            aria-label={`${label}: ${st}`}
          />
        );
      })}
    </div>
  );
}

function NewChangeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { data: obligations = [] } = useQuery({
    queryKey: ["compliance-obligations"],
    queryFn: fetchObligations,
    enabled: open,
  });
  const [f, setF] = useState({
    title: "",
    regulator: "BNR" as Regulator,
    publishedAt: todayStr(),
    summary: "",
    fullTextRef: "",
    urgency: "Review" as ChangeUrgency,
    practiceAreas: "",
    assessmentOwner: "",
    assessmentDeadline: todayStr(),
  });
  const [obls, setObls] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: () =>
      createRegChange({
        ...f,
        practiceAreas: f.practiceAreas
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        affectedObligationIds: obls,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-regchanges"] });
      toast({
        title: "Change logged",
        description: "Downstream actions opened in the closed loop.",
      });
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast({
        title: "Failed to log change",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const submit = () => {
    if (!f.title)
      return toast({ title: "Title required", variant: "destructive" });
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Log regulatory change</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          <div>
            <Label>Title</Label>
            <Input
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Regulator</Label>
              <Select
                value={f.regulator}
                onValueChange={(v) => setF({ ...f, regulator: v as Regulator })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REGULATORS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date published</Label>
              <Input
                type="date"
                value={f.publishedAt}
                onChange={(e) => setF({ ...f, publishedAt: e.target.value })}
              />
            </div>
            <div>
              <Label>Urgency</Label>
              <Select
                value={f.urgency}
                onValueChange={(v) =>
                  setF({ ...f, urgency: v as ChangeUrgency })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {URGENCIES.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Summary</Label>
            <Textarea
              rows={3}
              value={f.summary}
              onChange={(e) => setF({ ...f, summary: e.target.value })}
            />
          </div>
          <div>
            <Label>Full text reference (Legal Library)</Label>
            <Input
              value={f.fullTextRef}
              onChange={(e) => setF({ ...f, fullTextRef: e.target.value })}
            />
          </div>
          <div>
            <Label>Affected practice areas (comma separated)</Label>
            <Input
              value={f.practiceAreas}
              onChange={(e) => setF({ ...f, practiceAreas: e.target.value })}
            />
          </div>
          <div>
            <Label>Affected obligations</Label>
            <div className="space-y-1 mt-1 border rounded p-2 max-h-40 overflow-y-auto">
              {obligations.map((o) => (
                <label key={o._id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={obls.includes(o._id)}
                    onCheckedChange={(v) =>
                      setObls((prev) =>
                        v ? [...prev, o._id] : prev.filter((x) => x !== o._id),
                      )
                    }
                  />
                  <span>
                    {o.reference} — {o.title}
                  </span>
                </label>
              ))}
              {obligations.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  No obligations registered yet.
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Impact assessment owner</Label>
              <Input
                value={f.assessmentOwner}
                onChange={(e) =>
                  setF({ ...f, assessmentOwner: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Assessment deadline</Label>
              <Input
                type="date"
                value={f.assessmentDeadline}
                onChange={(e) =>
                  setF({ ...f, assessmentDeadline: e.target.value })
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "Logging…" : "Log change"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangeSheet({
  change,
  onClose,
}: {
  change: RegulatoryChange;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["compliance-regchanges"] });
  const { data: obligations = [] } = useQuery({
    queryKey: ["compliance-obligations"],
    queryFn: fetchObligations,
  });

  const assessmentMut = useMutation({
    mutationFn: (patch: Parameters<typeof updateRegChangeAssessment>[1]) =>
      updateRegChangeAssessment(change._id, patch),
    onSuccess: invalidate,
  });
  const loopMut = useMutation({
    mutationFn: ({ field, patch }: { field: any; patch: any }) =>
      updateLoopAction(change._id, field, patch),
    onSuccess: invalidate,
  });

  const affected = obligations.filter((o) =>
    change.affectedObligationIds.includes(o._id),
  );

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{change.title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{change.regulator}</Badge>
            <Badge variant="outline" className={urgencyTone[change.urgency]}>
              {change.urgency}
            </Badge>
            <Badge variant="outline">
              Published {change.publishedAt.slice(0, 10)}
            </Badge>
          </div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {change.summary}
          </div>
          <div className="text-xs text-muted-foreground">
            Full text: {change.fullTextRef || "—"}
          </div>

          <div className="border rounded-lg p-3 space-y-3">
            <div className="font-medium text-sm">Impact assessment</div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Owner</Label>
                <Input
                  defaultValue={change.assessmentOwner}
                  onBlur={(e) =>
                    assessmentMut.mutate({ assessmentOwner: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Deadline</Label>
                <Input
                  type="date"
                  defaultValue={change.assessmentDeadline?.slice(0, 10) ?? ""}
                  onBlur={(e) =>
                    e.target.value &&
                    assessmentMut.mutate({ assessmentDeadline: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select
                  value={change.assessmentStatus}
                  onValueChange={(v) =>
                    assessmentMut.mutate({ assessmentStatus: v as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Unassigned", "In Progress", "Complete"].map((x) => (
                      <SelectItem key={x} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Assessment notes</Label>
              <Textarea
                rows={3}
                defaultValue={change.assessmentNotes}
                onBlur={(e) =>
                  assessmentMut.mutate({ assessmentNotes: e.target.value })
                }
              />
            </div>
            <div className="text-xs">
              <div className="text-muted-foreground mb-1">
                Affected obligations
              </div>
              {affected.length === 0 && (
                <span className="text-muted-foreground">None linked.</span>
              )}
              <div className="flex flex-wrap gap-1">
                {affected.map((o) => (
                  <Badge key={o._id} variant="outline">
                    {o.reference} · {o.regulator}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="text-xs">
              <div className="text-muted-foreground mb-1">
                Affected policies
              </div>
              <div className="flex flex-wrap gap-1">
                {change.affectedPolicyTitles.length === 0 ? (
                  <span className="text-muted-foreground">None linked.</span>
                ) : (
                  change.affectedPolicyTitles.map((p) => (
                    <Badge key={p} variant="outline">
                      {p}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-3 space-y-3">
            <div className="font-medium text-sm">
              Closed loop — downstream actions
            </div>
            {LOOP_KEYS.map(({ key, label, icon: Icon }) => {
              const a: LoopAction = change[key];
              const StatusIcon =
                a.status === "Done"
                  ? CheckCircle2
                  : a.status === "Not Applicable"
                    ? Minus
                    : CircleDashed;
              return (
                <div key={key} className="border rounded p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {label}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusIcon
                        className={`h-4 w-4 ${a.status === "Done" ? "text-emerald-600" : "text-muted-foreground"}`}
                      />
                      <Select
                        value={a.status}
                        onValueChange={(v) =>
                          loopMut.mutate({
                            field: key,
                            patch: { status: v as LoopStatus },
                          })
                        }
                      >
                        <SelectTrigger className="w-40 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            "Pending",
                            "In Progress",
                            "Done",
                            "Not Applicable",
                          ].map((x) => (
                            <SelectItem key={x} value={x}>
                              {x}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Input
                    className="h-8 text-sm"
                    defaultValue={a.note}
                    placeholder="Action note"
                    onBlur={(e) =>
                      loopMut.mutate({
                        field: key,
                        patch: { note: e.target.value },
                      })
                    }
                  />
                  {a.completedAt && (
                    <div className="text-[11px] text-muted-foreground">
                      Completed {new Date(a.completedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
