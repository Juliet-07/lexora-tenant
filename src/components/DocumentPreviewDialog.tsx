import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, FileText } from "lucide-react";

// A single place to preview any already-uploaded document (PDF, image,
// or Office file) inside a popup, instead of navigating away to a raw
// file URL in a new tab — which is how several "View document" links
// across the platform ended up pointing at a relative /uploads/... path
// resolved against the tenant app's own origin instead of the API's,
// producing a 404. Callers are still responsible for resolving that URL
// first (each module already has its own resolve*FileUrl helper for
// this) — this component only renders whatever absolute URL it's given.

export interface PreviewDocument {
  /** Already-resolved, absolute URL. */
  url: string;
  /** Display name — used as the dialog title and the downloaded filename. */
  name?: string;
}

interface DocumentPreviewDialogProps {
  doc: PreviewDocument | null;
  onOpenChange: (open: boolean) => void;
  /**
   * Default true. Set false to hide every download/open-elsewhere
   * affordance (the Board Portal's Document Vault, for example, wants
   * documents viewable but not downloadable). This removes the obvious
   * UI paths to save a copy — like any browser-rendered preview, it
   * can't make the underlying file truly un-savable.
   */
  allowDownload?: boolean;
}

const isImageUrl = (url: string) =>
  /\.(png|jpe?g|gif|webp|svg)(\?|#|$)/i.test(url);
const isPdfUrl = (url: string) => /\.pdf(\?|#|$)/i.test(url);
const isOfficeUrl = (url: string) => /\.(docx?|pptx?|xlsx?)(\?|#|$)/i.test(url);

export function DocumentPreviewDialog({
  doc,
  onOpenChange,
  allowDownload = true,
}: DocumentPreviewDialogProps) {
  const open = !!doc;
  const url = doc?.url ?? "";
  const name = doc?.name || "Document";
  const pdf = isPdfUrl(url);
  const img = isImageUrl(url);
  const office = !pdf && !img && isOfficeUrl(url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl w-[95vw] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden"
        onContextMenu={!allowDownload ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader className="flex-row items-center justify-between gap-3 border-b px-4 py-3 space-y-0">
          <DialogTitle className="truncate text-sm font-medium pr-6">
            {name}
          </DialogTitle>
          {allowDownload && url && (
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <a href={url} download={name} target="_blank" rel="noreferrer">
                <Download className="h-3.5 w-3.5 mr-1.5" /> Download
              </a>
            </Button>
          )}
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-muted/30">
          {!url ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              No file to preview.
            </div>
          ) : pdf ? (
            <iframe src={url} title={name} className="w-full h-full border-0" />
          ) : img ? (
            <div className="h-full w-full flex items-center justify-center p-4 overflow-auto">
              <img
                src={url}
                alt={name}
                className="max-w-full max-h-full object-contain"
                draggable={allowDownload}
              />
            </div>
          ) : office ? (
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
              title={name}
              className="w-full h-full border-0"
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground p-6 text-center">
              <FileText className="h-10 w-10" />
              <p>This file type can't be previewed inline.</p>
              {allowDownload && (
                <Button asChild size="sm" variant="outline">
                  <a href={url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open in a
                    new tab
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
