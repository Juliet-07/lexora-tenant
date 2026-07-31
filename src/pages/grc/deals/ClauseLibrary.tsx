import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BookOpen, Plus, Search, Trash2, History } from "lucide-react";
import { toast } from "sonner";
import {
  fetchClauses,
  createClause,
  updateClause,
  toggleClauseApproved,
  newClauseVersion,
  deleteClause,
  CLAUSE_CATEGORIES,
  type Clause,
  type ClauseCategory,
} from "@/lib/grc/deals-api";

export default function ClauseLibrary() {
  const queryClient = useQueryClient();
  const { data: clauses = [], isLoading } = useQuery({
    queryKey: ["deals-clauses"],
    queryFn: fetchClauses,
  });
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Clause | null>(null);
  const [f, setF] = useState({
    title: "",
    category: "Confidentiality" as ClauseCategory,
    jurisdiction: "Rwanda",
    body: "",
  });

  const categories = useMemo(
    () => Array.from(new Set(clauses.map((c) => c.category))),
    [clauses],
  );
  const rows = clauses.filter(
    (c) =>
      (cat === "All" || c.category === cat) &&
      (!q || `${c.title} ${c.body}`.toLowerCase().includes(q.toLowerCase())),
  );

  const createMut = useMutation({
    mutationFn: () => createClause(f),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals-clauses"] });
      setOpen(false);
      setF({
        title: "",
        category: "Confidentiality",
        jurisdiction: "Rwanda",
        body: "",
      });
      toast.success("Clause added");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to add clause"),
  });
  const updateMut = useMutation({
    mutationFn: () => updateClause(editing!._id, f),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals-clauses"] });
      setEditing(null);
      toast.success("Clause updated");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to update clause"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteClause(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["deals-clauses"] }),
  });
  const toggleMut = useMutation({
    mutationFn: (id: string) => toggleClauseApproved(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["deals-clauses"] }),
  });
  const versionMut = useMutation({
    mutationFn: (id: string) => newClauseVersion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals-clauses"] });
      toast.success("New version started — re-approval required");
    },
  });

  const submitCreate = () => {
    if (!f.title || !f.body) return toast.error("Title and body required");
    createMut.mutate();
  };

  const openEdit = (c: Clause) => {
    setEditing(c);
    setF({
      title: c.title,
      category: c.category,
      jurisdiction: c.jurisdiction,
      body: c.body,
    });
  };

  if (isLoading)
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading clause library…
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Clause Library
          </h1>
          <p className="text-sm text-muted-foreground">
            Approved and draft clauses reusable across Term Sheets and Contract
            Builder.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              New clause
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add clause</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Title</Label>
                <Input
                  value={f.title}
                  onChange={(e) => setF({ ...f, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select
                    value={f.category}
                    onValueChange={(v) =>
                      setF({ ...f, category: v as ClauseCategory })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CLAUSE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Jurisdiction</Label>
                  <Input
                    value={f.jurisdiction}
                    onChange={(e) =>
                      setF({ ...f, jurisdiction: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Body (use [VARIABLES])</Label>
                <Textarea
                  rows={5}
                  value={f.body}
                  onChange={(e) => setF({ ...f, body: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submitCreate} disabled={createMut.isPending}>
                {createMut.isPending ? "Adding…" : "Add clause"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search clauses…"
            className="pl-8"
          />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((c) => (
          <Card
            key={c._id}
            className="cursor-pointer"
            onClick={() => openEdit(c)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{c.title}</CardTitle>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {c.category} · {c.jurisdiction} · v{c.version}
                  </div>
                </div>
                <div
                  className="flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Badge
                    variant="outline"
                    className={
                      c.approved
                        ? "text-emerald-700 border-emerald-500/30 cursor-pointer"
                        : "cursor-pointer"
                    }
                    onClick={() => toggleMut.mutate(c._id)}
                  >
                    {c.approved ? "Approved" : "Draft"}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Start new version"
                    onClick={() => versionMut.mutate(c._id)}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMut.mutate(c._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">
              {c.body}
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && (
          <div className="text-sm text-muted-foreground py-6 text-center col-span-full">
            No clauses.
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit clause</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Title</Label>
              <Input
                value={f.title}
                onChange={(e) => setF({ ...f, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select
                  value={f.category}
                  onValueChange={(v) =>
                    setF({ ...f, category: v as ClauseCategory })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLAUSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Jurisdiction</Label>
                <Input
                  value={f.jurisdiction}
                  onChange={(e) => setF({ ...f, jurisdiction: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Body</Label>
              <Textarea
                rows={5}
                value={f.body}
                onChange={(e) => setF({ ...f, body: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => updateMut.mutate()}
              disabled={updateMut.isPending}
            >
              {updateMut.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
