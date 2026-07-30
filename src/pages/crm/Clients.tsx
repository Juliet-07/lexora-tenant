import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  Plus, Search, Users, DollarSign, Heart, AlertTriangle, FileSignature, Send,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  organisations, engagements as seedEngagements, engagementTemplates,
  healthScore, healthBand, CrmOrganisation, Engagement, EngagementStatus,
} from "@/data/crmClientMockData";

const money = (n: number, c = "USD") =>
  n.toLocaleString(undefined, { style: "currency", currency: c, maximumFractionDigits: 0 });

const riskClass: Record<string, string> = {
  Low: "bg-success/15 text-success border-success/30",
  Medium: "bg-warning/15 text-warning border-warning/30",
  High: "bg-destructive/15 text-destructive border-destructive/30",
};

const bandClass: Record<string, string> = {
  Healthy: "text-success",
  Watch: "text-warning",
  "At risk": "text-destructive",
};

const STATUS_FLOW: EngagementStatus[] = ["Proposed", "Active", "On hold", "Completed", "Terminated"];

const statusClass: Record<EngagementStatus, string> = {
  Proposed: "bg-muted text-muted-foreground",
  Active: "bg-success/15 text-success border-success/30",
  "On hold": "bg-warning/15 text-warning border-warning/30",
  Completed: "bg-primary/15 text-primary border-primary/30",
  Terminated: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function Clients() {
  const { toast } = useToast();
  const clients = organisations.filter((o) => o.relationship === "Active Client" || o.relationship === "Past Client");
  const [q, setQ] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [jurisdictionFilter, setJurisdictionFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [engagementList, setEngagementList] = useState<Engagement[]>(seedEngagements);
  const [openNewEngagement, setOpenNewEngagement] = useState(false);
  const [draft, setDraft] = useState({
    title: "", orgName: clients[0]?.name ?? "", template: engagementTemplates[0], feeStructure: "Fixed" as Engagement["feeStructure"], value: 0,
  });

  const services = Array.from(new Set(organisations.flatMap((o) => o.serviceLines)));
  const industries = Array.from(new Set(organisations.map((o) => o.industry)));
  const jurisdictions = Array.from(new Set(organisations.map((o) => o.jurisdiction)));

  const filtered = useMemo(
    () =>
      clients.filter(
        (o) =>
          (serviceFilter === "all" || o.serviceLines.includes(serviceFilter)) &&
          (industryFilter === "all" || o.industry === industryFilter) &&
          (riskFilter === "all" || o.riskRating === riskFilter) &&
          (jurisdictionFilter === "all" || o.jurisdiction === jurisdictionFilter) &&
          (tierFilter === "all" || o.feeTier === tierFilter) &&
          o.name.toLowerCase().includes(q.toLowerCase()),
      ),
    [clients, q, serviceFilter, industryFilter, riskFilter, jurisdictionFilter, tierFilter],
  );

  const advanceEngagement = (e: Engagement) => {
    const idx = STATUS_FLOW.indexOf(e.status);
    if (idx === STATUS_FLOW.length - 2) return;
  };

  const setEngagementStatus = (id: string, status: EngagementStatus) => {
    setEngagementList((p) => p.map((e) => (e.id === id ? { ...e, status } : e)));
    toast({ title: `Engagement moved to ${status}` });
  };

  const sendForSignature = (e: Engagement) => {
    const ref = `SC-${Math.floor(80000 + Math.random() * 19999)}`;
    setEngagementList((p) => p.map((x) => (x.id === e.id ? { ...x, certificateRef: ref, signedAt: new Date().toISOString().slice(0, 10) } : x)));
    toast({ title: "Sent for signature", description: `Signing certificate ref ${ref} generated (mock e-signature).` });
  };

  const createEngagement = () => {
    if (!draft.title) return;
    const e: Engagement = {
      id: `ENG-${new Date().getFullYear()}-${String(engagementList.length + 1).padStart(2, "0")}`,
      title: draft.title, orgName: draft.orgName, template: draft.template, feeStructure: draft.feeStructure,
      value: Number(draft.value) || 0, currency: "USD", status: "Proposed", team: [], scope: `Auto-generated from ${draft.template}.`,
    };
    setEngagementList([e, ...engagementList]);
    setOpenNewEngagement(false);
    toast({ title: "Engagement letter drafted", description: `${e.id} created from ${draft.template}.` });
  };

  const totalRevenue = clients.reduce((s, o) => s + o.revenueYtd, 0);
  const totalMargin = clients.reduce((s, o) => s + (o.revenueYtd - o.costYtd), 0);
  const avgSatisfaction = (clients.reduce((s, o) => s + o.satisfaction, 0) / Math.max(1, clients.filter(c=>c.satisfaction>0).length)).toFixed(1);
  const atRisk = clients.filter((o) => healthScore(o) < 50).length;

  const kpis = [
    { l: "Active/past clients", v: clients.length, icon: Users },
    { l: "Revenue YTD", v: money(totalRevenue), icon: DollarSign },
    { l: "Margin YTD", v: money(totalMargin), icon: DollarSign },
    { l: "Avg. satisfaction", v: `${avgSatisfaction}/5`, icon: Heart },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Client Management</h1>
          <p className="text-sm text-muted-foreground">Relationship, engagement lifecycle and health tracking for clients.</p>
        </div>
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

      {atRisk > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> {atRisk} client(s) have a health score below 50 — see Client health tab.
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="clients">
        <TabsList>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="engagements">Engagements</TabsTrigger>
          <TabsTrigger value="health">Client health</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="pt-4">
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search clients…" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
                <Select value={serviceFilter} onValueChange={setServiceFilter}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Service" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All services</SelectItem>{services.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={industryFilter} onValueChange={setIndustryFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Industry" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All industries</SelectItem>{industries.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger className="w-32"><SelectValue placeholder="Risk" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All risk</SelectItem>{["Low","Medium","High"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={jurisdictionFilter} onValueChange={setJurisdictionFilter}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Jurisdiction" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All jurisdictions</SelectItem>{jurisdictions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={tierFilter} onValueChange={setTierFilter}>
                  <SelectTrigger className="w-32"><SelectValue placeholder="Fee tier" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All tiers</SelectItem>{["Tier 1","Tier 2","Tier 3"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>RM</TableHead>
                    <TableHead>Service lines</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead className="text-right">Revenue / Cost / Margin</TableHead>
                    <TableHead>Satisfaction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{o.name}</p>
                        <p className="text-xs text-muted-foreground">{o.industry} · {o.jurisdiction} · {o.feeTier}</p>
                      </TableCell>
                      <TableCell className="text-sm">{o.relationshipManager}</TableCell>
                      <TableCell><div className="flex flex-wrap gap-1">{o.serviceLines.map((s) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}</div></TableCell>
                      <TableCell><Badge variant="outline" className={riskClass[o.riskRating]}>{o.riskRating}</Badge></TableCell>
                      <TableCell className="text-right text-sm">
                        {money(o.revenueYtd)} / {money(o.costYtd)}
                        <span className="block text-xs text-success">+{money(o.revenueYtd - o.costYtd)} margin</span>
                      </TableCell>
                      <TableCell className="text-sm">{o.satisfaction ? `${o.satisfaction}/5` : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagements" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Button onClick={() => setOpenNewEngagement(true)}><Plus className="mr-2 h-4 w-4" />New engagement letter</Button>
          </div>
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Fee structure</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Signature</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {engagementList.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{e.title}</p>
                        <p className="text-xs text-muted-foreground">{e.id} · {e.template}</p>
                      </TableCell>
                      <TableCell className="text-sm">{e.orgName}</TableCell>
                      <TableCell className="text-sm">{e.feeStructure}</TableCell>
                      <TableCell className="text-right text-sm">{money(e.value, e.currency)}</TableCell>
                      <TableCell>
                        <Select value={e.status} onValueChange={(v) => setEngagementStatus(e.id, v as EngagementStatus)}>
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>{STATUS_FLOW.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {e.certificateRef ? (
                          <p className="text-xs">
                            <FileSignature className="mr-1 inline h-3 w-3 text-success" />
                            {e.certificateRef}
                          </p>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => sendForSignature(e)}>
                            <Send className="mr-1 h-3 w-3" />Send for signature
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {clients.map((o) => {
              const score = healthScore(o);
              const band = healthBand(score);
              const factors = [
                { l: "Recent activity", v: o.lastInteraction === "—" ? 0 : 25, max: 25 },
                { l: "Payment behaviour", v: Math.max(0, Math.min(25, 25 - Math.round((o.invoiceDaysAvg - 30) / 2))), max: 25 },
                { l: "Ticket load", v: Math.max(0, 20 - o.openTickets * 4), max: 20 },
                { l: "Satisfaction", v: Math.round((o.satisfaction / 5) * 20), max: 20 },
                { l: "Risk rating", v: o.riskRating === "Low" ? 10 : o.riskRating === "Medium" ? 6 : 2, max: 10 },
              ];
              return (
                <Card key={o.id} className={score < 50 ? "border-destructive/40" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{o.name}</CardTitle>
                      <span className={`text-lg font-bold ${bandClass[band]}`}>{score}</span>
                    </div>
                    <p className={`text-xs font-medium ${bandClass[band]}`}>{band}</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Progress value={score} className="h-2" />
                    {factors.map((f) => (
                      <div key={f.l} className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground"><span>{f.l}</span><span>{f.v}/{f.max}</span></div>
                        <Progress value={(f.v / f.max) * 100} className="h-1.5" />
                      </div>
                    ))}
                    {score < 50 && (
                      <p className="flex items-center gap-1 pt-1 text-xs text-destructive">
                        <AlertTriangle className="h-3 w-3" /> Deteriorating health — recommend RM outreach this week.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={openNewEngagement} onOpenChange={setOpenNewEngagement}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New engagement letter</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Title</Label><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
            <div>
              <Label>Client</Label>
              <Select value={draft.orgName} onValueChange={(v) => setDraft({ ...draft, orgName: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{clients.map((o) => <SelectItem key={o.id} value={o.name}>{o.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Template</Label>
                <Select value={draft.template} onValueChange={(v) => setDraft({ ...draft, template: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{engagementTemplates.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fee structure</Label>
                <Select value={draft.feeStructure} onValueChange={(v) => setDraft({ ...draft, feeStructure: v as Engagement["feeStructure"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Hourly","Fixed","Retainer","Milestone","Hybrid"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Value (USD)</Label><Input type="number" value={draft.value} onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter><Button onClick={createEngagement}>Create draft</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
