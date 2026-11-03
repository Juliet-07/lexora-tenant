import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Search,
  Send,
  SendToBack,
  Stamp,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
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
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import {
  COMMS_KEY,
  composeComms,
  deleteCommsMessage,
  errMessage,
  fetchCommsClients,
  fetchCommsTemplates,
  returnCommsMessage,
  saveCommsMessage,
  type CommsGroup,
  type CommsKind,
  type CommsMessage,
  type RecipientRef,
  type SaveAction,
} from "@/lib/grc/bcp-comms-api";
import { BRACKET, GroupIcon, rel, useConfirm } from "./commsUi";

export interface ComposeTarget {
  groupId: string;
  kind: CommsKind;
  templateId?: string;
  message?: CommsMessage;
}

const keyOf = (r: RecipientRef) => `${r.kind}:${r.refId}`;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ComposeSheet({
  incidentId,
  incidentLevel,
  canApprove,
  groups,
  target,
  onClose,
}: {
  incidentId: string;
  incidentLevel: number;
  canApprove: boolean;
  groups: CommsGroup[];
  target: ComposeTarget | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [confirmNode, confirm] = useConfirm();
  const msg = target?.message ?? null;

  const [groupId, setGroupId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [returning, setReturning] = useState(false);
  const [returnNote, setReturnNote] = useState("");

  const group = groups.find((g) => g._id === groupId);
  const kind: CommsKind = target?.kind ?? "initial";

  const { data: tplData } = useQuery({
    queryKey: [COMMS_KEY, "templates"],
    queryFn: fetchCommsTemplates,
    enabled: !!target,
  });
  const templates = (tplData?.templates ?? []).filter(
    (t) => !t.groupId || t.groupId === groupId,
  );

  const isClients = group?.source === "crm_clients";
  const { data: clients = [] } = useQuery({
    queryKey: [COMMS_KEY, "clients"],
    queryFn: () => fetchCommsClients(),
    enabled: !!target && isClients,
  });

  // Load the wording when the sheet opens: an existing notice as it was
  // saved, or a new one merged from the template and the incident.
  const load = useMutation({
    mutationFn: (v: {
      groupId: string;
      templateId?: string;
      kind: CommsKind;
    }) => composeComms(incidentId, v),
  });
  useEffect(() => {
    if (!target) {
      setReady(false);
      return;
    }
    setDirty(false);
    setClientSearch("");
    setReturning(false);
    setReturnNote("");
    setGroupId(target.groupId);
    if (target.message) {
      const m = target.message;
      setTemplateId(m.templateId ?? "");
      setSubject(m.subject);
      setBody(m.body);
      setPicked(new Set(m.recipients.map((r) => keyOf(r))));
      setReady(true);
      return;
    }
    setReady(false);
    load
      .mutateAsync({
        groupId: target.groupId,
        templateId: target.templateId,
        kind: target.kind,
      })
      .then((r) => {
        setTemplateId(r.templateId);
        setSubject(r.subject);
        setBody(r.body);
        setPicked(new Set(r.recipients.map(keyOf)));
        setReady(true);
      })
      .catch((e) => {
        toast({ title: errMessage(e), variant: "destructive" });
        onClose();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const recompose = async (
    over: { groupId?: string; templateId?: string },
    keepText = false,
  ) => {
    try {
      const r = await composeComms(incidentId, {
        groupId: over.groupId ?? groupId,
        templateId: over.templateId,
        kind,
      });
      if (!keepText) {
        setTemplateId(r.templateId);
        setSubject(r.subject);
        setBody(r.body);
        setDirty(false);
      }
      if (over.groupId) setPicked(new Set(r.recipients.map(keyOf)));
    } catch (e) {
      toast({ title: errMessage(e), variant: "destructive" });
    }
  };

  const needsApproval = group
    ? group.approvalMinLevel > 0 && incidentLevel >= group.approvalMinLevel
    : true;
  const reactive = !!group?.reactive;
  const pending = msg?.status === "pending";
  const brackets =
    (body.match(BRACKET) ?? []).length + (subject.match(BRACKET) ?? []).length;

  const recipients: RecipientRef[] = useMemo(
    () =>
      [...picked].map((k) => {
        const [kd, refId] = k.split(":");
        return { kind: kd as RecipientRef["kind"], refId };
      }),
    [picked],
  );
  const toggle = (r: RecipientRef, on: boolean) =>
    setPicked((p) => {
      const n = new Set(p);
      if (on) n.add(keyOf(r));
      else n.delete(keyOf(r));
      return n;
    });

  const save = useMutation({
    mutationFn: (action: SaveAction) =>
      saveCommsMessage(
        incidentId,
        {
          groupId,
          kind,
          templateId: templateId || null,
          subject,
          body,
          recipients,
          action,
        },
        msg?._id,
      ),
    onSuccess: (m, action) => {
      qc.invalidateQueries({ queryKey: [COMMS_KEY] });
      if (action === "send") {
        const emailed = m.recipients.filter(
          (r) => r.delivery === "emailed",
        ).length;
        const manual = m.recipients.filter(
          (r) => r.delivery === "manual",
        ).length;
        const failed = m.recipients.filter(
          (r) => r.delivery === "failed",
        ).length;
        toast({
          title: `Sent to ${group?.name ?? "the group"}`,
          description:
            [
              emailed && `${emailed} emailed`,
              manual &&
                `${manual} recorded for delivery by ${group?.channel.toLowerCase()}`,
              failed && `${failed} could not be emailed, retry from the log`,
            ]
              .filter(Boolean)
              .join(", ") || undefined,
          variant: failed ? "destructive" : undefined,
        });
      } else {
        toast({
          title: {
            draft: "Draft saved",
            submit: "Submitted for approval",
            hold: "Statement approved and held on standby",
            send: "",
          }[action],
        });
      }
      onClose();
    },
    onError: (e) => {
      qc.invalidateQueries({ queryKey: [COMMS_KEY] });
      toast({ title: errMessage(e), variant: "destructive" });
    },
  });

  const giveBack = useMutation({
    mutationFn: () =>
      returnCommsMessage(incidentId, msg!._id, {
        comment: returnNote,
        subject,
        body,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [COMMS_KEY] });
      toast({ title: `Returned to ${msg?.createdBy.name}` });
      setReturning(false);
      onClose();
    },
    onError: (e) => toast({ title: errMessage(e), variant: "destructive" }),
  });

  const discard = useMutation({
    mutationFn: () => deleteCommsMessage(incidentId, msg!._id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [COMMS_KEY] });
      toast({ title: "Discarded" });
      onClose();
    },
    onError: (e) => toast({ title: errMessage(e), variant: "destructive" }),
  });

  // Checks shared by the actions that complete a notice.
  const check = (completing: boolean) => {
    if (!subject.trim() || !body.trim()) {
      toast({
        title: "Add a subject and message first",
        variant: "destructive",
      });
      return false;
    }
    if (completing && brackets) {
      toast({
        title: "Complete the text in square brackets before approving",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const chosen = useMemo(() => {
    const contacts = (group?.contacts ?? []).filter((c) =>
      picked.has(`contact:${c._id}`),
    );
    const cl = clients.filter((c) => picked.has(`client:${c._id}`));
    return {
      total: contacts.length + cl.length,
      emailable: contacts.filter((c) => EMAIL.test(c.email)).length + cl.length,
    };
  }, [group, clients, picked]);

  const doSend = () => {
    if (!check(true)) return;
    if (!picked.size) {
      toast({ title: "Choose at least one recipient", variant: "destructive" });
      return;
    }
    const routed = chosen.total - chosen.emailable;
    confirm({
      title: needsApproval ? "Approve and send?" : "Send this notice?",
      text: `This goes to ${chosen.total} ${chosen.total === 1 ? "recipient" : "recipients"} in ${group?.name} by ${group?.channel.toLowerCase()}${
        needsApproval ? " and records your approval" : ""
      }. ${chosen.emailable} will be emailed${
        routed
          ? `; ${routed} ${routed === 1 ? "has" : "have"} no email address, so Lexora records ${routed === 1 ? "it" : "them"} as issued and the notice must reach ${routed === 1 ? "that contact" : "those contacts"} through the channel above`
          : ""
      }.`,
      label: needsApproval ? "Approve and send" : "Send",
      run: () => save.mutate("send"),
    });
  };

  const busy = save.isPending || giveBack.isPending || discard.isPending;
  const visibleClients = clients.filter(
    (c) =>
      !clientSearch.trim() ||
      `${c.name} ${c.email}`
        .toLowerCase()
        .includes(clientSearch.trim().toLowerCase()),
  );

  return (
    <>
      {confirmNode}
      <Sheet open={!!target} onOpenChange={(o) => !o && !busy && onClose()}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-[820px]"
        >
          <div className="border-b px-6 pb-4 pt-5">
            <div className="flex items-center gap-3 pr-8">
              {group && <GroupIcon icon={group.icon} color={group.color} />}
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">
                  {kind === "update"
                    ? "Stakeholder update"
                    : "Initial notification"}
                </div>
                <SheetTitle className="truncate text-lg">
                  {group?.name ?? "Notice"}
                </SheetTitle>
              </div>
            </div>
            {pending && (
              <div className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[13px]">
                Submitted for approval by <b>{msg?.createdBy.name}</b>,{" "}
                {rel(msg?.submittedAt ?? msg?.createdAt)}.
              </div>
            )}
            {msg?.returnedNote && (
              <div className="mt-3 flex gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[13px]">
                <Undo2 className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <span>
                  <b>Returned with comments:</b> {msg.returnedNote}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {!ready || !group ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {kind === "update" && !msg && (
                  <div>
                    <Label>Stakeholder group</Label>
                    <Select
                      value={groupId}
                      onValueChange={(v) => {
                        setGroupId(v);
                        recompose({ groupId: v }, dirty);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map((g) => (
                          <SelectItem key={g._id} value={g._id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Template</Label>
                    <Select
                      value={templateId || "none"}
                      onValueChange={(v) => {
                        if (v === "none") return;
                        setTemplateId(v);
                        recompose({ templateId: v });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" disabled>
                          Choose a template...
                        </SelectItem>
                        {templates.map((t) => (
                          <SelectItem key={t._id} value={t._id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Channel</Label>
                    <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm">
                      {group.channel}
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Recipients</Label>
                  <div className="space-y-1.5 rounded-lg border p-3">
                    {(group.contacts ?? []).map((c) => (
                      <label
                        key={c._id}
                        className="flex cursor-pointer items-start gap-2.5 text-sm"
                      >
                        <Checkbox
                          className="mt-0.5"
                          checked={picked.has(`contact:${c._id}`)}
                          onCheckedChange={(v) =>
                            toggle({ kind: "contact", refId: c._id }, !!v)
                          }
                        />
                        <span>
                          <b>{c.name}</b>{" "}
                          <span className="text-xs text-muted-foreground">
                            {[c.role, c.email].filter(Boolean).join(" · ")}
                          </span>
                          {c.email && !EMAIL.test(c.email) && (
                            <span className="ml-1 text-[11px] text-muted-foreground">
                              (route, not emailed)
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                    {!isClients && !(group.contacts ?? []).length && (
                      <p className="text-sm text-muted-foreground">
                        No contacts in the register for this group. Add one in
                        the Stakeholder register first.
                      </p>
                    )}
                    {isClients && (
                      <div className="pt-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <div className="relative min-w-[200px] flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              className="h-9 pl-8"
                              placeholder="Search clients"
                              value={clientSearch}
                              onChange={(e) => setClientSearch(e.target.value)}
                            />
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setPicked((p) => {
                                const n = new Set(p);
                                visibleClients.forEach((c) =>
                                  n.add(`client:${c._id}`),
                                );
                                return n;
                              })
                            }
                          >
                            Select{" "}
                            {clientSearch.trim()
                              ? "shown"
                              : `all (${clients.length})`}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setPicked((p) => {
                                const n = new Set(p);
                                visibleClients.forEach((c) =>
                                  n.delete(`client:${c._id}`),
                                );
                                return n;
                              })
                            }
                          >
                            Clear
                          </Button>
                        </div>
                        <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border bg-muted/20 p-2">
                          {visibleClients.map((c) => (
                            <label
                              key={c._id}
                              className="flex cursor-pointer items-center gap-2.5 text-sm"
                            >
                              <Checkbox
                                checked={picked.has(`client:${c._id}`)}
                                onCheckedChange={(v) =>
                                  toggle({ kind: "client", refId: c._id }, !!v)
                                }
                              />
                              <span className="truncate">
                                <b>{c.name}</b>{" "}
                                <span className="text-xs text-muted-foreground">
                                  {c.email}
                                </span>
                              </span>
                            </label>
                          ))}
                          {!visibleClients.length && (
                            <p className="py-3 text-center text-xs text-muted-foreground">
                              {clients.length
                                ? "No client matches."
                                : "No clients with an email address in CRM."}
                            </p>
                          )}
                        </div>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Each client gets their own email, addressed by name.
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {chosen.total} selected
                    {chosen.total
                      ? `, ${chosen.emailable} will be emailed`
                      : ""}
                    .
                  </p>
                </div>

                <div>
                  <Label htmlFor="cs-subject">Subject</Label>
                  <Input
                    id="cs-subject"
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      setDirty(true);
                    }}
                  />
                </div>

                <div>
                  <Label htmlFor="cs-body">
                    Message{" "}
                    <span className="font-normal text-muted-foreground">
                      Text in square brackets must be completed before sending
                    </span>
                  </Label>
                  <Textarea
                    id="cs-body"
                    className="min-h-[300px] text-[13.5px] leading-relaxed"
                    value={body}
                    onChange={(e) => {
                      setBody(e.target.value);
                      setDirty(true);
                    }}
                  />
                  <div
                    className={`mt-1.5 flex items-center gap-1.5 text-xs ${
                      brackets ? "text-warning" : "text-success"
                    }`}
                  >
                    {brackets ? (
                      <AlertCircle className="h-3.5 w-3.5" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    {brackets
                      ? `${brackets} placeholder${brackets === 1 ? "" : "s"} still to complete`
                      : "All placeholders completed"}
                  </div>
                </div>

                {needsApproval && (
                  <div className="flex gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 text-[13px]">
                    <Stamp className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" />
                    <span>
                      A notice to this group during a Level {incidentLevel}{" "}
                      incident must be approved before it is sent.
                      {!canApprove &&
                        " You can submit it for approval; an approver will send it."}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-6 py-3">
            {msg ? (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                disabled={busy}
                onClick={() =>
                  confirm({
                    title: "Discard this communication?",
                    text: "It has not been sent, so no stakeholder is affected.",
                    label: "Discard",
                    danger: true,
                    run: () => discard.mutate(),
                  })
                }
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Discard
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-wrap justify-end gap-2">
              {pending && canApprove && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setReturning(true)}
                >
                  <Undo2 className="mr-1.5 h-4 w-4" />
                  Return with comments
                </Button>
              )}
              <Button
                variant="outline"
                disabled={busy || !ready}
                onClick={() => check(false) && save.mutate("draft")}
              >
                <Save className="mr-1.5 h-4 w-4" />
                Save draft
              </Button>
              {needsApproval && !canApprove && (
                <Button
                  disabled={busy || !ready}
                  onClick={() => check(false) && save.mutate("submit")}
                >
                  <SendToBack className="mr-1.5 h-4 w-4" />
                  Submit for approval
                </Button>
              )}
              {reactive && (!needsApproval || canApprove) && (
                <Button
                  variant={canApprove ? "default" : "outline"}
                  disabled={busy || !ready}
                  onClick={() => check(true) && save.mutate("hold")}
                >
                  <Stamp className="mr-1.5 h-4 w-4" />
                  Approve and hold
                </Button>
              )}
              {(!needsApproval || canApprove) && (
                <Button disabled={busy || !ready} onClick={doSend}>
                  {save.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-1.5 h-4 w-4" />
                  )}
                  {needsApproval ? "Approve and send" : "Send"}
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={returning} onOpenChange={setReturning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return with comments</DialogTitle>
            <DialogDescription>
              {msg?.createdBy.name} sees your comments and can revise the
              notice.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            autoFocus
            placeholder="What needs to change?"
            value={returnNote}
            onChange={(e) => setReturnNote(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturning(false)}>
              <X className="mr-1.5 h-4 w-4" />
              Cancel
            </Button>
            <Button
              disabled={!returnNote.trim() || giveBack.isPending}
              onClick={() => giveBack.mutate()}
            >
              Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
