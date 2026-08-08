import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Timer, ShieldAlert, ClipboardCheck, BarChart3, Pause, Play, Pencil,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  slaProfiles as seedProfiles, slaCompliance, slaTrend, SlaProfile,
} from "@/data/crmClientMockData";
import { tickets } from "@/data/crmPmMockData";
import { useClientCommercials } from "@/lib/crm/clientCommercialStore";
import { Link } from "react-router-dom";
import { Link2 } from "lucide-react";

const PRIORITIES: ("Critical" | "High" | "Medium" | "Low")[] = ["Critical", "High", "Medium", "Low"];

const tierClass: Record<string, string> = {
  Premium: "bg-primary/15 text-primary border-primary/30",
  Standard: "bg-warning/15 text-warning border-warning/30",
  Basic: "bg-muted text-muted-foreground",
};

const pctClass = (pct: number) =>
  pct >= 90 ? "text-destructive" : pct >= 75 ? "text-warning" : "text-success";
const barClass = (pct: number) =>
  pct >= 90 ? "bg-destructive" : pct >= 75 ? "bg-warning" : "bg-success";

export default function Sla() {
  const { toast } = useToast();
  const commercials = useClientCommercials();
  const assignedClients = (profileId: string) =>
    Object.values(commercials)
      .filter((c) => c.slaProfileId === profileId)
      .map((c) => c.clientName);
  const [profiles, setProfiles] = useState<SlaProfile[]>(seedProfiles);
  const [editing, setEditing] = useState<SlaProfile | null>(null);
  const [editDraft, setEditDraft] = useState<SlaProfile | null>(null);

  const [timers, setTimers] = useState(
    tickets.map((t) => ({
      ...t,
      paused: t.status === "Pending Client",
      pct: Math.min(100, Math.round((t.slaElapsedHrs / t.slaTargetHrs) * 100)),
    })),
  );

  const [thresholds, setThresholds] = useState({ t75: true, t90: true, t100: true });
  const [scopeFilter, setScopeFilter] = useState("all");

  const togglePause = (id: string) => {
    setTimers((p) => p.map((t) => (t.id === id ? { ...t, paused: !t.paused } : t)));
    toast({ title: "Timer updated", description: "SLA clock paused/resumed for ticket." });
  };

  const openEdit = (p: SlaProfile) => { setEditing(p); setEditDraft({ ...p, responseHrs: { ...p.responseHrs }, resolutionHrs: { ...p.resolutionHrs } }); };
  const saveEdit = () => {
    if (!editDraft) return;
    setProfiles((p) => p.map((pr) => (pr.id === editDraft.id ? editDraft : pr)));
    setEditing(null);
    toast({ title: "SLA profile updated", description: `${editDraft.tier} tier matrix saved.` });
  };

  const filteredCompliance = slaCompliance.filter((c) => scopeFilter === "all" || c.type === scopeFilter);

  const breachedCount = timers.filter((t) => t.pct >= 100).length;
  const avgCompliance = Math.round(slaCompliance.reduce((s, c) => s + c.actual, 0) / slaCompliance.length);
  const kpis = [
    { l: "SLA profiles", v: profiles.length, icon: ClipboardCheck },
    { l: "Active timers", v: timers.length, icon: Timer },
    { l: "Currently breached", v: breachedCount, icon: ShieldAlert },
    { l: "Avg. compliance", v: `${avgCompliance}%`, icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SLA Management</h1>
        <p className="text-sm text-muted-foreground">Service level profiles, live timers, escalation and compliance reporting.</p>
        <Button asChild size="sm" variant="outline" className="mt-3">
          <Link to="/crm/clients"><Link2 className="mr-1 h-3 w-3" />Assign clients to SLA profiles</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.l}>
            <CardContent className="flex items-center justify-between p-4">
              <div><p className="text-xs text-muted-foreground">{k.l}</p><p className="mt-1 text-xl font-bold">{k.v}</p></div>
              <k.icon className="h-6 w-6 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="profiles">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profiles">Profiles</TabsTrigger>
          <TabsTrigger value="timers">Active timers</TabsTrigger>
          <TabsTrigger value="breach">Breach management</TabsTrigger>
          <TabsTrigger value="reporting">Reporting</TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="pt-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {profiles.map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{p.tier}</CardTitle>
                    <Badge variant="outline" className={tierClass[p.tier]}>{p.serviceType}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead className="text-xs">Priority</TableHead><TableHead className="text-xs">Response</TableHead><TableHead className="text-xs">Resolution</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {PRIORITIES.map((pr) => (
                        <TableRow key={pr}>
                          <TableCell className="py-1.5 text-xs">{pr}</TableCell>
                          <TableCell className="py-1.5 text-xs">{p.responseHrs[pr]}h</TableCell>
                          <TableCell className="py-1.5 text-xs">{p.resolutionHrs[pr]}h</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div>
                    <p className="text-xs text-muted-foreground">Clients covered (assigned in Client Management)</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {assignedClients(p.id).length ? (
                        assignedClients(p.id).map((c) => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)
                      ) : (
                        <span className="text-xs text-muted-foreground">No clients assigned yet.</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.escalations}</p>
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Pencil className="mr-1 h-3 w-3" />Edit</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="timers" className="pt-4">
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-52">SLA elapsed</TableHead>
                    <TableHead>Pause</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell><p className="text-sm font-medium">{t.subject}</p><p className="text-xs text-muted-foreground">{t.id} · {t.clientName}</p></TableCell>
                      <TableCell className="text-sm">{t.priority}</TableCell>
                      <TableCell><Badge variant="outline">{t.status}</Badge></TableCell>
                      <TableCell>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div className={`h-full ${barClass(t.pct)}`} style={{ width: `${t.pct}%` }} />
                        </div>
                        <p className={`mt-1 text-xs font-medium ${pctClass(t.pct)}`}>{t.pct}%{t.paused ? " (paused)" : ""}</p>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => togglePause(t.id)}>
                          {t.paused ? <Play className="mr-1 h-3 w-3" /> : <Pause className="mr-1 h-3 w-3" />}
                          {t.paused ? "Resume" : "Pending Client"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breach" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Escalation thresholds</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "t75" as const, label: "75% elapsed — notify team lead" },
                { key: "t90" as const, label: "90% elapsed — notify client manager" },
                { key: "t100" as const, label: "100% elapsed (breach) — notify partner" },
              ].map((r) => (
                <div key={r.key} className="flex items-center justify-between rounded border p-3">
                  <span className="text-sm">{r.label}</span>
                  <Switch checked={thresholds[r.key]} onCheckedChange={(v) => setThresholds({ ...thresholds, [r.key]: v })} />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Escalation recipients: Team leads, client relationship managers, and partners as configured per SLA profile.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reporting" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Select value={scopeFilter} onValueChange={setScopeFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Scope" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All scopes</SelectItem>
                {["Client", "Service", "Agent"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Scope</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Target</TableHead><TableHead className="text-right">Actual</TableHead><TableHead className="text-right">Breaches</TableHead><TableHead>Result</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompliance.map((c) => (
                    <TableRow key={c.scope}>
                      <TableCell className="text-sm font-medium">{c.scope}</TableCell>
                      <TableCell className="text-sm">{c.type}</TableCell>
                      <TableCell className="text-right text-sm">{c.target}%</TableCell>
                      <TableCell className="text-right text-sm">{c.actual}%</TableCell>
                      <TableCell className="text-right text-sm">{c.breaches}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={c.actual >= c.target ? "bg-success/15 text-success border-success/30" : "bg-destructive/15 text-destructive border-destructive/30"}>
                          {c.actual >= c.target ? "Pass" : "Fail"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Compliance trend (6 months)</CardTitle></CardHeader>
            <CardContent>
              <div className="flex h-32 items-end gap-3">
                {slaTrend.map((m) => (
                  <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full flex-1 items-end">
                      <div className={`w-full rounded-t ${m.pct >= 90 ? "bg-success" : "bg-warning"}`} style={{ height: `${m.pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">{m.month}</p>
                    <p className="text-xs font-medium">{m.pct}%</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit SLA profile — {editing?.tier}</DialogTitle></DialogHeader>
          {editDraft && (
            <div className="space-y-3">
              <div>
                <Label>Service type</Label>
                <Input value={editDraft.serviceType} onChange={(e) => setEditDraft({ ...editDraft, serviceType: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Response hrs</p>
                  {PRIORITIES.map((pr) => (
                    <div key={pr} className="mb-1 flex items-center gap-2">
                      <span className="w-16 text-xs">{pr}</span>
                      <Input type="number" className="h-8" value={editDraft.responseHrs[pr]} onChange={(e) => setEditDraft({ ...editDraft, responseHrs: { ...editDraft.responseHrs, [pr]: Number(e.target.value) } })} />
                    </div>
                  ))}
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Resolution hrs</p>
                  {PRIORITIES.map((pr) => (
                    <div key={pr} className="mb-1 flex items-center gap-2">
                      <span className="w-16 text-xs">{pr}</span>
                      <Input type="number" className="h-8" value={editDraft.resolutionHrs[pr]} onChange={(e) => setEditDraft({ ...editDraft, resolutionHrs: { ...editDraft.resolutionHrs, [pr]: Number(e.target.value) } })} />
                    </div>
                  ))}
                </div>
              </div>
              <div><Label>Escalation rules</Label><Input value={editDraft.escalations} onChange={(e) => setEditDraft({ ...editDraft, escalations: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button onClick={saveEdit}>Save changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
