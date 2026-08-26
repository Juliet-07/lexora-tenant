import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileSignature,
  FileText,
  Flag,
  GitCompare,
  Loader2,
  MessageSquare,
  Pencil,
  PenTool,
  Plus,
  Send,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CommentThread } from "@/components/crm/CommentThread";
import { RichTextEditor } from "@/components/RichTextEditor";
import { fetchEmployees } from "@/lib/hr/hr-api";
import {
  fetchContract,
  advanceContractStage,
  executeContract,
  initiateRenewal,
  toggleAutoRenew,
  addNegotiationRound,
  updateClauseChangeStatus,
  addAmendment,
  addObligation,
  setObligationDone,
  sendContractForSignature,
  editContractBody,
  countersignContract,
  sendSignedContractCopy,
  downloadContractPdf,
  previewContractPdf,
  updateContractGovernance,
  fetchClauseLibrary,
  addConditionPrecedent,
  setConditionPrecedentSatisfied,
  setApprovalChain,
  decideApprovalStep,
  CONTRACT_STAGES,
  type ObligationType,
} from "@/lib/crm/tools-api";

const money = (n: number, c = "USD") =>
  (n ?? 0).toLocaleString(undefined, {
    style: "currency",
    currency: c || "USD",
    maximumFractionDigits: 0,
  });
const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";
const today = () => new Date().toISOString().slice(0, 10);
const daysTo = (d?: string | null) =>
  d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : 0;

const OBLIGATION_TYPES: ObligationType[] = [
  "Deliverable",
  "Notice period",
  "Payment",
  "Covenant",
];

const KV = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2 last:border-0">
    <span className="text-xs text-muted-foreground">{k}</span>
    <span className="text-right text-sm font-medium">{v}</span>
  </div>
);

const SectionTitle = ({
  icon: Icon,
  children,
}: {
  icon: any;
  children: React.ReactNode;
}) => (
  <CardTitle className="flex items-center gap-2 text-sm">
    <Icon className="h-4 w-4 text-primary" /> {children}
  </CardTitle>
);

/** Derives a contents outline from the rendered contract body. */
const outlineFrom = (html: string): { label: string; sub: boolean }[] => {
  if (!html) return [];
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ");
  const items: { label: string; sub: boolean }[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const m = line.match(/^(\d+(?:\.\d+)?)[.)]?\s+([A-Za-z][^.]{2,60})/);
    if (m)
      items.push({ label: `${m[1]} ${m[2]}`.trim(), sub: m[1].includes(".") });
    if (items.length > 24) break;
  }
  return items;
};

const approvalStatusTone: Record<string, string> = {
  Approved: "bg-success/10 text-success hover:bg-success/10",
  "In review": "bg-primary/10 text-primary hover:bg-primary/10",
  Waiting: "bg-muted text-muted-foreground",
  Rejected: "bg-destructive/10 text-destructive hover:bg-destructive/10",
};
const changeStatusTone: Record<string, string> = {
  Accepted: "bg-success/10 text-success hover:bg-success/10",
  Rejected: "bg-destructive/10 text-destructive hover:bg-destructive/10",
  Pending: "bg-warning/10 text-warning hover:bg-warning/10",
};

const emptyChangeRow = { clauseRef: "", change: "", note: "" };

export default function ContractDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const {
    data: contract,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["contract", id],
    queryFn: () => fetchContract(id),
    enabled: !!id,
  });
  const { data: clauseLibrary = [] } = useQuery({
    queryKey: ["clause-library"],
    queryFn: fetchClauseLibrary,
  });
  const { data: employeesPage } = useQuery({
    queryKey: ["hr-employees-all"],
    queryFn: () => fetchEmployees({ limit: 500 }),
    retry: false,
  });
  const employees = employeesPage?.items ?? [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["contract", id] });
    qc.invalidateQueries({ queryKey: ["contracts"] });
    qc.invalidateQueries({ queryKey: ["obligations-due"] });
    qc.invalidateQueries({ queryKey: ["contracts-expiring"] });
  };
  const ok = (title: string) => () => {
    invalidate();
    toast({ title });
  };

  // ── Mutations ───────────────────────────────────────────
  const advanceMut = useMutation({
    mutationFn: () => advanceContractStage(id),
    onSuccess: ok("Stage advanced"),
    onError: onErr("Could not advance stage"),
  });
  const previewMut = useMutation({
    mutationFn: () => previewContractPdf(id),
    onError: onErr("Preview failed"),
  });
  const downloadMut = useMutation({
    mutationFn: () => downloadContractPdf(id),
    onError: onErr("Download failed"),
  });
  const sendMut = useMutation({
    mutationFn: () => sendContractForSignature(id),
    onSuccess: ok("Sent for signature"),
    onError: onErr("Could not send"),
  });
  const editBodyMut = useMutation({
    mutationFn: (body: string) => editContractBody(id, { renderedBody: body }),
    onSuccess: () => {
      setEditing(false);
      ok("Draft saved")();
    },
    onError: onErr("Could not save draft"),
  });
  const countersignMut = useMutation({
    mutationFn: () => countersignContract(id, { signerName }),
    onSuccess: () => {
      setCountersignOpen(false);
      ok("Countersigned")();
    },
    onError: onErr("Could not countersign"),
  });
  const signedCopyMut = useMutation({
    mutationFn: () => sendSignedContractCopy(id),
    onSuccess: ok("Signed copy emailed"),
    onError: onErr("Could not send signed copy"),
  });
  const executeMut = useMutation({
    mutationFn: () => executeContract(id, executeForm),
    onSuccess: () => {
      setExecuteOpen(false);
      ok("Execution recorded")();
    },
    onError: onErr("Could not record execution"),
  });
  const roundMut = useMutation({
    mutationFn: () =>
      addNegotiationRound(id, {
        by: roundForm.by,
        at: roundForm.at,
        summary: roundForm.summary,
        changes: roundChanges
          .filter((c) => c.clauseRef.trim() && c.change.trim())
          .map((c) => ({
            clauseRef: c.clauseRef,
            change: c.change,
            note: c.note || undefined,
          })),
      }),
    onSuccess: () => {
      setRoundOpen(false);
      setRoundForm({ by: "", at: today(), summary: "" });
      setRoundChanges([{ ...emptyChangeRow }]);
      ok("Negotiation round logged")();
    },
    onError: onErr("Could not add round"),
  });
  const changeStatusMut = useMutation({
    mutationFn: (vars: {
      roundId: string;
      changeId: string;
      status: "Accepted" | "Rejected" | "Pending";
    }) =>
      updateClauseChangeStatus(id, vars.roundId, vars.changeId, vars.status),
    onSuccess: invalidate,
    onError: onErr("Could not update change"),
  });
  const amendMut = useMutation({
    mutationFn: () => addAmendment(id, amendForm),
    onSuccess: () => {
      setAmendOpen(false);
      setAmendForm({ ref: "", at: today(), summary: "" });
      ok("Amendment added")();
    },
    onError: onErr("Could not add amendment"),
  });
  const obligationMut = useMutation({
    mutationFn: () => addObligation(id, obForm),
    onSuccess: () => {
      setObOpen(false);
      setObForm({
        label: "",
        due: today(),
        type: "Deliverable",
        leadDays: 14,
      });
      ok("Obligation added")();
    },
    onError: onErr("Could not add obligation"),
  });
  const obDoneMut = useMutation({
    mutationFn: (obligationId: string) =>
      setObligationDone(id, obligationId, true),
    onSuccess: ok("Obligation marked done"),
    onError: onErr("Could not update obligation"),
  });
  const renewalMut = useMutation({
    mutationFn: () => initiateRenewal(id),
    onSuccess: ok("Renewal initiated"),
    onError: onErr("Could not initiate renewal"),
  });
  const autoRenewMut = useMutation({
    mutationFn: () => toggleAutoRenew(id),
    onSuccess: ok("Auto-renew updated"),
    onError: onErr("Could not update auto-renew"),
  });
  const governanceMut = useMutation({
    mutationFn: () =>
      updateContractGovernance(id, {
        ...governanceDraft,
        riskClassification: governanceDraft.riskClassification || undefined,
      }),
    onSuccess: () => {
      setGovernanceOpen(false);
      ok("Governance updated")();
    },
    onError: onErr("Could not update governance"),
  });
  const addCpMut = useMutation({
    mutationFn: () => addConditionPrecedent(id, cpForm),
    onSuccess: () => {
      setCpOpen(false);
      setCpForm({ label: "", detail: "" });
      ok("Condition precedent added")();
    },
    onError: onErr("Could not add condition"),
  });
  const toggleCpMut = useMutation({
    mutationFn: (vars: { conditionId: string; satisfied: boolean }) =>
      setConditionPrecedentSatisfied(id, vars.conditionId, vars.satisfied),
    onSuccess: invalidate,
    onError: onErr("Could not update condition"),
  });
  const setChainMut = useMutation({
    mutationFn: () =>
      setApprovalChain(
        id,
        chainDraft.filter((s) => s.name.trim() && s.role.trim()),
      ),
    onSuccess: () => {
      setChainSetupOpen(false);
      ok("Approval chain set")();
    },
    onError: onErr("Could not set approval chain"),
  });
  const decideStepMut = useMutation({
    mutationFn: (vars: { stepId: string; decision: "Approved" | "Rejected" }) =>
      decideApprovalStep(id, vars.stepId, vars.decision),
    onSuccess: invalidate,
    onError: onErr("Could not record decision"),
  });

  // ── Local state ─────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [bodyDraft, setBodyDraft] = useState("");
  const [trackChanges, setTrackChanges] = useState(true);
  const [signerName, setSignerName] = useState("");
  const [countersignOpen, setCountersignOpen] = useState(false);
  const [executeOpen, setExecuteOpen] = useState(false);
  const [executeForm, setExecuteForm] = useState({
    executedOn: today(),
    effectiveOn: today(),
  });
  const [roundOpen, setRoundOpen] = useState(false);
  const [roundForm, setRoundForm] = useState({
    by: "",
    at: today(),
    summary: "",
  });
  const [roundChanges, setRoundChanges] = useState([{ ...emptyChangeRow }]);
  const [amendOpen, setAmendOpen] = useState(false);
  const [amendForm, setAmendForm] = useState({
    ref: "",
    at: today(),
    summary: "",
  });
  const [obOpen, setObOpen] = useState(false);
  const [obForm, setObForm] = useState<{
    label: string;
    due: string;
    type: ObligationType;
    leadDays: number;
  }>({ label: "", due: today(), type: "Deliverable", leadDays: 14 });

  const [governanceOpen, setGovernanceOpen] = useState(false);
  const [governanceDraft, setGovernanceDraft] = useState({
    governingLaw: "",
    adrClause: "",
    leadDrafterUserId: "",
    leadDrafterName: "",
    noticeDays: 60,
    conflictCheckStatus: "Pending" as "Pending" | "Clear" | "Flagged",
    riskClassification: "" as "" | "Low" | "Medium" | "High",
  });
  const [cpOpen, setCpOpen] = useState(false);
  const [cpForm, setCpForm] = useState({ label: "", detail: "" });
  const [chainSetupOpen, setChainSetupOpen] = useState(false);
  const [chainDraft, setChainDraft] = useState<
    { userId?: string; name: string; role: string }[]
  >([{ name: "", role: "" }]);

  const outline = useMemo(
    () => outlineFrom(contract?.renderedBody ?? ""),
    [contract?.renderedBody],
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !contract) {
    return (
      <Card className="mx-auto mt-10 max-w-md">
        <CardContent className="space-y-3 p-8 text-center">
          <p className="font-semibold">Contract not found</p>
          <Button variant="outline" onClick={() => navigate("/crm/contracts")}>
            Back to contracts
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Real, derived data — replaces every mock computation ──
  const cps = contract.conditionsPrecedent;
  const cpsDone = cps.filter((c) => c.satisfied).length;
  const chain = contract.approvalChain;
  const allChanges = contract.rounds.flatMap((r) =>
    r.changes.map((c) => ({ ...c, roundId: r._id })),
  );
  const pending = allChanges.filter((c) => c.status === "Pending").length;
  const accepted = allChanges.filter((c) => c.status === "Accepted").length;
  const rejected = allChanges.filter((c) => c.status === "Rejected").length;
  const comments = contract.interactions.filter(
    (i) => i.type === "comment" || i.type === "tenant_response",
  );
  const stageIndex = CONTRACT_STAGES.indexOf(contract.stage);
  const currentVersion = contract.amendments.length + 1;
  // Real version history, derived from the template used at
  // generation and each real amendment since — no separate
  // versioning backend needed, this is just the amendment log read
  // as a version list.
  const versions = [
    {
      label: `v${currentVersion}`,
      title: "Current draft",
      meta: contract.amendments.length
        ? `After ${contract.amendments.length} amendment${contract.amendments.length === 1 ? "" : "s"}`
        : "No amendments yet",
    },
    ...contract.amendments
      .slice()
      .reverse()
      .map((a, i) => ({
        label: `v${contract.amendments.length - i}`,
        title: a.summary,
        meta: `${a.ref} · ${fmt(a.at)}`,
      })),
    {
      label: "v1",
      title: contract.templateName
        ? `Generated from ${contract.templateName}`
        : "Initial draft",
      meta: "",
    },
  ];

  const statusTone =
    contract.signatureStatus === "countersigned"
      ? "default"
      : contract.signatureStatus === "signed"
        ? "secondary"
        : contract.signatureStatus === "declined"
          ? "destructive"
          : "outline";

  const currentApprovalStep = chain.find((s) => s.status === "In review");

  return (
    <div className="space-y-4">
      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/crm/contracts" className="hover:text-foreground">
          Contracts
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">
          {contract.ref} · {contract.counterparty} · {contract.type}
        </span>
      </div>

      {/* ── Header ── */}
      <Card className="overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-primary to-secondary" />
        <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{contract.stage}</Badge>
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                {contract.type}
              </Badge>
              <Badge variant="secondary">v{currentVersion}</Badge>
              <Badge variant={statusTone as any}>
                {contract.signatureStatus.replace(/_/g, " ")}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {contract.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {contract.counterparty}
              {contract.mandateName ? ` · ${contract.mandateName}` : ""} ·{" "}
              {money(contract.value, contract.currency)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/crm/contracts")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Register
            </Button>
            <Button variant="outline" size="sm" disabled>
              <GitCompare className="mr-2 h-4 w-4" /> Compare
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={previewMut.isPending}
              onClick={() => previewMut.mutate()}
            >
              <Eye className="mr-2 h-4 w-4" /> Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={downloadMut.isPending}
              onClick={() => downloadMut.mutate()}
            >
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            {contract.stage !== "Expiry / Termination" && (
              <Button
                size="sm"
                className="bg-gradient-to-r from-primary to-secondary"
                disabled={advanceMut.isPending}
                onClick={() => advanceMut.mutate()}
              >
                Advance to {CONTRACT_STAGES[stageIndex + 1] ?? "next stage"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="editor">
        <TabsList className="flex-wrap">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="negotiation">
            Negotiation
            {pending > 0 && (
              <Badge className="ml-2 bg-warning/15 text-warning hover:bg-warning/15">
                {pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="execution">Execution</TabsTrigger>
          <TabsTrigger value="obligations">
            Obligations &amp; CPs
            <Badge variant="secondary" className="ml-2">
              {contract.obligations.length + cps.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="amendments">Amendments</TabsTrigger>
          <TabsTrigger value="renewals">Renewals</TabsTrigger>
          <TabsTrigger value="activity">
            Activity
            <Badge variant="secondary" className="ml-2">
              {contract.interactions.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ══ SETUP ══ */}
        <TabsContent value="setup" className="space-y-4 pt-4">
          <div>
            <h2 className="text-lg font-semibold">Contract setup</h2>
            <p className="text-sm text-muted-foreground">
              Metadata, parties, commercial terms and controls captured before
              drafting begins.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <SectionTitle icon={FileText}>Contract details</SectionTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <KV k="Reference" v={contract.ref} />
                <KV
                  k="Contract type"
                  v={<Badge variant="outline">{contract.type}</Badge>}
                />
                <KV
                  k="Related mandate"
                  v={
                    contract.mandateName ? (
                      <span className="text-primary">
                        {contract.mandateName}
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />
                <KV k="Value" v={money(contract.value, contract.currency)} />
                <KV k="Stage" v={<Badge>{contract.stage}</Badge>} />
                <KV
                  k="Template used"
                  v={contract.templateName ?? "Free-form"}
                />
                <KV k="Governing law" v={contract.governingLaw || "Not set"} />
                <KV
                  k="ADR clause"
                  v={
                    contract.adrClause ? (
                      <Badge className="bg-success/10 text-success hover:bg-success/10">
                        {contract.adrClause}
                      </Badge>
                    ) : (
                      "Not set"
                    )
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <SectionTitle icon={Users}>Parties</SectionTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {contract.counterparty}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {contract.counterpartyRegistrationNumber
                        ? `Reg. ${contract.counterpartyRegistrationNumber}`
                        : "External party — not a registered client"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {contract.counterpartyEmail || "—"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    First party
                  </Badge>
                </div>
                <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {contract.tenantBusinessName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {contract.tenantSignature
                        ? `Countersigned by ${contract.tenantSignature.signerName}`
                        : "Not yet countersigned"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    Second party
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <SectionTitle icon={CalendarClock}>Key dates</SectionTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <KV k="Executed on" v={fmt(contract.executedOn)} />
                <KV k="Effective from" v={fmt(contract.effectiveOn)} />
                <KV
                  k="Expiry"
                  v={
                    <span
                      className={
                        daysTo(contract.expiresOn) <= 60 ? "text-warning" : ""
                      }
                    >
                      {fmt(contract.expiresOn)} ({daysTo(contract.expiresOn)}d)
                    </span>
                  }
                />
                <KV
                  k="Renewal type"
                  v={
                    contract.autoRenew
                      ? `Auto-renew · ${contract.noticeDays}-day notice`
                      : `Manual renewal · ${contract.noticeDays}-day notice`
                  }
                />
                <KV k="Owner" v={contract.owner || "—"} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <SectionTitle icon={ShieldCheck}>
                  Internal controls
                </SectionTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setGovernanceDraft({
                      governingLaw: contract.governingLaw,
                      adrClause: contract.adrClause,
                      leadDrafterUserId: contract.leadDrafterUserId ?? "",
                      leadDrafterName: contract.leadDrafterName,
                      noticeDays: contract.noticeDays,
                      conflictCheckStatus: contract.conflictCheckStatus,
                      riskClassification: contract.riskClassification ?? "",
                    });
                    setGovernanceOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                <KV
                  k="Lead drafter"
                  v={contract.leadDrafterName || "Not assigned"}
                />
                <KV
                  k="Approval chain"
                  v={
                    chain.length
                      ? chain.map((s) => s.name).join(" → ")
                      : "Not set"
                  }
                />
                <KV
                  k="Conflict check"
                  v={
                    <Badge
                      className={
                        contract.conflictCheckStatus === "Clear"
                          ? "bg-success/10 text-success hover:bg-success/10"
                          : contract.conflictCheckStatus === "Flagged"
                            ? "bg-destructive/10 text-destructive hover:bg-destructive/10"
                            : "bg-muted text-muted-foreground"
                      }
                    >
                      {contract.conflictCheckStatus}
                    </Badge>
                  }
                />
                <KV
                  k="AML/KYC status"
                  v={
                    contract.counterpartyKycStatus ? (
                      <Badge className="bg-success/10 text-success hover:bg-success/10">
                        {contract.counterpartyKycStatus}
                      </Badge>
                    ) : (
                      "Not linked to a registered client"
                    )
                  }
                />
                <KV
                  k="Risk classification"
                  v={
                    contract.riskClassification ? (
                      <Badge className="bg-warning/10 text-warning hover:bg-warning/10">
                        {contract.riskClassification}
                      </Badge>
                    ) : (
                      "Not set"
                    )
                  }
                />
                <KV
                  k="Linked GRC risk"
                  v={
                    contract.linkedRisks.length ? (
                      <span className="text-primary">
                        {contract.linkedRisks.map((r) => r.title).join(", ")}
                      </span>
                    ) : (
                      "No linked risks"
                    )
                  }
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══ EDITOR ══ */}
        <TabsContent value="editor" className="pt-4">
          <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_320px]">
            {/* Contents + clause library */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                    Contents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 pt-0">
                  {outline.length ? (
                    outline.map((o, i) => (
                      <p
                        key={i}
                        className={`truncate rounded px-2 py-1 text-xs hover:bg-muted ${
                          o.sub ? "pl-5 text-muted-foreground" : "font-medium"
                        }`}
                      >
                        {o.label}
                      </p>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Numbered clauses appear here as the document is drafted.
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                    Clause library ({clauseLibrary.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {clauseLibrary.slice(0, 8).map((c) => (
                    <div
                      key={c._id}
                      className="rounded-md border bg-muted/40 px-2 py-1.5 text-xs"
                    >
                      <p className="font-medium">{c.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {c.category}
                        {c.approved && " · Approved"}
                      </p>
                    </div>
                  ))}
                  {!clauseLibrary.length && (
                    <p className="text-xs text-muted-foreground">
                      No clauses in the library yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Document */}
            <Card className="min-h-[520px]">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
                <SectionTitle icon={FileText}>Document</SectionTitle>
                <div className="flex gap-2">
                  {editing ? (
                    <>
                      <Button
                        size="sm"
                        disabled={editBodyMut.isPending}
                        onClick={() => editBodyMut.mutate(bodyDraft)}
                      >
                        Save draft
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(false)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setBodyDraft(contract.renderedBody ?? "");
                        setEditing(true);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" /> Edit content
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <RichTextEditor
                    value={bodyDraft}
                    onChange={setBodyDraft}
                    minHeight={420}
                  />
                ) : contract.renderedBody ? (
                  <div
                    className="prose prose-sm max-w-none rounded-md border bg-card p-6 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: contract.renderedBody }}
                  />
                ) : (
                  <p className="py-16 text-center text-sm text-muted-foreground">
                    No document body yet — generate from a template or add
                    content.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Side panel */}
            <div className="space-y-4">
              <Card>
                <CardContent className="flex items-center justify-between gap-2 p-3">
                  <span className="text-sm font-medium">Track changes</span>
                  <Switch
                    checked={trackChanges}
                    onCheckedChange={setTrackChanges}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                    comments ({comments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {comments.length ? (
                    comments.map((c, i) => (
                      <div key={i} className="rounded-md border p-2">
                        <p className="text-xs font-medium">
                          {c.actor === "signer" ? contract.counterparty : "You"}
                          <span className="ml-1 font-normal text-muted-foreground">
                            {new Date(c.occurredAt).toLocaleString()}
                          </span>
                        </p>
                        <p className="text-sm">{c.message}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No comments yet.
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                    Version history
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {versions.map((v) => (
                    <div key={v.label} className="text-xs">
                      <p className="font-semibold">
                        {v.label} · {v.title}
                      </p>
                      {v.meta && (
                        <p className="text-muted-foreground">{v.meta}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
              {/* <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                    Internal discussion
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <CommentThread
                    subject={contract._id}
                    subjectType="Contract"
                  />
                </CardContent>
              </Card> */}
            </div>
          </div>
        </TabsContent>

        {/* ══ NEGOTIATION ══ */}
        <TabsContent value="negotiation" className="space-y-4 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Negotiation</h2>
              <p className="text-sm text-muted-foreground">
                Rounds of redlines, counterparty positions and clause-level
                changes.
              </p>
            </div>
            <Button size="sm" onClick={() => setRoundOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add round
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Rounds", value: contract.rounds.length, tone: "" },
              { label: "Total changes", value: allChanges.length, tone: "" },
              { label: "Accepted", value: accepted, tone: "text-success" },
              { label: "Rejected", value: rejected, tone: "text-destructive" },
              { label: "Pending", value: pending, tone: "text-warning" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <p className={`text-2xl font-bold ${s.tone}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Progress
            value={(accepted / Math.max(allChanges.length, 1)) * 100}
            className="h-2"
          />

          {contract.rounds
            .slice()
            .reverse()
            .map((r) => (
              <Card key={r._id}>
                <CardHeader className="flex flex-row flex-wrap items-center gap-2 pb-2">
                  <Badge
                    variant={
                      r.round === contract.rounds.length
                        ? "default"
                        : "secondary"
                    }
                  >
                    Round {r.round}
                  </Badge>
                  <CardTitle className="flex-1 text-sm">{r.by}</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {fmt(r.at)} · {r.changes.length} change
                    {r.changes.length === 1 ? "" : "s"}
                  </span>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <p className="text-sm text-muted-foreground">{r.summary}</p>
                  {r.changes.map((c) => (
                    <div
                      key={c._id}
                      className="flex flex-wrap items-start gap-3 rounded-md border p-3"
                    >
                      <Badge className={changeStatusTone[c.status]}>
                        {c.status}
                      </Badge>
                      <div className="min-w-[240px] flex-1">
                        <p className="text-sm">
                          <span className="font-semibold">{c.clauseRef}:</span>{" "}
                          {c.change}
                        </p>
                        {c.note && (
                          <p className="text-xs text-muted-foreground">
                            {c.note}
                          </p>
                        )}
                      </div>
                      {c.status === "Pending" && (
                        <div className="flex shrink-0 gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={changeStatusMut.isPending}
                            onClick={() =>
                              changeStatusMut.mutate({
                                roundId: r._id,
                                changeId: c._id,
                                status: "Accepted",
                              })
                            }
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={changeStatusMut.isPending}
                            onClick={() =>
                              changeStatusMut.mutate({
                                roundId: r._id,
                                changeId: c._id,
                                status: "Rejected",
                              })
                            }
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          {!contract.rounds.length && (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                No negotiation rounds logged yet.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ══ APPROVALS ══ */}
        <TabsContent value="approvals" className="space-y-4 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Approval chain</h2>
              <p className="text-sm text-muted-foreground">
                Sequential internal approvals before the contract goes out for
                execution.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setChainDraft(
                  chain.length
                    ? chain.map((s) => ({
                        userId: s.userId ?? undefined,
                        name: s.name,
                        role: s.role,
                      }))
                    : [{ name: "", role: "" }],
                );
                setChainSetupOpen(true);
              }}
            >
              {chain.length ? "Restart chain" : "Set up chain"}
            </Button>
          </div>
          {pending > 0 && (
            <Card className="border-warning/40 bg-warning/5">
              <CardContent className="flex items-center gap-3 p-4 text-sm">
                <Flag className="h-4 w-4 text-warning" />
                {pending} pending negotiation change{pending === 1 ? "" : "s"}{" "}
                still open — worth resolving before approvals complete.
              </CardContent>
            </Card>
          )}
          <div className="grid gap-3 md:grid-cols-3">
            {chain.map((a) => (
              <Card key={a._id}>
                <CardContent className="space-y-2 p-4 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {a.name
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((w) => w[0]?.toUpperCase())
                      .join("")}
                  </div>
                  <p className="text-sm font-semibold">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.role}</p>
                  <Badge className={approvalStatusTone[a.status]}>
                    {a.status}
                  </Badge>
                  {a.decidedAt && (
                    <p className="text-xs text-muted-foreground">
                      {fmt(a.decidedAt)}
                    </p>
                  )}
                  {a.status === "In review" && (
                    <div className="flex justify-center gap-1.5 pt-1">
                      <Button
                        size="sm"
                        disabled={decideStepMut.isPending}
                        onClick={() =>
                          decideStepMut.mutate({
                            stepId: a._id,
                            decision: "Approved",
                          })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={decideStepMut.isPending}
                        onClick={() =>
                          decideStepMut.mutate({
                            stepId: a._id,
                            decision: "Rejected",
                          })
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {!chain.length && (
              <Card className="border-dashed md:col-span-3">
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  No approval chain set up yet.
                </CardContent>
              </Card>
            )}
          </div>
          <Card>
            <CardHeader className="pb-2">
              <SectionTitle icon={ShieldCheck}>
                Approval requirements
              </SectionTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <KV
                k="Pre-conditions"
                v={
                  pending
                    ? `${pending} pending changes to resolve`
                    : "All negotiation changes resolved"
                }
              />
              <KV k="Conflict check" v={contract.conflictCheckStatus} />
              <KV
                k="AML/KYC"
                v={
                  contract.counterpartyKycStatus ??
                  "Not linked to a registered client"
                }
              />
              <KV
                k="Currently awaiting"
                v={
                  currentApprovalStep
                    ? `${currentApprovalStep.name} (${currentApprovalStep.role})`
                    : "—"
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ EXECUTION ══ */}
        <TabsContent value="execution" className="space-y-4 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Execution &amp; signing</h2>
              <p className="text-sm text-muted-foreground">
                Signature workflow and conditions precedent.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(contract.signatureStatus === "not_sent" ||
                contract.signatureStatus === "sent") && (
                <Button
                  size="sm"
                  disabled={sendMut.isPending}
                  onClick={() => sendMut.mutate()}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {contract.signatureStatus === "sent"
                    ? "Resend for signature"
                    : "Send for signature"}
                </Button>
              )}
              {contract.signatureStatus === "signed" && (
                <Button
                  size="sm"
                  onClick={() => {
                    setSignerName("");
                    setCountersignOpen(true);
                  }}
                >
                  <PenTool className="mr-2 h-4 w-4" /> Countersign
                </Button>
              )}
              {contract.signatureStatus === "countersigned" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={signedCopyMut.isPending}
                  onClick={() => signedCopyMut.mutate()}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {contract.signedCopySentAt
                    ? "Resend signed copy"
                    : "Email signed copy"}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setExecuteOpen(true)}
              >
                <FileSignature className="mr-2 h-4 w-4" /> Record execution
              </Button>
            </div>
          </div>

          {/* Stepper */}
          <Card>
            <CardContent className="flex flex-wrap gap-2 p-4">
              {[
                { label: "Draft finalised", done: stageIndex >= 1 },
                {
                  label: "Internal approval",
                  done:
                    chain.length > 0 &&
                    chain.every((s) => s.status === "Approved"),
                },
                {
                  label: "CPs satisfied",
                  done: cps.length > 0 && cpsDone === cps.length,
                },
                {
                  label: "Counterparty signs",
                  done:
                    contract.signatureStatus === "signed" ||
                    contract.signatureStatus === "countersigned",
                },
                {
                  label: "We countersign",
                  done: contract.signatureStatus === "countersigned",
                },
                { label: "Effective", done: !!contract.effectiveOn },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
                    s.done
                      ? "border-success/40 bg-success/10 text-success"
                      : "text-muted-foreground"
                  }`}
                >
                  {s.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Clock className="h-3.5 w-3.5" />
                  )}
                  {s.label}
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <SectionTitle icon={PenTool}>Signatories</SectionTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {contract.signature?.signerName ?? contract.counterparty}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      First party · {contract.counterpartyEmail || "—"}
                    </p>
                  </div>
                  <Badge
                    className={
                      contract.signature
                        ? "bg-success/10 text-success hover:bg-success/10"
                        : "bg-warning/10 text-warning hover:bg-warning/10"
                    }
                  >
                    {contract.signature
                      ? `Signed ${fmt(contract.signature.signedAt)}`
                      : "Pending"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {contract.tenantSignature?.signerName ??
                        contract.tenantBusinessName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Second party · countersignature
                    </p>
                  </div>
                  <Badge
                    className={
                      contract.tenantSignature
                        ? "bg-success/10 text-success hover:bg-success/10"
                        : "bg-warning/10 text-warning hover:bg-warning/10"
                    }
                  >
                    {contract.tenantSignature
                      ? `Countersigned ${fmt(contract.tenantSignature.signedAt)}`
                      : "Pending"}
                  </Badge>
                </div>
                {contract.declinedAt && (
                  <p className="text-xs text-destructive">
                    Declined {fmt(contract.declinedAt)} ·{" "}
                    {contract.declineReason || "no reason given"}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Sequential: the counterparty signs first, we countersign.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <SectionTitle icon={Flag}>
                  Conditions precedent ({cpsDone}/{cps.length})
                </SectionTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCpOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {cps.length > 0 && (
                  <Progress
                    value={(cpsDone / cps.length) * 100}
                    className="h-2"
                  />
                )}
                {cps.map((c) => (
                  <label key={c._id} className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        toggleCpMut.mutate({
                          conditionId: c._id,
                          satisfied: !c.satisfied,
                        })
                      }
                      className="mt-0.5 shrink-0"
                    >
                      {c.satisfied ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Clock className="h-4 w-4 text-warning" />
                      )}
                    </button>
                    <div>
                      <p className="text-sm font-medium">{c.label}</p>
                      {c.detail && (
                        <p className="text-xs text-muted-foreground">
                          {c.detail}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
                {!cps.length && (
                  <p className="text-sm text-muted-foreground">
                    No conditions precedent recorded.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══ OBLIGATIONS ══ */}
        <TabsContent value="obligations" className="space-y-4 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                Obligations &amp; conditions
              </h2>
              <p className="text-sm text-muted-foreground">
                Ongoing obligations and conditions precedent.
              </p>
            </div>
            <Button size="sm" onClick={() => setObOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add obligation
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <SectionTitle icon={Clock}>
                  Ongoing obligations ({contract.obligations.length})
                </SectionTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {contract.obligations.length ? (
                  contract.obligations.map((o) => (
                    <div
                      key={o._id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{o.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {o.type} · due {fmt(o.due)} · {o.leadDays}d reminder
                        </p>
                      </div>
                      {o.done ? (
                        <Badge className="bg-success/10 text-success hover:bg-success/10">
                          Done {fmt(o.doneAt)}
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={obDoneMut.isPending}
                          onClick={() => obDoneMut.mutate(o._id)}
                        >
                          Mark done
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No obligations tracked yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <SectionTitle icon={Flag}>
                  Conditions precedent ({cpsDone}/{cps.length})
                </SectionTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCpOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {cps.length > 0 && (
                  <Progress
                    value={(cpsDone / cps.length) * 100}
                    className="h-2"
                  />
                )}
                {cps.map((c) => (
                  <label key={c._id} className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        toggleCpMut.mutate({
                          conditionId: c._id,
                          satisfied: !c.satisfied,
                        })
                      }
                      className="mt-0.5 shrink-0"
                    >
                      {c.satisfied ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Clock className="h-4 w-4 text-warning" />
                      )}
                    </button>
                    <div>
                      <p className="text-sm font-medium">{c.label}</p>
                      {c.detail && (
                        <p className="text-xs text-muted-foreground">
                          {c.detail}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
                {!cps.length && (
                  <p className="text-sm text-muted-foreground">
                    No conditions precedent recorded.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══ AMENDMENTS ══ */}
        <TabsContent value="amendments" className="space-y-4 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                Amendments &amp; variations
              </h2>
              <p className="text-sm text-muted-foreground">
                Formal changes to the executed contract.
              </p>
            </div>
            <Button size="sm" onClick={() => setAmendOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New amendment
            </Button>
          </div>
          {contract.amendments.length ? (
            <div className="space-y-2">
              {contract.amendments.map((a) => (
                <Card key={a._id}>
                  <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div>
                      <Badge variant="secondary">{a.ref}</Badge>
                      <p className="mt-1 text-sm font-medium">{a.summary}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {fmt(a.at)}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                No amendments yet. Amendments become meaningful once the
                contract is executed.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ══ RENEWALS ══ */}
        <TabsContent value="renewals" className="space-y-4 pt-4">
          <div>
            <h2 className="text-lg font-semibold">Renewals &amp; expiry</h2>
            <p className="text-sm text-muted-foreground">
              Term tracking, renewal reminders and expiry management.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <SectionTitle icon={CalendarClock}>Term details</SectionTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <KV
                  k="Term"
                  v={`${fmt(contract.effectiveOn)} → ${fmt(contract.expiresOn)}`}
                />
                <KV
                  k="Renewal type"
                  v={contract.autoRenew ? "Auto-renew" : "Manual renewal"}
                />
                <KV
                  k="Notice period"
                  v={`${contract.noticeDays} calendar days`}
                />
                <KV
                  k="Days to expiry"
                  v={
                    <span
                      className={
                        daysTo(contract.expiresOn) <= 60 ? "text-warning" : ""
                      }
                    >
                      {daysTo(contract.expiresOn)} days
                    </span>
                  }
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <SectionTitle icon={ArrowRight}>Actions</SectionTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm font-medium">Auto-renew</span>
                  <Switch
                    checked={contract.autoRenew}
                    onCheckedChange={() => autoRenewMut.mutate()}
                  />
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={renewalMut.isPending}
                  onClick={() => renewalMut.mutate()}
                >
                  Initiate renewal
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══ ACTIVITY ══ */}
        <TabsContent value="activity" className="pt-4">
          <Card>
            <CardHeader className="pb-2">
              <SectionTitle icon={MessageSquare}>Activity log</SectionTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {contract.interactions.length ? (
                [...contract.interactions].reverse().map((i, idx) => (
                  <div
                    key={idx}
                    className="flex gap-2 border-b border-border/60 pb-3 last:border-0"
                  >
                    <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {i.actor === "signer" ? contract.counterparty : "You"} —{" "}
                        {i.type.replace(/_/g, " ")}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {new Date(i.occurredAt).toLocaleString()}
                        </span>
                      </p>
                      {i.message && (
                        <p className="text-sm text-muted-foreground">
                          {i.message}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No activity recorded yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ── */}
      <Dialog open={countersignOpen} onOpenChange={setCountersignOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Countersign contract</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label>Signatory full name</Label>
            <Input
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              disabled={!signerName.trim() || countersignMut.isPending}
              onClick={() => countersignMut.mutate()}
            >
              Countersign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={executeOpen} onOpenChange={setExecuteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record execution</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Executed on</Label>
              <Input
                type="date"
                value={executeForm.executedOn}
                onChange={(e) =>
                  setExecuteForm({
                    ...executeForm,
                    executedOn: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Effective from</Label>
              <Input
                type="date"
                value={executeForm.effectiveOn}
                onChange={(e) =>
                  setExecuteForm({
                    ...executeForm,
                    effectiveOn: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={executeMut.isPending}
              onClick={() => executeMut.mutate()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={roundOpen} onOpenChange={setRoundOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add negotiation round</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Raised by</Label>
              <Input
                value={roundForm.by}
                placeholder="e.g. Counterparty counsel"
                onChange={(e) =>
                  setRoundForm({ ...roundForm, by: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={roundForm.at}
                onChange={(e) =>
                  setRoundForm({ ...roundForm, at: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Summary</Label>
              <Textarea
                rows={3}
                value={roundForm.summary}
                onChange={(e) =>
                  setRoundForm({ ...roundForm, summary: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Clause changes (optional)</Label>
              <div className="space-y-2">
                {roundChanges.map((c, i) => (
                  <div key={i} className="space-y-1.5 rounded-md border p-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Clause ref, e.g. cl. 5.1"
                        value={c.clauseRef}
                        onChange={(e) =>
                          setRoundChanges(
                            roundChanges.map((x, j) =>
                              j === i ? { ...x, clauseRef: e.target.value } : x,
                            ),
                          )
                        }
                      />
                      <Input
                        placeholder="What changed"
                        value={c.change}
                        onChange={(e) =>
                          setRoundChanges(
                            roundChanges.map((x, j) =>
                              j === i ? { ...x, change: e.target.value } : x,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Note (optional)"
                        value={c.note}
                        onChange={(e) =>
                          setRoundChanges(
                            roundChanges.map((x, j) =>
                              j === i ? { ...x, note: e.target.value } : x,
                            ),
                          )
                        }
                      />
                      {roundChanges.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setRoundChanges(
                              roundChanges.filter((_, j) => j !== i),
                            )
                          }
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setRoundChanges([...roundChanges, { ...emptyChangeRow }])
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add change
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !roundForm.by || !roundForm.summary || roundMut.isPending
              }
              onClick={() => roundMut.mutate()}
            >
              Log round
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={amendOpen} onOpenChange={setAmendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New amendment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Reference</Label>
              <Input
                value={amendForm.ref}
                placeholder="AMD-001"
                onChange={(e) =>
                  setAmendForm({ ...amendForm, ref: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={amendForm.at}
                onChange={(e) =>
                  setAmendForm({ ...amendForm, at: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Summary</Label>
              <Textarea
                rows={3}
                value={amendForm.summary}
                onChange={(e) =>
                  setAmendForm({ ...amendForm, summary: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !amendForm.ref || !amendForm.summary || amendMut.isPending
              }
              onClick={() => amendMut.mutate()}
            >
              Add amendment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={obOpen} onOpenChange={setObOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add obligation</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Label</Label>
              <Input
                value={obForm.label}
                onChange={(e) =>
                  setObForm({ ...obForm, label: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={obForm.type}
                  onValueChange={(v) =>
                    setObForm({ ...obForm, type: v as ObligationType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OBLIGATION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due</Label>
                <Input
                  type="date"
                  value={obForm.due}
                  onChange={(e) =>
                    setObForm({ ...obForm, due: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Reminder lead (days)</Label>
              <Input
                type="number"
                value={obForm.leadDays}
                onChange={(e) =>
                  setObForm({ ...obForm, leadDays: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!obForm.label || obligationMut.isPending}
              onClick={() => obligationMut.mutate()}
            >
              Add obligation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={governanceOpen} onOpenChange={setGovernanceOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit internal controls</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Governing law</Label>
                <Input
                  value={governanceDraft.governingLaw}
                  onChange={(e) =>
                    setGovernanceDraft({
                      ...governanceDraft,
                      governingLaw: e.target.value,
                    })
                  }
                  placeholder="e.g. Laws of Rwanda"
                />
              </div>
              <div>
                <Label>ADR clause</Label>
                <Input
                  value={governanceDraft.adrClause}
                  onChange={(e) =>
                    setGovernanceDraft({
                      ...governanceDraft,
                      adrClause: e.target.value,
                    })
                  }
                  placeholder="e.g. Mediation then arbitration"
                />
              </div>
            </div>
            <div>
              <Label>Lead drafter</Label>
              <Select
                value={governanceDraft.leadDrafterUserId || "none"}
                onValueChange={(v) => {
                  if (v === "none") {
                    setGovernanceDraft({
                      ...governanceDraft,
                      leadDrafterUserId: "",
                      leadDrafterName: "",
                    });
                    return;
                  }
                  const emp = employees.find((e) => e._id === v);
                  setGovernanceDraft({
                    ...governanceDraft,
                    leadDrafterUserId: v,
                    leadDrafterName: emp
                      ? `${emp.firstName} ${emp.lastName}`
                      : "",
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not assigned</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e._id} value={e._id}>
                      {e.firstName} {e.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Notice days</Label>
                <Input
                  type="number"
                  value={governanceDraft.noticeDays}
                  onChange={(e) =>
                    setGovernanceDraft({
                      ...governanceDraft,
                      noticeDays: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Conflict check</Label>
                <Select
                  value={governanceDraft.conflictCheckStatus}
                  onValueChange={(v) =>
                    setGovernanceDraft({
                      ...governanceDraft,
                      conflictCheckStatus: v as any,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Clear">Clear</SelectItem>
                    <SelectItem value="Flagged">Flagged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Risk classification</Label>
              <Select
                value={governanceDraft.riskClassification || "none"}
                onValueChange={(v) =>
                  setGovernanceDraft({
                    ...governanceDraft,
                    riskClassification: v === "none" ? "" : (v as any),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={governanceMut.isPending}
              onClick={() => governanceMut.mutate()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cpOpen} onOpenChange={setCpOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add condition precedent</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Label</Label>
              <Input
                value={cpForm.label}
                onChange={(e) =>
                  setCpForm({ ...cpForm, label: e.target.value })
                }
                placeholder="e.g. AML/KYC verification"
              />
            </div>
            <div>
              <Label>Detail (optional)</Label>
              <Textarea
                value={cpForm.detail}
                onChange={(e) =>
                  setCpForm({ ...cpForm, detail: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!cpForm.label.trim() || addCpMut.isPending}
              onClick={() => addCpMut.mutate()}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={chainSetupOpen} onOpenChange={setChainSetupOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {chain.length
                ? "Restart approval chain"
                : "Set up approval chain"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            The first step becomes "In review" immediately; every step resets.
          </p>
          <div className="space-y-2">
            {chainDraft.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Select
                  value={s.userId || "custom"}
                  onValueChange={(v) => {
                    if (v === "custom") return;
                    const emp = employees.find((e) => e._id === v);
                    setChainDraft(
                      chainDraft.map((x, j) =>
                        j === i
                          ? {
                              ...x,
                              userId: v,
                              name: emp
                                ? `${emp.firstName} ${emp.lastName}`
                                : x.name,
                            }
                          : x,
                      ),
                    );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Employee (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Type name manually</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e._id} value={e._id}>
                        {e.firstName} {e.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Name"
                  value={s.name}
                  onChange={(e) =>
                    setChainDraft(
                      chainDraft.map((x, j) =>
                        j === i ? { ...x, name: e.target.value } : x,
                      ),
                    )
                  }
                />
                <Input
                  placeholder="Role"
                  value={s.role}
                  onChange={(e) =>
                    setChainDraft(
                      chainDraft.map((x, j) =>
                        j === i ? { ...x, role: e.target.value } : x,
                      ),
                    )
                  }
                />
                {chainDraft.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="col-span-3 justify-self-end"
                    onClick={() =>
                      setChainDraft(chainDraft.filter((_, j) => j !== i))
                    }
                  >
                    Remove step
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setChainDraft([...chainDraft, { name: "", role: "" }])
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add step
            </Button>
          </div>
          <DialogFooter>
            <Button
              disabled={setChainMut.isPending}
              onClick={() => setChainMut.mutate()}
            >
              Save chain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
