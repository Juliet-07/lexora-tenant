import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Download,
  Loader2,
  Mail,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  NOTICE_METHODS,
  downloadCallNoticePdf,
  fetchCallNotices,
  sendCallNotices,
  type CallNoticeData,
  type CapitalCall,
} from "@/lib/crm/finance-api";
import {
  SectionTitle,
  StatusPill,
  errMessage,
  fmtDate,
  money,
} from "./fundShared";

// The formal notice as the LP will read it — built by the engine from the
// issued call, so what is previewed here is exactly what the PDF says.
function NoticeLetter({ n }: { n: CallNoticeData }) {
  const cur = n.currency;
  return (
    <div className="space-y-3 rounded-md border bg-card p-5 text-sm leading-relaxed">
      <div className="flex items-start justify-between gap-4 border-b pb-3">
        <div>
          <p className="text-base font-semibold">{n.fundName}</p>
          <p className="text-xs text-muted-foreground">{n.fundDescriptor}</p>
          {n.gpName && (
            <p className="text-xs text-muted-foreground">
              acting by its general partner, {n.gpName}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide">
            Capital call notice
          </p>
          <p className="text-xs text-muted-foreground">{n.callRef}</p>
          <p className="text-xs text-muted-foreground">
            {fmtDate(n.noticeDate)}
          </p>
        </div>
      </div>

      <div>
        <p className="font-medium">{n.lpName}</p>
        <p className="text-xs text-muted-foreground">
          {n.lpType} investor · {n.closeLabel} close
        </p>
      </div>

      <p>
        Pursuant to clause {n.lpaCallClause} of the Limited Partnership
        Agreement
        {n.lpaDate ? ` dated ${fmtDate(n.lpaDate)}` : ""}, the General Partner
        hereby calls capital from you for{" "}
        <span className="font-medium">{n.purpose}</span>.
      </p>
      {n.narrative && <p className="text-muted-foreground">{n.narrative}</p>}

      <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
        <Row k="Total call" v={money(n.totalCall, cur)} />
        <Row k="Your share" v={`${n.pct.toFixed(2)}%`} />
        <Row k="Amount due from you" v={money(n.lpAmount, cur)} strong />
        <Row k="Payment due" v={fmtDate(n.dueDate)} strong />
        <Row k="Your commitment" v={money(n.commitment, cur)} />
        <Row k="Previously called" v={money(n.previouslyCalled, cur)} />
        <Row
          k="Called after this notice"
          v={`${money(n.totalCalledAfter, cur)} (${n.pctCalledAfter.toFixed(1)}%)`}
        />
        <Row k="Remaining unfunded" v={money(n.remainingUnfunded, cur)} />
      </div>

      {n.useOfProceeds.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            Use of proceeds (your share)
          </p>
          <Table>
            <TableBody>
              {n.useOfProceeds.map((u, i) => (
                <TableRow key={i}>
                  <TableCell className="py-1.5">{u.label}</TableCell>
                  <TableCell className="py-1.5 text-xs text-muted-foreground">
                    {u.note}
                  </TableCell>
                  <TableCell className="py-1.5 text-right">
                    {money(u.amount, cur)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div>
        <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
          Payment instructions
        </p>
        <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
          <Row k="Beneficiary" v={n.wire.beneficiary} />
          <Row k="Bank" v={n.wire.bank || "—"} />
          <Row k="Account" v={n.wire.accountNumber || "—"} />
          <Row k="SWIFT / BIC" v={n.wire.swift || "—"} />
          <Row k="Reference" v={n.wire.reference} strong />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        If payment is not received by the due date, default interest of{" "}
        {n.defaultInterestPct}% p.a. applies (clause{" "}
        {n.lpaDefaultInterestClause}
        ). A default not cured within {n.cureDays} days may lead to forfeiture
        of up to {n.forfeiturePct}% of your interest (clause{" "}
        {n.lpaDefaultClause}).
      </p>

      {(n.signatory || n.signatoryTitle) && (
        <p className="text-xs">
          <span className="font-medium">{n.signatory}</span>
          {n.signatoryTitle ? `, ${n.signatoryTitle}` : ""}
        </p>
      )}
    </div>
  );
}

const Row = ({ k, v, strong }: { k: string; v: string; strong?: boolean }) => (
  <div className="flex justify-between gap-3 text-sm">
    <span className="text-muted-foreground">{k}</span>
    <span className={strong ? "font-semibold" : "font-medium"}>{v}</span>
  </div>
);

const tomorrow9 = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
};

// Review the personalised notice for each LP, download them, and send —
// now or scheduled — by email with the PDF, a portal link, or both.
export function CallNoticesDialog({
  open,
  onOpenChange,
  fundId,
  call,
  invalidate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  fundId: string;
  call: CapitalCall | null;
  invalidate: () => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<"preview" | "send">("preview");
  const [activeId, setActiveId] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [method, setMethod] = useState<string>(NOTICE_METHODS[0]);
  const [timing, setTiming] = useState<"now" | "tomorrow" | "custom">("now");
  const [customAt, setCustomAt] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachStatement, setAttachStatement] = useState(false);
  const [ccAdmin, setCcAdmin] = useState(false);
  const [busyPdf, setBusyPdf] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["callNotices", fundId, call?._id],
    queryFn: () => fetchCallNotices(fundId, call!._id),
    enabled: open && !!call,
  });

  useEffect(() => {
    if (!open) return;
    setStep("preview");
    setTiming("now");
    setCustomAt("");
    setMessage("");
    setAttachStatement(false);
    setCcAdmin(false);
    setMethod(NOTICE_METHODS[0]);
  }, [open, call?._id]);

  useEffect(() => {
    if (!data) return;
    setActiveId((id) => id || data.notices[0]?.commitmentId || "");
    setPicked(
      new Set(data.notices.filter((n) => n.lpEmail).map((n) => n.commitmentId)),
    );
    setSubject((s) => s || `Capital call notice ${data.callRef}`);
  }, [data]);

  const active = data?.notices.find((n) => n.commitmentId === activeId);
  const missingEmail = (data?.notices ?? []).filter((n) => !n.lpEmail);
  const cur = data?.currency ?? "";
  const pickedTotal = useMemo(
    () =>
      (data?.notices ?? [])
        .filter((n) => picked.has(n.commitmentId))
        .reduce((s, n) => s + n.amount, 0),
    [data, picked],
  );

  const sendAt = (() => {
    if (timing === "tomorrow") return tomorrow9();
    if (timing === "custom" && customAt) return new Date(customAt);
    return null;
  })();
  const badSchedule =
    timing === "custom" &&
    (!customAt || (sendAt && sendAt.getTime() < Date.now()));

  const pdf = async (commitmentId?: string) => {
    if (!call) return;
    setBusyPdf(commitmentId ?? "all");
    try {
      await downloadCallNoticePdf(fundId, call._id, commitmentId);
    } catch (e) {
      toast({
        title: "Could not download the PDF",
        description: errMessage(e),
        variant: "destructive",
      });
    } finally {
      setBusyPdf("");
    }
  };

  const send = useMutation({
    mutationFn: () =>
      sendCallNotices(fundId, call!._id, {
        commitmentIds: [...picked],
        method,
        sendAt: sendAt ? sendAt.toISOString() : undefined,
        subject: subject || undefined,
        message: message || undefined,
        attachStatement,
        ccAdministrator: ccAdmin,
      }),
    onSuccess: (r) => {
      invalidate();
      if (r.scheduled) {
        toast({
          title: "Notices scheduled",
          description: `${r.count} notice(s) will go out ${new Date(r.sendAt!).toLocaleString()}.`,
        });
        onOpenChange(false);
      } else if (r.failed?.length) {
        toast({
          title: `Sent ${r.sent}, ${r.failed.length} failed`,
          description: r.failed
            .map((f) => `${f.lpName}: ${f.error}`)
            .join("; "),
          variant: "destructive",
        });
      } else {
        toast({ title: `${r.sent} notice(s) sent` });
        onOpenChange(false);
      }
    },
    onError: (e) =>
      toast({
        title: "Could not send the notices",
        description: errMessage(e),
        variant: "destructive",
      }),
  });

  const log = [...(call?.noticeLog ?? [])].reverse();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "preview"
              ? "Capital call notices"
              : "Send capital call notices"}
            {call ? ` — ${call.ref}` : ""}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {step === "preview"
              ? "A personalised notice for each LP. Review before dispatching."
              : "Dispatch the notices to each LP by email, the portal, or both."}
          </p>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Building notices…
          </div>
        )}
        {error && (
          <p className="p-4 text-sm text-destructive">
            {errMessage(error, "Could not build the notices")}
          </p>
        )}

        {data && step === "preview" && (
          <div className="space-y-3">
            {!data.wireConfigured && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <span>
                  The fund has no wire instructions yet, so the notices show
                  blank bank details. Add them under Edit fund terms before
                  sending.
                </span>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
              <div className="space-y-1">
                {data.notices.map((n) => (
                  <button
                    key={n.commitmentId}
                    onClick={() => setActiveId(n.commitmentId)}
                    className={`w-full rounded-md border p-2 text-left text-sm transition hover:bg-muted/50 ${
                      activeId === n.commitmentId
                        ? "border-primary bg-muted/60"
                        : ""
                    }`}
                  >
                    <div className="font-medium">{n.lpName}</div>
                    <div className="text-xs text-muted-foreground">
                      {money(n.amount, cur)}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {!n.lpEmail && (
                        <StatusPill label="No email" kind="amber" />
                      )}
                      {n.lastSend && (
                        <StatusPill
                          label={n.lastSend.status}
                          kind={
                            n.lastSend.status === "Sent"
                              ? "green"
                              : n.lastSend.status === "Failed"
                                ? "red"
                                : "blue"
                          }
                        />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {active && <NoticeLetter n={active.data} />}
                {active && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!!busyPdf}
                    onClick={() => pdf(active.commitmentId)}
                  >
                    {busyPdf === active.commitmentId ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Download {active.lpName}'s notice
                  </Button>
                )}
              </div>
            </div>

            {log.length > 0 && (
              <div>
                <SectionTitle>Send history</SectionTitle>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>LP</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>When</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {log.map((l, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          {l.lpName}
                          <div className="text-xs text-muted-foreground">
                            {l.email}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{l.method}</TableCell>
                        <TableCell className="text-xs">
                          {l.sentAt ? new Date(l.sentAt).toLocaleString() : "—"}
                          <div className="text-muted-foreground">
                            {l.sentBy}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusPill
                            label={l.status}
                            kind={
                              l.status === "Sent"
                                ? "green"
                                : l.status === "Failed"
                                  ? "red"
                                  : "blue"
                            }
                          />
                          {l.error && (
                            <div className="text-xs text-destructive">
                              {l.error}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {data && step === "send" && (
          <div className="space-y-4">
            <SectionTitle>Notice recipients</SectionTitle>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>LP</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Amount due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.notices.map((n) => (
                    <TableRow key={n.commitmentId}>
                      <TableCell>
                        <Checkbox
                          checked={picked.has(n.commitmentId)}
                          disabled={!n.lpEmail && !/portal/i.test(method)}
                          onCheckedChange={(v) =>
                            setPicked((p) => {
                              const next = new Set(p);
                              v
                                ? next.add(n.commitmentId)
                                : next.delete(n.commitmentId);
                              return next;
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>{n.lpName}</TableCell>
                      <TableCell className="text-xs">
                        {n.lpEmail || (
                          <span className="text-amber-700">
                            no email — set it on the commitment
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {money(n.amount, cur)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell />
                    <TableCell colSpan={2} className="font-semibold">
                      {picked.size} selected
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {money(pickedTotal, cur)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            {missingEmail.length > 0 && (
              <p className="text-xs text-amber-700">
                {missingEmail.map((m) => m.lpName).join(", ")} can only be
                reached through the portal until an email is added.
              </p>
            )}

            <SectionTitle>Delivery options</SectionTitle>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Delivery method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTICE_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Send timing</Label>
                <Select
                  value={timing}
                  onValueChange={(v) => setTiming(v as typeof timing)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="now">Send now</SelectItem>
                    <SelectItem value="tomorrow">
                      Schedule for tomorrow 9:00 AM
                    </SelectItem>
                    <SelectItem value="custom">Custom date/time…</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {timing === "custom" && (
                <div className="md:col-span-2">
                  <Label>Send at</Label>
                  <Input
                    type="datetime-local"
                    value={customAt}
                    onChange={(e) => setCustomAt(e.target.value)}
                  />
                  {badSchedule && (
                    <p className="mt-1 text-xs text-destructive">
                      Pick a time in the future.
                    </p>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label>Email subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div>
              <Label>Additional message (optional)</Label>
              <Textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={attachStatement}
                  onCheckedChange={(v) => setAttachStatement(!!v)}
                />
                Attach each LP's capital account statement
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={ccAdmin}
                  disabled={!data.administratorEmail}
                  onCheckedChange={(v) => setCcAdmin(!!v)}
                />
                CC fund administrator
                {data.administratorEmail ? (
                  <span className="text-xs text-muted-foreground">
                    ({data.administratorEmail})
                  </span>
                ) : (
                  <span className="text-xs text-amber-700">
                    — set the administrator email in fund terms
                  </span>
                )}
              </label>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {step === "preview" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={!data || !!busyPdf}
                  onClick={() => pdf()}
                >
                  {busyPdf === "all" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download all (PDF)
                </Button>
                <Button disabled={!data} onClick={() => setStep("send")}>
                  <Mail className="mr-2 h-4 w-4" /> Send to LPs
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("preview")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to preview
              </Button>
              <Button
                disabled={!picked.size || send.isPending || !!badSchedule}
                onClick={() => send.mutate()}
              >
                {send.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {sendAt ? "Schedule" : "Send"} {picked.size} notice
                {picked.size === 1 ? "" : "s"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
