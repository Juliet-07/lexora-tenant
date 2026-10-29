import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, Loader2, Lock, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  deleteShareholderDoc,
  fetchShareholderDocLog,
  fetchShareholderDocs,
  openShareholderDocFile,
  uploadShareholderDoc,
  type CapTable,
  type ShareholderDoc,
  type ShareholderDocAccess,
} from "@/lib/grc/ownership-api";
import { exportReportPdf } from "@/lib/grc/reportExport";
import {
  ConfirmDialog,
  EmptyState,
  Field,
  errMsg,
  fmtDate,
  todayInput,
} from "../shared";

export const DOC_CATEGORIES = [
  "Share Certificate",
  "Shareholders Agreement",
  "Founders Agreement",
  "Board Resolution",
  "Consent Letter",
  "Power of Attorney",
  "Transfer Form",
  "Waiver of Pre-emption",
  "Other",
];

const ACCESS_LABEL: Record<ShareholderDocAccess, string> = {
  Private: "Private — shareholder + secretary",
  Restricted: "Restricted — board + secretary",
  Board: "Board — all directors",
};
const ACCESS_TONE: Record<ShareholderDocAccess, string> = {
  Private: "bg-red-500/10 text-red-700 border-red-500/30",
  Restricted: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  Board: "bg-blue-500/10 text-blue-700 border-blue-500/30",
};
const ACTION_TONE: Record<string, string> = {
  Uploaded: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  Viewed: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  Downloaded: "bg-violet-500/10 text-violet-700 border-violet-500/30",
  Deleted: "bg-red-500/10 text-red-700 border-red-500/30",
};

const NONE = "__all__";

function UploadDialog({
  open,
  onOpenChange,
  cap,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cap: CapTable;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [category, setCategory] = useState(DOC_CATEGORIES[0]);
  const [title, setTitle] = useState("");
  const [holder, setHolder] = useState(NONE);
  const [access, setAccess] = useState<ShareholderDocAccess>("Private");
  const [date, setDate] = useState(todayInput());
  const [refNo, setRefNo] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      uploadShareholderDoc({
        category,
        title: title.trim(),
        shareholderNodeId: holder === NONE ? undefined : holder,
        access,
        date,
        refNo: refNo.trim() || undefined,
        notes: notes.trim() || undefined,
        file,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cap-docs"] });
      qc.invalidateQueries({ queryKey: ["cap-doc-log"] });
      toast({ title: "Document filed" });
      onOpenChange(false);
      setTitle("");
      setRefNo("");
      setNotes("");
      setFile(null);
    },
    onError: (e) =>
      toast({
        title: "Couldn't upload the document",
        description: errMsg(e),
        variant: "destructive",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload shareholder document</DialogTitle>
          <DialogDescription>
            Stored privately — it can't be opened by link, only through this
            page, and every view or download is logged.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Document category">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Document title">
            <Input
              placeholder="e.g. Share certificate No. 001 — Jane Doe"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label="Related shareholder">
            <Select value={holder} onValueChange={setHolder}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>All shareholders</SelectItem>
                {cap.holders.map((h) => (
                  <SelectItem key={h.nodeId} value={h.nodeId}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            label="Access level"
            hint="Recorded and shown with the document. Everyone with access to the GRC module can currently open these files — the level is a label for the audit trail, not a separate lock."
          >
            <Select
              value={access}
              onValueChange={(v) => setAccess(v as ShareholderDocAccess)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ACCESS_LABEL) as ShareholderDocAccess[]).map(
                  (a) => (
                    <SelectItem key={a} value={a}>
                      {ACCESS_LABEL[a]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of document">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Reference number">
              <Input
                placeholder="e.g. SC-001"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <Field label="File">
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={mut.isPending || !title.trim() || !file}
            onClick={() => mut.mutate()}
          >
            {mut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ShareholderDocsPanel({ cap }: { cap: CapTable }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ShareholderDoc | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["cap-docs"],
    queryFn: fetchShareholderDocs,
  });
  const { data: log = [] } = useQuery({
    queryKey: ["cap-doc-log"],
    queryFn: fetchShareholderDocLog,
  });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["cap-docs"] });
    qc.invalidateQueries({ queryKey: ["cap-doc-log"] });
  };

  const del = useMutation({
    mutationFn: (id: string) => deleteShareholderDoc(id),
    onSuccess: () => {
      refreshAll();
      toast({ title: "Document deleted" });
      setToDelete(null);
    },
    onError: (e) => {
      toast({
        title: "Couldn't delete that document",
        description: errMsg(e),
        variant: "destructive",
      });
      setToDelete(null);
    },
  });

  const open_ = async (
    d: ShareholderDoc,
    index: number,
    mode: "view" | "download",
  ) => {
    const key = `${d.id}-${index}-${mode}`;
    setOpening(key);
    try {
      await openShareholderDocFile(d.id, index, mode, d.files[index].name);
      qc.invalidateQueries({ queryKey: ["cap-doc-log"] });
    } catch (e) {
      toast({
        title: "Couldn't open that file",
        description: errMsg(e),
        variant: "destructive",
      });
    } finally {
      setOpening(null);
    }
  };

  const downloadRegister = () =>
    exportReportPdf({
      id: "shareholder-documents",
      title: "Shareholders Documents Register",
      subtitle: "Organisation Structure — Cap Table",
      summary: [
        { label: "Documents", value: docs.length },
        {
          label: "Private",
          value: docs.filter((d) => d.access === "Private").length,
        },
        {
          label: "Restricted",
          value: docs.filter((d) => d.access === "Restricted").length,
        },
        {
          label: "Board",
          value: docs.filter((d) => d.access === "Board").length,
        },
      ],
      sections: [
        {
          heading: "Documents",
          columns: [
            "Category",
            "Title",
            "Shareholder",
            "Access",
            "Date",
            "Reference",
            "Files",
          ],
          rows: docs.map((d) => [
            d.category,
            d.title,
            d.shareholder,
            d.access,
            fmtDate(d.date),
            d.refNo || "—",
            d.files.length,
          ]),
        },
        {
          heading: "Access log",
          columns: ["When", "User", "Document", "Action", "IP address"],
          rows: log.map((l) => [
            new Date(l.at).toLocaleString(),
            l.userName,
            l.documentTitle,
            l.action,
            l.ip || "—",
          ]),
        },
      ],
    });

  const grouped = DOC_CATEGORIES.map((c) => ({
    category: c,
    items: docs.filter((d) => d.category === c),
  })).filter((g) => g.items.length);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Upload document
        </Button>
        <Button size="sm" variant="outline" onClick={downloadRegister}>
          <Download className="h-4 w-4 mr-1.5" /> Download register
        </Button>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
        <Lock className="h-4 w-4 mt-0.5 text-amber-700" />
        <div className="text-xs text-amber-900">
          <p className="font-semibold text-sm">Private repository</p>
          Files here aren't reachable by link — they can only be opened from
          this page, and every upload, view, download and deletion is written to
          the access log below.
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : grouped.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              title="No documents filed"
              hint="Share certificates, shareholder agreements, resolutions and transfer forms live here."
            />
          </CardContent>
        </Card>
      ) : (
        grouped.map((g) => (
          <Card key={g.category}>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {g.category}
                <Badge variant="secondary" className="text-[10px]">
                  {g.items.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Shareholder</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Files</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {g.items.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="font-medium">{d.title}</div>
                        {d.notes && (
                          <div className="text-[11px] text-muted-foreground">
                            {d.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{d.shareholder}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={ACCESS_TONE[d.access]}
                        >
                          {d.access}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {fmtDate(d.date)}
                      </TableCell>
                      <TableCell>{d.refNo || "—"}</TableCell>
                      <TableCell>
                        {d.files.length === 0 && (
                          <span className="text-xs text-muted-foreground">
                            No file
                          </span>
                        )}
                        <div className="space-y-1">
                          {d.files.map((f) => (
                            <div
                              key={f.index}
                              className="flex items-center gap-1 text-xs"
                            >
                              <span
                                className="max-w-40 truncate"
                                title={f.name}
                              >
                                {f.name}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                title="View"
                                disabled={opening === `${d.id}-${f.index}-view`}
                                onClick={() => open_(d, f.index, "view")}
                              >
                                {opening === `${d.id}-${f.index}-view` ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                title="Download"
                                disabled={
                                  opening === `${d.id}-${f.index}-download`
                                }
                                onClick={() => open_(d, f.index, "download")}
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Delete"
                          onClick={() => setToDelete(d)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Document access log</CardTitle>
          <span className="text-xs text-muted-foreground">
            Audit trail — latest 500 events
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {log.length === 0 ? (
            <EmptyState title="Nothing logged yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date / time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>IP address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {log.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="tabular-nums text-xs">
                      {new Date(l.at).toLocaleString()}
                    </TableCell>
                    <TableCell>{l.userName}</TableCell>
                    <TableCell>{l.documentTitle}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={ACTION_TONE[l.action]}
                      >
                        {l.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums text-xs">
                      {l.ip || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <UploadDialog open={open} onOpenChange={setOpen} cap={cap} />
      <ConfirmDialog
        open={!!toDelete}
        title={`Delete "${toDelete?.title}"?`}
        description="The file is removed from storage and the deletion is written to the access log."
        pending={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
