import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Send,
  Trash2,
  Folder,
  FolderOpen,
  ChevronLeft,
  Upload,
  Inbox,
  FileText,
  MessageSquare,
  StickyNote,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CommentThread } from "@/components/crm/CommentThread";
import { ClientSelect } from "@/components/ClientDropdown";
import { fetchTeams } from "@/lib/hr/hr-api";
import {
  fetchMandates,
  createMandate,
  updateMandate,
  advanceMandateStage,
  clearConflictCheck,
  setClosureItem,
  closeMandate,
  fetchMessages,
  sendMessage,
  fetchNotes,
  addWorkspaceNote,
  deleteWorkspaceNote,
  fetchFolders,
  addFolder,
  fetchDocuments,
  fetchReceivedDocuments,
  uploadDocument,
  fileClientDocument,
  MANDATE_STAGES,
  MANDATE_STAGE_META,
  ragClass,
  money,
  type Mandate,
  type MandateStage,
  type Rag,
  type FeeStructure,
} from "@/lib/crm/mandates-api";
import { mandateTemplates } from "@/data/crmPmMockData";
import { fetchTasks, type Task } from "@/lib/crm/tasks-api";

export default function Mandates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["mandates"],
    queryFn: fetchMandates,
  });
  const { data: teams = [] } = useQuery({
    queryKey: ["hr-teams"],
    queryFn: fetchTeams,
    retry: false,
  });

  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [openNew, setOpenNew] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = list.find((m) => m._id === selectedId) ?? null;

  const [draft, setDraft] = useState({
    name: "",
    clientId: "",
    clientName: "",
    type: "Audit" as Mandate["type"],
    template: mandateTemplates[0].id,
    teamId: "",
    teamName: "",
    budget: 0,
    feeStructure: "Fixed fee" as FeeStructure,
    targetDate: "",
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["mandates"] });
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const filtered = useMemo(
    () =>
      list.filter(
        (m) =>
          (stageFilter === "all" || m.stage === stageFilter) &&
          (m.name.toLowerCase().includes(q.toLowerCase()) ||
            m.clientName.toLowerCase().includes(q.toLowerCase()) ||
            m.ref.toLowerCase().includes(q.toLowerCase())),
      ),
    [list, q, stageFilter],
  );

  const createMut = useMutation({
    mutationFn: () => {
      const tpl = mandateTemplates.find((t) => t.id === draft.template);
      return createMandate({
        name: draft.name,
        clientUserId: draft.clientId,
        clientName: draft.clientName,
        type: draft.type,
        teamId: draft.teamId || undefined,
        teamName: draft.teamName || undefined,
        budget: Number(draft.budget) || 0,
        feeStructure: draft.feeStructure,
        targetDate: draft.targetDate || "2026-12-31",
        templateName: tpl?.name,
        templateTaskCount: tpl?.tasks,
      });
    },
    onSuccess: (m) => {
      invalidate();
      setOpenNew(false);
      const tpl = mandateTemplates.find((t) => t.id === draft.template);
      toast({
        title: "Mandate created",
        description: `${m.ref} · ${tpl?.name} template applied (${tpl?.tasks} tasks, ${tpl?.phases} phases). Conflict check queued.`,
      });
    },
    onError: onErr("Failed to create mandate"),
  });

  const advanceMut = useMutation({
    mutationFn: (id: string) => advanceMandateStage(id),
    onSuccess: (m) => {
      invalidate();
      toast({ title: `Moved to ${m.stage}`, description: m.stageTrigger });
    },
    onError: onErr("Couldn't advance stage"),
  });

  const clearConflictMut = useMutation({
    mutationFn: (id: string) => clearConflictCheck(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Conflict check cleared" });
    },
  });

  const ragMut = useMutation({
    mutationFn: ({ id, rag }: { id: string; rag: Rag }) =>
      updateMandate(id, { rag }),
    onSuccess: invalidate,
  });

  const closureMut = useMutation({
    mutationFn: ({
      mandateId,
      itemId,
      done,
    }: {
      mandateId: string;
      itemId: string;
      done: boolean;
    }) => setClosureItem(mandateId, itemId, done),
    onSuccess: invalidate,
  });

  const closeMut = useMutation({
    mutationFn: (id: string) => closeMandate(id),
    onSuccess: () => {
      invalidate();
      toast({
        title: "Mandate closed",
        description:
          "Documents archived and satisfaction survey sent to the client.",
      });
    },
    onError: onErr("Couldn't close mandate"),
  });

  const totals = {
    budget: list.reduce((s, m) => s + m.budget, 0),
    cost: list.reduce((s, m) => s + m.actualCost, 0),
    billed: list.reduce((s, m) => s + m.billed, 0),
    wip: list.reduce((s, m) => s + m.wip, 0),
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Loading mandates…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mandate Register</h1>
          <p className="text-sm text-muted-foreground">
            Create → Setup → Deliver → Review → Bill → Close
          </p>
        </div>
        <Button onClick={() => setOpenNew(true)}>
          <Plus className="mr-2 h-4 w-4" /> New mandate
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "Total budget", v: money(totals.budget) },
          { l: "Actual cost", v: money(totals.cost) },
          { l: "Billed to date", v: money(totals.billed) },
          { l: "Unbilled WIP", v: money(totals.wip) },
        ].map((k) => (
          <Card key={k.l}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.l}</p>
              <p className="mt-1 text-xl font-bold">{k.v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search mandates, clients, refs…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages</SelectItem>
                {MANDATE_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Mandate</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>RAG</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead className="w-32">Progress</TableHead>
                <TableHead className="text-right">Budget / Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow
                  key={m._id}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(m._id)}
                >
                  <TableCell className="font-mono text-xs">{m.ref}</TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.clientName}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">{m.type}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{m.stage}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={ragClass[m.rag]}>{m.rag}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{m.manager || "—"}</TableCell>
                  <TableCell>
                    <Progress value={m.progress} className="h-2" />
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {money(m.budget, m.currency)}
                    <span className="block text-xs text-muted-foreground">
                      {money(m.actualCost, m.currency)} spent
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No mandates match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create mandate */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create mandate</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Mandate name</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Client</Label>
              <ClientSelect
                value={draft.clientId}
                onValueChange={(v) => setDraft({ ...draft, clientId: v })}
                onClientChange={(c) =>
                  setDraft((d) => ({
                    ...d,
                    clientName:
                      [c.firstName, c.lastName].filter(Boolean).join(" ") ||
                      c.businessName ||
                      c.email,
                  }))
                }
                placeholder="Select client..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={draft.type}
                  onValueChange={(v) =>
                    setDraft({ ...draft, type: v as Mandate["type"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Audit",
                      "Advisory",
                      "Transaction",
                      "Compliance",
                      "Onboarding",
                      "Litigation",
                    ].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Template</Label>
                <Select
                  value={draft.template}
                  onValueChange={(v) => setDraft({ ...draft, template: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mandateTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Team</Label>
                {teams.length > 0 ? (
                  <Select
                    value={draft.teamId}
                    onValueChange={(v) => {
                      const t = teams.find((x) => x._id === v);
                      setDraft({
                        ...draft,
                        teamId: v,
                        teamName: t?.name ?? "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team..." />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((t) => (
                        <SelectItem key={t._id} value={t._id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Team name"
                    value={draft.teamName}
                    onChange={(e) =>
                      setDraft({ ...draft, teamName: e.target.value })
                    }
                  />
                )}
              </div>
              <div>
                <Label>Fee structure</Label>
                <Select
                  value={draft.feeStructure}
                  onValueChange={(v) =>
                    setDraft({ ...draft, feeStructure: v as FeeStructure })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Fixed fee",
                      "Time & materials",
                      "Retainer",
                      "Capped fee",
                    ].map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Budget (USD)</Label>
                <Input
                  type="number"
                  value={draft.budget}
                  onChange={(e) =>
                    setDraft({ ...draft, budget: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Target date</Label>
                <Input
                  type="date"
                  value={draft.targetDate}
                  onChange={(e) =>
                    setDraft({ ...draft, targetDate: e.target.value })
                  }
                />
              </div>
            </div>
            <p className="rounded bg-muted p-2 text-xs text-muted-foreground">
              On create: template applied, conflict check run, team notified and
              client informed via the portal.
            </p>
          </div>
          <DialogFooter>
            <Button
              disabled={createMut.isPending || !draft.name || !draft.clientId}
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? "Creating…" : "Create mandate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mandate workspace */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {selected.ref} · {selected.clientName} ·{" "}
                  {selected.feeStructure}
                </p>
              </SheetHeader>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {MANDATE_STAGES.map((s, i) => {
                  const cur = MANDATE_STAGES.indexOf(selected.stage);
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <Badge
                        variant={i <= cur ? "default" : "outline"}
                        className="text-xs"
                      >
                        {i + 1}. {s}
                      </Badge>
                      {i < MANDATE_STAGES.length - 1 && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  );
                })}
              </div>

              <Tabs defaultValue="workspace" className="mt-4">
                <TabsList className="flex-wrap">
                  <TabsTrigger value="workspace">Workspace</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                  <TabsTrigger value="pl">Mandate P&amp;L</TabsTrigger>
                  <TabsTrigger value="closure">Closure</TabsTrigger>
                  <TabsTrigger value="collab">Collaboration</TabsTrigger>
                  <TabsTrigger value="comms">Communications</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                  <TabsTrigger value="docs">Documents</TabsTrigger>
                </TabsList>

                <TabsContent value="workspace" className="space-y-4 pt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        Current stage — {selected.stage} (owner:{" "}
                        {MANDATE_STAGE_META[selected.stage].owner})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {MANDATE_STAGE_META[selected.stage].trigger}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={
                            advanceMut.isPending || selected.stage === "Close"
                          }
                          onClick={() => advanceMut.mutate(selected._id)}
                        >
                          Advance stage
                        </Button>
                        {selected.conflictCheck !== "Cleared" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={clearConflictMut.isPending}
                            onClick={() =>
                              clearConflictMut.mutate(selected._id)
                            }
                          >
                            <ShieldCheck className="mr-2 h-4 w-4" /> Clear
                            conflict check
                          </Button>
                        )}
                        <Select
                          value={selected.rag}
                          onValueChange={(v) =>
                            ragMut.mutate({ id: selected._id, rag: v as Rag })
                          }
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(["Green", "Amber", "Red"] as Rag[]).map((r) => (
                              <SelectItem key={r} value={r}>
                                RAG: {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Card>
                      <CardContent className="space-y-1 p-4 text-sm">
                        <p className="text-xs text-muted-foreground">Team</p>
                        {selected.teamName && (
                          <p className="text-xs text-muted-foreground">
                            Team: {selected.teamName}
                          </p>
                        )}
                        {selected.manager && (
                          <p>{selected.manager} (manager)</p>
                        )}
                        {selected.team.map((t) => (
                          <p key={t}>{t}</p>
                        ))}
                        {!selected.team.length && !selected.manager && (
                          <p className="text-muted-foreground">
                            No team assigned yet
                          </p>
                        )}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="space-y-1 p-4 text-sm">
                        <p className="text-xs text-muted-foreground">Dates</p>
                        <p>Start: {selected.startDate?.slice(0, 10)}</p>
                        <p>Target: {selected.targetDate?.slice(0, 10)}</p>
                        <p>
                          Conflict check:{" "}
                          <Badge variant="outline">
                            {selected.conflictCheck}
                          </Badge>
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <MandateActivity mandate={selected} />
                </TabsContent>

                <TabsContent value="tasks" className="pt-4 space-y-2">
                  <MandateTasks mandateId={selected._id} />
                </TabsContent>

                <TabsContent value="pl" className="space-y-3 pt-4">
                  {(() => {
                    const margin =
                      selected.billed + selected.wip - selected.actualCost;
                    const marginPct =
                      selected.billed + selected.wip
                        ? Math.round(
                            (margin / (selected.billed + selected.wip)) * 100,
                          )
                        : 0;
                    return (
                      <Table>
                        <TableBody>
                          {[
                            [
                              "Budget",
                              money(selected.budget, selected.currency),
                            ],
                            [
                              "Billed to date",
                              money(selected.billed, selected.currency),
                            ],
                            [
                              "Unbilled WIP",
                              money(selected.wip, selected.currency),
                            ],
                            [
                              "Actual cost",
                              money(selected.actualCost, selected.currency),
                            ],
                            [
                              "Margin",
                              `${money(margin, selected.currency)} (${marginPct}%)`,
                            ],
                            [
                              "Budget variance",
                              money(
                                selected.budget - selected.actualCost,
                                selected.currency,
                              ),
                            ],
                          ].map(([l, v]) => (
                            <TableRow key={l}>
                              <TableCell className="text-sm text-muted-foreground">
                                {l}
                              </TableCell>
                              <TableCell className="text-right text-sm font-medium">
                                {v}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    );
                  })()}
                </TabsContent>

                <TabsContent value="closure" className="space-y-3 pt-4">
                  <p className="text-sm text-muted-foreground">
                    All items must be complete before the mandate can be closed.
                  </p>
                  {selected.closureChecklist.map((c) => (
                    <label
                      key={c._id}
                      className="flex items-center gap-3 rounded border p-3 text-sm"
                    >
                      <Checkbox
                        checked={c.done}
                        onCheckedChange={(v) =>
                          closureMut.mutate({
                            mandateId: selected._id,
                            itemId: c._id,
                            done: !!v,
                          })
                        }
                      />
                      {c.label}
                    </label>
                  ))}
                  <Button
                    disabled={
                      !selected.closureChecklist.every((c) => c.done) ||
                      closeMut.isPending
                    }
                    onClick={() => closeMut.mutate(selected._id)}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Close mandate
                  </Button>
                </TabsContent>

                <TabsContent value="collab" className="pt-4">
                  <p className="text-xs text-muted-foreground mb-3">
                    Comment threads aren't wired to a real backend yet — coming
                    with a later pass.
                  </p>
                  <CommentThread subject={selected._id} />
                </TabsContent>

                <TabsContent value="comms" className="pt-4">
                  <MandateComms mandate={selected} />
                </TabsContent>

                <TabsContent value="notes" className="pt-4">
                  <MandateNotes mandate={selected} />
                </TabsContent>

                <TabsContent value="docs" className="pt-4">
                  <MandateDocuments mandate={selected} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── Activity (derived from real messages + notes) ────────────

function MandateActivity({ mandate }: { mandate: Mandate }) {
  const { data: messages = [] } = useQuery({
    queryKey: ["mandateMessages", mandate._id],
    queryFn: () => fetchMessages(mandate._id),
  });
  const { data: notes = [] } = useQuery({
    queryKey: ["mandateNotes", mandate._id],
    queryFn: () => fetchNotes(mandate._id),
  });

  const entries = [
    ...messages.map((m) => ({
      at: m.createdAt,
      icon: MessageSquare,
      text:
        m.direction === "tenant"
          ? `${m.author} messaged the client`
          : `${m.author} sent a message`,
    })),
    ...notes.map((n) => ({
      at: n.createdAt,
      icon: StickyNote,
      text: `${n.author} added a note`,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Activity log</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.map((e, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <e.icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{e.text}</span>
            <span className="text-xs text-muted-foreground">
              · {new Date(e.at).toLocaleString()}
            </span>
          </div>
        ))}
        {!entries.length && (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Tasks (real, filtered to this mandate) ───────────────────

function MandateTasks({ mandateId }: { mandateId: string }) {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", { mandateId }],
    queryFn: () => fetchTasks({ mandateId }),
  });

  if (isLoading)
    return <p className="text-sm text-muted-foreground py-6">Loading tasks…</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          <TableHead>Assignee</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Due</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((t: Task) => (
          <TableRow key={t._id}>
            <TableCell className="text-sm">{t.title}</TableCell>
            <TableCell className="text-sm">{t.assignee}</TableCell>
            <TableCell>
              <Badge variant="outline">{t.status}</Badge>
            </TableCell>
            <TableCell className="text-sm">{t.dueDate?.slice(0, 10)}</TableCell>
          </TableRow>
        ))}
        {!tasks.length && (
          <TableRow>
            <TableCell
              colSpan={4}
              className="text-center text-sm text-muted-foreground py-6"
            >
              No tasks yet — add one from the Tasks page.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

// ── Communications ──────────────────────────────────────────

function MandateComms({ mandate }: { mandate: Mandate }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: messages = [] } = useQuery({
    queryKey: ["mandateMessages", mandate._id],
    queryFn: () => fetchMessages(mandate._id),
  });
  const [text, setText] = useState("");

  const sendMut = useMutation({
    mutationFn: () => sendMessage(mandate._id, "You", text.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["mandateMessages", mandate._id],
      });
      setText("");
      toast({
        title: "Message sent",
        description: `Sent to ${mandate.clientName}`,
      });
    },
  });

  return (
    <div className="space-y-3">
      <div className="max-h-96 space-y-3 overflow-y-auto rounded border p-3">
        {!messages.length && (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        )}
        {messages.map((m) => (
          <div
            key={m._id}
            className={`flex gap-2 ${m.direction === "tenant" ? "flex-row-reverse" : ""}`}
          >
            <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-muted text-xs font-medium">
              {m.author
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div
              className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${m.direction === "tenant" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              <p className="mb-0.5 text-[11px] font-medium opacity-80">
                {m.author}
              </p>
              <p>{m.body}</p>
              <p className="mt-1 text-[10px] opacity-70">
                {new Date(m.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Textarea
          placeholder={`Message ${mandate.clientName}…`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[60px]"
        />
        <Button
          disabled={sendMut.isPending || !text.trim()}
          onClick={() => sendMut.mutate()}
          className="self-end"
        >
          <Send className="mr-2 h-4 w-4" /> Send
        </Button>
      </div>
    </div>
  );
}

// ── Notes ───────────────────────────────────────────────────

function MandateNotes({ mandate }: { mandate: Mandate }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: notes = [] } = useQuery({
    queryKey: ["mandateNotes", mandate._id],
    queryFn: () => fetchNotes(mandate._id),
  });
  const [text, setText] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["mandateNotes", mandate._id] });

  const addMut = useMutation({
    mutationFn: () => addWorkspaceNote(mandate._id, "You", text.trim()),
    onSuccess: () => {
      invalidate();
      setText("");
      toast({ title: "Note added" });
    },
  });
  const deleteMut = useMutation({
    mutationFn: (noteId: string) => deleteWorkspaceNote(mandate._id, noteId),
    onSuccess: () => {
      invalidate();
      toast({ title: "Note deleted" });
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Textarea
          placeholder="Add an internal note…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[60px]"
        />
        <Button
          disabled={addMut.isPending || !text.trim()}
          onClick={() => addMut.mutate()}
          className="self-end"
        >
          Add note
        </Button>
      </div>
      <div className="space-y-2">
        {!notes.length && (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        )}
        {notes.map((n) => (
          <Card key={n._id}>
            <CardContent className="flex items-start justify-between gap-3 p-3">
              <div>
                <p className="text-sm">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {n.author} · {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteMut.mutate(n._id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Documents ───────────────────────────────────────────────

function MandateDocuments({ mandate }: { mandate: Mandate }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [folder, setFolder] = useState<string | null>(null);
  const [openNewFolder, setOpenNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [openUpload, setOpenUpload] = useState(false);
  const [uploadFolder, setUploadFolder] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const { data: folders = [] } = useQuery({
    queryKey: ["mandateFolders", mandate._id],
    queryFn: () => fetchFolders(mandate._id),
  });
  const { data: received = [] } = useQuery({
    queryKey: ["mandateReceived", mandate._id],
    queryFn: () => fetchReceivedDocuments(mandate._id),
  });
  const { data: filesInFolder = [] } = useQuery({
    queryKey: ["mandateDocuments", mandate._id, folder],
    queryFn: () => fetchDocuments(mandate._id, folder ?? undefined),
    enabled: !!folder,
  });
  const { data: allDocs = [] } = useQuery({
    queryKey: ["mandateDocuments", mandate._id, "all"],
    queryFn: () => fetchDocuments(mandate._id),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({
      queryKey: ["mandateFolders", mandate._id],
    });
    queryClient.invalidateQueries({
      queryKey: ["mandateReceived", mandate._id],
    });
    queryClient.invalidateQueries({
      queryKey: ["mandateDocuments", mandate._id],
    });
  };

  const folderMut = useMutation({
    mutationFn: () => addFolder(mandate._id, newFolderName.trim()),
    onSuccess: () => {
      invalidateAll();
      setNewFolderName("");
      setOpenNewFolder(false);
      toast({ title: "Folder created" });
    },
  });
  const uploadMut = useMutation({
    mutationFn: () =>
      uploadDocument(mandate._id, uploadFolder, uploadFile as File),
    onSuccess: () => {
      invalidateAll();
      setUploadFile(null);
      setUploadFolder("");
      setOpenUpload(false);
      toast({ title: "Document uploaded" });
    },
    onError: (err: any) =>
      toast({
        title: "Upload failed",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });
  const fileMut = useMutation({
    mutationFn: (docId: string) =>
      fileClientDocument(mandate._id, docId, "Client submissions"),
    onSuccess: (doc) => {
      invalidateAll();
      toast({
        title: "Filed",
        description: `${doc.name} filed into Client submissions.`,
      });
    },
  });

  const countIn = (f: string) => allDocs.filter((d) => d.folder === f).length;

  if (folder) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => setFolder(null)}>
          <ChevronLeft className="mr-1 h-4 w-4" /> All folders
        </Button>
        <p className="text-sm font-medium">{folder}</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded by</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filesInFolder.map((d) => (
              <TableRow key={d._id}>
                <TableCell className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={d.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {d.name}
                  </a>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {(d.size / 1024).toFixed(0)} KB
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {d.uploadedBy}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {d.createdAt?.slice(0, 10)}
                </TableCell>
              </TableRow>
            ))}
            {!filesInFolder.length && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-sm text-muted-foreground"
                >
                  No documents in this folder yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setOpenNewFolder(true)}
        >
          <Folder className="mr-2 h-4 w-4" /> New folder
        </Button>
        <Button size="sm" onClick={() => setOpenUpload(true)}>
          <Upload className="mr-2 h-4 w-4" /> Upload document
        </Button>
      </div>

      {received.length > 0 && (
        <Card className="border-primary/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Inbox className="h-4 w-4" /> Received from client
              <Badge className="bg-primary/10 text-primary">
                {received.length} pending
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {received.map((d) => (
              <div
                key={d._id}
                className="flex items-center justify-between rounded border p-2 text-sm"
              >
                <div>
                  <p className="font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.uploadedBy} · {d.createdAt?.slice(0, 10)} ·{" "}
                    {(d.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={fileMut.isPending}
                  onClick={() => fileMut.mutate(d._id)}
                >
                  Accept &amp; file
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {folders.map((f) => (
          <Card
            key={f}
            className="cursor-pointer transition hover:shadow-md"
            onClick={() => setFolder(f)}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <FolderOpen className="h-6 w-6 text-primary" />
              <div>
                <p className="text-sm font-medium">{f}</p>
                <p className="text-xs text-muted-foreground">
                  {countIn(f)} document{countIn(f) === 1 ? "" : "s"}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={openNewFolder} onOpenChange={setOpenNewFolder}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
          <DialogFooter>
            <Button
              disabled={folderMut.isPending || !newFolderName.trim()}
              onClick={() => folderMut.mutate()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openUpload} onOpenChange={setOpenUpload}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Upload document</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>File</Label>
              <Input
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div>
              <Label>Folder</Label>
              <Select value={uploadFolder} onValueChange={setUploadFolder}>
                <SelectTrigger>
                  <SelectValue placeholder="Select folder..." />
                </SelectTrigger>
                <SelectContent>
                  {folders.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={uploadMut.isPending || !uploadFile || !uploadFolder}
              onClick={() => uploadMut.mutate()}
            >
              {uploadMut.isPending ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
