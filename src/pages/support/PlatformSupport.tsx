import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, Plus, Loader2, RotateCcw, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { SupportThread } from "@/components/support/SupportThread";
import {
  fetchSupportTickets,
  fetchSupportTicket,
  createSupportTicket,
  replySupportTicket,
  closeSupportTicket,
  reopenSupportTicket,
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  supportStatusClass,
  type SupportPriority,
} from "@/lib/support-api";

const priorityClass: Record<string, string> = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-primary/10 text-primary",
  High: "bg-warning/10 text-warning",
  Urgent: "bg-destructive/10 text-destructive",
};

const emptyDraft = {
  subject: "",
  description: "",
  category: SUPPORT_CATEGORIES[0],
  priority: "Medium" as SupportPriority,
};

// Tickets this workspace has raised with the platform team. Tickets escalated
// from a client's Portal-access ticket also show here; their client stays on
// the Service Desk side and never reaches the platform team.
export default function PlatformSupport() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: fetchSupportTickets,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: selected } = useQuery({
    queryKey: ["support-ticket", selectedId],
    queryFn: () => fetchSupportTicket(selectedId as string),
    enabled: !!selectedId,
  });

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const refresh = (id?: string) => {
    qc.invalidateQueries({ queryKey: ["support-tickets"] });
    if (id) qc.invalidateQueries({ queryKey: ["support-ticket", id] });
  };
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const createMut = useMutation({
    mutationFn: () => createSupportTicket(draft),
    onSuccess: (t) => {
      refresh();
      setOpen(false);
      setDraft(emptyDraft);
      setSelectedId(t._id);
      toast({
        title: "Ticket sent to the platform team",
        description: `${t.ref} — we'll reply here.`,
      });
    },
    onError: onErr("Couldn't send the ticket"),
  });
  const replyMut = useMutation({
    mutationFn: (body: string) => replySupportTicket(selectedId!, body),
    onSuccess: () => refresh(selectedId!),
    onError: onErr("Couldn't send the reply"),
  });
  const closeMut = useMutation({
    mutationFn: () => closeSupportTicket(selectedId!),
    onSuccess: () => refresh(selectedId!),
    onError: onErr("Couldn't close the ticket"),
  });
  const reopenMut = useMutation({
    mutationFn: () => reopenSupportTicket(selectedId!),
    onSuccess: () => refresh(selectedId!),
    onError: onErr("Couldn't reopen the ticket"),
  });

  const openCount = list.filter(
    (t) => !["Resolved", "Closed"].includes(t.status),
  ).length;
  const replied = list.filter(
    (t) =>
      t.lastActor === "platform" && !["Resolved", "Closed"].includes(t.status),
  ).length;
  const canSubmit =
    draft.subject.trim().length >= 3 && draft.description.trim().length >= 5;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <LifeBuoy className="h-6 w-6" /> Platform support
          </h1>
          <p className="text-sm text-muted-foreground">
            Raise a problem with the Lexora platform team and follow it here.
            Questions from your own clients stay in Service Desk.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New ticket
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { l: "Open tickets", v: openCount },
          { l: "Replies waiting for you", v: replied },
          { l: "All tickets", v: list.length },
        ].map((k) => (
          <Card key={k.l}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.l}</p>
              <p className="mt-1 text-xl font-bold">{k.v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && list.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No tickets yet. Use “New ticket” to contact the platform
                    team.
                  </TableCell>
                </TableRow>
              )}
              {list.map((t) => (
                <TableRow
                  key={t._id}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(t._id)}
                >
                  <TableCell>
                    <p className="text-sm font-medium">{t.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.ref}
                      {t.source === "escalated" &&
                        " · escalated from a client ticket"}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">{t.category}</TableCell>
                  <TableCell>
                    <Badge className={priorityClass[t.priority]}>
                      {t.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge className={supportStatusClass[t.status]}>
                        {t.status}
                      </Badge>
                      {t.lastActor === "platform" &&
                        !["Resolved", "Closed"].includes(t.status) && (
                          <Badge
                            variant="outline"
                            className="border-primary/40 text-primary"
                          >
                            New reply
                          </Badge>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(t.lastActivityAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Ticket detail */}
      <Sheet
        open={!!selectedId}
        onOpenChange={(o) => !o && setSelectedId(null)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.subject}</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {selected.ref} · {selected.category} · raised by{" "}
                  {selected.raisedByName}
                </p>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={supportStatusClass[selected.status]}>
                    {selected.status}
                  </Badge>
                  <Badge className={priorityClass[selected.priority]}>
                    {selected.priority}
                  </Badge>
                  {selected.assignedToName && (
                    <span className="text-xs text-muted-foreground">
                      Handled by {selected.assignedToName}
                    </span>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm">
                  {selected.description}
                </p>

                <div className="flex gap-2">
                  {selected.status === "Closed" ||
                  selected.status === "Resolved" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={reopenMut.isPending}
                      onClick={() => reopenMut.mutate()}
                    >
                      <RotateCcw className="mr-2 h-3.5 w-3.5" /> Reopen
                    </Button>
                  ) : null}
                  {selected.status !== "Closed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={closeMut.isPending}
                      onClick={() => closeMut.mutate()}
                    >
                      <XCircle className="mr-2 h-3.5 w-3.5" /> Close ticket
                    </Button>
                  )}
                </div>

                <h4 className="text-sm font-semibold">Conversation</h4>
                <SupportThread
                  messages={selected.messages}
                  sending={replyMut.isPending}
                  disabled={selected.status === "Closed"}
                  disabledNote="This ticket is closed. Reopen it to add a message."
                  onSend={(b) => replyMut.mutateAsync(b)}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* New ticket */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New ticket to the platform team</DialogTitle>
            <DialogDescription>
              For problems with Lexora itself — access, billing, modules,
              something broken. Don't include your clients' personal details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="sup-subject">Subject</Label>
              <Input
                id="sup-subject"
                value={draft.subject}
                maxLength={200}
                onChange={(e) =>
                  setDraft({ ...draft, subject: e.target.value })
                }
                placeholder="e.g. Portal invitations aren't arriving"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={draft.category}
                  onValueChange={(v) => setDraft({ ...draft, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={draft.priority}
                  onValueChange={(v) =>
                    setDraft({ ...draft, priority: v as SupportPriority })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORT_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sup-desc">What's happening?</Label>
              <Textarea
                id="sup-desc"
                rows={5}
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                placeholder="What you expected, what happened, and when it started."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!canSubmit || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send to platform team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
