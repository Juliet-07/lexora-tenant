import { useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
}

// Lightweight contentEditable rich-text editor. Uses document.execCommand
// for simplicity (deprecated but still universally supported in browsers
// and adequate for a prototype).
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = 180,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Sync external value only when it diverges from what the DOM already has,
  // so we don't wipe the caret while the user is typing.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  const exec = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
    ref.current?.focus();
  };

  const btn =
    "h-8 w-8 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground";

  return (
    <div className={cn("border rounded-md bg-background", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b px-1 py-1">
        <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")} title="Bold">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")} title="Italic">
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("underline")} title="Underline">
          <Underline className="h-4 w-4" />
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("justifyLeft")} title="Align left">
          <AlignLeft className="h-4 w-4" />
        </button>
        <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("justifyCenter")} title="Align center">
          <AlignCenter className="h-4 w-4" />
        </button>
        <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("justifyRight")} title="Align right">
          <AlignRight className="h-4 w-4" />
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")} title="Bulleted list">
          <List className="h-4 w-4" />
        </button>
        <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertOrderedList")} title="Numbered list">
          <ListOrdered className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={ref}
        className="prose prose-sm max-w-none px-3 py-2 focus:outline-none text-sm [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
        style={{ minHeight }}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
      />
      <style>{`
        [contentEditable=true]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
