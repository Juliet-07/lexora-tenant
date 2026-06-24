import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Eye,
  Trash2,
  Upload,
  Loader2,
  Download,
  User as UserIcon,
  Briefcase as TenantIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchEmployeeDocuments,
  uploadEmployeeDocumentAsTenant,
  deleteEmployeeDocumentAsTenant,
  fetchMyDocuments,
  uploadMyDocument,
  deleteMyDocument,
  type EmployeeDocumentFile,
} from "@/lib/hr-employee-documents-api";
import { toAbsoluteFileUrl } from "@/lib/hr-employee-documents-api";

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

interface EmployeeDocumentsPanelProps {
  employeeId?: string;
  uploadedBy?: "employee" | "tenant";
  uploadedByName?: string;
}

export function EmployeeDocumentsPanel({
  employeeId,
}: EmployeeDocumentsPanelProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isTenantView = !!employeeId;
  const [preview, setPreview] = useState<EmployeeDocumentFile | null>(null);

  const queryKey = isTenantView
    ? ["employee-documents", employeeId]
    : ["my-documents"];

  const { data: documents = [], isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      isTenantView ? fetchEmployeeDocuments(employeeId!) : fetchMyDocuments(),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      isTenantView
        ? uploadEmployeeDocumentAsTenant(employeeId!, file)
        : uploadMyDocument(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Document uploaded.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to upload document"),
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: string) =>
      isTenantView
        ? deleteEmployeeDocumentAsTenant(documentId)
        : deleteMyDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Document removed.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to remove document"),
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">
          {isTenantView
            ? "Documents uploaded by the employee or added by your team."
            : "Upload documents to your employee file — ID, certificates, proof of address, etc."}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadMutation.mutate(file);
            e.target.value = "";
          }}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading documents…</span>
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No documents uploaded yet.
          </CardContent>
        </Card>
      ) : (
        documents.map((doc) => {
          const canDelete = isTenantView || doc.uploadedBy === "employee";
          return (
            <Card key={doc._id}>
              <CardContent className="p-3 flex items-center justify-between">
                <button
                  onClick={() => setPreview(doc)}
                  className="flex items-center gap-3 min-w-0 text-left hover:underline"
                >
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {doc.label || doc.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {doc.uploadedBy === "tenant" ? (
                        <TenantIcon className="h-3 w-3" />
                      ) : (
                        <UserIcon className="h-3 w-3" />
                      )}
                      {doc.uploadedBy === "tenant"
                        ? "Added by your team"
                        : "Uploaded by employee"}{" "}
                      · {fmt(doc.createdAt)}
                    </p>
                  </div>
                </button>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreview(doc)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  {canDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(doc._id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Preview dialog — SAME pattern as OnboardingDocumentsTab's
          working preview: an iframe, not a direct link/download */}
      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{preview?.label || preview?.fileName}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-3">
              {preview.mimeType === "application/pdf" ? (
                <iframe
                  src={toAbsoluteFileUrl(preview.fileUrl)}
                  className="w-full h-[65vh] border rounded"
                  title={preview.label || preview.fileName}
                />
              ) : preview.mimeType.startsWith("image/") ? (
                <img
                  src={toAbsoluteFileUrl(preview.fileUrl)}
                  alt={preview.label || preview.fileName}
                  className="max-w-full max-h-[65vh] mx-auto rounded border"
                />
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Preview isn't available for this file type. Use the button
                  below to open it directly.
                </p>
              )}
              <Button variant="outline" className="w-full" asChild>
                <a
                  href={toAbsoluteFileUrl(preview.fileUrl)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download className="h-4 w-4 mr-2" /> Open in new tab
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
