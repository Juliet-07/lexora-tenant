import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { fetchEmployees } from "@/lib/hr/hr-api";
import { BCP_INCIDENT_TYPES } from "@/lib/grc/risk-api";
import {
  COMMS_KEY,
  addCommsContact,
  createCommsGroup,
  createCommsTemplate,
  errMessage,
  fetchCommsTemplates,
  logCommsReceipt,
  resendFailedComms,
  updateCommsGroup,
  updateCommsTemplate,
  type CommsGroup,
  type CommsMessage,
  type CommsTemplate,
  type GroupInput,
} from "@/lib/grc/bcp-comms-api";
import {
  Chip,
  GROUP_COLORS,
  GROUP_ICONS,
  GroupIcon,
  LEVELS,
  fmtDT,
  toLocalInput,
} from "./commsUi";

const FLAGS: [string, string][] = [
  ["clientImpact", "Clients are affected"],
  ["mediaInterest", "Media or public interest"],
];

export function useEmployees(enabled = true) {
  const { data } = useQuery({
    queryKey: ["employees-for-bcp-comms"],
    queryFn: () => fetchEmployees({ limit: 500 }),
    enabled,
    staleTime: 60_000,
  });
  return data?.items ?? [];
}

// ── Stakeholder group ────────────────────────────────────────
export function GroupDialog({
  open,
  group,
  onClose,
}: {
  open: boolean;
  group: CommsGroup | null; // null = new
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const employees = useEmployees(open);
  const [f, setF] = useState<GroupInput>(blank());
  const [sla, setSla] = useState("24");

  function blank(): GroupInput {
    return {
      name: "",
      icon: "handshake",
      color: GROUP_COLORS[0],
      channel: "Email",
      statutory: "",
      slaHours: 24,
      reactive: false,
      ownerEmployeeId: "",
      trigger: { minLevel: 3, types: [], flags: [] },
      approvalMinLevel: 1,
      source: "contacts",
    };
  }
  useEffect(() => {
    if (!open) return;
    if (group) {
      setF({
        name: group.name,
        icon: group.icon,
        color: group.color,
        channel: group.channel,
        statutory: group.statutory,
        slaHours: group.slaHours,
        reactive: group.reactive,
        ownerEmployeeId: group.ownerEmployeeId ?? "",
        trigger: { ...group.trigger },
        approvalMinLevel: group.approvalMinLevel,
        source: group.source,
      });
      setSla(String(group.slaHours ?? 24));
    } else {
      setF(blank());
      setSla("24");
    }
  }, [open, group]);

  const set = <K extends keyof GroupInput>(k: K, v: GroupInput[K]) =>
    setF((p) => ({ ...p, [k]: v }));
  const toggleIn = (key: "types" | "flags", v: string, on: boolean) =>
    setF((p) => ({
      ...p,
      trigger: {
        ...p.trigger,
        [key]: on
          ? [...p.trigger[key], v]
          : p.trigger[key].filter((x) => x !== v),
      },
    }));

  const save = useMutation({
    mutationFn: () => {
      const dto: GroupInput = {
        ...f,
        name: f.name.trim(),
        slaHours: f.reactive ? null : Number(sla),
      };
      return group ? updateCommsGroup(group._id, dto) : createCommsGroup(dto);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [COMMS_KEY] });
      toast({
        title: group ? "Stakeholder group updated" : "Stakeholder group added",
      });
      onClose();
    },
    onError: (e) => toast({ title: errMessage(e), variant: "destructive" }),
  });

  const valid =
    f.name.trim() &&
    (f.reactive || (Number(sla) > 0 && Number.isFinite(Number(sla))));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            {group ? "Edit stakeholder group" : "Add stakeholder group"}
          </DialogTitle>
          <DialogDescription>
            Who must hear from you during an incident, how quickly, and which
            incidents bring them into the plan.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Name</Label>
            <Input
              autoFocus
              value={f.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Key suppliers"
            />
          </div>
          <div>
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(GROUP_ICONS).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-label={k}
                  onClick={() => set("icon", k)}
                  className={`rounded-lg border p-1 ${f.icon === k ? "border-primary ring-2 ring-primary/30" : "border-transparent"}`}
                >
                  <GroupIcon icon={k} color={f.color} size={30} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Colour</Label>
            <div className="flex flex-wrap gap-2">
              {GROUP_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => set("color", c)}
                  className={`h-7 w-7 rounded-full border-2 ${f.color === c ? "border-foreground" : "border-transparent"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>Channel</Label>
            <Input
              value={f.channel}
              onChange={(e) => set("channel", e.target.value)}
              placeholder="Email, formal letter, call..."
            />
          </div>
          <div>
            <Label>Owner</Label>
            <Select
              value={f.ownerEmployeeId || "none"}
              onValueChange={(v) =>
                set("ownerEmployeeId", v === "none" ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not assigned</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e._id} value={e._id}>
                    {e.firstName} {e.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Deadline</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                className="w-24"
                disabled={f.reactive}
                value={f.reactive ? "" : sla}
                onChange={(e) => setSla(e.target.value)}
              />
              <span className="text-sm text-muted-foreground">
                hours after declaration
              </span>
            </div>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <Checkbox
                checked={f.reactive}
                onCheckedChange={(v) => set("reactive", !!v)}
              />
              Reactive only (no deadline, prepared statement)
            </label>
          </div>
          <div>
            <Label>Must be approved from</Label>
            <Select
              value={String(f.approvalMinLevel)}
              onValueChange={(v) => set("approvalMinLevel", Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Every incident</SelectItem>
                <SelectItem value="2">Level 2 and above</SelectItem>
                <SelectItem value="3">Level 3 and above</SelectItem>
                <SelectItem value="4">Level 4 only</SelectItem>
                <SelectItem value="0">Never needs approval</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Statutory note</Label>
            <Input
              value={f.statutory}
              onChange={(e) => set("statutory", e.target.value)}
              placeholder="Optional, e.g. Statutory limit is 72 hours"
            />
          </div>
          <div>
            <Label>Recipients come from</Label>
            <Select
              value={f.source}
              onValueChange={(v) => set("source", v as GroupInput["source"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contacts">Contacts I add here</SelectItem>
                <SelectItem value="crm_clients">Clients in CRM</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Bring into the plan from</Label>
            <Select
              value={f.trigger.minLevel ? String(f.trigger.minLevel) : "none"}
              onValueChange={(v) =>
                setF((p) => ({
                  ...p,
                  trigger: {
                    ...p.trigger,
                    minLevel: v === "none" ? null : Number(v),
                  },
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No level trigger</SelectItem>
                {[1, 2, 3, 4].map((l) => (
                  <SelectItem key={l} value={String(l)}>
                    Level {l} and above ({LEVELS[l].label})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Or when the incident type is</Label>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {BCP_INCIDENT_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={f.trigger.types.includes(t)}
                    onCheckedChange={(v) => toggleIn("types", t, !!v)}
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label>Or when Incident Response flags</Label>
            <div className="flex flex-wrap gap-x-6 gap-y-1.5">
              {FLAGS.map(([k, l]) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={f.trigger.flags.includes(k)}
                    onCheckedChange={(v) => toggleIn("flags", k, !!v)}
                  />
                  {l}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!valid || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending && (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            )}
            {group ? "Save changes" : "Add group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Contact ──────────────────────────────────────────────────
export function ContactDialog({
  group,
  onClose,
}: {
  group: CommsGroup | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", role: "", email: "", phone: "" });
  useEffect(() => {
    if (group) setF({ name: "", role: "", email: "", phone: "" });
  }, [group]);
  const save = useMutation({
    mutationFn: () =>
      addCommsContact(group!._id, {
        name: f.name.trim(),
        role: f.role.trim(),
        email: f.email.trim(),
        phone: f.phone.trim(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [COMMS_KEY] });
      toast({ title: "Contact added" });
      onClose();
    },
    onError: (e) => toast({ title: errMessage(e), variant: "destructive" }),
  });
  const ch = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));
  return (
    <Dialog open={!!group} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add contact</DialogTitle>
          <DialogDescription>{group?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input autoFocus value={f.name} onChange={ch("name")} />
          </div>
          <div>
            <Label>Role</Label>
            <Input value={f.role} onChange={ch("role")} />
          </div>
          <div>
            <Label>Email or route</Label>
            <Input
              value={f.email}
              onChange={ch("email")}
              placeholder="name@example.com, or e.g. Submitted through the portal"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              A valid email address is emailed. Anything else is a route: Lexora
              records the notice as issued but does not deliver it.
            </p>
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={f.phone} onChange={ch("phone")} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!f.name.trim() || save.isPending}
            onClick={() => save.mutate()}
          >
            Add contact
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Template ─────────────────────────────────────────────────
export function TemplateDialog({
  open,
  template,
  groups,
  onClose,
}: {
  open: boolean;
  template: CommsTemplate | null; // null = new
  groups: CommsGroup[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: [COMMS_KEY, "templates"],
    queryFn: fetchCommsTemplates,
    enabled: open,
  });
  const fields = data?.mergeFields ?? [];
  const [f, setF] = useState({
    name: "",
    groupId: "any",
    description: "",
    subject: "",
    body: "",
  });
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!open) return;
    setF({
      name: template?.name ?? "",
      groupId: template?.groupId ?? "any",
      description: template?.description ?? "",
      subject: template?.subject ?? "",
      body: template?.body ?? "",
    });
  }, [open, template]);

  const insert = (key: string) => {
    const el = bodyRef.current;
    const tag = `{{${key}}}`;
    if (!el) return setF((p) => ({ ...p, body: p.body + tag }));
    const s = el.selectionStart ?? f.body.length;
    const e = el.selectionEnd ?? s;
    const next = f.body.slice(0, s) + tag + f.body.slice(e);
    setF((p) => ({ ...p, body: next }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + tag.length, s + tag.length);
    });
  };

  const save = useMutation({
    mutationFn: () => {
      const dto = {
        name: f.name.trim(),
        groupId: f.groupId === "any" ? null : f.groupId,
        description: f.description.trim(),
        subject: f.subject.trim(),
        body: f.body,
      };
      return template
        ? updateCommsTemplate(template._id, dto)
        : createCommsTemplate(dto);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [COMMS_KEY] });
      toast({ title: template ? "Template saved" : "Template added" });
      onClose();
    },
    onError: (e) => toast({ title: errMessage(e), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>
            {template ? "Edit template" : "New template"}
          </DialogTitle>
          <DialogDescription>
            Merge fields such as {"{{incident_ref}}"} are filled in from the
            incident when a notice is written.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input
              autoFocus
              value={f.name}
              onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <Label>For</Label>
            <Select
              value={f.groupId}
              onValueChange={(v) => setF((p) => ({ ...p, groupId: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any stakeholder</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g._id} value={g._id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Input
              value={f.description}
              onChange={(e) =>
                setF((p) => ({ ...p, description: e.target.value }))
              }
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Subject</Label>
            <Input
              value={f.subject}
              onChange={(e) => setF((p) => ({ ...p, subject: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Message</Label>
            <div className="mb-1.5 flex flex-wrap gap-1.5">
              {fields.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  title={m.label}
                  onClick={() => insert(m.key)}
                  className="rounded-md border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] hover:bg-muted"
                >
                  {`{{${m.key}}}`}
                </button>
              ))}
            </div>
            <Textarea
              ref={bodyRef}
              className="min-h-[260px] text-[13.5px]"
              value={f.body}
              onChange={(e) => setF((p) => ({ ...p, body: e.target.value }))}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Write text in [square brackets] where the author must add detail:
              a notice cannot be approved until they are completed.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={
              !f.name.trim() ||
              !f.subject.trim() ||
              !f.body.trim() ||
              save.isPending
            }
            onClick={() => save.mutate()}
          >
            {template ? "Save template" : "Add template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Receipt ──────────────────────────────────────────────────
export function ReceiptDialog({
  incidentId,
  message,
  onClose,
}: {
  incidentId: string;
  message: CommsMessage | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [at, setAt] = useState("");
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => {
    if (message) {
      setAt(toLocalInput());
      setRef("");
      setNote("");
    }
  }, [message]);
  const save = useMutation({
    mutationFn: () =>
      logCommsReceipt(incidentId, message!._id, {
        receivedAt: new Date(at).toISOString(),
        reference: ref.trim(),
        note: note.trim(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [COMMS_KEY] });
      toast({ title: "Receipt logged" });
      onClose();
    },
    onError: (e) => toast({ title: errMessage(e), variant: "destructive" }),
  });
  return (
    <Dialog open={!!message} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log receipt confirmation</DialogTitle>
          <DialogDescription>
            Record that {message?.groupName} acknowledged the notice, for
            example a regulator's reference number.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Confirmed at</Label>
            <Input
              type="datetime-local"
              value={at}
              onChange={(e) => setAt(e.target.value)}
            />
          </div>
          <div>
            <Label>Reference</Label>
            <Input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="Acknowledgement or case number"
            />
          </div>
          <div>
            <Label>Note</Label>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!at || save.isPending}
            onClick={() => save.mutate()}
          >
            Log receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── View a notice ────────────────────────────────────────────
export function MessageViewDialog({
  incidentId,
  message,
  onClose,
  onReceipt,
  canAct,
}: {
  incidentId: string;
  message: CommsMessage | null;
  onClose: () => void;
  onReceipt: (m: CommsMessage) => void;
  canAct: boolean;
}) {
  const qc = useQueryClient();
  const retry = useMutation({
    mutationFn: () => resendFailedComms(incidentId, message!._id),
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: [COMMS_KEY] });
      const left = m.recipients.filter((r) => r.delivery === "failed").length;
      toast({
        title: left
          ? `${left} still could not be emailed`
          : "All recipients delivered",
        variant: left ? "destructive" : undefined,
      });
    },
    onError: (e) => toast({ title: errMessage(e), variant: "destructive" }),
  });
  const m = message;
  const failed =
    m?.recipients.filter((r) => r.delivery === "failed").length ?? 0;
  return (
    <Dialog open={!!message} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px]">
        {m && (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6">{m.subject}</DialogTitle>
              <DialogDescription>
                {m.groupName} · {m.channel} ·{" "}
                {m.status === "sent"
                  ? `sent ${fmtDT(m.sentAt)}`
                  : m.status === "ready"
                    ? "approved, on standby"
                    : m.status === "pending"
                      ? "awaiting approval"
                      : "draft"}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>Prepared by {m.createdBy.name}</span>
              {m.approvedBy && (
                <span>
                  · Approved by {m.approvedBy.name}, {fmtDT(m.approvedAt)}
                </span>
              )}
            </div>
            <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 font-sans text-[13.5px] leading-relaxed">
              {m.body}
            </pre>
            <div>
              <div className="mb-1.5 text-sm font-semibold">
                Recipients ({m.recipients.length})
              </div>
              <div className="max-h-56 overflow-y-auto rounded-lg border">
                {m.recipients.map((r) => (
                  <div
                    key={`${r.kind}${r.refId}`}
                    className="flex items-center justify-between gap-3 border-b px-3 py-1.5 text-[13px] last:border-0"
                  >
                    <span className="min-w-0 truncate">
                      <b>{r.name}</b>{" "}
                      <span className="text-xs text-muted-foreground">
                        {r.email}
                      </span>
                    </span>
                    {r.delivery ? (
                      <Chip
                        tone={
                          r.delivery === "emailed"
                            ? "green"
                            : r.delivery === "failed"
                              ? "red"
                              : "grey"
                        }
                      >
                        {r.delivery === "emailed"
                          ? "Emailed"
                          : r.delivery === "failed"
                            ? "Failed"
                            : "Recorded, not emailed"}
                      </Chip>
                    ) : (
                      <Chip>Not sent</Chip>
                    )}
                  </div>
                ))}
              </div>
              {m.recipients.some((r) => r.delivery === "manual") && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Recipients marked "recorded, not emailed" use a route such as
                  a portal or formal letter. The notice is on record, but it has
                  to reach them through that route.
                </p>
              )}
            </div>
            {m.confirm && (
              <div className="rounded-lg border border-success/20 bg-success/10 px-3 py-2 text-[13px]">
                <b>Receipt confirmed</b> {fmtDT(m.confirm.at)}
                {m.confirm.ref && <> · Ref {m.confirm.ref}</>}
                {m.confirm.note && <div>{m.confirm.note}</div>}
                <div className="text-xs text-muted-foreground">
                  Logged by {m.confirm.loggedBy.name}
                </div>
              </div>
            )}
            <DialogFooter>
              {m.status === "sent" && failed > 0 && canAct && (
                <Button
                  variant="outline"
                  disabled={retry.isPending}
                  onClick={() => retry.mutate()}
                >
                  {retry.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1.5 h-4 w-4" />
                  )}
                  Retry {failed} failed
                </Button>
              )}
              {m.status === "sent" && !m.confirm && canAct && (
                <Button variant="outline" onClick={() => onReceipt(m)}>
                  Log receipt
                </Button>
              )}
              <Button onClick={onClose}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
