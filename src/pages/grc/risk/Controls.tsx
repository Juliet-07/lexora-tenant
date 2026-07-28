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
import GrcTestingProgramme from "@/pages/grc/risk/Testing";
import GrcDeficiencies from "@/pages/grc/risk/Deficiencies";
import {
  fetchControls,
  createControl,
  logControlTest,
  fetchAllControlTests,
  type GrcControl,
} from "@/lib/grc/risk-api";

export default function GrcControls() {
  const { data: controls = [], isLoading } = useQuery({
    queryKey: ["grc-controls"],
    queryFn: fetchControls,
  });
  const { data: tests = [] } = useQuery({
    queryKey: ["grc-control-tests"],
    queryFn: fetchAllControlTests,
  });

  const [newOpen, setNewOpen] = useState(false);
  const [testOpen, setTestOpen] = useState<GrcControl | null>(null);



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
            Central control catalogue with its risk-based testing programme and
            deficiency remediation cycle.
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
          <TabsTrigger value="testing">Testing programme</TabsTrigger>
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
                    <TableHead>Last test</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {controls.map((c) => {
                    const last = [...tests]
                      .filter((t) => t.controlId === c._id)
                      .sort(
                        (a, b) =>
                          new Date(b.testedAt).getTime() -
                          new Date(a.testedAt).getTime(),
                      )[0];
                    return (
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
                      <TableCell>
                        {last ? (
                          <Badge
                            variant="outline"
                            className={
                              last.outcome === "Pass"
                                ? "text-emerald-600 border-emerald-500/30"
                                : "text-rose-600 border-rose-500/30"
                            }
                          >
                            {last.outcome} ·{" "}
                            {new Date(last.testedAt).toLocaleDateString()}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Not tested
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setTestOpen(c)}
                        >
                          Quick log test
                        </Button>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                  {controls.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
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

        <TabsContent value="testing" className="pt-2">
          <GrcTestingProgramme embedded />
        </TabsContent>

        <TabsContent value="deficiencies" className="pt-2">
          <GrcDeficiencies embedded />
        </TabsContent>
      </Tabs>

      <NewControlDialog open={newOpen} onOpenChange={setNewOpen} />
      <TestDialog control={testOpen} onClose={() => setTestOpen(null)} />
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
