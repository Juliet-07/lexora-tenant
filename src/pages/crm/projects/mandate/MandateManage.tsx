import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { HrTeam } from "@/lib/hr/hr-api";
import { withBase } from "@/lib/currency";
import {
  deleteMandate,
  fetchMandateDeleteImpact,
  MANDATE_CURRENCIES,
  updateMandate,
  type FeeStructure,
  type Mandate,
} from "@/lib/crm/mandates-api";

const FEE_STRUCTURES: FeeStructure[] = [
  "Fixed fee",
  "Time & materials",
  "Retainer",
  "Capped fee",
];

export function hodName(team?: HrTeam | null): string | null {
  return team?.headOfDepartment
    ? `${team.headOfDepartment.firstName} ${team.headOfDepartment.lastName}`.trim()
    : null;
}

// ── Edit ────────────────────────────────────────────────────────

export function EditMandateDialog({
  mandate,
  teams,
  open,
  onOpenChange,
}: {
  mandate: Mandate;
  teams: HrTeam[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const build = () => ({
    name: mandate.name,
    description: mandate.description ?? "",
    teamId: mandate.teamId ?? "",
    budget: mandate.budget,
    currency: mandate.currency ?? "USD",
    targetDate: mandate.targetDate?.slice(0, 10) ?? "",
    feeStructure: mandate.feeStructure,
    partiesText: (mandate.parties ?? []).join(", "),
  });
  const [draft, setDraft] = useState(build);
  useEffect(() => {
    if (open) setDraft(build());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mandate._id]);

  const team = teams.find((t) => t._id === draft.teamId);
  const teamChanged = draft.teamId !== (mandate.teamId ?? "");

  const saveMut = useMutation({
    mutationFn: () =>
      updateMandate(mandate._id, {
        name: draft.name.trim(),
        description: draft.description,
        ...(draft.teamId && teamChanged ? { teamId: draft.teamId } : {}),
        budget: Number(draft.budget) || 0,
        ...(draft.currency !== (mandate.currency ?? "USD")
          ? { currency: draft.currency }
          : {}),
        targetDate: draft.targetDate || undefined,
        feeStructure: draft.feeStructure,
        parties: draft.partiesText
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mandates"] });
      toast({ title: "Mandate updated" });
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast({
        title: "Could not update mandate",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit mandate</DialogTitle>
          <DialogDescription>
            {mandate.ref} · {mandate.clientName}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Mandate name</Label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Team</Label>
              <Select
                value={draft.teamId}
                onValueChange={(v) => setDraft({ ...draft, teamId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Manager</Label>
              <Input
                readOnly
                disabled
                value={
                  team
                    ? (hodName(team) ?? "No Head of Department yet")
                    : mandate.manager || "—"
                }
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            The manager is always the Head of Department of the selected team.
            {teamChanged && " Changing the team changes the manager."}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fee structure</Label>
              <Select
                value={draft.feeStructure}
                onValueChange={(v) =>
                  setDraft({ ...draft, feeStructure: v as FeeStructure })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEE_STRUCTURES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target date</Label>
              <Input
                type="date"
                value={draft.targetDate}
                onChange={(e) =>
                  setDraft({ ...draft, targetDate: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
                  {withBase(
                    MANDATE_CURRENCIES.includes(draft.currency)
                      ? MANDATE_CURRENCIES
                      : [draft.currency, ...MANDATE_CURRENCIES],
                  ).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Budget ({draft.currency})</Label>
              <Input
                type="number"
                value={draft.budget}
                onChange={(e) =>
                  setDraft({ ...draft, budget: Number(e.target.value) })
                }
              />
            </div>
          </div>
          {draft.currency !== (mandate.currency ?? "USD") && (
            <p className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
              The budget is not converted — enter it in {draft.currency}. Time
              and invoices already recorded keep the currency they were recorded
              in.
            </p>
          )}
          <div>
            <Label>Other parties</Label>
            <Input
              placeholder="Comma-separated"
              value={draft.partiesText}
              onChange={(e) =>
                setDraft({ ...draft, partiesText: e.target.value })
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={saveMut.isPending || !draft.name.trim()}
            onClick={() => saveMut.mutate()}
          >
            {saveMut.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete ──────────────────────────────────────────────────────

const DELETE_LABELS: Record<string, string> = {
  tasks: "tasks",
  timeEntries: "time entries",
  clientMessages: "client messages",
  employeeMessages: "team messages",
  notes: "notes",
  documents: "documents",
  threadReads: "message read markers",
  portfolioRisks: "risk records",
  quotes: "quotes",
  recurringInvoices: "recurring invoices",
  invoices: "invoices",
  payments: "payments",
  creditNotes: "credit notes",
};

const DETACH_LABELS: Record<string, string> = {
  trustLedgers: "trust ledgers",
  expenseClaims: "expense claims",
  contracts: "contracts",
  adrCases: "ADR cases",
  litigationCases: "litigation cases",
};

export function DeleteMandateDialog({
  mandate,
  open,
  onOpenChange,
  onDeleted,
}: {
  mandate: Mandate;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDeleted: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (open) setConfirmText("");
  }, [open]);

  const { data: impact, isLoading } = useQuery({
    queryKey: ["mandateDeleteImpact", mandate._id],
    queryFn: () => fetchMandateDeleteImpact(mandate._id),
    enabled: open,
    staleTime: 0,
  });

  const delMut = useMutation({
    mutationFn: () => deleteMandate(mandate._id),
    onSuccess: () => {
      // Tasks, billing, time and communications for this mandate are all
      // gone — refresh everything that might be showing them.
      queryClient.invalidateQueries();
      toast({
        title: "Mandate deleted",
        description: `${mandate.ref} and everything tied to it was removed.`,
      });
      onOpenChange(false);
      onDeleted();
    },
    onError: (err: any) =>
      toast({
        title: "Could not delete mandate",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const deleteRows = Object.entries(impact?.willDelete ?? {}).filter(
    ([, n]) => n > 0,
  );
  const detachRows = Object.entries(impact?.willDetach ?? {}).filter(
    ([, n]) => n > 0,
  );
  const confirmed = confirmText.trim() === mandate.ref;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Delete mandate
          </DialogTitle>
          <DialogDescription>
            {mandate.ref} · {mandate.name}. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {isLoading && (
            <p className="text-muted-foreground">Checking what is linked…</p>
          )}
          {impact && (
            <>
              <div>
                <p className="font-medium">
                  These will be permanently deleted:
                </p>
                {deleteRows.length ? (
                  <ul className="mt-1 grid grid-cols-2 gap-x-4 text-muted-foreground">
                    {deleteRows.map(([k, n]) => (
                      <li key={k}>
                        {n} {DELETE_LABELS[k] ?? k}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">
                    Nothing else is attached to this mandate.
                  </p>
                )}
              </div>
              {impact.paidInvoiceCount > 0 && (
                <p className="rounded border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                  {impact.paidInvoiceCount} invoice
                  {impact.paidInvoiceCount === 1 ? " has" : "s have"} payments
                  recorded. Deleting them also removes the matching bank
                  receipts and ledger entries, so bank balances and reports will
                  change.
                </p>
              )}
              {detachRows.length > 0 && (
                <div>
                  <p className="font-medium">
                    These are kept, but no longer linked to this mandate:
                  </p>
                  <ul className="mt-1 grid grid-cols-2 gap-x-4 text-muted-foreground">
                    {detachRows.map(([k, n]) => (
                      <li key={k}>
                        {n} {DETACH_LABELS[k] ?? k}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          <div>
            <Label>
              Type <span className="font-mono">{mandate.ref}</span> to confirm
            </Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={mandate.ref}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!confirmed || delMut.isPending || isLoading}
            onClick={() => delMut.mutate()}
          >
            {delMut.isPending ? "Deleting…" : "Delete mandate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
