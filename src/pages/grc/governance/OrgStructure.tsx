import { useMemo, useState } from "react";
import {
  Building2,
  Users,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Network,
  ListTree,
  UserCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePersistentState, uid, fmtDate } from "@/lib/grc/usePersistentState";
import { useToast } from "@/hooks/use-toast";

// ─────────────────────────────────────────────────────────────
// Organisation Structure — tenant defines the company hierarchy:
// divisions → departments → units/teams, with heads and headcounts.
// Dummy data, persisted in localStorage.
// ─────────────────────────────────────────────────────────────

export type OrgNodeType = "Division" | "Department" | "Unit" | "Team";

export interface OrgNode {
  id: string;
  name: string;
  type: OrgNodeType;
  parentId: string | null;
  head?: string;
  headTitle?: string;
  headcount: number;
  description?: string;
  createdAt: string;
}

const TYPE_ORDER: OrgNodeType[] = ["Division", "Department", "Unit", "Team"];

const TYPE_STYLES: Record<OrgNodeType, string> = {
  Division: "bg-primary/10 text-primary border-primary/30",
  Department: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  Unit: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  Team: "bg-slate-500/10 text-slate-600 border-slate-500/30",
};

function seedNodes(): OrgNode[] {
  const now = new Date().toISOString();
  return [
    { id: "on_1", name: "Executive Office", type: "Division", parentId: null, head: "Dr. E. Rwigema", headTitle: "Chief Executive Officer", headcount: 4, description: "Group executive leadership and corporate strategy.", createdAt: now },
    { id: "on_2", name: "Operations Division", type: "Division", parentId: null, head: "A. Habimana", headTitle: "Chief Operating Officer", headcount: 38, description: "Service delivery and operational excellence.", createdAt: now },
    { id: "on_3", name: "Corporate Services Division", type: "Division", parentId: null, head: "N. Uwase", headTitle: "Chief Financial Officer", headcount: 22, description: "Finance, HR, and administration.", createdAt: now },
    { id: "on_4", name: "Client Services", type: "Department", parentId: "on_2", head: "J. Mukamana", headTitle: "Head of Client Services", headcount: 14, description: "Client onboarding, relationship management and support.", createdAt: now },
    { id: "on_5", name: "Legal & Advisory", type: "Department", parentId: "on_2", head: "P. Kagame", headTitle: "Head of Legal", headcount: 11, description: "Legal advisory, contracts and company secretarial work.", createdAt: now },
    { id: "on_6", name: "Finance", type: "Department", parentId: "on_3", head: "S. Ndayisenga", headTitle: "Head of Finance", headcount: 9, description: "Accounting, treasury, payroll and reporting.", createdAt: now },
    { id: "on_7", name: "Human Resources", type: "Department", parentId: "on_3", head: "M. Ingabire", headTitle: "Head of HR", headcount: 6, description: "Talent, performance and employee relations.", createdAt: now },
    { id: "on_8", name: "Compliance & Risk", type: "Department", parentId: "on_1", head: "D. Umutoni", headTitle: "Chief Risk Officer", headcount: 5, description: "Enterprise risk, compliance and internal audit liaison.", createdAt: now },
    { id: "on_9", name: "Onboarding Unit", type: "Unit", parentId: "on_4", head: "K. Bizimana", headTitle: "Unit Lead", headcount: 5, description: "KYC/AML checks and client onboarding.", createdAt: now },
    { id: "on_10", name: "Accounts Unit", type: "Unit", parentId: "on_6", head: "L. Uwera", headTitle: "Unit Lead", headcount: 4, description: "Day-to-day bookkeeping and payables.", createdAt: now },
    { id: "on_11", name: "Tax Team", type: "Team", parentId: "on_6", head: "R. Nkurunziza", headTitle: "Team Lead", headcount: 3, description: "Tax filings, WHT and advisory.", createdAt: now },
  ];
}

interface NodeForm {
  name: string;
  type: OrgNodeType;
  parentId: string | null;
  head: string;
  headTitle: string;
  headcount: number;
  description: string;
}

const emptyForm: NodeForm = {
  name: "",
  type: "Department",
  parentId: null,
  head: "",
  headTitle: "",
  headcount: 0,
  description: "",
};

export default function OrgStructure() {
  const { toast } = useToast();
  const [nodes, setNodes] = usePersistentState<OrgNode[]>("grc_org_structure_v1", seedNodes);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OrgNode | null>(null);
  const [form, setForm] = useState<NodeForm>(emptyForm);
  const [deleting, setDeleting] = useState<OrgNode | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const roots = useMemo(() => nodes.filter((n) => !n.parentId), [nodes]);
  const childrenOf = (id: string) => nodes.filter((n) => n.parentId === id);

  const stats = useMemo(() => {
    const totalHeadcount = nodes.reduce((s, n) => s + (n.headcount || 0), 0);
    const staffed = nodes.filter((n) => n.head).length;
    return {
      divisions: nodes.filter((n) => n.type === "Division").length,
      departments: nodes.filter((n) => n.type === "Department").length,
      units: nodes.filter((n) => n.type === "Unit" || n.type === "Team").length,
      totalHeadcount,
      vacancies: nodes.length - staffed,
    };
  }, [nodes]);

  const openCreate = (parentId: string | null = null, type: OrgNodeType = "Department") => {
    setEditing(null);
    setForm({ ...emptyForm, parentId, type });
    setDialogOpen(true);
  };

  const openEdit = (node: OrgNode) => {
    setEditing(node);
    setForm({
      name: node.name,
      type: node.type,
      parentId: node.parentId,
      head: node.head ?? "",
      headTitle: node.headTitle ?? "",
      headcount: node.headcount,
      description: node.description ?? "",
    });
    setDialogOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) {
      toast({ title: "Name required", description: "Give the structure unit a name.", variant: "destructive" });
      return;
    }
    if (editing) {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === editing.id
            ? {
                ...n,
                name: form.name.trim(),
                type: form.type,
                parentId: form.parentId,
                head: form.head.trim() || undefined,
                headTitle: form.headTitle.trim() || undefined,
                headcount: form.headcount,
                description: form.description.trim() || undefined,
              }
            : n,
        ),
      );
      toast({ title: "Updated", description: `${form.name} has been updated.` });
    } else {
      const node: OrgNode = {
        id: uid("on"),
        name: form.name.trim(),
        type: form.type,
        parentId: form.parentId,
        head: form.head.trim() || undefined,
        headTitle: form.headTitle.trim() || undefined,
        headcount: form.headcount,
        description: form.description.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      setNodes((prev) => [...prev, node]);
      toast({ title: "Added", description: `${node.name} added to the structure.` });
    }
    setDialogOpen(false);
  };

  const collectDescendants = (id: string): string[] => {
    const kids = childrenOf(id);
    return [id, ...kids.flatMap((k) => collectDescendants(k.id))];
  };

  const confirmDelete = () => {
    if (!deleting) return;
    const ids = collectDescendants(deleting.id);
    setNodes((prev) => prev.filter((n) => !ids.includes(n.id)));
    toast({ title: "Removed", description: `${deleting.name} and its sub-units were removed.` });
    setDeleting(null);
  };

  // Valid parents: cannot parent to itself or its descendants; parent must be a higher-or-equal tier
  const validParents = (nodeId: string | null, type: OrgNodeType) => {
    const excluded = nodeId ? collectDescendants(nodeId) : [];
    const tier = TYPE_ORDER.indexOf(type);
    return nodes.filter((n) => !excluded.includes(n.id) && TYPE_ORDER.indexOf(n.type) <= tier);
  };

  const renderTree = (node: OrgNode, depth: number) => {
    const kids = childrenOf(node.id);
    const isCollapsed = collapsed[node.id];
    return (
      <div key={node.id}>
        <div
          className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/60 group"
          style={{ paddingLeft: `${depth * 24 + 8}px` }}
        >
          {kids.length > 0 ? (
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setCollapsed((c) => ({ ...c, [node.id]: !c[node.id] }))}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-sm">{node.name}</span>
          <Badge variant="outline" className={`text-[10px] ${TYPE_STYLES[node.type]}`}>
            {node.type}
          </Badge>
          {node.head && (
            <span className="text-xs text-muted-foreground hidden md:inline">
              · {node.head}{node.headTitle ? ` (${node.headTitle})` : ""}
            </span>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{node.headcount} staff</span>
          <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Add sub-unit"
              onClick={() => {
                const nextType = TYPE_ORDER[Math.min(TYPE_ORDER.indexOf(node.type) + 1, TYPE_ORDER.length - 1)];
                openCreate(node.id, nextType);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => openEdit(node)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              title="Delete"
              onClick={() => setDeleting(node)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {!isCollapsed && kids.map((k) => renderTree(k, depth + 1))}
      </div>
    );
  };

  const renderChartNode = (node: OrgNode) => {
    const kids = childrenOf(node.id);
    return (
      <div key={node.id} className="flex flex-col items-center">
        <Card className={`w-56 border ${TYPE_STYLES[node.type]} shadow-sm`}>
          <CardContent className="p-3 text-center space-y-1">
            <p className="font-semibold text-sm leading-tight">{node.name}</p>
            <Badge variant="outline" className="text-[10px]">{node.type}</Badge>
            {node.head ? (
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <UserCircle2 className="h-3.5 w-3.5" />
                <span>{node.head}</span>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">Head vacant</p>
            )}
            <p className="text-[11px] text-muted-foreground">{node.headcount} staff</p>
          </CardContent>
        </Card>
        {kids.length > 0 && (
          <>
            <div className="w-px h-4 bg-border" />
            <div className="flex gap-4 items-start relative">
              {kids.length > 1 && (
                <div className="absolute top-0 left-1/2 right-1/2 h-px bg-border" style={{ left: "10%", right: "10%" }} />
              )}
              {kids.map((k) => (
                <div key={k.id} className="flex flex-col items-center">
                  <div className="w-px h-4 bg-border" />
                  {renderChartNode(k)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" />
            Organisation Structure
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Define your company's divisions, departments, units and teams, their heads and staffing.
          </p>
        </div>
        <Button onClick={() => openCreate(null, "Division")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Division
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Divisions", value: stats.divisions },
          { label: "Departments", value: stats.departments },
          { label: "Units & Teams", value: stats.units },
          { label: "Total Headcount", value: stats.totalHeadcount },
          { label: "Head Vacancies", value: stats.vacancies },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-bold mt-1">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart" className="gap-2">
            <Network className="h-4 w-4" /> Org Chart
          </TabsTrigger>
          <TabsTrigger value="tree" className="gap-2">
            <ListTree className="h-4 w-4" /> Hierarchy List
          </TabsTrigger>
          <TabsTrigger value="directory" className="gap-2">
            <Users className="h-4 w-4" /> Directory
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chart" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company Organigram</CardTitle>
              <CardDescription>Visual layout of the reporting structure. Scroll horizontally for wide structures.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto pb-8">
              {roots.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No structure yet. Add a division to get started.
                </p>
              ) : (
                <div className="flex gap-8 justify-center min-w-max pt-2">
                  {roots.map((r) => renderChartNode(r))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tree" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hierarchy</CardTitle>
              <CardDescription>Hover a row to add sub-units, edit or remove.</CardDescription>
            </CardHeader>
            <CardContent>
              {roots.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No structure yet.</p>
              ) : (
                roots.map((r) => renderTree(r, 0))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="directory" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Structure Directory</CardTitle>
              <CardDescription>All units with their heads and parent units.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Name</th>
                      <th className="py-2 pr-4 font-medium">Type</th>
                      <th className="py-2 pr-4 font-medium">Reports Into</th>
                      <th className="py-2 pr-4 font-medium">Head</th>
                      <th className="py-2 pr-4 font-medium">Staff</th>
                      <th className="py-2 pr-4 font-medium">Created</th>
                      <th className="py-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nodes.map((n) => (
                      <tr key={n.id} className="border-b last:border-0">
                        <td className="py-2.5 pr-4 font-medium">{n.name}</td>
                        <td className="py-2.5 pr-4">
                          <Badge variant="outline" className={`text-[10px] ${TYPE_STYLES[n.type]}`}>{n.type}</Badge>
                        </td>
                        <td className="py-2.5 pr-4 text-muted-foreground">
                          {n.parentId ? nodes.find((p) => p.id === n.parentId)?.name ?? "—" : "Top level"}
                        </td>
                        <td className="py-2.5 pr-4">
                          {n.head ? (
                            <span>{n.head}{n.headTitle ? <span className="text-muted-foreground"> · {n.headTitle}</span> : null}</span>
                          ) : (
                            <span className="text-muted-foreground italic">Vacant</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4">{n.headcount}</td>
                        <td className="py-2.5 pr-4 text-muted-foreground">{fmtDate(n.createdAt)}</td>
                        <td className="py-2.5 text-right">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(n)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setDeleting(n)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "Add to structure"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update this unit's details." : "Create a new division, department, unit or team."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Finance"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v as OrgNodeType }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPE_ORDER.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Reports into</Label>
                <Select
                  value={form.parentId ?? "none"}
                  onValueChange={(v) => setForm((f) => ({ ...f, parentId: v === "none" ? null : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Top level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Top level</SelectItem>
                    {validParents(editing?.id ?? null, form.type).map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.name} ({n.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Head of unit</Label>
                <Input
                  value={form.head}
                  onChange={(e) => setForm((f) => ({ ...f, head: e.target.value }))}
                  placeholder="e.g. S. Ndayisenga"
                />
              </div>
              <div className="grid gap-2">
                <Label>Head's title</Label>
                <Input
                  value={form.headTitle}
                  onChange={(e) => setForm((f) => ({ ...f, headTitle: e.target.value }))}
                  placeholder="e.g. Head of Finance"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Headcount</Label>
              <Input
                type="number"
                min={0}
                value={form.headcount}
                onChange={(e) => setForm((f) => ({ ...f, headcount: Math.max(0, Number(e.target.value) || 0) }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What this unit is responsible for…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save changes" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the unit and all {deleting ? collectDescendants(deleting.id).length - 1 : 0} sub-units
              under it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
