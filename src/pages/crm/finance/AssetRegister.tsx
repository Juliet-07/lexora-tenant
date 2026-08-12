import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { assets, maintenanceLog, fmoney } from "@/data/financeMockData";

const workflow = [
  { action: "Tag asset", detail: "QR label generated at acquisition and linked to the asset record", owner: "Office manager", trigger: "Asset delivered / capitalised" },
  { action: "Assign & verify", detail: "Movable assets assigned to a holder; condition confirmed at handover", owner: "Office manager", trigger: "Issue to employee" },
  { action: "Run depreciation", detail: "Monthly charge posted to the depreciation journal", owner: "Finance", trigger: "Month-end close" },
  { action: "Renew insurance", detail: "Policy renewed and certificate filed against the asset", owner: "Finance", trigger: "30 days before renewal" },
  { action: "Log maintenance", detail: "Service, repair and cost recorded on the asset history", owner: "Office manager", trigger: "Service completed" },
  { action: "Dispose", detail: "Disposal value posted, gain/loss recognised, asset retired", owner: "Partner approval", trigger: "End of useful life or sale" },
];

export default function AssetRegister() {
  const fixed = assets.filter(a => a.kind === "Fixed");
  const movable = assets.filter(a => a.kind === "Movable");
  const cost = assets.reduce((s, a) => s + a.cost, 0);
  const nbv = assets.reduce((s, a) => s + a.nbv, 0);

  const table = (rows: typeof assets) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tag</TableHead><TableHead>Asset</TableHead>
            <TableHead>Category</TableHead><TableHead>Acquired</TableHead>
            <TableHead className="text-right">Cost</TableHead><TableHead>Useful life</TableHead>
            <TableHead className="text-right">NBV</TableHead><TableHead>Assigned to</TableHead>
            <TableHead>Condition</TableHead><TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(a => (
            <TableRow key={a.id}>
              <TableCell className="text-sm font-medium">{a.id}</TableCell>
              <TableCell className="text-sm">{a.name}</TableCell>
              <TableCell className="text-sm">{a.category}</TableCell>
              <TableCell className="text-sm">{a.acquired}</TableCell>
              <TableCell className="text-sm text-right">{fmoney(a.cost)}</TableCell>
              <TableCell className="text-sm">{a.usefulLife} yrs</TableCell>
              <TableCell className="text-sm text-right font-semibold">{fmoney(a.nbv)}</TableCell>
              <TableCell className="text-sm">{a.assignedTo ?? "—"}</TableCell>
              <TableCell className="text-sm">{a.condition ?? "—"}</TableCell>
              <TableCell><Badge variant="outline" className="text-xs">{a.status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Asset Register</h1>
        <p className="text-sm text-muted-foreground">
          Fixed and movable assets, tagging, depreciation, disposals, insurance and maintenance
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          ["Assets tracked", `${assets.length}`],
          ["Total cost", fmoney(cost)],
          ["Net book value", fmoney(nbv)],
          ["Accumulated depreciation", fmoney(cost - nbv)],
        ].map(([l, v]) => (
          <Card key={l}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{l}</p>
              <p className="text-xl font-bold">{v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="fixed">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="fixed">Fixed assets</TabsTrigger>
          <TabsTrigger value="movable">Movable assets</TabsTrigger>
          <TabsTrigger value="depreciation">Depreciation &amp; disposals</TabsTrigger>
          <TabsTrigger value="insurance">Insurance &amp; maintenance</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
        </TabsList>

        <TabsContent value="fixed" className="mt-4">
          <Card><CardContent className="p-4">{table(fixed)}</CardContent></Card>
        </TabsContent>

        <TabsContent value="movable" className="mt-4">
          <Card><CardContent className="p-4">{table(movable)}</CardContent></Card>
        </TabsContent>

        <TabsContent value="depreciation" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Straight-line depreciation schedule</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag</TableHead><TableHead>Asset</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Annual charge</TableHead>
                    <TableHead className="text-right">Monthly charge</TableHead>
                    <TableHead className="text-right">NBV</TableHead>
                    <TableHead>Disposal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm font-medium">{a.id}</TableCell>
                      <TableCell className="text-sm">{a.name}</TableCell>
                      <TableCell className="text-sm text-right">{fmoney(a.cost)}</TableCell>
                      <TableCell className="text-sm text-right">{fmoney(a.cost / a.usefulLife)}</TableCell>
                      <TableCell className="text-sm text-right">{fmoney(a.cost / a.usefulLife / 12)}</TableCell>
                      <TableCell className="text-sm text-right font-semibold">{fmoney(a.nbv)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.status === "Disposed" ? "Disposed" : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insurance" className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
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

        <TabsContent value="workflow" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">How the asset register is used</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead><TableHead>Detail</TableHead>
                    <TableHead>Owner</TableHead><TableHead>Trigger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflow.map(w => (
                    <TableRow key={w.action}>
                      <TableCell className="text-sm font-medium">{w.action}</TableCell>
                      <TableCell className="text-sm">{w.detail}</TableCell>
                      <TableCell className="text-sm">{w.owner}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{w.trigger}</TableCell>
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
