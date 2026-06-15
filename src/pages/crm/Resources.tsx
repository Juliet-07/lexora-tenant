import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";
import { resourceAllocations } from "@/data/crmMockData";
import { projects } from "@/data/mockData";

const utilTone = (u: number) =>
  u >= 90 ? "text-destructive" : u >= 75 ? "text-warning" : u >= 50 ? "text-success" : "text-muted-foreground";

export default function Resources() {
  const avgUtil = Math.round(
    resourceAllocations.reduce((s, r) => s + r.utilization, 0) / resourceAllocations.length,
  );
  const overAllocated = resourceAllocations.filter(r => r.utilization >= 90).length;
  const totalCapacity = resourceAllocations.reduce((s, r) => s + r.capacityHours, 0);
  const totalAllocated = resourceAllocations.reduce((s, r) => s + r.allocatedHours, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Resource Management</h1>
        <p className="text-sm text-muted-foreground">Team capacity & project allocation</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-primary/10"><Users className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Team</p><p className="text-xl font-bold">{resourceAllocations.length}</p></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-info/10"><BarChart3 className="h-5 w-5 text-info" /></div><div><p className="text-sm text-muted-foreground">Avg Utilization</p><p className="text-xl font-bold">{avgUtil}%</p></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-success/10"><TrendingUp className="h-5 w-5 text-success" /></div><div><p className="text-sm text-muted-foreground">Allocated / Capacity</p><p className="text-xl font-bold">{totalAllocated}h / {totalCapacity}h</p></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div><div><p className="text-sm text-muted-foreground">Over-allocated</p><p className="text-xl font-bold">{overAllocated}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Workload by Member</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Allocated</TableHead>
                <TableHead>Utilization</TableHead>
                <TableHead>Active Projects</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resourceAllocations.map(r => (
                <TableRow key={r.memberId}>
                  <TableCell className="text-sm font-medium">{r.memberName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.role}</TableCell>
                  <TableCell className="text-sm">{r.capacityHours}h</TableCell>
                  <TableCell className="text-sm">{r.allocatedHours}h</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 w-44">
                      <Progress value={r.utilization} className="h-2 flex-1" />
                      <span className={`text-xs font-bold ${utilTone(r.utilization)}`}>{r.utilization}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{r.projects.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Allocation Matrix</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  {projects.map(p => <TableHead key={p.id} className="text-xs">{p.name}</TableHead>)}
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resourceAllocations.map(r => (
                  <TableRow key={r.memberId}>
                    <TableCell className="text-sm font-medium">{r.memberName}</TableCell>
                    {projects.map(p => {
                      const a = r.projects.find(x => x.projectId === p.id);
                      return <TableCell key={p.id} className="text-xs">{a ? `${a.hours}h` : "—"}</TableCell>;
                    })}
                    <TableCell className="font-semibold text-sm">{r.allocatedHours}h</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
