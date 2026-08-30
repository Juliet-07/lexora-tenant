import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Plus,
  Building2,
  ArrowDownToLine,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Briefcase,
  DollarSign,
  ShieldCheck,
  Globe2,
  Sliders,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ClientSelect } from "@/components/ClientDropdown";
import {
  fetchFunds,
  fetchFund,
  createFund,
  updateFundTerms,
  fetchCommitments,
  createCommitment,
  computeEqualisation,
  applyEqualisation,
  fetchCapitalCalls,
  createCapitalCall,
  recordCallFunding,
  declareDefault,
  cureDefault,
  forfeitDefault,
  fetchCapitalAccounts,
  fetchDistributions,
  fetchWaterfallState,
  fetchGpCarryPosition,
  fetchAccruedCarryOnNav,
  recordDistribution,
  fetchHoldings,
  createHolding,
  recordExit,
  fetchValuationWorkflow,
  proposeValuation,
  reviewValuation,
  approveValuation,
  fetchNav,
  fetchPerformanceMetrics,
  fetchFundExpenses,
  recordFundExpense,
  fetchManagementFeeCharges,
  previewManagementFee,
  chargeManagementFee,
  payManagementFee,
  fetchKeyPersons,
  addKeyPerson,
  confirmKeyPersonActive,
  markKeyPersonDeparted,
  fetchComplianceCalendar,
  addComplianceCalendarItem,
  markComplianceComplete,
  fetchRestrictionMonitoring,
  fetchFxRates,
  recordFxRate,
  fetchFxExposure,
  runScenario,
  fetchQuarterlyStatement,
  fetchFeeExpenseDisclosure,
  fetchBankAccounts,
  type Fund,
  type WaterfallType,
  type CommitmentType,
  type CapitalCall,
  type DistributionSource,
  type ValuationMethod,
  type IfrsLevel,
  type ComplianceFrequency,
  type ScenarioResult,
} from "@/lib/crm/finance-api";

const money = (n: number, c = "USD") =>
  (n ?? 0).toLocaleString(undefined, {
    style: "currency",
    currency: c,
    maximumFractionDigits: 0,
  });
const pct = (n: number) => `${((n ?? 0) * 1).toFixed(1)}%`;
const today = () => new Date().toISOString().slice(0, 10);

const WATERFALL_TYPES: WaterfallType[] = [
  "Whole-fund (European)",
  "Deal-by-deal (American)",
];
const COMMITMENT_TYPES: CommitmentType[] = [
  "Institutional",
  "DFI",
  "Pension",
  "Family office",
  "Corporate",
  "HNW",
  "Trust",
  "GP commit",
];
const DISTRIBUTION_SOURCES: DistributionSource[] = [
  "Exit",
  "Dividend",
  "Interest income",
  "Recapitalisation",
  "Other",
];
const VALUATION_METHODS: ValuationMethod[] = [
  "Last round",
  "DCF",
  "Earnings multiple",
  "At cost (<12mo)",
  "Precedent transaction",
  "Market price",
];
const IFRS_LEVELS: IfrsLevel[] = ["Level 1", "Level 2", "Level 3"];
const COMPLIANCE_FREQUENCIES: ComplianceFrequency[] = [
  "Quarterly",
  "Semi-annual",
  "Annual",
  "As needed",
];
const currentPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
};

interface FundFormState {
  name: string;
  structure: string;
  jurisdiction: string;
  strategy: string;
  targetSize: number;
  vintage: number;
  currency: string;
  bankAccountId: string;
  mgmtFeePct: number;
  carryPct: number;
  hurdlePct: number;
  waterfallType: WaterfallType;
  defaultInterestPct: number;
  curePeriodDays: number;
  forfeiturePct: number;
  equalisationInterestPct: number;
  carryEscrowPct: number;
  investmentPeriodEndDate: string;
  orgCostsCapAmount: number;
  recyclingPermitted: boolean;
  recyclingCapPct: number;
}
const emptyFundForm: FundFormState = {
  name: "",
  structure: "Limited Partnership",
  jurisdiction: "",
  strategy: "",
  targetSize: 0,
  vintage: new Date().getFullYear(),
  currency: "USD",
  bankAccountId: "",
  mgmtFeePct: 2,
  carryPct: 20,
  hurdlePct: 8,
  waterfallType: "Whole-fund (European)",
  defaultInterestPct: 12,
  curePeriodDays: 120,
  forfeiturePct: 50,
  equalisationInterestPct: 6,
  carryEscrowPct: 30,
  investmentPeriodEndDate: "",
  orgCostsCapAmount: 0,
  recyclingPermitted: false,
  recyclingCapPct: 0,
};

export default function FundAccounting() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const { data: funds = [] } = useQuery({
    queryKey: ["funds"],
    queryFn: fetchFunds,
  });
  const [selectedFundId, setSelectedFundId] = useState<string>("");
  const activeFundId = selectedFundId || funds[0]?._id || "";

  const invalidateFund = () => {
    queryClient.invalidateQueries({ queryKey: ["funds"] });
    queryClient.invalidateQueries({ queryKey: ["fund", activeFundId] });
    queryClient.invalidateQueries({ queryKey: ["commitments", activeFundId] });
    queryClient.invalidateQueries({ queryKey: ["capitalCalls", activeFundId] });
    queryClient.invalidateQueries({
      queryKey: ["capitalAccounts", activeFundId],
    });
    queryClient.invalidateQueries({
      queryKey: ["distributions", activeFundId],
    });
    queryClient.invalidateQueries({ queryKey: ["waterfall", activeFundId] });
    queryClient.invalidateQueries({ queryKey: ["gpCarry", activeFundId] });
    queryClient.invalidateQueries({ queryKey: ["accruedCarry", activeFundId] });
    queryClient.invalidateQueries({ queryKey: ["holdings", activeFundId] });
    queryClient.invalidateQueries({
      queryKey: ["valuationWorkflow", activeFundId],
    });
    queryClient.invalidateQueries({ queryKey: ["nav", activeFundId] });
    queryClient.invalidateQueries({ queryKey: ["performance", activeFundId] });
    queryClient.invalidateQueries({ queryKey: ["fundExpenses", activeFundId] });
    queryClient.invalidateQueries({ queryKey: ["feeCharges", activeFundId] });
    queryClient.invalidateQueries({ queryKey: ["feePreview", activeFundId] });
    queryClient.invalidateQueries({ queryKey: ["keyPersons", activeFundId] });
    queryClient.invalidateQueries({
      queryKey: ["complianceCalendar", activeFundId],
    });
    queryClient.invalidateQueries({ queryKey: ["restrictions", activeFundId] });
    queryClient.invalidateQueries({ queryKey: ["fxRates", activeFundId] });
    queryClient.invalidateQueries({ queryKey: ["fxExposure", activeFundId] });
  };

  const { data: fund } = useQuery({
    queryKey: ["fund", activeFundId],
    queryFn: () => fetchFund(activeFundId),
    enabled: !!activeFundId,
  });
  const { data: commitments = [] } = useQuery({
    queryKey: ["commitments", activeFundId],
    queryFn: () => fetchCommitments(activeFundId),
    enabled: !!activeFundId,
  });
  const { data: capitalCalls = [] } = useQuery({
    queryKey: ["capitalCalls", activeFundId],
    queryFn: () => fetchCapitalCalls(activeFundId),
    enabled: !!activeFundId,
  });
  const { data: capitalAccounts } = useQuery({
    queryKey: ["capitalAccounts", activeFundId],
    queryFn: () => fetchCapitalAccounts(activeFundId),
    enabled: !!activeFundId,
  });
  const { data: distributions = [] } = useQuery({
    queryKey: ["distributions", activeFundId],
    queryFn: () => fetchDistributions(activeFundId),
    enabled: !!activeFundId,
  });
  const { data: waterfall } = useQuery({
    queryKey: ["waterfall", activeFundId],
    queryFn: () => fetchWaterfallState(activeFundId),
    enabled: !!activeFundId,
  });
  const { data: gpCarry } = useQuery({
    queryKey: ["gpCarry", activeFundId],
    queryFn: () => fetchGpCarryPosition(activeFundId),
    enabled: !!activeFundId,
  });
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankAccounts"],
    queryFn: fetchBankAccounts,
  });
  const fundAccounts = bankAccounts.filter((a) => a.type === "Fund");

  const { data: accruedCarry } = useQuery({
    queryKey: ["accruedCarry", activeFundId],
    queryFn: () => fetchAccruedCarryOnNav(activeFundId),
    enabled: !!activeFundId,
  });
  const { data: holdings = [] } = useQuery({
    queryKey: ["holdings", activeFundId],
    queryFn: () => fetchHoldings(activeFundId),
    enabled: !!activeFundId,
  });
  const [valuationPeriod, setValuationPeriod] = useState(currentPeriod());
  const { data: valuationWorkflow = [] } = useQuery({
    queryKey: ["valuationWorkflow", activeFundId, valuationPeriod],
    queryFn: () => fetchValuationWorkflow(activeFundId, valuationPeriod),
    enabled: !!activeFundId,
  });
  const { data: nav } = useQuery({
    queryKey: ["nav", activeFundId],
    queryFn: () => fetchNav(activeFundId),
    enabled: !!activeFundId,
  });
  const { data: performance } = useQuery({
    queryKey: ["performance", activeFundId],
    queryFn: () => fetchPerformanceMetrics(activeFundId),
    enabled: !!activeFundId,
  });
  const { data: fundExpenses = [] } = useQuery({
    queryKey: ["fundExpenses", activeFundId],
    queryFn: () => fetchFundExpenses(activeFundId),
    enabled: !!activeFundId,
  });
  const { data: feeCharges = [] } = useQuery({
    queryKey: ["feeCharges", activeFundId],
    queryFn: () => fetchManagementFeeCharges(activeFundId),
    enabled: !!activeFundId,
  });
  const { data: feePreview } = useQuery({
    queryKey: ["feePreview", activeFundId],
    queryFn: () => previewManagementFee(activeFundId),
    enabled: !!activeFundId,
  });
  const { data: keyPersons = [] } = useQuery({
    queryKey: ["keyPersons", activeFundId],
    queryFn: () => fetchKeyPersons(activeFundId),
    enabled: !!activeFundId,
  });
  const { data: complianceCalendar = [] } = useQuery({
    queryKey: ["complianceCalendar", activeFundId],
    queryFn: () => fetchComplianceCalendar(activeFundId),
    enabled: !!activeFundId,
  });
  const { data: restrictions } = useQuery({
    queryKey: ["restrictions", activeFundId],
    queryFn: () => fetchRestrictionMonitoring(activeFundId),
    enabled: !!activeFundId,
  });
  const { data: fxRates = [] } = useQuery({
    queryKey: ["fxRates", activeFundId],
    queryFn: () => fetchFxRates(activeFundId),
    enabled: !!activeFundId,
  });
  const { data: fxExposure } = useQuery({
    queryKey: ["fxExposure", activeFundId],
    queryFn: () => fetchFxExposure(activeFundId),
    enabled: !!activeFundId,
  });

  // ── New fund ─────────────────────────────────────────────
  const [openNewFund, setOpenNewFund] = useState(false);
  const [fundForm, setFundForm] = useState(emptyFundForm);
  const createFundMut = useMutation({
    mutationFn: () =>
      createFund({
        ...fundForm,
        bankAccountId: fundForm.bankAccountId || undefined,
        investmentPeriodEndDate: fundForm.investmentPeriodEndDate || undefined,
      }),
    onSuccess: (f) => {
      invalidateFund();
      setOpenNewFund(false);
      setFundForm(emptyFundForm);
      setSelectedFundId(f._id);
      toast({ title: "Fund created" });
    },
    onError: onErr("Failed to create fund"),
  });

  // ── Edit terms ───────────────────────────────────────────
  const [openEditTerms, setOpenEditTerms] = useState(false);
  const [termsForm, setTermsForm] = useState(emptyFundForm);
  const openEdit = () => {
    if (!fund) return;
    setTermsForm({
      name: fund.name,
      structure: fund.structure,
      jurisdiction: fund.jurisdiction,
      strategy: fund.strategy,
      targetSize: fund.targetSize,
      vintage: fund.vintage,
      currency: fund.currency,
      bankAccountId: fund.bankAccountId ?? "",
      mgmtFeePct: fund.mgmtFeePct,
      carryPct: fund.carryPct,
      hurdlePct: fund.hurdlePct,
      waterfallType: fund.waterfallType,
      defaultInterestPct: fund.defaultInterestPct,
      curePeriodDays: fund.curePeriodDays,
      forfeiturePct: fund.forfeiturePct,
      equalisationInterestPct: fund.equalisationInterestPct,
      carryEscrowPct: fund.carryEscrowPct,
      investmentPeriodEndDate: fund.investmentPeriodEndDate?.slice(0, 10) ?? "",
      orgCostsCapAmount: fund.orgCostsCapAmount,
      recyclingPermitted: fund.recyclingPermitted,
      recyclingCapPct: fund.recyclingCapPct,
    });
    setOpenEditTerms(true);
  };
  const updateTermsMut = useMutation({
    mutationFn: () =>
      updateFundTerms(activeFundId, {
        ...termsForm,
        investmentPeriodEndDate: termsForm.investmentPeriodEndDate || undefined,
      }),
    onSuccess: () => {
      invalidateFund();
      setOpenEditTerms(false);
      toast({ title: "Fund terms updated" });
    },
    onError: onErr("Failed to update terms"),
  });

  // ── New commitment ───────────────────────────────────────
  const [openNewCommitment, setOpenNewCommitment] = useState(false);
  const [commitmentForm, setCommitmentForm] = useState({
    lpUserId: "",
    lpName: "",
    commitment: 0,
    type: "Institutional" as CommitmentType,
    closeLabel: "1st",
    closeDate: today(),
    isGpCommitment: false,
    hasSideLetter: false,
    mgmtFeePctOverride: undefined as number | undefined,
    sideLetterNotes: "",
  });
  const createCommitmentMut = useMutation({
    mutationFn: () => createCommitment(activeFundId, commitmentForm),
    onSuccess: () => {
      invalidateFund();
      setOpenNewCommitment(false);
      setCommitmentForm({
        lpUserId: "",
        lpName: "",
        commitment: 0,
        type: "Institutional",
        closeLabel: "1st",
        closeDate: today(),
        isGpCommitment: false,
        hasSideLetter: false,
        mgmtFeePctOverride: undefined,
        sideLetterNotes: "",
      });
      toast({ title: "Commitment added" });
    },
    onError: onErr("Failed to add commitment"),
  });

  // ── Equalisation ─────────────────────────────────────────
  const [eqTarget, setEqTarget] = useState<{
    commitmentId: string;
    lpName: string;
  } | null>(null);
  const { data: eqCalc } = useQuery({
    queryKey: ["equalisation", activeFundId, eqTarget?.commitmentId],
    queryFn: () => computeEqualisation(activeFundId, eqTarget!.commitmentId),
    enabled: !!eqTarget,
  });
  const applyEqMut = useMutation({
    mutationFn: () => applyEqualisation(activeFundId, eqTarget!.commitmentId),
    onSuccess: () => {
      invalidateFund();
      setEqTarget(null);
      toast({ title: "Equalisation applied" });
    },
    onError: onErr("Failed to apply equalisation"),
  });

  // ── New capital call ─────────────────────────────────────
  const [openNewCall, setOpenNewCall] = useState(false);
  const [callForm, setCallForm] = useState({
    purpose: "",
    totalAmount: 0,
    issuedOn: today(),
    dueOn: today(),
  });
  const createCallMut = useMutation({
    mutationFn: () => createCapitalCall(activeFundId, callForm),
    onSuccess: () => {
      invalidateFund();
      setOpenNewCall(false);
      setCallForm({
        purpose: "",
        totalAmount: 0,
        issuedOn: today(),
        dueOn: today(),
      });
      toast({ title: "Capital call issued" });
    },
    onError: onErr("Failed to issue capital call"),
  });

  // ── Fund allocation actions ──────────────────────────────
  const [fundingTarget, setFundingTarget] = useState<{
    callId: string;
    allocationId: string;
    remaining: number;
  } | null>(null);
  const [fundingAmount, setFundingAmount] = useState(0);
  const recordFundingMut = useMutation({
    mutationFn: () =>
      recordCallFunding(
        activeFundId,
        fundingTarget!.callId,
        fundingTarget!.allocationId,
        fundingAmount,
      ),
    onSuccess: () => {
      invalidateFund();
      setFundingTarget(null);
      setFundingAmount(0);
      toast({ title: "Funding recorded" });
    },
    onError: onErr("Failed to record funding"),
  });
  const declareDefaultMut = useMutation({
    mutationFn: (vars: { callId: string; allocationId: string }) =>
      declareDefault(activeFundId, vars.callId, vars.allocationId),
    onSuccess: () => {
      invalidateFund();
      toast({
        title: "Default declared",
        description: "Cure deadline set from the fund's LPA terms.",
      });
    },
    onError: onErr("Failed to declare default"),
  });
  const [cureTarget, setCureTarget] = useState<{
    callId: string;
    allocationId: string;
    remaining: number;
  } | null>(null);
  const [cureAmount, setCureAmount] = useState(0);
  const cureDefaultMut = useMutation({
    mutationFn: () =>
      cureDefault(
        activeFundId,
        cureTarget!.callId,
        cureTarget!.allocationId,
        cureAmount,
      ),
    onSuccess: (res) => {
      invalidateFund();
      setCureTarget(null);
      setCureAmount(0);
      toast({
        title: "Default cured",
        description: `Default interest charged: ${money(res.defaultInterestCharged)}`,
      });
    },
    onError: onErr("Failed to cure default"),
  });
  const forfeitDefaultMut = useMutation({
    mutationFn: (vars: { callId: string; allocationId: string }) =>
      forfeitDefault(activeFundId, vars.callId, vars.allocationId),
    onSuccess: (res) => {
      invalidateFund();
      toast({
        title: "Default forfeited",
        description: `${money(res.forfeited)} forfeited and reallocated pro-rata.`,
      });
    },
    onError: onErr("Failed to forfeit default"),
  });

  // ── Record distribution ──────────────────────────────────
  const [openNewDistribution, setOpenNewDistribution] = useState(false);
  const [distForm, setDistForm] = useState({
    totalAmount: 0,
    date: today(),
    source: "Exit" as DistributionSource,
    sourceDescription: "",
  });
  const recordDistMut = useMutation({
    mutationFn: () => recordDistribution(activeFundId, distForm),
    onSuccess: () => {
      invalidateFund();
      setOpenNewDistribution(false);
      setDistForm({
        totalAmount: 0,
        date: today(),
        source: "Exit",
        sourceDescription: "",
      });
      toast({
        title: "Distribution recorded",
        description: "Waterfalled through the real tier logic.",
      });
    },
    onError: onErr("Failed to record distribution"),
  });

  // ── Portfolio holdings ────────────────────────────────────
  const [openNewHolding, setOpenNewHolding] = useState(false);
  const [holdingForm, setHoldingForm] = useState({
    companyName: "",
    sector: "",
    country: "",
    entryDate: today(),
    costBasis: 0,
  });
  const createHoldingMut = useMutation({
    mutationFn: () => createHolding(activeFundId, holdingForm),
    onSuccess: () => {
      invalidateFund();
      setOpenNewHolding(false);
      setHoldingForm({
        companyName: "",
        sector: "",
        country: "",
        entryDate: today(),
        costBasis: 0,
      });
      toast({ title: "Holding added" });
    },
    onError: onErr("Failed to add holding"),
  });
  const [exitTarget, setExitTarget] = useState<{
    holdingId: string;
    companyName: string;
  } | null>(null);
  const [exitForm, setExitForm] = useState({
    exitedAt: today(),
    exitProceeds: 0,
    recycledAmount: 0,
  });
  const recordExitMut = useMutation({
    mutationFn: () => recordExit(activeFundId, exitTarget!.holdingId, exitForm),
    onSuccess: () => {
      invalidateFund();
      setExitTarget(null);
      setExitForm({ exitedAt: today(), exitProceeds: 0, recycledAmount: 0 });
      toast({ title: "Exit recorded" });
    },
    onError: onErr("Failed to record exit"),
  });

  // ── Valuation workflow ────────────────────────────────────
  const [proposeTarget, setProposeTarget] = useState<{
    holdingId: string;
    companyName: string;
  } | null>(null);
  const [proposeForm, setProposeForm] = useState({
    method: "Last round" as ValuationMethod,
    ifrsLevel: "Level 3" as IfrsLevel,
    keyInput: "",
    proposedValue: 0,
    proposedBy: "",
  });
  const proposeMut = useMutation({
    mutationFn: () =>
      proposeValuation(
        activeFundId,
        proposeTarget!.holdingId,
        valuationPeriod,
        proposeForm,
      ),
    onSuccess: () => {
      invalidateFund();
      setProposeTarget(null);
      setProposeForm({
        method: "Last round",
        ifrsLevel: "Level 3",
        keyInput: "",
        proposedValue: 0,
        proposedBy: "",
      });
      toast({ title: "Valuation proposed" });
    },
    onError: onErr("Failed to propose valuation"),
  });
  const [reviewTarget, setReviewTarget] = useState<{
    valuationId: string;
    companyName: string;
    proposedValue: number;
  } | null>(null);
  const [reviewForm, setReviewForm] = useState({
    reviewedValue: 0,
    reviewNotes: "",
    reviewedBy: "",
    methodologyChanged: false,
  });
  const reviewMut = useMutation({
    mutationFn: () =>
      reviewValuation(activeFundId, reviewTarget!.valuationId, reviewForm),
    onSuccess: () => {
      invalidateFund();
      setReviewTarget(null);
      setReviewForm({
        reviewedValue: 0,
        reviewNotes: "",
        reviewedBy: "",
        methodologyChanged: false,
      });
      toast({ title: "Valuation reviewed" });
    },
    onError: onErr("Failed to review valuation"),
  });
  const [approveTarget, setApproveTarget] = useState<{
    valuationId: string;
    companyName: string;
    reviewedValue: number;
  } | null>(null);
  const [approvedBy, setApprovedBy] = useState("");
  const approveMut = useMutation({
    mutationFn: () =>
      approveValuation(activeFundId, approveTarget!.valuationId, approvedBy),
    onSuccess: () => {
      invalidateFund();
      setApproveTarget(null);
      setApprovedBy("");
      toast({
        title: "Valuation approved",
        description: "NAV now reflects this value.",
      });
    },
    onError: onErr("Failed to approve valuation"),
  });

  // ── Fund expenses & management fee ────────────────────────
  const [openNewExpense, setOpenNewExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: "",
    amount: 0,
    date: today(),
    isOrganisationalCost: false,
  });
  const recordExpenseMut = useMutation({
    mutationFn: () => recordFundExpense(activeFundId, expenseForm),
    onSuccess: () => {
      invalidateFund();
      setOpenNewExpense(false);
      setExpenseForm({
        category: "",
        amount: 0,
        date: today(),
        isOrganisationalCost: false,
      });
      toast({ title: "Expense recorded" });
    },
    onError: onErr("Failed to record expense"),
  });
  const [chargeAsOf, setChargeAsOf] = useState(today());
  const chargeFeeMut = useMutation({
    mutationFn: () =>
      chargeManagementFee(activeFundId, currentPeriod(), chargeAsOf),
    onSuccess: () => {
      invalidateFund();
      toast({
        title: "Management fee charged",
        description: `For ${currentPeriod()}`,
      });
    },
    onError: onErr("Failed to charge management fee"),
  });
  const payFeeMut = useMutation({
    mutationFn: (chargeId: string) => payManagementFee(activeFundId, chargeId),
    onSuccess: () => {
      invalidateFund();
      toast({ title: "Fee marked paid" });
    },
    onError: onErr("Failed to mark fee paid"),
  });

  // ── Compliance ─────────────────────────────────────────────
  const [openNewKeyPerson, setOpenNewKeyPerson] = useState(false);
  const [keyPersonForm, setKeyPersonForm] = useState({
    name: "",
    role: "",
    timeThresholdPct: 75,
  });
  const addKeyPersonMut = useMutation({
    mutationFn: () => addKeyPerson(activeFundId, keyPersonForm),
    onSuccess: () => {
      invalidateFund();
      setOpenNewKeyPerson(false);
      setKeyPersonForm({ name: "", role: "", timeThresholdPct: 75 });
      toast({ title: "Key person added" });
    },
    onError: onErr("Failed to add key person"),
  });
  const confirmKeyPersonMut = useMutation({
    mutationFn: (id: string) => confirmKeyPersonActive(activeFundId, id),
    onSuccess: () => {
      invalidateFund();
      toast({ title: "Confirmed active" });
    },
    onError: onErr("Failed to confirm"),
  });
  const departKeyPersonMut = useMutation({
    mutationFn: (id: string) => markKeyPersonDeparted(activeFundId, id),
    onSuccess: () => {
      invalidateFund();
      toast({
        title: "Marked departed",
        description: "Investment period suspended.",
        variant: "destructive",
      });
    },
    onError: onErr("Failed to mark departed"),
  });
  const [openNewCalendarItem, setOpenNewCalendarItem] = useState(false);
  const [calendarForm, setCalendarForm] = useState({
    name: "",
    frequency: "Quarterly" as ComplianceFrequency,
    daysAfterPeriodEnd: 45,
  });
  const addCalendarMut = useMutation({
    mutationFn: () => addComplianceCalendarItem(activeFundId, calendarForm),
    onSuccess: () => {
      invalidateFund();
      setOpenNewCalendarItem(false);
      setCalendarForm({
        name: "",
        frequency: "Quarterly",
        daysAfterPeriodEnd: 45,
      });
      toast({ title: "Requirement added" });
    },
    onError: onErr("Failed to add requirement"),
  });
  const [completeTarget, setCompleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [completePeriod, setCompletePeriod] = useState(currentPeriod());
  const markCompleteMut = useMutation({
    mutationFn: () =>
      markComplianceComplete(activeFundId, completeTarget!.id, completePeriod),
    onSuccess: () => {
      invalidateFund();
      setCompleteTarget(null);
      toast({ title: "Marked complete" });
    },
    onError: onErr("Failed to mark complete"),
  });

  // ── Multi-currency ─────────────────────────────────────────
  const [openNewFxRate, setOpenNewFxRate] = useState(false);
  const [fxForm, setFxForm] = useState({
    fromCurrency: "",
    toCurrency: fund?.currency ?? "USD",
    rate: 0,
    asOfDate: today(),
    source: "",
  });
  const recordFxMut = useMutation({
    mutationFn: () => recordFxRate(activeFundId, fxForm),
    onSuccess: () => {
      invalidateFund();
      setOpenNewFxRate(false);
      setFxForm({
        fromCurrency: "",
        toCurrency: fund?.currency ?? "USD",
        rate: 0,
        asOfDate: today(),
        source: "",
      });
      toast({ title: "FX rate recorded" });
    },
    onError: onErr("Failed to record FX rate"),
  });

  // ── Scenarios ────────────────────────────────────────────
  const [scenarioValues, setScenarioValues] = useState<Record<string, number>>(
    {},
  );
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(
    null,
  );
  const runScenarioMut = useMutation({
    mutationFn: () =>
      runScenario(
        activeFundId,
        Object.entries(scenarioValues)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([holdingId, exitValue]) => ({ holdingId, exitValue })),
      ),
    onSuccess: (res) => {
      setScenarioResult(res);
      toast({
        title: "Scenario run",
        description: "Read-only — nothing was recorded.",
      });
    },
    onError: onErr("Failed to run scenario"),
  });

  // ── LP reporting ─────────────────────────────────────────
  const [reportingLpId, setReportingLpId] = useState<string>("");
  const [statementRange, setStatementRange] = useState({
    periodStart: `${new Date().getFullYear()}-01-01`,
    periodEnd: today(),
  });
  const { data: quarterlyStatement } = useQuery({
    queryKey: [
      "quarterlyStatement",
      activeFundId,
      reportingLpId,
      statementRange.periodStart,
      statementRange.periodEnd,
    ],
    queryFn: () =>
      fetchQuarterlyStatement(
        activeFundId,
        reportingLpId,
        statementRange.periodStart,
        statementRange.periodEnd,
      ),
    enabled: !!activeFundId && !!reportingLpId,
  });
  const [disclosurePeriod, setDisclosurePeriod] = useState(currentPeriod());
  const { data: feeDisclosure } = useQuery({
    queryKey: ["feeDisclosure", activeFundId, reportingLpId, disclosurePeriod],
    queryFn: () =>
      fetchFeeExpenseDisclosure(activeFundId, reportingLpId, disclosurePeriod),
    enabled: !!activeFundId && !!reportingLpId,
  });

  if (!activeFundId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Fund Accounting</h1>
          <p className="text-sm text-muted-foreground">
            Fund-focused operations — capital accounts, calls, distributions,
            and the real waterfall
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No funds yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              This applies to fund-focused businesses. Create a fund to start
              tracking commitments, calls, and distributions.
            </p>
            <Button onClick={() => setOpenNewFund(true)}>
              <Plus className="mr-2 h-4 w-4" /> New fund
            </Button>
          </CardContent>
        </Card>
        <NewFundDialog
          open={openNewFund}
          onOpenChange={setOpenNewFund}
          form={fundForm}
          setForm={setFundForm}
          bankAccounts={fundAccounts}
          onCreate={() => createFundMut.mutate()}
          creating={createFundMut.isPending}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Fund Accounting</h1>
          <p className="text-sm text-muted-foreground">
            Real commitments, capital calls, capital accounts, and the
            whole-fund waterfall
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={activeFundId} onValueChange={setSelectedFundId}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {funds.map((f) => (
                <SelectItem key={f._id} value={f._id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setOpenNewFund(true)}>
            <Plus className="mr-2 h-4 w-4" /> New fund
          </Button>
        </div>
      </div>

      {fund && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Committed</p>
                <p className="mt-1 text-lg font-bold">
                  {money(fund.committed, fund.currency)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Called</p>
                <p className="mt-1 text-lg font-bold">
                  {money(fund.called, fund.currency)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Unfunded</p>
                <p className="mt-1 text-lg font-bold">
                  {money(fund.unfunded, fund.currency)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="mt-1">
                  <Badge variant="outline">{fund.status}</Badge>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Hurdle status</p>
                <p className="mt-1 text-lg font-bold text-warning">
                  {waterfall ? pct(waterfall.hurdleStatusPct) : "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          {fund.investmentPeriodSuspended && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              Investment period suspended — a key person departure was recorded
              without a confirmed replacement.
            </div>
          )}

          <Tabs defaultValue="setup">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="setup">Fund setup</TabsTrigger>
              <TabsTrigger value="accounts">Capital accounts</TabsTrigger>
              <TabsTrigger value="calls">
                Capital calls
                {capitalCalls.some((c) =>
                  c.allocations.some((a) => a.status === "Defaulted"),
                ) && (
                  <Badge
                    className="ml-1.5 h-4 px-1 text-[10px]"
                    variant="destructive"
                  >
                    default
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="waterfall">
                Distributions & waterfall
              </TabsTrigger>
              <TabsTrigger value="nav">NAV & valuation</TabsTrigger>
              <TabsTrigger value="fees">Fees & carry</TabsTrigger>
              <TabsTrigger value="compliance">
                Compliance
                {fund.investmentPeriodSuspended && (
                  <Badge
                    className="ml-1.5 h-4 px-1 text-[10px]"
                    variant="destructive"
                  >
                    !
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="currency">Multi-currency</TabsTrigger>
              <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
              <TabsTrigger value="lpreporting">LP reporting</TabsTrigger>
            </TabsList>

            {/* Fund setup */}
            <TabsContent value="setup" className="pt-4 space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">{fund.name}</CardTitle>
                  <Button size="sm" variant="outline" onClick={openEdit}>
                    Edit setup
                  </Button>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      ENTITY & STRUCTURE
                    </p>
                    <Field label="Structure" value={fund.structure || "—"} />
                    <Field
                      label="Jurisdiction"
                      value={fund.jurisdiction || "—"}
                    />
                    <Field label="Strategy" value={fund.strategy || "—"} />
                    <Field
                      label="Target size"
                      value={money(fund.targetSize, fund.currency)}
                    />
                    <Field label="Vintage" value={String(fund.vintage)} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      LPA COMMERCIAL TERMS
                    </p>
                    <Field
                      label="Management fee"
                      value={`${fund.mgmtFeePct}%`}
                    />
                    <Field
                      label="Carried interest"
                      value={`${fund.carryPct}%`}
                    />
                    <Field
                      label="Preferred return (hurdle)"
                      value={`${fund.hurdlePct}% p.a.`}
                    />
                    <Field label="Waterfall type" value={fund.waterfallType} />
                    <Field
                      label="Carry escrow"
                      value={`${fund.carryEscrowPct}%`}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      DEFAULT & EQUALISATION
                    </p>
                    <Field
                      label="Default interest"
                      value={`${fund.defaultInterestPct}% p.a.`}
                    />
                    <Field
                      label="Cure period"
                      value={`${fund.curePeriodDays} days`}
                    />
                    <Field
                      label="Forfeiture"
                      value={`${fund.forfeiturePct}%`}
                    />
                    <Field
                      label="Equalisation interest"
                      value={`${fund.equalisationInterestPct}% p.a.`}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      INVESTMENT PERIOD
                    </p>
                    <Field
                      label="Ends"
                      value={
                        fund.investmentPeriodEndDate
                          ? new Date(
                              fund.investmentPeriodEndDate,
                            ).toLocaleDateString()
                          : "Not set"
                      }
                    />
                    <Field
                      label="Org. costs cap"
                      value={money(fund.orgCostsCapAmount, fund.currency)}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      RECYCLING
                    </p>
                    <Field
                      label="Permitted"
                      value={fund.recyclingPermitted ? "Yes" : "No"}
                    />
                    {fund.recyclingPermitted && (
                      <Field
                        label="Cap"
                        value={`${fund.recyclingCapPct}% of commitments`}
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      CURRENCY
                    </p>
                    <Field label="Reporting currency" value={fund.currency} />
                    <Field
                      label="Bank account"
                      value={
                        fundAccounts.find((a) => a._id === fund.bankAccountId)
                          ?.name ?? "Not linked"
                      }
                    />
                  </div>
                </CardContent>
              </Card>
              {!fund.bankAccountId && (
                <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm text-warning">
                  <AlertTriangle className="h-4 w-4 shrink-0" /> No Fund-type
                  bank account linked yet — capital call funding and
                  distributions won't post to the GL until one is set.
                </div>
              )}
            </TabsContent>

            {/* Capital accounts */}
            <TabsContent value="accounts" className="pt-4 space-y-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setOpenNewCommitment(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add commitment
                </Button>
              </div>
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>LP / Investor</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Close</TableHead>
                        <TableHead className="text-right">Commitment</TableHead>
                        <TableHead className="text-right">%</TableHead>
                        <TableHead className="text-right">Called</TableHead>
                        <TableHead className="text-right">
                          Distributions
                        </TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {capitalAccounts?.rows.map((r) => (
                        <TableRow key={r.commitmentId}>
                          <TableCell>
                            <p className="text-sm font-medium">{r.lpName}</p>
                            <div className="flex gap-1 mt-0.5">
                              {r.isGpCommitment && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  GP
                                </Badge>
                              )}
                              {r.hasSideLetter && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  SL
                                </Badge>
                              )}
                              {r.equalisationApplied && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  EQ
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{r.type}</TableCell>
                          <TableCell className="text-sm">
                            {r.closeLabel}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {money(r.commitment, fund.currency)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {(r.commitmentPct * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {money(r.called, fund.currency)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {r.distributions
                              ? `(${money(-r.distributions, fund.currency)})`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold">
                            {money(r.balance, fund.currency)}
                          </TableCell>
                          <TableCell>
                            {!r.equalisationApplied && !r.isGpCommitment && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setEqTarget({
                                    commitmentId: r.commitmentId,
                                    lpName: r.lpName,
                                  })
                                }
                              >
                                Equalise
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!capitalAccounts?.rows.length && (
                        <TableRow>
                          <TableCell
                            colSpan={9}
                            className="py-8 text-center text-sm text-muted-foreground"
                          >
                            No commitments yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {!!capitalAccounts?.rows.length && (
                    <div className="flex items-center justify-between border-t p-3 text-sm">
                      <span className="font-medium">Total</span>
                      <span className="font-semibold">
                        {money(capitalAccounts.totalCommitment, fund.currency)}{" "}
                        committed ·{" "}
                        {money(capitalAccounts.totalCalled, fund.currency)}{" "}
                        called ·{" "}
                        {money(capitalAccounts.totalBalance, fund.currency)}{" "}
                        balance
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Capital calls */}
            <TabsContent value="calls" className="pt-4 space-y-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setOpenNewCall(true)}>
                  <Plus className="mr-2 h-4 w-4" /> New capital call
                </Button>
              </div>
              {capitalCalls.map((call) => (
                <Card key={call._id}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base">
                        {call.ref} — {call.purpose}
                      </CardTitle>
                      <span className="text-sm text-muted-foreground">
                        {money(call.totalAmount, fund.currency)} · due{" "}
                        {new Date(call.dueOn).toLocaleDateString()}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>LP</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Funded</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {call.allocations.map((a) => (
                          <TableRow key={a._id}>
                            <TableCell className="text-sm">
                              {a.lpName}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {money(a.amount, fund.currency)}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {money(a.fundedAmount, fund.currency)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  a.status === "Funded"
                                    ? "bg-success/10 text-success"
                                    : a.status === "Defaulted"
                                      ? "bg-destructive/10 text-destructive"
                                      : a.status === "Partially funded"
                                        ? "bg-warning/10 text-warning"
                                        : ""
                                }
                                variant={
                                  a.status === "Unfunded"
                                    ? "outline"
                                    : "default"
                                }
                              >
                                {a.status}
                              </Badge>
                              {a.status === "Defaulted" && a.cureDeadline && (
                                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" /> Cure by{" "}
                                  {new Date(
                                    a.cureDeadline,
                                  ).toLocaleDateString()}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="space-x-1">
                              {(a.status === "Unfunded" ||
                                a.status === "Partially funded") && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setFundingTarget({
                                        callId: call._id,
                                        allocationId: a._id,
                                        remaining: a.amount - a.fundedAmount,
                                      });
                                      setFundingAmount(
                                        a.amount - a.fundedAmount,
                                      );
                                    }}
                                  >
                                    Fund
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive"
                                    onClick={() =>
                                      declareDefaultMut.mutate({
                                        callId: call._id,
                                        allocationId: a._id,
                                      })
                                    }
                                  >
                                    Declare default
                                  </Button>
                                </>
                              )}
                              {a.status === "Defaulted" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setCureTarget({
                                        callId: call._id,
                                        allocationId: a._id,
                                        remaining: a.amount - a.fundedAmount,
                                      });
                                      setCureAmount(a.amount - a.fundedAmount);
                                    }}
                                  >
                                    Cure
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive"
                                    onClick={() =>
                                      forfeitDefaultMut.mutate({
                                        callId: call._id,
                                        allocationId: a._id,
                                      })
                                    }
                                  >
                                    Forfeit
                                  </Button>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
              {!capitalCalls.length && (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No capital calls issued yet.
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Distributions & waterfall */}
            <TabsContent value="waterfall" className="pt-4 space-y-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setOpenNewDistribution(true)}>
                  <ArrowDownToLine className="mr-2 h-4 w-4" /> Record
                  distribution
                </Button>
              </div>

              {waterfall && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Waterfall — {waterfall.waterfallType}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {money(waterfall.totalDistributed, fund.currency)}{" "}
                      distributed across {waterfall.distributionEventCount}{" "}
                      event(s)
                    </p>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2">
                    <TierBar
                      label="Tier 1 — Return of capital"
                      tier={waterfall.tier1}
                    />
                    <TierBar
                      label="Tier 2 — Preferred return"
                      tier={waterfall.tier2}
                      suffix={`(${pct(waterfall.hurdleStatusPct)} of hurdle)`}
                    />
                    <TierBar
                      label="Tier 3 — GP catch-up"
                      tier={waterfall.tier3}
                    />
                    <div className="rounded-lg border p-3">
                      <p className="text-sm font-medium">
                        Tier 4 — Carried interest split
                      </p>
                      <p className="mt-2 text-sm">
                        To LPs: {money(waterfall.tier4.lpPaid, fund.currency)}
                      </p>
                      <p className="text-sm">
                        To GP (carry):{" "}
                        {money(waterfall.tier4.gpPaid, fund.currency)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {gpCarry && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      GP carry position
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Carry received (gross)
                      </p>
                      <p className="font-semibold">
                        {money(gpCarry.carryReceivedToDate, fund.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Carry entitled
                      </p>
                      <p className="font-semibold">
                        {money(gpCarry.carryEntitled, fund.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Paid net (after escrow)
                      </p>
                      <p className="font-semibold">
                        {money(gpCarry.carryPaidNet, fund.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Held in escrow
                      </p>
                      <p className="font-semibold">
                        {money(gpCarry.carryHeldInEscrow, fund.currency)}
                      </p>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-4">
                      <Badge
                        className={
                          gpCarry.noClawback
                            ? "bg-success/10 text-success"
                            : "bg-destructive/10 text-destructive"
                        }
                      >
                        {gpCarry.noClawback
                          ? "No clawback — carry paid does not exceed carry entitled"
                          : `Clawback obligation: ${money(gpCarry.clawbackObligation, fund.currency)}`}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ref</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">To LPs</TableHead>
                        <TableHead className="text-right">
                          To GP (carry)
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {distributions.map((d) => (
                        <TableRow key={d._id}>
                          <TableCell className="text-sm font-medium">
                            {d.ref}
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(d.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-sm">{d.source}</TableCell>
                          <TableCell className="text-right text-sm">
                            {money(d.totalAmount, fund.currency)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {money(d.totalToLps, fund.currency)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {money(d.totalToGpGross, fund.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!distributions.length && (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="py-8 text-center text-sm text-muted-foreground"
                          >
                            No distributions recorded yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {accruedCarry && accruedCarry.hypotheticalNav > 0 && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <span className="font-medium">
                    Accrued (unrealised) carry on current NAV:{" "}
                  </span>
                  {money(accruedCarry.accruedCarryGross, fund.currency)}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {accruedCarry.accruedCarryNote}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* NAV & valuation */}
            <TabsContent value="nav" className="pt-4 space-y-4">
              {nav && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">
                        Portfolio (fair value)
                      </p>
                      <p className="mt-1 text-lg font-bold">
                        {money(nav.portfolioTotal, fund.currency)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Cash held</p>
                      <p className="mt-1 text-lg font-bold">
                        {money(nav.cashHeld, fund.currency)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">
                        Accrued fee + expenses
                      </p>
                      <p className="mt-1 text-lg font-bold text-destructive">
                        (
                        {money(
                          nav.accruedManagementFeePayable +
                            nav.fundExpensesPayable,
                          fund.currency,
                        )}
                        )
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-primary">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">NAV</p>
                      <p className="mt-1 text-lg font-bold text-primary">
                        {money(nav.nav, fund.currency)}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
              {performance && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">DPI</p>
                      <p className="mt-1 text-lg font-bold">
                        {performance.dpi.toFixed(2)}x
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">RVPI</p>
                      <p className="mt-1 text-lg font-bold">
                        {performance.rvpi.toFixed(2)}x
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">TVPI</p>
                      <p className="mt-1 text-lg font-bold text-success">
                        {performance.tvpi.toFixed(2)}x
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Net IRR</p>
                      <p className="mt-1 text-lg font-bold">
                        {performance.netIrr !== null
                          ? `${(performance.netIrr * 100).toFixed(1)}%`
                          : "—"}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {performance.netIrrNote}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Valuation period</Label>
                  <Input
                    className="w-32"
                    value={valuationPeriod}
                    onChange={(e) => setValuationPeriod(e.target.value)}
                    placeholder="2026-Q2"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOpenNewHolding(true)}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add holding
                </Button>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Valuation workflow — {valuationPeriod}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Prior period</TableHead>
                        <TableHead>Proposed</TableHead>
                        <TableHead>Reviewed</TableHead>
                        <TableHead>Approved</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {valuationWorkflow.map((row) => (
                        <TableRow key={row.holdingId}>
                          <TableCell className="text-sm font-medium">
                            {row.companyName}
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.priorApprovedValue !== null
                              ? money(row.priorApprovedValue, fund.currency)
                              : "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.valuation
                              ? money(
                                  row.valuation.proposedValue,
                                  fund.currency,
                                )
                              : "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.valuation?.reviewedValue !== null &&
                            row.valuation?.reviewedValue !== undefined
                              ? money(
                                  row.valuation.reviewedValue,
                                  fund.currency,
                                )
                              : "—"}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {row.valuation?.approvedValue !== null &&
                            row.valuation?.approvedValue !== undefined
                              ? money(
                                  row.valuation.approvedValue,
                                  fund.currency,
                                )
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {row.valuation?.status ?? "Not started"}
                            </Badge>
                          </TableCell>
                          <TableCell className="space-x-1">
                            {!row.valuation && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setProposeTarget({
                                    holdingId: row.holdingId,
                                    companyName: row.companyName,
                                  });
                                  setProposeForm((f) => ({
                                    ...f,
                                    proposedValue:
                                      row.priorApprovedValue ?? row.costBasis,
                                  }));
                                }}
                              >
                                Propose
                              </Button>
                            )}
                            {row.valuation?.status === "Proposed" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setReviewTarget({
                                    valuationId: row.valuation!._id,
                                    companyName: row.companyName,
                                    proposedValue: row.valuation!.proposedValue,
                                  });
                                  setReviewForm((f) => ({
                                    ...f,
                                    reviewedValue: row.valuation!.proposedValue,
                                  }));
                                }}
                              >
                                Review
                              </Button>
                            )}
                            {row.valuation?.status === "Reviewed" && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  setApproveTarget({
                                    valuationId: row.valuation!._id,
                                    companyName: row.companyName,
                                    reviewedValue:
                                      row.valuation!.reviewedValue ?? 0,
                                  })
                                }
                              >
                                Approve
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!valuationWorkflow.length && (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="py-8 text-center text-sm text-muted-foreground"
                          >
                            No active holdings for this period.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Portfolio holdings
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Sector</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead className="text-right">Cost basis</TableHead>
                        <TableHead className="text-right">Fair value</TableHead>
                        <TableHead className="text-right">MOIC</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holdings.map((h) => (
                        <TableRow key={h._id}>
                          <TableCell className="text-sm font-medium">
                            {h.companyName}
                          </TableCell>
                          <TableCell className="text-sm">
                            {h.sector || "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {h.country || "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {money(h.costBasis, fund.currency)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {h.status === "Exited"
                              ? money(h.exitProceeds ?? 0, fund.currency)
                              : h.fairValue !== null
                                ? money(h.fairValue, fund.currency)
                                : "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {h.moic !== null ? `${h.moic.toFixed(2)}x` : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                h.status === "Exited"
                                  ? "bg-success/10 text-success"
                                  : ""
                              }
                              variant={
                                h.status === "Active" ? "outline" : "default"
                              }
                            >
                              {h.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {h.status === "Active" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setExitTarget({
                                    holdingId: h._id,
                                    companyName: h.companyName,
                                  })
                                }
                              >
                                Record exit
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!holdings.length && (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="py-8 text-center text-sm text-muted-foreground"
                          >
                            No portfolio holdings yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Fees & carry */}
            <TabsContent value="fees" className="pt-4 space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Management fee</CardTitle>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      className="w-40"
                      value={chargeAsOf}
                      onChange={(e) => setChargeAsOf(e.target.value)}
                    />
                    <Button
                      size="sm"
                      onClick={() => chargeFeeMut.mutate()}
                      disabled={chargeFeeMut.isPending}
                    >
                      Charge for {currentPeriod()}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {feePreview && (
                    <p className="text-xs text-muted-foreground">
                      If charged today: basis{" "}
                      <span className="font-medium text-foreground">
                        {feePreview.basis}
                      </span>
                      , total {money(feePreview.totalFeeAmount, fund.currency)}{" "}
                      on {money(feePreview.totalBaseAmount, fund.currency)}.
                    </p>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Basis</TableHead>
                        <TableHead className="text-right">Base</TableHead>
                        <TableHead className="text-right">Fee</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feeCharges.map((c) => (
                        <TableRow key={c._id}>
                          <TableCell className="text-sm">{c.period}</TableCell>
                          <TableCell className="text-sm">{c.basis}</TableCell>
                          <TableCell className="text-right text-sm">
                            {money(c.totalBaseAmount, fund.currency)}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {money(c.totalFeeAmount, fund.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                c.status === "Paid"
                                  ? "bg-success/10 text-success"
                                  : "bg-warning/10 text-warning"
                              }
                            >
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {c.status === "Accrued" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => payFeeMut.mutate(c._id)}
                              >
                                Mark paid
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!feeCharges.length && (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="py-6 text-center text-sm text-muted-foreground"
                          >
                            No fee charges yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Fund expenses</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOpenNewExpense(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Record expense
                  </Button>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Borne by</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fundExpenses.map((e) => (
                        <TableRow key={e._id}>
                          <TableCell className="text-sm">
                            {e.category}
                            {e.isOrganisationalCost && (
                              <Badge
                                variant="outline"
                                className="ml-2 text-[10px]"
                              >
                                Org. cost
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(e.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {money(e.amount, fund.currency)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {e.borneBy}
                            {e.gpBorneAmount > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {" "}
                                ({money(e.gpBorneAmount, fund.currency)} GP)
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!fundExpenses.length && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="py-6 text-center text-sm text-muted-foreground"
                          >
                            No fund expenses recorded yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Compliance */}
            <TabsContent value="compliance" className="pt-4 space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">
                    Key persons (LPA cl. 16)
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOpenNewKeyPerson(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {keyPersons.map((kp) => (
                    <div
                      key={kp._id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {kp.name}{" "}
                          <span className="text-muted-foreground">
                            · {kp.role}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Must devote &gt;{kp.timeThresholdPct}% of time · last
                          confirmed{" "}
                          {kp.lastConfirmedAt
                            ? new Date(kp.lastConfirmedAt).toLocaleDateString()
                            : "never"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            kp.status === "Active"
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive"
                          }
                        >
                          {kp.status}
                        </Badge>
                        {kp.status === "Active" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => confirmKeyPersonMut.mutate(kp._id)}
                            >
                              Confirm active
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => departKeyPersonMut.mutate(kp._id)}
                            >
                              Mark departed
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {!keyPersons.length && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No key persons recorded yet.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">
                    Compliance calendar
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOpenNewCalendarItem(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add requirement
                  </Button>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Requirement</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Last completed</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {complianceCalendar.map((c) => (
                        <TableRow key={c._id}>
                          <TableCell className="text-sm">{c.name}</TableCell>
                          <TableCell className="text-sm">
                            {c.frequency}
                          </TableCell>
                          <TableCell className="text-sm">
                            {c.lastCompletedAt
                              ? `${new Date(c.lastCompletedAt).toLocaleDateString()} (${c.lastCompletedPeriod})`
                              : "Never"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                c.status === "Overdue"
                                  ? "bg-destructive/10 text-destructive"
                                  : c.status === "Due soon"
                                    ? "bg-warning/10 text-warning"
                                    : ""
                              }
                              variant="outline"
                            >
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setCompleteTarget({ id: c._id, name: c.name })
                              }
                            >
                              Mark complete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!complianceCalendar.length && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="py-6 text-center text-sm text-muted-foreground"
                          >
                            No filing requirements set up yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {restrictions && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Investment restriction monitoring (LPA cl. 7)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {restrictions.singleInvestment.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          SINGLE INVESTMENT CAP
                        </p>
                        {restrictions.singleInvestment.map((r) => (
                          <div
                            key={r.companyName}
                            className="flex items-center justify-between py-1 text-sm"
                          >
                            <span>{r.companyName}</span>
                            <Badge
                              variant="outline"
                              className={
                                r.withinLimit
                                  ? "text-success"
                                  : "text-destructive"
                              }
                            >
                              {r.pct.toFixed(1)}%
                              {!r.withinLimit && " — over limit"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                    {restrictions.sectorConcentration.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          SECTOR CONCENTRATION
                        </p>
                        {restrictions.sectorConcentration.map((r) => (
                          <div
                            key={r.sector}
                            className="flex items-center justify-between py-1 text-sm"
                          >
                            <span>{r.sector}</span>
                            <Badge
                              variant="outline"
                              className={
                                r.withinLimit
                                  ? "text-success"
                                  : "text-destructive"
                              }
                            >
                              {r.pct.toFixed(1)}%
                              {!r.withinLimit && " — over limit"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                    {restrictions.countryConcentration.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          COUNTRY CONCENTRATION
                        </p>
                        {restrictions.countryConcentration.map((r) => (
                          <div
                            key={r.country}
                            className="flex items-center justify-between py-1 text-sm"
                          >
                            <span>{r.country}</span>
                            <Badge
                              variant="outline"
                              className={
                                r.withinLimit
                                  ? "text-success"
                                  : "text-destructive"
                              }
                            >
                              {r.pct.toFixed(1)}%
                              {!r.withinLimit && " — over limit"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                    {!restrictions.singleInvestment.length &&
                      !restrictions.sectorConcentration.length &&
                      !restrictions.countryConcentration.length && (
                        <p className="text-sm text-muted-foreground">
                          No caps set on this fund's terms yet — set them under
                          Fund setup to enable monitoring.
                        </p>
                      )}
                    {restrictions.excludedSectorViolations.length > 0 && (
                      <div className="rounded border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">
                        {restrictions.excludedSectorViolations.length}{" "}
                        holding(s) in an excluded sector.
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {restrictions.amlNote}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Multi-currency */}
            <TabsContent value="currency" className="pt-4 space-y-4">
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOpenNewFxRate(true)}
                >
                  <Plus className="mr-2 h-4 w-4" /> Record FX rate
                </Button>
              </div>
              {fxExposure && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      FX exposure — {fxExposure.currencyCount} currencies
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company</TableHead>
                          <TableHead>Currency</TableHead>
                          <TableHead className="text-right">
                            Entry rate
                          </TableHead>
                          <TableHead className="text-right">
                            Current rate
                          </TableHead>
                          <TableHead className="text-right">
                            FX gain/(loss)
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fxExposure.rows.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm">
                              {r.companyName}
                            </TableCell>
                            <TableCell className="text-sm">
                              {r.currency}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {r.entryRate ?? "—"}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {r.currentRate ?? "—"}
                            </TableCell>
                            <TableCell
                              className={`text-right text-sm ${r.fxGainLoss !== undefined && r.fxGainLoss < 0 ? "text-destructive" : "text-success"}`}
                            >
                              {r.fxGainLoss !== undefined
                                ? money(r.fxGainLoss, fund.currency)
                                : (r.note ?? "—")}
                            </TableCell>
                          </TableRow>
                        ))}
                        {!fxExposure.rows.length && (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="py-6 text-center text-sm text-muted-foreground"
                            >
                              No non-base-currency holdings.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    {fxExposure.rows.length > 0 && (
                      <div className="border-t p-3 text-sm">
                        <span className="font-medium">
                          Total FX gain/(loss):{" "}
                        </span>
                        <span
                          className={
                            fxExposure.totalFxGainLoss < 0
                              ? "text-destructive"
                              : "text-success"
                          }
                        >
                          {money(fxExposure.totalFxGainLoss, fund.currency)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Recorded FX rates</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead>As of</TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fxRates.map((r) => (
                        <TableRow key={r._id}>
                          <TableCell className="text-sm">
                            {r.fromCurrency}
                          </TableCell>
                          <TableCell className="text-sm">
                            {r.toCurrency}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {r.rate}
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(r.asOfDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-sm">
                            {r.source || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!fxRates.length && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="py-6 text-center text-sm text-muted-foreground"
                          >
                            No FX rates recorded yet. No live feed is connected
                            — rates are entered manually from your own source.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Scenarios */}
            <TabsContent value="scenarios" className="pt-4 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    What-if exit values
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Leave a holding blank to use its real current fair value.
                    Read-only — nothing is recorded.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {holdings
                    .filter((h) => h.status === "Active")
                    .map((h) => (
                      <div
                        key={h._id}
                        className="flex items-center justify-between gap-3"
                      >
                        <Label className="flex-1 text-sm">
                          {h.companyName}{" "}
                          <span className="text-muted-foreground">
                            (current:{" "}
                            {h.fairValue !== null
                              ? money(h.fairValue, fund.currency)
                              : money(h.costBasis, fund.currency)}
                            )
                          </span>
                        </Label>
                        <Input
                          type="number"
                          className="w-40"
                          placeholder="exit value"
                          value={scenarioValues[h._id] ?? ""}
                          onChange={(e) =>
                            setScenarioValues({
                              ...scenarioValues,
                              [h._id]: e.target.value
                                ? Number(e.target.value)
                                : (undefined as any),
                            })
                          }
                        />
                      </div>
                    ))}
                  <Button
                    onClick={() => runScenarioMut.mutate()}
                    disabled={runScenarioMut.isPending}
                  >
                    <Sliders className="mr-2 h-4 w-4" /> Run scenario
                  </Button>
                </CardContent>
              </Card>

              {scenarioResult && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Scenario result</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Hypothetical total
                        </p>
                        <p className="font-semibold">
                          {money(
                            scenarioResult.hypotheticalTotal,
                            fund.currency,
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">To LPs</p>
                        <p className="font-semibold">
                          {money(scenarioResult.totalToLps, fund.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          To GP (carry)
                        </p>
                        <p className="font-semibold">
                          {money(scenarioResult.totalToGpGross, fund.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Hurdle</p>
                        <Badge
                          className={
                            scenarioResult.hurdleCleared
                              ? "bg-success/10 text-success"
                              : "bg-warning/10 text-warning"
                          }
                        >
                          {scenarioResult.hurdleCleared
                            ? "Cleared"
                            : "Not cleared"}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                      <div>
                        <p className="text-muted-foreground">Tier 1</p>
                        <p>
                          {money(scenarioResult.tier1Amount, fund.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tier 2</p>
                        <p>
                          {money(scenarioResult.tier2Amount, fund.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tier 3</p>
                        <p>
                          {money(scenarioResult.tier3Amount, fund.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tier 4 (LP)</p>
                        <p>
                          {money(scenarioResult.tier4LpAmount, fund.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tier 4 (GP)</p>
                        <p>
                          {money(scenarioResult.tier4GpAmount, fund.currency)}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {scenarioResult.note}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* LP reporting */}
            <TabsContent value="lpreporting" className="pt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Label className="text-sm">LP</Label>
                <Select value={reportingLpId} onValueChange={setReportingLpId}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Select an LP..." />
                  </SelectTrigger>
                  <SelectContent>
                    {commitments.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.lpName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {reportingLpId && (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Quarterly statement
                      </CardTitle>
                      <div className="flex gap-2 pt-2">
                        <Input
                          type="date"
                          value={statementRange.periodStart}
                          onChange={(e) =>
                            setStatementRange({
                              ...statementRange,
                              periodStart: e.target.value,
                            })
                          }
                        />
                        <Input
                          type="date"
                          value={statementRange.periodEnd}
                          onChange={(e) =>
                            setStatementRange({
                              ...statementRange,
                              periodEnd: e.target.value,
                            })
                          }
                        />
                      </div>
                    </CardHeader>
                    {quarterlyStatement && (
                      <CardContent className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                        <Field
                          label="Commitment"
                          value={money(
                            quarterlyStatement.commitment,
                            fund.currency,
                          )}
                        />
                        <Field
                          label="Uncalled"
                          value={money(
                            quarterlyStatement.uncalled,
                            fund.currency,
                          )}
                        />
                        <Field
                          label="Opening balance"
                          value={money(
                            quarterlyStatement.openingBalance,
                            fund.currency,
                          )}
                        />
                        <Field
                          label="Contributions in period"
                          value={money(
                            quarterlyStatement.contributionsInPeriod,
                            fund.currency,
                          )}
                        />
                        <Field
                          label="Income allocated"
                          value={money(
                            quarterlyStatement.incomeAlloc,
                            fund.currency,
                          )}
                        />
                        <Field
                          label="Expenses allocated"
                          value={money(
                            quarterlyStatement.expenseAlloc,
                            fund.currency,
                          )}
                        />
                        <Field
                          label="Gain/(loss)"
                          value={money(
                            quarterlyStatement.gainLoss,
                            fund.currency,
                          )}
                        />
                        <Field
                          label="Distributions in period"
                          value={money(
                            quarterlyStatement.distributionsInPeriod,
                            fund.currency,
                          )}
                        />
                        <Field
                          label="Closing balance"
                          value={money(
                            quarterlyStatement.closingBalance,
                            fund.currency,
                          )}
                        />
                        <Field
                          label="DPI / RVPI / TVPI"
                          value={`${quarterlyStatement.dpi.toFixed(2)}x / ${quarterlyStatement.rvpi.toFixed(2)}x / ${quarterlyStatement.tvpi.toFixed(2)}x`}
                        />
                      </CardContent>
                    )}
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Fee & expense disclosure
                      </CardTitle>
                      <Input
                        className="mt-2 w-32"
                        value={disclosurePeriod}
                        onChange={(e) => setDisclosurePeriod(e.target.value)}
                      />
                    </CardHeader>
                    {feeDisclosure && (
                      <CardContent className="space-y-2 text-sm">
                        {feeDisclosure.managementFee ? (
                          <div className="flex justify-between">
                            <span>Management fee (your share)</span>
                            <span className="font-medium">
                              {money(
                                feeDisclosure.managementFee.feeAmount,
                                fund.currency,
                              )}
                            </span>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">
                            No management fee charged for {disclosurePeriod}.
                          </p>
                        )}
                        {feeDisclosure.expenses.map((e: any, i: number) => (
                          <div
                            key={i}
                            className="flex justify-between text-muted-foreground"
                          >
                            <span>{e.category}</span>
                            <span>{money(e.theirShare, fund.currency)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between border-t pt-2 font-semibold">
                          <span>Total expense share</span>
                          <span>
                            {money(
                              feeDisclosure.totalExpenseShare,
                              fund.currency,
                            )}
                          </span>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </>
              )}
              {!reportingLpId && (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Select an LP to view their real reporting.
                  </CardContent>
                </Card>
              )}

              <p className="text-xs text-muted-foreground">
                ESG/impact reporting and full annual financial statements aren't
                built — ESG isn't tracked anywhere in this system, and a real
                annual FS needs the fund run through a full chart of accounts.
              </p>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* New fund dialog */}
      <NewFundDialog
        open={openNewFund}
        onOpenChange={setOpenNewFund}
        form={fundForm}
        setForm={setFundForm}
        bankAccounts={fundAccounts}
        onCreate={() => createFundMut.mutate()}
        creating={createFundMut.isPending}
      />

      {/* Edit terms */}
      <Dialog open={openEditTerms} onOpenChange={setOpenEditTerms}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit fund terms</DialogTitle>
          </DialogHeader>
          <FundTermsForm
            form={termsForm}
            setForm={setTermsForm}
            bankAccounts={fundAccounts}
          />
          <DialogFooter>
            <Button
              disabled={updateTermsMut.isPending}
              onClick={() => updateTermsMut.mutate()}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New commitment */}
      <Dialog open={openNewCommitment} onOpenChange={setOpenNewCommitment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add LP commitment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>LP</Label>
              <ClientSelect
                value={commitmentForm.lpUserId}
                onValueChange={(v) =>
                  setCommitmentForm((d) => ({ ...d, lpUserId: v }))
                }
                onClientChange={(c: any) =>
                  setCommitmentForm((d) => ({
                    ...d,
                    lpName:
                      [c.firstName, c.lastName].filter(Boolean).join(" ") ||
                      c.businessName ||
                      c.email,
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Commitment</Label>
                <Input
                  type="number"
                  value={commitmentForm.commitment}
                  onChange={(e) =>
                    setCommitmentForm({
                      ...commitmentForm,
                      commitment: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={commitmentForm.type}
                  onValueChange={(v) =>
                    setCommitmentForm({
                      ...commitmentForm,
                      type: v as CommitmentType,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMITMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Close label</Label>
                <Input
                  value={commitmentForm.closeLabel}
                  onChange={(e) =>
                    setCommitmentForm({
                      ...commitmentForm,
                      closeLabel: e.target.value,
                    })
                  }
                  placeholder="1st, 2nd, Final..."
                />
              </div>
              <div>
                <Label>Close date</Label>
                <Input
                  type="date"
                  value={commitmentForm.closeDate}
                  onChange={(e) =>
                    setCommitmentForm({
                      ...commitmentForm,
                      closeDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={commitmentForm.isGpCommitment}
                onCheckedChange={(v) =>
                  setCommitmentForm({ ...commitmentForm, isGpCommitment: v })
                }
              />
              <Label>This is the GP's own commitment</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={commitmentForm.hasSideLetter}
                onCheckedChange={(v) =>
                  setCommitmentForm({ ...commitmentForm, hasSideLetter: v })
                }
              />
              <Label>Has a side letter</Label>
            </div>
            {commitmentForm.hasSideLetter && (
              <>
                <div>
                  <Label>Management fee override (%)</Label>
                  <Input
                    type="number"
                    value={commitmentForm.mgmtFeePctOverride ?? ""}
                    onChange={(e) =>
                      setCommitmentForm({
                        ...commitmentForm,
                        mgmtFeePctOverride: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Side letter notes</Label>
                  <Textarea
                    value={commitmentForm.sideLetterNotes}
                    onChange={(e) =>
                      setCommitmentForm({
                        ...commitmentForm,
                        sideLetterNotes: e.target.value,
                      })
                    }
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              disabled={
                !commitmentForm.lpUserId ||
                !commitmentForm.commitment ||
                createCommitmentMut.isPending
              }
              onClick={() => createCommitmentMut.mutate()}
            >
              Add commitment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Equalisation */}
      <Dialog open={!!eqTarget} onOpenChange={(o) => !o && setEqTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Equalisation — {eqTarget?.lpName}</DialogTitle>
          </DialogHeader>
          {eqCalc && (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                {eqCalc.daysAfterFirstClose} days after first close, catching up
                against {eqCalc.earlierLpCount} earlier-close LP(s).
              </p>
              <div className="flex justify-between">
                <span>Catch-up call</span>
                <span className="font-medium">
                  {money(eqCalc.catchUpCall, fund?.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Equalisation interest</span>
                <span className="font-medium">
                  {money(eqCalc.eqInterest, fund?.currency)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Total</span>
                <span>
                  {money(eqCalc.totalEqualisationPaid, fund?.currency)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                The catch-up increases this LP's own capital account; the
                interest is reallocated pro-rata to earlier-close LPs.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              disabled={applyEqMut.isPending}
              onClick={() => applyEqMut.mutate()}
            >
              Apply equalisation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New capital call */}
      <Dialog open={openNewCall} onOpenChange={setOpenNewCall}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New capital call</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Purpose</Label>
              <Input
                value={callForm.purpose}
                onChange={(e) =>
                  setCallForm({ ...callForm, purpose: e.target.value })
                }
                placeholder="e.g. Series B investment"
              />
            </div>
            <div>
              <Label>Total amount</Label>
              <Input
                type="number"
                value={callForm.totalAmount}
                onChange={(e) =>
                  setCallForm({
                    ...callForm,
                    totalAmount: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Issued on</Label>
                <Input
                  type="date"
                  value={callForm.issuedOn}
                  onChange={(e) =>
                    setCallForm({ ...callForm, issuedOn: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Due on</Label>
                <Input
                  type="date"
                  value={callForm.dueOn}
                  onChange={(e) =>
                    setCallForm({ ...callForm, dueOn: e.target.value })
                  }
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Allocated pro-rata across every current LP commitment, frozen at
              issuance.
            </p>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !callForm.purpose ||
                !callForm.totalAmount ||
                createCallMut.isPending
              }
              onClick={() => createCallMut.mutate()}
            >
              Issue call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fund allocation */}
      <Dialog
        open={!!fundingTarget}
        onOpenChange={(o) => !o && setFundingTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record funding</DialogTitle>
          </DialogHeader>
          <div>
            <Label>
              Amount (remaining:{" "}
              {money(fundingTarget?.remaining ?? 0, fund?.currency)})
            </Label>
            <Input
              type="number"
              value={fundingAmount}
              onChange={(e) => setFundingAmount(Number(e.target.value))}
            />
          </div>
          <DialogFooter>
            <Button
              disabled={!fundingAmount || recordFundingMut.isPending}
              onClick={() => recordFundingMut.mutate()}
            >
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cure default */}
      <Dialog
        open={!!cureTarget}
        onOpenChange={(o) => !o && setCureTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cure default</DialogTitle>
          </DialogHeader>
          <div>
            <Label>
              Amount (remaining:{" "}
              {money(cureTarget?.remaining ?? 0, fund?.currency)})
            </Label>
            <Input
              type="number"
              value={cureAmount}
              onChange={(e) => setCureAmount(Number(e.target.value))}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Real default interest for the actual days overdue is calculated and
            charged automatically.
          </p>
          <DialogFooter>
            <Button
              disabled={!cureAmount || cureDefaultMut.isPending}
              onClick={() => cureDefaultMut.mutate()}
            >
              Cure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record distribution */}
      <Dialog open={openNewDistribution} onOpenChange={setOpenNewDistribution}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record distribution</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Total amount</Label>
              <Input
                type="number"
                value={distForm.totalAmount}
                onChange={(e) =>
                  setDistForm({
                    ...distForm,
                    totalAmount: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={distForm.date}
                  onChange={(e) =>
                    setDistForm({ ...distForm, date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Source</Label>
                <Select
                  value={distForm.source}
                  onValueChange={(v) =>
                    setDistForm({
                      ...distForm,
                      source: v as DistributionSource,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISTRIBUTION_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={distForm.sourceDescription}
                onChange={(e) =>
                  setDistForm({
                    ...distForm,
                    sourceDescription: e.target.value,
                  })
                }
                placeholder="e.g. KigaliPay exit proceeds"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Waterfalled through the real tiers against the current cumulative
              state — this fills Tier 1 (return of capital), then Tier 2
              (preferred return), then Tier 3 (GP catch-up), then splits the
              remainder 80/20.
            </p>
          </div>
          <DialogFooter>
            <Button
              disabled={!distForm.totalAmount || recordDistMut.isPending}
              onClick={() => recordDistMut.mutate()}
            >
              Record distribution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New holding */}
      <Dialog open={openNewHolding} onOpenChange={setOpenNewHolding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add portfolio holding</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Company name</Label>
              <Input
                value={holdingForm.companyName}
                onChange={(e) =>
                  setHoldingForm({
                    ...holdingForm,
                    companyName: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sector</Label>
                <Input
                  value={holdingForm.sector}
                  onChange={(e) =>
                    setHoldingForm({ ...holdingForm, sector: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Country</Label>
                <Input
                  value={holdingForm.country}
                  onChange={(e) =>
                    setHoldingForm({ ...holdingForm, country: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Entry date</Label>
                <Input
                  type="date"
                  value={holdingForm.entryDate}
                  onChange={(e) =>
                    setHoldingForm({
                      ...holdingForm,
                      entryDate: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Cost basis</Label>
                <Input
                  type="number"
                  value={holdingForm.costBasis}
                  onChange={(e) =>
                    setHoldingForm({
                      ...holdingForm,
                      costBasis: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !holdingForm.companyName ||
                !holdingForm.costBasis ||
                createHoldingMut.isPending
              }
              onClick={() => createHoldingMut.mutate()}
            >
              Add holding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record exit */}
      <Dialog
        open={!!exitTarget}
        onOpenChange={(o) => !o && setExitTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record exit — {exitTarget?.companyName}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Exit date</Label>
                <Input
                  type="date"
                  value={exitForm.exitedAt}
                  onChange={(e) =>
                    setExitForm({ ...exitForm, exitedAt: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Exit proceeds</Label>
                <Input
                  type="number"
                  value={exitForm.exitProceeds}
                  onChange={(e) =>
                    setExitForm({
                      ...exitForm,
                      exitProceeds: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            {fund?.recyclingPermitted && (
              <div>
                <Label>Recycled amount (optional)</Label>
                <Input
                  type="number"
                  value={exitForm.recycledAmount}
                  onChange={(e) =>
                    setExitForm({
                      ...exitForm,
                      recycledAmount: Number(e.target.value),
                    })
                  }
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              This doesn't itself distribute cash to LPs — record a distribution
              separately once the GP decides how proceeds are handled.
            </p>
          </div>
          <DialogFooter>
            <Button
              disabled={!exitForm.exitProceeds || recordExitMut.isPending}
              onClick={() => recordExitMut.mutate()}
            >
              Record exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Propose valuation */}
      <Dialog
        open={!!proposeTarget}
        onOpenChange={(o) => !o && setProposeTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Propose valuation — {proposeTarget?.companyName}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Method</Label>
                <Select
                  value={proposeForm.method}
                  onValueChange={(v) =>
                    setProposeForm({
                      ...proposeForm,
                      method: v as ValuationMethod,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VALUATION_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>IFRS level</Label>
                <Select
                  value={proposeForm.ifrsLevel}
                  onValueChange={(v) =>
                    setProposeForm({
                      ...proposeForm,
                      ifrsLevel: v as IfrsLevel,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IFRS_LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Key input / basis</Label>
              <Textarea
                value={proposeForm.keyInput}
                onChange={(e) =>
                  setProposeForm({ ...proposeForm, keyInput: e.target.value })
                }
                placeholder="e.g. Series B at $6.2M, +3% for Q2 revenue growth"
              />
            </div>
            <div>
              <Label>Proposed value</Label>
              <Input
                type="number"
                value={proposeForm.proposedValue}
                onChange={(e) =>
                  setProposeForm({
                    ...proposeForm,
                    proposedValue: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label>Proposed by</Label>
              <Input
                value={proposeForm.proposedBy}
                onChange={(e) =>
                  setProposeForm({ ...proposeForm, proposedBy: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !proposeForm.proposedBy ||
                !proposeForm.proposedValue ||
                proposeMut.isPending
              }
              onClick={() => proposeMut.mutate()}
            >
              Submit proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review valuation */}
      <Dialog
        open={!!reviewTarget}
        onOpenChange={(o) => !o && setReviewTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Review valuation — {reviewTarget?.companyName}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              GP proposed:{" "}
              {money(reviewTarget?.proposedValue ?? 0, fund?.currency)}
            </p>
            <div>
              <Label>Reviewed value</Label>
              <Input
                type="number"
                value={reviewForm.reviewedValue}
                onChange={(e) =>
                  setReviewForm({
                    ...reviewForm,
                    reviewedValue: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={reviewForm.reviewNotes}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, reviewNotes: e.target.value })
                }
                placeholder="Required if the value differs from what the GP proposed"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={reviewForm.methodologyChanged}
                onCheckedChange={(v) =>
                  setReviewForm({ ...reviewForm, methodologyChanged: v })
                }
              />
              <Label>Methodology changed from prior quarter</Label>
            </div>
            <div>
              <Label>Reviewed by</Label>
              <Input
                value={reviewForm.reviewedBy}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, reviewedBy: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!reviewForm.reviewedBy || reviewMut.isPending}
              onClick={() => reviewMut.mutate()}
            >
              Submit review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve valuation */}
      <Dialog
        open={!!approveTarget}
        onOpenChange={(o) => !o && setApproveTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Approve valuation — {approveTarget?.companyName}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              Reviewed value:{" "}
              {money(approveTarget?.reviewedValue ?? 0, fund?.currency)}
            </p>
            <div>
              <Label>Approved by</Label>
              <Input
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!approvedBy || approveMut.isPending}
              onClick={() => approveMut.mutate()}
            >
              Approve — locks in for NAV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record fund expense */}
      <Dialog open={openNewExpense} onOpenChange={setOpenNewExpense}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record fund expense</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Category</Label>
              <Input
                value={expenseForm.category}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, category: e.target.value })
                }
                placeholder="e.g. Audit (KPMG Rwanda)"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      amount: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, date: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={expenseForm.isOrganisationalCost}
                onCheckedChange={(v) =>
                  setExpenseForm({ ...expenseForm, isOrganisationalCost: v })
                }
              />
              <Label>Organisational (formation) cost</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Fund-borne amounts are allocated pro-rata to LPs. Organisational
              costs above the fund's real cap are automatically excluded and
              treated as GP-borne.
            </p>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !expenseForm.category ||
                !expenseForm.amount ||
                recordExpenseMut.isPending
              }
              onClick={() => recordExpenseMut.mutate()}
            >
              Record expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add key person */}
      <Dialog open={openNewKeyPerson} onOpenChange={setOpenNewKeyPerson}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add key person</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Name</Label>
              <Input
                value={keyPersonForm.name}
                onChange={(e) =>
                  setKeyPersonForm({ ...keyPersonForm, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Role</Label>
              <Input
                value={keyPersonForm.role}
                onChange={(e) =>
                  setKeyPersonForm({ ...keyPersonForm, role: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Time threshold (%)</Label>
              <Input
                type="number"
                value={keyPersonForm.timeThresholdPct}
                onChange={(e) =>
                  setKeyPersonForm({
                    ...keyPersonForm,
                    timeThresholdPct: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !keyPersonForm.name ||
                !keyPersonForm.role ||
                addKeyPersonMut.isPending
              }
              onClick={() => addKeyPersonMut.mutate()}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add compliance calendar item */}
      <Dialog open={openNewCalendarItem} onOpenChange={setOpenNewCalendarItem}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add filing requirement</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Name</Label>
              <Input
                value={calendarForm.name}
                onChange={(e) =>
                  setCalendarForm({ ...calendarForm, name: e.target.value })
                }
                placeholder="e.g. NAV reporting"
              />
            </div>
            <div>
              <Label>Frequency</Label>
              <Select
                value={calendarForm.frequency}
                onValueChange={(v) =>
                  setCalendarForm({
                    ...calendarForm,
                    frequency: v as ComplianceFrequency,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPLIANCE_FREQUENCIES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Days after period end</Label>
              <Input
                type="number"
                value={calendarForm.daysAfterPeriodEnd}
                onChange={(e) =>
                  setCalendarForm({
                    ...calendarForm,
                    daysAfterPeriodEnd: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!calendarForm.name || addCalendarMut.isPending}
              onClick={() => addCalendarMut.mutate()}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark compliance complete */}
      <Dialog
        open={!!completeTarget}
        onOpenChange={(o) => !o && setCompleteTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark complete — {completeTarget?.name}</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Period</Label>
            <Input
              value={completePeriod}
              onChange={(e) => setCompletePeriod(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              disabled={markCompleteMut.isPending}
              onClick={() => markCompleteMut.mutate()}
            >
              Mark complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record FX rate */}
      <Dialog open={openNewFxRate} onOpenChange={setOpenNewFxRate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record FX rate</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>From currency</Label>
                <Input
                  value={fxForm.fromCurrency}
                  onChange={(e) =>
                    setFxForm({
                      ...fxForm,
                      fromCurrency: e.target.value.toUpperCase(),
                    })
                  }
                  maxLength={3}
                  placeholder="KES"
                />
              </div>
              <div>
                <Label>To currency</Label>
                <Input
                  value={fxForm.toCurrency}
                  onChange={(e) =>
                    setFxForm({
                      ...fxForm,
                      toCurrency: e.target.value.toUpperCase(),
                    })
                  }
                  maxLength={3}
                />
              </div>
            </div>
            <div>
              <Label>Rate</Label>
              <Input
                type="number"
                value={fxForm.rate}
                onChange={(e) =>
                  setFxForm({ ...fxForm, rate: Number(e.target.value) })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>As of date</Label>
                <Input
                  type="date"
                  value={fxForm.asOfDate}
                  onChange={(e) =>
                    setFxForm({ ...fxForm, asOfDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Source</Label>
                <Input
                  value={fxForm.source}
                  onChange={(e) =>
                    setFxForm({ ...fxForm, source: e.target.value })
                  }
                  placeholder="e.g. BNR daily mid-rate"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !fxForm.fromCurrency ||
                !fxForm.toCurrency ||
                !fxForm.rate ||
                recordFxMut.isPending
              }
              onClick={() => recordFxMut.mutate()}
            >
              Record rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Top-level, prop-driven — kept outside FundAccounting so its
// identity is stable across renders. Defining a component inside
// another component's body recreates it on every render (any
// keystroke that changes state re-renders the parent), which makes
// React remount every input inside it and lose focus after each
// character — exactly the "glitching" symptom this fixes.
function FundTermsForm({
  form,
  setForm,
  bankAccounts,
}: {
  form: FundFormState;
  setForm: (f: FundFormState) => void;
  bankAccounts: { _id: string; name: string }[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          ENTITY & STRUCTURE
        </p>
        <div>
          <Label>Fund name</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <Label>Structure</Label>
          <Input
            value={form.structure}
            onChange={(e) => setForm({ ...form, structure: e.target.value })}
          />
        </div>
        <div>
          <Label>Jurisdiction</Label>
          <Input
            value={form.jurisdiction}
            onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })}
          />
        </div>
        <div>
          <Label>Strategy</Label>
          <Input
            value={form.strategy}
            onChange={(e) => setForm({ ...form, strategy: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Target size</Label>
            <Input
              type="number"
              value={form.targetSize}
              onChange={(e) =>
                setForm({ ...form, targetSize: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <Label>Vintage</Label>
            <Input
              type="number"
              value={form.vintage}
              onChange={(e) =>
                setForm({ ...form, vintage: Number(e.target.value) })
              }
            />
          </div>
        </div>
        <div>
          <Label>Fund bank account</Label>
          <Select
            value={form.bankAccountId}
            onValueChange={(v) => setForm({ ...form, bankAccountId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {bankAccounts.map((a) => (
                <SelectItem key={a._id} value={a._id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          LPA COMMERCIAL TERMS
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Mgmt fee (%)</Label>
            <Input
              type="number"
              value={form.mgmtFeePct}
              onChange={(e) =>
                setForm({ ...form, mgmtFeePct: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <Label>Carry (%)</Label>
            <Input
              type="number"
              value={form.carryPct}
              onChange={(e) =>
                setForm({ ...form, carryPct: Number(e.target.value) })
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Hurdle (%)</Label>
            <Input
              type="number"
              value={form.hurdlePct}
              onChange={(e) =>
                setForm({ ...form, hurdlePct: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <Label>Carry escrow (%)</Label>
            <Input
              type="number"
              value={form.carryEscrowPct}
              onChange={(e) =>
                setForm({ ...form, carryEscrowPct: Number(e.target.value) })
              }
            />
          </div>
        </div>
        <div>
          <Label>Waterfall type</Label>
          <Select
            value={form.waterfallType}
            onValueChange={(v) =>
              setForm({ ...form, waterfallType: v as WaterfallType })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WATERFALL_TYPES.map((w) => (
                <SelectItem key={w} value={w}>
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Investment period ends</Label>
          <Input
            type="date"
            value={form.investmentPeriodEndDate}
            onChange={(e) =>
              setForm({ ...form, investmentPeriodEndDate: e.target.value })
            }
          />
        </div>
        <p className="text-xs font-medium text-muted-foreground pt-2">
          DEFAULT & EQUALISATION
        </p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label>Default int. (%)</Label>
            <Input
              type="number"
              value={form.defaultInterestPct}
              onChange={(e) =>
                setForm({ ...form, defaultInterestPct: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <Label>Cure (days)</Label>
            <Input
              type="number"
              value={form.curePeriodDays}
              onChange={(e) =>
                setForm({ ...form, curePeriodDays: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <Label>Forfeiture (%)</Label>
            <Input
              type="number"
              value={form.forfeiturePct}
              onChange={(e) =>
                setForm({ ...form, forfeiturePct: Number(e.target.value) })
              }
            />
          </div>
        </div>
        <div>
          <Label>Equalisation interest (%)</Label>
          <Input
            type="number"
            value={form.equalisationInterestPct}
            onChange={(e) =>
              setForm({
                ...form,
                equalisationInterestPct: Number(e.target.value),
              })
            }
          />
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Switch
            checked={form.recyclingPermitted}
            onCheckedChange={(v) => setForm({ ...form, recyclingPermitted: v })}
          />
          <Label>Recycling permitted</Label>
        </div>
        {form.recyclingPermitted && (
          <div>
            <Label>Recycling cap (% of commitments)</Label>
            <Input
              type="number"
              value={form.recyclingCapPct}
              onChange={(e) =>
                setForm({ ...form, recyclingCapPct: Number(e.target.value) })
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

function NewFundDialog({
  open,
  onOpenChange,
  form,
  setForm,
  bankAccounts,
  onCreate,
  creating,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  form: FundFormState;
  setForm: (f: FundFormState) => void;
  bankAccounts: { _id: string; name: string }[];
  onCreate: () => void;
  creating: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New fund</DialogTitle>
        </DialogHeader>
        <FundTermsForm
          form={form}
          setForm={setForm}
          bankAccounts={bankAccounts}
        />
        <DialogFooter>
          <Button disabled={!form.name || creating} onClick={onCreate}>
            Create fund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function TierBar({
  label,
  tier,
  suffix,
}: {
  label: string;
  tier?: { target: number; paid: number; remaining: number; complete: boolean };
  suffix?: string;
}) {
  if (!tier) return null;
  const width =
    tier.target > 0 ? Math.min(100, (tier.paid / tier.target) * 100) : 0;
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span>
          {money(tier.paid)} of {money(tier.target)}
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-muted">
        <div
          className={`h-2 rounded-full ${tier.complete ? "bg-success" : "bg-primary"}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {tier.complete ? "Complete" : `${money(tier.remaining)} remaining`}{" "}
        {suffix}
      </p>
    </div>
  );
}
