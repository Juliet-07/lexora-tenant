import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Loader2,
  Mail,
  Table2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FINANCE_CURRENCIES,
  useFinanceCurrency,
} from "@/hooks/use-finance-currency";
import {
  downloadManagementReportPdf,
  type ReportPeriodType,
} from "@/lib/crm/finance-api";
import { fetchReportPack } from "@/lib/crm/report-api";
import { cn } from "@/lib/utils";
import {
  AgedPayablesTab,
  AgedReceivablesTab,
} from "@/components/finance/report/AgingTabs";
import {
  ClientProfitabilityTab,
  ServiceLineTab,
  WriteOffsTab,
} from "@/components/finance/report/AnalysisTabs";
import BudgetTab from "@/components/finance/report/BudgetTab";
import { EmailReportDialog } from "@/components/finance/report/EmailReportDialog";
import {
  EXPORTABLE_TABS,
  exportFullWorkbook,
  exportTabExcel,
  exportTabPdf,
} from "@/components/finance/report/exports";
import ManagementTab from "@/components/finance/report/ManagementTab";
import OverviewTab from "@/components/finance/report/OverviewTab";
import RatiosTab from "@/components/finance/report/RatiosTab";
import {
  ReportProvider,
  type ReportView,
} from "@/components/finance/report/shared";
import {
  BalanceSheetTab,
  CashFlowTab,
  PnlTab,
  TrialBalanceTab,
} from "@/components/finance/report/StatementTabs";

// The ten tabs from the product owner's layout, in the PO's order, then
// the three analysis views that used to live on the Financials page.
const TABS: { id: string; label: string; legacy?: boolean }[] = [
  { id: "overview", label: "Overview" },
  { id: "pnl", label: "Profit & Loss" },
  { id: "balance-sheet", label: "Balance Sheet" },
  { id: "cashflow", label: "Cash Flow" },
  { id: "trial-balance", label: "Trial Balance" },
  { id: "aged-rec", label: "Aged Receivables" },
  { id: "aged-pay", label: "Aged Payables" },
  { id: "budget", label: "Budget vs Actuals" },
  { id: "ratios", label: "Ratios" },
  { id: "mgmt", label: "Management Report" },
  // { id: "serviceline", label: "Service line P&L", legacy: true },
  // { id: "clientprofit", label: "Client profitability", legacy: true },
  // { id: "writeoffs", label: "Write-offs", legacy: true },
];

const now = new Date();
const CURRENT_YEAR = now.getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);
const BASE = "__base";

export default function Report() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("tab");
  const [tab, setTabState] = useState(
    TABS.some((t) => t.id === initial) ? (initial as string) : "overview",
  );
  const [view, setView] = useState<ReportView>("table");
  const [emailOpen, setEmailOpen] = useState(false);

  const [periodType, setPeriodType] = useState<ReportPeriodType>("Month");
  const [monthKey, setMonthKey] = useState(
    `${CURRENT_YEAR}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  );
  const [quarterYear, setQuarterYear] = useState(CURRENT_YEAR);
  const [quarterNum, setQuarterNum] = useState(
    Math.floor(now.getMonth() / 3) + 1,
  );
  const [yearKey, setYearKey] = useState(CURRENT_YEAR);
  const [currency, setCurrency] = useFinanceCurrency();

  const setTab = (id: string) => {
    setTabState(id);
    const next = new URLSearchParams(params);
    if (id === "overview") next.delete("tab");
    else next.set("tab", id);
    setParams(next, { replace: true });
  };

  const periodKey = useMemo(() => {
    if (periodType === "Month") return monthKey;
    if (periodType === "Quarter") return `${quarterYear}-Q${quarterNum}`;
    return String(yearKey);
  }, [periodType, monthKey, quarterYear, quarterNum, yearKey]);

  const {
    data: pack,
    error,
    isLoading,
    isFetching,
    isPlaceholderData,
    refetch,
  } = useQuery({
    queryKey: ["report-pack", periodType, periodKey, currency],
    queryFn: () =>
      fetchReportPack(periodType, periodKey, currency || undefined),
    enabled: periodType !== "Month" || /^\d{4}-\d{2}$/.test(monthKey),
    placeholderData: keepPreviousData,
    retry: false,
  });

  const exportable = EXPORTABLE_TABS.has(tab);
  const isMgmt = tab === "mgmt";

  const onPdf = () => {
    if (!pack) return;
    if (isMgmt)
      downloadManagementReportPdf(periodType, periodKey, currency || undefined);
    else exportTabPdf(pack, tab);
  };
  const onExcel = () => {
    if (!pack) return;
    if (isMgmt) exportFullWorkbook(pack);
    else exportTabExcel(pack, tab);
  };

  const errMsg =
    (error as any)?.response?.data?.message ?? (error as Error | null)?.message;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Report</h1>
        <p className="text-sm text-muted-foreground">
          Statements, ageing, budget and the Board management report — computed
          live from the general ledger, invoices, bills and budgets
        </p>
      </div>

      {/* ── Controls ── */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex rounded-md bg-muted p-1">
            {(["Month", "Quarter", "Year"] as ReportPeriodType[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriodType(p)}
                className={cn(
                  "rounded-sm px-3 py-1 text-sm font-medium transition-all",
                  periodType === p
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                {p}
              </button>
            ))}
          </div>

          {periodType === "Month" && (
            <Input
              type="month"
              value={monthKey}
              onChange={(e) => setMonthKey(e.target.value)}
              className="w-44"
            />
          )}
          {periodType === "Quarter" && (
            <>
              <Select
                value={String(quarterNum)}
                onValueChange={(v) => setQuarterNum(Number(v))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((q) => (
                    <SelectItem key={q} value={String(q)}>
                      Q{q}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(quarterYear)}
                onValueChange={(v) => setQuarterYear(Number(v))}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          {periodType === "Year" && (
            <Select
              value={String(yearKey)}
              onValueChange={(v) => setYearKey(Number(v))}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select
            value={currency || BASE}
            onValueChange={(v) => setCurrency(v === BASE ? "" : v)}
          >
            <SelectTrigger className="w-36" aria-label="Display currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={BASE}>
                {pack ? `${pack.meta.baseCurrency} (base)` : "Base currency"}
              </SelectItem>
              {FINANCE_CURRENCIES.filter(
                (c) => c !== pack?.meta.baseCurrency,
              ).map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isFetching && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}

          <div className="flex-1" />

          <div className="flex rounded-md bg-muted p-1 hidden">
            <button
              type="button"
              onClick={() => setView("table")}
              className={cn(
                "flex items-center gap-1.5 rounded-sm px-3 py-1 text-sm font-medium transition-all",
                view === "table"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              <Table2 className="h-3.5 w-3.5" /> Table
            </button>
            <button
              type="button"
              onClick={() => setView("chart")}
              className={cn(
                "flex items-center gap-1.5 rounded-sm px-3 py-1 text-sm font-medium transition-all",
                view === "chart"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              <BarChart3 className="h-3.5 w-3.5" /> Chart
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onPdf}
            disabled={!pack || (!exportable && !isMgmt)}
          >
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExcel}
            disabled={!pack || (!exportable && !isMgmt)}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
          </Button>
          <Button size="sm" onClick={() => setEmailOpen(true)} disabled={!pack}>
            <Mail className="mr-2 h-4 w-4" /> Email report
          </Button>
        </CardContent>
      </Card>

      {error && !pack && (
        <Alert variant="destructive">
          <AlertTitle>The report could not be built</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{errMsg ?? "Something went wrong."}</span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <div className="w-full overflow-x-auto">
          <TabsList className="flex h-auto w-full min-w-max justify-start">
            {TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="flex-1">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {!pack ? (
          isLoading ? (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
              <Skeleton className="h-64" />
            </div>
          ) : null
        ) : (
          <ReportProvider value={{ pack, view, goTab: setTab }}>
            <div
              className={cn(
                "mt-4 transition-opacity",
                isPlaceholderData && "opacity-50",
              )}
            >
              <TabsContent value="overview" className="mt-0">
                <OverviewTab />
              </TabsContent>
              <TabsContent value="pnl" className="mt-0">
                <PnlTab />
              </TabsContent>
              <TabsContent value="balance-sheet" className="mt-0">
                <BalanceSheetTab />
              </TabsContent>
              <TabsContent value="cashflow" className="mt-0">
                <CashFlowTab />
              </TabsContent>
              <TabsContent value="trial-balance" className="mt-0">
                <TrialBalanceTab />
              </TabsContent>
              <TabsContent value="aged-rec" className="mt-0">
                <AgedReceivablesTab />
              </TabsContent>
              <TabsContent value="aged-pay" className="mt-0">
                <AgedPayablesTab />
              </TabsContent>
              <TabsContent value="budget" className="mt-0">
                <BudgetTab />
              </TabsContent>
              <TabsContent value="ratios" className="mt-0">
                <RatiosTab />
              </TabsContent>
              <TabsContent value="mgmt" className="mt-0">
                {/* Keyed on the loaded pack, so the editor resets only when a new
                    period/currency has actually arrived — never mid-edit. */}
                <ManagementTab
                  key={`${pack.meta.periodType}-${pack.meta.periodKey}-${pack.meta.currency}`}
                  displayCurrency={currency}
                />
              </TabsContent>
              {/* <TabsContent value="serviceline" className="mt-0">
                <ServiceLineTab />
              </TabsContent>
              <TabsContent value="clientprofit" className="mt-0">
                <ClientProfitabilityTab />
              </TabsContent>
              <TabsContent value="writeoffs" className="mt-0">
                <WriteOffsTab />
              </TabsContent> */}
            </div>
            <EmailReportDialog
              open={emailOpen}
              onOpenChange={setEmailOpen}
              displayCurrency={currency}
            />
          </ReportProvider>
        )}
      </Tabs>
    </div>
  );
}
