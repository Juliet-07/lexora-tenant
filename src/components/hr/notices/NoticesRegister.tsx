import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Archive,
  BellRing,
  Download,
  Ellipsis,
  MessageCircleQuestion,
  Paperclip,
  Plus,
  SearchX,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  downloadCsv,
  errMessage,
  fetchNoticeMeta,
  fetchNoticeRegisterCsv,
  fetchNotices,
  type NoticeListFilters,
  type NoticeListItem,
} from "@/lib/hr/hr-notices-api";
import { toast } from "@/hooks/use-toast";
import {
  NOTICE_KEY,
  NoticeMenu,
  useConfirm,
  useNoticeOps,
} from "./noticeActions";
import {
  Bar,
  CategoryChip,
  Chip,
  Empty,
  PinMark,
  PriorityChip,
  STATUS_TONE,
  ackColor,
  fmtD,
} from "./noticeUi";

const STATUSES = ["all", "sent", "scheduled", "draft", "archived"] as const;

export function NoticesRegister({
  onCompose,
  onOpen,
  onEdit,
  onRevise,
  onDuplicate,
}: {
  onCompose: () => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onRevise: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const [status, setStatus] = useState<string>("all");
  const [category, setCategory] = useState("all");
  const [priority, setPriority] = useState("all");
  const [sort, setSort] = useState("recent");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const ops = useNoticeOps();
  const [confirmNode, confirm] = useConfirm();

  // Debounce the search box
  useEffect(() => {
    const t = setTimeout(() => setQ(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const filters: NoticeListFilters = {
    status,
    category,
    priority,
    sort,
    search: q || undefined,
  };
  const { data, isLoading } = useQuery({
    queryKey: [NOTICE_KEY, "list", filters],
    queryFn: () => fetchNotices(filters),
    placeholderData: (prev) => prev,
  });
  const { data: meta } = useQuery({
    queryKey: [NOTICE_KEY, "meta"],
    queryFn: fetchNoticeMeta,
  });
  const items = data?.items ?? [];
  const counts = data?.counts ?? {};
  const selected = sel.filter((id) => items.some((n) => n.id === id));
  const allOn = items.length > 0 && selected.length === items.length;
  const filtered =
    status !== "all" || category !== "all" || priority !== "all" || !!q;

  const exportRegister = async () => {
    try {
      downloadCsv(await fetchNoticeRegisterCsv(filters));
    } catch (e) {
      toast({ title: errMessage(e), variant: "destructive" });
    }
  };

  const clear = () => {
    setStatus("all");
    setCategory("all");
    setPriority("all");
    setSearch("");
  };

  const row = (n: NoticeListItem) => {
    const s = n.stats;
    const isSent = n.status === "sent" || n.status === "archived";
    const st = STATUS_TONE[n.status];
    const date = n.sentAt || n.scheduledFor || n.createdAt;
    return (
      <TableRow
        key={n.id}
        className="cursor-pointer"
        data-state={selected.includes(n.id) ? "selected" : undefined}
        onClick={() => onOpen(n.id)}
      >
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selected.includes(n.id)}
            onCheckedChange={(c) =>
              setSel((cur) =>
                c ? [...cur, n.id] : cur.filter((x) => x !== n.id),
              )
            }
            aria-label={`Select ${n.title}`}
          />
        </TableCell>
        <TableCell className="max-w-[420px]">
          <div className="flex items-center gap-2">
            {n.pinned && <PinMark />}
            <span className="truncate font-semibold">{n.title}</span>
            <PriorityChip priority={n.priority} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
              {n.ref}
            </span>
            <CategoryChip category={n.category} />
            {n.attachmentCount > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <Paperclip className="h-3 w-3" />
                {n.attachmentCount}
              </span>
            )}
            {n.unansweredQuestions > 0 && (
              <Chip tone="purple">
                <MessageCircleQuestion className="h-3 w-3" />
                {n.unansweredQuestions}
              </Chip>
            )}
          </div>
        </TableCell>
        <TableCell>
          <div className="text-sm font-medium">{n.audienceLabel}</div>
          <div className="text-xs tabular-nums text-muted-foreground">
            {n.audienceCount} people
          </div>
        </TableCell>
        <TableCell>
          <div className="text-sm tabular-nums">{fmtD(date)}</div>
          <div className="text-xs text-muted-foreground">
            {isSent
              ? "Sent"
              : n.status === "scheduled"
                ? "Scheduled"
                : "Created"}
          </div>
        </TableCell>
        <TableCell className="w-[150px]">
          {isSent ? (
            <Bar value={s.openRate} color="#3b36db" />
          ) : (
            <span className="text-xs text-muted-foreground">Not sent</span>
          )}
        </TableCell>
        <TableCell className="w-[170px]">
          {n.requireAck ? (
            isSent ? (
              <>
                <Bar value={s.ackRate} color={ackColor(s.ackRate)} />
                {s.overdue > 0 && (
                  <div className="text-xs text-destructive">
                    {s.overdue} overdue
                  </div>
                )}
              </>
            ) : (
              <span className="text-xs text-muted-foreground">
                Due {fmtD(n.deadline)}
              </span>
            )
          ) : (
            <span className="text-xs text-muted-foreground">Not required</span>
          )}
        </TableCell>
        <TableCell>
          <Chip tone={st.tone} dot>
            {st.label}
          </Chip>
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <NoticeMenu
            notice={n}
            ops={ops}
            confirm={confirm}
            onOpen={() => onOpen(n.id)}
            onEdit={() => onEdit(n.id)}
            onRevise={() => onRevise(n.id)}
            onDuplicate={() => onDuplicate(n.id)}
            trigger={
              <Button size="icon" variant="ghost" aria-label="More actions">
                <Ellipsis className="h-4 w-4" />
              </Button>
            }
          />
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={exportRegister}>
          <Download className="mr-2 h-4 w-4" />
          Download register as CSV
        </Button>
        <Button onClick={onCompose}>
          <Plus className="mr-2 h-4 w-4" />
          New notice
        </Button>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="inline-flex rounded-lg bg-muted p-0.5">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-md px-3 py-1.5 text-[13px] font-medium capitalize ${
                  status === s
                    ? "bg-card shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "draft" ? "Drafts" : s}{" "}
                <span className="tabular-nums opacity-60">
                  {counts[s] ?? 0}
                </span>
              </button>
            ))}
          </div>
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search title, reference or topic"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search notices"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[170px]" aria-label="Category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {(meta?.categories ?? []).map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-[150px]" aria-label="Priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="important">Important</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[190px]" aria-label="Sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="title">Title A to Z</SelectItem>
              <SelectItem value="ack">Lowest acknowledgement</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b bg-primary/5 px-4 py-2 text-sm">
            <b>{selected.length} selected</b>
            <span className="flex-1" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                ops.bulkRemind.mutate(selected);
                setSel([]);
              }}
            >
              <BellRing className="mr-1.5 h-3.5 w-3.5" />
              Remind pending
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                confirm({
                  title: `Archive ${selected.length} notices?`,
                  text: "Only sent notices are archived. Drafts and scheduled notices are left as they are.",
                  label: "Archive",
                  run: () => {
                    ops.bulkArchive.mutate(selected);
                    setSel([]);
                  },
                })
              }
            >
              <Archive className="mr-1.5 h-3.5 w-3.5" />
              Archive
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSel([])}>
              <X className="mr-1.5 h-3.5 w-3.5" />
              Clear
            </Button>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-9">
                <Checkbox
                  checked={allOn}
                  onCheckedChange={(c) =>
                    setSel(c ? items.map((n) => n.id) : [])
                  }
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Notice</TableHead>
              <TableHead>Audience</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Read</TableHead>
              <TableHead>Acknowledged</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(row)}
            {!items.length && (
              <TableRow>
                <TableCell colSpan={8}>
                  {isLoading ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      Loading notices…
                    </p>
                  ) : (
                    <Empty
                      icon={SearchX}
                      title={
                        filtered
                          ? "No notices match these filters"
                          : "No notices yet"
                      }
                    >
                      {filtered ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={clear}
                        >
                          Clear filters
                        </Button>
                      ) : (
                        <Button size="sm" className="mt-2" onClick={onCompose}>
                          Write the first notice
                        </Button>
                      )}
                    </Empty>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      {confirmNode}
    </div>
  );
}
