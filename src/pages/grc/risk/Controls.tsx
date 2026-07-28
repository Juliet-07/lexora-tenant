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
  fetchTests,
  type GrcControl,
} from "@/lib/grc/risk-api";

export default function GrcControls() {
  const { data: controls = [], isLoading } = useQuery({
    queryKey: ["grc-controls"],
    queryFn: fetchControls,
  });
  const { data: tests = [] } = useQuery({
    queryKey: ["grc-control-tests"],
    queryFn: fetchTests,
  });

  const [newOpen, setNewOpen] = useState(false);

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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {controls.map((c) => {
                    const last = [...tests]
                      .filter((t) => t.controlId === c._id && t.completedAt)
                      .sort(
                        (a, b) =>
                          new Date(b.completedAt!).getTime() -
                          new Date(a.completedAt!).getTime(),
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
                                last.conclusion === "Pass"
                                  ? "text-emerald-600 border-emerald-500/30"
                                  : "text-rose-600 border-rose-500/30"
                              }
                            >
                              {last.conclusion} ·{" "}
                              {new Date(last.completedAt!).toLocaleDateString()}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Not tested
                            </span>
                          )}
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
