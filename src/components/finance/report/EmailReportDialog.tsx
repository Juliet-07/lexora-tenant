import { useEffect, useState } from "react";
import { Loader2, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { emailManagementReport } from "@/lib/crm/finance-api";
import { emailReportToBoard } from "@/lib/crm/report-api";
import { useReport } from "./shared";

// One dialog for both ways of sending the management report: to the
// whole Board (every active board member that has an email address) or
// to a single named recipient. Both send the same PDF the Download PDF
// button produces.
export function EmailReportDialog({
  open,
  onOpenChange,
  displayCurrency,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  displayCurrency: string;
}) {
  const { pack } = useReport();
  const { toast } = useToast();
  const m = pack.meta;
  const board = pack.management.boardRecipients;
  const defaultSubject = `Management Report — ${m.periodLabel}`;

  const [subject, setSubject] = useState(defaultSubject);
  const [name, setName] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState<"board" | "one" | null>(null);

  useEffect(() => {
    if (open) setSubject(defaultSubject);
  }, [open, defaultSubject]);

  const fail = (e: any, what: string) =>
    toast({
      title: `Could not send ${what}`,
      description: e?.response?.data?.message ?? "Please try again.",
      variant: "destructive",
    });

  const sendBoard = async () => {
    setBusy("board");
    try {
      const r = await emailReportToBoard(m.periodType, m.periodKey, {
        subject,
        displayCurrency: displayCurrency || undefined,
      });
      toast({ title: "Management report sent", description: `Emailed to ${r.count} board member${r.count === 1 ? "" : "s"}.` });
      onOpenChange(false);
    } catch (e) {
      fail(e, "to the Board");
    } finally {
      setBusy(null);
    }
  };

  const sendOne = async () => {
    setBusy("one");
    try {
      const r = await emailManagementReport(m.periodType, m.periodKey, {
        recipientName: name.trim(),
        recipientEmail: to.trim(),
        subject,
        displayCurrency: displayCurrency || undefined,
      });
      toast({ title: "Management report sent", description: `Emailed to ${r.to}.` });
      onOpenChange(false);
    } catch (e) {
      fail(e, "the report");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Email the management report</DialogTitle>
          <DialogDescription>
            Sends the {m.periodLabel} management report as a PDF
            {displayCurrency ? ` in ${displayCurrency}` : ` in ${m.baseCurrency}`}, including your CEO message, commentary,
            risks and actions as saved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                {board > 0 ? (
                  <span>
                    <b>{board}</b> active board member{board === 1 ? "" : "s"} with an email address
                  </span>
                ) : (
                  <span className="text-muted-foreground">No active board members with an email address</span>
                )}
              </div>
              <Button size="sm" onClick={sendBoard} disabled={busy !== null || board === 0 || !subject.trim()}>
                {busy === "board" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send to Board
              </Button>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-sm font-medium">Or send to one person</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input placeholder="Recipient name" value={name} onChange={(e) => setName(e.target.value)} />
              <Input type="email" placeholder="name@company.com" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={sendOne}
                disabled={busy !== null || !name.trim() || !/^\S+@\S+\.\S+$/.test(to.trim()) || !subject.trim()}
              >
                {busy === "one" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
