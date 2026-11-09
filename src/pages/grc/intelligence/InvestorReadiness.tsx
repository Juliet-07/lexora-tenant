import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus } from "lucide-react";
import {
  fetchAssessments,
  type ReadinessAssessment,
  DEAL_TYPE_LABEL,
  INVESTOR_TYPE_LABEL,
} from "@/lib/grc/readiness-api";
import {
  fetchWorkspace,
  type ReadinessWorkspace,
} from "@/lib/grc/readiness-workspace-api";
import {
  EditContextDialog,
  NewAssessmentWizard,
} from "./readiness/AssessmentDialogs";
import { ScoringTab } from "./readiness/ScoringTab";
import { DataRoomTab } from "./readiness/DataRoomTab";
import { GapsTab } from "./readiness/GapsTab";
import { RemediationTab } from "./readiness/RemediationTab";
import { ReportTab } from "./readiness/ReportTab";
import { HistoryTab } from "./readiness/HistoryTab";
import { PipelineTab } from "./readiness/PipelineTab";
import { QaTab } from "./readiness/QaTab";
import { ActivityTab } from "./readiness/ActivityTab";
import { fmtDate, bandPill, type TabProps } from "./readiness/shared";

const TABS = [
  { value: "scoring", label: "Scoring", Comp: ScoringTab },
  { value: "room", label: "Data room", Comp: DataRoomTab },
  { value: "gaps", label: "Gaps", Comp: GapsTab },
  { value: "remediation", label: "Remediation", Comp: RemediationTab },
  { value: "report", label: "Report", Comp: ReportTab },
  { value: "history", label: "History", Comp: HistoryTab },
  { value: "pipeline", label: "Investor pipeline", Comp: PipelineTab },
  { value: "qa", label: "Q&A", Comp: QaTab },
  { value: "activity", label: "Activity", Comp: ActivityTab },
] as const;

// Investor Readiness always assesses the tenant's own organisation — there is
// no entity picker. The page is a shell: the assessment (versioned) and the
// workspace (data room, pipeline, Q&A, tasks, activity) are each fetched once
// and handed to every tab.
const InvestorReadiness = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<string>("scoring");
  const [selected, setSelected] = useState<string>("");
  const [wizard, setWizard] = useState(false);
  const [editCtx, setEditCtx] = useState(false);

  const assessments = useQuery({
    queryKey: ["readiness"],
    queryFn: fetchAssessments,
  });
  const workspace = useQuery({
    queryKey: ["readiness-ws"],
    queryFn: fetchWorkspace,
  });

  const versions = useMemo(
    () => [...(assessments.data ?? [])].sort((a, b) => b.version - a.version),
    [assessments.data],
  );
  const current: ReadinessAssessment | undefined =
    versions.find((v) => v._id === selected) ?? versions[0];

  const onAssessment = (a: ReadinessAssessment) =>
    qc.setQueryData<ReadinessAssessment[]>(["readiness"], (old = []) =>
      old.some((o) => o._id === a._id)
        ? old.map((o) => (o._id === a._id ? a : o))
        : [a, ...old],
    );
  const onWorkspace = (w: ReadinessWorkspace) => {
    qc.setQueryData(["readiness-ws"], w);
    // Room completeness feeds the scores, so assessments may have changed.
    qc.invalidateQueries({ queryKey: ["readiness"] });
  };

  if (assessments.isLoading || workspace.isLoading) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading investor readiness…
      </div>
    );
  }
  if (assessments.isError || workspace.isError || !workspace.data) {
    return (
      <div className="py-24 text-center text-sm text-destructive">
        Could not load investor readiness. Please refresh and try again.
      </div>
    );
  }

  const props: TabProps = {
    current,
    versions,
    ws: workspace.data,
    onAssessment,
    onWorkspace,
    onSwitch: (id) => {
      setSelected(id);
      setTab("scoring");
    },
    onNew: () => setWizard(true),
  };
  const ctx = current?.dealContext;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Investor readiness</h1>
          <p className="text-sm text-muted-foreground">
            How ready {current?.company ?? "your organisation"} is to raise —
            scored from your own records, with the data room, investor pipeline
            and remediation work alongside.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {current ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditCtx(true)}
            >
              <Pencil className="mr-2 h-4 w-4" /> Edit deal context
            </Button>
          ) : null}
          <Button size="sm" onClick={() => setWizard(true)}>
            <Plus className="mr-2 h-4 w-4" /> New assessment
          </Button>
        </div>
      </div>

      {current ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border bg-card px-4 py-3 text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Company
            </div>
            <div className="font-semibold">{current.company}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Version
            </div>
            <Select value={current._id} onValueChange={(v) => setSelected(v)}>
              <SelectTrigger
                className="h-8 w-[220px]"
                aria-label="Assessment version"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v._id} value={v._id}>
                    v{v.version} · {fmtDate(v.createdAt)} · {v.overallScore}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Deal
            </div>
            <div className="font-medium">
              {ctx ? DEAL_TYPE_LABEL[ctx.dealType] : "—"}
              {ctx?.raiseAmount
                ? ` · ${ctx.currency} ${ctx.raiseAmount.toLocaleString("en-US")}`
                : ""}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Investor type
            </div>
            <div className="font-medium">
              {ctx ? INVESTOR_TYPE_LABEL[ctx.investorType] : "—"}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Advisor
            </div>
            <div className="font-medium">{current.advisor || "—"}</div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Badge variant="outline" className={bandPill(current.band.label)}>
              {current.band.label}
            </Badge>
            <span className="text-2xl font-bold">{current.overallScore}</span>
          </div>
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto flex-wrap justify-start">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map(({ value, Comp }) => (
          <TabsContent key={value} value={value} className="mt-6">
            <Comp {...props} />
          </TabsContent>
        ))}
      </Tabs>

      <NewAssessmentWizard
        open={wizard}
        onOpenChange={setWizard}
        latest={versions[0]}
        onCreated={(a) => {
          onAssessment(a);
          setSelected(a._id);
          setTab("scoring");
          qc.invalidateQueries({ queryKey: ["readiness-ws"] });
        }}
      />
      {current ? (
        <EditContextDialog
          open={editCtx}
          onOpenChange={setEditCtx}
          assessment={current}
          onSaved={onAssessment}
        />
      ) : null}
    </div>
  );
};

export default InvestorReadiness;
