import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Wallet, Download, PlayCircle, DollarSign, Calendar, Receipt, FileText, Landmark, TrendingDown, CheckCircle2, XCircle, Clock } from "lucide-react";
import { payrollRuns as initial, payslips, loans as initialLoans, type PayrollRun, type Payslip, type Loan } from "@/data/hrMockData";
import { useToast } from "@/hooks/use-toast";

const fmt = (n: number) => `$${n.toLocaleString()}`;
const statusTone = (s: PayrollRun["status"]) =>
  s === "Paid" ? "bg-success/10 text-success border-success/20"
  : s === "Approved" ? "bg-info/10 text-info border-info/20"
  : s === "Processing" ? "bg-warning/10 text-warning border-warning/20"
  : "bg-muted text-muted-foreground";

export default function HRPayroll() {
  const [runs, setRuns] = useState<PayrollRun[]>(initial);
  const [openPayslip, setOpenPayslip] = useState<Payslip | null>(null);
  const [loans, setLoans] = useState<Loan[]>(initialLoans);
  const [openLoan, setOpenLoan] = useState<Loan | null>(null);
  const { toast } = useToast();

  const current = runs.find(r => r.status === "Draft") ?? runs[0];

  const runPayroll = (r: PayrollRun) => {
    setRuns(runs.map(x => x.id === r.id ? { ...x, status: "Processing" } : x));
    toast({ title: "Payroll running", description: `${r.period} run is now processing.` });
    setTimeout(() => {
      setRuns(prev => prev.map(x => x.id === r.id ? { ...x, status: "Approved" } : x));
      toast({ title: "Payroll approved", description: `${r.period} ready for disbursement on ${r.payDate}.` });
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payroll</h1>
        <p className="text-sm text-muted-foreground">Run payroll, manage payslips and compensation.</p>
      </div>

      <Card className="bg-gradient-to-br from-primary/10 via-secondary/5 to-background border-primary/20">
        <CardContent className="p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center"><Wallet className="h-7 w-7 text-white" /></div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Payroll</p>
              <p className="text-xl font-bold">{current.period}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Calendar className="h-3 w-3" />Pay date {current.payDate} · {current.employees} employees</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div><p className="text-xs text-muted-foreground">Gross</p><p className="text-lg font-bold">{fmt(current.gross)}</p></div>
            <div><p className="text-xs text-muted-foreground">Deductions</p><p className="text-lg font-bold text-destructive">-{fmt(current.deductions)}</p></div>
            <div><p className="text-xs text-muted-foreground">Net</p><p className="text-lg font-bold text-success">{fmt(current.net)}</p></div>
            {current.status === "Draft" && <Button size="lg" className="bg-gradient-to-r from-primary to-secondary" onClick={() => runPayroll(current)}><PlayCircle className="h-4 w-4 mr-2" /> Run Payroll</Button>}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="runs" className="space-y-4">
        <TabsList><TabsTrigger value="runs">Pay Runs</TabsTrigger><TabsTrigger value="payslips">Payslips</TabsTrigger><TabsTrigger value="comp">Compensation</TabsTrigger></TabsList>

        <TabsContent value="runs" className="space-y-3">
          {runs.map(r => (
            <Card key={r.id}><CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3"><Receipt className="h-5 w-5 text-primary" /><div><p className="font-medium">{r.period}</p><p className="text-xs text-muted-foreground">Pay date {r.payDate} · {r.employees} employees · by {r.createdBy}</p></div></div>
              <div className="flex items-center gap-6 text-sm">
                <span>Gross <strong>{fmt(r.gross)}</strong></span>
                <span className="text-success">Net <strong>{fmt(r.net)}</strong></span>
                <Badge variant="outline" className={statusTone(r.status)}>{r.status}</Badge>
                <Button size="sm" variant="outline"><Download className="h-3 w-3 mr-1" /> Export</Button>
              </div>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="payslips">
          <Card><CardHeader><CardTitle className="text-base">May 2026 Payslips</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {payslips.map(p => (
                <div key={p.id} className="flex items-center justify-between border-b pb-2 last:border-b-0 cursor-pointer hover:bg-muted/30 px-2 rounded" onClick={() => setOpenPayslip(p)}>
                  <div><p className="text-sm font-medium">{p.employeeName}</p><p className="text-xs text-muted-foreground">Gross {fmt(p.gross)} · Tax {fmt(p.tax)} · Pension {fmt(p.pension)}</p></div>
                  <div className="text-right"><p className="text-sm font-semibold text-success">{fmt(p.net)}</p><p className="text-[10px] text-muted-foreground">Net</p></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comp">
          <Card><CardHeader><CardTitle className="text-base">Compensation Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { dept: "Engineering", count: 3, total: 351000 },
                { dept: "Product & Design", count: 2, total: 227000 },
                { dept: "Operations & Sales", count: 2, total: 170000 },
                { dept: "Finance", count: 1, total: 110000 },
                { dept: "Marketing", count: 1, total: 62000 },
                { dept: "People", count: 1, total: 84000 },
              ].map(c => (
                <div key={c.dept} className="flex items-center justify-between border-b pb-2 last:border-b-0">
                  <div className="flex items-center gap-3"><DollarSign className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm font-medium">{c.dept}</p><p className="text-xs text-muted-foreground">{c.count} employees · avg {fmt(Math.round(c.total / c.count))}</p></div></div>
                  <p className="text-sm font-bold">{fmt(c.total)}/yr</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={!!openPayslip} onOpenChange={(o) => !o && setOpenPayslip(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {openPayslip && (<>
            <SheetHeader><SheetTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Payslip — May 2026</SheetTitle></SheetHeader>
            <div className="mt-5 space-y-3">
              <p className="font-semibold">{openPayslip.employeeName}</p>
              <div className="border rounded-lg divide-y">
                {[
                  ["Gross salary", fmt(openPayslip.gross)],
                  ["Bonuses", fmt(openPayslip.bonuses)],
                  ["Tax (PAYE)", `-${fmt(openPayslip.tax)}`],
                  ["Pension contribution", `-${fmt(openPayslip.pension)}`],
                  ["Other deductions", `-${fmt(openPayslip.otherDeductions)}`],
                ].map(([k, v]) => <div key={k} className="flex justify-between p-3 text-sm"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>)}
                <div className="flex justify-between p-3 bg-muted/30"><span className="font-semibold">Net pay</span><span className="font-bold text-success">{fmt(openPayslip.net)}</span></div>
              </div>
              <Button className="w-full" variant="outline"><Download className="h-4 w-4 mr-2" /> Download PDF</Button>
            </div>
          </>)}
        </SheetContent>
      </Sheet>
    </div>
  );
}
