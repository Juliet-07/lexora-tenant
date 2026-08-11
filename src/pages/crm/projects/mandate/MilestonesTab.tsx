import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, CheckCircle2, Clock, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  addMilestone, updateMilestone, deleteMilestone,
  type Mandate, type MilestoneStatus,
} from "@/lib/crm/mandates-api";

const statusMeta: Record<MilestoneStatus, { icon: any; label: string; class: string }> = {
  completed: { icon: CheckCircle2, label: "Completed", class: "text-success" },
  in_progress: { icon: Clock, label: "In progress", class: "text-warning" },
  pending: { icon: Circle, label: "Pending", class: "text-muted-foreground" },
};

const cycleStatus = (current: MilestoneStatus): MilestoneStatus =>
  current === "pending" ? "in_progress" : current === "in_progress" ? "completed" : "pending";

export function MilestonesTab({ mandate }: { mandate: Mandate }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const milestones = mandate.milestones ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["mandates"] });

  const addMut = useMutation({
    mutationFn: () => addMilestone(mandate._id, name.trim(), date),
    onSuccess: () => { invalidate(); setName(""); setDate(""); toast({ title: "Milestone added" }); },
  });
  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MilestoneStatus }) =>
      updateMilestone(mandate._id, id, { status }),
    onSuccess: invalidate,
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteMilestone(mandate._id, id),
    onSuccess: () => { invalidate(); toast({ title: "Milestone removed" }); },
  });

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Visible to the employee and client views once those are wired up — click the status icon to cycle it.
      </p>
      <div className="space-y-2">
        {milestones.map((m) => {
          const meta = statusMeta[m.status];
          return (
            <div key={m._id} className="flex items-center gap-3 rounded border p-3 text-sm">
              <button onClick={() => statusMut.mutate({ id: m._id, status: cycleStatus(m.status) })}>
                <meta.icon className={`h-4 w-4 ${meta.class}`} />
              </button>
              <div className="flex-1">
                <p className={m.status === "completed" ? "line-through text-muted-foreground" : ""}>{m.name}</p>
                <p className="text-xs text-muted-foreground">{meta.label} · {m.date?.slice(0, 10)}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(m._id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
        {!milestones.length && <p className="text-sm text-muted-foreground">No milestones yet.</p>}
      </div>
      <div className="flex gap-2">
        <Input placeholder="Milestone name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input type="date" className="w-40" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button disabled={addMut.isPending || !name.trim() || !date} onClick={() => addMut.mutate()}>Add</Button>
      </div>
    </div>
  );
}
