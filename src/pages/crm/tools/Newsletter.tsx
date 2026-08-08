import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Plus, Mail, MessageCircle, Newspaper, GitBranch, Users, Send, Sparkles, Megaphone,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { campaigns as seedCampaigns, segments as seedSegments, Campaign } from "@/data/crmClientMockData";

const channelIcon: Record<string, JSX.Element> = {
  Email: <Mail className="h-3 w-3" />,
  Newsletter: <Newspaper className="h-3 w-3" />,
  WhatsApp: <MessageCircle className="h-3 w-3" />,
  Drip: <GitBranch className="h-3 w-3" />,
};

const statusClass: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Scheduled: "bg-warning/15 text-warning border-warning/30",
  Sent: "bg-success/15 text-success border-success/30",
  Running: "bg-primary/15 text-primary border-primary/30",
};

const templates = ["Regulatory update", "Event invitation", "Onboarding welcome", "Filing reminder", "Thought leadership"];

export default function Newsletter() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>(seedCampaigns);
  const [segments, setSegments] = useState(seedSegments);
  const [openNewCampaign, setOpenNewCampaign] = useState(false);
  const [openNewSegment, setOpenNewSegment] = useState(false);
  const [openAddStep, setOpenAddStep] = useState(false);
  const [dripId, setDripId] = useState<string | null>(null);
  const [newsletters, setNewsletters] = useState([
    { id: "NL-01", title: "BNR circular 14/2026 — impact summary", generatedAt: "2026-07-28", source: "GRC regulatory feed" },
    { id: "NL-02", title: "Q2 AML typology bulletin", generatedAt: "2026-07-10", source: "GRC regulatory feed" },
  ]);
  const [waMessage, setWaMessage] = useState("");
  const [waSegment, setWaSegment] = useState(seedSegments[0].name);

  const [campaignDraft, setCampaignDraft] = useState({ name: "", channel: "Email" as Campaign["channel"], segment: seedSegments[0].name, template: templates[0] });
  const [segmentDraft, setSegmentDraft] = useState({ name: "", criteria: "" });
  const [stepDraft, setStepDraft] = useState({ day: 0, subject: "" });

  const totalRecipients = campaigns.reduce((s, c) => s + c.recipients, 0);
  const avgOpenRate = Math.round(
    (campaigns.filter((c) => c.recipients).reduce((s, c) => s + c.opened / c.recipients, 0) /
      Math.max(1, campaigns.filter((c) => c.recipients).length)) * 100,
  );
  const running = campaigns.filter((c) => c.status === "Running" || c.status === "Scheduled").length;

  const kpis = [
    { l: "Total campaigns", v: campaigns.length, icon: Megaphone },
    { l: "Recipients reached", v: totalRecipients, icon: Users },
    { l: "Avg. open rate", v: `${avgOpenRate}%`, icon: Mail },
    { l: "Live / scheduled", v: running, icon: Send },
  ];

  const createCampaign = () => {
    if (!campaignDraft.name) return;
    const seg = segments.find((s) => s.name === campaignDraft.segment);
    const c: Campaign = {
      id: `CMP-${String(campaigns.length + 1).padStart(2, "0")}`,
      name: campaignDraft.name, channel: campaignDraft.channel, segment: campaignDraft.segment,
      status: "Draft", recipients: seg?.size ?? 0, opened: 0, clicked: 0, unsubscribed: 0,
    };
    setCampaigns([c, ...campaigns]);
    setOpenNewCampaign(false);
    toast({ title: "Campaign created", description: `${c.name} drafted using "${campaignDraft.template}" template.` });
  };

  const createSegment = () => {
    if (!segmentDraft.name) return;
    setSegments([...segments, { id: `SEG-${String(segments.length + 1).padStart(2, "0")}`, name: segmentDraft.name, criteria: segmentDraft.criteria || "Custom filter", size: Math.floor(Math.random() * 6) + 1 }]);
    setOpenNewSegment(false);
    setSegmentDraft({ name: "", criteria: "" });
    toast({ title: "Segment created", description: `${segmentDraft.name} is ready to target.` });
  };

  const addStep = () => {
    if (!dripId || !stepDraft.subject) return;
    setCampaigns((p) => p.map((c) => (c.id === dripId ? { ...c, steps: [...(c.steps ?? []), stepDraft] } : c)));
    setOpenAddStep(false);
    setStepDraft({ day: 0, subject: "" });
    toast({ title: "Step added to drip sequence" });
  };

  const generateNewsletter = () => {
    const nl = { id: `NL-${String(newsletters.length + 1).padStart(2, "0")}`, title: "Auto-generated regulatory digest — this week", generatedAt: new Date().toISOString().slice(0, 10), source: "GRC regulatory feed" };
    setNewsletters([nl, ...newsletters]);
    toast({ title: "Newsletter generated", description: "Draft compiled from latest GRC regulatory feed entries." });
  };

  const sendBroadcast = () => {
    const seg = segments.find((s) => s.name === waSegment);
    toast({ title: "WhatsApp broadcast queued", description: `Sending to ~${seg?.size ?? 0} recipients in "${waSegment}".` });
    setWaMessage("");
  };

  const dripCampaigns = campaigns.filter((c) => c.channel === "Drip");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Communications</h1>
        <p className="text-sm text-muted-foreground">Campaigns, drip sequences, newsletters, WhatsApp broadcasts and segmentation.</p>
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

      <Tabs defaultValue="campaigns">
        <TabsList className="flex-wrap">
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="drip">Drip campaigns</TabsTrigger>
          <TabsTrigger value="newsletters">Newsletters</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp broadcast</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4 pt-4">
          <div className="flex justify-end"><Button onClick={() => setOpenNewCampaign(true)}><Plus className="mr-2 h-4 w-4" />New campaign</Button></div>
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-40">Open rate</TableHead>
                    <TableHead className="w-40">Click rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.recipients} recipients</p></TableCell>
                      <TableCell><Badge variant="outline" className="gap-1">{channelIcon[c.channel]}{c.channel}</Badge></TableCell>
                      <TableCell className="text-sm">{c.segment}</TableCell>
                      <TableCell><Badge variant="outline" className={statusClass[c.status]}>{c.status}</Badge></TableCell>
                      <TableCell>
                        <Progress value={c.recipients ? (c.opened / c.recipients) * 100 : 0} className="h-2" />
                        <p className="mt-1 text-xs text-muted-foreground">{c.recipients ? Math.round((c.opened / c.recipients) * 100) : 0}%</p>
                      </TableCell>
                      <TableCell>
                        <Progress value={c.recipients ? (c.clicked / c.recipients) * 100 : 0} className="h-2" />
                        <p className="mt-1 text-xs text-muted-foreground">{c.recipients ? Math.round((c.clicked / c.recipients) * 100) : 0}%</p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drip" className="space-y-4 pt-4">
          {dripCampaigns.map((c) => (
            <Card key={c.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{c.name}</CardTitle>
                <Button size="sm" variant="outline" onClick={() => { setDripId(c.id); setOpenAddStep(true); }}>
                  <Plus className="mr-1 h-3 w-3" />Add step
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 border-l pl-4">
                  {(c.steps ?? []).map((s, i) => (
                    <div key={i} className="relative">
                      <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary" />
                      <p className="text-sm font-medium">Day {s.day} — {s.subject}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="newsletters" className="space-y-4 pt-4">
          <div className="flex justify-end"><Button onClick={generateNewsletter}><Sparkles className="mr-2 h-4 w-4" />Generate from regulatory feed</Button></div>
          <Card>
            <CardContent className="divide-y p-4">
              {newsletters.map((n) => (
                <div key={n.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.source} · generated {n.generatedAt}</p>
                  </div>
                  <Button size="sm" variant="outline">Review draft</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-4 pt-4">
          <Card>
            <CardContent className="space-y-3 p-4">
              <div>
                <Label>Segment</Label>
                <Select value={waSegment} onValueChange={setWaSegment}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{segments.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Message</Label>
                <Textarea rows={4} value={waMessage} onChange={(e) => setWaMessage(e.target.value)} placeholder="Type your WhatsApp broadcast message…" />
              </div>
              <p className="text-xs text-muted-foreground">
                Estimated recipients: <strong>{segments.find((s) => s.name === waSegment)?.size ?? 0}</strong>
              </p>
              <Button disabled={!waMessage.trim()} onClick={sendBroadcast}><Send className="mr-2 h-4 w-4" />Send broadcast</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-4 pt-4">
          <div className="flex justify-end"><Button onClick={() => setOpenNewSegment(true)}><Plus className="mr-2 h-4 w-4" />Create segment</Button></div>
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader><TableRow><TableHead>Segment</TableHead><TableHead>Criteria</TableHead><TableHead className="text-right">Size</TableHead></TableRow></TableHeader>
                <TableBody>
                  {segments.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm font-medium">{s.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.criteria}</TableCell>
                      <TableCell className="text-right text-sm">{s.size}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={openNewCampaign} onOpenChange={setOpenNewCampaign}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New campaign</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Name</Label><Input value={campaignDraft.name} onChange={(e) => setCampaignDraft({ ...campaignDraft, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Channel</Label>
                <Select value={campaignDraft.channel} onValueChange={(v) => setCampaignDraft({ ...campaignDraft, channel: v as Campaign["channel"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Email","Newsletter","WhatsApp","Drip"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Template</Label>
                <Select value={campaignDraft.template} onValueChange={(v) => setCampaignDraft({ ...campaignDraft, template: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{templates.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Segment</Label>
              <Select value={campaignDraft.segment} onValueChange={(v) => setCampaignDraft({ ...campaignDraft, segment: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{segments.map((s) => <SelectItem key={s.id} value={s.name}>{s.name} ({s.size})</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={createCampaign}>Create campaign</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openNewSegment} onOpenChange={setOpenNewSegment}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Create segment</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Name</Label><Input value={segmentDraft.name} onChange={(e) => setSegmentDraft({ ...segmentDraft, name: e.target.value })} /></div>
            <div><Label>Criteria</Label><Input value={segmentDraft.criteria} onChange={(e) => setSegmentDraft({ ...segmentDraft, criteria: e.target.value })} placeholder="e.g. Risk rating = High" /></div>
          </div>
          <DialogFooter><Button onClick={createSegment}>Create segment</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openAddStep} onOpenChange={setOpenAddStep}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add drip step</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Day offset</Label><Input type="number" value={stepDraft.day} onChange={(e) => setStepDraft({ ...stepDraft, day: Number(e.target.value) })} /></div>
            <div><Label>Subject</Label><Input value={stepDraft.subject} onChange={(e) => setStepDraft({ ...stepDraft, subject: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={addStep}>Add step</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
