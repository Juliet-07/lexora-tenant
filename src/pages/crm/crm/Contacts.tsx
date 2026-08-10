import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  Plus,
  Search,
  Users,
  Building2,
  AlertTriangle,
  Upload,
  Download,
  Mail,
  Phone,
  Tag,
  Merge,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchContacts,
  createContact,
  updateContact,
  deleteContact,
  mergeContact,
  dismissDuplicate,
  bulkTagContacts,
  logContactActivity,
  type Contact,
  type ContactSource,
  type ActivityType,
} from "@/lib/crm/crm-contacts-api";

const SOURCES: ContactSource[] = [
  "Referral",
  "Event",
  "Web form",
  "Cold outreach",
  "Partner",
];
const ACTIVITY_TYPES: ActivityType[] = [
  "Email",
  "Call",
  "Meeting",
  "Document",
  "Note",
];

const emptyDraft = {
  name: "",
  title: "",
  organisation: "",
  email: "",
  phone: "",
  source: "Referral" as ContactSource,
  tags: [] as string[],
  roleTags: [] as string[],
  owner: "",
  notes: "",
};

export default function Contacts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: list = [], isLoading } = useQuery({
    queryKey: ["crmContacts"],
    queryFn: fetchContacts,
  });

  const [q, setQ] = useState("");
  const [orgFilter, setOrgFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selected, setSelected] = useState<Contact | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [customTag, setCustomTag] = useState("");
  const [customRoleTag, setCustomRoleTag] = useState("");

  const [bulkTagOpen, setBulkTagOpen] = useState(false);
  const [bulkTagValue, setBulkTagValue] = useState("");
  const [activityForm, setActivityForm] = useState({
    type: "Note" as ActivityType,
    summary: "",
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["crmContacts"] });
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const allTags = useMemo(
    () => Array.from(new Set(list.flatMap((c) => c.tags))),
    [list],
  );
  const organisations = useMemo(
    () =>
      Array.from(
        new Set(list.map((c) => c.organisation).filter(Boolean)),
      ).sort(),
    [list],
  );
  const duplicates = list.filter((c) => c.duplicateOf && !c.duplicateDismissed);

  const filtered = useMemo(
    () =>
      list.filter(
        (c) =>
          (orgFilter === "all" || c.organisation === orgFilter) &&
          (tagFilter === "all" || c.tags.includes(tagFilter)) &&
          (sourceFilter === "all" || c.source === sourceFilter) &&
          (!q ||
            `${c.name} ${c.organisation} ${c.email}`
              .toLowerCase()
              .includes(q.toLowerCase())),
      ),
    [list, q, orgFilter, tagFilter, sourceFilter],
  );

  const kpis = [
    { l: "Total contacts", v: list.length, icon: Users },
    { l: "Organisations", v: organisations.length, icon: Building2 },
    { l: "Possible duplicates", v: duplicates.length, icon: AlertTriangle },
  ];

  // ── Mutations ────────────────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: () =>
      editingId ? updateContact(editingId, draft) : createContact(draft),
    onSuccess: (saved) => {
      invalidate();
      setSelected((s) => (s && s._id === editingId ? saved : s));
      toast({
        title: editingId ? "Contact updated" : "Contact created",
        description: `${saved.name} saved.`,
      });
      setFormOpen(false);
    },
    onError: onErr("Failed to save contact"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: () => {
      invalidate();
      setSelected(null);
      toast({ title: "Contact deleted" });
    },
    onError: onErr("Failed to delete contact"),
  });

  const mergeMut = useMutation({
    mutationFn: (id: string) => mergeContact(id),
    onSuccess: (original) => {
      invalidate();
      toast({
        title: "Contacts merged",
        description: `Consolidated into ${original.name}.`,
      });
    },
    onError: onErr("Failed to merge"),
  });

  const dismissMut = useMutation({
    mutationFn: (id: string) => dismissDuplicate(id),
    onSuccess: () => invalidate(),
  });

  const bulkTagMut = useMutation({
    mutationFn: () => bulkTagContacts(selectedIds, bulkTagValue),
    onSuccess: () => {
      invalidate();
      toast({
        title: "Tag applied",
        description: `"${bulkTagValue}" added to ${selectedIds.length} contact(s).`,
      });
      setBulkTagOpen(false);
      setBulkTagValue("");
      setSelectedIds([]);
    },
  });

  const activityMut = useMutation({
    mutationFn: (id: string) => logContactActivity(id, activityForm),
    onSuccess: (saved) => {
      invalidate();
      setSelected(saved);
      setActivityForm({ type: "Note", summary: "" });
      toast({ title: "Activity logged" });
    },
  });

  // ── Form helpers ─────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setCustomTag("");
    setCustomRoleTag("");
    setFormOpen(true);
  };

  const openEdit = (c: Contact) => {
    setEditingId(c._id);
    setDraft({
      name: c.name,
      title: c.title,
      organisation: c.organisation,
      email: c.email,
      phone: c.phone,
      source: c.source,
      tags: c.tags,
      roleTags: c.roleTags,
      owner: c.owner,
      notes: c.notes,
    });
    setCustomTag("");
    setCustomRoleTag("");
    setFormOpen(true);
  };

  const toggleTag = (tag: string) =>
    setDraft((d) => ({
      ...d,
      tags: d.tags.includes(tag)
        ? d.tags.filter((t) => t !== tag)
        : [...d.tags, tag],
    }));

  const addCustomTag = () => {
    const tag = customTag.trim();
    if (!tag) return;
    if (!draft.tags.includes(tag))
      setDraft((d) => ({ ...d, tags: [...d.tags, tag] }));
    setCustomTag("");
  };

  const addCustomRoleTag = () => {
    const tag = customRoleTag.trim();
    if (!tag) return;
    if (!draft.roleTags.includes(tag))
      setDraft((d) => ({ ...d, roleTags: [...d.roleTags, tag] }));
    setCustomRoleTag("");
  };

  const saveContact = () => {
    if (!draft.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    saveMut.mutate();
  };

  const mockAction = (label: string) =>
    toast({
      title: label,
      description: "Mock export generated — check downloads.",
    });

  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Loading contacts…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            Central contact repository for people linked to your organisations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => mockAction("Import started")}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" onClick={() => mockAction("CSV exported")}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New contact
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.l}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{k.l}</p>
                <p className="mt-1 text-xl font-bold">{k.v}</p>
              </div>
              <k.icon className="h-6 w-6 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      {duplicates.length > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-warning">
              <AlertTriangle className="h-4 w-4" /> Possible duplicate contacts
              detected
            </div>
            {duplicates.map((d) => {
              const original = list.find((c) => c._id === d.duplicateOf);
              return (
                <div
                  key={d._id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border bg-card p-2 text-sm"
                >
                  <span>
                    <strong>{d.name}</strong> ({d.email || d.phone}) looks like
                    a duplicate of{" "}
                    <strong>{original?.name ?? "an existing contact"}</strong>
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={mergeMut.isPending}
                      onClick={() => mergeMut.mutate(d._id)}
                    >
                      <Merge className="mr-1 h-3 w-3" />
                      Merge
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={dismissMut.isPending}
                      onClick={() => dismissMut.mutate(d._id)}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Dismiss
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search contacts, orgs, emails…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={orgFilter} onValueChange={setOrgFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Organisation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All organisations</SelectItem>
                {organisations.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tags</SelectItem>
                {allTags.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedIds.length > 0 && (
              <Button variant="outline" onClick={() => setBulkTagOpen(true)}>
                <Tag className="mr-2 h-4 w-4" />
                Bulk tag ({selectedIds.length})
              </Button>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c._id} className="cursor-pointer">
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(c._id)}
                      onCheckedChange={(v) =>
                        setSelectedIds((p) =>
                          v ? [...p, c._id] : p.filter((id) => id !== c._id),
                        )
                      }
                    />
                  </TableCell>
                  <TableCell onClick={() => setSelected(c)}>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.title}</p>
                  </TableCell>
                  <TableCell onClick={() => setSelected(c)} className="text-sm">
                    {c.organisation || "—"}
                  </TableCell>
                  <TableCell onClick={() => setSelected(c)}>
                    <p className="text-xs">{c.email}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </TableCell>
                  <TableCell onClick={() => setSelected(c)} className="text-sm">
                    {c.source}
                  </TableCell>
                  <TableCell onClick={() => setSelected(c)}>
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(c)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No contacts match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / edit contact dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit contact" : "New contact"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Full name</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            {/* <div>
              <Label>Title / role</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div> */}
            <div>
              <Label>Role at organisation</Label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {draft.roleTags.map((t) => (
                  <Badge
                    key={t}
                    variant="outline"
                    className="cursor-pointer select-none"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        roleTags: d.roleTags.filter((x) => x !== t),
                      }))
                    }
                  >
                    {t} <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  placeholder="e.g. Director, UBO, Finance contact…"
                  value={customRoleTag}
                  onChange={(e) => setCustomRoleTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomRoleTag();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCustomRoleTag}
                >
                  Add
                </Button>
              </div>
            </div>
            <div>
              <Label>Organisation</Label>
              <Input
                value={draft.organisation}
                onChange={(e) =>
                  setDraft({ ...draft, organisation: e.target.value })
                }
                placeholder="Type the organisation name — not linked to any client record"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email</Label>
                <Input
                  value={draft.email}
                  onChange={(e) =>
                    setDraft({ ...draft, email: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={draft.phone}
                  onChange={(e) =>
                    setDraft({ ...draft, phone: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Source</Label>
                <Select
                  value={draft.source}
                  onValueChange={(v) =>
                    setDraft({ ...draft, source: v as ContactSource })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Owner</Label>
                <Input
                  value={draft.owner}
                  onChange={(e) =>
                    setDraft({ ...draft, owner: e.target.value })
                  }
                  placeholder="Who manages this contact"
                />
              </div>
            </div>
            <div>
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {allTags.map((t) => (
                  <Badge
                    key={t}
                    variant={draft.tags.includes(t) ? "default" : "outline"}
                    className="cursor-pointer select-none"
                    onClick={() => toggleTag(t)}
                  >
                    {t}
                  </Badge>
                ))}
                {draft.tags
                  .filter((t) => !allTags.includes(t))
                  .map((t) => (
                    <Badge
                      key={t}
                      variant="default"
                      className="cursor-pointer select-none"
                      onClick={() => toggleTag(t)}
                    >
                      {t}
                    </Badge>
                  ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  placeholder="Add custom tag…"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomTag();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addCustomTag}>
                  Add
                </Button>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={saveMut.isPending} onClick={saveContact}>
              {saveMut.isPending
                ? "Saving…"
                : editingId
                  ? "Save changes"
                  : "Create contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk tag dialog */}
      <Dialog open={bulkTagOpen} onOpenChange={setBulkTagOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Bulk tag contacts</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Tag name"
            value={bulkTagValue}
            onChange={(e) => setBulkTagValue(e.target.value)}
          />
          <DialogFooter>
            <Button
              disabled={bulkTagMut.isPending || !bulkTagValue.trim()}
              onClick={() => bulkTagMut.mutate()}
            >
              {bulkTagMut.isPending ? "Applying…" : "Apply tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact detail sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {selected.title} ·{" "}
                  {selected.organisation || "No organisation"}
                </p>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <Card>
                  <CardContent className="space-y-2 p-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {selected.email || "—"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {selected.phone || "—"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {selected.organisation || "—"}
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {selected.roleTags.map((r) => (
                        <Badge key={r} variant="outline">
                          {r}
                        </Badge>
                      ))}
                      {selected.tags.map((t) => (
                        <Badge key={t} variant="secondary">
                          {t}
                        </Badge>
                      ))}
                      {selected.tags.length === 0 &&
                        selected.roleTags.length === 0 && (
                          <span className="text-xs text-muted-foreground">
                            No tags
                          </span>
                        )}
                    </div>
                    {selected.owner && (
                      <div className="pt-1 text-xs text-muted-foreground">
                        Owner: {selected.owner}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {selected.notes && (
                  <div>
                    <h4 className="mb-1 text-sm font-semibold">Notes</h4>
                    <p className="text-sm text-muted-foreground">
                      {selected.notes}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="mb-2 text-sm font-semibold">Timeline</h4>
                  <div className="flex gap-2 mb-3">
                    <Select
                      value={activityForm.type}
                      onValueChange={(v) =>
                        setActivityForm((f) => ({
                          ...f,
                          type: v as ActivityType,
                        }))
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="What happened…"
                      value={activityForm.summary}
                      onChange={(e) =>
                        setActivityForm((f) => ({
                          ...f,
                          summary: e.target.value,
                        }))
                      }
                    />
                    <Button
                      size="sm"
                      disabled={
                        activityMut.isPending || !activityForm.summary.trim()
                      }
                      onClick={() => activityMut.mutate(selected._id)}
                    >
                      Log
                    </Button>
                  </div>
                  <div className="space-y-3 border-l pl-4">
                    {[...selected.activity].reverse().map((t, i) => (
                      <div key={i} className="relative">
                        <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary" />
                        <p className="text-sm">
                          <Badge variant="outline" className="mr-2 text-[10px]">
                            {t.type}
                          </Badge>
                          {t.summary}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(t.at).toLocaleString()}
                          {t.by ? ` · ${t.by}` : ""}
                        </p>
                      </div>
                    ))}
                    {selected.activity.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No activity recorded yet.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => openEdit(selected)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive"
                    disabled={deleteMut.isPending}
                    onClick={() => deleteMut.mutate(selected._id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                  <Button variant="ghost" onClick={() => setSelected(null)}>
                    <X className="mr-2 h-4 w-4" />
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
