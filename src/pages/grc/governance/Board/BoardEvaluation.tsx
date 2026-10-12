import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardCheck, Plus, Lock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchEvaluationCycles,
  createEvaluationCycle,
  closeEvaluationCycle,
  fetchEvaluationCycleResults,
} from "@/lib/grc/governance-api";

// Tenant side of Board Evaluations (Oct 2026) — the minimal
// counterpart to the board portal's self/peer/chair/committee
// submissions: launch a cycle (title + due date), watch completion
// per director, and close it once done. The PO's own wording is
// entirely board-portal-facing; directors need a cycle to submit
// against, and this is that cycle.
export default function BoardEvaluations() {
  const queryClient = useQueryClient();
  const { data: cycles = [], isLoading } = useQuery({
    queryKey: ["grc-evaluation-cycles"],
    queryFn: fetchEvaluationCycles,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const openCycle = cycles.find((c) => c.status === "Open") ?? null;
  const closedCycles = cycles.filter((c) => c.status === "Closed");
  const viewingId = selectedId ?? openCycle?._id ?? cycles[0]?._id ?? null;

  const { data: results, isLoading: resultsLoading } = useQuery({
    queryKey: ["grc-evaluation-results", viewingId],
    queryFn: () => fetchEvaluationCycleResults(viewingId!),
    enabled: !!viewingId,
  });

  const createMut = useMutation({
    mutationFn: () => createEvaluationCycle({ title: title.trim(), dueDate }),
    onSuccess: (cycle) => {
      queryClient.invalidateQueries({ queryKey: ["grc-evaluation-cycles"] });
      setSelectedId(cycle._id);
      setCreateOpen(false);
      setTitle("");
      setDueDate("");
      toast.success("Evaluation cycle launched.");
    },
    onError: (err: any) => {
      toast(err?.response?.data?.message ?? "Could not launch the cycle.");
    },
  });

  const closeMut = useMutation({
    mutationFn: (id: string) => closeEvaluationCycle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-evaluation-cycles"] });
      queryClient.invalidateQueries({ queryKey: ["grc-evaluation-results"] });
      toast.success("Evaluation cycle closed.");
    },
    onError: (err: any) => {
      toast(err?.response?.data?.message ?? "Could not close the cycle.");
    },
  });

  const submitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) {
      toast("Give the cycle a title and a due date.");
      return;
    }
    createMut.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Board Evaluations
          </h1>
          <p className="text-sm text-muted-foreground">
            Launch a self/peer/chair/committee evaluation round and track
            completion in the board portal.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} disabled={!!openCycle}>
          <Plus className="mr-1.5 h-4 w-4" /> Launch cycle
        </Button>
      </div>

      {openCycle && (
        <Card className="border-l-4 border-l-accent">
          <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold">{openCycle.title}</p>
              <p className="text-xs text-muted-foreground">
                Due {new Date(openCycle.dueDate).toLocaleDateString()} · Open to
                the board portal
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => closeMut.mutate(openCycle._id)}
              disabled={closeMut.isPending}
            >
              {closeMut.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-1.5 h-4 w-4" />
              )}
              Close cycle
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : cycles.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <ClipboardCheck className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            No evaluation cycles yet. Launch one to open self, peer, chair, and
            committee assessments on the board portal.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {cycles.map((c) => (
              <button
                key={c._id}
                type="button"
                onClick={() => setSelectedId(c._id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  viewingId === c._id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary/50",
                )}
              >
                {c.title}
                <Badge
                  className={cn(
                    "ml-2",
                    c.status === "Open"
                      ? "bg-success/10 text-success hover:bg-success/10"
                      : "bg-muted text-muted-foreground hover:bg-muted",
                  )}
                >
                  {c.status}
                </Badge>
              </button>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {results?.cycle?.title ?? "Results"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {resultsLoading || !results ? (
                <p className="text-sm text-muted-foreground">
                  Loading results…
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Directors</p>
                      <p className="text-lg font-bold">
                        {results.totalDirectors}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">
                        Submissions
                      </p>
                      <p className="text-lg font-bold">
                        {results.totalSubmissions}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">
                        Average score
                      </p>
                      <p className="text-lg font-bold">
                        {results.averageScore !== null
                          ? `${results.averageScore} / 5`
                          : "—"}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">
                        Board Chair
                      </p>
                      <p className="text-lg font-bold">
                        {results.chairName ?? "—"}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <Table className="min-w-[720px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Director</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Self</TableHead>
                          <TableHead>Peer</TableHead>
                          <TableHead>Chair</TableHead>
                          <TableHead>Committee</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.directors.map((d) => (
                          <TableRow key={d.boardMemberId}>
                            <TableCell className="font-semibold">
                              {d.name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {d.role}
                            </TableCell>
                            <TableCell>{d.self ? "✓" : "—"}</TableCell>
                            <TableCell>
                              {d.peerSubmitted}/{d.peerExpected}
                            </TableCell>
                            <TableCell>
                              {d.chairSubmitted === null
                                ? "N/A"
                                : d.chairSubmitted
                                  ? "✓"
                                  : "—"}
                            </TableCell>
                            <TableCell>
                              {d.committeeSubmitted}/{d.committeeExpected}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={cn(
                                  d.complete
                                    ? "bg-success/10 text-success hover:bg-success/10"
                                    : "bg-warning/15 text-amber-700 hover:bg-warning/15",
                                )}
                              >
                                {d.complete
                                  ? "Complete"
                                  : `${d.submitted}/${d.expected}`}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Launch an evaluation cycle</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="eval-title">Title</Label>
              <Input
                id="eval-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q4 2026 Board Self-Assessment"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eval-due">Due date</Label>
              <Input
                id="eval-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? "Launching…" : "Launch cycle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
