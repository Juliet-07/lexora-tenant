import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchEmployees } from "@/lib/hr/hr-api";
import {
  fetchRateCards,
  upsertRateCard,
  type RateCard,
} from "@/lib/crm/time-tracking-api";

const money = (n: number, c = "USD") =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: c,
    maximumFractionDigits: 0,
  });

export function RateCardsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: rateCards = [], isLoading } = useQuery({
    queryKey: ["rateCards"],
    queryFn: fetchRateCards,
  });
  const { data: employeesPage } = useQuery({
    queryKey: ["hr-employees-all"],
    queryFn: () => fetchEmployees({ limit: 500 }),
    retry: false,
  });
  const employees = employeesPage?.items ?? [];

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    employeeUserId: "",
    member: "",
    role: "",
    standardRate: 0,
    currency: "USD",
  });

  const upsertMut = useMutation({
    mutationFn: () =>
      upsertRateCard(draft.employeeUserId, {
        member: draft.member,
        role: draft.role,
        standardRate: Number(draft.standardRate) || 0,
        currency: draft.currency,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rateCards"] });
      setOpen(false);
      toast({ title: "Rate card saved" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to save",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const openNew = () => {
    setDraft({
      employeeUserId: "",
      member: "",
      role: "",
      standardRate: 0,
      currency: "USD",
    });
    setOpen(true);
  };
  const openEdit = (r: RateCard) => {
    setDraft({
      employeeUserId: r.employeeUserId,
      member: r.member,
      role: r.role,
      standardRate: r.standardRate,
      currency: r.currency,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Add rate card
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Standard rate</TableHead>
                <TableHead className="text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              ) : (
                rateCards.map((r) => (
                  <TableRow key={r._id}>
                    <TableCell className="text-sm font-medium">
                      {r.member}
                    </TableCell>
                    <TableCell className="text-sm">{r.role || "—"}</TableCell>
                    <TableCell className="text-right text-sm">
                      {money(r.standardRate, r.currency)}/hr
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(r)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!isLoading && !rateCards.length && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No rate cards yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {draft.employeeUserId ? "Edit rate card" : "New rate card"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Employee</Label>
              <Select
                value={draft.employeeUserId}
                onValueChange={(v) => {
                  const e = employees.find((x: any) => x._id === v);
                  setDraft({
                    ...draft,
                    employeeUserId: v,
                    member: e ? `${e.firstName} ${e.lastName}` : draft.member,
                    role: e?.jobTitle ?? draft.role,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e._id} value={e._id}>
                      {e.firstName} {e.lastName}
                      {e.jobTitle ? ` · ${e.jobTitle}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Standard rate ({draft.currency}/hr)</Label>
                <Input
                  type="number"
                  value={draft.standardRate}
                  onChange={(e) =>
                    setDraft({ ...draft, standardRate: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Select
                  value={draft.currency}
                  onValueChange={(v) => setDraft({ ...draft, currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["USD", "EUR", "GBP", "NGN", "ZAR"].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                upsertMut.isPending ||
                !draft.employeeUserId ||
                !draft.standardRate
              }
              onClick={() => upsertMut.mutate()}
            >
              {upsertMut.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
