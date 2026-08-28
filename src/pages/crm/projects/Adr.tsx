import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  Plus,
  ArrowLeft,
  ArrowRight,

  Gavel,
  Handshake,
  Calendar as CalendarIcon,
  Clock,
  TrendingUp,
  DollarSign,
  Scale,
  AlertTriangle,
  Users,
  CheckCircle2,
  FileWarning,
  RefreshCw,
  Ban,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchMandates } from "@/lib/crm/mandates-api";
import {
  fetchAdrCases,
  fetchAdrCase,
  createAdrCase,
  setAdrStage,
  addAdrSession,
  updateAdrSession,
  recordAdrSettlement,
  recordAdrOutcome,
  restartAdrAsType,
  withdrawAdrCase,
  addAdrTimelineEntry,
  addAdrChecklistItem,
  setAdrChecklistItemDone,
  addAdrDisbursement,
  escalateAdrToLitigation,
  ADR_STAGES,
  ADR_STAGE_TASKS,
  ADR_TYPES,
  ADR_PARTY_ROLES,
  DISBURSEMENT_CATEGORIES,
  type AdrCase,
  type AdrStage,
  type AdrType,
  type SessionMode,
  type AdrPartyRole,
} from "@/lib/crm/adr-api";
import { mockDeadlineRules } from "@/data/caseDetailMock";
import {
  CaseTemplatesLibrary,
  CaseReportsPanel,
} from "@/components/crm/case/CaseListTabs";
import {
  CaseCommunicationsTab,
  CaseDraftingTab,
  CaseDocumentsTab,
  CaseDeadlineRulesTab,
  CaseTimeBillingTab,
  CaseAuditAccessTab,
} from "@/components/crm/case/CaseTabs";


const money = (n: number, c = "USD") =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: c,
    maximumFractionDigits: 0,
  });

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

const daysFrom = (a: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(a).getTime()) / 86_400_000));
const daysUntil = (a: string) =>
  Math.ceil((new Date(a).getTime() - Date.now()) / 86_400_000);

const stageTone: Record<AdrStage, string> = {
  Intake: "bg-slate-100 text-slate-700 border-slate-200",
  Notice: "bg-blue-100 text-blue-700 border-blue-200",
  Discovery: "bg-violet-100 text-violet-700 border-violet-200",
  Preparation: "bg-amber-100 text-amber-700 border-amber-200",
  Hearing: "bg-rose-100 text-rose-700 border-rose-200",
  Resolution: "bg-emerald-100 text-emerald-700 border-emerald-200",
};
const statusTone: Record<string, string> = {
  Active: "bg-primary/10 text-primary border-primary/20",
  Resolved: "bg-success/10 text-success border-success/20",
  "Escalated to litigation":
    "bg-destructive/10 text-destructive border-destructive/20",
  Withdrawn: "bg-muted text-muted-foreground border-border",
};

const emptyParty = {
  name: "",
  role: "Claimant" as AdrPartyRole,
  organisation: "",
};

export default function Adr() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["adrCases"],
    queryFn: fetchAdrCases,
  });
  const { data: mandates = [] } = useQuery({
    queryKey: ["adr-mandates"],
    queryFn: fetchMandates,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: detail } = useQuery({
    queryKey: ["adrCase", selectedId],
    queryFn: () => fetchAdrCase(selectedId!),
    enabled: !!selectedId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["adrCases"] });
    if (selectedId)
      queryClient.invalidateQueries({ queryKey: ["adrCase", selectedId] });
  };

  // ── Kanban drag state ────────────────────────────────────
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<AdrStage | null>(null);

  // ── New case dialog ──────────────────────────────────────
  const [openNew, setOpenNew] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    type: ADR_TYPES[0],
    mandateId: "",
    claimValue: 0,
    category: "",
    venue: "",
    governingLaw: "",
    adrClause: "",
    escalationPath: "",
  });
  const [draftParties, setDraftParties] = useState([{ ...emptyParty }]);

  // ── Detail-view dialogs ──────────────────────────────────
  const [session, setSession] = useState({
    date: "",
    startTime: "",
    endTime: "",
    mode: "Physical" as SessionMode,
    venue: "",
  });
  const [sessionOpen, setSessionOpen] = useState(false);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [settlementDraft, setSettlementDraft] = useState({
    amount: 0,
    terms: "",
  });
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [outcomeDraft, setOutcomeDraft] = useState("");
  const [restartOpen, setRestartOpen] = useState(false);
  const [restartDraft, setRestartDraft] = useState({
    newType: ADR_TYPES[1],
    reason: "",
  });
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalateDraft, setEscalateDraft] = useState({
    reason: "",
    court: "",
    courtDivision: "",
    registry: "",
  });
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [checklistLabel, setChecklistLabel] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState({ title: "", description: "" });
  const [disbursementOpen, setDisbursementOpen] = useState(false);
  const [disbursementDraft, setDisbursementDraft] = useState({
    label: "",
    category: DISBURSEMENT_CATEGORIES[0],
    amount: 0,
  });

  // ── Mutations ─────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: () =>
      createAdrCase({
        title: draft.title,
        type: draft.type,
        mandateId: draft.mandateId || undefined,
        claimValue: Number(draft.claimValue) || 0,
        category: draft.category,
        venue: draft.venue,
        governingLaw: draft.governingLaw,
        adrClause: draft.adrClause,
        escalationPath: draft.escalationPath,
        parties: draftParties.filter((p) => p.name.trim()),
      }),
    onSuccess: (c) => {
      invalidate();
      setOpenNew(false);
      setDraft({
        title: "",
        type: ADR_TYPES[0],
        mandateId: "",
        claimValue: 0,
        category: "",
        venue: "",
        governingLaw: "",
        adrClause: "",
        escalationPath: "",
      });
      setDraftParties([{ ...emptyParty }]);
      toast({ title: "Case filed", description: `${c.ref} · Stage: Intake` });
    },
    onError: onErr("Failed to file case"),
  });

  const stageMut = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: AdrStage }) =>
      setAdrStage(id, stage),
    onSuccess: invalidate,
    onError: onErr("Failed to update stage"),
  });

  const sessionMut = useMutation({
    mutationFn: () => addAdrSession(detail!._id, session),
    onSuccess: () => {
      invalidate();
      setSessionOpen(false);
      setSession({
        date: "",
        startTime: "",
        endTime: "",
        mode: "Physical",
        venue: "",
      });
      toast({ title: "Session scheduled" });
    },
    onError: onErr("Failed to schedule session"),
  });

  const sessionStatusMut = useMutation({
    mutationFn: ({
      sessionId,
      status,
      outcome,
    }: {
      sessionId: string;
      status: "Completed" | "Cancelled";
      outcome: string;
    }) => updateAdrSession(detail!._id, sessionId, { status, outcome }),
    onSuccess: invalidate,
    onError: onErr("Failed to update session"),
  });

  const settlementMut = useMutation({
    mutationFn: () =>
      recordAdrSettlement(
        detail!._id,
        Number(settlementDraft.amount),
        settlementDraft.terms,
      ),
    onSuccess: () => {
      invalidate();
      setSettlementOpen(false);
      setSettlementDraft({ amount: 0, terms: "" });
      toast({ title: "Settlement recorded" });
    },
    onError: onErr("Failed to record settlement"),
  });

  const outcomeMut = useMutation({
    mutationFn: () => recordAdrOutcome(detail!._id, outcomeDraft),
    onSuccess: () => {
      invalidate();
      setOutcomeOpen(false);
      setOutcomeDraft("");
      toast({ title: "Outcome recorded" });
    },
    onError: onErr("Failed to record outcome"),
  });

  const restartMut = useMutation({
    mutationFn: () =>
      restartAdrAsType(detail!._id, restartDraft.newType, restartDraft.reason),
    onSuccess: () => {
      invalidate();
      setRestartOpen(false);
      setRestartDraft({ newType: ADR_TYPES[1], reason: "" });
      toast({
        title: "Case restarted",
        description: "Back to Notice stage under the new ADR type.",
      });
    },
    onError: onErr("Failed to restart case"),
  });

  const escalateMut = useMutation({
    mutationFn: () => escalateAdrToLitigation(detail!._id, escalateDraft),
    onSuccess: (res) => {
      invalidate();
      setEscalateOpen(false);
      toast({
        title: "Escalated to litigation",
        description: res.litigationCase.ref,
      });
      navigate(`/crm/litigation/${res.litigationCase._id}`);
    },
    onError: onErr("Failed to escalate"),
  });

  const withdrawMut = useMutation({
    mutationFn: () => withdrawAdrCase(detail!._id, withdrawReason),
    onSuccess: () => {
      invalidate();
      setWithdrawOpen(false);
      setWithdrawReason("");
      toast({ title: "Case withdrawn" });
    },
    onError: onErr("Failed to withdraw case"),
  });

  const checklistAddMut = useMutation({
    mutationFn: () => addAdrChecklistItem(detail!._id, checklistLabel),
    onSuccess: () => {
      invalidate();
      setChecklistLabel("");
    },
    onError: onErr("Failed to add checklist item"),
  });
  const checklistToggleMut = useMutation({
    mutationFn: ({ itemId, done }: { itemId: string; done: boolean }) =>
      setAdrChecklistItemDone(detail!._id, itemId, done),
    onSuccess: invalidate,
    onError: onErr("Failed to update checklist"),
  });

  const noteMut = useMutation({
    mutationFn: () => addAdrTimelineEntry(detail!._id, noteDraft),
    onSuccess: () => {
      invalidate();
      setNoteOpen(false);
      setNoteDraft({ title: "", description: "" });
      toast({ title: "Note added to timeline" });
    },
    onError: onErr("Failed to add note"),
  });

  const disbursementMut = useMutation({
    mutationFn: () => addAdrDisbursement(detail!._id, disbursementDraft),
    onSuccess: () => {
      invalidate();
      setDisbursementOpen(false);
      setDisbursementDraft({
        label: "",
        category: DISBURSEMENT_CATEGORIES[0],
        amount: 0,
      });
      toast({ title: "Disbursement recorded" });
    },
    onError: onErr("Failed to record disbursement"),
  });

  // ── KPIs, real, computed from the real list ──────────────
  const active = list.filter((c) => c.status === "Active");
  const resolved = list.filter((c) => c.status === "Resolved");
  const closedTotal = list.filter((c) => c.status !== "Active");
  const typeBreakdown = Object.entries(
    active.reduce<Record<string, number>>((acc, c) => {
      acc[c.type] = (acc[c.type] ?? 0) + 1;
      return acc;
    }, {}),
  );
  const upcomingSessions = active
    .flatMap((c) =>
      (c.sessions ?? [])
        .filter((s) => s.status === "Scheduled")
        .map((s) => ({ ...s, case: c })),
    )
    .filter((s) => daysUntil(s.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const avgResolutionDays = resolved.length
    ? Math.round(
        resolved.reduce((s, c) => {
          const resolvedAt = c.settlement?.date ?? c.updatedAt;
          return (
            s +
            Math.max(
              0,
              Math.floor(
                (new Date(resolvedAt).getTime() -
                  new Date(c.filedOn).getTime()) /
                  86_400_000,
              ),
            )
          );
        }, 0) / resolved.length,
      )
    : 0;
  const resolutionRate = closedTotal.length
    ? Math.round((resolved.length / closedTotal.length) * 100)
    : 0;
  const claimAtStake = active.reduce((s, c) => s + c.claimValue, 0);

  const kpis = [
    {
      l: "Active cases",
      v: String(active.length),
      sub: typeBreakdown.map(([t, n]) => `${n} ${t}`).join(", ") || "None open",
      icon: Scale,
    },
    {
      l: "Upcoming sessions",
      v: String(upcomingSessions.length),
      sub: upcomingSessions[0]
        ? `Next ${upcomingSessions[0].date.slice(0, 10)}`
        : "None scheduled",
      icon: CalendarIcon,
    },
    {
      l: "Avg. resolution time",
      v: resolved.length ? `${avgResolutionDays} days` : "—",
      sub: `${resolved.length} resolved`,
      icon: Clock,
    },
    {
      l: "Resolution rate",
      v: closedTotal.length ? `${resolutionRate}%` : "—",
      sub: `${resolved.length} of ${closedTotal.length} closed`,
      icon: TrendingUp,
    },
    {
      l: "Claim value at stake",
      v: money(claimAtStake),
      sub: `Across ${active.length} active cases`,
      icon: DollarSign,
    },
  ];

  // ── Kanban grouping ───────────────────────────────────────
  const byStage: Record<AdrStage, AdrCase[]> = useMemo(() => {
    const m = {} as Record<AdrStage, AdrCase[]>;
    ADR_STAGES.forEach((s) => (m[s] = []));
    active.forEach((c) => m[c.stage]?.push(c));
    return m;
  }, [active]);

  const handleDrop = (stage: AdrStage) => {
    if (dragging) stageMut.mutate({ id: dragging, stage });
    setDragging(null);
    setDragOver(null);
  };

  // Every session across every case, for the Hearings tab.
  const allSessions = list
    .flatMap((c) => (c.sessions ?? []).map((s) => ({ ...s, case: c })))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  // Rule-driven deadlines across active cases (dummy rules until the
  // deadline-rules endpoint lands).
  const deadlineRows = active.flatMap((c) =>
    mockDeadlineRules(c._id).map((d) => ({
      ...d,
      key: `${c._id}-${d.id}`,
      caseId: c._id,
      caseRef: c.ref,
      caseTitle: c.title,
    })),
  );

  const caseTable = (rows: AdrCase[], empty: string) => (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Case</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Claim value</TableHead>
              <TableHead>Filed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow
                key={c._id}
                className="cursor-pointer"
                onClick={() => setSelectedId(c._id)}
              >
                <TableCell>
                  <p className="text-sm font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.ref}</p>
                </TableCell>
                <TableCell className="text-sm">{c.type}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={stageTone[c.stage]}>
                    {c.stage}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusTone[c.status]}>
                    {c.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {money(c.claimValue, c.currency)}
                </TableCell>
                <TableCell className="text-sm">
                  {c.filedOn?.slice(0, 10)}
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  {empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );


  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Loading cases…
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // DETAIL VIEW
  // ═══════════════════════════════════════════════════════════
  if (selectedId && detail) {
    const c = detail;
    const nextSession = (c.sessions ?? [])
      .filter((s) => s.status === "Scheduled")
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    const canAct = c.status === "Active";
    const stageIdx = ADR_STAGES.indexOf(c.stage);
    const nextStage = ADR_STAGES[stageIdx + 1];

    const sessionsCard = (
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Sessions</CardTitle>
          {canAct && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSessionOpen(true)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Schedule
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {(c.sessions ?? []).map((s) => (
            <div key={s._id} className="rounded border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {s.date?.slice(0, 10)}
                  {s.startTime && ` · ${s.startTime}`}
                  {s.endTime && `–${s.endTime}`}
                </p>
                <Badge variant="outline">{s.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {s.mode}
                {s.venue && ` · ${s.venue}`}
              </p>
              {s.outcome && <p className="mt-1 text-xs">{s.outcome}</p>}
            </div>
          ))}
          {!(c.sessions ?? []).length && (
            <p className="text-sm text-muted-foreground">
              No sessions scheduled.
            </p>
          )}
        </CardContent>
      </Card>
    );

    const disbursementsCard = (
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Disbursements</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDisbursementOpen(true)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {c.disbursements.map((d) => (
            <div
              key={d._id}
              className="flex items-center justify-between rounded border p-2.5 text-sm"
            >
              <div>
                <p className="font-medium">{d.label}</p>
                <p className="text-xs text-muted-foreground">
                  {d.category} · {d.date?.slice(0, 10)}
                </p>
              </div>
              <p className="font-medium">{money(d.amount, d.currency)}</p>
            </div>
          ))}
          {!c.disbursements.length && (
            <p className="text-sm text-muted-foreground">
              No disbursements recorded.
            </p>
          )}
        </CardContent>
      </Card>
    );


    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to cases
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{c.title}</h1>
              <Badge variant="outline" className={stageTone[c.stage]}>
                {c.stage}
              </Badge>
              <Badge variant="outline" className={statusTone[c.status]}>
                {c.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {c.ref} · {c.type}
              {c.mandateName && ` · Mandate: ${c.mandateName}`}
              {c.category && ` · ${c.category}`}
            </p>
          </div>
          {canAct && (
            <div className="flex flex-wrap items-center gap-2">
              {nextStage && (
                <Button
                  size="sm"
                  disabled={stageMut.isPending}
                  onClick={() =>
                    stageMut.mutate({ id: c._id, stage: nextStage })
                  }
                >
                  Advance to {nextStage}{" "}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSettlementDraft({ amount: 0, terms: "" });
                  setSettlementOpen(true);
                }}
              >
                <Handshake className="mr-2 h-4 w-4" /> Record settlement
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setOutcomeDraft("");
                  setOutcomeOpen(true);
                }}
              >
                <Gavel className="mr-2 h-4 w-4" /> Record award
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRestartDraft({
                    newType:
                      ADR_TYPES.find((t) => t !== c.type) ?? ADR_TYPES[1],
                    reason: "",
                  });
                  setRestartOpen(true);
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Restart as different type
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setEscalateDraft({
                    reason: "",
                    court: "",
                    courtDivision: "",
                    registry: "",
                  });
                  setEscalateOpen(true);
                }}
              >
                <FileWarning className="mr-2 h-4 w-4" /> Escalate to litigation
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => {
                  setWithdrawReason("");
                  setWithdrawOpen(true);
                }}
              >
                <Ban className="mr-2 h-4 w-4" /> Withdraw
              </Button>
            </div>
          )}
          {c.status === "Escalated to litigation" && c.litigationCaseId && (
            <Button
              onClick={() => navigate(`/crm/litigation/${c.litigationCaseId}`)}
            >
              <FileWarning className="mr-2 h-4 w-4" /> View litigation case
            </Button>
          )}
        </div>

        {c.settlement && (
          <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-sm">
            <span className="font-medium">Settled</span> at{" "}
            {money(c.settlement.amount, c.currency)} on{" "}
            {c.settlement.date?.slice(0, 10)}
            {c.settlement.terms && ` — ${c.settlement.terms}`}
          </div>
        )}
        {c.outcome && (
          <div className="rounded-lg border p-3 text-sm">
            <span className="font-medium">Award / outcome:</span> {c.outcome}
          </div>
        )}

        <Tabs defaultValue="overview">
          <TabsList className="flex w-full flex-wrap justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
            <TabsTrigger value="drafting">Drafting</TabsTrigger>
            <TabsTrigger value="hearings">Hearings &amp; sessions</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="deadlines">Deadline rules</TabsTrigger>
            <TabsTrigger value="billing">Time &amp; billing</TabsTrigger>
            <TabsTrigger value="resolution">Resolution</TabsTrigger>
            <TabsTrigger value="audit">Audit &amp; access</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="pt-4">
        <div className="grid gap-4 lg:grid-cols-3">
          {/* ── Main column: timeline ──────────────────────── */}
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Case timeline</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setNoteOpen(true)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add note
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-0">
                  {[...c.timeline].reverse().map((t, i) => (
                    <div
                      key={t._id}
                      className="relative flex gap-3 pb-6 last:pb-0"
                    >
                      {i < c.timeline.length - 1 && (
                        <div className="absolute left-[5px] top-3 h-full w-px bg-border" />
                      )}
                      <div
                        className={`relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                          t.source === "System"
                            ? "bg-primary"
                            : "bg-muted-foreground"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <p className="text-xs text-muted-foreground">
                            {new Date(t.at).toLocaleDateString(undefined, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                          {t.source === "Manual" && (
                            <Badge variant="outline" className="text-[10px]">
                              Note
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">{t.title}</p>
                        {t.description && (
                          <p className="text-xs text-muted-foreground">
                            {t.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {!c.timeline.length && (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No activity recorded yet.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Sidebar ─────────────────────────────────────── */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Case details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  ["Type", c.type],
                  ["Category", c.category || "—"],
                  ["Claim value", money(c.claimValue, c.currency)],
                  [
                    "Settlement target",
                    c.settlementTargetMin != null
                      ? `${money(c.settlementTargetMin, c.currency)} – ${money(c.settlementTargetMax ?? c.settlementTargetMin, c.currency)}`
                      : "—",
                  ],
                  ["ADR venue", c.venue || "—"],
                  ["Governing law", c.governingLaw || "—"],
                  ["ADR clause", c.adrClause || "—"],
                  ["If this fails", c.escalationPath || "—"],
                  [
                    "Case age",
                    `${c.totals?.ageDays ?? daysFrom(c.filedOn)} days`,
                  ],
                  [
                    "Hours logged",
                    `${(c.totals?.hours ?? 0).toFixed(1)} hrs (${money(c.totals?.fees ?? 0, c.currency)})`,
                  ],
                  [
                    "Disbursements",
                    money(c.totals?.disbursed ?? 0, c.currency),
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-right font-medium">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {nextSession && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-1.5 text-base">
                    <CalendarIcon className="h-4 w-4" /> Upcoming
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{c.type} session</p>
                      <p className="text-xs text-muted-foreground">
                        {nextSession.venue ||
                          (nextSession.mode === "Virtual" ? "Virtual" : "—")}
                        {nextSession.startTime &&
                          ` · ${nextSession.startTime}${nextSession.endTime ? `–${nextSession.endTime}` : ""}`}
                      </p>
                    </div>
                    <Badge className="bg-primary text-primary-foreground">
                      {daysUntil(nextSession.date)}d
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Prep checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {c.checklist.map((item) => (
                  <label
                    key={item._id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={item.done}
                      onCheckedChange={(checked) =>
                        checklistToggleMut.mutate({
                          itemId: item._id,
                          done: !!checked,
                        })
                      }
                    />
                    <span
                      className={
                        item.done ? "text-muted-foreground line-through" : ""
                      }
                    >
                      {item.label}
                    </span>
                  </label>
                ))}
                {!c.checklist.length && (
                  <p className="text-sm text-muted-foreground">
                    No checklist items yet.
                  </p>
                )}
                <div className="flex gap-1.5 pt-1">
                  <Input
                    placeholder="Add item…"
                    value={checklistLabel}
                    onChange={(e) => setChecklistLabel(e.target.value)}
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && checklistLabel.trim())
                        checklistAddMut.mutate();
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      !checklistLabel.trim() || checklistAddMut.isPending
                    }
                    onClick={() => checklistAddMut.mutate()}
                  >
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1.5 text-base">
                  <Users className="h-4 w-4" /> Parties
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {c.parties.map((p) => (
                  <div key={p._id} className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(p.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.organisation || "—"}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {p.role}
                    </Badge>
                  </div>
                ))}
                {c.neutral && (
                  <div className="flex items-center gap-2.5 border-t pt-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {initials(c.neutral)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {c.neutral}
                      </p>
                      <p className="text-xs text-muted-foreground">Neutral</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        </TabsContent>

        <TabsContent value="communications" className="pt-4">
          <CaseCommunicationsTab caseId={c._id} />
        </TabsContent>
        <TabsContent value="drafting" className="pt-4">
          <CaseDraftingTab />
        </TabsContent>
        <TabsContent value="hearings" className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">
            Every {c.type.toLowerCase()} session for this case, past and
            upcoming, with its own scheduling, logistics and outcome.
          </p>
          {sessionsCard}
        </TabsContent>
        <TabsContent value="documents" className="pt-4">
          <CaseDocumentsTab caseId={c._id} />
        </TabsContent>
        <TabsContent value="deadlines" className="pt-4">
          <CaseDeadlineRulesTab caseId={c._id} />
        </TabsContent>
        <TabsContent value="billing" className="space-y-4 pt-4">
          <CaseTimeBillingTab
            hours={`${(c.totals?.hours ?? 0).toFixed(1)} hrs`}
            fees={money(c.totals?.fees ?? 0, c.currency)}
            disbursed={money(c.totals?.disbursed ?? 0, c.currency)}
          />
          {disbursementsCard}
        </TabsContent>
        <TabsContent value="resolution" className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">
            How this case ends, and the closure report that archives it.
            Nothing here is final until you submit — the case stays active and
            editable until then.
          </p>
          <div className="grid gap-3 lg:grid-cols-3">
            <button
              disabled={!canAct}
              onClick={() => {
                setSettlementDraft({ amount: 0, terms: "" });
                setSettlementOpen(true);
              }}
              className="rounded-lg border p-4 text-left transition-colors hover:border-primary disabled:opacity-60"
            >
              <p className="text-sm font-semibold">Settled at {c.type}</p>
              <p className="text-xs text-muted-foreground">
                Terms agreed by both parties, recorded in a settlement deed.
              </p>
            </button>
            <button
              disabled={!canAct}
              onClick={() => {
                setEscalateDraft({
                  reason: "",
                  court: "",
                  courtDivision: "",
                  registry: "",
                });
                setEscalateOpen(true);
              }}
              className="rounded-lg border p-4 text-left transition-colors hover:border-primary disabled:opacity-60"
            >
              <p className="text-sm font-semibold">Escalated to litigation</p>
              <p className="text-xs text-muted-foreground">
                No settlement reached; case proceeds under{" "}
                {c.adrClause || "the ADR clause"}.
              </p>
            </button>
            <button
              disabled={!canAct}
              onClick={() => {
                setWithdrawReason("");
                setWithdrawOpen(true);
              }}
              className="rounded-lg border p-4 text-left transition-colors hover:border-primary disabled:opacity-60"
            >
              <p className="text-sm font-semibold">Withdrawn</p>
              <p className="text-xs text-muted-foreground">
                Client instructed withdrawal before resolution.
              </p>
            </button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Settlement terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  [
                    "Settlement value",
                    c.settlement
                      ? money(c.settlement.amount, c.currency)
                      : "Not yet agreed",
                  ],
                  [
                    "Payment schedule",
                    "50% on execution, 50% in 60 days (dummy)",
                  ],
                  ["Settlement deed", "Draft in Documents → Contracts & signed"],
                  ["Release of claims", "Mutual, full and final"],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="text-right font-medium">{v}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Closure report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  [
                    "Case duration",
                    `${c.totals?.ageDays ?? daysFrom(c.filedOn)} days`,
                  ],
                  ["Total fees billed", money(c.totals?.fees ?? 0, c.currency)],
                  [
                    "Disbursements",
                    money(c.totals?.disbursed ?? 0, c.currency),
                  ],
                  ["Client satisfaction", "To be recorded on closure"],
                  ["Lessons learned", "To be recorded on closure"],
                  ["Precedent / KB value", "To be flagged on closure"],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="text-right font-medium">{v}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="audit" className="pt-4">
          <CaseAuditAccessTab />
        </TabsContent>
        </Tabs>


        {/* ── Stage bar ──────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">ADR workflow stages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {ADR_STAGES.map((s) => {
                const isCurrent = s === c.stage;
                const isPast =
                  ADR_STAGES.indexOf(s) < ADR_STAGES.indexOf(c.stage);
                return (
                  <button
                    key={s}
                    disabled={!canAct}
                    onClick={() =>
                      canAct && stageMut.mutate({ id: c._id, stage: s })
                    }
                    className={`rounded-lg border p-2.5 text-left transition-colors disabled:cursor-default ${
                      isCurrent
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : isPast
                          ? "border-success/30 bg-success/5"
                          : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <p
                      className={`flex items-center gap-1 text-xs font-semibold ${isCurrent ? "text-primary" : isPast ? "text-success" : ""}`}
                    >
                      {isPast && <CheckCircle2 className="h-3 w-3" />} {s}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                      {ADR_STAGE_TASKS[s]}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 border-t pt-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3" /> If this round fails: restart
                as a different ADR type (back to Notice)
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> If ADR fails entirely:
                escalate to litigation
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Dialogs ────────────────────────────────────────── */}
        <Dialog open={sessionOpen} onOpenChange={setSessionOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule a session</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={session.date}
                    onChange={(e) =>
                      setSession({ ...session, date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Mode</Label>
                  <Select
                    value={session.mode}
                    onValueChange={(v) =>
                      setSession({ ...session, mode: v as SessionMode })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Physical">Physical</SelectItem>
                      <SelectItem value="Virtual">Virtual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start time</Label>
                  <Input
                    placeholder="09:00"
                    value={session.startTime}
                    onChange={(e) =>
                      setSession({ ...session, startTime: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>End time</Label>
                  <Input
                    placeholder="17:00"
                    value={session.endTime}
                    onChange={(e) =>
                      setSession({ ...session, endTime: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Venue / link</Label>
                <Input
                  value={session.venue}
                  onChange={(e) =>
                    setSession({ ...session, venue: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={!session.date || sessionMut.isPending}
                onClick={() => sessionMut.mutate()}
              >
                Schedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={settlementOpen} onOpenChange={setSettlementOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record settlement</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Amount ({c.currency})</Label>
                <Input
                  type="number"
                  value={settlementDraft.amount}
                  onChange={(e) =>
                    setSettlementDraft({
                      ...settlementDraft,
                      amount: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Terms</Label>
                <Textarea
                  value={settlementDraft.terms}
                  onChange={(e) =>
                    setSettlementDraft({
                      ...settlementDraft,
                      terms: e.target.value,
                    })
                  }
                  placeholder="e.g. Payment within 60 days"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={!settlementDraft.amount || settlementMut.isPending}
                onClick={() => settlementMut.mutate()}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={outcomeOpen} onOpenChange={setOutcomeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record award / outcome</DialogTitle>
            </DialogHeader>
            <Textarea
              value={outcomeDraft}
              onChange={(e) => setOutcomeDraft(e.target.value)}
              placeholder="e.g. Award issued in favour of claimant — USD 780,000"
            />
            <DialogFooter>
              <Button
                disabled={!outcomeDraft.trim() || outcomeMut.isPending}
                onClick={() => outcomeMut.mutate()}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={restartOpen} onOpenChange={setRestartOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Restart as a different ADR type</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              This round of {c.type} failed. The case restarts at Notice stage
              under the new type.
            </p>
            <div className="grid gap-3">
              <div>
                <Label>New type</Label>
                <Select
                  value={restartDraft.newType}
                  onValueChange={(v) =>
                    setRestartDraft({ ...restartDraft, newType: v as AdrType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADR_TYPES.filter((t) => t !== c.type).map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea
                  value={restartDraft.reason}
                  onChange={(e) =>
                    setRestartDraft({ ...restartDraft, reason: e.target.value })
                  }
                  placeholder="Why did this round fail?"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={!restartDraft.reason.trim() || restartMut.isPending}
                onClick={() => restartMut.mutate()}
              >
                Restart case
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={escalateOpen} onOpenChange={setEscalateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Escalate to litigation</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              This creates a linked litigation case and preserves the full ADR
              history.
            </p>
            <div className="grid gap-3">
              <div>
                <Label>Reason</Label>
                <Textarea
                  value={escalateDraft.reason}
                  onChange={(e) =>
                    setEscalateDraft({
                      ...escalateDraft,
                      reason: e.target.value,
                    })
                  }
                  placeholder="e.g. Mediation failed after 2 sessions, no settlement"
                />
              </div>
              <div>
                <Label>Court (optional)</Label>
                <Input
                  value={escalateDraft.court}
                  onChange={(e) =>
                    setEscalateDraft({
                      ...escalateDraft,
                      court: e.target.value,
                    })
                  }
                  placeholder="e.g. High Court of Rwanda"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Division (optional)</Label>
                  <Input
                    value={escalateDraft.courtDivision}
                    onChange={(e) =>
                      setEscalateDraft({
                        ...escalateDraft,
                        courtDivision: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Registry (optional)</Label>
                  <Input
                    value={escalateDraft.registry}
                    onChange={(e) =>
                      setEscalateDraft({
                        ...escalateDraft,
                        registry: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="destructive"
                disabled={!escalateDraft.reason.trim() || escalateMut.isPending}
                onClick={() => escalateMut.mutate()}
              >
                Escalate to litigation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Withdraw case</DialogTitle>
            </DialogHeader>
            <Textarea
              value={withdrawReason}
              onChange={(e) => setWithdrawReason(e.target.value)}
              placeholder="Reason (optional)"
            />
            <DialogFooter>
              <Button
                variant="destructive"
                disabled={withdrawMut.isPending}
                onClick={() => withdrawMut.mutate()}
              >
                Withdraw
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a timeline note</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Title</Label>
                <Input
                  value={noteDraft.title}
                  onChange={(e) =>
                    setNoteDraft({ ...noteDraft, title: e.target.value })
                  }
                  placeholder="e.g. Conflict check cleared"
                />
              </div>
              <div>
                <Label>Detail (optional)</Label>
                <Textarea
                  value={noteDraft.description}
                  onChange={(e) =>
                    setNoteDraft({ ...noteDraft, description: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={!noteDraft.title.trim() || noteMut.isPending}
                onClick={() => noteMut.mutate()}
              >
                Add note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={disbursementOpen} onOpenChange={setDisbursementOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record disbursement</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Label</Label>
                <Input
                  value={disbursementDraft.label}
                  onChange={(e) =>
                    setDisbursementDraft({
                      ...disbursementDraft,
                      label: e.target.value,
                    })
                  }
                  placeholder="e.g. Mediator session fee"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select
                    value={disbursementDraft.category}
                    onValueChange={(v) =>
                      setDisbursementDraft({
                        ...disbursementDraft,
                        category: v as any,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISBURSEMENT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount ({c.currency})</Label>
                  <Input
                    type="number"
                    value={disbursementDraft.amount}
                    onChange={(e) =>
                      setDisbursementDraft({
                        ...disbursementDraft,
                        amount: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={
                  !disbursementDraft.label.trim() ||
                  !disbursementDraft.amount ||
                  disbursementMut.isPending
                }
                onClick={() => disbursementMut.mutate()}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // LIST / PIPELINE VIEW
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Case Management &amp; ADR</h1>
          <p className="text-sm text-muted-foreground">
            Mediation, arbitration, conciliation and expert determination
          </p>
        </div>
        <Button onClick={() => setOpenNew(true)}>
          <Plus className="mr-2 h-4 w-4" /> New case
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.l}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{k.l}</p>
                  <p className="mt-1 text-xl font-bold">{k.v}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {k.sub}
                  </p>
                </div>
                <k.icon className="h-5 w-5 shrink-0 text-primary" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList className="flex-wrap">
          <TabsTrigger value="pipeline">Case pipeline</TabsTrigger>
          <TabsTrigger value="all">All ({list.length})</TabsTrigger>
          <TabsTrigger value="active">Active cases ({active.length})</TabsTrigger>
          <TabsTrigger value="hearings">
            Hearings ({allSessions.length})
          </TabsTrigger>
          <TabsTrigger value="deadlines">
            Deadlines ({deadlineRows.length})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Closed cases ({closedTotal.length})
          </TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="pt-4">
          <p className="mb-3 text-xs text-muted-foreground">
            Drag cards between columns to move them through the process.
          </p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            {ADR_STAGES.map((stage) => {
              const items = byStage[stage] ?? [];
              const isOver = dragOver === stage;
              return (
                <Card
                  key={stage}
                  className={`bg-muted/30 transition-colors ${isOver ? "ring-2 ring-primary bg-primary/5" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOver !== stage) setDragOver(stage);
                  }}
                  onDragLeave={() =>
                    setDragOver((cur) => (cur === stage ? null : cur))
                  }
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(stage);
                  }}
                >
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="flex items-center justify-between text-xs font-semibold">
                      <span>{stage}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {items.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="min-h-40 space-y-2 p-2">
                    {items.map((c) => (
                      <div
                        key={c._id}
                        draggable
                        onDragStart={(e) => {
                          setDragging(c._id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => {
                          setDragging(null);
                          setDragOver(null);
                        }}
                        onClick={() => setSelectedId(c._id)}
                        className={`cursor-grab rounded-lg border border-border/50 bg-background p-3 transition-opacity hover:border-primary/50 active:cursor-grabbing ${dragging === c._id ? "opacity-40" : ""}`}
                      >
                        <p className="text-xs font-medium leading-tight">
                          {c.title}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {c.ref}
                        </p>
                        <Badge variant="outline" className="mt-1.5 text-[10px]">
                          {c.type}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="all" className="pt-4">
          {caseTable(list, "No cases filed yet.")}
        </TabsContent>
        <TabsContent value="active" className="pt-4">
          {caseTable(active, "No active cases.")}
        </TabsContent>
        <TabsContent value="closed" className="pt-4">
          {caseTable(closedTotal, "No closed cases yet.")}
        </TabsContent>

        <TabsContent value="hearings" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Case</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allSessions.map((s) => (
                    <TableRow
                      key={s._id}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(s.case._id)}
                    >
                      <TableCell className="text-sm">
                        {s.date?.slice(0, 10)}
                        {s.startTime && (
                          <span className="text-muted-foreground">
                            {" "}
                            · {s.startTime}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{s.case.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.case.ref} · {s.case.type}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">{s.mode}</TableCell>
                      <TableCell className="text-sm">{s.venue || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {s.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!allSessions.length && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No sessions scheduled.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deadlines" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Rule</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deadlineRows.map((d) => (
                    <TableRow
                      key={d.key}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(d.caseId)}
                    >
                      <TableCell>
                        <p className="text-sm font-medium">{d.caseTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.caseRef}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">{d.trigger}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d.rule}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            d.tone === "met"
                              ? "bg-success/10 text-success border-success/20"
                              : d.tone === "due"
                                ? "bg-amber-100 text-amber-700 border-amber-200"
                                : "bg-muted text-muted-foreground border-border"
                          }
                        >
                          {d.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!deadlineRows.length && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No deadline rules configured.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="pt-4">
          <CaseTemplatesLibrary />
        </TabsContent>

        <TabsContent value="reports" className="pt-4">
          <CaseReportsPanel
            title="ADR case register"
            metrics={[
              { label: "Active cases", value: String(active.length) },
              {
                label: "Resolution rate",
                value: closedTotal.length ? `${resolutionRate}%` : "—",
                sub: `${resolved.length} of ${closedTotal.length} closed`,
              },
              {
                label: "Avg. resolution time",
                value: resolved.length ? `${avgResolutionDays} days` : "—",
              },
              { label: "Claim value at stake", value: money(claimAtStake) },
            ]}
            rows={[
              ...typeBreakdown.map(([t, n]) => ({
                label: `Active — ${t}`,
                value: String(n),
              })),
              {
                label: "Upcoming sessions",
                value: String(upcomingSessions.length),
              },
              { label: "Resolved", value: String(resolved.length) },
              {
                label: "Escalated to litigation",
                value: String(
                  list.filter((c) => c.status === "Escalated to litigation")
                    .length,
                ),
              },
              {
                label: "Withdrawn",
                value: String(
                  list.filter((c) => c.status === "Withdrawn").length,
                ),
              },
            ]}
          />
        </TabsContent>
      </Tabs>


      {/* ── New case dialog ──────────────────────────────────── */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>File a new ADR case</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Title</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="e.g. Meridian Holdings Ltd v Kigali Cement Co. Ltd"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={draft.type}
                  onValueChange={(v) =>
                    setDraft({ ...draft, type: v as AdrType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADR_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Claim value</Label>
                <Input
                  type="number"
                  value={draft.claimValue}
                  onChange={(e) =>
                    setDraft({ ...draft, claimValue: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Mandate (optional)</Label>
              <Select
                value={draft.mandateId}
                onValueChange={(v) => setDraft({ ...draft, mandateId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Link to a mandate" />
                </SelectTrigger>
                <SelectContent>
                  {mandates.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Input
                value={draft.category}
                onChange={(e) =>
                  setDraft({ ...draft, category: e.target.value })
                }
                placeholder="e.g. Commercial — construction"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>ADR venue</Label>
                <Input
                  value={draft.venue}
                  onChange={(e) =>
                    setDraft({ ...draft, venue: e.target.value })
                  }
                  placeholder="e.g. KIAC, Kigali"
                />
              </div>
              <div>
                <Label>Governing law</Label>
                <Input
                  value={draft.governingLaw}
                  onChange={(e) =>
                    setDraft({ ...draft, governingLaw: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>ADR clause</Label>
              <Input
                value={draft.adrClause}
                onChange={(e) =>
                  setDraft({ ...draft, adrClause: e.target.value })
                }
                placeholder="e.g. Contract cl. 18.2"
              />
            </div>
            <div>
              <Label>If this fails (escalation path)</Label>
              <Input
                value={draft.escalationPath}
                onChange={(e) =>
                  setDraft({ ...draft, escalationPath: e.target.value })
                }
                placeholder="e.g. Arbitration (KIAC rules)"
              />
            </div>

            <div>
              <Label>Parties</Label>
              <div className="space-y-2">
                {draftParties.map((p, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <Input
                      placeholder="Name"
                      value={p.name}
                      onChange={(e) =>
                        setDraftParties(
                          draftParties.map((x, j) =>
                            j === i ? { ...x, name: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <Select
                      value={p.role}
                      onValueChange={(v) =>
                        setDraftParties(
                          draftParties.map((x, j) =>
                            j === i ? { ...x, role: v as AdrPartyRole } : x,
                          ),
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ADR_PARTY_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {draftParties.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDraftParties(
                            draftParties.filter((_, j) => j !== i),
                          )
                        }
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraftParties([...draftParties, { ...emptyParty }])
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add party
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={createMut.isPending || !draft.title}
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? "Filing…" : "File case"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
