import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Paperclip, Eye } from "lucide-react";
import {
  fetchMandateDocumentsForEmployee,
  resolveMandateFileUrl,
} from "@/lib/crm/mandates-api";
import {
  DocumentPreviewDialog,
  type PreviewDocument,
} from "@/components/DocumentPreviewDialog";

export function FilesTab({ mandateId }: { mandateId: string }) {
  const { data: files = [], isLoading } = useQuery({
    queryKey: ["mandateDocuments", mandateId, "employee"],
    queryFn: () => fetchMandateDocumentsForEmployee(mandateId),
  });
  const [previewDoc, setPreviewDoc] = useState<PreviewDocument | null>(null);

  if (isLoading)
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Loading files…
      </p>
    );

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        {files.map((f) => (
          <div
            key={f._id}
            className="flex items-center gap-3 p-3 rounded-lg border"
          >
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{f.name}</p>
              <p className="text-xs text-muted-foreground">
                {(f.size / 1024).toFixed(0)} KB · {f.uploadedBy} ·{" "}
                {f.createdAt?.slice(0, 10)} · {f.folder}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setPreviewDoc({
                  url: resolveMandateFileUrl(f.fileUrl)!,
                  name: f.name,
                })
              }
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {!files.length && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No documents on this mandate yet.
          </p>
        )}
      </CardContent>

      <DocumentPreviewDialog
        doc={previewDoc}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
      />
    </Card>
  );
}
