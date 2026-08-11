import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  bankAccounts, bankFeed, bankRules, cashForecast, transfers, fmoney,
} from "@/data/financeMockData";
import { Landmark } from "lucide-react";

export default function Banking() {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Banking</h1>
        <p className="text-sm text-muted-foreground">
          Accounts, bank feeds, reconciliation, rules, cash forecast and transfers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {bankAccounts.map(a => (
          <Card key={a.id}>
            <CardContent className="p-5 space-y-1">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">{a.name}</p>
              </div>
              <p className="text-lg font-bold">{fmoney(a.balance, a.currency)}</p>
              <p className="text-xs text-muted-foreground">{a.bank} · {a.number}</p>
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="outline" className="text-[10px]">{a.type}</Badge>
                <span className="text-[10px] text-muted-foreground">Synced {a.synced}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="feed">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="feed">Bank feed</TabsTrigger>
          <TabsTrigger value="recon">Reconciliation</TabsTrigger>
          <TabsTrigger value="rules">Bank rules</TabsTrigger>
          <TabsTrigger value="forecast">Cash forecast</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-4">
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead><TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead><TableHead>Matched to</TableHead>
                    <TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankFeed.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{t.date}</TableCell>
                      <TableCell className="text-sm">{t.description}</TableCell>
                      <TableCell className={`text-sm font-semibold ${t.amount < 0 ? "text-destructive" : "text-success"}`}>
                        {fmoney(t.amount)}
                      </TableCell>
                      <TableCell className="text-sm">{t.matched || "—"}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${t.status === "Matched" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {t.status === "Unmatched" && (
                          <Button size="sm" variant="outline"
                            onClick={() => toast({ title: "Match created", description: `${t.id} allocated manually.` })}>
                            Match manually
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recon" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Monthly reconciliation — July 2026</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                ["System balance", fmoney(148600000)],
                ["Bank statement balance", fmoney(149050000)],
                ["Matched and cleared", fmoney(148600000)],
                ["Unreconciled items", fmoney(450000)],
                ["Variance", fmoney(450000)],
              ].map(([l, v]) => (
                <div key={l} className="flex items-center justify-between text-sm border-b pb-2">
                  <span className="text-muted-foreground">{l}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Zero variance required before sign-off. Sign-off must be by a person other than the preparer.
              </p>
              <Button
                onClick={() => toast({ title: "Cannot sign off", description: "Clear the RWF 450,000 unreconciled item first." })}>
                Sign off reconciliation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Rule</TableHead><TableHead>Condition</TableHead><TableHead>Posts to</TableHead><TableHead>Auto</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {bankRules.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-sm">{r.id}</TableCell>
                      <TableCell className="text-sm">{r.match}</TableCell>
                      <TableCell className="text-sm">{r.account}</TableCell>
                      <TableCell className="text-sm">{r.auto ? "Yes" : "No"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cashForecast.map(f => (
              <Card key={f.horizon}>
                <CardHeader className="pb-2"><CardTitle className="text-sm">{f.horizon}</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Inflows</span><span className="text-success">{fmoney(f.inflow)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Outflows</span><span className="text-destructive">{fmoney(f.outflow)}</span></div>
                  <div className="flex justify-between border-t pt-1 font-semibold"><span>Projected closing</span><span>{fmoney(f.closing)}</span></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="transfers" className="mt-4">
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead><TableHead>Date</TableHead>
                    <TableHead>From</TableHead><TableHead>To</TableHead>
                    <TableHead>Amount</TableHead><TableHead>Linked to</TableHead>
                    <TableHead>Authoriser</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium text-sm">{t.id}</TableCell>
                      <TableCell className="text-sm">{t.date}</TableCell>
                      <TableCell className="text-sm">{t.from}</TableCell>
                      <TableCell className="text-sm">{t.to}</TableCell>
                      <TableCell className="text-sm font-semibold">{fmoney(t.amount)}</TableCell>
                      <TableCell className="text-sm">{t.reference}</TableCell>
                      <TableCell className="text-sm">{t.authoriser}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
