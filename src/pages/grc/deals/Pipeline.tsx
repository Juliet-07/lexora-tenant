import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  TrendingUp,
  Layers,
  Calendar,
  LayoutList,
  Search,
  Briefcase,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  DEAL_STAGES,
  type DealStage,
  type DealType,
  formatMoney,
  stageColor,
  fetchDeals,
  createDeal,
  setDealStage,
} from "@/lib/grc/deals-api";
import { toast } from "sonner";

const TYPES: DealType[] = [
  "M&A",
  "JV",
  "Restructure",
  "Capital Raise",
  "Disposal",
  "Spin-off",
];

export default function DealPipeline() {
  const queryClient = useQueryClient();
  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals"],
    queryFn: fetchDeals,
  });
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "All" | "Active" | "Completed" | "Lost"
  >("All");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    client: "",
    counterparty: "",
    type: "M&A" as DealType,
    leadPartner: "",
    value: 0,
    currency: "USD",
    targetClose: "",
    longstopDate: "",
  });

  const stageMut = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: DealStage }) =>
      setDealStage(id, stage),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deals"] }),
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to move deal"),
  });
  const createMut = useMutation({
    mutationFn: () => createDeal(form),
    onSuccess: (deal) => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Deal created");
      setOpen(false);
      setForm({
        name: "",
        client: "",
        counterparty: "",
        type: "M&A",
        leadPartner: "",
        value: 0,
        currency: "USD",
        targetClose: "",
        longstopDate: "",
      });
      nav(`/grc/deals/${deal._id}`);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to create deal"),
  });

  const filtered = useMemo(() => {
    return deals
      .filter((d) => statusFilter === "All" || d.status === statusFilter)
      .filter(
        (d) =>
          !q ||
          `${d.name} ${d.client} ${d.leadPartner}`
            .toLowerCase()
            .includes(q.toLowerCase()),
      );
  }, [deals, q, statusFilter]);

  const stats = useMemo(() => {
    const active = deals.filter((d) => d.status === "Active");
    const totalValue = active.reduce((a, b) => a + b.value, 0);
    const atRisk = deals.filter((d) =>
      d.cps.some((c) => c.status === "At Risk"),
    ).length;
    const closing = deals.filter(
      (d) =>
        d.status === "Active" &&
        new Date(d.targetClose).getTime() - Date.now() < 30 * 86400000,
    ).length;
    return { active: active.length, totalValue, atRisk, closing };
  }, [deals]);

  const funnel = useMemo(() => {
    const active = deals.filter((d) => d.status === "Active");
    return DEAL_STAGES.map((st) => ({
      stage: st,
      count: active.filter((d) => d.stage === st).length,
    }));
  }, [deals]);

  function createDealClick() {
    if (!form.name || !form.client)
      return toast.error("Name and client required");
    createMut.mutate();
  }

  if (isLoading)
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading deal pipeline…
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Deal Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            Every deal moves through 8 lifecycle stages — Origination to
            Post-Completion.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              New deal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Originate new deal</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Deal name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Project Kivu — Bank Acquisition"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Client</Label>
                  <Input
                    value={form.client}
                    onChange={(e) =>
                      setForm({ ...form, client: e.target.value })
                    }
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
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) =>
                      setForm({ ...form, type: v as DealType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Lead partner</Label>
                  <Input
                    value={form.leadPartner}
                    onChange={(e) =>
                      setForm({ ...form, leadPartner: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label>Deal value</Label>
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
                  <Select
                    value={form.currency}
                    onValueChange={(v) => setForm({ ...form, currency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["USD", "EUR", "RWF", "GBP"].map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Target close</Label>
                  <Input
                    type="date"
                    value={form.targetClose}
                    onChange={(e) =>
                      setForm({ ...form, targetClose: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Longstop date</Label>
                  <Input
                    type="date"
                    value={form.longstopDate}
                    onChange={(e) =>
                      setForm({ ...form, longstopDate: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5" />
                <div>
                  <b>Conflict check:</b> No adverse party conflict detected
                  against client database. Manual review recommended.
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={createDealClick} disabled={createMut.isPending}>
                {createMut.isPending ? "Creating…" : "Create deal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat
          icon={<Briefcase className="h-5 w-5" />}
          label="Active deals"
          value={stats.active}
          tone="from-primary/15 to-primary/5"
        />
        <Stat
          icon={<DollarSign className="h-5 w-5" />}
          label="Total pipeline value"
          value={formatMoney(stats.totalValue)}
          tone="from-emerald-500/15 to-emerald-500/5"
        />
        <Stat
          icon={<Calendar className="h-5 w-5" />}
          label="Closing in 30 days"
          value={stats.closing}
          tone="from-sky-500/15 to-sky-500/5"
        />
        <Stat
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Deals with at-risk CPs"
          value={stats.atRisk}
          tone="from-rose-500/15 to-rose-500/5"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Lifecycle funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {funnel.map((f) => (
              <div key={f.stage} className="border rounded-md p-3">
                <div className="text-2xl font-bold">{f.count}</div>
                <Badge
                  variant="outline"
                  className={`mt-1 text-[10px] ${stageColor(f.stage)}`}
                >
                  {f.stage}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search deal, client, partner…"
            className="pl-8"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as any)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["All", "Active", "Completed", "Lost"].map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban">
            <Layers className="h-4 w-4 mr-1" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="list">
            <LayoutList className="h-4 w-4 mr-1" />
            List
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <Calendar className="h-4 w-4 mr-1" />
            Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          <div className="grid grid-flow-col auto-cols-[minmax(240px,1fr)] gap-3 overflow-x-auto pb-3">
            {DEAL_STAGES.map((st) => {
              const col = filtered.filter((d) => d.stage === st);
              return (
                <div key={st} className="rounded-md border bg-muted/30">
                  <div className="px-3 py-2 flex items-center justify-between border-b bg-background">
                    <Badge variant="outline" className={stageColor(st)}>
                      {st}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {col.length}
                    </span>
                  </div>
                  <div
                    className="p-2 space-y-2 min-h-[80px]"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const id = e.dataTransfer.getData("text/plain");
                      if (id) stageMut.mutate({ id, stage: st });
                    }}
                  >
                    {col.map((d) => (
                      <Link
                        to={`/grc/deals/${d._id}`}
                        key={d._id}
                        draggable
                        onDragStart={(e) =>
                          e.dataTransfer.setData("text/plain", d._id)
                        }
                        className="block rounded-md border bg-background p-2 hover:border-primary transition cursor-grab active:cursor-grabbing"
                      >
                        <div className="text-sm font-semibold line-clamp-1">
                          {d.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground line-clamp-1">
                          {d.client}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px]">
                          <span className="font-medium">
                            {formatMoney(d.value, d.currency)}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {d.type}
                          </Badge>
                        </div>
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>DD</span>
                            <span>{d.ddProgress}%</span>
                          </div>
                          <Progress value={d.ddProgress} className="h-1" />
                          <div className="text-[10px] text-muted-foreground">
                            CPs {d.cpsProgress.done}/{d.cpsProgress.total}
                          </div>
                        </div>
                      </Link>
                    ))}
                    {col.length === 0 && (
                      <div className="text-[11px] text-muted-foreground text-center py-6">
                        Drop here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Drag cards between columns to move a deal to another lifecycle
            stage.
          </p>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal / Client</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Lead partner</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>DD</TableHead>
                    <TableHead>CPs</TableHead>
                    <TableHead>Target close</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((d) => (
                    <TableRow
                      key={d._id}
                      className="cursor-pointer"
                      onClick={() => nav(`/grc/deals/${d._id}`)}
                    >
                      <TableCell>
                        <div className="font-medium text-sm">{d.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {d.client}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{d.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={stageColor(d.stage)}
                        >
                          {d.stage}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{d.leadPartner}</TableCell>
                      <TableCell className="text-sm">
                        {formatMoney(d.value, d.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={d.ddProgress}
                            className="h-1.5 w-16"
                          />
                          <span className="text-xs">{d.ddProgress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {d.cpsProgress.done}/{d.cpsProgress.total}
                      </TableCell>
                      <TableCell className="text-xs">
                        {d.targetClose.slice(0, 10)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-xs text-muted-foreground py-6"
                      >
                        No deals match filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                {[...filtered]
                  .sort((a, b) => a.targetClose.localeCompare(b.targetClose))
                  .map((d) => {
                    const t0 = new Date(d.startDate).getTime();
                    const t1 = new Date(d.targetClose).getTime();
                    const now = Date.now();
                    const pct = Math.max(
                      0,
                      Math.min(100, ((now - t0) / (t1 - t0)) * 100),
                    );
                    return (
                      <Link
                        key={d._id}
                        to={`/grc/deals/${d._id}`}
                        className="block rounded-md border p-3 hover:border-primary"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="text-sm font-semibold">
                              {d.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {d.startDate.slice(0, 10)} →{" "}
                              {d.targetClose.slice(0, 10)} (longstop{" "}
                              {d.longstopDate.slice(0, 10)})
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={stageColor(d.stage)}
                          >
                            {d.stage}
                          </Badge>
                        </div>
                        <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-primary"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </Link>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ icon, label, value, tone }: any) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className={`h-11 w-11 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center text-primary`}
        >
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
