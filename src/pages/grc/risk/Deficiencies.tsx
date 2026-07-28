import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Plus,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Repeat,
  Trash2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { EvidenceSignOff } from "@/components/grc/EvidenceSignOff";
import {
  useRiskProgramme,
  RISK_CATEGORY_LIST,
  SEVERITIES,
  REMEDIATION_DAYS,
  severityTone,
  defStatusTone,
  daysUntil,
  type Deficiency,
  type DeficiencyOrigin,
  type DefStatus,
  type ProgCategory,
  type Severity,
} from "@/lib/grc/riskProgrammeStore";

const ORIGINS: DeficiencyOrigin[] = [
  "Control test",
  "Incident investigation",
  "Audit finding",
];
const STATUSES: DefStatus[] = [
  "Open",
  "Plan agreed",
  "In remediation",
  "Awaiting validation",
  "Closed",
];

export default function GrcDeficiencies({
  embedded = false,
}: {
  embedded?: boolean;
} = {}) {
  const store = useRiskProgramme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "overdue" | "closed">(
    "all",
  );

  const selected =
    store.deficiencies.find((d) => d.id === selectedId) ?? null;

  const open = store.deficiencies.filter((d) => d.status !== "Closed");
  const overdue = open.filter((d) => daysUntil(d.deadline) < 0);
  const closed = store.deficiencies.filter((d) => d.status === "Closed");

  const list = useMemo(() => {
    if (filter === "open") return open;
    if (filter === "overdue") return overdue;
    if (filter === "closed") return closed;
    return store.deficiencies;
  }, [filter, store.deficiencies, open, overdue, closed]);

  const recurring = useMemo(() => {
    const byCause = new Map<string, number>();
    store.deficiencies.forEach((d) => {
      const key = d.rootCause.trim().toLowerCase().slice(0, 40);
      if (!key) return;
      byCause.set(key, (byCause.get(key) ?? 0) + 1);
    });
    return Array.from(byCause.entries()).filter(([, n]) => n > 1);
  }, [store.deficiencies]);

  const [form, setForm] = useState({
    title: "",
    origin: "Audit finding" as DeficiencyOrigin,
    sourceRef: "",
    category: "Operational" as ProgCategory,
    severity: "Medium" as Severity,
    rootCause: "",
    owner: "",
  });

  const create = () => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    store.addDeficiency(form);
    setOpenNew(false);
    setForm({
      title: "",
      origin: "Audit finding",
      sourceRef: "",
      category: "Operational",
      severity: "Medium",
      rootCause: "",
      owner: "",
    });
    toast({
      title: "Deficiency logged",
      description: `Remediation deadline set at ${REMEDIATION_DAYS[form.severity]} days.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {!embedded && <h1 className="text-2xl font-bold">Deficiencies</h1>}
          <p className="text-sm text-muted-foreground">
            One remediation cycle for control test failures, incident findings,
            and audit findings. Evidence and validation are required before
            closure.
          </p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Log deficiency
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log a deficiency</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Origin</Label>
                  <Select
                    value={form.origin}
                    onValueChange={(v) =>
                      setForm({ ...form, origin: v as DeficiencyOrigin })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORIGINS.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Source reference</Label>
                  <Input
                    value={form.sourceRef}
                    onChange={(e) =>
                      setForm({ ...form, sourceRef: e.target.value })
                    }
                    placeholder="e.g. CTL-004 / INC-2026-014"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) =>
                      setForm({ ...form, category: v as ProgCategory })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RISK_CATEGORY_LIST.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Severity</Label>
                  <Select
                    value={form.severity}
                    onValueChange={(v) =>
                      setForm({ ...form, severity: v as Severity })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s} — {REMEDIATION_DAYS[s]} days
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Root cause</Label>
                <Textarea
                  rows={3}
                  value={form.rootCause}
                  onChange={(e) =>
                    setForm({ ...form, rootCause: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Owner</Label>
                <Input
                  value={form.owner}
                  onChange={(e) => setForm({ ...form, owner: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={create}>Log deficiency</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat
          icon={<ShieldAlert className="h-4 w-4" />}
          label="Open"
          value={open.length}
          tone="from-rose-500 to-orange-500"
          onClick={() => setFilter("open")}
        />
        <Stat
          icon={<Clock className="h-4 w-4" />}
          label="Overdue"
          value={overdue.length}
          tone="from-amber-500 to-yellow-500"
          onClick={() => setFilter("overdue")}
        />
        <Stat
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Closed"
          value={closed.length}
          tone="from-emerald-500 to-teal-500"
          onClick={() => setFilter("closed")}
        />
        <Stat
          icon={<Repeat className="h-4 w-4" />}
          label="Recurring causes"
          value={recurring.length}
          tone="from-violet-500 to-fuchsia-500"
          onClick={() => setFilter("all")}
        />
      </div>

      <Tabs defaultValue="register">
        <TabsList>
          <TabsTrigger value="register">Register</TabsTrigger>
          <TabsTrigger value="trends">Trend analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-3">
          <div className="flex gap-2">
            {(["all", "open", "overdue", "closed"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                className="capitalize"
                onClick={() => setFilter(f)}
              >
                {f}
              </Button>
            ))}
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref</TableHead>
                    <TableHead>Deficiency</TableHead>
                    <TableHead>Origin</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((d) => {
                    const late =
                      d.status !== "Closed" && daysUntil(d.deadline) < 0;
                    return (
                      <TableRow
                        key={d.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedId(d.id)}
                      >
                        <TableCell className="font-mono text-xs">
                          {d.reference}
                        </TableCell>
                        <TableCell className="font-medium">{d.title}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {d.origin}
                          <div>{d.sourceRef}</div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={severityTone(d.severity)}
                          >
                            {d.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>{d.owner || "—"}</TableCell>
                        <TableCell
                          className={late ? "text-rose-600 font-medium" : ""}
                        >
                          {new Date(d.deadline).toLocaleDateString()}
                          {late && " · overdue"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={defStatusTone(d.status)}
                          >
                            {d.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {list.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-sm text-muted-foreground py-10"
                      >
                        Nothing in this view.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By severity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {SEVERITIES.map((s) => {
                  const n = store.deficiencies.filter(
                    (d) => d.severity === s,
                  ).length;
                  const pct = store.deficiencies.length
                    ? (n / store.deficiencies.length) * 100
                    : 0;
                  return (
                    <div key={s} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{s}</span>
                        <span className="text-muted-foreground">{n}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By origin</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {ORIGINS.map((o) => {
                  const n = store.deficiencies.filter(
                    (d) => d.origin === o,
                  ).length;
                  return (
                    <div
                      key={o}
                      className="flex justify-between text-sm border rounded-md px-3 py-2"
                    >
                      <span>{o}</span>
                      <span className="font-medium">{n}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {RISK_CATEGORY_LIST.map((c) => {
                  const n = store.deficiencies.filter(
                    (d) => d.category === c,
                  ).length;
                  if (!n) return null;
                  return (
                    <div
                      key={c}
                      className="flex justify-between text-sm border rounded-md px-3 py-2"
                    >
                      <span>{c}</span>
                      <span className="font-medium">{n}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ageing (open items)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "0–30 days", min: 0, max: 30 },
                  { label: "31–90 days", min: 31, max: 90 },
                  { label: "90+ days", min: 91, max: 100000 },
                ].map((b) => {
                  const n = open.filter((d) => {
                    const age = Math.floor(
                      (Date.now() - new Date(d.loggedAt).getTime()) / 864e5,
                    );
                    return age >= b.min && age <= b.max;
                  }).length;
                  return (
                    <div
                      key={b.label}
                      className="flex justify-between text-sm border rounded-md px-3 py-2"
                    >
                      <span>{b.label}</span>
                      <span className="font-medium">{n}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
          {recurring.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-4 text-sm">
                <p className="font-medium text-amber-800">
                  Recurring root causes flagged for systemic remediation
                </p>
                <ul className="list-disc pl-5 mt-1 text-muted-foreground">
                  {recurring.map(([cause, n]) => (
                    <li key={cause}>
                      “{cause}…” — {n} occurrences
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <DeficiencySheet
        deficiency={selected}
        store={store}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: string;
  onClick: () => void;
}) {
  return (
    <Card className="cursor-pointer hover:shadow-sm transition" onClick={onClick}>
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className={`h-9 w-9 rounded-lg bg-gradient-to-br ${tone} text-white flex items-center justify-center`}
        >
          {icon}
        </div>
        <div>
          <div className="text-xl font-bold leading-none">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function DeficiencySheet({
  deficiency,
  store,
  onClose,
}: {
  deficiency: Deficiency | null;
  store: ReturnType<typeof useRiskProgramme>;
  onClose: () => void;
}) {
  const [validator, setValidator] = useState("");
  if (!deficiency) return null;
  const d = deficiency;
  const late = d.status !== "Closed" && daysUntil(d.deadline) < 0;

  return (
    <Sheet open={!!d} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="pr-8">
            {d.reference} — {d.title}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={severityTone(d.severity)}>
              {d.severity} · {REMEDIATION_DAYS[d.severity]}-day
            </Badge>
            <Badge variant="outline" className={defStatusTone(d.status)}>
              {d.status}
            </Badge>
            <Badge variant="outline">{d.origin}</Badge>
            <Badge variant="outline">{d.category}</Badge>
            {late && (
              <Badge
                variant="outline"
                className="bg-rose-100 text-rose-700 border-rose-200"
              >
                Overdue — escalated
              </Badge>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            Source: {d.sourceRef || "—"} · Logged{" "}
            {new Date(d.loggedAt).toLocaleDateString()} · Deadline{" "}
            {new Date(d.deadline).toLocaleDateString()}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Severity</Label>
              <Select
                value={d.severity}
                onValueChange={(v) =>
                  store.updateDeficiency(d.id, { severity: v as Severity })
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select
                value={d.status}
                onValueChange={(v) =>
                  store.updateDeficiency(d.id, { status: v as DefStatus })
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Owner</Label>
            <Input
              className="h-8"
              value={d.owner}
              onChange={(e) =>
                store.updateDeficiency(d.id, { owner: e.target.value })
              }
            />
          </div>

          <div>
            <Label className="text-xs">Root cause</Label>
            <Textarea
              rows={2}
              value={d.rootCause}
              onChange={(e) =>
                store.updateDeficiency(d.id, { rootCause: e.target.value })
              }
            />
          </div>

          <div>
            <Label className="text-xs">Remediation plan</Label>
            <Textarea
              rows={3}
              value={d.plan}
              placeholder="Actions, milestones and deadline"
              onChange={(e) =>
                store.updateDeficiency(d.id, {
                  plan: e.target.value,
                  status: d.status === "Open" ? "Plan agreed" : d.status,
                })
              }
            />
          </div>

          <div>
            <Label className="text-xs">Management response</Label>
            <Textarea
              rows={2}
              value={d.managementResponse}
              onChange={(e) =>
                store.updateDeficiency(d.id, {
                  managementResponse: e.target.value,
                })
              }
            />
          </div>

          <section className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-semibold">
              Evidence & validation close-out
            </h3>
            <EvidenceSignOff
              evidence={d.evidence}
              onUpload={(items) => store.addDeficiencyEvidence(d.id, items)}
              signedBy={d.validatedBy}
              signedAt={d.validatedAt}
              validator={validator}
              onValidatorChange={setValidator}
              onSignOff={() => {
                store.validateDeficiency(d.id, validator);
                setValidator("");
                toast({ title: "Deficiency closed" });
              }}
            />
          </section>

          <Button
            variant="ghost"
            className="text-destructive"
            onClick={() => {
              store.deleteDeficiency(d.id);
              onClose();
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
