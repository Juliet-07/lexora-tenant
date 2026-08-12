import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Star,
  Briefcase,
  MessageSquare,
  BookOpen,
  AlertTriangle,
  Search,
  Eye,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Link2,
  Plus,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchEmployees } from "@/lib/hr/hr-api";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  fetchTickets,
  assignTicket,
  setTicketStatus,
  addTicketNote,
  TICKET_STATUSES,
  TICKET_CATEGORIES,
  type Ticket,
  type TicketStatus,
  fetchKbArticles,
  createKbArticle,
  updateKbArticle,
  deleteKbArticle,
  recordKbView,
  voteKbArticle,
  type KbArticle,
  type KbAudience,
  type KbStatus,
} from "@/lib/crm/service-desk-api";

const priorityClass: Record<string, string> = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-primary/10 text-primary",
  High: "bg-warning/10 text-warning",
  Urgent: "bg-destructive/10 text-destructive",
};

const slaState = (t: Ticket) => {
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

const emptyKbDraft = () => ({
  title: "",
  category: TICKET_CATEGORIES[0],
  audience: "Internal" as KbAudience,
  status: "Draft" as KbStatus,
  tags: [] as string[],
  body: "",
  linkedTicketId: undefined as string | undefined,
});

export default function ServiceDesk() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => fetchTickets(),
  });
  const { data: employeesPage } = useQuery({
    queryKey: ["hr-employees-all"],
    queryFn: () => fetchEmployees({ limit: 500 }),
    retry: false,
  });
  const employees = employeesPage?.items ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = list.find((t) => t._id === selectedId) ?? null;
  const [statusFilter, setStatusFilter] = useState("all");
  const [note, setNote] = useState("");
  const [internal, setInternal] = useState(true);

  // ── Knowledge base — now real ──────────────────────────────
  const { data: kbArticles = [] } = useQuery({
    queryKey: ["kbArticles"],
    queryFn: () => fetchKbArticles(),
  });
  const [kbSearch, setKbSearch] = useState("");
  const [kbCategoryFilter, setKbCategoryFilter] = useState("all");
  const [kbSelectedId, setKbSelectedId] = useState<string | null>(null);
  const kbSelected = kbArticles.find((a) => a._id === kbSelectedId) ?? null;
  const [kbEditorOpen, setKbEditorOpen] = useState(false);
  const [kbEditingId, setKbEditingId] = useState<string | null>(null);
  const [kbDraft, setKbDraft] = useState(emptyKbDraft());
  const [kbTagsInput, setKbTagsInput] = useState("");

  const kbFiltered = kbArticles.filter((a) => {
    const matchesSearch =
      !kbSearch ||
      a.title.toLowerCase().includes(kbSearch.toLowerCase()) ||
      a.tags.some((t) => t.toLowerCase().includes(kbSearch.toLowerCase()));
    const matchesCategory =
      kbCategoryFilter === "all" || a.category === kbCategoryFilter;
    return matchesSearch && matchesCategory;
  });
  const kbGroups = Object.entries(
    kbFiltered.reduce<Record<string, KbArticle[]>>((acc, a) => {
      (acc[a.category] ||= []).push(a);
      return acc;
    }, {}),
  );

  const kbInvalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["kbArticles"] });

  const openArticleEditor = (
    prefill?: Partial<ReturnType<typeof emptyKbDraft>>,
  ) => {
    setKbEditingId(null);
    setKbDraft({ ...emptyKbDraft(), ...prefill });
    setKbTagsInput("");
    setKbEditorOpen(true);
  };
  const openArticleForEdit = (a: KbArticle) => {
    setKbEditingId(a._id);
    setKbDraft({
      title: a.title,
      category: a.category,
      audience: a.audience,
      status: a.status,
      tags: a.tags,
      body: a.body,
      linkedTicketId: a.linkedTicketId ?? undefined,
    });
    setKbTagsInput(a.tags.join(", "));
    setKbEditorOpen(true);
  };

  const saveKbMut = useMutation({
    mutationFn: () => {
      const tags = kbTagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const payload = { ...kbDraft, tags, author: "You" };
      return kbEditingId
        ? updateKbArticle(kbEditingId, payload)
        : createKbArticle(payload);
    },
    onSuccess: (a) => {
      kbInvalidate();
      setKbEditorOpen(false);
      toast({
        title: kbEditingId ? "Article updated" : "Article created",
        description: a.title,
      });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to save article",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });
  const deleteKbMut = useMutation({
    mutationFn: (id: string) => deleteKbArticle(id),
    onSuccess: () => {
      kbInvalidate();
      setKbSelectedId(null);
      toast({ title: "Article deleted" });
    },
  });
  const viewKbMut = useMutation({
    mutationFn: (id: string) => recordKbView(id),
    onSuccess: kbInvalidate,
  });
  const voteKbMut = useMutation({
    mutationFn: ({ id, helpful }: { id: string; helpful: boolean }) =>
      voteKbArticle(id, helpful),
    onSuccess: kbInvalidate,
  });

  // ── Tickets ─────────────────────────────────────────────────
  const filtered = list.filter(
    (t) => statusFilter === "all" || t.status === statusFilter,
  );
  const breached = list.filter(
    (t) => slaState(t).pct >= 100 && !["Resolved", "Closed"].includes(t.status),
  ).length;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["tickets"] });
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const assignMut = useMutation({
    mutationFn: ({
      id,
      agentUserId,
      agentName,
    }: {
      id: string;
      agentUserId: string;
      agentName: string;
    }) => assignTicket(id, agentUserId, agentName),
    onSuccess: invalidate,
    onError: onErr("Failed to assign"),
  });
  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TicketStatus }) =>
      setTicketStatus(id, status),
    onSuccess: (t) => {
      invalidate();
      if (t.status === "Closed") {
        toast({
          title: "Satisfaction survey sent",
          description: "The client can now rate this ticket.",
        });
      }
    },
    onError: onErr("Failed to update status"),
  });
  const noteMut = useMutation({
    mutationFn: () => addTicketNote(selected!._id, "You", note, internal),
    onSuccess: () => {
      invalidate();
      setNote("");
    },
    onError: onErr("Failed to post note"),
  });

  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Loading tickets…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Service Desk</h1>
        <p className="text-sm text-muted-foreground">
          Client tickets with SLA tracking — raised by clients, assigned and
          resolved here
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            l: "Open tickets",
            v: list.filter((t) => !["Resolved", "Closed"].includes(t.status))
              .length,
          },
          { l: "SLA breaches", v: breached },
          {
            l: "Pending client",
            v: list.filter((t) => t.status === "Pending Client").length,
          },
          {
            l: "Avg satisfaction",
            v: (() => {
              const r = list.filter((t) => t.rating);
              return r.length
                ? `${(r.reduce((s, t) => s + (t.rating ?? 0), 0) / r.length).toFixed(1)} ★`
                : "—";
            })(),
          },
        ].map((k) => (
          <Card key={k.l}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.l}</p>
              <p className="mt-1 text-xl font-bold">{k.v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="tickets">
        <TabsList>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="kb">
            <BookOpen className="mr-2 h-4 w-4" /> Knowledge base
          </TabsTrigger>
          <TabsTrigger value="csat">Satisfaction</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-3 pt-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {TICKET_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-40">SLA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => {
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
                        <TableCell className="text-sm">{t.channel}</TableCell>
                        <TableCell>
                          <Badge className={priorityClass[t.priority]}>
                            {t.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {t.agent || "Unassigned"}
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
                  })}
                  {!filtered.length && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No tickets match this filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kb" className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search articles…"
                  value={kbSearch}
                  onChange={(e) => setKbSearch(e.target.value)}
                />
              </div>
              <Select
                value={kbCategoryFilter}
                onValueChange={setKbCategoryFilter}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {TICKET_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => openArticleEditor()}>
              <Plus className="mr-2 h-4 w-4" /> New article
            </Button>
          </div>
          {kbGroups.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No articles match your filters.
            </p>
          )}
          {kbGroups.map(([category, arts]) => (
            <div key={category} className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {category}
              </h3>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Article</TableHead>
                        <TableHead>Audience</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Views</TableHead>
                        <TableHead className="text-right">Helpful</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {arts.map((a) => (
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
                            {a.tags.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {a.tags.map((t) => (
                                  <Badge
                                    key={t}
                                    variant="outline"
                                    className="text-[10px]"
                                  >
                                    {t}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{a.audience}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                a.status === "Published"
                                  ? "bg-success/10 text-success"
                                  : "bg-muted text-muted-foreground"
                              }
                            >
                              {a.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            <span className="inline-flex items-center gap-1">
                              <Eye className="h-3 w-3" /> {a.views}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            <span className="inline-flex items-center gap-1 text-success">
                              <ThumbsUp className="h-3 w-3" /> {a.helpful}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="csat" className="pt-4">
          <Card>
            <CardContent className="space-y-3 p-4">
              {list
                .filter((t) => t.rating)
                .map((t) => (
                  <div key={t._id} className="rounded border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{t.subject}</p>
                      <span className="text-sm">
                        {"★".repeat(t.rating ?? 0)}
                        {"☆".repeat(5 - (t.rating ?? 0))}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t.clientName} · {t.ref}
                    </p>
                    {t.ratingComment && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t.ratingComment}
                      </p>
                    )}
                  </div>
                ))}
              {!list.some((t) => t.rating) && (
                <p className="text-sm text-muted-foreground">No ratings yet.</p>
              )}
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
                <p className="text-sm text-muted-foreground">
                  {selected.ref} · {selected.clientName} · {selected.category}
                </p>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <p className="text-sm">{selected.description}</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={selected.status}
                      onValueChange={(v) =>
                        statusMut.mutate({
                          id: selected._id,
                          status: v as TicketStatus,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TICKET_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Assigned agent</Label>
                    <Select
                      value={selected.agentUserId ?? ""}
                      onValueChange={(v) => {
                        const e = employees.find((x: any) => x._id === v);
                        if (!e) return;
                        assignMut.mutate({
                          id: selected._id,
                          agentUserId: v,
                          agentName: `${e.firstName} ${e.lastName}`,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={selected.agent || "Unassigned"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((e: any) => (
                          <SelectItem key={e._id} value={e._id}>
                            {e.firstName} {e.lastName}
                            {e.jobTitle ? ` · ${e.jobTitle}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      toast({
                        title: "Not built yet",
                        description:
                          "Convert to mandate is a deferred feature — coming in a later pass.",
                      })
                    }
                  >
                    <Briefcase className="mr-2 h-4 w-4" /> Convert to mandate
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      openArticleEditor({
                        title: `Resolution: ${selected.subject}`,
                        category: selected.category,
                        audience: "Internal",
                        body: selected.description
                          ? `<p>${selected.description}</p>`
                          : "",
                        linkedTicketId: selected._id,
                      })
                    }
                  >
                    <Link2 className="mr-2 h-4 w-4" /> Create article from this
                    ticket
                  </Button>
                </div>

                <div className="space-y-2">
                  <h4 className="flex items-center gap-2 text-sm font-semibold">
                    <MessageSquare className="h-4 w-4" /> Conversation
                  </h4>
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
                    placeholder="Add a note…"
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

                {selected.rating && (
                  <p className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-warning" /> {selected.rating}
                    /5
                    {selected.ratingComment
                      ? ` — ${selected.ratingComment}`
                      : ""}
                  </p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Article editor */}
      <Dialog open={kbEditorOpen} onOpenChange={setKbEditorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {kbEditingId ? "Edit article" : "New article"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1">
            <div>
              <Label>Title</Label>
              <Input
                value={kbDraft.title}
                onChange={(e) =>
                  setKbDraft({ ...kbDraft, title: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select
                  value={kbDraft.category}
                  onValueChange={(v) => setKbDraft({ ...kbDraft, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Audience</Label>
                <Select
                  value={kbDraft.audience}
                  onValueChange={(v) =>
                    setKbDraft({ ...kbDraft, audience: v as KbAudience })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Internal">Internal</SelectItem>
                    <SelectItem value="Client-facing">Client-facing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Tags (comma separated)</Label>
              <Input
                value={kbTagsInput}
                onChange={(e) => setKbTagsInput(e.target.value)}
              />
            </div>
            <div>
              <Label>Body</Label>
              <RichTextEditor
                value={kbDraft.body}
                onChange={(html) => setKbDraft({ ...kbDraft, body: html })}
                minHeight={180}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={kbDraft.status}
                onValueChange={(v) =>
                  setKbDraft({ ...kbDraft, status: v as KbStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={saveKbMut.isPending || !kbDraft.title.trim()}
              onClick={() => saveKbMut.mutate()}
            >
              {saveKbMut.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Article detail */}
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
                <p className="text-sm text-muted-foreground">
                  {kbSelected.ref} · {kbSelected.category} · by{" "}
                  {kbSelected.author}
                </p>
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
                  dangerouslySetInnerHTML={{ __html: kbSelected.body }}
                  className="prose prose-sm max-w-none rounded border p-3 text-sm [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                />
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Eye className="h-3.5 w-3.5" /> {kbSelected.views} views
                </p>
                <div className="flex flex-wrap items-center gap-2">
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openArticleForEdit(kbSelected)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    disabled={deleteKbMut.isPending}
                    onClick={() => deleteKbMut.mutate(kbSelected._id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
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
