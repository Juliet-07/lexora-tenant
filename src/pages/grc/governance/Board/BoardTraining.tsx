import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { GraduationCap, Plus, Trash2, CheckCircle2, Clock, AlertTriangle, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { fetchBoardMembers } from "@/lib/grc/governance-api";
import { usePersistentState, uid, fmtDate } from "@/lib/grc/usePersistentState";
import { TrainingModulesTab } from "@/components/grc/BoardTrainingModules";

type Category = "Governance" | "Regulatory" | "Risk" | "ESG" | "Cyber" | "Finance" | "Ethics";
const CATEGORIES: Category[] = ["Governance", "Regulatory", "Risk", "ESG", "Cyber", "Finance", "Ethics"];

interface Training {
  id: string;
  title: string;
  description: string;
  category: Category;
  provider: string;
  format: "In-person" | "Online" | "Self-paced";
  cpdHours: number;
  dueDate: string;
  mandatory: boolean;
  assignedTo: string[]; // member ids; empty = all members
  createdAt: string;
}
interface Completion {
  trainingId: string;
  memberId: string;
  completedAt: string;
}

interface Member {
  id: string;
  name: string;
  role: string;
}

const DEMO_MEMBERS: Member[] = [
  { id: "demo-1", name: "Amara Okafor", role: "Chair" },
  { id: "demo-2", name: "Kwame Mensah", role: "Independent Director" },
  { id: "demo-3", name: "Thandiwe Ndlovu", role: "Non-Executive Director" },
  { id: "demo-4", name: "Joseph Kariuki", role: "Executive Director" },
];

const daysFromNow = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

const SEED: Training[] = [
  {
    id: "trn_seed1",
    title: "Directors' fiduciary duties refresher",
    description: "Duties of care, skill and diligence; conflicts of interest; business judgement.",
    category: "Governance",
    provider: "Institute of Directors",
    format: "In-person",
    cpdHours: 4,
    dueDate: daysFromNow(30),
    mandatory: true,
    assignedTo: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: "trn_seed2",
    title: "AML/CFT oversight for boards",
    description: "Board-level accountability for financial crime risk and reporting.",
    category: "Regulatory",
    provider: "Lexora Academy",
    format: "Online",
    cpdHours: 2,
    dueDate: daysFromNow(-5),
    mandatory: true,
    assignedTo: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: "trn_seed3",
    title: "Cyber risk for non-technical directors",
    description: "Understanding threat landscape, incident response and board questions to ask.",
    category: "Cyber",
    provider: "Lexora Academy",
    format: "Self-paced",
    cpdHours: 1.5,
    dueDate: daysFromNow(60),
    mandatory: false,
    assignedTo: [],
    createdAt: new Date().toISOString(),
  },
];

const empty = (): Omit<Training, "id" | "createdAt"> => ({
  title: "",
  description: "",
  category: "Governance",
  provider: "",
  format: "Online",
  cpdHours: 1,
  dueDate: daysFromNow(30),
  mandatory: true,
  assignedTo: [],
});

export default function BoardTraining() {
  const { data: apiMembers = [] } = useQuery({
    queryKey: ["grc-board-members"],
    queryFn: fetchBoardMembers,
    retry: 1,
  });
  const members: Member[] = useMemo(() => {
    const live = apiMembers
      .filter((m: any) => m.isActive !== false)
      .map((m) => ({ id: m._id, name: m.name, role: String(m.role ?? "") }));
    return live.length ? live : DEMO_MEMBERS;
  }, [apiMembers]);
  const usingDemo = apiMembers.length === 0;

  const [trainings, setTrainings] = usePersistentState<Training[]>("grc_board_training_v1", SEED);
  const [completions, setCompletions] = usePersistentState<Completion[]>(
    "grc_board_training_completions_v1",
    [
      { trainingId: "trn_seed1", memberId: "demo-1", completedAt: new Date().toISOString() },
      { trainingId: "trn_seed2", memberId: "demo-1", completedAt: new Date().toISOString() },
      { trainingId: "trn_seed2", memberId: "demo-2", completedAt: new Date().toISOString() },
    ],
  );
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty());
  const [filter, setFilter] = useState<string>("all");

  const assignees = (t: Training) =>
    t.assignedTo.length ? members.filter((m) => t.assignedTo.includes(m.id)) : members;
  const isDone = (tId: string, mId: string) =>
    completions.find((c) => c.trainingId === tId && c.memberId === mId);
  const toggle = (tId: string, mId: string) =>
    setCompletions((prev) =>
      isDone(tId, mId)
        ? prev.filter((c) => !(c.trainingId === tId && c.memberId === mId))
        : [...prev, { trainingId: tId, memberId: mId, completedAt: new Date().toISOString() }],
    );

  const stats = (t: Training) => {
    const a = assignees(t);
    const done = a.filter((m) => isDone(t.id, m.id)).length;
    return { total: a.length, done, pct: a.length ? Math.round((done / a.length) * 100) : 0 };
  };
  const overdue = (t: Training) => new Date(t.dueDate) < new Date() && stats(t).pct < 100;

  const totalAssign = trainings.reduce((s, t) => s + stats(t).total, 0);
  const totalDone = trainings.reduce((s, t) => s + stats(t).done, 0);
  const cpdEarned = (mId: string) =>
    trainings.filter((t) => isDone(t.id, mId)).reduce((s, t) => s + t.cpdHours, 0);

  const save = () => {
    if (!form.title.trim()) return;
    setTrainings((p) => [{ ...form, id: uid("trn"), createdAt: new Date().toISOString() }, ...p]);
    setOpen(false);
    setForm(empty());
    toast({ title: "Training created", description: "Assigned members can now be tracked." });
  };

  const exportCsv = () => {
    const rows = [["Member", "Role", ...trainings.map((t) => t.title), "CPD hours"]];
    members.forEach((m) =>
      rows.push([
        m.name,
        m.role,
        ...trainings.map((t) =>
          !assignees(t).some((a) => a.id === m.id)
            ? "N/A"
            : isDone(t.id, m.id)
              ? `Completed ${fmtDate(isDone(t.id, m.id)!.completedAt)}`
              : "Not completed",
        ),
        String(cpdEarned(m.id)),
      ]),
    );
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "board-training-tracker.csv";
    a.click();
  };

  const visible = trainings.filter((t) => filter === "all" || t.category === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" /> Board Training
          </h1>
          <p className="text-sm text-muted-foreground">
            Create training for directors, track completion and CPD hours, and manage onboarding modules.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New training
        </Button>
      </div>

      {usingDemo && (
        <p className="text-xs text-muted-foreground border rounded-md px-3 py-2 bg-muted/30">
          No board members were found, so sample directors are shown. Training records are saved on this device only.
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Trainings", value: trainings.length, icon: GraduationCap },
          { label: "Completion rate", value: `${totalAssign ? Math.round((totalDone / totalAssign) * 100) : 0}%`, icon: CheckCircle2 },
          { label: "Outstanding", value: totalAssign - totalDone, icon: Clock },
          { label: "Overdue trainings", value: trainings.filter(overdue).length, icon: AlertTriangle },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <k.icon className="h-5 w-5 text-primary" />
              <div>
                <div className="text-xl font-bold">{k.value}</div>
                <div className="text-xs text-muted-foreground">{k.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="programmes">
        <TabsList>
          <TabsTrigger value="programmes">Trainings</TabsTrigger>
          <TabsTrigger value="tracker">Completion tracker</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding modules</TabsTrigger>
        </TabsList>

        <TabsContent value="programmes" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {visible.map((t) => {
              const s = stats(t);
              return (
                <Card key={t.id}>
                  <CardHeader className="pb-2 flex-row items-start justify-between space-y-0 gap-2">
                    <div>
                      <div className="flex gap-1.5 mb-1 flex-wrap">
                        <Badge variant="secondary">{t.category}</Badge>
                        {t.mandatory && <Badge>Mandatory</Badge>}
                        {overdue(t) && <Badge variant="destructive">Overdue</Badge>}
                      </div>
                      <CardTitle className="text-base">{t.title}</CardTitle>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Delete training"
                      onClick={() => {
                        setTrainings((p) => p.filter((x) => x.id !== t.id));
                        setCompletions((p) => p.filter((c) => c.trainingId !== t.id));
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                      <span>{t.format}</span>
                      {t.provider && <span>{t.provider}</span>}
                      <span>{t.cpdHours} CPD hrs</span>
                      <span>Due {fmtDate(t.dueDate)}</span>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>{s.done} of {s.total} completed</span>
                        <span className="font-medium">{s.pct}%</span>
                      </div>
                      <Progress value={s.pct} />
                    </div>
                    <div className="space-y-1">
                      {assignees(t).map((m) => {
                        const d = isDone(t.id, m.id);
                        return (
                          <label key={m.id} className="flex items-center justify-between text-sm border rounded px-2 py-1.5 cursor-pointer">
                            <span className="flex items-center gap-2">
                              <Checkbox checked={!!d} onCheckedChange={() => toggle(t.id, m.id)} />
                              {m.name}
                            </span>
                            {d ? (
                              <span className="text-xs text-success">Completed {fmtDate(d.completedAt)}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Not completed</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {visible.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-2 text-center py-10">No trainings yet.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tracker" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Who has completed what</CardTitle>
              <Button size="sm" variant="outline" onClick={exportCsv}>
                <Download className="h-4 w-4 mr-1" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Board member</TableHead>
                    {trainings.map((t) => (
                      <TableHead key={t.id} className="min-w-[140px] text-xs">{t.title}</TableHead>
                    ))}
                    <TableHead>Progress</TableHead>
                    <TableHead>CPD hrs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => {
                    const mine = trainings.filter((t) => assignees(t).some((a) => a.id === m.id));
                    const done = mine.filter((t) => isDone(t.id, m.id)).length;
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="font-medium">{m.name}</div>
                          <div className="text-xs text-muted-foreground">{m.role}</div>
                        </TableCell>
                        {trainings.map((t) => {
                          if (!assignees(t).some((a) => a.id === m.id))
                            return <TableCell key={t.id} className="text-xs text-muted-foreground">N/A</TableCell>;
                          const d = isDone(t.id, m.id);
                          return (
                            <TableCell key={t.id}>
                              <button onClick={() => toggle(t.id, m.id)}>
                                {d ? (
                                  <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> {fmtDate(d.completedAt)}</Badge>
                                ) : new Date(t.dueDate) < new Date() ? (
                                  <Badge variant="destructive">Overdue</Badge>
                                ) : (
                                  <Badge variant="outline">Pending</Badge>
                                )}
                              </button>
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-sm">{done}/{mine.length}</TableCell>
                        <TableCell className="font-medium">{cpdEarned(m.id)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-3">Click a status to mark it complete or undo.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onboarding" className="mt-4">
          <p className="text-sm text-muted-foreground mb-3">
            Mandatory modules every new director completes during Board Onboarding.
          </p>
          <TrainingModulesTab />
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New board training</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v: Category) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Format</Label>
                <Select value={form.format} onValueChange={(v: Training["format"]) => setForm({ ...form, format: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["In-person", "Online", "Self-paced"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Provider</Label>
                <Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
              </div>
              <div>
                <Label>CPD hours</Label>
                <Input type="number" step="0.5" value={form.cpdHours} onChange={(e) => setForm({ ...form, cpdHours: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Due date</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm mt-6">
                <Checkbox checked={form.mandatory} onCheckedChange={(v) => setForm({ ...form, mandatory: !!v })} />
                Mandatory
              </label>
            </div>
            <div>
              <Label>Assign to (leave empty for the whole board)</Label>
              <div className="grid grid-cols-2 gap-1 mt-1">
                {members.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.assignedTo.includes(m.id)}
                      onCheckedChange={(v) =>
                        setForm({
                          ...form,
                          assignedTo: v ? [...form.assignedTo, m.id] : form.assignedTo.filter((x) => x !== m.id),
                        })
                      }
                    />
                    {m.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.title.trim()}>Create training</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
