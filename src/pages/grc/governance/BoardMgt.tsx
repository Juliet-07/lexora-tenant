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
  ShieldAlert,
  GraduationCap,
  ArrowRightLeft,
  Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchBoardMembers,
  createBoardMember,
  recordConflict,
  logTraining,
  setSuccessor,
  type BoardMember,
  type BoardMemberRole,
} from "@/lib/grc/governance-api";

const ROLES: BoardMemberRole[] = [
  "Chair",
  "Vice-Chair",
  "Executive Director",
  "Non-Executive Director",
  "Independent Director",
];

export default function GrcBoardMgt() {
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<BoardMember | null>(null);

  const { data: boardMembers = [], isLoading } = useQuery({
    queryKey: ["grc-board-members"],
    queryFn: fetchBoardMembers,
  });

  const today = new Date().toISOString().slice(0, 10);
  const soon = boardMembers.filter(
    (b) => b.termEnds < new Date(Date.now() + 180 * 86400000).toISOString(),
  );

  // Keep the open sheet's data fresh after a conflict/training mutation
  const selectedLive = selected
    ? (boardMembers.find((b) => b._id === selected._id) ?? selected)
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading board members…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Board Management</h1>
          <p className="text-sm text-muted-foreground">
            Directors, succession planning, conflict-of-interest register, and
            training.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New director
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard
          label="Board members"
          value={boardMembers.length}
          icon={<ArrowRightLeft className="h-5 w-5" />}
          tone="from-primary/15 to-primary/5"
        />
        <StatCard
          label="Terms ending in 6 months"
          value={soon.length}
          icon={<GraduationCap className="h-5 w-5" />}
          tone="from-amber-500/15 to-amber-500/5"
        />
        <StatCard
          label="Open conflicts"
          value={boardMembers.reduce((a, b) => a + b.conflicts.length, 0)}
          icon={<ShieldAlert className="h-5 w-5" />}
          tone="from-rose-500/15 to-rose-500/5"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Director</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Appointed</TableHead>
                <TableHead>Term ends</TableHead>
                <TableHead>Conflicts</TableHead>
                <TableHead>Training</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boardMembers.map((b) => (
                <TableRow
                  key={b._id}
                  className="cursor-pointer"
                  onClick={() => setSelected(b)}
                >
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{b.role}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(b.appointedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell
                    className={
                      b.termEnds < today ? "text-rose-600 text-xs" : "text-xs"
                    }
                  >
                    {new Date(b.termEnds).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{b.conflicts.length}</TableCell>
                  <TableCell>{b.training.length}</TableCell>
                </TableRow>
              ))}
              {boardMembers.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-sm text-muted-foreground py-8"
                  >
                    No board members yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NewDirectorDialog open={newOpen} onOpenChange={setNewOpen} />
      <DirectorSheet
        member={selectedLive}
        allMembers={boardMembers}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function StatCard({ label, value, icon, tone }: any) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className={`h-11 w-11 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center text-primary`}
        >
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function NewDirectorDialog({ open, onOpenChange }: any) {
  const queryClient = useQueryClient();
  const [f, setF] = useState({
    name: "",
    role: "Non-Executive Director" as BoardMemberRole,
    email: "",
    appointedAt: new Date().toISOString().slice(0, 10),
    termEnds: new Date(Date.now() + 730 * 86400000).toISOString().slice(0, 10),
    bio: "",
  });

  const mutation = useMutation({
    mutationFn: () => createBoardMember(f),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-board-members"] });
      toast({ title: "Director added" });
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast({
        title: "Failed to add director",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const submit = () => {
    if (!f.name)
      return toast({ title: "Name required", variant: "destructive" });
    if (!f.email)
      return toast({ title: "Email required", variant: "destructive" });
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New director</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Name</Label>
              <Input
                value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Role</Label>
            <Select
              value={f.role}
              onValueChange={(v) => setF({ ...f, role: v as BoardMemberRole })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Appointed</Label>
              <Input
                type="date"
                value={f.appointedAt}
                onChange={(e) => setF({ ...f, appointedAt: e.target.value })}
              />
            </div>
            <div>
              <Label>Term ends</Label>
              <Input
                type="date"
                value={f.termEnds}
                onChange={(e) => setF({ ...f, termEnds: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Bio</Label>
            <Textarea
              rows={2}
              value={f.bio}
              onChange={(e) => setF({ ...f, bio: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DirectorSheet({
  member,
  allMembers,
  onClose,
}: {
  member: BoardMember | null;
  allMembers: BoardMember[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [conflict, setConflict] = useState("");
  const [training, setTraining] = useState("");

  const successorMutation = useMutation({
    mutationFn: (successorId: string | null) =>
      setSuccessor(member!._id, successorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-board-members"] });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to set successor",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const conflictMutation = useMutation({
    mutationFn: () => recordConflict(member!._id, conflict),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-board-members"] });
      setConflict("");
    },
    onError: (err: any) =>
      toast({
        title: "Failed to record disclosure",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const trainingMutation = useMutation({
    mutationFn: () => logTraining(member!._id, training),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-board-members"] });
      setTraining("");
    },
    onError: (err: any) =>
      toast({
        title: "Failed to log training",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  if (!member) return null;

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{member.name}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{member.role}</Badge>
            <Badge variant="outline">
              Appointed {new Date(member.appointedAt).toLocaleDateString()}
            </Badge>
            <Badge variant="outline">
              Term ends {new Date(member.termEnds).toLocaleDateString()}
            </Badge>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Bio</div>
            <div className="text-sm">{member.bio || "—"}</div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">
              Succession plan
            </Label>
            <Select
              value={
                typeof member.successorId === "object" && member.successorId
                  ? member.successorId._id
                  : ((member.successorId as string | null) ?? "none")
              }
              onValueChange={(v) =>
                successorMutation.mutate(v === "none" ? null : v)
              }
              disabled={successorMutation.isPending}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="No successor designated" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {allMembers
                  .filter((m) => m._id !== member._id)
                  .map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.name} ({m.role})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <section className="border-t pt-3">
            <div className="font-medium text-sm mb-2 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Conflict-of-interest disclosures
            </div>
            <div className="space-y-1 mb-2">
              {member.conflicts.map((c, i) => (
                <div
                  key={i}
                  className="text-xs border rounded px-2 py-1 flex justify-between"
                >
                  <span>{c.note}</span>
                  <span className="text-muted-foreground">
                    {new Date(c.disclosedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {member.conflicts.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  No disclosures on file.
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={conflict}
                onChange={(e) => setConflict(e.target.value)}
                placeholder="Disclose conflict…"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!conflict || conflictMutation.isPending}
                onClick={() => conflictMutation.mutate()}
              >
                {conflictMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Record"
                )}
              </Button>
            </div>
          </section>

          <section className="border-t pt-3">
            <div className="font-medium text-sm mb-2 flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Training log
            </div>
            <div className="space-y-1 mb-2">
              {member.training.map((t, i) => (
                <div
                  key={i}
                  className="text-xs border rounded px-2 py-1 flex justify-between"
                >
                  <span>{t.title}</span>
                  <span className="text-muted-foreground">
                    {new Date(t.completedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {member.training.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  No training recorded.
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={training}
                onChange={(e) => setTraining(e.target.value)}
                placeholder="Training / certification…"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!training || trainingMutation.isPending}
                onClick={() => trainingMutation.mutate()}
              >
                {trainingMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Log"
                )}
              </Button>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
