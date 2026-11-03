import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Copy, Eye, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  NOTICE_ACK_METHODS,
  type EmployeeBrief,
  type NoticeAttachment,
  type NoticeReceipt,
} from "@/lib/hr/hr-notices-api";
import { attachmentHref, fileExt, fmtDT, Person } from "./noticeUi";

// ── Attachment row ───────────────────────────────────────────
export function AttachmentRow({
  file,
  onRemove,
}: {
  file: NoticeAttachment;
  onRemove?: () => void;
}) {
  const href = attachmentHref(file.url);
  return (
    <div className="mt-2 flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-[10px] font-bold text-muted-foreground">
        {fileExt(file.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium">{file.name}</div>
        <div className="text-xs text-muted-foreground">{file.size}</div>
      </div>
      {href && (
        <Button asChild size="sm" variant="ghost">
          <a href={href} target="_blank" rel="noreferrer">
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            View
          </a>
        </Button>
      )}
      {onRemove && (
        <Button size="sm" variant="ghost" onClick={onRemove}>
          Remove
        </Button>
      )}
    </div>
  );
}

// ── Receipt dialog (admin or employee) ───────────────────────
const copy = async (text: string, ok: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast({ title: ok });
  } catch {
    toast({ title: "Could not copy to the clipboard", variant: "destructive" });
  }
};

export function ReceiptDialog({
  open,
  onOpenChange,
  queryKey,
  load,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  queryKey: unknown[];
  load: () => Promise<NoticeReceipt>;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: load,
    enabled: open,
  });
  const rows: [string, string | undefined][] = data
    ? [
        ["Employee", `${data.employee.name} (${data.employee.number})`],
        ["Department", data.employee.dept],
        ["Notice", `${data.notice.ref}, version ${data.notice.version}`],
        ["Title", data.notice.title],
        ["Delivered", fmtDT(data.deliveredAt)],
        ["First opened", data.openedAt ? fmtDT(data.openedAt) : "Not recorded"],
        ["Acknowledged", fmtDT(data.acknowledgedAt)],
        [
          "Method",
          data.offline
            ? `Recorded offline: ${data.offlineMethod}`
            : NOTICE_ACK_METHODS[data.method]?.label,
        ],
        ["Note", data.offlineNote || undefined],
        ["Device", data.device || "Web"],
        ["Integrity hash", data.integrityHash],
      ]
    : [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-amber-600" />
            Acknowledgement receipt
          </DialogTitle>
          <DialogDescription>{data?.reference ?? "Loading…"}</DialogDescription>
        </DialogHeader>
        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {isError && (
          <p className="py-6 text-center text-sm text-destructive">
            This receipt could not be loaded.
          </p>
        )}
        {data && (
          <dl className="space-y-2.5 text-sm">
            {rows
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="break-all text-right font-medium">{v}</dd>
                </div>
              ))}
            {data.signature && (
              <div className="flex items-center justify-between gap-6">
                <dt className="text-muted-foreground">Signature</dt>
                <dd
                  className="text-xl"
                  style={{
                    fontFamily: "'Brush Script MT','Segoe Script',cursive",
                  }}
                >
                  {data.signature}
                </dd>
              </div>
            )}
          </dl>
        )}
        <DialogFooter>
          {data && (
            <Button
              variant="outline"
              onClick={() =>
                copy(
                  rows
                    .filter(([, v]) => v)
                    .map(([k, v]) => `${k}: ${v}`)
                    .concat(
                      data.signature ? [`Signature: ${data.signature}`] : [],
                    )
                    .join("\n"),
                  "Receipt copied",
                )
              }
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy receipt
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── People list dialog ───────────────────────────────────────
export function PeopleDialog({
  open,
  onOpenChange,
  title,
  people,
  total,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  people: EmployeeBrief[];
  total?: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {total ?? people.length} people
            {total && total > people.length
              ? ` (first ${people.length} shown)`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[55vh] divide-y overflow-auto rounded-lg border">
          {people.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <Person
                  name={p.name}
                  sub={`${p.role}${p.dept ? `, ${p.dept}` : ""}`}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {p.location}
              </span>
            </div>
          ))}
          {!people.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nobody matches yet.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Tiny hook for copy-to-clipboard feedback. */
export const useCopy = () => {
  const [busy, setBusy] = useState(false);
  return {
    busy,
    copy: async (text: string, ok = "Copied") => {
      setBusy(true);
      await copy(text, ok);
      setBusy(false);
    },
  };
};
