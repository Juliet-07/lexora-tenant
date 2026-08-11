import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  chartOfAccounts, journals, assets, maintenanceLog, fmoney,
} from "@/data/financeMockData";

export default function Accounting() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Accounting</h1>
        <p className="text-sm text-muted-foreground">
          Chart of accounts, manual journals and asset management
        </p>
      </div>

      <Tabs defaultValue="coa">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="coa">Chart of accounts</TabsTrigger>
          <TabsTrigger value="journals">Manual journals</TabsTrigger>
          <TabsTrigger value="assets">Assets & depreciation</TabsTrigger>
          <TabsTrigger value="maintenance">Insurance & maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="coa" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Code</TableHead><TableHead>Account</TableHead><TableHead>Type</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {chartOfAccounts.map(a => (
                    <TableRow key={a.code}>
                      <TableCell className="text-sm font-medium">{a.code}</TableCell>
                      <TableCell className="text-sm">{a.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{a.type}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journals" className="mt-4">
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Journal</TableHead><TableHead>Date</TableHead>
                    <TableHead>Narration</TableHead><TableHead>Debit</TableHead>
                    <TableHead>Credit</TableHead><TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journals.map(j => (
                    <TableRow key={j.id}>
                      <TableCell className="text-sm font-medium">{j.id}</TableCell>
                      <TableCell className="text-sm">{j.date}</TableCell>
                      <TableCell className="text-sm">{j.narration}</TableCell>
                      <TableCell className="text-sm">{j.debit}</TableCell>
                      <TableCell className="text-sm">{j.credit}</TableCell>
                      <TableCell className="text-sm font-semibold">{fmoney(j.amount)}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${j.status === "Posted" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                          {j.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Asset register</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead><TableHead>Asset</TableHead>
                    <TableHead>Class</TableHead><TableHead>Category</TableHead>
                    <TableHead>Cost</TableHead><TableHead>Useful life</TableHead>
                    <TableHead>NBV</TableHead><TableHead>Assigned to</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm font-medium">{a.id}</TableCell>
                      <TableCell className="text-sm">{a.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{a.kind}</Badge></TableCell>
                      <TableCell className="text-sm">{a.category}</TableCell>
                      <TableCell className="text-sm">{fmoney(a.cost)}</TableCell>
                      <TableCell className="text-sm">{a.usefulLife} yrs</TableCell>
                      <TableCell className="text-sm font-semibold">{fmoney(a.nbv)}</TableCell>
                      <TableCell className="text-sm">{a.assignedTo ?? "—"}</TableCell>
                      <TableCell className="text-sm">{a.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Insurance coverage</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {assets.filter(a => a.insurer).map(a => (
                <div key={a.id} className="flex items-center justify-between border-b pb-2 text-sm">
                  <div><p className="font-medium">{a.name}</p><p className="text-xs text-muted-foreground">{a.insurer}</p></div>
                  <span className="text-xs text-muted-foreground">Renews {a.renewal}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Maintenance log</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {maintenanceLog.map(m => (
                <div key={m.asset + m.date} className="flex items-center justify-between border-b pb-2 text-sm">
                  <div>
                    <p className="font-medium">{m.description}</p>
                    <p className="text-xs text-muted-foreground">{m.asset} · {m.vendor} · {m.date}</p>
                  </div>
                  <span className="font-medium">{fmoney(m.cost)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
