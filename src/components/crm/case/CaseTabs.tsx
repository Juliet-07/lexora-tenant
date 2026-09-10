import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DocumentEditorDialog } from "@/components/DocumentEditorDialog";
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
import {
  Folder,
  Upload,
  FolderPlus,
  Phone,
  Plus,
  FileText,
  Download,
  Send,
  Mail,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchAdrCase,
  fetchAdrMessages,
  sendAdrMessage,
  sendAdrPartyEmail,
  addAdrTimelineEntry,
  fetchAdrDrafts,
  createAdrDraft,
  saveAdrDraftVersion,
  updateAdrDraftStatus,
  fetchAdrDocuments,
  uploadAdrDocument,
  fetchAdrFolders,
  createAdrFolder,
  type AdrDraft,
  type AdrDocument,
} from "@/lib/crm/adr-api";
import { fetchAvailableTemplates } from "@/lib/crm/tools-api";
import {
  fetchTimeEntries,
  approveTimeEntry,
  rejectTimeEntry,
  approveForBilling,
} from "@/lib/crm/time-tracking-api";
import {
  mockDeadlineRules,
  mockAuditTrail,
  mockAccessMatrix,
} from "@/data/caseDetailMock";

/** Internal notes + external correspondence in one thread. */
export function CaseCommunicationsTab({
  caseId,
  caseType,
}: {
  caseId: string;
  caseType: "ADR" | "Litigation";
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (caseType === "Litigation") {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Litigation communication is coming in the next phase of this build —
        available today for ADR cases.
      </p>
    );
  }

  // Shares the same query key the parent case page already uses, so
  // this reads from cache rather than firing a duplicate fetch.
  const { data: c } = useQuery({
    queryKey: ["adrCase", caseId],
    queryFn: () => fetchAdrCase(caseId),
  });
  const { data: messages = [] } = useQuery({
    queryKey: ["adrMessages", caseId],
    queryFn: () => fetchAdrMessages(caseId),
  });

  const [clientText, setClientText] = useState("");
  const clientMsgMut = useMutation({
    mutationFn: () => sendAdrMessage(caseId, "You", clientText.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adrMessages", caseId] });
      setClientText("");
      toast({ title: "Message sent to client" });
    },
    onError: (err: any) =>
      toast({
        title: "Could not send message",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const [noteTitle, setNoteTitle] = useState("");
  const noteMut = useMutation({
    mutationFn: () => addAdrTimelineEntry(caseId, { title: noteTitle.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adrCase", caseId] });
      setNoteTitle("");
      toast({ title: "Internal note added" });
    },
  });

  const [selectedPartyIds, setSelectedPartyIds] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const partiesWithEmail = (c?.parties ?? []).filter((p) => p.email);
  const partyEmailMut = useMutation({
    mutationFn: () =>
      sendAdrPartyEmail(caseId, {
        partyIds: selectedPartyIds,
        subject: emailSubject.trim(),
        body: emailBody.trim(),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["adrCase", caseId] });
      setSelectedPartyIds([]);
      setEmailSubject("");
      setEmailBody("");
      toast({
        title: "Email sent",
        description: `Sent to ${res.sentTo.join(", ")}`,
      });
    },
    onError: (err: any) =>
      toast({
        title: "Could not send email",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const internalNotes = (c?.timeline ?? []).filter(
    (t) => t.source === "Manual",
  );
  const partyEmailLog = (c?.timeline ?? []).filter((t) =>
    t.title.startsWith("Email sent to"),
  );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Client
        </p>
        <div className="max-h-72 space-y-2 overflow-y-auto rounded border p-3">
          {!messages.length && (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          )}
          {messages.map((m) => (
            <div
              key={m._id}
              className={`rounded-lg p-2.5 text-sm ${m.direction === "tenant" ? "bg-primary/5" : "bg-muted/40"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">{m.author}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(m.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-1">{m.body}</p>
            </div>
          ))}
        </div>
        {!c?.mandateName ? (
          <p className="text-xs text-muted-foreground">
            No mandate linked — nothing to message here.
          </p>
        ) : (
          <div className="flex gap-2">
            <Textarea
              className="min-h-[60px] flex-1"
              placeholder="Message the client…"
              value={clientText}
              onChange={(e) => setClientText(e.target.value)}
            />
            <Button
              disabled={clientMsgMut.isPending || !clientText.trim()}
              onClick={() => clientMsgMut.mutate()}
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Mail className="h-3.5 w-3.5" /> Parties
        </p>
        <div className="max-h-72 space-y-2 overflow-y-auto rounded border p-3">
          {!partyEmailLog.length && (
            <p className="text-sm text-muted-foreground">
              No emails sent to parties yet.
            </p>
          )}
          {partyEmailLog.map((t, i) => (
            <div key={i} className="rounded-lg bg-muted/40 p-2.5 text-sm">
              <p className="text-xs font-semibold">{t.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t.description}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {new Date(t.at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
        {!partiesWithEmail.length ? (
          <p className="text-xs text-muted-foreground">
            No parties on this case have an email on file.
          </p>
        ) : (
          <div className="space-y-2 rounded border p-2">
            {partiesWithEmail.map((p) => (
              <label key={p._id} className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={selectedPartyIds.includes(p._id)}
                  onCheckedChange={() =>
                    setSelectedPartyIds((ids) =>
                      ids.includes(p._id)
                        ? ids.filter((x) => x !== p._id)
                        : [...ids, p._id],
                    )
                  }
                />
                {p.name} ({p.role})
              </label>
            ))}
            <Input
              placeholder="Subject"
              className="h-8 text-xs"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
            />
            <Textarea
              placeholder="Message…"
              className="min-h-[60px] text-xs"
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
            />
            <Button
              size="sm"
              className="w-full"
              disabled={
                partyEmailMut.isPending ||
                !selectedPartyIds.length ||
                !emailSubject.trim() ||
                !emailBody.trim()
              }
              onClick={() => partyEmailMut.mutate()}
            >
              Send
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Internal notes
        </p>
        <div className="max-h-72 space-y-2 overflow-y-auto rounded border p-3">
          {!internalNotes.length && (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          )}
          {internalNotes.map((t, i) => (
            <div key={i} className="rounded-lg bg-muted/40 p-2.5 text-sm">
              <p>{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t.description}
                </p>
              )}
              <p className="mt-1 text-[10px] text-muted-foreground">
                {new Date(t.at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Note for the case team…"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
          />
          <Button
            disabled={noteMut.isPending || !noteTitle.trim()}
            onClick={() => noteMut.mutate()}
          >
            Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Visible to the case team only — never sent to the client or parties.
        </p>
      </div>
    </div>
  );
}

/** Drafting workspace — documents being authored on this case. */
export function CaseDraftingTab({
  caseId,
  caseType,
}: {
  caseId: string;
  caseType: "ADR" | "Litigation";
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (caseType === "Litigation") {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Litigation drafting is coming in the next phase of this build —
        available today for ADR cases.
      </p>
    );
  }

  const tone: Record<string, string> = {
    Final: "bg-emerald-100 text-emerald-700 border-emerald-200",
    "In review": "bg-amber-100 text-amber-700 border-amber-200",
    Draft: "bg-muted text-muted-foreground border-border",
  };

  const { data: drafts = [] } = useQuery({
    queryKey: ["adrDrafts", caseId],
    queryFn: () => fetchAdrDrafts(caseId),
  });
  const { data: templates = [] } = useQuery({
    queryKey: ["adr-litigation-templates"],
    queryFn: () => fetchAvailableTemplates("crm", "adr-litigation"),
    staleTime: 5 * 60_000,
  });

  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTemplateId, setNewTemplateId] = useState<string>("blank");
  const createMut = useMutation({
    mutationFn: () =>
      createAdrDraft(caseId, {
        title: newTitle.trim(),
        templateId: newTemplateId === "blank" ? undefined : newTemplateId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adrDrafts", caseId] });
      setNewOpen(false);
      setNewTitle("");
      setNewTemplateId("blank");
      toast({ title: "Draft created" });
    },
  });

  const [editingDraft, setEditingDraft] = useState<AdrDraft | null>(null);
  const [historyDraft, setHistoryDraft] = useState<AdrDraft | null>(null);
  const saveMut = useMutation({
    mutationFn: (content: string) =>
      saveAdrDraftVersion(caseId, editingDraft!._id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adrDrafts", caseId] });
      setEditingDraft(null);
      toast({ title: "Version saved" });
    },
  });
  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdrDraft["status"] }) =>
      updateAdrDraftStatus(caseId, id, status),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["adrDrafts", caseId] });
      queryClient.invalidateQueries({ queryKey: ["adrDocuments", caseId] });
      queryClient.invalidateQueries({ queryKey: ["adrCase", caseId] });
      toast({
        title:
          vars.status === "Final"
            ? "Finalised — filed to Documents"
            : `Status set to ${vars.status}`,
      });
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Documents being drafted on this case. Finalised drafts move into
          Documents and lock a version.
        </p>
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> New draft
        </Button>
      </div>
      {drafts.map((d) => (
        <Card key={d._id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">{d.title}</p>
                <p className="text-xs text-muted-foreground">
                  v{d.currentVersion}
                  {d.sourceTemplateTitle && ` · from ${d.sourceTemplateTitle}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {d.status !== "Final" && (
                <Select
                  value={d.status}
                  onValueChange={(v) =>
                    statusMut.mutate({
                      id: d._id,
                      status: v as AdrDraft["status"],
                    })
                  }
                >
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="In review">In review</SelectItem>
                    <SelectItem value="Final">Final</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {d.status === "Final" && (
                <Badge variant="outline" className={tone.Final}>
                  Final
                </Badge>
              )}
              {d.versions.length > 1 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setHistoryDraft(d)}
                >
                  History
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingDraft(d)}
              >
                Open editor
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {!drafts.length && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No drafts started yet.
        </p>
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New draft</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Start from</Label>
              <Select value={newTemplateId} onValueChange={setNewTemplateId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blank">Blank document</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={createMut.isPending || !newTitle.trim()}
              onClick={() => createMut.mutate()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingDraft && (
        <DocumentEditorDialog
          open={!!editingDraft}
          title={editingDraft.title}
          subtitle={`v${editingDraft.currentVersion} → v${editingDraft.currentVersion + 1} on save`}
          value={editingDraft.content}
          saving={saveMut.isPending}
          onClose={() => setEditingDraft(null)}
          onSave={(html) => saveMut.mutate(html)}
        />
      )}

      <Dialog
        open={!!historyDraft}
        onOpenChange={(o) => !o && setHistoryDraft(null)}
      >
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Version history — {historyDraft?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {historyDraft?.versions
              .slice()
              .reverse()
              .map((v) => (
                <div key={v._id} className="rounded border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      Version {v.versionNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {v.savedBy} · {new Date(v.savedAt).toLocaleString()}
                    </p>
                  </div>
                  <div
                    className="prose prose-sm mt-2 max-h-40 max-w-none overflow-y-auto text-xs"
                    dangerouslySetInnerHTML={{ __html: v.content }}
                  />
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Folder-organised case documents. */
export function CaseDocumentsTab({
  caseId,
  caseType,
}: {
  caseId: string;
  caseType: "ADR" | "Litigation";
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (caseType === "Litigation") {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Litigation documents are coming in the next phase of this build —
        available today for ADR cases.
      </p>
    );
  }

  const { data: documents = [] } = useQuery({
    queryKey: ["adrDocuments", caseId],
    queryFn: () => fetchAdrDocuments(caseId),
  });
  const { data: folders = ["General"] } = useQuery({
    queryKey: ["adrFolders", caseId],
    queryFn: () => fetchAdrFolders(caseId),
  });

  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const folderMut = useMutation({
    mutationFn: () => createAdrFolder(caseId, newFolderName.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adrFolders", caseId] });
      setNewFolderOpen(false);
      setNewFolderName("");
      toast({ title: "Folder created" });
    },
  });

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFolder, setUploadFolder] = useState("General");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = { current: null as HTMLInputElement | null };
  const uploadMut = useMutation({
    mutationFn: () => uploadAdrDocument(caseId, uploadFolder, pendingFile!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adrDocuments", caseId] });
      setUploadOpen(false);
      setPendingFile(null);
      toast({ title: "Document uploaded" });
    },
  });

  const [previewing, setPreviewing] = useState<AdrDocument | null>(null);

  const folderCounts = documents.reduce<Record<string, number>>((acc, d) => {
    acc[d.folder] = (acc[d.folder] ?? 0) + 1;
    return acc;
  }, {});
  const folderTones = [
    "bg-primary/10 text-primary",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-violet-100 text-violet-700",
  ];
  const visibleDocs = activeFolder
    ? documents.filter((d) => d.folder === activeFolder)
    : documents;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {documents.length} documents, organised into folders for this case.
        </p>
        <div className="flex gap-2">
          <input
            ref={(el) => (fileInputRef.current = el)}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setPendingFile(file);
                setUploadFolder(activeFolder ?? folders[0] ?? "General");
                setUploadOpen(true);
              }
              e.target.value = "";
            }}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setNewFolderOpen(true)}
          >
            <FolderPlus className="mr-1.5 h-4 w-4" /> New folder
          </Button>
          <Button size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-1.5 h-4 w-4" /> Upload
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {folders.map((name, i) => (
          <Card
            key={name}
            className={`cursor-pointer transition-colors ${activeFolder === name ? "border-primary ring-1 ring-primary" : "hover:border-primary/50"}`}
            onClick={() => setActiveFolder(activeFolder === name ? null : name)}
          >
            <CardContent className="p-4">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${folderTones[i % folderTones.length]}`}
              >
                <Folder className="h-4.5 w-4.5" />
              </div>
              <p className="mt-3 text-sm font-semibold">{name}</p>
              <p className="text-xs text-muted-foreground">
                {folderCounts[name] ?? 0} documents
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold">
            {activeFolder ? `"${activeFolder}"` : "All documents"}
          </h4>
          {activeFolder && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setActiveFolder(null)}
            >
              Clear filter
            </Button>
          )}
        </div>
        <Card>
          <CardContent className="divide-y p-0">
            {visibleDocs.map((d) => (
              <div
                key={d._id}
                className="flex flex-wrap items-start justify-between gap-3 p-4"
              >
                <div className="flex gap-3">
                  <div className="h-9 w-7 shrink-0 rounded bg-muted" />
                  <div>
                    <p className="text-sm font-semibold">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.folder} · {new Date(d.createdAt).toLocaleDateString()}{" "}
                      · {d.uploadedBy}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {d.content ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewing(d)}
                    >
                      View
                    </Button>
                  ) : (
                    <a
                      href={d.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary underline"
                    >
                      Open
                    </a>
                  )}
                </div>
              </div>
            ))}
            {!visibleDocs.length && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No documents here yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
          <DialogFooter>
            <Button
              disabled={folderMut.isPending || !newFolderName.trim()}
              onClick={() => folderMut.mutate()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload — {pendingFile?.name}</DialogTitle>
          </DialogHeader>
          <div>
            <Label className="text-xs">Folder</Label>
            <Select value={uploadFolder} onValueChange={setUploadFolder}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {folders.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              disabled={uploadMut.isPending}
              onClick={() => uploadMut.mutate()}
            >
              {uploadMut.isPending ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!previewing}
        onOpenChange={(o) => !o && setPreviewing(null)}
      >
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewing?.name}</DialogTitle>
          </DialogHeader>
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: previewing?.content ?? "" }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Computed deadlines driven by trigger + rule, never typed in. */
export function CaseDeadlineRulesTab({ caseId }: { caseId: string }) {
  const rules = mockDeadlineRules(caseId);
  const tone: Record<string, string> = {
    met: "bg-emerald-100 text-emerald-700 border-emerald-200",
    due: "bg-amber-100 text-amber-700 border-amber-200",
    idle: "bg-muted text-muted-foreground border-border",
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Deadlines here are computed from rules, not typed in. Set a trigger
        event and a rule once; the due date — and anything that cascades from it
        — updates itself.
      </p>
      {rules.map((r) => (
        <Card key={r.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm">
              <span className="font-semibold">Trigger: </span>
              {r.trigger}
            </p>
            <p className="text-sm text-muted-foreground">→ {r.rule}</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={tone[r.tone]}>
                {r.status}
              </Badge>
              <Button size="sm" variant="outline">
                Edit rule
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button size="sm">
        <Plus className="mr-1.5 h-4 w-4" /> Add deadline rule
      </Button>
    </div>
  );
}

/** Time entries and disbursement summary for the case. */
export function CaseTimeBillingTab({
  caseId,
  caseType,
  hours,
  fees,
  disbursed,
}: {
  caseId: string;
  caseType: "ADR" | "Litigation";
  hours: string;
  fees: string;
  disbursed: string;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (caseType === "Litigation") {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Litigation time & billing is coming in the next phase of this build —
        available today for ADR cases.
      </p>
    );
  }

  const { data: entries = [] } = useQuery({
    queryKey: ["adrTimeEntries", caseId],
    queryFn: () => fetchTimeEntries({ adrCaseId: caseId }),
  });

  const statusTone: Record<string, string> = {
    Draft: "bg-muted text-muted-foreground border-border",
    Submitted: "bg-amber-100 text-amber-700 border-amber-200",
    "Lead Approved": "bg-amber-100 text-amber-700 border-amber-200",
    Approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Rejected: "bg-destructive/10 text-destructive border-destructive/20",
  };

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["adrTimeEntries", caseId] });

  const approveMut = useMutation({
    mutationFn: (id: string) => approveTimeEntry(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Entry approved" });
    },
  });
  const billMut = useMutation({
    mutationFn: (id: string) => approveForBilling(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Approved for billing" });
    },
  });
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const rejectMut = useMutation({
    mutationFn: () => rejectTimeEntry(rejectingId!, rejectReason.trim()),
    onSuccess: () => {
      invalidate();
      setRejectingId(null);
      setRejectReason("");
      toast({ title: "Entry rejected" });
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {hours} logged · {fees} fees · {disbursed} disbursements. Time is
          logged by the assigned team from their own Cases view.
        </p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Timekeeper</TableHead>
                <TableHead>Narrative</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Billing</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e._id}>
                  <TableCell className="text-sm">
                    {e.date?.slice(0, 10)}
                  </TableCell>
                  <TableCell className="text-sm">{e.member}</TableCell>
                  <TableCell className="text-sm">
                    {e.narrative || e.taskTitle}
                  </TableCell>
                  <TableCell className="text-sm">{e.hours}</TableCell>
                  <TableCell className="text-sm">
                    {(e.hours * e.rate).toLocaleString(undefined, {
                      style: "currency",
                      currency: e.currency || "USD",
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusTone[e.status]}>
                      {e.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {e.wipBillingStatus}
                  </TableCell>
                  <TableCell className="text-right">
                    {e.status === "Submitted" && (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveMut.mutate(e._id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRejectingId(e._id)}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                    {e.status === "Approved" &&
                      e.wipBillingStatus === "Unbilled" && (
                        <Button size="sm" onClick={() => billMut.mutate(e._id)}>
                          Approve for billing
                        </Button>
                      )}
                  </TableCell>
                </TableRow>
              ))}
              {!entries.length && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No time logged on this case yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={!!rejectingId}
        onOpenChange={(o) => !o && setRejectingId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject time entry</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Reason…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={rejectMut.isPending || !rejectReason.trim()}
              onClick={() => rejectMut.mutate()}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Audit trail plus confidentiality / access matrix. */
export function CaseAuditAccessTab() {
  const trail = mockAuditTrail();
  const access = mockAccessMatrix();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Audit trail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {trail.map((t) => (
            <div key={t.title} className="flex gap-3">
              <div
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${t.tone}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">{t.title}</p>
                  <span className="text-xs text-muted-foreground">{t.at}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t.detail}</p>
              </div>
            </div>
          ))}
          <Button variant="link" size="sm" className="px-0">
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export full audit trail
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Confidentiality &amp; access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {access.map((a) => (
            <div
              key={a.who}
              className="flex items-center justify-between gap-2"
            >
              <span className="text-sm">{a.who}</span>
              <Badge
                variant="outline"
                className={`shrink-0 text-[10px] ${a.tone}`}
              >
                {a.level}
              </Badge>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="mr-1.5 h-4 w-4" /> Manage access
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/** A named search box used above case lists. */
export function CaseSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="max-w-xs"
    />
  );
}
