import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchControls,
  createControl,
  logControlTest,
  fetchAllControlTests,
  logDeficiency,
  fetchAllDeficiencies,
  markDeficiencyRemediated,
  REMEDIATION_DEADLINE_DAYS,
  type GrcControl,
  type DeficiencySeverity,
} from "@/lib/grc/risk-api";

export default function GrcControls() {
  const queryClient = useQueryClient();
  const { data: controls = [], isLoading } = useQuery({
    queryKey: ["grc-controls"],
    queryFn: fetchControls,
  });
  const { data: tests = [] } = useQuery({
    queryKey: ["grc-control-tests"],
    queryFn: fetchAllControlTests,
  });
  const { data: deficiencies = [] } = useQuery({
    queryKey: ["grc-deficiencies"],
    queryFn: fetchAllDeficiencies,
  });

  const [newOpen, setNewOpen] = useState(false);
  const [testOpen, setTestOpen] = useState<GrcControl | null>(null);
  const [defOpen, setDefOpen] = useState<GrcControl | null>(null);

  const remediateMut = useMutation({
    mutationFn: (id: string) => markDeficiencyRemediated(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-deficiencies"] });
      toast({ title: "Marked remediated" });
    },
  });

  if (isLoading)
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading control library…
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Controls Library</h1>
          <p className="text-sm text-muted-foreground">
            Central control catalogue, testing schedule and deficiency tracker.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New control
        </Button>
      </div>

      <Tabs defaultValue="library">
        <TabsList>
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
          <TabsTrigger value="deficiencies">Deficiencies</TabsTrigger>
        </TabsList>

        <TabsContent value="library">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Linked risks</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {controls.map((c) => (
                    <TableRow key={c._id}>
                      <TableCell className="font-mono text-xs">
                        {c.code}
                      </TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.type}</Badge>
                      </TableCell>
                      <TableCell>{c.owner || "—"}</TableCell>
                      <TableCell>{c.frequency}</TableCell>
                      <TableCell>{c.linkedRiskCount}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setTestOpen(c)}
                        >
                          Log test
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDefOpen(c)}
                        >
                          Log deficiency
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {controls.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No controls yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Control</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Effectiveness</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.map((t) => {
                    const c = controls.find((x) => x._id === t.controlId);
                    return (
                      <TableRow key={t._id}>
                        <TableCell>
                          {new Date(t.testedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {c?.code} — {c?.name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              t.outcome === "Pass"
                                ? "text-emerald-600 border-emerald-500/30"
                                : "text-rose-600 border-rose-500/30"
                            }
                          >
                            {t.outcome}
                          </Badge>
                        </TableCell>
                        <TableCell>{t.effectiveness}</TableCell>
                        <TableCell className="text-xs">{t.notes}</TableCell>
                      </TableRow>
                    );
                  })}
                  {tests.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-6 text-muted-foreground"
                      >
                        No tests logged.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deficiencies">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Control</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Root cause</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deficiencies.map((d) => {
                    const c = controls.find((x) => x._id === d.controlId);
                    const tone =
                      d.severity === "Critical"
                        ? "text-rose-600 border-rose-500/30"
                        : d.severity === "High"
                          ? "text-orange-600 border-orange-500/30"
                          : d.severity === "Medium"
                            ? "text-amber-600 border-amber-500/30"
                            : "text-emerald-600 border-emerald-500/30";
                    return (
                      <TableRow key={d._id}>
                        <TableCell>
                          {c?.code} — {c?.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={tone}>
                            {d.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{d.rootCause}</TableCell>
                        <TableCell>
                          {new Date(d.remediationDeadline).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{d.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {d.status !== "Remediated" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={remediateMut.isPending}
                              onClick={() => remediateMut.mutate(d._id)}
                            >
                              Mark remediated
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {deficiencies.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-6 text-muted-foreground"
                      >
                        No deficiencies.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NewControlDialog open={newOpen} onOpenChange={setNewOpen} />
      <TestDialog control={testOpen} onClose={() => setTestOpen(null)} />
      <DeficiencyDialog control={defOpen} onClose={() => setDefOpen(null)} />
    </div>
  );
}

function NewControlDialog({ open, onOpenChange }: any) {
  const queryClient = useQueryClient();
  const [f, setF] = useState({
    code: "",
    name: "",
    objective: "",
    type: "Preventive" as any,
    owner: "",
    frequency: "Quarterly" as any,
  });

  const mutation = useMutation({
    mutationFn: () => createControl(f),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-controls"] });
      toast({ title: "Control added" });
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast({
        title: "Failed to add control",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const submit = () => {
    if (!f.code || !f.name)
      return toast({ title: "Code and name required", variant: "destructive" });
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New control</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Code</Label>
              <Input
                value={f.code}
                onChange={(e) => setF({ ...f, code: e.target.value })}
                placeholder="CTL-004"
              />
            </div>
            <div>
              <Label>Owner</Label>
              <Input
                value={f.owner}
                onChange={(e) => setF({ ...f, owner: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Name</Label>
            <Input
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Objective</Label>
            <Textarea
              rows={2}
              value={f.objective}
              onChange={(e) => setF({ ...f, objective: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Type</Label>
              <Select
                value={f.type}
                onValueChange={(v) => setF({ ...f, type: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Preventive", "Detective", "Corrective"].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Frequency</Label>
              <Select
                value={f.frequency}
                onValueChange={(v) => setF({ ...f, frequency: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Continuous",
                    "Daily",
                    "Weekly",
                    "Monthly",
                    "Quarterly",
                    "Annual",
                  ].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TestDialog({
  control,
  onClose,
}: {
  control: GrcControl | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [f, setF] = useState({
    outcome: "Pass" as "Pass" | "Fail",
    effectiveness: "Effective" as any,
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: () => logControlTest(control!._id, f),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-control-tests"] });
      toast({ title: "Test logged" });
      onClose();
    },
    onError: (err: any) =>
      toast({
        title: "Failed to log test",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  if (!control) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log test — {control.code}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Outcome</Label>
            <Select
              value={f.outcome}
              onValueChange={(v) => setF({ ...f, outcome: v as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Pass", "Fail"].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Effectiveness</Label>
            <Select
              value={f.effectiveness}
              onValueChange={(v) => setF({ ...f, effectiveness: v as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "Effective",
                  "Partially Effective",
                  "Ineffective",
                  "Not Tested",
                ].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={f.notes}
              onChange={(e) => setF({ ...f, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving…" : "Save test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeficiencyDialog({
  control,
  onClose,
}: {
  control: GrcControl | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [f, setF] = useState<{
    severity: DeficiencySeverity;
    rootCause: string;
  }>({ severity: "Medium", rootCause: "" });

  const mutation = useMutation({
    mutationFn: () => logDeficiency(control!._id, f),
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: ["grc-deficiencies"] });
      toast({
        title: "Deficiency logged",
        description: `Remediate by ${new Date(d.remediationDeadline).toLocaleDateString()}`,
      });
      onClose();
    },
    onError: (err: any) =>
      toast({
        title: "Failed to log deficiency",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  if (!control) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log deficiency — {control.code}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Severity</Label>
            <Select
              value={f.severity}
              onValueChange={(v) =>
                setF({ ...f, severity: v as DeficiencySeverity })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  ["Critical", "High", "Medium", "Low"] as DeficiencySeverity[]
                ).map((t) => (
                  <SelectItem key={t} value={t}>
                    {t} — {REMEDIATION_DEADLINE_DAYS[t]}d
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Root cause</Label>
            <Textarea
              rows={3}
              value={f.rootCause}
              onChange={(e) => setF({ ...f, rootCause: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving…" : "Log"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
