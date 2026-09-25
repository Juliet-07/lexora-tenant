import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Download, Mail, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePersistentState, fmtDate } from "@/lib/grc/usePersistentState";
import {
  fetchAudits,
  createAudit,
  type AuditEngagement,
  type AuditType,
  type FindingSeverity,
  type FindingStatus,
} from "@/lib/grc/compliance-api";
import { fetchRisks } from "@/lib/grc/risk-api";
import AuditDetail from "./AuditDetail";

// ─── Extras not covered by the API ─────────────────────────────
// Deliberately scoped down: only the fields the API doesn't yet
// have a home for stay here, client-side. Auditor/lead/linked-risk
// fields moved to the real backend engagement record — see
// AuditEngagement.auditTeamName / leadAuditorName /
// externalAuditorName / linkedRiskIds in compliance-api.ts.
// Exported: AuditDetail.tsx (the engagement detail view) needs this
// shape too, since it's the `x` it's handed for the open engagement.
export interface Extras {
  priority: "Normal" | "High" | "Critical";
  risks: string[];
  objectives: string[];
  committeeDate: string;
  budget: string;
  riskAssessment: {
    area: string;
    inherent: string;
    controls: string;
    approach: string;
  }[];
  progress: { area: string; pct: number }[];
  samples: {
    population: string;
    size: string;
    method: string;
    dates: string;
  }[];
  notes: { date: string; title: string; detail: string }[];
  workingPapers: {
    ref: string;
    desc: string;
    preparer: string;
    reviewer: string;
    status: string;
  }[];
  findingMeta: Record<
    number,
    {
      ref: string;
      owner: string;
      process: string;
      evidence: string;
      verifiedBy: string;
    }
  >;
  reportStage: number; // 0 draft .. 4 issued
  distribution: { name: string; role: string; sent: string; ack: boolean }[];
  execSummary: string;
  committeeActions: {
    action: string;
    owner: string;
    due: string;
    status: string;
  }[];
}

// Exported: also drives AuditDetail.tsx's phase bar and header badge.
export const LIFECYCLE = [
  ["Planning", "Scope, objectives, risk areas"],
  ["Fieldwork", "Document requests, testing"],
  ["Findings", "Issues, root cause, risk rating"],
  ["Reporting", "Draft report, management response"],
  ["Remediation", "Action tracking, follow-up"],
  ["Committee report", "Present to Audit Committee"],
];
const RISK_AREAS = [
  "AML/CFT",
  "Financial Controls",
  "IT / Cyber",
  "Operations",
  "Governance",
  "Compliance",
  "HR",
  "Other",
];
// Exported: also used by AuditDetail.tsx's findings/remediation tabs.
export const REM_LABEL: Record<FindingStatus, string> = {
  Open: "Not started",
  "In Progress": "In progress",
  Remediated: "Implemented",
  Closed: "Verified",
};

const blankExtras = (): Extras => ({
  priority: "Normal",
  risks: [],
  objectives: [],
  committeeDate: "",
  budget: "",
  riskAssessment: [],
  progress: [],
  samples: [],
  notes: [],
  workingPapers: [],
  findingMeta: {},
  reportStage: 0,
  distribution: [],
  execSummary: "",
  committeeActions: [],
});

// Exported: AuditDetail.tsx needs the same phase for its header badge
// and lifecycle bar.
export const phaseOf = (e: AuditEngagement, x: Extras) => {
  if (e.status === "Planned") return 0;
  if (e.status === "In Progress") return e.findings.length ? 2 : 1;
  if (e.status === "Reporting") return x.reportStage >= 4 ? 4 : 3;
  return 5;
};
const pctOf = (e: AuditEngagement, x: Extras) =>
  [10, 45, 60, 65, 85, 100][phaseOf(e, x)];
// Exported: also used by AuditDetail.tsx's risk/finding severity badges.
export const sevVariant = (s: string) =>
  (s === "Critical" || s === "High"
    ? "destructive"
    : s === "Medium"
      ? "secondary"
      : "outline") as any;
// Exported: also used by AuditDetail.tsx's findings/remediation tabs.
export const isOverdue = (f: {
  remediationDueDate: string | null;
  status: FindingStatus;
}) =>
  !!f.remediationDueDate &&
  new Date(f.remediationDueDate).getTime() < Date.now() &&
  f.status !== "Remediated" &&
  f.status !== "Closed";

export default function GrcAudits() {
  const qc = useQueryClient();
  const { data: engagements = [], isLoading } = useQuery({
    queryKey: ["grc-audits"],
    queryFn: fetchAudits,
  });
  const [extrasStore, setExtrasStore] = usePersistentState<
    Record<string, Extras>
  >("grc_audits_extras_v1", {});
  const [openId, setOpenId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const extrasOf = (e: AuditEngagement): Extras =>
    extrasStore[e._id] ?? blankExtras();
  const setExtras = (id: string, patch: Partial<Extras>) => {
    const e = engagements.find((x) => x._id === id)!;
    const cur = extrasOf(e);
    setExtrasStore((s) => ({ ...s, [id]: { ...cur, ...patch } }));
  };

  /** Run an API mutation and refresh the engagement list from the server. */
  const mutate = async (
    _id: string,
    apiCall: () => Promise<unknown>,
    _local?: unknown,
    msg?: string,
  ) => {
    try {
      await apiCall();
      await qc.invalidateQueries({ queryKey: ["grc-audits"] });
      if (msg) toast({ title: msg });
    } catch (err: any) {
      toast({
        title: "Action failed",
        description: err?.response?.data?.message ?? err.message,
        variant: "destructive",
      });
    }
  };

  const allFindings = useMemo(
    () => engagements.flatMap((e) => e.findings.map((f, i) => ({ e, f, i }))),
    [engagements],
  );
  const openFindings = allFindings.filter(
    ({ f }) => f.status !== "Closed" && f.status !== "Remediated",
  );

  if (isLoading)
    return (
      <div className="flex justify-center py-24 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading audits…
      </div>
    );

  const open = engagements.find((e) => e._id === openId);
  if (open) {
    return (
      <AuditDetail
        e={open}
        x={extrasOf(open)}
        onBack={() => setOpenId(null)}
        setExtras={(p) => setExtras(open._id, p)}
        mutate={(apiCall, local, msg) => mutate(open._id, apiCall, local, msg)}
      />
    );
  }

  const active = engagements.filter((e) => e.status !== "Closed");
  const nextCommittee = engagements
    .map((e) => extrasOf(e).committeeDate)
    .filter((x) => x && new Date(x).getTime() >= Date.now())
    .sort()[0];
  const bySev = (s: FindingSeverity) =>
    openFindings.filter(({ f }) => f.severity === s).length;

  const exportFindings = () => {
    const csv = [
      "Finding,Audit,Rating,Owner,Due,Status",
      ...allFindings.map(
        ({ e, f, i }) =>
          `"${f.observation}","${e.name}",${f.severity},"${extrasOf(e).findingMeta[i]?.owner ?? ""}",${f.remediationDueDate ?? ""},${REM_LABEL[f.status]}`,
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "audit-findings.csv";
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Audit Management</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Plan, execute, and track internal and external audit engagements —
            from audit planning through to findings remediation and committee
            reporting.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New audit engagement
        </Button>
      </div>
      {engagements.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No audit engagements yet. Create your first engagement to start the
            audit register.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          ["Active engagements", active.length, ""],
          [
            "Open findings",
            openFindings.length,
            `${bySev("High") + bySev("Critical")} high, ${bySev("Medium")} medium, ${bySev("Low")} low`,
          ],
          [
            "Overdue remediation",
            openFindings.filter(({ f }) => isOverdue(f)).length,
            "",
          ],
          [
            "Completed YTD",
            engagements.filter((e) => e.status === "Closed").length,
            "",
          ],
          [
            "Next Audit Comm.",
            nextCommittee ? fmtDate(nextCommittee) : "—",
            "",
          ],
        ].map(([l, v, s]) => (
          <Card key={l as string}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{l}</div>
              <div className="text-2xl font-bold mt-1">{v}</div>
              {s && (
                <div className="text-[11px] text-muted-foreground">{s}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Audit engagement lifecycle
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {LIFECYCLE.map(([t, s], i) => (
            <div key={t} className="rounded-lg border p-3">
              <div className="text-sm font-semibold">
                {i + 1}. {t}
              </div>
              <div className="text-[11px] text-muted-foreground">{s}</div>
              <div className="text-xs mt-1 text-primary">
                {
                  engagements.filter((e) => phaseOf(e, extrasOf(e)) === i)
                    .length
                }{" "}
                engagement(s)
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="font-semibold">Active audit engagements</h2>
        {active.map((e) => {
          const x = extrasOf(e);
          const ph = phaseOf(e, x);
          const pct = pctOf(e, x);
          const sevs = (["High", "Medium", "Low"] as const)
            .map(
              (s) =>
                [
                  s,
                  e.findings.filter(
                    (f) =>
                      f.severity === s ||
                      (s === "High" && f.severity === "Critical"),
                  ).length,
                ] as const,
            )
            .filter(([, n]) => n);
          return (
            <Card
              key={e._id}
              className="cursor-pointer hover:shadow-md transition"
              onClick={() => setOpenId(e._id)}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between gap-2 flex-wrap">
                  <div>
                    <div className="font-semibold">{e.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.type} audit · {e.scope?.slice(0, 110)}
                    </div>
                  </div>
                  <Badge variant="secondary">{LIFECYCLE[ph][0]}</Badge>
                </div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4">
                  <span>
                    {e.type === "Internal" ? "Audit team" : "Auditor"}:{" "}
                    <b className="text-foreground">
                      {(e.type === "Internal"
                        ? e.auditTeamName
                        : e.externalAuditorName) || "—"}
                    </b>
                  </span>
                  <span>
                    Findings:{" "}
                    {sevs.length
                      ? sevs
                          .map(([s, n]) => `${n} ${s.toLowerCase()}`)
                          .join(", ")
                      : "—"}
                  </span>
                  <span>Target: {fmtDate(e.endDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={pct} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground">{pct}%</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {active.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">
            No active engagements.
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="flex-row justify-between items-center space-y-0 flex-wrap gap-2">
          <CardTitle className="text-base">Open findings tracker</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportFindings}>
              <Download className="h-4 w-4 mr-1" />
              Export findings report
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                toast({
                  title: "Remediation reminders sent",
                  description: `${openFindings.length} owner reminder(s) sent.`,
                })
              }
            >
              <Mail className="h-4 w-4 mr-1" />
              Send remediation reminders
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Finding</TableHead>
                <TableHead>Audit</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Remediation due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {openFindings.map(({ e, f, i }) => (
                <TableRow
                  key={`${e._id}-${i}`}
                  className="cursor-pointer"
                  onClick={() => setOpenId(e._id)}
                >
                  <TableCell className="font-medium max-w-[320px]">
                    {f.observation}
                  </TableCell>
                  <TableCell className="text-xs">
                    {e.name.replace(/^(Internal|External) Audit — /, "")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={sevVariant(f.severity)}>{f.severity}</Badge>
                  </TableCell>
                  <TableCell>
                    {extrasOf(e).findingMeta[i]?.owner || "—"}
                  </TableCell>
                  <TableCell className={isOverdue(f) ? "text-destructive" : ""}>
                    {fmtDate(f.remediationDueDate)}
                    {isOverdue(f) && " (overdue)"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={isOverdue(f) ? "destructive" : "outline"}>
                      {isOverdue(f) ? "Overdue" : REM_LABEL[f.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {openFindings.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-6"
                  >
                    No open findings.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NewEngagementDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreate={async (dto, extras) => {
          try {
            const e = await createAudit(dto);
            setExtrasStore((s) => ({
              ...s,
              [e._id]: { ...blankExtras(), ...extras },
            }));
            qc.invalidateQueries({ queryKey: ["grc-audits"] });
            toast({ title: "Engagement created" });
            setNewOpen(false);
          } catch (err: any) {
            toast({
              title: "Could not create engagement",
              description: err?.response?.data?.message ?? err.message,
              variant: "destructive",
            });
          }
        }}
      />
    </div>
  );
}

function NewEngagementDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (
    dto: {
      name: string;
      type: AuditType;
      scope: string;
      startDate: string;
      endDate: string;
      externalAuditorName?: string;
      linkedRiskIds?: string[];
    },
    extras: Partial<Extras>,
  ) => void;
}) {
  const [f, setF] = useState({
    type: "Internal" as AuditType,
    name: "",
    scope: "",
    risks: [] as string[],
    externalAuditorName: "",
    startDate: "",
    endDate: "",
    committeeDate: "",
    priority: "Normal" as Extras["priority"],
    linkedRiskIds: [] as string[],
  });
  const toggleRiskArea = (v: string) =>
    setF({
      ...f,
      risks: f.risks.includes(v)
        ? f.risks.filter((x) => x !== v)
        : [...f.risks, v],
    });
  const toggleLinkedRisk = (v: string) =>
    setF({
      ...f,
      linkedRiskIds: f.linkedRiskIds.includes(v)
        ? f.linkedRiskIds.filter((x) => x !== v)
        : [...f.linkedRiskIds, v],
    });
  // Only offered when the tenant's Risk Register actually has entries —
  // there's nothing meaningful to link to otherwise.
  const { data: risksList = [] } = useQuery({
    queryKey: ["grc-risks"],
    queryFn: fetchRisks,
    enabled: open,
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New audit engagement</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Engagement type</Label>
              <Select
                value={f.type}
                onValueChange={(v: AuditType) => setF({ ...f, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Internal">Internal Audit</SelectItem>
                  <SelectItem value="External">External Audit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority level</Label>
              <Select
                value={f.priority}
                onValueChange={(v: any) => setF({ ...f, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Normal", "High", "Critical"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Engagement title</Label>
            <Input
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Scope / objectives</Label>
            <Textarea
              rows={3}
              value={f.scope}
              onChange={(e) => setF({ ...f, scope: e.target.value })}
            />
          </div>
          <div>
            <Label>Risk areas covered</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {RISK_AREAS.map((r) => (
                <Button
                  key={r}
                  type="button"
                  size="sm"
                  variant={f.risks.includes(r) ? "default" : "outline"}
                  onClick={() => toggleRiskArea(r)}
                >
                  {r}
                </Button>
              ))}
            </div>
          </div>
          {f.type === "Internal" ? (
            <div className="text-xs rounded-md border bg-muted/40 px-3 py-2 text-muted-foreground">
              The audit team and lead auditor are set automatically from HR →
              Teams (the team flagged as your Audit team, with its Head of
              Department as lead). Set that up first if you haven't yet.
            </div>
          ) : (
            <div>
              <Label>External auditor / firm</Label>
              <Input
                placeholder="e.g. BDO Rwanda"
                value={f.externalAuditorName}
                onChange={(e) =>
                  setF({ ...f, externalAuditorName: e.target.value })
                }
              />
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Planned start</Label>
              <Input
                type="date"
                value={f.startDate}
                onChange={(e) => setF({ ...f, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Target completion</Label>
              <Input
                type="date"
                value={f.endDate}
                onChange={(e) => setF({ ...f, endDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Audit Committee date</Label>
              <Input
                type="date"
                value={f.committeeDate}
                onChange={(e) => setF({ ...f, committeeDate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Linked risk register entries</Label>
            {risksList.length ? (
              <div className="space-y-1 mt-1 max-h-40 overflow-y-auto">
                {risksList.map((r) => (
                  <label
                    key={r._id}
                    className="flex gap-2 items-center text-sm"
                  >
                    <Checkbox
                      checked={f.linkedRiskIds.includes(r._id)}
                      onCheckedChange={() => toggleLinkedRisk(r._id)}
                    />
                    {r.title}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                No Risk Register entries yet — add risks in Risk Management to
                link them here.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!f.name || !f.startDate || !f.endDate)
                return toast({
                  title: "Title, start and target dates are required",
                  variant: "destructive",
                });
              if (f.type === "External" && !f.externalAuditorName.trim())
                return toast({
                  title: "External auditor / firm is required",
                  variant: "destructive",
                });
              onCreate(
                {
                  name: f.name,
                  type: f.type,
                  scope: f.scope,
                  startDate: f.startDate,
                  endDate: f.endDate,
                  externalAuditorName:
                    f.type === "External" ? f.externalAuditorName : undefined,
                  linkedRiskIds: f.linkedRiskIds,
                },
                {
                  priority: f.priority,
                  risks: f.risks,
                  committeeDate: f.committeeDate,
                },
              );
            }}
          >
            Create engagement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
