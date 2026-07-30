import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  Plus, Trash2, Eye, ArrowRight, CheckCircle2, XCircle, Workflow, FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  formTemplates, formFieldTypes, workflowRuns,
} from "@/data/crmPmMockData";

interface BuilderField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  page: number;
  conditionField?: string;
  conditionValue?: string;
  validation?: string;
}

const WORKFLOW_TEMPLATES = [
  { id: "WT-01", name: "Client onboarding", steps: ["Intake form", "KYC check", "Compliance review", "Partner approval", "Portal invite"] },
  { id: "WT-02", name: "Mandate opening", steps: ["Request submitted", "Conflict check", "Manager approval", "Team assigned"] },
  { id: "WT-03", name: "Invoice approval", steps: ["Draft raised", "Manager review", "Partner approval", "Sent to client"] },
  { id: "WT-04", name: "Document review", steps: ["Draft uploaded", "Peer review", "Partner sign-off", "Archived"] },
  { id: "WT-05", name: "Leave request", steps: ["Submitted", "Line manager approval", "HR record updated"] },
  { id: "WT-06", name: "Expense claim", steps: ["Submitted", "Line manager", "Finance", "Reimbursed"] },
  { id: "WT-07", name: "Service desk escalation", steps: ["Ticket raised", "Team lead review", "Partner escalation", "Resolved"] },
];

const slaClass = (sla: string) =>
  sla.toLowerCase().includes("breach")
    ? "bg-destructive/10 text-destructive"
    : sla.toLowerCase().includes("met")
    ? "bg-success/10 text-success"
    : "bg-warning/10 text-warning";

const statusClass = (s: string) =>
  s === "Approved"
    ? "bg-success/10 text-success"
    : s === "Escalated"
    ? "bg-destructive/10 text-destructive"
    : "bg-warning/10 text-warning";

export default function Forms() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<typeof formTemplates[number] | null>(null);

  // Builder state
  const [fields, setFields] = useState<BuilderField[]>([
    { id: "f1", type: "Text", label: "Full name", required: true, page: 1 },
    { id: "f2", type: "Dropdown", label: "Client type", required: true, page: 1 },
  ]);
  const [page, setPage] = useState(1);
  const [maxPage, setMaxPage] = useState(2);
  const [previewOpen, setPreviewOpen] = useState(false);

  const addField = (type: string) => {
    const id = `f${Date.now()}`;
    setFields((f) => [...f, { id, type, label: `New ${type} field`, required: false, page }]);
  };

  const updateField = (id: string, patch: Partial<BuilderField>) =>
    setFields((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const removeField = (id: string) => setFields((fs) => fs.filter((f) => f.id !== id));

  const pageFields = fields.filter((f) => f.page === page);

  // Workflow builder state
  const [trigger, setTrigger] = useState("on form submission");
  const [conditions, setConditions] = useState<string[]>(["Field 'amount' > 10000"]);
  const [actions, setActions] = useState<{ type: string; target: string }[]>([
    { type: "In-app notification", target: "Manager" },
  ]);
  const [savedRules, setSavedRules] = useState<{ id: string; trigger: string; conditions: string[]; actions: { type: string; target: string }[] }[]>([]);

  const addCondition = () => setConditions((c) => [...c, "New condition"]);
  const addAction = () => setActions((a) => [...a, { type: "In-app notification", target: "Manager" }]);

  const saveRule = () => {
    setSavedRules((r) => [...r, { id: `RULE-${r.length + 1}`, trigger, conditions, actions }]);
    toast({ title: "Workflow rule saved", description: `Trigger: ${trigger}` });
  };

  const [runs, setRuns] = useState(workflowRuns);
  const decide = (id: string, decision: "Approved" | "Rejected") => {
    setRuns((rs) => rs.map((r) => (r.id === id ? { ...r, status: decision, sla: "Met" } : r)));
    toast({ title: `Run ${decision.toLowerCase()}`, description: id });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Forms &amp; Workflows</h1>
        <p className="text-sm text-muted-foreground">
          Build custom forms, automate approvals, and monitor workflow runs.
        </p>
      </div>

      <Tabs defaultValue="templates">
        <TabsList className="flex-wrap">
          <TabsTrigger value="templates">Form templates</TabsTrigger>
          <TabsTrigger value="builder">Form builder</TabsTrigger>
          <TabsTrigger value="automation">Workflow automation</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="wftemplates">Workflow templates</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="pt-4">
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Fields</TableHead>
                    <TableHead>Submissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Approval steps</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formTemplates.map((f) => (
                    <TableRow key={f.id} className="cursor-pointer" onClick={() => setSelectedTemplate(f)}>
                      <TableCell className="font-medium">{f.name}</TableCell>
                      <TableCell>{f.fields}</TableCell>
                      <TableCell>{f.submissions}</TableCell>
                      <TableCell>
                        <Badge variant={f.status === "Published" ? "default" : "outline"}>{f.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {f.steps.map((s) => (
                            <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="builder" className="pt-4">
          <div className="grid gap-4 lg:grid-cols-4">
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Field palette</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2">
                {formFieldTypes.map((t) => (
                  <Button key={t} variant="outline" size="sm" className="justify-start" onClick={() => addField(t)}>
                    <Plus className="mr-2 h-3.5 w-3.5" /> {t}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm">Canvas</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={String(page)} onValueChange={(v) => setPage(Number(v))}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: maxPage }, (_, i) => i + 1).map((p) => (
                        <SelectItem key={p} value={String(p)}>Page {p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => setMaxPage((m) => m + 1)}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Page
                  </Button>
                  <Button size="sm" onClick={() => setPreviewOpen(true)}>
                    <Eye className="mr-2 h-4 w-4" /> Preview
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {pageFields.length === 0 && (
                  <p className="text-sm text-muted-foreground">No fields on this page yet — add from the palette.</p>
                )}
                {pageFields.map((f) => (
                  <div key={f.id} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{f.type}</Badge>
                      <Button size="icon" variant="ghost" onClick={() => removeField(f.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs">Label</Label>
                        <Input value={f.label} onChange={(e) => updateField(f.id, { label: e.target.value })} />
                      </div>
                      <div className="flex items-center gap-2 pt-5">
                        <Switch checked={f.required} onCheckedChange={(v) => updateField(f.id, { required: v })} />
                        <Label className="text-xs">Required</Label>
                      </div>
                      <div>
                        <Label className="text-xs">Conditional — show if field</Label>
                        <Input placeholder="e.g. Client type" value={f.conditionField ?? ""} onChange={(e) => updateField(f.id, { conditionField: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">= value</Label>
                        <Input placeholder="e.g. Corporate" value={f.conditionValue ?? ""} onChange={(e) => updateField(f.id, { conditionValue: e.target.value })} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Validation rule</Label>
                        <Input placeholder="e.g. must be a valid email" value={f.validation ?? ""} onChange={(e) => updateField(f.id, { validation: e.target.value })} />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="automation" className="pt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Rule builder</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs">Trigger</Label>
                  <Select value={trigger} onValueChange={setTrigger}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["on form submission", "on status change", "on date", "on approval"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Conditions</Label>
                    <Button size="sm" variant="outline" onClick={addCondition}><Plus className="mr-1 h-3.5 w-3.5" /> Add</Button>
                  </div>
                  {conditions.map((c, i) => (
                    <Input key={i} value={c} onChange={(e) => setConditions((cs) => cs.map((x, j) => (j === i ? e.target.value : x)))} />
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Actions</Label>
                    <Button size="sm" variant="outline" onClick={addAction}><Plus className="mr-1 h-3.5 w-3.5" /> Add</Button>
                  </div>
                  {actions.map((a, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2">
                      <Select value={a.type} onValueChange={(v) => setActions((as) => as.map((x, j) => (j === i ? { ...x, type: v } : x)))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["In-app notification", "Email notification", "SMS notification", "WhatsApp notification", "Assign", "Escalate"].map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input placeholder="target (e.g. Manager)" value={a.target} onChange={(e) => setActions((as) => as.map((x, j) => (j === i ? { ...x, target: e.target.value } : x)))} />
                    </div>
                  ))}
                </div>
                <Button onClick={saveRule}><Workflow className="mr-2 h-4 w-4" /> Save rule</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Saved rules</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {savedRules.length === 0 && <p className="text-sm text-muted-foreground">No rules saved yet.</p>}
                {savedRules.map((r) => (
                  <div key={r.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium">{r.id} — {r.trigger}</p>
                    <p className="text-xs text-muted-foreground">{r.conditions.join(" · ")}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {r.actions.map((a, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{a.type} → {a.target}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="runs" className="pt-4">
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Run</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Step</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.id}</TableCell>
                      <TableCell>{r.template}</TableCell>
                      <TableCell className="text-sm">{r.subject}</TableCell>
                      <TableCell className="text-sm">{r.step}</TableCell>
                      <TableCell><Badge className={statusClass(r.status)}>{r.status}</Badge></TableCell>
                      <TableCell><Badge className={slaClass(r.sla)}>{r.sla}</Badge></TableCell>
                      <TableCell className="text-right">
                        {r.status === "In progress" && (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => decide(r.id, "Approved")}>
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-success" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => decide(r.id, "Rejected")}>
                              <XCircle className="mr-1 h-3.5 w-3.5 text-destructive" /> Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wftemplates" className="pt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WORKFLOW_TEMPLATES.map((t) => (
              <Card key={t.id}>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />{t.name}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    {t.steps.map((s, i) => (
                      <span key={s} className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">{s}</Badge>
                        {i < t.steps.length - 1 && <ArrowRight className="h-3 w-3" />}
                      </span>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => toast({ title: "Template applied", description: `${t.name} workflow created.` })}
                  >
                    Use template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Approval chain sheet */}
      <Sheet open={!!selectedTemplate} onOpenChange={(o) => !o && setSelectedTemplate(null)}>
        <SheetContent className="overflow-y-auto">
          {selectedTemplate && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedTemplate.name}</SheetTitle>
                <p className="text-sm text-muted-foreground">{selectedTemplate.fields} fields · {selectedTemplate.submissions} submissions</p>
              </SheetHeader>
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Approval chain</p>
                {selectedTemplate.steps.map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <Badge variant="outline">{i + 1}. {s}</Badge>
                    {i < selectedTemplate.steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                  </div>
                ))}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Form preview — Page {page}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {pageFields.map((f) => (
              <div key={f.id}>
                <Label className="text-xs">{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
                {f.type === "Checkbox" ? (
                  <div className="flex items-center gap-2 pt-1"><Switch /> <span className="text-sm text-muted-foreground">Yes</span></div>
                ) : f.type === "Dropdown" ? (
                  <Select><SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger><SelectContent><SelectItem value="a">Option A</SelectItem><SelectItem value="b">Option B</SelectItem></SelectContent></Select>
                ) : f.type === "Date" ? (
                  <Input type="date" />
                ) : f.type === "Number" || f.type === "Calculated" ? (
                  <Input type="number" />
                ) : f.type === "File upload" ? (
                  <Input type="file" />
                ) : f.type === "Signature" ? (
                  <div className="h-16 rounded border border-dashed flex items-center justify-center text-xs text-muted-foreground">Sign here</div>
                ) : (
                  <Input placeholder={f.label} />
                )}
                {f.conditionField && (
                  <p className="mt-1 text-xs text-muted-foreground">Shown if {f.conditionField} = {f.conditionValue || "…"}</p>
                )}
              </div>
            ))}
          </div>
          <DialogFooter><Button onClick={() => setPreviewOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
