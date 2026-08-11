import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { Plus, Search, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ClientSelect } from "@/components/ClientDropdown";
import { fetchTeams } from "@/lib/hr/hr-api";
import {
  fetchMandates,
  createMandate,
  MANDATE_STAGES,
  ragClass,
  money,
  type Mandate,
  type FeeStructure,
} from "@/lib/crm/mandates-api";
import { mandateTemplates } from "@/data/crmPmMockData";

import { WorkspaceTab } from "./WorkspaceTab";
import { TasksTab } from "./TasksTab";
import { MilestonesTab } from "./MilestonesTab";
import { PnLTab } from "./PnLTab";
import { ClosureTab } from "./ClosureTab";
import { CollaborationTab } from "./CollaborationTab";
import { CommunicationsTab } from "./CommunicationsTab";
import { NotesTab } from "./NotesTab";
import { DocumentsTab } from "./DocumentsTab";

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
                  <TabsTrigger value="milestones">Milestones</TabsTrigger>
                  <TabsTrigger value="pl">Mandate P&amp;L</TabsTrigger>
                  <TabsTrigger value="closure">Closure</TabsTrigger>
                  <TabsTrigger value="collab">Collaboration</TabsTrigger>
                  <TabsTrigger value="comms">Communications</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                  <TabsTrigger value="docs">Documents</TabsTrigger>
                </TabsList>

                <TabsContent value="workspace" className="pt-4">
                  <WorkspaceTab mandate={selected} />
                </TabsContent>
                <TabsContent value="tasks" className="pt-4">
                  <TasksTab mandateId={selected._id} />
                </TabsContent>
                <TabsContent value="milestones" className="pt-4">
                  <MilestonesTab mandate={selected} />
                </TabsContent>
                <TabsContent value="pl" className="pt-4">
                  <PnLTab mandate={selected} />
                </TabsContent>
                <TabsContent value="closure" className="pt-4">
                  <ClosureTab mandate={selected} />
                </TabsContent>
                <TabsContent value="collab" className="pt-4">
                  <CollaborationTab mandateId={selected._id} />
                </TabsContent>
                <TabsContent value="comms" className="pt-4">
                  <CommunicationsTab mandate={selected} />
                </TabsContent>
                <TabsContent value="notes" className="pt-4">
                  <NotesTab mandate={selected} />
                </TabsContent>
                <TabsContent value="docs" className="pt-4">
                  <DocumentsTab mandate={selected} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
