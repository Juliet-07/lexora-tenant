import { useState } from "react";
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
import { Plus, Users2, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchCommittees,
  createCommittee,
  addCommitteeMember,
  removeCommitteeMember,
  addCommitteeTask,
  updateCommitteeTaskStatus,
  type Committee,
  type CommitteeMemberRole,
  type CommitteeTaskStatus,
} from "@/lib/grc/governance-api";

export default function GrcCommittees() {
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<Committee | null>(null);

  const { data: committees = [], isLoading } = useQuery({
    queryKey: ["grc-committees"],
    queryFn: fetchCommittees,
  });

  const selectedLive = selected
    ? (committees.find((c) => c._id === selected._id) ?? selected)
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading committees…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Committees</h1>
          <p className="text-sm text-muted-foreground">
            Compose committees, assign members, track responsibilities and
            tasks.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New committee
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {committees.map((c) => (
          <Card
            key={c._id}
            className="cursor-pointer hover:shadow-md transition"
            onClick={() => setSelected(c)}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div className="font-semibold">{c.name}</div>
                <Badge variant="outline">
                  <Users2 className="h-3 w-3 mr-1" />
                  {c.members.length}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Chair: {c.chair ?? "Not yet assigned"}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {c.purpose}
              </p>
              <div className="text-xs flex gap-2">
                <Badge variant="secondary">
                  {c.tasks.filter((t) => t.status !== "Done").length} open tasks
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {committees.length === 0 && (
          <p className="col-span-2 text-center text-sm text-muted-foreground py-8">
            No committees yet.
          </p>
        )}
      </div>

      <NewCommitteeDialog open={newOpen} onOpenChange={setNewOpen} />
      <CommitteeSheet
        committee={selectedLive}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function NewCommitteeDialog({ open, onOpenChange }: any) {
  const queryClient = useQueryClient();
  const [f, setF] = useState({ name: "", purpose: "" });

  const mutation = useMutation({
    mutationFn: () => createCommittee(f),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-committees"] });
      toast({ title: "Committee created" });
      onOpenChange(false);
      setF({ name: "", purpose: "" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to create committee",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const submit = () => {
    if (!f.name)
      return toast({ title: "Name required", variant: "destructive" });
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New committee</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Purpose</Label>
            <Textarea
              rows={3}
              value={f.purpose}
              onChange={(e) => setF({ ...f, purpose: e.target.value })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            The chair is set when you add members below — select "Chair" as
            their role.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CommitteeSheet({
  committee,
  onClose,
}: {
  committee: Committee | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [mem, setMem] = useState<{
    name: string;
    email: string;
    role: CommitteeMemberRole;
  }>({
    name: "",
    email: "",
    role: "Member",
  });
  const [tk, setTk] = useState({
    title: "",
    owner: "",
    dueDate: new Date().toISOString().slice(0, 10),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["grc-committees"] });

  const addMemberMutation = useMutation({
    mutationFn: () => addCommitteeMember(committee!._id, mem),
    onSuccess: () => {
      invalidate();
      setMem({ name: "", email: "", role: "Member" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to add member",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (index: number) => removeCommitteeMember(committee!._id, index),
    onSuccess: invalidate,
    onError: (err: any) =>
      toast({
        title: "Failed to remove member",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const addTaskMutation = useMutation({
    mutationFn: () => addCommitteeTask(committee!._id, tk),
    onSuccess: () => {
      invalidate();
      setTk({
        title: "",
        owner: "",
        dueDate: new Date().toISOString().slice(0, 10),
      });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to add task",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const taskStatusMutation = useMutation({
    mutationFn: ({
      index,
      status,
    }: {
      index: number;
      status: CommitteeTaskStatus;
    }) => updateCommitteeTaskStatus(committee!._id, index, status),
    onSuccess: invalidate,
    onError: (err: any) =>
      toast({
        title: "Failed to update task",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  if (!committee) return null;

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{committee.name}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-5">
          <div className="text-sm text-muted-foreground">
            {committee.purpose}
          </div>

          <section className="border-t pt-4 space-y-2">
            <div className="font-medium text-sm">Members</div>
            <div className="space-y-1">
              {committee.members.map((m, i) => (
                <div
                  key={i}
                  className="flex justify-between text-xs border rounded px-2 py-1 items-center"
                >
                  <span>
                    {m.name}{" "}
                    <span className="text-muted-foreground">{m.email}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {m.role}
                    </Badge>
                    <button
                      onClick={() => removeMemberMutation.mutate(i)}
                      disabled={removeMemberMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
              {committee.members.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  No members yet.
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Input
                placeholder="Name"
                value={mem.name}
                onChange={(e) => setMem({ ...mem, name: e.target.value })}
              />
              <Input
                placeholder="Email"
                value={mem.email}
                onChange={(e) => setMem({ ...mem, email: e.target.value })}
              />
              <Select
                value={mem.role}
                onValueChange={(v) =>
                  setMem({ ...mem, role: v as CommitteeMemberRole })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Chair", "Secretary", "Member"].map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  !mem.name || !mem.email || addMemberMutation.isPending
                }
                onClick={() => addMemberMutation.mutate()}
              >
                {addMemberMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Add"
                )}
              </Button>
            </div>
          </section>

          <section className="border-t pt-4 space-y-2">
            <div className="font-medium text-sm">Tasks & responsibilities</div>
            <div className="space-y-1">
              {committee.tasks.map((t, i) => (
                <div
                  key={i}
                  className="flex justify-between text-xs border rounded px-2 py-1 items-center"
                >
                  <div>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-muted-foreground">
                      {t.owner} · due {new Date(t.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={t.status}
                      onValueChange={(v) =>
                        taskStatusMutation.mutate({
                          index: i,
                          status: v as CommitteeTaskStatus,
                        })
                      }
                    >
                      <SelectTrigger className="h-7 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Open", "In Progress", "Done"].map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {t.status === "Done" && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                  </div>
                </div>
              ))}
              {committee.tasks.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  No tasks yet.
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Input
                className="col-span-2"
                placeholder="Task title"
                value={tk.title}
                onChange={(e) => setTk({ ...tk, title: e.target.value })}
              />
              <Input
                placeholder="Owner"
                value={tk.owner}
                onChange={(e) => setTk({ ...tk, owner: e.target.value })}
              />
              <Input
                type="date"
                value={tk.dueDate}
                onChange={(e) => setTk({ ...tk, dueDate: e.target.value })}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={!tk.title || addTaskMutation.isPending}
              onClick={() => addTaskMutation.mutate()}
            >
              {addTaskMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin mr-2" />
              ) : null}
              Add task
            </Button>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
