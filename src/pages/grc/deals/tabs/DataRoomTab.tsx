import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FolderOpen,
  Plus,
  Trash2,
  Upload,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  addDataRoomFolder,
  removeDataRoomFolder,
  addDataRoomFile,
  removeDataRoomFile,
  sendDataRoomEmail,
  type Deal,
} from "@/lib/grc/deals-api";

export default function DataRoomTab({ deal }: { deal: Deal }) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["deal", deal._id] });
  const folders = deal.dataRoom?.folders ?? [];
  const dataRoomFiles = deal.dataRoom?.files ?? [];
  const [file, setFile] = useState<File | null>(null);
  const [newFolder, setNewFolder] = useState("");
  const [q, setQ] = useState("");
  const [openFolder, setOpenFolder] = useState<string | null>(null);

  const folderMut = useMutation({
    mutationFn: () => addDataRoomFolder(deal._id, newFolder.trim()),
    onSuccess: () => {
      invalidate();
      setNewFolder("");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to add folder"),
  });
  const removeFolderMut = useMutation({
    mutationFn: (index: number) => removeDataRoomFolder(deal._id, index),
    onSuccess: () => {
      invalidate();
      setOpenFolder(null);
    },
  });
  const uploadMut = useMutation({
    mutationFn: () => addDataRoomFile(deal._id, file!, openFolder!),
    onSuccess: () => {
      invalidate();
      setFile(null);
      toast.success("File uploaded");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to upload"),
  });
  const removeFileMut = useMutation({
    mutationFn: (index: number) => removeDataRoomFile(deal._id, index),
    onSuccess: invalidate,
  });

  const countInFolder = (folderName: string) =>
    dataRoomFiles.filter((f) => f.folder === folderName).length;

  const partiesWithAccess = (deal.parties ?? [])
    .map((p, i) => ({ ...p, index: i }))
    .filter((p) => p.permissions.dataRoom);
  const sendMut = useMutation({
    mutationFn: (partyIndex: number) => sendDataRoomEmail(deal._id, partyIndex),
    onSuccess: (res) => toast.success(`Sent to ${res.sentTo}`),
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to send data room"),
  });

  // ── Folder list view ──────────────────────────────────────────
  if (!openFolder) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {partiesWithAccess.length > 0 && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">Send data room</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {partiesWithAccess.map((p) => (
                <div
                  key={p.index}
                  className="flex items-center justify-between border rounded-md p-2.5 text-sm"
                >
                  <div>
                    <span className="font-medium">{p.name}</span>{" "}
                    <span className="text-xs text-muted-foreground">
                      — {p.title} ({p.side})
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={sendMut.isPending}
                    onClick={() => sendMut.mutate(p.index)}
                  >
                    Send zip to {p.email}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Data Room folders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {folders.map((f, i) => (
                <div
                  key={i}
                  onClick={() => setOpenFolder(f.name)}
                  className="border rounded-md p-3 cursor-pointer hover:border-primary transition group relative"
                >
                  <FolderOpen className="h-6 w-6 text-muted-foreground mb-2" />
                  <div className="text-sm font-medium truncate pr-6">
                    {f.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {countInFolder(f.name)} file(s)
                  </div>
                  <button
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${f.name}" and every file in it?`))
                        removeFolderMut.mutate(i);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
              {folders.length === 0 && (
                <div className="col-span-full text-sm text-muted-foreground text-center py-8">
                  No folders yet — create one to start uploading.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">New folder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="Folder name"
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
            />
            <Button
              className="w-full"
              disabled={!newFolder.trim() || folderMut.isPending}
              onClick={() => folderMut.mutate()}
            >
              <Plus className="h-4 w-4 mr-1" />
              {folderMut.isPending ? "Creating…" : "Create folder"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Inside a folder ────────────────────────────────────────────
  const files = dataRoomFiles
    .filter((f) => f.folder === openFolder)
    .filter((f) => !q || f.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <button
            className="text-muted-foreground hover:text-foreground flex items-center gap-1"
            onClick={() => setOpenFolder(null)}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Documents
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-semibold">{openFolder}</span>
          <Badge variant="outline" className="ml-1">
            {files.length}
          </Badge>
        </div>
        <Input
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-48 h-8"
        />
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Views</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((f) => {
              const globalIndex = dataRoomFiles.indexOf(f);
              return (
                <TableRow key={globalIndex}>
                  <TableCell className="text-sm">
                    {f.fileUrl ? (
                      <a
                        href={f.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        {f.name}
                      </a>
                    ) : (
                      f.name
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {(f.size / (1024 * 1024)).toFixed(1)} MB
                  </TableCell>
                  <TableCell className="text-xs">v{f.version}</TableCell>
                  <TableCell className="text-xs">{f.views}</TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFileMut.mutate(globalIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {files.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-xs text-muted-foreground py-6"
                >
                  No files in this folder.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="p-3 border-t flex gap-2">
          <Input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="flex-1"
          />
          <Button
            disabled={!file || uploadMut.isPending}
            onClick={() => uploadMut.mutate()}
          >
            <Upload className="h-4 w-4 mr-1" />
            {uploadMut.isPending ? "Uploading…" : "Upload to " + openFolder}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
