import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  BadgeCheck,
  CircleAlert,
  CircleCheck,
  Clock,
  Inbox,
  Loader2,
  MailOpen,
  MessageCircleQuestion,
  Pin,
  Receipt,
  Send,
  PenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  acknowledgeMyAnnouncement,
  askAboutMyNotice,
  errMessage,
  fetchMyNoticeList,
  fetchMyNoticeReceipt,
  openMyNotice,
  type MyNoticeDetail,
  type MyNoticeFilter,
  type MyNoticeItem,
} from "@/lib/hr/hr-notices-api";
import {
  AttachmentRow,
  ReceiptDialog,
} from "@/components/hr/notices/NoticeShared";
import {
  CategoryChip,
  CategoryIcon,
  Chip,
  Empty,
  PriorityChip,
  Prose,
  daysUntil,
  dayWord,
  fmtD,
  fmtDT,
  rel,
} from "@/components/hr/notices/noticeUi";

export const MY_NOTICE_KEY = "my-announcements";

const FILTERS: [MyNoticeFilter, string][] = [
  ["action", "Pending"],
  ["unread", "Unread"],
  ["ack", "Acknowledged"],
  ["all", "All"],
];

export default function MyAnnouncements() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<MyNoticeFilter>(
    (params.get("filter") as MyNoticeFilter) || "action",
  );
  const [openId, setOpenId] = useState<string | null>(params.get("id"));

  const { data, isLoading } = useQuery({
    queryKey: [MY_NOTICE_KEY, "list", filter],
    queryFn: () => fetchMyNoticeList(filter),
    placeholderData: (p) => p,
  });
  const items = data?.items ?? [];
  const counts = data?.counts ?? { action: 0, unread: 0, ack: 0, all: 0 };

  const choose = (id: string | null) => {
    setOpenId(id);
    const next = new URLSearchParams(params);
    if (id) next.set("id", id);
    else next.delete("id");
    setParams(next, { replace: true });
  };
  const pickFilter = (f: MyNoticeFilter) => {
    setFilter(f);
    const next = new URLSearchParams(params);
    next.set("filter", f);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Announcements</h1>
        <p className="text-sm text-muted-foreground">
          Read the notices and policies sent to you, and acknowledge the ones
          that need it.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <div className="border-b p-3">
            <div className="flex rounded-lg bg-muted p-0.5">
              {FILTERS.map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => pickFilter(k)}
                  className={`flex-1 whitespace-nowrap rounded-md px-2 py-2 text-[12.5px] font-medium ${filter === k ? "bg-card shadow-sm" : "text-muted-foreground"}`}
                >
                  {l}{" "}
                  <span className="tabular-nums opacity-60">{counts[k]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[640px] overflow-auto">
            {items.map((n) => (
              <InboxRow
                key={n.id}
                n={n}
                active={openId === n.id}
                onClick={() => choose(n.id)}
              />
            ))}
            {!items.length &&
              (isLoading ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Loading…
                </p>
              ) : (
                <Empty
                  icon={filter === "action" ? CircleCheck : Inbox}
                  title={
                    filter === "action"
                      ? "Nothing to acknowledge"
                      : "No notices here"
                  }
                >
                  {filter === "action"
                    ? "You have confirmed every notice that needs it."
                    : "Try another filter."}
                </Empty>
              ))}
          </div>
        </Card>

        <Card className="min-h-[420px] p-6">
          {openId ? (
            <Reader
              key={openId}
              id={openId}
              questionsEnabled={data?.questionsEnabled ?? true}
              onAcked={() =>
                qc.invalidateQueries({ queryKey: [MY_NOTICE_KEY] })
              }
            />
          ) : (
            <Empty icon={MailOpen} title="Select a notice to read it">
              Notices that need your acknowledgement are listed first.
            </Empty>
          )}
        </Card>
      </div>
    </div>
  );
}

function InboxRow({
  n,
  active,
  onClick,
}: {
  n: MyNoticeItem;
  active: boolean;
  onClick: () => void;
}) {
  const due = n.needsAction ? daysUntil(n.deadline) : null;
  return (
    <button
      onClick={onClick}
      className={`relative flex w-full items-start gap-3 border-b px-4 py-3.5 text-left last:border-0 ${active ? "bg-primary/5" : "hover:bg-muted/40"}`}
    >
      {!n.seen && (
        <span className="absolute left-1.5 top-5 h-2 w-2 rounded-full bg-primary" />
      )}
      <CategoryIcon category={n.category} size={38} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          {n.pinned && <Pin className="h-3 w-3 shrink-0 text-amber-600" />}
          <b
            className={`truncate text-sm ${n.seen ? "font-medium" : "font-bold"}`}
          >
            {n.title}
          </b>
        </span>
        <small className="block truncate text-xs text-muted-foreground">
          {n.summary}
        </small>
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {n.acknowledgedAt ? (
            <Chip tone="green">Acknowledged</Chip>
          ) : n.needsAction && due !== null ? (
            <Chip tone={due < 0 ? "red" : due <= 2 ? "amber" : "gold"}>
              {due < 0
                ? `Overdue by ${dayWord(-due)}`
                : due === 0
                  ? "Due today"
                  : `Due in ${dayWord(due)}`}
            </Chip>
          ) : null}
          <PriorityChip priority={n.priority} />
          <small className="ml-auto text-xs text-muted-foreground">
            {rel(n.sentAt)}
          </small>
        </span>
      </span>
    </button>
  );
}

// ── Reader ───────────────────────────────────────────────────
function Reader({
  id,
  questionsEnabled,
  onAcked,
}: {
  id: string;
  questionsEnabled: boolean;
  onAcked: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const {
    data: n,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [MY_NOTICE_KEY, "detail", id],
    queryFn: () => openMyNotice(id),
  });
  // Opening a notice records the read receipt, so refresh the unread counts
  useEffect(() => {
    if (n) {
      qc.invalidateQueries({ queryKey: [MY_NOTICE_KEY, "list"] });
      qc.invalidateQueries({ queryKey: ["my-notice-summary"] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n?.id]);

  const [confirmed, setConfirmed] = useState(false);
  const [signature, setSignature] = useState("");
  const [quiz, setQuiz] = useState<number | null>(null);
  const [fieldErr, setFieldErr] = useState<{ sig?: string; quiz?: string }>({});
  const [ask, setAsk] = useState(false);
  const [receipt, setReceipt] = useState(false);

  const fullName =
    `${user?.firstName ?? ""} ${(user as { lastName?: string } | null)?.lastName ?? ""}`.trim();

  const ack = useMutation({
    mutationFn: () =>
      acknowledgeMyAnnouncement(id, {
        confirmed: true,
        signature: n?.ackMethod === "signature" ? signature.trim() : undefined,
        quizAnswer: n?.ackMethod === "quiz" ? (quiz ?? undefined) : undefined,
      }),
    onSuccess: (d) => {
      qc.setQueryData([MY_NOTICE_KEY, "detail", id], d);
      onAcked();
      qc.invalidateQueries({ queryKey: ["my-notice-summary"] });
      toast({ title: "Acknowledged. Your receipt is saved." });
    },
    onError: (e: unknown) => {
      const msg = errMessage(e);
      if (n?.ackMethod === "signature" && /name|signature/i.test(msg))
        setFieldErr({ sig: msg });
      else if (
        n?.ackMethod === "quiz" &&
        /answer|question|incorrect/i.test(msg)
      )
        setFieldErr({ quiz: msg });
      else toast({ title: msg, variant: "destructive" });
    },
  });

  const submit = () => {
    const e: { sig?: string; quiz?: string } = {};
    if (n?.ackMethod === "quiz" && quiz === null)
      e.quiz = "Choose an answer first.";
    if (n?.ackMethod === "signature" && !signature.trim())
      e.sig = "Type your full name to sign.";
    setFieldErr(e);
    if (Object.keys(e).length) return;
    ack.mutate();
  };

  if (isLoading)
    return (
      <div className="flex justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  if (isError || !n)
    return (
      <Empty icon={CircleAlert} title="This notice could not be opened">
        {errMessage(error, "It may have been withdrawn.")}
      </Empty>
    );

  const dl = n.deadline ? daysUntil(n.deadline) : 0;
  const isPolicy = ["Policy", "Compliance"].includes(n.category);
  const canAck = n.requireAck && !n.acknowledgement && !n.archived;
  const confirmText = `I confirm that I have read and reviewed this ${isPolicy ? "policy" : "notice"}${n.attachments.length ? " and its attachments" : ""}, and I ${isPolicy ? "acknowledge that I will comply with it" : "acknowledge its contents"}.`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        <CategoryChip category={n.category} />
        <PriorityChip priority={n.priority} />
        {n.archived && <Chip>Archived</Chip>}
        <span className="ml-auto rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
          {n.ref}
        </span>
      </div>
      <h2 className="mb-1.5 mt-3 text-[23px] font-bold leading-snug tracking-tight">
        {n.title}
      </h2>
      <div className="mb-4 text-xs text-muted-foreground">
        {n.authorName}
        {n.senderName ? `, ${n.senderName}` : ""} · {fmtDT(n.sentAt)}
        {n.version > 1 && <> · Version {n.version}</>}
      </div>
      <Prose
        html={n.body}
        className="max-w-[72ch] border-t pt-4 text-[14.5px]"
      />

      {n.attachments.length > 0 && (
        <div className="mt-4 max-w-md">
          <b className="text-[13px]">Attachments</b>
          {n.attachments.map((a, i) => (
            <AttachmentRow key={i} file={a} />
          ))}
        </div>
      )}

      {n.acknowledgement ? (
        <div className="mt-5 flex items-center gap-4 rounded-xl border border-amber-300/50 bg-amber-500/5 p-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-amber-600 text-white">
            <BadgeCheck className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <b className="text-[15px]">Acknowledged</b>
            <div className="text-xs text-muted-foreground">
              {fmtDT(n.acknowledgement.at)} ·{" "}
              {n.acknowledgement.offline
                ? `Recorded by HR: ${n.acknowledgement.offlineMethod}`
                : n.acknowledgement.method === "signature"
                  ? `Signed as ${n.acknowledgement.signature}`
                  : n.acknowledgement.method === "quiz"
                    ? "Comprehension check passed"
                    : "Confirmed in workspace"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Receipt {n.acknowledgement.receiptRef} · Version {n.version}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setReceipt(true)}>
            <Receipt className="mr-1.5 h-3.5 w-3.5" />
            View receipt
          </Button>
        </div>
      ) : (
        canAck && (
          <div className="mt-5 rounded-xl border border-amber-300/50 bg-amber-500/5 p-4">
            <h4 className="flex items-center gap-2 font-semibold">
              <BadgeCheck className="h-[18px] w-[18px] text-amber-600" />
              Read, review and acknowledge
            </h4>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {dl < 0 ? (
                <b className="text-destructive">
                  This was due on {fmtD(n.deadline)}. Please acknowledge now.
                </b>
              ) : n.deadline ? (
                `Please acknowledge by ${fmtDT(n.deadline)}.`
              ) : (
                "Please acknowledge when you have read it."
              )}
            </p>

            {n.ackMethod === "quiz" && n.quiz && (
              <div className="mt-3 space-y-2 rounded-lg border bg-card p-3">
                <b className="text-[13.5px]">{n.quiz.q}</b>
                {n.quiz.options.map((o, i) => (
                  <label
                    key={i}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      name="my-quiz"
                      checked={quiz === i}
                      onChange={() => {
                        setQuiz(i);
                        setFieldErr({});
                      }}
                    />
                    {o}
                  </label>
                ))}
                {fieldErr.quiz && (
                  <p className="flex items-center gap-1.5 text-xs text-destructive">
                    <CircleAlert className="h-3.5 w-3.5" />
                    {fieldErr.quiz}
                  </p>
                )}
              </div>
            )}

            <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              {confirmText}
            </label>

            {n.ackMethod === "signature" && (
              <div className="mt-3">
                <Label htmlFor="ack-sig">Type your full name to sign</Label>
                <Input
                  id="ack-sig"
                  autoComplete="off"
                  className={`max-w-sm text-xl ${fieldErr.sig ? "border-destructive" : ""}`}
                  style={{
                    fontFamily: "'Brush Script MT','Segoe Script',cursive",
                  }}
                  placeholder={fullName}
                  value={signature}
                  onChange={(e) => {
                    setSignature(e.target.value);
                    setFieldErr({});
                  }}
                />
                {fieldErr.sig && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive">
                    <CircleAlert className="h-3.5 w-3.5" />
                    {fieldErr.sig}
                  </p>
                )}
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Your typed name, the time and your device are recorded as your
                  electronic signature.
                </p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                disabled={!confirmed || ack.isPending}
                onClick={submit}
                className="bg-amber-600 text-white hover:bg-amber-700"
              >
                {ack.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : n.ackMethod === "signature" ? (
                  <PenLine className="mr-2 h-4 w-4" />
                ) : (
                  <BadgeCheck className="mr-2 h-4 w-4" />
                )}
                {n.ackMethod === "signature"
                  ? "Sign and acknowledge"
                  : "Acknowledge"}
              </Button>
              {questionsEnabled && n.questionsEnabled && (
                <Button variant="ghost" onClick={() => setAsk(true)}>
                  <MessageCircleQuestion className="mr-2 h-4 w-4" />
                  Ask a question first
                </Button>
              )}
            </div>
          </div>
        )
      )}

      {n.myQuestions.length > 0 && (
        <div className="mt-5">
          <b className="text-[13.5px]">Your questions</b>
          {n.myQuestions.map((q) => (
            <div key={q.id} className="mt-2 rounded-lg border p-3 text-sm">
              <div className="text-xs text-muted-foreground">{rel(q.at)}</div>
              <div>{q.text}</div>
              {q.reply ? (
                <div className="mt-2 rounded-md bg-muted/60 p-2.5">
                  <b>{q.replyByName}</b> replied
                  <div className="mt-0.5">{q.reply}</div>
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-purple-600">
                  <Clock className="h-3 w-3" />
                  Awaiting a reply from HR
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {(n.acknowledgement || !n.requireAck) &&
        questionsEnabled &&
        n.questionsEnabled && (
          <Button
            size="sm"
            variant="outline"
            className="mt-5"
            onClick={() => setAsk(true)}
          >
            <MessageCircleQuestion className="mr-1.5 h-3.5 w-3.5" />
            Ask a question about this notice
          </Button>
        )}

      {n.footer && (
        <p className="mt-5 border-t pt-3 text-xs text-muted-foreground">
          {n.footer}
        </p>
      )}

      <AskDialog notice={n} open={ask} onOpenChange={setAsk} />
      <ReceiptDialog
        open={receipt}
        onOpenChange={setReceipt}
        queryKey={[MY_NOTICE_KEY, "receipt", id]}
        load={() => fetchMyNoticeReceipt(id)}
      />
    </div>
  );
}

function AskDialog({
  notice,
  open,
  onOpenChange,
}: {
  notice: MyNoticeDetail;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const send = useMutation({
    mutationFn: () => askAboutMyNotice(notice.id, text.trim()),
    onSuccess: (d) => {
      qc.setQueryData([MY_NOTICE_KEY, "detail", notice.id], d);
      toast({ title: "Your question has been sent to HR" });
      setText("");
      onOpenChange(false);
    },
    onError: (e) => toast({ title: errMessage(e), variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ask a question</DialogTitle>
          <DialogDescription>
            About {notice.ref}: {notice.title}. HR replies here and you are
            notified.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={4}
          maxLength={2000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What would you like to know?"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!text.trim() || send.isPending}
            onClick={() => send.mutate()}
          >
            {send.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send question
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
