import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Plus,
  Mail,
  Newspaper,
  Users,
  Send,
  Sparkles,
  Megaphone,
  CalendarClock,
  Copy,
  Trash2,
  Eye,
  CheckCircle2,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  fetchClients,
  displayName,
  type ApiClient,
} from "@/lib/client/clients-api";
import {
  fetchSegments,
  createSegment,
  updateSegment,
  deleteSegment,
  fetchSegmentMembers,
  fetchCampaigns,
  createCampaign,
  duplicateCampaign,
  deleteCampaign,
  scheduleCampaign,
  sendCampaignNow,
  sendCampaignTest,
  fetchNewsletterDrafts,
  generateNewsletterDraft,
  markDraftConverted,
  type Segment,
  type SegmentRuleField,
  type Campaign,
  type CampaignType,
} from "@/lib/crm/tools-api";

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

const ruleFieldOptions: {
  field: SegmentRuleField;
  label: string;
  values: string[];
}[] = [
  {
    field: "classification",
    label: "Client type",
    values: ["individual", "corporate"],
  },
  {
    field: "riskLevel",
    label: "Risk rating",
    values: ["low", "medium", "high", "unrated"],
  },
  {
    field: "status",
    label: "Status",
    values: [
      "pending",
      "active",
      "approved",
      "rejected",
      "suspended",
      "invited",
    ],
  },
];
const ruleFieldLabels: Record<SegmentRuleField, string> = {
  classification: "Client type",
  riskLevel: "Risk rating",
  status: "Status",
};

const emptyEventDetails = { title: "", dateTime: "", location: "", rsvp: true };

export default function Newsletter() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const { data: segments = [] } = useQuery({
    queryKey: ["segments"],
    queryFn: fetchSegments,
  });
  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: fetchCampaigns,
  });
  const { data: newsletters = [] } = useQuery({
    queryKey: ["newsletter-drafts"],
    queryFn: fetchNewsletterDrafts,
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-for-segments"],
    queryFn: fetchClients,
  });

  const invalidateSegments = () =>
    queryClient.invalidateQueries({ queryKey: ["segments"] });
  const invalidateCampaigns = () =>
    queryClient.invalidateQueries({ queryKey: ["campaigns"] });
  const invalidateNewsletters = () =>
    queryClient.invalidateQueries({ queryKey: ["newsletter-drafts"] });

  // ── KPIs ─────────────────────────────────────────────────
  const sentCampaigns = campaigns.filter((c) => c.status === "Sent");
  const totalRecipients = campaigns.reduce(
    (s, c) => s + c.recipients.length,
    0,
  );
  const avgDeliveryRate = sentCampaigns.length
    ? Math.round(
        (sentCampaigns.reduce(
          (s, c) =>
            s +
            c.recipients.filter((r) => r.delivered).length /
              Math.max(1, c.recipients.length),
          0,
        ) /
          sentCampaigns.length) *
          100,
      )
    : 0;
  const live = campaigns.filter(
    (c) => c.status === "Scheduled" || c.status === "Sending",
  ).length;
  const kpis = [
    { l: "Total campaigns", v: campaigns.length, icon: Megaphone },
    { l: "Recipients reached", v: totalRecipients, icon: Users },
    { l: "Avg. delivery rate", v: `${avgDeliveryRate}%`, icon: Mail },
    { l: "Live / scheduled", v: live, icon: Send },
  ];

  // ── Segment dialog ───────────────────────────────────────
  const [openSegmentDialog, setOpenSegmentDialog] = useState(false);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [segDraft, setSegDraft] = useState<{
    name: string;
    description: string;
    mode: "manual" | "rule";
    ruleField: SegmentRuleField;
    ruleValue: string;
    memberIds: string[];
  }>({
    name: "",
    description: "",
    mode: "rule",
    ruleField: "classification",
    ruleValue: "corporate",
    memberIds: [],
  });
  const [segSearch, setSegSearch] = useState("");
  const [viewMembersSegment, setViewMembersSegment] = useState<Segment | null>(
    null,
  );
  const { data: viewedMembers = [] } = useQuery({
    queryKey: ["segment-members", viewMembersSegment?._id],
    queryFn: () => fetchSegmentMembers(viewMembersSegment!._id),
    enabled: !!viewMembersSegment,
  });

  const openCreateSegment = () => {
    setEditingSegmentId(null);
    setSegDraft({
      name: "",
      description: "",
      mode: "rule",
      ruleField: "classification",
      ruleValue: "corporate",
      memberIds: [],
    });
    setOpenSegmentDialog(true);
  };
  const openEditSegment = (s: Segment) => {
    setEditingSegmentId(s._id);
    setSegDraft({
      name: s.name,
      description: s.description,
      mode: s.mode,
      ruleField: s.rule?.field ?? "classification",
      ruleValue: s.rule?.value ?? "corporate",
      memberIds: s.memberIds,
    });
    setOpenSegmentDialog(true);
  };

  const saveSegmentMut = useMutation({
    mutationFn: () => {
      const payload = {
        name: segDraft.name,
        description: segDraft.description,
        mode: segDraft.mode,
        memberIds: segDraft.mode === "manual" ? segDraft.memberIds : undefined,
        rule:
          segDraft.mode === "rule"
            ? { field: segDraft.ruleField, value: segDraft.ruleValue }
            : undefined,
      };
      return editingSegmentId
        ? updateSegment(editingSegmentId, payload as any)
        : createSegment(payload);
    },
    onSuccess: () => {
      invalidateSegments();
      setOpenSegmentDialog(false);
      toast({
        title: editingSegmentId ? "Segment updated" : "Segment created",
      });
    },
    onError: onErr("Failed to save segment"),
  });
  const deleteSegmentMut = useMutation({
    mutationFn: (id: string) => deleteSegment(id),
    onSuccess: () => {
      invalidateSegments();
      toast({ title: "Segment deleted" });
    },
    onError: onErr("Failed to delete segment"),
  });

  const filteredClientList = clients.filter((c) =>
    displayName(c).toLowerCase().includes(segSearch.toLowerCase()),
  );

  // ── Campaign dialog ──────────────────────────────────────
  const [openCampaignDialog, setOpenCampaignDialog] = useState(false);
  const [campaignDraft, setCampaignDraft] = useState({
    name: "",
    type: "Newsletter" as CampaignType,
    segmentId: "",
    subject: "",
    body: "",
    event: emptyEventDetails,
  });
  const [prefillNewsletterId, setPrefillNewsletterId] = useState<string | null>(
    null,
  );

  const openNewCampaign = (prefill?: {
    title: string;
    body: string;
    newsletterId: string;
  }) => {
    setPrefillNewsletterId(prefill?.newsletterId ?? null);
    setCampaignDraft({
      name: prefill?.title ?? "",
      type: "Newsletter",
      segmentId: segments[0]?._id ?? "",
      subject: prefill?.title ?? "",
      body: prefill?.body ?? "",
      event: emptyEventDetails,
    });
    setOpenCampaignDialog(true);
  };

  const [detailCampaignId, setDetailCampaignId] = useState<string | null>(null);
  const detailCampaign =
    campaigns.find((c) => c._id === detailCampaignId) ?? null;

  const createCampaignMut = useMutation({
    mutationFn: () =>
      createCampaign({
        name: campaignDraft.name,
        type: campaignDraft.type,
        segmentId: campaignDraft.segmentId,
        subject: campaignDraft.subject,
        body: campaignDraft.body,
        event:
          campaignDraft.type === "Event invite"
            ? campaignDraft.event
            : undefined,
      }),
    onSuccess: (c) => {
      invalidateCampaigns();
      if (prefillNewsletterId) {
        markDraftConverted(prefillNewsletterId, c._id).then(
          invalidateNewsletters,
        );
      }
      setOpenCampaignDialog(false);
      setDetailCampaignId(c._id);
      toast({
        title: "Campaign created",
        description: `${c.name} drafted, targeting ${c.recipients.length} recipients.`,
      });
    },
    onError: onErr("Failed to create campaign"),
  });

  // ── Campaign detail actions ──────────────────────────────
  const [scheduleAt, setScheduleAt] = useState("");
  const [testEmail, setTestEmail] = useState("");

  const sendTestMut = useMutation({
    mutationFn: () => sendCampaignTest(detailCampaign!._id, testEmail),
    onSuccess: () =>
      toast({ title: "Test sent", description: `Sent to ${testEmail}.` }),
    onError: onErr("Failed to send test"),
  });
  const scheduleMut = useMutation({
    mutationFn: () => scheduleCampaign(detailCampaign!._id, scheduleAt),
    onSuccess: () => {
      invalidateCampaigns();
      toast({ title: "Campaign scheduled" });
    },
    onError: onErr("Failed to schedule"),
  });
  const sendNowMut = useMutation({
    mutationFn: () => sendCampaignNow(detailCampaign!._id),
    onSuccess: (sent) => {
      invalidateCampaigns();
      const delivered = sent.recipients.filter((r) => r.delivered).length;
      toast({
        title: "Campaign sent",
        description: `Delivered to ${delivered} of ${sent.recipients.length} recipients.`,
      });
    },
    onError: onErr("Failed to send"),
  });
  const duplicateMut = useMutation({
    mutationFn: () => duplicateCampaign(detailCampaign!._id),
    onSuccess: (c) => {
      invalidateCampaigns();
      setDetailCampaignId(c._id);
      toast({ title: "Campaign duplicated" });
    },
    onError: onErr("Failed to duplicate"),
  });
  const deleteCampaignMut = useMutation({
    mutationFn: () => deleteCampaign(detailCampaign!._id),
    onSuccess: () => {
      invalidateCampaigns();
      setDetailCampaignId(null);
      toast({ title: "Campaign deleted" });
    },
    onError: onErr("Failed to delete"),
  });

  // ── Newsletters ──────────────────────────────────────────
  const generateMut = useMutation({
    mutationFn: () => generateNewsletterDraft(),
    onSuccess: () => {
      invalidateNewsletters();
      toast({
        title: "Newsletter generated",
        description: "Draft compiled from new regulatory feed entries.",
      });
    },
    onError: onErr("Nothing new to compile"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Communications</h1>
        <p className="text-sm text-muted-foreground">
          Campaigns, newsletters and client segmentation.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.l}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{k.l}</p>
                <p className="mt-1 text-xl font-bold">{k.v}</p>
              </div>
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
          <div className="flex justify-end">
            <Button
              onClick={() => openNewCampaign()}
              disabled={!segments.length}
            >
              <Plus className="mr-2 h-4 w-4" />
              New campaign
            </Button>
          </div>
          {!segments.length && (
            <p className="text-xs text-muted-foreground">
              Create a segment first — a campaign needs somewhere real to send
              to.
            </p>
          )}
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-40">Delivery rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No campaigns yet. Create one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                  {campaigns.map((c) => {
                    const delivered = c.recipients.filter(
                      (r) => r.delivered,
                    ).length;
                    const total = c.recipients.length || 1;
                    return (
                      <TableRow
                        key={c._id}
                        className="cursor-pointer"
                        onClick={() => setDetailCampaignId(c._id)}
                      >
                        <TableCell>
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.recipients.length} recipients
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            {typeIcon[c.type]}
                            {c.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {c.segmentName}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusClass[c.status]}
                          >
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Progress
                            value={
                              c.status === "Sent"
                                ? (delivered / total) * 100
                                : 0
                            }
                            className="h-2"
                          />
                          <p className="mt-1 text-xs text-muted-foreground">
                            {c.status === "Sent"
                              ? `${Math.round((delivered / total) * 100)}%`
                              : "—"}
                          </p>
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
          <div className="flex justify-end">
            <Button
              onClick={() => generateMut.mutate()}
              disabled={generateMut.isPending}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate from regulatory feed
            </Button>
          </div>
          <Card>
            <CardContent className="divide-y p-4">
              {newsletters.map((n) => (
                <div
                  key={n._id}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {n.source} · generated{" "}
                      {new Date(n.generatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {n.convertedToCampaignId ? (
                    <Badge
                      variant="outline"
                      className="gap-1 bg-success/15 text-success border-success/30"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Converted to campaign
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        openNewCampaign({
                          title: n.title,
                          body: n.body,
                          newsletterId: n._id,
                        })
                      }
                    >
                      Turn into campaign
                    </Button>
                  )}
                </div>
              ))}
              {!newsletters.length && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No newsletter drafts yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Button onClick={openCreateSegment}>
              <Plus className="mr-2 h-4 w-4" />
              Create segment
            </Button>
          </div>
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Segment</TableHead>
                    <TableHead>Criteria</TableHead>
                    <TableHead className="text-right">Members</TableHead>
                    <TableHead className="w-56 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {segments.map((s) => (
                    <TableRow key={s._id}>
                      <TableCell>
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.description}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.mode === "manual"
                          ? `Manual selection (${s.memberIds.length})`
                          : s.rule
                            ? `${ruleFieldLabels[s.rule.field]} = ${s.rule.value}`
                            : "No rule set"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {s.memberCount}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setViewMembersSegment(s)}
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            Members
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditSegment(s)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => deleteSegmentMut.mutate(s._id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!segments.length && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No segments yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Segment builder dialog */}
      <Dialog open={openSegmentDialog} onOpenChange={setOpenSegmentDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSegmentId ? "Edit segment" : "Create segment"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Name</Label>
              <Input
                value={segDraft.name}
                onChange={(e) =>
                  setSegDraft({ ...segDraft, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={segDraft.description}
                onChange={(e) =>
                  setSegDraft({ ...segDraft, description: e.target.value })
                }
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={segDraft.mode === "rule" ? "default" : "outline"}
                onClick={() => setSegDraft({ ...segDraft, mode: "rule" })}
              >
                Rule-based
              </Button>
              <Button
                size="sm"
                variant={segDraft.mode === "manual" ? "default" : "outline"}
                onClick={() => setSegDraft({ ...segDraft, mode: "manual" })}
              >
                Manual selection
              </Button>
            </div>

            {segDraft.mode === "rule" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Field</Label>
                  <Select
                    value={segDraft.ruleField}
                    onValueChange={(v) =>
                      setSegDraft({
                        ...segDraft,
                        ruleField: v as SegmentRuleField,
                        ruleValue:
                          ruleFieldOptions.find((r) => r.field === v)
                            ?.values[0] ?? "",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ruleFieldOptions.map((r) => (
                        <SelectItem key={r.field} value={r.field}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Value</Label>
                  <Select
                    value={segDraft.ruleValue}
                    onValueChange={(v) =>
                      setSegDraft({ ...segDraft, ruleValue: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ruleFieldOptions
                        .find((r) => r.field === segDraft.ruleField)
                        ?.values.map((v) => (
                          <SelectItem key={v} value={v}>
                            {v}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Search clients…"
                  value={segSearch}
                  onChange={(e) => setSegSearch(e.target.value)}
                />
                <ScrollArea className="h-48 rounded border p-2">
                  {filteredClientList.map((c) => (
                    <label
                      key={c._id}
                      className="flex items-center gap-2 py-1 text-sm"
                    >
                      <Checkbox
                        checked={segDraft.memberIds.includes(c._id)}
                        onCheckedChange={(chk) =>
                          setSegDraft({
                            ...segDraft,
                            memberIds: chk
                              ? [...segDraft.memberIds, c._id]
                              : segDraft.memberIds.filter((id) => id !== c._id),
                          })
                        }
                      />
                      {displayName(c)}
                    </label>
                  ))}
                  {!filteredClientList.length && (
                    <p className="p-2 text-xs text-muted-foreground">
                      No clients match.
                    </p>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              disabled={!segDraft.name.trim() || saveSegmentMut.isPending}
              onClick={() => saveSegmentMut.mutate()}
            >
              {editingSegmentId ? "Save changes" : "Create segment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View members dialog */}
      <Dialog
        open={!!viewMembersSegment}
        onOpenChange={(o) => !o && setViewMembersSegment(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{viewMembersSegment?.name} — members</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-64">
            {viewedMembers.map((m) => (
              <div key={m._id} className="border-b py-2 text-sm last:border-0">
                <p className="font-medium">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.email}</p>
              </div>
            ))}
            {!viewedMembers.length && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No members match this segment right now.
              </p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* New campaign dialog */}
      <Dialog open={openCampaignDialog} onOpenChange={setOpenCampaignDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New campaign</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={campaignDraft.name}
                  onChange={(e) =>
                    setCampaignDraft({ ...campaignDraft, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={campaignDraft.type}
                  onValueChange={(v) =>
                    setCampaignDraft({
                      ...campaignDraft,
                      type: v as CampaignType,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Newsletter">Newsletter</SelectItem>
                    <SelectItem value="Event invite">Event invite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Target segment</Label>
              <Select
                value={campaignDraft.segmentId}
                onValueChange={(v) =>
                  setCampaignDraft({ ...campaignDraft, segmentId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {segments.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name} ({s.memberCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Recipients are resolved from this segment's real, current
                members when the campaign is created.
              </p>
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                value={campaignDraft.subject}
                onChange={(e) =>
                  setCampaignDraft({
                    ...campaignDraft,
                    subject: e.target.value,
                  })
                }
              />
            </div>

            {campaignDraft.type === "Event invite" && (
              <div className="grid grid-cols-2 gap-3 rounded-md border p-3">
                <div>
                  <Label>Event title</Label>
                  <Input
                    value={campaignDraft.event.title}
                    onChange={(e) =>
                      setCampaignDraft({
                        ...campaignDraft,
                        event: {
                          ...campaignDraft.event,
                          title: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Date &amp; time</Label>
                  <Input
                    type="datetime-local"
                    value={campaignDraft.event.dateTime}
                    onChange={(e) =>
                      setCampaignDraft({
                        ...campaignDraft,
                        event: {
                          ...campaignDraft.event,
                          dateTime: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label>Location / link</Label>
                  <Input
                    value={campaignDraft.event.location}
                    onChange={(e) =>
                      setCampaignDraft({
                        ...campaignDraft,
                        event: {
                          ...campaignDraft.event,
                          location: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <Switch
                    checked={campaignDraft.event.rsvp}
                    onCheckedChange={(v) =>
                      setCampaignDraft({
                        ...campaignDraft,
                        event: { ...campaignDraft.event, rsvp: v },
                      })
                    }
                  />
                  <Label className="!mt-0">Require RSVP</Label>
                </div>
              </div>
            )}

            <div>
              <Label>Content</Label>
              <RichTextEditor
                value={campaignDraft.body}
                onChange={(html) =>
                  setCampaignDraft({ ...campaignDraft, body: html })
                }
                placeholder="Write your campaign content…"
                minHeight={160}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => createCampaignMut.mutate()}
              disabled={
                !campaignDraft.name.trim() ||
                !campaignDraft.segmentId ||
                createCampaignMut.isPending
              }
            >
              Create campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign detail sheet */}
      <Sheet
        open={!!detailCampaign}
        onOpenChange={(o) => !o && setDetailCampaignId(null)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {detailCampaign && (
            <div className="space-y-5">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {detailCampaign.name}
                  <Badge
                    variant="outline"
                    className={statusClass[detailCampaign.status]}
                  >
                    {detailCampaign.status}
                  </Badge>
                </SheetTitle>
              </SheetHeader>

              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[160px]">
                  <Label className="text-xs">Send a test to</Label>
                  <Input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="you@firm.com"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!testEmail || sendTestMut.isPending}
                  onClick={() => sendTestMut.mutate()}
                >
                  <Send className="mr-1 h-3 w-3" />
                  Send test
                </Button>
                {detailCampaign.status === "Draft" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={sendNowMut.isPending}
                    onClick={() => sendNowMut.mutate()}
                  >
                    Send now
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => duplicateMut.mutate()}
                >
                  <Copy className="mr-1 h-3 w-3" />
                  Duplicate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => deleteCampaignMut.mutate()}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Delete
                </Button>
              </div>

              {detailCampaign.status === "Draft" && (
                <Card>
                  <CardContent className="flex flex-wrap items-end gap-2 p-4">
                    <div className="flex-1 min-w-[180px]">
                      <Label>Schedule for</Label>
                      <Input
                        type="datetime-local"
                        value={scheduleAt}
                        onChange={(e) => setScheduleAt(e.target.value)}
                      />
                    </div>
                    <Button
                      size="sm"
                      disabled={!scheduleAt || scheduleMut.isPending}
                      onClick={() => scheduleMut.mutate()}
                    >
                      <CalendarClock className="mr-1 h-3 w-3" />
                      Schedule
                    </Button>
                  </CardContent>
                </Card>
              )}
              {detailCampaign.status === "Scheduled" && (
                <p className="text-sm text-muted-foreground">
                  Scheduled to send on{" "}
                  <strong>
                    {new Date(detailCampaign.scheduledAt!).toLocaleString()}
                  </strong>
                  .
                </p>
              )}
              {detailCampaign.status === "Sending" && (
                <p className="text-sm text-muted-foreground">
                  Sending in progress…
                </p>
              )}

              <Separator />

              <div>
                <p className="text-sm font-medium">Subject</p>
                <p className="text-sm text-muted-foreground">
                  {detailCampaign.subject || "(no subject)"}
                </p>
              </div>
              {detailCampaign.event && (
                <div className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{detailCampaign.event.title}</p>
                  <p className="text-muted-foreground">
                    {detailCampaign.event.dateTime} ·{" "}
                    {detailCampaign.event.location}
                  </p>
                  <p className="text-muted-foreground">
                    RSVP{" "}
                    {detailCampaign.event.rsvp ? "required" : "not required"}
                  </p>
                </div>
              )}
              <div>
                <p className="mb-1 text-sm font-medium">Content preview</p>
                <div
                  className="rounded-md border p-3 text-sm"
                  dangerouslySetInnerHTML={{
                    __html:
                      detailCampaign.body ||
                      "<p class='text-muted-foreground'>No content</p>",
                  }}
                />
              </div>

              {detailCampaign.status === "Sent" && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Results</p>
                  {(() => {
                    const total = detailCampaign.recipients.length || 1;
                    const delivered = detailCampaign.recipients.filter(
                      (r) => r.delivered,
                    ).length;
                    return (
                      <div>
                        <div className="flex justify-between text-xs">
                          <span>Delivered</span>
                          <span>
                            {delivered} / {detailCampaign.recipients.length}
                          </span>
                        </div>
                        <Progress
                          value={(delivered / total) * 100}
                          className="h-2"
                        />
                      </div>
                    );
                  })()}
                  <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Open, click
                    {detailCampaign.type === "Event invite"
                      ? " and RSVP"
                      : ""}{" "}
                    tracking aren't available — no email provider with tracking
                    is connected yet.
                  </div>
                </div>
              )}

              <div>
                <p className="mb-1 text-sm font-medium">
                  Recipients ({detailCampaign.recipients.length})
                </p>
                <ScrollArea className="h-56 rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Delivered</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailCampaign.recipients.map((r) => (
                        <TableRow key={r.clientId}>
                          <TableCell className="text-sm">
                            {r.clientName}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {r.email}
                          </TableCell>
                          <TableCell>
                            {detailCampaign.status === "Sent" ? (
                              r.delivered ? (
                                "✓"
                              ) : (
                                <span
                                  className="text-destructive"
                                  title={r.deliveryError ?? undefined}
                                >
                                  ✗
                                </span>
                              )
                            ) : (
                              "—"
                            )}
                          </TableCell>
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
