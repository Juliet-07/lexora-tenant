import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Wallet,
  Download,
  FileText,
  Receipt,
  Banknote,
  CreditCard,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchMyPayslips,
  fetchMyPayslipHtml,
  type Payslip,
} from "@/lib/hr-api";

const fmt = (n: number, currency = "USD") => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function MyPayslips() {
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: payslips = [], isLoading } = useQuery({
    queryKey: ["my-payslips"],
    queryFn: fetchMyPayslips,
  });

  const { data: payslipHtml, isLoading: htmlLoading } = useQuery({
    queryKey: ["my-payslip-html", activeId],
    queryFn: () => fetchMyPayslipHtml(activeId!),
    enabled: !!activeId,
  });

  const active = payslips.find((p) => p._id === activeId) ?? null;

  // YTD figures computed from whatever payslips exist within the
  // current calendar year — straightforward sum, no separate
  // backend endpoint needed for this since the full list is
  // already fetched.
  const currentYear = new Date().getFullYear();
  const ytdPayslips = payslips.filter(
    (p) => new Date(p.periodStart).getFullYear() === currentYear,
  );
  const ytdGross = ytdPayslips.reduce((s, p) => s + p.grossSalary, 0);
  const ytdNet = ytdPayslips.reduce((s, p) => s + p.netSalary, 0);
  const ytdDeductions = ytdPayslips.reduce(
    (s, p) => s + p.totalEmployeeDeductions,
    0,
  );
  const displayCurrency = payslips[0]?.payCurrency ?? "USD";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Payslips</h1>
        <p className="text-sm text-muted-foreground">
          View and download your pay history.
        </p>
      </div>

      {/* YTD summary — real, derived from actual payslips this year */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Stat
          label={`YTD Gross (${currentYear})`}
          value={fmt(ytdGross, displayCurrency)}
          icon={Banknote}
          tone="from-blue-500 to-cyan-500"
        />
        <Stat
          label={`YTD Net (${currentYear})`}
          value={fmt(ytdNet, displayCurrency)}
          icon={Wallet}
          tone="from-emerald-500 to-teal-500"
        />
        <Stat
          label={`YTD Deductions (${currentYear})`}
          value={fmt(ytdDeductions, displayCurrency)}
          icon={Receipt}
          tone="from-rose-500 to-red-500"
        />
      </div>

      <Tabs defaultValue="payslips" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payslips">Payslips</TabsTrigger>
          <TabsTrigger value="loans">Loans & Advances</TabsTrigger>
        </TabsList>

        <TabsContent value="payslips">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Pay History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading payslips…</span>
                </div>
              ) : payslips.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                  No payslips yet. They'll appear here once your employer runs
                  payroll for a period that includes you.
                </p>
              ) : (
                payslips.map((p) => (
                  <div
                    key={p._id}
                    className="flex items-center justify-between py-3 border-b last:border-b-0 hover:bg-muted/30 px-2 rounded transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{p.periodLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(p.periodStart)} – {fmtDate(p.periodEnd)}
                      </p>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-xs">
                      <div className="text-right">
                        <p className="text-muted-foreground">Gross</p>
                        <p className="font-mono text-sm text-foreground">
                          {fmt(p.grossSalary, p.payCurrency)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">Net</p>
                        <p className="font-mono text-sm font-semibold text-foreground">
                          {fmt(p.netSalary, p.payCurrency)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setActiveId(p._id)}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loans">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" /> Loans & Advances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground py-6 text-center">
                Loan details aren't available here yet — check with your HR
                administrator about any active salary advances or loans, or look
                for any deductions labeled with your loan's name on your payslip
                above.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payslip detail — renders the SAME branded HTML the tenant
          sees, via the employee-scoped render endpoint. */}
      <Sheet open={!!activeId} onOpenChange={(v) => !v && setActiveId(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
          {active && (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" /> {active.periodLabel}
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  disabled
                  title="PDF export coming soon"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Download PDF
                </Button>
              </div>
              {htmlLoading ? (
                <div className="flex items-center justify-center flex-1 gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Rendering payslip…</span>
                </div>
              ) : (
                <iframe
                  srcDoc={payslipHtml}
                  className="flex-1 w-full border-0"
                  title="Payslip"
                />
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: any;
  icon: any;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div
          className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
      </CardContent>
    </Card>
  );
}
