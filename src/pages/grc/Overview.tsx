import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ShieldCheck,
  FileWarning,
  ClipboardCheck,
  Activity,
  Briefcase,
} from "lucide-react";
import {
  useGrc,
  residualScore,
  scoreToBand,
  bandTone,
  riskZone,
  zoneTone,
  grcHealthScore,
  RISK_CATEGORIES,
} from "@/lib/grcStore";
import { NavLink } from "react-router-dom";

export default function GrcOverview() {
  const s = useGrc();
  const today = new Date().toISOString().slice(0, 10);

  const openRisks = s.risks.filter((r) => r.status !== "Closed");
  const extremeHigh = openRisks.filter((r) =>
    ["Extreme", "High"].includes(scoreToBand(residualScore(r))),
  ).length;
  const openIncidents = s.incidents.filter((i) => i.status !== "Closed").length;
  const overdueObligations = s.obligations.filter(
    (o) => o.status !== "Completed" && o.deadline < today,
  ).length;
  const openDeficiencies = s.deficiencies.filter(
    (d) => d.status !== "Remediated",
  ).length;
  const openFindings = s.audits
    .flatMap((a) => a.findings)
    .filter((f) => f.status !== "Closed").length;
  const vendorsHigh = s.vendors.filter(
    (v) => v.status === "Active" && ["High", "Extreme"].includes(v.riskRating),
  ).length;

  const health = grcHealthScore(s);

  // heatmap
  const cells: Record<string, number> = {};
  openRisks.forEach((r) => {
    const key = `${r.likelihood}-${r.impact}`;
    cells[key] = (cells[key] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">GRC Overview</h1>
          <p className="text-sm text-muted-foreground">
            Executive view of governance, risk and compliance posture.
          </p>
        </div>
        <Card className="min-w-[220px]">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">GRC Health Score</div>
            <div className="text-4xl font-bold mt-1">{health}<span className="text-lg text-muted-foreground">/100</span></div>
            <div className="mt-2 h-2 rounded bg-muted overflow-hidden">
              <div
                className={`h-full ${health >= 75 ? "bg-emerald-500" : health >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                style={{ width: `${health}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi to="/grc/risks" label="Open risks" value={openRisks.length} icon={AlertTriangle} tone="from-rose-500 to-orange-500" />
        <Kpi to="/grc/risks" label="Extreme / High" value={extremeHigh} icon={AlertTriangle} tone="from-orange-500 to-amber-500" />
        <Kpi to="/grc/incidents" label="Open incidents" value={openIncidents} icon={FileWarning} tone="from-red-500 to-rose-500" />
        <Kpi to="/grc/compliance" label="Overdue obligations" value={overdueObligations} icon={ShieldCheck} tone="from-amber-500 to-yellow-500" />
        <Kpi to="/grc/controls" label="Open deficiencies" value={openDeficiencies} icon={ClipboardCheck} tone="from-blue-500 to-cyan-500" />
        <Kpi to="/grc/audits" label="Open findings" value={openFindings} icon={Activity} tone="from-violet-500 to-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Risk heatmap (likelihood × impact)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-1 text-xs">
              <div />
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={"h" + i} className="text-center text-muted-foreground">I{i}</div>
              ))}
              {[5, 4, 3, 2, 1].map((l) => (
                <>
                  <div key={"lbl" + l} className="text-right pr-1 text-muted-foreground">L{l}</div>
                  {[1, 2, 3, 4, 5].map((i) => {
                    const count = cells[`${l}-${i}`] || 0;
                    const score = l * i;
                    const band = scoreToBand(score);
                    const bg =
                      band === "Extreme" ? "bg-rose-500/70"
                      : band === "High" ? "bg-orange-500/60"
                      : band === "Medium" ? "bg-amber-500/50"
                      : "bg-emerald-500/40";
                    return (
                      <div key={`c${l}${i}`} className={`h-12 rounded ${bg} flex items-center justify-center font-semibold text-white`}>
                        {count > 0 ? count : ""}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Appetite vs. actual</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {RISK_CATEGORIES.map((c) => {
              const catRisks = openRisks.filter((r) => r.category === c);
              const worst = catRisks
                .map((r) => riskZone(r, s.appetite))
                .reduce<"Green" | "Amber" | "Red">((acc, z) => {
                  if (acc === "Red" || z === "Red") return "Red";
                  if (acc === "Amber" || z === "Amber") return "Amber";
                  return "Green";
                }, "Green");
              return (
                <div key={c} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
                  <span>{c}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{catRisks.length} risks</span>
                    <Badge variant="outline" className={zoneTone(worst)}>{worst}</Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Top open risks (by residual)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {openRisks
              .slice()
              .sort((a, b) => residualScore(b) - residualScore(a))
              .slice(0, 5)
              .map((r) => {
                const rs = residualScore(r);
                const band = scoreToBand(rs);
                return (
                  <NavLink key={r.id} to="/grc/risks" className="flex items-center justify-between border rounded px-3 py-2 text-sm hover:bg-muted/50">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.title}</div>
                      <div className="text-xs text-muted-foreground">{r.category} · owner: {r.owner}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">Score {rs}</span>
                      <Badge variant="outline" className={bandTone(band)}>{band}</Badge>
                    </div>
                  </NavLink>
                );
              })}
            {openRisks.length === 0 && <div className="text-sm text-muted-foreground">No open risks.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Third-party exposure</CardTitle></CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-2">
              <Briefcase className="inline h-4 w-4 mr-1" />
              {s.vendors.filter((v) => v.status === "Active").length} active vendors, {vendorsHigh} rated High or Extreme.
            </div>
            <div className="space-y-2">
              {s.vendors.slice(0, 4).map((v) => (
                <NavLink key={v.id} to="/grc/vendors" className="flex items-center justify-between border rounded px-3 py-2 text-sm hover:bg-muted/50">
                  <div>
                    <div className="font-medium">{v.name}</div>
                    <div className="text-xs text-muted-foreground">{v.category}</div>
                  </div>
                  <Badge variant="outline" className={bandTone(v.riskRating)}>{v.riskRating}</Badge>
                </NavLink>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, tone, to }: any) {
  return (
    <NavLink to={to} className="block">
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className={`w-8 h-8 rounded bg-gradient-to-br ${tone} flex items-center justify-center mb-2`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </CardContent>
      </Card>
    </NavLink>
  );
}
