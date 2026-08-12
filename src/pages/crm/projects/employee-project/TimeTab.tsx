import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Timer, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchMyTasks } from "@/lib/crm/mandates-api";
import {
  fetchMyTimeEntries,
  logMyTime,
  submitMyTimeEntry,
  type TimesheetStatus,
} from "@/lib/crm/time-tracking-api";

const statusClass: Record<TimesheetStatus, string> = {
  Draft: "bg-muted text-muted-foreground",
  Submitted: "bg-primary/10 text-primary",
  "Lead Approved": "bg-warning/10 text-warning",
  Approved: "bg-success/10 text-success",
  Rejected: "bg-destructive/10 text-destructive",
};

export function TimeTab({ mandateId }: { mandateId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["myTimeEntries", mandateId],
    queryFn: () => fetchMyTimeEntries(mandateId),
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["myTasks", mandateId],
    queryFn: () => fetchMyTasks(mandateId),
  });

  const [open, setOpen] = useState(false);
  const [taskId, setTaskId] = useState("");
  const [narrative, setNarrative] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState("");
  const [billable, setBillable] = useState(true);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["myTimeEntries", mandateId] });

  const logMut = useMutation({
    mutationFn: () => {
      const t = tasks.find((x) => x._id === taskId);
      return logMyTime({
        mandateId,
        taskId: taskId || undefined,
        taskTitle: t?.title,
        narrative,
        date,
        hours: Number(hours),
        billable,
      });
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setTaskId("");
      setNarrative("");
      setHours("");
      toast({
        title: "Time logged",
        description: "Saved as a draft — submit it when ready for approval.",
      });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to log time",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const submitMut = useMutation({
    mutationFn: (id: string) => submitMyTimeEntry(id),
    onSuccess: () => {
      invalidate();
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
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Timer className="mr-1.5 h-3.5 w-3.5" /> Log time
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log time on this mandate</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Task (optional)</Label>
                <Select value={taskId} onValueChange={setTaskId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ad-hoc work (no specific task)" />
                  </SelectTrigger>
                  <SelectContent>
                    {tasks.map((t) => (
                      <SelectItem key={t._id} value={t._id}>
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hours</Label>
                  <Input
                    type="number"
                    step="0.25"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    placeholder="e.g. 1.5"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Note</Label>
                <Textarea
                  value={narrative}
                  onChange={(e) => setNarrative(e.target.value)}
                  placeholder="What did you work on?"
                />
              </div>
              <label className="flex items-center justify-between rounded border p-3 text-sm">
                Billable
                <Switch checked={billable} onCheckedChange={setBillable} />
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={logMut.isPending || !hours || Number(hours) <= 0}
                onClick={() => logMut.mutate()}
              >
                {logMut.isPending ? "Saving…" : "Save log"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="space-y-2 p-4">
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          ) : (
            <>
              {entries.map((e) => (
                <div
                  key={e._id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {e.taskTitle}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {e.narrative || "—"} · {e.date?.slice(0, 10)}
                    </p>
                  </div>
                  <Badge className={statusClass[e.status]}>{e.status}</Badge>
                  <Badge variant="outline">{e.hours}h</Badge>
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
                </div>
              ))}
              {!entries.length && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No time logged yet.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
