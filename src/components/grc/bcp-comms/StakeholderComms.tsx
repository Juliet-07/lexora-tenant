import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCopy,
  FileCheck2,
  Loader2,
  Megaphone,
  Pencil,
  Siren,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import type { BcpIncident } from "@/lib/grc/risk-api";
import {
  COMMS_KEY,
  errMessage,
  fetchCommsGroups,
  fetchCommsMessages,
  fetchCommsPlan,
  fetchCommsRecord,
  fetchCommsTemplates,
  issueCommsMessage,
  type CommsMessage,
  type CommsTemplate,
} from "@/lib/grc/bcp-comms-api";
import { Chip, LEVELS, fmtDT, useConfirm } from "./commsUi";
import { ComposeSheet, type ComposeTarget } from "./ComposeSheet";
import { PlanTab } from "./PlanTab";
import { LogTab } from "./LogTab";
import { RegisterTab } from "./RegisterTab";
import { TemplatesTab } from "./TemplatesTab";
import { MessageViewDialog, ReceiptDialog } from "./dialogs";

const copy = async (text: string, ok: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast({ title: ok });
  } catch {
    toast({
      title: "Could not copy automatically",
      description: "Select the text and copy it manually.",
      variant: "destructive",
    });
  }
};

export function StakeholderComms({
  incidents,
  initialIncidentId,
  onDeclare,
  onEdit,
  onResolve,
}: {
  incidents: BcpIncident[];
  initialIncidentId?: string | null;
  onDeclare: () => void;
  onEdit: (i: BcpIncident) => void;
  onResolve: (i: BcpIncident) => void;
}) {
  const qc = useQueryClient();
  const [confirmNode, confirm] = useConfirm();

  // Active incidents first, then newest.
  const sorted = useMemo(
    () =>
      [...incidents].sort((a, b) => {
        const aa = a.status === "Active" ? 0 : 1;
        const bb = b.status === "Active" ? 0 : 1;
        return (
          aa - bb ||
          new Date(b.declaredAt).getTime() - new Date(a.declaredAt).getTime()
        );
      }),
    [incidents],
  );
  const [pickedId, setPickedId] = useState<string | null>(
    initialIncidentId ?? null,
  );
  useEffect(() => {
    if (initialIncidentId) setPickedId(initialIncidentId);
  }, [initialIncidentId]);
  // Stay on the incident being worked on: resolving it must not jump the
  // view to a different, still-active incident.
  useEffect(() => {
    if (!pickedId && sorted[0]) setPickedId(sorted[0]._id);
  }, [pickedId, sorted]);
  const incident = sorted.find((i) => i._id === pickedId) ?? sorted[0] ?? null;
  const id = incident?._id ?? "";
  const closed = !!incident && incident.status !== "Active";

  const [sub, setSub] = useState("plan");
  const [compose, setCompose] = useState<ComposeTarget | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [receiptFor, setReceiptFor] = useState<CommsMessage | null>(null);
  const [review, setReview] = useState<string | null>(null);

  const plan = useQuery({
    queryKey: [COMMS_KEY, "plan", id],
    queryFn: () => fetchCommsPlan(id),
    enabled: !!id,
    refetchInterval: 60_000,
  });
  const messagesQ = useQuery({
    queryKey: [COMMS_KEY, "messages", id],
    queryFn: () => fetchCommsMessages(id),
    enabled: !!id,
  });
  const groupsQ = useQuery({
    queryKey: [COMMS_KEY, "groups"],
    queryFn: fetchCommsGroups,
  });
  const tplQ = useQuery({
    queryKey: [COMMS_KEY, "templates"],
    queryFn: fetchCommsTemplates,
  });
  const messages = messagesQ.data ?? [];
  const groups = groupsQ.data ?? [];
  const viewing = messages.find((m) => m._id === viewId) ?? null;
  const isApprover = !!plan.data?.canApprove;

  const issue = useMutation({
    mutationFn: (m: CommsMessage) => issueCommsMessage(id, m._id),
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: [COMMS_KEY] });
      toast({ title: `Statement issued to ${m.groupName}` });
    },
    onError: (e) => toast({ title: errMessage(e), variant: "destructive" }),
  });

  const record = useMutation({
    mutationFn: () => fetchCommsRecord(id),
    onError: (e) => toast({ title: errMessage(e), variant: "destructive" }),
  });

  const copyRecord = async () => {
    const r = await record.mutateAsync();
    await copy(r.record, "Communications record copied");
  };
  const openReview = async () => {
    const r = await record.mutateAsync();
    setReview(r.review);
  };

  const useTemplate = (t: CommsTemplate) => {
    const gid = t.groupId ?? plan.data?.plan[0]?.group._id ?? groups[0]?._id;
    if (!gid) return;
    setSub("plan");
    setCompose({
      groupId: gid,
      kind: "update",
      templateId: t._id,
    });
  };

  const lvl = plan.data?.incident.level ?? 1;
  const nameOf = (i: BcpIncident) =>
    `${i.code}${i.title ? ` · ${i.title}` : ""}${i.status === "Active" ? "" : " (closed)"}`;

  return (
    <div className="space-y-4">
      {confirmNode}

      {incident ? (
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[260px] flex-1">
              <div className="mb-1 text-xs text-muted-foreground">Incident</div>
              <Select value={incident._id} onValueChange={setPickedId}>
                <SelectTrigger className="max-w-[460px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sorted.map((i) => (
                    <SelectItem key={i._id} value={i._id}>
                      {nameOf(i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              {!closed && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(incident)}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit incident
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!plan.data?.plan.length && !groups.length}
                    onClick={() => {
                      const gid =
                        plan.data?.plan[0]?.group._id ?? groups[0]?._id;
                      if (gid) {
                        setSub("plan");
                        setCompose({ groupId: gid, kind: "update" });
                      }
                    }}
                  >
                    <Megaphone className="mr-1.5 h-3.5 w-3.5" />
                    Send stakeholder update
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onResolve(incident)}
                  >
                    <FileCheck2 className="mr-1.5 h-3.5 w-3.5" />
                    Mark resolved
                  </Button>
                </>
              )}
              {closed && (
                <Button
                  size="sm"
                  disabled={record.isPending}
                  onClick={openReview}
                >
                  {record.isPending && (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  )}
                  Write post-incident review
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                disabled={record.isPending}
                onClick={copyRecord}
              >
                <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" />
                Copy communications record
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px]">
            <Chip tone={closed ? "grey" : lvl >= 3 ? "red" : "amber"} dot>
              Level {lvl}: {LEVELS[lvl]?.label}
            </Chip>
            {incident.type && (
              <span>
                Type: <b>{incident.type}</b>
              </span>
            )}
            <span>
              Spokesperson: <b>{incident.spokespersonName || "Not assigned"}</b>
            </span>
            <span>Declared {fmtDT(incident.declaredAt)}</span>
            {closed ? (
              <span>Closed {fmtDT(incident.resolvedAt)}</span>
            ) : (
              incident.nextUpdateAt && (
                <span>Next update {fmtDT(incident.nextUpdateAt)}</span>
              )
            )}
            {incident.clientImpact && (
              <Chip tone="amber">Clients affected</Chip>
            )}
            {incident.mediaInterest && <Chip tone="amber">Media interest</Chip>}
          </div>
          <p className="text-[13px] text-muted-foreground">
            {incident.description}
          </p>
          {closed && incident.closureNote && (
            <p className="text-[13px]">
              <b>Closure note:</b> {incident.closureNote}
            </p>
          )}
          {closed && (
            <p className="text-xs text-muted-foreground">
              This incident is closed, so its communications are read-only.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-10 text-center">
          <Siren className="h-7 w-7 text-muted-foreground" />
          <div>
            <b className="block">No incident declared</b>
            <span className="text-sm text-muted-foreground">
              Stakeholder notifications are planned from a declared incident.
              You can still set up the register and templates now.
            </span>
          </div>
          <Button variant="destructive" size="sm" onClick={onDeclare}>
            <Siren className="mr-1.5 h-4 w-4" />
            Declare incident
          </Button>
        </div>
      )}

      <Tabs value={sub} onValueChange={setSub}>
        <TabsList>
          <TabsTrigger value="plan" disabled={!incident}>
            Notification plan
          </TabsTrigger>
          <TabsTrigger value="log" disabled={!incident}>
            Communication log
            {messages.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 text-[10px]">
                {messages.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="register">Stakeholder register</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="mt-4">
          {plan.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : plan.isError || !plan.data ? (
            <div className="rounded-lg border p-6 text-sm text-destructive">
              {errMessage(plan.error, "Could not load the notification plan")}
            </div>
          ) : (
            <PlanTab
              plan={plan.data}
              messages={messages}
              closed={closed}
              isApprover={isApprover}
              onCompose={setCompose}
              onView={(m) => setViewId(m._id)}
              onReceipt={setReceiptFor}
              onGoLog={() => setSub("log")}
              onIssue={(m) =>
                confirm({
                  title: "Issue this statement?",
                  text: `The approved statement is released to ${m.groupName} now.`,
                  label: "Issue statement",
                  run: () => issue.mutate(m),
                })
              }
            />
          )}
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          <LogTab
            messages={messages}
            groupNames={[...new Set(messages.map((m) => m.groupName))]}
            onOpen={(m) =>
              m.status === "sent" || closed
                ? setViewId(m._id)
                : setCompose({ groupId: m.groupId, kind: m.kind, message: m })
            }
          />
        </TabsContent>

        <TabsContent value="register" className="mt-4">
          <RegisterTab groups={groups} />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <TemplatesTab
            templates={tplQ.data?.templates ?? []}
            groups={groups}
            incidentRef={incident && !closed ? incident.code : null}
            canUse
            onUse={useTemplate}
          />
        </TabsContent>
      </Tabs>

      <ComposeSheet
        incidentId={id}
        incidentLevel={lvl}
        canApprove={isApprover}
        groups={groups}
        target={compose}
        onClose={() => setCompose(null)}
      />
      <MessageViewDialog
        incidentId={id}
        message={viewing}
        canAct={!closed}
        onClose={() => setViewId(null)}
        onReceipt={(m) => {
          setViewId(null);
          setReceiptFor(m);
        }}
      />
      <ReceiptDialog
        incidentId={id}
        message={receiptFor}
        onClose={() => setReceiptFor(null)}
      />

      <Dialog
        open={review !== null}
        onOpenChange={(o) => !o && setReview(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Post-incident review</DialogTitle>
            <DialogDescription>
              Built from the incident and its communications. Complete the
              bracketed parts and take it to the Board or regulator.
            </DialogDescription>
          </DialogHeader>
          <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 font-sans text-[13.5px] leading-relaxed">
            {review}
          </pre>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => review && copy(review, "Review copied")}
            >
              <ClipboardCopy className="mr-1.5 h-4 w-4" />
              Copy
            </Button>
            <Button onClick={() => setReview(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
