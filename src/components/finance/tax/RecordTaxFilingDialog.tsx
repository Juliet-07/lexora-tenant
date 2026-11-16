import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, FolderOpen, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { recordTaxFiling, type TaxObligation } from "@/lib/crm/finance-api";
import { taxTypeLabel } from "./taxConstants";

const todayStr = () => new Date().toISOString().slice(0, 10);

export function RecordTaxFilingDialog({
  obligation,
  onOpenChange,
}: {
  obligation: TaxObligation | null;
  onOpenChange: (o: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isOwner = user?.userType === "tenant";

  const [filedOn, setFiledOn] = useState(todayStr());
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [returnFile, setReturnFile] = useState<File | null>(null);
  const [popFile, setPopFile] = useState<File | null>(null);

  // A filing sent back by the owner keeps its documents — the person
  // resubmitting only has to replace what was wrong.
  const kept = obligation?.filing ?? null;

  useEffect(() => {
    if (!obligation) return;
    setFiledOn(kept?.filedOn ? kept.filedOn.slice(0, 10) : todayStr());
    setAmount(String(kept?.amountPaid ?? obligation.amount ?? 0));
    setNotes(kept?.notes ?? "");
    setReturnFile(null);
    setPopFile(null);
  }, [obligation]); // eslint-disable-line react-hooks/exhaustive-deps

  const needReturn =
    !!obligation?.requireDocuments && !returnFile && !kept?.returnFile;
  const needPop = !!obligation?.requireDocuments && !popFile && !kept?.popFile;
  const valid = !!filedOn && !needReturn && !needPop;

  const mut = useMutation({
    mutationFn: () =>
      recordTaxFiling(obligation!._id, {
        filedOn,
        amountPaid: amount === "" ? undefined : Number(amount),
        notes: notes.trim() || undefined,
        returnFile,
        popFile,
      }),
    onSuccess: (o) => {
      queryClient.invalidateQueries({ queryKey: ["taxObligations"] });
      onOpenChange(false);
      toast(
        o.status === "Filed"
          ? {
              title: "Filing recorded and archived",
              description: `${o.name} is filed.`,
            }
          : {
              title: "Sent to the account owner",
              description: `${o.name} is waiting for the owner's approval.`,
            },
      );
    },
    onError: (err: any) =>
      toast({
        title: "Failed to record filing",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const cur = obligation?.currency || "RWF";

  return (
    <Dialog open={!!obligation} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record filing</DialogTitle>
          <DialogDescription>
            {obligation &&
              `${taxTypeLabel(obligation.type)} · ${obligation.period}`}
          </DialogDescription>
        </DialogHeader>

        {obligation && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              <FolderOpen className="h-4 w-4 shrink-0" />
              Archive / {obligation.periodYear} / {obligation.period} /{" "}
              {taxTypeLabel(obligation.type)}
            </div>

            {kept?.rejectedReason && (
              <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">
                    Sent back by the account owner
                  </p>
                  <p className="text-muted-foreground">{kept.rejectedReason}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Filing date</Label>
                <Input
                  type="date"
                  max={todayStr()}
                  value={filedOn}
                  onChange={(e) => setFiledOn(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Amount paid ({cur})</Label>
                <Input
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Tax return (PDF, XLSX or CSV)
                {obligation.requireDocuments && " *"}
              </Label>
              <Input
                type="file"
                accept=".pdf,.xlsx,.xls,.csv"
                onChange={(e) => setReturnFile(e.target.files?.[0] ?? null)}
              />
              {kept?.returnFile && !returnFile && (
                <p className="text-xs text-muted-foreground">
                  Keeping {kept.returnFile.name}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>
                Proof of payment (PDF, PNG or JPG)
                {obligation.requireDocuments && " *"}
              </Label>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => setPopFile(e.target.files?.[0] ?? null)}
              />
              {kept?.popFile && !popFile && (
                <p className="text-xs text-muted-foreground">
                  Keeping {kept.popFile.name}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Acknowledgement number, remarks…"
              />
            </div>

            <div className="flex gap-2 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {isOwner
                ? "You are the account owner, so this is filed and archived straight away."
                : "The account owner has the final say. This goes to them for approval, and it is filed once they approve."}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!valid || mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending
              ? "Saving…"
              : isOwner
                ? "Record and archive"
                : "Submit for approval"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
