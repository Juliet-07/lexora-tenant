import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchTeamDisputeCases,
  fetchDisputeCaseById,
  acknowledgeDisputeCase,
  investigateDisputeCase,
  scheduleDisputeHearing,
  type DisputeCase,
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

  const {
    data: cases = [],
    isLoading,
  } = useQuery({
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
          cases, record investigation findings, and schedule hearings. HR
          remains the case owner for outcomes and appeals.
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

      <ManageCaseSheet
        caseId={activeId}
        onClose={() => setActiveId(null)}
      />
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
  const [hearingVenue, setHearingVenue] = useState("");
  const [hearingNote, setHearingNote] = useState("");

  const { data: dispute, isLoading } = useQuery({
    queryKey: ["dispute-case", caseId],
    queryFn: () => fetchDisputeCaseById(caseId!),
    enabled: !!caseId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["team-disputes"] });
    queryClient.invalidateQueries({ queryKey: ["dispute-case", caseId] });
  };

  const ackMut = useMutation({
    mutationFn: (dto: { acknowledgmentText: string; notes?: string }) =>
      acknowledgeDisputeCase(caseId!, dto),
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
      investigateDisputeCase(caseId!, dto),
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
    mutationFn: (dto: { scheduledAt: string; venue: string; notes?: string }) =>
      scheduleDisputeHearing(caseId!, dto),
    onSuccess: () => {
      toast.success("Hearing scheduled.");
      setHearingDate("");
      setHearingVenue("");
      setHearingNote("");
      invalidate();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to schedule hearing"),
  });

  const d = dispute as DisputeCase | undefined;

  return (
    <Sheet open={!!caseId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {d ? `${d.caseNumber} — ${d.type}` : "Case"}
          </SheetTitle>
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
                <p className="text-xs text-muted-foreground">
                  Filed {new Date(d.filedAt).toLocaleDateString()}
                </p>
                <p className="pt-1">{d.description}</p>
                {d.witnesses?.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Witnesses: {d.witnesses.join(", ")}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Acknowledge */}
            {d.status === "open" && (
              <Section title="Acknowledge case">
                <p className="text-xs text-muted-foreground">
                  Confirm receipt of the complaint within 2 working days.
                </p>
                <Input
                  placeholder="Acknowledgment text (shown to reporter)…"
                  value={ackText}
                  onChange={(e) => setAckText(e.target.value)}
                />
                <Textarea
                  rows={2}
                  placeholder="Internal notes (optional)"
                  value={ackNote}
                  onChange={(e) => setAckNote(e.target.value)}
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
            {(d.status === "open" ||
              d.status === "under_investigation") && (
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
                <Textarea
                  rows={2}
                  placeholder="Additional notes (optional)"
                  value={invNote}
                  onChange={(e) => setInvNote(e.target.value)}
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
            {d.status === "under_investigation" && (
              <Section title="Schedule hearing">
                <p className="text-xs text-muted-foreground">
                  Schedule within 5 working days of closing investigation.
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
                    <Label className="text-xs">Venue *</Label>
                    <Input
                      value={hearingVenue}
                      onChange={(e) => setHearingVenue(e.target.value)}
                      placeholder="HR Boardroom"
                    />
                  </div>
                </div>
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
                    !hearingVenue.trim() ||
                    hearMut.isPending
                  }
                  onClick={() =>
                    hearMut.mutate({
                      scheduledAt: new Date(hearingDate).toISOString(),
                      venue: hearingVenue.trim(),
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
                  {new Date(d.hearing.scheduledAt).toLocaleString()} ·{" "}
                  {d.hearing.venue}
                </p>
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
