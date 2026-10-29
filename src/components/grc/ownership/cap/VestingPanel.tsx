import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  createVesting,
  deleteVesting,
  fetchVesting,
  type CapTable,
  type VestingRow,
} from "@/lib/grc/ownership-api";
import {
  ConfirmDialog,
  EmptyState,
  Field,
  errMsg,
  fmtDate,
  fmtNum,
  fmtPct,
  invalidateOwnership,
  todayInput,
} from "../shared";

function VestingDialog({
  open,
  onOpenChange,
  cap,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cap: CapTable;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [holder, setHolder] = useState("");
  const [classId, setClassId] = useState("");
  const [total, setTotal] = useState("");
  const [grant, setGrant] = useState(todayInput());
  const [cliff, setCliff] = useState("12");
  const [period, setPeriod] = useState("48");
  const mut = useMutation({
    mutationFn: () =>
      createVesting({
        holderNodeId: holder,
        shareClassId: classId || undefined,
        grantDate: grant,
        totalShares: Number(total),
        cliffMonths: Number(cliff),
        periodMonths: Number(period),
      }),
    onSuccess: () => {
      invalidateOwnership(qc);
      toast({ title: "Vesting schedule added" });
      onOpenChange(false);
      setTotal("");
    },
    onError: (e) =>
      toast({
        title: "Couldn't add the schedule",
        description: errMsg(e),
        variant: "destructive",
      }),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add vesting schedule</DialogTitle>
          <DialogDescription>
            Nothing vests before the cliff; at the cliff the time already served
            vests at once, then shares vest evenly each month to the end.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Holder">
            <Select value={holder} onValueChange={setHolder}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a shareholder" />
              </SelectTrigger>
              <SelectContent>
                {cap.holders.map((h) => (
                  <SelectItem key={h.nodeId} value={h.nodeId}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Total shares">
              <Input
                type="number"
                min={1}
                value={total}
                onChange={(e) => setTotal(e.target.value)}
              />
            </Field>
            <Field label="Grant date">
              <Input
                type="date"
                value={grant}
                onChange={(e) => setGrant(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Share class (optional)">
            <Select
              value={classId || "none"}
              onValueChange={(v) => setClassId(v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not specified</SelectItem>
                {cap.classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cliff (months)">
              <Input
                type="number"
                min={0}
                value={cliff}
                onChange={(e) => setCliff(e.target.value)}
              />
            </Field>
            <Field label="Vesting period (months)">
              <Input
                type="number"
                min={1}
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={mut.isPending || !holder || !(Number(total) > 0)}
            onClick={() => mut.mutate()}
          >
            {mut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function VestingPanel({
  cap,
  money,
}: {
  cap: CapTable;
  money: (n: number) => string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<VestingRow | null>(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ["cap-vesting"],
    queryFn: fetchVesting,
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteVesting(id),
    onSuccess: () => {
      invalidateOwnership(qc);
      toast({ title: "Schedule removed" });
      setToDelete(null);
    },
    onError: (e) => {
      toast({
        title: "Couldn't remove that schedule",
        description: errMsg(e),
        variant: "destructive",
      });
      setToDelete(null);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => setOpen(true)}
          disabled={cap.holders.length === 0}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Add vesting schedule
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vesting schedules</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : data.length === 0 ? (
            <EmptyState
              title="No vesting schedules"
              hint={
                cap.holders.length === 0
                  ? "Add a shareholder first."
                  : "Add a schedule for founders or employees whose shares vest over time."
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Holder</TableHead>
                  <TableHead>Grant date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Vested</TableHead>
                  <TableHead className="text-right">Unvested</TableHead>
                  <TableHead>Cliff</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">
                      {v.holder}
                      {v.className && (
                        <span className="block text-[11px] text-muted-foreground">
                          {v.className}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {fmtDate(v.grantDate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtNum(v.totalShares)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-emerald-600">
                      {fmtNum(v.vested)}
                      <span className="block text-[11px] font-normal text-muted-foreground">
                        {money(v.vestedValue)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtNum(v.unvested)}
                    </TableCell>
                    <TableCell>
                      {v.cliffMonths} mo
                      <span className="block text-[11px] text-muted-foreground">
                        {fmtDate(v.cliffDate)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {v.periodMonths} mo
                      <span className="block text-[11px] text-muted-foreground">
                        ends {fmtDate(v.endDate)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${v.vestedPct}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold tabular-nums">
                          {fmtPct(v.vestedPct)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setToDelete(v)}
                        title="Remove"
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
      </Card>
      <VestingDialog open={open} onOpenChange={setOpen} cap={cap} />
      <ConfirmDialog
        open={!!toDelete}
        title="Remove this vesting schedule?"
        description="This only removes the schedule — the shares themselves stay on the register."
        confirmLabel="Remove"
        pending={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
