import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Plus,
  Target,
  Users,
  UserCheck,
  Repeat,
  UserX,
  ArrowRight,
} from "lucide-react";
import {
  leads as initialLeads,
  accounts as initialAccounts,
  type Lead,
  type LifecycleStage,
} from "@/data/crmMockData";
import { useToast } from "@/hooks/use-toast";

const lifecycleColor: Record<LifecycleStage, string> = {
  Lead: "bg-slate-500/10 text-slate-600",
  Prospect: "bg-blue-500/10 text-blue-600",
  "Active Client": "bg-success/10 text-success",
  "Retained Client": "bg-primary/10 text-primary",
  "Past Client": "bg-destructive/10 text-destructive",
};

const sourceOptions: Lead["source"][] = [
  "Referral",
  "Web",
  "Event",
  "Cold Outreach",
  "Partner",
  "Social Media",
  "Direct",
];

const lifecycleStages: {
  key: LifecycleStage;
  label: string;
  tone: string;
  sub: string;
}[] = [
  {
    key: "Lead",
    label: "Leads",
    tone: "bg-slate-500/10 text-slate-600 border-slate-500/20",
    sub: "Captured, not yet qualified",
  },
  {
    key: "Prospect",
    label: "Prospects",
    tone: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    sub: "Interested & qualified",
  },
  {
    key: "Active Client",
    label: "Active Clients",
    tone: "bg-success/10 text-success border-success/20",
    sub: "Currently engaged",
  },
  {
    key: "Retained Client",
    label: "Retained",
    tone: "bg-primary/10 text-primary border-primary/20",
    sub: "Repeat business",
  },
  {
    key: "Past Client",
    label: "Past Clients",
    tone: "bg-destructive/10 text-destructive border-destructive/20",
    sub: "One-time / churned",
  },
];

export default function Pipeline() {
  const { toast } = useToast();
  const [leads, setLeads] = useState(initialLeads);
  const [accounts, setAccounts] = useState(initialAccounts);
  const [dragging, setDragging] = useState<{
    id: string;
    from: LifecycleStage;
  } | null>(null);
  const [dragOver, setDragOver] = useState<LifecycleStage | null>(null);

  const moveItem = (id: string, from: LifecycleStage, to: LifecycleStage) => {
    if (from === to) return;
    // If it's a lead being moved out of "Lead" column → promote into accounts
    const lead = leads.find((l) => l.id === id);
    if (lead && from === "Lead") {
      setLeads((prev) => prev.filter((l) => l.id !== id));
      setAccounts((prev) => [
        {
          id: `ACC-${String(prev.length + 1).padStart(3, "0")}`,
          name: lead.company,
          industry: "—",
          size: "SMB",
          country: "—",
          owner: lead.owner,
          arr: 0,
          status:
            to === "Past Client"
              ? "Churned"
              : to === "Prospect" || to === "Lead"
                ? "Prospect"
                : "Customer",
          tier: "Tier 3",
          lifecycle: to,
          source: lead.source,
          dealsCount:
            to === "Active Client" ||
            to === "Retained Client" ||
            to === "Past Client"
              ? 1
              : 0,
          totalRevenue: 0,
        },
        ...prev,
      ]);
      toast({
        title: "Lead promoted",
        description: `${lead.name} moved to ${to}.`,
      });
      return;
    }
    // Otherwise update the account lifecycle
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, lifecycle: to } : a)),
    );
    toast({ title: "Moved", description: `Updated lifecycle to ${to}.` });
  };
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    company: string;
    email: string;
    source: Lead["source"];
  }>({
    name: "",
    company: "",
    email: "",
    source: "Web",
  });

  // ── Lifecycle / conversion story ─────────────────────────────
  const counts = useMemo(() => {
    const c: Record<LifecycleStage, number> = {
      Lead:
        accounts.filter((a) => a.lifecycle === "Lead").length + leads.length,
      Prospect: accounts.filter((a) => a.lifecycle === "Prospect").length,
      "Active Client": accounts.filter((a) => a.lifecycle === "Active Client")
        .length,
      "Retained Client": accounts.filter(
        (a) => a.lifecycle === "Retained Client",
      ).length,
      "Past Client": accounts.filter((a) => a.lifecycle === "Past Client")
        .length,
    };
    return c;
  }, [leads, accounts]);

  const clientTotal =
    counts["Active Client"] + counts["Retained Client"] + counts["Past Client"];
  const leadToProspect = counts.Lead
    ? Math.round((counts.Prospect / counts.Lead) * 100)
    : 0;
  const prospectToClient =
    counts.Prospect + clientTotal
      ? Math.round((clientTotal / (counts.Prospect + clientTotal)) * 100)
      : 0;
  const retentionRate = clientTotal
    ? Math.round((counts["Retained Client"] / clientTotal) * 100)
    : 0;

  const maxFunnel = Math.max(...Object.values(counts), 1);

  // Items per lifecycle column for the board
  const itemsByLifecycle = useMemo(() => {
    const map: Record<
      LifecycleStage,
      { id: string; title: string; sub: string; meta?: string }[]
    > = {
      Lead: [
        ...leads.map((l) => ({
          id: l.id,
          title: l.name,
          sub: l.company,
          meta: l.source,
        })),
        ...accounts
          .filter((a) => a.lifecycle === "Lead")
          .map((a) => ({
            id: a.id,
            title: a.name,
            sub: a.industry,
            meta: a.source,
          })),
      ],
      Prospect: accounts
        .filter((a) => a.lifecycle === "Prospect")
        .map((a) => ({
          id: a.id,
          title: a.name,
          sub: a.industry,
          meta: a.source,
        })),
      "Active Client": accounts
        .filter((a) => a.lifecycle === "Active Client")
        .map((a) => ({
          id: a.id,
          title: a.name,
          sub: a.industry,
          meta: `${a.dealsCount} deal${a.dealsCount === 1 ? "" : "s"}`,
        })),
      "Retained Client": accounts
        .filter((a) => a.lifecycle === "Retained Client")
        .map((a) => ({
          id: a.id,
          title: a.name,
          sub: a.industry,
          meta: `${a.dealsCount} deals`,
        })),
      "Past Client": accounts
        .filter((a) => a.lifecycle === "Past Client")
        .map((a) => ({
          id: a.id,
          title: a.name,
          sub: a.industry,
          meta: a.lastWonDate,
        })),
    };
    return map;
  }, [leads, accounts]);

  const submitLead = () => {
    if (!form.name || !form.company || !form.email) {
      toast({
        title: "Missing details",
        description: "Name, company and email are required.",
        variant: "destructive",
      });
      return;
    }
    const id = `LEAD-${String(leads.length + 1).padStart(3, "0")}`;
    setLeads((prev) => [
      {
        id,
        name: form.name,
        company: form.company,
        email: form.email,
        source: form.source,
        score: 0,
        status: "New",
        owner: "—",
        createdAt: new Date().toISOString().slice(0, 10),
      },
      ...prev,
    ]);
    toast({
      title: "Lead captured",
      description: `${form.name} from ${form.company} added.`,
    });
    setForm({ name: "", company: "", email: "", source: "Web" });
    setOpenDialog(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            Track the full journey — from lead to paying client, retained or
            churned
          </p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-secondary">
              <Plus className="h-4 w-4 mr-2" /> New Lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record a new lead</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="lead-name">Full name</Label>
                <Input
                  id="lead-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-company">Company</Label>
                <Input
                  id="lead-company"
                  value={form.company}
                  onChange={(e) =>
                    setForm({ ...form, company: e.target.value })
                  }
                  placeholder="Acme Ltd"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-email">Email</Label>
                <Input
                  id="lead-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="jane@acme.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select
                  value={form.source}
                  onValueChange={(v) =>
                    setForm({ ...form, source: v as Lead["source"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={submitLead}
                className="bg-gradient-to-r from-primary to-secondary"
              >
                Save lead
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lifecycle summary cards (replaces money cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {lifecycleStages.map((s) => {
          const Icon =
            s.key === "Lead"
              ? Users
              : s.key === "Prospect"
                ? Target
                : s.key === "Active Client"
                  ? UserCheck
                  : s.key === "Retained Client"
                    ? Repeat
                    : UserX;
          return (
            <Card key={s.key}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${s.tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-bold leading-none mt-1">
                      {counts[s.key]}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3">
                  {s.sub}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="funnel">
        <TabsList>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="kanban">Pipeline Board</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
        </TabsList>

        {/* ── Conversion funnel ──────────────────────────────── */}
        <TabsContent value="funnel" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">Lead → Prospect</p>
                <p className="text-2xl font-bold mt-1">{leadToProspect}%</p>
                <Progress value={leadToProspect} className="h-1.5 mt-2" />
                <p className="text-[11px] text-muted-foreground mt-2">
                  How many captured leads progress to qualified prospects.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">
                  Prospect → Paying Client
                </p>
                <p className="text-2xl font-bold mt-1">{prospectToClient}%</p>
                <Progress value={prospectToClient} className="h-1.5 mt-2" />
                <p className="text-[11px] text-muted-foreground mt-2">
                  Share of prospects that converted into a paying engagement.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">
                  Client Retention Rate
                </p>
                <p className="text-2xl font-bold mt-1">{retentionRate}%</p>
                <Progress value={retentionRate} className="h-1.5 mt-2" />
                <p className="text-[11px] text-muted-foreground mt-2">
                  Clients who came back for additional engagements vs one-time.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conversion Journey</CardTitle>
              <p className="text-xs text-muted-foreground">
                Lead → Prospect → Paying Client → Retained / Past
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {lifecycleStages.map((s, i) => {
                const count = counts[s.key];
                const width = Math.max((count / maxFunnel) * 100, 8);
                const Icon =
                  s.key === "Lead"
                    ? Users
                    : s.key === "Prospect"
                      ? Target
                      : s.key === "Active Client"
                        ? UserCheck
                        : s.key === "Retained Client"
                          ? Repeat
                          : UserX;
                return (
                  <div key={s.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-medium">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {s.label}
                      </div>
                      <span className="text-muted-foreground">
                        {count} {count === 1 ? "account" : "accounts"}
                      </span>
                    </div>
                    <div className="h-9 rounded-md bg-muted/40 overflow-hidden">
                      <div
                        className={`h-full ${s.tone} flex items-center px-3 text-xs font-semibold transition-all`}
                        style={{ width: `${width}%` }}
                      >
                        {count}
                      </div>
                    </div>
                    {i < lifecycleStages.length - 1 && (
                      <div className="flex justify-center text-muted-foreground">
                        <ArrowRight className="h-3 w-3 rotate-90" />
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead Sources</CardTitle>
              <p className="text-xs text-muted-foreground">
                Where new leads are originating from
              </p>
            </CardHeader>
            <CardContent>
              {(() => {
                const bySource = leads.reduce<Record<string, number>>(
                  (acc, l) => {
                    acc[l.source] = (acc[l.source] || 0) + 1;
                    return acc;
                  },
                  {},
                );
                const total = leads.length || 1;
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(bySource).map(([src, n]) => (
                      <div
                        key={src}
                        className="rounded-lg border border-border/50 p-3"
                      >
                        <p className="text-xs text-muted-foreground">{src}</p>
                        <p className="text-lg font-bold">{n}</p>
                        <Progress
                          value={(n / total) * 100}
                          className="h-1 mt-1"
                        />
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Pipeline board — lifecycle journey (drag & drop) ─ */}
        <TabsContent value="kanban" className="mt-4">
          <p className="text-xs text-muted-foreground mb-3">
            Drag cards between columns to move them through the lifecycle.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {lifecycleStages.map((stage) => {
              const items = itemsByLifecycle[stage.key];
              const isOver = dragOver === stage.key;
              return (
                <Card
                  key={stage.key}
                  className={`bg-muted/30 transition-colors ${isOver ? "ring-2 ring-primary bg-primary/5" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOver !== stage.key) setDragOver(stage.key);
                  }}
                  onDragLeave={() =>
                    setDragOver((cur) => (cur === stage.key ? null : cur))
                  }
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(null);
                    if (dragging) {
                      moveItem(dragging.id, dragging.from, stage.key);
                      setDragging(null);
                    }
                  }}
                >
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-xs font-semibold flex items-center justify-between">
                      <span>{stage.label}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {items.length}
                      </Badge>
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground">
                      {stage.sub}
                    </p>
                  </CardHeader>
                  <CardContent className="p-2 space-y-2 min-h-40">
                    {items.map((it) => (
                      <div
                        key={it.id}
                        draggable
                        onDragStart={(e) => {
                          setDragging({ id: it.id, from: stage.key });
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => {
                          setDragging(null);
                          setDragOver(null);
                        }}
                        className={`rounded-lg bg-background p-3 border border-border/50 hover:border-primary/50 cursor-grab active:cursor-grabbing transition-opacity ${
                          dragging?.id === it.id ? "opacity-40" : ""
                        }`}
                      >
                        <p className="text-xs font-medium leading-tight">
                          {it.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {it.sub}
                        </p>
                        {it.meta && (
                          <Badge variant="outline" className="text-[10px] mt-2">
                            {it.meta}
                          </Badge>
                        )}
                      </div>
                    ))}
                    {items.length === 0 && (
                      <p className="text-[11px] text-muted-foreground text-center py-6">
                        {isOver ? "Drop here" : "No accounts"}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Leads ─────────────────────────────────────────── */}
        <TabsContent value="leads" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{l.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {l.email}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">{l.company}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {l.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {l.createdAt}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Clients (active / retained / past) ────────────── */}
        <TabsContent value="clients" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Lifecycle</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Assigned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts
                    .filter(
                      (a) =>
                        a.lifecycle !== "Lead" && a.lifecycle !== "Prospect",
                    )
                    .sort((a, b) => b.dealsCount - a.dealsCount)
                    .map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{a.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.industry} · {a.country}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs ${lifecycleColor[a.lifecycle]}`}
                          >
                            {a.lifecycle}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {a.source ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm">{a.owner}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
