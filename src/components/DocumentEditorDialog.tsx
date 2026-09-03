import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Save, X } from "lucide-react";
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

  // Reset the draft to the real current value each time the dialog
  // opens, so a previous, unsaved edit never leaks into a later
  // session.
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <RichTextEditor value={draft} onChange={setDraft} minHeight={420} />
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
