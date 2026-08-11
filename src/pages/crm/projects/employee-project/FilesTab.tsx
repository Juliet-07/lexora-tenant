import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Paperclip, Download } from "lucide-react";
import { fetchMandateDocumentsForEmployee } from "@/lib/crm/mandates-api";

export function FilesTab({ mandateId }: { mandateId: string }) {
  const { data: files = [], isLoading } = useQuery({
    queryKey: ["mandateDocuments", mandateId, "employee"],
    queryFn: () => fetchMandateDocumentsForEmployee(mandateId),
  });

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
            <Button asChild size="sm" variant="ghost">
              <a href={f.fileUrl} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4" />
              </a>
            </Button>
          </div>
        ))}
        {!files.length && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No documents on this mandate yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
