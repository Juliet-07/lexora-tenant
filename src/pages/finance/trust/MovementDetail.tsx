import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  addTrustMovementDocuments,
  fetchTrustMovementsBySource,
  resolveFinanceFileUrl,
  submitTrustDraft,
  type TrustMovement,
} from "@/lib/crm/finance-api";
import {
  FilePicker,
  MovementStatusBadge,
  SectionTitle,
  SourceBadge,
  fmtDate,
  fmtDateTime,
  money,
} from "./trustShared";

const Row = ({ k, v }: { k: string; v?: React.ReactNode }) =>
  v === undefined || v === null || v === "" ? null : (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );

/**
 * One movement, with everything that makes it traceable: the document it was
 * made against, the evidence attached, who prepared and who authorised it,
 * and every other drawdown that has touched the same source document.
 */
export function MovementDetailDialog({
  movement: m,
  onClose,
}: {
  movement: TrustMovement | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);

  const { data: related = [] } = useQuery({
    queryKey: ["trustBySource", m?.linkType, m?.linkId],
    queryFn: () => fetchTrustMovementsBySource(m!.linkType!, m!.linkId!),
    enabled: !!m?.linkType && !!m?.linkId,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["trustMovements"] });
    qc.invalidateQueries({ queryKey: ["trustLedgers"] });
    qc.invalidateQueries({ queryKey: ["trustAudit"] });
  };
  const attach = useMutation({
    mutationFn: () => addTrustMovementDocuments(m!._id, files),
    onSuccess: () => {
      toast({ title: "Evidence attached" });
      setFiles([]);
      refresh();
      onClose();
    },
    onError: (err: any) =>
      toast({
        title: "Could not attach",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });
  const submit = useMutation({
    mutationFn: () => submitTrustDraft(m!._id),
    onSuccess: () => {
      toast({ title: "Submitted for approval" });
      refresh();
      onClose();
    },
    onError: (err: any) =>
      toast({
        title: "Could not submit",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  if (!m) return null;
  const out = m.type === "Drawdown";
  const others = related.filter((r) => r._id !== m._id);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {m.ref} <MovementStatusBadge status={m.status} />
          </DialogTitle>
          <DialogDescription>
            {m.type}
            {m.drawdownType ? ` · ${m.drawdownType}` : ""} · {m.clientName}
          </DialogDescription>
        </DialogHeader>

        <p className={`text-2xl font-bold ${out ? "" : "text-success"}`}>
          {out ? "−" : "+"}
          {money(m.amount, m.currency)}
        </p>

        <SectionTitle>Source document</SectionTitle>
        {m.linkType ? (
          <div className="rounded-md border p-3 text-sm">
            <SourceBadge linkType={m.linkType} linkRef={m.linkRef} />
            <p className="mt-1 text-xs text-muted-foreground">{m.linkLabel}</p>
            {others.length > 0 && (
              <p className="mt-2 text-xs">
                Other trust movements against the same document:{" "}
                {others
                  .map(
                    (o) =>
                      `${o.ref} (${money(o.amount, o.currency)}, ${o.status})`,
                  )
                  .join(", ")}
              </p>
            )}
          </div>
        ) : m.type === "Interest" ? (
          <p className="text-sm text-muted-foreground">
            Interest credit
            {m.firmRetained ? " retained by the firm" : " to the client"}
            {m.periodStart && m.periodEnd
              ? ` for ${fmtDate(m.periodStart)} to ${fmtDate(m.periodEnd)}`
              : ""}
            .
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {m.type === "Deposit"
              ? "A deposit is supported by its bank reference and attached evidence."
              : "No source document is linked to this movement."}
          </p>
        )}

        <SectionTitle>Details</SectionTitle>
        <dl className="divide-y">
          <Row k="Date" v={fmtDate(m.date)} />
          <Row k="Bank / receipt reference" v={m.reference} />
          <Row k="Remitter" v={m.remitterName} />
          <Row k="Source of funds" v={m.sourceOfFunds} />
          <Row k="Purpose" v={m.purpose} />
          <Row k="Payee" v={m.payeeName} />
          <Row k="Expense category" v={m.expenseCategory} />
          <Row k="Payment method" v={m.paymentMethod} />
          <Row k="Beneficiary account" v={m.beneficiaryAccount} />
          <Row
            k="Requested date"
            v={m.requestedDate ? fmtDate(m.requestedDate) : ""}
          />
          <Row k="Settled as payment" v={m.settledPaymentRef} />
          <Row k="Narrative" v={m.narrative} />
          <Row k="Internal notes" v={m.internalNotes} />
          <Row k="Rejection reason" v={m.rejectedReason} />
        </dl>

        {out && (
          <>
            <SectionTitle>Approval trail</SectionTitle>
            <dl className="divide-y">
              <Row k="Prepared by" v={m.preparedBy} />
              {m.requiresAdditionalApproval && (
                <Row
                  k="First authoriser"
                  v={
                    m.firstAuthorisedBy
                      ? `${m.firstAuthorisedBy} · ${fmtDateTime(m.firstAuthorisedAt)}`
                      : "Waiting"
                  }
                />
              )}
              <Row
                k={
                  m.requiresAdditionalApproval
                    ? "Second authoriser"
                    : "Authorised by"
                }
                v={
                  m.authorisedBy
                    ? `${m.authorisedBy} · ${fmtDateTime(m.authorisedAt)}`
                    : m.status === "Rejected"
                      ? "Rejected"
                      : "Waiting"
                }
              />
            </dl>
            {m.requiresAdditionalApproval && (
              <Badge variant="outline" className="bg-warning/10 text-warning">
                Above the ledger limit — two authorisers required
              </Badge>
            )}
          </>
        )}

        <SectionTitle>Evidence ({m.documents.length})</SectionTitle>
        {m.documents.length > 0 && (
          <ul className="space-y-1 text-sm">
            {m.documents.map((d, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded bg-muted/50 px-2 py-1"
              >
                <span className="truncate">{d.name}</span>
                <a
                  className="ml-2 inline-flex items-center gap-1 text-primary"
                  href={resolveFinanceFileUrl(d.url) ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        )}
        {!["Rejected", "Approved"].includes(m.status) ||
        m.type === "Deposit" ? (
          <div className="space-y-2">
            <FilePicker
              files={files}
              onChange={setFiles}
              label="Add supporting evidence"
              hint="PDF, JPG, PNG up to 10MB each"
            />
            {files.length > 0 && (
              <Button
                size="sm"
                disabled={attach.isPending}
                onClick={() => attach.mutate()}
              >
                {attach.isPending ? "Uploading…" : "Attach files"}
              </Button>
            )}
          </div>
        ) : null}

        {m.status === "Draft" && (
          <div className="flex justify-end">
            <Button disabled={submit.isPending} onClick={() => submit.mutate()}>
              Submit for approval
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
