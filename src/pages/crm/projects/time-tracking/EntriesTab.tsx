import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  submitTimeEntry,
  type TimeEntry,
  type TimesheetStatus,
} from "@/lib/crm/time-tracking-api";

const statusClass: Record<TimesheetStatus, string> = {
  Draft: "bg-muted text-muted-foreground",
  Submitted: "bg-primary/10 text-primary",
  "Lead Approved": "bg-warning/10 text-warning",
  Approved: "bg-success/10 text-success",
  Rejected: "bg-destructive/10 text-destructive",
};

const money = (n: number, c = "USD") =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: c,
    maximumFractionDigits: 0,
  });

export function EntriesTab({ entries }: { entries: TimeEntry[] }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const submitMut = useMutation({
    mutationFn: (id: string) => submitTimeEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
      toast({ title: "Submitted for approval" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to submit",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Mandate / task</TableHead>
              <TableHead>Narrative</TableHead>
              <TableHead className="text-right">Hrs</TableHead>
              <TableHead>Billable</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e) => (
              <TableRow key={e._id}>
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
                <TableCell className="max-w-[240px] text-xs text-muted-foreground">
                  {e.narrative || "—"}
                  {e.rejectReason && (
                    <span className="block text-destructive">
                      Rejected: {e.rejectReason}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm">{e.hours}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {e.billable ? "Billable" : "Non-billable"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={statusClass[e.status]}>{e.status}</Badge>
                </TableCell>
                <TableCell className="text-right text-sm">
                  {money(e.hours * e.rate, e.currency)}
                </TableCell>
                <TableCell className="text-right">
                  {e.status === "Draft" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={submitMut.isPending}
                      onClick={() => submitMut.mutate(e._id)}
                    >
                      <Send className="mr-1 h-3 w-3" /> Submit
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!entries.length && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No time entries yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
