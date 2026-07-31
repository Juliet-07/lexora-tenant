import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Plus,
  FileText,
  FolderOpen,
  ClipboardCheck,
  ShieldCheck,
  PenSquare,
  ListChecks,
  Archive,
  Trash2,
  GripVertical,
  ChevronRight,
  CheckCircle2,
  MessageSquare,
  Upload,
} from "lucide-react";
import {
  DEAL_STAGES,
  type DealStage,
  stageColor,
  formatMoney,
  fetchDeal,
  fetchClauses,
  setDealStage,
  setDealStatus,
  updateTermSheet,
  addDataRoomFile,
  addDDItem,
  updateDDItem,
  addContractSection,
  removeContractSection,
  updateContractSectionBody,
  addContractComment,
  toggleContractComment,
  setContractVariable,
  addCP,
  updateCP,
  addSigningChecklistItem,
  toggleSigningChecklistItem,
  addSignatory,
  markSignatorySigned,
  updateSigningDetails,
  addPostCompletion,
  togglePostCompletion,
  type Deal,
  type DDItem,
  type DDWorkstream,
  type Materiality,
  type CPKind,
  addDataRoomFolder,
  removeDataRoomFolder,
  removeDataRoomFile,
  DealPartySide,
  removeParty,
  updateParty,
  addParty,
  sendDataRoomEmail,
  sendForReview,
  downloadContractPdf,
} from "@/lib/grc/deals-api";
import { toast } from "sonner";

export default function DealDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const { data: deal, isLoading } = useQuery({
    queryKey: ["deal", id],
    queryFn: () => fetchDeal(id!),
    enabled: !!id,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["deal", id] });
  const stageMut = useMutation({
    mutationFn: (stage: DealStage) => setDealStage(id!, stage),
    onSuccess: invalidate,
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to update stage"),
  });
  const statusMut = useMutation({
    mutationFn: (status: any) => setDealStatus(id!, status),
    onSuccess: invalidate,
  });

  if (isLoading)
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Loading deal…
      </div>
    );

  if (!deal)
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => nav("/grc/deals/pipeline")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="mt-6 text-muted-foreground">Deal not found.</div>
      </div>
    );

  const stageIdx = DEAL_STAGES.indexOf(deal.stage);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/grc/deals/pipeline" className="hover:underline">
          Deal Pipeline
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{deal.name}</span>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{deal.name}</h1>
                <Badge variant="outline">{deal.type}</Badge>
                <Badge variant="outline" className={stageColor(deal.stage)}>
                  {deal.stage}
                </Badge>
                <Badge variant="outline">{deal.status}</Badge>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {deal.client} <span className="mx-1">↔</span>{" "}
                {deal.counterparty} · Lead: {deal.leadPartner} ·{" "}
                {deal.jurisdiction}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={deal.stage}
                onValueChange={(v) => stageMut.mutate(v as DealStage)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEAL_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={deal.status}
                onValueChange={(v) => statusMut.mutate(v)}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Active", "Completed", "Lost", "On Hold"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 md:grid-cols-8 gap-1">
            {DEAL_STAGES.map((st, i) => (
              <button
                key={st}
                onClick={() => stageMut.mutate(st)}
                className={`text-[10px] py-2 px-1 rounded border transition text-center ${
                  i < stageIdx
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700"
                    : i === stageIdx
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {i + 1}. {st}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Value</div>
              <div className="font-semibold">
                {formatMoney(deal.value, deal.currency)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Start</div>
              <div className="font-semibold">{deal.startDate.slice(0, 10)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Target close</div>
              <div className="font-semibold">
                {deal.targetClose.slice(0, 10)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Longstop</div>
              <div
                className={`font-semibold ${deal.longstopDate.slice(0, 10) < new Date().toISOString().slice(0, 10) ? "text-rose-600" : ""}`}
              >
                {deal.longstopDate.slice(0, 10)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">DD / CPs</div>
              <div className="font-semibold">
                {deal.ddProgress}% · {deal.cpsProgress.done}/
                {deal.cpsProgress.total}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="termsheet">Term Sheet</TabsTrigger>
          <TabsTrigger value="dataroom">Data Room</TabsTrigger>
          <TabsTrigger value="dd">Due Diligence</TabsTrigger>
          <TabsTrigger value="contract">Contract</TabsTrigger>
          <TabsTrigger value="cps">CPs Tracker</TabsTrigger>
          <TabsTrigger value="signing">Signing</TabsTrigger>
          <TabsTrigger value="post">Post-Completion</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewTab deal={deal} />
        </TabsContent>
        <TabsContent value="termsheet">
          <TermSheetTab deal={deal} />
        </TabsContent>
        <TabsContent value="dataroom">
          <DataRoomTab deal={deal} />
        </TabsContent>
        <TabsContent value="dd">
          <DDTab deal={deal} />
        </TabsContent>
        <TabsContent value="contract">
          <ContractTab deal={deal} />
        </TabsContent>
        <TabsContent value="cps">
          <CPsTab deal={deal} />
        </TabsContent>
        <TabsContent value="signing">
          <SigningTab deal={deal} />
        </TabsContent>
        <TabsContent value="post">
          <PostTab deal={deal} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function useDealMutation<T = void>(
  dealId: string,
  fn: (arg: T) => Promise<Deal>,
  opts?: { successMsg?: string },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
      if (opts?.successMsg) toast.success(opts.successMsg);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Action failed"),
  });
}

// ─────────────────────────── Overview ───────────────────────────
function OverviewTab({ deal }: { deal: Deal }) {
  const dd = deal.dd ?? [];
  const signingChecklist = deal.signing?.checklist ?? [];
  const flags = dd.filter((x) => x.status === "Red Flag");
  const signDone = signingChecklist.filter((c) => c.status === "Done").length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Due Diligence</span>
              <span>{deal.ddProgress}%</span>
            </div>
            <Progress value={deal.ddProgress} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Conditions Precedent</span>
              <span>
                {deal.cpsProgress.done}/{deal.cpsProgress.total}
              </span>
            </div>
            <Progress
              value={
                deal.cpsProgress.total
                  ? (deal.cpsProgress.done / deal.cpsProgress.total) * 100
                  : 0
              }
              className="h-2"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Pre-signing checklist</span>
              <span>
                {signDone}/{signingChecklist.length}
              </span>
            </div>
            <Progress
              value={
                signingChecklist.length
                  ? (signDone / signingChecklist.length) * 100
                  : 0
              }
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deal team</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div>
            <b>Lead partner:</b> {deal.leadPartner}
          </div>
          {(deal.team ?? []).length > 0 && (
            <div>
              <b>Team:</b> {(deal.team ?? []).join(", ")}
            </div>
          )}
          <div className="pt-2">
            <b>Conflict check:</b>{" "}
            {deal.conflictCheck.cleared ? (
              <Badge
                variant="outline"
                className="text-emerald-700 border-emerald-500/30"
              >
                Cleared
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-rose-700 border-rose-500/30"
              >
                Flagged
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {deal.conflictCheck.note}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-base">Deal parties</CardTitle>
        </CardHeader>
        <CardContent>
          <PartiesSection deal={deal} />
        </CardContent>
      </Card>
      {flags.length > 0 && (
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base text-rose-700">
              Red-flag findings ({flags.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {flags.map((f, i) => (
              <div
                key={i}
                className="rounded border border-rose-500/30 bg-rose-500/5 p-2 text-sm"
              >
                <div className="font-medium">
                  {f.workstream}: {f.item}
                </div>
                <div className="text-xs text-muted-foreground">
                  {f.finding} · Materiality: {f.materiality ?? "—"}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────── Term Sheet ───────────────────────────
function TermSheetTab({ deal }: { deal: Deal }) {
  const [t, setT] = useState({
    structure: "",
    consideration: "",
    conditions: "",
    exclusivity: "",
    confidentiality: "",
    timeline: "",
    updatedAt: "",
    ...deal.termSheet,
  });
  const mut = useDealMutation(deal._id, () => updateTermSheet(deal._id, t), {
    successMsg: "Term sheet saved",
  });
  const reviewLoop = deal.offerReviewLoop ?? { tokens: [], responses: [] };
  const sendReviewMut = useMutation({
    mutationFn: () => sendForReview(deal._id, "offer"),
    onSuccess: (res) =>
      toast.success(
        `Sent to ${res.sent.length} part${res.sent.length === 1 ? "y" : "ies"}`,
      ),
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to send for review"),
  });

  const fields: [string, keyof typeof t][] = [
    ["Structure", "structure"],
    ["Consideration", "consideration"],
    ["Conditions", "conditions"],
    ["Exclusivity", "exclusivity"],
    ["Confidentiality", "confidentiality"],
    ["Timeline", "timeline"],
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Term Sheet Builder
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={sendReviewMut.isPending}
              onClick={() => sendReviewMut.mutate()}
            >
              Send for review
            </Button>
            <Button
              size="sm"
              disabled={mut.isPending}
              onClick={() => mut.mutate()}
            >
              {mut.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fields.map(([label, key]) => (
            <div
              key={key}
              className={key === "structure" ? "md:col-span-2" : ""}
            >
              <Label>{label}</Label>
              <Textarea
                value={t[key] as string}
                onChange={(e) => setT({ ...t, [key]: e.target.value })}
                rows={2}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {reviewLoop.responses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review responses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reviewLoop.responses.map((r, i) => (
              <div
                key={i}
                className={`border rounded-md p-2.5 text-sm ${r.decision === "Approved" ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}
              >
                <div className="flex justify-between">
                  <span className="font-medium">{r.partyName}</span>
                  <Badge variant="outline">{r.decision}</Badge>
                </div>
                {r.comment && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {r.comment}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────── Data Room (files only) ───────────────────────────
function DataRoomTab({ deal }: { deal: Deal }) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["deal", deal._id] });
  const folders = deal.dataRoom?.folders ?? [];
  const dataRoomFiles = deal.dataRoom?.files ?? [];
  const [file, setFile] = useState<File | null>(null);
  const [newFolder, setNewFolder] = useState("");
  const [q, setQ] = useState("");
  const [openFolder, setOpenFolder] = useState<string | null>(null);

  const folderMut = useMutation({
    mutationFn: () => addDataRoomFolder(deal._id, newFolder.trim()),
    onSuccess: () => {
      invalidate();
      setNewFolder("");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to add folder"),
  });
  const removeFolderMut = useMutation({
    mutationFn: (index: number) => removeDataRoomFolder(deal._id, index),
    onSuccess: () => {
      invalidate();
      setOpenFolder(null);
    },
  });
  const uploadMut = useMutation({
    mutationFn: () => addDataRoomFile(deal._id, file!, openFolder!),
    onSuccess: () => {
      invalidate();
      setFile(null);
      toast.success("File uploaded");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to upload"),
  });
  const removeFileMut = useMutation({
    mutationFn: (index: number) => removeDataRoomFile(deal._id, index),
    onSuccess: invalidate,
  });

  const countInFolder = (folderName: string) =>
    dataRoomFiles.filter((f) => f.folder === folderName).length;

  const partiesWithAccess = (deal.parties ?? [])
    .map((p, i) => ({ ...p, index: i }))
    .filter((p) => p.permissions.dataRoom);
  const sendMut = useMutation({
    mutationFn: (partyIndex: number) => sendDataRoomEmail(deal._id, partyIndex),
    onSuccess: (res) => toast.success(`Sent to ${res.sentTo}`),
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to send data room"),
  });

  // ── Folder list view ──────────────────────────────────────────
  if (!openFolder) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {partiesWithAccess.length > 0 && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">Send data room</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {partiesWithAccess.map((p) => (
                <div
                  key={p.index}
                  className="flex items-center justify-between border rounded-md p-2.5 text-sm"
                >
                  <div>
                    <span className="font-medium">{p.name}</span>{" "}
                    <span className="text-xs text-muted-foreground">
                      — {p.title} ({p.side})
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={sendMut.isPending}
                    onClick={() => sendMut.mutate(p.index)}
                  >
                    Send zip to {p.email}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Data Room folders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {folders.map((f, i) => (
                <div
                  key={i}
                  onClick={() => setOpenFolder(f.name)}
                  className="border rounded-md p-3 cursor-pointer hover:border-primary transition group relative"
                >
                  <FolderOpen className="h-6 w-6 text-muted-foreground mb-2" />
                  <div className="text-sm font-medium truncate pr-6">
                    {f.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {countInFolder(f.name)} file(s)
                  </div>
                  <button
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${f.name}" and every file in it?`))
                        removeFolderMut.mutate(i);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
              {folders.length === 0 && (
                <div className="col-span-full text-sm text-muted-foreground text-center py-8">
                  No folders yet — create one to start uploading.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">New folder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="Folder name"
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
            />
            <Button
              className="w-full"
              disabled={!newFolder.trim() || folderMut.isPending}
              onClick={() => folderMut.mutate()}
            >
              <Plus className="h-4 w-4 mr-1" />
              {folderMut.isPending ? "Creating…" : "Create folder"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Inside a folder ────────────────────────────────────────────
  const files = dataRoomFiles
    .filter((f) => f.folder === openFolder)
    .filter((f) => !q || f.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <button
            className="text-muted-foreground hover:text-foreground flex items-center gap-1"
            onClick={() => setOpenFolder(null)}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Documents
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-semibold">{openFolder}</span>
          <Badge variant="outline" className="ml-1">
            {files.length}
          </Badge>
        </div>
        <Input
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-48 h-8"
        />
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Views</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((f) => {
              const globalIndex = dataRoomFiles.indexOf(f);
              return (
                <TableRow key={globalIndex}>
                  <TableCell className="text-sm">
                    {f.fileUrl ? (
                      <a
                        href={f.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        {f.name}
                      </a>
                    ) : (
                      f.name
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {(f.size / (1024 * 1024)).toFixed(1)} MB
                  </TableCell>
                  <TableCell className="text-xs">v{f.version}</TableCell>
                  <TableCell className="text-xs">{f.views}</TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFileMut.mutate(globalIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {files.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-xs text-muted-foreground py-6"
                >
                  No files in this folder.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="p-3 border-t flex gap-2">
          <Input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="flex-1"
          />
          <Button
            disabled={!file || uploadMut.isPending}
            onClick={() => uploadMut.mutate()}
          >
            <Upload className="h-4 w-4 mr-1" />
            {uploadMut.isPending ? "Uploading…" : "Upload to " + openFolder}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────── Due Diligence (with materiality) ───────────────────────────
function DDTab({ deal }: { deal: Deal }) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["deal", deal._id] });
  const [item, setItem] = useState({
    workstream: "Legal" as DDWorkstream,
    item: "",
    owner: "",
  });

  const addMut = useMutation({
    mutationFn: () => addDDItem(deal._id, item),
    onSuccess: () => {
      invalidate();
      setItem({ ...item, item: "", owner: "" });
    },
  });
  const patchMut = useMutation({
    mutationFn: ({
      index,
      patch,
    }: {
      index: number;
      patch: Partial<{
        status: any;
        finding: string;
        materiality: Materiality;
      }>;
    }) => updateDDItem(deal._id, index, patch),
    onSuccess: invalidate,
  });

  const dd = deal.dd ?? [];
  const grouped = dd.reduce(
    (a: Record<string, (DDItem & { index: number })[]>, d, index) => {
      (a[d.workstream] ||= []).push({ ...d, index });
      return a;
    },
    {},
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Due Diligence workspace ({deal.ddProgress}% complete)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={deal.ddProgress} className="h-2" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Select
              value={item.workstream}
              onValueChange={(v) =>
                setItem({ ...item, workstream: v as DDWorkstream })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "Legal",
                  "Financial",
                  "Tax",
                  "Commercial",
                  "Operational",
                  "ESG",
                ].map((w) => (
                  <SelectItem key={w} value={w}>
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Checklist item…"
              value={item.item}
              onChange={(e) => setItem({ ...item, item: e.target.value })}
              className="md:col-span-2"
            />
            <div className="flex gap-2">
              <Input
                placeholder="Owner"
                value={item.owner}
                onChange={(e) => setItem({ ...item, owner: e.target.value })}
              />
              <Button
                disabled={!item.item || addMut.isPending}
                onClick={() => addMut.mutate()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {Object.entries(grouped).map(([ws, items]) => (
        <Card key={ws}>
          <CardHeader>
            <CardTitle className="text-base">{ws} workstream</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Materiality</TableHead>
                  <TableHead>Finding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.index}>
                    <TableCell className="text-sm">{it.item}</TableCell>
                    <TableCell className="text-xs">{it.owner}</TableCell>
                    <TableCell>
                      <Select
                        value={it.status}
                        onValueChange={(v) =>
                          patchMut.mutate({
                            index: it.index,
                            patch: { status: v },
                          })
                        }
                      >
                        <SelectTrigger className="h-7 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            "Not Started",
                            "In Progress",
                            "Complete",
                            "Red Flag",
                          ].map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={it.materiality ?? "__none__"}
                        onValueChange={(v) =>
                          patchMut.mutate({
                            index: it.index,
                            patch: {
                              materiality:
                                v === "__none__"
                                  ? undefined
                                  : (v as Materiality),
                            },
                          })
                        }
                      >
                        <SelectTrigger className="h-7 w-24 text-xs">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">—</SelectItem>
                          {["Low", "Medium", "High"].map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Input
                        className="h-7 text-xs"
                        defaultValue={it.finding}
                        placeholder="Finding notes…"
                        onBlur={(e) =>
                          e.target.value !== it.finding &&
                          patchMut.mutate({
                            index: it.index,
                            patch: { finding: e.target.value },
                          })
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
      {dd.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-6">
          No DD items yet.
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── Contract Builder (with comments) ───────────────────────────
function ContractTab({ deal }: { deal: Deal }) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["deal", deal._id] });
  const { data: clauses = [] } = useQuery({
    queryKey: ["deals-clauses"],
    queryFn: fetchClauses,
  });
  const reviewLoop = deal.contractReviewLoop ?? { tokens: [], responses: [] };
  const sendReviewMut = useMutation({
    mutationFn: () => sendForReview(deal._id, "contract"),
    onSuccess: (res) => {
      invalidate();
      toast.success(
        `Sent to ${res.sent.length} part${res.sent.length === 1 ? "y" : "ies"}`,
      );
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to send for review"),
  });
  const [showLib, setShowLib] = useState(false);
  const [openComments, setOpenComments] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("");

  const vars = deal.contract?.variables ?? {};
  const varList = Object.keys(vars);
  const sections = deal.contract?.sections ?? [];
  const bodyText = sections.map((s) => s.body).join(" ");
  const usedVars = Array.from(
    new Set(
      (bodyText.match(/\[([A-Z_]+)\]/g) || []).map((v) => v.slice(1, -1)),
    ),
  );
  const unfilled = usedVars.filter((v) => !vars[v]);

  const addMut = useMutation({
    mutationFn: (clauseId: string) => addContractSection(deal._id, clauseId),
    onSuccess: invalidate,
  });
  const removeMut = useMutation({
    mutationFn: (index: number) => removeContractSection(deal._id, index),
    onSuccess: invalidate,
  });
  const bodyMut = useMutation({
    mutationFn: ({ index, body }: { index: number; body: string }) =>
      updateContractSectionBody(deal._id, index, body),
    onSuccess: invalidate,
  });
  const varMut = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      setContractVariable(deal._id, key, value),
    onSuccess: invalidate,
  });
  const commentMut = useMutation({
    mutationFn: (index: number) =>
      addContractComment(deal._id, index, commentAuthor || "You", commentText),
    onSuccess: () => {
      invalidate();
      setCommentText("");
    },
  });
  const toggleCommentMut = useMutation({
    mutationFn: ({ sIndex, cIndex }: { sIndex: number; cIndex: number }) =>
      toggleContractComment(deal._id, sIndex, cIndex),
    onSuccess: invalidate,
  });

  function renderBody(body: string) {
    return body.replace(/\[([A-Z_]+)\]/g, (_, k) =>
      vars[k] ? vars[k] : `[${k}]`,
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <Card className="lg:col-span-3">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <PenSquare className="h-4 w-4" />
            Live workspace ({deal.contract.sections.length} clauses)
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowLib(!showLib)}
            >
              {showLib ? "Hide" : "Insert from"} library
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={sendReviewMut.isPending}
              onClick={() => sendReviewMut.mutate()}
            >
              Send for review
            </Button>
            <Button size="sm" onClick={() => downloadContractPdf(deal._id)}>
              Export PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {deal.contract.sections.map((s, i) => (
            <div
              key={i}
              className="border-2 border-dashed rounded-md p-3 hover:border-primary/60"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  {s.title}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setOpenComments(openComments === i ? null : i)
                    }
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1" />
                    {s.comments.length}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeMut.mutate(i)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Textarea
                defaultValue={s.body}
                onBlur={(e) =>
                  e.target.value !== s.body &&
                  bodyMut.mutate({ index: i, body: e.target.value })
                }
                rows={3}
                className="text-sm"
              />
              <div className="text-xs text-muted-foreground mt-1">
                Preview: {renderBody(s.body)}
              </div>

              {openComments === i && (
                <div className="mt-3 border-t pt-2 space-y-2">
                  {s.comments.map((c, ci) => (
                    <div
                      key={ci}
                      className={`text-xs rounded p-2 border ${c.resolved ? "bg-emerald-500/5 border-emerald-500/20" : "bg-muted/40"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{c.author}</span>
                        <button
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            toggleCommentMut.mutate({ sIndex: i, cIndex: ci })
                          }
                        >
                          {c.resolved ? "Reopen" : "Resolve"}
                        </button>
                      </div>
                      <div
                        className={
                          c.resolved ? "line-through text-muted-foreground" : ""
                        }
                      >
                        {c.text}
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Your name"
                      value={commentAuthor}
                      onChange={(e) => setCommentAuthor(e.target.value)}
                      className="w-32 h-8 text-xs"
                    />
                    <Input
                      placeholder="Add a comment…"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Button
                      size="sm"
                      disabled={!commentText.trim()}
                      onClick={() => commentMut.mutate(i)}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {deal.contract.sections.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-6">
              No clauses yet. Insert from the Clause Library.
            </div>
          )}
          {showLib && (
            <div className="border rounded p-3 space-y-2 bg-muted/30">
              <div className="text-xs font-semibold">Clause Library</div>
              {clauses.map((cl) => (
                <div
                  key={cl._id}
                  className="flex items-center justify-between text-sm border-b py-1 last:border-0"
                >
                  <div>
                    <span className="font-medium">{cl.title}</span>{" "}
                    <span className="text-xs text-muted-foreground">
                      — {cl.category}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={addMut.isPending}
                    onClick={() => addMut.mutate(cl._id)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Insert
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* <Card>
        <CardHeader>
          <CardTitle className="text-base">Smart variables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {usedVars.map((k) => (
            <div key={k}>
              <Label className="text-xs">{k}</Label>
              <Input
                defaultValue={vars[k] || ""}
                onBlur={(e) =>
                  e.target.value !== (vars[k] || "") &&
                  varMut.mutate({ key: k, value: e.target.value })
                }
                placeholder={`[${k}]`}
              />
            </div>
          ))}
          {varList
            .filter((v) => !usedVars.includes(v))
            .map((k) => (
              <div key={k}>
                <Label className="text-xs text-muted-foreground">
                  {k} (unused)
                </Label>
                <Input
                  defaultValue={vars[k] || ""}
                  onBlur={(e) =>
                    e.target.value !== (vars[k] || "") &&
                    varMut.mutate({ key: k, value: e.target.value })
                  }
                />
              </div>
            ))}
          <div className="text-xs pt-2 border-t">
            <div className="flex items-center justify-between">
              <span>Unfilled</span>
              <Badge
                variant="outline"
                className={
                  unfilled.length
                    ? "text-rose-700 border-rose-500/30"
                    : "text-emerald-700 border-emerald-500/30"
                }
              >
                {unfilled.length}
              </Badge>
            </div>
          </div>
          <div className="pt-2 border-t text-xs space-y-1">
            <div className="font-semibold">Playbook checks</div>
            <div className="flex items-start gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5" />
              Governing law present
            </div>
            {deal.value > 10_000_000 && (
              <div className="flex items-start gap-1 text-amber-700">
                <AlertTriangleIcon />
                Board approval clause required (value {">"} $10m)
              </div>
            )}
          </div>
        </CardContent>
      </Card> */}

      {reviewLoop.responses.length > 0 && (
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">Review responses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reviewLoop.responses.map((r, i) => (
              <div
                key={i}
                className={`border rounded-md p-2.5 text-sm ${r.decision === "Approved" ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}
              >
                <div className="flex justify-between">
                  <span className="font-medium">{r.partyName}</span>
                  <Badge variant="outline">{r.decision}</Badge>
                </div>
                {r.comment && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {r.comment}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AlertTriangleIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="mt-0.5"
    >
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    </svg>
  );
}

// ─────────────────────────── CPs (with evidence) ───────────────────────────
function CPsTab({ deal }: { deal: Deal }) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["deal", deal._id] });
  const [f, setF] = useState({
    type: "Precedent" as CPKind,
    description: "",
    responsible: "",
    deadline: "",
  });

  const addMut = useMutation({
    mutationFn: () => addCP(deal._id, f),
    onSuccess: () => {
      invalidate();
      setF({ ...f, description: "", responsible: "", deadline: "" });
    },
  });
  const patchMut = useMutation({
    mutationFn: ({
      index,
      patch,
    }: {
      index: number;
      patch: Partial<{ status: any; evidence: string }>;
    }) => updateCP(deal._id, index, patch),
    onSuccess: invalidate,
  });

  const today = new Date().toISOString().slice(0, 10);
  const groups = [
    ["Precedent", "Conditions Precedent"],
    ["Subsequent", "Conditions Subsequent"],
  ] as const;
  const cps = deal.cps ?? [];
  const withIndex = cps.map((c, index) => ({ ...c, index }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Longstop monitoring
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Longstop date</div>
            <div
              className={`text-lg font-bold ${deal.longstopDate.slice(0, 10) < today ? "text-rose-600" : ""}`}
            >
              {deal.longstopDate.slice(0, 10)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">CPs at risk</div>
            <div className="text-lg font-bold text-amber-700">
              {cps.filter((c) => c.status === "At Risk").length}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Days remaining</div>
            <div className="text-lg font-bold">
              {Math.max(
                0,
                Math.ceil(
                  (new Date(deal.longstopDate).getTime() - Date.now()) /
                    86400000,
                ),
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add condition</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <Select
            value={f.type}
            onValueChange={(v) => setF({ ...f, type: v as CPKind })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Precedent">Precedent</SelectItem>
              <SelectItem value="Subsequent">Subsequent</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Description"
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
            className="md:col-span-2"
          />
          <Input
            placeholder="Responsible"
            value={f.responsible}
            onChange={(e) => setF({ ...f, responsible: e.target.value })}
          />
          <div className="flex gap-2">
            <Input
              type="date"
              value={f.deadline}
              onChange={(e) => setF({ ...f, deadline: e.target.value })}
            />
            <Button
              disabled={!f.description || addMut.isPending}
              onClick={() => addMut.mutate()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {groups.map(([key, label]) => {
        const rows = withIndex.filter((c) => c.type === key);
        return (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-base">
                {label} ({rows.filter((r) => r.status === "Satisfied").length}/
                {rows.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Responsible</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Evidence</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => (
                    <TableRow key={c.index}>
                      <TableCell className="text-sm">{c.description}</TableCell>
                      <TableCell className="text-xs">{c.responsible}</TableCell>
                      <TableCell
                        className={`text-xs ${c.deadline.slice(0, 10) < today && c.status !== "Satisfied" ? "text-rose-600 font-semibold" : ""}`}
                      >
                        {c.deadline.slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Input
                          className="h-7 text-xs w-32"
                          defaultValue={c.evidence}
                          placeholder="Reference…"
                          onBlur={(e) =>
                            e.target.value !== c.evidence &&
                            patchMut.mutate({
                              index: c.index,
                              patch: { evidence: e.target.value },
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={c.status}
                          onValueChange={(v) =>
                            patchMut.mutate({
                              index: c.index,
                              patch: { status: v },
                            })
                          }
                        >
                          <SelectTrigger className="h-7 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              "Satisfied",
                              "Pending",
                              "At Risk",
                              "Not Yet Due",
                            ].map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-xs text-muted-foreground py-6"
                      >
                        No {label.toLowerCase()}.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─────────────────────────── Signing (with add-signatory) ───────────────────────────
function SigningTab({ deal }: { deal: Deal }) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["deal", deal._id] });
  const checklist = deal.signing?.checklist ?? [];
  const signatories = deal.signing?.signatories ?? [];
  const [item, setItem] = useState({ item: "", owner: "" });
  const [sig, setSig] = useState({ name: "", party: "", role: "" });
  const [details, setDetails] = useState({
    signingDate: deal.signing.signingDate?.slice(0, 10) ?? "",
    venue: deal.signing.venue,
  });

  const addChecklistMut = useMutation({
    mutationFn: () =>
      addSigningChecklistItem(deal._id, item.item, item.owner || "TBD"),
    onSuccess: () => {
      invalidate();
      setItem({ item: "", owner: "" });
    },
  });
  const toggleMut = useMutation({
    mutationFn: (index: number) => toggleSigningChecklistItem(deal._id, index),
    onSuccess: invalidate,
  });
  const addSigMut = useMutation({
    mutationFn: () => addSignatory(deal._id, sig.name, sig.party, sig.role),
    onSuccess: () => {
      invalidate();
      setSig({ name: "", party: "", role: "" });
    },
  });
  const signMut = useMutation({
    mutationFn: (index: number) => markSignatorySigned(deal._id, index),
    onSuccess: invalidate,
  });
  const detailsMut = useMutation({
    mutationFn: () => updateSigningDetails(deal._id, details),
    onSuccess: invalidate,
  });

  const done = checklist.filter((c) => c.status === "Done").length;
  const total = checklist.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Pre-signing checklist ({done}/{total})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={total ? (done / total) * 100 : 0} className="h-2" />
          {checklist.map((c, i) => (
            <label
              key={i}
              className="flex items-center gap-2 text-sm p-2 border rounded cursor-pointer hover:bg-muted/40"
            >
              <input
                type="checkbox"
                checked={c.status === "Done"}
                onChange={() => toggleMut.mutate(i)}
              />
              <span
                className={
                  c.status === "Done"
                    ? "line-through text-muted-foreground"
                    : ""
                }
              >
                {c.item}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {c.owner}
              </span>
            </label>
          ))}
          <div className="flex gap-2 pt-2 border-t">
            <Input
              placeholder="Checklist item"
              value={item.item}
              onChange={(e) => setItem({ ...item, item: e.target.value })}
            />
            <Input
              placeholder="Owner"
              value={item.owner}
              onChange={(e) => setItem({ ...item, owner: e.target.value })}
              className="w-32"
            />
            <Button
              disabled={!item.item || addChecklistMut.isPending}
              onClick={() => addChecklistMut.mutate()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signing session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Signing date</Label>
              <Input
                type="date"
                value={details.signingDate}
                onChange={(e) =>
                  setDetails({ ...details, signingDate: e.target.value })
                }
                onBlur={() => detailsMut.mutate()}
              />
            </div>
            <div>
              <Label className="text-xs">Venue</Label>
              <Input
                value={details.venue}
                onChange={(e) =>
                  setDetails({ ...details, venue: e.target.value })
                }
                onBlur={() => detailsMut.mutate()}
              />
            </div>
          </div>
          <div className="pt-2 border-t">
            <div className="text-xs font-semibold mb-2">Signatories</div>
            {signatories.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between border rounded p-2 mb-1"
              >
                <div>
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {s.party} · {s.role}
                  </div>
                </div>
                {s.signed ? (
                  <Badge
                    variant="outline"
                    className="text-emerald-700 border-emerald-500/30"
                  >
                    Signed {new Date(s.signedAt!).toLocaleDateString()}
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    disabled={signMut.isPending}
                    onClick={() => signMut.mutate(i)}
                  >
                    Mark signed
                  </Button>
                )}
              </div>
            ))}
            {signatories.length === 0 && (
              <div className="text-xs text-muted-foreground">
                No signatories added.
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <Input
                placeholder="Name"
                value={sig.name}
                onChange={(e) => setSig({ ...sig, name: e.target.value })}
              />
              <Input
                placeholder="Party"
                value={sig.party}
                onChange={(e) => setSig({ ...sig, party: e.target.value })}
              />
              <div className="flex gap-1">
                <Input
                  placeholder="Role"
                  value={sig.role}
                  onChange={(e) => setSig({ ...sig, role: e.target.value })}
                />
                <Button
                  size="sm"
                  disabled={!sig.name || !sig.party || addSigMut.isPending}
                  onClick={() => addSigMut.mutate()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────── Post-Completion ───────────────────────────
function PostTab({ deal }: { deal: Deal }) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["deal", deal._id] });
  const postCompletion = deal.postCompletion ?? [];
  const [f, setF] = useState({ item: "", dueDate: "" });

  const addMut = useMutation({
    mutationFn: () =>
      addPostCompletion(
        deal._id,
        f.item,
        f.dueDate || new Date().toISOString().slice(0, 10),
      ),
    onSuccess: () => {
      invalidate();
      setF({ item: "", dueDate: "" });
    },
  });
  const toggleMut = useMutation({
    mutationFn: (index: number) => togglePostCompletion(deal._id, index),
    onSuccess: invalidate,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Archive className="h-4 w-4" />
          Post-Completion register
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {postCompletion.map((p, i) => (
          <label
            key={i}
            className="flex items-center gap-2 text-sm p-2 border rounded cursor-pointer hover:bg-muted/40"
          >
            <input
              type="checkbox"
              checked={p.status === "Done"}
              onChange={() => toggleMut.mutate(i)}
            />
            <span
              className={
                p.status === "Done" ? "line-through text-muted-foreground" : ""
              }
            >
              {p.item}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {p.dueDate.slice(0, 10)}
            </span>
          </label>
        ))}
        <div className="flex gap-2 pt-2 border-t">
          <Input
            placeholder="Register item (e.g. warranty period ends)"
            value={f.item}
            onChange={(e) => setF({ ...f, item: e.target.value })}
          />
          <Input
            type="date"
            value={f.dueDate}
            onChange={(e) => setF({ ...f, dueDate: e.target.value })}
            className="w-40"
          />
          <Button
            disabled={!f.item || addMut.isPending}
            onClick={() => addMut.mutate()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PartiesSection({ deal }: { deal: Deal }) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["deal", deal._id] });
  const parties = deal.parties ?? [];
  const [f, setF] = useState({
    side: "Buyer" as DealPartySide,
    title: "",
    name: "",
    email: "",
    phone: "",
  });

  const addMut = useMutation({
    mutationFn: () => addParty(deal._id, f),
    onSuccess: () => {
      invalidate();
      setF({ side: "Buyer", title: "", name: "", email: "", phone: "" });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to add party"),
  });
  const patchMut = useMutation({
    mutationFn: ({ index, patch }: { index: number; patch: any }) =>
      updateParty(deal._id, index, patch),
    onSuccess: invalidate,
  });
  const removeMut = useMutation({
    mutationFn: (index: number) => removeParty(deal._id, index),
    onSuccess: invalidate,
  });

  const bySide = (side: DealPartySide) =>
    parties.map((p, i) => ({ ...p, index: i })).filter((p) => p.side === side);

  const SideColumn = ({ side }: { side: DealPartySide }) => (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {side} side
      </div>
      {bySide(side).map((p) => (
        <div key={p.index} className="border rounded-md p-2.5 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm">
              <div className="font-medium">
                {p.name}{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  — {p.title}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {p.email}
                {p.phone && ` · ${p.phone}`}
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => removeMut.mutate(p.index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-3 text-xs pt-1 border-t">
            {(["dataRoom", "contractReview", "offerReview"] as const).map(
              (key) => (
                <label
                  key={key}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={p.permissions[key]}
                    onChange={(e) =>
                      patchMut.mutate({
                        index: p.index,
                        patch: { permissions: { [key]: e.target.checked } },
                      })
                    }
                  />
                  {key === "dataRoom"
                    ? "Data room"
                    : key === "contractReview"
                      ? "Contract review"
                      : "Offer review"}
                </label>
              ),
            )}
          </div>
        </div>
      ))}
      {bySide(side).length === 0 && (
        <div className="text-xs text-muted-foreground">
          No {side.toLowerCase()}-side parties yet.
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SideColumn side="Buyer" />
        <SideColumn side="Seller" />
      </div>
      <div className="border-t pt-3 grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
        <Select
          value={f.side}
          onValueChange={(v) => setF({ ...f, side: v as DealPartySide })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Buyer">Buyer</SelectItem>
            <SelectItem value="Seller">Seller</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Title (e.g. Counsel)"
          value={f.title}
          onChange={(e) => setF({ ...f, title: e.target.value })}
        />
        <Input
          placeholder="Name"
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
        />
        <Input
          placeholder="Email"
          type="email"
          value={f.email}
          onChange={(e) => setF({ ...f, email: e.target.value })}
        />
        <Input
          placeholder="Phone"
          value={f.phone}
          onChange={(e) => setF({ ...f, phone: e.target.value })}
        />
        <Button
          disabled={!f.title || !f.name || !f.email || addMut.isPending}
          onClick={() => addMut.mutate()}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>
    </div>
  );
}
