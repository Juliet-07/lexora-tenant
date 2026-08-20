import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Landmark, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchRemittanceAccounts,
  createRemittanceAccount,
  setRemittanceAccountActive,
} from "@/lib/crm/finance-api";

export default function PaymentDetails() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["remittanceAccounts"],
    queryFn: fetchRemittanceAccounts,
  });

  const [newOpen, setNewOpen] = useState(false);
  const [draft, setDraft] = useState({
    accountName: "",
    bankName: "",
    accountNumber: "",
    currency: "USD",
    branchCode: "",
    swiftCode: "",
  });
  const createMut = useMutation({
    mutationFn: () => createRemittanceAccount(draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["remittanceAccounts"] });
      setNewOpen(false);
      setDraft({
        accountName: "",
        bankName: "",
        accountNumber: "",
        currency: "USD",
        branchCode: "",
        swiftCode: "",
      });
      toast({ title: "Payment details added" });
    },
    onError: onErr("Failed to add"),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      setRemittanceAccountActive(id, active),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["remittanceAccounts"] }),
    onError: onErr("Failed to update"),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Payment details</CardTitle>
            <CardDescription>
              The bank accounts shown to your clients on their invoices, so they
              know where to send payment. A client sees the account matching the
              invoice's currency automatically.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add account
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}
          {!isLoading && !accounts.length && (
            <p className="text-sm text-muted-foreground">
              No payment details added yet. Clients won't see where to send
              payment until you add at least one account.
            </p>
          )}
          {accounts.map((a) => (
            <div
              key={a._id}
              className="flex items-center gap-4 rounded-lg border p-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Landmark className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{a.accountName}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {a.currency}
                  </Badge>
                  {!a.active && (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-muted-foreground"
                    >
                      Inactive
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {a.bankName} · {a.accountNumber}
                  {a.branchCode && ` · Branch ${a.branchCode}`}
                  {a.swiftCode && ` · SWIFT ${a.swiftCode}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">
                  {a.active ? "Visible to clients" : "Hidden"}
                </span>
                <Switch
                  checked={a.active}
                  onCheckedChange={(checked) =>
                    toggleMut.mutate({ id: a._id, active: checked })
                  }
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add payment details</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Account name</Label>
              <Input
                value={draft.accountName}
                onChange={(e) =>
                  setDraft({ ...draft, accountName: e.target.value })
                }
                placeholder="e.g. as it appears on the bank account"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bank name</Label>
                <Input
                  value={draft.bankName}
                  onChange={(e) =>
                    setDraft({ ...draft, bankName: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Input
                  value={draft.currency}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      currency: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g. USD, RWF"
                  maxLength={3}
                />
              </div>
            </div>
            <div>
              <Label>Account number</Label>
              <Input
                value={draft.accountNumber}
                onChange={(e) =>
                  setDraft({ ...draft, accountNumber: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Branch code (optional)</Label>
                <Input
                  value={draft.branchCode}
                  onChange={(e) =>
                    setDraft({ ...draft, branchCode: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>SWIFT code (optional)</Label>
                <Input
                  value={draft.swiftCode}
                  onChange={(e) =>
                    setDraft({ ...draft, swiftCode: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !draft.accountName ||
                !draft.bankName ||
                !draft.accountNumber ||
                !draft.currency ||
                createMut.isPending
              }
              onClick={() => createMut.mutate()}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
