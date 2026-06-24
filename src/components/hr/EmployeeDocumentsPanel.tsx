import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { FileText, Upload, Download, Trash2, User, Building2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  addEmployeeDocument,
  deleteEmployeeDocument,
  formatBytes,
  useEmployeeDocuments,
} from "@/lib/employeeDocumentsStore";

const CATEGORIES = [
  "Contract",
  "Identification",
  "Certificate",
  "Policy",
  "Tax",
  "Payslip",
  "Other",
];

interface Props {
  uploadedBy: "employee" | "tenant";
  uploadedByName: string;
  /** When true, hides upload UI (read-only). */
  readOnly?: boolean;
}

export function EmployeeDocumentsPanel({
  uploadedBy,
  uploadedByName,
  readOnly,
}: Props) {
  const docs = useEmployeeDocuments();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("Other");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setCategory("Other");
    setNotes("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async () => {
    if (!file) return;
    setSaving(true);
    try {
      await addEmployeeDocument(file, {
        category,
        notes,
        uploadedBy,
        uploadedByName,
      });
      toast({ title: "Document uploaded", description: file.name });
      setOpen(false);
      reset();
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const download = (d: (typeof docs)[number]) => {
    if (!d.dataUrl) {
      toast({ title: "No file available", description: "This seeded sample has no attached file." });
      return;
    }
    const a = document.createElement("a");
    a.href = d.dataUrl;
    a.download = d.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Upload personal documents and access files shared with you.
          </p>
          <Button
            size="sm"
            className="bg-gradient-to-r from-primary to-secondary"
            onClick={() => setOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" /> Upload Document
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-4 space-y-2">
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No documents yet.
            </p>
          ) : (
            docs.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] py-0">
                      {d.category}
                    </Badge>
                    <span className="flex items-center gap-1">
                      {d.uploadedBy === "tenant" ? (
                        <Building2 className="h-3 w-3" />
                      ) : (
                        <User className="h-3 w-3" />
                      )}
                      {d.uploadedByName}
                    </span>
                    <span>{formatBytes(d.size)}</span>
                    <span>
                      {new Date(d.uploadedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => download(d)}>
                  <Download className="h-3 w-3" />
                </Button>
                {!readOnly && d.uploadedBy === uploadedBy && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      deleteEmployeeDocument(d.id);
                      toast({ title: "Document removed" });
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Attach a file to your employee record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>File</Label>
              <Input
                ref={fileRef}
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!file || saving} onClick={submit}>
              {saving ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
