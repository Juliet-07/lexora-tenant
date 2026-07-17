import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  X,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchLeads,
  fetchLeadStats,
  fetchLeadFunnel,
  createLead,
  moveLeadStage,
  markLeadLost,
  convertLead,
  fetchClientBoard,
  fetchClientCounts,
  moveClientStage,
  type Lead,
  type LeadSource,
  type LeadStage,
  type ClientPipelineStage,
  type ClientBoardCard,
  type ClientType,
} from "@/lib/crm-pipeline-api";

// ─── Static config ──────────────────────────────────────────────

type ColumnKey = LeadStage | ClientPipelineStage; // 'lead'|'prospect'|'active'|'retained'|'past'
type ColumnKind = "lead" | "client";

const SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: "event", label: "Event" },
  { value: "referral", label: "Referral" },
  { value: "web", label: "Web" },
  { value: "cold_outreach", label: "Cold Outreach" },
  { value: "partner", label: "Partner" },
  { value: "other", label: "Other" },
];

const CLIENT_TYPE_OPTIONS: { value: ClientType; label: string }[] = [
  { value: "individual", label: "Individual" },
  { value: "corporate", label: "Corporate" },
  { value: "partner", label: "Partner" },
  { value: "trust", label: "Trust" },
];

const KYC_TONE: Record<string, string> = {
  not_started: "bg-muted text-muted-foreground border-border",
  in_progress: "bg-warning/10 text-warning border-warning/20",
  submitted: "bg-info/10 text-info border-info/20",
  approved: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  expired: "bg-destructive/10 text-destructive border-destructive/20",
};

const KYC_LABEL: Record<string, string> = {
  not_started: "Onboarding not started",
  in_progress: "Onboarding in progress",
  submitted: "Onboarding submitted",
  approved: "Onboarding approved",
  rejected: "Onboarding rejected",
  expired: "Onboarding expired",
};

const COLUMNS: {
  key: ColumnKey;
  kind: ColumnKind;
  label: string;
  tone: string;
  sub: string;
  icon: any;
}[] = [
  {
    key: "lead",
    kind: "lead",
    label: "Leads",
    tone: "bg-slate-500/10 text-slate-600 border-slate-500/20",
    sub: "Captured, not yet qualified",
    icon: Users,
  },
  {
    key: "prospect",
    kind: "lead",
    label: "Prospects",
    tone: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    sub: "Interested & qualified",
    icon: Target,
  },
  {
    key: "active",
    kind: "client",
    label: "Active Clients",
    tone: "bg-success/10 text-success border-success/20",
    sub: "Currently engaged",
    icon: UserCheck,
  },
  {
    key: "retained",
    kind: "client",
    label: "Retained",
    tone: "bg-primary/10 text-primary border-primary/20",
    sub: "Repeat business",
    icon: Repeat,
  },
  {
    key: "past",
    kind: "client",
    label: "Past Clients",
    tone: "bg-destructive/10 text-destructive border-destructive/20",
    sub: "One-time / churned",
    icon: UserX,
  },
];

// ─── Component ──────────────────────────────────────────────────

export default function Pipeline() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dragging, setDragging] = useState<{
    id: string;
    kind: ColumnKind;
    stage: ColumnKey;
  } | null>(null);
  const [dragOver, setDragOver] = useState<ColumnKey | null>(null);

  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [convertTarget, setConvertTarget] = useState<Lead | null>(null);
  const [churnTarget, setChurnTarget] = useState<{
    pipelineId: string;
    name: string;
  } | null>(null);
  const [lostTarget, setLostTarget] = useState<Lead | null>(null);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
    queryClient.invalidateQueries({ queryKey: ["crm-lead-stats"] });
    queryClient.invalidateQueries({ queryKey: ["crm-lead-funnel"] });
    queryClient.invalidateQueries({ queryKey: ["crm-client-board"] });
    queryClient.invalidateQueries({ queryKey: ["crm-client-counts"] });
  };

  // ── Queries ──────────────────────────────────────────────────
  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ["crm-leads"],
    queryFn: fetchLeads,
  });
  const { data: leadStats } = useQuery({
    queryKey: ["crm-lead-stats"],
    queryFn: fetchLeadStats,
  });
  const { data: funnel } = useQuery({
    queryKey: ["crm-lead-funnel"],
    queryFn: fetchLeadFunnel,
  });
  const { data: activeBoard = [], isLoading: activeLoading } = useQuery({
    queryKey: ["crm-client-board", "active"],
    queryFn: () => fetchClientBoard("active"),
  });
  const { data: retainedBoard = [] } = useQuery({
    queryKey: ["crm-client-board", "retained"],
    queryFn: () => fetchClientBoard("retained"),
  });
  const { data: pastBoard = [] } = useQuery({
    queryKey: ["crm-client-board", "past"],
    queryFn: () => fetchClientBoard("past"),
  });
  const { data: clientCounts } = useQuery({
    queryKey: ["crm-client-counts"],
    queryFn: fetchClientCounts,
  });

  const isInitialLoading = leadsLoading || activeLoading;

  // ── Mutations ────────────────────────────────────────────────
  const createLeadMutation = useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      invalidateAll();
      setNewLeadOpen(false);
      toast({ title: "Lead captured" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to create lead",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const moveLeadStageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: LeadStage }) =>
      moveLeadStage(id, stage),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Moved" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to move lead",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const markLostMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      markLeadLost(id, reason),
    onSuccess: () => {
      invalidateAll();
      setLostTarget(null);
      toast({ title: "Lead marked as lost" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to update lead",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const convertMutation = useMutation({
    mutationFn: ({
      id,
      email,
      phoneNumber,
      clientType,
    }: {
      id: string;
      email?: string;
      phoneNumber?: string;
      clientType: ClientType;
    }) => convertLead(id, { email, phoneNumber, clientType }),
    onSuccess: (res) => {
      invalidateAll();
      setConvertTarget(null);
      toast({ title: "Converted", description: res.message });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to convert lead",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const moveClientStageMutation = useMutation({
    mutationFn: ({
      pipelineId,
      stage,
      reason,
    }: {
      pipelineId: string;
      stage: ClientPipelineStage;
      reason?: string;
    }) => moveClientStage(pipelineId, stage, reason),
    onSuccess: () => {
      invalidateAll();
      setChurnTarget(null);
      toast({ title: "Client moved" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to move client",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  // ── Derived data ─────────────────────────────────────────────
  const counts: Record<ColumnKey, number> = {
    lead: leadStats?.leads ?? 0,
    prospect: leadStats?.prospects ?? 0,
    active: clientCounts?.active ?? 0,
    retained: clientCounts?.retained ?? 0,
    past: clientCounts?.past ?? 0,
  };
  const maxFunnel = Math.max(...Object.values(counts), 1);

  const openLeads = useMemo(
    () => leads.filter((l) => l.status === "open"),
    [leads],
  );

  const boardByColumn: Record<ColumnKey, (Lead | ClientBoardCard)[]> = {
    lead: openLeads.filter((l) => l.stage === "lead"),
    prospect: openLeads.filter((l) => l.stage === "prospect"),
    active: activeBoard,
    retained: retainedBoard,
    past: pastBoard,
  };

  const isLeadItem = (item: Lead | ClientBoardCard): item is Lead =>
    "stage" in item;

  // ── Drag & drop ──────────────────────────────────────────────
  const handleDrop = (targetKey: ColumnKey, targetKind: ColumnKind) => {
    if (!dragging) return;
    const { id, kind, stage: fromStage } = dragging;
    setDragging(null);
    setDragOver(null);

    if (fromStage === targetKey && kind === targetKind) return;

    if (kind === "lead" && targetKind === "lead") {
      moveLeadStageMutation.mutate({ id, stage: targetKey as LeadStage });
      return;
    }

    if (kind === "lead" && targetKind === "client") {
      if (targetKey !== "active") {
        toast({
          title: "Not allowed",
          description: "Leads can only convert directly into Active Clients.",
          variant: "destructive",
        });
        return;
      }
      const lead = leads.find((l) => l._id === id);
      if (lead) setConvertTarget(lead);
      return;
    }

    if (kind === "client" && targetKind === "client") {
      if (targetKey === "past") {
        const card = [...activeBoard, ...retainedBoard].find(
          (c) => c.pipelineId === id,
        );
        setChurnTarget({ pipelineId: id, name: card?.name ?? "this client" });
      } else {
        moveClientStageMutation.mutate({
          pipelineId: id,
          stage: targetKey as ClientPipelineStage,
        });
      }
      return;
    }

    toast({
      title: "Not allowed",
      description: "Clients can't move back into Leads or Prospects.",
      variant: "destructive",
    });
  };

  // ── Lead sources breakdown (from all fetched leads) ─────────
  const bySource = useMemo(() => {
    return leads.reduce<Record<string, number>>((acc, l) => {
      acc[l.source] = (acc[l.source] || 0) + 1;
      return acc;
    }, {});
  }, [leads]);
  const sourceTotal = leads.length || 1;

  // ── New Lead form ────────────────────────────────────────────
  const [leadForm, setLeadForm] = useState({
    contactName: "",
    companyName: "",
    contactEmail: "",
    source: "web" as LeadSource,
  });

  const submitLead = () => {
    if (!leadForm.contactName.trim() && !leadForm.companyName.trim()) {
      toast({
        title: "Missing details",
        description: "Provide at least a contact name or company name.",
        variant: "destructive",
      });
      return;
    }
    createLeadMutation.mutate({
      contactName: leadForm.contactName.trim() || undefined,
      companyName: leadForm.companyName.trim() || undefined,
      contactEmail: leadForm.contactEmail.trim() || undefined,
      source: leadForm.source,
    });
  };

  const closeNewLead = () => {
    setLeadForm({
      contactName: "",
      companyName: "",
      contactEmail: "",
      source: "web",
    });
    setNewLeadOpen(false);
  };

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading pipeline…</span>
      </div>
    );
  }

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
        <Dialog open={newLeadOpen} onOpenChange={(o) => !o && closeNewLead()}>
          <DialogTrigger asChild>
            <Button
              className="bg-gradient-to-r from-primary to-secondary"
              onClick={() => setNewLeadOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" /> New Lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record a new lead</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="lead-name">Contact name</Label>
                <Input
                  id="lead-name"
                  value={leadForm.contactName}
                  onChange={(e) =>
                    setLeadForm({ ...leadForm, contactName: e.target.value })
                  }
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-company">Company</Label>
                <Input
                  id="lead-company"
                  value={leadForm.companyName}
                  onChange={(e) =>
                    setLeadForm({ ...leadForm, companyName: e.target.value })
                  }
                  placeholder="Acme Ltd"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-email">Email (optional)</Label>
                <Input
                  id="lead-email"
                  type="email"
                  value={leadForm.contactEmail}
                  onChange={(e) =>
                    setLeadForm({ ...leadForm, contactEmail: e.target.value })
                  }
                  placeholder="jane@acme.com"
                />
                <p className="text-xs text-muted-foreground">
                  Not required now — needed later to convert this lead into a
                  client.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select
                  value={leadForm.source}
                  onValueChange={(v) =>
                    setLeadForm({ ...leadForm, source: v as LeadSource })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeNewLead}>
                Cancel
              </Button>
              <Button
                onClick={submitLead}
                disabled={createLeadMutation.isPending}
                className="bg-gradient-to-r from-primary to-secondary"
              >
                {createLeadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Save lead
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lifecycle summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {COLUMNS.map((c) => (
          <Card key={c.key}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${c.tone}`}>
                  <c.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="text-2xl font-bold leading-none mt-1">
                    {counts[c.key]}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="funnel">
        <TabsList>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="kanban">Pipeline Board</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
        </TabsList>

        {/* ── Conversion funnel ────────────────────────────── */}
        <TabsContent value="funnel" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">Lead → Prospect</p>
                <p className="text-2xl font-bold mt-1">
                  {funnel?.leadToProspectRate ?? 0}%
                </p>
                <Progress
                  value={funnel?.leadToProspectRate ?? 0}
                  className="h-1.5 mt-2"
                />
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
                <p className="text-2xl font-bold mt-1">
                  {funnel?.prospectToClientRate ?? 0}%
                </p>
                <Progress
                  value={funnel?.prospectToClientRate ?? 0}
                  className="h-1.5 mt-2"
                />
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
                <p className="text-2xl font-bold mt-1">
                  {funnel?.clientRetentionRate ?? 0}%
                </p>
                <Progress
                  value={funnel?.clientRetentionRate ?? 0}
                  className="h-1.5 mt-2"
                />
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
              {COLUMNS.map((c, i) => {
                const count = counts[c.key];
                const width = Math.max((count / maxFunnel) * 100, 8);
                return (
                  <div key={c.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-medium">
                        <c.icon className="h-4 w-4 text-muted-foreground" />
                        {c.label}
                      </div>
                      <span className="text-muted-foreground">
                        {count} {count === 1 ? "account" : "accounts"}
                      </span>
                    </div>
                    <div className="h-9 rounded-md bg-muted/40 overflow-hidden">
                      <div
                        className={`h-full ${c.tone} flex items-center px-3 text-xs font-semibold transition-all`}
                        style={{ width: `${width}%` }}
                      >
                        {count}
                      </div>
                    </div>
                    {i < COLUMNS.length - 1 && (
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(bySource).map(([src, n]) => (
                  <div
                    key={src}
                    className="rounded-lg border border-border/50 p-3"
                  >
                    <p className="text-xs text-muted-foreground capitalize">
                      {SOURCE_OPTIONS.find((s) => s.value === src)?.label ??
                        src}
                    </p>
                    <p className="text-lg font-bold">{n}</p>
                    <Progress
                      value={(n / sourceTotal) * 100}
                      className="h-1 mt-1"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Pipeline board ───────────────────────────────── */}
        <TabsContent value="kanban" className="mt-4">
          <p className="text-xs text-muted-foreground mb-3">
            Drag cards between columns to move them through the lifecycle.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {COLUMNS.map((col) => {
              const items = boardByColumn[col.key];
              const isOver = dragOver === col.key;
              return (
                <Card
                  key={col.key}
                  className={`bg-muted/30 transition-colors ${isOver ? "ring-2 ring-primary bg-primary/5" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOver !== col.key) setDragOver(col.key);
                  }}
                  onDragLeave={() =>
                    setDragOver((cur) => (cur === col.key ? null : cur))
                  }
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(col.key, col.kind);
                  }}
                >
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-xs font-semibold flex items-center justify-between">
                      <span>{col.label}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {items.length}
                      </Badge>
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground">
                      {col.sub}
                    </p>
                  </CardHeader>
                  <CardContent className="p-2 space-y-2 min-h-40">
                    {items.map((it) => {
                      const isLead = isLeadItem(it);
                      const id = isLead ? it._id : it.pipelineId;
                      const title = isLead
                        ? it.contactName || it.companyName || "Untitled"
                        : it.name;
                      const sub = isLead
                        ? it.contactName
                          ? (it.companyName ?? "—")
                          : (it.industry ?? "—")
                        : (KYC_LABEL[it.kycStatus] ?? it.kycStatus);
                      return (
                        <div
                          key={id}
                          draggable
                          onDragStart={(e) => {
                            setDragging({ id, kind: col.kind, stage: col.key });
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragEnd={() => {
                            setDragging(null);
                            setDragOver(null);
                          }}
                          className={`relative rounded-lg bg-background p-3 border border-border/50 hover:border-primary/50 cursor-grab active:cursor-grabbing transition-opacity group ${
                            dragging?.id === id ? "opacity-40" : ""
                          }`}
                        >
                          {isLead && (
                            <button
                              onClick={() => setLostTarget(it)}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                              title="Mark as lost"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <p className="text-xs font-medium leading-tight pr-4">
                            {title}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {sub}
                          </p>
                          {isLead ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] mt-2"
                            >
                              {SOURCE_OPTIONS.find((s) => s.value === it.source)
                                ?.label ?? it.source}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className={`text-[10px] mt-2 ${KYC_TONE[it.kycStatus] ?? ""}`}
                            >
                              {it.projectCount} project
                              {it.projectCount === 1 ? "" : "s"}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                    {items.length === 0 && (
                      <p className="text-[11px] text-muted-foreground text-center py-6">
                        {isOver ? "Drop here" : "Nothing here yet"}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Leads table ──────────────────────────────────── */}
        <TabsContent value="leads" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((l) => (
                    <TableRow key={l._id}>
                      <TableCell>
                        <p className="font-medium text-sm">
                          {l.contactName ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {l.contactEmail ?? "No email on file"}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {l.companyName ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {SOURCE_OPTIONS.find((s) => s.value === l.source)
                            ?.label ?? l.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs capitalize">
                        {l.stage}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize ${
                            l.status === "lost"
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : l.status === "converted"
                                ? "bg-success/10 text-success border-success/20"
                                : ""
                          }`}
                        >
                          {l.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(l.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Clients table ────────────────────────────────── */}
        <TabsContent value="clients" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Lifecycle</TableHead>
                    <TableHead>Onboarding</TableHead>
                    <TableHead>Client since</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    ...activeBoard.map((c) => ({
                      ...c,
                      stage: "active" as const,
                    })),
                    ...retainedBoard.map((c) => ({
                      ...c,
                      stage: "retained" as const,
                    })),
                    ...pastBoard.map((c) => ({ ...c, stage: "past" as const })),
                  ]
                    .sort((a, b) => b.projectCount - a.projectCount)
                    .map((c) => (
                      <TableRow key={c.pipelineId}>
                        <TableCell>
                          <p className="font-medium text-sm">{c.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.email ?? "—"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs ${
                              COLUMNS.find((col) => col.key === c.stage)?.tone
                            }`}
                          >
                            {COLUMNS.find((col) => col.key === c.stage)?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${KYC_TONE[c.kycStatus] ?? ""}`}
                          >
                            {KYC_LABEL[c.kycStatus] ?? c.kycStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(c.clientSince).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Convert dialog ─────────────────────────────────── */}
      <ConvertLeadDialog
        lead={convertTarget}
        onClose={() => setConvertTarget(null)}
        onConfirm={(payload) =>
          convertTarget &&
          convertMutation.mutate({ id: convertTarget._id, ...payload })
        }
        isSubmitting={convertMutation.isPending}
      />

      {/* ── Mark lost dialog ───────────────────────────────── */}
      <ReasonDialog
        open={!!lostTarget}
        title={`Mark ${lostTarget?.contactName || lostTarget?.companyName || "this lead"} as lost?`}
        description="Optional — note why this lead didn't work out."
        confirmLabel="Mark as lost"
        required={false}
        onClose={() => setLostTarget(null)}
        onConfirm={(reason) =>
          lostTarget && markLostMutation.mutate({ id: lostTarget._id, reason })
        }
        isSubmitting={markLostMutation.isPending}
      />

      {/* ── Churn reason dialog ────────────────────────────── */}
      <ReasonDialog
        open={!!churnTarget}
        title={`Mark ${churnTarget?.name} as a past client?`}
        description="A reason is required when moving a client to Past."
        confirmLabel="Confirm"
        required
        onClose={() => setChurnTarget(null)}
        onConfirm={(reason) =>
          churnTarget &&
          moveClientStageMutation.mutate({
            pipelineId: churnTarget.pipelineId,
            stage: "past",
            reason,
          })
        }
        isSubmitting={moveClientStageMutation.isPending}
      />
    </div>
  );
}

// ─── Convert dialog ─────────────────────────────────────────────

function ConvertLeadDialog({
  lead,
  onClose,
  onConfirm,
  isSubmitting,
}: {
  lead: Lead | null;
  onClose: () => void;
  onConfirm: (payload: {
    email?: string;
    phoneNumber?: string;
    clientType: ClientType;
  }) => void;
  isSubmitting: boolean;
}) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [clientType, setClientType] = useState<ClientType>("individual");

  useState(() => {
    if (lead) {
      setEmail(lead.contactEmail ?? "");
      setPhone(lead.contactPhone ?? "");
    }
  });

  if (!lead) return null;
  const emailValue = email || lead.contactEmail || "";
  const canSubmit = emailValue.trim().length > 0 && !isSubmitting;

  return (
    <Dialog open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Convert {lead.contactName || lead.companyName} into a client
          </DialogTitle>
          <DialogDescription>
            This creates a real client account via your standard client-add flow
            — including any client-limit and engagement-letter rules.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={email || lead.contactEmail || ""}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@acme.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Phone (optional)</Label>
            <Input
              value={phone || lead.contactPhone || ""}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Client type</Label>
            <Select
              value={clientType}
              onValueChange={(v) => setClientType(v as ClientType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLIENT_TYPE_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={() =>
              onConfirm({
                email: emailValue.trim(),
                phoneNumber:
                  phone || lead.contactPhone || undefined || undefined,
                clientType,
              })
            }
            className="bg-gradient-to-r from-primary to-secondary"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Convert to Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Generic reason dialog (mark lost / mark churned) ──────────

function ReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  required,
  onClose,
  onConfirm,
  isSubmitting,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  required: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isSubmitting: boolean;
}) {
  const [reason, setReason] = useState("");

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason…"
        />
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            disabled={(required && !reason.trim()) || isSubmitting}
            onClick={() => onConfirm(reason.trim())}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
