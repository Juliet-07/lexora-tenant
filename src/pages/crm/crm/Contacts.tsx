import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Plus, Search, Users, Building2, Upload, Download,
  Mail, Phone, X, Pencil, Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  contacts as seedContacts,
  organisations,
  CrmContact,
} from "@/data/crmClientMockData";

const emptyDraft = {
  name: "",
  title: "",
  orgId: organisations[0].id,
  email: "",
  phone: "",
  source: "Referral" as CrmContact["source"],
  tags: [] as string[],
  notes: "",
};

export default function Contacts() {
  const { toast } = useToast();
  const [list, setList] = useState<CrmContact[]>(seedContacts);
  const [q, setQ] = useState("");
  const [orgFilter, setOrgFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [selected, setSelected] = useState<CrmContact | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [customTag, setCustomTag] = useState("");

  const allTags = useMemo(() => Array.from(new Set(list.flatMap((c) => c.tags))), [list]);

  const filtered = useMemo(
    () =>
      list.filter(
        (c) =>
          (orgFilter === "all" || c.orgId === orgFilter) &&
          (tagFilter === "all" || c.tags.includes(tagFilter)) &&
          (c.name.toLowerCase().includes(q.toLowerCase()) ||
            c.orgName.toLowerCase().includes(q.toLowerCase()) ||
            c.email.toLowerCase().includes(q.toLowerCase())),
      ),
    [list, q, orgFilter, tagFilter],
  );

  const kpis = [
    { l: "Total contacts", v: list.length, icon: Users },
    { l: "Organisations", v: organisations.length, icon: Building2 },
    { l: "Tags in use", v: allTags.length, icon: Search },
  ];

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setCustomTag("");
    setFormOpen(true);
  };

  const openEdit = (c: CrmContact) => {
    setEditingId(c.id);
    setDraft({
      name: c.name, title: c.title, orgId: c.orgId, email: c.email,
      phone: c.phone, source: c.source, tags: c.tags, notes: c.notes ?? "",
    });
    setCustomTag("");
    setFormOpen(true);
  };

  const toggleTag = (tag: string) => {
    setDraft((d) => ({
      ...d,
      tags: d.tags.includes(tag) ? d.tags.filter((t) => t !== tag) : [...d.tags, tag],
    }));
  };

  const addCustomTag = () => {
    const tag = customTag.trim();
    if (!tag) return;
    if (!draft.tags.includes(tag)) setDraft((d) => ({ ...d, tags: [...d.tags, tag] }));
    setCustomTag("");
  };

  const saveContact = () => {
    if (!draft.name) return;
    const org = organisations.find((o) => o.id === draft.orgId)!;

    if (editingId) {
      setList((p) =>
        p.map((c) =>
          c.id === editingId
            ? { ...c, name: draft.name, title: draft.title, orgId: org.id, orgName: org.name,
                email: draft.email, phone: draft.phone, source: draft.source, tags: draft.tags, notes: draft.notes || undefined }
            : c,
        ),
      );
      setSelected((s) => (s && s.id === editingId
        ? { ...s, name: draft.name, title: draft.title, orgId: org.id, orgName: org.name,
            email: draft.email, phone: draft.phone, source: draft.source, tags: draft.tags, notes: draft.notes || undefined }
        : s));
      toast({ title: "Contact updated", description: `${draft.name} saved.` });
    } else {
      const c: CrmContact = {
        id: `CT-${String(list.length + 1).padStart(3, "0")}`,
        name: draft.name, title: draft.title, orgId: org.id, orgName: org.name,
        email: draft.email, phone: draft.phone, source: draft.source, tags: draft.tags,
        notes: draft.notes || undefined,
        lastContact: new Date().toISOString().slice(0, 10),
      };
      setList([c, ...list]);
      toast({ title: "Contact created", description: `${c.name} added to ${org.name}.` });
    }
    setFormOpen(false);
  };

  const deleteContact = (id: string) => {
    setList((p) => p.filter((c) => c.id !== id));
    setSelected(null);
    toast({ title: "Contact deleted" });
  };

  const mockAction = (label: string) => toast({ title: label, description: "Mock export generated — check downloads." });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-sm text-muted-foreground">Central contact repository for people linked to your organisations.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => mockAction("Import started")}><Upload className="mr-2 h-4 w-4" />Import</Button>
          <Button variant="outline" onClick={() => mockAction("CSV exported")}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New contact</Button>
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

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search contacts, orgs, emails…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={orgFilter} onValueChange={setOrgFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Organisation" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All organisations</SelectItem>
                {organisations.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Tag" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tags</SelectItem>
                {allTags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
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
                <TableRow key={c.id} className="cursor-pointer">
                  <TableCell onClick={() => setSelected(c)}>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.title}</p>
                  </TableCell>
                  <TableCell onClick={() => setSelected(c)} className="text-sm">{c.orgName}</TableCell>
                  <TableCell onClick={() => setSelected(c)}>
                    <p className="text-xs">{c.email}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </TableCell>
                  <TableCell onClick={() => setSelected(c)} className="text-sm">{c.source}</TableCell>
                  <TableCell onClick={() => setSelected(c)}>
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Edit contact" : "New contact"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Full name</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
            <div><Label>Title / role</Label><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
            <div>
              <Label>Organisation</Label>
              <Select value={draft.orgId} onValueChange={(v) => setDraft({ ...draft, orgId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{organisations.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></div>
            </div>
            <div>
              <Label>Source</Label>
              <Select value={draft.source} onValueChange={(v) => setDraft({ ...draft, source: v as CrmContact["source"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Referral", "Event", "Web form", "Cold outreach", "Partner"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
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
                {draft.tags.filter((t) => !allTags.includes(t)).map((t) => (
                  <Badge key={t} variant="default" className="cursor-pointer select-none" onClick={() => toggleTag(t)}>
                    {t}
                  </Badge>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  placeholder="Add custom tag…"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
                />
                <Button type="button" variant="outline" onClick={addCustomTag}>Add</Button>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={saveContact}>{editingId ? "Save changes" : "Create contact"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact detail sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <p className="text-sm text-muted-foreground">{selected.title} · {selected.orgName}</p>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <Card>
                  <CardContent className="space-y-2 p-4 text-sm">
                    <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{selected.email}</div>
                    <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{selected.phone}</div>
                    <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{selected.orgName}</div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {selected.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                      {selected.tags.length === 0 && <span className="text-xs text-muted-foreground">No tags</span>}
                    </div>
                  </CardContent>
                </Card>
                {selected.notes && (
                  <div>
                    <h4 className="mb-1 text-sm font-semibold">Notes</h4>
                    <p className="text-sm text-muted-foreground">{selected.notes}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => openEdit(selected)}>
                    <Pencil className="mr-2 h-4 w-4" />Edit
                  </Button>
                  <Button variant="outline" className="text-destructive" onClick={() => deleteContact(selected.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />Delete
                  </Button>
                  <Button variant="ghost" onClick={() => setSelected(null)}>
                    <X className="mr-2 h-4 w-4" />Close
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
