import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Flag,
  Info,
  LayoutTemplate,
  List,
  ListChecks,
  Loader2,
  Mail,
  Megaphone,
  MapPin,
  MousePointerClick,
  PenLine,
  Plus,
  Save,
  Send,
  Siren,
  Upload,
  UserCheck,
  Users,
  UsersRound,
  X,
  CalendarClock,
  Braces,
  Search,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { RichTextEditor } from "@/components/RichTextEditor";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  NOTICE_ACK_METHODS,
  NOTICE_REMINDER_LABEL,
  createNoticeTemplate,
  errMessage,
  previewNoticeAudience,
  publishNotice,
  saveNoticeDraft,
  searchNoticeEmployees,
  uploadNoticeAttachment,
  type NoticeAckMethod,
  type NoticeAttachment,
  type NoticeAudience,
  type NoticeAudienceType,
  type NoticeDetail,
  type NoticeDraftInput,
  type NoticeMeta,
  type NoticePriority,
  type NoticePublishInput,
  type NoticeReminders,
  type NoticeTemplate,
} from "@/lib/hr/hr-notices-api";
import { NOTICE_KEY } from "./noticeActions";
import { AttachmentRow, PeopleDialog } from "./NoticeShared";
import {
  CategoryChip,
  PriorityChip,
  Prose,
  fmtD,
  fmtDT,
  inDays,
  stripHtml,
  toDateInput,
  toLocalInput,
} from "./noticeUi";

// ── Form model ───────────────────────────────────────────────
export interface ComposeForm {
  id: string | null;
  title: string;
  category: string;
  priority: NoticePriority;
  summary: string;
  body: string;
  attachments: NoticeAttachment[];
  pinned: boolean;
  expiresAt: string;
  audience: NoticeAudience;
  email: boolean;
  requireAck: boolean;
  ackMethod: NoticeAckMethod;
  quiz: { q: string; options: string[]; answer: number };
  deadline: string;
  reminders: NoticeReminders;
  escalate: boolean;
  escalateAfter: number;
  timing: "now" | "schedule";
  scheduleAt: string;
  revisionOf: string | null;
  templateId: string | null;
}

export const blankForm = (
  meta: NoticeMeta,
  tpl?: NoticeTemplate | null,
): ComposeForm => ({
  id: null,
  title: "",
  category: tpl?.category ?? "Policy",
  priority: tpl?.priority ?? "normal",
  summary: "",
  body: tpl?.body ?? "",
  attachments: [],
  pinned: false,
  expiresAt: "",
  audience: {
    type: tpl?.audienceHint === "individuals" ? "individuals" : "all",
    values: [],
  },
  email: meta.settings.emailChannel,
  requireAck: tpl ? tpl.requireAck : true,
  ackMethod: tpl?.ackMethod ?? "click",
  quiz: { q: "", options: ["", "", ""], answer: 0 },
  deadline: toDateInput(inDays(7)),
  reminders:
    meta.settings.reminders === "none" ? "every2" : meta.settings.reminders,
  escalate: true,
  escalateAfter: meta.settings.escalateAfter,
  timing: "now",
  scheduleAt: toLocalInput(inDays(1, 8)),
  revisionOf: null,
  templateId: tpl?.id ?? null,
});

export const formFromDetail = (
  d: NoticeDetail,
  mode: "edit" | "revise" | "duplicate",
): ComposeForm => ({
  id: mode === "edit" ? d.id : null,
  title: d.title,
  category: d.category,
  priority: d.priority,
  summary: d.summary,
  body: d.body,
  attachments: d.attachments.map((a) => ({ ...a })),
  pinned: d.pinned,
  expiresAt: toDateInput(d.expiresAt),
  audience: { type: d.audience.type, values: [...(d.audience.values ?? [])] },
  email: d.channels.includes("email"),
  requireAck: d.requireAck,
  ackMethod: d.ackMethod,
  quiz: d.quiz
    ? { q: d.quiz.q, options: [...d.quiz.options], answer: d.quiz.answer }
    : { q: "", options: ["", "", ""], answer: 0 },
  deadline:
    d.deadline && new Date(d.deadline) > new Date()
      ? toDateInput(d.deadline)
      : toDateInput(inDays(7)),
  reminders: d.reminders === "none" && d.requireAck ? "every2" : d.reminders,
  escalate: d.escalate,
  escalateAfter: d.escalateAfter,
  timing: mode === "edit" && d.status === "scheduled" ? "schedule" : "now",
  scheduleAt:
    mode === "edit" && d.scheduledFor
      ? toLocalInput(d.scheduledFor)
      : toLocalInput(inDays(1, 8)),
  revisionOf: mode === "revise" ? d.ref : null,
  templateId: d.templateId,
});

const toDraft = (f: ComposeForm): NoticeDraftInput => ({
  title: f.title.trim(),
  category: f.category,
  priority: f.priority,
  summary: f.summary.trim(),
  body: f.body,
  audience: f.audience,
  channels: f.email ? ["inapp", "email"] : ["inapp"],
  requireAck: f.requireAck,
  ackMethod: f.ackMethod,
  quiz:
    f.requireAck && f.ackMethod === "quiz"
      ? {
          q: f.quiz.q.trim(),
          options: f.quiz.options.map((o) => o.trim()),
          answer: f.quiz.answer,
        }
      : null,
  deadline:
    f.requireAck && f.deadline
      ? new Date(`${f.deadline}T17:00`).toISOString()
      : null,
  reminders: f.requireAck ? f.reminders : "none",
  escalate: f.requireAck && f.escalate,
  escalateAfter: Number(f.escalateAfter) || 3,
  attachments: f.attachments,
  pinned: f.pinned,
  expiresAt: f.expiresAt
    ? new Date(`${f.expiresAt}T23:59`).toISOString()
    : null,
  revisionOf: f.revisionOf,
  templateId: f.templateId,
});

const toPublish = (f: ComposeForm): NoticePublishInput => ({
  ...toDraft(f),
  timing: f.timing,
  scheduleAt:
    f.timing === "schedule" && f.scheduleAt
      ? new Date(f.scheduleAt).toISOString()
      : null,
});

const audienceReady = (a: NoticeAudience) =>
  a.type === "all" || a.type === "newjoiners" || a.values.length > 0;

type Errors = Partial<
  Record<"title" | "body" | "aud" | "dl" | "quiz" | "sch", string>
>;

const validate = (step: number, f: ComposeForm, recipients: number): Errors => {
  const e: Errors = {};
  if (step === 1) {
    if (!f.title.trim())
      e.title = "Add a title so staff know what the notice is about.";
    if (!stripHtml(f.body).trim())
      e.body = "Write the message before continuing.";
  }
  if (step === 2 && (!audienceReady(f.audience) || recipients < 1))
    e.aud = "Choose at least one recipient.";
  if (step === 3) {
    if (f.requireAck) {
      if (!f.deadline) e.dl = "Set a deadline for acknowledgement.";
      else if (new Date(`${f.deadline}T23:59`) < new Date())
        e.dl = "The deadline must be in the future.";
      if (
        f.ackMethod === "quiz" &&
        (!f.quiz.q.trim() || f.quiz.options.some((o) => !o.trim()))
      )
        e.quiz = "Add the question and all three answers.";
    }
    if (
      f.timing === "schedule" &&
      (!f.scheduleAt || new Date(f.scheduleAt) < new Date())
    )
      e.sch = "Choose a future date and time.";
  }
  return e;
};

const STEPS: [string, string][] = [
  ["Content", "Title, message and files"],
  ["Audience", "Who receives it"],
  ["Delivery", "Channels and acknowledgement"],
  ["Review", "Check and send"],
];

const ErrText = ({ msg }: { msg?: string }) =>
  msg ? (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive">
      <CircleAlert className="h-3.5 w-3.5" />
      {msg}
    </p>
  ) : null;

// ── Component ────────────────────────────────────────────────
export function NoticeCompose({
  initial,
  meta,
  onClose,
  onSent,
  onGoGroups,
}: {
  initial: ComposeForm;
  meta: NoticeMeta;
  onClose: () => void;
  onSent: (n: NoticeDetail) => void;
  onGoGroups: () => void;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState<ComposeForm>(initial);
  const [step, setStep] = useState(1);
  const [err, setErr] = useState<Errors>({});
  const [uploading, setUploading] = useState(false);
  const [viewAud, setViewAud] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof ComposeForm>(k: K, v: ComposeForm[K]) =>
    setF((cur) => ({ ...cur, [k]: v }));

  // Live audience count
  const audKey = JSON.stringify(f.audience);
  const { data: aud } = useQuery({
    queryKey: [NOTICE_KEY, "aud-preview", audKey],
    queryFn: () => previewNoticeAudience(f.audience),
    enabled: audienceReady(f.audience),
    placeholderData: (p) => p,
  });
  const recipients = audienceReady(f.audience) ? (aud?.count ?? 0) : 0;
  const audLabel = (() => {
    const a = f.audience;
    const names = (
      xs: { id?: string; value?: string; name?: string; label?: string }[],
    ) =>
      a.values
        .map((v) => xs.find((x) => (x.id ?? x.value) === v))
        .map((x) => x?.name ?? x?.label)
        .filter(Boolean) as string[];
    switch (a.type) {
      case "all":
        return "Everyone";
      case "departments": {
        const n = names(meta.departments);
        return n.length > 2 ? `${n.length} departments` : n.join(", ");
      }
      case "locations":
        return names(meta.locations).join(", ");
      case "types":
        return names(meta.employmentTypes).join(", ");
      case "individuals":
        return `${a.values.length} selected ${a.values.length === 1 ? "person" : "people"}`;
      case "group":
        return meta.groups.find((g) => g.id === a.values[0])?.name ?? "";
      default:
        return "New joiners (90 days)";
    }
  })();

  // Autosave-free: explicit save + send
  const save = useMutation({
    mutationFn: () => saveNoticeDraft(toDraft(f), f.id ?? undefined),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: [NOTICE_KEY] });
      toast({ title: `Draft saved as ${d.ref}` });
      setF((cur) => ({ ...cur, id: d.id }));
    },
    onError: (e) => toast({ title: errMessage(e), variant: "destructive" }),
  });
  const publish = useMutation({
    mutationFn: () => publishNotice(toPublish(f), f.id ?? undefined),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: [NOTICE_KEY] });
      toast({
        title:
          d.status === "scheduled"
            ? `${d.ref} scheduled for ${fmtDT(d.scheduledFor)}`
            : `${d.ref} sent to ${d.stats.total} people`,
      });
      onSent(d);
    },
    onError: (e) => toast({ title: errMessage(e), variant: "destructive" }),
  });

  const next = () => {
    const e = validate(step, f, recipients);
    setErr(e);
    if (!Object.keys(e).length) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0 });
    }
  };
  const goStep = (n: number) => {
    // Only allow jumping ahead once earlier steps are valid
    for (let s = 1; s < n; s++) {
      const e = validate(s, f, recipients);
      if (Object.keys(e).length) {
        setErr(e);
        setStep(s);
        return;
      }
    }
    setStep(n);
  };
  const send = () => {
    for (let s = 1; s <= 3; s++) {
      const e = validate(s, f, recipients);
      if (Object.keys(e).length) {
        setErr(e);
        setStep(s);
        return;
      }
    }
    publish.mutate();
  };
  const saveDraft = () => {
    if (!f.title.trim()) {
      setErr({ title: "Add a title before saving a draft." });
      setStep(1);
      return;
    }
    save.mutate();
  };

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded: NoticeAttachment[] = [];
      for (const file of Array.from(files)) {
        uploaded.push(await uploadNoticeAttachment(file));
      }
      setF((cur) => ({
        ...cur,
        attachments: [...cur.attachments, ...uploaded],
      }));
      toast({
        title: `${uploaded.length} ${uploaded.length === 1 ? "file" : "files"} attached`,
      });
    } catch (e) {
      toast({ title: errMessage(e, "Upload failed"), variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const applyTemplate = (id: string) => {
    const t = meta.templates.find((x) => x.id === id);
    if (!t) return;
    setF((cur) => ({
      ...cur,
      category: t.category,
      priority: t.priority,
      body: t.body,
      requireAck: t.requireAck,
      ackMethod: t.ackMethod,
      templateId: t.id,
      audience:
        t.audienceHint === "individuals"
          ? { type: "individuals", values: [] }
          : cur.audience,
    }));
  };

  const heading = f.id
    ? "Edit notice"
    : f.revisionOf
      ? `Revise ${f.revisionOf}`
      : "New notice";

  // ── Steps ──
  const step1 = (
    <>
      <div className="mb-4 flex items-center gap-3">
        <h3 className="flex-1 text-base font-semibold">Content</h3>
        <Select value="" onValueChange={applyTemplate}>
          <SelectTrigger
            className="w-[230px]"
            aria-label="Start from a template"
          >
            <SelectValue placeholder="Start from a template..." />
          </SelectTrigger>
          <SelectContent>
            {meta.templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-4">
        <div>
          <Label htmlFor="n-title">Title</Label>
          <Input
            id="n-title"
            maxLength={120}
            value={f.title}
            className={err.title ? "border-destructive" : ""}
            onChange={(e) => set("title", e.target.value)}
            placeholder="For example: Updated Leave Policy effective 1 January 2027"
          />
          <ErrText msg={err.title} />
        </div>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <Label>Category</Label>
            <Select
              value={f.category}
              onValueChange={(v) => set("category", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meta.categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">Priority</Label>
            <div className="inline-flex rounded-lg bg-muted p-0.5">
              {(["normal", "important", "critical"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => set("priority", p)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium capitalize ${f.priority === p ? "bg-card shadow-sm" : "text-muted-foreground"}`}
                >
                  {p === "critical" && <Siren className="h-3.5 w-3.5" />}
                  {p === "important" && <Flag className="h-3.5 w-3.5" />}
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <Label htmlFor="n-sum">
            Summary{" "}
            <span className="font-normal text-muted-foreground">
              Shown in the portal inbox and in the email alert
            </span>
          </Label>
          <Input
            id="n-sum"
            maxLength={160}
            value={f.summary}
            onChange={(e) => set("summary", e.target.value)}
            placeholder="One sentence that tells staff what this is and what to do"
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <Label>Message</Label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              title="Insert the employee's first name"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const el = document.activeElement as HTMLElement | null;
                if (el?.isContentEditable) {
                  document.execCommand("insertText", false, "{{first_name}}");
                } else {
                  set("body", `${f.body}<p>{{first_name}}</p>`);
                }
              }}
            >
              <Braces className="mr-1.5 h-3.5 w-3.5" />
              Insert first name
            </Button>
          </div>
          <div className={err.body ? "rounded-md ring-1 ring-destructive" : ""}>
            <RichTextEditor
              value={f.body}
              onChange={(h) => set("body", h)}
              minHeight={220}
              placeholder="Write your notice here. Use lists for key changes and say clearly what staff must do."
            />
          </div>
          <ErrText msg={err.body} />
        </div>
        <div>
          <Label>
            Attachments{" "}
            <span className="font-normal text-muted-foreground">
              Policies, forms or guidance notes
            </span>
          </Label>
          <label
            htmlFor="n-files"
            className="flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border-2 border-dashed p-5 text-center text-sm text-muted-foreground hover:bg-muted/40"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addFiles(e.dataTransfer.files);
            }}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
            <span>
              <b className="text-foreground">Choose files</b> or drop them here
            </span>
            <small>PDF, Word, Excel or image files, up to 10 MB each</small>
          </label>
          <input
            id="n-files"
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.txt"
            onChange={(e) => addFiles(e.target.files)}
          />
          {f.attachments.map((a, i) => (
            <AttachmentRow
              key={`${a.name}-${i}`}
              file={a}
              onRemove={() =>
                set(
                  "attachments",
                  f.attachments.filter((_, j) => j !== i),
                )
              }
            />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <b className="text-sm">Pin to top of inbox</b>
              <p className="text-xs text-muted-foreground">
                Keeps the notice above newer items
              </p>
            </div>
            <Switch
              checked={f.pinned}
              onCheckedChange={(v) => set("pinned", v)}
            />
          </div>
          <div>
            <Label htmlFor="n-exp">
              Expiry date{" "}
              <span className="font-normal text-muted-foreground">
                Optional
              </span>
            </Label>
            <Input
              id="n-exp"
              type="date"
              value={f.expiresAt}
              onChange={(e) => set("expiresAt", e.target.value)}
            />
          </div>
        </div>
      </div>
    </>
  );

  const step2 = (
    <AudienceStep
      f={f}
      meta={meta}
      set={set}
      err={err.aud}
      recipients={recipients}
      people={aud?.people ?? []}
      departments={aud?.departments ?? 0}
      locations={aud?.locations ?? 0}
      onView={() => setViewAud(true)}
      onGoGroups={onGoGroups}
    />
  );

  const step3 = (
    <>
      <h3 className="mb-4 text-base font-semibold">
        Delivery and acknowledgement
      </h3>
      <Label className="mb-1 block">
        Channels{" "}
        <span className="font-normal text-muted-foreground">
          Every notice is published to the employee portal
        </span>
      </Label>
      <ToggleRow
        icon={Megaphone}
        title="Employee portal"
        sub="Published to the Notices page of the employee portal, where staff read, review and acknowledge it"
        checked
        disabled
      />
      <ToggleRow
        icon={Mail}
        title="Email"
        sub="Alert to work email with a link to the notice in the portal. Acknowledgement is completed in the portal"
        checked={f.email}
        onChange={(v) => set("email", v)}
      />
      <div className="mt-4 border-t pt-4">
        <ToggleRow
          icon={BadgeCheck}
          title="Require acknowledgement"
          sub="Staff must read, review and acknowledge it in their employee portal"
          checked={f.requireAck}
          onChange={(v) => set("requireAck", v)}
          tint="bg-amber-500/10 text-amber-700"
        />
      </div>
      {f.requireAck && (
        <div className="space-y-4 pt-3">
          <div className="grid gap-2">
            {(Object.keys(NOTICE_ACK_METHODS) as NoticeAckMethod[]).map((k) => {
              const I =
                k === "click"
                  ? MousePointerClick
                  : k === "signature"
                    ? PenLine
                    : ListChecks;
              const on = f.ackMethod === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => set("ackMethod", k)}
                  className={`flex gap-2.5 rounded-lg border p-3 text-left ${on ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50"}`}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-muted">
                    <I className="h-4 w-4" />
                  </span>
                  <span>
                    <b className="block text-[13px]">
                      {NOTICE_ACK_METHODS[k].label}
                    </b>
                    <small className="text-xs text-muted-foreground">
                      {NOTICE_ACK_METHODS[k].hint}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
          {f.ackMethod === "quiz" && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <Label>Question</Label>
              <Input
                value={f.quiz.q}
                className={err.quiz ? "border-destructive" : ""}
                onChange={(e) => set("quiz", { ...f.quiz, q: e.target.value })}
                placeholder="For example: Who must you notify of a suspected data breach?"
              />
              <Label className="mt-3 block">
                Answers{" "}
                <span className="font-normal text-muted-foreground">
                  Select the correct one
                </span>
              </Label>
              {f.quiz.options.map((o, i) => (
                <div key={i} className="mt-2 flex items-center gap-2">
                  <input
                    type="radio"
                    name="quiz-answer"
                    checked={f.quiz.answer === i}
                    onChange={() => set("quiz", { ...f.quiz, answer: i })}
                    aria-label={`Correct answer ${i + 1}`}
                  />
                  <Input
                    value={o}
                    placeholder={`Answer ${i + 1}`}
                    onChange={(e) =>
                      set("quiz", {
                        ...f.quiz,
                        options: f.quiz.options.map((x, j) =>
                          j === i ? e.target.value : x,
                        ),
                      })
                    }
                  />
                </div>
              ))}
              <ErrText msg={err.quiz} />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="n-dl">Deadline</Label>
              <Input
                id="n-dl"
                type="date"
                value={f.deadline}
                className={err.dl ? "border-destructive" : ""}
                onChange={(e) => set("deadline", e.target.value)}
              />
              <ErrText msg={err.dl} />
            </div>
            <div>
              <Label>Reminders</Label>
              <Select
                value={f.reminders}
                onValueChange={(v) => set("reminders", v as NoticeReminders)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(NOTICE_REMINDER_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="block">Escalate after (days)</Label>
              <div className="flex items-center gap-3">
                <Switch
                  checked={f.escalate}
                  onCheckedChange={(v) => set("escalate", v)}
                />
                <Input
                  type="number"
                  min={1}
                  max={30}
                  className="w-24"
                  disabled={!f.escalate}
                  value={f.escalateAfter}
                  onChange={(e) => set("escalateAfter", Number(e.target.value))}
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {f.escalate
              ? `Line managers are notified when a member of their team is ${f.escalateAfter} days overdue.`
              : "Overdue staff will not be escalated to their line managers."}{" "}
            Reminders respect quiet hours ({meta.settings.quietFrom} to{" "}
            {meta.settings.quietTo}).
          </p>
        </div>
      )}
      <div className="mt-5 border-t pt-4">
        <Label className="mb-1.5 block">When to send</Label>
        <div className="mb-3 inline-flex rounded-lg bg-muted p-0.5">
          {(["now", "schedule"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set("timing", t)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium ${f.timing === t ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            >
              {t === "now" ? (
                <Send className="h-3.5 w-3.5" />
              ) : (
                <CalendarClock className="h-3.5 w-3.5" />
              )}
              {t === "now" ? "Send now" : "Schedule"}
            </button>
          ))}
        </div>
        {f.timing === "schedule" && (
          <div>
            <Input
              type="datetime-local"
              className={`max-w-[260px] ${err.sch ? "border-destructive" : ""}`}
              value={f.scheduleAt}
              onChange={(e) => set("scheduleAt", e.target.value)}
            />
            <ErrText msg={err.sch} />
          </div>
        )}
      </div>
    </>
  );

  const checks: [boolean, string, number][] = [
    [!!f.title.trim(), "Title added", 1],
    [!!stripHtml(f.body).trim(), "Message written", 1],
    [recipients > 0, `${recipients} recipients selected`, 2],
    [true, `Delivery channels: Employee portal${f.email ? ", Email" : ""}`, 3],
    [
      !f.requireAck || !!f.deadline,
      f.requireAck
        ? `Acknowledgement by ${fmtD(f.deadline ? new Date(`${f.deadline}T17:00`).toISOString() : null)} using ${NOTICE_ACK_METHODS[f.ackMethod].label.toLowerCase()}`
        : "No acknowledgement required",
      3,
    ],
    [
      !(f.requireAck && f.ackMethod === "quiz") ||
        (!!f.quiz.q.trim() && f.quiz.options.every((o) => o.trim())),
      "Comprehension question complete",
      3,
    ],
    [
      !!f.summary.trim(),
      f.summary.trim()
        ? "Summary added"
        : "No summary. The first line of the message will be used",
      0,
    ],
  ];

  const step4 = (
    <>
      <h3 className="mb-4 text-base font-semibold">Review and send</h3>
      <div className="mb-4 divide-y rounded-lg border">
        {checks.map(([ok, label, st], i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-3.5 py-2.5 text-sm"
          >
            {ok ? (
              <CircleCheck className="h-[18px] w-[18px] text-emerald-600" />
            ) : st ? (
              <CircleAlert className="h-[18px] w-[18px] text-destructive" />
            ) : (
              <Info className="h-[18px] w-[18px] text-amber-600" />
            )}
            <span className="flex-1">{label}</span>
            {!ok && st > 0 && (
              <Button size="sm" variant="outline" onClick={() => setStep(st)}>
                Fix
              </Button>
            )}
          </div>
        ))}
      </div>
      <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
        {(
          [
            ["Category", f.category],
            ["Priority", f.priority[0].toUpperCase() + f.priority.slice(1)],
            ["Audience", audLabel],
            ["Attachments", String(f.attachments.length)],
            [
              "Reminders",
              f.requireAck ? NOTICE_REMINDER_LABEL[f.reminders] : "None",
            ],
            [
              "Sending",
              f.timing === "schedule" && f.scheduleAt
                ? fmtDT(new Date(f.scheduleAt).toISOString())
                : "Immediately",
            ],
          ] as [string, string][]
        ).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b py-1.5">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      {f.priority === "critical" && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <Siren className="h-4 w-4" />
          Critical notices bypass quiet hours and show as a banner until
          acknowledged.
        </div>
      )}
      {f.revisionOf && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-sm text-blue-700 dark:text-blue-300">
          <Info className="h-4 w-4" />
          Sending archives {f.revisionOf} and records this as a new version.{" "}
          {meta.settings.reAck ? "All recipients must acknowledge again." : ""}
        </div>
      )}
    </>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h2 className="text-xl font-bold">{heading}</h2>
          <p className="text-sm text-muted-foreground">
            Write the notice, choose who receives it, and decide whether staff
            must acknowledge it.
          </p>
        </div>
        <Button variant="outline" onClick={saveDraft} disabled={save.isPending}>
          {save.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save draft
        </Button>
        <Button variant="ghost" onClick={onClose}>
          <X className="mr-2 h-4 w-4" />
          Discard
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_340px]">
        <Card className="h-fit p-2">
          {STEPS.map(([t, s], i) => (
            <button
              key={t}
              type="button"
              onClick={() => goStep(i + 1)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${step === i + 1 ? "bg-primary/10" : "hover:bg-muted/60"}`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${step > i + 1 ? "bg-emerald-600 text-white" : step === i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {step > i + 1 ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span>
                <b className="block text-[13px]">{t}</b>
                <small className="text-xs text-muted-foreground">{s}</small>
              </span>
            </button>
          ))}
          <div className="mx-1 mt-2 border-t px-2 pb-2 pt-3">
            <small className="text-xs text-muted-foreground">Recipients</small>
            <div className="text-xl font-bold tabular-nums">{recipients}</div>
            <small className="text-xs text-muted-foreground">{audLabel}</small>
          </div>
        </Card>

        <Card>
          <div className="p-6">{[step1, step2, step3, step4][step - 1]}</div>
          <div className="flex items-center justify-between border-t px-6 py-3">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            ) : (
              <span />
            )}
            {step < 4 ? (
              <Button onClick={next}>
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setTplOpen(true)}>
                  <LayoutTemplate className="mr-2 h-4 w-4" />
                  Save as template
                </Button>
                <Button onClick={send} disabled={publish.isPending}>
                  {publish.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : f.timing === "schedule" ? (
                    <CalendarClock className="mr-2 h-4 w-4" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {f.timing === "schedule" ? "Schedule notice" : "Send notice"}
                </Button>
              </div>
            )}
          </div>
        </Card>

        <div>
          <div className="mb-2 flex items-baseline gap-2">
            <b className="text-[13.5px]">Employee preview</b>
            <span className="ml-auto text-xs text-muted-foreground">
              As it appears in the employee portal
            </span>
          </div>
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">
              <Megaphone className="h-4 w-4" />
              Notices
            </div>
            <div className="max-h-[640px] overflow-auto p-4">
              <div className="flex gap-1.5">
                <CategoryChip category={f.category} />
                <PriorityChip priority={f.priority} />
              </div>
              <div className="mt-2 text-lg font-bold leading-snug">
                {f.title || (
                  <span className="text-muted-foreground">Notice title</span>
                )}
              </div>
              <div className="mb-3 text-xs text-muted-foreground">
                {meta.settings.senderName || "People and Culture"} · Today
              </div>
              <Prose
                html={(
                  f.body ||
                  '<p class="text-muted-foreground">Your message will appear here.</p>'
                ).replace(/\{\{first_name\}\}/g, "Alex")}
                className="text-[13px]"
              />
              {f.attachments.map((a, i) => (
                <div
                  key={i}
                  className="mt-2 truncate rounded border px-2 py-1.5 text-xs text-muted-foreground"
                >
                  {a.name}
                </div>
              ))}
              {f.requireAck && (
                <div className="mt-3 rounded-lg border border-amber-300/60 bg-amber-500/5 p-3 text-xs">
                  <b className="flex items-center gap-1">
                    <BadgeCheck className="h-3.5 w-3.5 text-amber-600" />
                    Acknowledgement required by{" "}
                    {fmtD(
                      f.deadline
                        ? new Date(`${f.deadline}T17:00`).toISOString()
                        : null,
                    )}
                  </b>
                  <div className="mt-1 text-muted-foreground">
                    {f.ackMethod === "signature"
                      ? "Type your full name to sign"
                      : f.ackMethod === "quiz"
                        ? f.quiz.q || "Answer a short question"
                        : "Tick to confirm you have read and reviewed it, and acknowledge it"}
                  </div>
                </div>
              )}
              <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">
                {meta.settings.footer}
              </p>
            </div>
          </Card>
        </div>
      </div>

      <PeopleDialog
        open={viewAud}
        onOpenChange={setViewAud}
        title="Audience"
        people={aud?.people ?? []}
        total={aud?.count}
      />
      <SaveTemplateDialog
        open={tplOpen}
        onOpenChange={setTplOpen}
        form={f}
        defaultName={f.title}
      />
    </div>
  );
}

// ── Pieces ───────────────────────────────────────────────────
function ToggleRow({
  icon: I,
  title,
  sub,
  checked,
  onChange,
  disabled,
  tint = "bg-muted",
}: {
  icon: LucideIcon;
  title: string;
  sub: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
  tint?: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b py-3 last:border-0">
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tint}`}
      >
        <I className="h-[18px] w-[18px]" />
      </span>
      <div className="flex-1">
        <b className="text-sm">{title}</b>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </div>
  );
}

const AUDIENCE_OPTIONS: [NoticeAudienceType, string, string, LucideIcon][] = [
  ["all", "Everyone", "All employees", Users],
  ["departments", "Departments", "Choose one or more teams", Building2],
  ["locations", "Locations", "Offices and remote staff", MapPin],
  [
    "types",
    "Employment type",
    "Permanent, fixed-term and more",
    BriefcaseBusiness,
  ],
  ["individuals", "Specific people", "Pick named employees", UserCheck],
  ["group", "Saved group", "Reuse an audience group", UsersRound],
];

function AudienceStep({
  f,
  meta,
  set,
  err,
  recipients,
  people,
  departments,
  locations,
  onView,
  onGoGroups,
}: {
  f: ComposeForm;
  meta: NoticeMeta;
  set: <K extends keyof ComposeForm>(k: K, v: ComposeForm[K]) => void;
  err?: string;
  recipients: number;
  people: { id: string; name: string }[];
  departments: number;
  locations: number;
  onView: () => void;
  onGoGroups: () => void;
}) {
  const a = f.audience;
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDq(q), 250);
    return () => clearTimeout(t);
  }, [q]);
  const { data: found = [] } = useQuery({
    queryKey: [NOTICE_KEY, "emp-search", dq],
    queryFn: () => searchNoticeEmployees(dq),
    enabled: a.type === "individuals",
  });
  const setAud = (type: NoticeAudienceType, values: string[] = []) =>
    set("audience", { type, values });
  const toggle = (v: string) =>
    setAud(
      a.type,
      a.values.includes(v) ? a.values.filter((x) => x !== v) : [...a.values, v],
    );

  const pickers: Record<string, { value: string; label: string; n: number }[]> =
    {
      departments: meta.departments.map((d) => ({
        value: d.id,
        label: d.name,
        n: d.count,
      })),
      locations: meta.locations.map((d) => ({
        value: d.id,
        label: d.name,
        n: d.count,
      })),
      types: meta.employmentTypes.map((d) => ({
        value: d.value,
        label: d.label,
        n: d.count,
      })),
    };

  return (
    <>
      <h3 className="mb-4 text-base font-semibold">Audience</h3>
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {AUDIENCE_OPTIONS.map(([k, l, s, I]) => (
          <button
            key={k}
            type="button"
            onClick={() => setAud(k)}
            className={`flex gap-2.5 rounded-lg border p-3 text-left ${a.type === k ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50"}`}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-muted">
              <I className="h-4 w-4" />
            </span>
            <span>
              <b className="block text-[13px]">{l}</b>
              <small className="text-xs text-muted-foreground">
                {k === "all" ? `All ${meta.employeeCount} employees` : s}
              </small>
            </span>
          </button>
        ))}
      </div>

      {pickers[a.type] && (
        <div className="mb-4 flex flex-wrap gap-2">
          {pickers[a.type].map((o) => {
            const on = a.values.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] ${on ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted/60"}`}
              >
                {on && <Check className="h-3.5 w-3.5" />}
                {o.label}
                <span className="rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">
                  {o.n}
                </span>
              </button>
            );
          })}
          {!pickers[a.type].length && (
            <p className="text-sm text-muted-foreground">Nothing set up yet.</p>
          )}
        </div>
      )}

      {a.type === "group" && (
        <div className="mb-4 flex flex-wrap gap-2">
          {meta.groups.map((g) => {
            const on = a.values[0] === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setAud("group", [g.id])}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] ${on ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted/60"}`}
              >
                {on && <Check className="h-3.5 w-3.5" />}
                {g.name}
                <span className="rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">
                  {g.memberCount}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={onGoGroups}
            className="flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1.5 text-[13px] text-muted-foreground hover:bg-muted/60"
          >
            <Plus className="h-3.5 w-3.5" />
            Manage groups
          </button>
        </div>
      )}

      {a.type === "individuals" && (
        <div className="mb-4">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, role or email"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search employees"
            />
          </div>
          <div className="max-h-[300px] overflow-auto rounded-lg border">
            {found.map((e) => (
              <label
                key={e.id}
                className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 last:border-0 hover:bg-muted/40"
              >
                <Checkbox
                  checked={a.values.includes(e.id)}
                  onCheckedChange={() => toggle(e.id)}
                />
                <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {e.name
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">
                    {e.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {e.role}
                    {e.dept ? `, ${e.dept}` : ""}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {e.location}
                </span>
              </label>
            ))}
            {!found.length && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No employees found.
              </p>
            )}
          </div>
        </div>
      )}

      <ErrText msg={err} />
      <Card className="mt-4 flex items-center gap-4 bg-muted/30 p-4 shadow-none">
        <div className="flex">
          {people.slice(0, 7).map((p, i) => (
            <span
              key={p.id}
              className="-ml-2 grid h-7 w-7 place-items-center rounded-full border-2 border-background bg-primary/10 text-[10px] font-bold text-primary first:ml-0"
              style={{ zIndex: 10 - i }}
            >
              {p.name
                .split(" ")
                .map((x) => x[0])
                .slice(0, 2)
                .join("")}
            </span>
          ))}
        </div>
        <div className="flex-1">
          <b className="tabular-nums">{recipients} recipients</b>
          <div className="text-xs text-muted-foreground">
            {departments} departments, {locations} locations
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={!recipients}
          onClick={onView}
        >
          <List className="mr-1.5 h-3.5 w-3.5" />
          View list
        </Button>
      </Card>
    </>
  );
}

function SaveTemplateDialog({
  open,
  onOpenChange,
  form,
  defaultName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  form: ComposeForm;
  defaultName: string;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  useEffect(() => {
    if (open) {
      setName(defaultName);
      setDesc("");
    }
  }, [open, defaultName]);
  const save = useMutation({
    mutationFn: () =>
      createNoticeTemplate({
        name: name.trim(),
        category: form.category,
        priority: form.priority,
        description: desc.trim() || undefined,
        requireAck: form.requireAck,
        ackMethod: form.ackMethod,
        body: form.body,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [NOTICE_KEY] });
      toast({ title: "Template saved" });
      onOpenChange(false);
    },
    onError: (e) => toast({ title: errMessage(e), variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as template</DialogTitle>
          <DialogDescription>
            Keeps this wording, category, priority and acknowledgement method
            for the next time you need it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Template name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="When should staff use this template?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || save.isPending}
            onClick={() => save.mutate()}
          >
            Save template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
