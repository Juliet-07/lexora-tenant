import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkflowTable } from "@/components/finance/WorkflowTable";
import { useToast } from "@/hooks/use-toast";
import {
  taxCalendar, vatLines, whtRegister, ebmStatus, payrollPayments, fmoney,
} from "@/data/financeMockData";

const statusClass = (s: string) =>
  s === "Filed" || s === "Remitted" || s === "Synced"
    ? "bg-success/10 text-success"
    : s === "Error"
      ? "bg-destructive/10 text-destructive"
      : "bg-warning/10 text-warning";

const taxWorkflow = [
  { action: "Review tax calendar", detail: "Upcoming RRA and RSSB obligations with due dates and amounts", owner: "Finance manager", trigger: "Start of month" },
  { action: "Prepare VAT return", detail: "Output and input VAT reconciled to the ledger and EBM receipts", owner: "Accountant", trigger: "By the 10th" },
  { action: "Prepare PAYE & RSSB", detail: "Payroll declarations agreed to the authorised payroll run", owner: "Accountant", trigger: "After payroll" },
  { action: "Calculate WHT", detail: "15% on non-resident payments; gross / WHT / net computed and certificate generated", owner: "Tax module (single source)", trigger: "Invoice or fund distribution" },
  { action: "File and remit", detail: "Return filed, payment made, acknowledgement filed against the obligation", owner: "Finance manager", trigger: "By the 15th" },
  { action: "Provision CIT", detail: "Quarterly provisional CIT computed at 28% of profit before tax", owner: "Finance manager", trigger: "Quarter end" },
];

export default function Tax() {
  const { toast } = useToast();
  const outputVat = vatLines.filter(v => v.type === "Output").reduce((s, v) => s + v.vat, 0);
  const inputVat = vatLines.filter(v => v.type === "Input").reduce((s, v) => s + v.vat, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tax</h1>
        <p className="text-sm text-muted-foreground">
          RRA and RSSB obligations: VAT, PAYE, RSSB, CIT, WHT and EBM compliance
        </p>
      </div>

      <Tabs defaultValue="calendar">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="calendar">Tax calendar</TabsTrigger>
          <TabsTrigger value="vat">VAT</TabsTrigger>
          <TabsTrigger value="payroll">PAYE & RSSB</TabsTrigger>
          <TabsTrigger value="cit">CIT</TabsTrigger>
          <TabsTrigger value="wht">WHT</TabsTrigger>
          <TabsTrigger value="ebm">EBM</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Obligation</TableHead><TableHead>Period</TableHead>
                    <TableHead>Due</TableHead><TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxCalendar.map(t => (
                    <TableRow key={t.obligation + t.period}>
                      <TableCell className="font-medium text-sm">{t.obligation}</TableCell>
                      <TableCell className="text-sm">{t.period}</TableCell>
                      <TableCell className="text-sm">{t.due}</TableCell>
                      <TableCell className="text-sm font-semibold">{fmoney(t.amount)}</TableCell>
                      <TableCell><Badge className={`text-xs ${statusClass(t.status)}`}>{t.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        {t.status !== "Filed" && (
                          <Button size="sm" variant="outline"
                            onClick={() => toast({ title: "Filed to RRA", description: `${t.obligation} (${t.period}) submitted.` })}>
                            File return
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

        <TabsContent value="vat" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              ["Output VAT", outputVat], ["Input VAT", inputVat], ["Net payable", outputVat - inputVat],
            ].map(([l, v]) => (
              <Card key={l as string}>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">{l as string}</p>
                  <p className="text-xl font-bold">{fmoney(v as number)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">VAT return — July 2026</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Classification</TableHead><TableHead>Type</TableHead><TableHead>Base</TableHead><TableHead>VAT</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {vatLines.map(v => (
                    <TableRow key={v.category}>
                      <TableCell className="text-sm">{v.category}</TableCell>
                      <TableCell className="text-sm">{v.type}</TableCell>
                      <TableCell className="text-sm">{fmoney(v.base)}</TableCell>
                      <TableCell className="text-sm font-semibold">{fmoney(v.vat)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">PAYE & RSSB remittances</CardTitle>
              <p className="text-xs text-muted-foreground">
                Sourced from the approved HR payroll run. Pension 5%+5%, medical 0.5%+0.5%. Due by the 15th.
              </p>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Period</TableHead><TableHead>Gross</TableHead><TableHead>PAYE</TableHead><TableHead>RSSB</TableHead><TableHead>Status</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {payrollPayments.map(p => (
                    <TableRow key={p.period}>
                      <TableCell className="text-sm font-medium">{p.period}</TableCell>
                      <TableCell className="text-sm">{fmoney(p.gross)}</TableCell>
                      <TableCell className="text-sm">{fmoney(p.paye)}</TableCell>
                      <TableCell className="text-sm">{fmoney(p.rssb)}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${statusClass(p.status === "Paid" ? "Filed" : p.status)}`}>
                          {p.status === "Paid" ? "Remitted" : "Pending"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cit" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Corporate income tax — 28%</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                ["Accounting profit before tax", 143900000],
                ["Add back: non-deductible expenses", 6200000],
                ["Less: capital allowances", -11400000],
                ["Taxable profit", 138700000],
                ["CIT at 28%", 38836000],
                ["Quarterly provisionals paid", -37000000],
                ["Balance due at year end", 1836000],
              ].map(([l, v]) => (
                <div key={l as string} className="flex items-center justify-between border-b pb-2 text-sm">
                  <span className="text-muted-foreground">{l as string}</span>
                  <span className="font-medium">{fmoney(v as number)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wht" className="mt-4">
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead><TableHead>Invoice</TableHead>
                    <TableHead>Gross</TableHead><TableHead>Rate</TableHead>
                    <TableHead>WHT</TableHead><TableHead>Net paid</TableHead>
                    <TableHead>Certificate</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {whtRegister.map(w => (
                    <TableRow key={w.certificate}>
                      <TableCell className="text-sm font-medium">{w.vendor}</TableCell>
                      <TableCell className="text-sm">{w.invoice}</TableCell>
                      <TableCell className="text-sm">{fmoney(w.gross)}</TableCell>
                      <TableCell className="text-sm">{w.rate}%</TableCell>
                      <TableCell className="text-sm font-semibold">{fmoney(w.wht)}</TableCell>
                      <TableCell className="text-sm">{fmoney(w.net)}</TableCell>
                      <TableCell className="text-sm">{w.certificate}</TableCell>
                      <TableCell><Badge className={`text-xs ${statusClass(w.status)}`}>{w.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ebm" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">EBM reconciliation</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Document</TableHead><TableHead>Receipt number</TableHead><TableHead>Classification</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {ebmStatus.map(e => (
                    <TableRow key={e.document}>
                      <TableCell className="text-sm font-medium">{e.document}</TableCell>
                      <TableCell className="text-sm">{e.receipt}</TableCell>
                      <TableCell className="text-sm">{e.classification}</TableCell>
                      <TableCell><Badge className={`text-xs ${statusClass(e.status)}`}>{e.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        {e.status !== "Synced" && (
                          <Button size="sm" variant="outline"
                            onClick={() => toast({ title: "Re-sync queued", description: `${e.document} resubmitted to EBM.` })}>
                            Re-sync
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
        <TabsContent value="workflow" className="mt-4">
          <WorkflowTable title="How tax compliance is used" steps={taxWorkflow} />
        </TabsContent>

      </Tabs>
    </div>
  );
}
