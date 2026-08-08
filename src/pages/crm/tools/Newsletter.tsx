import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Plus, Mail, Newspaper, Users, Send, Sparkles, Megaphone, CalendarClock,
  Copy, Trash2, Eye, CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/RichTextEditor";
import { fetchClients, displayName } from "@/lib/client/clients-api";
import {
  useCommunicationsStore, createSegment, updateSegment, deleteSegment,
  createCampaign, duplicateCampaign, deleteCampaign, scheduleCampaign, sendCampaignNow,
  generateNewsletterDraft, markNewsletterConverted, resolveSegmentMembers, segmentCriteriaLabel,
  apiClientToComm, DUMMY_CLIENTS,
  type CommClient, type Segment, type SegmentRuleField, type Campaign, type CampaignType,
} from "@/lib/crm/communicationsStore";

const statusClass: Record<Campaign["status"], string> = {
  Draft: "bg-muted text-muted-foreground",
  Scheduled: "bg-warning/15 text-warning border-warning/30",
  Sending: "bg-primary/15 text-primary border-primary/30",
  Sent: "bg-success/15 text-success border-success/30",
};

const typeIcon: Record<CampaignType, JSX.Element> = {
  Newsletter: <Newspaper className="h-3 w-3" />,
  "Event invite": <CalendarClock className="h-3 w-3" />,
};

const ruleFieldOptions: { field: SegmentRuleField; label: string; values: string[] }[] = [
  { field: "type", label: "Client type", values: ["individual", "corporate"] },
  { field: "riskLevel", label: "Risk rating", values: ["low", "medium", "high", "unrated"] },
  { field: "status", label: "Status", values: ["active", "pending", "approved", "rejected", "suspended", "invited"] },
  { field: "serviceLine", label: "Service line", values: ["TCSP", "Compliance", "Advisory", "Governance", "HR"] },
];

const emptyEventDetails = { title: "", dateTime: "", location: "", rsvp: true };

export default function Newsletter() {
  const { toast } = useToast();
  const { segments, campaigns, newsletters } = useCommunicationsStore();

  const { data: apiClients, isError } = useQuery({
    queryKey: ["crm-comm-clients"],
    queryFn: fetchClients,
    retry: 0,
  });

  const clients: CommClient[] = useMemo(() => {
    if (apiClients && apiClients.length) {
      return apiClients.map((c) => apiClientToComm(c, displayName(c)));
    }
    if (isError || !apiClients) return DUMMY_CLIENTS;
    return DUMMY_CLIENTS;
  }, [apiClients, isError]);

  // ── KPIs ─────────────────────────────────────────────────
  const sentCampaigns = campaigns.filter((c) => c.status === "Sent" && c.metrics);
  const totalRecipients = campaigns.reduce((s, c) => s + c.recipients.length, 0);
  const avgOpenRate = sentCampaigns.length
    ? Math.round(sentCampaigns.reduce((s, c) => s + (c.metrics!.opened / Math.max(1, c.recipients.length)), 0) / sentCampaigns.length * 100)
    : 0;
  const live = campaigns.filter((c) => c.status === "Scheduled" || c.status === "Sending").length;
  const kpis = [
    { l: "Total campaigns", v: campaigns.length, icon: Megaphone },
    { l: "Recipients reached", v: totalRecipients, icon: Users },
    { l: "Avg. open rate", v: `${avgOpenRate}%`, icon: Mail },
    { l: "Live / scheduled", v: live, icon: Send },
  ];

  // ── Segment dialog state ────────────────────────────────
  const [openSegmentDialog, setOpenSegmentDialog] = useState(false);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [segDraft, setSegDraft] = useState<{ name: string; description: string; mode: "manual" | "rule"; ruleField: SegmentRuleField; ruleValue: string; memberIds: string[] }>({
    name: "", description: "", mode: "rule", ruleField: "type", ruleValue: "corporate", memberIds: [],
  });
  const [segSearch, setSegSearch] = useState("");
  const [viewMembersSegment, setViewMembersSegment] = useState<Segment | null>(null);

  const draftAsSegment: Segment = {
    id: editingSegmentId ?? "PREVIEW",
    name: segDraft.name,
    description: segDraft.description,
    mode: segDraft.mode,
    memberIds: segDraft.memberIds,
    rule: segDraft.mode === "rule" ? { field: segDraft.ruleField, value: segDraft.ruleValue } : undefined,
  };
  const previewMembers = resolveSegmentMembers(draftAsSegment, clients);

  const openCreateSegment = () => {
    setEditingSegmentId(null);
    setSegDraft({ name: "", description: "", mode: "rule", ruleField: "type", ruleValue: "corporate", memberIds: [] });
    setOpenSegmentDialog(true);
  };
  const openEditSegment = (s: Segment) => {
    setEditingSegmentId(s.id);
    setSegDraft({
      name: s.name, description: s.description, mode: s.mode,
      ruleField: s.rule?.field ?? "type", ruleValue: s.rule?.value ?? "corporate",
      memberIds: s.memberIds,
    });
    setOpenSegmentDialog(true);
  };

  const saveSegment = () => {
    if (!segDraft.name.trim()) return;
    const payload = {
      name: segDraft.name, description: segDraft.description, mode: segDraft.mode,
      memberIds: segDraft.memberIds,
      rule: segDraft.mode === "rule" ? { field: segDraft.ruleField, value: segDraft.ruleValue } : undefined,
    };
    if (editingSegmentId) {
      updateSegment(editingSegmentId, payload);
      toast({ title: "Segment updated", description: `${segDraft.name} saved.` });
    } else {
      createSegment(payload);
      toast({ title: "Segment created", description: `${segDraft.name} is ready to target.` });
    }
    setOpenSegmentDialog(false);
  };

  const filteredClientList = clients.filter((c) => c.name.toLowerCase().includes(segSearch.toLowerCase()));

  // ── Campaign dialog state ───────────────────────────────
  const [openCampaignDialog, setOpenCampaignDialog] = useState(false);
  const [campaignDraft, setCampaignDraft] = useState({
    name: "", type: "Newsletter" as CampaignType, segmentId: segments[0]?.id ?? "",
    subject: "", body: "", event: emptyEventDetails,
  });
  const [prefillNewsletterId, setPrefillNewsletterId] = useState<string | null>(null);

  const openNewCampaign = (prefill?: { title: string; body: string; newsletterId: string }) => {
    setPrefillNewsletterId(prefill?.newsletterId ?? null);
    setCampaignDraft({
      name: prefill?.title ?? "",
      type: "Newsletter",
      segmentId: segments[0]?.id ?? "",
      subject: prefill?.title ?? "",
      body: prefill?.body ?? "",
      event: emptyEventDetails,
    });
    setOpenCampaignDialog(true);
  };

  const campaignSegment = segments.find((s) => s.id === campaignDraft.segmentId);
  const campaignRecipients = campaignSegment ? resolveSegmentMembers(campaignSegment, clients) : [];

  const [detailCampaignId, setDetailCampaignId] = useState<string | null>(null);
  const detailCampaign = campaigns.find((c) => c.id === detailCampaignId) ?? null;

  const handleCreateCampaign = () => {
    if (!campaignDraft.name.trim() || !campaignSegment) return;
    const c = createCampaign({
      name: campaignDraft.name,
      type: campaignDraft.type,
      segmentId: campaignSegment.id,
      segmentName: campaignSegment.name,
      subject: campaignDraft.subject,
      body: campaignDraft.body,
      event: campaignDraft.type === "Event invite" ? campaignDraft.event : undefined,
      recipientClients: campaignRecipients,
    });
    if (prefillNewsletterId) markNewsletterConverted(prefillNewsletterId, c.id);
    setOpenCampaignDialog(false);
    setDetailCampaignId(c.id);
    toast({ title: "Campaign created", description: `${c.name} drafted, targeting ${campaignRecipients.length} recipients.` });
  };

  // ── Campaign detail actions ─────────────────────────────
  const [scheduleAt, setScheduleAt] = useState("");

  const handleSendTest = () => {
    toast({ title: "Test sent", description: "A preview email has been sent to your own inbox." });
  };
  const handleSchedule = () => {
    if (!detailCampaign || !scheduleAt) return;
    scheduleCampaign(detailCampaign.id, scheduleAt);
    toast({ title: "Campaign scheduled", description: `${detailCampaign.name} will send on ${scheduleAt}.` });
  };
  const handleSendNow = () => {
    if (!detailCampaign) return;
    sendCampaignNow(detailCampaign.id, (sent) => {
      toast({ title: "Campaign sent", description: `${sent.name} delivered to ${sent.metrics?.delivered ?? 0} recipients.` });
    });
    toast({ title: "Sending…", description: `${detailCampaign.name} is being sent.` });
  };
  const handleDuplicate = () => {
    if (!detailCampaign) return;
    const c = duplicateCampaign(detailCampaign.id);
    if (c) { setDetailCampaignId(c.id); toast({ title: "Campaign duplicated" }); }
  };
  const handleDelete = () => {
    if (!detailCampaign) return;
    deleteCampaign(detailCampaign.id);
    setDetailCampaignId(null);
    toast({ title: "Campaign deleted" });
  };

  // ── Newsletters ──────────────────────────────────────────
  const generateNewsletter = () => {
    generateNewsletterDraft();
    toast({ title: "Newsletter generated", description: "Draft compiled from latest GRC regulatory feed entries." });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Communications</h1>
        <p className="text-sm text-muted-foreground">Campaigns, newsletters and client segmentation.</p>
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
          <TabsTrigger value="newsletters">Newsletters</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4 pt-4">
          <div className="flex justify-end"><Button onClick={() => openNewCampaign()}><Plus className="mr-2 h-4 w-4" />New campaign</Button></div>
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-40">Open rate</TableHead>
                    <TableHead className="w-40">Click rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No campaigns yet. Create one to get started.</TableCell></TableRow>
                  )}
                  {campaigns.map((c) => {
                    const opened = c.metrics?.opened ?? 0;
                    const clicked = c.metrics?.clicked ?? 0;
                    const total = c.recipients.length || 1;
                    return (
                      <TableRow key={c.id} className="cursor-pointer" onClick={() => setDetailCampaignId(c.id)}>
                        <TableCell><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.recipients.length} recipients</p></TableCell>
                        <TableCell><Badge variant="outline" className="gap-1">{typeIcon[c.type]}{c.type}</Badge></TableCell>
                        <TableCell className="text-sm">{c.segmentName}</TableCell>
                        <TableCell><Badge variant="outline" className={statusClass[c.status]}>{c.status}</Badge></TableCell>
                        <TableCell>
                          <Progress value={c.metrics ? (opened / total) * 100 : 0} className="h-2" />
                          <p className="mt-1 text-xs text-muted-foreground">{c.metrics ? Math.round((opened / total) * 100) : 0}%</p>
                        </TableCell>
                        <TableCell>
                          <Progress value={c.metrics ? (clicked / total) * 100 : 0} className="h-2" />
                          <p className="mt-1 text-xs text-muted-foreground">{c.metrics ? Math.round((clicked / total) * 100) : 0}%</p>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
                  {n.convertedToCampaignId ? (
                    <Badge variant="outline" className="gap-1 bg-success/15 text-success border-success/30"><CheckCircle2 className="h-3 w-3" />Converted to campaign</Badge>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => openNewCampaign({ title: n.title, body: n.body, newsletterId: n.id })}>
                      Turn into campaign
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-4 pt-4">
          <div className="flex justify-end"><Button onClick={openCreateSegment}><Plus className="mr-2 h-4 w-4" />Create segment</Button></div>
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader><TableRow><TableHead>Segment</TableHead><TableHead>Criteria</TableHead><TableHead className="text-right">Members</TableHead><TableHead className="w-56 text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {segments.map((s) => {
                    const members = resolveSegmentMembers(s, clients);
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <p className="text-sm font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.description}</p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{segmentCriteriaLabel(s)}</TableCell>
                        <TableCell className="text-right text-sm">{members.length}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setViewMembersSegment(s)}><Eye className="mr-1 h-3 w-3" />Members</Button>
                            <Button size="sm" variant="ghost" onClick={() => openEditSegment(s)}>Edit</Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { deleteSegment(s.id); toast({ title: "Segment deleted" }); }}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Segment builder dialog */}
      <Dialog open={openSegmentDialog} onOpenChange={setOpenSegmentDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingSegmentId ? "Edit segment" : "Create segment"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Name</Label><Input value={segDraft.name} onChange={(e) => setSegDraft({ ...segDraft, name: e.target.value })} /></div>
            <div><Label>Description</Label><Input value={segDraft.description} onChange={(e) => setSegDraft({ ...segDraft, description: e.target.value })} /></div>
            <div className="flex gap-2">
              <Button size="sm" variant={segDraft.mode === "rule" ? "default" : "outline"} onClick={() => setSegDraft({ ...segDraft, mode: "rule" })}>Rule-based</Button>
              <Button size="sm" variant={segDraft.mode === "manual" ? "default" : "outline"} onClick={() => setSegDraft({ ...segDraft, mode: "manual" })}>Manual selection</Button>
            </div>

            {segDraft.mode === "rule" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Field</Label>
                  <Select value={segDraft.ruleField} onValueChange={(v) => setSegDraft({ ...segDraft, ruleField: v as SegmentRuleField, ruleValue: ruleFieldOptions.find((r) => r.field === v)?.values[0] ?? "" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ruleFieldOptions.map((r) => <SelectItem key={r.field} value={r.field}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Value</Label>
                  <Select value={segDraft.ruleValue} onValueChange={(v) => setSegDraft({ ...segDraft, ruleValue: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ruleFieldOptions.find((r) => r.field === segDraft.ruleField)?.values.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Input placeholder="Search clients…" value={segSearch} onChange={(e) => setSegSearch(e.target.value)} />
                <ScrollArea className="h-48 rounded border p-2">
                  {filteredClientList.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 py-1 text-sm">
                      <Checkbox
                        checked={segDraft.memberIds.includes(c.id)}
                        onCheckedChange={(chk) => setSegDraft({
                          ...segDraft,
                          memberIds: chk ? [...segDraft.memberIds, c.id] : segDraft.memberIds.filter((id) => id !== c.id),
                        })}
                      />
                      {c.name}
                    </label>
                  ))}
                </ScrollArea>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Resolved members: <strong>{previewMembers.length}</strong></p>
          </div>
          <DialogFooter><Button onClick={saveSegment}>{editingSegmentId ? "Save changes" : "Create segment"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View members dialog */}
      <Dialog open={!!viewMembersSegment} onOpenChange={(o) => !o && setViewMembersSegment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{viewMembersSegment?.name} — members</DialogTitle></DialogHeader>
          <ScrollArea className="h-64">
            {viewMembersSegment && resolveSegmentMembers(viewMembersSegment, clients).map((c) => (
              <div key={c.id} className="border-b py-2 text-sm last:border-0">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.type} · risk {c.riskLevel} · {c.status}</p>
              </div>
            ))}
            {viewMembersSegment && resolveSegmentMembers(viewMembersSegment, clients).length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">No members match this segment.</p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* New campaign dialog */}
      <Dialog open={openCampaignDialog} onOpenChange={setOpenCampaignDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New campaign</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={campaignDraft.name} onChange={(e) => setCampaignDraft({ ...campaignDraft, name: e.target.value })} /></div>
              <div>
                <Label>Type</Label>
                <Select value={campaignDraft.type} onValueChange={(v) => setCampaignDraft({ ...campaignDraft, type: v as CampaignType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Newsletter">Newsletter</SelectItem><SelectItem value="Event invite">Event invite</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Target segment</Label>
              <Select value={campaignDraft.segmentId} onValueChange={(v) => setCampaignDraft({ ...campaignDraft, segmentId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{segments.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">Live recipients: <strong>{campaignRecipients.length}</strong></p>
            </div>
            <div><Label>Subject</Label><Input value={campaignDraft.subject} onChange={(e) => setCampaignDraft({ ...campaignDraft, subject: e.target.value })} /></div>

            {campaignDraft.type === "Event invite" && (
              <div className="grid grid-cols-2 gap-3 rounded-md border p-3">
                <div><Label>Event title</Label><Input value={campaignDraft.event.title} onChange={(e) => setCampaignDraft({ ...campaignDraft, event: { ...campaignDraft.event, title: e.target.value } })} /></div>
                <div><Label>Date &amp; time</Label><Input type="datetime-local" value={campaignDraft.event.dateTime} onChange={(e) => setCampaignDraft({ ...campaignDraft, event: { ...campaignDraft.event, dateTime: e.target.value } })} /></div>
                <div className="col-span-2"><Label>Location / link</Label><Input value={campaignDraft.event.location} onChange={(e) => setCampaignDraft({ ...campaignDraft, event: { ...campaignDraft.event, location: e.target.value } })} /></div>
                <div className="col-span-2 flex items-center gap-2">
                  <Switch checked={campaignDraft.event.rsvp} onCheckedChange={(v) => setCampaignDraft({ ...campaignDraft, event: { ...campaignDraft.event, rsvp: v } })} />
                  <Label className="!mt-0">Require RSVP</Label>
                </div>
              </div>
            )}

            <div>
              <Label>Content</Label>
              <RichTextEditor value={campaignDraft.body} onChange={(html) => setCampaignDraft({ ...campaignDraft, body: html })} placeholder="Write your campaign content…" minHeight={160} />
            </div>
          </div>
          <DialogFooter><Button onClick={handleCreateCampaign} disabled={!campaignDraft.name.trim() || !campaignSegment}>Create campaign</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign detail sheet */}
      <Sheet open={!!detailCampaign} onOpenChange={(o) => !o && setDetailCampaignId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {detailCampaign && (
            <div className="space-y-5">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {detailCampaign.name}
                  <Badge variant="outline" className={statusClass[detailCampaign.status]}>{detailCampaign.status}</Badge>
                </SheetTitle>
              </SheetHeader>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={handleSendTest}><Send className="mr-1 h-3 w-3" />Send test</Button>
                {detailCampaign.status === "Draft" && (
                  <>
                    <Button size="sm" variant="outline" onClick={handleSendNow}>Send now</Button>
                  </>
                )}
                <Button size="sm" variant="outline" onClick={handleDuplicate}><Copy className="mr-1 h-3 w-3" />Duplicate</Button>
                <Button size="sm" variant="outline" className="text-destructive" onClick={handleDelete}><Trash2 className="mr-1 h-3 w-3" />Delete</Button>
              </div>

              {detailCampaign.status === "Draft" && (
                <Card>
                  <CardContent className="flex flex-wrap items-end gap-2 p-4">
                    <div className="flex-1 min-w-[180px]">
                      <Label>Schedule for</Label>
                      <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
                    </div>
                    <Button size="sm" onClick={handleSchedule} disabled={!scheduleAt}><CalendarClock className="mr-1 h-3 w-3" />Schedule</Button>
                  </CardContent>
                </Card>
              )}

              {detailCampaign.status === "Scheduled" && (
                <p className="text-sm text-muted-foreground">Scheduled to send on <strong>{detailCampaign.scheduledAt}</strong>.</p>
              )}
              {detailCampaign.status === "Sending" && (
                <p className="text-sm text-muted-foreground">Sending in progress…</p>
              )}

              <Separator />

              <div>
                <p className="text-sm font-medium">Subject</p>
                <p className="text-sm text-muted-foreground">{detailCampaign.subject || "(no subject)"}</p>
              </div>
              {detailCampaign.event && (
                <div className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{detailCampaign.event.title}</p>
                  <p className="text-muted-foreground">{detailCampaign.event.dateTime} · {detailCampaign.event.location}</p>
                  <p className="text-muted-foreground">RSVP {detailCampaign.event.rsvp ? "required" : "not required"}</p>
                </div>
              )}
              <div>
                <p className="mb-1 text-sm font-medium">Content preview</p>
                <div className="rounded-md border p-3 text-sm" dangerouslySetInnerHTML={{ __html: detailCampaign.body || "<p class='text-muted-foreground'>No content</p>" }} />
              </div>

              {detailCampaign.status === "Sent" && detailCampaign.metrics && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Results</p>
                  {[
                    { l: "Delivered", v: detailCampaign.metrics.delivered },
                    { l: "Opened", v: detailCampaign.metrics.opened },
                    { l: "Clicked", v: detailCampaign.metrics.clicked },
                    ...(detailCampaign.type === "Event invite" ? [{ l: "RSVPs", v: detailCampaign.metrics.rsvped }] : []),
                    { l: "Unsubscribed", v: detailCampaign.metrics.unsubscribed },
                  ].map((m) => (
                    <div key={m.l}>
                      <div className="flex justify-between text-xs"><span>{m.l}</span><span>{m.v} / {detailCampaign.recipients.length}</span></div>
                      <Progress value={(m.v / Math.max(1, detailCampaign.recipients.length)) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              )}

              <div>
                <p className="mb-1 text-sm font-medium">Recipients ({detailCampaign.recipients.length})</p>
                <ScrollArea className="h-56 rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Delivered</TableHead>
                        <TableHead>Opened</TableHead>
                        <TableHead>Clicked</TableHead>
                        {detailCampaign.type === "Event invite" && <TableHead>RSVP</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailCampaign.recipients.map((r) => (
                        <TableRow key={r.clientId}>
                          <TableCell className="text-sm">{r.clientName}</TableCell>
                          <TableCell>{detailCampaign.status === "Sent" ? (r.delivered ? "✓" : "—") : "—"}</TableCell>
                          <TableCell>{detailCampaign.status === "Sent" ? (r.opened ? "✓" : "—") : "—"}</TableCell>
                          <TableCell>{detailCampaign.status === "Sent" ? (r.clicked ? "✓" : "—") : "—"}</TableCell>
                          {detailCampaign.type === "Event invite" && <TableCell>{detailCampaign.status === "Sent" ? (r.rsvped ? "✓" : "—") : "—"}</TableCell>}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
