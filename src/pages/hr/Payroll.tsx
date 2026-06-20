import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Wallet,
  Download,
  Landmark,
  TrendingDown,
  Clock,
  Settings2,
  Plus,
  Trash2,
  MapPin,
  Globe2,
  Calculator,
  Users,
  Eye,
  BadgeCheck,
  Loader2,
  Sparkles,
  Receipt,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchLocations,
  fetchEmployees,
  fetchAllPayrollPolicies,
  upsertPayrollPolicy,
  applyRwandaPayrollPreset,
  deletePayrollPolicy,
  fetchAllLoans,
  createLoan,
  updateLoan,
  deleteLoan,
  fetchAllPayrollRuns,
  fetchPayrollRunDetail,
  createPayrollRun,
  recalculatePayrollRun,
  processPayrollRun,
  markPayrollRunPaid,
  discardPayrollRun,
  
  fetchAllEmployeesPeriodStatus,
  fetchLiveFxRate,
  type PayrollPolicy,
  type PayrollDeductionRule,
  type EmployeeLoan,
  type PayrollRun,
  type Payslip,
  type HrLocation,
  type EmployeePeriodStatus,
  type ManualExchangeRate,
} from "@/lib/hr-api";

const CURRENCIES = [
  "RWF",
  "USD",
  "EUR",
  "GBP",
  "NGN",
  "KES",
  "ZAR",
  "GHS",
  "INR",
  "JPY",
];

const fmt = (n: number, currency = "USD") => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${Math.round(n).toLocaleString()}`;
  }
};

const runStatusTone = (s: PayrollRun["status"]) =>
  s === "paid"
    ? "bg-success/10 text-success border-success/20"
    : s === "processed"
      ? "bg-info/10 text-info border-info/20"
      : "bg-warning/10 text-warning border-warning/20";

const loanStatusTone = (s: EmployeeLoan["status"]) =>
  s === "active"
    ? "bg-info/10 text-info border-info/20"
    : s === "paid_off"
      ? "bg-success/10 text-success border-success/20"
      : s === "paused"
        ? "bg-warning/10 text-warning border-warning/20"
        : "bg-muted text-muted-foreground";

const locName = (l: PayrollPolicy["locationId"]) => l?.name ?? "Tenant default";

function buildPeriodOptions(): { label: string; start: string; end: string }[] {
  const opts = [];
  const now = new Date();
  for (let i = -2; i <= 1; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const label = d.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);
    opts.push({ label, start, end });
  }
  return opts;
}
const PERIOD_OPTIONS = buildPeriodOptions();

export default function HRPayroll() {
  const queryClient = useQueryClient();
  const [openRun, setOpenRun] = useState<PayrollRun | null>(null);
  const [openPayslip, setOpenPayslip] = useState<Payslip | null>(null);
  const [openLoan, setOpenLoan] = useState<EmployeeLoan | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<PayrollPolicy | null>(
    null,
  );

  const [newRunOpen, setNewRunOpen] = useState(false);
  const [newLoanOpen, setNewLoanOpen] = useState(false);
  const [deleteLoanTarget, setDeleteLoanTarget] = useState<EmployeeLoan | null>(
    null,
  );
  const [discardRunTarget, setDiscardRunTarget] = useState<PayrollRun | null>(
    null,
  );
  const [period, setPeriod] = useState(PERIOD_OPTIONS[2].label); // index 2 = current month (i=0 offset)

  // ── Manual exchange rates for the New Run dialog. Locked-per-run
  // is the default model (matches real practice — one fixed rate set
  // per pay period, not refetched live mid-calculation). The "fetch
  // live rate" button below only PRE-FILLS a row's rate; it never
  // applies anything automatically. ──
  const [manualRates, setManualRates] = useState<ManualExchangeRate[]>([]);
  const [fetchingRateFor, setFetchingRateFor] = useState<string | null>(null);

  const { data: locations = [] } = useQuery({
    queryKey: ["hr-locations"],
    queryFn: fetchLocations,
  });
  const { data: empData } = useQuery({
    queryKey: ["hr-employees-for-payroll"],
    queryFn: () => fetchEmployees({ limit: 500 }),
  });
  const employees = empData?.items ?? [];

  const { data: policies = [], isLoading: policiesLoading } = useQuery({
    queryKey: ["payroll-policies"],
    queryFn: fetchAllPayrollPolicies,
  });

  const { data: loans = [], isLoading: loansLoading } = useQuery({
    queryKey: ["payroll-loans"],
    queryFn: () => fetchAllLoans(),
  });

  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: ["payroll-runs"],
    queryFn: fetchAllPayrollRuns,
  });

  const { data: periodStatusMap = {}, isLoading: periodStatusLoading } =
    useQuery({
      queryKey: ["payroll-period-status", period],
      queryFn: () => fetchAllEmployeesPeriodStatus(period),
    });

  const { data: runDetail, isLoading: runDetailLoading } = useQuery({
    queryKey: ["payroll-run-detail", openRun?._id],
    queryFn: () => fetchPayrollRunDetail(openRun!._id),
    enabled: !!openRun,
  });

  // payslip HTML render endpoint no longer needed — we render natively


  const totalLoanBook = loans.reduce((acc, l) => acc + l.principalAmount, 0);
  const activeBalance = loans
    .filter((l) => l.status === "active")
    .reduce((acc, l) => acc + l.outstandingBalance, 0);
  const activeCount = loans.filter((l) => l.status === "active").length;

  const applyPresetMutation = useMutation({
    mutationFn: applyRwandaPayrollPreset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-policies"] });
      toast.success("Rwanda statutory preset applied.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to apply preset"),
  });

  const upsertPolicyMutation = useMutation({
    mutationFn: upsertPayrollPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-policies"] });
      setEditingPolicy(null);
      toast.success("Policy saved.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to save policy"),
  });

  const deletePolicyMutation = useMutation({
    mutationFn: deletePayrollPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-policies"] });
      toast.success("Policy removed.");
    },
  });

  const createLoanMutation = useMutation({
    mutationFn: createLoan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-loans"] });
      setNewLoanOpen(false);
      toast.success("Loan created.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to create loan"),
  });

  const updateLoanMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => updateLoan(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-loans"] });
      toast.success("Loan updated.");
    },
  });

  const deleteLoanMutation = useMutation({
    mutationFn: deleteLoan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-loans"] });
      setDeleteLoanTarget(null);
      toast.success("Loan deleted.");
    },
  });

  const createRunMutation = useMutation({
    mutationFn: createPayrollRun,
    onSuccess: (run) => {
      queryClient.invalidateQueries({ queryKey: ["payroll-runs"] });
      setNewRunOpen(false);
      setManualRates([]);
      toast.success(
        `Draft run created — ${run.employeeCount} payslip(s) calculated.`,
      );
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to create run"),
  });

  const recalcRunMutation = useMutation({
    mutationFn: recalculatePayrollRun,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-runs"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-run-detail"] });
      toast.success("Run recalculated.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to recalculate"),
  });

  const processRunMutation = useMutation({
    mutationFn: processPayrollRun,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-runs"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-run-detail"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-loans"] });
      toast.success("Run processed. Loan deductions committed.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to process run"),
  });

  const markPaidMutation = useMutation({
    mutationFn: markPayrollRunPaid,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-runs"] });
      toast.success("Marked as paid.");
    },
  });

  const discardRunMutation = useMutation({
    mutationFn: discardPayrollRun,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-runs"] });
      setDiscardRunTarget(null);
      toast.success("Draft discarded.");
    },
  });

  // ── Employees-tab mutations — calculate one employee, or run
  // payroll for everyone at once. Both go through the same
  // createPayrollRun call; "one" just adds employeeId to the dto. ──
  const calcOneMutation = useMutation({
    mutationFn: createPayrollRun,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-period-status"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-runs"] });
      toast.success("Payslip calculated.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to calculate"),
  });

  const calcAllMutation = useMutation({
    mutationFn: createPayrollRun,
    onSuccess: (run) => {
      queryClient.invalidateQueries({ queryKey: ["payroll-period-status"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-runs"] });
      toast.success(`Calculated payroll for ${run.employeeCount} employee(s).`);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to run payroll"),
  });

  const [runForm, setRunForm] = useState({
    periodLabel: "",
    periodStart: "",
    periodEnd: "",
    locationId: "all",
    runCurrency: "RWF",
  });

  const [loanForm, setLoanForm] = useState({
    employeeId: "",
    label: "",
    principalAmount: "",
    currency: "RWF",
    monthlyInstallment: "",
    note: "",
  });

  // Fetches a live rate and pre-fills the row's input — does NOT
  // apply it automatically. The tenant still has to look at the
  // number and keep/edit/delete it before the run is created.
  const fetchAndFillRate = async (fromCurrency: string) => {
    setFetchingRateFor(fromCurrency);
    try {
      const result = await fetchLiveFxRate(fromCurrency, runForm.runCurrency);
      setManualRates((prev) =>
        prev.map((r) =>
          r.fromCurrency === fromCurrency ? { ...r, rate: result.rate } : r,
        ),
      );
      toast.success(
        `Fetched live rate: 1 ${fromCurrency} = ${result.rate} ${runForm.runCurrency}` +
          (result.stale ? " (cached, may not be today's rate)" : ""),
      );
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ??
          "Could not fetch a live rate. Enter it manually.",
      );
    } finally {
      setFetchingRateFor(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payroll</h1>
        <p className="text-sm text-muted-foreground">
          Location-based deduction policies, employee loans, and payroll runs
          with multi-currency support.
        </p>
      </div>

      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList>
          <TabsTrigger value="employees">
            <Users className="h-3.5 w-3.5 mr-1.5" /> Employees
          </TabsTrigger>
          <TabsTrigger value="runs">
            <Receipt className="h-3.5 w-3.5 mr-1.5" /> Payroll Runs
          </TabsTrigger>
          <TabsTrigger value="loans">
            <Landmark className="h-3.5 w-3.5 mr-1.5" /> Loans
          </TabsTrigger>
          <TabsTrigger value="policy">
            <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Policies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-4">
          <Card className="bg-gradient-to-br from-primary/10 via-secondary/5 to-background border-primary/20">
            <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Payroll Period
                  </p>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="h-9 w-48 font-bold text-base mt-0.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIOD_OPTIONS.map((o) => (
                        <SelectItem key={o.label} value={o.label}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary to-secondary"
                disabled={calcAllMutation.isPending}
                onClick={() => {
                  const opt = PERIOD_OPTIONS.find((o) => o.label === period)!;
                  calcAllMutation.mutate({
                    periodLabel: period,
                    periodStart: opt.start,
                    periodEnd: opt.end,
                    runCurrency: "RWF",
                  });
                }}
              >
                {calcAllMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                    Calculating…
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4 mr-2" /> Run Payroll for All
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Employees — {period}</CardTitle>
              <p className="text-xs text-muted-foreground">
                Each employee's basic salary and their payroll status for the
                selected period.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[11px] uppercase text-muted-foreground bg-muted/40 border-b">
                <div className="col-span-4">Employee</div>
                <div className="col-span-2">Location</div>
                <div className="col-span-2 text-right">Basic Salary</div>
                <div className="col-span-2 text-right">Net Pay</div>
                <div className="col-span-2 text-right">Status / Action</div>
              </div>
              {employees.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                  No employees yet.
                </p>
              ) : (
                employees.map((e) => {
                  const ps: EmployeePeriodStatus | undefined =
                    periodStatusMap[e._id];
                  const locationName =
                    typeof e.locationId === "object" && e.locationId !== null
                      ? e.locationId.name
                      : "—";
                  return (
                    <div
                      key={e._id}
                      className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-b last:border-b-0 hover:bg-muted/20"
                    >
                      <div className="col-span-4 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-secondary text-white text-xs font-bold flex items-center justify-center">
                          {e.firstName[0]}
                          {e.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {e.firstName} {e.lastName}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {e.jobTitle}
                          </p>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {locationName}
                        </p>
                      </div>
                      <div className="col-span-2 text-right">
                        {e.salary != null ? (
                          <p className="text-sm font-semibold">
                            {fmt(e.salary, e.salaryCurrency)}
                          </p>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-destructive/10 text-destructive border-destructive/20"
                          >
                            No salary set
                          </Badge>
                        )}
                      </div>
                      <div className="col-span-2 text-right">
                        {ps ? (
                          <p className="text-sm font-semibold text-success">
                            {fmt(ps.netSalary, ps.payCurrency)}
                          </p>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-2">
                        <Badge
                          variant="outline"
                          className={
                            !ps
                              ? "bg-muted text-muted-foreground"
                              : ps.status === "paid"
                                ? "bg-success/10 text-success border-success/20"
                                : ps.status === "processed"
                                  ? "bg-info/10 text-info border-info/20"
                                  : "bg-warning/10 text-warning border-warning/20"
                          }
                        >
                          {ps ? ps.status : "Not started"}
                        </Badge>
                        {!ps && e.salary != null && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={calcOneMutation.isPending}
                            onClick={() => {
                              const opt = PERIOD_OPTIONS.find(
                                (o) => o.label === period,
                              )!;
                              calcOneMutation.mutate({
                                periodLabel: period,
                                periodStart: opt.start,
                                periodEnd: opt.end,
                                employeeId: e._id,
                                runCurrency: e.salaryCurrency || "RWF",
                              });
                            }}
                          >
                            <Calculator className="h-3 w-3 mr-1" /> Calculate
                          </Button>
                        )}
                        {ps && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              const detail = await fetchPayrollRunDetail(
                                ps.runId,
                              );
                              const slip = detail.payslips.find(
                                (p) => p._id === ps.payslipId,
                              );
                              if (slip) setOpenPayslip(slip);
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="runs" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Create a draft run to calculate payslips, review, then process to
              finalize.
            </p>
            <Button
              className="bg-gradient-to-r from-primary to-secondary"
              onClick={() => setNewRunOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" /> New Payroll Run
            </Button>
          </div>

          {runsLoading ? (
            <LoadingRow label="Loading payroll runs…" />
          ) : runs.length === 0 ? (
            <EmptyCard text="No payroll runs yet. Create your first run." />
          ) : (
            runs.map((r) => (
              <Card key={r._id}>
                <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Receipt className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{r.periodLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.employeeCount} employee
                        {r.employeeCount !== 1 ? "s" : ""} ·{" "}
                        {r.locationId?.name ?? "All locations"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <span>
                      Gross <strong>{fmt(r.totalGross, r.runCurrency)}</strong>
                    </span>
                    <span className="text-success">
                      Net <strong>{fmt(r.totalNet, r.runCurrency)}</strong>
                    </span>
                    <Badge
                      variant="outline"
                      className={runStatusTone(r.status)}
                    >
                      {r.status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOpenRun(r)}
                    >
                      <Eye className="h-3 w-3 mr-1" /> View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="loans" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">
                    Total Loan Book
                  </p>
                  <p className="text-xl font-bold">
                    {fmt(totalLoanBook, "RWF")}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Landmark className="h-5 w-5 text-white" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">
                    Active Balance
                  </p>
                  <p className="text-xl font-bold">
                    {fmt(activeBalance, "RWF")}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-white" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">
                    Active Loans
                  </p>
                  <p className="text-xl font-bold">{activeCount}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-white" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Employee Loans</CardTitle>
              <Button size="sm" onClick={() => setNewLoanOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> New Loan
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {loansLoading ? (
                <LoadingRow label="Loading loans…" />
              ) : loans.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No loans on record.
                </p>
              ) : (
                loans.map((l) => {
                  const emp =
                    typeof l.employeeId === "object" ? l.employeeId : null;
                  return (
                    <div
                      key={l._id}
                      className="flex items-center justify-between border-b pb-2 last:border-b-0 cursor-pointer hover:bg-muted/30 px-2 rounded"
                      onClick={() => setOpenLoan(l)}
                    >
                      <div>
                        <p className="text-sm font-medium flex items-center gap-2">
                          {emp
                            ? `${emp.firstName} ${emp.lastName}`
                            : "Employee"}
                          <Badge
                            variant="outline"
                            className={`${loanStatusTone(l.status)} text-[10px]`}
                          >
                            {l.status.replace("_", " ")}
                          </Badge>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {l.label}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {fmt(l.outstandingBalance, l.currency)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {fmt(l.monthlyInstallment, l.currency)}/mo
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policy" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              One policy per location (or a tenant-wide default). Rwanda's
              statutory rates can be applied with one click.
            </p>
            <Button
              variant="outline"
              onClick={() => setEditingPolicy({} as PayrollPolicy)}
            >
              <Plus className="h-3.5 w-3.5 mr-2" /> New Policy
            </Button>
          </div>

          {policiesLoading ? (
            <LoadingRow label="Loading policies…" />
          ) : policies.length === 0 ? (
            <EmptyCard text="No payroll policies configured yet." />
          ) : (
            policies.map((p) => (
              <Card key={p._id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold">{locName(p.locationId)}</h3>
                      <Badge
                        variant="outline"
                        className="bg-primary/10 text-primary border-primary/20"
                      >
                        {p.currency}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {p.payFrequency}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={applyPresetMutation.isPending}
                        onClick={() =>
                          applyPresetMutation.mutate({
                            locationId: p.locationId?._id,
                            overwrite: false,
                          })
                        }
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Apply Rwanda
                        preset
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingPolicy(p)}
                      >
                        <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deletePolicyMutation.mutate(p._id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {p.deductions.map((d) => (
                      <div
                        key={d.key}
                        className="border rounded-md p-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{d.label}</span>
                          {!d.isActive && (
                            <Badge variant="secondary" className="text-[9px]">
                              Off
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mt-0.5">
                          {d.kind === "percentage"
                            ? `Employee ${(d.employeeRate * 100).toFixed(1)}% · Employer ${(d.employerRate * 100).toFixed(1)}%`
                            : d.kind === "flat"
                              ? `Flat ${fmt(d.employeeFlatAmount, p.currency)}`
                              : "Progressive brackets"}
                        </p>
                      </div>
                    ))}
                    {p.deductions.length === 0 && (
                      <p className="text-xs text-muted-foreground col-span-3">
                        No deductions configured.
                      </p>
                    )}
                  </div>

                  {p.allowanceTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t">
                      {p.allowanceTypes.map((a) => (
                        <Badge
                          key={a.key}
                          variant="outline"
                          className="text-[10px]"
                        >
                          {a.label}
                          {a.isTransportAllowance ? " (transport)" : ""}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* ── New Payroll Run dialog ── */}
      <Dialog
        open={newRunOpen}
        onOpenChange={(o) => {
          setNewRunOpen(o);
          if (!o) setManualRates([]);
        }}
      >
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Payroll Run</DialogTitle>
            <DialogDescription>
              Calculates a draft payslip for every active employee in scope.
              Nothing is finalized until you process it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Period label</Label>
              <Input
                placeholder="e.g. June 2026"
                value={runForm.periodLabel}
                onChange={(e) =>
                  setRunForm((f) => ({ ...f, periodLabel: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Period start</Label>
                <Input
                  type="date"
                  value={runForm.periodStart}
                  onChange={(e) =>
                    setRunForm((f) => ({ ...f, periodStart: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Period end</Label>
                <Input
                  type="date"
                  value={runForm.periodEnd}
                  onChange={(e) =>
                    setRunForm((f) => ({ ...f, periodEnd: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <Select
                value={runForm.locationId}
                onValueChange={(v) =>
                  setRunForm((f) => ({ ...f, locationId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l._id} value={l._id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Run currency</Label>
              <Select
                value={runForm.runCurrency}
                onValueChange={(v) =>
                  setRunForm((f) => ({ ...f, runCurrency: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Manual exchange rates — locked per run ── */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label>Exchange rates for this run</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setManualRates((prev) => [
                      ...prev,
                      { fromCurrency: "USD", rate: 0 },
                    ])
                  }
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Rate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                If any employees are paid in a different currency than{" "}
                {runForm.runCurrency}, set a fixed rate here for this run. This
                rate is locked for this run only — it won't change
                automatically. Leave empty to fall back to the live rate at
                calculation time.
              </p>
              {manualRates.map((r, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-end"
                >
                  <div className="space-y-1">
                    <Label className="text-xs">From</Label>
                    <Select
                      value={r.fromCurrency}
                      onValueChange={(v) =>
                        setManualRates((prev) =>
                          prev.map((x, idx) =>
                            idx === i ? { ...x, fromCurrency: v } : x,
                          ),
                        )
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <span className="text-xs text-muted-foreground self-center pb-2">
                    → {runForm.runCurrency}
                  </span>
                  <div className="space-y-1">
                    <Label className="text-xs">Rate</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      placeholder="e.g. 1455"
                      className="h-9"
                      value={r.rate || ""}
                      onChange={(e) =>
                        setManualRates((prev) =>
                          prev.map((x, idx) =>
                            idx === i
                              ? { ...x, rate: parseFloat(e.target.value) || 0 }
                              : x,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="flex gap-1 pb-0.5">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9"
                      disabled={fetchingRateFor === r.fromCurrency}
                      title="Fetch live rate (pre-fills only — doesn't apply automatically)"
                      onClick={() => fetchAndFillRate(r.fromCurrency)}
                    >
                      {fetchingRateFor === r.fromCurrency ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Globe2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9"
                      onClick={() =>
                        setManualRates((prev) =>
                          prev.filter((_, idx) => idx !== i),
                        )
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewRunOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !runForm.periodLabel ||
                !runForm.periodStart ||
                !runForm.periodEnd ||
                createRunMutation.isPending
              }
              onClick={() =>
                createRunMutation.mutate({
                  periodLabel: runForm.periodLabel,
                  periodStart: runForm.periodStart,
                  periodEnd: runForm.periodEnd,
                  locationId:
                    runForm.locationId !== "all"
                      ? runForm.locationId
                      : undefined,
                  runCurrency: runForm.runCurrency,
                  manualRates: manualRates.filter((r) => r.rate > 0),
                })
              }
            >
              {createRunMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Calculating…
                </>
              ) : (
                "Create Run"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newLoanOpen} onOpenChange={setNewLoanOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Loan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Employee</Label>
              <Select
                value={loanForm.employeeId}
                onValueChange={(v) =>
                  setLoanForm((f) => ({ ...f, employeeId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e._id} value={e._id}>
                      {e.firstName} {e.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Label</Label>
              <Input
                placeholder="e.g. Salary Advance — June 2026"
                value={loanForm.label}
                onChange={(e) =>
                  setLoanForm((f) => ({ ...f, label: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Principal amount</Label>
                <Input
                  type="number"
                  value={loanForm.principalAmount}
                  onChange={(e) =>
                    setLoanForm((f) => ({
                      ...f,
                      principalAmount: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Currency</Label>
                <Select
                  value={loanForm.currency}
                  onValueChange={(v) =>
                    setLoanForm((f) => ({ ...f, currency: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Monthly installment</Label>
              <Input
                type="number"
                value={loanForm.monthlyInstallment}
                onChange={(e) =>
                  setLoanForm((f) => ({
                    ...f,
                    monthlyInstallment: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Note (optional)</Label>
              <Input
                value={loanForm.note}
                onChange={(e) =>
                  setLoanForm((f) => ({ ...f, note: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewLoanOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !loanForm.employeeId ||
                !loanForm.label ||
                !loanForm.principalAmount ||
                !loanForm.monthlyInstallment ||
                createLoanMutation.isPending
              }
              onClick={() =>
                createLoanMutation.mutate({
                  employeeId: loanForm.employeeId,
                  label: loanForm.label,
                  principalAmount: Number(loanForm.principalAmount),
                  currency: loanForm.currency,
                  monthlyInstallment: Number(loanForm.monthlyInstallment),
                  note: loanForm.note || undefined,
                })
              }
            >
              {createLoanMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create Loan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!openLoan} onOpenChange={(o) => !o && setOpenLoan(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {openLoan && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Landmark className="h-5 w-5" /> Loan Details
                </SheetTitle>
              </SheetHeader>
              <div className="mt-5 space-y-4">
                <div className="border rounded-lg divide-y">
                  {[
                    ["Label", openLoan.label],
                    [
                      "Principal",
                      fmt(openLoan.principalAmount, openLoan.currency),
                    ],
                    [
                      "Outstanding balance",
                      fmt(openLoan.outstandingBalance, openLoan.currency),
                    ],
                    [
                      "Monthly installment",
                      fmt(openLoan.monthlyInstallment, openLoan.currency),
                    ],
                    ["Status", openLoan.status.replace("_", " ")],
                    [
                      "Started",
                      new Date(openLoan.startDate).toLocaleDateString(),
                    ],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between p-3 text-sm">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium capitalize">{v}</span>
                    </div>
                  ))}
                </div>

                {openLoan.deductionHistory.length > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                      Deduction history
                    </p>
                    <div className="space-y-1.5">
                      {openLoan.deductionHistory.map((d, i) => (
                        <div
                          key={i}
                          className="flex justify-between text-xs border-b pb-1.5 last:border-b-0"
                        >
                          <span>
                            {new Date(d.deductedAt).toLocaleDateString()}
                          </span>
                          <span className="font-mono">
                            -{fmt(d.amount, openLoan.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {openLoan.status === "active" && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        updateLoanMutation.mutate({
                          id: openLoan._id,
                          dto: { status: "paused" },
                        });
                        setOpenLoan(null);
                      }}
                    >
                      Pause
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        setDeleteLoanTarget(openLoan);
                        setOpenLoan(null);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                  </div>
                )}
                {openLoan.status === "paused" && (
                  <Button
                    className="w-full"
                    onClick={() => {
                      updateLoanMutation.mutate({
                        id: openLoan._id,
                        dto: { status: "active" },
                      });
                      setOpenLoan(null);
                    }}
                  >
                    Resume
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!openRun} onOpenChange={(o) => !o && setOpenRun(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {openRun && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" /> {openRun.periodLabel}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={runStatusTone(openRun.status)}
                  >
                    {openRun.status}
                  </Badge>
                  <div className="flex gap-2">
                    {openRun.status === "draft" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={recalcRunMutation.isPending}
                          onClick={() => recalcRunMutation.mutate(openRun._id)}
                        >
                          <Calculator className="h-3.5 w-3.5 mr-1.5" />{" "}
                          Recalculate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDiscardRunTarget(openRun)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5 text-destructive" />{" "}
                          Discard
                        </Button>
                        <Button
                          size="sm"
                          disabled={processRunMutation.isPending}
                          onClick={() => processRunMutation.mutate(openRun._id)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />{" "}
                          Process
                        </Button>
                      </>
                    )}
                    {openRun.status === "processed" && (
                      <Button
                        size="sm"
                        onClick={() => markPaidMutation.mutate(openRun._id)}
                      >
                        <BadgeCheck className="h-3.5 w-3.5 mr-1.5" /> Mark Paid
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="border rounded-md p-3">
                    <p className="text-xs text-muted-foreground">Gross</p>
                    <p className="font-bold">
                      {fmt(openRun.totalGross, openRun.runCurrency)}
                    </p>
                  </div>
                  <div className="border rounded-md p-3">
                    <p className="text-xs text-muted-foreground">Deductions</p>
                    <p className="font-bold text-destructive">
                      -{fmt(openRun.totalDeductions, openRun.runCurrency)}
                    </p>
                  </div>
                  <div className="border rounded-md p-3">
                    <p className="text-xs text-muted-foreground">Net</p>
                    <p className="font-bold text-success">
                      {fmt(openRun.totalNet, openRun.runCurrency)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                    Payslips ({runDetail?.payslips.length ?? 0})
                  </p>
                  {runDetailLoading ? (
                    <LoadingRow label="Loading payslips…" />
                  ) : (
                    <div className="space-y-1.5">
                      {(runDetail?.payslips ?? []).map((p) => (
                        <div
                          key={p._id}
                          className="flex items-center justify-between border rounded-md p-2.5 cursor-pointer hover:bg-muted/30"
                          onClick={() => setOpenPayslip(p)}
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {p.employeeName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {p.jobTitle ?? "—"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-success">
                              {fmt(p.netSalary, p.payCurrency)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Net
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet
        open={!!openPayslip}
        onOpenChange={(o) => !o && setOpenPayslip(null)}
      >
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto p-0">
          {openPayslip && (
            <PayslipView
              slip={openPayslip}
              onDownload={() => downloadPayslipPdf(openPayslip)}
            />
          )}
        </SheetContent>
      </Sheet>

      {editingPolicy && (
        <PolicyEditorDialog
          policy={editingPolicy}
          locations={locations}
          onClose={() => setEditingPolicy(null)}
          onSave={(dto) => upsertPolicyMutation.mutate(dto)}
          saving={upsertPolicyMutation.isPending}
        />
      )}

      <AlertDialog
        open={!!deleteLoanTarget}
        onOpenChange={(o) => !o && setDeleteLoanTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this loan?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Past deduction history on payslips already
              issued is unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() =>
                deleteLoanTarget &&
                deleteLoanMutation.mutate(deleteLoanTarget._id)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!discardRunTarget}
        onOpenChange={(o) => !o && setDiscardRunTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this draft run?</AlertDialogTitle>
            <AlertDialogDescription>
              All calculated payslips for this run will be deleted. This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (discardRunTarget) {
                  discardRunMutation.mutate(discardRunTarget._id);
                  setOpenRun(null);
                }
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PolicyEditorDialog({
  policy,
  locations,
  onClose,
  onSave,
  saving,
}: {
  policy: PayrollPolicy;
  locations: HrLocation[];
  onClose: () => void;
  onSave: (dto: any) => void;
  saving: boolean;
}) {
  const [locationId, setLocationId] = useState(
    policy.locationId?._id ?? "default",
  );
  const [currency, setCurrency] = useState(policy.currency ?? "RWF");
  const [payFrequency, setPayFrequency] = useState(
    policy.payFrequency ?? "monthly",
  );
  const [deductions, setDeductions] = useState<PayrollDeductionRule[]>(
    policy.deductions ?? [],
  );

  const addDeduction = () =>
    setDeductions((prev) => [
      ...prev,
      {
        key: `custom_${Date.now()}`,
        label: "New Deduction",
        kind: "percentage",
        calculationBase: "gross",
        employeeRate: 0,
        employerRate: 0,
        employeeFlatAmount: 0,
        employerFlatAmount: 0,
        brackets: [],
        visibleToEmployee: true,
        isActive: true,
        isStatutoryPreset: false,
      },
    ]);

  const updateDeduction = (key: string, patch: Partial<PayrollDeductionRule>) =>
    setDeductions((prev) =>
      prev.map((d) => (d.key === key ? { ...d, ...patch } : d)),
    );

  const removeDeduction = (key: string) =>
    setDeductions((prev) => prev.filter((d) => d.key !== key));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{policy._id ? "Edit Policy" : "New Policy"}</DialogTitle>
          <DialogDescription>
            Configure deduction rules for a location, or the tenant-wide
            default.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Applies to</Label>
              <Select
                value={locationId}
                onValueChange={setLocationId}
                disabled={!!policy._id}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Tenant-wide default</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l._id} value={l._id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Pay frequency</Label>
            <Select value={payFrequency} onValueChange={setPayFrequency}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <Label>Deductions</Label>
            <Button size="sm" variant="outline" onClick={addDeduction}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Deduction
            </Button>
          </div>

          {deductions.map((d) => (
            <div
              key={d.key}
              className="border rounded-lg p-3 space-y-2 bg-muted/20"
            >
              <div className="flex items-center justify-between gap-2">
                <Input
                  value={d.label}
                  onChange={(e) =>
                    updateDeduction(d.key, { label: e.target.value })
                  }
                  className="h-8 max-w-xs font-medium"
                />
                <div className="flex items-center gap-2">
                  {d.isStatutoryPreset && (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-primary/10 text-primary border-primary/20"
                    >
                      Statutory
                    </Badge>
                  )}
                  <Switch
                    checked={d.isActive}
                    onCheckedChange={(v) =>
                      updateDeduction(d.key, { isActive: v })
                    }
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => removeDeduction(d.key)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Kind</Label>
                  <Select
                    value={d.kind}
                    onValueChange={(v: any) =>
                      updateDeduction(d.key, { kind: v })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="flat">Flat amount</SelectItem>
                      <SelectItem value="progressive_brackets">
                        Progressive (PAYE-style)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Calculated on</Label>
                  <Select
                    value={d.calculationBase}
                    onValueChange={(v: any) =>
                      updateDeduction(d.key, { calculationBase: v })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gross">Gross</SelectItem>
                      <SelectItem value="gross_minus_transport">
                        Gross − transport
                      </SelectItem>
                      <SelectItem value="taxable_income">
                        Taxable income
                      </SelectItem>
                      <SelectItem value="net">Net (running)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {d.kind === "percentage" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Employee %</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={d.employeeRate}
                        onChange={(e) =>
                          updateDeduction(d.key, {
                            employeeRate: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Employer %</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={d.employerRate}
                        onChange={(e) =>
                          updateDeduction(d.key, {
                            employerRate: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-8"
                      />
                    </div>
                  </>
                )}
                {d.kind === "flat" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Employee amount</Label>
                      <Input
                        type="number"
                        value={d.employeeFlatAmount}
                        onChange={(e) =>
                          updateDeduction(d.key, {
                            employeeFlatAmount: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Employer amount</Label>
                      <Input
                        type="number"
                        value={d.employerFlatAmount}
                        onChange={(e) =>
                          updateDeduction(d.key, {
                            employerFlatAmount: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-8"
                      />
                    </div>
                  </>
                )}
              </div>
              {d.kind === "progressive_brackets" && (
                <p className="text-xs text-muted-foreground italic">
                  Bracket editing for progressive deductions (like PAYE) isn't
                  available in this view yet — use the Rwanda preset for
                  standard PAYE bands, or edit brackets via the API directly.
                </p>
              )}
              <label className="flex items-center gap-2 text-xs pt-1">
                <Switch
                  checked={d.visibleToEmployee}
                  onCheckedChange={(v) =>
                    updateDeduction(d.key, { visibleToEmployee: v })
                  }
                />
                Visible to employee on payslip
              </label>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={saving}
            onClick={() =>
              onSave({
                locationId: locationId !== "default" ? locationId : undefined,
                currency,
                payFrequency,
                deductions,
                allowanceTypes: policy.allowanceTypes ?? [],
              })
            }
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save Policy"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LoadingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="p-10 text-center text-sm text-muted-foreground">
        {text}
      </CardContent>
    </Card>
  );
}
