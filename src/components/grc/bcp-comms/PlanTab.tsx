import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FilePen,
  Mail,
  Send,
  Stamp,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Chip,
  GroupIcon,
  STATUS,
  dur,
  fmtDT,
  fmtT,
  slaText,
  useTick,
} from "./commsUi";
import type {
  CommsMessage,
  CommsPlan,
  CommsPlanItem,
} from "@/lib/grc/bcp-comms-api";
import type { ComposeTarget } from "./ComposeSheet";

function Deadline({ item }: { item: CommsPlanItem }) {
  const { status, deadlineAt, lead, group } = item;
  if (group.reactive || !deadlineAt) {
    return (
      <span className="text-xs text-muted-foreground">
        {status === "ready" || status === "standby"
          ? "Reactive, on request"
          : status === "sent" || status === "confirmed"
            ? `Issued ${fmtT(lead?.sentAt)}`
            : "Reactive, on request"}
      </span>
    );
  }
  const due = new Date(deadlineAt).getTime();
  if (status === "sent" || status === "confirmed") {
    const sent = new Date(lead?.sentAt ?? Date.now()).getTime();
    const late = sent > due;
    return (
      <span className={`text-xs ${late ? "text-destructive" : "text-success"}`}>
        {late
          ? `Sent ${dur(sent - due)} after the deadline`
          : `Sent ${fmtT(lead?.sentAt)}, within the deadline`}
      </span>
    );
  }
  const left = due - Date.now();
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        left < 0
          ? "text-destructive"
          : left < 36e5
            ? "text-warning"
            : "text-muted-foreground"
      }`}
    >
      <Clock className="h-3 w-3" />
      {left < 0 ? `Overdue by ${dur(left)}` : `Due in ${dur(left)}`} ·{" "}
      {fmtDT(deadlineAt)}
    </span>
  );
}

export function PlanTab({
  plan,
  messages,
  closed,
  isApprover,
  onCompose,
  onView,
  onReceipt,
  onIssue,
  onGoLog,
}: {
  plan: CommsPlan;
  messages: CommsMessage[];
  closed: boolean;
  isApprover: boolean;
  onCompose: (t: ComposeTarget) => void;
  onView: (m: CommsMessage) => void;
  onReceipt: (m: CommsMessage) => void;
  onIssue: (m: CommsMessage) => void;
  onGoLog: () => void;
}) {
  useTick();
  const msgOf = (id?: string) => messages.find((m) => m._id === id);

  const actions = (it: CommsPlanItem) => {
    const lead = msgOf(it.lead?._id);
    const out: JSX.Element[] = [];
    const g = it.group._id;
    if (closed) {
      if (lead)
        out.push(
          <Button
            key="v"
            size="sm"
            variant="outline"
            onClick={() => onView(lead)}
          >
            View
          </Button>,
        );
      return out;
    }
    switch (it.status) {
      case "none":
      case "standby":
        out.push(
          <Button
            key="w"
            size="sm"
            onClick={() => onCompose({ groupId: g, kind: "initial" })}
          >
            <FilePen className="mr-1.5 h-3.5 w-3.5" />
            {it.group.reactive ? "Prepare statement" : "Write notice"}
          </Button>,
        );
        break;
      case "draft":
        out.push(
          <Button
            key="c"
            size="sm"
            onClick={() =>
              lead && onCompose({ groupId: g, kind: lead.kind, message: lead })
            }
          >
            <FilePen className="mr-1.5 h-3.5 w-3.5" />
            Continue draft
          </Button>,
        );
        break;
      case "pending":
        out.push(
          <Button
            key="r"
            size="sm"
            variant={isApprover ? "default" : "outline"}
            onClick={() =>
              lead && onCompose({ groupId: g, kind: lead.kind, message: lead })
            }
          >
            <Stamp className="mr-1.5 h-3.5 w-3.5" />
            {isApprover ? "Review and approve" : "View submission"}
          </Button>,
        );
        break;
      case "ready":
        if (isApprover && lead)
          out.push(
            <Button key="i" size="sm" onClick={() => onIssue(lead)}>
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Issue statement
            </Button>,
          );
        if (lead)
          out.push(
            <Button
              key="v"
              size="sm"
              variant="outline"
              onClick={() => onView(lead)}
            >
              View
            </Button>,
          );
        break;
      case "sent":
      case "confirmed":
        if (lead) {
          out.push(
            <Button
              key="v"
              size="sm"
              variant="outline"
              onClick={() => onView(lead)}
            >
              View
            </Button>,
          );
          if (it.status === "sent")
            out.push(
              <Button
                key="rc"
                size="sm"
                variant="outline"
                onClick={() => onReceipt(lead)}
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Log receipt
              </Button>,
            );
        }
        break;
    }
    return out;
  };

  const { summary } = plan;
  const pct = summary.required
    ? Math.round((summary.sent / summary.required) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card px-4 py-3">
        <div className="min-w-[180px]">
          <div className="text-sm font-semibold">
            {summary.sent} of {summary.required} required notices sent
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-success transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onGoLog}
          className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          {summary.messages} communication{summary.messages === 1 ? "" : "s"} on
          record
        </button>
      </div>

      {plan.plan.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          No stakeholder group is brought in by this incident. Use "Notify
          anyway" below, or adjust the groups in the Stakeholder register.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          {plan.plan.map((it) => (
            <div
              key={it.group._id}
              className="flex flex-wrap items-center gap-3 border-b px-4 py-3 last:border-0"
            >
              <span className="w-5 text-center text-xs font-semibold text-muted-foreground">
                {it.order}
              </span>
              <GroupIcon icon={it.group.icon} color={it.group.color} />
              <div className="min-w-[220px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{it.group.name}</span>
                  <Chip tone={STATUS[it.status].tone} dot>
                    {STATUS[it.status].label}
                  </Chip>
                  {it.needsApproval && (
                    <Chip tone="purple">
                      <Stamp className="h-3 w-3" />
                      Approval needed
                    </Chip>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {slaText(it.group.slaHours, it.group.reactive)} ·{" "}
                  {it.group.channel}
                  {it.group.ownerName && <> · Lead: {it.group.ownerName}</>}
                </div>
                {it.group.statutory && (
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    {it.group.statutory}
                  </div>
                )}
                <div className="mt-1">
                  <Deadline item={it} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">{actions(it)}</div>
            </div>
          ))}
        </div>
      )}

      {plan.notTriggered.length > 0 && (
        <div className="rounded-lg border bg-muted/20">
          <div className="border-b px-4 py-2.5 text-sm font-semibold">
            Not triggered by this incident
          </div>
          {plan.notTriggered.map((n) => (
            <div
              key={n.group._id}
              className="flex flex-wrap items-center gap-3 border-b px-4 py-2.5 last:border-0"
            >
              <GroupIcon icon={n.group.icon} color={n.group.color} size={30} />
              <div className="min-w-[200px] flex-1">
                <div className="text-sm font-medium">{n.group.name}</div>
                <div className="text-xs text-muted-foreground">
                  {n.triggerText || "No trigger set"}
                </div>
              </div>
              {!closed && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    onCompose({ groupId: n.group._id, kind: "initial" })
                  }
                >
                  Notify anyway
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-lg border bg-muted/20 px-4 py-3 text-[13px]">
        <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <span>
          Staff are told through HR notices.{" "}
          <Link
            to="/hr/notices"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            <Mail className="mr-1 inline h-3.5 w-3.5" />
            Open staff notices
          </Link>
        </span>
      </div>
    </div>
  );
}
