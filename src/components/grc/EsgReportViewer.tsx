import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Send, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchReport,
  publishReport,
  sendReportToBoard,
  downloadReportPdf,
  PublishReportResult,
  EsgReportSnapshotIndicator,
} from "@/lib/grc/esg-api";

const fmt = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

// Toast for the result of a send: says exactly who it reached, and is
// loud when it reached nobody.
export function describeBoardSend(r: PublishReportResult, verb: string) {
  if (r.totalMembers === 0) {
    toast({
      title: `${verb}, but there are no active board members`,
      description:
        "Nobody has been notified. Add board members, then use “Send to board”.",
      variant: "destructive",
    });
    return;
  }
  const parts = [
    `${r.emailed} emailed`,
    `${r.notified} new in Board Pack`,
    r.failed ? `${r.failed} email${r.failed === 1 ? "" : "s"} failed` : "",
  ].filter(Boolean);
  toast({
    title: `${verb} — sent to the board`,
    description: parts.join(" · "),
    variant: r.failed ? "destructive" : undefined,
  });
}

function IndicatorBlock({ i }: { i: EsgReportSnapshotIndicator }) {
  const signed = i.status === "Signed off";
  return (
    <div className="border-t py-4 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-sm font-semibold text-primary mr-2">
            {i.code}
          </span>
          <span className="text-sm font-medium">{i.title}</span>
          {i.owner && (
            <div className="text-xs text-muted-foreground mt-0.5">
              Owner: {i.owner}
            </div>
          )}
        </div>
        <Badge
          variant="outline"
          className={
            !i.isApplicable
              ? "text-muted-foreground shrink-0"
              : signed
                ? "text-emerald-600 border-emerald-500/30 shrink-0"
                : "text-amber-600 border-amber-500/30 shrink-0"
          }
        >
          {!i.isApplicable ? "Not applicable" : i.status}
        </Badge>
      </div>
      {!i.isApplicable ? (
        <p className="text-sm text-muted-foreground mt-2">
          {i.applicabilityNote || "No reason recorded."}
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          {i.requirement && (
            <p className="text-xs text-muted-foreground italic">
              {i.requirement}
            </p>
          )}
          {i.response?.trim() ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {i.response}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No response entered.
            </p>
          )}
          {i.evidence.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Evidence: {i.evidence.join(" · ")}
            </p>
          )}
          {signed && (i.esgChairName || i.boardChairName || i.signedOffBy) && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              {i.esgChairName &&
                `ESG Committee Chair: ${i.esgChairName} (${fmt(i.esgChairDecidedAt)})`}
              {i.esgChairName && i.boardChairName && "  ·  "}
              {i.boardChairName
                ? `Board Chair: ${i.boardChairName} (${fmt(i.boardChairDecidedAt)})`
                : !i.esgChairName && i.signedOffBy
                  ? `Signed off by ${i.signedOffBy} (${fmt(i.signedOffAt)})`
                  : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function EsgReportViewer({
  reportId,
  openPublish = false,
  onClose,
}: {
  reportId: string | null;
  // Opens straight on the publish confirmation (the row's Publish button).
  openPublish?: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setConfirmOpen(!!reportId && openPublish);
    setMessage("");
  }, [reportId, openPublish]);

  const { data: report, isLoading } = useQuery({
    queryKey: ["esgReport", reportId],
    queryFn: () => fetchReport(reportId as string),
    enabled: !!reportId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["esgReports"] });
    queryClient.invalidateQueries({ queryKey: ["esgReport", reportId] });
  };

  const publishMut = useMutation({
    mutationFn: () => publishReport(reportId as string, message.trim()),
    onSuccess: (r) => {
      refresh();
      setConfirmOpen(false);
      setMessage("");
      describeBoardSend(r, "Report published");
    },
    onError: (e: any) =>
      toast({
        title: "Could not publish",
        description: e?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      }),
  });

  const resendMut = useMutation({
    mutationFn: () => sendReportToBoard(reportId as string),
    onSuccess: (r) => {
      refresh();
      if (r.emailed === 0 && r.failed === 0 && r.totalMembers > 0) {
        toast({ title: "Every board member already has this report" });
      } else {
        describeBoardSend(r, "Done");
      }
    },
  });

  const download = async () => {
    if (!report) return;
    setDownloading(true);
    try {
      await downloadReportPdf(report._id, `${report.title}.pdf`);
    } catch {
      toast({ title: "Could not download the PDF", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const snap = report?.snapshot;
  const recipients = report?.recipients ?? [];
  const published = report?.status === "Published";
  const readCount = recipients.filter((r) => r.readAt).length;
  const sentCount = recipients.filter((r) => r.emailStatus === "Sent").length;

  return (
    <>
      <Sheet open={!!reportId} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader className="pr-6">
            <div className="flex items-center gap-2">
              <SheetTitle>{report?.title ?? "ESG report"}</SheetTitle>
              {report && (
                <Badge
                  variant="outline"
                  className={
                    published ? "text-emerald-600 border-emerald-500/30" : ""
                  }
                >
                  {report.status}
                </Badge>
              )}
            </div>
            <SheetDescription>
              {snap
                ? `${snap.frameworkLabel} · Period ${report?.period} · Compiled ${fmt(report?.compiledAt)}${published ? ` · Published ${fmt(report?.publishedAt)}${report?.publishedBy ? ` by ${report.publishedBy}` : ""}` : ""}`
                : "Loading…"}
            </SheetDescription>
          </SheetHeader>

          {isLoading && (
            <p className="text-sm text-muted-foreground mt-6">
              Loading report…
            </p>
          )}

          {report && snap && (
            <div className="mt-4 space-y-5">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={download}
                  disabled={downloading}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  {downloading ? "Preparing…" : "Download PDF"}
                </Button>
                {!published && (
                  <Button size="sm" onClick={() => setConfirmOpen(true)}>
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Publish to board
                  </Button>
                )}
                {published && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resendMut.mutate()}
                    disabled={resendMut.isPending}
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    {resendMut.isPending ? "Sending…" : "Send to board"}
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ["Disclosures", String(snap.totals.total)],
                  [
                    "Signed off",
                    `${snap.totals.signedOff} of ${snap.totals.applicable}`,
                  ],
                  ["Pending", String(snap.totals.pending)],
                  ["Coverage", `${snap.totals.pct}%`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-md border p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {k}
                    </div>
                    <div className="text-lg font-semibold">{v}</div>
                  </div>
                ))}
              </div>

              {snap.totals.pending > 0 && (
                <div className="flex gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 p-3 text-sm text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  {snap.totals.pending} applicable disclosure
                  {snap.totals.pending === 1 ? " is" : "s are"} not yet signed
                  off.{" "}
                  {published
                    ? "They are marked as such in the report."
                    : "They will be marked as such in the published report."}
                </div>
              )}

              {published && (
                <div className="rounded-md border">
                  <div className="flex items-center justify-between px-3 py-2 border-b">
                    <div className="text-sm font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Sent to the board
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {recipients.length
                        ? `${sentCount} emailed · ${readCount} read in Board Pack`
                        : "Not sent to anyone yet"}
                    </div>
                  </div>
                  {report.publishMessage && (
                    <p className="px-3 py-2 text-xs text-muted-foreground border-b italic">
                      “{report.publishMessage}”
                    </p>
                  )}
                  {recipients.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Board member</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Board Pack</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recipients.map((r) => (
                          <TableRow key={r.boardMemberId}>
                            <TableCell className="text-sm">{r.name}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  r.emailStatus === "Sent"
                                    ? "text-emerald-600 border-emerald-500/30"
                                    : "text-destructive border-destructive/30"
                                }
                              >
                                {r.emailStatus}
                                {r.emailStatus === "Sent" && r.sentAt
                                  ? ` · ${fmt(r.sentAt)}`
                                  : ""}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {r.readAt
                                ? `Read ${fmt(r.readAt)}`
                                : "Not opened yet"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="px-3 py-4 text-xs text-muted-foreground">
                      There were no active board members when this was
                      published. Add board members, then use “Send to board”.
                    </p>
                  )}
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold mb-1">Disclosures</h3>
                <div>
                  {snap.indicators.map((i) => (
                    <IndicatorBlock key={i.code} i={i} />
                  ))}
                  {!snap.indicators.length && (
                    <p className="text-sm text-muted-foreground py-4">
                      This framework has no disclosures yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Publish this report to the board?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The report is refreshed with the latest disclosures, then emailed
              to every active board member (PDF attached) and added to the Board
              Pack page in their portal.
              {snap && snap.totals.pending > 0
                ? ` ${snap.totals.pending} disclosure${snap.totals.pending === 1 ? " is" : "s are"} still not signed off and will be marked as such.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="esg-publish-note">Cover note (optional)</Label>
            <Textarea
              id="esg-publish-note"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Anything the board should know before they read it…"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={publishMut.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={publishMut.isPending}
              onClick={(e) => {
                e.preventDefault();
                publishMut.mutate();
              }}
            >
              {publishMut.isPending ? "Publishing…" : "Publish & send"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
