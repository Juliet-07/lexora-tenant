import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowRight, Loader2, Star, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  createCandidate,
  moveCandidateStage,
  deleteCandidate,
  getNextStage,
  getStageOrderFor,
  type Candidate,
  type CandidateStage,
  type WorkerCategory,
} from "@/lib/hr/hr-recruitment-api";
import {
  fetchContractTemplates,
  generateContractFromCandidate,
} from "@/lib/hr/hr-contracts-api";
import { STAGES, stageColor, LoadingRow } from "./shared";

// ─── Pipeline tab content ──────────────────────────────────────

export function PipelineTab({
  candidates,
  candidatesLoading,
  onAddCandidate,
  onHired,
}: {
  candidates: Candidate[];
  candidatesLoading: boolean;
  onAddCandidate: () => void;
  onHired: (candidate: Candidate) => void;
}) {
  return (
    <TabsContent value="pipeline" className="space-y-3">
      <div className="flex justify-end">
        <Button
          className="bg-gradient-to-r from-primary to-secondary"
          onClick={onAddCandidate}
        >
          <Plus className="h-4 w-4" /> Add Candidate
        </Button>
      </div>
      {candidatesLoading ? (
        <LoadingRow label="Loading candidates…" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {STAGES.map((stage) => (
            <PipelineColumn
              key={stage.key}
              stageKey={stage.key}
              label={stage.label}
              candidates={candidates}
              onHired={onHired}
            />
          ))}
        </div>
      )}
    </TabsContent>
  );
}

// ─── Pipeline column ──────────────────────────────────────────

function PipelineColumn({
  stageKey,
  label,
  candidates,
  onHired,
}: {
  stageKey: CandidateStage;
  label: string;
  candidates: Candidate[];
  onHired: (candidate: Candidate) => void;
}) {
  const queryClient = useQueryClient();
  const inStage = candidates.filter(
    (c) =>
      c.stage === stageKey &&
      getStageOrderFor(c.workerCategory).includes(stageKey),
  );

  const moveMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: CandidateStage }) =>
      moveCandidateStage(id, { stage }),
    onSuccess: (updatedCandidate, vars) => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-candidates"] });
      toast.success(
        `Moved to ${STAGES.find((s) => s.key === vars.stage)?.label}.`,
      );
      if (vars.stage === "hired") {
        onHired(updatedCandidate);
      }
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to move candidate"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCandidate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-candidates"] });
      toast.success("Candidate removed.");
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          {label} <Badge variant="outline">{inStage.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {inStage.map((c) => {
          const next = getNextStage(c.stage, c.workerCategory);
          return (
            <div
              key={c._id}
              className="border rounded-lg p-3 space-y-2 bg-card"
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs">
                    {c.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {c.roleAppliedFor}
                  </p>
                </div>
              </div>
              {c.rating > 0 && (
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${i < Math.round(c.rating) ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                    />
                  ))}
                </div>
              )}
              <Badge
                variant="outline"
                className={`${stageColor(c.stage)} text-[10px] capitalize`}
              >
                {c.source.replace("_", " ")}
              </Badge>
              <Badge variant="outline" className="text-[10px] capitalize">
                {c.workerCategory}
              </Badge>
              {c.stage === "rejected" && c.rejectionReason && (
                <p className="text-[11px] text-muted-foreground italic">
                  {c.rejectionReason}
                </p>
              )}
              <div className="flex gap-1">
                {next && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs flex-1"
                    disabled={moveMutation.isPending}
                    onClick={() =>
                      moveMutation.mutate({ id: c._id, stage: next })
                    }
                  >
                    Advance <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
                {c.stage !== "rejected" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-destructive"
                    disabled={moveMutation.isPending}
                    onClick={() =>
                      moveMutation.mutate({ id: c._id, stage: "rejected" })
                    }
                  >
                    Reject
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(c._id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>
          );
        })}
        {inStage.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No candidates
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Generate Contract dialog (Hired → contract hook) ──────────

export function GenerateContractDialog({
  candidate,
  onClose,
}: {
  candidate: Candidate | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [templateId, setTemplateId] = useState("");
  const [scopeOfWork, setScopeOfWork] = useState("");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["contract-templates", candidate?.workerCategory],
    queryFn: () => fetchContractTemplates(candidate!.workerCategory),
    enabled: !!candidate,
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      generateContractFromCandidate({
        candidateId: candidate!._id,
        templateId,
        scopeOfWork: scopeOfWork.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      onClose();
      setTemplateId("");
      setScopeOfWork("");
      toast.success(
        "Contract draft created. Review it in the Contracts module before sending.",
      );
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ?? "Failed to generate contract",
      ),
  });

  const handleClose = () => {
    setTemplateId("");
    setScopeOfWork("");
    onClose();
  };

  if (!candidate) return null;

  return (
    <Dialog open={!!candidate} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate a contract for {candidate.name}?</DialogTitle>
          <DialogDescription>
            Pick a {candidate.workerCategory} template. You can review and edit
            before sending it for signature.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
          <p className="font-medium text-muted-foreground uppercase tracking-wide text-[11px]">
            Filled in automatically from this candidate
          </p>
          <p>
            Name: <span className="font-medium">{candidate.name}</span>
          </p>
          <p>
            Role:{" "}
            <span className="font-medium">{candidate.roleAppliedFor}</span>
          </p>
          <p>
            Worker category:{" "}
            <span className="font-medium capitalize">
              {candidate.workerCategory}
            </span>
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No {candidate.workerCategory} templates have been published yet. Ask
            your platform admin to publish one.
          </p>
        ) : (
          <>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t._id} value={t._id}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {templateId && (
              <div className="space-y-1">
                <Label>Scope of work (optional)</Label>
                <Textarea
                  rows={3}
                  value={scopeOfWork}
                  onChange={(e) => setScopeOfWork(e.target.value)}
                  placeholder={
                    "One deliverable per line, e.g.\nWeekly progress report\nMonthly stakeholder review"
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Only relevant if the template references a scope-of-work
                  clause. Each line becomes one numbered item.
                </p>
              </div>
            )}
          </>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Skip for now
          </Button>
          <Button
            disabled={!templateId || generateMutation.isPending}
            onClick={() => generateMutation.mutate()}
            className="bg-gradient-to-r from-primary to-secondary"
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Generate Contract"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Candidate dialog ─────────────────────────────────────

export function AddCandidateDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    roleAppliedFor: "",
    source: "other" as const,
    workerCategory: "employee" as WorkerCategory,
    notes: "",
  });

  const createMutation = useMutation({
    mutationFn: createCandidate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-candidates"] });
      onClose();
      setForm({
        name: "",
        email: "",
        phone: "",
        roleAppliedFor: "",
        source: "other",
        workerCategory: "employee",
        notes: "",
      });
      toast.success("Candidate added to pipeline.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to add candidate"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Candidate</DialogTitle>
          <DialogDescription>Starts in the "Sourced" stage.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Role applied for</Label>
            <Input
              placeholder="e.g. Senior Backend Engineer"
              value={form.roleAppliedFor}
              onChange={(e) =>
                setForm({ ...form, roleAppliedFor: e.target.value })
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Source</Label>
            <Select
              value={form.source}
              onValueChange={(v: any) => setForm({ ...form, source: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="job_board">Job Board</SelectItem>
                <SelectItem value="agency">Agency</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Select
              value={form.workerCategory}
              onValueChange={(v: WorkerCategory) =>
                setForm({ ...form, workerCategory: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="consultant">Consultant</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {form.workerCategory === "consultant"
                ? "Consultant pipeline: Sourced → Screening → Hired/Rejected (no interview/offer stages)."
                : "Employee pipeline: Sourced → Screening → Interview → Offer → Hired/Rejected."}
            </p>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={
              !form.name ||
              !form.email ||
              !form.roleAppliedFor ||
              createMutation.isPending
            }
            onClick={() => createMutation.mutate(form)}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Add Candidate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
