import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  BellRing,
  CalendarX,
  Copy,
  CopyPlus,
  FilePenLine,
  PanelRightOpen,
  PenLine,
  Pin,
  Send,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import {
  archiveNotice,
  bulkArchiveNotices,
  bulkRemindNotices,
  deleteNotice,
  downloadCsv,
  errMessage,
  fetchNoticeRecipientsCsv,
  pinNotice,
  remindNotice,
  restoreNotice,
  sendNoticeNow,
  unscheduleNotice,
  type NoticeListItem,
} from "@/lib/hr/hr-notices-api";

export const NOTICE_KEY = "hr-notices";

// ── Confirm dialog ───────────────────────────────────────────
interface Ask {
  title: string;
  text: string;
  label: string;
  danger?: boolean;
  run: () => void;
}
export function useConfirm(): [ReactNode, (a: Ask) => void] {
  const [ask, setAsk] = useState<Ask | null>(null);
  const node = (
    <AlertDialog open={!!ask} onOpenChange={(o) => !o && setAsk(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{ask?.title}</AlertDialogTitle>
          <AlertDialogDescription>{ask?.text}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={
              ask?.danger
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
            onClick={() => {
              ask?.run();
              setAsk(null);
            }}
          >
            {ask?.label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return [node, setAsk];
}

// ── Mutations ────────────────────────────────────────────────
export function useNoticeOps() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: [NOTICE_KEY] });
  const ok = (title: string) => () => {
    refresh();
    toast({ title });
  };
  const fail = (e: unknown) =>
    toast({ title: errMessage(e), variant: "destructive" });

  const sendNow = useMutation({
    mutationFn: sendNoticeNow,
    onSuccess: ok("Notice sent"),
    onError: fail,
  });
  const unschedule = useMutation({
    mutationFn: unscheduleNotice,
    onSuccess: ok("Schedule cancelled. The notice is back in drafts."),
    onError: fail,
  });
  const archive = useMutation({
    mutationFn: archiveNotice,
    onSuccess: ok("Notice archived"),
    onError: fail,
  });
  const restore = useMutation({
    mutationFn: restoreNotice,
    onSuccess: ok("Notice restored"),
    onError: fail,
  });
  const pin = useMutation({
    mutationFn: pinNotice,
    onSuccess: refresh,
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: deleteNotice,
    onSuccess: ok("Notice deleted"),
    onError: fail,
  });
  const remind = useMutation({
    mutationFn: (v: { id: string; employeeIds?: string[] }) =>
      remindNotice(v.id, v.employeeIds),
    onSuccess: (r) => {
      refresh();
      toast({
        title: r.reminded
          ? `Reminder sent to ${r.reminded} ${r.reminded === 1 ? "person" : "people"}`
          : "Nobody is outstanding",
      });
    },
    onError: fail,
  });
  const bulkArchive = useMutation({
    mutationFn: bulkArchiveNotices,
    onSuccess: (r) => {
      refresh();
      toast({ title: `${r.archived} notices archived` });
    },
    onError: fail,
  });
  const bulkRemind = useMutation({
    mutationFn: bulkRemindNotices,
    onSuccess: (r) => {
      refresh();
      toast({ title: `Reminders sent to ${r.reminded} people` });
    },
    onError: fail,
  });
  const csv = async (id: string) => {
    try {
      downloadCsv(await fetchNoticeRecipientsCsv(id));
    } catch (e) {
      fail(e);
    }
  };
  return {
    sendNow,
    unschedule,
    archive,
    restore,
    pin,
    remove,
    remind,
    bulkArchive,
    bulkRemind,
    csv,
  };
}
export type NoticeOps = ReturnType<typeof useNoticeOps>;

// ── Row / header actions menu ────────────────────────────────
export function NoticeMenu({
  notice,
  ops,
  confirm,
  trigger,
  onOpen,
  onEdit,
  onRevise,
  onDuplicate,
  onDeleted,
}: {
  notice: NoticeListItem;
  ops: NoticeOps;
  confirm: (a: Ask) => void;
  trigger: ReactNode;
  onOpen?: () => void;
  onEdit: () => void;
  onRevise: () => void;
  onDuplicate: () => void;
  onDeleted?: () => void;
}) {
  const n = notice;
  const sent = n.status === "sent";
  const outstanding = n.requireAck && n.stats.outstanding > 0;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {onOpen && (
          <DropdownMenuItem onClick={onOpen}>
            <PanelRightOpen className="mr-2 h-4 w-4" />
            Open details
          </DropdownMenuItem>
        )}
        {n.status === "draft" && (
          <DropdownMenuItem onClick={onEdit}>
            <PenLine className="mr-2 h-4 w-4" />
            Continue editing
          </DropdownMenuItem>
        )}
        {n.status === "scheduled" && (
          <>
            <DropdownMenuItem
              onClick={() =>
                confirm({
                  title: "Send this notice now?",
                  text: `It goes out immediately to ${n.audienceCount} people instead of at the scheduled time.`,
                  label: "Send now",
                  run: () => ops.sendNow.mutate(n.id),
                })
              }
            >
              <Send className="mr-2 h-4 w-4" />
              Send now
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <PenLine className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                confirm({
                  title: "Cancel the schedule?",
                  text: "The notice returns to drafts and will not be sent until you send it again.",
                  label: "Cancel schedule",
                  run: () => ops.unschedule.mutate(n.id),
                })
              }
            >
              <CalendarX className="mr-2 h-4 w-4" />
              Cancel schedule
            </DropdownMenuItem>
          </>
        )}
        {sent && outstanding && (
          <DropdownMenuItem onClick={() => ops.remind.mutate({ id: n.id })}>
            <BellRing className="mr-2 h-4 w-4" />
            Remind pending staff
          </DropdownMenuItem>
        )}
        {sent && (
          <>
            <DropdownMenuItem onClick={onRevise}>
              <FilePenLine className="mr-2 h-4 w-4" />
              Revise and reissue
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => ops.pin.mutate(n.id)}>
              <Pin className="mr-2 h-4 w-4" />
              {n.pinned ? "Unpin" : "Pin to top"}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem onClick={onDuplicate}>
          <CopyPlus className="mr-2 h-4 w-4" />
          Duplicate
        </DropdownMenuItem>
        {(sent || n.status === "archived") && (
          <DropdownMenuItem onClick={() => ops.csv(n.id)}>
            <Copy className="mr-2 h-4 w-4" />
            Download recipients CSV
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {sent && (
          <DropdownMenuItem
            onClick={() =>
              confirm({
                title: "Archive this notice?",
                text: "Staff can still read it, but it leaves the active list and stops reminders.",
                label: "Archive",
                run: () => ops.archive.mutate(n.id),
              })
            }
          >
            <Archive className="mr-2 h-4 w-4" />
            Archive
          </DropdownMenuItem>
        )}
        {n.status === "archived" && (
          <DropdownMenuItem onClick={() => ops.restore.mutate(n.id)}>
            <ArchiveRestore className="mr-2 h-4 w-4" />
            Restore
          </DropdownMenuItem>
        )}
        {(n.status === "draft" || n.status === "scheduled") && (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() =>
              confirm({
                title: "Delete this notice?",
                text: `${n.ref} will be removed permanently.`,
                label: "Delete",
                danger: true,
                run: () =>
                  ops.remove.mutate(n.id, { onSuccess: () => onDeleted?.() }),
              })
            }
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
