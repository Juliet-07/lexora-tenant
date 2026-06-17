import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Wallet,
  Download,
  FileText,
  TrendingUp,
  Receipt,
  Banknote,
  PiggyBank,
  CreditCard,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Payslip {
  id: string;
  period: string;
  payDate: string;
  gross: number;
  net: number;
  status: "Paid" | "Pending";
  earnings: { label: string; amount: number }[];
  deductions: { label: string; amount: number }[];
}

interface TaxDoc {
  id: string;
  name: string;
  year: number;
  type: string;
}

const payslips: Payslip[] = [
  {
    id: "p1", period: "May 2026", payDate: "2026-05-31", gross: 6200, net: 4585, status: "Paid",
    earnings: [
      { label: "Base salary", amount: 5500 },
      { label: "Overtime (12h × 1.5)", amount: 495 },
      { label: "Performance bonus", amount: 200 },
      { label: "Transport allowance", amount: 5 },
    ],
    deductions: [
      { label: "Income tax (PAYE)", amount: 1085 },
      { label: "Pension (6%)", amount: 372 },
      { label: "Health insurance", amount: 95 },
      { label: "Loan repayment", amount: 63 },
    ],
  },
  {
    id: "p2", period: "April 2026", payDate: "2026-04-30", gross: 5705, net: 4225, status: "Paid",
    earnings: [{ label: "Base salary", amount: 5500 }, { label: "Overtime (4h × 1.5)", amount: 165 }, { label: "Allowances", amount: 40 }],
    deductions: [{ label: "Income tax (PAYE)", amount: 998 }, { label: "Pension", amount: 342 }, { label: "Health insurance", amount: 95 }, { label: "Loan repayment", amount: 45 }],
  },
  {
    id: "p3", period: "March 2026", payDate: "2026-03-31", gross: 5500, net: 4072, status: "Paid",
    earnings: [{ label: "Base salary", amount: 5500 }],
    deductions: [{ label: "Income tax (PAYE)", amount: 963 }, { label: "Pension", amount: 330 }, { label: "Health insurance", amount: 95 }, { label: "Loan repayment", amount: 40 }],
  },
  {
    id: "p4", period: "February 2026", payDate: "2026-02-29", gross: 5500, net: 4072, status: "Paid",
    earnings: [{ label: "Base salary", amount: 5500 }],
    deductions: [{ label: "Income tax (PAYE)", amount: 963 }, { label: "Pension", amount: 330 }, { label: "Health insurance", amount: 95 }, { label: "Loan repayment", amount: 40 }],
  },
];

const taxDocs: TaxDoc[] = [
  { id: "td1", name: "P60 Annual Statement 2025", year: 2025, type: "Tax Summary" },
  { id: "td2", name: "P60 Annual Statement 2024", year: 2024, type: "Tax Summary" },
];

const benefits = [
  { name: "Pension Plan (Employer 8% + You 6%)", value: "Active", note: "Vested: £14,200" },
  { name: "Health Insurance — Family Cover", value: "Active", note: "Bupa, Tier 2" },
  { name: "Life Insurance — 4× Salary", value: "Active", note: "" },
  { name: "Wellness Stipend", value: "£600 / year", note: "£250 used" },
];

const loans = [
  { id: "loan1", type: "Salary Advance", principal: 1500, balance: 750, installment: 63, until: "2026-12-31" },
];

const currency = (n: number) => `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MyPayslips() {
  const [active, setActive] = useState<Payslip | null>(null);
  const { toast } = useToast();

  const ytdGross = payslips.reduce((s, p) => s + p.gross, 0);
  const ytdNet = payslips.reduce((s, p) => s + p.net, 0);
  const ytdTax = payslips.reduce((s, p) => s + (p.deductions.find((d) => d.label.includes("tax"))?.amount ?? 0), 0);

  const download = (label: string) => toast({ title: "Download started", description: label });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Payslips & Benefits</h1>
        <p className="text-sm text-muted-foreground">View your pay history, tax documents and benefits.</p>
      </div>

      {/* YTD summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="YTD Gross" value={currency(ytdGross)} icon={Banknote} tone="from-blue-500 to-cyan-500" />
        <Stat label="YTD Net" value={currency(ytdNet)} icon={Wallet} tone="from-emerald-500 to-teal-500" />
        <Stat label="YTD Tax" value={currency(ytdTax)} icon={Receipt} tone="from-rose-500 to-red-500" />
        <Stat label="Pension Pot" value="£14,200" icon={PiggyBank} tone="from-violet-500 to-purple-600" />
      </div>

      <Tabs defaultValue="payslips" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payslips">Payslips</TabsTrigger>
          <TabsTrigger value="tax">Tax Documents</TabsTrigger>
          <TabsTrigger value="benefits">Benefits</TabsTrigger>
          <TabsTrigger value="loans">Loans & Advances</TabsTrigger>
        </TabsList>

        <TabsContent value="payslips">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Pay History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {payslips.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3 border-b last:border-b-0 hover:bg-muted/30 px-2 rounded transition-colors">
                  <div>
                    <p className="text-sm font-medium">{p.period}</p>
                    <p className="text-xs text-muted-foreground">Paid {new Date(p.payDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <div className="hidden md:flex items-center gap-8 text-xs">
                    <div className="text-right"><p className="text-muted-foreground">Gross</p><p className="font-mono text-sm text-foreground">{currency(p.gross)}</p></div>
                    <div className="text-right"><p className="text-muted-foreground">Net</p><p className="font-mono text-sm font-semibold text-foreground">{currency(p.net)}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">{p.status}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => setActive(p)}>View</Button>
                    <Button size="sm" variant="outline" onClick={() => download(`Payslip ${p.period}`)}>
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax">
          <Card>
            <CardHeader><CardTitle className="text-base">Annual Tax Documents</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {taxDocs.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.type} · {d.year}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => download(d.name)}>
                    <Download className="h-3 w-3 mr-1.5" /> Download
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benefits">
          <Card>
            <CardHeader><CardTitle className="text-base">Active Benefits</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {benefits.map((b) => (
                <div key={b.name} className="flex items-center justify-between py-3 border-b last:border-b-0">
                  <div>
                    <p className="text-sm font-medium">{b.name}</p>
                    {b.note && <p className="text-xs text-muted-foreground">{b.note}</p>}
                  </div>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">{b.value}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loans">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Active Loans</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {loans.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No active loans.</p>
              ) : loans.map((l) => (
                <div key={l.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{l.type}</p>
                    <Badge variant="outline">{currency(l.installment)}/mo</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div><p className="text-muted-foreground">Principal</p><p className="font-mono text-sm">{currency(l.principal)}</p></div>
                    <div><p className="text-muted-foreground">Outstanding</p><p className="font-mono text-sm">{currency(l.balance)}</p></div>
                    <div><p className="text-muted-foreground">Final payment</p><p className="text-sm">{new Date(l.until).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</p></div>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full mt-2">Request New Advance</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payslip detail */}
      <Sheet open={!!active} onOpenChange={(v) => !v && setActive(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {active && (
            <>
              <SheetHeader>
                <SheetTitle>{active.period}</SheetTitle>
                <SheetDescription>Paid {new Date(active.payDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                <div className="bg-gradient-to-br from-primary to-secondary text-white p-5 rounded-xl">
                  <p className="text-xs opacity-80 uppercase tracking-wide">Net Pay</p>
                  <p className="text-3xl font-bold mt-1">{currency(active.net)}</p>
                  <div className="flex justify-between text-xs opacity-90 mt-3 pt-3 border-t border-white/20">
                    <span>Gross: {currency(active.gross)}</span>
                    <span>Deductions: {currency(active.gross - active.net)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-success uppercase tracking-wide mb-2 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Earnings</p>
                  <div className="space-y-1.5">
                    {active.earnings.map((e) => (
                      <div key={e.label} className="flex justify-between text-sm py-1.5 border-b last:border-b-0">
                        <span>{e.label}</span><span className="font-mono">{currency(e.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-semibold pt-2"><span>Total Gross</span><span className="font-mono">{currency(active.gross)}</span></div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-destructive uppercase tracking-wide mb-2">Deductions</p>
                  <div className="space-y-1.5">
                    {active.deductions.map((d) => (
                      <div key={d.label} className="flex justify-between text-sm py-1.5 border-b last:border-b-0">
                        <span>{d.label}</span><span className="font-mono">-{currency(d.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-semibold pt-2"><span>Total Deductions</span><span className="font-mono">-{currency(active.gross - active.net)}</span></div>
                  </div>
                </div>
                <Button className="w-full bg-gradient-to-r from-primary to-secondary" onClick={() => download(`Payslip ${active.period}`)}>
                  <Download className="h-4 w-4 mr-2" /> Download PDF
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: any; icon: any; tone: string }) {
  return (
    <Card><CardContent className="p-5 flex items-center justify-between">
      <div><p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p><p className="text-2xl font-bold mt-1">{value}</p></div>
      <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center`}><Icon className="h-5 w-5 text-white" /></div>
    </CardContent></Card>
  );
}
