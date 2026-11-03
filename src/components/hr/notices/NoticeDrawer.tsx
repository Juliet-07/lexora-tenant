import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BadgeCheck,
  BellRing,
  CalendarX,
  CalendarClock,
  CircleCheck,
  Circle,
  ClipboardCheck,
  Clock,
  Download,
  Ellipsis,
  FilePenLine,
  Loader2,
  MessageCircleQuestion,
  PenLine,
  Pin,
  Receipt,
  Search,
  Send,
  Trash2,
  User,
  Users,
  Megaphone,
  ArchiveRestore,
  Reply,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  NOTICE_ACK_METHODS,
  NOTICE_REMINDER_LABEL,
  errMessage,
  escalateNotice,
  fetchNotice,
  fetchNoticeMeta,
  fetchNoticeReceipt,
  fetchNoticeRecipients,
  previewNoticeAudience,
  recordOfflineAck,
  remindNotice,
  replyToNoticeQuestion,
  type EmployeeBrief,
  type NoticeDetail,
  type NoticeRecipientRow,
} from "@/lib/hr/hr-notices-api";
import {
  NOTICE_KEY,
  NoticeMenu,
  useConfirm,
  useNoticeOps,
} from "./noticeActions";
import {
  AttachmentRow,
  PeopleDialog,
  ReceiptDialog,
  useCopy,
} from "./NoticeShared";
import {
  CategoryChip,
  Chip,
  Empty,
  PriorityChip,
  Person,
  Prose,
  RECIPIENT_TONE,
  STATUS_TONE,
  fmtD,
  fmtDT,
  fmtT,
  pct,
  rel,
} from "./noticeUi";

const TABS = ["overview", "recipients", "questions", "activity", "versions"];

const ACT_TONE: Record<string, string> = {
  sent: "border-primary text-primary",
  reminder: "border-amber-500 text-amber-600",
  ack: "border-emerald-600 text-emerald-600",
  offline: "border-emerald-600 text-emerald-600",
  question: "border-purple-500 text-purple-600",
  reply: "border-purple-500 text-purple-600",
  escalated: "border-destructive text-destructive",
  scheduled: "border-blue-500 text-blue-600",
};

export function NoticeDrawer({
  id,
  tab,
  onTab,
  onClose,
  onEdit,
  onRevise,
  onDuplicate,
  onOpenOther,
}: {
  id: string | null;
  tab: string;
  onTab: (t: string) => void;
  onClose: () => void;
  onEdit: (id: string) => void;
  onRevise: (id: string) => void;
  onDuplicate: (id: string) => void;
  onOpenOther: (ref: string) => void;
}) {
  const ops = useNoticeOps();
  const [confirmNode, confirm] = useConfirm();
  const { copy } = useCopy();
  const { data: n, isLoading } = useQuery({
    queryKey: [NOTICE_KEY, "detail", id],
    queryFn: () => fetchNotice(id!),
    enabled: !!id,
  });
  const { data: meta } = useQuery({
    queryKey: [NOTICE_KEY, "meta"],
    queryFn: fetchNoticeMeta,
    enabled: !!id,
  });
  const [audOpen, setAudOpen] = useState(false);

  const isSent = n?.status === "sent" || n?.status === "archived";
  const s = n?.stats;

  const actions = () => {
    if (!n) return null;
    const btn = "mr-2 h-4 w-4";
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {n.status === "sent" && n.requireAck && s!.outstanding > 0 && (
          <Button onClick={() => ops.remind.mutate({ id: n.id })}>
            <BellRing className={btn} />
            Remind {s!.outstanding} pending
          </Button>
        )}
        {n.status === "sent" && (
          <>
            <Button variant="outline" onClick={() => ops.csv(n.id)}>
              <Download className={btn} />
              Download CSV
            </Button>
            <Button variant="outline" onClick={() => onRevise(n.id)}>
              <FilePenLine className={btn} />
              Revise and reissue
            </Button>
          </>
        )}
        {n.status === "scheduled" && (
          <>
            <Button
              onClick={() =>
                confirm({
                  title: "Send this notice now?",
                  text: `It goes out immediately to ${n.audienceCount} people.`,
                  label: "Send now",
                  run: () => ops.sendNow.mutate(n.id),
                })
              }
            >
              <Send className={btn} />
              Send now
            </Button>
            <Button variant="outline" onClick={() => onEdit(n.id)}>
              <PenLine className={btn} />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                confirm({
                  title: "Cancel the schedule?",
                  text: "The notice returns to drafts.",
                  label: "Cancel schedule",
                  run: () => ops.unschedule.mutate(n.id),
                })
              }
            >
              <CalendarX className={btn} />
              Cancel schedule
            </Button>
          </>
        )}
        {n.status === "draft" && (
          <>
            <Button onClick={() => onEdit(n.id)}>
              <PenLine className={btn} />
              Continue editing
            </Button>
            <Button
              variant="outline"
              className="text-destructive"
              onClick={() =>
                confirm({
                  title: "Delete this draft?",
                  text: `${n.ref} will be removed permanently.`,
                  label: "Delete",
                  danger: true,
                  run: () => ops.remove.mutate(n.id, { onSuccess: onClose }),
                })
              }
            >
              <Trash2 className={btn} />
              Delete draft
            </Button>
          </>
        )}
        {n.status === "archived" && (
          <>
            <Button onClick={() => ops.restore.mutate(n.id)}>
              <ArchiveRestore className={btn} />
              Restore
            </Button>
            <Button variant="outline" onClick={() => ops.csv(n.id)}>
              <Download className={btn} />
              Download CSV
            </Button>
          </>
        )}
        <NoticeMenu
          notice={n}
          ops={ops}
          confirm={confirm}
          onEdit={() => onEdit(n.id)}
          onRevise={() => onRevise(n.id)}
          onDuplicate={() => onDuplicate(n.id)}
          onDeleted={onClose}
          trigger={
            <Button variant="ghost" size="icon" aria-label="More">
              <Ellipsis className="h-4 w-4" />
            </Button>
          }
        />
      </div>
    );
  };

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[760px]"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Notice details</SheetTitle>
          <SheetDescription>
            Delivery and acknowledgement record
          </SheetDescription>
        </SheetHeader>
        {isLoading || !n ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="border-b px-6 pb-0 pt-5">
              <div className="flex flex-wrap items-center gap-2 pr-8">
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {n.ref}
                </span>
                <Chip tone={STATUS_TONE[n.status].tone} dot>
                  {STATUS_TONE[n.status].label}
                </Chip>
                <CategoryChip category={n.category} />
                <PriorityChip priority={n.priority} />
                {n.pinned && (
                  <Chip tone="gold">
                    <Pin className="h-3 w-3" />
                    Pinned
                  </Chip>
                )}
              </div>
              <h2 className="mt-2 text-xl font-bold leading-snug">{n.title}</h2>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {n.authorName}
                </span>
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => setAudOpen(true)}
                >
                  <Users className="h-3.5 w-3.5" />
                  {n.audienceLabel} ({n.audienceCount})
                </button>
                <span className="flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {n.sentAt
                    ? `Sent ${fmtDT(n.sentAt)}`
                    : n.scheduledFor
                      ? `Scheduled for ${fmtDT(n.scheduledFor)}`
                      : `Created ${fmtDT(n.createdAt)}`}
                </span>
                {n.requireAck && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Acknowledge by {fmtD(n.deadline)}
                  </span>
                )}
              </div>
              {actions()}
              <Tabs value={tab} onValueChange={onTab} className="mt-3">
                <TabsList className="h-auto w-full justify-start gap-1 rounded-none bg-transparent p-0">
                  {TABS.map((t) => {
                    const count =
                      t === "recipients"
                        ? isSent
                          ? s!.total
                          : 0
                        : t === "questions"
                          ? n.questions.length
                          : t === "versions"
                            ? n.versions.length
                            : 0;
                    return (
                      <TabsTrigger
                        key={t}
                        value={t}
                        className="rounded-none border-b-2 border-transparent px-3 py-2 capitalize data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                      >
                        {t}
                        {count > 0 && (
                          <span className="ml-1.5 rounded-full bg-muted px-1.5 text-[11px]">
                            {count}
                          </span>
                        )}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>
            </div>
            <div className="flex-1 overflow-auto px-6 py-5">
              {tab === "overview" && <OverviewTab n={n} />}
              {tab === "recipients" && (
                <RecipientsTab
                  n={n}
                  depts={meta?.departments ?? []}
                  onAudience={() => setAudOpen(true)}
                />
              )}
              {tab === "questions" && <QuestionsTab n={n} />}
              {tab === "activity" && <ActivityTab n={n} copy={copy} />}
              {tab === "versions" && (
                <VersionsTab n={n} onOpenOther={onOpenOther} />
              )}
            </div>
          </>
        )}
        {confirmNode}
        {n && (
          <PlannedAudience open={audOpen} onOpenChange={setAudOpen} n={n} />
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Audience dialog (uses the recipient list once sent) ─────
function PlannedAudience({
  open,
  onOpenChange,
  n,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  n: NoticeDetail;
}) {
  const sent = n.status === "sent" || n.status === "archived";
  const { data } = useQuery({
    queryKey: [NOTICE_KEY, "aud", n.id, sent],
    enabled: open,
    queryFn: async (): Promise<{ people: EmployeeBrief[]; total: number }> => {
      if (sent) {
        const r = await fetchNoticeRecipients(n.id, {});
        return { people: r.items.map((x) => x.employee), total: r.total };
      }
      const p = await previewNoticeAudience(n.audience);
      return { people: p.people, total: p.count };
    },
  });
  return (
    <PeopleDialog
      open={open}
      onOpenChange={onOpenChange}
      title={sent ? "Recipients" : "Planned audience"}
      people={data?.people ?? []}
      total={data?.total}
    />
  );
}

// ── Overview ─────────────────────────────────────────────────
function Fact({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}

function OverviewTab({ n }: { n: NoticeDetail }) {
  const s = n.stats;
  const sent = n.status === "sent" || n.status === "archived";
  const readNotAck = Math.max(0, s.opened - s.acknowledged);
  const fn = (
    label: string,
    value: React.ReactNode,
    sub: string,
    tone = "",
  ) => (
    <div className={`rounded-lg border p-3 ${tone}`}>
      <small className="text-xs text-muted-foreground">{label}</small>
      <b className="block text-xl tabular-nums">{value}</b>
      <span className="text-xs text-muted-foreground">{sub}</span>
    </div>
  );
  return (
    <div className="space-y-5">
      {sent && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {fn(
              "Recipients",
              s.total,
              n.channels
                .map((c) => (c === "inapp" ? "Portal" : "Email"))
                .join(", "),
            )}
            {fn("Delivered", s.total, "100%")}
            {fn("Opened", s.opened, `${s.openRate}% read rate`)}
            {fn(
              "Acknowledged",
              n.requireAck ? s.acknowledged : "n/a",
              n.requireAck ? `${s.ackRate}% complete` : "Not required",
              "border-amber-300/60 bg-amber-500/5",
            )}
            {fn(
              "Overdue",
              n.requireAck ? s.overdue : "n/a",
              n.requireAck ? (s.overdue ? "Past deadline" : "None") : "",
              s.overdue ? "border-destructive/30 bg-destructive/5" : "",
            )}
          </div>
          {n.requireAck && (
            <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
              <i
                className="block h-full bg-emerald-600"
                style={{ width: `${s.ackRate}%` }}
              />
              <i
                className="block h-full bg-amber-500"
                style={{ width: `${pct(readNotAck, s.total)}%` }}
              />
            </div>
          )}
        </>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h4 className="mb-2 text-sm font-semibold">Settings</h4>
          <dl>
            <Fact k="Category" v={n.category} />
            <Fact
              k="Priority"
              v={n.priority[0].toUpperCase() + n.priority.slice(1)}
            />
            <Fact
              k="Channels"
              v={n.channels
                .map((c) => (c === "inapp" ? "Employee portal" : "Email"))
                .join(", ")}
            />
            <Fact
              k="Acknowledgement"
              v={
                n.requireAck
                  ? NOTICE_ACK_METHODS[n.ackMethod].label
                  : "Not required"
              }
            />
            {n.requireAck && (
              <>
                <Fact k="Deadline" v={fmtDT(n.deadline)} />
                <Fact k="Reminders" v={NOTICE_REMINDER_LABEL[n.reminders]} />
                <Fact
                  k="Escalation"
                  v={
                    n.escalate
                      ? `Line manager after ${n.escalateAfter} days overdue`
                      : "Off"
                  }
                />
              </>
            )}
            <Fact k="Expires" v={n.expiresAt ? fmtD(n.expiresAt) : "Never"} />
          </dl>
          {n.quiz && (
            <div className="mt-3 rounded-lg border p-3 text-sm">
              <small className="text-muted-foreground">
                Comprehension question
              </small>
              <div className="mt-1 font-medium">{n.quiz.q}</div>
              {n.quiz.options.map((o, i) => (
                <div
                  key={i}
                  className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  {i === n.quiz!.answer ? (
                    <CircleCheck className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" />
                  )}
                  {o}
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold">Content</h4>
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 border-b pb-3">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                <Megaphone className="h-3.5 w-3.5" />
              </span>
              <div className="text-xs text-muted-foreground">
                {n.authorName}
              </div>
            </div>
            <Prose html={n.body} />
            {n.attachments.map((a, i) => (
              <AttachmentRow key={i} file={a} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Recipients ───────────────────────────────────────────────
function RecipientsTab({
  n,
  depts,
  onAudience,
}: {
  n: NoticeDetail;
  depts: { id: string; name: string }[];
  onAudience: () => void;
}) {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [dept, setDept] = useState("all");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [offline, setOffline] = useState<EmployeeBrief | null>(null);
  const sent = n.status === "sent" || n.status === "archived";

  useEffect(() => {
    const t = setTimeout(() => setQ(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: [NOTICE_KEY, "recipients", n.id, status, dept, q],
    queryFn: () => fetchNoticeRecipients(n.id, { status, dept, search: q }),
    enabled: sent,
  });
  const rows = data?.items ?? [];
  const open = rows.filter((r) => !r.ackAt);
  const selected = sel.filter((x) => open.some((r) => r.employee.id === x));

  const refresh = () => qc.invalidateQueries({ queryKey: [NOTICE_KEY] });
  const remind = useMutation({
    mutationFn: (ids: string[]) => remindNotice(n.id, ids),
    onSuccess: (r) => {
      refresh();
      toast({
        title: `Reminder sent to ${r.reminded} ${r.reminded === 1 ? "person" : "people"}`,
      });
      setSel([]);
    },
    onError: (e) => toast({ title: errMessage(e), variant: "destructive" }),
  });
  const escalate = useMutation({
    mutationFn: (ids: string[]) => escalateNotice(n.id, ids),
    onSuccess: (r) => {
      refresh();
      toast({
        title: r.escalated
          ? `Escalated ${r.escalated} to ${r.managers} ${r.managers === 1 ? "manager" : "managers"}`
          : "Nobody to escalate",
      });
      setSel([]);
    },
    onError: (e) => toast({ title: errMessage(e), variant: "destructive" }),
  });

  if (!sent)
    return (
      <Empty icon={Send} title="No recipients yet">
        Recipients are recorded when the notice is sent. {n.audienceCount}{" "}
        people match the audience.
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={onAudience}
        >
          View planned audience
        </Button>
      </Empty>
    );

  const statusOptions = Object.entries(RECIPIENT_TONE).filter(
    ([k]) =>
      n.requireAck || !["acknowledged", "overdue", "pending"].includes(k),
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="w-56 pl-9"
            placeholder="Search employees"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search recipients"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[190px]" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statusOptions.map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="w-[190px]" aria-label="Department">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {depts.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selected.length > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-sm">
          <b>{selected.length} selected</b>
          <span className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => remind.mutate(selected)}
          >
            <BellRing className="mr-1.5 h-3.5 w-3.5" />
            Send reminder
          </Button>
          {n.requireAck && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => escalate.mutate(selected)}
            >
              <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" />
              Escalate to managers
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setSel([])}>
            Clear
          </Button>
        </div>
      )}
      <div className="mb-2 text-xs text-muted-foreground">
        {rows.length} of {data?.total ?? 0} recipients shown
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-9">
                <Checkbox
                  checked={open.length > 0 && selected.length === open.length}
                  disabled={!open.length}
                  onCheckedChange={(c) =>
                    setSel(c ? open.map((r) => r.employee.id) : [])
                  }
                  aria-label="Select all outstanding"
                />
              </TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Opened</TableHead>
              {n.requireAck && <TableHead>Acknowledged</TableHead>}
              <TableHead>Reminders</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <RecipientRow
                key={r.employee.id}
                r={r}
                n={n}
                checked={selected.includes(r.employee.id)}
                onCheck={(c) =>
                  setSel((cur) =>
                    c
                      ? [...cur, r.employee.id]
                      : cur.filter((x) => x !== r.employee.id),
                  )
                }
                onRemind={() => remind.mutate([r.employee.id])}
                onEscalate={() => escalate.mutate([r.employee.id])}
                onReceipt={() => setReceipt(r.employee.id)}
                onOffline={() => setOffline(r.employee)}
              />
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={7}>
                  {isLoading ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Loading…
                    </p>
                  ) : (
                    <Empty icon={Users} title="No recipients match" />
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <ReceiptDialog
        open={!!receipt}
        onOpenChange={(o) => !o && setReceipt(null)}
        queryKey={[NOTICE_KEY, "receipt", n.id, receipt]}
        load={() => fetchNoticeReceipt(n.id, receipt!)}
      />
      <OfflineDialog
        n={n}
        employee={offline}
        onClose={() => setOffline(null)}
        onDone={refresh}
      />
    </div>
  );
}

function RecipientRow({
  r,
  n,
  checked,
  onCheck,
  onRemind,
  onEscalate,
  onReceipt,
  onOffline,
}: {
  r: NoticeRecipientRow;
  n: NoticeDetail;
  checked: boolean;
  onCheck: (c: boolean) => void;
  onRemind: () => void;
  onEscalate: () => void;
  onReceipt: () => void;
  onOffline: () => void;
}) {
  const tone = RECIPIENT_TONE[r.status];
  return (
    <TableRow>
      <TableCell>
        {!r.ackAt && (
          <Checkbox
            checked={checked}
            onCheckedChange={(c) => onCheck(!!c)}
            aria-label={`Select ${r.employee.name}`}
          />
        )}
      </TableCell>
      <TableCell className="max-w-[220px]">
        <Person name={r.employee.name} sub={r.employee.dept} size={28} />
      </TableCell>
      <TableCell className="text-xs">
        {r.openedAt ? (
          <>
            <div>
              {fmtD(r.openedAt)}{" "}
              <span className="text-muted-foreground">{fmtT(r.openedAt)}</span>
            </div>
            <div className="text-muted-foreground">
              {r.channel === "email" ? "Email" : "Portal"}
            </div>
          </>
        ) : (
          <span className="text-muted-foreground">Not opened</span>
        )}
      </TableCell>
      {n.requireAck && (
        <TableCell className="text-xs">
          {r.ackAt ? (
            <>
              <div>
                {fmtD(r.ackAt)}{" "}
                <span className="text-muted-foreground">{fmtT(r.ackAt)}</span>
              </div>
              <div className="text-muted-foreground">
                {r.offline
                  ? `Recorded offline: ${r.offlineMethod}`
                  : r.ackMethod === "signature"
                    ? `Signed as ${r.signature}`
                    : r.ackMethod === "quiz"
                      ? "Passed check"
                      : "Confirmed"}
              </div>
            </>
          ) : (
            <span className="text-muted-foreground">Outstanding</span>
          )}
        </TableCell>
      )}
      <TableCell className="text-xs tabular-nums">
        {r.reminders}
        {r.escalatedAt && <div className="text-destructive">Escalated</div>}
      </TableCell>
      <TableCell>
        <Chip tone={tone.tone} dot>
          {tone.label}
        </Chip>
      </TableCell>
      <TableCell className="whitespace-nowrap text-right">
        {r.ackAt ? (
          <Button size="sm" variant="ghost" onClick={onReceipt}>
            <Receipt className="mr-1.5 h-3.5 w-3.5" />
            Receipt
          </Button>
        ) : (
          <>
            <Button
              size="icon"
              variant="ghost"
              title="Send reminder"
              aria-label="Send reminder"
              onClick={onRemind}
            >
              <BellRing className="h-4 w-4" />
            </Button>
            {n.requireAck && n.status === "sent" && (
              <RowMore onEscalate={onEscalate} onOffline={onOffline} />
            )}
          </>
        )}
      </TableCell>
    </TableRow>
  );
}

function RowMore({
  onEscalate,
  onOffline,
}: {
  onEscalate: () => void;
  onOffline: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="More">
          <Ellipsis className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEscalate}>
          <ArrowUpRight className="mr-2 h-4 w-4" />
          Escalate to line manager
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onOffline}>
          <ClipboardCheck className="mr-2 h-4 w-4" />
          Record acknowledgement offline
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function OfflineDialog({
  n,
  employee,
  onClose,
  onDone,
}: {
  n: { id: string; ref: string };
  employee: EmployeeBrief | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [method, setMethod] = useState("Signed paper copy");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const save = useMutation({
    mutationFn: () =>
      recordOfflineAck(n.id, employee!.id, {
        method,
        date,
        note: note || undefined,
      }),
    onSuccess: () => {
      toast({ title: `Recorded for ${employee!.name}` });
      onDone();
      onClose();
      setNote("");
    },
    onError: (e) => toast({ title: errMessage(e), variant: "destructive" }),
  });
  return (
    <Dialog open={!!employee} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record acknowledgement offline</DialogTitle>
          <DialogDescription>
            For {employee?.name} on {n.ref}. Use this when the employee
            confirmed on paper or in person.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>How was it confirmed?</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Signed paper copy", "In person", "By phone", "Other"].map(
                  (m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date confirmed</Label>
            <Input
              type="date"
              value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="For example: signed copy filed in the personnel folder"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Questions ────────────────────────────────────────────────
function QuestionsTab({ n }: { n: NoticeDetail }) {
  const qc = useQueryClient();
  const [text, setText] = useState<Record<string, string>>({});
  const reply = useMutation({
    mutationFn: (v: { qid: string; shareWithAll: boolean }) =>
      replyToNoticeQuestion(n.id, v.qid, {
        reply: text[v.qid] ?? "",
        shareWithAll: v.shareWithAll,
      }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: [NOTICE_KEY] });
      setText((t) => ({ ...t, [v.qid]: "" }));
      toast({
        title: v.shareWithAll
          ? "Reply sent and shared with everyone"
          : "Reply sent",
      });
    },
    onError: (e) => toast({ title: errMessage(e), variant: "destructive" }),
  });
  if (!n.questions.length)
    return (
      <Empty icon={MessageCircleQuestion} title="No questions yet">
        Employees can ask a question from the notice in their workspace.
        Questions appear here for a reply.
      </Empty>
    );
  return (
    <div className="space-y-3">
      {n.questions.map((q) => (
        <div key={q.id} className="rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <Person
                name={q.employee?.name ?? "Former employee"}
                sub={`${q.employee?.role ?? ""}${q.employee?.dept ? `, ${q.employee.dept}` : ""} · ${rel(q.at)}`}
              />
            </div>
            {q.reply ? (
              <Chip tone="green">Answered</Chip>
            ) : (
              <Chip tone="purple">Awaiting reply</Chip>
            )}
          </div>
          <p className="mt-3 text-sm">{q.text}</p>
          {q.reply ? (
            <div className="mt-3 rounded-md bg-muted/60 p-3 text-sm">
              <b>{q.replyByName}</b>{" "}
              <span className="text-xs text-muted-foreground">
                {rel(q.replyAt)}
              </span>
              {q.shared && (
                <Chip tone="blue" className="ml-2">
                  Shared with all
                </Chip>
              )}
              <div className="mt-1">{q.reply}</div>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <Textarea
                rows={2}
                placeholder="Write a reply. The employee is notified in the portal."
                value={text[q.id] ?? ""}
                onChange={(e) =>
                  setText((t) => ({ ...t, [q.id]: e.target.value }))
                }
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!(text[q.id] ?? "").trim() || reply.isPending}
                  onClick={() =>
                    reply.mutate({ qid: q.id, shareWithAll: true })
                  }
                >
                  <Megaphone className="mr-1.5 h-3.5 w-3.5" />
                  Reply and share with all recipients
                </Button>
                <span className="flex-1" />
                <Button
                  size="sm"
                  disabled={!(text[q.id] ?? "").trim() || reply.isPending}
                  onClick={() =>
                    reply.mutate({ qid: q.id, shareWithAll: false })
                  }
                >
                  <Reply className="mr-1.5 h-3.5 w-3.5" />
                  Send reply
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Activity ─────────────────────────────────────────────────
function ActivityTab({
  n,
  copy,
}: {
  n: NoticeDetail;
  copy: (t: string, ok?: string) => void;
}) {
  const log = useMemo(
    () =>
      n.activity
        .map(
          (a) =>
            `${fmtDT(a.at)}\t${a.system ? "Lexora" : a.actorName}\t${a.text}`,
        )
        .join("\n"),
    [n.activity],
  );
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <p className="flex-1 text-sm text-muted-foreground">
          A tamper-evident log of every action on this notice. Entries cannot be
          edited or deleted.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => copy(log, "Log copied")}
        >
          Copy log
        </Button>
      </div>
      <div className="relative ml-2 space-y-4 border-l pl-6">
        {n.activity.map((a) => (
          <div key={a.id} className="relative text-sm">
            <span
              className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 bg-background ${ACT_TONE[a.act] ?? "border-muted-foreground text-muted-foreground"}`}
            />
            <b>{a.system ? "Lexora" : a.actorName}</b> <span>{a.text}</span>
            <div className="text-xs text-muted-foreground">{fmtDT(a.at)}</div>
          </div>
        ))}
        {!n.activity.length && (
          <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
        )}
      </div>
    </div>
  );
}

// ── Versions ─────────────────────────────────────────────────
function VersionsTab({
  n,
  onOpenOther,
}: {
  n: NoticeDetail;
  onOpenOther: (ref: string) => void;
}) {
  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Each reissue creates a new version. Staff acknowledge the version they
        were sent, so earlier acknowledgements stay valid for the period they
        covered.
      </p>
      {n.versions
        .slice()
        .reverse()
        .map((v, i) => (
          <div key={v.v} className="flex items-center gap-3 border-b py-3">
            <span
              className={`grid h-10 w-10 place-items-center rounded-lg font-extrabold ${i === 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
            >
              v{v.v}
            </span>
            <div className="flex-1">
              <div className="text-sm font-medium">{v.note}</div>
              <div className="text-xs text-muted-foreground">
                {v.byName} · {fmtDT(v.at)}
              </div>
            </div>
            {i === 0 ? (
              <Chip tone="green">Current</Chip>
            ) : (
              v.ref && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenOther(v.ref!)}
                >
                  Open
                </Button>
              )
            )}
          </div>
        ))}
    </div>
  );
}
