import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Plus, Upload, Download, Trash2, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchPolicies,
  createPolicy,
  deletePolicy,
  resolvePolicyFileUrl,
  type Policy,
  type PolicyType,
} from "@/lib/grc/policy-api";

const typeLabel: Record<PolicyType, string> = {
  organisation: "Organisation policy",
  board: "Board policy",
};

export default function GrcPolicies() {
  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["grc-policies"],
    queryFn: fetchPolicies,
  });
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const current = policies.find((p) => p._id === selectedId) ?? null;

  if (isLoading)
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading policies…
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">
            Policy &amp; Procedure Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload policies and track acknowledgement by employees and board
            members.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Upload policy
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Acknowledged</TableHead>
                <TableHead>Uploaded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-sm text-muted-foreground py-10"
                  >
                    No policies uploaded yet.
                  </TableCell>
                </TableRow>
              )}
              {policies.map((p) => (
                <TableRow
                  key={p._id}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(p._id)}
                >
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell>{p.category || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={p.type === "board" ? "default" : "outline"}>
                      {typeLabel[p.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.fileName}
                  </TableCell>
                  <TableCell>{p.acknowledgments.length}</TableCell>
                  <TableCell className="text-xs">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UploadDialog open={open} onOpenChange={setOpen} />
      {current && (
        <PolicySheet policy={current} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

function UploadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState<PolicyType>("organisation");
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: () =>
      createPolicy({
        title: title.trim(),
        category: category.trim(),
        type,
        file: file!,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-policies"] });
      toast({
        title: "Policy uploaded",
        description:
          type === "board"
            ? "Board members have been emailed their acknowledgement link."
            : undefined,
      });
      setTitle("");
      setCategory("");
      setType("organisation");
      setFile(null);
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast({
        title: "Failed to upload policy",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const submit = () => {
    if (!title.trim())
      return toast({ title: "Title required", variant: "destructive" });
    if (!file)
      return toast({ title: "Document required", variant: "destructive" });
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload policy</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Category</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. HR, IT Security, Finance"
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as PolicyType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="organisation">
                  Organisation policy
                </SelectItem>
                <SelectItem value="board">Board policy</SelectItem>
              </SelectContent>
            </Select>
            {type === "board" && (
              <p className="text-xs text-muted-foreground mt-1">
                Every current board member will be emailed their own
                acknowledgement link.
              </p>
            )}
          </div>
          <div>
            <Label>Document</Label>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {file ? file.name : "Choose file"}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PolicySheet({
  policy,
  onClose,
}: {
  policy: Policy;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const deleteMut = useMutation({
    mutationFn: () => deletePolicy(policy._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-policies"] });
      toast({ title: "Policy deleted" });
      onClose();
    },
    onError: (err: any) =>
      toast({
        title: "Failed to delete",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{policy.title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap gap-2">
            {policy.category && (
              <Badge variant="outline">{policy.category}</Badge>
            )}
            <Badge variant={policy.type === "board" ? "default" : "outline"}>
              {typeLabel[policy.type]}
            </Badge>
          </div>

          <div className="flex items-center justify-between border rounded-md px-3 py-2">
            <div className="flex items-center gap-2 text-sm min-w-0">
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">{policy.fileName}</span>
            </div>
            {policy.fileUrl && (
              <a
                href={resolvePolicyFileUrl(policy.fileUrl)}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" /> Download
                </Button>
              </a>
            )}
          </div>

          {policy.type === "board" && (
            <p className="text-xs text-muted-foreground">
              Every current board member was emailed their own personal
              acknowledgement link when this policy was published.
            </p>
          )}

          <div className="border-t pt-3">
            <div className="font-medium text-sm mb-2">
              Acknowledgements ({policy.acknowledgments.length})
            </div>
            {policy.acknowledgments.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No acknowledgements yet.
              </p>
            ) : (
              <div className="space-y-1">
                {policy.acknowledgments.map((a, i) => (
                  <div
                    key={i}
                    className="flex justify-between gap-2 text-sm border rounded px-2 py-1"
                  >
                    <span className="truncate">
                      {a.name}
                      <span className="text-muted-foreground text-xs">
                        {" "}
                        · {a.email}
                      </span>
                    </span>
                    <span className="text-emerald-600 text-xs whitespace-nowrap">
                      {a.source === "external" ? "External" : "Employee"} ·{" "}
                      {new Date(a.ackedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            variant="destructive"
            disabled={deleteMut.isPending}
            onClick={() => deleteMut.mutate()}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Delete policy
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
