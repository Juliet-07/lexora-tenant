import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CommentThread, ActivityLog } from "@/components/crm/CommentThread";
import { ClientSelect } from "@/components/ClientDropdown";
import { fetchTeams } from "@/lib/hr/hr-api";
import {
  useMessages,
  useNotes,
  addMessage,
  addNote,
  deleteNote,
  useDocuments,
  getAllFolders,
  addFolder,
  addDocument,
  fileClientDocument,
  getReceivedFromClient,
} from "@/lib/crm/mandateWorkspaceStore";
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
    clientId: "",
    clientName: "",
    type: "Audit",
    template: mandateTemplates[0].id,
    manager: "Sarah Chen",
    teamId: "",
    teamName: "",
    budget: 0,
    feeStructure: "Fixed fee" as Mandate["feeStructure"],
    targetDate: "",
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["hr-teams"],
    queryFn: fetchTeams,
    retry: false,
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
      teamId: draft.teamId || undefined,
      teamName: draft.teamName || undefined,
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
                <Label>Team</Label>
                {teams.length > 0 ? (
                  <Select
                    value={draft.teamId}
                    onValueChange={(v) => {
                      const t = teams.find((x) => x._id === v);
                      setDraft({ ...draft, teamId: v, teamName: t?.name ?? "" });
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
                        {selected.teamName && (
                          <p className="text-xs text-muted-foreground">
                            Team: {selected.teamName}
                          </p>
                        )}
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

// ── Communications ──────────────────────────────────────────

function MandateComms({ mandate }: { mandate: Mandate }) {
  const messages = useMessages(mandate.id);
  const [text, setText] = useState("");
  const { toast } = useToast();

  const send = () => {
    if (!text.trim()) return;
    addMessage(mandate.id, "tenant", "You", text.trim());
    setText("");
    toast({ title: "Message sent", description: `Sent to ${mandate.clientName}` });
  };

  return (
    <div className="space-y-3">
      <div className="max-h-96 space-y-3 overflow-y-auto rounded border p-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
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
              className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                m.direction === "tenant"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <p className="mb-0.5 text-[11px] font-medium opacity-80">
                {m.author}
              </p>
              <p>{m.body}</p>
              <p className="mt-1 text-[10px] opacity-70">
                {new Date(m.at).toLocaleString()}
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
        <Button onClick={send} className="self-end">
          <Send className="mr-2 h-4 w-4" /> Send
        </Button>
      </div>
    </div>
  );
}

// ── Notes ───────────────────────────────────────────────────

function MandateNotes({ mandate }: { mandate: Mandate }) {
  const notes = useNotes(mandate.id);
  const [text, setText] = useState("");
  const { toast } = useToast();

  const add = () => {
    if (!text.trim()) return;
    addNote(mandate.id, "You", text.trim());
    setText("");
    toast({ title: "Note added" });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Textarea
          placeholder="Add an internal note…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[60px]"
        />
        <Button onClick={add} className="self-end">
          Add note
        </Button>
      </div>
      <div className="space-y-2">
        {notes.length === 0 && (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        )}
        {notes.map((n) => (
          <Card key={n.id}>
            <CardContent className="flex items-start justify-between gap-3 p-3">
              <div>
                <p className="text-sm">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {n.author} · {new Date(n.at).toLocaleString()}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  deleteNote(n.id);
                  toast({ title: "Note deleted" });
                }}
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
  const allDocs = useDocuments(mandate.id);
  const [folder, setFolder] = useState<string | null>(null);
  const [openNewFolder, setOpenNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [openUpload, setOpenUpload] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadFolder, setUploadFolder] = useState("");
  const { toast } = useToast();

  const folders = getAllFolders(mandate.id);
  const received = getReceivedFromClient(mandate.id);

  const filesIn = (f: string) => allDocs.filter((d) => d.folder === f && !(d.fromClient && d.status === "pending"));

  if (folder) {
    const files = filesIn(folder);
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
            {files.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" /> {d.name}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{d.size}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{d.uploadedBy}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{d.at}</TableCell>
              </TableRow>
            ))}
            {files.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
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
        <Button size="sm" variant="outline" onClick={() => setOpenNewFolder(true)}>
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
              <Badge className="bg-primary/10 text-primary">{received.length} pending</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {received.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded border p-2 text-sm"
              >
                <div>
                  <p className="font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.uploadedBy} · {d.at} · {d.size}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    fileClientDocument(d.id, "Client submissions");
                    toast({ title: "Filed", description: `${d.name} filed into Client submissions.` });
                  }}
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
                  {filesIn(f).length} document{filesIn(f).length === 1 ? "" : "s"}
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
              onClick={() => {
                if (!newFolderName.trim()) return;
                addFolder(mandate.id, newFolderName.trim());
                setNewFolderName("");
                setOpenNewFolder(false);
                toast({ title: "Folder created" });
              }}
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
              <Label>File name</Label>
              <Input
                placeholder="e.g. Signed_Engagement_Letter.pdf"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
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
              onClick={() => {
                if (!uploadName.trim() || !uploadFolder) return;
                addDocument({
                  mandateId: mandate.id,
                  folder: uploadFolder,
                  name: uploadName.trim(),
                  size: "—",
                  uploadedBy: "You",
                });
                setUploadName("");
                setUploadFolder("");
                setOpenUpload(false);
                toast({ title: "Document uploaded (mock)" });
              }}
            >
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
