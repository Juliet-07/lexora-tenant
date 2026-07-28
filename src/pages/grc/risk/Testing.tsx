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
  ClipboardCheck,
  AlertTriangle,
  Clock,
  Trash2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { EvidenceSignOff } from "@/components/grc/EvidenceSignOff";
import {
  fetchControls,
  fetchTests,
  createTest,
  updateTest,
  assignTest,
  addTestEvidence,
  completeTest,
  signOffTest,
  deleteTest,
  FREQUENCY_BY_RATING,
  SEVERITIES,
  testStatusTone,
  daysUntil,
  type ControlTest,
  type TestRiskRating,
  type Severity,
} from "@/lib/grc/risk-api";

const RATINGS: TestRiskRating[] = ["Extreme", "High", "Medium", "Low"];

export default function GrcTestingProgramme({
  embedded = false,
}: { embedded?: boolean } = {}) {
  const queryClient = useQueryClient();
  const { data: tests = [], isLoading } = useQuery({
    queryKey: ["grc-tests"],
    queryFn: fetchTests,
  });
  const { data: controls = [] } = useQuery({
    queryKey: ["grc-controls"],
    queryFn: fetchControls,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const selected = tests.find((t) => t._id === selectedId) ?? null;

  const year = new Date().getFullYear();
  const thisYear = useMemo(
    () => tests.filter((t) => t.year === year),
    [tests, year],
  );
  const completed = thisYear.filter((t) => t.conclusion !== null);
  const passed = completed.filter((t) => t.conclusion === "Pass");
  const failed = completed.filter((t) => t.conclusion === "Fail");
  const overdue = thisYear.filter(
    (t) => t.conclusion === null && daysUntil(t.dueDate) < 0,
  );
  const progress = thisYear.length
    ? Math.round((completed.length / thisYear.length) * 100)
    : 0;
  const passRate = completed.length
    ? Math.round((passed.length / completed.length) * 100)
    : 0;

  const [form, setForm] = useState({
    controlId: "",
    riskRating: "High" as TestRiskRating,
    procedure: "",
    dueDate: new Date().toISOString().slice(0, 10),
    tester: "",
  });

  const createMut = useMutation({
    mutationFn: () => createTest(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-tests"] });
      setOpenNew(false);
      setForm({
        controlId: "",
        riskRating: "High",
        procedure: "",
        dueDate: new Date().toISOString().slice(0, 10),
        tester: "",
      });
      toast({ title: "Test added to the plan" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to add test",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const create = () => {
    if (!form.controlId)
      return toast({ title: "Select a control", variant: "destructive" });
    createMut.mutate();
  };

  if (isLoading)
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading testing programme…
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {!embedded && (
            <>
              <h1 className="text-2xl font-bold">Testing Programme</h1>
              <p className="text-sm text-muted-foreground">
                Risk-based annual test plan over the Control Library. A failed
                test logs a deficiency automatically.
              </p>
            </>
          )}
          {embedded && (
            <p className="text-sm text-muted-foreground">
              Schedule tests against registered controls. A failed test logs a
              deficiency automatically.
            </p>
          )}
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Schedule test
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule a control test</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Control</Label>
                <Select
                  value={form.controlId}
                  onValueChange={(v) => setForm({ ...form, controlId: v })}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        controls.length === 0
                          ? "No controls registered yet"
                          : "Select a registered control"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {controls.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Risk rating</Label>
                <Select
                  value={form.riskRating}
                  onValueChange={(v) =>
                    setForm({ ...form, riskRating: v as TestRiskRating })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RATINGS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Test procedure</Label>
                <Textarea
                  rows={3}
                  value={form.procedure}
                  onChange={(e) =>
                    setForm({ ...form, procedure: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Due date</Label>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm({ ...form, dueDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Tester (optional)</Label>
                  <Input
                    value={form.tester}
                    onChange={(e) =>
                      setForm({ ...form, tester: e.target.value })
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Frequency applied:{" "}
                <strong>{FREQUENCY_BY_RATING[form.riskRating]}</strong>
              </p>
            </div>
            <DialogFooter>
              <Button onClick={create} disabled={createMut.isPending}>
                {createMut.isPending ? "Adding…" : "Add to plan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center">
                <ClipboardCheck className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xl font-bold leading-none">
                  {completed.length}/{thisYear.length}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Tests completed
                </div>
              </div>
            </div>
            <Progress value={progress} className="h-1.5" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center">
              <ClipboardCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xl font-bold leading-none">{passRate}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                Pass rate
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 text-white flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xl font-bold leading-none">
                {failed.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Failed tests
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500 text-white flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xl font-bold leading-none">
                {overdue.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Overdue</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="plan">
        <TabsList>
          <TabsTrigger value="plan">Test plan {year}</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="dashboard">Effectiveness</TabsTrigger>
        </TabsList>

        <TabsContent value="plan">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Control</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Tester</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Conclusion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.map((t) => {
                    const late =
                      t.conclusion === null && daysUntil(t.dueDate) < 0;
                    return (
                      <TableRow
                        key={t._id}
                        className="cursor-pointer"
                        onClick={() => setSelectedId(t._id)}
                      >
                        <TableCell>
                          <div className="font-medium">{t.controlName}</div>
                          <div className="text-xs text-muted-foreground">
                            {t.controlCode}
                          </div>
                        </TableCell>
                        <TableCell>{t.riskRating}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {t.frequency}
                        </TableCell>
                        <TableCell>
                          {t.tester || (
                            <span className="text-xs text-muted-foreground">
                              Unassigned
                            </span>
                          )}
                        </TableCell>
                        <TableCell
                          className={late ? "text-rose-600 font-medium" : ""}
                        >
                          {new Date(t.dueDate).toLocaleDateString()}
                          {late && " · overdue"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={testStatusTone(t.status)}
                          >
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {t.conclusion ? (
                            <Badge
                              variant="outline"
                              className={
                                t.conclusion === "Pass"
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                  : "bg-rose-100 text-rose-700 border-rose-200"
                              }
                            >
                              {t.conclusion}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {tests.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No tests scheduled.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Upcoming and overdue tests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[...tests]
                .filter((t) => t.conclusion === null)
                .sort(
                  (a, b) =>
                    new Date(a.dueDate).getTime() -
                    new Date(b.dueDate).getTime(),
                )
                .map((t) => {
                  const d = daysUntil(t.dueDate);
                  return (
                    <div
                      key={t._id}
                      className="flex items-center justify-between border rounded-lg p-3 cursor-pointer hover:bg-muted/40"
                      onClick={() => setSelectedId(t._id)}
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {t.controlCode} — {t.controlName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t.tester || "Unassigned"} ·{" "}
                          {new Date(t.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          d < 0
                            ? "bg-rose-100 text-rose-700 border-rose-200"
                            : d < 14
                              ? "bg-amber-100 text-amber-700 border-amber-200"
                              : "bg-muted text-muted-foreground"
                        }
                      >
                        {d < 0 ? `${Math.abs(d)}d overdue` : `in ${d}d`}
                      </Badge>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Effectiveness by control rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rating</TableHead>
                    <TableHead className="text-right">Planned</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Passed</TableHead>
                    <TableHead className="text-right">Pass rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RATINGS.map((r) => {
                    const set = tests.filter((t) => t.riskRating === r);
                    const done = set.filter((t) => t.conclusion !== null);
                    const pass = done.filter((t) => t.conclusion === "Pass");
                    return (
                      <TableRow key={r}>
                        <TableCell className="font-medium">{r}</TableCell>
                        <TableCell className="text-right">
                          {set.length}
                        </TableCell>
                        <TableCell className="text-right">
                          {done.length}
                        </TableCell>
                        <TableCell className="text-right">
                          {pass.length}
                        </TableCell>
                        <TableCell className="text-right">
                          {done.length
                            ? `${Math.round((pass.length / done.length) * 100)}%`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TestSheet test={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function TestSheet({
  test,
  onClose,
}: {
  test: ControlTest | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["grc-tests"] });
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const [tester, setTester] = useState("");
  const [findings, setFindings] = useState("");
  const [severity, setSeverity] = useState<Severity>("High");
  const [approver, setApprover] = useState("");

  const updateMut = useMutation({
    mutationFn: (dto: { procedure?: string; dueDate?: string }) =>
      updateTest(test!._id, dto),
    onSuccess: invalidate,
  });
  const assignMut = useMutation({
    mutationFn: () =>
      assignTest(test!._id, tester || test!.tester, test!.dueDate),
    onSuccess: () => {
      invalidate();
      toast({ title: "Test assigned" });
    },
    onError: onErr("Failed to assign test"),
  });
  const evidenceMut = useMutation({
    mutationFn: (files: File[]) => addTestEvidence(test!._id, files),
    onSuccess: invalidate,
    onError: onErr("Failed to upload evidence"),
  });
  const completeMut = useMutation({
    mutationFn: (conclusion: "Pass" | "Fail") =>
      completeTest(
        test!._id,
        conclusion,
        findings,
        conclusion === "Fail" ? severity : undefined,
      ),
    onSuccess: (_r, conclusion) => {
      invalidate();
      if (conclusion === "Fail") {
        queryClient.invalidateQueries({ queryKey: ["grc-deficiencies"] });
        toast({
          title: "Recorded as Fail",
          description:
            "A deficiency has been logged in the Deficiencies register.",
        });
      } else {
        toast({ title: "Recorded as Pass" });
      }
    },
    onError: onErr("Failed to record conclusion"),
  });
  const signOffMut = useMutation({
    mutationFn: () => signOffTest(test!._id, approver),
    onSuccess: () => {
      invalidate();
      setApprover("");
      toast({ title: "Test signed off" });
    },
    onError: onErr("Failed to sign off"),
  });
  const deleteMut = useMutation({
    mutationFn: () => deleteTest(test!._id),
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: onErr("Failed to remove test"),
  });

  if (!test) return null;

  return (
    <Sheet open={!!test} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="pr-8">
            {test.controlCode} — {test.controlName}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{test.riskRating}</Badge>
            <Badge variant="outline">{test.frequency}</Badge>
            <Badge variant="outline" className={testStatusTone(test.status)}>
              {test.status}
            </Badge>
          </div>

          <div>
            <Label className="text-xs">Test procedure</Label>
            <Textarea
              rows={3}
              defaultValue={test.procedure}
              onBlur={(e) => updateMut.mutate({ procedure: e.target.value })}
            />
          </div>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Assignment</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Tester</Label>
                <Input
                  className="h-8"
                  value={tester || test.tester}
                  onChange={(e) => setTester(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Due date</Label>
                <Input
                  className="h-8"
                  type="date"
                  defaultValue={test.dueDate ? test.dueDate.slice(0, 10) : ""}
                  onBlur={(e) => updateMut.mutate({ dueDate: e.target.value })}
                />
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={assignMut.isPending}
              onClick={() => assignMut.mutate()}
            >
              Assign
            </Button>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Execution</h3>
            {test.conclusion ? (
              <div className="rounded-lg border p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="font-medium">
                    Conclusion: {test.conclusion}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {test.completedAt &&
                      new Date(test.completedAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-muted-foreground">{test.findings}</p>
              </div>
            ) : (
              <>
                <Textarea
                  rows={3}
                  placeholder="Findings / conclusion narrative"
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                />
                <div className="flex items-end gap-2">
                  <div className="w-40">
                    <Label className="text-xs">
                      Deficiency severity (if failed)
                    </Label>
                    <Select
                      value={severity}
                      onValueChange={(v) => setSeverity(v as Severity)}
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
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={completeMut.isPending}
                    onClick={() => completeMut.mutate("Pass")}
                  >
                    Record Pass
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={completeMut.isPending}
                    onClick={() => completeMut.mutate("Fail")}
                  >
                    Record Fail
                  </Button>
                </div>
              </>
            )}
          </section>

          <section className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-semibold">
              Evidence & management sign-off
            </h3>
            <EvidenceSignOff
              evidence={test.evidence ?? []}
              onUpload={(files) => evidenceMut.mutate(files)}
              uploading={evidenceMut.isPending}
              signedBy={test.signedOffBy}
              signedAt={test.signedOffAt}
              validatorLabel="Signed off by"
              signOffLabel="Sign off"
              validator={approver}
              onValidatorChange={setApprover}
              disabled={test.conclusion === null}
              onSignOff={() => signOffMut.mutate()}
            />
          </section>

          <Button
            variant="ghost"
            className="text-destructive"
            disabled={deleteMut.isPending}
            onClick={() => deleteMut.mutate()}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Remove from plan
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
