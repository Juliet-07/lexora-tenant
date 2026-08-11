import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  bills, expenseClaims, expensePolicies, payrollPayments, vendors, fmoney,
} from "@/data/financeMockData";

const badge = (s: string) => {
  if (["Paid", "Approved"].includes(s)) return "bg-success/10 text-success";
  if (["Awaiting approval", "Submitted", "Scheduled", "Awaiting authorisation"].includes(s))
    return "bg-warning/10 text-warning";
  if (["Rejected"].includes(s)) return "bg-destructive/10 text-destructive";
  return "bg-muted text-muted-foreground";
};

export default function Purchases() {
  const { toast } = useToast();
  const payable = vendors.reduce((s, v) => s + v.outstanding, 0);
  const claims = expenseClaims.filter(c => c.status !== "Paid").reduce((s, c) => s + c.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Purchases</h1>
        <p className="text-sm text-muted-foreground">
          Vendor bills, expense claims, payroll payments and payables
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total payables", value: fmoney(payable) },
          { label: "Claims awaiting payment", value: fmoney(claims) },
          { label: "Next payroll (net)", value: fmoney(payrollPayments[0].net) },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{k.label}</p>
              <p className="text-xl font-bold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="bills">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="claims">Expense claims</TabsTrigger>
          <TabsTrigger value="payroll">Payroll payments</TabsTrigger>
          <TabsTrigger value="payables">Aged payables & vendors</TabsTrigger>
        </TabsList>

        <TabsContent value="bills" className="mt-4">
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill</TableHead><TableHead>Vendor</TableHead>
                    <TableHead>Description</TableHead><TableHead>Category</TableHead>
                    <TableHead>Due</TableHead><TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium text-sm">{b.id}{b.recurring && <Badge variant="outline" className="ml-2 text-[10px]">Recurring</Badge>}</TableCell>
                      <TableCell className="text-sm">{b.vendor}</TableCell>
                      <TableCell className="text-sm">{b.description}</TableCell>
                      <TableCell className="text-sm">{b.category}</TableCell>
                      <TableCell className="text-sm">{b.due}</TableCell>
                      <TableCell className="text-sm font-semibold">{fmoney(b.amount)}</TableCell>
                      <TableCell><Badge className={`text-xs ${badge(b.status)}`}>{b.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline"
                          onClick={() => toast({ title: "Payment scheduled", description: `${b.id} added to the next bank file.` })}>
                          Schedule payment
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim</TableHead><TableHead>Employee</TableHead>
                    <TableHead>Description</TableHead><TableHead>Mandate</TableHead>
                    <TableHead>Amount</TableHead><TableHead>Rechargeable</TableHead>
                    <TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseClaims.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-sm">{c.id}</TableCell>
                      <TableCell className="text-sm">{c.employee}</TableCell>
                      <TableCell className="text-sm">{c.description}</TableCell>
                      <TableCell className="text-sm">{c.mandate ?? "—"}</TableCell>
                      <TableCell className="text-sm font-semibold">{fmoney(c.amount)}</TableCell>
                      <TableCell className="text-sm">{c.rechargeable ? "Yes — to WIP" : "No"}</TableCell>
                      <TableCell><Badge className={`text-xs ${badge(c.status)}`}>{c.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline"
                          onClick={() => toast({ title: "Claim approved", description: `${c.id} approved for reimbursement.` })}>
                          Approve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Expense policies</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {expensePolicies.map(p => (
                <div key={p.rule} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{p.rule}</p>
                  <p className="text-sm font-medium">{p.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payroll runs received from HR</CardTitle>
              <p className="text-xs text-muted-foreground">
                Finance reviews totals, confirms cash, authorises the bank file and posts the journal.
              </p>
            </CardHeader>
            <CardContent className="p-4 pt-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead><TableHead>Employees</TableHead>
                    <TableHead>Gross</TableHead><TableHead>PAYE</TableHead>
                    <TableHead>RSSB</TableHead><TableHead>Net pay</TableHead>
                    <TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollPayments.map(p => (
                    <TableRow key={p.period}>
                      <TableCell className="font-medium text-sm">{p.period}</TableCell>
                      <TableCell className="text-sm">{p.employees}</TableCell>
                      <TableCell className="text-sm">{fmoney(p.gross)}</TableCell>
                      <TableCell className="text-sm">{fmoney(p.paye)}</TableCell>
                      <TableCell className="text-sm">{fmoney(p.rssb)}</TableCell>
                      <TableCell className="text-sm font-semibold">{fmoney(p.net)}</TableCell>
                      <TableCell><Badge className={`text-xs ${badge(p.status)}`}>{p.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline"
                          onClick={() => toast({ title: "Bank file generated", description: `Bulk payment file for ${p.period} ready for upload.` })}>
                          Generate bank file
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payables" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {["Current", "31–60", "61–90", "90+"].map(band => {
              const total = vendors.filter(v => v.band === band).reduce((s, v) => s + v.outstanding, 0);
              return (
                <Card key={band}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{band}</p>
                    <p className="text-lg font-bold">{fmoney(total)}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Vendor register</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead><TableHead>TIN</TableHead>
                    <TableHead>Category</TableHead><TableHead>Terms</TableHead>
                    <TableHead>Currency</TableHead><TableHead>WHT</TableHead>
                    <TableHead>Outstanding</TableHead><TableHead>Band</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium text-sm">{v.name}</TableCell>
                      <TableCell className="text-sm">{v.tin}</TableCell>
                      <TableCell className="text-sm">{v.category}</TableCell>
                      <TableCell className="text-sm">{v.terms}</TableCell>
                      <TableCell className="text-sm">{v.currency}</TableCell>
                      <TableCell className="text-sm">{v.wht ? "15% non-resident" : "—"}</TableCell>
                      <TableCell className="text-sm font-semibold">{fmoney(v.outstanding)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{v.band}</Badge></TableCell>
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
