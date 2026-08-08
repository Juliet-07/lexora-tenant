import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Banknote, ArrowDownToLine, ArrowUpFromLine, ShieldCheck, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  trustAccounts as seedAccounts,
  trustMovements as seedMovements,
  TrustAccount,
  TrustMovement,
  money,
  pmInvoices,
} from "@/data/crmPmMockData";

export default function TrustAccounting() {
  const [accounts, setAccounts] = useState<TrustAccount[]>(seedAccounts);
  const [movements, setMovements] = useState<TrustMovement[]>(seedMovements);
  const [selected, setSelected] = useState<TrustAccount | null>(null);
  const [openDeposit, setOpenDeposit] = useState(false);
  const [openDrawdown, setOpenDrawdown] = useState(false);
  const [deposit, setDeposit] = useState({ accountId: seedAccounts[0].id, amount: 0, reference: "", date: "2026-07-30" });
  const [drawdown, setDrawdown] = useState({ accountId: seedAccounts[0].id, amount: 0, invoiceId: pmInvoices[0].id });
  const { toast } = useToast();

  const total = accounts.reduce((s, a) => s + a.balance, 0);
  const pendingAuth = movements.filter((m) => m.status === "Awaiting authorisation");

  const patchAccount = (id: string, p: Partial<TrustAccount>) => {
    setAccounts((l) => l.map((a) => (a.id === id ? { ...a, ...p } : a)));
    setSelected((s) => (s && s.id === id ? { ...s, ...p } : s));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Trust Accounting</h1>
          <p className="text-sm text-muted-foreground">
            Segregated client funds — deposits, two-stage drawdowns,
            reconciliation and reporting
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpenDeposit(true)}>
            <ArrowDownToLine className="mr-2 h-4 w-4" /> Record deposit
          </Button>
          <Button onClick={() => setOpenDrawdown(true)}>
            <ArrowUpFromLine className="mr-2 h-4 w-4" /> Request drawdown
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "Total trust balance", v: money(total) },
          { l: "Accounts", v: String(accounts.length) },
          { l: "Awaiting authorisation", v: String(pendingAuth.length) },
          {
            l: "Unreconciled accounts",
            v: String(accounts.filter((a) => !a.reconciled).length),
          },
        ].map((k) => (
          <Card key={k.l}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.l}</p>
              <p className="mt-1 text-xl font-bold">{k.v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="register">
        <TabsList className="flex-wrap">
          <TabsTrigger value="register">Trust register</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
          <TabsTrigger value="approvals">Drawdown approvals</TabsTrigger>
          <TabsTrigger value="recon">Reconciliation</TabsTrigger>
          <TabsTrigger value="reports">Trust reporting</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Client / mandate</TableHead>
                    <TableHead>Interest treatment</TableHead>
                    <TableHead>Last reconciled</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((a) => (
                    <TableRow
                      key={a.id}
                      className="cursor-pointer"
                      onClick={() => setSelected(a)}
                    >
                      <TableCell className="font-mono text-sm">{a.id}</TableCell>
                      <TableCell>
                        <p className="text-sm">{a.clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.mandateName}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{a.interestTreatment}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {a.lastReconciled}
                        {!a.reconciled && (
                          <Badge className="ml-2 bg-warning/10 text-warning">
                            Unreconciled
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {money(a.balance, a.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm">{m.date}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {m.accountId}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{m.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{m.reference}</TableCell>
                      <TableCell className="text-sm">{m.status}</TableCell>
                      <TableCell className="text-right text-sm">
                        {m.type === "Drawdown" ? "−" : "+"}
                        {money(m.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="pt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Two-stage approval — preparer then authoriser
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingAuth.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {money(m.amount)} — {m.reference}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Account {m.accountId} · prepared by {m.preparer} · linked
                      to {m.linkedInvoice}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setMovements((l) =>
                          l.map((x) =>
                            x.id === m.id
                              ? { ...x, status: "Approved", authoriser: "Sarah Chen" }
                              : x,
                          ),
                        );
                        setAccounts((l) =>
                          l.map((a) =>
                            a.id === m.accountId
                              ? { ...a, balance: a.balance - m.amount }
                              : a,
                          ),
                        );
                        toast({
                          title: "Drawdown authorised",
                          description:
                            "Trust-to-office transfer executed and portal balance updated.",
                        });
                      }}
                    >
                      Authorise
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setMovements((l) =>
                          l.map((x) =>
                            x.id === m.id ? { ...x, status: "Rejected" } : x,
                          ),
                        )
                      }
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
              {!pendingAuth.length && (
                <p className="text-sm text-muted-foreground">
                  No drawdowns awaiting authorisation.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recon" className="pt-4">
          <Card>
            <CardContent className="space-y-3 p-4">
              {accounts.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {a.clientName} — {money(a.balance, a.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      System balance vs bank statement · last sign-off{" "}
                      {a.lastReconciled}
                    </p>
                  </div>
                  {a.reconciled ? (
                    <Badge className="bg-success/10 text-success">
                      <ShieldCheck className="mr-1 h-3 w-3" /> Reconciled
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        patchAccount(a.id, {
                          reconciled: true,
                          lastReconciled: "2026-07-31",
                        });
                        toast({
                          title: "Monthly sign-off recorded",
                          description:
                            "No commingling with office funds detected.",
                        });
                      }}
                    >
                      Reconcile &amp; sign off
                    </Button>
                  )}
                </div>
              ))}
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <AlertTriangle className="h-3 w-3" /> Mandate closure is blocked
                until the trust balance is cleared or refunded.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="pt-4">
          <div className="grid gap-3 md:grid-cols-3">
            {[
              "Per-client trust balance report",
              "Movement report (deposits, drawdowns, interest, fees)",
              "Regulatory trust report (BNR inspection)",
            ].map((r) => (
              <Card key={r}>
                <CardContent className="space-y-3 p-4">
                  <p className="text-sm font-medium">{r}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast({ title: "Report generated", description: r })}
                  >
                    Generate
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Deposit */}
      <Dialog open={openDeposit} onOpenChange={setOpenDeposit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record deposit</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Trust account</Label>
              <Select
                value={deposit.accountId}
                onValueChange={(v) => setDeposit({ ...deposit, accountId: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.clientName} ({a.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={deposit.amount}
                  onChange={(e) =>
                    setDeposit({ ...deposit, amount: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={deposit.date}
                  onChange={(e) => setDeposit({ ...deposit, date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Source / reference</Label>
              <Input
                value={deposit.reference}
                onChange={(e) =>
                  setDeposit({ ...deposit, reference: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setMovements((p) => [
                  {
                    id: `TM-${p.length + 101}`,
                    accountId: deposit.accountId,
                    type: "Deposit",
                    amount: Number(deposit.amount),
                    reference: deposit.reference || "Client receipt",
                    date: deposit.date,
                    status: "Recorded",
                  },
                  ...p,
                ]);
                setAccounts((l) =>
                  l.map((a) =>
                    a.id === deposit.accountId
                      ? { ...a, balance: a.balance + Number(deposit.amount) }
                      : a,
                  ),
                );
                setOpenDeposit(false);
                toast({
                  title: "Deposit recorded",
                  description: "Balance updated and client notified via portal.",
                });
              }}
            >
              <Banknote className="mr-2 h-4 w-4" /> Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drawdown */}
      <Dialog open={openDrawdown} onOpenChange={setOpenDrawdown}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request drawdown</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Trust account</Label>
              <Select
                value={drawdown.accountId}
                onValueChange={(v) => setDrawdown({ ...drawdown, accountId: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.clientName} ({money(a.balance, a.currency)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Linked invoice</Label>
              <Select
                value={drawdown.invoiceId}
                onValueChange={(v) => setDrawdown({ ...drawdown, invoiceId: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pmInvoices.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.id} — {i.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={drawdown.amount}
                onChange={(e) =>
                  setDrawdown({ ...drawdown, amount: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setMovements((p) => [
                  {
                    id: `TM-${p.length + 201}`,
                    accountId: drawdown.accountId,
                    type: "Drawdown",
                    amount: Number(drawdown.amount),
                    reference: drawdown.invoiceId,
                    date: new Date().toISOString().slice(0, 10),
                    status: "Awaiting authorisation",
                    preparer: "Ana Rodriguez",
                    linkedInvoice: drawdown.invoiceId,
                  },
                  ...p,
                ]);
                setOpenDrawdown(false);
                toast({
                  title: "Drawdown prepared",
                  description: "Authoriser notified for in-app approval.",
                });
              }}
            >
              Submit for authorisation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account detail */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.clientName}</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {selected.id} · {selected.mandateName}
                </p>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">
                      Current balance
                    </p>
                    <p className="text-2xl font-bold">
                      {money(selected.balance, selected.currency)}
                    </p>
                  </CardContent>
                </Card>
                <h4 className="text-sm font-semibold">Audit trail</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements
                      .filter((m) => m.accountId === selected.id)
                      .map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="text-sm">{m.date}</TableCell>
                          <TableCell className="text-sm">{m.type}</TableCell>
                          <TableCell className="text-xs">{m.status}</TableCell>
                          <TableCell className="text-right text-sm">
                            {money(m.amount, selected.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
