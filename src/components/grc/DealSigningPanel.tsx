import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Loader2,
  Mail,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  advanceFromSigning,
  downloadSigningFile,
  remindSignatories,
  resetSigning,
  sendExecutedCopies,
  sendForSigning,
  type Deal,
  type SigningKind,
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

// A deal document is signed in three steps: pick who signs for each side (in
// the deal's parties), send it, and the two signatories sign from their
// emailed links. Everything else here is just following along. The contract
// and the term sheet each have their own signing — this panel runs either.
const WORDS = {
  contract: {
    noun: "contract",
    Noun: "Contract",
    block: "signing" as const,
    afterStage: "CPs Tracking",
    fromStage: "Signing",
    empty:
      "There is no contract on this deal yet. Generate one from a template in the Contract tab, then come back to send it for signing.",
  },
  term_sheet: {
    noun: "term sheet",
    Noun: "Term sheet",
    block: "termSheetSigning" as const,
    afterStage: "Due Diligence",
    fromStage: "Term Sheet",
    empty:
      "There is no term sheet on this deal yet. Generate one from a template above, then send it for signing from here.",
  },
};

export default function DealSigningPanel({
  deal,
  kind = "contract",
}: {
  deal: Deal;
  kind?: SigningKind;
}) {
  const words = WORDS[kind];
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["deal", deal._id] });

  const block = deal[words.block];
  const signatories = block?.signatories ?? [];
  const sent = block?.document ?? null;
  const audit = block?.audit ?? [];
  const contracts = useMemo(
    () =>
      (deal.contracts ?? []).filter((c) => (c.kind ?? "contract") === kind),
    [deal.contracts, kind],
  );

  const [contractId, setContractId] = useState<string>(
    contracts.length === 1 ? contracts[0]._id : "",
  );
  const [message, setMessage] = useState("");
  const [showDoc, setShowDoc] = useState(false);
  
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
      sendForSigning(
        deal._id,
        { contractId, message: message.trim() || undefined },
        kind,
      ),
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
    mutationFn: (index?: number) => remindSignatories(deal._id, index, kind),
    onSuccess: (r) => {
      invalidate();
      if (r.failed.length)
        toast.warning(`Could not email: ${r.failed.join(", ")}`);
      else toast.success("Reminder sent");
    },
    onError: (e) => toast.error(errMsg(e, "Could not send the reminder")),
  });
  const resetMut = useMutation({
    mutationFn: () => resetSigning(deal._id, kind),
    onSuccess: () => {
      invalidate();
      toast.success("Signing cancelled");
    },
    onError: (e) => toast.error(errMsg(e, "Could not cancel signing")),
  });
  const copiesMut = useMutation({
    mutationFn: () => sendExecutedCopies(deal._id, {}, kind),
    onSuccess: (r) => {
      invalidate();
      if (r.failed.length)
        toast.warning(`Could not email: ${r.failed.join(", ")}`);
      else toast.success("Executed copies sent");
    },
    onError: (e) => toast.error(errMsg(e, "Could not send the copies")),
  });
  const advanceMut = useMutation({
    mutationFn: () => advanceFromSigning(deal._id, kind),
    onSuccess: () => {
      invalidate();
      toast.success(`Moved to ${words.afterStage}`);
    },
    onError: (e) => toast.error(errMsg(e, "Could not move the deal on")),
  });
  const downloadMut = useMutation({
    mutationFn: async (fileKind: "signed" | "certificate") => {
      const blob = await downloadSigningFile(deal._id, fileKind, kind);
      saveBlob(
        blob,
        fileKind === "signed"
          ? `${sent?.name ?? "Document"} (Signed).pdf`
          : `${sent?.name ?? "Document"} (Signing certificate).pdf`,
      );
    },
    onError: (e) => toast.error(errMsg(e, "Could not download the file")),
  });

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
                data-testid={
                  kind === "contract" ? "signing-status" : "signing-status-term-sheet"
                }
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
              <p className="text-muted-foreground">{words.empty}</p>
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
                <Label className="text-xs">{words.Noun}</Label>
                <Select value={contractId} onValueChange={setContractId}>
                  <SelectTrigger aria-label={`${words.Noun} to sign`}>
                    <SelectValue
                      placeholder={`Choose the ${words.noun} to sign`}
                    />
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
                  {deal.stage === words.fromStage && (
                    <Button
                      size="sm"
                      disabled={advanceMut.isPending}
                      onClick={() => advanceMut.mutate()}
                    >
                      Move to {words.afterStage}
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
                data-testid={
                  kind === "contract"
                    ? `signatory-${r.side}`
                    : `signatory-term-sheet-${r.side}`
                }
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
