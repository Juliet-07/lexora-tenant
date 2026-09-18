import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Mail, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useFinanceCurrency,
  FINANCE_CURRENCIES,
} from "@/hooks/use-finance-currency";
import {
  fetchManagementReport,
  saveExecutiveSummary,
  emailManagementReport,
  downloadManagementReportPdf,
  type ReportPeriodType,
} from "@/lib/crm/finance-api";

const money = (n: number, c = "USD") =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: c,
    maximumFractionDigits: 0,
  });

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
const currentQuarter = Math.floor(now.getMonth() / 3) + 1;

const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);

export default function ManagementReporting() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [financeCurrency, setFinanceCurrency] = useFinanceCurrency();

  const [periodType, setPeriodType] = useState<ReportPeriodType>("Month");
  const [monthKey, setMonthKey] = useState(`${currentYear}-${currentMonth}`);
  const [quarterYear, setQuarterYear] = useState(currentYear);
  const [quarterNum, setQuarterNum] = useState(currentQuarter);
  const [yearKey, setYearKey] = useState(currentYear);

  const periodKey = useMemo(() => {
    if (periodType === "Month") return monthKey;
    if (periodType === "Quarter") return `${quarterYear}-Q${quarterNum}`;
    return String(yearKey);
  }, [periodType, monthKey, quarterYear, quarterNum, yearKey]);

  const { data: report, isLoading } = useQuery({
    queryKey: ["managementReport", periodType, periodKey, financeCurrency],
    queryFn: () =>
      fetchManagementReport(
        periodType,
        periodKey,
        financeCurrency || undefined,
      ),
  });

  const [summaryDraft, setSummaryDraft] = useState("");
  const [summaryTouched, setSummaryTouched] = useState(false);
  const displayedSummary = summaryTouched
    ? summaryDraft
    : (report?.executiveSummary ?? "");

  const saveSummaryMut = useMutation({
    mutationFn: () =>
      saveExecutiveSummary(periodType, periodKey, displayedSummary),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managementReport"] });
      setSummaryTouched(false);
      toast({ title: "Executive summary saved" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to save",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const [emailOpen, setEmailOpen] = useState(false);
  const [emailDraft, setEmailDraft] = useState({
    recipientName: "",
    recipientEmail: "",
    subject: "",
  });
  const emailMut = useMutation({
    mutationFn: () =>
      emailManagementReport(periodType, periodKey, {
        ...emailDraft,
        displayCurrency: financeCurrency || undefined,
      }),
    onSuccess: (res) => {
      setEmailOpen(false);
      setEmailDraft({ recipientName: "", recipientEmail: "", subject: "" });
      toast({ title: "Report emailed", description: `Sent to ${res.to}.` });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to send",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Management Reporting</h1>
          <p className="text-sm text-muted-foreground">
            Real figures for the period you pick, your own commentary, and a
            report you can download or send by email
          </p>
        </div>
        <Select
          value={financeCurrency || "base"}
          onValueChange={(v) => setFinanceCurrency(v === "base" ? "" : v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="base">
              {report?.currency ? `Base (${report.currency})` : "Base currency"}
            </SelectItem>
            {FINANCE_CURRENCIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <Tabs
            value={periodType}
            onValueChange={(v) => setPeriodType(v as ReportPeriodType)}
          >
            <TabsList>
              <TabsTrigger value="Month">Month</TabsTrigger>
              <TabsTrigger value="Quarter">Quarter</TabsTrigger>
              <TabsTrigger value="Year">Year</TabsTrigger>
            </TabsList>
          </Tabs>

          {periodType === "Month" && (
            <Input
              type="month"
              value={monthKey}
              onChange={(e) => setMonthKey(e.target.value)}
              className="w-44"
            />
          )}
          {periodType === "Quarter" && (
            <div className="flex gap-2">
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
            </div>
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

          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadManagementReportPdf(
                  periodType,
                  periodKey,
                  financeCurrency || undefined,
                )
              }
            >
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
            <Button size="sm" onClick={() => setEmailOpen(true)}>
              <Mail className="mr-2 h-4 w-4" /> Email report
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Loading…
        </p>
      )}

      {report && (
        <>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {report.periodType} · {report.periodLabel}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  label: "Revenue",
                  value: report.revenue,
                  tone: "text-success",
                },
                {
                  label: "Expenses",
                  value: report.expenses,
                  tone: "text-destructive",
                },
                {
                  label: "Net income",
                  value: report.netIncome,
                  tone:
                    report.netIncome >= 0 ? "text-success" : "text-destructive",
                },
              ].map((k) => (
                <Card key={k.label}>
                  <CardContent className="p-5">
                    <p className="text-sm text-muted-foreground">{k.label}</p>
                    <p className={`text-xl font-bold ${k.tone}`}>
                      {money(k.value, report.currency)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Position (as of today)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Cash position", value: report.cashPosition },
                {
                  label: "Outstanding receivables",
                  value: report.outstandingReceivables,
                },
                {
                  label: "Outstanding payables",
                  value: report.outstandingPayables,
                },
              ].map((k) => (
                <Card key={k.label}>
                  <CardContent className="p-5">
                    <p className="text-sm text-muted-foreground">{k.label}</p>
                    <p className="text-xl font-bold">
                      {money(k.value, report.currency)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Executive summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={8}
                placeholder="Write your commentary on this period's results — what drove the numbers, what to watch, what's changing next period…"
                value={displayedSummary}
                onChange={(e) => {
                  setSummaryDraft(e.target.value);
                  setSummaryTouched(true);
                }}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={!summaryTouched || saveSummaryMut.isPending}
                  onClick={() => saveSummaryMut.mutate()}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saveSummaryMut.isPending ? "Saving…" : "Save summary"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email this report</DialogTitle>
            <DialogDescription>
              Sends the {report?.periodType.toLowerCase()} report for{" "}
              {report?.periodLabel} as a PDF attachment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Recipient name</Label>
              <Input
                value={emailDraft.recipientName}
                onChange={(e) =>
                  setEmailDraft({
                    ...emailDraft,
                    recipientName: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Recipient email</Label>
              <Input
                type="email"
                value={emailDraft.recipientEmail}
                onChange={(e) =>
                  setEmailDraft({
                    ...emailDraft,
                    recipientEmail: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                value={emailDraft.subject}
                onChange={(e) =>
                  setEmailDraft({ ...emailDraft, subject: e.target.value })
                }
                placeholder={`Management report — ${report?.periodLabel ?? ""}`}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !emailDraft.recipientName ||
                !emailDraft.recipientEmail ||
                !emailDraft.subject ||
                emailMut.isPending
              }
              onClick={() => emailMut.mutate()}
            >
              {emailMut.isPending ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
