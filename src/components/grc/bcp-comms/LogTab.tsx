import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Chip, Empty, fmtDT, type Tone } from "./commsUi";
import type { CommsMessage } from "@/lib/grc/bcp-comms-api";

const MSG_STATUS: Record<
  CommsMessage["status"],
  { label: string; tone: Tone }
> = {
  draft: { label: "Draft", tone: "blue" },
  pending: { label: "Awaiting approval", tone: "amber" },
  ready: { label: "Approved, on standby", tone: "purple" },
  sent: { label: "Sent", tone: "green" },
};

export function LogTab({
  messages,
  groupNames,
  onOpen,
}: {
  messages: CommsMessage[];
  groupNames: string[];
  onOpen: (m: CommsMessage) => void;
}) {
  const [flt, setFlt] = useState("all");
  const rows = messages
    .filter((m) => flt === "all" || m.groupName === flt)
    .sort(
      (a, b) =>
        new Date(b.sentAt ?? b.createdAt).getTime() -
        new Date(a.sentAt ?? a.createdAt).getTime(),
    );
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Communication log</h3>
        <Select value={flt} onValueChange={setFlt}>
          <SelectTrigger className="w-[260px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stakeholders</SelectItem>
            {groupNames.map((n) => (
              <SelectItem key={n} value={n}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-hidden rounded-lg border bg-card">
        {rows.length === 0 ? (
          <Empty
            icon={<Mail className="h-6 w-6" />}
            title="No communications yet"
          >
            Notices you write for this incident are logged here.
          </Empty>
        ) : (
          rows.map((m) => {
            const failed = m.recipients.filter(
              (r) => r.delivery === "failed",
            ).length;
            return (
              <div
                key={m._id}
                className="flex flex-wrap items-center gap-3 border-b px-4 py-3 last:border-0"
              >
                <div className="min-w-[240px] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{m.groupName}</span>
                    <Chip tone={MSG_STATUS[m.status].tone} dot>
                      {MSG_STATUS[m.status].label}
                    </Chip>
                    {m.kind === "update" && <Chip>Update</Chip>}
                    {m.confirm && <Chip tone="green">Receipt confirmed</Chip>}
                    {failed > 0 && <Chip tone="red">{failed} failed</Chip>}
                  </div>
                  <div className="mt-0.5 truncate text-[13px]">{m.subject}</div>
                  <div className="text-xs text-muted-foreground">
                    {fmtDT(m.sentAt ?? m.createdAt)} · {m.createdBy.name} ·{" "}
                    {m.recipients.length} recipient
                    {m.recipients.length === 1 ? "" : "s"}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => onOpen(m)}>
                  Open
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
