import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Gavel,
  Handshake,
  Calendar as CalendarIcon,
  Clock,
  DollarSign,
  Landmark,
  Users,
  CheckCircle2,
  History,
  Ban,
  FileText,
  Scale,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchMandates } from "@/lib/crm/mandates-api";
import {
  fetchLitigationCases,
  fetchLitigationCase,
  createLitigationCase,
  updateLitigationDetails,
  setLitigationStage,
  addLitigationPleading,
  updateLitigationPleading,
  addLitigationCourtDate,
  addLitigationDisbursement,
  addLitigationTimelineEntry,
  recordLitigationOutcome,
  recordConsentJudgment,
  withdrawLitigationCase,
  LITIGATION_STAGES,
  LITIGATION_STAGE_TASKS,
  LITIGATION_PARTY_ROLES,
  PLEADING_TYPES,
} from "@/lib/crm/litigation-api";
import {
  DISBURSEMENT_CATEGORIES,
  type DisbursementCategory,
} from "@/lib/crm/adr-api";
import type {
  LitigationStage,
  LitigationPartyRole,
  PleadingType,
} from "@/lib/crm/litigation-api";

const money = (n: number, c = "USD") =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: c,
    maximumFractionDigits: 0,
  });

const daysUntil = (a: string) =>
  Math.ceil((new Date(a).getTime() - Date.now()) / 86_400_000);

const stageTone: Record<LitigationStage, string> = {
  Filing: "bg-slate-100 text-slate-700 border-slate-200",
  Service: "bg-blue-100 text-blue-700 border-blue-200",
  Pleadings: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Discovery: "bg-violet-100 text-violet-700 border-violet-200",
  "Pre-trial": "bg-amber-100 text-amber-700 border-amber-200",
  Trial: "bg-rose-100 text-rose-700 border-rose-200",
  Judgment: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
  Enforce: "bg-emerald-100 text-emerald-700 border-emerald-200",
};
const statusTone: Record<string, string> = {
  Active: "bg-primary/10 text-primary border-primary/20",
  "Judgment issued": "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20",
  Settled: "bg-success/10 text-success border-success/20",
  Withdrawn: "bg-muted text-muted-foreground border-border",
  Enforced: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};
const pleadingStatusTone: Record<string, string> = {
  Filed: "bg-success/10 text-success border-success/20",
  Due: "bg-warning/10 text-warning border-warning/20",
  Pending: "bg-muted text-muted-foreground border-border",
};

const emptyParty = {
  name: "",
  role: "Plaintiff" as LitigationPartyRole,
  organisation: "",
};

export default function Litigation() {
  const { id } = useParams();
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
    queryKey: ["litigationCases"],
    queryFn: fetchLitigationCases,
  });
  const { data: mandates = [] } = useQuery({
    queryKey: ["litigation-mandates"],
    queryFn: fetchMandates,
  });
  const { data: detail } = useQuery({
    queryKey: ["litigationCase", id],
    queryFn: () => fetchLitigationCase(id!),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["litigationCases"] });
    if (id) queryClient.invalidateQueries({ queryKey: ["litigationCase", id] });
  };

  // ── New case dialog (direct filing, no prior ADR) ────────
  const [openNew, setOpenNew] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    mandateId: "",
    claimValue: 0,
    court: "",
    courtDivision: "",
    registry: "",
  });
  const [draftParties, setDraftParties] = useState([{ ...emptyParty }]);

  // ── Detail-view dialogs ───────────────────────────────────
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsDraft, setDetailsDraft] = useState({
    court: "",
    courtDivision: "",
    courtCaseNumber: "",
    judge: "",
    registry: "",
    courtFeesPaid: 0,
  });
  const [pleadingOpen, setPleadingOpen] = useState(false);
  const [pleadingDraft, setPleadingDraft] = useState({
    type: PLEADING_TYPES[0],
    label: "",
    dueOn: "",
    note: "",
  });
  const [courtDateOpen, setCourtDateOpen] = useState(false);
  const [courtDateDraft, setCourtDateDraft] = useState({
    date: "",
    title: "",
    time: "",
    location: "",
    note: "",
  });
  const [disbursementOpen, setDisbursementOpen] = useState(false);
  const [disbursementDraft, setDisbursementDraft] = useState({
    label: "",
    category: DISBURSEMENT_CATEGORIES[0],
    amount: 0,
  });
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState({ title: "", description: "" });
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [outcomeDraft, setOutcomeDraft] = useState("");
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentTerms, setConsentTerms] = useState("");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("");

  // ── Mutations ─────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: () =>
      createLitigationCase({
        title: draft.title,
        mandateId: draft.mandateId || undefined,
        claimValue: Number(draft.claimValue) || 0,
        court: draft.court,
        courtDivision: draft.courtDivision,
        registry: draft.registry,
        parties: draftParties.filter((p) => p.name.trim()),
      }),
    onSuccess: (c) => {
      invalidate();
      setOpenNew(false);
      setDraft({
        title: "",
        mandateId: "",
        claimValue: 0,
        court: "",
        courtDivision: "",
        registry: "",
      });
      setDraftParties([{ ...emptyParty }]);
      toast({ title: "Litigation case filed", description: c.ref });
      navigate(`/crm/litigation/${c._id}`);
    },
    onError: onErr("Failed to file case"),
  });

  const stageMut = useMutation({
    mutationFn: (stage: LitigationStage) =>
      setLitigationStage(detail!._id, stage),
    onSuccess: invalidate,
    onError: onErr("Failed to update stage"),
  });

  const detailsMut = useMutation({
    mutationFn: () => updateLitigationDetails(detail!._id, detailsDraft),
    onSuccess: () => {
      invalidate();
      setDetailsOpen(false);
      toast({ title: "Court details updated" });
    },
    onError: onErr("Failed to update details"),
  });

  const pleadingAddMut = useMutation({
    mutationFn: () => addLitigationPleading(detail!._id, pleadingDraft),
    onSuccess: () => {
      invalidate();
      setPleadingOpen(false);
      setPleadingDraft({
        type: PLEADING_TYPES[0],
        label: "",
        dueOn: "",
        note: "",
      });
      toast({ title: "Pleading added to tracker" });
    },
    onError: onErr("Failed to add pleading"),
  });
  const pleadingFileMut = useMutation({
    mutationFn: (pleadingId: string) =>
      updateLitigationPleading(detail!._id, pleadingId, {
        filedOn: new Date().toISOString().slice(0, 10),
      }),
    onSuccess: invalidate,
    onError: onErr("Failed to update pleading"),
  });

  const courtDateMut = useMutation({
    mutationFn: () => addLitigationCourtDate(detail!._id, courtDateDraft),
    onSuccess: () => {
      invalidate();
      setCourtDateOpen(false);
      setCourtDateDraft({
        date: "",
        title: "",
        time: "",
        location: "",
        note: "",
      });
      toast({ title: "Court date added" });
    },
    onError: onErr("Failed to add court date"),
  });

  const disbursementMut = useMutation({
    mutationFn: () => addLitigationDisbursement(detail!._id, disbursementDraft),
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

  const noteMut = useMutation({
    mutationFn: () => addLitigationTimelineEntry(detail!._id, noteDraft),
    onSuccess: () => {
      invalidate();
      setNoteOpen(false);
      setNoteDraft({ title: "", description: "" });
      toast({ title: "Note added to timeline" });
    },
    onError: onErr("Failed to add note"),
  });

  const outcomeMut = useMutation({
    mutationFn: () => recordLitigationOutcome(detail!._id, outcomeDraft),
    onSuccess: () => {
      invalidate();
      setOutcomeOpen(false);
      setOutcomeDraft("");
      toast({ title: "Judgment recorded" });
    },
    onError: onErr("Failed to record judgment"),
  });

  const consentMut = useMutation({
    mutationFn: () => recordConsentJudgment(detail!._id, consentTerms),
    onSuccess: () => {
      invalidate();
      setConsentOpen(false);
      setConsentTerms("");
      toast({
        title: "Consent judgment recorded",
        description: "Case closed by settlement.",
      });
    },
    onError: onErr("Failed to record consent judgment"),
  });

  const withdrawMut = useMutation({
    mutationFn: () => withdrawLitigationCase(detail!._id, withdrawReason),
    onSuccess: () => {
      invalidate();
      setWithdrawOpen(false);
      setWithdrawReason("");
      toast({ title: "Case withdrawn" });
    },
    onError: onErr("Failed to withdraw case"),
  });

  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Loading litigation cases…
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // DETAIL VIEW
  // ═══════════════════════════════════════════════════════════
  if (id && detail) {
    const c = detail;
    const canAct = c.status === "Active";
    const openingEntry = c.timeline[0];
    const upcomingCourtDates = [...c.courtDates]
      .filter((d) => daysUntil(d.date) >= 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    const nextCourtDate = upcomingCourtDates[0];
    const t = c.totals;

    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/crm/litigation")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to litigation
        </Button>

        {c.adrCaseId && (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3.5">
            <div className="flex items-start gap-2.5">
              <History className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  Escalated to litigation: {c.title} ({c.ref})
                </p>
                <p className="text-xs text-muted-foreground">
                  {openingEntry?.description || openingEntry?.title}. Filed{" "}
                  {c.filedOn?.slice(0, 10)}. ADR history preserved.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => navigate("/crm/adr")}
            >
              View ADR history
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">Litigation: {c.title}</h1>
              <Badge variant="outline" className={stageTone[c.stage]}>
                {c.stage}
              </Badge>
              <Badge variant="outline" className={statusTone[c.status]}>
                {c.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {c.ref}
              {c.court && ` · ${c.court}`}
              {c.courtDivision && `, ${c.courtDivision}`}
              {c.courtCaseNumber && ` · Case No. ${c.courtCaseNumber}`}
            </p>
          </div>
          {canAct && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setConsentTerms("");
                  setConsentOpen(true);
                }}
              >
                <Handshake className="mr-2 h-4 w-4" /> Consent judgment
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setOutcomeDraft("");
                  setOutcomeOpen(true);
                }}
              >
                <Gavel className="mr-2 h-4 w-4" /> Record judgment
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
        </div>

        {c.outcome && (
          <div className="rounded-lg border p-3 text-sm">
            <span className="font-medium">Judgment:</span> {c.outcome}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              l: "Claim value",
              v: money(c.claimValue, c.currency),
              sub: "Plus interest and costs",
              icon: DollarSign,
            },
            {
              l: "Court",
              v: c.court || "—",
              sub: c.judge ? `Judge: ${c.judge}` : "Not yet assigned",
              icon: Landmark,
            },
            {
              l: "Next court date",
              v: nextCourtDate ? nextCourtDate.date.slice(0, 10) : "—",
              sub: nextCourtDate ? nextCourtDate.title : "None scheduled",
              icon: CalendarIcon,
            },
            {
              l: "Case age",
              v: t ? `${t.litigationAgeDays}d` : "—",
              sub:
                t && c.adrCaseId
                  ? `${t.totalAgeDays}d total inc. ADR`
                  : "Litigation only",
              icon: Clock,
            },
            {
              l: "Fees to date",
              v: t ? money(t.combinedTotal, c.currency) : "—",
              sub:
                t && c.adrCaseId
                  ? `ADR ${money(t.adrFees + t.adrDisbursed, c.currency)} + Lit ${money(t.litigationFees + t.litigationDisbursed, c.currency)}`
                  : "Litigation only",
              icon: Scale,
            },
          ].map((k) => (
            <Card key={k.l}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{k.l}</p>
                    <p className="mt-1 truncate text-lg font-bold">{k.v}</p>
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

        <Tabs defaultValue="overview">
          <TabsList className="flex w-full flex-wrap justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
            <TabsTrigger value="drafting">Drafting</TabsTrigger>
            <TabsTrigger value="hearings">Court dates</TabsTrigger>
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
                <CardTitle className="text-base">Litigation timeline</CardTitle>
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
                  {[...c.timeline].reverse().map((tl, i) => (
                    <div
                      key={tl._id}
                      className="relative flex gap-3 pb-6 last:pb-0"
                    >
                      {i < c.timeline.length - 1 && (
                        <div className="absolute left-[5px] top-3 h-full w-px bg-border" />
                      )}
                      <div
                        className={`relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${tl.source === "System" ? "bg-primary" : "bg-muted-foreground"}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <p className="text-xs text-muted-foreground">
                            {new Date(tl.at).toLocaleDateString(undefined, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                          {tl.source === "Manual" && (
                            <Badge variant="outline" className="text-[10px]">
                              Note
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">{tl.title}</p>
                        {tl.description && (
                          <p className="text-xs text-muted-foreground">
                            {tl.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Pleadings tracker</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPleadingOpen(true)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {c.pleadings.map((p) => (
                  <div
                    key={p._id}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >
                    <div className="flex items-start gap-2.5">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {p.type}
                          {p.label && ` — ${p.label}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.filedOn
                            ? `Filed ${p.filedOn.slice(0, 10)}`
                            : p.dueOn
                              ? `Due ${p.dueOn.slice(0, 10)}`
                              : "No date set"}
                          {p.note && ` · ${p.note}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge
                        variant="outline"
                        className={pleadingStatusTone[p.status]}
                      >
                        {p.status}
                      </Badge>
                      {canAct && p.status !== "Filed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => pleadingFileMut.mutate(p._id)}
                        >
                          Mark filed
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {!c.pleadings.length && (
                  <p className="text-sm text-muted-foreground">
                    No pleadings tracked yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Sidebar ─────────────────────────────────────── */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Court details</CardTitle>
                {canAct && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDetailsDraft({
                        court: c.court,
                        courtDivision: c.courtDivision,
                        courtCaseNumber: c.courtCaseNumber || "",
                        judge: c.judge,
                        registry: c.registry,
                        courtFeesPaid: c.courtFeesPaid,
                      });
                      setDetailsOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  ["Court", c.court || "—"],
                  ["Division", c.courtDivision || "—"],
                  ["Case number", c.courtCaseNumber || "Not yet assigned"],
                  ["Judge", c.judge || "—"],
                  ["Registry", c.registry || "—"],
                  [
                    "Court fees paid",
                    money(c.courtFeesPaid, c.courtFeesCurrency || c.currency),
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-right font-medium">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1.5 text-base">
                  <CalendarIcon className="h-4 w-4" /> Court dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => setCourtDateOpen(true)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add court date
                </Button>
                {[...c.courtDates]
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((d) => (
                    <div key={d._id} className="rounded border p-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{d.title}</p>
                        {daysUntil(d.date) >= 0 && (
                          <Badge className="bg-primary text-primary-foreground">
                            {daysUntil(d.date)}d
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {d.date?.slice(0, 10)}
                        {d.time && ` · ${d.time}`}
                        {d.location && ` · ${d.location}`}
                      </p>
                    </div>
                  ))}
                {!c.courtDates.length && (
                  <p className="text-sm text-muted-foreground">
                    No court dates scheduled.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Costs tracker</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {t && c.adrCaseId && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        ADR phase fees
                      </span>
                      <span className="font-medium">
                        {money(t.adrFees, c.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        ADR disbursements
                      </span>
                      <span className="font-medium">
                        {money(t.adrDisbursed, c.currency)}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Litigation fees</span>
                  <span className="font-medium">
                    {money(t?.litigationFees ?? 0, c.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Litigation disbursements
                  </span>
                  <span className="font-medium">
                    {money(t?.litigationDisbursed ?? 0, c.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Court fees</span>
                  <span className="font-medium">
                    {money(c.courtFeesPaid, c.courtFeesCurrency || c.currency)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Total to date</span>
                  <span>
                    {money(
                      (t?.combinedTotal ?? 0) + c.courtFeesPaid,
                      c.currency,
                    )}
                  </span>
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
                  <div
                    key={p._id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
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
                {!c.parties.length && (
                  <p className="text-sm text-muted-foreground">
                    No parties recorded.
                  </p>
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
          {courtDatesCard}
        </TabsContent>
        <TabsContent value="documents" className="pt-4">
          <CaseDocumentsTab caseId={c._id} />
        </TabsContent>
        <TabsContent value="deadlines" className="pt-4">
          <CaseDeadlineRulesTab caseId={c._id} />
        </TabsContent>
        <TabsContent value="billing" className="space-y-4 pt-4">
          <CaseTimeBillingTab
            hours={`${(t?.litigationHours ?? 0).toFixed(1)} hrs`}
            fees={money(t?.litigationFees ?? 0, c.currency)}
            disbursed={money(t?.litigationDisbursed ?? 0, c.currency)}
          />
          {disbursementsCard}
        </TabsContent>
        <TabsContent value="resolution" className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">
            How this matter ends. Settlement remains possible at any stage via
            a consent judgment.
          </p>
          <div className="grid gap-3 lg:grid-cols-3">
            <button
              disabled={!canAct}
              onClick={() => {
                setConsentTerms("");
                setConsentOpen(true);
              }}
              className="rounded-lg border p-4 text-left transition-colors hover:border-primary disabled:opacity-60"
            >
              <p className="text-sm font-semibold">Consent judgment</p>
              <p className="text-xs text-muted-foreground">
                Settlement reached mid-litigation, entered as an order.
              </p>
            </button>
            <button
              disabled={!canAct}
              onClick={() => {
                setOutcomeDraft("");
                setOutcomeOpen(true);
              }}
              className="rounded-lg border p-4 text-left transition-colors hover:border-primary disabled:opacity-60"
            >
              <p className="text-sm font-semibold">Judgment issued</p>
              <p className="text-xs text-muted-foreground">
                Court decision, costs order, interest and appeal window.
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
                Claim discontinued before judgment.
              </p>
            </button>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Closure report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ["Outcome", c.outcome || "Not yet recorded"],
                ["Litigation age", t ? `${t.litigationAgeDays} days` : "—"],
                [
                  "Total age inc. ADR",
                  t ? `${t.totalAgeDays} days` : "—",
                ],
                [
                  "Combined cost",
                  t ? money(t.combinedTotal, c.currency) : "—",
                ],
                ["Costs recovered", "To be recorded on closure"],
                ["Precedent / KB value", "To be flagged on closure"],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{l}</span>
                  <span className="text-right font-medium">{v}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="audit" className="pt-4">
          <CaseAuditAccessTab />
        </TabsContent>
        </Tabs>


        {/* ── Stage bar ──────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Litigation workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
              {LITIGATION_STAGES.map((s) => {
                const isCurrent = s === c.stage;
                const isPast =
                  LITIGATION_STAGES.indexOf(s) <
                  LITIGATION_STAGES.indexOf(c.stage);
                return (
                  <button
                    key={s}
                    disabled={!canAct}
                    onClick={() => canAct && stageMut.mutate(s)}
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
                      {LITIGATION_STAGE_TASKS[s]}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 border-t pt-2 text-[11px] text-muted-foreground">
              <span>
                Interlocutory applications can be filed at any stage — add as a
                pleading above.
              </span>
              <span>
                Settlement remains possible at any stage — record a consent
                judgment to close the case.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Dialogs ────────────────────────────────────────── */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit court details</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Court</Label>
                  <Input
                    value={detailsDraft.court}
                    onChange={(e) =>
                      setDetailsDraft({
                        ...detailsDraft,
                        court: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Division</Label>
                  <Input
                    value={detailsDraft.courtDivision}
                    onChange={(e) =>
                      setDetailsDraft({
                        ...detailsDraft,
                        courtDivision: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Case number</Label>
                  <Input
                    value={detailsDraft.courtCaseNumber}
                    onChange={(e) =>
                      setDetailsDraft({
                        ...detailsDraft,
                        courtCaseNumber: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Judge</Label>
                  <Input
                    value={detailsDraft.judge}
                    onChange={(e) =>
                      setDetailsDraft({
                        ...detailsDraft,
                        judge: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Registry</Label>
                  <Input
                    value={detailsDraft.registry}
                    onChange={(e) =>
                      setDetailsDraft({
                        ...detailsDraft,
                        registry: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Court fees paid</Label>
                  <Input
                    type="number"
                    value={detailsDraft.courtFeesPaid}
                    onChange={(e) =>
                      setDetailsDraft({
                        ...detailsDraft,
                        courtFeesPaid: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={detailsMut.isPending}
                onClick={() => detailsMut.mutate()}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={pleadingOpen} onOpenChange={setPleadingOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a pleading</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={pleadingDraft.type}
                  onValueChange={(v) =>
                    setPleadingDraft({
                      ...pleadingDraft,
                      type: v as PleadingType,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLEADING_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Label (optional)</Label>
                <Input
                  value={pleadingDraft.label}
                  onChange={(e) =>
                    setPleadingDraft({
                      ...pleadingDraft,
                      label: e.target.value,
                    })
                  }
                  placeholder="e.g. 22 pages + 8 annexes"
                />
              </div>
              <div>
                <Label>Due date (optional)</Label>
                <Input
                  type="date"
                  value={pleadingDraft.dueOn}
                  onChange={(e) =>
                    setPleadingDraft({
                      ...pleadingDraft,
                      dueOn: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Note (optional)</Label>
                <Textarea
                  value={pleadingDraft.note}
                  onChange={(e) =>
                    setPleadingDraft({ ...pleadingDraft, note: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={pleadingAddMut.isPending}
                onClick={() => pleadingAddMut.mutate()}
              >
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={courtDateOpen} onOpenChange={setCourtDateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a court date</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={courtDateDraft.date}
                    onChange={(e) =>
                      setCourtDateDraft({
                        ...courtDateDraft,
                        date: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Time (optional)</Label>
                  <Input
                    placeholder="10:00"
                    value={courtDateDraft.time}
                    onChange={(e) =>
                      setCourtDateDraft({
                        ...courtDateDraft,
                        time: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Title</Label>
                <Input
                  value={courtDateDraft.title}
                  onChange={(e) =>
                    setCourtDateDraft({
                      ...courtDateDraft,
                      title: e.target.value,
                    })
                  }
                  placeholder="e.g. Pre-trial conference"
                />
              </div>
              <div>
                <Label>Location (optional)</Label>
                <Input
                  value={courtDateDraft.location}
                  onChange={(e) =>
                    setCourtDateDraft({
                      ...courtDateDraft,
                      location: e.target.value,
                    })
                  }
                  placeholder="e.g. Chamber"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={
                  !courtDateDraft.date ||
                  !courtDateDraft.title ||
                  courtDateMut.isPending
                }
                onClick={() => courtDateMut.mutate()}
              >
                Add
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
                        category: v as DisbursementCategory,
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

        <Dialog open={outcomeOpen} onOpenChange={setOutcomeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record judgment</DialogTitle>
            </DialogHeader>
            <Textarea
              value={outcomeDraft}
              onChange={(e) => setOutcomeDraft(e.target.value)}
              placeholder="e.g. Judgment for the plaintiff — USD 380,000 plus costs"
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

        <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record consent judgment</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Settlement reached mid-litigation. This closes the case.
            </p>
            <Textarea
              value={consentTerms}
              onChange={(e) => setConsentTerms(e.target.value)}
              placeholder="Terms of settlement"
            />
            <DialogFooter>
              <Button
                disabled={!consentTerms.trim() || consentMut.isPending}
                onClick={() => consentMut.mutate()}
              >
                Record
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
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // LIST VIEW
  // ═══════════════════════════════════════════════════════════
  const active = list.filter((c) => c.status === "Active");
  const escalatedFromAdr = list.filter((c) => c.adrCaseId);
  const totalCourtFees = list.reduce((s, c) => s + c.courtFeesPaid, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Litigation</h1>
          <p className="text-sm text-muted-foreground">
            Court cases, filed directly or escalated from ADR
          </p>
        </div>
        <Button onClick={() => setOpenNew(true)}>
          <Plus className="mr-2 h-4 w-4" /> File litigation case
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active cases</p>
            <p className="mt-1 text-xl font-bold">{active.length}</p>
            <p className="text-[11px] text-muted-foreground">
              {escalatedFromAdr.length} escalated from ADR
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              Total claim value active
            </p>
            <p className="mt-1 text-xl font-bold">
              {money(active.reduce((s, c) => s + c.claimValue, 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Court fees paid</p>
            <p className="mt-1 text-xl font-bold">{money(totalCourtFees)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case</TableHead>
                <TableHead>Court</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Claim value</TableHead>
                <TableHead>Filed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((c) => (
                <TableRow
                  key={c._id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/crm/litigation/${c._id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium">{c.title}</p>
                      {c.adrCaseId && (
                        <Badge variant="outline" className="text-[10px]">
                          from ADR
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{c.ref}</p>
                  </TableCell>
                  <TableCell className="text-sm">{c.court || "—"}</TableCell>
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
              {!list.length && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No litigation cases yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>File a litigation case</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            For litigation with no prior ADR phase. Escalating an existing ADR
            case is done from that case's page instead.
          </p>
          <div className="grid gap-3">
            <div>
              <Label>Title</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
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
              <Label>Claim value</Label>
              <Input
                type="number"
                value={draft.claimValue}
                onChange={(e) =>
                  setDraft({ ...draft, claimValue: Number(e.target.value) })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Court</Label>
                <Input
                  value={draft.court}
                  onChange={(e) =>
                    setDraft({ ...draft, court: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Division</Label>
                <Input
                  value={draft.courtDivision}
                  onChange={(e) =>
                    setDraft({ ...draft, courtDivision: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Registry</Label>
              <Input
                value={draft.registry}
                onChange={(e) =>
                  setDraft({ ...draft, registry: e.target.value })
                }
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
                            j === i
                              ? { ...x, role: v as LitigationPartyRole }
                              : x,
                          ),
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LITIGATION_PARTY_ROLES.map((r) => (
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
