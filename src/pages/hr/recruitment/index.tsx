import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Briefcase,
  Users,
  Clock,
  Star,
  LogOut,
  CheckCircle,
} from "lucide-react";
import {
  fetchAllCandidates,
  fetchAllOffboarding,
  fetchJobOpenings,
  type Candidate,
  type OffboardingRecord,
} from "@/lib/hr/hr-recruitment-api";
import { Stat } from "./shared";
import {
  PipelineTab,
  AddCandidateDialog,
  GenerateContractDialog,
} from "./Pipeline";
import { OnboardingTab } from "./Onboarding";
import {
  OffboardingTab,
  NewOffboardingDialog,
  OffboardingDetailPanel,
} from "./Offboarding";
import { SuccessionTab } from "./SuccessionPlanning";
import { JobOpeningTab } from "./JobOpening";

export default function HRRecruitment() {
  const [searchParams, setSearchParams] = useSearchParams();

  const validTabs = useMemo(
    () =>
      new Set([
        "pipeline",
        "onboarding",
        "offboarding",
        "succession",
        "openings",
      ]),
    [],
  );
  const requestedTab = searchParams.get("tab") ?? "pipeline";
  const activeTab = validTabs.has(requestedTab) ? requestedTab : "pipeline";
  const setActiveTab = (v: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", v);
    setSearchParams(next, { replace: true });
  };

  // ── Job Openings — real, backend-persisted ──
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["job-openings"],
    queryFn: fetchJobOpenings,
  });

  // ── Real data ──
  const { data: candidates = [], isLoading: candidatesLoading } = useQuery({
    queryKey: ["recruitment-candidates"],
    queryFn: () => fetchAllCandidates(),
  });

  const { data: offboarding = [], isLoading: offboardingLoading } = useQuery({
    queryKey: ["recruitment-offboarding"],
    queryFn: () => fetchAllOffboarding(),
  });

  const summary = useMemo(
    () => ({
      openings: jobs.filter((j) => j.status === "Open").length,
      applicants: candidates.length,
      interviews: candidates.filter((c) => c.stage === "interview").length,
      offers: candidates.filter((c) => c.stage === "offer").length,
    }),
    [jobs, candidates],
  );

  const offboardingActive = offboarding.filter(
    (o) => o.status !== "completed",
  ).length;
  const offboardingCompleted = offboarding.filter(
    (o) => o.status === "completed",
  ).length;

  const [newCandidateOpen, setNewCandidateOpen] = useState(false);
  const [openOffboarding, setOpenOffboarding] =
    useState<OffboardingRecord | null>(null);

  // ── New Offboarding — opened from "+ New Offboarding" on this tab,
  // or by navigating here from the employee data sheet's Terminate
  // button (?tab=offboarding&newOffboarding=<employeeId>).
  const [newOffboardingOpen, setNewOffboardingOpen] = useState(false);
  const [newOffboardingEmployeeId, setNewOffboardingEmployeeId] = useState<
    string | null
  >(null);
  const navEmployeeId = searchParams.get("newOffboarding");

  useEffect(() => {
    if (navEmployeeId) {
      setNewOffboardingEmployeeId(navEmployeeId);
      setNewOffboardingOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("newOffboarding");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navEmployeeId]);

  // ── Hired → contract generation hook ──
  // Set by PipelineColumn's onHired callback the moment a candidate
  // is successfully moved to "hired". Opens GenerateContractDialog,
  // which lets the tenant pick a template (filtered to the
  // candidate's own workerCategory) or skip entirely. The candidate
  // is ALREADY correctly marked "hired" by the time this fires —
  // skipping the dialog never leaves the pipeline in a bad state,
  // it just means no contract gets drafted right now.
  const [hiredCandidate, setHiredCandidate] = useState<Candidate | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Recruitment</h1>
          <p className="text-sm text-muted-foreground">
            Manage roles, pipelines and candidate decisions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Open Roles"
          value={summary.openings}
          icon={Briefcase}
          tone="from-primary to-secondary"
        />
        <Stat
          label="Candidates"
          value={summary.applicants}
          icon={Users}
          tone="from-blue-500 to-cyan-500"
        />
        <Stat
          label="Interviews"
          value={summary.interviews}
          icon={Clock}
          tone="from-amber-500 to-orange-500"
        />
        <Stat
          label="Offers Out"
          value={summary.offers}
          icon={Star}
          tone="from-violet-500 to-purple-600"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Stat
          label="Offboarding Active"
          value={offboardingActive}
          icon={LogOut}
          tone="from-rose-500 to-red-600"
        />
        <Stat
          label="Offboarding Completed"
          value={offboardingCompleted}
          icon={CheckCircle}
          tone="from-slate-500 to-zinc-600"
        />
        <Stat
          label="Total Candidates"
          value={candidates.length}
          icon={Users}
          tone="from-emerald-500 to-teal-500"
        />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="pipeline">Candidate Pipeline</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="offboarding">Offboarding</TabsTrigger>
          <TabsTrigger value="succession">Succession Planning</TabsTrigger>
          <TabsTrigger value="openings">Job Openings</TabsTrigger>
        </TabsList>

        <PipelineTab
          candidates={candidates}
          candidatesLoading={candidatesLoading}
          onAddCandidate={() => setNewCandidateOpen(true)}
          onHired={setHiredCandidate}
        />

        <OnboardingTab />

        <OffboardingTab
          offboarding={offboarding}
          offboardingLoading={offboardingLoading}
          onOpenRecord={setOpenOffboarding}
          onNewOffboarding={() => {
            setNewOffboardingEmployeeId(null);
            setNewOffboardingOpen(true);
          }}
        />

        <SuccessionTab />

        <JobOpeningTab jobs={jobs} jobsLoading={jobsLoading} />
      </Tabs>

      <AddCandidateDialog
        open={newCandidateOpen}
        onClose={() => setNewCandidateOpen(false)}
      />
      <NewOffboardingDialog
        open={newOffboardingOpen}
        preselectedEmployeeId={newOffboardingEmployeeId}
        onClose={() => {
          setNewOffboardingOpen(false);
          setNewOffboardingEmployeeId(null);
        }}
      />
      <OffboardingDetailPanel
        record={openOffboarding}
        onClose={() => setOpenOffboarding(null)}
      />
      <GenerateContractDialog
        candidate={hiredCandidate}
        onClose={() => setHiredCandidate(null)}
      />
    </div>
  );
}
