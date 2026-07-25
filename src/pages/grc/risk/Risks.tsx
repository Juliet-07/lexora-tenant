import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Link2, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchRisks,
  fetchRisk,
  createRisk,
  updateRisk,
  setRiskStatus,
  linkControl,
  unlinkControl,
  linkRelatedRisk,
  unlinkRelatedRisk,
  fetchControlOptions,
  bandTone,
  zoneTone,
  RISK_CATEGORIES,
  type Risk,
  type RiskCategory,
  type RiskStatus,
  type ControlEffectiveness,
} from "@/lib/grc/risk-api";

export default function GrcRisks() {
  const { data: risks = [], isLoading } = useQuery({
    queryKey: ["grc-risks"],
    queryFn: fetchRisks,
  });
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [band, setBand] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const selectedLive = selectedId
    ? (risks.find((r) => r._id === selectedId) ?? null)
    : null;

  const rows = useMemo(() => {
    return risks.filter((r) => {
      if (cat !== "all" && r.category !== cat) return false;
      if (band !== "all" && r.residualBand !== band) return false;
      if (q && !r.title.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [risks, q, cat, band]);

  if (isLoading) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading risk register…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Risk Register</h1>
          <p className="text-sm text-muted-foreground">
            Central catalogue of organizational risks with 5×5 inherent and
            residual scoring.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New risk
        </Button>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Register</TabsTrigger>
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          <TabsTrigger value="network">Relationships</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              className="w-[240px]"
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {RISK_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={band} onValueChange={setBand}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Band" />
              </SelectTrigger>
              <SelectContent>
                {["all", "Extreme", "High", "Medium", "Low"].map((b) => (
                  <SelectItem key={b} value={b}>
                    {b === "all" ? "All bands" : b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Risk</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-right">Inherent</TableHead>
                    <TableHead className="text-right">Residual</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Next review</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow
                      key={r._id}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(r._id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {r.title}
                          {r.treatmentPlans.length > 0 && (
                            <Badge variant="outline" className="text-[10px]">
                              {r.treatmentPlans.length} plan
                              {r.treatmentPlans.length === 1 ? "" : "s"}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{r.category}</TableCell>
                      <TableCell>{r.owner || "—"}</TableCell>
                      <TableCell className="text-right">
                        {r.inherentScore}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={bandTone(r.residualBand)}
                        >
                          {r.residualScore} · {r.residualBand}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={zoneTone(r.zone)}>
                          {r.zone}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(r.nextReviewDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No risks match.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heatmap">
          <HeatmapCard risks={risks.filter((r) => r.status !== "Closed")} />
        </TabsContent>

        <TabsContent value="network">
          <Card>
            <CardContent className="p-4 space-y-2">
              {risks.map((r) => (
                <div
                  key={r._id}
                  className="border rounded p-3 cursor-pointer hover:bg-muted/40"
                  onClick={() => setSelectedId(r._id)}
                >
                  <div className="font-medium text-sm">{r.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Related:{" "}
                    {r.relatedRiskIds.length === 0
                      ? "—"
                      : r.relatedRiskIds
                          .map(
                            (id) =>
                              risks.find((x) => x._id === id)?.title ?? id,
                          )
                          .join(", ")}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NewRiskDialog open={newOpen} onOpenChange={setNewOpen} />
      {selectedLive && (
        <RiskDetailSheet
          risk={selectedLive}
          allRisks={risks}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function HeatmapCard({ risks }: { risks: Risk[] }) {
  const cells: Record<string, Risk[]> = {};
  risks.forEach((r) => {
    const k = `${r.likelihood}-${r.impact}`;
    (cells[k] = cells[k] || []).push(r);
  });
  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-6 gap-1 text-xs">
          <div />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={"h" + i} className="text-center text-muted-foreground">
              Impact {i}
            </div>
          ))}
          {[5, 4, 3, 2, 1].map((l) => (
            <div key={"row" + l} className="contents">
              <div className="text-right pr-1 text-muted-foreground">
                Likelihood {l}
              </div>
              {[1, 2, 3, 4, 5].map((i) => {
                const list = cells[`${l}-${i}`] || [];
                const score = l * i;
                const bg =
                  score >= 17
                    ? "bg-rose-500/70"
                    : score >= 10
                      ? "bg-orange-500/60"
                      : score >= 5
                        ? "bg-amber-500/50"
                        : "bg-emerald-500/40";
                return (
                  <div
                    key={`c${l}${i}`}
                    className={`min-h-[64px] rounded ${bg} p-1 text-white text-[10px] space-y-0.5 overflow-hidden`}
                  >
                    {list.slice(0, 3).map((r) => (
                      <div key={r._id} className="truncate">
                        {r.title}
                      </div>
                    ))}
                    {list.length > 3 && <div>+{list.length - 3} more</div>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function NewRiskDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [f, setF] = useState({
    title: "",
    category: "Operational" as RiskCategory,
    description: "",
    rootCauses: "",
    affectedProcesses: "",
    owner: "",
    likelihood: 3,
    impact: 3,
    financialExposure: 0,
  });

  const mutation = useMutation({
    mutationFn: () => createRisk(f),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-risks"] });
      toast({ title: "Risk created" });
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast({
        title: "Failed to create risk",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const submit = () => {
    if (!f.title.trim())
      return toast({ title: "Title required", variant: "destructive" });
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New risk</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Title</Label>
          <Input
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Category</Label>
              <Select
                value={f.category}
                onValueChange={(v) =>
                  setF({ ...f, category: v as RiskCategory })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          </div>
          <div>
            <Label>Root causes</Label>
            <Textarea
              rows={2}
              value={f.rootCauses}
              onChange={(e) => setF({ ...f, rootCauses: e.target.value })}
            />
          </div>
          <div>
            <Label>Affected processes</Label>
            <Input
              value={f.affectedProcesses}
              onChange={(e) =>
                setF({ ...f, affectedProcesses: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Likelihood (1-5)</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={f.likelihood}
                onChange={(e) =>
                  setF({
                    ...f,
                    likelihood: Math.max(
                      1,
                      Math.min(5, Number(e.target.value)),
                    ),
                  })
                }
              />
            </div>
            <div>
              <Label>Impact (1-5)</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={f.impact}
                onChange={(e) =>
                  setF({
                    ...f,
                    impact: Math.max(1, Math.min(5, Number(e.target.value))),
                  })
                }
              />
            </div>
            <div>
              <Label>Financial exposure</Label>
              <Input
                type="number"
                value={f.financialExposure}
                onChange={(e) =>
                  setF({ ...f, financialExposure: Number(e.target.value) })
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create risk"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RiskDetailSheet({
  risk,
  allRisks,
  onClose,
}: {
  risk: Risk;
  allRisks: Risk[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["grc-risks"] });

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: risk.title,
    description: risk.description,
    rootCauses: risk.rootCauses,
    affectedProcesses: risk.affectedProcesses,
    owner: risk.owner,
    likelihood: risk.likelihood,
    impact: risk.impact,
    financialExposure: risk.financialExposure,
    note: "",
  });

  const [statusOpen, setStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<RiskStatus>(risk.status);
  const [statusNote, setStatusNote] = useState("");

  const { data: controlOptions = [] } = useQuery({
    queryKey: ["grc-control-options"],
    queryFn: fetchControlOptions,
  });
  const [pickedControl, setPickedControl] = useState("");
  const [pickedEffectiveness, setPickedEffectiveness] =
    useState<ControlEffectiveness>("Not Tested");

  const [pickedRelated, setPickedRelated] = useState("");

  const editMut = useMutation({
    mutationFn: () => updateRisk(risk._id, editForm),
    onSuccess: () => {
      invalidate();
      setEditing(false);
      toast({ title: "Risk updated" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to update",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const statusMut = useMutation({
    mutationFn: () => setRiskStatus(risk._id, newStatus, statusNote),
    onSuccess: () => {
      invalidate();
      setStatusOpen(false);
      setStatusNote("");
      toast({ title: "Status updated" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to update status",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const linkControlMut = useMutation({
    mutationFn: () => linkControl(risk._id, pickedControl, pickedEffectiveness),
    onSuccess: () => {
      invalidate();
      setPickedControl("");
      toast({ title: "Control linked" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to link control",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });
  const unlinkControlMut = useMutation({
    mutationFn: (controlId: string) => unlinkControl(risk._id, controlId),
    onSuccess: invalidate,
  });

  const linkRelatedMut = useMutation({
    mutationFn: () => linkRelatedRisk(risk._id, pickedRelated),
    onSuccess: () => {
      invalidate();
      setPickedRelated("");
      toast({ title: "Related risk linked" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to link risk",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });
  const unlinkRelatedMut = useMutation({
    mutationFn: (relatedId: string) => unlinkRelatedRisk(risk._id, relatedId),
    onSuccess: invalidate,
  });

  const availableRelated = allRisks.filter(
    (r) => r._id !== risk._id && !risk.relatedRiskIds.includes(r._id),
  );

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl flex items-center justify-between gap-2">
            {risk.title}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing((v) => !v)}
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />{" "}
              {editing ? "Cancel" : "Edit"}
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{risk.category}</Badge>
            <Badge variant="outline" className={bandTone(risk.residualBand)}>
              Residual {risk.residualScore} · {risk.residualBand}
            </Badge>
            <Badge variant="outline" className={zoneTone(risk.zone)}>
              {risk.zone} zone
            </Badge>
            <Badge variant="outline">{risk.status}</Badge>
          </div>

          {editing ? (
            <div className="space-y-3 border rounded-lg p-3">
              <div>
                <Label>Title</Label>
                <Input
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Root causes</Label>
                <Textarea
                  rows={2}
                  value={editForm.rootCauses}
                  onChange={(e) =>
                    setEditForm({ ...editForm, rootCauses: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Affected processes</Label>
                <Input
                  value={editForm.affectedProcesses}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      affectedProcesses: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Owner</Label>
                  <Input
                    value={editForm.owner}
                    onChange={(e) =>
                      setEditForm({ ...editForm, owner: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Likelihood</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={editForm.likelihood}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        likelihood: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Impact</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={editForm.impact}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        impact: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Financial exposure</Label>
                <Input
                  type="number"
                  value={editForm.financialExposure}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      financialExposure: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Reason for this edit (required)</Label>
                <Input
                  value={editForm.note}
                  onChange={(e) =>
                    setEditForm({ ...editForm, note: e.target.value })
                  }
                  placeholder="e.g. Annual review — updated exposure"
                />
              </div>
              <Button
                size="sm"
                disabled={!editForm.note.trim() || editMut.isPending}
                onClick={() => editMut.mutate()}
              >
                {editMut.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          ) : (
            <>
              <Info label="Description">{risk.description || "—"}</Info>
              <Info label="Root causes">{risk.rootCauses || "—"}</Info>
              <Info label="Affected processes">
                {risk.affectedProcesses || "—"}
              </Info>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <Stat label="Likelihood" v={risk.likelihood} />
                <Stat label="Impact" v={risk.impact} />
                <Stat label="Inherent score" v={risk.inherentScore} />
              </div>
              <Info label="Owner">{risk.owner || "—"}</Info>
              <Info label="Financial exposure">
                {risk.financialExposure.toLocaleString()}
              </Info>
              <Info label="Next review">
                {new Date(risk.nextReviewDate).toLocaleDateString()}
              </Info>
            </>
          )}

          {/* Status change */}
          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Status</div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setNewStatus(risk.status);
                  setStatusOpen((v) => !v);
                }}
              >
                Change status
              </Button>
            </div>
            {statusOpen && (
              <div className="mt-2 space-y-2 border rounded-lg p-3">
                <Select
                  value={newStatus}
                  onValueChange={(v) => setNewStatus(v as RiskStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Open", "On Hold", "Transferred", "Closed"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Reason (required)"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                />
                <Button
                  size="sm"
                  disabled={!statusNote.trim() || statusMut.isPending}
                  onClick={() => statusMut.mutate()}
                >
                  {statusMut.isPending ? "Saving…" : "Apply"}
                </Button>
              </div>
            )}
          </div>

          {/* Linked controls — real linking, gap #1 */}
          <div className="border-t pt-3">
            <div className="text-sm font-medium mb-1">Linked controls</div>
            {risk.controls.length === 0 ? (
              <div className="text-sm text-muted-foreground mb-2">
                No controls linked yet.
              </div>
            ) : (
              <ul className="text-sm space-y-1 mb-2">
                {risk.controls.map((c) => {
                  const ctl = controlOptions.find((x) => x._id === c.controlId);
                  return (
                    <li
                      key={c.controlId}
                      className="border rounded px-2 py-1 flex justify-between items-center"
                    >
                      <span>
                        {ctl ? `${ctl.code} — ${ctl.name}` : c.controlId}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{c.effectiveness}</Badge>
                        <button
                          onClick={() => unlinkControlMut.mutate(c.controlId)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="flex gap-2">
              <Select value={pickedControl} onValueChange={setPickedControl}>
                <SelectTrigger className="flex-1">
                  <SelectValue
                    placeholder={
                      controlOptions.length === 0
                        ? "No controls yet — build Control Library first"
                        : "Select control"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {controlOptions.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={pickedEffectiveness}
                onValueChange={(v) =>
                  setPickedEffectiveness(v as ControlEffectiveness)
                }
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Effective",
                    "Partially Effective",
                    "Ineffective",
                    "Not Tested",
                  ].map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                disabled={!pickedControl || linkControlMut.isPending}
                onClick={() => linkControlMut.mutate()}
              >
                <Link2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Related risks — real linking, gap #2 */}
          <div className="border-t pt-3">
            <div className="text-sm font-medium mb-1">Related risks</div>
            {risk.relatedRiskIds.length === 0 ? (
              <div className="text-sm text-muted-foreground mb-2">
                No related risks yet.
              </div>
            ) : (
              <ul className="text-sm space-y-1 mb-2">
                {risk.relatedRiskIds.map((rid) => {
                  const related = allRisks.find((x) => x._id === rid);
                  return (
                    <li
                      key={rid}
                      className="border rounded px-2 py-1 flex justify-between items-center"
                    >
                      <span>{related?.title ?? rid}</span>
                      <button onClick={() => unlinkRelatedMut.mutate(rid)}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="flex gap-2">
              <Select value={pickedRelated} onValueChange={setPickedRelated}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a risk to relate" />
                </SelectTrigger>
                <SelectContent>
                  {availableRelated.map((r) => (
                    <SelectItem key={r._id} value={r._id}>
                      {r.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                disabled={!pickedRelated || linkRelatedMut.isPending}
                onClick={() => linkRelatedMut.mutate()}
              >
                <Link2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="text-sm font-medium mb-1">Treatment plans</div>
            {risk.treatmentPlans.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No treatment plan yet — create one from the Treatment Plans page
                for High/Extreme risks.
              </div>
            ) : (
              <ul className="text-sm space-y-1">
                {risk.treatmentPlans.map((p) => (
                  <li
                    key={p._id}
                    className="border rounded px-2 py-1 flex justify-between items-center"
                  >
                    <Badge variant="outline">{p.strategy}</Badge>
                    <Badge variant="outline">{p.approvalStatus}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t pt-3">
            <div className="text-sm font-medium mb-1">Change history</div>
            <ul className="text-xs text-muted-foreground space-y-1">
              {risk.changes
                .slice()
                .reverse()
                .map((c, i) => (
                  <li key={i}>
                    {new Date(c.at).toLocaleString()} — {c.note}
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, children }: any) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground tracking-wide">
        {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}
function Stat({ label, v }: any) {
  return (
    <div className="border rounded p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{v}</div>
    </div>
  );
}
