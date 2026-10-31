import { useMemo } from "react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { joinDocument, splitDocument } from "@/lib/crm/contract-structure";

// The rich-text editor for a contract. If the document has a cover page and
// a contents page, only the body is editable here — they stay in front of it
// untouched (the contents page refreshes itself from the headings when the
// document is saved).
export function StructuredBodyEditor({
  value,
  onChange,
  minHeight,
}: {
  value: string;
  onChange: (fullDocument: string) => void;
  minHeight?: number;
}) {
  const { prefix, body } = useMemo(() => splitDocument(value), [value]);
  return (
    <div className="space-y-2">
      {prefix && (
        <p className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          You are editing the body. The cover page and table of contents come
          from the template — the contents update from your headings when you
          save.
        </p>
      )}
      <RichTextEditor
        value={body}
        onChange={(b) => onChange(joinDocument(prefix, b))}
        minHeight={minHeight}
      />
    </div>
  );
}
