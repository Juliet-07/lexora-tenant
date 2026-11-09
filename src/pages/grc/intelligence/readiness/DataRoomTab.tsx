import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  Upload,
  Send,
  FileText,
  Download,
  Trash2,
  Link2,
  RotateCw,
  Ban,
  FileUp,
  Plus,
  Eye,
} from "lucide-react";
import {
  ROOM_STATUS_LABEL,
  addRoomItem,
  attachReportToRoom,
  downloadRoomZip,
  removeRoomFile,
  removeRoomItem,
  resendShare,
  revokeShare,
  updateRoomItem,
  uploadRoomFile,
  type RoomItem,
  type RoomShare,
  type RoomStatus,
} from "@/lib/grc/readiness-workspace-api";
import { scoreColor } from "@/lib/grc/readiness-api";
import {
  fail,
  fmtBytes,
  fmtDate,
  fmtDateTime,
  uploadUrl,
  type TabProps,
} from "./shared";
import { SendRoomDialog } from "./SendDialogs";

const STATUS_STYLE: Record<RoomStatus, string> = {
  uploaded: "bg-emerald-500/15 text-emerald-700 border-emerald-500/40",
  review: "bg-sky-500/15 text-sky-700 border-sky-500/40",
  missing: "bg-rose-500/15 text-rose-700 border-rose-500/40",
  expired: "bg-amber-500/15 text-amber-700 border-amber-500/40",
  not_applicable: "bg-muted text-muted-foreground",
};

const ACTION_LABEL: Record<string, string> = {
  sent: "Sent",
  resent: "Resent",
  viewed: "Viewed",
  nda_accepted: "NDA accepted",
  downloaded: "Downloaded",
  revoked: "Revoked",
};

export function DataRoomTab({ current, ws, onWorkspace }: TabProps) {
  const [active, setActive] = useState(0);
  const [detail, setDetail] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadFor = useRef<string | null>(null);

  const categories = Array.from(new Set(ws.room.map((r) => r.category)));
  const category = categories[Math.min(active, categories.length - 1)];
  const counted = ws.room.filter((r) => r.status !== "not_applicable");
  const held = counted.filter(
    (r) => r.status === "uploaded" || r.status === "review",
  ).length;
  const pct = counted.length ? Math.round((held / counted.length) * 100) : 0;
  const items = ws.room.filter((r) => r.category === category);

  const upload = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      uploadRoomFile(id, file),
    onSuccess: (w) => {
      onWorkspace(w);
      toast({ title: "Document uploaded" });
    },
    onError: (e) => fail("Upload failed", e),
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RoomStatus }) =>
      updateRoomItem(id, { status }),
    onSuccess: onWorkspace,
    onError: (e) => fail("Could not change the status", e),
  });
  const zip = useMutation({
    mutationFn: () => downloadRoomZip(current?._id),
    onError: (e) => fail("Could not build the ZIP", e),
  });
  const attach = useMutation({
    mutationFn: () => attachReportToRoom(current!._id),
    onSuccess: (w) => {
      onWorkspace(w);
      toast({
        title: "Report attached",
        description: "Added to Deal Materials in the data room.",
      });
    },
    onError: (e) => fail("Could not attach the report", e),
  });

  const pickFile = (id: string) => {
    uploadFor.current = id;
    fileRef.current?.click();
  };

  const detailItem = ws.room.find((r) => r._id === detail) ?? null;

  return (
    <div className="space-y-6">
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        data-testid="room-file-input"
        onChange={(e) => {
          const f = e.target.files?.[0];
          const id = uploadFor.current;
          e.target.value = "";
          if (f && id) upload.mutate({ id, file: f });
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-4">
        <div className="flex items-baseline gap-3">
          <span className={`text-4xl font-bold ${scoreColor(pct)}`}>
            {pct}%
          </span>
          <span className="text-sm text-muted-foreground">
            {held} of {counted.length} documents
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setSendOpen(true)}>
            <Send className="mr-2 h-4 w-4" /> Send to investor
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => zip.mutate()}
            disabled={zip.isPending}
          >
            <Download className="mr-2 h-4 w-4" />
            {zip.isPending ? "Building…" : "Download ZIP"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => attach.mutate()}
            disabled={!current || attach.isPending}
            title={
              current ? undefined : "Create an assessment to attach its report"
            }
          >
            <FileText className="mr-2 h-4 w-4" /> Attach readiness report
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="space-y-1">
          {categories.map((c, i) => {
            const its = ws.room.filter(
              (r) => r.category === c && r.status !== "not_applicable",
            );
            const done = its.filter(
              (r) => r.status === "uploaded" || r.status === "review",
            ).length;
            const p = its.length ? Math.round((done / its.length) * 100) : 0;
            return (
              <button
                type="button"
                key={c}
                onClick={() => setActive(i)}
                className={`w-full rounded-md border px-3 py-2 text-left transition ${
                  i === active
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className={i === active ? "font-semibold" : ""}>
                    {c}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {done}/{its.length}
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full ${p === 100 ? "bg-emerald-500" : p >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                    style={{ width: `${p}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="font-semibold">{category}</h3>
            <Button size="sm" variant="ghost" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add document
            </Button>
          </div>
          <div className="divide-y">
            {items.map((r) => (
              <div
                key={r._id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <div className="min-w-[200px] flex-1">
                  <div className="text-sm font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.files.length
                      ? `${fmtDate(r.files[r.files.length - 1].uploadedAt)} · uploaded by ${r.files[r.files.length - 1].uploadedBy || "—"} · v${r.version}`
                      : "Not yet uploaded"}
                    {r.expiresAt ? ` · expires ${fmtDate(r.expiresAt)}` : ""}
                    {r.note ? (
                      <span className="text-amber-600"> · {r.note}</span>
                    ) : null}
                  </div>
                </div>
                <Select
                  value={r.status}
                  onValueChange={(v) =>
                    setStatus.mutate({ id: r._id, status: v as RoomStatus })
                  }
                >
                  <SelectTrigger
                    aria-label={`${r.name} status`}
                    className={`h-8 w-[140px] rounded-full border text-xs font-semibold ${STATUS_STYLE[r.status]}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROOM_STATUS_LABEL) as RoomStatus[]).map(
                      (k) => (
                        <SelectItem key={k} value={k}>
                          {ROOM_STATUS_LABEL[k]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Upload a file"
                    aria-label={`Upload ${r.name}`}
                    disabled={upload.isPending}
                    onClick={() => pickFile(r._id)}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Details and versions"
                    aria-label={`Details for ${r.name}`}
                    onClick={() => setDetail(r._id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {items.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No documents in this category.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <SharedAccess ws={ws} onWorkspace={onWorkspace} />

      {detailItem ? (
        <ItemDialog
          item={detailItem}
          onClose={() => setDetail(null)}
          onWorkspace={onWorkspace}
          onUpload={() => pickFile(detailItem._id)}
        />
      ) : null}
      <AddItemDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        category={category}
        onDone={onWorkspace}
      />
      <SendRoomDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        ws={ws}
        onDone={onWorkspace}
      />
    </div>
  );
}

function ItemDialog({
  item,
  onClose,
  onWorkspace,
  onUpload,
}: {
  item: RoomItem;
  onClose: () => void;
  onWorkspace: TabProps["onWorkspace"];
  onUpload: () => void;
}) {
  const [note, setNote] = useState(item.note);
  const [expires, setExpires] = useState(item.expiresAt?.slice(0, 10) ?? "");

  const save = useMutation({
    mutationFn: () =>
      updateRoomItem(item._id, {
        note,
        expiresAt: expires
          ? new Date(`${expires}T23:59:59`).toISOString()
          : null,
      }),
    onSuccess: (w) => {
      onWorkspace(w);
      toast({ title: "Saved" });
    },
    onError: (e) => fail("Could not save", e),
  });
  const delFile = useMutation({
    mutationFn: (fileId: string) => removeRoomFile(item._id, fileId),
    onSuccess: onWorkspace,
    onError: (e) => fail("Could not remove the file", e),
  });
  const delItem = useMutation({
    mutationFn: () => removeRoomItem(item._id),
    onSuccess: (w) => {
      onWorkspace(w);
      onClose();
    },
    onError: (e) => fail("Could not remove the document", e),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>{item.category}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Versions</h4>
              <Button size="sm" variant="outline" onClick={onUpload}>
                <FileUp className="mr-2 h-4 w-4" /> Upload new version
              </Button>
            </div>
            {item.files.length === 0 ? (
              <p className="text-sm text-muted-foreground">No file uploaded.</p>
            ) : (
              <div className="divide-y rounded-md border">
                {[...item.files].reverse().map((f) => (
                  <div
                    key={f._id}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    <Badge variant="outline">v{f.version}</Badge>
                    <div className="min-w-0 flex-1">
                      <a
                        href={uploadUrl(f.fileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-sm text-primary hover:underline"
                      >
                        {f.name}
                      </a>
                      <div className="text-xs text-muted-foreground">
                        {fmtDateTime(f.uploadedAt)} · {f.uploadedBy || "—"} ·{" "}
                        {fmtBytes(f.size)}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove ${f.name}`}
                      onClick={() => delFile.mutate(f._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="di-note">Note</Label>
              <Textarea
                id="di-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-[60px]"
                placeholder="e.g. October minutes pending approval"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="di-exp">Expires on</Label>
              <Input
                id="di-exp"
                type="date"
                value={expires}
                onChange={(e) => setExpires(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                For licences or policies with a shelf life. Once it passes the
                document reads as expired.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            className="text-rose-600"
            onClick={() => delItem.mutate()}
            disabled={delItem.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Remove from checklist
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddItemDialog({
  open,
  onOpenChange,
  category,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  category: string;
  onDone: TabProps["onWorkspace"];
}) {
  const [name, setName] = useState("");
  const add = useMutation({
    mutationFn: () => addRoomItem({ category, name: name.trim() }),
    onSuccess: (w) => {
      onDone(w);
      setName("");
      onOpenChange(false);
    },
    onError: (e) => fail("Could not add the document", e),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a document to {category}</DialogTitle>
          <DialogDescription>
            It joins the checklist as missing until a file is uploaded.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="add-doc">Document name</Label>
          <Input
            id="add-doc"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button
            onClick={() => add.mutate()}
            disabled={!name.trim() || add.isPending}
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const SHARE_STATE_STYLE: Record<string, string> = {
  active: "text-emerald-600 border-emerald-500/40",
  revoked: "text-rose-600 border-rose-500/40",
  expired: "text-amber-600 border-amber-500/40",
};

function SharedAccess({
  ws,
  onWorkspace,
}: {
  ws: TabProps["ws"];
  onWorkspace: TabProps["onWorkspace"];
}) {
  const resend = useMutation({
    mutationFn: (id: string) => resendShare(id),
    onSuccess: (w) => {
      onWorkspace(w);
      toast(
        w.emailSent === false
          ? { title: "Email could not be delivered", variant: "destructive" }
          : { title: "Link resent" },
      );
    },
    onError: (e) => fail("Could not resend", e),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => revokeShare(id),
    onSuccess: (w) => {
      onWorkspace(w);
      toast({ title: "Access revoked" });
    },
    onError: (e) => fail("Could not revoke", e),
  });

  const copy = async (s: RoomShare) => {
    const link = `${window.location.origin}/readiness/share/${s.token}`;
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: "Link copied" });
    } catch {
      toast({ title: "Copy this link", description: link });
    }
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h3 className="font-semibold">Shared access</h3>
      {ws.shares.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing has been shared yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Investor</TableHead>
                <TableHead>What</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Views / downloads</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {ws.shares.map((s) => (
                <TableRow key={s._id}>
                  <TableCell>
                    <div className="font-medium">{s.investorName}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.organisation || s.email}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {s.kind === "report"
                      ? "Readiness report (PDF)"
                      : `${s.categories.length} categor${s.categories.length === 1 ? "y" : "ies"}`}
                  </TableCell>
                  <TableCell className="text-sm">
                    {s.kind === "report"
                      ? "Emailed"
                      : s.accessLevel === "download"
                        ? "View + download"
                        : "View only"}
                    {s.nda === "click" ? (
                      <div className="text-[11px] text-muted-foreground">
                        NDA {s.ndaAcceptedAt ? "accepted" : "pending"}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm">{fmtDate(s.sentAt)}</TableCell>
                  <TableCell className="text-sm">
                    {s.kind === "report" ? "—" : fmtDate(s.expiresAt)}
                  </TableCell>
                  <TableCell>
                    {s.kind === "report" ? (
                      <Badge variant="outline">Sent</Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className={SHARE_STATE_STYLE[s.state]}
                      >
                        {s.state}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {s.kind === "report" ? "—" : `${s.views} / ${s.downloads}`}
                    {s.lastViewedAt ? (
                      <div className="text-[11px] text-muted-foreground">
                        last {fmtDate(s.lastViewedAt)}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {s.kind === "room" && s.state === "active" ? (
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Copy link"
                          aria-label={`Copy link for ${s.investorName}`}
                          onClick={() => copy(s)}
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Resend email"
                          aria-label={`Resend to ${s.investorName}`}
                          onClick={() => resend.mutate(s._id)}
                        >
                          <RotateCw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Revoke access"
                          aria-label={`Revoke ${s.investorName}`}
                          onClick={() => revoke.mutate(s._id)}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {ws.shareLog.length ? (
        <div>
          <h4 className="mb-2 text-sm font-semibold">Access log</h4>
          <div className="max-h-56 divide-y overflow-y-auto rounded-md border text-sm">
            {ws.shareLog.slice(0, 60).map((l) => (
              <div key={l._id} className="flex items-center gap-3 px-3 py-1.5">
                <span className="w-36 shrink-0 text-xs text-muted-foreground">
                  {fmtDateTime(l.at)}
                </span>
                <Badge variant="outline" className="shrink-0">
                  {ACTION_LABEL[l.action] ?? l.action}
                </Badge>
                <span className="font-medium">{l.investorName}</span>
                {l.detail ? (
                  <span className="truncate text-muted-foreground">
                    {l.detail}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
