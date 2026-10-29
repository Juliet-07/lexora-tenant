import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogDescription,
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
  createShareTransaction,
  deleteShareTransaction,
  fetchShareTransactions,
  type CapTable,
  type ShareTransaction,
} from "@/lib/grc/ownership-api";
import { exportReportExcel } from "@/lib/grc/reportExport";
import {
  ConfirmDialog,
  EmptyState,
  Field,
  errMsg,
  fmtDate,
  fmtNum,
  invalidateOwnership,
  todayInput,
} from "../shared";

const TONE: Record<string, string> = {
  Issuance: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  Transfer: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  Buyback: "bg-red-500/10 text-red-700 border-red-500/30",
  Valuation: "bg-amber-500/10 text-amber-700 border-amber-500/30",
};

function ValuationDialog({
  open,
  onOpenChange,
  baseCurrency,
  current,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  baseCurrency: string;
  current: number;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(todayInput());
  const [note, setNote] = useState("");
  const mut = useMutation({
    mutationFn: () =>
      createShareTransaction({
        type: "Valuation",
        date,
        pricePerShare: Number(price),
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      invalidateOwnership(qc);
      toast({ title: "Valuation recorded" });
      onOpenChange(false);
      setPrice("");
      setNote("");
    },
    onError: (e) =>
      toast({
        title: "Couldn't record the valuation",
        description: errMsg(e),
        variant: "destructive",
      }),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record a valuation</DialogTitle>
          <DialogDescription>
            The latest valuation sets the price per share the register values
            every holding at. No shares move.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field
            label={`Price per share (${baseCurrency})`}
            hint={
              current
                ? `Currently ${current.toLocaleString("en-US")}`
                : undefined
            }
          >
            <Input
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
          <Field label="Date">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="Basis (optional)">
            <Input
              placeholder="e.g. Series A round, independent valuation"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={mut.isPending || !(Number(price) > 0)}
            onClick={() => mut.mutate()}
          >
            {mut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TransactionsPanel({
  cap,
  money,
}: {
  cap: CapTable;
  money: (n: number) => string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [valuationOpen, setValuationOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ShareTransaction | null>(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ["cap-transactions"],
    queryFn: fetchShareTransactions,
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteShareTransaction(id),
    onSuccess: () => {
      invalidateOwnership(qc);
      toast({ title: "Entry removed" });
      setToDelete(null);
    },
    onError: (e) => {
      toast({
        title: "Couldn't remove that entry",
        description: errMsg(e),
        variant: "destructive",
      });
      setToDelete(null);
    },
  });

  const rows = filter === "all" ? data : data.filter((t) => t.type === filter);

  const exportXlsx = () =>
    exportReportExcel({
      id: "share-transactions",
      title: "Share Transactions",
      subtitle: "Organisation Structure — Cap Table",
      summary: [
        { label: "Entries", value: rows.length },
        { label: "Currency", value: cap.baseCurrency },
      ],
      sections: [
        {
          heading: "Transactions",
          columns: [
            "Date",
            "Type",
            "From",
            "To",
            "Shares",
            "Class",
            `Price/share (${cap.baseCurrency})`,
            `Total (${cap.baseCurrency})`,
            "Reference",
            "Note",
          ],
          rows: rows.map((t) => [
            fmtDate(t.date),
            t.type,
            t.from ?? "—",
            t.to ?? "—",
            t.type === "Valuation" ? "—" : t.shares,
            t.className ?? "—",
            t.pricePerShare,
            t.value,
            t.reference,
            t.note,
          ]),
        },
      ],
    });

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Transaction history</CardTitle>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {["Issuance", "Transfer", "Buyback", "Valuation"].map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setValuationOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Record valuation
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={exportXlsx}
            disabled={!rows.length}
          >
            <Download className="h-4 w-4 mr-1.5" /> Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No transactions"
            hint="Issuances, transfers, buybacks and valuations will be listed here as you record them."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead>Class</TableHead>
                <TableHead className="text-right">Price / share</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="tabular-nums">
                    {fmtDate(t.date)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={TONE[t.type]}>
                      {t.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{t.from ?? "—"}</TableCell>
                  <TableCell>{t.to ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {t.type === "Valuation" ? "—" : fmtNum(t.shares)}
                  </TableCell>
                  <TableCell>{t.className ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(t.pricePerShare)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {t.type === "Valuation" ? "—" : money(t.value)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t.reference || t.note || "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      title="Remove entry"
                      onClick={() => setToDelete(t)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <ValuationDialog
        open={valuationOpen}
        onOpenChange={setValuationOpen}
        baseCurrency={cap.baseCurrency}
        current={cap.pricePerShare}
      />
      <ConfirmDialog
        open={!!toDelete}
        title="Remove this ledger entry?"
        description="Holdings are worked out from the ledger, so this is only allowed when no later transaction depends on it."
        confirmLabel="Remove"
        pending={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </Card>
  );
}
