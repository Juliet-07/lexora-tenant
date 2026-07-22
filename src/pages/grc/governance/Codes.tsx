import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, BookOpen, Upload, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useGov, mutateGov, gid, GovernanceCode } from "@/lib/grcGovernanceStore";

const CATS: GovernanceCode["category"][] = ["Code of Conduct", "Governance Charter", "Board Charter", "Ethics", "Other"];

export default function GrcCodes() {
  const s = useGov();
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<GovernanceCode | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Governance Codes</h1>
          <p className="text-sm text-muted-foreground">Author governance codes and charters, upload supporting documents.</p>
        </div>
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" />New code</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {s.codes.map((c) => (
          <Card key={c.id} className="cursor-pointer hover:shadow-md transition" onClick={() => setSelected(c)}>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /><span className="font-semibold">{c.title}</span></div>
                <Badge variant="outline">{c.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">{c.category} · v{c.version}</div>
              <p className="text-sm text-muted-foreground line-clamp-3">{c.body}</p>
              <div className="text-xs text-muted-foreground">{c.documents.length} document{c.documents.length !== 1 ? "s" : ""}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <NewCodeDialog open={newOpen} onOpenChange={setNewOpen} />
      <CodeSheet code={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function NewCodeDialog({ open, onOpenChange }: any) {
  const [f, setF] = useState<Omit<GovernanceCode, "id" | "documents" | "updatedAt" | "version" | "status">>({
    title: "", category: "Code of Conduct", body: "",
  });
  const submit = () => {
    if (!f.title) return toast({ title: "Title required", variant: "destructive" });
    mutateGov((s) => ({ ...s, codes: [{ id: gid("gc"), documents: [], updatedAt: new Date().toISOString(), version: 1, status: "Draft", ...f }, ...s.codes] }));
    toast({ title: "Code created" }); onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New governance code</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div><Label>Category</Label>
            <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v as any })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Body</Label><Textarea rows={5} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={submit}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CodeSheet({ code, onClose }: { code: GovernanceCode | null; onClose: () => void }) {
  if (!code) return null;
  const patch = (p: Partial<GovernanceCode>) =>
    mutateGov((s) => ({ ...s, codes: s.codes.map((c) => c.id === code.id ? { ...c, ...p, updatedAt: new Date().toISOString() } : c) }));

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const added = Array.from(files).map((f) => ({
      name: `${f.name} (${Math.round(f.size / 1024)} KB)`,
      uploadedAt: new Date().toISOString(),
    }));
    patch({ documents: [...code.documents, ...added] });
    toast({ title: `${added.length} document(s) attached` });
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader><SheetTitle>{code.title}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{code.category}</Badge>
            <Badge variant="outline">v{code.version}</Badge>
            <Badge variant="outline">{code.status}</Badge>
          </div>
          <div>
            <Label>Body</Label>
            <Textarea rows={10} value={code.body} onChange={(e) => patch({ body: e.target.value })} />
          </div>
          <section className="border-t pt-3">
            <div className="font-medium text-sm mb-2 flex items-center gap-2"><Upload className="h-4 w-4" />Attached documents</div>
            <div className="space-y-1 mb-3">
              {code.documents.map((d, i) => (
                <div key={i} className="flex justify-between items-center text-xs border rounded px-2 py-1">
                  <span>{d.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{new Date(d.uploadedAt).toLocaleDateString()}</span>
                    <button onClick={() => patch({ documents: code.documents.filter((_, x) => x !== i) })}><Trash2 className="h-3 w-3 text-muted-foreground" /></button>
                  </div>
                </div>
              ))}
              {code.documents.length === 0 && <div className="text-xs text-muted-foreground">No documents attached.</div>}
            </div>
            <label className="flex items-center gap-2 border border-dashed rounded-md px-3 py-4 cursor-pointer hover:bg-muted/50">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Click to attach PDF, DOCX or other supporting documents</span>
              <input type="file" multiple className="hidden" onChange={(e) => { onFiles(e.target.files); e.currentTarget.value = ""; }} />
            </label>
          </section>
          <div className="flex justify-end gap-2 border-t pt-3">
            {code.status === "Draft"
              ? <Button onClick={() => { patch({ status: "Published" }); toast({ title: "Published" }); }}>Publish</Button>
              : <Button variant="outline" onClick={() => patch({ status: "Draft", version: code.version + 1 })}>Start new version</Button>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
