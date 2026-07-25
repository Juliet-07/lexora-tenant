import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { FileText, FileUp, Plus, Trash2, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  fetchOnboardingDocuments,
  createOnboardingDocument,
  updateOnboardingDocument,
  deleteOnboardingDocument,
  type OnboardingDocument,
  type OnboardingDocType,
} from "@/lib/hr/hr-api";

const KIND_ICON: Record<OnboardingDocType, any> = {
  text: FileText,
  pdf: FileUp,
};

export default function OnboardingDocumentsTab() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<OnboardingDocument | null>(null);

  const [form, setForm] = useState<{
    title: string;
    type: OnboardingDocType;
    content: string;
    file?: File;
  }>({ title: "", type: "text", content: "" });

  // ── Queries ───────────────────────────────────────────────

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["onboarding-documents"],
    queryFn: () => fetchOnboardingDocuments(true), // include inactive for admin view
    staleTime: 30_000,
  });

  // ── Mutations ─────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: createOnboardingDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-documents"] });
      setForm({ title: "", type: "text", content: "" });
      setOpen(false);
      toast.success("Document added.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to add document"),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateOnboardingDocument(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-documents"] });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to update document"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOnboardingDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-documents"] });
      toast.success("Document removed.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to remove document"),
  });

  // ── Handlers ──────────────────────────────────────────────

  const handleFile = (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("PDF files only.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("PDF must be under 10MB.");
      return;
    }
    setForm((f) => ({ ...f, file }));
  };

  const submit = () => {
    if (!form.title.trim()) return toast.error("Add a title.");
    if (form.type === "text" && !form.content.trim())
      return toast.error("Add the policy text.");
    if (form.type === "pdf" && !form.file)
      return toast.error("Select a PDF file to upload.");

    createMutation.mutate({
      title: form.title.trim(),
      type: form.type,
      content: form.type === "text" ? form.content : undefined,
      file: form.type === "pdf" ? form.file : undefined,
    });
  };

  // ─────────────────────────────────────────────────────────
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

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading documents…
        </div>
      ) : docs.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No onboarding documents yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => {
            const Icon = KIND_ICON[d.type];
            return (
              <Card key={d._id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Icon className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{d.title}</p>
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase"
                      >
                        {d.type}
                      </Badge>
                      {!d.isActive && (
                        <Badge variant="secondary" className="text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {d.type === "pdf"
                        ? (d.originalFileName ?? "PDF document")
                        : (d.content ?? "").slice(0, 120) +
                          ((d.content?.length ?? 0) > 120 ? "…" : "")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={d.isActive}
                      disabled={toggleActiveMutation.isPending}
                      onCheckedChange={(v) =>
                        toggleActiveMutation.mutate({ id: d._id, isActive: v })
                      }
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
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(d._id)}
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
              Provide a title and either pasted text or an uploaded PDF.
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
                value={form.type}
                onValueChange={(v: OnboardingDocType) =>
                  setForm({ title: form.title, type: v, content: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Pasted Text</SelectItem>
                  <SelectItem value="pdf">Upload PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.type === "text" && (
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
            {form.type === "pdf" && (
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
                {form.file && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {form.file.name}
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
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding…
                </>
              ) : (
                "Add Document"
              )}
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
              {preview.type === "text" && (
                <div className="whitespace-pre-wrap">{preview.content}</div>
              )}
              {preview.type === "pdf" && preview.fileUrl && (
                <iframe
                  src={preview.fileUrl}
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
