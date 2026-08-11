import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Folder, FolderOpen, ChevronLeft, Upload, Inbox, FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchFolders, addFolder, fetchDocuments, fetchReceivedDocuments,
  uploadDocument, fileClientDocument, type Mandate,
} from "@/lib/crm/mandates-api";

export function DocumentsTab({ mandate }: { mandate: Mandate }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [folder, setFolder] = useState<string | null>(null);
  const [openNewFolder, setOpenNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [openUpload, setOpenUpload] = useState(false);
  const [uploadFolder, setUploadFolder] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const { data: folders = [] } = useQuery({ queryKey: ["mandateFolders", mandate._id], queryFn: () => fetchFolders(mandate._id) });
  const { data: received = [] } = useQuery({ queryKey: ["mandateReceived", mandate._id], queryFn: () => fetchReceivedDocuments(mandate._id) });
  const { data: filesInFolder = [] } = useQuery({
    queryKey: ["mandateDocuments", mandate._id, folder],
    queryFn: () => fetchDocuments(mandate._id, folder ?? undefined),
    enabled: !!folder,
  });
  const { data: allDocs = [] } = useQuery({
    queryKey: ["mandateDocuments", mandate._id, "all"],
    queryFn: () => fetchDocuments(mandate._id),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["mandateFolders", mandate._id] });
    queryClient.invalidateQueries({ queryKey: ["mandateReceived", mandate._id] });
    queryClient.invalidateQueries({ queryKey: ["mandateDocuments", mandate._id] });
  };

  const folderMut = useMutation({
    mutationFn: () => addFolder(mandate._id, newFolderName.trim()),
    onSuccess: () => { invalidateAll(); setNewFolderName(""); setOpenNewFolder(false); toast({ title: "Folder created" }); },
  });
  const uploadMut = useMutation({
    mutationFn: () => uploadDocument(mandate._id, uploadFolder, uploadFile as File),
    onSuccess: () => { invalidateAll(); setUploadFile(null); setUploadFolder(""); setOpenUpload(false); toast({ title: "Document uploaded" }); },
    onError: (err: any) => toast({ title: "Upload failed", description: err?.response?.data?.message, variant: "destructive" }),
  });
  const fileMut = useMutation({
    mutationFn: (docId: string) => fileClientDocument(mandate._id, docId, "Client submissions"),
    onSuccess: (doc) => { invalidateAll(); toast({ title: "Filed", description: `${doc.name} filed into Client submissions.` }); },
  });

  const countIn = (f: string) => allDocs.filter((d) => d.folder === f).length;

  if (folder) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => setFolder(null)}><ChevronLeft className="mr-1 h-4 w-4" /> All folders</Button>
        <p className="text-sm font-medium">{folder}</p>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Size</TableHead><TableHead>Uploaded by</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
          <TableBody>
            {filesInFolder.map((d) => (
              <TableRow key={d._id}>
                <TableCell className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <a href={d.fileUrl} target="_blank" rel="noreferrer" className="hover:underline">{d.name}</a>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{(d.size / 1024).toFixed(0)} KB</TableCell>
                <TableCell className="text-xs text-muted-foreground">{d.uploadedBy}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{d.createdAt?.slice(0, 10)}</TableCell>
              </TableRow>
            ))}
            {!filesInFolder.length && (
              <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No documents in this folder yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => setOpenNewFolder(true)}><Folder className="mr-2 h-4 w-4" /> New folder</Button>
        <Button size="sm" onClick={() => setOpenUpload(true)}><Upload className="mr-2 h-4 w-4" /> Upload document</Button>
      </div>

      {received.length > 0 && (
        <Card className="border-primary/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Inbox className="h-4 w-4" /> Received from client
              <Badge className="bg-primary/10 text-primary">{received.length} pending</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {received.map((d) => (
              <div key={d._id} className="flex items-center justify-between rounded border p-2 text-sm">
                <div>
                  <p className="font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.uploadedBy} · {d.createdAt?.slice(0, 10)} · {(d.size / 1024).toFixed(0)} KB</p>
                </div>
                <Button size="sm" variant="outline" disabled={fileMut.isPending} onClick={() => fileMut.mutate(d._id)}>
                  Accept &amp; file
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {folders.map((f) => (
          <Card key={f} className="cursor-pointer transition hover:shadow-md" onClick={() => setFolder(f)}>
            <CardContent className="flex items-center gap-3 p-4">
              <FolderOpen className="h-6 w-6 text-primary" />
              <div>
                <p className="text-sm font-medium">{f}</p>
                <p className="text-xs text-muted-foreground">{countIn(f)} document{countIn(f) === 1 ? "" : "s"}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={openNewFolder} onOpenChange={setOpenNewFolder}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New folder</DialogTitle></DialogHeader>
          <Input placeholder="Folder name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} />
          <DialogFooter>
            <Button disabled={folderMut.isPending || !newFolderName.trim()} onClick={() => folderMut.mutate()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openUpload} onOpenChange={setOpenUpload}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Upload document</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>File</Label>
              <Input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
            </div>
            <div>
              <Label>Folder</Label>
              <Select value={uploadFolder} onValueChange={setUploadFolder}>
                <SelectTrigger><SelectValue placeholder="Select folder..." /></SelectTrigger>
                <SelectContent>
                  {folders.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button disabled={uploadMut.isPending || !uploadFile || !uploadFolder} onClick={() => uploadMut.mutate()}>
              {uploadMut.isPending ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
