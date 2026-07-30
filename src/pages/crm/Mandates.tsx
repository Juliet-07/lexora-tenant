import { useMemo, useState } from "react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Search, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CommentThread, ActivityLog } from "@/components/crm/CommentThread";
import {
  mandates as seedMandates,
  mandateTemplates,
  MANDATE_STAGES,
  MANDATE_STAGE_META,
  Mandate,
  MandateStage,
  Rag,
  ragClass,
  money,
  pmTasks,
  wipEntries,
  activityStream,
  teamDirectory,
} from "@/data/crmPmMockData";

export default function Mandates() {
  const [list, setList] = useState<Mandate[]>(seedMandates);
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [openNew, setOpenNew] = useState(false);
  const [selected, setSelected] = useState<Mandate | null>(null);
  const { toast } = useToast();

  const [draft, setDraft] = useState({
    name: "",
    clientName: "",
    type: "Audit",
    template: mandateTemplates[0].id,
    manager: "Sarah Chen",
    budget: 0,
    feeStructure: "Fixed fee" as Mandate["feeStructure"],
    targetDate: "",
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

  const update = (id: string, patch: Partial<Mandate>) => {
    setList((p) => p.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    setSelected((s) => (s && s.id === id ? { ...s, ...patch } : s));
  };

  const create = () => {
    if (!draft.name || !draft.clientName) return;
    const tpl = mandateTemplates.find((t) => t.id === draft.template);
    const m: Mandate = {
      id: `MND-${String(list.length + 1).padStart(3, "0")}`,
      ref: `M-2026-${String(list.length + 1).padStart(3, "0")}`,
      name: draft.name,
      clientName: draft.clientName,
      type: draft.type,
      stage: "Create",
      rag: "Green",
      manager: draft.manager,
      team: [],
      startDate: new Date().toISOString().slice(0, 10),
      targetDate: draft.targetDate || "2026-12-31",
      budget: Number(draft.budget) || 0,
      actualCost: 0,
      billed: 0,
      wip: 0,
      feeStructure: draft.feeStructure,
      progress: 0,
      conflictCheck: "Pending",
      currency: "USD",
      closureChecklist: seedMandates[0].closureChecklist.map((c) => ({
        ...c,
        done: false,
      })),
    };
    setList([m, ...list]);
    setOpenNew(false);
    toast({
      title: "Mandate created",
      description: `${m.ref} · ${tpl?.name} template applied (${tpl?.tasks} tasks, ${tpl?.phases} phases). Conflict check queued.`,
    });
  };

  const advance = (m: Mandate) => {
    const idx = MANDATE_STAGES.indexOf(m.stage);
    if (idx === MANDATE_STAGES.length - 1) return;
    const next = MANDATE_STAGES[idx + 1];
    if (next === "Setup" && m.conflictCheck !== "Cleared") {
      toast({
        title: "Blocked — conflict check",
        description: "Clear the conflict check before moving to Setup.",
        variant: "destructive",
      });
      return;
    }
    update(m.id, { stage: next });
    toast({
      title: `Moved to ${next}`,
      description: MANDATE_STAGE_META[next].trigger,
    });
  };

  const totals = {
    budget: list.reduce((s, m) => s + m.budget, 0),
    cost: list.reduce((s, m) => s + m.actualCost, 0),
    billed: list.reduce((s, m) => s + m.billed, 0),
    wip: list.reduce((s, m) => s + m.wip, 0),
  };

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
                  key={m.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(m)}
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
                  <TableCell className="text-sm">{m.manager}</TableCell>
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
              <Input
                value={draft.clientName}
                onChange={(e) =>
                  setDraft({ ...draft, clientName: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={draft.type}
                  onValueChange={(v) => setDraft({ ...draft, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Audit", "Advisory", "Transaction", "Compliance", "Onboarding", "Litigation"].map(
                      (t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ),
                    )}
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
                <Label>Manager</Label>
                <Select
                  value={draft.manager}
                  onValueChange={(v) => setDraft({ ...draft, manager: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teamDirectory
                      .filter((t) => t.mandates > 0)
                      .map((t) => (
                        <SelectItem key={t.name} value={t.name}>
                          {t.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fee structure</Label>
                <Select
                  value={draft.feeStructure}
                  onValueChange={(v) =>
                    setDraft({ ...draft, feeStructure: v as Mandate["feeStructure"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Fixed fee", "Time & materials", "Retainer", "Capped fee"].map(
                      (f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ),
                    )}
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
            <Button onClick={create}>Create mandate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mandate workspace */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {selected.ref} · {selected.clientName} · {selected.feeStructure}
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
                        <Button size="sm" onClick={() => advance(selected)}>
                          Advance stage
                        </Button>
                        {selected.conflictCheck !== "Cleared" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              update(selected.id, { conflictCheck: "Cleared" });
                              toast({ title: "Conflict check cleared" });
                            }}
                          >
                            <ShieldCheck className="mr-2 h-4 w-4" /> Clear
                            conflict check
                          </Button>
                        )}
                        <Select
                          value={selected.rag}
                          onValueChange={(v) =>
                            update(selected.id, { rag: v as Rag })
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
                        <p>{selected.manager} (manager)</p>
                        {selected.team.map((t) => (
                          <p key={t}>{t}</p>
                        ))}
                        {!selected.team.length && (
                          <p className="text-muted-foreground">
                            No team assigned yet
                          </p>
                        )}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="space-y-1 p-4 text-sm">
                        <p className="text-xs text-muted-foreground">Dates</p>
                        <p>Start: {selected.startDate}</p>
                        <p>Target: {selected.targetDate}</p>
                        <p>
                          Conflict check:{" "}
                          <Badge variant="outline">
                            {selected.conflictCheck}
                          </Badge>
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Activity log</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ActivityLog entries={activityStream.slice(0, 5)} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="tasks" className="pt-4">
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
                      {pmTasks
                        .filter((t) => t.mandateId === selected.id)
                        .map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="text-sm">{t.title}</TableCell>
                            <TableCell className="text-sm">
                              {t.assignee}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{t.status}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {t.dueDate}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="pl" className="space-y-3 pt-4">
                  {(() => {
                    const wip =
                      wipEntries.find((w) => w.mandateId === selected.id)
                        ?.value ?? selected.wip;
                    const margin =
                      selected.billed + wip - selected.actualCost;
                    const marginPct = selected.billed + wip
                      ? Math.round((margin / (selected.billed + wip)) * 100)
                      : 0;
                    return (
                      <Table>
                        <TableBody>
                          {[
                            ["Budget", money(selected.budget, selected.currency)],
                            ["Billed to date", money(selected.billed, selected.currency)],
                            ["Unbilled WIP", money(wip, selected.currency)],
                            ["Actual cost", money(selected.actualCost, selected.currency)],
                            ["Margin", `${money(margin, selected.currency)} (${marginPct}%)`],
                            [
                              "Budget variance",
                              money(selected.budget - selected.actualCost, selected.currency),
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
                  {selected.closureChecklist.map((c, i) => (
                    <label
                      key={c.label}
                      className="flex items-center gap-3 rounded border p-3 text-sm"
                    >
                      <Checkbox
                        checked={c.done}
                        onCheckedChange={(v) => {
                          const next = selected.closureChecklist.map((x, j) =>
                            j === i ? { ...x, done: !!v } : x,
                          );
                          update(selected.id, { closureChecklist: next });
                        }}
                      />
                      {c.label}
                    </label>
                  ))}
                  <Button
                    disabled={!selected.closureChecklist.every((c) => c.done)}
                    onClick={() => {
                      update(selected.id, { stage: "Close", progress: 100 });
                      toast({
                        title: "Mandate closed",
                        description:
                          "Documents archived and satisfaction survey sent to the client.",
                      });
                    }}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Close mandate
                  </Button>
                </TabsContent>

                <TabsContent value="collab" className="pt-4">
                  <CommentThread subject={selected.id} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
