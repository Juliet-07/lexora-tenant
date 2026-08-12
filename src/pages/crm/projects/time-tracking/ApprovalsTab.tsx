import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  leadApproveTimeEntry,
  approveTimeEntry,
  rejectTimeEntry,
  type TimeEntry,
} from "@/lib/crm/time-tracking-api";

export function ApprovalsTab({ entries }: { entries: TimeEntry[] }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const pending = entries.filter(
    (e) => e.status === "Submitted" || e.status === "Lead Approved",
  );

  const [selected, setSelected] = useState<string[]>([]);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
    setSelected([]);
  };
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const leadApproveMut = useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(ids.map((id) => leadApproveTimeEntry(id))),
    onSuccess: () => {
      invalidate();
      toast({ title: "Lead approved" });
    },
    onError: onErr("Failed to lead-approve"),
  });
  const approveMut = useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(ids.map((id) => approveTimeEntry(id))),
    onSuccess: () => {
      invalidate();
      toast({ title: "Approved — now counts toward WIP" });
    },
    onError: onErr("Failed to approve"),
  });
  const rejectMut = useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(ids.map((id) => rejectTimeEntry(id, rejectReason))),
    onSuccess: () => {
      invalidate();
      setRejectOpen(false);
      setRejectReason("");
      toast({ title: "Rejected" });
    },
    onError: onErr("Failed to reject"),
  });

  const toggle = (id: string) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <div className="flex items-center gap-2 rounded border bg-muted/40 p-2 text-sm">
          <span className="text-muted-foreground">
            {selected.length} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={leadApproveMut.isPending}
            onClick={() => leadApproveMut.mutate(selected)}
          >
            Lead approve
          </Button>
          <Button
            size="sm"
            disabled={approveMut.isPending}
            onClick={() => approveMut.mutate(selected)}
          >
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive"
            onClick={() => setRejectOpen(true)}
          >
            <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Date</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Mandate / task</TableHead>
                <TableHead className="text-right">Hrs</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((e) => (
                <TableRow key={e._id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.includes(e._id)}
                      onCheckedChange={() => toggle(e._id)}
                    />
                  </TableCell>
                  <TableCell className="text-sm">
                    {e.date?.slice(0, 10)}
                  </TableCell>
                  <TableCell className="text-sm">{e.member}</TableCell>
                  <TableCell>
                    <p className="text-sm">{e.taskTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.mandateName}
                    </p>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {e.hours}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{e.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!pending.length && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Nothing awaiting approval.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Reject {selected.length} entr{selected.length === 1 ? "y" : "ies"}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={rejectMut.isPending || !rejectReason.trim()}
              onClick={() => rejectMut.mutate(selected)}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
