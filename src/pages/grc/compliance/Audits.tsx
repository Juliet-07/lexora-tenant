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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Plus,
  Download,
  Mail,
  Send,
  AlertTriangle,
  Check,
  Circle,
  Loader2,
  Paperclip,
  FolderOpen,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePersistentState, fmtDate } from "@/lib/grc/usePersistentState";
import {
  fetchAudits,
  createAudit,
  setAuditStatus,
  addAuditFolder,
  removeAuditFolder,
  addAuditRequest,
  resolveAuditRequest,
  downloadAuditRequestsZip,
  addFinding,
  updateFinding,
  type AuditEngagement,
  type AuditFolder,
  type AuditType,
  type FindingSeverity,
  type FindingStatus,
  type RequestStatus,
  type AuditEngagementStatus,
} from "@/lib/grc/compliance-api";
import { fetchRisks, type Risk } from "@/lib/grc/risk-api";
import { fetchEmployees, type Employee } from "@/lib/hr/hr-api";

// ─── Extras not covered by the API ─────────────────────────────
// Deliberately scoped down: only the fields the API doesn't yet
// have a home for stay here, client-side. Auditor/lead/linked-risk
// fields moved to the real backend engagement record — see
// AuditEngagement.auditTeamName / leadAuditorName /
// externalAuditorName / linkedRiskIds in compliance-api.ts.
interface Extras {
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

const LIFECYCLE = [
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
const REM_LABEL: Record<FindingStatus, string> = {
  Open: "Not started",
  "In Progress": "In progress",
  Remediated: "Implemented",
  Closed: "Verified",
};
// Document-request status → badge treatment. "Overdue" isn't a real
// stored status — it's computed at display time (see isRequestOverdue).
const REQUEST_BADGE: Record<
  RequestStatus,
  "default" | "destructive" | "secondary" | "outline"
> = {
  Requested: "outline",
  Submitted: "default",
  Disputed: "destructive",
  Resolved: "secondary",
};
const isRequestOverdue = (r: { dueDate: string; status: RequestStatus }) =>
  (r.status === "Requested" || r.status === "Disputed") &&
  new Date(r.dueDate).getTime() < Date.now();
const engagementTypeLabel = (t: AuditType) =>
  t === "External" ? "External Audit" : "Internal Audit";

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

const phaseOf = (e: AuditEngagement, x: Extras) => {
  if (e.status === "Planned") return 0;
  if (e.status === "In Progress") return e.findings.length ? 2 : 1;
  if (e.status === "Reporting") return x.reportStage >= 4 ? 4 : 3;
  return 5;
};
const pctOf = (e: AuditEngagement, x: Extras) =>
  [10, 45, 60, 65, 85, 100][phaseOf(e, x)];
const sevVariant = (s: string) =>
  (s === "Critical" || s === "High"
    ? "destructive"
    : s === "Medium"
      ? "secondary"
      : "outline") as any;
const isOverdue = (f: {
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
      <EngagementDetail
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

// ─── Detail view ─────────────────────────────────────────────
// `local` is no longer used (there's no demo/local-only mode to keep
// in sync) — kept as an optional, ignored param so existing call
// sites don't all need touching.
type Mutate = (
  api: () => Promise<unknown>,
  local?: (e: AuditEngagement) => AuditEngagement,
  msg?: string,
) => Promise<void>;

function EngagementDetail({
  e,
  x,
  onBack,
  setExtras,
  mutate,
}: {
  e: AuditEngagement;
  x: Extras;
  onBack: () => void;
  setExtras: (p: Partial<Extras>) => void;
  mutate: Mutate;
}) {
  const ph = phaseOf(e, x);
  const [req, setReq] = useState({
    description: "",
    folder: "",
    assignedToEmployeeId: "",
    dueDate: "",
  });
  const [fOpen, setFOpen] = useState(false);
  const [note, setNote] = useState({ title: "", detail: "" });
  const [zipping, setZipping] = useState(false);
  const { data: risksList = [] } = useQuery({
    queryKey: ["grc-risks"],
    queryFn: fetchRisks,
  });
  const linkedRisks = risksList.filter((r) => e.linkedRiskIds.includes(r._id));
  const auditorLabel =
    e.type === "Internal"
      ? `${e.auditTeamName || "—"}${e.leadAuditorName ? ` (lead: ${e.leadAuditorName})` : ""}`
      : e.externalAuditorName || "—";
  const sevCount = (s: string) =>
    e.findings.filter((f) => f.severity === s).length;
  const remCounts = (
    ["Open", "In Progress", "Remediated", "Closed"] as FindingStatus[]
  ).map((s) => e.findings.filter((f) => f.status === s).length);
  const remPct = e.findings.length
    ? Math.round(
        ((remCounts[2] * 0.5 + remCounts[3]) / e.findings.length) * 100,
      )
    : 0;
  const overdue = e.findings
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => isOverdue(f));
  const fm = (i: number) =>
    x.findingMeta[i] ?? {
      ref: `F-${String(i + 1).padStart(2, "0")}`,
      owner: "",
      process: "",
      evidence: "",
      verifiedBy: "",
    };
  const setFm = (i: number, p: Partial<Extras["findingMeta"][number]>) =>
    setExtras({ findingMeta: { ...x.findingMeta, [i]: { ...fm(i), ...p } } });

  const NEXT: Record<AuditEngagementStatus, AuditEngagementStatus | null> = {
    Planned: "In Progress",
    "In Progress": "Reporting",
    Reporting: "Closed",
    Closed: null,
  };
  const next = NEXT[e.status];

  const exportFile = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<html><head><title>${e.name}</title><style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;line-height:1.5}td,th{border:1px solid #ccc;padding:4px 6px;font-size:12px}table{border-collapse:collapse;width:100%}</style></head><body><h1>${e.name}</h1><p>${e.scope}</p><h2>Findings</h2><table><tr><th>Ref</th><th>Finding</th><th>Rating</th><th>Recommendation</th><th>Response</th></tr>${e.findings.map((f, i) => `<tr><td>${fm(i).ref}</td><td>${f.observation}</td><td>${f.severity}</td><td>${f.recommendation}</td><td>${f.managementResponse}</td></tr>`).join("")}</table><h2>Executive summary</h2><p>${x.execSummary}</p></body></html>`,
    );
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Audit Management
      </Button>
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <div className="flex gap-2 mb-1">
            <Badge variant="secondary">{engagementTypeLabel(e.type)}</Badge>
            <Badge variant="outline">{LIFECYCLE[ph][0]}</Badge>
            {x.priority !== "Normal" && (
              <Badge variant="destructive">{x.priority}</Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold">{e.name}</h1>
          <p className="text-sm text-muted-foreground">
            {e.type === "Internal" ? "Audit team" : "Auditor"}: {auditorLabel} ·
            Started {fmtDate(e.startDate)} · Target completion{" "}
            {fmtDate(e.endDate)}
            {x.committeeDate &&
              ` · Reports to Audit Committee ${fmtDate(x.committeeDate)}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            disabled={zipping}
            onClick={async () => {
              setZipping(true);
              try {
                await downloadAuditRequestsZip(e._id, e.name);
              } catch (err: any) {
                toast({
                  title: "Could not build zip",
                  description: err?.response?.data?.message ?? err.message,
                  variant: "destructive",
                });
              } finally {
                setZipping(false);
              }
            }}
          >
            {zipping ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <FolderOpen className="h-4 w-4 mr-1" />
            )}
            Download all documents
          </Button>
          <Button variant="outline" onClick={exportFile}>
            <Download className="h-4 w-4 mr-1" />
            Export engagement file
          </Button>
          {next && (
            <Button
              variant="outline"
              onClick={() =>
                mutate(
                  () => setAuditStatus(e._id, next),
                  (en) => ({ ...en, status: next }),
                  `Moved to ${next}`,
                )
              }
            >
              Move to{" "}
              {next === "In Progress"
                ? "fieldwork"
                : next === "Reporting"
                  ? "reporting"
                  : "closed"}
            </Button>
          )}
          <Button
            onClick={() =>
              toast({
                title: "Sent to Audit Committee",
                description:
                  "Engagement pack added to the next committee meeting.",
              })
            }
          >
            <Send className="h-4 w-4 mr-1" />
            Send to Audit Committee
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap border rounded-lg bg-card overflow-hidden">
        {LIFECYCLE.map(([t], i) => (
          <div
            key={t}
            className={`flex-1 min-w-[110px] px-3 py-2.5 border-r last:border-r-0 ${i === ph ? "bg-primary/10" : ""}`}
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              {i < ph ? (
                <Check className="h-3.5 w-3.5 text-success" />
              ) : (
                <Circle
                  className={`h-3.5 w-3.5 ${i === ph ? "text-primary fill-primary" : "text-muted-foreground"}`}
                />
              )}
              {t}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {i < ph ? "Complete" : i === ph ? "In progress" : "—"}
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="planning">
        <TabsList className="flex-wrap h-auto">
          {[
            "Planning",
            "Fieldwork",
            "Findings",
            "Reporting",
            "Remediation",
            "Committee report",
          ].map((t) => (
            <TabsTrigger key={t} value={t.toLowerCase().split(" ")[0]}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* PLANNING */}
        <TabsContent value="planning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audit scope statement</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
              <p>{e.scope || "No scope recorded."}</p>
              <div>
                <div className="font-semibold mb-1">Objectives</div>
                <ol className="list-decimal pl-5 space-y-1">
                  {x.objectives.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ol>
                <ObjectiveAdder
                  onAdd={(o) => setExtras({ objectives: [...x.objectives, o] })}
                />
              </div>
              <div>
                <div className="font-semibold mb-1">Risk areas covered</div>
                <div className="flex gap-1.5 flex-wrap">
                  {x.risks.map((r) => (
                    <Badge key={r} variant="secondary">
                      {r}
                    </Badge>
                  ))}
                  {!x.risks.length && "—"}
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Planning details</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1.5">
                {[
                  ["Engagement type", engagementTypeLabel(e.type)],
                  [
                    e.type === "Internal" ? "Audit team" : "Auditor",
                    auditorLabel,
                  ],
                  [
                    "Planned start / completion",
                    `${fmtDate(e.startDate)} → ${fmtDate(e.endDate)}`,
                  ],
                  ["Budget / hours", x.budget || "—"],
                  [
                    "Linked risks",
                    linkedRisks.map((r) => r.title).join("; ") || "—",
                  ],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between gap-4 border-b pb-1.5 last:border-0"
                  >
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium text-right">{v}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Document requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <FolderManager e={e} mutate={mutate} />
                <RequestTable e={e} mutate={mutate} />
                <RequestAdder
                  req={req}
                  setReq={setReq}
                  folders={e.folders}
                  onAdd={() => {
                    if (
                      !req.description ||
                      !req.folder ||
                      !req.dueDate ||
                      !req.assignedToEmployeeId
                    )
                      return toast({
                        title:
                          "Item, folder, assignee and due date are required",
                        variant: "destructive",
                      });
                    mutate(
                      () => addAuditRequest(e._id, req),
                      undefined,
                      "Request added",
                    );
                    setReq({
                      description: "",
                      folder: "",
                      assignedToEmployeeId: "",
                      dueDate: "",
                    });
                  }}
                />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Preliminary risk assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Risk area</TableHead>
                    <TableHead>Inherent risk</TableHead>
                    <TableHead>Key controls</TableHead>
                    <TableHead>Testing approach</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {x.riskAssessment.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.area}</TableCell>
                      <TableCell>
                        <Badge variant={sevVariant(r.inherent)}>
                          {r.inherent}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{r.controls}</TableCell>
                      <TableCell className="text-xs">{r.approach}</TableCell>
                    </TableRow>
                  ))}
                  {!x.riskAssessment.length && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground py-4"
                      >
                        No risk assessment yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FIELDWORK */}
        <TabsContent value="fieldwork" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Fieldwork progress tracker
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {x.progress.map((p, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm">
                      <span>{p.area}</span>
                      <span className="text-muted-foreground">{p.pct}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={p.pct}
                      className="w-full accent-primary"
                      onChange={(ev) =>
                        setExtras({
                          progress: x.progress.map((q, j) =>
                            j === i ? { ...q, pct: +ev.target.value } : q,
                          ),
                        })
                      }
                    />
                  </div>
                ))}
                {!x.progress.length && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setExtras({ progress: [{ area: "Testing", pct: 0 }] })
                    }
                  >
                    Add workstream
                  </Button>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Document request status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RequestTable e={e} mutate={mutate} />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sample selections</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Population</TableHead>
                    <TableHead>Sample size</TableHead>
                    <TableHead>Selection method</TableHead>
                    <TableHead>Testing dates</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {x.samples.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        {s.population}
                      </TableCell>
                      <TableCell>{s.size}</TableCell>
                      <TableCell className="text-xs">{s.method}</TableCell>
                      <TableCell>{s.dates}</TableCell>
                    </TableRow>
                  ))}
                  {!x.samples.length && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground py-4"
                      >
                        No samples recorded.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Fieldwork notes & observations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {x.notes.map((n, i) => (
                <div
                  key={i}
                  className="flex gap-3 border-l-2 border-primary pl-3"
                >
                  <div className="text-xs text-muted-foreground w-14 shrink-0">
                    {n.date}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{n.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {n.detail}
                    </div>
                  </div>
                </div>
              ))}
              <div className="grid gap-2 pt-2 border-t">
                <Input
                  placeholder="Observation"
                  value={note.title}
                  onChange={(ev) =>
                    setNote({ ...note, title: ev.target.value })
                  }
                />
                <Textarea
                  rows={2}
                  placeholder="Detail"
                  value={note.detail}
                  onChange={(ev) =>
                    setNote({ ...note, detail: ev.target.value })
                  }
                />
                <Button
                  size="sm"
                  className="justify-self-start"
                  onClick={() => {
                    if (!note.title) return;
                    setExtras({
                      notes: [
                        ...x.notes,
                        {
                          date: new Date().toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          }),
                          ...note,
                        },
                      ],
                    });
                    setNote({ title: "", detail: "" });
                  }}
                >
                  Add note
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Working papers register
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Preparer</TableHead>
                    <TableHead>Reviewer</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {x.workingPapers.map((w, i) => (
                    <TableRow key={w.ref}>
                      <TableCell>{w.ref}</TableCell>
                      <TableCell className="font-medium">{w.desc}</TableCell>
                      <TableCell>{w.preparer}</TableCell>
                      <TableCell>{w.reviewer}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7"
                          onClick={() =>
                            setExtras({
                              workingPapers: x.workingPapers.map((q, j) =>
                                j === i
                                  ? {
                                      ...q,
                                      status:
                                        q.status === "Reviewed"
                                          ? "Draft"
                                          : "Reviewed",
                                      reviewer:
                                        q.status === "Reviewed"
                                          ? q.reviewer
                                          : q.reviewer === "Pending"
                                            ? "Compliance Officer"
                                            : q.reviewer,
                                    }
                                  : q,
                              ),
                            })
                          }
                        >
                          <Badge
                            variant={
                              w.status === "Reviewed" ? "default" : "secondary"
                            }
                          >
                            {w.status}
                          </Badge>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!x.workingPapers.length && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground py-4"
                      >
                        No working papers yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() =>
                  setExtras({
                    workingPapers: [
                      ...x.workingPapers,
                      {
                        ref: `WP-${String(x.workingPapers.length + 1).padStart(2, "0")}`,
                        desc: "New working paper",
                        preparer:
                          e.leadAuditorName ||
                          e.externalAuditorName ||
                          "Auditor",
                        reviewer: "Pending",
                        status: "Draft",
                      },
                    ],
                  })
                }
              >
                <Plus className="h-4 w-4 mr-1" />
                Add working paper
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FINDINGS */}
        <TabsContent value="findings" className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {(["High", "Medium", "Low"] as const).map((s) => (
              <Card key={s}>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">{s}</div>
                  <div className="text-2xl font-bold">
                    {sevCount(s) + (s === "High" ? sevCount("Critical") : 0)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader className="flex-row justify-between items-center space-y-0">
              <CardTitle className="text-base">Detailed findings</CardTitle>
              <Button size="sm" onClick={() => setFOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add finding
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref</TableHead>
                    <TableHead>Finding</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Root cause</TableHead>
                    <TableHead>Process</TableHead>
                    <TableHead>Recommendation</TableHead>
                    <TableHead>Mgmt response</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {e.findings.map((f, i) => (
                    <TableRow key={i}>
                      <TableCell>{fm(i).ref}</TableCell>
                      <TableCell className="font-medium min-w-[200px]">
                        {f.observation}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sevVariant(f.severity)}>
                          {f.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs min-w-[150px]">
                        {f.cause || "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {fm(i).process || "—"}
                      </TableCell>
                      <TableCell className="text-xs min-w-[180px]">
                        {f.recommendation || "—"}
                      </TableCell>
                      <TableCell className="text-xs min-w-[160px]">
                        <Input
                          className="h-7 text-xs"
                          defaultValue={f.managementResponse}
                          placeholder="Response…"
                          onBlur={(ev) =>
                            ev.target.value !== f.managementResponse &&
                            mutate(
                              () =>
                                updateFinding(e._id, i, {
                                  managementResponse: ev.target.value,
                                }),
                              (en) => ({
                                ...en,
                                findings: en.findings.map((q, j) =>
                                  j === i
                                    ? {
                                        ...q,
                                        managementResponse: ev.target.value,
                                      }
                                    : q,
                                ),
                              }),
                              "Response saved",
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-7 text-xs w-32"
                          value={fm(i).owner}
                          placeholder="Owner"
                          onChange={(ev) =>
                            setFm(i, { owner: ev.target.value })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          className="h-7 text-xs w-36"
                          defaultValue={
                            f.remediationDueDate?.slice(0, 10) ?? ""
                          }
                          onBlur={(ev) =>
                            ev.target.value &&
                            mutate(
                              () =>
                                updateFinding(e._id, i, {
                                  remediationDueDate: ev.target.value,
                                }),
                              (en) => ({
                                ...en,
                                findings: en.findings.map((q, j) =>
                                  j === i
                                    ? {
                                        ...q,
                                        remediationDueDate: ev.target.value,
                                      }
                                    : q,
                                ),
                              }),
                            )
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {!e.findings.length && (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center text-muted-foreground py-6"
                      >
                        No findings recorded.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REPORTING */}
        <TabsContent value="reporting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Report workflow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {[
                  "Draft prepared",
                  "Internal review",
                  "Management response",
                  "Final report",
                  "Issued",
                ].map((s, i) => (
                  <button
                    key={s}
                    onClick={() => setExtras({ reportStage: i })}
                    className={`flex-1 min-w-[120px] rounded-lg border px-3 py-2 text-left text-xs ${i < x.reportStage ? "bg-success/10 border-success/30" : i === x.reportStage ? "bg-primary/10 border-primary" : ""}`}
                  >
                    <div className="font-semibold flex items-center gap-1">
                      {i < x.reportStage && <Check className="h-3 w-3" />}
                      {s}
                    </div>
                    <div className="text-muted-foreground">
                      {i < x.reportStage
                        ? "Done"
                        : i === x.reportStage
                          ? "In progress"
                          : "—"}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Draft report details
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1.5">
                {[
                  [
                    "Title",
                    `Internal Audit Report — ${e.name.replace(/^.*— /, "")}`,
                  ],
                  [
                    "Version",
                    `v${x.reportStage + 1}${x.reportStage < 3 ? " (draft)" : ""}`,
                  ],
                  ["Author", e.leadAuditorName || e.externalAuditorName || "—"],
                  [
                    "Reviewer",
                    x.reportStage >= 2
                      ? "Compliance Officer"
                      : "Compliance Officer (in progress)",
                  ],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between gap-4 border-b pb-1.5 last:border-0"
                  >
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium text-right">{v}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Report distribution list
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Ack.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {x.distribution.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="text-xs">{r.role}</TableCell>
                        <TableCell>{fmtDate(r.sent)}</TableCell>
                        <TableCell>
                          <Checkbox
                            checked={r.ack}
                            onCheckedChange={() =>
                              setExtras({
                                distribution: x.distribution.map((q, j) =>
                                  j === i ? { ...q, ack: !q.ack } : q,
                                ),
                              })
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {!x.distribution.length && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-muted-foreground py-4"
                        >
                          Not yet distributed.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {!x.distribution.length && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() =>
                      setExtras({
                        distribution: [
                          {
                            name: "Audit Committee Chair",
                            role: "Audit Committee Chair",
                            sent: new Date().toISOString(),
                            ack: false,
                          },
                          {
                            name: "Process owner",
                            role: "Process owner",
                            sent: new Date().toISOString(),
                            ack: false,
                          },
                        ],
                      })
                    }
                  >
                    Distribute draft
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Management response tracker
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref</TableHead>
                    <TableHead>Finding summary</TableHead>
                    <TableHead>Agrees</TableHead>
                    <TableHead>Action committed</TableHead>
                    <TableHead>Responsible</TableHead>
                    <TableHead>Target</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {e.findings.map((f, i) => (
                    <TableRow key={i}>
                      <TableCell>{fm(i).ref}</TableCell>
                      <TableCell className="text-sm">{f.observation}</TableCell>
                      <TableCell>
                        {f.managementResponse ? (
                          <Badge>Yes</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {f.recommendation}
                      </TableCell>
                      <TableCell>{fm(i).owner || "—"}</TableCell>
                      <TableCell>{fmtDate(f.remediationDueDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REMEDIATION */}
        <TabsContent value="remediation" className="space-y-4">
          {overdue.length > 0 && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm flex gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
              <div>
                <b>{overdue.length} remediation action(s) overdue.</b>{" "}
                {overdue
                  .map(
                    ({ f, i }) =>
                      `${fm(i).ref} was due ${fmtDate(f.remediationDueDate)}`,
                  )
                  .join("; ")}
                .
              </div>
            </div>
          )}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">Remediation progress</span>
                <span>{remPct}% complete</span>
              </div>
              <Progress value={remPct} className="h-2" />
              <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                {["Not started", "In progress", "Implemented", "Verified"].map(
                  (l, i) => (
                    <span key={l}>
                      {l}: <b className="text-foreground">{remCounts[i]}</b>
                    </span>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Action tracking</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref</TableHead>
                    <TableHead>Agreed action</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Evidence</TableHead>
                    <TableHead>Verified by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {e.findings.map((f, i) => (
                    <TableRow key={i}>
                      <TableCell>{fm(i).ref}</TableCell>
                      <TableCell className="text-sm min-w-[200px]">
                        {f.recommendation || f.observation}
                      </TableCell>
                      <TableCell>{fm(i).owner || "—"}</TableCell>
                      <TableCell
                        className={isOverdue(f) ? "text-destructive" : ""}
                      >
                        {fmtDate(f.remediationDueDate)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={f.status}
                          onValueChange={(v: FindingStatus) =>
                            mutate(
                              () => updateFinding(e._id, i, { status: v }),
                              (en) => ({
                                ...en,
                                findings: en.findings.map((q, j) =>
                                  j === i ? { ...q, status: v } : q,
                                ),
                              }),
                              `Status: ${REM_LABEL[v]}`,
                            )
                          }
                        >
                          <SelectTrigger className="h-7 w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(REM_LABEL) as FindingStatus[]).map(
                              (s) => (
                                <SelectItem key={s} value={s}>
                                  {REM_LABEL[s]}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-7 text-xs w-40"
                          value={fm(i).evidence}
                          placeholder="Evidence…"
                          onChange={(ev) =>
                            setFm(i, { evidence: ev.target.value })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-7 text-xs w-36"
                          value={fm(i).verifiedBy}
                          placeholder="—"
                          onChange={(ev) =>
                            setFm(i, { verifiedBy: ev.target.value })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMMITTEE */}
        <TabsContent value="committee" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Audit Committee presentation
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div>
                  <Label className="text-xs">Meeting date</Label>
                  <Input
                    type="date"
                    value={x.committeeDate?.slice(0, 10) ?? ""}
                    onChange={(ev) =>
                      setExtras({ committeeDate: ev.target.value })
                    }
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Presenter</span>
                  <span>
                    Compliance Officer
                    {e.leadAuditorName || e.externalAuditorName
                      ? `, with ${e.leadAuditorName || e.externalAuditorName}`
                      : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Papers reference
                  </span>
                  <span>Audit Committee report — Annex</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Key statistics for Committee
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {[
                  [
                    "Findings by severity",
                    `${sevCount("High") + sevCount("Critical")}H / ${sevCount("Medium")}M / ${sevCount("Low")}L`,
                  ],
                  [
                    "Remediation status",
                    `${remPct}%`,
                    `${overdue.length} overdue`,
                  ],
                  [
                    "Requests received",
                    `${e.requests.filter((r) => r.status === "Submitted" || r.status === "Resolved").length}/${e.requests.length}`,
                  ],
                  [
                    "Working papers",
                    `${x.workingPapers.filter((w) => w.status === "Reviewed").length}/${x.workingPapers.length} reviewed`,
                  ],
                ].map(([l, v, s]) => (
                  <div key={l} className="border rounded-lg p-2.5">
                    <div className="text-[11px] text-muted-foreground">{l}</div>
                    <div className="font-bold">{v}</div>
                    {s && (
                      <div className="text-[11px] text-destructive">{s}</div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Executive summary for Committee
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={5}
                value={x.execSummary}
                placeholder="Summarise scope, findings, overall assessment and remediation status…"
                onChange={(ev) => setExtras({ execSummary: ev.target.value })}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Committee actions arising
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {x.committeeActions.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{a.action}</TableCell>
                      <TableCell>{a.owner}</TableCell>
                      <TableCell>{fmtDate(a.due)}</TableCell>
                      <TableCell>
                        <Select
                          value={a.status}
                          onValueChange={(v) =>
                            setExtras({
                              committeeActions: x.committeeActions.map(
                                (q, j) => (j === i ? { ...q, status: v } : q),
                              ),
                            })
                          }
                        >
                          <SelectTrigger className="h-7 w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["To be raised", "Raised", "Resolved"].map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!x.committeeActions.length && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground py-4"
                      >
                        No committee actions.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() =>
                  setExtras({
                    committeeActions: [
                      ...x.committeeActions,
                      {
                        action: "New committee action",
                        owner: "Audit Committee",
                        due: x.committeeDate || new Date().toISOString(),
                        status: "To be raised",
                      },
                    ],
                  })
                }
              >
                <Plus className="h-4 w-4 mr-1" />
                Add action
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FindingDialog
        open={fOpen}
        onOpenChange={setFOpen}
        onSave={(dto, meta) => {
          const idx = e.findings.length;
          mutate(
            () => addFinding(e._id, dto),
            (en) => ({
              ...en,
              findings: [
                ...en.findings,
                {
                  condition: "",
                  criteria: "",
                  consequence: "",
                  status: "Open",
                  managementResponse: "",
                  remediationDueDate: null,
                  createdAt: new Date().toISOString(),
                  cause: "",
                  recommendation: "",
                  ...dto,
                },
              ],
            }),
            "Finding added",
          );
          setFm(idx, { ...meta, ref: `F-${String(idx + 1).padStart(2, "0")}` });
          setFOpen(false);
        }}
      />
    </div>
  );
}

function ObjectiveAdder({ onAdd }: { onAdd: (o: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="flex gap-2 mt-2">
      <Input
        className="h-8"
        placeholder="Add objective"
        value={v}
        onChange={(e) => setV(e.target.value)}
      />
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          if (v.trim()) {
            onAdd(v.trim());
            setV("");
          }
        }}
      >
        Add
      </Button>
    </div>
  );
}

// Folders are created here, up front, by the tenant — then picked
// (not retyped) on each request below. Removal is blocked server-side
// once a request already references the folder, so a failed remove
// just surfaces as the usual "Action failed" toast from mutate.
function FolderManager({ e, mutate }: { e: AuditEngagement; mutate: Mutate }) {
  const [v, setV] = useState("");
  // Engagements created before folders existed on the schema may come
  // back with no `folders` field at all (older cached responses, or
  // any endpoint that doesn't normalize it) — never assume the array.
  const folders = e.folders ?? [];
  return (
    <div className="space-y-2 pb-2 border-b">
      <div className="text-xs font-semibold text-muted-foreground">Folders</div>
      <div className="flex flex-wrap gap-1.5">
        {folders.map((f) => (
          <Badge key={f._id} variant="secondary" className="gap-1 pr-1">
            {f.name}
            <button
              type="button"
              className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
              onClick={() =>
                mutate(
                  () => removeAuditFolder(e._id, f._id),
                  (en) => ({
                    ...en,
                    folders: en.folders.filter((x) => x._id !== f._id),
                  }),
                )
              }
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {!folders.length && (
          <span className="text-xs text-muted-foreground">
            No folders yet — add one to start requesting documents.
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          className="h-8"
          placeholder="New folder, e.g. Financial records"
          value={v}
          onChange={(ev) => setV(ev.target.value)}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (!v.trim()) return;
            mutate(
              () => addAuditFolder(e._id, v.trim()),
              undefined,
              "Folder created",
            );
            setV("");
          }}
        >
          Add folder
        </Button>
      </div>
    </div>
  );
}

// Requested/Submitted/Disputed are all driven by a real action taken
// elsewhere (the request being created, the employee uploading files
// or disputing it) — the only action available here is Resolve, once
// files are in or a dispute has been talked through. "Overdue" is
// shown as an extra badge, computed from dueDate, never stored.
function RequestTable({ e, mutate }: { e: AuditEngagement; mutate: Mutate }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>Folder</TableHead>
          <TableHead>Assigned to</TableHead>
          <TableHead>Due</TableHead>
          <TableHead>Files</TableHead>
          <TableHead>Status</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {e.requests.map((r) => (
          <TableRow key={r._id}>
            <TableCell className="text-sm max-w-[200px]">
              {r.description}
              {r.status === "Disputed" && r.disputeReason && (
                <div className="text-xs text-destructive mt-0.5">
                  Disputed: {r.disputeReason}
                </div>
              )}
            </TableCell>
            <TableCell className="text-xs">{r.folder || "General"}</TableCell>
            <TableCell className="text-xs">{r.assignedToName || "—"}</TableCell>
            <TableCell
              className={`text-xs ${isRequestOverdue(r) ? "text-destructive" : ""}`}
            >
              {fmtDate(r.dueDate)}
              {isRequestOverdue(r) && " (overdue)"}
            </TableCell>
            <TableCell className="text-xs">
              {r.files.length ? (
                <span className="flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  {r.files.length}
                </span>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell>
              <Badge variant={REQUEST_BADGE[r.status]}>{r.status}</Badge>
            </TableCell>
            <TableCell>
              {(r.status === "Submitted" || r.status === "Disputed") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() =>
                    mutate(
                      () => resolveAuditRequest(e._id, r._id),
                      undefined,
                      "Marked resolved",
                    )
                  }
                >
                  Resolve
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
        {!e.requests.length && (
          <TableRow>
            <TableCell
              colSpan={7}
              className="text-center text-muted-foreground py-4"
            >
              No requests yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function RequestAdder({
  req,
  setReq,
  onAdd,
  folders: foldersProp,
}: {
  req: {
    description: string;
    folder: string;
    assignedToEmployeeId: string;
    dueDate: string;
  };
  setReq: (r: {
    description: string;
    folder: string;
    assignedToEmployeeId: string;
    dueDate: string;
  }) => void;
  onAdd: () => void;
  folders: AuditFolder[] | undefined;
}) {
  // Same defensive fallback as FolderManager — never assume the array.
  const folders = foldersProp ?? [];
  const { data: employeesPage } = useQuery({
    queryKey: ["hr-employees-for-audit-picker"],
    queryFn: () => fetchEmployees({ limit: 500 }),
  });
  const employees = employeesPage?.items ?? [];
  return (
    <div className="grid gap-2 pt-2 border-t">
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Item requested"
          value={req.description}
          onChange={(ev) => setReq({ ...req, description: ev.target.value })}
        />
        <Select
          value={req.folder}
          onValueChange={(v) => setReq({ ...req, folder: v })}
          disabled={!folders.length}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                folders.length ? "Select folder" : "Add a folder first"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {folders.map((f) => (
              <SelectItem key={f._id} value={f.name}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select
          value={req.assignedToEmployeeId}
          onValueChange={(v) => setReq({ ...req, assignedToEmployeeId: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Assign to employee" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((emp: Employee) => (
              <SelectItem key={emp._id} value={emp._id}>
                {emp.firstName} {emp.lastName}
                {emp.jobTitle ? ` — ${emp.jobTitle}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={req.dueDate}
          onChange={(ev) => setReq({ ...req, dueDate: ev.target.value })}
        />
      </div>
      <Button size="sm" className="justify-self-start" onClick={onAdd}>
        <Plus className="h-4 w-4 mr-1" />
        Add request
      </Button>
    </div>
  );
}

function FindingDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (
    dto: {
      observation: string;
      cause?: string;
      recommendation?: string;
      severity: FindingSeverity;
    },
    meta: {
      owner: string;
      process: string;
      evidence: string;
      verifiedBy: string;
    },
  ) => void;
}) {
  const [f, setF] = useState({
    observation: "",
    cause: "",
    recommendation: "",
    severity: "Medium" as FindingSeverity,
    owner: "",
    process: "",
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add finding</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Finding</Label>
            <Textarea
              rows={2}
              value={f.observation}
              onChange={(e) => setF({ ...f, observation: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Rating</Label>
              <Select
                value={f.severity}
                onValueChange={(v: FindingSeverity) =>
                  setF({ ...f, severity: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Critical", "High", "Medium", "Low"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Affected process</Label>
              <Input
                value={f.process}
                onChange={(e) => setF({ ...f, process: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Root cause</Label>
            <Input
              value={f.cause}
              onChange={(e) => setF({ ...f, cause: e.target.value })}
            />
          </div>
          <div>
            <Label>Recommendation</Label>
            <Textarea
              rows={2}
              value={f.recommendation}
              onChange={(e) => setF({ ...f, recommendation: e.target.value })}
            />
          </div>
          <div>
            <Label>Owner</Label>
            <Input
              value={f.owner}
              onChange={(e) => setF({ ...f, owner: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!f.observation.trim()) return;
              onSave(
                {
                  observation: f.observation,
                  cause: f.cause,
                  recommendation: f.recommendation,
                  severity: f.severity,
                },
                {
                  owner: f.owner,
                  process: f.process,
                  evidence: "",
                  verifiedBy: "",
                },
              );
              setF({
                observation: "",
                cause: "",
                recommendation: "",
                severity: "Medium",
                owner: "",
                process: "",
              });
            }}
          >
            Add finding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
