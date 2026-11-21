import { defaultCurrency } from "@/lib/currency";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, Pencil, Plus, RefreshCw, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  createRemittanceAccount,
  fetchRemittanceAccounts,
  setRemittanceAccountActive,
  setRemittanceAccountPrimary,
  updateRemittanceAccount,
  type RemittanceAccount,
} from "@/lib/crm/finance-api";
import {
  Field,
  NumberInput,
  SectionFooter,
  SETTINGS_LOG_KEY,
  SettingsCard,
  ToggleRow,
  useFinanceSettings,
  useSectionForm,
} from "./shared";

const EMPTY = () => ({
  accountName: "",
  bankName: "",
  accountNumber: "",
  currency: defaultCurrency(),
  branchCode: "",
  swiftCode: "",
  description: "",
});

export default function BankAccountsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data } = useFinanceSettings();
  const form = useSectionForm("banking", data?.settings.banking);
  const baseCurrency = data?.profile.baseCurrency ?? "";

  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message ?? "Please try again.",
      variant: "destructive",
    });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["remittanceAccounts"] });
    // Every change here lands in the Change Log.
    queryClient.invalidateQueries({ queryKey: SETTINGS_LOG_KEY });
  };

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["remittanceAccounts"],
    queryFn: fetchRemittanceAccounts,
  });

  // One dialog for add and edit.
  const [dialog, setDialog] = useState<
    { mode: "add" } | { mode: "edit"; account: RemittanceAccount } | null
  >(null);
  const [draft, setDraft] = useState(EMPTY());
  const openAdd = () => {
    setDraft({ ...EMPTY(), currency: baseCurrency || defaultCurrency() });
    setDialog({ mode: "add" });
  };
  const openEdit = (a: RemittanceAccount) => {
    setDraft({
      accountName: a.accountName,
      bankName: a.bankName,
      accountNumber: a.accountNumber,
      currency: a.currency,
      branchCode: a.branchCode ?? "",
      swiftCode: a.swiftCode ?? "",
      description: a.description ?? "",
    });
    setDialog({ mode: "edit", account: a });
  };
  const saveMut = useMutation({
    mutationFn: () =>
      dialog?.mode === "edit"
        ? updateRemittanceAccount(dialog.account._id, draft)
        : createRemittanceAccount(draft),
    onSuccess: () => {
      refresh();
      toast({ title: dialog?.mode === "edit" ? "Bank account updated" : "Bank account added" });
      setDialog(null);
    },
    onError: onErr("Could not save the bank account"),
  });
  const activeMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      setRemittanceAccountActive(id, active),
    onSuccess: refresh,
    onError: onErr("Could not update the account"),
  });
  const primaryMut = useMutation({
    mutationFn: (id: string) => setRemittanceAccountPrimary(id),
    onSuccess: () => {
      refresh();
      toast({ title: "Primary account updated" });
    },
    onError: onErr("Could not set the primary account"),
  });

  const d = form.draft;
  const valid =
    draft.accountName.trim() &&
    draft.bankName.trim() &&
    draft.accountNumber.trim() &&
    draft.currency.trim().length === 3;

  return (
    <div className="space-y-6">
      <SettingsCard
        icon={<Landmark className="h-4 w-4" />}
        title="Connected bank accounts"
        description="The accounts shown to your clients on invoices so they know where to send payment. A client sees the account matching the invoice currency; the primary account is listed first."
        action={
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add account
          </Button>
        }
      >
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && !accounts.length && (
          <p className="text-sm text-muted-foreground">
            No bank accounts yet. Clients won't see where to send payment until you add at least one.
          </p>
        )}
        {accounts.map((a) => (
          <div key={a._id} className="flex flex-wrap items-start gap-4 rounded-lg border p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Landmark className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">
                  {a.bankName} ({a.currency})
                </p>
                {a.isPrimary && (
                  <Badge className="text-[10px]">
                    <Star className="mr-1 h-3 w-3" /> Primary
                  </Badge>
                )}
                {!a.active && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    Hidden
                  </Badge>
                )}
              </div>
              {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
              <dl className="grid gap-x-6 gap-y-1 pt-1 text-xs sm:grid-cols-2">
                <div className="flex gap-2"><dt className="text-muted-foreground">Account name</dt><dd className="font-medium">{a.accountName}</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground">Account number</dt><dd className="font-mono">{a.accountNumber}</dd></div>
                {a.branchCode && <div className="flex gap-2"><dt className="text-muted-foreground">Branch</dt><dd className="font-mono">{a.branchCode}</dd></div>}
                {a.swiftCode && <div className="flex gap-2"><dt className="text-muted-foreground">SWIFT</dt><dd className="font-mono">{a.swiftCode}</dd></div>}
              </dl>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!a.isPrimary && a.active && (
                <Button size="sm" variant="outline" disabled={primaryMut.isPending} onClick={() => primaryMut.mutate(a._id)}>
                  Set primary
                </Button>
              )}
              <Button size="sm" variant="ghost" aria-label={`Edit ${a.bankName} ${a.currency}`} onClick={() => openEdit(a)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2" title={a.isPrimary ? "The primary account always shows on invoices" : undefined}>
                <span className="text-xs text-muted-foreground">{a.active ? "Visible to clients" : "Hidden"}</span>
                <Switch
                  checked={a.active}
                  disabled={a.isPrimary || activeMut.isPending}
                  onCheckedChange={(checked) => activeMut.mutate({ id: a._id, active: checked })}
                  aria-label={`Show ${a.bankName} ${a.currency} to clients`}
                />
              </div>
            </div>
          </div>
        ))}
      </SettingsCard>

      {d && (
        <>
          <SettingsCard
            icon={<RefreshCw className="h-4 w-4" />}
            title="Reconciliation rules"
            description="How bank transactions are matched to ledger entries."
            action={<Badge variant="outline" className="shrink-0 text-[10px] text-muted-foreground">Saved · not enforced yet</Badge>}
          >
            <Field label={`Matching tolerance (${baseCurrency})`} hint="A bank line within this amount of a ledger entry still counts as a match.">
              <NumberInput className="sm:max-w-[200px]" min={0} step={0.01} value={d.matchingTolerance} onChange={(v) => form.patch({ matchingTolerance: v })} />
            </Field>
            <ToggleRow
              title="Auto-match by reference"
              description="Match bank entries to invoices using payment references."
              checked={d.autoMatchByReference}
              onChange={(v) => form.patch({ autoMatchByReference: v })}
            />
            <ToggleRow
              title="Suggest rules from patterns"
              description="Learn recurring transactions and suggest matching rules."
              checked={d.suggestRules}
              onChange={(v) => form.patch({ suggestRules: v })}
            />
            <ToggleRow
              title="Flag unmatched entries"
              description={`Highlight bank entries that stay unmatched for more than ${d.flagUnmatchedAfterDays} days.`}
              checked={d.flagUnmatched}
              onChange={(v) => form.patch({ flagUnmatched: v })}
            />
            {d.flagUnmatched && (
              <Field label="Flag after (days)">
                <NumberInput className="sm:max-w-[200px]" min={1} max={365} value={d.flagUnmatchedAfterDays} onChange={(v) => form.patch({ flagUnmatchedAfterDays: v })} />
              </Field>
            )}
          </SettingsCard>
          <SectionFooter
            dirty={form.dirty}
            saving={form.saving}
            resetting={form.resetting}
            onSave={form.save}
            onDiscard={form.discard}
            onReset={form.reset}
            resetNote="Your bank accounts above are not affected."
          />
        </>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? "Edit bank account" : "Add bank account"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Account name</Label>
              <Input value={draft.accountName} onChange={(e) => setDraft({ ...draft, accountName: e.target.value })} placeholder="As it appears on the bank account" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bank name</Label>
                <Input value={draft.bankName} onChange={(e) => setDraft({ ...draft, bankName: e.target.value })} />
              </div>
              <div>
                <Label>Currency</Label>
                <Input value={draft.currency} maxLength={3} placeholder="e.g. USD, RWF" onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })} />
              </div>
            </div>
            <div>
              <Label>Account number</Label>
              <Input value={draft.accountNumber} onChange={(e) => setDraft({ ...draft, accountNumber: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Branch code (optional)</Label>
                <Input value={draft.branchCode} onChange={(e) => setDraft({ ...draft, branchCode: e.target.value })} />
              </div>
              <div>
                <Label>SWIFT code (optional)</Label>
                <Input value={draft.swiftCode} onChange={(e) => setDraft({ ...draft, swiftCode: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input value={draft.description} maxLength={200} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="e.g. Operating account for USD transactions" />
            </div>
            {dialog?.mode === "add" && !accounts.length && (
              <p className="text-xs text-muted-foreground">This will be your primary account.</p>
            )}
          </div>
          <DialogFooter>
            <Button disabled={!valid || saveMut.isPending} onClick={() => saveMut.mutate()}>
              {dialog?.mode === "edit" ? "Save changes" : "Add account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
