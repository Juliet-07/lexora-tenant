import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Link2, FileUp, Plus, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  getOnboardingDocs,
  upsertOnboardingDoc,
  removeOnboardingDoc,
  saveOnboardingDocs,
  type OnboardingDoc,
  type OnboardingDocKind,
} from "@/lib/onboardingStore";

const KIND_ICON: Record<OnboardingDocKind, any> = {
  text: FileText,
  link: Link2,
  pdf: FileUp,
};

const fileToDataUrl = (f: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(f);
  });

export default function OnboardingDocumentsTab() {
  const [docs, setDocs] = useState<OnboardingDoc[]>([]);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<OnboardingDoc | null>(null);

  const [form, setForm] = useState<{
    title: string;
    kind: OnboardingDocKind;
    content: string;
    fileName?: string;
  }>({ title: "", kind: "text", content: "" });

  useEffect(() => {
    setDocs(getOnboardingDocs());
  }, []);

  const refresh = () => setDocs(getOnboardingDocs());

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("PDF files only.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("PDF must be under 5MB.");
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setForm((f) => ({ ...f, content: dataUrl, fileName: file.name }));
  };

  const submit = () => {
    if (!form.title.trim()) return toast.error("Add a title.");
    if (!form.content) return toast.error("Add content, link or upload PDF.");
    upsertOnboardingDoc({
      id: `OD-${Date.now()}`,
      title: form.title.trim(),
      kind: form.kind,
      content: form.content,
      fileName: form.fileName,
      active: true,
      createdAt: new Date().toISOString(),
    });
    setForm({ title: "", kind: "text", content: "" });
    setOpen(false);
    refresh();
    toast.success("Document added.");
  };

  const toggleActive = (id: string, active: boolean) => {
    const next = docs.map((d) => (d.id === id ? { ...d, active } : d));
    setDocs(next);
    saveOnboardingDocs(next);
  };

  const remove = (id: string) => {
    removeOnboardingDoc(id);
    refresh();
    toast.success("Document removed.");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Onboarding Documents</h3>
          <p className="text-sm text-muted-foreground">
            Tenant-wide. Employees must read and agree to all active documents
            on first login before accessing the app.
          </p>
        </div>
        <Button
          className="bg-gradient-to-r from-primary to-secondary"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" /> New Document
        </Button>
      </div>

      {docs.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No onboarding documents yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => {
            const Icon = KIND_ICON[d.kind];
            return (
              <Card key={d.id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Icon className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{d.title}</p>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {d.kind}
                      </Badge>
                      {!d.active && (
                        <Badge variant="secondary" className="text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {d.kind === "link"
                        ? d.content
                        : d.kind === "pdf"
                          ? d.fileName ?? "PDF document"
                          : d.content.slice(0, 120) +
                            (d.content.length > 120 ? "…" : "")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={d.active}
                      onCheckedChange={(v) => toggleActive(d.id, v)}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setPreview(d)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(d.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New document dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Onboarding Document</DialogTitle>
            <DialogDescription>
              Provide a title and either pasted text, a link, or upload a PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="e.g. Code of Conduct"
              />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select
                value={form.kind}
                onValueChange={(v: OnboardingDocKind) =>
                  setForm({ title: form.title, kind: v, content: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Pasted Text</SelectItem>
                  <SelectItem value="link">External Link</SelectItem>
                  <SelectItem value="pdf">Upload PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.kind === "text" && (
              <div className="space-y-1">
                <Label>Content</Label>
                <Textarea
                  rows={8}
                  value={form.content}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, content: e.target.value }))
                  }
                  placeholder="Paste the policy text here…"
                />
              </div>
            )}
            {form.kind === "link" && (
              <div className="space-y-1">
                <Label>URL</Label>
                <Input
                  type="url"
                  value={form.content}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, content: e.target.value }))
                  }
                  placeholder="https://…"
                />
              </div>
            )}
            {form.kind === "pdf" && (
              <div className="space-y-1">
                <Label>PDF File</Label>
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                {form.fileName && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {form.fileName}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              Add Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{preview?.title}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="text-sm">
              {preview.kind === "text" && (
                <div className="whitespace-pre-wrap">{preview.content}</div>
              )}
              {preview.kind === "link" && (
                <a
                  href={preview.content}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline break-all"
                >
                  {preview.content}
                </a>
              )}
              {preview.kind === "pdf" && (
                <iframe
                  src={preview.content}
                  className="w-full h-[60vh] border rounded"
                  title={preview.title}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
