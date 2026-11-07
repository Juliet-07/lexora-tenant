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
import { Loader2, Save, Send, X, Pencil, Eye } from "lucide-react";
import { StructuredBodyEditor } from "@/components/crm/StructuredBodyEditor";
import { MergeFieldsPanel } from "@/components/crm/MergeFieldsPanel";

interface DocumentEditorDialogProps {
  open: boolean;
  title: string;
  /** Optional short line under the title — e.g. which document/client this is. */
  subtitle?: string;
  value: string;
  onClose: () => void;
  /**
   * `mergeFieldValues` holds the fields typed into the Merge Fields panel
   * (only when `mergeFields` is on), so the caller can save them with the body.
   */
  onSave: (html: string, mergeFieldValues?: Record<string, string>) => void;
  saving?: boolean;
  /**
   * Show the Merge Fields panel beside the editor: every {{field}} in the
   * document with one input each. Typing one rewrites it everywhere it appears.
   */
  mergeFields?: boolean;
  /** Where the panel's field labels come from. */
  mergeRegistry?: "crm" | "hr" | "policy";
  /** Custom label for the save action — defaults to "Save Changes". */
  saveLabel?: string;
  /**
   * Optional second action, e.g. emailing the typed content straight to
   * the employee. When provided, a "Send" button appears alongside Save
   * so the same draft can be saved for later or sent immediately.
   */
  onSend?: (html: string) => void;
  sending?: boolean;
  /** Custom label for the send action — defaults to "Send". */
  sendLabel?: string;
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
  mergeFields = false,
  mergeRegistry = "crm",
  saveLabel = "Save Changes",
  onSend,
  sending = false,
  sendLabel = "Send",
}: DocumentEditorDialogProps) {
  const [draft, setDraft] = useState(value);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [fieldEdits, setFieldEdits] = useState<Record<string, string>>({});

  // Reset the draft (and always land back on Edit) each time the
  // dialog opens, so a previous, unsaved edit or a lingering preview
  // never leaks into a later session.
  useEffect(() => {
    if (open) {
      setDraft(value);
      setMode("edit");
      setFieldEdits({});
    }
  }, [open, value]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={`flex max-h-[90vh] flex-col ${mergeFields ? "h-[90vh] max-w-[1390px]" : "max-w-4xl"}`}
      >
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

        {/* The document and the Merge Fields panel each scroll on their own,
            so the title and buttons stay in view while the contract is read. */}
        <div
          className={
            mergeFields
              ? "grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-[minmax(0,1fr)]"
              : "min-h-0 flex-1"
          }
        >
          <div className="min-h-0 overflow-y-auto">
            {mode === "edit" ? (
              <StructuredBodyEditor
                value={draft}
                onChange={setDraft}
                minHeight={420}
              />
            ) : (
              <div
                className="contract-doc prose prose-sm max-w-none rounded-md border bg-card p-6 text-sm leading-relaxed min-h-[420px]"
                dangerouslySetInnerHTML={{ __html: draft }}
              />
            )}
          </div>
          {mergeFields && (
            <div className="min-h-0 overflow-y-auto">
              <MergeFieldsPanel
                registry={mergeRegistry}
                body={draft}
                locked={false}
                editing
                dirty={false}
                saving={false}
                onChange={(next, key, value) => {
                  setDraft(next);
                  setFieldEdits((e) => ({ ...e, [key]: value }));
                }}
                onSave={() => undefined}
                onDiscard={() => undefined}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving || sending}
          >
            <X className="h-4 w-4 mr-2" /> Cancel
          </Button>
          <Button
            variant={onSend ? "outline" : "default"}
            className={
              onSend ? undefined : "bg-gradient-to-r from-primary to-secondary"
            }
            onClick={() => onSave(draft, mergeFields ? fieldEdits : undefined)}
            disabled={saving || sending}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" /> {saveLabel}
              </>
            )}
          </Button>
          {onSend && (
            <Button
              className="bg-gradient-to-r from-primary to-secondary"
              onClick={() => onSend(draft)}
              disabled={saving || sending}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" /> {sendLabel}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
