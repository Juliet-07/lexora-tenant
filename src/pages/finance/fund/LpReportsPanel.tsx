import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  FileText,
  Loader2,
  Plus,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  deleteLpReport,
  downloadLpReportFile,
  fetchLpReports,
  generateLpReport,
  sendLpReport,
  uploadLpReport,
  type CapitalCall,
  type CapitalCommitment,
  type Distribution,
  type FundReportRecord,
} from "@/lib/crm/finance-api";
import {
  SectionTitle,
  StatusPill,
  errMessage,
  fmtDateTime,
  periodLabel,
} from "./fundShared";

const DELIVERIES = [
  "Generate only (download)",
  "Generate & email to LPs",
  "Generate & upload to LP portal",
  "Generate, email & upload to portal",
];

const recipientOptions = (commitments: CapitalCommitment[]) => (
  <>
    <SelectItem value="all">All LPs ({commitments.length})</SelectItem>
    <SelectItem value="lpac">LPAC members only</SelectItem>
    {commitments.map((c) => (
      <SelectItem key={c._id} value={c._id}>
        {c.lpName}
      </SelectItem>
    ))}
  </>
);

const statusKind = (s: string) =>
  s === "Sent" ? "green" : s === "Failed" ? "red" : "blue";

// The LP report library: every report generated or uploaded for the fund's
// investors, who it went to and when. Investors are the fund's limited
// partners, so this is how they are told how their investment is doing.
export function LpReportsPanel({
  fundId,
  commitments,
  capitalCalls,
  distributions,
  invalidate,
}: {
  fundId: string;
  commitments: CapitalCommitment[];
  capitalCalls: CapitalCall[];
  distributions: Distribution[];
  invalidate: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const key = ["fundLpReports", fundId];
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => fetchLpReports(fundId),
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: key });
    invalidate();
  };

  const [genOpen, setGenOpen] = useState(false);
  const [upOpen, setUpOpen] = useState(false);
  const [sendTarget, setSendTarget] = useState<FundReportRecord | null>(null);

  const del = useMutation({
    mutationFn: (id: string) => deleteLpReport(fundId, id),
    onSuccess: () => {
      refresh();
      toast({ title: "Report removed" });
    },
    onError: (e) =>
      toast({
        title: "Could not remove the report",
        description: errMessage(e),
        variant: "destructive",
      }),
  });

  const download = async (r: FundReportRecord, i: number) => {
    try {
      await downloadLpReportFile(fundId, r._id, i, r.files[i]?.name);
    } catch (e) {
      toast({
        title: "Could not download",
        description: errMessage(e),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">LP reporting</CardTitle>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Investors are the fund's limited partners — they receive reports
              on how their investment is performing. Generate a report for all
              LPs, the LPAC or one investor, deliver it by email or the LP
              portal, and keep the record of what was sent to whom.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="outline" onClick={() => setUpOpen(true)}>
              <Upload className="mr-2 h-4 w-4" /> Upload report
            </Button>
            <Button size="sm" onClick={() => setGenOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Generate report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : !data?.reports.length ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">No LP reports yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Generate a quarterly LP report, NAV statement or capital account
                statements, or upload the audited financials and tax reports.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Files</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.reports.map((r) => (
                  <TableRow key={r._id}>
                    <TableCell>
                      <div className="font-medium">
                        {r.title || r.reportType}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.reportType}
                        {r.uploaded ? " · uploaded" : ""} · {r.generatedBy} ·{" "}
                        {fmtDateTime(r.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{r.period || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {r.recipientLabel}
                      <div className="text-xs text-muted-foreground">
                        {r.delivery}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        label={r.status}
                        kind={r.status === "Sent" ? "green" : "grey"}
                      />
                      {r.deliveries.length > 0 && (
                        <div
                          className="mt-1 text-[11px] text-muted-foreground"
                          title={r.deliveries
                            .map(
                              (d) => `${d.lpName} (${d.channel}): ${d.status}`,
                            )
                            .join("\n")}
                        >
                          {
                            r.deliveries.filter((d) => d.status === "Sent")
                              .length
                          }
                          /{r.deliveries.length} delivered
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {r.files.map((f, i) => (
                          <Button
                            key={i}
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => download(r, i)}
                          >
                            <Download className="mr-1 h-3 w-3" />
                            {(f.format || f.name.split(".").pop() || "file")
                              .toString()
                              .toUpperCase()}
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Send to LPs"
                        onClick={() => setSendTarget(r)}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title={
                          r.status === "Sent"
                            ? "Sent reports are kept on record"
                            : "Delete"
                        }
                        disabled={r.status === "Sent" || del.isPending}
                        onClick={() => {
                          if (confirm(`Delete “${r.title || r.reportType}”?`))
                            del.mutate(r._id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <GenerateReportDialog
        open={genOpen}
        onOpenChange={setGenOpen}
        fundId={fundId}
        payload={data}
        commitments={commitments}
        capitalCalls={capitalCalls}
        distributions={distributions}
        onDone={refresh}
      />
      <UploadReportDialog
        open={upOpen}
        onOpenChange={setUpOpen}
        fundId={fundId}
        payload={data}
        commitments={commitments}
        onDone={refresh}
      />
      <SendReportDialog
        report={sendTarget}
        onClose={() => setSendTarget(null)}
        fundId={fundId}
        commitments={commitments}
        onDone={refresh}
      />
    </div>
  );
}

function GenerateReportDialog({
  open,
  onOpenChange,
  fundId,
  payload,
  commitments,
  capitalCalls,
  distributions,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  fundId: string;
  payload?: Awaited<ReturnType<typeof fetchLpReports>>;
  commitments: CapitalCommitment[];
  capitalCalls: CapitalCall[];
  distributions: Distribution[];
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [type, setType] = useState("Quarterly LP Report");
  const [period, setPeriod] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [recipients, setRecipients] = useState("all");
  const [format, setFormat] = useState<"pdf" | "xlsx" | "both">("pdf");
  const [delivery, setDelivery] = useState(DELIVERIES[0]);
  const [branding, setBranding] = useState<"fund" | "gp" | "none">("fund");
  const [commentary, setCommentary] = useState("");
  const [sections, setSections] = useState<string[]>([]);
  const [callId, setCallId] = useState("");
  const [distributionId, setDistributionId] = useState("");

  const periods = payload?.periods ?? [];
  const effPeriod = period || periods[0] || "";
  const needsCall = type === "Capital Call Notice";
  const needsDist = type === "Distribution Notice";
  const pickSections = type === "Custom Report";
  const issuedCalls = capitalCalls.filter((c) => c.status !== "Draft");
  const customBad = effPeriod === "custom" && (!from || !to || from > to);
  const missingRef =
    (needsCall && !callId) ||
    (needsDist && !distributionId) ||
    (pickSections && sections.length === 0);

  const run = useMutation({
    mutationFn: () =>
      generateLpReport(fundId, {
        reportType: type,
        period: effPeriod === "custom" ? undefined : effPeriod,
        from: effPeriod === "custom" ? from : undefined,
        to: effPeriod === "custom" ? to : undefined,
        recipients,
        format,
        delivery,
        branding,
        commentary: commentary || undefined,
        sections: pickSections ? sections : undefined,
        callId: needsCall ? callId : undefined,
        distributionId: needsDist ? distributionId : undefined,
      }),
    onSuccess: (r) => {
      onDone();
      onOpenChange(false);
      const sent = r.deliveries.filter((d) => d.status === "Sent").length;
      toast({
        title: "Report generated",
        description: r.deliveries.length
          ? `${sent} of ${r.deliveries.length} deliveries succeeded.`
          : "Download it from the library below.",
      });
    },
    onError: (e) =>
      toast({
        title: "Could not generate the report",
        description: errMessage(e),
        variant: "destructive",
      }),
  });

  const desc = payload?.types.find((t) => t.type === type)?.description;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate LP report</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Report type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(payload?.types ?? []).map((t) => (
                  <SelectItem key={t.type} value={t.type}>
                    {t.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {desc && (
              <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
            )}
            <p className="mt-1 text-[11px] text-muted-foreground">
              Annual financial statements and tax reports are prepared by the
              auditor and tax adviser — add those with “Upload report”.
            </p>
          </div>

          {needsCall && (
            <div>
              <Label>Capital call</Label>
              <Select value={callId} onValueChange={setCallId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose the call…" />
                </SelectTrigger>
                <SelectContent>
                  {issuedCalls.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.ref} — {c.purpose}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {needsDist && (
            <div>
              <Label>Distribution</Label>
              <Select value={distributionId} onValueChange={setDistributionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose the distribution…" />
                </SelectTrigger>
                <SelectContent>
                  {distributions.map((d) => (
                    <SelectItem key={d._id} value={d._id}>
                      {new Date(d.date).toLocaleDateString()} — {d.source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!needsCall && !needsDist && (
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Period</Label>
                <Select value={effPeriod} onValueChange={setPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((p) => (
                      <SelectItem key={p} value={p}>
                        {periodLabel(p)}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom range…</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {effPeriod === "custom" && (
                <>
                  <div>
                    <Label>From</Label>
                    <Input
                      type="date"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>To</Label>
                    <Input
                      type="date"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {pickSections && (
            <div>
              <Label>Sections</Label>
              <div className="mt-1 grid gap-2 sm:grid-cols-2">
                {(payload?.sections ?? []).map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={sections.includes(s)}
                      onCheckedChange={(v) =>
                        setSections((cur) =>
                          v ? [...cur, s] : cur.filter((x) => x !== s),
                        )
                      }
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Recipients</Label>
              <Select value={recipients} onValueChange={setRecipients}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>{recipientOptions(commitments)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="xlsx">Excel</SelectItem>
                  <SelectItem value="both">PDF + Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Delivery</Label>
              <Select value={delivery} onValueChange={setDelivery}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERIES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Branding</Label>
              <Select
                value={branding}
                onValueChange={(v) => setBranding(v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fund">Fund letterhead</SelectItem>
                  <SelectItem value="gp">GP letterhead</SelectItem>
                  <SelectItem value="none">No branding</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Manager commentary (optional)</Label>
            <Textarea
              rows={4}
              value={commentary}
              onChange={(e) => setCommentary(e.target.value)}
              placeholder="A note to investors on performance, portfolio developments and outlook."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={run.isPending || customBad || missingRef}
            onClick={() => run.mutate()}
          >
            {run.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UploadReportDialog({
  open,
  onOpenChange,
  fundId,
  payload,
  commitments,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  fundId: string;
  payload?: Awaited<ReturnType<typeof fetchLpReports>>;
  commitments: CapitalCommitment[];
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [period, setPeriod] = useState("");
  const [recipients, setRecipients] = useState("all");
  const [delivery, setDelivery] = useState(DELIVERIES[0]);
  const [commentary, setCommentary] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const types = payload?.uploadOnlyTypes ?? [];
  const eff = type || types[0]?.type || "";

  const run = useMutation({
    mutationFn: () =>
      uploadLpReport(
        fundId,
        {
          reportType: eff,
          title: title || undefined,
          period: period || undefined,
          recipients,
          delivery,
          commentary: commentary || undefined,
        },
        file!,
      ),
    onSuccess: () => {
      onDone();
      onOpenChange(false);
      setFile(null);
      setTitle("");
      setPeriod("");
      setCommentary("");
      toast({ title: "Report uploaded" });
    },
    onError: (e) =>
      toast({
        title: "Could not upload",
        description: errMessage(e),
        variant: "destructive",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload a prepared report</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Report type</Label>
            <Select value={eff} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t.type} value={t.type}>
                    {t.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              {types.find((t) => t.type === eff)?.description}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={eff}
              />
            </div>
            <div>
              <Label>Period</Label>
              <Input
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="e.g. FY 2025"
              />
            </div>
            <div>
              <Label>Recipients</Label>
              <Select value={recipients} onValueChange={setRecipients}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>{recipientOptions(commitments)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Delivery</Label>
              <Select value={delivery} onValueChange={setDelivery}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERIES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d.replace("Generate", "Upload")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Cover note (optional)</Label>
            <Textarea
              rows={2}
              value={commentary}
              onChange={(e) => setCommentary(e.target.value)}
            />
          </div>
          <div>
            <Label>File *</Label>
            <Input
              type="file"
              accept=".pdf,.xlsx,.xls,.docx,.doc,.csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!file || !eff || run.isPending}
            onClick={() => run.mutate()}
          >
            {run.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SendReportDialog({
  report,
  onClose,
  fundId,
  commitments,
  onDone,
}: {
  report: FundReportRecord | null;
  onClose: () => void;
  fundId: string;
  commitments: CapitalCommitment[];
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [recipients, setRecipients] = useState("");
  const [delivery, setDelivery] = useState("Generate & email to LPs");
  const eff = recipients || report?.recipients || "all";

  const run = useMutation({
    mutationFn: () =>
      sendLpReport(fundId, report!._id, { recipients: eff, delivery }),
    onSuccess: (r) => {
      onDone();
      onClose();
      const last = r.deliveries.slice(-commitments.length || -1);
      toast({
        title: "Report sent",
        description: `${last.filter((d) => d.status === "Sent").length} delivery(ies) succeeded.`,
      });
    },
    onError: (e) =>
      toast({
        title: "Could not send",
        description: errMessage(e),
        variant: "destructive",
      }),
  });

  return (
    <Dialog open={!!report} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Send “{report?.title || report?.reportType}”
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Recipients</Label>
            <Select value={eff} onValueChange={setRecipients}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>{recipientOptions(commitments)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Send by</Label>
            <Select value={delivery} onValueChange={setDelivery}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Generate & email to LPs">
                  Email to LPs
                </SelectItem>
                <SelectItem value="Generate & upload to LP portal">
                  LP portal
                </SelectItem>
                <SelectItem value="Generate, email & upload to portal">
                  Email + LP portal
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {report && report.deliveries.length > 0 && (
            <div>
              <SectionTitle>Already sent</SectionTitle>
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {report.deliveries.slice(-8).map((d, i) => (
                  <li key={i}>
                    {d.lpName} · {d.channel} · {d.status}
                    {d.sentAt ? ` · ${fmtDateTime(d.sentAt)}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={run.isPending} onClick={() => run.mutate()}>
            {run.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
