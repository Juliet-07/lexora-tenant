import { useState } from "react";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  FileSignature,
  Bell,
  RefreshCw,
  ArrowRight,
  Plus,
  Upload,
  FileUp,
  Download,
  Pencil,
  Trash2,
  Eye,
  Image as ImageIcon,
  X,
  Send,
  Sparkles,
  MessageSquare,
  PenTool,
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
  advanceContractStage,
  executeContract,
  initiateRenewal,
  toggleAutoRenew,
  addNegotiationRound,
  addAmendment,
  addObligation,
  setObligationDone,
  fetchAvailableTemplates,
  fetchTenantTemplates,
  createTenantTemplate,
  updateTenantTemplate,
  deleteTenantTemplate,
  uploadTenantTemplate,
  replaceTenantTemplateFile,
  fetchMyLetterhead,
  uploadLetterhead,
  deleteLetterhead,
  generateContractFromTemplate,
  sendContractForSignature,
  respondToContractComment,
  editContractBody,
  countersignContract,
  sendSignedContractCopy,
  downloadContractPdf,
  previewContractPdf,
  CONTRACT_STAGES,
  type Contract,
  type ContractType,
  type ContractStage,
  type ObligationType,
  type AvailableTemplate,
  type TenantContractTemplate,
  type SignableContract,
} from "@/lib/crm/tools-api";

const WORD_ACCEPT =
  ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const money = (n: number, c = "USD") =>
  (n ?? 0).toLocaleString(undefined, {
    style: "currency",
    currency: c,
    maximumFractionDigits: 0,
  });
const today = () => new Date().toISOString().slice(0, 10);
const daysTo = (d: string) =>
  Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const [stageFilter, setStageFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
  const { data: myTemplates = [] } = useQuery({
    queryKey: ["my-templates"],
    queryFn: fetchTenantTemplates,
  });
  const { data: letterhead } = useQuery({
    queryKey: ["letterhead"],
    queryFn: fetchMyLetterhead,
  });

  const selected = list.find((c) => c._id === selectedId) ?? null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["contracts"] });
    queryClient.invalidateQueries({ queryKey: ["contracts-expiring"] });
    queryClient.invalidateQueries({ queryKey: ["obligations-due"] });
  };
  const invalidateTemplates = () => {
    queryClient.invalidateQueries({ queryKey: ["available-templates"] });
    queryClient.invalidateQueries({ queryKey: ["my-templates"] });
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
      setSelectedId(c._id);
      toast({ title: "Contract created" });
    },
    onError: onErr("Failed to create contract"),
  });

  // ── Lifecycle actions ────────────────────────────────────
  const advanceMut = useMutation({
    mutationFn: (id: string) => advanceContractStage(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Stage advanced" });
    },
    onError: onErr("Failed to advance stage"),
  });
  const [executeTarget, setExecuteTarget] = useState<string | null>(null);
  const [executeForm, setExecuteForm] = useState({
    executedOn: today(),
    effectiveOn: today(),
  });
  const executeMut = useMutation({
    mutationFn: () => executeContract(executeTarget!, executeForm),
    onSuccess: () => {
      invalidate();
      setExecuteTarget(null);
      toast({
        title: "Executed",
        description: "Signature captured — contract is now Active.",
      });
    },
    onError: onErr("Failed to execute contract"),
  });
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

  // ── Negotiation round ────────────────────────────────────
  const [openRound, setOpenRound] = useState(false);
  const [roundForm, setRoundForm] = useState({
    by: "Lexora",
    at: today(),
    summary: "",
  });
  const addRoundMut = useMutation({
    mutationFn: (id: string) => addNegotiationRound(id, roundForm),
    onSuccess: () => {
      invalidate();
      setOpenRound(false);
      setRoundForm({ by: "Lexora", at: today(), summary: "" });
      toast({ title: "Negotiation round added" });
    },
    onError: onErr("Failed to add round"),
  });

  // ── Amendment ─────────────────────────────────────────────
  const [openAmendment, setOpenAmendment] = useState(false);
  const [amendmentSummary, setAmendmentSummary] = useState("");
  const [amendmentEditBody, setAmendmentEditBody] = useState(false);
  const [amendmentBodyDraft, setAmendmentBodyDraft] = useState("");
  const addAmendmentMut = useMutation({
    mutationFn: (id: string) =>
      addAmendment(id, {
        summary: amendmentSummary,
        newBody: amendmentEditBody ? amendmentBodyDraft : undefined,
      }),
    onSuccess: () => {
      invalidate();
      setOpenAmendment(false);
      setAmendmentSummary("");
      setAmendmentEditBody(false);
      setAmendmentBodyDraft("");
      toast({ title: "Amendment added" });
    },
    onError: onErr("Failed to add amendment"),
  });

  // ── Obligations ───────────────────────────────────────────
  const [openObligation, setOpenObligation] = useState(false);
  const [obligationForm, setObligationForm] = useState({
    label: "",
    due: today(),
    type: "Deliverable" as ObligationType,
    leadDays: 14,
  });
  const addObligationMut = useMutation({
    mutationFn: (id: string) => addObligation(id, obligationForm),
    onSuccess: () => {
      invalidate();
      setOpenObligation(false);
      setObligationForm({
        label: "",
        due: today(),
        type: "Deliverable",
        leadDays: 14,
      });
      toast({ title: "Obligation added" });
    },
    onError: onErr("Failed to add obligation"),
  });
  const setDoneMut = useMutation({
    mutationFn: (vars: { id: string; obligationId: string; done: boolean }) =>
      setObligationDone(vars.id, vars.obligationId, vars.done),
    onSuccess: () => invalidate(),
    onError: onErr("Failed to update obligation"),
  });

  // ── Templates ─────────────────────────────────────────────
  const [openTemplateDialog, setOpenTemplateDialog] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null,
  );
  const [templateDraft, setTemplateDraft] = useState({
    title: "",
    type: "MSA" as ContractType,
    jurisdiction: "",
    description: "",
    content: "",
  });
  const [previewTemplate, setPreviewTemplate] =
    useState<AvailableTemplate | null>(null);
  const [pendingDeleteTemplate, setPendingDeleteTemplate] =
    useState<TenantContractTemplate | null>(null);

  const openCreateTemplate = () => {
    setEditingTemplateId(null);
    setTemplateDraft({
      title: "",
      type: "MSA",
      jurisdiction: "",
      description: "",
      content: "",
    });
    setOpenTemplateDialog(true);
  };
  const openEditTemplate = (t: TenantContractTemplate) => {
    setEditingTemplateId(t._id);
    setTemplateDraft({
      title: t.title,
      type: t.type,
      jurisdiction: t.jurisdiction,
      description: t.description,
      content: t.content,
    });
    setOpenTemplateDialog(true);
  };

  const saveTemplateMut = useMutation({
    mutationFn: () =>
      editingTemplateId
        ? updateTenantTemplate(editingTemplateId, templateDraft)
        : createTenantTemplate(templateDraft),
    onSuccess: () => {
      invalidateTemplates();
      setOpenTemplateDialog(false);
      toast({
        title: editingTemplateId ? "Template updated" : "Template created",
      });
    },
    onError: onErr("Failed to save template"),
  });
  const deleteTemplateMut = useMutation({
    mutationFn: (id: string) => deleteTenantTemplate(id),
    onSuccess: () => {
      invalidateTemplates();
      setPendingDeleteTemplate(null);
      toast({ title: "Template deleted" });
    },
    onError: onErr("Failed to delete template"),
  });

  // ── Upload template — Word documents only ────────────────
  const [openUploadTemplate, setOpenUploadTemplate] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadMeta, setUploadMeta] = useState({
    title: "",
    type: "MSA" as ContractType,
    jurisdiction: "",
    description: "",
  });
  const [replaceFileTarget, setReplaceFileTarget] =
    useState<TenantContractTemplate | null>(null);

  const openUpload = () => {
    setUploadFile(null);
    setUploadMeta({
      title: "",
      type: "MSA",
      jurisdiction: "",
      description: "",
    });
    setOpenUploadTemplate(true);
  };
  const uploadTemplateMut = useMutation({
    mutationFn: () => uploadTenantTemplate(uploadFile as File, uploadMeta),
    onSuccess: () => {
      invalidateTemplates();
      setOpenUploadTemplate(false);
      toast({
        title: "Template uploaded",
        description:
          "Its content was extracted automatically and can be previewed.",
      });
    },
    onError: onErr("Failed to upload template"),
  });
  const replaceFileMut = useMutation({
    mutationFn: (file: File) =>
      replaceTenantTemplateFile(replaceFileTarget!._id, file),
    onSuccess: () => {
      invalidateTemplates();
      setReplaceFileTarget(null);
      toast({ title: "File replaced" });
    },
    onError: onErr("Failed to replace file"),
  });

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
      setSelectedId(c._id);
      toast({
        title: "Contract generated",
        description: "Review the content, then send it for signature.",
      });
    },
    onError: onErr("Failed to generate contract"),
  });

  // ── E-signature workflow ──────────────────────────────────
  const [respondText, setRespondText] = useState("");
  const [editingBody, setEditingBody] = useState(false);
  const [bodyDraft, setBodyDraft] = useState("");

  const sendForSignatureMut = useMutation({
    mutationFn: (id: string) => sendContractForSignature(id),
    onSuccess: () => {
      invalidate();
      toast({
        title: "Sent for signature",
        description: "A PDF of the contract was attached to the email.",
      });
    },
    onError: onErr("Failed to send for signature"),
  });
  const respondMut = useMutation({
    mutationFn: (id: string) => respondToContractComment(id, respondText),
    onSuccess: () => {
      invalidate();
      setRespondText("");
      toast({ title: "Reply sent" });
    },
    onError: onErr("Failed to send reply"),
  });
  const editBodyMut = useMutation({
    mutationFn: (id: string) =>
      editContractBody(id, { renderedBody: bodyDraft }),
    onSuccess: () => {
      invalidate();
      setEditingBody(false);
      toast({ title: "Content updated" });
    },
    onError: onErr("Failed to update content"),
  });
  const [countersignName, setCountersignName] = useState("");
  const countersignMut = useMutation({
    mutationFn: (id: string) =>
      countersignContract(id, { signerName: countersignName }),
    onSuccess: () => {
      invalidate();
      setCountersignName("");
      toast({ title: "Countersigned — contract is now fully executed" });
    },
    onError: onErr("Failed to countersign"),
  });
  const sendSignedCopyMut = useMutation({
    mutationFn: (id: string) => sendSignedContractCopy(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Signed copy emailed" });
    },
    onError: onErr("Failed to send signed copy"),
  });
  const downloadPdfMut = useMutation({
    mutationFn: (id: string) => downloadContractPdf(id),
    onError: onErr("Failed to download PDF"),
  });
  const previewPdfMut = useMutation({
    mutationFn: (id: string) => previewContractPdf(id),
    onError: onErr("Failed to open preview"),
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
                      onClick={() => setSelectedId(c._id)}
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
                        onClick={() => setSelectedId(c._id)}
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

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={openUpload}>
              <Upload className="mr-2 h-4 w-4" /> Upload template
            </Button>
            <Button size="sm" onClick={openCreateTemplate}>
              <Plus className="mr-2 h-4 w-4" /> New template
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Available templates — platform-published and my own
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Jurisdiction</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableTemplates.map((t) => (
                    <TableRow key={`${t.source}-${t._id}`}>
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
                      <TableCell>
                        <Badge
                          variant={
                            t.source === "platform" ? "outline" : "secondary"
                          }
                        >
                          {t.source === "platform" ? "Platform" : "My own"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.jurisdiction || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPreviewTemplate(t)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {t.sourceType === "uploaded" &&
                            t.fileUrl &&
                            t.source === "tenant" && (
                              <Button size="sm" variant="ghost" asChild>
                                <a
                                  href={t.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          {t.source === "tenant" && (
                            <>
                              {t.sourceType === "uploaded" ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    setReplaceFileTarget(
                                      myTemplates.find(
                                        (m) => m._id === t._id,
                                      ) ?? null,
                                    )
                                  }
                                >
                                  <Upload className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    openEditTemplate(
                                      myTemplates.find(
                                        (m) => m._id === t._id,
                                      ) as TenantContractTemplate,
                                    )
                                  }
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() =>
                                  setPendingDeleteTemplate(
                                    myTemplates.find((m) => m._id === t._id) ??
                                      null,
                                  )
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!availableTemplates.length && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No templates yet — create your own or check back once
                        the platform publishes some.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Contract detail sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {selected.ref} · {selected.counterparty}
                  {selected.mandateName ? ` · ${selected.mandateName}` : ""}
                </p>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{selected.stage}</Badge>
                  {selected.stage !== "Expiry / Termination" && (
                    <Button
                      size="sm"
                      onClick={() => advanceMut.mutate(selected._id)}
                    >
                      Advance stage <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                  {selected.stage === "Execution" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setExecuteTarget(selected._id);
                        setExecuteForm({
                          executedOn: today(),
                          effectiveOn: today(),
                        });
                      }}
                    >
                      <FileSignature className="mr-2 h-4 w-4" /> Capture
                      signature
                    </Button>
                  )}
                </div>

                {selected.renderedBody && (
                  <Card>
                    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <PenTool className="h-4 w-4" /> Signature workflow
                        <Badge
                          variant={
                            selected.signatureStatus === "countersigned"
                              ? "default"
                              : selected.signatureStatus === "signed"
                                ? "secondary"
                                : selected.signatureStatus === "declined"
                                  ? "destructive"
                                  : "outline"
                          }
                        >
                          {selected.signatureStatus.replace("_", " ")}
                        </Badge>
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={previewPdfMut.isPending}
                          onClick={() => previewPdfMut.mutate(selected._id)}
                        >
                          <Eye className="mr-2 h-4 w-4" /> Preview
                        </Button>
                        {(selected.signatureStatus === "not_sent" ||
                          selected.signatureStatus === "sent") && (
                          <Button
                            size="sm"
                            disabled={sendForSignatureMut.isPending}
                            onClick={() =>
                              sendForSignatureMut.mutate(selected._id)
                            }
                          >
                            <Send className="mr-2 h-4 w-4" />
                            {selected.signatureStatus === "sent"
                              ? "Resend"
                              : "Send for signature"}
                          </Button>
                        )}
                        {selected.signatureStatus === "countersigned" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={downloadPdfMut.isPending}
                              onClick={() =>
                                downloadPdfMut.mutate(selected._id)
                              }
                            >
                              <Download className="mr-2 h-4 w-4" /> PDF
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={sendSignedCopyMut.isPending}
                              onClick={() =>
                                sendSignedCopyMut.mutate(selected._id)
                              }
                            >
                              <Send className="mr-2 h-4 w-4" />
                              {selected.signedCopySentAt
                                ? "Resend signed copy"
                                : "Email signed copy"}
                            </Button>
                          </>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {(selected.signatureStatus === "not_sent" ||
                        selected.signatureStatus === "sent") && (
                        <p className="text-xs text-muted-foreground">
                          Sending emails a real PDF of this content to the
                          counterparty, alongside the signing link.
                        </p>
                      )}
                      {(selected.signatureStatus === "not_sent" ||
                        selected.signatureStatus === "sent") && (
                        <div className="space-y-2">
                          {editingBody ? (
                            <>
                              <RichTextEditor
                                value={bodyDraft}
                                onChange={setBodyDraft}
                                minHeight={140}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  disabled={editBodyMut.isPending}
                                  onClick={() =>
                                    editBodyMut.mutate(selected._id)
                                  }
                                >
                                  Save changes
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingBody(false)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div
                                className="rounded-md border p-3"
                                dangerouslySetInnerHTML={{
                                  __html: selected.renderedBody,
                                }}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setBodyDraft(selected.renderedBody);
                                  setEditingBody(true);
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" /> Edit content
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                      {selected.signatureStatus !== "not_sent" &&
                        selected.signatureStatus !== "sent" && (
                          <div
                            className="rounded-md border p-3"
                            dangerouslySetInnerHTML={{
                              __html: selected.renderedBody,
                            }}
                          />
                        )}

                      {selected.interactions.length > 0 && (
                        <div className="space-y-2 rounded-md border p-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Activity
                          </p>
                          {selected.interactions
                            .filter((i) => i.type !== "viewed")
                            .map((i, idx) => (
                              <div key={idx} className="flex gap-2 text-xs">
                                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                                <div>
                                  <p className="font-medium">
                                    {i.actor === "signer"
                                      ? selected.counterparty
                                      : "You"}{" "}
                                    — {i.type.replace("_", " ")}
                                    <span className="ml-1 text-muted-foreground">
                                      {new Date(i.occurredAt).toLocaleString()}
                                    </span>
                                  </p>
                                  {i.message && (
                                    <p className="text-muted-foreground">
                                      {i.message}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}

                      {(selected.signatureStatus === "sent" ||
                        selected.signatureStatus === "signed") && (
                        <div className="flex gap-2">
                          <Textarea
                            rows={2}
                            value={respondText}
                            onChange={(e) => setRespondText(e.target.value)}
                            placeholder="Reply to the counterparty…"
                          />
                          <Button
                            size="sm"
                            disabled={
                              !respondText.trim() || respondMut.isPending
                            }
                            onClick={() => respondMut.mutate(selected._id)}
                          >
                            Reply
                          </Button>
                        </div>
                      )}

                      {selected.signatureStatus === "signed" && (
                        <div className="flex items-end gap-2 rounded-md border p-3">
                          <div className="flex-1">
                            <Label className="text-xs">Countersign as</Label>
                            <Input
                              value={countersignName}
                              onChange={(e) =>
                                setCountersignName(e.target.value)
                              }
                              placeholder="Your full legal name"
                            />
                          </div>
                          <Button
                            disabled={
                              !countersignName.trim() ||
                              countersignMut.isPending
                            }
                            onClick={() => countersignMut.mutate(selected._id)}
                          >
                            <PenTool className="mr-2 h-4 w-4" /> Countersign
                          </Button>
                        </div>
                      )}

                      {selected.signatureStatus === "declined" &&
                        selected.declineReason && (
                          <p className="text-xs text-destructive">
                            Decline reason: {selected.declineReason}
                          </p>
                        )}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm">
                      Negotiation rounds
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setOpenRound(true)}
                    >
                      Add round
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selected.rounds.map((r) => (
                      <div key={r._id} className="rounded border p-2">
                        <p className="font-medium">
                          Round {r.round} — {r.by}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.at).toLocaleDateString()} · {r.summary}
                        </p>
                      </div>
                    ))}
                    {!selected.rounds.length && (
                      <p className="text-muted-foreground">No rounds yet.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm">Obligations</CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setOpenObligation(true)}
                    >
                      Add obligation
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selected.obligations.map((o) => (
                      <label key={o._id} className="flex items-center gap-2">
                        <Checkbox
                          checked={o.done}
                          onCheckedChange={(v) =>
                            setDoneMut.mutate({
                              id: selected._id,
                              obligationId: o._id,
                              done: !!v,
                            })
                          }
                        />
                        <span
                          className={o.done ? "line-through opacity-60" : ""}
                        >
                          {o.label}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {new Date(o.due).toLocaleDateString()}
                        </span>
                      </label>
                    ))}
                    {!selected.obligations.length && (
                      <p className="text-muted-foreground">
                        No obligations recorded.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm">Amendments</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selected.amendments.map((a) => (
                      <div key={a._id} className="rounded border p-2">
                        <p className="font-medium">{a.ref}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(a.at).toLocaleDateString()} · {a.summary}
                        </p>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOpenAmendment(true)}
                    >
                      Add amendment
                    </Button>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <Label className="text-xs">Executed on</Label>
                    <p>
                      {selected.executedOn
                        ? new Date(selected.executedOn).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs">Effective from</Label>
                    <p>
                      {selected.effectiveOn
                        ? new Date(selected.effectiveOn).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                </div>

                <CommentThread subject={selected._id} subjectType="Contract" />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

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

      {/* Execute contract */}
      <Dialog
        open={!!executeTarget}
        onOpenChange={(o) => !o && setExecuteTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Capture signature</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Executed on</Label>
              <Input
                type="date"
                value={executeForm.executedOn}
                onChange={(e) =>
                  setExecuteForm({ ...executeForm, executedOn: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Effective from</Label>
              <Input
                type="date"
                value={executeForm.effectiveOn}
                onChange={(e) =>
                  setExecuteForm({
                    ...executeForm,
                    effectiveOn: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={executeMut.isPending}
              onClick={() => executeMut.mutate()}
            >
              Execute — move to Active
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add negotiation round */}
      <Dialog open={openRound} onOpenChange={setOpenRound}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add negotiation round</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>By</Label>
              <Input
                value={roundForm.by}
                onChange={(e) =>
                  setRoundForm({ ...roundForm, by: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={roundForm.at}
                onChange={(e) =>
                  setRoundForm({ ...roundForm, at: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Summary</Label>
              <Textarea
                value={roundForm.summary}
                onChange={(e) =>
                  setRoundForm({ ...roundForm, summary: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!roundForm.summary || addRoundMut.isPending}
              onClick={() => selected && addRoundMut.mutate(selected._id)}
            >
              Add round
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add amendment */}
      <Dialog open={openAmendment} onOpenChange={setOpenAmendment}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add amendment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Summary</Label>
              <Textarea
                value={amendmentSummary}
                onChange={(e) => setAmendmentSummary(e.target.value)}
                placeholder="What changed and why"
              />
            </div>
            {selected?.renderedBody && (
              <div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={amendmentEditBody}
                    onCheckedChange={(v) => {
                      setAmendmentEditBody(!!v);
                      if (v && selected)
                        setAmendmentBodyDraft(selected.renderedBody);
                    }}
                  />
                  Update the contract content directly
                </label>
                {amendmentEditBody && (
                  <div className="mt-2">
                    <RichTextEditor
                      value={amendmentBodyDraft}
                      onChange={setAmendmentBodyDraft}
                      minHeight={140}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              disabled={!amendmentSummary || addAmendmentMut.isPending}
              onClick={() => selected && addAmendmentMut.mutate(selected._id)}
            >
              Add amendment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add obligation */}
      <Dialog open={openObligation} onOpenChange={setOpenObligation}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add obligation</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Label</Label>
              <Input
                value={obligationForm.label}
                onChange={(e) =>
                  setObligationForm({
                    ...obligationForm,
                    label: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={obligationForm.type}
                onValueChange={(v) =>
                  setObligationForm({
                    ...obligationForm,
                    type: v as ObligationType,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OBLIGATION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Due</Label>
                <Input
                  type="date"
                  value={obligationForm.due}
                  onChange={(e) =>
                    setObligationForm({
                      ...obligationForm,
                      due: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Lead days</Label>
                <Input
                  type="number"
                  value={obligationForm.leadDays}
                  onChange={(e) =>
                    setObligationForm({
                      ...obligationForm,
                      leadDays: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!obligationForm.label || addObligationMut.isPending}
              onClick={() => selected && addObligationMut.mutate(selected._id)}
            >
              Add obligation
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

      {/* Create / edit template */}
      <Dialog open={openTemplateDialog} onOpenChange={setOpenTemplateDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplateId ? "Edit template" : "New template"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Title</Label>
                <Input
                  value={templateDraft.title}
                  onChange={(e) =>
                    setTemplateDraft({
                      ...templateDraft,
                      title: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={templateDraft.type}
                  onValueChange={(v) =>
                    setTemplateDraft({
                      ...templateDraft,
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
            <div>
              <Label>Jurisdiction</Label>
              <Input
                value={templateDraft.jurisdiction}
                onChange={(e) =>
                  setTemplateDraft({
                    ...templateDraft,
                    jurisdiction: e.target.value,
                  })
                }
                placeholder="e.g. Rwanda"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={templateDraft.description}
                onChange={(e) =>
                  setTemplateDraft({
                    ...templateDraft,
                    description: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Template body</Label>
              <p className="mb-1 text-xs text-muted-foreground">
                Use placeholders like {"{{counterpartyName}}"},{" "}
                {"{{tenantCompanyName}}"}, {"{{contractValue}}"},{" "}
                {"{{contractCurrency}}"}, {"{{effectiveDate}}"},{" "}
                {"{{expiryDate}}"}, {"{{todayDate}}"} — filled in automatically
                when generating a contract.
              </p>
              <RichTextEditor
                value={templateDraft.content}
                onChange={(html) =>
                  setTemplateDraft({ ...templateDraft, content: html })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !templateDraft.title.trim() || saveTemplateMut.isPending
              }
              onClick={() => saveTemplateMut.mutate()}
            >
              {editingTemplateId ? "Save changes" : "Create template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload template — Word documents only */}
      <Dialog open={openUploadTemplate} onOpenChange={setOpenUploadTemplate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Word document (.doc, .docx)</Label>
              <Input
                type="file"
                accept={WORD_ACCEPT}
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                Its content is extracted automatically and becomes the
                template's real, previewable text.
              </p>
              {uploadFile && (
                <p className="text-xs text-muted-foreground">
                  {uploadFile.name} ·{" "}
                  {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Title</Label>
                <Input
                  value={uploadMeta.title}
                  onChange={(e) =>
                    setUploadMeta({ ...uploadMeta, title: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={uploadMeta.type}
                  onValueChange={(v) =>
                    setUploadMeta({ ...uploadMeta, type: v as ContractType })
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
                <Label>Jurisdiction</Label>
                <Input
                  value={uploadMeta.jurisdiction}
                  onChange={(e) =>
                    setUploadMeta({
                      ...uploadMeta,
                      jurisdiction: e.target.value,
                    })
                  }
                />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={uploadMeta.description}
                  onChange={(e) =>
                    setUploadMeta({
                      ...uploadMeta,
                      description: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !uploadFile ||
                !uploadMeta.title.trim() ||
                uploadTemplateMut.isPending
              }
              onClick={() => uploadTemplateMut.mutate()}
            >
              <Upload className="mr-2 h-4 w-4" /> Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace an uploaded template's file — Word documents only */}
      <Dialog
        open={!!replaceFileTarget}
        onOpenChange={(o) => !o && setReplaceFileTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Replace file — {replaceFileTarget?.title}</DialogTitle>
          </DialogHeader>
          <Input
            type="file"
            accept={WORD_ACCEPT}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) replaceFileMut.mutate(file);
            }}
          />
          {replaceFileMut.isPending && (
            <p className="text-xs text-muted-foreground">Uploading…</p>
          )}
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
                  {previewTemplate.fileUrl &&
                    previewTemplate.source === "tenant" && (
                      <a
                        href={previewTemplate.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        download original
                      </a>
                    )}
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

      {/* Delete template confirm */}
      <Dialog
        open={!!pendingDeleteTemplate}
        onOpenChange={(o) => !o && setPendingDeleteTemplate(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete template?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            "{pendingDeleteTemplate?.title}" will be removed
            {pendingDeleteTemplate?.sourceType === "uploaded"
              ? ", including its file"
              : ""}
            .
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDeleteTemplate(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteTemplateMut.isPending}
              onClick={() =>
                pendingDeleteTemplate &&
                deleteTemplateMut.mutate(pendingDeleteTemplate._id)
              }
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
