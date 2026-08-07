import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ShieldCheck,
  FileWarning,
  ClipboardCheck,
  Activity,
  Briefcase,
  Users,
  CalendarClock,
  BookOpen,
  Gavel,
  FileText,
  Building2,
  ServerCog,
  LifeBuoy,
  Handshake,
  Leaf,
  TrendingUp,
  Grid3x3,
  Scale,
  BadgeCheck,
} from "lucide-react";
import { fetchGrcOverview, bandTone, zoneTone } from "@/lib/grc/overview-api";
import { formatMoney } from "@/lib/grc/deals-api";
import { fetchDashboard } from "@/lib/grc/esg-api";
import { NavLink } from "react-router-dom";

const RISK_CATEGORIES = [
  "Strategic",
  "Operational",
  "Financial",
  "Compliance",
  "Reputational",
  "Information Security",
];

export default function GrcOverview() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ["grcOverview"],
    queryFn: fetchGrcOverview,
  });
  const { data: dash } = useQuery({
    queryKey: ["esgDashboard"],
    queryFn: fetchDashboard,
  });
  const today = new Date().toISOString().slice(0, 10);

  if (isLoading || !overview) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading GRC overview…
      </div>
    );
  }

  const {
    governance: g,
    risk: r,
    operations: ops,
    thirdPartyBcp: tp,
    compliance: comp,
    deals,
    dealIntelligence: intel,
    healthScore: health,
  } = overview;

  // ── Risk
  const openRisks = r.risks.filter((x) => x.status !== "Closed");
  const extremeHigh = openRisks.filter((x) =>
    ["Extreme", "High"].includes(x.residualBand),
  ).length;

  // ── Compliance
  const openIncidents = ops.incidents.filter(
    (i) => i.status !== "Closed",
  ).length;
  const overdueObligations = comp.obligations.filter(
    (o) => o.status === "Overdue",
  ).length;
  const upcomingObligations = comp.obligations.filter(
    (o) => o.status === "Due",
  ).length;
  const regUpdates = comp.regulatoryChanges.length;
  const certsExpiring = comp.certifications.filter(
    (c) => c.expiryDate <= new Date(Date.now() + 90 * 86400000).toISOString(),
  ).length;
  const openRegChanges = comp.regulatoryChanges.filter(
    (c) => c.assessmentStatus !== "Complete",
  ).length;
  const totalAcknowledgments = comp.policies.reduce(
    (t, p) => t + p.acknowledgments.length,
    0,
  );

  // ── Operations
  const openDeficiencies = r.deficiencies.filter(
    (d) => d.status !== "Closed",
  ).length;
  const openFindings = ops.audits
    .flatMap((a) => a.findings)
    .filter((f) => f.status !== "Remediated" && f.status !== "Closed").length;
  const activeAudits = ops.audits.filter((a) => a.status !== "Closed").length;

  // ── Third-Party
  const activeVendors = tp.vendors.filter((v) => v.status === "Active").length;
  const vendorsHigh = tp.vendors.filter(
    (v) => v.status === "Active" && ["High", "Extreme"].includes(v.riskRating),
  ).length;
  const vendorsDueReview = tp.vendors.filter(
    (v) => v.status === "Active" && v.nextReviewDate < today,
  ).length;

  // ── BCP/DR
  const bcpPlans = tp.bcpPlans.length;
  const lastBcpTest = tp.bcpTests
    .slice()
    .sort((a, b) => (a.testedAt < b.testedAt ? 1 : -1))[0];
  const tier1Systems = tp.rtoRpo.filter(
    (x) => x.criticality === "Tier 1",
  ).length;

  // ── Governance
  const upcomingMeetings = g.meetings.filter(
    (m) => m.status !== "Postponed" && m.date.slice(0, 10) >= today,
  ).length;
  const draftMeetings = g.meetings.filter((m) => m.status === "Draft").length;
  const committees = g.committees.length;
  const openCommitteeTasks = g.committees
    .flatMap((c) => c.tasks)
    .filter((t) => t.status !== "Done").length;
  const directors = g.boardMembers.length;
  const expiringTerms = g.boardMembers.filter((b) => {
    const daysLeft = (new Date(b.termEnds).getTime() - Date.now()) / 86400000;
    return daysLeft <= 180;
  }).length;
  const publishedCodes = g.codes.filter((c) => c.status === "Published").length;
  const openResolutions = g.resolutions.filter(
    (x) => x.status !== "Closed",
  ).length;

  // ── Risk programme
  const watchListed = r.emergingRisks.filter(
    (e) => e.status === "Watching",
  ).length;
  const testsDue = r.controlTests.filter(
    (t) => t.status !== "Signed off" && t.status !== "Completed",
  ).length;

  // ── Deals
  const activeDeals = deals.deals.filter((d) => d.status === "Active");
  const pipelineValue = activeDeals.reduce((t, d) => t + d.value, 0);

  // ── ESG (own real API — see EsgDashboard)
  const esgE = dash?.environmental ?? 0;
  const esgS = dash?.social ?? 0;
  const esgTotal = dash?.total ?? 0;
  const materialTopics = dash?.materialTopics ?? 0;
  const frameworkAlignment = dash?.frameworkAlignment ?? [];

  // heatmap
  const cells: Record<string, number> = {};
  openRisks.forEach((x) => {
    const key = `${x.likelihood}-${x.impact}`;
    cells[key] = (cells[key] || 0) + 1;
  });

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">GRC Overview</h1>
          <p className="text-sm text-muted-foreground">
            Executive view across governance, risk, compliance, operations,
            third-party and BCP.
          </p>
        </div>
        <Card className="min-w-[240px]">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">
              GRC Health Score
            </div>
            <div className="text-4xl font-bold mt-1">
              {health}
              <span className="text-lg text-muted-foreground">/100</span>
            </div>
            <div className="mt-2 h-2 rounded bg-muted overflow-hidden">
              <div
                className={`h-full ${health >= 75 ? "bg-emerald-500" : health >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                style={{ width: `${health}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── GOVERNANCE ─────────────────────────────────────────── */}
      <Section
        title="Governance"
        icon={Gavel}
        accent="from-indigo-500 to-violet-500"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Kpi
            to="/grc/governance/meetings"
            label="Upcoming meetings"
            value={upcomingMeetings}
            icon={CalendarClock}
            tone="from-indigo-500 to-blue-500"
          />
          <Kpi
            to="/grc/governance/meetings"
            label="Draft meetings"
            value={draftMeetings}
            icon={FileText}
            tone="from-slate-500 to-slate-700"
          />
          <Kpi
            to="/grc/governance/committees"
            label="Committees"
            value={committees}
            icon={Users}
            tone="from-violet-500 to-purple-500"
          />
          <Kpi
            to="/grc/governance/committees"
            label="Open comm. tasks"
            value={openCommitteeTasks}
            icon={ClipboardCheck}
            tone="from-fuchsia-500 to-pink-500"
          />
          <Kpi
            to="/grc/governance/board"
            label="Board directors"
            value={directors}
            icon={Users}
            tone="from-blue-500 to-cyan-500"
          />
          <Kpi
            to="/grc/governance/codes"
            label="Published codes"
            value={publishedCodes}
            icon={BookOpen}
            tone="from-emerald-500 to-teal-500"
          />
          <Kpi
            to="/grc/governance/resolutions"
            label="Open resolutions"
            value={openResolutions}
            icon={Gavel}
            tone="from-amber-500 to-orange-500"
          />
        </div>
        {expiringTerms > 0 && (
          <div className="mt-3 text-xs text-amber-700 dark:text-amber-400">
            {expiringTerms} director term{expiringTerms !== 1 ? "s" : ""} ending
            within 180 days — plan succession.
          </div>
        )}
      </Section>

      {/* ── RISK ───────────────────────────────────────────────── */}
      <Section
        title="Risk"
        icon={AlertTriangle}
        accent="from-rose-500 to-orange-500"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Kpi
            to="/grc/risk/register"
            label="Open risks"
            value={openRisks.length}
            icon={AlertTriangle}
            tone="from-rose-500 to-orange-500"
          />
          <Kpi
            to="/grc/risk/register"
            label="Extreme / High"
            value={extremeHigh}
            icon={AlertTriangle}
            tone="from-orange-500 to-amber-500"
          />
          <Kpi
            to="/grc/risk/controls"
            label="Open deficiencies"
            value={openDeficiencies}
            icon={ClipboardCheck}
            tone="from-blue-500 to-cyan-500"
          />
          <Kpi
            to="/grc/risk/treatment"
            label="Treatment plans"
            value={r.treatmentPlans.length}
            icon={ShieldCheck}
            tone="from-emerald-500 to-teal-500"
          />
          <Kpi
            to="/grc/risk/emerging"
            label="Emerging risks watched"
            value={watchListed}
            icon={TrendingUp}
            tone="from-fuchsia-500 to-pink-500"
          />
          <Kpi
            to="/grc/risk/controls"
            label="Control tests outstanding"
            value={testsDue}
            icon={ClipboardCheck}
            tone="from-indigo-500 to-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Risk heatmap (likelihood × impact)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-1 text-xs">
                <div />
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={"h" + i}
                    className="text-center text-muted-foreground"
                  >
                    I{i}
                  </div>
                ))}
                {[5, 4, 3, 2, 1].map((l) => (
                  <div key={"row" + l} className="contents">
                    <div className="text-right pr-1 text-muted-foreground">
                      L{l}
                    </div>
                    {[1, 2, 3, 4, 5].map((i) => {
                      const count = cells[`${l}-${i}`] || 0;
                      const score = l * i;
                      const band =
                        score >= 17
                          ? "Extreme"
                          : score >= 10
                            ? "High"
                            : score >= 5
                              ? "Medium"
                              : "Low";
                      const bg =
                        band === "Extreme"
                          ? "bg-rose-500/70"
                          : band === "High"
                            ? "bg-orange-500/60"
                            : band === "Medium"
                              ? "bg-amber-500/50"
                              : "bg-emerald-500/40";
                      return (
                        <div
                          key={`c${l}${i}`}
                          className={`h-12 rounded ${bg} flex items-center justify-center font-semibold text-white`}
                        >
                          {count > 0 ? count : ""}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appetite vs. actual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {RISK_CATEGORIES.map((c) => {
                const catRisks = openRisks.filter((x) => x.category === c);
                const worst = catRisks.reduce<"Green" | "Amber" | "Red">(
                  (acc, x) => {
                    if (acc === "Red" || x.zone === "Red") return "Red";
                    if (acc === "Amber" || x.zone === "Amber") return "Amber";
                    return "Green";
                  },
                  "Green",
                );
                return (
                  <div
                    key={c}
                    className="flex items-center justify-between border rounded px-3 py-2 text-sm"
                  >
                    <span>{c}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {catRisks.length} risks
                      </span>
                      <Badge variant="outline" className={zoneTone(worst)}>
                        {worst}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">
              Top open risks (by residual)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {openRisks
              .slice()
              .sort((a, b) => b.residualScore - a.residualScore)
              .slice(0, 5)
              .map((x) => (
                <NavLink
                  key={x._id}
                  to="/grc/risk/register"
                  className="flex items-center justify-between border rounded px-3 py-2 text-sm hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{x.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {x.category} · owner: {x.owner}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">Score {x.residualScore}</span>
                    <Badge
                      variant="outline"
                      className={bandTone(x.residualBand)}
                    >
                      {x.residualBand}
                    </Badge>
                  </div>
                </NavLink>
              ))}
            {openRisks.length === 0 && (
              <div className="text-sm text-muted-foreground">
                No open risks.
              </div>
            )}
          </CardContent>
        </Card>
      </Section>

      {/* ── COMPLIANCE ─────────────────────────────────────────── */}
      <Section
        title="Compliance"
        icon={ShieldCheck}
        accent="from-amber-500 to-yellow-500"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Kpi
            to="/grc/compliance/obligations"
            label="Overdue obligations"
            value={overdueObligations}
            icon={AlertTriangle}
            tone="from-rose-500 to-orange-500"
          />
          <Kpi
            to="/grc/compliance/calendar"
            label="Due obligations"
            value={upcomingObligations}
            icon={CalendarClock}
            tone="from-amber-500 to-yellow-500"
          />
          <Kpi
            to="/grc/compliance/obligations"
            label="Regulatory updates"
            value={regUpdates}
            icon={FileText}
            tone="from-blue-500 to-cyan-500"
          />
          <Kpi
            to="/grc/compliance/policies"
            label="Policy acknowledgments"
            value={totalAcknowledgments}
            icon={ClipboardCheck}
            tone="from-emerald-500 to-teal-500"
          />
          <Kpi
            to="/grc/compliance/certifications"
            label="Certs expiring ≤90d"
            value={certsExpiring}
            icon={BadgeCheck}
            tone="from-violet-500 to-purple-500"
          />
          <Kpi
            to="/grc/compliance/regulatory-change"
            label="Change assessments open"
            value={openRegChanges}
            icon={Scale}
            tone="from-cyan-500 to-blue-500"
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming obligations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {comp.obligations
              .filter(
                (o) =>
                  o.status !== "Compliant" && o.status !== "Not Applicable",
              )
              .sort((a, b) => (a.nextDueDate < b.nextDueDate ? -1 : 1))
              .slice(0, 5)
              .map((o) => (
                <NavLink
                  key={o._id}
                  to="/grc/compliance/obligations"
                  className="flex items-center justify-between border rounded px-3 py-2 text-sm hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{o.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {o.regulator} · owner: {o.owner}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      o.status === "Overdue"
                        ? "text-rose-600 border-rose-200"
                        : ""
                    }
                  >
                    {new Date(o.nextDueDate).toLocaleDateString()}
                  </Badge>
                </NavLink>
              ))}
            {comp.obligations.length === 0 && (
              <div className="text-sm text-muted-foreground">
                No obligations tracked.
              </div>
            )}
          </CardContent>
        </Card>
      </Section>

      {/* ── OPERATIONS ─────────────────────────────────────────── */}
      <Section
        title="Operations"
        icon={Activity}
        accent="from-violet-500 to-purple-500"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Kpi
            to="/grc/risk/incidents"
            label="Open incidents"
            value={openIncidents}
            icon={FileWarning}
            tone="from-red-500 to-rose-500"
          />
          <Kpi
            to="/grc/compliance/audits"
            label="Active audits"
            value={activeAudits}
            icon={ClipboardCheck}
            tone="from-indigo-500 to-blue-500"
          />
          <Kpi
            to="/grc/compliance/audits"
            label="Open findings"
            value={openFindings}
            icon={Activity}
            tone="from-violet-500 to-purple-500"
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent incidents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ops.incidents.slice(0, 5).map((i) => (
              <NavLink
                key={i._id}
                to="/grc/risk/incidents"
                className="flex items-center justify-between border rounded px-3 py-2 text-sm hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{i.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {i.category} · {new Date(i.reportedAt).toLocaleDateString()}
                  </div>
                </div>
                <Badge variant="outline" className={bandTone(i.severity)}>
                  {i.severity}
                </Badge>
              </NavLink>
            ))}
            {ops.incidents.length === 0 && (
              <div className="text-sm text-muted-foreground">No incidents.</div>
            )}
          </CardContent>
        </Card>
      </Section>

      {/* ── THIRD-PARTY ────────────────────────────────────────── */}
      <Section
        title="Third-Party"
        icon={Briefcase}
        accent="from-cyan-500 to-blue-500"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <Kpi
            to="/grc/risk/vendors"
            label="Active vendors"
            value={activeVendors}
            icon={Building2}
            tone="from-cyan-500 to-blue-500"
          />
          <Kpi
            to="/grc/risk/vendors"
            label="High / Extreme risk"
            value={vendorsHigh}
            icon={AlertTriangle}
            tone="from-rose-500 to-orange-500"
          />
          <Kpi
            to="/grc/risk/vendors"
            label="Due for review"
            value={vendorsDueReview}
            icon={CalendarClock}
            tone="from-amber-500 to-yellow-500"
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendor exposure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tp.vendors.slice(0, 5).map((v) => (
              <NavLink
                key={v._id}
                to="/grc/risk/vendors"
                className="flex items-center justify-between border rounded px-3 py-2 text-sm hover:bg-muted/50"
              >
                <div>
                  <div className="font-medium">{v.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {v.category}
                  </div>
                </div>
                <Badge variant="outline" className={bandTone(v.riskRating)}>
                  {v.riskRating}
                </Badge>
              </NavLink>
            ))}
            {tp.vendors.length === 0 && (
              <div className="text-sm text-muted-foreground">
                No vendors registered.
              </div>
            )}
          </CardContent>
        </Card>
      </Section>

      {/* ── BCP / DR ───────────────────────────────────────────── */}
      <Section
        title="Business Continuity & DR"
        icon={LifeBuoy}
        accent="from-emerald-500 to-teal-500"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Kpi
            to="/grc/risk/bcp"
            label="BCP plans"
            value={bcpPlans}
            icon={FileText}
            tone="from-emerald-500 to-teal-500"
          />
          <Kpi
            to="/grc/risk/bcp"
            label="Tier-1 systems"
            value={tier1Systems}
            icon={ServerCog}
            tone="from-blue-500 to-cyan-500"
          />
          <Kpi
            to="/grc/risk/bcp"
            label="Crisis contacts"
            value={tp.crisisContacts.length}
            icon={Users}
            tone="from-violet-500 to-purple-500"
          />
          <Kpi
            to="/grc/risk/bcp"
            label="Last test"
            value={lastBcpTest ? lastBcpTest.outcome : "—"}
            icon={ClipboardCheck}
            tone="from-amber-500 to-yellow-500"
          />
        </div>
        {lastBcpTest && (
          <div className="text-xs text-muted-foreground">
            Last exercise: {new Date(lastBcpTest.testedAt).toLocaleDateString()}{" "}
            · {lastBcpTest.notes}
          </div>
        )}
      </Section>

      {/* ── DEALS & TRANSACTIONS ───────────────────────────────── */}
      <Section
        title="Deals & Transactions"
        icon={Handshake}
        accent="from-teal-500 to-emerald-500"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Kpi
            to="/grc/deals/pipeline"
            label="Active deals"
            value={activeDeals.length}
            icon={Handshake}
            tone="from-teal-500 to-emerald-500"
          />
          <Kpi
            to="/grc/deals/pipeline"
            label="Pipeline value"
            value={formatMoney(pipelineValue)}
            icon={TrendingUp}
            tone="from-emerald-500 to-lime-500"
          />
          <Kpi
            to="/grc/deals/clauses"
            label="Clause library"
            value={deals.clauses.length}
            icon={Scale}
            tone="from-blue-500 to-cyan-500"
          />
          <Kpi
            to="/grc/intelligence/investor-readiness"
            label="Readiness assessments"
            value={intel.readiness.length}
            icon={ClipboardCheck}
            tone="from-indigo-500 to-violet-500"
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deals nearing close</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeDeals
              .slice()
              .sort((a, b) => (a.targetClose < b.targetClose ? -1 : 1))
              .slice(0, 5)
              .map((d) => (
                <NavLink
                  key={d._id}
                  to={`/grc/deals/${d._id}`}
                  className="flex items-center justify-between border rounded px-3 py-2 text-sm hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{d.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.type} · {d.client} · lead {d.leadPartner}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs">
                      {formatMoney(d.value, d.currency)}
                    </span>
                    <Badge variant="outline">{d.stage}</Badge>
                  </div>
                </NavLink>
              ))}
            {activeDeals.length === 0 && (
              <div className="text-sm text-muted-foreground">
                No active deals.
              </div>
            )}
          </CardContent>
        </Card>
      </Section>

      {/* ── ESG ────────────────────────────────────────────────── */}
      <Section title="ESG" icon={Leaf} accent="from-lime-500 to-emerald-500">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Kpi
            to="/grc/esg/dashboard"
            label={`ESG score (${dash?.grade ?? "—"})`}
            value={esgTotal}
            icon={Leaf}
            tone="from-lime-500 to-emerald-500"
          />
          <Kpi
            to="/grc/esg/environmental"
            label="Environmental"
            value={esgE}
            icon={Leaf}
            tone="from-emerald-500 to-teal-500"
          />
          <Kpi
            to="/grc/esg/social"
            label="Social"
            value={esgS}
            icon={Users}
            tone="from-sky-500 to-blue-500"
          />
          <Kpi
            to="/grc/esg/materiality"
            label="Material topics"
            value={materialTopics}
            icon={Grid3x3}
            tone="from-amber-500 to-orange-500"
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Framework alignment</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {frameworkAlignment.map((f) => (
              <NavLink
                key={f.frameworkId}
                to="/grc/esg/reporting"
                className="border rounded p-3 hover:bg-muted/50"
              >
                <div className="text-sm font-medium">{f.framework}</div>
                <div className="text-xl font-bold">{f.pct}%</div>
                <div className="text-xs text-muted-foreground">
                  {f.signedOff}/{f.total}
                </div>
              </NavLink>
            ))}
            {!frameworkAlignment.length && (
              <p className="col-span-full text-sm text-muted-foreground text-center py-4">
                No frameworks configured yet.
              </p>
            )}
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}

function Section({ title, icon: Icon, accent, children }: any) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`w-8 h-8 rounded bg-gradient-to-br ${accent} flex items-center justify-center`}
        >
          <Icon className="h-4 w-4 text-white" />
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Kpi({ label, value, icon: Icon, tone, to }: any) {
  return (
    <NavLink to={to} className="block">
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div
            className={`w-8 h-8 rounded bg-gradient-to-br ${tone} flex items-center justify-center mb-2`}
          >
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </CardContent>
      </Card>
    </NavLink>
  );
}
