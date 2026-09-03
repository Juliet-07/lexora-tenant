import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Save, X, Pencil, Eye } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";

interface DocumentEditorDialogProps {
  open: boolean;
  title: string;
  /** Optional short line under the title — e.g. which document/client this is. */
  subtitle?: string;
  value: string;
  onClose: () => void;
  onSave: (html: string) => void;
  saving?: boolean;
}

// Shared, dedicated editing surface — a full-size popup around the
// same real RichTextEditor the CRM contract page uses, rather than
// squeezing a rich-text toolbar into an already-small detail dialog.
// Deliberately generic (title/subtitle/value/onSave) so any module
// that needs to edit a document body — HR contracts, GRC policies,
// whatever comes next — can reuse this one surface instead of each
// building its own.
export function DocumentEditorDialog({
  open,
  title,
  subtitle,
  value,
  onClose,
  onSave,
  saving = false,
}: DocumentEditorDialogProps) {
  const [draft, setDraft] = useState(value);
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  // Reset the draft (and always land back on Edit) each time the
  // dialog opens, so a previous, unsaved edit or a lingering preview
  // never leaks into a later session.
  useEffect(() => {
    if (open) {
      setDraft(value);
      setMode("edit");
    }
  }, [open, value]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <div>
              <DialogTitle>{title}</DialogTitle>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            <Tabs
              value={mode}
              onValueChange={(v) => setMode(v as "edit" | "preview")}
            >
              <TabsList className="h-8">
                <TabsTrigger value="edit" className="text-xs h-6 px-2.5">
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs h-6 px-2.5">
                  <Eye className="h-3 w-3 mr-1" /> Preview
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {mode === "edit" ? (
            <RichTextEditor value={draft} onChange={setDraft} minHeight={420} />
          ) : (
            <div
              className="prose prose-sm max-w-none rounded-md border bg-card p-6 text-sm leading-relaxed min-h-[420px]"
              dangerouslySetInnerHTML={{ __html: draft }}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            <X className="h-4 w-4 mr-2" /> Cancel
          </Button>
          <Button
            className="bg-gradient-to-r from-primary to-secondary"
            onClick={() => onSave(draft)}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" /> Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
