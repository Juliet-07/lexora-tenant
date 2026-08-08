import { useState } from "react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
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
  Trash2,
  Link2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MentionText } from "@/components/crm/CommentThread";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  tickets as seed,
  Ticket,
  TicketStatus,
  TICKET_STATUSES,
  teamDirectory,
} from "@/data/crmPmMockData";
import {
  useKbArticles,
  useKbCategories,
  addCategory,
  saveArticle,
  deleteArticle,
  setArticleStatus,
  recordView,
  voteArticle,
  newArticleId,
  KbArticle,
  KbAudience,
} from "@/lib/crm/knowledgeBaseStore";

const priorityClass: Record<string, string> = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-primary/10 text-primary",
  High: "bg-warning/10 text-warning",
  Urgent: "bg-destructive/10 text-destructive",
};

const slaState = (t: Ticket) => {
  const pct = Math.min((t.slaElapsedHrs / t.slaTargetHrs) * 100, 100);
  if (t.status === "Pending Client")
    return { pct, label: "Paused (pending client)", tone: "text-muted-foreground" };
  if (pct >= 100) return { pct, label: "Breached", tone: "text-destructive" };
  if (pct >= 90) return { pct, label: "90% escalation", tone: "text-destructive" };
  if (pct >= 75) return { pct, label: "75% warning", tone: "text-warning" };
  return { pct, label: "On track", tone: "text-success" };
};

const emptyArticleDraft = (): KbArticle => ({
  id: "",
  title: "",
  category: "Portal access",
  audience: "Internal",
  status: "Draft",
  tags: [],
  body: "",
  author: "Sarah Chen",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  views: 0,
  helpful: 0,
  notHelpful: 0,
});

export default function ServiceDesk() {
  const [list, setList] = useState<Ticket[]>(seed);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [openNew, setOpenNew] = useState(false);
  const [note, setNote] = useState("");
  const [internal, setInternal] = useState(true);
  const [draft, setDraft] = useState({
    subject: "",
    clientName: "",
    priority: "Medium" as Ticket["priority"],
    category: "Portal access",
    channel: "Portal" as Ticket["channel"],
    description: "",
  });
  const { toast } = useToast();

  // Knowledge base state
  const kbArticles = useKbArticles();
  const kbCategories = useKbCategories();
  const [kbSearch, setKbSearch] = useState("");
  const [kbCategoryFilter, setKbCategoryFilter] = useState("all");
  const [kbSelected, setKbSelected] = useState<KbArticle | null>(null);
  const [kbEditorOpen, setKbEditorOpen] = useState(false);
  const [kbEditing, setKbEditing] = useState(false);
  const [kbDraft, setKbDraft] = useState<KbArticle>(emptyArticleDraft());
  const [kbTagsInput, setKbTagsInput] = useState("");
  const [kbNewCategory, setKbNewCategory] = useState("");

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

  const openArticleEditor = (prefill?: Partial<KbArticle>) => {
    setKbEditing(false);
    setKbDraft({ ...emptyArticleDraft(), ...prefill });
    setKbTagsInput("");
    setKbEditorOpen(true);
  };

  const openArticleForEdit = (a: KbArticle) => {
    setKbEditing(true);
    setKbDraft(a);
    setKbTagsInput(a.tags.join(", "));
    setKbEditorOpen(true);
  };

  const saveKbDraft = () => {
    if (!kbDraft.title.trim()) return;
    const tags = kbTagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const toSave: KbArticle = {
      ...kbDraft,
      id: kbEditing ? kbDraft.id : newArticleId(),
      tags,
    };
    saveArticle(toSave);
    setKbEditorOpen(false);
    toast({
      title: kbEditing ? "Article updated" : "Article created",
      description: toSave.title,
    });
  };

  const filtered = list.filter(
    (t) => statusFilter === "all" || t.status === statusFilter,
  );

  const patch = (id: string, p: Partial<Ticket>) => {
    setList((l) => l.map((t) => (t.id === id ? { ...t, ...p } : t)));
    setSelected((s) => (s && s.id === id ? { ...s, ...p } : s));
  };

  const breached = list.filter((t) => slaState(t).pct >= 100).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Service Desk</h1>
          <p className="text-sm text-muted-foreground">
            Client tickets from portal, email and WhatsApp with SLA tracking
          </p>
        </div>
        <Button onClick={() => setOpenNew(true)}>
          <Plus className="mr-2 h-4 w-4" /> New ticket
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "Open tickets", v: list.filter((t) => !["Resolved", "Closed"].includes(t.status)).length },
          { l: "SLA breaches", v: breached },
          { l: "Pending client", v: list.filter((t) => t.status === "Pending Client").length },
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
                        key={t.id}
                        className="cursor-pointer"
                        onClick={() => setSelected(t)}
                      >
                        <TableCell>
                          <p className="text-sm font-medium">{t.subject}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {t.id}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm">{t.clientName}</TableCell>
                        <TableCell className="text-sm">{t.channel}</TableCell>
                        <TableCell>
                          <Badge className={priorityClass[t.priority]}>
                            {t.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{t.agent}</TableCell>
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
              <Select value={kbCategoryFilter} onValueChange={setKbCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {kbCategories.map((c) => (
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
            <p className="text-sm text-muted-foreground">No articles match your filters.</p>
          )}

          {kbGroups.map(([category, arts]) => (
            <div key={category} className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">{category}</h3>
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
                          key={a.id}
                          className="cursor-pointer"
                          onClick={() => {
                            recordView(a.id);
                            setKbSelected(a);
                          }}
                        >
                          <TableCell className="text-sm font-medium">
                            {a.title}
                            {a.tags.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {a.tags.map((t) => (
                                  <Badge key={t} variant="outline" className="text-[10px]">
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
                  <div key={t.id} className="rounded border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{t.subject}</p>
                      <span className="text-sm">
                        {"★".repeat(t.rating ?? 0)}
                        <span className="text-muted-foreground">
                          {"★".repeat(5 - (t.rating ?? 0))}
                        </span>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t.clientName} · {t.ratingComment}
                    </p>
                  </div>
                ))}
              <p className="text-xs text-muted-foreground">
                Surveys are sent automatically when a ticket is closed and feed
                the client satisfaction KPI.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New ticket */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New ticket</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Subject</Label>
              <Input
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
              />
            </div>
            <div>
              <Label>Client</Label>
              <Input
                value={draft.clientName}
                onChange={(e) =>
                  setDraft({ ...draft, clientName: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Channel</Label>
                <Select
                  value={draft.channel}
                  onValueChange={(v) =>
                    setDraft({ ...draft, channel: v as Ticket["channel"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Portal", "Email", "WhatsApp"].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={draft.priority}
                  onValueChange={(v) =>
                    setDraft({ ...draft, priority: v as Ticket["priority"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Low", "Medium", "High", "Urgent"].map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={draft.category}
                  onValueChange={(v) => setDraft({ ...draft, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Portal access", "Billing", "Advisory", "New work", "Other"].map(
                      (c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (!draft.subject) return;
                const slaTarget =
                  draft.priority === "Urgent"
                    ? 4
                    : draft.priority === "High"
                      ? 8
                      : draft.priority === "Medium"
                        ? 24
                        : 48;
                setList([
                  {
                    id: `TCK-${list.length + 106}`,
                    subject: draft.subject,
                    description: draft.description,
                    clientName: draft.clientName || "Unassigned client",
                    channel: draft.channel,
                    priority: draft.priority,
                    category: draft.category,
                    agent: "Unassigned",
                    status: "New",
                    createdAt: new Date().toISOString(),
                    slaTargetHrs: slaTarget,
                    slaElapsedHrs: 0,
                    loggedHrs: 0,
                    notes: [],
                  },
                  ...list,
                ]);
                setOpenNew(false);
                setDraft({ ...draft, subject: "", description: "" });
                toast({ title: "Ticket created", description: `SLA target ${slaTarget}h` });
              }}
            >
              Create ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket detail */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.subject}</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {selected.id} · {selected.clientName} · via {selected.channel}
                </p>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                <p className="text-sm">{selected.description}</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={selected.status}
                      onValueChange={(v) => {
                        patch(selected.id, { status: v as TicketStatus });
                        if (v === "Closed")
                          toast({
                            title: "Satisfaction survey sent",
                            description: "1–5 star rating requested from client.",
                          });
                      }}
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
                      value={selected.agent}
                      onValueChange={(v) =>
                        patch(selected.id, { agent: v, status: "Assigned" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {teamDirectory
                          .filter((t) => t.mandates > 0)
                          .map((t) => (
                            <SelectItem key={t.name} value={t.name}>
                              {t.name}
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
                            {selected.slaElapsedHrs}h of {selected.slaTargetHrs}h
                            · {sla.label}
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

                <Button
                  variant="outline"
                  onClick={() =>
                    toast({
                      title: "Converted to mandate",
                      description: `New mandate pre-populated from ${selected.id}; ${selected.loggedHrs}h of logged time transferred.`,
                    })
                  }
                >
                  <Briefcase className="mr-2 h-4 w-4" /> Convert to mandate
                </Button>

                <div className="space-y-2">
                  <h4 className="flex items-center gap-2 text-sm font-semibold">
                    <MessageSquare className="h-4 w-4" /> Conversation
                  </h4>
                  {selected.notes.map((n, i) => (
                    <div
                      key={i}
                      className={`rounded border p-3 ${
                        n.internal ? "border-warning/40 bg-warning/5" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{n.author}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {n.internal ? "Internal note" : "Client-facing"}
                        </Badge>
                      </div>
                      <MentionText body={n.body} />
                      <p className="text-xs text-muted-foreground">
                        {new Date(n.at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  <Textarea
                    rows={3}
                    placeholder="Add a note… type @ to loop in a specialist"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={internal} onCheckedChange={setInternal} />
                      <Label className="text-xs">
                        {internal ? "Internal note" : "Send to client"}
                      </Label>
                    </div>
                    <Button
                      size="sm"
                      disabled={!note.trim()}
                      onClick={() => {
                        patch(selected.id, {
                          notes: [
                            ...selected.notes,
                            {
                              author: "Sarah Chen",
                              internal,
                              at: new Date().toISOString(),
                              body: note,
                            },
                          ],
                        });
                        setNote("");
                      }}
                    >
                      Post
                    </Button>
                  </div>
                </div>

                {selected.rating && (
                  <p className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-warning" />
                    {selected.rating}/5 — {selected.ratingComment}
                  </p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
