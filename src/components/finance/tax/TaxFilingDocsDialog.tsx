import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreditCard, Download, Eye, FileText } from "lucide-react";
import {
  resolveFinanceFileUrl,
  type TaxFilingFile,
  type TaxObligation,
} from "@/lib/crm/finance-api";
import { formatMoney, taxTypeLabel } from "./taxConstants";

export function TaxFilingDocsDialog({
  obligation,
  onOpenChange,
  onPreview,
}: {
  obligation: TaxObligation | null;
  onOpenChange: (o: boolean) => void;
  onPreview: (doc: { url: string; name: string }) => void;
}) {
  const f = obligation?.filing;
  const rows: { label: string; file: TaxFilingFile | null; pop?: boolean }[] = [
    { label: "Tax return", file: f?.returnFile ?? null },
    { label: "Proof of payment", file: f?.popFile ?? null, pop: true },
  ];
  return (
    <Dialog open={!!obligation} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {obligation &&
              `${taxTypeLabel(obligation.type)} — ${obligation.period}`}
          </DialogTitle>
          <DialogDescription>
            {f
              ? `Filed ${f.filedOn?.slice(0, 10)} · ${formatMoney(f.amountPaid, obligation?.currency)} paid`
              : "No filing recorded yet."}
          </DialogDescription>
        </DialogHeader>
        <ul className="min-w-0 space-y-2">
          {rows.map(({ label, file, pop }) => {
            const url = resolveFinanceFileUrl(file?.url);
            return (
              <li
                key={label}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {pop ? (
                    <CreditCard className="h-5 w-5 shrink-0 text-muted-foreground" />
                  ) : (
                    <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="truncate text-sm font-medium">
                      {file?.name ?? "Not attached"}
                    </p>
                  </div>
                </div>
                {file && url && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onPreview({ url, name: file.name })}
                    >
                      <Eye className="mr-1 h-4 w-4" /> View
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <a
                        href={url}
                        download={file.name}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Download className="mr-1 h-4 w-4" /> Download
                      </a>
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {f && (
          <div className="space-y-1 text-xs text-muted-foreground">
            {f.recordedByName && <p>Recorded by {f.recordedByName}</p>}
            {f.approvedByName && <p>Approved by {f.approvedByName}</p>}
            {f.notes && <p>Notes: {f.notes}</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
