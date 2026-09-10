import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ArrowLeft, Clock, Phone, Plus, Scale } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchMyCases,
  fetchMyCaseDetail,
  logMyCaseTime,
  logMyCaseCall,
  type AdrCase,
} from "@/lib/crm/adr-api";
import { fetchMyTimeEntries } from "@/lib/crm/time-tracking-api";

const statusTone: Record<string, string> = {
  Active: "bg-info/10 text-info border-info/20",
  Resolved: "bg-success/10 text-success border-success/20",
  "Escalated to litigation": "bg-warning/10 text-warning border-warning/20",
  Withdrawn: "bg-muted text-muted-foreground border-border",
};

export default function MyCases() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["myCases"],
    queryFn: fetchMyCases,
  });

  const { data: detail } = useQuery({
    queryKey: ["myCaseDetail", selectedId],
    queryFn: () => fetchMyCaseDetail(selectedId!),
    enabled: !!selectedId,
  });

  const filtered = useMemo(
    () =>
      cases.filter((c) =>
        `${c.title} ${c.ref}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [cases, query],
  );

  if (selectedId && detail) {
    return <MyCaseDetailView c={detail} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Scale className="h-6 w-6" /> My Cases
        </h1>
        <p className="text-sm text-muted-foreground">
          ADR cases your team is assigned to handle.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search cases…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((c) => (
            <Card
              key={c._id}
              className="cursor-pointer hover:border-primary/50"
              onClick={() => setSelectedId(c._id)}
            >
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.ref}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={statusTone[c.status] ?? ""}
                  >
                    {c.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {c.stage} · {c.mandateName || "No mandate linked"}
                </p>
              </CardContent>
            </Card>
          ))}
          {!filtered.length && (
            <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
              No cases assigned to your team yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MyCaseDetailView({ c, onBack }: { c: AdrCase; onBack: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: myEntries = [] } = useQuery({
    queryKey: ["myTimeEntries", c._id],
    queryFn: () => fetchMyTimeEntries(),
  });
  const caseEntries = myEntries.filter((e) => e.adrCaseId === c._id);

  const [timeOpen, setTimeOpen] = useState(false);
  const [timeDraft, setTimeDraft] = useState({
    date: new Date().toISOString().slice(0, 10),
    hours: 1,
    narrative: "",
    billable: true,
  });
  const timeMut = useMutation({
    mutationFn: () => logMyCaseTime(c._id, timeDraft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myTimeEntries", c._id] });
      setTimeOpen(false);
      setTimeDraft({
        date: new Date().toISOString().slice(0, 10),
        hours: 1,
        narrative: "",
        billable: true,
      });
      toast({ title: "Time logged" });
    },
    onError: (err: any) =>
      toast({
        title: "Could not log time",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const [callOpen, setCallOpen] = useState(false);
  const [callSummary, setCallSummary] = useState("");
  const callMut = useMutation({
    mutationFn: () => logMyCaseCall(c._id, callSummary.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myCaseDetail", c._id] });
      setCallOpen(false);
      setCallSummary("");
      toast({ title: "Call logged" });
    },
  });

  const timeline = [...c.timeline].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> All cases
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{c.title}</h1>
          <p className="text-sm text-muted-foreground">
            {c.ref} · {c.stage} · {c.mandateName || "No mandate linked"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setCallOpen(true)}>
            <Phone className="mr-1.5 h-4 w-4" /> Log call
          </Button>
          <Button size="sm" onClick={() => setTimeOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Log time
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-base">
            <Clock className="h-4 w-4" /> My time on this case
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Narrative</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {caseEntries.map((e) => (
                <TableRow key={e._id}>
                  <TableCell className="text-sm">
                    {e.date?.slice(0, 10)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {e.narrative || "—"}
                  </TableCell>
                  <TableCell className="text-sm">{e.hours}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{e.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!caseEntries.length && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-6 text-center text-sm text-muted-foreground"
                  >
                    No time logged yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {timeline.map((t, i) => (
            <div key={i} className="border-b pb-2 last:border-0">
              <p className="text-sm font-medium">{t.title}</p>
              {t.description && (
                <p className="text-xs text-muted-foreground">{t.description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {new Date(t.at).toLocaleString()}
              </p>
            </div>
          ))}
          {!timeline.length && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No activity yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={timeOpen} onOpenChange={setTimeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log time — {c.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={timeDraft.date}
                  onChange={(e) =>
                    setTimeDraft({ ...timeDraft, date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Hours</Label>
                <Input
                  type="number"
                  step="0.25"
                  min="0.25"
                  value={timeDraft.hours}
                  onChange={(e) =>
                    setTimeDraft({
                      ...timeDraft,
                      hours: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Narrative</Label>
              <Textarea
                value={timeDraft.narrative}
                onChange={(e) =>
                  setTimeDraft({ ...timeDraft, narrative: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={timeMut.isPending || timeDraft.hours <= 0}
              onClick={() => timeMut.mutate()}
            >
              {timeMut.isPending ? "Saving…" : "Log time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={callOpen} onOpenChange={setCallOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log call — {c.title}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="What was discussed…"
            value={callSummary}
            onChange={(e) => setCallSummary(e.target.value)}
          />
          <DialogFooter>
            <Button
              disabled={callMut.isPending || !callSummary.trim()}
              onClick={() => callMut.mutate()}
            >
              {callMut.isPending ? "Saving…" : "Log call"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
