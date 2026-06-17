import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gavel, Plus, AlertTriangle, CheckCircle2, Clock, Search } from "lucide-react";
import { toast } from "sonner";

type Stage = "Filed" | "Investigation" | "Mediation" | "Hearing" | "Resolved" | "Escalated";
type Severity = "Low" | "Medium" | "High";

interface Dispute {
  id: string;
  employee: string;
  type: "Grievance" | "Disciplinary" | "Harassment" | "Performance" | "Other";
  title: string;
  description: string;
  filedBy: string;
  filedOn: string;
  severity: Severity;
  stage: Stage;
  assignee: string;
  resolution?: string;
}

const SEED: Dispute[] = [
  {
    id: "DSP-001",
    employee: "Adaeze Okonkwo",
    type: "Grievance",
    title: "Unfair shift allocation",
    description: "Repeatedly assigned weekend shifts beyond rota policy.",
    filedBy: "Adaeze Okonkwo",
    filedOn: "2026-05-22",
    severity: "Medium",
    stage: "Investigation",
    assignee: "HR — Sarah Lee",
  },
  {
    id: "DSP-002",
    employee: "Tariq Hassan",
    type: "Disciplinary",
    title: "Repeated lateness",
    description: "Six late arrivals in May exceeding policy threshold.",
    filedBy: "Manager — Joel K.",
    filedOn: "2026-06-02",
    severity: "Low",
    stage: "Hearing",
    assignee: "HR — Sarah Lee",
  },
  {
    id: "DSP-003",
    employee: "Marie Uwase",
    type: "Harassment",
    title: "Verbal misconduct from peer",
    description: "Formal complaint filed; witness statements collected.",
    filedBy: "Marie Uwase",
    filedOn: "2026-05-10",
    severity: "High",
    stage: "Mediation",
    assignee: "HR Director",
  },
];

const STAGES: Stage[] = ["Filed", "Investigation", "Mediation", "Hearing", "Resolved", "Escalated"];

const stageTone: Record<Stage, string> = {
  Filed: "bg-muted text-muted-foreground border-border",
  Investigation: "bg-info/10 text-info border-info/20",
  Mediation: "bg-primary/10 text-primary border-primary/20",
  Hearing: "bg-warning/10 text-warning border-warning/20",
  Resolved: "bg-success/10 text-success border-success/20",
  Escalated: "bg-destructive/10 text-destructive border-destructive/20",
};

const sevTone: Record<Severity, string> = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-warning/10 text-warning border-warning/20",
  High: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function HRDisputes() {
  const [items, setItems] = useState<Dispute[]>(SEED);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    employee: "",
    type: "Grievance" as Dispute["type"],
    title: "",
    description: "",
    severity: "Medium" as Severity,
    assignee: "",
  });

  const filtered = useMemo(
    () =>
      items.filter(
        (d) =>
          (stage === "all" || d.stage === stage) &&
          (!search ||
            d.employee.toLowerCase().includes(search.toLowerCase()) ||
            d.title.toLowerCase().includes(search.toLowerCase())),
      ),
    [items, search, stage],
  );

  const stats = {
    open: items.filter((d) => d.stage !== "Resolved").length,
    high: items.filter((d) => d.severity === "High" && d.stage !== "Resolved").length,
    mediation: items.filter((d) => d.stage === "Mediation").length,
    resolved: items.filter((d) => d.stage === "Resolved").length,
  };

  const create = () => {
    if (!form.employee || !form.title) return toast.error("Employee and title required.");
    setItems([
      {
        id: `DSP-${String(items.length + 1).padStart(3, "0")}`,
        ...form,
        filedBy: "HR Admin",
        filedOn: new Date().toISOString().slice(0, 10),
        stage: "Filed",
      },
      ...items,
    ]);
    setOpen(false);
    setForm({ employee: "", type: "Grievance", title: "", description: "", severity: "Medium", assignee: "" });
    toast.success("Dispute filed.");
  };

  const advance = (d: Dispute, next: Stage) => {
    setItems(items.map((x) => (x.id === d.id ? { ...x, stage: next } : x)));
    toast.success(`Moved to ${next}.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dispute Management</h1>
          <p className="text-sm text-muted-foreground">
            Capture grievances, disciplinary actions and mediation outcomes — end to end.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-secondary">
              <Plus className="h-4 w-4 mr-2" /> New Case
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>File a Dispute</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Employee</Label>
                  <Input value={form.employee} onChange={(e) => setForm({ ...form, employee: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Grievance", "Disciplinary", "Harassment", "Performance", "Other"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Severity</Label>
                  <Select value={form.severity} onValueChange={(v: any) => setForm({ ...form, severity: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Low", "Medium", "High"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Assigned to</Label>
                  <Input value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={create} className="bg-gradient-to-r from-primary to-secondary">File Case</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Open" value={stats.open} icon={Gavel} tone="from-primary to-secondary" />
        <Stat label="High severity" value={stats.high} icon={AlertTriangle} tone="from-rose-500 to-red-600" />
        <Stat label="In mediation" value={stats.mediation} icon={Clock} tone="from-amber-500 to-orange-500" />
        <Stat label="Resolved" value={stats.resolved} icon={CheckCircle2} tone="from-emerald-500 to-teal-500" />
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by employee or title…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All stages" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="board">Board</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-3 mt-4">
          {filtered.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No cases match your filters.</CardContent></Card>
          ) : (
            filtered.map((d) => (
              <Card key={d.id}>
                <CardContent className="p-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{d.title}</p>
                      <Badge variant="outline" className={sevTone[d.severity]}>{d.severity}</Badge>
                      <Badge variant="outline">{d.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {d.employee} · filed {d.filedOn} by {d.filedBy} · assigned to {d.assignee}
                    </p>
                    <p className="text-sm mt-2">{d.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline" className={stageTone[d.stage]}>{d.stage}</Badge>
                    <Select value={d.stage} onValueChange={(v: Stage) => advance(d, v)}>
                      <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="board" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {STAGES.map((s) => (
              <Card key={s}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>{s}</span>
                    <Badge variant="outline">{items.filter((d) => d.stage === s).length}</Badge>
                  </div>
                  {items.filter((d) => d.stage === s).map((d) => (
                    <div key={d.id} className="border rounded-md p-2 text-xs space-y-1">
                      <p className="font-medium">{d.title}</p>
                      <p className="text-muted-foreground">{d.employee}</p>
                      <Badge variant="outline" className={`${sevTone[d.severity]} text-[10px]`}>{d.severity}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: any; icon: any; tone: string }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </CardContent>
    </Card>
  );
}
