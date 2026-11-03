import { useState } from "react";
import {
  ContractPartyFields,
  emptyParty,
  partyPayload,
  partyReady,
} from "@/components/crm/ContractPartyFields";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  Search,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CommentThread } from "@/components/crm/CommentThread";
import { RichTextEditor } from "@/components/RichTextEditor";
import { CategoryRow } from "@/components/crm/case/CaseListTabs";

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

// Select value of the "More templates" row at the end of the template dropdown.
const MORE_TEMPLATES = "__more_templates__";

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
  const [typeFilter, setTypeFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [boardFilter, setBoardFilter] = useState("all");
  const [tab, setTab] = useState("register");

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
    queryFn: () => fetchAvailableTemplates(),
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

  const clientOptions = clients.map((c) => ({
    id: c._id,
    label: displayName(c),
  }));
  const mandateOptions = mandates.map((m: any) => ({
    id: m._id,
    name: m.name,
  }));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["contracts"] });
    queryClient.invalidateQueries({ queryKey: ["contracts-expiring"] });
    queryClient.invalidateQueries({ queryKey: ["obligations-due"] });
  };

  // Register filters. The client, board member and vendor lists are built
  // from the contracts themselves (the contract already carries the party's
  // name), so every option leads to at least one contract. A contract's
  // clientId can belong to a client or a board member, so the two are kept
  // apart by the party kind the engine sends with each contract.
  const partyOptions = (
    key: "clientId" | "vendorId",
    kind?: "client" | "board_member",
  ) => {
    const byId = new Map<string, string>();
    for (const c of list) {
      if (kind && c.partyKind !== kind) continue;
      const id = c[key];
      if (id && !byId.has(id)) byId.set(id, c.counterparty || id);
    }
    return Array.from(byId, ([id, label]) => ({ id, label })).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  };
  const clientFilterOptions = partyOptions("clientId", "client");
  const boardFilterOptions = partyOptions("clientId", "board_member");
  const vendorFilterOptions = partyOptions("vendorId");
  const filtersActive = [
    stageFilter,
    typeFilter,
    clientFilter,
    boardFilter,
    vendorFilter,
  ].some((f) => f !== "all");
  const clearFilters = () => {
    setStageFilter("all");
    setTypeFilter("all");
    setClientFilter("all");
    setBoardFilter("all");
    setVendorFilter("all");
  };
  const filtered = list.filter(
    (c) =>
      (stageFilter === "all" || c.stage === stageFilter) &&
      (typeFilter === "all" || c.type === typeFilter) &&
      (clientFilter === "all" || c.clientId === clientFilter) &&
      (boardFilter === "all" || c.clientId === boardFilter) &&
      (vendorFilter === "all" || c.vendorId === vendorFilter),
  );

  // ── New contract ─────────────────────────────────────────
  const [openNew, setOpenNew] = useState(false);
  // Just the essentials — value, currency, jurisdiction, dates and the rest
  // are filled in the document itself with the Merge Fields panel.
  const emptyForm = {
    ...emptyParty,
    title: "",
    expiresOn: today(),
    content: "",
  };
  const [form, setForm] = useState(emptyForm);
  const createMut = useMutation({
    mutationFn: () =>
      createContract({
        title: form.title,
        expiresOn: form.expiresOn,
        content: form.content,
        ...partyPayload(form),
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
  // Which category (folder) is selected in the template browser.
  const [activeFolder, setActiveFolder] = useState<string>("all");

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
  // Template, who it is for, title and expiry — nothing else. The rest of
  // the contract's details are filled in the Merge Fields panel afterwards.
  const emptyGenerateDraft = {
    ...emptyParty,
    templateId: "",
    templateSource: "tenant" as "platform" | "tenant",
    title: "",
    expiresOn: "",
  };
  const [generateDraft, setGenerateDraft] = useState(emptyGenerateDraft);

  // How many templates the dropdown lists before pointing the tenant to
  // the Templates tab — a library can run to dozens of templates, far too
  // many to scroll in a dropdown.
  const TEMPLATE_DROPDOWN_LIMIT = 10;
  // True while the tenant has left the form for the Templates tab to pick
  // a template ("More…"): choosing one there returns to the form with
  // everything they already typed still in place.
  const [pickingTemplate, setPickingTemplate] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");

  const openGenerate = (template?: AvailableTemplate) => {
    if (template) {
      setGenerateDraft((d) => ({
        ...(pickingTemplate ? d : emptyGenerateDraft),
        templateId: template._id,
        templateSource: template.source ?? "tenant",
      }));
    } else {
      setGenerateDraft(emptyGenerateDraft);
    }
    setPickingTemplate(false);
    setOpenGenerateDialog(true);
  };
  const browseAllTemplates = () => {
    setOpenGenerateDialog(false);
    setPreviewTemplate(null);
    setPickingTemplate(true);
    setActiveFolder("all");
    setTemplateSearch("");
    setTab("templates");
  };
  const generateMut = useMutation({
    mutationFn: () =>
      generateContractFromTemplate({
        templateId: generateDraft.templateId,
        templateSource: generateDraft.templateSource,
        title: generateDraft.title,
        expiresOn: generateDraft.expiresOn,
        ...partyPayload(generateDraft),
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

  // The first few templates, plus whichever one is currently chosen even
  // if it sits further down the library (picked on the Templates tab) so
  // the dropdown can always display it.
  const dropdownTemplates = (() => {
    const first = availableTemplates.slice(0, TEMPLATE_DROPDOWN_LIMIT);
    const chosen = availableTemplates.find(
      (t) => t._id === generateDraft.templateId,
    );
    return chosen && !first.includes(chosen) ? [chosen, ...first] : first;
  })();

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
          <Button variant="outline" onClick={() => openGenerate()}>
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

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="register">Register</TabsTrigger>
          <TabsTrigger value="lifecycle">Lifecycle board</TabsTrigger>
          <TabsTrigger value="obligations">Obligations</TabsTrigger>
          <TabsTrigger value="renewals">Renewals &amp; expiry</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-3 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-48">
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
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {CONTRACT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clients</SelectItem>
                {clientFilterOptions.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={boardFilter} onValueChange={setBoardFilter}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All board members</SelectItem>
                {boardFilterOptions.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All vendors</SelectItem>
                {vendorFilterOptions.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              {filtered.length} of {list.length} contract
              {list.length === 1 ? "" : "s"}
            </span>
          </div>
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
                        {list.length
                          ? "No contracts match these filters."
                          : "No contracts yet."}
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

          {(() => {
            const folderName = (fid?: string | null) =>
              templateFolders.find((f) => f._id === fid)?.name ||
              "Uncategorized";
            const cats = [
              ...templateFolders
                .filter((f) =>
                  availableTemplates.some((t) => t.folderId === f._id),
                )
                .map((f) => ({
                  id: f._id,
                  name: f.name,
                  count: availableTemplates.filter((t) => t.folderId === f._id)
                    .length,
                })),
              ...(uncategorizedTemplates.length
                ? [
                    {
                      id: "uncategorized",
                      name: "Uncategorized",
                      count: uncategorizedTemplates.length,
                    },
                  ]
                : []),
            ];
            const inFolder =
              activeFolder === "all"
                ? availableTemplates
                : activeFolder === "uncategorized"
                  ? uncategorizedTemplates
                  : availableTemplates.filter(
                      (t) => t.folderId === activeFolder,
                    );
            const q = templateSearch.trim().toLowerCase();
            const shown = q
              ? inFolder.filter(
                  (t) =>
                    t.title.toLowerCase().includes(q) ||
                    (t.description ?? "").toLowerCase().includes(q) ||
                    (t.jurisdiction ?? "").toLowerCase().includes(q),
                )
              : inFolder;
            const activeName =
              activeFolder === "all"
                ? "All templates — platform-published and my own"
                : cats.find((c) => c.id === activeFolder)?.name ||
                  "All templates";

            return (
              <div className="space-y-3">
                {pickingTemplate && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                    <span>
                      <Sparkles className="mr-2 inline h-4 w-4 text-primary" />
                      Choose a template for your new contract, then press{" "}
                      <b>Generate contract</b>. What you've already filled in is
                      kept.
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setPickingTemplate(false);
                        setOpenGenerateDialog(true);
                      }}
                    >
                      Back to the form
                    </Button>
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-[260px_1fr]">
                  <Card className="h-fit">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Folder className="h-4 w-4 fill-amber-400 text-amber-500" />
                        Categories
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 p-2">
                      <CategoryRow
                        label="All templates"
                        count={availableTemplates.length}
                        active={activeFolder === "all"}
                        onClick={() => setActiveFolder("all")}
                      />
                      {cats.map((c) => (
                        <CategoryRow
                          key={c.id}
                          label={c.name}
                          count={c.count}
                          active={activeFolder === c.id}
                          onClick={() => setActiveFolder(c.id)}
                        />
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm">
                        {activeName}{" "}
                        <span className="font-normal text-muted-foreground">
                          ({shown.length})
                        </span>
                      </CardTitle>
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="h-9 pl-8"
                          placeholder="Search templates…"
                          value={templateSearch}
                          onChange={(e) => setTemplateSearch(e.target.value)}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Template</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Jurisdiction</TableHead>
                            <TableHead className="w-44" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {shown.map((t) => (
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
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="bg-primary/10 text-primary border-primary/20 text-[10px] capitalize"
                                >
                                  {t.source}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {folderName(t.folderId)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {t.jurisdiction || "—"}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    title="View template"
                                    onClick={() => setPreviewTemplate(t)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={
                                      pickingTemplate ? "default" : "outline"
                                    }
                                    onClick={() => openGenerate(t)}
                                  >
                                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                                    Generate
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {!shown.length && (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="py-8 text-center text-sm text-muted-foreground"
                              >
                                {q
                                  ? "No templates match your search."
                                  : "No templates in this category yet."}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* New contract */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New contract</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <ContractPartyFields
              value={form}
              onChange={(party) => setForm({ ...form, ...party })}
              clients={clientOptions}
              mandates={mandateOptions}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
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
            <div>
              <Label>Content</Label>
              <p className="mb-1 text-xs text-muted-foreground">
                Type the contract text directly — no template needed. Value,
                dates and the other details can be filled in afterwards with the
                Merge Fields panel. You can also generate from a template
                instead, using the button next to "New contract".
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
                !form.title.trim() ||
                !form.expiresOn ||
                !partyReady(form) ||
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
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate contract from template</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Template</Label>
              <Select
                value={generateDraft.templateId}
                onValueChange={(v) => {
                  if (v === MORE_TEMPLATES) {
                    browseAllTemplates();
                    return;
                  }
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
                  {dropdownTemplates.map((t) => (
                    <SelectItem key={`${t.source}-${t._id}`} value={t._id}>
                      {t.sourceType === "uploaded" ? "📄 " : ""}
                      {t.title}{" "}
                      {t.source === "platform" ? "(Platform)" : "(My own)"}
                    </SelectItem>
                  ))}
                  {availableTemplates.length > TEMPLATE_DROPDOWN_LIMIT && (
                    <SelectItem
                      value={MORE_TEMPLATES}
                      className="font-medium text-primary"
                    >
                      <span className="flex items-center gap-1.5">
                        More templates — browse all {availableTemplates.length}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {!availableTemplates.length && (
                <p className="mt-1 text-xs text-muted-foreground">
                  No templates yet — create or upload one on the Templates tab
                  first.
                </p>
              )}
            </div>
            <ContractPartyFields
              value={generateDraft}
              onChange={(party) =>
                setGenerateDraft({ ...generateDraft, ...party })
              }
              clients={clientOptions}
              mandates={mandateOptions}
            />
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
            <p className="text-xs text-muted-foreground">
              Everything else — value, jurisdiction, dates, scope of work — is
              filled in on the contract itself with the Merge Fields panel.
            </p>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !generateDraft.templateId ||
                !generateDraft.title.trim() ||
                !partyReady(generateDraft) ||
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
              <div className="flex justify-end border-t pt-3">
                <Button
                  onClick={() => {
                    const t = previewTemplate;
                    setPreviewTemplate(null);
                    openGenerate(t);
                  }}
                >
                  <Sparkles className="mr-2 h-4 w-4" /> Generate contract from
                  this template
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
