import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
import { toast } from "sonner";
import {
  tickets as seedTickets,
  Ticket,
  TicketStatus,
  TICKET_STATUSES,
} from "@/data/crmPmMockData";
import {
  useKbArticles,
  recordView,
  voteArticle,
  suggestArticles,
  KbArticle,
} from "@/lib/crm/knowledgeBaseStore";

const CURRENT_USER = "Sarah Chen";

// Seed a few tickets as assigned to the current employee so the page has data.
const seedForMe: Ticket[] = seedTickets.map((t, i) =>
  i < 2 ? { ...t, agent: CURRENT_USER } : t,
);

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

export default function MyServiceDesk() {
  const [list, setList] = useState<Ticket[]>(seedForMe);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [note, setNote] = useState("");
  const [internal, setInternal] = useState(true);

  const [kbSearch, setKbSearch] = useState("");
  const [kbSelected, setKbSelected] = useState<KbArticle | null>(null);

  const kbArticles = useKbArticles();
  const internalArticles = kbArticles.filter(
    (a) => a.audience === "Internal" && a.status === "Published",
  );
  const kbFiltered = internalArticles.filter(
    (a) =>
      !kbSearch ||
      a.title.toLowerCase().includes(kbSearch.toLowerCase()) ||
      a.tags.some((t) => t.toLowerCase().includes(kbSearch.toLowerCase())),
  );

  const mine = list.filter((t) => t.agent === CURRENT_USER);
  const open = mine.filter((t) => !["Resolved", "Closed"].includes(t.status));
  const breaching = mine.filter((t) => slaState(t).pct >= 90 && !["Resolved", "Closed"].includes(t.status));
  const resolvedThisMonth = mine.filter((t) => {
    if (t.status !== "Resolved" && t.status !== "Closed") return false;
    const d = new Date(t.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const patch = (id: string, p: Partial<Ticket>) => {
    setList((l) => l.map((t) => (t.id === id ? { ...t, ...p } : t)));
    setSelected((s) => (s && s.id === id ? { ...s, ...p } : s));
  };

  const suggested = useMemo(
    () =>
      selected
        ? suggestArticles(`${selected.subject} ${selected.category}`, "Internal")
        : [],
    [selected],
  );

  const kpis = [
    { l: "Assigned to me", v: mine.length, icon: Inbox },
    { l: "Open", v: open.length, icon: Headset },
    { l: "Breaching SLA", v: breaching.length, icon: AlertTriangle },
    { l: "Resolved this month", v: resolvedThisMonth.length, icon: CheckCircle2 },
  ];

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
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        No tickets are currently assigned to you.
                      </TableCell>
                    </TableRow>
                  ) : (
                    mine.map((t) => {
                      const sla = slaState(t);
                      return (
                        <TableRow key={t.id} className="cursor-pointer" onClick={() => setSelected(t)}>
                          <TableCell>
                            <p className="text-sm font-medium">{t.subject}</p>
                            <p className="font-mono text-xs text-muted-foreground">{t.id}</p>
                          </TableCell>
                          <TableCell className="text-sm">{t.clientName}</TableCell>
                          <TableCell>
                            <Badge className={priorityClass[t.priority]}>{t.priority}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{t.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Progress value={sla.pct} className="h-2" />
                            <p className={`mt-1 text-[11px] ${sla.tone}`}>{sla.label}</p>
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

        <TabsContent value="kb" className="space-y-4 pt-4">
          <div className="relative w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search internal articles…"
              value={kbSearch}
              onChange={(e) => setKbSearch(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {kbFiltered.length === 0 ? (
              <p className="text-sm text-muted-foreground">No articles found.</p>
            ) : (
              kbFiltered.map((a) => (
                <Card
                  key={a.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => {
                    recordView(a.id);
                    setKbSelected(a);
                  }}
                >
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start gap-2">
                      <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium leading-snug">{a.title}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant="outline">{a.category}</Badge>
                      {a.tags.slice(0, 2).map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" /> {a.views} views
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Ticket detail */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.subject}</SheetTitle>
                <SheetDescription>
                  {selected.id} · {selected.clientName} · via {selected.channel}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                <p className="text-sm">{selected.description}</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={selected.status}
                      onValueChange={(v) => patch(selected.id, { status: v as TicketStatus })}
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
                    <Label className="text-xs">Priority</Label>
                    <Select
                      value={selected.priority}
                      onValueChange={(v) =>
                        patch(selected.id, { priority: v as Ticket["priority"] })
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
                </div>

                <div className="flex flex-wrap gap-2">
                  {(["Open", "In Progress", "Pending Client", "Resolved"] as const).map((s) => {
                    const mapped: TicketStatus =
                      s === "Open" ? "New" : (s as TicketStatus);
                    return (
                      <Button
                        key={s}
                        size="sm"
                        variant={selected.status === mapped ? "default" : "outline"}
                        onClick={() => patch(selected.id, { status: mapped })}
                      >
                        {s === "In Progress" ? "In progress" : s === "Pending Client" ? "Waiting" : s}
                      </Button>
                    );
                  })}
                </div>

                {(() => {
                  const sla = slaState(selected);
                  return (
                    <Card>
                      <CardContent className="space-y-2 p-3">
                        <div className="flex justify-between text-sm">
                          <span>SLA countdown</span>
                          <span className={sla.tone}>
                            {selected.slaElapsedHrs}h of {selected.slaTargetHrs}h · {sla.label}
                          </span>
                        </div>
                        <Progress value={sla.pct} className="h-2" />
                        {sla.pct >= 75 && (
                          <p className="flex items-center gap-1 text-xs text-warning">
                            <AlertTriangle className="h-3 w-3" /> Escalation notification sent to the team lead.
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
                          key={a.id}
                          type="button"
                          className="flex w-full items-center justify-between rounded border p-2 text-left text-sm hover:bg-muted/50"
                          onClick={() => {
                            recordView(a.id);
                            setKbSelected(a);
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
                  {selected.notes.map((n, i) => (
                    <div
                      key={i}
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
                              author: CURRENT_USER,
                              internal,
                              at: new Date().toISOString(),
                              body: note,
                            },
                          ],
                        });
                        setNote("");
                        toast.success(internal ? "Internal note added" : "Reply sent to client");
                      }}
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
      <Sheet open={!!kbSelected} onOpenChange={(o) => !o && setKbSelected(null)}>
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
                    onClick={() => {
                      voteArticle(kbSelected.id, true);
                      setKbSelected({ ...kbSelected, helpful: kbSelected.helpful + 1 });
                    }}
                  >
                    <ThumbsUp className="mr-2 h-4 w-4" /> Helpful ({kbSelected.helpful})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      voteArticle(kbSelected.id, false);
                      setKbSelected({ ...kbSelected, notHelpful: kbSelected.notHelpful + 1 });
                    }}
                  >
                    <ThumbsDown className="mr-2 h-4 w-4" /> Not helpful ({kbSelected.notHelpful})
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
