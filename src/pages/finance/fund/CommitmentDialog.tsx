import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClientSelect } from "@/components/ClientDropdown";
import { useToast } from "@/hooks/use-toast";
import {
  createCommitment,
  updateCommitment,
  type CapitalCommitment,
  type CommitmentType,
} from "@/lib/crm/finance-api";
import {
  AML_KYC_STATUSES,
  SUBSCRIPTION_STATUSES,
  SectionTitle,
  errMessage,
  today,
} from "./fundShared";

const COMMITMENT_TYPES: CommitmentType[] = [
  "Institutional",
  "DFI",
  "Pension",
  "Family office",
  "Corporate",
  "HNW",
  "Trust",
  "GP commit",
];

const blank = (currency: string) => ({
  lpUserId: "",
  lpName: "",
  lpEmail: "",
  commitment: 0,
  type: "Institutional" as CommitmentType,
  currency,
  closeLabel: "1st",
  closeDate: today(),
  isGpCommitment: false,
  hasSideLetter: false,
  mgmtFeePctOverride: undefined as number | undefined,
  sideLetterNotes: "",
  amlKycStatus: "Pending",
  subscriptionStatus: "Not yet sent",
});

// Add an LP's commitment, or — when `existing` is given — update the
// details that change over an LP's life (contact email, AML/KYC and
// subscription status, type). The commitment amount itself is not
// editable once it feeds calls and the capital account.
export function CommitmentDialog({
  open,
  onOpenChange,
  fundId,
  currency,
  existing,
  invalidate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  fundId: string;
  currency: string;
  existing?: CapitalCommitment | null;
  invalidate: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState(blank(currency));
  const editing = !!existing;

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setForm({
        ...blank(currency),
        lpUserId: existing.lpUserId,
        lpName: existing.lpName,
        lpEmail: existing.lpEmail ?? "",
        commitment: existing.commitment,
        type: existing.type,
        amlKycStatus: existing.amlKycStatus ?? "Pending",
        subscriptionStatus: existing.subscriptionStatus ?? "Not yet sent",
        currency: existing.currency || currency,
      });
    } else {
      setForm(blank(currency));
    }
  }, [open, existing, currency]);

  const set = (patch: Partial<ReturnType<typeof blank>>) =>
    setForm((f) => ({ ...f, ...patch }));

  const save = useMutation({
    mutationFn: () =>
      editing
        ? updateCommitment(fundId, existing!._id, {
            lpEmail: form.lpEmail || undefined,
            amlKycStatus: form.amlKycStatus,
            subscriptionStatus: form.subscriptionStatus,
            type: form.type,
          })
        : createCommitment(fundId, {
            lpUserId: form.lpUserId,
            lpName: form.lpName,
            commitment: form.commitment,
            type: form.type,
            closeLabel: form.closeLabel,
            closeDate: form.closeDate,
            isGpCommitment: form.isGpCommitment,
            hasSideLetter: form.hasSideLetter,
            mgmtFeePctOverride: form.hasSideLetter
              ? form.mgmtFeePctOverride
              : undefined,
            sideLetterNotes: form.hasSideLetter
              ? form.sideLetterNotes
              : undefined,
            lpEmail: form.lpEmail || undefined,
            amlKycStatus: form.amlKycStatus,
            subscriptionStatus: form.subscriptionStatus,
            currency: form.currency,
          }),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["fundSideLetters", fundId] });
      onOpenChange(false);
      toast({ title: editing ? "LP details updated" : "Commitment added" });
    },
    onError: (e) =>
      toast({
        title: editing ? "Failed to update" : "Failed to add commitment",
        description: errMessage(e),
        variant: "destructive",
      }),
  });

  const emailBad = !!form.lpEmail && !/^\S+@\S+\.\S+$/.test(form.lpEmail);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? `LP details — ${existing!.lpName}` : "Add LP commitment"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          {!editing && (
            <>
              <SectionTitle>Investor</SectionTitle>
              <div>
                <Label>LP</Label>
                <ClientSelect
                  value={form.lpUserId}
                  onValueChange={(v) => set({ lpUserId: v })}
                  onClientChange={(c: any) =>
                    set({
                      lpName:
                        [c.firstName, c.lastName].filter(Boolean).join(" ") ||
                        c.businessName ||
                        c.email,
                      lpEmail: form.lpEmail || c.email || "",
                    })
                  }
                />
              </div>
            </>
          )}

          <div>
            <Label>LP email (where notices and reports are sent)</Label>
            <Input
              type="email"
              value={form.lpEmail}
              onChange={(e) => set({ lpEmail: e.target.value })}
              placeholder="investor@example.com"
            />
            {emailBad && (
              <p className="mt-1 text-xs text-destructive">
                Enter a valid email address
              </p>
            )}
          </div>

          <SectionTitle>Commitment</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Commitment</Label>
              <Input
                type="number"
                disabled={editing}
                value={form.commitment}
                onChange={(e) => set({ commitment: Number(e.target.value) })}
              />
              {editing && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Fixed once calls are made against it.
                </p>
              )}
            </div>
            <div>
              <Label>Investor type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => set({ type: v as CommitmentType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMITMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {!editing && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Close label</Label>
                <Input
                  value={form.closeLabel}
                  onChange={(e) => set({ closeLabel: e.target.value })}
                  placeholder="1st, 2nd, Final…"
                />
              </div>
              <div>
                <Label>Close date</Label>
                <Input
                  type="date"
                  value={form.closeDate}
                  onChange={(e) => set({ closeDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Input
                  value={form.currency}
                  onChange={(e) =>
                    set({ currency: e.target.value.toUpperCase() })
                  }
                  maxLength={3}
                />
              </div>
            </div>
          )}

          <SectionTitle>Onboarding</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>AML / KYC</Label>
              <Select
                value={form.amlKycStatus}
                onValueChange={(v) => set({ amlKycStatus: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AML_KYC_STATUSES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subscription agreement</Label>
              <Select
                value={form.subscriptionStatus}
                onValueChange={(v) => set({ subscriptionStatus: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBSCRIPTION_STATUSES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!editing && (
            <>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isGpCommitment}
                  onCheckedChange={(v) => set({ isGpCommitment: v })}
                />
                <Label>This is the GP's own commitment</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.hasSideLetter}
                  onCheckedChange={(v) => set({ hasSideLetter: v })}
                />
                <Label>Has a side letter</Label>
              </div>
              {form.hasSideLetter && (
                <>
                  <div>
                    <Label>Management fee override (%)</Label>
                    <Input
                      type="number"
                      value={form.mgmtFeePctOverride ?? ""}
                      onChange={(e) =>
                        set({
                          mgmtFeePctOverride: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Side letter notes</Label>
                    <Textarea
                      value={form.sideLetterNotes}
                      onChange={(e) => set({ sideLetterNotes: e.target.value })}
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Record the full terms under the Side letters tab.
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={
              save.isPending ||
              emailBad ||
              (!editing && (!form.lpUserId || !form.commitment))
            }
            onClick={() => save.mutate()}
          >
            {editing ? "Save changes" : "Add commitment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
