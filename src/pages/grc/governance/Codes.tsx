import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, BookOpen, Upload, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchGovernanceCodes,
  createGovernanceCode,
  updateCodeBody,
  addCodeDocument,
  removeCodeDocument,
  publishCode,
  startNewCodeVersion,
  deleteGovernanceCode,
  resolveGrcFileUrl,
  type GovernanceCode,
  type GovernanceCodeCategory,
} from "@/lib/grc/governance-api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const CATS: GovernanceCodeCategory[] = [
  "Code of Conduct",
  "Governance Charter",
  "Board Charter",
  "Ethics",
  "Other",
];

export default function GrcCodes() {
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<GovernanceCode | null>(null);

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["grc-codes"],
    queryFn: fetchGovernanceCodes,
  });
  const selectedLive = selected
    ? (codes.find((c) => c._id === selected._id) ?? selected)
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading governance codes…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Governance Codes</h1>
          <p className="text-sm text-muted-foreground">
            Author governance codes and charters, upload supporting documents.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New code
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {codes.map((c) => (
          <Card
            key={c._id}
            className="cursor-pointer hover:shadow-md transition"
            onClick={() => setSelected(c)}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{c.title}</span>
                </div>
                <Badge variant="outline">{c.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {c.category} · v{c.version}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {c.body}
              </p>
              <div className="text-xs text-muted-foreground">
                {c.documents.length} document
                {c.documents.length !== 1 ? "s" : ""}
              </div>
            </CardContent>
          </Card>
        ))}
        {codes.length === 0 && (
          <div className="text-sm text-muted-foreground col-span-full text-center py-12">
            No governance codes yet.
          </div>
        )}
      </div>

      <NewCodeDialog open={newOpen} onOpenChange={setNewOpen} />
      <CodeSheet code={selectedLive} onClose={() => setSelected(null)} />
    </div>
  );
}

function NewCodeDialog({ open, onOpenChange }: any) {
  const queryClient = useQueryClient();
  const [f, setF] = useState<{
    title: string;
    category: GovernanceCodeCategory;
    body: string;
  }>({
    title: "",
    category: "Code of Conduct",
    body: "",
  });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    setPendingFiles((prev) => [...prev, ...Array.from(files)]);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const created = await createGovernanceCode(f);
      // Multiple files, uploaded sequentially against the same
      // single-file endpoint used everywhere else this session.
      for (const file of pendingFiles) {
        await addCodeDocument(created._id, file);
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-codes"] });
      toast({ title: "Code created" });
      setF({ title: "", category: "Code of Conduct", body: "" });
      setPendingFiles([]);
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast({
        title: "Failed to create code",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const submit = () => {
    if (!f.title)
      return toast({ title: "Title required", variant: "destructive" });
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New governance code</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
            />
          </div>
          <div>
            <Label>Category</Label>
            <Select
              value={f.category}
              onValueChange={(v) =>
                setF({ ...f, category: v as GovernanceCodeCategory })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Body</Label>
            <Textarea
              rows={5}
              value={f.body}
              onChange={(e) => setF({ ...f, body: e.target.value })}
            />
          </div>
          <div>
            <Label>Supporting documents</Label>
            <label className="mt-1 flex items-center gap-2 border border-dashed rounded-md px-3 py-3 cursor-pointer hover:bg-muted/50">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Attach PDF, DOCX or other files
              </span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  onFiles(e.target.files);
                  e.currentTarget.value = "";
                }}
              />
            </label>
            {pendingFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {pendingFiles.map((file, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center text-xs border rounded px-2 py-1"
                  >
                    <span>
                      {file.name} ({Math.round(file.size / 1024)} KB)
                    </span>
                    <button
                      onClick={() =>
                        setPendingFiles(pendingFiles.filter((_, x) => x !== i))
                      }
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CodeSheet({
  code,
  onClose,
}: {
  code: GovernanceCode | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState(code?.body ?? "");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["grc-codes"] });
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const saveBodyMut = useMutation({
    mutationFn: () => updateCodeBody(code!._id, body),
    onSuccess: () => {
      invalidate();
      toast({ title: "Body saved" });
    },
    onError: onErr("Failed to save"),
  });
  const addDocMut = useMutation({
    mutationFn: (file: File) => addCodeDocument(code!._id, file),
    onSuccess: () => {
      invalidate();
      toast({ title: "Document attached" });
    },
    onError: onErr("Failed to attach document"),
  });
  const rmDocMut = useMutation({
    mutationFn: (i: number) => removeCodeDocument(code!._id, i),
    onSuccess: invalidate,
    onError: onErr("Failed to remove document"),
  });
  const publishMut = useMutation({
    mutationFn: () => publishCode(code!._id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Published" });
    },
    onError: onErr("Failed to publish"),
  });
  const newVersionMut = useMutation({
    mutationFn: () => startNewCodeVersion(code!._id),
    onSuccess: invalidate,
    onError: onErr("Failed to start new version"),
  });

  if (!code) return null;

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{code.title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{code.category}</Badge>
            <Badge variant="outline">v{code.version}</Badge>
            <Badge variant="outline">{code.status}</Badge>
          </div>
          <div>
            <Label>Body</Label>
            <Textarea
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="flex justify-end mt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => saveBodyMut.mutate()}
                disabled={saveBodyMut.isPending}
              >
                Save body
              </Button>
            </div>
          </div>
          <section className="border-t pt-3">
            <div className="font-medium text-sm mb-2 flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Attached documents
            </div>
            <div className="space-y-1 mb-3">
              {code.documents.map((d, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center text-xs border rounded px-2 py-1"
                >
                  {d.fileUrl ? (
                    <a
                      href={resolveGrcFileUrl(d.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      {d.name}
                    </a>
                  ) : (
                    <span>{d.name}</span>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {new Date(d.uploadedAt).toLocaleDateString()}
                    </span>
                    <button onClick={() => rmDocMut.mutate(i)}>
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
              {code.documents.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  No documents attached.
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 border border-dashed rounded-md px-3 py-4 cursor-pointer hover:bg-muted/50">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {addDocMut.isPending
                  ? "Uploading…"
                  : "Click to attach a PDF, DOCX or other supporting document"}
              </span>
              <input
                type="file"
                className="hidden"
                disabled={addDocMut.isPending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) addDocMut.mutate(file);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </section>
          <div className="flex justify-end gap-2 border-t pt-3">
            {code.status === "Draft" ? (
              <Button
                onClick={() => publishMut.mutate()}
                disabled={publishMut.isPending}
              >
                Publish
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => newVersionMut.mutate()}
                disabled={newVersionMut.isPending}
              >
                Start new version
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
