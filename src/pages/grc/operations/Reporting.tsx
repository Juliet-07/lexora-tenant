import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { BarChart3, FileWarning, ShieldCheck, ClipboardCheck, BookOpen, TrendingUp } from "lucide-react";
import { useGrc, residualScore, scoreToBand, bandTone } from "@/lib/grcStore";

// Operations reporting — cross-cutting operational view over incidents,
// policies, audits, and control deficiencies. Read-only aggregate.
export default function GrcReporting() {
  const s = useGrc();
  const today = new Date().toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const openIncidents = s.incidents.filter((i) => i.status !== "Closed");
    const overduePolicies = s.policies.filter((p) => p.nextReviewDate < today);
    const openFindings = s.audits.flatMap((a) => a.findings).filter((f) => f.status !== "Closed" && f.status !== "Remediated");
    const openDefs = s.deficiencies.filter((d) => d.status !== "Remediated");
    const ackRate = (() => {
      const all = s.policies.flatMap((p) => p.acknowledgments);
      if (all.length === 0) return 100;
      return Math.round((all.filter((a) => a.ackAt).length / all.length) * 100);
    })();
    return { openIncidents, overduePolicies, openFindings, openDefs, ackRate };
  }, [s, today]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Operations Reporting</h1>
        <p className="text-sm text-muted-foreground">
          Consolidated view of incidents, policies, audits, and control deficiencies.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Open incidents" value={stats.openIncidents.length} tone="from-rose-500/15 to-rose-500/5" icon={<FileWarning className="h-5 w-5" />} />
        <StatCard label="Overdue policies" value={stats.overduePolicies.length} tone="from-amber-500/15 to-amber-500/5" icon={<BookOpen className="h-5 w-5" />} />
        <StatCard label="Open audit findings" value={stats.openFindings.length} tone="from-orange-500/15 to-orange-500/5" icon={<ClipboardCheck className="h-5 w-5" />} />
        <StatCard label="Open deficiencies" value={stats.openDefs.length} tone="from-primary/15 to-primary/5" icon={<ShieldCheck className="h-5 w-5" />} />
        <StatCard label="Policy ack rate" value={`${stats.ackRate}%`} tone="from-emerald-500/15 to-emerald-500/5" icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileWarning className="h-4 w-4" />Incident hotspots</CardTitle></CardHeader>
          <CardContent className="p-0"><Table>
            <TableHeader><TableRow>
              <TableHead>Title</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {stats.openIncidents.slice(0, 8).map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="text-sm">{i.title}</TableCell>
                  <TableCell><Badge variant="outline" className={i.severity === "Critical" || i.severity === "High" ? "text-rose-600 border-rose-500/30" : ""}>{i.severity}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{i.status}</Badge></TableCell>
                </TableRow>
              ))}
              {stats.openIncidents.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">All incidents closed.</TableCell></TableRow>}
            </TableBody>
          </Table></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="h-4 w-4" />Findings needing remediation</CardTitle></CardHeader>
          <CardContent className="p-0"><Table>
            <TableHeader><TableRow>
              <TableHead>Observation</TableHead><TableHead>Severity</TableHead><TableHead>Due</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {stats.openFindings.slice(0, 8).map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="text-sm">{f.observation}</TableCell>
                  <TableCell><Badge variant="outline">{f.severity}</Badge></TableCell>
                  <TableCell className={(f.remediationDueDate ?? "") < today ? "text-rose-600 text-xs" : "text-xs"}>{f.remediationDueDate ?? "—"}</TableCell>
                </TableRow>
              ))}
              {stats.openFindings.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">No open findings.</TableCell></TableRow>}
            </TableBody>
          </Table></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" />Residual risk distribution</CardTitle></CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-4 gap-3">
            {(["Extreme", "High", "Medium", "Low"] as const).map((band) => {
              const count = s.risks.filter((r) => r.status !== "Closed" && scoreToBand(residualScore(r)) === band).length;
              return (
                <div key={band} className="border rounded p-3">
                  <div className="text-3xl font-bold">{count}</div>
                  <Badge variant="outline" className={`mt-1 ${bandTone(band)}`}>{band}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, tone, icon }: any) {
  return (
    <Card><CardContent className="p-4 flex items-center gap-3">
      <div className={`h-11 w-11 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center text-primary`}>{icon}</div>
      <div><div className="text-2xl font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>
    </CardContent></Card>
  );
}
