import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Eye, Paperclip, Plus, Repeat, Undo2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  approveTaxFiling,
  rejectTaxFiling,
  type TaxObligation,
} from "@/lib/crm/finance-api";
import {
  TAX_TYPES,
  docCount,
  formatMoney,
  isOverdue,
  statusBadgeClass,
  taxTypeLabel,
} from "./taxConstants";

type StatusFilter = "all" | "Filed" | "Pending approval" | "Draft" | "Overdue";

export function TaxCalendarTab({
  obligations,
  onAdd,
  onRecord,
  onViewDocs,
}: {
  obligations: TaxObligation[];
  onAdd: () => void;
  onRecord: (o: TaxObligation) => void;
  onViewDocs: (o: TaxObligation) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  // The account owner has the final say on every filing.
  const isOwner = user?.userType === "tenant";

  const [year, setYear] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sendBack, setSendBack] = useState<TaxObligation | null>(null);
  const [reason, setReason] = useState("");

  const years = useMemo(
    () =>
      Array.from(new Set(obligations.map((o) => o.periodYear))).sort(
        (a, b) => b - a,
      ),
    [obligations],
  );

  const rows = useMemo(
    () =>
      obligations.filter((o) => {
        if (year !== "all" && String(o.periodYear) !== year) return false;
        if (type !== "all" && o.type !== type) return false;
        if (status === "Overdue") return isOverdue(o);
        if (status === "Draft") return o.status === "Draft";
        if (status !== "all") return o.status === status;
        return true;
      }),
    [obligations, year, type, status],
  );

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["taxObligations"] });
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const approveMut = useMutation({
    mutationFn: (id: string) => approveTaxFiling(id),
    onSuccess: (o) => {
      refresh();
      toast({ title: "Filing approved", description: `${o.name} is filed.` });
    },
    onError: onErr("Failed to approve"),
  });
  const rejectMut = useMutation({
    mutationFn: () => rejectTaxFiling(sendBack!._id, reason.trim()),
    onSuccess: (o) => {
      refresh();
      setSendBack(null);
      setReason("");
      toast({
        title: "Sent back",
        description: `${o.filing?.recordedByName || "The preparer"} has been told why.`,
      });
    },
    onError: onErr("Failed to send back"),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Year of Income
            </Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tax Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {TAX_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as StatusFilter)}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Filed">Filed</SelectItem>
                <SelectItem value="Pending approval">
                  Pending approval
                </SelectItem>
                <SelectItem value="Draft">Draft / Unfiled</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add obligation
        </Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Obligation</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => {
                const overdue = isOverdue(t);
                const files = docCount(t);
                return (
                  <TableRow key={t._id}>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1.5 font-medium">
                        {t.name}
                        {t.recurring && (
                          <Repeat
                            className="h-3.5 w-3.5 text-muted-foreground"
                            aria-label="Recurring"
                          />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {taxTypeLabel(t.type)}
                        {t.responsibleName && ` · ${t.responsibleName}`}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{t.period}</TableCell>
                    <TableCell className="text-sm">
                      {t.dueOn?.slice(0, 10)}
                    </TableCell>
                    <TableCell className="text-sm font-semibold">
                      {formatMoney(t.amount, t.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs ${statusBadgeClass(t.status, overdue)}`}
                      >
                        {t.status === "Draft" && overdue ? "Overdue" : t.status}
                      </Badge>
                      {t.status === "Draft" && t.filing?.rejectedReason && (
                        <p
                          className="mt-1 max-w-[14rem] text-xs text-destructive"
                          title={t.filing.rejectedReason}
                        >
                          Sent back: {t.filing.rejectedReason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {files ? (
                        <button
                          type="button"
                          onClick={() => onViewDocs(t)}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Paperclip className="h-3.5 w-3.5" /> {files}{" "}
                          {files === 1 ? "file" : "files"}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No files
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        {t.status === "Draft" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRecord(t)}
                          >
                            {t.filing?.rejectedReason
                              ? "Resubmit"
                              : "Record filing"}
                          </Button>
                        )}
                        {t.status === "Pending approval" &&
                          (isOwner ? (
                            <>
                              <Button
                                size="sm"
                                disabled={approveMut.isPending}
                                onClick={() => approveMut.mutate(t._id)}
                              >
                                <Check className="mr-1 h-4 w-4" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSendBack(t)}
                              >
                                <Undo2 className="mr-1 h-4 w-4" /> Send back
                              </Button>
                            </>
                          ) : (
                            <span className="self-center text-xs text-muted-foreground">
                              Awaiting owner
                            </span>
                          ))}
                        {t.status !== "Draft" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="View documents"
                            onClick={() => onViewDocs(t)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!rows.length && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    {obligations.length
                      ? "Nothing matches these filters."
                      : "No obligations on the calendar yet."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={!!sendBack}
        onOpenChange={(o) => {
          if (!o) {
            setSendBack(null);
            setReason("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send filing back</DialogTitle>
            <DialogDescription>
              {sendBack &&
                `${sendBack.name} goes back to ${sendBack.filing?.recordedByName || "the preparer"} to correct and resubmit.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>What needs fixing?</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendBack(null)}>
              Cancel
            </Button>
            <Button
              disabled={!reason.trim() || rejectMut.isPending}
              onClick={() => rejectMut.mutate()}
            >
              Send back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
