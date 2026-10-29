import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  createConvertible,
  deleteConvertible,
  fetchConvertibles,
  removeConvertibleDocument,
  updateConvertible,
  uploadConvertibleDocument,
  type CapTable,
  type Convertible,
  type ConvertibleStatus,
  type ConvertibleType,
} from "@/lib/grc/ownership-api";
import {
  ConfirmDialog,
  DocChips,
  EmptyState,
  Field,
  UploadButton,
  errMsg,
  fmtDate,
  invalidateOwnership,
  todayInput,
} from "../shared";

const TRIGGERS = [
  "Qualified financing round",
  "Change of control",
  "IPO",
  "Maturity date",
  "At investor option",
];
const STATUS_TONE: Record<ConvertibleStatus, string> = {
  Outstanding: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  Converted: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  Cancelled: "bg-muted text-muted-foreground",
};

function ConvertibleDialog({
  open,
  onOpenChange,
  baseCurrency,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  baseCurrency: string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [type, setType] = useState<ConvertibleType>("SAFE");
  const [investor, setInvestor] = useState("");
  const [amount, setAmount] = useState("");
  const [cap, setCap] = useState("");
  const [discount, setDiscount] = useState("");
  const [date, setDate] = useState(todayInput());
  const [trigger, setTrigger] = useState(TRIGGERS[0]);
  const [interest, setInterest] = useState("");
  const [maturity, setMaturity] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const mut = useMutation({
    mutationFn: async () => {
      const created = await createConvertible({
        type,
        investor: investor.trim(),
        amount: Number(amount),
        valuationCap: cap === "" ? 0 : Number(cap),
        discount: discount === "" ? 0 : Number(discount),
        dateIssued: date,
        trigger,
        notes: notes.trim(),
        ...(type === "Convertible Note"
          ? {
              interestRate: interest === "" ? 0 : Number(interest),
              maturityDate: maturity || undefined,
            }
          : {}),
      });
      if (file) await uploadConvertibleDocument(created._id, file);
    },
    onSuccess: () => {
      invalidateOwnership(qc);
      toast({ title: "Instrument added" });
      onOpenChange(false);
      setInvestor("");
      setAmount("");
      setCap("");
      setDiscount("");
      setNotes("");
      setFile(null);
    },
    onError: (e) =>
      toast({
        title: "Couldn't add the instrument",
        description: errMsg(e),
        variant: "destructive",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add convertible instrument</DialogTitle>
          <DialogDescription>
            A SAFE or convertible note turns into shares later, at a discount or
            capped valuation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Instrument type">
              <Select
                value={type}
                onValueChange={(v) => setType(v as ConvertibleType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAFE">SAFE</SelectItem>
                  <SelectItem value="Convertible Note">
                    Convertible note
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Investor name">
              <Input
                value={investor}
                onChange={(e) => setInvestor(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Investment amount (${baseCurrency})`}>
              <Input
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label={`Valuation cap (${baseCurrency})`}>
              <Input
                type="number"
                min={0}
                value={cap}
                onChange={(e) => setCap(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Discount rate (%)">
              <Input
                type="number"
                min={0}
                max={100}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </Field>
            <Field label="Date issued">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Conversion trigger">
            <Select value={trigger} onValueChange={setTrigger}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGERS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {type === "Convertible Note" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Interest rate (% a year)">
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                />
              </Field>
              <Field label="Maturity date">
                <Input
                  type="date"
                  value={maturity}
                  onChange={(e) => setMaturity(e.target.value)}
                />
              </Field>
            </div>
          )}
          <Field label="Notes / terms">
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <Field
            label="Document (optional)"
            hint="The SAFE, note or term sheet."
          >
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={
              mut.isPending || !investor.trim() || !(Number(amount) > 0)
            }
            onClick={() => mut.mutate()}
          >
            {mut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add instrument
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConvertiblesPanel({
  cap,
  money,
}: {
  cap: CapTable;
  money: (n: number) => string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Convertible | null>(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ["cap-convertibles"],
    queryFn: fetchConvertibles,
  });

  const refresh = () =>
    qc.invalidateQueries({ queryKey: ["cap-convertibles"] });
  const fail = (title: string) => (e: unknown) =>
    toast({ title, description: errMsg(e), variant: "destructive" });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ConvertibleStatus }) =>
      updateConvertible(id, { status }),
    onSuccess: refresh,
    onError: fail("Couldn't update the status"),
  });
  const upload = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      uploadConvertibleDocument(id, file),
    onSuccess: refresh,
    onError: fail("Couldn't upload that file"),
  });
  const removeDoc = useMutation({
    mutationFn: ({ id, index }: { id: string; index: number }) =>
      removeConvertibleDocument(id, index),
    onSuccess: refresh,
    onError: fail("Couldn't remove that file"),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteConvertible(id),
    onSuccess: () => {
      refresh();
      toast({ title: "Instrument deleted" });
      setToDelete(null);
    },
    onError: fail("Couldn't delete that instrument"),
  });

  const outstanding = data.filter((c) => c.status === "Outstanding");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Add convertible instrument
        </Button>
      </div>

      {outstanding.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {outstanding.map((c) => (
            <Card key={c._id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{c.type}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {fmtDate(c.dateIssued)}
                  </span>
                </div>
                <p className="font-semibold">{c.investor}</p>
                <p className="text-xl font-bold tabular-nums">
                  {money(c.amount)}
                </p>
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <span>
                    Cap: {c.valuationCap ? money(c.valuationCap) : "none"}
                  </span>
                  <span>
                    Discount: {c.discount ? `${c.discount}%` : "none"}
                  </span>
                  <span className="col-span-2">Converts on: {c.trigger}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Convertible instruments register
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : data.length === 0 ? (
            <EmptyState
              title="No convertible instruments"
              hint="Record SAFEs and convertible notes here so you can model their conversion in the Simulation tab."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Investor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Cap</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Maturity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((c) => (
                  <TableRow key={c._id}>
                    <TableCell>{c.type}</TableCell>
                    <TableCell className="font-medium">{c.investor}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(c.amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.valuationCap ? money(c.valuationCap) : "—"}
                    </TableCell>
                    <TableCell>{c.discount ? `${c.discount}%` : "—"}</TableCell>
                    <TableCell className="tabular-nums">
                      {fmtDate(c.dateIssued)}
                    </TableCell>
                    <TableCell className="text-xs">{c.trigger}</TableCell>
                    <TableCell>
                      {c.interestRate != null ? `${c.interestRate}%` : "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {fmtDate(c.maturityDate)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={c.status}
                        onValueChange={(v) =>
                          setStatus.mutate({
                            id: c._id,
                            status: v as ConvertibleStatus,
                          })
                        }
                      >
                        <SelectTrigger
                          className={`h-7 w-32 text-xs border ${STATUS_TONE[c.status]}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["Outstanding", "Converted", "Cancelled"].map(
                            (s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="min-w-40">
                      <div className="space-y-1">
                        <DocChips
                          docs={c.documents}
                          onRemove={(index) =>
                            removeDoc.mutate({ id: c._id, index })
                          }
                        />
                        <UploadButton
                          pending={
                            upload.isPending && upload.variables?.id === c._id
                          }
                          onFile={(file) => upload.mutate({ id: c._id, file })}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setToDelete(c)}
                        title="Delete"
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

      <ConvertibleDialog
        open={open}
        onOpenChange={setOpen}
        baseCurrency={cap.baseCurrency}
      />
      <ConfirmDialog
        open={!!toDelete}
        title={`Delete the ${toDelete?.type} for ${toDelete?.investor}?`}
        description="This removes the record and its attached documents list. It can't be undone."
        pending={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete._id)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
