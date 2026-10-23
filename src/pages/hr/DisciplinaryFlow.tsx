import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Circle, UserX } from "lucide-react";
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
  DISCIPLINARY_SANCTIONS,
  recordDisciplinarySuspension,
  recordDisciplinaryInvestigation,
  serveNoticeOfAllegations,
  scheduleDisputeHearing,
  recordHearingMinutes,
  recordDisciplinaryFinding,
  recordDisputeOutcome,
  scheduleDisciplinaryAppealHearing,
  recordDisciplinaryAppealOutcome,
  sanctionLabel,
  formatSanctionDuration,
  isDismissalSanction,
  sanctionHasDuration,
  SANCTION_DURATION_UNITS,
  type SanctionDuration,
  type SanctionDurationUnit,
  type AppealDecision,
  type DisciplinaryFindingDecision,
  type DisputeCase,
  type DisputeOutcomeDecision,
  type InvestigationRecommendation,
  type ScheduleHearingPayload,
} from "@/lib/hr/hr-dispute-api";

// ── helpers ──────────────────────────────────────────────────────
const fmtDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString() : "—";

const platformLabel = (p?: string | null) =>
  p === "google_meet"
    ? "Google Meet"
    : p === "microsoft_teams"
      ? "Microsoft Teams"
      : p === "zoom"
        ? "Zoom"
        : "—";

const RECOMMENDATIONS: { value: InvestigationRecommendation; label: string }[] =
  [
    { value: "proceed_to_hearing", label: "Proceed to a disciplinary hearing" },
    { value: "no_further_action", label: "No further action" },
    { value: "informal_counselling", label: "Informal counselling" },
    { value: "mediation", label: "Mediation" },
  ];

const recommendationLabel = (v?: string | null) =>
  RECOMMENDATIONS.find((r) => r.value === v)?.label ?? v ?? "—";

const FINDINGS: { value: DisciplinaryFindingDecision; label: string }[] = [
  { value: "guilty", label: "Guilty" },
  { value: "partially_guilty", label: "Partially guilty" },
  { value: "not_guilty", label: "Not guilty" },
];

const HEARING_CHECKLIST = [
  "Employee was informed of the allegations",
  "Employee was given the chance to respond",
  "Employee was allowed a representative",
  "Witnesses were heard / cross-examined",
  "Evidence was presented and shared with the employee",
];

const APPEAL_DECISIONS: { value: AppealDecision; label: string }[] = [
  { value: "dismissed", label: "Dismissed — original sanction stands" },
  { value: "partially_upheld", label: "Partially upheld — sanction reduced" },
  { value: "upheld", label: "Upheld — finding and sanction overturned" },
];

// ── small building blocks ────────────────────────────────────────
function StepCard({
  title,
  hint,
  children,
  locked,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  locked: boolean;
}) {
  return (
    <fieldset
      disabled={locked}
      className={`rounded-md border p-4 space-y-3 ${locked ? "opacity-60" : ""}`}
    >
      <p className="text-sm font-semibold">{title}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </fieldset>
  );
}

function SubmitButton({
  label,
  pending,
  disabled,
  onClick,
  variant,
}: {
  label: string;
  pending: boolean;
  disabled?: boolean;
  onClick: () => void;
  variant?: "default" | "outline";
}) {
  return (
    <Button
      size="sm"
      variant={variant}
      disabled={disabled || pending}
      onClick={onClick}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : label}
    </Button>
  );
}

function RecordBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1">
      <p className="font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

// How long a sanction lasts — typed in by the tenant, never worked out
// by the system.
function DurationField({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: string;
  unit: SanctionDurationUnit;
  onChange: (value: string, unit: SanctionDurationUnit) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="grid grid-cols-2 gap-3">
        <Input
          type="number"
          min={1}
          max={999}
          placeholder="e.g. 6"
          value={value}
          onChange={(e) => onChange(e.target.value, unit)}
        />
        <Select
          value={unit}
          onValueChange={(u) => onChange(value, u as SanctionDurationUnit)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SANCTION_DURATION_UNITS.map((u) => (
              <SelectItem key={u.value} value={u.value}>
                {u.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

const toDuration = (
  value: string,
  unit: SanctionDurationUnit,
): SanctionDuration | undefined =>
  Number(value) >= 1 ? { value: Math.floor(Number(value)), unit } : undefined;

// Used by the hearing invitation (Step 5) and the appeal hearing (Step 9).
function HearingForm({
  withChairperson,
  submitLabel,
  minHours,
  pending,
  onSubmit,
}: {
  withChairperson?: boolean;
  submitLabel: string;
  minHours?: number;
  pending: boolean;
  onSubmit: (
    payload: ScheduleHearingPayload & { chairperson?: string },
  ) => void;
}) {
  const [date, setDate] = useState("");
  const [mode, setMode] = useState<"physical" | "online">("physical");
  const [venue, setVenue] = useState("");
  const [platform, setPlatform] = useState<
    "google_meet" | "microsoft_teams" | "zoom"
  >("zoom");
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");
  const [chair, setChair] = useState("");

  const tooSoon =
    !!date &&
    !!minHours &&
    new Date(date).getTime() - Date.now() < minHours * 3_600_000;

  const valid =
    !!date &&
    !tooSoon &&
    (mode === "physical" ? !!venue.trim() : !!link.trim()) &&
    (!withChairperson || !!chair.trim());

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Date & Time *</Label>
          <Input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Format *</Label>
          <Select
            value={mode}
            onValueChange={(v) => setMode(v as "physical" | "online")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="physical">In person</SelectItem>
              <SelectItem value="online">Online</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {tooSoon && (
        <p className="text-[11px] text-destructive">
          The employee must be given at least {minHours} hours notice.
        </p>
      )}
      {mode === "physical" ? (
        <div className="space-y-1.5">
          <Label className="text-xs">Venue *</Label>
          <Input
            placeholder="Room / location…"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Platform *</Label>
            <Select
              value={platform}
              onValueChange={(v) => setPlatform(v as typeof platform)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google_meet">Google Meet</SelectItem>
                <SelectItem value="microsoft_teams">Microsoft Teams</SelectItem>
                <SelectItem value="zoom">Zoom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Meeting link *</Label>
            <Input
              placeholder="https://…"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>
        </div>
      )}
      {withChairperson && (
        <div className="space-y-1.5">
          <Label className="text-xs">Appeal chairperson *</Label>
          <Input
            placeholder="Someone more senior, not on the original hearing"
            value={chair}
            onChange={(e) => setChair(e.target.value)}
          />
        </div>
      )}
      <div className="space-y-1.5">
        <Label className="text-xs">Notes (optional)</Label>
        <Textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <SubmitButton
        label={submitLabel}
        pending={pending}
        disabled={!valid}
        onClick={() =>
          onSubmit({
            scheduledAt: date,
            mode,
            venue: mode === "physical" ? venue : undefined,
            meetingPlatform: mode === "online" ? platform : undefined,
            meetingLink: mode === "online" ? link : undefined,
            notes: notes || undefined,
            chairperson: withChairperson ? chair : undefined,
          })
        }
      />
    </div>
  );
}

// ── The progress strip ───────────────────────────────────────────
function steps(d: DisputeCase) {
  const p = d.disciplinary ?? {};
  return [
    { label: "Case logged", done: true },
    { label: "Precautionary suspension", done: !!p.suspension },
    { label: "Investigation", done: !!p.investigation },
    { label: "Notice of allegations", done: !!p.notice },
    { label: "Hearing invitation", done: !!d.hearing },
    { label: "Hearing minutes", done: !!p.hearingRecord },
    { label: "Finding & mitigation", done: !!p.finding },
    { label: "Sanction", done: !!d.outcome },
    {
      label: "Appeal (employee)",
      done: !!d.appeal?.resolvedAt || (!!d.outcome && d.status === "closed"),
    },
    { label: "Close", done: d.status === "closed" },
  ];
}

// ── DisciplinaryFlow ─────────────────────────────────────────────
// The tenant-side procedure for a disciplinary case. The appeal itself is
// filed by the employee (My Disputes → "Against me"); HR only schedules the
// appeal hearing and records its outcome here.
export function DisciplinaryFlow({
  dispute,
  locked,
  onUpdated,
}: {
  dispute: DisputeCase;
  locked: boolean;
  onUpdated: (updated: DisputeCase) => void;
}) {
  const navigate = useNavigate();
  const p = dispute.disciplinary ?? {};
  const stage = dispute.stage;
  const closed = dispute.status === "closed";
  const respondent = dispute.respondents?.[0];

  const ok = (msg: string) => (u: DisputeCase) => {
    onUpdated(u);
    toast.success(msg);
  };
  const fail = (e: any) =>
    toast.error(e?.response?.data?.message ?? "Action failed");

  // Step 2 — suspension
  const [susDecision, setSusDecision] = useState<"issued" | "skipped">(
    "skipped",
  );
  const [susDate, setSusDate] = useState("");
  const [susReason, setSusReason] = useState("");
  const [susConditions, setSusConditions] = useState("");
  const suspensionMutation = useMutation({
    mutationFn: () =>
      recordDisciplinarySuspension(dispute._id, {
        decision: susDecision,
        effectiveDate:
          susDecision === "issued" && susDate ? susDate : undefined,
        reason: susDecision === "issued" ? susReason || undefined : undefined,
        conditions:
          susDecision === "issued"
            ? susConditions
                .split("\n")
                .map((c) => c.trim())
                .filter(Boolean)
            : undefined,
      }),
    onSuccess: ok("Suspension decision recorded."),
    onError: fail,
  });

  // Step 3 — investigation
  const [invOfficer, setInvOfficer] = useState("");
  const [invStart, setInvStart] = useState("");
  const [invFindings, setInvFindings] = useState("");
  const [invRec, setInvRec] =
    useState<InvestigationRecommendation>("proceed_to_hearing");
  const investigationMutation = useMutation({
    mutationFn: () =>
      recordDisciplinaryInvestigation(dispute._id, {
        officer: invOfficer,
        startDate: invStart || undefined,
        findings: invFindings,
        recommendation: invRec,
      }),
    onSuccess: ok("Investigation recorded."),
    onError: fail,
  });

  // Step 4 — notice of allegations
  const [charges, setCharges] = useState("");
  const [clause, setClause] = useState(dispute.particularClause ?? "");
  const [maxSanction, setMaxSanction] =
    useState<DisputeOutcomeDecision>("written_warning");
  const [respDays, setRespDays] = useState("5");
  const noticeMutation = useMutation({
    mutationFn: () =>
      serveNoticeOfAllegations(dispute._id, {
        charges,
        clauseBreached: clause,
        maxSanction,
        responseDeadlineDays: Number(respDays),
      }),
    onSuccess: ok("Notice of allegations served."),
    onError: fail,
  });

  // Step 5 — hearing invitation (shared endpoint with grievances)
  const hearingMutation = useMutation({
    mutationFn: (payload: ScheduleHearingPayload) =>
      scheduleDisputeHearing(dispute._id, payload),
    onSuccess: ok("Hearing invitation sent."),
    onError: fail,
  });

  // Step 6 — minutes
  const [minutes, setMinutes] = useState("");
  const [checks, setChecks] = useState<string[]>([]);
  const minutesMutation = useMutation({
    mutationFn: () =>
      recordHearingMinutes(dispute._id, { minutes, checklist: checks }),
    onSuccess: ok("Hearing minutes recorded."),
    onError: fail,
  });

  // Step 7 — finding
  const [findingDecision, setFindingDecision] =
    useState<DisciplinaryFindingDecision>("guilty");
  const [findingReasons, setFindingReasons] = useState("");
  const [mitigating, setMitigating] = useState("");
  const [aggravating, setAggravating] = useState("");
  const findingMutation = useMutation({
    mutationFn: () =>
      recordDisciplinaryFinding(dispute._id, {
        decision: findingDecision,
        reasons: findingReasons,
        mitigatingFactors: mitigating || undefined,
        aggravatingFactors: aggravating || undefined,
      }),
    onSuccess: ok("Finding recorded."),
    onError: fail,
  });

  // Step 8 — sanction
  const [sanction, setSanction] = useState<DisputeOutcomeDecision>("no_action");
  const [sanctionNotes, setSanctionNotes] = useState("");
  const [durValue, setDurValue] = useState("");
  const [durUnit, setDurUnit] = useState<SanctionDurationUnit>("months");
  const durationRequired = sanction === "suspension_without_pay";
  const durationMissing = durationRequired && !toDuration(durValue, durUnit);
  const sanctionMutation = useMutation({
    mutationFn: () =>
      recordDisputeOutcome(dispute._id, {
        decision: sanction,
        notes: sanctionNotes || undefined,
        duration: sanctionHasDuration(sanction)
          ? toDuration(durValue, durUnit)
          : undefined,
      }),
    onSuccess: ok("Sanction recorded and the employee notified."),
    onError: fail,
  });

  // Step 9 — appeal hearing + outcome
  const appealHearingMutation = useMutation({
    mutationFn: (payload: ScheduleHearingPayload & { chairperson?: string }) =>
      scheduleDisciplinaryAppealHearing(dispute._id, {
        ...payload,
        chairperson: payload.chairperson ?? "",
      }),
    onSuccess: ok("Appeal hearing scheduled."),
    onError: fail,
  });
  const [apDecision, setApDecision] = useState<AppealDecision>("dismissed");
  const [apSanction, setApSanction] =
    useState<DisputeOutcomeDecision>("verbal_warning");
  const [apDurValue, setApDurValue] = useState("");
  const [apDurUnit, setApDurUnit] = useState<SanctionDurationUnit>("months");
  const [apReasons, setApReasons] = useState("");
  const appealOutcomeMutation = useMutation({
    mutationFn: () =>
      recordDisciplinaryAppealOutcome(dispute._id, {
        decision: apDecision,
        newSanction: apDecision === "partially_upheld" ? apSanction : undefined,
        newSanctionDuration:
          apDecision === "partially_upheld" && sanctionHasDuration(apSanction)
            ? toDuration(apDurValue, apDurUnit)
            : undefined,
        reasons: apReasons,
      }),
    onSuccess: ok("Appeal outcome recorded."),
    onError: fail,
  });

  const appealOpen =
    stage === "appeal" && !!dispute.appeal && !dispute.appeal.resolvedAt;
  // The sanction that actually stands: the original one, unless a decided
  // appeal overturned it (upheld) or replaced it (partially upheld).
  const effectiveSanction = !dispute.outcome
    ? null
    : dispute.appeal?.resolvedAt
      ? dispute.appeal.decision === "upheld"
        ? null
        : dispute.appeal.decision === "partially_upheld"
          ? (dispute.appeal.newSanction ?? null)
          : dispute.outcome.decision
      : dispute.outcome.decision;
  const showTerminate = isDismissalSanction(effectiveSanction) && !!respondent;

  return (
    <div className="space-y-4">
      {/* Case particulars */}
      <RecordBox title="Disciplinary particulars">
        {respondent && (
          <p>
            <span className="text-muted-foreground">Employee: </span>
            {respondent.firstName} {respondent.lastName} · {respondent.jobTitle}
          </p>
        )}
        <p>
          <span className="text-muted-foreground">Policy breached: </span>
          {dispute.policyTitle ?? "—"}
        </p>
        <p>
          <span className="text-muted-foreground">Particular clause: </span>
          {dispute.particularClause ?? "—"}
        </p>
        <p>
          <span className="text-muted-foreground">
            Date of alleged misconduct:{" "}
          </span>
          {fmtDate(dispute.dateOfAllegedMisconduct)}
        </p>
      </RecordBox>

      {/* Progress */}
      <div className="rounded-md border p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Disciplinary process
        </p>
        <ol className="space-y-1">
          {steps(dispute).map((s, i) => (
            <li key={s.label} className="flex items-center gap-2 text-xs">
              {s.done ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <span className={s.done ? "" : "text-muted-foreground"}>
                {i + 1}. {s.label}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Recorded steps */}
      {p.suspension && (
        <RecordBox title="Precautionary suspension">
          <p className="font-medium">
            {p.suspension.decision === "issued" ? "Issued" : "Not issued"}
          </p>
          {p.suspension.decision === "issued" && (
            <>
              <p>Effective: {fmtDate(p.suspension.effectiveDate)}</p>
              {p.suspension.reason && <p>Reason: {p.suspension.reason}</p>}
              {p.suspension.conditions.length > 0 && (
                <p>Conditions: {p.suspension.conditions.join("; ")}</p>
              )}
            </>
          )}
        </RecordBox>
      )}
      {p.investigation && (
        <RecordBox title="Investigation">
          <p>
            Officer: {p.investigation.officer}
            {p.investigation.startDate &&
              ` · started ${fmtDate(p.investigation.startDate)}`}
          </p>
          <p>{p.investigation.findings}</p>
          <p className="text-muted-foreground">
            Recommendation:{" "}
            {recommendationLabel(p.investigation.recommendation)}
          </p>
        </RecordBox>
      )}
      {p.notice && (
        <RecordBox title="Notice of allegations">
          <p>{p.notice.charges}</p>
          <p>Clause breached: {p.notice.clauseBreached}</p>
          <p>Maximum sanction: {sanctionLabel(p.notice.maxSanction)}</p>
          <p className="text-muted-foreground">
            Served {fmtDate(p.notice.servedAt)} · response due{" "}
            {fmtDate(p.notice.responseDueBy)} ({p.notice.responseDeadlineDays}{" "}
            working days)
          </p>
        </RecordBox>
      )}
      {p.hearingRecord && (
        <RecordBox title="Hearing minutes">
          <p className="whitespace-pre-wrap">{p.hearingRecord.minutes}</p>
          {p.hearingRecord.checklist.length > 0 && (
            <p className="text-muted-foreground">
              Confirmed: {p.hearingRecord.checklist.join("; ")}
            </p>
          )}
        </RecordBox>
      )}
      {p.finding && (
        <RecordBox title="Finding">
          <p className="font-medium capitalize">
            {p.finding.decision.replace(/_/g, " ")}
          </p>
          <p>{p.finding.reasons}</p>
          {p.finding.mitigatingFactors && (
            <p className="text-muted-foreground">
              Mitigating: {p.finding.mitigatingFactors}
            </p>
          )}
          {p.finding.aggravatingFactors && (
            <p className="text-muted-foreground">
              Aggravating: {p.finding.aggravatingFactors}
            </p>
          )}
        </RecordBox>
      )}
      {dispute.outcome && (
        <RecordBox title="Sanction">
          <p className="font-medium">
            {sanctionLabel(dispute.outcome.decision)}
          </p>
          {formatSanctionDuration(dispute.outcome.duration) ? (
            <p>Duration: {formatSanctionDuration(dispute.outcome.duration)}</p>
          ) : (
            dispute.outcome.warningExpiryDate && (
              <p>Valid until {fmtDate(dispute.outcome.warningExpiryDate)}</p>
            )
          )}
          {dispute.outcome.notes && (
            <p className="text-muted-foreground">{dispute.outcome.notes}</p>
          )}
        </RecordBox>
      )}
      {dispute.appeal?.hearing && (
        <RecordBox title="Appeal hearing">
          <p>When: {fmtDateTime(dispute.appeal.hearing.scheduledAt)}</p>
          <p>Chairperson: {dispute.appeal.hearing.chairperson}</p>
          <p>
            {dispute.appeal.hearing.mode === "online"
              ? `Online — ${platformLabel(dispute.appeal.hearing.meetingPlatform)}`
              : `In person — ${dispute.appeal.hearing.venue ?? "—"}`}
          </p>
        </RecordBox>
      )}
      {dispute.appeal?.resolvedAt && (
        <RecordBox title="Appeal outcome">
          <p className="font-medium capitalize">
            {(dispute.appeal.decision ?? "").replace(/_/g, " ")}
          </p>
          {dispute.appeal.newSanction && (
            <p>
              Reduced sanction: {sanctionLabel(dispute.appeal.newSanction)}
              {formatSanctionDuration(dispute.appeal.newSanctionDuration) &&
                ` — ${formatSanctionDuration(dispute.appeal.newSanctionDuration)}`}
            </p>
          )}
          {dispute.appeal.notes && <p>{dispute.appeal.notes}</p>}
        </RecordBox>
      )}

      {/* ── Actions ── */}

      {/* Step 2 — precautionary suspension */}
      {!closed &&
        !p.suspension &&
        (stage === "case_reported" ||
          stage === "investigate" ||
          stage === "notice_of_allegations") && (
          <StepCard
            locked={locked}
            title="Step 2 — Precautionary suspension"
            hint="Decide whether the employee should be suspended on full pay while the matter is investigated. Skipping it is a valid decision."
          >
            <div className="space-y-1.5">
              <Label className="text-xs">Decision *</Label>
              <Select
                value={susDecision}
                onValueChange={(v) => setSusDecision(v as "issued" | "skipped")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skipped">
                    Do not suspend — skip this step
                  </SelectItem>
                  <SelectItem value="issued">
                    Issue a precautionary suspension letter
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {susDecision === "issued" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Effective date</Label>
                  <Input
                    type="date"
                    value={susDate}
                    onChange={(e) => setSusDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Reason</Label>
                  <Textarea
                    rows={2}
                    value={susReason}
                    onChange={(e) => setSusReason(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Conditions (one per line)</Label>
                  <Textarea
                    rows={3}
                    placeholder={
                      "Remain available for the investigation\nNo access to company systems"
                    }
                    value={susConditions}
                    onChange={(e) => setSusConditions(e.target.value)}
                  />
                </div>
              </>
            )}
            <SubmitButton
              label={
                susDecision === "issued"
                  ? "Issue suspension"
                  : "Skip suspension"
              }
              pending={suspensionMutation.isPending}
              onClick={() => suspensionMutation.mutate()}
            />
          </StepCard>
        )}

      {/* Step 3 — investigation */}
      {!closed && stage === "case_reported" && p.suspension && (
        <StepCard
          locked={locked}
          title="Step 3 — Investigation"
          hint="Record who investigated, what they found and what they recommend."
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Investigating officer *</Label>
              <Input
                value={invOfficer}
                onChange={(e) => setInvOfficer(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Start date</Label>
              <Input
                type="date"
                value={invStart}
                onChange={(e) => setInvStart(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Findings *</Label>
            <Textarea
              rows={4}
              value={invFindings}
              onChange={(e) => setInvFindings(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Recommendation *</Label>
            <Select
              value={invRec}
              onValueChange={(v) => setInvRec(v as InvestigationRecommendation)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECOMMENDATIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <SubmitButton
            label="Submit investigation"
            pending={investigationMutation.isPending}
            disabled={!invOfficer.trim() || invFindings.trim().length < 5}
            onClick={() => investigationMutation.mutate()}
          />
        </StepCard>
      )}

      {/* Step 4 — notice of allegations */}
      {!closed &&
        stage === "investigate" &&
        p.investigation &&
        p.investigation.recommendation === "proceed_to_hearing" && (
          <StepCard
            locked={locked}
            title="Step 4 — Notice of allegations"
            hint="Served by email to the employee, who then has the response period to reply in writing."
          >
            <div className="space-y-1.5">
              <Label className="text-xs">Allegation(s) *</Label>
              <Textarea
                rows={3}
                value={charges}
                onChange={(e) => setCharges(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Rule / clause breached *</Label>
              <Input
                value={clause}
                onChange={(e) => setClause(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Maximum possible sanction *</Label>
                <Select
                  value={maxSanction}
                  onValueChange={(v) =>
                    setMaxSanction(v as DisputeOutcomeDecision)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCIPLINARY_SANCTIONS.filter(
                      (s) => s.value !== "no_action",
                    ).map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Response time (working days) *
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={respDays}
                  onChange={(e) => setRespDays(e.target.value)}
                />
              </div>
            </div>
            <SubmitButton
              label="Serve notice"
              pending={noticeMutation.isPending}
              disabled={
                charges.trim().length < 10 ||
                clause.trim().length < 3 ||
                !(Number(respDays) >= 1 && Number(respDays) <= 30)
              }
              onClick={() => noticeMutation.mutate()}
            />
          </StepCard>
        )}
      {!closed &&
        stage === "investigate" &&
        p.investigation &&
        p.investigation.recommendation !== "proceed_to_hearing" && (
          <div className="rounded-md border border-info/30 bg-info/10 text-info text-xs p-3">
            The investigation did not recommend a hearing (
            {recommendationLabel(p.investigation.recommendation)}). Close the
            case below, or escalate it if it needs to continue.
          </div>
        )}

      {/* Step 5 — hearing invitation */}
      {!closed && stage === "notice_of_allegations" && p.notice && (
        <StepCard
          locked={locked}
          title="Step 5 — Hearing invitation"
          hint="At least 48 hours' notice is required. The employee is emailed the formal invitation."
        >
          <HearingForm
            submitLabel="Send hearing invitation"
            minHours={48}
            pending={hearingMutation.isPending}
            onSubmit={(payload) => hearingMutation.mutate(payload)}
          />
        </StepCard>
      )}

      {/* Step 6 — minutes */}
      {!closed && stage === "hearing" && !p.hearingRecord && (
        <StepCard
          locked={locked}
          title="Step 6 — Hearing minutes"
          hint="Record what was said at the hearing and confirm the procedure was followed."
        >
          <div className="space-y-1.5">
            <Label className="text-xs">Minutes *</Label>
            <Textarea
              rows={5}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Procedure checklist</Label>
            {HEARING_CHECKLIST.map((c) => (
              <label key={c} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={checks.includes(c)}
                  onChange={(e) =>
                    setChecks(
                      e.target.checked
                        ? [...checks, c]
                        : checks.filter((x) => x !== c),
                    )
                  }
                />
                {c}
              </label>
            ))}
          </div>
          <SubmitButton
            label="Save minutes"
            pending={minutesMutation.isPending}
            disabled={minutes.trim().length < 10}
            onClick={() => minutesMutation.mutate()}
          />
        </StepCard>
      )}

      {/* Step 7 — finding */}
      {!closed && stage === "hearing" && p.hearingRecord && (
        <StepCard
          locked={locked}
          title="Step 7 — Finding & mitigation"
          hint="Decide whether the allegations are proven, and weigh mitigating and aggravating factors before choosing a sanction."
        >
          <div className="space-y-1.5">
            <Label className="text-xs">Finding *</Label>
            <Select
              value={findingDecision}
              onValueChange={(v) =>
                setFindingDecision(v as DisciplinaryFindingDecision)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FINDINGS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Reasons *</Label>
            <Textarea
              rows={3}
              value={findingReasons}
              onChange={(e) => setFindingReasons(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Mitigating factors</Label>
              <Textarea
                rows={2}
                value={mitigating}
                onChange={(e) => setMitigating(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Aggravating factors</Label>
              <Textarea
                rows={2}
                value={aggravating}
                onChange={(e) => setAggravating(e.target.value)}
              />
            </div>
          </div>
          <SubmitButton
            label="Record finding"
            pending={findingMutation.isPending}
            disabled={findingReasons.trim().length < 5}
            onClick={() => findingMutation.mutate()}
          />
        </StepCard>
      )}

      {/* Step 8 — sanction */}
      {!closed && stage === "finding" && p.finding && (
        <StepCard
          locked={locked}
          title="Step 8 — Sanction"
          hint="The employee is emailed the finding, the sanction and their right to appeal (5 working days)."
        >
          <div className="space-y-1.5">
            <Label className="text-xs">Sanction *</Label>
            <Select
              value={sanction}
              onValueChange={(v) => setSanction(v as DisputeOutcomeDecision)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISCIPLINARY_SANCTIONS.filter(
                  (s) =>
                    p.finding?.decision !== "not_guilty" ||
                    s.value === "no_action",
                ).map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {sanctionHasDuration(sanction) && (
            <DurationField
              label={
                durationRequired
                  ? "Duration of the suspension *"
                  : "Duration of the sanction (optional)"
              }
              value={durValue}
              unit={durUnit}
              onChange={(v, u) => {
                setDurValue(v);
                setDurUnit(u);
              }}
            />
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Reasons for the sanction</Label>
            <Textarea
              rows={3}
              value={sanctionNotes}
              onChange={(e) => setSanctionNotes(e.target.value)}
            />
          </div>
          <SubmitButton
            label="Record sanction"
            pending={sanctionMutation.isPending}
            disabled={durationMissing}
            onClick={() => sanctionMutation.mutate()}
          />
        </StepCard>
      )}

      {/* Waiting on the employee */}
      {!closed &&
        stage === "outcome" &&
        dispute.outcome &&
        dispute.outcome.decision !== "no_action" &&
        !dispute.appeal && (
          <div className="rounded-md border border-info/30 bg-info/10 text-info text-xs p-3">
            The employee has been notified of the sanction and may appeal from
            their own dashboard within 5 working days. If they do, you'll be
            able to schedule the appeal hearing here.
          </div>
        )}

      {/* Step 9 — appeal (filed by the employee) */}
      {dispute.appeal && (
        <RecordBox title="Appeal filed by the employee">
          <p>{dispute.appeal.grounds}</p>
          <p className="text-muted-foreground">
            Filed {fmtDate(dispute.appeal.filedAt)}
          </p>
        </RecordBox>
      )}
      {!closed && appealOpen && !dispute.appeal?.hearing && (
        <StepCard
          locked={locked}
          title="Step 9 — Schedule appeal hearing"
          hint="The appeal must be heard by someone different from, and more senior than, the original chairperson."
        >
          <HearingForm
            withChairperson
            submitLabel="Schedule appeal hearing"
            pending={appealHearingMutation.isPending}
            onSubmit={(payload) => appealHearingMutation.mutate(payload)}
          />
        </StepCard>
      )}
      {!closed && appealOpen && dispute.appeal?.hearing && (
        <StepCard
          locked={locked}
          title="Step 9 — Record appeal outcome"
          hint="The appeal outcome is final within the internal process."
        >
          <div className="space-y-1.5">
            <Label className="text-xs">Decision *</Label>
            <Select
              value={apDecision}
              onValueChange={(v) => setApDecision(v as AppealDecision)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPEAL_DECISIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {apDecision === "partially_upheld" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Reduced sanction *</Label>
              <Select
                value={apSanction}
                onValueChange={(v) =>
                  setApSanction(v as DisputeOutcomeDecision)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISCIPLINARY_SANCTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {apDecision === "partially_upheld" &&
            sanctionHasDuration(apSanction) && (
              <DurationField
                label={
                  apSanction === "suspension_without_pay"
                    ? "Duration of the reduced sanction *"
                    : "Duration of the reduced sanction (optional)"
                }
                value={apDurValue}
                unit={apDurUnit}
                onChange={(v, u) => {
                  setApDurValue(v);
                  setApDurUnit(u);
                }}
              />
            )}
          <div className="space-y-1.5">
            <Label className="text-xs">Reasons *</Label>
            <Textarea
              rows={3}
              value={apReasons}
              onChange={(e) => setApReasons(e.target.value)}
            />
          </div>
          <SubmitButton
            label="Record appeal outcome"
            pending={appealOutcomeMutation.isPending}
            disabled={
              apReasons.trim().length < 5 ||
              (apDecision === "partially_upheld" &&
                apSanction === "suspension_without_pay" &&
                !toDuration(apDurValue, apDurUnit))
            }
            onClick={() => appealOutcomeMutation.mutate()}
          />
        </StepCard>
      )}

      {/* Dismissal → Terminate. Same hand-off as the employee details
          sheet: the offboarding tab with the employee pre-selected.
          Dismissals never terminate anyone automatically. */}
      {showTerminate && respondent && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 space-y-2">
          <p className="text-xs">
            {appealOpen
              ? "The sanction is a dismissal, but the employee has appealed. Terminate becomes available once the appeal is decided."
              : dispute.appeal?.resolvedAt
                ? "The sanction is a dismissal and it stands after the appeal."
                : "The sanction is a dismissal. Terminating starts the offboarding for this employee."}
          </p>
          <Button
            size="sm"
            variant="secondary"
            className="bg-red-500 hover:bg-red-600 text-white border-destructive/30"
            disabled={appealOpen}
            onClick={() =>
              navigate(
                `/hr/recruitment?tab=offboarding&newOffboarding=${respondent._id}`,
              )
            }
          >
            <UserX className="h-4 w-4 mr-2" /> Terminate
          </Button>
        </div>
      )}
    </div>
  );
}
