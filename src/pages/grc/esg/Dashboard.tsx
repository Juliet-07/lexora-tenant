import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NavLink } from "react-router-dom";
import {
  Leaf,
  Users,
  Landmark,
  Gauge,
  TrendingUp,
  Target,
  Download,
  Grid3x3,
  Settings2,
} from "lucide-react";
import {
  fetchDashboard,
  fetchTopics,
  fetchCycle,
  updateContext,
  scoreGrade,
  scoreTone,
  OrgContext,
} from "@/lib/grc/esg-api";
import { exportReportPdf } from "@/lib/grc/reportExport";

export default function EsgDashboard() {
  const queryClient = useQueryClient();
  const [contextOpen, setContextOpen] = useState(false);
  const { data: dash, isLoading } = useQuery({
    queryKey: ["esgDashboard"],
    queryFn: fetchDashboard,
  });
  const { data: topics = [] } = useQuery({
    queryKey: ["esgTopics"],
    queryFn: fetchTopics,
  });
  const { data: cycle } = useQuery({
    queryKey: ["esgCycle"],
    queryFn: fetchCycle,
  });

  if (isLoading || !dash) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading ESG dashboard…
      </div>
    );
  }

  const { environmental: e, social: s, governance: g, total } = dash;

  const boardSummary = () =>
    exportReportPdf({
      id: "esg-board-summary",
      title: "Board-ready ESG Summary",
      subtitle: `period ${new Date().getFullYear()}`,
      summary: [
        {
          label: "Consolidated ESG score",
          value: `${total}/100 (${scoreGrade(total)})`,
        },
        { label: "Environmental", value: e },
        { label: "Social", value: s },
        { label: "Governance", value: g },
        { label: "Material topics", value: dash.materialTopics },
      ],
      sections: [
        {
          heading: "Pillar trend",
          columns: ["Period", "Environmental", "Social", "Governance"],
          rows: dash.trend.map((h) => [h.period, h.e, h.s, h.g]),
        },
        {
          heading: "Material topics",
          columns: [
            "Topic",
            "Pillar",
            "Financial materiality",
            "Impact materiality",
            "Escalated to risk",
          ],
          rows: dash.materialTopicsList.map((t) => [
            t.topic,
            t.pillar,
            t.financial,
            t.impact,
            t.escalatedToRisk ? "Yes" : "No",
          ]),
        },
        {
          heading: "Framework alignment",
          columns: [
            "Framework",
            "Signed off",
            "Total indicators",
            "Coverage %",
          ],
          rows: dash.frameworkAlignment.map((f) => [
            f.framework,
            f.signedOff,
            f.total,
            `${f.pct}%`,
          ]),
        },
      ],
    });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">ESG Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Consolidated E, S and G performance, materiality and framework
            alignment.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setContextOpen(true)}>
            <Settings2 className="h-4 w-4 mr-1" />
            Company profile
          </Button>
          <Button variant="outline" onClick={boardSummary}>
            <Download className="h-4 w-4 mr-1" />
            Board-ready summary
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="md:col-span-1">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Gauge className="h-4 w-4" />
              Consolidated ESG score
            </div>
            <div className="text-5xl font-bold mt-2">{total}</div>
            <Badge variant="outline" className={`mt-2 ${scoreTone(total)}`}>
              Grade {dash.grade}
            </Badge>
            <div className="mt-3 h-2 rounded bg-muted overflow-hidden">
              <div
                className={`h-full ${total >= 70 ? "bg-emerald-500" : total >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                style={{ width: `${total}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <PillarCard
          label="Environmental"
          score={e}
          peer={dash.peerBenchmark.environmental.peer}
          icon={Leaf}
          tone="from-emerald-500 to-teal-500"
          to="/grc/esg/environmental"
        />
        <PillarCard
          label="Social"
          score={s}
          peer={dash.peerBenchmark.social.peer}
          icon={Users}
          tone="from-sky-500 to-blue-500"
          to="/grc/esg/social"
        />
        <PillarCard
          label="Governance"
          score={g}
          peer={dash.peerBenchmark.governance.peer}
          icon={Landmark}
          tone="from-violet-500 to-purple-500"
          to="/grc/overview"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Year-on-year trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-6 h-48">
              {dash.trend.map((h) => (
                <div
                  key={h.period}
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  <div className="flex items-end gap-1 h-full w-full justify-center">
                    <Bar value={h.e} tone="bg-emerald-500" />
                    <Bar value={h.s} tone="bg-sky-500" />
                    <Bar value={h.g} tone="bg-violet-500" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {h.period}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
              <Legend tone="bg-emerald-500" label="Environmental" />
              <Legend tone="bg-sky-500" label="Social" />
              <Legend tone="bg-violet-500" label="Governance" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Grid3x3 className="h-4 w-4" />
              Double materiality matrix
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MatrixMini topics={topics} threshold={cycle?.threshold ?? 4} />
            <div className="text-xs text-muted-foreground mt-3">
              {dash.materialTopics} material topics above threshold{" "}
              {cycle?.threshold ?? 4}.{" "}
              <NavLink
                to="/grc/esg/materiality"
                className="text-primary underline"
              >
                Open assessment
              </NavLink>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Framework alignment
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {dash.frameworkAlignment.map((f) => (
            <NavLink
              key={f.frameworkId}
              to="/grc/esg/reporting"
              className="border rounded p-3 hover:bg-muted/50"
            >
              <div className="text-sm font-medium">{f.framework}</div>
              <div className="text-2xl font-bold">{f.pct}%</div>
              <div className="text-xs text-muted-foreground">
                {f.signedOff}/{f.total} signed off
              </div>
              <div className="mt-2 h-1.5 rounded bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${f.pct}%` }}
                />
              </div>
            </NavLink>
          ))}
          {!dash.frameworkAlignment.length && (
            <p className="col-span-full text-sm text-muted-foreground py-4 text-center">
              No frameworks yet — visit ESG Reporting to get started.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Peer benchmarking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Environmental", ...dash.peerBenchmark.environmental },
            { label: "Social", ...dash.peerBenchmark.social },
            { label: "Governance", ...dash.peerBenchmark.governance },
          ].map((row) => (
            <div key={row.label}>
              <div className="flex justify-between text-sm mb-1">
                <span>{row.label}</span>
                <span
                  className={
                    row.ours >= row.peer ? "text-emerald-600" : "text-amber-600"
                  }
                >
                  {row.ours} vs sector {row.peer}
                </span>
              </div>
              <div className="relative h-2 rounded bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${row.ours}%` }}
                />
                <div
                  className="absolute top-0 h-full w-0.5 bg-foreground"
                  style={{ left: `${row.peer}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Metrics furthest from target
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {dash.furthestFromTarget.map((m) => (
            <div
              key={m._id}
              className="flex items-center justify-between border rounded px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">{m.name}</div>
                <div className="text-xs text-muted-foreground">
                  {m.pillar} · {m.category} · {m.value} {m.unit} → target{" "}
                  {m.target} by {m.targetYear}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={
                    m.improvement >= 0
                      ? "text-xs text-emerald-600"
                      : "text-xs text-rose-600"
                  }
                >
                  {m.improvement >= 0 ? "+" : ""}
                  {m.improvement}% YoY
                </span>
                <Badge variant="outline">{m.targetProgress}%</Badge>
              </div>
            </div>
          ))}
          {!dash.furthestFromTarget.length && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No metrics tracked yet — add some from the Environmental or Social
              pages.
            </p>
          )}
        </CardContent>
      </Card>

      <ContextDialog
        open={contextOpen}
        onOpenChange={setContextOpen}
        context={dash.context}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["esgDashboard"] });
          queryClient.invalidateQueries({ queryKey: ["esgContext"] });
        }}
      />
    </div>
  );
}

function ContextDialog({
  open,
  onOpenChange,
  context,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  context: OrgContext;
  onSaved: () => void;
}) {
  const [f, setF] = useState(() => ({
    employees: context.employees,
    floorAreaSqm: context.floorAreaSqm,
    revenueMillions: context.revenueMillions,
    sector: context.sector,
    peerEnvironmental: context.peerAverage.environmental,
    peerSocial: context.peerAverage.social,
    peerGovernance: context.peerAverage.governance,
  }));

  const saveMut = useMutation({
    mutationFn: () => updateContext(f),
    onSuccess: () => {
      onSaved();
      onOpenChange(false);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (o) {
          setF({
            employees: context.employees,
            floorAreaSqm: context.floorAreaSqm,
            revenueMillions: context.revenueMillions,
            sector: context.sector,
            peerEnvironmental: context.peerAverage.environmental,
            peerSocial: context.peerAverage.social,
            peerGovernance: context.peerAverage.governance,
          });
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Company profile</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          Used for intensity calculations (per employee / per m² / per revenue
          unit) and the peer benchmarking chart below. Nothing here is pulled
          automatically from HR or elsewhere yet — set it once and update it as
          it changes.
        </p>
        <div className="space-y-3">
          <div>
            <Label>Sector</Label>
            <Input
              value={f.sector}
              onChange={(e) => setF({ ...f, sector: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Employees</Label>
              <Input
                type="number"
                value={f.employees}
                onChange={(e) =>
                  setF({ ...f, employees: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>Floor area (m²)</Label>
              <Input
                type="number"
                value={f.floorAreaSqm}
                onChange={(e) =>
                  setF({ ...f, floorAreaSqm: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>Revenue (USD m)</Label>
              <Input
                type="number"
                value={f.revenueMillions}
                onChange={(e) =>
                  setF({ ...f, revenueMillions: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <div>
            <Label>Sector peer averages (for benchmarking)</Label>
            <div className="grid grid-cols-3 gap-3 mt-1">
              <Input
                type="number"
                placeholder="Environmental"
                value={f.peerEnvironmental}
                onChange={(e) =>
                  setF({ ...f, peerEnvironmental: Number(e.target.value) })
                }
              />
              <Input
                type="number"
                placeholder="Social"
                value={f.peerSocial}
                onChange={(e) =>
                  setF({ ...f, peerSocial: Number(e.target.value) })
                }
              />
              <Input
                type="number"
                placeholder="Governance"
                value={f.peerGovernance}
                onChange={(e) =>
                  setF({ ...f, peerGovernance: Number(e.target.value) })
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
            {saveMut.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PillarCard({ label, score, peer, icon: Icon, tone, to }: any) {
  return (
    <NavLink to={to}>
      <Card className="hover:shadow-md transition-shadow h-full">
        <CardContent className="p-5">
          <div
            className={`w-9 h-9 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center mb-3`}
          >
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-3xl font-bold">{score}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Sector avg {peer} ·{" "}
            <span
              className={score >= peer ? "text-emerald-600" : "text-amber-600"}
            >
              {score >= peer ? "above" : "below"}
            </span>
          </div>
        </CardContent>
      </Card>
    </NavLink>
  );
}

function Bar({ value, tone }: { value: number; tone: string }) {
  return (
    <div className="w-3 flex flex-col justify-end h-full">
      <div className={`${tone} rounded-t`} style={{ height: `${value}%` }} />
    </div>
  );
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`w-2 h-2 rounded-sm ${tone}`} />
      {label}
    </span>
  );
}

function MatrixMini({
  topics,
  threshold,
}: {
  topics: any[];
  threshold: number;
}) {
  return (
    <div className="relative aspect-square border rounded bg-gradient-to-tr from-emerald-500/10 via-amber-500/10 to-rose-500/15">
      {[1, 2, 3, 4].map((n) => (
        <div
          key={"v" + n}
          className="absolute top-0 bottom-0 border-l border-border/50"
          style={{ left: `${n * 20}%` }}
        />
      ))}
      {[1, 2, 3, 4].map((n) => (
        <div
          key={"h" + n}
          className="absolute left-0 right-0 border-t border-border/50"
          style={{ top: `${n * 20}%` }}
        />
      ))}
      {topics.map((t) => {
        const material = Math.max(t.financial, t.impact) >= threshold;
        return (
          <div
            key={t._id}
            title={`${t.topic} — financial ${t.financial}, impact ${t.impact}`}
            className={`absolute -translate-x-1/2 translate-y-1/2 w-3 h-3 rounded-full border-2 border-background ${material ? "bg-rose-500" : "bg-sky-500"}`}
            style={{
              left: `${(t.financial / 5) * 100}%`,
              bottom: `${(t.impact / 5) * 100}%`,
            }}
          />
        );
      })}
      <span className="absolute bottom-1 right-2 text-[10px] text-muted-foreground">
        Financial materiality →
      </span>
      <span className="absolute top-2 left-1 text-[10px] text-muted-foreground [writing-mode:vertical-rl]">
        Impact materiality →
      </span>
    </div>
  );
}
