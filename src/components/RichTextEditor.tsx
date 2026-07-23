import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Table as TableIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
}

// Lightweight contentEditable rich-text editor. Uses document.execCommand
// for simplicity (deprecated but still universally supported) — adequate
// for the fixed set of formatting this app actually needs.
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = 180,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [tableOpen, setTableOpen] = useState(false);
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);

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

  const insertTable = () => {
    const cellStyle = "border:1px solid #999;padding:4px 8px;min-width:60px;";
    let html = `<table style="border-collapse:collapse;width:100%;margin:8px 0;">`;
    for (let r = 0; r < rows; r++) {
      html += "<tr>";
      for (let c = 0; c < cols; c++)
        html += `<td style="${cellStyle}"><br/></td>`;
      html += "</tr>";
    }
    html += "</table><p><br/></p>";
    document.execCommand("insertHTML", false, html);
    if (ref.current) onChange(ref.current.innerHTML);
    ref.current?.focus();
    setTableOpen(false);
  };

  const btn =
    "h-8 w-8 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground";

  return (
    <div className={cn("border rounded-md bg-background", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b px-1 py-1">
        <Select onValueChange={(v) => exec("formatBlock", v)}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Paragraph" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="<p>">Paragraph</SelectItem>
            <SelectItem value="<h1>">Heading 1</SelectItem>
            <SelectItem value="<h2>">Heading 2</SelectItem>
            <SelectItem value="<h3>">Heading 3</SelectItem>
          </SelectContent>
        </Select>
        <div className="w-px h-5 bg-border mx-1" />
        <button
          type="button"
          className={btn}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("bold")}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("italic")}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("underline")}
          title="Underline"
        >
          <Underline className="h-4 w-4" />
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <button
          type="button"
          className={btn}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("justifyLeft")}
          title="Align left"
        >
          <AlignLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("justifyCenter")}
          title="Align center"
        >
          <AlignCenter className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("justifyRight")}
          title="Align right"
        >
          <AlignRight className="h-4 w-4" />
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <button
          type="button"
          className={btn}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("insertUnorderedList")}
          title="Bulleted list"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("insertOrderedList")}
          title="Numbered list"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <Dialog open={tableOpen} onOpenChange={setTableOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className={btn}
              onMouseDown={(e) => e.preventDefault()}
              title="Insert table"
            >
              <TableIcon className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle>Insert table</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Rows</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={rows}
                  onChange={(e) => setRows(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Columns</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={cols}
                  onChange={(e) => setCols(Number(e.target.value))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={insertTable}>Insert</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div
        ref={ref}
        className="prose prose-sm max-w-none px-3 py-2 focus:outline-none text-sm [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:my-2 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-bold"
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
