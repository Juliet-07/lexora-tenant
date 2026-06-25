import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Wallet,
  Download,
  FileText,
  TrendingUp,
  Receipt,
  Banknote,
  CreditCard,
  Loader2,
  Hourglass,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchMyPayslips,
  downloadMyPayslipPdf,
  fetchMyLoans,
  requestLoan,
  type MyPayslipSummary,
  type EmployeeLoan,
} from "@/lib/hr-api";

const currency = (n: number, code = "RWF") => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${code} ${Math.round(n).toLocaleString()}`;
  }
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const LOAN_STATUS_TONE: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  active: "bg-info/10 text-info border-info/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  paid_off: "bg-success/10 text-success border-success/20",
  cancelled: "bg-muted text-muted-foreground",
  paused: "bg-muted text-muted-foreground",
};

export default function MyPayslips() {
  const queryClient = useQueryClient();
  const [active, setActive] = useState<MyPayslipSummary | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [loanForm, setLoanForm] = useState({
    label: "",
    amountRequested: "",
    reason: "",
  });

  const { data: payslips = [], isLoading: payslipsLoading } = useQuery({
    queryKey: ["my-payslips"],
    queryFn: fetchMyPayslips,
  });

  const { data: loans = [], isLoading: loansLoading } = useQuery({
    queryKey: ["my-loans"],
    queryFn: fetchMyLoans,
  });

  const requestLoanMutation = useMutation({
    mutationFn: requestLoan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-loans"] });
      setRequestOpen(false);
      setLoanForm({ label: "", amountRequested: "", reason: "" });
      toast.success(
        "Loan request submitted. You'll be notified once it's reviewed.",
      );
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to submit request"),
  });

  const payCurrency = payslips[0]?.payCurrency ?? "RWF";
  const ytdGross = payslips.reduce((s, p) => s + p.grossSalary, 0);
  const ytdNet = payslips.reduce((s, p) => s + p.netSalary, 0);
  const ytdTax = payslips.reduce((s, p) => {
    const taxLine = p.deductions.find((d) =>
      d.label.toLowerCase().includes("tax"),
    );
    return s + (taxLine?.employeeAmount ?? 0);
  }, 0);

  const activeLoans = loans.filter((l) => l.status === "active");

  const handleDownload = async (payslipId: string) => {
    setDownloadingId(payslipId);
    try {
      await downloadMyPayslipPdf(payslipId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to download PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Payslips & Loans</h1>
        <p className="text-sm text-muted-foreground">
          View your pay history and manage loan requests.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="YTD Gross"
          value={currency(ytdGross, payCurrency)}
          icon={Banknote}
          tone="from-blue-500 to-cyan-500"
        />
        <Stat
          label="YTD Net"
          value={currency(ytdNet, payCurrency)}
          icon={Wallet}
          tone="from-emerald-500 to-teal-500"
        />
        <Stat
          label="YTD Tax"
          value={currency(ytdTax, payCurrency)}
          icon={Receipt}
          tone="from-rose-500 to-red-500"
        />
        <Stat
          label="Active Loans"
          value={activeLoans.length}
          icon={CreditCard}
          tone="from-violet-500 to-purple-600"
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
              {payslipsLoading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading payslips…</span>
                </div>
              ) : payslips.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                  No payslips yet. They'll appear here once payroll has been run
                  for you.
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
                        {fmtDate(p.periodEnd)}
                      </p>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-xs">
                      <div className="text-right">
                        <p className="text-muted-foreground">Gross</p>
                        <p className="font-mono text-sm text-foreground">
                          {currency(p.grossSalary, p.payCurrency)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">Net</p>
                        <p className="font-mono text-sm font-semibold text-foreground">
                          {currency(p.netSalary, p.payCurrency)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setActive(p)}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={downloadingId === p._id}
                        onClick={() => handleDownload(p._id)}
                      >
                        {downloadingId === p._id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
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
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" /> My Loans &
                Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loansLoading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading…</span>
                </div>
              ) : loans.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No loan requests yet.
                </p>
              ) : (
                loans.map((l) => (
                  <div key={l._id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{l.label}</p>
                      <Badge
                        variant="outline"
                        className={LOAN_STATUS_TONE[l.status] ?? ""}
                      >
                        {l.status === "pending" && (
                          <Hourglass className="h-3 w-3 mr-1" />
                        )}
                        {l.status.replace("_", " ")}
                      </Badge>
                    </div>

                    {l.status === "pending" && (
                      <p className="text-xs text-muted-foreground mb-2">
                        Requested {currency(l.principalAmount, l.currency)} —
                        awaiting review.
                      </p>
                    )}

                    {l.status === "rejected" && l.rejectionReason && (
                      <div className="text-xs bg-destructive/5 border border-destructive/20 rounded p-2 mb-2">
                        <span className="font-medium text-destructive">
                          Reason:{" "}
                        </span>
                        <span className="text-muted-foreground">
                          {l.rejectionReason}
                        </span>
                      </div>
                    )}

                    {(l.status === "active" || l.status === "paid_off") && (
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <p className="text-muted-foreground">Principal</p>
                          <p className="font-mono text-sm">
                            {currency(l.principalAmount, l.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Outstanding</p>
                          <p className="font-mono text-sm">
                            {currency(l.outstandingBalance, l.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Installment</p>
                          <p className="text-sm">
                            {currency(l.monthlyInstallment, l.currency)}/mo
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => setRequestOpen(true)}
              >
                Request New Advance
              </Button>
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
                <SheetTitle>{active.periodLabel}</SheetTitle>
                <SheetDescription>{fmtDate(active.periodEnd)}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                <div className="bg-gradient-to-br from-primary to-secondary text-white p-5 rounded-xl">
                  <p className="text-xs opacity-80 uppercase tracking-wide">
                    Net Pay
                  </p>
                  <p className="text-3xl font-bold mt-1">
                    {currency(active.netSalary, active.payCurrency)}
                  </p>
                  <div className="flex justify-between text-xs opacity-90 mt-3 pt-3 border-t border-white/20">
                    <span>
                      Gross: {currency(active.grossSalary, active.payCurrency)}
                    </span>
                    <span>
                      Deductions:{" "}
                      {currency(
                        active.totalEmployeeDeductions,
                        active.payCurrency,
                      )}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-success uppercase tracking-wide mb-2 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Earnings
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm py-1.5 border-b last:border-b-0">
                      <span>Basic Salary</span>
                      <span className="font-mono">
                        {currency(active.basicSalary, active.payCurrency)}
                      </span>
                    </div>
                    {active.allowances.map((a) => (
                      <div
                        key={a.key}
                        className="flex justify-between text-sm py-1.5 border-b last:border-b-0"
                      >
                        <span>{a.label}</span>
                        <span className="font-mono">
                          {currency(a.amount, active.payCurrency)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-semibold pt-2">
                      <span>Total Gross</span>
                      <span className="font-mono">
                        {currency(active.grossSalary, active.payCurrency)}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-destructive uppercase tracking-wide mb-2">
                    Deductions
                  </p>
                  <div className="space-y-1.5">
                    {active.deductions
                      .filter(
                        (d) => d.visibleToEmployee && d.employeeAmount > 0,
                      )
                      .map((d) => (
                        <div
                          key={d.key}
                          className="flex justify-between text-sm py-1.5 border-b last:border-b-0"
                        >
                          <span>{d.label}</span>
                          <span className="font-mono">
                            -{currency(d.employeeAmount, active.payCurrency)}
                          </span>
                        </div>
                      ))}
                    {active.loanDeductions.map((l) => (
                      <div
                        key={l.loanId}
                        className="flex justify-between text-sm py-1.5 border-b last:border-b-0"
                      >
                        <span>{l.label}</span>
                        <span className="font-mono">
                          -{currency(l.amountDeducted, active.payCurrency)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-semibold pt-2">
                      <span>Total Deductions</span>
                      <span className="font-mono">
                        -
                        {currency(
                          active.totalEmployeeDeductions,
                          active.payCurrency,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-primary to-secondary"
                  disabled={downloadingId === active._id}
                  onClick={() => handleDownload(active._id)}
                >
                  {downloadingId === active._id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download PDF
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Request loan dialog */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request a Loan / Advance</DialogTitle>
            <DialogDescription>
              Your request will be reviewed by HR. They'll set the repayment
              terms if approved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>What is this for?</Label>
              <Input
                placeholder="e.g. Emergency Advance"
                value={loanForm.label}
                onChange={(e) =>
                  setLoanForm((f) => ({ ...f, label: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Amount needed</Label>
              <Input
                type="number"
                placeholder="0"
                value={loanForm.amountRequested}
                onChange={(e) =>
                  setLoanForm((f) => ({
                    ...f,
                    amountRequested: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Reason</Label>
              <Textarea
                rows={3}
                placeholder="Briefly explain why you need this…"
                value={loanForm.reason}
                onChange={(e) =>
                  setLoanForm((f) => ({ ...f, reason: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !loanForm.label ||
                !loanForm.amountRequested ||
                !loanForm.reason ||
                requestLoanMutation.isPending
              }
              onClick={() =>
                requestLoanMutation.mutate({
                  label: loanForm.label,
                  amountRequested: Number(loanForm.amountRequested),
                  reason: loanForm.reason,
                })
              }
            >
              {requestLoanMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
