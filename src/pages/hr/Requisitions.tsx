import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ClipboardList, Plus, CheckCircle2, XCircle, Clock, Laptop, Plane, DollarSign, UserPlus, GraduationCap } from "lucide-react";
import { requisitions as initial, type Requisition } from "@/data/hrMockData";
import { useToast } from "@/hooks/use-toast";

const typeIcon: Record<Requisition["type"], any> = { Hiring: UserPlus, Equipment: Laptop, Budget: DollarSign, Travel: Plane, Training: GraduationCap };
const priorityTone = (p: Requisition["priority"]) =>
  p === "Urgent" ? "bg-destructive/10 text-destructive border-destructive/20"
  : p === "High" ? "bg-warning/10 text-warning border-warning/20"
  : p === "Medium" ? "bg-info/10 text-info border-info/20"
  : "bg-muted text-muted-foreground";
const statusTone = (s: Requisition["status"]) =>
  s === "Approved" || s === "Fulfilled" ? "bg-success/10 text-success border-success/20"
  : s === "Rejected" ? "bg-destructive/10 text-destructive border-destructive/20"
  : s === "Draft" ? "bg-muted text-muted-foreground"
  : "bg-warning/10 text-warning border-warning/20";

export default function HRRequisitions() {
  const [items, setItems] = useState<Requisition[]>(initial);
  const [selected, setSelected] = useState<Requisition | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "Equipment" as Requisition["type"], title: "", department: "Engineering", amount: 0, priority: "Medium" as Requisition["priority"], justification: "" });
  const { toast } = useToast();

  const create = () => {
    if (!form.title) return;
    const r: Requisition = {
      id: `REQ-${String(items.length + 1).padStart(3, "0")}`,
      type: form.type, title: form.title, requestedBy: "You", department: form.department,
      amount: form.amount || null, currency: "USD", priority: form.priority,
      status: "Submitted", submittedDate: new Date().toISOString().slice(0, 10),
      justification: form.justification,
      approvalChain: [
        { role: "Manager", name: "Direct Manager", status: "Pending" },
        { role: "Finance", name: "Noah Petrov", status: "Pending" },
      ],
    };
    setItems([r, ...items]); setOpen(false);
    setForm({ type: "Equipment", title: "", department: "Engineering", amount: 0, priority: "Medium", justification: "" });
    toast({ title: "Requisition submitted", description: `${r.title} routed for approval.` });
  };

  const approve = (r: Requisition) => {
    setItems(items.map(x => x.id === r.id ? { ...x, status: "Approved", approvalChain: x.approvalChain.map(a => ({ ...a, status: "Approved", date: new Date().toISOString().slice(0, 10) })) } : x));
    setSelected(null);
    toast({ title: "Approved", description: `${r.title} approved.` });
  };
  const reject = (r: Requisition) => {
    setItems(items.map(x => x.id === r.id ? { ...x, status: "Rejected" } : x));
    setSelected(null);
    toast({ title: "Rejected", description: `${r.title} rejected.` });
  };

  const totalPending = items.filter(r => !["Approved","Rejected","Fulfilled"].includes(r.status)).reduce((s, r) => s + (r.amount ?? 0), 0);
  const approved = items.filter(r => r.status === "Approved" || r.status === "Fulfilled").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Requisitions</h1>
          <p className="text-sm text-muted-foreground">Hiring, equipment, budget, travel and training requests.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-to-r from-primary to-secondary"><Plus className="h-4 w-4 mr-2" /> New Requisition</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit Requisition</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Type</Label>
                  <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Hiring","Equipment","Budget","Travel","Training"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v: any) => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Low","Medium","High","Urgent"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1"><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="What are you requesting?" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Department</Label>
                  <Select value={form.department} onValueChange={v => setForm({ ...form, department: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Engineering","Product","Design","Sales","Marketing","Operations","Finance","People"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Amount (USD)</Label><Input type="number" value={form.amount || ""} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} /></div>
              </div>
              <div className="space-y-1"><Label>Justification</Label><Textarea rows={4} value={form.justification} onChange={e => setForm({ ...form, justification: e.target.value })} placeholder="Why does this need to happen?" /></div>
            </div>
            <DialogFooter><Button onClick={create} className="bg-gradient-to-r from-primary to-secondary">Submit for Approval</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total" value={items.length} icon={ClipboardList} tone="from-primary to-secondary" />
        <Stat label="Pending Approval" value={items.filter(r => !["Approved","Rejected","Fulfilled"].includes(r.status)).length} icon={Clock} tone="from-amber-500 to-orange-500" />
        <Stat label="Approved" value={approved} icon={CheckCircle2} tone="from-emerald-500 to-teal-500" />
        <Stat label="Pending Spend" value={`$${totalPending.toLocaleString()}`} icon={DollarSign} tone="from-violet-500 to-purple-600" />
      </div>

      <Tabs defaultValue="all" className="space-y-2">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="my">My Approvals</TabsTrigger>
          <TabsTrigger value="mine">Submitted by Me</TabsTrigger>
        </TabsList>

        {["all","my","mine"].map(t => (
          <TabsContent key={t} value={t} className="space-y-2">
            {items.filter(r => t === "all" ? true : t === "my" ? r.approvalChain.some(a => a.status === "Pending") : r.requestedBy === "You").map(r => {
              const Icon = typeIcon[r.type];
              return (
                <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(r)}>
                  <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Icon className="h-5 w-5 text-primary" /></div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{r.type} · {r.department} · by {r.requestedBy}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.amount && <span className="text-sm font-bold">${r.amount.toLocaleString()}</span>}
                      <Badge variant="outline" className={priorityTone(r.priority)}>{r.priority}</Badge>
                      <Badge variant="outline" className={statusTone(r.status)}>{r.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (<>
            <SheetHeader>
              <SheetTitle>{selected.title}</SheetTitle>
              <SheetDescription>{selected.type} · {selected.department} · submitted {selected.submittedDate}</SheetDescription>
            </SheetHeader>
            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={priorityTone(selected.priority)}>{selected.priority}</Badge>
                <Badge variant="outline" className={statusTone(selected.status)}>{selected.status}</Badge>
                {selected.amount && <Badge variant="outline" className="bg-muted">${selected.amount.toLocaleString()} {selected.currency}</Badge>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Justification</p>
                <p className="text-sm">{selected.justification}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Approval Chain</p>
                <div className="space-y-2">
                  {selected.approvalChain.map((a, i) => (
                    <div key={i} className="flex items-center justify-between border rounded-lg p-3">
                      <div><p className="text-sm font-medium">{a.role}</p><p className="text-xs text-muted-foreground">{a.name}{a.date ? ` · ${a.date}` : ""}</p></div>
                      <Badge variant="outline" className={a.status === "Approved" ? "bg-success/10 text-success border-success/20" : a.status === "Rejected" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-warning/10 text-warning border-warning/20"}>
                        {a.status === "Approved" ? <CheckCircle2 className="h-3 w-3 mr-1 inline" /> : a.status === "Rejected" ? <XCircle className="h-3 w-3 mr-1 inline" /> : <Clock className="h-3 w-3 mr-1 inline" />}
                        {a.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
              {selected.status !== "Approved" && selected.status !== "Rejected" && (
                <div className="flex gap-2">
                  <Button className="flex-1 bg-gradient-to-r from-primary to-secondary" onClick={() => approve(selected)}><CheckCircle2 className="h-4 w-4 mr-2" /> Approve</Button>
                  <Button variant="destructive" onClick={() => reject(selected)}><XCircle className="h-4 w-4 mr-2" /> Reject</Button>
                </div>
              )}
            </div>
          </>)}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: any; icon: any; tone: string }) {
  return (
    <Card><CardContent className="p-5 flex items-center justify-between">
      <div><p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p><p className="text-2xl font-bold mt-1">{value}</p></div>
      <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center`}><Icon className="h-5 w-5 text-white" /></div>
    </CardContent></Card>
  );
}
