import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Headset,
  Inbox,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Search,
  Eye,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchMyTickets,
  setMyTicketStatus,
  addMyTicketNote,
  type TicketStatus,
  fetchMyKbArticles,
  suggestMyKbArticles,
  recordMyKbView,
  voteMyKbArticle,
} from "@/lib/crm/service-desk-api";

const priorityClass: Record<string, string> = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-primary/10 text-primary",
  High: "bg-warning/10 text-warning",
  Urgent: "bg-destructive/10 text-destructive",
};

const slaState = (t: {
  slaElapsedHrs: number;
  slaTargetHrs: number;
  status: string;
}) => {
  const pct = Math.min((t.slaElapsedHrs / t.slaTargetHrs) * 100, 100);
  if (t.status === "Pending Client")
    return {
      pct,
      label: "Paused (pending client)",
      tone: "text-muted-foreground",
    };
  if (pct >= 100) return { pct, label: "Breached", tone: "text-destructive" };
  if (pct >= 90)
    return { pct, label: "90% escalation", tone: "text-destructive" };
  if (pct >= 75) return { pct, label: "75% warning", tone: "text-warning" };
  return { pct, label: "On track", tone: "text-success" };
};

export default function MyServiceDesk() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: mine = [], isLoading } = useQuery({
    queryKey: ["myTickets"],
    queryFn: () => fetchMyTickets(),
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = mine.find((t) => t._id === selectedId) ?? null;
  const [note, setNote] = useState("");
  const [internal, setInternal] = useState(true);

  const { data: kbArticles = [] } = useQuery({
    queryKey: ["myKbArticles"],
    queryFn: fetchMyKbArticles,
  });
  const [kbSearch, setKbSearch] = useState("");
  const [kbSelectedId, setKbSelectedId] = useState<string | null>(null);
  const kbSelected = kbArticles.find((a) => a._id === kbSelectedId) ?? null;
  const kbFiltered = kbArticles.filter(
    (a) =>
      !kbSearch ||
      a.title.toLowerCase().includes(kbSearch.toLowerCase()) ||
      a.tags.some((t) => t.toLowerCase().includes(kbSearch.toLowerCase())),
  );
  const kbInvalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["myKbArticles"] });
  const viewKbMut = useMutation({
    mutationFn: (id: string) => recordMyKbView(id),
    onSuccess: kbInvalidate,
  });
  const voteKbMut = useMutation({
    mutationFn: ({ id, helpful }: { id: string; helpful: boolean }) =>
      voteMyKbArticle(id, helpful),
    onSuccess: kbInvalidate,
  });

  const { data: suggested = [] } = useQuery({
    queryKey: ["kbSuggest", selected?._id],
    queryFn: () =>
      suggestMyKbArticles(`${selected!.subject} ${selected!.category}`),
    enabled: !!selected,
  });

  const open = mine.filter((t) => !["Resolved", "Closed"].includes(t.status));
  const breaching = mine.filter(
    (t) => slaState(t).pct >= 90 && !["Resolved", "Closed"].includes(t.status),
  );
  const resolvedThisMonth = mine.filter((t) => {
    if (t.status !== "Resolved" && t.status !== "Closed") return false;
    const d = new Date(t.updatedAt);
    const now = new Date();
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["myTickets"] });
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TicketStatus }) =>
      setMyTicketStatus(id, status),
    onSuccess: invalidate,
    onError: onErr("Failed to update status"),
  });
  const noteMut = useMutation({
    mutationFn: () => addMyTicketNote(selected!._id, "You", note, internal),
    onSuccess: () => {
      invalidate();
      setNote("");
      toast({
        title: internal ? "Internal note added" : "Reply sent to client",
      });
    },
    onError: onErr("Failed to post note"),
  });

  const kpis = [
    { l: "Assigned to me", v: mine.length, icon: Inbox },
    { l: "Open", v: open.length, icon: Headset },
    { l: "Breaching SLA", v: breaching.length, icon: AlertTriangle },
    {
      l: "Resolved this month",
      v: resolvedThisMonth.length,
      icon: CheckCircle2,
    },
  ];

  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Loading your tickets…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Service Desk</h1>
        <p className="text-sm text-muted-foreground">
          Tickets assigned to you and the internal knowledge base.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.l}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{k.l}</p>
                <p className="mt-1 text-xl font-bold">{k.v}</p>
              </div>
              <k.icon className="h-6 w-6 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="tickets">
        <TabsList>
          <TabsTrigger value="tickets">My tickets</TabsTrigger>
          <TabsTrigger value="kb">
            <BookOpen className="mr-2 h-4 w-4" /> Knowledge base
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-40">SLA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mine.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No tickets are currently assigned to you.
                      </TableCell>
                    </TableRow>
                  ) : (
                    mine.map((t) => {
                      const sla = slaState(t);
                      return (
                        <TableRow
                          key={t._id}
                          className="cursor-pointer"
                          onClick={() => setSelectedId(t._id)}
                        >
                          <TableCell>
                            <p className="text-sm font-medium">{t.subject}</p>
                            <p className="font-mono text-xs text-muted-foreground">
                              {t.ref}
                            </p>
                          </TableCell>
                          <TableCell className="text-sm">
                            {t.clientName}
                          </TableCell>
                          <TableCell>
                            <Badge className={priorityClass[t.priority]}>
                              {t.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{t.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Progress value={sla.pct} className="h-2" />
                            <p className={`mt-1 text-[11px] ${sla.tone}`}>
                              {sla.label}
                            </p>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kb" className="space-y-3 pt-4">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search articles…"
              value={kbSearch}
              onChange={(e) => setKbSearch(e.target.value)}
            />
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kbFiltered.map((a) => (
                    <TableRow
                      key={a._id}
                      className="cursor-pointer"
                      onClick={() => {
                        viewKbMut.mutate(a._id);
                        setKbSelectedId(a._id);
                      }}
                    >
                      <TableCell className="text-sm font-medium">
                        {a.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{a.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {a.views}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!kbFiltered.length && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No articles match your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ticket detail */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.subject}</SheetTitle>
                <SheetDescription>
                  {selected.ref} · {selected.clientName} · {selected.category}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <p className="text-sm">{selected.description}</p>

                <div>
                  <Label className="text-xs">Status</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(
                      [
                        "In Progress",
                        "Pending Client",
                        "Resolved",
                      ] as TicketStatus[]
                    ).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={selected.status === s ? "default" : "outline"}
                        disabled={statusMut.isPending}
                        onClick={() =>
                          statusMut.mutate({ id: selected._id, status: s })
                        }
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>

                {(() => {
                  const sla = slaState(selected);
                  return (
                    <Card>
                      <CardContent className="space-y-2 p-3">
                        <div className="flex justify-between text-sm">
                          <span>SLA countdown</span>
                          <span className={sla.tone}>
                            {selected.slaElapsedHrs.toFixed(1)}h of{" "}
                            {selected.slaTargetHrs}h · {sla.label}
                          </span>
                        </div>
                        <Progress value={sla.pct} className="h-2" />
                        {sla.pct >= 75 && (
                          <p className="flex items-center gap-1 text-xs text-warning">
                            <AlertTriangle className="h-3 w-3" /> Escalation
                            notification sent to the team lead.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })()}

                {suggested.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="flex items-center gap-2 text-sm font-semibold">
                      <Sparkles className="h-4 w-4" /> Suggested articles
                    </h4>
                    <div className="space-y-1">
                      {suggested.map((a) => (
                        <button
                          key={a._id}
                          type="button"
                          className="flex w-full items-center justify-between rounded border p-2 text-left text-sm hover:bg-muted/50"
                          onClick={() => {
                            viewKbMut.mutate(a._id);
                            setKbSelectedId(a._id);
                          }}
                        >
                          <span>{a.title}</span>
                          <Badge variant="outline">{a.category}</Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Conversation</h4>
                  {selected.notes.map((n) => (
                    <div
                      key={n._id}
                      className={`rounded border p-3 ${n.internal ? "border-warning/40 bg-warning/5" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{n.author}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {n.internal ? "Internal note" : "Client-facing"}
                        </Badge>
                      </div>
                      <p className="text-sm">{n.body}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(n.at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  <Textarea
                    rows={3}
                    placeholder="Reply to the client or add an internal note…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={internal}
                        onCheckedChange={setInternal}
                      />
                      <Label className="text-xs">
                        {internal ? "Internal note" : "Send to client"}
                      </Label>
                    </div>
                    <Button
                      size="sm"
                      disabled={!note.trim() || noteMut.isPending}
                      onClick={() => noteMut.mutate()}
                    >
                      Post
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Article detail (read-only, with voting) */}
      <Sheet
        open={!!kbSelected}
        onOpenChange={(o) => !o && setKbSelectedId(null)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {kbSelected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" /> {kbSelected.title}
                </SheetTitle>
                <SheetDescription>
                  {kbSelected.category} · by {kbSelected.author}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-1">
                  {kbSelected.tags.map((t) => (
                    <Badge key={t} variant="outline">
                      {t}
                    </Badge>
                  ))}
                </div>
                <div
                  className="prose prose-sm max-w-none rounded border p-3 text-sm [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                  dangerouslySetInnerHTML={{ __html: kbSelected.body }}
                />
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Eye className="h-3.5 w-3.5" /> {kbSelected.views} views
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      voteKbMut.mutate({ id: kbSelected._id, helpful: true })
                    }
                  >
                    <ThumbsUp className="mr-2 h-4 w-4" /> Helpful (
                    {kbSelected.helpful})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      voteKbMut.mutate({ id: kbSelected._id, helpful: false })
                    }
                  >
                    <ThumbsDown className="mr-2 h-4 w-4" /> Not helpful (
                    {kbSelected.notHelpful})
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
