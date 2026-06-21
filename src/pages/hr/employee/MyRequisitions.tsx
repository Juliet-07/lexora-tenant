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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  ClipboardList, Plus, CheckCircle2, XCircle, Clock, Laptop, Plane, DollarSign, UserPlus, GraduationCap,
} from "lucide-react";
import {
  useRequisitions, addRequisition, nextRequisitionId, type Requisition,
} from "@/lib/requisitionsStore";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const typeIcon: Record<Requisition["type"], any> = {
  Hiring: UserPlus, Equipment: Laptop, Budget: DollarSign, Travel: Plane, Training: GraduationCap,
};
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

export default function MyRequisitions() {
  const all = useRequisitions();
  const { user } = useAuth();
  const meName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "You";

  const mine = useMemo(
    () => all.filter((r) => r.requestedBy === meName || r.requestedBy === "You"),
    [all, meName],
  );

  const [selected, setSelected] = useState<Requisition | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: "Equipment" as Requisition["type"],
    title: "",
    department: "Engineering",
    amount: 0,
    currency: "USD",
    priority: "Medium" as Requisition["priority"],
    justification: "",
  });
  const { toast } = useToast();

  const submit = () => {
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    const r: Requisition = {
      id: nextRequisitionId(),
      type: form.type,
      title: form.title.trim(),
      requestedBy: meName,
      department: form.department,
      amount: form.amount || null,
      currency: form.currency,
      priority: form.priority,
      status: "Submitted",
      submittedDate: new Date().toISOString().slice(0, 10),
      justification: form.justification,
      approvalChain: [
        { role: "Manager", name: "Direct Manager", status: "Pending" },
        { role: "Finance", name: "Finance Team", status: "Pending" },
      ],
    };
    addRequisition(r);
    setOpen(false);
    setForm({ type: "Equipment", title: "", department: "Engineering", amount: 0, currency: "USD", priority: "Medium", justification: "" });
    toast({ title: "Requisition submitted", description: `${r.title} routed for approval.` });
  };

  const pending = mine.filter((r) => !["Approved","Rejected","Fulfilled"].includes(r.status)).length;
  const approved = mine.filter((r) => r.status === "Approved" || r.status === "Fulfilled").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Requisitions</h1>
          <p className="text-sm text-muted-foreground">
            Submit requests for equipment, budget, travel, training or hiring. Requests are routed to your manager and finance for approval.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-secondary">
              <Plus className="h-4 w-4 mr-2" /> New Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit a Request</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Hiring","Equipment","Budget","Travel","Training"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v: any) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Low","Medium","High","Urgent"].map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What are you requesting?" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-2">
                  <Label>Department</Label>
                  <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Engineering","Product","Design","Sales","Marketing","Operations","Finance","People"].map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Currency</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["USD","EUR","GBP","NGN","KES","ZAR"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Estimated Amount</Label>
                <Input type="number" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} placeholder="Optional" />
              </div>
              <div className="space-y-1">
                <Label>Justification</Label>
                <Textarea rows={4} value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })} placeholder="Why does this need to happen?" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit} className="bg-gradient-to-r from-primary to-secondary">Submit for Approval</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Stat label="My Total" value={mine.length} icon={ClipboardList} tone="from-primary to-secondary" />
        <Stat label="Pending" value={pending} icon={Clock} tone="from-amber-500 to-orange-500" />
        <Stat label="Approved" value={approved} icon={CheckCircle2} tone="from-emerald-500 to-teal-500" />
      </div>

      <div className="space-y-2">
        {mine.length === 0 && (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
            You haven't submitted any requests yet.
          </CardContent></Card>
        )}
        {mine.map((r) => {
          const Icon = typeIcon[r.type];
          return (
            <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(r)}>
              <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.id} · {r.type} · submitted {r.submittedDate}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.amount && <span className="text-sm font-bold">{r.currency} {r.amount.toLocaleString()}</span>}
                  <Badge variant="outline" className={priorityTone(r.priority)}>{r.priority}</Badge>
                  <Badge variant="outline" className={statusTone(r.status)}>{r.status}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
                <SheetDescription>
                  {selected.type} · {selected.department} · submitted {selected.submittedDate}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={priorityTone(selected.priority)}>{selected.priority}</Badge>
                  <Badge variant="outline" className={statusTone(selected.status)}>{selected.status}</Badge>
                  {selected.amount && (
                    <Badge variant="outline" className="bg-muted">
                      {selected.currency} {selected.amount.toLocaleString()}
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Justification</p>
                  <p className="text-sm whitespace-pre-wrap">{selected.justification || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Approval Chain</p>
                  <div className="space-y-2">
                    {selected.approvalChain.map((a, i) => (
                      <div key={i} className="flex items-center justify-between border rounded-lg p-3">
                        <div>
                          <p className="text-sm font-medium">{a.role}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.name}{a.date ? ` · ${a.date}` : ""}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            a.status === "Approved" ? "bg-success/10 text-success border-success/20"
                            : a.status === "Rejected" ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-warning/10 text-warning border-warning/20"
                          }
                        >
                          {a.status === "Approved" ? <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                           : a.status === "Rejected" ? <XCircle className="h-3 w-3 mr-1 inline" />
                           : <Clock className="h-3 w-3 mr-1 inline" />}
                          {a.status}
                        </Badge>
                      </div>
                    ))}
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

function Stat({ label, value, icon: Icon, tone }: { label: string; value: any; icon: any; tone: string }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </CardContent>
    </Card>
  );
}
