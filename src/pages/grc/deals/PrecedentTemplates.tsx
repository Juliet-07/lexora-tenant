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
  Plus,
  Upload,
  Download,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  fetchPrecedents,
  createPrecedent,
  updatePrecedentContent,
  replacePrecedentDocument,
  deletePrecedent,
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
  const { data: precedents = [], isLoading } = useQuery({
    queryKey: ["deals-precedents"],
    queryFn: fetchPrecedents,
  });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = precedents.find((p) => p._id === selectedId) ?? null;

  if (isLoading)
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading precedent templates…
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileStack className="h-6 w-6" />
            Precedent Templates
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload a Word document to create a reusable, editable contract
            shell.
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Upload precedent
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {precedents.map((p) => (
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
        {precedents.length === 0 && (
          <div className="col-span-full text-center text-sm text-muted-foreground py-10">
            No precedent templates yet — upload a .docx to create one.
          </div>
        )}
      </div>

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
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
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<DealType>("M&A");
  const [jurisdiction, setJurisdiction] = useState("Rwanda");
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: () =>
      createPrecedent({ name, type, jurisdiction, file: file! }),
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
