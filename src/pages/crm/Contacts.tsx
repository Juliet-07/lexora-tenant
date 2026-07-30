import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Plus, Search, Users, Building2, AlertTriangle, Upload, Download,
  Mail, Phone, Tag, Merge, X, Contact as ContactIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  contacts as seedContacts,
  organisations,
  contactTimeline,
  CrmContact,
  CrmOrganisation,
} from "@/data/crmClientMockData";

const consentClass: Record<string, string> = {
  Granted: "bg-success/15 text-success border-success/30",
  Pending: "bg-warning/15 text-warning border-warning/30",
  Withdrawn: "bg-destructive/15 text-destructive border-destructive/30",
};

const riskClass: Record<string, string> = {
  Low: "bg-success/15 text-success border-success/30",
  Medium: "bg-warning/15 text-warning border-warning/30",
  High: "bg-destructive/15 text-destructive border-destructive/30",
};

const kycClass: Record<string, string> = {
  Approved: "bg-success/15 text-success border-success/30",
  "In review": "bg-warning/15 text-warning border-warning/30",
  "Not started": "bg-muted text-muted-foreground",
  Expired: "bg-destructive/15 text-destructive border-destructive/30",
};

const money = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const initials = (n: string) => n.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

export default function Contacts() {
  const { toast } = useToast();
  const [list, setList] = useState<CrmContact[]>(seedContacts);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [orgFilter, setOrgFilter] = useState("all");
  const [consentFilter, setConsentFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selected, setSelected] = useState<CrmContact | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openNew, setOpenNew] = useState(false);
  const [bulkTagOpen, setBulkTagOpen] = useState(false);
  const [bulkTag, setBulkTag] = useState("");
  const [draft, setDraft] = useState({ name: "", title: "", orgId: organisations[0].id, email: "", phone: "", source: "Referral" as CrmContact["source"] });

  const allTags = useMemo(() => Array.from(new Set(list.flatMap((c) => c.tags))), [list]);

  const duplicates = list.filter((c) => c.duplicateOf && !dismissed.includes(c.id));

  const filtered = useMemo(
    () =>
      list.filter(
        (c) =>
          (orgFilter === "all" || c.orgId === orgFilter) &&
          (consentFilter === "all" || c.consent === consentFilter) &&
          (tagFilter === "all" || c.tags.includes(tagFilter)) &&
          (sourceFilter === "all" || c.source === sourceFilter) &&
          (c.name.toLowerCase().includes(q.toLowerCase()) ||
            c.orgName.toLowerCase().includes(q.toLowerCase()) ||
            c.email.toLowerCase().includes(q.toLowerCase())),
      ),
    [list, q, orgFilter, consentFilter, tagFilter, sourceFilter],
  );

  const merge = (dupId: string, ofId: string) => {
    setList((p) => p.filter((c) => c.id !== dupId));
    toast({ title: "Contacts merged", description: `${dupId} merged into ${ofId}. Timeline and tags consolidated.` });
  };

  const createContact = () => {
    if (!draft.name) return;
    const org = organisations.find((o) => o.id === draft.orgId)!;
    const c: CrmContact = {
      id: `CT-${String(list.length + 1).padStart(3, "0")}`,
      name: draft.name, title: draft.title, orgId: org.id, orgName: org.name,
      email: draft.email, phone: draft.phone, roleTags: [], consent: "Pending",
      source: draft.source, tags: [], lastContact: new Date().toISOString().slice(0, 10), owner: "Sarah Chen",
    };
    setList([c, ...list]);
    setOpenNew(false);
    toast({ title: "Contact created", description: `${c.name} added to ${org.name}.` });
  };

  const applyBulkTag = () => {
    if (!bulkTag) return;
    setList((p) => p.map((c) => (selectedIds.includes(c.id) ? { ...c, tags: Array.from(new Set([...c.tags, bulkTag])) } : c)));
    toast({ title: "Tag applied", description: `"${bulkTag}" added to ${selectedIds.length} contact(s).` });
    setBulkTagOpen(false);
    setBulkTag("");
    setSelectedIds([]);
  };

  const mockAction = (label: string) => toast({ title: label, description: "Mock export generated — check downloads." });

  const kpis = [
    { l: "Total contacts", v: list.length, icon: Users },
    { l: "Organisations", v: organisations.length, icon: Building2 },
    { l: "Consent granted", v: list.filter((c) => c.consent === "Granted").length, icon: ContactIcon },
    { l: "Possible duplicates", v: duplicates.length, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Contacts &amp; Organisations</h1>
          <p className="text-sm text-muted-foreground">Central contact register with 360° client view and duplicate detection.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => mockAction("Import started")}><Upload className="mr-2 h-4 w-4" />Import</Button>
          <Button variant="outline" onClick={() => mockAction("CSV exported")}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
          <Button variant="outline" onClick={() => mockAction("vCard exported")}><Download className="mr-2 h-4 w-4" />Export vCard</Button>
          <Button onClick={() => setOpenNew(true)}><Plus className="mr-2 h-4 w-4" />New contact</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <AlertTriangle className="h-4 w-4" /> Possible duplicate contacts detected
            </div>
            {duplicates.map((d) => {
              const original = list.find((c) => c.id === d.duplicateOf);
              return (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded border bg-card p-2 text-sm">
                  <span>
                    <strong>{d.name}</strong> ({d.email}) looks like a duplicate of <strong>{original?.name ?? d.duplicateOf}</strong>
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => merge(d.id, d.duplicateOf!)}><Merge className="mr-1 h-3 w-3" />Merge</Button>
                    <Button size="sm" variant="ghost" onClick={() => setDismissed((p) => [...p, d.id])}><X className="mr-1 h-3 w-3" />Dismiss</Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="orgs">Organisation profiles</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="pt-4">
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
                <Select value={consentFilter} onValueChange={setConsentFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Consent" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All consent</SelectItem>
                    {["Granted", "Pending", "Withdrawn"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={tagFilter} onValueChange={setTagFilter}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Tag" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All tags</SelectItem>
                    {allTags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Source" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    {["Referral", "Event", "Web form", "Cold outreach", "Partner"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                {selectedIds.length > 0 && (
                  <Button variant="outline" onClick={() => setBulkTagOpen(true)}>
                    <Tag className="mr-2 h-4 w-4" />Bulk tag ({selectedIds.length})
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
                    <TableHead>Consent</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Tags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer">
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(c.id)}
                          onCheckedChange={(v) =>
                            setSelectedIds((p) => (v ? [...p, c.id] : p.filter((id) => id !== c.id)))
                          }
                        />
                      </TableCell>
                      <TableCell onClick={() => setSelected(c)}>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.title}</p>
                      </TableCell>
                      <TableCell onClick={() => setSelected(c)} className="text-sm">{c.orgName}</TableCell>
                      <TableCell onClick={() => setSelected(c)}>
                        <p className="text-xs">{c.email}</p>
                        <p className="text-xs text-muted-foreground">{c.phone}</p>
                      </TableCell>
                      <TableCell onClick={() => setSelected(c)}>
                        <Badge variant="outline" className={consentClass[c.consent]}>{c.consent}</Badge>
                      </TableCell>
                      <TableCell onClick={() => setSelected(c)} className="text-sm">{c.source}</TableCell>
                      <TableCell onClick={() => setSelected(c)}>
                        <div className="flex flex-wrap gap-1">
                          {c.tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orgs" className="pt-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {organisations.map((o) => (
              <Card key={o.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{o.name}</CardTitle>
                    <Badge variant="outline" className={riskClass[o.riskRating]}>{o.riskRating} risk</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{o.industry} · {o.jurisdiction} · {o.size}</p>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">KYC status</span>
                    <Badge variant="outline" className={kycClass[o.kycStatus]}>{o.kycStatus}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Linked contacts</span>
                    <span>{list.filter((c) => c.orgId === o.id).length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Mandates</span>
                    <span>{o.mandates}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Revenue YTD</span>
                    <span>{money(o.revenueYtd)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Billing (avg days)</span>
                    <span>{o.invoiceDaysAvg || "—"}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {o.serviceLines.map((s) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* New contact dialog */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New contact</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Full name</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
            <div><Label>Title</Label><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
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
          </div>
          <DialogFooter><Button onClick={createContact}>Create contact</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk tag dialog */}
      <Dialog open={bulkTagOpen} onOpenChange={setBulkTagOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Bulk tag contacts</DialogTitle></DialogHeader>
          <Input placeholder="Tag name" value={bulkTag} onChange={(e) => setBulkTag(e.target.value)} />
          <DialogFooter><Button onClick={applyBulkTag}>Apply tag</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 360 contact sheet */}
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
                      {selected.roleTags.map((r) => <Badge key={r} variant="outline">{r}</Badge>)}
                      {selected.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <Badge variant="outline" className={consentClass[selected.consent]}>Consent: {selected.consent}</Badge>
                      <span className="text-xs text-muted-foreground">Owner: {selected.owner}</span>
                    </div>
                  </CardContent>
                </Card>
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Timeline</h4>
                  <div className="space-y-3 border-l pl-4">
                    {contactTimeline.filter((t) => t.contactId === selected.id).map((t) => (
                      <div key={t.id} className="relative">
                        <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary" />
                        <p className="text-sm"><Badge variant="outline" className="mr-2 text-[10px]">{t.type}</Badge>{t.summary}</p>
                        <p className="text-xs text-muted-foreground">{t.at} · {t.by}</p>
                      </div>
                    ))}
                    {contactTimeline.filter((t) => t.contactId === selected.id).length === 0 && (
                      <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
