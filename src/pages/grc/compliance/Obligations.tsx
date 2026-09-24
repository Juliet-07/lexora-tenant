import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Upload,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  BellRing,
  FileCheck2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchObligations,
  createObligation,
  fetchFilings,
  setFilingStage,
  addFilingEvidence,
  certifyFiling,
  completeFiling,
  resolveComplianceFileUrl,
  REGULATORS,
  FREQUENCIES,
  FILING_STAGES,
  EVIDENCE_CATEGORIES,
  daysUntil,
  todayStr,
  type ComplianceObligation,
  type Filing,
  type Regulator,
  type Frequency,
  type EvidenceCategory,
} from "@/lib/grc/compliance-api";

const statusTone: Record<string, string> = {
  Compliant: "text-emerald-600 border-emerald-500/30 bg-emerald-500/10",
  Due: "text-amber-600 border-amber-500/30 bg-amber-500/10",
  Overdue: "text-rose-600 border-rose-500/30 bg-rose-500/10",
  "Not Applicable": "text-muted-foreground",
};

export default function ComplianceObligations() {
  const { data: obligations = [], isLoading: loadingObl } = useQuery({
    queryKey: ["compliance-obligations"],
    queryFn: fetchObligations,
  });
  const { data: filings = [], isLoading: loadingFil } = useQuery({
    queryKey: ["compliance-filings"],
    queryFn: fetchFilings,
  });
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [regFilter, setRegFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const rows = obligations.filter(
    (o) =>
      (regFilter === "all" || o.regulator === regFilter) &&
      (statusFilter === "all" || o.computedStatus === statusFilter),
  );

  const counts = useMemo(() => {
    const c = {
      Compliant: 0,
      Due: 0,
      Overdue: 0,
      "Not Applicable": 0,
    } as Record<string, number>;
    obligations.forEach((o) => {
      c[o.computedStatus] += 1;
    });
    return c;
  }, [obligations]);

  const current = obligations.find((o) => o._id === selected) ?? null;

  if (loadingObl || loadingFil)
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading regulatory obligations…
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Regulatory Obligations</h1>
          <p className="text-sm text-muted-foreground">
            Obligation register, per-filing tracker and traffic-light dashboard
            — calendar-driven, evidence-backed, management certified.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New obligation
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Compliant"
          value={counts.Compliant}
          icon={CheckCircle2}
          tone="from-emerald-500 to-teal-500"
        />
        <StatCard
          label="Due"
          value={counts.Due}
          icon={Clock}
          tone="from-amber-500 to-orange-500"
        />
        <StatCard
          label="Overdue"
          value={counts.Overdue}
          icon={AlertTriangle}
          tone="from-rose-500 to-red-500"
        />
        <StatCard
          label="Not applicable"
          value={counts["Not Applicable"]}
          icon={ShieldCheck}
          tone="from-slate-400 to-slate-600"
        />
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
          <TabsTrigger value="filings">Filing tracker</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4 space-y-4">
          <ObligationDashboard obligations={obligations} onOpen={setSelected} />
        </TabsContent>

        <TabsContent value="register" className="mt-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Select value={regFilter} onValueChange={setRegFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Regulator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All regulators</SelectItem>
                {REGULATORS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {["all", "Compliant", "Due", "Overdue", "Not Applicable"].map(
                  (r) => (
                    <SelectItem key={r} value={r}>
                      {r === "all" ? "All statuses" : r}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref</TableHead>
                    <TableHead>Obligation</TableHead>
                    <TableHead>Regulator</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Next due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((o) => (
                    <TableRow
                      key={o._id}
                      className="cursor-pointer"
                      onClick={() => setSelected(o._id)}
                    >
                      <TableCell className="text-xs text-muted-foreground">
                        {o.reference}
                      </TableCell>
                      <TableCell className="font-medium">{o.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{o.regulator}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{o.frequency}</TableCell>
                      <TableCell className="text-sm">{o.owner}</TableCell>
                      <TableCell
                        className={
                          o.computedStatus === "Overdue"
                            ? "text-rose-600 font-medium"
                            : ""
                        }
                      >
                        {o.nextDueDate.slice(0, 10)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={statusTone[o.computedStatus]}
                        >
                          {o.computedStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-sm text-muted-foreground py-8"
                      >
                        No obligations match.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filings" className="mt-4">
          <FilingTracker
            obligations={obligations}
            filings={filings}
            onOpen={setSelected}
          />
        </TabsContent>
      </Tabs>

      <NewObligationDialog open={newOpen} onOpenChange={setNewOpen} />
      {current && (
        <ObligationSheet
          obligation={current}
          filings={filings}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: any) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center shadow-sm`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="text-2xl font-bold leading-none">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ObligationDashboard({
  obligations,
  onOpen,
}: {
  obligations: ComplianceObligation[];
  onOpen: (id: string) => void;
}) {
  const byRegulator = useMemo(() => {
    const m = new Map<
      string,
      { total: number; overdue: number; due: number }
    >();
    obligations.forEach((o) => {
      const e = m.get(o.regulator) ?? { total: 0, overdue: 0, due: 0 };
      e.total += 1;
      if (o.computedStatus === "Overdue") e.overdue += 1;
      if (o.computedStatus === "Due") e.due += 1;
      m.set(o.regulator, e);
    });
    return [...m.entries()];
  }, [obligations]);

  const upcoming = obligations
    .filter((o) => o.computedStatus !== "Not Applicable")
    .slice()
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">By regulator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {byRegulator.map(([reg, e]) => {
            const healthy = e.total - e.overdue - e.due;
            return (
              <div key={reg} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{reg}</span>
                  <span className="text-xs text-muted-foreground">
                    {healthy} compliant · {e.due} due · {e.overdue} overdue
                  </span>
                </div>
                <div className="flex h-2 rounded overflow-hidden bg-muted">
                  <div
                    className="bg-emerald-500"
                    style={{ width: `${(healthy / e.total) * 100}%` }}
                  />
                  <div
                    className="bg-amber-500"
                    style={{ width: `${(e.due / e.total) * 100}%` }}
                  />
                  <div
                    className="bg-rose-500"
                    style={{ width: `${(e.overdue / e.total) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Deadline runway &amp; reminders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcoming.map((o) => {
            const d = daysUntil(o.nextDueDate.slice(0, 10));
            return (
              <div
                key={o._id}
                onClick={() => onOpen(o._id)}
                className="flex items-center justify-between border rounded p-2.5 text-sm cursor-pointer hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{o.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {o.regulator} · {o.owner}
                  </div>
                </div>
                <div className="text-right shrink-0 pl-3">
                  <div
                    className={
                      d < 0
                        ? "text-rose-600 font-medium"
                        : d <= 14
                          ? "text-amber-600 font-medium"
                          : ""
                    }
                  >
                    {d < 0 ? `${Math.abs(d)}d overdue` : `${d}d left`}
                  </div>
                  {o.activeReminderDays !== null && (
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end">
                      <BellRing className="h-3 w-3" />
                      {o.activeReminderDays}-day reminder active
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function FilingTracker({
  obligations,
  filings,
  onOpen,
}: {
  obligations: ComplianceObligation[];
  filings: Filing[];
  onOpen: (id: string) => void;
}) {
  const rows = filings
    .slice()
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Obligation</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Certification</TableHead>
              <TableHead>Completed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((f) => {
              const o = obligations.find((x) => x._id === f.obligationId);
              const pct =
                (FILING_STAGES.indexOf(f.stage) / (FILING_STAGES.length - 1)) *
                100;
              const late =
                f.dueDate.slice(0, 10) < todayStr() && f.stage !== "Completed";
              return (
                <TableRow
                  key={f._id}
                  className="cursor-pointer"
                  onClick={() => o && onOpen(o._id)}
                >
                  <TableCell className="font-medium">
                    {o?.title ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">{f.periodLabel}</TableCell>
                  <TableCell
                    className={late ? "text-rose-600 font-medium" : ""}
                  >
                    {f.dueDate.slice(0, 10)}
                  </TableCell>
                  <TableCell className="w-52">
                    <Progress value={pct} className="h-2" />
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {f.stage}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {f.evidence.length} file(s)
                  </TableCell>
                  <TableCell className="text-xs">
                    {f.certifiedBy
                      ? `${f.certifiedBy} · ${new Date(f.certifiedAt!).toLocaleDateString()}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {f.completedBy
                      ? `${f.completedBy} · ${new Date(f.completedAt!).toLocaleDateString()}`
                      : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function NewObligationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [f, setF] = useState({
    title: "",
    regulator: "BNR" as Regulator,
    entity: "",
    description: "",
    legalBasis: "",
    frequency: "Annual" as Frequency,
    nextDueDate: todayStr(),
    evidenceRequirements: "",
  });

  const mutation = useMutation({
    mutationFn: () => createObligation(f),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-obligations"] });
      queryClient.invalidateQueries({ queryKey: ["compliance-filings"] });
      toast({
        title: "Obligation created",
        description: "Calendar scheduled and first filing instance opened.",
      });
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast({
        title: "Failed to create obligation",
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
          <DialogTitle>New obligation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-2">
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
              <Label>Frequency</Label>
              <Select
                value={f.frequency}
                onValueChange={(v) => setF({ ...f, frequency: v as Frequency })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Next due date</Label>
              <Input
                type="date"
                value={f.nextDueDate}
                onChange={(e) => setF({ ...f, nextDueDate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>
              Entity{" "}
              <span className="text-xs text-muted-foreground">
                (defaults to your business name)
              </span>
            </Label>
            <Input
              placeholder="Defaults to your business name"
              value={f.entity}
              onChange={(e) => setF({ ...f, entity: e.target.value })}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          </div>
          <div>
            <Label>Legal basis</Label>
            <Input
              placeholder="Law / regulation and article"
              value={f.legalBasis}
              onChange={(e) => setF({ ...f, legalBasis: e.target.value })}
            />
          </div>
          <div>
            <Label>Evidence requirements</Label>
            <Textarea
              rows={2}
              value={f.evidenceRequirements}
              onChange={(e) =>
                setF({ ...f, evidenceRequirements: e.target.value })
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create & schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ObligationSheet({
  obligation,
  filings,
  onClose,
}: {
  obligation: ComplianceObligation;
  filings: Filing[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["compliance-obligations"] });
    queryClient.invalidateQueries({ queryKey: ["compliance-filings"] });
  };
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const [evFiles, setEvFiles] = useState<File[]>([]);
  const [evCategory, setEvCategory] = useState<EvidenceCategory>("Document");
  const [confirmTick, setConfirmTick] = useState(false);

  const obligationFilings = filings
    .filter((f) => f.obligationId === obligation._id)
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const open =
    obligationFilings.find((f) => f.stage !== "Completed") ??
    obligationFilings[0];

  const stageMut = useMutation({
    mutationFn: (stage: "In preparation" | "Evidence collected") =>
      setFilingStage(open!._id, stage),
    onSuccess: invalidate,
    onError: onErr("Failed to update stage"),
  });
  const evidenceMut = useMutation({
    mutationFn: () => addFilingEvidence(open!._id, evFiles, evCategory),
    onSuccess: () => {
      invalidate();
      setEvFiles([]);
    },
    onError: onErr("Failed to upload evidence"),
  });
  const certifyMut = useMutation({
    mutationFn: () => certifyFiling(open!._id),
    onSuccess: () => {
      invalidate();
      toast({
        title: "Certified",
        description: "Digital certification recorded with timestamp.",
      });
    },
    onError: onErr("Failed to certify"),
  });
  const completeMut = useMutation({
    mutationFn: () => completeFiling(open!._id),
    onSuccess: (data) => {
      invalidate();
      setConfirmTick(false);
      toast({
        title: "Filing closed",
        description: `Next cycle scheduled for ${data.obligation.nextDueDate.slice(0, 10)}.`,
      });
    },
    onError: onErr("Failed to complete filing"),
  });

  const st = obligation.computedStatus;

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{obligation.title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{obligation.reference}</Badge>
            <Badge variant="outline">{obligation.regulator}</Badge>
            <Badge variant="outline">{obligation.frequency}</Badge>
            <Badge variant="outline" className={statusTone[st]}>
              {st}
            </Badge>
          </div>

          <div className="text-sm">{obligation.description}</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Legal basis" value={obligation.legalBasis} />
            <Field label="Entity" value={obligation.entity} />
            <Field label="Owner" value={obligation.owner} />
            <Field label="Certifier" value={obligation.certifier} />
            <Field
              label="Next due"
              value={obligation.nextDueDate.slice(0, 10)}
            />
            <Field
              label="Reminders"
              value={obligation.reminderDays.map((d) => `${d}d`).join(" · ")}
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">
              Evidence requirements
            </div>
            <div className="text-sm">{obligation.evidenceRequirements}</div>
          </div>

          {open && (
            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4" />
                  Current filing — {open.periodLabel}
                </div>
                <Badge variant="outline">{open.stage}</Badge>
              </div>
              <Progress
                value={
                  (FILING_STAGES.indexOf(open.stage) /
                    (FILING_STAGES.length - 1)) *
                  100
                }
                className="h-2"
              />

              <div className="space-y-1">
                {open.evidence.map((e, i) => (
                  <div
                    key={i}
                    className="text-xs flex justify-between items-center gap-2 border rounded px-2 py-1"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {e.category}
                      </Badge>
                      {e.fileUrl ? (
                        <a
                          href={resolveComplianceFileUrl(e.fileUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline truncate"
                        >
                          {e.name}
                        </a>
                      ) : (
                        <span className="truncate">{e.name}</span>
                      )}
                    </div>
                    <span className="text-muted-foreground shrink-0">
                      {e.uploadedBy} ·{" "}
                      {new Date(e.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
                {open.evidence.length === 0 && (
                  <div className="text-xs text-muted-foreground">
                    No evidence uploaded yet.
                  </div>
                )}
              </div>
              {open.stage === "Not started" ? (
                <p className="text-xs text-muted-foreground">
                  Click "Mark in preparation" below before attaching evidence.
                </p>
              ) : open.stage === "In preparation" ? (
                <div className="flex gap-2 flex-wrap">
                  <Select
                    value={evCategory}
                    onValueChange={(v) => setEvCategory(v as EvidenceCategory)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVIDENCE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="flex-1 min-w-[160px]"
                    type="file"
                    multiple
                    onChange={(e) =>
                      setEvFiles(
                        e.target.files ? Array.from(e.target.files) : [],
                      )
                    }
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={evFiles.length === 0 || evidenceMut.isPending}
                    onClick={() => evidenceMut.mutate()}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    {evidenceMut.isPending ? "Uploading…" : "Add"}
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Evidence collection closed for this filing.
                </p>
              )}

              <div className="flex flex-wrap gap-2 border-t pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={stageMut.isPending || !!open.certifiedBy}
                  onClick={() => stageMut.mutate("In preparation")}
                >
                  Mark in preparation
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={stageMut.isPending || !!open.certifiedBy}
                  onClick={() => stageMut.mutate("Evidence collected")}
                >
                  Evidence complete
                </Button>
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="text-sm font-medium">
                  Management certification
                </div>
                {open.certifiedBy ? (
                  <div className="text-xs text-muted-foreground">
                    Certified by {open.certifiedBy} on{" "}
                    {new Date(open.certifiedAt!).toLocaleString()}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    disabled={certifyMut.isPending}
                    onClick={() => certifyMut.mutate()}
                  >
                    {certifyMut.isPending
                      ? "Certifying…"
                      : "Certify as logged-in user"}
                  </Button>
                )}
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="text-sm font-medium">Mark filing complete</div>
                <label className="flex gap-2 items-start text-xs">
                  <Checkbox
                    checked={confirmTick}
                    onCheckedChange={(v) => setConfirmTick(!!v)}
                    disabled={open.evidence.length === 0 || !open.certifiedBy}
                  />
                  <span>
                    I confirm this period's filing is complete and ready to
                    close — the next cycle will be scheduled automatically.
                  </span>
                </label>
                <Button
                  size="sm"
                  disabled={
                    !confirmTick ||
                    completeMut.isPending ||
                    open.evidence.length === 0 ||
                    !open.certifiedBy
                  }
                  onClick={() => completeMut.mutate()}
                >
                  {completeMut.isPending ? "Closing…" : "Mark filing complete"}
                </Button>
                {(open.evidence.length === 0 || !open.certifiedBy) && (
                  <p className="text-[11px] text-muted-foreground">
                    {open.evidence.length === 0 && "Evidence required. "}
                    {!open.certifiedBy && "Certification required."}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="border-t pt-3">
            <div className="font-medium text-sm mb-2">Filing history</div>
            <div className="space-y-2">
              {obligationFilings.map((f) => (
                <div
                  key={f._id}
                  className="text-xs border rounded px-2 py-1.5 space-y-1.5"
                >
                  <div className="flex justify-between">
                    <span className="font-medium">
                      {f.periodLabel} · due {f.dueDate.slice(0, 10)}
                    </span>
                    <span className="text-muted-foreground">
                      {f.stage}
                      {f.completedBy
                        ? ` · completed by ${f.completedBy} on ${new Date(f.completedAt!).toLocaleDateString()}`
                        : ""}
                    </span>
                  </div>
                  {f.evidence.length > 0 && (
                    <div className="space-y-1 pl-2">
                      {f.evidence.map((e, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center gap-2"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Badge
                              variant="outline"
                              className="text-[10px] shrink-0"
                            >
                              {e.category}
                            </Badge>
                            {e.fileUrl ? (
                              <a
                                href={resolveComplianceFileUrl(e.fileUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline truncate"
                              >
                                {e.name}
                              </a>
                            ) : (
                              <span className="truncate">{e.name}</span>
                            )}
                          </div>
                          <span className="text-muted-foreground shrink-0">
                            {e.uploadedBy}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {obligationFilings.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  No filing history yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div>{value || "—"}</div>
    </div>
  );
}
