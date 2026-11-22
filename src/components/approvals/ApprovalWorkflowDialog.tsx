import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Crown, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useToast } from "@/hooks/use-toast";
import {
  fetchApprovalWorkflow,
  saveApprovalWorkflow,
  type ApprovalArea,
  type StepKind,
  type WorkflowPerson,
} from "@/lib/approvals-api";

interface DraftStep {
  key: string;
  name: string;
  kind: StepKind;
  userIds: string[];
}

const AREA_COPY: Record<
  ApprovalArea,
  { title: string; noun: string; access: string }
> = {
  crm_contracts: {
    title: "Contract approval chain (CRM)",
    noun: "contract",
    access: "CRM",
  },
  grc_deals: {
    title: "Deal contract approval chain (GRC)",
    noun: "deal contract",
    access: "GRC",
  },
};

let seq = 0;
const nextKey = () => `s${++seq}`;

// Picks people for a drafter list or a step. Only team members who have
// access to the module are offered.
function PeoplePicker({
  people,
  value,
  onChange,
  empty,
}: {
  people: WorkflowPerson[];
  value: string[];
  onChange: (v: string[]) => void;
  empty: string;
}) {
  if (!people.length)
    return <p className="text-xs text-muted-foreground">{empty}</p>;
  const toggle = (id: string) =>
    onChange(
      value.includes(id) ? value.filter((x) => x !== id) : [...value, id],
    );
  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {people.map((p) => (
        <label
          key={p.id}
          className="flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted/50"
        >
          <Checkbox
            checked={value.includes(p.id)}
            onCheckedChange={() => toggle(p.id)}
          />
          <span className="min-w-0">
            <span className="block truncate font-medium">{p.name}</span>
            {p.position && (
              <span className="block truncate text-xs text-muted-foreground">
                {p.position}
              </span>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}

// The account owner sets, once, who drafts, who reviews / approves and in
// what order. The owner is always the last step and cannot be removed.
export function ApprovalWorkflowDialog({
  area,
  open,
  onOpenChange,
}: {
  area: ApprovalArea;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const copy = AREA_COPY[area];
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: workflow, isLoading } = useQuery({
    queryKey: ["approval-workflow", area],
    queryFn: () => fetchApprovalWorkflow(area),
    enabled: open,
  });
  const [drafters, setDrafters] = useState<string[]>([]);
  const [steps, setSteps] = useState<DraftStep[]>([]);

  useEffect(() => {
    if (!open || !workflow) return;
    setDrafters(
      workflow.drafters.filter((d) => d.active !== false).map((d) => d.id),
    );
    setSteps(
      workflow.steps.map((s) => ({
        key: nextKey(),
        name: s.name,
        kind: s.kind,
        userIds: s.people.filter((p) => p.active !== false).map((p) => p.id),
      })),
    );
  }, [open, workflow]);

  const save = useMutation({
    mutationFn: () =>
      saveApprovalWorkflow(area, {
        drafterIds: drafters,
        steps: steps.map((s) => ({
          name: s.name.trim(),
          kind: s.kind,
          userIds: s.userIds,
        })),
      }),
    onSuccess: (w) => {
      qc.setQueryData(["approval-workflow", area], w);
      qc.invalidateQueries({ queryKey: ["approval-workflow", area] });
      toast({ title: "Approval chain saved" });
      onOpenChange(false);
    },
    onError: (e: any) =>
      toast({
        title: "Could not save the chain",
        description: e?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      }),
  });

  const patch = (key: string, p: Partial<DraftStep>) =>
    setSteps((all) => all.map((s) => (s.key === key ? { ...s, ...p } : s)));
  const move = (i: number, dir: -1 | 1) =>
    setSteps((all) => {
      const j = i + dir;
      if (j < 0 || j >= all.length) return all;
      const next = [...all];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const eligible = workflow?.eligible ?? [];
  const incomplete = steps.some(
    (s) => !s.name.trim() || s.userIds.length === 0,
  );
  const noDrafter = steps.length > 0 && drafters.length === 0;
  const off = steps.length === 0 && drafters.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            Choose who drafts and submits {copy.noun}s, and who reviews and
            approves them, in order. You, as the account owner, always give the
            final approval.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !workflow ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            <section className="space-y-2">
              <div>
                <Label className="text-sm font-semibold">1 · Drafters</Label>
                <p className="text-xs text-muted-foreground">
                  Team members with {copy.access} access who can draft a{" "}
                  {copy.noun} and submit it for review. Anyone not listed here
                  (and not on a step below) cannot open {copy.noun}s at all.
                </p>
              </div>
              <PeoplePicker
                people={eligible}
                value={drafters}
                onChange={setDrafters}
                empty={`No active team members have ${copy.access} access yet. Give someone a ${copy.access} role in Team first.`}
              />
            </section>

            <section className="space-y-2">
              <div>
                <Label className="text-sm font-semibold">
                  2 · Reviewers &amp; approvers, in order
                </Label>
                <p className="text-xs text-muted-foreground">
                  A step is decided by any one of the people on it. The next
                  step only opens once the one before it is approved.
                </p>
              </div>
              {steps.map((s, i) => (
                <div key={s.key} className="space-y-2 rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="shrink-0">
                      Step {i + 1}
                    </Badge>
                    <Input
                      className="h-8 min-w-[160px] flex-1"
                      placeholder="Step name, e.g. Legal review"
                      maxLength={60}
                      value={s.name}
                      onChange={(e) => patch(s.key, { name: e.target.value })}
                    />
                    <Select
                      value={s.kind}
                      onValueChange={(v) =>
                        patch(s.key, { kind: v as StepKind })
                      }
                    >
                      <SelectTrigger className="h-8 w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Reviewer">Reviewer</SelectItem>
                        <SelectItem value="Approver">Approver</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="ml-auto flex items-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        disabled={i === steps.length - 1}
                        onClick={() => move(i, 1)}
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() =>
                          setSteps((all) => all.filter((x) => x.key !== s.key))
                        }
                        aria-label="Remove step"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <PeoplePicker
                    people={eligible}
                    value={s.userIds}
                    onChange={(v) => patch(s.key, { userIds: v })}
                    empty={`No active team members have ${copy.access} access yet.`}
                  />
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                disabled={steps.length >= 8}
                onClick={() =>
                  setSteps((all) => [
                    ...all,
                    {
                      key: nextKey(),
                      name: all.length ? "Approval" : "Review",
                      kind: all.length ? "Approver" : "Reviewer",
                      userIds: [],
                    },
                  ])
                }
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add a step
              </Button>
            </section>

            <section className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <Crown className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold">
                  Final step · Tenant owner (you)
                </p>
                <p className="text-xs text-muted-foreground">
                  Always last and always required. If you submit a {copy.noun}{" "}
                  yourself, or approve one early, it is settled straight away.
                </p>
              </div>
            </section>

            {off && (
              <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                With no drafters and no steps, approval is switched off: nothing
                is held back, and only you can work on {copy.noun}s.
              </p>
            )}
            {noDrafter && (
              <p className="rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
                Choose at least one drafter, otherwise only you can submit
                anything.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={save.isPending || isLoading || incomplete || noDrafter}
            onClick={() => save.mutate()}
          >
            {save.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save chain
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
