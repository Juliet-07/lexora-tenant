import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FilePlus2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
  createShareClass,
  deleteShareClass,
  updateShareClass,
  type CapTable,
  type DividendType,
  type ShareClass,
  type VotingKind,
} from "@/lib/grc/ownership-api";
import {
  ConfirmDialog,
  EmptyState,
  Field,
  errMsg,
  fmtNum,
  invalidateOwnership,
} from "../shared";

const DIVIDEND_TYPES: DividendType[] = [
  "Pro rata",
  "Cumulative preferred",
  "Non-cumulative preferred",
  "Non-participating",
];

function ClassDialog({
  open,
  onOpenChange,
  editing,
  baseCurrency,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: ShareClass | null;
  baseCurrency: string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [authorised, setAuthorised] = useState("");
  const [par, setPar] = useState("");
  const [voting, setVoting] = useState<VotingKind>("Yes");
  const [votingNote, setVotingNote] = useState("");
  const [liquidation, setLiquidation] = useState("Pari passu");
  const [conversion, setConversion] = useState("None");
  const [divType, setDivType] = useState<DividendType>("Pro rata");
  const [divRate, setDivRate] = useState("");
  const [rights, setRights] = useState("");

  // Re-seed whenever the dialog opens (for a different class or a new one).
  const [seededFor, setSeededFor] = useState<string | null>(null);
  const key = open ? (editing?.id ?? "new") : null;
  if (key !== seededFor) {
    setSeededFor(key);
    if (open) {
      setName(editing?.name ?? "");
      setAuthorised(editing ? String(editing.authorised) : "");
      setPar(editing ? String(editing.parValue) : "");
      setVoting(editing?.voting ?? "Yes");
      setVotingNote(editing?.votingNote ?? "");
      setLiquidation(editing?.liquidation ?? "Pari passu");
      setConversion(editing?.conversion ?? "None");
      setDivType(editing?.dividendType ?? "Pro rata");
      setDivRate(
        editing?.dividendRate != null ? String(editing.dividendRate) : "",
      );
      setRights(editing?.rights.join("\n") ?? "");
    }
  }

  const preferred = divType.includes("preferred");
  const mut = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        authorised: Number(authorised),
        parValue: par === "" ? 0 : Number(par),
        voting,
        votingNote: votingNote.trim(),
        liquidation,
        conversion,
        dividendType: divType,
        dividendRate: preferred && divRate !== "" ? Number(divRate) : undefined,
        rights: rights
          .split("\n")
          .map((r) => r.trim())
          .filter(Boolean),
      };
      return editing
        ? updateShareClass(editing.id, payload)
        : createShareClass(payload);
    },
    onSuccess: () => {
      invalidateOwnership(qc);
      toast({ title: editing ? "Share class updated" : "Share class added" });
      onOpenChange(false);
    },
    onError: (e) =>
      toast({
        title: "Couldn't save the share class",
        description: errMsg(e),
        variant: "destructive",
      }),
  });

  const submit = () => {
    if (!name.trim() || !(Number(authorised) >= 1)) {
      toast({
        title: "Enter a class name and the number of authorised shares",
        variant: "destructive",
      });
      return;
    }
    mut.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit share class" : "Add share class"}
          </DialogTitle>
          <DialogDescription>
            Authorised shares are the ceiling on what can be issued in this
            class.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Class name">
            <Input
              placeholder="e.g. Ordinary, Preference A"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Authorised shares">
              <Input
                type="number"
                min={1}
                value={authorised}
                onChange={(e) => setAuthorised(e.target.value)}
              />
            </Field>
            <Field label={`Par value (${baseCurrency})`}>
              <Input
                type="number"
                min={0}
                value={par}
                onChange={(e) => setPar(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Voting rights">
              <Select
                value={voting}
                onValueChange={(v) => setVoting(v as VotingKind)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Limited">Limited</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Liquidation">
              <Select value={liquidation} onValueChange={setLiquidation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Pari passu", "1x Preference", "2x Preference"].map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Conversion">
              <Select value={conversion} onValueChange={setConversion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["None", "Convertible to Ordinary"].map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          {voting === "Limited" && (
            <Field
              label="Voting limitation"
              hint="Limited votes don't count toward general voting power in the register."
            >
              <Input
                placeholder="e.g. Only on a variation of class rights"
                value={votingNote}
                onChange={(e) => setVotingNote(e.target.value)}
              />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dividend type">
              <Select
                value={divType}
                onValueChange={(v) => setDivType(v as DividendType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIVIDEND_TYPES.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {preferred && (
              <Field label="Dividend rate (% a year on par)">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  placeholder="e.g. 8"
                  value={divRate}
                  onChange={(e) => setDivRate(e.target.value)}
                />
              </Field>
            )}
          </div>
          <Field label="Rights & preferences (one per line)">
            <Textarea
              rows={3}
              placeholder={"Anti-dilution protection\nBoard seat"}
              value={rights}
              onChange={(e) => setRights(e.target.value)}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editing ? "Save" : "Add class"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const dividendLabel = (c: ShareClass) =>
  c.dividendType.includes("preferred") && c.dividendRate != null
    ? `${c.dividendType} · ${c.dividendRate}%`
    : c.dividendType;

export function ClassesPanel({
  cap,
  money,
  onIssue,
}: {
  cap: CapTable;
  money: (n: number) => string;
  onIssue: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<{
    open: boolean;
    editing: ShareClass | null;
  }>({
    open: false,
    editing: null,
  });
  const [toDelete, setToDelete] = useState<ShareClass | null>(null);

  const del = useMutation({
    mutationFn: (id: string) => deleteShareClass(id),
    onSuccess: () => {
      invalidateOwnership(qc);
      toast({ title: "Share class deleted" });
      setToDelete(null);
    },
    onError: (e) => {
      toast({
        title: "Couldn't delete that class",
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
          onClick={() => setDialog({ open: true, editing: null })}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Add share class
        </Button>
        <Button size="sm" variant="outline" onClick={onIssue}>
          <FilePlus2 className="h-4 w-4 mr-1.5" /> Issue shares
        </Button>
      </div>

      {cap.classes.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              title="No share classes yet"
              hint="Define your classes (e.g. Ordinary, Preference A) with their authorised amounts — shares can only be issued into a class."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cap.classes.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {c.holders} holder{c.holders === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title="Edit"
                        onClick={() => setDialog({ open: true, editing: c })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        title="Delete"
                        onClick={() => setToDelete(c)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      ["Issued", fmtNum(c.issued)],
                      ["Authorised", fmtNum(c.authorised)],
                      ["Par value", money(c.parValue)],
                    ].map(([l, v]) => (
                      <div key={l}>
                        <p className="text-[10px] text-muted-foreground">{l}</p>
                        <p className="text-sm font-semibold tabular-nums">
                          {v}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${Math.min(100, (c.issued / c.authorised) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {c.rights.map((r) => (
                      <Badge
                        key={r}
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {r}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Share class comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">Issued</TableHead>
                    <TableHead className="text-right">Authorised</TableHead>
                    <TableHead className="text-right">Par value</TableHead>
                    <TableHead>Voting</TableHead>
                    <TableHead>Dividend</TableHead>
                    <TableHead>Liquidation</TableHead>
                    <TableHead>Conversion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cap.classes.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtNum(c.issued)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtNum(c.authorised)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(c.parValue)}
                      </TableCell>
                      <TableCell>
                        {c.voting}
                        {c.voting === "Limited" && c.votingNote && (
                          <span className="block text-[11px] text-muted-foreground">
                            {c.votingNote}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{dividendLabel(c)}</TableCell>
                      <TableCell>{c.liquidation}</TableCell>
                      <TableCell>{c.conversion}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <ClassDialog
        open={dialog.open}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
        editing={dialog.editing}
        baseCurrency={cap.baseCurrency}
      />
      <ConfirmDialog
        open={!!toDelete}
        title={`Delete "${toDelete?.name}"?`}
        description="Only a class with no transactions or vesting schedules can be deleted."
        pending={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
