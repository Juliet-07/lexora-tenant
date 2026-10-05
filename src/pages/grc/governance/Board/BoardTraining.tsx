import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Loader2,
  FileText,
  Paperclip,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchBoardMembers,
  fetchTrainings,
  createTraining,
  updateTraining,
  deleteTraining,
  resolveGrcFileUrl,
  TRAINING_CATEGORIES,
  type TrainingCategory,
  type TrainingFormat,
  type GovernanceTraining,
} from "@/lib/grc/governance-api";
import { fmtDate } from "@/lib/grc/usePersistentState";
import { TrainingModulesTab } from "@/components/grc/BoardTrainingModules";

interface Member {
  id: string;
  name: string;
  role: string;
}

const emptyForm = () => ({
  title: "",
  description: "",
  category: "Governance" as TrainingCategory,
  provider: "",
  format: "Online" as TrainingFormat,
  cpdHours: 1,
  dueDate: "",
  mandatory: true,
  assignedTo: [] as string[],
  file: undefined as File | undefined,
});

export default function BoardTraining() {
  const queryClient = useQueryClient();
  const { data: apiMembers = [] } = useQuery({
    queryKey: ["grc-board-members"],
    queryFn: fetchBoardMembers,
  });
  const members: Member[] = useMemo(
    () =>
      apiMembers
        .filter((m: any) => m.isActive !== false)
        .map((m) => ({ id: m._id, name: m.name, role: String(m.role ?? "") })),
    [apiMembers],
  );

  const { data: trainings = [], isLoading } = useQuery({
    queryKey: ["grc-trainings"],
    queryFn: fetchTrainings,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [filter, setFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: () =>
      createTraining({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        provider: form.provider.trim() || undefined,
        format: form.format,
        cpdHours: form.cpdHours,
        dueDate: form.dueDate || undefined,
        mandatory: form.mandatory,
        assignedTo: form.assignedTo,
        file: form.file,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-trainings"] });
      setOpen(false);
      setForm(emptyForm());
      toast({
        title: "Training created",
        description:
          "Assigned board members can now access it from their portal.",
      });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to create training",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const updateMut = useMutation({
    mutationFn: () =>
      updateTraining(editingId!, {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        provider: form.provider.trim(),
        format: form.format,
        cpdHours: form.cpdHours,
        dueDate: form.dueDate || "",
        mandatory: form.mandatory,
        assignedTo: form.assignedTo,
        file: form.file,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-trainings"] });
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm());
      toast({ title: "Training updated" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to update training",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTraining(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-trainings"] });
      toast({ title: "Training deleted" });
    },
    onError: () =>
      toast({ title: "Failed to delete training", variant: "destructive" }),
  });

  const assignees = (t: GovernanceTraining) =>
    t.assignedTo.length
      ? members.filter((m) => t.assignedTo.includes(m.id))
      : members;
  const completionFor = (t: GovernanceTraining, mId: string) =>
    t.completions.find((c) => c.boardMemberId === mId);

  const stats = (t: GovernanceTraining) => {
    const a = assignees(t);
    const done = a.filter((m) => completionFor(t, m.id)).length;
    return {
      total: a.length,
      done,
      pct: a.length ? Math.round((done / a.length) * 100) : 0,
    };
  };
  const overdue = (t: GovernanceTraining) =>
    !!t.dueDate && new Date(t.dueDate) < new Date() && stats(t).pct < 100;

  const totalAssign = trainings.reduce((s, t) => s + stats(t).total, 0);
  const totalDone = trainings.reduce((s, t) => s + stats(t).done, 0);
  const cpdEarned = (mId: string) =>
    trainings
      .filter((t) => completionFor(t, mId))
      .reduce((s, t) => s + t.cpdHours, 0);

  const save = () => {
    if (!form.title.trim())
      return toast({ title: "Title required", variant: "destructive" });
    if (editingId) updateMut.mutate();
    else createMut.mutate();
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (t: GovernanceTraining) => {
    setEditingId(t._id);
    setForm({
      title: t.title,
      description: t.description || "",
      category: t.category,
      provider: t.provider || "",
      format: t.format,
      cpdHours: t.cpdHours,
      dueDate: t.dueDate ? t.dueDate.slice(0, 10) : "",
      mandatory: t.mandatory,
      assignedTo: t.assignedTo,
      file: undefined,
    });
    setOpen(true);
  };

  const exportCsv = () => {
    const rows = [
      ["Member", "Role", ...trainings.map((t) => t.title), "CPD hours"],
    ];
    members.forEach((m) =>
      rows.push([
        m.name,
        m.role,
        ...trainings.map((t) => {
          if (!assignees(t).some((a) => a.id === m.id)) return "N/A";
          const c = completionFor(t, m.id);
          return c
            ? `Completed ${fmtDate(c.completedAt)} (${c.method})`
            : "Not completed";
        }),
        String(cpdEarned(m.id)),
      ]),
    );
    const csv = rows
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "board-training-tracker.csv";
    a.click();
  };

  const visible = trainings.filter(
    (t) => filter === "all" || t.category === filter,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" /> Board Training
          </h1>
          <p className="text-sm text-muted-foreground">
            Create training for directors, track completion and CPD hours, and
            manage onboarding modules.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> New training
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Trainings", value: trainings.length, icon: GraduationCap },
          {
            label: "Completion rate",
            value: `${totalAssign ? Math.round((totalDone / totalAssign) * 100) : 0}%`,
            icon: CheckCircle2,
          },
          { label: "Outstanding", value: totalAssign - totalDone, icon: Clock },
          {
            label: "Overdue trainings",
            value: trainings.filter(overdue).length,
            icon: AlertTriangle,
          },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <k.icon className="h-5 w-5 text-primary" />
              <div>
                <div className="text-xl font-bold">{k.value}</div>
                <div className="text-xs text-muted-foreground">{k.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="programmes">
        <TabsList>
          <TabsTrigger value="programmes">Trainings</TabsTrigger>
          <TabsTrigger value="tracker">Completion tracker</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding modules</TabsTrigger>
        </TabsList>

        <TabsContent value="programmes" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {TRAINING_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isLoading && (
            <p className="text-sm text-muted-foreground text-center py-10">
              Loading trainings…
            </p>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            {visible.map((t) => {
              const s = stats(t);
              return (
                <Card key={t._id}>
                  <CardHeader className="pb-2 flex-row items-start justify-between space-y-0 gap-2">
                    <div>
                      <div className="flex gap-1.5 mb-1 flex-wrap">
                        <Badge variant="secondary">{t.category}</Badge>
                        {t.mandatory && <Badge>Mandatory</Badge>}
                        {overdue(t) && (
                          <Badge variant="destructive">Overdue</Badge>
                        )}
                      </div>
                      <CardTitle className="text-base">{t.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Edit training"
                        onClick={() => openEdit(t)}
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Delete training"
                        disabled={deleteMut.isPending}
                        onClick={() => deleteMut.mutate(t._id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {t.description && (
                      <p className="text-sm text-muted-foreground">
                        {t.description}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                      <span>{t.format}</span>
                      {t.provider && <span>{t.provider}</span>}
                      <span>{t.cpdHours} CPD hrs</span>
                      <span>
                        {t.dueDate
                          ? `Due ${fmtDate(t.dueDate)}`
                          : "No due date"}
                      </span>
                    </div>
                    {t.resourceUrl ? (
                      <a
                        href={resolveGrcFileUrl(t.resourceUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <Paperclip className="h-3 w-3" />
                        {t.resourceName || "Training material"}
                      </a>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        No material attached — members complete this by
                        uploading proof.
                      </p>
                    )}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>
                          {s.done} of {s.total} completed
                        </span>
                        <span className="font-medium">{s.pct}%</span>
                      </div>
                      <Progress value={s.pct} />
                    </div>
                    <div className="space-y-1">
                      {assignees(t).map((m) => {
                        const c = completionFor(t, m.id);
                        return (
                          <div
                            key={m.id}
                            className="flex items-center justify-between text-sm border rounded px-2 py-1.5"
                          >
                            <span>{m.name}</span>
                            {c ? (
                              <span className="flex items-center gap-2 text-xs">
                                <span className="text-success">
                                  Completed {fmtDate(c.completedAt)}
                                </span>
                                {c.method === "Proof of completion uploaded" &&
                                  c.proofFileUrl && (
                                    <a
                                      href={resolveGrcFileUrl(c.proofFileUrl)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-primary hover:underline flex items-center gap-1"
                                    >
                                      <FileText className="h-3 w-3" />
                                      Proof
                                    </a>
                                  )}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Not completed
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {assignees(t).length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          No board members assigned yet.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {!isLoading && visible.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-2 text-center py-10">
                No trainings yet.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tracker" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                Who has completed what
              </CardTitle>
              <Button size="sm" variant="outline" onClick={exportCsv}>
                <Download className="h-4 w-4 mr-1" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Board member</TableHead>
                    {trainings.map((t) => (
                      <TableHead key={t._id} className="min-w-[140px] text-xs">
                        {t.title}
                      </TableHead>
                    ))}
                    <TableHead>Progress</TableHead>
                    <TableHead>CPD hrs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => {
                    const mine = trainings.filter((t) =>
                      assignees(t).some((a) => a.id === m.id),
                    );
                    const done = mine.filter((t) =>
                      completionFor(t, m.id),
                    ).length;
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="font-medium">{m.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {m.role}
                          </div>
                        </TableCell>
                        {trainings.map((t) => {
                          if (!assignees(t).some((a) => a.id === m.id))
                            return (
                              <TableCell
                                key={t._id}
                                className="text-xs text-muted-foreground"
                              >
                                N/A
                              </TableCell>
                            );
                          const c = completionFor(t, m.id);
                          return (
                            <TableCell key={t._id}>
                              {c ? (
                                <a
                                  href={
                                    c.proofFileUrl
                                      ? resolveGrcFileUrl(c.proofFileUrl)
                                      : undefined
                                  }
                                  target={c.proofFileUrl ? "_blank" : undefined}
                                  rel="noreferrer"
                                  className="inline-block"
                                >
                                  <Badge className="gap-1">
                                    <CheckCircle2 className="h-3 w-3" />{" "}
                                    {fmtDate(c.completedAt)}
                                  </Badge>
                                </a>
                              ) : t.dueDate &&
                                new Date(t.dueDate) < new Date() ? (
                                <Badge variant="destructive">Overdue</Badge>
                              ) : (
                                <Badge variant="outline">Pending</Badge>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-sm">
                          {done}/{mine.length}
                        </TableCell>
                        <TableCell className="font-medium">
                          {cpdEarned(m.id)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {members.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={2 + trainings.length}
                        className="text-center text-muted-foreground py-6"
                      >
                        No board members yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-3">
                Completion is recorded by each director from their own board
                portal. Click a completed status with a proof upload to view the
                certificate/evidence.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onboarding" className="mt-4">
          <p className="text-sm text-muted-foreground mb-3">
            Mandatory modules every new director completes during Board
            Onboarding.
          </p>
          <TrainingModulesTab />
        </TabsContent>
      </Tabs>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setEditingId(null);
            setForm(emptyForm());
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit board training" : "New board training"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v: TrainingCategory) =>
                    setForm({ ...form, category: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAINING_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Format</Label>
                <Select
                  value={form.format}
                  onValueChange={(v: TrainingFormat) =>
                    setForm({ ...form, format: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      ["In-person", "Online", "Self-paced"] as TrainingFormat[]
                    ).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Provider</Label>
                <Input
                  value={form.provider}
                  onChange={(e) =>
                    setForm({ ...form, provider: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>CPD hours</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={form.cpdHours}
                  onChange={(e) =>
                    setForm({ ...form, cpdHours: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Due date (optional)</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm mt-6">
                <Checkbox
                  checked={form.mandatory}
                  onCheckedChange={(v) => setForm({ ...form, mandatory: !!v })}
                />
                Mandatory
              </label>
            </div>
            <div>
              <Label>Training material (optional)</Label>
              {editingId &&
                !form.file &&
                (() => {
                  const current = trainings.find((t) => t._id === editingId);
                  return current?.resourceUrl ? (
                    <p className="text-xs text-muted-foreground mb-1.5">
                      Current:{" "}
                      <a
                        href={resolveGrcFileUrl(current.resourceUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        {current.resourceName || "Training material"}
                      </a>
                      . Choose a file below to replace it.
                    </p>
                  ) : null;
                })()}
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mov,image/*"
                onChange={(e) =>
                  setForm({ ...form, file: e.target.files?.[0] })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                If no material is attached, board members complete this training
                by uploading their own proof of completion instead.
              </p>
            </div>
            <div>
              <Label>Assign to (leave empty for the whole board)</Label>
              <div className="grid grid-cols-2 gap-1 mt-1">
                {members.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.assignedTo.includes(m.id)}
                      onCheckedChange={(v) =>
                        setForm({
                          ...form,
                          assignedTo: v
                            ? [...form.assignedTo, m.id]
                            : form.assignedTo.filter((x) => x !== m.id),
                        })
                      }
                    />
                    {m.name}
                  </label>
                ))}
                {members.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No board members yet.
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={
                !form.title.trim() || createMut.isPending || updateMut.isPending
              }
            >
              {createMut.isPending || updateMut.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : null}
              {editingId ? "Save changes" : "Create training"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
