import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Plus, Upload, ShieldCheck, AlertTriangle, Clock, CheckCircle2, BellRing, FileCheck2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useCompliance, mutateCompliance, id, REGULATORS, FREQUENCIES,
  ComplianceObligation, Filing, FILING_STAGES, FilingStage,
  obligationStatus, daysUntil, activeReminder, nextDueAfter, periodLabelFor, todayStr,
} from "@/lib/complianceStore";

const statusTone: Record<string, string> = {
  Compliant: "text-emerald-600 border-emerald-500/30 bg-emerald-500/10",
  Due: "text-amber-600 border-amber-500/30 bg-amber-500/10",
  Overdue: "text-rose-600 border-rose-500/30 bg-rose-500/10",
  "Not Applicable": "text-muted-foreground",
};

export default function ComplianceObligations() {
  const s = useCompliance();
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [regFilter, setRegFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const rows = s.obligations.filter(
    (o) =>
      (regFilter === "all" || o.regulator === regFilter) &&
      (statusFilter === "all" || obligationStatus(o) === statusFilter),
  );

  const counts = useMemo(() => {
    const c = { Compliant: 0, Due: 0, Overdue: 0, "Not Applicable": 0 } as Record<string, number>;
    s.obligations.forEach((o) => { c[obligationStatus(o)] += 1; });
    return c;
  }, [s.obligations]);

  const current = s.obligations.find((o) => o.id === selected) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Regulatory Obligations</h1>
          <p className="text-sm text-muted-foreground">
            Obligation register, per-filing tracker and traffic-light dashboard — calendar-driven, evidence-backed, management certified.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />New obligation
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Compliant" value={counts.Compliant} icon={CheckCircle2} tone="from-emerald-500 to-teal-500" />
        <StatCard label="Due" value={counts.Due} icon={Clock} tone="from-amber-500 to-orange-500" />
        <StatCard label="Overdue" value={counts.Overdue} icon={AlertTriangle} tone="from-rose-500 to-red-500" />
        <StatCard label="Not applicable" value={counts["Not Applicable"]} icon={ShieldCheck} tone="from-slate-400 to-slate-600" />
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
          <TabsTrigger value="filings">Filing tracker</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4 space-y-4">
          <ObligationDashboard onOpen={setSelected} />
        </TabsContent>

        <TabsContent value="register" className="mt-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Select value={regFilter} onValueChange={setRegFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Regulator" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All regulators</SelectItem>
                {REGULATORS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {["all", "Compliant", "Due", "Overdue", "Not Applicable"].map((r) => (
                  <SelectItem key={r} value={r}>{r === "all" ? "All statuses" : r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Card><CardContent className="p-0"><Table>
            <TableHeader><TableRow>
              <TableHead>Ref</TableHead><TableHead>Obligation</TableHead><TableHead>Regulator</TableHead>
              <TableHead>Frequency</TableHead><TableHead>Owner</TableHead><TableHead>Next due</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((o) => {
                const st = obligationStatus(o);
                return (
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => setSelected(o.id)}>
                    <TableCell className="text-xs text-muted-foreground">{o.reference}</TableCell>
                    <TableCell className="font-medium">{o.title}</TableCell>
                    <TableCell><Badge variant="outline">{o.regulator}</Badge></TableCell>
                    <TableCell className="text-sm">{o.frequency}</TableCell>
                    <TableCell className="text-sm">{o.owner}</TableCell>
                    <TableCell className={st === "Overdue" ? "text-rose-600 font-medium" : ""}>{o.nextDueDate}</TableCell>
                    <TableCell><Badge variant="outline" className={statusTone[st]}>{st}</Badge></TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">No obligations match.</TableCell></TableRow>
              )}
            </TableBody>
          </Table></CardContent></Card>
        </TabsContent>

        <TabsContent value="filings" className="mt-4">
          <FilingTracker onOpen={setSelected} />
        </TabsContent>
      </Tabs>

      <NewObligationDialog open={newOpen} onOpenChange={setNewOpen} />
      <ObligationSheet obligation={current} onClose={() => setSelected(null)} />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: any) {
  return (
    <Card><CardContent className="p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center shadow-sm`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold leading-none">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </div>
    </CardContent></Card>
  );
}

function ObligationDashboard({ onOpen }: { onOpen: (id: string) => void }) {
  const s = useCompliance();
  const byRegulator = useMemo(() => {
    const m = new Map<string, { total: number; overdue: number; due: number }>();
    s.obligations.forEach((o) => {
      const st = obligationStatus(o);
      const e = m.get(o.regulator) ?? { total: 0, overdue: 0, due: 0 };
      e.total += 1;
      if (st === "Overdue") e.overdue += 1;
      if (st === "Due") e.due += 1;
      m.set(o.regulator, e);
    });
    return [...m.entries()];
  }, [s.obligations]);

  const upcoming = s.obligations
    .filter((o) => obligationStatus(o) !== "Not Applicable")
    .slice()
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">By regulator</CardTitle></CardHeader>
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
                  <div className="bg-emerald-500" style={{ width: `${(healthy / e.total) * 100}%` }} />
                  <div className="bg-amber-500" style={{ width: `${(e.due / e.total) * 100}%` }} />
                  <div className="bg-rose-500" style={{ width: `${(e.overdue / e.total) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Deadline runway &amp; reminders</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {upcoming.map((o) => {
            const d = daysUntil(o.nextDueDate);
            const rem = activeReminder(o);
            return (
              <div key={o.id} onClick={() => onOpen(o.id)}
                className="flex items-center justify-between border rounded p-2.5 text-sm cursor-pointer hover:bg-muted/40">
                <div className="min-w-0">
                  <div className="font-medium truncate">{o.title}</div>
                  <div className="text-xs text-muted-foreground">{o.regulator} · {o.owner}</div>
                </div>
                <div className="text-right shrink-0 pl-3">
                  <div className={d < 0 ? "text-rose-600 font-medium" : d <= 14 ? "text-amber-600 font-medium" : ""}>
                    {d < 0 ? `${Math.abs(d)}d overdue` : `${d}d left`}
                  </div>
                  {rem !== null && (
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end">
                      <BellRing className="h-3 w-3" />{rem}-day reminder active
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

function FilingTracker({ onOpen }: { onOpen: (id: string) => void }) {
  const s = useCompliance();
  const rows = s.filings.slice().sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  return (
    <Card><CardContent className="p-0"><Table>
      <TableHeader><TableRow>
        <TableHead>Obligation</TableHead><TableHead>Period</TableHead><TableHead>Due</TableHead>
        <TableHead>Progress</TableHead><TableHead>Evidence</TableHead><TableHead>Certification</TableHead><TableHead>Receipt</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {rows.map((f) => {
          const o = s.obligations.find((x) => x.id === f.obligationId);
          const pct = ((FILING_STAGES.indexOf(f.stage)) / (FILING_STAGES.length - 1)) * 100;
          const late = f.dueDate < todayStr() && f.stage !== "Receipt confirmed";
          return (
            <TableRow key={f.id} className="cursor-pointer" onClick={() => o && onOpen(o.id)}>
              <TableCell className="font-medium">{o?.title ?? "—"}</TableCell>
              <TableCell className="text-sm">{f.periodLabel}</TableCell>
              <TableCell className={late ? "text-rose-600 font-medium" : ""}>{f.dueDate}</TableCell>
              <TableCell className="w-52">
                <Progress value={pct} className="h-2" />
                <div className="text-[11px] text-muted-foreground mt-1">{f.stage}</div>
              </TableCell>
              <TableCell className="text-sm">{f.evidence.length} file(s)</TableCell>
              <TableCell className="text-xs">{f.certifiedBy ? `${f.certifiedBy} · ${new Date(f.certifiedAt!).toLocaleDateString()}` : "—"}</TableCell>
              <TableCell className="text-xs">{f.receiptRef ?? "—"}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table></CardContent></Card>
  );
}

function NewObligationDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const s = useCompliance();
  const [f, setF] = useState({
    title: "", regulator: "BNR", entity: "Lexora Africa Ltd", description: "", legalBasis: "",
    frequency: "Annual", nextDueDate: todayStr(), evidenceRequirements: "", owner: "", certifier: "",
  });

  const submit = () => {
    if (!f.title) return toast({ title: "Title required", variant: "destructive" });
    const oid = id("cobl");
    const ref = `OBL-${String(s.obligations.length + 1).padStart(3, "0")}`;
    mutateCompliance((st) => ({
      ...st,
      obligations: [
        {
          id: oid, reference: ref, ...f,
          regulator: f.regulator as any, frequency: f.frequency as any,
          reminderDays: [90, 60, 30, 14, 7],
          status: "Due", createdAt: new Date().toISOString(),
        },
        ...st.obligations,
      ],
      filings: [
        {
          id: id("fil"), obligationId: oid,
          periodLabel: periodLabelFor(f.nextDueDate, f.frequency as any),
          dueDate: f.nextDueDate, stage: "Not started", evidence: [],
        },
        ...st.filings,
      ],
    }));
    toast({ title: "Obligation created", description: "Calendar scheduled and first filing instance opened." });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New obligation</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          <div><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Regulator</Label>
              <Select value={f.regulator} onValueChange={(v) => setF({ ...f, regulator: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REGULATORS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Frequency</Label>
              <Select value={f.frequency} onValueChange={(v) => setF({ ...f, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FREQUENCIES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Next due date</Label><Input type="date" value={f.nextDueDate} onChange={(e) => setF({ ...f, nextDueDate: e.target.value })} /></div>
          </div>
          <div><Label>Entity</Label><Input value={f.entity} onChange={(e) => setF({ ...f, entity: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div><Label>Legal basis</Label><Input placeholder="Law / regulation and article" value={f.legalBasis} onChange={(e) => setF({ ...f, legalBasis: e.target.value })} /></div>
          <div><Label>Evidence requirements</Label><Textarea rows={2} value={f.evidenceRequirements} onChange={(e) => setF({ ...f, evidenceRequirements: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Owner</Label><Input value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} /></div>
            <div><Label>Certifier</Label><Input value={f.certifier} onChange={(e) => setF({ ...f, certifier: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter><Button onClick={submit}>Create &amp; schedule</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ObligationSheet({ obligation, onClose }: { obligation: ComplianceObligation | null; onClose: () => void }) {
  const s = useCompliance();
  const [evName, setEvName] = useState("");
  const [signer, setSigner] = useState("");
  const [receipt, setReceipt] = useState("");
  if (!obligation) return null;

  const filings = s.filings
    .filter((f) => f.obligationId === obligation.id)
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const open = filings.find((f) => f.stage !== "Receipt confirmed") ?? filings[0];

  const patchFiling = (fid: string, p: Partial<Filing>) =>
    mutateCompliance((st) => ({ ...st, filings: st.filings.map((f) => (f.id === fid ? { ...f, ...p } : f)) }));

  const setStage = (stage: FilingStage) => open && patchFiling(open.id, { stage });

  const certify = () => {
    if (!open) return;
    if (!signer) return toast({ title: "Certifier name required", variant: "destructive" });
    patchFiling(open.id, { stage: "Certified", certifiedBy: signer, certifiedAt: new Date().toISOString() });
    toast({ title: "Certified", description: "Digital certification recorded with timestamp." });
  };

  const confirmReceipt = () => {
    if (!open) return;
    if (!receipt) return toast({ title: "Receipt reference required", variant: "destructive" });
    patchFiling(open.id, { stage: "Receipt confirmed", submittedAt: new Date().toISOString(), receiptRef: receipt });
    const next = nextDueAfter(obligation.nextDueDate, obligation.frequency);
    mutateCompliance((st) => ({
      ...st,
      obligations: st.obligations.map((o) =>
        o.id === obligation.id ? { ...o, status: "Compliant", nextDueDate: next } : o),
      filings: [
        { id: id("fil"), obligationId: obligation.id, periodLabel: periodLabelFor(next, obligation.frequency), dueDate: next, stage: "Not started", evidence: [] },
        ...st.filings,
      ],
    }));
    setReceipt("");
    toast({ title: "Filing closed", description: `Next cycle scheduled for ${next}.` });
  };

  const st = obligationStatus(obligation);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader><SheetTitle>{obligation.title}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{obligation.reference}</Badge>
            <Badge variant="outline">{obligation.regulator}</Badge>
            <Badge variant="outline">{obligation.frequency}</Badge>
            <Badge variant="outline" className={statusTone[st]}>{st}</Badge>
          </div>

          <div className="text-sm">{obligation.description}</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Legal basis" value={obligation.legalBasis} />
            <Field label="Entity" value={obligation.entity} />
            <Field label="Owner" value={obligation.owner} />
            <Field label="Certifier" value={obligation.certifier} />
            <Field label="Next due" value={obligation.nextDueDate} />
            <Field label="Reminders" value={obligation.reminderDays.map((d) => `${d}d`).join(" · ")} />
          </div>
          <div><div className="text-xs text-muted-foreground">Evidence requirements</div><div className="text-sm">{obligation.evidenceRequirements}</div></div>

          {open && (
            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm flex items-center gap-2"><FileCheck2 className="h-4 w-4" />Current filing — {open.periodLabel}</div>
                <Badge variant="outline">{open.stage}</Badge>
              </div>
              <Progress value={(FILING_STAGES.indexOf(open.stage) / (FILING_STAGES.length - 1)) * 100} className="h-2" />

              <div className="space-y-1">
                {open.evidence.map((e) => (
                  <div key={e.id} className="text-xs flex justify-between border rounded px-2 py-1">
                    <span>{e.name}</span>
                    <span className="text-muted-foreground">{e.uploadedBy} · {new Date(e.uploadedAt).toLocaleDateString()}</span>
                  </div>
                ))}
                {open.evidence.length === 0 && <div className="text-xs text-muted-foreground">No evidence uploaded yet.</div>}
              </div>
              <div className="flex gap-2">
                <Input value={evName} onChange={(e) => setEvName(e.target.value)} placeholder="Evidence file name" />
                <Button size="sm" variant="outline" onClick={() => {
                  if (!evName) return;
                  patchFiling(open.id, {
                    evidence: [...open.evidence, { id: id("ev"), name: evName, uploadedAt: new Date().toISOString(), uploadedBy: obligation.owner }],
                    stage: open.stage === "Not started" ? "In preparation" : open.stage,
                  });
                  setEvName("");
                }}><Upload className="h-4 w-4 mr-1" />Add</Button>
              </div>

              <div className="flex flex-wrap gap-2 border-t pt-3">
                <Button size="sm" variant="outline" onClick={() => setStage("In preparation")}>Mark in preparation</Button>
                <Button size="sm" variant="outline" onClick={() => setStage("Evidence collected")}>Evidence complete</Button>
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="text-sm font-medium">Management certification</div>
                <div className="flex gap-2">
                  <Input value={signer} onChange={(e) => setSigner(e.target.value)} placeholder={obligation.certifier || "Certifier name"} />
                  <Button size="sm" onClick={certify}>Certify</Button>
                </div>
                {open.certifiedBy && (
                  <div className="text-xs text-muted-foreground">
                    Certified by {open.certifiedBy} on {new Date(open.certifiedAt!).toLocaleString()}
                  </div>
                )}
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="text-sm font-medium">Submission &amp; regulator receipt</div>
                <div className="flex gap-2">
                  <Input value={receipt} onChange={(e) => setReceipt(e.target.value)} placeholder="Regulator receipt reference" />
                  <Button size="sm" onClick={confirmReceipt}>Confirm receipt</Button>
                </div>
              </div>
            </div>
          )}

          <div className="border-t pt-3">
            <div className="font-medium text-sm mb-2">Filing history</div>
            <div className="space-y-1">
              {filings.map((f) => (
                <div key={f.id} className="text-xs flex justify-between border rounded px-2 py-1.5">
                  <span>{f.periodLabel} · due {f.dueDate}</span>
                  <span className="text-muted-foreground">{f.stage}{f.receiptRef ? ` · ${f.receiptRef}` : ""}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div><div className="text-xs text-muted-foreground">{label}</div><div>{value || "—"}</div></div>
  );
}
