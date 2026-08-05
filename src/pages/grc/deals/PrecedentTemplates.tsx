import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  FileStack,
  FolderOpen,
  Plus,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  fetchPrecedents,
  createPrecedent,
  updatePrecedentContent,
  replacePrecedentDocument,
  deletePrecedent,
  fetchPrecedentFolders,
  createPrecedentFolder,
  deletePrecedentFolder,
  type Precedent,
  type DealType,
} from "@/lib/grc/deals-api";

const TYPES: DealType[] = [
  "M&A",
  "JV",
  "Restructure",
  "Capital Raise",
  "Disposal",
  "Spin-off",
];
const resolveFileUrl = (url: string | null): string | null => {
  if (!url) return null;
  const base = (import.meta.env.VITE_REACT_APP_BASE_URL ?? "").replace(
    /\/api\/?$/,
    "",
  );
  return `${base}${url}`;
};

export default function PrecedentTemplates() {
  const queryClient = useQueryClient();
  const { data: folders = [], isLoading: loadingFolders } = useQuery({
    queryKey: ["precedent-folders"],
    queryFn: fetchPrecedentFolders,
  });
  const { data: precedents = [], isLoading: loadingPrecedents } = useQuery({
    queryKey: ["deals-precedents"],
    queryFn: fetchPrecedents,
  });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState("");
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const selected = precedents.find((p) => p._id === selectedId) ?? null;

  const folderMut = useMutation({
    mutationFn: () => createPrecedentFolder(newFolder.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["precedent-folders"] });
      setNewFolder("");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to create folder"),
  });
  const removeFolderMut = useMutation({
    mutationFn: (id: string) => deletePrecedentFolder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["precedent-folders"] });
      queryClient.invalidateQueries({ queryKey: ["deals-precedents"] });
      setOpenFolder(null);
    },
  });

  const countInFolder = (folderId: string) =>
    precedents.filter((p) => p.folderId === folderId).length;

  if (loadingFolders || loadingPrecedents) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading precedent templates…
      </div>
    );
  }

  // ── Folder list view ──────────────────────────────────────────
  if (!openFolder) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileStack className="h-6 w-6" />
              Precedent Templates
            </h1>
            <p className="text-sm text-muted-foreground">
              Organize templates into folders — upload a Word document to create
              a reusable, editable contract shell.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Folders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {folders.map((f) => (
                  <div
                    key={f._id}
                    onClick={() => setOpenFolder(f._id)}
                    className="border rounded-md p-3 cursor-pointer hover:border-primary transition group relative"
                  >
                    <FolderOpen className="h-6 w-6 text-muted-foreground mb-2" />
                    <div className="text-sm font-medium truncate pr-6">
                      {f.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {countInFolder(f._id)} template(s)
                    </div>
                    <button
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          confirm(
                            `Delete "${f.name}" and every template in it?`,
                          )
                        )
                          removeFolderMut.mutate(f._id);
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
      </div>
    );
  }

  // ── Inside a folder ──────────────────────────────────────────
  const folder = folders.find((f) => f._id === openFolder);
  const rows = precedents.filter((p) => p.folderId === openFolder);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <button
            className="text-muted-foreground hover:text-foreground flex items-center gap-1"
            onClick={() => setOpenFolder(null)}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Precedent Templates
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-semibold text-base">{folder?.name}</span>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Upload precedent
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((p) => (
          <Card
            key={p._id}
            className="cursor-pointer hover:shadow-md transition"
            onClick={() => setSelectedId(p._id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {p.jurisdiction} · {p.fileName}
                  </div>
                </div>
                <Badge variant="outline">{p.type}</Badge>
              </div>
            </CardHeader>
          </Card>
        ))}
        {rows.length === 0 && (
          <div className="col-span-full text-center text-sm text-muted-foreground py-10">
            No templates in this folder yet.
          </div>
        )}
      </div>

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        folderId={openFolder}
      />
      {selected && (
        <PrecedentSheet
          precedent={selected}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function UploadDialog({
  open,
  onOpenChange,
  folderId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  folderId: string;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<DealType>("M&A");
  const [jurisdiction, setJurisdiction] = useState("Rwanda");
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: () =>
      createPrecedent({ name, type, jurisdiction, folderId, file: file! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals-precedents"] });
      toast.success("Precedent created");
      setName("");
      setFile(null);
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to upload"),
  });

  const submit = () => {
    if (!name.trim()) return toast.error("Name required");
    if (!file) return toast.error("Choose a .docx file");
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload precedent</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Standard SPA — Rwanda"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as DealType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
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
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Document (.docx only)</Label>
            <input
              ref={inputRef}
              type="file"
              accept=".docx"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {file ? file.name : "Choose file"}
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              Legacy .doc files aren't supported — re-save as .docx first if
              needed.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PrecedentSheet({
  precedent,
  onClose,
}: {
  precedent: Precedent;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["deals-precedents"] });
  const [content, setContent] = useState(precedent.content);
  const inputRef = useRef<HTMLInputElement>(null);

  const saveMut = useMutation({
    mutationFn: () => updatePrecedentContent(precedent._id, content),
    onSuccess: () => {
      invalidate();
      toast.success("Saved");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to save"),
  });
  const replaceMut = useMutation({
    mutationFn: (file: File) => replacePrecedentDocument(precedent._id, file),
    onSuccess: (p) => {
      invalidate();
      setContent(p.content);
      toast.success("Document replaced");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to replace document"),
  });
  const deleteMut = useMutation({
    mutationFn: () => deletePrecedent(precedent._id),
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  const handleReplace = (file: File) => {
    if (
      confirm(
        "Replacing the document will overwrite any manual edits made here with the newly uploaded file's content. Continue?",
      )
    ) {
      replaceMut.mutate(file);
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{precedent.name}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{precedent.type}</Badge>
            <Badge variant="outline">{precedent.jurisdiction}</Badge>
            {precedent.fileUrl && (
              <a
                href={resolveFileUrl(precedent.fileUrl) ?? "#"}
                target="_blank"
                rel="noreferrer"
              >
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-1" />
                  {precedent.fileName}
                </Button>
              </a>
            )}
          </div>

          <RichTextEditor
            value={content}
            onChange={setContent}
            minHeight={400}
          />

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={saveMut.isPending}
              onClick={() => saveMut.mutate()}
            >
              {saveMut.isPending ? "Saving…" : "Save changes"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".docx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleReplace(f);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              disabled={replaceMut.isPending}
              onClick={() => inputRef.current?.click()}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              {replaceMut.isPending ? "Replacing…" : "Replace document"}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => deleteMut.mutate()}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
