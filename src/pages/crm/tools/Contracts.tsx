import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { FileSignature, Bell, RefreshCw, ArrowRight, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CommentThread } from "@/components/crm/CommentThread";
import { fetchMandates } from "@/lib/crm/mandates-api";
import {
  fetchContracts,
  fetchExpiringContracts,
  fetchObligationsDue,
  createContract,
  advanceContractStage,
  executeContract,
  initiateRenewal,
  toggleAutoRenew,
  addNegotiationRound,
  addAmendment,
  addObligation,
  setObligationDone,
  CONTRACT_STAGES,
  type Contract,
  type ContractType,
  type ContractStage,
  type ObligationType,
} from "@/lib/crm/tools-api";

const money = (n: number, c = "USD") =>
  (n ?? 0).toLocaleString(undefined, {
    style: "currency",
    currency: c,
    maximumFractionDigits: 0,
  });
const today = () => new Date().toISOString().slice(0, 10);
const daysTo = (d: string) =>
  Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

const CONTRACT_TYPES: ContractType[] = [
  "MSA",
  "SOW",
  "NDA",
  "Lease",
  "Supplier",
];
const OBLIGATION_TYPES: ObligationType[] = [
  "Deliverable",
  "Notice period",
  "Payment",
  "Covenant",
];

export default function Contracts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const [stageFilter, setStageFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: list = [] } = useQuery({
    queryKey: ["contracts"],
    queryFn: fetchContracts,
  });
  const { data: expiring = [] } = useQuery({
    queryKey: ["contracts-expiring"],
    queryFn: () => fetchExpiringContracts(90),
  });
  const { data: obligationsDue = [] } = useQuery({
    queryKey: ["obligations-due"],
    queryFn: () => fetchObligationsDue(90),
  });
  const { data: mandates = [] } = useQuery({
    queryKey: ["mandates"],
    queryFn: fetchMandates,
  });

  const selected = list.find((c) => c._id === selectedId) ?? null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["contracts"] });
    queryClient.invalidateQueries({ queryKey: ["contracts-expiring"] });
    queryClient.invalidateQueries({ queryKey: ["obligations-due"] });
  };

  const filtered = list.filter(
    (c) => stageFilter === "all" || c.stage === stageFilter,
  );

  // ── New contract ─────────────────────────────────────────
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({
    title: "",
    counterparty: "",
    type: "MSA" as ContractType,
    value: 0,
    currency: "USD",
    expiresOn: today(),
    owner: "",
    mandateId: "",
    mandateName: "",
  });
  const createMut = useMutation({
    mutationFn: () =>
      createContract({ ...form, mandateId: form.mandateId || undefined }),
    onSuccess: (c) => {
      invalidate();
      setOpenNew(false);
      setForm({
        title: "",
        counterparty: "",
        type: "MSA",
        value: 0,
        currency: "USD",
        expiresOn: today(),
        owner: "",
        mandateId: "",
        mandateName: "",
      });
      setSelectedId(c._id);
      toast({ title: "Contract created" });
    },
    onError: onErr("Failed to create contract"),
  });

  // ── Lifecycle actions ────────────────────────────────────
  const advanceMut = useMutation({
    mutationFn: (id: string) => advanceContractStage(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Stage advanced" });
    },
    onError: onErr("Failed to advance stage"),
  });
  const [executeTarget, setExecuteTarget] = useState<string | null>(null);
  const [executeForm, setExecuteForm] = useState({
    executedOn: today(),
    effectiveOn: today(),
  });
  const executeMut = useMutation({
    mutationFn: () => executeContract(executeTarget!, executeForm),
    onSuccess: () => {
      invalidate();
      setExecuteTarget(null);
      toast({
        title: "Executed",
        description: "Signature captured — contract is now Active.",
      });
    },
    onError: onErr("Failed to execute contract"),
  });
  const renewalMut = useMutation({
    mutationFn: (id: string) => initiateRenewal(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Renewal initiated" });
    },
    onError: onErr("Failed to initiate renewal"),
  });
  const autoRenewMut = useMutation({
    mutationFn: (id: string) => toggleAutoRenew(id),
    onSuccess: () => invalidate(),
    onError: onErr("Failed to toggle auto-renew"),
  });

  // ── Negotiation round ────────────────────────────────────
  const [openRound, setOpenRound] = useState(false);
  const [roundForm, setRoundForm] = useState({
    by: "Lexora",
    at: today(),
    summary: "",
  });
  const addRoundMut = useMutation({
    mutationFn: (id: string) => addNegotiationRound(id, roundForm),
    onSuccess: () => {
      invalidate();
      setOpenRound(false);
      setRoundForm({ by: "Lexora", at: today(), summary: "" });
      toast({ title: "Negotiation round added" });
    },
    onError: onErr("Failed to add round"),
  });

  // ── Amendment ─────────────────────────────────────────────
  const [openAmendment, setOpenAmendment] = useState(false);
  const [amendmentSummary, setAmendmentSummary] = useState("");
  const addAmendmentMut = useMutation({
    mutationFn: (id: string) => addAmendment(id, { summary: amendmentSummary }),
    onSuccess: () => {
      invalidate();
      setOpenAmendment(false);
      setAmendmentSummary("");
      toast({ title: "Amendment added" });
    },
    onError: onErr("Failed to add amendment"),
  });

  // ── Obligations ───────────────────────────────────────────
  const [openObligation, setOpenObligation] = useState(false);
  const [obligationForm, setObligationForm] = useState({
    label: "",
    due: today(),
    type: "Deliverable" as ObligationType,
    leadDays: 14,
  });
  const addObligationMut = useMutation({
    mutationFn: (id: string) => addObligation(id, obligationForm),
    onSuccess: () => {
      invalidate();
      setOpenObligation(false);
      setObligationForm({
        label: "",
        due: today(),
        type: "Deliverable",
        leadDays: 14,
      });
      toast({ title: "Obligation added" });
    },
    onError: onErr("Failed to add obligation"),
  });
  const setDoneMut = useMutation({
    mutationFn: (vars: { id: string; obligationId: string; done: boolean }) =>
      setObligationDone(vars.id, vars.obligationId, vars.done),
    onSuccess: () => invalidate(),
    onError: onErr("Failed to update obligation"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Contract Management</h1>
          <p className="text-sm text-muted-foreground">
            Draft → review → negotiation → execution → active → renewal, with
            obligation and expiry tracking
          </p>
        </div>
        <Button onClick={() => setOpenNew(true)}>
          <Plus className="mr-2 h-4 w-4" /> New contract
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "Total contracts", v: String(list.length) },
          {
            l: "Active",
            v: String(list.filter((c) => c.stage === "Active").length),
          },
          { l: "Expiring ≤ 90 days", v: String(expiring.length) },
          { l: "Obligations due", v: String(obligationsDue.length) },
        ].map((k) => (
          <Card key={k.l}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.l}</p>
              <p className="mt-1 text-xl font-bold">{k.v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="register">
        <TabsList className="flex-wrap">
          <TabsTrigger value="register">Register</TabsTrigger>
          <TabsTrigger value="lifecycle">Lifecycle board</TabsTrigger>
          <TabsTrigger value="obligations">Obligations</TabsTrigger>
          <TabsTrigger value="renewals">Renewals &amp; expiry</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-3 pt-4">
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {CONTRACT_STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow
                      key={c._id}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(c._id)}
                    >
                      <TableCell>
                        <p className="text-sm font-medium">{c.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.counterparty}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{c.stage}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(c.expiresOn).toLocaleDateString()}
                        {daysTo(c.expiresOn) <= 90 &&
                          daysTo(c.expiresOn) > 0 && (
                            <Badge className="ml-2 bg-warning/10 text-warning">
                              {daysTo(c.expiresOn)}d
                            </Badge>
                          )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.owner || "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {money(c.value, c.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filtered.length && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No contracts yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lifecycle" className="pt-4">
          <div className="grid gap-3 md:grid-cols-4">
            {CONTRACT_STAGES.map((s) => (
              <Card key={s}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                    {s} ({list.filter((c) => c.stage === s).length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {list
                    .filter((c) => c.stage === s)
                    .map((c) => (
                      <button
                        key={c._id}
                        onClick={() => setSelectedId(c._id)}
                        className="w-full rounded border p-2 text-left hover:bg-muted"
                      >
                        <p className="text-sm font-medium">{c.counterparty}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.type} · {money(c.value, c.currency)}
                        </p>
                      </button>
                    ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="obligations" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Obligation</TableHead>
                    <TableHead>Contract</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Reminder</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {obligationsDue.map((o) => (
                    <TableRow key={`${o.contractId}-${o._id}`}>
                      <TableCell className="text-sm">{o.label}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {o.contractTitle}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{o.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(o.due).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <Bell className="mr-1 inline h-3 w-3" />
                        {o.leadDays} days before
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setDoneMut.mutate({
                              id: o.contractId,
                              obligationId: o._id,
                              done: true,
                            })
                          }
                        >
                          Mark done
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!obligationsDue.length && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No obligations due.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="renewals" className="pt-4">
          <div className="space-y-3">
            {expiring.map((c) => (
              <Card key={c._id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Expires {new Date(c.expiresOn).toLocaleDateString()} ·{" "}
                        {c.autoRenew ? "Auto-renew ON" : "Manual renewal"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => autoRenewMut.mutate(c._id)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {c.autoRenew
                          ? "Disable auto-renew"
                          : "Enable auto-renew"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => renewalMut.mutate(c._id)}
                      >
                        Start renewal
                      </Button>
                    </div>
                  </div>
                  <Progress
                    value={Math.max(0, 100 - (daysTo(c.expiresOn) / 90) * 100)}
                  />
                </CardContent>
              </Card>
            ))}
            {!expiring.length && (
              <p className="text-sm text-muted-foreground">
                No contracts expiring within 90 days.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Contract detail sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {selected.ref} · {selected.counterparty}
                  {selected.mandateName ? ` · ${selected.mandateName}` : ""}
                </p>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{selected.stage}</Badge>
                  {selected.stage !== "Expiry / Termination" && (
                    <Button
                      size="sm"
                      onClick={() => advanceMut.mutate(selected._id)}
                    >
                      Advance stage <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                  {selected.stage === "Execution" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setExecuteTarget(selected._id);
                        setExecuteForm({
                          executedOn: today(),
                          effectiveOn: today(),
                        });
                      }}
                    >
                      <FileSignature className="mr-2 h-4 w-4" /> Capture
                      signature
                    </Button>
                  )}
                </div>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm">
                      Negotiation rounds
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setOpenRound(true)}
                    >
                      Add round
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selected.rounds.map((r) => (
                      <div key={r._id} className="rounded border p-2">
                        <p className="font-medium">
                          Round {r.round} — {r.by}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.at).toLocaleDateString()} · {r.summary}
                        </p>
                      </div>
                    ))}
                    {!selected.rounds.length && (
                      <p className="text-muted-foreground">No rounds yet.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm">Obligations</CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setOpenObligation(true)}
                    >
                      Add obligation
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selected.obligations.map((o) => (
                      <label key={o._id} className="flex items-center gap-2">
                        <Checkbox
                          checked={o.done}
                          onCheckedChange={(v) =>
                            setDoneMut.mutate({
                              id: selected._id,
                              obligationId: o._id,
                              done: !!v,
                            })
                          }
                        />
                        <span
                          className={o.done ? "line-through opacity-60" : ""}
                        >
                          {o.label}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {new Date(o.due).toLocaleDateString()}
                        </span>
                      </label>
                    ))}
                    {!selected.obligations.length && (
                      <p className="text-muted-foreground">
                        No obligations recorded.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm">Amendments</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selected.amendments.map((a) => (
                      <div key={a._id} className="rounded border p-2">
                        <p className="font-medium">{a.ref}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(a.at).toLocaleDateString()} · {a.summary}
                        </p>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOpenAmendment(true)}
                    >
                      Add amendment
                    </Button>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <Label className="text-xs">Executed on</Label>
                    <p>
                      {selected.executedOn
                        ? new Date(selected.executedOn).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs">Effective from</Label>
                    <p>
                      {selected.effectiveOn
                        ? new Date(selected.effectiveOn).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                </div>

                <CommentThread subject={selected._id} subjectType="Contract" />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* New contract */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New contract</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Counterparty</Label>
              <Input
                value={form.counterparty}
                onChange={(e) =>
                  setForm({ ...form, counterparty: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm({ ...form, type: v as ContractType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Expires on</Label>
                <Input
                  type="date"
                  value={form.expiresOn}
                  onChange={(e) =>
                    setForm({ ...form, expiresOn: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Value</Label>
                <Input
                  type="number"
                  value={form.value}
                  onChange={(e) =>
                    setForm({ ...form, value: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Input
                  value={form.currency}
                  onChange={(e) =>
                    setForm({ ...form, currency: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Owner</Label>
              <Input
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
              />
            </div>
            <div>
              <Label>Linked mandate (optional)</Label>
              <Select
                value={form.mandateId || "none"}
                onValueChange={(v) => {
                  const m = mandates.find((m) => m._id === v);
                  setForm({
                    ...form,
                    mandateId: v === "none" ? "" : v,
                    mandateName: m?.name ?? "",
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {mandates.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !form.title || !form.counterparty || createMut.isPending
              }
              onClick={() => createMut.mutate()}
            >
              Create contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Execute contract */}
      <Dialog
        open={!!executeTarget}
        onOpenChange={(o) => !o && setExecuteTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Capture signature</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Executed on</Label>
              <Input
                type="date"
                value={executeForm.executedOn}
                onChange={(e) =>
                  setExecuteForm({ ...executeForm, executedOn: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Effective from</Label>
              <Input
                type="date"
                value={executeForm.effectiveOn}
                onChange={(e) =>
                  setExecuteForm({
                    ...executeForm,
                    effectiveOn: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={executeMut.isPending}
              onClick={() => executeMut.mutate()}
            >
              Execute — move to Active
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add negotiation round */}
      <Dialog open={openRound} onOpenChange={setOpenRound}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add negotiation round</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>By</Label>
              <Input
                value={roundForm.by}
                onChange={(e) =>
                  setRoundForm({ ...roundForm, by: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={roundForm.at}
                onChange={(e) =>
                  setRoundForm({ ...roundForm, at: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Summary</Label>
              <Textarea
                value={roundForm.summary}
                onChange={(e) =>
                  setRoundForm({ ...roundForm, summary: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!roundForm.summary || addRoundMut.isPending}
              onClick={() => selected && addRoundMut.mutate(selected._id)}
            >
              Add round
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add amendment */}
      <Dialog open={openAmendment} onOpenChange={setOpenAmendment}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add amendment</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Summary</Label>
            <Textarea
              value={amendmentSummary}
              onChange={(e) => setAmendmentSummary(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              disabled={!amendmentSummary || addAmendmentMut.isPending}
              onClick={() => selected && addAmendmentMut.mutate(selected._id)}
            >
              Add amendment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add obligation */}
      <Dialog open={openObligation} onOpenChange={setOpenObligation}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add obligation</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Label</Label>
              <Input
                value={obligationForm.label}
                onChange={(e) =>
                  setObligationForm({
                    ...obligationForm,
                    label: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={obligationForm.type}
                onValueChange={(v) =>
                  setObligationForm({
                    ...obligationForm,
                    type: v as ObligationType,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OBLIGATION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Due</Label>
                <Input
                  type="date"
                  value={obligationForm.due}
                  onChange={(e) =>
                    setObligationForm({
                      ...obligationForm,
                      due: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Lead days</Label>
                <Input
                  type="number"
                  value={obligationForm.leadDays}
                  onChange={(e) =>
                    setObligationForm({
                      ...obligationForm,
                      leadDays: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!obligationForm.label || addObligationMut.isPending}
              onClick={() => selected && addObligationMut.mutate(selected._id)}
            >
              Add obligation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
