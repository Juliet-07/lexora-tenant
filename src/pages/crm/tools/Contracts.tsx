import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
import { Progress } from "@/components/ui/progress";
import {
  Bell,
  RefreshCw,
  Plus,
  Upload,
  FileUp,
  Download,
  Pencil,
  Trash2,
  Eye,
  Image as ImageIcon,
  X,
  Sparkles,
  Folder,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CommentThread } from "@/components/crm/CommentThread";
import { RichTextEditor } from "@/components/RichTextEditor";
import { fetchMandates } from "@/lib/crm/mandates-api";
import {
  fetchClients,
  displayName,
  type ApiClient,
} from "@/lib/client/clients-api";
import {
  fetchContracts,
  fetchExpiringContracts,
  fetchObligationsDue,
  createContract,
  initiateRenewal,
  toggleAutoRenew,
  setObligationDone,
  fetchAvailableTemplates,
  fetchTemplateFolders,
  fetchMyLetterhead,
  uploadLetterhead,
  deleteLetterhead,
  generateContractFromTemplate,
  CONTRACT_STAGES,
  type Contract,
  type ContractType,
  type ContractStage,
  type ObligationType,
  type AvailableTemplate,
} from "@/lib/crm/tools-api";

const money = (n: number, c = "USD") =>
  (n ?? 0).toLocaleString(undefined, {
    style: "currency",
    currency: c,
    maximumFractionDigits: 0,
  });
const daysTo = (d: string) =>
  Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
const today = () => new Date().toISOString().slice(0, 10);

const CONTRACT_TYPES: ContractType[] = [
  "MSA",
  "SOW",
  "NDA",
  "Lease",
  "Supplier",
];
const OBLIGATION_TYPES: ObligationType[] = [
  "Deliverable",
  "Notice period",
  "Payment",
  "Covenant",
];

export default function Contracts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const [stageFilter, setStageFilter] = useState("all");

  const { data: list = [] } = useQuery({
    queryKey: ["contracts"],
    queryFn: fetchContracts,
  });
  const { data: expiring = [] } = useQuery({
    queryKey: ["contracts-expiring"],
    queryFn: () => fetchExpiringContracts(90),
  });
  const { data: obligationsDue = [] } = useQuery({
    queryKey: ["obligations-due"],
    queryFn: () => fetchObligationsDue(90),
  });
  const { data: mandates = [] } = useQuery({
    queryKey: ["mandates"],
    queryFn: fetchMandates,
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-for-contracts"],
    queryFn: fetchClients,
  });
  const { data: availableTemplates = [] } = useQuery({
    queryKey: ["available-templates"],
    queryFn: fetchAvailableTemplates,
  });
  const { data: templateFolders = [] } = useQuery({
    queryKey: ["template-folders"],
    queryFn: fetchTemplateFolders,
  });
  const uncategorizedTemplates = availableTemplates.filter((t) => !t.folderId);
  const { data: letterhead } = useQuery({
    queryKey: ["letterhead"],
    queryFn: fetchMyLetterhead,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["contracts"] });
    queryClient.invalidateQueries({ queryKey: ["contracts-expiring"] });
    queryClient.invalidateQueries({ queryKey: ["obligations-due"] });
  };

  const filtered = list.filter(
    (c) => stageFilter === "all" || c.stage === stageFilter,
  );

  // ── New contract ─────────────────────────────────────────
  const [openNew, setOpenNew] = useState(false);
  const emptyForm = {
    title: "",
    partyMode: "client" as "client" | "external",
    clientId: "",
    mandateId: "",
    counterparty: "",
    counterpartyEmail: "",
    type: "MSA" as ContractType,
    value: 0,
    currency: "USD",
    expiresOn: today(),
    content: "",
  };
  const [form, setForm] = useState(emptyForm);
  const createMut = useMutation({
    mutationFn: () =>
      createContract({
        title: form.title,
        type: form.type,
        value: form.value,
        currency: form.currency,
        expiresOn: form.expiresOn,
        content: form.content,
        ...(form.partyMode === "client"
          ? { clientId: form.clientId, mandateId: form.mandateId || undefined }
          : {
              counterparty: form.counterparty,
              counterpartyEmail: form.counterpartyEmail,
            }),
      }),
    onSuccess: (c) => {
      invalidate();
      setOpenNew(false);
      setForm(emptyForm);
      navigate(`/crm/contracts/${c._id}`);
      toast({ title: "Contract created" });
    },
    onError: onErr("Failed to create contract"),
  });

  // ── Lifecycle actions ────────────────────────────────────
  const renewalMut = useMutation({
    mutationFn: (id: string) => initiateRenewal(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Renewal initiated" });
    },
    onError: onErr("Failed to initiate renewal"),
  });
  const autoRenewMut = useMutation({
    mutationFn: (id: string) => toggleAutoRenew(id),
    onSuccess: () => invalidate(),
    onError: onErr("Failed to toggle auto-renew"),
  });
  // Used by the Obligations-due list view (marks an obligation done
  // directly from that cross-contract list, distinct from any
  // single contract's own detail page).
  const setDoneMut = useMutation({
    mutationFn: (vars: { id: string; obligationId: string; done: boolean }) =>
      setObligationDone(vars.id, vars.obligationId, vars.done),
    onSuccess: () => invalidate(),
    onError: onErr("Failed to update obligation"),
  });

  // ── Templates ─────────────────────────────────────────────
  // Template creation was retired for tenants — every template now
  // comes from the super admin's folder-organized library, read-only
  // here. previewTemplate is the only remaining piece of state this
  // section needs.
  const [previewTemplate, setPreviewTemplate] =
    useState<AvailableTemplate | null>(null);

  // ── Letterhead ────────────────────────────────────────────
  const uploadLetterheadMut = useMutation({
    mutationFn: (file: File) => uploadLetterhead(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["letterhead"] });
      toast({ title: "Letterhead saved" });
    },
    onError: onErr("Failed to upload letterhead"),
  });
  const deleteLetterheadMut = useMutation({
    mutationFn: () => deleteLetterhead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["letterhead"] });
      toast({ title: "Letterhead removed" });
    },
    onError: onErr("Failed to remove letterhead"),
  });

  // ── Generate from template ─────────────────────────────────
  const [openGenerateDialog, setOpenGenerateDialog] = useState(false);
  const emptyGenerateDraft = {
    templateId: "",
    templateSource: "tenant" as "platform" | "tenant",
    title: "",
    type: "MSA" as ContractType,
    partyMode: "client" as "client" | "external",
    clientId: "",
    mandateId: "",
    counterparty: "",
    counterpartyEmail: "",
    value: "",
    currency: "USD",
    expiresOn: "",
  };
  const [generateDraft, setGenerateDraft] = useState(emptyGenerateDraft);

  const openGenerate = () => {
    setGenerateDraft(emptyGenerateDraft);
    setOpenGenerateDialog(true);
  };
  const generateMut = useMutation({
    mutationFn: () =>
      generateContractFromTemplate({
        templateId: generateDraft.templateId,
        templateSource: generateDraft.templateSource,
        title: generateDraft.title,
        type: generateDraft.type,
        value: generateDraft.value ? Number(generateDraft.value) : undefined,
        currency: generateDraft.currency,
        expiresOn: generateDraft.expiresOn,
        ...(generateDraft.partyMode === "client"
          ? {
              clientId: generateDraft.clientId,
              mandateId: generateDraft.mandateId || undefined,
            }
          : {
              counterparty: generateDraft.counterparty,
              counterpartyEmail: generateDraft.counterpartyEmail,
            }),
      }),
    onSuccess: (c) => {
      invalidate();
      setOpenGenerateDialog(false);
      navigate(`/crm/contracts/${c._id}`);
      toast({
        title: "Contract generated",
        description: "Review the content, then send it for signature.",
      });
    },
    onError: onErr("Failed to generate contract"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Contract Management</h1>
          <p className="text-sm text-muted-foreground">
            Draft → review → negotiation → execution → active → renewal, with
            obligation and expiry tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openGenerate}>
            <Sparkles className="mr-2 h-4 w-4" /> Generate from template
          </Button>
          <Button onClick={() => setOpenNew(true)}>
            <Plus className="mr-2 h-4 w-4" /> New contract
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "Total contracts", v: String(list.length) },
          {
            l: "Active",
            v: String(list.filter((c) => c.stage === "Active").length),
          },
          { l: "Expiring ≤ 90 days", v: String(expiring.length) },
          { l: "Obligations due", v: String(obligationsDue.length) },
        ].map((k) => (
          <Card key={k.l}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.l}</p>
              <p className="mt-1 text-xl font-bold">{k.v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="register">
        <TabsList className="flex-wrap">
          <TabsTrigger value="register">Register</TabsTrigger>
          <TabsTrigger value="lifecycle">Lifecycle board</TabsTrigger>
          <TabsTrigger value="obligations">Obligations</TabsTrigger>
          <TabsTrigger value="renewals">Renewals &amp; expiry</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-3 pt-4">
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {CONTRACT_STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow
                      key={c._id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/crm/contracts/${c._id}`)}
                    >
                      <TableCell>
                        <p className="text-sm font-medium">{c.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.counterparty}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{c.stage}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(c.expiresOn).toLocaleDateString()}
                        {daysTo(c.expiresOn) <= 90 &&
                          daysTo(c.expiresOn) > 0 && (
                            <Badge className="ml-2 bg-warning/10 text-warning">
                              {daysTo(c.expiresOn)}d
                            </Badge>
                          )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.owner || "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {money(c.value, c.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filtered.length && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No contracts yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lifecycle" className="pt-4">
          <div className="grid gap-3 md:grid-cols-4">
            {CONTRACT_STAGES.map((s) => (
              <Card key={s}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                    {s} ({list.filter((c) => c.stage === s).length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {list
                    .filter((c) => c.stage === s)
                    .map((c) => (
                      <button
                        key={c._id}
                        onClick={() => navigate(`/crm/contracts/${c._id}`)}
                        className="w-full rounded border p-2 text-left hover:bg-muted"
                      >
                        <p className="text-sm font-medium">{c.counterparty}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.type} · {money(c.value, c.currency)}
                        </p>
                      </button>
                    ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="obligations" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Obligation</TableHead>
                    <TableHead>Contract</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Reminder</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {obligationsDue.map((o) => (
                    <TableRow key={`${o.contractId}-${o._id}`}>
                      <TableCell className="text-sm">{o.label}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {o.contractTitle}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{o.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(o.due).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <Bell className="mr-1 inline h-3 w-3" />
                        {o.leadDays} days before
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setDoneMut.mutate({
                              id: o.contractId,
                              obligationId: o._id,
                              done: true,
                            })
                          }
                        >
                          Mark done
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!obligationsDue.length && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No obligations due.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="renewals" className="pt-4">
          <div className="space-y-3">
            {expiring.map((c) => (
              <Card key={c._id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Expires {new Date(c.expiresOn).toLocaleDateString()} ·{" "}
                        {c.autoRenew ? "Auto-renew ON" : "Manual renewal"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => autoRenewMut.mutate(c._id)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {c.autoRenew
                          ? "Disable auto-renew"
                          : "Enable auto-renew"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => renewalMut.mutate(c._id)}
                      >
                        Start renewal
                      </Button>
                    </div>
                  </div>
                  <Progress
                    value={Math.max(0, 100 - (daysTo(c.expiresOn) / 90) * 100)}
                  />
                </CardContent>
              </Card>
            ))}
            {!expiring.length && (
              <p className="text-sm text-muted-foreground">
                No contracts expiring within 90 days.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="pt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Letterhead</CardTitle>
              <p className="text-xs text-muted-foreground">
                Used at the top of contract PDFs generated from your templates.
              </p>
            </CardHeader>
            <CardContent>
              {letterhead ? (
                <div className="flex items-center gap-4">
                  <img
                    src={letterhead.imageUrl}
                    alt="Letterhead"
                    className="h-20 rounded border object-contain bg-muted/30 p-2"
                  />
                  <div className="flex gap-2">
                    <label className="cursor-pointer">
                      <Button size="sm" variant="outline" asChild>
                        <span>
                          <Upload className="mr-2 h-4 w-4" /> Replace
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadLetterheadMut.mutate(file);
                        }}
                      />
                    </label>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => deleteLetterheadMut.mutate()}
                    >
                      <X className="mr-2 h-4 w-4" /> Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Button size="sm" variant="outline" asChild>
                    <span>
                      <ImageIcon className="mr-2 h-4 w-4" /> Upload letterhead
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadLetterheadMut.mutate(file);
                    }}
                  />
                </label>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Available templates — published by your platform, organized into
                folders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {templateFolders.map((folder) => {
                const inFolder = availableTemplates.filter(
                  (t) => t.folderId === folder._id,
                );
                if (!inFolder.length) return null;
                return (
                  <div key={folder._id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <h4 className="text-sm font-semibold">{folder.name}</h4>
                      <Badge variant="outline" className="text-[10px]">
                        {inFolder.length}
                      </Badge>
                    </div>
                    <div className="overflow-hidden rounded-md border">
                      <Table>
                        <TableBody>
                          {inFolder.map((t) => (
                            <TableRow key={t._id}>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  {t.sourceType === "uploaded" && (
                                    <FileUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  )}
                                  <p className="text-sm font-medium">
                                    {t.title}
                                  </p>
                                </div>
                                <p className="line-clamp-1 text-xs text-muted-foreground">
                                  {t.description}
                                </p>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {t.jurisdiction || "—"}
                              </TableCell>
                              <TableCell className="w-10">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setPreviewTemplate(t)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}

              {uncategorizedTemplates.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold">Uncategorized</h4>
                    <Badge variant="outline" className="text-[10px]">
                      {uncategorizedTemplates.length}
                    </Badge>
                  </div>
                  <div className="overflow-hidden rounded-md border">
                    <Table>
                      <TableBody>
                        {uncategorizedTemplates.map((t) => (
                          <TableRow key={t._id}>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {t.sourceType === "uploaded" && (
                                  <FileUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                )}
                                <p className="text-sm font-medium">{t.title}</p>
                              </div>
                              <p className="line-clamp-1 text-xs text-muted-foreground">
                                {t.description}
                              </p>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {t.jurisdiction || "—"}
                            </TableCell>
                            <TableCell className="w-10">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setPreviewTemplate(t)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {!availableTemplates.length && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No templates published yet — check back once your platform
                  publishes some.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New contract */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New contract</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Who is this contract for?</Label>
              <div className="mt-1 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={form.partyMode === "client" ? "default" : "outline"}
                  onClick={() => setForm({ ...form, partyMode: "client" })}
                >
                  Client
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    form.partyMode === "external" ? "default" : "outline"
                  }
                  onClick={() => setForm({ ...form, partyMode: "external" })}
                >
                  Vendor / consultant
                </Button>
              </div>
            </div>
            {form.partyMode === "client" ? (
              <>
                <div>
                  <Label>Client</Label>
                  <Select
                    value={form.clientId}
                    onValueChange={(v) => setForm({ ...form, clientId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a registered client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {displayName(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Emailed to this client and also appears on their
                    client-portal dashboard, where they can sign or leave
                    feedback.
                  </p>
                </div>
                <div>
                  <Label>Linked mandate (optional)</Label>
                  <Select
                    value={form.mandateId || "none"}
                    onValueChange={(v) =>
                      setForm({ ...form, mandateId: v === "none" ? "" : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {mandates.map((m: any) => (
                        <SelectItem key={m._id} value={m._id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={form.counterparty}
                    onChange={(e) =>
                      setForm({ ...form, counterparty: e.target.value })
                    }
                    placeholder="e.g. Jane Doe Consulting"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.counterpartyEmail}
                    onChange={(e) =>
                      setForm({ ...form, counterpartyEmail: e.target.value })
                    }
                  />
                </div>
                <p className="col-span-2 text-xs text-muted-foreground">
                  Sent via a real, public signing link — no client-portal
                  account needed.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm({ ...form, type: v as ContractType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Expires on</Label>
                <Input
                  type="date"
                  value={form.expiresOn}
                  onChange={(e) =>
                    setForm({ ...form, expiresOn: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Value</Label>
                <Input
                  type="number"
                  value={form.value}
                  onChange={(e) =>
                    setForm({ ...form, value: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Input
                  value={form.currency}
                  onChange={(e) =>
                    setForm({ ...form, currency: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Content</Label>
              <p className="mb-1 text-xs text-muted-foreground">
                Type the contract text directly — no template needed. You can
                also generate from a template instead, using the button next to
                "New contract".
              </p>
              <RichTextEditor
                value={form.content}
                onChange={(html) => setForm({ ...form, content: html })}
                minHeight={160}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !form.title ||
                (form.partyMode === "client"
                  ? !form.clientId
                  : !form.counterparty || !form.counterpartyEmail) ||
                createMut.isPending
              }
              onClick={() => createMut.mutate()}
            >
              Create contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate from template */}
      <Dialog open={openGenerateDialog} onOpenChange={setOpenGenerateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate contract from template</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Template</Label>
              <Select
                value={generateDraft.templateId}
                onValueChange={(v) => {
                  const t = availableTemplates.find((at) => at._id === v);
                  setGenerateDraft({
                    ...generateDraft,
                    templateId: v,
                    templateSource: t?.source ?? "tenant",
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick a template" />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates.map((t) => (
                    <SelectItem key={`${t.source}-${t._id}`} value={t._id}>
                      {t.sourceType === "uploaded" ? "📄 " : ""}
                      {t.title}{" "}
                      {t.source === "platform" ? "(Platform)" : "(My own)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!availableTemplates.length && (
                <p className="mt-1 text-xs text-muted-foreground">
                  No templates yet — create or upload one on the Templates tab
                  first.
                </p>
              )}
            </div>
            <div>
              <Label>Who is this contract for?</Label>
              <div className="mt-1 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={
                    generateDraft.partyMode === "client" ? "default" : "outline"
                  }
                  onClick={() =>
                    setGenerateDraft({ ...generateDraft, partyMode: "client" })
                  }
                >
                  Client
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    generateDraft.partyMode === "external"
                      ? "default"
                      : "outline"
                  }
                  onClick={() =>
                    setGenerateDraft({
                      ...generateDraft,
                      partyMode: "external",
                    })
                  }
                >
                  Vendor / consultant
                </Button>
              </div>
            </div>
            {generateDraft.partyMode === "client" ? (
              <>
                <div>
                  <Label>Client</Label>
                  <Select
                    value={generateDraft.clientId}
                    onValueChange={(v) =>
                      setGenerateDraft({ ...generateDraft, clientId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a registered client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {displayName(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Emailed to this client and also appears on their
                    client-portal dashboard.
                  </p>
                </div>
                <div>
                  <Label>Linked mandate (optional)</Label>
                  <Select
                    value={generateDraft.mandateId || "none"}
                    onValueChange={(v) =>
                      setGenerateDraft({
                        ...generateDraft,
                        mandateId: v === "none" ? "" : v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {mandates.map((m: any) => (
                        <SelectItem key={m._id} value={m._id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={generateDraft.counterparty}
                    onChange={(e) =>
                      setGenerateDraft({
                        ...generateDraft,
                        counterparty: e.target.value,
                      })
                    }
                    placeholder="e.g. Jane Doe Consulting"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={generateDraft.counterpartyEmail}
                    onChange={(e) =>
                      setGenerateDraft({
                        ...generateDraft,
                        counterpartyEmail: e.target.value,
                      })
                    }
                  />
                </div>
                <p className="col-span-2 text-xs text-muted-foreground">
                  Sent via a real, public signing link — no client-portal
                  account needed.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Title</Label>
                <Input
                  value={generateDraft.title}
                  onChange={(e) =>
                    setGenerateDraft({
                      ...generateDraft,
                      title: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={generateDraft.type}
                  onValueChange={(v) =>
                    setGenerateDraft({
                      ...generateDraft,
                      type: v as ContractType,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Value</Label>
                <Input
                  type="number"
                  value={generateDraft.value}
                  onChange={(e) =>
                    setGenerateDraft({
                      ...generateDraft,
                      value: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Input
                  value={generateDraft.currency}
                  onChange={(e) =>
                    setGenerateDraft({
                      ...generateDraft,
                      currency: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Expires on</Label>
                <Input
                  type="date"
                  value={generateDraft.expiresOn}
                  onChange={(e) =>
                    setGenerateDraft({
                      ...generateDraft,
                      expiresOn: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !generateDraft.templateId ||
                !generateDraft.title.trim() ||
                (generateDraft.partyMode === "client"
                  ? !generateDraft.clientId
                  : !generateDraft.counterparty.trim() ||
                    !generateDraft.counterpartyEmail.trim()) ||
                !generateDraft.expiresOn ||
                generateMut.isPending
              }
              onClick={() => generateMut.mutate()}
            >
              <Sparkles className="mr-2 h-4 w-4" /> Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview a template (authored, or extracted from an uploaded Word document) */}
      <Dialog
        open={!!previewTemplate}
        onOpenChange={(o) => !o && setPreviewTemplate(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.title}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-3">
              {previewTemplate.sourceType === "uploaded" && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileUp className="h-3.5 w-3.5" /> From uploaded Word document
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                {previewTemplate.description}
              </p>
              <div
                className="rounded-md border p-4 text-sm"
                dangerouslySetInnerHTML={{
                  __html:
                    previewTemplate.content ||
                    "<p class='text-muted-foreground'>No content</p>",
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
