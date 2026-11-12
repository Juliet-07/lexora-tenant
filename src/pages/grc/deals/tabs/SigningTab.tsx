import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Download,
  Eye,
  FileSignature,
  ListChecks,
  Loader2,
  Mail,
  Plus,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  addSigningChecklistItem,
  advanceFromSigning,
  downloadSigningFile,
  remindSignatories,
  resetSigning,
  sendExecutedCopies,
  sendForSigning,
  toggleSigningChecklistItem,
  type Deal,
  type DealDocumentPreviewData,
  type DealParty,
  type DealPartySide,
} from "@/lib/grc/deals-api";
import { DealDocumentViewer } from "@/components/grc/DealDocumentPreview";

const SIDES: DealPartySide[] = ["Party A", "Party B"];

const fmt = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        timeZone: "Africa/Kigali",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " CAT"
    : "";

const errMsg = (err: any, fallback: string) =>
  err?.response?.data?.message ?? fallback;

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// A deal is signed in three steps: pick who signs for each side (in the
// deal's parties), send the contract, and the two signatories sign from
// their emailed links. Everything else here is just following along.
export default function SigningTab({ deal }: { deal: Deal }) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["deal", deal._id] });

  const checklist = deal.signing?.checklist ?? [];
  const signatories = deal.signing?.signatories ?? [];
  const sent = deal.signing?.document ?? null;
  const audit = deal.signing?.audit ?? [];
  const contracts = useMemo(
    () =>
      (deal.contracts ?? []).filter(
        (c) => (c.kind ?? "contract") === "contract",
      ),
    [deal.contracts],
  );

  const [contractId, setContractId] = useState<string>(
    contracts.length === 1 ? contracts[0]._id : "",
  );
  const [message, setMessage] = useState("");
  const [showDoc, setShowDoc] = useState(false);
  const [item, setItem] = useState({ item: "", owner: "" });

  // Who signs for each side, from the deal's parties.
  const chosen = SIDES.map((side) => ({
    side,
    party: (deal.parties ?? []).find(
      (p: DealParty) => p.side === side && p.authorizedSignatory,
    ),
  }));
  const missing = chosen.filter((c) => !c.party).map((c) => c.side);

  const signedCount = signatories.filter((s) => s.signed).length;
  const anySigned = signedCount > 0;
  const executed =
    !!sent && signatories.length > 0 && signedCount === signatories.length;
  const selected = contracts.find(
    (c) => c._id === (sent?.contractId ?? contractId),
  );

  const docPreview: DealDocumentPreviewData | null = selected
    ? {
        name: selected.name,
        cover: selected.cover ?? "",
        toc: {
          enabled: !!selected.toc?.enabled,
          title: selected.toc?.title ?? "Table of Contents",
          entries: selected.toc?.enabled ? selected.toc.entries : [],
        },
        sections: selected.sections.map((s) => ({
          title: s.title,
          html: s.renderedBody ?? s.body,
        })),
      }
    : null;

  const sendMut = useMutation({
    mutationFn: () =>
      sendForSigning(deal._id, {
        contractId,
        message: message.trim() || undefined,
      }),
    onSuccess: (r) => {
      invalidate();
      setMessage("");
      if (r.failed.length)
        toast.warning(`Could not email: ${r.failed.join(", ")}`);
      else toast.success("Sent for signing");
    },
    onError: (e) => toast.error(errMsg(e, "Could not send for signing")),
  });
  const remindMut = useMutation({
    mutationFn: (index?: number) => remindSignatories(deal._id, index),
    onSuccess: (r) => {
      invalidate();
      if (r.failed.length)
        toast.warning(`Could not email: ${r.failed.join(", ")}`);
      else toast.success("Reminder sent");
    },
    onError: (e) => toast.error(errMsg(e, "Could not send the reminder")),
  });
  const resetMut = useMutation({
    mutationFn: () => resetSigning(deal._id),
    onSuccess: () => {
      invalidate();
      toast.success("Signing cancelled");
    },
    onError: (e) => toast.error(errMsg(e, "Could not cancel signing")),
  });
  const copiesMut = useMutation({
    mutationFn: () => sendExecutedCopies(deal._id, {}),
    onSuccess: (r) => {
      invalidate();
      if (r.failed.length)
        toast.warning(`Could not email: ${r.failed.join(", ")}`);
      else toast.success("Executed copies sent");
    },
    onError: (e) => toast.error(errMsg(e, "Could not send the copies")),
  });
  const advanceMut = useMutation({
    mutationFn: () => advanceFromSigning(deal._id),
    onSuccess: () => {
      invalidate();
      toast.success("Moved to CPs Tracking");
    },
    onError: (e) => toast.error(errMsg(e, "Could not move the deal on")),
  });
  const downloadMut = useMutation({
    mutationFn: async (kind: "signed" | "certificate") => {
      const blob = await downloadSigningFile(deal._id, kind);
      saveBlob(
        blob,
        kind === "signed"
          ? `${sent?.name ?? "Document"} (Signed).pdf`
          : `${sent?.name ?? "Document"} (Signing certificate).pdf`,
      );
    },
    onError: (e) => toast.error(errMsg(e, "Could not download the file")),
  });

  const addChecklistMut = useMutation({
    mutationFn: () =>
      addSigningChecklistItem(deal._id, item.item, item.owner || "TBD"),
    onSuccess: () => {
      invalidate();
      setItem({ item: "", owner: "" });
    },
  });
  const toggleMut = useMutation({
    mutationFn: (index: number) => toggleSigningChecklistItem(deal._id, index),
    onSuccess: invalidate,
  });

  const done = checklist.filter((c) => c.status === "Done").length;
  const total = checklist.length;

  const status = executed
    ? {
        label: "Executed",
        tone: "text-emerald-700 border-emerald-500/40 bg-emerald-50",
      }
    : sent
      ? {
          label: `Awaiting signatures · ${signedCount}/${signatories.length}`,
          tone: "text-amber-700 border-amber-500/40 bg-amber-50",
        }
      : { label: "Not sent yet", tone: "text-muted-foreground" };

  // What to show for each signatory: the people who have been sent the
  // document, or — before sending — who will be.
  const rows = sent
    ? signatories.map((s, i) => ({
        side: s.party as DealPartySide,
        name: s.name,
        title: s.title ?? s.role,
        email: s.email ?? "",
        sig: s,
        index: i,
      }))
    : chosen
        .filter((c) => c.party)
        .map((c) => ({
          side: c.side,
          name: c.party!.name,
          title: c.party!.title,
          email: c.party!.email,
          sig: null,
          index: -1,
        }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSignature className="h-4 w-4" />
                Document to sign
              </CardTitle>
              <Badge
                variant="outline"
                className={status.tone}
                data-testid="signing-status"
              >
                {status.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {sent && (
              <Progress
                value={
                  signatories.length
                    ? (signedCount / signatories.length) * 100
                    : 0
                }
                className="h-2"
              />
            )}

            {contracts.length === 0 ? (
              <p className="text-muted-foreground">
                There is no contract on this deal yet. Generate one from a
                template in the Contract tab, then come back to send it for
                signing.
              </p>
            ) : sent ? (
              <div className="rounded-md border p-3">
                <div className="font-medium">{sent.name}</div>
                <div className="text-xs text-muted-foreground">
                  {sent.reference && `${sent.reference} · `}Sent{" "}
                  {fmt(sent.sentAt)} by {sent.sentBy}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs">Contract</Label>
                <Select value={contractId} onValueChange={setContractId}>
                  <SelectTrigger aria-label="Contract to sign">
                    <SelectValue placeholder="Choose the contract to sign" />
                  </SelectTrigger>
                  <SelectContent>
                    {contracts.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                        {c.reference ? ` · ${c.reference}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {docPreview && (
              <div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="-ml-2"
                  onClick={() => setShowDoc((v) => !v)}
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  {showDoc ? "Hide document" : "Preview document"}
                </Button>
                {showDoc && (
                  <div className="mt-2">
                    <DealDocumentViewer
                      preview={docPreview}
                      title={selected?.name}
                    />
                  </div>
                )}
              </div>
            )}

            {!sent && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Message to the signatories{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea
                    rows={2}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Anything they should know before signing…"
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={
                    !contractId || missing.length > 0 || sendMut.isPending
                  }
                  onClick={() => sendMut.mutate()}
                >
                  {sendMut.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-1.5 h-4 w-4" />
                  )}
                  Send for signing
                </Button>
              </>
            )}

            {sent && !executed && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={remindMut.isPending}
                  onClick={() => remindMut.mutate(undefined)}
                >
                  <BellRing className="mr-1.5 h-3.5 w-3.5" />
                  Send reminder
                </Button>
                {!anySigned && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={resetMut.isPending}
                    onClick={() => resetMut.mutate()}
                  >
                    Cancel and start again
                  </Button>
                )}
              </div>
            )}

            {executed && (
              <div className="space-y-2 rounded-md border border-emerald-500/40 bg-emerald-50 p-3">
                <div className="flex items-center gap-2 font-medium text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                  Everyone has signed
                  {sent?.completedAt && (
                    <span className="text-xs font-normal">
                      · {fmt(sent.completedAt)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={downloadMut.isPending}
                    onClick={() => downloadMut.mutate("signed")}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Signed PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={downloadMut.isPending}
                    onClick={() => downloadMut.mutate("certificate")}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Certificate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={copiesMut.isPending}
                    onClick={() => copiesMut.mutate()}
                  >
                    <Mail className="mr-1.5 h-3.5 w-3.5" />
                    Email executed copies
                  </Button>
                  {deal.stage === "Signing" && (
                    <Button
                      size="sm"
                      disabled={advanceMut.isPending}
                      onClick={() => advanceMut.mutate()}
                    >
                      Move to CPs Tracking
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Signatories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {missing.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Select an authorised signatory for {missing.join(" and ")} in
                  the deal's parties before sending.
                </span>
              </div>
            )}
            {rows.map((r) => (
              <div
                key={r.side}
                className="space-y-2 rounded-md border p-3"
                data-testid={`signatory-${r.side}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {r.side}
                    </div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.title}
                      {r.email && ` · ${r.email}`}
                    </div>
                  </div>
                  {r.sig?.signed ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/40 text-emerald-700"
                    >
                      Signed
                    </Badge>
                  ) : r.sig ? (
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 text-amber-700"
                    >
                      {r.sig.viewedAt ? "Viewed · not signed" : "Sent"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Not sent
                    </Badge>
                  )}
                </div>
                {r.sig?.signed && (
                  <div className="space-y-1 border-t pt-2 text-xs text-muted-foreground">
                    {r.sig.signatureMethod === "drawn" &&
                    r.sig.signatureData ? (
                      <img
                        src={r.sig.signatureData}
                        alt={`Signature of ${r.name}`}
                        className="h-14 rounded border bg-white p-1"
                      />
                    ) : (
                      <div className="font-serif text-xl italic text-foreground">
                        {r.sig.signatureData}
                      </div>
                    )}
                    <div>
                      Signed {fmt(r.sig.signedAt)}
                      {r.sig.ip && ` · IP ${r.sig.ip}`}
                      {r.sig.device && ` · ${r.sig.device}`}
                    </div>
                  </div>
                )}
                {r.sig && !r.sig.signed && !executed && (
                  <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                    <span>
                      {r.sig.lastRemindedAt
                        ? `Reminded ${fmt(r.sig.lastRemindedAt)}`
                        : `Sent ${fmt(r.sig.sentAt)}`}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7"
                      disabled={remindMut.isPending}
                      onClick={() => remindMut.mutate(r.index)}
                    >
                      Remind
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {rows.length === 0 && missing.length === 0 && (
              <div className="text-xs text-muted-foreground">
                No signatories.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {/* <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-4 w-4" />
              Pre-signing checklist ({done}/{total})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress
              value={total ? (done / total) * 100 : 0}
              className="h-2"
            />
            {checklist.map((c, i) => (
              <label
                key={i}
                className="flex cursor-pointer items-center gap-2 rounded border p-2 text-sm hover:bg-muted/40"
              >
                <input
                  type="checkbox"
                  checked={c.status === "Done"}
                  onChange={() => toggleMut.mutate(i)}
                />
                <span
                  className={
                    c.status === "Done"
                      ? "text-muted-foreground line-through"
                      : ""
                  }
                >
                  {c.item}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {c.owner}
                </span>
              </label>
            ))}
            <div className="flex gap-2 border-t pt-2">
              <Input
                placeholder="Checklist item"
                value={item.item}
                onChange={(e) => setItem({ ...item, item: e.target.value })}
              />
              <Input
                placeholder="Owner"
                value={item.owner}
                onChange={(e) => setItem({ ...item, owner: e.target.value })}
                className="w-32"
              />
              <Button
                disabled={!item.item || addChecklistMut.isPending}
                onClick={() => addChecklistMut.mutate()}
                aria-label="Add checklist item"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card> */}

        {audit.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-xs">
                {[...audit].reverse().map((a, i) => (
                  <li key={i} className="border-l-2 pl-3">
                    <div>{a.text}</div>
                    <div className="text-muted-foreground">
                      {fmt(a.at)}
                      {a.ip && ` · IP ${a.ip}`}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
