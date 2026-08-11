import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ShieldCheck, MessageSquare, StickyNote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  advanceMandateStage, clearConflictCheck, updateMandate,
  fetchMessages, fetchNotes,
  MANDATE_STAGE_META, type Mandate, type Rag,
} from "@/lib/crm/mandates-api";

export function WorkspaceTab({ mandate }: { mandate: Mandate }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["mandates"] });
  const onErr = (title: string) => (err: any) =>
    toast({ title, description: err?.response?.data?.message, variant: "destructive" });

  const advanceMut = useMutation({
    mutationFn: () => advanceMandateStage(mandate._id),
    onSuccess: (m) => {
      invalidate();
      toast({ title: `Moved to ${m.stage}`, description: m.stageTrigger });
    },
    onError: onErr("Couldn't advance stage"),
  });

  const clearConflictMut = useMutation({
    mutationFn: () => clearConflictCheck(mandate._id),
    onSuccess: () => { invalidate(); toast({ title: "Conflict check cleared" }); },
  });

  const ragMut = useMutation({
    mutationFn: (rag: Rag) => updateMandate(mandate._id, { rag }),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Current stage — {mandate.stage} (owner: {MANDATE_STAGE_META[mandate.stage].owner})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{MANDATE_STAGE_META[mandate.stage].trigger}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={advanceMut.isPending || mandate.stage === "Close"} onClick={() => advanceMut.mutate()}>
              Advance stage
            </Button>
            {mandate.conflictCheck !== "Cleared" && (
              <Button size="sm" variant="outline" disabled={clearConflictMut.isPending} onClick={() => clearConflictMut.mutate()}>
                <ShieldCheck className="mr-2 h-4 w-4" /> Clear conflict check
              </Button>
            )}
            <Select value={mandate.rag} onValueChange={(v) => ragMut.mutate(v as Rag)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["Green", "Amber", "Red"] as Rag[]).map((r) => <SelectItem key={r} value={r}>RAG: {r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="space-y-1 p-4 text-sm">
            <p className="text-xs text-muted-foreground">Team</p>
            {mandate.teamName && <p className="text-xs text-muted-foreground">Team: {mandate.teamName}</p>}
            {mandate.manager && <p>{mandate.manager} (manager)</p>}
            {mandate.team.map((t) => <p key={t}>{t}</p>)}
            {!mandate.team.length && !mandate.manager && <p className="text-muted-foreground">No team assigned yet</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-4 text-sm">
            <p className="text-xs text-muted-foreground">Dates</p>
            <p>Start: {mandate.startDate?.slice(0, 10)}</p>
            <p>Target: {mandate.targetDate?.slice(0, 10)}</p>
            <p>Conflict check: <Badge variant="outline">{mandate.conflictCheck}</Badge></p>
          </CardContent>
        </Card>
      </div>

      <ActivityLog mandateId={mandate._id} />
    </div>
  );
}

// Derived from real messages + notes — not a full audit trail, but
// genuinely real data rather than the unrelated global mock feed the
// original prototype showed here.
function ActivityLog({ mandateId }: { mandateId: string }) {
  const { data: messages = [] } = useQuery({ queryKey: ["mandateMessages", mandateId], queryFn: () => fetchMessages(mandateId) });
  const { data: notes = [] } = useQuery({ queryKey: ["mandateNotes", mandateId], queryFn: () => fetchNotes(mandateId) });

  const entries = [
    ...messages.map((m) => ({
      at: m.createdAt,
      icon: MessageSquare,
      text: m.direction === "tenant" ? `${m.author} messaged the client` : `${m.author} sent a message`,
    })),
    ...notes.map((n) => ({ at: n.createdAt, icon: StickyNote, text: `${n.author} added a note` })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Activity log</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {entries.map((e, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <e.icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{e.text}</span>
            <span className="text-xs text-muted-foreground">· {new Date(e.at).toLocaleString()}</span>
          </div>
        ))}
        {!entries.length && <p className="text-sm text-muted-foreground">No activity yet.</p>}
      </CardContent>
    </Card>
  );
}
