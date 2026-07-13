import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Scale,
  ShieldAlert,
  ArrowUpRight,
  ClipboardCheck,
  Search as SearchIcon,
  Gavel,
  CheckCircle2,
  ArrowUpCircle,
  Lock,
  FileIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchTeamDisputeCases,
  fetchDisputeCaseByIdAsManager,
  acknowledgeDisputeAsManager,
  investigateDisputeAsManager,
  scheduleDisputeHearingAsManager,
  closeDisputeCaseAsManager,
  escalateDisputeToTenant,
  type DisputeCase,
  isImageFile,
  resolveDisputeFileUrl,
} from "@/lib/hr-dispute-api";

// ── helpers ────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    open: { label: "Open", className: "bg-info/10 text-info border-info/20" },
    under_investigation: {
      label: "Investigating",
      className: "bg-warning/10 text-warning border-warning/20",
    },
    hearing_scheduled: {
      label: "Hearing",
      className: "bg-secondary/10 text-secondary border-secondary/20",
    },
    outcome_recorded: {
      label: "Outcome",
      className: "bg-primary/10 text-primary border-primary/20",
    },
    appealed: {
      label: "Appealed",
      className: "bg-destructive/10 text-destructive border-destructive/20",
    },
    closed: {
      label: "Closed",
      className: "bg-success/10 text-success border-success/20",
    },
    escalated_external: {
      label: "Escalated",
      className: "bg-destructive/10 text-destructive border-destructive/20",
    },
  };
  const { label, className } = map[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={`text-[10px] ${className}`}>
      {label}
    </Badge>
  );
}

// ── Main page ─────────────────────────────────────────────

export default function TeamDisputes() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["team-disputes"],
    queryFn: fetchTeamDisputeCases,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter(
      (c) =>
        c.caseNumber.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        (c.complainant &&
          `${c.complainant.firstName} ${c.complainant.lastName}`
            .toLowerCase()
            .includes(q)),
    );
  }, [cases, search]);

  const stats = {
    total: cases.length,
    open: cases.filter((c) => c.status === "open").length,
    investigating: cases.filter((c) => c.status === "under_investigation")
      .length,
    hearing: cases.filter((c) => c.status === "hearing_scheduled").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gavel className="h-6 w-6" />
          Team Disputes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage disputes logged by employees who report to you. Acknowledge
          cases, investigate, and either resolve them yourself or escalate to HR
          if you're unable to reach a resolution.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total" value={stats.total} icon={Scale} />
        <Stat label="Open" value={stats.open} icon={ShieldAlert} />
        <Stat
          label="Investigating"
          value={stats.investigating}
          icon={ClipboardCheck}
        />
        <Stat label="Hearing" value={stats.hearing} icon={Gavel} />
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search case, employee or type…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading team disputes…</span>
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Scale className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No dispute cases from your direct reports yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Team member</TableHead>
                  <TableHead>Filed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d._id}>
                    <TableCell className="font-mono text-xs">
                      {d.caseNumber}
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {d.type}
                    </TableCell>
                    <TableCell className="text-sm">
                      {d.complainant
                        ? `${d.complainant.firstName} ${d.complainant.lastName}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(d.filedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={d.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveId(d._id)}
                      >
                        Manage <ArrowUpRight className="h-3 w-3 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ManageCaseSheet caseId={activeId} onClose={() => setActiveId(null)} />
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: any;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Manage sheet ───────────────────────────────────────────

function ManageCaseSheet({
  caseId,
  onClose,
}: {
  caseId: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [ackText, setAckText] = useState("");
  const [ackNote, setAckNote] = useState("");
  const [findings, setFindings] = useState("");
  const [invNote, setInvNote] = useState("");
  const [hearingDate, setHearingDate] = useState("");
  const [hearingMode, setHearingMode] = useState<"physical" | "online">("physical");
  const [hearingVenue, setHearingVenue] = useState("");
  const [hearingPlatform, setHearingPlatform] = useState<"google_meet" | "microsoft_teams" | "zoom">("zoom");
  const [hearingLink, setHearingLink] = useState("");
  const [hearingNote, setHearingNote] = useState("");
  const [closeReport, setCloseReport] = useState("");
  const [escalateReason, setEscalateReason] = useState("");

  const { data: dispute, isLoading } = useQuery({
    queryKey: ["dispute-case", caseId],
    queryFn: () => fetchDisputeCaseByIdAsManager(caseId!),
    enabled: !!caseId,
  });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["team-disputes"] });
    queryClient.invalidateQueries({ queryKey: ["dispute-case", caseId] });
  };

  const ackMut = useMutation({
    mutationFn: (dto: { acknowledgmentText: string; notes?: string }) =>
      acknowledgeDisputeAsManager(caseId!, dto),
    onSuccess: () => {
      toast.success("Case acknowledged.");
      setAckText("");
      setAckNote("");
      invalidate();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to acknowledge"),
  });

  const invMut = useMutation({
    mutationFn: (dto: { findings: string; notes?: string }) =>
      investigateDisputeAsManager(caseId!, dto),
    onSuccess: () => {
      toast.success("Investigation finding recorded.");
      setFindings("");
      setInvNote("");
      invalidate();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to record findings"),
  });

  const hearMut = useMutation({
    mutationFn: (dto: {
      scheduledAt: string;
      mode: "physical" | "online";
      venue?: string;
      meetingPlatform?: "google_meet" | "microsoft_teams" | "zoom";
      meetingLink?: string;
      notes?: string;
    }) => scheduleDisputeHearingAsManager(caseId!, dto),
    onSuccess: () => {
      toast.success("Hearing scheduled. Both parties have been notified.");
      setHearingDate("");
      setHearingMode("physical");
      setHearingVenue("");
      setHearingPlatform("google_meet");
      setHearingLink("");
      setHearingNote("");
      invalidate();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to schedule hearing"),
  });

  const closeMut = useMutation({
    mutationFn: () =>
      closeDisputeCaseAsManager(caseId!, { notes: closeReport.trim() }),
    onSuccess: () => {
      toast.success("Case resolved and closed. HR can see the full report.");
      setCloseReport("");
      invalidate();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to close case"),
  });

  const escalateMut = useMutation({
    mutationFn: () =>
      escalateDisputeToTenant(caseId!, escalateReason.trim() || undefined),
    onSuccess: () => {
      toast.success("Case escalated to HR.");
      setEscalateReason("");
      invalidate();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to escalate case"),
  });

  const d = dispute as DisputeCase | undefined;
  const isClosed = d?.status === "closed";
  const isEscalated = d?.resolverLevel === "tenant";
  const canResolveOrEscalate = d && !isClosed && !isEscalated;

  return (
    <Sheet open={!!caseId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{d ? `${d.caseNumber} — ${d.type}` : "Case"}</SheetTitle>
        </SheetHeader>

        {isLoading || !d ? (
          <div className="flex items-center gap-2 py-16 justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading case…</span>
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {/* Summary */}
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={d.status} />
                  <Badge variant="outline" className="text-[10px] capitalize">
                    Stage: {d.stage.replace(/_/g, " ")}
                  </Badge>
                </div>
                {d.complainant && (
                  <p>
                    <span className="text-muted-foreground">Filed by:</span>{" "}
                    <strong>
                      {d.complainant.firstName} {d.complainant.lastName}
                    </strong>{" "}
                    · {d.complainant.jobTitle}
                  </p>
                )}
                {d.respondents && d.respondents.length > 0 && (
                  <p>
                    <span className="text-muted-foreground">
                      Employees involved:
                    </span>{" "}
                    {d.respondents
                      .map((r) => `${r.firstName} ${r.lastName}`)
                      .join(", ")}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Filed {new Date(d.filedAt).toLocaleDateString()}
                </p>
                <p className="pt-1">{d.description}</p>
                {d.witnesses?.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Witnesses: {d.witnesses.join(", ")}
                  </p>
                )}

                {/* Grievance-specific detail */}
                {d.type === "grievance" && (
                  <div className="pt-2 border-t space-y-1.5">
                    {d.natureOfGrievance && (
                      <p>
                        <span className="text-muted-foreground">
                          Nature of grievance:
                        </span>{" "}
                        <span className="capitalize">
                          {d.natureOfGrievance.replace(/_/g, " ")}
                        </span>
                      </p>
                    )}
                    {d.adverseEffect && (
                      <p>
                        <span className="text-muted-foreground block">
                          How this affected them:
                        </span>{" "}
                        {d.adverseEffect}
                      </p>
                    )}
                    {d.informalResolutionSteps && (
                      <p>
                        <span className="text-muted-foreground block">
                          Informal resolution steps taken:
                        </span>{" "}
                        {d.informalResolutionSteps}
                      </p>
                    )}
                    {d.desiredOutcome && (
                      <p>
                        <span className="text-muted-foreground block">
                          Outcome/remedy sought:
                        </span>{" "}
                        {d.desiredOutcome}
                      </p>
                    )}
                  </div>
                )}

                {/* Report-specific detail */}
                {d.type === "report" && d.adverseEffect && (
                  <div className="pt-2 border-t">
                    <p>
                      <span className="text-muted-foreground block">
                        How this affected them:
                      </span>{" "}
                      {d.adverseEffect}
                    </p>
                  </div>
                )}

                {/* Incident-specific detail */}
                {d.type === "incident" && (
                  <div className="pt-2 border-t space-y-1.5">
                    {d.causeOfIncident && (
                      <p>
                        <span className="text-muted-foreground block">
                          Believed cause:
                        </span>{" "}
                        {d.causeOfIncident}
                      </p>
                    )}
                    {d.injurySeverity && (
                      <p>
                        <span className="text-muted-foreground">
                          Injury / medical treatment:
                        </span>{" "}
                        <span className="capitalize">
                          {d.injurySeverity.replace(/_/g, " ")}
                        </span>
                      </p>
                    )}
                    {d.natureOfInjury && (
                      <p>
                        <span className="text-muted-foreground block">
                          Nature of injury / body part:
                        </span>{" "}
                        {d.natureOfInjury}
                      </p>
                    )}
                    {d.medicalTreatmentProvided && (
                      <p>
                        <span className="text-muted-foreground block">
                          Medical treatment provided:
                        </span>{" "}
                        {d.medicalTreatmentProvided}
                      </p>
                    )}
                  </div>
                )}

                {/* Respondent response */}
                {d.respondentResponses && d.respondentResponses.length > 0 && (
                  <div className="pt-2 border-t space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Response from respondent
                    </p>
                    {d.respondentResponses.map((r, i) => (
                      <div key={i} className="rounded-md bg-muted/40 p-2">
                        {r.respondent && (
                          <p className="text-[11px] text-muted-foreground">
                            {r.respondent.firstName} {r.respondent.lastName} ·{" "}
                            {new Date(r.respondedAt).toLocaleString()}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap">{r.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Attachments */}
                {d.supportingDocs && d.supportingDocs.length > 0 && (
                  <div className="pt-2 border-t space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Attachments
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {d.supportingDocs.map((doc, i) =>
                        isImageFile(doc.url) ? (
                          <a
                            key={i}
                            href={resolveDisputeFileUrl(doc.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={resolveDisputeFileUrl(doc.url)}
                              alt={doc.name}
                              className="h-20 w-20 object-cover rounded-md border"
                            />
                          </a>
                        ) : (
                          <a
                            key={i}
                            href={resolveDisputeFileUrl(doc.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs border rounded-md px-2 py-1 hover:bg-muted"
                          >
                            <FileIcon className="h-3.5 w-3.5" />
                            {doc.name}
                          </a>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Escalated banner */}
            {isEscalated && (
              <div className="rounded-md border border-warning/30 bg-warning/10 text-warning text-xs p-3 flex items-center gap-2">
                <ArrowUpCircle className="h-4 w-4" />
                This case has been escalated to HR. You no longer manage it — HR
                will take it from here.
              </div>
            )}

            {/* Closed banner */}
            {isClosed && (
              <div className="rounded-md border border-success/30 bg-success/10 text-success text-xs p-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                You resolved and closed this case. HR can see the full report
                below.
              </div>
            )}

            {/* Acknowledge */}
            {canResolveOrEscalate && d.status === "open" && (
              <Section title="Acknowledge case">
                <p className="text-xs text-muted-foreground">
                  Confirm receipt of the complaint within 2 working days.
                </p>
                <Input
                  placeholder="Acknowledgment text (shown to reporter)…"
                  value={ackText}
                  onChange={(e) => setAckText(e.target.value)}
                />
                <Button
                  size="sm"
                  disabled={!ackText.trim() || ackMut.isPending}
                  onClick={() =>
                    ackMut.mutate({
                      acknowledgmentText: ackText.trim(),
                      notes: ackNote.trim() || undefined,
                    })
                  }
                >
                  {ackMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Acknowledge"
                  )}
                </Button>
              </Section>
            )}

            {/* Investigate */}
            {canResolveOrEscalate &&
              (d.status === "open" || d.status === "under_investigation") && (
                <Section title="Investigation finding">
                  <p className="text-xs text-muted-foreground">
                    Add interview notes, evidence review, or observations. HR
                    sees every entry you submit.
                  </p>
                  <Textarea
                    rows={3}
                    placeholder="Findings *"
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                  />
                  <Button
                    size="sm"
                    disabled={!findings.trim() || invMut.isPending}
                    onClick={() =>
                      invMut.mutate({
                        findings: findings.trim(),
                        notes: invNote.trim() || undefined,
                      })
                    }
                  >
                    {invMut.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Submit finding"
                    )}
                  </Button>
                </Section>
              )}

            {/* Schedule hearing */}
            {canResolveOrEscalate &&
              d.status === "under_investigation" &&
              d.type !== "incident" && (
                <Section title="Schedule hearing">
                  <p className="text-xs text-muted-foreground">
                    Schedule within 5 working days of closing investigation.
                    Both the employee who filed and everyone named will be
                    emailed automatically.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Date & time *</Label>
                      <Input
                        type="datetime-local"
                        value={hearingDate}
                        onChange={(e) => setHearingDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Format *</Label>
                      <Select
                        value={hearingMode}
                        onValueChange={(v) =>
                          setHearingMode(v as "physical" | "online")
                        }
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

                  {hearingMode === "physical" ? (
                    <div>
                      <Label className="text-xs">Venue *</Label>
                      <Input
                        value={hearingVenue}
                        onChange={(e) => setHearingVenue(e.target.value)}
                        placeholder="HR Boardroom"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Platform *</Label>
                        <Select
                          value={hearingPlatform}
                          onValueChange={(v) =>
                            setHearingPlatform(
                              v as "google_meet" | "microsoft_teams" | "zoom",
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="google_meet">
                              Google Meet
                            </SelectItem>
                            <SelectItem value="microsoft_teams">
                              Microsoft Teams
                            </SelectItem>
                            <SelectItem value="zoom">Zoom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Meeting link *</Label>
                        <Input
                          value={hearingLink}
                          onChange={(e) => setHearingLink(e.target.value)}
                          placeholder="https://…"
                        />
                      </div>
                    </div>
                  )}

                  <Textarea
                    rows={2}
                    placeholder="Notes (optional)"
                    value={hearingNote}
                    onChange={(e) => setHearingNote(e.target.value)}
                  />
                  <Button
                    size="sm"
                    disabled={
                      !hearingDate ||
                      (hearingMode === "physical"
                        ? !hearingVenue.trim()
                        : !hearingLink.trim()) ||
                      hearMut.isPending
                    }
                    onClick={() =>
                      hearMut.mutate({
                        scheduledAt: new Date(hearingDate).toISOString(),
                        mode: hearingMode,
                        venue:
                          hearingMode === "physical"
                            ? hearingVenue.trim()
                            : undefined,
                        meetingPlatform:
                          hearingMode === "online"
                            ? hearingPlatform
                            : undefined,
                        meetingLink:
                          hearingMode === "online"
                            ? hearingLink.trim()
                            : undefined,
                        notes: hearingNote.trim() || undefined,
                      })
                    }
                  >
                    {hearMut.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Schedule hearing"
                    )}
                  </Button>
                </Section>
              )}

            {/* Resolution — the two outcomes */}
            {canResolveOrEscalate && (
              <Section title="Resolution">
                <p className="text-xs text-muted-foreground">
                  Once you've reached an outcome, either close the case with a
                  report of how it was handled, or escalate to HR if you weren't
                  able to resolve it.
                </p>

                <div className="space-y-2 border rounded-md p-3">
                  <p className="text-xs font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    Resolved — close the case
                  </p>
                  <Textarea
                    rows={3}
                    placeholder="Report of the interaction — what happened, what was agreed, and the outcome. HR will see this."
                    value={closeReport}
                    onChange={(e) => setCloseReport(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!closeReport.trim() || closeMut.isPending}
                    onClick={() => closeMut.mutate()}
                  >
                    {closeMut.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Resolve & close case"
                    )}
                  </Button>
                </div>

                <div className="space-y-2 border rounded-md p-3">
                  <p className="text-xs font-medium flex items-center gap-1.5">
                    <ArrowUpCircle className="h-3.5 w-3.5 text-warning" />
                    Unresolved — escalate to HR
                  </p>
                  <Textarea
                    rows={2}
                    placeholder="Reason for escalation (optional)"
                    value={escalateReason}
                    onChange={(e) => setEscalateReason(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={escalateMut.isPending}
                    onClick={() => escalateMut.mutate()}
                  >
                    {escalateMut.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Escalate to HR"
                    )}
                  </Button>
                </div>
              </Section>
            )}

            {/* Stage history trail */}
            {d.stageHistory?.length > 0 && (
              <Section title="Stage history">
                <ul className="space-y-2 text-sm">
                  {d.stageHistory.map((h, i) => (
                    <li key={i} className="border rounded-md p-2">
                      <p className="text-xs text-muted-foreground capitalize">
                        {h.stage.replace(/_/g, " ")} ·{" "}
                        {new Date(h.enteredAt).toLocaleString()}
                      </p>
                      {h.notes && <p className="text-sm mt-1">{h.notes}</p>}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {d.hearing && (
              <Section title="Hearing">
                <p className="text-xs text-muted-foreground">
                  {new Date(d.hearing.scheduledAt).toLocaleString()}
                </p>
                {d.hearing.mode === "online" ? (
                  <p className="text-sm">
                    Online ·{" "}
                    {d.hearing.meetingPlatform === "google_meet"
                      ? "Google Meet"
                      : d.hearing.meetingPlatform === "microsoft_teams"
                        ? "Microsoft Teams"
                        : "Zoom"}{" "}
                    ·{" "}
                    <a
                      href={d.hearing.meetingLink ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Join link
                    </a>
                  </p>
                ) : (
                  <p className="text-sm">In person · {d.hearing.venue}</p>
                )}
                {d.hearing.notes && (
                  <p className="text-sm">{d.hearing.notes}</p>
                )}
              </Section>
            )}

            {d.outcome && (
              <Section title="Outcome (HR)">
                <p className="text-xs text-muted-foreground">
                  {new Date(d.outcome.recordedAt).toLocaleString()}
                </p>
                <Badge variant="outline" className="capitalize">
                  {d.outcome.decision.replace(/_/g, " ")}
                </Badge>
                {d.outcome.notes && (
                  <p className="text-sm">{d.outcome.notes}</p>
                )}
              </Section>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <p className="text-sm font-semibold">{title}</p>
      {children}
    </div>
  );
}
