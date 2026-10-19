import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
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
  Pencil,
  AlertTriangle,
  Clock,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  fetchClients,
  displayName,
  type ApiClient,
} from "@/lib/client/clients-api";
import { fetchContacts, type Contact } from "@/lib/crm/crm-contacts-api";
import { fetchBoardMembers, type BoardMember } from "@/lib/grc/governance-api";
import {
  fetchSegments,
  createSegment,
  updateSegment,
  deleteSegment,
  fetchSegmentMembers,
  fetchCampaigns,
  createCampaign,
  updateCampaign,
  duplicateCampaign,
  deleteCampaign,
  scheduleCampaign,
  unscheduleCampaign,
  sendCampaignNow,
  sendCampaignTest,
  fetchNewsletterDrafts,
  generateNewsletterDraft,
  markDraftConverted,
  fetchAlerts,
  createAlert,
  updateAlert,
  deleteAlert,
  scheduleAlert,
  unscheduleAlert,
  sendAlertNow,
  sendAlertTest,
  ALERT_CATEGORIES,
  ALERT_PRIORITIES,
  ALERT_CATEGORY_ICON,
  type Segment,
  type SegmentRuleField,
  type SegmentAudience,
  type Campaign,
  type CampaignType,
  type Alert,
  type AlertCategory,
  type AlertPriority,
} from "@/lib/crm/tools-api";

const audienceLabels: Record<SegmentAudience, string> = {
  Client: "Clients",
  Contact: "CRM contacts",
  BoardMember: "Board members",
};
const audienceOptions: SegmentAudience[] = ["Client", "Contact", "BoardMember"];

const statusClass: Record<Campaign["status"], string> = {
  Draft: "bg-muted text-muted-foreground",
  Scheduled: "bg-warning/15 text-warning border-warning/30",
  Sending: "bg-primary/15 text-primary border-primary/30",
  Sent: "bg-success/15 text-success border-success/30",
};

const typeIcon: Record<CampaignType, JSX.Element> = {
  Newsletter: <Newspaper className="h-3 w-3" />,
};

// Same Draft/Scheduled/Sending/Sent vocabulary as Campaign — reuses
// the identical colour mapping.
const alertStatusClass: Record<Alert["status"], string> = {
  Draft: "bg-muted text-muted-foreground",
  Scheduled: "bg-warning/15 text-warning border-warning/30",
  Sending: "bg-primary/15 text-primary border-primary/30",
  Sent: "bg-success/15 text-success border-success/30",
};
const alertPriorityClass: Record<AlertPriority, string> = {
  Critical: "bg-destructive/15 text-destructive border-destructive/30",
  High: "bg-warning/15 text-warning border-warning/30",
  Medium: "bg-primary/15 text-primary border-primary/30",
  Low: "bg-muted text-muted-foreground",
};
const CHART_COLORS = ["#4B0082", "#8a6d16", "#2e7d32", "#1565c0", "#c0392b"];

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
  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts"],
    queryFn: fetchAlerts,
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-for-segments"],
    queryFn: fetchClients,
  });
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-for-segments"],
    queryFn: fetchContacts,
  });
  const { data: boardMembers = [] } = useQuery({
    queryKey: ["board-members-for-segments"],
    queryFn: fetchBoardMembers,
  });

  const invalidateSegments = () =>
    queryClient.invalidateQueries({ queryKey: ["segments"] });
  const invalidateCampaigns = () =>
    queryClient.invalidateQueries({ queryKey: ["campaigns"] });
  const invalidateNewsletters = () =>
    queryClient.invalidateQueries({ queryKey: ["newsletter-drafts"] });
  const invalidateAlerts = () =>
    queryClient.invalidateQueries({ queryKey: ["alerts"] });

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
    audience: SegmentAudience;
    ruleField: SegmentRuleField;
    ruleValue: string;
    memberIds: string[];
  }>({
    name: "",
    description: "",
    mode: "rule",
    audience: "Client",
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
      audience: "Client",
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
      audience: s.audience ?? "Client",
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
        audience: segDraft.audience,
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

  // Manual-picker source list depends on the segment's own audience —
  // Client pulls from the tenant's clients, Contact from CRM contacts,
  // BoardMember from governance's board members (excluding offboarded,
  // which can't receive anything anyway).
  const filteredClientList = clients.filter((c) =>
    displayName(c).toLowerCase().includes(segSearch.toLowerCase()),
  );
  const filteredContactList = contacts.filter((c) =>
    c.name.toLowerCase().includes(segSearch.toLowerCase()),
  );
  const filteredBoardMemberList = boardMembers
    .filter((m) => m.lifecycleStatus !== "Offboarded")
    .filter((m) => m.name.toLowerCase().includes(segSearch.toLowerCase()));

  // ── Campaign dialog ──────────────────────────────────────
  const [openCampaignDialog, setOpenCampaignDialog] = useState(false);
  const [campaignDraft, setCampaignDraft] = useState({
    name: "",
    type: "Newsletter" as CampaignType,
    segmentIds: [] as string[],
    subject: "",
    body: "",
  });
  const [prefillNewsletterId, setPrefillNewsletterId] = useState<string | null>(
    null,
  );
  // Set only when editing an existing campaign — distinguishes a
  // real edit (PATCH) from a fresh create (POST) in the same dialog
  // and form state.
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(
    null,
  );

  const openNewCampaign = (prefill?: {
    title: string;
    body: string;
    newsletterId: string;
  }) => {
    setEditingCampaignId(null);
    setPrefillNewsletterId(prefill?.newsletterId ?? null);
    setCampaignDraft({
      name: prefill?.title ?? "",
      type: "Newsletter",
      segmentIds: segments[0] ? [segments[0]._id] : [],
      subject: prefill?.title ?? "",
      body: prefill?.body ?? "",
    });
    setOpenCampaignDialog(true);
  };

  // Real edit — pre-fills the same dialog from the campaign's own
  // current real values, available while Draft or Scheduled.
  const openEditCampaign = (c: Campaign) => {
    setEditingCampaignId(c._id);
    setPrefillNewsletterId(null);
    setCampaignDraft({
      name: c.name,
      type: c.type,
      segmentIds: c.segmentIds,
      subject: c.subject,
      body: c.body,
    });
    setOpenCampaignDialog(true);
  };

  const [detailCampaignId, setDetailCampaignId] = useState<string | null>(null);
  const detailCampaign =
    campaigns.find((c) => c._id === detailCampaignId) ?? null;

  const saveCampaignMut = useMutation({
    mutationFn: () => {
      const payload = {
        name: campaignDraft.name,
        type: campaignDraft.type,
        segmentIds: campaignDraft.segmentIds,
        subject: campaignDraft.subject,
        body: campaignDraft.body,
      };
      return editingCampaignId
        ? updateCampaign(editingCampaignId, payload)
        : createCampaign(payload);
    },
    onSuccess: (c) => {
      invalidateCampaigns();
      if (prefillNewsletterId) {
        markDraftConverted(prefillNewsletterId, c._id).then(
          invalidateNewsletters,
        );
      }
      setOpenCampaignDialog(false);
      setDetailCampaignId(c._id);
      toast(
        editingCampaignId
          ? { title: "Campaign updated" }
          : {
              title: "Campaign created",
              description: `${c.name} drafted, targeting ${c.recipients.length} recipients.`,
            },
      );
    },
    onError: onErr(
      editingCampaignId
        ? "Failed to save changes"
        : "Failed to create campaign",
    ),
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
    // `scheduleAt` comes straight from a <input type="datetime-local">,
    // which yields a naive, timezone-less string (e.g. "2026-10-13T14:30").
    // `new Date(...)` on that string is parsed as *this browser's* local
    // time (i.e. the tenant's own timezone) per the JS Date spec, so
    // calling `.toISOString()` on it converts to an unambiguous UTC
    // instant before it leaves the browser. Sending the naive string
    // as-is let the backend's `new Date(dto.scheduledAt)` reinterpret it
    // as the *server's* local time (UTC in production), which silently
    // shifted Kigali-time (UTC+2) selections 2 hours into the future.
    mutationFn: () =>
      scheduleCampaign(detailCampaign!._id, new Date(scheduleAt).toISOString()),
    onSuccess: () => {
      invalidateCampaigns();
      toast({ title: "Campaign scheduled" });
    },
    onError: onErr("Failed to schedule"),
  });
  const unscheduleMut = useMutation({
    mutationFn: () => unscheduleCampaign(detailCampaign!._id),
    onSuccess: () => {
      invalidateCampaigns();
      toast({
        title: "Schedule cancelled",
        description:
          "Back to Draft — send now or reschedule whenever you're ready.",
      });
    },
    onError: onErr("Failed to cancel schedule"),
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

  // ── Alerts ────────────────────────────────────────────────
  const [alertCategoryFilter, setAlertCategoryFilter] = useState<
    AlertCategory | "All"
  >("All");
  const filteredAlerts = alerts.filter(
    (a) => alertCategoryFilter === "All" || a.category === alertCategoryFilter,
  );
  const urgentAlerts = alerts.filter((a) => a.priority === "Critical").length;
  const inProgressAlerts = alerts.filter((a) => a.status === "Sending").length;
  const sentAlerts = alerts.filter((a) => a.status === "Sent");
  const avgAlertOpenRate = sentAlerts.length
    ? Math.round(
        (sentAlerts.reduce(
          (s, a) =>
            s +
            a.recipients.filter((r) => r.opened).length /
              Math.max(1, a.recipients.length),
          0,
        ) /
          sentAlerts.length) *
          100,
      )
    : 0;
  const alertKpis = [
    { l: "Urgent", v: urgentAlerts, icon: AlertTriangle },
    { l: "In progress", v: inProgressAlerts, icon: Clock },
    { l: "Sent", v: sentAlerts.length, icon: CheckCircle2 },
    { l: "Avg. open rate", v: `${avgAlertOpenRate}%`, icon: Mail },
    { l: "Total alerts", v: alerts.length, icon: Megaphone },
  ];

  const [openAlertDialog, setOpenAlertDialog] = useState(false);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [alertDraft, setAlertDraft] = useState<{
    title: string;
    category: AlertCategory;
    priority: AlertPriority;
    triggerType: string;
    source: string;
    summary: string;
    actionRequired: string;
    effectiveDate: string;
    deadline: string;
    segmentIds: string[];
  }>({
    title: "",
    category: "Regulatory",
    priority: "Medium",
    triggerType: "",
    source: "",
    summary: "",
    actionRequired: "",
    effectiveDate: "",
    deadline: "",
    segmentIds: [],
  });

  const openNewAlert = () => {
    setEditingAlertId(null);
    setAlertDraft({
      title: "",
      category: "Regulatory",
      priority: "Medium",
      triggerType: "",
      source: "",
      summary: "",
      actionRequired: "",
      effectiveDate: "",
      deadline: "",
      segmentIds: segments[0] ? [segments[0]._id] : [],
    });
    setOpenAlertDialog(true);
  };
  const openEditAlert = (a: Alert) => {
    setEditingAlertId(a._id);
    setAlertDraft({
      title: a.title,
      category: a.category,
      priority: a.priority,
      triggerType: a.triggerType,
      source: a.source,
      summary: a.summary,
      actionRequired: a.actionRequired,
      effectiveDate: a.effectiveDate ? a.effectiveDate.slice(0, 10) : "",
      deadline: a.deadline ? a.deadline.slice(0, 10) : "",
      segmentIds: a.segmentIds,
    });
    setOpenAlertDialog(true);
  };

  const [detailAlertId, setDetailAlertId] = useState<string | null>(null);
  const detailAlert = alerts.find((a) => a._id === detailAlertId) ?? null;

  const saveAlertMut = useMutation({
    mutationFn: () => {
      const payload = {
        title: alertDraft.title,
        category: alertDraft.category,
        priority: alertDraft.priority,
        triggerType: alertDraft.triggerType || undefined,
        source: alertDraft.source || undefined,
        summary: alertDraft.summary,
        actionRequired: alertDraft.actionRequired || undefined,
        effectiveDate: alertDraft.effectiveDate || undefined,
        deadline: alertDraft.deadline || undefined,
        segmentIds: alertDraft.segmentIds,
      };
      return editingAlertId
        ? updateAlert(editingAlertId, payload)
        : createAlert(payload);
    },
    onSuccess: (a) => {
      invalidateAlerts();
      setOpenAlertDialog(false);
      setDetailAlertId(a._id);
      toast(
        editingAlertId
          ? { title: "Alert updated" }
          : {
              title: "Alert drafted",
              description: `${a.title} targeting ${a.recipients.length} recipients.`,
            },
      );
    },
    onError: onErr(
      editingAlertId ? "Failed to save changes" : "Failed to create alert",
    ),
  });

  const [alertScheduleAt, setAlertScheduleAt] = useState("");
  const [alertTestEmail, setAlertTestEmail] = useState("");

  const sendAlertTestMut = useMutation({
    mutationFn: () => sendAlertTest(detailAlert!._id, alertTestEmail),
    onSuccess: () =>
      toast({ title: "Test sent", description: `Sent to ${alertTestEmail}.` }),
    onError: onErr("Failed to send test"),
  });
  const scheduleAlertMut = useMutation({
    // Same local→UTC conversion as scheduleMut above — a naive
    // datetime-local string must be converted before it leaves the
    // browser, or the server reinterprets it in its own timezone.
    mutationFn: () =>
      scheduleAlert(detailAlert!._id, new Date(alertScheduleAt).toISOString()),
    onSuccess: () => {
      invalidateAlerts();
      toast({ title: "Alert scheduled" });
    },
    onError: onErr("Failed to schedule"),
  });
  const unscheduleAlertMut = useMutation({
    mutationFn: () => unscheduleAlert(detailAlert!._id),
    onSuccess: () => {
      invalidateAlerts();
      toast({
        title: "Schedule cancelled",
        description: "Back to Draft — approve and send whenever ready.",
      });
    },
    onError: onErr("Failed to cancel schedule"),
  });
  const sendAlertNowMut = useMutation({
    mutationFn: () => sendAlertNow(detailAlert!._id),
    onSuccess: (sent) => {
      invalidateAlerts();
      const delivered = sent.recipients.filter((r) => r.delivered).length;
      toast({
        title: "Alert sent",
        description: `Delivered to ${delivered} of ${sent.recipients.length} recipients.`,
      });
    },
    onError: onErr("Failed to send"),
  });
  const deleteAlertMut = useMutation({
    mutationFn: () => deleteAlert(detailAlert!._id),
    onSuccess: () => {
      invalidateAlerts();
      setDetailAlertId(null);
      toast({ title: "Alert deleted" });
    },
    onError: onErr("Failed to delete"),
  });

  // Same table shape as the Campaigns tab — reused by the Newsletters
  // tab below, filtered to campaigns of type "Newsletter" only, so
  // tenants have a dedicated list of just their newsletter sends
  // without the full, unfiltered Campaigns tab.
  const renderCampaignsTable = (list: Campaign[], emptyText: string) => (
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
            {list.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
            {list.map((c) => {
              const delivered = c.recipients.filter((r) => r.delivered).length;
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
                    {c.segmentNames?.join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusClass[c.status]}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Progress
                      value={
                        c.status === "Sent" ? (delivered / total) * 100 : 0
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
  );
  const newsletterCampaigns = campaigns.filter((c) => c.type === "Newsletter");

  // ── Analytics — real figures computed from the same Campaign,
  // Alert, Segment and NewsletterDraft data the other tabs show;
  // nothing here is a separate tracked metric or a fabricated number
  // for a content type (LinkedIn posts, gated PDFs, event pages) this
  // codebase has no real data source for. ─────────────────────────
  const totalReach = useMemo(() => {
    const emails = new Set<string>();
    for (const c of campaigns)
      for (const r of c.recipients) emails.add(r.email.toLowerCase());
    for (const a of alerts)
      for (const r of a.recipients) emails.add(r.email.toLowerCase());
    return emails.size;
  }, [campaigns, alerts]);

  const engagementByChannel = useMemo(() => {
    const rate = (
      items: { recipients: { delivered: boolean; opened: boolean }[] }[],
      key: "delivered" | "opened",
    ) => {
      const sent = items.filter((i) => i.recipients.length);
      if (!sent.length) return 0;
      return Math.round(
        (sent.reduce(
          (s, i) =>
            s +
            i.recipients.filter((r) => r[key]).length /
              Math.max(1, i.recipients.length),
          0,
        ) /
          sent.length) *
          100,
      );
    };
    return [
      {
        name: "Campaigns",
        delivered: rate(sentCampaigns, "delivered"),
        opened: rate(sentCampaigns, "opened"),
      },
      {
        name: "Alerts",
        delivered: rate(sentAlerts, "delivered"),
        opened: rate(sentAlerts, "opened"),
      },
    ];
  }, [sentCampaigns, sentAlerts]);

  // Last 6 months, real sent counts from sentAt — not a fabricated
  // trend line.
  const monthlySendVolume = useMemo(() => {
    const months: { key: string; name: string }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        name: d.toLocaleDateString(undefined, { month: "short" }),
      });
    }
    const countFor = (items: { sentAt: string | null }[], key: string) =>
      items.filter((i) => {
        if (!i.sentAt) return false;
        const d = new Date(i.sentAt);
        return `${d.getFullYear()}-${d.getMonth()}` === key;
      }).length;
    return months.map((m) => ({
      name: m.name,
      campaigns: countFor(campaigns, m.key),
      alerts: countFor(alerts, m.key),
    }));
  }, [campaigns, alerts]);

  const topSegmentsByReach = useMemo(
    () =>
      [...segments]
        .sort((a, b) => b.memberCount - a.memberCount)
        .slice(0, 6)
        .map((s) => ({ name: s.name, members: s.memberCount })),
    [segments],
  );

  const contentPerformance = useMemo(() => {
    const rows = [
      ...campaigns.map((c) => ({
        id: c._id,
        kind: "Campaign" as const,
        name: c.name,
        status: c.status,
        recipients: c.recipients.length,
        delivered: c.recipients.filter((r) => r.delivered).length,
        opened: c.recipients.filter((r) => r.opened).length,
        sentAt: c.sentAt,
      })),
      ...alerts.map((a) => ({
        id: a._id,
        kind: "Alert" as const,
        name: a.title,
        status: a.status,
        recipients: a.recipients.length,
        delivered: a.recipients.filter((r) => r.delivered).length,
        opened: a.recipients.filter((r) => r.opened).length,
        sentAt: a.sentAt,
      })),
    ];
    return rows.sort((a, b) => {
      const at = a.sentAt ? new Date(a.sentAt).getTime() : 0;
      const bt = b.sentAt ? new Date(b.sentAt).getTime() : 0;
      return bt - at;
    });
  }, [campaigns, alerts]);

  const analyticsKpis = [
    { l: "Total reach (unique recipients)", v: totalReach, icon: Users },
    { l: "Avg. campaign delivery rate", v: `${avgDeliveryRate}%`, icon: Mail },
    { l: "Avg. alert open rate", v: `${avgAlertOpenRate}%`, icon: TrendingUp },
    { l: "Newsletter drafts generated", v: newsletters.length, icon: Sparkles },
    { l: "Active segments", v: segments.length, icon: BarChart3 },
  ];

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
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
          {renderCampaignsTable(
            campaigns,
            "No campaigns yet. Create one to get started.",
          )}
        </TabsContent>

        <TabsContent value="newsletters" className="space-y-4 pt-4">
          <div>
            <h3 className="text-sm font-semibold">Regulatory feed drafts</h3>
            <p className="text-xs text-muted-foreground">
              Mechanically compiled from new regulatory change entries — turn
              one into a real campaign below.
            </p>
          </div>
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

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Newsletter campaigns</h3>
              <p className="text-xs text-muted-foreground">
                Same list as Campaigns, showing only the ones sent as a
                newsletter.
              </p>
            </div>
            <Button
              onClick={() => openNewCampaign()}
              disabled={!segments.length}
            >
              <Plus className="mr-2 h-4 w-4" />
              New campaign
            </Button>
          </div>
          {renderCampaignsTable(
            newsletterCampaigns,
            "No newsletter campaigns yet.",
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4 pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {alertKpis.map((k) => (
              <Card key={k.l}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{k.l}</p>
                    <p className="mt-1 text-xl font-bold">{k.v}</p>
                  </div>
                  <k.icon className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              <Button
                size="sm"
                variant={alertCategoryFilter === "All" ? "default" : "outline"}
                onClick={() => setAlertCategoryFilter("All")}
              >
                All
              </Button>
              {ALERT_CATEGORIES.map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant={alertCategoryFilter === cat ? "default" : "outline"}
                  onClick={() => setAlertCategoryFilter(cat)}
                >
                  <span className="mr-1">{ALERT_CATEGORY_ICON[cat]}</span>
                  {cat}
                </Button>
              ))}
            </div>
            <Button onClick={openNewAlert} disabled={!segments.length}>
              <Plus className="mr-2 h-4 w-4" />
              New alert
            </Button>
          </div>
          {!segments.length && (
            <p className="text-xs text-muted-foreground">
              Create a segment first — an alert needs somewhere real to send to.
            </p>
          )}

          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alert</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Clients</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-32">Engagement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlerts.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No alerts yet. Create one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredAlerts.map((a) => {
                    const delivered = a.recipients.filter(
                      (r) => r.delivered,
                    ).length;
                    const total = a.recipients.length || 1;
                    return (
                      <TableRow
                        key={a._id}
                        className="cursor-pointer"
                        onClick={() => setDetailAlertId(a._id)}
                      >
                        <TableCell>
                          <p className="text-sm font-medium">{a.title}</p>
                          <Badge
                            variant="outline"
                            className={`mt-1 ${alertPriorityClass[a.priority]}`}
                          >
                            {a.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <span>{ALERT_CATEGORY_ICON[a.category]}</span>
                            {a.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {a.triggerType || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={alertStatusClass[a.status]}
                          >
                            {a.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {a.segmentNames?.join(", ") || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {a.effectiveDate
                            ? new Date(a.effectiveDate).toLocaleDateString()
                            : new Date(a.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Progress
                            value={
                              a.status === "Sent"
                                ? (delivered / total) * 100
                                : 0
                            }
                            className="h-2"
                          />
                          <p className="mt-1 text-xs text-muted-foreground">
                            {a.status === "Sent"
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
                    <TableHead>Audience</TableHead>
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
                      <TableCell>
                        <Badge variant="outline">
                          {audienceLabels[s.audience ?? "Client"]}
                        </Badge>
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
                        colSpan={5}
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

        <TabsContent value="analytics" className="space-y-4 pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {analyticsKpis.map((k) => (
              <Card key={k.l}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{k.l}</p>
                    <p className="mt-1 text-xl font-bold">{k.v}</p>
                  </div>
                  <k.icon className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Engagement by channel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={engagementByChannel}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="opacity-30"
                    />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} unit="%" />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Bar
                      dataKey="delivered"
                      name="Delivered"
                      radius={[4, 4, 0, 0]}
                      fill={CHART_COLORS[0]}
                    />
                    <Bar
                      dataKey="opened"
                      name="Opened"
                      radius={[4, 4, 0, 0]}
                      fill={CHART_COLORS[1]}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <p className="mt-2 text-xs text-muted-foreground">
                  Real delivered/opened rates across sent campaigns and alerts —
                  opened reflects an actual client/board-portal view, not
                  email-open-pixel tracking.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly send volume</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlySendVolume}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="opacity-30"
                    />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} allowDecimals={false} />
                    <Tooltip />
                    <Bar
                      dataKey="campaigns"
                      name="Campaigns"
                      radius={[4, 4, 0, 0]}
                      fill={CHART_COLORS[0]}
                    />
                    <Bar
                      dataKey="alerts"
                      name="Alerts"
                      radius={[4, 4, 0, 0]}
                      fill={CHART_COLORS[4]}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <p className="mt-2 text-xs text-muted-foreground">
                  Real sends over the last 6 months, by actual send date.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Segment reach — top segments by real member count
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topSegmentsByReach} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" fontSize={12} allowDecimals={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={140}
                    fontSize={12}
                  />
                  <Tooltip />
                  <Bar dataKey="members" radius={[0, 4, 4, 0]}>
                    {topSegmentsByReach.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {!topSegmentsByReach.length && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No segments yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content performance</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Recipients</TableHead>
                    <TableHead className="text-right">Delivered</TableHead>
                    <TableHead className="text-right">Opened</TableHead>
                    <TableHead>Sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contentPerformance.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No campaigns or alerts yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {contentPerformance.map((row) => (
                    <TableRow
                      key={`${row.kind}-${row.id}`}
                      className="cursor-pointer"
                      onClick={() =>
                        row.kind === "Campaign"
                          ? setDetailCampaignId(row.id)
                          : setDetailAlertId(row.id)
                      }
                    >
                      <TableCell className="text-sm font-medium">
                        {row.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.kind}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{row.status}</TableCell>
                      <TableCell className="text-right text-sm">
                        {row.recipients}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {row.delivered}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {row.opened}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.sentAt
                          ? new Date(row.sentAt).toLocaleDateString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
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
            <div>
              <Label>Audience</Label>
              <Select
                value={segDraft.audience}
                onValueChange={(v) =>
                  setSegDraft({
                    ...segDraft,
                    audience: v as SegmentAudience,
                    // Rule mode only exists for Client — switching to
                    // Contact/BoardMember falls back to manual.
                    mode: v === "Client" ? segDraft.mode : "manual",
                    memberIds: [],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {audienceOptions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {audienceLabels[a]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Clients, CRM contacts and board members each have their own
                segments — a campaign can target several at once.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant={segDraft.mode === "rule" ? "default" : "outline"}
                disabled={segDraft.audience !== "Client"}
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
            {segDraft.audience !== "Client" && (
              <p className="text-xs text-muted-foreground">
                Rule-based segments aren't available for{" "}
                {audienceLabels[segDraft.audience].toLowerCase()} yet — pick
                members manually below.
              </p>
            )}

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
                  placeholder={`Search ${audienceLabels[segDraft.audience].toLowerCase()}…`}
                  value={segSearch}
                  onChange={(e) => setSegSearch(e.target.value)}
                />
                <ScrollArea className="h-48 rounded border p-2">
                  {segDraft.audience === "Client" &&
                    filteredClientList.map((c) => (
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
                                : segDraft.memberIds.filter(
                                    (id) => id !== c._id,
                                  ),
                            })
                          }
                        />
                        {displayName(c)}
                      </label>
                    ))}
                  {segDraft.audience === "Contact" &&
                    filteredContactList.map((c) => (
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
                                : segDraft.memberIds.filter(
                                    (id) => id !== c._id,
                                  ),
                            })
                          }
                        />
                        {c.name}
                        {c.email ? "" : " (no email)"}
                      </label>
                    ))}
                  {segDraft.audience === "BoardMember" &&
                    filteredBoardMemberList.map((m) => (
                      <label
                        key={m._id}
                        className="flex items-center gap-2 py-1 text-sm"
                      >
                        <Checkbox
                          checked={segDraft.memberIds.includes(m._id)}
                          onCheckedChange={(chk) =>
                            setSegDraft({
                              ...segDraft,
                              memberIds: chk
                                ? [...segDraft.memberIds, m._id]
                                : segDraft.memberIds.filter(
                                    (id) => id !== m._id,
                                  ),
                            })
                          }
                        />
                        {m.name}
                      </label>
                    ))}
                  {segDraft.audience === "Client" &&
                    !filteredClientList.length && (
                      <p className="p-2 text-xs text-muted-foreground">
                        No clients match.
                      </p>
                    )}
                  {segDraft.audience === "Contact" &&
                    !filteredContactList.length && (
                      <p className="p-2 text-xs text-muted-foreground">
                        No contacts match.
                      </p>
                    )}
                  {segDraft.audience === "BoardMember" &&
                    !filteredBoardMemberList.length && (
                      <p className="p-2 text-xs text-muted-foreground">
                        No board members match.
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

      {/* New / edit campaign dialog */}
      <Dialog open={openCampaignDialog} onOpenChange={setOpenCampaignDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCampaignId ? "Edit campaign" : "New campaign"}
            </DialogTitle>
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
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Target segments</Label>
              <div className="rounded-md border p-2">
                <ScrollArea className="h-32">
                  {segments.map((s) => (
                    <label
                      key={s._id}
                      className="flex items-center gap-2 py-1 text-sm"
                    >
                      <Checkbox
                        checked={campaignDraft.segmentIds.includes(s._id)}
                        onCheckedChange={(chk) =>
                          setCampaignDraft({
                            ...campaignDraft,
                            segmentIds: chk
                              ? [...campaignDraft.segmentIds, s._id]
                              : campaignDraft.segmentIds.filter(
                                  (id) => id !== s._id,
                                ),
                          })
                        }
                      />
                      {s.name}
                      <Badge variant="outline" className="ml-1">
                        {audienceLabels[s.audience ?? "Client"]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ({s.memberCount})
                      </span>
                    </label>
                  ))}
                  {!segments.length && (
                    <p className="p-2 text-xs text-muted-foreground">
                      No segments yet.
                    </p>
                  )}
                </ScrollArea>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                A campaign can target several segments at once — recipients are
                the union of their real, current members (clients, contacts
                and/or board members), de-duplicated by email, and resolved when
                the campaign is created.
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
              onClick={() => saveCampaignMut.mutate()}
              disabled={
                !campaignDraft.name.trim() ||
                !campaignDraft.segmentIds.length ||
                saveCampaignMut.isPending
              }
            >
              {editingCampaignId ? "Save changes" : "Create campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New / edit alert dialog */}
      <Dialog open={openAlertDialog} onOpenChange={setOpenAlertDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAlertId ? "Edit alert" : "New alert"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Title</Label>
              <Input
                value={alertDraft.title}
                onChange={(e) =>
                  setAlertDraft({ ...alertDraft, title: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select
                  value={alertDraft.category}
                  onValueChange={(v) =>
                    setAlertDraft({
                      ...alertDraft,
                      category: v as AlertCategory,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALERT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {ALERT_CATEGORY_ICON[cat]} {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={alertDraft.priority}
                  onValueChange={(v) =>
                    setAlertDraft({
                      ...alertDraft,
                      priority: v as AlertPriority,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALERT_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Trigger type</Label>
                <Input
                  placeholder="e.g. Regulation change, filing deadline"
                  value={alertDraft.triggerType}
                  onChange={(e) =>
                    setAlertDraft({
                      ...alertDraft,
                      triggerType: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Source / authority</Label>
                <Input
                  value={alertDraft.source}
                  onChange={(e) =>
                    setAlertDraft({ ...alertDraft, source: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Summary</Label>
              <Textarea
                rows={3}
                value={alertDraft.summary}
                onChange={(e) =>
                  setAlertDraft({ ...alertDraft, summary: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Action required</Label>
              <Textarea
                rows={2}
                value={alertDraft.actionRequired}
                onChange={(e) =>
                  setAlertDraft({
                    ...alertDraft,
                    actionRequired: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Effective date</Label>
                <Input
                  type="date"
                  value={alertDraft.effectiveDate}
                  onChange={(e) =>
                    setAlertDraft({
                      ...alertDraft,
                      effectiveDate: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Deadline</Label>
                <Input
                  type="date"
                  value={alertDraft.deadline}
                  onChange={(e) =>
                    setAlertDraft({ ...alertDraft, deadline: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Affected clients / segments</Label>
              <div className="rounded-md border p-2">
                <ScrollArea className="h-32">
                  {segments.map((s) => (
                    <label
                      key={s._id}
                      className="flex items-center gap-2 py-1 text-sm"
                    >
                      <Checkbox
                        checked={alertDraft.segmentIds.includes(s._id)}
                        onCheckedChange={(chk) =>
                          setAlertDraft({
                            ...alertDraft,
                            segmentIds: chk
                              ? [...alertDraft.segmentIds, s._id]
                              : alertDraft.segmentIds.filter(
                                  (id) => id !== s._id,
                                ),
                          })
                        }
                      />
                      {s.name}
                      <Badge variant="outline" className="ml-1">
                        {audienceLabels[s.audience ?? "Client"]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ({s.memberCount})
                      </span>
                    </label>
                  ))}
                  {!segments.length && (
                    <p className="p-2 text-xs text-muted-foreground">
                      No segments yet.
                    </p>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAlertDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveAlertMut.mutate()}
              disabled={
                !alertDraft.title.trim() ||
                !alertDraft.summary.trim() ||
                !alertDraft.segmentIds.length ||
                saveAlertMut.isPending
              }
            >
              {editingAlertId ? "Save changes" : "Save draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert detail sheet */}
      <Sheet
        open={!!detailAlert}
        onOpenChange={(o) => !o && setDetailAlertId(null)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {detailAlert && (
            <div className="space-y-5">
              <SheetHeader>
                <SheetTitle className="flex flex-wrap items-center gap-2">
                  {detailAlert.title}
                  <Badge
                    variant="outline"
                    className={alertStatusClass[detailAlert.status]}
                  >
                    {detailAlert.status}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={alertPriorityClass[detailAlert.priority]}
                  >
                    {detailAlert.priority}
                  </Badge>
                </SheetTitle>
              </SheetHeader>

              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[160px]">
                  <Label className="text-xs">Send a test to</Label>
                  <Input
                    type="email"
                    value={alertTestEmail}
                    onChange={(e) => setAlertTestEmail(e.target.value)}
                    placeholder="you@firm.com"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!alertTestEmail || sendAlertTestMut.isPending}
                  onClick={() => sendAlertTestMut.mutate()}
                >
                  <Send className="mr-1 h-3 w-3" />
                  Send test
                </Button>
                {(detailAlert.status === "Draft" ||
                  detailAlert.status === "Scheduled") && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={sendAlertNowMut.isPending}
                    onClick={() => sendAlertNowMut.mutate()}
                  >
                    Approve &amp; send now
                  </Button>
                )}
                {(detailAlert.status === "Draft" ||
                  detailAlert.status === "Scheduled") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditAlert(detailAlert)}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit draft
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => deleteAlertMut.mutate()}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Delete
                </Button>
              </div>

              {detailAlert.status === "Draft" && (
                <Card>
                  <CardContent className="flex flex-wrap items-end gap-2 p-4">
                    <div className="flex-1 min-w-[180px]">
                      <Label>Schedule for</Label>
                      <Input
                        type="datetime-local"
                        value={alertScheduleAt}
                        onChange={(e) => setAlertScheduleAt(e.target.value)}
                      />
                    </div>
                    <Button
                      size="sm"
                      disabled={!alertScheduleAt || scheduleAlertMut.isPending}
                      onClick={() => scheduleAlertMut.mutate()}
                    >
                      <CalendarClock className="mr-1 h-3 w-3" />
                      Schedule
                    </Button>
                  </CardContent>
                </Card>
              )}
              {detailAlert.status === "Scheduled" && (
                <Card>
                  <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
                    <p className="text-sm text-muted-foreground">
                      Scheduled to send on{" "}
                      <strong>
                        {new Date(detailAlert.scheduledAt!).toLocaleString()}
                      </strong>
                      .
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={unscheduleAlertMut.isPending}
                      onClick={() => unscheduleAlertMut.mutate()}
                    >
                      Cancel schedule
                    </Button>
                  </CardContent>
                </Card>
              )}
              {detailAlert.status === "Sending" && (
                <p className="text-sm text-muted-foreground">
                  Sending in progress…
                </p>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-medium">Category</p>
                  <p className="text-muted-foreground">
                    {ALERT_CATEGORY_ICON[detailAlert.category]}{" "}
                    {detailAlert.category}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Trigger</p>
                  <p className="text-muted-foreground">
                    {detailAlert.triggerType || "—"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Source / authority</p>
                  <p className="text-muted-foreground">
                    {detailAlert.source || "—"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Effective / deadline</p>
                  <p className="text-muted-foreground">
                    {detailAlert.effectiveDate
                      ? new Date(detailAlert.effectiveDate).toLocaleDateString()
                      : "—"}
                    {" → "}
                    {detailAlert.deadline
                      ? new Date(detailAlert.deadline).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium">Summary</p>
                <p className="text-sm text-muted-foreground">
                  {detailAlert.summary}
                </p>
              </div>
              {detailAlert.actionRequired && (
                <div className="rounded-md border-l-4 border-warning bg-warning/10 p-3">
                  <p className="text-xs font-semibold uppercase text-warning">
                    Action required
                  </p>
                  <p className="mt-1 text-sm">{detailAlert.actionRequired}</p>
                </div>
              )}

              {detailAlert.status === "Sent" && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Results</p>
                  {(() => {
                    const total = detailAlert.recipients.length || 1;
                    const delivered = detailAlert.recipients.filter(
                      (r) => r.delivered,
                    ).length;
                    return (
                      <div>
                        <div className="flex justify-between text-xs">
                          <span>Delivered</span>
                          <span>
                            {delivered} / {detailAlert.recipients.length}
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
                    Open reflects a real in-portal view; click tracking isn't
                    available — no email provider with that is connected yet.
                  </div>
                </div>
              )}

              <div>
                <p className="mb-1 text-sm font-medium">
                  Recipients ({detailAlert.recipients.length})
                </p>
                <ScrollArea className="h-56 rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Audience</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Delivered</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailAlert.recipients.map((r, i) => (
                        <TableRow key={r.sourceId ?? r.clientId ?? i}>
                          <TableCell className="text-sm">
                            {r.clientName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {audienceLabels[r.sourceType ?? "Client"]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {r.email}
                          </TableCell>
                          <TableCell>
                            {detailAlert.status === "Sent" ? (
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
                {(detailCampaign.status === "Draft" ||
                  detailCampaign.status === "Scheduled") && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={sendNowMut.isPending}
                    onClick={() => sendNowMut.mutate()}
                  >
                    Send now
                  </Button>
                )}
                {(detailCampaign.status === "Draft" ||
                  detailCampaign.status === "Scheduled") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditCampaign(detailCampaign)}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit
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
                <Card>
                  <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
                    <p className="text-sm text-muted-foreground">
                      Scheduled to send on{" "}
                      <strong>
                        {new Date(detailCampaign.scheduledAt!).toLocaleString()}
                      </strong>
                      .
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={unscheduleMut.isPending}
                      onClick={() => unscheduleMut.mutate()}
                    >
                      Cancel schedule
                    </Button>
                  </CardContent>
                </Card>
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
                    Open and click tracking aren't available — no email provider
                    with tracking is connected yet.
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
                        <TableHead>Recipient</TableHead>
                        <TableHead>Audience</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Delivered</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailCampaign.recipients.map((r, i) => (
                        <TableRow key={r.sourceId ?? r.clientId ?? i}>
                          <TableCell className="text-sm">
                            {r.clientName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {audienceLabels[r.sourceType ?? "Client"]}
                            </Badge>
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
