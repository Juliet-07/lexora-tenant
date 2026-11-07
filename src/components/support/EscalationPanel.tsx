import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Loader2, Send, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { SupportThread } from "./SupportThread";
import {
  fetchEscalation,
  escalateClientTicket,
  replySupportTicket,
  supportStatusClass,
} from "@/lib/support-api";

interface Props {
  ticket: {
    _id: string;
    subject: string;
    category: string;
    clientName: string;
    priority: string;
  };
  /** Posts a client-facing note on the client's ticket. */
  onShareWithClient: (text: string) => Promise<unknown>;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A client's "Portal access" ticket is a platform problem as much as a client
// one. From here the tenant escalates it to the platform team (Super Admin),
// follows their replies, and passes updates back to the client themselves.
//
// The platform team never sees the client: only the subject and description
// typed in the dialog go up, and the engine rejects them if they contain the
// client's name.
export function EscalationPanel({ ticket, onShareWithClient }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const isPortal = /portal/i.test(ticket.category);

  const { data: escalation, isLoading } = useQuery({
    queryKey: ["escalation", ticket._id],
    queryFn: () => fetchEscalation(ticket._id),
    enabled: isPortal,
  });

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    subject: "",
    description: "",
    notifyClient: true,
  });
  const [sharedIds, setSharedIds] = useState<string[]>([]);

  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["escalation", ticket._id] });
    qc.invalidateQueries({ queryKey: ["tickets"] });
    qc.invalidateQueries({ queryKey: ["support-tickets"] });
  };

  const escalateMut = useMutation({
    mutationFn: () =>
      escalateClientTicket(ticket._id, {
        subject: draft.subject.trim(),
        description: draft.description.trim(),
        notifyClient: draft.notifyClient,
      }),
    onSuccess: (t) => {
      refresh();
      setOpen(false);
      toast({
        title: "Escalated to the platform team",
        description: `${t.ref} — their replies will appear here.`,
      });
    },
    onError: onErr("Couldn't escalate"),
  });
  const replyMut = useMutation({
    mutationFn: (body: string) => replySupportTicket(escalation!._id, body),
    onSuccess: refresh,
    onError: onErr("Couldn't send the message"),
  });
  const shareMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      onShareWithClient(body).then(() => id),
    onSuccess: (id) => {
      setSharedIds((s) => [...s, id]);
      toast({ title: "Update sent to the client" });
    },
    onError: onErr("Couldn't send the update"),
  });

  if (!isPortal) return null;

  const openDialog = () => {
    // Start from the ticket's subject, minus the client's name.
    const name = ticket.clientName?.trim();
    const subject =
      name && name.length >= 3
        ? ticket.subject.replace(new RegExp(escape(name), "gi"), "a client")
        : ticket.subject;
    setDraft({ subject, description: "", notifyClient: true });
    setOpen(true);
  };

  const active =
    escalation && !["Resolved", "Closed"].includes(escalation.status);

  return (
    <Card className="border-primary/30">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <ArrowUpRight className="h-4 w-4 text-primary" /> Platform support
          </h4>
          {escalation && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {escalation.ref}
              </span>
              <Badge className={supportStatusClass[escalation.status]}>
                {escalation.status}
              </Badge>
            </div>
          )}
        </div>

        {isLoading && (
          <p className="text-xs text-muted-foreground">Checking escalation…</p>
        )}

        {!isLoading && !escalation && (
          <>
            <p className="text-sm text-muted-foreground">
              Portal problems often need the platform team. Escalate this and
              they'll work on it with you — they won't see your client or any of
              their details, and you stay the one who updates them.
            </p>
            <Button size="sm" onClick={openDialog}>
              <ArrowUpRight className="mr-2 h-4 w-4" /> Escalate to platform
              team
            </Button>
          </>
        )}

        {escalation && (
          <>
            <p className="flex items-start gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              The platform team only sees what you sent them. Use “Send to
              client” to pass any of their replies on — the client can't see
              this thread.
            </p>
            <SupportThread
              messages={escalation.messages}
              sending={replyMut.isPending}
              disabled={escalation.status === "Closed"}
              disabledNote="The platform ticket is closed."
              placeholder="Message the platform team…"
              onSend={(b) => replyMut.mutateAsync(b)}
              messageAction={(m) =>
                sharedIds.includes(m._id) ? (
                  <span className="text-xs text-success">Sent to client</span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={shareMut.isPending}
                    onClick={() => shareMut.mutate({ id: m._id, body: m.body })}
                  >
                    <Send className="mr-1.5 h-3 w-3" /> Send to client
                  </Button>
                )
              }
            />
            {!active && escalation.status === "Resolved" && (
              <p className="text-xs text-muted-foreground">
                Resolved by the platform team — let the client know the outcome
                using the note box below.
              </p>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Escalate to the platform team</DialogTitle>
            <DialogDescription>
              Describe the problem for the platform team. Don't include your
              client's name or details — they can't see your clients, and the
              system will stop you if the name is in there.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="esc-subject">Subject</Label>
              <Input
                id="esc-subject"
                value={draft.subject}
                maxLength={200}
                onChange={(e) =>
                  setDraft({ ...draft, subject: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="esc-desc">What's going wrong?</Label>
              <Textarea
                id="esc-desc"
                rows={5}
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                placeholder="What the client tried, what they see, when it began. Leave out names and personal data."
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="esc-notify"
                checked={draft.notifyClient}
                onCheckedChange={(v) => setDraft({ ...draft, notifyClient: v })}
              />
              <Label htmlFor="esc-notify" className="text-sm">
                Tell the client we've escalated it
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                draft.subject.trim().length < 3 ||
                draft.description.trim().length < 5 ||
                escalateMut.isPending
              }
              onClick={() => escalateMut.mutate()}
            >
              {escalateMut.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Escalate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
