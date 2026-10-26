import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Trash2, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  deleteEventDocument,
  uploadEventDocument,
  type CrmEvent,
} from "@/lib/crm/events-api";

const fmtSize = (n: number) =>
  n >= 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`;

// Slides, PDFs and other files shared after the event. Everyone who
// was invited as a client, board member or employee finds them on the
// event in their own portal.
export function EventDocumentsPanel({ event }: { event: CrmEvent }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState("");
  const docs = event.documents ?? [];

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["crm-events"] });

  const uploadMut = useMutation({
    mutationFn: (file: File) =>
      uploadEventDocument(event._id, file, description.trim()),
    onSuccess: () => {
      setDescription("");
      refresh();
      toast({ title: "Document added" });
    },
    onError: (err: any) =>
      toast({
        title: "Upload failed",
        description:
          err?.response?.data?.message ||
          "Could not upload that file (PDF, PowerPoint, Word, Excel, CSV, ZIP, image or MP4 up to 30 MB).",
        variant: "destructive",
      }),
  });
  const deleteMut = useMutation({
    mutationFn: (docId: string) => deleteEventDocument(event._id, docId),
    onSuccess: () => {
      refresh();
      toast({ title: "Document removed" });
    },
  });

  const hasPortalGuests = event.mode !== "External";

  return (
    <div className="space-y-4 pt-4">
      <div>
        <p className="text-sm font-medium">Documents</p>
        <p className="text-xs text-muted-foreground">
          Attach the slides, a PDF handout or the report.{" "}
          {hasPortalGuests
            ? "Invited clients, board members and employees can open them from the event in their own portal."
            : "People who registered can open them from their registration page once the event is completed."}
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-md border bg-muted/20 p-3 sm:flex-row">
        <Input
          className="flex-1"
          placeholder="Short note (optional) — e.g. Final slides"
          maxLength={300}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.png,.jpg,.jpeg,.mp4"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadMut.mutate(f);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
        <Button
          type="button"
          disabled={uploadMut.isPending || event.status === "Cancelled"}
          onClick={() => inputRef.current?.click()}
        >
          {uploadMut.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Upload document
        </Button>
      </div>

      {docs.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No documents attached yet.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 p-3">
              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{d.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {fmtSize(d.size)} ·{" "}
                  {new Date(d.uploadedAt).toLocaleDateString()}
                  {d.description ? ` · ${d.description}` : ""}
                </p>
              </div>
              <Button asChild variant="ghost" size="icon">
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open"
                >
                  <Download className="h-4 w-4" />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={deleteMut.isPending}
                onClick={() => deleteMut.mutate(d.id)}
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
