import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Wallet, Download, PlayCircle, DollarSign, Calendar, Receipt, FileText, Landmark, TrendingDown, CheckCircle2, XCircle, Clock, Settings2, Plus, Trash2, MapPin, Globe2, Save } from "lucide-react";
import { payrollRuns as initial, payslips, loans as initialLoans, type PayrollRun, type Payslip, type Loan } from "@/data/hrMockData";
import { useToast } from "@/hooks/use-toast";

type PayrollRule = {
  id: string;
  location: string;
  currency: string;
  payFrequency: "Monthly" | "Bi-weekly" | "Weekly";
  payDay: number;
  taxRate: number;
  pensionRate: number;
  socialSecurityRate: number;
  overtimeMultiplier: number;
  thirteenthMonth: boolean;
  rounding: "None" | "Nearest 1" | "Nearest 10" | "Nearest 100";
};
type FxRate = { id: string; from: string; to: string; rate: number };

const CURRENCIES = ["USD", "EUR", "GBP", "NGN", "INR", "JPY", "MXN", "RWF", "GHS", "RUB"];
const INITIAL_RULES: PayrollRule[] = [
  { id: "PR-1", location: "Lagos, NG", currency: "NGN", payFrequency: "Monthly", payDay: 25, taxRate: 24, pensionRate: 8, socialSecurityRate: 2.5, overtimeMultiplier: 1.5, thirteenthMonth: true, rounding: "Nearest 100" },
  { id: "PR-2", location: "Milan, IT", currency: "EUR", payFrequency: "Monthly", payDay: 27, taxRate: 38, pensionRate: 9.19, socialSecurityRate: 3.5, overtimeMultiplier: 1.3, thirteenthMonth: true, rounding: "Nearest 1" },
  { id: "PR-3", location: "Bangalore, IN", currency: "INR", payFrequency: "Monthly", payDay: 1, taxRate: 20, pensionRate: 12, socialSecurityRate: 0, overtimeMultiplier: 2.0, thirteenthMonth: false, rounding: "Nearest 10" },
  { id: "PR-4", location: "Remote", currency: "USD", payFrequency: "Monthly", payDay: 28, taxRate: 22, pensionRate: 6, socialSecurityRate: 6.2, overtimeMultiplier: 1.5, thirteenthMonth: false, rounding: "None" },
];
const INITIAL_FX: FxRate[] = [
  { id: "FX-1", from: "EUR", to: "USD", rate: 1.08 },
  { id: "FX-2", from: "GBP", to: "USD", rate: 1.27 },
  { id: "FX-3", from: "NGN", to: "USD", rate: 0.00065 },
  { id: "FX-4", from: "INR", to: "USD", rate: 0.012 },
  { id: "FX-5", from: "JPY", to: "USD", rate: 0.0066 },
];

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
  const [rules, setRules] = useState<PayrollRule[]>(INITIAL_RULES);
  const [fx, setFx] = useState<FxRate[]>(INITIAL_FX);
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const { toast } = useToast();

  const updateRule = (id: string, patch: Partial<PayrollRule>) =>
    setRules(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  const addRule = () => setRules(prev => [...prev, { id: `PR-${Date.now()}`, location: "New Location", currency: baseCurrency, payFrequency: "Monthly", payDay: 25, taxRate: 20, pensionRate: 5, socialSecurityRate: 0, overtimeMultiplier: 1.5, thirteenthMonth: false, rounding: "None" }]);
  const removeRule = (id: string) => setRules(prev => prev.filter(r => r.id !== id));
  const updateFx = (id: string, patch: Partial<FxRate>) => setFx(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  const addFx = () => setFx(prev => [...prev, { id: `FX-${Date.now()}`, from: "EUR", to: baseCurrency, rate: 1 }]);
  const removeFx = (id: string) => setFx(prev => prev.filter(r => r.id !== id));



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
        <TabsList><TabsTrigger value="runs">Pay Runs</TabsTrigger><TabsTrigger value="payslips">Payslips</TabsTrigger><TabsTrigger value="comp">Compensation</TabsTrigger><TabsTrigger value="loans">Loan Management</TabsTrigger></TabsList>

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

        <TabsContent value="loans">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <Card><CardContent className="p-4 flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground uppercase">Total Loan Book</p><p className="text-xl font-bold">{fmt(loans.reduce((acc, l) => acc + l.amount, 0))}</p></div>
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center"><Landmark className="h-5 w-5 text-white" /></div>
            </CardContent></Card>
            <Card><CardContent className="p-4 flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground uppercase">Active Repaying</p><p className="text-xl font-bold">{fmt(loans.filter(l => l.status === "Repaying").reduce((acc, l) => acc + l.remainingBalance, 0))}</p></div>
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center"><TrendingDown className="h-5 w-5 text-white" /></div>
            </CardContent></Card>
            <Card><CardContent className="p-4 flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground uppercase">Pending Requests</p><p className="text-xl font-bold">{loans.filter(l => l.status === "Pending").length}</p></div>
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"><Clock className="h-5 w-5 text-white" /></div>
            </CardContent></Card>
          </div>
          <Card><CardHeader><CardTitle className="text-base">Employee Loans</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {loans.map(l => (
                <div key={l.id} className="flex items-center justify-between border-b pb-2 last:border-b-0 cursor-pointer hover:bg-muted/30 px-2 rounded" onClick={() => setOpenLoan(l)}>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">{l.employeeName}
                      <Badge variant="outline" className={
                        l.status === "Pending" ? "bg-warning/10 text-warning border-warning/20 text-[10px]"
                        : l.status === "Approved" ? "bg-info/10 text-info border-info/20 text-[10px]"
                        : l.status === "Repaying" ? "bg-primary/10 text-primary border-primary/20 text-[10px]"
                        : l.status === "Paid Off" ? "bg-success/10 text-success border-success/20 text-[10px]"
                        : "bg-destructive/10 text-destructive border-destructive/20 text-[10px]"
                      }>{l.status}</Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">{l.purpose} · {l.termMonths} months · {l.interestRate}% interest</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{fmt(l.amount)}</p>
                    <p className="text-[10px] text-muted-foreground">{l.status === "Repaying" || l.status === "Paid Off" ? `${fmt(l.monthlyPayment)}/mo` : "—"}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={!!openLoan} onOpenChange={(o) => !o && setOpenLoan(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {openLoan && (<>
            <SheetHeader><SheetTitle className="flex items-center gap-2"><Landmark className="h-5 w-5" /> Loan Details</SheetTitle></SheetHeader>
            <div className="mt-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-bold">{openLoan.employeeName.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
                <div>
                  <p className="font-semibold">{openLoan.employeeName}</p>
                  <p className="text-xs text-muted-foreground">Requested {openLoan.requestDate}</p>
                </div>
              </div>
              <div className="border rounded-lg divide-y">
                {[
                  ["Loan amount", fmt(openLoan.amount)],
                  ["Purpose", openLoan.purpose],
                  ["Interest rate", `${openLoan.interestRate}%`],
                  ["Term", `${openLoan.termMonths} months`],
                  ["Monthly payment", fmt(openLoan.monthlyPayment)],
                  ["Remaining balance", fmt(openLoan.remainingBalance)],
                  ["Status", openLoan.status],
                ].map(([k, v]) => <div key={k} className="flex justify-between p-3 text-sm"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>)}
              </div>
              {openLoan.status === "Pending" && (
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => { setLoans(loans.map(x => x.id === openLoan.id ? { ...x, status: "Approved", approvedDate: new Date().toISOString().slice(0, 10) } : x)); setOpenLoan(null); toast({ title: "Loan approved", description: `${openLoan.employeeName}'s loan request approved.` }); }}><CheckCircle2 className="h-4 w-4 mr-2" /> Approve</Button>
                  <Button variant="outline" className="flex-1" onClick={() => { setLoans(loans.map(x => x.id === openLoan.id ? { ...x, status: "Declined" } : x)); setOpenLoan(null); toast({ title: "Loan declined", description: `${openLoan.employeeName}'s loan request declined.` }); }}><XCircle className="h-4 w-4 mr-2" /> Decline</Button>
                </div>
              )}
            </div>
          </>)}
        </SheetContent>
      </Sheet>

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
