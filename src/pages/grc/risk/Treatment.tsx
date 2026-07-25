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
  fetchEligibleRisksForTreatment,
  fetchTreatmentPlans,
  createTreatmentPlan,
  decideTreatmentPlan,
  bandTone,
  fetchRisks,
  type TreatmentPlan,
  type TreatmentStrategy,
  type RiskBand,
} from "@/lib/grc/risk-api";

const APPROVAL_THRESHOLD = 50000;

export default function GrcTreatment() {
  const queryClient = useQueryClient();
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["grc-treatment-plans"],
    queryFn: fetchTreatmentPlans,
  });
  const { data: risks = [] } = useQuery({
    queryKey: ["grc-risks"],
    queryFn: fetchRisks,
  });
  const [newOpen, setNewOpen] = useState(false);

  const pending = plans.filter((p) => p.approvalStatus === "Pending Approval");

  const decideMut = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "Approved" | "Rejected";
    }) => decideTreatmentPlan(id, status),
    onSuccess: (_r, vars) => {
      queryClient.invalidateQueries({ queryKey: ["grc-treatment-plans"] });
      toast({ title: `Plan ${vars.status.toLowerCase()}` });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to decide",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  if (isLoading)
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading treatment plans…
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Risk Treatment Plans</h1>
          <p className="text-sm text-muted-foreground">
            Formal treatment for High/Extreme risks. Plans over $
            {APPROVAL_THRESHOLD.toLocaleString()} route for approval.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New plan
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All plans</TabsTrigger>
          <TabsTrigger value="approvals">
            Approval queue ({pending.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Risk</TableHead>
                    <TableHead>Strategy</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Investment</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((p) => {
                    const r = risks.find((x) => x._id === p.riskId);
                    return (
                      <TableRow key={p._id}>
                        <TableCell className="font-medium">
                          {r?.title ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{p.strategy}</Badge>
                        </TableCell>
                        <TableCell>{p.owner || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={bandTone(p.targetResidualLevel)}
                          >
                            {p.targetResidualLevel}
                          </Badge>
                        </TableCell>
                        <TableCell>${p.investment.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{p.approvalStatus}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {plans.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No treatment plans yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals">
          <Card>
            <CardContent className="p-4 space-y-3">
              {pending.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No plans awaiting approval.
                </div>
              )}
              {pending.map((p) => {
                const r = risks.find((x) => x._id === p.riskId);
                return (
                  <div key={p._id} className="border rounded p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{r?.title}</div>
                        <div className="text-xs text-muted-foreground">
                          Strategy: {p.strategy} · Investment: $
                          {p.investment.toLocaleString()}
                        </div>
                        <div className="text-sm mt-2">{p.actions}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={decideMut.isPending}
                          onClick={() =>
                            decideMut.mutate({ id: p._id, status: "Rejected" })
                          }
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          disabled={decideMut.isPending}
                          onClick={() =>
                            decideMut.mutate({ id: p._id, status: "Approved" })
                          }
                        >
                          Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NewPlanDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}

function NewPlanDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { data: eligibleRisks = [] } = useQuery({
    queryKey: ["grc-eligible-risks"],
    queryFn: fetchEligibleRisksForTreatment,
    enabled: open,
  });

  const [f, setF] = useState({
    riskId: "",
    strategy: "Reduce" as TreatmentStrategy,
    justification: "",
    targetResidualLevel: "Medium" as RiskBand,
    actions: "",
    resourceNeeds: "",
    owner: "",
    timeline: "",
    successCriteria: "",
    investment: 0,
  });

  const mutation = useMutation({
    mutationFn: () => createTreatmentPlan(f),
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ["grc-treatment-plans"] });
      toast({
        title:
          p.approvalStatus === "Pending Approval"
            ? "Sent for approval"
            : "Draft saved",
      });
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast({
        title: "Failed to create plan",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const submit = () => {
    if (!f.riskId)
      return toast({ title: "Select a risk", variant: "destructive" });
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New treatment plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Risk (High or Extreme)</Label>
            <Select
              value={f.riskId}
              onValueChange={(v) => setF({ ...f, riskId: v })}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    eligibleRisks.length === 0
                      ? "No eligible risks right now"
                      : "Select risk"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {eligibleRisks.map((r) => (
                  <SelectItem key={r._id} value={r._id}>
                    {r.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Strategy</Label>
              <Select
                value={f.strategy}
                onValueChange={(v) =>
                  setF({ ...f, strategy: v as TreatmentStrategy })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Avoid", "Reduce", "Transfer", "Accept"].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target residual level</Label>
              <Select
                value={f.targetResidualLevel}
                onValueChange={(v) =>
                  setF({ ...f, targetResidualLevel: v as RiskBand })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Low", "Medium", "High", "Extreme"].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Justification</Label>
            <Textarea
              rows={2}
              value={f.justification}
              onChange={(e) => setF({ ...f, justification: e.target.value })}
            />
          </div>
          <div>
            <Label>Actions</Label>
            <Textarea
              rows={2}
              value={f.actions}
              onChange={(e) => setF({ ...f, actions: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Owner</Label>
              <Input
                value={f.owner}
                onChange={(e) => setF({ ...f, owner: e.target.value })}
              />
            </div>
            <div>
              <Label>Timeline</Label>
              <Input
                value={f.timeline}
                onChange={(e) => setF({ ...f, timeline: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Resource needs</Label>
              <Input
                value={f.resourceNeeds}
                onChange={(e) => setF({ ...f, resourceNeeds: e.target.value })}
              />
            </div>
            <div>
              <Label>Investment ($)</Label>
              <Input
                type="number"
                value={f.investment}
                onChange={(e) =>
                  setF({ ...f, investment: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <div>
            <Label>Success criteria</Label>
            <Textarea
              rows={2}
              value={f.successCriteria}
              onChange={(e) => setF({ ...f, successCriteria: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
