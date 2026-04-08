import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ShieldCheck, AlertTriangle, Clock } from "lucide-react";
import { complianceAlerts, clients } from "@/data/mockData";

const severityColor: Record<string, string> = { Critical: "bg-destructive text-destructive-foreground", High: "bg-warning text-warning-foreground", Medium: "bg-info text-info-foreground", Low: "bg-muted text-muted-foreground" };
const statusIcon: Record<string, typeof ShieldCheck> = { Open: AlertTriangle, "In Review": Clock, Resolved: ShieldCheck };

const riskDist = [
  { name: "Low", value: clients.filter(c => c.riskLevel === "Low").length, color: "hsl(var(--success))" },
  { name: "Medium", value: clients.filter(c => c.riskLevel === "Medium").length, color: "hsl(var(--warning))" },
  { name: "High", value: clients.filter(c => c.riskLevel === "High").length, color: "hsl(var(--destructive))" },
];

export default function Compliance() {
  const open = complianceAlerts.filter(a => a.status === "Open").length;
  const inReview = complianceAlerts.filter(a => a.status === "In Review").length;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Compliance</h1><p className="text-sm text-muted-foreground">{open} open alerts, {inReview} in review</p></div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Active Alerts</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {complianceAlerts.filter(a => a.status !== "Resolved").map(alert => {
              const Icon = statusIcon[alert.status];
              return (
                <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{alert.clientName}</span>
                      <Badge className={`text-[10px] px-1.5 py-0 ${severityColor[alert.severity]}`}>{alert.severity}</Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{alert.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                    <p className="text-xs text-muted-foreground">{alert.date}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Risk Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={riskDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
                  {riskDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {riskDist.map(r => (
                <div key={r.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
                  <span>{r.name} ({r.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Periodic Review Schedule</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {clients.filter(c => c.status === "Active").map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-muted-foreground">Last reviewed: {c.dateAdded}</p></div>
              <Badge variant="outline" className="text-xs">Due in {Math.floor(Math.random() * 90) + 30} days</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
