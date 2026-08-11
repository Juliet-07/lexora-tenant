import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Timer, TriangleAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LocalTimeLog {
  id: string;
  date: string;
  hours: number;
  note: string;
}

// Deliberately local-only — Timesheets is its own not-yet-built
// sidebar item, so there's no real place for this to be saved to
// yet. Kept interactive rather than removed so the shape of the
// feature is visible, but flagged clearly rather than pretending
// it persists.
export function TimeTab() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<LocalTimeLog[]>([]);
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");

  const submit = () => {
    const h = Number(hours);
    if (!h || h <= 0) return;
    setLogs((prev) => [
      {
        id: `local-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        hours: h,
        note: note || "—",
      },
      ...prev,
    ]);
    setHours("");
    setNote("");
    setOpen(false);
    toast({
      title: "Time logged locally",
      description: "Not yet saved — Timesheets is coming in a later phase.",
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
        <span className="flex items-center gap-1.5">
          <TriangleAlert className="h-3.5 w-3.5" /> Not yet saved to a real
          timesheet — this is local to your browser until Timesheets is built.
        </span>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Timer className="h-3.5 w-3.5 mr-1.5" /> Log time
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log time on this mandate</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Hours</label>
                <Input
                  type="number"
                  step="0.25"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="e.g. 1.5"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Note</label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What did you work on?"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submit}>Save log</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          {logs.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between p-3 rounded-lg border"
            >
              <div>
                <p className="text-sm font-medium">{l.note}</p>
                <p className="text-xs text-muted-foreground">{l.date}</p>
              </div>
              <Badge variant="outline">{l.hours}h</Badge>
            </div>
          ))}
          {!logs.length && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No time logged yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
