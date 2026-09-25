import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Send,
  AlertTriangle,
  Check,
  Circle,
  Loader2,
  Paperclip,
  FolderOpen,
  Trash2,
  ChevronRight,
  FileText,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { fmtDate } from "@/lib/grc/usePersistentState";
import {
  setAuditStatus,
  addAuditFolder,
  removeAuditFolder,
  addAuditRequest,
  resolveAuditRequest,
  downloadAuditRequestsZip,
  addFinding,
  updateFinding,
  type AuditEngagement,
  type AuditEngagementStatus,
  type FindingSeverity,
  type FindingStatus,
  type RequestStatus,
} from "@/lib/grc/compliance-api";
import { fetchRisks } from "@/lib/grc/risk-api";
import { fetchEmployees, type Employee } from "@/lib/hr/hr-api";
import {
  type Extras,
  LIFECYCLE,
  REM_LABEL,
  phaseOf,
  sevVariant,
  isOverdue,
} from "./Audits";

// `local` is no longer used (there's no demo/local-only mode to keep in
// sync) — kept as an optional, ignored param so existing call sites
// don't all need touching.
type Mutate = (
  api: () => Promise<unknown>,
  local?: (e: AuditEngagement) => AuditEngagement,
  msg?: string,
) => Promise<void>;

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
const engagementTypeLabel = (t: AuditEngagement["type"]) =>
  t === "External" ? "External Audit" : "Internal Audit";

export default function AuditDetail({
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
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Audit scope statement
                </CardTitle>
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
                    onAdd={(o) =>
                      setExtras({ objectives: [...x.objectives, o] })
                    }
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
          </div>
          <DocumentRequestsCard e={e} mutate={mutate} />
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
                <RequestStatusTable e={e} mutate={mutate} />
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

// ─── Document requests: folder-first workspace ─────────────────
// Mirrors the folder-drill-down pattern already used for the GRC
// deals data room (DataRoomTab.tsx) and CRM mandate documents: a grid
// of folder tiles up front, click one to see what's inside, "view" a
// document by opening its uploaded file in a new tab. A request can
// only be raised from inside a real (tenant-created) folder, so
// there's no separate folder picker to keep in sync with this view —
// being inside the folder *is* the selection.
function DocumentRequestsCard({
  e,
  mutate,
}: {
  e: AuditEngagement;
  mutate: Mutate;
}) {
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState("");
  const [req, setReq] = useState({
    description: "",
    assignedToEmployeeId: "",
    dueDate: "",
  });
  const { data: employeesPage } = useQuery({
    queryKey: ["hr-employees-for-audit-picker"],
    queryFn: () => fetchEmployees({ limit: 500 }),
  });
  const employees = employeesPage?.items ?? [];

  const managedFolders = e.folders ?? [];
  // Union with any folder name already in use on a request but not (or
  // not yet) a real managed folder — e.g. a request raised before
  // folder management existed. Nothing existing becomes invisible.
  const requestFolderNames = Array.from(
    new Set(e.requests.map((r) => r.folder || "General")),
  );
  const extraNames = requestFolderNames.filter(
    (n) => !managedFolders.some((f) => f.name === n),
  );
  const tiles: { id: string; name: string; managed: boolean }[] = [
    ...managedFolders.map((f) => ({ id: f._id, name: f.name, managed: true })),
    ...extraNames.map((n) => ({ id: n, name: n, managed: false })),
  ];
  const countIn = (name: string) =>
    e.requests.filter((r) => (r.folder || "General") === name).length;

  // ── Folder grid ──────────────────────────────────────────────
  if (!openFolder) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Document requests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {tiles.map((f) => (
              <div
                key={f.id}
                onClick={() => setOpenFolder(f.name)}
                className="border rounded-md p-3 cursor-pointer hover:border-primary transition group relative"
              >
                <FolderOpen className="h-6 w-6 text-muted-foreground mb-2" />
                <div className="text-sm font-medium truncate pr-6">
                  {f.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {countIn(f.name)} request{countIn(f.name) === 1 ? "" : "s"}
                </div>
                {f.managed && (
                  <button
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      if (confirm(`Delete the "${f.name}" folder?`))
                        mutate(() => removeAuditFolder(e._id, f.id), undefined);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </button>
                )}
              </div>
            ))}
            {!tiles.length && (
              <div className="col-span-full text-sm text-muted-foreground text-center py-8">
                No folders yet — create one below to start requesting documents.
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <Input
              className="h-9"
              placeholder="New folder, e.g. Financial records"
              value={newFolder}
              onChange={(ev) => setNewFolder(ev.target.value)}
            />
            <Button
              variant="outline"
              onClick={() => {
                if (!newFolder.trim()) return;
                mutate(
                  () => addAuditFolder(e._id, newFolder.trim()),
                  undefined,
                  "Folder created",
                );
                setNewFolder("");
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add folder
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Inside a folder ─────────────────────────────────────────
  const folderRequests = e.requests.filter(
    (r) => (r.folder || "General") === openFolder,
  );
  const isManaged = managedFolders.some((f) => f.name === openFolder);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm">
          <button
            className="text-muted-foreground hover:text-foreground flex items-center gap-1"
            onClick={() => setOpenFolder(null)}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Document requests
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-semibold">{openFolder}</span>
          <Badge variant="outline" className="ml-1">
            {folderRequests.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Assigned to</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {folderRequests.map((r) => (
              <TableRow key={r._id}>
                <TableCell className="text-sm max-w-[200px]">
                  {r.description}
                  {r.status === "Disputed" && r.disputeReason && (
                    <div className="text-xs text-destructive mt-0.5">
                      Disputed: {r.disputeReason}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {r.assignedToName || "—"}
                </TableCell>
                <TableCell
                  className={`text-xs ${isRequestOverdue(r) ? "text-destructive" : ""}`}
                >
                  {fmtDate(r.dueDate)}
                  {isRequestOverdue(r) && " (overdue)"}
                </TableCell>
                <TableCell className="text-xs">
                  {r.files.length ? (
                    <div className="flex flex-col gap-0.5">
                      {r.files.map((file, i) => (
                        <a
                          key={i}
                          href={file.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <FileText className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[160px]">
                            {file.name}
                          </span>
                        </a>
                      ))}
                    </div>
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
            {!folderRequests.length && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-4"
                >
                  No requests in this folder yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {isManaged ? (
          <div className="grid gap-2 pt-2 border-t">
            <div className="text-xs font-semibold text-muted-foreground">
              Add a request to "{openFolder}"
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Item requested"
                value={req.description}
                onChange={(ev) =>
                  setReq({ ...req, description: ev.target.value })
                }
              />
              <Select
                value={req.assignedToEmployeeId}
                onValueChange={(v) =>
                  setReq({ ...req, assignedToEmployeeId: v })
                }
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
            </div>
            <div className="grid grid-cols-2 gap-2 items-center">
              <Input
                type="date"
                value={req.dueDate}
                onChange={(ev) => setReq({ ...req, dueDate: ev.target.value })}
              />
              <Button
                size="sm"
                className="justify-self-start"
                onClick={() => {
                  if (
                    !req.description ||
                    !req.dueDate ||
                    !req.assignedToEmployeeId
                  )
                    return toast({
                      title: "Item, assignee and due date are required",
                      variant: "destructive",
                    });
                  mutate(
                    () =>
                      addAuditRequest(e._id, { ...req, folder: openFolder }),
                    undefined,
                    "Request added",
                  );
                  setReq({
                    description: "",
                    assignedToEmployeeId: "",
                    dueDate: "",
                  });
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add request
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
            <span>
              This folder predates folder management, so new requests can't be
              added to it directly.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                mutate(
                  () => addAuditFolder(e._id, openFolder),
                  undefined,
                  `"${openFolder}" is now a managed folder`,
                )
              }
            >
              Make it a managed folder
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// A flat, all-folders status tracker for the Fieldwork tab — a
// quick-glance view across every request while work is in progress,
// as opposed to the folder-scoped workspace above where requests are
// created and organized.
function RequestStatusTable({
  e,
  mutate,
}: {
  e: AuditEngagement;
  mutate: Mutate;
}) {
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
