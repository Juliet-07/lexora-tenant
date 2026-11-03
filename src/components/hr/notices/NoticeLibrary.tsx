import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Eye,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RichTextEditor } from "@/components/RichTextEditor";
import { toast } from "@/hooks/use-toast";
import {
  NOTICE_ACK_METHODS,
  NOTICE_REMINDER_LABEL,
  createNoticeGroup,
  createNoticeTemplate,
  deleteNoticeGroup,
  deleteNoticeTemplate,
  errMessage,
  fetchNoticeGroupMembers,
  fetchNoticeMeta,
  updateNoticeSettings,
  type NoticeAckMethod,
  type NoticeAudienceType,
  type NoticeGroup,
  type NoticeMeta,
  type NoticePriority,
  type NoticeReminders,
  type NoticeSettings,
  type NoticeTemplate,
} from "@/lib/hr/hr-notices-api";
import { NOTICE_KEY, useConfirm } from "./noticeActions";
import { PeopleDialog } from "./NoticeShared";
import {
  CategoryChip,
  CategoryIcon,
  Chip,
  PriorityChip,
  Prose,
} from "./noticeUi";

const useMeta = () =>
  useQuery({ queryKey: [NOTICE_KEY, "meta"], queryFn: fetchNoticeMeta });

// ═══════════════ Templates ═══════════════
export function NoticeTemplates({
  onUse,
}: {
  onUse: (t: NoticeTemplate) => void;
}) {
  const qc = useQueryClient();
  const { data: meta, isLoading } = useMeta();
  const [preview, setPreview] = useState<NoticeTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmNode, confirm] = useConfirm();
  const del = useMutation({
    mutationFn: deleteNoticeTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [NOTICE_KEY] });
      toast({ title: "Template deleted" });
    },
    onError: (e) => toast({ title: errMessage(e), variant: "destructive" }),
  });
  if (isLoading || !meta)
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Loading…
      </p>
    );
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="flex-1 text-sm text-muted-foreground">
          Start new notices from approved wording so that recurring
          communications stay consistent.
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New template
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {meta.templates.map((t) => (
          <Card key={t.id} className="flex flex-col">
            <div className="flex-1 p-5">
              <div className="mb-3 flex items-center gap-3">
                <CategoryIcon category={t.category} size={40} />
                <div className="min-w-0 flex-1">
                  <b className="block truncate">{t.name}</b>
                  <div className="text-xs text-muted-foreground">
                    {t.category}
                  </div>
                </div>
                {t.custom && <Chip tone="purple">Custom</Chip>}
              </div>
              <p className="text-[13px] text-muted-foreground">
                {t.description}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {t.requireAck ? (
                  <Chip tone="gold">
                    {NOTICE_ACK_METHODS[t.ackMethod].label}
                  </Chip>
                ) : (
                  <Chip>No acknowledgement</Chip>
                )}
                <PriorityChip priority={t.priority} />
                <span className="ml-auto text-xs text-muted-foreground">
                  Used {t.uses} {t.uses === 1 ? "time" : "times"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 border-t px-3 py-2.5">
              <Button size="sm" variant="ghost" onClick={() => setPreview(t)}>
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Preview
              </Button>
              {t.custom && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    confirm({
                      title: "Delete this template?",
                      text: `"${t.name}" will no longer be available. Notices already sent from it are not affected.`,
                      label: "Delete",
                      danger: true,
                      run: () => del.mutate(t.id),
                    })
                  }
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete
                </Button>
              )}
              <Button size="sm" className="ml-auto" onClick={() => onUse(t)}>
                Use template
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{preview?.name}</DialogTitle>
            <DialogDescription>{preview?.description}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-auto rounded-lg border p-4">
            <div className="mb-2 flex gap-1.5">
              {preview && <CategoryChip category={preview.category} />}
              {preview && <PriorityChip priority={preview.priority} />}
            </div>
            {preview?.body ? (
              <Prose html={preview.body} />
            ) : (
              <p className="text-sm text-muted-foreground">
                A blank page for any other communication.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                const t = preview!;
                setPreview(null);
                onUse(t);
              }}
            >
              Use template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NewTemplateDialog
        open={creating}
        onOpenChange={setCreating}
        categories={meta.categories}
      />
      {confirmNode}
    </div>
  );
}

function NewTemplateDialog({
  open,
  onOpenChange,
  categories,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  categories: string[];
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [priority, setPriority] = useState<NoticePriority>("normal");
  const [requireAck, setRequireAck] = useState(false);
  const [ackMethod, setAckMethod] = useState<NoticeAckMethod>("click");
  const [body, setBody] = useState("");
  const save = useMutation({
    mutationFn: () =>
      createNoticeTemplate({
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        priority,
        requireAck,
        ackMethod,
        body,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [NOTICE_KEY] });
      toast({ title: "Template created" });
      onOpenChange(false);
      setName("");
      setDescription("");
      setBody("");
    },
    onError: (e) => toast({ title: errMessage(e), variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New template</DialogTitle>
          <DialogDescription>
            Write the wording once and reuse it. Use {"{{first_name}}"} to greet
            each employee by name.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] space-y-3 overflow-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="When should staff use this template?"
            />
          </div>
          <div className="grid items-end gap-3 sm:grid-cols-3">
            <div>
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as NoticePriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch checked={requireAck} onCheckedChange={setRequireAck} />
              <span className="text-sm">Require acknowledgement</span>
            </div>
            {requireAck && (
              <div>
                <Label>Method</Label>
                <Select
                  value={ackMethod}
                  onValueChange={(v) => setAckMethod(v as NoticeAckMethod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(NOTICE_ACK_METHODS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div>
            <Label>Wording</Label>
            <RichTextEditor value={body} onChange={setBody} minHeight={200} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || !body.trim() || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════ Groups ═══════════════
export function NoticeGroups({
  onMessage,
}: {
  onMessage: (g: NoticeGroup) => void;
}) {
  const qc = useQueryClient();
  const { data: meta, isLoading } = useMeta();
  const [creating, setCreating] = useState(false);
  const [members, setMembers] = useState<string | null>(null);
  const [confirmNode, confirm] = useConfirm();
  const { data: m } = useQuery({
    queryKey: [NOTICE_KEY, "group-members", members],
    queryFn: () => fetchNoticeGroupMembers(members!),
    enabled: !!members,
  });
  const del = useMutation({
    mutationFn: deleteNoticeGroup,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [NOTICE_KEY] });
      toast({ title: "Group deleted" });
    },
    onError: (e) => toast({ title: errMessage(e), variant: "destructive" }),
  });
  if (isLoading || !meta)
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Loading…
      </p>
    );
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="flex-1 text-sm text-muted-foreground">
          Save the groups you message often. Membership updates automatically as
          staff join, move or leave.
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New group
        </Button>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Group</TableHead>
              <TableHead>Rule</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Used in</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {meta.groups.map((g) => (
              <TableRow key={g.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                      <UsersRound className="h-[18px] w-[18px]" />
                    </span>
                    <div>
                      <div className="font-medium">{g.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {g.description}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {g.rule}
                </TableCell>
                <TableCell className="font-semibold tabular-nums">
                  {g.memberCount}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {g.usedIn} {g.usedIn === 1 ? "notice" : "notices"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setMembers(g.id)}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    Members
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onMessage(g)}
                  >
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    Message
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete group"
                    onClick={() =>
                      confirm({
                        title: "Delete this group?",
                        text: `"${g.name}" is removed. Notices already sent to it keep their recipients.`,
                        label: "Delete",
                        danger: true,
                        run: () => del.mutate(g.id),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!meta.groups.length && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  No saved groups yet. Create one to reuse an audience.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      <NewGroupDialog open={creating} onOpenChange={setCreating} meta={meta} />
      <PeopleDialog
        open={!!members}
        onOpenChange={(o) => !o && setMembers(null)}
        title={m?.name ?? "Members"}
        people={m?.members ?? []}
      />
      {confirmNode}
    </div>
  );
}

function NewGroupDialog({
  open,
  onOpenChange,
  meta,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  meta: NoticeMeta;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<NoticeAudienceType>("departments");
  const [values, setValues] = useState<string[]>([]);
  const options: Record<string, { value: string; label: string; n: number }[]> =
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
  const ready = !!name.trim() && (type === "newjoiners" || values.length > 0);
  const save = useMutation({
    mutationFn: () =>
      createNoticeGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        audience: { type, values: type === "newjoiners" ? [] : values },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [NOTICE_KEY] });
      toast({ title: "Group created" });
      onOpenChange(false);
      setName("");
      setDescription("");
      setValues([]);
    },
    onError: (e) => toast({ title: errMessage(e), variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New audience group</DialogTitle>
          <DialogDescription>
            A group is a rule, so its members stay current as people join, move
            or leave.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="For example: Kigali office"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <Label>Rule</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as NoticeAudienceType);
                setValues([]);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="departments">Department is</SelectItem>
                <SelectItem value="locations">Location is</SelectItem>
                <SelectItem value="types">Employment type is</SelectItem>
                <SelectItem value="newjoiners">
                  Joined in the last 90 days
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {options[type] && (
            <div className="flex flex-wrap gap-2">
              {options[type].map((o) => {
                const on = values.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() =>
                      setValues(
                        on
                          ? values.filter((x) => x !== o.value)
                          : [...values, o.value],
                      )
                    }
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
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!ready || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════ Settings ═══════════════
export function NoticeSettingsPanel() {
  const qc = useQueryClient();
  const { data: meta, isLoading } = useMeta();
  const [draft, setDraft] = useState<NoticeSettings | null>(null);
  const st = draft ?? meta?.settings;
  const save = useMutation({
    mutationFn: () => updateNoticeSettings(draft!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [NOTICE_KEY] });
      setDraft(null);
      toast({ title: "Settings saved" });
    },
    onError: (e) => toast({ title: errMessage(e), variant: "destructive" }),
  });
  if (isLoading || !st)
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Loading…
      </p>
    );
  const set = <K extends keyof NoticeSettings>(k: K, v: NoticeSettings[K]) =>
    setDraft({ ...st, [k]: v });
  const Row = ({
    title,
    sub,
    k,
  }: {
    title: string;
    sub: string;
    k: "reAck" | "questions" | "readReceipts";
  }) => (
    <div className="flex items-center gap-3 border-b py-3 last:border-0">
      <div className="flex-1">
        <b className="text-sm">{title}</b>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <Switch checked={st[k]} onCheckedChange={(v) => set(k, v)} />
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="flex-1 text-sm text-muted-foreground">
          Defaults applied to every new notice. You can change them on each
          notice before it is sent.
        </p>
        <Button
          disabled={!draft || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save settings
        </Button>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold">
            <Send className="h-4 w-4" />
            Sending
          </h3>
          <div className="space-y-4">
            <div>
              <Label>Sender name</Label>
              <Input
                value={st.senderName}
                onChange={(e) => set("senderName", e.target.value)}
                placeholder="For example: People and Culture"
              />
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex-1">
                <b className="text-sm">Send email alerts by default</b>
                <p className="text-xs text-muted-foreground">
                  Every notice is always published to the employee portal.
                </p>
              </div>
              <Switch
                checked={st.emailChannel}
                onCheckedChange={(v) => set("emailChannel", v)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quiet hours from</Label>
                <Input
                  type="time"
                  value={st.quietFrom}
                  onChange={(e) => set("quietFrom", e.target.value)}
                />
              </div>
              <div>
                <Label>Until</Label>
                <Input
                  type="time"
                  value={st.quietTo}
                  onChange={(e) => set("quietTo", e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Email reminders are held during quiet hours. Critical notices are
              sent immediately.
            </p>
            <div>
              <Label>Footer text</Label>
              <Textarea
                rows={2}
                value={st.footer}
                onChange={(e) => set("footer", e.target.value)}
              />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold">
            <Check className="h-4 w-4 text-amber-600" />
            Acknowledgements and records
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Default reminders</Label>
              <Select
                value={st.reminders}
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
              <Label>Escalate after (days overdue)</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={st.escalateAfter}
                onChange={(e) => set("escalateAfter", Number(e.target.value))}
              />
            </div>
          </div>
          <div className="mt-2">
            <Row
              k="reAck"
              title="Require re-acknowledgement on revision"
              sub="When a notice is revised and reissued, every recipient must acknowledge the new version"
            />
            <Row
              k="questions"
              title="Allow employees to ask questions"
              sub='Adds an "Ask a question" option to every notice'
            />
            <Row
              k="readReceipts"
              title="Record read receipts"
              sub="Logs the time each employee first opens a notice"
            />
          </div>
          <div className="mt-3">
            <Label>Keep acknowledgement records for</Label>
            <Select
              value={String(st.retention)}
              onValueChange={(v) => set("retention", Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 7, 10].map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y} years
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Records include the notice version, timestamp, method, signature
              and device for each acknowledgement.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
